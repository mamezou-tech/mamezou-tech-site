---
title: GitHub の脆弱性検出機能 Code scanning alerts と CodeQL について
author: masahiro-kondo
date: 2022-06-20
tags: [CI/CD, GitHub, Security]
---

GitHub の public リポジトリでは、Settings の Security タブから Code scanning alerts を有効化できます。

![](https://i.gyazo.com/fe7db7f2abb744a30eaa366bafca0000.png)

Code scanning alerts は、コード分析エンジン CodeQL を使用してコードをスキャンし、検出したコードの脆弱性をアラートとして表示します。対応しているプログラミング言語は以下です。

- C/C++
- C#
- Go
- Java
- JavaScript/TypeScript
- Python
- Ruby

[About code scanning | GitHub Docs](https://docs.github.com/ja/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/about-code-scanning)

機能の紹介としてはこれだけなのですが、CodeQL がちょっと気になったので調べてみました。

CodeQL は、GitHub により買収された Semmle 社によって開発されました。分析対象のコードの AST(抽象構文木)などを格納したデータベースを作成し、クエリを発行することで解析を行います。

以下のドキュメントに CodeQL についての説明があります。

[About CodeQL &#8212; CodeQL](https://codeql.github.com/docs/codeql-overview/about-codeql/)

> CodeQL の各データベースには、一つの言語の特定の時点におけるコードベースから抽出されたクエリ可能なデータが含まれています。データベースには、AST(抽象構文木)、データフローグラフ、制御フローグラフを含むコードの完全な階層的表現が含まれています。
>
> 各言語には、データベースの作成に使用される関係を定義する独自のデータベーススキーマがあります。スキーマは、抽出プロセス中の最初の字句解析と、CodeQL を使用した実際の複雑な解析との間のインターフェースを提供します。スキーマは、たとえば、すべての言語構成にテーブルがあることを指定します。
>
> 言語ごとに、CodeQL ライブラリは、データベーステーブルの抽象化レイヤーを提供するクラスを定義します。これにより、データのオブジェクト指向ビューが提供され、クエリの記述が容易になります。
>
>  たとえば、Java プログラムの CodeQL データベースでは、2つの主要なテーブルは次のとおりです。
> - expressions: ビルドプロセス中に分析されたソースコード内のすべての単一式の行を含む
> - statements: ビルドプロセス中に分析されたソースコード内のすべてのステートメントの行を含む
>
> CodeQL ライブラリは、これらの各テーブル（および関連する補助テーブル）に抽象化レイヤーを提供するクラス Expr と Stmt を定義します。

ちょっとわかりづらいですが、言語ごとに専用のデータベーススキーマがあり、解析されたコードは (Java の場合) statements などの専用テーブルに格納され、CodeQL のライブラリには、クエリを発行するための専用クラス(Stmt など)があるということでしょう。

Semmle の LGTM というサイトで、クエリを試せます。

[LGTM - Code Analysis Platform to Find and Prevent Vulnerabilities](https://lgtm.com/)

Query console はこちら。

[Query console | LGTM](https://lgtm.com/query)

JavaScript コードのコメントから `TODO` にマッチするものを抽出するクエリ。

```sql
import javascript

from Comment c
where c.getText().regexpMatch("(?si).*\\bTODO\\b.*")
select c
```

Java コードで、使用されていない関数の引数を抽出するクエリ。

```sql
import java

from Parameter p
where not exists(p.getAnAccess())
select p
```

SQL ライクな DSL でコードの該当箇所を抽出できることがわかります。各言語ごとの CodeQL 実装は以下のリポジトリで公開されています。

[GitHub - github/codeql: CodeQL: the libraries and queries that power security researchers around the world, as well as code scanning in GitHub Advanced Security (code scanning), LGTM.com, and LGTM Enterprise](https://github.com/github/codeql)

JavaScript の場合、CWE[^1] タイプごとのクエリ実装は以下で見ることができます。

[^1]: Common Weakness Enumeration(共通脆弱性タイプ一覧): ソフトウェアの脆弱性を分類するための共通基準。

[codeql/javascript/ql/src/Security at main · github/codeql](https://github.com/github/codeql/tree/main/javascript/ql/src/Security)

例えば、[CWE-601: URL Redirection to Untrusted Site ('Open Redirect')](https://cwe.mitre.org/data/definitions/601.html) の [CodeQL 実装](https://github.com/github/codeql/blob/main/javascript/ql/src/Security/CWE-601/ServerSideUrlRedirect.ql)は、以下のようになっていました。

```sql
import javascript
import semmle.javascript.security.dataflow.ServerSideUrlRedirectQuery
import DataFlow::PathGraph

from Configuration cfg, DataFlow::PathNode source, DataFlow::PathNode sink
where cfg.hasFlowPath(source, sink)
select sink.getNode(), source, sink, "Untrusted URL redirection due to $@.", source.getNode(),
  "user-provided value"
```

冒頭でも述べたように、Public なリポジトリでは、Code scanning alerts を有効化できます。Settings の Security タブ で `Setup code scanning` をクリックするとデフォルトでは CodeQL を使った GitHub Actions ワークフローの追加を行えます[^2]。

[^2]: `Configure other scanning tools` を選択すると Marketplace からサードパーティの Action を選択して設定可能です。

![](https://i.gyazo.com/a31c25eb1421db5daf594169375b82c5.png)

このボタンをクリックすると、リポジトリの `.github/workflows` 配下に `codeql-analysis.yml` を配置するためのワークフロー編集画面になります。
リポジトリで使用されている主要な言語から、strategy/matrix/language の配列に値が入ります。

```yaml
# For most projects, this workflow file will not need changing; you simply need
# to commit it to your repository.
#
# You may wish to alter this file to override the set of languages analyzed,
# or to provide custom queries or build logic.
#
# ******** NOTE ********
# We have attempted to detect the languages in your repository. Please check
# the `language` matrix defined below to confirm you have the correct set of
# supported CodeQL languages.
#
name: "CodeQL"

on:
  workflow_dispatch:
    branches: [ "master" ]
  pull_request:
    # The branches below must be a subset of the branches above
    branches: [ "master" ]
  schedule:
    - cron: '40 16 * * 1'

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: [ 'javascript' ]
        # CodeQL supports [ 'cpp', 'csharp', 'go', 'java', 'javascript', 'python', 'ruby' ]
        # Learn more about CodeQL language support at https://aka.ms/codeql-docs/language-support

    steps:
    - name: Checkout repository
      uses: actions/checkout@v3

    # Initializes the CodeQL tools for scanning.
    - name: Initialize CodeQL
      uses: github/codeql-action/init@v2
      with:
        languages: ${{ matrix.language }}
        # If you wish to specify custom queries, you can do so here or in a config file.
        # By default, queries listed here will override any specified in a config file.
        # Prefix the list here with "+" to use these queries and those in the config file.
        
        # Details on CodeQL's query packs refer to : https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/configuring-code-scanning#using-queries-in-ql-packs
        # queries: security-extended,security-and-quality

        
    # Autobuild attempts to build any compiled languages  (C/C++, C#, or Java).
    # If this step fails, then you should remove it and run the build manually (see below)
    - name: Autobuild
      uses: github/codeql-action/autobuild@v2

    # ℹ️ Command-line programs to run using the OS shell.
    # 📚 See https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsrun

    #   If the Autobuild fails above, remove it and uncomment the following three lines. 
    #   modify them (or add more) to build your code if your project, please refer to the EXAMPLE below for guidance.

    # - run: |
    #   echo "Run, Build Application using script"
    #   ./location_of_script_within_repo/buildscript.sh

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v2
```

workflow_dispatch(手動)、pull_request の他に schedule として crontab 形式で起動するようなテンプレートになっているのは、コード変更以外に、CWE や言語のバージョンアップによる新たな脆弱性検出があり得るため、定期的に点検する必要があるからでしょう。

使用されているのは、GitHub 公式 codeql-action です。

[GitHub - github/codeql-action: Actions for running CodeQL analysis](https://github.com/github/codeql-action)

このワークフローファイルをリポジトリに登録して実行すると結果が GitHub にアップロードされます。

![](https://i.gyazo.com/03b171fb31b21d77619b444a9f115758.png)

スキャン結果は、Seccurity の Code scanning alerts の `View alerts` から見ることができます。

![](https://i.gyazo.com/d2d3383f9f56d3feeb6b1dccd12c4686.png)

このスキャンに関しては問題は検出されなかったようです。

![](https://i.gyazo.com/9be5e926267888bd2d9114663ddb9ba5.png)

今月初め Code scanning alerts が PR に対してコメント挿入する機能がリリースされました。

[Users can view and comment on code scanning alerts on the Conversation tab in a pull request | GitHub Changelog](https://github.blog/changelog/2022-06-02-users-can-view-and-comment-on-code-scanning-alerts-on-the-conversation-tab-in-a-pull-request/)

[ドキュメント](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/triaging-code-scanning-alerts-in-pull-requests)から PR コメントのスクリーンショットを掲載します。

![](https://docs.github.com/assets/cb-77834/images/help/repository/code-scanning-pr-conversation-tab.png)

Bot がインラインで指摘してくれるため、マージ前に対応することができます。

GitHub の Roadmap を見ると、Kotlin や Swift のサポートも計画されているようです。

このように素晴らしい Code scanning ですが、private リポジトリについては有償で、Security の Code scanning alerts のセクションは `Contact sales` になっています。

![](https://i.gyazo.com/02862ff140c1d27311fbb62bd281ccff.png)

また、GitHub Actions で CodeQL CLI[^3] を使用するのも、private リポジトリについては、GitHub Advanced Security ライセンスが必要です。

[^3]: CodeQL のスキャンを直接実装する CLI。[CodeQL CLI &#8212; CodeQL](https://codeql.github.com/docs/codeql-cli/)

[About CodeQL code scanning in your CI system | GitHub Docs](https://docs.github.com/ja/code-security/code-scanning/using-codeql-code-scanning-with-your-existing-ci-system/about-codeql-code-scanning-in-your-ci-system)

> Note: The CodeQL CLI is free to use on public repositories. The CodeQL CLI is also available in private repositories owned by organizations that use GitHub Enterprise Cloud and have a license for GitHub Advanced Security.

VS Code の拡張機能を使ってローカル環境で CodeQL のスキャンを実施することも可能ですが、やはり CI で実施したいところですね。

GitHub の Alert で見えるのは脆弱性だけですが、[LGTM](https://lgtm.com/) にサインアップして、public リポジトリを登録すれば、セキュリティ以外の静的コード分析結果レポートを見ることもできます。
