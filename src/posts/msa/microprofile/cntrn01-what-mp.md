---
title: 第1回 MicroProfileってなにそれ？ - MicroProfileの登場
author: toshio-ogiwara
date: 2022-03-02
tags: ["逆張りのMicroProfile"]
nextPage: ./src/posts/msa/microprofile/cntrn02-what-mp.md
---

連載初回となる今回はなにはともあれまずはMicroProfileそのものについて、概要から説明していきたいと思います。

Javaのエンタープライズの標準仕様はなんですか？と問われたら、みなさんはなにを頭に浮かべるでしょうか？そもそも「Javaのエンタープライズ」ってなんだよ？とは思いつつも、多くの方はJava EEもしくはJakarta EE、そしてもしかしたらJ2EEと言った単語を浮かべるのではないかと思いますが、いずれも正解です！

MicroProfileを語る上で標準であるJakarta EE（Java EE/J2EE）は切っても切り離せない関係にあります。ですので、MicroProfileの説明に行く前にまずは軽くJava EEのおさらいから始めたいと思います。

[[TOC]]

## Java EEの登場から今

Java EEは1999年12月にエンタープライズ向けのエディションとして当初はJ2EEとして世にでました。エンタープライズとは「業務システムを作る上で必要」となるWeb UIやDBアクセス、システム間連携、セキュリティなどの仕様をまとめたものとなります。このエンタープライズエディションは登場以来、APIの洗練化やRESTやJSONサポートなど、その中身は時代とともに少しずつ変わってきましたが、中身以外のところで大きな変化が2回ありました。

１つはJ2EEからJava EEへのエディション名の変更。J2SEがJava SEへ変わったのに伴い2006年リリースのJava EE 5からJ2EEの名称がJava EEへ変更されました。この際の変更はこの名称変更のみで、API仕様や仕様策定プロセス等に対する実質的な変更はなく、実に平穏なものでした。

そして次の大きな変更がJakarta EEへの変更となります。それまでJava EEに関する権利関係はOracleが保有していましたが、Javaのエンタープライズ分野におけるより一層の発展と円滑な仕様策定を目指し、Java EEの権利関係が非営利団体であるEclipse Foundationに寄贈、移管されました[^1]。また、これによりエディション名もJava EEからJakarta EE 8へ一新[^2]され、この名称以外にも次にあげる大きな変更がありました。

- Jakarta EEとしての成果物には`javax.*`のパッケージは利用できなくなったため、既存のAPIも含め、パッケージ名は`jakarta.*`へ変更する[^3]
- 仕様を策定、およびそれを管理する組織がOracleを中心としたJCPからオープンな非営利団体であるEclipse Foundationへ移管された


