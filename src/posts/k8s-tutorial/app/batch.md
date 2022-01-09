---
title: Kubernetesマニフェスト作成 - バッチアプリケーション
author: noboru-kudo
date: 2022-01-30
prevPage: ./src/posts/k8s-tutorial/app/web-app.md
---

[前回](/containers/k8s/tutorial/app/web-app/)は、ローカル環境のKubernetesでタスク管理ツールのWebアプリケーションを動かすことができました。

今回は日次でタスク完了レポートを出力するバッチアプリケーションを作成してみましょう。
Kubernetesを利用する主なメリットとして、セルフヒーリングによる耐障害性強化や、大規模トラフィックに耐えられるスケーラビリティが得られる等の印象が強いかと思います。
このような背景から、Kubernetesを持続的な稼働が求められるWeb/API用のものと思われがちですが、バッチ処理のようなワンショットなワークロードにも対応しています。

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
指定した並列度でワンショットなアプリケーションを実行し、そのステータスを管理します。
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
Jobはその生成時に一度実行しますが、CronJobでラップすることで、指定した時刻にJobを実行するジョブスケジューラの役割を果たします[^3]。

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

  # DynamoDB生成スクリプト: 省略(前回同様)

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
kubectl apply -f k8s/v2/localstack/
# LocalStack再起動
kubectl rollout restart deploy localstack
```

LocalStackのログを参照すると、対象のS3バケットが生成されていることが分かるはずです。確認できればLocalStackの準備は完了です。

また、Webアプリケーションのときに作成した`k8s/v1/ingress`/`k8s/v1/task-service`ディレクトリについても、そのまま使用しますので`v2`ディレクトリにコピーしておきましょう。

## マニフェストファイル作成

それでは、バッチアプリケーションのKubernetesのマニフェストファイルを作成していきましょう。
今回作成するリソースは以下です。

- ConfigMap: バッチ処理の設定情報
- CronJob: Jobの定義とそのスケジュール

細かいパラメータは省略していますが、完成形のイメージは以下のようになります。

![](https://i.gyazo.com/853748931295f736c3d39db398d0ac6a.png)

### ConfigMap

まずはConfigMapから作成しましょう。ここでは[前回](/containers/k8s/tutorial/app/web-app/#configmap-2)同様にアプリケーションの設定を記述します。
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
  TASK_TABLE_NAME: tasks
  REPORT_BUCKET: completed-task-report-bucket
  TARGET_OFFSET_DAYS: "0"
  AWS_ENDPOINT: http://localstack:4566
  AWS_DEFAULT_REGION: local
  AWS_ACCESS_KEY_ID: localstack
  AWS_SECRET_ACCESS_KEY: localstack
```

記述内容もWebアプリケーションで作成したものとほぼ同じですが、S3のバケット名(`REPORT_BUCKET`)と対象とするデータのオフセット(`TARGET_OFFSET_DAYS`)を追加で設定しています。
オフセットは、商用運用では前日分の`1`を想定していますが、今回作成するローカル環境では動作確認のため当日分を表す`0`を指定しています。

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
それぞれのフィールドの説明は前述の通りで、上記インラインで内容を記載しています。
注意点としては、`schedule`には15:00に起動するように指定しています。ここで指定する時刻はUTC時刻で、日本時間では24:00という意味になりますので注意してください（おそらくほとんどのクラウド環境のタイムゾーンはUTCになっているかと思います）。

また、ボリュームとして`emptyDir`をマウントしています。これはアプリでS3にアップロードする前に一時的に使用する領域として使用しているためです(環境変数`TEMP_DIR`としてアプリに通知)。
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
デプロイはいつものように以下のコマンドです。

```shell
skaffold dev
```

Skaffoldによって、Webアプリケーションに加えて、バッチアプリケーションのコンテナビルドが実行され、デプロイされている様子が確認できるはずです。
失敗する場合はディレクトリ構成やSkaffoldの定義を再確認してください。

以下のコマンドでCronJobの内容を確認しましょう。

