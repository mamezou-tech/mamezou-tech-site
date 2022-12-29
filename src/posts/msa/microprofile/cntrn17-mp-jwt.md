---
title: 第17回 MicroProfile JWT Authがやってくれること・できること
author: toshio-ogiwara
date: 2022-12-29
tags: ["逆張りのMicroProfile", Security, "認証/認可"]
prevPage: ./src/posts/msa/microprofile/cntrn16-mp-tracing.md
---
今回のテーマはJSON Web Token(JWT)を使ったMicroProfileアプリケーションの認証・認可に関するMicroProfile JWT Auth(MP JWT)です。MP JWTの仕様にはJWTをはじめBearerトークンやOpenID Connect(OIDC), Jakarta EE RBACなど他の規格や標準が多数登場するため難解でかつ、どこまでがMP JWTの話でMP JWTは結局なにをやってくれる仕様なのかがとても分かりづらくなっています。今回はこの辺りを踏まえMP JWTがやってくれること、MP JWTでできることをポイントに説明をしてきたいと思います。

なお、記事はコードの抜粋を記載しています。全体を見たい場合や動作を確認したい場合は以下のGitHubリポジトリを参照ください。
- [GitHub - extact-io/contrarian-microprofile-sample/11-jwt](https://github.com/extact-io/contrarian-microprofile-sample/tree/main/11-jwt)

また、MicroProfileをテーマにブログを連載しています。他の記事もよければ以下のリンクからどうぞ！
- [逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)

[[TOC]]

:::info
この記事はJava17+Helidon 3.0.2 + MicroProfile JWT Auth 2.0をもとに作成しています。
MicroProfile JWT Authの詳細は[公式マニュアル](https://download.eclipse.org/microprofile/microprofile-jwt-auth-2.0/microprofile-jwt-auth-spec-2.0.html)を参照ください。
:::
:::info: 前提知識
記事はJWTやJWT認証に対する基本的な理解があることを前提に説明を行っています。この辺りの理解に自信がない方や復習をされたい方は「[基本から理解するJWTとJWT認証の仕組み](/blogs/2022/12/08/jwt-auth/)」を一読されることをお勧めします。
:::

# MP JWTが提供する機能
MP JWTを理解する上で一番重要となるポイントから説明します。それは提供範囲です。

JWT認証の世界では、JWTを発行する側のIDプロバイダーとそのJWTを受け入れる側のアプリ(サービスプロバイダー)の2つが登場しますが、MP-JWTが機能を提供または規定しているのはJWTを受け入れるサービスプロバイダー側のみとなります。

IDプロバイダーに対してはMP JWTが受け入れるJWTの要件を定義しているだけでIDプロバイダーに対してMP-JWTが提供している機能はありません。つまり、MP-JWTはJWT認証を行うサービスプロバイダー側のアプリで使うものとなります。この点は混乱しないようにしてください。

:::check: MP JWTとOIDC(OpenID Connect)との関係
OIDCに関する記載がMP JWT仕様にあるため、IDプロバイダー側の機能に関するサポートや規定があるようにも一見みえますが、言及していることはクレームの相互運用に関することのみで、実質的なOIDCとの関係は「MP JWTでOIDCのJWT(IDトークン)も扱うことができる」というだけです。
実際、OIDCプロトコル以外で発行されたJWTをMP JWTで扱うことは普通にできますし、MP JWTからすればどのような手順で発行されたJWTかを意識することはありません。ですので、MP JWTとOIDCは基本的に関係ないものと考えた方が適当です。
:::

MP JWTはJWT認証を行う側のアプリに関するものという理解を得たところで、MP JWTが提供する機能を次に挙げていきます。

- JWT認証に関すること(JWT Auth)
  - リクエストでBearerトークンとして渡されたJWTの検証
  - インジェクションによるクレーム(Claim)値の取得

- JWTの伝播に関すること(JWT Propagation)
  - MP JWTにおける必須クレーム、標準クレーム、非標準クレームの定義とその扱いに関する規定

- セキュリティに関すること(JWT RBAC)
  - JAX-RS(Jakarta RESTful Web Services)のSecurityContextへのマッピング
  - groupsクレームをもとにしたJAX-RSのエンドポイントに対するロールベースアクセス制御(RBAC)

:::column: MicroProfile JWT Authに関する仕様名の揺らぎ
実装で使われている`org.eclipse.microprofile.jwt.*`パッケージをもとに記事ではMicroProfileのJWT認証に関する仕様名をMicroProfile JWT Authとしていますが、この用語に関して公式情報では次の3つ用語が使われています。
- [microprofile.io](https://microprofile.io/)の公式ページで使われている”JWT Propagation”
- [GitHubのリポジトリ名](https://github.com/eclipse/microprofile-jwt-auth)に使われている”JWT Auth”
- [Specification Document](https://download.eclipse.org/microprofile/microprofile-jwt-auth-2.0/microprofile-jwt-auth-spec-2.0.html)で使われている”JWT RBAC”

それぞれに明確に分かれた仕様がある訳ではなく、これらは本文で挙げた機能分類の通称として使われているだけと思われます(が、結局のところどれが正称なのかは筆者にも分かりません・・)
:::

# MP JWTを使った実装例
機能ごとの説明に行く前に説明で利用するサンプルアプリを説明します。

## サンプルアプリの構成
説明には商品の1件取得と全件検索、新規登録が行える簡単なRESTアプリケーション(商品サービス)を使います。商品サービスの利用には認証が必要となりますが、この認証は商品サービスとは別のSimpleIDProviderで行い、SimpleIDProviderで発行されたIDトークンを商品サービスのリクエストごとに提示するようにしてます。このサンプルアプリの全体のイメージは次のようになります。

![overview](../../../img/mp/17-sample-overview.drawio.svg)

SimpleIDProviderはMP JWTとは関係のないIDプロバイダー側のアプリとなるため記事では説明しませんが、その実装や暗号鍵の生成方法等は「[続・Auth0 java-jwtを使った素のJWT認証 - 公開鍵方式でやってみた](/blogs/2022/12/25/rsa-java-jwt/#jwt認証の実装)」と同じになります。詳細を知りたい方はそちらを参照ください。

## サンプルアプリの動作イメージ
どのようなアプリケーションかのイメージを掴んでもらうため、ここではその動作を簡単に紹介します。

1. JWT(IDトークン)の発行
   SimpleIDProviderをJavaコマンドで実行しJWTを発行します。サンプルではいくつかのユーザを用意していますが、ここではmemberグループの"そら豆 太郎"さんに対するJWTを発行します。次の引数で渡している`soramame`/`emamaros`はそら豆さんのIDとパスワードになります
   ```shell
   export KEY_PATH=/jwt.key
   java -jar target/rsa-simple-idprovider.jar soramame emamaros

   eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJzb3JhbWFtZSIsImlzcyI6IkF1dGhUb2tlblByb2R1Y2VyIiwibmFtZSI6IuOBneOCieixhiDlpKrpg44iLCJncm91cHMiOlsibWVtYmVyIl0sImV4cCI6MTY3MjM3NDgxMywiaWF0IjoxNjcyMjg4NDEzLCJqdGkiOiI5MTE2MzE4Zi01ODVlLTRlOWItODg0OC02MmVkMmM3Y2MxZGMifQ.audcrd83RlTemMV3NL77oBX2oIRFpRKOmL1GM75plrOqIw_6CU9oLq3HI3gQLscTwL4XmOsw4an2p4hb1SZSMw
   ```
2. JWT(IDトークン)の設定
   リクエストに設定するJWTは環境変数を経由して設定するようにしているため、1.で取得したJWTを`TOKEN`環境変数に設定します
   ```shell
   export TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJzb3JhbWFtZSIsImlzcyI6IkF1dGhUb2tlblByb2R1Y2VyIiwibmFtZSI6IuOBneOCieixhiDlpKrpg44iLCJncm91cHMiOlsibWVtYmVyIl0sImV4cCI6MTY3MjM3NDgxMywiaWF0IjoxNjcyMjg4NDEzLCJqdGkiOiI5MTE2MzE4Zi01ODVlLTRlOWItODg0OC02MmVkMmM3Y2MxZGMifQ.audcrd83RlTemMV3NL77oBX2oIRFpRKOmL1GM75plrOqIw_6CU9oLq3HI3gQLscTwL4XmOsw4an2p4hb1SZSMw
   ```
3. リクエストの送信(member権限)
   curlコマンドを使って商品サービスにリクエストを送信します。JWTは`Authorization`ヘッダでBearerトークンとして設定する必要があるため、`TOKEN`環境変数を展開しリクエストを次のように送信します
   ```shell
   # 商品の1件取得(ProductResource#get)
   curl -X GET -H "Authorization: Bearer $TOKEN" -w '->%{http_code}\n' \
        http://localhost:7001/products/1
   {"id":1,"name":"空を飛ぶ車","price":800,"registerBy":"PGM"}->200
   ```
   他の商品の全件検索(ProductResource#getAll)と追加(ProductResource#add)を呼び出すにはadmin権限が必要ですが、JWTを発行したそら豆さんはmember権限しかないため、呼び出しはエラー(403:Forbbiden)となります。
   ```shell
   # 商品の全件検索(ProductResource#getAll)
   curl -X GET -H "Authorization: Bearer $TOKEN" -w '->%{http_code}\n' \
        http://localhost:7001/product
   ->403

   # 商品追加(ProductResource#add)
   curl -X POST -H "Authorization: Bearer $TOKEN" -w '->%{http_code}\n' \
        -H "Content-Type: application/json" \
        -d '{"name": "baby car", "price": 120}' \
        http://localhost:7001/products/
   ->403
   ```
4. リクエストの送信(admin権限)
   admin権限を持つ"えだ豆 太郎"さんでリクエストを行ってみます。えだ豆さんのIDとパスワードの`edamame`/`emamade`で1.と2.の手順を再度行い、商品の全件検索と追加が行えることを確認します
   ```shell
   # 商品の全件検索(ProductResource#getAll)
   curl -X GET -H "Authorization: Bearer $TOKEN" -w '->%{http_code}\n' \
        http://localhost:7001/product
   [{"id":1,"name":"空を飛ぶ車","price":800,"registerBy":"PGM"},{"id":2,"name":"海を渡る自転車","price":1200,"registerBy":"PGM"},{"id":3,"name":"山を登る船","price":500,"registerBy":"PGM"}]->200

   # 商品追加(ProductResource#add)
   curl -X POST -H "Authorization: Bearer $TOKEN" -w '->%{http_code}\n' \
        -H "Content-Type: application/json" \
        -d '{"name": "baby car", "price": 120}' \
        http://localhost:7001/products/
   {"id":4,"name":"baby car","price":120,"registerBy":"edamame"}->200
   ```

# MP JWTの機能ごとの説明
ここからはサンプルアプリを例に[MP JWTが提供する機能](#mp-jwtが提供する機能)で挙げた個々の機能を説明してきます。

## JWT認証の実行
JWTは下記の例にあるように`Authorization`ヘッダでBearer トークンとして受け取ります。(`1NiJ9.TU3ZiJ9. 3ZzeQ`がJWT)

```shell
GET /resource/1 HTTP/1.1
Host: example.com
Authorization: Bearer 1NiJ9.TU3ZiJ9.3ZzeQ
```
Bearerトークンで受け取ったJWTに対する検証(JWT認証)はすべてMP JWTランタイムが行いますが、これには次の指定が必要となります。

### 認証範囲の指定
JWT認証を行う範囲としてJAX-RSの`Application`クラスに`@LoginConfig`を付けます。

```java
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.core.Application;
import org.eclipse.microprofile.auth.LoginConfig;
import io.extact.mp.sample.jwt.resource.ProductResource;

@LoginConfig(authMethod = "MP-JWT") // <-JWT認証の指定
@ApplicationScoped
public class ProductApplication extends Application {
    @Override
    public Set<Class<?>> getClasses() {
        return Set.of(
                ProductResource.class,
                ...);
    }
}
```

`@LoginConfig`の`authMethod`属性には`MP-JWT`を必ず指定します。この指定によりApplicationクラスで登録されたRESTリソースに対して認証制御が掛かるようになります。このApplicationクラスに対する`@LoginConfig`の設定は認証ポリシーの適用範囲を決定するレルム(realm)定義と同じとなります。事実、`@LoginConfig`には任意設定の属性として`realmName`が用意されています。

アプリケーションによっては認証(ログイン)を必要としないゲストユーザが参照可能なページと認証が必要なページが分かれる場合がよくあります。このような場合は認証が必要なAPIと不要なAPIはRESTリソースを別にし、登録するApplicationクラスを分けられるようにしてくのが無難です。

:::check: @PermitAllと@LoginConfigの優先度は仕様に明記されていない
@LoginConfigが付けられたApplicationクラスに登録されたRESTリソースのアクセスにはJWT認証が必要となりますが、例外としてjakarta.annotation.security.PermitAllアノテーションを付けたメソッドはJWT認証がバイパスされ誰でもアクセスが可能となります。

@LoginConfigは認証が必要であることを意味すのに対して@PermitAllは認可が不要という意味となり、@LoginConfigと@PermitAllは相反する設定となります。現時点のHelindonの実装や他のランタイムでは上述のとおり@PermitAllを優先した動作をしますが、MP JWTの仕様にはそのどちらが優先されるかは明記されていません。

筆者としては@LoginConfigが優先されるべきで、@PermitAllはあくまでもロールが不要、もしくはどのロールでもアクセスを許可する意味のため、認証まで不要となることには違和感を覚えるとともに意味的な不自然さを感じます。このため本文では「Applicationクラスを分けれるようにしてくのが無難です」という説明をしています。
:::

### 公開鍵の指定
Bearerトークンで受け取ったJWTを検証する公開鍵はMicroProfile Configのプロパティファイルに次のように指定します。

```shell
mp.jwt.verify.publickey.location=/jwt.pub.key
mp.jwt.verify.publickey.algorithm=RS256
```

上記はサンプルアプリの設定例となります。サンプルアプリは公開鍵をクラスパス上に配置(つまりjarに格納)しているため、設定はそのクラスパス上の位置となります。また、パスには`https://example.com/oauth2/default/v1/keys`のようなURLパスやフィルシステム上に配置した相対パスを指定することもできます。なお、非URLパスが指定された場合、パスは次の優先度で解決されます。
1.	new File(location)
2.	Thread.currentThread().getContextClassLoader().getResource(location)

もう一つの`mp.jwt.verify.publickey.algorithm`はJWTの署名アルゴリズムの指定になります。デフォルトは`RS256`のため、例のケースでは設定を省略することもできます。またMP JWTが標準でサポートする署名アルゴリズムとしては他に`ES256`があります。

:::check: 利用できるのは公開鍵方式のみ
MP JWTではHMAC-SHA256 (HS256)などの共通鍵方式によるJWT検証はサポートされていません。筆者としては限定的な相手との利用や閉域網での利用、開発環境での利用なども考慮し、共通鍵もサポートして欲しいなぁとは思っています。
:::

### JWTの検証
@LoginConfigと公開鍵の指定を行うことでJWTの署名に対する検証が行われるようになります。MP JWTではこれに加えJWTに対する以下の検証機能が用意されています。

- iss(発行者)クレームのチェック
    `mp.jwt.verify.issuer`が設定されている場合、受信したJWTのissクレームが設定値と同じかチェックされます。
    ```shell
    mp.jwt.verify.issuer=AuthTokenProducer
    ```
    上記はissクレームが存在しない場合も含めissの値が`AuthTokenProducer`以外は検証エラーとする設定となります。
- aud(受信者)クレームのチェック
    `mp.jwt.verify. audiences`が設定されている場合、受信したJWTのaudクレームが設定値のいずれかと同じかチェックされます。(audはカンマ区切りで複数指定可能)
    ```shell
    mp.jwt.verify.audiences=productService, adminService
    ```
    上記はaudクレームが存在する場合、audの値が`productService`と`adminService`のどちらでもない場合に検証エラーとする設定となります
- exp(有効期限)クレームのチェック
    MP JWTは受信したJWTのexp(有効期限)クレームが現在日時と比較し有効期限以内であることを常にチェックします(設定不要のデフォルト機能)

JWTの検証結果が1つでもNGとなった場合、MP JWTは認証エラーとしてステータスコードが401のレスポンスを返します。

## MP JWTにおける必須／推奨クレームの定義
MicroProfileアプリケーション間におけるJWTの相互運用性を考慮し、MP JWTは必須または推奨とするクレームを定義しています。

|区分|claim名|内容(定義元)|
|:------:|:----:|------|
|必須|iss| JWT発行者(RFC7519)|  |
| |iat |JWT発行日時(RFC7519)| |
| |exp |JWT有効期限(RFC7519)| |
| |upn |ユーザープリンシパル名(MP JWT固有)||
|任意 |sub |ユーザの識別子などJWTの主体(RFC7519)|
| |jti | JWTの一意な識別子(RFC7519)|
| |groups | グループ名で複数可(MP JWT固有)|

`upn`クレームが存在しない場合は`preferred_username`クレーム、`sub`クレームの順で取得がフォールバックされます。したがって、`upn`クレームが必須となっていますが`upn`, `preferred_username`, `sub`のいずれかがあればMP JWTのJWTとして許容されます。

## インジェクションによるクレーム値の取得
受信したJWTに対する検証が完了するとCDIとの連携機能によりインジェクションによりクレーム値を取得できるようになります。このクレーム値の取得には次に説明する2つの方法が用意されています。

### JsonWebTokenインタフェースによる取得
受信したJWTをMP JWTのJsonWebTokenインタフェースで取得する方法です。インタフェースには`iss`や`sub`、`groups`などMP JWTが必須または推奨するクレームのgetterやカスタムクレームを取得するための`getClaim(String)`が定義されています。また、JsonWebTokenインタフェースに加え、クレーム用途とクレーム値をenumで定義したClaimsが用意されています。このJsonWebTokenとClaimsの構造は次のとおりになります。

![class](../../../img/mp/17-jwt-interface.drawio.svg)

図から分かるとおり`JsonWebToken`インタフェースの親は`java.security.Principal`となっています。これは後述するJAX-RSのSecurityContextとの統合や、記事では説明していないMP JWTのオプション機能として用意されているJakarta Security API(JSR375)との統合のために設けられている関係となります。統合はMP JWTランタイム内で行われるためアプリケーションが`Principal`インタフェースを意識することはありません。

また、`Claims`には`email`や`gender`などOIDCなど他の標準で定められたクレーム[^1]も含まれていますが、これらのクレームは「[必須／推奨クレームの定義](#mp-jwtにおける必須／推奨クレームの定義)」と同様にアプリケーション間のクレームの相互運用性を目的として用意されています。メールアドレスや性別など`Claims`に定義されている情報をMicroProfileアプリケーション間でやり取りする場合は`Claims`を使うことで一貫性を保つことができます。

[^1]: どのクレームがどの標準で定義されているかは[JSON Web Token (JWT) - IANA](https://www.iana.org/assignments/jwt/jwt.xhtml)を参照

サンプルアプリでは取得した`JsonWebToken`インスタンスを`AuthUser`に変換する元ネタとして使っています。

```java
import jakarta.annotation.Priority;
import jakarta.enterprise.context.Dependent;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Inject;
import jakarta.interceptor.Interceptor;
import org.eclipse.microprofile.jwt.JsonWebToken;

@Dependent
@Priority(Interceptor.Priority.APPLICATION)
public class AuthUserProducer {
    // インジェクションによるJsonWebTokenインスタンスの取得
    @Inject
    private JsonWebToken jsonWebToken;
    // AuthUserをインジェクション可能にするProducerメソッドの実装
    @Produces
    public AuthUser authUser() {
        return new AuthUserImpl(jsonWebToken);
    }
    // JsonWebTokenに取得をdelegateするAuthUser実装
    static class AuthUserImpl implements AuthUser {
        private JsonWebToken jwt;
        AuthUserImpl(JsonWebToken jwt) {
            this.jwt = jwt;
        }
        @Override
        public String getUserId() {
            return jwt.getSubject();
        }
        @Override
        public String getName() {
            return jwt.getClaim("name").toString(); // maybe a Helidon bug..
        }
        @Override
        public Set<String> getGroups() {
            return jwt.getGroups();
        }
    }
}
```

変換はCDIのProducerメソッド(`@Produces`)で行っているため、変換した`AuthUser`インスタンスは他のCDI Beanからインジェクションで取得することができます。

```java
@ApplicationScoped
@Path("products")
public class ProductResource {
    ...
    // Producerメソッドの戻り値がインジェクションされる
    @Inject
    private AuthUser authUser;
```

### クレームごとの取得
JWT全体ではなくクレームを個別に取得したい場合は`@Inject`に`@Claim`(限定子)を付けることで取得することができます。

JsonWebTokenで説明したAuthUserへの変換を`@Claim`を使いクレームを個別に取得して行った場合のサンプルは次のようになります。

```java
import java.util.Set;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.jwt.Claim;
import org.eclipse.microprofile.jwt.Claims;

@RequestScoped
public class AuthUserBean implements AuthUser {
    @Inject
    @Claim(standard = Claims.sub)
    private String userId;
    @Inject
    @Claim("name")
    private String name;
    @Inject
    @Claim(standard = Claims.groups)
    private Set<String> groups;
    ...
}
```

`Claims`に定義されているクレームを取得する場合は`standard`属性にenum値を指定することができます。`Claims`に定義されていないカスタムクレームを取得する場合は`@Claim("name")`のようにクレーム名を直接指定します。

:::alert: @Claimを使う場合はCDIのライフサイクルに注意する
`@Claim`でインジェクションされる元ネタのJWTはリクエストごとに発生するデータとなります。

CDIはインジェクション対象となるオブジェクトにProxyを挟んでインジェクションすることでスコープが短いオブジェクトへの参照の切り替えを行っていますが、StringやLongなどのJavaの標準型に対してはProxyを生成することができないため、StringやLongのインスタンスが直接インジェクションされます。このため、次のようなRequestScopedより長いスコープのCDI Beanにクレーム値をインジェクションする場合は注意が必要です。
```java
@ApplicationScoped // ← RequestScopedより長いライフサイクル
public class AuthUserBean implements AuthUser {
    @Inject
    @Claim(standard = Claims.sub)
    private String userId; // ← Stringでクレーム値を受け取っている
    @Override
    public String getUserId() {
        return userId;
    }
    ...
}
```

この例の場合、CDI BeanはApplicationScopedのためフィールドに対するインジェクションは一度しか発生せず、かつインジェクションされるインスタンスはJavaの標準型のためProxyは作られず、フィールドの値は初回リクエスト時のクレーム値に固定されます。これは他人に自分のJWTが使われることになるため、セキュリティ上、非常に深刻なバグとなります。

この問題を回避するため、RequestScopedより長いスコープのCDI BeanにJavaの標準型のインスタンスをインジェクションする場合は、直接インジェクションするのではなく、次のように`ClaimValue`でラップしてインジェクションするようにします。
```java
@ApplicationScoped
public class AuthUserBean implements AuthUser {
    @Inject
    @Claim(standard = Claims.sub)
    private ClaimValue<String> userId; // ← ClaimValueで受け取るように修正
    @Override
    public String getUserId() {
        return userId.getValue();
    }
    ...
}
```
`ClaimValue#getValue`は常にカレントのリクエストに対するJWTからクレーム値を取得するため安全です。
:::

## JAX-RSとの統合
受信したJWTはMP JWTランタイムによりJAX-RSに連携され、JWTの存在を意識することなくクレームにもとづいた処理を行うことができます。

### SecurityContextへのマッピング
MP JWTのJAX-RS統合機能により、upnクレームとgroupsクレームの値がJAX-RSのSecurityContext[^2]にマップされます。具体的にはupnのクレーム値が`SecurityContext#getUserPrincipal`から返されるPrincipalインスタンス[^3]として使われ、そのPrincipalが持つロールとしてgroupsのクレーム値が使われます。

[^2]: FQCNは`jakarta.ws.rs.core.SecurityContext`となります。Jakarta Security APIの`jakarta.security.enterprise.SecurityContext`と混同しやすいので注意しましょう
[^3]: セキュリティのコンテキストでPrincipalは"本人確認やアクセス権の付与の対象となる主体"の意味となりますが、端的に「今システムにアクセスしているユーザ」と理解しておおよそ間違いはありません


`SecurityContext`はJAX-RSの`@Context`を使ってインジェクションで取得することができます。この取得した`SecurityContext`を使って次のようにアクセス制御をすることができます。

```java
@ApplicationScoped
@Path("products")
public class ProductResource {
    ...
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    // @Contextにより引数でSecurityContextを受け取る
    public List<Product> getAll(@Context SecurityContext context) {
        if (!context.isUserInRole("admin")) {
            throw new WebApplicationException(Status.FORBIDDEN); // 403 Forbidden
        }
        return productMap.values().stream()
                .collect(Collectors.toList());
    }
    ...
```

`SecurityContext#isUserInRole`は対象としているPrincipal(ユーザ)がこのロールを持っているか？を評価するメソッドですが、そのロールには上述のとおりgroupsのクレーム値が使われるため、結果としてgroupsのクレーム値がロール名として評価されます。

:::check: groupsクレームとロール(SecurityContext)のマッピング
グループとロールは本来別々の概念ですが、MP JWTはgroupsクレームとロールをデフォルトで1対1にマッピングします。あるユーザが"admin"のクレーム値を持っている場合、それは"admin"のロールを持っているモノとして扱われます。しかしそれでは困る場合があります。例えば以下のような場合です。
- アプリ側で管理しているロールの単位とグループの単位が違う。つまり1対1にマッピングできない
- groupsクレームはMP JWTだけの標準クレームのためOIDCやMP JWTをサポートしていないIDプロバイダーによって発行されたJWTにはそもそもgroupsクレームが含まれない

これに対してMP JWTでは「MP JWTラインタイムは他のクレームからグループをマップできます」としており、マッピングを変えることも許容しています。筆者の知る限りOpen Liberty(WebSphere Liberty) [^4]とQuarkusなどSmallRye JWTを利用するランタイム[^5]でこのマッピングの変更ができます(今のところHelidonではできません..)

[^4]: [Define role mapping for MicroProfile JWT - Open Liberty Docs](https://openliberty.io/docs/latest/reference/feature/mpJwt-1.1.html#_define_role_mapping_for_microprofile_jwt)にあるように`mpJwt`タグの`groupNameAttribute`属性でgroupsに利用するクレームを指定可能
[^5]: [JWT RBAC の使用 - QUARKUS]( https://ja.quarkus.io/guides/security-jwt#%E8%BF%BD%E5%8A%A0%E3%81%AE-smallrye-jwt-%E8%A8%AD%E5%AE%9A)にある`smallrye.jwt.path.groups`を設定することでgroupsに利用するクレームを指定可能
:::

### groupsクレームによるエンドポイントのアクセス制御
MP JWTのJAX-RS統合により`@RolesAllowed`の評価がgroupsクレームをもとに行われるようになります。`SecurityContext#isUserInRole`を使った先ほどのサンプルを`@RolesAllowed`を使って実装すると次のようになります。

```java
@ApplicationScoped
@Path("products")
public class ProductResource {
    ...
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @RolesAllowed("admin") // アノテーションによるアクセス制御
    public List<Product> getAll(@Context SecurityContext context) {
        return productMap.values().stream()
                .collect(Collectors.toList());
    }
    ...
```

サンプルは敢えて`SecurityContext#isUserInRole`と`@RolesAllowed`で同じことをやっているため違いがないようにみえますが、`@RolesAllowed`はエンドポイント単位(=メソッド単位)でのアクセス制御を行う場合に使うのに対して`SecurityContext#isUserInRole`はメソッドのある一部だけを対象にアクセス制御を行う場合に使うものとなります。

なお、アクセス権エラーが発生した場合はMP JWTランタイムにより403(Forbidden)のレスポンスが返されます。

# まとめ
MP JWTの設計思想にはIDプロバイダーとサービスプロバイダーの双方がMP JWT仕様に準拠することでJWTの相互運用性を高めることがあります。しかし、その一方でマイクロサービスはサービス間の関係を疎にすることでサービスごとの実装を自由にする目的があります。

このため、マイクロサービスを構成する各サービスがMicroProfileに準拠していることを前提とすることはマイクロサービスの思想と相容れない面があり、またSpring BootがデファクトとなっているJava開発の現状から、すべてのサービスがMicroProfileに準拠していることを前提にすることは難しいと思われます。

このようなことからMP JWTによる相互運用性のメリットは正直感じていません。では、MP JWTは使う価値のない仕様かというとそうとも思っていません。

MP JWTには相互運用性のメリットを差し引いてもJWT認証を理解しやすい仕様で簡便に行えるようにするという大きなメリットが残ります。ですので、筆者としては相互運用性という点を期待するのではなく、JWT認証を行う便利な機能としてMP JWTを使っていくのがよいのではないかと思っています。


