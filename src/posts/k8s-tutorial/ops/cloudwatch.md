---
title: ログ収集・分析(Fluent Bit / Amazon CloudWatch)
author: noboru-kudo
tags: [aws]
prevPage: ./src/posts/k8s-tutorial/ops/opensearch.md
date: 2022-04-10
---

[前回](/containers/k8s/tutorial/ops/opensearch/)はログの収集に[Fluent Bit](https://fluentbit.io/)、その分析に[AWS OpenSearch](https://aws.amazon.com/opensearch-service/)を使用しました。

AWS OpenSearchは、非常に高機能な検索とリッチなUIを提供しますが、デメリットもあります。
まず、OpenSearch自体のセットアップ作業が別途必要です。特に、高スループットが予想される商用環境では、マルチノードでクラスターを組む必要がありますし、構成に応じてかなりのコストが発生します。
また、前回は簡易的な認証としましたが、実運用では社内SSOやCognitoとの連携などのセキュリティ対策が欠かせません。

今回は、OpenSearchの代替として、AWSモニタリングのフルマネージドサービスである[Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)をログ分析のバックエンドサービスとして利用してみましょう[^1]。
CloudWatchは、OpenSearchのように構成を考えたり、別途セットアップをする必要はなく、AWSアカウントがあればすぐに使い始めることができます。

[^1]: CloudWatchは[メトリクス可視化](/containers/k8s/tutorial/ops/opentelemetry/)でも使用しましたが、今回はログ分析に使用します。

[[TOC]]

## 事前準備

アプリケーションは以下で実装したものを使います。事前にEKS環境を準備し、アプリケーションのセットアップしておきましょう。

- [クラスタ環境デプロイ - コンテナレジストリ(ECR)](/containers/k8s/tutorial/app/container-registry/)
- [クラスタ環境デプロイ - EKSクラスタ(AWS環境準備)](/containers/k8s/tutorial/app/eks-1/)
- [クラスタ環境デプロイ - EKSクラスタ(Kustomize導入)](/containers/k8s/tutorial/app/eks-2/)
- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/)

前回OpenSearchのチュートリアルで、既にFluent Bitをセットアップしている場合は一度削除しておきます。

```shell
helm uninstall aws-for-fluent-bit -n fluent-bit 
```

## Fluent Bitのアクセス許可設定

ログ収集のFluent Bitをインストールする前に、CloudWatchへのアクセス許可を設定します。
`/app/terraform/main.tf`に以下を追記します。

```hcl
data "aws_iam_policy" "cloudwatch_agent_server_policy" {
  name = "CloudWatchAgentServerPolicy"
}

module "fluentbit" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                       = "~> 4.0"
  create_role                   = true
  role_name                     = "FluentBit"
  provider_url                  = var.oidc_provider_url
  role_policy_arns              = [data.aws_iam_policy.cloudwatch_agent_server_policy.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:fluent-bit:fluent-bit"]
}

resource "kubernetes_namespace" "fluentbit" {
  metadata {
    name = "fluent-bit"
  }
}

resource "kubernetes_service_account" "fluentbit" {
  metadata {
    namespace = "fluent-bit"
    name = "fluent-bit"
    annotations = {
      "eks.amazonaws.com/role-arn" = module.fluentbit.iam_role_arn
    }
  }
}
```

ここでは以下を定義しています。
- `module.fluentbit`: Fluent BitのServiceAccountに紐付けるIAM Role
- `kubernetes_namespace.fluentbit`: Fluent Bitを配置するKubernetesのNamespace
- `kubernetes_service_account.fluentbit`: Fluent Bit Podが利用するServiceAccount

前回OpenSearchで実施したこととほとんど同じです。前回はカスタムのIAMポリシーを設定しましたが、今回はAWSマネージドポリシーのCloudWatchAgentServerPolicyを使っています。

これをTerraformでAWS環境に反映(`terraform apply`)しましょう。 具体的な方法は以下を参照しくてださい。

