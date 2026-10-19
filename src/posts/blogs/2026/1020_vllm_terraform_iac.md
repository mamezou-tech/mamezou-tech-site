---
title: TerraformでマルチリージョンGPU推論基盤を一括コード化！起動テンプレートとエフェメラルIaCで運用する
author: kazuyuki-shiratani
date: 2026-10-20
tags: [AWS, terraform, ECR, s3, IAM, EC2, vLLM, スポットインスタンス, IaC]
image: true
---

## はじめに

これは、「面白そう」と感じたアーキテクチャや技術スタックを、まずはあれこれ試しながら作ってみたプロトタイピングの記録です。

前回は、AWS LambdaとSSMセッションマネージャーによるサーバーレスGPU起動ブローカーを構築しました。
（詳細は[前回の記事](/blogs/2026/10/14/vllm_lambda_broker/)を参照してください）
これにより、ポート開放ゼロかつSSH秘密鍵不要で、世界中の最安スポットGPUをわずか数秒で探索・選定し、安全に直結できる環境が完成しました。

しかし、前回の構成を実践していく中で、もう1つ避けて通れない重要な課題が浮き彫りになります。

**「マルチリージョン展開に必要なS3・ECR・セキュリティグループ・IAMロール・起動構成・Lambda関数を、手動や場当たり的なシェルスクリプトで管理し続けるのは辛い」**

今回の構成では、東京（ap-northeast-1）に加えて海外4リージョン（バージニア、オハイオ、オレゴン、フランクフルト）の計5リージョンを調達先として扱います。これらのリージョンに手動で設定を入れると、設定漏れやタイプミスの温床になります。使わなくなった際の環境破棄や、別アカウントへの再現も極めて困難になります。

複数リージョンに分散配置するGPU実行基盤を、不要になったら丸ごと消せるエフェメラルなIaCとしてTerraformで組めば、管理や片付けが大幅に楽になります。
そこで今回は、 **静的インフラ基盤のすべてをTerraformで一括コード化（IaC化）** することにしました。

:::info
**📚 関連する過去の検証記事**  
* **第1回**: [AWS×UserDataでvLLMを自動起動！停止時コストほぼゼロのローカルLLM環境](/blogs/2026/09/16/vllm_autolaunch/)
* **第2回**: [自前vLLMをOpen WebUI経由でVS Code（Cline）に接続！トークンフリーで開発する](/blogs/2026/09/29/vllm_openwebui_cline/)
* **第3回**: [EC2スポットインスタンス×vLLMでGPUコストを大幅削減する](/blogs/2026/10/02/vllm_spot_instance/)
* **第4回**: [EC2スポット×vLLMをSSMでセキュア化！ポート開放ゼロで繋ぐ](/blogs/2026/10/09/vllm_ssm_zero_inbound/)
* **第5回**: [vLLM起動をAWS Lambda化！最安スポット探索と自動フォールバック](/blogs/2026/10/14/vllm_lambda_broker/)
:::

---

## 1. Terraform化における「役割分担（スコープ設計）」

> **📌 このセクションの要点**  
> 「常に存在する静的基盤」と「作業時だけ使い捨てるGPU」を明確に分離します。動的なGPU起動・停止までTerraformで管理しようとせず、ブローカー基盤までをTerraformで作り、GPUのオンデマンド調達はLambdaに任せる設計がベストプラクティスです。

本検証では、「常に存在するインフラ」と「作業時だけ使い捨てるGPU」を明確に分離しています。そのため、Terraformの管理範囲を以下のように切り分けるのがベストプラクティスです。

| カテゴリ | リソース | 管理ツール | ライフサイクル・費用感 |
| :--- | :--- | :--- | :--- |
| **静的基盤** | S3, ECR（+レプリケーション）, IAM, 各リージョンSG, Launch Template, Lambda | **Terraform** | 常時存在（使わない時の待機費用はS3・ECRの数GB保管料数十円のみ） |
| **動的エフェメラル** | 最適リージョンのリアルタイム探索, EC2スポット起動/破棄, SSMトンネル | **Lambda + CLI** | オンデマンド実行（作業中のみ $0.4〜0.6/h 課金） |

