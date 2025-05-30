---
title: Terraformのデータソースを活用しよう！
author: tadashi-nakamura
date: 2025-05-30
tags: [IaC, AWS, terraform, data-source, sss]
---

# はじめに

豆蔵社内で開発・運用している[営業支援システム(Sales Support System)](/in-house-project/sss/intro/)（以下、SSS）の開発の IaC 実装で利用した Terraform データソース[^1]について紹介します。
また、Terraform の`import`でに既存リソースを IaC 化するのはハードルが高いですが、データソースを使って既存リソース情報を Terraform で使えるようにし、徐々に IaC 化を進めるポイントをご紹介します。

[^1]: `data`で始まる要素。詳細は Terraform のドキュメントの[Data sources](https://developer.hashicorp.com/terraform/plugin/framework/data-sources)を参照。

# 背景

SSS ではトライアル・ステージング・本番の 3 つ環境を利用しており、各環境の AWS インフラリソースのほとんどが Terraform(IaC)で管理されています。

```cmd:ディレクトリ階層のイメージ
+---env
|   +---prod
|   |   +---operators
|   |   +---infra
|   |   +---main
|   |   +---app
|   +---dev
|   |   ...
|   +---trial
|       ...
+---modules
    +---aurora
    +---ecs_task
    +---glue
        ...
```

大きく分けて、環境別設定（`env`ディレクトリ配下）と共通部品（`modules`ディレクトリ配下）に分かれています。

環境別設定は、実際の AWS 環境と同じように環境毎にディレクトリを分離しています。また、各環境はオペレータ、インフラ、ミドルウェア、アプリケーションで分割されています。

各環境は同じようなシステム構成となるため、共通の部品として`modules`ディレクトリ配下に配置しています。共通部品にはネットワーク、RDB や DynamoDB、Glue、ECS、S3 といった AWS サービスをベースとしたモジュールから構成されています。各環境の IaC はそれらを Terraform モジュールとして利用することで、コードの重複を回避しています。

色々と長くなりましたが、ここまでが背景説明のための前段階となります。

以前はインフラモジュールで作った VPC やサブネットの ID や ARN などをミドルモジュールやアプリモジュールで利用する際に`local`変数で値を定義して、手動にて保守をしていました。

しかし、この方法ではインフラ更新の際に環境ごとの差分が多く出てしまい、転記ミスによるバグを発生させる要因ともなっていました。そのため、できるだけ差分をなくしてスッキリしたいと思い、データソースへの置き換えによるリファクタリングをすることにしました。

自システムのサブモジュール間のリソース参照という理由の他にもう一つ、データソースを導入した要因があります。

SSS では SecretsManager は管理コンソールで定義しており、数少ない IaC 化されていない要素になります。こちらは`local`に値を記述するわけには行かないため、`variable`で変数を定義して、`terraform.tfvars`ファイルで値を設定していました。

このように IaC 化されていない要素へのアクセスにもデータソースが有効です。

余談ですが、AWS のリソースやデータソースの API のドキュメントは[HashiCorp](https://www.hashicorp.com/)や[Terraform](https://www.terraform.io/)からだとたどりにくいです。そもそも AWS のリソースは AWS Provider の要素なので、[Terraform Registry](https://registry.terraform.io/)にあります。

以降では SSS でも利用した主なデータソースを紹介していきます。定義そのもの例と参照の例として`output`を示します。

# カレント

Terraform を実行しているユーザー、カレント[^10]に関連したデータソースについて紹介します。
主なものとして ARN などにも含まれる AWS アカウントとリージョンを取り上げます。

[^10]: ここでは現在の状態などのこと。

## AWS アカウント ID

以下は Terraform を実行した AWS アカウントの ID を取得するためのデータソース定義[^11]と利用例になります。

```hcl
data "aws_caller_identity" "current" {}
```

```hcl
# どちらでもOK
output "aws_id" {
  value = data.aws_caller_identity.current.id
}
output "aws_account_id" {
  value = data.aws_caller_identity.current.account_id
}
```

[^11]: [`aws_caller_identity`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity)

## リージョン

以下は Terraform を実行した AWS アカウントのデフォルトリージョンを取得するためのデータソース定義[^12]と利用例になります。

```hcl
data "aws_region" "current" {}
```

```hcl
output "region_name" {
  value = data.aws_region.current.name
}
```

[^12]: [`aws_region`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region)

# 自作のリソース

以下は自作の Terraform モジュールを参照するためのデータソース定義[^21][^22]と利用例になります。

データソース名（`terraform_remote_state`）にあるように、これは<strong><font color="red">「リモート」で Terraform の状態を管理している場合にのみ利用可能</font></strong>です。

ここでは SSS でも利用している S3 で共有する場合の例になります。

```hcl
data "aws_s3_bucket" "terraform_state" {
  bucket = "Terraformステートを保持するためのS3バケット名"
}

data "terraform_remote_state" "some_module" {
  backend  = "s3"

  config = {
    bucket = data.aws_s3_bucket.terraform_state.id
    key    = "サブモジュールのTerraformステートを格納するS3オブジェクトキー名"
    region = data.aws_region.current.name
  }
}
```

```hcl
output "some_resource_id" {
    value = data.terraform_remote_state.some_module.some_output_name
}
```

ここで`some_output_name`は自システムのサブモジュールで定義した`output`名になります。

必要に応じてサブモジュールの`output`を定義することで他から参照できるようになります。

[^21]: [`terraform_remote_state`](https://developer.hashicorp.com/terraform/language/state/remote-state-data)
[^22]: [`aws_s3_bucket`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/s3_bucket)`

# AWS リソース

主な AWS リソースに関するデータソースを紹介します。

## VPC

AWS アカウント作成時に存在しているデフォルトの VPC および`Name`タグを使った絞り込みの場合のデータソース定義[^31]です。

特定のデータソースを指定する際にはよく名称を指定しますが、VPC そのものには名称がないため、名称の指定ができません。VPC やセキュリティグループなどのようにリソース自体に名付けできない場合、よくある方法としてタグの`Name`キーを追加して、値にヒューマンリーダブルな名称を設定[^32]します。データソースではそのタグの値を`tags`で指定して絞り込みます。

データ参照では VPC ID の例を示していますが、API リファレンスを参照するか、リソースオブジェクト全体（`data.aws_vpc.default`など）を出力することでも確認出来ます。

```hcl
# default
data "aws_vpc" "default" {
  default = true
}

# Filtering by the value of Name tag
data "aws_vpc" "this" {
  tags = {
    Name = "VPCの名称"
  }
}
```

```hcl
output "default_vpc_id" {
  value = data.aws_vpc.default.id
}

output "vpc_id" {
  value = data.aws_vpc.this.id
}
```

[^31]: [`aws_vpc`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc)
[^32]: 管理コンソールの VPC やセキュリティグループの一覧の"Name"に表示されます。

## サブネット

以下はサブネットに関するデータソース定義[^33][^34]と利用例になります。

複数のサブネットを扱う例はプライベートサブネットの抽出ですが、パブリックかプライベートかはサブネットそのものではわからないため、ここでもタグを利用しています。`filter`要素で対象となるサブネットが含まれる VPC として先程のデフォルトでない VPC を指定（`vpc_id`の値に指定）、更に、`Name`タグにワイルドカードで部分一致を指定して取得しています。`filter`については AWS CLI の`--filter`オプションの引数値[^35]と同等となっています。

```hcl
# for multiple resources
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.this.id]
  }

  tags = {
    Name = "*private*"
  }
}
```

単一のサブネットのみを扱う例は複数の例に加えて特定のアベイラビリティゾーンを条件に指定しています。単一の場合、VPC ID は独自のパラメタを利用しています。

なお、単一のリソースを扱うデータソースは絞り込みが不十分で複数のリソースが選択されるとエラーとなります。また、データソース名については要素名のところが単数形と複数形となることがほとんどなので探すのは容易かと思います。

```hcl
# for single resource(MUST select only one element)
data "aws_subnet" "by_az" {
  vpc_id            = data.aws_vpc.this.id
  availability_zone = "ap-northeast-1c"
  tags = {
    Name = "*private*"
  }
}
```

```hcl
output "private_subnet_ids" {
  value = data.aws_subnets.private.ids
}

