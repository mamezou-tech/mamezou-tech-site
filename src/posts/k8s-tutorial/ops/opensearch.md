---
title: ログ収集・分析(Fluent Bit / AWS OpenSearch)
author: noboru-kudo
tags: [aws]
prevPage: ./src/posts/k8s-tutorial/ops/opentelemetry.md
date: 2022-04-03
---

今回はログの収集と分析に焦点を当てます。

いつの時代もアプリケーションが出力するログは、障害解析やアクセス/証跡管理に欠かせません。

マイクロサービスのような分散アーキテクチャを採用した場合、1つのアプリケーションは複数のサービスで構成されることになります。
このため、管理対象ログファイルの数は以前と比較すると飛躍的に多くなり、ファイルレベルでなく、全体のログを一元管理するためのバックエンドサービスは不可欠と言えます。
また、スケーラビリティや可用性を備えた構成にすると、サービスのインスタンス数は頻繁に増減し、それに伴って収集対象のログファイルも変わっていくことになります。
このような状況では、静的にログファイルを管理することは不可能に近く、動的に管理対象のログを検出・収集する仕組みも必要となります。

Kubernetesを実行基盤としたアプリケーションを考えてみましょう。
コンテナのローカルファイルシステムは一時的なもので、ここにログファイルを出力してもコンテナを再起動すると初期化されてしまいます。
これに対するシンプルな解決策は、標準出力・エラーを使うことです。
Kubernetes(具体的にはkubelet)では、コンテナの標準出力/エラーはコンテナログファイルとして各ノードで保管されます。
したがって、これらのログファイルを継続的に収集することで、ログを一元管理するバックエンドサービスに送信することが可能となります。
以下はKubernetesの公式ドキュメントから、ログ収集に関する方式の抜粋です。

