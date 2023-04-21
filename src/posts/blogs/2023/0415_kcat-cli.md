---
title: kcat - Kafka トピックと簡単にメッセージ送受信できる CLI
author: masahiro-kondo
date: 2023-04-15
tags: [Kafka]
---

Kafka の Consumer や Producer のアプリを開発する際、Kafka トピックにメッセージを送信して開発中の Consumer アプリで受信を確認したり、Producer アプリから送信したメッセージをトピックから読み出して確認したりすることが必要になります。

## Kafka 標準の kafka-console-producer / kafka-console-consumer
Kafka には、kafka-console-producer / kafka-console-consumer というシェルが付属しており、トピックへの送受信が簡単に行えます。

ローカルで起動した Kafka クラスターのトピック `topic-01` にメッセージを送信するための Producer を起動する例です。

```shell
kafka-console-producer --bootstrap-server=localhost:9092 --topic topic-01
```

起動すると入力受付状態になるので、テキストや JSON 形式でメッセージを書いて Enter キーで送信します。

`topic-01` からメッセージを受信するための Consumer の起動例です。

```shell
$ kafka-console-consumer --bootstrap-server localhost:9092 --topic test-01 --from-beginning
```
メッセージのヘッダーを表示するオプションなどもあります。

```shell
$ kafka-console-consumer --bootstrap-server localhost:9092 --topic test-topic --from-beginning \
  --property print.headers=true
```

:::info
kafka-console-producer と kafka-console-consumer はそれぞれ kafka.tools.ConsoleProducer、kafka.tools.ConsoleConsumer という Scala で書かれた class を実行するシェルスクリプトです。

- [kafka/ConsoleProducer.scala at master · a0x8o/kafka](https://github.com/a0x8o/kafka/blob/master/core/src/main/scala/kafka/tools/ConsoleProducer.scala)
- [kafka/ConsoleConsumer.scala at master · a0x8o/kafka](https://github.com/a0x8o/kafka/blob/master/core/src/main/scala/kafka/tools/ConsoleConsumer.scala)
:::

kafka-console-producer / kafka-console-consumer は JVM を使うので起動がやや遅いです。kafka-console-producer にはヒストリー機能もないので、送信したメッセージをちょっと編集して送信するといったことができません。

## kcat の概要
kcat は Kafka トピックとのメッセージ送受信が簡単にできる CLI です。以前は kafkacat という名前だったようです[^1]。

[^1]: README には、ASF の商標ポリシーに準拠するためにリネームされたとあります。

[GitHub - edenhill/kcat: Generic command line non-JVM Apache Kafka producer and consumer](https://github.com/edenhill/kcat)

個人開発の OSS ですが、Confluent のドキュメントにも kcat の利用方法が記載されていますので、実質公式認定ツールと言ってよいようです[^2]。

[^2]: 最終リリースは kcat にリネームされた2021年8月とやや時間が経っているのが気になりますが。

[Use kcat (formerly kafkacat) to test and debug Apache Kafka deployments &#124; Confluent Documentation](https://docs.confluent.io/platform/current/clients/kafkacat-usage.html)

C で書かれており高速に起動します。標準入出力を使えるためシェルとの親和性が高いという特徴があります。メッセージの送受信だけでなく、Kafka クラスター / トピック / Partition のメタデータを出力することもできます[^3]。Kafka クラスターとの接続に SSL と SASL による認証も可能、Avro によるバイナリーメッセージにも対応しているなどかなり高機能です。

[^3]: Kafka 標準では kafka-topics などの別のシェルスクリプトで提供されています。

## kcat のインストール
macOS の場合 Homebrew でインストール可能です。

```shell
brew install kcat
```
その他の OS へのインストールについては、README の [Install](https://github.com/edenhill/kcat#install) セクションを参照してください。

## kcat を使う
トピックからメッセージを読みだす例です。`-C` は Consumer モードです。オプション指定が短くてよいですね。

```shell
kcat -C -b localhost:9092 -t topic-01
```

`-J` オプションで、メッセージだけでなくトピックや partition、offset などのメタ情報などを JSON 形式で出力できます。

```shell
$ kcat -C -b localhost:9092 -t topic-01 -J
{"topic":"topic-01","partition":0,"offset":0,"tstype":"create","ts":1681550740876,"broker":0,"key":null,"payload":"{\"greeting\":\"hello\",\"name\":\"Bob\"}"}
```

トピックにメッセージを送信する場合、echo でパイプ渡しできます。コマンドヒストリでメッセージを編集して送信するのも簡単ですね。

```shell
echo '{"greeting":"hello","name":"Bob"}' | kcat -b localhost:9092 -t topic-01
```

:::info:2023.04.21追記
記事を書いた時点では、kafka-console-producer は標準入力からデータを送れないと思っていたのですが、ちゃんとできました。この機能だけのために kcat を別途インストールする必要はありません。

```shell
echo '{"greeting":"hello","name":"Bob"}' | kafka-console-producer --bootstrap-server localhost:9092 --topic topic-01
```
:::

kafka-console-producer 同様の producer モードもあり、メッセージを手打ちして Enter で送信も可能です。

```shell
kcat -P -b localhost:9092 -t topic-01
```

ヘッダー付きのメッセージを送信することもできます。これはおそらく kafka-console-producer ではサポートされていない機能です。

```shell
echo '{"greeting":"hello","name":"Alice"}' | kcat -b localhost:9092 -t topic-01 -H Header-Key=header-value
```
:::info
kcat の設定は Kafka の C++ クライアントライブラリ [confluentinc/librdkafka](https://github.com/confluentinc/librdkafka) の属性が指定可能です。`~/.config/kcat.conf` に設定ファイルを配置することも可能です。
:::

## 最後に
以上 kcat の紹介でした。README の [Examples](https://github.com/edenhill/kcat#examples) に豊富なサンプルがあるので参照してください。

ローカルで使うだけでなく CI/CD パイプラインでのテストに利用するのもよさそうです。かなり便利ですので Kafka を使った開発のお供に試してみてはいかがでしょうか。
