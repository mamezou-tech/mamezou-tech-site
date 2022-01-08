---
title: Kubernetesマニフェスト作成 - バッチアプリケーション
author: noboru-kudo
date: 2022-01-30
prevPage: ./src/posts/k8s-tutorial/app/web-app.md
---

[前回](/containers/k8s/tutorial/app/web-app/)は、ローカル環境のKubernetesでタスク管理ツールのWebアプリケーションを動かすことができました。

今回は日次でタスク完了レポートを出力するバッチアプリケーションを作成してみましょう。
Kubernetesを利用する主なメリットとして、セルフヒーリングによる耐障害性強化や、大規模トラフィックに耐えられるスケーラビリティが得られる等の印象が強いかと思います。
このような背景から、Kubernetesを持続的な稼働が求められるWeb/API用のものと想像する方が多いですが、バッチ処理のようなワンショットなワークロードにも対応しています。

今回作成するレポート出力機能は以下の構成になります。

![](https://i.gyazo.com/33e539dccf8bb554919cb2ddc034f0b9.png)

WebアプリケーションでDynamoDBに蓄積したタスク情報から、前日完了したタスクをレポート(CSVファイル)として作成し、S3に保管するものです。

それでは早速開始しましょう。

[[TOC]]

## 事前準備

Webアプリケーションが構築されていることが前提となります。
未実施の場合は[前回](/containers/k8s/tutorial/app/web-app/)を参考に、ローカル環境をセットアップしてください。

## 利用するKubernetesリソース

今回はCronJobリソース(オブジェクト)を使用してジョブをセットアップします。
CronJob自体はJobリソースを指定時間に実行するだけのものですので、まずはJobを抑えておきましょう。

### Job
ワンショットなアプリケーションの実行し、そのステータスを管理します。
JobはDeploymentと違い、指定した全てのPod(バッチ)が正常に終了した場合(exit code=0)は、再起動等は行いません。

ワンショットなアプリケーション自体は、単純にPodを作成するだけでも実行可能ですが、異常終了の考慮や並列実行等をする場合は、それ以外に多くの作業が必要になります。
Jobを利用することで、リトライやタイムアウト、並列実行等のバッチ固有の作業をKubernetes側に委ねることができます。

Jobでよく使われるパラメータには、主に以下があります。

| パラメータ | 内容
| -------- | ------------------------------------------
| backoffLimit | リトライ回数。失敗したPodは指定した回数(デフォルトは6回)リトライされ、全て失敗するとジョブは`Failed`ステータスになります。
| activeDeadlineSeconds | Jobの開始から指定した秒数を経過しても終了しない場合に、Podを強制終了させます。
| completions | 指定した回数Podを作成・実行します。`completionMode: Indexed`と併用すれば、環境変数`JOB_COMPLETION_INDEX`から現在の実行中のPodのインデックスを識別できます。
| parallelism | 指定数分のPodが並列に実行されます。`completions`と組み合わせて利用します。
| ttlSecondsAfterFinished | ジョブの実行完了(成功、失敗ともに)後にJobと配下のPodを残す時間。この間は完了したPodのログ等を確認できます。

マスタデータの取り込みや、データエクスポート等、単純なものはほとんどがこれで賄えますが、組織によってバッチアプリケーションは様々な要件があると思います[^2]。
Jobの実装パターンは、公式ドキュメントで整理されていますので、プロジェクトにあったバッチ方式を検討する上で参考にすると良いでしょう。

- <https://kubernetes.io/docs/concepts/workloads/controllers/job/#job-patterns>

[^2]: SpringBatch等の起動オーバーヘッドが大きい場合は毎回Podを起動するJobではなく、Deploymentとして常時Podを起動しておいてHTTP等で起動することも考えられます。また、他の選択肢としてワークフローエンジンの採用も検討すると良いでしょう。

### CronJob

その名の通り、CronJobは指定したスケジュールでJobを生成します。
Jobはその生成時に一度だけ実行しますが、CronJobでラップすることで、指定した時刻にJobを実行するジョブスケジューラの役割を果たします[^3]。

[^3]: もちろん、JP1のようなジョブスケジューラを既に利用している場合は、あえてCronJobを利用する必要はありません。

毎時0分に2並列で多重実行するバッチの場合は、以下のようなイメージになります。

![](https://i.gyazo.com/2b62038e063d321e410cd82425b1a093.png)

このようにCronJobは指定されたスケジュールでJobを作成ます。JobはPodを作成してバッチ処理を指定された並列度で実行します。
バッチ処理が失敗した場合は、指定された回数再実行（新しいPodを生成）します。

CronJob固有のものだと、以下のパラメータがよく利用されます。

| パラメータ                | 内容
| ----------------------- | ------------------------------------------
| schedule                | 必須属性。Cronフォーマットでスケジュールを記述します。[こちら](https://crontab.guru/)を参考に設定すると良いでしょう。
| concurrencyPolicy       | 前のジョブが実行中のまま次のジョブ実行時間が到来した場合のポリシー(`Forbid`/`Allow`/`Replace`)を指定します。
| failedJobsHistoryLimit  | 失敗したJobを残す世代数を指定します。
| successfulJobsHistoryLimit | 成功したJobを残す世代数を指定します。
| startingDeadlineSeconds | ジョブが指定した時刻に起動できなかった場合にどのくらいの時刻超過での起動を許容するかを指定します。
| suspend                 | 障害等で一時的にバッチ処理を停止したい場合に`true`を指定します。

## 環境セットアップ

では、ここからバッチアプリケーションをローカル環境で動かしていきましょう。
今回もソースコードについては、前回と同じリポジトリを使用します。

- <https://github.com/mamezou-tech/k8s-tutorial>

`app`ディレクトリ配下が対象のソースコードになります。
今回利用する部分は以下(★)の通りです。

```
.
├── apis
│   └── task-service -> 前回構築済み：API(Node.js)ソースコード
├── jobs
│   └── task-reporter -> ★ バッチ(Node.js)ソースコード
├── k8s
│   ├── v1　-> 前回構築済み：Web向けのKubernetesマニフェスト(ローカル向け)
│   └── v2 -> ★ Web+Batch向けのKubernetesマニフェスト(ローカル向け)
└── web -> 前回構築済み：UIリソース(Vue.js)
```

今回は完了レポートの出力先としてS3を選択します。まずはローカル環境のLocalStackにS3バケットを準備しましょう。
前回既にLocalStackは起動済みですので、そこにS3バケットを追加します。
`app/k8s/v2`に`app/k8s/v1/localstack`をコピーして以下を追記しましょう。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: localstack-init-scripts-config
data:
  # AWS Credential情報初期化
  01-credential.sh: |
    #!/bin/bash
    aws configure set aws_access_key_id localstack
    aws configure set aws_secret_access_key localstack
    aws configure set region local
    export LOCALSTACK_ENDPOINT=http://localhost:4566

  # (DynamoDB生成スクリプト省略)

  # S3バケット作成
  03-create-bucket.sh: |
    #!/bin/bash
    aws s3api create-bucket --bucket completed-task-report-bucket --endpoint ${LOCALSTACK_ENDPOINT}
    aws s3api list-buckets --endpoint ${LOCALSTACK_ENDPOINT}
```

バッチ処理がアップロードするS3バケットを作成するスクリプトを配置しました。
これを適用して、LocalStackを再起動しましょう。

```shell
# 初期化スクリプト更新
kubectl apply -f k8s/v2-ans/localstack/
# LocalStack再起動
kubectl rollout restart deploy localstack
```

LocalStackのログを参照すると対象のS3バケットが生成されていることが分かるはずです。確認できればLocalStackの準備は完了です。

また、Webアプリケーションのときに作成した`k8s/v1/ingress`/`k8s/v1/task-service`ディレクトリについてもそのまま使用しますので`v2`ディレクトリにコピーしておきましょう。

## マニフェストファイル作成

それではKubernetesのマニフェストファイルを作成していきましょう。
今回作成するリソースは以下です。

- ConfigMap: バッチ処理の設定情報
- CronJob: Jobの定義とそのスケジュール

完成形のイメージは以下のようになります。

TODO

### ConfigMap

それでConfigMapを作成しましょう。ここでは[前回](/containers/k8s/tutorial/app/web-app/#configmap-2)同様にアプリケーションの設定を記述します。
`app/k8s/v2/task-reporter`ディレクトリを作成し、その中に`configmap.yaml`を配置しましょう。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: task-reporter-config
data:
  STAGE: localstack
  NODE_ENV: development
  TZ: Asia/Tokyo
  REPORTING_BUCKET: completed-task-report-bucket
  AWS_ENDPOINT: http://localstack:4566
  AWS_DEFAULT_REGION: local
  AWS_ACCESS_KEY_ID: localstack
  AWS_SECRET_ACCESS_KEY: localstack
```

記述内容もWebアプリケーションで作成したものとほぼ同じですが、S3のバケット名を追加設定しています。

### CronJob

続いてCronJobです。
`app/k8s/v2/task-reporter`ディレクトリ内に`cronjob.yaml`を作成しましょう。

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: task-reporter
  labels:
    app: task-reporter
spec:
  # CronJobの設定
  schedule: "0 15 * * *"
  # 失敗ジョブは3世代保有
  failedJobsHistoryLimit: 3
  # 成功ジョブは3世代保有
  successfulJobsHistoryLimit: 3
  # 重複実行を許可(デフォルト値)
  concurrencyPolicy: Allow
  # スケジュールは有効(デフォルト値)
  suspend: false
  jobTemplate:
    metadata:
      labels:
        app: task-reporter
    spec:
      # Jobの設定
      # 1回成功すれば完了(デフォルト値)
      completions: 1
      # 並列実行しない(デフォルト値)
      parallelism: 1
      # 1時間以内で終了
      activeDeadlineSeconds: 3600
      # 10回リトライ
      backoffLimit: 10
      template:
        metadata:
          labels:
            app: task-reporter
        spec:
          # ワンショットのため再起動はしない(Job側で制御)
          restartPolicy: Never
          # Podの設定
          containers:
            - name: task-reporter
              image: task-reporter
              # LocalなのでImagePullはしない
              imagePullPolicy: Never
              # ConfigMapから環境変数を指定
              envFrom:
                - configMapRef:
                    name: task-reporter-config
              # アプリで使用する一時領域(emptyDirをコンテナにマウント)
              env:
                - name: TEMP_DIR
                  value: /var/app/temp
              volumeMounts:
                - mountPath: /var/app/temp
                  name: app-temp-dir
          volumes:
            - name: app-temp-dir
              emptyDir:
                sizeLimit: 10Gi
```

CronJobではCronJob自体の設定に加えて、Job、Podの設定を記述する3段階ネストした形になっていることが分かります。
それぞれのフィールドの説明は前述の通りで、インラインで内容を記載しています。
注意点としては、`schedule`には15:00に起動するように指定しています。ここで指定する時刻はUTC時刻で日本時間の24:00という意味になりますので注意してください（おそらくほとんどのクラウド環境のタイムゾーンはUTCになっているかと思います）。

また、Volumeとして`emptyDir`をマウントしています。これはアプリでS3にアップロードする前に一時的に使用する領域として使用しています(環境変数`TEMP_DIR`としてアプリに通知)。
これはPod起動時に作成され、削除されるとこのボリュームも削除されます。`emptyDir`ボリュームの詳細は[公式ドキュメント](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)を参照してください。

## アプリケーションのデプロイ

では、これをLocalStackにデプロイしましょう。
ここまでくると`k8s`ディレクトリは以下の状態になっているはずです。

```
k8s
├── v1 -> 今回は使用しない
└── v2
    ├── ingress -> v1からコピー
    │   └── ingress.yaml
    ├── localstack -> 修正して適用済み
    │   └── localstack-init-scripts-config.yaml
    ├── task-reporter -> 新規追加
    │   ├── configmap.yaml
    │   └── cronjob.yaml
    └── task-service -> v1からコピー
        ├── configmap.yaml
        ├── deployment.yaml
        └── service.yaml
```

Webアプリケーションデプロイ時にSkaffoldのパイプライン定義である`skaffold.yaml`を作成済みですので、そこにバッチアプリケーションの部分を追記しましょう。
以下のようになります。

```yaml
apiVersion: skaffold/v2beta26
kind: Config
metadata:
  name: app
build:
  artifacts:
  - image: task-service
    context: apis/task-service
    docker:
      dockerfile: Dockerfile.local
  # バッチアプリ追加
  - image: task-reporter
    context: jobs/task-reporter
    docker:
      dockerfile: Dockerfile.local
deploy:
  kubectl:
    manifests:
    # v1 -> v2ディレクトリにコピーしたものを使用するようパス修正
    - k8s/v2/task-service/*.yaml
    - k8s/v2/ingress/*.yaml
    # バッチアプリ追加
    - k8s/v2/task-reporter/*.yaml
```

`build`ステージに、バッチアプリとして`jobs/task-reporter`ディレクトリのDockerfileでコンテナをビルドする指定をしています。
また、`deploy`ステージでは、先程作成したCronJobやConfigMapのマニフェストを指定しました。

## 動作確認

後はデプロイして、バッチアプリケーションを起動しましょう。
デプロイはいつものように以下のコマンドのみです。

```shell
skaffold dev
```

Webアプリケーション同様にバッチアプリケーションのコンテナビルド

```shell
# minikube: 仮想マシン上のLocalStack
LOCALSTACK_ENDPOINT="http://$(minikube ip):30000"
# Docker Desktop: HostOSで実行されているDocker(localhost)
LOCALSTACK_ENDPOINT="http://localhost:30000"

aws s3 ls s3://completed-task-report-bucket --endpoint ${LOCALSTACK_ENDPOINT}
aws s3 cp s3://completed-task-report-bucket/undone-tasks-2022-01-08.csv . --endpoint ${LOCALSTACK_ENDPOINT}
```

## まとめ

## クリーンアップ