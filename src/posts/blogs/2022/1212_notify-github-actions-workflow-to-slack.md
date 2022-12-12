---
title: Slack の GitHub インテグレーションで GitHub Actions ワークフローのイベントを通知可能に
author: masahiro-kondo
date: 2022-12-12
tags: [CI/CD, GitHub]
---

Slack の GitHub インテグレーションを使えば、PR(Pull Request) や issue のオープンや更新などのイベントを通知できます。PR に Slack からコメントすることも可能です。

![GitHub + Slack](https://i.gyazo.com/f3878bc1e731ac402fb2dba9d66db8bf.png)

[GitHub + Slack](https://slack.github.com/)

先日、GitHub Actions ワークフローのイベントも通知できるようになったことが Changelog に流れていました。

[GitHub Actions workflow notifications in Slack and Microsoft Teams | GitHub Changelog](https://github.blog/changelog/2022-12-06-github-actions-workflow-notifications-in-slack-and-microsoft-teams/)

これまではワークフローにサードパーティの Action を組み込んで実現していた部分ですので、気になる方も多いのではないでしょうか。

この記事では GitHub インテグレーションの導入、ワークフローイベント通知の登録と実際の使用感を見ていきます。

:::info
Changelog には Microsoft Teams でも同様にワークフローイベントの通知が受けられるようになったことがアナウンスされています。この記事では Slack 通知について記述します。
:::

[[TOC]]

## GitHub リポジトリからの通知の種類
GitHub + Slack Integration の README に通知の種類や設定方法の詳細があります。

[slack/README.md at main · integrations/slack](https://github.com/integrations/slack/blob/main/README.md)

GitHub インテグレーションでは以下のイベント通知がデフォルトで有効になっています。

- `issues` : issue のオープンとクローズ
- `pulls` : PR の作成・マージ、ドラフト PR が "Ready for Preview" になった時
- `commits` : デフォルトブランチ(通常は main) への新規コミット
- `releases` : リリースの公開
- `deployments` : (GitHub Actions による) デプロイ状態の更新

以下のイベント通知はデフォルトで無効になっています。なので今回の新機能であるワークフローイベント通知はデフォルトでは無効化されています。

- `workflows` : GitHub Actions ワークフローの実行通知(今回の新機能)
- `reviews` : PR レビュー
- `comments` : PR と issue への新規コメント
- `branches` : ブランチの作成と削除
- `commits:*` : 全てのブランチに push された全てのコミット
- `+label:"your label"` : issue、PR、コミット に付与されたラベルによるフィルター
- `discussions` : ディスカッションの作成と回答

## GitHub インテグレーションの導入

Slack 画面の左下 `アプリを追加する` から開始します。

![アプリの追加](https://i.gyazo.com/e46a62ebd563e83b3687f6a50eced254.png)

アプリ検索で GitHub を探して `Slackに追加` をクリックします。

![Slackに追加](https://i.gyazo.com/5c63000619515204401c7ac630903aab.png)

Slack ワークスペースへのアクセスを許可します。

![アクセスを許可](https://i.gyazo.com/470203f7427f2af16ea807678464dbef.png)

Slack 上で GitHub との DM が開きますので、`Connect GitHub account` をクリックします。

![Connect GitHub accont on Slack](https://i.gyazo.com/175c82a9aa178266a1930677bd2a5f8a.png)

接続画面の `Connect GitHub account` をクリックします。

![Connect GitHub account](https://i.gyazo.com/d63937c4e385c21ba983efc07abb2634.png)

表示される Verification Code をクリップボードにコピーします。

![Verification Code](https://i.gyazo.com/70df5a0638f903c7b5d34b511ff629bb.png)

Slack の画面に戻って `Enter code` をクリックします。

![Enter code](https://i.gyazo.com/5e53d897e6231250578b2f5c198576f3.png)

クリップボードにコピーしたコードを貼り付けて `送信` をクリックします。

![Enter verification code](https://i.gyazo.com/0d6bd1d48631c167a38da79d13e142ea.png)

成功すると GitHub のメッセージがコマンドの使い方などのサンプルとともに表示されます。

![Connection succeed](https://i.gyazo.com/b3496144e464b55aa018dc7ae271ce83.png)

## Slack チャネルを GitHub リポジトリにサブスクライブする
ここからは [Slack のスラッシュコマンド](https://slack.com/intl/ja-jp/help/articles/201259356-Slack-のスラッシュコマンド)を使用して設定を行います。

通知を受けたいチャネルに GitHub アプリを招待します。

![invite @GitHub](https://i.gyazo.com/d0753b65e88bf1537bdf274668dea2ac.png)

![GitHub added](https://i.gyazo.com/42b56d136f2d354313a38f63bdec2811.png)

`/github subscribe <owner>/<repo>` で通知を受けたいリポジトリにチャンネルをサブスクライブします。

![subscribe](https://i.gyazo.com/b13b0288a74985b0e5433e1e83d2d91a.png)

うまくいけば、デフォルトの `issues`、`pulls`、`releases`、`deployments` の通知がが有効になった旨のメッセージが表示されます。もちろん、イベントを個別に subscribe、unsubscribe できます。

## リポジトリのワークフローイベントにサブスクライブする
では、GitHub Actions ワークフローのイベントにもサブスクライブしましょう。以下のようにすると、対象のリポジトリのワークフロートリガーイベントが通知されます。デフォルトで通知されるイベントは、`pull_request` です。

```shell
/github subscribe owner/repo workflows
```

通知をフィルターしたい場合、以下のようにフィルター条件を JSON 形式で指定します。

```shell
/github subscribe owner/repo workflows:{name:"your workflow name" event:"workflow event" branch:"branch name" actor:"actor name"}
```
- `name`: ワークフロー名
- `event`: ワークフローが起動される全てのイベント[^1]
- `actor`: ワークフローを起動、またはワークフローの実行責任を持つ人
- `branch`: ワークフローが実行されるブランチ。PR イベントの時は PR のターゲットブランチ(デフォルトは main)が対象になる。

[^1]: 全てのイベントは [https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#available-events](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#available-events) に記述されています。

通常は PR 作成がトリガーになるため、フィルターはワークフロー名の指定だけで十分でしょう。README には書かれていませんでしたが、ワークフローを複数指定したい場合は、カンマ区切りで可能です。

```shell
/github subscribe owner/repo workflows:{name: "workflow-1,workflow2"}
```

ワークフローの通知を登録すると、デフォルトで有効化されている通知に加えワークフローの通知が有効化されたことがわかります。

![ワークフロー通知を登録](https://i.gyazo.com/b90cd2408cbf5aa7d4b5fdf891a4b3b3.png)

## 利用イメージ
豆蔵デベロッパーサイトの運用チャネルを Slack に作り GitHub からの通知を流しています。ホスティングしている Netlify のビルド結果も連携しています。ワークフローの起動から、PR 作成からサイトのビルドまでの一連の動きが通知されます。通知には、ワークフローへのリンクやトリガーになったコミットへのリンク、Checks(ビルドやテスト結果など) の状況も記載されているので GitHub のワークフローの画面を見に行く必要もありません。失敗した場合は、Slack 画面からリランも可能です。


![デベロッパーサイトのSlackチャネルへの通知](https://i.gyazo.com/9f0aa45d36c26fc0ab066900ec91cfb0.png)

ワークフロー起動と実行結果の投稿はスレッドになりますのでトレースしやすくなっています。途中結果はスレッド内だけ、結果はチャネルにも投稿といった具合で Slack に最適化されていますね。

![スレッド](https://i.gyazo.com/091914029faefeb9df4284f58fba3d95.png)

## まとめ
Slack の GitHub インテグレーションに追加されたワークフローイベント通知の設定方法と利用イメージを紹介しました。

今年の2月の記事「[GitHub Actions ワークフローにおけるジョブ制御](/blogs/2022/02/20/job-control-in-github-actions/)」では、Slack への通知のためのジョブを作り、先行ジョブの成功・失敗を保持してメッセージを出し分けるようにしていました。さらに通知のための Action を使用していました[^2]。
通知したい内容にもよりますが、結果通知だけならこのようなジョブは不要で、Slack のインテグレーションを使う方が楽で使いやすくなりました。

[^2]: GitHub の Marketplace には [ワークフローから Slack 通知するための Action](https://github.com/marketplace?type=actions&query=slack+workflow+) が記事執筆時点で26個もありました。
