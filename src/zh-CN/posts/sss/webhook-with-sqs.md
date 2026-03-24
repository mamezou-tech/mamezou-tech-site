---
title: 使用 IaC 构建 Webhook 事件队列
author: tadashi-nakamura
date: 2025-10-31T00:00:00.000Z
tags:
  - IaC
  - AWS
  - terraform
  - sqs
  - lambda
  - Python
translate: true

---

# 引言

在内部项目的[Sales Support System（销售支持系统，以下简称 SSS）](/in-house-project/sss/intro/)开发中引入的 Webhook 事件排队功能的 Terraform 构建步骤。

# 背景

SSS 通过提供工作流的 SaaS 与审批进度事件的 Webhook 集成来管理数据状态。  
在初期阶段，由于优先级和人力工时的限制，以直接调用方式开始运行。

但是，鉴于以下情况，我们决定引入事件排队功能。

- 原计划的功能开发已经完成，终于有工时着手推迟了的功能改进。  
- 优先级高、频次多的其他错误已得到解决，使得该功能的优先级上升。  
- 在运维恢复过程中，本来就少的人力工时却需要手动打补丁或重新发起工作流申请，增加了用户负担。[^1]  
- 作为运维保养的补充功能，技术选型自由度较高。

[^1]: 在运维工时削减方面，这也是改进其他错误处理（半自动化或强化检查等）的一部分。

# 对排队功能的需求

在实际为 SaaS 集成事件引入排队功能时，为满足以下需求，我们比较和评估了几种 AWS 服务。

- 不要丢失任何消息。  
- 需要保证顺序。  
  - 需要保证顺序的事件在状态未迁移前无法发送下一个事件，从实质上不会出现问题，但仍希望机制上予以保证。  
- 接收失败时，消息应保留在队列中。  
- 如果能简单重发失败的消息则更好。  
- 希望与 ECS 上的 SSS 服务相互独立。  
  - 若不独立，在替换期间 ECS 服务停机时会出现相同问题。  
- 对现有的 SSS 服务修改应尽可能少。  
  - 最好只有新增功能依赖此改动。  
- 如果可能，优先使用 Serverless 服务。

# 功能比较/讨论

基于以上需求，我们制作了功能比较表进行评估。[11]  
实际上可能有权重差异，但这里仅以 ○（2 分）、△ 与 ？（1 分）、×（0 分）简单计分。

| 方案 | 服务      | 类型         | 顺序 | exactly-once | 无服务器 | API GW 集成[12] | 发送失败  | 分发方式 | 分数 | 备注 |
| ---- | --------- | ------------ | ---- | ------------ | -------- | --------------- | --------- | -------- | ---- | ---- |
| 1    | SQS       | 标准         | ×    | ×            | ○        | ○               | DLQ       | Lambda   | 4    |      |
| 2    | SQS       | FIFO         | ○    | ○            | ○        | ○               | DLQ       | Lambda   | 8    |      |
| 3    | SNS       | 标准         | ×    | ×            | ○        | ×（Lambda）     | ？        | SNS      | 4(3-5) |  |
| 4    | SNS       | FIFO         | ○    | ○            | ○        | ×（Lambda）     | ？        | SNS      | 6(5-7) |  |
| 5    | Kinesis   | DataStream   | ○    | ？           | ○        | ○               | ？        | Lambda   | 7(5-9) |  |
| 6    | SNS+SQS   | FIFO+FIFO    | ○    | ○            | ○        | ×（Lambda）     | DLQ       | SNS      | 6    |      |
| 7    | SQS+SNS   | FIFO+FIFO    | ○    | ○            | ○        | ○               | DLQ       | Lambda   | 8    |      |

注：DLQ（Dead Letter Queue）是用于暂存无法正常处理的消息的特殊消息队列。

