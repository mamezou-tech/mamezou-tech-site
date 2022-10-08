---
title: Kafka を Java のテストプロセスに埋め込める EmbeddedKafka でコンシューマーをテストする
author: masahiro-kondo
date: 2022-10-08
tags: [Kafka, テスト]
---

[Kafka]((https://kafka.apache.org/)) は人気の分散メッセージングシステムです。[Spring for Apache Kafka](https://spring.io/projects/spring-kafka) を使うと Kafka トピックからのメッセージ取得を契機としてビジネスロジックを実行するコンシューマーの Spring Boot アプリを簡単に作成できます。

![](https://i.gyazo.com/2a0aa01e59c924e221e95a0289d6831d.png)

本記事では Kafka の環境を構築することなくコンシューマーの結合テストができる EmbeddedKafka を紹介します。

[[TOC]]

## 概要
ローカルで Kafka 環境を構築して開発中のコンシューマーを動作確認することはもちろん可能ですが、けっこうマシンリソースを要求しますし、そもそも環境構築が面倒です[^1]。ローカルでサクッとテストを動かしたい、CI もできたら Kafka レスな環境で実行したいという要求は当然あります。

`@EmbeddedKafka` アノテーションを使うと SpringBootTest による結合テストで本物の Kafka をインプロセスで、テスト実行中だけ起動して使うことが可能です。

[EmbeddedKafka (Spring for Apache Kafka 2.9.1 API)](https://docs.spring.io/spring-kafka/api/org/springframework/kafka/test/context/EmbeddedKafka.html)

[^1]: Homebrew や Docker を使えば簡単ではあるのですが。

EmbeddedKafka は [Spring Initializr](https://start.spring.io/) で Spring for Apache Kafka を依存関係に入れると testImplementation に追加される spring-kafka-test に含まれています。

```groovy
dependencies {
	implementation 'org.springframework.kafka:spring-kafka'
	compileOnly 'org.projectlombok:lombok'
	annotationProcessor 'org.projectlombok:lombok'
	testImplementation 'org.springframework.boot:spring-boot-starter-test'
	testImplementation 'org.springframework.kafka:spring-kafka-test'
}
```

## コンシューマーアプリの作成
では、簡単なコンシューマーアプリを Spring Boot で書いて試していきます。

まず、トピックから取得する イベントを表すクラスを作ります。

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ExampleEvent {
  @JsonProperty("event_id")
  Long eventId;
  @JsonProperty("name")
  String name;
}
```

トピック `test-topic` にサブスクライブしてイベントを受信するコンシューマーのコードです。

```java
@Component
public class ExampleListener {

  private static final Logger logger = LoggerFactory.getLogger(ExampleListener.class);

  private Long receivedEventId;

  @KafkaListener(topics = "test-topic")
  public void recieve(ExampleEvent event) {
    logger.info("received payload='{}'", event.toString());
    receivedEventId = event.getEventId();
  }

  public Long getReceivedEventId() {
    return receivedEventId;
  }
}
```

`@KafkaListener` アノテーションを付与し ExampleEvent 型の引数を受け取るメソッドを書くだけです。メソッドではイベントをログに出力し、イベント ID を保持します。受信したイベント ID を取得するメソッドを(テスト用に)公開しています。

src/main/resources/application.yml で Kafka の設定をします。

```yaml
spring:
  kafka:
    bootstrap-servers: ${KAFKA_HOST:localhost}:${KAFKA_PORT:9092}
    consumer:
      group-id: example-group
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.use.type.headers: false
        spring.json.value.default.type: com.kondoumh.kafkaintegrationtest.consumer.model.ExampleEvent
```

`bootstrap-servers` は Kafka Broker にアクセスするためのホスト名とポートで、デフォルトで、`localhost:9092` を指定しています。`group-id` は、トピックにサブスクライブするコンシューマーを纏めるグループの ID で、Kafka はグループ単位で送信したイベントを管理しています。受信した ExampleEvent のデータをデシリアライズするため、`value-deserializer` に JsonDeserializer の FQCN を、`spring.json.value.default.type` に ExampleEvent の FQCN を指定します。

まずは 実際に Kafka をインストールした環境で実行してみます。

Spring Boot アプリを起動すると、指定したトピックに Listener が `example-group` のコンシューマーとして `test-topic` のパーティションにアサインされます[^2]。

[^2]: パーティションはトピックを Kafka Broker に割り当てる単位です。1つのトピックを複数パーティションに分け、複数のブローカーに冗長構成で配置することで、Kafka の高速性と信頼性を実現しています。

```shell
./gradlew bootRun
```

```
2022-10-06 12:11:28.184  INFO 40225 --- [ntainer#0-0-C-1] o.a.k.c.c.internals.SubscriptionState    : [Consumer clientId=consumer-example-group-1, groupId=example-group] Resetting offset for partition test-topic-0 to position FetchPosition{offset=0, offsetEpoch=Optional.empty, currentLeader=LeaderAndEpoch{leader=Optional[localhost:9092 (id: 1 rack: null)], epoch=0}}.
2022-10-06 12:11:28.265  INFO 40225 --- [ntainer#0-0-C-1] o.s.k.l.KafkaMessageListenerContainer    : example-group: partitions assigned: [test-topic-0]
```
:::info
Kafka の設定でトピックの自動作成が無効化されていなければ、Consumer を起動しただけで、KafkaListener の topics に指定したトピックが作成されます。自動作成が無効化されている場合は、`kafka-topics` コマンドで事前に作成します。

```shell
kafka-topics --create --bootstrap-server=localhost:9092 --replication-factor 1 --partitions 1 --topic test-topic
```
:::

kafka-console-producer を使って、`test-topic` に JSON でメッセージを送信します。

```shell
$ kafka-console-producer --bootstrap-server=localhost:9092 --topic test-topic
>{"event_id":100,"name":"Alice"}
```

Spring Boot アプリを起動したターミナルに受信したメッセージが出力されます。

```
2022-10-06 12:12:27.150  INFO 40225 --- [ntainer#0-0-C-1] c.k.k.consumer.ExampleListener           : received payload='ExampleEvent(eventId=100, name=Alice)'
```

## テストの作成と実行
それでは、このコンシューマーのテストを書きます。

src/test/resources/application.yml でテスト用の Kafka 設定をします。

```yaml
spring:
  kafka:
    bootstrap-servers: ${KAFKA_HOST:localhost}:${KAFKA_PORT:9092}
    consumer:
      auto-offset-reset: earliest
      group-id: example-group
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.use.type.headers: false
        spring.json.value.default.type: com.kondoumh.kafkaintegrationtest.consumer.model.ExampleEvent
```

main のプロダクトコード用の設定との違いは、`auto-offset-reset` を `earliest` にしていることです。これはテスト実行の際、コンシューマーのトピックに割り当て完了前にメッセージが送信されてもトピックのメッセージを先頭から読み取るという設定です。デフォルトではこの値は `latest` で、コンシューマーが割り当てられて以降に送信されたメッセージを受信します。テストではメッセージ送信は1度だけ行うため、このようにしています。

テストのコードです。`@EmbeddedKafka` アノテーションで、Kafka の設定をしています。

```java
@SpringBootTest
@DirtiesContext
@EmbeddedKafka(partitions = 1, brokerProperties = { "listeners=PLAINTEXT://localhost:9092", "port=9092" })
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class EmbeddedKafkaIntegrationTest {

  @Autowired
  private EmbeddedKafkaBroker broker;

  private KafkaTemplate<String, ExampleEvent> template;

  @Autowired
  private ExampleListener listener;

  private static final String TOPIC1 = "test-topic";

  @BeforeAll
  void setUp() {
    Map<String, Object> config = KafkaTestUtils.producerProps(broker);
    config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
    config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
    template = new KafkaTemplate<>(new DefaultKafkaProducerFactory<String, ExampleEvent>(config));
  }

  @Test
  public void recieve() throws Exception {
    var event = new ExampleEvent(100L, "Alice");
    template.send(TOPIC1, event);
    Thread.sleep(1000);
    assertThat(listener.getReceivedEventId()).isEqualTo(100L);
  }
}
```

KafkaTemplate はトピックにメッセージを送信するクラスで、Spring Kafka が提供するプロデューサー作成用のテンプレートです。このクラスは、直接 `@Autowired` でインジェクトできますが、埋め込みの Kafka でも起動はそれなりに時間がかかるので、EmbeddedKafkaBroker を使って `@BeforeAll` のタイミングで DefaultKafkaProducerFactory から生成しています。こうすることで、テスト実行の際に Kafka の起動待ちを少なくすることができます。ただ、この方式でプロデューサーを生成する場合、application.yml からの設定を読み込んでくれないため、KafkaTestUtils を使って、Broker の設定を取得し、Serializer の設定を追加して生成時に渡しています。

テストでは、ExampleEvent に値を設定して、`test-topic` に送信しています。送信後1秒待ってコンシューマーが受け取った、イベント ID の値を assert しています。

テストを実行すると無事に成功しました。

```shell
./gradlew test
```

![実行結果](https://i.gyazo.com/686f24d5bda69960e8efaf42af6fba37.png)

## まとめ
以上、EmbeddedKafka を使ったテスト方法をご紹介しました。インプロセスで Kafka を実行するのはかなりの力技だと思いますが、やはりニーズがあるのですね。この記事のソースコードの全体は以下のリポジトリにあります。

[GitHub - kondoumh/kafka-integration-test](https://github.com/kondoumh/kafka-integration-test)

参考: 
[Testing Kafka and Spring Boot](https://www.baeldung.com/spring-boot-kafka-testing)
