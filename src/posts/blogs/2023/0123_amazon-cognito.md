---
title: Amazon Cognito user pools の認証フロー
author: shigeki-shoji
date: 2023-01-23
tags: [AWS, "認証/認可"]
---

[庄司](https://github.com/edward-mamezou)です。

[Amazon Cognito user pools](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/cognito-user-identity-pools.html) は Web やモバイルアプリケーションの認証、認可、およびユーザ管理機能を提供する Amazon Cognito のユーザディレクトリサービスです。

Cognito user pools を使用するといわゆる JWT 認証に利用できる AccessToken、IdToken などを得られます。

Cognito user pools を利用する目的は、大きく次の2つがあるでしょう。

1. OpenID Connect (または OAuth2) の認証フローを使用する OP (OpenID Provider) としての活用。
2. JWT 認証のトークンが得られるユーザディレクトリとしての利用。

## OpenID Provider としての活用

Cognito user pools を OP として利用する Hosted UI では次の OIDC エンドポイントが提供されています。

| エンドポイント名 | エンドポイント |
|:---:|:---:|
| [認可エンドポイント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/authorization-endpoint.html) | /oauth2/authorize |
| [トークンエンドポイント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/token-endpoint.html) | /oauth2/token |
| [UserInfo エンドポイント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/userinfo-endpoint.html) | /oauth2/userInfo |
| [ログインエンドポイント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/login-endpoint.html) | /login |
| [ログアウトエンドポイント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/logout-endpoint.html) | /logout |
| [取り消しエンドポイント](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/revocation-endpoint.html) | /oauth2/revoke |

これらのエンドポイントを使用することで、[Authorization Code Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowSteps)、[Implicit Flow](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitFlowSteps) のような標準化された認証フローを利用できます。

この標準化された認証フローに SAML やソーシャルネットワーク等の外部認証プロバイダと連携させる「フェデレーション」機能の利用が可能です。

:::info
標準化された認証フローを使用する利点のひとつは「[Envoy OAuth2 Filter を使ったログイン](/blogs/2022/10/16/envoy-oauth2/)」にあるような汎用的な実装を活用できることです。これにより実装にかかる工数やメンテナンスコストを低減できます。
:::

## JWT 認証のトークンが得られるユーザディレクトリとしての利用

JWT 認証は、マイクロサービスなどのバックエンドだけでなく、Kubernetes コントロールプレーン、GitHub Actions、GitLab CI/CD、CircleCI などさまざまなところで活用されています。

例えば、GitHub Actions の場合、GitHub ID プロバイダの getIDToken エンドポイントにリクエストすることで JWT 認証のための IdToken が取得できます。

Cognito user pools の場合も API を使用して AccessToken や IdToken が取得できます。

例えば、フロントエンドの Web / モバイル開発者が AWS でフルスタックアプリケーションを簡単に構築、デプロイ、ホストするための AWS Amplify がありますが、Amplify では、開発者が独自に作成した認証 UI を使った Cognito user pools のサインインを可能にするため Cognito user pools API を使用する SDK が提供されています。詳細は公式ドキュメントの「[Switching authentication flows](https://docs.amplify.aws/lib/auth/switch-auth/q/platform/js/)」で解説されています。

Cognito user pools の API は、クライアントサイドでは [InitiateAuth](https://docs.aws.amazon.com/ja_jp/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html) と [RespondToAuthChallenge](https://docs.aws.amazon.com/ja_jp/cognito-user-identity-pools/latest/APIReference/API_RespondToAuthChallenge.html)、サーバサイドでは [AdminInitiateAuth](https://docs.aws.amazon.com/ja_jp/cognito-user-identity-pools/latest/APIReference/API_AdminInitiateAuth.html) と [AdminRespondToAuthChallenge](https://docs.aws.amazon.com/ja_jp/cognito-user-identity-pools/latest/APIReference/API_AdminRespondToAuthChallenge.html) を使用して認証フローを回します。

Cognito user pools の API の実行と UI に密接な関係はないため、API による認証フローのための UI は自由にデザインできます。

Cognito user pools の Hosted UI のカスタマイズの範囲を超える UI が要件の場合は、API を利用して実現できます。

ただし、いくつか注意すべきこともあります。

- SAML や外部認証プロバイダと連携する「フェデレーション」機能は使用できない。
- OpenID Connect、OAuth2 の仕様にある scope を利用できない。

### Cognito user pools API を使ったトークン

注意点として挙げた scope を利用できないことを具体的に示します。

Hosted UI の認可エンドポイントのリクエストの scope パラメータに openid、email と profile を指定して取得した AccessToken と Cognito user pools API で取得した AccessToken を比較します。

AccessToken は [jwt.io](https://jwt.io/) を使って PAYLOAD を取得し、一部を "*" でマスクしています。

Hosted UI で取得した AccessToken の PAYLOAD は次のとおりです。

```json
{
  "sub": "********-****-4be0-8ebb-************",
  "iss": "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_*********",
  "version": 2,
  "client_id": "****5on****pqg3d08efb0****",
  "event_id": "01cada08-33e4-49a0-855d-************",
  "token_use": "access",
  "scope": "openid profile email",
  "auth_time": 1674403080,
  "exp": 1674406680,
  "iat": 1674403080,
  "jti": "749e803e-699f-4774-94f6-8b48b344a0ad",
  "username": "test1"
}
```

AWS CLI を使って Cognito user pools API を実行できます。

```shell
aws cognito-idp admin-initiate-auth \
  --user-pool-id <ユーザプールID> \
  --client-id <アプリクライアントID> \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters '{ "USERNAME": "<ユーザ名>", "PASSWORD": "<パスワード>" }'
```

認証に成功すると AccessToken、IdToken 等を含むレスポンスが返されます。

Cognito user pools API で取得した AccessToken の PAYLOAD は次のとおりです。

```json
{
  "sub": "********-****-4be0-8ebb-************",
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

Cognito user pools API を使った後者の scope は `aws.cognito.signin.user.admin` が設定されています。

OAuth2 仕様によると OAuth2 スコープは AccessToken に付与するアクセス権の範囲を制限する手段です。

## おわりに

Amazon Cognito user pools を採用する場合には、OpenID Connect (OAuth2) の認証フローの利用が目的なのか、単に JWT 認証のためのユーザディレクトリとしての利用が目的なのかを明確にすることをお勧めします。

例えば Hosted UI のカスタマイズの範囲を超える UI が必要だが、OpenID Connect の標準化された認証フローや OAuth2 スコープによるアクセス権の範囲を制限したい場合、SAML 等の外部認証プロバイダとの連携が必要な場合には、Cognito user pools 以外の認証プロダクトの検討が必要になります。
