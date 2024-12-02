---
title: IaCでSales Support Systemのインフラ構築
author: tadashi-nakamura
date: 2024-12-03
tags: [IaC, AWS, API Gateway, CloudMap, ECS, Fargate, terraform]
---

# はじめに

[営業支援システム(Sales Support System)](/in-house-project/sss/intro/)で導入した API Gateway+CloudMap+ECS(Fargate)の Terraform での構築手順を紹介します。

# 背景

以下に上げる保守性の問題から AWS のコンテナ環境を EKS から ECS へ移行することにしました。
なお、Fargate については継続使用としています。

- AWS のサービス毎のコストで EKS が最も多く、ECS に移行することで当時検討していた SaaS の利用料金が捻出できるぐらいの差がある。
- EKS の基盤の Kubernetes の更新が最長でも 1 年ごとに強制される。
- EKS 上のミドルウェア(HELM)の更新通知は当然ながら AWS からはされないため、自分たちで確認する必要がある。
- Kubernetes の更新頻度が高いため、キャッチアップが間に合わない。
  - Kubernetes 自体も含め、α 版や Β 版の API が多く、また、当然の如く非互換の更新もある。
- EKS 利用でよくあげられる理由である Kubernetes のノウハウが SSS 開発チームにない。
  - そもそも AWS 自体に不慣れなメンバでそちらのキャッチアップで手一杯になっていたというのも。

:::info:EKS vs ECS

EKS と ECS の主な要素の比較表です。

| 要素                          | ECS                | EKS                |
| ----------------------------- | ------------------ | ------------------ |
| コントロールプレーン          | ECS                | AWS マネージド     |
| データプレーン                | EC2/Fargate        | EC2/Fargate        |
| 他の AWS サービスとの親和性   | 高い               | 低い               |
| 機能                          | より少ない         | より豊富           |
| k8s 用の各種ツール            | 利用不可           | 利用可             |
| 定義ファイル                  | タスク定義         | マニフェスト       |
| 料金                          | 無料               | 0.1USD/hr          |
| リリースサイクル              | なし               | 約３か月           |
| サポート期限                  | なし               | 約１年             |
| 最小実行単位                  | Task               | Pod                |
| クラスター内通信              | Route53+CloudMap   | Service            |
| クラスター外通信/インバウンド | 別途構築           | Ingress            |
| 環境変数                      | 〇                 | 〇                 |
| Secret                        | 〇                 | 〇                 |
| Cron                          | タスク定義の範囲外 | マニフェストで定義 |
| 定義ファイルの CICD           | なし               | GitOps             |
| スケジュールタスク            | あり               | なし               |
| クラスター作成速度            | 約 2 秒            | 約 5 分から 10 分  |

:::

### CloudMap vs ALB vs NLB

AWS API Gateway は別途利用決定していたので、API Gateway の後段の構成について、以下の 3 つの AWS サービスについて調査および実際に実装して比較しました。

1. CloudMap を利用する方法

![CloudMap版のシステム構成図](/img/sss/sss-by-iac-cloudmap.png "CloudMap版のシステム構成図")

2. Application Load Balancer（以下、ALB）を利用する方法

![ALB版のシステム構成図](/img/sss/sss-by-iac-alb.png "ALB版のシステム構成図")

3. Network Load Balancer（以下、NLB）を利用する方法

![NLB版のシステム構成図](/img/sss/sss-by-iac-nlb.png "NLB版のシステム構成図")

以下に実際に比較した内容を示します[^1]。
◯、△、× で 3 点、2 点、1 点として単純にポイントを算出して最高得点となったものを採用しました。

[^1]: クリティカルな非機能要件のない SSS ではあまり差が出なかったので、ちょっと恣意的な感じになっていますが・・・（汗）

| サービス | コスト | ノウハウ | 機能                                   | サービス間通信  | 統合         | ポイント | 結果   |
| -------- | :----: | :------: | -------------------------------------- | --------------- | ------------ | -------- | ------ |
| CloudMap |   〇   |    ×     | 〇 Microservices 向け Mapper           | 〇 おそらく可能 | △ HTTP       | 12       | 採用！ |
| ALB      |   ×    |    〇    | 〇 レイヤー 7。機能が NLB に比べ豊富   | △ 不明？        | △ HTTP       | 11       |        |
| NLB      |   △    |    〇    | × レイヤー 4。高パフォーマンス要求向け | △ 不明？        | 〇 REST/HTTP | 11       |        |

