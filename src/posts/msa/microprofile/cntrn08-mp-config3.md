---
title: 第8回 MicroProfile Config 3.0へのキャッチアップ
author: toshio-ogiwara
date: 2022-09-12
tags: ["逆張りのMicroProfile"]
prevPage: ./src/posts/msa/microprofile/cntrn07-mp-restclient.md
nextPage: ./src/posts/msa/microprofile/cntrn09-mp-openapi3.md
---
Helidon 3.0がリリースされMicroProfile5.0準拠となり、ついにHelidonでもMicroProfile Config 3.0(MP Config 3.0)の機能が使えるようになりました。そこで今回は前回紹介できなかった2.0から3.0までに取り入れられた便利な機能をその差分として紹介します。このため、今回の記事は[第6回 お手軽便利MicroProfile Config](/msa/mp/cntrn06-mp-config/)の理解を前提にしています。まだの方はそちらから読んでいただければと思います。

記事はコードの抜粋を記載します。全体を見たい場合や動作を確認したい場合は以下のGitHubリポジトリを参照ください。
- <https://github.com/extact-io/contrarian-microprofile-sample/tree/main/05-config_3.0>

MicroProfileは連載を行ってます。よければ他の記事も下のリンクからどうぞ！
- [逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)


:::info
この記事はJava17+Helidon 3.0.1 + MicroProfile Config 3.0.1をもとに作成しています。
:::

## 紹介する機能
MP Config 2.0から3.0までに取り入れられた便利な機能として今回紹介するのは次の2つとなります。
- 設定データの集約
- Config Profile

いずれもMP Config 2.0で取り込まれた便利な目玉的機能となります。

:::column:MP Configのバージョンと主な変更点
執筆時点のHelidonの最新バージョンとなる3.0.1はMicroProfile 5.0に対応していますが、1つの前のメジャーバージョンのHelidon 2.xのMicroProfile対応は3.3でした。よって、Helidon 3.0はMicroProfile 4.0を飛ばして一気にジャンプアップした形になります。これによりMP Configのバージョンの動きと対応関係が掴みづらくなっていますがこれを整理すると次のようになります。

- MP Config 3.0.1
  - ランタイムに関係ないライセンス表示の修正のみ
- MP Config 3.0
  - MicroProfile 5.0で取り込まれたバージョン。Helidonでは3.0で対応
  - Jakarta EE 9.1に対応し依存パッケージがjavax.*からjakarta.*に変更となった。機能自体はMP Config 2.0と同じ
- MP Config 2.0
  - MicroProfile 4.0で取り込まれたバージョン
  - 今回紹介する2つの機能や互換性のないAPIの変更[^1]など大きな変更が加えられた
- MP Config 1.4
  - MicroProfile 3.3で取り込まれたバージョン。Helidonでは2.xで対応
  - byte、short、char の組み込みコンバーターの追加など小規模な変更
:::

[^1]: Jakarta EEで互換性のない変更が行われることはかなり稀ですが、MicroProfileではMP Configに限らず互換性のない変更はそこそこ行われる印象があります。MicroProfileはJakarta EEとは異なりリリースサイクルを短くしフィードバックを得ながら改善していくことを方針としているため、互換性のない変更が行われることはやむを得ないことであり許容すべきことだと理解しています。ただ「互換性のない変更」といっても行われるのは些細なレベルで数も少ないため実用的には問題にならないレベルです（...今のところ）。

## 設定データの集約
意味的にまとまった設定値があっても、MP Config 1.4では設定値を粒々1つずつ取得するしかありませんでした。これがMP Config 2.0で導入された設定データの集約機能を使うと、アプリケーションで定義した任意のデータクラスに設定値を直接バインドしてもらうことができるようになります。

例えば次のようなDBの接続情報に関する3つの設定があったとします。

```shell
sample.db.url=jdbc:h2:tcp://localhost/~/sample
sample.db.id=sample
sample.db.password=sample
```

