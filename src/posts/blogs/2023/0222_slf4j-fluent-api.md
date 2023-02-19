---
title: SLF4J 2.0のfluent logging APIでログ出力も流暢に
author: toshio-ogiwara
date: 2023-02-22
tags: [java]
---
昨年8月にリリースされたSLF4J 2.0の一番の目玉はJava9で導入されたモジュールシステム対応ですが、もう一つの目玉としてfluent logging API(fluent API)の追加があります。ログ自体が地味な機能のためあまり注目されることはないですが、少し使ってみたところイイ感じのAPIだったので今回はこのAPIを紹介したいと思います。

# 旧来のAPIとfluent APIの比較
難しいAPIでもないので実際の例を見てもらうのが一番早いです。例としては[公式マニュアルの例](https://www.slf4j.org/manual.html#fluent)が秀逸なので、この例をもとにfluent APIを紹介します。

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

例として1.から3.まで挙げられていますが、この出力結果はすべて同じになります。これはできることは同じで違う呼び出し方ができるようになったことを意味します。では、それぞれについてみていきます。

まずは1.の例が2.0より以前の旧来の呼び出し方なのに対して、2.以降の例が2.0からできるようになったfluent APIを使った呼び出しになります。

次に2.の例で分かるようにログレベルが`atDebug()`メソッドの呼び出しで決定できるようになりました。このメソッドは`atInfo()`, `atWarn()`のように各ログレベルごとにメソッドが用意されています。

3.の例ではログレベルに加え、メッセージ文とその置換文字をそれぞれ`setMessage()`と`addArgument()`のメソッドで設定できるようになっています。

ログ出力で典型的に必要となる要素としてログレベル、メッセージ文、置換文字の3つがあります。旧来はこの3つの要素を引数で一度に指定するスタイルでしたが、2.0から導入されたfluent APIを使うことで個々のメソッド呼び出しで指定してく、まさに流暢(fluent)な指定ができるようになった点が一番大きな特徴となります。


# fluent APIで追加された機能
上で挙げた例は旧来のAPIでもできたことですが、次に挙げるものは今までは直接的にはできなかったものとなります。

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

上記と4.の例のどちらも出力結果は同じですが、違いはどこに表れるでしょうか？
答えは4.のように置換文字を取得するメソッドの呼び出しをラムダで渡した方が条件によっては性能面で有利となります。そして、この違いがでる条件とは出力が有効か否かとなります。

上記例のように`t16()`メソッドを呼び出した結果を`addArgument()`メソッドで渡すスタイルの場合、デバックレベルの出力が無効になっていた場合でも常に`t16()`メソッドが実行されます。対して4.のようにラムダで渡した場合、その評価は実際の出力時まで遅延されるため出力が無効になっている場合は`t16()`メソッドは実行されません。つまり無駄にメソッドが呼ばれることを防ぐことができるようになります。

旧来のAPIでは置換文字をラムダで渡すことができないため、置換文字の評価を遅延させることはできませんでしたが、2.0からはfluent APIを使うことででこれができるようになりました。(だたし、今回の例のように単に16を返すだけのメソッドでは効果も薄い代わりにラムダの冗長性が目立つだけなので、重い処理を行うメソッドの呼び出しなどココぞ！というケースに限って使った方がよいとは思います)

また、fluent APIになったからできるようになったこととしては次のようなケースもあります。

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

SLF4Jは最後の引数を置換文字としてではなくスタックトレースを出力する例外として認識します[^1]が、旧来のAPIは置換文字列の引数を可変パラメータで受け取るため「誤った呼び出し」例のように引数で渡す位置の間違いをコンパイルエラーではじくことができませんでした。これに対してfluent APIは置換文字と例外を指定するメソッドが別に用意されているため、このような誤りを排除することができるようになります。

[^1]: 可変引数の最後を例外として認識するようになったのは1.6.0以降からのため、それより以前のバージョンでは例外として認識されません。

# 最後に
旧来のスタイルと2.0から使えるようになったfluentなスタイルの比較を説明してきましたが一部を除けばできることは同じです。このため、これはどちらが良い悪いというものではなく、どちらが良いかは詰まるところ好みの問題だと筆者は考えています。という筆者なりの考えはありますが、一般的には次のような点によりfluentなスタイルの方がbetterとされています。

- fluentなスタイルは実行に必要な引数を個別にメソッド名で表明することになるためコードが読みやすくなる
- 旧来のスタイルは引数の位置により型の解釈が曖昧になるとで「誤った呼び出し」例のような誤りが起きることがあるがfluentではそれがない

ただし、fluentなスタイルはデバックする際にステップ実行がしずらくなるのとメソッドの折り返しでコードが縦に長くなりやすいという面もあるため、一概にfluentが良いとはいえません。とは思いつつ、Javaでは最近定着しつつあるスタイルなので長いモノにはまかれておいた方が無難だと思い、筆者はfluentなスタイルを好んで使っています。

:::column: String.formatもfluentに！
fluentが最近のスタイルといいましたが、最後にこんなメソッドもfluentになってますヨの紹介となります。
StringクラスにはC言語でお馴染みのprintfスタイルの`String.format`メソッドがありますが、このメソッドがJava15から次のように書けるようになりました。

```java
// 旧来のスタイル
String oldStyle = String.format("会社名は%sです", "mamezou");
// Java15からのfluentなスタイル
String newStyle = "会社名は%sです".formatted("mamezou");
```
新旧を並べて比べると下のfluentなスタイルの方が明らかに気持ちよく見えるのは筆者だけしょうか。
:::
