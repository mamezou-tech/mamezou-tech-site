---
title: Knative EventingのKafka BrokerでリトライとDead Letter Sink（DLS）を試す
author: takashi-sato
date: 2022-09-13
tags: ["k8s", "Kafka"]
---

KafkaをイベントレイヤーとするKnative Eventingの環境をリトライとDLSが可能な様に構成した上で、意図的に処理を失敗させるKnative Servicveをデプロイし、処理失敗時のリトライやDLSへのメッセージ送信を確認しました。


# モチベーション

KafkaをイベントレイヤーとするKnative Eventingの設定例でよく見られるものは、KafkaSourceのSinkに直接Knative Serviceを設定するシンプルなものが殆どです。ただ、KafkaSourceにはリトライやDLSの設定ができないため、信頼性が求められるところにはその形のまま適用しにくいです。そこで、それらの設定が可能なBrokerとTriggerを使う構成で、処理失敗時のリトライやDLSへのメッセージ送信を確認しようと思います。

# 登場する用語の説明

登場する用語についての概要をごく簡単に記載します。詳細についてはそれぞれのリンク先を参照してください。

- Knative Eventing
  - Knative Eventingは、イベント駆動型のアプリケーションを構築するためのプラットホームです。
  - [Knative Eventing overview - Knative](https://knative.dev/docs/eventing/)
- Kafka Source
  - KafkaはEventストリームを扱うためのプラットホームです。Knative Eventingでは、イベントソースとして、Kafkaを利用することができます。
  - [KafkaSource - Knative](https://knative.dev/docs/eventing/sources/kafka-source/)
- Broker
  - Brokerは、イベントのパブリッシャに対してイベントメッセージを渡すエンドポイントを提供し、メッセージを受け取るリソースです。
  - [About Brokers - Knative](https://knative.dev/docs/eventing/brokers/)
- Trigger
  - TriggerはBrokerがイベントを配信するためのリソースです。BrokerからTriggerに渡されたイベントメッセージが、Triggerをサブスクライブしているコンシューマに配信されます。
  - [Using Triggers - Knative](https://knative.dev/docs/eventing/triggers/)
- DLS(Dead Letter Sink)
  - 送信メッセージをそれを処理する相手に送れなかった、あるいは、エラーで返されたなど、正しく処理されかなったメッセージを送信するところです。
  - 正しく処理されなかったメッセージを退避し、トラブルの解析や処理の再実行などに利用します。
    - [Handling delivery failure - Knative](https://knative.dev/docs/eventing/event-delivery/#configuring-broker-event-delivery)
  - AWSのAmazno SQSでの「Amazon SQS デッドレターキュー」に類するものです。
     - [Amazon SQS デッドレターキュー - Amazon Simple Queue Service](https://docs.aws.amazon.com/ja_jp/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)

# 検証構成

よくある設定例は、以下のように、イベントソースのKafkaSourceのSinkにKnative Serviceへの参照を直接指定したシンプルなものです。

![よくある構成](https://i.gyazo.com/bec795dff5bbb4f37dc9b83b9566f19a.jpg)

今回は、以下のように、KafkaSourceとするKafkaTopic①の他に、処理が失敗した時にメセージを送るDLS用のKafkaTopic③を作成します。
その上で、KafkaSourceとKnative Serviceの間をBrokerとTriggerで結ぶ構成とします。

![検証構成](https://i.gyazo.com/1085e14c29e213ce2693244235c538b7.jpg)

上記の構成とした上で、Brokerに対してリトライとDLSの設定を行い、以下を検証します。

- Knative Serviceで処理が失敗した時にリトライが行われるか
- リトライ回数が既定値を超えた時にDLSへメッセージが転送されるか

またその他の構成として、検証用のKnative Serviceのアプリのイメージの管理とKafkaのTopicに入っているメッセジーの確認のために、以下をk8s環境内に構築しています（それぞれの構築方法については今回のテーマから外れますので、詳細についての説明は割愛します）。

- Kafdrop
- プライベートレジストリ

また今回は、Brokerの作成時に自動登録されるKafkaTopic②を使う構成としましたが、Brokerの作成時にすでにあるKafkaTopic①を使うこともできそうです。それについては、別途検証をしていきたいと思います。

[Knative Kafka Broker - Knative](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/#bring-your-own-topic)

# 検証結果

ひとまず検証結果を先に記載します。検証作業の詳細を知りたい方は、後述する「検証作業詳細（準備編）」と「検証作業詳細（実装編）」を参照してください。

## メッセージの送信

KafkaSourceに指定したトピック①（testknativebroker-request）に直接メッセージを書き込みます。

```shell
$ kubectl -n kafka run kafka-producer -ti --image=quay.io/strimzi/kafka:0.31.0-kafka-3.2.1 --rm=true --restart=Never -- bin/kafka-console-producer.sh --bootstrap-server my-cluster-kafka-bootstrap:9092 --topic testknativebroker-request
If you don't see a command prompt, try pressing enter.
>{"value":1}
>{"value":2}
>{"value":3}
>{"value":4}
>{"value":5}
>{"value":6}
>{"value":7}
>{"value":8}
>{"value":9}
>{"value":10}
>
```

## Knative Serviceログ

上記のメッセージ送信を受けたKnative Serviceのコンソール出力です。

Knative Serviceで、メッセージの値が3で割り切れる時に処理を失敗させています。
そのため、メッセージの値が3で割り切れる時に、リトライが、10秒、20秒、40秒の間隔で3回発生していることが分かります。
また、value=9のリトライの間にvalue=10のメッセージを送信したところで、それが割り込まれていることが分かります。

```shell
Fri Sep 09 08:27:52 UTC 2022 message: Message(1)
Fri Sep 09 08:28:13 UTC 2022 message: Message(2)
Fri Sep 09 08:28:31 UTC 2022 message: Message(3)
Fri Sep 09 08:28:41 UTC 2022 message: Message(3)
Fri Sep 09 08:29:01 UTC 2022 message: Message(3)
Fri Sep 09 08:29:41 UTC 2022 message: Message(3)
Fri Sep 09 08:29:50 UTC 2022 message: Message(4)
Fri Sep 09 08:30:01 UTC 2022 message: Message(5)
Fri Sep 09 08:30:14 UTC 2022 message: Message(6)
Fri Sep 09 08:30:24 UTC 2022 message: Message(6)
Fri Sep 09 08:30:44 UTC 2022 message: Message(6)
Fri Sep 09 08:31:24 UTC 2022 message: Message(6)
Fri Sep 09 08:31:28 UTC 2022 message: Message(7)
Fri Sep 09 08:31:38 UTC 2022 message: Message(8)
Fri Sep 09 08:31:52 UTC 2022 message: Message(9)
Fri Sep 09 08:32:02 UTC 2022 message: Message(9)
Fri Sep 09 08:32:22 UTC 2022 message: Message(9)
Fri Sep 09 08:32:43 UTC 2022 message: Message(10)
Fri Sep 09 08:33:02 UTC 2022 message: Message(9)
```

## トピックメッセージ

### KafkaTopic①

メッセージを送ったKafkaTopic①の様子です。
value=1〜10のメッセージがKafkaSourceに指定したTopicに入っています。

![送信メッセージ](https://i.gyazo.com/c7989e31652f43d3efa702f5de51bd0e.png)

### KafkaTopic③

Knative Serviceへの規定回数のリトライ後にメッセージが送られるKafkaTopic③の様子です。
value=3,6,9のメッセージが最後のリトライが行われた時間にDLSに指定したTopicに入っています。

![DLSメッセージ](https://i.gyazo.com/578430e3a65dcae7b28ab599c884be1a.png)

こちらのTopicにはCloud Eventsのスキーマでメッセージが入っています。これにより、Knativeの内部では、Cloud Eventsの形式でメッセージの送受信が行われていることが予想できます。

# 検証作業詳細（準備編）

## Knativeのインストール

Knative Serving、および、Knative Eventingの環境をガイドに従って構築しています。なお検証用にはKnative 1.4.1の環境を構築しています。

- [Install Serving with YAML - Knative](https://knative.dev/v1.4-docs/install/yaml-install/serving/install-serving-with-yaml/)
  - Install the Knative Serving component
  - Install a networking layer
    - Istio
  - Configure DNS
    - Magic DNS (sslip.io)
- [Install Eventing with YAML - Knative](https://knative.dev/v1.4-docs/install/yaml-install/eventing/install-eventing-with-yaml/)
  - Install Knative Eventing
  - Optional: Install a default Channel (messaging) layer
    - Apache Kafka Channel
  - Optional: Install a Broker laye
    - Apache Kafka Broker
  - Install optional Eventing extensions
    - Apache Kafka Sink

## Knative以外の環境構築

Knative環境以外には、以下のリソースをk8s環境内に構築しています。

- プライベートレジストリ
  - 検証用のKnative Serviceアプリのコンテナイメージを管理するためのdockerレジストリ
- Kafdrop
  - KafkaのTopicに送信されたメッセージを参照するためのWebコンソール

# 検証作業詳細（実装編）

## k8sリソース

### KafkaTopic

構成図のKafkaTopic①、および、KafkaTopic③。

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: testknativebroker-request
  namespace: kafka
  labels:
    strimzi.io/cluster: my-cluster
spec:
  partitions: 1
  replicas: 1
  config:
    retention.ms: 7200000
    segment.bytes: 1073741824

---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: testknativebroker-request-dead
  namespace: kafka
  labels:
    strimzi.io/cluster: my-cluster
spec:
  partitions: 1
  replicas: 1
  config:
    retention.ms: 7200000
    segment.bytes: 1073741824
```

### Knative Service

検証用アプリのKnative Service。アプリの詳細は後述する「検証用アプリのKnative Service」を参照してください。作成したアプリをdokcer iamgeとしてtestknativebroker-consumerというタグをつけてビルドし、予め、プライベートレジストリにpushしておきます。

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: testknativebroker-consumer-service
spec:
  template:
    metadata:
      annotations:
        kubernetes.io/change-cause: "update1"
    spec:
      containers:
        - image: [プライベートレジストリ]/testknativebroker-consumer:latest
```

### KafkaSink

処理が失敗した時にメッセージを転送するSink。

```yaml
apiVersion: eventing.knative.dev/v1alpha1
kind: KafkaSink
metadata:
  name: testknativebroker-request-deadletter-sink
  namespace: default
spec:
  topic: testknativebroker-request-dead
  bootstrapServers:
   - my-cluster-kafka-bootstrap.kafka:9092
```

### ConfigMap

次のBrokerの作成のために予め以下のConfigMapを作成しておきます。
そうすることでBrokerの作成時に自動的にKafkaTopicが作成されます（構成図のKafkaTopic②）。
なお、Knativeのガイドの通りにインストールを進めるとkafkaのbootstrapサーバは"my-cluster-kafka-bootstrap.kafka:9092"になるため、以下ではそれを指定しています。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-broker-config
  namespace: knative-eventing
data:
  default.topic.partitions: "10"
  default.topic.replication.factor: "1"
  bootstrap.servers: "my-cluster-kafka-bootstrap.kafka:9092"
```

### Broker

メッセージを受け取るBroker。ここでDLSとして作成済みのKafkaSinkへの参照を指定します。

```yaml
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  annotations:
    eventing.knative.dev/broker.class: Kafka
  name: testknativebroker-request-broker
  namespace: default
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: kafka-broker-config
    namespace: knative-eventing
  delivery:
    deadLetterSink:
      ref:
        apiVersion: eventing.knative.dev/v1alpha1
        kind: KafkaSink
        name: testknativebroker-request-deadletter-sink
    backoffDelay: PT5S
    backoffPolicy: exponential
    retry: 3
```

Broker作成後に、以下のKafkaTopicが自動的に作成されます。

```shell
$ kubectl get KafkaTopic -n kafka
NAME                                                            CLUSTER      PARTITIONS   REPLICATION FACTOR   READY
knative-broker-default-testknativebroker-request-broker         my-cluster   10           1                    True
```

トピック名は"knative-broker"-{namespace}-{broker名}となります。
また、"PARTITIONS"と"REPLICATION FACTOR"が予め作成したConfigMapの内容に従って、KafkaTopicが作成されています。

設定の以下がリトライの設定。

```yaml
    backoffDelay: PT5S
    backoffPolicy: exponential
    retry: 3
```

backoffDelayの仕様については、Knativeのガイドに以下のように記載されています。

> When using the exponential back off policy, the back off delay is equal to backoffDelay*2^\<numberOfRetries>.

[Handling delivery failure - Knative](https://knative.dev/v1.4-docs/eventing/event-delivery/#configuring-subscription-event-delivery)

これによりこのリトライ設定は以下のようになります。

+ リトライ回数は3回
+ 初回のリトライは10秒後で、その後は、20秒後、40秒後。

### Trigger

作成したBrokerを受けてKnative Serviceを呼ぶTriggerのリソース。

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: testknativebroker-request-trigger
spec:
  broker: testknativebroker-request-broker
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: testknativebroker-consumer-service
```

### KafkaSource

メッセージを送信するKafkaTopicを指定したKafkaSourceのリソース。

```yaml
apiVersion: sources.knative.dev/v1beta1
kind: KafkaSource
metadata:
  name: testknativebroker-request-kafka-source
spec:
  consumerGroup: knative-group
  bootstrapServers:
    - my-cluster-kafka-bootstrap.kafka:9092 
  topics:
    - testknativebroker-request
  sink:
    ref:
      apiVersion: eventing.knative.dev/v1
      kind: Broker
      name: testknativebroker-request-broker
```

よくあるKafkaSourceの例ではsinkにKnative Serviceへの参照が指定されている事がほとんどですが、今回は、作成したBrokerへの参照をsinkに指定します。

## Knative Service

Knativeのサービスは基本的には8080ポートでリクエスト受けるHTTPサーバのコンテナで、ルートパスへのPOSTリクエストを受けて処理を実行するアプリです。

今回は、akka httpでテスト用のKnative Serviceを作成しました。

### HTTPサーバ

akka httpのサーバの起動処理。これは今回の本質ではないので説明は割愛します。読み飛ばして頂いて良いです。

```scala
package com.example.testknativebroker.consumer

import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.Behaviors
import akka.http.scaladsl.Http
import akka.http.scaladsl.server.Route

import scala.util.{Failure, Success}

object App {
  private def startHttpServer(routes: Route)(implicit system: ActorSystem[_]): Unit = {
    import system.executionContext

    val futureBinding = Http().newServerAt("0.0.0.0", 8080).bind(routes)
    futureBinding.onComplete {
      case Success(binding) =>
        val address = binding.localAddress
        system.log.info("Server online at http://{}:{}/", address.getHostString, address.getPort)
      case Failure(ex) =>
        system.log.error("Failed to bind HTTP endpoint, terminating system", ex)
        system.terminate()
    }
  }

  def main(args: Array[String]): Unit = {
    val rootBehavior = Behaviors.setup[Nothing] { context =>
      val routes = new Routes()(context.system)
      startHttpServer(routes.routes)(context.system)
      Behaviors.empty
    }
    val system = ActorSystem[Nothing](rootBehavior, "HttpServer")
  }
}
```

### Route

リクエスト処理部の実装。実装の詳しい内容は本質から逸れるので説明は割愛しますが、以下のメッセージを受けて処理をします。

```json
{"value":1}
```

ルート（"/"）へのPOSTリクエストを受けて、メッセージ内のvalueの値が3で割り切れる時に500 Internal Server Errorを返し、それ以外の場合には200 OKを返します。
なお、私が試したバージョン（Knative 1.4.1）では、明示的に空文字（""）を返しています。そうしないと、Kafka BrokerのDispatcherがエラーを吐きました。

```scala
package com.example.testknativebroker.consumer

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route
import spray.json.DefaultJsonProtocol._
import spray.json._

import java.util.Date

case class Message(value: Int)

class Routes(implicit val system: ActorSystem[_]) {

  implicit val messageJsonFormat: RootJsonFormat[Message] = jsonFormat1(Message)

  val routes: Route =
    pathPrefix("") {
      pathEnd {
        post {
          entity(as[String]) { source =>
            val message = source.parseJson.convertTo[Message]
            println(s"${new Date()} message: ${message}")
            message.value match {
              case v: Int if v % 3 == 0 => complete(StatusCodes.InternalServerError, "")
              case _ => complete(StatusCodes.OK, "")
            }
          }
        }
      }
    }
}
```

# まとめ

今回は、KnativeでSourceとServiceの間にBrokerを挟んで、Serviceでの処理失敗時のリトライとDLSへのメッセージ転送を確認しました。

Cloud環境では通信経路の信頼性などの要因により意図せずに処理が失敗してしまうことが少なからずあります。
そのため、予め処理の失敗を想定し、リトライやDLSを組み込んだアーキテクチャにしておくことで、より安定したシステムを構築できると考えます。