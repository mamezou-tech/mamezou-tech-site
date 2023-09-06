---
title: 第5回 Open Policy Agent とサイドカーパターンによる認可の実装
author: shigeki-shoji
date: 2022-07-01
tags: [envoy, "openapi-generator", "spring-boot", OPA, "実践マイクロサービス", ZTA, rego]
---

[庄司](https://github.com/edward-mamezou)です。

前回の記事で、「挨拶の音声を生成する」コマンド (以降 Hello コマンドまたは Hello サービスといいます) を完成させました。

この記事では、このコマンドの実行権限チェックに [Open Policy Agent](https://www.openpolicyagent.org/) (OPA) を使って説明します。

![](https://github.com/edward-mamezou/use-openapi-generator/raw/v0.6.0/image/sidecar.png)

図のようにサービスは、3つのコンテナイメージで構成された、docker-compose または [Pod](https://kubernetes.io/ja/docs/concepts/workloads/pods/) です。

:::info:ゼロトラストアーキテクチャ (ZTA)
米国国立標準技術研究所 (NIST) が発行している「[Zero Trust Architecture (NIST SP 800-207)](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-207.pdf)」と、この記事の構成の対応関係は次のようになります。

![ZTA](https://github.com/takesection-sandbox/envoyproxy-examples/raw/main/image/zta.png)
:::

## JWT 認証

OpenID Connect で使用される ID Token は [RFC 7515](https://datatracker.ietf.org/doc/html/rfc7515) で標準化されている JWS (JSON Web Signature) ですが、一般的には JWT と呼ばれているので、この記事中も JWT とします。

JWT は `.` (ドット) で区切られた3つの部分から構成され、ヘッダ (header)、ペイロード (payload)、署名 (signature) をそれぞれ URL Safe な Base64 でエンコードした文字列です。

ヘッダには、署名検証のための暗号化アルゴリズム (alg)、公開鍵を特定するためのキー ID (kid) 等を含んでいます。ペイロードには、トークンの発行者 (iss)、クライアント ID (aud)、有効期限 (exp) などの他に任意の属性値を含められます。

ID Token の検証では、正しい発行者 (iss) とクライアント ID (aud) によるトークンかの判断と有効期限 (exp) 内かを判断し、発行者から取得した公開鍵で署名を検証して改ざんされていない正当なトークンであるかを判断します。

Envoy Proxy の [JWT Authentication](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter) フィルタを使用すると、JWT を検証し、不当な場合 `401 Unauthorized` (デフォルト) をレスポンスします。

妥当な場合、フィルタはペイロード部分をフォワードするリクエストの HTTP Header に追加もできます。Hello コマンドは、HTTP Header へ `payload` の追加を前提にしています。

[サンプル](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.6.0/sidecar/envoy/front-envoy-docker.yaml.example)のフィルタの設定部分は次のとおりです。

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

:::info:2023年1月5日追記
JWKS のエンドポイントから取得される公開鍵は [RFC 7517](https://datatracker.ietf.org/doc/html/rfc7517) で標準化されている JSON 配列フォーマットです。JSON 形式の公開鍵から Java の PublicKey を生成するコードサンプルが RSA のみですが「[OpenID Connect のメモ](https://s-edword.hatenablog.com/entry/2019/11/20/011812)」にあります。
:::


ID Token を必要としない、つまり認証が不要な API はこのフィルタをスキップさせるため、rules でフィルタが必要なパスのプレフィックス (prefix) を設定します。

## External Authorization

この記事で実装した Hello コマンドは、ID Token のペイロードに含まれる `custom:type` が `Human` の場合に実行が許可されます。このポリシー適用に OPA を利用します。

Envoy Proxy の [External Authorization](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter) フィルタを使用して、Envoy Proxy と OPA 間で gRPC/HTTP2 を使って通信する認可処理が可能になります。

Envoy Proxy と OPA 間のインターフェースは [Protocol Buffers](https://developers.google.com/protocol-buffers) (protobuf) で定義されています。インターフェースが一致していれば OPA 以外も使用可能で、Red Hat の [Authorino](https://rheb.hatenablog.com/entry/2022/03/25/%E3%82%AF%E3%83%A9%E3%82%A6%E3%83%89%E3%83%8D%E3%82%A4%E3%83%86%E3%82%A3%E3%83%96%E3%81%AAAPI%E7%AE%A1%E7%90%86%E3%82%92%E5%AE%9F%E7%8F%BE%E3%81%99%E3%82%8BKuadrant%E3%81%A8%E3%81%9D%E3%81%AE%E3%82%B5) はその1つです。

この処理の中で HTTP Header の追加 ("response_headers_to_add") や削除 ("request_headers_to_remove")、呼び出し先のパスの書き換え等も可能です。

ポリシーは [Rego](https://www.openpolicyagent.org/docs/latest/policy-language/) というドメイン固有言語 (DSL) で記述します。

Envoy Proxy から送られてくるリクエストを Rego でアクセスする方法の詳細は、Go 言語のソースコード ([request.go](https://github.com/open-policy-agent/opa-envoy-plugin/blob/main/envoyauth/request.go)) を参照してください。

### 準備

Rego 言語で書いたコードのテストのために、OPA をインストールします。

macOS の場合は Homebrew を使います。

```shell
brew install opa
```

### コード

Hello コードを実行できるのは Human です。次のような[コード](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.6.0/sidecar/opa/example-policy.rego)にしました。

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

[テストコード](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.6.0/sidecar/opa/example-policy-test.rego) は次のとおりです。

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

[サンプル](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.6.0/sidecar/envoy/front-envoy-docker.yaml.example)のフィルタの設定部分は次のとおりです。

```yaml
    - name: envoy.filters.http.ext_authz
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
        transport_api_version: V3
        grpc_service:
          envoy_grpc:
            cluster_name: authz
          timeout: 0.250s
```

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

## Docker Compose の例

Docker Compose は、以前は docker コマンドとは別の docker-compose というコマンドでしたが、今では docker コマンドで run などの代わりに compose をタイプして実行できます。

Docker Compose で実行する場合の [docker-compose.yaml](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.6.0/sidecar/docker-compose.yml) は次のようになりました。

```yaml
version: "3"
services:
  envoy:
    image: envoyproxy/envoy:v1.21-latest
    volumes:
      - ./envoy/front-envoy.yaml:/etc/front-envoy.yaml
    ports:
      - 8081:8081
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

[`sidecar/envoy/front-envoy.yaml`](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.6.0/sidecar/envoy/front-envoy-docker.yaml.example)、[`sidecar/application.yaml`](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.6.0/sidecar/application.yaml.example) ファイルの作成は、利用している OpenID Connect の IdP (Identity Provider) 等の環境に合わせてください。

## Kubernetes の例

この記事では、このサービスの動作が確認できる最低限の説明にとどめます。

Docker Compose の場合と同じく [`sidecar/envoy/front-envoy.yaml`](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.6.0/sidecar/envoy/front-envoy-pod.yaml.example)、[`sidecar/application.yaml`](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.6.0/sidecar/application.yaml.example) ファイルの作成は、利用している OpenID Connect の IdP (Identity Provider) 等の環境に合わせてください。

Kubernetes は Docker よりセキュリティが向上しています。同一 Pod 内のコンテナ間の通信には、ローカル・ループバック・アドレス (127.0.0.1) が使われます。このため `front-envoy.yaml` で設定される Envoy Proxy が Hello サービス (example) や OPA へのアクセスに使用する IP Address は 127.0.0.1 となります。

設定ファイルのサンプルが、Docker Compose 用の [`sidecar/envoy/front-envoy-docker.yaml.example`](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.6.0/sidecar/envoy/front-envoy-docker.yaml.example) と Pod 用の [`sidecar/envoy/front-envoy-pod.yaml.example`](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.6.0/sidecar/envoy/front-envoy-pod.yaml.example) の2つ用意したのはそのためです。

Kubernetes に設定ファイルをマウントするために、次のコマンドで ConfigMap と Secret を作成します。AWS のクレデンシャル、Hello サービスのポリシー、IdP のシークレットが設定されるファイルは ConfigMap ではなく、セキュアな Secret を使用します。

```shell
kubectl create configmap proxy-config --from-file envoy/front-envoy.yaml
kubectl create secret generic aws --from-file ~/.aws/credentials
kubectl create secret generic opa-policy --from-file opa/example-policy.rego --from-file opa/config.yaml
kubectl create secret generic spring-config --from-file application.yaml
```

Pod をデプロイします。

```shell
kubectl apply -f deployment.yaml
```

[deployment.yaml](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.6.0/sidecar/deployment.yaml) は次のとおりです。

```yaml
kind: Deployment
apiVersion: apps/v1
metadata:
  name: example-app
  labels:
    app: example-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: example-app
  template:
    metadata:
      labels:
        app: example-app
    spec:
      containers:
        - name: example
          image: ghcr.io/edward-mamezou/example:v0.6.0
          env:
            - name: AWS_REGION
              value: ap-northeast-1
          volumeMounts:
            - readOnly: true
              mountPath: /home/cnb/.aws
              name: aws
            - readOnly: true
              mountPath: /workspace/config
              name: spring-config
        - name: envoy
          image: envoyproxy/envoy:v1.21-latest
          ports:
            - containerPort: 8081
          volumeMounts:
            - readOnly: true
              mountPath: /config
              name: proxy-config
          args:
            - "-c"
            - "/config/front-envoy.yaml"
            - "--service-cluster"
            - "example-proxy"
        - name: opa
          image: openpolicyagent/opa:latest-envoy
          volumeMounts:
            - readOnly: true
              mountPath: /policy
              name: opa-policy
          args:
            - "run"
            - "--server"
            - "--log-level"
            - "debug"
            - "-c"
            - "/policy/config.yaml"
            - "/policy/example-policy.rego"
      volumes:
        - name: proxy-config
          configMap:
            name: proxy-config
        - name: opa-policy
          secret:
            secretName: opa-policy
        - name: aws
          secret:
            secretName: aws
        - name: spring-config
          secret:
            secretName: spring-config
```

ブラウザからアクセスできるように、port-foward を実行します。

```shell
kubectl port-forward deployment/example-app --address 0.0.0.0 80:8081
```

ブラウザからは、`http://localhost/` 等でアクセスできます。

## 認証認可処理について

伝統的なシステムは認証に集中型の製品が使われ、リバースプロキシを介して HTTP Header にユーザーIDが設定され、サービスそれぞれに独自の認可処理が組み込まれてきました。

これは、侵入者が認証サービスやリバースプロキシを突破しない限り、機密情報にアクセスできない境界モデル (perimeter model) であることを意味しています。プライベートネットワーク内の信頼されたリソースと、インターネット等外部の信頼されないリソースの間に壁を築き、プライベートネットワーク内のシステムは HTTP Header などに設定されたユーザーIDを信頼して認可処理してきました。

認可処理については、早い段階から設計される場合もあれば、ドメインロジックの開発の遅い段階で着手する場合などさまざまでした。

多くの場合、この認可要件はドメインロジックに組み込まれ、認可要件の変更への迅速な対応を困難にしてきました。

これらも要因となり、侵入者がひとたびこのようなプライベートネットワーク内のリソースへの足がかりができれば、すべてのサービスにアクセスできます。

この記事の説明で、認可に OPA を採用し Kubernetes の場合にはポリシーをセキュアな [Secret](https://kubernetes.io/ja/docs/concepts/configuration/secret/) に保存して利用しました。

JWT は署名によって改ざんを検出できます。プライベートネットワークにある各サービスは、JWT によって認証情報を確認し、ドメインロジックと分離された OPA により認可されたアクセスのみを受け入れることで、セキュリティを向上できます。

## まとめ

OpenAPI Generator と Spring Boot を使ってマイクロサービスを構築する場合のさまざまな懸念点、課題の解決策をシリーズを通して説明してきました。

シリーズは、今回のこの記事で一区切りとなります。

これまでの記事を振り返ります。

### [第1回 OpenAPI Generator を使ったコード生成](/blogs/2022/06/04/openapi-generator-1/)

第1回は、OpenAPI Generator とはどういうものかの概要を説明しました。

### [第2回 イベントストーミングとドメイン駆動設計の戦略的設計](/blogs/2022/06/09/openapi-generator-2/)

第2回は、マイクロサービスの設計では欠かせない「ドメイン駆動設計」のためのイベントストーミングを紹介し、ドメイン駆動設計の戦略的設計の概要を説明しました。

### [第3回 OpenAPI Generator 利用時の Generation Gap パターンの適用](/blogs/2022/06/17/openapi-generator-3/)

第3回は、OpenAPI Generator のようなコード生成を活用する場合に重要となる Generation Gap パターンについて説明しました。

### [第4回 ドメイン層の実装とサービスの完成](/blogs/2022/06/24/openapi-generator-4/)

第4回は、ドメイン駆動設計の戦略的設計、戦術的設計を利用して、OpenAPI Generator と Spring Boot でサービスを完成させました。

### 今回

今回の記事で、セキュリティ向上のためドメインに組み込まなかった認証認可をサイドカーパターンで実現し、全体のサービスを完成しました。

この記事のコード全体は [GitHub リポジトリ](https://github.com/edward-mamezou/use-openapi-generator/tree/v0.6.0) にあります。

:::info:2023年1月27日追記
Kubernetes 環境に Keycloak をインストールする場合 Helm チャートが使用できます。また Apple Silicon にも対応しています。詳細なインストール手順は「[Apple Touch ID Keyboard を使ったパスワードレス認証](/blogs/2023/01/16/webauthn-4/)」を参照してください。
:::

## 参考

- [NIST SP 800-63-3 Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
- [NIST SP 800-207 Zero Trust Architecture](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-207.pdf)
- [ゼロトラストネットワーク](https://www.amazon.co.jp/dp/4873118883/)

Keycloak を IdP として実行する場合は、次の記事も参照してください。
- [OpenID Connect でパスワードレス認証を使う](/blogs/2022/06/23/webauthn-3/)
