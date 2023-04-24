---
title: KafkaJS で Kafka Consumer / Producer を書く
author: masahiro-kondo
date: 2023-04-24
tags: [Kafka]
---

Apache Kafka ではクライアントライブラリが様々な言語で開発されています。Confluent 公式では、Java / C++ / Go / .NET / Python がサポートされています。

[Kafka クライアント &#124; Confluent Documentation](https://docs.confluent.io/ja-jp/platform/7.1/clients/index.html)

Node.js では KafkaJS が利用できます。個人開発のプロジェクトですが、記事執筆時点でスター3.2k、コントリビューター117人、採用プロジェクト10k以上とかなりメジャーなライブラリです。ドキュメントも充実しています。

[KafkaJS · KafkaJS, a modern Apache Kafka client for Node.js](https://kafka.js.org/)

[GitHub - tulios/kafkajs: A modern Apache Kafka client for node.js](https://github.com/tulios/kafkajs)

Node.js で Kafka のクライアントを書くメリットは以下のようになるでしょう。

- プロセスの起動が早い
- コードがシンプルに書ける
- TypeScript も使える

KafkaJS の公式ドキュメントは以下です。

[Getting Started · KafkaJS](https://kafka.js.org/docs/getting-started)

## KafkaJS のインストール
Node.js のプロジェクトを作って KafkaJS をインストールするには以下のようにします。

```shell
mkdir kafka-clients && cd kafka-clients
npm init --y
npm i kafkajs
```

package.json は以下のように指定しました。ES Modules と top-level await を使うために main のファイル拡張子は `mjs` にしています。

- package.json
```json
{
  "name": "kafka-clients",
  "version": "0.1.0",
  "main": "index.mjs",
  "scripts": {
    "start": "node index.mjs"
  },
  "dependencies": {
    "kafkajs": "^2.2.4"
  }
}
```

:::info
top-level await を使うと、mjs ファイルのトップレベルで、Promise から値を取り出すことができるので、従来のように async 関数を定義する必要がなくなり、シンプルに書けます。

- 従来の書き方
```javascript
(async() => {
  // 非同期な処理の呼び出し
})().catch(console.error);
```
:::

## Consumer を書く

Consumer のコードサンプルです。

- index.mjs
```javascript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({ // 1
  clientId: 'my-app',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'test-group'}); 　// 2
await consumer.connect(); // 3
await consumer.subscribe({ topic: 'test-topic', fromBeginning: true }); // 4

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => { // 5
    console.log(message.value.toString()); // 6
    const correlationId = message.headers['correlation-id']; // 7
    if (correlationId) {
      console.log(correlationId.toString());
    }
  },
});
```

1. Kafka クライアントの作成では、`clientId` と `brokers` の指定が必須になっています。クライアント設定の詳細については [Client Configuration · KafkaJS](https://kafka.js.org/docs/configuration) を参照してください。
2. Kafka クライアントの `consumer` メソッドで `groupId` を指定して、Consumer を生成します。
3. Consumer オブジェクトの `connect` メソッドで Kafka クライアント生成時に定義した Kafka クラスターに接続します。
4. 対象の Kafka トピックに subscribe します。
5. Consumer オブジェクトの `run` メソッドに `eachMessage` ハンドラーを定義して Kafka トピックから取り出したメッセージを処理する function を書きます。
6. メッセージを取得します。ログを出力しているだけですが、本来はメッセージに応じたビジネスロジックを実行します。
7. ヘッダー情報の取り出しです。


`eachMessage` ハンドラーでは、subscribe している `topic`、割り当てられている `partition`、到達した `message` が取得できます。メッセージの本体は、`value` プロパティで、ヘッダーは `headers` プロパティで取り出せます。メッセージが JSON で送信されている場合は、`JSON.parse` でパースして取り出します。


:::info
Client ID はアプリケーションの単位で命名します。Kafka へのリクエストを追跡する際に識別しやすい名前にするのが推奨されています。
Group ID は同一トピックに割り当てられる Consumer のグループに付与します。同一 Group ID の Consumer は同一トピックの異なる partition からメッセージを受信するように割り当てられます。
:::

Consumer 処理の詳細なオプションについては [Consuming Messages · KafkaJS](https://kafka.js.org/docs/consuming) を参照してください。

## Producer を書く

Producer のサンプルです。

- index.mjs
```javascript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092']
});

const producer = kafka.producer(); // 1

await producer.connect(); // 2
await producer.send({ // 3
  topic: 'test-topic',
  messages: [
    {
      value: 'Hello KafkaJS user!',
      headers: {
        'correlation-id': '1234',
      },
    }
  ],
});
```

1. Kafka クライアントの `producer` メソッドで、Producer を生成します。
2. Producer の `connect` メソッドで Kafka クラスターに接続します。
3. Producer の `send` メソッドで、トピックを指定してメッセージを送信します。

`send` メソッドでは、メッセージを配列で渡します。`value` にはメッセージの本体、`headers` にはヘッダー情報を含めます。メッセージが JavaScript オブジェクトの場合、`JSON.stringify` で変換します。

Producer の処理の詳細なオプションについては [Producing Messages · KafkaJS](https://kafka.js.org/docs/producing) を参照してください。

## 最後に
KafkaJS で Consumer / Producer を実装する方法をご紹介しました。Java の場合、Spring for Apache Kafka を使ってかなりシンプルに実装できます。それでも、Node.js + KafkaJS はプロジェクトを作って動かすまでの手間が格段に少なくライトウェイトです。プロジェクトの事情に合わせて適したクライアントライブラリを選択していただければと思います。
