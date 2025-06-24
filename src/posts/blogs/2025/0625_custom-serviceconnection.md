---
title: Springの小話 - ServiceConnectionのオレオレ対応
author: toshio-ogiwara
date: 2025-06-25
tags: [testcontainers, Springの小話, spring-boot, spring, java]
image: true
---
Spring Boot 3.1からTestcontainersとの連携がしやすくなるServiceConnection機能が導入されました。使ってみると「これは便利だ！」と感じたのですが、対応しているのはPostgreSQLなど一部のミドルウェアに限られています。PostgreSQLなどのミドルウェアをコンテナで利用することは確かに多いですが、それと同じくらい対向のRESTアプリをコンテナ化し、スタブとして利用するケースも多いですが、独自コンテナに対してServiceConnectionはそのままでは使えません。

そこで今回はコンテナ化したRESTアプリを独自に（＝オレオレで）ServiceConnection対応させ`＠ServiceConnection`で接続できるようにする方法を紹介します。

Testcontainersについては説明はしませんので、そこから理解したいという方は下のブログも参考にしてもらえればと思います。

@[og](https://developer.mamezou-tech.com/blogs/2025/06/23/testcontainers-with-springboot/)

:::info
この記事は Spring Boot 3.5.3 で動作を確認しています。また記事で説明したコードはGitHubの [こちら](https://github.com/extact-io/testcontainer-sample) にすべてアップしています。
:::

## ServiceConnection対応前
まずはオレオレServiceConnection対応前のアプリですが、これは次のようになっています。記事ではこの例をもとにServiceConnection対応の方法を説明してきます。

- ServiceConnection対応前
```java
@SpringBootTest(webEnvironment = WebEnvironment.NONE)
class ContainerClientStep5Test {
    @Autowired
    private ContainerClient client;

    @Configuration(proxyBeanMethods = false)
    @Import(ClientApplication.class)
    static class TestConfig {
        @Bean
        GenericContainer<?> appContainer() {
            return new GenericContainer<>("container-app:latest")
                    .withExposedPorts(8080);
        }
        @Bean
        DynamicPropertyRegistrar targetUrlRegistrar(GenericContainer<?> appContainer, Environment env) {
            String destination = "http://" + appContainer.getHost() + ":" + appContainer.getFirstMappedPort();
            return registry -> registry.add("client.connect-url", () -> destination);
        }
    }
```


このアプリはRESTアプリを`container-app:latest`としてイメージ化し、それをTestcontainerの`GenericContainer`でインスタンス化しています。`GenericContainer`はクラス名のとおり、汎用のコンテナクラスでコンストラクタで指定されたイメージを実体化するものとなります。

このコンテナを使うクライアントアプリは`client.connect-url`プロパティからコンテナの接続先を取得し、その値をもとに [RestClient](https://spring.pleiades.io/spring-framework/reference/integration/rest-clients.html) を使ってコンテナのREST APIを呼び出しています。

`GenericContainer`はServiceConnectionに対応していないため、接続先情報の取得と設定は`DynamicPropertyRegistrar`を使って自分で行っています。

では、これをServiceConnectionに対応させるために必要な内容を順を追って説明していきます。


## ServiceConnectionの仕組み
ServiceConnectionに対応するための細かい話をする前に、そもそもServiceConnectionとはどのような仕組みかを説明します。

ServiceConnectionの仕組みはその対応前と対応後の設定情報の流れを比較するのがわかりやすいため、下の図を使って説明します。ただし、この部分に限っては先ほどの例ではなくPostgreSQLContainerを例に説明します。

![service-connection](/img/blogs/2025/0625_custom-service-connection/custome-service-connection.drawio.svg)


図がわかるようにServiceConnection対応前は、接続情報はあくまでも設定ファイル（プロパティ値）を経由して取得するものでした。これが対応後はコンテナインスタンスから取得した接続情報が直接使われるようになるのが一番大きな違いとなります。

接続情報が使われるまでのそれぞれの動き(1.～5.)を少し説明すると次のようになります（厳密には実装とは少し異なる部分がありますが、理解しやすいようにある程度丸めて説明をしています）。

1. `@Bean`が指定されているため、生成されたコンテナインスタンスがSpringのBeanとして登録されます。
2. Beanに`@ServiceConnection`が付けられている場合、Springは`spring.factories`から接続情報の取得を行う接続詳細ファクトリを取得します。Springは`spring.factories`に複数登録されているファクトリの中から、**Bean登録するコンテナインスタンスの型に合致するファクトリを取得します**。これは原則コンテナクラスごとにファクトリクラスが必要なことを意味します。
3. ファクトリは接続に必要な情報をコンテナインスタンスから取得します。
4. ファクトリは接続詳細のインスタンスを生成し、取得した接続情報をバインドします。また、この接続詳細インスタンスはSpringによりBeanとして登録されます。
5. 接続情報が欲しいBeanは接続詳細インスタンスをインジェクションで取得し必要な値を参照します。

この仕組みからオレオレでServiceConnection対応するために以下4点が必要なことがわかります。

- Testcontainersの独自コンテナクラス
  - 2.の手順からわかるようにSpringはコンテナインスタンスの型をもとに対応するファクトリクラスをマッチングさせるため、個別のクラスを作成する必要があります
- 接続詳細ファクトリ実装
  - 作成した独自コンテナクラスに対応するファクトリクラスの実装が必要となります
- 接続詳細
  - 取得した接続情報をバインドするためのインタフェースとその実装が必要となります
- `spring.factories`への登録
  - Springが作成したファクトリクラスを取得できるように`spring.factories`にファクトリクラスを登録します

## ServiceConnection対応の実装
ここまでの内容をもとに[対応前の例](#serviceconnection対応前)をServiceConnectionに対応させるために必要なものをあてはめると次のようになります。

![service-connection-classes](/img/blogs/2025/0625_custom-service-connection/custome-service-connection-classes.drawio.svg)

RESTアプリを扱うコンテナクラスは`RestAppContainer`として作成し、そのネーミングに合わせて他のクラスを作成しています。それではそれぞれの実装をみていきます。

#### ＜RestAppContainer＞
```java
public class RestAppContainer extends GenericContainer<RestAppContainer> {
    public RestAppContainer(@NonNull String dockerImageName) {
        super(dockerImageName);
    }
}
```
`RestAppContainer`の実体は`GenericContainer`と同じですが、ファクトリを検索するためのマーカーとして`GenericContainer`を継承した独自クラスを作成しています。


#### ＜RestAppConnectionDetails＞
```java
public interface RestAppConnectionDetails extends ConnectionDetails {
    String getConnectUrl();
}
```
`RestAppContainer`からの接続詳細を表すインターフェースとなります。接続詳細インターフェースはSpringの`ConnectionDetails`を継承する必要があります。


#### ＜RestAppContainerConnectionDetailsFactory＞
```java
class RestAppContainerConnectionDetailsFactory
    extends ContainerConnectionDetailsFactory<RestAppContainer, RestAppConnectionDetails> {

    @Override
    protected RestAppContainerConnectionDetails getContainerConnectionDetails(
            ContainerConnectionSource<RestAppContainer> source) {

        return new RestAppContainerConnectionDetails(source);
    }
    
    private static final class RestAppContainerConnectionDetails
    ... // ここの部分は後ほど出てきます
}
```
接続詳細ファクトリの実装はそれが接続詳細ファクトリであることを表すSpringの`ConnectionDetailsFactory`インターフェースを実装する必要があります。このインタフェースに対するスケルトン実装として`ContainerConnectionDetailsFactory`がSpringから提供されているため、今回はそれを継承するようにしています。

`ConnectionDetailsFactory`インターフェースはコンテナクラス(`RestAppContainer`)と接続詳細(`RestAppConnectionDetails`)の2つの型パラメータを必要とします。コンテナクラスはそのファクトリがどのコンテナクラスに対するファクトリなのかを意味し、接続詳細はそのファクトリが生成する接続詳細の型を意味します。つまり、ファクトリクラスのマッチングは基本的にファクトリクラスに定義されたコンテナクラスの型パラメータよって決定されます。

`ConnectionDetailsFactory`インターフェースに必要な実装は`ContainerConnectionSource`でされているため、必要な実装は接続詳細インターフェースに対する`RestAppContainerConnectionDetails`インスタンスを返すだけです。


#### ＜RestAppContainerConnectionDetails＞
```java
private static final class RestAppContainerConnectionDetails
    extends ContainerConnectionDetails<RestAppContainer>
    implements RestAppConnectionDetails {

    protected RestAppContainerConnectionDetails(ContainerConnectionSource<RestAppContainer> source) {
        super(source);
    }
    @Override
    public String getConnectUrl() {
        String host = getContainer().getHost();
        int port = getContainer().getFirstMappedPort();
        return "http://%s:%s".formatted(host, port);
    }
}
```
このクラスは`RestAppConnectionDetails`インターフェースの実装で、クラスの責務は接続先を返すだけですが、Springから接続詳細向けのスケルトン実装として`ContainerConnectionDetails`が提供されているため、せっかくなので今回はこれを継承しています。

このクラスの中心となる部分は`getConnectUrl`メソッドですが、実装はみてわかる通り、コンテナインスタンスからコンテナが稼働しているホスト(通常はlocalhost)とホスト側の公開ポートを取得して接続先として返していて、これがまさに「接続情報はコンテナが知っている」を表している部分となります。

#### ＜spring.factories＞
```shell
org.springframework.boot.autoconfigure.service.connection.ConnectionDetailsFactory=\
package.name.RestAppContainerConnectionDetailsFactory
```
最後に作成したファクトリ実装を`spring.factories`にFQCNで登録したら完成です。`spring.factories`がない場合は自分のプロジェクトの`META-INF`配下に普通のテキストファイルとして作成するだけでOKです。

これで自分が作った`RestAppContainer`で`@ServiceConnection`が使えるようになります。
ServiceConnection対応前のコードを次のように修正すると対応前と全く同じように動きます。

#### ＜ServiceConnection対応後＞
```java
@SpringBootTest(webEnvironment = WebEnvironment.NONE)
class ContainerClientStep6Test {

    @Autowired
    private ContainerClient client;

    @Configuration(proxyBeanMethods = false)
    @Import(ClientApplication.class)
    static class TestConfig {
        @Bean
        @ServiceConnection // ← つける
        RestAppContainer appContainer() {
            return new RestAppContainer("container-app:latest")
                    .withExposedPorts(8080);
        }
    }
    // DynamicPropertyRegistrarは不要
```

## さいごに
ServiceConnectionのオレオレ対応はいかがでしたでしょうか。仕組みが分かる前は黒魔術的な感じが若干あり、難しそうに思えましたが、理解できればそれほど難しいものではないかと思います。ServiceConnectionに対応することで`DynamicPropertyRegistrar`や`@DynamicPropertySource`の操作が不要となる直接的なメリットがありますが、それ以外にも提供側／利用側ともに接続に関するプロパティが必要なくなることに伴う認知負荷の軽減もあります。是非、オレオレを試してみていただければと思います。
