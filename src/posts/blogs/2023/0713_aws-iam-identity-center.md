---
title: "AWS Identity Centerのロールから別のロールにCLIでスイッチして操作する"
author: shigeki-shoji
date: 2023-07-13
tags: [AWS]
---

こんにちは、[庄司](https://github.com/edward-mamezou)です。

複数の AWS アカウントがある環境では管理アカウント (Management Account) に AWS IAM Identity Center (旧 AWS SSO) をセットアップして各アカウントを使用していることが多いと思います。

私も個人的に利用している管理アカウントに「[Google Workspace を AWS IAM Identity Center の外部 ID プロバイダとして使用する方法](https://aws.amazon.com/jp/blogs/security/how-to-use-g-suite-as-external-identity-provider-aws-sso/)」を参考にセットアップしました。

## カスタム権限セットの作成

IAM Identity Center の権限セットには AWS 管理ポリシーに似た管理権限セットもありますが、ここでは、STS の AssumeRole のみができるポリシーを利用するためにカスタム権限セットを作成しました。

カスタム権限セットにはアクセス先にあるポリシー名を設定します。日常的に使用しているアカウントに作成したポリシーは次のとおりです。

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "sts:AssumeRole",
            "Resource": "*"
        }
    ]
}
```

よりセキュアにするためには `Resource` をワイルドカードから限定したロールにすべきでしょう。

このポリシーに `AssumeRolePolicy` を名付けました。

管理アカウントに戻って、カスタム権限セットを作成し、ユーザ (またはグループですが私はグループを利用していないため) に割り当ててアクセスするアカウントを設定しました。

## AWS CLI の設定

設定したポリシーは `AssumeRole` しかできないものです。やりたいことは図のように、S3 へのアクセスが必要な場合は `RoleForS3` ロールを受け持つということです。

![](/img/blogs/2023/0713_iam-identity-center.png)

### SSO の設定

`aws configure sso` コマンドを使って `.aws/config` を設定できます。

```shell
aws configure sso
SSO session name (Recommended): 任意のセッション名
SSO start URL [None]: 利用するURL 
SSO region [None]: IAM Identity Center のリージョン 
SSO registration scopes [sso:account:access]:

Using the account ID [選択したアカウントID]

Using the role name "AssumeRolePolicy"

CLI default client Region [ap-northeast-1]:
CLI default output format [json]:
CLI profile name [******-*******]: プロファイル名
```

次のコマンドでログインします (CLI profile name を `example` としたと仮定します)。

```shell
aws sso login --profile example
```

ポリシーで `AssumeRole` 以外は許可されていないため、次のコマンドを実行しても `AccessDenied` となります。

```shell
aws s3api list-buckets --profile example
```

### プロファイルの追加

`.aws/config` に次のプロファイルを追加します。

```text
[profile requires3]
role_arn = arn:aws:iam::123412341234:role/RoleForS3
source_profile = example
```

`role_arn` の `123412341234` はお使いの AWS アカウントID に置換してください。

`source_profile` に上で設定した SSO プロファイル名を記述しています。これによって、SSO でログインした認証情報を使って、`RoleForS3` に `AssumeRole` されます。

```shell
aws s3api list-buckets --profile requires3
```

S3 のバケット一覧が表示されるでしょう。

## おわりに

プロファイルの追加後にみていただいたように、シングルサインオンの後、必要な作業に応じたロールでアクセスすることで、例えば DynamoDB のデータを確認したい場合は、DynamoDB の ReadOnly なロールで操作したり、CloudFormation で AWS リソースを作成する場合はそのためのロールで操作するといった、きめの細かいアクセス制御の下で実行できます。
