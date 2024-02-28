---
title: GitHub Copilot in the CLI にコマンド入力を手伝ってもらう
author: masahiro-kondo
date: 2024-02-28
tags: [Copilot, GitHub]
---

## はじめに

GitHub Copilot は VS Code などのコードエディタの拡張として機能します。GitHub Copilot in the CLI を使用すると、ターミナルでのコマンド入力においても Copilot の支援を受けることができます。

GitHub の Blog でも動画付きで紹介されています。

[10 unexpected ways to use GitHub Copilot](https://github.blog/2024-01-22-10-unexpected-ways-to-use-github-copilot/)

GitHub Copilot in the CLI は GitHub CLI (gh) の拡張 (gh-copilot) として提供されています。長いので 以降は gh-copilot と表記します。

gh-copilot では、ターミナル上でチャットに近いインターフェースで質問して回答を得ることができます。質問は GitHub の API に送信され Copilot の言語モデルで解析され回答が返却されます。

gh-copilot のドキュメントは以下にあります。

[GitHub Copilot in the CLI について - GitHub Docs](https://docs.github.com/ja/copilot/github-copilot-in-the-cli/about-github-copilot-in-the-cli)

:::info
gh-copilot は記事執筆時点ではパブリックベータです。利用するには、GitHub Copilot Individual サブスクリプションが必要です。筆者は Individual サブスクリプションを利用しています。
所属しているオーガニゼーションが GitHub Copilot Business サブスクリプションを持ち、かつ gh-copilot 有効化している場合も利用可能です。
:::

## インストール
事前に GitHub CLI のインストールが必要です。GitHub CLI のインストールについては GitHub リポジトリで README の Installation セクションを参照してください。macOS の場合は、`brew install gh` でインストールできます。

[GitHub - cli/cli: GitHub’s official command line tool](https://github.com/cli/cli)

GitHub CLI で GitHub にログインしている必要があります。ログインしているかを確認するには `gh auth status` を実行します。ログインしている場合、アカウントの状態、PAT と PAT のスコープなどが表示されます。ログインしていない場合は、`gh auth login` でログインします。

```shell
$ gh auth status
github.com
  ✓ Logged in to github.com account kondoumh (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token: gho_************************************
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'
```

gh-copilot をインストールします。

```shell
gh extension install github/gh-copilot
```

以下のように出力されればインストール成功です。

```
✓ Installed extension github/gh-copilot
```

最初に `gh copilot` を実行すると GitHub に利用データの収集を許可するかを確認するメッセージが出ますので、Yes を選択します。

```
? Allow GitHub to collect optional usage data to help us improve? This data does not include your queries.  [Use arrows to move, type to filter]
> Yes
  No
```

## gh-copilot の主要コマンド

gh-copilot を実行すると以下のようなメッセージとプロンプトが出ます。

```
Welcome to GitHub Copilot in the CLI!
version 0.5.4-beta (2024-01-04)

I'm powered by AI, so surprises and mistakes are possible. Make sure to verify any generated code or suggestions, and share feedback so that we can learn and improve. For more information, see https://gh.io/gh-copilot-transparency

? What kind of command can I help you with?  [Use arrows to move, type to filter]
> generic shell command
  gh command
  git command
```

gh-copilot が支援してくれるコマンドのタイプには以下の３種類があります。

- 一般的なシェルコマンド (shell)
- GitHub CLI コマンド (gh)
- Git コマンド (git)

gh-copilot の主要コマンドは以下の2つです。

- suggest: コマンドをサジェストしてもらう
- explain: コマンドを説明してもらう

`suggest` には自然言語でやりたいことを渡します。

```shell
gh copilot suggest "Install git"
```

`explain` には実行するコマンドを引数やオプション付きで渡します。

```shell
gh copilot explain "traceroute github.com"
```

以下は suggest を使用しているスクリーンショットです(クリックで拡大します)。

![git-copilot usage](https://i.gyazo.com/e17f95266db6055104c38727ec064ac2.gif)

- "get kubernetes cluster infomation" という質問をしています。
- コマンドのタイプを選択するモードになりますので `generic shell command` を選択しています。
- 結果として `kubectl get cluster-info` というコマンドがサジェストされました。
- `Revise` を使うと質問を修正したり、追加情報を付加できます。
  - "with yaml output" という条件を追加すると `kubectl get cluster-info -o yaml` という結果が得られました。
- `Copy command to clipboard` を選択して得られたコマンドをクリップボードにコピーしました。

毎回コマンドのタイプを選択するのが面倒な場合 `-t` でコマンドタイプを指定して直接サジェスト結果を得ることができます。

```shell
$ gh copilot suggest "get kuberenetes cluster infomation with yaml output" -t shell

Suggestion:

  kubectl cluster-info -o yaml
```

詳しい使い方は、`gh suggest --help` で usage を表示させるか、`gh copilot suggest` で聞いてみましょう。

## Suggestion に対して explain を使う

`explain` はサジェスト結果に対しても使えます。サジェスト結果に続いて、`Explain command` を選択します。以下の例では、「あるパターンにマッチする名前のプロセスを全て終了させる」という質問のサジェスト結果に対して explain を適用してコマンドやオプションについての説明を得ています。

```shell
$ gh copilot suggest "Terminate all processes whose names match a specific regular expression" -t shell

Suggestion:

  pkill -f <regex>

? Select an option
> Explain command

Explanation:

  • pkill is a command used to send signals to processes based on their names or other attributes.
    • -f <regex> is a flag that specifies a regular expression to match against the full command line of the processes.
      • <regex> is the regular expression pattern used to match the command lines of the processes to be killed. 
```

## 日本語で質問してみる
英語ではなく日本語で質問してみましょう。

```shell
$ gh copilot suggest "docer のイメージを削除する" -t shell

Suggestion:

  docker rmi <image_name> 
```

普通に回答してくれましたね。rmi はちょっと古いので Revise してみます。

```shell
How should this be revised?
> rmi ではなく標準的な方法で

Suggestion:

  docker image rm <image_name> 
```

いい感じです。

ちょっとややこしいことを聞いてみます。

> postgresql の docker コンテナに入ってデータベースとテーブルを作り、サンプルデータを登録するヒアドキュメント

```shell
gh copilot suggest "postgresql の docker コンテナに入ってデータベースとテーブルを作り、サンプルデータを登録するヒアドキュメント" -t shell

Suggestion:

  docker exec -it <container_name> psql -U <username> -d <database_name> <<EOF

  CREATE DATABASE mydb;

  \c mydb;

  CREATE TABLE mytable (id SERIAL PRIMARY KEY, name VARCHAR(50));

  INSERT INTO mytable (name) VALUES ('John');  

  INSERT INTO mytable (name) VALUES ('Jane');

  EOF 
```

日本語によるアバウトな指示で、使えそうなコマンドが生成されましたね。

:::info
GitHub Copilot のドキュメントには以下のような制限事項が記されています。

> GitHub Copilot in the CLI は、主に英語で記述された自然言語コンテンツでトレーニングされています。 その結果、GitHub Copilot in the CLI に英語以外の言語での自然言語の入力プロンプトを指定すると、パフォーマンスが異なる場合があります。

[GitHub Copilot in the CLI の制限事項](https://docs.github.com/ja/copilot/github-copilot-in-the-cli/about-github-copilot-in-the-cli#github-copilot-in-the-cli-の制限事項)

現状ではなるべく英語で質問した方が精度が高くなる模様です。
:::

## さいごに
以上、GitHub Copilot in the CLI の紹介でした。現状では、2021年までのデータで学習しているため、コマンドの最新バージョンや、2022年以降公開されたコマンドには対応していないようです。その他 LLM につきもののバイアスや不正確さについても利用者の責任で確認が必要です。

CLI については、古くは man コマンドで調べたり、近年ではググったりしていましたが、頻繁に使わないコマンドの場合は結構時間がかかってました。今は ChatGPT に聞いてコピペすればよくなっていますが、実際に利用しているターミナルで専用の UX が提供されているのはやはり使いやすいですね。

VS Code における Copilot のようにサジェストを未確定状態で出してくれるような機能はターミナルの仕様上難しいと思いますが、peco などで実装されている選択的インターフェースなどをうまく利用できればよいかもしれません。

Copilot に頼っていると技術者として堕落している感じもしますが、コンピュータを使用する上での新たなインターフェースと捉えればいいのではないでしょうか。

すでに「プログラミング言語としての自然言語」を使ってしまっている以上、「コマンドとしての自然言語」を活用して素早くタスクが完了できればよいと考えるようにしています。
