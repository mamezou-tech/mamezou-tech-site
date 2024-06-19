---
title: JJUG CCC 2024 Spring 登壇後記 - Spring Boot vs MicroProfile セッションの補足と訂正
author: toshio-ogiwara
date: 2024-06-20
tags: [java, mp, spring, spring-boot]
image: true
---

先週日曜日(6/16)に開催された[JJUG CCC 2024 Spring](https://ccc2024spring.java-users.jp/)に『[Spring Boot vs MicroProfile - クラウドネイティブにおけるフレームワークの比較と選択](https://www.mamezou.com/news/event/20240616)』nのタイトルで登壇させていただきました。JJUG CCCの登壇はこれで2回目ですが、前回はオンラインとオフラインのハイブリット開催のため、会場の入りはまばらでしたが、今回は「こんなに人が入ってるワケないので会場を間違えた！？」と自分で思うほど、大勢の方に足を運んでいただけました。

肝心の発表内容は？というと、スライドが多めなのに余計なことをついついしゃべってしまい時間が足りなくなるという前回と全く同じ失敗をしましたが、本人としては伝えたいことは伝えられたのではないとかと満足していたりします。

セッション終了後には会場外やX(twitter)でいくつかご質問をいただきました。今回はその中から「確かにそれは？と思いますよね。」と感じた質問とそれに対する回答を3つほど登壇後記として書かせていただきます。なお、当日のセッション資料は[こちら](https://speakerdeck.com/ogiwarat/spring-boot-vs-microprofile-kuraudoneiteibuniokeruhuremuwakunobi-jiao-toxuan-ze)になります。


## `@PostConstruct`メソッドの初期化タイミングは仕様？
### <質問>
[13スライド](https://speakerdeck.com/ogiwarat/spring-boot-vs-microprofile-kuraudoneiteibuniokeruhuremuwakunobi-jiao-toxuan-ze?slide=13)で`@PostConstruct`の初期化メソッドについて、SpringはDIコンテナ起動時にコールバックが掛かるのに対して、CDI(MicroProfile)はBeanに対するメソッドが呼ばれるまで`@PostConstruct`の呼び出しは遅延されると説明があったが、CDIで呼び出しが遅延される挙動は、CDIの仕様ではなく、CDIコンテナの実装依存ではないでしょうか？


### <回答>

CDIの仕様になります。

CDIのSpecification(JSR)にズバリな記述はないですが、[CDI Lite](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0.html#initialization), [CDI Full](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0.html#initialization_full)それぞれで規定されているアプリケーションの初期化ライフサイクルでは、どちらも初期化時（起動時）に行われるのはBeanの検出までとなっています。このとこから分かるようにCDI Beanの実体となるBeanインスタンス(セッションの例では`BookController`のインスタンス)は起動時に作られません。

実際、CDIでは`@Dependent`や自作スコープを除く通常スコープのBeanに対してはすべてClientProxyが作成され、InjectionPointには実体のBeanインスタンスではなくClientProxyがインジェクションされます。この仕組みにより、Beanインスタンスの生成は実際にそのBeanが必要になるまで遅延するようになっています。

また、この挙動がQuarkusのCDI実装のArcとHelidonのWeldが同じになることは実際の動作で確認しています。

参考までにSpringはデフォルトでDIコンテナ起動時にBeanの実体となるインスタンスの生成を行います。Springでは`spring.main.lazy-initialization=true`とすることでCDIコンテナと同様にBeanインスタンスの生成を遅延させることができますが、遅延させた場合の`@PostConstruct`の挙動はCDIと同じとなります。ですので、`@PostConstruct`の初期化メソッドの呼び出しタイミングの違いはBeanインスタンスの生成されるタイミングによる違いといえます。

:::alert:SpringではLazy Initializationはあまり推奨されていない
[遅延初期化された Bean :: Spring Framework - リファレンス](https://spring.pleiades.io/spring-framework/reference/core/beans/dependencies/factory-lazy-init.html) には次のように書かれています。
> 一般に、構成や周囲の環境のエラーは数時間、場合によっては数日後ではなく、すぐに発見されるため、この事前インスタンス化が望ましいです。

これは裏返すと遅延初期化はエラーの発見が遅くなるための望ましくないということになります。

では、CDIはなぜ遅延初期化なのかというと、CDIはspecificationにも[明記](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0.html#deployment)されているとおり、デプロイ時にコンテナはBeanの依存関係の検証を行い、インジェクション対象が存在しないといった問題がある場合は例外を送出し、起動を失敗させます。ですので、遅延させても安全にインジェクションが行えるようになっています。資源の効率利用の観点からこの点についてはSpringよりもCDIの方が優れているといえます。
:::

## CDIのBeanの切り替えはProducerではダメなのか？
### <質問>
[15スライド](https://speakerdeck.com/ogiwarat/spring-boot-vs-microprofile-kuraudoneiteibuniokeruhuremuwakunobi-jiao-toxuan-ze?slide=15)でCDI(MicroProfile)には王道的なBeanの切り替え方法はないとのことで、Build compatible extensionsを使った例を紹介していましたが、CDIのProducer機能ではダメなのでしょうか？


### <回答>
セッションで使ったBookRepositoryの例であればProducerでもダメではありません。しかしProducerにはいくつか欠点があるため、Build compatible extensionsの方が常にベターと考えています。

BookRepositoryのBeanの切り替えをProducerを使って行う場合の模範的な実装は次のようになるかと思いいます。

```java
@ApplicationScoped
@Database // Qualifier
@Transactional
public class DatabaseBookRepository implements BookRepository {
...
```
```java
@ApplicationScoped
@InMemory // Qualifier
public class InMemoryBookRepository implements BookRepository {
...
```
```java
@Dependent
public class BookRepositoryProducer {
    private String type;
    @Inject
    public BookRepositoryProducer(Config config) {
        this.type = config.getValue("use.repository", String.class);
    }
    // Producerメソッドで候補のBeanを受け取り設定に応じた実装を返す
    @Produces
    BookRepository bookRepository(
            @InMemory BookRepository inmemory,
            @Database BookRepository database) {
        return switch (type) {
            case "inmemory" -> inmemory;
            case "jpa" -> database;
            default -> throw new IllegalArgumentException("Unexpected value: " + type);
        };
    }
}
```

Producerを使った場合の実装は他の場合でも凡そ上記のようになると思いますが、これには次の欠点がありあす。

1. コンパイル時にBeanの切り替え候補となるものが分かっている必要がある
2. 起動時に不要と判断できるBeanインスタンスもインスタンス化されコンテナに登録される
3. InterceptorもCDI BeanだがInterceptorには使うことができない

一方のBuild compatible extensions(もしくはPortable extensions)はこれらに対して制約なく使うことができます。ですので、常に何に対しても問題なく使うことができるBuild compatible extensionsが個人的にはベストプラクティスと考えています。

## MicroProfile JWTでもaudクレームは検証可能では？
## <質問>
[26スライド](https://speakerdeck.com/ogiwarat/spring-boot-vs-microprofile-kuraudoneiteibuniokeruhuremuwakunobi-jiao-toxuan-ze?slide=26)でMicroProfile JWTで可能なJWTの検証内容は公開鍵、有効期限、Issuerクレームのみといっていましたが、Audience(aud)クレームも検証可能ではないでしょうか？

### <回答>
ご指摘のとおり、[MicroProfile JWT 2.1](https://download.eclipse.org/microprofile/microprofile-jwt-auth-2.1/microprofile-jwt-auth-spec-2.1.html#_mp_jwt_verify_audiences)からAudience(aud)クレームも検証可能となっていました。ご指摘ありがとうございます。スライド資料を修正させていただきました。


セッションに対する質問と回答の紹介は以上となります。質問をしていただいた皆さん、ありがとうございました。理解を深めることができました。

