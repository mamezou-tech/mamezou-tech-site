---
title: Deno のメッセージング基盤 Deno Queues を試す
author: masahiro-kondo
date: 2023-10-12
tags: [Deno]
---

## はじめに
Deno Queues の発表がありました。

[Announcing Deno Queues](https://deno.com/blog/queues)

Deno Queues は Deno KV 上に実装されたメッセージング基盤です。

[Using Queues | Deno Docs](https://docs.deno.com/kv/manual/queue_overview)

Deno Deploy を非同期処理の基盤として利用できます。アナウンスブログでは以下のようなユースケースが挙げられています。

- (ユーザーが開始したタスクに対する)スケジュールされた電子メール通知
- 信頼性の高い Webhook 処理
- Discord や Slack のボット

## Deno Queues 用メソッドの利用
enqueue / listenQueue の2つのメソッドが、Deno.Kv 名前空間で提供されています。メッセージを送信するのが enqueue、受信側が実装するのが listenQueue です。

メッセージの送受信の簡単なサンプルです。

- main.ts
```typescript
// 通知メッセージの定義
interface Notification {
  type: "email" | "sms";
  to: string;
  body: string;
}

// メッセージの検証
function isNotification(o : unknown): o is Notification {
  return (
    ((o as Notification)?.type === "email" || (o as Notification)?.type === "sms") &&
     (o as Notification)?.to !== undefined &&
     typeof (o as Notification)?.to === "string" &&
     (o as Notification)?.body !== undefined &&
     typeof (o as Notification)?.body === "string"
     );
}

const db = await Deno.openKv();

// メッセージ受信
db.listenQueue((msg) => {
  if (!isNotification(msg)) {
    console.error("invalid message", msg);
    return;
  }
  if (msg.type === "email") {
    console.log("sending email to", msg.to, msg.body);
  } else if (msg.type === "sms") {
    console.log("sending sms to", msg.to, msg.body);
  }
});

// メッセージの作成
const message1: Notification = { type: "email", to: "Alice", body: "Hello, Alice!" };
const message2: Notification = { type: "sms", to: "Bob", body: "Hi, Bob!" };

// メッセージ送信
await db.enqueue(message1, { delay: 1000 });
await db.enqueue(message2, { delay: 2000 });
```

enqueue では delay オプションで送信タイミングを指定可能です。

このコードを実行すると、1秒間隔で送信されたメッセージが出力されます。

```shell
$ deno run --unstable main.ts 
sending email to Alice Hello, Alice!
sending sms to Bob Hi, Bob!
```

上記のサンプルは、同一プロセス内で queue を共有していました。送信と受信でプロセスを分離してみます。

送信側のコード。openKv メソッドの引数にローカルの SQLite ファイルのパスを指定しています。

- publisher.ts
```typescript
interface Notification {
  type: "email" | "sms";
  to: string;
  body: string;
}

const db = await Deno.openKv("db");

const message1: Notification = { type: "email", to: "Alice", body: "Hello, Alice!" };
const message2: Notification = { type: "sms", to: "Bob", body: "Hi, Bob!" };

await db.enqueue(message1);
await db.enqueue(message2);

console.log("messages enqueued");
```

受信側のコード。openKv メソッドで送信側と同じ sqlite ファイルのパスを指定します。冗長ですが interface は個別に定義しています。

```typescript
interface Notification {
  type: "email" | "sms";
  to: string;
  body: string;
}

function isNotification(o : unknown): o is Notification {
  // 省略
}

const db = await Deno.openKv("db");

db.listenQueue((msg) => {
  if (!isNotification(msg)) {
    console.error("invalid message", msg);
    return;
  }
  if (msg.type === "email") {
    console.log("sending email to", msg.to, msg.body);
  } else if (msg.type === "sms") {
    console.log("sending sms to", msg.to, msg.body);
  }
});
```

送信側の実行。データベースファイルの読み書きのパーミッションが必要となります。

```shell
$ deno run --unstable --allow-read --allow-write publisher.ts
messages enqueued
```
受信側の実行。無事にメッセージが読み出されました。

```shell
$ deno run --unstable --allow-read --allow-write subscriber.ts
sending email to Alice Hello, Alice!
sending sms to Bob Hi, Bob!
```
:::info
openKv メソッドで引数を指定しない場合、localStorage の生成されたパスにデータが保存されるようです。この例では、同一のデータベースに接続するために明示的にパスを記述しています。
:::

:::info
1.36.4 リリースで、Deno Deploy でホストされるリモートのデータベースにクライアントから https 接続できるようになりました。ただ、本記事執筆時点 の 1.37.1 ではまだ enqueue / listenQueue には対応していないようで以下のようなエラーメッセージが出ました。

> error: Uncaught TypeError: Enqueue operations are not supported yet.

リモートデータベースへの接続については以下の記事で触れています。

[Deno 1.37 でリリースされた Jupyter Notebook の Deno カーネルを使う](/blogs/2023/09/22/deno-jupyter-kernel/)
:::

## Deno Queues の挙動
Deno Queues が保証するメッセージング機能についてドキュメントから拾ってみます。以下、引用部は Google 翻訳を少しだけ修正したものです。

at least once の到達が保証されます。

> Deno ランタイムは「少なくとも1回の配信」を保証します。これは、キューに入れられたメッセージの大部分について、 listenQueue メッセージごとにハンドラーが1回呼び出されることを意味します。一部の障害シナリオでは、配信を確実にするために、同じメッセージに対してハンドラーが複数回呼び出されることがあります。重複メッセージが正しく処理されるようにアプリケーションを設計することが重要です。

メッセージの重複を前提とした設計が要求されるようです。処理済みのメッセージを受信側で記憶して同じメッセージが来たら読み飛ばすなどの対応が必要でしょう。

順序性の保証についてはベストエフォートのようです。

> Deno ランタイムはキューに入れられた順序でメッセージを配信するよう最善の努力を尽くします。ただし、厳密な順序保証はありません。場合によっては、最大のスループットを確保するために、メッセージが順序どおりに配信されないことがあります。

受け取り側の挙動としては、既定のリトライ回数[^1]を超えるとメッセージをドロップするようです。

[^1]: デフォルトでは5回のようです。

> listenQueue ハンドラーは、キューに入れられたメッセージが配信の準備ができたときに処理するために呼び出されます。listenQueue ハンドラーが例外をスローした場合、ランタイムは成功するか最大再試行回数に達するまで、ハンドラーの呼び出しを自動的に再試行します。ハンドラーの呼び出しが正常に完了すると、メッセージは正常に処理されたとみなされます。ハンドラーが再試行に一貫して失敗する場合、メッセージはドロップされます。

## アトミックトランザクションとの組み合わせ
Deno KV のアトミックトランザクションを利用して、メッセージ送受信とデータの更新をアトミックに行うことができるようです。データの更新とメッセージ送受信をトランザクションにまとめられれば、データ更新が成功した場合のみメッセージを送信するとかメッセージ受信時に1度だけデータを更新するなどの用途に使えそうです。

## 最後に
以上、Deno Queues を軽く触ってみました。非同期なアプリケーション連携をシンプルなコードで実現できるのは素晴らしいですね。エッジ環境でも複雑なことができるようになってきました。
