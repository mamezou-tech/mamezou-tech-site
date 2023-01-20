---
title: MicroProfile RestClient 3.0の確認と小技機能の紹介
author: toshio-ogiwara
date: 2022-10-03
tags: ["逆張りのMicroProfile"]
prevPage: ./src/posts/msa/microprofile/cntrn09-mp-openapi3.md
nextPage: ./src/posts/msa/microprofile/cntrn17-mp-jwt.md
---

今回は[第8回](/msa/mp/cntrn08-mp-config3/),[9回](/msa/mp/cntrn09-mp-openapi3/)の続きとしてHelidon 3.0から使えるようになったMicroProfile RestClientの機能を紹介します。ただしMicroProfile RestClientは差分となる機能が多くないため、その差分を簡単に紹介した後に代わりとして以前のバージョンからあった小技的な機能を併せて紹介します。なお、今回の記事は[第7回 らくらくMicroProfile RestClient](/msa/mp/cntrn07-mp-restclient/)の理解を前提にしています。まだの方はそちらから読んでいただければと思います。

記事はコードの抜粋を記載します。全体を見たい場合や動作を確認したい場合は以下のGitHubリポジトリを参照ください。
- <https://github.com/extact-io/contrarian-microprofile-sample/tree/main/07-restclient_3.0>

MicroProfileをテーマにブログを連載しています。他の記事もよければ以下のリンクからどうぞ！
- [逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)


