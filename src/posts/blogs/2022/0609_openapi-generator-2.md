---
title: 第2回 イベントストーミングとドメイン駆動設計の戦略的設計
author: shigeki-shoji
date: 2022-06-09
tags: [java, "openapi-generator", "spring-boot", DDD, "実践マイクロサービス", ZTA]
---

この記事は、「[第1回 OpenAPI Generator を使ったコード生成](/blogs/2022/06/04/openapi-generator-1/)」の続編です。

この記事のコードは、[GitHub リポジトリ](https://github.com/edward-mamezou/use-openapi-generator/tree/feature/openapi-generator-2)に置いています。

前回の記事では、簡単に Spring Boot アプリが作成できるということを強調するためにシンプルな構成のコードにしていました。

ここで、少し現実感を持っていただくために、このアプリケーションを利用するストーリーを描いてみます。

現在、ある宇宙船の設計を行なっています。人類が多惑星種となるために、この船には冬眠カプセルが装備されています。冬眠していた旅人が目を覚ました時、"Good Morning, James" のように優しく挨拶する機能の実装を要求されています。そう、2017年に上映された「[PASSENGERS](https://www.sonypictures.jp/he/1261895)」のようにです。

早速、イベントストーミングに取り掛かり次のようなアウトプットを得ました。

![](https://github.com/edward-mamezou/use-openapi-generator/raw/feature/openapi-generator-2/event-storming/event-storming-1.png)

:::info
イベントストーミングは、「[モノリスからマイクロサービスへ](https://www.amazon.co.jp/dp/4873119316/)」や「[Learning Domain-Driven Design](https://www.amazon.co.jp/dp/B09J2CMJZY/)」で紹介されているドメイン境界を導きだす手法で、付箋の色によって、「ドメインイベント」(オレンジ)、「コマンド」(青)、「ポリシー」(紫)、「集約」(黄)、「外部システム」(ピンク) をホワイトボード等に時系列に並べて整理します。
:::

前回から作成している API はこの「挨拶の音声を生成する」というコマンドです。

ここで、いくつかアーキテクチャ上の決定事項を説明します。

- 冬眠カプセルが開いて、カプセル内の船員のファーストネームを取得するいわゆる認証プロセスについては、別のチームが開発中で、OpenID Connect の ID Token ペイロードの属性 "custom:firstname" に "James" のような名前が入ります。
- 同様に、ポリシーの「人間であること」つまりアンドロイドのような存在の場合には挨拶は不要であり、それを識別するために "custom:type" が "Human" の場合に人間であると判断します。

とはいえ、なるべく作成するコードにはこのような条件を意識したくないため、次のような構成で動作するアプリケーションとすることに決定しました。

![](https://github.com/edward-mamezou/use-openapi-generator/raw/feature/openapi-generator-2/image/openapi-generator-2.png)

:::info
サイドカーパターンは、「[分散システムの設計](https://azure.microsoft.com/ja-jp/resources/designing-distributed-systems/)」や「[Istio in Action](https://www.amazon.co.jp/dp/1617295825/)」で詳しい解説をみることができます。

外部からの接続 (inbound) を Envoy Proxy が受け取り、JWT である ID Token のヘッダに記述された暗号化アルゴリズム (`alg`)、公開鍵ID (`kid`) とペイロード部にある Issuer (`iss`) から [OpenID Connect Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata) 仕様にしたがって、`jwks_uri` にアクセスし `jwks.json` を取得し ID Token の署名を検証します。ペイロードの Audience (`aud`) には認証プロバイダに登録したアプリクライアントIDの値が入っているため、このアプリが予定している認証プロバイダにより発行された ID Token と一致するか確認します。さらに、有効期限 (`exp`) の値から有効期限を過ぎていないかを確認します。

今回のアプリケーションでは ID Token のペイロードに `custom:type` 属性が設定されていることを予定しています。この属性の値が `Human` であるかを確認します。

ここに書かれた認証認可を全てパスした場合のみ、Envoy Proxy は ID Token のペイロードを HTTP リクエストのヘッダ `payload` にセットしてメインのアプリケーションにルーティングします。

Envoy Proxy を使った認証認可については、後で紹介する[記事](#参考)も参照してください。
:::

今回の記事では音声イメージを生成する部分の実装はしていません。音声にするテキストの作成までを実装しています。

作成するコードのレイヤーは、「コントローラ」、「アプリケーション」、「ドメイン」、「インフラストラクチャ」に分けています。

## コントローラ層

コントローラのクラス名は前回作成した時と同じ [`ExampleApiController`](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-2/src/main/java/com/mamezou_tech/example/controller/api/ExampleApiController.java) です。

Envoy Proxy で ID Token で認証認可を行ったのち、ヘッダの `payload` にこの JWT Token のペイロードを設定したものが連携されるため、コントローラは、HTTP Request のヘッダにアクセスする必要があります。そのため、以下のようなメソッドを追加しています。

```java
    private final NativeWebRequest request;

    @Autowired
    public ExampleApiController(NativeWebRequest request, HelloService helloService) {
        this.request = request;
        this.helloService = helloService;
    }

    @Override
    public Optional<NativeWebRequest> getRequest() {
        return Optional.ofNullable(request);
    }
```

「[良いコード／悪いコードで学ぶ設計入門](https://www.amazon.co.jp/dp/B09Y1MWK9N/)」を読まれた方ならお気づきでしょうが、インスタンス変数は `final` にして、コンストラクタインジェクションとすることで、生焼けオブジェクトにならないようにコーディングしています。

:::info
「生焼けオブジェクト」とは簡単にいうと未初期化のインスタンス変数が残っているオブジェクトです。特にデフォルトコンストラクタと setter/getter でアクセスするように設計された実装では「生焼けオブジェクト」が発生しやすく、バグの温床になります。
:::

ここに登場する `HelloService` は、アプリケーション層のクラスで次に説明します。

## アプリケーション層

コントローラのレイヤーは単純に HTTP のハンドリングだけにとどめるようにしています。ヘッダから `payload` が得られたら、アプリケーションサービス [`HelloService`](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-2/src/main/java/com/mamezou_tech/example/application/HelloService.java) を呼び出すように実装しました。

主要なメソッドを抜粋します。

```java
    public Optional<HelloVoice> sayHello(final String jwtPayload) {
        Optional<String> maybePayload = Optional.ofNullable(jwtPayload);
        Optional<Person> maybePerson = maybePayload.flatMap(payload -> Optional.ofNullable(parseRequest(payload)));
        return maybePerson.flatMap(person -> Optional.ofNullable(voiceFactory.sayHello(person)));
    }
```

Optional の flatMap や map は値がある場合に実行され、変換された型を返します。つまり、`Optional<Person> maybePerson = maybePayload.flatMap(payload -> Optional.ofNullable(parseRequest(payload)));` は `jwtPayload` が null でない場合に `parseRequest(String)` が実行され、`Person` 型に変換されます。`parseRequest()` は JWT ペイロードから "custom:firstname" 属性の値を取得して `Person` 型に変換しています。

## インフラストラクチャー層

ドメイン層の前に、先にインフラストラクチャー層の説明をします。今回は、[Amazon Polly](https://aws.amazon.com/jp/polly/) を使用する予定の音声イメージの生成は実装していません。そのため、インフラストラクチャー層の実装はテキストを作成するだけのシンプルなコード ([`VoiceFactoryImpl`](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-2/src/main/java/com/mamezou_tech/example/infrastructure/VoiceFactoryImpl.java)) になっています。

```java
package com.mamezou_tech.example.infrastructure;

import com.mamezou_tech.example.domain.factory.VoiceFactory;
import com.mamezou_tech.example.domain.valueobject.HelloVoice;
import com.mamezou_tech.example.domain.valueobject.Person;

public class VoiceFactoryImpl implements VoiceFactory {

    @Override
    public HelloVoice sayHello(Person person) {
        String message = String.format("Good Morning, %s!", person.firstName());
        return new HelloVoice(message);
    }
}
```

## ドメイン層

この API のドメインには、集約、エンティティ、リポジトリ等はなく、バリューオブジェクトとファクトリーだけになりました。次以降で、音声イメージの生成まで実装した場合は、ドメインイベント「挨拶の音声が生成された」を実装することになるでしょう。

ファクトリー ([`VoiceFactory`](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-2/src/main/java/com/mamezou_tech/example/domain/factory/VoiceFactory.java)) は、`interface` で定義し、Spring の依存注入 (DI) によりインフラストラクチャー層の実装を取り込みます。

2 つのバリューオブジェクトは共に `record` で定義しました。

:::info
record は、JDK 14 と JDK 15 でプレビュー機能として導入され、[JDK 16 で正式に導入された機能](https://www.infoq.com/jp/news/2020/08/java16-records-instanceof/)です。
:::

ファーストネームを保持する [`Person`](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-2/src/main/java/com/mamezou_tech/example/domain/valueobject/Person.java) は次の通りです。

```java
package com.mamezou_tech.example.domain.valueobject;

public record Person(String firstName) {
}
```

今回は挨拶のテキストだけを保持することになる [`HelloVoice`](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-2/src/main/java/com/mamezou_tech/example/domain/valueobject/HelloVoice.java) は次の通りです。

```java
package com.mamezou_tech.example.domain.valueobject;

public record HelloVoice(String message) {
}
```

## テストコード

モダンな開発で、テストコードがないということは考えられません。今回作成したテストコードは十分とは考えていませんが、以下のコード ([`OpenApiGeneratorApplicationTests`](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-2/src/test/java/com/mamezou_tech/example/controller/api/OpenApiGeneratorApplicationTests.java)) を作成しています。

```java
package com.mamezou_tech.example.controller.api;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OpenApiGeneratorApplicationTests {

    private final String payload;

    OpenApiGeneratorApplicationTests() {
        final String jsonPayload = "{\"iss\":\"http://localhost\",\"custom:firstname\":\"James\",\"aud\":\"APPCLIENTID\",\"exp\":1654758757,\"custom:type\":\"Human\"}";
        payload = Base64.getUrlEncoder().encodeToString(jsonPayload.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void contextLoads() {
    }

    @Test
    void sayHello(@Autowired TestRestTemplate restTemplate) {
        RequestEntity<?> request = RequestEntity.get("/example/hello").header("payload", payload).build();

        ResponseEntity<String> response = restTemplate.exchange(request, String.class);
        Assertions.assertEquals(HttpStatus.OK.value(), response.getStatusCodeValue());
    }
}
```

認証認可で Envoy Proxy を使うサイドカーを採用したため、JWT トークンの Issuer (`iss`)、Audience (`aud`)、有効期限 (`exp`) 等を関心事から外してテストしやすいアーキテクチャが実現できています。

認証認可のような横断的関心事をサイドカーに分離しない場合は、アプリケーションに Spring Security などの依存を追加し、JWT トークンの `iss`、`aud`、`exp` の検証を行うだけでなく、さらに署名検証のために公開鍵の取得が必要になります。そして、人間であるかという認可処理の実装も必要になります。

その上アプリケーションでこの検証をクリアするために、テスト時に有効期限 (`exp`) 内の正しい署名付きの JWT トークンが必要になるなど、テスト設計が相当複雑になります。

## [継続的インテグレーションとデプロイ](/tags/ci/cd/)

GitHub リポジトリには GitHub Actions を使って、OpenAPI Generator で生成したモジュールを GitHub Packages にデプロイしています。

GitHub Actions の コードはリンク [`build.yml`](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-2/.github/workflows/build.yml) を参照してください。

## 実行

前回の[記事](/blogs/2022/06/04/openapi-generator-1/)同様に `gradle bootRun` で実行できます。アプリケーションに直接アクセスして確認するために、ヘッダに `payload` を設定してリクエストしてください。`curl` コマンドを使う例は次の通りです。

```shell
curl -H 'payload: eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0IiwiY3VzdG9tOmZpcnN0bmFtZSI6IkphbWVzIiwiYXVkIjoiQVBQQ0xJRU5USUQiLCJleHAiOjE2NTQ3NTg3NTcsImN1c3RvbTp0eXBlIjoiSHVtYW4ifQ==' http://localhost:8080/example/hello
```

:::info
JWT トークンは、3つのパートにわかれています。それぞれのパートは、文字 '.' で区切られた Base64 でエンコードされた文字列です。先頭のパートはヘッダ部でここには署名に使う暗号化アルゴリズムや公開鍵IDなどがJSON形式で設定されています。2番目のパートはペイロード (payload) と呼ばれる部分で、Issuer (`iss`)、Audience (`aud`)、有効期限 (`exp`) のように決められた属性の他、任意の属性を含めることができます。この記事では、このペイロードに "custom:firstname" や "custom:type" を含められていることを想定しています。ペイロードも JSON 形式です。最後の部分は署名です。ヘッダで指定された暗号化アルゴリズムを使った署名が設定されています。
この記事では、サイドカーが JWT トークンの検証を行い、ペイロード部のみを ヘッダ `payload` に設定してアプリケーションが呼び出されるように設計しています。ペイロードの元となる JSON は、[テストコード](https://github.com/edward-mamezou/use-openapi-generator/blob/647823e5c956714120eed8d107f57420abbae12f/src/test/java/com/mamezou_tech/example/controller/api/OpenApiGeneratorApplicationTests.java#L21)にある文字列です。これを Base64 に変換すると、"eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0IiwiY3VzdG9tOmZpcnN0bmFtZSI6IkphbWVzIiwiYXVkIjoiQVBQQ0xJRU5USUQiLCJleHAiOjE2NTQ3NTg3NTcsImN1c3RvbTp0eXBlIjoiSHVtYW4ifQ==" が得られます。
:::

## まとめ

今回、現実的なアプリケーションのレイヤー構造で説明しました。次回は、OpenAPI Generator のパラメータの説明をする予定です。

## 参考

- [良いコード／悪いコードで学ぶ設計入門](https://www.amazon.co.jp/dp/B09Y1MWK9N/)
- [Event Storming](https://www.eventstorming.com/)
- [S3 の静的 Web サイトをセキュアに Envoy でホスティング](/blogs/2022/03/26/hosting-a-static-website-using-s3-with-envoy-2/)
- [Envoy と Open Policy Agent を使用した認可](/blogs/2022/02/20/envoy-authz/)
- [Envoy を使用して ID Token (OIDC) を検証する](/blogs/2022/02/20/envoy-authn/)

## 関連記事

- [第1回 OpenAPI Generator を使ったコード生成](/blogs/2022/06/04/openapi-generator-1/)
  - 最初に OpenAPI Generator を使った簡単なサービスを実装します。
- [第3回 OpenAPI Generator 利用時の Generation Gap パターンの適用](/blogs/2022/06/17/openapi-generator-3/)
  - OpenAPI Generator のようなコード生成の活用でポイントとなる Generation Gap パターンについて説明します。
- [第4回 ドメイン層の実装とサービスの完成](/blogs/2022/06/24/openapi-generator-4/)
  - ドメイン駆動設計の戦術的設計によってサービスの実装を完成します。
- [第5回 Open Policy Agent とサイドカーパターンによる認可の実装](/blogs/2022/07/01/openapi-generator-5/)
  - サイドカーパターンで Open Policy Agent を使ってサービス全体を完成します。
