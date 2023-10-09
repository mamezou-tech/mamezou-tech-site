---
title: クラスタ環境構築 - AWS EKS (Terraform)
author: noboru-kudo
date: 2021-10-09
updated: 2022-01-12
tags: [AWS, IaC]
prevPage: ./src/posts/k8s-tutorial/infra/aws-eks-eksctl.md
nextPage: ./src/posts/k8s-tutorial/ingress/ingress-nginx.md
---

前回に引き続き、AWSのKubernetesフルマネージドサービスのEKS(Elastic Kubernetes Service)でクラスタ環境を構築してみましょう。

[前回](/containers/k8s/tutorial/infra/aws-eks-eksctl/)は[eksctl](https://eksctl.io/)を利用してクラスタ環境を構築しましたが、今回はIaCツールとして高い人気を誇る[Terraform](https://www.terraform.io/)を使います。

TerraformはHashiCorp社で開発されたマルチクラウド対応のIaCツールで、AWSだけでなくAzure、GCP等にも対応します。
[Terraform Language](https://developer.hashicorp.com/terraform/language)(拡張子が`.tf`)という独自の構成記述言語を採用しており、YAML/JSONを使うCloudFormationよりも高い表現力で簡潔に設定を記述できます。
有償版もありますが、CLIだけであれば無償で利用でき、実際にこのツールでクラウドインフラを管理しているプロジェクトもかなり多いのではと思います。


## 事前準備

以下の3つのツールを事前にセットアップしましょう。

### Terraform CLI
本記事でメインに利用します。現時点で最新の`1.0.8`を使います。
環境に応じて[こちら](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli?in=terraform%2Faws-get-started)よりセットアップしてください。

### kubectl
kubectlはk8sの操作するための必須ツールです。[こちら](https://kubernetes.io/docs/tasks/tools/#kubectl)を参照して準備してください。

### AWS CLI
ユーザー認証でAWS CLI(v2)も利用します。
v1利用または未セットアップの場合は[こちら](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/install-cliv2.html)を参考にインストールしてください。

## Terraform CLIのアクセス許可設定
eksctl同様にTerraformではクラスタの作成をするにはEKSだけでなく、VPC生成等様々なアクセス許可をIAMユーザーに付与する必要があります。
そのユーザーは広範囲のアクセス許可が必要となりますので、将来的にパイプライン上で実行することも踏まえてTerraform専用のIAMユーザーを作成しておくとよいでしょう。

設定が必要なポリシーは以下です。
1. EKSクラスタ構築: [こちら](https://raw.githubusercontent.com/mamezou-tech/k8s-tutorial/main/infra/terraform/terraform-policy.json)に必要なPolicyファイルを用意しました。
2. Terraformのリモートステートアクセス: こちらはTerraformの公式ページに記載があります。
  [S3 Bucket Permissions](https://developer.hashicorp.com/terraform/language/settings/backends/s3#s3-bucket-permissions)

これでIAMユーザの作成とポリシーの設定をマネジメントコンソールから行ってください。
次に作成したIAMユーザーのアクセスキー、シークレットを環境変数に指定してください。

```shell
export AWS_ACCESS_KEY_ID=xxxxxxxxxxxxxxx
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxx
export AWS_DEFAULT_REGION=ap-northeast-1
```

## リモートステート用のバケット作成

IaCツールであるTerraformは、適用状態をどこかに保管する必要があります。
特に何も指定しなければローカル(`terraform.tfstate`)に保管されますが、このままでは実行するマシンが限定されてしまい、チーム開発やパイプラインでの運用に向きません。
したがって、各クラウドプロバイダーが提供するクラウドストレージ上にその状態を保管するのが一般的です(リモートステートといいます)。

今回はローカルステートでも良いのですが、ベストプラクティスに従い、AWSのS3に保管します。

事前にTerraform専用のS3バケットを作成しておきましょう(デフォルトの設定のままで構いません)。

![](https://i.gyazo.com/a211baaf7dd1fdd8176bc0c2b624248b.png)

ここでは`mz-terraform`という名前のバケットを作成しました。バケット名はグローバルで一意である必要がありますので、任意の名前に変更してください。

## EKSクラスタ構成情報の記述(Terraform Language)

ここまで準備ができたら、EKSクラスタ環境を作成していきましょう。

Terraformには[Module](https://developer.hashicorp.com/terraform/language/modules)という仕組みがあり、実績のあるサードパーティや社内で作成した設定を再利用する形で利用できます。
ここでは、以下のAWS Moduleを利用してクラスタ環境を構築します。
- [terraform-aws-modules/vpc](https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest)
- [terraform-aws-modules/eks](https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest)

Terraform実行用に任意のディレクトリ(Root Moduleといいます)を作成して、そこに構成ファイルを配置しましょう。
ここでは`terraform`というディレクトリを作成し[^1]、その中にmain.tfというファイルを作成しました[^2]。

[^1]: 実運用では環境ごと(dev/staging/prod等)にディレクトリを作成して、各リソースはモジュール(共通リソース)として別管理とすることが多いかと思います。
[^2]: ファイル名は任意の名前で構いませんが、main.tfを使うこと一般的です。[こちら](https://www.terraform-best-practices.com/)が参考になります。

このファイル内にTerraform LanguageでEKSの構成を記述していきます。
今回は1ファイルに全て記述していきますが、実運用では設定が肥大化しないようモジュールとして作成するなどメンテナンスしやすい形に分割しましょう。

それでは、順を追ってEKSの構成を記述していきましょう。

### Terraform設定

```hcl
terraform {
  required_version = "~> 1.0.8"
  # リモートステートの設定
  backend "s3" {
    bucket = "mz-terraform"
    key    = "eks-state"
    region = "ap-northeast-1"
  }
  # 実行するProviderの条件
  required_providers {
    aws       = {
      source  = "hashicorp/aws"
      version = "~> 3.71.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "2.5.0"
    }
  }
}
```

まず最初に`terraform`ブロックにはTerraform自体の設定を記述します。公式ガイドは[こちら](https://developer.hashicorp.com/terraform/language/settings)です。

Terraformはバージョンアップで互換性のない変更が頻繁に発生しますので`required_version`でTerraform CLIのバージョンを指定しておくことをお勧めします。

`backend`ブロックではリモートステート(今回はS3バケット)の情報を記述します。
今回はここに直接記述していますが、通常は適用する環境によってリモートステートは異なりますので、別ファイルに記述してCLIの入力とすることが多いかと思います([Partial Configuration](https://developer.hashicorp.com/terraform/language/settings/backends/configuration#partial-configuration)参照)。
ここでは、先程作成したリモートステート用のS3バケットを`bucket`/`region`に指定します。`key`についてはバケット内で重複しなければ任意の名前で構いません。

`required_providers`ブロックでは利用するTerraformの[Provider](https://developer.hashicorp.com/terraform/language/providers)のバージョンを記述します。
利用できるProviderは[Terraform Registry](https://registry.terraform.io/browse/providers)で管理されています。
ProviderはAWS、Azure等のクラウドリソースだけでなく、SaaS/ミドルウェア等の様々なProviderが存在します。
このため、対象Providerがあれば、Terraform内でクラウドリソースと合わせて構成管理対象にできます。
また、Terraform同様に、Providerについても頻繁にアップデートされていきますので、バージョンはある程度固定することが望ましいです。
指定するバージョンはレンジ指定も可能です([こちら](https://developer.hashicorp.com/terraform/language/expressions/version-constraints#version-constraint-syntax)参照)。
今回はVPC/EKSの構築用に[AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest)と[Kubernetes Provider](https://registry.terraform.io/providers/hashicorp/kubernetes/latest)を利用しますので、こちらの情報を設定しています。

### AWS Provider

```hcl
provider "aws" {}
```

Terraformブロックでバージョン条件を記述しましたが、ここで実際に利用するProviderを`provider`ブロックで指定します[^3]。
この定義を記述することで、EC2やVPC等AWSインフラが提供する様々なリソースを作成・更新できます。
今回は、事前にAWS CLIでアクセスキー等の環境変数を指定していますので、上記例ではシンプルにProviderの定義のみで問題ありません。
そうでない場合は、ここにAWSへのアクセス設定を記述する必要があります。必要に応じて[公式ガイド](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)を参照して設定を追記してください。

[^3]: Terraformの以前のバージョンではここでバージョンを指定していましたが、現在はterraformブロックで指定していますので`provider`ブロックでのバージョン指定は不要です。

### VPCリソース

```hcl
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "mz-eks-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["ap-northeast-1a", "ap-northeast-1c", "ap-northeast-1d"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
  enable_vpn_gateway = false
}
```

続いて、EKSリソースを作成するためのネットワークリソースを作成します。
AWS Providerで提供されている各種リソースを用いて作成する必要がありますが、1からネットワークリソースを作成するのはそれなりのAWSインフラの知識が必要です。
誤った設定で構築するとネットワークアクセスができなかったり、セキュリティホールになったりするため、それなりの労力が必要になります。
前述の通り、ここはTerraformのAWS向けのModuleである[terraform-aws-module/vpc](https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest)を活用して簡単に構築しています。

Moduleを利用するには`module`ブロックを配置し、その中に`source`としてterraform-aws-modulesのVPCを指定し、そこにModuleのパラメータを指定してます。

上記指定だけで、東京リージョンの3つのAZそれぞれにプライベートサブネット、パブリックサブネットを配置したプライベートネットワークを作成できます。
他にも多数のオプションが指定可能ですので、[公式ドキュメント](https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest)を参照してカスタマイズしてください。

### EKSリソース

```hcl
module "eks" {
  source                  = "terraform-aws-modules/eks/aws"
  version                 = "18.0.5"
  cluster_version         = "1.21"
  cluster_name            = "mz-k8s"
  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.private_subnets
  enable_irsa             = true
  eks_managed_node_groups = {
    mz_node = {
      desired_size = 2
      instance_types   = ["m5.large"]
    }
  }
  # デフォルトのSecurityGroupでは動作しないため以下を追加
  node_security_group_additional_rules = {
    # AdmissionWebhookが動作しないので追加指定
    admission_webhook = {
      description = "Admission Webhook"
      protocol    = "tcp"
      from_port   = 0
      to_port     = 65535
      type        = "ingress"
      source_cluster_security_group = true
    }
    # Node間通信を許可
    ingress_node_communications = {
      description = "Ingress Node to node"
      protocol    = "tcp"
      from_port   = 0
      to_port     = 65535
      type        = "ingress"
      self        = true
    }
    egress_node_communications = {
      description = "Egress Node to node"
      protocol    = "tcp"
      from_port   = 0
      to_port     = 65535
      type        = "egress"
      self        = true
    }
  }
}

output "aws_auth_config_map" {
  value = module.eks.aws_auth_configmap_yaml
}
```

ここで、先程構築したVPCの上にEKSリソースを配置します。
EKSリソースについても1から作成するにはかなりの労力が必要なため、EKS用のTerraform Moduleの[terraform-aws-modules/eks](https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest)を使うのが便利です。
先程と同様に`module`ブロックを配置し、EKSのTerraform Moduleを`source`に指定し、EKSの設定情報を記述していきます。

- `cluster_version`で作成するKubernetesのバージョンを指定できます。こちらは今後のバージョンアップ運用のためにも指定しておくようにしましょう。利用可能なバージョンは[こちら](https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/kubernetes-versions.html)から確認できます。
- `cluster_name`は必須です。任意のクラスタ名を指定してください(ここでは`mz-k8s`を指定)。
- `vpc_id`/`subnet_ids`の部分で作成したVPCリソースのVPC IDとプライベートサブネットを指定し、その上にEKSクラスタを配置するように指示します(値参照のシンタックスは[こちら](https://developer.hashicorp.com/terraform/language/expressions/references)参照)。
- `enable_irsa`はIRSA(IAM Role for ServiceAccount)を有効化しています。これはPodレベルでAWSリソースへのアクセス許可を制限するEKSの機能です。
- `eks_managed_node_groups`でEKSのマネージドノードグループを作成することを指定しています。他にもセルフマネージドやFargateにも対応しています。 今回はノード数2で`m5.large`のインスタンスタイプでノードを作成するように指定しています。

また`output`として`aws_auth_config_map`を指定しました。これは開発者のEKSへのアクセス許可を設定するのために必要なもので後で使用します。
  
それ以外にも多数の[オプション](https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest)が用意されていますので、必要に応じてカスタマイズしてください。

### Kubernetesアクセス許可設定

```hcl
# EKSクラスタリソースを参照
data "aws_eks_cluster" "eks" {
  name = module.eks.cluster_id
}

data "aws_eks_cluster_auth" "eks" {
  name = module.eks.cluster_id
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.eks.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.eks.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.eks.token
}
```

ここでは、TerraformからEKSクラスタへのアクセス設定をしています。
`data`ブロックでEKS関連のリソースを取得して、`provider`ブロックで[Kubernetes Provider](https://registry.terraform.io/providers/hashicorp/kubernetes/latest)のEKSクラスタへの認証情報を設定しています。

今回はKubernetesリソースを作成しませんが、後のチュートリアルではこの設定を使用していきます。
Kubernetes Providerで作成可能なリソースは[公式ドキュメント](https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs)に記載されていますが、ほぼ全てのリソースがTerraformで管理可能なことが分かります。
NamespaceやNetworkPolicy等のインフラリソースは、クラスタ環境構築のこの段階で作成しておくとよいでしょう。

## Kubernetesクラスタ環境構築

ここまででくると、後はTerraform CLIを実行してEKSリソースを作成するだけです。

先程作成したRoot Moduleディレクトリに移動して以下の手順でコマンドを実行します[^4]。

[^4]: パイプラインに載せる場合は[こちら](https://developer.hashicorp.com/terraform/tutorials/automation/automate-terraform)を参照してください。

### terraform init

まずは、利用するProvider/Moduleを初期化する必要があります。以下のコマンドを実行します。

```shell
terraform init
```

以下のように出力されればOKです。

```
Initializing modules...
(省略)
Initializing the backend...

Successfully configured the backend "s3"! Terraform will automatically
use this backend unless the backend configuration changes.

Initializing provider plugins...
(省略)
Terraform has been successfully initialized!
(省略)
```

基本的には1回だけ実行すれば良いですが、ProviderやModuleの新規追加やバージョンに変更があった場合は、再度実行する必要があります。
実行すると、Root Moduleディレクトリ直下に`.terraform`というディレクトリが作成され、その中にProviderやModuleがダウンロードされているのが分かります。

### terraform plan

次に、Terraformの実行計画を確認します。
この手順はスキップできますが、Terraformで管理するものの影響範囲は大きいので、ここで一度確認ステップを踏むようにしましょう。

```shell
terraform plan
```

非常に長いので大部分省略しますが、以下のように差分を示してくれます。

```
Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:
  + create
 <= read (data resources)

Terraform will perform the following actions:

  # data.aws_eks_cluster.eks will be read during apply
  # (config refers to values not yet known)
 <= data "aws_eks_cluster" "eks"  {
      + arn                       = (known after apply)
      + certificate_authority     = (known after apply)
      + created_at                = (known after apply)
      + enabled_cluster_log_types = (known after apply)
      + endpoint                  = (known after apply)
      + id                        = (known after apply)
      + identity                  = (known after apply)
      + kubernetes_network_config = (known after apply)
      + name                      = (known after apply)
      + platform_version          = (known after apply)
      + role_arn                  = (known after apply)
      + status                    = (known after apply)
      + tags                      = (known after apply)
      + version                   = (known after apply)
      + vpc_config                = (known after apply)
    }
 # 以下省略
```

今回は新規構築なので新規作成(`+ create`)のみですが、変更時にはTerraformが変更点に対してどのようなオペレーション(更新や削除・新規作成等)を行うかを示してくれます。
変更内容に問題ないか必ずチェックするようにしましょう。

### terraform apply

それでは、実際にEKSリソースを作成しましょう。以下のコマンドを実行します。

```shell
terraform apply
```

先程の`terraform plan`同様に実行計画が出力され、本当に実行してよいかを聞かれます[^5]。問題なければ`yes`と入力してください。

[^5]: `-auto-approve`オプションを指定するとそのまま実行されます。

```
module.vpc.aws_eip.nat[0]: Creating...
module.eks.aws_iam_policy.cluster_elb_sl_role_creation[0]: Creating...
module.vpc.aws_vpc.this[0]: Creating...
module.eks.aws_iam_role.cluster[0]: Creating...
module.vpc.aws_eip.nat[0]: Creation complete after 0s [id=eipalloc-08d6b0d113dbca0ab]
module.vpc.aws_vpc.this[0]: Creation complete after 1s [id=vpc-045a2061b8154696e]
(以下省略)
```

Terraformが各リソース作成を行っている様子が確認できます。
作成が完了するまでしばらく待ちましょう(手元の環境だと15分程で完了しました)。

作成が完了すると、以下のようにマネジメントコンソールからEKSクラスタの情報を参照できます。

![](https://i.gyazo.com/ce5c9fbd9e78323094623311135c6b06.png)

## 開発者ユーザーのアクセス許可

続いて、Terraform以外の一般開発ユーザーがEKSへ接続できるようにしましょう[^6]。
eksctlのときは、クラスタ環境構築後に`eksctl create iamidentitymapping`で作成しましたが、ここではEKS内の`aws-auth`ConfigMapを直接修正しましょう。

[^6]: TerraformのEKSモジュールv18からKubernetes Providerへの依存がなくなり、aws-authのネイティブサポートがなくなったため、手動で設定が必要になりました。

Terraformのアウトプットとして、`aws-auth`というConfigMapを設定していますのでそれを任意のYAMLファイルに出力します。

```shell
terraform output aws_auth_config_map > aws-auth-configmal.yaml
```

このファイルを編集し、任意のIAMユーザーを追加しましょう(出力内容から先頭(`<<EOT`)と最後(`EOT`)は削除してください)。
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: arn:aws:iam::xxxxxxxxxxx:role/mz_node-eks-node-group-20220111234326178700000001
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        - system:bootstrappers
        - system:nodes
  # 以下を追加
  mapUsers: |
    - userarn: arn:aws:iam::xxxxxxxxxxx:user/xxxxxx
      username: xxxxxx
      groups:
        - system:masters
```

上記のように`mapUsers`セクションを追加し、開発者向けのIAMユーザーのARNを`userarn`、対応するユーザー名を`username`に指定してください。
前回同様に管理者権限の`system:masters`を指定していますが、必要に応じて権限を見直してください。
スイッチロール等IAM Roleで利用する場合は`mapRoles`の方に同様の記述を追加してください。

そして、現在のTerraformユーザのkubectlの接続設定(kubeconfig)を更新します。

```shell
aws eks update-kubeconfig --name mz-k8s
```

後は編集後のConfigMapを反映します。

```shell
kubectl apply -f aws-auth-configmal.yaml
```

これで、構築したEKSクラスタに指定したIAMユーザーが利用できるようになります。

## クラスタ環境への接続

それでは、作成したEKSクラスタ環境に、kubectlからアクセスしてみましょう。
先程、ConfigMapに開発者のIAMユーザーを登録済みですので、開発者側でkubectl接続情報を更新するのみです。
これはAWS CLIで実施します。手順はeksctl同様です。以下はTerraform CLIを実行したものとは別のターミナルから実行してください。

```shell
# v2であることを確認
aws --version
# 未設定の場合はAWS認証情報設定
aws configure
```

上記でAWS CLIのバージョンとAWSアカウントへの認証情報の設定をすれば以下のコマンドでkubeconfigをEKSクラスタへの接続情報を追加できます。

```shell
aws eks update-kubeconfig --name mz-k8s
```

kubeconfigの内容を見てみましょう。

```shell
kubectl config view
```

```yaml
# 必要部分を抜粋・整形
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: DATA+OMITTED
    server: https://xxxxxxxxxxxxxxxxxxxxxxxxxxxx.sk1.ap-northeast-1.eks.amazonaws.com
  name: arn:aws:eks:ap-northeast-1:xxxxxxxxxxxx:cluster/mz-k8s
contexts:
- context:
    cluster: arn:aws:eks:ap-northeast-1:xxxxxxxxxxxx:cluster/mz-k8s
    user: arn:aws:eks:ap-northeast-1:xxxxxxxxxxxx:cluster/mz-k8s
  name: arn:aws:eks:ap-northeast-1:xxxxxxxxxxxx:cluster/mz-k8s
current-context: arn:aws:eks:ap-northeast-1:xxxxxxxxxxxx:cluster/mz-k8s
users:
- name: arn:aws:eks:ap-northeast-1:xxxxxxxxxxxx:cluster/mz-k8s
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1alpha1
      args:
      - --region
      - ap-northeast-1
      - eks
      - get-token
      - --cluster-name
      - mz-k8s
      command: aws
      env:
      - name: AWS_PROFILE
        value: default
      interactiveMode: IfAvailable
      provideClusterInfo: false
```

eksctlのときと同じようにEKSクラスタへの接続情報が設定されます。
EKSクラスタにアクセスしてみましょう。

```shell
kubectl cluster-info
```

以下のようにクラスタ情報が出力されれば設定完了です。
```
Kubernetes control plane is running at https://xxxxxxxxxxxxxxxxxxx.sk1.ap-northeast-1.eks.amazonaws.com
CoreDNS is running at https://xxxxxxxxxxxxxxxxxxxxxxxx.sk1.ap-northeast-1.eks.amazonaws.com/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
```

## 動作確認

最後に、作成したEKSクラスタにコンテナをデプロイして動作確認しましょう。

[eksctlで環境構築](/containers/k8s/tutorial/infra/aws-eks-eksctl/#動作確認)した際には`kubectl run`コマンドでアドホックにPodを作成しましたが、通常の実運用では事前にGitでバージョン管理されたマニフェストファイルを準備します。
今回はDeploymentリソースのマニフェストファイルを用意してNginxを起動します。

以下のYAMLファイルを用意しましょう。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - name: http
              containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
    - port: 80
      targetPort: http
```

Deploymentリソースは、デプロイを管理するKubernetesのリソースで、主にステートレスなアプリケーションで使われます。
このDeploymentリソースを使うとデプロイはバージョン管理され、ロールバックや一時停止等を行うことが可能になります。
Deploymentの詳細は[こちら](/containers/k8s/tutorial/app/web-app/#deployment)を参照してください。
ここでは、`nginx:latest`イメージを2台構成(`replicas: 2`)で常時起動するように指示しています。

一方で、ServiceリソースはPodへのアクセスに対して静的なエンドポイントを提供する役目を果たします。
ここでは`type`としてLoadBalancerを指定しています。これにより、AWS上にELBリソースを作成し、外部からのトラフィックを受付けてNginxのPodにルーティングします。

これを`kubectl apply`コマンドを利用して作成します。`-f`オプションで作成したファイル(ここでは`nginx.yaml`というファイルで作成)を指定します。

```shell
kubectl apply -f nginx.yaml
```

特にエラーが発生していなければ、しばらく時間をおいて各リソースが作成されたことを確認しましょう。

```shell
kubectl get deploy,rs,pod,svc
```

```
NAME                    READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/nginx   2/2     2            2           84s

NAME                               DESIRED   CURRENT   READY   AGE
replicaset.apps/nginx-86b8cc866b   2         2         2       84s

NAME                         READY   STATUS    RESTARTS   AGE
pod/nginx-86b8cc866b-4vbw8   1/1     Running   0          84s
pod/nginx-86b8cc866b-7wt9z   1/1     Running   0          84s

NAME                 TYPE           CLUSTER-IP       EXTERNAL-IP                                                                  PORT(S)        AGE
service/kubernetes   ClusterIP      172.20.0.1       <none>                                                                       443/TCP        106m
service/nginx        LoadBalancer   172.20.153.124   xxxxxxxxxxxxxxxxxxxxxx-xxxxxx.ap-northeast-1.elb.amazonaws.com   80:32065/TCP   84s
```

Deployment/ReplicaSet/Pod/Serviceリソースが作成されていることが分かります。
また、eksctlで実施したとき同様に、Serviceリソースの`EXTERNAL-IP`には外部公開向けのELBのURLが出力されています。
もちろんこれはマネジメントコンソールからも確認できます(メニューからEC2 -> ロードバランサー選択)。

![](https://i.gyazo.com/960d92b1bad70006fc663fd806ddec9b.png)

80番ポートからトラフィックを受付け、Kubernetesのノードにルーティングしている様子が分かります。

ブラウザからURLにアクセスしてみましょう。

![](https://i.gyazo.com/3c087bd7f960639aff2224bc12cea6c9.png)

NginxのWelcomeページが表示されれば成功です。
接続できない場合は、DNSレコードが伝播されていない可能性がありますので、しばらく待ってから試してみてください。

## クリーンアップ

まず、先程作成したNginx関連のリソースを削除します。
Serviceリソースが削除されたことを検知すると、EKSは不要になったELBも削除します。

```shell
kubectl delete -f nginx.yaml
```

ELBが削除されたことを確認したら、terraformユーザーのターミナルに戻り、以下のコマンドでTerraformが管理している全てのリソースを削除ましょう。

```shell
terraform destroy
```

本当に削除して良いか聞かれますので、`yes`を入力してください。Terraformで管理している全てのリソースは削除されます。
しばらく時間がかかりますが、最後まで削除されたことはしっかりと確認しましょう。エラーになっていてリソースが残ってしまうとそのリソースに対して課金されることになります。

---
参照資料

- Terraformドキュメント：<https://developer.hashicorp.com/terraform/docs>
- Terraform AWS Provider: <https://registry.terraform.io/providers/hashicorp/aws/latest/docs>
- Terraform Kubernetes Provider: <https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs>

---
更新情報

- 2022-01-12: Terraform EKSモジュールのv18で大きくインターフェースが変更されたため、本文の内容と構成を見直しました。
