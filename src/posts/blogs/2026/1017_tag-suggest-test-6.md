---
title: AWS CodeCommit から始める小さな CI/CD：CodePipeline と CodeBuild でデプロイを自動化する
author: tag-suggest-test-user
date: 2026-10-17
image: true
---

## はじめに

小さなチームや社内ツールの開発では、「Git のリポジトリを置いて、push したら自動でデプロイされる」という仕組みを、手軽に用意したい場面がよくあります。
AWS だけで完結させたいなら、**AWS CodeCommit**、**AWS CodePipeline**、**AWS CodeBuild** の組み合わせが候補になります。

この記事では、CodeCommit に push したら、ビルド・テストを実行し、Lambda 関数へデプロイされるまでの流れを、順番に紹介します。
5分ほどで全体像をつかめるように、設定は最小限にしています。

## 全体像

今回作る流れは次のとおりです。

1. 開発者が CodeCommit のリポジトリに push する
2. EventBridge が push を検知し、CodePipeline が起動する
3. CodeBuild が、依存関係のインストール、Lint、単体テスト、パッケージ化を行う
4. 成功したら、CloudFormation（AWS SAM）で Lambda 関数をデプロイする
5. 結果を Amazon SNS 経由で Slack に通知する

アプリケーションは、TypeScript で書いた小さな API（Lambda 関数）を想定します。

## ステップ1：CodeCommit にリポジトリを作る

まず、AWS CLI でリポジトリを作成します。

```bash
aws codecommit create-repository \
  --repository-name order-api \
  --repository-description "Order API for internal tools"
```

認証は、IAM ユーザーの HTTPS Git 認証情報を使う方法のほか、`git-remote-codecommit` を使って IAM ロールのまま接続する方法があります。
後者なら、長期の認証情報を発行しなくて済むので、おすすめです。

```bash
pip install git-remote-codecommit
git clone codecommit::ap-northeast-1://order-api
```

## ステップ2：buildspec.yml でビルドを定義する

CodeBuild の処理は、リポジトリ直下の `buildspec.yml` に書きます。

```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - npm ci
  pre_build:
    commands:
      - npm run lint
      - npm test
  build:
    commands:
      - npm run build
      - sam build
      - sam package --s3-bucket $ARTIFACT_BUCKET --output-template-file packaged.yaml

artifacts:
  files:
    - packaged.yaml
```

ポイントは次の3つです。

- `npm ci` を使うと、`package-lock.json` のとおりに依存関係が入り、再現性が高くなります。
- Lint とテストを `pre_build` に置くと、失敗したときに、ビルドの本処理まで進みません。
- `sam package` で、デプロイ用のテンプレートを作り、アーティファクトとして残します。

## ステップ3：CodePipeline を組み立てる

パイプラインは3つのステージで構成します。

| ステージ | アクション | 内容 |
|---|---|---|
| Source | CodeCommit | `main` ブランチの変更を取得 |
| Build | CodeBuild | Lint、テスト、`sam package` |
| Deploy | CloudFormation | `packaged.yaml` から Lambda をデプロイ |

デプロイ前に、**手動承認**のステージを入れることもできます。
本番に向けるパイプラインでは、承認者を SNS で通知して、承認を待つ形にすると安心です。

## ステップ4：通知を Slack に送る

パイプラインの状態が変わったら、EventBridge のルールで SNS に流し、AWS Chatbot で Slack に通知します。

- 成功: 「デプロイが完了しました」
- 失敗: 失敗したステージの名前と、CodeBuild のログへのリンク

失敗に気づくまでの時間が短くなり、チームの対応が速くなります。

## 運用で気をつけること

- **権限は最小に**: CodeBuild のロールには、必要な S3 バケットと CloudFormation の操作だけを許可します。
- **ログの保存期間**: CloudWatch Logs の保存期間を決めておかないと、ログが増え続けます。
- **ブランチ戦略**: `main` への直接 push を避けたいときは、CodeCommit の承認ルールテンプレートで、プルリクエストの承認を必須にできます。
- **コスト**: CodeBuild は実行時間の課金です。キャッシュを使うと、`npm ci` の時間を短くできます。

## まとめ

- CodeCommit に push するだけで、ビルド・テスト・デプロイまで進む流れを、AWS のサービスだけで作れる。
- ビルドの内容は `buildspec.yml` に、パイプラインの構成は CloudFormation（または AWS CDK）に、コードとして残す。
- 通知と承認を加えると、チームで安心して使えるパイプラインになる。

最初は、Lint とテストだけの小さなパイプラインから始めて、少しずつステージを増やしていくのがおすすめです。
