---
title: GitHub Copilot のエージェントモード(パブリックプレビュー)を試す
author: masahiro-kondo
date: 2025-02-16
tags: [AIエージェント,GitHub Copilot, vscode]
image: true
---

## はじめに
GitHub Copilot のエージェントモードが覚醒したそうです。

@[og](https://github.blog/news-insights/product-news/github-copilot-the-agent-awakens/)

紹介ビデオも YouTube に上がっています。

<iframe width="560" height="315" src="https://www.youtube.com/embed/of--3Fq1M3w?si=p7HCmjJYvpVsOliV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

GitHub Copilot のエージェント、どんなものか使ってみたいと思います。

:::info
昨年のアドカレ記事でも今年2025年は、エージェントがくると予想されていました。

@[og](/blogs/2024/12/04/openai-swarm-multi-agent-intro/)
:::

## 利用の準備
記事執筆時点では、リリース版の VS Code ではなく Insiders 版が必要になりますので、以下のリンクから VS Code Insiders 版をダウンロード、インストールします。[^1]

@[og](https://code.visualstudio.com/insiders/)

[^1]: Insiders をインストールしてもリリース版の VS Code には影響しませんのでご安心ください。

VS Code Insider 版を起動したら GitHub Copilot Chat 拡張の Pre-Release 版をインストールします。拡張のタブで "Copilot Chat" で検索するとトップに出てきます。

![Install GitHub Copilot Chat Pre-Release](https://i.gyazo.com/ab949401efa609baafceac984976b6a2.png)

Copilot を利用するため、有効なサブスクリプションを持つ GitHub アカウントでサインインします。

![Sign in with GitHub](https://i.gyazo.com/848c132eb54c47d645693579e84479f9.png)

Copilot の設定で、Agent が有効になっていることを確認します。

![Settings](https://i.gyazo.com/76aacce1da4d0468ce44bb741d8228cb.png)

Copilot Edits モードを開きます。

![Open Copilot Edits](https://i.gyazo.com/b4e0f8c139e01aaaf3e0ce7f4b4d0bae.png)

自律的に作業を行うエージェントモードでは、従来型の Chat UI ではなく、作業セットのファイルを直接編集可能な Copilot Edits がフィットするのだと思います。

:::info
Copilot Edits については以下の記事で紹介しましたのでご参照ください。

@[og](/blogs/2025/02/15/refactor-code-with-github-copilot-edits/)
:::

プロンプト入力ボックスの下部にあるオプションで、Edit から Agent にスイッチします。

![Switch to Agent](https://i.gyazo.com/59b0cdc7cf175b70a32173aed271fd6c.png)

こうすることで、Copilot Edits が エージェントモード (Experimental) になります。

![Agent Mode Panel](https://i.gyazo.com/a5805735f8b80a9535280d50cb8c65a7.png)

せっかくなので、モデルも GPT 4o ではなく Claude 3.5 Sonnet (Preview) を選んでみました。

![Cloude](https://i.gyazo.com/caf9c20f6014767a5732720a02d55770.png)

## エージェントモードを利用して簡単なアプリを作ってみる
エージェントなのでちょっと高度なことをやってもらおう、ということで以下のような指示を出してみました。

「Nuxt 3 で ToDo を管理するサイトを作って。データは SQLite に保存するようにして。」

最初 Sonnet を有効にするダイアログが出ましたので Enable を押しました。

![Enable sonnet](https://i.gyazo.com/1ae71ec613e0496b308956c731e93f2d.png)

次に Nuxt アプリを生成するためのコマンドの実行が提案されました。

![Create Nuxt app](https://i.gyazo.com/d5e68389c41f2f8712a9fce5b162f7cd.png)

Continue をクリックすると実際にコマンドが実行されます。コマンド実行の間は待ち状態になります。

![waiting for executing CLI](https://i.gyazo.com/927d1c92faeeeb7c5b6e188d98eaba5c.png)

ターミナルで Nuxt プロジェクトの生成が開始され、パッケージインストールとプロジェクト生成を行います(nuxi の実行では通常通り人間がパッケージマネージャの選択などを行います)。

![npx nuxi](https://i.gyazo.com/336031d7f102eec7e0a8c858179c3d03.png)

プロジェクト作成の次は SQLite 関連のインストールだそうです。言われるがままに Continue します。

![Install SQLite](https://i.gyazo.com/f535f239760b72fe5f7a086821d2558c.png)

ターミナルでは、パッケージがインストールされていきます。

![Install npm packages](https://i.gyazo.com/64f52741c0eed17a47df4cb175f05a7b.png)

プロジェクト作成と必要パッケージのインストールが完了すると、アプリが怒涛の勢いで作成されていきます。最後に、開発サーバーの起動を促されます。

![Building App and run app](https://i.gyazo.com/d62258c02679942f0cdb2f18a528bc99.png)

この時点でプロジェクトには作成されたファイルが追加されています。

![Explorer](https://i.gyazo.com/3398ad498474aace2961b2b36b944906.png)

とりあえず、開発サーバーを起動してみました。

![npm run dev](https://i.gyazo.com/b1145b992887b7a125be99d6719ec0dc.png)

アプリが利用できるようになりました。

![ready to use](https://i.gyazo.com/fbb4a889597bd696e8f60ef61de7e369.png)

localhost:3000 に接続するとアプリが表示されました。

![Open App](https://i.gyazo.com/d7a5e0ce31dfdabc60b0786a697eccbe.png)

試しに ToDo を入れて追加ボタンを押してみましたが、反応がありません。

![Cannot add todo](https://i.gyazo.com/54326d2dfc6d9b59b1d94d9163b523d0.png)

ターミナルに、todos テーブルがないというエラーが出ています。

![Error message](https://i.gyazo.com/5c82ac17a3f55dc2385d0a1ae48d97ce.png)

## 実行エラーを修正する
さて、怒涛の勢いでアプリが出来ましたが、うまく動作しませんでした。そこでターミナルのエラーメッセージをコピーし、プロンプトに貼り付けてみました。Dizzle ORM のマイグレーションでテーブルを作成するそうです。

![recover from error](https://i.gyazo.com/0b44b3217e4e5a99a31d4d030a41969f.png)

Continue すると、ターゲットのターミナルのカレントパスが違っていたためかエラーになってしまいました。

![Command execution error](https://i.gyazo.com/0a03d2f9b99e78cd1d248e76a70e5cc4.png)

実行エラーを検知して代案を出してくれましたので Continue します。

![retry command](https://i.gyazo.com/4baf8004ab247f78bb4bb07a1a18ad72.png)

非推奨の警告は出ましたが、成功したようです。

![dizzle-kit](https://i.gyazo.com/5ac64f3d63ea2a25fbb6738f36a63bdc.png)

コマンドの成功を検知して、開発サーバーが再起動が促されましたので Continue。

![Rerun app](https://i.gyazo.com/1fbcd794476e5166411ab7d375a975b6.png)

今度はめでたくちゃんと動きました。

![ToDo App worked](https://i.gyazo.com/1ad6e284883a01eb2d536e60b10fa3af.png)

## 仕様を追加する
もうエージェントモードの威力は十分に確認出来ましたが、せっかくなのでちょっとした機能追加をやってもらいます。

「ToDo の項目に期日を追加したい。期日のデフォルトは当日日付。カレンダーコントロールで入力できるようにしたい。」というプロンプトを投入してみます。

![Add feature](https://i.gyazo.com/5c1d686c5d98c32d149c88985b27fc70.png)

また、怒涛の勢いでタスクが計画・実行され、コードの修正が完了しました。あとはデータベースを初期化して再起動するだけです。

![Feature implemented](https://i.gyazo.com/6045f5d20cef11215e3c13984729e513.png)

筆者のオペミスで、データベースが作られませんでした。困ったのでプロンプトで、コマンドを教えてもらいました。

![Ask DB initialize command](https://i.gyazo.com/0a72bfdb1552ca93c5ab846b886d3a56.png)

DB は成功したのですが、起動時エラーになりましたので、エラーメッセージを貼り付けて訊いてみました。

![Fix error](https://i.gyazo.com/792a2c65acb2f964cd8c2213aeb25f9c.png)

すぐに自身の生成したコードの問題点を発見し直してしまいました。そして要望通りの機能が追加されています。

![Updated app](https://i.gyazo.com/1aa52e53d3f36a24a830cd900d688e79.png)

## さいごに
以上 Copilot のエージェント機能を試してみました。アプリの生成や機能追加に要した時間はそれぞれ数十秒といったところです。紹介した通り、非常に自律的に振る舞っており、エージェントの名に恥じない機能となっていました。エラーが発生しても、フィードバックしてあげることで自律的にコード修正をしてくれます。有能すぎる。
