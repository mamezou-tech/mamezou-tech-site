---
title: 使用 Terraform 一站式代码化多区域 GPU 推理基础设施！通过启动模板与临时 IaC 进行运维
author: kazuyuki-shiratani
date: 2026-10-20T00:00:00.000Z
tags:
  - AWS
  - terraform
  - ECR
  - s3
  - IAM
  - EC2
  - vLLM
  - スポットインスタンス
  - IaC
image: true
translate: true

---

## 前言

这是一次原型开发的记录：对于那些让我觉得“看起来很有趣”的架构和技术栈，首先一边尝试各种方案，一边将其构建出来。

上一次，我构建了一个通过 AWS Lambda 和 SSM Session Manager 实现的无服务器 GPU 启动代理。
（详情请参阅[上一篇文章](/blogs/2026/10/14/vllm_lambda_broker/)）
借此，我完成了一套无需开放任何端口、无需 SSH 私钥，并且能在短短数秒内搜索和选择全球最便宜的 Spot GPU、再安全地直接连接的环境。

不过，在实际运用上一次的配置过程中，另一个无法回避的重要问题也逐渐浮现。

**“持续通过手动操作或临时编写的 Shell 脚本，管理多区域部署所需的 S3、ECR、安全组、IAM 角色、启动配置及 Lambda 函数，实在太辛苦了。”**

本次配置除了东京（ap-northeast-1）外，还将海外 4 个区域（弗吉尼亚、俄亥俄、俄勒冈、法兰克福）合计 5 个区域作为资源采购目标。如果手动在这些区域中配置资源，将很容易出现配置遗漏或输入错误。之后不再使用时的环境销毁，以及在其他账户中复现环境，也会变得极其困难。

如果将分散部署在多个区域的 GPU 执行基础设施构建为 Terraform 管理的临时 IaC，在不再需要时便可整体删除，管理与清理都会轻松许多。
因此，本次决定将 **所有静态基础设施统一使用 Terraform 进行代码化（IaC 化）**。

:::info
**📚 相关的往期验证文章**  
* **第 1 篇**: [使用 AWS×UserData 自动启动 vLLM！停机成本几乎为零的本地 LLM 环境](/blogs/2026/09/16/vllm_autolaunch/)
* **第 2 篇**: [通过 Open WebUI 将自建 vLLM 连接到 VS Code（Cline）！免 Token 进行开发](/blogs/2026/09/29/vllm_openwebui_cline/)
* **第 3 篇**: [通过 EC2 Spot Instance×vLLM 大幅降低 GPU 成本](/blogs/2026/10/02/vllm_spot_instance/)
* **第 4 篇**: [使用 SSM 加固 EC2 Spot×vLLM！零端口开放即可连接](/blogs/2026/10/09/vllm_ssm_zero_inbound/)
* **第 5 篇**: [将 vLLM 启动逻辑 Lambda 化！最便宜 Spot 搜索与自动故障转移](/blogs/2026/10/14/vllm_lambda_broker/)
:::

---

## 1. Terraform 化中的“职责划分（范围设计）”

> **📌 本节要点**  
> 明确分离“始终存在的静态基础设施”和“仅在工作时使用后即弃的 GPU”。不要试图连动态 GPU 的启动和停止也交由 Terraform 管理，最佳实践是使用 Terraform 构建到代理基础设施为止，并将 GPU 的按需采购交给 Lambda。

在本次验证中，明确区分了“始终存在的基础设施”和“仅在工作时使用后即弃的 GPU”。因此，最佳实践是将 Terraform 的管理范围划分如下。

| 类别 | 资源 | 管理工具 | 生命周期与成本 |
| :--- | :--- | :--- | :--- |
| **静态基础设施** | S3、ECR（+复制）、IAM、各区域 SG、Launch Template、Lambda | **Terraform** | 持续存在（不使用时的待机费用仅为 S3、ECR 数 GB 的存储费，每月仅数十日元） |
| **动态临时资源** | 最优区域实时搜索、EC2 Spot 启动/销毁、SSM 隧道 | **Lambda + CLI** | 按需执行（仅工作期间按 $0.4～0.6/h 计费） |

