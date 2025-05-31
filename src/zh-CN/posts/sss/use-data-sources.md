---
title: 活用Terraform的数据源！
author: tadashi-nakamura
date: 2025-05-30T00:00:00.000Z
tags:
  - IaC
  - AWS
  - terraform
  - data-source
  - sss
translate: true

---

# 引言

介绍在 is 社内开发与运维的[营业支援系统(Sales Support System)](/in-house-project/sss/intro/)（以下简称 SSS）的开发 IaC 实现中使用的 Terraform 数据源[^1]。另外，通过 Terraform 的 `import` 将现有资源 IaC 化的门槛较高，本文将介绍使用数据源使现有资源信息可在 Terraform 中使用，并逐步推进 IaC 化的要点。

[^1]: 以 `data` 开头的要素。详情请参考 Terraform 文档中的 [Data sources](https://developer.hashicorp.com/terraform/plugin/framework/data-sources)。

# 背景

SSS 使用试用、预发布和正式三个环境，各环境的 AWS 基础设施资源大多由 Terraform (IaC) 管理。

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

主要分为环境专属设置（`env` 目录下）和公共组件（`modules` 目录下）。

环境专属设置与实际 AWS 环境相同，为每个环境分隔目录。此外，每个环境又细分为运维、基础设施、中间件和应用程序四个部分。

由于各环境的系统架构相似，将通用组件置于 `modules` 目录下。通用组件由基于网络、RDB 或 DynamoDB、Glue、ECS、S3 等 AWS 服务的模块构成。各环境的 IaC 通过将这些作为 Terraform 模块来使用，从而避免了代码重复。

以上是背景说明的前置内容。

此前在中间件模块或应用模块使用由基础设施模块创建的 VPC 或子网的 ID、ARN 等时，会通过 `local` 变量定义这些值，并手动进行维护。

但是，这种方法在基础设施更新时会产生各环境间大量差异，也容易因为抄写错误而引入 bug。因此，为了尽可能减少差异并使结构更简洁，决定通过替换为数据源来进行重构。

除了在自研系统的子模块间进行资源引用之外，还有另一个引入数据源的原因。

在 SSS 中，Secrets Manager 仍通过管理控制台定义，是为数不多尚未 IaC 化的部分。由于无法将值写入 `local`，曾通过 `variable` 定义变量，并在 `terraform.tfvars` 文件中设置这些值。

由此可见，针对尚未 IaC 化的部分，使用数据源也是有效的。

顺便一提，从 [HashiCorp](https://www.hashicorp.com/) 或 [Terraform](https://www.terraform.io/) 官网上并不容易找到 AWS 资源或数据源的 API 文档。因为 AWS 资源本身属于 AWS Provider，应在 [Terraform Registry](https://registry.terraform.io/) 上查找。

接下来将介绍在 SSS 中也使用过的主要数据源。示例包括定义本身以及作为引用的 `output` 示例。

# 当前

介绍与当前[^10]执行 Terraform 的用户相关的数据源。主要涉及包含在 ARN 等中的 AWS 账号和区域。

[^10]: 此处指当前状态等。

## AWS 账号 ID

以下是获取执行 Terraform 的 AWS 账号 ID 的数据源定义[^11]及其使用示例。

```hcl
data "aws_caller_identity" "current" {}
```

```hcl
# 两者均可
output "aws_id" {
  value = data.aws_caller_identity.current.id
}
output "aws_account_id" {
  value = data.aws_caller_identity.current.account_id
}
```

[^11]: [`aws_caller_identity`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity)

## 区域

以下是获取执行 Terraform 的 AWS 账号默认区域的数据源定义[^12]及其使用示例。

```hcl
data "aws_region" "current" {}
```

```hcl
output "region_name" {
  value = data.aws_region.current.name
}
```

[^12]: [`aws_region`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region)

# 自定义资源

以下是引用自定义 Terraform 模块的数据源定义[^21][^22]及其使用示例。

如数据源名称（`terraform_remote_state`）所示，<strong><font color="red">仅在以“远程”方式管理 Terraform 状态时可用</font></strong>。

这里以在 SSS 中也使用的通过 S3 共享为例。

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

此处的 `some_output_name` 为在自研系统子模块中定义的 `output` 名称。

可根据需要在子模块中定义 `output`，以供外部引用。

[^21]: [`terraform_remote_state`](https://developer.hashicorp.com/terraform/language/state/remote-state-data)
[^22]: [`aws_s3_bucket`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/s3_bucket)

# AWS 资源

介绍主要 AWS 资源相关的数据源。

## VPC

以下是创建 AWS 账号时存在的默认 VPC 以及在使用 `Name` 标签进行筛选时的数据源定义[^31]。

在指定特定数据源时通常会指定名称，但 VPC 本身没有名称，无法直接指定名称。对于类似 VPC 或安全组等无法为资源本身命名的情况，常见做法是添加 `Name` 键的标签，并将值设置为可读性较高的名称[^32]。在数据源中通过 `tags` 指定该标签的值进行筛选。

数据引用示例展示了获取 VPC ID 的用法，也可参考 API 文档或输出整个资源对象（如 `data.aws_vpc.default`）进行确认。

```hcl
# 默认
data "aws_vpc" "default" {
  default = true
}

# 根据 Name 标签的值进行过滤
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
[^32]: 在管理控制台的 VPC 或安全组列表的“Name”栏中显示。

## 子网

以下是与子网相关的数据源定义[^33][^34]及其使用示例。

处理多个子网的示例是提取私有子网，但子网本身无法区分公有或私有，因此同样使用标签。通过 `filter` 元素指定包含目标子网的 VPC（将之前的非默认 VPC 的 ID 赋给 `vpc_id`），并在 `Name` 标签中使用通配符来进行部分匹配获取。有关 `filter`，其参数与 AWS CLI 的 `--filter` 选项[^35]相同。

```hcl
# 处理多个资源
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

处理单一子网的示例在以上多资源示例的基础上，还指定了特定可用区作为条件。对于单一资源，VPC ID 则使用专用参数。

注意，针对单一资源的数据源如果筛选不充分而选中了多个资源就会报错。另外，数据源名称一般在元素名部分区分单数和复数，查找起来较为方便。

```hcl
# 处理单一资源（必须仅选择一个元素）
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
[^35]: 有关 AWS CLI 选项，请参阅文档的 [Options](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/describe-security-groups.html#options)。

## 安全组

以下是与安全组相关的数据源定义[^36][^37]及其使用示例。

以下同时给出多资源和单一资源的示例，两者均在非默认 VPC 中指定 `Name` 标签值为 `"ecs"` 的安全组。在多资源版本中指定了两个 `filter` 块，表示逻辑与 (AND) 条件；相反，如果在 `filter` 的 `values` 中指定多个值，则表示逻辑或 (OR) 条件。

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

在相同条件下，由于单一资源不会报错，两者仅返回一个资源，但多资源返回列表。因此，示例中第二个和第三个输出值相同。

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

## ECS 集群

以下是 ECS 集群的数据源定义[^38]及其使用示例。

对于具有名称的资源，只要知道名称即可轻松定义数据源。

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

## RDS 集群

以下是 RDS 集群的数据源定义[^39]及其使用示例。

与 ECS 集群相同，只需指定名称即可。正如示例所示，可通过 IaC 使用其端点。

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

## Secrets Manager

以下是通过“Amazon RDS 数据库凭证”创建的 Secret 的数据源定义[^40][^41]及其使用示例。

在尝试引用 Secret 的具体值时会有些麻烦。从输出 `secret_string` 就可以看出，它是 JSON 格式。因此，需要先使用 Terraform 的内置函数将 JSON 转换为 Map，再指定 Secret 键值。

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

# 利用数据源实现增量 IaC 化

关于 Terraform，有以下“经验”[^51]。

- 一旦开始使用 Terraform，就应该只使用 Terraform。
- 如果已有现有基础设施，请使用 `import` 命令。

虽然希望将上述“经验”作为教训，但要使用导入功能[^52]，需要对资源进行**完整描述**。  
对于已经使用大量 AWS 资源并进行各种细节配置的项目来说，这是一项相当繁琐的工作。然而，开发和运维维护的时间和成本都是有限的。

:::check:完整描述
例如，仅对 `aws_iam_role` 使用 `import` 并不会将附加的 AWS 管理策略纳入 Terraform 管理。因此，要正确地将目标 IAM 角色 IaC 化，还必须添加 `aws_iam_role_policy_attachment` 资源定义。

另外，如果不对 `aws_iam_role_policy_attachment` 进行 `import` 而执行 `plan`，会显示“分离管理策略的计划（差异）”。当解决所有出现的差异后，就能够正确导入，但对于不熟悉 Terraform 的人而言，需要不断追踪使用哪些资源、为各参数设置何种值等。最终甚至需要对基础设施物理上分离的部分也进行 IaC 化。
:::

那么，如果被分配到尚未 IaC 化的现有系统项目，是不是只能放弃 IaC 化呢？

这时，数据源派上用场。我认为，数据源也可以在对尚未 IaC 化的现有环境进行**增量 IaC 化**时使用。

由于 SSS 从一开始就进行了 IaC 化，因此并非真正从零开始对现有系统进行 IaC 化。  
不过，在因为法律修订等原因需要在不能更改截止日期的情况下进行功能开发时，曾一边参考教程或博客，一边在管理控制台直接验证和构建[^53]；再使用 Cosense 编写文档或将操作步骤录制成视频，迁移到其他环境并发布；之后再逐步进行 IaC 化，在这些场景下使用过数据源[^54]。

如上所述，使用数据源与导入功能不同，有时只需设置名称即可。

在添加新资源时，可以先将相关的外围资源定义为数据源，边重构边逐步扩大 IaC 的覆盖范围。可以想象成，用数据源筑起城墙，再在城墙内用 IaC 进行“城市建设”。

以下以一个具体示例说明：从新增一个 ECS 服务开始，对现有的 ECS 任务定义和 ECS 集群进行 IaC 化。前提条件是假设已完成 Terraform 状态管理等环境设置。

[^51]: 意译：‘开始使用 Terraform 后，就只使用 Terraform’；‘如果已有现有基础设施，请使用 `import` 命令’。  
[^52]: 有关导入现有资源，请参阅 [Import existing resources](https://developer.hashicorp.com/terraform/cli/import/usage)。  
[^53]: SSS 使用 Scrum 进行开发，原则上应将 SPIKE 和功能开发的条目分开，如果有时间就会这么做，但现实往往不尽如人意。  
[^54]: 当时因对 Terraform 不够熟悉，需要查阅大量资料，是导致 IaC 化耗时的一个原因。目前能在相对较短时间内完成 IaC 化，因此最近开发几乎是在进行 IaC 化的同时推进的。

## 将新建的 ECS 服务进行 IaC 化

首先，使用现有 ECS 任务定义创建一个新的 ECS 服务，并在现有 ECS 集群上运行。具体地，实现并应用（`terraform apply`）以下 Terraform 代码。

- 将新的 ECS 服务作为常规资源定义
- 使用数据源定义现有的基础设施要素
  - ECS 任务定义
  - ECS 集群
  - 私有子网（多个）
  - 安全组（多个）
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
  task_definition = "my-service" # 最新版
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

需要注意的是，该 ECS 任务定义示例引用了最新版本。也可以通过 `<family_name>:<revision>` 的形式来指定具体修订版。

即使存在其他 ECS 任务定义，也无需做任何处理。仅将本次目标 ECS 服务所需的 ECS 任务定义定义为数据源即可。

这里虽未展开，但根据系统架构，可能还需要添加与服务发现（CloudMap）定义或其他服务联动（Service Connect）相关的数据源，如在 SSS 中所示。

## 将现有的 ECS 任务定义 IaC 化

接下来，将对 ECS 任务定义进行 IaC 化。实际上此操作可能跨数天完成。此次将使用 `import` 块的方法进行说明。

1. 在 IaC 文件中添加 ECS 任务定义的 `import` 块

   ```hcl
   import {
     to = aws_ecs_task_definition.my_service_def
     id = "<ecs task definition arn>"
   }
   ```

   其中 `<ecs task definition arn>` 的值如下：

   - `arn:aws:ecs:ap-northeast-1:012345678910:task-definition/my-service:123`

   此值可在管理控制台的各 ECS 任务定义修订概要页面中确认[^61][^62]。

   对于 `aws_ecs_task_definition`，指定的是 ECS 任务定义的 ARN；而后文提到的 `aws_ecs_cluster` 则为集群名称等，具体指定方式因资源而异。各资源的参考页面中均有关于在 `import` 中指定值的说明。

1. 执行以下命令，为 `import` 块指定的 ECS 任务定义生成 IaC

   ```bash:Terraformコマンド
   terraform plan -generate-config-out=generated_ecs_task_def.tf
   ```

   执行该命令后，会显示如下信息，并生成 `generated_ecs_task_def.tf` 文件：

   ```bash:出力（中略）
   Terraform will perform the following actions:

     # aws_ecs_task_definition.my_service_def will be imported
       resource "aws_ecs_task_definition" "my_service_def" {
        ... omitted ...
       }

   Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.
   ```

   此时尚未反映到 Terraform 状态中。

1. 执行以下命令，应用 `import` 块及生成内容

   ```bash:Terraformコマンド
   terraform apply
   ```

   执行该命令后，可在输出末尾看到如下信息，并将其反映到 Terraform 状态中：

   ```bash:出力（抜粋）
   Apply complete! Resources: 1 imported, 0 added, 0 changed, 0 destroyed.
   ```

   生成的 IaC 代码仅是简单地直接纳入原有配置（如 ARN 等被以字符串形式硬编码）。因此，实际上需要在此步骤前后或之后，<font color="red">**将硬编码的值替换为变量或其他资源引用等**</font>。然后，再通过定义相关资源的数据源来进一步扩大 IaC 的覆盖范围。

1. 将 ECS 服务对 ECS 任务定义的引用从数据源替换为资源，并删除 ECS 任务定义的数据源定义及 `import` 块

   ```hcl
   resource "aws_ecs_service" "my_service" {

     task_definition = aws_ecs_task_definition.my_service_def.arn

     ... other settings(not changed) ...
   }

     ... others(not changed) ...
   ```

1. 执行以下命令，确认输出为 `No changes.`

   ```bash:Terraformコマンド
   terraform plan
   ```

:::check:有关使用"-generate-config-out"选项生成的文件
`-generate-config-out` 选项或因仍处于 Experimental 阶段，生成的文件存在以下限制：

- 无法覆盖或附加到现有文件。  
- 原样使用可能导致在 `plan` 或 `apply` 时出错。

第一个限制是，由于会输出所有字段，当对两种配置方式只设置一种时，可能会同时为两者都设置值。执行 `apply` 等操作时会出现配置冲突错误，需要手动修正（只需删除其中一个即可）。

第二个限制是偶发的 Bug：在 `aws_iam_openid_connect_provider` 中，`url` 的值会变为仅主机名（缺少 URL 协议等）[^a]。同样需要手动修正。

[^a]: [aws_iam_openid_connect_provider rejects valid "url"s](https://github.com/hashicorp/terraform-provider-aws/issues/26483)
:::

[^61]: 使用 AWS CLI 的示例命令如下。

   ```bash
   aws ecs list-task-definitions --family-prefix <task_family> --sort DESC --max-items 1 --query "taskDefinitionArns[0]" --output text
   ```
[^62]: 或者，也可以在前一步中将所需的 `import` 信息通过 `output` 导出以便使用。

## 将现有的 ECS 集群 IaC 化

进一步对 ECS 集群进行 IaC 化。从此处开始，定义的资源不同，但基础操作与 ECS 任务定义时相同。

1. 在 IaC 文件中添加 ECS 集群的 `import` 块

   ```hcl
   import {
     to = aws_ecs_cluster.this
     id = "my_cluster"
   }
   ```

1. 执行以下命令，为 `import` 块指定的 ECS 集群生成 IaC

   ```bash:Terraformコマンド
   terraform plan -generate-config-out=generated_ecs_cluster.tf
   ```

   执行结果的确认等与 ECS 任务定义相同。

1. 执行以下命令，应用 `import` 块及生成内容

   ```bash:Terraformコマンド
   terraform apply
   ```

1. 将 ECS 服务对 ECS 集群的引用从数据源替换为资源，并删除 ECS 集群的数据源定义

   ```hcl
   resource "aws_ecs_service" "my_service" {
     cluster = aws_ecs_cluster.this.id

     ... other settings(not changed) ...
   }

     ... others(not changed) ...
   ```

1. 执行以下命令，确认输出为 `No changes.`

   ```bash:Terraformコマンド
   terraform plan
   ```

# 最后

大家觉得如何？

此处介绍的数据源仅是冰山一角。Terraform 为各种 AWS 资源都提供了相应的数据源。

在增量 IaC 化中，针对现有资源仅使用了数据源进行定义，但并非不能与 `import` 结合使用。

对于简单易定义的资源，可以从一开始就定义为资源并使用 `import`；对于繁琐的资源，则可定义为数据源。

此外，虽然介绍了逐步扩展 IaC 化的方法，但并不要求 IaC 化的资源必须是一个整体块，可根据需求从任何想要的部分开始 IaC 化。

不过，如果过于零散地进行 IaC 化，可能会让人难以辨别哪些部分可以在管理控制台中进行更改。

虽然也可通过添加标签等方式标识，但建议以从上到下、从主体到子模块（或相反）的顺序进行扩展。

那些被分配到通过管理控制台快速开始的现有系统的同事们，也不要放弃，摆脱手册式的基础设施维护，通过 IaC 化不断提高可维护性吧！

 
