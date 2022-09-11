---
title: 第8回 Microprofile Config 3.0へのキャッチアップ
author: toshio-ogiwara
date: 2022-09-12
tags: ["逆張りのMicroProfile"]
prevPage: ./src/posts/msa/microprofile/cntrn07-mp-restclient.md
---
Helidon 3.0がリリースされMP4.0準拠となり、ついにHelidonでもMicroprofile Config 3.0(MP Config 3.0)の機能が使えるようになりました。今回は「[第6回 お手軽便利MicroProfile Config](/msa/mp/cntrn06-mp-config/)」で紹介できなかった1.4から3.0までに取り入れられた便利な機能をその差分として紹介します。

記事はコードの抜粋を記載します。全体を見たい場合や動作を確認したい場合は以下のGitHubリポジトリを参照ください。
- <https://github.com/extact-io/contrarian-microprofile-sample/tree/main/05-config3>

MicroProfileをテーマにブログを連載しています。よければ他の記事も以下のリンクからどうぞ！
- [逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)

[[TOC]]

:::info
この記事はJava17+Helidon 3.0.1 + MicroProfile Config 3.0.1をもとに作成しています。
:::

## 紹介する機能
MP Config 1.4から3.0までに取り入れられた便利な機能として今回の記事で紹介する機能は
- 設定データの集約
- Config Profile

の2つになります。いずれもMP Config 2.0で取り込まれた機能となります。

:::column:MP Configのバージョンと主な変更点
現時点でHelidonの最新の 3.0.1はMicroprofile 5.0に対応しています。Helidonの1つの前のメジャーバージョンの2.xはMicroprofile 3.3対応でしたので、4.0を飛ばして一気にジャンプアップしているので、その間のMP Configのバージョンの動きと主な変更点を整理すると次のようになります

- MP Config 3.0.1
  - ランタイムには関係ないライセンス表示の修正のみ
- MP Config 3.0
  - Microprofile 5.0で取り込まれたバージョン
  - Jakarta EE 9.1に対応し依存パッケージがjavaxからjakrataに変更となった。機能自体はMP Config 2.0と同じ
- MP Config 2.4
  - Microprofile 4.0で取り込まれたバージョン
  - 今回紹介する2つの機能や互換性のないAPIの変更など大きな変更が加えられた
- MP Config 1.4
  - Microprofile 3.3で取り込まれたバージョン
  - byte、short、char の組み込みコンバーターの追加など小規模な変更
:::

## 設定データの集約
ある意味的にまとまった設定値があっても、その取得は粒々1つずつ取得するしかありませんでしたが、Config2.0から導入された設定データの集約を使うと、アプリケーションで定義した任意のクラスに設定値を直接バリンドしてもることができるようになります。

例えば次のようなDBの接続情報に関する3つの設定があったとします。

```shell
sample.db.url=jdbc:h2:tcp://localhost/~/sample
sample.db.id=sample
sample.db.password=sample
```

意味のあるまとまったデータをアプリケーションで扱う場合、例えばDbInfoと言ったような、そのデータの意味を表すクラスを定義し、関連する情報を1つのインスタンスとしてまとめて管理したくなりますが、Config 2.0ではMP COnfigからバラバラに設定値を取得し、その値をインスタンスに格納する処理を自分でしなければならず面倒だったりしました。

これがMP Config2.0からは次のようにデータクラスを使ってまとめて設定値を取得できるようになります。

```java
@ConfigProperties(prefix = "sample.db") // 1.
@Dependent // 2.
public class DbInfo {
    private String url;
    @ConfigProperty(name = "id") // 3.
    private String user;
    private String password;
}
```

1. 設定値をまとめてバインドするデータクラスには`@ConfigProperties`を付けて、name属性にバインドする設定キーのプレフィクスを定義します。
   `prefix.フィールド名`に対する設定値が対応するフィールドにバインドされます。例えば`sample.db.url`の設定値はurlフィールドにバインドされます。なおMP Configランタイムは可視性に関係なくフィールドに直接アクセスするため、setterは必要ありません
