---
title: VS Code の Copilot Edits で効率的にリファクタリングを行う
author: masahiro-kondo
date: 2025-02-15
tags: [GitHub Copilot, リファクタリング, vscode]
image: true
---

## はじめに
GitHub Copilot の開発目標は、AI ペアプログラマーを提供することで開発者の生活を楽にすることだそうです。

VS Code の GitHub Copilot 拡張では編集中のファイルに対して、コード変更をサジェストしてくれます。これとは別に Chat の UI で、プロンプトを書いて1からコード生成してもらい、それを利用するワークフローもあります。

VS Code の Copilot Chat でコードを生成してもらうのは楽なのですが、Chat UI で作業していると、少しだるいと感じることがないでしょうか。

1. プロンプトを書いて送信
2. コードが新規生成される
3. コードを確認
4. 直して欲しいところがあれば追加のプロンプトで指示
5. コードが頭から再生成される
6. コードを確認
7. 結果がよければ編集中のプロジェクトに生成されたコードをマージ

のように、プロンプトの発行、コードの全量生成、コードの確認を繰り返すことになり、Chat の UI 上にコードを全量生成されるのを毎回眺めることになります。まあ、人間がコードを書くのに比べ100倍とかのスピードなわけですが、目の前のコードがダイレクトに変わってくれた方がよいですよね。

## Copilot chat での生成ファイル直接表示・反復処理

少し前の GitHub ChangeLog で GitHub の Web サイトの Copilot Chat 内でファイルを直接的に反復処理する機能 (View and Iterate Generated files) がプレビューとして発表されました。

