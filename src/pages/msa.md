---
title: マイクロサービス
description: マイクロサービスアーキテクチャ(MSA)のチュートリアル・実践テクニック
---

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

マイクロサービスを [Spring Boot](https://spring.io/projects/spring-boot) を使って実装方法を説明します。

### OpenAPI Generator
宇宙船の冬眠ポッド (hibernation pod) を題材に [OpenAPI Generator](https://openapi-generator.tech/) を使ってサービスを構築します。

- [第1回 OpenAPI Generator を使って Spring Boot アプリを作る](/blogs/2022/06/04/openapi-generator-1/)<br/>
  - 最初に OpenAPI Generator を使った簡単なサービスを実装します。
- [第2回 OpenAPI Generator を使って Spring Boot アプリを作る](/blogs/2022/06/09/openapi-generator-2/)
  - ドメイン駆動設計の主に戦略的設計で活用するイベントストーミングと、サイドカーパターンを紹介します。
- [第3回 OpenAPI Generator を使って Spring Boot アプリを作る](/blogs/2022/06/17/openapi-generator-3/)
  - OpenAPI Generator のようなコード生成の活用でポイントとなる Generation Gap パターンについて説明します。
- [第4回 OpenAPI Generator を使って Spring Boot アプリを作る](/blogs/2022/06/24/openapi-generator-4/)
  - ドメイン駆動設計の戦術的設計によってサービスの実装を完成します。

### Envoy Proxy
サイドカーの利用が多いプログラマブルな Proxy である [Envoy Proxy](https://www.envoyproxy.io/) を説明します。

- [S3 の静的 Web サイトをセキュアに Envoy でホスティング](https://developer.mamezou-tech.com/blogs/2022/03/26/hosting-a-static-website-using-s3-with-envoy-2/)
  - 「[S3 の静的 Web サイトを Envoy でホスティング](https://developer.mamezou-tech.com/blogs/2022/02/16/hosting-a-static-website-using-s3-with-envoy/)」から S3 バケットアクセスをセキュアにするため、Envoy Proxy から IAM 認証を使ったアクセスを説明します。
- [Envoy を使用して ID Token (OIDC) を検証する](https://developer.mamezou-tech.com/blogs/2022/02/20/envoy-authn/)
  - Envoy Proxy の [JWT 認証フィルタ](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/jwt_authn_filter)の使い方を説明します。
- [Envoy と Open Policy Agent を使用した認可](https://developer.mamezou-tech.com/blogs/2022/02/20/envoy-authz/)
  - Envoy Proxy の [認可フィルタ](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/ext_authz_filter) で [Open Policy Agent](https://www.openpolicyagent.org/) (OPA) を使用する方法を説明します。

### Keycloak
[Keycloak](https://www.keycloak.org/) を使った認証サービスを説明します。

- [WebAuthn でパスワードの無い世界へ](https://developer.mamezou-tech.com/blogs/2022/06/15/webauthn-1/)
  - Keycloak を [AWS Fargate](https://aws.amazon.com/jp/fargate/) にデプロイして、[FIDO2](https://fidoalliance.org/fido2/) (WebAuthn) によってパスワードレスに認証する構成を説明します。
- [Envoy Proxy による HTTPS Proxy](https://developer.mamezou-tech.com/blogs/2022/06/20/https-envoy-proxy/)
  - Envoy Proxy を使って、プライベートネット内にパスワードレスに認証する Keycloak の構成を説明します。
- [OpenID Connect でパスワードレス認証を使う](https://developer.mamezou-tech.com/blogs/2022/06/23/webauthn-3/)
  - Keycloak の永続化に PC のローカルストレージを使用し、[OpenID Connect](https://openid.net/specs/openid-connect-core-1_0.html) の認証を利用する構成を説明します。 
