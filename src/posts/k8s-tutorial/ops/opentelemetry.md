---
title: メトリクス収集・可視化 - OpenTelemetry / CloudWatch
author: noboru-kudo
prevPage: ./src/posts/k8s-tutorial/ops/prometheus.md
date: 2022-03-24
---

[前回](/containers/k8s/tutorial/ops/prometheus)はPrometheusとGrafanaを利用して、Kubernetesおよびアプリケーションに関するメトリクスの収集・可視化を行いました。
今回は[OpenTelemetry](https://opentelemetry.io/)と[CloudWatch](https://aws.amazon.com/jp/cloudwatch/)を使って同じことをしてみましょう。

[[TOC]]

## OpenTelemetryとは？
OpenTelemetryはメトリクス、トレース、ログ等のテレメトリー[^1]情報のやりとりに関するインターフェースを規定する仕様です(現状はログはまだドラフトです)。
OpenTelemetryには言語非依存のAPIに加えて、各言語に特化したSDK、プロトコル(OTLP:OpenTelemetry Line Protocol)が含まれています。

詳細な仕様や現在のステータスについては、[公式ドキュメント](https://opentelemetry.io/docs/reference/specification/)を確認してください。

また、必須ではありませんがOpenTelemetryのテレメトリー情報収集には、ベンダー中立のCollectorと呼ばれる仕組みを利用することが推奨されています。
CollectorはReceiver / Processor / Exporterの3つのコンポーネントで構成されます。

[^1]: OpenTelemetryの仕様では収集対象のメトリクスやトレース、ログのことを`Signals`と呼んでいますが、ここではOpenTelemetryの名前からテレメトリーと訳します。

以下は、OpenTelemetry公式サイトに掲載されているCollectorのパイプラインイメージです。
![OpenTelemetry Collector Pipeline](https://i.gyazo.com/0454384c2b94f87d72dfef0c5fbad10f.png)
引用元：<https://opentelemetry.io/docs/collector/>

1. Receiver: OTLPの他、PrometheusやJaeger等の任意フォーマットのテレメトリー情報を取り込む
1. Processor: データのフィルタリングや変換等を行う（任意）
1. Exporter: Prometheus、Datadog等のバックエンドにテレメトリー情報を送信する

これらはプラグイン形式となっており、利用するツールにあったものを組み合わせてパイプラインを構成できます。

また、OpenTelemetryエコシステムでは、知名度のあるフレームワークやツールに対応したReceiver/Exporterや自動構成ライブラリ(auto-instrumentation)等が提供されてます。
OpenTelemetry導入を検討する際は、まず以下を参照して、対応しているものがあるかを確認すると良いでしょう。

- <https://opentelemetry.io/registry/>

ベンダーサポート状況は以下より確認できます。主要なクラウド・SaaSベンダーがOpenTelemetryをサポートしていることが分かります。

- <https://opentelemetry.io/vendors/>

## AWS Distro for OpenTelemetry(ADOT)の紹介

AWSでは、AWS環境での利用に特化したOpenTelemetryのディストリビューションとして[AWS Distro for OpenTelemetry](https://aws-otel.github.io/)(以下ADOT)を無償提供しています。
ADOTの実態は、AWS環境に必要な設定やコンポーネントをセットアップしたOpenTelemetry Collectorのカスタマイズバージョンです。
これを利用することで、EKS、ECSからLambda、EC2までの各種メトリクスを、様々なバックエンドサービス(CloudWatch、AWS X-Ray、Prometheus等)に送信できます。

- [公式ホームページ](https://aws-otel.github.io)
- [GitHubリポジトリ](https://github.com/aws-observability/aws-otel-collector)

ADOTに組み込まれているコンポーネントは、GitHubリポジトリのREADMEファイルより確認できます。

- [ADOT Collector Built-in Components](https://github.com/aws-observability/aws-otel-collector#adot-collector-built-in-components)

それでは、ADOTを使ってメトリクスを収集・可視化してみましょう。
なお、今回はメトリクス収集・可視化のバックエンドサービスには、AWSのマネージドサービスである[CloudWatch](https://aws.amazon.com/jp/cloudwatch/)を使います。

## 事前準備
前回の続きになります。必要な環境(EKS/アプリ等)については以下を参照してください。

- [メトリクス収集・可視化 - Prometheus / Grafana](/containers/k8s/tutorial/ops/prometheus)

今回はバックエンドサービスとしてPrometheusは利用しませんので、以下のコマンドでPrometheusとGrafanaはアンインストールしておきましょう。

```shell
helm uninstall kube-prometheus-stack -n prometheus
```

## アクセス許可ポリシー作成(Kubernetesメトリクス向け)

まずは、Kubernetesメトリクスを収集する設定をします。
これには、ADOTがメトリクス収集のためにKubernetesのNodeであるEC2や、メトリクス送信先であるCloudWatchにアクセスできる必要があります。
必要なIAMポリシーは、AWSのマネージドポリシーであるCloudWatchAgentServerPolicyが用意されていますので、改めて作成する必要はありません。

Terraform設定ファイルの`app/terraform/main.tf`に以下を追記します。

```hcl
module "adot_collector" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                       = "~> 4.0"
  create_role                   = true
  role_name                     = "ADOTCollector"
  provider_url                  = var.oidc_provider_url
  role_policy_arns              = ["arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"] # AWS managed policy
  oidc_fully_qualified_subjects = ["system:serviceaccount:amzn-cloudwatch-metrics:adot-collector"]
}
```

まず、IAMロール(`ADOTCollector`)を作成し、これにAWSマネージドポリシーのCloudWatchAgentServerPolicyを紐付けます。

これをTerraformでAWS環境に反映(`terraform apply`)しておきましょう。反映の仕方は以下を参照しくてださい。

- [クラスタ環境デプロイ - EKSクラスタ(AWS環境準備) - AWS/EKS反映](/containers/k8s/tutorial/app/eks-1/#aws-eks反映)

## ADOT DaemonSetのセットアップ

それではまず、ADOTはKubernetesのメトリクス収集用のために、ADOTのDaemonSetをセットアップしましょう。
AWSからADOTの[Helmチャート](https://github.com/aws-observability/aws-otel-helm-charts)が公開されていますので、こちらを利用します。
まずは、いつものようにHelmチャートのリポジトリを追加します。

```shell
helm repo add aws-otel https://aws-observability.github.io/aws-otel-helm-charts
helm repo update
```

helmコマンドでインストールします。ここでは現時点で最新の`0.1.0`を指定しました。

```shell
helm upgrade aws-otel-ds aws-otel/adot-exporter-for-eks-on-ec2 \
    --install --version 0.1.0 \
    --namespace kube-system \
    --set adotCollector.daemonSet.serviceAccount.name=adot-collector \
    --set clusterName=mz-k8s \
    --set awsRegion=ap-northeast-1 \
    --set fluentbit.enabled=false \
    --wait
```
`clusterName`/`awsRegion`の各パラメータは、自身の環境に合ったものを指定してください。
また、今回ログ収集はスコープ外としていますので、FluentBitも無効にしています(`fluentbit.enabled=false`)。

ここで、インストールされたADOT Collectorを修正します。これは、Helmチャートの`0.1.0`のテンプレートには設定不備や機能不足があるためです。
まず、作成されたClusterRoleの参照リソース名が不正になっています。これを正しい値に修正ます。

```shell
kubectl patch clusterrole adot-collector-role --type=json \
  -p '[{"op": "replace", "path": "/rules/5/resourceNames/0", "value": "otel-container-insight-clusterleader"}]'
```

次に、作成されたDaemonSetのServiceAccountに、Terraformで作成したIAMロールを紐付けます。
これは、Helmチャート`0.1.0`ではインストール時にServiceAccountのannotationsを指定できないためです。

```shell
# AWSアカウントIDは自身のものに置き換えてください
kubectl patch sa adot-collector -n amzn-cloudwatch-metrics \
  -p '{"metadata": {"annotations": {"eks.amazonaws.com/role-arn": "arn:aws:iam::<aws-account-id>:role/ADOTCollector"}}}'
```

変更が終わったら、IRSA(IAM Role for ServiceAccount)を有効にするため、一度Podを再起動します。

```shell
kubectl rollout restart ds adot-collector-daemonset -n amzn-cloudwatch-metrics
```

:::alert
今回インストール後に各種変更をしていますが、望ましいやり方ではありません。
既にHelmチャートのソースコード上では修正版がマージされており、次のリリースバージョンでは`helm upgrade/install`で対応可能となる見込みです。
このようにOpenTelemetryエコシステムは、まだ安定していないプロダクトが多く、ソースコードやIssueの確認が欠かせないところが難点です。
:::

以下を実行して、Podの状態を確認しましょう。

```shell
kubectl get pod -n amzn-cloudwatch-metrics
```
```
NAME                             READY   STATUS    RESTARTS   AGE
adot-collector-daemonset-47qfb   1/1     Running   0          1h12m
adot-collector-daemonset-mdd9d   1/1     Running   0          1h12m
```

ここでは、ADOT CollectorをDaemonSetとして導入していますので、クラスタのノード数と同じ数のPodが起動していることを確認します（上記は2ノード構成のため2レプリカとなっています）。

また、Podのログも確認し(`kubectl logs`)、エラーがないことも確認しておきましょう。

:::info
ここではEC2上に構築したEKSを対象としていますが、2022/2/17よりFargateサポートが追加されています。
Fargateを使ってEKSを構築している場合は、以下を参照してください。

- <https://aws-otel.github.io/docs/getting-started/container-insights/eks-fargate>
:::

## Kubernetesメトリクス可視化

これでDaemonSetとしてデプロイしたADOT CollectorがKubernetesクラスタのメトリクスの収集を開始しているはずです。
しばらく時間を置いてから、AWSマネジメントコンソールを確認してみましょう。
サービスとしてCloudWatchを選択し、サイドメニューより`インサイト -> Container Insights`と進みます。

![container-insights resources](https://i.gyazo.com/7555bbb364a0bfdfa02918136a7e9e8d.png)

Kubernetesリソースの一覧が表示され、コンテナの平均CPUや平均メモリ使用率が確認できます。
任意のリソースを選択すると、以下のように各メトリクスがグラフ表示されます。

![](https://i.gyazo.com/e856dd6abf08a975b50d6b2de3a55b6f.png)

これらはPod単位だけでなく、ServiceやNode単位でも参照できます。
また、プルダウンメニューから`コンテナマップ`を選択すると、以下のようにリソース間の関連性を可視化できます。

![](https://i.gyazo.com/ac3cc0c82dca3471963ef8873db096c7.png)

これで満たせない場合は、カスタムクエリを使うことで様々な角度からメトリクスを分析できます。
この場合は、サイドメニューより`ログ -> ログのインサイト`へ進み、ロググループ`aws/containerinsights/<cluster-name>/performance`を選択して、任意のクエリを記述します。
以下は1時間ごとのNodeのCPU使用率を表示する例です。

![cloudwatch log insights](https://i.gyazo.com/9a26028bb0f090770926f86e50aae9ba.png)

クエリのシンタックスや利用可能なメトリクスは、以下のAWS公式ドキュメントを参照してください。

- [CloudWatch Logs Insights query syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)
- [Amazon EKS and Kubernetes Container Insights metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-EKS.html)

なお、クエリ作成の際は、実際のログ出力内容からメトリクス(JSONフォーマット)を見ながら作成すると効率的です。

:::info
現時点ではプレビュー版(2021/11/29公開)ですが、CloudWatchのメトリクスインサイトでもクエリを作成できます。

- [Introducing Amazon CloudWatch Metrics Insights (Preview)](https://aws.amazon.com/about-aws/whats-new/2021/11/amazon-cloudwatch-metrics-insights-preview/)

この場合は、多くの人に馴染みのあるSQL構文に準じたクエリ言語を記述します。
詳細は[公式ドキュメント](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/query_with_cloudwatch-metrics-insights.html)を参照してください。
:::

このように、Grafanaと比較すると見た目は劣りますが、CloudWatchでも十分に実用的と言えるレベルになっていることが分かります。

## アクセス許可ポリシー作成(アプリケーションメトリクス向け)
ここまででインフラレイヤーのメトリクス収集と可視化を実践してきました。ここからはアプリケーションレイヤーについても対応していきましょう。

アプリケーションメトリクスの収集についても、チューニングが必要ですが先程のDaemonSetを利用可能です。
しかし、ADOTの公式ドキュメントによると、DaemonSetではなく、フル機能をサポートするサイドカーコンテナによるデプロイが推奨されています。

- [AWS Distro for OpenTelemetry Collector Deployment Types](https://aws-otel.github.io/docs/getting-started/collector/sidecar-vs-service)

これに従い、アプリケーションPodのサイドカーコンテナとして別途ADOTを導入しましょう。

まず、サイドカーコンテナ用に別途アクセス許可を設定する必要があります。
今回はNode(EC2)へのアクセスは不要で、CloudWatchへのメトリクス送信のみがあれば問題ありません。必要なポリシーファイルはGitHubの[こちら](https://raw.githubusercontent.com/mamezou-tech/k8s-tutorial/main/ops/otel/otel-collector-policy.json)に用意しました。
このファイルを`app/terraform`に配置してください(`otel-collector-policy.json`としました)。

```shell
curl -o otel-collector-policy.json \
  https://raw.githubusercontent.com/mamezou-tech/k8s-tutorial/main/ops/otel/otel-collector-policy.json
```

次に、先程同様に`app/terraform/main.tf`を修正します。

```hcl
# サイドカーコンテナ用のポリシー作成
resource "aws_iam_policy" "eks_aodt_collector" {
  name   = "EKSADOTCollector"
  policy = file("${path.module}/otel-collector-policy.json")
}

# 以下は修正(role_policy_arnsに上記ポリシーを追加)
module "task_service" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                       = "~> 4.0"
  create_role                   = true
  role_path                     = "/app/"
  role_name                     = "TaskService"
  provider_url                  = var.oidc_provider_url
  role_policy_arns              = [aws_iam_policy.app_task_table.arn, aws_iam_policy.eks_aodt_collector.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:${var.env}:task-service"]
}
```

ここでは、前回メトリクス収集を実施するよう修正した`task-service`Podに対してのみ適用します。
既に`task-service`のロールは作成済みですので、それに対してADOT Collectorのポリシーを紐付けるだけです。

これを先程同様にAWS環境に反映(`terraform apply`)しましょう。
これで、`task-service`のサイドカーコンテナでCloudWatchへのメトリクス送信ができるようになります。

## ADOT サイドカーコンテナのセットアップ
これで準備が整いました。ADOTのサイドカーコンテナをアプリケーションに組み込んでいきましょう。

[前回](/containers/k8s/tutorial/ops/prometheus)は、アプリケーションに対してPrometheusクライアントライブラリ(prometheus-api-metrics/prom-client)を導入しました。
これにより、アプリケーション内でメトリクス自動収集と`/metrics`エンドポイント公開が行われ、ここからPrometheusがメトリクスを取得(PULL)していました。

![prometheus-architecture](https://i.gyazo.com/064fbe7f6fdf65b0831b7ced8d5d10fe.png)

しかし、ADOTデフォルトではOpenTelemetryプロトコル(OTLP)でメトリクスが送信されてくることを待っています(PUSH型)。
このため、単純に置き換えるだけではPrometheus用のエンドポイントからメトリクスが収集されません。

![prom-adot-mismatch](https://i.gyazo.com/8b0b55b2e17c790b4e51abf6b4c0e192.png)

アプリケーションをOTLPに対応すること自体は可能ですが、現時点ではprometheus-api-metricsのようにNode.jsのメトリクスを自動収集するライブラリは存在しません（トレーシングのみ）。
このため、アプリケーション内でNode.jsやExpressに関するメトリクス収集機能を実装する必要がありますが、これを正確に行うのはかなりハードルが高いと言えます。
これに対する解決策としては、ADOTつまりOpenTelemetry Collectorの設定をカスタマイズすることです。
前述の通り、OpenTelemetry Collectorはプラグイン形式で組み替えることが可能です。今回利用しているOpenTelemetryディストリビューションのADOTでも、ReceiverコンポーネントとしてPrometheusをサポートしています。
今回はアプリケーション側では前回と同じくPrometheus用のエンドポイントを公開し、ADOT側ではこのエンドポイントからメトリクスを収集(PULL)するようにチューニングを行うこととします。

![prom-adot-adapt](https://i.gyazo.com/557dafc4f912dce392bf8a8e65df7f09.png)

:::info
OpenTelemetryはNode.jsの自動構成(auto-instrumentation)ライブラリがないのは執筆時点の状況です。
Node.jsはメジャーなランタイム環境ですので、そう遠くない未来にprometheus-api-metricsのような自動構成ライブラリが提供されると想像できます。
実際に利用する際には、最新の状況を確認するようにしてください。
:::

では、アプリケーションのKubernetesのマニフェストを修正してサイドカーコンテナを組み込みましょう。
ここでは、`app/k8s/otel`ディレクトリを作成し、アプリケーション開発編で作成した`app/k8s/v3`の内容をコピーします。
ここに対してOpenTelemetryの修正を加えていきます[^2]。

[^2]: 完成イメージを見たい場合は、[こちら](https://github.com/mamezou-tech/k8s-tutorial/tree/main/app/k8s/otel-ans)を参照してください。

まず、OpenTelemetryの設定ファイルを用意します。`app/k8s/otel/patches/task-service`配下に`otel-config.yaml`を作成します。
内容は以下のようになります。

```yaml
extensions:
  health_check:

receivers:
  prometheus:
    config:
      global:
        evaluation_interval: 30s
      scrape_configs:
        - job_name: prod/task-service
          static_configs:
            - targets: ['localhost:3000']
          scrape_interval: 30s
          metrics_path: /metrics

processors:
  batch/metrics:
    timeout: 60s

exporters:
  # AWS Embedded metric format
  # AWS Doc: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html
  # Exporter Doc: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awsemfexporter
  awsemf:

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [batch/metrics]
      exporters: [awsemf]
```

ポイントは`receivers`の部分です。デフォルトだと`otlp`、つまりOpenTelemetryプロトコルですが、ADOTに組み込まれている`prometheus`を使うよう指定します。

そして、`conifig`配下にPrometheusの設定を記述します。この部分はPrometheusの設定ファイルと同一フォーマットとなります。
ここでは、メトリクス収集のエンドポイントは固定設定(`static_configs`)とし、アクセス先である`targets`は、ローカルアクセスの`localhost:3000`とします[^3]。
これは、ADOTはサイドカーコンテナで、アプリケーションと同じPod内での実行(ネットワーク共有)となるためです。

[^3]: 通常のPrometheusの場合は、`static_configs`ではなく`kubernetes_sd_configs`（サービスディスカバリ）を利用し、`relabel_configs`でフィルタリングすることが多いです。

なお、この設定ファイルの詳細については、OpenTelemetryの[公式ドキュメント](https://opentelemetry.io/docs/collector/configuration/)を参照してください。

:::alert
OpenTelemetryのReceiverコンポーネントのPrometheusは、現時点ではまだ**開発中ステータス**です。
実際に利用する際はGitHubリポジトリを参照し、最新の状態を確認してください。

- <https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/prometheusreceiver>
:::

この設定ファイルをKustomizeのConfigMapジェネレータに追加しましょう。`app/k8s/otel/overlays/prod/kustomization.yaml`を修正します。
以下追加部分を抜粋します。

```yaml
configMapGenerator:
  - name: task-service-config
    behavior: merge
    envs:
      - patches/task-service/.env
  - name: task-reporter-config
    behavior: merge
    envs:
      - patches/task-reporter/.env
  # 以下を追加
  - name: otel-config
    files:
      - patches/task-service/otel-config.yaml
```

OpenTelemetryの設定ファイルをotel-configという名前のConfigMapで作成します(デプロイ時はプレフィックス`prod-`がつきます)。

最後にサイドカーコンテナの設定です。
`task-service`のDeploymentリソースに対応するKustomizeパッチファイルが、`app/k8s/otel/overlays/prod/patches/task-service/deployment.patch.yaml`にあるはずです。
ここにサイドカーコンテナの定義を追加しましょう。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
spec:
  replicas: 3
  template:
    spec:
      # IRSA
      serviceAccountName: task-service
      containers:
        - name: task-service
          imagePullPolicy: IfNotPresent
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 300m
              memory: 512Mi
        # ここから追加
        - name: aws-otel-collector
          image: amazon/aws-otel-collector:latest
          command: [ "/awscollector" ]
          args: [ "--config", "/config/otel-config.yaml" ]
          volumeMounts:
            - mountPath: /config
              name: otel-config-vol
              readOnly: true
          env:
            # 東京リージョン。別リージョンに配置している場合は変更してください。
            - name: AWS_REGION
              value: ap-northeast-1
          resources:
            limits:
              cpu: 256m
              memory: 512Mi
            requests:
              cpu: 32m
              memory: 24Mi
      volumes:
        - name: otel-config-vol
          configMap:
            name: otel-config
```

今までは`containers`配下はアプリケーション用のコンテナ1つでしたが、ADOTのサイドカーコンテナを追加しています。
また、`voluemes`として先程作成したConfigMapをボリュームとして作成し、コンテナの`volumeMounts`でそのボリュームをサイドカーコンテナ側の`/config`にマウントします。
これを実施することで、ADOTはOpenTelemetry Collectorの設定ファイルとして認識します。

最終的に`app/k8s/otel/overlays/prod`は以下のような構成となります。

```
app/otel/overlays/prod/
├── kustomization.yaml <- OpenTelemetryの設定ファイルをConfigMap化
├── lets-encrypt-issuer.yaml
├── patches
│ ├── ingress
│ │ └── ingress.patch.yaml
│ ├── task-reporter
│ │ └── cronjob.patch.yaml
│ └── task-service
│     ├── deployment.patch.yaml <- サイドカーコンテナを追加し、ConfigMapをマウント
│     └── otel-config.yaml <- OpenTelemetry設定ファイル配置
└── task-web
├── deployment.yaml
└── service.yaml
```

これで準備完了です。後はこれをKubernetesに反映しましょう。
デプロイはいつもと同じ手順です。

```shell
kubectl apply -k app/k8s/otel/overlays/prod
```

デプロイが完了したらPodの状態を確認してみましょう。

```shell
kubectl get pod -n prod -l app=task-service
```
```
NAME                                READY   STATUS    RESTARTS   AGE
prod-task-service-ddcc79d8f-f7hjn   2/2     Running   0          92s
prod-task-service-ddcc79d8f-jj6vx   2/2     Running   0          92s
prod-task-service-ddcc79d8f-wd264   2/2     Running   0          92s
```

READYの部分が`2/2`になっていることが確認できます。
今まではアプリケーションコンテナの1つのみでしたが、今回はサイドカーコンテナとしてADOTを指定していますので、2つのコンテナが起動します。
サイドカーコンテナのログも見てみましょう。サイドカーコンテナのログを見るには`-c`オプションでコンテナ名を指定します。

```shell
POD_NAME=$(kubectl get pod -l app=task-service -n prod -o jsonpath='{.items[0].metadata.name}')
kubectl logs ${POD_NAME} -c aws-otel-collector -n prod
```

```
2022-03-21T05:04:15.099Z        info    builder/exporters_builder.go:255        Exporter was built.     {"kind": "exporter", "name": "awsemf"}
2022-03-21T05:04:15.099Z        info    builder/pipelines_builder.go:223        Pipeline was built.     {"name": "pipeline", "name": "metrics"}
2022-03-21T05:04:15.099Z        info    builder/receivers_builder.go:226        Receiver was built.     {"kind": "receiver", "name": "prometheus", "datatype": "metrics"}
2022-03-21T05:04:15.099Z        info    service/service.go:82   Starting extensions...
2022-03-21T05:04:15.099Z        info    service/service.go:87   Starting exporters...
2022-03-21T05:04:15.099Z        info    builder/exporters_builder.go:40 Exporter is starting... {"kind": "exporter", "name": "awsemf"}
2022-03-21T05:04:15.099Z        info    builder/exporters_builder.go:48 Exporter started.       {"kind": "exporter", "name": "awsemf"}
2022-03-21T05:04:15.099Z        info    service/service.go:92   Starting processors...
2022-03-21T05:04:15.100Z        info    builder/pipelines_builder.go:54 Pipeline is starting... {"name": "pipeline", "name": "metrics"}
2022-03-21T05:04:15.100Z        info    builder/pipelines_builder.go:65 Pipeline is started.    {"name": "pipeline", "name": "metrics"}
2022-03-21T05:04:15.100Z        info    service/service.go:97   Starting receivers...
2022-03-21T05:04:15.100Z        info    builder/receivers_builder.go:68 Receiver is starting... {"kind": "receiver", "name": "prometheus"}
2022-03-21T05:04:15.100Z        info    builder/receivers_builder.go:73 Receiver started.       {"kind": "receiver", "name": "prometheus"}
2022-03-21T05:04:15.100Z        info    service/telemetry.go:95 Setting up own telemetry...
2022-03-21T05:04:15.183Z        info    service/telemetry.go:115        Serving Prometheus metrics      {"address": ":8888", "level": "basic", "service.instance.id": "2bbe44cc-25e0-4fb1-9f06-36aa7341702e", "service.version": "latest"}
2022-03-21T05:04:15.183Z        info    service/collector.go:229        Starting aws-otel-collector...  {"Version": "v0.17.0", "NumCPU": 2}
2022-03-21T05:04:15.183Z        info    service/collector.go:124        Everything is ready. Begin running and processing data.
2022-03-21T05:05:15.100Z        info    awsemfexporter@v0.45.1/emf_exporter.go:133      Start processing resource metrics       {"kind": "exporter", "name": "awsemf", "labels": {"instance":"0.0.0.0:3000","job":"prod/task-service","port":"3000","scheme":"http","service.name":"prod/task-service"}}
2022-03-21T05:05:15.429Z        info    cwlogs@v0.45.1/pusher.go:298    logpusher: publish log events successfully.     {"kind": "exporter", "name": "awsemf", "NumOfLogEvents": 38, "LogEventsSize": 18.6669921875, "Time": 31}
2022-03-21T05:05:15.598Z        info    awsemfexporter@v0.45.1/emf_exporter.go:185      Finish processing resource metrics      {"kind": "exporter", "name": "awsemf", "labels": {"instance":"0.0.0.0:3000","job":"prod/task-service","port":"3000","scheme":"http","service.name":"prod/task-service"}}
```

PrometheusのReceiverが構成され、アプリケーションメトリクスの収集が始まっていることが分かります。

エラーが発生して、メトリクスが収集できない場合は、以下の観点で確認してください。
- マネージドサービスコンソールから、IAMロール(`TaskService`)にアクセス許可(`ADOTCollector`ポリシー)が設定されているか
- サイドカーコンテナのパッチファイルが正しいか（特にボリュームマウント周辺）
- OpenTelemetryの設定ファイル(`otel-config.yaml`)のシンタックスが正しいか

## アプリケーションメトリクス可視化

アプリケーションのメトリクス収集ができましたので、CloudWatchでこれを可視化します。
AWSマネジメントコンソールより、アプリケーションのメトリクスを確認しましょう。
CloudWatchメニューより`メトリクス -> すべのメトリクス`を選択します。

![cloudwatch metrics namespaces](https://i.gyazo.com/f9a15020869ce7d26e5a2a4fc41e2e5a.png)

上記のCustom namespacesの`prod/task-service`[^4]から、サイドカーコンテナのADOTで収集されたメトリクスが確認できます。

[^4]: Prometheusの設定(`otel-config.yaml`)で指定した`job_name`の値です。また、`ContainerInsights`namespaceがDaemonSetのADOTで収集したKubernetesメトリクスです。

例えば、アプリケーションのメモリ使用量をグラフ化してみましょう。
1. ディメンションから`space`を選択
2. メトリクスフィールドで`used_bytes`を入力してフィルタリング
3. 表示されたメトリクスのチェックをON

以下のように、時系列グラフとして各領域のメモリの使用量が確認できます。

![app memory graph](https://i.gyazo.com/d5426edf40b52bce290f127ae8c12505.png)

もちろんCloudWatchでも、Grafanaのようにダッシュボード機能があります。
しかし、事前に使えるものは一部のマネージドサービスのものだけで、prometheus-api-metricsのように綺麗なダッシュボードテンプレートがありませんので、自前で作成する必要があります。

ダッシュボードのサンプルとして、以下のようになります(表示をナイトモードに切り替えるてGrafanaのUIに近くしています)。

![](https://i.gyazo.com/c06ca683beb5c087cb185946fc877197.png)

実際に[公式ドキュメント](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html)を参照し、自分で任意のダッシュボードを作成してみましょう。
複雑なグラフには個別にクエリ(メトリクスインサイト)記述もできますし、見た目のチューニングもある程度は対応可能です。

## クリーンアップ

DaemonSetとしてインストールしたADOTは、helmコマンドでアンインストールしてください。

```shell
helm uninstall aws-otel-ds -n kube-system
```

それ以外のリリース削除については、以下を参照してください。

- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/#クリーンアップ)

サイドカーコンテナとしてインストールしたADOTもアプリケーションと共に削除されます。

## まとめ

OpenTelemetryという標準プロトコルを利用し、任意のバックエンドサービスに対してメトリクスの収集・可視化を行いました。
今回はCloudWatchをバックエンドサービスとして利用しましたが、OpenTelemetryはベンダー非依存のプロトコルですので、サポートされているプロダクトであれば設定変更で簡単に切り替えることができます。
モニタリングサービスは数多くありますので、自分の組織にあったものを採用する上でOpenTelemetryを抑えておくことは、今後重要になってくるでしょう。
ただし、現時点でOpenTelemetryやそのエコシステムはアクティブに開発中ですので、採用する場合は最新の状況をキャッチアップするようにしてください。

なお、今回のようにCloudWatch等のマネージドサービスをバックエンドサービスとして利用すると、簡単にスケーラビリティ獲得やツール自体の運用から開放されますが、課金条件に注意が必要です。
カスタムメトリクスは、意外にコストが高い印象ですので、各サービスの課金体系は事前にチェックしておきましょう。
最初は全量取得するとしても、その後の運用を通して不要なメトリクスをそぎ落としていく等の工夫が必要となることも多いと思います。

また、ここでは触れませんでしたが、CloudWatchではPrometheusメトリクスの収集も可能になっています。
- <https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights-Prometheus.html>

現在既にメトリクスの収集にPrometheusを使っていて、より簡単にCloudWatchに移行したい場合は、こちらを検討するのも良いかと思います。

---
参照資料

- [OpenTelemetryドキュメント](https://opentelemetry.io/docs/)
- [AWS Distro for OpenTelemetry ドキュメント](https://aws-otel.github.io/docs/introduction)
- [AWS CloudWatchドキュメント](https://docs.aws.amazon.com/cloudwatch/index.html)