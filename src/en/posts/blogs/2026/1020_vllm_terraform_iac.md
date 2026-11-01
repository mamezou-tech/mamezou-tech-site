---
title: >-
  Batch-Code a Multi-Region GPU Inference Platform with Terraform! Operating
  with Launch Templates and Ephemeral IaC
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

## Introduction

This is a record of prototyping architecture and technology stacks that seemed interesting, building them while trying out various approaches first.

Last time, I built a serverless GPU launch broker using AWS Lambda and SSM Session Manager.  
(For details, see the [previous article](/blogs/2026/10/14/vllm_lambda_broker/).)  
This completed an environment where you can explore and select the cheapest Spot GPUs around the world in just a few seconds, then securely connect directly to them—with zero open ports and no SSH private keys required.

However, as I put the previous configuration into practice, another important issue that could not be avoided became apparent.

**“It is painful to keep managing the S3, ECR, security groups, IAM roles, launch configurations, and Lambda functions required for multi-region deployment manually or with ad-hoc shell scripts.”**

In this configuration, in addition to Tokyo (`ap-northeast-1`), a total of five regions are used as procurement targets: four overseas regions—Virginia, Ohio, Oregon, and Frankfurt. Manually configuring these regions creates fertile ground for missed settings and typos. It also makes destroying the environment when it is no longer needed, or reproducing it in another account, extremely difficult.

By building the GPU execution platform distributed across multiple regions with Terraform as ephemeral IaC that can be deleted in its entirety when no longer needed, management and cleanup become much easier.  
Therefore, this time, I decided to **batch-code all static infrastructure foundations with Terraform (IaC)**.

:::info
**📚 Related Previous Validation Articles**  
* **Part 1**: [Automatically Launch vLLM with AWS × UserData! A Local LLM Environment with Near-Zero Costs While Stopped](/blogs/2026/09/16/vllm_autolaunch/)
* **Part 2**: [Connect Your Own vLLM to VS Code (Cline) Through Open WebUI! Develop Token-Free](/blogs/2026/09/29/vllm_openwebui_cline/)
* **Part 3**: [Greatly Reduce GPU Costs with EC2 Spot Instances × vLLM](/blogs/2026/10/02/vllm_spot_instance/)
* **Part 4**: [Secure EC2 Spot × vLLM with SSM! Connect with Zero Open Ports](/blogs/2026/10/09/vllm_ssm_zero_inbound/)
* **Part 5**: [Turn vLLM Launching into AWS Lambda! Cheapest Spot Search and Automatic Fallback](/blogs/2026/10/14/vllm_lambda_broker/)
:::

---

## 1. “Division of Responsibilities (Scope Design)” for Terraform

> **📌 Key Point of This Section**  
> Clearly separate the “static foundation that always exists” from the “disposable GPU used only while working.” Rather than trying to manage dynamic GPU startup and shutdown with Terraform, the best practice is to build up to the broker foundation with Terraform and leave on-demand GPU procurement to Lambda.

In this validation, I clearly separate “infrastructure that always exists” from “disposable GPUs used only while working.” Therefore, the best practice is to divide Terraform's management scope as follows.

| Category | Resources | Management Tool | Lifecycle and Cost |
| :--- | :--- | :--- | :--- |
| **Static foundation** | S3, ECR (+ replication), IAM, SGs in each region, Launch Template, Lambda | **Terraform** | Always present (when unused, standby costs are only a few dozen yen for storing several GB in S3 and ECR) |
| **Dynamic ephemeral** | Real-time search for the optimal region, EC2 Spot startup/destruction, SSM tunnels | **Lambda + CLI** | On-demand execution (charged at $0.4–0.6/h only while working) |

Trying to manage even “EC2 Spot startup and destruction” with Terraform makes dynamic region selection difficult. In addition, locking and synchronizing the state file (`tfstate`) introduces more than one minute of overhead each time.  
Therefore, the design of **“building up to the broker foundation with Terraform and leaving GPU creation/destruction to the broker (Lambda)”** is the most lightweight and robust.

---

## 2. Multi-Region Placement of Container Images (ECR Cross-Region Replication)

As adopted in Parts 1 through 5, the vLLM container image (approximately 13 GB) is persisted in **Amazon ECR** and pulled quickly with no transfer charge from within the same region when EC2 starts.

In each candidate procurement region (Virginia, Oregon, Ohio, Frankfurt, and so on), it is also necessary to prepare a state where **images can be obtained from ECR within the same region**. If you pull from Tokyo ECR to EC2 in another region every time, inter-region data transfer charges will be incurred on every occasion, and container startup time will increase significantly.

That said, manually repeating `docker push` to the ECR endpoint in every region whenever an image is updated creates a high operational burden and is inefficient.

