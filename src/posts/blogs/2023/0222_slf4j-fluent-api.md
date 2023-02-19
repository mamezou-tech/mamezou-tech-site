---
title: SLF4J 2.0のfluent logging APIでログ出力も流暢に
author: toshio-ogiwara
date: 2023-02-22
tags: [java]
---
昨年8月にリリースされたSLF4J 2.0の一番の目玉はJava9で導入されたモジュールシステム対応ですが、もう一つの目玉としてfluent logging API(fluent API)の追加があります。ログ自体が地味な機能のためあまり注目されることはないですが、少し使ってみたところイイ感じのAPIだったので今回はこのAPIを紹介します。

# 旧来のAPIとfluent APIの比較
難しいAPIでもないので実際の例を見てもらうのが一番早いですが、その例としては[公式マニュアルの例](https://www.slf4j.org/manual.html#fluent)が秀逸なので、この例をもとに追加されたfluent APIを紹介します。

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

例として1.から3.まで挙げられていますが、このすべての出力結果は同じになります。これはできることは同じだけど違う呼び出し方ができるようになったことを意図します。では、それぞれについてみていきます。

1.が2.0より以前の旧来の呼び出し方なのに対して、2.以降が2.0からできるようになった呼び出し方になります。

まず2.の例を見て分かるようにログレベルを`atDebug()`メソッドの呼び出しで決定できるようになりました。このメソッドは`atInfo()`, `atWarn()`のように各ログレベルごとにメソッドが用意されています。

これが3.の例ではログレベルに加え、メッセージ文とその置換文字をそれぞれ`setMessage()`と`addArgument()`のメソッドで個別に設定できるようになっています。

ログ出力で典型的に必要となる要素としてログレベル、メッセージ文、置換文字の3つがあります。旧来はこの3つの要素を1回のメソッド呼び出しで引数で一度に指定するスタイルでしたが、2.0から導入されたfluent APIを使うことで個々のメソッド呼び出しでまさに流暢(fluent)に指定することができるようになった点が一番大きな特徴となります。


# fluent APIで追加された機能
ここまでが既存のAPIでもできたことですが、次に挙げるものは今までは直接的にはできなかったものとなります。

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
  .addArgument(oldT).log();
```

上記と4.の例のどちらもも結果は同じですが、では違いはでないでしょうか？
答えは条件によっては4.のように`t16`メソッドの呼び出しをラムダで渡した方が性能面で有利となります。この違いがでる条件とはデバックレベルの出力が有効か否かとなります。

上記例のように`t16`メソッドを呼び出した結果を`addArgument`メソッドで渡すスタイルの場合、デバックレベルの出力が無効になっていた場合でも常に`t16`メソッドが実行されます。対して4.のようにラムダで渡した場合、その評価は実際の出力時まで遅延されるため出力が無効になっている場合は評価されません。つまり無駄にメソッドが呼ばれることを防ぐことができるようになります。

既存のAPIでは置換文字をラムダで渡すことができないため、置換文字を遅延させて評価させることはできませんでしたが、2.0からはfluent logging APIを使うことででこれができるようになりました。(だた今回の例のように単に16を返すだけのメソッドでは効果も薄い代わりにラムダの冗長性が目立つだけなので、重い処理を行うメソッドの呼び出しなどココぞ！というケースに限って使った方がよいとは思います)

また、fluent logging APIになったからできるようになったこととしては次のようなケースもあります。

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

SLF4Jは最後の引数を置換文字としてではなくスタックトレースを出力する例外として認識します[^1]が、旧来のAPIは置換文字列の引数を可変パラメータで受け取るため「誤った呼び出し」例のように引数で渡す位置の間違いをコンパイルエラーではじくことができませんでした。これに対してfluent APIは置換文字と例外としてメソッドが別に用意されているため、このような誤りを排除することができるようになっています。

[^1]: 可変引数の最後を例外として認識するようになったのは1.6.0以降からのため、それより以前のバージョンでは例外として認識されません。

# 最後に
旧来のスタイルと2.0から使えるようになったfluentなスタイルの比較を説明してきましたが一部を除けばできることは同じです。このためこれはどちらが良い悪いというものではなく、どちらが良いかは詰まるところ好みの問題だと筆者は考えていますが、次のような点などにより一般的にはfluentなスタイルの方がbetterといわれています。

- fluentなスタイルは実行に必要な引数を個別にメソッド名で表明することになるためコードが読みやすくなる
- 「誤った呼び出し」例のように旧来のスタイルは引数が多く並ぶと誤った呼び出し引数の位置によって型の解釈が曖昧になることがあるのがfluentではそれがない

ただ、fluentなスタイルはデバックする際にステップ実行がしずらくなるのとメソッド折り返しで縦に行が長くなりやすいという面もあるため一概にfluentが良いとはいえないのですが、Javaでは定着しつつあるスタイルなので長いモノにはまかれておいた方が無難だと思ってます、筆者としては。

:::column: String.formatもfluentに！
fluentが流行りといいましたが、最後にこんなメソッドもfluentになってますの紹介となります。
StringクラスにはC言語で同じみのprintfスタイルのフォーマットを行う`String.format`メソッドがありますが、このメソッドがJava15から次のように書けるようになりました。

```java
// 旧来のスタイル
String oldStyle = String.format("会社名は%sです", "mamezou");
// Java15からのfluentなスタイル
String newStyle = "会社名は%sです".formatted("mamezou");
```
新旧を並べて比べると下のfluentなスタイルの方が明らかに気持ちよく見えるのは筆者だけしょうか。
:::
