---
title: GitHub Copilot が github.com サイト内でも実装されました
author: masahiro-kondo
date: 2024-09-28
tags: [GitHub Copilot, GitHub]
image: true
---

## はじめに

GitHub Copilot が github.com のサイト内の機能に組み込まれました。

[Copilot in GitHub.com now available on Copilot Individual and Copilot Business (Public Preview) · GitHub Changelog](https://github.blog/changelog/2024-09-26-copilot-in-github-com-now-available-on-copilot-individual-and-copilot-business-public-preview/)

現在は公開プレビュー版であり、Copilot の個人ユーザーかビジネスプランのオーガニゼーションユーザーが使えるようになっています。機能の詳細が以下のブログで紹介されています。

[GitHub Copilot now available in github.com for Copilot Individual and Copilot Business plans](https://github.blog/news-insights/product-news/github-copilot-now-available-in-github-com-for-copilot-individual-and-copilot-business-plans/)

GitHub Copilot といえば、VS Code や GitHub CLI に組み込まれて開発をアシストしてくれるものでした[^1]が、ブラウザでの操作もサポートしてくれることになります。さらに Web サイトだけでなく、GitHub Mobile でも Copilot とのチャット機能が提供されました。

[^1]: GitHub CLI の Copilot 機能については、「[GitHub Copilot in the CLI にコマンド入力を手伝ってもらう](/blogs/2024/02/28/github-copilot-in-cli/)」で紹介しています。

Copilot が有効なアカウントでログインしているとページの右下にお馴染みのアイコンが表示されています。

![Copilot enabled](https://i.gyazo.com/f24dcbb0a6461e9bd7ad525e31bf52e3.png)

現在は以下の機能が提供されているようです。

- リポジトリやファイルについての会話
- PR の概要説明のドラフト生成
- Discussion のサマリー生成
- GitHub Actions のエラー解析

## Copilot に色々聞いてみる
ChatGPT と同じような使い方で Copilot と会話できます。日本語にも対応しています。

GitHub の GraphQL API の使い方を質問してみました。

![General Chat](https://i.gyazo.com/43aed6bfb3eb72dd087370a3fa3af1d1.png)

リポジトリの概要についても自然言語で聞くことできます。事前に対象のリポジトリを絞り込んでおきます。

![search repo](https://i.gyazo.com/7d5456ff1661592248bdddca252368d4.png)

:::info
リポジトリが事前に分かっている場合は、リポジトリページの右上のアイコンをクリックすることでもそのリポジトリについての会話を開始できます。

![header icon](https://i.gyazo.com/eb9e0892815b814bcf0327c6fa1c90ab.png)
:::

Apache Kafka のリポジトリを選択して概要を説明してもらいました。

![Explain Kafka](https://i.gyazo.com/67c2948272364f4f02881269f6aedea4.png)

issue も紹介してくれます。

![Show issues](https://i.gyazo.com/138400b199cd8fee1bd68fc3b5e75cc5.png)

`/` コマンドで、会話のスレッドの削除や新規作成が可能です。

![slash commands](https://i.gyazo.com/a0b544aea6a31292e241514ea8817926.png)

会話はスレッドとして保存されますので、過去のスレッドを読み込んで会話の継続も可能です。

![Active Conversations](https://i.gyazo.com/1702def63b69af4a79c330dcf3d6e6c5.png)

ChatGPT などのサービスでは、特定のリポジトリについての最新の情報を聞き出すのはけっこう難しいですが、GitHub にビルトインされた Copilot では実際のリポジトリ情報に基づいて回答してくれるので、大規模な OSS の調査などに役立ちそうです。

## コードの理解をアシストしてもらう
リポジトリの概要だけでなく、コードの詳細についても聞くことができます。ファイルページのヘッダーにも Copilot アイコンがついていて、クリックすることでそのリポジトリの各ファイルに関して質問できます。

![File header icons](https://i.gyazo.com/5f3f0f7a94961296f8c331f132262af8.png)

ファイルの概要、各関数の処理概要も事細かに教えてくれました。

![Explain file](https://i.gyazo.com/ba03edf91b8292b955b306c471edf125.png)

:::info
ファイルについての会話は、リポジトリを絞り込んだ状態で該当のファイルを添付して Copilot に聞く形になります。

![start thread about file](https://i.gyazo.com/bad7cb56dec07d2683d4d9241d04565b.png)
:::

## PR のドラフト作成

最後に PR のドラフト作成を試してみましょう。筆者は個人リポジトリに自分で PR を作る時は特に概要も書かないことが多いです。

:::info
個人リポジトリではレビューなしでセルフマージすることが多いので GitHub の YOLO バッジを頂いてしまいました。

![YOLO](https://i.gyazo.com/667ce08351d9e719ffd10b22fc950145.png)
:::

マージされた過去の PR に説明をつけてもらいました。

こんな感じで説明もなくマージされたけしからん PR を開くと、そこにも Copilot がいました。

![Meraged PR without descripiton](https://i.gyazo.com/81ef73cd9e7ee41c76bf1b91fb57847f.png)

PR の概要説明を生成してくれるメニューが開きます。

![Gen Summary](https://i.gyazo.com/92fe83faddbe9b680134c8e7fd4ade5b.png)

素晴らしくきちんとした説明が生成されました。

![Generated summary](https://i.gyazo.com/58f52c5dccafe62e721f772605279e1e.png)

:::alert
もちろんこの使い方はダメで、レビューに出す PR のドラフト作成時に行うのが正しいです。この記事の PR 作成時に生成されたサマリーは以下のようになっていました。

![This article PR summary](https://i.gyazo.com/ba3b52451aaca5c0768fcc9c66889826.png)
:::

## さいごに
以上、GitHub サイトにビルトインされた Copilot の紹介でした。リポジトリをクローンして VS Code で開くことなく Copilot のアシストが受けられ、すごく便利ですね。

GitHub のように色々な作業をするサイトでは、このような AI によるアシストが普及していくのではないでしょうか。近い将来 AI アシストが組み込まれていない Web UI はクラッシックな UI と感じられる時代が来るのかもしれません。