意味的にまとまったデータをアプリケーションで扱う場合、データの意味を表すクラスを定義し、関連する情報を1つのインスタンスにまとめて管理したくなります。このようなことをMP Config 1.4で行う場合、Configインスタンスから個別に設定値を取得し、その値をインスタンスに格納する処理を自分で実装する必要があり面倒でした。

MP Config2.0から導入された設定データの集約機能を使うことで、次のように設定値をデータクラスにまとめて取得できるようになります。

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

1. 設定値をバインドするデータクラスには`@ConfigProperties`を付け、`name`属性にバインドする設定キーのプレフィクスを定義します。これを定義するだけでフィールドには`prefixで指定したキー名.フィールド名`の設定値がバインドされるようになります。
   なお、MP Configランタイムは可視性に関係なくフィールドに直接アクセスするため、setterは必要ありません。
2. 設定値をバインドするオブジェクトはCDI Beanとする必要があります。このため、なんらかのCDIスコープアノテーションを付与します。
3. 1.で説明したとおりデフォルトではフィールド名が設定キー名の一部となりますが、設定キー名とバインドさせたいフィールド名が異なる場合は`@ConfigProperty`の`name`属性にマッピングを定義することができます。

次にこの`@ConfigProperties`を付けたデータクラスで設定値を受け取る方法ですが、これには２つあります。１つはCDIクラスから動的に取得する方法、もう一つは`@Inject`のインジェクションによる取得する方法です。それでは具体的な方法を見ていきます。

まずCDIクラスからの取得は次のようになります。
```java
DbInfo sampleDbInfo = CDI.current()
        .select(DbInfo.class, ConfigProperties.Literal.NO_PREFIX)
        .get();
```

データクラスのインスタンスが1つしかない場合でも`CDI#select()`の第2引数のQualifierの指定は必要となります。`@ConfigProperties`の中身を見れば分かりますが、その実体はQualifierです。Qualifier指定が必要なのはMP Configランタイムが`@ConfigProperties`指定されたCDI Beanを設定値のバインドが必要な特別なBeanとして扱うためと思われます。

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

CDIクラスからの取得と同様に`@Inject`で取得する場合も`@ConfigProperties`指定が必要となります。

ここまでが基本的な利用法となります。次からは細かい機能やルールなどを紹介してきます。

### 設定キーのレベルが深い値の取得
今までの例は設定キーのレベルがすべて同じでしたが、次のようにレベルが深い設定キーがあった場合、どうすればいいでしょうか。

```shell
sample.db.url=jdbc:h2:tcp://localhost/~/sample
sample.db.id=sample
sample.db.password=sample
### ↓↓ キーのレベルが深くなる設定
sample.db.option.prop1=sample-option1
sample.db.option.prop2=sample-option1
```

このような場合も１つのデータクラスにバインドさせることができます。レベルが深くなる設定キーがある場合は次のように`@ConfigProperty`の`name`属性にキー名の後続部分を明示することで該当する設定値をバインドさせることができます。

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

例の補足として、フィールドの型をOptionalにしているのは設定なしも許容する任意設定の項目を想定しているからで、これはMP Configの仕様とは関係ありません。

:::check:データクラスのネストはできません！
レベルの異なる設定値が取得できるのなら、次のようにレベルが異なる部分を別のデータクラスにまとめられるかな？まとめたいな！と思うかも知れませんが、残念ながらこれは頑張ってもできません。

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
MP Config 3.0でできるのはネスト構造を持たないフラットなデータクラスへのバインドまでとなります。
:::

### prefix指定のオーバーライド
今までの例は1つのデータクラスに対してバインドする設定値(の塊)は1つでしたが、今度は次ように接続先が2つあった場合の例を見ていきます。

```shell
sample.db.url=jdbc:h2:tcp://localhost/~/sample
sample.db.id=sample
...
test.db.url=jdbc:h2:tcp://localhost/~/test
test.db.id=test
test.db.password=test
```

