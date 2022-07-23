---
title: メトリクス収集・可視化 - Prometheus / Grafana
author: noboru-kudo
tags: [metrics]
prevPage: ./src/posts/k8s-tutorial/ops/scheduling.md
nextPage: ./src/posts/k8s-tutorial/ops/opentelemetry.md
date: 2022-03-17
---
今回のテーマはモニタリングです。
アプリケーションの運用が開始されると、ピーク時間帯や各種イベントに応じてシステム負荷は大きく変動します。
特に、マイクロサービスアーキテクチャでは、臨機応変なスケーラビリティや、無駄なのないリソース効率性とそれに応じたコスト最適化が求められます。
このような状況下では、各サービスレベルできめ細かい情報を収集・可視化することがより重要となります。

モニタリング編では、以下の項目に焦点を当て、それぞれハンズオン形式で実施してみたいと思います。

- メトリクス：リソース使用率等の各種メトリクス収集と可視化
- ロギング：各サービスのログを一元管理・検索
- トレーシング：サービス間のリクエスト/イベントのパフォーマンス測定

まずはメトリクスです。
メトリクスは、Kubernetesだと、[Prometheus](https://prometheus.io/)を思い浮かべる方が多いかと思います。
Prometheusは、分散アーキテクチャに対応するモニタリングツールとして人気を博し、コンテナ型システムでは定番といえるツールです。
ただ、Prometheus以外にもDatadog、New Relic、クラウドプロバイダーのマネージドサービス等、モニタリングツールは数多く存在します。各ツールは独自プロトコルを採用していることが多く、昨今はその互換性について意識されるようになってきました。
ここで登場するのが[OpenTelemetry](https://opentelemetry.io/)です。
OpenTelemetryは、メトリクスやトレーシングで標準化を目指していた[OpenTracing](https://opentracing.io/)と[OpenCensus](https://opencensus.io/)を統合する形で誕生した総合的なメトリクスの仕様で、2021/5にv1.0がリリースされました。
現在OpenTelemetryは、[CNCF(Cloud Native Computing Foundation)](https://www.cncf.io/)のIncubatingプロジェクト[^1]としてホスティングされており、各SaaS/クラウドベンダーを巻き込んで、各種実装やディストリビューションが開発されています。

[^1]: PrometheusもCNCFのホスティングプロジェクトでしたが、その成熟度からKubernetesに次いでGraduatedステータスとなりました。

ここでは、成熟した域に達しているPrometheusと、OpenTelemetryを利用したメトリクス収集と可視化について、2回に分けて実施していきます。
なお、OpenTelemetryについては、現状アクティブに開発が進められている点もあり、実際に採用する際は最新の状況を確認することをお勧めします。

[[TOC]]

## 事前準備
まずはAWS EKS環境を準備してください。ただし、Prometheus自体はAWSに依存するものではありませんので、ローカル環境や他のクラウド環境でも同様のことは可能です。

- [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl/)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform/)

また、アプリケーションは以下で使用したものを使います。

- [クラスタ環境デプロイ - コンテナレジストリ(ECR)](/containers/k8s/tutorial/app/container-registry/)
- [クラスタ環境デプロイ - EKSクラスタ(AWS環境準備)](/containers/k8s/tutorial/app/eks-1/)
- [クラスタ環境デプロイ - EKSクラスタ(Kustomize導入)](/containers/k8s/tutorial/app/eks-2/)
- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/)

## Prometheus、Grafanaのインストール

では、Prometheus/Grafanaをセットアップしましょう。
Prometheus単体でも可視化ツールは付属していますが、ここではよりリッチなUI/UXを提供するGrafanaも合わせてインストールします。
両ツールをKubernetes Operatorとして管理する[kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)がPrometheusコミュニティで提供されていますので、今回はそちらを利用します[^2]。

[^2]: 類似のものとして、他にも[kube-prometheus](https://github.com/prometheus-operator/kube-prometheus)がありますが、現時点では開発中のステータスで安定していません。

まず、Helmチャートのリポジトリを追加します。

```shell
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

kube-prometheus-stackを以下のコマンドでインストールします。現時点で最新の`33.2.0`のHelmチャートを利用するように指定しました。

```shell
helm upgrade kube-prometheus-stack prometheus-community/kube-prometheus-stack \
    --install --version 33.2.0 \
    --namespace prometheus --create-namespace \
    --set grafana.ingress.enabled=true \
    --set grafana.ingress.ingressClassName=nginx \
    --wait
```

今回はインストール時に、Grafana向けにIngressをセットアップしました。

インストールしたものの状態を確認してみましょう。

```shell
kubectl get pod -n prometheus
```

```
NAME                                                       READY   STATUS    RESTARTS   AGE
alertmanager-kube-prometheus-stack-alertmanager-0          2/2     Running   0          34s
kube-prometheus-stack-grafana-78f99bc987-r6nvc             3/3     Running   0          43s
kube-prometheus-stack-kube-state-metrics-d699cc95f-dlbwf   1/1     Running   0          43s
kube-prometheus-stack-operator-6b5bf9c455-rw9rl            1/1     Running   0          43s
kube-prometheus-stack-prometheus-node-exporter-qhrng       1/1     Running   0          43s
kube-prometheus-stack-prometheus-node-exporter-sg6q7       1/1     Running   0          43s
prometheus-kube-prometheus-stack-prometheus-0              1/2     Running   0          34s
```

`prometheus`NamespaceにPrometheus関連の各コンポーネントと、可視化ツールのGrafanaが実行されています。

## Kubernetesメトリクス収集・可視化

kube-prometheus-stackでは、デフォルトでデータソース(=Prometheus)の設定に加えて、Kubernetesのコンテナ関連のメトリクス収集やGrafanaのダッシュボードがセットアップされています。
したがって、インストールした時点で既に各種メトリクス収集が始まり、Grafanaダッシュボードをメトリクスを確認できます。

まず、Grafanaのエンドポイントを確認しましょう。

```shell
kubectl get ingress kube-prometheus-stack-grafana -n prometheus \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'; echo
```

今回はGrafanaのIngressのカスタムドメインやHTTPS化はしていませんので、ブラウザから出力されたURL(AWS ELBアドレス)にアクセスしましょう[^3]。

[^3]: もちろん実運用する場合は、カスタムドメインの設定とHTTPS化は必須になるでしょう。

![grafana-login](https://i.gyazo.com/9193c6bcd0b5afbe3030d6a7eafdf648.png)

ログインページが表示されたら、ユーザーIDとパスワードを入力します。
今回は初期状態のデフォルトのユーザーID`admin`を利用します。パスワードは以下より取得できます[^4]。

[^4]: Grafanaの認証機能は様々なプロトコルに対応しています。詳細は[公式ドキュメント](https://grafana.com/docs/grafana/latest/auth/)を確認してください。

```shell
kubectl get secret kube-prometheus-stack-grafana -n prometheus \
  -o jsonpath='{.data.admin-password}' | base64 --decode; echo
```

Prometheus/Grafanaともに、ゼロからメトリクス収集やダッシュボード設定をするのはそれなりに学習が必要です。
しかし、前述の通り、kube-prometheus-stackにはデフォルトでKubernetes関連のメトリクス収集・可視化の設定が施されています。
ここでは、デフォルトで収集されているKubernetes関連のメトリクスの一部を確認してみましょう。

ログイン後にサイドバーの虫眼鏡アイコンをクリックします。
ダッシュボード検索ページの`General`フォルダ内に、デフォルトでセットアップ済みのダッシュボードが確認できます。

![grafana-dashboards](https://i.gyazo.com/84ab7f754d5fe12aecc0acda621a7d08.png)

任意のダッシュボードを選択して、ダッシュボードを表示してみましょう。
例えば、`Kubernetes / Compute Resource / Cluster`を選択すると、以下のようなダッシュボードが表示されます。

![dashboard-sample](https://i.gyazo.com/f047625b9e57980e20fc8917d2485bc2.png)

クラスタ全体やPodレベルのリソース使用率が、一目瞭然で分かります。

## Prometheusクライアントのセットアップ

今までいわゆるインフラレベルのメトリクスをダッシュボード化したものを見てきましたが、アプリケーションレベルのメトリクスも収集・可視化してみましょう。

今回メトリクス収集の対象として、Node.js+Expressで実装しているREST APIサービスである`task-service`を対象にアプリケーションメトリクスを収集します。

Node.jsの場合は、Prometheusクライアントとして[prom-client](https://github.com/siimon/prom-client)を利用すると、アプリケーションのカスタムメトリクスをPrometheusに送ることができます。
これ単体で実装することもできますが、今回は自動でNode.jsのメトリクスを生成し、エンドポイントを公開する[prometheus-api-metrics](https://www.npmjs.com/package/prometheus-api-metrics)を使用します。

`app/apis/task-service`配下で、prometheus-api-metricsをインストールします。

```shell
npm install prometheus-api-metrics
```

後は、エントリーポイントの`index.ts`でセットアップ用のコードを追加するだけです。

関連部分のみ抜粋します。

```typescript
import apiMetrics from 'prometheus-api-metrics';

const app = express();
app.use(express.json());
// Express appに登録
app.use(apiMetrics())
```

これだけで、Prometheus向けのメトリクス収集エンドポイントが`/metrics`で公開されます[^5]。

[^5]: PrometheusはPULL型のメトリクス収集を採用していますので、Prometheus側から定期的にメトリクスを取りに来ます。PUSH型の場合はアプリケーション側からメトリクスをモニタリングツールに送ります。

実際にこのエンドポイントにアクセスしてみると、以下のようなPrometheusフォーマットでNode.jsのメトリクスが取得できます。

```
# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 0.575932

# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds.
# TYPE process_cpu_system_seconds_total counter
process_cpu_system_seconds_total 0.146791

# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total 0.722723

# 中略

# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.001",method="GET",route="/health/readiness",code="200"} 0
http_request_duration_seconds_bucket{le="0.005",method="GET",route="/health/readiness",code="200"} 0
http_request_duration_seconds_bucket{le="0.015",method="GET",route="/health/readiness",code="200"} 1
http_request_duration_seconds_bucket{le="0.05",method="GET",route="/health/readiness",code="200"} 1
http_request_duration_seconds_bucket{le="0.1",method="GET",route="/health/readiness",code="200"} 1
http_request_duration_seconds_bucket{le="0.2",method="GET",route="/health/readiness",code="200"} 1
http_request_duration_seconds_bucket{le="0.3",method="GET",route="/health/readiness",code="200"} 1
http_request_duration_seconds_bucket{le="0.4",method="GET",route="/health/readiness",code="200"} 1
http_request_duration_seconds_bucket{le="0.5",method="GET",route="/health/readiness",code="200"} 1
http_request_duration_seconds_bucket{le="+Inf",method="GET",route="/health/readiness",code="200"} 1
http_request_duration_seconds_sum{method="GET",route="/health/readiness",code="200"} 0.009539549
http_request_duration_seconds_count{method="GET",route="/health/readiness",code="200"} 1

# 以下省略
```

CPU時間等の基本的な情報からレスポンスタイムまで、様々なアプリケーションメトリクスが取得できることが分かります。
メトリクスのフォーマットについては、Prometheusの[公式ドキュメント](https://prometheus.io/docs/concepts/data_model/)を参照してください。

これでコンテナイメージをビルドし、コンテナレジストリにプッシュし、kubectlでアプリケーションをデプロイします。

```shell
# PROJECT_ROOTにはリポジトリルートを設定してください
cd ${PROJECT_ROOT}/app/apis/task-service
docker build -t <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.0.0 .
docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.0.0
# デプロイ
kubectl apply -f ${PROJECT_ROOT}/k8s/v3/overlays/prod
# アプリケーション状態確認
kubectl get pod -n prod
```

:::info
既にアプリケーションをデプロイ済みの場合は、以下のいずれかの方法でアプリケーションを更新してください。
- 別タグ(`2.0.0`等)でイメージをビルド/プッシュ後に、`kustomization.yaml`の`images`のタグを更新して再デプロイ。
  - スケジュールされたノードに旧バージョンのイメージがキャッシュ済みの場合は、キャッシュが使用されてアプリケーションは更新されません。
- 同一タグのイメージをビルド/プッシュ後に、`task-service`Deploymentの`imagePullPolicy`を`Always`に変更して、Podを再起動(`kubectl rollout restart deploy prod-task-service`)。
:::

:::info
prometheus-api-metricsは、デフォルトでpackage.jsonからバージョン情報をメトリクスとして取得していますので、イメージ内にpackage.jsonを含める必要があります。
ここでは、task-serviceのDockerfileに以下を追加しました。
```dockerfile
COPY --from=builder /src/package.json ./
```
:::

アプリケーションのセットアップはこれで完了です。

## アプリケーションメトリクス収集・可視化

Prometheusがこのメトリクスを収集するためには、Prometheus Operatorのカスタムリソース`ServiceMonitor`を作成する必要があります。
このマニフェストファイルを作成しましょう(ここでは`service-monitor.yaml`とします)。

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: task-service-monitor
  namespace: prod
  labels:
    release: kube-prometheus-stack
spec:
  endpoints:
    - path: /metrics
      targetPort: http
      interval: 30s
  selector:
    matchLabels:
      app: task-service
```

注意点としては`labels`です。デフォルトではPrometheus Operatorはこのラベルがつけられたものをメトリクス収集対象として認識しますので、これがないとメトリクスは収集されません。

それ以外は`endpoints`でアプリケーション側のメトリクス収集のエンドポイントを指定し、`selector`で収集対象のServiceオブジェクトのラベルを指定しています。
これでPrometheusはService経由で`/metrics`のエンドポイントから、30秒間隔でメトリクスを収集するようになります。

こちらを反映します。

```shell
kubectl apply -f service-monitor.yaml
```

このリソースが反映されるとPrometheus Operatorは実際のPrometheusの設定ファイルを更新します。どのように更新されたか見てみましょう。

```shell
PROM_POD=$(kubectl get -n prometheus pod -l app.kubernetes.io/name=prometheus -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n prometheus -it $PROM_POD -c prometheus -- cat /etc/prometheus/config_out/prometheus.env.yaml
```

以下関連部分を抜粋します。

```
scrape_configs:
  - job_name: serviceMonitor/prod/task-service-monitor/0
    honor_labels: false
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
            - prod
    scrape_interval: 30s
    metrics_path: /metrics
    relabel_configs:
      - source_labels:
          - job
        target_label: __tmp_prometheus_job_name
      - action: keep
        source_labels:
          - __meta_kubernetes_service_label_app
          - __meta_kubernetes_service_labelpresent_app
        regex: (task-service);true
# 以下省略
```

Service Monitorの設定内容が、Prometheusの設定ファイルとして反映されていることが分かります。
設定ファイルの内容詳細については、Prometheusの[公式ドキュメント](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)を参照してください。

これで、Prometheusがアプリケーション(prometheus-api-metrics)のメトリクスを収集しているはずです。

次に、Grafanaでこのメトリクス用のダッシュボードを作成し、メトリクスを可視化しましょう。
Grafanaには各ユースケースに応じたダッシュボードが有志により公開されており、これをそのまま利用またはカスタマイズすることでダッシュボード作成の手間を大幅に軽減できます。

- <https://grafana.com/grafana/dashboards/>

prometheus-api-metrics向けのダッシュボードも公開されていますので、今回はこれを利用しましょう。

- <https://grafana.com/grafana/dashboards/12230>

![Node.js Dashboard](https://i.gyazo.com/1d30e31a44ba9e22c05656359c330c70.png)

使い方は簡単です。上記のダッシュボードに付与されているIDをもとにダッシュボードをインポートするだけです。
Grafana UIのサイドバーからCreate -> Importを選択します。

![Grafana Menu](https://i.gyazo.com/a29dc9911ba4dede6ba2ff7dc515ceb1.png)

ダッシュボードのIDを入力し、Loadをクリックします。
![Grafana Load](https://i.gyazo.com/e48dd003157230f8b31010b9154e5cdc.png)

netdataにでPrometheusを選択し、Importをクリックすれば完成です(Name等は必要に応じて変更してください)。

![Grafana Import](https://i.gyazo.com/b364fb2adca7b5d4fdde2dd151f543c5.png)

次のようなダッシュボードが表示され、アプリケーションのメトリクスが表示されているはずです。

![task-service dashboard](https://i.gyazo.com/8b13aafbb3a17f22d6b0a9cce6bf357e.png)

セットアップコードを除き、アプリケーションのロジックに手を入れることなく、アプリケーションメトリクスを収集、可視化できました。

ここでは実施しませんが、実際のプロジェクトでは、アプリケーションの特性にあったカスタムメトリクス収集やダッシュボード作成が必要なってくることも多いでしょう。
もちろんこれについても、PrometheusとGrafanaで対応可能です。

これには、アプリケーション内でカスタムメトリクスをPrometheusに公開し、Grafanaで可視化する必要があります。
アプリケーション側では、Prometheusのクライアントライブラリの[prom-client](https://github.com/siimon/prom-client)[^6]がありますので、これを利用してメトリクスの生成をします。これでメトリクスエンドポイントにカスタムメトリクスが追加で公開されます。

[^6]: prom-clientは今回導入したprometheus-api-metricsにも依存関係として含まれています。詳細はprometheus-api-metricsの[公式ドキュメント](https://www.npmjs.com/package/prometheus-api-metrics#custom-metrics)を参照してください。

後は、Grafanaの方で、Prometheusクエリ言語の[PromQL](https://prometheus.io/docs/prometheus/latest/querying/basics/)を使ってメトリクスを取得すれば、Grafanaの豊富な可視化機能を利用できます。
ダッシュボードで利用可能なパネルや作成方法は、以下公式ドキュメントを参照してください。

- [Grafana - About Grafana panels](https://grafana.com/docs/grafana/latest/panels/)
- [Grafana - Visualization panels](https://grafana.com/docs/grafana/latest/visualizations/)

また、Grafanaの公式ドキュメントにダッシュボード作成ポリシーや成熟度レベルについて言及されていますので、こちらを合わせて参考にすると良いでしょう。

- [Best Practice(Grafana)](https://grafana.com/docs/grafana/latest/best-practices/)

## クリーンアップ

kube-prometheus-stackはhelmコマンドでアンインストールしてください。

```shell
helm uninstall kube-prometheus-stack -n prometheus
```

それ以外のリリース削除については、以下を参照してください。

- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/#クリーンアップ)


## まとめ

今回はPrometheusとGrafanaという鉄板の組み合わせで、メトリクス収集と可視化を行いました。
kube-prometheus-stackが必要な初期設定をあらかじめしてくれますので、簡単にリッチなUIが作成できるということが分かったと思います。

Prometheus自体は可視化やアラートだけではなく、[オートスケーリング - Horizontal Pod Autoscaler(HPA)](/containers/k8s/tutorial/ops/hpa/)でも触れたように、オートスケールのメトリクスとしても利用可能です。
これをうまく使うことで、より利用するシステムの特性に適したスケーラビリティを手に入れることができるはずです。

また、ここでは触れませんでしたが、AWSはマネージドサービスとしてのPrometheusやGrafanaも提供しています。
- <https://aws.amazon.com/jp/prometheus/>
- <https://aws.amazon.com/jp/grafana/>

こちらを採用する場合は、マネージドサービスで得られる可用性に加えて、サービス課金を自前で構築する場合の運用コストと比較して決定すると良いでしょう。
個人的な感覚ですが、近年はKubernetes Operatorの普及に伴って安定した運用が可能となり、両者に大きな差はなくなってきたのではと感じます。
一度自前で運用してみてから、マネージドサービスに切り替えるかを判断するのも良いと思います。
なお、Prometheusのマネージドサービスは、メトリクス量に応じて課金されますので、切替える場合は必要なメトリクスを絞るなどの工夫も必要になってくるでしょう。

---
参考資料

- [Prometheusドキュメント](https://prometheus.io/docs/introduction/overview/)
- [Grafanaドキュメント](https://grafana.com/docs/grafana/latest/)