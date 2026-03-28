---
title: >-
  CI/CD Environment Setup for AWS QuickSight: Chapter 1 Automated Dashboard
  Backup (Git Management)
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

## Introduction

Hello, this is Hinokio from the DX team. This is my first post, and I'm feeling a bit nervous.

In our daily work, I feel that the importance of "BI as Code"—managing AWS QuickSight dashboard definitions as code—is increasing. While the conventional direct editing in the GUI offers high agility, it has operational challenges such as difficulty tracking change history and rolling back due to misoperations. AWS is trying to apply the concept of Business Intelligence Operations (BIOps) to address these issues. In other words, we might be able to apply what we did in DevOps to BI as well.

In this article, I will explain the steps for building a CI/CD pipeline to version-control and securely operate QuickSight definition files with Git, divided into three chapters.

* Chapter 1: Automated Upload (this article)  
  Build a mechanism that triggers on dashboard publication in QuickSight and automatically backs up the definition files (JSON) to GitHub.  
* Chapter 2: Automated Testing (planned for next time)  
  An explanation of how to automate static analysis of the exported definition files and consistency checks of dependent datasets.  
* Chapter 3: Automated Deployment (planned for the time after next)  
  A pipeline that automatically deploys definition files reviewed and merged on GitHub to QuickSight in another environment (e.g., production).

This time, for the foundational Chapter 1: Setting Up the Automated Upload Environment, I will explain the concrete architecture and implementation steps, as well as technical specification pitfalls (Tips) you may encounter during setup.

---

## Chapter 1: Setting Up the Automated Upload Environment

In this chapter, we will leverage QuickSight's Asset Bundle API to extract and store dashboard definitions in an event-driven manner.

### 1. Overall Flow

1. AWS CloudTrail / Amazon EventBridge: Detect dashboard publication (`UpdateDashboard` / `CreateDashboard`) in QuickSight.  
2. AWS CodeBuild: Triggered by EventBridge, it starts and runs a Python script.  
3. AWS QuickSight (Asset Bundle API): In response to the request from CodeBuild, export the dashboard definitions in JSON format.  
4. GitHub: CodeBuild commits and pushes the extracted files to the target repository.  

### 2. Implementation Steps

#### Step 1: Register GitHub Credentials in AWS Secrets Manager

Generate a Personal Access Token (PAT) for CodeBuild to access GitHub and store it in AWS Secrets Manager.

* Secret type: `Other secret type`  
* Key/value pair: Instead of entering key/value via the UI, you need to save it in the following JSON format from the “Plaintext” tab. Otherwise, a `ServerType is required` error occurs in CodeBuild’s source phase.

```json
{
  "ServerType": "GITHUB",
  "AuthType": "PERSONAL_ACCESS_TOKEN",
  "Token": "PAT starting with ghp_"
}
```

* Secret name: `QuickSightGitHubToken`

#### Step 2: Placement of the Execution Script

Place the Python script responsible for the export process and the CodeBuild build spec file directly under the target GitHub repository for backup.

1. export.py  
   Calls the Asset Bundle Export API using Boto3. This time, since we are targeting only the dashboard definitions, we specify `IncludeAllDependencies=False`.

```python
import boto3
import time
import requests
import zipfile
import io
import os
import uuid

account_id = os.environ['AWS_ACCOUNT_ID']
raw_dashboard_id = os.environ['DASHBOARD_ID']  # The raw ARN is passed from EventBridge
region = os.environ['AWS_REGION']

dashboard_id = raw_dashboard_id.split('/')[-1]

client = boto3.client('quicksight', region_name=region)
job_id = str(uuid.uuid4())
arn = f"arn:aws:quicksight:{region}:{account_id}:dashboard/{dashboard_id}"

print(f"Exporting dashboard: {dashboard_id}")

# Start the export job
client.start_asset_bundle_export_job(
    AwsAccountId=account_id,
    AssetBundleExportJobId=job_id,
    ResourceArns=[arn],
    IncludeAllDependencies=False,
    ExportFormat='QUICKSIGHT_JSON'
)

# Wait for the asynchronous process to complete (polling)
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

# Download and extract the archive
res = requests.get(url)
with zipfile.ZipFile(io.BytesIO(res.content)) as z:
    z.extractall("quicksight_backup")
print("Download and extraction complete.")
```

2. buildspec.yml  
   Defines the behavior of CodeBuild.

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

#### Step 3: Create the IAM Role and the CodeBuild Project

Attach the following policies to the IAM role granted to CodeBuild, following the principle of least privilege:

* quicksight:StartAssetBundleExportJob  
* quicksight:DescribeAssetBundleExportJob  
* quicksight:DescribeDashboard  
* secretsmanager:GetSecretValue  

Create a CodeBuild project and specify the target GitHub repository as the source provider. Set up the connection via account credentials. Also set the environment variable `AWS_ACCOUNT_ID` (a 12-digit number).

#### Step 4: Configure the EventBridge Rule

Assuming CloudTrail is enabled, create an EventBridge rule.

* Event pattern:

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

* Target settings: Specify the CodeBuild project you created and use the “Input Transformer” feature to pass the dashboard ID as an environment variable.  
  * Input path: `{"dashboard_id": "$.detail.serviceEventDetails.eventRequestDetails.dashboardId"}`  
  * Input template:

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

With the implementation so far, when you publish a dashboard, it will automatically back up the dashboard to GitHub behind the scenes.

### 3. Tips: Technical Constraints of the QuickSight API During Setup and Solutions

In building an automated pipeline, there are cases where exports fail due to QuickSight-specific specifications. Below are representative issues and their solutions.

#### Issue: Incompatibility of Local File Datasets in the API

When specifying `IncludeAllDependencies=True`, an error `File source type is not supported in Public API` occurs.

* Cause: The Asset Bundle API does not support extracting local files (CSV/Excel, etc.) manually uploaded by the user.  
* Solution: Specify `IncludeAllDependencies=False` in the script to extract only the dashboard. Alternatively, you need to modify the data source to a reference model via S3 or Amazon Athena.

## Looking Ahead to Chapters 2 and 3

With this chapter, you now have an environment where dashboard changes are automatically committed to the Git repository. This achieves change history visibility and automated backups.

In the next Chapter 2: Automated Testing, I intend to explain mechanisms for schema validation of the retrieved JSON definitions and for automatically detecting any unintended changes.

## References

In building this environment, I referred to the following AWS official documents and blogs. For those who want to know more detailed specifications and API options, please refer to them as well.

* **[Amazon QuickSight BIOps – Part 3: Asset Deployment Using APIs (AWS Official Blog)](https://aws.amazon.com/jp/blogs/news/amazon-quicksight-biops-part-3-assets-deployment-using-apis/)**  
* **[Boto3 Documentation: QuickSight - start_asset_bundle_export_job](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/quicksight/client/start_asset_bundle_export_job.html)**  
  * Details of parameters (such as `IncludeAllDependencies`) when executing an export job from Python (Boto3).  
* **[Logging Amazon QuickSight API Calls Using AWS CloudTrail (AWS Official Documentation)](https://docs.aws.amazon.com/ja_jp/quicksight/latest/user/logging-using-cloudtrail.html)**  
  * Specification of how QuickSight operations are recorded in CloudTrail (differences between API Call and Service Event, etc.).  
* **[AWS CodeBuild buildspec Reference (AWS Official Documentation)](https://docs.aws.amazon.com/ja_jp/codebuild/latest/userguide/build-spec-ref.html#build-spec-ref-env)**  
  * Explains the syntax for securely retrieving credentials (GitHub PAT) from AWS Secrets Manager within `buildspec.yml`.