Therefore, we adopt **Cross-Region Replication**, a capability natively provided by Amazon ECR. We declare this setting (`aws_ecr_replication_configuration`) in Terraform. This allows all candidate regions to be automatically replicated through the AWS backbone simply by pushing once to ECR in Tokyo.

The following is Terraform code that defines creation of an ECR repository in the Tokyo region, an automatic deletion policy for old-generation images, and automatic replication to four other regions.

<details><summary>ecr.tf (click to expand)</summary>

```hcl
# terraform/ecr.tf
# ECR repository in the Tokyo (primary) region
resource "aws_ecr_repository" "vllm" {
  name                 = var.ecr_repository_name
  image_tag_mutability = "MUTABLE"

  tags = { Project = "vllm-ephemeral" }
}

# Automatic deletion policy for old tags (prevents unnecessary storage charges)
resource "aws_ecr_lifecycle_policy" "vllm_lifecycle" {
  repository = aws_ecr_repository.vllm.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only the latest image; expire old generations after 30 days"
      selection    = { tagStatus = "any", countType = "sinceImagePushed", countUnit = "days", countNumber = 30 }
      action       = { type = "expire" }
    }]
  })
}

# ★ Multi-region cross-region automatic replication
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
**💡 About Synchronizing Model Weights in S3 (Considering Multi-Region Placement)**  
Just like container images, distributing model weights (approximately 15 GB) stored in S3 to candidate regions can also be considered.

* **When using S3 Cross-Region Replication (CRR)**:  
  By synchronizing weights to all regions in advance, startup download time can be minimized and communication can be kept within the same region (free). On the other hand, because S3 storage charges are incurred for each region when models are retained across multiple regions, it is effective to also implement storage management such as regularly deleting old buckets or moving data to Glacier.
* **When retrieving across regions from Tokyo S3 each time**:  
  Model storage costs are limited to one Tokyo bucket, but cross-region transfer charges (approximately 220 yen per request) and network latency occur when launching in overseas regions.

For this system, it is recommended to prepare S3 buckets in major regions that are used frequently and perform initial synchronization as necessary.
:::

---

## 3. Zero-Inbound SG and Least-Privilege IAM

We define in bulk the “security group with zero inbound rules” explained in Part 4, as well as the IAM roles required by EC2 and Lambda.

### Security Groups (Bulk Provisioning to All Regions)

Use Terraform's multi-provider feature (`providers = { aws = ... }`) and module loops. This makes it possible to deploy security groups with zero inbound rules to all regions.

<details><summary>security_groups.tf (click to expand)</summary>

```hcl
# Security group for each region (no inbound rules; all outbound traffic allowed)
resource "aws_security_group" "vllm_sg" {
  name        = "vllm-ssm-isolated-sg"
  description = "Zero-inbound security group for vLLM SSM port forwarding"
  vpc_id      = data.aws_vpc.default.id

  # Do not define inbound rules (completely closed)

  egress {
    description = "Allow all outbound traffic for SSM Agent and S3/ECR pull"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "vllm-ssm-isolated-sg" }
}
```

</details>

### IAM Roles (for EC2 and Lambda)

Grant EC2 instances the minimum permissions required for SSM communication, S3 read access, and ECR read access, while granting the Lambda function the permissions required to search for and launch EC2 instances across multiple regions.

<details><summary>iam.tf (click to expand)</summary>

```hcl
# IAM role for EC2 instances
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

# Policy for SSM Agent communication
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# S3 and ECR read policies
resource "aws_iam_role_policy_attachment" "s3_read" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}
resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# EC2 instance profile
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "vllm-ssm-instance-profile"
  role = aws_iam_role.ec2_role.name
}

# IAM role for the Lambda GPU broker
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

# Permissions for multi-region Spot search and EC2 startup
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
**💡 Notes When Migrating from the Script Environments in Parts 4 and 5**  
Be careful when running Terraform in an AWS environment where the environment setup scripts from Part 4 or Part 5 have already been executed. If resources with the same names exist, conflict errors (such as `EntityAlreadyExistsException`) will occur. In that case, import them with `terraform import`, or delete existing resources (or rename them) before running `terraform apply`.
:::

---

## 4. EC2 Launch Templates and Templating UserData

> **📌 Key Point of This Section**  
> We take the UserData (`startup.sh`) separated into S3 in Part 5 one step further. Instance types, EBS, IAM profiles, closed SGs, and UserData bootstrapping are centrally managed as an **EC2 Launch Template**. This completely separates hardware-dependent descriptions from the Lambda broker.

In Part 5, the UserData script, which exceeded 110 lines, was placed in an S3 bucket. The EC2 side was given a three-line bootstrap script that retrieves and executes it from S3. This avoided Lambda code bloat and the 16 KB UserData limit.

However, one more issue remained.

