---
title: マイクロサービス
description: マイクロサービスアーキテクチャ(MSA)のチュートリアル・実践テクニック
icon: https://api.iconify.design/carbon/microservices-1.svg?color=%23730099&height=28
---

マイクロサービスアーキテクチャは、大規模なシステムを構築する上で有力な選択肢となっています。ここでは、いくつかの実装技術による構築手法をご紹介します。


## マイクロサービスパターン

- [サービスメッシュが解決しようとしている課題](/blogs/2022/05/17/servicemesh/)

## MicroProfile
[MicroProfile](https://microprofile.io/)は、2016年9月に誕生したエンタープライズマイクロサービス向けのプラットフォームです。
JavaEE(現JakartaEE)の仕様をベースとしつつも、マイクロサービスアーキテクチャに親和性の高い機能(JAX-RS, CDI, JSON-P等)に限定しています。

ここでは、そんなMicroProfileの導入や各機能の利用方法をご紹介します。


### 逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～
Javaによるエンタープライズ開発のフレームワークと言えばSpring Frameworkがデファクトで鉄板となっているこの昨今、唯一のメリットは標準と言う錦の御旗だけに見えるJava EEに起源を発するMicroProfileに注目し、そして敢えて世間の逆を本気で行き、結果「マイクロサービスのバックエンドならSpringよりもイケてるね！」の境地に達したSpring好き（だった）エンジニアがMicroProfileへの知見や感想をつづっていく連載ブログ

- 概要編
  - [MicroProfileってなにそれ？ - MicroProfileの登場](/msa/mp/cntrn01-what-mp/)
  - [MicroProfileってなにそれ？ - MicroProfileの仕様と実装](/msa/mp/cntrn02-what-mp/)
  - [MicroProfileの仕様体系 - Umbrella仕様とStandalone仕様](/msa/mp/cntrn18-mp-specsystem/)
- 導入編
  - [使った、作った、Helidonで！ - サンプルアプリの紹介](/msa/mp/cntrn03-sampleapp-helidon/)
  - [使って分かった！お勧めMicroProfile仕様厳選3選](/msa/mp/cntrn04-spec-ranking/)
  - [コードが仕様の源泉MicroProfile OpenAPI](/msa/mp/cntrn05-mp-openapi/)
  - [お手軽便利MicroProfile Config](/msa/mp/cntrn06-mp-config/)
  - [らくらくMicroProfile RestClient](/msa/mp/cntrn07-mp-restclient/)
- Umbrella仕様編
  - [MicroProfile Config 3.0へのキャッチアップ](/msa/mp/cntrn08-mp-config3/)
  - [MicroProfile OpenAPI 3.0の新機能と既存機能の比較](/msa/mp/cntrn09-mp-openapi3/)
  - [MicroProfile RestClient 3.0の確認と小技機能の紹介](/msa/mp/cntrn11-mp-restclient3/) 
  - [MicroProfile JWT Authがやってくれること・できること](/msa/mp/cntrn17-mp-jwt/)
  - [MicroProfile Healthの機能と利用](/msa/mp/cntrn10-mp-health/)
  - [MicroProfile Metricsの機能と利用](/msa/mp/cntrn15-mp-metrics/)
  - [MicroProfile OpenTracingとJaegerで理解する分散トレーシング](/msa/mp/cntrn16-mp-tracing/)
  - [MicroProfile Fault Tolerance(1) - 例で理解する基本機能編](/msa/mp/cntrn12-mp-faulttolerance1/)
  - [MicroProfile Fault Tolerance(2) - 例で理解する非同期編](/msa/mp/cntrn13-mp-faulttolerance2/)
  - [MicroProfile Fault Tolerance(3) - 例で理解する設定編](/msa/mp/cntrn14-mp-faulttolerance3/)
  - [MicroProfileのサンプルリニューアル – 今度はほんとにMSA](/msa/mp/cntrn19-mp-sample-renewal/)<span style="color: red;">★NEW★</span>
- Standalone仕様編
  - 今後、順次追加予定！

- （番外編）
  - [Helidon Tips - SLF4J＋LogbackへのLogger切り替え](/msa/mp/ext01-helidon-logback/)
  - [Helidon Tips - Helidon MP Testing with JUnit5を使ってみる](/msa/mp/ext02-helidon-testing/)
  - [Helidon Tips - Helidon MicroProfile RestClientを使ったRESTリソースのJUnitテスト](/msa/mp/ext03-helidon-rest-testing)

## Spring Boot
Javaでマイクロサービスを構築するならやはり[Spring Boot](https://spring.io/projects/spring-boot)は外せません。ここではSpring Bootを使った実装をご紹介します。

### Spring Boot による実践マイクロサービス開発
この連載では、宇宙船の冬眠ポッド (hibernation pod) を題材に [OpenAPI Generator](https://openapi-generator.tech/) を使ってサービスを構築します。

- [第1回 OpenAPI Generator を使ったコード生成](/blogs/2022/06/04/openapi-generator-1/)
  - 最初に OpenAPI Generator を使った簡単なサービスを実装します。
- [第2回 イベントストーミングとドメイン駆動設計の戦略的設計](/blogs/2022/06/09/openapi-generator-2/)
  - ドメイン駆動設計の主に戦略的設計で活用するイベントストーミングと、サイドカーパターンを紹介します。
- [第3回 OpenAPI Generator 利用時の Generation Gap パターンの適用](/blogs/2022/06/17/openapi-generator-3/)
  - OpenAPI Generator のようなコード生成の活用でポイントとなる Generation Gap パターンについて説明します。
- [第4回 ドメイン層の実装とサービスの完成](/blogs/2022/06/24/openapi-generator-4/)
  - ドメイン駆動設計の戦術的設計によってサービスの実装を完成します。
- [第5回 Open Policy Agent とサイドカーパターンによる認可の実装](/blogs/2022/07/01/openapi-generator-5/)
  - サイドカーパターンで Open Policy Agent を使ってサービス全体を完成します。

（番外編）
- [Spring Boot と Apache Camel の統合](/blogs/2022/06/12/spring-boot-with-apache-camel-integration/)
  - Spring Boot でエンタープライズインテグレーションパターン (EIPs) を活用するため Apache Camel との統合について説明します。
- [OpenID Connect でパスワードレス認証を使う](/blogs/2022/06/23/webauthn-3/)
  - Keycloak [OpenID Connect](https://openid.net/specs/openid-connect-core-1_0.html) によるパスワードレス認証を利用する構成を説明します。 

## 非同期メッセージング
マイクロサービスアーキテクチャで使われるプロセス間通信には REST や gRPC のような一対一の同期的通信だけでなく、一対多の非同期なメッセージングによる通信もあります。ここでは、非同期メッセージングのテクノロジーについてご紹介します。

### Kafka
Apache Kafka は publish/subscribe 型のメッセージングプラットフォームです。Kafka についてのブログ記事をピックアップしました。

- [Debezium によるチェンジデータキャプチャー](/blogs/2022/02/28/debezium-cdc/)
- [Strimzi - Kubernetes で Kafka を運用するための Operators](/blogs/2022/05/25/strimzi-kafka-operators/)
- [Knative EventingのKafka BrokerでリトライとDead Letter Sink（DLS）を試す](/blogs/2022/09/13/knative-broker-dls/)
- [Kafka を Java のテストプロセスに埋め込める EmbeddedKafka でコンシューマーをテストする](/blogs/2022/10/08/kafka-consumer-test-with-embeddedkafka/)
- [Kafka の Web UI を提供する kafka-ui を試す](/blogs/2023/01/05/kafka-ui/)
- [Spring Boot で作る Kafka Streams アプリケーション](/blogs/2023/01/23/kafka-streams-spring-boot-app/)
- [Kafka Streams パイプラインを迅速に作成できる ksqlDB を触ってみる](/blogs/2023/02/16/ksqldb/)

### AsyncAPI
非同期メッセージングによる API 仕様を定義した AsyncAPI に関する記事です。

- [イベント駆動アーキテクチャ時代の非同期 API 業界標準 AsyncAPI とそのエコシステム](/blogs/2023/08/21/asyncapi-and-ecosystem/)
