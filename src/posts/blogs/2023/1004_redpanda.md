---
title: Kafka 互換の高効率なデータストリーミングプラットフォーム Redpanda
author: masahiro-kondo
date: 2023-10-04
tags: [Redpanda, Kafka]
---

## はじめに

Redpanda は Kafka 互換のイベントストリーミングプラットフォームです。

[Redpanda | The streaming data platform for developers](https://redpanda.com/)

ロゴは Red Panda(レッサーパンダ)になっています。

JVM で動作する Kafka と異なり C++ で書かれており[^1]、シングルバイナリで実行可能です。ZooKeeper のようなリソース管理サービスなどにも依存しません。

[^1]: CLI や インフラ関連のツール周りは Go で書かれています。Web UI を提供する console は別プロジェクトで、こちらは Go と React です。

Kafka に比べて6倍のコスト効率が謳われています。

[Redpanda vs. Apache Kafka: A Total Cost of Ownership comparison](https://redpanda.com/blog/is-redpanda-better-than-kafka-tco-comparison)

セルフホストでもクラウドサービスでも利用できます。

メニーコア CPU 時代に対応したアーキテクチャを実現しています。

[Thread-per-core buffer management for a modern Kafka-API storage system](https://redpanda.com/blog/tpc-buffers)

## Kafka との互換性

Kafka の 0.11 - 3.1 との互換性があります。メジャーな Kafka Client は互換性が検証されています。

- Apache Kafka Java Client(Java)
- librdkafka (C/C++)
- franz-go (Go)
- kafka-python (Python)
- KafkaJS (Node.js)
- kafka-rust (Rust)

Kafka のいくつかの機能はサポートされていません。詳しくは以下のドキュメントを参照してください。

[Kafka Compatibility](https://docs.redpanda.com/current/develop/kafka-clients/)

:::info
Node.js 用の Kafka Client KafkaJS については以下の記事で紹介しています。

[KafkaJS で Kafka Consumer / Producer を書く](/blogs/2023/04/24/kafkajs/)
:::

## ローカル環境構築
docker compose で簡単に試すことができます。公式ドキュメントからシングルノードのクラスターを構築する compose.yml をコピーして compose.yml ファイルとして保存します。

[Redpanda Quickstart](https://docs.redpanda.com/current/get-started/quick-start/)

![copy yaml](https://i.gyazo.com/9acd93595c248251ca34c7181f520cbd.png)

compose.yml を保存したディレクトリで起動します。

```shell
docker compose up -d
```

Redpanda クラスターと console(Web アプリ) の2つのコンテナが起動します。

```
[+] Running 14/14
 ✔ console 7 layers [⣿⣿⣿⣿⣿⣿⣿]      0B/0B      Pulled                 16.5s 
   ✔ edb6bdbacee9 Pull complete                                        1.3s 
   ✔ 7f1fcdde94d6 Pull complete                                        1.0s 
   ✔ 14ee393e44da Pull complete                                        1.2s 
   ✔ 4912f5d8102b Pull complete                                       10.6s 
   ✔ 3435b9b0f2e8 Pull complete                                        3.8s 
   ✔ 5793ecade4d8 Pull complete                                        2.6s 
   ✔ 4fa930a9b4e0 Pull complete                                        4.0s 
 ✔ redpanda-0 5 layers [⣿⣿⣿⣿⣿]      0B/0B      Pulled                 24.5s 
   ✔ 4ee097f9a366 Pull complete                                        9.3s 
   ✔ dbd5afc41ce1 Pull complete                                        7.7s 
   ✔ 3559f853e5db Pull complete                                        8.9s 
   ✔ be25f6d46e45 Pull complete                                       14.9s 
   ✔ 6420bec47ce0 Pull complete                                       18.5s 
[+] Running 4/4
 ✔ Network redpanda-quickstart_redpanda_network  Created               0.0s 
 ✔ Volume "redpanda-quickstart_redpanda-0"       Created               0.0s 
 ✔ Container redpanda-0                          Started               0.1s 
 ✔ Container redpanda-console                    Started               0.0s
```

Redpanda クラスターの管理には管理コンソール以外に rpk という CLI が提供されています。以下の用途があります。

- クラスターの管理
- トピックの管理、トピックへの送信、トピックからの受信
- ホストのデバッグとチューニング
- Redpand クラウドとのやりとり

[Introduction to rpk](https://docs.redpanda.com/current/get-started/intro-to-rpk/)

:::info
記事では Redpanda のコンテナにインストールされている rpk を docker exec で使用しています。rpk をホストマシンにインストールしておけば、直接実行できます。macOS の場合 Homebrew でインストールできます。

```shell
brew install redpanda-data/tap/redpanda
```

rpk の動作確認をしておきます。

```shell
$ rpk version
v23.2.11 (rev f170affee)
```
:::

## 試運転

Redpanda のクラスター情報を表示します。Broker が1台で、初期状態ではシステム用のトピックが存在するだけです。

```shell
$ docker exec -it redpanda-0 rpk cluster info
CLUSTER
=======
redpanda.34a62130-8a81-4d2e-8c18-20e857618759

BROKERS
=======
ID    HOST        PORT
0*    redpanda-0  9092

TOPICS
======
NAME      PARTITIONS  REPLICAS
_schemas  1           1
```

トピックを作成。create サブコマンドを使用します。

```shell
$ docker exec -it redpanda-0 rpk topic create chat-room
TOPIC      STATUS
chat-room  OK
```

トピックにメッセージを送信。produce サブコマンドを使用します。

```shell
docker exec -it redpanda-0 rpk topic produce chat-room
```

以下のようにメッセージを入力します。

```
Pandas are fabulous!
```

トピックにメッセージが送信されます。

```
Produced to partition 0 at offset 0 with timestamp 1663282629789.
```

送信されたメッセージを受信します。consume サブコマンドを使用します。

```shell
docker exec -it redpanda-0 rpk topic consume chat-room --num 1
```

メッセージがメタデータと共に受信されました。

```
{
  "topic": "chat-room",
  "value": "Pandas are fabulous!",
  "timestamp": 1695168283296,
  "partition": 0,
  "offset": 0
}
```

## コンソール画面

Kafka には公式のコンソール画面はありません[^2]が Redpanda には付属しています。

[^2]: Confluent などのクラウドサービスで利用する場合はサービス事業者が提供するコンソールが利用できます。

docker compose で起動した状態で `http://127.0.0.1:8080/overview` に接続すると Web UI でクラスターの情報を見ることができます。

![UI - Overview](https://i.gyazo.com/0b272cea9ee54eb68c9f192aaa478b0a.png)

Topics タブでトピック一覧が表示されます。

![UI - Topic](https://i.gyazo.com/0bd2d017bea7cb4df8fbe55c14761cd0.png)

:::info
Kafka では kafka-ui というサードパーティ製の Web UI が開発されています。以下の記事で紹介しています。

[Kafka の Web UI を提供する kafka-ui を試す](/blogs/2023/01/05/kafka-ui/)
:::

## Kafka Client からアクセス

Kafka Client からの接続を試してみます。kafka-console-consumer を使います。Redpanda の docker compose では Reapanda クラスターの外部ポートは19092に設定されていますので、bootstrap-server オプションにこのポートを指定して chat-room トピックからメッセージを取得します。

```shell
$ kafka-console-consumer --bootstrap-server 127.0.0.1:19092 --topic chat-room --from-beginning
Pandas are fabulous!
```
無事に取得できました。

## Kafka に対する優位性
Redpanda のシングルバイナリによる利点は以下のブログ記事で解説されています。

[Exploring the benefits of single-binary architecture](https://redpanda.com/blog/single-binary-architecture)

Kafka はブローカー、スキーマレジストリ、ZooKeeper などのサービスを個別にデプロイする必要があります。Redpanda はこれらの機能が1つのバイナリになっています。そのため以下のような利点があります。

- デプロイの簡素化: Kafka では相互依存する複数のサービスの開始・停止など複雑で非効率なプロセスが必要
- 管理の簡素化
- エッジ/IoT への展開: フットプリントが小さいことでランタイム環境の範囲が広がる
- CI/CD での高速な起動・シャットダウン
- 障害からの回復力の向上

:::info
Kafka も [KIP-500](https://issues.apache.org/jira/browse/KAFKA-9119) の対応で ZooKeeper に依存しなくなりました。

Redpanda は内部の Raft 実装によりクラスター管理をセルフで行なっています。

[Simplifying Redpanda Raft implementation](https://redpanda.com/blog/simplifying-raft-replication-in-redpanda)
:::

## 最後に
以上、シングルバイナリによるストリーミングプラットフォーム Redpanda の紹介でした。ドキュメントやブログでアーキテクチャについて詳細に記述されており開発者の熱量を感じます。コンテナ、IoT、エッジコンピューティングに Kafka プロトコルが広がっていくのは未来を感じます。
