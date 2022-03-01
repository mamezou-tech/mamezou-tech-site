---
title: 第3回 使った、作った、Helidonで！ - サンプルアプリの紹介
author: toshio-ogiwara
date: 2022-03-10
tags: ["逆張りのMicroProfile"]
prevPage: ./src/posts/msa/microprofile/cntrn02-what-mp.md
nextPage: ./src/posts/msa/microprofile/cntrn04-spec-ranking.md
eleventyExcludeFromCollections: true
---

[前回](/msa/mp/cntrn02-what-mp/)まではMicroProfile全体に関する軟らかめの話をさせていただきましたが、今回からはそれぞれの仕様でどのようなことができるのか？そしてそれはどのように使うのか？など、主に実装的な側面のお話をさせていただきます。

その初回となる今回は、まずは動くものを見ていただくと言う意味も含め、今後の説明でも利用させていただくサンプルアプリのご紹介とMicroProfile 実装として利用しているHelidonについて説明させていただきます。

なお、ご紹介させていただくサンプルアプリはMicroProfileの利用法や効果を確認するため、ある程度実践的かつ、それなり規模のアプリとなっています。MicroProfileに限らず参考にしていただける部分があればと思います。

[[TOC]]

## サンプルアプリの紹介
サンプルアプリはレンタル品を予約するシステム（レンタル品予約システム）を題材にしたアプリで、コードはGitHubで公開しています。アプリはいくつかのリポジトリで構成されていますが、MicroProfileに対するサンプルはrmsリポジトリとなります。

