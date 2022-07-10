---
title: Envoy を使用して ID Token (OIDC) を検証する 
author: shigeki-shoji
date: 2022-02-20
tags: [AWS, "認証/認可", envoy, ZTA]
---

Envoy proxy は API を使って動的に構成すると無停止で設定変更等を行うことができます。このような操作は 通常 Istio や AWS App Mesh のようなコントロールプレーンで行うことになります。

この一連の記事では Envoy proxy 単体の機能を説明するために静的な設定を用いて説明しています。

以前構築した S3 にアクセスする [Envoy proxy](https://developer.mamezou-tech.com/blogs/2022/02/16/hosting-a-static-website-using-s3-with-envoy/) を拡張して、Amazon Cognito Userpool で認証されたユーザのみがこの静的コンテンツにアクセスできるようにしたいと思います。

![図1](https://github.com/takesection-sandbox/envoyproxy-examples/raw/main/image/jwt-authn.png)

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

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

`<>` で囲んだプレースホルダーにはそれぞれ利用環境に合わせて設定してください。

OpenID Connect の ID Token を検証するために [JWT Authentication](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter) フィルターを追加しています。該当部分は次のとおりです。

```yaml
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
```

Envoy proxy の実装では、[OpenID Connect Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html#toc) を経由した JSON Web Key (JWK) の取得はできません。そのため、`remote_jwks` にキー取得の URI を設定する必要があります。

これに対応して、JSON Web Key を取得するクラスタ設定も必要になります。

```yaml
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
```

# 実行

以上の構成を、次のコマンド (nerdctl または docker) で起動することができます。

```shell
nerdctl run -it --rm --name envoy -v `pwd`/front-envoy.yaml:/etc/front-envoy.yaml -p 8080:8080 -p 9901:9901 envoyproxy/envoy:v1.21-latest -c /etc/front-envoy.yaml --service-cluster front-proxy
```

この設定による動作シーケンスの概要は図のようになります。正確に書く場合は、図中の `jwks.json` の取得は実際には非同期に実行されキャッシュされることに注意してください。

![図2](https://github.com/takesection-sandbox/envoyproxy-examples/raw/main/image/jwt.png)

# まとめ

ここまで説明したとおり、ノーコードで静的コンテンツに対する認証機能の追加ができました。静的コンテンツに限らず、既存の認証機能を持たない API サーバに認証機能を追加する場合も同様の方法で追加することができます。

ここで説明した設定ファイル等は [GitHub リポジトリ](https://github.com/takesection-sandbox/envoyproxy-examples/tree/main/front-proxy-jwt)にあります。

# 参考

* [S3 の静的 Web サイトを Envoy でホスティング](https://developer.mamezou-tech.com/blogs/2022/02/16/hosting-a-static-website-using-s3-with-envoy/)
* [Envoy と Open Policy Agent を使用した認可](https://developer.mamezou-tech.com/blogs/2022/02/20/envoy-authz/)
* [Envoy Docs](https://www.envoyproxy.io/docs.html)
    * [JWT Authentication](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter)
