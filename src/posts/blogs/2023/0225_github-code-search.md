---
title: GitHub Code Search で世界中のコードを検索する
author: masahiro-kondo
date: 2023-02-25
tags: GitHub
---

GitHub Code Search は GitHub にホストされているリポジトリのコードベースから検索できます。当然のことながら Google 検索などの汎用検索サービスよりソースコード検索に特化したサービスになっています。昨年プレビュー版がリリースされ waitlist で順次利用可能になっていました。

[Introducing an all-new code search and code browsing experience | GitHub Changelog](https://github.blog/changelog/2022-11-09-introducing-an-all-new-code-search-and-code-browsing-experience/)

そしてこの度パブリックベータとして一般利用可能になりました。

[No more waitlist - code search and code view are available to all in public beta | GitHub Changelog](https://github.blog/changelog/2023-02-23-no-more-waitlist-code-search-and-code-view-are-available-to-all-in-public-beta/)

## ポータル
Code Search のポータルページです。

![portal](https://i.gyazo.com/0387a908a9765e6ce7fd507c107eb7d1.png)

[GitHub Code Search (Preview)](https://cs.github.com/)

開発者向けの検索サイトだけあって検索ボックスの下に検索用スニペットが書かれています。リポジトリやパスを指定した検索、BOOL 演算や正規表現を使用する検索などのスニペットがあり、開発者がぱっと見てすぐ使い始められるポータルになっています。

## 特定パターンのファイルを探す
検索スコープのデフォルトは `All repos` ですが、自分のプライベートリポジトリを含め絞り込みが可能です。

![scope](https://i.gyazo.com/10b0a3cda60f9641d6cd5852915a4496.png)

Apache Kafka のリポジトリで Scala のファイルを絞り込む例です。`repo:apache/kafka language:scala` ドロップダウンに候補のファイルが表示されます。

![kafka scala](https://i.gyazo.com/f7242b0ff304f49da9d343123894d4c9.png)

ファイルを選択すると、実際のファイルをエディタのビューで開きます。上部の検索ボックスでさらに検索を継続できます。

![Open file](https://i.gyazo.com/ae1e53612ed0df3b8db4dd82f4ec450c.png)

パスのパターンも指定できるので、コードリーディングなどでファイルの場所にあたりをつけるのに便利そうです。

## アカウントやオーガニゼーションを指定して検索する
筆者のアカウントのリポジトリで、JavaScript の `Promise.all` を読んでいる箇所を検索してみました。`owner:kondoumh promise.all` のように指定できます。オーガニゼーションに属するリポジトリを検索したい場合は、`org:mamezou-tech xxx` のように指定できます。

![kondoumh promise.all](https://i.gyazo.com/766efb99f2aa68b3c76866ddb9bb304f.png)

パブリックなリポジトリも、個人やオーガニゼーションの private なリポジトリもスコープを絞って簡単に検索できるので、「どっかでこんなコード書いたけどどれだっけ？」というケースで役立ちます。

## Google 検索との違い
開発者がフレームワークやライブラリの利用方法を調べる典型的なシーンを考えてみましょう。Google で利用しているライブラリのモジュール名や関数名を入力してブログや StackOverflow を見つけ、そこで適切な情報を得られるかは運次第なところもあります。ブログや StackOverflow の投稿が数年前だとおそらくライブラリのメジャーバージョンが上がってしまっていて現在の作業には役立たない可能性があります。

筆者は先日、Spring Kafka の例外処理方法を調べていました。発生した例外クラスに応じて例外ハンドラークラスを切り替えるためのクラス `CommonDelegatingErrorHandler` の使い方がよく分からなかったのですが、公式ドキュメントはおろか、公式ブログや StackOverflow にも利用例が見当たりませんでした。ちょうど Spring Kafka がメジャーバージョンアップしてネットで得られる情報が旧バージョンの情報ばかりだったというのもあると思います。Google で調べていた時期はけっこう前なのですが、この記事執筆中の現在でもあまり目ぼしい情報は出てきません。

![Google Search](https://i.gyazo.com/933dc605fea1ff96dd43419fa5bbd343.png)

この時は、Spring Kafka の Javadoc や実装を読んでなんとか自力解決しました。Google は全ての GitHub リポジトリのインデックスを持っているわけではないでしょうから、ピンポイントのコードを探すのは難しいですね。

Code Search で調べると、Spring Kafka の実装やドキュメントが上位に表示され、実際に利用しているコードも見つかりました。

![Code Search](https://i.gyazo.com/d15a5d85ce0d6ffad4bf7b80b1416655.png)

やはり餅は餅屋というところでしょうか。

## Code Search を支える技術

GitHub のブログに、Code search の背後にあるテクノロジーが解説されています。

[The technology behind GitHub’s new code search | The GitHub Blog](https://github.blog/2023-02-06-the-technology-behind-githubs-new-code-search/)

これによると、4,500万のリポジトリ(コードは115TB)を検索できるよう、インデックスを Git blob object ID によりシャーディングし、Blackbird という Rust で書かれた検索エンジン・クローラで処理しているとのことです。Git commit などのイベントを Kafka で中継してインデックス更新などの処理を起動しているようです。

## 最後に
Code Search で GitHub にホストされたリポジトリのコードをより高い精度で検索できるようになりました。コードを書く上でロジックを考えて実装する部分と、利用するライブラリの適切な使用方法を理解して実装する部分はどうしても違います。Copilot のような AI テクノロジーを使う方法もありますが、リファレンスとなるようなコードを見つけ出し自分が作成しているコードで活用するには Code Search が役立つのではないかと思います。
