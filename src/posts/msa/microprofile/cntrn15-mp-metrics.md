---
title: 第15回 MicroProfile Metricsの機能と利用
author: toshio-ogiwara
date: 2022-11-09
tags: ["逆張りのMicroProfile"]
prevPage: ./src/posts/msa/microprofile/cntrn14-mp-faulttolerance3.md
---

今回のテーマはマイクロサービスアーキテクチャの重要な非機能として挙げられるモニタリングに関するMicroProfile Metrics(MP Metrics)です。MicroProfile Metricsはサーバーのリソース状況や利用頻度といった数値情報(テレメトリーデータ)の測定とその提供（公開）を担う仕様になります。記事ではサンプルアプリを例にMP Metricsでどのようなメトリクス情報を収集することができるかを説明していきます。

なお、記事はコードの抜粋を記載しています。全体を見たい場合や動作を確認したい場合は以下のGitHubリポジトリを参照ください。
- <https://github.com/extact-io/contrarian-microprofile-sample/tree/main/09-metrics>

また、MicroProfileをテーマにブログを連載しています。他の記事もよければ以下のリンクからどうぞ！
- [逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)

[[TOC]]

:::info
この記事はJava17+Helidon 3.0.1 + MicroProfile Metrics 4.0をもとに作成しています。
MicroProfile Metricsの詳細は[公式マニュアル](https://download.eclipse.org/microprofile/microprofile-metrics-4.0/microprofile-metrics-spec-4.0.html)を参照くだい。
:::

# MicroProfile Metricsを使ってできること
MP Metricsは次の２つを目的に策定されています

- アプリケーションがテレメトリーデータを測定するために必要な統一されたJava APIの提供
- 測定されたテレメトリーデータの統一した公開方法の提供

端的にいうと前者はメトリクス情報の取り方で後者は取得したメトリクス情報の公開方法となります。PrometheusやGrafanaに代表されるようなメトリクス情報の収集や可視化に関することはMP Metricsには含まれておらず、収集や可視化は専用のツールにお任せのスタンスになっています。

:::check: PrometheusやGrafanaについて
PrometheusやGrafanaはモニタリングツールの世界ではド定番でネット上にも情報が沢山あるため、ここで説明はしませんが、この2つがどのようなモノかを知りたい場合は同じデベロッパーサイトの「[メトリクス収集・可視化 - Prometheus / Grafana](https://developer.mamezou-tech.com/containers/k8s/tutorial/ops/prometheus/)」の記事がお勧めです。
Kubernetesを使った内容のため、今回の記事とは環境や取得するメトリクスが異なりますが、画面キャプチャも豊富なため、それぞれがどのようなツールかを理解するにはとてもよいと思います。
:::

最初にテレメトリーデータやメトリクスといった堅苦しい用語を出したため、結局それってなに？と思われている方もいるかもしれないため、少し具体的な話をすると、例えばあるメソッドがどのくらいの回数呼ばれているか？の情報をアプリケーション稼働中に取得したくなったりしたことはないでしょうか？

このようなことをしたい場合、ログに出力することが浮かぶと思いますが、すこし場当たり的ですね。MP Metricsを使えばこのようなことを統一された標準的な方法で実現できるようになります。そこで細かい説明は後にしてまずはMP Metricsを使って雰囲気を掴んでもらいたいと思います。

最初に次のメソッドがあったとします。

```java
public String simpleHello() {
    return "Hello!";
}
```

このメソッドの呼び出し回数を測定したい場合、次のようにMP Metricsの`@Counter`をメソッドに付けます。このアノテーションを付けるだけで、このメソッドの呼び出し回数をMP Metricsがカウントしてくれるようになります。

```java
@Counted // ← 追加
public String simpleHello() {
    return "Hello!";
}
```

次のメトリクス情報の取得ですが、MP Metricsではメトリクス情報を公開するREST APIが規定されています。ですので、現在のカウント数を知りたい場合は、アプリケーションに対し`/metrics`のリクエストを投げると現在のメトリクス情報を返してくれます。

```shell
curl -H 'Accept:application/json' localhost:7001/metrics
{
  ...
  "io.extact.mp.sample.metrics.HelloRandomResource.simpleHello": 2,
  ...
}
```
(コード例に関係ない出力部分は省いて整形してます)

とても簡単ですね。このようにMP Metricsはアプリケーションのメトリクス情報の取得と公開を容易に行えるようにしてくれる機能となります。

MP Metricsのイメージを掴んでもらったところで、ここからはMP Metricsの各機能について説明していきます。

# 説明に使用するサンプル
記事では次の簡単なRESTアプリケーションに各種メトリクス情報の取得、公開を追加していきながらMP Metrisの機能を説明してきます。

```java
@ApplicationScoped
@Path("/hello")
public class HelloRandomResource {
    private static final Random RANDOM = new Random();
    private static final List<String> HELLO_LIST = 
        List.of("こんにちは", "Hello", "ニイハオ", "ボンジュール", "アンニョンハセヨ");
    private AtomicInteger wordCount = new AtomicInteger(0);
  	@GET
    @Produces(MediaType.TEXT_PLAIN)
    public String randomHello() {
        var rand = RANDOM.nextInt(5);
        var hitWord = HELLO_LIST.get(rand);
        wordCount.getAndAdd(hitWord.length());
        sleep(rand); // レスポンスタイムをバラつかせる
        return hitWord;
    }
    private void sleep(long t) {
        try {
            Thread.sleep(t * 100);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }
}
```

アプリの内容はコードから分かるとおり各言語の挨拶をランダムに応答し、応答した挨拶の通算文字数をアプリケーションの状態(`wordcount`)として保持しておく簡単なものとなります。

# メトリクスの種類
MP Metricsで定義されているメトリクスの種類は次の6つになります。

- Counter
  - メソッドの呼び出し回数など計測対象を単にカウントするメトリクス
- Gauge 
  - その時点のキューサイズなど計測対象のある瞬間的な値を測定するメトリクス
- Meter
  - 1秒あたりのリクエスト数など時間の経過に伴う計測対象のイベント割合を測定するメトリクス
- Histogram
  - 最大、最小、平均応答時間など測定データの統計的分布を測定するメトリクス。中央値や75、90、95、98、99、および 99.9 パーセンタイルも測定する
- Timer
  - メソッドの処理時間など計測対象の処理時間とその時間分布の両方を測定するメトリクス。なお一部にHistogramメトリクスが使われます
- SimpleTimer
  - 計測対象の通算呼び出し回数、通算処理時間、最大、最小処理時間を測定する簡素化されたTimerメトリクス
- ConcurrentGauge
  - 最大同時処理数など計測対象が並行で行われた数を測定するメトリクス

次からはメトリクスそれぞれの取得方法とその取得結果を見ていきます。

なお、詳しくは後述の[メトリクスの指定](#メトリクスの指定プログラミングモデル)で説明しますが取得するメトリクスを指定する方法は3つあります。ここでは一番簡単なメトリクスアノテーションを使った方法で説明していきます。

## @Counted
[MicroProfile Metricsを使ってできること](#microprofile-metricsを使ってできること)でも登場した`@Counted`です。Counterメトリクスを採りたいメソッドに`@Counted`を付けることで、そのメソッドの呼び出し回数が取得できるようになります。

```java
@GET
@Produces(MediaType.TEXT_PLAIN)
@Counted(name = "helloCallCounter", absolute = true)
public String randomHello() {
	...
}
```

上記で取得できるメトリクス情報は次のようになります。

```shell
curl localhost:7001/hello
アンニョンハセヨ
curl -H 'Accept:application/json' localhost:7001/metrics/application/helloCallCounter
{"helloCallCounter":1}

curl localhost:7001/hello
Hello
curl -H 'Accept:application/json' localhost:7001/metrics/application/helloCallCounter
{"helloCallCounter":2}

curl localhost:7001/hello
ニイハオ
curl -H 'Accept:application/json' localhost:7001/metrics/application/helloCallCounter
{"helloCallCounter":3}
```

`randomHello`メソッドが呼び出される都度、カウントアップされていくのが分かります。

:::info: JSONキー名とabsolute指定
JSONのキー名に利用されるメトリクス名はデフォルトではクラス名(FQCN)＋メソッド名となります。このメトリクス名は上述のコード例のように`absotute`属性にtrueを指定することでクラス名を省略することができます。また、メソッド名とは関係ない任意の値をメトリクス名にしたい場合は`name`属性を使うことで変えることができます。それぞれの例と適用されるメトリクス名を下記に示します。

- name属性とabsolute属性を組み合わせたコード例
```java
package io.extact.mp.sample.metrics;
...
public class HelloRandomResource {
    @Counted
    public void one() {
        ...
    }
    @Counted(name = "twoCounter")
    public void two() {
        ...
    }
    @Counted(name = "threeCounter", absolute = true)
    public void three() {
        ...
    }
    @Counted(absolute = true)
    public void four() {
        ...
    }
}
```
- 適用されるメトリクス名
```java
io.extact.mp.sample.metrics.HelloRandomResource.one
io.extact.mp.sample.metrics.HelloRandomResource.twoCounter
threeCounter
four
```
:::

:::check: メトリクスアノテーションが指定可能な要素
`@Counted`などのメトリクスアノテーションは`@InterceptorBinding`を内包していることから、メトリクスアノテーションによるメトリクス情報の取得にはCDIのインターセプターが使われます。このことから、メトリクスアノテーションが指定可能な要素はCDI Beanのコンストラクタとメソッドのみとなります。CDI Bean以外の要素を計測対象にしたい場合は[メトリクスの指定](#メトリクスの指定プログラミングモデル)で説明する`MetricRegistry`を使う方法があります。
:::


## @Gauge
空きキューサイズなどある瞬間のアプリケーションの状態（値）を知りたい場合はその状態を返すメソッドに`@Gauge`を付けることで、その瞬間のアプリケーションの状態を測定することができます。

例えば、今回のサンプルアプリの応答した挨拶の通算文字数 (`wordcount`)を測定したい場合は、次のように通算文字数を返すメソッドを用意し、そのメソッドに`@Gauge`を付けることで測定ができるようになります。なお、”Gauge”の意味(量や大きさを計測する)のとおり`@Gauge`で計測できるものは数値データのみです。よって、`@Gauge`を付けたメソッドが返せるものは数値データのみとなります。

```java
@GET
@Produces(MediaType.TEXT_PLAIN)
@Gauge(name = "wordCountGauge", absolute = true, unit = MetricUnits.NONE)
public int getWordCount() {
    return wordCount.get();
}
```

上記で取得できるメトリクス情報は次のようになります（`unit`属性の説明は後述）。

```shell
curl -H 'Accept:application/json' localhost:7001/metrics/application/wordCountGauge
{"wordCountGauge":10}

curl localhost:7001/hello
ニイハオ
curl -H 'Accept:application/json' localhost:7001/metrics/application/wordCountGauge
{"wordCountGauge":14}

curl localhost:7001/hello
アンニョンハセヨ
curl -H 'Accept:application/json' localhost:7001/metrics/application/wordCountGauge
{"wordCountGauge":22}
```

この実行結果から初回の測定時点までにアプリケーションが返した挨拶の通算文字数は10文字と分かります。また、挨拶を返すメソッドを呼び出す都度、応答した文字数分だけ通算文字数が増えていくのが分かります。

## @Metered
メソッドに`@Metered`を付けることで、そのメソッドの呼び出し頻度に関するMeterメトリクスを取得できるようになります。

```java
@GET
@Produces(MediaType.TEXT_PLAIN)
@Metered(name = "helloCallMeter", absolute = true)
public String randomHello() {
	...
}
```

上記で取得できるメトリクス情報は次のようになります。

```shell
curl -H 'Accept:application/json' localhost:7001/metrics/application/helloCallCounter
{
  "helloCallMeter": {
    "count": 28, # 呼び出し回数
    "meanRate": 0.025484137734903035, # 1秒間あたりの平均呼び出し回数
    "oneMinRate": 0.3052050559284745,      # 1分間の指数加重移動平均呼び出し回数
    "fiveMinRate": 0.0818330403081332,     # 5分間の指数加重移動平均呼び出し回数
    "fifteenMinRate": 0.029416806974250087 # 15分間の指数加重移動平均呼び出し回数
  }
}
```
（出力結果を見やすいように加工しコメントを追加しています）

この実行結果からその時点の`randomHello`メソッドの通算呼び出し回数は28回で、1秒間あたりの平均呼び出し回数(`meanRate`)[^1]は約0.025回と分かります。

[^1]: meanRateは”通算呼び出し回数 / 経過時間”ですが、経過時間の起点をいつにするかはMP Metricsで規定されていません。参考までにHelidonの実装ではアプリケーション起動時が起点となっています。

:::info: 指数加重移動平均について
`oneMinRate`や`fiveMinRate`、`fifteenMinRate`はそれぞれの期間内の指数加重移動平均(EWMA)を表しています。この数値の統計学的な詳細は割愛しますが、簡単にいうと回数に対して時間的な重みづけを行う評価指標となります。古くなるにつれ重みが低下していくため、同じ1回でも古ければ重みを低く(軽視)し、直近なものほど重みを高く(重視)する指標になります。よって`meanRate`による単なる平均レートよりもより実態に即した指標といえます。
:::

## @Timed
メソッドに`@Timed`を付けることで、そのメソッドの処理時間に関するTimerメトリクスを取得できるようになります。`@Metered`が単位時間あたりの処理件数を評価するスループット用途のメトリクスに対し、`@Timed`はレスポンスタイム用途のメトリクスとなります。

```java
@GET
@Produces(MediaType.TEXT_PLAIN)
@Timed(name = "helloCallTimer", 
        absolute = true, 
        unit = MetricUnits.MILLISECONDS)
public String randomHello() {
	...
}
```

上記で取得できるメトリクス情報は次のようになります。

```shell
curl -H 'Accept:application/json' localhost:7001/metrics/application/helloCallTimer
{
  "helloCallTimer": {
    "count": 41, # 呼び出し回数
    "elapsedTime": 3046.8758, # 通算処理時間(ミリ秒)
    "meanRate": 2.4748045431061425,        # 1秒間あたりの平均呼び出し
    "oneMinRate": 0.9290031985612927,      # 1分間の指数加重移動平均呼び出し
    "fiveMinRate": 0.5143884976225771,     # 5分間の指数加重移動平均呼び出し
    "fifteenMinRate": 0.43863373620190443, # 15分間の指数加重移動平均呼び出し
    "min": 0,   # 最小処理時間(ミリ秒)
    "max": 406, # 最大処理時間(ミリ秒)
    "mean": 75.04309741315609,   # 平均処理時間(ミリ秒)
    "stddev": 85.41192334664485, # 標準偏差
    "p50": 76.027,    # 50パーセンタイル
    "p75": 110.7091,  # 75パーセンタイル
    "p95": 215.5179,  # 95パーセンタイル
    "p98": 406.0691,  # 98パーセンタイル
    "p99": 406.0691,  # 99パーセンタイル
    "p999": 406.0691  # 99.9パーセンタイル
  }
}
```
（取得内容を理解しやすいように出力結果を加工してコメントを追加しています）

実行結果にあるとおりTimerメトリクスは頻度に関するMeterメトリクスと処理時間の平均や分布に関するHistogramメトリクスから構成されています。また、この実行結果からその時点までの`randomHello`メソッドに対する以下のことが分かります。
- 通算呼び出し回数(`count`)は41回
- 41回の通算処理時間(`elapsedTime`)は約3047ミリ秒
- 最速 (`min`)、平均(`mean`)、最遅 (`min`)の処理時間はそれぞれ、0ミリ秒 / 約75ミリ秒 / 406ミリ秒
- 41回の半分は約76ミリ秒以内に処理を完了し、99%は約406ミリ秒以内で処理を完了している

:::info: 計測単位(unit属性)について
`@Timered`のデフォルトの測定単位がナノ秒と細かすぎるため、例ではメトリクスアノテーションの`unit`属性に`MetricUnits.MILLISECONDS`を指定し単位をミリ秒にしています。これまでに紹介した他のメトリクスアノテーションにも`unit`属性はあり、例えば`@Metered`であれば`MetricUnits.PER_SECOND`(1秒ごと)といったようにデフォルト値が設定されています。デフォルト値はいずれも妥当な値が設定されていますが、今回の例のように利用者で変更することもできます。
:::

## @SimplyTimed
TimerメトリクスよりシンプルなSimpleTimerメトリクスを取得する場合は`@SimplyTimed`を使います。

```java
@GET
@Produces(MediaType.TEXT_PLAIN)
@SimplyTimed(name = "helloCallSimpleTimer", 
              absolute = true, 
              unit = MetricUnits.MILLISECONDS)
public String randomHello() {
	...
}
```

上記で取得できるメトリクス情報は次のようになります。

```shell
curl -H 'Accept:application/json' localhost:7001/metrics/application/helloCallSimpleTimer
{
  "helloCallSimpleTimer": {
    "count": 56, # 呼び出し回数
    "elapsedTime": 6610.1478, # 通算処理時間(ミリ秒)
    "maxTimeDuration": 313.3178, # 直前1分間の最大処理時間(ミリ秒)
    "minTimeDuration": 0.0666    # 直前1分間の最小処理時間(ミリ秒)
  }
}
```

（取得内容を理解しやすいように出力結果を加工してコメントを追加しています）

実行例にあるとおり`@SimplyTimed`で取得される情報は`@Timed`に比べ少なくなっています。また、最大(`maxTimeDuration`)、最小処理時間(`mixTimeDuration`)の情報は1分サイクルでMP Metrcis内部で更新され、メトリクス取得要求があった１つ前のサイクルの情報が返されます。初回のメトリクス取得要求など1つ前の情報がない場合はnullが返されます。

:::column:SimpleTimerメトリクスってなぜあるの？
十分な程に処理時間に関するメトリクスが取得できるTimerメトリクスがあるのにSimpleTimerメトリクスが用意されているのはなぜだろう？と思われた方もいるかと思います。私もその一人です。そこで調べてみたところ、そのものズバリなissueがMP Metrics公式のGitHubリポジトリに挙がっていました。

[eclipse/microprofile-metrics - Need a @SimpleTimer? #496]( https://github.com/eclipse/microprofile-metrics/issues/496)
> The current Timer includes a lot of calculated metrics which, while useful for simple consumers that can't calculate things like means and distributions, is not necessary nor recommended for metrics intended to be consumed by Prometheus.

詳細はissueを追ってもらえば分かりますが、要はPrometheusを前提とした場合、Timerメトリクスは余計なモノが付きすぎているので、必要最低限な情報だけを返すプリセットが欲しかったためとなります。ですので、上記issueコメントにあるように、Timerメトリクスは取得側で平均や分布を計算できない単純なクライアント向けに対し、SimpleTimerメトリクスはPrometheusなどのように取得側である程度の計算や加工が行えるクライアント向けといった使い分けになります。
:::

## @ConcurrentGauge
メソッドに`@ConcurrentGauge`を付けることで、そのメソッドの同時実行数に関するメトリクスを取得できるようになります。同時実行数はメソッドの呼び出し時に1を加算し終了時に1減算するカウンタで測定されます。

```java
@GET
@Produces(MediaType.TEXT_PLAIN)
@ConcurrentGauge(name = "helloCallConcurrentGauge", absolute = true)
public String randomHello() {
	...
}
```

上記で取得できるメトリクス情報は次のようになります。

```shell
curl -H 'Accept:application/json' localhost:7001/metrics/application/helloCallConcurrentGauge
{
  "helloCallConcurrentGauge": {
    "current": 2, # 現時点のメソッド実行数
    "max": 3, # 直前1分間の最大同時メソッド実行数
    "min": 0  # 直前1分間の最小同時メソッド実行数
  }
}
```
（出力結果を見やすいように加工しています）

`current`はメトリクス要求時に該当メソッドを実行している処理数、つまり、その時点で該当メソッドを実行しているスレッド数になります。`max`と`min`は同時実行された最大と最小の数になりますが、この数値は[@SimplyTimed](#simplytimed)の最大(`maxTimeDuration`)、最小(`mixTimeDuration`)と同じように1分間サイクルで更新される情報となります。

## クラスに対するアノテーション指定
メトリクスアノテーションをメソッドに付けた例を説明してきましたが、メトリクスアノテーションはクラスに指定することもできます。クラスに指定した場合はコンストラクタと非privateメソッドに対してアノテーションが有効になります。
該当クラスのトータルカウントなどクラスに対するサマリーのメトリクス情報が取得できるようになる訳ではありませんので注意しましょう（私はそう思っていました。。）


# メトリクスの指定(プログラミングモデル)
どのメトリクスを取得するかの指定方法はこれまで説明してきたメトリクスアノテーションによる方法以外にも2つ用意されています。

これまでは一番簡単なメトリクスアノテーションによる方法を説明してきましたが、この方法は便利な反面、取得タイミングや取得範囲が静的に決まってしまうため、融通が利かない面があります。例えば日本語を返した場合のみカウンタを取得したいといったことはできません。

これに対しこれから紹介する2つの方法は動的な要素を取り入れることができます。

## @Metricを使ったメトリクス操作
`@Counter`などのメトリクスアノテーションは対象メソッドに対する測定を全自動で行ってくれるものでした。これに対して`@Metric`を使う場合は次のようにメトリクスインスタンスの取得と操作が必要となりますが、その代わりとしてアプリケーション側でメトリクスの取得タイミングや範囲を制御することができるようになります。

```java
@ApplicationScoped
@Path("/hello/antn")
public class HelloRandomResourceByAnnotation {
    @Inject
    @Metric(name = "helloCallCounter-antn", absolute = true)
    private Counter jaCounter;
    ...
    @GET
    @Path("/counter")
    @Produces(MediaType.TEXT_PLAIN)
    public String randomHelloWithCounter() {
        var hitWord = internalRandomHello();
        if (hitWord.equals("こんにちは")) {
            jaCounter.inc();
        }
        return hitWord;
    }
    ...
}
```

`Counter`インスタンスはCounterメトリクスそのものを司るオブジェクトとなります。このインスタンスを操作することで任意の条件でメトリクスを取得することができます。また、このメトリクスインスタンスは[メトリクスの種類](#メトリクスの種類)で挙げたすべてに対して用意されています。

それぞれの使い方はここでは説明しませんが、GitHubにすべてのメトリクスに対する例を[サンプルコード](https://github.com/extact-io/contrarian-microprofile-sample/blob/main/09-metrics/src/main/java/io/extact/mp/sample/metrics/HelloRandomResourceByAnnotation.java)として用意しています。他のメトリクスの使い方についてはそちらを確認ください。

## MetricRegistryによる動的登録
どの種類のメトリクスを取得する必要があるかが予め決まっている場合は`@Counter`や`@Metrics`などのアノテーションを使った方法で問題はないですが、例えばCounterメトリクスの取得が必要かどうかやそのメトリクス名が実行時にしか決めることができない場合、アノテーションを使った方法では対応できません。このような場合は`MetricRegistry`を使ってメトリクスインスタンスそのものを動的取得することができます。

```java
@ApplicationScoped
@Path("/hello/reg")
public class HelloRandomResourceByResistry {
    private MetricRegistry registry;
    ...
    @Inject
    public HelloRandomResourceByResistry(MetricRegistry registry) {
        this.registry = registry;
    }
    @GET
    @Path("/counter/ja")
    @Produces(MediaType.TEXT_PLAIN)
    public String randomHelloCounterWithJa() {
        var hitWord = internalRandomHello();
        if (hitWord.equals("こんにちは")) {
            Counter jaCounter = getOrCreateJaCounter();
            jaCounter.inc();
        }
        return hitWord;
    }
    ...
    private Counter getOrCreateJaCounter() {
        Metadata conterMetadata = new MetadataBuilder()
                .withName("helloCallCounter-reg")
                .withDisplayName("Counter Metrics By MetricRegistry")
                .withDescription("Number of hits on randomHello method")
                .withType(MetricType.COUNTER)
                .withUnit(MetricUnits.NONE)
                .build();
        return registry.counter(conterMetadata);
    }
    ...
}
```

インジェクションにより取得した`MetricRegistry`インスタンスに対し、メトリクス名やメトリクスタイプなど、取得したいメトリクスのメタ情報を指定して必要なインスタンスを取得することができます。

既に登録されているメトリクス名を指定した場合は新しいインスタンスが生成されるのではなく既に登録されているインスタンスが返されますが、他のメタ情報に登録時と異なる内容が指定された場合、例外がスローされます。

Timerなど他のメトリクスの例は`@Metrics`同様にサンプルコードに含んでいますので[こちら](https://github.com/extact-io/contrarian-microprofile-sample/blob/main/09-metrics/src/main/java/io/extact/mp/sample/metrics/HelloRandomResourceByResistry.java)を確認くだい。

:::info:アノテーション利用時のメタ情報の指定
`MetricRegistry`で登場した`withName`メソッドと`withUnit`メソッドは[メトリクスの種類](#メトリクスの種類)で紹介したアノテーションの`name`属性と`unit`属性と同じ指定になります。また、`withDisplayName`と`withDescription`メソッドの内容はアノテーションの`displayName`属性と`description`属性で指定することができます。よって、次のコードから生成されるCounterインスタンスはそれぞれインスタンス的に同値となります。

- メトリクスアノテーション(@Counter)による指定例
```java
@Counted(name = "helloCallCounter", 
      absolute = true,
      displayName = "Counter Metrics By MetricRegistry", 
      description = "Number of hits on randomHello method",
      unit = MetricUnits.NONE)
public String randomHello() { ...
```
- @Metricによる指定例
```java
@Inject
@Metric(name = "helloCallCounter",
      absolute = true,
      displayName = "Counter Metrics By MetricRegistry", 
      description = "Number of hits on randomHello method",
      unit = MetricUnits.NONE)
private Counter counter;
```
- MetricRegistryによる指定例
```java
Metadata conterMetadata = new MetadataBuilder()
        .withName("helloCallCounter")
        .withDisplayName("Counter Metrics By MetricRegistry")
        .withDescription("Number of hits on randomHello method")
        .withType(MetricType.COUNTER)
        .withUnit(MetricUnits.NONE)
        .build();
Counter counter = registry.counter(conterMetadata);
```
:::

## tagの利用
日本語だけを測定するケースであれば上述の`@Metric`や`MetricRegistry`で問題ないですが、これが日本語とそれ以外を測定する必要があると言われた場合、どのようにすればよいでしょうか？

メトリクス名を変えたCounterメトリクスを日本語とそれ以外で2つ用意する手もありますが、あまりスマートとは言えませんよね。このような場合はtagが使えます。

tagは`@Counter`などのメトリクスアノテーションの`tag`属性で指定することもできますが、今回のような条件による分岐があるケースはメトリクスアノテーションで対応できません。したがって、今回のお題を解決するには`@Metric`か`MetricRegistry`のどちらかを使う必要がありますが、ここではMetricRegistryによる方法を取り上げてみます。

```java
@ApplicationScoped
@Path("/hello/reg")
public class HelloRandomResourceByResistry {
    private static final Tag JA_TAG = new Tag("lang", "ja");
    private static final Tag OTHER_TAG = new Tag("lang", "other");
    private MetricRegistry registry;
    ...
    @GET
    @Path("/counter/ja-and-other")
    @Produces(MediaType.TEXT_PLAIN)
    public String randomHelloCounterWithJaAndOthers() {
        var hitWord = internalRandomHello();
        if (hitWord.equals("こんにちは")) {
            Counter jaCounter = getOrCreateWithTagCounter(JA_TAG);
            jaCounter.inc();
        } else {
            Counter otherCounter = getOrCreateWithTagCounter(OTHER_TAG);
            otherCounter.inc();
        }
        return hitWord;
    }
    ...
    private Counter getOrCreateWithTagCounter(Tag tag) {
        Metadata withTagConterMetadata = new MetadataBuilder()
                .withName("withTagCounter-reg")
                .withType(MetricType.COUNTER)
                .withUnit(MetricUnits.NONE)
                .build();
        // tagを指定してメトリクスインスタンスを取得
        return registry.counter(withTagConterMetadata, tag);
    }
    ...
}
```

tagを付ける場合はkeyとvalueを持った`Tag`インスタンスを指定してメトリクスインスタンスを取得します。また、tagを使うことで次の実行結果のように同じメトリクス名でその細分としてtagごとのメトリクス情報が取れるようになります。

```shell
curl -H 'Accept:application/json' localhost:7001/metrics/application/withTagCounter-reg
{
  "withTagCounter-reg;lang=other": 21,
  "withTagCounter-reg;lang=ja": 1
}
```

人がこの結果を見てもtagごとに分けるメリットを感じることはありませんが、メトリクス情報をプログラムで処理する場合はtagを使うことでメトリクスをグルーピングすることができるようになるため、そのメリットが発揮されます。


# メトリクスのスコープ
ここまででアプリケーション独自のメトリクスの取得方法を説明してきましたが、MP Metricsが定義しているメトリクスはこれだけではありません。アプリケーション独自のメトリクスを含め、MP Metricsでは次の3つのスコープ[^2]が定義されています。

[^2]: MP Metricsの仕様では”Scope”として記されているため、スコープという名称を使っていますが、意味的には”範囲(Scope)”というよりもメトリクスの”種類”や”レベル”といったものの方が近いです。

- base
  - MP Metricsランタイムが必ず実装するメトリクス。主にJVMの稼働状況に関するメトリクスが定義されている。詳細は[公式のMP Metricsのbaseスコープ仕様](https://download.eclipse.org/microprofile/microprofile-metrics-4.0/microprofile-metrics-spec-4.0.html#required-metrics)を参照
- vendor
  - MP Metricsランタイムを提供するベンダー独自のメトリクス。実装要否やその内容も含め扱いはすべてベンダーの任意
- application
  - 今まで説明してきたアプリケーションが独自に取得するメトリクス

applicationスコープは利用者側でなんらかの実装をする必要がありますが、baseスコープとvendorスコープはMicroProfileランタイムから提供されるメトリクスのため、利用者側はなにも実装することなくJVMやベンダー独自のメトリクスを取得することができます[^3]。

[^3]: vendorスコープのメトリクスを有効にする方法は利用するランタイムにより異なります。詳しくは利用ランタイムのマニュアルを確認してください。

::: column: vendorスコープで取得できるメトリクスの例
記事で利用しているHelidonではvendorスコープとして次のメトリクスを取得することができます。

```shell
 curl -H 'Accept:application/json' localhost:7001/metrics/vendor
 {
  "executor-service.active-count;poolIndex=0;supplierCategory=server;supplierIndex=0": 0,
  "executor-service.completed-task-count;poolIndex=0;supplierCategory=server;supplierIndex=0": 22,
  "executor-service.largest-pool-size;poolIndex=0;supplierCategory=server;supplierIndex=0": 16,
  "executor-service.pool-size;poolIndex=0;supplierCategory=server;supplierIndex=0": 16,
  "executor-service.queue.remaining-capacity;poolIndex=0;supplierCategory=server;supplierIndex=0": 8192,
  "executor-service.queue.size;poolIndex=0;supplierCategory=server;supplierIndex=0": 0,
  "executor-service.task-count;poolIndex=0;supplierCategory=server;supplierIndex=0": 22,
  "requests.count": 25,
  "requests.meter": {
    "count": 25,
    "meanRate": 0.07067108463955837,
    "oneMinRate": 0.006398401224348047,
    "fiveMinRate": 0.03400771021265771,
    "fifteenMinRate": 0.020013491579831864
  }
}
```

筆者が探した範囲ではvendorスコープに関するHelidonのドキュメントを見つけることができませんでした。なので、残念ながらそれぞれの値が厳密になにを意味するのかは分かりませんが、メトリクス名からどのような値かはなんとなく想像がつくかと思います。

と、これだけで終わるのは寂しいため別のMicroProfileランタイムとしてOpenLibertyの内容を紹介すると[公式マニュアル](https://openliberty.io/docs/latest/metrics-list.html)に記載のとおり、OpenLibertyではかなり色々なメトリクスが取得できるようになっています。

少し話しは脱線しますがMicroProfileには他にもいくつかのランタイムがありますが、その中でもOpenLibertyはマニュアルが一番よく整備されています。筆者が日ごろ使っているHelidonは以前に比べればかなりドキュメントが整備されてきましたが、それでもドキュメントに記載がないため実装から仕様を確認することはしばしばあります。筆者個人の主観になりますが、これはHelidonに限らず、どのMicroProfileランタイムも同じような感じに見受けられます。MicroProfileの普及に向け各ランタイムともOpenLiberty並みにドキュメントが整備されることを期待したいです。
:::

# メトリクスの取得(endpoint)
ここまで細かいことは説明せずに`/metrics`のエンドポイントを使ってメトリクスを取得していましたが、このエンドポイントもMP Metricsで次のように規定されています。

`GET /metrics/{scope}/{metrics-name}`

{scope}と{metrics-name}は省略することもできます。

{scope}には[メトリクスのスコープ](#メトリクスのスコープ)で説明したbase, vendor, applicationのいずれかを指定します。`/metrics/base`のように{metrics-name}を省略した場合は指定したスコープ配下のすべてのメトリクスを取得できます。

次に特定のメトリクスをピンポイントで取得する場合は、どのscopeのどのメトリクスかを`/metrics/{scope}/{metrics-name}`で指定します。実行結果の例で今までシレっと使っていた`/metrics/application/helloCallCounter`などはscopeとmetrics-nameをそれぞれ指定した例となります。

最後に{scope}と{metrics-name}の両方を省略した場合、つまり`/metrics`にリクエストした場合はMP Metricsランタイムのすべてのメトリクスを取得することができます。

:::info:メタ情報の照会
メトリクスを取得するエンドポイントのHTTPメソッドをOPTIONSにすることで、そのメトリクスのメタ情報を取得することができます。たとえば、先ほどのコラムで紹介したHelidonのvendorスコープの`executor-service.queue.remaining-capacity`の内容が知りたい場合は、次のようにリクエストすることでそのメタ情報を取得できます。

```shell
curl -X OPTIONS localhost:7001/metrics/vendor/executor-service.queue.remaining-capacity
{
  "executor-service.queue.remaining-capacity": {
    "unit": "none",
    "type": "gauge",
    "description": "Queue remaining capacity",
    "displayName": "executor-service.queue.remaining-capacity",
    "tags": [
      [
        "poolIndex=0",
        "supplierCategory=server",
        "supplierIndex=0"
      ]
    ]
  }
}
```

このようにMP Metricsには自己記述的な仕組みが備わっているため、ドキュメントがなくてもアプリケーション自身に「それはなに？」と問い合わせることである程度の情報を知ることができるようになっています。
:::

# 2つの公開フォーマット
記事では取得したメトリクスの見やすさを考え、MP Metricsからの応答をJSONフォーマットで取得していましたが、MP Metricsでは次の2つのフォーマットがサポートされています。

- MP Metrics独自のJSONフォーマット
  - MP Metrics独自に規定したJSONのフォーマット。独自フォーマットのためMicroProfile以外のアプリケーションとは互換性がない。
- OpenMetricsフォーマット
  - Cloud Native Computing Foundation(CNCF)配下の[OpenMetricsプロジェクト](https://openmetrics.io/)が進めているメトリクスフォーマットの標準仕様。
  - Prometheusのフォーマットがベースになっているため、Prometheusをはじめとしたアプリケーションとの互換性がある(そのまま取り込むことができる)

OpenMetricsフォーマットを使うことで、MicroProfileアプリケーションをPrometheusのexporter[^4]として機能させることができます。

また、MP Metricsランタイムがデフォルトで返す応答フォーマットは実はOpenMetricsフォーマットです。今までの実行結果で見てきたようにHTTPヘッダで`Accept: application/json`を指定した場合はJSONフォーマットで返ってきますが、次のようになにも指定しなければOpenMetricsフォーマットでメトリクス情報が返ってきます。

[^4]: Prometheusサーバからのリクエストに応じて、収集したメトリック情報を返すアプリケーションを指すPrometheusの用語


```shell
curl localhost:7001/metrics/application/helloCallMeter
# TYPE application_helloCallMeter_total counter
# HELP application_helloCallMeter_total
application_helloCallMeter_total 17
# TYPE application_helloCallMeter_rate_per_second gauge
application_helloCallMeter_rate_per_second 0.6624877407617819
# TYPE application_helloCallMeter_one_min_rate_per_second gauge
application_helloCallMeter_one_min_rate_per_second 0.49306718323907406
# TYPE application_helloCallMeter_five_min_rate_per_second gauge
application_helloCallMeter_five_min_rate_per_second 0.4222801075419199
# TYPE application_helloCallMeter_fifteen_min_rate_per_second gauge
application_helloCallMeter_fifteen_min_rate_per_second 0.40765853729890883
# EOF
```

OpenMetricsフォーマット仕様については [公式ページ](https://github.com/OpenObservability/OpenMetrics)を参照としてここでは細かい説明はしませんが、その実行結果から分かるとおり可読性が低い代わりに送信データ量が抑えられたフォーマットになっています。

# まとめ
MP Metricsは実行環境のメトリクス情報を提供するだけでなく、一歩含み込んでアプリケーション内部の状況も簡便にモニタリング可能にするのが特徴といえます。

そんな便利なMP Metricsですが、その今後には注意が必要です。

まず次バージョンのMP Metrics 5.0では今回説明したMeterメトリクス、SimpleTimerメトリクス、ConcurrentGaugeメトリクスの３つが削除されます[^5]。

そして可観測性に関する兄弟仕様といってもよいMicroProfile OpenTracingは次のMicroProfile 6.0で廃止され、OpenTelemetryに準拠した新たな MicroProfile Telemetry仕様に移行されます。OpenTelemetryのMetrics仕様はまだFixしていませんが、この動きを見る限りMicroProfile MetricsもOpenTelemetryに移行することが十分考えられます。

このようなことから、便利な機能ではありますが、現時点でその積極的な利用には注意が必要といえます。

[^5]: 公式の[こちらのissue](https://github.com/eclipse/microprofile-metrics/pull/664)より。masterブランチからも該当クラスとアノテーションが削除されています。正式リリース前のため変わる可能性はゼロではないですが、決定事項と見て間違いないと思われます。
