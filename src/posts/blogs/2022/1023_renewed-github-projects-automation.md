---
title: リニューアルされた GitHub Projects のオートメーションを使ってみる
author: masahiro-kondo
date: 2022-10-22
tags: [GitHub]
---

7月にGitHub Projects のオートメーションについて紹介しました。

- [GitHub Projects の Automated kanban で issue 管理を楽にする](/blogs/2022/07/12/using-github-projects-automated-kanban/)

その後、リニューアルされた Projects について紹介しました。

- [GitHub Projects がリニューアル - スプレッドシートのビューが利用可能に](/blogs/2022/07/28/github_projects_spreadseets_view/)

このリニューアルにより7月の記事のオートメーションは、**Classic** Projects のオートメーションということになりました。

Classic Projects では、プロジェクト作成時に Automated のテンプレートを選択するぐらいでしたが、リニューアル版では、issue や PR の状態遷移をワークフローとして UI で設定できるようになりました。

[Using the built-in automations | GitHub Docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-built-in-automations)

Projects の右上のメニューから `Workflows` を選択します。

![projectsのメニュー](https://i.gyazo.com/0902a59840742fd6cdf98511c81c4562.png)

設定可能なビルトインのワークフローのリストが表示され、デフォルトでは、`Item Closed`、`Pull Request merged` が有効化されています。

![Workflows画面](https://i.gyazo.com/10c9f669a40f5e07f02b31159e7817a3.png)

ワークフローによっては、対象のアイテム (issue, Pull Request) を指定できます。

![アイテムの指定](https://i.gyazo.com/c0b17220433a51274b7d0fdf0fad83a9.png)

遷移先もカスタマイズできます。

![遷移先の指定](https://i.gyazo.com/fa57d160cfb07e566d462b3ff4d6bfb1.png)

現在ベータですが、クローズされた issue をアーカイブするワークフローもビルトインで追加されました[^1]。

[The new GitHub Issues - October 18th update | GitHub Changelog](https://github.blog/changelog/2022-10-18-the-new-github-issues-october-18th-update/)

[^1]: issue そのものがアーカイブされるわけではなく、プロジェクトのビュー上からアーカイブされます。

クローズして30日経過したものをアーカイブする設定を作成してみました。

![自動アーカイブ設定](https://i.gyazo.com/7efe4d9d0de4e67664386b9c9fe25eef.png)

`last-updated` オペレータで日数を指定します。このオペレータを使用すると、経過日数のチェックで12時間ごとにワークフローが実行されます。

有効化する際、即時にアーカイブされる項目の数とともに確認ダイアログが出ます。

![有効化確認](https://i.gyazo.com/b288f04b67d8f7de7aade6df875c717b.png)

有効化すると Done になっていた issue がごっそりとアーカイブされました。アーカイブされた issue は、メニューの `Archived Items` から閲覧できます。

![Archived Items](https://i.gyazo.com/94b229922e1e60bc795b667038765eec.png)

:::info
上記の例では、`is` と `last-updated` で設定しましたが、`reason` オペレータも使えます。

![reason 演算子](https://i.gyazo.com/e3c4efe5d114092136d2913480214087.png)

これは issue をクローズするときの理由に相当します。

![Close as](https://i.gyazo.com/e3456f65994f8894236b74b35a550a65.png)
:::

さらに、Graph QL API と GitHub Actions ワークフローを組み合わせて高度なオートメーションを実現することも可能です。

[Automating Projects using Actions | GitHub Docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions)
