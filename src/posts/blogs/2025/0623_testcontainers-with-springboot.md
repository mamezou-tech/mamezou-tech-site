---
title: Springの小話 - Testcontainersの連携機能を理解する
author: toshio-ogiwara
date: 2025-06-23
tags: [java, spring, spring-boot, testcontainers, Springの小話]
image: true
---
ネット上のサンプルを見ていると、@Testcontainersアノテーションが付いていたり付いていなかったり、コンテナインスタンスのアノテーションが @Container だったり@Beanだったりと、どうやってTestcontainersを使うのが正解なのか迷うことが多いのではないでしょうか。どこまでがTestcontainers本来の機能で、どこからSpring Bootの連携機能（spring-boot-testcontainers）なのか、初見では分かりにくいですよね。

そこで今回は「素のTestcontainersの使い方」から「Testcontainersの便利機能」さらに「Spring Boot連携による進化」と段階的に洗練させていきながら、それぞれの役割や便利ポイントを理解できるようサンプルプログラムをもとに紹介していきます。

:::info
この記事は Spring Boot 3.5.3 で動作を確認しています。また記事で説明したコードはGitHubの [こちら](https://github.com/extact-io/testcontainer-sample) にすべてアップしています。
:::

## 最初にまとめ
時間がない方のために、まずはポイントだけ先にまとめます。

#### @Testcontainers
- これは（Spring Bootではなく）**Testcontainers**のアノテーション
-  `@Container`をつけたコンテナインスタンスの**ライフサイクルを自動で管理**してくれる

#### @Container
- これも**Testcontainers**のアノテーション
- テストクラスに`@Testcontainers`を付けることで、`@Container`がついたフィールドのコンテナインスタンスに対し**Testcontainersが自動的にstart()/stop()してくれる**
- テストメソッドごと、クラスごと（staticならクラス単位、非staticならメソッド単位）のスコープで管理が可能

#### @Bean
- SpringのDIコンテナに**コンテナインスタンスをBeanとして登録**すると、**Spring Bootの連携機能**（spring-boot-testcontainers）がコンテナのライフサイクルを**Spring側で管理**するようになる
- この場合、コンテナインスタンスの検出とライフサイクル管理はSpring Bootが自動で行ってくれるため`@Testcontainers`と`@Container`は不要

#### @ServiceConnection
- TestcontainersのコンテナをSpring Bootのアプリケーションサービス（DataSourceなど）と自動的に接続してくれるアノテーション
- 従来のようなプロパティ設定や`@DynamicPropertySource`などの操作を省略できシンプルにテスト環境を構築できる


## Step1: Testcontainers を素で使う

まずはTestcontainersのアノテーションを何も使わない素のTestcontainersの例を次のコードをもとに説明します。

```java
@SpringBootTest(webEnvironment = WebEnvironment.NONE)
public class PersonRepositoryStep1Test {
    // database名, username, passwordなどはPostgreSQLContainer内でデフォルトが設定されている
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine"); // (1)

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);        // (2)
        registry.add("spring.datasource.username", postgres::getUsername);  // (2)
        registry.add("spring.datasource.password", postgres::getPassword);  // (2)
    }

    @BeforeAll
    static void startContainer() {
        postgres.start();  // (3)
    }
    @AfterAll
    static void stopContainer() {
        postgres.stop();   // (4)
    }
    ...
```

最初なので少し丁寧にコードの意味を説明すると次のようになります。

- (1) で`postgres:16-alpine`のコンテナを司る`PostgreSQLContainer`のインスタンスが生成されますが、この時点ではコンテナは開始されていません
- (2) はコンテナに接続するために必要な情報をコンテナインスタンスから取得し、その値を`@DynamicPropertySource`で動的に設定しています
- コンテナは生成されただけで誰にも開始されていないため、JUnit5のライフサイクルメソッドを使って自分でコンテナの開始と終了を行っています

Testcontainersのアノテーションを使わない今回の例のような場合は下に示すTestcontainersの本体のみで動作します。
```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <scope>test</scope>
</dependency>
```

:::column:接続先って決まってるんじゃないの？
Postgresをコンテナでなにも指定せずデフォルトで起動した場合、接続ホストはlocalhost、ポートはPostgresのデフォルトの5432、データベース名は`postgres`のはずなのでワザワザ`@DynamicPropertySource`で動的に設定せず、設定ファイルに`spring.datasource.url=jdbc:postgresql://localhost:5432/postgres`って最初から書いておけばいいのでは？と思ったりしませんか？私はそう思いましたが、実はそうではないのです。

Testcontainersのコンテナクラスはインスタンス生成時にコンテナが持つ設定を変えることができます。`PostgreSQLContainer`であればそのコンテナ定義として次のように実装されています。

```java
static GenericContainer<?> postgres = new GenericContainer<>("postgres")
        .withExposedPorts(5432)
        .withEnv("POSTGRES_USER", "test")
        .withEnv("POSTGRES_PASSWORD", "test")
        .withEnv("POSTGRES_DB", "test")
```
※実際の実装とは違いますが、わかりやすく等価的なコードにしています

`withEnv`の指定からわかるとおり、`PostgreSQLContainer`を使ったときのユーザ、パスワード、データベース名のデフォルトは`test`に設定されています。また、`withExposedPorts`で指定されているのはコンテナ側が公開しているポートで、ホスト側で公開されるポートはランダムに決定されるエフェメラルポートとなります。このため、テストコードから接続に利用するホスト側のポートは事前にはわからず、わかるのは起動後のコンテナ自身のみとなります。このため接続先は必ず`postgres::getJdbcUrl`のようにコンテナインスタンスから取得する必要があります。

`withExposedPorts(5432)`から`docker run`コマンドの `-p 5432:5432`が指定されるように思えますが、5432が指定されるのは右側のコンテナ側のポートで左側のホスト側のポートはそれとは別のランダムなエフェメラルポートが指定されることは理解しておきましょう。

ちなみになぜエフェメラルポートが使われるのかはDocker公式の [Testcontainers のベスト プラクティス](https://www.docker.com/ja-jp/blog/testcontainers-best-practices/) に詳しく書かれています。
:::


## Step2: @Testcontainers と @Container を使ってみる
今度はTestcontainersがもつ`@Testcontainers`と`@Container`を利用したパターンを説明します。Step1をこの2つのアノテーションで書き換えると次のようになります。

```java
@SpringBootTest(webEnvironment = WebEnvironment.NONE)
@Testcontainers
public class PersonRepositoryStep2Test {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    // postgres.start()とpostgres.stop()は不要
```
<br>

Step1との大きな違いは `@BeforeAll`と`@AfterAll`でやっていたコンテナに対するstartとstopが不要な点です。`@Testcontainers`が指定されている場合、`@Container`がつけられたコンテナインスタンスのライフサイクル管理はTestcontainersがやってくれるようになります。ですので、Step1でやっていたコンテナインスタンスに対する`start()`と`stop()`の呼び出しは不要となります。

またコンテナのライフサイクルは`@Container`がstaticフィールドにつけられている場合のコンテナの開始終了はテストクラス単位となり、それに対して`@Container`が非staticフィールド（インスタンス変数）につけられている場合はテストメソッド単位となります。

`@Testcontainers`や`@Container`などのテストクラスで利用するアノテーションは本体とは別に含まれているため、利用には次のdependencyが必要となります。

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
```

## Step3: @Testcontainers を使わずSpring Bootの連携機能を使ってみる
Step2の例はSpring Bootの連携機能を使うことでTestcontainersのアノテーションを使わずに実現できるようになります。Step2の例をSpring Bootの連携機能を使って書き換えると次のようになります。

```java
@SpringBootTest(webEnvironment = WebEnvironment.NONE)
public class PersonRepositoryStep3Test {

    @TestConfiguration(proxyBeanMethods = false)
    @Import(ContainerApplication.class)
    static class TestConfig {
        @Bean
        PostgreSQLContainer<?> postgreSQLContainer() {
            return new PostgreSQLContainer<>("postgres:16-alpine");
        }
        @Bean
        DynamicPropertyRegistrar targetUrlRegistrar(PostgreSQLContainer<?> postgres) {
            return registry -> {
                registry.add("spring.datasource.url", postgres::getJdbcUrl);
                registry.add("spring.datasource.username", postgres::getUsername);
                registry.add("spring.datasource.password", postgres::getPassword);
            };
        }
    }
    ...
```

Springのコンテキストと動的設定の方法が少し変わっているのは別として、Step2との違いは`@Testcontainers`がなくなっているのとコンテナインスタンスのアノテーションが`@Container`ではなく`@Bean`になっている2点です。

Spring Bootの連携機能となる次のdependencyが含まれている場合、TestcontainersのコンテナインスタンスがBean登録されると、Bean登録時にSpringが自動でコンテナの開始(start()呼び出し)を行うようになります[^1]。

[^1]: コンテナの終了（stop呼び出し）はBeanが破棄されるタイミングで行われ、これは通常アプリケーションの終了時となります。

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-testcontainers</artifactId>
    <scope>test</scope>
</dependency>
```
<br>

Spring Bootの連携機能を使う場合、TestcontainersがやってくれていたことをSpring Bootがやってくれるようになるため、`@Testcontainers`と`@Container`は使う必要はなくなります。


## Step4: Spring Boot 3.1 以降の @ServiceConnection を使う
最後はSpring Boot 3.1で導入された`@ServiceConnection`を使った例です。他の例と同じようにStep3の例を`@ServiceConnection`を使って書き換えると次のようになります。

```java
@SpringBootTest(webEnvironment = WebEnvironment.NONE)
public class PersonRepositoryStep3Test {

    @TestConfiguration(proxyBeanMethods = false)
    @Import(ContainerApplication.class)
    static class TestConfig {
        @Bean
        @ServiceConnection
        PostgreSQLContainer<?> postgreSQLContainer() {
            return new PostgreSQLContainer<>("postgres:16-alpine");
        }
        // DynamicPropertyRegistrarのBean登録は不要
    }
    ...
```
<br>

Step3との違いはコンテナインスタンスに対し`@ServiceConnection`が追加になっている点と`DynamicPropertyRegistrar`のBean登録が不要になっていることの2点になります。

この違いから`DynamicPropertyRegistrar`でやっていた接続先情報の登録を`@ServiceConnection`をつけることで裏で良しなにやってるのだろうなということは想像できると思いますが、実際になにがやられているかを文章だけで説明するのは難しいため、図を使って説明すると次のようになります。

![service-connection](/img/blogs/2025/0623_testcontainers-with-springboot/service-connection.drawio.svg)

<br>

Step3ではEnvironmentのプロパティ値を取得し、その値を`PropertiesJdbcConnectionDetails`などの接続詳細オブジェクトにバインドすることまでをAutoConfigurationがやってくれています。そして、そのバインドされたオブジェクトはDataSourceなどのBeanを生成する際に参照されるようになります。このようにこれまでは設定ファイル（プロパティ値）に必要な設定をどう織り込むかがポイントでした。

これに対して`@ServiceConnection`では、コンテナインスタンスから取得した情報が直接設定情報オブジェクトにバインドされるため、設定ファイル（プロパティ値）を経由しなくてよくなっているのが大きな特徴となります。コンテナインスタンスに`@ServiceConnection`がつけられている場合、Springはコンテナインスタンスから対応する接続詳細オブジェクトを生成するBeanを介在させ、それにより①の取得&バインドの処理を実現しています。このあたりの仕組みは時間があるときに別のブログで詳しく説明したいと思います。


## さいごに
TestcontainersとSpring Boot連携のそれぞれの役割を理解できたでしょうか。このあたりが分かれば、シチュエーションごとに最適な構成が選べるようになるかと思います。