若尝试将“EC2 Spot 的启动与销毁”也纳入 Terraform 管理，动态区域选择会变得困难。此外，状态文件（`tfstate`）的锁定和同步每次都会产生超过 1 分钟的额外开销。  
因此，**“使用 Terraform 构建到代理基础设施为止，GPU 的创建与销毁交给代理（Lambda）处理”** 的设计最为轻量且稳健。

---

## 2. 容器镜像的多区域部署（ECR 跨区域复制）

正如第 1 篇至第 5 篇所采用的方式，vLLM 容器镜像（约 13GB）将持久化至 **Amazon ECR**，并在 EC2 启动时从同一区域内高速、免传输费用地 Pull。

在各个作为采购候选的区域（弗吉尼亚、俄勒冈、俄亥俄、法兰克福等）中，也需要准备好**能够从同一区域内的 ECR 获取镜像的状态**。如果每次都从东京的 ECR 向其他区域的 EC2 Pull 镜像，不仅每次都会产生跨区域数据传输费用，容器启动时间也会显著增加。

不过，每次更新镜像时都向各区域的 ECR 端点手动重复执行 `docker push`，运维负担很重且效率低下。

因此，这里采用 Amazon ECR 原生提供的 **跨区域复制（Cross-Region Replication）**。通过 Terraform 声明这一配置（`aws_ecr_replication_configuration`）。这样一来，只需向东京的 ECR Push 一次，镜像便会通过 AWS 骨干网络自动复制到所有候选区域。

以下 Terraform 代码定义了在东京区域中创建 ECR 仓库、自动删除旧版本镜像的策略，以及向另外 4 个区域自动复制的配置。

<details><summary>ecr.tf（点击展开）</summary>

```hcl
# terraform/ecr.tf
# 东京（主）区域的 ECR 仓库
resource "aws_ecr_repository" "vllm" {
  name                 = var.ecr_repository_name
  image_tag_mutability = "MUTABLE"

  tags = { Project = "vllm-ephemeral" }
}

# 旧标签自动删除策略（防止产生不必要的存储费用）
resource "aws_ecr_lifecycle_policy" "vllm_lifecycle" {
  repository = aws_ecr_repository.vllm.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "仅保留最新镜像，旧版本在 30 天后过期"
      selection    = { tagStatus = "any", countType = "sinceImagePushed", countUnit = "days", countNumber = 30 }
      action       = { type = "expire" }
    }]
  })
}

# ★多区域跨区域自动复制
resource "aws_ecr_replication_configuration" "vllm_replication" {
  replication_configuration {
    rule {
      dynamic "destination" {
        for_each = [for r in var.target_regions : r if r != var.primary_region]
        content {
          region      = destination.value
          registry_id = data.aws_caller_identity.current.account_id
        }
      }
    }
  }
}
```

</details>

:::info
**💡 关于 S3 模型权重同步（多区域部署的考量）**  
与容器镜像一样，存储在 S3 中的模型权重（约 15GB）也可以考虑分散部署到候选区域。

* **使用 S3 跨区域复制（CRR）时**：  
  通过预先将权重同步至所有区域，可以最大限度缩短启动时的下载时间，并将通信限制在同一区域内（免费）。但由于需要持续在多个区域保存模型，S3 存储费用会按照区域数量增加，因此搭配定期删除旧 Bucket 或转存至 Glacier 等存储管理策略会更有效。
* **每次从东京 S3 跨区域获取时**：  
  模型存储费用只需承担东京一个 Bucket 的费用，但在海外区域启动时会产生跨区域传输费（每次约 220 日元）和网络延迟。

本系统建议为经常使用的主要区域准备 S3 Bucket，并视需要提前进行初始同步。
:::