2. 設定値をバインドするオブジェクトはCDI Beanでなければなりません。したがって、なんらかのCDIスコープのアノテーションを付与する必要があります
3. デフォルトでは1.で説明したとおり、フィールド名が設定キー名の一部となりますが、設定キー名とフィールド名が異なる場合は`@ConfigProperty`の`name`属性にマッピング定義することができます

この`@ConfigProperties`を付けたデータクラス（ConfigPropertiesクラス）で設定値を受け取る方法は２つあります。１つはCDIクラスから動的に取得する方法、もう一つは@Injectのインジェクションによる取得。具体的な方法を見ていきます。

まずCDIクラスからの取得は次のように行います。
```java
DbInfo sampleDbInfo = CDI.current()
        .select(DbInfo.class, ConfigProperties.Literal.NO_PREFIX)
        .get();
```

データクラスのインスタンスが1つしかない場合でも`CDI#select()`の第2引数のQualifierの指定は必要となります。中身を見れば分かりますが、@ConfigPropertiesの実体はQualifierです。Qualifier指定が必要なのはMP Configランタイムが`@ConfigProperties`指定されたCDI Beanを設定値をバインドする特別なBeanとして扱うためと思われます。

次にもう一つのインジェクションによる取得は次のようになります。
```java
@ApplicationScoped
public class ConfigBean {
    @Inject
    @ConfigProperties
    private DbInfo sampleDbInfo;
    ...
}
```

CDIクラスからの取得と同様に@Injectで取得する場合も`@ConfigProperties`指定が必要となります。

ここまでが基本的な利用法となります。次からは細かい機能の使い方やルールを紹介してきます。

### 設定キーのレベルが深くなる値の取得
今までの例は設定キーのレベルがすべて同じでしたが、次のようにレベルが深くなる設定キーがあった場合はどうすればいいでしょうか。

```shell
sample.db.url=jdbc:h2:tcp://localhost/~/sample
sample.db.id=sample
sample.db.password=sample
### ↓↓ キーのレベルが深くなる設定
sample.db.option.prop1=sample-option1
sample.db.option.prop2=sample-option1
```

このような場合も同じデータクラスにバインドさせることができます。このようにレベルが深くなる設定キーがある場合は次の例のように`@ConfigProperty`の`name`属性に`prefix`で指定したキー名の後続部分を明示的に設定することでバインドさせることができます。

```java
@ConfigProperties(prefix = "sample.db")
@Dependent
public class DbInfo {
    private String url;
    ...
    @ConfigProperty(name = "option.prop1")
    private Optional<String> prop1;
    @ConfigProperty(name = "option.prop2")
    private Optional<String> prop2;
}
```

`@ConfigProperty`を定義することで、該当フィールドには`prefix属性`+`.`+`name属性`の設定値がバインドされるようになります。なお、フィールドの型をOptionalにしているのは設定が任意の項目を想定しているからで、MP Configの仕様とは関係ありません。

:::check:データクラスのネストはできません！
レベルの異なる設定値が取得できるのなら、次のようにレベルが異なる部分を別のデータクラスにまとめられるかな？まとめたいな！と思うかも知れませんが、これは残念ながらどう頑張ってもできません。

```java
@ConfigProperties(prefix = "sample.db")
@Dependent
public class DbInfo {
    private String url;
    ...
    @ConfigProperty(name = "option")
    private Options option;
    // ネストクラス
    static class Options {
        private Optional<String> prop1;
        private Optional<String> prop2;
    }
}
```
Config 3.0でできるのはネスト構造を持たないフラットなデータクラスへのバインドまでとなります。
:::

### prefixのオーバーライド
今までの例は1つのデータクラスに対してバインドする設定値(の塊)は1つでしたが、今度は次ように接続先が2つあった場合の例を見ていきます

```shell
sample.db.url=jdbc:h2:tcp://localhost/~/sample
sample.db.id=sample
...
test.db.url=jdbc:h2:tcp://localhost/~/test
test.db.id=test
test.db.password=test
```

設定値が異なるだけで、両者とも構造は全く同じなのでどちらも`DbInfo`クラスで取得したいですよね？そんな時は次のようにデータクラスに指定し`@ConfigProperties`の`prefix`属性を外側からオーバーライドすることができます。

