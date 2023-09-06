---
title: Kafka の Web UI を提供する kafka-ui を試す
author: masahiro-kondo
date: 2023-01-05
tags: [Kafka]
---

人気の分散メッセージングシステム Kafka では、オペレーション用のシェルスクリプト群は提供されていますが GUI は提供されていません。「Topic を作成する」、「Topic の Partition 数を増やす」、「Topic を流れるメッセージを確認する」、「Consumer によるメッセージ処理の進み具合を確認する」といったオペレーションには CLI を駆使する必要があります。

kafka-ui というサードパーティの Kafka Web UI が OSS で公開されているのを知ったので、軽く試してみました。

[GitHub - provectus/kafka-ui: Open-Source Web UI for Apache Kafka Management](https://github.com/provectus/kafka-ui)

[Provectus](https://provectus.com/) という AI のコンサル会社が開発している OSS です。バックエンドは Java (Spring Boot)、フロントエンドは React という構成で開発も活発なようです。現在のバージョンは 0.5.0 です。

:::info
Kafka を Cloud で提供している Confluent Platform では専用の Web UI で管理、監視ができます。

[Apache Kafka GUI Management and Monitoring - Confluent](https://www.confluent.io/product/confluent-platform/gui-driven-management-and-monitoring/)
:::


## kafka-ui のフィーチャー
[README](https://github.com/provectus/kafka-ui/blob/master/README.md)によると kafka-ui では以下のフィーチャーが提供されています。

- 複数クラスター管理
- メトリクスダッシュボードによるパフォーマンスモニター
- Kafka Brokers 監視
- Kafka Topics 監視
- Consumer Group 監視
- メッセージの参照
- 動的な Topic 設定
- OAuth 2.0による認証オプション(GitHub/GitLab/Google)
- カスタムのシリアライズ/デシリアライズプラグイン(AWS Glue, Smile)
- RBAC によるきめ細かい UI アクセス制御
- メッセージデータのマスキング

## docker-compose による構築
提供されているコンテナイメージを使って docker run で起動できますが、オプションが多いので docker-compose を使うのが楽です。既存の Kafka cluster が存在する場合、UI を起動する最低限の設定は以下のようになります。

- docker-compose.yml

```yaml
version: '2'
services:
  kafka-ui:
    image: provectuslabs/kafka-ui
    container_name: kafka-ui
    ports:
      - "8080:8080"
    restart: always
    environment:
      - KAFKA_CLUSTERS_0_NAME=local
      - KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=kafka:9092
```

`KAFKA_CLUSTERS_N` (N:番号)というプリフィクス付きの環境変数で管理対象の Kafka cluster の設定を指定します。複数のクラスターを管理する場合、プリフィクスの番号を変えて指定します。

[kafka-ui/documentation/compose/DOCKER_COMPOSE.md at master · provectus/kafka-ui](https://github.com/provectus/kafka-ui/blob/master/documentation/compose/DOCKER_COMPOSE.md)

Kafka cluster と kafka-ui を全て docker-compose で構築する例です。Kafka Broker と Zookeeper のコンテナイメージは Confluent のものを利用しています。

- docker-compose.yml

```yaml
---
version: '2'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.2.1
    container_name: zookeeper
    environment:
      TZ: Asia/Tokyo
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka0:
    image: confluentinc/cp-kafka:7.2.1
    container_name: kafka0
    ports:
      - "9092:9092"
    depends_on:
      - zookeeper
    environment:
      TZ: Asia/Tokyo
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_INTERNAL:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092,PLAINTEXT_INTERNAL://kafka0:29092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1

  kafka-ui:
    container_name: kafka-ui
    image: provectuslabs/kafka-ui:latest
    ports:
      - 3000:8080
    depends_on:
      - kafka0
    restart: always
    environment:
      TZ: Asia/Tokyo
      KAFKA_CLUSTERS_0_NAME: kafka-0
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka0:29092
```
services で ZooKeeper ← Kafka Broker(kafka0) ← kafka-ui という依存関係を定義しています。Kafka Broker をポート番号9092で公開し、kafka-ui の 環境変数 `KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS` に `Kafka Broker のサービス名:ポート番号`の形で Kafka Broker を指定します。kafka-ui 自身のポート番号は3000にしました。

docker-compose で起動します。

```shell
docker-compose up -d
```

起動後 localhost:3000 にアクセスすると、kafka-ui のダッシュボードが表示されます。トップレベルには管理対象の Kafka Cluster のリストが表示され、Broker、Partition、Topics の総数、送信されたメッセージ、消費されたメッセージのバイト数などのサマリー情報を見ることができます。

![Dashboard](https://i.gyazo.com/cc87aaa13a879e51c524f2d91dc6d446.png)

## Topic の状態を UI で確認
docker-compose で起動した Kafka Broker のコンテナ(kafka0) に入って、kafka-console-consumer を使って Consumer を起動し、適当なトピック名(hoge)を指定してサブスクライブしてみます。

```shell
docker-compose exec kafka0 \                         
  kafka-console-consumer --bootstrap-server kafka0:29092 --topic hoge
```

`Consumers` 画面に `console-consumer-xxxx` の形式の Group ID で Consumer が `STABLE` 状態で起動していることが表示されました。

![Consumers](https://i.gyazo.com/a6b952c071193752a19ef7e9ae211ccf.png)

Consumer の詳細情報を表示させることもできます。

![Consumer detail](https://i.gyazo.com/41009178f6d43dceba653ef1e2e74044.png)

起動時に指定した Topic 名(hoge)の Topic は自動作成され、`Topics` 画面で確認できます[^1]。

![Topics](https://i.gyazo.com/316dcaa82bb5d20b732715fe527168bc.png)

[^1]: Kafka Broker のデフォルトでは、Topic は自動作成になっています。

:::info
スクリーンショットの Topic の一覧にある、`__consumer_offsets` は、Topic の Group ID ごとの消費済みオフセット情報を保持するために Kafka 自身が使用する特殊な Topic です。
:::

Topic の詳細画面です。
![Consumer detail](https://i.gyazo.com/b0897cac2ab0215c42bece251eb5948f.png)

以下のようなタブから構成されます。
- `Overview` タブ: Partiion や Replication Factor
- `Messages` タブ: Topic に送信されたメッセージ
- `Settings` タブ: Topic の詳細な設定
- `Statistics` タブ: Topic に送信されたメッセージの統計量


Topic 詳細画面の `Produce message` で Topic にメッセージを送信することができます。

![Produce Message](https://i.gyazo.com/8867d6e560b7899b0eaa77ac3d0cf90c.png)

送信先の Partition を指定し、メッセージを編集して `Produce Message` をクリックするとメッセージが送信され、kafka-console-consumer 側で消費されました。

![console-consumer](https://i.gyazo.com/df9fcc224015263294a5310253679830.png)

Topic の `Messages` タブからメッセージの詳細情報を見ることができます。

![Message detail](https://i.gyazo.com/c76beed22391fc248acfc423ccf30460.png)

## Topic を UI で作成
上記の例では、kafka-console-consumer 起動時に Topic が自動作成されていました。その際、Partitions 1、Replication Factor 1 という設定になっていましたが、これは、Kafka Broker の設定値を元に作られています。

Broker の `Configs` タブで各種設定値を閲覧できます。キーワード検索も可能です。`num.partitions` は1になっています。

![num.partitions](https://i.gyazo.com/c065902bc838e99e2277382fa0de5f2b.png)

`default.replication.factor` も１です。

![replication.factor](https://i.gyazo.com/68ce362cc2d75d7e3bbaee4f42251bea.png)

Topic 一覧画面の `Add Topic` をクリックして UI で Topic を作成できます。

![Add Topic](https://i.gyazo.com/e97513a679ed587072ac1f9ae4107747.png)

トピック名以外の様々なパラメータを指定して Topic を作成できます。

Partition を2に指定して Topic を作成しました。

![Topic with 2 partitions](https://i.gyazo.com/fda9cd177442934110353b89d738416e.png)

:::info
Replication Factor は Topic の Partition をいくつの Kafka Broker に分散配置するかを決めるパラメータです。

以下のスクリーンショットは Kafka Broker の数より大きい Replication Factor を指定して `Create topic` をクリックしたところです。ちゃんと設定を見て入力値を検証してくれます。

![Add Topic with validation](https://i.gyazo.com/4703f3e5d18420225a0d60e2b9f37766.png)

:::

## Consumer Group の監視・管理
上記の Partition 数2の Topic にサブスクライブする Consumer を kafka-console-consumer で起動しました。今回は、Group ID を指定して起動しました。下記コマンドを、2つの別のターミナルで実行しています。

```shell
docker-compose exec kafka0 \
  kafka-console-consumer --bootstrap-server kafka0:29092 \
  --topic fuga \
  --consumer-property group.id=group-1
```

Topic の `Consumers` タブを開くと、起動時に指定した Group ID で Active Consumers が2つ STABLE になっているのがわかります。

![2 consumers of topic](https://i.gyazo.com/ca63c4be66a390dd94e75694a6e0fdc8.png)

対象の Group を選択し、属している Consumer の ID やメッセージの処理状況を確認できます。

![Consumer Group detail](https://i.gyazo.com/bcdac59f249a5500bcc075ffea598b06.png)

Topic の `Statistics` タブでも統計情報が更新されています。

![Statistics](https://i.gyazo.com/0e5158d0ca3e2a20053e7baa8f8e5693.png)

## Metrics の確認
最初の docker-compose.yml ではメトリクス情報の設定をしていないので、Broker の `Metrics` タブには何も出てきません。そこで、Kafka Broker の環境変数に `KAFKA_JMX_PORT` と `KAFKA_JMX_HOSTNAME` を追加して JMX Metrics のホスト名、ポート番号を指定し、kafka-ui 側から `KAFKA_CLUSTERS_0_METRICS_PORT` として参照するようにしました。

```yaml
  kafka0:
    image: confluentinc/cp-kafka:7.2.1
    container_name: kafka0
    ports:
      - "9092:9092"
    depends_on:
      - zookeeper
    environment:
      TZ: Asia/Tokyo
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_INTERNAL:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092,PLAINTEXT_INTERNAL://kafka0:29092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_JMX_PORT: 9997          # 追加
      KAFKA_JMX_HOSTNAME: kafka0    # 追加

  kafka-ui:
    container_name: kafka-ui
    image: provectuslabs/kafka-ui:latest
    ports:
      - 3000:8080
    depends_on:
      - kafka0
    restart: always
    environment:
      TZ: Asia/Tokyo
      KAFKA_CLUSTERS_0_NAME: kafka-0
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka0:29092
      KAFKA_CLUSTERS_0_METRICS_PORT: 9997 # 追加
```

これで Broker の `Metrics` タブで Metrics データを JSON 形式で取れるようになりました。Metrics は JMX の他 Prometheus も指定できるようです。

![Metrics](https://i.gyazo.com/df49d26beb0d53e5ae8fa1500fbab2f6.png)

:::info
グラフィカルなダッシュボードを期待したのですが、現在は提供されていないようです。issue がありました。[Metrics visualization · Issue #942 · provectus/kafka-ui](https://github.com/provectus/kafka-ui/issues/942)
:::

## kafka-ui を読み取り専用設定で起動する
kafka-ui のデフォルトでは、Topic の作成・削除などの Kafka に影響を与える操作が有効化されています。プロダクション環境の Kafka に影響を与えず監視だけしたいなどのケースのため、Read Only モードがサポートされています。環境変数 `KAFKA_CLUSTERS_0_READONLY` に `true` を指定することで kafka-ui が Read Only モードで起動します。

```yaml
  kafka-ui:
    container_name: kafka-ui
    image: provectuslabs/kafka-ui:latest
    ports:
      - 3000:8080
    depends_on:
      - kafka0
    restart: always
    environment:
      TZ: Asia/Tokyo
      KAFKA_CLUSTERS_0_NAME: kafka-0
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka0:29092
      KAFKA_CLUSTERS_0_METRICS_PORT: 9997
      KAFKA_CLUSTERS_0_READONLY: true # 追加
```

## 最後に
以上、kafka-ui を試してみました。ローカルの Docker でネットワーク遅延がないせいもありますが、サクサク動いていい感じです。[公式の README](https://github.com/provectus/kafka-ui/blob/master/README.md) にはスクリーンキャプチャーもありますので、実行しなくても雰囲気は掴めると思います。

今回取り上げていませんが、以下のような用途別の docker-compose ファイルも提供されていますので参考になると思います。

- スキーマレジストリ(メッセージのスキーマを管理するサーバー)を立てて kafka-ui で管理する
- Kafka Connect を設定して kafka-ui で管理する
- SSL を使う
- 様々な認証方式を使う

[kafka-ui/documentation/compose at master · provectus/kafka-ui](https://github.com/provectus/kafka-ui/tree/master/documentation/compose)

今回 Docker を使いましたが、Helm Chart も提供されており Kubernetes への導入も簡単になっています。

[provectus/kafka-ui-charts](https://github.com/provectus/kafka-ui-charts)

kafka-ui の GitHub リポジトリには、Topic 作成などのオペレーションに関する enhancement issue も多く登録されており、Kafka 運用ツールとしての期待値の高さを伺わせます。今後の開発に注目したいと思います。
