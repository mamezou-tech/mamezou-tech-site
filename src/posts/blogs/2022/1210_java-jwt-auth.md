---
title: Auth0 java-jwtを使った素のJWT認証
author: toshio-ogiwara
date: 2022-12-10
tags: [Security, "認証/認可", java, advent2022]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---
これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第10日目の記事です。

JWT認証としてはOIDC(OpenIDConnect)が有名ですが、今回は仕組みを素から理解することを目的にAuth0のjava-jwtを使ってJWT認証の簡単な仕組みを作ってみたいと思います。
なお、JWTやJWT認証ってそもそもなに？という方は[「基本から理解するJWTとJWT認証の仕組み」](/blogs/2022/12/08/jwt-auth/)から読まれることをお勧めします。

また、記事はサンプルアプリの必要な部分の抜粋を記載しています。全量を確認したい、または動作させてみたい方は説明に使用したコードを一式[GitHubリポジトリ](https://github.com/extact-io/jwt-sample)にアップしていますので、そちらを参考にしてください。

:::info: JWTの用語について
JWT認証で使われる文字列は正しくはJWS(JSON Web Signature)ですが、記事では一般的な呼び方にならいJWSを単にトークンまたは認証トークンと呼んでいます。
:::

[[TOC]]

記事は最終的にJWT認証を使った簡単なコンソールアプリを作ることを目的にしていますが、その前にjava-jwtを使ったトークンの生成と検証方法をみていきます。また記事で使う暗号鍵は理解を容易にするためすべて共有鍵方式(秘密鍵方式)を使っています。

# 利用するJWTライブラリ
今回はトークンの生成と検証を行うライブラリとして[Auth0のjava-jwt](https://github.com/auth0/java-jwt)を使います。java-jwtと同様な機能を持つライブラリは[jose4j](https://bitbucket.org/b_c/jose4j/wiki/Home)など他にもいくつかありますが、プロダクション環境での利用を前提にした場合、java-jwtが一番適していると思われます。

それはAPIがfluentで使いやすいこともありますが、一番の理由は開発元が認証基盤サービスの大御所、Auth0という安心感です。開発元が認証を本業にしている会社なだけに継続的なサポートや万が一があった場合の迅速な対応を期待できると思われます(フリーなのでAuth0がコミットしている訳でもなく、あくまでも筆者の期待ですが)

java-jwtのMavenのarticatは次になります。

```xml
<dependency>
    <groupId>com.auth0</groupId>
    <artifactId>java-jwt</artifactId>
    <version>4.2.1</version>
</dependency>
```

バージョンは記事執筆時点の最新のものを使っています。新しいものがリリースされている場合は変えていただいても構いません。今回の記事はこのライブラリを使って説明を行っていきます。


# トークンの生成と検証
次の簡単なコンソールサンプルを題材にjava-jwtの使い方をみていきます。

- トークンの生成(HmacJwtProvider)
  - 環境変数から暗号キーを受け取り、そのキーを使って[クレーム](#ペイロードに設定するクレーム)を署名し、生成されたトークンをコンソールに出力する
- トークンの検証(HmacJwtConsumer)
  - 環境変数から取得した暗号キーを使って起動パラメータから取得したトークンを検証し、結果がOKの場合はヘッダーの`alg`と`typ`とペイロードをコンソールに出力する

#### ペイロードに設定するクレーム
|クレーム名 | クレーム値  | 補足(クレーム用途) |
|:----:|---------|-----|
| iss | `HmacJwtProducer`  | JWTの発行者 |
| sub | `ID12345` | ユーザの識別子などJWTの主体 |
| exp | 発行時から60分後 | JWTの有効期限 |
| iat | 発行時の日時 | JWTの発行日時 |
| jti | UUID | JWTの一意な識別子 |

HmacJwtProviderから出力されたトークンをHmacJwtConsumerで検証し、その出力結果から、トークンの生成と検証動作を確認してみます。

## トークンの生成実装(HmacJwtProvider)
トークンの生成を行うサンプルとして上で説明した

> 環境変数から暗号キーを受け取り、そのキーを使ってクレームを署名し、生成されたJWTをコンソールに出力する

HmacJwtProviderの実装を説明します。まず中身を見てもらうと実装は次のとおりになります。

```java
import java.time.OffsetDateTime;
import java.util.UUID;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;

public class HmacJwtProducer {
    private String secretKey;
    public HmacJwtProducer(String key) {
        this.secretKey = key;
    }
    public String generateToken() {
        Algorithm alg = Algorithm.HMAC256(secretKey);
        String token = JWT.create()
                .withIssuer("HmacJwtProducer")
                .withSubject("ID12345")
                .withExpiresAt(OffsetDateTime.now().plusMinutes(60).toInstant())
                .withIssuedAt(OffsetDateTime.now().toInstant())
                .withJWTId(UUID.randomUUID().toString())
                .withClaim("email", "id123459@exact.io")
                .withArrayClaim("groups", new String[] { "member", "admin" })
                .sign(alg);
        return token;
    }
    public static void main(String[] args) {
        String secretkey = System.getenv("SECRET_KEY");
        System.out.println(new HmacJwtProducer(secretkey).generateToken());
    }
}
```

java-jwtを使ったトークンの生成手順は大まかに次のようになります。
- `Algorithm`のクラスメソッドから署名する暗号アルゴリズムを生成
- `JWT.create()`でトークンを生成するBuilderインスタンスを生成
- Builderクラスに定義されている`with`メソッドを使って各クレームを設定
- Builderクラスの`sing(alg)`でクレーム(ペイロード)に対して署名を行いJWSコンパクトシリアライゼーションされたトークンを受け取る

それぞれのポイントを次に説明していきます。

### 暗号化アルゴリズムの生成
`Algorithm`クラスには署名と検証を行うAlgorithmインスタンスを生成するファクトリーメソッドが暗号化方式ごとに定義されています。

今回は[HMAC-SHA256](https://www.okta.com/jp/identity-101/hmac/)を使った共通鍵方式による暗号化を使うため、例では次のように`Algorithm`インスタンスを生成しています。

```java
Algorithm alg = Algorithm.HMAC256(secretKey);
```

引数で渡している`secretKey`が暗号化の元ネタとなる暗号キーになります。`Algorithm`インスンタスがトークンの署名、検証を行うそのものとなるため、この例の`alg`インスタンスがHMAC-SHA256方式で暗号／復号化を行う実際のオブジェクトとなります。

このようにjava-jwtでは暗号／復号化の操作は`Algorithm`クラスで抽象化されているため、RSAなどの異なる暗号化方式を使う場合でも、`Algorithm`インスタンスの生成箇所以外はすべて同じように実装できるようになっています。

### クレームの設定
`JWT.create()`で返される`JWTCreator.Builder`クラスにクレームを設定する`with`メソッドが定義されています。この`with`メソッドには例で使っているようにクレーム名が予め定義されたメソッドとクレーム名を自分で指定するメソッドの2種類が用意されています。

```java
String token = JWT.create()
        .withIssuer("HmacJwtProducer")
        .withSubject("ID12345")
        ....
        .withClaim("email", "id123459@exact.io")
        .withArrayClaim("groups", new String[] { "member", "admin" })
        ....
```

クレーム名付きのメソッドはRFCで定義されている登録クレーム名に対してすべて用意されています。また、クレーム名を自分で指定する`with`メソッドについても設定する値を明示したメソッドやクレーム値のクラスごとにオーバーロードメソッドが複数用意されているため、便利に使うことができます。参考までに次のようなメソッドが用意されています。なお、これは一部ですので用途に応じた適切なメソッドが見つかると思います。
- `withArrayClaim(String name, String[] items)`
- `withArrayClaim(String name, Integer[] items)`
- `withNullClaim(String name)`
- `withClaim(String name, List<?> list)`
- `withClaim(String name, Map<String, ?> map)`


また`with`メソッドでは`JWTCreator.Builder`インスタンスが返されるためコードを上の例のようにメソッド呼び出しを繋げていくfluentなスタイルでコードを実装してくことができます。また、これがjava-jwtの特徴の一つとして挙げた「APIがfluentで使いやすい」ところとなります。

### 有効期限の設定
例ではトークンに対する有効期限を次のよう設定しています。

```java
.withExpiresAt(OffsetDateTime.now().plusMinutes(60).toInstant())
```

このメソッドでやっていることは現在時刻の60分後を有効期限として設定することです。

`withExpiresAt`の引数で行っている処理はjava-jwtのAPIに固有なことではないのですが、少し行間が広いため補足すると次のようになります。

トークンの有効期限を設定する`exp`(expiration time)はUTCの1970年1月1日0時0分0秒からの経過秒で表すUnix timeで設定することがRFCで決められています。また、Javaで絶対値で日時を表現するクラスとして`java.time. Instant`があります。

また、例の`OffsetDateTime.now().plusMinutes(60).toInstant()`は現在時刻の60分後の日時をInstantインスタンスに変換したものとなります。

### JWTの署名
JWTの署名はBuilderインスタンスに対してすべてのクレームの設定が終わったのち、次のようにBuilderインスタンスにAlgorithmインスタンスを渡して`sign`メソッドを呼ぶだけです。

```java
String token = JWT.create()
        ...
        .sign(alg);
```

java-jwtは`sign`メソッドの引数で渡された`Algorithm`インスタンスを使って、ヘッダーからシグニチャの生成までの一連のJWSコンパクトシリアライゼーションの手順を行い、その結果として`BASE64URLエンコード(ヘッダー) + . + BASE64URLエンコード(ペイロード) + . + BASE64URLエンコード(シグニチャ)`形式のトークンを返します。

### HmacJwtProducerの実行
実装の説明は終わりですので、それではHmacJwtProviderクラスを実行してみましょう。

今回は暗号キーを`devel@per`とするため、環境変数`SECRET_KEY`にこの値を設定します。また、HmacJwtProviderは`-jar`オプションで起動可能なExecutable Jar形式でビルドしています。

この実行した結果は次のとおりです。

```shell
export SECRET_KEY=devel@per
java -jar target/jwt-producer.jar

eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJJRDEyMzQ1IiwiaXNzIjoiSG1hY0p3dFByb2R1Y2VyIiwiZ3JvdXBzIjpbIm1lbWJlciIsImFkbWluIl0sImV4cCI6MTY3MDY0MDk4MywiaWF0IjoxNjcwNjM3MzgzLCJqdGkiOiIwM2U2NGEyMS01MjEwLTQ0OTMtYjQ4Zi03ZmYzOWI3NjhkMGMiLCJlbWFpbCI6ImlkMTIzNDU5QGV4YWN0LmlvIn0.uj7vFXa6V6MzD5aO3588OScHZ6YO_fjTBfy3YwynqSk
```

実行結果からヘッダーとペイロード、シグニチャが`.`(ドット)で連結されたトークンを取得することができました。


## トークンの検証実装(HmacJwtConsumer)
今後は先ほど取得したトークンに対する検証とペイロードの復元を確認していきます。

トークンの検証を行うサンプルとして上で説明した

>起動パラメータからは検証するJWTを受け取り、環境変数から取得した暗号キーを使ってJWTを検証し、OKの場合はペイロードとヘッダーのalgとtypをコンソールに出力する

HmacJwtConsumerの実装を説明します。トークンの生成と同じようにまず中身を見てもらうと実装は次のとおりになります。

```java
import java.util.stream.Collectors;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;

public class HmacJwtConsumer {
    private String secretKey;
    public HmacJwtConsumer(String key) {
        this.secretKey = key;
    }
    public DecodedJWT verifyToken(String token) {
        Algorithm alg = Algorithm.HMAC256(secretKey);
        JWTVerifier verifier = JWT.require(alg)
                .withIssuer("HmacJwtProducer")
                .acceptExpiresAt(5)
                .build();
        try {
            return verifier.verify(token);
        } catch (JWTVerificationException e) {
            System.out.println("JWT verification failed..");
            throw e;
        }
    }
    public static void main(String[] args) {
        String secretkey = System.getenv("SECRET_KEY");
        DecodedJWT jwt = new HmacJwtConsumer(secretkey).verifyToken(args[0]);

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
java-jwtを使ったトークンの検証手順は大まかに次のようになります。
- `Algorithm`のクラスメソッドを使い検証に使う`Algorithm`インスタンスを生成する
- 検証に使用する`Algorithm`インスタンスを`JWT.require`で指定し、トークンの検証を行う`JWTVerifier`インスタンスを生成する
- `JWTVerifier`インスタンスにペイロードのチェック条件を設定する
- `JWTVerifier`インスタンスにトークンを渡して検証を実施する
- 検証がOKの場合、トークンから復元されたヘッダーとペイロードを格納した`DecodedJWT`が返される

それぞれのポイントを次に説明していきます。

### 復号化アルゴリズムの生成
今回は暗号化する側と復号する側の双方が同じ鍵を使う共通鍵方式でシグニチャを生成しているので、検証を行う`Algorithm`インスタンスもトークン生成側と同じHMAC-SHA256方式で暗号キーは起動パラメータから同じものを指定してもらうようにします。

### ペイロードのチェック条件の指定
今回の例ではペイロードに対するチェック条件として次を指定しています。

```java
JWTVerifier verifier = JWT.require(alg)
        .withIssuer("HmacJwtProducer")
        .acceptExpiresAt(5)
        ...
```

`.withIssuer("HmacJwtProducer")`のように`JWTVerifier`インスタンスに`with`メソッドで指定されたクレームは、シグニチャの検証時にトークンから復元したクレーム値が同じかをチェックすることができます。

トークンの改ざんはシグニチャの検証で検知することができますが、そもそも想定外の発行元(`iss`)が発行したトークンだった場合に受入を拒否するなどのチェックに利用されます。また、このwithメソッドによるチェック条件の指定は任意となるため指定がなくても構いません。

ただし、JWTの有効期限(`exp`)のクレームは特別になります。`exp`が設定されている場合、RFCではトークンを検証する側は`exp`をチェックすることになっています。このため、トークンに`exp`が設定されていた場合、トークンの有効期間がデフォルトでチェックされます。

この時に問題になるのがトークンの生成側と受入側のシステム時刻のズレです。これに対してjava-jwtでは許容するズレの範囲を`acceptExpiresAt`メソッドを使って指定することができます。例では`acceptExpiresAt`メソッドに`5`を指定していますが、これにより`exp`に設定されている有効期限に5秒加算した値、つまり`acceptExpiresAt`メソッドに指定した秒数分、有効期限を延長させてチェックを行えるようにできます。

### シグニチャの検証
シグニチャの検証は次のように`JWTVerifier`インスタンスの`verify`メソッドで行います。

```java
verifier.verify(token);
```

この時に引数で渡すものがトークンになります。トークンを渡して`JWTVerifier`インスタンスの`verify`メソッドを呼び出すことで、[生成したAlgorithmインスタンス](#復号化アルゴリズムの生成)によるシグニチャの検証が行われます。この際、結果がOKの場合にペイロードとヘッダーの復元が行われますが、NGの場合は`JWTVerificationException`が送出されます。


### ヘッダーとペイロードの取得
トークンから復元されたヘッダーとペイロードは次のように`DecodedJWT`インスタンスから取得できます。

```java
DecodedJWT jwt = new HmacJwtConsumer(secretkey).verifyToken(args[0]);
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
```

`DecodedJWT`には[クレームの設定](#クレームの設定)で説明したBuilderのクレーム設定メソッドと同様に登録クレーム名ごとにメソッドが用意されています。また、クレーム名を指定した`getClaim`メソッドで返される`Claim`インスタンスのメソッドには取得する型に応じた`asXXX`メソッドが用意されています。

### HmacJwtConsumerの実行
それではHmacJwtConsumerを使ってHmacJwtProducerで取得したトークンを検証し、復元された内容を確認してみましょう。

トークン生成時の暗号キーは`devel@per`だったので、環境変数`SECRET_KEY`に同じキーを設定します。また、HmacJwtConsumerも`-jar`オプションで起動可能なExecutable Jar形式でビルドしています。

この実行した結果は次のとおりです。

```shell
export SECRET_KEY=devel@per
java -jar target/jwt-consumer.jar eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJJRDEyMzQ1IiwiaXNzIjoiSG1hY0p3dFByb2R1Y2VyIiwiZ3JvdXBzIjpbIm1lbWJlciIsImFkbWluIl0sImV4cCI6MTY3MDY0MDk4MywiaWF0IjoxNjcwNjM3MzgzLCJqdGkiOiIwM2U2NGEyMS01MjEwLTQ0OTMtYjQ4Zi03ZmYzOWI3NjhkMGMiLCJlbWFpbCI6ImlkMTIzNDU5QGV4YWN0LmlvIn0.uj7vFXa6V6MzD5aO3588OScHZ6YO_fjTBfy3YwynqSk

----- DecodedJWT -----
alg:HS256
typ:JWT
issuer:HmacJwtProducer
subject:ID12345
expiresAt:Sat Dec 10 11:56:23 JST 2022
issuerAt:Sat Dec 10 10:56:23 JST 2022
JWT-ID:03e64a21-5210-4493-b48f-7ff39b768d0c
email:id123459@exact.io
groups:member,admin
```

トークン生成時に設定したクレーム値が復元できていることが確認できます。

# JWT認証の実装
java-jwtを使ったトークンの生成と検証を行う実装方法をみてきました。説明に使った例はプログラムにハードコードされたクレーム値を単にトークンとして生成するだけのものだったため「認証」を行っているイメージがないと思いますが、今度は「認証」のイメージができるように次のサンプルアプリを使ってトークンの使い方を見ていきたいと思います (サンプルは今回も簡単なコンソールアプリです)。

![java-jwt-auth](/img/blogs/2022/1210_java-jwt-auth.drawio.svg)

AddCalculatorは起動パラメータで受け取った2つの値(leftとright)を単に加算し、その結果をコンソールに出力する簡単なアプリですが、このアプリを実行できる人はSimpleIDProviderに登録さているユーザに限定する必要があったとします。このような要件があった場合、AddCalculatorは実行しようとしている人がSimpleIDProviderに登録されている本人だということを確認する必要がありますが、これはどのようにすればよいでしょうか？

そこで登場するのが認証トークン(認証情報が設定されているトークン)です。SimpleIDProvierが認証し、その結果として発行された認証トークンを持っている人であれば、その人がSimpleIDProvierに登録されている人だということをAddCalculatorも確認することができます(もちろん認証トークンが他の人に盗まれない前提です)。

これを実現するため、SimpleIDProviderとAddCalculatorは双方で同じ共通鍵を持つようにし、SimpleIDProviderはメモリ中に持っているユーザ一覧の中に起動パラメータで渡されたIDとパスワードに合致するユーザがいる場合、そのユーザ情報に基づいた認証トークンを生成し、コンソールに出力するようにします。

AddCalculatorを利用する人には常に起動パラメータに認証トークンを設定してもらうことで本人表明してもらうようにし、共通鍵による検証がOKな場合に限り加算処理を行うようにします。

暗号鍵の性質からSimpleIDProviderが持っている共通鍵と同じ鍵を持っている人しかSimpleIDProviderと同じ認証トークンを生成することはできません。よって、認証トークンを検証し、その認証トークンのユーザを識別することは、SimpleIDProviderによる認証と同じ意味を持ちます。また、このように認証トークンを検証してユーザを識別することを一般的に「JWT認証」と呼びます。

## サンプルアプリの実装
では、上で説明したサンプルアプリがそれぞれどう実装されているかをみてきます。

SimpleIDProviderもAddCalculatorもいくつかのクラスから構成されているため、それぞれの構造とそれに対する実装を以降に示します。なお、実装をみてもらえば分かるとおり、使っているAPIは[トークンの生成と検証](#トークンの生成と検証)で説明したjava-jwtのAPIとJava標準のAPIのみとなるため、コードの説明は割愛します。

### SimpleIDProviderの構造と実装
![simpleidprovider-structure](/img/blogs/2022/1210_simpleidprovider-structure.drawio.svg)

- SimpleIdProvider
```java
public class SimpleIdProvider {

    private UserAuthenticator authenticator;
    private AuthTokenProducer jwtProducer;
    
    public SimpleIdProvider(UserAuthenticator authenticator, AuthTokenProducer jwtProducer) {
        this.authenticator = authenticator;
        this.jwtProducer = jwtProducer;
    }
    public String publishToken(String id, String password) {
        User authUser = authenticator.authenticate(id, password);
        return jwtProducer.generateToken(authUser);
    }

    public static void main(String[] args) {
        String secretkey = System.getenv("SECRET_KEY");
        String id = args[0];
        String password = args[1];
        SimpleIdProvider idProvider = new SimpleIdProvider(
                new UserAuthenticator(),
                new AuthTokenProducer(secretkey));
        String token = idProvider.publishToken(id, password);
        System.out.println(token);
    }
}
```

- UserAuthenticator
```java
public class UserAuthenticator {
    private static final List<User> USERS = List.of(
                new User("soramame", "emamaros", "そら豆 太郎"),
                new User("edamame", "emamade", "えだ豆 次郎"),
                new User("kuromame", "emamoruk", "くろ豆 三郎")
            );
    public User authenticate(String id, String password) {
        return USERS.stream()
                .filter(user -> user.id().equals(id))
                .filter(user -> user.password().equals(password))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("unkwon user."));
    }
}
```

- AuthTokenProducer
```java
public class AuthTokenProducer {
    private String secretKey;
    public AuthTokenProducer(String key) {
        this.secretKey = key;
    }
    public String generateToken(User user) {
        Algorithm alg = Algorithm.HMAC256(secretKey);
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
}
```

### AddCalculatorの構造と実装

![simpleidprovider-structure](/img/blogs/2022/1210_addcalculator-structure.drawio.svg)

- AddCalculator
```java
public class AddCalculator {

    private AuthTokenVerifier verifier;
    private AddOperator addOperator;
    
    public AddCalculator(AuthTokenVerifier authTokenVerifier, AddOperator addOperator) {
        this.verifier = authTokenVerifier;
        this.addOperator = addOperator;
    }
    public void calculate(int left, int right, String token) {
        DecodedJWT jwt = verifier.verifyToken(token);
        int result = addOperator.operate(left, right);
        System.out.println(jwt.getClaim("name").asString() + "さんからの依頼の"
                + "計算結果は" + result + "です");
    }
    
    public static void main(String[] args) {
        String secretkey = System.getenv("SECRET_KEY");

        int left = Integer.parseInt(args[0]);
        int right = Integer.parseInt(args[1]);
        String token = args[2];

        AddCalculator addCalculator = new AddCalculator(
                new AuthTokenVerifier(secretkey),
                new AddOperator());

        addCalculator.calculate(left, right, token);
    }
}
```

- AuthTokenVerifier
```java
public class AuthTokenVerifier {
    
    // JWTVerifierはスレッドセーフのため使いまわしてもOK
    private JWTVerifier verifier;
    
    public AuthTokenVerifier(String secretKey) {
        Algorithm alg = Algorithm.HMAC256(secretKey);
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
}
```

## サンプルアプリの実行
今回の共通鍵の暗号キーは`m@mez0u`としています。また、SimpleIDProviderとAddCalculatorのいずれも`-jar`オプションで起動可能なExecutable Jar形式でビルドしています。

では、まずSimpleIDProviderに登録されているsoramame/emamarosで、SimpleIDProviderを起動してみます。

```shell
export SECRET_KEY=m@mez0u
java -jar target/simple-idprovider.jar soramame emamaros

eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzb3JhbWFtZSIsImlzcyI6IkF1dGhUb2tlblByb2R1Y2VyIiwibmFtZSI6IuOBneOCieixhiDlpKrpg44iLCJleHAiOjE2NzA2NDI3NTIsImlhdCI6MTY3MDYzOTE1MiwianRpIjoiMzg4YjM4OTQtODk2NS00MTI2LTljNzEtYjQ3YWJhNzBmZThiIn0.e_tMPI8ZfRGyJUXFj1hCxaC6cVK0mPdIokAGaT4-GL8
```

認証が成功しsoramameのユーザ情報に基づいた認証トークンが生成されコンソールに出力されます。また、idに対するユーザが存在しない場合やパスワードが誤っている場合は、エラーとなり認証トークンは発行されません。したがって「認証トークンが生成された」＝「SimpleIDProviderに登録されている」となります。

では次にこの認証トークンを使ってAddCalculatorを起動しています。第1引数の3と第2引数の4は加算する2つの値となります。

```shell
export SECRET_KEY=m@mez0u
java -jar target/add-calculator.jar 3 4 eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzb3JhbWFtZSIsImlzcyI6IkF1dGhUb2tlblByb2R1Y2VyIiwibmFtZSI6IuOBneOCieixhiDlpKrpg44iLCJleHAiOjE2NzA2NDI3NTIsImlhdCI6MTY3MDYzOTE1MiwianRpIjoiMzg4YjM4OTQtODk2NS00MTI2LTljNzEtYjQ3YWJhNzBmZThiIn0.e_tMPI8ZfRGyJUXFj1hCxaC6cVK0mPdIokAGaT4-GL8

そら豆 太郎さんからの依頼の計算結果は7です
```

指定した認証トークンは確かにSimpleIDProviderにより生成されたもののため、認証トークンの検証はOKで足し算の結果が出力されます。

正しい認証トークンを使っていても面白くないと思うので、ペイロードの内容を改ざんしてみたり、暗号キーを変えてみたり、色々試してもらうことで、確かにSimpleIDProviderから発行された認証トークンでなければAddCalculatorの認証トークンの検証は通らないのを理解していただけると思います。

# まとめ
非常にシンプルなサンプルでしたが、JWT認証のシンプルさと強力さを理解いただけたかと思います。今回は紹介できませんでしたが、公開鍵方式によるトークンの生成と検証もほとんど同じように実装することができます。公開鍵方式でやった場合については[こちらの記事](/blogs/2022/12/25/rsa-java-jwt/)で紹介していますので、ご興味がある方は是非こちらもどうぞ。