- CDIクラスからの取得
```java
DbInfo testDbInfo = CDI.current()
        .select(DbInfo.class, ConfigProperties.Literal.of("test.db"))
        .get();
```

`ConfigProperties.Literal.of("test.db")`は動的に`@ConfigProperties(prefix = "test.db")`を生成しているのと等価になります。


- インジェクションによる取得
```java
@ApplicationScoped
public class ConfigBean {
    @Inject
    @ConfigProperties
    private DbInfo sampleDbInfo;
    @Inject
    @ConfigProperties(prefix = "test.db")
    private DbInfo testDbInfo;
}
```

データクラスに指定した`@ConfigProperties`の`prefix`属性はあくまでもそのデータクラスにバインドする設定キーのデフォルト値的な扱いになります。ですので、それ以外の設定キーをバインドしたい場合は例のように外側（利用者側）から上書き指定することができます。


## Config Profileによる設定値の切り替え
設定ファイルを使って定義する典型的な情報として環境依存に関する情報があります。例えばここまでの例で使っていたDBの接続情報ですが、ローカル環境、IT環境、本番環境で異なるのが普通ですが、では環境による設定情報の切り替えはどのようにすればよいでしょうか？と言いうお題に対してMP Config2.0から用意されたのが、今から説明するConfig Profileになります。

この機能ですが見ればすぐ理解できる機能ですので、DBの接続情報が環境ごとに異なる場合の設定例を見てもらいたいと思います。

```shell
# ローカル環境の設定
%dev.sample.db.url=jdbc:h2:tcp://localhost/~/dev
%dev.sample.db.id=dev
%dev.sample.db.password=dev
%dev.sample.db.option.prop2=dev-option1
# IT環境の設定
%it.sample.db.url=jdbc:h2:tcp://localhost/~/it
%it.sample.db.id=it
%it.sample.db.password=it
# 本番環境の設定
%prod.sample.db.url=jdbc:h2:tcp://localhost/~/prod
%prod.sample.db.id=prod
%prod.sample.db.password=prod
```

Config Profileでは`%`をつけた任意のプロファイル名をキーに定義できるようになっています。この例ではローカル環境は`%dev`、IT環境は`%it`、そして本番環境は`%prod`としてプロファイルキーを付加して、それぞれの設定値を定義しています。

この設定でやりたいことは、ローカル環境(devプロファイル)なら`sample.db.url`の設定として`jdbc:h2:tcp://localhost/~/dev`を返してもらうようにすることですが、このプロファイルの指定はシステムプロパティの`mp.config.profile`で行います。

プロファイルを指定して設定ファイルを取得した実行結果を見ていきましょう（コンソールにはDbInfoクラスのオブジェクトを内容を出力するようにオーバーライドしたtoStringメソッドの結果を出力しています）。

- ローカル環境(devプロファイル)を指定して実行
```shell
java -Dmp.config.profile=dev -jar target/config3-sample.jar
sample.db=>DbInfo [url=jdbc:h2:tcp://localhost/~/dev, user=dev, password=dev, prop1=Optional.empty, prop2=Optional[dev-option1]]
```

- IT環境(itプロファイル)を指定して実行
```shell
java -Dmp.config.profile=it -jar target/config3-sample.jar
sample.db=>DbInfo [url=jdbc:h2:tcp://localhost/~/it, user=it, password=it, prop1=Optional.empty, prop2=Optional.empty]
```

- 本番環境(prodプロファイル)を指定して実行
```shell
java -Dmp.config.profile=prod -jar target/config3-sample.jar
sample.db=>DbInfo [url=jdbc:h2:tcp://localhost/~/prod, user=prod, password=prod, prop1=Optional.empty, prop2=Optional.empty]
```

- プロファイルを指定せずに実行
```shell
java -jar target/config3-sample.jar
Exception in thread "main" java.lang.ExceptionInInitializerError
```

