---
title: MicroProfileの仕様体系 - Umbrella仕様とStandalone仕様
author: toshio-ogiwara
date: 2023-01-21
tags: ["逆張りのMicroProfile"]
prevPage: ./src/posts/msa/microprofile/cntrn02-what-mp.md
nextPage: ./src/posts/msa/microprofile/cntrn03-sampleapp-helidon.md
---

MicroProfileはご存じのとおり、Jakarta EEをベースにマイクロサービスアーキテクチャで必要となるAPIや機能の提供を目的とした仕様ですが、この仕様には大きく2つの区分けがあります。

１つはUmbrella仕様と呼ばれるMicroProfileのコアプラットフォームに相当する仕様と、もう一つはStandalone仕様と呼ばれるオプショナルな仕様になります。（Umbrellaと名前が付いているのは恐らくMicroProfileのUmbrella(傘)の下の仕様という意味だと思われます）

執筆時における最新のMicroProfile 6.0のUmbrella仕様(左側の点線四角枠)とStandalone仕様は次のようになっています[^1]。
[^1]: [逆張りのMicroProfileの連載](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)は実装にHelidonを使っているため、説明はHelidonが準拠するMicroProfile 5.0をベースにしています。

![overview](../../../img/mp/18-spec-overview.drawio.svg)
引用元: [MicroProfile 6.0 - 22nd Dec, 2022 | Eclipse Foundation](https://docs.google.com/presentation/d/1zv84tq7SGRIpzPfxFQVAdVNT2jQvadjt/edit#slide=id.p8)

今回はこのMicroProfileの仕様体系について説明します。

:::column:連載の紹介
豆蔵デベロッパーサイトではMicroProfileをテーマに「[逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)」を連載しています。他の記事も是非どうぞ!
:::

## Umbrella仕様（コアプラットフォーム仕様）
MicroProfileはJakarta EEのようにマイクロサービスアーキテクチャで必要なる複数の仕様をセットとしてまとめたものですが、この中でも中核となる仕様がUmbrella仕様となります。

「セット」といっていることからも分かるとおり、Umbrella仕様はMicroProfile ConfigやMicroProfile OpenAPIなどといった個々のMicroProfile仕様を集約した仕様となり、その個々の仕様はコンポーネント仕様と呼ばれます。

このコンポーネント仕様を使ってUmbrella仕様を説明すると「Umbrella仕様はその仕様に含めるコンポーネント仕様とバージョンを定めたもの」となります。これは「JakartaEE 10のCoreProfileにはJakarta Contexts and Dependency Injection (CDI) 4.0やJakarta RESTful Web Services (JAX-RS) 3.1が含まれる」といったJakarta EEの仕様体系と同じ考えになっています。

また、MicroProfileはMicroProfile 4.0やMicroProfile 5.0などとバージョンを付けて呼ばれますが、この実体はUmbrella仕様とそのバージョンを指しているものとなります。

これら仕様体系の説明とは別にリリースプロセスの観点からUmbrella仕様を補足するとUmbrella仕様とそのコンポーネント仕様には次のことが規定されています。

- MicroProfile準拠の実装となるには、ベンダーはUmbrella仕様に含まれるすべての仕様を実装する必要がある
- Umbrella仕様がリリースされるとき、そこに含まれるすべてのコンポーネント仕様は相互運用可能でなければならない
- コンポーネント仕様は、破壊的変更を含むメジャー バージョンをいつでもリリースでき、包括的な仕様と調整する必要はない

Jakarta EEでは仕様間の取り決めや調整ごとがガチガチに決められているのに対し、MicroProfileのそれはかなり緩い印象を受けます。このことからもMicroProfileが俊敏性のある標準化を目指していることがうかがえます。

Umbrella仕様の説明は以上となります。長々と説明しましたがUmbrella仕様は一言でいうと単に「MicroProfileの必須仕様」ということだけです。

## Standalone仕様
MicroProfileの仕様が出来た当初はUmbrella仕様やStandalone仕様といった区分けはなく、すべてが今でいうUmbrella仕様に位置づけられていましたが、次のような背景からStandalone仕様がMicroProfile 3.3から設けられました。

- ベンダーはすべてのUmbrella仕様を実装しなければならい
- コアプラットフォームであるUmbrella仕様が大きくなりすぎて新しいMicroProfile仕様（コンポーネント仕様）を追加しづらい

このような背景から出来たのがStandalone仕様です。Standalone仕様に位置づけられたコンポーネント仕様はUmbrella仕様には含まれないため、ベンダーは必須で実装が求められるといったUmbrella仕様に対する縛りが発生しません。このため、それまでになかった新しい技術に対する仕様を取り入れるといったことが行いやすくなりました。

実際、現時点でStandalone仕様に位置づけられているものは冒頭の図にあるとおりで比較的新しめの技術に関するものとなっています。ここではその中からマイクロサービスならではの特徴的な仕様を3つほど簡単に紹介します。

- [MicroProfile Long-Running Actions (LRA)](https://download.eclipse.org/microprofile/microprofile-lra-2.0-RC1/microprofile-lra-spec-2.0-RC1.html)
  - 分散トランザクションのオーケストレーション方式によるSagaパターン実装に関する仕様
- [MicroProfile GraphQL](https://download.eclipse.org/microprofile/microprofile-graphql-2.0/microprofile-graphql-spec-2.0.html)
  - アノテーションベースによるGraphQLスキーマの生成とエンドポイントの公開や実行に関する仕様
- [MicroProfile Reactive Messaging](https://download.eclipse.org/microprofile/microprofile-reactive-messaging-3.0-RC2/microprofile-reactive-messaging-spec-3.0-RC2.html)
  - Apache Kafkaに代表されるリアクティブストリームを使用したメッセージ送受信に関する標準API仕様

Standalone仕様はいつまでもStandaloneでいるハズもないと思われるため、最終的にはUmbrella仕様かJakarta EE仕様に取り込まれるのではないかと思われます。

Standalone仕様の説明は以上となります。Standalone仕様も長々と説明しましたが、ここまでの話しから分かるとおり、これも一言でいうと単に「MicroProfileのオプション仕様」ということだけです。

## さいごに
[逆張りのMicroProfileの連載](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)ではUmbrella仕様の全8仕様中心に説明してきましたが、今後はStandalone仕様の説明も追加していこうと思います。

---
参照資料

- [What lurks behind the MicroProfile umbrella? -- MicroProfile standalone specifications](https://www.eclipsecon.org/2021/sessions/what-lurks-behind-microprofile-umbrella-microprofile-standalone-specifications)
- [MicroProfile/SpecVersioning | Eclipse Foundation](https://wiki.eclipse.org/MicroProfile/SpecVersioning)
- [Welcome standalone Eclipse MicroProfile specifications | Craftsmen](https://craftsmen.nl/welcome-standalone-eclipse-microprofile-specifications/)