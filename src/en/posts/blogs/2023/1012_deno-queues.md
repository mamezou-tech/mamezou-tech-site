---
title: Trying Out the Messaging Infrastructure Deno Queues in Deno
author: masahiro-kondo
date: 2023-10-12T00:00:00.000Z
tags:
  - Deno
translate: true

---




## Introduction
There was an announcement about Deno Queues.

[Announcing Deno Queues](https://deno.com/blog/queues)

Deno Queues is a messaging infrastructure implemented on Deno KV.

[Using Queues | Deno Docs](https://docs.deno.com/kv/manual/queue_overview)

Deno Deploy can be used as a foundation for asynchronous processing. The announcement blog mentions the following use cases:

- Scheduled email notifications for user-initiated tasks
- Reliable Webhook processing
- Bots for Discord and Slack

## Using Methods for Deno Queues
Two methods, enqueue and listenQueue, are provided in the Deno.Kv namespace. Enqueue is used to send messages, and listenQueue is implemented on the receiving side.

Here is a simple sample of sending and receiving messages.

- main.ts
```typescript
// Definition of notification messages
interface Notification {
  type: "email" | "sms";
  to: string;
  body: string;
}

// Message validation
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

// Receiving messages
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

// Creating messages
const message1: Notification = { type: "email", to: "Alice", body: "Hello, Alice!" };
const message2: Notification = { type: "sms", to: "Bob", body: "Hi, Bob!" };

// Sending messages
await db.enqueue(message1, { delay: 1000 });
await db.enqueue(message2, { delay: 2000 });
```

In enqueue, you can specify the sending timing with the delay option.

When you run this code, messages are output at 1-second intervals.

```shell
$ deno run --unstable main.ts 
sending email to Alice Hello, Alice!
sending sms to Bob Hi, Bob!
```

The above sample shared the queue within the same process. Let's separate the processes for sending and receiving.

Code for the sender. The path to the local SQLite file is specified as an argument to the openKv method.

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

Code for the receiver. Specify the same SQLite file path as the sender in the openKv method. Although redundant, the interface is defined individually.

```typescript
interface Notification {
  type: "email" | "sms";
  to: string;
  body: string;
}

function isNotification(o : unknown): o is Notification {
  // Omitted
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

Execution of the sender. Permissions for reading and writing the database file are required.

```shell
$ deno run --unstable --allow-read --allow-write publisher.ts
messages enqueued
```
Execution of the receiver. The messages were successfully read.

```shell
$ deno run --unstable --allow-read --allow-write subscriber.ts
sending email to Alice Hello, Alice!
sending sms to Bob Hi, Bob!
```
:::info
If no arguments are specified in the openKv method, it seems that data is saved to a generated path in localStorage. In this example, the path is explicitly described to connect to the same database.
:::

:::info
In the 1.36.4 release, it became possible to connect to a remote database hosted on Deno Deploy from a client via https. However, as of version 1.37.1 at the time of writing this article, enqueue / listenQueue is not yet supported, resulting in the following error message:

> error: Uncaught TypeError: Enqueue operations are not supported yet.

The connection to the remote database is discussed in the following article.

[Using the Deno Kernel for Jupyter Notebook Released in Deno 1.37](/blogs/2023/09/22/deno-jupyter-kernel/)
:::

## Behavior of Deno Queues
Let's pick up from the documentation about the messaging functionality guaranteed by Deno Queues. The quoted parts below are slightly modified from Google Translate.

At least once delivery is guaranteed.

> The Deno runtime guarantees "at least once delivery." This means that for most messages enqueued, the handler will be called once per listenQueue message. In some failure scenarios, the handler may be called multiple times for the same message to ensure delivery. It is important to design your application to handle duplicate messages correctly.

It seems that a design based on message duplication is required. It would be necessary to remember the processed messages on the receiving side and skip the same message if it comes again.

Regarding the guarantee of order, it seems to be best effort.

> The Deno runtime makes best efforts to deliver messages in the order they were enqueued. However, strict order is not guaranteed. In some cases, messages may be delivered out of order to ensure maximum throughput.

As for the behavior on the receiving side, it seems that if the default retry count[^1] is exceeded, the message will be dropped.

[^1]: The default seems to be 5 times.

> The listenQueue handler is called to process messages enqueued when they are ready for delivery. If the listenQueue handler throws an exception, the runtime will automatically retry calling the handler until it succeeds or the maximum retry count is reached. Once the handler call completes successfully, the message is considered successfully processed. If the handler consistently fails to retry, the message will be dropped.

## Combination with Atomic Transactions
By using the atomic transactions of Deno KV, it seems possible to perform message sending/receiving and data updates atomically. If you can bundle data updates and message sending/receiving in a transaction, it could be used for purposes such as sending messages only if the data update is successful or updating data only once when receiving a message.

## Conclusion
That's it for a brief look at Deno Queues. It's great to be able to achieve asynchronous application integration with simple code. Complex tasks can now be done even in edge environments.
