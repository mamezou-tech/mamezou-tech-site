---
title: GitHub Projects の Automated kanban で issue 管理を楽にする
author: masahiro-kondo
date: 2022-07-12
tags: GitHub
---

みなさんは GitHub Projects を活用しているでしょうか？ issue は使ってるけど、Projects は使ってないという方も多いかもしれません。

issue をカンバンに並べて可視化するのは、チームの朝会などで進捗を確認したり、その場で issue を動かしたりできて便利です。

このスクリーンショットは豆蔵デベロッパーサイトのリポジトリの Project です。 To do / In progress / Done のセクションに issue がカードとして並んでいます。In progress に置かれたカードは、issue ではなく note という Markdown で書けるメモで、とりあえず note で作っておいて後から issue に変換したりすることも可能です。

![](https://i.gyazo.com/c3721ed79420851c2af877ffe253d103.png)

issue に付与された `enhancement` などの label も表示され、label や他の属性でフィルターすることもできます。

![](https://i.gyazo.com/f6a0292ad715ed2cf202c2d767e6d324.png)

Automated kanban を使うと、単に issue を並べるだけではなく、issue と Pull Request (PR) を関連づけた自動化も可能です。

[プロジェクトボードの自動化について | GitHub Docs](https://docs.github.com/ja/issues/organizing-your-work-with-project-boards/managing-project-boards/about-automation-for-project-boards)

Project の作成は、各リポジトリや Organization の Projects タブから `New classic project` をクリックします[^1]。

[^1]: 現在、GitHub Projects の次世代版がベータ公開されており、既存の Projects は Classic project と位置付けられています。

![](https://i.gyazo.com/afeee42cd78fbe6f3887cea7eb34ce2a.png)

Project の Template としては `Automated kanban` を選びます。

![](https://i.gyazo.com/4dae372b240cb9893e7ed70eb76e9dd8.png)

作成したら、登録済みの issue を ToDo や In progress にドラッグ＆ドロップで追加していきます。

以前、「[GitHub issue からブランチ作成する新機能 - issue と PR を自動リンク](/blogs/2022/03/28/github-create-branch-from-issue/)」の記事にも書きましたが、issue からブランチを作成して PR を作成することで issue と PR の関連づけが行われます。もちろんissue に手動で PR を関連づけることもできます。こうしておくと PR がマージされた時に Projects の Automation 機能により issue が自動的にクローズされ Done に移動します。

以下は、豆蔵デベロッパーサイトのとある issue に記録されたタイムラインです。

![](https://i.gyazo.com/399fd33ec91476a57c72e22240577c9a.png)

- 最初に、issue が Todo に置かれました。
- 次に担当者が issue を In progress に移しました。
- さらに担当者は PR を issue にリンクしました。
- そして、PR がマージされました。同時に issue がクローズされます。
- issue クローズと共に、Kanban の automation により、Done に issue が移動されました。

このように、issue と PR をリンクすることで、Project に認識され、ちょっとした自動化の恩恵が受けられます。

:::info:issue のタスク分解について
本記事のテーマとは少しずれますが、タスクを issue として管理するときに悩ましい問題として、「issue が複数のサブタスクに分解されるときに、サブタスクを issue として扱うか？」があります。

issue が複数のタスクの完了によりクローズできるとして、GitHub の issue には親子関係を管理する機能がないので、せいぜい 子の issue から親の issue に `#番号` でメンションするしかありません。ですので、分解を細かくやってしまうと、issue の数が増えて関連が分からなくなり管理コストが大きくなってしまいます。

タスク分解には、GitHub の Markdown で使えるタスクリストを使うのがよいでしょう。次のスクリーンショットは、Project でタスクリストがどのように可視化されるのかを示すものです。In Progress にある 「MongoDB を最新化する」という issue は、4つのタスクに分解され、そのうち、2つが完了していることがわかります。Kanban の カード内では、`2 of 4 tasks` とタスクの消化状況が円グラフと共に表示され、消化具合がわかります。

![](https://i.gyazo.com/6082592e36260e1f6695aa9ce7a2208b.png)

このように、Projects には issue 内のタスクリストのサポートもありますので、利用すると進捗の把握が楽になります。

[タスクリストについて - GitHub Docs](https://docs.github.com/ja/enterprise-cloud@latest/issues/tracking-your-work-with-issues/about-task-lists)
:::

GitHub Projects は今後 Kanban だけでなく、スプレッドシートのようなビューも追加され、管理者にとって便利な機能が追加されていくようです。こちらも別途記事にしたいと思います。

:::info:追記
Projects がリニューアルされたので記事書きました。

[GitHub Projects がリニューアル - スプレッドシートのビューが利用可能に](/blogs/2022/07/28/github_projects_spreadseets_view/)
:::
