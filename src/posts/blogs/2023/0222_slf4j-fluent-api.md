---
title: SLF4J 2.0のfluent logging APIでログ出力も流暢に
author: toshio-ogiwara
date: 2023-02-22
tags: [java]
---
昨年8月にリリースされたSLF4J 2.0の一番の目玉はJava9で導入されたモジュールシステム対応ですが、もう一つの目玉としてfluent logging API(fluent API)の追加があります。ログ自体が地味な機能のためあまり注目されることはないですが、少し使ってみたところイイ感じだったので今回はこのAPIを紹介したいと思います。

# 旧来のAPIとfluent APIの比較
難しいAPIでもないので実際の例を見てもらうのが一番早いです。例としては[公式マニュアルの例](https://www.slf4j.org/manual.html#fluent)が秀逸なので、この例をもとにfluent APIを紹介していきます。

```java
int newT = 15;
int oldT = 16;

// 1. using traditional API
logger.debug("Temperature set to {}. Old value was {}.", newT, oldT);

// 2. using fluent API, log message with arguments
logger
  .atDebug()
  .log("Temperature set to {}. Old value was {}.", newT, oldT);
   
// 3. using fluent API, add arguments one by one and then log message
logger
  .atDebug()
  .setMessage("Temperature set to {}. Old value was {}.")
  .addArgument(newT)
  .addArgument(oldT)
  .log();
```

例を1.から3.まで挙げましたが、この出力結果はすべて同じになります。これを前提にそれぞれをみていきましょう。

1.の例が2.0より以前の旧来の呼び出し方なのに対して、2.と3.の例が2.0からできるようになったfluent APIを使った呼び出しになります。

2.の例で分かるようにログレベルが`atDebug()`メソッドで決定できるようになりました。このメソッドは`atInfo()`, `atWarn()`のように各ログレベルごとに用意されています。

これが3.の例ではログレベルに加え、メッセージ文とその置換文字列をそれぞれ`setMessage()`と`addArgument()`のメソッドで設定できるようになっています。

ログ出力で典型的に必要となる要素としてログレベル、メッセージ文、置換文字列の3つがあります。旧来はこの3つの要素を引数で一度に指定するスタイルでしたが、2.0から導入されたfluent APIを使うことで引数を個々のメソッド呼び出しで指定していく、まさに流暢(fluent)な指定ができるようになった点が大きな違いとなります。

:::alert: 最後のlog()メソッドの呼び出しは忘れずに
fluent APIはメソッドの呼び出しチェーンを`log`メソッドで確定させます。このメソッド呼び出しを忘れるとログにはなにも出力されなくなるので注意が必要です。ちなみに公式マニュアルには「多くのIDEでは"戻り値がありません"というコンパイラ警告がでるので問題ないよね」的なことが記載されていますが、筆者はいつもこの警告をOFFにしているため`log`メソッドの呼び出し忘れに気がつくことができませんでした、、、
:::

# fluent APIで追加された機能
上で挙げた例は旧来のAPIでもできたことですが、次に挙げるものは旧来のAPIではできなかったものとなります。

```java
// 4.
// using fluent API, add one argument with a Supplier and then log message with one more argument.
// Assume the method t16() returns 16.
logger
  .atDebug()
  .setMessage("Temperature set to {}. Old value was {}.")
  .addArgument(() -> t16())
  .addArgument(oldT)
  .log();
----
int t16() {
    return 16;
}
```

4.の細かい説明をする前に例えば4.と出力結果が同じとなる次の呼び出しがあったとします。

```java
logger
  .atDebug()
  .setMessage("Temperature set to {}. Old value was {}.")
  .addArgument(t16())
  .addArgument(oldT)
  .log();
```

上記と4.の例のどちらも出力結果は同じですが、違いはどこに表れるのでしょうか？

答えは4.の方が条件によっては性能面で有利となります。そしてこの違いがでる条件とは出力が有効か否かとなります。

上記例のように`t16()`メソッドの呼び出し結果を`addArgument()`メソッドで渡すスタイルの場合、デバックレベルの出力が無効になっている場合でも常に`t16()`メソッドが実行されます。

これに対して4.のように呼び出し結果ではなく、その呼び出しをラムダで渡した場合、その評価(置換文字列の取得)は実際の出力時まで遅延されます。このため出力が無効になっている場合、`t16()`メソッドは実行されません。つまり無駄にメソッドが呼ばれることを防ぐことができます。

旧来のAPIではラムダを渡すことができないため、置換文字列の取得を遅延させることはできませんでしたが、2.0からはfluent APIを使うことででこれができるようになりました。(だたし、今回の例のように単に16を返すだけのメソッドでは効果が薄い代わりにラムダの冗長性が目立つだけなので、重い処理を行うメソッドの呼び出しなどココぞ！というケースに限って使った方がよいとは思います)

また、fluent APIになったからできるようになった他のケースとしては次のようなものもあります。

```java
// 正しい呼び出し
logger.warn("会社名は{}です", "mamezou", e);
// 誤った呼び出し
logger.warn("会社名は{}です", e, "mamezou");
// fluent APIを使った呼び出し
logger
  .atWarn()
  .setMessage("会社名は{}です")
  .setCause(e)
  .addArgument("mamezou")
  .log();
```

SLF4Jは最後の引数を置換文字列としてではなくスタックトレースを出力する例外として認識します[^1]が、旧来のAPIは置換文字列の引数を可変パラメータで受け取るため「誤った呼び出し」例のように引数で渡す位置の間違いをコンパイルエラーではじくことができませんでした。これに対してfluent APIは置換文字列と例外を指定するメソッドが別に用意されているため、このような誤りを排除することができるようになります。

[^1]: 可変引数の最後を例外として認識するようになったのは1.6.0以降からのため、それより以前のバージョンでは例外としては認識されません。

# 最後に
旧来のスタイルと2.0から使えるようになったfluentなスタイルの比較を説明してきましたが一部を除けばできることは同じです。これはどちらが良い悪いというものではなく、どちらが良いかは詰まるところ好みの問題だと筆者は考えています。という筆者なりの考えはありますが、一般的には次のような点でfluentなスタイルの方がbetterとされています。

- fluentなスタイルはコードが左から右へ流れるように読めるためコードが見やすくなる
- fluentなスタイルは実行に必要な引数をメソッド名で表明することになるためコードが読みやすくなる
- 旧来のスタイルは引数の位置により型の解釈が曖昧になり「誤った呼び出し」例のような誤りが起きるがfluentではそれがない

ただし、fluentなスタイルにもデバッグ時におけるステップ実行のしづらさやメソッドの折り返しでコードが縦に長くなりやすい面などもあるため、一概にfluentが良いとはいえません。とは思いつつ、長いモノには巻かれておいた方が無難なのでJavaでは最近定着しつつあるfluentなスタイルを筆者は好んで使っています。

:::column: String.formatもfluentに！
fluentが最近のスタイルといいましたが、最後にこんなメソッドもfluentになってますよの紹介となります。

StringクラスにはC言語でお馴染みのprintfスタイルの`String.format`メソッドがありますが、このメソッドがJava15から次のように書けるようになりました。

```java
// 旧来のスタイル
String oldStyle = String.format("会社名は%sです", "mamezou");
// Java15からのfluentなスタイル
String newStyle = "会社名は%sです".formatted("mamezou");
```
新旧を並べると下のfluentなスタイルの方が明らかに気持ちよく見えるのは筆者だけしょうか。
:::
