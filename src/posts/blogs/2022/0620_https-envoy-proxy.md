---
title: Envoy Proxy による HTTPS Proxy
author: shigeki-shoji
date: 2022-06-20
tags: [envoy, keycloak, ZTA]
---

「[WebAuthn でパスワードの無い世界へ](https://developer.mamezou-tech.com/blogs/2022/06/15/webauthn-1/)」の記事では、[AWS Fargate](https://aws.amazon.com/jp/fargate/) を使って [Keycloak](https://www.keycloak.org/) を起動してデモンストレーション環境を構築しました。

記事で説明した環境は、Keycloak のための AWS Fargate 以外に、ロードバランサ ([ALB](https://aws.amazon.com/jp/elasticloadbalancing/)) など時間課金のリソースも含んでいました。

この記事では「[S3 の静的 Web サイトをセキュアに Envoy でホスティング](https://developer.mamezou-tech.com/blogs/2022/03/26/hosting-a-static-website-using-s3-with-envoy-2/)」などの記事で取り上げた [Envoy Proxy](https://www.envoyproxy.io/) を HTTPS Proxy として使用し AWS リソースの利用は [Route 53](https://aws.amazon.com/jp/route53/) だけで、プライベートネットワーク上に HTTPS でアクセスする Keycloak 環境を構築します。 

![](https://github.com/edward-mamezou/hibernation-pod/raw/feature/v0.3.0/image/privateip.png)

## 証明書

無料の証明書という点では、自己署名証明書 (Self-signed Certificate、いわゆるオレオレ証明書) もありますが、この記事では [Let's Encrypt](https://letsencrypt.org/ja/) で証明書を作成します。

### 準備

Let's Encrypt で証明書を作成するために [certbot](https://certbot.eff.org/) をインストールして使用します。残念ながら Windows で動作する certbot は無いようです。著者は macOS を利用しました。[Homebrew](https://brew.sh/index_ja) を使って次のコマンドでインストールできます。

```shell
brew install certbot
```

### 証明書の作成

外部つまりインターネットからのアクセスを許可せずに証明書を作成するため、次のコマンドを使用します。

```shell
sudo certbot certonly --manual --preferred-challenges dns
```

```text
Please enter in your domain name(s) (comma and/or space separated)  (Enter 'c'
 to cancel):
```

と聞かれるので、所有するドメイン名を入力します。このときワイルドカードを利用すると便利です。所有するドメイン名が `example.com` だとすると、ワイルドカードを使った入力は `*.example.com` となります。

ドメイン名の所有を確認するために、DNS (Route 53) にレコードの追加を求めるメッセージが表示されます。

指示に従って Route 53 に TXT レコードを追加します。

```text
_acme-challenge.example.com TXT "<表示された値>"
```

このテキストレコードが認識されるまでに少し時間がかかるかもしれません、数分待って Enter キーを押します。

成功すると、`/etc/letsencrypt/live/` にドメイン名のディレクトリが作成され、そのディレクトリに証明書が生成されます。`example.com` の場合であれば `/etc/letsencrypt/live/example.com` ディレクトリに証明書が生成されます。

## Docker Compose による起動

Envoy Proxy と Keycloak の2つのコンテナを起動するため、次の [`docker-compose.yml`](https://github.com/edward-mamezou/hibernation-pod/blob/feature/v0.3.0/keycloak/docker-compose.yml) ファイルを作成しました。

```yaml
version: "3"
services:
  envoy:
    image: envoyproxy/envoy:v1.21-latest
    volumes:
      - ./front-envoy.yaml:/etc/front-envoy.yaml
      - ./certs:/etc/envoy/certs
    ports:
      - 443:443
      - 9901:9901
    command: ["-c", "/etc/front-envoy.yaml", "--service-cluster", "front-proxy"]
  keycloak:
    image: jboss/keycloak
    environment:
      KEYCLOAK_USER: admin
      KEYCLOAK_PASSWORD: password
      PROXY_ADDRESS_FORWARDING: true
```

`/etc/letsencrypt/live/example.com/` ディレクトリに生成されたファイルは `docker-compose.yml` ファイルがあるディレクトリに `certs` ディレクトリを作成してコピーしてください。

`docker-compose.yml` ファイルがあるディレクトリに [`front-envoy.yaml`](https://github.com/edward-mamezou/hibernation-pod/blob/feature/v0.3.0/keycloak/front-envoy.yaml) ファイルも作成しました。

```yaml
admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901

static_resources:
  listeners:
    - address:
        socket_address:
          address: 0.0.0.0
          port_value: 443
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                '@type': type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                codec_type: AUTO
                stat_prefix: ingress_http
                route_config:
                  name: auth_route
                  virtual_hosts:
                    - name: keycloak
                      domains:
                        - '*'
                      routes:
                        - match:
                            prefix: /
                          route:
                            cluster: keycloak
                http_filters:
                  - name: envoy.filters.http.router
          transport_socket:
            name: envoy.transport_sockets.tls
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
              common_tls_context:
                tls_certificates:
                  - certificate_chain:
                      filename: "/etc/envoy/certs/fullchain.pem"
                    private_key:
                      filename: "/etc/envoy/certs/privkey.pem"
                validation_context:
                  trusted_ca:
                    filename: "/etc/envoy/certs/cert.pem"

  clusters:
    - name: keycloak
      type: LOGICAL_DNS
      load_assignment:
        cluster_name: keycloak
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: keycloak
                      port_value: 8080
```

上記の設定で、外部からのアクセスを HTTPS で受ける [listeners](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/listener/v3/listener.proto#config-listener-v3-listener) 設定のポイントは次のとおりです。

- [socket_address](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/address.proto#envoy-v3-api-msg-config-core-v3-socketaddress) で `port_value: 443` を設定します。
- [filter_chains](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/listener/v3/listener_components.proto#envoy-v3-api-msg-config-listener-v3-filterchain) で `transport_socket` を設定して、証明書ファイルパスを設定します。

### 起動

起動は `docker-compose up -d` です。停止は `docker-compose down` です。

## DNS レコードの登録

Route 53 に Keycloak を起動する PC の IP アドレスの A レコードを作成します。例えば、PC の IP アドレスが `192.168.1.2` の場合 `keycloak.example.com` でアクセスするようにしたい場合は次の通りです。

```text
keycloak.example.com A 192.168.1.2
```

Route 53 へのレコードの登録の反映には少し時間がかかるかもしれません。数分待って、iPad 等の Safari で上の例の場合では `https://keycloak.example.com/auth` にアクセスしてください。Keycloak の Welcome 画面が表示されます。

:::info
Keycloak へのアクセスで使用する端末に PC を使う場合は、ここで説明したような DNS レコードではなく `/etc/hosts` ファイルの使用も可能です。この記事では iPad、iPhone、Android 等の `/etc/hosts` ファイルの編集ができない/困難な端末の使用を想定しているため、Route 53 にレコードを追加しています。
:::

## まとめ

プライベートネットワークに HTTPS で提供するアプリケーションは、証明書として自己署名証明書を利用する方法、プロキシを使用せずアプリケーション自体に証明書をインストールする方法、プロキシに Nginx や HAProxy 等を利用する方法など、多くの選択肢があります。この記事では、証明書に Let's Encrypt を使い、プロキシに Envoy Proxy を利用する方法を説明しました。

この記事で説明した方法を使えば、Keycloak を任意の Web アプリケーションに代えて HTTPS アクセスに対応させることができ、特に開発中や試行中に AWS などのクラウドにかかるコストを抑制することが可能になります。

この記事で説明した `docker-compose.yml` などのコードの全体は [GitHub リポジトリ](https://github.com/edward-mamezou/hibernation-pod/tree/feature/v0.3.0/keycloak) にあります。

:::info:2023年1月5日追記
Kubernetes 環境に Keycloak をインストールする場合 Helm チャートが使用できます。また Apple Silicon にも対応しています。詳細なインストール手順は「[KeycloakのSAML2 IdPをAmazon Cognito user poolsと連携する](https://s-edword.hatenablog.com/entry/2023/01/04/112949)」を参照してください。
:::
