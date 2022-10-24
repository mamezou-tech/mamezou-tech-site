---
title: Camunda Platform のモダンなプロセスオーケストレーター  Zeebe による開発環境を構築する
author: masahiro-kondo
tags: [k8s, container]
date: 2022-07-17
---

先日の、[Tauri のアプリケーション開発の記事](/blogs/2022/07/08/writing-app-with-tauri/)で BPMN モデリングのライブラリ bpmn.js を取り上げましたが、これは、Camunda というプロセスオーケストレーター製品を提供している会社の OSS でした。本記事では、Camunda のプロセスオーケストレーターのエンジンである Zeebe の概要と、ローカルの開発環境構築について記述します。

[[TOC]]

## Camunda プロセスオーケストレーター(Zeebe) 概要
[The Universal Process Orchestrator | Camunda](https://camunda.com/)

Camunda Platform は、Zeebe という BPMN 2.0 に対応したプロセスオーケストレーター(ワークフローエンジン)によって構築されています。

Zeebe は Java で書かれており、リモートのワーカーと gRPC で通信して一連のプロセスを処理します。Zeebe のクラスターは Kubernetes クラスター上にデプロイ可能で、高いスケーラビリティとスループットを実現しています。

[Zeebe | Camunda Platform 8](https://docs.camunda.io/docs/components/zeebe/zeebe-overview/)

[GitHub - camunda/zeebe: Distributed Workflow Engine for Microservices Orchestration](https://github.com/camunda/zeebe)

Camunda Platform では、Web 版とデスクトップ版の BPMN Modeler が提供されており、作成した BPMN モデルをデプロイして実行できます。

[Camunda Modeler - Design Business Processes and Decision Models](https://camunda.com/platform/modeler/)

SaaS として提供されている Camunda Platform では、さまざまな Connector を利用して、REST API やクラウドサービス、データレイクなどとの連携が可能となっています。

[Connectors &amp; Integration Framework | Camunda](https://camunda.com/platform/modeler/connectors/)

アーキテクチャドキュメントの図を引用します。

![](https://docs.camunda.io/assets/images/zeebe-architecture-67c608106ddc1c9eaa686a5a268887f9.png)

[Architecture | Camunda Platform 8](https://docs.camunda.io/docs/components/zeebe/technical-concepts/architecture/)

Zeebe クラスターは、複数の Broker と Gateway で構成されます。プロセスのタスクを実行するワーカーは Java や Go で記述可能で、gRPC で Zeebe-Gateway を通して Zeebe クラスター上のプロセスと通信します。

BPMN 2.0 対応を謳うだけあって、プロセスインスタンスを監視するダッシュボードも BPMN を表示するグラフィカルな UI になっています。

[Operate - Camunda](https://camunda.com/platform/operate/)

## Minikube での Camunda Platform のデプロイ
今回は SaaS 環境ではなく、ローカルの Minikube に Camunda の Helm chart を使って構築します。Zeebe だけでなく、Keycloak や Elasticsearch など多くのオブジェクトがデプロイされるため、メモリや CPU を多めに指定しないと Pod が起動しません。今回はメモリ8GB、CPU 4で構築しました。

```shell
minikube start --memory='8g' --cpus=4
```

Camunda Helm chart でデプロイされる構成図もドキュメントから引用します。

![](https://docs.camunda.io/assets/images/ccsm-helm-charts-24a6d36699c69792d48e53997dcc1d11.png)

[Camunda Helm charts | Camunda Platform 8](https://docs.camunda.io/docs/self-managed/platform-deployment/kubernetes-helm/)

Helm chart の README に従って設定します。

[camunda-platform-helm/charts/camunda-platform at main · camunda/camunda-platform-helm](https://github.com/camunda/camunda-platform-helm/tree/main/charts/camunda-platform)

以下のような YAML ファイルを values.yaml として作成しました。Zeebe、Zeebe-Gateway などの replicas を1にした上で、リソース要求を Helm chart のデフォルト設定よりかなり少なくしています。

```yaml
zeebe:
  clusterSize: "1"
  partitionCount: "1"
  replicationFactor: "1"
  resources:
    requests:
      cpu: 200m
      memory: 600Mi

zeebe-gateway:
  replicas: 1
  resources:
    requests:
      cpu: 100m
      memory: 256Mi

tasklist:
  resources:
    requests:
      cpu: 100m
      memory: 256Mi

optimize:
  resources:
    requests:
      cpu: 100m
      memory: 256Mi

elasticsearch:
  replicas: 1
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
```

camunda という namespace を作成し、上記の values.yaml を指定してインストールします。

```shell
helm repo add camunda https://helm.camunda.io
helm repo update
kubectl create ns camunda
helm install camunda-pf camunda/camunda-platform -n camunda -f values.yaml
```

以下のように出力されます。

```
NAME: camunda-pf
LAST DEPLOYED: Sat Jul 16 09:49:36 2022
NAMESPACE: camunda
STATUS: deployed
REVISION: 1
NOTES:
# (camunda-platform - 8.0.11)
   ___   _   __  __ _   _ _  _ ___   _     ___ _      _ _____ ___ ___  ___ __  __ 
  / __| /_\ |  \/  | | | | \| |   \ /_\   | _ \ |    /_\_   _| __/ _ \| _ \  \/  |
 | (__ / _ \| |\/| | |_| | .` | |) / _ \  |  _/ |__ / _ \| | | _| (_) |   / |\/| |
  \___/_/ \_\_|  |_|\___/|_|\_|___/_/ \_\ |_| |____/_/ \_\_| |_| \___/|_|_\_|  |_|
                                                                                 

## Installed Services:

- Zeebe:
  - Enabled: true
  - Docker Image used for Zeebe: camunda/zeebe:8.0.0
  - Zeebe Cluster Name: "camunda-pf-zeebe"
  - Prometheus ServiceMonitor Enabled: false
- Operate:
  - Enabled: true
  - Docker Image used for Operate: camunda/operate:8.0.0
- Tasklist:
  - Enabled: true
  - Docker Image used for Tasklist: camunda/tasklist:8.0.0
- Optimize:
  - Enabled: true
  - Docker Image used for Optimize: camunda/optimize:3.8.0
- Identity:
  - Enabled: true
  - Docker Image used for Identity: camunda/identity:8.0.0
  - Keycloak: bitnami/keycloak:16.1.1-debian-10-r52
- Elasticsearch:
  - Enabled: true
  - ElasticSearch URL: http://elasticsearch-master:9200

### Zeebe

The Cluster itself is not exposed as a service that means that you can use `kubectl port-forward` to access the Zeebe cluster from outside Kubernetes:

> kubectl port-forward svc/camunda-pf-zeebe-gateway 26500:26500 -n camunda

Now you can connect your workers and clients to `localhost:26500`

### Connecting to Web apps

As part of the Helm charts an ingress definition can be deployed, but you require to have an Ingress Controller for that Ingress to be Exposed.
In order to deploy the ingress manifest, set `<service>.ingress.enabled` to `true`. Example: `operate.ingress.enabled=true`

If you don't have an ingress controller you can use `kubectl port-forward` to access the deployed web application from outside the cluster:

Identity: kubectl port-forward svc/camunda-pf-identity 8080:80
Operate:  kubectl port-forward svc/camunda-pf-operate  8081:80
Tasklist: kubectl port-forward svc/camunda-pf-tasklist 8082:80
Optimize: kubectl port-forward svc/camunda-pf-optimize 8083:80

If you want to use different ports for the services, please adjust the related configs in the values file since these ports are used as redirect URL for Keycloak.

The authentication via Identity/Keycloak is enabled. In order to login into one of the services please port-forward to Keycloak
as well, otherwise a login will not be possible. Make sure you use `18080` as port.

> kubectl port-forward svc/camunda-pf-keycloak 18080:80

Now you can point your browser to one of the service's login page. Example: http://localhost:8081 for Operate.

Default user and password: "demo/demo"
```

PostgreSQL や Keycloak、Elasticsearch の Pod が正常に起動するまで10分ぐらい時間がかかりますが、無事起動しました。

```shell
kubectl get po -n camunda
```

```
NAME                                        READY   STATUS    RESTARTS        AGE
camunda-pf-identity-647f589df-njzgg         1/1     Running   5 (2m41s ago)   10m
camunda-pf-keycloak-0                       1/1     Running   0               10m
camunda-pf-operate-64bd9d4c4-zp7w2          1/1     Running   1 (5m20s ago)   10m
camunda-pf-optimize-9f4cbfb86-kpng9         1/1     Running   0               10m
camunda-pf-postgresql-0                     1/1     Running   0               10m
camunda-pf-tasklist-98844898c-qj6wg         1/1     Running   1 (5m48s ago)   10m
camunda-pf-zeebe-0                          1/1     Running   0               10m
camunda-pf-zeebe-gateway-64d9878ff6-bck4x   1/1     Running   0               10m
elasticsearch-master-0                      1/1     Running   0               10m
```
管理画面用の Identify / Operate / Tasklist / Optimize などの Pod も起動されています。

Camunda の Service を port-forward して、ブラウザから localhost で使えるようにします。

Identify 画面用。
```shell
kubectl port-forward svc/camunda-pf-identity 8080:80 -n camunda
```
Operate 画面用。
```shell
kubectl port-forward svc/camunda-pf-operate  8081:80 -n camunda
```
Tasklist 画面用。
```shell
kubectl port-forward svc/camunda-pf-tasklist 8082:80 -n camunda
```
Optimize 画面用。
```shell
kubectl port-forward svc/camunda-pf-optimize 8083:80 -n camunda
```
Keycloak 用。
```shell
kubectl port-forward svc/camunda-pf-keycloak 18080:80 -n camunda
```

さらに、client から Zeebe クラスターに接続するための Zeebe-Gateway 用。
```shell
kubectl port-forward svc/camunda-pf-zeebe-gateway 26500:26500 -n camunda
```

以上、6つの port-forward 用ターミナルが必要となります。

## Client 認証設定

Helm chart でインストールした環境には、demo ユーザーがあらかじめ登録されています(パスワードも demo)。この状態でも Web 画面にログインして操作したり、Camunda Modeler からモデルを登録したりすることは可能ですが、今回は CLI client を使って、BPMN の登録や実行、ワーカーの登録などを行いたいので、Keycloak で client 認証を有効化します。

Keycloak の管理者(admin)のパスワードは、以下のコマンドで namespace に登録された secret から取得できます。

```shell
kubectl -n camunda get secret camunda-pf-keycloak -o jsonpath="{.data.admin-password}" | base64 --decode
```

Keycloak の URL (http://localhost:18080) で上記のパスワードを使用して admin としてログインします。Relm `camunda-platform` に account という Client ID が登録されており、これに Camunda Platform を使用する権限が付与されています。

![](https://i.gyazo.com/756cc4aec24d697cb719349beabe2c9d.png)

インストール直後はこの client は無効になっているため、Edit ボタンをクリックして編集画面で有効にした上で以下も設定します。

- `Access Type` を `confidential`
- `Direct Access Grants Enabled` を ON
- `Service Accounts Enabled` を ON

![](https://i.gyazo.com/017bcf1ead648a51de20cdb69c6238f7.png)

以上で、Keycloak の設定は完了です。

## CLI client のインストールと設定

CLI client が提供されており、プロセスのデプロイや起動、ワーカーの登録ができます。簡単なワーカーの実装もライブラリを使ってコードを書かなくてもできます。

[CLI client | Camunda Platform 8](https://docs.camunda.io/docs/apis-clients/cli-client/)

zbctl という NPM パッケージになっていて、グローバルインストールして使用します。

```shell
npm i -g zbctl
```

zbctl を実行するのに、Minikube から port-forward しているポートや、Client ID、Client Secret を環境変数に登録します[^1]。

[^1]: 起動パラメータとしても渡せます

```shell
# Zeebe-Gateway のアドレス
export ZEEBE_ADDRESS='127.0.0.1:26500'
# Keycloak の Client ID
export ZEEBE_CLIENT_ID='account'
# Keycloak の account の Credentials タブで取得できる Secret
export ZEEBE_CLIENT_SECRET='MSDxVqT8x1TibgiPC6TtCEDVesiNL7V1'
# OIDC トークンを取得するエンドポイント (Keycloak の camunda-platform relm のものを指定)
export ZEEBE_AUTHORIZATION_SERVER_URL='http://localhost:18080/auth/realms/camunda-platform/protocol/openid-connect/token/'
```

zbctl で Zeebe クラスターの状態を取得します。TLS 設定をしていないため、`--insecure` オプションを指定しています。

```shell
zbctl status --insecure
```

うまくいけば、credentials の警告は出るものの、Zeebe クラスターの情報が出力されます。

```
2022/07/17 12:04:59 Warning: The configured security level does not guarantee that the credentials will be confidential. If this unintentional, please enable transport security.

Cluster size: 1
Partitions count: 1
Replication factor: 1
Gateway version: 8.0.0
Brokers:
  Broker 0 - camunda-pf-zeebe-0.camunda-pf-zeebe.camunda.svc:26501
    Version: 8.0.0
    Partition 1 : Leader, Healthy
```

## Camunda Modeler による BPMN 定義とデプロイ・実行

BPMN 定義の編集・デプロイ・実行ができる Modeler をダウンロードしてインストールします。

[Download Camunda Modeler: Automate business processes and decisions](https://camunda.com/download/modeler/)

![](https://i.gyazo.com/f3e7fb1a9db84fce1354939d2a94bf3e.png)

まず 簡単な BPMN 定義を作りました。アクティビティは、歯車のついた Service Task にして、Task definition の Type に文字列を入れる必要があります。

![](https://i.gyazo.com/7203c142f9e6483a039feb6cbe53bd74.png)

定義を作ってエラーが出なくなったら、ステータスバーの 🚀 をクリックして、Deploy します。Cluster endpoint は Zeebe-Gateway のホスト名とポートを指定します。

![](https://i.gyazo.com/d11ed8ba084279710c6a6f0fa7721abd.png)

Deploy が成功すると以下のようにバナーが出ます。

![](https://i.gyazo.com/24e1afa2f70ee61646f7d6aee95e6962.jpg)

▶ をクリックするとプロセスのインスタンスを起動できます。

![](https://i.gyazo.com/984a00ff24868983d4e29e9685885188.png)

起動が成功すると以下のようにバナーが出ます。

![](https://i.gyazo.com/a02695cfee5248d54798e2e2f556a86a.jpg)

Operate 画面で確認します。Operate 画面の URL (http://localhost:8081) に接続すると keycloak の認証画面にリダイレクトされますので、demo/demo でログインします。

![](https://i.gyazo.com/18d9ae749ec4efac3628edeeb2ce657e.png)

Operate 画面の Dashboard が表示されます。Modeler からデプロイして起動したプロセスが起動しているので、緑のバーをクリックします。

![](https://i.gyazo.com/3fa4322feb09790c87946a61dd3c895c.png)

起動中のプロセスの詳細が見えます。2つあるアクティビティの1つ目で待機状態になっています。

![](https://i.gyazo.com/766f9a8a16968a4ed74631745fcb9bbe.png)

以上のように、Modeler で作成したモデルをデプロイしてプロセスとして起動し、状態を監視できます。

## CLI client でワーカー登録、プロセスのデプロイ、実行

次に、CLI client を使って、以下を実施します。

- モデルファイルのデプロイ
- モデル内のアクティビティのタスクを実行するワーカーの作成と登録
- プロセスの実行

以下のドキュメントにある Getting started の手順です。

[CLI client - Getting started guide | Camunda Platform 8](https://docs.camunda.io/docs/1.3/apis-clients/cli-client/get-started/)

ドキュメントにリンクされている gettingstarted_quickstart_advanced.bpmn ファイルを使います。Ping という Service task の Task definition で type `test-worker` が指定されており、この名前のワーカーを登録することで、Ping アクティビティの処理を実行し、完了させることができます。後続の Return コンディションで、結果により分岐するフローになっています。

![](https://i.gyazo.com/4b60007ee3d1660293c55f1b26382df3.png)

:::info
gettingstarted_quickstart_advanced.bpmn ファイルの定義にはタイポがあって、デプロイエラーになりました。モデル上の Condition の名前が `Return` なのに、分岐条件の式が `=return="Pong"` のように先頭が小文字になっていたためのパースエラーでした。以下のスクリーンショットは修正したものです。

![](https://i.gyazo.com/e09a3c5d113864d397c1666446e49c01.png)
:::

今回は、CLI client でデプロイを実行します。

```shell
zbctl deploy --insecure resource gettingstarted_quickstart_advanced.bpmn
```

成功すると以下のような JSON が返却されます。

```
{
  "key":  "2251799813685261",
  "deployments":  [
    {
      "process":  {
        "bpmnProcessId":  "camunda-cloud-quick-start-advanced",
        "version":  1,
        "processDefinitionKey":  "2251799813685260",
        "resourceName":  "gettingstarted_quickstart_advanced.bpmn"
      }
    }
  ]
}
```

次に、Ping アクティビティ用のワーカー `test-worker` を作ります。CLI client では、ワーカー名とハンドラーを指定してワーカーを登録できます。ここでは、`Return` に `Pong` という値を設定した JSON を出力するシェルを書いています。

```shell
zbctl create --insecure worker test-worker --handler "echo {\"Return\":\"Pong\"}"
```

ワーカーは、待ち受け状態になります。次に、デプロイしたプロセスを起動します。

```shell
zbctl create --insecure instance camunda-cloud-quick-start-advanced
```

プロセス起動後しばらくすると test-worker のターミナルに、gRPC 通信のログが出力されます。

```
2022/07/17 13:25:53 Activated job 2251799813685295 with variables {}

2022/07/17 13:25:53 Handler completed job 2251799813685295 with variables {"Return":"Pong"}
```

Operate 画面で実行結果を確認すると、ワーカーの実行結果が "Pong" であったため、上側の分岐を辿ったことがわかります。

![](https://i.gyazo.com/146ad4ccbdcf8e214fe56a2f00b8e3d3.png)

次に、同じ名前でもう一つワーカーを登録します。"Pong" ではなく "..." を Return に設定するワーカーです。

```shell
zbctl create --insecure worker test-worker --handler "echo {\"Return\":\"...\"}"
```

そして、1秒間隔でプロセスを起動するシェルを実行し、適当なところで Ctrl + C で停止します。

```shell
while true; do zbctl create --insecure instance camunda-cloud-quick-start-advanced; sleep 1; done
```

Operate 画面で、立て続けに実行され完了したプロセスのリストが見えます。

![](https://i.gyazo.com/7f19d557af62f4938d2d5630e80d0eb4.png)

実行されたタイミングでは、`{"Return":"..."}` を出力するワーカーにタスクが割り当てられ、下側の分岐を辿るプロセスもあります。

![](https://i.gyazo.com/d91fc6234b97fdd2fc4e2085bc9e12b6.png)

このようにワーカーを冗長構成で配置して、多数のプロセスを捌くことができます。

今回は CLI client を使用しましたが、Camunda 公式では、Java と Go の client ライブラリが提供されており、Community ベースで JavaScript / Python / Rust など様々な言語の Client ライブラリが開発されています。

[Overview | Camunda Platform 8](https://docs.camunda.io/docs/apis-clients/community-clients/)

## まとめ
以上、Camunda のローカル環境を構築しました。Camunda の SaaS にサインアップすると、このような面倒な構築作業をスキップしてモデリングしたプロセスをデプロイ・実行できます。Modeler も Web 版が提供されているため、ローカルにインストールする必要はありません。

公式ドキュメントには、ローカルで構築した環境に対して zbctl を実行するための手順が書かれていないので、Keycloak の設定を覗いて少し試行錯誤が必要でした。認証さえ通ってしまえば快適に操作できます。

Camunda Platform には、DMN という意思決定エンジンもあり、これもグラフィカルなエディタで定義してデプロイできます。

[Create decision tables using DMN | Camunda Platform 8](https://docs.camunda.io/docs/guides/create-decision-tables-using-dmn/)

また、ワーカーが自動で実行するタスクではなく人が介在する Human Task もサポートされています。

[Getting started with Human Task Orchestration | Camunda Platform 8](https://docs.camunda.io/docs/guides/orchestrate-human-tasks/)

この手の製品は古くからあまたありましたが、Camunda はモダンなアーキテクチャとなっており、BPMN モデルがそのままプロセスとして動くということで、使いやすい印象を受けました。

BPM やマイクロサービスのオーケストレーターとして、有力な選択肢になりそうです。
