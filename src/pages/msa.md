---
title: マイクロサービス
description: マイクロサービスアーキテクチャ(MSA)のチュートリアル・実践テクニック
---

マイクロサービスアーキテクチャは、大規模なシステムを構築する上で有力な選択肢となっています。ここでは、いくつかの実装技術による構築手法をご紹介します。

[[toc]]

## MicroProfile
[MicroProfile](https://microprofile.io/)は、2016年9月に誕生したエンタープライズマイクロサービス向けのプラットフォームです。
JavaEE(現JakartaEE)の仕様をベースとしつつも、マイクロサービスアーキテクチャに親和性の高い機能(JAX-RS, CDI, JSON-P等)に限定しています。

ここでは、そんなMicroProfileの導入や各機能の利用方法をご紹介します。


### 逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～
Javaによるエンタープライズ開発のフレームワークと言えばSpring Frameworkがデファクトで鉄板となっているこの昨今、唯一のメリットは標準と言う錦の御旗だけに見えるJava EEに起源を発するMicroProfileに注目し、そして敢えて世間の逆を本気で行き、結果「マイクロサービスのバックエンドならSpringよりもイケてるね！」の境地に達したSpring好き（だった）エンジニアがMicroProfileへの知見や感想をつづっていく連載ブログ

- [第1回 MicroProfileってなにそれ？ - MicroProfileの登場](/msa/mp/cntrn01-what-mp/)
- [第2回 MicroProfileってなにそれ？ - MicroProfileの仕様と実装](/msa/mp/cntrn02-what-mp/)
- [第3回 使った、作った、Helidonで！ - サンプルアプリの紹介](/msa/mp/cntrn03-sampleapp-helidon/)
- [第4回 使って分かった！お勧めMicroProfile仕様厳選3選](/msa/mp/cntrn04-spec-ranking/)
- [第5回 コードが仕様の源泉MicroProfile OpenAPI](/msa/mp/cntrn05-mp-openapi/)
- [第6回 お手軽便利MicroProfile Config](/msa/mp/cntrn06-mp-config/)
- [第7回 らくらくMicroProfile RestClient](/msa/mp/cntrn07-mp-restclient/)
  
～ 2022年秋以降連載再開予定 ～
- MicroProfile OpenTracingの機能と利用
- MicroProfile Fault Tolerance機能と利用
- MicroProfile Healthの機能と利用
- MicroProfile Metricsの機能と利用
- MicroProfile JWT Authを眺めてみる

（番外編）
- [Helidon Tips - SLF4J＋LogbackへのLogger切り替え](/msa/mp/ext01-helidon-logback/)
- [Helidon Tips - Helidon MP Testing with JUnit5を使ってみる](/msa/mp/ext02-helidon-testing/)
- [Helidon Tips - Helidon MicroProfile RestClientを使ったRESTリースのJUnitテスト](/msa/mp/ext03-helidon-rest-testing)
- Helidon Tips - Configuration Secretsを使ってみる(公開予定)
- Helidon Tips - CORS in Helidon MPを使ってみる(公開予定)
- Helidon Tips - Helidon Web Serverで知っておくと便利な設定(公開予定)
- Helidon Tips - Meta-configuration機能の紹介(公開予定)

番外編は随時公開していきますので、こうご期待

## Spring Boot
Javaでマイクロサービスを構築するならやはり[Spring Boot](https://spring.io/projects/spring-boot)は外せません。ここではSpring Bootを使った実装をご紹介します。

### OpenAPI Generator を使って Spring Boot アプリを作る
この連載では、宇宙船の冬眠ポッド (hibernation pod) を題材に [OpenAPI Generator](https://openapi-generator.tech/) を使ってサービスを構築します。

- [第1回 OpenAPI Generator を使って Spring Boot アプリを作る](/blogs/2022/06/04/openapi-generator-1/)
  - 最初に OpenAPI Generator を使った簡単なサービスを実装します。
- [第2回 OpenAPI Generator を使って Spring Boot アプリを作る](/blogs/2022/06/09/openapi-generator-2/)
  - ドメイン駆動設計の主に戦略的設計で活用するイベントストーミングと、サイドカーパターンを紹介します。
- [第3回 OpenAPI Generator を使って Spring Boot アプリを作る](/blogs/2022/06/17/openapi-generator-3/)
  - OpenAPI Generator のようなコード生成の活用でポイントとなる Generation Gap パターンについて説明します。
- [第4回 OpenAPI Generator を使って Spring Boot アプリを作る](/blogs/2022/06/24/openapi-generator-4/)
  - ドメイン駆動設計の戦術的設計によってサービスの実装を完成します。
- [OpenID Connect でパスワードレス認証を使う](/blogs/2022/06/23/webauthn-3/)
  - 番外編として、Keycloak [OpenID Connect](https://openid.net/specs/openid-connect-core-1_0.html) によるパスワードレス認証を利用する構成を説明します。 

## マイクロサービスの技術背景

- [サービスメッシュが解決しようとしている課題](/blogs/2022/05/17/servicemesh/)