output "subnet_by_az_id" {
  value = data.aws_subnet.by_az.id
}
```

[^33]: [`aws_subnets`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets)
[^34]: [`aws_subnet`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnet)
[^35]: AWS CLI のオプションについてはドキュメントの[Options](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/describe-security-groups.html#options)を参照。

## セキュリティグループ

以下はセキュリティグループに関するデータソース定義[^36][^37]と利用例になります。

これも複数リソースと単一リソースの例となりますが、どちらもデフォルトでない VPC 内で`Name`タグ値が`"ecs"`のセキュリティグループを指定しています。
複数リソース版では 2 つの`filter`ブロックを指定していますが、論理積（AND）条件となります。逆に、`filter`の`values`に複数指定した場合は論理和（OR）条件となります。

```hcl
data "aws_security_groups" "ecs" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.this.id]
  }

  filter {
    name   = "group-name"
    values = ["ecs"]
  }
}

data "aws_security_group" "ecs" {
  vpc_id = data.aws_vpc.this.id
  name   = "ecs"
}
```

同じ条件で、単一リソースでもエラーにならない条件のため、どちらも一つのリソースですが、複数の場合は結果がリストになります。
そのため、利用例の 2 つ目と 3 つ目は同じ値となります。

```hcl
output "ecs_security_group_ids" {
  value = data.aws_security_groups.ecs.ids
}