設定値が異なるだけで、両者とも構造は全く同じなのでどちらも`DbInfo`クラスで取得したいですよね？そんな時はデータクラスに指定した`@ConfigProperties`の`prefix`属性を次のように外側からオーバーライドすることができます。

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

データクラスに指定した`@ConfigProperties`の`prefix`属性はあくまでもそのデータクラスにバインドする設定キーのデフォルト値的な扱いになります。ですので、それ以外の設定キーをバインドしたい場合は今回の例のようにprefix指定を外側（利用者側）から上書き指定します。


設定データの集約機能の説明はこれで終わりとなります。次からはもう1つの紹介機能のConfig Profileを説明していきます。

## Config Profileによる設定値の切り替え
設定ファイルを使って定義する典型的な情報として環境依存に関するものがあります。これまでの例で使っていたDBの接続情報ですが、ローカル環境、IT環境、本番環境で異なるのが普通です。では環境による設定情報の切り替えはどのようにすればよいでしょうか？と言いうお題に対してMP Config2.0から用意されたのが、今から説明するConfig Profileになります。

この機能は見た方が早いと思うので、まずは接続情報が環境ごとに異なる場合の設定例から見てもらいます。

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

Config Profileでは`%`をつけた任意のプロファイル名をキーに付加できるようになっています。この例ではローカル環境は`%dev`、IT環境は`%it`、そして本番環境は`%prod`としてプロファイルキーを付加して、それぞれの設定値を定義しています。

この設定でやりたいことは、ローカル環境(devプロファイル)なら`sample.db.url`の設定として`jdbc:h2:tcp://localhost/~/dev`を返してもらうことですが、このMP Configランタイムに対するプロファイルの指定はシステムプロパティの`mp.config.profile`で行います。

それではプロファイルを指定して設定ファイルを取得した実行結果を見ていきましょう（コンソールにはDbInfoクラスのオブジェクト内容を出力するようにオーバーライドしたtoStringメソッドの結果を出力しています）

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

実行結果から分かるように、MP Configは`mp.config.profile`でプロファイルが指定されている場合、プログラムで指定されているキー名に`%profile`を付加して設定を検索します。これによりプログラムで指定するキー名は変えず、プロファイルに応じた設定値を取得することができるようになります。

ただ、この設定ではプロファイルを指定しなかった場合、実行時にエラーとなってしまいます。プロファイルが指定されない場合、ケースにもよりますが、エラーではなく、デフォルト的な設定を返すようにしたい場合もあると思います。このような場合は次のようにプロファイルキーを含まない設定を付けておきます。

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

MP Configはプロファイルが指定されている場合、そのプロフィルキーが付いた設定を優先的に検索しますが、該当がない場合はプロフィルキーなしの設定にフォールバックして検索を行います。

