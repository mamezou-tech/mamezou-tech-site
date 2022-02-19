---
title: Envoy と Open Policy Agent を使用した認可 
author: shigeki-shoji
date: 2022-02-20
tags: [aws]
---

Envoy proxy は API を使って動的に構成すると無停止で設定変更等を行うことができます。このような操作は 通常 Istio や AWS App Mesh のようなコントロールプレーンで行うことになります。

この一連の記事では Envoy proxy 単体の機能を説明するために静的な設定を用いて説明しています。

認証についての[記事](https://developer.mamezou-tech.com/blogs/2022/02/20/envoy-authn/)で OpenID Connect の ID Token の検証について説明しています。

この記事では、下の図のように、さらに認可ができるようにしたいと思います。

![図1](https://github.com/takesection-sandbox/envoyproxy-examples/raw/main/image/jwt-authz.png)

# Envoy proxy の構成

Envoy proxy の定義ファイル (front-envoy.yaml) は次のようになります。

```yaml
static_resources:
  listeners:
  - address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          codec_type: AUTO 
          stat_prefix: ingress_http
          route_config:
            name: s3_route
            virtual_hosts:
            - name: static_web
              domains:
              - "*"
              routes:
              - match:
                  prefix: /
                route:
                  cluster: s3
                  auto_host_rewrite: true
                  regex_rewrite:
                    pattern:
                      google_re2: {}
                      regex: '^(.*)\/$'
                    substitution: '\1/index.html'
          http_filters:
          - name: envoy.filters.http.jwt_authn
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.jwt_authn.v3.JwtAuthentication
              providers:
                amazoncognito:
                  issuer: "https://cognito-idp.<REGION>.amazonaws.com/<POOL ID>"
                  audiences:
                  - "<CLIENT ID>"
                  forward_payload_header: jwt-payload
                  remote_jwks:
                    http_uri:
                      uri: "https://cognito-idp.<REGION>.amazonaws.com/<POOL ID>/.well-known/jwks.json"
                      cluster: jwks
                      timeout: 5s
                    cache_duration: 600s
              rules:
              - match:
                  prefix: /
                requires:
                  provider_name: amazoncognito
          - name: envoy.filters.http.ext_authz
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
              grpc_service:
                envoy_grpc:
                  cluster_name: authz-opa
                timeout: 0.250s
              transport_api_version: V3
          - name: envoy.filters.http.router
  
  clusters:
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
                address: <BUCKET_NAME>.s3.amazonaws.com
                port_value: 443
            hostname: <BUCKET_NAME>.s3.amazonaws.com
    transport_socket:
      name: envoy.transport_sockets.tls
  - name: jwks
    type: LOGICAL_DNS
    dns_lookup_family: V4_ONLY
    load_assignment:
      cluster_name: jwks 
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: cognito-idp.<REGION>.amazonaws.com 
                port_value: 443
    transport_socket:
      name: envoy.transport_sockets.tls
  - name: authz-opa
    type: STRICT_DNS
    typed_extension_protocol_options:
      envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
        "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
        explicit_http_config:
          http2_protocol_options: {}
    load_assignment:
      cluster_name: authz-opa
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: opa-service
                port_value: 9191

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

`<>` で囲んだプレースホルダーにはそれぞれ利用環境に合わせて設定してください。

# Open Policy Agent の構成

認可のために追加したフィルターは、[Open Policy Agent](https://www.openpolicyagent.org/) を利用する [External Authorization](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter) フィルターです。

Open Policy Agent (OPA) は、[Cloud Native Computing Fundation](https://www.cncf.io/) (CNCF) の graduated プロジェクトです。さまざまなポリシーの適用で利用されています。

>Stop using a different policy language, policy model, and policy API for every product and service you use. Use OPA for a unified toolset and framework for policy across the cloud native stack.

>使用する製品やサービスごとに異なるポリシー言語、ポリシーモデル、およびポリシーAPIの使用をやめましょう。クラウドネイティブスタック全体のポリシーの統合ツールセットとフレームワークにOPAを使用してください。

ここで追加したフィルターの定義は次の部分です。

```yaml
- name: envoy.filters.http.ext_authz
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
    grpc_service:
      envoy_grpc:
        cluster_name: authz-opa
      timeout: 0.250s
    transport_api_version: V3
```

OPA は Envoy proxy とは別のコンテナで実行されます。そして、Envoy proxy と OPA とは gRPC による通信を行います。クラスタ定義は次の部分になります。

```yaml
- name: authz-opa
  type: STRICT_DNS
  typed_extension_protocol_options:
    envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
      "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
      explicit_http_config:
        http2_protocol_options: {}
  load_assignment:
    cluster_name: authz-opa
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: opa-service
              port_value: 9191
```

Envoy proxy のコンテナと OPA のコンテナは、コンテナ実行環境内のネットワークを利用するため、DNS 名をサービス名で指定することができます。

このための `docker-compose.yaml` は次のとおりです。

```yaml
version: "3"
services:
  envoy:
    image: envoyproxy/envoy:v1.21-latest
    volumes:
      - ./front-envoy.yaml:/etc/front-envoy.yaml
    ports:
      - 8080:8080
      - 9901:9901
    command: ["-c", "/etc/front-envoy.yaml", "--service-cluster", "front-proxy"]
  opa-service:
    image: openpolicyagent/opa:latest-envoy
    volumes:
      - ./config.yaml:/work/config.yaml
      - ./opa.rego:/work/opa.rego
    command: ["run", "--server", "--log-level", "debug", "-c", "/work/config.yaml", "/work/opa.rego"]
```

OPA の構成ファイル (`config.yaml`) も必要です。これは次のとおりです。

```yaml
plugins:
  envoy_ext_authz_grpc:
    addr: :9191

decision_logs:
  console: true
```

## ポリシー

OPA はデータとポリシーを分離しています。ポリシーは [Rego](https://www.openpolicyagent.org/docs/latest/policy-language/) と呼ばれるドメイン固有言語 (DSL) で定義します。この記事では、`/index.html` へのリクエストのみを許可し、それ以外の場合は `403 Forbidden` のレスポンスを返すように定義します。また、`/index.html` へのアクセスの場合には、JWT 認証トークンの `cognito:username` をヘッダに追加するようにしています。ファイル `opa.rego` は次のとおりです。

```rego
package envoy.authz

import input.attributes.request.http as http_request

default allow = false

name = name {
    jwt_payload := http_request.headers["jwt-payload"]
    payload := json.unmarshal(base64url.decode(jwt_payload))
    name := payload["cognito:username"]
}

allow = response {
    http_request.method == "GET"
    http_request.path == "/index.html"
    response := {
        "allowed": true,
        "headers": {
            "x-jwt-name": name
        }
    } 
}
```

# 実行

この設定による動作シーケンスの概要は図のようになります。正確に書く場合は、図中の `jwks.json` の取得は実際には非同期に実行されキャッシュされることに注意してください。

![図2](https://github.com/takesection-sandbox/envoyproxy-examples/raw/main/image/opa.png)


以上のように定義した構成は、nerdctl または docker-compose で起動することができます。

```shell
nerdctl compose up
```

ここで説明した設定ファイル等は [GitHub リポジトリ](https://github.com/takesection-sandbox/envoyproxy-examples/tree/main/front-proxy-opa)にあります。

# 参考

* [S3 の静的 Web サイトを Envoy でホスティング](https://developer.mamezou-tech.com/blogs/2022/02/16/hosting-a-static-website-using-s3-with-envoy/)
* [Envoy を使用して ID Token (OIDC) を検証する](https://developer.mamezou-tech.com/blogs/2022/02/20/envoy-authn/)
* [Envoy Docs](https://www.envoyproxy.io/docs.html)
    * [JWT Authentication](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter)
    * [External Authorization](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/ext_authz_filter.html)
* [Open Policy Agent Docs](https://www.openpolicyagent.org/docs/latest/policy-reference/)
    * [ENVOY](https://www.openpolicyagent.org/docs/latest/envoy-introduction/)