output "first_ecs_security_group_id" {
  value = data.aws_security_groups.ecs.ids[0]
}

output "ecs_security_group_id" {
  value = data.aws_security_group.ecs.id
}
```

[^36]: [`aws_security_groups`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/security_groups)
[^37]: [`aws_security_group`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/security_group)

## ECS クラスタ

以下は ECS クラスタのデータソース定義[^38]と利用例になります。

名称があるリソースの場合、名称がわかればデータソースが簡単に定義できます。

```hcl
data "aws_ecs_cluster" "this" {
  cluster_name = "ECSクラスタの名称"
}
```

```hcl
output "ecs_cluster_id" {
  value = data.aws_ecs_cluster.this.id
}

output "ecs_cluster_arn" {
  value = data.aws_ecs_cluster.this.arn
}
```

[^38]: [`aws_ecs_cluster`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ecs_cluster)

## RDS クラスタ

以下は RDS クラスタのデータソース定義[^39]と利用例になります。

ECS クラスタと同じく、必要な情報は名称のみになります。
利用例にあるようにこれで IaC でエンドポイントも利用可能になります。

```hcl
data "aws_rds_cluster" "this" {
  cluster_identifier = "RDSクラスタの名称"
}
```

```hcl
output "rds_cluster_id" {
  value = data.aws_rds_cluster.this.id
}

output "rds_cluster_arn" {
  value = data.aws_rds_cluster.this.arn
}

output "rds_cluster_endpoint" {
  value = data.aws_rds_cluster.this.endpoint
}
```

[^39]: [`aws_rds_cluster`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/rds_cluster)

## シークレットマネージャ

以下は「Amazon RDS データベースの認証情報」で作成したシークレットのデータソース定義[^40][^41]と利用例になります。

シークレットの具体的な値を参照しようとするとちょっと面倒な感じになっています。
これは`secret_string`自身を出力してみるとわかるのですが、JSON 形式となっています。そのため、Terraform の組み込み関数で JSON 形式からマップ形式に変換してからシークレットキーを指定する必要があります。

```hcl
data "aws_secretsmanager_secret" "rds" {
  name = "シークレット名"
}

