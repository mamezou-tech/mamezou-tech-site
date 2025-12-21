---
title: Building Webhook Event Queuing with IaC
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

# Introduction

In the development of our in-house project [Sales Support System (SSS)](/in-house-project/sss/intro/), we introduced Webhook event queuing, and this article presents the Terraform-based implementation steps.

# Background

<!-- 1 -->

In SSS, data status is managed by integrating with a workflow-providing SaaS via Webhook for approval progress events. At the initial stage, due to priority and resource constraints, operation began with a direct invocation.

However, for the following reasons, we decided to introduce event queuing:

- The planned feature development was completed, freeing up resources to tackle deferred feature improvements.
- Other high-priority or frequent errors were resolved, raising the priority of this task.
- In operational recovery, the already limited resources are further burdened by manual data patches and re-submissions of workflows, impacting users.[^1]
- As it is a supplementary feature for operational maintenance, there is high technical freedom in the choice of implementation.

[^1]: The reduction of operational effort is also part of improvements for other error handling (such as semi-automation and enhanced checks).

# Requirements for the Queuing Function

In actually introducing queuing for SaaS integration events, we compared and evaluated several AWS services to meet the following requirements:

- Should not drop messages.
- Should guarantee order.
  - Although events requiring ordered processing effectively do not cause issues since the next event cannot be emitted before the state transition, we would like order to be guaranteed as a formal mechanism.
- Messages should remain in the queue if processing fails.
- It would be even better if failed messages could be easily resent.
- We want it to be independent of the SSS ECS service.
  - If it's not independent, the same issue could occur during ECS service downtime in a replacement.
- It is preferable to minimize modifications to the existing SSS service.
  - Ideally, only the new feature should have dependencies.
- If possible, we want to use serverless services.

# Feature Comparison / Consideration

<!-- 11 -->

Based on the above requirements, we created and evaluated a feature comparison table.[^11] Although there likely are weights, we simply assigned points as: circle (2), triangle and question mark (1), cross (0).

| Option | Service   | Type       | Order | exactly-once | Serverless | API GW Integration[^12] | On Send Failure | Routing | Points  | Notes    |
| ------ | --------- | ---------- | ----- | ------------ | ---------- | ----------------------- | --------------- | ------- | ------- | -------- |
| 1      | SQS       | Standard   | ×     | ×            | 〇         | 〇                      | DLQ             | Lambda  | 4       |          |
| 2      | SQS       | FIFO       | 〇    | 〇           | 〇         | 〇                      | DLQ             | Lambda  | 8       |          |
| 3      | SNS       | Standard   | ×     | ×            | 〇         | × (Lambda)              | ?               | SNS     | 4 (3-5) |          |
| 4      | SNS       | FIFO       | 〇    | 〇           | 〇         | × (Lambda)              | ?               | SNS     | 6 (5-7) |          |
| 5      | Kinesis   | DataStream | 〇    | ?            | 〇         | 〇                      | ?               | Lambda  | 7 (5-9) |          |
| 6      | SNS+SQS   | FIFO+FIFO  | 〇    | 〇           | 〇         | × (Lambda)              | DLQ             | SNS     | 6       |          |
| 7      | SQS+SNS   | FIFO+FIFO  | 〇    | 〇           | 〇         | 〇                      | DLQ             | Lambda  | 8       |          |

Note that DLQ (Dead Letter Queue) is a special message queue that temporarily stores messages that could not be processed successfully.

