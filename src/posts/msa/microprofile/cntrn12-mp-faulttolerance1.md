---
title: 第12回 MicroProfile Fault Tolerance(1) - 例で理解する基本機能編
author: toshio-ogiwara
date: 2022-10-20
tags: ["逆張りのMicroProfile"]
prevPage: ./src/posts/msa/mp/cntrn11-mp-restclient3.md
---
今回のテーマはマイクロサービスでは定番のタイムアウトやリトライ、サーキットブレーカーなどの耐障害性に関する機能を提供するMicroProfile Fault Tolerance(MP Fault Tolerance)です。MP Fault ToleranceはMicroProfileランタイムから提供される機能をコンフィグレーションして利用する形態となるため基本的に作りものはありません。このため、今回は少しテイストを変えてMP Fault Toleranceから提供される機能とその設定を「こんなことをしたい」的な利用シーンごとに説明していきたいと思います。なお、MP Fault Toleranceの機能は豊富なため説明は今回の基本機能編、非同期編(<span style="color:red">Coming Soon!</span>)、設定編(<span style="color:red">Coming Soon!</span>)の3回に分けて行います。

記事はコードの抜粋を記載します。全体を見たい場合や動作を確認したい場合は以下のGitHubリポジトリを参照ください。
- <https://github.com/extact-io/contrarian-microprofile-sample/tree/main/08-fault_tolerance>

MicroProfileをテーマにブログを連載しています。他の記事もよければ以下のリンクからどうぞ！
- [逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)

[[TOC]]