|repository| 説明 |
|---|---|
|[rms](https://github.com/extact-io/rms)|MicroProfileによるrmsのバックエンドアプリ|
|[rms-ui-react](https://github.com/extact-io/rms-ui-react)|ReactによるrmsののSPAフロントエンドアプリ |
|[rms-generated-client-js](https://github.com/extact-io/rms-generated-client-js)| OpenAPI Generatorで生成したrmsのAPI Client |

![repo_relations](../../../img/mp/repo_relations.drawio.svg)


レンタル品予約システムのバックエンドとなるrmsアプリの内容やアーキテクチャは[README](https://github.com/extact-io/rms/blob/main/README.md)を参照していただければと思います。また、今後、rmsの実装はMicroProfile仕様の実際の使用例として適宜紹介させていただく予定となります。

サンプルアプリの紹介は以上とさせていただき、次からはMicroProfileの実装として利用としているHelidonについて説明させていただきます

## Helidonについて
[Helidon](https://helidon.io/)は[前回説明](/msa/mp/cntrn02-what-mp/#microprofileフレームワークの利用)のアプリケーションサーバを必要としない、MicroProfileフレームワークタイプのMicroProfile実装でOracleが開発を行っています。

Helidonにはエディションが2つあり、１つはシンプルさに特化し非常に軽量な[Helidon SE](https://helidon.io/docs/v2/#/se/introduction/01_introduction)、もう一つはHelidon SEにMicroProfile対応を加えた[Helidon MP](https://helidon.io/docs/v2/#/mp/introduction/01_introduction)となり、サンプルアプリではこのHelidon MP を利用しています。そして、このHelidon MPの特徴としては次のようなものがあります。

### Non-BlockingでReactiveなNettyがベース
マイクロサービスアーキテクチャの中核となるRESTフレームワークはNon-Blockingでリクエスト処理を行う[Netty](https://netty.io/)の上で構築されているため、Nettyの特徴である高スループット、低レイテンシ、低リソースでリクエストが処理されます。

### アプリケーションをコマンドラインから起動可能
[Netty](https://netty.io/)をベースとしたHelidon Web Serverはmainメソッドから起動することができます。そして、このことで一番恩恵を受けるのがデバックです。

特定のテスティングフレームワークやプラグイン機能などを使うことで従来のJakarta EEアプリケーションでもEclipseなどのIDEからアプリケーションを起動しデバック実行をさせることは可能ではありましたが、コンソールアプリのようにIDEから直接起動してデバックすることはできませんでした。

しかし、HelidonではWebアプリケーションでもその起動はmainメソッドから行うため、何も考えず、かつ何も必要とせず、IDEから簡単に起動・デバックすることができます。Jakarta EEのデバックにはどうしてもアプリケーションサーバが必要となるのが、個人的には最大の欠点であり、Spring Frameworkの芝がとても青く見えるところでしたので、このコマンドラインからの起動は大きなメリット[^1]と捉えています

[^1]: QuarkusもHelidonと同様の起動方式となります。ですので、このコマンドラインからの起動はHelidonと言うよりもMicroProfileフレームワークに対して当てはまるものとなります。また、Payara Microはアプリケーションサーバですが、warをコマンドラインから起動することができます。

### MicroProfile仕様以外の豊富な機能
MicroProfileにはJTAやJPAなどRDBに対する仕様は含まれていませんが、Helidon MPでは、その独自機能としてJTAやJPAとのインテグレーション機能や設定フィルの設定値の暗号化、IDプロバイダとの認証連携機能など、実際のアプリケーション開発で必要となる機能を提供[^2]しています。

[^2]: 提供される機能とその詳細は[公式ページ](https://helidon.io/docs/v2/#/mp/introduction/01_introduction)を参照

### MicroProfile仕様への追従
最新のHelidon MPが対応しているMicroProfileバージョンは3.3とりますが、GitHubのプロジェクトリポジトリでは最新仕様の[5.0への対応](https://github.com/oracle/helidon/issues/2636)が進められています。

現在利用されているMicroProfile仕様の主なバージョンは3.x系、4.x系、5.x系の3つになると思いますが、4.x以降の対応にはJakara EEへの移行も絡むため、IBMのOpenLiberty以外はどの製品も対応に時間が掛かっています。また、4.x系の最終バージョンの4.1と5.0の変更点はjakartaパッケージの変更のみで、機能的な変更はありません。

このような状況を考えると、現時点でMicroProfile 5.0への対応がかなりの程度進んでいることは、MicroProfile仕様への追従にHelidonの積極的さが伺えます。

### GraalVMによるネイティブコンパイル対応
[GraalVM](https://www.graalvm.org/)によるネイティブコンパイル対応は同じMicroProfile実装の[Quarkus](https://quarkus.io/)がいち早く対応し一時期脚光を浴びましたが、Helidon MPもGraalVMの[ネイティブコンパイル](https://www.graalvm.org/native-image/)に対応しています。

GraalVMのネイティブコンパイル機能を使うことで、JavaアプリケーションをLinuxやMac、Windowsと言った稼働プラットフォームごとのネイティブの実行ファイル（Windowsであればexeファイル）に変換することができます。そして、ネイティブの実行ファイルはJavaVM上で稼働させる場合と比較し、高速に起動し、かつメモリ消費も少なくできるメリットがあります。

ただ、このネイティブコンパイルはclassモジュールであればなんでも可能と言う訳ではなく、変換にはそれなりな制約や制限等があるため、変換するモジュール(jar)がGraalVMのネイティブコンパイルに対応している必要があります。

この点、HelidonはHelidon SE, Helidon MPともネイティブコンパイルに対応しているため、Helidonから提供される実装（jar）を利用している限り、Javaアプリケーションのネイティブコンパイルは可能です。

ただし、ネイティブコンパイルは対象アプリケーションに含まれるすべてのjarモジュール、もっと言うとjarに含まれるすべてのclassファイルが変換の対象となります。ですので、もしアプリケーション内にHelidonから提供される以外のOSSを導入していた場合、そのOSSがネイティブコンパイルできるとは限りません。また、この点も含め、Helidonはネイティブコンパイルに対し、以下のコメント[^3]を出しています。
> ネイティブイメージは、多数のインスタンスに迅速にスケールアウトする機能が重要である、水平方向のスケーラビリティ要件が高いアプリケーションに最適です。
とはいえ、ネイティブイメージにはいくつかの制限があり、起動とフットプリントの優先度が低い長時間実行アプリケーションには、Java SE HotSpotVMの方が適している可能性があります。

このようにOracleも銀の弾丸ではないことを述べていますが、対応することでアーキテクチャ上の選択肢は広がるため、ネイティブコンパイルに対応していること自体は使うか使わないかは別としてメリットと言えます。

また、ネイティブコンパイルを行うGraalVMの開発元はOracleで、Helidonの開発元も同じOracleです。ですので、ネイティブコンパイル対応の実装の中でもHelidonはより一層の対応を期待できるのではないかと思います。（あくまでも期待で実際のところは不明ですが、、）

[^3]: 原文は公式ページの[”When should I use Native Images?”](https://helidon.io/docs/v2/#/mp/guides/36_graalnative)を参照。なお、引用は拙訳となる。


## まとめ
今回はMicroProfileを使った実際のサンプルアプリとそのサンプルで使っているHelidonについて説明させていただきました。次回はMicroProfileをサンプルアプリで実際に使ってみて、これは便利だ、素敵だと感じた是非使ってみるべきとも言える3つの仕様を紹介します。
