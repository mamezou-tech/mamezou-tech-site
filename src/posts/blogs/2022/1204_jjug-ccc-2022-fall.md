---
title: JJUG CCC 2022 Fall
author: shigeki-shoji
date: 2022-12-04
tags: [advent2022]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---

これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第4日目の記事です。

11月27日にオフラインとオンラインのハイブリッドで [JJUG CCC 2022 Fall](https://ccc2022fall.java-users.jp/) が開催されました。春と秋に開催される JJUG CCC では COVID-19 パンデミック以来久しぶりのハイブリッド開催となりました。

:::info:JJUGとは
日本 Java ユーザグループ ([JJUG](https://www.java-users.jp/page/about/)) は、2007年4月に発足した Java 技術の向上・発展、開発者の支援を目的とした任意団体です。
:::

私は、会場でスタッフとして参加させていただきました。といってもほぼ受付に座っていることがメインで、その間アンカファレンスや手持ちの端末で気になるトラックを視聴していました。

ここで特に興味深く感じた 2 つのセッションを紹介します。ただし、これはあくまでも私個人の趣向ですので、その点ご了承ください。

1つ目は、C トラックの数村憲治さんによる「[コンテナ環境でのJava技術の進化](https://youtu.be/nJJHSwywei0)」です。

私はクラウドを活用したマイクロサービスアーキテクチャの導入支援に携わっていることもあって、コンテナやサーバレスでの Java に関心があります。

JJUG CCC 2022 Fall からしばらくして開催された AWS re:Invent 2022 で [AWS Lambda SnapStart](https://aws.amazon.com/jp/blogs/news/new-accelerate-your-lambda-functions-with-lambda-snapstart/) が発表されました。これはセッション中にあった「CRaC」の技術を使っているようです。

12月2日の「[CRaCによるJavaの高速化](/blogs/2022/12/02/jdk-crac/)」にも書かれていますが、[AWS Compute Blog](https://aws.amazon.com/jp/blogs/compute/reducing-java-cold-starts-on-aws-lambda-functions-with-snapstart/) の記事中 Runtime hook のところで説明されています。

2つ目は、C トラックのもちださんの「[バーチャルスレッド詳細](https://youtu.be/MawoXHB40NA)」です。

クラウドコンピューティングではイベント駆動アーキテクチャを採用するケースが多く、スループットを高めるためにノンブロッキング処理を多用する傾向があります。

## おわりに

[公開動画一覧](https://www.youtube.com/playlist?list=PLy44EKO1L0eIl0VIYmGXk9635j6QQ7cF0) をトラック別に下の表に整理しました。

アンカンファレンスや一部のセッションは公開されていませんが、皆さんもぜひ興味のあるセッションをご覧いただければと思います。

A トラック:
| Title / Speaker |
|:---|
| [非Javaエンジニアが「プロになるJava」で再勉強した話](https://youtu.be/r1r6VEgfVb4)<br><br>白栁隆司さん |
| [Git 未経験者が GitHub Actions で CI CD できるようになるまで](https://youtu.be/TuQcYJwQ3Q4)<br><br>浅野正貴さん |
| [LINE NEWSにおけるJava移行の5年間の歩みとこれから](https://youtu.be/XTvxIIyrNM4)<br><br>LINE<br>森藤賢司さん |
| [入門：テスト技法とJUnit](https://youtu.be/_7nkOxyO4fU)<br><br>多田真敏さん |
| [未来を見据えた CI CD ～ 10年後も使える ビルド・テスト パイプライン ～](https://youtu.be/msC04lnwKXA)<br><br>カサレアル<br>野中翔太さん |
| [組織と技術の両輪で開発を加速させるkintoneチームの取り組み](https://youtu.be/9-XGMnYbDt4)<br><br>サイボウズ<br>濵田 健さん |
| [Maven Puzzlers](https://youtu.be/1zF8dWt4-Zs)<br><br>Andres Almiray さんと Ixchel Ruiz さん |

B トラック:
| Title / Speaker |
|:---|
| [AWS環境におけるSpring BootアプリケーションのCI CDをCircleCIで構築した話](https://youtu.be/c-mb_17nIYs)<br><br>篠原正太さん |
| [ミリ秒で起動するFullplatformのアプリケーションサーバー・Liberty InstantOnでクラウドネイティブにひろがるJakarta EEの世界](https://youtu.be/HCapZiK-D8k)<br><br>IBM<br>田中孝清さん |
| [Spring BootとKubernetesで実現する今どきのDevOps入門](https://youtu.be/gt9hlokbiIc)<br><br>佐藤靖幸さん |
| [gaugeで学ぶ実行可能ドキュメントの価値](https://youtu.be/ykIj8IKBgns)<br><br>シンプレックス<br>清家蒼一朗さん |
| [5年ぶりのメジャーアップデート! Spring Framework 6 Spring Boot 3](https://youtu.be/tnq4NBrlhHY)<br><br>槙俊明さん |
| [Jaegerによる分散トレーシングの実践～マイクロサービスのボトルネック解消～](https://youtu.be/V3A_87dYH6o)<br><br>ウルシステム<br>内田理絵さん |
| [Persistence made easy with Jakarta Data NoSQL](https://youtu.be/5FOK1WvJyMU)<br><br>Karina Varela さんと Otavio Santana さん |

C トラック:
| Title / Speaker |
|:---|
| [バーチャルスレッド詳細](https://youtu.be/MawoXHB40NA)<br><br>もちださん |
| [MicrosoftBuildOpenJDKをコンテナ環境で利用する際のベスト・プラクティス](https://youtu.be/jYQ5zu5cbkU)<br><br>マイクロソフト<br>てらだよしおさん |
| [コンテナ環境でのJava技術の進化](https://youtu.be/nJJHSwywei0)<br><br>数村憲治さん |
| [ユーザー数100万人規模の事業成長を止めずに、レガシーコードと戦う](https://youtu.be/QCluKNE6th0)<br><br>ビズリーチ<br>菊池信太郎さん |
| [FizzBuzzで学ぶJava 7以降のJavaの進化](https://youtu.be/aVxwcB652fc)<br><br>河野裕隆さん |
| [Fargate上のJVMからCPUを認識するまで 〜正しく認識されないCPUの謎を追え〜](https://youtu.be/d2eNNMgIwL0)<br><br>orekyuu さん |
| [Red Hat Application Foundationsから学ぶアーキテクチャー入門](https://youtu.be/LBwv5yO3JY0)<br><br>レッドハット<br>瀬戸智さん |
| [Helidon Reactive vs Blocking Níma](https://youtu.be/Ued3NeQVCnI)<br><br>Dmitry Aleksandrov さん |

D トラック:
| Title / Speaker |
|:---|
| [MicroProfile JWTを使って、マイクロサービスをセキュアにしよう](https://youtu.be/EW5L9EEEvGI)<br><br>高宮裕子さん |
| [カード決済基幹システム　レガシーの克服と無停止更改の挑戦](https://youtu.be/XaMqU1-ra8Q)<br><br>GMO<br>羽鳥樹さん |
| [Java開発ツールのあれこれ ～便利そうなツールを色々集めてみた～](https://youtu.be/nXR-wF8WKxQ)<br><br>テクマトリックス<br>大城夏樹さん |
| [脆弱性対応を支える技術](https://youtu.be/75hjH9Bnv_I)<br><br>梶紳之介さん |
| [非同期メッセージングサービスを使ったLINEメッセージ配信の改善](https://youtu.be/LzdYXODvKYw)<br><br>平井 一史さん |
| [クラウド時代のデータアクセス仮想化のススメ](https://youtu.be/kQFocfI2kZs)<br><br>CData Software Japan<br>疋田圭介さん |
| [PostgreSQL, The Time Series Database You Want](https://youtu.be/tI9XzfGJOTY)<br><br>Christoph Engelbert さん |
