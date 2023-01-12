---
title: 第12回 MicroProfile Fault Tolerance(1) - 例で理解する基本機能編
author: toshio-ogiwara
date: 2022-10-20
tags: ["逆張りのMicroProfile"]
prevPage: ./src/posts/msa/microprofile/cntrn11-mp-restclient3.md
nextPage: ./src/posts/msa/microprofile/cntrn13-mp-faulttolerance2.md
---

今回のテーマはマイクロサービスでは定番のタイムアウトやリトライ、サーキットブレーカーなどの耐障害性に関する機能を提供するMicroProfile Fault Tolerance(MP Fault Tolerance)です。MP Fault ToleranceはMicroProfileランタイムから提供される機能をコンフィグレーションして利用する形態となるため基本的に作りものはありません。このため、今回は少しテイストを変えてMP Fault Toleranceから提供される機能とその設定を「こんなことをしたい」的な利用シーンごとに説明していきたいと思います。なお、MP Fault Toleranceの機能は豊富なため説明は今回の基本機能編、[非同期編](/msa/mp/cntrn13-mp-faulttolerance2/)、[設定編](/msa/mp/cntrn14-mp-faulttolerance3/)の3回に分けて行います。

記事はコードの抜粋を記載します。全体を見たい場合や動作を確認したい場合は以下のGitHubリポジトリを参照ください。
- <https://github.com/extact-io/contrarian-microprofile-sample/tree/main/08-fault_tolerance>

MicroProfileをテーマにブログを連載しています。他の記事もよければ以下のリンクからどうぞ！
- [逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)


