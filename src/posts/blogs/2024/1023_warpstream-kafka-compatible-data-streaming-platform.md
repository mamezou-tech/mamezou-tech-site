---
title: WrapStream - Confluent が獲得した Kafka 互換のデータストリーミングプラットフォーム
author: masahiro-kondo
date: 2024-10-22
tags: [WrapStream, Kafka]
image: true
---

## はじめに
WrapStream は Apache Kafka 互換のデータストリーミングプラットフォームです。

S3 などのオブジェクトストレージとシングルバイナリのエージェントだけで構成され、AZ(availability zone) 間のネットワーキングコストなし、ディスク管理不要、高いスケーラビリティを特徴とします。

[WarpStream - An Apache Kafka Compatible Data Streaming Platform](https://www.warpstream.com/)

今年の9月に WarpStream は Kafka のクラウドサービスを展開する Confluent により買収されることが発表されました。

[Confluent acquires WarpStream | Confluent](https://www.confluent.io/blog/confluent-acquires-warpstream/)

WrapStream のコファウンダーの人のブログに買収の経緯が書かれています。

[WarpStream is Dead, Long Live WarpStream](https://www.warpstream.com/blog/warpstream-is-dead-long-live-warpstream)

WarpStream の公式ドキュメントは以下にあります。

[Introduction | WarpStream](https://docs.warpstream.com/warpstream)

まだプロダクションレディではないようですが、どんなものか少し触って、アーキテクチャーなども見てみたいと思います。

:::info
以前の記事で紹介した Redpanda も Kafka 互換のストリーミングプラットフォームです。シングルバイナリによるシンプルなデプロイ、高速性、耐障害性を特徴としています

[Kafka 互換の高効率なデータストリーミングプラットフォーム Redpanda](https://developer.mamezou-tech.com/blogs/2023/10/04/redpanda/)
:::

## 試すための準備: WarpStream  Agent / CLI のインストール
WarpStream のデモや Playground を動かすために WarpStream の Agent / CLI をインストールする必要があります。

Linux と macOS の amd64/arm64 の バイナリーが提供されています。Docker でも試せます。シングルバイナリで提供されていますので、使用するプラットフォームに適したものをダウンロードしてパスを通せば OK です。

[Install the WarpStream Agent / CLI | WarpStream](https://docs.warpstream.com/warpstream/getting-started/install-the-warpstream-agent)

以下は、Apple Silicon Mac 用のバイナリをインストールする例です。

```shell
curl -LO https://warpstream-public-us-east-1.s3.amazonaws.com/warpstream_agent_releases/warpstream_agent_darwin_arm64_latest.tar.gz
tar xfz warpstream_agent_darwin_arm64_latest.tar.gz
sudo mv warpstream_agent_darwin_arm64 /usr/local/bin/warpstream
```
## Playground を動かしてみる
CLI を使って Playground を動かしてみます。

[Run the Agents Locally | WarpStream](https://docs.warpstream.com/warpstream/byoc/run-the-agent-locally)


```shell
warpstream playground
```

以下のように Playground 用のテンポラリーアカウントにサインアップし、ローカルでエージェントが起動します。

```
WARNING, RUNNING IN PLAYGROUND MODE. All data and state is ephemeral. Server will shutdown automatically after: 4h0m0s

Signing up for temporary account...
Done signing up for temporary account
Starting local agent...

started agent, HTTP server on port: 8080 and kafka server on port: 9092

open the developer console at: https:/console.warpstream.com/login?warpstream_redirect_to=virtual_clusters%2Fvci_4ef27467_0885_4e6c_991c_a95ebba854a4%2Foverview&warpstream_session_key=sks_908e60e40aa2ed27ca59a46289e005144377785ca2b8ea111dad65459d72825e


Keep in mind that playground accounts are heavily ratelimited
```

この状態で別のターミナルから kcmd サブコマンドで接続テスト。

```shell
warpstream kcmd -type diagnose-connection -bootstrap-host localhost -bootstrap-port 9092
```

```
running diagnose-connection sub-command with bootstrap-host: localhost and bootstrap-port: 9092


Broker Details
---------------
  LOcALHOST:9092 (NodeID: 597523006) [playground]
    ACCESSIBLE ✅


GroupCoordinator: LOcALHOST:9092 (NodeID: 597523006)
```
Broker との接続が確認できました。

起動時に表示される developer console の URL にアクセスすると、クラスターや Topic の状態を見ることが出来ます。

![Console](https://i.gyazo.com/0407e6a876009d7ec610577f62417cfd.png)

Agent はローカルで動いていますが、WarpStream クラスターの Control Plane は AWS 上に展開されています。

![Clusters](https://i.gyazo.com/f3889d098a577015079cb55c90d60b45.png)

## トピック作成と通信
Playground が起動した状態でトピック作成や通信を試します。

["Hello World" for Apache Kafka | WarpStream](https://docs.warpstream.com/warpstream/getting-started/hello-world-using-kafka)

warpstream サブコマンド kcmd で `create-topic` を指定してトピックを作ります。

```shell
warpstream kcmd --type create-topic --topic hello-warpstream
```

```
running create-topic sub-command with bootstrap-host: localhost and bootstrap-port: 9092
created topic "hello-warpstream" successfully, topic ID: MgAAAAAAAAAAAAAAAAAAAA==
```

トピックが作成されました。コンソールにも表示されます。

![Topic](https://i.gyazo.com/72126a4969dafb6ad1305d148cd565b2.png)

トピックにメッセージを送信してみます。kcmd に `produce` を指定します。


```shell
warpstream kcmd --type produce --topic hello-warpstream --records "world,,world"
```

```shell
running produce sub-command with bootstrap-host: localhost and bootstrap-port: 9092

result: partition:0 offset:0 value:"world" 
result: partition:0 offset:1 value:"world" 
```

メッセージが送信されたようです。受信は、kcmd で `fetch` を指定します。

```shell
warpstream kcmd --type fetch --topic hello-warpstream --offset 0
```

```shell
running fetch sub-command with bootstrap-host: localhost and bootstrap-port: 9092

consuming topic:"hello-warpstream" partition:0 offset:0
result: partition:0 offset:0 key:"hello" value:"world"
result: partition:0 offset:1 key:"hello" value:"world"
```

メッセージが受信できました。kcmd produce ではメッセージのデフォルトのキーが "hello" になるようです。

Kafka の consumer でも受信してみます。

```shell
kafka-console-consumer --bootstrap-server localhost:9092 --topic hello-warpstream --property print.key=true --property key.separator="-" --from-beginning
```

kafka-console-consumer では、デフォルトでメッセージのキーは非表示なので、property で指定して - で繋ぐようにしました。

```
hello-world
hello-world
```

こちらでも受信できました。

## デモ環境を動かす
Playground を終了して、デモを動かしてみます。デモ環境ではトピックが自動作成され、WASM 版の Consumer / Producer が自動起動してメッセージを定期的に送受信するため、Console 画面でトラフィックを見ることができます。

[Run the Demo | WarpStream](https://docs.warpstream.com/warpstream/getting-started/demo)

デモの起動です。

```shell
warpstream demo
```

Playground 同様、テンポラリアカウントにログインした状態でデモ環境が起動します。1時間すると自動シャットダウンされます。

```
Demo will automatically shutdown after: 1h0m0s

Signing up for temporary account...
Done signing up for temporary account
Created temporary data directory: /var/folders/w9/4fztxrrj6lq3tstsk4qt6xlh0000gn/T/warpstream_demo2619599535
Starting local agent...

started agent, HTTP server on port: 8080 and kafka server on port: 9092
Creating local kafka client...
Done creating local kafka client
Creating demo topic
Done creating demo stream
Starting demo producers and consumers

opening developer console in browser: https:/console.warpstream.com/login?warpstream_redirect_to=virtual_clusters%2Fvci_edbd2502_fabd_47b6_b671_3d8673b5430f%2Foverview&warpstream_session_key=sks_71fe21c5081d1da10680c09029d826a2d138a4ac7ab6f832a556ddf8ecd7cfed

opening data directory in browser: /var/folders/w9/4fztxrrj6lq3tstsk4qt6xlh0000gn/T/warpstream_demo2619599535

run this command in a separate terminal to see the agents form a cluster together:

WARPSTREAM_AVAILABILITY_ZONE=DEMO WARPSTREAM_LOG_LEVEL=warn warpstream agent \
       :
```

デモ用のトピック、プロデューサー、コンシューマーが起動しデモ用のメッセージの定期的な送受信が開始されます。

コンソール画面が自動的にブラウザで開きます。またデモ環境用のストレージのフォルダも開きます。デモ用メッセージが自動で送受信されているので、Ovreview でスループットの状況などが表示されています。

![Console](https://i.gyazo.com/9b8ba475f9d4ddbf8622585f3cdd5f7f.png)

![folder](https://i.gyazo.com/1ee25173ab8fd06c460cf414e9f77fd2.png)


Demo 用の Agent は1つだけ起動している状態です。CPU 数はホストマシンの CPU コア数(12)と一致しています。

![Single Agent](https://i.gyazo.com/ca4384d418513e2ed4bb9064fc3c65ba.png)

起動時メッセージに従って Agent を追加してみます。

```shell
WARPSTREAM_AVAILABILITY_ZONE=DEMO WARPSTREAM_LOG_LEVEL=warn warpstream agent \
				--defaultVirtualClusterID=vci_edbd2502_fabd_47b6_b671_3d8673b5430f \
				--agentKey=aks_axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
				--bucketURL=file:///var/folders/w9/4fztxrrj6lq3tstsk4qt6xlh0000gn/T/warpstream_demo2619599535 \
				--metadataURL=https://metadata.playground.us-east-1.warpstream.com \
				--httpPort=8081 \
				--kafkaPort=9093 \
				--enableClusterWideEnvironment \
				--clusterWideEnvironmentPort=9081 \
				--gracefulShutdownDuration=0s
```

![Dual Agents](https://i.gyazo.com/6a6322cd94fb74f716ab86e2542dfdca.png)

2つ目の Agent が追加されました。2つの Agent とも Usage が出ており、クラスター内の処理を分散していることがわかります。

## WarpStream のアーキテクチャー
ここまで、Playground や Demo を動かしてきましたが、WarpStream はどのように動作しているのでしょうか。公式ドキュメントのアーキテクチャーの章を参照してみましょう。

[Architecture | WarpStream](https://docs.warpstream.com/warpstream/overview/architecture)

Apache Kafka のクラスターを構成するノードはストレージとセットであり、ステートフルなワークロードとして管理されます。これに対して WarpStream はローカルディスク不要で、オブジェクトストレージと通信するステートレスなエージェントのみ、クラスターの状態管理は全て WarpStream Cloud のコントロールプレーンにオフロードされています。アーキテクチャ図を公式ドキュメントから引用します。

![Architecture](https://i.gyazo.com/c8fe165021dcf7864d345650e732fc92.webp)

WarpStream のユーザーデータはユーザーの VPC 内部のみで送受信され、WarpStream Cloud にはクラスター管理用のメタデータのみが送信されます。

WarpStream は、Kafka ノードでは一体化しているストレージとコンピューティングを分離し、データとメタデータを分離し、コントロールプレーンをクラウドサービスとして分離することで、ユーザー側のエージェントをステートレスにしています。これにより、自動スケーリングが容易になっています。

## さいごに
Kafka もユースケースが増えて、アーキテクチャー上の課題を色々と抱えるようになり、転換期を迎えているという記事がありました[^1]。

[Kafka Has Reached a Turning Point](https://medium.com/@yingjunwu/kafka-has-reached-a-turning-point-649bd18b967f)

WarpStream は、Kafka の実行コストを 1/10 にするそうです。Pricing のページでは Kafka より80%安いとされています。

[Pricing - WarpStream - Stream More, Manage Less](https://www.warpstream.com/pricing)

S3 だけでなく、MinIO や R2 など S3 互換のストレージで構成することも可能です。

Kafka クラスター管理が不要になり、安価でスケールが容易なストリーミング環境を使える未来が見えてきました。

[^1]: 筆者はこの記事で WarpStream を知ったわけですが。
