---
title: AWS QuickSightのCI/CD環境構築：第1章 ダッシュボードの自動バックアップ（Git管理）
author: masanori-hinokio
date: 2026-03-30
tags: [QuickSight,GitHub,CodeBuild,EventBridge,AWS]
---

## はじめに

こんにちはDX戦の檜尾です。
初めての投稿になりますドキドキ。

日々の業務において、AWSQuickSightのダッシュボード定義をコードとして管理する「BI as Code」の重要性が高まっていると感じます。
従来のGUI上での直接編集はアジリティが高い反面、変更履歴の追跡や誤操作によるロールバックが困難になるという運用上の課題を抱えています。
AWSではこれらの問題に対してビジネスインテリジェンス運用 (BIOps)という考えを適用しようとしています。
DevOpsで行っていたことをBIでも適用できるのではないかということですね。

本記事では、QuickSightの定義ファイルをGitでバージョン管理し、安全に運用するためのCI/CDパイプライン構築手順を全3章に分けて解説します。

* **第1章：自動アップロード（本記事）**
  QuickSight上でのダッシュボード公開をトリガーとし、定義ファイル（JSON）を自動的にGitHubへバックアップする仕組みを構築。
* **第2章：自動テスト（次回予定）**
  エクスポートされた定義ファイルに対する静的解析や、依存するデータセットの整合性チェックを自動化する仕組みを解説予定。
* **第3章：自動デプロイ（次々回予定）**
  GitHub上でレビュー・マージされた定義ファイルを、別環境（本番環境等）のQuickSightへ自動でデプロイするパイプラインを解説予定。

今回はベースとなる**第1章：自動アップロード環境の構築**について、具体的なアーキテクチャと実装手順、および構築時に陥りやすい技術的な仕様（Tips）を解説します。

---

## 第1章：自動アップロード環境の構築

本章では、QuickSightの「Asset Bundle API」を活用し、イベント駆動型でダッシュボード定義を抽出・保存します。

### 1. 全体の流れ

1. **AWS CloudTrail / Amazon EventBridge**: QuickSightにおけるダッシュボードの公開（`UpdateDashboard` / `CreateDashboard`）を検知。
2. **AWS CodeBuild**: EventBridgeをトリガーとして起動し、Pythonスクリプトを実行。
3. **AWS QuickSight (Asset Bundle API)**: CodeBuildからのリクエストに応じ、ダッシュボードの定義をJSON形式でエクスポート。
4. **GitHub**: 抽出されたファイルをCodeBuildが対象リポジトリへCommitおよびPush。

### 2. 実装手順

#### Step 1: GitHub認証情報のAWS Secrets Managerへの登録
CodeBuildがGitHubへアクセスするためのPersonal Access Token (PAT) を発行し、AWS Secrets Managerに保存します。

* **シークレットのタイプ**: `その他シークレットのタイプ`
* **キー/値のペア**: UIのキー・値入力ではなく、「プレーンテキスト」タブから以下のJSON形式で保存する必要がある。理由はCodeBuildのソースフェーズで `ServerType is required` エラーが発生する為。

```json
{
  "ServerType": "GITHUB",
  "AuthType": "PERSONAL_ACCESS_TOKEN",
  "Token": "ghp_から始まるPAT"
}
```
* **シークレット名**: `QuickSightGitHubToken`

#### Step 2: 実行スクリプトの配置
バックアップ先となるGitHubリポジトリの直下に、エクスポート処理を担うPythonスクリプトとCodeBuildのビルド仕様ファイルを配置します。

**1. export.py**
Boto3を使用してAsset Bundle Export APIを呼び出します。今回はダッシュボード定義のみを対象とするため、`IncludeAllDependencies=False` を指定しています。

```python
import boto3
import time
import requests
import zipfile
import io
import os
import uuid

account_id = os.environ['AWS_ACCOUNT_ID']
raw_dashboard_id = os.environ['DASHBOARD_ID'] # EventBridgeからARNが丸ごと渡ってくる
region = os.environ['AWS_REGION']

dashboard_id = raw_dashboard_id.split('/')[-1]

client = boto3.client('quicksight', region_name=region)
job_id = str(uuid.uuid4())
arn = f"arn:aws:quicksight:{region}:{account_id}:dashboard/{dashboard_id}"

print(f"Exporting dashboard: {dashboard_id}")

# エクスポートジョブの開始
client.start_asset_bundle_export_job(
    AwsAccountId=account_id,
    AssetBundleExportJobId=job_id,
    ResourceArns=[arn],
    IncludeAllDependencies=False, 
    ExportFormat='QUICKSIGHT_JSON'
)

# 非同期処理の完了待機（ポーリング）
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

# アーカイブのダウンロードと展開
res = requests.get(url)
with zipfile.ZipFile(io.BytesIO(res.content)) as z:
    z.extractall("quicksight_backup")
print("Download and extraction complete.")
```

