---
title: Envoy OAuth2 Filter を使ったログイン 
author: shigeki-shoji
date: 2022-10-16
tags: [AWS, "認証/認可", envoy, ZTA]
---

[庄司](https://github.com/edward-mamezou)です。

いくつか Envoy Proxy の JWT Authentication や External Authorization を使った認証や認可の記事を書いてきました。
今回は OAuth2 Filter を使った例を説明します。


あらためて説明すると、[Envoy Proxy](https://www.envoyproxy.io/) は C++ で書かれた軽量かつ高速なプロキシです。

Envoy Proxy は構成を動的に変更でき、ゼロダウンタイムで反映できる特徴を持っています。
Kubernetes 環境のような頻繁にスケールアウト/インするサービスへのルーティングを設定して、個々のサービスの実装に接続先サービスの位置やポートのハードコーディングを不要とする、サービスメッシュパターンなどで多く利用されるコンポーネントです。

## Amazon Cognito User Pool の UI を使用して認証する

次の構成ファイルは [Amazon Cognito User Pool](https://aws.amazon.com/jp/cognito/) でホストされた Web UI を使用したログインの設定例です。

front-envoy.yaml:
```yaml
admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901

static_resources:
  secrets:
    - name: token
      generic_secret:
        secret:
          inline_string: "<Your client secret here>"
    - name: hmac
      generic_secret:
        secret:
          inline_string: "<Your hmac secret here>"
  listeners:
  - address:
      socket_address:
        address: 0.0.0.0
        port_value: 8081
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          '@type': type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          http_filters:
            - name: envoy.filters.http.oauth2
              typed_config:
                '@type': type.googleapis.com/envoy.extensions.filters.http.oauth2.v3.OAuth2
                config:
                  token_endpoint:
                    cluster: oauth
                    uri: "<Your amazon cognito userpools domain here>/oauth2/token"
                    timeout: 10s
                  authorization_endpoint: "<Your amazon cognito userpools domain here>/login"
                  credentials:
                    client_id: "<Your client id here>"
                    token_secret:
                      name: token
                    hmac_secret:
                      name: hmac
                  redirect_uri: "%REQ(x-forwarded-proto)%://%REQ(:authority)%/callback"
                  redirect_path_matcher:
                    path:
                      exact: /callback
                  signout_path:
                    path:
                      exact: /signout
                  forward_bearer_token: true
                  auth_scopes:
                    - openid
                    - email
            - name: envoy.filters.http.lua
              typed_config:
                '@type': type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
                default_source_code:
                  inline_string: |
                    function envoy_on_request(request_handle)
                      headers = request_handle:headers()
                      headers:remove("authorization")
                      path = headers:get(":path"):gsub("/$", "/index.html")
                      headers:replace(":path", path)
                    end
            - name: envoy.filters.http.aws_request_signing
              typed_config:
                '@type': type.googleapis.com/envoy.extensions.filters.http.aws_request_signing.v3.AwsRequestSigning
                service_name: s3
                region: "<Your s3 bucket region here>"
                use_unsigned_payload: true
                host_rewrite: "<Your s3 bucket name here>.s3.<Your s3 bucket region here>.amazonaws.com"
            - name: envoy.filters.http.router
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
          codec_type: AUTO
          stat_prefix: ingress_http
          route_config:
            name: s3_route
            virtual_hosts:
            - name: static_web
              domains:
              - '*'
              routes:
              - match:
                  prefix: /
                route:
                  cluster: s3
  clusters:
  - name: oauth
    type: LOGICAL_DNS
    dns_lookup_family: V4_ONLY
    load_assignment:
      cluster_name: oauth
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: "<Your amazon cognito userpools domain here>"
                    port_value: 443
    transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
        sni: "<Your amazon cognito userpools domain here>"
  - name: s3
    type: LOGICAL_DNS
    dns_lookup_family: V4_ONLY
    load_assignment:
      cluster_name: s3
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: "<Your s3 bucket name here>.s3.<Your s3 bucket region here>.amazonaws.com"
                port_value: 443
    transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
        sni: "<Your s3 bucket name here>.s3.<Your s3 bucket region here>.amazonaws.com"
```

不等号 (`<>`) で囲まれた部分には、次の内容を設定します。

| キー | 説明 |
|---|---|
| Your client secret here | Cognito User Pool の「全般設定」-「アプリクライアント」の詳細で表示される「アプリクライアントのシークレット」 |
| Your hmac secret here | hmac 署名のためのシークレット (任意の値のシークレット) |
| Your amazon cognito userpools domain here | 「アプリの統合」-「ドメイン名」に設定した Cognito でホストする Web UI のドメイン名 |
| Your client id here | 「全般設定」-「アプリクライアント」の「アプリクライアント ID」 |

ここでの例は認証をパスして場合に S3 の静的コンテンツを返すアプリケーションです。

したがって、次のように追加の設定が必要です。

| キー | 説明 |
|---|---|
| Your s3 bucket region here | 静的コンテンツを配置した S3 バケットのリージョン |
| Your s3 bucket name here | 静的コンテンツを配置した S3 バケット名 |

この構成ファイルを使用してコンテナイメージをビルドします。

Dockerfile:
```text
FROM envoyproxy/envoy:v1.23-latest
COPY front-envoy.yaml /etc/envoy/front-envoy.yaml
EXPOSE 8081
EXPOSE 9901
CMD ["envoy", "-c", "/etc/envoy/front-envoy.yaml", "--service-cluster", "front-proxy", "--service-node", "node"]
```

コンテナイメージのビルド手順は次のようになります。

```shell
docker build -t envoy-proxy .
```

実行するためには、AWS_ACCESS_KEY_ID と AWS_SECRET_ACCESS_KEY が必要です。これらの値を環境変数に設定して実行します。

```text
docker run -p 8081:8081 -e AWS_ACCESS_KEY_ID={Your access key here} -e AWS_SECRET_ACCESS_KEY={Your secret access key here} envoy-proxy
```

:::info:Amazon Cognito User Pool 以外で使用する

上述の構成ファイルは、[Okta](https://www.okta.com/) の利用例を説明する「[Protecting web applications via Envoy OAuth2 filter](https://www.jpmorgan.com/technology/technology-blog/protecting-web-applications-via-envoy-oauth2-filter)」の場合とほとんど同じです。

[Okta](https://www.okta.com/)、[Auth0](https://auth0.com/) などさまざまな IDaaS、[Keycloak](https://www.keycloak.org/) など OpenID Connect をサポートしている IdP (Identity Provider) を使用する場合は、ここで説明した構成ファイルをテンプレートとしてわずかな変更で使用可能です。
:::

## OAuth2 Filter を使用した構成

![構成図](/img/blogs/2022/1016_envoy-oauth2.png)

上記のコンテナを実行して、コンテンツにアクセスする場合のシーケンスは図のようになります。

1. ユーザが静的コンテンツにアクセスすると、未ログイン時には、Cognito User Pool の Web UI にリダイレクト
2. ログインが成功すると、[Code Flow](https://openid.net/specs/openid-connect-basic-1_0.html#CodeFlow) にしたがって `/callback` にリダイレクト 
3. Bearer Token (持参人トークン) により認証を確認
4. AWS_ACCESS_TOKEN、AWS_SECRET_ACCESS_KEY を使ったリクエスト署名で S3 にアクセス

:::info:Lua Filter と SigV4 Filter

この記事の例は、バックエンドに S3 を使用するため、URL の最後の文字が '/' の場合にそれを '/index.html' に変更し、また後段で SigV4 署名するため、Bearer Token が設定された Authorization ヘッダを削除するスクリプトを [Lua](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter) で記述しています。

AWS API リクエストを使用する場合、[SigV4](https://docs.aws.amazon.com/ja_jp/general/latest/gr/signature-version-4.html) 署名が必要です。SigV4 署名は、AWS_ACCESS_KEY_ID と AWS_SECRET_ACCESS_KEY が必要です、AWS API リクエストの Authorization ヘッダに設定します。このため、元のリクエストに Authorization ヘッダがあると AWS API リクエストに失敗するため、前述の Lua スクリプトで Authorization ヘッダを削除します。
:::

## OAuth2 Filter により設定される Cookie

認証に成功すると、この例の場合次の Cookie が設定されます。

- OauthHMAC: 署名
- OauthExpires: 有効期限
- BearerToken: AccessToken
- IdToken: ID Token
- RefreshToken: RefreshToken

## OAuth2 Filter と JWT Authentication / External Authorization の使い分け

JWT Authentication は認証フローによって取得された BearerToken や IDToken を検証する場合に使用します。

JSON 等のリクエストを受け取り、JSON 等でレスポンスする API の場合、認証されていない場合に `401 Unauthorized` をクライアントに返す以上のことができません。

このような API で構成されたマイクロサービスのサイドカーでは、[JWT Authentication](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/jwt_authn_filter) と認可のための [OPA](https://www.openpolicyagent.org/) などを利用する [External Authorization](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/ext_authz_filter) が適しています。

一方、OpenID Connect の認証フローの実行はリダイレクト応答等の対応やユーザとの対話のために OAuth2 Filter が必要です。

図で示すと、下のようになります。

![構成図2](/img/blogs/2022/1016_envoy-oauth2-2.png)

JWT Authentication / External Authorization については「[第5回 Open Policy Agent とサイドカーパターンによる認可の実装](https://developer.mamezou-tech.com/blogs/2022/07/01/openapi-generator-5/)」等の過去の記事を参照してください。

## おわりに

この記事のサンプルコードは、[GitHub Repository](https://github.com/takesection-sandbox/envoyproxy-examples/tree/main/front-proxy-login) にあります。

:::info:2023年1月6日追記
[GitHub Repository](https://github.com/takesection-sandbox/envoyproxy-examples/tree/main/front-proxy-login) に Kubernetes 環境にインストールするための Helm チャートを追加しました。
:::

## 参考

- [NIST SP 800-63-3 Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
- [NIST SP 800-207 Zero Trust Architecture](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-207.pdf)
- [基本から理解するJWTとJWT認証の仕組み](/blogs/2022/12/08/jwt-auth/)
- [OpenID Connect のメモ](https://s-edword.hatenablog.com/entry/2019/11/20/011812)
