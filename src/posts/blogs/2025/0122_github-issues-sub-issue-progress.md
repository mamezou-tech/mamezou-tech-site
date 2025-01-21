---
title: GitHub Issues で Sub-issues による進捗状況把握ができます
author: masahiro-kondo
date: 2025-01-22
tags: [プロジェクト管理, GitHub]
image: true
---

## はじめに

昨年の秋に GitHub Issues の Sub-issues がプライベートプレビューになって試したのを記事にしていました。

- [GitHub Issues で Sub-issues が作れるようになりました(ベータ) ](/blogs/2024/10/05/github-issues-with-sub-issues-beta/)

今年に入ってこの機能がパブリックプレビューになり、全ユーザが試せるようになりました。

@[og](https://github.blog/changelog/2025-01-13-evolving-github-issues-public-preview/)

## プロジェクトでの親子関係と進捗の可視化
プライベートプレビューの時の記事では、[Issue の親子関係をグルーピングで表現する可視化方法](/blogs/2024/10/05/github-issues-with-sub-issues-beta/#issue-の階層構造の可視化)を紹介しました。

Table ビューや Roadmap ビューで、`Group By` に `Parent issue` を指定することで階層が表現されます。この時、sub-issues の状態による進捗バーも表示されています。

![Group by parent issue](https://i.gyazo.com/9479ff561b49190ad7fcdf9bd9f760a5.png)

## 進行状況フィールドによる進捗の可視化
今は、グループ指定をしなくても専用の進行状況フィールドを使うことで進捗を可視化できます[^1]。

[^1]: プライベートプレビュー時点でも可能だったのたかもしれませんが、筆者は気づいていませんでした。

使い方は公式ドキュメントに書かれています。

[親の issue と sub-issue の進行状況フィールドについて - GitHub Docs](https://docs.github.com/ja/issues/planning-and-tracking-with-projects/understanding-fields/about-parent-issue-and-sub-issue-progress-fields)

前の記事で使ったリポジトリとプロジェクトを利用して設定してみます。前の記事の Issue はもうクローズされているので、新たに Issue と Sub-issues を追加しました。

![Issue and sub-issues](https://i.gyazo.com/c9df8229161077e419feb93e3d411357.png)

親の issue の設定で追加するプロジェクトを選択します。

![Select project](https://i.gyazo.com/b20677075835686639245b6b32f53de5.png)

:::info
前の記事にも書きましたが、プロジェクトのワークフローにより sub-issues は自動的に追加されるため、個別に追加する必要はありません。
:::

プロジェクトに issue と sub-issues が追加されました。

![Issues added](https://i.gyazo.com/3d79da2aa285ad746a7688dead3761d7.png)

それでは、進行状況フィールドを表示してみましょう。

`+` ボタンから出るメニューで `Hidden fields` にある `Sub-issues progress` を選択します。

![Set Sub-issues progress](https://i.gyazo.com/7b41cbf381a1bd7d6d58702c2286f55c.png)

親 issue に進捗バーを表示するカラムが追加されます。

![Show Sub-issues progress](https://i.gyazo.com/a07ba5d868dfccc76a470ffcbe8bf4f6.png)

いい感じですね。フィルターで Sub-issues を隠して、親 issue だけにしてみましょう。フィルターに`no:parent-issue` を指定するだけです。

![set filter](https://i.gyazo.com/fc0ec0b835e5e7be1a3f19f4b3df9bab.png)

親 issue と進捗バーだけになってスッキリしました。

![parent issue only view](https://i.gyazo.com/6aa5396a24c132e10f8c042a40e3c297.png)

この状態で `Save` をクリックすればいつでもこのビューを表示できます。

## さいごに
GitHub Issues も着実に進歩を重ねていますね。
従来から Issue 内のタスクリストによる進捗の可視化方法がありましたが、Sub-issues と進行状況フィールドを使えば Issue の粒度で進捗が見えるため、便利な局面が多いのではないかと思います。プロジェクト管理に活用してみてはいかがでしょうか。
