---
title: Java17にBump upしてみた - 使った/使わなかった新機能(後編)
author: toshio-ogiwara
tags: [java]
date: 2022-06-13
---

Java17にBump upしてみたの後編の今回は[前編](/blogs/2022/06/06/bumpup-java17-part1/)で紹介できなかった3つの機能を紹介していきます。


|機能|正式リリース|分類||
|---|-----|---|---|
|switch式|Java14|言語仕様の拡張|[前編で紹介](/blogs/2022/06/06/bumpup-java17-part1/#switch式の導入)|
|テキストブロック|Java15|言語仕様の拡張|[前編で紹介](/blogs/2022/06/06/bumpup-java17-part1/#テキストブロックの導入)|
|instanceofのパターン・マッチング|Java16|言語仕様の拡張|[前編で紹介](/blogs/2022/06/06/bumpup-java17-part1/#instanceofのパターン・マッチングの導入)|
|Recordクラス|Java16|言語仕様の拡張|後編(今回)で紹介|
|Sealedクラス|Java17|言語仕様の拡張|後編(今回)で紹介|
|Stream#toList() の追加|Java16|標準APIの追加|後編(今回)で紹介|

:::info
(前編の再掲)Java17にしてみたアプリの概要は次のとおりになります。
-	MicroProfileをつかったRESTアプリケーションでコンソールUIを持っている(GitHubの[こちら](https://github.com/extact-io/rms))
-	Java17にする前はJava11をベースに作られている(よって対象はJava12から17で取り入れられたモノ)
-	規模はプロダクトコードが8.7kstepでクラス数は244クラス(Sonar Cloudの[Measuresのより](https://sonarcloud.io/component_measures?metric=ncloc&id=extact-io_rms))
:::

[[TOC]]


## Recordクラスの導入
### 機能概要
Javaの慣習としてDTOなどのデータクラスにはgetter/setterを付けることが多くあります。しかし、フィールドが多いクラスではこれに比例してgetter/setterの数も多くなるため、コードの大部分が所謂ボイラープレートコード[^1]で埋め尽くされているといったことがよくあります。また、これとは別にDDDのValue Objectに触発されたこともあり、最近はImmutableなデータクラス[^2]が好まれるようになってきました。

[^1]: 言語仕様上省く事ができない定型的なコードだが、本質的なロジックではないため、アプリケーションを実装する上で冗長となるコード。
[^2]: 生成時にオブジェクトの内容を決定し、以後内容が変わることのない不変オブジェクト。言い方を変えるとオブジェクトの生成後に内容を変えてはいけないため、Immutableなクラスにはsetterを定義しません。

このようなImmutableなデータクラスをJavaの標準機能の範囲内で実装しようとした場合、IDEのコード生成機能の支援を受けられるとは言え、以前はフィールド、コンストラクタ、プロパティの取得メソッドといった定型的なコードを手で記述する必要がありました。

このように面倒でボイラープレートコードを増殖させるデータクラスのコードですが、Java16から正式導入されたRecordクラスを使うことで、コンストラクタの定義だけで済むようになります。どのようなものかは実際にコード例を見た方が早いため、Recordクラスを使った例と使わなかった例を次に示します。

- Recordクラスを使わなかった例
```java
public class Person {
    private Long id;
    private String name;
    public Person(Long id, String name) {
        this.id = id;
        this.name = name;
    }
    public Long getId() {
        return id;
    }
    public String getName() {
        return name;
    }
}
// usage of Person instance
public void usage() {
    // create instance.
    var person = new Person(1L, "taro");
    // getting data.
    var id = person.getId();
    var name = person.getName();
}
```

- Recordクラスを使った例
```java
public record Person(Long id, String name) {
}
// usage of Person instance
public void usage() {
    // create instance.
    var person = new Person(1L, "taro");
    // getting data.
    var id = person.id();
    var name = person.name();
}
```

Recordクラスはコストラクタで定義した引数がそのクラスのフィールドとして保持され、引数と同じ名称のメソッドからフィールド値を取得することができますが、これらの定義はコンパイラにより自動でバイトコードに埋め込まれるため、コード上には存在しません[^3]。イメージとしては引数を持たないデフォルトコンストラクタがコンパイラにより自動で定義されるのと同じとなります。

また、Recordクラスには値を設定するメソッドは生成されません。設定メソッドを自分でRecordクラスに実装しようにもフィールドがコード上に存在しないため、設定メソッドを自分で実装することもできません。よって、RecordクラスはコンパイラレベルでImmutableであることが保証されます。

[^3]: equals、hashCodeおよびtoStringメソッドも自動で埋め込まれます。

### 対象アプリへの適用
このようにRecordクラスを使うことでImmutableでボイラープレートコードを排除したデータクラスを簡便に作成できるようになります。なので「おっ、いいネ！」と思い早速Recordクラスを適用すべく対象アプリのコードを確認しましたが、そこで肝心なことに気がつきました。

対象アプリで持っているデータクラスの大多数は、外部からのリクエストデータを格納するリクエストDTOと外部に返却するデータを格納したレスポンスDTO、そしてDBアクセスに利用するJPAの@Entityを付けたエンティティクラスです。

それらクラスのインスタンス生成は自分で行うのではなく、JAX-RSとJPAが行うため、いずれも引数がないデフォルトコンストラクタが必須となります。

細かいところは利用するランタイムにより異なったりしますが、JAX-RSもJPAもデフォルトコンストラクタでインスタンスを生成、フィールドアクセスもしくはプロパティアクセスで値を設定するというスタイルのため、そもそもRecordクラスのインスタンス生成時に値を決定するスタイルとは全く合いません。このため、JAX-RSやJPAのデータクラスにRecordクラスを使うことはできません。

:::check
JPAのデータクラスとしてここで言っているのは@Entityを付けるエンティティクラスで、これは確かにRecordクラスを使うことはできません。が、しかし、JPQLのコンストラクタ式でバインドするDTOやネイティブクエリの結果をバインドするDTOとしてはRecordクラスを使うことができます[^4]。
[^4]: [Java Records – How to use them with Hibernate and JPA](https://thorben-janssen.com/java-records-hibernate-jpa/)
:::

アプリ内の大多数を占めるデータクラスでは利用できないと分かった以上、方式の均質性を崩してまで他の細々したデータクラスをワザワザRecordクラスに置き換えるメリットはないと考え、結果として対象アプリでRecordクラスを使うことはしませんでした。

:::column:標準ではないが(ほぼ)デファクトで使われているLombok
ボイラープレートコードはgetter/setterがその典型ですが、フィールドに対するコンストラクタやtoString実装など、他にもいくつか典型的なものがあります。これらボイラープレートコードに対するライブラリとして以前より[Lombok](https://projectlombok.org/)が一般的に利用されています。

Recordクラスはコンストラクタの定義から他の要素を生成しますが、Lombokはそれとは異なり、定義するものはフィールドとなります。Lombokではコードに定義したフィールドに対して生成したいボイラープレートコードをアノテーションで指定するスタイルとなります。対象アプリでもLombokはもとから使っており、リクエストDTOやエンティティクラスで次のように使っています。

- リクエストDTO
```java
@Getter
@Setter
@NoArgsConstructor // for JSON Seserialize
@AllArgsConstructor(staticName = "of")
@EqualsAndHashCode
@ToString
public class RentalItemClientDto implements Convertable {
    private Integer id;
    private String serialNo;
    private String itemName;
}

```

- エンティティクラス
```java
@Access(FIELD)
@Entity
@Getter
@Setter
@NoArgsConstructor // for JPA
@AllArgsConstructor(staticName = "of")
public class RentalItem implements Transformable, IdAccessable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String serialNo;
    private String itemName;
}
```

例から分かるとおり、Lombokでは様々なボイラープレートコードを生成することができます。また、これらはアノテーションを組み合わせて使うことができるため、引数付きコンストラクタの他にデフォルトコンストラクタが必要な場合はそれを追加するといった柔軟な使い方ができます。

また、Lombokは他のOSSライブラリと実行形態が異なります。LombokはJava6から導入されたannotation processor[^5]によりコンパイル時にアノテーションが処理され、@Getterであればソースコードにあたかもgetterのコードがあるようにコンパイルが行われます。よって、classファイルにはLombokへのリンク情報ではなくアノテーションに従った処理そのものが埋め込まれるため、実行時にLombokに対する依存が不要となります。事実、mavenのdendencyのscopeはprovidedで問題ありません。このことから、筆者はドメイン層への外部ライブラリの汚染はないものとしてドメイン層でも積極的にLombokを使っています。

[^5]: [projectlombok – Lombok Execution Path](https://projectlombok.org/contributing/lombok-execution-path)
:::

### 機能に対する感想
JAX-RSとJPAでデフォルトコンストラクタが必要となる制約があるため、対象アプリでRecordクラスを使用することはありませんでした。また、このような制約はJAX-RSとJPAを使った今回のアプリに固有なものではなく、どのアプリでも持ち合わせているものだと思います。また、コラムでも触れましたが、現時点でRecordクラスとLombokを比較した場合、圧倒的にLombokの方が使い勝手よいのは疑いようがありません。

このデフォルトコンストラクタが使えない制約とLombokの方が優れている点を踏まえると、JakartaEE、Spring問わずLombokを既に使っているプロジェクトでは、敢えてRecordクラスを全面的に使うべきところがありません（浮かびません）。

ただし、LombokにできなくRecordクラスで出来ることが1つだけあります。それはImmutableであることの保証です。Lombokでもsetterを設けないようにすることでImmutableなインスタンスにすることができますが、それはあくまでも利用者側の使い方に委ねられています。対してRecoredクラスはRecoredクラスであればImmutableであることが言語仕様レベルで保証されます。ですので、DDDのValue Objectなど絶対にImmutableであることを担保したいといったオブジェクトに対し限定的に使うのには効果があると考えます。

また、recordクラスはコンストラクタを定義するだけでカジュアルにデータクラスを作ることができます。このことから、リクエストDTOやレスポンスDTO、エンティティなどアプリ外部との入出力を司る表立ったデータクラスではなく、上記Informationでも触れたJPAのDTOなど一時的なデータの受け渡し用途にも適していると思います。

これ以外にも「アプリはすべてImmutableであるべきだ！」という原理主義的なプロジェクトやJava標準以外のライブラリ利用が制限されているため、そもそもLombokが使えないといったプロジェクトではその利用価値は十分にあると思います。

と色々と思うところがありますが、筆者なりの考えをまとめるとLombokを既に使っているプロジェクトでは従来どおり基本はLombokで必要に応じて補完的にRecordeクラスを利用するのが現実的かなと思っています。

## Sealedクラスの導入
### 機能概要
クラス設計をしている際、インタフェースの実装クラスや基底クラスに対するサブクラスを制限したい場合があります。継承や実現関係に対する制限は以前からprotectedやpackage privateによるアクセス制御である程度はできましたが、制約としては緩いところがありました。

これに対してJava17から正式導入されたSealedクラスおよびインタフェース（以降Sealedクラスと総称）では、拡張を許可する相手を次のようにpermitsキーワードでピンポイントで指定できる[^6]ようになりました。

[^6]: ただし、許可する相手は同じパッケージまたは(モジュールシステムの)同じモジュール内である必要があります。

```java
public sealed interface Repository
    permits JpaRepository, FileRepository {
}
```
```java
public final class JpaRepository implements Repository {
  public boolean register() {
    // do something code...
  }
}
```
```java
public final class FileRepository implements Repository {
  public boolean save() {
    // do something code...
  }
}
```

例はRepositoryインタフェースが拡張を許可する相手としてJpaRepositoryとFileRepositoryを指定しています。これ以外のクラスがRepositoryインタフェースを実装した場合、コンパイルエラーとなります。また、その反対に許可した相手が自身を拡張してない場合もコンパイルエラーになります。

### 対象アプリへの適用
インスタンスの種類をピンポイントで限定したいといったケースは対象アプリにはありませんでした。よって、使ったか使わなかったかでいうと、使おうと思ったが使う対象がなかったとなります。

### 機能に対する感想
現状Sealedクラス単体ではそれほど嬉しいとは思わない機能ですが、前編の[instanceofのパターン・マッチングの導入](/blogs/2022/06/06/bumpup-java17-part1/#instanceofのパターン・マッチングの導入)で触れた”switch式および文のパターン・マッチング”でも次のようにSealedクラスをswitch構文のターゲットで使えるようになります。

```java
public static boolean store(Repository repository) {
  return switch (repository) {
    case JpaRepository jpa -> jpa.register();
    case FileRepository file -> file.save();
  };
}
```

これは一見すると他のパターンマッチングと変わりがないように見えますが、ターゲットである評価対象がSealedクラスのため、emunと同様にコンパイル時に網羅性がチェックされます。これにより、Repositoryインタフェースに対して拡張を許可するクラスが追加された場合、このコードはコンパイルエラーとなり、ありがちなcaseラベルの追加考慮漏れを排除することができます。

このようなことからもSealedクラスは同じインスタンス種類が限定されるenumの高機能版のようなもので、その使いどころもenumと同じようになっていくいのではないかと個人的には思っています。

いずれにせよ、今のところenum以上の使いどころが見いだせないため、興味を引く機能でしたが、実際には積極的に使うようなものではないかなぁという印象です（もしかしたら使いこなせていないが正しいのかも知れませんが。。）


## Stream#toList()の導入
### 機能概要
StreamAPIを使ったコードは以下のように最後にリストにして終わることが多いと思います。そしてのコードは多くの方が思うように、`collect(Collectors…)`と毎回決まりきったタイプが必要となり面倒でした。

```java
List<String> messages = actual.stream()
        .map(ConstraintViolation::getMessageTemplate)
        .collect(Collectors.toList()); // ダラダラ..
```


これがJava16から追加されたStream#toList()メソッドを使うことで次のように`toList()`一発で済むようになります。

```java
List<String> messages = actual.stream()
        .map(ConstraintViolation::getMessageTemplate)
        .toList(); // スッキリ♪
```

### 対象アプリへの適用
利用しない手はないため、すべての`toList()`の箇所を書き換えました。その箇所、実に100か所強。当たり前ですが書き換え後も回帰テストを含め全く問題はありません。

### 機能に対する感想
タイプ量も減るのでJava16以降の環境では`collect(Collectors.toList())`ではなく追加された`toList()`を使うべきです絶対。

## まとめ
結果として最初に挙げた目星をつけた機能に対する評価は次のようになりました。

|機能|使ったか|お勧め度|
|---|:-:|:-:|
|[switch式](/blogs/2022/06/06/bumpup-java17-part1/#switch式の導入)|使った|◎|
|[テキストブロック](/blogs/2022/06/06/bumpup-java17-part1/#テキストブロックの導入)|使った|〇|
|[instanceofのパターン・マッチング](/blogs/2022/06/06/bumpup-java17-part1/#instanceofのパターン・マッチングの導入)|該当がなかった|△|
|[Recordクラス](#recordクラスの導入)|該当がなかった|〇|
|[Sealedクラス](#sealedクラスの導入)|該当がなかった|△|
|[Stream#toList()の追加](#stream#tolistの導入)|使った|◎|

個人的にはJavaSE標準のRecordクラスがJakartaEEのJAX-RSやJPAのエンティティクラスで使えなかったのが残念です。Recordクラスには今後より使い勝手が良くなっていくことを期待したいです。


---
参照資料

- [JDK 17ドキュメント: Java言語更新](https://docs.oracle.com/javase/jp/17/language/java-language-changes.html)
- [Java8からJava11への変更点(きしだなおきさん)](https://qiita.com/nowokay/items/1ce24079f4daafc73b4a)
- [Java 9 から Java 17 までのアップデートのまとめ(寺田よしおさん)](https://github.com/yoshioterada/Java-Update-From-JavaSE9-to-Java17)
- [Java新機能（ひしだま's ホームページ）](https://www.ne.jp/asahi/hishidama/home/tech/java/uptodate.html)
