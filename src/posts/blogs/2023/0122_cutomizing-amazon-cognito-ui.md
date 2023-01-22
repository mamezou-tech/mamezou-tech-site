---
title: Amazon Cognito user pools の認証フローを独自の UI で実装する
author: shigeki-shoji
date: 2023-01-22
tags: [AWS, "認証/認可"]
---

[Amazon Cognito user pools](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/cognito-user-identity-pools.html) は Web やモバイルアプリケーションの認証、認可、およびユーザ管理機能を提供する Amazon Cognito のユーザディレクトリサービスです。

このサービスには認証フローを実行する組み込みの Web UI (Hosted UI) がありますが、UI のカスタマイズ可能な範囲はかなり限定されています。

フロントエンドの Web / モバイル開発者が AWS でフルスタックアプリケーションを簡単に構築、デプロイ、ホストするための AWS Amplify がありますが、これには独自に作成した認証画面を使った Cognito user pools でのサインインが可能になっています。

公式ドキュメントは「[Switching authentication flows](https://docs.amplify.aws/lib/auth/switch-auth/q/platform/js/)」です。

Cognito user pools は、Hosted UI を使用する OAuth2 や OpenID Connect のエンドポイントによる認証フローや外部の SAML IdP (Identity Provider) や OpenID Connect OP (OpenID Provider) と連携するフェデレーションの他に、Cognito API を使用する認証フローが提供されています。

この記事では Hosted UI のカスタマイズではなく、Cognito API を使用する認証フローの利用について説明します。

Amplify の[ドキュメント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html#amazon-cognito-user-pools-custom-authentication-flow)では、認証フローとして「USER_SRP_AUTH」、「USER_PASSWORD_AUTH」、「CUSTOM_AUTH」の3つが挙げられています。

CUSTOM_AUTH は CAPTCHA 等を実現する Lambda を使って認証フローのカスタマイズを可能にします。このフローについてはこの記事では説明しません。詳細を知りたい場合は、Amazon Cognito の[デベロッパーガイド](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html#amazon-cognito-user-pools-custom-authentication-flow)を参照してください。

## 使用する Cognito user pools API

Amplify のようなクライアントサイドで認証フローを使用する場合は、InitiateAuth API を使用します。この記事は、サーバサイドの認証フローを説明するため、AdminInitiateAuth API を使って説明します。

### AdminInitiateAuth API

どちらの API を使用しても認証成功時に取得できるトークンは同じです。

#### USER_SRP_AUTH

SRP とは Secure Remote Password protocol の略です。パスワードを直接 Cognito に送信して検証するのではなく、鍵交換プロトコルを使って安全にパスワード検証します。

USER_SRP_AUTH の詳細については「[CognitoのUSER_SRP_AUTHフローやパスワード付きカスタム認証フローで必要な「SRP_A」を計算する(js, ts限定)](https://qiita.com/faable01/items/ceb7678d5e00917eb0c9)」等を参照してください。

#### USER_PASSWORD_AUTH (ADMIN_USER_PASSWORD_AUTH)

クライアントサイドの場合の USER_PASSWORD_AUTH は、サーバーサイドでは ADMIN_USER_PASSWORD_AUTH となります。

この API では、認証フローで USERNAME と PASSWORD を Cognito に送信して検証します。AWS CLI を使った例は次のようになります。

```shell
aws cognito-idp admin-initiate-auth \
  --user-pool-id <ユーザプールID> \
  --client-id <アプリクライアントID> \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters '{ "USERNAME": "<ユーザ名>", "PASSWORD": "<パスワード>" }'
```

パスワードを Cognito に渡しますが、特に既存のユーザディレクトリから Cognito user pools に移行するフェーズで、Cognito の移行 (Migration) トリガー Lambda を使用したい場合は、この USER_PASSWORD_AUTH フローを使用する必要があります。

### AdminRespondToAuthChallenge API

USER_SRP_AUTH の場合や多要素認証 (MFA) が有効になっている場合等は、AdminInitiateAuth API レスポンスの AuthenticationResult ではなく ChallengeName に値が設定されます。認証フローが失敗するか、AuthenticationResult にトークンが設定されて成功するまで、AdminRespondToAuthChallenge API に回答して進める必要があります。

この認証フローの進め方は、「[ユーザープール認証フロー](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html)」を参照してください。

USER_SRP_AUTH のチャレンジにはサーバサイドのみで回答を作成できますが、MFA の場合にはコード入力のための画面をブラウザに返して、入力された値でチャレンジに回答する必要があるかもしれません (著者が以前関わったプロダクトでは MFA コード入力画面を返し入力されたコードを使ってチャレンジに回答するように実装しました)。

## カスタム画面

ここまでサーバサイド側で使用する Cognito API について概説しました。

簡単に書くと、MFA を考慮しなければ、単純にユーザ名とパスワードの入力画面を用意し、サーバサイドのエンドポイントに POST することで Cognito user pools のサインインが実現できます。

MFA や CAPTCHA 等が必要な場合は、追加の入力要素あるいは追加の画面が必要になるかもしれません。

いずれにせよ、既存の認証画面イメージをそのまま実装できます。

## 取得されるトークン

Hosted UI を使った認証フローでは、/oauth2/authorize や /login エンドポイントに、scope、response_type、redirect_uri などのパラメータを付して開始します。

認証に成功したときのアクセストークン (AccessToken) には認証フローで使った scope 等の値が JWT のペイロードに含まれます。

この記事で説明したカスタム認証画面を使った認証フローでは、scope 等を設定していません。したがって、認証成功時のアクセストークンのペイロードの scope は `aws.cognito.signin.user.admin` のみが設定されます。

上述の AWS CLI のレスポンスから得られた AccessToken を [jwt.io](https://jwt.io/) を使って確認したペイロード部を示します。

```json
{
  "sub": "0840c010-****-4be0-8ebb-************",
  "iss": "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_*********",
  "client_id": "****5on****pqg3d08efb0****",
  "origin_jti": "fdaabaf9-cd3b-47ec-9fa8-************",
  "event_id": "098062e8-b6a1-4e44-8399-************",
  "token_use": "access",
  "scope": "aws.cognito.signin.user.admin",
  "auth_time": 1674370807,
  "exp": 1674374407,
  "iat": 1674370807,
  "jti": "a83dc63e-67f4-4e57-a788-8fe6597b804e",
  "username": "test1"
}
```
