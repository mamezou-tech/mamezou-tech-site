---
title: Kubernetesマニフェスト作成 - Webアプリケーション
author: noboru-kudo
date: 2021-12-28
prevPage: ./src/posts/k8s-tutorial/app/localstack.md
---

ここまででローカル環境で開発する準備が整いました。
ここからは、実際に動くアプリケーションをローカル環境にデプロイしましょう。

このチュートリアルでは一般的によくあるであろうシンプルなWebアプリケーションとバッチアプリケーションを例に見ていきます。
題材としてはタスク管理ツールとします。このツールの機能としては以下になります。

- ユーザー向けに、Webブラウザからタスク登録、完了更新する機能（UI+API）
- 管理者向けに、日次で前日完了したタスクをレポートする機能(バッチジョブ)

これらを2回に分けて実装していきます。今回は1つ目のWebアプリケーションの方を見ていきましょう。
以下のような構成になります。

![](https://i.gyazo.com/f0b5f99296d14d9dc1dfeb33f91b02c9.png)

WebアプリケーションはVue.jsで作成されたユーザーインターフェースから、タスク管理API(task-service)を通じてバックエンドのDynamoDBにタスク情報を登録できるような非常にシンプルなものです。

[[TOC]]

## 事前準備

これまでローカル環境で準備したものを全て使用します。未セットアップの場合は以下を参考にローカル環境の開発環境を整えてください。

- [実行環境(minikube)](/containers/k8s/tutorial/app/minikube/)
- [自動化ツール(Skaffold)](/containers/k8s/tutorial/app/skaffold/)
- [ローカルAWS(LocalStack)](/containers/k8s/tutorial/app/localstack/)

なお、minikubeはDocker Desktopでも代用可能です。

また、UI/アプリケーションはNode.jsを利用します。こちらも別途インストールしてください。今回は現時点で最新の安定版である`v16.13.1`を利用しています。

- https://nodejs.org/en/download/

## 利用するKubernetesリソース

さて、ここからすぐに作業に着手したいところですが、まずはアプリ開発で抑えておくべきKubernetesのリソース(オブジェクト)についての概要を説明します。
これまでも何度か出てきており、無意識に理解しているかもしれませんが、ここをきちんと理解するとできることの幅が広がります。
既に理解している場合はスキップして構いません。

### Service

Serviceは一群のPodが安定して機能を提供するために、主に以下の仕組みが実装されています[^1]。
[^1]: Serviceの詳細はKubernetesの[公式ドキュメント](https://kubernetes.io/docs/concepts/services-networking/service/)を参照してください。

- 静的エンドポイント提供：Pod群(つまりService)に対して静的なIPアドレス/ドメインを割り当てる
- サービスディカバリー：バックエンドのPod群に対してトラフィックを負荷分散する(kube-proxy)
- クラスタ外部への公開(ServiceType)：NodePortやLoadBalancer等を利用してサービスをクラスタ外部に公開する[^2]

これは内部DNS、ラベルセレクターによるルーティング先Podの動的管理、実際の負荷分散を担うkube-proxy等によって実現されています。
[^2]: 今回はIngressを使用するため、ここでは触れませんが、これを利用することで様々な形でクラスタ外部からのリクエストに応えることができます。詳細は[こちら](https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types)を参照してください。

具体的にはServiceの生成が検知されると、Kubernetes内では以下のような動きをします(Service`foo`で3Podを管理する例)。

![](https://i.gyazo.com/bb8d4ca6846ef8cf57fa051420bfdb3a.png)

1. ServiceのドメインをControl Planeの内部DNSにServiceのエントリ(Aレコード/SRVレコード)を追加する[^3]
2. Serviceのラベルセレクターからルーティング対象のPodをルックアップして、PodのIPアドレス等をEndpointとして登録する
3. 各ノードに配置されているkube-proxy(Control Plane)は、Service/Endpointの情報からルーティングルール[^4]を更新する（実際にクライアントからリクエストがあった場合は、これを利用して各Podに負荷分散）。

[^3]: これについてはLocalStack構築時の[動作確認](/containers/k8s/tutorial/app/localstack/#動作確認)でも触れています。

[^4]: kube-proxyで使われる負荷分散は、デフォルトではLinuxのiptablesが使われており、ランダムアルゴリズムでルーティングされます。

この仕組みは初回のみでなく、関連するリソースに変更があった場合はループするようになっています(Control LoopとかReconciliation Loopと呼ばれます)。
配下のPodが新規生成や削除された場合は、この動作が再度実施されて常に最新状態に保たれるようになっています。

Serviceのもう1つ重要な役割として、ルーティングルールを正常なPodのみで構成する機能があります。これは以下のように動きます。
![](https://i.gyazo.com/7de15bfaba007e423a085813e306b372.png)

このように、ServiceリソースはPodに定義されたReadinessProbeのヘルスチェックの結果を監視し、異常を検知したPodはトラフィックルーティングから除外されます。
もちろんその後Podが復旧した場合は逆の動きをします(ルーティングルールに追加)。

### Deployment

Deploymentはアプリケーションの更新を宣言的に行うためのリソースです[^5]。

[^5]: 他にもStatefulSetやDaemonSetが存在します。詳細は[こちら(StatefulSet)](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)や[こちら(DaemonSet)](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)を参照してください。

DeploymentがなくてもPod単体でデプロイすることは可能ですが、新バージョンをリリースする場合にどうすればよいでしょうか？
最もシンプルな方法は旧バージョンを削除して新バージョンをデプロイすれば良いですが、ダウンタイムをなくすためには、Blue-Greenデプロイを使って旧バージョンと並行して新バージョンをリリースし、正常に動作確認が取れたら旧バージョンを削除する等の工夫が必要になるでしょう。
また、アプリケーションが複数レプリカで動作させる場合には、さらに複雑なデプロイ作業が必要になるでしょう。

Deploymentを導入することで、マニフェストに期待する状態を記載するだけで、それ以降のオペレーションはKubernetesに任せることができます[^6]。
[^6]: 一般的にPod単体でデプロイすることは、デバッグ等の一時的な利用を除いてまずありません。
Deploymentは主に以下の機能を提供します。

- レプリカ管理：Podで必要なレプリカ数を維持する。内部的にはReplicaSetを使用する。
- デプロイ：デプロイ戦略として順次更新(RollingUpdate)/と再作成(Recreate)を提供する。
- リビジョン管理：デプロイしたアプリケーションのバージョン管理を行い、ロールバック・デプロイ中断等の機能を提供する。

以下はRollingUpdateでアプリケーションをバージョンアップ(v1->v2)するイメージです。

![](https://i.gyazo.com/39e353754e0e09f9b74285088987b5d2.png)

図では分かりにくいですが、Deploymentで新しいバージョンをデプロイすると、新バージョンのPodが少しずつ(デフォルトはレプリカ数の25%)起動し、ヘルスチェックが通って正常に起動すると今度は旧バージョンのPodがアンデプロイされていくようになります[^7]。

もう1つのデプロイ戦略で選択できるRecreateは、旧バージョンのPodを全て削除した後で、新バージョンのデプロイを開始します。
この場合はダウンタイムは発生しますが、アプリが複数バージョン並行で実行できない場合はこちらを選択するとよいでしょう（デフォルトはRollingUpdateのため明示的に指定が必要です）。

[^7]: RollingUpdateは新バージョンが正常に起動してから、旧バージョンを終了するように動作しますので、一時的に指定したレプリカ数を超えるPod(新+旧)が起動することになります。多くのメモリやCPUを必要とするPodでRollingUpdateをする場合は、ノードのキャパシティに余裕をもたせる必要があります。

DeploymentはこのReplicaSetを履歴として管理していますので、過去のデプロイ履歴参照やロールバックは以下のコマンドで実行することが可能です。

```shell
# デプロイ履歴を一覧表示
kubectl rollout history deploy <deployment-name>
# 特定のリビジョンのデプロイ内容を詳細表示
kubectl rollout history deploy <deployment-name> --revision <rev-number>
# 特定のリビジョンのデプロイにロールバック
kubectl rollout undo deploy <deployment-name> --to-revision <rev-number>
```

### ConfigMap

ConfigMapはアプリケーション内の設定を外部リソースとして分離します。
設定情報は環境によって異なるものが多いですが、アプリケーション内に持たせるとその都度ビルドが必要になります。
ConfigMapを使うことで、同一イメージで、複数環境に応じて設定を切り替えることが可能となります。

ConfigMapはキーバリュー型で記述し、環境変数またはボリュームとしてPodにマウントすることで利用可能となります。
アプリケーションで使う設定ファイルをそのまま値として記述し、これをそのままボリュームとしてマウントして、アプリケーションで参照するやり方はよく使われます。

例えば、Spring Bootのapplication.ymlの場合は以下のようになります。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: spring-boot-sample-config
data:
  application.yml: |
    spring:
      datasource:
        url: jdbc:postgresql://my-postgresql:5432/sample
    logging:
      level:
        com.mamezou.sample: debug
```

これはキーにファイル名として`application.yml`、バリューとしてSpring Bootの設定を記述しておきます。
そして、これをPodにボリュームとしてマウントすれば、Spring Bootにこの設定を`application.yml`ファイルとして読み込ませることが可能になります。

今回は利用しませんが、多くのアプリケーションは通常は認証用パスワードやAPIトークン等、センシティブ情報も設定情報として持っています。
このようなリソースをConfigMapに持たせてしまうと、ConfigMapのGit管理やRBAC、暗号化等の情報管理が煩雑になります。
この場合は、ConfigMapではなく[Secret](https://kubernetes.io/docs/concepts/configuration/secret/)リソースを使ってください（Vault等外部のプロダクトを使う場合は除く）。
Secretを使うことで、Kubernetes内(etcd)での暗号化や、ボリュームマウントのインメモリ(tempfs)化等の多くのセキュリティ上のメリットを享受することができます[^8]。

[^8]: とはいえ、kubectlでSecretを参照(`kubectl get secret -o yaml <secret-name>`)し、値をbase64デコードすれば中身が見れますので、SecretリソースはRBACでアクセス不可とするのが望ましいでしょう。

## 環境セットアップ

では、ここからローカル環境でアプリケーションをデプロイしていきましょう。
本チュートリアルではアプリケーションの実装自体が目的ではありませんので、ソースコードについては事前にGitHubに用意しました。
以下のリポジトリをクローンしてローカル環境に配置してください。

- <https://github.com/mamezou-tech/k8s-tutorial>

`app`ディレクトリ配下が対象のソースコードになります。
今回利用する部分は以下のとおりです(それ以外については無視してください)。

```
.
├── apis
│   └── task-service -> API(Node.js+Express)ソースコード
├── k8s
│   └── v1 -> Kubernetesマニフェスト(ローカル向け)
└── web -> UIリソース(Vue.js)
```

アプリケーションマニフェスト作成前に、LocalStack上のAWSリソース作成しておきましょう。
[こちら](/containers/k8s/tutorial/app/localstack/)を済ませた方は、既にローカル環境でLocalStackが動作しているはずです。

このときは、初期化スクリプトでサンプルのAWSリソースとしてDynamoDBとS3を作成しましたが、今回はDynamoDBのみで構いません。
`app/k8s/v1/localstack`を作成し、`localstack-init-scripts-config.yaml`を配置しましょう。
以下の内容でConfigMapのリソースを記述してください。

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
  # DynamoDBテーブル作成
  02-create-task-table.sh: |
    #!/bin/bash
    aws dynamodb create-table --table-name tasks \
      --key-schema  AttributeName=task_id,KeyType=HASH \
      --attribute-definitions file:///docker-entrypoint-initaws.d/02-task-attr-definitions.json \
      --global-secondary-indexes file:///docker-entrypoint-initaws.d/02-task-gsi.json \
      --billing-mode PAY_PER_REQUEST \
      --endpoint ${LOCALSTACK_ENDPOINT}
    aws dynamodb list-tables --endpoint ${LOCALSTACK_ENDPOINT} --region local
  02-task-attr-definitions.json: |
    [
      {
        "AttributeName": "task_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "start_at",
        "AttributeType": "N"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "N"
      },
      {
        "AttributeName": "user_name",
        "AttributeType": "S"
      },
      {
        "AttributeName": "status",
        "AttributeType": "S"
      }
    ]
  02-task-gsi.json: |
    [
      {
        "IndexName": "user_index",
        "KeySchema": [
          {
             "AttributeName": "user_name",
             "KeyType": "HASH"
          },
          {
             "AttributeName": "start_at",
             "KeyType": "RANGE"
          }
        ],
        "Projection": {
            "ProjectionType": "ALL"
        }
      },
      {
        "IndexName": "status_index",
        "KeySchema": [
          {
             "AttributeName": "status",
             "KeyType": "HASH"
          },
          {
             "AttributeName": "updated_at",
             "KeyType": "RANGE"
          }
        ],
        "Projection": {
            "ProjectionType": "ALL"
        }
      }
    ]
```

前回と違ってだいぶ複雑になりましたが、やっていることはDynamoDBのテーブルとインデックス(Global Secondary Index)を作成しているだけです。
スキーマ定義が若干複雑になりましので、別途JSONファイルとして作成し、初期化スクリプト(`02-create-task-table.sh`)はそこからテーブルやインデックスを作成するようにしています。

ConfigMapで言及した通り、ここではConfigMap内にファイル自体(シェルやJSON)を値として設定していますので、これをボリュームとしてPodにマウントすれば、LocalStackは初期化スクリプトとして認識します。

これをローカル環境のKubernetesに投入しましょう。

```shell
kubectl apply -f k8s/v1/localstack/localstack-init-scripts-config.yaml
```

これを認識させるためにLocalStackを再起動しましょう。Helmチャートの中でLocalStackはDeploymentとして作成されています。
Deployment配下のPodを全て再起動するには、以下のコマンドを実行します。

```shell
kubectl rollout restart deploy localstack
```

実際に作成されたかについては、[LocalStackでの動作確認](/containers/k8s/tutorial/app/localstack/#動作確認)を参考にチェックしてみてください。
LocalStack上のAWSリソースについては、これで準備完了です。

## マニフェストファイル作成

それではKubernetesのマニフェストファイルを作成していきましょう。
今回作成するリソースは以下です。

- ConfigMap: APIの設定情報
- Deployment: API(task-service)を実行するコンテナ
- Service: Deploymentで管理するPod群に対するエンドポイント
- Ingress: クラスタ外からAPIへのルーティングルール

なお、UIリソース(`web`ディレクトリ配下)については、ここではコンテナ化しませんでした。
もちろん、これについてもローカルのKubernetes上でコンテナとして動作させることができます。
しかし、UIは見た目や振る舞いを試すために、トライ&エラーのフィードバック速度が重要です。
一般的にUIフレームワーク(この場合はVue CLI)の開発支援機能にはこの辺りが備わっており、これを利用する方が開発効率が良い場合が多いです。[^9]。
このため、UIについてはここではVue CLIの開発支援機能を用いてKubernetesとは別プロセスで動作させます[^10]。

[^9]: Vue.jsに限らず昨今のUI向けのフレームワークはローカル向けの開発支援機能が完備されているため、これをそのまま利用した方が良いと思います。

[^10]: 商用環境においてもUIはコンテナ化せずに、CDNやホスティングサービス等を使うことの方が多いかと思います。

完成形のイメージは以下のようになります。

![](https://i.gyazo.com/6e46c73c6e74ea6f51191c23278055e8.png)

### ConfigMap

それでは、ConfigMapから作成しましょう。
`app/k8s/v1/task-service`を作成し、`configmap.yaml`を配置しましょう。
こちらはアプリケーションの設定を記述します。以下のようになります。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: task-service-config
data:
  STAGE: localstack
  NODE_ENV: development
  TZ: Asia/Tokyo
  TASK_TABLE_NAME: tasks
  AWS_ENDPOINT: http://localstack:4566
  AWS_DEFAULT_REGION: local
  AWS_ACCESS_KEY_ID: localstack
  AWS_SECRET_ACCESS_KEY: localstack
```

アプリケーションで利用するもののほかに、AWS関連の認証情報を設定しました。今回はLocalStackのためAWS認証情報はLocalStackの初期化スクリプトに合わせます(アクセスキー、シークレット等は任意の値で構いません)。
今回アプリケーションはNode.jsのため、これらを`process.env.xxxxxx`で参照できるようにしたいところですね。

### Deployment

続いてDeploymentの方に入ります。同ディレクトリ内に`deployment.yaml`を作成しましょう。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
spec:
  replicas: 2
  # ReplicaSetのラベルセレクター
  selector:
    matchLabels:
      app: task-service
  template:
    metadata:
      # Podのラベル
      labels:
        app: task-service
    spec:
      containers:
        - name: task-service
          # アプリケーションコンテナ
          image: task-service
          # LocalなのでImagePullはしない
          imagePullPolicy: Never
          # Podの公開ポート
          ports:
            - name: http
              containerPort: 3000
          # ConfigMapから環境変数を指定
          envFrom:
            - configMapRef:
                name: task-service-config
          # 各種ヘルスチェック
          readinessProbe:
            httpGet:
              port: 3000
              path: /health/readiness
          livenessProbe:
            httpGet:
              port: 3000
              path: /health/liveness
          startupProbe:
            httpGet:
              port: 3000
              path: /health/startup
```

重要な点については上記のコメントに記載していますが、2点着目してほしい部分があります。

1点目は`envFrom`の部分です。
LocalStackの初期化スクリプトは、ファイル自体をマウントしましたが、ここではConfigMapの内容をそのままコンテナの環境変数に取り込んでいます。
こうすることで、ConfigMapがそのままコンテナの環境変数として取り込むことができ、アプリケーション内では`process.env.STAGE`のようにしてConfigMapの内容を参照することが可能になります。
今回はConfigMap全てを取り込みましたが、以下のように個別の値としても環境変数に取り込むことが可能です。

```yaml
    spec:
      containers:
        - name: task-service
          # 省略
          env:
            - name: NODE_ENV
              valueFrom:
                configMapKeyRef:
                  name: task-service-config
                  key: NODE_ENV
```

2点目は`readinessProbe`/`livenessProbe`/`startupProbe`の部分です。
ReadinessProbeは[Service](/containers/k8s/tutorial/app/web-app/#service)のところで触れましたが、指定したヘルスチェックがしきい値(デフォルトは10秒間隔で3回)を超えて失敗すると、ルーティングルールより除外されます。
LivenessProbeの場合は、しきい値(デフォルトはReadinessProbeと同じ)を超えて失敗すると、コンテナが再起不能と判断されて再起動されます。

StartupProbeは比較的新しいもの(v1.18からデフォルト有効)で、起動の遅いアプリケーションの場合、起動前にLivenessProbeによる再起動ループが発生することがあります[^11]。
StartupProbeは起動時のみにチェックされ、これが成功した後で、ReadinessProbe/LivenessProbeの実行が開始されるため、このような状況を回避することができます[^12]。

これらのヘルスチェックはKubernetesを正しく運用する上でとても重要です。詳細は[公式ガイド](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)を参照してください。

[^11]: 以前は再起動ループに陥らないようにLivenessProbe/ReadinessProbeの`initialDelaySeconds`で調整していまいた。

[^12]: 今回作成したアプリケーションは高速に起動するため、StartupProbeは指定しなくても問題はありません。

### Service

そして次はServiceです。同ディレクトリ内に`service.yaml`を作成しましょう。
こちらは最もシンプルな最小構成になります。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: task-service
spec:
  selector:
    app: task-service
  ports:
    - port: 3000
      targetPort: http
```

ラベルセレクターで`app: task-service`とし、先程Deploymentで指定したPodのラベルと合わせます。
こうすることで、このServiceはDeploymentで作成された2つのPodに対して、負荷分散してトラフィックルーティングを行うようになります。

`ports`ではこのServiceが公開するポート番号を指定します。こちらはPodに合わせて3000番ポートを指定しました。
`targetPort`は`http`としています。ここにはPod側のポートを指定しますが、Deploymentで指定した`ports`の`name`を指定することもできます(Named Portと言われます)。
こうすることで、Serviceはルーティングする対象のポートの名前だけ知っていれば、具体的なポート番号は知る必要がなく、Podとの結合度を下げることができます。

### Ingress

最後にIngressで、クラスタ外部からのリクエストを受け付けるようにします。
`app/k8s/v1/ingress`を作成し、`ingress.yaml`を配置しましょう。
こちらも非常にシンプルです。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
spec:
  ingressClassName: nginx
  rules:
    - host: task.minikube.local
      http:
        paths:
          - backend:
              service:
                name: task-service
                port:
                  number: 3000
            path: /api
            pathType: Prefix
```

上記はminikubeを前提としているものです。
`http://task.minikube.local/api` へのアクセスについてAPIのServiceにルーティングするように指定しています。
Docker Desktopの場合は、localhostへのアクセスのため`host`部分を削除してください(任意のホスト名が許可されます)。

## アプリケーションのデプロイ

では、ここまで作成したら実際にローカル環境のKubernetesで動かしてみましょう。
今回は`kubectl apply`ではなくSkaffoldを使ってデプロイしましょう。

Skaffoldについては事前準備で[こちら](/containers/k8s/tutorial/app/skaffold/)でインストール済みかと思います。
[セットアップ時](/containers/k8s/tutorial/app/skaffold/#skaffold定義ファイルの作成)に実施したように、Skaffoldの初期化コマンドでskaffold.yamlを作成しましょう。
appディレクトリ上で以下を実行しましょう。

```shell
skaffold init --artifact=apis/task-service/Dockerfile.local=task-service \
  --kubernetes-manifest=k8s/v1/task-service/*.yaml \
  --kubernetes-manifest=k8s/v1/ingress/*.yaml \
  --force
```

実行が終わると、`app`直下に`skaffold.yaml`というファイルが作成されているはずです。
以下のような内容になります。

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
deploy:
  kubectl:
    manifests:
    - k8s/v1/task-service/*.yaml
    - k8s/v1/ingress/*.yaml
```

buildステージで`apis/task-service`配下のDockerfile.localからイメージをビルドし、deployステージでkubectlでマニフェストをKubernetesに適用するようになっていることが分かります。

今回はビルドスピードをあげるために`dockerfile`にローカル専用のDockerfileの`Dockerfile.local`を指定しています[^13]。

[^13]: 商用環境向けにはWebpackでのビルドを用意していますが、ローカル環境で都度実行するのは時間がかかるため、ts-nodeコマンドから実行しています。

実行する前に、事前に`app/apis/task-service`配下に移動して依存モジュールをインストールしてください。これらはコンテナビルド時にコピーされて再利用されます。

```shell
npm install
```

こちらをデプロイしましょう。`app`ディレクトリ直下に戻って、以下のSkaffoldコマンドを起動します。

```shell
skaffold dev
```

コンテナビルドとKubernetesへのデプロイが始まっていることが分かります。
コンソール上でデプロイが終わったことを確認したら、kubectlで実際にデプロイされたものを確認してみましょう。

```shell
kubectl get deploy,rs,pod,cm,svc,ing
```

以下関連のある部分のみ抜粋します。

```
NAME                           READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/task-service   2/2     2            2           2m7s

NAME                                      DESIRED   CURRENT   READY   AGE
replicaset.apps/task-service-6c897c899b   2         2         2       2m7s

NAME                                READY   STATUS    RESTARTS   AGE
pod/task-service-6c897c899b-5z5f4   1/1     Running   0          2m7s
pod/task-service-6c897c899b-qpqw5   1/1     Running   0          2m7s

NAME                                       DATA   AGE
configmap/task-service-config              8      2m7s

NAME                   TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                         AGE
service/task-service   ClusterIP   10.111.193.252   <none>        3000/TCP                        2m7s

NAME                                    CLASS   HOSTS                 ADDRESS     PORTS   AGE
ingress.networking.k8s.io/app-ingress   nginx   task.minikube.local   localhost   80      2m7s
```

Deploymentから2つのPodのレプリカが作成され、それをReplicaSet/Serviceのラベルセレクターにより管理されています。
ここでは実施しませんが、`kubectl describe`で各リソースの詳細が見れますので、実際に確認してみると良いでしょう。

別のターミナルを開き、以下のコマンドで確認しましょう。

```shell
# minikube
curl -v task.minikube.local/api/tasks?userName=test
# docker desktop
# curl -v localhost/api/tasks?userName=test
```

ここでは200レスポンスが返ってきていれば問題ありません。
このAPIは後続の作業でも引き続き使用しますのでこのままの状態にしておいてください(Ctrl+Cを押すとアンデプロイされてしまいます)。

## 動作確認

### UIリソース(web)

最後にUIを起動して、先程デプロイしたAPIに接続しましょう。
まずは、`web`ディレクトリに移動して関連モジュールをインストールしましょう。

```shell
# app/webディレクトリ直下
npm install
```

次にUIからAPIへのアクセス方法を確認します。
`web/vue.config.js`でUIからAPIへのアクセスのエンドポイントを指定する設定があります。
ここでminikubeの場合は、Ingressアドオンで指定したドメイン[^14]、Docker Desktopの場合は`localhost`を指定してください。

[^14]: minikubeの導入の[こちら](/containers/k8s/tutorial/app/minikube/#ingressアドオン有効化)で設定しているドメインです。

```js
module.exports = {
  devServer: {
    port: 8080,
    proxy: {
      "/api": {
        // for minikube
        target: "http://task.minikube.local",
        // for docker-desktop
        // target: "http://localhost",
        changeOrigin: true,
      },
    },
  },
};
```

最後に以下のコマンドを実行すれば、ローカル環境でUIを起動(開発モード)できます。

```shell
npm run serve
```

Vue.jsのリソースが開発モードでビルドされ、デフォルトの8080番ポートで公開されます(Ctrl+Cを押すと終了します)。
ブラウザから`http://localhost:8080`にアクセスしてUIが表示されることを確認しましょう。
表示されたら、任意のユーザー名を入力し、タスク管理ツールを起動し、タスクの登録、表示、完了更新ができれば動作確認は終了です。

![](https://i.gyazo.com/e5171c0ecd3f54217f0702553c4ceddf.gif)

この状態でUI/APIともにファイル変更監視がされていて、ソースコード修正をすると、すぐに実際のアプリケーションにも反映されます。
ここでは実施しませんが、実際にソースコードを変更し、変更内容が反映できることを確認してみてください。

また、kubectlで先程デプロイしたものを見ると、以下のようにRollingUpdateが実行されていることが確認できるはずです。

![](https://i.gyazo.com/2efcfd6cb386c6fb5daa20d267231da0.png)

## まとめ

ここでは、ローカル環境でKubernetesを起ち上げて、以下のことを実施してきました。

- 仮想のAWSリソースとしてLocalStack(DynamoDB)を使用
- タスク管理APIとしてDeployment/ConfigMap/Serviceを作成
- 外部からのAPIのルーティングにIngress作成(NGINX Ingress Controllerを利用)
- SkaffoldでKubernetesリソースをデプロイ
- Kubernetesとは別プロセスでUIを起動し、ブラウザから動作確認

また、Skaffoldにより、コンテナビルドやKubernetesマニフェストの反映が自動化されていることも確認しました。
クラウド環境がなくとも、ここまでのレベルでローカルでKubernetesの環境で開発ができることが実感できたかと思います。

次回は、引き続きバッチアプリケーションの作成に入っていきます。
