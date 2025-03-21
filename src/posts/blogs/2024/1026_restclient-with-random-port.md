---
title: Springの小話 - RestClientのテストもRANDOM_PORTでやりたい！
author: toshio-ogiwara
date: 2024-10-26
tags: [java, spring, spring-boot, Springの小話]
image: true
---

今回の小話はRestClientを使ったテストについてです。TestRestTemplateだったら何も悩むことはなかったのにRestClientではどうすればいいの？という方は是非読んでいただければと思います。

:::info
この記事はSpring Boot 3.3.5で動作を確認しています。記事で説明したコードはGitHubの[こちら](https://github.com/extact-io/restclient-with-random-port)に一式アップしています。
:::

# ポート番号を取得する際の問題
Springに従来から用意されているTestRestTemplateであれば、テストで起動したTomcatなどのサーブレットコンテナがどのポートを使っているかを気にする必要はありませんでした。一方、RestClientにはTestRestTemplateのようなテストクラスは用意されていないため、RestClientを構成する際に自分でポートを明示的に指定する必要があります。

こんな時に便利に使えるのが`local.server.port`設定や`@Value("${local.server.port}"`のメタアノテーションの`@LocalServerPort`です[^1]。

[^1]: [組み込み Web サーバー#実行時に HTTP ポートを発見する :: Spring Boot - リファレンス](https://spring.pleiades.io/spring-boot/how-to/webserver.html#howto.webserver.discover-port)

Spring Bootはテストで起動したサーブレットコンテナのポート番号を`Environment`の`local.server.port`に設定してくれます。このためテスト実行時にポート番号が知りたい場合は、この設定を通して知ることができます。

そこで、この設定を使って、テストで使うRestClientを次のように構成したくなりますが、実はこれはできません。

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT) // (1)
class RestclientWithRandomPortApplicationTest {

    @Autowired
    private RestClient restClient; // (3)

    @Configuration(proxyBeanMethods = false)
    @EnableAutoConfiguration
    static class TestConfig {
        ...
        @Bean
        RestClient restClient(@Value("${local.server.port}") int port) { // (2)
            return RestClient.builder()
                    .baseUrl("http://localhost:" + port) // 宛先URLの指定
                    .build();
        }
    }

	@Test
	void testHello() {
	    String actual = restClient // (4)
	            .get()
	            .uri("/hello")
	            .retrieve()
	            .body(String.class);
	    assertThat(actual).isEqualTo("hello!");
	}
}
```

できない理由の前にテストコードの流れを簡単に説明すると
- (1)の指定でランダムポートでサーブレットコンテナを起動
- (2)の引数で`local.server.port`の設定を受け取り、そのポート番号を使って生成したRestClientインスタンスをBeanとして登録
- (3)の`@Autowired`で(2)で登録したRestClientインスタンスを受け取り
- (4)で(3)で受け取ったRestClientインスタンスを使ってテスト対象のコントローラー(`@RestController`)をテスト

となります。

Spring BootはDIコンテナであるApplicationContextの作成が完了した後にTomcatなどのサーブレットコンテナを起動します。`RANDOM_PORT`を使っている場合、ポート番号はサーブレットコンテナ起動後にしか決まらないため、その前に実行されるDIコンテナの起動中に`local.server.port`の設定を参照することはできません。

JavaConfigによるBeanの登録は当然ながらDIコンテナの起動中に行われるため、RestClientを構成しようとしても`RANDOM_PORT`の場合、その時点でポート番号が決まらないため、うまくいきません。これがダメな理由となります。（一工夫してうまくいかせる方法がありますがそれは後ほど紹介します）


Bean登録時にポート番号が決まらないのであれば、` restClient.get().uri("https://petclinic.example.com:" + port)`のようにリクエスト送信の都度、宛先URLを指定すればいいのでは？という考えもありますが、常に同じモノを都度指定しないといけなく、コードが冗長になるため、できたら避けたいです。

また、これとは別に下のHTTPインターフェースの利用例からわかるとおり、HTTPインターフェースでは宛先URLは指定せず、その基なるRestClientで宛先URLは決めておく必要があります。この意味でも宛先URLはRestClientのインスタンス生成時に決定しておきたいところです。

- HTTPインターフェースと組み合わせて利用する例

```java
// ポート番号が取得できない例
@Bean
RestClient restClient(@Value("${local.server.port}") int port) {
    return RestClient.builder()
            .baseUrl("http://localhost:" + port) // 宛先URLの指定
            .build();
}
// HelloServiceインターフェースのインスタンスをHTTPインターフェースの機能を使って生成
@Bean
HelloService helloService(RestClient restClient) {
    RestClientAdapter adapter = RestClientAdapter.create(restClient); // 基にするRestClient
    HttpServiceProxyFactory factory = HttpServiceProxyFactory.builderFor(adapter).build();
    return factory.createClient(HelloService.class);
}
// 生成したHelloServiceのインスタンスを使ってコントローラー(@RestController)をテスト
@Test
void testHello(@Autowired HelloService helloService) {
    String actual =  helloService.hello(); // 
    assertThat(actual).isEqualTo("hello!");
}
```

:::column:わたしはモックのテストがあまり好きではありません・・
いきなりですが筆者はMockitoなどのいわゆるモッキングライブラリを使ったテストはあまり好きではありません。モックによるテストはそもそもコードがわかりづらく、かつバイトコードレベルの内容をまさに黒魔術的に操作するため、ライブラリやJavaのバージョンによって挙動が変わったりとハマりどころが多いことがその主な理由です。

他にも避ける理由はあるのですが、挙げだすとキリがなく、批判的な話になっていくので、ここでやめておくとして、そのくらい好きではないため、単体テストは品質が確保されているものであればその実物を使いますし、下位モジュールの戻り値などの挙動をコントロールしたい場合や（あまりやりませんが）そのパスを通ったかの検証をしたい場合は、モックではなく、コントロールしたい対象のインターフェースをテスト実装したスタブ方式を好みます。

なぜこのような話したかというと、そのくらいモックは好みではないため、`@RestController`に対する単体テストは、もちろん`@WebMvcTest`ではなく、今回記事で紹介したRestClientを使って行っています。（とはいえプロジェクトのテスト方針がモック利用の場合はもちろんそれに従います）
:::

# 解決策その1：@BeforeAllでRestClientを作る
`RANDOM_PORT`の問題に対して考えられる1つ目の策としては`@BeforeAll` (または`@BeforeEach`)でRestClientのインスタンスを生成する案です。具体的には次のようになります。

```java
private static RestClient restClient;

// 解決策その1：@BeforeAllでRestClientを作る
@BeforeAll
static void beforeEach(@Value("${local.server.port}") int port) {
    restClient = RestClient.builder()
            .baseUrl("http://localhost:" + port)
            .build();

}
```

(`@SpringBootTest`にも内包されている)`SpringExtension`によるJUnitテストの`@BeforeAll`はSpringの起動後に呼び出されるため、`local.server.port`は設定されています。よって`@BeforeAll`では常にポート番号を取得することができます。

この案でもほとんどの場合困ることはありませんが、1つだけ困ることがあります。それはRestClientまたはそれを基にしたHTTPインターフェースをBeanとして扱いたい場合です。`@BeforeAll`の呼び出し時にはDIコンテナの処理は完了しているため、（頑張ればできますが）そこで生成したインスタンスをBeanとして登録することはできません。

したがって、RestClientをBeanとして扱いたい場合は振り出しに戻りJavaConfigでRestClientのインスタンスを生成する必要があります。

ということで次はJavaConfigでRestClientのインスタンスを生成する方法を紹介します。

# 解決策その2：宛先の決定を遅延させる
RestClientの宛先URLの指定には文字列を使っていましたが、宛先には`UriBuilderFactory`も使うことができます。宛先にファクトリが指定されている場合、宛先の解決(取得)はリクエストの送信時まで遅延されます。

このため`UriBuilderFactory`を次のように実装することで JavaConfigのBean生成時は宛先の取得方法だけを定義したファクトリを指定し、実際のポート番号の取得等は送信時に行うようにすることができます。

- `UriBuilderFactory`の実装例
```java
public class LocalHostUriBuilderFactory extends DefaultUriBuilderFactory {

    private Environment env;
    private String basePath;

    public LocalHostUriBuilderFactory(Environment env) {
        this(env, "");
    }
    public LocalHostUriBuilderFactory(Environment env, String basePath) {
        this.env = env;
        this.basePath = basePath;
    }

    // UriBuilderFactory
    @Override
    public UriBuilder uriString(String uriTemplate) {
        return super.uriString(localhostUriTemplate() + uriTemplate);
    }
    @Override
    public UriBuilder builder() {
        return super.uriString(localhostUriTemplate());
    }

    private String localhostUriTemplate() {
        return "http://localhost:" + env.getProperty("local.server.port") + basePath;
    }
}
```

- JavaConfigでのRestClientの生成例
```java
// 解決策その2：宛先の決定を遅延させる
@Bean
RestClient restClient(Environment env) {
    return RestClient.builder()
            .uriBuilderFactory(new LocalHostUriBuilderFactory(env)) // factoryでuriを指定
            .build();
}
```

`uriString`メソッドはリクエスト送信時に呼び出されるため、このメソッドで宛先文字列を作るようにしています。またコンストラクタには`uriString`メソッドで設定を取得できるように`Environment`を渡しておきます。


`UriBuilderFactory`の実装は必要となりますが、このようなクラスを用意しておくことで`RANDOM_PORT`を使った場合でも不自由なくRestClientを使うことができるようになります。

# さいごに
宛先の決定を遅延させる方法はそもそもTestRestTemplateはなんでランダムなポート番号を取得できているのだろう？と思い、TestRestTemplateの実装を確認し、そこから着想を得ました。TestRestTemplateには今回と同じような実装の`LocalHostUriTemplateHandler`クラスがあるのですが、RestClientにはありませんでした。このため同様なクラスを自作したのですが、なんとなくそれ程遠くない未来にSpringが同じような実装を作ってくれる気がします。もし1，2年後にこの記事を読んでいただけている方はまずはSpringの実装を確認されるのがよいかと思います。