[^11]: 参考 AWS 消息服务决策树 [Decision Tree: choose the right AWS messaging service | Better Dev](https://betterdev.blog/decision-tree-sqs-sns-kinesis-eventbridge/)。  
[^12]: 这里使用的是 AWS API Gateway V2（因为现有系统使用 ECS 集成）。若无法使用，需要通过 Lambda，因此需额外开发对应 Lambda。

:::check
SNS 发送失败  
当时可能未发现，比较表中 SNS 发送失败时标记为 “？”，但实际上 SNS 也支持 DLQ。  
[Amazon SNS 死信队列 - Amazon Simple Notification Service](https://docs.aws.amazon.com/ja_jp/sns/latest/dg/sns-dead-letter-queues.html)  
其实际是将消息转发到 SQS 的 DLQ。
:::

从比较表上看，按分数简单筛选，剩余方案 2 或 7。

- 虽然方案 5 分数只低 1 分，也颇具吸引力，但并非“事件流”场景，故弃用。  
- 考虑使用 SNS 的分发功能的方案 7，但仍需在队列层面分裂或最终借助 Lambda，组合优势不明显，故弃用。  
  - 毕竟数据量和频次都不大，不想为了这些拆分多个队列来管理。  
  - 如果合并到一个队列，仍需用 Lambda 做分发。  
    - 那么 SNS 的意义何在？  
    - 这只是无谓地在方案 2 上增加 SNS。  
- 方案 2 通过消息组 ID 让 Lambda 分发。  
  - 消息组 ID 可在与 API Gateway 集成时设置（可按路由（URL 路径）区分）。

基于以上讨论，最终确定以下 AWS 服务架构及调用流程。

![系统架构图](/img/sss/webhook-with-sqs-arch.png "系统架构图")

## 补充说明

- SQS 事件监控的 Lambda 实际并非自行轮询，只需将 SQS 指定为事件源即可。  
- 曾尝试直接调用 CloudMap，但未成功。  
  - 通过服务发现可获取 CloudMap 注册的服务，但调用时无响应直至超时。  
  - 同一 URL，在堡垒机上用 curl 可以正常调用，但从 AWS Lambda 发起却失败。  
  - 可能稍作配置即可，但留作后续课题。  
- 显而易见，通过 Amazon API Gateway 方式可行，因此采用此方式。  
  - 毕竟 Amazon API Gateway 的路径仍然暴露，未来仍希望能直接调用 SSS 服务。

# 构建前提条件

由于在外部系统对现有系统 Webhook 调用与实际系统之间插入队列，需满足以下前提条件。

- 已按照 [IaC 方式构建 Sales Support System 基础设施](/in-house-project/sss/sss-by-iac/) 中所述，通过 API Gateway 调用 ECS 服务的系统已搭建完成。  
- ECS 服务已对外公开用于 Webhook 的 API。

本文将以第二项前提的替代方式，使用 AWS Lambda 集成为例。

![示例应用](/img/sss/webhook-with-sqs-webhook-application.png "示例应用")

接下来的章节将介绍具体实现。

# 消息队列

首先创建以下两个 AWS SQS 队列。

- 用于 Webhook 的消息队列  
- 死信队列（DLQ）

## Webhook 消息队列

创建主要的 Webhook 消息队列。AWS SQS 提供两种队列类型，这里使用 FIFO 队列。

在配置中将 `fifo_queue` 设置为 `true`，同时队列名后缀必须为 `.fifo`。  
由于要使用 DLQ，需要关联 `deadLetterTargetArn`。  
另外，设置内容去重和可视性超时（处理时其他消费者不可见的时长）。

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

## 死信队列

接下来创建 DLQ。定义更加简单。

同样需要在队列名后缀添加 `.fifo`。  
为调整重试并确认失败消息内容的时间，通过外部变量设置保留时长（`message_retention_seconds`，默认 4 天）。

```hcl:main.tf
# 死信队列
resource "aws_sqs_queue" "webhook_dlq" {
  name                      = "${local.webhook_queue_name}-dlq.fifo"
  fifo_queue                = true
  message_retention_seconds = var.webhook.dlq_retention_second
}
```

# 排队 Webhook API

此次与 SSS 相同，假设已存在 API Gateway，需要在此基础上新增让 SQS 接收消息的配置，包括：

- 路由（Route）  
- 集成（Integration）

有关 API Gateway 的完整构建，请参见 [IaC 方式构建 Sales Support System 基础设施](/in-house-project/sss/sss-by-iac/#api-gateway-的构建)。

## 排队 Webhook API 的路由

因不进行 JWT 认证，与之前的应用路由相比更加简单。  
路由键为 `POST /sqs-hook`，HTTP 方法与 SSS 使用的 SaaS 要求一致。

API Gateway 的 ID 通过数据源引用现有 API。若新建则直接引用 AWS 资源。

```hcl:integration.tf
resource "aws_apigatewayv2_route" "webhook_event_route" {
  api_id              = data.aws_apigatewayv2_api.this.id
  route_key           = "POST /sqs-hook"
  target              = "integrations/${aws_apigatewayv2_integration.webhook_event_producer.id}"
}
```

## 与 SQS 的集成

为将 API Gateway 与 SQS 关联，需创建一个集成。

通过 `integration_subtype = "SQS-SendMessage"` 指定发送消息到 SQS。  
使用 `request_parameters` 设置以下参数。[21]

- 队列的 URL（必需）  
- 消息组 ID  
- 消息主体（必需）

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

[21]: `request_parameters` 的可用条目取决于 `integration_subtype`，详情请参阅 [Integration subtype reference - Amazon API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-aws-services-reference.html)。

## 用于 SQS 发送的 IAM 角色

为 API Gateway 发送消息到 SQS 授权，创建 IAM 角色。

在信任策略（`apigateway_assume_role`）的 `principals` 中指定 API Gateway 服务。  
仅需允许 `sqs:SendMessage` 操作。

将这些策略关联到 API Gateway 集成的 IAM 角色。为保险起见，同时指定 `aws_iam_role_policies_exclusive`。

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
  role_name    = aws_iam_role.webhook_event_producer_role.name
  policy_names = [
    aws_iam_role_policy.sqs_integration_access_policy.name
  ]
}
```

# SQS Lambda 触发器

准备好 SQS 后，创建 Lambda 触发器，将 SQS 的消息转发到应用的 Webhook。

![事件生产者](/img/sss/webhook-with-sqs-webhook-event-producer.png "事件生产者")

## 用于 SQS Lambda 触发器的 Lambda 函数

创建一个 AWS Lambda 函数，用于接收消息并发送到应用的 Webhook。  
要将 Lambda 与 SQS 关联，需在环境变量中设置队列 URL，并定义 `aws_lambda_event_source_mapping`。

在 `aws_lambda_function` 的环境变量中设置 `QUEUE_URL = aws_sqs_queue.webhook_queue.url`。  
其他如 `archive_file` 数据源等配置与普通 Lambda 相同。更多细节请参阅[本文章的仓库](https://github.com/mamezou-tech/webhook-with-sqs)和 Terraform 文档。

然后定义 `aws_lambda_event_source_mapping`，指定事件源为 Webhook 队列和此 Lambda 函数。  
设置批处理大小（SSS 每次 1 条消息）和最大并发数。

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
  batch_size       = 1 # 每接收一条消息就调用 Lambda 函数
  scaling_config {
    maximum_concurrency = var.webhook.max_concurrency
  }
}
```

## 用于 SQS Lambda 触发器的 IAM 角色

该角色仅授予从 SQS 接收消息的权限。

虽然架构图中 Lambda 看似轮询 SQS，但事件源映射会自动完成这些操作，Lambda 代码无需显式处理。

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
  role_name    = aws_iam_role.webhook_event_producer_execution_role.name
  policy_names = [
    aws_iam_role_policy.sqs_receive_message_policy.name,
  ]
}

resource "aws_iam_role_policy_attachment" "webhook_event_producer_basic_execution_role_attach" {
  role       = aws_iam_role.webhook_event_producer_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

## SQS Lambda 触发函数

Lambda 函数使用 Python 实现，包含三个函数：

- `lambda_handler`  
- `extract_data_from_event`  
- `send_request`

`lambda_handler` 为入口函数：从事件中调用 `extract_data_from_event` 获取目标 URL 和消息内容，再通过 `send_request` 将其转发到应用的 Webhook API。  
`extract_data_from_event` 检查事件结构[31]，提取消息组 ID 和消息体，并将消息组 ID 转换为应用的 URL，返回 URL 与消息内容。  
`send_request` 对目标的 Webhook API URL 以 HTTP POST 方式发送消息，普通 HTTP 调用即可。

注意事项：

- 需对数据进行编码。  
- 若处理失败，抛出异常以让消息进入 DLQ。若返回 `4xx` 或 `5xx` 状态码并正常结束，消息不会被转入 DLQ。

更多代码细节请参见[本文章的仓库](https://github.com/mamezou-tech/webhook-with-sqs)。

[31]: 事件结构示例请参阅[FIFO 队列消息事件示例](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/with-sqs.html#sample-fifo-queues-message-event)。

# 数据源

API Gateway 使用 [IaC 方式构建 Sales Support System 基础设施](/in-house-project/sss/sss-by-iac/) 创建的资源。  
为了在集成定义中获取 API Gateway ID，使用了以下技巧，避免直接传入 ID。

```hcl:data.tf
data "aws_apigatewayv2_apis" "this" {
  protocol_type = "HTTP"
  name          = var.apigw_name
}

data "aws_apigatewayv2_api" "this" {
  api_id = one(data.aws_apigatewayv2_apis.this.ids)
}
```

# 最后

在 SSS 的定期发布期间，尽管会提前通知，用户仍会在发布时向 SaaS 发送消息。  
通过本方案，开发者和用户无需关注发布状态即可继续操作。引入排队功能后，曾几次在发布期间仍有操作，但消息被保留在 DLQ 中，发布结束后重发即可继续后续业务，未造成影响。

将队列与 SSS 应用服务独立部署，降低了 SSS 与外部 SaaS 的耦合度。  
且无需改动现有系统，实现周期短。  
同时，可直接在 AWS 管理控制台或 CLI 从 DLQ 重发消息，运维工具开发成本也得以降低。

本文示例代码可从 [IaC で Webhook イベントのキューイングを構築のリポジトリ](https://github.com/mamezou-tech/webhook-with-sqs) 获取。  
结合 [IaC 方式构建 Sales Support System 基础设施](/in-house-project/sss/sss-by-iac/) 的仓库代码，可实地部署并验证。