---

## 3. 零入站 SG 与最小权限 IAM

统一定义第 4 篇中介绍的“入站规则为 0 的安全组”，以及 EC2 和 Lambda 所需的 IAM 角色。

### 安全组（向所有区域统一配置）

利用 Terraform 的多 Provider 功能（`providers = { aws = ... }`）和模块循环。借此，可以向所有区域部署入站规则为 0 的安全组。

<details><summary>security_groups.tf（点击展开）</summary>

```hcl
# 面向各区域的安全组（无入站规则，出站全部开放）
resource "aws_security_group" "vllm_sg" {
  name        = "vllm-ssm-isolated-sg"
  description = "用于 vLLM SSM 端口转发的零入站安全组"
  vpc_id      = data.aws_vpc.default.id

  # 不定义入站规则（完全封闭）

  egress {
    description = "允许 SSM Agent 以及 S3/ECR Pull 所需的所有出站流量"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "vllm-ssm-isolated-sg" }
}
```

</details>

### IAM 角色（用于 EC2 与 Lambda）

为 EC2 实例授予 SSM 通信、S3 读取和 ECR 读取所需的最小权限，并为 Lambda 函数授予多区域 EC2 搜索与启动所需的权限。

<details><summary>iam.tf（点击展开）</summary>

```hcl
# 用于 EC2 实例的 IAM 角色
resource "aws_iam_role" "ec2_role" {
  name = "vllm-ssm-instance-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

# 用于 SSM Agent 通信的策略
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# S3 与 ECR 读取策略
resource "aws_iam_role_policy_attachment" "s3_read" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}
resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# EC2 实例配置文件
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "vllm-ssm-instance-profile"
  role = aws_iam_role.ec2_role.name
}

# 用于 Lambda GPU 代理的 IAM 角色
resource "aws_iam_role" "lambda_role" {
  name = "vllm-spot-broker-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# 多区域 Spot 搜索与 EC2 启动权限
resource "aws_iam_role_policy" "lambda_ec2_broker" {
  name = "VLLMBrokerEC2Policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeSpotPriceHistory",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeImages",
          "ec2:RunInstances",
          "ec2:CreateTags",
          "ssm:GetParameter",
          "iam:PassRole"
        ]
        Resource = "*"
      }
    ]
  })
}
```

</details>

:::check
**💡 从第 4 篇、第 5 篇的脚本环境迁移时的注意事项**  
如果在已经执行过第 4 篇或第 5 篇环境构建脚本的 AWS 环境中执行 Terraform，需要特别注意。当存在同名资源时，会发生冲突错误（如 `EntityAlreadyExistsException`）。此时请通过 `terraform import` 导入资源，或者删除（或重命名）已有资源后，再执行 `terraform apply`。
:::

---

## 4. EC2 启动模板（Launch Template）与 UserData 模板化

> **📌 本节要点**  
> 将第 5 篇中拆分到 S3 的 UserData（`startup.sh`）进一步完善。把实例类型、EBS、IAM Profile、封闭 SG 和 UserData Bootstrap 统一作为 **EC2 启动模板（Launch Template）** 管理。这样就可以从 Lambda 代理中完全剥离硬件相关描述。

在第 5 篇中，将超过 110 行的 UserData 脚本部署至 S3 Bucket。向 EC2 端传递的是一个仅 3 行、用于从 S3 获取并执行脚本的 Bootstrap 脚本。借此避免了 Lambda 代码膨胀以及 UserData 16KB 上限的问题。

但还有另一个问题尚未解决。

* **实例规格硬编码在 Lambda 代码中**：  
  实例类型（`g6.xlarge`）、EBS 卷（40GB gp3，关闭删除保护）、IAM 实例配置文件、安全组、Spot 市场选项等硬件配置，仍然以字典形式定义在 Lambda 的 Python 代码中。

实例的硬件配置和 Bootstrap 流程，本应属于应通过 IaC 作为“静态基础设施规格”进行管理的领域。