何はともあれ、以上により、SSS では

- AWS API Gateway
- AWS CloudMap
- AWS ECS on Fargate

という構成が選択されました。

# 構築の前提事項

VPC やサブネット、Cognito の経由で Google の SSO 認証などは既存のインフラとしました。
そのため、ここで紹介する構築手順では以下のことを前提としています。

- 以下のものが構築・準備されていること
  - VPC
  - プライベートサブネット
  - Cognito
  - Google をフェデレーテッド ID プロバイダとするユーザープール

実際には更に RDS や DynamoDB などミドルウェアや S3 などのストレージなどもそのまま利用しました。

# ECS の構築

この章は AWS のチュートリアル[^2]の内容をベースに Terraform で再現しています。

[^2]: [AWS CLI を使用して、Fargate 起動タイプ用の Amazon ECS Linux タスクを作成する](https://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/ECS_AWSCLI_Fargate.html)

## ECS クラスターの作成

まずは、ECS クラスターから作成します。
ECS クラスターの Terraform コードは以下のようになります。
ここで、Fargate 起動タイプ用の ECS クラスターとするため、`capacity_providers`に`"FARGATE"`を指定しています。
なお、`local.`となっているのは Terraform のローカル変数で定義されている値です。

```hcl:main.tf
resource "aws_ecs_cluster" "this" {
  name = local.ecs_cluster_name
}

resource "aws_ecs_cluster_capacity_providers" "this" {
  cluster_name       = aws_ecs_cluster.this.name
  capacity_providers = ["FARGATE"]
}
```

## IAM ロールの作成

ECS 上でアプリケーションを実行するため、以下の 2 種類の IAM ロールを作成する必要があります。

- ECS タスク実行ロール
  - 定義されたタスクを実行する際に必要となる権限のロール
- ECS タスクロール
  - 定義されたアプリケーションが実行する際に必要となる権限のロール

### ECS タスク実行ロール

ECS タスク実行ロールの Terraform コードは以下のようになります。
一般的なユースケースに必要な権限は AWS 管理のポリシー`AmazonECSTaskExecutionRolePolicy`に定義されているので、このポリシーをアタッチしています。
このポリシーでは、ECR からイメージをプルするための権限と CloudWatch へのログ出力のための権限が定義されています。
SSS では更にメトリックスデータの出力のための権限をインラインポリシーで定義しています。

:::info:ポリシーの種別
ポリシーは管理ポリシーとインラインポリシーがありますが、AWS は「管理ポリシー」の利用を推奨しています。

[管理ポリシーとインラインポリシーのいずれかを選択する](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/access_policies-choosing-managed-or-inline.html)
:::

```hcl:main.tf
resource "aws_iam_role" "ecs_task_exec" {
  name               = local.ecs_task_execution_role_name
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role_policy.json
}

resource "aws_iam_role_policy_attachment" "ecs_task_exec" {
  role       = aws_iam_role.ecs_task_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "ecs_task_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "cloud_watch_policy" {
  statement {
    actions   = ["cloudwatch:PutMetricData"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "ecs_task_exec_cloud_watch_policy" {
    name   = "${local.prefix}-cloud-watch-policy"
    role   = aws_iam_role.ecs_task_exec.id
    policy = data.aws_iam_policy_document.cloud_watch_policy.json

}

resource "aws_iam_role_policies_exclusive" "ecs_task_exec" {
  role_name = aws_iam_role.ecs_task_exec.name

  policy_names = [
    aws_iam_role_policy.ecs_task_exec_cloud_watch_policy.name
  ]
}
```

### ECS タスクロール

続いて、タスクロールですが、このロールはアプリケーション実行のためのものなので、アプリケーションの内容に応じて定義する必要があります。
DynamoDB などを利用するアプリケーションを実行する場合は、このロールに DyanmoDB へのアクセスのための権限を付与する必要があります。
今回利用するアプリケーションは静的なページを返すだけの単純な Web アプリケーションなので、実行に際して追加するものはありません。
ここではサンプルとしてタスク実行ロールと同じポリシーを付与しています。

```hcl:ecs_task.tf
resource "aws_iam_role" "mz_dev_app" {
  name               = "${local.app_name}-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role_policy.json
}

resource "aws_iam_role_policy" "cloud_watch_log_policy" {
  name   = "${local.app_name}-cloud-watch-log-policy"
  role   = aws_iam_role.mz_dev_app.id
  policy = data.aws_iam_policy_document.cloud_watch_policy.json
}

resource "aws_iam_role_policies_exclusive" "mz_dev_app" {
  role_name = aws_iam_role.mz_dev_app.name
  policy_names = [
    aws_iam_role_policy.cloud_watch_log_policy.name
  ]
}
```

## ECS タスク定義の作成

ECS 上で動作するアプリケーションのメインとなる設定が ECS タスク定義になります。
ECS タスク定義ではアプリケーションに対する様々な設定か定義できます[^3]。

- 起動タイプ
- 使用する Docker イメージ
- メモリと CPU の要件
- OS
- Docker ネットワーキングモード
- ...

起動タイプには`"FARGATE"`を指定しています。Fargate 起動タイプにすると以下の設定が制限されます。

- ネットワークモードが`awsvpc`であること。
- コンテナ定義（`container_definitions`）の
  - ポートマッピング（`portMappings`）の`hostPort`が空白か`containerPort`と同じであること。
  - ログ構成仕様（`logConfiguration`）の
    - `logDriver`が以下のいずれかであること。
      - `awslogs`
      - `splunk`
      - `awsfirelens`
    - `awslogs-stream-prefix`が必須であること。

他にも制限事項がありますが、基本的には Fargate の動作を制限させないためのもののようです。
ログ構成仕様は`awslogs`ログドライバーを使用して、コンテナログを CloudWatch Logs に送信するように設定しています。
ECS タスク定義で指定されている`cpu`と`memory`はタスクに含まれる全コンテナの合計になります。コンテナごとにも定義が可能ですが、それぞれの合計値が ECS タスク定義の設定値を超えないようにする必要があります。

[^3]: ECS タスク定義の設定の詳細については [Amazon ECS タスク定義パラメータ](https://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/task_definition_parameters.html) を参照。

```hcl:ecs_task.tf
resource "aws_ecs_task_definition" "mz_dev_app" {
  family                = "${local.prefix}-site"

  container_definitions = <<EOF
[
    {
        "name": "${local.app_name}",
        "image": "public.ecr.aws/docker/library/httpd:latest",
        "portMappings": [
            {
                "containerPort": 80,
                "hostPort": 80,
                "protocol": "tcp"
            }
        ],
        "essential": true,
        "entryPoint": [
            "sh",
            "-c"
        ],
        "command": [
            "/bin/sh -c \"echo '<html> <head> <title>Amazon ECS Sample App</title> <style>body {margin-top: 40px; background-color: #333;} </style> </head><body> <div style=color:white;text-align:center> <h1>Amazon ECS Sample App</h1> <h2>Congratulations!</h2> <p>Your application is now running on a container in Amazon ECS.</p> </div></body></html>' >  /usr/local/apache2/htdocs/index.html && httpd-foreground\""
        ],
        "logConfiguration": {
            "logDriver": "awslogs",
            "options": {
                "awslogs-group": "${aws_cloudwatch_log_group.mz_dev_app.name}",
                "awslogs-region": "ap-northeast-1",
                "awslogs-stream-prefix": "${local.app_name}"
            }
        }
    }
]
EOF

  execution_role_arn       = aws_iam_role.ecs_task_exec.arn
  task_role_arn            = aws_iam_role.mz_dev_app.arn

  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task.cpu
  memory                   = var.ecs_task.memory
}
```

以下は ECS タスク定義で定義したアプリケーションに対する CloudWatch のロググループの定義になります。

```hcl:ecs_task.tf
resource "aws_cloudwatch_log_group" "mz_dev_app" {
  name              = "/aws/ecs/fargate/${local.app_name}"
  retention_in_days = var.log_retention_in_days
}
```

## ECS サービスの作成

ECS タスクをスタンドアロンでも起動が可能ですが、通常は ECS サービスから起動されます。なお、ECS タスクをスタンドアロンで起動するのは、バッチプロセスなど、何らかの処理を実行して停止するアプリケーションの場合になります。

ECS サービスは実行するタスクに関する設定を定義します。

- どのクラスター上で実行するのか
- いくつタスクを起動するのか
- ネットワーク環境（実行するサブネットやセキュリティグループなど）
- サービスレジストリとの接続設定
- デプロイ時のエラー対応（サーキットブレーカー）
- ...

基本的にはデプロイの実行に関するものや ECS タスクをどこで実行するのかといった実行に必要な情報を定義します。
ECS タスク定義では「何をどのように動かすか」を定義し、ECS サービスでは「どこでどのように動かすか」を定義することになります。

なお、`service_registry`はサービスレジストリである CloudMap に対するサービスの登録に関する情報を設定しています。

```hcl:ecs_service.tf
resource "aws_ecs_service" "mz_dev_app" {
  name                 = local.app_name
  cluster              = aws_ecs_cluster.this.id
  task_definition      = aws_ecs_task_definition.mz_dev_app.arn
  desired_count        = var.ecs_service.desired_count
  force_new_deployment = true
  launch_type          = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.ecs.id]
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.mz_dev_app.arn
    container_name = local.app_name
    container_port = 80
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
```

## ECS のセキュリティグループの作成

ECS で動作するアプリケーション用のセキュリティグループを定義します。
インプットルールでは Web アプリケーションへアクセスするため、 TCP で 80 番ポートに許可を与えています。
アウトプットルールはすべてを許可しています。
実際のルールは ECS クラスター利用するアプリケーションに合わせる必要があります。

```hcl:main.tf
resource "aws_security_group" "ecs" {
  name   = local.ecs_security_group_name
  vpc_id = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = {
    Name  = "${local.prefix}-ecs-security-group"
  }
}
```

# Preflight 用 AWS Lambda の作成

CloudMap や API Gateway の構築の前に、Preflight チェックで利用する AWS Lambda を作成します。

## Preflight 関数の実装

関数の内容は単純に 200 系のコード（レスポンスが空なので 204）と 2 つの HTTP ヘッダを返すだけの単純な実装です。

```python:preflight.py
def lambda_handler(event, context):
    return {
        'statusCode': 204,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            "Access-Control-Allow-Headers": "Content-Type",
        }
    }
```

## Preflight 用 AWS Lambda の実行ロール

ここでは`aws_lambda_function`の`role`に設定する IAM ロール、AWS Lambda の実行ロールを作成します。
AWS Lambda の実行ロールは AWS Lambda の関数がアクセスする AWS リソースのためではなく、AWS Lambda の関数自体の実行に必要な許可です[^4]。
例えば、AWS Lambda に対して CloudWatch でログを記録する場合、`logs:PutLogEvents`などのアクセス許可をこの IAM ロールに付与する必要があります。
なお、AWS Lambda の関数内でアクセスする AWS リソースに対する許可は`aws_lambda_permission`で付与します。
ざっくりというと、ECS タスクのタスク実行ロールとタスクロールにそれぞれ対応するものと考えられます。

[^4]: AWS Lambda の実行ロールに関しては[実行ロールを使用した Lambda 関数のアクセス許可の定義](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/lambda-intro-execution-role.html)を参照。

```hcl:preflight.tf
data "aws_iam_policy_document" "lambda_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"

    principals {
      identifiers = ["lambda.amazonaws.com"]
      type        = "Service"
    }
  }
}

resource "aws_iam_role" "preflight" {
  name               = "${local.prefix}-lambda-preflight-function-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
}
```

## AWS Lambda の作成

先程の関数の実装と IAM ロールを踏まえて、Preflight の AWS Lambda を作成します。
AWS Lambda のハンドラ(`aws_lambda_function.preflight`リソースの`handler`属性)は`<ファイル名>.<関数名>`とする必要があります。
また、関数の実装ファイルはアーカイブにするため、`data`の`archive_file`で定義します。

他には実行環境に関する設定などを追加します。
この Preflight は Python で実装されているので Python の実行バージョンを指定しています。
また、`architectures`にデフォルトの`"x86_64"`ではなく、コスト面で有利な`"arm64"`を指定してます。

Preflight 用 AWS Lambda は簡単な関数なのでこれだけです。
より本格的なアプリケーション用の AWS Lambda を作成する場合は、コンテナイメージや AWS Lambda Layers の指定などができます。

```hcl:preflight.tf
data "archive_file" "preflight" {
  type        = "zip"
  source_file = "${path.module}/lambda/preflight.py"
  output_path = "preflight_lambda_function.zip"
}

resource "aws_lambda_function" "preflight" {
  function_name    = "${local.prefix}-lambda-preflight-function"
  handler          = "preflight.lambda_handler"
  filename         = data.archive_file.preflight.output_path
  source_code_hash = data.archive_file.preflight.output_base64sha256

  role             = aws_iam_role.preflight.arn

  architectures = ["arm64"]
  runtime          = "python3.12"
  timeout          = 3
}
```

# CloudMap の構築

API Gateway とアプリケーションの仲立ちをするための CloudMap を構築します。

## プライベート DNS 名前空間の作成

SSS のサービス間連携のためにプライベート DNS 名前空間を定義します。

:::stop:プライベート DNS 名前空間の名称
プライベート DNS 名前空間の名称は、サービス間連携（サービスコネクト）で利用されます。
そのため、RFC で規定されている DNS 名 および URL の文字数および文字種の制限に従っている必要があります。
SSS では`_`を使っていたのですが、ライブラリのバージョンアップでチェックが厳しくなったためか、URL 取得で`NullPointerException`が発生するようになってしまいました。
結局、エラーを解消するためにプライベート DNS 名前空間の名称を修正することになりました。
:::

```hcl:main.tf
resource "aws_service_discovery_private_dns_namespace" "this" {
  name = local.service_discovery_dns_namespace
  vpc  = var.vpc_id
}
```

管理コンソールでは以下のように確認できます。

![プライベートDNS名前空間の管理コンソールイメージ](/img/sss/sss-by-iac-route53.png "CloudMapのプライベートDNS名前空間")

## アプリケーションの CloudMap サービスの作成

アプリケーションの ECS サービスが CloudMap で検索できるように、 CloudMap の名前空間に対して CloudMap サービスを定義します。

DNS レコードにはサービス検出の場合はタイプが`A`か`SRV`である必要があります。
SSS では Java のサービスと Python のサービスでポートが異なっているため、ポート指定ができる`SRV`を指定しています。
また、 AWS で推奨されている HealthCheckCustomConfig を Amazon ECS サービスのサービス検出により管理されるコンテナレベルのヘルスチェックを使用しています[^5]。

[^5]: [サービスの検出に関する考慮事項](https://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/service-discovery.html#service-discovery-considerations)を参照。

```hcl:ecs_service.tf
resource "aws_service_discovery_service" "mz_dev_app" {
  name         = local.app_name
  namespace_id = aws_service_discovery_private_dns_namespace.this.id

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.this.id

    dns_records {
      ttl  = 300
      type = "SRV"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}
```

# API Gateway の構築

最後にシステムの入口となる API Gateway を構築します。

## HTTP API の作成

まずは API Gateway の基本要素として種別と CORS 設定[^6]を定義します。
SSS では以下の理由で種別は HTTP API としました。

- JWT 認証をサポートしている
- CloudMap との統合をサポートしている
- 最小限の機能で構成されている
- 低価格である

[^6]: CORS の詳細は[Cross-Origin Resource Sharingr(CORS)](https://developer.mozilla.org/ja/docs/Web/HTTP/CORS)を参照。

:::check:REST API vs HTTP API
AWS API Gateway で RESTful API を提供する場合は REST API と HTTP API の 2 つがあります。
基本的には HTTP API の方が最小構成で低価格ですが、JWT についてはなぜか REST API は AWS Lambda を使って検証する必要があります。
バックエンドとの統合についても ALB や CloudMap が未対応など、実際に使う AWS サービス構成に応じて選択する必要があります。

[REST API と HTTP API のどちらかを選択する](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/http-api-vs-rest.html)
:::

HTTP API の場合、CORS を設定するとプリフライト OPTIONS リクエストのレスポンスをするようになります[^7]。

[^7]: HTTP API の場合は機能が少ないためか、残念ながら、REST API で推奨されている [Mock 統合](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/how-to-mock-integration-console.html)がサポートされていないようです。

```hcl:apigw.tf
resource "aws_apigatewayv2_api" "this" {
  name          = "${local.prefix}-api-gateway"

  protocol_type = "HTTP"

  cors_configuration {
    allow_origins     = var.allow_origins
    allow_headers     = ["origin", "x-requested-with", "content-type", "authorization", "accept"]
    allow_methods     = ["GET", "POST", "DELETE", "PUT", "OPTIONS"]
    allow_credentials = true
    max_age           = var.cors_max_age
  }
}
```

## ステージの作成

AWS API Gateway では、API のライフサイクル（バージョンや環境の違い）を扱う論理的な要素としてステージがあります。
SSS では REST API を使って UI とバックエンドの通信していますが、API を公開する予定がないため、API バージョン管理は特に行っていません。
また、環境は AWS アカウントおよびドメイン名が異なっています。
これらの理由により、ステージに関してはデフォルト（`$default`）のみを利用しています。

ステージはデプロイする必要がありますが、デフォルトのみのため、自動デプロイを有効にしています。

他にはログに関する設定をしています。
`access_log_settings`の`format`で出力する項目を指定しています。

```hcl:apigw.tf
resource "aws_apigatewayv2_stage" "this" {
  name        = "$default"

  api_id      = aws_apigatewayv2_api.this.id
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format          = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      path           = "$context.path"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      errMsg         = "$context.integrationErrorMessage"
    })
  }
}
```

以下は API Gateway の`$default`ステージに対する CloudWatch のロググループの定義になります。

```hcl:apigw.tf
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/api-gateway/mz-dev"
  retention_in_days = var.log_retention_in_days
}
```

## VPC Link の作成

後ほど作成する HTTP API ルートから VPC 内のプライベートリソースに接続するプライベート統合を作成するため、VPC リンクを作成します。

```hcl:apigw.tf
resource "aws_apigatewayv2_vpc_link" "this" {
  name               = "${local.prefix}-vpc-link"
  security_group_ids = [var.default_security_group_id]
  subnet_ids         = var.private_subnet_ids
}
```

## 統合の作成

HTTP API ルートをバックエンドのサービスと接続するための統合を作成します。
今回は以下の２つのに対する統合を作成します。

- Preflight の AWS Lambda
- サンプルアプリケーションの CloudMap サービス

### Preflight の統合

まずは、Preflight の統合を作成します。

#### API Gateway から Preflight 用 AWS Lambda の呼び出し許可の付与

API Gateway から直接 AWS Lambda を呼び出す場合、呼び出すための許可を設定する必要があります。

```hcl:apigw.tf
resource "aws_lambda_permission" "preflight" {
  statement_id  = "AllowAPIGatewayPreflight"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.preflight.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}
```

管理コンソールでは以下のように確認できます。

![API GatewayへのAWS Lambda呼び出し許可付与](/img/sss/sss-by-iac-lambda-permission.png "管理コンソールでの表示")

#### Preflight の統合の作成

Preflight に対する統合を作成します。

`integration_type`は AWS Lambda が AWS サービスなので`AWS_PROXY`となります。
`integration_method`についてはチュートリアルやサンプルを参考に`POST`のみを指定しています。
`payload_format_version`は管理コンソールではデフォルトで最新版となるようですが、Terraform は`1.0`となるため、明示的に指定しています。

```hcl:apigw.tf
resource "aws_apigatewayv2_integration" "preflight" {
  api_id                 = aws_apigatewayv2_api.this.id

  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.preflight.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}
```

### アプリケーションの統合

続いてアプリケーションの統合を作成します。

HTTP API のプライベート統合の場合、`integration_type`は`HTTP_PROXY`のみとなります。
CloudMap サービス検出を使用した統合となるのでアプリケーションの CloudMap サービスを`integration_uri`に指定します。
`integration_method`はサンプルアプリケーションの場合、`GET`のみでも大丈夫ですが、一般的には`ANY`とするので`ANY`としています。
VPC リンク経由での接続となるので `connection_type`は`VPC_LINK`、`connection_id`には先に定義した VPC リンクの ID を指定します。

```hcl:ecs_service.tf
resource "aws_apigatewayv2_integration" "mz_dev_app" {
  api_id             = aws_apigatewayv2_api.this.id

  integration_type   = "HTTP_PROXY"
  integration_uri    = aws_service_discovery_service.mz_dev_app.arn
  integration_method = "ANY"

  connection_type    = "VPC_LINK"
  connection_id      = aws_apigatewayv2_vpc_link.this.id
}
```

## オーサライザーの作成

Cognito と連携して JWT 認証[^8]する既存の仕組みを利用して JWT オーサライザーを作成します。
JWT を利用するので、`authorizer_type`は当然`JWT`となります。
`jwt_configuration`には Cognito のユーザープールクライアント ID とユーザープールエンドポイントを指定します。

[^8]: JWT に関しては豆蔵デベロッパーサイトの「[基本から理解する JWT と JWT 認証の仕組み](/blogs/2022/12/08/jwt-auth/)」を参照。

```hcl:apigw.tf
resource "aws_apigatewayv2_authorizer" "jwt_authorizer" {
  name             = "${local.prefix}-jwt-authorizer"

  api_id           = aws_apigatewayv2_api.this.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = var.user_pool_client_ids
    issuer   = "https://${var.cognito_user_pool_endpoint}"
  }
}
```

## アプリケーションに対するルートの作成

最後にアプリケーション API への URL パス名と HTTP メソッドのペアに対してどのオーサライザーとどの統合にルーティングするかを定義します。

今回のサンプアプリケーションの URL パス名は`/`、HTTP メソッドは`GET`のみとなります。
以下の Terraform コードでは`for_each`を使用して、複数の HTTP メソッドが定義された場合にも対応しています。
`route_key`で使用している`each.key`では`var.ecs_service.http_methods`で複数定義されている HTTP メソッドが個々に指定されます。
`target`には統合、`authorizer_id`にはオーサライザーを指定しています。

Preflight チェックとして HTTP メソッドが`OPTION`のルートも定義します。
こちらはオーサライザーを指定しないので`target`の AWS Lambda のみとなります。

```hcl:ecs_service.tf
resource "aws_apigatewayv2_route" "mz_dev_app_preflight" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "OPTIONS /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.preflight.id}"
}

resource "aws_apigatewayv2_route" "mz_dev_app" {
  for_each = var.ecs_service.http_methods
  api_id             = aws_apigatewayv2_api.this.id
  route_key          = "${each.key} /{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.mz_dev_app.id}"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt_authorizer.id
  authorization_type = "JWT"
}
```

# 外部入力

既存の AWS リソースの ID などは Terraform の`variable`[^9]として定義しています。
以下に変数、型、デフォルト値、概要を示します。
型が`object`となっている変数についての詳細は各変数の表にて同じく詳細を示してあります。

[^9]: `variable`については[Input Variables](https://developer.hashicorp.com/terraform/language/values/variables)を参照。

| 変数名                       | 型             | デフォルト値 | 概要                                     |
| ---------------------------- | -------------- | ------------ | ---------------------------------------- |
| `aws_account_id`             | `string`       |              | AWS アカウント ID                        |
| `vpc_id`                     | `string`       |              | VPC ID                                   |
| `default_security_group_id`  | `string`       |              | デフォルトセキュリティグループ ID        |
| `allow_origins`              | `list(string)` |              | 許可するオリジン                         |
| `cors_max_age`               | `number`       | `80000`      | CORS 最大時間（秒）                      |
| `log_retention_in_days`      | `number`       | `7`          | ログ保持期間（日）                       |
| `cognito_user_pool_endpoint` | `string`       |              | Cognito のユーザープールのエンドポイント |
| `user_pool_client_ids`       | `list(string)` |              | Cognito のユーザープールクライアント ID  |
| `ecs_task`                   | `object`       |              | ECS タスク定義に関する設定（詳細は後述） |
| `ecs_service`                | `object`       |              | ECS サービスに関する設定（詳細は後述）   |
| `private_subnet_ids`         | `list(string)` |              | プライベートサブネット ID                |

- `ecs_task`

| 変数名   | 型       | デフォルト値 | 概要                  |
| -------- | -------- | ------------ | --------------------- |
| `memory` | `number` | `512`        | タスクのメモリ量      |
| `cpu`    | `number` | `256`        | タスクの仮想 CPU の値 |

- `ecs_service`

| 変数名          | 型            | デフォルト値 | 概要 |
| --------------- | ------------- | ------------ | ---- |
| `desired_count` | `number`      | `1`          |      |
| `http_methods`  | `set(string)` | `["GET"]`    |      |

# 最後に

SSS で実際に構築したインフラとその IaC 実装をベースにその内容を紹介しました。
IaC で実装するとインフラが何度も作成と破棄が可能となります。
実際にこの記事を執筆する際にも、記事を作成して動作確認などをする際にだけサンプルアプリシステムを作成し、他の作業をする際には破棄をするということを行っていました。

ここで取り上げなかったローカル変数やプロバイダ設定などを含めたコードの全体は[IaC で Sales Support System のインフラ構築](https://github.com/mamezou-tech/sss-by-iac)のリポジトリから入手可能です。
そのまま試してみることももちろん、今回取り上げられなかった組み合わせを試してみたり、タスク定義を増やして複数サービスにしたりと、色々と応用されてみてはいかがでしょうか。
