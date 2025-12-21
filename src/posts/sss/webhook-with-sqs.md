---
title: IaCでWebhookイベントのキューイングを構築
author: tadashi-nakamura
date: 2025-10-31
tags: [IaC, AWS, terraform, sqs, lambda, Python]
---

# はじめに

社内プロジェクトの[営業支援システム(Sales Support System、以下、SSS)](/in-house-project/sss/intro/)開発で導入した Webhook のイベントキューイングの Terraform での構築手順を紹介します。

# 背景

<!-- 1 -->

SSS ではワークフローを提供する SaaS と稟議の進捗イベントを Webhook 連携することでデータのステータス管理をしています。
初期の段階では優先度や工数の制約により、直接呼び出しで運用が開始されました。

しかし、以下にあげる事情により、イベントのキューイングを導入することにしました。

- 想定していた機能開発が完了し、先送りしていた機能改善に着手する工数ができた。
- 優先度や頻度の多い他のエラーが解消されて優先度が上位になった。
- 運用リカバリで、ただでさえ少ない工数なのに手動データパッチの手間やワークフローの再申請などの利用者の負担となることも。[^1]
- 運用保守向けの補足的な機能で、技術的な選択の自由度が高い。

[^1]: 運用工数削減に関しては他のエラー対応の改善（半自動化やチェック強化など）の一環でもあります。

# キューイング機能に対する要件

実際に SaaS 連携イベントのキューイングを導入するに当たり、以下のような要件を満たすべく、いくつかの AWS サービスを比較検討しました。

- メッセージを取りこぼさないでほしい。
- 順番を保証してほしい。
  - 順序を保証してほしいイベントは状態が遷移しないと次のイベントが出せないので実質的な問題は発生しないが仕組みとして保証できればしたい。
- 受信失敗したときにメッセージが残っていてほしい。
- 失敗したメッセージを簡単に再送出来るとなお良し。
- ECS の SSS サービスとは独立させたい。
  - 独立していないとリプレースで ECS サービス停止中に同じ問題が発生してしまう。
- 既存の SSS サービスへの修正ができるだけ少ない方が良い。
  - 追加機能だけが依存するのがベスト。
- どうせならサーバレスなサービスを利用したい。

# 機能比較／検討

<!-- 11 -->

以上の要件を踏まえて機能比較表を作成して評価しました。[^11]
本当は重みがありそうですが、ポイントは単純に〇（2）、△ と？（1）、×（0）で換算しています。

| 案  | サービス | タイプ     | 順序 | exactly-once | サーバレス | API GW 統合[^12] | 送信失敗時 | 振り分け | ポイント | 備考 |
| --- | -------- | ---------- | ---- | ------------ | ---------- | ---------------- | ---------- | -------- | -------- | ---- |
| 1   | SQS      | 標準       | ×    | ×            | 〇         | 〇               | DLQ        | Lambda   | 4        |
| 2   | SQS      | FIFO       | 〇   | 〇           | 〇         | 〇               | DLQ        | Lambda   | 8        |
| 3   | SNS      | 標準       | ×    | ×            | 〇         | ×（Lambda）      | ？         | SNS      | 4(3-5)   |
| 4   | SNS      | FIFO       | 〇   | 〇           | 〇         | ×（Lambda）      | ？         | SNS      | 6(5-7)   |
| 5   | Kinesis  | DataStream | 〇   | ？           | 〇         | 〇               | ？         | Lambda   | 7(5-9)   |
| 6   | SNS+SQS  | FIFO+FIFO  | 〇   | 〇           | 〇         | ×（Lambda）      | DLQ        | SNS      | 6        |
| 7   | SQS+SNS  | FIFO+FIFO  | 〇   | 〇           | 〇         | 〇               | DLQ        | Lambda   | 8        |

なお、DLQ（Dead Letter Queue）は正常に処理できなかったメッセージを一時的に保存するための特別なメッセージキューのことです。