因此，本配置引入了 **`aws_launch_template`（EC2 启动模板）**。借此将硬件定义和 UserData Bootstrap 统一进行代码化。

### 1. UserData Bootstrap 模板（`userdata_bootstrap.sh`）

准备一个极简 Shell 脚本，通过 Terraform 的 `templatefile` 函数注入动态参数（区域、S3 Bucket 名称、ECR 镜像名称）。此外，Bash 变量（如 `$LOG_FILE`）不使用花括号书写，可优雅地避免 Terraform 模板展开时的变量名冲突。

<details><summary>templates/userdata_bootstrap.sh（点击展开）</summary>

```bash
#!/bin/bash
set -euo pipefail
LOG_FILE="/var/log/userdata-bootstrap.log"
exec > >(tee -a "$LOG_FILE" | logger -t user-data -s 2>/dev/console) 2>&1

AWS_REGION="${AWS_REGION}"
S3_BUCKET="${S3_BUCKET_NAME}"
DOCKER_IMAGE="${DOCKER_IMAGE}"

echo "=== 从 S3 获取启动脚本（startup.sh） ==="
aws s3 cp "s3://$S3_BUCKET/scripts/startup.sh" /tmp/startup.sh --region "$AWS_REGION"
chmod +x /tmp/startup.sh

echo "=== 执行 startup.sh ==="
/tmp/startup.sh "$AWS_REGION" "$S3_BUCKET" "$DOCKER_IMAGE"
```

</details>

### 2. 向所有区域统一配置启动模板（`launch_template.tf`）

EC2 Launch Template 是 **区域专属** 的资源。如果只部署在东京，那么在海外区域启动时将找不到该模板。因此，使用 Terraform 将其以相同名称（`vllm-spot-template`）统一部署至所有候选区域。

这样一来，无论 Lambda 代理在实时搜索中选中了哪个区域，都可以无需故障转移，直接通过启动模板创建实例。

<details><summary>launch_template.tf（点击展开）</summary>