「EC2スポットの起動・破棄」までをTerraformで管理しようとすると、動的なリージョン選定が難しくなります。また、状態ファイル（`tfstate`）のロックや同期で毎回1分以上のオーバーヘッドが発生します。  
そのため、**「ブローカー基盤までをTerraformで作り、GPUの生成・破棄はブローカー（Lambda）に任せる」** という設計が最も軽快で堅牢です。

---

## 2. コンテナイメージのマルチリージョン配置（ECRクロスリージョンレプリケーション）

第1回〜第5回で採用している通り、vLLMのコンテナイメージ（約13GB）は **Amazon ECR** に永続化し、EC2の起動時に同一リージョン内から高速・転送料無料でPullします。

調達候補となる各リージョン（バージニア、オレゴン、オハイオ、フランクフルトなど）においても、同様に**同一リージョン内のECRからイメージを取得できる状態**を整えておく必要があります。仮に東京のECRから他リージョンのEC2へ都度Pullしてしまうと、リージョン間データ転送料金が毎回発生するうえ、コンテナ起動時間も大幅に増大してしまうためです。

とはいえ、イメージを更新するたびに各リージョンのECRエンドポイントへ手動で `docker push` を繰り返すのは運用負荷が高く、非効率です。

そこで、Amazon ECRがネイティブで備えている **クロスリージョンレプリケーション（Cross-Region Replication）** を採用します。Terraformでこの設定（`aws_ecr_replication_configuration`）を宣言しておきます。これにより、東京のECRに1回Pushするだけで、AWSバックボーン経由で全候補リージョンへ自動複製されます。

以下は、東京リージョンでのECRリポジトリ作成、旧世代イメージの自動削除ポリシー、および他4リージョンへの自動レプリケーションを定義したTerraformコードです。

<details><summary>ecr.tf（クリックで展開）</summary>