実行結果から分かるとおり、MP COnfigは`mp.config.profile`でプロファイルが指定されている場合、プログラムで指定されているキーに`%profile`を付加して設定を探してくれるようになります。これによりプログラムで指定するキー名を変更せず、プロファイルに応じた設定値を取得することができるようになります。

ただ、この設定ではプロファイルを指定しなかった場合、実行時にエラーとなってしまします。プロファイルが指定されな場合、ケースにもよりますが、エラーではなく、デフォルト的な設定を返すようにしたいといった場合もあるかと思います。このような場合は、次のようにプロファイルキーを含まない設定も付けておこくことでそのようなことができます。

```shell
%dev.sample.db.url=jdbc:h2:tcp://localhost/~/dev
...
%it.sample.db.url=jdbc:h2:tcp://localhost/~/it
...
%prod.sample.db.url=jdbc:h2:tcp://localhost/~/prod
...
sample.db.url=jdbc:h2:tcp://localhost/~/sample
sample.db.id=sample
sample.db.password=sample
sample.db.option.prop1=sample-option1
sample.db.option.prop2=sample-option1
```

MP Configはプロファイルが指定されている場合、そのプロフィルキーが付いた設定が優先的に検索されますが、該当がない場合はプロフィルキーなしの設定にフォールバックされて検索が行われます。

:::alert
ユーザ定義型へのバインドはHelidon拡張機能のapplicaiton.yamlでもサポートされていますが、Config Profile機能はサポートされていません。したがって、Helidonの標準機能でConfig Profile機能が使える設定ファイル形式はMP Config標準の'META-INF/microprofile-config.properties'のみとなります。
また、'%'はYAMLで特別な意味を持つメタキャラクタとして定義されているためキー名に利用することはできません。このことから、MP Configを自分で独自拡張してもYAMLでConfig Profile機能を使えるようにするのは難しいと思われます。
:::

## Config Profileによる設定ファイルの切り替え
1つの設定ファイルにプロファイルごとに定義された設定をプロファイルの指定で切り替える例を見てきましたが、Config Profileでは設定ファイルごとまるまる切り替えることもできます。

上述した例を設定ファイル単位で切り替える場合は、次のようにファイル名を`microprofile-config-<profile>.properties`としたプロファイルごとの設定を用意します。なお、上述の設定値の切り替えでなく設定ファイルの切り替えが行われているのが分かりやすいようにプロファイル名は
`dev-env`, `it-env`, `prod-env`とプロファイル名の後ろに`-env`を付けています。

- ファイルの配置と一覧
```shell
META-INF
 |-- microprofile-config-dev-env.properties
 |-- microprofile-config-it-env.properties
 |-- microprofile-config-prod-env.properties
 `-- microprofile-config.properties
