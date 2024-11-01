---
title: AWS小ネタ - 裏技！？AWS CloudShellで操作ユーザーの資格情報を簡単にゲット！
author: yuji-kurabayashi
date: 2024-11-05
image: true
tags: [ AWS, CloudShell, docker, CloudFormation ]
---

# はじめに

[AWS CloudShell](https://docs.aws.amazon.com/ja_jp/cloudshell/latest/userguide/welcome.html)は、インフラ作業用の踏み台サーバーとして活用できる機能を取り揃えており、お手軽で便利です。さらに便利な裏技として操作ユーザーの資格情報を簡単に取得できますのでご紹介します。

# CloudShellの裏技

すごく簡単です。CloudShellで以下の通りにコマンドを実行するだけです。

```shell
curl -s -H "Authorization: $AWS_CONTAINER_AUTHORIZATION_TOKEN" "$AWS_CONTAINER_CREDENTIALS_FULL_URI"
```

すると、以下のようなレスポンスが得られます。

```json
{
        "Type": "",
        "AccessKeyId": "ASIA...",
        "SecretAccessKey": "K8ZX...",
        "Token": "IQoJ...",
        "Expiration": "2024-10-10T08:44:18Z",
        "Code": "Success"
}
```

`AccessKeyId`, `SecretAccessKey`, `Token`が資格情報になります。資格情報の有効期限`Expiration`は発行してからおよそ5分以上～15分未満程度と短いので、資格情報を実際に使う直前のタイミングで発行するとよいです。ちなみに各資格情報の値は`Expiration`の値が変化するたびに変化するようです。やりたいことに対して操作ユーザーの権限が足りていれば、この資格情報を使えば実施可能となります。

しかし、もし操作ユーザーが強力な権限を持っていると過剰な権限になってしまいます。資格情報は必要最低限の権限に絞って発行すべきだ、もしくは資格情報の有効期限が短すぎる、という場合は[`aws sts assume-role`](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/sts/assume-role.html)を使って資格情報を用意します。ただし、利用するには予めポリシーやロールを用意する手間がかかります。一方この裏技はこれらの手間を全く必要とせず、お手軽に利用できます。

:::check:CloudShellの環境変数には一体何が入っているのか
CloudShellで`printenv | grep AWS`コマンドを打つと以下のようなものが表示されます。

```shell
AWS_CONTAINER_AUTHORIZATION_TOKEN="0tTw..."
AWS_CONTAINER_CREDENTIALS_FULL_URI="http://localhost:1338/latest/meta-data/container/security-credentials"
AWS_DEFAULT_REGION="ap-northeast-1"
・・・
```

* `AWS_CONTAINER_AUTHORIZATION_TOKEN`の設定値はCloudShell環境が立ち上がるたびに変化するようです。
* `AWS_CONTAINER_CREDENTIALS_FULL_URI`の設定値は固定のようです。エンドポイントはローカルなんですね。
* `AWS_DEFAULT_REGION`の設定値はCloudShellを立ち上げているリージョンになっています。
:::

# CloudShell裏技活用例

例えば、CloudShell上でdockerコンテナを実行し、dockerコンテナ内でAWS CLIを使いたいケースです。
CloudShell上で以下を実行すると、

```sh
docker run --rm amazon/aws-cli s3 ls
```

dockerコンテナ内のAWS CLIが資格情報を利用できないため、以下のようなエラーになってしまいます。

```
Unable to locate credentials. You can configure credentials by running "aws configure".
```

dockerコンテナ内のAWS CLIが資格情報を利用できるようにするには、コンテナに[AWS CLIが認識する特定の環境変数名](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/cli-configure-envvars.html)で資格情報を設定する必要があります。

そこで、以下のようなシェルを用意しました。

<span style="font-size: 120%;"><b>[publish_temporary_credentials.sh](https://github.com/yuji-kurabayashi/publish_temporary_credentials/blob/main/publish_temporary_credentials.sh)</b></span>

`aws sts assume-role`を利用したい場合はシェルの第一引数にロールのARNをセットします。
そして、予めポリシーやロールを用意しておく必要があるので、これらを簡単に作成できるCloudFormationテンプレートを用意しました。このテンプレートを利用すると、許可したいアクションを指定してポリシーを用意して、さらに既存のポリシーを組み合わせて資格情報を発行するためのロールを作成できます。

<span style="font-size: 120%;"><b>[cfn_assume_role.yaml](https://github.com/yuji-kurabayashi/publish_temporary_credentials/blob/main/cfn_assume_role.yaml)</b></span>

```shell:publish_temporary_credentials.sh
#bin/sh

TEMPORARY_CREDENTIALS=
TEMPORARY_ACCESS_KEY_ID=
TEMPORARY_SECRET_ACCESS_KEY=
TEMPORARY_SESSION_TOKEN=

if [ -n "$1" ]; then
  # specified first arg (regard as use 'sts assume-role arn')
  TEMPORARY_CREDENTIALS=$(aws sts assume-role --role-arn "$1" --role-session-name `date +%Y%m%d%H%M%S`-session)
  TEMPORARY_ACCESS_KEY_ID=$(echo -n "$TEMPORARY_CREDENTIALS" | jq -r .Credentials.AccessKeyId)
  TEMPORARY_SECRET_ACCESS_KEY=$(echo -n "$TEMPORARY_CREDENTIALS" | jq -r .Credentials.SecretAccessKey)
  TEMPORARY_SESSION_TOKEN=$(echo -n "$TEMPORARY_CREDENTIALS" | jq -r .Credentials.SessionToken)
elif [ -n "$AWS_CONTAINER_AUTHORIZATION_TOKEN" ] && [ -n "$AWS_CONTAINER_CREDENTIALS_FULL_URI" ]; then
  # executing on AWS CloudShell
  TEMPORARY_CREDENTIALS=$(curl -s -H "Authorization: $AWS_CONTAINER_AUTHORIZATION_TOKEN" "$AWS_CONTAINER_CREDENTIALS_FULL_URI")
  TEMPORARY_ACCESS_KEY_ID=$(echo -n "$TEMPORARY_CREDENTIALS" | jq -r .AccessKeyId)
  TEMPORARY_SECRET_ACCESS_KEY=$(echo -n "$TEMPORARY_CREDENTIALS" | jq -r .SecretAccessKey)
  TEMPORARY_SESSION_TOKEN=$(echo -n "$TEMPORARY_CREDENTIALS" | jq -r .Token)
fi

echo "$TEMPORARY_CREDENTIALS"
echo ""
echo export AWS_ACCESS_KEY_ID="$TEMPORARY_ACCESS_KEY_ID"
echo export AWS_SECRET_ACCESS_KEY="$TEMPORARY_SECRET_ACCESS_KEY"
echo export AWS_SESSION_TOKEN="$TEMPORARY_SESSION_TOKEN"
echo export AWS_DEFAULT_REGION="$AWS_DEFAULT_REGION"

export TEMPORARY_AWS_ACCESS_KEY_ID="$TEMPORARY_ACCESS_KEY_ID"
export TEMPORARY_AWS_SECRET_ACCESS_KEY="$TEMPORARY_SECRET_ACCESS_KEY"
export TEMPORARY_AWS_SESSION_TOKEN="$TEMPORARY_SESSION_TOKEN"
```

* exportコマンド風に出力しているのは、発行した資格情報をCloudShell以外の環境で利用したい場合にコピーペーストして利用できるようにするためです。
* AWS CLIでの実行コマンドによっては、資格情報の他にリージョンの設定が必要になる場合もあるので併せて出力してセットしています。
    * 実際にdockerコンテナ内で`aws s3 cp`コマンドを実行したらリージョンが指定されていないというエラーが出てしまいました。
* 発行した資格情報を以下の環境変数名で設定します。シェルで設定している環境変数を実際に反映するには、`source`を付与して`source ./publish_temporary_credentials.sh`のように実行する必要があります。
    * TEMPORARY_AWS_ACCESS_KEY_ID
    * TEMPORARY_AWS_SECRET_ACCESS_KEY
    * TEMPORARY_AWS_SESSION_TOKEN

以下のようにシェルを実行した後で`docker run`コマンドの環境変数で資格情報等を渡して実行すると成功します。

```shell
chmod +x ./publish_temporary_credentials.sh
source ./publish_temporary_credentials.sh
# for use 'sts assume-role arn'
# source ./publish_temporary_credentials.sh arn:aws:iam::123456789012:role/assume-role-name

docker run --rm \
  -e AWS_ACCESS_KEY_ID="$TEMPORARY_AWS_ACCESS_KEY_ID" \
  -e AWS_SECRET_ACCESS_KEY="$TEMPORARY_AWS_SECRET_ACCESS_KEY" \
  -e AWS_SESSION_TOKEN="$TEMPORARY_AWS_SESSION_TOKEN" \
  -e AWS_DEFAULT_REGION="$AWS_DEFAULT_REGION" \
  amazon/aws-cli s3 ls
```

# 便利なワンライナー

参考までに、資格情報をexportコマンド風に出力するワンライナーです。

## CloudShell裏技版

CloudShellにこのままコピー＆ペーストして利用します。

```shell
curl -s -H "Authorization: $AWS_CONTAINER_AUTHORIZATION_TOKEN" "$AWS_CONTAINER_CREDENTIALS_FULL_URI" \
  | jq -r "[ \"export AWS_ACCESS_KEY_ID=\" + .AccessKeyId, \"export AWS_SECRET_ACCESS_KEY=\" + .SecretAccessKey, \"export AWS_SESSION_TOKEN=\" + .Token ] | .[]" && \
echo export AWS_DEFAULT_REGION="$AWS_DEFAULT_REGION"
```

## aws sts assume-role版

"your_sts_assume_role_ARN"の部分を適宜書き換えたものを利用します。
また、前述のCloudFormationテンプレート [cfn_assume_role.yaml](https://github.com/yuji-kurabayashi/publish_temporary_credentials/blob/main/cfn_assume_role.yaml) で作成したスタックの出力にも以下のコマンドが出力されているので、そのままコピー＆ペーストして利用します。

```shell
aws sts assume-role --role-arn "your_sts_assume_role_ARN" --role-session-name `date +%Y%m%d%H%M%S`-session \
  | jq -r "[ \"export AWS_ACCESS_KEY_ID=\" + .Credentials.AccessKeyId, \"export AWS_SECRET_ACCESS_KEY=\" + .Credentials.SecretAccessKey, \"export AWS_SESSION_TOKEN=\" + .Credentials.SessionToken ] | .[]" && \
echo export AWS_DEFAULT_REGION="$AWS_DEFAULT_REGION"
```

# さいごに

CloudShellの裏技はお手軽ですが、例えば操作ユーザーがAdministratorAccessのロールを持っている場合は非常に強力な権限を持つ資格情報となるので取り扱いには注意して、`aws sts assume-role`を使って適切に権限を制限することも検討します。
