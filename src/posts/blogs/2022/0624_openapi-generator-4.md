---
title: OpenAPI Generator を使って Spring Boot アプリを作る (4)
author: shigeki-shoji
date: 2022-06-24
tags: [java, "openapi-generator", "spring-boot", "spring-integration", DDD]
---

シリーズ4回目は [Spring Integration](https://spring.io/projects/spring-integration) を使うドメインイベントの発行 (publish) について説明します。

説明に入る前に「[Spring Boot と Apache Camel の統合](https://developer.mamezou-tech.com/blogs/2022/06/12/spring-boot-with-apache-camel-integration/)」の議論を受けて冬眠カプセルを冬眠ポッド (hibernation pod) へ、船員を旅行者 (passenger) へとユビキタス言語の変更等イベントストーミングの修正がありました。

![](https://github.com/edward-mamezou/use-openapi-generator/raw/feature/openapi-generator-4/event-storming/event-storming-2.png)

このサービスは、冬眠ポッドにドメインイベントを発行する [publish/subscribe](https://www.enterpriseintegrationpatterns.com/PublishSubscribeChannel.html) のために MQTT を使用します。MQTT は非常に軽量な代わりに [Kafka](https://kafka.apache.org/) のようなイベントストアを保持しません。つまり、購読者 (subscriber または consumer) が接続していない間に発行されるイベントは残らないということを意味します。

従ってイベントストーミングの見直しで、後で受信されなかったイベントの再発行を可能にするため「発行済みイベント」集約をこのサービスに持ちました。「[実践ドメイン駆動設計](https://www.amazon.co.jp/dp/479813161X/)」の説明でもドメインイベントの発行は集約を通しています。

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

「[エリック・エヴァンスのドメイン駆動設計](https://www.amazon.co.jp/dp/4798121967/)」で集約 (aggregate) と集約ルート (aggregate root) について説明されています。

ポイントは、「集約」はトランザクション整合性が守られる境界で、境界づけられたコンテキスト (bounded context) を横断するアクセスは集約ルートを介さなければならないということです。余談ですが、ここからの帰結として「ドメイン駆動設計」を採用し、複数の集約を横断する場合には「結果整合性」となります。

> 複数の集約にまたがるルールはどれも、常に最新の状態にあるということが期待できない。イベント処理やバッチ処理、その他の更新の仕組みを通じて、他の依存関係は一定の時間内に解消できる。


## 参考

- [Spring Integration](https://spring.io/projects/spring-integration)
- [ドメイン駆動設計のコンテキストマップ](https://developer.mamezou-tech.com/blogs/2022/04/21/context-map/)
- [実践ドメイン駆動設計](https://www.amazon.co.jp/dp/479813161X/)
- [エリック・エヴァンスのドメイン駆動設計](https://www.amazon.co.jp/dp/4798121967/)
