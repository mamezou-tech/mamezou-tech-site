---
title: MicroProfileのサンプルリニューアル – 今度はほんとにMSA
author: toshio-ogiwara
date: 2023-05-24
tags: ["逆張りのMicroProfile"]
prevPage: ./src/posts/msa/microprofile/cntrn14-mp-faulttolerance3.md
---
MicroProfileを使ったサンプルアプリとして[「使った、作った、Helidonで！ - サンプルアプリの紹介」](/msa/mp/cntrn03-sampleapp-helidon/)記事で紹介したレンタル品予約システムはマイクロサービスアーキテクチャ(MSA)向けフレームワークであるMicroProfileを使ったサンプルアプリとして紹介していましたが、そのアーキテクチャは実はモノリス（良くいってモジュラーモノリス）でした。

この点が（本人以外は誰も気にしていないとはいえ）筆者としては少し心残りだったため[「逆張りのMicroProfile」](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)の連載が一段落したのを機会にサービスを分割し、次に示すマイクロサービスなアプリに一新しました。(MicroProfileとは関係ないですがフロントエンドにはReact+[MUI(Material UI)](https://mui.com/core/)をそこそこ本格的に使っています)

![overview](../../../img/mp/19-service-overview.drawio.svg)

このアプリはデモサイトで実際に動かして使えるようにしてますので、試したい方は[こちら](https://app.rms.extact.io)のリンクからどうぞ。

デモサイトはアプリの他にMP OpenAPIで生成されたOAS(OpenAPI Specification)情報をビジュアルに確認できるHelidon独自機能の[OpenAPI UI](https://api.rms.extact.io/openapi/)や[Jaeger](http://api.rms.extact.io:16686/)を使った分散トレースといったMSAでよく使うツールも一緒に動かして見られるようにしています。是非、いろいろ試していただければと思います。

:::alert: 構造はマイクロサービス、それお得ですか？
今回は既存アプリを分割してマイクロサービス化しているため、サービスが小さくなっていますが、実業務でこのような小粒度のサービスをマイクロサービス化することはお勧めしません。この場合、往々にしてマイクロサービスアーキテクチャによるメリットよりもデメリットの方が大きくなります。
:::

また、今回は動くものだけではなくサンプルアプリのアーキテクチャやMicroProfileの利用機能などを[こちら](https://github.com/extact-io/msa-rms-parent#readme)のGitHubのプロジェクトページでいろいろまとめています。特にMicroProfileを使った仕組みについては、それぞれの仕様ごとに次のような感じで

![github-capure](../../../img/mp/19-github-capture.drawio.svg)


「どこ」で「どのように」使っているかの説明に加えて、実際の該当コードの箇所や、デベロッパーサイトの関連記事も併せて紹介し、これまで紹介した[「逆張りのMicroProfile」](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)の総集編的な内容になっています。

この機会に動くコードと一緒に一読いただき、さらに理解を深めていただければと思います。
