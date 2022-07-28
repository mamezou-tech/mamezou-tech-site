---
title: GitHub Projects がリニューアル - スプレッドシートのビューが利用可能に
author: masahiro-kondo
date: 2022-07-28
tags: GitHub
---

先日「[GitHub Projects の Automated kanban で issue 管理を楽にする](/blogs/2022/07/12/using-github-projects-automated-kanban/)」の記事を投稿した時はまだベータ版でしたが、GitHub Projects のリニューアル版が GA になりました。

[Planning next to your code - GitHub Projects is now generally available | The GitHub Blog](https://github.blog/2022-07-27-planning-next-to-your-code-github-projects-is-now-generally-available/)

個人アカウントやオーガニゼーションの Projects タブも新しくなりました。

![リニューアルされた Projects タブ](https://i.gyazo.com/7573ce35b07e4ff1426390f5aae47294.png)

新しい Projects の目玉はやはりスプレッドシートのような画面でしょう。ブログに掲載されたスクリーンショットを引用します。

![スプレッドシートビュー](https://github.blog/wp-content/uploads/2022/07/Image-1-fixed.png)

複数のリポジトリをまたがって issue や PR を並べ、Status / Assignees / Milestones などの列で状況を把握できます。規模の大きい開発プロジェクトでは複数のリポジトリの状況を把握する必要があるため、この一覧性の高さは、特にマネージメントの人には嬉しい機能でしょう。（issue を Excel シートに転記し朝会でスクリーン共有して担当者に進捗を確認しているマネージャーを筆者は見たことがあります。）

GitHub とは別の Excel などのアプリケーションで管理するのは非効率です。ブログにもこうあります。

> **コードが存在する一元化された場所で**、プランニング、コラボレーション、トラッキングします。

早速会社の GitHub オーガニゼーションで自分のプロジェクトを作成してみました。

セルに issue などのアイテムを追加していきます。

![アイテム追加1](https://i.gyazo.com/c22917433b354461839059ffacbeef28.png)

`#` でリポジトリの候補が出て選択できます。

![アイテム追加2](https://i.gyazo.com/93c265af9637b8b8085feb189111c2c3.png)

リポジトリを選択すると issue や PR の候補が出て選択できます。

![アイテム追加3](https://i.gyazo.com/47503d9fe338860ef75b84b56cdfa5e7.png)

複数のリポジトリから issue を Project に追加してみました。

![issue を追加した画面](https://i.gyazo.com/9dd0958ee000cfefd92e901aa37d9100.png)

カラムを追加できます。

![カラムの追加](https://i.gyazo.com/198841021fdb4da6ff0c45072275270f.png)

グルーピングも可能です。

![グルーピングの選択](https://i.gyazo.com/6604328a46dab90ab67c49bd2f666c6e.png)

リポジトリ毎にグルーピングしてみました。

![リポジトリでグルーピング](https://i.gyazo.com/3765bc69a055c9af48591792dc9e35f9.png)

タイトルのキーワードなどでフィルタリングもできます。

![フィルタリング](https://i.gyazo.com/79f871deb1e220a9a379eeb3641552cf.png)

けっこう頑張ってスプレッドシートしてます。「集計マクロ使ったり、カミナリ線引いたりできないんでしょ」などというマネージャーはさておき、プロジェクト串刺しで一覧できるのはやはり便利そうですね。

画面右上の📈アイコンをクリックすると Insights のチャートを表示したり、カスタムチャートを作成したりできます。

筆者の project では直近データが少なくてグラフが出ないので、ブログに掲載されたスクリーンショットを引用します。

![Insight のグラフ](https://github.blog/wp-content/uploads/2022/07/image3.png)

従来の Kanban タイプのボードも使えます。

新しい View のタブを追加し、Table ではなく Board を選択します。

![Board View の追加](https://i.gyazo.com/ec085df867d39c44c57896ec4c692b06.png)

![Borad View](https://i.gyazo.com/d2047ab5632c737e94698dada04b9c1c.png)

以下のブログでは、個人の生産性を向上するというテーマで、Projects の利用方法が紹介されています。

[Tips &amp; tricks for using GitHub Projects for personal productivity | The GitHub Blog](https://github.blog/2022-07-21-tips-tricks-for-using-github-projects-for-personal-productivity/)

旧 Project からの移行については、以下のドキュメントに手順があります。

[Migrating from projects (classic) | GitHub Docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects/creating-projects/migrating-from-projects-classic)

新しくなった Projects よさそうです。プロジェクトのミーティングなどで早速活用していきたいですね。
