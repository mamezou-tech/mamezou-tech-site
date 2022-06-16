---
title: Java17にBump upしてみた - 使った/使わなかった新機能(前編)
author: toshio-ogiwara
date: 2022-06-06
---

LTSのJava17が2021年9月に正式リリースされ9ヶ月経ちました。新しもの好きだけどハマるのも嫌いな私は様子見をしていましたが、気がつけばパッチバージョンも3に上がっている[^1]ことから、そろそろ使ってみるか！ということで別の記事でも紹介しているMicroProfileの[リファレンスアプリ](https://github.com/extact-io/rms#readme)をJava11からJava17にBump upしてみました。Java17にするといっても利用するJVMだけを17にしてもつまらないのでコードもフレッシュにしてみましたが、実際にやってみたら「うーん、これ使いどころないなぁ」という機能もあったりです、、

利用を検討した新機能の説明に加え、実際にそこそこの規模のアプリをJava17化してみて、そこで思ったことや感じたことを含めながらBump upした内容を紹介していきたいと思います。

:::info
Java17にしてみたアプリの概要は次のとおりになります。
-	MicroProfileをつかったRESTアプリケーションでコンソールUIを持っている(GitHubの[こちら](https://github.com/extact-io/rms))
-	Java17にする前はJava11をベースに作られている(よって対象はJava12から17で取り入れられたモノ)
-	規模はプロダクトコードが8.7kstepでクラス数は244クラス(Sonar Cloudの[Measuresのより](https://sonarcloud.io/component_measures?metric=ncloc&id=extact-io_rms))
:::

[^1]: 利用したのは[Eclipse Temurin jdk-17.0.3+7](https://adoptium.net/temurin/archive)になります

[[TOC]]

Java11からJava17で取り込まれた機能や変更は大小様々ありますが、その中からプレビュー段階のものを除きアプリケーション開発者の視点でJava17にするならコレ使ってみたなと事前に目を付けていた機能がありました。

記事では目星をつけた次の機能１つずつに対し対象アプリのコードを見ながら検討した結果について、実際に使ったか使わなかったか、適用にあたって思ったことや感じたことなども含め、その内容を前編後編の2回に分けて紹介していきます。

|機能|正式リリース|分類||
|---|-----|---|---|
|switch式|Java14|言語仕様の拡張|前編(今回)で紹介|
|テキストブロック|Java15|言語仕様の拡張|前編(今回)で紹介|
|instanceofのパターン・マッチング|Java16|言語仕様の拡張|前編(今回)で紹介|
|Recordクラス|Java16|言語仕様の拡張|[後編](/blogs/2022/06/13/bumpup-java17-part2/)で紹介|
|Sealedクラス|Java17|言語仕様の拡張|[後編](/blogs/2022/06/13/bumpup-java17-part2/)で紹介|
|Stream#toList() の追加|Java16|標準APIの追加|[後編](/blogs/2022/06/13/bumpup-java17-part2/)で紹介|

:::column: Java8からのBump up Java11
今回Java17化しようとしているアプリはもともとJava8だったため、今回と同じようにLTSのJava11がリリースされてからまとめてJava11にキャッチアップしました。Java8からJava11でも言語仕様の拡張から標準APIの追加まで大小様々な追加変更が行われましたが、その中でもコレは便利だなと積極的に取り込んだ機能として次の２つがあります。
-	var宣言によるローカル変数の型推論（言語仕様の拡張）
-	ofよるImmutableなコレクション(List/Set/Map)の生成（標準APIの追加）

前者のvar宣言は今ではよく目にするようになりましたが、次のように型推論により型指定が不要になるものです。
```java
var car = new Car(8, "Legacy B4");
var id = car.id();
var modelName = car.modelName();
```

1行の文字数も少なくなりタイプ数も減るため「これは便利便利」と当初は全面的に使っていましたが、そうしてできたコードを後から見ると変数のインスタンスがコードを追わないと分からなくなり、却ってコードが追いづらくなるというvar宣言の罠にみごとにハマったりしましたが、使う場所や使い方に気を付ければ[^2]スゴク便利だと実感しています。

後者のofによるインスタンスの生成はList/Set/Mapのインタフェースにstaticのofメソッドが追加され、次のようにImmutableなインスタンスを一発で生成できるようになりました。

```java
var fruits = List.of("リンゴ", "バナナ", "みかん");
```

コレクションの初期値設定はコードの至るところででてきますが、今までは複数行(ステートメント)で記述するしかなかったですが、この`of`メソッドを使うことで1行で簡潔に書けるようになります。

Java8からJava11の変更点の目玉としてJava9で取り込まれた「モジュールシステム」がありますが、私は使ったことも使いたいと思ったこともありません。これは私がアプリケーション開発者だからだと思いますが日ごろその存在を意識することはほぼありません。

[^2]: OpenJDKプロジェクトからvar宣言の利用ガイドライン([Local Variable Type Inference Style Guidelines](http://openjdk.java.net/projects/amber/guides/lvti-style-guide))が出されています。とても参考になるので一読の価値ありです。
:::

## switch式の導入
### 機能概要
swithc文を使ったコードの流れは大きく以下の3つに分類できます。
1. caseラベルで分岐を行い一致したラベルの処理で決定した値を変数に格納する。
2. caseラベルで分岐を行い一致したラベルの処理で決定した値をリターンする。
3. caseラベルで分岐を行い一致したラベルの処理でそれに応じた処理を実行する。

1.の具体的な例を挙げると次のようなコードになります。
```java
Path filePath;
switch (fileType) {
  case "permanent":
    filePath = new PathResolver.FixedDirPathResolver().resolve(fileName);
    break;
  case "temporary":
    filePath =  FileAccessor.copyResourceToRealPath(fileName, new PathResolver.TempDirPathResolver());
    break;
  default:
    throw new IllegalArgumentException("unknown fileType -> " + fileType);
}
```

典型的なswitch文のコードですが、このコードにはイケてない点が2つあります。１つはcaseラベルごとに代入が必要となる点、もう1つはbreak文を忘れがちな点です。

いずれもしょうがないかと思っていましたが、これがJava14から正式導入されたswitch式を使うことですっきり解決します！うんっ？タイポと思った方がいるかもしれませんがタイポではありません。従来のswitchはswitch”文”でJava14で導入されたのはswitch”式”です。

switch式はその名のとおり”式”なので、switchステートメント(switchブロック)の結果として値を返すことができます。どのようなことかというと上で示したswitch文をswitch式で書き換えると次のようになります。

```java
Path filePath = switch (fileType) {
  case "permanent" -> new PathResolver.FixedDirPathResolver().resolve(fileName);
  case "temporary" -> FileAccessor.copyResourceToRealPath(fileName, new PathResolver.TempDirPathResolver());
  default -> throw new IllegalArgumentException("unknown fileType -> " + fileType);
};
```

ポイントはswitch文ではcaseラベルごとに一時変数に値を格納する必要があったのが、switch式ではswitch自体が値を返すため、caseラベルでの代入が不要になっているところです。

また、switch式のcaseラベルに対する処理はアロー演算子(`->`)で記述するため、例のような結果が返却されることを期待したswitch式で結果を返さなかった場合、コンパイルエラーになります。これにより、従来のswitch文で起こりがちであったbreak文のウッカリ忘れのようなことをコンパイラレベルで防ぐことができます。

さらに、switch式はswitch文と違いcaseラベルに対する網羅性がチェックされます。これは評価対象であるターゲットに対するすべての候補がラベルで挙げられているかのコンパイラのチェックとなります。これがあるおかげでswitch式が値を返さない可能性のある次のようなケースはコンパイルエラーとなります。

```java
private static String getMessage(Response response) {
  return switch (response.getStatus()) { // compile error..
    case 401 -> "認証エラー";
    case 403 -> "認可エラー";
  };
}
```

上記は数値型の全てのパターンを網羅できていないためコンパイルエラーとなります。これを正しくするには次のようにdefaultラベルを付けます。

```java
private static String getMessage(Response response) {
  return switch (response.getStatus()) {
    case 401 -> "認証エラー";
    case 403 -> "認可エラー";
    default -> "不明のエラー"; // added default label.
  };
}
```

このようにswitch式では多くのケースでdefaultラベルが必要となりますが、defaultラベルがなくてもエラーにならないケースがあります。それはインスタンスの種類をコンパイラが確定できる場合です。

enumがその典型的な例ですべての種類がcaseラベルに網羅されている次のコードはdefaultラベルがなくてもエラーとなりません。（逆にdefaultラベルがあった場合、コンパイラはデッドコードと判断できますがエラーにしてくれません、実害はないですが微妙、、）

```java
Status status = switch (exception.getCauseType()) {
  case NOT_FOUND          -> Status.NOT_FOUND;
  case DUPRICATE, REFERED -> Status.CONFLICT;
  case FORBIDDEN          -> Status.FORBIDDEN;
};
...
public enum CauseType  {
    NOT_FOUND,
    DUPRICATE,
    FORBIDDEN,
    REFERED
}
```

プログラミング作法として想定外の事態に備え選択条件式には「それ以外だったら」を考慮しておく防御的プログラミングの重要性は昔から言語を問わず言われてきました。従来のswitch文ではdefaultラベルの考慮が漏れることがよくありましたが、switch式を使うことでコンパイラが保証してくれ、より安全なコードとすることができます。

### 対象アプリへの適用
switch文よりもいいことずくめなため対象アプリのswitch文をすべてswitch式に書き換えました。置き換えた結果を見てもswitch式よりもswitch文の方がいいなと思う点は１つもありませんでした。

### 機能に対する感想
switch式は従来のswitch文の使い勝手を損なうことなく、いい感じに改良された言語機能だと感じました。また後の話題でも少し出てきますが、今後もswitch式は拡張され、より便利になっていく予定となっています。よって、今後はswitch式を使うコーディングスタイルが当たり前になっていくと思われます。使って損はないため機会があれば今のうちから積極的に使っておくことを薦めます。

## テキストブロックの導入
### 機能概要
起動時のコンソールロゴやエラー時の丁寧なinformationなど複数行に渡る文字列を出力する場合、従来は以下のようにインデントや折り返し位置に気を使いながら文字列を+連結していくことが必要でした。

```java
static final String LOGO =
      "    ____    __  ___  _____" + System.lineSeparator()
    + "   / __ \\  /  |/  / / ___/" + System.lineSeparator()
    + "  / /_/ / / /|_/ /  \\__ \\" + System.lineSeparator()
    + " / _, _/ / /  / /_ ___/ /" + System.lineSeparator()
    + "/_/ |_(_)_/  /_/(_)____(_)" + System.lineSeparator();
```

Java15から導入されたテキストブロックは`"""`から`"""`までのブロックを一連の文字列と認識するため、以下のように複数行の文字列が定義しやすくなります。

```java
static final String LOGO ="""
          ____    __  ___  _____
         / __ \\  /  |/  / / ___/
        / /_/ / / /|_/ /  \\__ \\
       / _, _/ / /  / /_ ___/ /
      /_/ |_(_)_/  /_/(_)____(_)
      """;
```

### 対象アプリへの適用
対象アプリでも複数行に渡る文字列を定義している箇所が1か所だけありました。それが上記に示した例[^3]です。
[^3]: 出力例の"RMS"はRentalManagementSystemの略でJava17化している対象アプリの名称です。

### 機能に対する感想
変更後の例から分かるとおりゴチャゴチャしたコードをスッキリさせることができます。また、今回詳細は触れていませんが行頭インデントやエスケープなども細かく考慮されており、利用を阻害する要因はありません。ですので、複数行に渡る文字列を定義する場合は、従来の＋連結ではなく、テキストブロックを積極的に使うことを薦めます。



## instanceofのパターン・マッチングの導入
### 機能概要
instanceof演算子を使うケースの多くは以下のようなインスンタスの型を確認した後に確認した型にダウンキャストキャストし参照する型を入れ替えるコードとなります。

```java
public static boolean execute(Repository repository) {
  if (repository instanceof JpaRepository) {
    JpaRepository jpa = (JpaRepository) repository;
    return jpa.register();
  }
  if (repository instanceof FileRepository) {
    FileRepository file = (FileRepository) repository;
    return file.save();
  }
  throw new IllegalArgumentException("Unknown repository");
}
...
public interface Repository {
  public class JpaRepository implements Repository {
    public boolean register() {
      // do something code...
    }
  }
  public class FileRepository implements Repository {
    public boolean save() {
      // do something code...
    }
  }
}
```

このようなコードはJava16から正式導入されたinstanceofのパターン・マッチングを使うことで次のように評価と代入をまとめて記述できるようになります。

```java
public static boolean execute(Repository repository) {
  if (repository instanceof JpaRepository jpa) {
    return jpa.register();
  }
  if (repository instanceof FileRepository file) {
    return file.save();
  }
  throw new IllegalArgumentException("Unknown repository");
}
```

「パターンマッチング」とはオブジェクトに特定の構造があるかをテストし、一致がある場合はそのオブジェクトからデータの抽出を行うJavaの言語仕様で、”instanceofのパターン・マッチング”はそのパターンパッチングをinstanceof演算子で使えるようにしたものとなります。

instanceofにおけるパターン・マッチングは3つの要素から成り立っています。１つ目は述語となるinstanceof演算子、2つ目は述語の評価対象となるターゲット、最後は述語がtrueの場合にターゲットを格納するパターン変数となります。これをコード例の1つ目のif文に当てはめて説明すると「ターゲットの`repository`が述語の`JpaRepository`のインスタンスであるか？を満たす場合に、`JpaRepository`型のパターン変数にターゲットの参照を代入する」となります。

### 対象アプリへの適用
今回の例にあるようなinstanceofによるif文でダウンキャストしてメソッドを呼び出すコードよりも、オブジェクト指向プログラミングでは後述のコラムにあるようにインタフェースや抽象クラスを使ってポリモーフィズムで振る舞いを切り替える実装の方が好ましいです。

対象アプリにif文でinstanceofを使っているコードがあった場合、”instanceofのパターン・マッチング”で置き換えることを考えていましたが、上述のとおりもともとがあまり好ましくないコードのため、やはり対象となるコードはアプリにありませんでした。よって、使ったか使わなかったかでいうと、使おうと思ったが使う対象がなかったとなります。

:::column:オブジェクト指向プログラミングによる複雑さへの対処
複雑さを表す1つの指標として分岐の数があります。これは分岐が増えれば増えるほど複雑になり、少なければ少ないほど分かりやすいという考えに基づいています。オブジェクト指向プログラミングではポリモーフィズムにより分岐を排除することで複雑さを低減させることができます。このため、instanceofによるif文でダウンキャストしたコードはオブジェクト指向プログラミングを活かす格好のリファクタリングのターゲットとなります。参考までにinstanceofのパターン・マッチングの説明で利用したコードをポリモーフィズムにより分岐を排除した例は次のとおりになります。

```java
public static boolean execute(Repository repository) {
  return repository.store();
}
...
public interface Repository {
  boolean store();
  public class JpaRepository implements Repository {
    public boolean register() {
      // do something code...
    }
    @Override
    public boolean store() {
      return this.register();
    }
  }
  public class FileRepository implements Repository {
    public boolean save() {
      // do something code...
    }
    @Override
    public boolean store() {
      return this.save();
    }
  }
}
```
:::


### 機能に対する感想
今回は使う場所がありませんでしたが、instanceofの分岐でダウンキャストする実装が必要となった場合、旧来の実装よりも”instanceofのパターン・マッチング”を使った方が明らかに簡潔なコードとなるため積極的に使うべきものです。（ただしあくまでもif文によるダウンキャストが必要になった場合です）

その一方で「そもそもinstanceofって余り使わないし、簡潔になるといっても変数の代入が1つ減るだけじゃん・・」と思われる方もいるかと思いますが、私もそのとおりだと思っています。正直、これだけで取り立てて言うほど嬉しいとは思いません。

この”instanceofのパターン・マッチング”はJava17でもプレビュー機能として取り入れられている”switch式および文のパターン・マッチング”の布石となっています。switchのパターンマッチングでは”instanceofのパターン・マッチング”をcaseラベルに置くイメージで次のような実装ができるようになります。

```java
public static boolean store(Repository repository) {
  switch (repository) {
    case JpaRepository jpa:     return jpa.register();
    case FileRepository file:   return file.save();
    default:    throw new IllegalArgumentException("Unknown repository");
  }
}
```

instanceofを使った場合、if-elseif-elseで記述する必要があるため可読性がよくありませんが、switchを使うことにより、より簡潔により可読性の高いコードを記述することができようになります。今後は”switch式および文のパターン・マッチング”のコーディングスタイルは標準的になってくると思います。ですので、それまでの練習として今からでも使えるところがあれば、”instanceofのパターン・マッチング”を使っておいて損はないと思います。


前編の今回は以上となります。残りの3つの機能は[後編](/blogs/2022/06/13/bumpup-java17-part2/)で紹介したいと思います。

---
参照資料

- [JDK 17ドキュメント: Java言語更新](https://docs.oracle.com/javase/jp/17/language/java-language-changes.html)
- [Java8からJava11への変更点(きしだなおきさん)](https://qiita.com/nowokay/items/1ce24079f4daafc73b4a)
- [Java 9 から Java 17 までのアップデートのまとめ(寺田よしおさん)](https://github.com/yoshioterada/Java-Update-From-JavaSE9-to-Java17)
- [Java新機能（ひしだま's ホームページ）](https://www.ne.jp/asahi/hishidama/home/tech/java/uptodate.html)