![](https://i.gyazo.com/d70a614aee3256f1368dbdd9de7d4fe5.png)
引用元: <https://kubernetes.io/docs/concepts/cluster-administration/logging/#using-a-node-logging-agent>

標準出力・エラーのログファイル(log-file.log)をlogging-agentが収集し、ログ分析サービス(Logging Backend)に転送している様子が分かります[^1]。

[^1]: ログローテート(logrotate)はkubeletの責務になります。

これ以外にも、サイドカーコンテナを使った方式もありますが、今回は最も一般的なこちらの方式でログの収集と分析の仕組みを構築してみましょう。

ログ収集やその後の分析ツールは、OSSから有償サービスまで様々な選択肢がありますが、 ここではAWS環境での利用が容易な以下を選定します。

- ログ収集ツール: [Fluent Bit](https://fluentbit.io/)
- ログ分析サービス: [AWS OpenSearch](https://aws.amazon.com/opensearch-service/) / [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)

メトリクス同様に今回も2部構成に分けて実施します。
第1部はFluent Bit + AWS OpenSearchです。

[[TOC]]

## 事前準備
アプリケーションは以下で使用したものを使います。事前にEKS環境を準備し、アプリケーションのセットアップしておきましょう。

- [クラスタ環境デプロイ - コンテナレジストリ(ECR)](/containers/k8s/tutorial/app/container-registry/)
- [クラスタ環境デプロイ - EKSクラスタ(AWS環境準備)](/containers/k8s/tutorial/app/eks-1/)
- [クラスタ環境デプロイ - EKSクラスタ(Kustomize導入)](/containers/k8s/tutorial/app/eks-2/)
- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/)

## OpenSearchのセットアップ
まずは、ログ分析のバックエンドサービスとしてAWS OpenSearchをセットアップします。
AWS OpenSearchは、もともとはElastic社が所有する[Elasticsearch](https://www.elastic.co/elasticsearch/)のマネージドサービス(Amazon ES)でした。
しかし、Elastic社のライセンス変更に伴い、AWSはElasticsearchの`7.10.2`からフォークしたOpenSearchを開発し、2021/9/8にこれをベースとしたAWS OpenSearchに名称変更しました[^2]。
このため、現状はAWS OpenSearchの内容はほぼElasticsearchと同じです。

[^2]: AWSとElastic社の間での軋轢があるようですが、ここでは触れません。気になる方は[こちら](https://www.elastic.co/blog/why-license-change-aws)のブログを参照してください。

OpenSearch(もちろんElasticSearchも)自体はログ専用のツールという訳ではなく、スケーラブルな全文検索エンジンですが、ここではログ検索の用途で使います。

OpenSearchもTerraformで作成します。`/app/terraform/main.tf`に以下を追記しましょう。

```hcl
data "aws_region" "this" {}
data "aws_caller_identity" "this" {}

# OpenSearch
resource "aws_elasticsearch_domain" "this" {
  domain_name           = "task-tool-log"
  elasticsearch_version = "OpenSearch_1.1"
  ebs_options {
    ebs_enabled = true
    volume_type = "gp2"
    volume_size = 30
  }
  node_to_node_encryption {
    enabled = true
  }
  encrypt_at_rest {
    enabled = true
  }
  domain_endpoint_options {
    enforce_https = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }
  advanced_security_options {
    enabled = true
    internal_user_database_enabled = true
    master_user_options {
      master_user_name = "admin"
      master_user_password = "MZ-pass-123"
    }
  }
}

resource "aws_elasticsearch_domain_policy" "this" {
  domain_name     = aws_elasticsearch_domain.this.domain_name
  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow",
        Principal = {
          AWS = "*"
        },
        Action = "es:ESHttp*"
        Resource = "arn:aws:es:${data.aws_region.this.name}:${data.aws_caller_identity.this.account_id}:domain/${aws_elasticsearch_domain.this.domain_name}/*"
      }
    ]
  })
}
```

`aws_elasticsearch_domain`リソースでOpenSearchドメイン(`task-tool-log`)を作成しています。
ここでは検証用のため、デフォルトのシングルノード構成としています。
また、内部ユーザーデータベース(`internal_user_database_enabled`)を有効にして、マスターユーザー・パスワードを個別指定しています。
AWS OpenSearchではSAMLやCognitoを使用した認証が用意されていますので、実運用で使う際は、こちらを利用するのが良いでしょう。
認証についての詳細は、以下のAWS OpenSearchの公式ドキュメントを参照してください。
- [SAML認証](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/saml.html)
- [Cognito認証](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cognito-auth.html)

`aws_elasticsearch_domain_policy`リソースではIAMレベルのアクセスポリシーを作成しています。
ここではIAMレベルでのアクセス制限は実施せず(`AWS = "*"`)、OpenSearch内での認証のみとしています。

:::alert
現状TerraformのAWS Providerの`aws_elasticsearch_domain`は、OpenSearchに関して不具合があり、インスタンスタイプの指定ができません。
AWS Providerの`4.9.0`バージョンではOpenSearch用のリソースが新しく追加され、この不具合が解消される予定です。
<https://github.com/hashicorp/terraform-provider-aws/pull/23902>
:::

Terraform実行前に、マネジメントコンソールからTerraformの実行ユーザーのIAMポリシーにOpenSearchリソース作成の許可を与えるために、`AmazonOpenSearchServiceFullAccess`を追加してください。

ポリシーを追加したら、TerraformでAWS環境に反映(`terraform apply`)しましょう。 具体的な方法は以下を参照しくてださい。

- [クラスタ環境デプロイ - EKSクラスタ(AWS環境準備) - AWS/EKS反映](/containers/k8s/tutorial/app/eks-1/#aws-eks反映)

反映が終わったら、実際にOpenSearchにアクセスしてみましょう。
OpenSearchは、Elasticsearch同様に可視化ツールの[Kibana](https://www.elastic.co/guide/en/kibana/current/index.html)からフォークしたOpenSearch Dashboardsがあります。

マネジメントコンソールからOpenSearchを選択します。ダッシュボードに作成したドメインが表示されています。
![opensearch dashboard](https://i.gyazo.com/30d1f8acd6ac9137bb28130b95dc38a2.png)

ドメインをクリックするとドメインの詳細が表示されます。
OpenSearch DashboardsのところにURLがありますので、こちらのリンクをクリックします。

![domain detail](https://i.gyazo.com/467688b9e9cf781f3e1fa1dda6f9d5a3.png)

OpenSearch Dashboardsの認証ページが表示されるはずです。ユーザー・パスワードはTerraformで設定したマスターユーザー(上記は`admin`/`MZ-pass-123`を指定)を入力します。

![opensearch login](https://i.gyazo.com/c16cedb6fb6cdbc3b33a606acabbfc3f.png)

ログインに成功すると以下のような表示になります。`Explore on my own`をクリックします。

![opensearch select](https://i.gyazo.com/19377e5285c4f7253898ba90d7a83d9a.png)

テナントの選択では`Private`を指定し、`Confirm`をクリックします。

![opensearch private tenant](https://i.gyazo.com/9ea2101d9cd763d08c51a139b63a5d28.png)

以下のようなトップページが表示されれば、初期セットアップは完了です。

![opensearch top](https://i.gyazo.com/843576e0cfad74efe4dc97a8a6c2b46c.png)

## Fluent Bitのアクセス許可設定

次に、コンテナログを収集し、OpenSearchへ転送するFluent Bitをセットアップします。
その前に、Fluent BitがOpenSearchにアクセスできるようにIAM関連リソースとKubernetesのServiceAccountを準備しておきましょう。
`/app/terraform/main.tf`に以下を追記します。

```hcl
data "aws_iam_policy_document" "opensearch" {
  version = "2012-10-17"
  statement {
    actions = ["es:ESHttp*"]
    effect = "Allow"
    resources = ["arn:aws:es:${data.aws_region.this.name}:${data.aws_caller_identity.this.account_id}:domain/${aws_elasticsearch_domain.this.domain_name}/*"]
  }
}

resource "aws_iam_policy" "opensearch" {
  name = "TaskToolOpenSearchAccess"
  policy = data.aws_iam_policy_document.opensearch.json
}

module "fluentbit" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                       = "~> 4.0"
  create_role                   = true
  role_name                     = "FluentBit"
  provider_url                  = var.oidc_provider_url
  role_policy_arns              = [aws_iam_policy.opensearch.arn]
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
- `aws_iam_policy.opensearch`: OpenSearchアクセスためのIAM Policy
- `module.fluentbit`: Fluent BitのServiceAccountに紐付けるIAM Role
- `kubernetes_namespace.fluentbit`: Fluent Bitを配置するKubernetesのNamespace
- `kubernetes_service_account.fluentbit`: Fluent Bit Podが利用するServiceAccount

先程同様に、これもAWS/EKS環境に反映(`terraform apply`)しておきましょう。

AWS OpenSearchへのアクセスはこれだけでは不十分です。OpenSearch側でも、このIAMロールからの操作を許可する必要があります[^3]。

[^3]: AWS OpenSearchのきめ細やかなアクセスコントール(Fine-Grained Access Control)の詳細については[公式ドキュメント](https://docs.aws.amazon.com/ja_jp/opensearch-service/latest/developerguide/fgac.html)を参照してください。

再度OpenSearch DashboardsのUIにアクセスしてこれを実施していきましょう。
OpenSearch Dashboardsのサイドバーから`Security`を選択します。
![opensearch sidebar security](https://i.gyazo.com/4056961031cd67503e7b19f2f2be348c.png)

サイドバーより`Roles`を選択し、ロール一覧の中から`all_access`をクリックします[^4]。

[^4]: 今回は事前定義されたものを使っていますが、実運用では専用のロールを作成し、最低限のポリシーとなるようにするべきです。

![opensearch security role](https://i.gyazo.com/b41c19aba0fcbe248b1f0547af3d30ab.png)

`Mapped users`タブを選択し、`Manage mapping`をクリックします。

![opensearch mapped users](https://i.gyazo.com/762b614bfa6942705ca1d14f94da60ce.png)

`Backend roles`に先程Terraformで作成したIAM Role(`FluentBit`)のARNを入力し、`Map`をクリックしてください（ARNについてはマネジメントコンソールのIAMメニューより確認できます）。

![opensearch add backend roles](https://i.gyazo.com/491ee7e2b4c0fe5dbf56cff1606d893c.png)

これで、Fluent BitがOpenSearchに対して、ログ(インデックス)を保存可能になります。
なお、ここで実施しているOpenSearchのアクセスコントールの詳細については、[公式ドキュメント](https://opensearch.org/docs/latest/security-plugin/access-control/index/)を参照してください。

## Fluent Bitのインストール

次はFluent Bit本体をセットアップしましょう。
今回は素のFluent Bitではなく、AWS環境向けに用意されているイメージを使います。

- <https://github.com/aws/aws-for-fluent-bit>

これについてもEKS向けの[Helmチャート](https://github.com/aws/eks-charts/tree/master/stable/aws-for-fluent-bit)が公開されていますので、こちらを使いましょう。
以下でHelmチャートのリポジトリを追加します。

```shell
helm repo add eks https://aws.github.io/eks-charts
helm repo update
```

続いてFluent Bitをインストールします。現時点で最新の`0.1.14`を指定しました。

```shell
# アクセスするOpenSearchのホスト名をAWS CLIで取得。マネジメントコンソールから取得しても構いません。
export DOMAIN_NAME=task-tool-log
export OPEN_SEARCH_HOST=$(aws es describe-elasticsearch-domain --domain-name ${DOMAIN_NAME} --output text --query "DomainStatus.Endpoint")

helm upgrade --install aws-for-fluent-bit eks/aws-for-fluent-bit \
  --version 0.1.14 \
  --namespace fluent-bit \
  --set serviceAccount.create=false \
  --set serviceAccount.name=fluent-bit \
  --set firehose.enabled=false \
  --set cloudWatch.enabled=false \
  --set kinesis.enabled=false \
  --set elasticsearch.enabled=true \
  --set elasticsearch.host=${OPEN_SEARCH_HOST} \
  --set elasticsearch.awsRegion=ap-northeast-1
```

`--namespace`や`serviceAccount.name`には、先程Terraformで作成したものを指定しています。
また、出力先としてOpenSearch(Elasticsearch)以外のサービスは無効化しています。

インストールが終わったら、内容を確認してみましょう。 

まずはPodの状況です。
```shell
kubectl get pod -l app.kubernetes.io/name=aws-for-fluent-bit \
  -n fluent-bit
```
```
NAME                       READY   STATUS    RESTARTS   AGE
aws-for-fluent-bit-cxc4d   1/1     Running   0          96s
aws-for-fluent-bit-kzd77   1/1     Running   0          96s
```
Fluent BitはDaemonSetとして作成されますので、ノード数と同じレプリカが正常に実行されていることを確認します。

コンテナログも確認してみましょう。

```shell
# 1つ目のPod名取得
export FLUENTBIT_POD=$(kubectl get pod -n fluent-bit -l app.kubernetes.io/name=aws-for-fluent-bit -o jsonpath='{.items[0].metadata.name}')
kubectl logs ${FLUENTBIT_POD} -n fluent-bit
```

特にエラーが発生していなければOKです。エラーが発生する場合はOpenSearchのエンドポイントやアクセス許可が正しく設定できているかを見直してください。

最後にFluent Bitの設定ファイルを確認してみましょう。
```shell
kubectl exec ${FLUENTBIT_POD} -n fluent-bit -- cat /fluent-bit/etc/fluent-bit.conf
```
```
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
    Name            es
    Match           *
    AWS_Region      ap-northeast-1
    AWS_Auth        On
    Host            search-task-tool-log-xxxxxxxxxxxxxxxxx.ap-northeast-1.es.amazonaws.com
    Port            443
    TLS             On
    Retry_Limit     6
    Replace_Dots    On
```

Helmチャートのデフォルトそのままで明示的に設定ファイルを作成しませんでしたが、以下の内容で動作していることが確認できます。

- `[INPUT]`: Nodeのコンテナログ(標準出力・エラー)を収集
- `[FILTER]`: ログエントリーにKubernetesのメタデータ付加([Filterドキュメント](https://docs.fluentbit.io/manual/pipeline/filters/kubernetes))
- `[OUTPUT]`: 作成済みのOpenSearchへログ転送

なお、Helmチャートのパラメータで、自身の環境に合うようにカスタマイズも可能です。詳細はHelmチャートの[リポジトリ](https://github.com/aws/eks-charts/tree/master/stable/aws-for-fluent-bit)を参照してください。

## ログ収集結果の確認

これでログ収集のためのプラットフォームが完成しました。
後はアプリケーションをデプロイして、そのログをOpenSearch Dashboardsで確認しましょう。

今回`task-service`のアプリケーションを改修して、リクエスト時にJSON形式のログを標準出力へ出力するようにしました。

- <https://github.com/mamezou-tech/k8s-tutorial/tree/main/app/apis/task-service>

こちらでコンテナイメージを作成して、デプロイします[^5]。

[^5]: ここではtask-serviceのみですが、他のサービスのビルド・デプロイは[アプリケーション開発編](/container/#アプリケーション開発編)を参照してください。

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

それでは、OpenSearch Dashboardsを使ってログを可視化してみましょう。
サイドバーより`Stack Management`を選択します。

![opensearch stack management](https://i.gyazo.com/c0952d474661f7861223d7d2be47bb48.png)

メニューより`Index Patterns`を選択し、`Create index pattern`をクリックします。

![opensearch index pattern step1](https://i.gyazo.com/5b2fed9045993bd780a49c903d744094.png)

`index pattern name`に`fluent-bit`と入力すると、下部にマッチするインデックスが表示されます。
これを確認できたら`Next step`をクリックします。

![opensearch index pattern step2](https://i.gyazo.com/38947ff8134971d88205a7ee37f333fd.png)

`Time field`には`@timestamp`を選択します。これはFluent Bitで全ログインデックスに対して付与されています。

![opensearch index pattern step3](https://i.gyazo.com/5be92b25965f1e9fe6ee6efe7bda71e0.png)

下図のように、Elasticsearchで登録されている属性が確認できます。
これでインデックスパターンの登録は完了です。

![opensearch index pattern step4](https://i.gyazo.com/683f6d1e9137d881f5a01998da76f00c.png)

では、ログを確認しましょう。サイドバーより`Discover`を選択します。
![opensearch discovery sidebar](https://i.gyazo.com/e0afa3512848c8d623dfd633d6c89223.png)

以下のように、収集した全てのログが表示されていることが分かります。

![opensearch discovery](https://i.gyazo.com/af1d5d992c5926f2eb35f7242d02adb3.png)

このままでは分かりにくいので、`task-service`コンテナに絞ったり不要なログをフィルタリングすると以下のようになります。

![opensearch task-service](https://i.gyazo.com/371ae41590ec6f3994252a23230145c6.png)

レプリカ数に係わらず、`task-service`に関するログが集約して表示できていることが分かります。

ここでOpenSearch Dashboardsの具体的な使い方に言及するよりも、実際に自分で試してみたほうが実感できると思います。
左側の属性からフィルタリングや表示項目を調整したり、直接フィルタリング条件を指定したりしてみましょう。
直接入力する場合は、以下のOpenSearch Dashboardsの公式ドキュメントを参照してください(`+ Add Filter`リンクから選択方式で指定もできます)。
- <https://opensearch.org/docs/latest/dashboards/dql/>

ログだけにとどまらず、Fluent Bitによって収集されたKubernetesのメタ情報や、JSON形式のログの属性から多角的な視点でログを分析できることが分かるはずです。

:::info
現状OpenSearch Dashboardsの[ドキュメント](https://opensearch.org/docs/latest/dashboards/index/)はまだ整備されているとは言えない状況です。
場合によっては、フォーク元になっているKibana(v7.10)の[ドキュメント](https://www.elastic.co/guide/en/kibana/7.10/index.html)を参照した方が良いかもしれません。
:::

## クリーンアップ
HelmでインストールしたFluent Bitは以下で削除します。

```shell
helm uninstall aws-for-fluent-bit -n fluent-bit 
```

それ以外のリリース削除については、以下を参照してください。

- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/#クリーンアップ)

ここではOpenSearchも既存のTerraformの設定ファイルに含めていますので、ここで同時に削除されます。

## まとめ

今回はログ収集にFluent Bit、ログの一元管理と分析にAWS OpenSearchを使用し、アプリケーションのログ分析基盤を構築しました。

OpenSearchのElasticsearch由来の全文検索機能やKibana由来のリッチなUIにより、ログ分析がかなり楽になる印象を持った方も多いでしょう。

ただし、一般的にログのバックエンドサービスは非常に高いスループットでデータを処理する必要があります。
これに見合うようにAWS OpenSearchをスペックアップやクラスター構成を設定した場合は、かなりのコストを覚悟する必要があります。
このため、運用コストとサービス利用料との兼ね合いによっては、マネージドサービスではなくELK/EFKスタック(Elasticsearch/LogStash(Fluentd)/Kibana)を導入するケースもあるでしょう。

また、OpenSearchのような高機能サービスではなく、それよりは安価なCloudWatchで十分まかなえるケースも多いかと思います。
次回はログのバックエンドサービスとして、AWS OpenSearchをAmazon CloudWatchに置き換えてみたいと思います。

---
参照資料

- [OpenSearchドキュメント](https://opensearch.org/docs/latest)
- [AWS OpenSearchドキュメント](https://docs.aws.amazon.com/opensearch-service/index.html)
- [Fluent Bitドキュメント](https://docs.fluentbit.io/manual)