---
title: AWS QuickSight的CI/CD环境构建：第1章 仪表板的自动备份（Git 管理）
author: masanori-hinokio
date: 2026-03-30T00:00:00.000Z
tags:
  - QuickSight
  - GitHub
  - CodeBuild
  - EventBridge
  - AWS
translate: true

---

## 引言

大家好，我是DX战的檜尾。  
这是我的第一次发帖，心情有点紧张。

在日常工作中，我感觉将 AWS QuickSight 的仪表板定义作为代码进行管理的“BI as Code”重要性越来越高。  
传统上在 GUI 界面上直接编辑虽然具有很高的敏捷性，但在运维上也存在难以追踪更改历史以及因误操作而回滚困难的问题。  
AWS 试图将业务智能运维（BIOps）的概念应用于解决这些问题。  
也就是将 DevOps 的方法应用到 BI 上。

在本文中，将分三章介绍如何构建 CI/CD 流水线，以使用 Git 对 QuickSight 的定义文件进行版本管理并安全地运行。

* **第1章：自动上传（本篇）**  
  以 QuickSight 上仪表板的发布为触发，构建自动将定义文件（JSON）备份到 GitHub 的机制。
* **第2章：自动测试（下次预定）**  
  计划讲解对导出后的定义文件进行静态分析，以及对依赖的数据集进行一致性检查的自动化机制。
* **第3章：自动部署（下下次预定）**  
  计划介绍如何构建流水线，以自动将 GitHub 上经过审核和合并的定义文件部署到其他环境（如生产环境）的 QuickSight 上。

这次将围绕基础的**第1章：自动上传环境的构建**，讲解具体的架构与实现步骤，以及构建时容易陷入的技术性细节（Tips）。

---

## 第1章：自动上传环境的构建

本章将利用 QuickSight 的“Asset Bundle API”，以事件驱动方式提取并保存仪表板定义。

### 1. 整体流程

1. **AWS CloudTrail / Amazon EventBridge**：检测 QuickSight 中仪表板的发布（`UpdateDashboard` / `CreateDashboard`）。  
2. **AWS CodeBuild**：以 EventBridge 为触发器启动并执行 Python 脚本。  
3. **AWS QuickSight（Asset Bundle API）**：根据 CodeBuild 的请求，以 JSON 格式导出仪表板定义。  
4. **GitHub**：CodeBuild 将提取的文件提交并推送到目标仓库。

### 2. 实现步骤

#### 步骤1：向 AWS Secrets Manager 注册 GitHub 认证信息

创建 CodeBuild 访问 GitHub 所需的 Personal Access Token (PAT)，并将其保存到 AWS Secrets Manager 中。

* **Secret 类型**：`其他 Secret 类型`  
* **键/值对**：并非通过 UI 的键-值输入，而需从“纯文本”标签页按以下 JSON 格式保存。原因是在 CodeBuild 的源阶段会出现 `ServerType is required` 错误。  
```json
{
  "ServerType": "GITHUB",
  "AuthType": "PERSONAL_ACCESS_TOKEN",
  "Token": "以ghp_开头的PAT"
}
```  
* **Secret 名称**：`QuickSightGitHubToken`

#### 步骤2：部署执行脚本到仓库

在用于备份的 GitHub 仓库根目录下，放置负责导出处理的 Python 脚本和 CodeBuild 的构建规范文件。

**1. export.py**  
使用 Boto3 调用 Asset Bundle Export API。本次仅针对仪表板定义，因此指定了 `IncludeAllDependencies=False`。

```python
import boto3
import time
import requests
import zipfile
import io
import os
import uuid

account_id = os.environ['AWS_ACCOUNT_ID']
raw_dashboard_id = os.environ['DASHBOARD_ID']  # 从 EventBridge 接收到完整的 ARN
region = os.environ['AWS_REGION']

dashboard_id = raw_dashboard_id.split('/')[-1]

client = boto3.client('quicksight', region_name=region)
job_id = str(uuid.uuid4())
arn = f"arn:aws:quicksight:{region}:{account_id}:dashboard/{dashboard_id}"

print(f"Exporting dashboard: {dashboard_id}")

# 开始导出作业
client.start_asset_bundle_export_job(
    AwsAccountId=account_id,
    AssetBundleExportJobId=job_id,
    ResourceArns=[arn],
    IncludeAllDependencies=False, 
    ExportFormat='QUICKSIGHT_JSON'
)

# 等待异步处理完成（轮询）
while True:
    response = client.describe_asset_bundle_export_job(
        AwsAccountId=account_id,
        AssetBundleExportJobId=job_id
    )
    status = response['JobStatus']
    if status == 'SUCCESSFUL':
        url = response['DownloadUrl']
        break
    elif status in ['FAILED', 'FAILED_PARTIAL']:
        raise Exception("Export failed!")
    time.sleep(5)

# 下载并解压归档
res = requests.get(url)
with zipfile.ZipFile(io.BytesIO(res.content)) as z:
    z.extractall("quicksight_backup")
print("Download and extraction complete.")
```

