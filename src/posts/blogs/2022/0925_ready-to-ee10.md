---
title: Jakarta EE 10への準備 – まずは9.1へのバージョンアップ
author: toshio-ogiwara
date: 2022-09-25
tags: [java, mp]
---

2022/9/22に待望の[Jakarta EE 10がリリース](https://jakarta.ee/release/10/)されました。Jakarta EE 10に正式対応したプロダクト[^1]は現時点でまだありませんが、今後、続々と対応が発表されてくると思います。

対応プロダクトが揃ってきた頃にはバージョンアップを検討されると思いますがJakarta EE 10の一つ前のJakarta EE 9/9.1[^2]にはパッケージ名がjavax.*からjakarta.*へ変更される、いわゆる"破壊的な変更"が含まれています。このため、現時点で大多数が利用していると思われるJava EE 8（もしくはそれ未満）からのバージョンアップにはコード修正が必要なJakarta EE 9の壁があります。

そこで今回はJakarta EE 10に備えるためにアプリを実際にJava EE 8からJakara EE 9へバージョンアップした体験をとおしてバージョンアップに必要な作業やハマりどころなどをレポートしてみたいと思います。

[^1]: 各プロダクトのJakarta EE 10の対応状況は[JAKARTA EE COMPATIBLE PRODUCTS](https://jakarta.ee/compatibility/certification/10/)を参照。
[^2]: Jakarta EE 9.1はJakarta EE 9に対してJavaSE 11のサポートが加わっただけで内容的に違いはないため、記事では両者を区別せず表記しています。

[[TOC]]

## バージョンアップしたアプリの概要
バージョンアップに使ったアプリが利用しているフレームワークやJakarta EEの仕様は次のとおりです。

- アプリ
  - MicroProfile等の検証で利用しているSPAアプリ（GitHubは[こちら](https://github.com/extact-io/rms)）
- Framework
  - [Helindo MP 3.0.1](https://helidon.io/docs/v3/#/about/introduction)
- Jakarta EE(Java EE) Spec
  - CDI, JSON Binding, Annotations, Interceptors, RESTful Web Service(JAX-RS), JSON Processing, Dependency Injection, Bean Validation, Transactions(JTA), Persistence(JPA), Security

上記に含まれていないJakarta EE仕様については今回のバージョンアップ話の対象外となります。別途必要となる作業やハマりどころがあるかも知れませんのでその点は留意ください。

## まずはまとめから

結果だけ読んでもらっても十分な内容だったりもするため、結局必要になった作業やポイントをまずはまとめて紹介します。

- "javax."から"jakarta."の一括置換で必要な作業の9割くらいは完了
  - "javax."はソースコードだけでなく設定ファイルにもある可能性があるため、漏らさないようにプロジェクトの全ファイルを対象に検索／一括置換するのがお勧め
- JavaSEに含まれるjavaxパッケージは変えてはダメ
  - jakartaパッケージに変更になるのはJakarta EEのAPIだけ。よって、JavaSEに含まれるjavaxパッケージはjakartaに変更してはイケません
- ファイル名にFQCNを使っているものは要注意！
  - ファイルのキーワード検索ではファイル名の"javax."は引っ掛かりません。もし該当があった場合、気がつかずハマります。なので、ファイル名にも"javax."と付くものがないかを確認しましょう
- persistence.xmlのスキーマ定義は変更が必要
  - persistence.xmlは新しいバージョン3.0のスキーマを指定しないとエラーになります。他の設定ファイルはそのままでも動作はします

総論すると"javax."を"jakarta."に一括置換するだけでバージョンアップ後もホボホボ動作するようになります。動かない箇所もJUnitで検知したエラー場所をピンポイントで修正していくだけのため、Java EE 8からJakarta EE 9のバージョンアップ作業は個人的にはそれほど大変ではありませんでした。

ただし、これはJUnitなどの自動回帰テストを整備していたから言えることで、これがなかったらスゴク大変だったと思います。なので、今回の作業で自動テストの重要性を再認識した次第です。

まとめから紹介しましたが、ここからはそれぞれの内容を個別に紹介していきます。

## パッケージ名の変更
今まで使われていたjavaxのパッケージ名はJakarta EE 9からすべてjakartaに変更されます。これに伴いAPI.jarなどに含まれるJakarta EEのクラスもjakartaパッケージとして提供されるようになります。

このためJakarta EEのクラスやインタフェースに対するimport文は、すべてjavaxからjakartaに変更する必要があります。

- 変更前(Java EE 8)
```java
..
import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import javax.transaction.Transactional;
import javax.transaction.Transactional.TxType;
...
@Transactional(TxType.REQUIRED)
@ApplicationScoped
public class RentalReservationApplicationImpl implements RentalReservationApplication {
...
```
- 変更後(Jakarta EE 9)
```java
..
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.transaction.Transactional.TxType;
...
@Transactional(TxType.REQUIRED)
@ApplicationScoped
public class RentalReservationApplicationImpl implements RentalReservationApplication {
...
```

javaxのパッケージ名はキー名のプレフィックスなどにも多く使われているため、変更にあたってはこの点にも注意が必要です。筆者のアプリには該当として次のものがありました。

- 変更前(Java EE 8)
```yaml
test.db.connection:
  unitname: rms
  properties:
    javax.persistence.transactionType: RESOURCE_LOCAL
    javax.persistence.jdbc.driver: org.h2.jdbcx.JdbcDataSource
    javax.persistence.jdbc.url: jdbc:h2:mem:rms;INIT=RUNSCRIPT FROM 'classpath:init-rms.ddl'
    javax.persistence.jdbc.user: sa
    javax.persistence.jdbc.password:
...
```

`javax.persistence.*`の設定キーはテスト用のEntityManagerを生成するために必要な[EclipseLinkのプロパティ](https://www.eclipse.org/eclipselink/api/3.0/org/eclipse/persistence/config/PersistenceUnitProperties.html)を独自の設定ファイルに外出しして管理しているものです。


このようにjavaxからjakartaへの変更はソースコードだけとは限らないので注意しましょう。

## 無邪気にjakartaに変えてはいけないものがある
筆者はjakartaパッケージへの修正を一括置換で行いましたが、その中にはjakartaに修正してはいけないものもありました。筆者のアプリではDataSourceの実装に[HikariCP](https://github.com/brettwooldridge/HikariCP)を使っていますが、このライブラリはDBコネクションの設定キーに次のように`javax.sql.DataSource`を使っています。

```yaml
javax.sql.DataSource: # ← このキーはHikariCPが定義している
  rmsDataSource:
    dataSourceClassName: org.h2.jdbcx.JdbcDataSource
    dataSource:
      url: jdbc:h2:mem:rms;INIT=RUNSCRIPT FROM '${rms.h2.script}'
      user: ${rms.h2.user}
      password: ${rms.h2.password}
```

そしてこのキーがjakartaに変更してはいけないものでした。筆者も失念していましたがjavax.sqlパッケージはJavaSEに含まれるものでした。

Jakarta EE 9でパッケージが変更となるのはあくまでもJakarta EE(Java EE)に含まれるもののみです。よって、javax.sqlパッケージのようにJavaSEに含まれるjavaxパッケージはそのままにしておく必要があります（ホントにややこしいですね、、）
なお、これはソースコード中に表れるjavaxパッケージについても同じとなります。

今回のように本来は不要なパッケージ名を変更してしまったとしても、コンパイルもしくは実行時にエラーになるケースが大多数と思われます。また、"javax."のキーワード検索で該当箇所した個所は変更前に1つ1つ確認してくベキとは思いますが数が膨大です。このため、すべてを一括で変更し、その後エラーとなった箇所を確認修正していくやり方が現実的なのではと思っています。

## ファイル名にFQCNを使っているものは要注意！
キーワード検索で大部分の変更箇所を見つけることができますが注意が必要ものがあります。それはファイル名です。

筆者のアプリはCDI Extensionを使ってCDIを機能拡張していました。そして、この機能ですがJava EE 8までは拡張インタフェースのFQCNと同じファイル名が"javax.enterprise.inject.spi.Extension"のservicesファイルに拡張したクラスを登録するものでした。

- Java EE 8までのservicesファイル
```shell
META-INF
  |-- beans.xml
  `-- services
      `-- javax.enterprise.inject.spi.Extension # ← servicesファイル
```

それがJakarta EE 9から拡張インタフェースのFQCNがjakartaパッケージに変わったため、servicesファイルのフィル名をファイル名を次のようにする必要がありました。

- Jakarta EE 9からのservicesファイル
```shell
META-INF
  |-- beans.xml
  `-- services
      `-- jakarta.enterprise.inject.spi.Extension # ← servicesファイル
```

筆者のアプリも"javax.enterprise.inject.spi.Extension"のファイルを持っていましたが、ファイル名はテキストファイルのキーワード検索には当然引っ掛からないため、この修正を漏らしていました。

さらに不幸にも？CDI Extensionは拡張クラスがなければデフォルトで動作するため、エラーも発生せず一見正常に動作しました。このため、ファイル名の修正漏れに気がつくのにかなりの労力と時間を使いました。

筆者の場合はCDI Extensionでしたが、他にもjavaxがファイル名に含まれている可能性もあるため、ファイル名もjavaxでキーワード検索しておくことをお勧めします。

## xmlのスキーマ定義の変更
beans.xmlやvalidation.xmlなどJakarta EEが規定しているxml形式の設定ファイルはいくつかあります。良いか悪いかは別として今までのJava EEのバージョンアップでは大体ものは参照するスキーマ定義が古いままでも動作した記憶がありますが、Jakarta EE 9へのバージョンアップではpersistence.xmlのスキーマ指定の変更は必須となります。変更しない場合、起動エラーとなるため参照するスキーマ定義を次のように変更する必要があります。

- Jakarta EE 9(JPA 3.0)におけるpersistence.xmlのスキーマ定義
```xml
<persistence xmlns="https://jakarta.ee/xml/ns/persistence"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xsi:schemaLocation="https://jakarta.ee/xml/ns/persistence
                https://jakarta.ee/xml/ns/persistence/persistence_3_0.xsd"
             version="3.0">
```

Jakarta EEで規定されている他の設定ファイルとして筆者のアプリにはbeans.xmlとvalidation.xmlがありましたが、いずれも変更せずそのままでも問題なく動作しました。ただ古いままなのも気持ちが悪いためJakarta EE 9向けのスキーマ定義にそれぞれ次のとおりに変更しています。

- Jakarta EE 9(CDI 3.0)におけるbeans.xmlのスキーマ定義
```xml
<beans xmlns="https://jakarta.ee/xml/ns/jakartaee"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="https://jakarta.ee/xml/ns/jakartaee
            https://jakarta.ee/xml/ns/jakartaee/beans_3_0.xsd"
        version="3.0" bean-discovery-mode="annotated">
```

- Jakarta EE 9(Bean Validation 3.0)におけるvalidationのスキーマ定義
```xml
<validation-config
        xmlns="https://jakarta.ee/xml/ns/validation/configuration"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="https://jakarta.ee/xml/ns/validation/configuration
            https://jakarta.ee/xml/ns/validation/configuration/validation-configuration-3.0.xsd"
        version="3.0">
```

## まとめ
Java EE 8からJakarta EE 9には機能的な変更がない代わりにパッケージ名の修正が必要な破壊的な変更がありました。これに対してJakarta EE 9から10ではコード修正が必要となる破壊的な変更はない一方、機能的な追加・変更が多く入っています。

Java EE 8からJakarta EE 9へのバージョンアップで既存動作が変わった場合、パッケージ名の修正誤りに対する当たりを付けやすいですが、Java EE 8から一気にJakarta EE 10へバージョンアップした場合、パッケージ名誤りに加えてJakarta EE 10からの機能的な変更影響の可能性も含まれるため、その切り分け難しくなります。

Java EE 8からJakarta EE 9は機能的な変更がなく積極的にバージョンアップするモチベーションがないため、Java EEを利用しているアプリの大多数はJakarta EE 10への様子見状態だと推測しますが、Jakarta EE 10へバージョンアップする際はJakarta EE 9に対する必要な修正が正しくできていることを確認した後に10に移行する段階的バージョンアップを個人的にはお勧めします。

