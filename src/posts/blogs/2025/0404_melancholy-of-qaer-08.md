---
title: 品質保証者の憂鬱「IPA(独立行政法人 情報処理推進機構)書籍・刊行物探訪 - ソフトウェア開発データ白書 その１」
author: shuichi-takatsu
date: 2025-04-04
tags: [品質保証, QA, IPA, ソフトウェア開発データ白書]
image: true
---

IPA（アイ・ピー・エー）は「独立行政法人情報処理推進機構（Information-technology Promotion Agency, Japan）」の略称です。
日本のIT分野の発展を目的とした独立行政法人です。
（会社・組織によってはIPAを「アイ・パ」と発音するところもあるようです）

仕事柄、ソフトウェア品質関連の資料を読む機会が多く、IPAから発行されている書籍・刊行物にはよくお世話になっています。

以降、独立行政法人情報処理推進機構(IPA)のことは単に「IPA」と表記します。

IPAから発行されている書籍・刊行物については[こちら](https://www.ipa.go.jp/publish/index.html)で確認できます。
書籍・刊行物の多くは上記のIPAのサイトからダウンロードできますが、最新刊や既にサイト上での公開が無くなったものを取得したい場合は、紙媒体や電子書籍で購入する必要があります。
[Amazon](https://www.amazon.co.jp/s?i=stripbooks&rh=p_27%3A%25E7%258B%25AC%25E7%25AB%258B%25E8%25A1%258C%25E6%2594%25BF%25E6%25B3%2595%25E4%25BA%25BA%25E6%2583%2585%25E5%25A0%25B1%25E5%2587%25A6%25E7%2590%2586%25E6%258E%25A8%25E9%2580%25B2%25E6%25A9%259F%25E6%25A7%258B&s=relevancerank&text=%E7%8B%AC%E7%AB%8B%E8%A1%8C%E6%94%BF%E6%B3%95%E4%BA%BA%E6%83%85%E5%A0%B1%E5%87%A6%E7%90%86%E6%8E%A8%E9%80%B2%E6%A9%9F%E6%A7%8B&ref=dp_byline_sr_book_1)なんかで購入することができるようです。（Kindle版はかなり安価なので購入して読んでみてもいいかもしれません）

今回は書籍・刊行物探訪の1回目ということで、私が昔から親しんで(？)きた「ソフトウェア開発データ白書」を紹介しつつ、私の知らない部分・理解が至っていない部分を探訪していきたいと思います。
まずはIPAのサイトを探索しながら、その生い立ちを含めて探っていきたいと思います。

## ソフトウェア開発データ白書 とは

[ソフトウェア開発データ白書](https://www.ipa.go.jp/archive/publish/wp-sd/wp-sd.html)は、IPAのサイト上で以下のように説明されています。

|グローバル化の急速な進展に伴って厳しさを増すITシステム、とりわけソフトウェア開発の品質、コスト、納期に関する要求に応え、高品質のソフトウェアを効率的に開発するためには、要求や実績を数値化し、数値データを用いた実績との比較に基づいた目標設定や進捗管理など（ベンチマーキング）を行う、定量的プロジェクト管理が重要です。情報システムの品質および信頼性の向上を目指して、ソフトウェア開発や運用に関わるデータを継続的に収集・分析するとともに、定量データのさらなる活用を促進すべく、その普及活動を推進しています。|
|:-|

（出典：「IPA ソフトウェア開発データ白書について」より）

ソフトウェア開発を行っている会社・組織では、ソフトウェア製品・サービスの品質について、何らか形で定量データを収集していると思います。
データを収集したときに「このデータが示す数値（メトリクス）って、世間一般で見たときに、どれくらいの位置（品質）にあるのだろうか？」って思うことが多々あると思います。
自社内で利用できるベンチマークを取っている会社って、そんなに多くないんじゃないかと思っています。
そんな時に利用できる有用なデータ集がこの「ソフトウェア開発データ白書」です。

今まで私がソフトウェア開発データ白書を使うときは、必要な項目のみパラパラと広辞苑的に閲覧する程度でしたが、今回は少しじっくりと読み進めていきたいと思います。
じっくり読み進めていけば、IPAが発行している他の書籍・刊行物との関わりも見えてくると思います。

以降、「ソフトウェア開発データ白書」のことは単に「データ白書」もしくは「白書」（他の「情報セキュリティ白書」や「AI白書」「DX白書」などの”白書系”と混同しないことがはっきりしている場合）と表記します。
また、データ白書には年毎に何冊か発行されているので、特に指定が無い限り「2018-2019年版」を意味するものとします。

## データ白書の入手

データ白書は[ここ](https://www.ipa.go.jp/archive/publish/wp-sd/download.html)からPDF版をダウンロードすることができます。

昔、東京ビックサイトで開催されていた展示会のIPAブースや、IPA主催のセミナーなどで、データ白書の書籍版を無料で配布してくれていたのですが、過去の某政党が実施した事業仕分け（国や地方自治体が行っている行政サービスの必要性や実施主体について、予算の項目ごとに議論する作業）の結果、無料での配布をしなくなってしまったようです。
（私がセミナー参加時に、IPAの担当者がセミナー壇上から”お詫び”という形で報告がありました）

PDFが好きになれない人は、IPAサイト内やAmazonとかから紙媒体版が売りにだされているようなので、紙媒体が好きな方はそちらで購入してもいいでしょう。

ダウンロードページに「使用条件」が書かれていますので、使用前に確認した方がいいでしょう。

## データ白書の種類

データ白書には書籍の種類として以下の4種類があります。（2016年版以前は1冊にまとまっていますが、冊子内に書かれている業種の分類は同じだと思います）
- 本編
- 金融保険業編
- 情報通信業編
- 製造業編

本編はいいとして、データ白書の「業種分類」って何をもとにして分類したんだろうって疑問に思いませんか？
IPAのことなので、勝手に分類したってことは無いと思います。
そう思って辿っていくと、Q&Aに[次のように](https://www.ipa.go.jp/archive/publish/wp-sd/qa.html#chap15)書かれていました。

![](https://gyazo.com/4779ff7cabef37ec98f30ca53b13570d.png)
（出典：「「ソフトウェア開発データ白書」シリーズに関するよくある質問と回答」より）

さて、業種の分類方法としては分かったとして、なぜ「金融保険業」「情報通信業」「製造業」しか分冊がないのか？

データ白書のなかに、その答えらしきものがありました。
データ白書の「収集データのプロファイルの概要」欄に「業種」が記載されており、そこには

![](https://gyazo.com/7acc06a7220dc03cf0e543346217c96d.png)

とあります。
（出典：「データ白書2018-2019 図表4-1 収集データのプロファイルの概要」より）

なるほど、この3業種を押さえておけば、プロファイリングとしては十分と判断したのでしょう。
それにしても、金融・保険業が全体の3分の1を占めていたとは驚きです。
自分としてはもっと製造業や情報通信業の割合が多いのかと思っていました。

## データ提供企業と対象プロジェクト数

では、どんな企業のデータが分析・収録されているのでしょうか？
データ白書に掲載されていた企業名は以下のような企業でした。

![](https://gyazo.com/c86ef62005e0456c5f90814ebca2160b.png)
（出典：「データ白書2018-2019 データ提供企業一覧」より）

また、対象プロジェクト数については、データ白書の表紙に以下のように記載されています。

![](https://gyazo.com/6c1f465bf2e7cc0eec02c91ab0ad2dfb.png)
（出典：「データ白書2018-2019 表紙」より）

データ白書2018-2019の段階で、上記の34企業から 4,564個ものプロジェクトのデータを集めたようです。

ちなみに、データ白書2005年版の時には、企業数は15社、プロジェクト数は1000程度でした。
企業数、プロジェクト数ともに着実に増えていったことがわかります。

## エンタープライズ系・組込み系

上記に記載したデータ白書はいずれもエンタープライズ系のものです。
データ白書の収集データについて、データ白書の中で以下のように説明されていました。
|対象となったプロジェクトは、汎用コンピュータ（組込みソフトウェアの対象と対比してこのような呼び方をした）上で動作するアプリケーションソフトウェアやシステムを開発するプロジェクトである|
|:-|

（出典：「データ白書2018-2019 データ収集ついて」より）

きっと読者の中には「組込み系のデータ白書は無いのか？」って思った方もいるでしょう。
実は「組込み系」についてのデータ白書も存在します。
IPAサイト内のリンクがちょっと辿りづらいのですが、[組込みソフトウェア開発データ白書2019](https://www.ipa.go.jp/archive/digital/iot-en-ci/teiryou/kumikomi-hakusho2019.html)がアーカイブとして公開されています。
組込み系のデータ白書を見ると、データの提供企業は15社、データ数は599件と記載されていました。
エンタープライズ系に比べて圧倒的に数が少ないようです。
またデータを提供した企業名などは見つけられませんでした。

エンタープライズ系のデータ白書には長い歴史があります。
最初のデータ白書は2005年から始まり、2019年を最後にして最新刊は発行されていないように見えます。
これらは今でもIPAのサイトからすべてのPDFがダウンロード可能です。

それに対して組込み系データ白書は2019年版のみ公開されています。
組込み系データ白書の書籍は過去に2015年版、2017年版が公開されたようなのですが、現在IPAのサイト上で発見することができませんでした。

## なぜアーカイブなのか？

エンタープライズ系も組込み系もデータ白書は既に全てがアーカイブ扱いです。
その理由は[こちら](https://www.ipa.go.jp/digital/software-survey/metrics/index.html)に書かれていました。

|2020年から書籍版「ソフトウェア開発データ白書」の名称を「ソフトウェア開発分析データ集」に変更し、これまでに収集した5,546プロジェクトの定量データからソフトウェアの信頼性を中心に分析しています。また本編とは別に業種編3編、サマリー版、マンガ解説版、グラフデータも公開しています。|
|:-|

（出典：「ソフトウェア開発分析データ集」より）

ソフトウェア開発データ白書、組込みソフトウェア開発データ白書は、IPAの「定量的プロジェクト管理の推進」事業の成果だったようです。
事業の活動ついては[こちら](https://www.ipa.go.jp/archive/digital/iot-en-ci/teiryou/teiryou.html)で確認できます。
上記のページの情報に「ISO/IEC 29155-1 Systems and software engineering Information technology project performance benchmarking framework Part 1: Concepts and definitions」という規格が載っています。
さすがIPAですね。こういった部分でもちゃんと国際規格を持ち出してきていました。
今後は「ソフトウェア開発分析データ集」に引き継がれるとのことなので、「ソフトウェア開発分析データ集」についてはまた別の機会に探索したいと思います。

## ここまでのまとめ

ここまで ソフトウェア開発データ白書とその他の書籍との関係や、現在のデータ分析事情や、「定量的プロジェクト管理の推進」事業の内容を見てきました。
膨大なデータ集なので、全部を一度に見切ることはできませんが、じっくりお付き合いいただければ幸いです。

<style>
img {
    border: 1px gray solid;
}
</style>