data "aws_secretsmanager_secret_version" "rds" {
  secret_id = data.aws_secretsmanager_secret.rds.id
}
```

```hcl
output "rds_secret_arn" {
  value = data.aws_secretsmanager_secret.rds.arn
}
output "rds_secret_value_username" {
  value = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["username"]
  sensitive = true
}
output "rds_secret_value_password" {
  value     = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["password"]
  sensitive = true
}
output "rds_secret_value_engine" {
  value = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["engine"]
  sensitive = true
}
output "rds_secret_value_host" {
  value = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["host"]
  sensitive = true
}
output "rds_secret_value_port" {
  value = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["port"]
  sensitive = true
}
output "rds_secret_value_dbname" {
  value = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["dbname"]
  sensitive = true
}
output "rds_secret_value_dbClusterIdentifier" {
  value = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["dbClusterIdentifier"]
  sensitive = true
}
```

[^40]: [`aws_secretsmanager_sercret`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_sercret)
[^41]: [`aws_secretsmanager_sercret_version`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_sercret_version)

# データソースを活用してインクリメンタルに IaC 化していく

Terraform に関して以下の「学び」があります[^51]。

- After you start using Terraform, you should only use Terraform.
- If you have existing infrastructure, use the `import` command.

この「学び」を教訓としたいところですが、 インポート機能[^52]を利用するにはリソースについて**完全な記述**が必要になります。
これは既に多くの AWS リソースを用い、様々な細かい設定しているプロジェクトではかなり大変な作業になります。しかし、開発も運用保守も時間やコストは有限です。

:::check:完全な記述
例えば、`aws_iam_role`の`import`だけでは、アタッチされていた AWS 管理ポリシーは Terraform の管理にはなりません。そのため、対象の IAM ロールを正しく IaC 化するには、`aws_iam_role_policy_attachment`リソース定義も追加しなければなりません。

なお、`aws_iam_role_policy_attachment`を`import`せず`plan`を実行すると「管理ポリシーをデタッチする計画（差分）」が表示されます。出てきた差分をすべて解消すると正しく取り込まれることになりますが、Terraform に慣れていないとどのリソースを使い、各引数には何を設定するのか、といったことを次々と追いかけて行くことになります。そして、インフラ的に分離されているところまで IaC 化しなければならなくなります。
:::

では、IaC 化されていない既存のシステムにアサインされてしまったら、IaC 化は諦めるしかないのでしょうか。

ここでデータソースの出番です。データソースは IaC 化されていない既存の環境を**インクリメンタルに IaC 化**する際にも利用できると思います。

SSS は最初から IaC 化されていたため、実際に既存のシステムに対してゼロから IaC 化を実施したわけではありません。
しかし、法改正の施行などデッドライン変更不可な機能開発の際に、チュートリアルやブログを見ながら管理コンソールで直接検証や構築し[^53]、Cosense で文書化したり、動画で記録した手順を使って、他環境へ展開、リリースして、後日、徐々に IaC 化するといった際にデータソースを利用したことはあります[^54]。

今まで見てきたように、データソースならインポート機能とは異なり、場合によっては名称のみを設定といった感じで済んでしまいます。
新たにリソースを追加する際に、その周辺要素となるリソースをデータソースで定義しておき、徐々にリファクタリングしながら IaC の領域を広げることが可能です。イメージとしては、データソースで城壁を作り、その中に IaC でまちづくりするといった感じでしょうか。

以降では具体的な例として、一つの新規 ECS サービスの追加から初めて、既存の ECS タスク定義および既存の ECS クラスターの IaC 化をしていきます。なお、前提として Terraform ステート管理などの環境設定は実施済みであるとします。

[^51]: 超訳：「Terraform を使いだしたら、Terraform だけを使え」「既存のインフラがあるなら、`import`コマンドを使え」
[^52]: 既存リソースの読み込みについては[Import existing resources](https://developer.hashicorp.com/terraform/cli/import/usage)を参照。
[^53]: SSS はスクラムで開発をしているので、本来は SPIKE と機能開発のアイテムを分けるべきで、時間がある場合はそうしてますが、現実はままならないものです。
[^54]: 当時は今よりも Terraform に慣れていないため、調べることが多くて IaC 化に時間がかかっていたというの理由の一つです。現在はそれなりの時間で IaC 化できるので、最近は IaC 化しながら開発を進めることがほとんどです。

## 新規 ECS サービスを IaC 化

まずは一つの 新規 ECS サービスを既存の ECS タスク定義を使って作成し、既存の ECS クラスター上で実行します。
具体的には以下の Terraform コードを実装して適用（`terraform apply`）します。

- 新しい ECS サービスを通常のリソースとして定義
- 既存のインフラ要素をデータソースで定義
  - ECS タスク定義
  - ECS クラスター
  - プライベートサブネット（複数）
  - セキュリティグループ（複数）
  - ...

```hcl
resource "aws_ecs_service" "my_service" {
  name            = "my-service"
  task_definition = data.aws_ecs_task_definition.my_service_def.arn
  cluster         = data.aws_ecs_cluster.my_cluseter.arn

  network_configuration {
    subnets         = data.aws_subnets.private.ids
    security_groups = data.aws_security_groups.ids
  }

  ... other settings ...
}

