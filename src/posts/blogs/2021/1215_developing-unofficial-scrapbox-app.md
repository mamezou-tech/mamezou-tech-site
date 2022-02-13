---
title: "非公式 Scrapbox アプリを開発している話"
author: masahiro-kondo
date: 2021-12-15
tags: scrapbox
---

これは、[Scrapbox Advent Calendar 2021 - Adventar](https://adventar.org/calendars/7106) 15日目の記事です。

2017年の終わり頃から個人で Scrapbox を使い始めました。それまでは Tumblr にサブアカウントを作って個人用 Wiki 的に使っていたのですが、テキスト(Markdown)編集が使いづらいと感じていました[^1]。Scrapbox をちょっと使ってその書きやすさやリンクの機能に感動したので Tumblr から全てのエントリーを移行しました。

[^1]: Tumblr は引用に最適化したサービスのため用途とも合っていなかったという話もあります。

2018年5月頃から社内で Scrapbox の利用が始まりました。個人と会社用でアカウントを使い分けたい[^2]のと、ブラウザ外で利用したい[^3]というモチベーションで Electron でアプリ化しました。


[^2]: 当時は会社用と個人用アカウントを使い分けていましたが、結局は個人プロジェクトも会社用のアカウントを編集メンバーにして会社用アカウントで使うようになりました。

[^3]: 2018年の終わり頃には Scrapbox 本家も PWA に対応してブラウザ外で使えるようになりました。

ブラウザ外で使いたい理由として、ウィンドウの切り替えがしやすいことと、ブラウザのショートカットが優先されて Scrapbox の Emacs キーバインド設定で C-f や C-e が効かないということがありました。

この野良 Scrapbox アプリ、**S**crap**b**ox in **E**lectron ということで sbe と名付けました[^4]。

[GitHub - kondoumh/sbe: An unofficial Scrapbox desktop app](https://github.com/kondoumh/sbe)

![](https://raw.githubusercontent.com/kondoumh/sbe/master/icons/png/128x128.png)

[^4]: アイコンは [draw.io](https://drawio-app.com/) で作りました。センスがないのは自覚しています。

単純にデスクトップ化しただけだとブラウザのようにタブが使えないのが逆に不便に感じて WebView をタブに埋め込むような画面構成にしました。

![](https://user-images.githubusercontent.com/2092183/63644879-904e0a00-c72d-11e9-96d2-64e4727e64c6.gif)

社内で宣伝したらけっこう使ってくれる人いました。

「Scrapbox のプロジェクトページはタイル表示なので、リストの画面が欲しい」という要望があったので、ページ一覧画面を追加し、独立したタブで一覧画面を開くようにしました。プロジェクトのページ情報を取得するために Scrapbox API を利用しました。

その後も、要望や自分の欲求により機能を順次追加していきました。その履歴は私の個人 Scrapbox に書いています。

[Scrapbox in Electron (sbe) - kondoumh](https://scrapbox.io/kondoumh/Scrapbox_in_Electron_(sbe))

- URL を Scrapbox 記法の `[url title]` 形式で貼り付ける
- 文字サイズを4段階で切り替えて見出し的に使う
- Scrapbox のページを Markdown 形式に変換する

といった、入力支援機能、

- プロジェクトの全ページのビューや被リンク数を集計する
- 任意ページのプレビュー
- 任意ページのリンクページのプレビューページャー

などの機能が主だったところです。

Scrapbox は個人的にも会社的にもなくてはならないサービスになっており、sbe も便利に使っているため、今後も当面メンテナンスを続けると思います。Electron のリリース速度が早まり、古いバージョンのサポート切れが容赦なくて追従するのが大変[^5]ではありますが・・。

[^5]: sbe が依存している NPM パッケージが動かなくなるとデバッグしてプルリクを送ったりしています。