* **Instance specifications are hard-coded in the Lambda code**:  
  Hardware configurations such as the instance type (`g6.xlarge`), EBS volume (40 GB gp3, deletion protection disabled), IAM instance profile, security group, and Spot market options were still described as dictionaries in Lambda's Python code.

The hardware configuration and bootstrap procedure for instances are areas that should originally be managed as “static infrastructure specifications” in IaC.

Therefore, this configuration introduces **`aws_launch_template` (EC2 Launch Template)**. This batch-codes the hardware definition and UserData bootstrap.

### 1. UserData Bootstrap Template (`userdata_bootstrap.sh`)

Prepare a minimal shell script into which dynamic parameters—region, S3 bucket name, and ECR image name—can be injected using Terraform's `templatefile` function. Note that Bash variables (such as `$LOG_FILE`) are written without braces, cleanly avoiding variable-name collisions during Terraform template expansion.

<details><summary>templates/userdata_bootstrap.sh (click to expand)</summary>

```bash
#!/bin/bash
set -euo pipefail
LOG_FILE="/var/log/userdata-bootstrap.log"
exec > >(tee -a "$LOG_FILE" | logger -t user-data -s 2>/dev/console) 2>&1

AWS_REGION="${AWS_REGION}"
S3_BUCKET="${S3_BUCKET_NAME}"
DOCKER_IMAGE="${DOCKER_IMAGE}"

echo "=== Retrieve startup script (startup.sh) from S3 ==="
aws s3 cp "s3://$S3_BUCKET/scripts/startup.sh" /tmp/startup.sh --region "$AWS_REGION"
chmod +x /tmp/startup.sh

echo "=== Execute startup.sh ==="
/tmp/startup.sh "$AWS_REGION" "$S3_BUCKET" "$DOCKER_IMAGE"
```

</details>

### 2. Bulk Provisioning Launch Templates to All Regions (`launch_template.tf`)

EC2 Launch Templates are **region-specific** resources. If deployed only in Tokyo, the template cannot be found when launching in overseas regions. Therefore, Terraform is used to deploy them in bulk to all candidate regions under the same name (`vllm-spot-template`).

This allows the Lambda broker to create instances directly from the Launch Template without fallback, regardless of which region is selected by its real-time search.

<details><summary>launch_template.tf (click to expand)</summary>

```hcl
# terraform/launch_template.tf
# ==============================================================================
# Bulk provisioning of EC2 Launch Templates to all candidate regions
# Batch-code EBS (40GB gp3), IAM profile, security group, and UserData (S3 bootstrap)
# under the common template name "vllm-spot-template" in all regions
# ==============================================================================

# 1. Tokyo region (ap-northeast-1)
resource "aws_launch_template" "lt_ap_northeast_1" {
  name          = "vllm-spot-template"
  description   = "vLLM Ephemeral Spot Node (g6.xlarge, NVIDIA L4 24GB) [ap-northeast-1]"
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

# 2. Northern Virginia region (us-east-1)
resource "aws_launch_template" "lt_us_east_1" {
  provider      = aws.us_east_1
  name          = "vllm-spot-template"
  description   = "vLLM Ephemeral Spot Node (g6.xlarge, NVIDIA L4 24GB) [us-east-1]"
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

# 3. Ohio region (us-east-2)
resource "aws_launch_template" "lt_us_east_2" {
  provider      = aws.us_east_2
  name          = "vllm-spot-template"
  description   = "vLLM Ephemeral Spot Node (g6.xlarge, NVIDIA L4 24GB) [us-east-2]"
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

# 4. Oregon region (us-west-2)
resource "aws_launch_template" "lt_us_west_2" {
  provider      = aws.us_west_2
  name          = "vllm-spot-template"
  description   = "vLLM Ephemeral Spot Node (g6.xlarge, NVIDIA L4 24GB) [us-west-2]"
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

# 5. Frankfurt region (eu-central-1)
resource "aws_launch_template" "lt_eu_central_1" {
  provider      = aws.eu_central_1
  name          = "vllm-spot-template"
  description   = "vLLM Ephemeral Spot Node (g6.xlarge, NVIDIA L4 24GB) [eu-central-1]"
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
  description = "EC2 Launch Template IDs across all target regions"
}

output "launch_template_name" {
  value       = "vllm-spot-template"
  description = "Common EC2 Launch Template Name across all target regions"
}
```

</details>

Launch Templates are managed by Terraform under the same name (`vllm-spot-template`) in all candidate regions. As a result, even when hardware specifications change, you only need to modify the code and run `terraform apply` to apply the changes to all regions at once.

---

## 5. Automatic Packaging and Deployment of the Lambda Function

Deploy the GPU broker Python script (`handler.py`) introduced in Part 5. Use Terraform's standard `archive_file` data source to automatically create and deploy a ZIP file.