data "aws_ecs_task_definition" "my_service_def" {
  task_definition = "my-service" # latest
}

data "aws_ecs_cluster" "my_cluster" {
  cluster_name = "my_cluster"
}

data "aws_subnets" "private" {
    ... see above ...
}

data "aws_security_groups" "ecs" {
    ... see above ...
}
```

なお、ECS タスク定義の例は最新版を参照しています。`<family_name>:<revision>`とすることでリビジョンを指定することも出来ます。

他の ECS タスク定義があっても何もする必要はありません。あくまでも、今回対象となる ECS サービスのための ECS タスク定義のみをデータソースとして定義します。

ここでは取り上げていませんが、システム構成によっては SSS のようにサービスディスカバリ（CloudMap）の定義や他サービス連携（サービスコネクト）に関連したデータソースも追加する必要があります。

## 既存の ECS タスク定義を IaC 化

続いて、ECS タスク定義を IaC 化します。実際には何日か日をまたいでこの作業をやることになります。
今回は`import`ブロックを使う方法で説明します。

1. ECS タスク定義の`import`ブロックを IaC ファイルに追加

   ```hcl
   import {
     to = aws_ecs_task_definition.my_service_def
     id = "<ecs task definition arn>"
   }
   ```

   ここで`<ecs task definition arn>`は以下のような値になります。

   - `arn:aws:ecs:ap-northeast-1:012345678910:task-definition/my-service:123`

   この値は管理コンソールで 各 ECS タスク定義のリビジョンの概要の画面で確認出来ます[^61][^62]。

   `aws_ecs_task_definition`の場合は ECS タスク定義の ARN でしたが、後述する`aws_ecs_cluster`ならクラスター名など、指定する対象はリソースによって異なります。各リソースのリファレンスページには`import`で指定する値についての記載があります。

1. 以下のコマンドを実行して`import`ブロックで指定した ECS タスク定義の IaC を生成

   ```bash:Terraformコマンド
   terraform plan -generate-config-out=generated_ecs_task_def.tf
   ```

   このコマンドを実行すると以下のようなメッセージが表示され、generated_ecs_task_def.tf ファイルが生成されます。

   ```bash:出力（中略）
   Terraform will perform the following actions:

     # aws_ecs_task_definition.my_service_def will be imported
       resource "aws_ecs_task_definition" "my_service_def" {
        ... omitted ...
       }

   Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.
   ```

   この時点ではまだ Terraform ステートには反映されていません。

1. 以下のコマンドを実行して`import`ブロックおよび生成内容を適用

   ```bash:Terraformコマンド
   terraform apply
   ```

   このコマンドを実行すると最後の方に以下のようなメッセージが表示され、Terraform ステートに反映されます。

   ```bash:出力（抜粋）
   Apply complete! Resources: 1 imported, 0 added, 0 changed, 0 destroyed.
   ```

   生成された IaC コードは単純にそのまま設定を取り込んだ内容（ARN などが文字列で直書きされている）となっています。そのため、実際にはこの手順の前後や後日に<font color="red">**直書きされている値を変数や他のリソース参照などに置き換える**</font>必要があります。そして、また関連するリソースをデータソースで定義して IaC 化の領域を広げていく感じになります。

1. ECS サービスの ECS タスク定義への参照をデータソースからリソースに置き換え、ECS タスク定義のデータソース定義と`import`ブロックを削除

   ```hcl
   resource "aws_ecs_service" "my_service" {

     task_definition = aws_ecs_task_definition.my_service_def.arn

     ... other settings(not changed) ...
   }

     ... others(not changed) ...
   ```

1. 以下のコマンドを実行して`No changes.`となることを確認

   ```bash:Terraformコマンド
   terraform plan
   ```

:::check:"-generate-config-out"オプションで生成されるファイルについて
`-generate-config-out`オプションはまだ Experimental のせいか、生成されるファイルには以下の制限があります。

- 既存のフィアルへの上書きや追記が出来ない。
- そのままでは`plan`や`apply`でエラーになることがある。

1 つは全項目を出力するため、2 つの設定方法に対して 1 つだけ設定するような場合に両方とも値が設定されてしまうというものです。
`apply`などをすると設定のコンフリクトエラーなどになるため、地道に修正（どちらかを削除するだけですが）する必要があります。

もう 1 つは偶然に遭遇したものですが、単なるバグで、`aws_iam_openid_connect_provider`で`url`の値がホスト名（URL スキームなどがない状態）になるというものです[^a]。
これも地道に修正する必要があります。

[^a]: [aws_iam_openid_connect_provider rejects valid "url"s](https://github.com/hashicorp/terraform-provider-aws/issues/26483)

:::

[^61]: AWS CLI の場合は以下のようになります。

    ```bash
    aws ecs list-task-definitions --family-prefix <task_family> --sort DESC --max-items 1 --query "taskDefinitionArns[0]" --output text
    ```

[^62]: あるいは前の段階で`output`として`import`に必要となる情報を出力しておくと良いかもしれません。

## 既存の ECS クラスターを IaC 化

更に ECS クラスターを IaC 化します。ここからは定義するリソースが異なるだけで基本的な作業は ECS タスク定義のときと同じです。

1. ECS クラスターの`import`ブロックを IaC ファイルに追加

   ```hcl
   import {
     to = aws_ecs_cluster.this
     id = "my_cluster"
   }
   ```

1. 以下のコマンドを実行して`import`ブロックで指定した ECS タスク定義の IaC を生成

   ```bash:Terraformコマンド
   terraform plan -generate-config-out=generated_ecs_cluster.tf
   ```

   実行結果の確認などは ECS タスク定義と同じです。

1. 以下のコマンドを実行して`import`ブロックおよび生成内容を適用

   ```bash:Terraformコマンド
   terraform apply
   ```

1. ECS サービスの ECS クラスターへの参照をデータソースからリソースに置き換え、ECS クラスターのデータソース定義を削除

   ```hcl
   resource "aws_ecs_service" "my_service" {
     cluster = aws_ecs_cluster.this.id

     ... other settings(not changed) ...
   }

     ... others(not changed) ...
   ```

1. 以下のコマンドを実行して`No changes.`となることを確認

   ```bash:Terraformコマンド
   terraform plan
   ```

# 最後に

いかがでしたでしょうか。

ここで取り上げたデータソースはほんの一部だけになります。
Terraform では各種 AWS リソースに対応したデータソースが用意されています。

インクリメンタルな IaC 化では既存リソースに対してデータソースのみで定義しましたが、`import`と併用してはいけないわけではありません。
定義が簡単なものは最初からリソースを定義して`import`、面倒なものはデータソースで定義というのももちろん可能です。
また、IaC 化も徐々に広げていく方法を紹介しましたが、IaC 化されているリソースがひとかたまりであるという制限はないので、自由にやりたいところから IaC 化していくことも出来ます。
ただし、あまりまだらに IaC 化してしまうと、どこが管理コンソールで変更してよいのかわかりにくくなるかと思います。
タグを付ける方法などもありますが、上から下、メインからサブ（あるいはその逆）といったように広げていくのが良いでしょう。

管理コンソールでお手軽に始めてしまった既存システムにアサインされてしまった人も諦めず、手順書でのインフラメンテから脱却し、IaC 化して保守性をどんどん高めていきましょう！
