---
title: GitHub 公式 GitHub Actions extension for VS Code を試す
author: masahiro-kondo
date: 2023-04-16
tags: [vscode, GitHub, CI/CD]
---

先月末に VS Code の GitHub Actions 拡張のリリースがアナウンスされました。

[Announcing the GitHub Actions extension for VS Code | The GitHub Blog](https://github.blog/2023-03-28-announcing-the-github-actions-extension-for-vs-code/)

これまで、サードパーティ製の GitHub Actions 拡張はありましたが、GitHub 公式のは初だと思います。

[GitHub&#32;Actions&#32;-&#32;Visual&#32;Studio&#32;Marketplace](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-github-actions)

GitHub Actions の Web UI に慣れているのでスルーしていましたが、インストールして試してみました。

## VS Code からのサインイン
GitHub Actions 拡張を利用するには VS Code からの GitHub へのサインインが必要です。

![sign in](https://i.gyazo.com/cec11fdd781dba856ad4e39129382d42.png)

ブラウザで認証画面が開きますので、VS Code からのサインインを承認します。

## 拡張の画面構成
GitHub Actions ワークフローを含むプロジェクトのワークスペースを開き、GitHub Actions 拡張のビューに切り替えると、3つのペインで構成されています。

![extension pain](https://i.gyazo.com/fb820e527a39e8b3f46ecdc4f77443cc.png)

一番上の `current branch` のペインでは、git checkout しているブランチでの全てのワークフロー実行履歴を確認できます。リランもできます。

真ん中の `workflows` のペインでは、リポジトリ内の全てのワークフロー定義と実行履歴を確認できます。実行も可能です。ジョブごとの実行ログを VS Code のエディタペインで開くこともできます。

一番下の `settings` のペインでは、リポジトリ内のワークフロー設定の確認と更新が行えます。

## current branch ペインでの操作
current branch ペインで checkout しているブランチのワークフロー履歴を確認します。ビルド番号配下に実行された全てのジョブ、ジョブ内のステップの実行結果が表示されます。ポップアップで実行日時やトリガーが表示されます。🌐 のアイコンをクリックすると当該ジョブの実行結果の Web UI を開きます。

![history](https://i.gyazo.com/b6f046fd1ef1770d8be03c8d7cf70654.png)

実行履歴からジョブを選択してリランすることもできます。

![rerun](https://i.gyazo.com/07a4807ac6d9be83fab1e9909a18676e.png)

リランを実行すると、ジョブの実行中でステップごとに進捗していく UI になりました。

![rerun2](https://i.gyazo.com/44b73014ca0fa51be50f7eac32cf4cd6.png)

:::info
このジョブをリランした時の進捗は実際の実行とちゃんと同期しておらず、リフレッシュボタンで更新したら全て完了していたといった挙動でした。この辺りは改善されていくかもしれません。
:::

current branch ペインは実行実績のあるワークフローのリラン用といった感じです。

## workflows ペインでの操作
workflows ペインでは、ワークフロー毎の定義の確認、実行のトリガーが可能です。実行履歴からは、current branch ペイン同様リランも可能です。

![context menu](https://i.gyazo.com/79533be10dc75d8e43440f2ecb542c94.png)

ワークフローを選択した状態でコンテキストメニューから `Open workflow` でワークフローファイルを開きます。

ワークフローの編集画面では、構文チェックもしてくれてエラー内容もわかりやすくなっています。

![Error message](https://i.gyazo.com/f9431d2d8b91a63e7e2e98f71f5124a3.png)

また、Action を使用している場合、そのリポジトリを簡単にブラウザで開くことができます。

![Open Action URL](https://i.gyazo.com/65e88cfed7fa57787b23463ee82cfd54.png)

コンテキストメニューの `Trigger workflow` でワークフロー実行をトリガーします。

:::info
ワークフローの実行をトリガーするにはワークフローで `workflow_dispatch` によるマニュアルトリガーが定義されている必要があります。
:::

ジョブの右側のアイコンをクリックすると実行ログを VS Code 上で確認できます。

![show log](https://i.gyazo.com/1af1de85d5b1d77a8514f9d8c0bb1d5e.png)

Web UI よりもログが見やすい感じです。

![open log](https://i.gyazo.com/ecafc181ea7722128d2050644cef05e7.png)

workflows ペインは、文字通りワークフローの開発のための機能を提供しています。構文チェックなどは GitHub の Web UI で編集していても有効ですが、Action へのジャンプや実行トリガーまでサポートしているのはさすが公式提供の拡張といったところでしょう。

## settings ペインでの操作
最後に settings ペインです。リポジトリの Environments(環境定義)、Secrets(シークレット)、Variables(環境変数・構成変数)を確認できます。シークレットや環境変数については追加・編集が可能です[^1]。

[^1]: 追加や変更には権限が必要です。

![Secret](https://i.gyazo.com/62cbea068645fe592bafb59f7346aac0.png)

以前の記事、「[GitHub Actions - 構成変数(環境変数)が外部設定できるようになったので用途を整理する](/blogs/2023/01/16/github-actions-configuration-variables/)」で設定に使用したリポジトリを開くと、全ての環境定義(development/production/staging)ごとの環境変数、リポジトリ単位の環境変数、オーガニゼーション単位の環境変数も確認できました。

![Environment variables](https://i.gyazo.com/fac9c9adb66ee8fab26f33db0bb2fca4.png)

settings ペインで設定作業を行えば Web UI で作業するより素早く操作ができそうですね。

## 最後に
以上、VS Code の 公式 GitHub Actions 拡張のファーストインプレッションを書いてみました。VS Code 上で設定まで含めてほとんどの作業が完結できそうです。Web UI を全く開かずに作業ができるということはないとは思いますが、ワークフロー開発作業は捗るのではないかという印象です。
