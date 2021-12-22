---
title: クラスタ環境構築 - AWS EKS (Terraform)
author: noboru-kudo
date: 2021-10-09
prevPage: ./src/posts/k8s-tutorial/infra/aws-eks-eksctl.md
nextPage: ./src/posts/k8s-tutorial/ingress/ingress-nginx.md
---

前回に引き続きAWSのKubernetesフルマネージドサービスのEKS(Elastic Kubernetes Service)でクラスタ環境を構築してみましょう。

[前回](/containers/k8s/tutorial/env/aws-eks-eksctl/)は[eksctl](https://eksctl.io/)を利用してクラスタ環境を構築しましたが、今回はIaCツールとして高い人気を誇る[Terraform](https://www.terraform.io/)を使います。

TerraformはHashiCorp社で開発されたマルチクラウド対応のIaCツールで、AWSだけでなくAzure、GCP等にも対応します。
[Terraform Language](https://www.terraform.io/docs/language/index.html)(拡張子が`.tf`)という独自の構成記述言語を採用しており、YAML/JSONを使うCloudFormationよりも高い表現力で簡潔に設定を記述することが可能です。
有償版もありますが、CLIだけであれば無償で利用することが可能で、実際にこのツールでクラウドインフラを管理しているプロジェクトもかなり多いのではと思います。

[[TOC]]

## 事前準備

以下の3つのツールを事前にセットアップしましょう。

### Terraform CLI
本記事でメインに利用します。現時点で最新の`1.0.8`を使います。
環境に応じて[こちら](https://learn.hashicorp.com/tutorials/terraform/install-cli?in=terraform/aws-get-started)よりセットアップしてください。

### kubectl
kubectlはk8sの操作するための必須ツールです。[こちら](https://kubernetes.io/docs/tasks/tools/#kubectl)を参照して準備してください。

### AWS CLI
ユーザー認証でAWS CLI(v2)も利用します。
v1利用または未セットアップの場合は[こちら](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/install-cliv2.html)を参考にインストールしてください。

## Terraform CLIのアクセス許可設定
eksctl同様にTerraformではクラスタの作成をするにはEKSだけでなく、VPC生成等様々なアクセス許可をIAMユーザーに付与する必要があります。
そのユーザーは広範囲のアクセス許可が必要となりますので、将来的にパイプライン上で実行することも踏まえてTerraform専用のIAMユーザーを作成しておくとよいでしょう。

設定が必要な必要最低限のポリシーは以下です。
1. EKSクラスタ構築ポリシー: 利用するTerraformのEKSモジュールに記載があります。
  [terraform-aws-modules/terraform-aws-eks iam-permissions.md](https://github.com/terraform-aws-modules/terraform-aws-eks/blob/master/docs/iam-permissions.md)
1. Terraformのリモートステートアクセス: こちらはTerraformの公式ページに記載があります。
  [S3 Bucket Permissions](https://www.terraform.io/docs/language/settings/backends/s3.html#s3-bucket-permissions)

これでIAMユーザの作成とポリシーの設定をマネジメントコンソールから行います。

ポリシーを設定したIAMユーザー(terraform)は以下のようになります。
![](https://i.gyazo.com/a6eaf35a1247be84478aa845d4c3ccce.png)

上記で作成したIAMユーザーのアクセスキー、シークレットを環境変数に指定します。

```shell
export AWS_ACCESS_KEY_ID=xxxxxxxxxxxxxxx
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxx
export AWS_DEFAULT_REGION=ap-northeast-1
```

## リモートステート用のバケット作成

IaCツールであるTerraformは適用した現在の状態をどこかに保管する必要があります。
特に何も指定しなければローカルディレクトリ(`terraform.tfstate`)に保管されます(ローカルステートといいます)が、このままでは実行するマシンが限定されてしまい複数人で管理したり、パイプライン等でステートレスな環境での運用に向きません。
したがって、各クラウドプロバイダーが提供するクラウドストレージ上にその状態を保管するのが一般的です(こちらはリモートステートといいます)。

今回はローカルステートでも良いのですが、ベストプラクティスに従いAWSのS3に保管するようにします。

事前にTerraform専用のS3バケットを作成しておきましょう(デフォルトの設定のままで構いません)。

![](https://i.gyazo.com/a211baaf7dd1fdd8176bc0c2b624248b.png)

ここでは`mz-terraform`という名前のバケットを作成しました。バケット名はグローバルで一意である必要がありますので任意の名前に変更してください。

## EKSクラスタ構成情報の記述(Terraform Language)

ここまで準備ができたらEKSクラスタ環境を作成していきましょう。

Terraformには[Module](https://www.terraform.io/docs/language/modules/index.html)という仕組みがあり、実績のあるサードパーティや社内で作成した設定を再利用する形で利用することができます。
ここでは以下のAWS Moduleを利用してクラスタ環境を構築します。
- [terraform-aws-modules/vpc](https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest)
- [terraform-aws-modules/eks](https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest)

Terraform実行用に任意のディレクトリ(Root Moduleといいます)を作成して、そこに構成ファイルを配置しましょう。
ここでは`terraform`というディレクトリを作成し[^1]、その中にmain.tfというファイルを作成しました[^2]。

[^1]: 実運用では環境ごと(dev/staging/prod等)にディレクトリを作成して、各リソースはモジュールとして共通リソースとして別管理とすることが多いかと思います。
[^2]: ファイル名は任意の名前で構いませんが、main.tfを使うこと一般的です。[こちら](https://www.terraform-best-practices.com/)が参考になります。

このファイル内にTerraform LanguageでEKSの構成を記述していきます。今回は簡潔さのために1ファイルに全て記述していきますが、実運用では設定が肥大化しないようモジュールとして作成するなどメンテナンスしやすい形に分割しましょう。

それでは順を追ってEKSの構成を記述していきましょう。

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
    aws = {
      source  = "hashicorp/aws"
      version = "3.62.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "2.5.0"
    }
  }
}
```

まず最初に`terraform`ブロックにはTerraform自体の設定を記述します。公式ガイドは[こちら](https://www.terraform.io/docs/language/settings/index.html)です。

Terraformはバージョンアップでシンタックス等の互換性のない変更が頻繁に発生しますので`required_version`でTerraform CLIのバージョンを指定しておくことをお勧めします。

`backend`ブロックではリモートステート(今回はS3バケット)の情報を記述します。
通常は適用する環境によってリモートステートは異なりますので別ファイルに記述してCLIの入力とすることが多いかと思います([Partial Configuration](https://www.terraform.io/docs/language/settings/backends/configuration.html#partial-configuration)参照)。
ここでは先程作成したリモートステート用のS3バケットを`bucket`/`region`に指定します。`key`についてはバケット内で重複しなければ任意の名前で構いません。

`required_providers`ブロックでは利用するTerraformの[Provider](https://www.terraform.io/docs/language/providers/index.html)のバージョンを記述します。
利用できるProviderは[Terraform Registry](https://registry.terraform.io/browse/providers)で管理されています。
ProviderはAWS、Azure等のクラウドリソースだけでなく、SaaS/ミドルウェア等の様々なProviderが存在しますので自分で構築する環境で使えるものがあればTerraform内でクラウドリソースと合わせて構成管理対象とすることが可能です。
また、Terraform同様にProviderについても頻繁にアップデートされていきますのでバージョンは固定することが望ましいです。上記はバージョンを完全に固定させていますがレンジ指定も可能です([こちら](https://www.terraform.io/docs/language/expressions/version-constraints.html#version-constraint-syntax)参照)。
今回はVPC/EKSの構築用に[AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest)と[Kubernetes Provider](https://registry.terraform.io/providers/hashicorp/kubernetes/latest)を利用しますのでこちらのバージョン情報を設定しています。

### AWS Provider

```hcl
provider "aws" {}
```

Terraformブロックでバージョン条件を記述しましたが、ここで実際に利用するProviderを`provider`ブロックで指定します[^3]。
この定義を記述することでEC2やVPC等AWSインフラが提供する様々なリソースを作成・更新することができます。
今回は事前にAWS CLIでアクセスキー等の環境変数を指定していますので、上記例ではシンプルにProviderの定義のみで中身は空で問題ありません。
そうでない場合は、ここにAWSへのアクセス情報を記述する必要があります。必要な場合は[公式ガイド](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)を参照して記述を追加してください。

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

続いてEKSリソースを作成するためのネットワークリソースを作成します。
AWS Providerで提供されている各種AWSリソースを用いて作成する必要がありますが、1からネットワークリソースを作成するのはそれなりのAWSインフラの知識が必要で、誤った設定で構築するとネットワークアクセスができなかったり、セキュリティホールになったりするためそれなりの労力と時間が必要になります。
前述の通り、ここはTerraformのAWS向けのModuleである[terraform-aws-module/vpc](https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest)を活用して簡単に構築しています。

Moduleを利用するには`module`ブロックを配置し、その中に`source`としてterraform-aws-modulesのVPCを指定し、そこにModuleのパラメータを指定してます。

上記指定だけで東京リージョンの3つのAZそれぞれにプライベートサブネット、パブリックサブネットを配置した外部通信可能なネットワークを作成することができます。
他にも多数のオプションが指定可能ですので、[公式ドキュメント](https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest)を参照してカスタマイズしてください。

### EKSリソース

```hcl
module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  cluster_version = "1.21"
  cluster_name    = "mz-k8s"
  
  vpc_id          = module.vpc.vpc_id
  subnets         = module.vpc.private_subnets
  enable_irsa = true
  node_groups = {
    mz_node = {
      desired_capacity = 2
      instance_types   = ["m5.large"]
    }
  }
  map_users = [
    {
      userarn  = "arn:aws:iam::xxxxxxxxxxxx:user/noboru-kudo"
      username = "noboru-kudo"
      groups   = ["system:masters"]
    }
  ]
}
```

ここで先程構築したVPCの上にEKSリソースを配置します。
EKSリソースについても1から作成するにはかなりの労力が必要なため、EKS用のTerraform Moduleの[terraform-aws-modules/eks](https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest)を使うのが便利です。
先程と同様に`module`ブロックを配置し、EKSのTerraform Moduleを`source`に指定し、EKSの設定情報を記述していきます。

- `cluster_version`で作成するk8sのバージョンを指定することができますので、こちらは今後のバージョンアップ運用のためにも指定しておくようにしましょう。利用可能なk8sのバージョンは[こちら](https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/kubernetes-versions.html)から確認できます。
- `cluster_name`は必須ですので任意のクラスタ名を指定します。
- `vpc_id`/`subnets`の部分で作成したVPCリソースのVPC IDとプライベートサブネットを指定し、その上にEKSクラスタを配置するように指示します(値参照のシンタックスは[こちら](https://www.terraform.io/docs/language/expressions/references.html)参照)。
- `enable_irsa`はIRSA(IAM Role for ServiceAccount)を有効化しています。これはPodのAWSリソースへのアクセス許可を厳密に制御可能にするEKSの機能です。
- `node_group`ブロックを指定することでEKSのマネージドノードグループを作成することを指定しています。他にもセルフマネージドやFargateでのノード構築にも対応しています。
今回はノード数2で`m5.large`のインスタンスタイプでノードを作成するように指定しています。
- `map_users`ブロックでEKSクラスタにアクセス可能なIAMユーザを作成するようにしています。
eksctlのときはクラスタ環境構築後に`eksctl create iamidentitymapping`コマンドで別途作成しましたが、このModuleはその構成情報としてEKS利用者のIAM情報を含めることが可能で、利用ユーザーの追加・変更についてもTerraformを実行するだけで対応することができます。
別途IAMユーザーを作成し、IAMユーザーのARNを`userarn`、対応するユーザー名を`username`に指定してください。
前回同様に管理者権限の`system:masters`を指定していますが、クラスタ構築後に必要に応じて権限を見直すのがよいでしょう（この段階ではクラスタ構築前のためカスタムRBACは作成できません）。

それ以外にも多数のオプションがオプションが用意されていますので、[こちら](https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest)を参照し、必要に応じてカスタマイズしてください。

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

これはEKSモジュールがKubernetesにアクセスするために必要な定義です。
`data`ブロックでEKS関連のリソースを取得して、`provider`ブロックで[Kubernetes Provider](https://registry.terraform.io/providers/hashicorp/kubernetes/latest)のEKSクラスタへの認証情報を設定しています。

こうすることでTerraform Moduleのterraform-aws-modules/eksがEKSクラスタにアクセスしてk8sリソースを作成することができます。
ここではterraform-aws-modules/eksのためだけに指定していて、別途k8sリソースの作成は行っていませんが、Kubernetes Providerを利用するとk8sの様々なリソースの管理についてもTerraformで行えるようになります。
作成可能なリソースはKubernetes Providerの[公式ドキュメント](https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs)に記載されていますが、ほぼ全てのリソースがTerraformで管理可能なことが分かります。
NamespaceやNetworkPolicy等のインフラリソースはクラスタ環境構築のこの段階で作成しておくというのはよいアイデアだと思います。

## Kubernetesクラスタ環境構築

ここまでできると後はTerraform CLIを実行してEKSリソースを作成するだけです。

先程作成したRoot Moduleディレクトリに移動して以下の手順でコマンドを実行します[^4]。

[^4]: パイプラインに載せる場合は[こちら](https://learn.hashicorp.com/tutorials/terraform/automate-terraform)を参照ください。

### terraform init

まずは利用するProvider/Moduleを初期化する必要があります。以下のコマンドを実行します。

```shell
terraform init
```

以下のように出力されればOKです。

```
Initializing modules...
Downloading terraform-aws-modules/eks/aws 17.20.0 for eks...
- eks in .terraform/modules/eks
- eks.fargate in .terraform/modules/eks/modules/fargate
- eks.node_groups in .terraform/modules/eks/modules/node_groups
Downloading terraform-aws-modules/vpc/aws 3.7.0 for vpc...
- vpc in .terraform/modules/vpc

Initializing the backend...

Successfully configured the backend "s3"! Terraform will automatically
use this backend unless the backend configuration changes.

Initializing provider plugins...
- Reusing previous version of hashicorp/kubernetes from the dependency lock file
- Reusing previous version of hashicorp/local from the dependency lock file
- Reusing previous version of hashicorp/cloudinit from the dependency lock file
- Reusing previous version of terraform-aws-modules/http from the dependency lock file
- Reusing previous version of hashicorp/aws from the dependency lock file
- Installing hashicorp/kubernetes v2.5.0...
- Installed hashicorp/kubernetes v2.5.0 (signed by HashiCorp)
- Installing hashicorp/local v2.1.0...
- Installed hashicorp/local v2.1.0 (signed by HashiCorp)
- Installing hashicorp/cloudinit v2.2.0...
- Installed hashicorp/cloudinit v2.2.0 (signed by HashiCorp)
- Installing terraform-aws-modules/http v2.4.1...
- Installed terraform-aws-modules/http v2.4.1 (self-signed, key ID B2C1C0641B6B0EB7)
- Installing hashicorp/aws v3.62.0...
- Installed hashicorp/aws v3.62.0 (signed by HashiCorp)

Partner and community providers are signed by their developers.
If you'd like to know more about provider signing, you can read about it here:
https://www.terraform.io/docs/cli/plugins/signing.html

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
```

基本的には1回実行すれば良いですが、ProviderやModuleの新規追加やバージョンに変更があった場合は再度実行する必要があります。
実行するとRoot Moduleディレクトリ直下に`.terraform`というディレクトリが作成され、その中にProviderやModuleがダウンロードされているのが分かります。

### terraform plan

次にTerraformの実行計画を確認しましょう。
この手順はスキップすることも可能ですが、Terraformで管理するものは通常影響範囲が大きいものが多いと思いますのでここで一度確認ステップを踏むようにしましょう。

```shell
terraform plan
```

非常に長いので省略しますが以下のように差分を示してくれます。

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

今回は新規構築なので新規作成(`+ create`)のみですが、変更時にはTerraformが変更点に対してどのようなオペレーション(更新や削除・新規作成等)で行うかを示してくれます。
変更内容に問題ないか必ずチェックするようにしましょう。

### terraform apply

ここまでくると実際にEKSリソースを作成するのみになります。以下のコマンドを実行します。

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
module.vpc.aws_internet_gateway.this[0]: Creating...
module.vpc.aws_subnet.private[1]: Creating...
module.vpc.aws_route_table.private[0]: Creating...
module.vpc.aws_subnet.public[1]: Creating...
module.vpc.aws_subnet.public[0]: Creating...
module.vpc.aws_subnet.private[0]: Creating...
module.vpc.aws_subnet.public[2]: Creating...
module.vpc.aws_subnet.private[2]: Creating...
module.vpc.aws_route_table.private[0]: Creation complete after 1s [id=rtb-0d134263386f370c9]
module.vpc.aws_route_table.public[0]: Creating...
(以下省略)
```

TerraformがAWS Provider/Kubernetes Providerを利用して各リソース作成が始まっていることが分かります。
作成が完了するまでしばらく待ちましょう(手元の環境だと15分程で完了しました)。

作成が完了すると以下のようにマネジメントコンソールからEKSクラスタの情報を参照することができます。

![](https://i.gyazo.com/ce5c9fbd9e78323094623311135c6b06.png)

また、先程terraform-aws-modules/eksの`map_users`指定したIAMユーザーでマネジメントコンソールにログインしていれば、以下のようにクラスタの内部(ワークロード)についても参照することができます。

![](https://i.gyazo.com/b6678b10359d193173b66b6f2c4bc257.png)

現状はEKSのシステムコンポーネントのPodのみが稼働していることが分かります。

## クラスタ環境への接続

それでは作成したEKSクラスタ環境にkubectlからアクセスしてみましょう。
既にTerraformでIAMユーザーの認証情報は登録済みですので、ローカルの接続情報のkubeconfig(`~/.kube/config`)を更新するのみです。
これはAWS CLIで実施します。手順はeksctl同様です。以下はTerraform CLIを実行したものとは別のターミナルから実行してください。

```shell
# v2であることを確認
aws --version
# 未設定の場合はAWS認証情報設定
aws configure
```

上記でAWS CLIのバージョンとAWSアカウントへの認証情報の設定をすれば以下のコマンドでkubeconfigをEKSクラスタへの接続情報を追加することができます。

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

最後に作成したEKSクラスタにコンテナをデプロイして動作確認を行いましょう。

[eksctlで環境構築](/containers/k8s/tutorial/env/aws-eks-eksctl/#動作確認)した際には`kubectl run`コマンドでアドホックにPodを作成しましたが、通常の実運用では事前にGitでバージョン管理されたマニフェストファイルを準備します。
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

Deploymentリソースはクラスタへのデプロイを管理するk8sのリソースでステートレスなアプリケーションで使われるリソースで、最も高い頻度で使われているものです。
このDeploymentリソースを使うとデプロイはバージョン管理され、ロールバックや一時停止等を行うことが可能になります。
詳細は省きますが、Deploymentリソースが作成されると、必要な数のPodを作成・維持するReplicaSetリソースが作成され、最終的にコンテナを実行するPodリソースが作成されていきます。
ここでは`nginx:latest`イメージを2台構成(`replicas: 2`)で常時起動するように指示しています。

一方でServiceリソースはPodへのアクセスに対して静的なエンドポイントを提供する役目を果たします。
ここでは`type`としてLoadBalancerを指定していますので、eksctlのときと同様にAWS上にELBをリソースを作成し、外部からのトラフィックを指定したPod(`selector`で指定)にルーティングします。
`type`を指定しない場合はデフォルトのClusterIPとなりクラスタ内部からしかアクセスできなくなりますので注意してください。
また、アクセスポートとして80番ポートを指定して、それが`targetPort`でPodのhttpポート(つまり80番ポート)にトラフィックをルーティングするようにしています。

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

Deployment/ReplicaSet/Pod/Serviceリソースが問題なく作成されていることが分かります。Podは2台構成で作成されていることも確認できます。
また、eksctlで実施したとき同様にServiceリソースの`EXTERNAL-IP`には外部公開向けのELBのURLが出力されています。もちろんこれはマネジメントコンソールからも確認できます(メニューからEC2 -> ロードバランサー選択)。

![](https://i.gyazo.com/960d92b1bad70006fc663fd806ddec9b.png)

先程Serviceリソースで指定した80番ポートで外部からのトラフィックを受付して、k8sノードにルーティングしている様子が分かります。

ブラウザからURLにアクセスしてみましょう。

![](https://i.gyazo.com/3c087bd7f960639aff2224bc12cea6c9.png)

NginxのWelcomeページが表示されれば成功です(接続できない場合はDNSレコードが伝播されるまでしばらく待ってから試してみてください)。

## クリーンアップ

AWS費用を抑えるために全てのリソースは削除しましょう。

まず先程作成したリソースを削除します(`-f`オプションのYAMLファイルは先程と同じものを指定)。
Serviceリソースが削除されたことを検知すると、EKSは不要になったELBも削除します。

```shell
kubectl delete -f nginx.yaml
```

ELBが削除されたことを確認したら、terraformユーザーのターミナルに戻って以下のコマンドでTerraformで管理している全てのリソースを削除ましょう。

```shell
terraform destroy
```

本当に削除して良いか聞かれますので`yes`を入力すれば全てのリソースは削除されます。
しばらく時間がかかりますが、最後まで削除されたことはしっかりと確認しましょう。エラーになっていてリソースが残ってしまうとそのリソースに対して課金されることになります。

---
参照資料

- Terraformドキュメント：<https://www.terraform.io/docs/index.html>
- Terraform AWS Provider: <https://registry.terraform.io/providers/hashicorp/aws/latest/docs>
- Terraform Kubernetes Provider: <https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs>
