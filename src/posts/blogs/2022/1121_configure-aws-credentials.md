---
title: GitHub Actions ワークフローにテンプレートエンジン採用の勧め 
author: shigeki-shoji
date: 2022-11-21
tags: [AWS, GitHub, "CI/CD"]
---

GitHub Actions で AWS にアクセスする場合 GitHub の OIDC プロバイダから発行される ID Token を AWS の IAM 外部プロバイダとして使用できます。

これにより、AWS_ACCESS_KEY_ID や AWS_SECRET_ACCESS_KEY のような永続的なクレデンシャルを設定する必要がなくなり、誤って公開されるリスクが大きく減少しました。

それでもまだ、リスクは小さいとはいえ AWS アカウント ID が ARN などの定義にプッシュされているケースを時々見かけます。

この記事では、さらにセキュアにするためテンプレートエンジンを使ったソリューションを提案します。

[[TOC]]

## GitHub の OIDC プロバイダを使用して AWS にアクセスする

最初に GitHub の OIDC プロバイダを使って AWS にアクセスする方法から説明します。概説すると次のようになります。

- AWS Identity and Access Management (IAM) の ID プロバイダに GitHub を追加する
- 追加した外部 ID プロバイダをプリンシパルとする IAM ロールを作成する
- 作成した IAM ロールを使用する GitHub Actions ワークフローを記述する

### 1. AWS Identity and Access Management (IAM) の ID プロバイダに GitHub を追加

IAM の「アクセス管理」にある「ID プロバイダ」を選択し、「プロバイダを追加」ボタンをクリックします。

画面のように、「OpenID Connect」を選択し、プロバイダの URL に `https://token.actions.githubusercontent.com`、対象者を `sts.amazonaws.com` と入力して「プロバイダを追加」ボタンをクリックします。

![ID Provider](/img/blogs/2022/1114_github-idprovider.png)

### 2. 追加した外部 ID プロバイダをプリンシパルとする IAM ロールの作成

作成した ID プロバイダをプリンシパルに設定したロールを作成します。

ロールの「信頼関係」は次のようになります。

{% raw %}
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::{AWS Account ID}:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringLike": {
                    "token.actions.githubusercontent.com:sub": "repo:{GitHub User/Organization}/{Repository Name}:*"
                }
            }
        }
    ]
}
```
{% endraw %}

AWS Account ID、GitHub User/Organization、Repository Name は使用する環境の値に置換してください。

ロールの「許可」は GitHub Actions にアクセスを許可する AWS サービスのポリシーを設定します。この記事の例のように S3 にファイルをコピーする場合は「AWSLambdaExecute」のような AWS 管理ポリシーが使用可能です。

### 3. ロールの登録と GitHub Actions のワークフローの記述

GitHub リポジトリの Settings タブ - Security - Secrets の Actions を選択して、「New repository secret」ボタンをクリックします。

この例では、Name を「AWS_ROLE_ARN」と入力し、Secret に 2 で作成したロールの ARN を設定して「Add secret」ボタンをクリックします。

ここまでで AWS の認証情報が取得可能かを確認するワークフローは次のようになります。

{% raw %}
```yaml
name: example

on:
  push:
    branches: [ main ]

permissions:
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Git clone the repository
        uses: actions/checkout@v3
      - name: configure aws credentials
        id: credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: "ap-northeast-3"
```
{% endraw %}

認証情報 (Credentials) が取得できれば、このワークフローが成功します。

## テンプレートエンジンの使用

例えば、Spring Boot アプリケーションの application.yml 等に AWS アカウント ID を含む ARN を設定したい場合、テンプレートエンジンを利用するとシンプルな解決策になると考えています。

例として次のようなテンプレートファイル (`templates/example.yaml`) を記述してみます。

{% raw %}
```yaml
aws:
  AWS_ACCOUNT_ID: {{ ENV }}
```

テンプレートの記述言語は「mustache (口髭)」です。置換する部分の `{{`、`}}` が口髭の形に似ていることから命名されているそうです。
{% endraw %}

このテンプレートファイルを処理するワークフローは次のようになります。

{% raw %}
```yaml
name: example

on:
  push:
    branches: [ main ]

permissions:
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Git clone the repository
        uses: actions/checkout@v3
      - name: configure aws credentials
        id: credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: "ap-northeast-3"
      - uses: edgardleal/mustache-template-action@v1.0.4
        env:
          ENV: ${{ steps.credentials.outputs.aws-account-id }}
        with:
          input: templates/example.yaml
          output: example.yaml 
```
{% endraw %}

ここでは、テンプレートエンジンのアクションに [mustache-template-action](https://github.com/edgardleal/mustache-template-action) を使用しました。
テンプレートは、このアクションへの環境変数の値で置換されて、output に指定されたパスのファイルが生成されます。

### アクションの出力 (OUTPUT) について

ここで AWS Actions の [configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials) を題材に GitHub Actions をもう少し詳しく説明します。

{% raw %}
上記のワークフローにある `${{ steps.credentials.outputs.aws-account-id }}` についてです。
{% endraw %}

GitHub Actions ではフローの実行結果の状態 (STATE) や出力 (OUTPUT) を他のフローに連携できます。
つまり、上の例のように `id: credentials` フローの出力を `steps.credentials.outputs` のプレフィックスと `aws-account-id` のキーで取得できます。

:::info
状態や出力は、それぞれ `save-state` と `set-output` コマンドが使用されてきました。
これらは「[GitHub Actions: Deprecating save-state and set-output commands](https://github.blog/changelog/2022-10-11-github-actions-deprecating-save-state-and-set-output-commands/)」に書かれている通り最近非推奨となりました。
それぞれ GITHUB_STATE 環境変数に設定されたファイルへの追記、GITHUB_OUTPUT 環境変数に設定されたファイルへの追記に変更することが要求されています。
:::

アクションそれぞれがどのような値を出力しているかは、アクションのリポジトリ内のファイル `action.yml` に書かれています。

configure-aws-credentials では、[action.yml](https://github.com/aws-actions/configure-aws-credentials/blob/master/action.yml) の次の部分が該当します。

```yaml
outputs:
  aws-account-id:
    description: 'The AWS account ID for the provided credentials'
```

## まとめ

GitHub に限定される話ではありませんが、開発するコードに機密情報を含めるべきではありません。機密情報は暗号化され安全が担保された場所にコードとは別に管理すべきです。
この記事ではそれを実践するため、テンプレートエンジンの利用を提案しました。

この記事のコードサンプルは、[GitHub リポジトリ](https://github.com/edward-mamezou/aws-mustache-example) にあります。
