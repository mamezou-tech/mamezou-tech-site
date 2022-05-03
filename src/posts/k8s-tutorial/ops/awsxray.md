---
title: 分散トレーシング(OpenTelemetry / AWS X-Ray)
author: noboru-kudo
tags: [aws]
prevPage: ./src/posts/k8s-tutorial/ops/cloudwatch.md
nextPage: ./src/posts/k8s-tutorial/ops/velero-backup.md
date: 2022-05-03
---

[前回](/containers/k8s/tutorial/ops/jaeger/)は[OpenTelemetry](https://opentelemetry.io/)と[Jaeger](https://www.jaegertracing.io/)を使って、エンドツーエンドでトレース情報を収集・可視化をしました。
ここで利用したJaegerは分散トレーシングに特化したOSSプロダクトで高機能ではありますが、実際に運用する場合は、その構成を慎重に検討する必要があります。
例えば、以下の対応が必須で必要となるでしょう。

- UI認証基盤の構築または連携
- トレース情報を永続化するストレージの準備
- 高トラフィックに耐えるJaegerコンポーネントの構成

AWSには[X-Ray](https://aws.amazon.com/jp/xray/)という分散トレーシングに関するマネージドサービスがあります。
もちろん、その利用にはコストが発生しますが、上記の課題は考慮する必要がありません(裏側でAWSがやってくれます)。

今回はJaegerの部分をX-Rayに置き換えてみます。以下のような構成となります。

![](https://i.gyazo.com/acbe1588a70ab3a2d3fa26cd68d998b4.png)

前回の構成との違いはJaegerがAWS X-Rayに置き換わっただけです。 トレース情報の収集や転送に使うOpenTelemetryは同じものです。
OpenTelemetryは特定の製品に依存しない標準仕様ですので、バックエンドサービスの切り替えは非常に簡単です。

[[TOC]]

## 事前準備

アプリケーションは以下で実装したものを使います。事前にEKS環境を準備し、アプリケーションを用意しておきましょう。

- [クラスタ環境デプロイ - コンテナレジストリ(ECR)](/containers/k8s/tutorial/app/container-registry/)
- [クラスタ環境デプロイ - EKSクラスタ(AWS環境準備)](/containers/k8s/tutorial/app/eks-1/)
- [クラスタ環境デプロイ - EKSクラスタ(Kustomize導入)](/containers/k8s/tutorial/app/eks-2/)
- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/)

また、内容的に前回の続きになっています。OpenTelemetry導入やアプリケーションの修正は、以下を実施済みである方が理解しやすいと思います。

- [分散トレーシング(OpenTelemetry / Jaeger)](/containers/k8s/tutorial/ops/jaeger/)

前回実施済みの場合は、以下を実行してJaegerやOpenTelemetry Collectorを削除しておきましょう。

```shell
# Jaeger
kubectl delete jaeger jaeger -n tracing
# UI用のOpenTelemetry Collector
kubectl delete opentelemetrycollector otel-web -n tracing
# Jaeger Operator削除(OpenTelemetry Operatorは削除不要です) 
helm uninstall jaeger-operator -n tracing
```

## TLS証明書のセットアップ

今回トレース情報の可視化は、AWSのマネジメントコンソールを使いますが、ブラウザからトレース情報の転送はHTTPS通信で行うため、TLS証明書を発行する必要があります。
実施する内容はJaegerのときと全く同じです。以下を参照してください。

- [分散トレーシング(OpenTelemetry / Jaeger) - TLS証明書のセットアップ](/containers/k8s/tutorial/ops/jaeger/#tls証明書のセットアップcert-manager)

既に作成済みの場合は、このステップはスキップして構いません。

## AWS X-Rayのアクセス許可設定

今回トレース情報をAWSサービスのX-Rayに送りますので、OpenTelemetry Collector側に対してアクセス許可を設定する必要があります。

Terraformの設定ファイル`app/terraform/main.tf`で以下を修正します。

```hcl
# (既存)task-serviceのIAMロール
module "task_service" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                       = "~> 4.0"
  create_role                   = true
  role_path                     = "/app/"
  role_name                     = "TaskService"
  provider_url                  = var.oidc_provider_url
  # AWS X-Rayのトーレス情報送信ポリシーを追加
  role_policy_arns              = [aws_iam_policy.app_task_table.arn, data.aws_iam_policy.xray_write_access.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:${var.env}:task-service"]
}

# 以下は新規追加

# X-RayのAWSマネージドポリシー
data "aws_iam_policy" "xray_write_access" {
  name = "AWSXRayDaemonWriteAccess"
}

# ブラウザからのトレース情報を受取るOpenTelemetry CollectorのIAMロール
module "adot_xray_collector" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                       = "~> 4.0"
  create_role                   = true
  role_name                     = "ADOTXrayCollector"
  provider_url                  = var.oidc_provider_url
  role_policy_arns              = [data.aws_iam_policy.xray_write_access.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:tracing:otel-web-collector"]
}

resource "kubernetes_service_account" "otel_web_xray_collector" {
  metadata {
    name = "otel-web-collector"
    namespace = "tracing"
    annotations = {
      "eks.amazonaws.com/role-arn" = module.adot_xray_collector.iam_role_arn
    }
  }
}
```

以下のIAMロールに対して、AWSのマネージドポリシー(`AWSXRayDaemonWriteAccess`)を指定しています。

- サイドカーコンテナとしてデプロイされるtask-serviceのPod
- ブラウザからのトレース情報を収集するOpenTelemetry Collector

これをAWS/EKSに反映(`terraform apply`)します。こちらの実施内容は以下を参照してください。

- [クラスタ環境デプロイ - EKSクラスタ(AWS環境準備) - AWS/EKS反映](/containers/k8s/tutorial/app/eks-1/#aws-eks反映)

## OpenTelemetry Collectorインストール

トレース情報を収集し、X-Rayに転送するOpenTelemetry Collectorをインストールします。
注意点として、OpenTelemetry本体が提供するOpenTelemetry CollectorにはAWS X-RayのExporterは含まれていません。
AWS向けのOpenTelemetryのディストリビューションである[ADOT(AWS Distro for OpenTelemetry)](https://aws.amazon.com/otel)を使う必要があります。

### OpenTelemetry Operatorインストール

Jaegerのときと同様に[OpenTelemetry Operator](https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-operator)をインストールします。手順は全く同じです。
未セットアップの場合は以下を参照してください。
- [分散トレーシング(OpenTelemetry / Jaeger) - OpenTelemetry Operatorインストール](/containers/k8s/tutorial/ops/jaeger/#opentelemetry-operatorインストール)

### UIトレース情報収集

まずは、ブラウザからのトレース情報を収集するOpenTelemetry Collectorをセットアップします。
以下の内容で`otel-web.yaml`ファイルを作成します。

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: otel-web
  namespace: tracing
spec:
  # ADOTのイメージを利用(X-Ray Exporterが含まれる)
  image: public.ecr.aws/aws-observability/aws-otel-collector:v0.17.0
  mode: deployment
  serviceAccount: otel-web-collector
  config: |
    receivers:
      # https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
      otlp:
        protocols:
          http:
            cors:
              allowed_origins:
                # UIリソースのドメインからのアクセスのみを許可
                # ドメインは自身のものに置き換えてください
                - "https://task.mamezou-tech.com"
    processors:
    exporters:
      awsxray:
        region: ap-northeast-1
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: []
          exporters: [awsxray]
```
[前回](/containers/k8s/tutorial/ops/jaeger/#uiトレース情報収集)Jaegerのときに実施した内容と以下の点で異なります。

- `spec.image`: ADOTのイメージを指定します。これで、デフォルトのOpenTelemetry本体のCollectorではなく、ADOTが実行されるようになります。
- `spec.serviceAccount`: Terraformで作成したX-Rayへのトレース情報送信の許可があるServiceAccountを指定します。
- `config`: exporterとしてADOTに含まれるAWS X-Ray用のExporterを指定します。

AWS X-RayのExporterについての詳細は以下を参照してください。

- [Exporter: AWS X-Ray Exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awsxrayexporter)

これを反映します。

```shell
kubectl apply -f otel-web.yaml
```

作成したOpenTelemetry Collectorを確認します。

```shell
kubectl get deploy,svc,pod -n tracing -l app.kubernetes.io/name=otel-web-collector
```
```
NAME                                 READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/otel-web-collector   1/1     1            1           13s

NAME                                  TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)              AGE
service/otel-web-collector            ClusterIP   172.20.161.76   <none>        4318/TCP,55681/TCP   13s
service/otel-web-collector-headless   ClusterIP   None            <none>        4318/TCP,55681/TCP   13s

NAME                                      READY   STATUS    RESTARTS   AGE
pod/otel-web-collector-55df864d96-5f9pc   1/1     Running   0          12s
```

Deploymentリソースが作成され、OpenTelemetry Collectorが実行されています。
実行しているイメージについても見てみましょう。

```shell
kubectl get pod -o jsonpath='{.items[0].spec.containers[0].image}' \
  -n tracing -l app.kubernetes.io/name=otel-web-collector; echo 
```
```
public.ecr.aws/aws-observability/aws-otel-collector:v0.17.0
```

先程指定したADOTのコンテナが実行されていることが確認できます。

次にブラウザからトレース情報を受け付けるIngressです。こちらは前回と全く同じ内容になります。
既にIngressを作成済みの場合は同じものが利用可能です。
未作成の場合は、以下を参照し、Ingressリソースを作成してください。

- [分散トレーシング(OpenTelemetry / Jaeger) - UIトレース情報収集](/containers/k8s/tutorial/ops/jaeger/#uiトレース情報収集)

### APIトレース情報収集

次に、API(`task-service`)側のセットアップをします。
[前回](/containers/k8s/tutorial/ops/jaeger/#apiトレース情報収集)同様に、API側はサイドカーコンテナとしてデプロイします。

以下のファイルを`otel-sidecar.yaml`として作成します。

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: otel-sidecar
  namespace: prod
spec:
  image: public.ecr.aws/aws-observability/aws-otel-collector:v0.17.0
  mode: sidecar
  config: |
    receivers:
      otlp:
        protocols:
          grpc:
    processors:
    exporters:
      awsxray:
        region: ap-northeast-1
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: []
          exporters: [awsxray]
```

UI側と同じようにこちらも`image`はADOTのコンテナイメージを指定します。
ただし、サイドカーコンテナですので、ServiceAccountの指定は不要です(Podレベルで指定済み)。
UI側と同様に、`config`のExporterはAWS X-Rayを設定します。

こちらを反映します。

```shell
kubectl apply -f otel-sidecar.yaml
```

まだサイドカーコンテナを注入するためのPodを作成していないため、この状態では何も起きません。

## OpenTelemetryクライアントの修正(アプリケーション)

次にアプリケーション側の対応です。
こちらは[前回](/containers/k8s/tutorial/ops/jaeger/#opentelemetryクライアントのセットアップ)既にOpenTelemetryのSDKを組み込み済みです。
OpenTelemetryの原則でいうと、ここは修正不要なはずですが、残念ながら微調整が必要です。
AWS X-Rayは、ALBやApplication Gatewayで発行されるトレースID(HTTPヘッダ:`X-Amzn-Trace-Id`)を期待していますが、UI(ブラウザ)で発行するOpenTelemetry SDKのトレースIDはフォーマットが異なります。
これを解消するため、OpenTelemetryのSDKの拡張ポイントで、トレースIDのフォーマットをAWS準拠の形に変更します。

`app/web`配下で、以下のライブラリを追加インストールします。

```shell
npm install @opentelemetry/id-generator-aws-xray
```

次に、Vue.jsエントリーポイントの`app/web/src/main.ts`を以下のように修正します。

```typescript
import { AWSXRayIdGenerator } from "@opentelemetry/id-generator-aws-xray";

const provider = new WebTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "task-web",
    [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
  }),
  idGenerator: new AWSXRayIdGenerator(), // AWS X-RayフォーマットのIDを生成
});
// 以下省略
```

`idGenerator`で発行するIDがAWS X-Ray互換となるよう修正しました。
修正点はこれだけです。後はそのまま流用できます。

## コンテナビルドとアプリケーションのデプロイ

それでは、変更後のアプリケーションをビルドし、EKS環境にデプロイしましょう。
実施手順は前回と同じです。以下を参照してください。

- [アプリケーション開発編 - クラスタ環境デプロイ - コンテナレジストリ(ECR) イメージビルド/プッシュ](/containers/k8s/tutorial/app/container-registry/#イメージビルド-プッシュ)
- [分散トレーシング(OpenTelemetry / Jaeger)  - アプリケーションのデプロイ](/containers/k8s/tutorial/ops/jaeger/#アプリケーションのデプロイ)

前回アプリケーションをデプロイ済みの場合は、キャッシュが利用されないようビルド時のイメージタグを変更するか、マニフェストの`imagePullPolicy`を`Always`に変更してPodを再起動してください。

```shell
# task-web Pod再起動
kubectl rollout restart deploy/prod-task-web -n prod
```

デプロイが終わったら、ブラウザよりアプリケーションを操作してトレーシング情報を蓄積しておきましょう。

## トレーシングデータの確認

それではAWS X-Rayに送信したトレース情報を確認しましょう。
AWS マネジメントコンソールにログインし、AWS X-Rayのサービスメニューを表示します[^1]。

[^1]: 現在AWS X-RayはCloudWatchのメニューにも統合されていますので、こちらからでも参照できます。

サイドバーより`Service Map`をクリックします。
![service map](https://i.gyazo.com/4bc4338457b4c4b3e624fd2d2c76d7c3.png)

上部がブラウザのリソースフェッチ、下部がAjaxリクエストのトレース情報を可視化したものです。
ここではAjaxリクエストのパフォーマンス分析をしてみましょう。

サービスマップから下図のノード(①)をクリックします。スライドバーが表示され、レスポンス時間の分布図が確認できます。
さらに、スライドバーの`Analyze traces`(②)をクリックしましょう。
![](https://i.gyazo.com/108536ef9b5bb6a30faa6516427f1fd1.png)

少し長いですが、以下のようなトレース情報の集計ページが表示されます。
![](https://i.gyazo.com/281e714c63b5b0e69d11d9308aff1dea.jpg)

例えば、レスポンスタイムを見ると、DynamoDBへのアクセスが全体の73%を占めていることが分かります。
下部にある`トレースのリスト`から任意のトレース情報をクリックしてみましょう。

![](https://i.gyazo.com/6def0e9324052d7cb86f91aff7a8b74d.jpg)

Jaegerのように、タイムライン上でトランザクションの詳細な内訳が確認できます。
このようにService Mapで全体を俯瞰し、その集計結果、さらには任意のトレース情報の詳細までをドリルダウン形式で調査できます。
各トレースの詳細はセグメントをクリックするとメタ情報や注釈として確認できます。

## クリーンアップ

HelmでインストールしたOpenTelemetry Collector(Deployment)は、以下で削除します。

```shell
# Operatorで作成したリソース
kubectl delete -f otel-web-collector-ingress.yaml
kubectl delete -f otel-web.yaml
# Operator自体を削除 
helm uninstall otel-operator -n tracing
```

それ以外のリリース削除については、以下を参照してください。

- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/#クリーンアップ)

## まとめ

今回はJaegerをAWS X-Rayに置き換えて、エンドツーエンドのトレース情報の収集・可視化を行いました。
マネージドサービスを使うことで、複雑な構成を検討しなくとも、高機能なトレーシングツールが商用グレードで簡単に手に入れることができると実感できたと思います。
とはいえ、マネージドサービスの利用には、もちろんその対価を支払う必要はあります。高トラフィックが予想される環境では、必要に応じてトレース情報のサンプリングを調整するなどの対応が必要となってくることもあるでしょう[^2]。

[^2]: AWS X-Rayのデフォルトでは毎秒初回のリクエストと、それ以降は5%のレートでサンプリングされます。

また、標準仕様のOpenTelemetryのおかげで、クライアントコードをほとんど変更することなく、バックエンドサービスを変更できることが分かったと思います。
アプリケーション側ではAWS X-RayのSDKは一度も登場していません。
OpenTelemetryを利用することを前提としておけば、一旦Jaegerを使っておいて、スケーラビリティや運用に問題が発生するようになったらAWS X-Rayに切り替えるといったことも比較的容易にできます。
OpenTelemetryはトレーシングだけでなく、メトリクスにも使えるものです（まだGAではないですがログも対象）。 
クラウドベンダーやSaaSベンダー等多くのベンダーがOpenTelemetryをサポートしていますので、ベンダーロックインを避ける意味で、OpenTelemetryを組織標準としておくのが望ましいと思います。

---
参照資料

- [AWS X-Rayドキュメント](https://docs.aws.amazon.com/xray/latest/devguide/aws-xray.html)
- [AWS Distro for OpenTelemetry ドキュメント](https://aws-otel.github.io/docs/introduction)
- [OpenTelemetryドキュメント](https://opentelemetry.io/docs/)