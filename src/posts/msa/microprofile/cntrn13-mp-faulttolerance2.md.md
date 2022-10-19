---
title: 第13回 MicroProfile Fault Tolerance(2) - 例で理解する非同期編
author: toshio-ogiwara
date: 2022-10-22
tags: ["逆張りのMicroProfile"]
prevPage: ./src/posts/msa/microprofile/cntrn12-mp-faulttolerance1.md
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

# 非同期編
ここまではすべて同期呼び出しに対する例でしたが、MP Fault Toleranceでは非同期呼び出しに対してもフォールトトレランス処理を追加することができます。

MP Fault Toleranceでは@Asynchronousを付けることでメソッドの実行を別スレッドで行うことができます。@Asynchronousは@Timeout、@Fallback、@Bulkhead、@CircuitBreaker、および@Retryと一緒に使用でき、@Asynchronousが付けられているメソッドの呼び出しとフォールトトレランス処理は別々のスレッドで行われます。

また、メソッドは非同期で実行されるため、呼び出し元には即時に結果が返りません。このため、@AsynchronousのメソッドはFutureもしくはCompletionStageインスタンスで結果を戻す必要があるとともに、呼び出し元はFutureもしくはCompletionStageから実行結果を受け取るようにする必要があります。

以上の理解をもとに同期で紹介した例を非同期にしたする例を２つ紹介します。

:::info:非同期は簡単に使えるが難易度が高い
JavaやJakartaEEは非同期処理をある程度簡易に行えるようにしていますが技術的難易度が高くハマりどころが多いのも事実です。実開発での利用にあたっては[公式マニュアルの内容](https://download.eclipse.org/microprofile/microprofile-fault-tolerance-4.0/microprofile-fault-tolerance-spec-4.0.html#asynchronous)をよく理解されることをお勧めします。これは非同期に限ったことではありませんが非同期については特にお勧めします。
:::

# 同時接続数を制限したい（スレッドプールスタイル）
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

# タイムアウト時間を指定したい（非同期実行）
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

# まとめ
T.B.D.