```hcl
# terraform/launch_template.tf
# ==============================================================================
# EC2 启动模板（Launch Template）向所有候选区域统一配置
# 将 EBS（40GB gp3）、IAM 配置文件、安全组、UserData（S3 Bootstrap）
# 在所有区域中统一以“vllm-spot-template”这个模板名称进行代码化
# ==============================================================================

# 1. 东京区域（ap-northeast-1）
resource "aws_launch_template" "lt_ap_northeast_1" {
  name          = "vllm-spot-template"
  description   = "vLLM 临时 Spot 节点（g6.xlarge，NVIDIA L4 24GB）[ap-northeast-1]"
  instance_type = var.instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  vpc_security_group_ids = [
    aws_security_group.sg_ap_northeast_1.id
  ]

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = 40
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }

  instance_market_options {
    market_type = "spot"
    spot_options {
      spot_instance_type             = "one-time"
      instance_interruption_behavior = "terminate"
    }
  }

  user_data = base64encode(templatefile("${path.module}/templates/userdata_bootstrap.sh", {
    AWS_REGION     = "ap-northeast-1"
    S3_BUCKET_NAME = "my-vllm-models-hackathon-2026-${data.aws_caller_identity.current.account_id}-ap-northeast-1-an"
    DOCKER_IMAGE   = "${data.aws_caller_identity.current.account_id}.dkr.ecr.ap-northeast-1.amazonaws.com/${var.ecr_repository_name}:latest"
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name       = "vllm-ssm-spot-node"
      Project    = "vllm-ephemeral"
      MarketType = "spot"
    }
  }
}

# 2. 北弗吉尼亚区域（us-east-1）
resource "aws_launch_template" "lt_us_east_1" {
  provider      = aws.us_east_1
  name          = "vllm-spot-template"
  description   = "vLLM 临时 Spot 节点（g6.xlarge，NVIDIA L4 24GB）[us-east-1]"
  instance_type = var.instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  vpc_security_group_ids = [
    aws_security_group.sg_us_east_1.id
  ]

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = 40
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }

  instance_market_options {
    market_type = "spot"
    spot_options {
      spot_instance_type             = "one-time"
      instance_interruption_behavior = "terminate"
    }
  }

  user_data = base64encode(templatefile("${path.module}/templates/userdata_bootstrap.sh", {
    AWS_REGION     = "us-east-1"
    S3_BUCKET_NAME = "my-vllm-models-hackathon-2026-${data.aws_caller_identity.current.account_id}-us-east-1-an"
    DOCKER_IMAGE   = "${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com/${var.ecr_repository_name}:latest"
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name       = "vllm-ssm-spot-node"
      Project    = "vllm-ephemeral"
      MarketType = "spot"
    }
  }
}

# 3. 俄亥俄区域（us-east-2）
resource "aws_launch_template" "lt_us_east_2" {
  provider      = aws.us_east_2
  name          = "vllm-spot-template"
  description   = "vLLM 临时 Spot 节点（g6.xlarge，NVIDIA L4 24GB）[us-east-2]"
  instance_type = var.instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  vpc_security_group_ids = [
    aws_security_group.sg_us_east_2.id
  ]

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = 40
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }

  instance_market_options {
    market_type = "spot"
    spot_options {
      spot_instance_type             = "one-time"
      instance_interruption_behavior = "terminate"
    }
  }

  user_data = base64encode(templatefile("${path.module}/templates/userdata_bootstrap.sh", {
    AWS_REGION     = "us-east-2"
    S3_BUCKET_NAME = "my-vllm-models-hackathon-2026-${data.aws_caller_identity.current.account_id}-us-east-2-an"
    DOCKER_IMAGE   = "${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-2.amazonaws.com/${var.ecr_repository_name}:latest"
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name       = "vllm-ssm-spot-node"
      Project    = "vllm-ephemeral"
      MarketType = "spot"
    }
  }
}

# 4. 俄勒冈区域（us-west-2）
resource "aws_launch_template" "lt_us_west_2" {
  provider      = aws.us_west_2
  name          = "vllm-spot-template"
  description   = "vLLM 临时 Spot 节点（g6.xlarge，NVIDIA L4 24GB）[us-west-2]"
  instance_type = var.instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  vpc_security_group_ids = [
    aws_security_group.sg_us_west_2.id
  ]

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = 40
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }

  instance_market_options {
    market_type = "spot"
    spot_options {
      spot_instance_type             = "one-time"
      instance_interruption_behavior = "terminate"
    }
  }

  user_data = base64encode(templatefile("${path.module}/templates/userdata_bootstrap.sh", {
    AWS_REGION     = "us-west-2"
    S3_BUCKET_NAME = "my-vllm-models-hackathon-2026-${data.aws_caller_identity.current.account_id}-us-west-2-an"
    DOCKER_IMAGE   = "${data.aws_caller_identity.current.account_id}.dkr.ecr.us-west-2.amazonaws.com/${var.ecr_repository_name}:latest"
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name       = "vllm-ssm-spot-node"
      Project    = "vllm-ephemeral"
      MarketType = "spot"
    }
  }
}

# 5. 法兰克福区域（eu-central-1）
resource "aws_launch_template" "lt_eu_central_1" {
  provider      = aws.eu_central_1
  name          = "vllm-spot-template"
  description   = "vLLM 临时 Spot 节点（g6.xlarge，NVIDIA L4 24GB）[eu-central-1]"
  instance_type = var.instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  vpc_security_group_ids = [
    aws_security_group.sg_eu_central_1.id
  ]

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_size           = 40
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }

  instance_market_options {
    market_type = "spot"
    spot_options {
      spot_instance_type             = "one-time"
      instance_interruption_behavior = "terminate"
    }
  }

  user_data = base64encode(templatefile("${path.module}/templates/userdata_bootstrap.sh", {
    AWS_REGION     = "eu-central-1"
    S3_BUCKET_NAME = "my-vllm-models-hackathon-2026-${data.aws_caller_identity.current.account_id}-eu-central-1-an"
    DOCKER_IMAGE   = "${data.aws_caller_identity.current.account_id}.dkr.ecr.eu-central-1.amazonaws.com/${var.ecr_repository_name}:latest"
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name       = "vllm-ssm-spot-node"
      Project    = "vllm-ephemeral"
      MarketType = "spot"
    }
  }
}

output "launch_template_ids" {
  value = {
    "ap-northeast-1" = aws_launch_template.lt_ap_northeast_1.id
    "us-east-1"      = aws_launch_template.lt_us_east_1.id
    "us-east-2"      = aws_launch_template.lt_us_east_2.id
    "us-west-2"      = aws_launch_template.lt_us_west_2.id
    "eu-central-1"   = aws_launch_template.lt_eu_central_1.id
  }
  description = "所有目标区域中的 EC2 启动模板 ID"
}

output "launch_template_name" {
  value       = "vllm-spot-template"
  description = "所有目标区域中通用的 EC2 启动模板名称"
}
```