@[og](https://github.blog/changelog/2025-02-05-view-and-iterate-on-generated-files-directly-within-copilot-chat-preview/)

従来の VS Code 内の Copilot Chat と同様、毎回全量生成だったのですが、1度生成したファイルをベースとして、プロンプトにより更新された内容が直接反映されるようになっています。

:::info
GitHub サイトでの Copilot Chat については以下の記事で紹介しています。

@[og](/blogs/2024/09/28/github-copilot-in-github-com/)
:::

プロンプトで「ファイルを作って」、「ファイルを生成して」など、ファイル生成を指示するセンテンスを入れると、直接表示・反復処理モードになります。

「2024年の JavaScript 10大ニュースを含む Markdown ファイルを作成して」というプロンプトの実行結果です。従来の Chat UI の右側のパネルに、生成されたファイルが表示されました。

![View and Iterate 1](https://i.gyazo.com/77313d6025ab75a0eadc113861040e29.png)

Chat UI 側では、ファイルを生成するためのステップの計画と実行結果が書かれています。右のパネルに表示された Markdown ファイルが成果物ということになります。

タイトルは日本語なのに本文が英語とちぐはぐなので、追加のプロンプトで、「本文も日本語でお願い」とすると、同じファイルが書き換えられました。

![View and Iterate 2](https://i.gyazo.com/1be02f320116a2cdc9be2b606a56bcb4.png)

以上のように、Copilot Chat on GitHub.com では、生成ファイルを直接的にプロンプトで編集できるようになっています。

## VS Code で Copilot Edits が GA に

VS Code でも View and Iterate できればいいのにと思っていたら、先日 GitHub Copilot Agent の発表時に Copilot Edits という機能が GA になりました。

@[og](https://github.blog/news-insights/product-news/github-copilot-the-agent-awakens/)

Copilot Edits では、対象のファイルを VS Code で開いた状態でインタラクティブにプロンプトを発行し、ファイルを修正できます。

VS Code のドキュメントでは以下のページに説明があります。

@[og](https://code.visualstudio.com/docs/copilot/copilot-edits)

:::info
GitHub Copilot エージェントモードの記事も書きました。

@[og](/blogs/2025/02/16/try-github-copilot-agent/)
:::

## Copilot Edits の利用開始
Copilot Edits を使うには、VS Code で GitHub Copilot 拡張をインストールして、GitHub Copilot のサブスクリプションが有効な GitHub アカウントでログインしておく必要があります。左下のプロフイールアイコンのメニューが以下のようになっていれば OK です。

![Sign in](https://i.gyazo.com/3a2aeeac8f7e01b43d81f79f11381ff2.png)

VS Code の Copilot アイコンをクリックしてメニューから「Copilot Edits を開く」を選択します。

![Open GitHub Copilot Edits](https://i.gyazo.com/69de8f32a33f71901df544d4f14efff8.png)

Copilot Edit は従来の Copilot Chat の画面とあまり変わりませんが、編集中のファイルをアタッチする UI がついています。この「作業セット」に対象のファイルを含めてプロンプトを書くことで、Copilot と共同作業で対象のファイルを編集していくことができます。

![Edit with copilot](https://i.gyazo.com/74a12ac779168465dd1a64f59cdee506.png)

## Copilot Edits でリファクタリング作業を行う
コードリファクタリングでは、複数のファイルを同時に編集しますし、結果的に新しいファイルが生まれたりします。これを従来の Chat UI でやっていると、ファイルの操作やコピペ操作が多発してかなり面倒です。

Java で書かれた、あまりよろしくないコードを Copilot Edit でリファクタリングしてみます。[^1]

[^1]: このよろしくないコードは GitHub サイトの Copilot に View and Iterate モードで書いてもらいました。

対象のファイルを開くと作業セットに追加されます。

![Open files](https://i.gyazo.com/c192e4c4f532b863eca04ac3a265138c.png)

作業セットに、さらに別のファイルを追加したい場合、`+ファイルの追加` をクリックすると候補から選択できます。

![Add file](https://i.gyazo.com/7df319ec6104abb84db205960c6f7173.png)

このように作業セットに複数の関連するファイルを含めることができます。

![Added files](https://i.gyazo.com/c4d59771b0c8695d27b1024f0e0b9190.png)

では、リファクタリングをプロンプトで指示してみましょう。

コードの詳細は示しませんが、Employee というデータクラスと、EmployeeManager という管理クラスで、EmployeeManager が色々な機能を持ちすぎてやや複雑になっている状態です。

「EmployeeManger が大きいのでいくつかのクラスに分割してください。」というプロンプトを投げてみました。

![First refactor](https://i.gyazo.com/ae2aac8531f8e58b43505960556f3ed8.png)

EmployeeManager から3つのクラスが切り出され、4つのクラスに分割されました。もちろん、プロジェクトに新しいファイルとして追加されています。ファイル毎に変更箇所が確認でき、「承認」「破棄」を決定することができます。作業セットのエリアで「採用」をクリックすることで一括で変更を承認することができます。

いったん「採用」をクリックして Copilot のリファクタリングを受け入れました。

EmployeeUpdater というデータクラスの属性を更新するだけの(しょうもない)クラスができてしまっています。

![EmployeeUpdater](https://i.gyazo.com/953db4fd06af176fe4991d0fcaf30e4a.png)

これは、リファクタリング前の EmployeeManager が属性毎の更新メソッドを公開していたからでしょう。

「EmployeeManager の Employee 更新メソッドを廃止して、Employee を受け取って更新するメソッドに変更し、EmployeeUpdater は廃止で。」というプロンプトを投げ込んでみました。

EmployeeManager のメソッドはなんとなく意図通りに統廃合されました。

![refactor update method](https://i.gyazo.com/069a5bab5130a6dc0c18b606f0333200.png)

EmployeeUpdater は削除可能とマークされました。

![remove EmployeeUpdater](https://i.gyazo.com/0dc403a254a4106766d29f65e85c4056.png)

クラスは程よく分割されましたが、ちょっとコードにレガシー感があるので、「employee パッケージのコードを改善して。」というプロンプトを発行してみました。

![improve code](https://i.gyazo.com/0858996b9f21d32075e19b5c81ab8561.png)

Stream を使った可読性の高い感じのコードにしてくれています。

最後に、テストコードを追加してみます。「employee パッケージに単体テストを追加して」とお願いしました。テストコード生成後に「テストケースに @DisplayName を追加して」とお願いすると全てのテストメソッドに一括で追加してくれました。

![Add Test code](https://i.gyazo.com/3e9fd6e68500930779dcb4bba34eb3ce.png)

もちろん書かれたテストは全て成功しました。

:::info
この記事ではかなり適当にプロンプトを投げていますが、GitHub Copilot でリファクタリングをどのように行えばよいかという指針については以下のブログで解説されています。

@[og](https://github.blog/ai-and-ml/github-copilot/how-to-refactor-code-with-github-copilot/)
:::

## さいごに
以上、Copilot Edits を少し試してみました。かなり凄いですね。本当にペアプロで手早くコードを書いちゃう人をドライバーにしてナビ役をやってる感じになっています。

開発者の生活を楽にしてくれる反面、自力でリファクタリングする機会が失われ、その結果、ナビもうまくできない開発者が増えてしまうのではないかという懸念も感じました。