[^11]: 参考として AWS のメッセージングサービスの決定木を紹介している[Decision Tree: choose the right AWS messaging service \| Better Dev](https://betterdev.blog/decision-tree-sqs-sns-kinesis-eventbridge/)も参照。
[^12]: AWS API Gateway V2 を使う場合（ECS 統合で利用しているため）。利用できない場合は Lambda 経由となるため Lambda の開発が追加になる。

:::check:SNS の送信失敗
当時は見つけられなかったのか、比較表では SNS の送信失敗時は「？」となっていますが、SNS も DLQ があるようです。
[Amazon SNS デッドレターキュー \- Amazon Simple Notification Service](https://docs.aws.amazon.com/ja_jp/sns/latest/dg/sns-dead-letter-queues.html)
実体は SQS の DLQ に連携するらしいですが。
:::

比較表からポイントで単純に絞り込んで案 2 か案 7 のいずれか。

- 1 ポイント差の案 5 も惹かれるけど「イベントストリーム」というほどデータは来ないので廃案。
- 案 7 は振り分けに SNS が使えないかと考えたがキュー自体を分けるか結局 Lambda を利用する必要があったので組み合わせのメリットがなくなったため廃案。
  - 大したデータ量と頻度もないのに複数のキューに分けて管理とかしたくないのも理由。
  - 1 つのキューにすると結局は Lambda で振り分けになる。
    - これだと SNS 意味がないのでは？
    - 案 2 に無駄に SNS が追加されただけになる。
- 案 2 はメッセージグループ ID で Lambda が振り分け。
  - メッセージグループ ID は API Gateway との統合で設定可能（ルート（URL パス）ごとにできる）。

以上の検討の結果、以下の AWS サービス構成と呼び出しフローとすることになりました。

![システム構成図](/img/sss/webhook-with-sqs-arch.png "システム構成図")

## 補足事項

- SQS のイベント監視の Lambda のポーリングは実体がそうなっているだけで実装するわけではない。
  - イベントソースとして SQS を指定するだけ。
- 直接 CloudMap を呼び出したかったが上手くいかなかった。
  - サービスディスカバリで CloudMap の登録サービスの取得まではいけたが、呼び出しが戻ってこないでタイムアウトする。
  - 同じ URL で踏み台サーバから curl で呼び出したら出来たのに AWS Lambda からだとうまくいかなかった。
  - 設定とかいろいろやれば行けるのかもしれないが、後日の課題とした。
- 当たり前だが、Amazon API Gateway 経由では行けたのでこちらの方式で対応することにした。
  - 結局 Amazon API Gateway のパスがさらされたままだから、SSS サービスを直接呼べるように将来はしたいところ。

# 構築の前提事項

<!-- 21 -->

外部システムから既存システムの Webhook の呼び出しの間にキューを差し込む形になるため、以下が前提となっています。

- [IaC で Sales Support System のインフラ構築](/in-house-project/sss/sss-by-iac/)で紹介した API Gateway 経由で ECS サービスを呼び出すシステムが既に構築されていること。
- ECS サービスは Webhook 用の API が公開されていること。

この記事では 2 つ目の前提の代替として AWS Lambda の統合を利用するものとします。

![ダミーアプリ](/img/sss/webhook-with-sqs-webhook-application.png "ダミーアプリ")

次章から具体的な実装について説明していきます。

<!--
memo
- API Gateway ⇒ SQS
  - integration
  - route
- SQS ⇒ Lambda
  - integration?
  - role/policy
  - lambda func script
 -->

# メッセージキュー

まずは 以下の 2 つの AWS SQS の作成をしていきます。

- Webhook 用メッセージキュー
- DLQ

## Webhook 用メッセージキュー

メインとなる Webhook 用のメッセージキューの作成です。
AWS SQS では 2 種類のキューがありますが、今回は FIFO キューを利用します。

`fifo_queue`を`true`にしていますが FIFO の場合はキュー名のサフィックスが`.filo`でなければなりません。
また、DLQ を利用するため、関連付け（`deadLetterTargetArn`）が必要となります。
他にはメッセージの重複判定をコンテンツベースにするのと可視性タイムアウト（処理中に他からメッセージが見えなくなる時間）を設定しています。

```hcl:main.tf
resource "aws_sqs_queue" "webhook_queue" {
  name                        = "${local.webhook_queue_name}.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  visibility_timeout_seconds  = local.processing_timeout
  redrive_policy              = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.webhook_dlq.arn
    maxReceiveCount     = var.webhook.max_receive_count
  })
}
```

## DLQ

次に DLQ の作成になります。
メインのメッセージキューよりシンプルに定義できます。

キュー名についてはメインのメッセージキューと同様に`.fifo`サフィックスが必要です。
リカバリ処理で失敗したメッセージ内容の確認をするまでの時間を調整するため、保持期間（`message_retention_seconds`、デフォルトは 4 日間）を外部変数で指定しています。

```hcl:main.tf
# DLQ
resource "aws_sqs_queue" "webhook_dlq" {
  name                      = "${local.webhook_queue_name}-dlq.fifo"
  fifo_queue                = true
  message_retention_seconds = var.webhook.dlq_retention_second
}
```

# キューイング用 Webhook API

今回は SSS 同様に API Gateway は既存のものがある前提となるため、新たに SQS が受けるための設定を API Gateway へ追加することになります。
具体的には以下のものになります。

- ルート
- 統合

なお、API Gateway 自体の構築については[IaC で Sales Support System のインフラ構築](/in-house-project/sss/sss-by-iac/#api-gateway-%E3%81%AE%E6%A7%8B%E7%AF%89)の記事を参照ください。

## キューイング Webhook API に対するルート

今回は JWT 認証しないため、以前のアプリケーション用のルートよりもシンプルになります。
ルートキーのパスは`/sqs-hook`としています。
HTTP メソッドは SSS で利用している SaaS の指定（`POST`）に合わせています。

なお、API Gateway の ID については既存の参照としてデータソースを利用しています。
API Gateway 自体も新規に作成する場合は通常の AWS リソースへの参照となります。

```hcl:integration.tf
resource "aws_apigatewayv2_route" "webhook_event_route" {
  api_id              = data.aws_apigatewayv2_api.this.id
  route_key = "POST /sqs-hook"
  target    = "integrations/${aws_apigatewayv2_integration.webhook_event_producer.id}"
}
```

## SQS との統合

続いて API Gateway と SQS を関連付けるための統合を作成します。

`integration_subtype`として`SQS-SendMessage`を指定しています。
これによって SQS への送信用として統合されます。

更に`request_parameters`で以下の設定をします。[^21]

- キューイング Webhook API に対する URL（必須）
- メッセージグループ ID
- メッセージボディ（必須）

```hcl:integration.tf
resource "aws_apigatewayv2_integration" "webhook_event_producer" {
  description         = "Queue of Webhook Event"
  api_id              = data.aws_apigatewayv2_api.this.id
  integration_type    = "AWS_PROXY"
  integration_subtype = "SQS-SendMessage"
  credentials_arn     = aws_iam_role.webhook_event_producer_role.arn

  request_parameters = {
    "QueueUrl"       = aws_sqs_queue.webhook_queue.url
    "MessageGroupId" = local.message_group_id
    "MessageBody"    = "$request.body"
  }
}
```

[^21]: `request_paramters`の項目は`integration_subtype`の値によって変わります。詳細は[Integration subtype reference \- Amazon API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-aws-services-reference.html)を参照。

## SQS 送信のための IAM ロール

API Gateway が SQS にメッセージ送信するための権限を付与するための IAM ロールを作成します。

API Gateway に対するロールなので信頼ポリシー（`apigateway_assume_role`）の `principals`に API Gateway を指定します。
付与するポリシーは SQS への送信のみのため`actions`として`sqs:SendMessage`のみを指定します。

これらを API Gateway 統合用の IAM ロールに関連付けます。
念の為ですが、`aws_iam_role_policies_exclusive`も指定しておきます。

```hcl:integration.tf
data "aws_iam_policy_document" "apigateway_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["apigateway.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "sqs_send_only_policy" {
  statement {
    actions   = ["sqs:SendMessage"]
    resources = ["${aws_sqs_queue.webhook_queue.arn}"]
  }
}

resource "aws_iam_role" "webhook_event_producer_role" {
  name               = "${local.prefix}-webhook-event-producer-role"
  assume_role_policy = data.aws_iam_policy_document.apigateway_assume_role.json
}

resource "aws_iam_role_policy" "sqs_integration_access_policy" {
  name   = "sqs-integration-access-policy"
  role   = aws_iam_role.webhook_event_producer_role.id
  policy = data.aws_iam_policy_document.sqs_send_only_policy.json
}

resource "aws_iam_role_policies_exclusive" "webhook_event_producer_role_policies" {
  role_name = aws_iam_role.webhook_event_producer_role.name
  policy_names = [
    aws_iam_role_policy.sqs_integration_access_policy.name
  ]
}
```

# SQS Labmda トリガー

<!-- 31 -->

SQS の準備ができたので、SQS からメッセージを受け取ってアプリケーションの Webhook に送信するための Lambda トリガーを作成します。

![イベントプロデューサー](/img/sss/webhook-with-sqs-webhook-event-producer.png "イベントプロデューサー")

## SQS Lambda トリガー用 Lambda 関数

メッセージを受け取ったらアプリケーションの Webhook に送信するための AWS Lambda 関数を作成します。
SQS のトリガーとして AWS Lambda を関連付けるためにはキューの URL の環境変数と`aws_lambda_event_source_mapping`の定義が必要となります。

キューへの URL 指定は`aws_lambda_function`の環境変数で設定し、環境変数名は`QUEUE_URL`になります。
`archive_file`データソースなどの他の設定は通常の AWS Lambda と同様に行います。
設定の詳細は[本記事のリポジトリ](https://github.com/mamezou-tech/webhook-with-sqs)のコードや Terraform のドキュメントを参照してください。

続いて`aws_lambda_event_source_mapping`を定義します。
イベントソースは当然ながら Webhook 用メッセージキューを指定します。
Lambda 関数も今回定義したトリガ用のものを指定します。
他にバッチサイズ（SSS は 1 つずつなので`1`）と同時処理最大数を設定しています。

```hcl:main.tf
resource "aws_lambda_function" "webhook_event_producer" {
  description      = "Webhook Event Producer"
  function_name    = local.webhook_event_producer_function_name
  handler          = "${local.webhook_event_producer_module_name}.lambda_handler"
  filename         = data.archive_file.webhook_event_producer.output_path
  source_code_hash = data.archive_file.webhook_event_producer.output_base64sha256

  role = aws_iam_role.webhook_event_producer_execution_role.arn

  runtime       = var.webhook.runtime
  architectures = ["arm64"]
  timeout       = local.processing_timeout

  environment {
    variables = {
      QUEUE_URL = aws_sqs_queue.webhook_queue.url
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.webhook_event_producer_basic_execution_role_attach,
    aws_cloudwatch_log_group.webhook_event_producer,
  ]
}

resource "aws_lambda_event_source_mapping" "webhook_event_producer_mapping" {
  event_source_arn = aws_sqs_queue.webhook_queue.arn
  function_name    = aws_lambda_function.webhook_event_producer.function_name
  batch_size       = 1 # 1つのメッセージごとに Lambda 関数を呼び出します
  scaling_config {
    maximum_concurrency = var.webhook.max_concurrency
  }
}
```

## SQS Lambda トリガーのための IAM ロール

SQS Lambda トリガーは SQS からのメッセージを受信する権限のみを付与します。

システム構成図で SQS のイベント監視の AWS Lambda が SQS をポーリングしていましたが、ここにイベントソース処理実装の影響が出ています。
AWS Lambda のロジックには SQS のメッセージ受信処理はないのに、キューの確認やメッセージ受信、受信後のキューからのメッセージ削除などの権限が必要になっています。

```hcl:main.tf
data "aws_iam_policy_document" "sqs_receive_message_policy" {
  statement {
    actions = [
      "sqs:ReceiveMessage",
      "sqs:ChangeMessageVisibility",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes"
    ]
    resources = ["${aws_sqs_queue.webhook_queue.arn}"]
  }
}

resource "aws_iam_role" "webhook_event_producer_execution_role" {
  name               = local.webhook_event_producer_execution_role_name
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
}

resource "aws_iam_role_policy" "sqs_receive_message_policy" {
  name   = "sqs-receive-message-policy"
  role   = aws_iam_role.webhook_event_producer_execution_role.id
  policy = data.aws_iam_policy_document.sqs_receive_message_policy.json
}

resource "aws_iam_role_policies_exclusive" "webhook_event_producer_execution_role_policies" {
  role_name = aws_iam_role.webhook_event_producer_execution_role.name
  policy_names = [
    aws_iam_role_policy.sqs_receive_message_policy.name,
  ]
}

resource "aws_iam_role_policy_attachment" "webhook_event_producer_basic_execution_role_attach" {
  role       = aws_iam_role.webhook_event_producer_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

## SQS Lambda トリガー関数

Lambda 関数は Python で実装しています。
Python ファイル内には 3 つの関数が定義されています。

- `lambda_handler`
- `extract_data_from_event`
- `send_request`

`lambda_handler`関数は AWS Lambda のエントリポイント関数で主処理になります。
まず、第 1 引数で渡されたイベントから`extract_data_from_event`で宛先とメッセージを取り出します。
次に、`send_request`で取得した宛先とメッセージを API Gateway のアプリケーションの Webhook API に転送します。

`extract_data_from_event`はデータ構造[^31]をチェックしながら、メッセージグループ ID とメッセージ自体を取り出します。
イベントは Python では`dict`として扱うことができます。
メッセージグループ ID からアプリケーションの URL に変換して、その URL とメッセージ内容を返します。

`send_request`は引数で渡された元のアプリケーションの Webhook API の URL に対してメッセージを HTTP の POST メソッド で呼び出します。
API Gateway の呼び出しは普通に HTTP 通信すれば大丈夫です。

Python の Lambda 関数の実装に際して以下の点に注意してください。

- データはエンコードする必要がある。
- 処理に失敗した（DLQ に入れる）場合は例外にする。
  - お行儀よく `4xx` や `5xx` のコードを返して正常終了にしていたら、DLQ にメッセージが転送されませんでした。

AWS Lambda 関数のコード詳細は[本記事のリポジトリ](https://github.com/mamezou-tech/webhook-with-sqs)を参照ください。

[^31]: イベントの具体的な構造は[FIFO キューメッセージイベントの例](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/with-sqs.html#sample-fifo-queues-message-event)を参照。

# データソース

API Gateway は[IaC で Sales Support System のインフラ構築](/in-house-project/sss/sss-by-iac/)で構築したものを取得します。
統合の定義などに API Gateway の ID が必要ですが、`aws_apigatewayv2_api`データソースを直接使うと ID が必要になってしまうのでひと工夫しています。

```hcl:data.tf
data "aws_apigatewayv2_apis" "this" {
  protocol_type = "HTTP"
  name          = var.apigw_name
}

data "aws_apigatewayv2_api" "this" {
  api_id = one(data.aws_apigatewayv2_apis.this.ids)
}
```

# 最後に

SSS では定期リリースのおりに、作業前に通知しているにもかかわらず、SaaS からのメッセージを送る操作をしてしまうユーザがいました。
しかし、これで開発者もユーザもリリースのことを気にせずに作業できるようになりました。
キューイング機能をリリースしてから、実際に何度かリリース中に操作が行われてしまうことがありました。
ですが、DLQ にメッセージが保持されていたため、リリース後に再送することで、後続業務が支障なく進められました。

SSS アプリケーションサービスとは独立したキューとして作成することで、SSS と外部の SaaS との結合度を軽減することが出来ました。
更に、既存のシステムへの改修もなかったため、短期間での導入もできました。
また、DLQ からの再送も AWS 管理コンソールや AWS CLI の機能が使えたため、保守ツールの開発コストも抑えることも出来ました。

今回紹介した内容は[IaC で Webhook イベントのキューイングを構築のリポジトリ](https://github.com/mamezou-tech/webhook-with-sqs)からコードを入手可能です。
また、[IaC で Sales Support System のインフラ構築](/in-house-project/sss/sss-by-iac/)のリポジトリコードと合わせることで、実際に動作させて確認することが出来ます。
