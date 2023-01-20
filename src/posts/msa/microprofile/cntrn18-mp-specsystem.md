---
title: MicroProfileの仕様体系 - Umbrella仕様とStandalone仕様
author: toshio-ogiwara
date: 2023-01-20
tags: ["逆張りのMicroProfile"]
prevPage: ./src/posts/msa/microprofile/cntrn02-what-mp.md
nextPage: ./src/posts/msa/microprofile/cntrn03-sampleapp-helidon.md
---
今回はMicroProfileの仕様体系について説明します。MicroProfileはご存じのとおり、Jakarta EEをベースにマイクロサービスアーキテクチャで必要となるAPIや機能を提供することを目的とした仕様ですが、この仕様には大きく2つの区分けがあります。

１つはUmbrella仕様と呼ばれるMicroProfileのコアプラットフォームに相当する仕様と、もう一つはStandalone仕様と呼ばれるオプショナルな仕様になります（Umbrellaと名前が付いているのは恐らくMicroProfileのUmbrella(傘)の下の仕様という意味と思われます）

執筆時における最新のMicroProfile 6.0のUmbrella仕様(左側の点線四角枠)とStandalone仕様は次のようになっています[^1]。
[^1]: [逆張りのMicroProfileの連載](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)は実装にHelidonを使っているため、個々のUmbrella仕様の連載はMicroProfile 5.0がベースになっています。

![overview](../../../img/mp/18-spec-overview.drawio.svg)
引用元: [MicroProfile 6.0 - 22nd Dec, 2022 | Eclipse Foundation](https://docs.google.com/presentation/d/1zv84tq7SGRIpzPfxFQVAdVNT2jQvadjt/edit#slide=id.p8)


## Umbrella仕様（コアプラットフォーム仕様）
MicroProfileはJakarta EEのようにマイクロサービスアーキテクチャで必要なる複数の仕様をセットとしてまとめたものですが、この中でも中核となる仕様がUmbrella仕様となります。

Umbrella仕様は「セット」といっていることからも分かるとおり、MicroProfile ConfigやMicroProfile OpenAPIなどといった個々のMicroProfile仕様を集約した仕様となりますが、この個々の仕様をコンポーネント仕様といいます。

そして、この用語を使ってUmbrella仕様を説明すると「Umbrella仕様はその仕様に含めるコンポーネント仕様とそのバージョンを定めたもの」となります。よって、仕様体系についても「JakartaEE 10のCoreProfileにはJakarta Contexts and Dependency Injection (CDI) 4.0やJakarta RESTful Web Services (JAX-RS) 3.1が含まれる」といったJakarta EEの体系と同じ考えになっています。

また、一般的にMicroProfile 4.0やMicroProfile 5.0などといった用語が使われますが、この実体はUmbrella仕様とそのバージョンとなります。

最後にMicroProfileの開発プロセスの面で仕様体系に関することに触れておくとUmbrella仕様とコンポーネント仕様に対しては次のことが規定されています。

- MicroProfile 準拠の実装となるには、ベンダーはUmbrella仕様のすべての仕様を実装する必要がある
- Umbrella仕様がリリースされるとき、そこに含まれるすべてのコンポーネント仕様は相互運用可能でなければならない
- コンポーネント仕様は、破壊的変更を含むメジャー バージョンをいつでもリリースでき、包括的な仕様と調整する必要はない

Jakarta EEが仕様間の取り決めや調整ごとがガチガチに決められているのに対して、MicroProfileの仕様間の変更はかなり緩い印象を受けます。このことからもMicroProfileが俊敏性のある標準化を目指していることが分かります。

ここまでで長々とUmbrella仕様について説明したため何やら難しく感じるかも知れませんが、Umbrella仕様を一言でいうと単に「MicroProfileの必須仕様」ということだけです。

## Standalone仕様
MicroProfileの仕様が出来た当初はUmbrella仕様やStandalone仕様といった区分けはなく、すべてが今でいうUmbrella仕様に位置づけられていましたが、MicroProfile 3.3からそれまでの仕様の位置づけとは別のStandalone仕様ができました。このStandalone仕様が登場した背景としては次のようなことがあります。

- MircoProfile準拠の実装となるためにベンダーはすべてのUmbrella仕様を実装しなければならい
- コア プラットフォームが大きくなりすぎて新しい MicroProfile 仕様（コンポーネント仕様）が追加しづらい

つまり、MicroProfileのランタイムベンダーからすればこれ以上実装が必須となる仕様が追加されるとその対応が必要なるのに加え、Umbrella仕様に含まれる仕様間では「すべてのコンポーネント仕様は相互運用可能でなければならない」というインテグレーションに関する対応も必要となるため、気軽に仕様を追加することができない状況になっていきました。これはベンダーにとっては当然ですが、利用者からしても好ましいことではありませんでした。

そこで出来たのがStandalone仕様です。Standalone仕様に含まれる仕様はMicroProfile ConfigなどといったMicroProfileのコンポーネント仕様の1つですが、Umbrella仕様には含まれないため、ベンダーは必須で実装しなればならないなどといったUmbrella仕様に対する縛りが発生しません。このため、それまでになかった新しい技術に対する仕様も試験的に取り入れるといったことが行いやすくなっています。

実際に現時点でStandalone仕様にとして位置づけられているものは冒頭の図にあるとおりで比較的新しめの技術に関するものとなっています。ここではその中からマイクロサービスならではの特徴的な仕様を3つほど簡単に紹介します。

- MicroProfile Long-Running Actions (LRA)
  - 分散トランザクションのオーケストレーション方式によるSagaパターンの仕様と実装
- MicroProfile GraphQL
  - アノテーションベースによるGraphQLスキーマの生成とエンドポイントの公開や実行に関する仕様
- MicroProfile Reactive Messaging
  - Apache Kafkaに代表されるリアクティブストリームを使用したメッセージ送受信に関する標準API仕様

Standalone仕様はいつまでもStandaloneでいるハズもないと思われるため、その出自の背景から最終的にはUmbrella仕様かJakarta EE仕様に取り込まれるのではないかと思われます。

Standalone仕様も長々と説明しましたが、ここまでの話しから分かるとおり一言でまとめるとこれも「MicroProfileのオプション仕様」ということだけです。

## さいごに
[逆張りのMicroProfileの連載](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)ではUmbrella仕様の全8仕様を説明してきました。今後はStandalone仕様の説明も追加していこうと思います。

---
参照資料

- [What lurks behind the MicroProfile umbrella? -- MicroProfile standalone specifications](https://www.eclipsecon.org/2021/sessions/what-lurks-behind-microprofile-umbrella-microprofile-standalone-specifications)
- [MicroProfile/SpecVersioning | Eclipse Foundation](https://wiki.eclipse.org/MicroProfile/SpecVersioning)
- [Welcome standalone Eclipse MicroProfile specifications | Craftsmen](https://craftsmen.nl/welcome-standalone-eclipse-microprofile-specifications/)