:::info
この記事はJava17+Helidon 3.0.1 + MicroProfile Fault Tolerance 4.0をもとに作成しています。
MicroProfile Fault Toleranceの詳細は[公式マニュアル](https://download.eclipse.org/microprofile/microprofile-fault-tolerance-4.0/microprofile-fault-tolerance-spec-4.0.html#circuitbreaker)を参照くだい。
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
@Retry(maxRetries = 3, delay = 1000, jitter = 1000)
public String hello_retry_with_jitterDelay() {
    return helloClient.hello("sleep");
}
```

上記は先ほどの例に`jitter`を追加したものになります。MP Fault Toleranceランタイムは`jitter`が指定されると指定された範囲内の乱数を発生させ、リトライの都度、その乱数を用いて遅延させる時間を`delay ± jitter`で決定します。遅延時間がマイナスとなる場合は遅延時間は0となります。また時間単位は`delay`属性と同様に`jitterDelayUnit`属性で変更することができます。

よって、このコード例は0から2秒のランダムな間隔を空けてリトライを実行する指定となります。

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
処理が失敗したた場合、エラーを返すのではなく代替処理(フォールバック)を行い限定的な結果を返したい場合があります。ここではMP Fault Toleranceのフォールバック機能を使った例を利用シーンごとに説明していきます。

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

# 非同期編
ここまではすべて同期呼び出しに対する例でしたが、MP Fault Toleranceでは非同期呼び出しに対してもフォールトトレランス処理を追加することができます。

MP Fault Toleranceでは@Asynchronousを付けることでメソッドの実行を別スレッドで行うことができます。@Asynchronousは@Timeout、@Fallback、@Bulkhead、@CircuitBreaker、および@Retryと一緒に使用でき、@Asynchronousが付けられているメソッドの呼び出しとフォールトトレランス処理は別々のスレッドで行われます。

また、メソッドは非同期で実行されるため、呼び出し元には即時に結果が返りません。このため、@AsynchronousのメソッドはFutureもしくはCompletionStageインスタンスで結果を戻す必要があるとともに、呼び出し元はFutureもしくはCompletionStageから実行結果を受け取るようにする必要があります。

以上の理解をもとに同期で紹介した例を非同期にしたする例を２つ紹介します。

:::info:非同期は簡単に使えるが難易度が高い
JavaやJakartaEEは非同期処理をある程度簡易に行えるようにしていますが技術的難易度が高くハマりどころが多いのも事実です。実開発での利用にあたっては[公式マニュアルの内容](https://download.eclipse.org/microprofile/microprofile-fault-tolerance-4.0/microprofile-fault-tolerance-spec-4.0.html#asynchronous)をよく理解されることをお勧めします。これは非同期に限ったことではありませんが非同期については特にお勧めします。
:::

## 同時接続数を制限したい（スレッドプールスタイル）
バルクヘッド編で説明した[メソッドの同時実行数を制限する例](#同時接続数を制限したいセマフォスタイル)を非同期で実行するようにし、同時実行数をスレッドプール数で制御するようにしてみます。

- 呼び出す側
```java
@GET
@Path("/16")
@Produces(MediaType.TEXT_PLAIN)
public String helloPattern16() throws Exception {
    return helloService.hello_async_with_bulkhead().get();
}
```
- 呼ばれる側
```java
@Asynchronous
@Bulkhead(value = 2, waitingTaskQueue = 1)
public Future<String> hello_async_with_bulkhead() throws Exception {
    var ret = helloClient.hello("longSleep");
    return CompletableFuture.completedFuture(ret);
}
```

`hello_async_with_bulkhead`メソッドは`@Asynchronous`により非同期で実行されますが`@Bulkhead`の`value`属性の指定により、このメソッドを同時に実行できるスレッド(Executorスレッド)は2つに制限されます。`hello_async_with_bulkhead`メソッドが呼び出された際に空いているExecutorスレッドがなければ、その時点でExecutionExceptionがスローされますが、`waitingTaskQueue`を指定するとその数だけメソッドの実行をキューイングすることができます。

キューイングやExecutionExceptionがスローされる具体的な例を示すと次のようになります。

|イベント|実行状態|空き(*1)|待ち(*2)|
|--------|-------|:-:|:-:|
|(初期状態)   | -       | 2 | 0 |
| → 呼び出し1 | 実行中   | 1 | 0 |
| → 呼び出し2 | 実行中   | 0 | 0 |
| → 呼び出し3 | 実行待ち | 0 | 1 |
| → 呼び出し4 | ExecutionException | 0 | 1 |
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;呼び出し1 ← | 実行完了 | 1 | 0 |
| → 呼び出し5 | 実行中   | 0 | 0 |
|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;呼び出し2 ← | 実行完了 | 1 | 0 |

*1:空きExecutorスレッドの数。上限は2  
*2:実行待ちタスク数。上限は1

## タイムアウト時間を指定したい（非同期実行）
タイムアウト編で説明した[メソッドにタイムアウト時間を指定する例](#タイムアウト時間を指定したい)と同じように今度は非同期実行するメソッドにタイムアウトを指定するようにしてみます。

- 呼び出す側
```java
@GET
@Path("/17")
@Produces(MediaType.TEXT_PLAIN)
public String helloPattern17() throws Exception {
    return helloService.hello_async_with_timeout() // 1.
            .toCompletableFuture()                 // 2.
            .get();                                // 3.
}
```
- 呼ばれる側
```java
@Asynchronous
@Timeout(500)
public CompletionStage<String> hello_async_with_timeout() throws Exception {
    var ret = helloClient.hello("sleep");
    return CompletableFuture.completedFuture(ret);
}
```

呼び出す側の`helloPattern17`メソッドの流れを見ていきます。

`helloPattern17`メソッドは1.でhelloServiceの`hello_async_with_timeout`メソッドを呼び出しますが、このメソッドは`@Asynchronous`により非同期で実行されるため、処理結果の代わりに`CompletionStage`を受け取ります。

続いて受け取った`CompletionStage`を2.で`CompletableFuture`に変換した後、`helloPattern17`メソッドを実行しているスレッドは3.の`get()`で`hello_async_with_timeout`から結果が返されるまで待ち続けます。

この際`hello_async_with_timeout`メソッドの実行時間が`@Timeout`で指定された500ミリ秒よりも掛かった場合は、500ミリ秒を経過した時点で3.の`get`メソッドからExecutionExceptionがスローされます。

ここで注目すべきは例外がスローされる場所です。
今まで見てきた同期メソッドでは必ず`@Timeout`や`@Bulkhead`などが付けられたメソッドの境界から例外はスローされていましたが、今回はメソッド境界の`hello_async_with_timeout`メソッドを超えた箇所で例外がスローされています。

`CompletionStage`や`Future`などの非同期結果は他のメソッドの戻り値とは別に扱われます。MP Fault Toleranceランタイムは通常はなんらかの結果がメソッド境界を越えた時点で完了としますが`CompletionStage`や`Future`に対してはメソッドから返された時点ではなく、その非同期処理の終了をもって完了とします。

しがたって、`@Asynchronous`で`CompletionStage`や`Future`が返されるメソッドでは、メソッド境界を越えたところでフォールトトレランス処理が動作する場合があります。

話を少し変えて、それではMP Fault Toleranceから見て`CompletionStage`と`Future`に違いはあるのでしょうか？

答えはあります。
どちらも完了とするタイミングは上述のとおり同じですが成功と失敗の見方が異なります。`CompletionStage`は正常に完了したか、それとも例外的に完了したかで成功と失敗を区別しますが、`Future`の場合は例外的に完了したがどうかは区別されません。よって、次のようなコードはMP Fault Toleranceランタイムには常に成功と判断されるため、意味を持ちません。

- 意味のない例
```java
@Asynchronous
@Retry
public Future<String> hello_async_with_retry() throws Exception {
    CompletableFuture<String> future = new CompletableFuture<>();
    try {
        future.complete(helloClient.hello("throwRetryable"));
    } catch (Exception e) {
        future.completeExceptionally(e);
    }
    return future;
}
```
:::info:MicroProfile RestClientの非同期実行との組み合わせ
上述の説明で使用したコード例は同期で実行する例と実質的に動作に違いはありません。このため、実用性の観点では意味を持ちません。`@Asynchronous`を使用する実際のケースは既に非同期でメソッドが実装され、それにフォールトトレランス処理を追加する場合となります。その典型的、かつ効果的な実装例として次に示すMicroProfile RestClientの非同期実行[^5]との組み合わせがあります。

[^5]: MicroProfile RestClientの非同期実行は[第11回 MicroProfile RestClient 3.0の確認と小技機能の紹介](/msa/mp/cntrn11-mp-restclient3/)で詳しく説明しています。

- RestClientインタフェース
```java
@RegisterRestClient(baseUri = "http://localhost:7002")
@Path("/hello")
public interface HelloRestClient{
    ...
    @GET
    @Produces(MediaType.TEXT_PLAIN)
    CompletionStage<String> asyncHello(@QueryParam("action") String action);
    ...
}
```
- RestClientインタフェースの利用側
```java
@ApplicationScoped
public class HelloFautlToleranceService {
    private HelloRestClient helloClient;
    @Inject
    public HelloFautlToleranceService(@RestClient HelloRestClient helloClient) {
        this.helloClient = helloClient;
    }
    ...
    @Asynchronous
    @Retry
    public CompletionStage<String> hello_restclinet_async(String action) throws Exception {
        return helloClient.asyncHello(action);
    }
}
```
:::

# 設定編
MP Fault Toleranceに対する指定はここまで見てきたとおり、すべてアノテーションで行うことができますが、全体に対する指定やアノテーションで指定した属性値のオーバーライドなどをMP Config[^6]の設定ファイルで行うこともできます。ここでは、MP Fault Toleranceの設定機能について見ていきます。

[^6]: MicroProfile Config(MP Config)は[第6回 お手軽便利MicroProfile Config](/msa/mp/cntrn06-mp-config/)で詳しく説明しています。

## アノテーションで指定した設定をオーバーライドしたい
次の3つのレベルでアノテーションで指定した値をオーバーライドできます。
- メソッドに指定されている個々のアノテーションの属性値をオーバーライドする
- クラスに指定されているアノテーションの属性値をオーバーライドする
- アプリケーション全体でアノテーションの属性値をオーバーライドする

オーバーライドする際の設定キーの書式は以下になります。
`<classname>/<methodname>/<annotation>/<parameter>`

上記は一番細かいレベルのメソッドに指定されているアノテーション設定をオーバーライドする際の書式となります。クラスに指定されているものをオーバーライドする場合は`<classname>`が、アプリケーション全体の場合は`<classname>`と`<methodname>`の指定が不要となります。

それでは、以下のコードに対する具体的な設定例をみていきましょう。

```java
package io.extact.sample;
...
@ApplicationScoped
@Timeout(500)
public class FtClient {
    @Retry(maxRetries = 3, delay = 1000)
    public void execA(String param) {
        workA(param);
    }
    @Retry(maxRetries = 2, maxDuration = 100)
    public String execB() {
        return workB();
    }
    @Retry(maxRetries = 5)
    @Fallback(fallbackMethod = "fallback")
    public int execC(int count) {
        return workC();
    }
    ...
}
```

このコードに対して、次の設定がされていた場合、実行時には`execB`の`maxDuration`の属性値が10000(msec)でオーバーライドされます。なお、ここでの設定はすべてMP Config標準の`microprofile-config.properties`に対する例となります。
```shell
io.extact.sample.FtClient/execB/Retry/maxDuration=10000
```

次の設定がされている場合はクラスに指定されている`@Timeout`の`value`属性値が10000(msec)でオーバーライドされ、結果、実行時には`execA`, `execB`, `execC`のタイムアウト値が10000(msec)になります。
```shell
io.extact.sample.FtClient/Timeout/value=10000
```

最後にアプリケーション全体に対する設定は次のとおりになります。この場合はすべての`@Retry`の`maxRetries`属性値が1でオーバーライドされ、結果、アプリケーション全体でリトライする場合の回数は1回に統一されます。
```shell
Retry/maxRetries=1
```

:::alert:オーバーライドできるものはアノテーションに指定がある要素のみ
設定でオーバーライドできるのはあくまでもアノテーションに指定があるもののみで、アノテーションで指定されていない属性を足したりすることはしません。例えば次のようなアノテーション指定と設定があった場合、実行時の内容は`@Retry(maxRetries = 3, delay = 1000)`のままで、`maxDuration=10000`が追加されることはありません。

```java
package io.extact.sample;
...
public class FtClient {
    @Retry(maxRetries = 3, delay = 1000)
    public void execA(String param) {
        workA(param);
    }
}
```
```shell
io.extact.sample.FtClient/execA/Retry/maxDuration=10000
```

また、これは同様にクラス指定にも言えることで、次のように設定しても、FtClientクラス全体に`@Bulkhead(3)`が追加されることはありません。

```shell
Bulkhead/value=3
```

設定は指定されたアノテーション要素に一致するものがあった場合にそれを単純にオーバーライドするのみで、ソースコードに存在しない要素を追加することはありません。また、該当がない要素に対する設定は無視されるだけで気がつきづらいため設定を行う際は注意が必要です。
:::

:::column:実行時に環境変数を使って動作の変更が可能
MP Configの設定（機能）を使っているため、リトライ回数やタイムアウト値などの条件を実行時に環境変数を使ってオーバーライドすることができます。この辺りの値は最初から一発で決まるものではなく、また環境によっても調整が必要になることから、リビルドせずに条件を変更できるのは大きな利点となります。
:::

## フォールトトレランス機能を個別に無効化したい
他の仕組みで代替する場合や障害調査などでタイムアウトやリトライなどのフォールトトレランス機能を無効化したい場合、設定で個別に機能を無効化することができます。

無効化する設定キーの書式は以下になります。
`<classname>/<methodname>/<annotation>/enabled=false`

設定方法は先ほどの[アノテーションをオーバーライドする場合](#アノテーションで指定した設定をオーバーライドしたい)と同じです。
```shell
# 1. メソッド単位で無効化
io.extact.sample.FtClient/execC/Retry/enabled=false
# 2. クラス単位で無効化
io.extact.sample.FtClient/Retry/enabled=false
# 3. アプリケーション単位で無効化
Retry/enabled=false
```

1.はメソッド個別に無効化する例で、2.はクラス、3.はアプリケーション全体でリトライ機能を無効化する例となります。

なお、設定ファイルで無効化されている機能を環境変数などで有効化する場合はtrueを指定します。

## フォールバック機能以外はすべて無効化したい
MP Fault Toleranceにはその機能をサービスメッシュなどのアプリケーション外部の仕組みで代替することを想定し、機能個別ではなくフォールバック以外の機能を一括して無効化する設定が用意されています。フォールバック機能が除かれるのはフォールバック処理はアプリケーションロジックであるため、アプリケーションの外部機能では代替できないためです。

この指定を行う場合は以下を設定します。
`MP_Fault_Tolerance_NonFallback_Enabled=false`

先ほどの個別機能の無効化機能を使い明示的に有効化されている機能がある場合は、そちらが優先されます。つまり、次のような設定がされていた場合、バルクヘッド機能とフォールバック機能が有効となります。

```shell
MP_Fault_Tolerance_NonFallback_Enabled=false
Bulkhead/enabled=true
```

# まとめ
マイクロサービスアーキテクチャにフォールトトレランス機能を持たせる場合、今回紹介したようなアプリケーション側でその機能を持つ方式ではなく、Istioに代表されるようなサービスメッシュの仕組みを使いアプリケーション外側にアドオンさせる方式がより一般的です。

サービスメッシュによるアドオン方式はアプリケーションコードを修正せずに機能を脱着、交換できる大きなメリットが確かにありますが、その反面、メソッド単位でのリトライやタイムアウトなどアプリケーション内部の細かい要素に対する制御はできません。また、サービスメッシュはコンテナでの稼働が前提となるため、OS上に直接アプリケーションサーバを稼働させている場合、その方式を採ることはできません。

フォールトトレランス機能の実装方式としてサービスメッシュによるアドオン方式が第一選択肢にはなりますが、MicroProfile準拠のアプリケーションであれば、それに加えてMicroProfileにより標準化された他の選択肢が用意されることには大きな意味があると思います。
