---
title: OpenAPI Generator を使って Spring Boot アプリを作る (5)
author: shigeki-shoji
date: 2022-07-01
tags: [envoy, "openapi-generator", "spring-boot", OPA]
---

前回の記事で、「挨拶の音声を生成する」コマンド (以降 Hello コマンドといいます) を完成させました。

この記事では、このコマンドの実行権限チェックに [Open Policy Agent](https://www.openpolicyagent.org/) (OPA) を使って説明します。

![](https://github.com/edward-mamezou/use-openapi-generator/raw/feature/openapi-generator-6/image/sidecar.png)

図のようにサービスは、3つのコンテナイメージで構成された、docker-compose または [Pod](https://kubernetes.io/ja/docs/concepts/workloads/pods/pod-overview/) です。

## JWT 認証

OpenID Connect で使用される ID Token は [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519) で標準化されている JWT (JSON Web Tokens) です。

JWT は `.` (ドット) で区切られた3つの部分から構成され、ヘッダ (header)、ペイロード (payload)、署名 (signature) をそれぞれ URL Safe な Base64 でエンコードした文字列です。

ヘッダには、署名検証のための暗号化アルゴリズム (alg)、公開鍵を特定するためのキー ID (kid) 等を含んでいます。ペイロードには、トークンの発行者 (iss)、クライアント ID (aud)、有効期限 (exp) などの他に任意の属性値を含められます。

ID Token の検証では、正しい発行者 (iss) とクライアント ID (aud) によるトークンかの判断と有効期限 (exp) 内かを判断し、発行者から取得した公開鍵で署名を検証して改ざんされていない正当なトークンであることを判断します。

Envoy Proxy の [JWT Authentication](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter) フィルタを使用すると、JWT を検証し、不当な場合 `401 Unauthorized` (デフォルト) をレスポンスします。

妥当な場合、フィルタはペイロード部分を HTTP Header に追加もできます。Hello コマンドは、HTTP Header の `payload` の追加を前提にしています。

Envoy Proxy [設定ファイルサンプル](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-6/sidecar/envoy/front-envoy-authn-authz.yaml.example)のフィルタの設定部分は次のとおりです。

```yaml
    - name: envoy.filters.http.jwt_authn
    typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.http.jwt_authn.v3.JwtAuthentication
        providers:
        keycloak:
            issuer: "https://keycloak.example.com/auth/realms/passengers"
            audiences:
            - "hibernation-pod"
            forward_payload_header: payload
            remote_jwks:
                http_uri:
                    uri: "https://keycloak.example.com/auth/realms/passengers/protocol/openid-connect/certs"
                    cluster: jwks
                    timeout: 5s
            cache_duration: 600s
        rules:
        - match:
            prefix: /example/hibernation-pod
            requires:
            provider_name: keycloak
```

発行者 (iss) を issuer に設定し、クライアント ID (aud) を audiences に設定します。また、公開鍵取得のためにアクセスする URI を remote_jwks の http_uri に設定します。

ID Token を必要としない、つまり認証が不要な API はこのフィルタをスキップさせるため、rules でフィルタが必要なパスのプレフィックス (prefix) を設定します。

## External Authorization

この記事で実装した Hello コマンドは、ID Token のペイロードに含まれる `custom:type` が `Human` の場合に実行が許可されます。このポリシー適用に OPA を利用します。

Envoy Proxy の [External Authorization](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter) フィルタを使用して、Envoy Proxy と OPA 間で gRPC/HTTP2 を使って通信する認可処理が可能になります。

Envoy Proxy と OPA 間のインターフェースは [Protocol Buffers](https://developers.google.com/protocol-buffers) (protobuf) で定義されています。インターフェースが一致していれば OPA 以外も使用可能で、Red Hat の [Authorino](https://rheb.hatenablog.com/entry/2022/03/25/%E3%82%AF%E3%83%A9%E3%82%A6%E3%83%89%E3%83%8D%E3%82%A4%E3%83%86%E3%82%A3%E3%83%96%E3%81%AAAPI%E7%AE%A1%E7%90%86%E3%82%92%E5%AE%9F%E7%8F%BE%E3%81%99%E3%82%8BKuadrant%E3%81%A8%E3%81%9D%E3%81%AE%E3%82%B5) はその1つです。

この処理の中で HTTP Header の追加 ("response_headers_to_add") や削除 ("request_headers_to_remove")、呼び出し先のパスの書き換え等も可能です。

ポリシーは [Rego](https://www.openpolicyagent.org/docs/latest/policy-language/) というドメイン固有言語 (DSL) で記述します。

Envoy Proxy から送られてくるリクエストを Rego の中のアクセス方法の詳細は、Go 言語のソースコード ([request.go](https://github.com/open-policy-agent/opa-envoy-plugin/blob/main/envoyauth/request.go)) を参照してください。

### 準備

Rego 言語で書いたコードのテストのために、OPA をインストールします。

macOS の場合は Homebrew を使います。

```shell
brew install opa
```

### コード

Hello コードを実行できるのは Human です。次のような[コード](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-6/sidecar/opa/example-policy.rego)にしました。

```text
package envoy.authz

import input.attributes.request.http as http_request

default allow = false

payload := payload {
    jwt_payload := http_request.headers["payload"]
    payload := json.unmarshal(base64url.decode(jwt_payload))
}

allow := action_allowed {
    re_match("^\/example\/hibernation-pod\/.*\/hello.*$", http_request.path)
    payload["custom:type"] == "Human"
    action_allowed := {
        "allowed": true
    }
}
```

[テストコード](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-6/sidecar/opa/example-policy-test.rego) は次のとおりです。

```text
package envoy.authz

test_post_allowed {
    allow with input as { "attributes": {
        "request": {
            "http": {
                "path": "/example/hibernation-pod/id-001/hello",
                "headers": {
                    "payload": "eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0IiwiY3VzdG9tOmZpcnN0bmFtZSI6IkphbWVzIiwiYXVkIjoiQVBQQ0xJRU5USUQiLCJleHAiOjE2NTQ3NTg3NTcsImN1c3RvbTp0eXBlIjoiSHVtYW4ifQ==" }
                }
            }
        }
    }
}
```

カレントディレクトリを `sidecar/opa` にして `opa test . -v` コマンドでテストします。

```shell
opa test . -v
example-policy-test.rego:
data.envoy.authz.test_post_allowed: PASS (6.21519ms)
--------------------------------------------------------------------------------
PASS: 1/1
```

:::info
OPA の Rego で、パスを変えたい場合、レスポンスの `headers` の `:path` にパスを設定します。

```text
{
    "allowed": true,
    "headers": {
        ":path": "/index.html"
    }
}
```

削除したい Header がある場合は次のようなレスポンスを返します。

```text
{
    "allowed": true,
    "request_headers_to_remove": ["payload"]
}
```

- [envoy-v3-api-msg-extensions-filters-http-ext-authz-v3-extauthz](https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ext_authz/v3/ext_authz.proto#envoy-v3-api-msg-extensions-filters-http-ext-authz-v3-extauthz)
- [response.go](https://github.com/open-policy-agent/opa-envoy-plugin/blob/main/envoyauth/response.go)
:::

## コンテナビルド

Spring Boot は、Gradle の場合には `bootBuildImage` を実行してコンテナイメージをビルドできます。

:::info
Maven を使っている場合は、`spring-boot:build-image` でコンテナイメージをビルドできます。
詳しくは「[Spring Boot Docker](https://spring.io/guides/topicals/spring-boot-docker/)」を参照してください。
:::

```shell
./gradlew bootBuildImage --imageName=example
```

GitHub Actions を使ってビルドしたイメージが [GitHub Packages](https://github.com/edward-mamezou/use-openapi-generator/pkgs/container/example) にあります。

## docker-compose の例

Docker Compose で実行する場合の [docker-compose.yaml](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-6/sidecar/docker-compose.yml) は次のようになりました。

```yaml
version: "3"
services:
  envoy:
    image: envoyproxy/envoy:v1.21-latest
    volumes:
      - ./envoy/front-envoy.yaml:/etc/front-envoy.yaml
    ports:
      - 8080:8080
    command: ["-c", "/etc/front-envoy.yaml", "--service-cluster", "front-proxy"]
  opa:
    image: openpolicyagent/opa:latest-envoy
    volumes:
      - ./opa/config.yaml:/work/config.yaml
      - ./opa/example-policy.rego:/work/example-policy.rego
    command: ["run", "--server", "--log-level", "debug", "-c", "/work/config.yaml", "/work/example-policy.rego"]
  example:
    image: ghcr.io/edward-mamezou/example:v0.6.0
    volumes:
      - ~/.aws:/home/cnb/.aws
      - ./application.yaml:/workspace/application.yaml
      - ./tmp:/tmp
    environment:
      AWS_REGION: ap-northeast-1
```

## kubernetest の例

## まとめ

## 過去の記事

- [OpenAPI Generator を使って Spring Boot アプリを作る](/blogs/2022/06/04/openapi-generator-1/)
- [OpenAPI Generator を使って Spring Boot アプリを作る (2)](/blogs/2022/06/09/openapi-generator-2/)
- [OpenAPI Generator を使って Spring Boot アプリを作る (3)](/blogs/2022/06/17/openapi-generator-3/)
- [OpenAPI Generator を使って Spring Boot アプリを作る (4)](/blogs/2022/06/24/openapi-generator-4/)