:::alert
[設定データの集約](#設定データの集約)はHelidon独自拡張のapplication.yamlでもサポートされていますが、Config Profileはサポートされていません。したがって、HelidonでConfig Profileが使える設定ファイル形式はMP Config標準の'META-INF/microprofile-config.properties'のみとなります。
また、'%'はYAMLで特別な意味を持つメタキャラクタとして定義されているため、キー名に利用することはそもそもできません。このことから、MP Configを自分で独自拡張してもYAMLでConfig Profileを使えるようにするのは難しいと思われます。
:::

## Config Profileによる設定ファイルの切り替え
1つの設定ファイル内の設定をプロファイルで切り替える例を見てきましたが、Config Profileは設定ファイルごとまるごと切り替えることもできます。

上で見てきた例を設定ファイル単位で切り替える場合は、以下のようにファイル名を`microprofile-config-<profile>.properties`としたプロファイルごとの設定を用意します。なお、設定ファイル内の切り替えと違いを分かりやすくするためプロファイル名は`dev-env`, `it-env`, `prod-env`と後ろに`-env`が付いたプロファイル名に変えています。

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

プロファイルごとの設定ファイルを用意した場合はプロファイルで指定された設定ファイルだけが読み込まれるようになります。また、先ほどと同様に指定されたプロファイルに該当する設定ファイルがない場合はプロファイル名なしの設定ファイル読み込みにフォールバックします。


## 少しひねりを加えた設定ファイルの切り替え
1つの設定ファイル内に複数のプロファイル設定をする[設定値の切り替え](#config-profileによる設定値の切り替え)では問題となりませんが、[設定ファイルごとの切り替え](#config-profileによる設定ファイルの切り替え)方式は、親となる無印の設定ファイル(microprofile-config.properties)だけを見てもどの設定がプロファイルにより変わる項目かが分かりません。

また、これは1つの設定ファイル内に複数のプロファイル設定をする場合も同じですが、同じ設定キーを繰り返して定義するため、設定キーが変更された場合、広範に渡って影響を受けます。自アプリが定義した設定項目だけであれば「変えなければよい」という話ですが、他のアプリやライブラリに依存した設定項目の場合、そうはいかず、外部要因の変更影響をモロに受けます。

このため、プロファイルで切り替える設定項目は、以下の要件を満たすべきです。
- プロファイルで切り替わる設定項目であることを分かりやすくする
- 外部要因による設定キーの変更箇所を局所化する

これを満たすために、値を直接設定するのではなく、MP Configのプロパティ式（置換変数）で定義する方法があります。

[Config Profileによる設定ファイルの切り替え](#config-profileによる設定ファイルの切り替え)で使った例をプロパティ式を使って書き換えた場合、次のようになります。

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

アプリケーションからアクセスされる設定キー(`sample.db.*`)を定義するのは親となる無印の設定ファイルだけとなり、そこにはプロパティ式で値を設定するようにします。プロパティ式の値はプロファイルごとの設定ファイルに定義されているため、Config Profile機能で使用される設定ファイルが切り替わることでプロパティ式の値が変わるようになります。

:::info
「[第6回 お手軽便利MicroProfile Config](/msa/mp/cntrn06-mp-config/)」では紹介していませんでしたが、プロパティ式はMP Config 1.4から使える機能となります。プロパティ式の書式は
- `${expression:value}` - 式の値が見つからない場合、`:`の後に定義したデフォルト値が返される 
- `${my.prop${compose}}` - 入れ子の式。内側の式が最初に解決される
- `${my.prop}${my.prop}` – 複数の式。単にそれぞれを評価した結果が返される

となります。[公式マニュアル](https://download.eclipse.org/microprofile/microprofile-config-3.0.1/microprofile-config-spec-3.0.1.html#property-expressions)に記載のサンプル設定例とその評価結果は次のとおりになります。

```shell
server.url=http://${server.host:example.org}:${server.port}/${server.endpoint}
server.port=8080
server.endpoint=${server.endpoint.path.${server.endpoint.path.bar}}
server.endpoint.path.foo=foo
server.endpoint.path.bar=foo
```

この設定で` server.url `が評価された場合、結果は`http://example.org:8080/foo`となります。
:::

### まとめ
MP Config 2.0では今回紹介した設定データの集約とConfig Profileの2つの大きな機能が追加されました。

Config Profileは一見便利に見えますが対象とする実行環境に不要な設定がランタイムに含まれるようになります。本質的に常に存在すべき設定であれば、jarの再作成(リビルド)なしに設定を切り替えることができるようになるため非常に便利な機能となりますが、例で説明したような環境ごとの切り替えに利用する場合、ランタイムに不要な設定情報を含むことになるため、その利用の是非[^2]はあるかと思います。

また、設定データの集約は配列などの繰り返し項目やデータクラスのネスト構造は扱えないため、実用観点では今一歩だったりします。

しかしながら、仕様が着実に進化し、できることの選択肢が増えることは歓迎すべきことではないでしょうか。

[^2]: 要は本番に配置するモジュール内にローカル環境やIT環境などテスト環境に関する設定を堂々と含めて良いのか？になります。