**2. buildspec.yml**
CodeBuildの動作を定義します。

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

#### Step 3: IAMロールとCodeBuildプロジェクトの作成
CodeBuildに付与するIAMロールには、最小権限の原則に従い以下のポリシーをアタッチします。

* `quicksight:StartAssetBundleExportJob`
* `quicksight:DescribeAssetBundleExportJob`
* `quicksight:DescribeDashboard`
* `secretsmanager:GetSecretValue`

CodeBuildプロジェクトを作成し、ソースプロバイダとして対象のGitHubリポジトリを指定します。アカウント認証情報から接続をしておきます。また、環境変数に `AWS_ACCOUNT_ID`（12桁の数字）を設定します。

#### Step 4: EventBridgeルールの設定
CloudTrailが有効化されている前提で、EventBridgeルールを作成します。

* **イベントパターン**:

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

* **ターゲット設定**:
作成したCodeBuildプロジェクトを指定し、「入力トランスフォーマー」機能を用いてダッシュボードIDを環境変数として渡します。
  * **入力パス**: `{"dashboard_id": "$.detail.serviceEventDetails.eventRequestDetails.dashboardId"}`
  * **入力テンプレート**:
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

ここまでの実装でダッシュボードを公開すると、自動的に裏側のGithubにダッシュボードのバックアップができるようになります。

### 3. Tips: 構築時におけるQuickSight APIの技術的制約と解決策

自動化パイプライン構築において、QuickSight特有の仕様によりエクスポートが `FAILED` となるケースがあります。以下に代表的な事象とその解決策を提示します。

#### 事象: APIにおけるローカルファイルデータセットの非互換性
`IncludeAllDependencies=True`を指定時、`File source type is not supported in Public API` というエラーが発生する。

* **原因**: Asset Bundle APIは、ユーザーが手動でアップロードしたローカルファイル（CSV/Excel等）の抽出に非対応。
* **対策**: スクリプト側で `IncludeAllDependencies=False` を指定しダッシュボードのみを抽出する。もしくはデータソースをS3やAmazon Athena経由の参照モデルに改修する必要がある。


## 第2章・第3章に向けて

本章により、ダッシュボードの変更が自動的にGitリポジトリへコミットされる環境が整いました。これにより、変更履歴の可視化とバックアップの自動化が達成されます。

次回の**第2章：自動テスト**では、取得したJSON定義に対するスキーマ検証や、不要な変更が含まれていないかを自動検知する仕組みについて解説しようとおもいます。

## 参考資料

本環境を構築するにあたり、以下のAWS公式ドキュメントおよび公式ブログを参考にしています。さらに詳細な仕様やAPIのオプションについて知りたい方は、併せてご参照ください。

* **[Amazon QuickSight BIOps – パート3 : API を使用したアセットのデプロイ (AWS公式ブログ)](https://aws.amazon.com/jp/blogs/news/amazon-quicksight-biops-part-3-assets-deployment-using-apis/)**
* **[Boto3 Documentation: QuickSight - start_asset_bundle_export_job](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/quicksight/client/start_asset_bundle_export_job.html)**
  * Python (Boto3) からエクスポートジョブを実行する際の、詳細なパラメータ（`IncludeAllDependencies` 等）。
* **[AWS CloudTrail を使用した Amazon QuickSight API コールのログ記録 (AWS公式ドキュメント)](https://docs.aws.amazon.com/ja_jp/quicksight/latest/user/logging-using-cloudtrail.html)**
  * QuickSightでの操作がどのようにCloudTrailに記録されるか（API Call と Service Event の違いなど）の仕様が記載。
* **[AWS CodeBuild の buildspec リファレンス (AWS公式ドキュメント)](https://docs.aws.amazon.com/ja_jp/codebuild/latest/userguide/build-spec-ref.html#build-spec-ref-env)**
  * `buildspec.yml` 内で AWS Secrets Manager から安全に認証情報（GitHub PAT）を取得するための構文規則について解説。
