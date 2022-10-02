---
title: 分散 IoT Hub プラットフォーム 
author: shigeki-shoji
date: 2021-12-30
tags: [iot, MQTT]
---

グローバルに展開する IoT プロダクトの場合、IoT デバイスとの通信のレイテンシーが非常に大きな課題となります。また、それぞれの地域で異なるセキュリティポリシーの課題もあり、可能な限りデバイスに近接したロケーションで処理を行い、中央との通信をフィルターし、通信量の低減も求められます。

AI の領域では、2021年11月8日の QCon Plus での [Katharine Jarmul](https://plus.qconferences.com/plus2021/speakers/katharine-jarmul) 氏のセッション「[Machine Learning at the Edge](https://plus.qconferences.com/plus2021/presentation/machine-learning-edge)」で説明されたように、連合機械学習 (Federated Machine Learning) によって、エッジデバイスで低レイテンシーな ML を実現することも可能となってきました。

マイクロサービスの領域では、2021年11月23日の [Alaa Tadmori](https://www.infoq.com/profile/Alaa-Tadmori/) 氏の記事「[Microservices — the Letter and the Spirit](https://www.infoq.com/articles/microservices-concepts-patterns/)」や2020年9月3日の [Paulo Merson](https://www.infoq.com/profile/Paulo-Merson/) 氏の記事「[Principles for Microservice Design: Think IDEALS, Rather than SOLID](https://www.infoq.com/jp/articles/microservices-design-ideals/)」等で指摘されているように、イベント駆動の重要性が強調されています。

これらのことから、IoT Hub プラットフォームは、低レイテンシーを実現するために、各ロケーションと、グローバルな要件に対応した中央とに階層化された分散 IoT Hub プラットフォームを構築することが必要だろうと考えています。

それぞれのロケーションでは、下図のようなイベント駆動と HTTP や gRPC のための CDN で構成されたプラットフォームが配置されます。低レイテンシーな要件を処理するサービスが、エッジデバイス内または、各ロケーション内に実装され、稼働します。

![図1](/img/blogs/2021/1230-IoT.png)

そして、グローバルな要件のためのプラットフォームは中央ロケーションに Event Bus や Message Bus として配置され、そのプラットフォーム上でさまざまなサービスが実装され、実行されることになります。

![図2](/img/blogs/2021/1230-IoT2.png)

# 参考

* [Principles for Microservice Design: Think IDEALS, Rather than SOLID](https://www.infoq.com/jp/articles/microservices-design-ideals/)、[Paulo Merson](https://www.infoq.com/profile/Paulo-Merson/) 氏、2020年9月3日 
* [Microservices — the Letter and the Spirit](https://www.infoq.com/articles/microservices-concepts-patterns/)、[Alaa Tadmori](https://www.infoq.com/profile/Alaa-Tadmori/) 氏、2021年11月23日
* [Katharine Jarmul on Machine Learning at the Edge](https://www.infoq.com/news/2021/12/jarmul-ml-edge/)、[Anthony Alford](https://www.infoq.com/profile/Anthony-Alford/) 氏、2021年12月2日