With the introduction of the Launch Template, pass `LAUNCH_TEMPLATE_NAME` to the Lambda function as an environment variable.

<details><summary>lambda.tf (click to expand)</summary>

```hcl
# Automatic ZIP packaging of Python code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda"
  output_path = "${path.module}/dist/lambda_function.zip"
}

# GPU launch broker Lambda function
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

### Invocation on the Lambda Handler Side (Simplified Launch Processing)

With the Launch Template in place, the instance startup process in the Lambda function (`handler.py`) becomes extremely simple.

```python
# Start in one line by specifying the Launch Template
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

There is no need to construct lengthy `BlockDeviceMappings`, `UserData`, and similar settings on the Python side. Lambda's responsibility can be focused solely on “real-time search for the optimal region and ephemeral launch through a template.”

---

## 6. Running Terraform (Bulk Provisioning and Environment Destruction)

Once the directory structure is ready, you can provision all resources by running commands.

```bash
cd terraform/

# 1. Initialize providers
terraform init

# 2. Deploy all static infrastructure (S3, ECR, IAM, SG, Lambda)
terraform apply -auto-approve
```

```text
Apply complete! Resources: 18 added, 0 changed, 0 destroyed.

Outputs:
broker_lambda_arn = "arn:aws:lambda:ap-northeast-1:123456789012:function:vllm-spot-broker"
ecr_repository_url = "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/vllm-openai"
```

This prepares all of the infrastructure required for multi-region deployment in just a few dozen seconds.

### Daily GPU Startup and Shutdown

After deploying the static infrastructure, continue using the scripts from Part 5 (`01_start_vllm_ssm.sh` / `02_stop_vllm_ssm.sh`) as-is for daily GPU startup and shutdown.

```bash
# Start the GPU instance (invoke Lambda broker and establish SSM tunnel)
./01_start_vllm_ssm.sh

# Destroy resources when work is complete (disconnect SSM and terminate via Lambda)
./02_stop_vllm_ssm.sh
```

Terraform does not take ownership of the GPU instance lifecycle itself. By leaving dynamic startup and shutdown to client scripts, you can use the inference environment quickly without waiting for `tfstate` locks.

Only when all validation work is complete and you want to clean up everything, including the static infrastructure in the cloud, run `terraform destroy`.

```bash
cd terraform/
terraform destroy -auto-approve
```

---

:::column:💡 Advanced: Application Patterns for Other Workloads
This validation used vLLM (GPU inference) as its subject. However, the combination of “Spot search and startup via Lambda” and “SSM port forwarding” can be broadly applied to other workloads as well.

1. **Large-Scale Compilation and Build Environments**:  
   To reduce the load on local machines, start compute-optimized instances with many vCPUs (for example, the `c6i` family) only for the required duration and automatically terminate them once the build is complete.
2. **Model Fine-Tuning and Batch Training**:  
   Launch multiple GPU instances on Spot only during training, retrieve datasets from S3, perform training, save the generated weights to S3, and then destroy the instances.
3. **Memory-Intensive Data Processing**:  
   Temporarily use instances with high-capacity memory (for example, the `r6i` family) only when aggregating or analyzing large data frames that tend to exceed the memory capacity of a local environment.
4. **Secure Temporary Development Environments (Remote Devbox)**:  
   Because it can be connected through SSM without opening inbound ports, it can be used as a secure temporary work environment from local VS Code and similar tools even in environments where publicly exposing ports externally is restricted.

This ephemeral operational model—“launch the appropriate cloud resource only when needed, and reliably terminate it after completion”—can be broadly used as an approach that balances cost efficiency and security.
:::

---

## Summary

In this article, I **declaratively coded (IaC-ified) the static resources** of a GPU inference platform spanning multiple regions with **Terraform**.

* **Division of responsibilities between static infrastructure and dynamic ephemeral resources**: By avoiding state-management overhead and leaving only static infrastructure to Terraform, a lightweight and robust architecture was achieved.
* **Introduction of EC2 Launch Templates**: Hardware specifications, closed SGs, and UserData bootstrapping were centrally coded, separating hardware-dependent code from the Lambda side.
* **ECR cross-region automatic replication**: Built a pipeline where pushing once to Tokyo automatically synchronizes to all candidate regions through the AWS backbone.
* **Zero-inbound SG and least-privilege IAM**: Defined security groups with zero inbound rules and IAM policies required for SSM/ECR/S3 connectivity in bulk.
* **Automatic Lambda deployment and environment destruction**: Established reliable cleanup through automatic ZIP packaging of Python code, provisioning, and `terraform destroy` when validation is complete.

By eliminating manual setup and ad-hoc scripts and establishing an infrastructure foundation that can be reproduced through code, daily LLM validation can now be operated more safely and reliably.
