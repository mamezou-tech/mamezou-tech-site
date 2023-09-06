---
title: 第4回 ドメイン層の実装とサービスの完成
author: shigeki-shoji
date: 2022-06-24
tags: [java, "openapi-generator", "spring-boot", "spring-integration", DDD, "実践マイクロサービス"]
---

[庄司](https://github.com/edward-mamezou)です。

シリーズ4回目は [Spring Integration](https://spring.io/projects/spring-integration/) を使うドメインイベントの発行 (publish) について説明します。

## ドメイン駆動設計 (DDD - Domain-driven design)

説明の前に「[Spring Boot と Apache Camel の統合](/blogs/2022/06/12/spring-boot-with-apache-camel-integration/)」の議論を受けて冬眠カプセルを冬眠ポッド (hibernation pod) へ、船員を旅行者 (passenger) へとユビキタス言語の変更等イベントストーミングの修正がありました。

![](https://github.com/edward-mamezou/use-openapi-generator/raw/v0.4.0/event-storming/event-storming-2.png)

このサービスは、冬眠ポッドにドメインイベントを発行する [publish/subscribe](https://www.enterpriseintegrationpatterns.com/PublishSubscribeChannel.html) のために MQTT を使用します。MQTT は非常に軽量な代わりに [Kafka](https://kafka.apache.org/) や [Amazon Kinesis](https://aws.amazon.com/jp/kinesis/) のようなイベントストアになりません。つまり、購読者 (subscriber または consumer) が接続していない間に発行されるイベントは残らないということを意味します。

従ってイベントストーミングの見直しで、後で受信されなかったイベントの再発行を可能にするため「発行済みイベント」集約をこのサービスに持ちました。「[実践ドメイン駆動設計](https://www.amazon.co.jp/dp/479813161X/)」でもドメインイベントの発行は集約を通しています。

イベントストーミングの成果をさらに「[Context Mapper](https://contextmapper.org/docs/home/)」ツールを使って[モデリング](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.4.0/context-map/example.cml)しました。

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

![](https://github.com/edward-mamezou/use-openapi-generator/raw/v0.4.0/out/src-gen/example_BC_ExampleContext/example_BC_ExampleContext.png)

「[エリック・エヴァンスのドメイン駆動設計](https://www.amazon.co.jp/dp/4798121967/)」に集約 (aggregate) と集約ルート (aggregate root) の説明があります。

ポイントは、「集約」はトランザクション整合性が守られる境界で、境界づけられたコンテキスト (bounded context) を横断するアクセスは集約ルートを介さなければならないということです。余談ですが、ここからの帰結として「ドメイン駆動設計」を採用し、複数の集約を横断する場合には「結果整合性」となります。

> 複数の集約にまたがるルールはどれも、常に最新の状態にあるということが期待できない。イベント処理やバッチ処理、その他の更新の仕組みを通じて、他の依存関係は一定の時間内に解消できる。
> 出典: [エリック・エヴァンスのドメイン駆動設計](https://www.amazon.co.jp/dp/4798121967/)

## イベントのフロー

このサービスの設計では、冬眠ポッドが開いて、挨拶の音声ファイルの生成をリクエストすると、音声ファイル生成が通知されるイベントIDをレスポンスします。

音声ファイルの URL は MQTT を通じて発行されるイベントに含まれます。冬眠ポッドの別の部分にあるオーディオプレーヤーコンポーネントが MQTT をサブスクライブして、自身のイベントの場合に生成された音声ファイルを再生します。

リクエストした音声ファイルがいつまでも届かない場合、冬眠ポッドは、リクエスト時のレスポンスで受け取ったイベントIDを使って再送を求める拡張が可能な設計になっています。

## Spring Integration

[Spring Integration](https://spring.io/projects/spring-integration/) は、ほとんどの[エンタープライズ統合パターン](https://www.enterpriseintegrationpatterns.com/) をサポートしています。別の記事で紹介した [Apache Camel](/blogs/2022/06/12/spring-boot-with-apache-camel-integration/) は Spring だけでなく Quarkus など他のフレームワークでも利用可能で、統合可能なコンポーネントも豊富にあります。

このサービスは Spring Boot バージョン 2.7.0 を採用しています。現在はまだ、このバージョンの Spring Boot に対応した Apache Camel が存在しないため、今回は Spring Integration を使うことにしました。

Spring Integration のドメイン固有言語 (DSL) を使って [MQTT ブローカーを定義](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.4.0/src/main/java/com/mamezou_tech/example/controller/configuration/HelloConfiguration.java#L30-L34) できます。

```java
    @Bean
    public IntegrationFlow getHibernationPodHelloFlow() {
        MqttPahoMessageHandler handler = new MqttPahoMessageHandler(brokerUrl, UUID.randomUUID().toString());
        handler.setDefaultTopic(defaultTopic);
        return flow -> flow.handle(handler);
    }
```

この定義を使用するときは、`@Autowired` 等を使う Spring による依存性注入 (DI) が必要です。Spring の DI コンテナに登録されるコンポーネントは、コード通りに生成されたインスタンスではなく、Spring の内部の仕組みでコードが付加されている場合があります。ここで定義した `IntegrationFlow` もその1つです。

注入された `IntegrationFlow` を使ってイベントを発行する[コード](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.4.0/src/main/java/com/mamezou_tech/example/infrastructure/repository/HelloEventRepositoryImpl.java)は次のようになります。

```java
    mqttOutbound.getInputChannel().send(message);
```

## レイヤードアーキテクチャ

2回目の[記事](/blogs/2022/06/09/openapi-generator-2/)で説明したときとドメイン層以外のレイヤー構成に変化はありません。以前はドメイン層を設けなかったため、アプリケーション層から直接インフラストラクチャー層を実行するようにしていました。

### インフラストラクチャー層

インフラストラクチャー層について少し補足します。[Amazon Polly](https://aws.amazon.com/jp/polly/) を使う[音声の合成](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.4.0/src/main/java/com/mamezou_tech/example/infrastructure/aws/Polly.java)、[mp3 から wave 形式への変換](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.4.0/src/main/java/com/mamezou_tech/example/infrastructure/audio/AudioConverter.java)、[MQTT へのイベント発行](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.4.0/src/main/java/com/mamezou_tech/example/infrastructure/repository/HelloEventRepositoryImpl.java)等が増えたため、インフラストラクチャー層内部もパッケージを分割しました。

ドメイン駆動設計はビジネスドメインにフォーカスして、ビジネスドメインをドメイン層に隔離します。

一方、組込みではリアルタイム制御など、エンタープライズアプリケーションでいうインフラストラクチャー層のウェイトが大きくなりやすいです。

冬眠ポッドや宇宙船制御システムでは、このインフラストラクチャー層にフォーカスして多層化が必要になるでしょう。

### ドメイン層の実装

複雑なロジック、再利用性の高いレイヤーを実装するコードは、Spring のようなフレームワークの寿命と合わせるべきではありません。ドメイン駆動設計でドメイン層を他のレイヤーと分離している場合は、このドメイン層のコードをライブラリにして、他のフレームワークでも利用できると考えています。

したがって、このサービスの実装では、ドメイン層のコードには Spring に依存するコードを含めていません。

ドメイン駆動設計を採用した場合、インフラストラクチャー層と結合しやすいデザインパターンは、ライフサイクルに分類される、集約、リポジトリ、ファクトリーです。エンティティは、この3つと関連する可能性があり、バリューオブジェクトは集約とファクトリーに関連する可能性があり、ドメインイベントは集約と関連する可能性があります。

これらのオブジェクトにインフラストラクチャー層の実装を注入しなければなりませんが、`@Autowired` などのアノテーションを使わずにアプリケーション層のコードで注入するようにしました。

外部からドメインへのアクセスは、集約ルートを通さなければならないというルールを前述しました。アプリケーション層はこの外部との境界に位置するレイヤーです。したがって、集約でトランザクション整合性を保つために `@Transactional` のようなアノテーションを追加する必要があるとすれば、アプリケーション層のメソッドに付加して制御できます。

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

新しいエンティティは、直接、集約、ファクトリーを通して生成します。このサービスにはありませんが、データベース等の既存のエンティティは、集約またはリポジトリを通して取得します。

### バリューオブジェクト (value-objects)

バリューオブジェクトは、直接、集約、ファクトリーを通して生成、取得します。

### ファクトリー (factories)

インフラストラクチャー層の実装が必要な場合、ドメイン層では `interface` として定義して依存性注入パターンを適用します。

### リポジトリ (repositories)

インフラストラクチャー層の実装が必要な場合、ドメイン層では `interface` として定義して依存性注入パターンを適用します。

:::stop
ドメイン駆動設計のリポジトリやエンティティと DAO や DTO は一般的に同じではありません。一般的にはインフストラクチャー層内のオブジェクトとしてのみ扱い、ドメイン層のインターフェースやエンティティに変換する実装をインフラストラクチャー層に別途作成して注入しなければなりません。

[Spring Data JDBC](https://spring.io/projects/spring-data-jdbc/) のドキュメントにはドメイン駆動設計との関係について、次のように説明しています。

>Spring Data repositories are inspired by the repository as described in the book Domain Driven Design by Eric Evans. One consequence of this is that you should have a repository per Aggregate Root. Aggregate Root is another concept from the same book and describes an entity which controls the lifecycle of other entities which together are an Aggregate. An Aggregate is a subset of your model which is consistent between method calls to your Aggregate Root.
>Spring Data JDBC tries its best to encourage modeling your domain along these ideas.

>Spring Data リポジトリは、Eric Evans氏の著書「Domain Driven Design」で説明されているリポジトリに触発されています。この結論の1つは、集約ルートごとにリポジトリが必要になることです。集約ルートは、同本の別のコンセプトであり、一緒に集約である他のエンティティのライフサイクルを制御するエンティティについて説明しています。集約はモデルのサブセットであり、集約ルートへのメソッド呼び出し間で (トランザクション) 整合性があります。
>Spring Data JDBC は、これらのアイデアに沿ってドメインのモデル化の奨励に最善を尽くしています。
:::

## まとめ

メッセージングに Spring Integration を使って、ドメイン駆動設計によるドメイン層を実装してサービスを完成させました。[次回](/blogs/2022/07/01/openapi-generator-5/)は、このサービスで採用している多層アーキテクチャ (Multi-tier Architecture) を実現するサイドカーパターンについて説明します。

この記事のコード全体は [GitHub リポジトリ](https://github.com/edward-mamezou/use-openapi-generator/tree/v0.4.0) にあります。

## 参考

- [エリック・エヴァンスのドメイン駆動設計](https://www.amazon.co.jp/dp/4798121967/)
- [エンタープライズ統合パターン](https://www.enterpriseintegrationpatterns.com/)
- [実践ドメイン駆動設計](https://www.amazon.co.jp/dp/479813161X/)
- [Spring Integration](https://spring.io/projects/spring-integration/)
- [ドメイン駆動設計のコンテキストマップ](/blogs/2022/04/21/context-map/)
- [Reactive Architecture(2): Domain Driven Design](https://academy.lightbend.com/courses/course-v1:lightbend+LRA-DomainDrivenDesign+v1/about)

## 関連記事

- [第1回 OpenAPI Generator を使ったコード生成](/blogs/2022/06/04/openapi-generator-1/)
  - 最初に OpenAPI Generator を使った簡単なサービスを実装します。
- [第2回 イベントストーミングとドメイン駆動設計の戦略的設計](/blogs/2022/06/09/openapi-generator-2/)
  - ドメイン駆動設計の主に戦略的設計で活用するイベントストーミングと、サイドカーパターンを紹介します。
- [第3回 OpenAPI Generator 利用時の Generation Gap パターンの適用](/blogs/2022/06/17/openapi-generator-3/)
  - OpenAPI Generator のようなコード生成の活用でポイントとなる Generation Gap パターンについて説明します。
- [第5回 Open Policy Agent とサイドカーパターンによる認可の実装](/blogs/2022/07/01/openapi-generator-5/)
  - サイドカーパターンで Open Policy Agent を使ってサービス全体を完成します。