**2. buildspec.yml**  
定义 CodeBuild 的行为。

```yaml
version: 0.2

env:
  secrets-manager:
    GITHUB_TOKEN: "QuickSightGitHubToken:Token"

phases:
  install:
    runtime-versions:
      python: 3.11
    commands:
      - pip install boto3 requests
  build:
    commands:
      - python export.py
  post_build:
    commands:
      - git config --global user.name "QuickSight Auto Backup"
      - git config --global user.email "bot@example.com"
      - git remote set-url origin https://${GITHUB_TOKEN}@github.com/YourOrg/YourRepo.git
      - git add quicksight_backup/
      - git commit -m "Auto backup dashboard ID - ${DASHBOARD_ID}"
      - git push origin main
```

#### 步骤3：创建 IAM 角色和 CodeBuild 项目

为赋予 CodeBuild 的 IAM 角色按照最小权限原则附加以下策略。

* `quicksight:StartAssetBundleExportJob`
* `quicksight:DescribeAssetBundleExportJob`
* `quicksight:DescribeDashboard`
* `secretsmanager:GetSecretValue`

创建 CodeBuild 项目，并将目标 GitHub 仓库指定为源提供程序。从账户凭证进行连接。另外，将环境变量 `AWS_ACCOUNT_ID`（12 位数字）设置好。

#### 步骤4：配置 EventBridge 规则

在已启用 CloudTrail 的前提下，创建 EventBridge 规则。

* **事件模式**：

```json
{
  "source": ["aws.quicksight"],
  "detail-type": [
    "AWS API Call via CloudTrail",
    "AWS Service Event via CloudTrail" 
  ],
  "detail": {
    "eventSource": ["quicksight.amazonaws.com"],
    "eventName": ["CreateDashboard", "UpdateDashboard"]
  }
}
```

* **目标设置**：  
指定已创建的 CodeBuild 项目，使用“输入转换器”功能将仪表板 ID 作为环境变量传递。  
  * **输入路径**： `{"dashboard_id": "$.detail.serviceEventDetails.eventRequestDetails.dashboardId"}`  
  * **输入模板**：
  ```json
  {
    "environmentVariablesOverride": [
      {
        "name": "DASHBOARD_ID",
        "type": "PLAINTEXT",
        "value": "<dashboard_id>"
      }
    ]
  }
  ```

---

到此为止的实现，当发布仪表板时，就能自动在后台的 GitHub 上创建仪表板的备份。

### 3. Tips：构建时 QuickSight API 的技术性限制及解决方案

在构建自动化流水线时，可能会由于 QuickSight 特有的规范导致导出返回 `FAILED`。以下列出具有代表性的情况及其解决方案。

#### 问题：API 中本地文件数据集的不兼容性

当指定 `IncludeAllDependencies=True` 时，会出现 `File source type is not supported in Public API` 错误。

* **原因**：Asset Bundle API 不支持提取用户手动上传的本地文件（如 CSV/Excel 等）。  
* **解决方案**：在脚本中指定 `IncludeAllDependencies=False` 仅提取仪表板。或者需要将数据源改为通过 S3 或 Amazon Athena 的引用模型。

## 面向第2章和第3章

通过本章，实现了仪表板更改会自动提交到 Git 仓库的环境，从而达成了更改历史的可视化和备份自动化。

在下次的**第2章：自动测试**中，将讲解如何对获取的 JSON 定义进行模式验证，以及自动检测是否包含不必要的更改。

## 参考资料

在构建本环境时，参考了以下 AWS 官方文档及官方博客。若想了解更详细的规格或 API 选项，请一并参阅。

* **[Amazon QuickSight BIOps – 第3部分：使用 API 部署资产 (AWS官方博客)](https://aws.amazon.com/jp/blogs/news/amazon-quicksight-biops-part-3-assets-deployment-using-apis/)**
* **[Boto3 Documentation: QuickSight - start_asset_bundle_export_job](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/quicksight/client/start_asset_bundle_export_job.html)**  
  有关从 Python (Boto3) 执行导出作业时的详细参数（如 `IncludeAllDependencies` 等）。
* **[使用 AWS CloudTrail 记录 Amazon QuickSight API 调用日志 (AWS官方文档)](https://docs.aws.amazon.com/ja_jp/quicksight/latest/user/logging-using-cloudtrail.html)**  
  描述了 QuickSight 操作如何记录到 CloudTrail（包括 API Call 与 Service Event 的区别等）的规范。
* **[AWS CodeBuild buildspec 参考 (AWS官方文档)](https://docs.aws.amazon.com/ja_jp/codebuild/latest/userguide/build-spec-ref.html#build-spec-ref-env)**  
  讲解了在 `buildspec.yml` 中从 AWS Secrets Manager 安全获取认证信息（GitHub PAT）的语法规则。
