---
title: OpenAPI Generator を使って Spring Boot アプリを作る (4)
author: shigeki-shoji
date: 2022-06-24
tags: [java, "openapi-generator", "spring-boot", "spring-integration", DDD]
---

シリーズ4回目は [Spring Integration](https://spring.io/projects/spring-integration) を使うドメインイベントの発行 (publish) について説明します。

## ドメイン駆動設計

説明に入る前に「[Spring Boot と Apache Camel の統合](https://developer.mamezou-tech.com/blogs/2022/06/12/spring-boot-with-apache-camel-integration/)」の議論を受けて冬眠カプセルを冬眠ポッド (hibernation pod) へ、船員を旅行者 (passenger) へとユビキタス言語の変更等イベントストーミングの修正がありました。

![](https://github.com/edward-mamezou/use-openapi-generator/raw/feature/openapi-generator-4/event-storming/event-storming-2.png)

このサービスは、冬眠ポッドにドメインイベントを発行する [publish/subscribe](https://www.enterpriseintegrationpatterns.com/PublishSubscribeChannel.html) のために MQTT を使用します。MQTT は非常に軽量な代わりに [Kafka](https://kafka.apache.org/) のようなイベントストアを保持しません。つまり、購読者 (subscriber または consumer) が接続していない間に発行されるイベントは残らないということを意味します。

従ってイベントストーミングの見直しで、後で受信されなかったイベントの再発行を可能にするため「発行済みイベント」集約をこのサービスに持ちました。「[実践ドメイン駆動設計](https://www.amazon.co.jp/dp/479813161X/)」でもドメインイベントの発行は集約を通しています。

イベントストーミングの成果をさらに「[Context Mapper](https://contextmapper.org/docs/home/)」ツールを使って[モデリング](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-4/context-map/example.cml)しました。

```text
ContextMap {
    contains ExampleContext
}

BoundedContext ExampleContext {
    type SYSTEM
    implementationTechnology "Java"

    Aggregate Passengers {
        Entity HibernationPod {
            aggregateRoot

            - HibernationPodId podId
            - Passenger passenger

            def HelloEvent sayHello(String podId, String firstName);
        }

        ValueObject HibernationPodId {
            String podId
        }

        ValueObject Passenger {
            String firstName
        }
    }

    Aggregate HelloEvents {
        DomainEvent HelloEvent {
            aggregateRoot

            - EventId eventId
            - HibernationPod pod
            URL helloVoice
            DateTime time

            def HelloEvent publishEvent(HibernationPod hibernationPod);
        }

        ValueObject EventId {
            String eventId
        }
    }
}
```

PlantUML を使って出力した図は下のようになります。

![](https://github.com/edward-mamezou/use-openapi-generator/raw/feature/openapi-generator-4/out/src-gen/example_BC_ExampleContext/example_BC_ExampleContext.png)

「[エリック・エヴァンスのドメイン駆動設計](https://www.amazon.co.jp/dp/4798121967/)」に集約 (aggregate) と集約ルート (aggregate root) の説明があります。

ポイントは、「集約」はトランザクション整合性が守られる境界で、境界づけられたコンテキスト (bounded context) を横断するアクセスは集約ルートを介さなければならないということです。余談ですが、ここからの帰結として「ドメイン駆動設計」を採用し、複数の集約を横断する場合には「結果整合性」となります。

> 複数の集約にまたがるルールはどれも、常に最新の状態にあるということが期待できない。イベント処理やバッチ処理、その他の更新の仕組みを通じて、他の依存関係は一定の時間内に解消できる。
> 出典: [エリック・エヴァンスのドメイン駆動設計](https://www.amazon.co.jp/dp/4798121967/)

## イベントのフロー

このサービスの設計では、冬眠ポッドが開いて、挨拶の音声ファイルの生成をリクエストすると、音声ファイル生成が通知されるイベントIDをレスポンスします。

音声ファイルの URL は MQTT を通じてイベントが発行されます。冬眠ポッドの別の部分にあるオーディオプレーヤーコンポーネントが MQTT をサブスクライブして、自身のイベントの場合に生成された音声ファイルを再生します。

リクエストした音声ファイルがいつまでも届かない場合、冬眠ポッドは、リクエスト時のレスポンスで受け取ったイベントIDを使って再送を求める拡張が可能な設計になっています。

## Spring Integration

[Spring Integration](https://spring.io/projects/spring-integration) は、ほとんどの[エンタープライズ統合パターン](https://www.enterpriseintegrationpatterns.com/) をサポートしています。別の記事で紹介した [Apache Camel](https://developer.mamezou-tech.com/blogs/2022/06/12/spring-boot-with-apache-camel-integration/) は Spring だけでなく Quarkus など他のフレームワークでも利用可能で、統合可能なコンポーネントも豊富にあります。

このサービスは Spring Boot バージョン 2.7.0 を採用しています。現在はまだ、このバージョンの Spring Boot に対応した Apache Camel が存在しないため、今回は Spring Integration を使うことにしました。

Spring Integration のドメイン固有言語 (DSL) を使って [MQTT ブローカーを定義](https://github.com/edward-mamezou/use-openapi-generator/blob/78cb728867dd24ac3387477464dbc935b348f927/src/main/java/com/mamezou_tech/example/controller/configuration/HelloConfiguration.java#L30-L34) できます。

```java
    @Bean
    public IntegrationFlow getHibernationPodHelloFlow() {
        MqttPahoMessageHandler handler = new MqttPahoMessageHandler(brokerUrl, UUID.randomUUID().toString());
        handler.setDefaultTopic(defaultTopic);
        return flow -> flow.handle(handler);
    }
```

この定義を使用するときは、Spring の依存性注入 (DI) を使うことが必要です。つまり `@Autowired` 等を使うことが必要です。Spring の DI コンテナに登録されるコンポーネントは、コードに書かれたとおりに生成されたインスタンスではなく、Spring の内部の仕組みでコードが付加されている場合があります。ここで定義した `IntegrationFlow` もその一つです。

注入された `IntegrationFlow` を使ってイベントを発行する[コード](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-4/src/main/java/com/mamezou_tech/example/infrastructure/repository/HelloEventRepositoryImpl.java)は次のようになります。

```java
    mqttOutbound.getInputChannel().send(message);
```

## レイヤードアーキテクチャ

2回目の[記事](https://developer.mamezou-tech.com/blogs/2022/06/09/openapi-generator-2/)で説明したときとドメイン層以外のレイヤー構成に変化はありません。以前はドメイン層を設けなかったため、アプリケーション層から直接インフラストラクチャー層を実行するようにしていました。

### インフラストラクチャー層

インフラストラクチャー層について少し補足します。[Amazon Polly](https://aws.amazon.com/jp/polly/) を使う音声の合成、mp3 から wave 形式への変換、MQTT へのイベント発行等が増えたため、インフラストラクチャー層内部もパッケージを分割しました。

ドメイン駆動設計はビジネスドメインにフォーカスして、ビジネスドメインをドメイン層に隔離します。

一方、組込みではリアルタイム制御など、エンタープライズアプリケーションでいうインフラストラクチャー層のウェイトが大きくなりやすいです。

冬眠ポッドや宇宙船制御システムでは、このインフラストラクチャー層にフォーカスして多層化が必要になるでしょう。

### ドメイン層の実装

複雑なロジック、再利用性の高いレイヤーを実装するコードは、Spring のようなフレームワークの寿命と合わせるべきではありません。ドメイン駆動設計でドメイン層を他のレイヤーと分離している場合は、このドメイン層のコードをライブラリにして、他のフレームワークでも利用できると考えています。

したがって、このサービスの実装では、ドメイン層のコードに Spring に依存するコードを含めないようにしています。

ドメイン駆動設計を採用した場合、インフラストラクチャー層と結合しやすいデザインパターンは、ライフサイクルに分類される、集約、リポジトリ、ファクトリーです。エンティティは、この3つと関連する可能性があり、バリューオブジェクトは集約とファクトリーに関連する可能性があり、ドメインイベントは集約と関連する可能性があります。

これらのオブジェクトにインフラストラクチャー層の実装を注入しなければなりませんが、`@Autowired` などのアノテーションを使わずにアプリケーション層のコードで注入するようにしました。

外部からドメインへのアクセスは、集約ルートを通さなければならないというルールを前述しました。アプリケーション層はこの外部との境界に位置するレイヤーです。したがって、集約でトランザクション整合性を保つために `@Transactional` のようなアノテーションを追加する必要があるとすれば、アプリケーション層のメソッドに付加して制御可能です。

### 集約 (aggregates)

集約は、リポジトリとファクトリーに依存する可能性があります。このサービスの実装では、集約にリポジトリやファクトリーの実装が注入されるようになっています。

```java
package com.mamezou_tech.example.domain.aggregate;

import com.mamezou_tech.example.domain.domainevent.HelloEvent;
import com.mamezou_tech.example.domain.entity.HibernationPod;
import com.mamezou_tech.example.domain.factory.HelloEventFactory;
import com.mamezou_tech.example.domain.repository.HelloEventRepository;

public class HelloEvents {

    private final HelloEventFactory helloEventFactory;

    private final HelloEventRepository helloEventRepository;

    public HelloEvents(HelloEventFactory helloEventFactory, HelloEventRepository helloEventRepository) {
        this.helloEventFactory = helloEventFactory;
        this.helloEventRepository = helloEventRepository;
    }

    public HelloEvent publishEvent(final HibernationPod hibernationPod) {
        HelloEvent helloEvent = helloEventFactory.create(hibernationPod);
        helloEventRepository.save(helloEvent);
        return helloEvent;
    }
}
```

例にあげた「発行済イベント集約 (HelloEvents)」のインスタンス化は、アプリケーション層の次のようなコードです。

```java
    public HelloService(@Autowired HelloEventFactory helloEventFactory, HelloEventRepository helloEventRepository) {
        HelloEvents helloEvents = new HelloEvents(helloEventFactory, helloEventRepository);
        this.passengers = new Passengers(helloEvents);
    }
```

### ドメインイベント (domain-events)

ドメインイベントは、集約を通してイベントを生成し、集約を通じて発行 (publish) します。

### エンティティ (entities)

新しいエンティティは、直接、集約またはファクトリーを通して生成します。データベース等にある既存のエンティティは、集約またはリポジトリを通して取得します。

### バリューオブジェクト (value-objects)

バリューオブジェクトは、直接、集約またはファクトリーを通して生成、取得します。

### ファクトリー (factories)

インフラストラクチャー層の実装が必要な場合、ドメイン層では `interface` として定義して依存性注入パターンを適用します。

### リポジトリ (repositories)

インフラストラクチャー層の実装が必要な場合、ドメイン層では `interface` として定義して依存性注入パターンを適用します。

## まとめ

この記事のコード全体は [GitHub リポジトリ](https://github.com/edward-mamezou/use-openapi-generator/tree/feature/openapi-generator-4) にあります。

## 参考

- [Spring Integration](https://spring.io/projects/spring-integration)
- [ドメイン駆動設計のコンテキストマップ](https://developer.mamezou-tech.com/blogs/2022/04/21/context-map/)
- [実践ドメイン駆動設計](https://www.amazon.co.jp/dp/479813161X/)
- [エリック・エヴァンスのドメイン駆動設計](https://www.amazon.co.jp/dp/4798121967/)

## 過去の記事

- [OpenAPI Generator を使って Spring Boot アプリを作る](/blogs/2022/06/04/openapi-generator-1/)
- [OpenAPI Generator を使って Spring Boot アプリを作る (2)](/blogs/2022/06/09/openapi-generator-2/)
- [OpenAPI Generator を使って Spring Boot アプリを作る (3)](/blogs/2022/06/17/openapi-generator-3/)
