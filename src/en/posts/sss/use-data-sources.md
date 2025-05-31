---
title: Let's leverage Terraform data sources!
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

# Introduction

This article introduces the Terraform data sources[^1] used in the IaC implementation of the [Sales Support System](/in-house-project/sss/intro/) (hereafter, SSS), which is developed and operated in­house at Mamezou. Although using Terraform’s `import` to convert existing resources into IaC can be challenging, we will show how to use data sources to make existing resource information available in Terraform, and share key points for gradually advancing your IaC coverage.

[^1]: Elements that start with `data`. For more details, see Terraform’s documentation on [Data sources](https://developer.hashicorp.com/terraform/plugin/framework/data-sources).

# Background

SSS uses three environments—trial, staging, and production—and most AWS infrastructure resources in each environment are managed with Terraform (IaC).

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

Broadly speaking, we separate environment-specific settings (under the `env` directory) from common components (under the `modules` directory).

For environment-specific settings, directories are separated by environment just as in the actual AWS environments. Furthermore, each environment is divided into operators, infrastructure, middleware, and application.

Because each environment has a similar system architecture, common components are placed under the `modules` directory. These common components consist of modules based on AWS services such as network, RDB/DynamoDB, Glue, ECS, and S3. Each environment’s IaC uses these as Terraform modules to avoid code duplication.

That was a lot of detail, but this covers the preliminary background explanation.

Previously, when using IDs or ARNs of VPCs and subnets created by the infrastructure modules in middleware or application modules, we defined those values in `local` variables and maintained them manually.

However, with this approach, many differences would appear for each environment when the infrastructure was updated, causing bugs due to transcription errors. Therefore, wanting to minimize differences and simplify maintenance, we decided to refactor by replacing this with data sources.

In addition to referencing resources between our system’s submodules, there was another factor that led us to introduce data sources.

In SSS, Secrets Manager secrets are defined in the AWS Management Console, and are one of the few elements not yet converted to IaC. Since we couldn’t write their values in `local`, we defined variables with `variable` blocks and set their values in a `terraform.tfvars` file.

In this way, data sources are also useful for accessing elements that have not been converted to IaC.

As a side note, documentation for AWS resources and data source APIs can be difficult to navigate from [HashiCorp](https://www.hashicorp.com/) or [Terraform](https://www.terraform.io/). Since AWS resources are part of the AWS Provider, you can find them on the [Terraform Registry](https://registry.terraform.io/).

Below, I will introduce the main data sources we used in SSS. I will show examples of their definitions and usage, using `output` blocks.

# Current

We will introduce data sources related to the user running Terraform, i.e., the current[^10] context. The main ones are the AWS account and region, which are also included in ARNs.

[^10]: Here, it refers to the current state or similar.

## AWS Account ID

Below is the data source definition[^11] for obtaining the ID of the AWS account used to run Terraform, and an example of its usage.

```hcl
data "aws_caller_identity" "current" {}
```

```hcl
# Either is OK
output "aws_id" {
  value = data.aws_caller_identity.current.id
}
output "aws_account_id" {
  value = data.aws_caller_identity.current.account_id
}
```

[^11]: [`aws_caller_identity`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity)

## Region

Below is the data source definition[^12] for obtaining the default region of the AWS account used to run Terraform, and an example of its usage.

```hcl
data "aws_region" "current" {}
```

```hcl
output "region_name" {
  value = data.aws_region.current.name
}
```

[^12]: [`aws_region`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region)

# Custom Resources

Below are the data source definitions[^21][^22] and usage examples for referencing custom Terraform modules.

As the data source name (`terraform_remote_state`) indicates, this is only available when Terraform state is managed <strong><font color="red">remotely</font></strong>.

Here is an example for sharing state via S3, which we also use in SSS.

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

Here, `some_output_name` is the name of the `output` defined in our system’s submodule. By defining `output` in the submodule as needed, it can be referenced from elsewhere.

[^21]: [`terraform_remote_state`](https://developer.hashicorp.com/terraform/language/state/remote-state-data)
[^22]: [`aws_s3_bucket`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/s3_bucket)

# AWS Resources

Here we’ll introduce data sources related to major AWS resources.

## VPC

Below is the data source definition[^31] for the default VPC that exists when an AWS account is created, and for filtering by a `Name` tag.

When specifying a particular data source, you often specify a name, but a VPC itself doesn’t have a name attribute, so you can’t specify it by name. For resources like VPCs or security groups that cannot be named directly, a common method is to add a `Name` tag key and set a human-readable name as its value[^32]. In the data source, you filter by specifying the tag values in `tags`.

In the data reference example, a VPC ID is shown, but you can also check other attributes by referring to the API reference or by outputting the entire resource object (e.g., `data.aws_vpc.default`).

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
[^32]: It appears in the "Name" column of the VPC or security group list in the Management Console.

## Subnets

Below are data source definitions[^33][^34] for subnets, and examples of their usage.

The example for handling multiple subnets extracts private subnets, but since you can’t tell if a subnet is public or private from the subnet itself, we use tags here as well. In the `filter` block, you specify the non-default VPC from earlier as the VPC containing the targeted subnets (by setting `vpc_id`), and further filter by wildcard matching on the `Name` tag. The `filter` block is equivalent to the argument values for the AWS CLI’s `--filter` option[^35].

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

The example for a single subnet includes, in addition to the multiple-resources example, a condition for a specific availability zone. In the single-resource case, `vpc_id` is used as a parameter.

Note that if you use a data source for a single resource and your filters are insufficient, resulting in multiple resources being selected, an error will occur. Also, data source names usually come in singular and plural forms for these cases, making them relatively easy to find.

```hcl
# for single resource (MUST select only one element)
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
[^35]: For AWS CLI options, see the [Options](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/describe-security-groups.html#options) section of the documentation.

## Security Groups

Below are data source definitions[^36][^37] for security groups and examples of their usage.

These examples also cover both multiple-resource and single-resource cases, and in both cases, we specify the security group in the non-default VPC whose `Name` tag value is `"ecs"`. In the multiple-resources version, two `filter` blocks are specified, which are combined with a logical AND. Conversely, if you specify multiple values in a single `filter` block’s `values`, they are combined with a logical OR.

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

Under the same conditions, the single-resource case also returns exactly one resource without error, but in the multiple-resources case, the result is a list. Therefore, the second and third usage examples below produce the same value.

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

## ECS Cluster

Below is the data source definition[^38] for an ECS cluster and an example of its usage.

For resources that have names, if you know the name, you can define the data source easily.

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

## RDS Cluster

Below is the data source definition[^39] for an RDS cluster and an example of its usage.

As with the ECS cluster, the only required information is the name. As shown in the usage example, this makes the endpoint available in IaC as well.

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

Below are data source definitions[^40][^41] for secrets created with “Amazon RDS Database Credentials” in AWS Secrets Manager, and examples of their usage.

Referencing the actual values of the secret can be a bit cumbersome. If you output `secret_string` itself, you’ll see that it is in JSON format. Therefore, you must use Terraform’s built-in functions to convert JSON into a map format, and then specify the secret keys.

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
  value     = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["username"]
  sensitive = true
}
output "rds_secret_value_password" {
  value     = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["password"]
  sensitive = true
}
output "rds_secret_value_engine" {
  value     = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["engine"]
  sensitive = true
}
output "rds_secret_value_host" {
  value     = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["host"]
  sensitive = true
}
output "rds_secret_value_port" {
  value     = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["port"]
  sensitive = true
}
output "rds_secret_value_dbname" {
  value     = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["dbname"]
  sensitive = true
}
output "rds_secret_value_dbClusterIdentifier" {
  value     = jsondecode(data.aws_secretsmanager_secret_version.rds.secret_string)["dbClusterIdentifier"]
  sensitive = true
}
```

[^40]: [`aws_secretsmanager_sercret`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_sercret)
[^41]: [`aws_secretsmanager_sercret_version`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_sercret_version)

# Leveraging Data Sources to Incrementally Implement IaC

Regarding Terraform, there is the following “lesson”[^51]:

- After you start using Terraform, you should only use Terraform.
- If you have existing infrastructure, use the `import` command.

You might want to take this “lesson” to heart, but to use the import feature[^52], you need a **complete description** of the resource. This can be quite a daunting task for projects that already use many AWS resources with a variety of detailed settings. However, both development and operations maintenance are limited by time and cost.

:::check:Complete description
For example, with only the `import` of `aws_iam_role`, the attached AWS managed policies will not be managed by Terraform. Therefore, to correctly IaC-ify the target IAM role, you must also add a `aws_iam_role_policy_attachment` resource definition.

If you run `plan` without importing `aws_iam_role_policy_attachment`, you’ll see a plan (diff) to detach the managed policies. If you resolve all of these diffs, the policies are correctly imported. However, if you’re not familiar with Terraform, you’ll end up chasing down which resources to use and what to set for each argument one after another. And you’ll find yourself having to IaC-ify even the parts that were previously infrastructure-separated.
:::

So, if you find yourself assigned to an existing system that’s not IaC-ified, does that mean you have to give up on IaC?

Here’s where data sources come into play. I believe data sources can also be used to **incrementally IaC-ify** existing environments that haven’t been converted to IaC.

Since SSS was IaC-ified from the start, we didn’t actually perform IaC-ification from zero for an existing system. However, when developing features with unchangeable deadlines (e.g., for regulatory changes), we would directly test and build in the Management Console following tutorials or blogs[^53], document it with Cosense, use video-recorded procedures to deploy and release to other environments, and later gradually transition to IaC—using data sources in those cases[^54].

As seen so far, data sources, unlike the import feature, can in some cases be defined simply by setting only the name. When adding new resources, you can define the surrounding resources as data sources in advance, and gradually expand your IaC coverage through refactoring. You can think of it like building the outer walls with data sources and then town-planning inside them with IaC.

In the following, as a concrete example, we’ll start by adding a new ECS service and then convert an existing ECS task definition and an existing ECS cluster to IaC. For this example, it is assumed that Terraform state management and other environment configurations are already in place.

[^51]: Paraphrased: “After you start using Terraform, you should only use Terraform.” “If you have existing infrastructure, use the `import` command.”
[^52]: For importing existing resources, see [Import existing resources](https://developer.hashicorp.com/terraform/cli/import/usage).
[^53]: SSS is developed using Scrum, so ideally SPIKE tasks should be separated from feature development items, and we do that when time allows, but reality doesn’t always cooperate.
[^54]: At the time, I was less familiar with Terraform than I am now, so I spent a lot of time researching, which was one reason why IaC-ification took longer. Now I can IaC-ify in a reasonable time, so lately I mostly develop while IaC-ifying.

## Converting a New ECS Service to IaC

First, create a single new ECS service using an existing ECS task definition and run it on an existing ECS cluster. Specifically, implement and apply (`terraform apply`) the following Terraform code.

- Define the new ECS service as a regular resource
- Define existing infrastructure elements as data sources
  - ECS task definition
  - ECS cluster
  - Private subnets (multiple)
  - Security groups (multiple)
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

The ECS task definition example above refers to the latest revision. You can also specify a revision by using `<family_name>:<revision>`.

Even if there are other ECS task definitions, you don’t need to do anything for them. Only define the ECS task definition for the ECS service in question as a data source.

Not covered here, but depending on the system architecture, you may also need to add data sources related to service discovery (CloudMap) or other service integrations (Service Connect), as we do in SSS.

## Converting an Existing ECS Task Definition to IaC

Next, we’ll convert the ECS task definition to IaC. In practice, this work will span several days. This time, I’ll explain using the `import` block method.

1. Add an `import` block for the ECS task definition to the IaC file

   ```hcl
   import {
     to = aws_ecs_task_definition.my_service_def
     id = "<ecs task definition arn>"
   }
   ```

   Here, `<ecs task definition arn>` takes a value like the following:

   - `arn:aws:ecs:ap-northeast-1:012345678910:task-definition/my-service:123`

   You can check this value in the Management Console on the details page for each ECS task definition revision[^61][^62].

   In the case of `aws_ecs_task_definition`, it was the ARN of the ECS task definition, but for resources like `aws_ecs_cluster` described later, it’s something like the cluster name; the exact identifier differs by resource. Each resource’s reference page contains information on what value to specify in the `import` block.

1. Execute the following command to generate the IaC for the ECS task definition specified by the `import` block

   ```bash:Terraformコマンド
   terraform plan -generate-config-out=generated_ecs_task_def.tf
   ```

   When you run this command, you will see a message like the following, and the `generated_ecs_task_def.tf` file will be created.

   ```bash:出力（中略）
   Terraform will perform the following actions:

     # aws_ecs_task_definition.my_service_def will be imported
       resource "aws_ecs_task_definition" "my_service_def" {
        ... omitted ...
       }

   Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.
   ```

   At this point, it has not yet been applied to the Terraform state.

1. Execute the following command to apply the `import` block and the generated content

   ```bash:Terraformコマンド
   terraform apply
   ```

   When you run this command, towards the end you will see a message like the following, and it will be applied to the Terraform state.

   ```bash:出力（抜粋）
   Apply complete! Resources: 1 imported, 0 added, 0 changed, 0 destroyed.
   ```

   The generated IaC code simply incorporates the settings as they are (with ARNs and other values hard-coded as strings). Therefore, in practice, before or after this step (or on a later date), you will need to <font color="red">**replace the hard-coded values with variables or references to other resources**</font>. Then, you continue defining related resources as data sources to expand your IaC coverage.

1. Replace the ECS service’s reference to the ECS task definition from a data source to a resource, and remove the data source definition and the `import` block for the ECS task definition

   ```hcl
   resource "aws_ecs_service" "my_service" {

     task_definition = aws_ecs_task_definition.my_service_def.arn

     ... other settings(not changed) ...
   }

     ... others(not changed) ...
   ```

1. Run the following command and confirm that it says `No changes.`

   ```bash:Terraformコマンド
   terraform plan
   ```

:::check:About the file generated by the "-generate-config-out" option
The `-generate-config-out` option is still experimental, so the generated file has the following limitations:

- It cannot overwrite or append to existing files.
- It may cause errors in `plan` or `apply` if used as-is.

One issue is that because it outputs all items, if there are two ways to configure the same setting and you only want to set one, both end up being set. Running `apply` then results in configuration conflict errors, so you need to manually fix it (simply by deleting one of the entries).

Another issue I encountered by chance is a bug where the `url` value for `aws_iam_openid_connect_provider` becomes just the hostname (without URL scheme, etc)[^a]. This also needs to be manually fixed.

[^a]: [aws_iam_openid_connect_provider rejects valid "url"s](https://github.com/hashicorp/terraform-provider-aws/issues/26483)
:::

[^61]: For the AWS CLI, you can use the following:

    ```bash
    aws ecs list-task-definitions --family-prefix <task_family> --sort DESC --max-items 1 --query "taskDefinitionArns[0]" --output text
    ```

[^62]: Alternatively, it may be useful to output the information required for `import` as an `output` in an earlier step.

## Converting an Existing ECS Cluster to IaC

Next, IaC-ify the ECS cluster. From here, the basic steps are the same as for the ECS task definition, only the resource being defined differs.

1. Add an `import` block for the ECS cluster to the IaC file

   ```hcl
   import {
     to = aws_ecs_cluster.this
     id = "my_cluster"
   }
   ```

1. Execute the following command to generate the IaC for the ECS cluster specified by the `import` block

   ```bash:Terraformコマンド
   terraform plan -generate-config-out=generated_ecs_cluster.tf
   ```

   Check the results as you did for the ECS task definition.

1. Execute the following command to apply the `import` block and the generated content

   ```bash:Terraformコマンド
   terraform apply
   ```

1. Replace the ECS service’s reference to the ECS cluster from a data source to a resource, and remove the data source definition for the ECS cluster

   ```hcl
   resource "aws_ecs_service" "my_service" {
     cluster = aws_ecs_cluster.this.id

     ... other settings(not changed) ...
   }

     ... others(not changed) ...
   ```

1. Run the following command and confirm that it says `No changes.`

   ```bash:Terraformコマンド
   terraform plan
   ```

# Conclusion

How was it?

The data sources covered here are just a few examples. Terraform provides data sources for various AWS resources.

In incremental IaC conversion, we defined existing resources solely with data sources, but that doesn’t mean you can’t combine them with `import`. For resources with simple definitions, you can define them as resources and use `import` from the start, and for the more complicated ones, define them as data sources. Although we’ve discussed a method to gradually expand IaC, there is no requirement that IaC-ified resources must be a single block, so you can start IaC-ifying wherever you like. However, if you IaC-ify too haphazardly, it can become unclear which parts can still be changed in the Management Console. You can use tags to indicate status and such, but it’s probably best to expand IaC from top to bottom, main to sub (or vice versa).

If you’ve been assigned to an existing system that was started ad hoc in the Management Console, don’t give up. Break away from infrastructure maintenance by runbooks and IaC-ify to steadily improve maintainability!
