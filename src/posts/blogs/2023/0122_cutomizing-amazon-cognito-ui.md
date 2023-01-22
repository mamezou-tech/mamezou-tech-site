---
title: Amazon Cognito user pools の認証フローを独自の UI で実装する
author: shigeki-shoji
date: 2023-01-22
tags: [AWS, "認証/認可"]
---

[Amazon Cognito user pools](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/cognito-user-identity-pools.html) は Web やモバイルアプリケーションの認証、認可、およびユーザ管理機能を提供する Amazon Cognito のユーザディレクトリサービスです。

このサービスには認証フローを実行する組み込みの Web UI (Hosted UI) がありますが、UI のカスタマイズ可能な範囲はかなり限定されています。

フロントエンドの Web / モバイル開発者が AWS でフルスタックアプリケーションを簡単に構築、デプロイ、ホストするための AWS Amplify がありますが、これには独自に作成した認証画面を使った Cognito user pools でのサインインが可能になっています。

公式ドキュメントの「[Switching authentication flows](https://docs.amplify.aws/lib/auth/switch-auth/q/platform/js/)」で解説されています。

Cognito user pools は、Hosted UI を使用する OAuth2 や OpenID Connect のエンドポイントによる認証フローや外部の SAML IdP (Identity Provider) や OpenID Connect OP (OpenID Provider) と連携するフェデレーションの他に、Cognito API を使用する認証フローが提供されています。

この記事では Hosted UI のカスタマイズではなく、Cognito API を使用する認証フローの利用について説明して、最後に Hosted UI との比較をまとめます。

先に紹介した Amplify の[ドキュメント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html#amazon-cognito-user-pools-custom-authentication-flow)では、認証フローとして「USER_SRP_AUTH」、「USER_PASSWORD_AUTH」、「CUSTOM_AUTH」の3つが挙げられています。

CUSTOM_AUTH は CAPTCHA 等を実現する Lambda を使って認証フローのカスタマイズを可能にします。このフローについてはこの記事では説明しません。詳細を知りたい場合は、Amazon Cognito の[デベロッパーガイド](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html#amazon-cognito-user-pools-custom-authentication-flow)を参照してください。

## 使用する Cognito user pools API

Amplify のようなクライアントサイドで認証フローを使用する場合は、InitiateAuth API を使用します。この記事は、サーバサイドの認証フローを説明します。サーバサイドでは AdminInitiateAuth API を使用します。

### AdminInitiateAuth API

InitiateAuth と AdminInitiateAuth API のどちらを使用しても認証成功時に取得できるトークンは同じです。

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

USER_SRP_AUTH 認証フローや多要素認証 (MFA) が有効になっている場合等は、AdminInitiateAuth API レスポンスの AuthenticationResult ではなく ChallengeName に値が設定されます。ChallengeName に値がある場合は、AdminRespondToAuthChallenge API を使用し、回答して進める必要があります。

AuthenticationResult にトークンが設定されて成功するか、認証フローが失敗するまで AdminRespondToAuthChallenge API を使って繰り返します。

この認証フローの進め方は「[ユーザープール認証フロー](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html)」に解説があります。

USER_SRP_AUTH のチャレンジにはサーバサイドのみで回答を作成できますが、MFA の場合にはコード入力のための画面をブラウザに返して、入力された値でチャレンジに回答する必要があるかもしれません (著者が以前関わったプロダクトでは MFA コード入力画面を返し入力されたコードを使ってチャレンジに回答するように実装しました)。

## カスタム画面

ここまでサーバサイド側で使用する Cognito API について概説しました。

簡単に書くと、MFA を考慮しなければ、単純にユーザ名とパスワードの入力画面を用意し、サーバサイドのエンドポイントに POST することで Cognito user pools のサインインが実現できます。

MFA や CAPTCHA 等が必要な場合は、追加の入力要素あるいは追加の画面が必要になるかもしれません。

いずれにせよ、既存の認証画面イメージをそのまま実装できます。

## カスタム認証画面のデメリット

### OIDC エンドポイントの利用不可

Hosted UI は、認可エンドポイント (/oauth2/authorize) や ログインエンドポイント (/login) に、scope、response_type、redirect_uri などのパラメータを付して認証フローを開始します。

このフローの開始には、以前書いた「[Envoy OAuth2 Filter を使ったログイン](/blogs/2022/10/16/envoy-oauth2/)」で Envoy Proxy を使ったように汎用的な実装の利用も可能です。

認証に成功したときのアクセストークン (AccessToken) には認証フローで使った scope 等の値が JWT のペイロードに含まれます。

Hosted UI で提供される OIDC エンドポイントは次の表の通りです。

| エンドポイント名 | エンドポイント |
|:---:|:---:|
| [認可エンドポイント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/authorization-endpoint.html) | /oauth2/authorize |
| [トークンエンドポイント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/token-endpoint.html) | /oauth2/token |
| [UserInfo エンドポイント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/userinfo-endpoint.html) | /oauth2/userInfo |
| [ログインエンドポイント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/login-endpoint.html) | /login |
| [ログアウトエンドポイント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/logout-endpoint.html) | /logout |
| [取り消しエンドポイント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/revocation-endpoint.html) | /oauth2/revoke |

この記事で説明したカスタム認証画面を使った認証フローでは、scope 等を設定できません。

認証成功時のアクセストークンのペイロードの scope には `aws.cognito.signin.user.admin` のみが設定されます。

前述の AWS CLI のレスポンスから得られた AccessToken を [jwt.io](https://jwt.io/) を使って確認したペイロード部を示します。

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

## おわりに 

Hosted UI を利用する場合とカスタム認証画面 (Cognito API による認証フローの利用) のメリットとデメリットは次のとおりです。

| 機能 | Hosted UI | カスタム認証画面 |
|:---:|:---:|:---:|
| OIDC エンドポイントの利用 | 可 | 不可 |
| scope の利用 | 可 | 不可 |
| SAML 等のフェデレーション | 可 | 不可 |
| MFA のサポート | 可 | 可 |
| UI の柔軟性 | 制限有り | 柔軟 |
