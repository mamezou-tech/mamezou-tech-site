---
title: GitHub Projects に Roadmaps が登場 - issue や PR をタイムラインで管理しよう
author: masahiro-kondo
date: 2023-03-28
tags: [GitHub]
---

GitHub Projects のビューに Roadmap が追加されました。

[Roadmaps in Projects are now generally available | GitHub Changelog](https://github.blog/changelog/2023-03-23-roadmaps-in-projects-are-now-generally-available/)

従来の Board(カンバン)、Table(スプレッドシート)のレイアウトに加えて、よりプロジェクト計画・進捗管理に適したレイアウトが追加されたことになります。

## Roadmap レイアウトの選択

新規プロジェクト作成時にレイアウトを選択できます。

![Select template](https://i.gyazo.com/0b3b9d067b8c478333755ffc5bc180e3.png)

既存プロジェクトへの新規ビュー追加時にも選択可能ですし、既存ビューの変換も可能です。

![Select layout](https://i.gyazo.com/f0548e54be9f6beb53f6a443d8fcd619.png)

:::info
Table ビューや Projects のオートメーションについて以下の記事で紹介しています。

- [GitHub Projects がリニューアル - スプレッドシートのビューが利用可能に](/blogs/2022/07/28/github_projects_spreadseets_view/)
- [リニューアルされた GitHub Projects のオートメーションを使ってみる](/blogs/2022/10/22/renewed-github-projects-automation/)
:::

## Roadmap レイアウトの特徴

roadmaps レイアウトでは、アカウント内、オーガニゼーション内の任意のリポジトリの issue / PR / Draft PR をタイムラインに配置して計画と進捗管理ができます。issue に Milestone が設定されていればタイムラインに反映されますし、Roadmap 側でイテレーションを定義して issue や PR を含めることもできます。

Roadmap の利用方法については公式ドキュメントの以下のページに記載されています。

[Customizing the roadmap layout - GitHub Docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/customizing-the-roadmap-layout)

## 計画時の issue 登録
計画フェーズでは、ユーザーストーリーや機能などを issue として登録し、Milestone を定義しておおよそのスケジュールを登録しておくとよいと思います。Roadmap では Iteration を定義してより細かくタイムボックス管理することになります。

以下のように issue と Milestone を登録しました。サンプルなので中身が適当なのはご了承ください。

- サンプルの issues

![issues](https://i.gyazo.com/bc604525ea76e45fca0d04e7e05ef82a.png)

- サンプルの Milestones

![milestones](https://i.gyazo.com/c1895fe0f3d83bad649aff92ebb35ea5.png)


## Roadmap への issue 追加
作成した issue を Roadmap に追加していきます。Roadmap の行追加時にリポジトリを選択して issue を選択して追加することになります。

![Add issue from repo](https://i.gyazo.com/8e966120b22be77941e71566fad89979.png)

issue が未登録の場合はこの画面から登録もできます。

![Add issue after create](https://i.gyazo.com/13640bffcb6a76c4e4baba29d9ffea63.png)

`Add items from <repo>` でリポジトリの issue を一括選択して追加することもできます。

![Add issues](https://i.gyazo.com/8c4ca2f27c0547155c9bc4f88e2fdfd9.png)

必要な issue を追加した状態です。

![issues added](https://i.gyazo.com/312bf483c99fadf83e9f85b3ee781ef6.png)

## Iteration の作成
Iteration は issue の属性ではなく Roadmap 固有の概念です。issue の右の `+` ボタンをクリックすることで iteration を作成できます。

![Add iteration](https://i.gyazo.com/ec02e5b57798ba53286fcc795b0bebec.png)

![Itteration screen](https://i.gyazo.com/a9f74a34e3423992fcd7f81996361538.png)

右上の Settings からも遷移できます。

![Settings](https://i.gyazo.com/8cfaf426d10d685cd57a8b450259be46.png)

以下のように Iteration を定義しました。最初の Iteration を作って week 単位で長さが決まれば、あとは、`Add Iteratioon` をクリックするだけで新しい Iteration を追加して連番も期間設定も自動でやってくれます。「イテレーションじゃなくスプリントがいい」という人は Field name を Sprint にすればよいでしょう。

![iterations](https://i.gyazo.com/b690eb2eeb59dae0e4e46d328812801f.png)

## issue の Iteration への割り当て
次は各 issue を Iteration に割り当てていきます。

Marker で Milestone と Iteration をチェックしておくと、タイムラインに表示されます。

![Markers](https://i.gyazo.com/4c63f220df404386d05f0e4efe0c8faf.png)

タイムラインのズーミングは Month / Quarter / Year から選べますので、全期間を俯瞰しながら割り当て作業を行えます。

![zoom](https://i.gyazo.com/effc8799b3502cbd29a4c2c90d62d9da.png)

issue を iteration に割り当てるには、対象の iteration 期間にカーソルを当てます。期間と iteration 名がポップアップされます。

![assign candate](https://i.gyazo.com/d67431e2436ea805bb9ff2c355a49e8a.png)

クリックで確定します。

![fix assign](https://i.gyazo.com/967af5843395dd8010949f29ee3aad9f.png)

確定後は、ドラッグ＆ドロップで移動できます。

![move assignment](https://i.gyazo.com/728bcb2e5315780f04bbd4b57e02902f.gif)

とりあえず、ストーリーの issue を iteration に割り当ててみました。

![assign complete](https://i.gyazo.com/b78ba78405b2a901020d832ea0608ac7.png)

## グルーピング
Iteration 単位で見やすくグルーピングします。ビューのメニューで group をクリックします。

![group](https://i.gyazo.com/b31da46c341c34c53c9e773ca7ef1745.png)

グルーピングの単位として Iteration を選択します。

![group by iteration](https://i.gyazo.com/f5fe450fb1475de0707c0b248fa4ab46.png)

タイムラインが見やすくなりました。グループは折りたたんで配下の issue を非表示にもできます。

![Grouped view](https://i.gyazo.com/f1841ef56143e2bd0a1def56bc536b5b.png)

## フィルタリング
大規模なプロジェクトでは、issue が多くなり期間も長くなるため、ビューのフィルタリングが必要になります。Roadmap では iteration / 担当者 / 状態などでフィルタリングができます。

iteration によるフィルタリング。

![filter by iteration](https://i.gyazo.com/5eb649c252ab58d1af6b7e3c52332836.png)

issue の担当者(assignee)によるフィルタリング。

![filter by assignee](https://i.gyazo.com/2fbabe2ee04d5d31ccde9935abd4bb6b.png)

issue か PR か、もしくは issue / PR の状態によるフィルタリング。

![filter by status](https://i.gyazo.com/29699f40a210ba87cf2a7b6fb4c2db2a.png)

## 最後に
以上、GitHub Projects の新しい Roadmap レイアウトの使用方法をご紹介しました。今回は1つのリポジトリの issue のみを対象にしましたが、当然マルチリポジトリでも使えますし、PR や Draft PR もタイムライン上で同時に管理にできます。

issue を Excel に転記して進捗報告をしている現場が(もしかしたら現在も)あるかもしれませんが、ここまで GitHub で管理できるならそろそろ脱 Excel も可能かもしれません[^1]。

[^1]: いわゆる「神Excel」だとまだまだ厳しいかもしれませんが。

個人的には Board レイアウトで事足りていますが、Enterprise レベルのプロジェクトではこのような機能が必要とされているのでしょう。今後も機能の追加や改善があることと思います。GitHub を採用している現場のマネージャーのみなさんも試してみてはいかがでしょうか。