[^1]: ここではサラッと書いていますが、実際にはJavaの発展を願うコミュニティとOracleの間では激しいやり取りや議論がありました。この説明をすると本が1冊書けるくらいになるため、これ以上詳細は触れませんが、興味がある方はまずは[Jakarta EE設立趣意書](https://jakartaee-ambassadors.io/)辺りを見ていただくと当時の状況が分かるのではないかと思います。
[^2]: Jakarta EEへの変更はJava EE 9のリリース前に行われたため、Java EE 8とJakarta EE 8は実質的に同じものを指します。
[^3]: Jakarta EE 8は既にJava EE 8としてリリース済みであっため、`javax.*`がそのまま使われましたが、Jakarta EE 9以降は`jakarta.*`パッケージへの移行が段階的に進められ、次期バージョンのJakarata EE 10ではServlet APIなど既存APIも含めすべてのAPIが`jakarta.*`パッケージとなります。


## MicroProfileの背景

MicroProfileを一言で説明することは難しいため、ここではMicroProfile 1.0がリリースされた当時の時代背景と絡めてMicroProfileが目指すものや目的を説明させていただきます。

MicroProfile 1.0は2016年9月にリリースされましたが、この頃のエンタープライズJava界隈の状況は以下のようでした。

- Java EEの停滞
  - 2013年5月にJava EE 7がリリースされ、次のJava EE ８は当初2016年第3四半期にリリースとされていましたが、2016年の前半辺りからJava EE 8のリリース延期や代わり映えしない仕様などの噂[^4]が流れ始め、Javaの開発コミュニティからはOracleのリーダシップに対し強い非難と落胆の声が上がっていました
  - また、このJava EE 8の開発停滞がJakarta EEへの移管にも繋がります
- Cloudの台頭
  - 2010年代前半から提唱されていたマイクロサービスアーキテクチャがこの頃にはある程度一般化し、Cloudの利用を前提としたアーキテクチャが求められるようになってきました
  - そのような中、Java EE 7ではマルチテナンシーなどのクラウドサポート機能の取り込みが見送られた背景もあり、Java EEのクラウド対応の遅さが問題となってきていました

[^4]: 事実Java EE 8のリリースは当初の予定よりも約1年遅れ2017年9月にリリースされました。


## MicroProfileの登場

このように鈍足で時代に追従するのが難しくなってきたエンタープライズ向けJavaの状況を打破すべく、ベンダーやコミュニティ、有志ら[^5]によりEclipse Foundation内で立ち上げられたプロジェクトがMicroProfile Projectであり、そのProjectで策定された仕様がMicroProfile specification、つまり所謂「MicroProfile」となります。

MicroProfileプロジェクトの設立目的は[公式ページ](https://projects.eclipse.org/projects/technology.microprofile)で説明されていますが、私はこれを要約して下記のように理解しています[^6]。

> MicroProfile®プロジェクトは、マイクロサービスアーキテクチャ向けにエンタープライズJavaを最適化することを目的とし、Jakarta EEかを問わずJavaのエコシステムを活用しながらマイクロサービス向けの新しい共通APIと機能をオープンな環境で短いサイクルで提供してくことを目標にする

短いサイクルとマイクロサービスアーキテクチャと言う文言が含まれていることからも、明らかに当時のJava EEに対するアンチテーゼであったことが分かります。


[^5]: 当時の参加はRed Hat, IBM, Payara, Tomitribe およびロンドンJavaコミュニティとなっています。
[^6]: 原文はMicroProfileの公式プロジェクトページ: <https://projects.eclipse.org/projects/technology.microprofile>


### （コラム）MicroProfileのバージョンアップサイクル

プロジェクト設立時の目標の1つに短いサイクルでリリースしていくとありましたが、これが実際にどうなったかについて、ver3.1以降のリリース年表をもとに見てみたいと思います。

- リリース年表

| バージョン | リリース | 補足 |
| - | :-: | - |
|MicroProfile 5.0 | &nbsp;4Q/2021&nbsp; | Jakarta EE 9.1準拠の最初のリリース<br/>コード中のpackage名も`jakarta.*`に変更。機能的にはMicroProfile 4.1と同一|
|MicroProfile 4.1 | 3Q/2021 | Jakarta EE 8準拠のインクリメンタルリリース |
|MicroProfile 4.0 | 4Q/2020 | Jakarta EE 8準拠の最初のリリース<br/>依存するjarのartifact名だけをjakarta.*に変更 |
| MicroProfile 3.3 | 1Q/2020 | Java EE 8準拠の最後のリリース |
| MicroProfile 3.2 | 3Q/2019 | Java EE 8準拠のインクリメンタルリリース |
| MicroProfile 3.1 | 2Q/2019 | Java EE 8準拠のインクリメンタルリリース |


MicroProfileは予定機能がすべて揃った段階でリリースするfeature boxed releaseではなく、予定していた期間で出来たものをリリースするtime boxed releaseを基本とし、v1.1からv3.3のリリースはすべてクォーター(Quarter)ごと行われてきました。

ただ、年表から分かる通り、v3.3からv4.0とv4.0からv4.1の間は期間が3クォータ空いています。これはJakarta EEへの移行に時間が要したものと思われます。それでもJava EEのバージョンアップサイクルの3年～4年に比べれば十分短く、MicroProfileの目標に1つである短いサイクルでのリリースは、今のところ十分に達成されていると思います。

## まとめ - MicroProfileとはなにか

歴史背景も踏まえながらMicroProfileを説明してきましたが、結局のところMicroProfileはなにかを最後にまとめさせていただくと

- マイクロサービスアーキテクチャで必要となる標準APIや機能[^7]を提供する
- 標準APIや仕様の提供はJakarta EEや既に存在するJavaエコシステムを活用して行う
- 標準APIや仕様はオープンな環境[^8]で策定され、短い間隔でリリースされる

ことを目的にしたSpecification（仕様）のまとまりであり、その策定、管理を行うProject（組織）と考えています。

MicroProfileの目的や目指すところを理解していただいたところで、次回はMicroProfileの仕様や実装について見ていきたいと思います。

[^7]: 原文の”common APIs and functionality”を複数ベンダーが参加するプロジェクトにおける「共通」と言うことから、ここでは「標準API」と意訳しています。
[^8]: MicroProfileへの参加は、すべてのコミュニティ、企業、グループ、または個人に開かれています。

---
参照資料

- RedHat Developer blog: [MicroProfile - Collaborating to bring Microservices to Enterprise Java](https://developers.redhat.com/blog/2016/06/27/microprofile-collaborating-to-bring-microservices-to-enterprise-java)
- Oracle Technology Network Japan Blog: [Java EEからJakarta EEへ](https://blogs.oracle.com/otnjp/post/transition-from-java-ee-to-jakarta-ee-ja)