```shell
kubectl describe cj task-reporter
```
以下抜粋です。
```
Name:                          task-reporter
Namespace:                     default
Labels:                        app=task-reporter
Schedule:                      0 15 * * *
Concurrency Policy:            Allow
Suspend:                       False
Successful Job History Limit:  3
Failed Job History Limit:      3
Starting Deadline Seconds:     <unset>
Selector:                      <unset>
Parallelism:                   1
Completions:                   1
Active Deadline Seconds:       3600s
Pod Template:
  Labels:  app=task-reporter
  Containers:
   task-reporter:
    Image:      task-reporter:88298b9f6127ed2f1eeb79830b6a732f9b5c6fcc2abfeb1a6343a767cd614166
    Environment Variables from:
      task-reporter-config  ConfigMap  Optional: false
    Environment:
      TEMP_DIR:  /var/app/temp
    Mounts:
      /var/app/temp from app-temp-dir (rw)
  Volumes:
   app-temp-dir:
    Type:            EmptyDir (a temporary directory that shares a pod's lifetime)
    Medium:          
    SizeLimit:       10Gi
```

CronJobのマニフェストが反映されていることが分かります。

### Jobの手動実行

今回完了タスクレポートは24:00に起動するようにしていますが、ローカル環境の動作確認でこれを待つ訳にもいきません。
KubernetesではCronJobのスケジュールを無視して、アドホックに実行することができます。
別ターミナルを起動し、以下のコマンドを実行してください。

```shell
kubectl create job test1 --from cj/task-reporter
```

`test1`の部分はCronJobから作成されるJobの名前です。繰り返し実行する場合は、前のJobを削除(`kubectl delete job <job-name>`)するか、生成時に任意の名前に変更してください。
こちらを実行すると、Jobが実行されている様子がSkaffoldのターミナルの方から確認できるはずです。

kubectlからも確認してみましょう。

```shell
kubectl get job,pod -l app=task-reporter
```
```shell
NAME              COMPLETIONS   DURATION   AGE
job.batch/test1   1/1           8s         69m

NAME                 READY   STATUS      RESTARTS   AGE
pod/test1--1-4v8d2   0/1     Completed   0          69m
```

Job、Podが生成され、その後実行したバッチ処理が正常終了(`Completed`)している様子が確認できます。

前日の完了タスクがないとジョブは空振りになりますので、WebUI（`http://localhost:8080`)から何件かタスク情報を登録して、完了にしてください。

タスクの登録・更新が完了したら、再度ジョブを作成しましょう。

```shell
kubectl create job test2 --from cj/task-reporter
```

Skaffoldのターミナルのコンテナログを見ると、DynamoDBから完了タスク情報を抽出してS3にアップロードしている様子が確認できるはずです。
ローカル環境から、AWS CLIでアップロードされたファイルについても確認してみましょう。

```shell
# minikube: 仮想マシン上のLocalStack
LOCALSTACK_ENDPOINT="http://$(minikube ip):30000"
# Docker Desktopの場合
# LOCALSTACK_ENDPOINT="http://localhost:30000"

# Bucket内を表示
aws s3 ls s3://completed-task-report-bucket \
  --endpoint ${LOCALSTACK_ENDPOINT}
# ファイルをローカルにコピー。上記で表示されたファイル名を指定してください
aws s3 cp s3://completed-task-report-bucket/completed-tasks-20xx-xx-xx.csv . \
  --endpoint ${LOCALSTACK_ENDPOINT}
```

ローカル環境のカレントディレクトリにコピーしたファイルの内容を見ると、以下のように完了タスクがCSVで出力されているのが確認できるはずです。

```
taskId,userName,completedTime,title
7e3790d5-7ee9-4f0b-a6d5-d2db2f084919,kudoh,10:02,"スプリントプランニング"
bfc1df33-a37e-4c64-b141-ac0636b2e0df,kudoh,10:02,"デザインレビュー"
9b097f87-f767-41cc-b9e8-7083d8579672,kudoh,10:02,"レトロスペクティブ"
```

何もレコードが出力されていない場合は、タスクが登録されていないか、完了ステータスに更新されていないことが考えられます。WebUIの方を再度確認してみてください。

### Jobのリトライ確認

次にJobを失敗させてリトライがされていることを確認しましょう。LocalStackへの接続エラーを擬似的に実施します。
以下を実行して、LocalStackのService公開ポート4566を一時的に変更してみましょう。

```shell
kubectl edit svc localstack
```

