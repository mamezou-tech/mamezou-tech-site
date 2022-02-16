---
title: S3 の静的 Web サイトを Envoy でホスティング 
author: shigeki-shoji
date: 2022-02-16
tags: [aws]
---

S3 に静的なコンテンツを配置して公開する場合、よく見られる構成は [CloudFront](https://aws.amazon.com/cloudfront/) とを組み合わせるパターンです。ほとんどの場合、これで問題ありません。しかし、一部のパターン、例えばエンタープライズで利用されるフロントエンドの場合には、VPN を通じたアクセスのみを許可している場合があります。このような場合、世界中の多数のユーザに低レイテンシーな配信を目的としている CloudFront のような CDN が適切とは言い難いものとなります。

こうした場合、Nginx のような HTTP サーバ製品を利用することもできますが、より軽量な [Envoy](https://www.envoyproxy.io/) を利用する例をここでは説明します。

![図](https://github.com/takesection-sandbox/envoyproxy-examples/raw/main/image/static-website-with-envoyproxy.png)

Envoy はとにかく軽量かつ高機能で、そのため Kubernetes 環境ではデータプレーンのサイドカーとして多用されている Proxy です。Envoy 自体は、通常のプロセスとしても、Docker や Pod のようなコンテナとしても実行することができ、そのため [AWS App Mesh](https://aws.amazon.com/app-mesh/) では、同社の Kubernetes 環境である EKS 以外に EC2 や ECS もサポート対象となっています。

# S3 バケットの作成

まず、静的コンテンツを配置するための S3 バケットを作成します。プロダクション環境では、[AWS PrivateLink](https://docs.aws.amazon.com/AmazonS3/latest/userguide/privatelink-interface-endpoints.html) を使って VPC 外から S3 へのアクセスを遮断すべきですが、ここでは簡単に試してみたいため、パブリックアクセスで読み取りを許可するようにします。

例では、バケット名を `example-bucket` として、バケットポリシーは下のようになります。

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Statement1",
            "Effect": "Allow",
            "Principal": "*",
            "Action": [
                "s3:GetObject",
                "s3:GetObjectVersion"
            ],
            "Resource": "arn:aws:s3:::example-bucket/*"
        }
    ]
}
```

作成したバケットに `index.html` をアップロードしておいてください。

確認のため、ブラウザで次の URL にアクセスしてみます。

```url
https://example-bucket.s3.amazonaws.com/index.html
```

`index.html` が表示されることを確認したら、次のステップに進みます。

# Envoy Proxy の定義ファイルの記述

`front-envoy.yaml` というファイルを作成します。

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
                address: example-bucket.s3.amazonaws.com
                port_value: 443
            hostname: example-bucket.s3.amazonaws.com
    transport_socket:
      name: envoy.transport_sockets.tls

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

`example-bucket.s3.amazonaws.com` は作成したバケット名に合わせて修正してください。

ここでのポイントは次のようになります。

1. S3 のエンドポイントの IP アドレスだけでは、バケット名が何かがわからないため、`auto_host_rewrite: true` を設定して、ホスト名が S3 に渡るようにしています。
2. URL のパスが `/` の時に、`/index.html` にリライトするための `regex_rewrite` を設定しています。
3. S3 の IP アドレスが変化することも想定して、`type: LOGICAL_DNS` に設定しています。
4. S3 のエンドポイントは現時点では IPv4 のみと想定されるため、`dns_lookup_family: V4_ONLY` を指定しています。
5. 1 と同じ理由で、`hostname` を設定しています。

# 実行

`docker` でも `nerdctl` でも実行可能です。ここでは、`nerdctl` でのコマンド例ですが、`nerdctl` を `docker` に置き換えれば Docker でも同様に実行可能です。

```shell
nerdctl run -it --rm --name envoy -v `pwd`/front-envoy.yaml:/etc/front-envoy.yaml -p 8080:8080 -p 9901:9901 envoyproxy/envoy:v1.21-latest -c /etc/front-envoy.yaml --service-cluster front-proxy
```

Envoy Proxy が機能しているかを確認するためには、次の URL でできます。

```url
http://localhost:8080/
```

# Envoy Proxy を利用するメリット

Envoy Proxy を利用すると、ここで紹介した静的 Web サイトのホスティングだけでなく、以下のような機能やその他多くの機能を提供することができます。

* OAuth2 や OpenID Connect 等の JWT を使うユーザ認証
* [Open Policy Agent](https://www.openpolicyagent.org/) 等を使った RBAC によるユーザ認可
* A/B テスト、カナリア

最後に、ここで紹介した設定ファイル等が [GitHub リポジトリ](https://github.com/takesection-sandbox/envoyproxy-examples/tree/main/front-proxy-s3) にあります。

# 参考

* [Envoy Docs](https://www.envoyproxy.io/docs/envoy/latest/about_docs)
    * [HTTP route components](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto#config-route-v3-routeaction)
