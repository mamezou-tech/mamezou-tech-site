---
title: クラスタ環境構築 - AWS EKS (Terraform)
author: noboru-kudo
---

前回に引き続きAWSのKubernetesフルマネージドサービスのEKS(Elastic Kubernetes Service)でクラスタ環境を構築してみましょう。

[前回](/containers/k8s/tutorial/env/aws-eks-eksctl)は[eksctl](https://eksctl.io/)を利用してクラスタ環境を構築しましたが、今回はIaCツールとして高い人気を誇る[Terraform](https://www.terraform.io/)を使います。

TerraformはHashiCorp社で開発されたマルチクラウド対応のIaCツールで、AWSだけでなくAzure、GCP等にも対応します。
[Terraform Language](https://www.terraform.io/docs/language/index.html)というファイル拡張子が`.tf`の独自の構成記述言語を採用しており、YAML/JSONを使うCloudFormationよりも簡潔に記述することが可能です。
有償版もありますが、CLIだけであれば無償で利用することが可能で、このツールでクラウドインフラを管理しているプロジェクトもかなり多いのではと思います。

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

## Terraformのアクセス許可設定
eksctl同様にTerraformではクラスタの作成をするにはEKSだけでなく、VPC生成等様々なアクセス許可をIAMユーザーに付与する必要があります。
そのユーザーは広範囲のアクセス許可が必要となりますし、将来的にパイプライン上で実行することも踏まえてTerraform専用のIAMユーザーを作成しておくとよいでしょう。

必要最低限のポリシーについては[こちら](https://github.com/terraform-aws-modules/terraform-aws-eks/blob/master/docs/iam-permissions.md)に記載されています。
また、リモートステートとしてS3を利用するためS3のアクセス許可を追加する必要があります。[こちら](https://www.terraform.io/docs/language/settings/backends/s3.html#s3-bucket-permissions)を参考に追加してください。

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

今回はローカル環境でも良いのですが、ベストプラクティスに従いAWSのS3に保管するようにします。

事前にTerraform専用のS3バケットを作成しておきましょう(デフォルトの設定のままで構いません)。

![](https://i.gyazo.com/a211baaf7dd1fdd8176bc0c2b624248b.png)

ここでは`mz-terraform`という名前のバケットを作成しました。バケット名はグローバルで一意である必要がありますので任意の名前に変更してください。

## Kubernetesクラスタ環境構築

ここまで準備ができたらEKSクラスタ環境を作成していきましょう。

Terraformには[Module](https://www.terraform.io/docs/language/modules/index.html)という仕組みがあり、実績のあるサードパーティや社内で作成した設定を再利用する形で利用することができます。
ここではAWS公式Moduleの以下を利用してクラスタ環境を構築します。
- [VPC](https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest)
- [EKS](https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest)

任意のディレクトリを作成して、そこに構成ファイルを配置しましょう。ここでは`terraform`というディレクトリを作成しました[^1]。

[^1]: 実運用では環境ごと(dev/staging/prod等)にディレクトリを切って、各リソースはモジュールとして別ディレクトリに配置することが多いかと思います。

ディレクトリ内にmain.tfというファイル[^2]を作成しましょう。

[^2]: ファイル名は任意の名前で構いませんが、main.tfを使うこと一般的です。[こちら](https://www.terraform-best-practices.com/)が参考になります。

このような形になります。

```hcl
terraform {
  backend "s3" {
    bucket = "mz-terraform"
    key    = "eks-state"
    region = "ap-northeast-1"
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.61"
    }
  }
}

provider "aws" {
  region = "ap-northeast-1"
}

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

module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  cluster_version = "1.21"
  cluster_name    = "mz-k8s"
  vpc_id          = module.vpc.vpc_id
  subnets         = module.vpc.private_subnets
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
    },
  ]
}

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

## クラスタ環境への接続


## 開発者ユーザーのアクセス許可

## 動作確認


## クリーンアップ
EKSはControl Planeだけでなく、マネージドノード自体の課金もありますので使わなくなったものは削除しましょう。

terraformユーザーのターミナルに戻って以下のコマンドで全てのリソースを削除してしまいましょう。

```shell
terraform destroy
```

---
参照資料

- Terraformドキュメント：<https://www.terraform.io/docs/index.html>