:::info
この記事はJava17+Helidon 3.0.1 + MicroProfile Fault Tolerance 4.0をもとに作成しています。
MicroProfile Fault Toleranceの詳細は[公式マニュアル](https://download.eclipse.org/microprofile/microprofile-fault-tolerance-4.0/microprofile-fault-tolerance-spec-4.0.html)を参照ください。
:::

# 説明に利用するサンプル
今回は次の簡単なRESTアプリケーションを使って説明していきます。

![overview](../../../img/mp/12-1_faulttolerance.drawio.svg)

説明に利用するRESTアプリケーションはHelloクライアントアプリが受け取った挨拶依頼(/client)をMicroProfile RestClientのHelloRestClientインタフェース[^1]を使って後段のHelloサービスアプリに委譲するアプリケーションとなります。記事のなかではHelloクライアントアプリのHelloFautlToleranceServiceに色々な設定をしながら説明を行っていきます。

[^1]: MicroProfile RestClientは[第7回 らくらくMicroProfile RestClient](/msa/mp/cntrn07-mp-restclient/)で取り上げています

それではこのアプリを使ってMP Fault Toleranceの各機能を説明していきます。

# タイムアウト編
必要以上の待機が発生することを防ぐため、一定時間経っても終了しない処理を中断させるタイムアウト処理を行いたい場合があります。ここではMP Fault Toleranceのタイムアウト機能を説明していきます。

## タイムアウト時間を指定したい
MP Fault Toleranceでは`@Timeout`を使ってタイムアウトを指定することができます。

```java
@Timeout(500)
public String hello_timeout() {
    return helloClient.hello("sleep");
}
```

上記は`hello_timeout`メソッドが500ミリ秒経っても処理が完了しない場合に処理を中断させる例となります。MP Fault Toleranceランタイムは`@Timeout`の`value`属性で指定された時間を経過してもメソッドが終了しない場合、指定時間が経過した時点で呼び出し元にTimeoutExceptionをスローし処理を中断させます。

:::info: MP Fault Toleranceの機能を指定できる対象
MP Fault Toleranceの機能はCDIインターセプターで実装されています。したがって、@TimeoutなどのMP Fault Toleranceの機能を指定できる対象はCDI BeanクラスもしくCDI Beanのメソッドとなります。
また@TimeoutなどのMP Fault Toleranceアノテーションを付けることはクラスやメソッドにインターセプターバインディングを指定するのと等しくなります。このことからMP Fault Toleranceの機能を指定できる対象はインターセプターバインディングが可能なものとも言えます。
:::

`@Timeout`の説明は以上となります。`@Timeout`は他のMP Fault Toleranceの機能と合わせて使うことができます。次はリトライと組み合わせた使い方を紹介していきます。

# リトライ編
短いネットワーク障害から回復するために同じ操作を再度呼び出すリトライ処理を行いたい場合があります。ここではMP Fault Toleranceのリトライ機能を使った例を利用シーンごとに説明していきます。

## リトライ回数を指定したい
MP Fault Toleranceでは`@Retry`を使ってリトライを指定することができます。

```java
@Timeout(500)
@Retry(maxRetries = 3)
public String hello_retry_by_timeout() {
    return helloClient.hello("sleep");
}
```

上記は`hello_retry_by_timeout`メソッドの実行が500ミリ秒を経過した時点で処理を中断させるとともに`hello_retry_by_timeout`メソッドが成功するまで最大3回リトライする例となります。

MP Fault Toleranceランタイムは`@Retry`が付けられたメソッドから例外がスローされた場合、`@Retry`で指定された条件に従いメソッドの処理が成功するまでリトライ処理を行います。

`@Timeout`と`@Retry`の指定は独立しています。`@Retry`の対象はタイムアウトによるTimeoutExceptionに限定されず`hello_retry_by_timeout`メソッドからスローされるすべての例外が対象となります。`@Retry`は何もスローされず正常に呼び出し元に復帰した場合に成功、なんらかの例外がスローされた場合に失敗と判断します。

また、呼び出し元に最終的にスローされる例外は最後のリトライでスローされた例外となります。今回の例の場合、3回目のリトライがタイムアウトで失敗した場合に呼び出し元にスローされる例外はTimeoutExceptionになりますが、`helloClient.hello`メソッドからスローされた例外が原因の場合は、そのスローされた例外がそのまま再スローされます。

なお、`hello_retry_by_timeout`メソッドが実行される最大回数は`maxRetries`に指定された回数+1となります。初回のメソッド実行はリトライによる実行ではありません。よって、`maxRetries`に指定した回数に含まれないので注意しましょう。

:::info: アノテーションを指定できる要素
@Retryや@Timeoutに限らずこれから紹介する@Fallback、@Bulkhead、@CircuitBreakerはクラスに指定することもできます。クラスに指定した場合はそのクラス内のすべてのメソッドに対して該当アノテーションが有効になります。また、同一アノテーションがクラスとメソッドの双方に指定されている場合はメソッドの指定が優先されます。
:::

## 少し間隔を空けてリトライを実行したい
すぐリトライしても失敗するため少し時間を空けてから実行したい場合があります。そのような場合は`@Retry`の`delay`属性で間隔を空けてリトライを実行することができます。

```java
@Timeout(500)
@Retry(maxRetries = 3, delay = 1000)
public String hello_retry_with_delay() {
    return helloClient.hello("sleep");
}
```

上記は先ほどの例に`delay`を追加した例になります。`delay`が指定されている場合、MP Fault Toleranceはその指定された時間を空けてリトライを実行するようになります。`delay`の指定はデフォルトミリ秒ですが`delayUnit`属性を指定することで変更することもできます[^2]。

よって、このコード例は`hello_retry_with_delay`メソッドから例外がスローされた場合、1000ミリ秒(1秒)待ってからリトライを実行する指定となります。

また、`hello_retry_with_delay`メソッドがすべてタイムアウトで失敗した場合、タイムアウトの0.5秒とリトライ待ちの1秒がそれぞれ発生するため、呼び出し元には合計5秒(0.5秒+1秒＋0.5秒+1秒＋0.5秒+1秒＋0.5秒)の待ちが発生します。

[^2]: delayUnit属性にはSECONDSやMINUTESなどの時間単位が定義されているChronoUnitを指定します。

## リトライ間隔をばらつかせたい
リトライするタイミングをずらすことで処理の成功率を高めたい場合があります。そのような場合は`@Retry`の`jitter`属性でばらつきをもたせることができます。

```java
@Timeout(500)
@Retry(maxRetries = 3, delay = 1000, jitter = 2000)
public String hello_retry_with_jitterDelay() {
    return helloClient.hello("sleep");
}
```

上記は先ほどの例に`jitter`を追加したものになります。MP Fault Toleranceランタイムは`jitter`が指定されると指定された範囲内の乱数を発生させ、リトライの都度、その乱数を用いて遅延させる時間を`delay ± jitter`の評価式で決定します。評価結果がマイナスとなる場合は遅延時間は0となります。

よって、このコード例は0から3秒のランダムな間隔を空けてリトライを実行する指定となります。なお、時間単位は`delay`属性と同様に`jitterDelayUnit`属性で変更することができます。

## 一定時間でリトライを打ち切りたい
回数の他に期間を指定し、その期間を超えた場合、リトライは行わないようにしたい場合があります。このような場合は`@Retry`の`maxDuration`でリトライ可能な期間を指定することができます。

```java
@Timeout(500)
@Retry(maxRetries = 3, delay = 0, jitter = 1000, maxDuration = 4000)
public String hello_retry_with_maxDuration() {
    return helloClient.hello("sleep");
}
```

上記は0から1秒の間隔で最大3回リトライを行う条件に加え、`maxDuration`でリトライ可能期間は4秒以内と指定しています。なお、`maxDuration`で評価される期間の起点は初回リトライではなく初回のメソッド実行からとなります。

`hello_retry_with_maxDuration`メソッドの実行時間を0とした場合、`maxRetries`で指定した上限3回のリトライが行われる可能性がありますが、それより先に`maxDuration`で指定した期間が満了した場合は上限回数に達する前にリトライが打ち切られます。

よって、このコード例の指定を平易に説明すると
> リトライは0-1秒のランダムな間隔を空けて実行する。ただし、リトライを行うのはトータル4秒以内で初回の実行から4秒を経過した場合、リトライは行わない

となります。

## リトライするエラーを指定したい
リトライは特に指定がない場合、例外がスローされた場合に一律に行われますが、特定のエラー（例外）に対してのみリトライを行うようにしたい場合があります。このような場合は`retryOn`属性で対象を限定することができます。

```java
@Retry(maxRetries = 3, retryOn = {RetryableException.class})
public String hello_retryOn_retryable() {
    return helloClient.hello("throwRetryable");
}
```

上記は`retryOn`で指定したRetryableException(とそのサブクラス)が`hello_retryOn_retryable`メソッドからスローされた場合のみ、最大3回リトライを行う設定となります。`hello_retryOn_retryable`メソッドからRetryableException以外がスローされた場合、リトライは行われず、そのスローされた例外が呼び出し元に再スローされます。

## リトライしないエラーを指定したい
先ほどとは逆に特定のエラー(例外)をリトライ対象から除外する場合となります。このような場合は`abortOn`属性で除外する例外を指定できます。

```java
@Retry(maxRetries = 3, abortOn = {FatalException.class})
public String hello_abortOn() {
    return helloClient.hello("throwFatal");
}
```

サブクラスも含め`abortOn`に指定された例外がスローされた場合、リトライは行われず、その例外がそのまま呼び出し元に再スローされます。また、`abortOn`は先ほどの`retryOn`と一緒に使うこともできます。`retryOn`が一緒に指定された場合、リトライ対象の評価は`abortOn`属性が優先されます。

:::alert: retryOnとabortOnを一緒に指定する場合の注意
retryOn属性とabortOn属性が一緒に指定されている場合のリトライ判定は下記のとおりになります。

1. メソッドが正常に終了した場合は単にその結果をそのまま返す
2. サブクラスも含めabortOnに指定した例外がスローされた場合は、その例外を再スローする
3. サブクラスも含めretryOn属性に指定した例外がスローされた場合は、リトライを行う
4. 上記以外の場合はスローされた例外を再スローする

注意が必要なのは4.です。abortOnとretryOnのどちらにも該当しない例外がスローされた場合、リトライは行われず、その挙動はabortOnと同じとなります。abortOnにはリトライを行わないものを限定する意図があるハズですが、retryOnに指定するものによっては意図しない例外もリトライの対象外となります。

このことから、abortOnとretryOnを一緒に指定するケースは、retryOnに指定した例外のうち、特定のサブクラスだけをリトライ対象から除外する場合だけになると思われます。
:::

## スローする例外を変えたい(SocketExceptionなど)
リトライしたい例外が呼び出したメソッドから直接スローされない場合は自分で例外ハンドルの処理を行います。

```java
@Retry(maxRetries = 3, retryOn = {SocketException.class})
public String hello_socketException() throws SocketException {
    try {
        return helloClient.hello("throwFatal");
    } catch (Exception original) {
        Throwable test = original;
        while (!(test instanceof SocketException)) {
            test = test.getCause();
            if (test == null) {
                throw original;
            }
        }
        throw (SocketException) test;
    }
}
```

上記はSocketExceptionがスローされた場合にリトライを行う例になりますが、SocketExceptionはローレベルな呼び出しで発生する例外のため、途中様々な例外にラップされて伝播されてきます。このためアプリケーションコードでSocketExceptionを直接catchすることは余りありません。

このよう場合は例のようにキャッチした例外の例外チェーンにSocketExceptionが含まれているかを確認し、含まれている場合はその例外をスローすることでリトライが働くようにします。MP Fault Toleranceランタイムは対象としているメソッドの境界しか見ていないため、例のように必要なロジックを組み込むことでリトライ有無を制御することもできます。

# フォールバック編
処理が失敗した場合、エラーを返すのではなく代替処理(フォールバック)を行い限定的な結果を返したい場合があります。ここではMP Fault Toleranceのフォールバック機能を使った例を利用シーンごとに説明していきます。

## 処理が失敗した場合に限定的な結果を返したい(inlineメソッド)
MP Fault Toleranceでは`@Fallback`でフォールバック処理を指定することができます。

```java
@Timeout(500)
@Retry(maxRetries = 1)
@Fallback(fallbackMethod = "fallbackForHello")
public String hello_fallback_by_inline() {
    return helloClient.hello("throwRetryable");
}
...
private String fallbackForHello() {
    return "沈黙..";
}
```

上記は`hello_fallback_by_inline`メソッドがリトライを3回行っても成功しなかった場合、`@Fallback`で指定されているメソッドを呼び出し、呼び出し元には例外ではなくその結果を返す例となります。

`@Fallback`の`fallbackMethod`にはフォールバックを行うメソッド名[^3]を指定します。また、指定するメソッドの戻り値と引数は`@Fallback`を付けたメソッドと同じにします。異なっている場合は定義エラーとして実行時に例外がスローされます。

[^3]: MP Fault Tolerance仕様には指定可能なメソッドの詳細は明記されていません。したがって、スーパークラスのメソッドやstaticメソッドなどを指定することができるのかは厳密にはMP Fault Toleranceランタイムの実装依存になります。なお、Helidonの実装は自インスタンスから呼び出し可能なモノは指定することができるようになっています。

:::info:他の機能との併用とフォールバックの実行タイミング
@Fallbackは単独で使用することも例のように他のMP Fault Toleranceアノテーションと一緒に使用することもできます。この場合、フォールバック処理は他のすべてのMP Fault Toleranceの処理が行われた後に呼び出されます。
:::

## 処理が失敗した場合に限定的な結果を返したい(interface実装)
フォールバック処理は`FallbackHandler`インタフェースで独立したクラスとして実装することもできます。

- フォールバック対象メソッド
```java
@Timeout(500)
@Retry(maxRetries = 1)
@Fallback(HelloFallbackService.class)
public String hello_fallback_by_cdi() {
    return helloClient.hello("throwRetryable");
}
```
- フォールバック実装
```java
@ApplicationScoped
public class HelloFallbackService implements FallbackHandler<String> {
    public String handle(ExecutionContext context) {
        if (context.getFailure() instanceof RetryableException) {
            return "もう一回聞いて";
        }
        if (context.getFailure() instanceof TimeoutException) {
            return "チョッと待って";
        }
        return "沈黙..";
    }
}
```

上記は先ほどの例と行うことは同じですが`FallbackHandler`インタフェースでフォールバック処理を実装しています。

`FallbackHandler`インタフェースを実装する場合、その実装はCDI Beanとする必要があります。また、実装する`handle(ExecutionContext context)`メソッドの戻り値は[メソッドによる指定](#処理が失敗した場合に限定的な結果を返したいinlineメソッド)と同じように`@Fallback`を付けたメソッドと同じものにします。

`FallbackHandler`インタフェースでフォールバック処理を実装した場合はコード例にあるようにリトライ対象となっているメソッドのコンテキスト情報を引数(`context`)で受け取ることができます。

## フォールバックを行う例外と行わない例外を指定したい
フォールバック処理は`@Fallback`が付いているメソッドから例外がスローされた場合に行われますが、フォールバックの対象を`applyOn`属性と`skipOn`属性を使って個別に指定することもできます。

```java
@Retry(maxRetries = 1)
@Fallback(
    fallbackMethod = "fallbackForHello", 
    applyOn = { Exception.class }, 
    skipOn = { FatalException.class })
public String hello_fallback_with_criteria() {
    return helloClient.hello("throwFatal");
}
```
`applyOn`はサブクラスも含め指定した例外がスローされた場合にフォールバック処理を行います。これに対し`skipOn`はフォールバック処理は行わずスローされた例外をそのまま再スローする例外の指定になります。

どちらも単独で利用することができますが`applyOn`と`skipOn`を一緒に指定する場合は[@RetryのretryOnとabortOn](#リトライしないエラーを指定したい)と同様に注意が必要です。`@Fallback`の場合も`skipOn`属性が優先され`applyOn`と`skipOn`のどちらにも該当しない例外がスローされた場合は、フォールバック処理は行われず、スローされた例外がそのまま再スローされます。

# サーキットブレーカー編
特定の処理が頻繁に失敗することにより他のサービスに連鎖的に障害が波及することを防ぐ仕組みとして「処理がある頻度で失敗した場合、その処理の受け付けを一定時間遮断し、その後一定回数連続で処理がするまでは処理の遮断を繰り返し行う」サーキットブレーカーが知られています。ここではMP Fault Toleranceがもつサーキットブレーカーの機能をその利用シーンごとに説明していきます。

## 一定頻度で処理が失敗する場合、しばらく処理を行わないようにしたい
これを行うのがまさにサーキットブレーカーになります。MP Fault Toleranceでは`@CircuitBreaker`を使ってサーキットブレーカーの動作条件を細かく指定します。

```java
@CircuitBreaker(
    requestVolumeThreshold = 4, 
    failureRatio=0.5, 
    delay = 10000, 
    successThreshold = 3)
public String hello_circuitBreaker(String action) {
    return helloClient.hello(action);
}
```

この例を説明する前にサーキットブレーカーが持つ状態とその遷移条件を説明をします。

- Close
  - メソッドの呼び出しに対しMP Fault Toleranceはなにも介在しないノーマルな状態。メソッドの処理結果はそのまま呼び出し元に戻されます。
  - この状態時に`requestVolumeThreshold`で指定した直近の処理結果の失敗率が`failureRatio`を超えた時点でOpen状態へ遷移します。
- Open
  - メソッドの呼び出しが遮断されている状態。この状態におけるメソッド呼び出しはすべてCircuitBreakerOpenExceptionがスローされます。
  - Open状態は`delpay`で指定された期間継続され、期間が満了した時点でHalf-Open状態へ自動で遷移します。
- Half-Open
  - Close状態への復帰に向けたトライアル状態となります。メソッドに対する呼び出しはそのまま受け付けられ、`successThreshold`に指定した回数だけ連続して処理が成功した場合にClose状態に復帰します。
  - 反対にこの状態でメソッドの処理が失敗した場合、その時点でOpen状態に戻されます（振り出しに戻る）

この理解をもとにコード例の動作を説明すると以下のようになります。

1. `hello_circuitBreaker`メソッドの直近4回の失敗率が50%を超えた時点(つまり、直近4回のうち2回以上失敗した時点)で2.の状態に移る。
2. この状態に移行後、`hello_circuitBreaker`メソッドの呼び出しにはすべてCircuitBreakerOpenExceptionが返され、10秒経過後に3.の状態に移る。
3. `hello_circuitBreaker`メソッドの呼び出しは通常どおり行われ、連続して3回処理が成功した場合に1.の状態に復帰する。それとは反対に連続して3回成功する前に処理が1度でも失敗した場合は2.の状態に戻される。

Close状態からOpen状態への遷移が発生する具体的な例を次に示します。
- シナリオ1
  - 処理1 – 成功
  - 処理2 – 失敗
  - 処理3 – 成功
  - 処理4 – 成功
  - 処理5 – 失敗 ← 直近4回の処理(2,3,4,5)の失敗率が50%となりOpen状態へ
  - 処理6 – CircuitBreakerOpenExceptionがスローされる

- シナリオ2
  - 処理1 – 失敗
  - 処理2 – 失敗 ← 直近4回に達してないためこの時点では遷移しない
  - 処理3 – 成功 ← 同上
  - 処理4 – 成功 ← 成功しているがこの時点で失敗率が評価されOpen状態に遷移する

:::alert: MP Fault Toleranceが管理するサーキットブレーカーの単位
MP Fault Toleranceランタイムはサーキットブレーカーの仕組みを実現するため直近の成功した呼び出し回数やサーキットブレーカーがOpenしている時間などの状態を管理しています。このサーキットブレーカーの状態はCDI Beanのライフライクルに関係なく@CircuitBreakerが付けられているメソッドのシグニチャごとにシングルトンで管理されます。
したがって、@ApplicationScoped以外のCDI Beanは他のインスタンス間でサーキットブレーカーの状態が共有されます。これは別インスタンスの処理結果によりOpen状態への遷移が発生しCircuitBreakerOpenExceptionがスローされることがあることを意味します。
:::

## 失敗とみなす例外とみなさない例外を指定したい
`requestVolumeThreshold`属性と`successThreshold`属性で評価される成功や失敗の数は`@CircuitBreaker`のメソッドを超えていった例外の数をもとにカウントされますが、このカウント対象とする例外を`failOn`属性と`skipOn`属性で限定することができます。

```java
@CircuitBreaker(successThreshold = 3,
        requestVolumeThreshold = 4,
        failureRatio = 0.5,
        delay = 10000,
        failOn = Exception.class,
        skipOn = SkipException.class)
public String hello_circuitBreaker_with_skipOn(String action) {
    return helloClient.hello(action);
}
```

`skipOn`に指定した例外はサブクラスも含め成功とみなされ失敗にカウントされません。一方の`failOn`は失敗とみなす例外の指定となります。どちらも単独で利用することができますが`skipOn`と`failOn`を一緒に指定する場合は[@RetryのretryOnとabortOn](#リトライしないエラーを指定したい)と同様に注意が必要です。`@CircuitBreaker`の場合も`skipOn`が優先され、`skipOn`と`failOn`のどちらにも該当しない例外がスローされた場合は成功としてカウントされます。


# バルクヘッド編
マイクロサービスはネットワークによるサービス間連携が前提となるため、複数からアクセスされるサービスが負荷や障害により応答を返せなくなった場合、その影響が連鎖的にシステム全体に波及する場合があります。これに対する備えとしてネックとなる可能性のあるサービスへの接続数を制限し、他のサービスに影響が波及しないように隔壁(Bulkhead)を設ける場合があります。ここではMP Fault Toleranceのバルクヘッド機能を使った例を説明していきます。

## 同時接続数を制限したい（セマフォスタイル）
MP Fault Toleranceでは`@Bulkhead`を使って同時接続数を制限することができます。

```java
@Bulkhead(3)
public String hello_bulkhead() {
    return helloClient.hello("longSleep");
}
```

これはセマフォスタイルというシンプルな制限方式になります。MP Fault Toleranceランタイムはアクセスカウンタの状態を管理し、メソッドの実行、終了を契機にアクセスカウンタをカウントアップ、カウントダウンすることで同時接続数を管理します。そして指定された接続数を超えた場合はBulkheadExceptionをスローし、それ以上の呼び出しを受け付けないようにします。

また、このBulkheadの状態は[サーキットブレーカーの単位](#サーキットブレーカー編)と同様にシングルトンで管理されるため、ライフサイクルが異なるCDI Bean間でもBulkheadの状態が共有されます。

# まとめ
マイクロサービスアーキテクチャにフォールトトレランス機能を持たせる場合、今回紹介したようなアプリケーション側でその機能を持つ方式ではなく、Istioに代表されるようなサービスメッシュの仕組みを使いアプリケーション外側にアドオンさせる方式がより一般的です。

サービスメッシュによるアドオン方式はアプリケーションコードを修正せずに機能を脱着、交換できる大きなメリットが確かにありますが、その反面、メソッド単位でのリトライやタイムアウトなどアプリケーション内部の細かい要素に対する制御はできません。また、サービスメッシュはコンテナでの稼働が前提となるため、OS上に直接アプリケーションサーバを稼働させている場合、その方式を採ることはできません。

フォールトトレランス機能の実装方式としてサービスメッシュによるアドオン方式が第一選択肢にはなりますが、MicroProfile準拠のアプリケーションであれば、それに加えてMicroProfileにより標準化された他の選択肢が用意されることには大きな意味があると思います。
