---
title: 個人開発活動2022
author: masahiro-kondo
date: 2022-12-01
tags: [advent2022]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---
 
これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第1日目の記事です。

豆蔵デベロッパーサイトは11月29で1周年を迎えました[^1]。この1年で執筆者が増え、バラエティに富んだ記事が数多く投稿され、アクセスも伸び続けて順調に成長しています。そして12月はちょうどアドベントカレンダーの季節。「アドカレやろうよ！」と同僚に呼びかけ、お願いしまくってカレンダーを埋めてもらっています。

[^1]: [「豆蔵デベロッパーサイト」ローンチのお知らせ](/blogs/site-launch/)

言い出しっぺなので初日の記事を担当することにしました。この記事では筆者の2022年の個人開発活動について書いてみようと思います。


## Write Code Every Day
筆者は2018年の途中から GitHub の contribution graph に毎日草を生やし続けています[^2]。

![contribution graph](https://i.gyazo.com/ba47cf9cd18a909e01f1ba354e8dc4fb.png)

[^2]: ちなみに private リポジトリへのコミットも表示するオプションです。

個人でソフトウェアを開発して公開するというのもやっていますが、そういうプロジェクト以外に、プログラミング言語やインフラ系の技術 (Kubernetes や Infrastructure as Code) などの勉強用リポジトリを作ってコミットしたりしています。

:::column:勉強用リポジトリの効能
勉強用リポジトリを持っておくと、本気のコードを書く前に素振りでき、ついでに書いたコードをサンプルとしてブログ記事にできたりするため、なかなかいいプラクティスだと思っています。[筆者の GitHub アカウント](https://github.com/kondoumh)には名前に `-study` というサフィックスのついたリポジトリがかなりあります。
:::

個人リポジトリだけでなく、豆蔵の GitHub オーガニゼーションや業務用の GitHub チームもあり、毎日なにかしらコミットするネタはあります。今年は豆蔵デベロッパーサイトの記事執筆やレビューの活動も増えたため、例年よりかなり contribution が多くなっています。

:::column:技術記事執筆とソフトウェア開発
豆蔵デベロッパーサイトへの投稿はソフトウェア開発とは少し違いますが、技術文書を書いてレビュー、リリースし、アクセス状況を見て次の記事に活かしていくプロセスは似ていますし、デベロッパーサイトの記事では OSS を調べてコードスニペットを書くことが多いのもあって、かなり近いと思っています。
:::

## 豆蔵オーガニゼーションの OSS
mamezou-tech サイトでは OSS のリポジトリがいくつか公開されており、以下の3つの記事で紹介しているものはほとんど筆者の個人開発と言えるものです。

- [setup-helmfile](/oss-intro/setup-helmfile/)
- [buildpacks-action](/oss-intro/buildpacks-action/)
- [sbgraph](/oss-intro/sbgraph/)

詳細は各記事やリポジトリの README を読んでいただければと思います。setup-helmfile と buildpacks-action はけっこう使われていて、特に setup-helmfile はちょくちょく issue や PR を送ってくれる人がいるので、issue にコメントしたり PR を取り込んでリリースをしたりということをやっています[^3]。
会社のオーガニゼーションで公開している OSS ということもあり、自分で作業するときも PR を作ってマージしています。

[^3]: setup-helmfile は6月に v1.0になりました。

豆蔵オーガニゼーションには豆蔵デベロッパーサイトの記事と連動したリポジトリも作っていて、[Electron BrowserView の記事](/blogs/2022/01/07/electron-browserview/)で紹介したサンプルリポジトリなどがあります。

[GitHub - mamezou-tech/electron-example-browserview: Example of Electron app that registers and switches between multiple BrowserViews.](https://github.com/mamezou-tech/electron-example-browserview)

ただ、オーガニゼーションにあまり保守しないサンプル的なリポジトリが増えるのもどうかと思って、コードスニペット的なものも含め、個人リポジトリに作るようになりました。

## 非公式 Scrapbox アプリ
個人リポジトリで Scrapbox の非公式デスクトップアプリを Electron で作っています。

[GitHub - kondoumh/sbe: An unofficial Scrapbox desktop app](https://github.com/kondoumh/sbe)

豆蔵デベロッパーサイトにも何度かこのアプリのことを書いています。

- [非公式 Scrapbox アプリを開発している話](/blogs/2021/12/15/developing-unofficial-scrapbox-app/)
- [Electron 製の非公式 Scrapbox アプリを式年遷宮した話](/blogs/2022/07/13/migrating-electron-app-to-new-archi/)
- [Electron v20 で有効化された Renderer プロセスサンドボックス化に対応する](/blogs/2022/08/03/electron-renderer-process-sandboxed/)

リリースサイクルが早くなり breaking changes 対応を迫られる Electron ネタが中心です。最近は対応も落ち着いてたので、独自のスタートページを追加したりしました。

[Release v3.1.0 · kondoumh/sbe](https://github.com/kondoumh/sbe/releases/tag/v3.1.0)

このアプリは自分で使い続けていて、ふと思いついた時に機能追加したり、不具合に気づいてバグフィクスしたりしています。大きい変更以外は main に直接コミットしてます。macOS と Windows で動作確認してからリリースしています。Linux 版は正直動作確認してません[^4]。

[^4]: 最初は VM に Ubuntu 入れて確認したりしてましたが、macOS で VirtualBox がうまく入らなくなったりして環境が作れないのです。

けっこう長く保守してますが、自分がよければ満足というスタンスで気楽に続けています。

## GitHub の機能で楽をする
今年は[開発環境](/dev-env/#vcsバージョン管理の機能を活用する)と [CI/CD](/cicd/#github-actions) のカテゴリー中心に GitHub の新機能についてかなりの記事を執筆しました。特に以下の記事で紹介した機能については、個人開発プロジェクトにも取り入れています。

- [GitHub のリリースノート自動生成機能を使う](/blogs/2022/03/11/github-automatically-generated-release-notes/)
- [GitHub の脆弱性検出機能 Code scanning alerts と CodeQL について](/blogs/2022/06/20/github-code-scanning-and-codeql/)
- [GitHub の Dependabot version updates で依存ライブラリを継続的に更新する](/blogs/2022/06/19/github-enable-dependabot-version-updates/)

リリースノート自動生成機能はとても便利で、setup-helmfile のように contribute してくれる人がいるプロジェクトでは、OSS のリポジトリっぽくいい感じのリリースノートが作られます。

![setup-helmfile のリリースノート](https://i.gyazo.com/6ad8273668ac21dd56650a5cefae1410.png)

セキュリティスキャンも GitHub がやってくれるのは楽ですし、依存ライブラリの更新も dependabot から PR が来るのでマージすれば OK になり楽になりました。

- GitHub の新機能の紹介記事を書くために新機能を試す
- 便利だと思った機能を個人開発に取り入れる
- 個人開発の作業が楽になる

という、いいサイクルになっていると思います。筆者がメンテナンスしているような小規模なソフトウェアでも、こういった自動化の恩恵は大きいと感じています。

## 来年の活動に向けて
最後に、少し早いですが来年の活動に向けて書いておきます。

今年は既存プロジェクトのメンテナンスリリースをしているだけでしたが、機会があればまた別のソフトウェア開発ができたらと思っています。豆蔵デベロッパーサイトで記事を書くために OSS やプラットフォームを試して咀嚼するというステップを継続的にできているので、それらを活かしたいという気持ちもあります。

フロントエンドでは Vue から React への流れがあるので、個人プロジェクトの技術スタックも見直す必要があると考えています。[Deno 連載](/frontend/#denoを始める)で触った Deno や Deno Deploy も使っていきたいと思います。
