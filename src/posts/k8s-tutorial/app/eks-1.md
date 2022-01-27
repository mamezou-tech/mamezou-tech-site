---
title: クラスタ環境デプロイ - EKSクラスタ(AWS環境準備)
author: noboru-kudo
date: 2022-01-27
prevPage: ./src/posts/k8s-tutorial/app/container-registry.md
nextPage: ./src/posts/k8s-tutorial/app/eks-2.md
---

[前回](/containers/k8s/tutorial/app/container-registory/)で、コンテナレジストリを導入し、コンテナイメージ用のリポジトリを準備しました。
今回はアプリケーション開発編の仕上げとして、Kubernetesクラスタ環境のEKSにアプリケーションをデプロイしましょう。

一般的なプロジェクトでは商用環境だけでなく、結合テスト、受け入れテスト等、様々なフェーズに応じた環境が準備されています。
また、各環境で外部システムとの接続先等の環境固有の設定/構成が必要だったり、コストの関係で全て同等のスペックで準備することが難しいといったケースがほとんどです。
これらの構成は、各KubernetesリソースのYAMLファイルとして記述してきましたが、このままでは、環境毎にフルセットを準備する必要があります。

これを解決する手段として、環境差分を吸収する仕組みを導入する必要があります。
Kubernetesでは、現状は[Kustomize](https://kustomize.io/)または[Helm](https://helm.sh/)を使うことが一般的かと思います。両者はアプローチの仕方が異なり、どちらも一長一短があります。

Kustomizeは共通部分(base)に対して、各環境固有のパッチを当てるというスタイルです。Kubernetesのマニフェストファイルの知識さえあれば簡単に作成できることが大きなメリットです。
一方で、HelmはGoのテンプレート言語でマニフェストファイルを記述し、Helmチャートとしてパッケージング・配布する方式を採用しています。このテンプレート言語を習得するためのコストは高いですが、Kustomizeより高い柔軟性を持っているため、不特定多数のユーザーへ提供するプロダクトに向いています。
このような特性から、HelmはKubernetesのパッケージマネージャとして認知されています。有名どころのKubernetesのプロダクトのほとんどは、Helmチャートとして提供されており、[Artifact Hub](https://artifacthub.io/)から検索できます[^1]。

[^1]: 今回利用するECRではコンテナイメージだけでなく、Helmチャートも管理できます。興味のある方は[公式ドキュメント](https://docs.aws.amazon.com/AmazonECR/latest/userguide/push-oci-artifact.html)を参照してください。

今回作成したタスク管理ツールは内部向けのアプリケーションのため、Kustomizeで十分賄えますので、こちらを利用しましょう。
環境としては、今まで作成してきたローカル環境(local)と、仮想の商用環境(prod)としてAWS EKSクラスタを対象に、Kustomizeでマニフェストファイルを構成するものとします。

[[TOC]]

## 事前準備

Kustomize以外は今まで実施してきたものです。

### EKSクラスタ環境
今回は商用環境としてEKSを利用します。事前にEKSクラスタを準備してください。
利用ツールはeksctl、Terraformのどちらでも構いません。

- [クラスタ環境構築 - AWS EKS (eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl/)
  - 実行するマニフェストはKubernetesのv1.21互換です。`eksctl create cluster`の引数で`--version 1.21`以上を指定してください。
- [クラスタ環境構築 - AWS EKS (Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform/)

次に、構築したEKSクラスタへの外部通信環境を整えるために、以下のプロダクトをセットアップしてください。

- [Ingress - NGINX Ingress Controller](/containers/k8s/tutorial/ingress/ingress-nginx/)[^2]
- [Ingress - カスタムドメイン管理(external-dns)](/containers/k8s/tutorial/ingress/external-dns/)
- [Ingress - HTTPS通信(Cert Manager)](/containers/k8s/tutorial/ingress/https/)

[^2]: ALB等の他のIngress Controllerでも対応可能です。興味のある方はチャレンジしてください。

### ローカルKubernetes
今まで構築したローカル環境についても、Kustomizeを利用するように変更します。
未セットアップの場合は、以下を参考にローカル環境をセットアップしてください。

- [ローカル開発環境準備 - 実行環境(minikube)](/containers/k8s/tutorial/app/minikube/)
- [ローカル開発環境準備 - 自動化ツール(Skaffold)](/containers/k8s/tutorial/app/skaffold/)
- [ローカル開発環境準備 - ローカルAWS(LocalStack)](/containers/k8s/tutorial/app/localstack/)
- [Kubernetesマニフェスト作成 - Webアプリケーション(Deployment)](/containers/k8s/tutorial/app/web-app/)
- [Kubernetesマニフェスト作成 - バッチアプリケーション(CronJob/Job)](/containers/k8s/tutorial/app/batch/)

### コンテナレジストリ
前回構築したプライベートのコンテナレジストリはそのまま使用します。
未セットアップの場合は、以下を参考にセットアップしてください。

- [クラスタ環境デプロイ - コンテナレジストリ(ECR)](/containers/k8s/tutorial/app/container-registry/)

### Kustomize
現在Kustomizeはkubectl(v1.14以降)に組み込まれいるので、通常は別途インストールする必要がありません[^3]。
ですが、今回ローカル環境へのデプロイに使用する[Skaffold](https://skaffold.dev/)で、Kustomizeを使う場合は、別途インストールが必要です。
公式ドキュメントを参考に、Kustomizeをインストールしてください。

- [https://skaffold.dev/docs/install/](https://skaffold.dev/docs/install/)

[^3]: kubectlのバージョンによって、組み込まれているKustomizeのバージョンは大きく異なりますので注意してください。バージョンマッピングは[こちら](https://github.com/kubernetes-sigs/kustomize#kubectl-integration)を参照してください。

## AWSリソースの作成

まずは、アプリケーションで必要なAWSリソースを作成します。
前回ECRを作成したTerraformの設定(`main.tf`)に、DynamoDBやS3、およびアプリケーションのアクセス許可ポリシーを追加します。
ここに掲載すると長くなりますので、必要な部分のみを抜粋します。全体のファイルは、以下のGitHubリポジトリを参照してください。

- <https://github.com/mamezou-tech/k8s-tutorial/tree/main/app/terraform>

### DynamoDB/S3

タスク情報を永続化するDynamoDBテーブル(含むインデックス)と、レポート出力先のS3バケットを作成します。
ローカル環境でLocalStack上に構築した際は、[初期化スクリプト](https://github.com/mamezou-tech/k8s-tutorial/blob/main/app/k8s/v2-ans/localstack/localstack-init-scripts-config.yaml)をコンテナ起動時に実行していましたが、今回は本物のAWSです。
AWSリソース管理にはIaCツールのTerraform[^4]を利用して作成します。

[^4]: CloudFormation等の他のIaCツールを使っても構築できますので、実運用では組織・プロジェクトの方針によって利用ツールは変わってきます。

以下のようになります。

```hcl
resource "aws_dynamodb_table" "tasks" {
  name         = "task-tool-${var.env}-tasks"
  hash_key     = "task_id"
  attribute {
    name = "task_id"
    type = "S"
  }
  
  # (途中省略)
  
  global_secondary_index {
    name            = "user_index"
    hash_key        = "user_name"
    range_key       = "start_at"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "status_index"
    hash_key        = "status"
    range_key       = "updated_at"
    projection_type = "ALL"
  }
  billing_mode = "PAY_PER_REQUEST"
}

resource "aws_s3_bucket" "task_reports" {
  # グローバルで一意な名称に変更
  bucket = "task-tool-${var.env}-completed-task-report-bucket"
}
```

各リソースはTerraformのAWS Providerのドキュメントを見れば比較的容易に作成できるはずです。

- [aws_dynamodb_table](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table)
- [aws_s3_bucket](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket)

なお、S3のバケット名はグローバルで一意である必要がありますので、任意の名前に変更してください。

### Kubernetes

次に、Kubernetes側のセットアップです。 Terraformの[Kubernetes Provider](https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs)を使用します。

```hcl
data "aws_eks_cluster" "eks" {
  name = var.eks_cluster_name
}

data "aws_eks_cluster_auth" "eks" {
  name = var.eks_cluster_name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.eks.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.eks.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.eks.token
}

resource "kubernetes_namespace" "this" {
  metadata {
    name = var.env
  }
}
```

Kubernetesの認証設定を行い、アプリケーション用のNamespaceを作成しています。
今まではデフォルトのNamespaceを使っていましたが、今回は専用のNamespaceを設けます。

Namespace名については`var.env`として、外部からパラメータとして受け取れるようにしています。
パラメータについては、別ファイル(`variables.tf`)で定義しています。全てのパラメータは[こちら](https://github.com/mamezou-tech/k8s-tutorial/blob/main/app/terraform/variables.tf)を参照してください。

Terraformのパラメータ(variable)の使い方は、[公式ドキュメント](https://www.terraform.io/language/values/variables)を参照しくてださい。

### Podアクセス許可(IRSA)
AWSリソースを利用する場合は、セキュリティ上IAMで必要最小限のアクセスに制限するのが望ましいです。
EKSでは[IRSA(IAM Roles for Service Account)](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)という仕組みが用意されており、Podの単位でIAM Roleを割り当てることが可能です[^5]。

[^5]: External DNS等のAWSリソースにアクセスするインフラ系のOSS導入時にも、専用のIAMのRoleを作成し、それをServiceAccount経由でPodに割り当ててきました。

今回作成したアプリケーションについても、DynamoDBやS3といったAWSネイティブのサービスを利用しますので、この仕組みでアクセスポリシーを管理します。
以下タスク管理API(task-service)の部分のみ抜粋します。

```hcl
data "aws_iam_policy_document" "app_task_table" {
  statement {
    actions   = [
      "dynamodb:List*",
      "dynamodb:DescribeReservedCapacity*",
      "dynamodb:DescribeLimits",
      "dynamodb:DescribeTimeToLive"
    ]
    resources = [
      aws_dynamodb_table.tasks.arn
    ]
  }
  statement {
    actions   = [
      "dynamodb:BatchGet*",
      "dynamodb:DescribeTable",
      "dynamodb:Get*",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:BatchWrite*",
      "dynamodb:PutItem"
    ]
    resources = [
      aws_dynamodb_table.tasks.arn,
      "${aws_dynamodb_table.tasks.arn}/index/*"
    ]
  }
}

resource "aws_iam_policy" "app_task_table" {
  name   = "DynamoDBTaskTablePolicy"
  policy = data.aws_iam_policy_document.app_task_table.json
}

module "task_service" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                       = "~> 4.0"
  create_role                   = true
  role_path                     = "/app/"
  role_name                     = "TaskService"
  provider_url                  = var.oidc_provider_url
  role_policy_arns              = [aws_iam_policy.app_task_table.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:${var.env}:task-service"]
}

resource "kubernetes_service_account" "task_service" {
  metadata {
    name        = "task-service"
    namespace   = var.env
    annotations = {
      "eks.amazonaws.com/role-arn" = module.task_service.iam_role_arn
    }
  }
}
```

ここでは以下のことを実施しています。

1. DynamoDBの読み書き可能なポリシードキュメントを定義
2. IAM Policy(`DynamoDBTaskTablePolicy`)を作成
3. IAM PolicyをアタッチするIAM Role(`TaskService`)を作成(Terraformの[IAMモジュール](https://registry.terraform.io/modules/terraform-aws-modules/iam/aws/latest/submodules/iam-assumable-role-with-oidc)使用)。このRoleの引受可能な対象にKubernetesのServiceAccount(`system:serviceaccount:${var.env}:task-service`)を指定
4. IAM Roleを指定に紐づくServiceAccount`task-service`を作成

レポート出力バッチ(`task-reporter`)の方も同様で、こちらはDynamoDBに加えて、S3のポリシーについても追加します。
中身はタスク管理APIとほとんど同じです。具体的な内容は[こちら](https://github.com/mamezou-tech/k8s-tutorial/blob/main/app/terraform/main.tf)を参照してください[^6]。

[^6]: レポート出力バッチのDynamoDBポリシーはタスク管理APIと同じものにしていますが、ここは読み取りのみですので本来は別途専用のポリシーを作成する方が良いです。

### AWS/EKS反映

では、これらをAWS/EKSに反映しましょう。
Terraform側で必要なアクセス許可ポリシーは、以下に整理していますので、必要に応じて実行するユーザーに追加してください。

- [ECR](https://raw.githubusercontent.com/mamezou-tech/k8s-tutorial/main/app/terraform/ecr-policy.json)
- [DynamoDB/S3](https://raw.githubusercontent.com/mamezou-tech/k8s-tutorial/main/app/terraform/app-resources-policy.json)

また、eksctlでEKSクラスタ環境を構築した場合は、実行するTerraformのIAMユーザーに、Kubernetesへのアクセス権限を付与してください。

```shell
# IAMユーザー名は実行するユーザーに置き換えてください
eksctl create iamidentitymapping --cluster mz-k8s \
  --arn arn:aws:iam::<aws-account-id>:user/terraform \
  --group system:masters \
  --username terraform
```

もう1つ、EKSのIRSAを利用するには、EKS OIDCプロバイダのURL(`var.oidc_provider_url`)が必要です。
こちらはマネジメントコンソールより確認できます。トップページからEKS -> クラスター -> クラスター選択 -> 設定と進むと、以下に記載されています。

![](https://i.gyazo.com/7f2984db4fc659ec5e0769f04170258a.png)

後は実行するだけです。パラメータは構築済みのEKSの設定に置き換えてください。

```shell
# EKS OIDCプロバイダ。取得したEKSのOIDCプロバイダURLに置換してください
OIDC_PROVIDER_URL=<eks-oidc-provider-url>
# EKSクラスタ名
CLUSTER_NAME=mz-k8s

# module初期化
terraform init
# 追加内容チェック
terraform plan -var env=prod \
  -var oidc_provider_url=${OIDC_PROVIDER_URL} \
  -var eks_cluster_name=${CLUSTER_NAME}
# AWS/EKSに変更適用
terraform apply -var env=prod \
  -var oidc_provider_url=${OIDC_PROVIDER_URL} \
  -var eks_cluster_name=${CLUSTER_NAME}
```

マネジメントコンソールから、DynamoDBやS3のリソースが期待通りに作成されていることを確認してください。
以下はDynamoDBの例です。

![](https://i.gyazo.com/9d540643dc71362b5d7188429621798b.png)

また、Kubernetes側にも`prod`NamespaceにServiceAccount(`task-service`/`task-reporter`)が作成されているはずです。

```shell
kubectl get sa -n prod
```
```
NAME            SECRETS   AGE
default         1         5m44s
task-reporter   1         5m43s
task-service    1         5m43s
```

全て確認できれば、AWS/EKS側の準備は完了です。

以降は[クラスタ環境デプロイ - EKSクラスタ(Kustomize導入)](/containers/k8s/tutorial/app/eks-2/)へと続きます。