:::info
この記事はJava17+Helidon 3.0.1 + MicroProfile RestClient 3.0をもとに作成しています。
MicroProfile RestClientの詳細は[公式マニュアル](https://download.eclipse.org/microprofile/microprofile-rest-client-3.0/microprofile-rest-client-spec-3.0.html)を参照ください。
:::

# MicroProfile RestClient 3.0までの主な変更内容
MicroProfile RestClient(MP RestClient) 2.0から3.0までに利用者観点で取り入れられた主な機能は大きく次の2つになります。

1. RestClientBuilderに対するAPIの追加
2. [Server-Sent Events (SSE)](https://developer.mozilla.org/ja/docs/Web/API/Server-sent_events)のサポート

1.のRestClientBuilderに追加されたAPIは3つあります。それぞれの内容はこの後に紹介します。
2.のSSEのサポートは個人的にSSEはそれほど利用されていないと感じている点と筆者自身がそれほど詳しくないという理由から説明は割愛します。内容が気になる方は公式マニュアルの[こちら](https://download.eclipse.org/microprofile/microprofile-rest-client-3.0/microprofile-rest-client-spec-3.0.html#server_sent_events)に詳しく記載されています。

:::column:MP RestClientのバージョンと主な変更点
執筆時の最新メジャーバージョンとなるHelidon 3.0はMicroProfile 4.0の対応を飛ばして一気にMicroProfile 5.0へジャンプアップした形となります。このためMP RestClientのバージョンの動きと対応関係が掴みづらくなっていますが、整理すると次のようになります。

- MP RestClient 3.0
  - MicroProfile 5.0で取り込まれたバージョン。Helidonでは3.0で対応
  - Jakarta EE 9.1に対応し依存パッケージがjavax.*からjakarta.*に変更となった。機能自体はMP RestClient 2.0と同じ
- MP RestClient 2.0
  - MicroProfile 4.0で取り込まれたバージョン
  - 今回紹介した機能の他、依存関係の整理など内部実装の改善も行われる
- MP RestClient 1.4
  - MicroProfile 3.3で取り込まれたバージョン。Helidonでは2.xから対応
  - 小規模な変更がいくつか加えられた
:::

# RestClientBuilderに追加された3つのAPI
[第7回](/msa/mp/cntrn07-mp-restclient/)で紹介したRestClientの取得方法はインジェクションによるものだけでしたが、もう1つ、実行時にプログラムから接続先などの構成情報を指定して動的にインスタンスを生成する方法もあります。この動的な生成で利用するビルダークラスがRestClientBuilderになります。

このRestClientBuilderにMP RestClient 2.0でAPIが追加され、指定可能な構成情報が増えています。

なお、RestClientBuilderは今回の小技機能の1つとして[動的なRestClientインスタンスの生成](#動的なrestclientインスタンスの生成)として取り上げているので、そちらも参照ください。

## リダイレクトレスポンスへの追従
リダイレクトを指示する300番台のステータスコードを受信してもRestClientでリダイレクトさせることはできませんでした。しかしMP RestClient 2.0からRestClientBuilderに追加されたfollowRedirectsメソッドで機能を有効化することでリダイレクトが行えるようになります。

```java
RedirectClient client = RestClientBuilder.newBuilder()
                                         .baseUri(someUri)
                                         .followRedirects(true)
                                         .build(RedirectClient.class);
```
:::alert:説明に使用するサンプルコード
RestClientBuilderに追加された3つのAPIの説明に使用しているサンプルコードは[公式マニュアル](https://download.eclipse.org/microprofile/microprofile-rest-client-3.0/microprofile-rest-client-spec-3.0.html#_following_redirect_responses)のものを引用しています。このため[GitHubリポジトリのサンプル](https://github.com/extact-io/contrarian-microprofile-sample/tree/main/07-restclient_3.0)には含まれていません。
:::

## HTTPプロキシサーバーの指定
経由させるHTTPプロキシサーバをMP RestClient 2.0から指定することができるようになりました。HTTPプロキシサーバを指定する場合は、RestClientBuilderに追加されたproxyAddressメソッドでプロキシサーバを指定します。

```java
ProxiedClient client = RestClientBuilder.newBuilder()
                                        .baseUri(someUri)
                                        .proxyAddress("myproxy.mycompany.com", 8080)
                                        .build(ProxiedClient.class);
```

## 同じクエリパラメータで複数の値を送信する場合のスタイル指定
同じクエリパラメータに対して複数の値を送信する場合、その送信パラメータのスタイルはkey=value1&key=value2&key=value3やkey=value1,value2,value3など複数存在します。以前はスタイルを指定することができませんでしたが、MP RestClient 2.0からRestClientBuilderに追加されたqueryParamStyleメソッドで指定できるようになります。

```java
public interface QueryClient {
    Response sendMultiValues(@QueryParam("myParam") List<String> values);
}
```
```java
QueryClient client = RestClientBuilder.newBuilder()
                                      .baseUri(someUri)
                                      .queryParamStyle(QueryParamStyle.COMMA_SEPARATED)
                                      .build(QueryClient.class);
Response response = client.sendMultiValues(Collections.asList("abc", "mno", "xyz"));
```

指定可能なスタイルとしてQueryParamStyleには次の3つが定義されています。

|定数名|送信されるパラメータ例|
|-----|--------------------|
|MULTI_PAIRS|foo=v1&foot=v2&foo=v3|
|ARRAY_PAIRS|foo[]=v1&foo[]=v2&foo[]=v3|
|COMMA_SEPARATED|foo=v1,v2,v3|

### インジェクションでRestClientインスタンスを取得する場合
インジェクションでRestClientインスタンスを取得する場合は設定ファイルに構成情報を定義します。構成情報を指定するキーと設定内容は次のとおりです。

|構成情報|設定キーのsuffix|設定内容|
|-------|---------------|--------|
|リダイレクトレスポンスへの追従|followRedirects|有効化する場合はtrue|
|HTTPプロキシサーバーの指定|proxyAddress|経由させるサーバーアドレス|
|複数値のパラメータスタイル|queryParamStyle|スタイルの定数名|

表の設定キーはsuffixのため、設定する実際のキーは`{configKey}/mp-rest/ + 表のsuffix`となります。また、{configKey}部分は@RegisterRestClientのconfigKey属性で指定した値になります。

例えば`@RegisterRestClient(configKey = "web-api")`と指定されているRestClientのパラメータスタイルをCOMMA_SEPARATEDとする場合は`web-api/mp-rest/queryParamStyle=MULTI_PAIRS`となります。

MP RestClient 2.0で追加された機能の説明は以上となります。

# 便利な小技機能の紹介
ここからは[第7回 らくらくMicroProfile RestClient](/msa/mp/cntrn07-mp-restclient/)で紹介できなかったMP RestClient 1.4(Helidon 2.x)から使える便利な機能として次の3つを紹介します。

- 動的なRestClientインスタンスの生成
- HTTPヘッダーの設定
- REST APIの非同期呼び出し

また、ここからは次の簡単なRESTアプリケーションを使って説明していきます。

![overview](../../../img/mp/11-1_restclient3.drawio.svg)

説明に利用するこのRESTアプリケーションはHelloAggregateサービスが収集(/aggregate)のリクエストを受け取ると配下の3つのHelloサービスに挨拶(/hello)を問い合わせ、各Helloサービスは自身の言語に対する挨拶を返します。HelloAggregateサービスは各Helloサービスから返された挨拶をカンマ区切りで連結してまとめ、その内容をリクエスト元に返します。

なお、このRESTアプリケーションには紹介機能に対するユースケースとして次の3つの要件もしくは仕様があるものとします。

- 挨拶を返す3つのHelloサービスが公開するREST APIはすべて同じ。よって、HelloAggregateサービスからHelloサービスに対する呼び出しはすべて同じRestClientインタフェースで行うことができる
- Helloサービスを呼び出す際はHTTPヘッダにリクエスト日時を設定する
- HelloAggregateサービスから各Helloサービスへの呼び出しは非同期で行い処理を効率化する

## 動的なRestClientインスタンスの生成
各Helloサービスに対するRestClientインタフェースは同じですが呼び出すURLはそれぞれ異なります。このため、[第7回で説明した](/msa/mp/cntrn07-mp-restclient/#microprofile-restclientによる実装)接続先などの構成情報をRestClientインタフェースのアノテーションで指定するような静的なRestClientインスタンスの取得は今回のケースに向きません。

このような場合はRestClientBuilderを使って動的に必要な構成情報を指定します。

接続先が異なる3つのRestClientインスタンスをRestClientBuilderで生成するコードは次のようになります。

```java
private static final List<String> HELLO_SERVICE_URLS = List.of(
            "http://localhost:7002", // japanese hello service
            "http://localhost:7003", // english hello service
            "http://localhost:7004"  // chinese hello service
        );
private List<HelloRestClient> helloClients;

@PostConstruct
public void init() {
    // URLごとにRestClientインスタンスを生成
    helloClients = HELLO_SERVICE_URLS.stream()
            .map(url ->
                RestClientBuilder.newBuilder()     // 1. 
                    .baseUri(URI.create(url))      // 2. 
                    .build(HelloRestClient.class)) // 3.
            .toList();
}
```

1.でRestClientBuilderインスタンスを生成し、生成したビルダーインスタンスに2.の`baseUri`メソッドで接続先を指定します。最後に生成するインスタンスのRestClientインタフェースを3.の`build`メソッドで指定してRestClientのインスタンス生成します。

今回は接続先を動的に指定する例ですが、この他にも[RestClientBuilderに追加された3つのAPI](#restclientbuilderに追加された3つのapi)で紹介したような構成情報や[ResponseExceptionMapperなどのプロバイダ](/msa/mp/cntrn07-mp-restclient/#responseexceptionmapperインタフェースの実装)も指定することができます。

## HTTPヘッダの設定
MP RestClientにはHTTPヘッダの設定機能が用意されています。REST API呼び出しでは特定のHTTPヘッダの設定が必要になるケースはよくありますが、この機能を使うことでRestClientインタフェースを使いつつも柔軟なHTTPヘッダの設定を行うことができます。

HTTPヘッダの設定方法はいくつかあるため、今回の「リクエスト日時をHTTPヘッダに設定する」を題材にそれぞれの方法を見ていきます。

### @ClientHeaderParamによるHTTPヘッダの設定
RestClientインタフェースに`@ClientHeaderParam`を付けることで該当リクエストのHTTPヘッダに情報を設定することができます。

```java
@Path("/hello")
public interface HelloRestClient extends AutoCloseable {
    @GET
    @Produces(MediaType.TEXT_PLAIN)
    @ClientHeaderParam(name="X-Requested-Timestamp", value="{generateTimestamp}")
    String hello();
    default String generateTimestamp() {
        var formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss,SSS");
        return formatter.format(LocalDateTime.now());
    }
}
```

上記は`hello`メソッドで送信されるHTTPヘッダに`X-Requested-Timestamp`を追加し、その値に`generateTimestamp`メソッドの結果を設定する例となります。この例はメソッド定義に`@ClientHeaderParam`を付けているためHTTPヘッダが設定されるのはそのメソッドに対してだけですが、インタフェース定義に付けることで該当インタフェースの全てのメソッドに対して指定ができます。

また`value`属性には同一インタフェース内のメソッドを指定していますが、staticメソッドであれば他のクラスのメソッドも指定することができます。この場合の`value`属性には`"{some.pkg.MyHeaderGenerator.generateCustomHeader}"`のようにFQCN + "." + メソッド名で呼び出すメソッドを指定します。ここまで値を動的に設定する例を見てきましたが固定値も問題なく指定することができます。この場合は`value="sample"`のように設定したい値をリテラルで直接指定します。

### ClientHeadersFactoryによるHTTPヘッダの設定
決まったHTTPヘッダを常に送信するようなケースは`@ClientHeaderParam`で対応することができますが、条件によって送信するHTTPヘッダを変えるようなケースには対応できません。このようなケースにはClientHeadersFactoryインタフェースを実装して対応します。

- ClientHeadersFactoryインタフェースの実装例
```java
public class TimestampHeaderFactory implements ClientHeadersFactory {
    @Override
    public MultivaluedMap<String, String> update(
              MultivaluedMap<String, String> incomingHeaders,         // 1.
              MultivaluedMap<String, String> clientOutgoingHeaders) { // 2.
        var newHeadersMap = new MultivaluedHashMap<String, String>(clientOutgoingHeaders); // 3.
        if (!incomingHeaders.containsKey("X-Suppress-Timestamp")) {   // 4.
            newHeadersMap.add("X-Requested-Timestamp", generateTimestamp());
        }
        return newHeadersMap; // 5.
    }
    private String generateTimestamp() {
        var formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss,SSS");
        return formatter.format(LocalDateTime.now());
    }
}
```

ClientHeadersFactoryインタフェースのupdateメソッドに送信するHTTPヘッダを決定する処理を実装します。この実装の詳細は次のとおりです。

1. 引数 `incomingHeaders`には「外から入ってきたHTTPヘッダ」が渡ってきます。これはRestClientのメソッドを実行する契機となったリクエストのHTTPヘッダに相当します。
2. 引数`clientOutgoingHeaders`には「外に出そうとしているHTTPヘッダ」が渡ってきます。通常は空で渡ってきますが、`@ClientHeaderParam`など他の手段で既にHTTPヘッダーが設定されている場合は、そのヘッダ情報が渡ってきます。
3. `clientOutgoingHeaders`に設定されているヘッダ情報を伝播させるため、返却用のHTTPヘッダ(`newHeadersMap`)に内容を設定します。
4. HTTPヘッダでTimestampeの出力抑止が指定されていない場合に、返却用のHTTPヘッダに`X-Requested-Timestamp`を追加する例となります。
5. 返却したHTTPヘッダをもとにリクエストのHTTPヘッダが設定されます。

実装したClientHeadersFactoryクラスは`@RegisterClientHeaders`でRestClientインタフェースに指定します。

```java
@Path("/hello")
@RegisterClientHeaders(TimestampHeaderFactory.class)
public interface HelloRestClient extends AutoCloseable {
    @GET
    @Produces(MediaType.TEXT_PLAIN)
    String hello();
}
```

## REST APIの非同期呼び出し
ここまでの例はすべて同期によるREST API呼び出しでしたが、MP RestClientは非同期による呼び出しもサポートしています。

### 同期呼び出しのおさらい
非同期呼び出しを説明する前に今まで普通に使っていたRestClientの同期呼び出しを順を追っておさらいしたいと思います。

ここまでの例で使っていたHelloサービスのRestClientインタフェースは次のとおりです。この`hello`メソッドに対する呼び出しはレスポンスが返ってくるまで待ち続ける同期呼び出しになります（改まって説明していますが、いわゆる普通のメソッド呼び出しです）。

- Helloサービスを呼び出すRestClientインタフェース(再掲)
```java
@Path("/hello")
@RegisterClientHeaders(TimestampHeaderFactory.class)
public interface HelloRestClient extends AutoCloseable {
    @GET
    @Produces(MediaType.TEXT_PLAIN)
    String hello();
}
```

次にこのRestClientインタフェースを使ってHelloサービスを呼び出すHelloAggregateサービスの実装は次のようになります。

```java
@RequestScoped
@Path("/aggregate")
public class HelloAggregateResource {
    ...
    @GET
    @Path("/sync")
    @Produces(MediaType.TEXT_PLAIN)
    public String aggregateHello() {
        return helloClients.stream()                // 1.
                .map(HelloRestClient::hello)        // 2.
                .collect(Collectors.joining(", ")); // 3.
    }
    ...
```

1. `helloClients`のリストにはそれぞれ接続先の異なるHelloRestClientインタフェースのRestClientが格納されています。
2. `helloClients`からRestClientを1つずつ取り出し、HelloRestClientインタフェースをとおしてHelloサービスのREST APIを呼び出します。
3. 2.で取得した結果にカンマを付加しながら`helloClients`がなくなるまで2.と3.の処理を繰り返します。この際、2.のHelloサービスの呼び出しは同期呼び出しのため、結果が返ってくるまで次のHelloサービスが呼び出されることはありません。

最後に呼び出される側のHelloサービスの実装は次のとおりになります。

```java
@RequestScoped
@Path("/hello")
public class HelloServiceResource {
    private static Logger LOG = LoggerFactory.getLogger(HelloServiceResource.class);
    @Inject
    @ConfigProperty(name = "hello.message", defaultValue = "Hello!")
    private String hello;
    @GET
    @Produces(MediaType.TEXT_PLAIN)
    public String hello(@HeaderParam("X-Requested-Timestamp") String timestamp) throws Exception {
        LOG.info("Requested-Timestamp:{}/{}-service:request recieved", timestamp, this.hello);
        Thread.sleep(1000L);
        return this.hello;
    }
}
```

やっていることは`hello.message`に設定されている文字列を挨拶(`hello`メソッドの結果)として返す簡単なものですが、処理の先頭で[HTTPヘッダに設定されているリクエスト日時](#httpヘッダの設定)をログに出力するとともに、Helloサービスが同期で呼び出されていることが分かるように1秒間のスリープを入れています。

それでは、実際にHelloAggregateサービスから各Helloサービスが呼び出された際のログを見てみましょう。

```yaml
$ curl localhost:7001/aggregate/sync
[helidon-server-2] - Requested-Timestamp:2022-10-03 20:25:56,788/こんにちは-service:request recieved
[helidon-server-2] - Requested-Timestamp:2022-10-03 20:25:57,850/Hello-service:request recieved
[helidon-server-2] - Requested-Timestamp:2022-10-03 20:25:58,928/ニイハオ-service:request recieved
こんにちは, Hello, ニイハオ
```

Helloサービスが1秒間隔で呼び出されていることから、HelloAggregateサービスから同期で呼び出されていることが分かります。

### 非同期リクエスト送信の実装
ここからは、このHelloサービスを非同期で呼び出す実装を見ていきましょう。

非同期で呼び出す場合は次のようにREST APIの結果をCompletionStageインタフェースで受け取るようにします。

```java
@Path("/hello")
@RegisterClientHeaders(TimestampHeaderFactory.class)
public interface HelloRestClient extends AutoCloseable {
    @GET
    @Produces(MediaType.TEXT_PLAIN)
    CompletionStage<String> asyncHello(); // 結果のStringをCompletionStageで受け取る
}
```

この非同期呼び出しを実行する実装は次のようになります。

```java
@RequestScoped
@Path("/aggregate")
public class HelloAggregateResource {
    ...
    @GET
    @Path("/async")
    @Produces(MediaType.TEXT_PLAIN)
    public String asyncAggregateHello() {
        // 非同期処理の実行
        final CompletableFuture<String>[] futures = helloClients.stream()
                .map(HelloRestClient::asyncHello)   // 1.
                .toArray(CompletableFuture[]::new); // 2.
        // 非同期処理の結果受け取り
        CompletableFuture<Void> promise 
                = CompletableFuture.allOf(futures); // 3.
        return promise.thenApply(dummy ->           // 4.
            Stream.of(futures)
                    .map(CompletableFuture::join)   // 5.
                    .collect(Collectors.joining(", "))
        ).join();                                   // 6.
    }
```

非同期呼び出しのため「処理の実行」と「結果の受け取り」の大きく2つにコードが分かれます。

#### - 非同期処理の実行 -
Helloサービスの呼び出しは1.の`HelloRestClient::asyncHello`で行われます。この時点でREST API呼び出しが実行[^1]されますが、呼び出しは非同期で行われるため、即時に結果を取得することはできません。その代わりとして非同期呼び出しの完了を意味する`CompletableFuture`が返ってきます。

また`HelloRestClient::asyncHello`は結果を待つことのない非同期で行われるため、1.の非同期実行と2.の`CompletableFuture`の収集(collect)は即座に完了し、結果を受け取る3.以降の処理に移ります。

:::info:CompletableFutureへのキャスト
CompletableFutureはCompletionStageインタフェースの実装クラスとなります。1.のasyncHelloメソッドの戻り値はCompletionStageですが、後続の処理結果の取得でCompletableFuture#joinの呼び出しが必要になるため、予めCompletableFutureにダウンキャストしてインスタンスを収集(collect)しています。
:::

[^1]: 厳密には空きスレッドがない場合は待ちが発生します。


#### - 処理結果の受け取り -
今回の例は3.の`CompletableFuture.allOf(futures)`でHelloサービスの結果がすべて揃ってから処理を再開するように指定しています。

この際の`CompletableFuture.allOf(futures)`の結果として`promise`に格納されるものは「処理結果を返すことを約束する」的なものでHelloサービスからの結果そのものではありません。実際の処理結果は4.の`thenApply`メソッドに「全部の結果が揃ったときにコレを呼び出してネ」という意味で引数で渡すラムダ式で行います。

引数で渡されたラムダ式[^2]は2.で取得した`CompletableFuture`からそれぞの処理結果を5.の`join`メソッドで取得し、すべてをカンマ区切りで連結した文字列を返します。最後に非同期処理全体の完了を意味する`thenApply`メソッドの戻り値の`CompletableFuture`インスタンスから6.の`join`メソッドを使って最終的な処理結果を取り出します。

[^2]: `CompletableFuture.allOf`に対する`thenApply`メソッドで渡すラムダ式の引数は常にnullとなり意味を持ちません。このため例では`dummy`という変数名にしています。

今度はHelloAggregateから非同期で各Helloサービスが呼び出された際のログを見てみます。

```yaml
$ curl localhost:7001/aggregate/async
[helidon-server-9] - Requested-Timestamp:2022-10-03 20:27:10,422/こんにちは-service:request recieved
[helidon-server-4] - Requested-Timestamp:2022-10-03 20:27:10,435/Hello-service:request recieved
[helidon-server-6] - Requested-Timestamp:2022-10-03 20:27:10,454/ニイハオ-service:request recieved
こんにちは, Hello, ニイハオ
```

3つのHelloサービスが同時にリクエストを受け取っていることがログから分かります。加えて同期で呼び出した場合は3つのHelloサービスに対する処理時間はトータルで3秒でしたが、非同期にしたことで1秒で完了するようになったことが分かります。

:::info:CompletionStageとJakarta RESTful Web Services(JAX-RS)の非同期呼び出しについて
CompletionStageとその実装クラスのCompletableFutureはJavaSE 8から導入された非同期機能となります。そしてこの非同期機能をもとにJAX-RS 2.1(JavaEE 8)で導入されたのがReactive Client APIです。

MP RestClientの非同期呼び出しはベースにJAX-RSのReactive Client APIを使っているため、その詳細理解にはある程度のCompletionStageとReactive Client APIに対する理解が必要となります。記事ではこの2つに対する解説は行いませんが説明が必要な場合は下記情報などを参考にされることをお勧めします。
-	[JAX-RSによるリアクティブ・ プログラミング - Oracle](https://www.oracle.com/webfolder/technetwork/jp/javamagazine/Java-JF18-ReactiveProg.pdf)
-	[Java - CompletableFuture使用方法と例](https://codechacha.com/ja/java-completable-future/)

余談ですがJavaScriptに慣れている人であればCompletionStageはPromiseと同じようなものと思ってもらえば理解がしやすいと思います。
:::

以上で便利な小技機能の紹介は終了となりますが、最後にHelloAggregateサービス(HelloAggregateResource)のコードを全量記載しておきます。

```java
@RequestScoped
@Path("/aggregate")
public class HelloAggregateResource {
    private static Logger LOG = LoggerFactory.getLogger(HelloAggregateResource.class);
    private static final List<String> HELLO_SERVICE_URLS = List.of(
                "http://localhost:7002", // japanese hello service
                "http://localhost:7003", // english hello service
                "http://localhost:7004"  // chinese hello service
            );
    private List<HelloRestClient> helloClients;
    @PostConstruct
    public void init() {
        // URLごとのRestClientインスタンスを生成
        helloClients = HELLO_SERVICE_URLS.stream()
                .map(url ->
                    RestClientBuilder.newBuilder()
                        .baseUri(URI.create(url))
                        .build(HelloRestClient.class))
                .toList();
    }
    @GET
    @Path("/sync")
    @Produces(MediaType.TEXT_PLAIN)
    public String aggregateHello() {
        return helloClients.stream()
                .map(HelloRestClient::hello)
                .collect(Collectors.joining(", "));
    }
    @GET
    @Path("/async")
    @Produces(MediaType.TEXT_PLAIN)
    public String asyncAggregateHello() {
        // 非同期処理の実行
        @SuppressWarnings({ "unchecked" })
        final CompletableFuture<String>[] futures = helloClients.stream()
                .map(HelloRestClient::asyncHello)
                .toArray(CompletableFuture[]::new);
        // 非同期処理の結果受け取り
        CompletableFuture<Void> promise 
                = CompletableFuture.allOf(futures);
        return promise.thenApply(dummy ->
            Stream.of(futures)
                    .map(CompletableFuture::join)
                    .collect(Collectors.joining(", "))
        ).join();
    }
    @PreDestroy
    public void destroy() {
        // RestClientインスタンスに対するclose
        if (helloClients != null) {
            helloClients.forEach(client -> {
                try {
                    client.close();
                } catch (Exception e) {
                    LOG.warn("exception occurred during close processing..", e);
                }
            });
        }
    }
}
```

:::info:RestClientのclose
[公式のマニュアル](https://download.eclipse.org/microprofile/microprofile-rest-client-3.0/microprofile-rest-client-spec-3.0.html#lifecycle)には"RestClientインスタンスはopen/closeの状態を持っており、closeすることでリソースがクリーンナップされることが期待できる"と記載されています。HelloAggregateResourceはこれに従い@PreDestroyを使ってCDIが破棄される際にRestClientのclose処理を行っています。

HelloAggregateResourceのようにRestClientのライフサイクルがアプリケーション全体のライフサイクルよりも短い場合はclose処理は異論の余地なく行うべきですが、保持するCDI BeanがApplicationScopedだった場合のようにRestClientのインスタンスのライフサイクルがアプリケーション全体と同じとなるケースではclose処理を割愛しても実質的に問題ないと思われます。
:::

# まとめ
非同期処理は少し難しく感じられたかと思いますが、マイクロサービスはレイテンシが大きいネットワーク通信を使って複数サービスを協調動作させる仕組みのため、処理効率が求められる局面で非同期処理が必要なる場合があります。しかし一方で、非同期処理は見ていただいたとおり複雑になりがちで、同期処理に比べ実装の難易度は格段に上がります（もっというと問題発生時の原因特定も）。このため、現実的には同期呼び出しが基本となりますが、ここぞ！というときのために、非同期処理もマスターしておいて損はないと思います。
