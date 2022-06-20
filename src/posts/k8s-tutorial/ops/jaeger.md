---
title: 分散トレーシング(OpenTelemetry / Jaeger)
author: noboru-kudo
tags: [tracing]
prevPage: ./src/posts/k8s-tutorial/ops/cloudwatch.md
date: 2022-04-21
---

今回はアプリケーションのパフォーマンスに焦点を当てます。
アプリケーションのパフォーマンスを分析するにはどうすれば良いでしょうか？

従来は処理時間等の情報をログに残し、これを集計することが多かったと思います。
単一サービスで構成されるシステムではこれで事足りることが多いですが、多数のサービスで構成されるマイクロサービスとなるとそうはいきません。
マイクロサービスのような分散アーキテクチャでは、1つのトランザクションが複数サービスを跨ることが多く、どのサービスでどれくらいのパフォーマンスが出ているかを可視化することが重要となります。

このような背景から、分散アーキテクチャ対応のトレーシングツールが普及するようになってきました。
一般的に分散トレーシングツールは、トレース情報をHTTPやDBアクセス等の構成要素(Span)のグラフ構造で保持し、これをタイムラインとして可視化する仕組みを持っています。
この可視化機能によって、トランザクション全体の俯瞰的なモニタリングが可能となり、ボトルネックの発見を容易にします。

