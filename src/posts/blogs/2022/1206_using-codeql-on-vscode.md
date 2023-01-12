---
title: VS Code の CodeQL 拡張と Starter workspace でコード分析する
author: masahiro-kondo
date: 2022-12-06
tags: [codeql, vscode, advent2022, security]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---

これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第6日目の記事です。

6月の「[GitHub の脆弱性検出機能 Code scanning alerts と CodeQL について](/blogs/2022/06/20/github-code-scanning-and-codeql/)」の記事で、CodeQL の概要と Code scanning alerts を GitHub Actions ワークフローを使って有効化する方法を紹介しました。

9月に VS Code の CodeQL 拡張で GitHub から CodeQL のデータベースを直接ダウンロードできるようになったことが発表されました。

[CodeQL for VS Code: download CodeQL databases from GitHub.com | GitHub Changelog](https://github.blog/changelog/2022-09-21-codeql-for-vs-code-download-codeql-databases-from-github-com/)

この記事では、CodeQL 拡張で CodeQL データベースを取得し分析する方法を見ていきます。また、ローカル環境で CodeQL データベースを作る手順も試してみます。


## CodeQL 拡張のインストール
まず、CodeQL 拡張をインストールします。

[CodeQL&#32;-&#32;Visual&#32;Studio&#32;Marketplace](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-codeql)

拡張をインストールすると CodeQL CLI のインストールが始まりました。

![CodeQL CLI インストール](https://i.gyazo.com/723c7edcaf8960688da2cbebc0942145.png)

CodeQL CLI は CodeQL のデータベース作成やコード解析を行うための CLI です。

CodeQL 拡張の `Cli: Executable Path` 設定の説明には以下のようにあり、CodeQL CLI がインストールされていない場合は、拡張側でダウンロードし管理するようです。

> Path to the CodeQL executable that should be used by the CodeQL extension. The executable is named codeql on Linux/Mac and codeql.exe on Windows. If empty, the extension will look for a CodeQL executable on your shell PATH, or if CodeQL is not on your PATH, download and manage its own CodeQL executable.

## Starter workspace リポジトリの取得
VS Code と CodeQL 拡張で CodeQL データベースを解析したり CodeQL クエリを開発したりする作業を支援するための Starter workspace のリポジトリが公開されています。

[GitHub - github/vscode-codeql-starter: Starter workspace to use with the CodeQL extension for Visual Studio Code.](https://github.com/github/vscode-codeql-starter/)

:::info
workspace は VS Code で複数のプロジェクトをまとめて取り扱うことのできる作業スペースで、`code-workspace` という拡張子の JSON ファイルで構成されます。
:::

このリポジトリは CodeQL 本体のリポジトリ[^1]に依存しており、Git の submodule として利用します。

[^1]: CodeQL のライブラリや各言語用のクエリーが管理されています。

[GitHub - github/codeql: CodeQL: the libraries and queries that power security researchers around the world, as well as code scanning in GitHub Advanced Security](https://github.com/github/codeql)

Starter workspace をクローンします。submodule を利用するため、`--recursive` フラグを付与します。GitHub CLI を利用する場合は以下のようになります。

```shell
gh repo clone github/vscode-codeql-starter -- --recursive
```

クローンしたプロジェクトの `vscode-codeql-starter.code-workspace` を VS Code で開くと各プログラミング言語用のカスタムクエリ開発用のテンプレート共に、submodule として取得された codeql リポジトリが　`ql` ディレクトリ配下に展開されます。

![workspace explorer](https://i.gyazo.com/0437c4759765b3476a903ef97b3877ad.png)

:::info
発表当時の9月に試したら submodule が workspace に展開されない状態でした。現在はちゃんと使えるようになっています。
:::

## GitHub からの CodeQL データベースのダウンロード
Starter workspace の準備ができたので、早速 GitHub から CodeQL データベースを取得してみます。

CodeQL 拡張の画面にはデータベース用のパネルがあり、データベースが取得されていない状態では取得用のボタンが並んでいて一番下に `From GitHub` があります。

![Database panel](https://i.gyazo.com/7e77869e0558ccd562d2788eaf0bbbd2.png)

`From GitHub` をクリックするとリポジトリ指定用のテキストボックスが出ますので、リポジトリの URL か `<owner>/<repo>` 形式で取得先を指定します。

![取得先リポジトリの指定](https://i.gyazo.com/895766a22c767e4b995202cf1bccfcab.png)

試しに Minikube のリポジトリを指定してみました。

![Minikube repo](https://i.gyazo.com/8b1fe1bf1ab5459fb81044f151d4c5a0.png)

言語のデータベースとして Go を選択

![Choice Language](https://i.gyazo.com/33b2730cf452c9bb1aa0f5551ce881c6.png)

12MB程度で10数秒でダウンロードが完了し、データベースのパネルに追加されました。

![追加されたデータベース](https://i.gyazo.com/68d8c0e962b1629c71974b875a0a555f.png)

データベースが追加された状態ではパネル右上のツールバー的な UI でデータベースを追加することになります。

![追加用ツールバー](https://i.gyazo.com/88fa2e3427fc365b37ba4a1be530a163.png)

Apache Kafka のデータベースを追加してみました。`✔`のついているデータベースがカレントの分析対象データベースとなります。`Set Current Database` をクリックすることでカレントのデータベースを切り替え可能です。

![Kafka のデータベースを追加](https://i.gyazo.com/66b51cdbaa5d041e94938226755c4f49.png)

:::info
9月の発表時点で、GitHub には 20万を超える CodeQL データベースが存在するとありました。著名 OSS だけでなく Code scanning を有効化している Public リポジトリのデータベースも取得可能です。
Code QL データベースは Code QL 拡張を使わずに、GitHub の REST API を使って取得することもできます。
:::

## CodeQL データベースを使ってコード分析
Starter workspace に分析対象のデータベースと CodeQL リポジトリが整ったので、既存のクエリを実行してみます。Minikube のデータベースをカレントに指定した状態で VS Code のエクスプローラーを開きます。Minikube は Go のプロジェクトなので `ql/go/ql/go/src` を開きます。Go 言語用の CodeQL クエリーが `MNetrics` や `Security` などの分類で格納されています。

![Go の CodeQL ディレクトリ](https://i.gyazo.com/84102a4ac9af5b34e04a3e08627f2115.png)

Metrics ディレクトリ配下にはコードの行数やコメント行数を取得する QL ファイルが格納されています。

![Metrics の行数取得のクエリファイル](https://i.gyazo.com/e163a7f36aadb2d43500d40f9d1fe9e9.png)

QL ファイルまたは、QL ファイルが格納されたディレクトリを選択した状態でエクスプローラー上でコンテキストメニューを出すか、QL ファイルを開いた状態でコードエディタでコンテキストメニューを出すと、カレントデータベースに対してクエリを実行できます。

![Run Queries メニュー](https://i.gyazo.com/a2a2f5cbc8851dd52cb7636a3149776f.png)

ディレクトリを選択した状態だと、配下のクエリーをまとめて実行できます。Metrics ディレクトリを選択して実行すると、2つのクエリを実行するという確認ダイアログが出ますので、`Yes` をクリック。

![クエリ実行確認ダイアログ](https://i.gyazo.com/52d0da273e21671d83c9279f3844540e.png)

実行が成功すると、Code QL 拡張の `Query History` パネルから結果をブラウズできるようになります。

![クエリー履歴](https://i.gyazo.com/fa740616678004986de46a79b61d17f8.png)

クエリー結果を選択すると、`CodeQL Query Results` というタブが開いて、結果のサマリー、詳細結果へのリンク、実行したクエリーへのリンクが表示されます。

![クエリー結果](https://i.gyazo.com/ad5bbe55badc524b7b2b12b0a33b9228.png)

`raw results` をクリックすると結果の詳細(この場合はソースコードファイルごとの行数)が表示されます。

![結果詳細](https://i.gyazo.com/5af9285a31edde2ca0bca3e29c2f8f22.png)

詳細結果の行を選択すると、CodeQL データベースから実際のソースコードの該当箇所を開くことができます。エクスプローラーに切り替えると、データベースのソースコードアーカイブから該当のソースコードが選択状態になっています。

![アーカイブのソースコードを閲覧](https://i.gyazo.com/80eec91c8e1dcd4f438be8519e904fe7.png)

`Open xxx.ql` をクリックすると実行したクエリーのソースコードが開きます。

![実行したクエリーの参照](https://i.gyazo.com/f4b2903e6cb9abadabec73c80f97257e.png)

:::info
ちなみに `Security` 配下には CWE (Common Weakness Enumeration: 共通脆弱性タイプ一覧) の脆弱性検出用のクエリーが格納されています。
![CWE クエリ](https://i.gyazo.com/79cbb217b5c8deaf0ba85e016aba0d93.png)

これらを一気に実行しようとすると、以下のようなエラーメッセージが出ます。一度に実行できるクエリーは Max 20個までのようです。

![クエリーが多すぎるときのエラーメッセージ](https://i.gyazo.com/98484a65f02556caa8fcfc6b0881a3ab.png)

Minikube のプロジェクトに対して [CWE-20](https://cwe.mitre.org/data/definitions/20.html) のディレクトリを選択して実行した結果では、いくつか該当箇所が抽出されていました。

![CWE20クエリー結果](https://i.gyazo.com/30e399e61ae6f7e7eaac35c5143aae22.png)
:::

以上のように Starter workspace では分析対象のプロジェクトの言語に応じたクエリーの実行と結果の閲覧が可能です。

:::info
Starter workspace では既存の CodeQL クエリーを実行するだけでなく、クエリーを開発するためのワークベンチとしても利用できます。
Code QL 拡張でコード補完も効きますし、多くのサンプルが submodule の codeql リポジトリに格納されていますので、参照しながらカスタムクエリーを開発することも可能でしょう。
:::

## CodeQL データベースをローカルで作成する
CodeQL データベースは、GitHub のリポジトリから取得するだけでなく、CodeQL CLI を使ってローカルに作成できます。プライベートなリポジトリで開発しているプロジェクトでも自前でデータベースを構築して分析可能です。

CodeQL CLI をインストールするには、[codeql-action の最新安定版リリースのページ](https://github.com/github/codeql-action/releases/latest)から利用する OS 用のバイナリをダウンロードします。

:::alert
CodeQL CLI をダウンロードしてローカルで実行するのは問題ありませんが、private リポジトリの CI で使用するには、GitHub Advanced Security ライセンスが必要になるのでご注意ください。

[About using the CodeQL CLI for code scanning](https://docs.github.com/ja/code-security/code-scanning/using-codeql-code-scanning-with-your-existing-ci-system/installing-codeql-cli-in-your-ci-system#about-using-the-codeql-cli-for-code-scanning)
:::

Apple シリコン Mac 用バイナリはリリースされていませんが、Rosetta 2が入っていれば Intel 用のバイナリ(codeql-bundle-osx64.tar.gz)を利用可能です。

ダウンロードしたアーカイブを展開してできる `codeql-bundle` ディレクトリをホームディレクトリなどに置いてパスを通します。実行用のバイナリと必要なライブラリやクエリーファイルが格納されていますので、このディレクトリにパスを通す必要があります。

```shell
export PATH=$PATH:~/codeql-bundle
```

対象プロジェクトのルートに移動して、`codeql datebase create` を `--language` オプションを指定して実行します。以下は Go のプロジェクトで実行した例です。

```shell
codeql database create sb2md-codeqldb --language=go
```
```
Initializing database at /Users/masahiro-kondo/dev/sb2md/sb2md-codeqldb.
Running build command: [/Users/masahiro-kondo/codeql-bundle/go/tools/autobuild.sh]
[2022-12-03 17:33:30] [build-stderr] 2022/12/03 17:33:30 Autobuilder was built with go1.19.3, environment has go1.19
[2022-12-03 17:33:30] [build-stderr] 2022/12/03 17:33:30 LGTM_SRC is /Users/masahiro-kondo/dev/sb2md
[2022-12-03 17:33:30] [build-stderr] 2022/12/03 17:33:30 Found go.mod, enabling go modules
[2022-12-03 17:33:30] [build-stderr] 2022/12/03 17:33:30 Unable to determine import path, as neither LGTM_INDEX_IMPORT_PATH nor GITHUB_REPOSITORY is set
[2022-12-03 17:33:30] [build-stderr] 2022/12/03 17:33:30 Build failed, continuing to install dependencies.
[2022-12-03 17:33:30] [build-stderr] 2022/12/03 17:33:30 Installing dependencies using `go get -v ./...`.
[2022-12-03 17:33:31] [build-stderr] 2022/12/03 17:33:31 Running extractor command '/Users/masahiro-kondo/codeql-bundle/go/tools/osx64/go-extractor [./...]' from directory '/Users/masahiro-kondo/dev/sb2md'.
[2022-12-03 17:33:31] [build-stderr] 2022/12/03 17:33:31 Build flags: ''; patterns: './...'
[2022-12-03 17:33:31] [build-stderr] 2022/12/03 17:33:31 Running packages.Load.
:
[2022-12-03 17:33:37] [build-stderr] 2022/12/03 17:33:37 Extracting /Users/masahiro-kondo/dev/sb2md/cmd/cmd_util.go
[2022-12-03 17:33:37] [build-stderr] 2022/12/03 17:33:37 Done extracting /Users/masahiro-kondo/dev/sb2md/go.mod (3ms)
[2022-12-03 17:33:37] [build-stderr] 2022/12/03 17:33:37 Extracting /Users/masahiro-kondo/dev/sb2md/go.mod
[2022-12-03 17:33:37] [build-stderr] 2022/12/03 17:33:37 Done extracting /Users/masahiro-kondo/dev/sb2md/go.mod (0ms)
[2022-12-03 17:33:37] [build-stderr] 2022/12/03 17:33:37 Extracting /Users/masahiro-kondo/dev/sb2md/main.go
[2022-12-03 17:33:37] [build-stderr] 2022/12/03 17:33:37 Done extracting /Users/masahiro-kondo/dev/sb2md/main.go (0ms)
[2022-12-03 17:33:37] [build-stderr] 2022/12/03 17:33:37 Done extracting /Users/masahiro-kondo/dev/sb2md/cmd/root.go (23ms)
[2022-12-03 17:33:37] [build-stderr] 2022/12/03 17:33:37 Done extracting /Users/masahiro-kondo/dev/sb2md/cmd/cmd_util.go (24ms)
[2022-12-03 17:33:37] [build-stderr] 2022/12/03 17:33:37 Done extracting /Users/masahiro-kondo/dev/sb2md/cmd/md.go (29ms)
[2022-12-03 17:33:37] [build-stderr] 2022/12/03 17:33:37 Done extracting packages.
Finalizing database at /Users/masahiro-kondo/dev/sb2md/sb2md-codeqldb.
[2022-12-03 17:33:37] [build-stderr] Scanning for files in /Users/masahiro-kondo/dev/sb2md...
Successfully created database at /Users/masahiro-kondo/dev/sb2md/sb2md-codeqldb.
```

Starter workspace に取り込むには、データベースパネルの `Choose Database from Folder` をクリックして作成したデータベースのパスを指定します。

![Choose Database from Folder](https://i.gyazo.com/d26e65c0d14bb2b03d5e1884bb367110.png)

![Select Database Folder](https://i.gyazo.com/50aefa9f9824cd901886291a11fd963a.png)

これでデータベースが取り込まれますので、他のデータベースと同様クエリーを実行して分析ができるようになります。

![ディレクトリから追加されたデータベース](https://i.gyazo.com/4b149c924063f1641acf6c942382920e.png)


:::info
単に静的コード分析をローカルで実行するだけであれば CodeQL 拡張や Starter workspace は不要で、CodeQL CLI と VS Code の SARIF Viewer 拡張だけで完結します。以下はデータベースを解析して Sarif 形式で出力する例です。

```shell
codeql database analyze sb2md-codeqldb --format=sarif-latest --output result.sarif
```

```
Running queries.
[1/30] Loaded /Users/masahiro-kondo/codeql-bundle/qlpacks/codeql/go-queries/0.3.4/Security/CWE-020/IncompleteHostnameRegexp.qlx.
[2/30] Loaded /Users/masahiro-kondo/codeql-bundle/qlpacks/codeql/go-queries/0.3.4/Security/CWE-020/IncompleteUrlSchemeCheck.qlx.
[3/30] Loaded /Users/masahiro-kondo/codeql-bundle/qlpacks/codeql/go-queries/0.3.4/Security/CWE-020/MissingRegexpAnchor.qlx.
:
[27/30] Loaded /Users/masahiro-kondo/codeql-bundle/qlpacks/codeql/go-queries/0.3.4/Security/CWE-918/RequestForgery.qlx.
[28/30] Loaded /Users/masahiro-kondo/codeql-bundle/qlpacks/codeql/go-queries/0.3.4/Diagnostics/ExtractionErrors.qlx.
[29/30] Loaded /Users/masahiro-kondo/codeql-bundle/qlpacks/codeql/go-queries/0.3.4/Diagnostics/SuccessfullyExtractedFiles.qlx.
[30/30] Loaded /Users/masahiro-kondo/codeql-bundle/qlpacks/codeql/go-queries/0.3.4/Summary/LinesOfCode.qlx.
ExtractionErrors.ql               : [1/30 eval 23ms] Results written to codeql/go-queries/Diagnostics/ExtractionErrors.bqrs.
:
LinesOfCode.ql                    : [30/30 eval 43ms] Results written to codeql/go-queries/Summary/LinesOfCode.bqrs.
Shutting down query evaluator.
Interpreting results.
Analysis produced the following diagnostic data:

|         Diagnostic          |  Summary  |
+-----------------------------+-----------+
| Successfully analyzed files | 5 results |

Analysis produced the following metric data:

|                 Metric                 | Value |
+----------------------------------------+-------+
| Total lines of Go code in the database |   238 |
```

結果を SARIF View で表示しているところです(抽出結果がなかったので空っぽですが)。

![Sarif Viewer](https://i.gyazo.com/76373182f428d297b660b72e02c51017.png)

詳しくは「[GitHub code scanning 結果を VS Code で確認できる SARIF Viewer 拡張](/blogs/2022/10/13/view-github-code-scanning-results-in-vscode/)」を参照してください。
:::

## 最後に
この記事では、VS Code 上で CodeQL を使ってコード分析を行う方法を紹介しました。セキュリティスキャンとしての利用だけであればこのような環境構築は不要ですが、CodeQL について深く知りたい場合や自分でカスタムクエリーを開発したい場合は非常に役立つ環境だと思います。

---
参考

- [Setting up CodeQL in Visual Studio Code &#8212; CodeQL](https://codeql.github.com/docs/codeql-for-visual-studio-code/setting-up-codeql-in-visual-studio-code/)
- [Creating CodeQL databases &#8212; CodeQL](https://codeql.github.com/docs/codeql-cli/creating-codeql-databases/)
- [Analyzing databases with the CodeQL CLI &#8212; CodeQL](https://codeql.github.com/docs/codeql-cli/analyzing-databases-with-the-codeql-cli/)
