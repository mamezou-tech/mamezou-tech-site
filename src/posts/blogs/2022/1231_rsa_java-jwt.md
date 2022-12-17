---
title: 続・Auth0 java-jwtを使った素のJWT認証 - 今度は公開鍵方式でやってみた
author: toshio-ogiwara
date: 2022-12-31
tags: [Security, "認証/認可", java, advent2022]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---
これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第99日目の記事です。

[Auth0 java-jwtを使った素のJWT認証](/blogs/2022/12/10/java-jwt-auth/)では理解が容易な共通鍵方式によるJWTの生成と検証を紹介しましたが、今回はその続きとしてRSAの公開鍵方式で同じことをやってみたいと思います。記事は[前回](/blogs/2022/12/10/java-jwt-auth/)の内容をなぞる感じで進めて行くため、説明が重複する部分は割愛します。行間が読めないようなところや「そこもうちょっと説明を」なところがある場合は前回の記事を確認していただければと思います。

記事はサンプルアプリの必要な部分の抜粋を記載しています。全量を確認したい、または動作させてみたい方は説明に使用したコードを一式[GitHubリポジトリ](https://github.com/extact-io/jwt-sample-rsa)にアップしていますので、そちらを参考にしてください。

:::info: JWTの用語について
JWT認証で使われる文字列は正しくはJWS(JSON Web Signature)ですが、記事では一般的な呼び方にならいJWSを単にトークンまたは認証トークンと呼んでいます。
:::

[[TOC]]

# 利用するJWTライブラリ
共通鍵方式と同じ次のライブラリを使います。

```xml
<dependency>
    <groupId>com.auth0</groupId>
    <artifactId>java-jwt</artifactId>
    <version>4.2.1</version>
</dependency>
```


暗号化方式に依らずトークンの生成、検証に必要なものはこのライブラリに含まれています(厳密にはJSONのシリアライズ／デシリアライズを行うjackson-databindは推移的依存により取得されます)

# トークンの生成と検証
共通鍵方式と同じ簡単なコンソールアプリをサンプルに公開鍵方式におけるjava-jwtの使い方をみていきます。サンプルアプリの内容は共通鍵方式と同じなので詳細は[こちら](/blogs/2022/12/10/java-jwt-auth/#トークンの生成と検証)を参照としますが、全体のイメージとしては次のようになります。

![rsa-gen-verify](/img/blogs/2022/1231_rsa-gen-verify.drawio.svg)

なお、秘密鍵と公開鍵はjarに同梱し、そのパスは環境変数から取得するようにします。

## 秘密鍵と公開鍵の作成
RSA暗号による秘密鍵と公開鍵の作成方法はいくつかありますが、ここではopensslコマンドを使って次のように作成します。なお、公開鍵とはなにか？や暗号鍵の生成方法に関する細かい説明は必要に応じて別途ネットの情報等を参考にしてください。

まずは秘密鍵の生成から。
- 秘密鍵の作成(PKCS#1[^1])
```shell
openssl genrsa -out jwt.key.p1 512
```

[^1]: RSA暗号方式における暗号鍵フォーマットの1つ

:::alert: 512bitの鍵長はキケンですよ！
今回はサンプルのためトークンが短くなるように敢えて512bitの鍵長を使っていますが、強度が低くプロダクション環境で利用するのはキケンです。現在の安全といわれている鍵長の主流は2048bitとなっています。
:::

次に生成した秘密鍵から公開鍵を生成します。

- 公開鍵の作成
```shell
openssl rsa -in jwt.key.p1 -pubout -outform PEM -out jwt.pub.key
```

Javaの標準APIでPKCS#1の鍵フォーマットは直接扱えないため、先ほど生成した秘密鍵を標準APIで扱えるPKCS#8[^2]に変換します。

- 秘密鍵の変換(PKCS#1からPKCS#8へ)
```shell
openssl pkcs8 -in jwt.key.p1 -out jwt.key -topk8 -nocrypt
```
[^2]: [RFC-5208](https://www.rfc-editor.org/rfc/rfc5208)で規定されている暗号鍵フォーマットの1つ

鍵の準備は以上です。記事ではこの2つの鍵を使ってサンプルを説明していきます。

## トークンの生成実装(RsaJwtProvider)
公開鍵方式によるトークン生成の実装は次のようになります。

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.UUID;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;

public class RsaJwtProducer {
    private String keyPath;
    public RsaJwtProducer(String path) {
        this.keyPath = path;
    }
    public String generateToken() {
        Algorithm alg = Algorithm.RSA256(createPrivateKey());
        String token = JWT.create()
                .withIssuer("RsaJwtProducer")
                .withSubject("ID12345")
                .withExpiresAt(OffsetDateTime.now().plusMinutes(60).toInstant())
                .withIssuedAt(OffsetDateTime.now().toInstant())
                .withJWTId(UUID.randomUUID().toString())
                .withClaim("email", "id123459@exact.io")
                .withArrayClaim("groups", new String[] { "member", "admin" })
                .sign(alg);
        return token;
    }
    private RSAPrivateKey createPrivateKey() {
        try (InputStream is = this.getClass().getResourceAsStream(this.keyPath);
                BufferedReader buff = new BufferedReader(new InputStreamReader(is))) {
            var pem = new StringBuilder();
            String line;
            while ((line = buff.readLine()) != null) {
                pem.append(line);
            }

            String privateKeyPem = pem.toString()
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replaceAll(System.lineSeparator(), "")
                    .replace("-----END PRIVATE KEY-----", "");

                  byte[] encoded = Base64.getDecoder().decode(privateKeyPem);
                  PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(encoded);
                  KeyFactory keyFactory = KeyFactory.getInstance("RSA");
                  return (RSAPrivateKey) keyFactory.generatePrivate(keySpec);
        } catch (IOException | NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalStateException(e);
        }
    }
    public static void main(String[] args) {
        String keyPath = System.getenv("KEY_PATH");
        System.out.println(new RsaJwtProducer(keyPath).generateToken());
    }
}
```

[共通鍵方式の実装](/blogs/2022/12/10/java-jwt-auth/#トークンの生成実装hmacjwtprovider)と比べて分かるとおり、違いは先頭のAlgorithmインスタンスの生成部分だけで他はすべて共通鍵方式と同じになっています。この差分となる`createPrivateKey`メソッドの処理は以下のとおりになります。

- 環境変数`KEY_PATH`で指定されたクラスパス上の秘密鍵のファイルを読み込む
- ファイルはPEM形式[^3]のため、ヘッダー行(`-----BEGIN …`)とフッター行(`----END `)を除去し、BASE64デコードする
- BASE64デコードしたバイナリデータをPKCS#8の暗号鍵として扱えるように`PKCS8EncodedKeySpec`に変換する
- 変換したものをRSAの`KeyFactory`インスタンスに与えて`RSAPrivateKey`インスタンスを生成する

`createPrivateKey`メソッドで使っているクラスはすべてJava標準APIの`java.*`パッケージのものでAuth0に固有なものはなにもありません。`RSAPrivateKey`インスタンスの生成手順を細かく説明しましたが、PKCS#8のPEM形式の秘密鍵ファイルから`RSAPrivateKey`インスタンスを生成する手順はjava-jwt以外のJWTライブラリを使っても同じです。また`RSAPrivateKey`インスタンスさえ生成してしまえば後は共通鍵方式と同じように簡単にトークンを生成することができます。

[^3]: Privacy Enhanced Mailの略。鍵のバイナリデータをBASE64エンコードでテキストにしたものにヘッダー行とフッター行を付けたもの。

### RsaJwtProducerの実行
それではRsaJwtProviderクラスを実行してみましょう。

秘密鍵はクラスパス直下の`/jwt.key`[^4]に配置しているので、環境変数`KEY_PATH`にこの値を設定します。また、RsaJwtProviderは`-jar`オプションで起動可能なExecutable Jar形式でビルドしています。
[^4]: ソースツリー上は`/src/main/resources/jwt.key`

実行した結果は次のとおりです。

```shell
export KEY_PATH=/jwt.key
java -jar target/rsa-jwt-producer.jar

eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJJRDEyMzQ1IiwiaXNzIjoiUnNhSnd0UHJvZHVjZXIiLCJncm91cHMiOlsibWVtYmVyIiwiYWRtaW4iXSwiZXhwIjoxNjcxMDk5NTMxLCJpYXQiOjE2NzEwOTU5MzEsImp0aSI6ImI4MmM1NGU2LTA2ODktNGZhYy1iOTQ5LTY5YjlhYWY0MTQ5MiIsImVtYWlsIjoiaWQxMjM0NTlAZXhhY3QuaW8ifQ.r6o8QdjLwQUI2DM5jchHCiHSv4tI4Y7SsMV5lbBo0-BzW2gAcoqeXOI5fFlX0leNTawgHQX8N-PSre_RumNTJQ
```

実行結果からヘッダーとペイロード、シグニチャが`.`(ドット)で連結されたトークンを取得することができました。

::: alert: 暗号鍵の管理と置き場は慎重に！
今回はサンプルのためjarの中に暗号鍵を格納していますが、言わずもがなですが暗号鍵は他へ漏洩することないように厳重に管理する必要があります。暗号鍵の管理はそれだけで本が一冊書けるくらい深いテーマのため、ここでは触れませんが、少なくともプロダクション環境で今回のサンプルように単にjarに同梱しただけというのはやめましょう。
:::

## トークンの検証実装(RsaJwtConsumer)
今後は秘密鍵から生成した先ほどのトークンを公開鍵を使って検証する方法をみていきます。この公開鍵方式よるトークンを検証する実装は次のようになります。

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.stream.Collectors;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;

public class RsaJwtConsumer {
    private String publicKeyPath;
    public RsaJwtConsumer(String path) {
        this.publicKeyPath = path;
    }
    public DecodedJWT verifyToken(String token) {
        Algorithm alg = Algorithm.RSA256(createPublicKey());
        JWTVerifier verifier = JWT.require(alg)
                .withIssuer("RsaJwtProducer")
                .acceptExpiresAt(5)
                .build();
        try {
            return verifier.verify(token);
        } catch (JWTVerificationException e) {
            System.out.println("JWT verification failed..");
            throw e;
        }
    }
    private RSAPublicKey createPublicKey() {
        try (InputStream is = this.getClass().getResourceAsStream(publicKeyPath);
                BufferedReader buff = new BufferedReader(new InputStreamReader(is))) {
            var pem = new StringBuilder();
            String line;
            while ((line = buff.readLine()) != null) {
                pem.append(line);
            }

            String publicKeyPem = pem.toString()
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replaceAll(System.lineSeparator(), "")
                    .replace("-----END PUBLIC KEY-----", "");

                  byte[] encoded = Base64.getDecoder().decode(publicKeyPem);
                  X509EncodedKeySpec keySpec = new X509EncodedKeySpec(encoded);
                  KeyFactory keyFactory = KeyFactory.getInstance("RSA");
                  return (RSAPublicKey) keyFactory.generatePublic(keySpec);
        } catch (IOException | NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalStateException(e);
        }
    }
    public static void main(String[] args) {
        String secretkey = System.getenv("PUB_KEY_PATH");

        DecodedJWT jwt = new RsaJwtConsumer(secretkey).verifyToken(args[0]);

        System.out.println("----- DecodedJWT -----");
        System.out.println("alg:" + jwt.getAlgorithm());
        System.out.println("typ:" + jwt.getType());
        System.out.println("issuer:" + jwt.getIssuer());
        System.out.println("subject:" + jwt.getSubject());
        System.out.println("expiresAt:" + jwt.getExpiresAt());
        System.out.println("issuerAt:" + jwt.getIssuedAt());
        System.out.println("JWT-ID:" + jwt.getId());
        System.out.println("email:" + jwt.getClaim("email").asString());
        System.out.println("groups:" + jwt.getClaim("groups")
                    .asList(String.class).stream()
                    .collect(Collectors.joining(",")));
    }
}
```

トークンの生成と同様に[共通鍵方式の実装](/blogs/2022/12/10/java-jwt-auth/#トークンの検証実装hmacjwtconsumer)との差分は公開鍵の生成を行う`createPublicKey`メソッド部分だけです。このメソッドではJava標準APIの`RSAPublicKey`インスタンスを生成していますが、その手順はトークンの生成で行っている`RSAPrivateKey`インスタンスの生成手順とほぼ同じで、違いはデコードしたバイナリデータを`X509EncodedKeySpec`インスタンスにする箇所のみです。

### RsaJwtConsumerの実行
それではRsaJwtConsumerを使ってRsaJwtProducerで取得したトークンを検証し、復元された内容を確認してみましょう。

秘密鍵から生成した公開鍵はクラスパス直下の`/jwt.pub.key`[^5]に配置しているので、環境変数`PUB_KEY_PATH`にこの値を設定します。また、RsaJwtConsumerも`-jar`オプションで起動可能なExecutable Jar形式でビルドしています。

この実行した結果は次のとおりです。

```shell
export PUB_KEY_PATH=/jwt.pub.key
java -jar target/rsa-jwt-consumer.jar eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJJRDEyMzQ1IiwiaXNzIjoiUnNhSnd0UHJvZHVjZXIiLCJncm91cHMiOlsibWVtYmVyIiwiYWRtaW4iXSwiZXhwIjoxNjcxMDk5NTMxLCJpYXQiOjE2NzEwOTU5MzEsImp0aSI6ImI4MmM1NGU2LTA2ODktNGZhYy1iOTQ5LTY5YjlhYWY0MTQ5MiIsImVtYWlsIjoiaWQxMjM0NTlAZXhhY3QuaW8ifQ.r6o8QdjLwQUI2DM5jchHCiHSv4tI4Y7SsMV5lbBo0-BzW2gAcoqeXOI5fFlX0leNTawgHQX8N-PSre_RumNTJQ

----- DecodedJWT -----
alg:RS256
typ:JWT
issuer:RsaJwtProducer
subject:ID12345
expiresAt:Thu Dec 15 21:18:51 JST 2022
issuerAt:Thu Dec 15 21:18:51 JST 2022
JWT-ID:b82c54e6-0689-4fac-b949-69b9aaf41492
email:id123459@exact.io
groups:member,admin
```

トークン生成時に設定したクレーム値が復元できていることが確認できます。

共通鍵方式と公開鍵方式、双方の実装から分かるとおり、java-jwtは暗号／復号化の操作を`Algorithm`クラスでうまく抽象化しているため、異なる暗号化方式を使う場合でも、`Algorithm`インスタンスの生成箇所以外はすべて同じように実装できるようになっています。またRSA暗号の秘密鍵と公開鍵の生成はJavaの標準APIで行えるため、学習コストが抑えられた使いやすいAPIになっています。

# JWT認証の実装
共通鍵方式と同じように今度は公開鍵方式でJWT認証を行うサンプルアプリの実装をしてみます。サンプルアプリの内容は共通鍵方式の[こちら](/blogs/2022/12/10/java-jwt-auth/#jwt認証の実装)と同じのため細かい説明は省略しますが、そのイメージは次のようになります。

![java-jwt-auth](/img/blogs/2022/1231_rsa-java-jwt-auth.drawio.svg)

## サンプルアプリの実装
共通鍵方式の実装との違いは認証トークンの生成と検証を行うクラス(赤で色掛けしているクラス)だけとなるため、ここではその実装だけを紹介します。

### SimpleIDProviderの構造と実装
![simpleidprovider-structure](/img/blogs/2022/1231_rsa-simpleidprovider-structure.drawio.svg)

- AuthTokenProducer
```java
public class AuthTokenProducer {
    private String keyPath;
    public AuthTokenProducer(String path) {
        this.keyPath = path;
    }
    public String generateToken(User user) {
        Algorithm alg = Algorithm.RSA256(createPrivateKey());
        String token = JWT.create()
                .withIssuer("AuthTokenProducer")
                .withSubject(user.id())
                .withExpiresAt(OffsetDateTime.now().plusMinutes(60).toInstant())
                .withIssuedAt(OffsetDateTime.now().toInstant())
                .withJWTId(UUID.randomUUID().toString())
                .withClaim("name", user.name())
                .sign(alg);
        return token;
    }
    private RSAPrivateKey createPrivateKey() {
        try (InputStream is = this.getClass().getResourceAsStream(this.keyPath);
                BufferedReader buff = new BufferedReader(new InputStreamReader(is))) {
            var pem = new StringBuilder();
            String line;
            while ((line = buff.readLine()) != null) {
                pem.append(line);
            }

            String privateKeyPem = pem.toString()
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replaceAll(System.lineSeparator(), "")
                    .replace("-----END PRIVATE KEY-----", "");

                  byte[] encoded = Base64.getDecoder().decode(privateKeyPem);
                  PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(encoded);

                  KeyFactory keyFactory = KeyFactory.getInstance("RSA");
                  return (RSAPrivateKey) keyFactory.generatePrivate(keySpec);

        } catch (IOException | NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalStateException(e);
        }
    }
}
```

### AddCalculatorの構造と実装
![addcalculator-structure](/img/blogs/2022/1231_rsa-addcalculator-structure.drawio.svg)

- AuthTokenVerifier
```java
public class AuthTokenVerifier {
    // JWTVerifierはスレッドセーフのため使いまわしてもOK
    private JWTVerifier verifier;

    public AuthTokenVerifier(String publicKeyPath) {
        Algorithm alg = Algorithm.RSA256(createPublicKey(publicKeyPath));
        this.verifier = JWT.require(alg)
                .withIssuer("AuthTokenProducer")
                .acceptExpiresAt(5)
                .build();
    }
    public DecodedJWT verifyToken(String token) {
        try {
            return verifier.verify(token);
        } catch (JWTVerificationException e) {
            System.out.println("JWT verification failed..");
            throw e;
        }
    }
    private RSAPublicKey createPublicKey(String publicKeyPath) {
        try (InputStream is = this.getClass().getResourceAsStream(publicKeyPath);
                BufferedReader buff = new BufferedReader(new InputStreamReader(is))) {
            var pem = new StringBuilder();
            String line;
            while ((line = buff.readLine()) != null) {
                pem.append(line);
            }

            String publicKeyPem = pem.toString()
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replaceAll(System.lineSeparator(), "")
                    .replace("-----END PUBLIC KEY-----", "");

                  byte[] encoded = Base64.getDecoder().decode(publicKeyPem);
                  X509EncodedKeySpec keySpec = new X509EncodedKeySpec(encoded);
                  KeyFactory keyFactory = KeyFactory.getInstance("RSA");
                  return (RSAPublicKey) keyFactory.generatePublic(keySpec);
        } catch (IOException | NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalStateException(e);
        }
    }
}
```

## サンプルアプリの実行
認証トークンの署名と検証を行う秘密鍵と公開鍵は先ほどのサンプルと同じようにクラスパス直下の`/jwt.key`と`/jwt.pub.key`に配置しています。また、`SimpleIDProvider`と`AddCalculator`のいずれも`-jar`オプションで起動可能なExecutable Jar形式でビルドしています。

では、まずSimpleIDProviderに登録されている`soramame`/`emamaros`で、SimpleIDProviderを起動してみます。

```shell
export KEY_PATH=/jwt.key
java -jar target/rsa-simple-idprovider.jar soramame emamaros

eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJzb3JhbWFtZSIsImlzcyI6IkF1dGhUb2tlblByb2R1Y2VyIiwibmFtZSI6IuOBneOCieixhiDlpKrpg44iLCJleHAiOjE2NzExMDI2MzIsImlhdCI6MTY3MTA5OTAzMiwianRpIjoiZjgwMmU5OTItMDU5ZS00ZDVmLWIxYTMtYjRiZjNhMTk1NjQzIn0.CUbzM4lAMoTM2bOexQPMJvyr7HNN3b6lFB7uKN1xQp371ahhZwNHRQG6Xg4IzwS3HxGJlz0HUkieyIAflEd88g
```

認証が成功し`soramame`のユーザ情報に基づいた認証トークンが生成されコンソールに出力されます。

次にこの認証トークンを使って`AddCalculator`を起動しみてみます。第1引数の3と第2引数の4は加算する2つの値となります。

```shell
export PUB_KEY_PATH=/jwt.pub.key
java -jar target/rsa-add-calculator.jar 3 4 eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJzb3JhbWFtZSIsImlzcyI6IkF1dGhUb2tlblByb2R1Y2VyIiwibmFtZSI6IuOBneOCieixhiDlpKrpg44iLCJleHAiOjE2NzExMDI2MzIsImlhdCI6MTY3MTA5OTAzMiwianRpIjoiZjgwMmU5OTItMDU5ZS00ZDVmLWIxYTMtYjRiZjNhMTk1NjQzIn0.CUbzM4lAMoTM2bOexQPMJvyr7HNN3b6lFB7uKN1xQp371ahhZwNHRQG6Xg4IzwS3HxGJlz0HUkieyIAflEd88g

そら豆 太郎さんからの依頼の計算結果は7です
```

指定した認証トークンは確かに`SimpleIDProvider`により生成されたもののため、認証トークンの検証はOKで足し算の結果が出力されます。

# まとめ
記事では仕組みを理解するためJWT認証を行う簡単なアプリを作ってみましたが、プロダクション環境でJWT認証を行う場合は、Auth0などの認証基盤サービスを使うことをお勧めします。扱っているのが認証という非常に重要な機能となるため、JWT認証でウッカリや万が一があった場合のダメージには大きいモノがあります。

また暗号鍵の管理も含め暗号化には高い専門性が要求されます。ですので、JWT認証べんりー！結構簡単じゃーん！と思ってオレオレJWT認証を実践投入したくなる気持ちも分かりますが、そこはよく考えて専用のサービスやプロダクトを使うことをお勧めします、特に公開鍵方式を使う場合はです。