以下のイメージは、分散トレーシングツールのJaegerのドキュメントから引用したものです。
![](https://i.gyazo.com/7afb122c2dae5bcaf23fb1d36e615548.png)

引用元: <https://www.jaegertracing.io/docs/1.33/architecture/#span>

今回はこの分散トレーシング環境を構築します。
分散トレーシングについても2部構成です。それぞれ以下の製品を導入します。

- [OpenTelemetry](https://opentelemetry.io/) / [Jaeger](https://www.jaegertracing.io/)
- [OpenTelemetry](https://opentelemetry.io/) / [AWS X-Ray](https://aws.amazon.com/jp/xray/)

まず初回はOpenTelemetry / Jaegerを使用します。
OpenTelemetryはメトリクスの回で紹介しています。

- [メトリクス収集・可視化 - OpenTelemetry / CloudWatch](/containers/k8s/tutorial/ops/opentelemetry/#opentelemetryとは？)

今回はOpenTelemetryをメトリクスではなく、トレース情報の収集手段として使用します。

もう1つのJaegerは、Uber社が開発した分散トレーシングツールのOSSです。CNCFのホスティングプロジェクトでしたが、現在はGraduatedステータスに昇格し、広く普及している製品の1つです。今回JaegerはOpenTelemetryで収集したトレース情報の蓄積と可視化ツールとして使用します。
最終的に以下の構成になります。

![jaeger summary](https://i.gyazo.com/93856542107ffc73184fd452f8fb8254.png)

ブラウザ上で動くUI(Vue.js)を起点とし、そのバックエンドのAPI(Node.js)、そして永続化レイヤーのDynamoDBまでのパフォーマンスを可視化します。
各コンポーネントにはOpenTelemetryのSDK(クライアントライブラリ)を組み込み、イベント発生時にOpenTelemetry Collector経由でJaegerにトレース情報を送信します。
最終的にはJaegerのUIを利用して、蓄積したトレース情報を可視化していきます。

[[TOC]]

## 事前準備

アプリケーションは以下で実装したものを使います。事前にEKS環境を準備し、アプリケーションのセットアップしておきましょう。

- [クラスタ環境デプロイ - コンテナレジストリ(ECR)](/containers/k8s/tutorial/app/container-registry/)
- [クラスタ環境デプロイ - EKSクラスタ(AWS環境準備)](/containers/k8s/tutorial/app/eks-1/)
- [クラスタ環境デプロイ - EKSクラスタ(Kustomize導入)](/containers/k8s/tutorial/app/eks-2/)
- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/)

なお、Jaeger自体はAWSに依存するものではありませんので、ローカル環境(minikube等)のKubernetesでも代用できます。

## TLS証明書のセットアップ(Cert Manager)

アプリケーション自体に加えて、以下のインターネット通信はHTTPS化します。

- Jaeger UI(トレース情報の可視化)
- UI(`task-web`)からトレース情報送信

これらのTLS証明書を発行するために、事前にCert ManagerのIssuerを用意します。
以下`tracing-tls-issuer.yaml`を作成します。

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: tracing-tls-issuer
  namespace: tracing
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: '<your-mail-address>'
    privateKeySecretRef:
      name: tracing-acme-client-letsencrypt
    solvers:
      - http01:
          ingress:
            class: nginx
```

`<your-mail-address>`の部分は、自身のアドレスに置き換えてください。
これを反映します。

```shell
kubectl create ns tracing
kubectl apply -f tracing-tls-issuer.yaml
```

実際のTLS証明書は、各Ingressリソース作成時にCert Managerによって自動発行されます。

:::info
ここではアプリケーションをHTTPSでセットアップ済みのため、トレーシング情報についてもHTTPS化する必要があります。
Minikube等のローカル環境で試す場合は、本手順は不要です。後続のTLS関連の設定も省略できます。
:::

## Jaeger Operatorのインストール

Jaegerをインストールします。Jaegerのインストールは[Jaeger Operator](https://github.com/jaegertracing/jaeger-operator)を使います。
[Helmチャート](https://github.com/jaegertracing/helm-charts/tree/main/charts/jaeger-operator)が用意されていますので、こちらを利用します。

まずは、Helmチャートのリポジトリを追加します。

```shell
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo update
```

helmコマンドでインストールします。ここでは`2.29.0`のバージョンを指定しました。

```shell
helm upgrade --install jaeger-operator jaegertracing/jaeger-operator \
  --version 2.29.0 \
  --namespace tracing \
  --set rbac.clusterRole=true \
  --wait
```

`tracing`Namespaceを作成し、その中にJaeger Operatorをインストールしました。
インストールしたものを確認します。

```shell
kubectl get pod -n tracing -l app.kubernetes.io/name=jaeger-operator
```
```
NAME                               READY   STATUS    RESTARTS   AGE
jaeger-operator-67f8dd68c9-bjjbq   1/1     Running   0          10m
```

1つのJaeger OperatorのPodが実行中です。
この状態では、まだOperatorのみでJaeger自体は実行していません。
これには、Jaeger OperatorのカスタムリソースのJaegerリソースを作成する必要があります。
以下のファイルを`jaeger.yaml`として作成します。

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger
  namespace: tracing
spec:
  strategy: allInOne # default
  storage:
    type: memory # default
  ingress:
    ingressClassName: nginx
    hosts:
      - jaeger.mamezou-tech.com
    tls:
      - hosts:
          - jaeger.mamezou-tech.com
        secretName: jaeger-cert
    annotations:
      external-dns.alpha.kubernetes.io/hostname: jaeger.mamezou-tech.com
      cert-manager.io/issuer: "tracing-tls-issuer"
```

ここではデフォルトの最小構成のJaegerをセットアップしています。

Jaeger OperatorはデフォルトでJaegerに加えて、トレース情報を可視化するUI向けのIngressも作成します。
先程Cert ManagerのIssuerを作成していますので、Ingressに必要なTLS設定やExternal DNS(DNSの自動構成)の設定を追加しています。
なお、ドメイン(上記の`mamezou-tech.com`)は、自身のドメインに置き換えてください。

Jaegerリソースの詳細は[公式ドキュメント](https://www.jaegertracing.io/docs/latest/operator/#understanding-custom-resource-definitions)を参照してください。

:::column:商用環境にJaegerを導入する場合
今回実行するJaegerは最もシンプルな構成です。
Jaegerの各コンポーネントを単一コンテナにまとめ(all-in-oneモード)、トレーシングデータの永続化もしていません(インメモリ)。
実運用でJaegerを実施する場合は、各コンポーネントの分離や[cassandra](https://cassandra.apache.org/_/index.html)/[Elasticsearch](https://www.elastic.co/elasticsearch/)による永続化ストレージを別途準備する必要があります。
詳細は、以下の公式ドキュメントを参照してください。

- [Deployment Strategies](https://www.jaegertracing.io/docs/1.33/operator/#deployment-strategies)
:::

では、JaegerをEKS内に作成しましょう。

```shell
kubectl apply -f jaeger.yaml
```

作成したリソースを確認します。

```shell
kubectl get pod -n tracing -l app.kubernetes.io/name=jaeger
```
```
NAME                      READY   STATUS    RESTARTS   AGE
jaeger-7d987d7488-x9mlx   1/1     Running   0          24m
```

Jaeger OperatorがJaegerリソース作成を検知し、Jaeger本体を作成しています。

では、JaegerのUIを見てみましょう。Jaegerリソース作成時にIngressについても作成済みです。
Jaegerリソースで指定したドメインにHTTPSでアクセスしてみましょう(上記では`https://jaeger.mamezou-tech.com/`)。

![jaeger top](https://i.gyazo.com/a4396d83123cb6527dbf3526bfa03c4c.png)

これがJaegerのUIになります。
DNS伝播やTLS証明書の作成にはタイムラグがありますので、接続できない場合は少し時間を置いてからアクセスしてみてください。

:::info
JaegerのUI自体に認証の仕組みはありませんので、実運用する際にはこの点を別途考慮する必要があります。
構成例として、Jaegerの公式ブログでKeycloakを使った認証が紹介されていますので、実際に導入する際は参考にしてください。

- [Protecting Jaeger UI with an OAuth sidecar Proxy](https://medium.com/jaegertracing/protecting-jaeger-ui-with-an-oauth-sidecar-proxy-34205cca4bb1)
:::

## OpenTelemetry Collectorインストール

ここではトレース情報を収集し、Jaegerに転送する[OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)を導入します。

### OpenTelemetry Operatorインストール

Jaeger同様にOpenTelemetry CollectorもOpenTelemetry Operatorが[Helmチャート](https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-operator)として用意されています。

Helmチャートのリポジトリを追加します。
```shell
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update
```

helmコマンドでインストールします。ここでは`0.6.6`のバージョンを指定しました。
```shell
helm upgrade otel-operator open-telemetry/opentelemetry-operator \
  --install --version 0.6.6 \
  --namespace tracing \
  --set installCRDs=true \
  --wait
```

こちらもインストール状況を確認します。

```shell
kubectl get pod -n tracing -l app.kubernetes.io/name=opentelemetry-operator
```
```
NAME                                                         READY   STATUS    RESTARTS   AGE
opentelemetry-operator-controller-manager-68f5b47944-qv47h   2/2     Running   0          60s
```

OpenTelemetry CollectorのOperatorが動作していることが確認できます。
Jaeger Operator同様にインストールしただけでは、何も動作しません。
OpenTelemetry Operatorインストール時に作成されるカスタムリソースのOpenTelemetryCollectorを作成します。
以降、UI/APIそれぞれでのリソースを作成していきます。

### UIトレース情報収集

ブラウザ上で動作しているVue.jsのUI(`task-web`)が送信するトレーシング情報の受け口を作成します。
以下のファイルを`otel-web.yaml`として作成します。

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: otel-web
  namespace: tracing
spec:
  mode: deployment # Deploymentリソースとして作成(デフォルト)
  config: |
    receivers:
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
      jaeger:
        # Jaeger CollectorのgRPCエンドポイント
        endpoint: jaeger-collector.tracing.svc.cluster.local:14250
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: []
          exporters: [jaeger]
```
`mode: deployment`(デフォルト)とし、DeploymentリソースとしてOpenTelemetry Collectorを作成します。
ReceiverとしてOTLP(OpenTelemetry Line Protocol)を指定します。また、ブラウザからの通信となりますので、HTTP経由でトレース情報を受け取れるようにしています[^2]。
ExporterとしてはJaegerを指定し、Jaeger CollectorのServiceリソースのgRPCエンドポイントに対してトレース情報を送信するようにします。

[^2]: トレース情報のエンドポイントが、UIのドメインと異なる(クロスドメイン)ため、CORSヘッダの設定が別途必要です。

使用しているReceiver/Exporterの詳細は、以下の公式リポジトリを参照してください。
- [Receiver: OpenTelemetry OTLP Receiver](https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver)
- [Exporter: Jaeger gRPC Exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/jaegerexporter)

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
deployment.apps/otel-web-collector   1/1     1            1           39m

NAME                                  TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)              AGE
service/otel-web-collector            ClusterIP   172.20.153.242   <none>        4318/TCP,55681/TCP   39m
service/otel-web-collector-headless   ClusterIP   None             <none>        4318/TCP,55681/TCP   39m

NAME                                      READY   STATUS    RESTARTS   AGE
pod/otel-web-collector-69c8d5d7f9-qqkgw   1/1     Running   0          39m
```

DeploymentオブジェクトとしてOpenTelemetry Collectorが作成され、1つのレプリカが実行されています。
また、アクセスポイントとしてServiceリソースが`ClusterIP`タイプで作成されています。

次に、ブラウザ側からこれに対してトレーシング情報を送信できるようにします。
Jaeger OperatorはIngressも作成してくれますが、OpenTelemetry Collectorは別途作成する必要があります。
以下のファイルを`otel-web-collector-ingress.yaml`として作成します。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: otel-web-collector
  namespace: tracing
  annotations:
    external-dns.alpha.kubernetes.io/hostname: otel.mamezou-tech.com
    cert-manager.io/issuer: "tracing-tls-issuer"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - otel.mamezou-tech.com
      secretName: tracing-cert
  rules:
    - host: otel.mamezou-tech.com
      http:
        paths:
          - backend:
              service:
                name: otel-web-collector
                port:
                  name: otlp-http
            path: /
            pathType: Prefix
```

先程同様に、ドメイン(`mamezou-tech.com`の部分)は、自身のドメインに置き換えてください。
`annotations`でDNSレコード同期(Route53)と、TLS証明書の発行を設定しています。
また、バックエンドには先程OpenTelemetry Operatorが生成したOpenTelemetry CollectorのServiceリソースを指定します。

これを適用します。

```shell
kubectl apply -f otel-web-collector-ingress.yaml
```

curlでネットワーク疎通しておきましょう。

```shell
# ドメインは自身のドメインに置き換えてください。
curl -v https://otel.mamezou-tech.com/v1/traces -d '{}'
```

200レスポンスが返ってくれば問題ありません。接続エラーが発生する場合は、少し時間を置いてから確認してください。それでも接続できない場合はCert Manager または External DNSの状態を確認してください。

これで、UI(ブラウザ)からのトレース情報をIngress経由で収集し、Jaegerに転送できるようになりました。

### APIトレース情報収集

次に、API(`task-service`)側のセットアップをします。
こちらはKubernetesのPodとしてデプロイされますので、OpenTelemetry Operatorのサイドカーモードが使用できます。
これを使うと、Pod側にサイドカーコンテナを指定しなくても、Operatorが自動でサイドカーコンテナとしてOpenTelemetry Collectorを追加します。

これに対応するOpenTelemetryCollectorリソースを追加で作成しましょう。
以下のファイルを`otel-sidecar.yaml`として作成します。

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: otel-sidecar
  namespace: prod
spec:
  mode: sidecar
  config: |
    receivers:
      otlp:
        protocols:
          grpc:
    processors:
    exporters:
      logging:
      jaeger:
        # Jaeger CollectorのgRPCエンドポイント
        endpoint: jaeger-collector.tracing.svc.cluster.local:14250
        tls:
          insecure: true
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: []
          exporters: [logging, jaeger]
```

先程はブラウザからのトレース情報を受け取るため、OTLPのReceiverのプロトコルはHTTPとしましたが、今回はKubernetes内での通信となりますので、パフォーマンスに優れるgRPCを指定しました[^3]。
Exporterについては先程と同じくJaegerのgRPCエンドポイントを指定します。

[^3]: エンドポイントを指定していませんので、Receiverのデフォルト`0.0.0.0:4317`が利用されます。サイドカーコンテナでは、アプリケーションと同じネットワーク空間を共有するのでこれで問題ありません。

こちらもクラスタに反映します。

```shell
kubectl apply -f otel-sidecar.yaml
```

先程は適用する(`kubectl apply`)とDeploymentリソースが作成されましたが、今回はまだPodを作成していないためこの状態では何も起きません。

## OpenTelemetryクライアントのセットアップ

アプリケーションにトレース情報を出力するOpenTelemetryのクライアントライブラリ(SDK)を組み込んでいきます。

Jaeger自体にもOpenTracing由来のクライアントライブラリはありますが、OpenTracingの後継であるOpenTelemetryの方で代用可能となったことから現在は非推奨となっています。

### UI

UI(`task-web`)でトレース情報を送信するようにOpenTelemetryのSDKを組み込みます。
`app/web`配下で以下のライブラリをインストールします。

```shell
npm install @opentelemetry/api \
  @opentelemetry/sdk-trace-web \
  @opentelemetry/instrumentation-document-load \
  @opentelemetry/context-zone \
  @opentelemetry/instrumentation-xml-http-request \
  @opentelemetry/exporter-trace-otlp-http
```

メインとなるのは以下の自動構成ライブラリです。ライブラリによってトレース情報の収集ポイントが変わってきます。

- [@opentelemetry/instrumentation-document-load](https://www.npmjs.com/package/@opentelemetry/instrumentation-document-load): Webリソース取得
- [@opentelemetry/instrumentation-xml-http-request](https://www.npmjs.com/package/@opentelemetry/instrumentation-xml-http-request): Ajax通信

Vue.jsエントリーポイントの`app/web/src/main.ts`に以下を追記します。

```typescript
const provider = new WebTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "task-web",
    [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
  })
});
const exporter = new OTLPTraceExporter({
  url: "https://otel.mamezou-tech.com/v1/traces",
})
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register({
  contextManager: new ZoneContextManager(),
});

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new XMLHttpRequestInstrumentation({}),
  ],
});
```

WebTracerProviderでOpenTelemetryのProviderを作成し、自動構成ライブラリとして先程の2つのライブラリを登録しています(`registerInstrumentations`)。

また、トレース情報の出力先(OTLPTraceExporter)として、先程作成したOpenTelemetry CollectorのIngressのURLを指定します。
なお、エンドポイントのドメインは自身で設定したIngressのドメインを指定してください。
ドメインは以下でも取得できます。

```shell
kubectl get ing otel-web-collector -o jsonpath='{.spec.rules[0].host}'
```

### API

次にAPI側にOpenTelemetry SDKを組み込みます。
`app/apis/task-service`配下で、以下のライブラリをインストールします。

```shell
npm install @opentelemetry/sdk-trace-node \
  @opentelemetry/instrumentation-winston \
  @opentelemetry/instrumentation-http \
  @opentelemetry/instrumentation-express \
  @opentelemetry/instrumentation-aws-sdk \
  @opentelemetry/exporter-trace-otlp-grpc
```

今回メインとなるのは以下の自動構成ライブラリです。

- [instrumentation-http](https://www.npmjs.com/package/instrumentation-http): HTTP通信
- [instrumentation-express](https://www.npmjs.com/package/@opentelemetry/instrumentation-express) : Expressフレームワークのライフサイクル
- [instrumentation-aws-sdk](https://www.npmjs.com/package/@opentelemetry/instrumentation-aws-sdk) : AWS SDKの呼び出し

なお、[@opentelemetry/instrumentation-winston](https://www.npmjs.com/package/@opentelemetry/instrumentation-winston)は、トレース情報を収集するものではなく、WinstonのログにトレースIDやスパンIDを埋め込んでくれる自動構成ライブラリです。

エントリーポイントの`app/apis/task-service/src/index.ts`の最初に、SDKのセットアップ処理を追加します。

```typescript
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { AwsInstrumentation } from "@opentelemetry/instrumentation-aws-sdk";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "task-service",
    [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
  })
});

provider.register();
registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation({
      ignoreIncomingPaths: ["/health/liveness", "/health/readiness"]
    }),
    new ExpressInstrumentation(),
    new AwsInstrumentation(),
    new WinstonInstrumentation() // ログにトレース識別子を注入
  ]
});
const exporter = new OTLPTraceExporter();
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => provider.shutdown().catch(console.error));
});
```

先程UI側で追加した内容と大きく変わることはありません。
`registerInstrumentations`で自動構成ライブラリを追加し、トレース情報をOTLP(OTLPTraceExporter)に送信します。
先程と違い、出力先URLを指定していません。この場合はデフォルトではローカル環境のエンドポイントが指定されます。
今回APIはサイドカーコンテナのOpenTelemetry Collectorとネットワーク空間を共有するため、デフォルト値で問題ありません。

## コンテナイメージビルド＆プッシュ

アプリケーションを変更したので、アプリケーションを再ビルドして、ECRにプッシュしておきましょう。

詳細は以下を参照しくてださい。

- [アプリケーション開発編 - クラスタ環境デプロイ - コンテナレジストリ(ECR) イメージビルド/プッシュ](/containers/k8s/tutorial/app/container-registry/#イメージビルド-プッシュ)

## アプリケーションのデプロイ

それでは、OpenTelemetry SDKを組み込んだアプリケーションをEKS環境にデプロイしましょう。

その前に、一部マニフェストファイルの修正が必要です。
API側のOpenTelemetry Collectorのサイドカーコンテナは、OpenTelemetry OperatorによってPod作成時に注入されます。
しかし、このままではOperatorはどのPodにサイドカーコンテナを注入すれば良いのか分かりません。
これを示すために、指定されたアノテーションをPodに対して指定する必要があります。

- [OpenTelemetry Operator Helm Chart - Sidecar Mode](https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-operator#sidecar-mode)

Kustomizeのパッチファイル`overlays/prod/patches/task-service/deployment.patch.yaml`に以下を追加します。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
spec:
  replicas: 3
  template:
    metadata:
      # Jaeger OperatorによるサイドカーInjection有効化
      annotations:
        sidecar.opentelemetry.io/inject: "true"
      # (以下省略)
```

これでアプリケーションをデプロイします。
デプロイ手順の詳細は以下を参照してください。

- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/#eks環境にデプロイ)

:::info
既にアプリケーションをデプロイ済みの場合は、タグを変更するか`imagePullPolicy`を`Always`に変更してください。
:::

デプロイが終わったら、API(`task-service`)にサイドカーが追加されていることを確認します。

```shell
kubectl get pod -n prod -l app=task-service
```
```
NAME                                 READY   STATUS    RESTARTS   AGE
prod-task-service-5796ff6d76-hhc2b   2/2     Running   0          83s
prod-task-service-5796ff6d76-jxwbp   2/2     Running   0          104s
prod-task-service-5796ff6d76-s7grw   2/2     Running   0          63s
```

READYが`2/2`となっており、アプリケーションに加えて、もう1つコンテナが実行しています。
任意のPodのサイドカーコンテナの詳細を確認してみましょう。

```shell
kubectl describe pod prod-task-service-5796ff6d76-hhc2b
```

以下サイドカー部分のみ抜粋します。
```
Containers:
  task-service:
   # 省略
  otc-container:
    Container ID:  docker://b3078c6966ddb98eb2f69f1bed5a61ad07de1fc898c80cf8b5649994e62e69e8
    Image:         ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector:0.46.0
    Image ID:      docker-pullable://ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector@sha256:47fedfc96be4a064b0dd2508ba2726a5981b708de3958c397cfdf4c3073592ba
    Port:          <none>
    Host Port:     <none>
    Args:
      --config=/conf/collector.yaml
    State:          Running
      Started:      Thu, 21 Apr 2022 10:37:14 +0900
    Ready:          True
    Restart Count:  0
    Environment:
      POD_NAME:                     prod-task-service-5796ff6d76-hhc2b (v1:metadata.name)
      AWS_DEFAULT_REGION:           ap-northeast-1
      AWS_REGION:                   ap-northeast-1
      AWS_ROLE_ARN:                 arn:aws:iam::446197467950:role/app/TaskService
      AWS_WEB_IDENTITY_TOKEN_FILE:  /var/run/secrets/eks.amazonaws.com/serviceaccount/token
    Mounts:
      /conf from otc-internal (rw)
      /var/run/secrets/eks.amazonaws.com/serviceaccount from aws-iam-token (ro)
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-4zr8g (ro)
```

このようにOpenTelemetry Operatorのサイドカーモードは、特定のアノテーションが付与されたPodの生成を検知すると、その中にOpenTelemetry Collectorをサイドカーコンテナとして注入してくれます。
このため、Podのテンプレートをアプリケーションのみのシンプルな構成に保つことができます。

後続作業のため、ブラウザよりアプリケーションを操作してトレーシング情報を蓄積しておきましょう。
このときChromeのDevツールのNetworkタブを見ると、OpenTelemetryのクライアントライブラリがトレース情報を送信していることを確認できます。
![](https://i.gyazo.com/203ceb5ce15035d9c39cb51843564d1d.png)

## トレーシングデータの確認

それでは、JaegerのUIでトレース情報を可視化してみましょう。
再度JaegerのUIを見ると、今度はServiceの選択肢に、`task-web`と`task-service`が表示されています[^1]。

[^1]: `jaeger-query`はJaeger自体のトレース情報です。

![service](https://i.gyazo.com/143424443e4d06c3c9bc1d1413e81160.png)

今回はUIを起点としてエンドツーエンドでトレース情報を可視化します。`task-web`を選択し、`Find Traces`をクリックします。
以下のようにUIのトレース情報が表示されます。

![task-web traces](https://i.gyazo.com/2e2a435fd4a17fb624c84a7e9af179a8.png)

UI側に追加したOpenTelemetryの自動構成ライブラリ別にトレース情報を見てみましょう。

### ① Webリソース取得(instrumentation-document-load)
![instrumentation-document-load](https://i.gyazo.com/268cfb1cc2d8b7d0dc22222767b7a679.png)

Webページを構成する各リソースのフェッチにかかっている時間を確認できます。 
表示が遅い場合のパフォーマンス調査に効果を発揮できることが分かります。

### ② Ajax通信(instrumentation-xml-http-request)
![instrumentation-xml-http-request](https://i.gyazo.com/405020f716032d7c325a4834798e2d09.png)

今回はUI(`task-web`)だけでなく、API(`task-service`)側のトレース情報も表示されています。
これは、OpenTelemetryの各ライブラリがサービス連携時にトレースIDを伝播しているからです。
これにより、1つのトランザクション内で複数サービスを跨っても、同一タイムラインで可視化できます。

後半のAPI(`task-service`)を見ると自動構成ライブラリとして組み込んだExpressやAWS SDKの呼び出しのパフォーマンスも詳細に確認できます。
特にAWS SDK呼び出しではDynamoDBのクエリまで出力されており、パフォーマンス調査に大きな効果を発揮できそうです。

## クリーンアップ

HelmでインストールしたOpenTelemetry Collector(Deployment)とJaegerは、以下で削除します。

```shell
# Operatorで作成したリソース
kubectl delete jaeger jaeger -n tracing
kubectl delete -f otel-web-collector-ingress.yaml
kubectl delete opentelemetrycollector otel-web -n tracing
# Operator自体を削除 
helm uninstall otel-operator -n tracing
helm uninstall jaeger-operator -n tracing
```

それ以外のリリース削除については、以下を参照してください。

- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/#クリーンアップ)

## まとめ

ここではOpenTelemetryによってエンドツーエンドでトレース情報を収集し、それをJaegerで可視化しました。
サービスを跨った一連のトランザクションがタイムラインとして表示されるため、パフォーマンス分析に非常に有用なことが分かったと思います。

今回トレース情報を出力するよう各種クライアントライブラリを組み込んでいきましたが、Istio等のサービスメッシュを導入するというやり方もあります。
サービスメッシュの適用範囲に限定はされますが、これを導入するとアプリケーション側に一切手を入れずに、自動的にトレース情報を取得できます。
このため、トレーシングを導入する場合は、サービスメッシュも併せて検討すると良いでしょう（製品によって異なりますが、サービスメッシュの機能自体はトレーシング以外にも多数あります）。

---
参照資料

- [Jaegerドキュメント](https://www.jaegertracing.io/docs/)
- [OpenTelemetryドキュメント](https://opentelemetry.io/docs/)