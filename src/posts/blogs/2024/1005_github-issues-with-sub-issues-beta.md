---
title: GitHub Issues で Sub-issues が作れるようになりました(ベータ)
author: masahiro-kondo
date: 2024-10-05
tags: [GitHub]
image: true
---

## はじめに
GitHub Issues に Sub-issues 機能が追加されました。現在パブリックプレビュー段階です。

[Evolving GitHub Issues (Public Preview) · GitHub Changelog](https://github.blog/changelog/2024-10-01-evolving-github-issues-public-preview/)

さっそく Waitlist に参加しました。

![waitlist](https://i.gyazo.com/7e612debe006706b1033ddcd83fcaff2.png)

すぐに、Sub-issues を含むベータ版が有効化された通知メールが来ました。

![Welcome](https://i.gyazo.com/a4c9046778c4f2273818c012020c2f65.png)

筆者はメールを見落としており、3日ぐらい気付いてませんでした。💦

## Sub-issues の作成
Sub-issues の追加については、公式ドキュメントに手順があります。

[Adding sub-issues - GitHub Docs](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues)

Issue の概要説明の下に `Create sub-issue` ボタンがあります。

![create sub-issue](https://i.gyazo.com/54408ce65248b3e2cebaed1a15481b91.png)

sub-issue を新規に追加するか、既存の issue を追加するかを選択できます。

![add menu](https://i.gyazo.com/2798d1871874b81fbb565f0e08c06579.png)

新規の sub-issue を登録する画面です。

![create new sub issue](https://i.gyazo.com/0242a680b97220a1e8e944ec62313784.png)

`Create` をクリックする前に `Create more sub-issues` にチェックを入れておくと、連続して sub-issue を登録できます。

登録すると sub-issue が issue の説明の下に列挙されます。

![sub-issues list](https://i.gyazo.com/d1140feaa7c6fc0ca4bb7d7e96e3c66e.png)

sub-issue として登録した issue にも sub-issue が追加できるので何階層もネストさせられます。

## issue の階層構造の可視化
現在のところ、Sub-issues の階層構造は リポジトリの issue 一覧の画面では可視化されません。

![issue list](https://i.gyazo.com/483e235d57f65d612a343a5b78587a52.png)

プロジェクトを作って上記の issues を追加してみました。

![Projects](https://i.gyazo.com/ae46cda4e8ea47a8da8564105f8f04f0.png)

![Add issues to project](https://i.gyazo.com/531ac2fd72d52d879cdfd91313f53c39.png)

ルートになる issue を追加するだけで、sub-issue は自動で追加されます。これは、Projects のワークフロー機能によるものです。

![Sub-issues automatically added](https://i.gyazo.com/79b71776af07ac8d3ebccd815c90c15d.png)

通常モードでは、フラットな表示となります。

![Project view](https://i.gyazo.com/e7309d286442937148fbe95033797ce1.png)

グルーピングの指定で、`Parent issue` を指定します。

![Set Group](https://i.gyazo.com/058bf940e8b428dc61ddd4bf67f66ba7.png)

issue 単位でのグループ表示となりました。

![Group by parent issue](https://i.gyazo.com/1614410ec508e8f8af200510c8169e18.png)

上記の画面は Projects の Table ビューでしたが、Roadmap ビューにスイッチしても反映されています。

![Roadmap View](https://i.gyazo.com/ed9953d16bc171d75ad5259c7397fd9a.png)

プロジェクト作って操作が必要なので若干面倒かもです。

:::info
かなり古いですが、GitHub Projects のワークフローについては以下の記事で紹介しています。

[リニューアルされた GitHub Projects のオートメーションを使ってみる](/blogs/2022/10/22/renewed-github-projects-automation/)

GitHub Projects の Roadmap ビューについては以下の記事で紹介しています。

[GitHub Projects に Roadmaps が登場 - issue や PR をタイムラインで管理しよう](/blogs/2023/03/28/github-projects-new-roadmaps-layout/)
:::

## Sub-issues を持つ issue のクローズ

Sub-issues のルート issue をクローズする操作をしてみました。

![Close root issue](https://i.gyazo.com/7e71e64d945377cacbc4a91770fbc813.png)

Sub-issues が Open していても普通にクローズできてしまいました。

![issue Closed](https://i.gyazo.com/46ce5a245bc031b158054bd983f22cb4.png)

Sub-issues の状態によりガードをかける機能は現段階ではないようです。

今後、フィードバックを受けて実装されるかもしれませんね。

## さいごに
筆者の普段の利用においては issue の親子構造はなくても構わないですが、Issue tracker としてはあった方がいい（あって当然）と思う人も多いと思います。パブリックプレビューについては、以下の Discussion で議論されています。使ってみてフィードバックをしてみるのもよいかもしれませんね。

[Sub-issues Public Preview · community · Discussion #139932](https://github.com/orgs/community/discussions/139932)

正式版でどこまでブラッシュアップされるか注目したいと思います。