```

- META-INF/microprofile-config-dev-env.properties(devプロファイル)
```shell
sample.db.url=jdbc:h2:tcp://localhost/~/dev-env
sample.db.id=dev-env
sample.db.password=dev-env
sample.db.option.prop2=dev-env-option1
```

- META-INF/microprofile-config-it-env.properties(itプロファイル)
```shell
sample.db.url=jdbc:h2:tcp://localhost/~/it-env
sample.db.id=it-env
sample.db.password=it-env
```

- META-INF/microprofile-config-prod-env.properties(prodプロファイル)
```shell
sample.db.url=jdbc:h2:tcp://localhost/~/prod-env
sample.db.id=prod-env
sample.db.password=prod-env
```

- META-INF/microprofile-config.properties(デフォルト)
```shell
sample.db.url=jdbc:h2:tcp://localhost/~/sample
sample.db.id=sample
sample.db.password=sample
sample.db.option.prop1=sample-option1
sample.db.option.prop2=sample-option1
```

このように設定ファイルを用意した場合、プロファイルで指定された設定ファイルだけが読み込まれるようになります。また、先ほどと同様に指定されたプロファイルに該当する設定ファイルがない場合はプロファイル名なしの設定ファイルが読み込まれるようにフォールバックします。


## 少しひねりを加えた設定ファイルの切り替え
1つの設定ファイル内に複数のプロファイルの設定を定義する場合はどの設定がプロファイルにより変わるかは一目瞭然ですが、設定ファイルごとの切り替えの場合、親となる無印の設定ファイル(microprofile-config.properties)だけではどの設定がプロファイルにより変わるかが分かりません。

また、これは1つの設定ファイル内に複数プロファイルを定義する場合も同様ですが、同じ設定キーを繰り返して定義するため、設定キーが変更された場合、広範に渡って影響を受けます。設定項目が自アプリが定義した項目だけであれば変えなければよいという話ですが、他のアプリやライブラリに依存した設定項目の場合、そうはいかず、外部要因の変更の影響をモロに受けます。

このため、プロファイルで切り替える設定項目は
- プロファイルで切り替わる設定項目であることを分かりやすくする
- 外部要因による設定キーの変更要因を局所化する
ことを目的に、値を直接設定するのではなく、MP Configのプロパティ式（置換変数）で定義する方法もあります。

[Config Profileによる設定ファイルの切り替え](#config-profileによる設定ファイルの切り替え)の例をプロパティ式を使って定義した場合、次のようになります。

- META-INF/microprofile-config.properties(デフォルト)
```shell
# プロファイルの切り替え項目
url=jdbc:h2:tcp://localhost/~/sample
id=sample
password=sample
# プロフラムからアクセスされる設定
sample.db.url=${url}
sample.db.id=${id}
sample.db.password=${password}
sample.db.option.prop1=sample-option1
sample.db.option.prop2=sample-option1
```

- META-INF/microprofile-config-dev-env.properties(devプロファイル)
```shell
url=jdbc:h2:tcp://localhost/~/dev-env
...
```

- META-INF/microprofile-config-it-env.properties(itプロファイル)
```shell
url=jdbc:h2:tcp://localhost/~/it-env
...
```

- META-INF/microprofile-config-prod-env.properties(prodプロファイル)
```shell
url=jdbc:h2:tcp://localhost/~/prod-env
...
```

アプリケーションからアクセスされる設定キー(`samp.db.*`)を定義するのは親となる無印の設定ファイルだけとなり、そこにはプロパティ式で評価された値を設定するようにします。プロパティ式の値はプロファイルごとの設定ファイルに定義されているため、Config Profileの機能により使用される設定ファイルが切り替わることでプロパティ式の値が変わるようになります。

:::info
「[第6回 お手軽便利MicroProfile Config](/msa/mp/cntrn06-mp-config/)」では紹介していませんでしたが、プロパティ式はMP Config 1.4から使える機能となります。プロパティ式の書式は
- `${expression:value}` - 式の値が見つからない場合、`:`の後に定義したデフォルト値を返す 
- `${my.prop${compose}}` - 入れ子の式。内部の式が最初に解決される
- `${my.prop}${my.prop}` – 複数の式。単にそれぞれを評価した結果を返します

となり、[公式マニュアル](https://download.eclipse.org/microprofile/microprofile-config-3.0.1/microprofile-config-spec-3.0.1.html#property-expressions)のサンプルをそのまま使って説明すると設定例とその評価結果は次のとおりとなります。

```shell
server.url=http://${server.host:example.org}:${server.port}/${server.endpoint}
server.port=8080
server.endpoint=${server.endpoint.path.${server.endpoint.path.bar}}
server.endpoint.path.foo=foo
server.endpoint.path.bar=foo
```

上記の設定で` server.url `が評価された場合、その結果は`http://example.org:8080/foo`となります。
:::

### まとめ
Config 2.0から設定の集約とConfig Profileの2つの大きな機能が追加されました。

Config Profileを利用する場合、本文でも触れたように不要な設定がランタイムに含まれるようになります。本質的に常に存在すべき設定であれば、jarの再作成(リビルド)なしに設定を切り替えることができるようになるため非常に便利な機能となりますが、例で説明したような環境ごとの切り替えに利用する場合、ランタイムに不要な設定情報を含むことになるため、その点には是非があります。

また、設定の集約は配列要素などの繰り返しやデータクラスのネスト構造が扱えないため、実用観点は今一歩だったりします。

しかしながら、仕様が着実に進化し、できることの選択肢が増えることは歓迎すべきことではないでしょうか。