エディタが起動しますので、LocalStackの公開ポート番号を任意の値に変更して保存します。

![](https://i.gyazo.com/78c3e3f4f8f50dadd5c1e92ff281eae7.png)

この状態で再度Jobを起動してみましょう。

```shell
kubectl create job test3 --from cj/task-reporter
```

少し待ってから、以下のコマンドでPodの状態を見てみましょう。

```shell
kubectl get pod -l job-name=test3 --sort-by .status.startTime
```

```
NAME             READY   STATUS    RESTARTS   AGE
test3--1-95lzc   0/1     Error     0          57s
test3--1-nrvvt   0/1     Error     0          45s
test3--1-2krpc   0/1     Error     0          23s
test3--1-mpqwm   1/1     Running   0          3s
```

LocalStackの接続に失敗するようになりますので、Podが失敗してリトライが繰り返されていることが確認できます。
今回はJobの設定で`backoffLimit`を10として指定しましたので、10回失敗すると、Jobは失敗状態となり以降のリトライは中断されます。

10回失敗する前に、再度`kubectl edit svc localstack`を実行し、先程変更したポート番号を4566に戻しましょう。
もう一度少し待ってから、Podの状態を確認すると、以下のようにリトライが成功(Completed)していることが分かります。

```
NAME             READY   STATUS      RESTARTS   AGE
test3--1-95lzc   0/1     Error       0          4m37s
test3--1-nrvvt   0/1     Error       0          4m25s
test3--1-2krpc   0/1     Error       0          4m3s
test3--1-mpqwm   0/1     Error       0          3m43s
test3--1-2bv9l   0/1     Error       0          3m3s
test3--1-r6wxc   0/1     Completed   0          23s
```

### CronJobのスケジュール確認

これまでJobを手動で作成していましたので、CronJobのスケジュールを利用して実行していません。
最後に、CronJobの`schedule`を`*/3 * * * *`(3分間隔)に変更して、スケジュール通りに実行されていることを確認しましょう。

Skaffoldのターミナルで、3分毎にJobが実行されていることが確認できるはずです。
Jobの内容からも実行履歴が確認できます。今回は`successfulJobsHistoryLimit: 3`と設定していますので3世代分が履歴として残ります。

```shell
kubectl get job -l app=task-reporter --sort-by status.startTime \
  -o custom-columns=NAME:.metadata.name,START:.status.startTime,COMPLETED:.status.completionTime
```

```
NAME                     START                  COMPLETED
task-reporter-27361767   2022-01-09T05:27:00Z   2022-01-09T05:27:07Z
task-reporter-27361770   2022-01-09T05:30:00Z   2022-01-09T05:30:08Z
task-reporter-27361773   2022-01-09T05:33:00Z   2022-01-09T05:33:08Z
```

また、CronJobのスケジュールを一旦停止したい場合は、以下のように`suspend: false`に変更すると中断することができます。

```shell
kubectl patch cj task-reporter --patch '{"spec": {"suspend": true}}'
```

`kubectl get cj -l app=task-reporter`でCronJobの状態を確認すると`SUSPEND`が`True`となっていることが確認できます。
上記を逆の設定(`"suspend": false`)で変更するとスケジュールは再開します。

## まとめ

今回は、バッチアプリケーションをローカル環境のKubernetesに載せて、以下のことを実施しました。

- 仮想のAWSリソースとしてLocalStack(DynamoDB/S3)を使用
- バッチ処理の実行にCronJob/Jobを作成
- SkaffoldでWebアプリに加えてバッチアプリのKubernetesリソースをデプロイ
- 手動でJobを作成して正常に動作することを確認
- エラー時にリトライが実行されていることを確認
- スケジュール機能の動作確認

Webアプリケーション同様に、バッチアプリケーションについても、ローカル環境で本番同等の確認ができることが分かったと思います。

## クリーンアップ

アプリ自体については、Skaffoldのプロセスを終了(Ctrl+C)するだけでアンデプロイします。

LocalStackのアンインストールについては[こちら](/containers/k8s/tutorial/app/localstack/#クリーンアップ)を参照してください。
ローカルKubernetesのminikubeは[こちら](/containers/k8s/tutorial/app/minikube/#クリーンアップ)を参照してください。