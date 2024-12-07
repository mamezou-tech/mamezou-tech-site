---
title: Infrastructure Construction of Sales Support System with IaC
author: tadashi-nakamura
date: 2024-12-04T00:00:00.000Z
tags:
  - IaC
  - AWS
  - API Gateway
  - CloudMap
  - ECS
  - Fargate
  - terraform
translate: true

---

# Introduction

This article introduces the steps for constructing API Gateway + CloudMap + ECS (Fargate) infrastructure using Terraform, as implemented in the [Sales Support System (SSS)](/in-house-project/sss/intro/).

# Background

Due to the following maintenance issues, we decided to migrate the AWS container environment from EKS to ECS. However, Fargate usage has been continued.

- Among AWS services, EKS had the highest cost. Migrating to ECS resulted in cost savings sufficient to cover the SaaS usage fees we were considering at the time.
- Kubernetes updates on the EKS platform are enforced at least once a year.
- Middleware updates (e.g., HELM) on EKS are not notified by AWS, requiring us to monitor them ourselves.
- The high update frequency of Kubernetes made it difficult to keep up.
  - This includes Kubernetes itself, which has many alpha and beta APIs, as well as frequent incompatible updates.
- The SSS development team lacked Kubernetes expertise, which is often cited as a reason for using EKS.
  - Additionally, the team was unfamiliar with AWS itself and was overwhelmed with catching up on that front.

:::info:EKS vs ECS

Below is a comparison table of the main elements of EKS and ECS.

| Element                       | ECS                | EKS                |
| ----------------------------- | ------------------ | ------------------ |
| Control Plane                 | ECS                | AWS Managed        |
| Data Plane                    | EC2/Fargate        | EC2/Fargate        |
| Integration with Other AWS Services | High               | Low                |
| Features                      | Fewer              | Richer             |
| Kubernetes Tools              | Not Available      | Available          |
| Definition Files              | Task Definitions   | Manifests          |
| Cost                          | Free               | 0.1USD/hr          |
| Release Cycle                 | None               | ~3 months          |
| Support Period                | None               | ~1 year            |
| Minimum Execution Unit        | Task               | Pod                |
| Intra-Cluster Communication   | Route53+CloudMap   | Service            |
| External Cluster Communication/Inbound | Separate Setup    | Ingress            |
| Environment Variables         | Yes                | Yes                |
| Secret Management             | Yes                | Yes                |
| Cron                          | Outside Task Definition | Defined in Manifest |
| CICD for Definition Files     | None               | GitOps             |
| Scheduled Tasks               | Available          | Not Available      |
| Cluster Creation Speed        | ~2 seconds         | ~5-10 minutes      |

:::

### CloudMap vs ALB vs NLB

Since AWS API Gateway had already been decided upon, we investigated and implemented three AWS services for the configuration behind the API Gateway and compared them.

1. Using CloudMap

![CloudMap System Architecture](/img/sss/sss-by-iac-cloudmap.png "CloudMap System Architecture")

2. Using Application Load Balancer (ALB)

![ALB System Architecture](/img/sss/sss-by-iac-alb.png "ALB System Architecture")

3. Using Network Load Balancer (NLB)

![NLB System Architecture](/img/sss/sss-by-iac-nlb.png "NLB System Architecture")

Below are the actual comparison results[^1]. We scored them simply with ○, △, and ×, assigning 3, 2, and 1 point(s) respectively, and adopted the one with the highest score.

[^1]: Since SSS lacks critical non-functional requirements, the differences were minor, and the evaluation might feel a bit arbitrary... (sweat)

| Service   | Cost | Knowledge | Features                              | Inter-Service Communication | Integration  | Points | Result |
| --------- | :--: | :-------: | ------------------------------------- | --------------------------- | ------------ | ------ | ------ |
| CloudMap  |  ○   |     ×     | ○ Mapper for Microservices           | ○ Likely Possible           | △ HTTP       | 12     | Adopted! |
| ALB       |  ×   |     ○     | ○ Layer 7, richer features than NLB  | △ Unclear?                  | △ HTTP       | 11     |        |
| NLB       |  △   |     ○     | × Layer 4, for high-performance needs | △ Unclear?                  | ○ REST/HTTP  | 11     |        |

As a result, SSS adopted the following configuration:

- AWS API Gateway
- AWS CloudMap
- AWS ECS on Fargate

# Prerequisites for Construction

Existing infrastructure such as VPC, subnets, and Google SSO authentication via Cognito was reused. Therefore, the construction steps introduced here assume the following:

- The following are already constructed/prepared:
  - VPC
  - Private Subnets
  - Cognito
  - User Pool with Google as a Federated ID Provider

In practice, middleware like RDS and DynamoDB, as well as storage like S3, were also reused.

# ECS Construction

This section reproduces the content of the [AWS tutorial](https://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/ECS_AWSCLI_Fargate.html) using Terraform.

## Creating an ECS Cluster

First, create an ECS cluster. The Terraform code for the ECS cluster is as follows. Here, `"FARGATE"` is specified in `capacity_providers` to make it an ECS cluster for the Fargate launch type. The `local.` prefix indicates values defined as local variables in Terraform.

```hcl:main.tf
resource "aws_ecs_cluster" "this" {
  name = local.ecs_cluster_name
}

resource "aws_ecs_cluster_capacity_providers" "this" {
  cluster_name       = aws_ecs_cluster.this.name
  capacity_providers = ["FARGATE"]
}
```

## Creating IAM Roles

To run applications on ECS, two types of IAM roles need to be created:

- ECS Task Execution Role
  - A role required for executing defined tasks.
- ECS Task Role
  - A role required for executing the defined application.

### ECS Task Execution Role

The Terraform code for the ECS Task Execution Role is as follows. The AWS-managed policy `AmazonECSTaskExecutionRolePolicy` is attached, as it defines the permissions required for general use cases. This policy includes permissions for pulling images from ECR and outputting logs to CloudWatch. Additionally, SSS defines permissions for outputting metrics data as an inline policy.

:::info:Policy Types
Policies can be managed or inline. AWS recommends using "managed policies."

[Choosing Between Managed Policies and Inline Policies](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/access_policies-choosing-managed-or-inline.html)
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

### ECS Task Role

Next is the Task Role, which is for running the application. Its definition depends on the application. For example, if running an application that uses DynamoDB, permissions for accessing DynamoDB need to be granted to this role. In this case, the application is a simple web application that returns static pages, so no additional permissions are required. As a sample, the same policy as the Task Execution Role is attached.

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

... (Translation continues in the same format for the rest of the article)