</details>

通过 Terraform 将启动模板以相同名称（`vllm-spot-template`）管理在所有候选区域中。这样，即使需要变更硬件规格，也只需修改代码并执行 `terraform apply`，便可一次性应用到所有区域。

---

## 5. Lambda 函数自动打包与部署

部署第 5 篇介绍的 GPU 代理 Python 脚本（`handler.py`）。使用 Terraform 标准的 `archive_file` 数据源自动打包为 ZIP 并进行部署。

随着启动模板的引入，将 `LAUNCH_TEMPLATE_NAME` 传递给 Lambda 函数的环境变量。

<details><summary>lambda.tf（点击展开）</summary>

```hcl
# 自动将 Python 代码打包为 ZIP
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda"
  output_path = "${path.module}/dist/lambda_function.zip"
}

# GPU 启动代理 Lambda 函数
resource "aws_lambda_function" "broker" {
  function_name    = "vllm-spot-broker"
  runtime          = "python3.12"
  handler          = "handler.lambda_handler"
  role             = aws_iam_role.lambda_role.arn
  timeout          = 120
  memory_size      = 256

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      TARGET_REGIONS        = join(",", var.target_regions)
      S3_BUCKET_NAME        = "my-vllm-models-hackathon-2026-{account_id}-{region}-an"
      INSTANCE_PROFILE_NAME = aws_iam_instance_profile.ec2_profile.name
      ECR_REPOSITORY_NAME   = aws_ecr_repository.vllm.name
      TAG_SERVER_NAME       = "vllm-ssm-spot-node"
      SG_NAME               = "vllm-ssm-isolated-sg"
      LAUNCH_TEMPLATE_NAME  = aws_launch_template.vllm_spot_template.name
    }
  }

  tags = { Project = "vllm-ephemeral" }
}
```

</details>

### 在 Lambda Handler 端调用（简化启动处理）

在启动模板准备完成后，Lambda 函数（`handler.py`）中的实例启动处理将变得极为简洁。

```python
# 指定 Launch Template，通过一行启动
run_params = {
    "MinCount": 1,
    "MaxCount": 1,
    "LaunchTemplate": {
        "LaunchTemplateName": os.environ.get("LAUNCH_TEMPLATE_NAME"),
        "Version": "$Latest",
    },
}
if target_ami:
    run_params["ImageId"] = target_ami

ec2.run_instances(**run_params)
```

不再需要在 Python 端构建冗长的 `BlockDeviceMappings`、`UserData` 等内容。Lambda 的职责可以专注于“实时搜索最优区域，以及通过模板进行临时启动”。

---

## 6. 执行 Terraform（统一配置与环境销毁）

准备好目录结构后，即可通过命令一次性配置所有资源。