[^11]: For reference, also see the decision tree for AWS messaging services introduced at [Decision Tree: choose the right AWS messaging service \| Better Dev](https://betterdev.blog/decision-tree-sqs-sns-kinesis-eventbridge/).
[^12]: When using AWS API Gateway V2 (as is done for the ECS integration). If it cannot be used, it will go via Lambda, requiring additional Lambda development.

:::check:SNS send failure
At that time, perhaps because it wasn't discovered, in the comparison table SNS shows "?" for send failures, but SNS also appears to support DLQ.
[Amazon SNS Dead-Letter Queues - Amazon Simple Notification Service](https://docs.aws.amazon.com/ja_jp/sns/latest/dg/sns-dead-letter-queues.html)
It seems that the actual mechanism connects to the SQS DLQ.
:::

Based on the comparison table, it narrowed down to either option 2 or option 7.

- Option 5, which is only one point behind, was also appealing, but since we do not receive enough data to call it an "event stream", it was discarded.
- For option 7, we considered using SNS for routing, but since splitting the queue itself or ultimately using Lambda was necessary, the benefit of the combination was lost, so it was scrapped.
  - Another reason was that we did not want to manage multiple queues for a relatively low volume and frequency of data.
  - Using a single queue would still require Lambda for routing.
    - In that case, SNS would be meaningless, wouldn't it?
    - It would simply add unnecessary SNS to option 2.
- In option 2, Lambda routes based on the message group ID.
  - The message group ID can be set through the integration with API Gateway (it can be set per route (URL path)).

As a result of the above consideration, the AWS service architecture and invocation flow were determined as follows.

![System Architecture Diagram](/img/sss/webhook-with-sqs-arch.png "System Architecture Diagram")

## Additional Notes

- The polling of Lambda for SQS event monitoring is simply how it functions under the hood and does not require explicit implementation.
  - You only need to specify SQS as the event source.
- We wanted to call CloudMap directly, but it didn't work out.
  - Through service discovery, we could retrieve the registered service from CloudMap, but the call would not return and would time out.
  - Although calling the same URL via curl from a bastion host worked, it failed from AWS Lambda.
  - It might be possible with various configurations, but we left it as a future task.
- Of course, it worked via Amazon API Gateway, so we decided to adopt that approach.
  - In the end, since the path of Amazon API Gateway would remain exposed, we would like to allow direct calls to the SSS service in the future.

# Prerequisites for Construction

<!-- 21 -->

Since a queue will be inserted between external systems and the existing system's Webhook invocation, the following prerequisites apply:

- The system that invokes the ECS service through API Gateway, introduced in [IaC-based infrastructure build for Sales Support System](/in-house-project/sss/sss-by-iac/), has already been set up.
- The ECS service has the API for Webhook publicly exposed.

In this article, we will use AWS Lambda integration as an alternative to the second prerequisite.

![Dummy App](/img/sss/webhook-with-sqs-webhook-application.png "Dummy App")

From the next chapter, we will explain the concrete implementation.

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

# Message Queues

First, let's create the following two AWS SQS queues:

- Webhook message queue
- DLQ

## Webhook Message Queue

This creates the main message queue for Webhook.  
AWS SQS offers two types of queues; in this case, we will use a FIFO queue.

We set `fifo_queue` to `true`, but for FIFO queues, the queue name suffix must be `.fifo`.  
Also, to use a DLQ, an association (`deadLetterTargetArn`) is required.  
Additionally, we configure content-based deduplication and set the visibility timeout (the time during which messages being processed are not visible to other consumers).

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

Next, we create the DLQ.  
It can be defined more simply than the main message queue.

For the queue name, a `.fifo` suffix is required, just like the main message queue.  
To adjust the time until failed messages can be inspected during recovery operations, we specify the retention period (`message_retention_seconds`, default is 4 days) via an external variable.

```hcl:main.tf
# DLQ
resource "aws_sqs_queue" "webhook_dlq" {
  name                      = "${local.webhook_queue_name}-dlq.fifo"
  fifo_queue                = true
  message_retention_seconds = var.webhook.dlq_retention_second
}
```

# Queuing Webhook API

Since, as with SSS, we assume API Gateway already exists, we will add the settings needed for API Gateway to send messages to SQS. Specifically, the following must be added:

- Route
- Integration

For the setup of API Gateway itself, please refer to [IaC-based infrastructure build for Sales Support System](/in-house-project/sss/sss-by-iac/#api-gateway-%E3%81%AE%E6%A7%8B%E7%AF%89).

## Route for the Queuing Webhook API

Since we are not using JWT authentication this time, it is simpler than the previous application route.  
We set the path of the route key to `/sqs-hook`.  
The HTTP method matches the SaaS specification used in SSS (`POST`).

For the API Gateway ID, we are using a data source as an existing reference.  
If API Gateway itself is created anew, it would reference the standard AWS resource.

```hcl:integration.tf
resource "aws_apigatewayv2_route" "webhook_event_route" {
  api_id     = data.aws_apigatewayv2_api.this.id
  route_key  = "POST /sqs-hook"
  target     = "integrations/${aws_apigatewayv2_integration.webhook_event_producer.id}"
}
```

## Integration with SQS

Next, we create an integration to associate API Gateway with SQS.

We specify `SQS-SendMessage` as the `integration_subtype`.  
This sets up the integration for sending to SQS.

Furthermore, we set the following in `request_parameters`.[^21]

- The Queuing Webhook API URL (required)
- Message group ID
- Message body (required)

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

[^21]: The items in `request_parameters` vary depending on the `integration_subtype`. For details, see [Integration subtype reference - Amazon API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-aws-services-reference.html).

## IAM Role for SQS Sending

We create an IAM role to grant permissions for API Gateway to send messages to SQS.  
Since this role is for API Gateway, we specify API Gateway as a principal in the trust policy (`apigateway_assume_role`).  
The policy grants only SQS send permissions, so we list only `sqs:SendMessage` in `actions`.  
We attach these to the IAM role for API Gateway integration.  
For safety, we also specify `aws_iam_role_policies_exclusive`.

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

# SQS Lambda Trigger

<!-- 31 -->

With SQS prepared, we create a Lambda trigger to receive messages from SQS and send them to the application's Webhook.

![Event Producer](/img/sss/webhook-with-sqs-webhook-event-producer.png "Event Producer")

## Lambda Function for SQS Lambda Trigger

We create an AWS Lambda function that sends the message to the application's Webhook upon receiving it.  
To associate AWS Lambda as a trigger for SQS, you need to set the queue URL as an environment variable and define an `aws_lambda_event_source_mapping`.  
The queue URL is set via an environment variable of `aws_lambda_function`, named `QUEUE_URL`.  
Other configurations such as the `archive_file` data source are done as with a standard AWS Lambda.  
For configuration details, see the code in [this article's repository](https://github.com/mamezou-tech/webhook-with-sqs) and the Terraform documentation.

Next, we define `aws_lambda_event_source_mapping`.  
The event source is, of course, the message queue for Webhook.  
We specify the Lambda function that we defined for the trigger.  
We also set the batch size (SSS processes one message at a time, so it's `1`) and the maximum concurrency.

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
  batch_size       = 1 # Invoke the Lambda function for each message
  scaling_config {
    maximum_concurrency = var.webhook.max_concurrency
  }
}
```

## IAM Role for SQS Lambda Trigger

The SQS Lambda trigger is granted only permissions to receive messages from SQS.  
In the system architecture diagram, the AWS Lambda for SQS event monitoring was polling SQS, and here the implementation of the event source processing has an impact.  
Even though the AWS Lambda logic does not contain SQS message receiving handling, it requires permissions to check the queue, receive messages, and delete messages from the queue after receipt.

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

## SQS Lambda Trigger Function

The Lambda function is implemented in Python.  
Three functions are defined in the Python file:

- `lambda_handler`
- `extract_data_from_event`
- `send_request`

The `lambda_handler` function is the AWS Lambda entry-point function and contains the main processing.  
First, it extracts the destination and message from the event passed as the first argument using `extract_data_from_event`.  
Next, it forwards the extracted destination and message to the application's Webhook API on API Gateway using `send_request`.

`extract_data_from_event` checks the data structure[^31] and extracts the message group ID and the message itself.  
In Python, the event can be treated as a `dict`.  
It converts the message group ID to the application's URL and returns that URL along with the message content.

`send_request` invokes the original application's Webhook API URL, passed as an argument, using HTTP POST.  
Calling the API Gateway is fine with a standard HTTP request.

Please note the following points when implementing the Lambda function in Python:

- Data needs to be encoded.
- In case of failure (to send to DLQ), it should raise an exception.
  - If the function neatly returns a `4xx` or `5xx` code and terminates normally, the message is not sent to the DLQ.

For the detailed AWS Lambda function code, refer to [this article's repository](https://github.com/mamezou-tech/webhook-with-sqs).

[^31]: For the specific structure of the event, see [FIFO queue message event example](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/with-sqs.html#sample-fifo-queues-message-event).

# Data Sources

We retrieve the API Gateway that was built in [IaC-based infrastructure build for Sales Support System](/in-house-project/sss/sss-by-iac/).  
The API Gateway ID is required for integration definitions and so on, but directly using the `aws_apigatewayv2_api` data source would require specifying the ID, so we apply a trick.

```hcl:data.tf
data "aws_apigatewayv2_apis" "this" {
  protocol_type = "HTTP"
  name          = var.apigw_name
}

data "aws_apigatewayv2_api" "this" {
  api_id = one(data.aws_apigatewayv2_apis.this.ids)
}
```

# Conclusion

In SSS, despite notifying users before periodic releases, some users would still send messages from the SaaS.  
However, with this in place, both developers and users can work without worrying about the release.  
After releasing the queuing feature, there were indeed occasions where operations occurred during a release.  
But since the messages were retained in the DLQ, they could be resent after the release, allowing subsequent operations to proceed without interruption.

By creating it as a queue independent of the SSS application service, we reduced the coupling between SSS and the external SaaS.  
Moreover, because there were no modifications to the existing system, it could be introduced in a short period.  
Also, since resending from the DLQ could be done via the AWS Management Console or AWS CLI, we were able to keep the development cost of maintenance tools low.

The code for what we introduced here is available from the [Repository for IaC-based Webhook Event Queuing Construction](https://github.com/mamezou-tech/webhook-with-sqs).  
By combining it with the repository code from [IaC-based infrastructure build for Sales Support System](/in-house-project/sss/sss-by-iac/), you can actually run and verify it.
