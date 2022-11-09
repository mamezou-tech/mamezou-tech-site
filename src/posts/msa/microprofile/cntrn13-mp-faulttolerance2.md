---
title: 第13回 MicroProfile Fault Tolerance(2) - 例で理解する非同期編
author: toshio-ogiwara
date: 2022-10-21
tags: ["逆張りのMicroProfile"]
prevPage: ./src/posts/msa/microprofile/cntrn12-mp-faulttolerance1.md
nextPage: ./src/posts/msa/microprofile/cntrn14-mp-faulttolerance3.md
---

MicroProfile Fault Tolerance(MP Fault Tolerance)を紹介する2回目は非同期呼び出しに対するフォールトトレランス処理です。今回も前回同様、MP Fault Toleranceから提供される機能とその設定を「こんなことをしたい」的な利用シーンごとに説明していきます。なお、MP Fault Toleranceの機能は豊富なため説明は前回の[基本機能編](/msa/mp/cntrn12-mp-faulttolerance1/)、今回の非同期編、次回の[設定編](/msa/mp/cntrn14-mp-faulttolerance3/)の3回に分けて行います。

記事はコードの抜粋を記載します。全体を見たい場合や動作を確認したい場合は以下のGitHubリポジトリを参照ください。
- <https://github.com/extact-io/contrarian-microprofile-sample/tree/main/08-fault_tolerance>

MicroProfileをテーマにブログを連載しています。他の記事もよければ以下のリンクからどうぞ！
- [逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)

[[TOC]]

:::info
この記事はJava17+Helidon 3.0.1 + MicroProfile Fault Tolerance 4.0をもとに作成しています。
MicroProfile Fault Toleranceの詳細は[公式マニュアル](https://download.eclipse.org/microprofile/microprofile-fault-tolerance-4.0/microprofile-fault-tolerance-spec-4.0.html)を参照くだい。
:::

# 非同期機能の概要
[基本機能編](/msa/mp/cntrn12-mp-faulttolerance1/)はすべて同期呼び出しの例でしたが、非同期呼び出しに対してもフォールトトレランス処理を追加することができます。

MP Fault Toleranceは`@Asynchronous`が付けられたメソッドの実行を別スレッドで行います。`@Asynchronous`は`@Timeout`、`@Fallback`、`@Bulkhead`、`@CircuitBreaker`、および`@Retry`のMP Fault Toleranceアノテーションと一緒に使用でき、`@Asynchronous`が付けられているメソッドの実行とフォールトトレランス処理は別々のスレッドで行われます。

また、メソッドは非同期で実行されるため、呼び出し元には即時に結果が返りません。このため、`@Asynchronous`のメソッドはFutureもしくはCompletionStageを返す必要があります。

以上の理解をもとに基本機能編で紹介した例を非同期で実行する2つの例を紹介します。なお、説明には引き続き基本機能編と[同じサンプルアプリ](/msa/mp/cntrn12-mp-faulttolerance1/#説明に利用するサンプル)を利用します。

# 同時接続数を制限したい（スレッドプールスタイル）
バルクヘッド編で説明した[メソッドの同時実行数を制限する例](/msa/mp/cntrn12-mp-faulttolerance1/#同時接続数を制限したい（セマフォスタイル）)を非同期で実行し、同時実行数をスレッドプール数で制御するようにしてみます。

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

`hello_async_with_bulkhead`メソッドは`@Asynchronous`により非同期で実行されますが`@Bulkhead`の`value`属性により、このメソッドを同時に実行できるスレッド(Executorスレッド)は2つに制限されます。また`hello_async_with_bulkhead`メソッドが呼び出された際に空きExecutorスレッドがなければその時点でExecutionExceptionがスローされますが、`waitingTaskQueue`を指定することでその数だけメソッドの実行をキューイングさせることができます。

以下はキューイングやExecutionExceptionが発生する例となります。

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

*1:空きExecutorスレッドの数。コード例の上限は2  
*2:実行待ちタスク数。コード例の上限は1

# タイムアウト時間を指定したい（非同期実行）
タイムアウト編で説明した[メソッドにタイムアウト時間を指定する例](/msa/mp/cntrn12-mp-faulttolerance1/#タイムアウト時間を指定したい)と同じように今度は非同期実行するメソッドにタイムアウトを指定するようにしてみます。

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

`helloPattern17`メソッドは1.でhelloServiceの`hello_async_with_timeout`メソッドを呼び出しますが、このメソッドは`@Asynchronous`により非同期で実行されるため、処理結果の代わりに`CompletionStage`を受け取ります。これを2.の変換メソッドで`CompletableFuture`に変換した後に3.の`get()`で`hello_async_with_timeout`から結果が返されるまで`helloPattern17`メソッドの実行スレッドが待ち続けます。

この際、`hello_async_with_timeout`メソッドの実行時間が`@Timeout`で指定された500ミリ秒よりも掛かった場合は、500ミリ秒を経過した時点で3.の`get`メソッドからExecutionExceptionがスローされます。

ここで注目すべきは例外がスローされる場所です。

同期メソッドの例では必ず`@Timeout`や`@Bulkhead`などのメソッド境界から例外はスローされていましたが、今回は`hello_async_with_timeout`メソッドを超えた箇所で例外がスローされています。

これは`CompletionStage`や`Future`などの非同期結果は他の戻り値とは別に扱われるためです。MP Fault Toleranceランタイムは通常、なんらかの結果がメソッド境界を越えた時点で完了としますが`@Asynchronous`のメソッドから返される`CompletionStage`や`Future`に対してはメソッドから返された時点ではなく、その非同期処理の終了をもって完了とします。

このため、`@Asynchronous`で`CompletionStage`や`Future`が返されるメソッドでは、メソッド境界を越えたところでフォールトトレランス処理が動作します。

## CompletionStageとFutureの違い
ここで話を少し変えて、それではMP Fault Toleranceから見て`CompletionStage`と`Future`に違いはあるのでしょうか？

答えはあります。

どちらも完了とするタイミングは上述のとおり同じですが成功と失敗の見方が異なります。`CompletionStage`は正常に完了したか、それとも例外的に完了したかで成功と失敗を区別しますが、`Future`の場合は例外的に完了したがどうかは区別されません。よって、次のようなコードはMP Fault Toleranceランタイムに常に成功と判断されるため、意味を持ちません。

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

# まとめ
MP Fault Toleranceは@Asynchronousを付けることで各種フォールトトレランス処理を簡単に非同期対応できるようにしてますが、本質的に非同期処理は技術的難易度が高くハマりどころが多いのも事実です。このため、実開発での利用にあたっては[公式マニュアルの内容](https://download.eclipse.org/microprofile/microprofile-fault-tolerance-4.0/microprofile-fault-tolerance-spec-4.0.html#asynchronous)をよく理解されることをお勧めします。これは非同期に限ったことではありませんが非同期の仕組みの正しい理解は特に重要になります。