```bash
cd terraform/

# 1. 初始化 Provider
terraform init

# 2. 部署全部静态基础设施（S3、ECR、IAM、SG、Lambda）
terraform apply -auto-approve
```

```text
Apply complete! Resources: 18 added, 0 changed, 0 destroyed.

Outputs:
broker_lambda_arn = "arn:aws:lambda:ap-northeast-1:123456789012:function:vllm-spot-broker"
ecr_repository_url = "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/vllm-openai"
```

借此，只需数十秒即可准备好多区域部署所需的全部基础设施。

### 日常 GPU 启动与停止

部署静态基础设施后，日常的 GPU 启动与停止可以继续直接使用第 5 篇的脚本（`01_start_vllm_ssm.sh` / `02_stop_vllm_ssm.sh`）。

```bash
# 启动 GPU 实例（调用 Lambda 代理并建立 SSM 隧道）
./01_start_vllm_ssm.sh

# 工作结束时销毁资源（断开 SSM 并通过 Lambda 执行 Terminate）
./02_stop_vllm_ssm.sh
```

不让 Terraform 端承担 GPU 实例本身的生命周期。通过将动态的启动和停止交给客户端脚本，可以无需等待 `tfstate` 锁定，快速使用推理环境。

只有在整个验证工作完成，并希望连同云端静态基础设施一并完全清理时，才执行 `terraform destroy`。

```bash
cd terraform/
terraform destroy -auto-approve
```

---

:::column:💡 扩展：应用于其他工作负载的模式
本次验证以 vLLM（GPU 推理）为主题。但“通过 Lambda 搜索和启动 Spot”与“SSM 端口转发”的组合，同样可以广泛应用于其他工作负载。

1. **大规模编译与构建环境**：  
   为减轻本地终端负担，仅在需要时启动拥有大量 vCPU 的计算优化型实例（例如 `c6i` 系列），并在构建完成后自动停止。
2. **模型微调与批量训练**：  
   仅在训练期间 Spot 启动多 GPU 实例，从 S3 获取数据集进行训练，在将生成的权重保存至 S3 后销毁实例。
3. **内存密集型数据处理**：  
   仅在对本地环境容易发生内存不足的大型数据框进行聚合和分析时，临时使用配备大容量内存的实例（例如 `r6i` 系列）。
4. **安全的临时开发环境（远程 Devbox）**：  
   由于无需开放入站端口即可通过 SSM 连接，即使在限制对外开放端口的环境中，也可以从本地 VS Code 等工具安全地将其作为临时工作环境使用。

这种“仅在需要时启动云端合适的资源，完成后确保将其停止”的临时运维模式，作为一种同时兼顾成本效率和安全性的方案，可以得到广泛应用。
:::

---

## 总结

本文将跨多个区域的 GPU 推理基础设施的静态资源 **通过 Terraform 以声明式方式进行代码化（IaC 化）**。

* **静态基础设施与动态临时资源的职责划分**：避免状态管理的额外开销，仅将静态基础设施交由 Terraform 管理，从而实现轻量且稳健的架构。
* **引入 EC2 启动模板（Launch Template）**：集中代码化硬件规格、封闭 SG 与 UserData Bootstrap，并从 Lambda 端剥离硬件依赖代码。
* **ECR 跨区域自动复制**：构建只需向东京 Push 一次，便会经由 AWS 骨干网络自动同步至所有候选区域的流水线。
* **零入站 SG 与最小权限 IAM**：统一定义入站规则为 0 的安全组，以及 SSM/ECR/S3 连接所需的 IAM 策略。
* **Lambda 自动部署与环境销毁**：从 Python 代码的自动 ZIP 打包到资源配置，以及验证结束时通过 `terraform destroy` 实现可靠清理，均已建立完成。

通过消除手动配置和临时脚本，并构建可通过代码复现的基础设施基础，今后的日常 LLM 验证能够以更安全、更可靠的方式运行。
