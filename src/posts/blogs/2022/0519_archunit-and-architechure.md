---
title: ArchUnitで考えるアーキテクチャ構造とその検証
author: toshio-ogiwara
date: 2022-05-19
---

[「進化的アーキテクチャ」](https://www.amazon.co.jp/%E9%80%B2%E5%8C%96%E7%9A%84%E3%82%A2%E3%83%BC%E3%82%AD%E3%83%86%E3%82%AF%E3%83%81%E3%83%A3-%E2%80%95%E7%B5%B6%E3%81%88%E9%96%93%E3%81%AA%E3%81%84%E5%A4%89%E5%8C%96%E3%82%92%E6%94%AF%E3%81%88%E3%82%8B-Neal-Ford/dp/4873118565)に続き[「ソフトウェアアーキテクチャの基礎（日本語版）」](https://www.amazon.co.jp/%E3%82%BD%E3%83%95%E3%83%88%E3%82%A6%E3%82%A7%E3%82%A2%E3%82%A2%E3%83%BC%E3%82%AD%E3%83%86%E3%82%AF%E3%83%81%E3%83%A3%E3%81%AE%E5%9F%BA%E7%A4%8E-%E2%80%95%E3%82%A8%E3%83%B3%E3%82%B8%E3%83%8B%E3%82%A2%E3%83%AA%E3%83%B3%E3%82%B0%E3%81%AB%E5%9F%BA%E3%81%A5%E3%81%8F%E4%BD%93%E7%B3%BB%E7%9A%84%E3%82%A2%E3%83%97%E3%83%AD%E3%83%BC%E3%83%81-Mark-Richards/dp/4873119820/ref=pd_lpo_2?pd_rd_i=4873119820&psc=1)発売で再び注目を浴びてきたArchUnitですがTips的な情報があまりネットにないので、これはArchUnitで検証しておこう！というパターンをよくありそうなアプリケーションを題材にその実装例をまとめてみました。また、実装例だけだと味気ないので筆者なりのアーキテクチャに対する考え方を合わせて少しご紹介します。

:::info
この記事はArchUnit 0.23.1をもとに作成しています。APIの細かい説明は行いませんので詳細が必要な場合はArchUnitの[公式ガイド](https://www.archunit.org/userguide/html/000_Index.html)を参照ください。
:::

[[TOC]]

## ArchUnitとは
はじめにそもそもArchUnitってなに？という方にごく簡単にArchUnitを説明するとArchUnitはJavaのコードでクラスやパッケージ間の依存関係をチェックするライブラリとなります。この依存関係のチェックはJunitのテストメソッドとして実装するため、通常のJUnitのテストクラスと同様にテストランナーから実行することができ簡単にCIに組み込むことができます。

## 検証に利用するサンプルアプリ
前振りの説明にあった「よくありそうなアプリケーションをもとに」の"もとに"はこちらで用意したPersonアプリを使って説明してきます。ただし「よくありそうな」は筆者の独断と偏見とArchUnitのサンプルとしての説明のしやすさといったヨコシマな考えも含まれていますので、その点は割り引いて見ていただければと思います。

さて、その用意したPersonアプリですが、中身はJakartaEEのJAX-RS+CDI＋JPAを使ったRESTアプリケーションで、機能はPersonの情報を取得／登録するといった簡単なものとなります。機能は簡単にしていますが、アーキテクチャを検証する題材とするため、アプリケーションの構造は一人前のアプリと同じように複数レイヤかつ複数モジュール(jar)で構成しています。

そんなPersonアプリですが今回の記事はアプリを説明するのが目的ではないため、記事ではPersonアプリのアーキテクチャだけを説明します。その他の詳細はGitHubリポジトリに格納している実際のソースコードを参照とします。ソースコード一式を格納しているリポジトリは以下になります。

- <https://github.com/extact-io/person-multi-module-app>

ここからはArchUnitでアーキテクチャを検証する上で必要なPersonアプリのアーキテクチャを説明していきます。

### 実行基盤
- JavaEE[^1]を利用する（Spirng Frameworkではない）。
- JavaEEの機能としてRESTにはJAX-RS、DIにはCDI、DBアクセスにはJPAを利用する。

[^1]: 正しくはJakartaEEですがJakartaEEのランタイムとして利用するHelidonが移行前のjavaxパッケージを使用しているためこの記事ではJavaEEと表記します。


### パッケージ構造と依存関係
アプリ全体のパッケージ構造と依存関係は次のとおりになります。なお、図中の`<<global>>`ステレオタイプはどのパッケージからも依存しても良いという意味で、これは他の図でも同じ意味となります。

![パッケージ構造](/img/blogs/2022/0519_archunit-package.drawio.svg)


- アプリ機能はRESTリクエストの受付と応答を行うwebapiパッケージとRESTリクエストによる処理の流れを制御するserviceパッケージ、Person情報の永続化と取得を行うpersistenceパッケージの3つから構成されています。

- Personアプリがサポートする永続化方式はfileとDBの2つがあり、前者はfileパッケージ、後者はjpaパッケージに実装がまとめられています。

- entityパッケージはアプリデータを格納するエンティティクラスを配置するパッケージで、アプリ機能を構成する3つのパッケージすべてが依存します。これはPersonアプリはDTOやVOといったデータを持ち運ぶためのお箱クラスは用意せず、エンティティクラスを用いてアプリケーション内のデータを引き回す方式を採っているためとなります。

- coreパッケージは業務色のない、アプリケーションを実現するために必要な土台的な役割をなすクラスを配置するパッケージとなり、どのパッケージからも利用可としています。

### Jarファイルと依存関係
アプリを構成するjarファイルと依存関係は次のとおりになります。

![Jarファイルと依存関係](/img/blogs/2022/0519_archunit-jar.drawio.svg)

persistence-file.jarとpersistence-jpa.jarは排他的な関係にあり、実行時にはどちらか一方を配置するようにします。

### ライブラリの利用方針
どのコードからも利用してよいアプリケーション全体で利用を許可するライブラリは以下のとおりになります。
- SFL4J (org.slf4j.*)
- JavaSE (javax.*)
- JavaEE (javax.*)
  - ただし、全体としてjavax.*への依存は許容するが、別途レイヤごとに依存を許可するJavaEE仕様を限定する。
  - また、JavaEEの実装には[Helidon](https://helidon.io/)を利用するがHelidonやEclipseLink、JerseyなどのJakartaEE実装にアプリが直接依存することは禁止する。


なお、必要によりJakartaEE実装やSLF4J以外のOSSライブラリに依存する場合はextパッケージを設け依存クラスを他のクラスと分けて管理すること。また、アプリを起動するエントリポイントとなるMainクラスはHelidon(io.helidon.*)への依存が避けられないため、Mainクラスに限りHelidonへの直接依存を許可する。


前置きが長くなりましたが必要なアーキテクチャの説明は以上となります。それではこのアーキテクチャ定義をArchUnitを使ってどのように担保していくかを見ていきましょう。

## レイヤー間の依存関係のチェック
まずはレイヤの依存関係のチェックからです。パッケージ間の依存関係は説明しましたが、レイヤ定義はまだ説明していませんでした。Personアプリが採っているレイヤ定義を説明すると次のとおりになります。

![レイヤ構造](/img/blogs/2022/0519_archunit-layer.drawio.svg)

Personアプリは論理構造であるレイヤ定義と物理構造のパッケージ構成のトレーサビリティの観点からレイヤに対応するパッケージを設けています。これは○○レイヤが定義されていた場合、実装では1対1対応する○○パッケージを作ることを意味し、その目的は見たとおりの分かりやすさになります。

今回はパッケージ構成を先に説明しましたが、実はこれは説明の順序が逆です。パッケージ構造は本来、レイヤー定義をもとに実装言語の特性やお作法や分散などの配置を加味し、その結果として分解／導出されるものとなります。

とは言うものの実際は鶏と卵でパッケージ構成を先に考えた方が早かったりする場合もありますが、ベキ論としてはレイヤ定義が先となります。

:::column:レイヤーアーキテクチャのおさらい
レイヤーアーキテクチャの原典は恐らく「Pattern-Oriented Software Architecture」(通称POSA本)[^2]だと思いますが、説明が若干難解なため、筆者なりのレイヤーアーキテクチャの説明をすると以下のとおりとなります。オレオレ理解が含まれているかも知れませんが言わんとしていることは原典からズレてないと思います。

- レイヤーアーキテクチャの目的はシステム全体を目的ごとの大きな機能単位で分割し、それらを積み重ねた階層構造で全体を形作ることにより、複雑性を排除すること。つまり、分割統治による設計手法の１つ。
- その主なメリットとしては、「目的ごとに分割されているため、変更が局所化する。また、交換が可能になること」と「自身の階層と1つ下の階層の仕様のみ理解すればレイヤごとに開発が可能。また、それにより利用技術（必要スキル）が各レイヤに閉じるため、要員のスキルセットが最小化されること」の2つがある

依存関係を考える上では「変更が局所化する。また、交換が可能になること」という点がポイントになります。なぜならこれを実現するには「上位は下位に依存して良いが下位は上位に依存してはいけない」といったことがルールとなるためです。Personアプリを例に考えた場合、ServiceレイヤのクラスがWebApiレイヤのクラスを使っていた場合、RESTインタフェースを廃止し、（そんなことあり得ないだろ！というのは別として）コンソールインタフェースのアプリに替えようと思ったらどうなるでしょうか？あっ！！ってなるのが分かりますよね。

[^2]:日本語訳は[この本]( https://www.amazon.co.jp/exec/obidos/ASIN/4764902834/ryoasai-22/)で、この本が出版された2000年当時は豆蔵社員のどの机にもあるといってよいくらい良く見かけた本ですが、残念ながら現在は絶版で古本でしか手に入りません。
:::

話しが少し脱線しましたが、話題をもとのPersonアプリのレイヤ定義に戻すとPersonアプリは2軸の視点でレイヤを分割しています。

1つは下に行けば行くほど汎用度が高くなる縦方向のレイヤ、もう一つは機能を実現する上で必要となる処理を分類化した横方向のレイヤです。

まずは縦方向のレイヤから見ていくとPersonアプリは以下の観点で縦のレイヤを分けています。

|観点|内容|該当のレイヤ|
|---|---|---|
|業務非依存|Personアプリには依存しない他のアプリでも利用<br>可能なモジュールを配置するレイヤ|Core|
|業務共通|Personアプリの土台もしくは共通となるモジュール<br>を配置するレイヤ|Entity|
|業務固有|Personアプリ内の個別機能を実現するモジュールを<br>配置するレイヤ|WebApi, Service, Persistence|

レイヤ構造なので依存関係は「上位は下位に依存するが下位が上位に依存するのはNG」となります。また下位レイヤへの依存は原則closeレイヤ[^3]として扱っていますが、Coreレイヤだけはopenレイヤ [^4]として扱っています。ですので、Coreレイヤは1つ上のEntityレイヤだけでなく、WebApi,Service,Persistenceのレイヤからも依存してよいものとしています。
[^3]: 直下の下位レイヤのみ依存を許可する扱い
[^4]: 直下の下位レイヤを飛ばして下位レイヤに依存を許可する扱い

次に横方向のレイヤですが、これは処理の流れにもなっているレイヤなので、左のレイヤは右のレイヤに処理を委譲する形となり、左のレイヤは右のレイヤに依存するがその逆の依存はNGとなります。なお、横方向のレイヤはすべてcloseレイヤとして扱っているため、WebApiレイヤがPersistenceレイヤに直接依存するのはNGとしています。

レイヤの説明も長くなりましたが、ここからはやっとArchUnitの話に移っていきたいと思います。

### ArchUnitによるアーキテクチャ定義の実装
ArchUnitでレイヤ定義のチェックを実装するには当たり前ですがプログラム可能な定義が必要となります。上述の図を使ってレイヤー定義を説明すると「縦方向は自分より下のレイヤであればどのレイヤでも依存してOKで、横方向で依存して良いのは一つ右隣りのレイヤだけ」と至って単純なのですが、コードではそうはいかないため、これを実装可能なルールとして定義すると次のようになります。

- WebApiレイヤはどのレイヤからも依存されていないこと
- ServiceレイヤはWebApiレイヤからの依存のみ許可
- PersistenceレイヤはServiceレイヤからの依存のみ許可
- Entityレイヤは上位のWebApiとServiceとPersistenceからのみ依存を許可
- Coreレイヤはすべてのレイヤから依存を許可

これでArchUnitの実装に必要なお膳立てはすべて揃ったので、このルールを早速実装してみると次のようになります。

```java
@AnalyzeClasses(
        packages = "io.extact.sample",
        importOptions = ImportOption.DoNotIncludeTests.class)
public class LayerDependencyArchUnitTest {
  @ArchTest
  static final ArchRule test_レイヤー間の依存関係の定義 = layeredArchitecture()
      .layer("webapi").definedBy("io.extact.sample.person.webapi..")
      .layer("service").definedBy("io.extact.sample.person.service..")
      .layer("persistence").definedBy("io.extact.sample.person.persistence..")
      .layer("entity").definedBy("io.extact.sample.person.entity..")
      .layer("core").definedBy("io.extact.sample.core..")

      .whereLayer("webapi").mayNotBeAccessedByAnyLayer()
      .whereLayer("service").mayOnlyBeAccessedByLayers("webapi")
      .whereLayer("persistence").mayOnlyBeAccessedByLayers("service")
      .whereLayer("entity").mayOnlyBeAccessedByLayers(
              "webapi", "service", "persistence")
      .whereLayer("core").mayOnlyBeAccessedByLayers(
              "webapi", "service", "persistence", "entity");
}
```

ArchUnitによるレイヤの依存関係のチェック実装は、最初に論理のレイヤと物理のパッケージの関係を`layer().definedBy`で定義し、定義したレイヤ間の関係を`whereLayer().mayNotBeAccessedByAnyLayer()`などで宣言的に定義していくスタイルのため、直観的に分かりやすいモノとなっています。

レイヤー間の依存関係のチェックはその実装スタイルから分かるとおり、依存関係のチェックの他にも論理のレイヤー定義と物理のパッケージ構成の関係が合っているかの確認も含まれています。レイヤー定義は論理レベルのため、開発が進み気づかないうちに「あれ？このパッケージはどのレイヤのパッケージとして作ったの？」的なこの子誰の子的なパッケージが途中で出来たりすることが往々にしてありますが、このチェックをCIに組み込んでおくことで、レイヤとパッケージの関係が常にチェックされるため、そのようなパッケージの存在に気がつくことができます。

レイヤー定義とパッケージ構成の関係のチェックできたので、次はパッケージとjarの関係をチェックしていきましょう。

## jarモジュール間の依存関係のチェック
パッケージのままでもアプリケーションの実行はできますが、通常はjarモジュールとしてアーカイブする必要があります。

Personアプリではパッケージのアーカイブを[パッケージ構造と依存関係](#パッケージ構造と依存関係)で示したパッケージ構造の図にjarモジュールとの関係を重ね合わせた下の図のようにしています。

![jarモジュール間の依存関係](/img/blogs/2022/0519_archunit-package-jar.drawio.svg)

基本的にレイヤパッケージとjarを1対1対応させたシンプルなアーカイブ方法ですが、service.jarだけはレイヤを跨りpersistenceパッケージのインタフェースを含めています。

これ以外のアーカイブ方法としてpersistenceパッケージのインタフェースだけを格納したpersistence-api.jarを導出する選択肢もありますが、導出したpersistence-api.jarをservice.jarと別に使うシュチュエーションは考えられないためpersistenceパッケージのインタフェースはservice.jarに含めてしまいjarモジュールの数が冗長にならないようにしています。

それではArchUnitの実装に移っていきますが、その前にレイヤの時と同じように図の関係をArchUnitで実装可能なルールとして定義する必要があります。今回のjarモジュール間の依存関係のルールは次のとおりになります。

- server.jarはどのjarからも依存されないこと
- service.jarに依存してよいのは直接利用するserver.jarとPersonRepositoryインタフェースを実現するpersistence-file.jarとpersistence-file.jarの3つ
- entity.jarはcore.jar以外のどのjarからも依存してよい
- core.jarはすべてのjarが依存してよい

そしてこのルールをArchUnitで実装すると今回は次のようになります。

```java
@ArchTest
static final ArchRule test_物理モジュール間の依存関係の定義 = layeredArchitecture()
    .layer("server.jar").definedBy(
            "io.extact.sample.person.webapi..")
    .layer("service.jar").definedBy(
            "io.extact.sample.person.service..", 
            "io.extact.sample.person.persistence")
    .layer("persistence-file.jar").definedBy(
            "io.extact.sample.person.persistence.file..")
    .layer("persistence-jpa.jar").definedBy(
            "io.extact.sample.person.persistence.jpa..")
    .layer("entity.jar").definedBy("io.extact.sample.person.entity..")
    .layer("core.jar").definedBy("io.extact.sample.core..")

    .whereLayer("server.jar").mayNotBeAccessedByAnyLayer()
    .whereLayer("service.jar").mayOnlyBeAccessedByLayers(
            "server.jar",
            "persistence-file.jar",
            "persistence-jpa.jar")
    .whereLayer("persistence-file.jar").mayNotBeAccessedByAnyLayer()
    .whereLayer("persistence-jpa.jar").mayNotBeAccessedByAnyLayer()
    .whereLayer("entity.jar").mayOnlyBeAccessedByLayers(
            "server.jar",
            "service.jar",
            "persistence-file.jar",
            "persistence-jpa.jar")
    .whereLayer("core.jar").mayOnlyBeAccessedByLayers(
            "server.jar",
            "service.jar",
            "persistence-file.jar",
            "persistence-jpa.jar",
            "entity.jar");
```

レイヤーではないですが、コードが分かりやすくなるためArchUnitの実装にはレイヤーのチェックで利用した`layer().definedBy`を使っています。

一見、レイヤのチェック実装と変わり映えしないように見えますが、1つだけポイントがあります。それはservice.jarに対応するパッケージを定義している` "io.extact.sample.person.persistence"`です。

他のパッケージは末尾に`..`が付いていますが、これには付けていません。`..`の意味はおおよそ推測できるかと思いますが`..`は配下のパッケージも含むとなります。なので`"io.extact.sample.person.service.."`の意味は「serviceパッケージ配下のモジュール」となります。一方の`"io.extact.sample.person.persistence"`は`..`が付いていませんので対象はパッケージ直下のみとなり「persistenceパッケージ直下のモジュール（サブパッケージ配下は含まない）」の意味となります。

今回のPersonアプリのように該当のレイヤパッケージ以外のモジュールを同じjarに含める場合、本来参照してはいけないモジュールもIDEから参照できるようになってしまうため、persistenceパッケージ直下のモジュールからserviceパッケージのモジュールをウッカリ参照していたということが起きがちです。

このような場合でも、ArchUnitで先ほどのレイヤの依存関係のチェックのようにチェックを実装しておけば、論理レイヤの依存関係違反でテストが失敗し気がつくことができます。このように、ArchUnitを使うことで論理レイヤ⇔パッケージ構造⇔jarモジュールの関係を多段でチェックできるのものいいところだったりします。

構造については論理レイヤからjarモジュールの関係までチェックできました。次は依存ライブラリのチェックをしていきます。

## アプリ全体での依存ライブラリのチェック
OSSなど外部のライブラリを利用することは昨今のJava開発では当たり前になっていますが、バージョンアップやセキュリティインシデントなどを考えた場合、無秩序に利用することは好ましくありません。特にアプリケーション全体で利用するようなライブラリについては、そのライブラリに問題が発生した場合、アプリケーション全体に影響を及ぼすため、アプリケーション全体を統括するアーキテクトとしては厳格に統制をとりたい物だったりします。

依存ライブラリの管理はMavenが登場してからは劇的にスマートに行えるようになりましたが、いくら口すっぱく「勝手に変なものを入れるな！使うな！」といっても気がついたら、なんだコレ！？といったものが使われていることは開発規模が大きくなればなるほど起きたりします。そしてこれをドキュメントによる周知やレビューで統制しようとした場合、規模が大きくなればなるほど大変になってきます。

正にそこでArchUnitです！

Personアプリのアーキテクチャとして説明した[ライブラリの利用方針](#ライブラリの利用方針)からArchUnitの実装に必要なルールを抜き出すと次のとおりになります。

- アプリのコードが依存するパッケージはアプリ自身(io.extact.sample.*)とSFL4J(org.slf4j.*)、JavaSE(javax.*)、JavaEE (javax.*)のみとなっていること。
- ただし、アプリのextパッケージ配下(`"io.extact.sample..ext.."`)とMainクラスは除く。

これをArchUnitで実装すると次のようになります。

```java
@ArchTest
static final ArchRule test_アプリが依存してOKなライブラリの定義 =
    classes()
        .that()
            .resideInAPackage("io.extact.sample..")
            .and().haveSimpleNameNotEndingWith("Main")
            .and().resideOutsideOfPackage("io.extact.sample..ext..")
        .should()
            .onlyDependOnClassesThat(
                    resideInAnyPackage(
                        "io.extact.sample..",
                        "org.slf4j..",  // SLF4J
                        "javax..",  // JavaEE
                        "java.."    // JavaSE
                    )
            );
}
```

今回はレイヤー間の依存関係のチェックとは違う実装スタイルとなります。少しだけコードの意味を解説すると`that()`以下でチェックする対象を定義し、`should()`以下に対象が満たす条件を定義します。

`that()`以下は若干分かりづらいため、この部分のコードをさらに補足すると、
- sampleパッケージ配下にあるもの、かつ
- クラス名がMainで終わらないもの、かつ
- sampleパッケージ配下のextパッケージの外側のもの

がチェックの対象となり上で挙げたルールと同義となります。

`that()`と`should()`の実装スタイルは、最初にチェック対象の集合を定義し、次にその要素が満たす条件を記述するといった集合的な操作をプログラムで書くため、とっつき辛いです。とっつき辛いのは最初だけでそのうち慣れますと言いたいところですが、筆者はいつになっても慣れません。ですが、それでも使い続け、こうして記事を書いているということは、それだけ欠かせないものだという証左でしょうか。

ここまでで全体の構造と依存関係に関するルールとその実装を説明してきました。全体に関するものとして筆者が実際にやっているチェックは概ねこのくらいで、実際の肌感覚としても十分な程度に確認できていると思います。ですので、全体のチェックパターンは以上にして、次からはレイヤー個別にチェックすべきポイントや実装パターンについて見てきます。

## レイヤごとの依存ライブラリのチェック
アプリ全体での依存ライブラリのチェックですが、チェックが甘い部分があります。JavaEEの利用は`javax.*`で見ていますが、例えばJavaEEだからといってWebApiレイヤでDBアクセスのJPA(`javax.persistence.*`)に依存していた場合、それは明らかにおかしいというか何か間違っています。ですので、全体では丸っとチェックし、レイヤごと、もしくはパッケージごとに依存がそこで許容している範囲になっているかをチェックするのが肝要です。

実際にPersonアプリでも各レイヤに依存関係をチェックするテストケースを作成しています。いずれも実装パターンはほぼ同様となるため、ここでは特徴的な例としてCoreレイヤのチェック実装を紹介します。

現時点ではCoreレイヤはJavaEEの機能を利用する必要がないため、JavaEE(`javax.*`)には非依存としています。このため、依存してよいライブラリはサンプルアプリ自身とSFL4J、Java SEの3つとなります。ただし、coreパッケージは外部ライブラリのApache Commons CSV(`org.apache.commons.csv.*`)に依存したクラスが存在するextパッケージが存在するため、このextパッケージの依存関係は個別にチェックする必要があります。

よって、チェックは次のように2つに分けて実装します。

```java
@ArchTest
static final ArchRule test_coreパッケージで依存してOKなライブラリの定義 =
    classes()
        .that()
            .resideInAPackage("io.extact.sample.core..")
            .and().resideOutsideOfPackage("io.extact.sample.core..ext..")
        .should()
            .onlyDependOnClassesThat(
                    resideInAnyPackage(
                        "io.extact.sample..",
                        "org.slf4j..", // SLF4J
                        "java.."       // JavaSE
                    )
            );
@ArchTest
static final ArchRule test_extパッケージで依存してOKなライブラリの定義 =
    classes()
        .that()
            .resideInAPackage("io.extact.sample.core.io.ext..")
        .should()
            .onlyDependOnClassesThat(
                    resideInAnyPackage(
                        "io.extact.sample..",
                        "org.slf4j..", // SLF4J
                        "org.apache.commons.csv..", // Apache Commons CSV
                        "java.."       // JavaSE
                    )
            );
```

`resideOutsideOfPackage("io.extact.sample.core..ext..")`でextパッケージを除外した範囲でレイヤ内の依存関係をチェックし、それとは別にextパッケージの依存関係をチェックしています。

レイヤごとの依存関係のチェックができたら、あとは設計意図がある構造をピンポイントで個別にチェックしていきます。個別にというと無数にパターンがある気がしますが、恐らく設計意図がある構造は次に説明するインタフェースと実装の分離による構造に集約されるのではないかと思います。なので、次はこの「インタフェースと実装の分離ができているかのチェック」を紹介し、本記事を終わりにしたいと思います。

## インタフェースと実装の分離ができているかのチェック
persistenceパッケージでやっている「外部に公開するインタフェースをパッケージ直下に置き、そのサブパッケージに実装クラスをまとめる」配置パターンはJavaではよく使われていると思います。この配置パターンには「公開しているインタフェースの実装を利用者側に影響を与えず切り替え可能にする」目的が暗黙的に含まれますが、この目的を実現するには以下2つの依存関係を堅持する必要があります。
1. 外部からのアクセスはパッケージ直下だけになっていること
2. パッケージ直下のクラスはサブパッケージに依存していないこと

言葉による説明だけでは分かりづらいため、この2つの関係を図示すると次のようになります。

![インタフェースと実装の分離](/img/blogs/2022/0519_archunit-persistence-package.drawio.svg)

ここまでくればArchUnitで実装すべきルールは分かりますね。serviceパッケージのモジュールがfileとjpaのパッケージ依存していないことは[jarモジュール間の依存関係のチェック](#jarモジュール間の依存関係のチェック)で担保できているため、必要なルールは
- persistenceパッケージ直下のモジュールはfileパッケージとjpaパッケージに依存していないこと

となります。

このルールを実装すると次のようになります。

```java
@ArchTest
static final ArchRule test_persistenceの実装パッケージへの依存がないことの定義 =
    noClasses()
        .that()
            .resideInAPackage("io.extact.sample.person.persistence")
        .should()
            .dependOnClassesThat()
                .resideInAnyPackage(
                        "io.extact.sample.person.persistence.jpa..",
                        "io.extact.sample.person.persistence.file.."
                        );
```

今まではチェック実装の先頭が`classes()`は始まっていましたが、今回の実装は`noClasses()`から始まっています。これは`that()`で定義した対象に`should()`で定義したモジュールがないことの意味となります。

:::column:最後にクリーンアーキテクチャとレイヤーアーキテクチャについて
レイヤーアーキテクチャは古臭くクリーンアーキテクチャはモダンといったようにレイヤーアーキテクチャとクリーンアーキテクチャが排他的でかつ別物のように言われていることを目にしたりします。しかし、クリーンアーキテクチャはレイヤーアーキテクチャと本質は同じで単に見方を変えたレイヤーアーキテクチャの一種と筆者は個人的に捉えています。

クリーンアーキテクチャはご存じのように下の図に示すようにアプリケーションの構造を同心円状で捉え外側から内側に向けて依存させていく分割手法で、レイヤーアーキテクチャとの違いは極論すれば説明する絵が縦横の2次元構造か円形構造かの違いだけではないかと思っています。

ただし、確かに一部には明らかにレイヤーアーキテクチャでは説明がつかない部分があります。それがDBなどアプリケーションの外部へアクセスする部分です。

レイヤーアーキテクチャではビジネス層は永続化層に依存しますが、クリーンアーキテクチャはビジネス層（に相当するUseCase層）は永続化層（に相当するGateway層）に依存する形となり双方の依存方向は真逆になります。これはクリーンアーキテクチャでは永続化層のインタフェースをビジネス層に配置し、依存性逆転の原則を使って、永続化の実装---▷ビジネス層のインタフェースの関係を構築するためとなります。

このようにクリーンアーキテクチャではレイヤーアーキテクチャとは依存が逆になる部分がありますが、ここも本質的にはレイヤーアーキテクチャと同じと考えています。依存は逆ですがビジネス層(UseCase層)は永続化層（Gateway層）を使って自身の責務を実現するのは同じです。ですので、誤解を恐れずに言うとクリーンアーキテクチャはアーキテクチャの大局的な観点と設計上のテクニックを同時に語ったもので、このレベルの違うものを一緒くたに説明している点が分かりづらさにも繋がっていると感じています。事実、クリーンアーキテクチャは処理の流れと依存の方向が途中から逆になるため、感覚的に分かりづらいです。

今回のPersonアプリはアプリケーション全体の論理構造はレイヤーアーキテクチャに基づいて分割／整理していますが、jarモジュールの分割時には依存性の逆転を使いpersistence-jpa/file.jarからservice.jarに依存するようにしています。

クリーンアーキテクチャとレイヤーアーキテクチャを考察しましたが、この考察をとおして筆者が言いたいことは、どちらが良い悪いではなく、設計において重要なことは、表層的なことに捕らわれず「それはなんなのか？なにが嬉しいのか？」などといった本質を見た上でモノゴトを取捨選択することで、それこそがアーキテクトに求められる重要な能力ではなかいということになります。

![CleanArchitechure](https://blog.cleancoder.com/uncle-bob/images/2012-08-13-the-clean-architecture/CleanArchitecture.jpg)
引用元: [The Clean Code Blog - The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

:::

## まとめ
ArchUnitを使う前は定義したアーキテクチャが守られているかの確認はレビューやコードのGrep検索など属人的な作業になりがちでした。しかし、ArchUnitでアーキテクチャ定義を実装することで自動化することができ、そしてなによりもその精度を向上させることができます。

もちろんすべてのアーキテクチャ定義をArchUnitで実装できる訳ではなく、できるのは構造や依存関係といった静的な側面だけとなりますが、その効果には大きいものがあります。

記事では`that()`や`should()`に続ける条件は`resideInAPackage`や`onlyDependOnClassesThat`といった代表的なものしか使っていませんでしたが、他にも数多くの条件メソッドが用意されており定義不能な条件はありません。まだの人は是非使ってみてください。