- [クラスタ環境デプロイ - EKSクラスタ(AWS環境準備) - AWS/EKS反映](/containers/k8s/tutorial/app/eks-1/#aws-eks反映)

## Fluent Bitのインストール

では、Fluent Bitのインストールをしていきましょう。
前回同様にEKS向けに提供されているFluent Bitの[Helmチャート](https://github.com/aws/eks-charts/tree/master/stable/aws-for-fluent-bit)を利用します。

前回未実施の場合は、Helmチャートのリポジトリを追加します。

```shell
helm repo add eks https://aws.github.io/eks-charts
helm repo update
```

続いてFluent Bitをインストールします。

```shell
helm upgrade --install aws-for-fluent-bit eks/aws-for-fluent-bit \
  --version 0.1.14 \
  --namespace fluent-bit \
  --set serviceAccount.create=false \
  --set serviceAccount.name=fluent-bit \
  --set firehose.enabled=false \
  --set cloudWatch.enabled=true \
  --set cloudWatch.region=ap-northeast-1 \
  --set kinesis.enabled=false \
  --set elasticsearch.enabled=false
```

`--namespace`や`serviceAccount.name`には、先程Terraformで作成したものを指定しています。

また、前回はOpenSearch(Elasticsearch)のみ有効にしましたが、今回はCloudWatch(`cloudWatch.enabled`)のみを有効にし、ログ転送先のAWSリージョンを指定しています。


:::column:ログの保持期間
これ以外にも、実運用ではコスト観点で、`cloudWatch.logRetentionDays`でログの保持期間を指定するのが望ましいでしょう(デフォルトは失効なし)。
ログの保持期間を指定する場合は、Fluent BitのIAMロールに別途`logs:PutRetentionPolicy`を許可する必要があります。
```hcl
data "aws_iam_policy_document" "log_retention" {
  version = "2012-10-17"
  statement {
    actions = ["logs:PutRetentionPolicy"]
    effect = "Allow"
    resources = ["arn:aws:logs:${data.aws_region.this.name}:${data.aws_caller_identity.this.account_id}:log-group:*"]
  }
}

resource "aws_iam_policy" "fluentbit_log_retention" {
  name = "FluentBitLogRetention"
  policy = data.aws_iam_policy_document.log_retention.json
}
```
:::

:::column:ADOTと一緒にFluent Bitを有効にする
今回は使用しませんでしが、[メトリクス収集・可視化 - OpenTelemetry / CloudWatch](/containers/k8s/tutorial/ops/opentelemetry/)で使用したADOT(AWS Distro for OpenTelemetry)のHelmチャートもFluent Bitに対応しています。
ADOTを使用するのであれば、ここで一緒にFluent Bitをセットアップしてしまうのが簡単です。
以下コマンドではADOTのHelmチャートを使ってFluent Bitを同時にセットアップする例です。
```shell
# <aws-account-id>の部分は利用しているAWS環境のアカウントIDに置き換えてください
helm upgrade aws-otel-ds aws-otel/adot-exporter-for-eks-on-ec2 \
    --install --version 0.2.0 \
    --namespace kube-system \
    --set adotCollector.daemonSet.serviceAccount.name=adot-collector \
    --set adotCollector.daemonSet.serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::<aws-account-id>:role/ADOTCollector \
    --set clusterName=mz-k8s \
    --set awsRegion=ap-northeast-1 \
    --set fluentbit.enabled=true \
    --set fluentbit.serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::<aws-account-id>:role/FluentBit \
    --wait
```
`fluentbit.enabled`を有効にし、CloudWatchへの転送を許可するIAMロールを指定しています。
今回とはインストール先のNamespaceが異なりますので、事前に先程Terraformで指定したIAMロールの引受先を変更する必要があります。
```hcl
module "fluentbit" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                       = "~> 4.0"
  create_role                   = true
  role_name                     = "FluentBit"
  provider_url                  = var.oidc_provider_url
  role_policy_arns              = [data.aws_iam_policy.cloudwatch_agent_server_policy.arn]
  # EKS for fluentbit
#  oidc_fully_qualified_subjects = ["system:serviceaccount:fluent-bit:fluent-bit"]
  # ADOT バージョンを使う場合は以下を指定
  oidc_fully_qualified_subjects = ["system:serviceaccount:amazon-cloudwatch:fluent-bit"]
}
```
:::

インストールが終わったら、前回同様に内容を確認してみましょう。

まずはPodの状況です。
```shell
kubectl get pod -l app.kubernetes.io/name=aws-for-fluent-bit \
  -n fluent-bit
```
```
NAME                       READY   STATUS    RESTARTS   AGE
aws-for-fluent-bit-2ksz9   1/1     Running   0          25s
aws-for-fluent-bit-89ms4   1/1     Running   0          25s
```

ノード数と同じレプリカが正常に実行されていることを確認します(DaemonSet)。
コンテナログも確認してみましょう。

```shell
# 1つ目のPod名取得
export FLUENTBIT_POD=$(kubectl get pod -n fluent-bit -l app.kubernetes.io/name=aws-for-fluent-bit -o jsonpath='{.items[0].metadata.name}')
kubectl logs ${FLUENTBIT_POD} -n fluent-bit
```

エラーが発生していないことを確認します。エラーが発生している場合はアクセス許可が正しく設定できているかを見直してください。

Fluent Bitの設定ファイルを確認してみましょう。

```shell
kubectl get cm aws-for-fluent-bit -n fluent-bit -o yaml
```
```
# fluent-bit.confのみ抜粋
[SERVICE]
    Parsers_File /fluent-bit/parsers/parsers.conf

[INPUT]
    Name              tail
    Tag               kube.*
    Path              /var/log/containers/*.log
    DB                /var/log/flb_kube.db
    Parser            docker
    Docker_Mode       On
    Mem_Buf_Limit     5MB
    Skip_Long_Lines   On
    Refresh_Interval  10

[FILTER]
    Name                kubernetes
    Match               kube.*
    Kube_URL            https://kubernetes.default.svc.cluster.local:443
    Merge_Log           On
    Merge_Log_Key       data
    Keep_Log            On
    K8S-Logging.Parser  On
    K8S-Logging.Exclude On
[OUTPUT]
    Name                  cloudwatch
    Match                 *
    region                ap-northeast-1
    log_group_name        /aws/eks/fluentbit-cloudwatch/logs
    log_stream_prefix     fluentbit-
    auto_create_group     true
```

以下の内容で動作していることが確認できます。

- `[INPUT]`: Nodeのコンテナログ(標準出力・エラー)を収集
- `[FILTER]`: ログエントリーにKubernetesのメタ情報付加[^2]
- `[OUTPUT]`: CloudWatchへログ転送(ロググループ:`/aws/eks/fluentbit-cloudwatch/logs`)

[^2]: <https://docs.fluentbit.io/manual/pipeline/filters/kubernetes>

前回は`[OUTPUT]`の定義で、OpenSearchへログを転送していましたが、今回はCloudWatchとなっています。

## ログ収集結果の確認

これで準備が整いました。実際にアプリケーションをデプロイしてログを収集してみましょう。
前回同様にJSONログを出力する`task-service`を対象に確認します。

- <https://github.com/mamezou-tech/k8s-tutorial/tree/main/app/apis/task-service>

前回既にアプリケーションをデプロイ済みの場合は、このステップは不要です。

以下でコンテナイメージを作成して、デプロイします。
ここでは`task-service`のみを記載していますが、アプリケーションを動作させるためには、他のサービスのビルドも必要です。詳細は[アプリケーション開発編](/containers/k8s/tutorial/app/container-registry/#イメージビルド-プッシュ)を参照してください。

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
既にアプリケーションをデプロイ済みの場合は、タグを変更するか`imagePullPolicy`を`Always`に変更してください。
:::

デプロイが終わったら、アプリケーションのUIを操作して、いくつかログを出力させておきましょう。

それでは、マネジメントコンソールからCloudWatchを表示し、収集したログを確認していきます。

CloudWatchメニューから`ロググループ`を選択すると、全てのロググループが表示されます。`/aws/eks/fluentbit-cloudwatch/logs`がFluent Bitで転送しているロググループです。

![](https://i.gyazo.com/13a3a4a279a52b90f6fbd0dccdb5f03e.png)

こちらを選択します。

![](https://i.gyazo.com/f78b20e16d725b1c006604fcb04d2a6f.png)

全てのコンテナログファイルがログストリームとして一覧表示されます。検索フィールドで`task-service`のログに絞ります。

![](https://i.gyazo.com/81e68f477b1509f8eb26780fff0183b8.png)

Podレベルのログがここに出力されています。任意のログストリームを1つ選択してみましょう。

![](https://i.gyazo.com/ae690965d65539f8fb3f94818b932e7a.png)

アプリケーションのログが表示されていることが確認できます。
これだとログの検索機能としては使いにくいです。CloudWatchには[ログインサイト](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html)という機能が用意されており、こちらでは任意のクエリでログを検索可能です。
サイドバーより`ログインサイト`を選択します。
対象のロググループに`/aws/eks/fluentbit-cloudwatch/logs`を指定し、以下のクエリを入力・実行してみましょう。

```text
fields @timestamp, data.message, kubernetes.pod_name
| filter kubernetes.container_name = "task-service"
| filter data.meta.req.url not in ["/health/readiness", "/health/liveness"]
| sort @timestamp desc
```

`task-service`のログに絞って、不要なログ(ReadinessProbe/LivenessProbe)を除外しています。
また、タイムスタンプに加えて、ログメッセージとPod名を出力しています。

![](https://i.gyazo.com/3da4365fae7fd2d6fb00ee3061552764.png)

かなり見やすくなりました[^3]。
ログインサイトのクエリでは、他にも正規表現や集計等、様々なものが利用可能です。詳細は以下のCloudWatchの公式ドキュメントを参照してください。

- [CloudWatch Logs Insights query syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)

[^3]: ログインサイトはロググループと比較して、若干タイムラグがあります。表示されない場合は少し待ってから試してください。

このように、Fluent BitのKubernetesフィルターによって付与されたKubernetesのメタ情報(コンテナ名/Namespace/ホスト等)を利用することで、様々な角度からログを分析できます。
クエリ作成の際は、一度ロググループのログ全体を眺めて、使いたい属性を探してみると良いでしょう。

![](https://i.gyazo.com/84edc6f8580bacfb52eaea96f30c3abc.png)

:::column:ロググループを分割する
今回全てのログを1つのロググループに集約しましたが、実運用ではアプリケーションの種類やNamespaceで分割したいことがほとんどでしょう。
そのようなケースでは、Helmチャートのインストール時に、LogGroupを動的に作成するよう指定します。
以下はNamespace/コンテナの階層でロググループを分割する例です。

```shell
helm upgrade --install aws-for-fluent-bit eks/aws-for-fluent-bit \
  --version 0.1.14 \
  --namespace fluent-bit \
  --set serviceAccount.create=false \
  --set serviceAccount.name=fluent-bit \
  --set firehose.enabled=false \
  --set cloudWatch.enabled=true \
  --set cloudWatch.region=ap-northeast-1 \
  --set kinesis.enabled=false \
  --set elasticsearch.enabled=false \
  --set cloudWatch.logGroupName="/aws/eks/fluentbit-cloudwatch/logs/\$(kubernetes['namespace_name'])/\$(kubernetes['container_name'])"
```
`cloudWatch.logGroupName`パラメータで`$(kubernetes['namespace_name'])/$(kubernetes['container_name'])`を指定している部分で動的にロググループを分けています。
これを実行すると、以下のように各ロググループが作成され、管理しやすくなります。
![](https://i.gyazo.com/b698d89f6a83299420514efbd64c2d71.png)
:::

## クリーンアップ

HelmでインストールしたFluent Bitは以下で削除します。

```shell
helm uninstall aws-for-fluent-bit -n fluent-bit 
```

それ以外のリリース削除については、以下を参照してください。

- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/#クリーンアップ)

## まとめ

今回はFluent Bitの出力先としてCloudWatchを使ってログを一元管理できるようにしました。
OpenSearchと違い、CloudWatchは事前のセットアップが不要で、簡単に始められることが分かったと思います。
検索機能についてもOpenSearchほどではありませんが、十分実用性に足りると感じた方も多いでしょう[^4]。

注意点として、CloudWatchはAWS OpenSearchと比較するとコスト面では有利とはいえ、データ転送量やストレージ使用量等に応じて課金されます。
不要なログは極力送信しないよう、アプリケーションのログレベルやFluent Bitの設定を調整していくことは必要となります。

また、ここでは触れませんでしたが、CloudWatchで収集したログをAWS OpenSearchに転送も可能です。
これを利用すれば、CloudWatchでログを一元管理をするものの、高度な分析が必要なものはOpenSearchを利用するハイブリッドな使い方もできます。

- [Streaming CloudWatch Logs data to Amazon OpenSearch Service](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_OpenSearch_Stream.html)

なお、Fluent Bitがコンテナ名等のKubernetesのメタ情報をログに付与してくれますが、これだけでは不十分です。
より有用なログ分析には、アプリケーションレベルのメタ情報(リクエストパス、レスポンスステータス等)が必須です。
特にセッションやトレースID等、一連のトランザクションを特定する識別子をメタ情報として入れておくと、ユーザーの一連の流れをログから追うことができて障害解析に重宝されます。
コンテナ以前の問題ですが、どういう視点でログ分析をするかを考慮に入れてアプリケーションのログ出力を実装することが何より重要です。

[^4]: 個人的な意見ではありますが、AWSではいきなりOpenSearchを入れるのではなく、まずはCloudWatchで始めるのがお勧めです。

---
参照資料

- [Fluent Bitドキュメント](https://docs.fluentbit.io/manual)
- [CloudWatch Logsドキュメント](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html)