```hcl
# terraform/ecr.tf
# 東京（プライマリ）リージョンの ECR リポジトリ
resource "aws_ecr_repository" "vllm" {
  name                 = var.ecr_repository_name
  image_tag_mutability = "MUTABLE"

  tags = { Project = "vllm-ephemeral" }
}

# 古いタグの自動削除ポリシー（無駄なストレージ課金を防止）
resource "aws_ecr_lifecycle_policy" "vllm_lifecycle" {
  repository = aws_ecr_repository.vllm.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "最新イメージのみ保持し、旧世代は30日で失効"
      selection    = { tagStatus = "any", countType = "sinceImagePushed", countUnit = "days", countNumber = 30 }
      action       = { type = "expire" }
    }]
  })
}

# ★マルチリージョン・クロスリージョン自動レプリケーション
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
**💡 S3のモデル重み同期について（マルチリージョン配置の検討）**  
コンテナイメージと同様に、S3に格納するモデル重み（約15GB）についても候補リージョンへの分散配置が考えられます。

* **S3クロスリージョンレプリケーション（CRR）を利用する場合**:  
  全リージョンに重みを事前同期しておくことで、起動時のダウンロード時間を最短化し、同一リージョン内通信（無料）に抑制可能。一方で、複数リージョンにモデルを保持し続けるとS3保管料がリージョン数分発生するため、旧バケットの定期削除やGlacierへの退避など、ストレージ管理の併用が有効。
* **東京S3から都度クロスリージョン取得する場合**:  
  モデル保管料は東京の1バケット分で済む一方、海外リージョン起動時にクロスリージョン転送料（1回約220円）とネットワーク遅延が発生。

本システムでは、頻繁に利用する主要リージョンにはS3バケットを準備し、必要に応じて初期同期しておく構成を推奨しています。
:::

---

## 3. ゼロインバウンドSG ＆ 最小権限IAM

第4回で解説した「インバウンドルール0件のセキュリティグループ」と、EC2およびLambdaに必要なIAMロールを一括で定義します。

### セキュリティグループ（全リージョンへの一括プロビジョニング）

Terraformのマルチプロバイダ機能（`providers = { aws = ... }`）やモジュールループを活用します。これにより、全リージョンへインバウンド0件のセキュリティグループを展開できます。

<details><summary>security_groups.tf（クリックで展開）</summary>

```hcl
# 各リージョン向けのセキュリティグループ（インバウンドルールなし、アウトバウンド全開放）
resource "aws_security_group" "vllm_sg" {
  name        = "vllm-ssm-isolated-sg"
  description = "Zero-inbound security group for vLLM SSM port forwarding"
  vpc_id      = data.aws_vpc.default.id

  # インバウンドルールは定義しない（完全閉塞）

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

### IAMロール（EC2用 ＆ Lambda用）

EC2インスタンスにはSSM通信・S3読み取り・ECR読み取りに必要な最小権限を付与し、Lambda関数にはマルチリージョンのEC2探索・起動に必要な権限を付与します。

<details><summary>iam.tf（クリックで展開）</summary>

```hcl
# EC2インスタンス用 IAMロール
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

# SSMエージェント通信用ポリシー
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# S3 & ECR 読み取りポリシー
resource "aws_iam_role_policy_attachment" "s3_read" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}
resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# EC2インスタンスプロファイル
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "vllm-ssm-instance-profile"
  role = aws_iam_role.ec2_role.name
}

# Lambda GPUブローカー用 IAMロール
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

# マルチリージョンでのスポット探索・EC2起動権限
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
**💡 第4回・第5回のスクリプト環境から移行する場合の注意点**  
第4回や第5回の環境構築スクリプトを実行済みのAWS環境でTerraformを実行する場合に注意が必要です。同名のリソースが存在すると競合エラー（`EntityAlreadyExistsException` 等）が発生します。その場合は `terraform import` で取り込むか、既存リソースを削除（または名前を変更）してから `terraform apply` を実行してください。
:::

---

## 4. EC2起動テンプレート（Launch Template）とUserDataのテンプレート化

> **📌 このセクションの要点**  
> 第5回でS3へ切り離したUserData（`startup.sh`）をさらに一歩進めます。インスタンスタイプやEBS、IAMプロファイル、閉塞SG、UserDataブートストラップを **EC2起動テンプレート（Launch Template）** として一元管理します。これにより、Lambdaブローカーからハードウェア依存の記述を完全に切り離せます。

第5回では、110行を超えるUserDataスクリプトをS3バケットへ配置しました。EC2側にはS3から取得して実行する3行のブートストラップスクリプトを渡す構成としました。これにより、Lambdaコードの肥大化とUserDataの16KB上限問題を回避しました。

しかし、もう1つの課題が残っていました。

* **インスタンス仕様がLambdaコード内にハードコードされている**：  
  インスタンスタイプ（`g6.xlarge`）、EBSボリューム（40GB gp3、削除保護オフ）、IAMインスタンスプロファイル、セキュリティグループ、スポット市場オプションなどのハードウェア構成が、依然としてLambdaのPythonコード内の辞書として記述されていました。

インスタンスのハードウェア構成やブートストラップ手順は、本来「静的なインフラ仕様」としてIaCで管理すべき領域です。

そこで本構成では、**`aws_launch_template`（EC2起動テンプレート）** を導入します。これにより、ハードウェア定義とUserDataブートストラップを一括コード化します。

### 1. UserDataブートストラップのテンプレート（`userdata_bootstrap.sh`）

Terraformの `templatefile` 関数で動的パラメータ（リージョン、S3バケット名、ECRイメージ名）を注入できる極小シェルスクリプトを用意します。なお、Bash変数（`$LOG_FILE` 等）は波括弧を付けずに記述することで、Terraformテンプレート展開時の変数名衝突を綺麗に回避しています。

<details><summary>templates/userdata_bootstrap.sh（クリックで展開）</summary>

```bash
#!/bin/bash
set -euo pipefail
LOG_FILE="/var/log/userdata-bootstrap.log"
exec > >(tee -a "$LOG_FILE" | logger -t user-data -s 2>/dev/console) 2>&1

AWS_REGION="${AWS_REGION}"
S3_BUCKET="${S3_BUCKET_NAME}"
DOCKER_IMAGE="${DOCKER_IMAGE}"

echo "=== S3から起動スクリプト (startup.sh) を取得 ==="
aws s3 cp "s3://$S3_BUCKET/scripts/startup.sh" /tmp/startup.sh --region "$AWS_REGION"
chmod +x /tmp/startup.sh

echo "=== startup.sh 実行 ==="
/tmp/startup.sh "$AWS_REGION" "$S3_BUCKET" "$DOCKER_IMAGE"
```

</details>

### 2. 全リージョンへの起動テンプレート一括プロビジョニング（`launch_template.tf`）

EC2 Launch Templateは **リージョン固有** のリソースです。東京だけに配置すると、海外リージョンでの起動時にテンプレートが見つかりません。そのため、Terraformを使って全候補リージョンへ同一名（`vllm-spot-template`）で一括展開します。

これにより、Lambdaブローカーがリアルタイム探索でどのリージョンを引き当てた場合でも、フォールバックなしに起動テンプレートから直接インスタンスを生成できます。

<details><summary>launch_template.tf（クリックで展開）</summary>

```hcl
# terraform/launch_template.tf
# ==============================================================================
# EC2 起動テンプレート（Launch Template）全候補リージョン一括プロビジョニング
# EBS(40GB gp3)、IAMプロファイル、セキュリティグループ、UserData(S3ブートストラップ)
# を全リージョンで共通のテンプレート名「vllm-spot-template」としてコード化する
# ==============================================================================

# 1. 東京リージョン (ap-northeast-1)
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

# 2. バージニア北部リージョン (us-east-1)
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

# 3. オハイオリージョン (us-east-2)
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

# 4. オレゴンリージョン (us-west-2)
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

# 5. フランクフルトリージョン (eu-central-1)
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

起動テンプレートを全候補リージョンで同名（`vllm-spot-template`）としてTerraformで管理します。これにより、ハードウェア仕様の変更時もコードを修正して `terraform apply` するだけで、全リージョンへ一括反映されます。

---

## 5. Lambda関数の自動パッケージング ＆ デプロイ

第5回で紹介したGPUブローカーのPythonスクリプト（`handler.py`）をデプロイします。Terraform標準の `archive_file` データソースを使い、自動でZIP化して展開します。

起動テンプレートの導入に伴い、Lambda関数の環境変数には `LAUNCH_TEMPLATE_NAME` を渡します。

<details><summary>lambda.tf（クリックで展開）</summary>

```hcl
# Pythonコードの自動ZIPパッケージング
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda"
  output_path = "${path.module}/dist/lambda_function.zip"
}

# GPU起動ブローカー Lambda関数
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

### Lambdaハンドラー側での呼び出し（起動処理の簡潔化）

起動テンプレートが整ったことで、Lambda関数（`handler.py`）のインスタンス起動処理は極めて簡潔になります。

```python
# Launch Template を指定して1行で起動
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

長大な `BlockDeviceMappings` や `UserData` などをPython側で構築する必要はありません。Lambdaの責務は「最適リージョンのリアルタイム探索と、テンプレートによるエフェメラル起動」のみに集中できます。

---

## 6. Terraformの実行（一括プロビジョニングと環境破棄）

ディレクトリ構成を整えたら、コマンド実行で全リソースをプロビジョニングできます。

```bash
cd terraform/

# 1. プロバイダ初期化
terraform init

# 2. 静的基盤の全展開（S3・ECR・IAM・SG・Lambda）
terraform apply -auto-approve
```

```text
Apply complete! Resources: 18 added, 0 changed, 0 destroyed.

Outputs:
broker_lambda_arn = "arn:aws:lambda:ap-northeast-1:123456789012:function:vllm-spot-broker"
ecr_repository_url = "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/vllm-openai"
```

これにより、わずか数十秒でマルチリージョン展開に必要な基盤のすべてが整います。

### 日々のGPU起動・停止

静的基盤のデプロイ後は、日々のGPU起動・停止に第5回のスクリプト（`01_start_vllm_ssm.sh` / `02_stop_vllm_ssm.sh`）をそのまま使用します。

```bash
# GPUインスタンスの起動（Lambdaブローカー呼び出し & SSMトンネル確立）
./01_start_vllm_ssm.sh

# 作業終了時のリソース破棄（SSM切断 & Lambda経由でのTerminate）
./02_stop_vllm_ssm.sh
```

Terraform側でGPUインスタンス自体のライフサイクルは抱え込みません。動的な起動・停止をクライアントスクリプトに任せることで、`tfstate` のロック待ちなしに迅速に推論環境を利用できます。

検証作業全体が終了し、クラウド上の静的基盤ごとすべてクリーンアップしたい場合のみ、`terraform destroy` を実行します。

```bash
cd terraform/
terraform destroy -auto-approve
```

---

:::column:💡 発展：他ワークロードへの応用パターン
今回の検証ではvLLM（GPU推論）を題材としました。しかし、「Lambdaによるスポット探索・起動」と「SSMポートフォワーディング」の組み合わせは、他のワークロードにも幅広く応用可能です。

1. **大規模コンパイル・ビルド環境**:  
   手元端末の負荷を軽減するため、多数のvCPUを持つコンピュート最適化インスタンス（例: `c6i` 系列）を必要な時間だけ立ち上げ、ビルド完了後に自動終了させる。
2. **モデルのファインチューニングやバッチ学習**:  
   学習時のみ複数GPUインスタンスをスポット起動し、S3からデータセットを取得して学習し、生成された重みをS3へ保存した後にインスタンスを破棄する。
3. **メモリ集約型のデータ処理**:  
   ローカル環境ではメモリ不足になりやすい大規模データフレームの集計・分析時のみ、大容量メモリを搭載したインスタンス（例: `r6i` 系列）を一時的に利用する。
4. **セキュアな一時開発環境（リモートDevbox）**:  
   インバウンドポートを開放せずにSSM経由で接続できるため、外部へのポート公開が制限されている環境でも、手元のVS Code等からセキュアに一時的な作業環境として利用できる。

「必要なタイミングだけクラウド上の適切なリソースを立ち上げ、完了後は確実に終了させる」というエフェメラルな運用は、コスト効率とセキュリティを両立させるアプローチとして幅広く活用できます。
:::

---

## まとめ

本記事では、マルチリージョンにまたがるGPU推論基盤の静的リソースを **Terraformで宣言的にコード化（IaC化）** しました。

* **静的基盤と動的エフェメラルの役割分担**: 状態管理のオーバーヘッドを避け、静的基盤のみをTerraformに任せることで、軽快かつ堅牢なアーキテクチャを実現。
* **EC2起動テンプレート（Launch Template）の導入**: ハードウェア仕様や閉塞SG、UserDataブートストラップを一元的にコード化し、Lambda側からハードウェア依存コードを切り離し。
* **ECRクロスリージョン自動レプリケーション**: 東京へ1回Pushするだけで全候補リージョンへAWSバックボーン経由で自動同期されるパイプラインを構築。
* **ゼロインバウンドSG ＆ 最小権限IAM**: 受信ルール0件のセキュリティグループやSSM/ECR/S3接続に必要なIAMポリシーを一括定義。
* **Lambda自動デプロイと環境破棄**: Pythonコードの自動ZIP化からプロビジョニング、そして検証終了時の `terraform destroy` による確実なクリーンアップ性を確立。

手動セットアップや場当たり的なスクリプトを排除し、コードで再現可能なインフラ基盤が整ったことで、日々のLLM検証をより安全・確実に運用できるようになりました。
