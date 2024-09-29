---
title: Springの小話 - DataSouce構成の基本
author: toshio-ogiwara
date: 2024-09-29
tags: [java, spring, spring-boot, Springの小話]
image: true
---
Springといっても今回はSpring BootのDataSourceに関する小話です。  
データベース接続に使うDataSourceの構成はSpring BootのAutoConfigurationと`spring.datasource.*`の設定で自動で色々やってくれ便利ですが、その一方デバッグ時にあれ？なにがどこで設定されてるんだろう？？と考えたりすることはありませんか。私はなんど理解しても綺麗に忘れます。そこで今回は備忘録を兼ね、AutoConfigurationを使わず素の状態でDataSourceを構成する方法を説明したいと思います。素の構成を理解することでAutoConfigurationの裏で行われていることが分かってくるかと思います。

DataSourceの構成方法は「[Spring Bootのリファレンスドキュメント - カスタム DataSource を構成する](https://spring.pleiades.io/spring-boot/how-to/data-access.html#howto.data-access.configure-custom-datasource)」で説明されていますが、細かい内部動作までは説明されていません。このため、今回はこの内容を補足する形で説明しています。

TODO:くどいのでクラス名は``で括らなくてもいいっか

## パターン1:基本となる一番シンプルな構成
まずはSpring Bootは設定されている内容を単にDataSourceにバインドするだけの一番シンプルな構成例を見ていきます。この構成は次のようになります。

:::info: 説明の前提
この記事はSpring Boot 3.2.6で動作を確認しています。  
またspring-boot-starter-data-jpaの推移的依存により[H2 Database](https://www.h2database.com/html/main.html)と[HikariCP](https://github.com/brettwooldridge/HikariCP)がclasspath上にあることを前提に説明を行います。
:::

```yaml
app:
  datasource:
    jdbc-url: jdbc:h2:mem:mydb
    driver-class-name: org.h2.Driver
    username: sa
    password: pass
    maximum-pool-size: 30
```
```java
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties
class DataSourceConfig {
    @Bean
    @ConfigurationProperties("app.datasource") // (1)
    DataSource dataSource() {
        return DataSourceBuilder.create().build(); // (2)
    }
}
```
この構成によりDataSourceインスタンスがBeanとして登録されるまでの流れは次のようになります。

- (2)でSpringが標準でサポートしているDataSourceの実装クラスがclasspath上にあるかを確認し、ある場合はそのクラスのインスタンスの生成が`DataSourceBuilder`の`build()`メソッドで行われます。
- このため、DataSource実装を設定で明示しなくても`DataSourceBuilder`により、classpath上にあるDataSource実装が自動で選択されます。
- ただし、(2)は単にDataSourceインスタンスが生成されるだけで、ドライバークラス名や接続URLなどDB接続に必要なプロパティの設定は行われていません。（つまり、空のDataSourceインスタンス）
- DataSourceの利用には接続に必要なプロパティを設定する必要があります。これをやっているのが(1)になります。
- (1)の`@ConfigurationProperties`の指定があることで、`app.datasource`以下の設定が`datasource()`メソッドから返されたDataSourceインスタンスに対してバインドされます。
- 設定のバインドは`@ConfigurationProperties`の機能で行われるため、その作法に従い`app.datasource`のキー名は生成されるDataSourceインスタンスのプロパティ名に合わせる必要があります。

:::alert: @EnableConfigurationPropertiesは忘れずに
`@ConfigurationProperties`は次のように設定をバインドするクラスにつけ、`@EnableConfigurationProperties`にそのクラスを指定して有効化する使い方が一般的です。

```java
@EnableConfigurationProperties(SomeProperties.class)
class DataSourceConfig {
    @ConfigurationProperties(prefix = "app.datasource")
    class SomeProperties {
    ...
```

これに対してDataSourceの構成例では`@ConfigurationProperties`がメソッドについています。この指定の意味は上述のとおり、そのメソッドから返されたインスタンスに指定された設定をバインドするとなりますが、これを有効化するには実行時のコンテキストで`@EnableConfigurationProperties`が1つでも指定されている必要があります。

`@ConfigurationProperties`のバインド処理は`ConfigurationPropertiesBindingPostProcessor`により行われますが、このPostProcessorは`@EnableConfigurationProperties`がコンテキス含まれていることにより登録されます。したがって、`@EnableConfigurationProperties`で指定するクラスがない場合は、DataSourceの例のようにクラスは指定せず`@EnableConfigurationProperties`単独で指定する必要があります。ちなみに私はこの設定が分からず3時間くらいSpring Bootのコードと格闘しました...
:::

## パターン2:利用するDataSourceを指定したシンプルな構成
上述のパターン1はDataSource実装がclasspath上にある場合、利用するDataSource実装が自動で決定されますが、classpath上に複数のDataSource実装がある場合、利用するDataSourceを自分で明示したい場合があります。このような場合は次のようにして生成するDataSourceを指定することもできます。

```java
@Bean
@ConfigurationProperties("app.datasource")
public DataSource dataSource() {
    DataSourceBuilder.create()
        .type(HikariDataSource.class) // (1)
        .build();
}
```
※設定はパターン1と同じ

利用するDataSourceを明示する場合は(1)の`type()`メソッドでDataSource実装を指定します。


## パターン3:DataSourcePropertiesを使った統一的なプロパティ設定
これまで見てきた2つのパターンはいずれもDataSource実装が持つプロパティをそのまま設定ファイルに指定する必要がありました。

例えば、HikariCPの接続URLプロパティは`jdbcUrl(jdbc-url)`なのに対して、[Oracle UCP](https://docs.oracle.com/cd/F19136_01/jjucp/intro.html#GUID-82ACD002-4C5F-4BF7-99FF-46A2A97DD35D)は`url`となります。また、接続ドライバークラス名はHikariCPが`driverClassNaem(driver-clss-name)`なのに対して、Oracle UCPは`connectionFactoryClassName(connection-factory-class-name)`となります。

いずれも意味的に同じものですが、実装ごとにそのプロパティ名の確認が必要となるのはもちろんのこと設定の柔軟性も損なわれます。

この面倒くささを低減させてくれる機能として、Spring Bootでは`DataSourceProperties`が提供されています。`DataSourceProperties`は接続URL、ドライバークラス名、接続ユーザ、接続パスワードの4つのプロパティをDataSourceの実装に依らず、統一して扱えるようにしてくれます。この機能を利用した例が次になります。

```yaml
app:
  datasource:
    url: jdbc:h2:mem:mydb # jdbc-urlではなくurl
    driver-class-name: org.h2.Driver
    username: sa
    password: pass
    maximum-pool-size: 30
```
```java
@Bean
@ConfigurationProperties("app.datasource") // (1)
DataSourceProperties dataSourceProperties() {
    return new DataSourceProperties();
}
@Bean
DataSource dataSource(DataSourceProperties properties) { // (2)
    return properties.initializeDataSourceBuilder() // (3)
            .type(HikariDataSource.class)           // (4)
            .build();                               // (5)
}
```

この構成によりDataSourceインスタンスがBeanとして登録されるまでの流れは次のようになります。
- (1)により`app.datasource`以下の設定が`DataSourceProperties`インスタンスにバインドされる。
- (1)のインスタンスが(2)の引数として渡される。
- (3)の`initializeDataSourceBuilder()`で`DataSourceProperties`にバインドされた設定を引き継いだ`DataSourceBuilder`が生成される。
- (4)で生成するDataSource実装を指定。
- (5)の`build()`メソッドで(4)で指定されたDataSourceインスタンスが生成されるとともに、`url`は`jdbc-url`といったようにDataSourceに応じたプロパティ名の解決が行われ、そのプロパティに対して値が設定されたDataSourceインスタンスが生成される。

DataSource実装と`DataSourceProperties`のプロパティ名にギャップがある場合、`DataSourceBuilder`によりプロパティのマッピングが行われるため、DataSource実装に依らない統一的なプロパティ設定が可能となっています。

## パターン4:DataSourcePropertiesを使った固有プロパティの設定
パターン3では`maximum-pool-size`がどうなるかを説明しませんでした。この設定はどうなるのでしょう？  答えは設定されません。

`DataSourceProperties`にバインドされる設定は`DataSourceProperties`がサポートする`url`, `driver-class-name`, `name`, `password`の4つのみです。`@ConfigurationProperties("app.datasource")`の指定により`app.datasource`以下の5つの設定のバインドが`DataSourceProperties`に対して試みられますが、`maximum-pool-size`を受け取るプロパティはないため無視され、結果として`DataSourceBuilder`には渡りません。

`DataSourceProperties`にないDataSource実装に固有な設定を行う場合は、`DataSourceBuilder`ではなく、固有設定を別のネームスペースで定義し、その設定を`@ConfigurationProperties`でDataSourceインスタンスにバインドするようにします。この構成の例は次のようになります。

```yaml
app:
  datasource:
    url: jdbc:h2:mem:mydb
    ...(パターン3と同じ)
    configuration: # 固有設定としてネームスペースを追加する
      maximum-pool-size: 30
```
```java
@Bean
@ConfigurationProperties("app.datasource") // (1)
DataSourceProperties dataSourceProperties() {
    return new DataSourceProperties();
}
@Bean
@ConfigurationProperties("app.datasource.configuration") // (3)
DataSource dataSource(DataSourceProperties properties) { 
    return properties.initializeDataSourceBuilder()
            .type(HikariDataSource.class)
            .build(); // (2)
}
```

(1)から(2)までは上述のパターン4と全く同じで`DataSourceProperties`がサポートする4つのプロパティが設定されたDataSourceインスタンスが返されます。

違いは(3)になります。  
(3)により`datasource()`メソッドから返されたインスタンスに対して`app.datasource.configuration`の設定がバインドされ、結果`HikariDataSource`インスタンスの`maximumPoolSize`に`app.datasource.configuration.maximum-pool-size`の`30`が設定されます。

このように`DataSourceProperties`にないDataSource実装固有な設定を行う場合は、ネームスペースを別に定義し、インスタンス生成後に`@ConfigurationProperties`でバインドするようにします。


## パターン5:DataSourcePropertiesによるプロパティの自動設定
これまではDB接続に必要な設定をすべて明示的に設定していましたが、classpathの内容をもとに自動で設定してもらうこともできます。利用するDBがH2のような組み込みDBであれば、次にように共通プロパティの設定を不要とすることも可能です。

```yaml
app:
  datasource:
    configuration:
      maximum-pool-size: 30
```
※JavaConfigの実装はパターン4と同じものを再掲
```java
@Bean
@ConfigurationProperties("app.datasource")
DataSourceProperties dataSourceProperties() {
    return new DataSourceProperties();
}
@Bean
@ConfigurationProperties("app.datasource.configuration")
DataSource dataSource(DataSourceProperties properties) { 
    return properties.initializeDataSourceBuilder() // (1)
            .type(HikariDataSource.class)
            .build(); // (2)
}
```
これまでは`properties`インスタンスに共通プロパティが設定されている例でしたが、今回の例は`DataSourceProperties`にプロパティは設定されていません。設定されていないプロパティに対しては`initializeDataSourceBuilder()`メソッドで次のように設定値が決定さされます。

- `driverClassName`プロパティ
  - `url`プロパティが設定されている場合はそのURLもとに対応するドライバークラスを決定。これは`jdbc:h2:mem:mydb`のようにの接続URLの`jdbc:`の次がdatabase-typeになっていることをもとにしています。自動設定がサポートされるDBは[DatabaseDriver](https://github.com/spring-projects/spring-boot/blob/main/spring-boot-project/spring-boot/src/main/java/org/springframework/boot/jdbc/DatabaseDriver.java)に記載されています。
  - `url`プロパティが設定されていない場合は、classpath上に組み込みDBクラスがあるかを確認し、あればそのドライバークラスを`driverClassName`として返す。自動設定がサポートされる組み込みDBは[EmbeddedDatabaseConnection](https://github.com/spring-projects/spring-boot/blob/main/spring-boot-project/spring-boot/src/main/java/org/springframework/boot/jdbc/EmbeddedDatabaseConnection.java)に記載されています。
  - 上記以外はエラー
- `url`プロパティ
    - classpath上に組み込みDBクラスがあるかを確認し、あればその組み込みDBに対するデフォルトの接続URLを`url`プロパティとして返す(H2でれば`jdbc:h2:mem:%s;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE`となり、`%s`にはuuidが設定される)
    - 上記以外はエラー
- `username`プロパティ
    - classpath上に組み込みDBクラスがあるかを確認し、あればその組み込みDBに接続するためのデフォルトのユーザ名を返す(H2であれは`sa`)
    - 上記以外はエラー
- `password`プロパティ
    - `username`と同じ。(H2であれは空文字列)

この自動設定は`DataSourceProperties`の機能となるため、Auto-configurationは必要となりません。

## パターン6:複数のDataSource設定
ここまでの設定の意味が理解できればこれまで難解にみえていた複数DataSourceの設定も分かってくるようになります。ということで最後に複数DataSourceの設定例をみて終わりにしたいと思います。

```yaml
app:
  datasource:
    first:
      url: "jdbc:mysql://localhost/first"
      username: "dbuser"
      password: "dbpass"
      configuration:
        maximum-pool-size: 30

    second:
      url: "jdbc:mysql://localhost/second"
      username: "dbuser"
      password: "dbpass"
      max-total: 30
```
```java
// 1つ目の接続構成
@Bean
@Primary
@ConfigurationProperties("app.datasource.first")
public DataSourceProperties firstDataSourceProperties() { // (1)
    return new DataSourceProperties();
}
@Bean
@Primary
@ConfigurationProperties("app.datasource.first.configuration")
public HikariDataSource firstDataSource(
        DataSourceProperties firstDataSourceProperties) { // (2)
    return firstDataSourceProperties
        .initializeDataSourceBuilder()
        .type(HikariDataSource.class)
        .build();
}
// 2つ目の接続構成
@Bean
@ConfigurationProperties("app.datasource.second")
public DataSourceProperties secondDataSourceProperties() { // (3)
    return new DataSourceProperties();
}
@Bean
@ConfigurationProperties("app.datasource.second.configuration")
public BasicDataSource secondDataSource(
        @Qualifier("secondDataSourceProperties") DataSourceProperties secondDataSourceProperties) { // (4)
    return secondDataSourceProperties
        .initializeDataSourceBuilder()
        .type(BasicDataSource.class)
        .build();
}
```
2つのDataSourceインスタンスがBeanとして登録されるまでの流れは次のようになります。
- (1)で`app.datasource.first`以下の1つ目の接続情報をDataSourcePropertiesにバインド。
- (2)で接続情報がバインド済みの(1)の`DataSourceProperties`をもとにDataSourceインスタンスを生成し、その後に`@ConfigurationProperties`で固有プロパティをバインド
- (3)で`app.datasource.second`以下の2つ目の接続情報をDataSourcePropertiesにバインド
- (4)で(2)と同様に`DataSourceProperties`からDataSouceインスタンスを生成し、そのあとに固有プロパティをバインド
- この構成では`DataSourceProperties`のインスタンスが2つ登場するため、どっちのBeanをInjectするかの指定が必要となる。(2)は`@Qualifier`がないため、`@Primary`が指定されている(1)がInjectされる。(4)は2つ目の接続情報の(3)をInjectしてもらうため`@Qualifier("secondDataSourceProperties")`をつけている


ここまでの理解をもとに`DataSourceAutoConfiguration`の実装や`spring.datasource.*`の設定を改めてみてみるとこれまでとは違った見方ができるようになっているのではないでしょうか？このようなことを期待して今回の記事は終わりにしたいと思います。
