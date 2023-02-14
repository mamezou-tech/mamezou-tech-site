---
title: OpenID Connect でパスワードレス認証を使う
author: shigeki-shoji
date: 2022-06-23
tags: [AWS, "認証/認可", keycloak, OIDC, java]
---

「[WebAuthn でパスワードの無い世界へ](/blogs/2022/06/15/webauthn-1/)」に続く「[Envoy Proxy による HTTPS Proxy](/blogs/2022/06/20/https-envoy-proxy/)」の記事でプライベートネット内にパスワードレス認証ができる環境構築の方法を説明しました。この記事では、OpenID Connect の [Code Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth) を使ってパスワードレス認証を説明します。

## サービスの概要

題材は宇宙船の冬眠ポッド (hibernation pod) です。冬眠ポッド毎にログインする URL は違いますが間違いやすいため、認証画面にアクセスする QRコード[^1] を冬眠ポッドのディスプレイに表示しています。

![](https://github.com/edward-mamezou/use-openapi-generator/raw/2023-02-03/image/index.png)

iPhone 等のカメラを通して QRコード のリンクをブラウザで開くと Keycloak の認証画面が表示されます。認証されると、iPhone 等のブラウザに、OpenID Connect の ID トークンとポッド ID が表示されます。

## Keycloak の設定

:::info
Kubernetes 環境で動作する「[Apple Touch ID Keyboard を使ったパスワードレス認証](/blogs/2023/01/16/webauthn-4/)」に書いた手順を使った場合も設定は失われません。
この手順を使用して構成した場合は「[クライアントの作成](#クライアントの作成)」までスキップしてください。
:::

前回の記事「[Envoy Proxy による HTTPS Proxy](/blogs/2022/06/20/https-envoy-proxy/)」では説明しませんでしが、Keycloak はデフォルトで [h2](https://www.h2database.com/html/main.html) データベースを使用します。データが保存されるディレクトリは、コンテナ内の `/opt/keycloak/data` です。このディレクトリにローカルストレージを割り当てることで保持するデータの永続化が可能になります。[`docker-compose.yml`](https://github.com/edward-mamezou/use-openapi-generator/blob/2023-02-03/keycloak/docker-compose.yml) ファイルは次の通りです。

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
    image: quay.io/keycloak/keycloak
    volumes:
      - ./datadir:/opt/keycloak/data
    command:
      - start
      - --proxy=edge
      - --hostname-strict=false
      - --http-relative-path
      - auth
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: password
      PROXY_ADDRESS_FORWARDING: true
```

### パスワードレス認証のレルム設定

パスワードレスの認証を有効にする手順は、前の記事「[WebAuthn でパスワードの無い世界へ](/blogs/2022/06/15/webauthn-1/)」を参照してください。

### クライアントの作成

サービスが使用するクライアントを作成します。「Clients」をクリックして、「Create」ボタンをクリックします。

![](https://github.com/edward-mamezou/use-openapi-generator/raw/2023-02-03/image/oidc-1.png)

Client ID に `hibernation-pod` と入力して「Save」ボタンをクリックします。

### Settings

- `Access Type` を `public` から `confidential` に変更します。
- `Implicit Flow Enabled` は、最初は `ON` にしておくとテストしやすいと思います。この記事では `OFF` のままで問題ありません。
- `Valid Redirect URIs` は、`http://localhost:8080/example/callback` と PC のホスト名、例えば `mymac` という名前であれば `http://mymac.local:8080/example/callback` を設定します。

![](https://github.com/edward-mamezou/use-openapi-generator/raw/2023-02-03/image/oidc-2.png)

入力したら「Save」ボタンをクリックします。

### Credentials

Credentials のタブを選択します。

![](https://github.com/edward-mamezou/use-openapi-generator/raw/2023-02-03/image/oidc-3.png)

表示された `Secret` の値を記録しておいてください。サービスの設定ファイルで使用します。

### Mappers

ID トークン等の JWT のペイロードには独自の属性を追加できます。この記事で構築しようとしている認証サービスは、宇宙船の冬眠ポッドが開いた時にコマンドを実行する別の記事「[第2回 イベントストーミングとドメイン駆動設計の戦略的設計](/blogs/2022/06/09/openapi-generator-2/)」の要素の1つです。そのため、`custom:firstname` と `custom:type` を ID トークンに含められるようマッピングを作成します。

「Mappers」タブを選択して、「Create」ボタンをクリックします。

- `Name` フィールドに `First Name` と入力します。
- `Mapper Type` に `User Attribute` を選択します。
- `User Attribute` に `firstname` と入力します。
- `Token Claim Name` に `custom:firstname` と入力します。
- `Claim JSON Type` は `String` を選択します。

![](https://github.com/edward-mamezou/use-openapi-generator/raw/2023-02-03/image/oidc-4.png)

「Save」ボタンをクリックします。

`custom:type` も同じ要領で次のように入力して「Save」ボタンをクリックします。

- `Name` フィールドに `Type` と入力します。
- `Mapper Type` に `User Attribute` を選択します。
- `User Attribute` に `type` と入力します。
- `Token Claim Name` に `custom:type` と入力します。
- `Claim JSON Type` は `String` を選択します。

:::info
トークンの Claim Name を `custom:type`、`custom:firstname` としているのは、[Amazon Cognito ユーザープール](https://aws.amazon.com/jp/cognito/) に置き換える可能性を考慮したためです。Amazon Cognito ユーザープールのカスタム属性は、`custom:` がプレフィックスとして付加されます。
:::

Keycloak で OpenID Connect を有効にするための設定は以上です。

## サービスのコード

ここからはサービスのコードを見ていくことにします。

### インデックスページ

インデックスページの [OpenAPI 定義](https://github.com/edward-mamezou/use-openapi-generator/blob/2023-02-03/openapi.yml)は次の部分です。

```yaml
  /index:
    get:
      description: Login Url
      parameters:
        - name: podId
          in: query
          description: Identity of a hibernation pod
          required: true
          schema:
            type: string
      responses:
        '200':
          description: OK
          content:
            image/png:
              schema:
                type: string
                format: binary
      tags:
        - auth
```

`/index?podId=id-001` 等のポッド IDを付加したリクエストを受けて、QR コードの PNG イメージをレスポンスします。

### ログインページ

ログインページを定義した部分は次の通りです。

```yaml
  /login:
    get:
      description: Redirect to Authorization Endpoint
      parameters:
        - name: podId
          in: query
          description: Identity of a hibernation pod
          required: true
          schema:
            type: string
      responses:
        '302':
          description: FOUND
      tags:
        - auth
```

この URL のレスポンスは、state を採番しハッシュ化して Cookie に設定し、またポッド ID も Cookie に設定して、Keycloak の `Authorization Endpoint` にリダイレクトをレスポンスします。

[OpenID Connect](https://openid.net/specs/openid-connect-core-1_0.html) の Code Flow で state は次のように説明されています。

>RECOMMENDED. Opaque value used to maintain state between the request and the callback. Typically, Cross-Site Request Forgery (CSRF, XSRF) mitigation is done by cryptographically binding the value of this parameter with a browser cookie.

>推奨。リクエストとコールバックの間で維持される不透明な値。通常、Cross-Site Request Forgery (CSRF、XSRF) の軽減はこのパラメータの値を暗号化してブラウザ Cookie にバインドすることによって実行します。

ログインページのコードは、[`AuthApiController.java`](https://github.com/edward-mamezou/use-openapi-generator/blob/2023-02-03/src/main/java/com/mamezou_tech/example/controller/api/AuthApiController.java#L99-L118) を参照してください。

### コールバック

Code Flow は認証が成功した時、短時間有効な code がレスポンスされます。この code を使って Keycloak のトークンエンドポイントにアクセスして ID トークンを取得できます。

コールバックを実装したインフラストラクチャー層の [`CodeFlow.java`](https://github.com/edward-mamezou/use-openapi-generator/blob/2023-02-03/src/main/java/com/mamezou_tech/example/infrastructure/oidc/CodeFlow.java) は次の通りです。

```java
package com.mamezou_tech.example.infrastructure.oidc;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

public class CodeFlow {

    private static final Logger logger = LoggerFactory.getLogger(CodeFlow.class);

    private final URI tokenEndpoint;

    private final String clientId;

    private final String clientSecret;

    private final ObjectMapper mapper;

    public CodeFlow(String tokenEndpoint, String clientId, String clientSecret) throws URISyntaxException {
        this.mapper = new ObjectMapper();
        this.tokenEndpoint = new URI(tokenEndpoint);
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    private String clientSecretBasic() {
        return Base64.getUrlEncoder().encodeToString((clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));
    }

    public String tokenRequest(String code, String redirectUri) throws IOException, InterruptedException {
        HttpClient httpClient = HttpClient.newBuilder()
                .build();

        String credential = String.format("Basic %s", clientSecretBasic());

        String template = "grant_type=authorization_code&code=%s&redirect_uri=%s";
        String body = String.format(template, code, redirectUri);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(tokenEndpoint)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("Authorization", credential)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

        Map<String, Object> json = mapper.readValue(response.body(), new TypeReference<Map<String, Object>>() {});
        if (json.containsKey("error")) {
            logger.error(json.get("error").toString());
        }
        return json.get("id_token") instanceof String idToken ? idToken : null;
    }
}
```

### 設定ファイル

サービスの設定を `application.yaml` ファイルに記述します。

```yaml
openapi:
  exampleService:
    base-path: /example

auth:
  authorizationEndpoint: https://keycloak.example.com/auth/realms/passengers/protocol/openid-connect/auth
  tokenEndpoint: https://keycloak.example.com/auth/realms/passengers/protocol/openid-connect/token
  clientId: hibernation-pod
  clientSecret: SECRETSECRETSECRET
  callback: /callback
```

`clientSecret` に Keycloak の設定時に記録した値を設定してください。

## 参考

OpenID Connect の [Discovery 仕様](https://openid.net/specs/openid-connect-discovery-1_0.html) に設定ファイルで使用する、Authorization Endpoint や Token Endpoint また ID トークン等の署名検証時の公開鍵取得のエンドポイントの取得方法も記載されています。


Keycloak の場合は、次の URL にアクセスして取得できます。
- `https://[Keycloak のホスト]/auth/realms/[レルム名]/.well-known/openid-configuration`

Amazon Cognito Userpools の場合は、次の URL にアクセスして取得できます。
- `https://cognito-idp.[REGION].amazonaws.com/[POOL ID]/.well-known/openid-configuration`

## まとめ

この記事では、Keycloak を OpenID Connect の IdP (アイデンティティプロバイダ) として設定する方法について説明しました。この記事のコード全体は、[GitHub リポジトリ](https://github.com/edward-mamezou/use-openapi-generator/tree/2023-02-03) にあります。

## 関連記事

- [基本から理解するJWTとJWT認証の仕組み](/blogs/2022/12/08/jwt-auth/)
- [Apple Touch ID Keyboard を使ったパスワードレス認証](/blogs/2023/01/16/webauthn-4/)
- [NIST SP 800-63-3 Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)

[^1]: QRコードは株式会社デンソーウェーブの登録商標です。
