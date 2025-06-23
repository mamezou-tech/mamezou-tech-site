---
title: Springの小話 - ServiceConnectionのオレオレ対応
author: toshio-ogiwara
date: 2025-06-25
tags: [testcontainers, Springの小話, spring-boot, spring, java]
image: true
---
Spring Boot 3.1からTestcontainersのコンテナとの接続を簡単にできるようにするServiceConnectionが導入されました。使ってみると確かに便利でコレはいい！と思ったのですが、サポートされているのはPostgresなどのミドルウェアのコンテナばかりです。開発時には確かにPostgresなどのミドルウェアをコンテナで利用することは多いですが、コンテナを利用するもう一つの典型としては対向のRESTアプリをコンテナ化してスタブといて利用ケースがあります。

今回はこのコンテナ化したRESTアプリをオレオレでServiceConnection対応させて＠ServiceConnectionで接続できるようにする方法を紹介します。

Testcontainersについての説明はしませんので、そこから理解したいという方は下のブログをみてもらえればと思います。

@[og](https://developer.mamezou-tech.com/blogs/2025/06/23/testcontainers-with-springboot/)

:::info
この記事は Spring Boot 3.5.3 で動作を確認しています。また記事で説明したコードはGitHubの [こちら](https://github.com/extact-io/testcontainer-sample) にすべてアップしています。
:::

## ServiceConnection対応前
まずはオレオレServiceConnection対応前のアプリですが、これは次のようになっています。

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


元のアプリは対向のRESTアプリを`container-app:latest`としてコンテナイメージ化し、そのイメージをTestcontainerのGenericContainerでインスタンス化し、コンテナを開始しています。GenericContainerはクラス名のとおり、汎用のコンテナクラスでコンストラクタで指定されたイメージを実体化するものとなります。

このコンテナを使うクライアントアプリは`client.connect-url`プロパティからコンテナの接続先を取得し、その値をもとにコンテナのREST APIを呼び出す  [RestClient](https://spring.pleiades.io/spring-framework/reference/integration/rest-clients.html) のインスタンスを生成しています。

また、GenericContainerはServiceConnectionに対応していないため、接続先情報の取得と設定は自分でDynamicPropertyRegistrarを使って行っています。

では、これをServiceConnectionに対応するために必要なことを順を追って説明していきます。


## ServiceConnectionの仕組み
ServiceConnection対応するための細かい実装の話しをする前に、そもそもServiceConnectionはどのような仕組みになっているかを説明します。

この仕組みはServiceConnection対応前と対応後の設定情報の流れを比較した方がわかりやすいので、下の図を使って説明します。なお、この説明に限って例にTestcontainersのPostgreSQLContainerを使います。

![service-connection](/img/blogs/2025/0625_custom-service-connection/custome-service-connection.drawio.svg)


ServiceConnection対応前は図にあるように、接続情報はあくまでも設定ファイル（プロパティ値）を経由して取得するものでした。これに対してServiceConnection対応後は設定ファイル（プロパティ値）は登場することなく、コンテナインスタンスから取得した接続情報が直接使われるのが大きな違いとなります。

ServiceConnectionにより接続情報が使われるまでのそれぞれの動き(1.～5.)をそれぞれもう少し説明すると次のようになります（厳密には実装により少し異なる部分がありますが、理解しやすいようにある程度丸めて説明しています）。

1. Testcontainerのコンテナインスタンスに@Beanがつけられているため、Spring Boot(Spring)はそれをBeanとして登録します。
2. 登録するBeanに`@ServiceConnection`が付けられている場合、Springは`spring.factories`をもとに接続情報の取得を行う接続詳細ファクトリを取得します。Springは`spring.factories`に複数登録されているファクトリの中から、**Bean登録するコンテナインスタンスの型に合致するファクトリを取得します**。これはコンテナクラスごとにファクトリクラスを作成する必要があることを意味しています。
3. ファクトリは接続に必要な情報をコンテナインスタンスから取得します。
4. ファクトリは取得した接続情報をバインドする接続詳細のインスタンスを生成し、取得した値をバインドします。また、この接続詳細インスタンスはSpringによりBeanとして登録されます。
5. 接続情報が欲しいBeanは接続詳細インスタンスをインジェクションで取得し必要な値を取得・参照します。

この仕組みからオレオレでServiceConnection対応するためには以下の4点が必要となることがわかります。

- Testcontainersの独自コンテナクラス実装
  - 2.の手順からわかるようにSpringはコンテナインスタンスの型をもとに対応するファクトリクラスをマッチングさせるため、個別のクラスを作成する必要があります
- 接続詳細ファクトリ実装
  - 作成した独自コンテナクラス実装に対応するファクトリクラスの実装が必要となります
- 接続詳細実装
  - 取得した接続情報をバインドするためのインタフェースとその実装が必要となります
- spring.factoriesへの登録
  - Springが作成したファクトリクラスを取得できるようにspring.factoriesにファクトリクラスを登録します

## ServiceConnection対応の実装
ここまで説明した内容をもとに [ServiceConnection対応前](#serviceconnection対応前)の例をServiceConnection対応させるために必要なものをあてはめると次のようになります。

![service-connection-classes](/img/blogs/2025/0625_custom-service-connection/custome-service-connection-classes.drawio.svg)

今回はコンテナ化されたRESTアプリを扱うコンテナクラスを`RestAppContainer`として作成し、そのネーミングに合わせて他のクラスも作成しています。

それではそれぞれのクラスの実装をみていきます。

#### ＜RestAppContainer＞
```java
public class RestAppContainer extends GenericContainer<RestAppContainer> {
    public RestAppContainer(@NonNull String dockerImageName) {
        super(dockerImageName);
    }
}
```
RestAppContainerの実体はGenericContainerと同じですが、ファクトリを検索するためのマーカーとしてGenericContainerを継承した独自クラスになっています。


#### ＜RestAppConnectionDetails＞
```java
public interface RestAppConnectionDetails extends ConnectionDetails {
    String getConnectUrl();
}
```
RestAppContainerからの接続詳細を表すインターフェースとなります。インターフェースは接続詳細を表すSpringの`ConnectionDetails`を継承する必要があります。


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
接続詳細ファクトリの実装はそれが接続詳細ファクトリであることを表すSpringの`ConnectionDetailsFactory`インターフェースを実装する必要がありますが、このインタフェースのスケルトン実装として`ContainerConnectionDetailsFactory`がSpringから提供されているため、今回はそれを継承するようにしています。
`ConnectionDetailsFactory`インターフェースはコンテナクラス(`RestAppContainer`)と接続詳細(`RestAppConnectionDetails`)の2つの型パラメータを必要とします。コンテナクラスはそのファクトリがどのコンテナクラスに対するファクトリなのかを意味し、接続詳細はそのファクトリが生成する接続詳細を意味します。ですので、Springは`spring.factories`からファクトリクラスをマッチングさせる際は基本的にファクトリクラスに定義されたコンテナクラスの型パラメータを参照して決定します。

`ConnectionDetailsFactory`インターフェースに必要な実装は`ContainerConnectionSource`でされているため、必要な実装は接続詳細である`RestAppContainerConnectionDetails`のインスタンスを生成して返すだけです。


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
このクラスは`RestAppConnectionDetails`インターフェースの実装で、クラスの責務としてはコンストラクタで渡されたコンテナインスタンスから接続情報を取得し、接続先として返すだけですが、Springから接続詳細向けのスケルトン実装として`ContainerConnectionDetails`が提供されているため、今回はこれを継承しています。

こここで中心となる部分は`getConnectUrl`メソッドですが、その実装はみてわかる通り、コンテナインスタンスからコンテナが稼働しているホスト(通常はlocalhost)とホスト側の公開ポートを取得しています。ここがまさに「接続情報はコンテナが知っている」を表している部分となります。

#### ＜spring.factories＞
```shell
org.springframework.boot.autoconfigure.service.connection.ConnectionDetailsFactory=\
package.name.RestAppContainerConnectionDetailsFactory
```
最後にファクトリの実装クラスを`spring.factories`にFQCNで登録したら完成です。`spring.factories`がない場合は自分のプロジェクトの`META-INF`配下に普通のテキストファイルとして作成して問題ありません。

これで自分が作った`RestAppContainer`でめでたく`@ServiceConnection`が使えるようになります。
では、ServiceConnection対応前のコードを次のように修正して動かしてみましょう、対応前と全く同じように動きます。

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
ServiceConnectionのオレオレ対応はどうでしたでしょうか。仕組みが分かる前は黒魔術的な感じが若干あり、難しそうに思えましたが、理解できればそれほど難しくはないと思います。ServiceConnectionに対応することで`DynamicPropertyRegistrar`や`@DynamicPropertySource`の操作が不要となる直接的なメリットがありますが、それ以外にも提供側／利用側ともに接続に関するプロパティを説明する必要がなくなる認知負荷の軽減もあります。是非、オレレオ試してみていただければと思います。