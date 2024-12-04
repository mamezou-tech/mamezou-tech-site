---
title: JSDoc(+Docdash)を使ったMarkdownによるドキュメント生成術
author: shuji-morimoto
date: 2024-12-09
tags: [javascript, jsdoc, markdown, advent2024]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
image: true
---
これは[豆蔵デベロッパーサイトアドベントカレンダー2024](/events/advent-calendar/2024/)第9日目の記事です。

私は打合せ時のメモ書き・TODOリスト・技術メモなどはMarkdownで記述しています。Gitリポジトリのルートフォルダ(トップページ)のREADMEやこの文書もMarkdownで記述しています。またタスク管理ツールもMarkdownに対応するものがあります。

テキストはplainテキストよりもMarkdownで記述している方が多いです。

基本的には使い慣れたエディタ(vim)で記述していますが、Markdown記法に慣れると簡単に文書整形できますし、シンタックスハイライトで色分けされるので文章の構造が一目でわかるところが便利です。

![](/img/blogs/2024/1209_documentation-with-jsdoc/vim.png)

エディタでは文書整形は行われませんが、プログラムと同じで色分けされているだけで見やすさが全然違います。編集の最後にMarkdownビューワー(後述)を使って整形結果を確認しています。


# Markdownによるドキュメント作成

お客様に納品するソフトウェア設計書はWord文書で納品することが多いですが、とあるプロジェクトではソフトウェア設計書のフォーマットに指定がなく、オンラインでも見たいとの要望によりMarkdownで記述することがありました。

ところが、設計書ですのでUMLのダイアグラムやそれらの説明を記載するのですがすべてを1ファイル(1ページ)で記載すると見通しが悪くなります。章単位でファイルを作成しMarkdownで記述したいところです。

要望としては以下が求められました。

- 複数のMarkdownをまとめてHTMLに変換する
- JavaScriptで作成したソースファイルからAPIリファレンスを生成する
- 目次・見出しを生成し、ここからリンクをクリックして各章の内容を表示する

サンプルとしてFizzBuzzBearというJavaScriptでFizzBuzz問題を解く2Dアニメーションプログラムを作成し、それに対するソフトウェア説明書(の雛形)を作成してみます。


# JSDocによるドキュメント表示

JSDoc はJavaScriptのAPIリファレンスを作成するときに利用されていますが、文書(tutorialと呼ばれる)の記述にも利用できます。
@[og](https://github.com/jsdoc/jsdoc/)

文書はMarkdown形式で記述します。文書間でリンク(リンク先のMarkdown文書が自動的にHTMLに変換された文書のURLとなります)を張ることができ、見出しも作ることができます。静的なWebページに変換されるためオンラインドキュメントとして参照できます。

JSDocなら上述の要望に応えられますが見た目でイマイチなところがあります。


### README(トップページ)のサンプル
![](/img/blogs/2024/1209_documentation-with-jsdoc/jsdoc_default.png)
- 目次が右側に配置される
- ヘッダーにHomeと表示される😞
- 各文書の目次がTutorialsと表示される😞
- 目次が各文書のファイル名順に表示される😞
    - 設定ではファイル名と表示名の対応を記述して作成している

### 文書(tutorial)のサンプル
![](/img/blogs/2024/1209_documentation-with-jsdoc/jsdoc_default_article.png)
- 文書は下記のように記述しているが表示が冗長😞
    ```text:class_structure.md
    # クラス構成

    クラス図を記述します。
    ```

### APIリファレンスのサンプル
![](/img/blogs/2024/1209_documentation-with-jsdoc/jsdoc_default_classes.png)
- カテゴリ名が大きく、プロパティ名やメソッド名が小さくて判りにくい😞


# Docdashによるドキュメント表示

JSDocのデフォルトテンプレートにはいくつか不満点がありました。これを解決するために Docdash を利用します。
@[og](https://github.com/clenemt/docdash/)
Docdash は JSDoc で利用できるテンプレートです。このテンプレートを利用することで見た目を変化させることができ、さらに独自のカスタマイズが可能になります。

JSDoc のデフォルトテンプレートは見にくくイマイチですが、Docdash を利用すると解決できます。

### README(トップページ)のサンプル

![](/img/blogs/2024/1209_documentation-with-jsdoc/jsdoc_docdash.png)

- 目次が左側
- JavaScriptを利用することでヘッダーを消すなどカスタマイズができる😊
- 目次が指定の順序で表示できる😊

### 文書(tutorial)のサンプル
![](/img/blogs/2024/1209_documentation-with-jsdoc/jsdoc_docdash_article.png)
- Markdownの記述そのままで表示😊
    - JavaScriptでヘッダーを削除しました

### APIリファレンスのサンプル
![](/img/blogs/2024/1209_documentation-with-jsdoc/jsdoc_docdash_classes.png)
- プロパティ名やメソッド名が見やすい😊
- 左のメニューにメソッド名が表示される😊
    - 設定により表示/非表示切り替えもできます
- 検索ボックスでAPIを検索することができる
    - 非表示にもできます


# インストールと実行

Node.js をインストールしてください。
@[og](https://nodejs.org/)
インストーラは[こちら](https://nodejs.org/en/download/prebuilt-installer)から。

:::alert
以下、Windowsでの処理を対象としています。なお、Windows PowerShellだとスクリプト実行エラーとなるようです。Windowsではコマンドプロンプト(cmd.exe)やGit Bash(bash.exe)を利用してください。
:::

### サンプルアプリ(FizzBuzzBear)のダウンロード
```console
curl -L -O https://github.com/shuji-morimoto/FizzBuzzBear/archive/refs/heads/main.zip
tar -xf main.zip
```
- main.zipアーカイブを展開するとFizzBuzzBear-mainフォルダが作成されます

:::info
Windows 10 Version 1809 (October 2018 Update) 以降ではcurlとtarが使え、tarでzipファイルを展開できるようです。
:::


### 必要なモジュールのインストール
```console
cd FizzBuzzBear-main
set NODE_OPTIONS="--dns-result-order=ipv4first"
npm install
```
- package.jsonに記載した `JSDoc`, `Docdash` 関連のモジュールがインストールされます

:::alert
IPv6環境ではスクリプトのダウンロードが進まないようです。その場合は `set NODE_OPTIONS="--dns-result-order=ipv4first"` でIPv4を優先するように指定してください。
:::


### ドキュメントを生成する
```console
npm run docs
```
- package.jsonに記載した `docs` スクリプトを実行します


### ブラウザでFizzBuzzBearアプリを実行する
```console
start src/index.html
```

### ブラウザでソフトウェア設計書を開く
```console
start docs/_site/index.html
```

:::alert
PDF化や印刷には不向き(用紙サイズやページ区切りの概念がない)であることに注意してください。
:::


# Docdashテンプレートを用いた設定ファイル(jsdoc.json)の記述

[JSDocの設定詳細はこちら](https://jsdoc.app/about-configuring-jsdoc)

[Docdashテンプレートの設定詳細はこちら](https://github.com/clenemt/docdash?tab=readme-ov-file#options)

```json:jsdoc.json
{
    "source": {
        "include": ["./src"],
        "includePattern": ".+\\.js$"
    },
    "plugins": [
        // Markdown記述用のプラグインを指定
        "plugins/markdown"
    ],
    "templates": {
        "cleverLinks": true,
        "monospaceLinks": true,
        "default": {
            "includeDate": false,
            // 各種リソースを読み込む場合の指定
            "staticFiles": {
                "include": ["./docs/articles"],
                "includePattern": ".+\\.(png|jpg|gif|ico|css|js)$"
            }
        }
    },
    "opts": {
        // テンプレートにdocdashを指定
        "template": "./node_modules/docdash",
        // 出力先
        "destination": "./docs/_site",
        // READMEファイル(トップページ表示)の指定
        "readme": "./docs/README.md",
        "encoding": "utf8",
        "recurse": true,
        // 文書フォルダの指定
        "tutorials": "./docs/articles"
    },

    // docdashの設定
    "docdash": {
        "static": true,
        "sort": false,
        "sectionOrder": [
             "Classes",
             "Modules",
             "Externals",
             "Events",
             "Namespaces",
             "Mixins",
             "Interfaces"
        ],
        "search": true,
        "commonNav": false,
        "collapse": true,
        "wrap": false,
        "typedefs": true,
        "navLevel": 0,
        "private": false,
        // 各文書に適用するスクリプトとスタイルシートを指定
        // 変換されたHTMLファイルからロードされるためDOM操作を
        // 行いたい場合は指定する
        "scripts": [
            "scripts/local_settings.css",
            "scripts/local_settings.js"
        ],
        // 見出しの設定
        "menu": {
            // xxxx.mdファイルはtutorial-xxxx.htmlとなるため
            // hrefにはHTMLに変換されたファイル名を指定する
            "起動方法": {
                "href":"tutorial-run_app.html",
                "target":"_self",
                "class":"menu-item",
                "id":"website_link"
            },
            "クラス構成": {
                "href":"tutorial-class_structure.html",
                "target":"_self",
                "class":"menu-item",
                "id":"website_link"
            },
            "メカニズム": {
                "href":"tutorial-mechanism.html",
                "target":"_self",
                "class":"menu-item",
                "id":"website_link"
            },
            "TODO": {
                "href":"tutorial-todo.html",
                "target":"_self",
                "class":"menu-item",
                "id":"website_link"
            }
        }
    }
}
```

```css:scripts/local_settings.css
h1.page-title {
    display: none;
}
```
- 上記にマッチする要素を非表示にします

```javascript:scripts/local_settings.js
if (window.location.pathname.split('/').pop().startsWith('tutorial-')) {
    var h = document.querySelector("html > body > div#main > section > header");
    if (h != null) {
        h.style.display = "none";
    }
}
```
- リソース名がtutorial-から始まるとき、そのdocumentのselectorでマッチする要素を非表示にします


# ブラウザでMarkdown文書を表示する
私はMarkdownの整形結果を確認するときは Markdown Viewer を利用してブラウザ(Chrome)で確認しています。様々なブラウザのエクステンションに対応しているようです。
@[og](https://github.com/simov/markdown-viewer/)

このエクステンションを有効にするとMarkdownファイルをブラウザにドラッグ＆ドロップすると整形して表示されます。

[Content Options](https://github.com/simov/markdown-viewer#table-of-contents)にあるautoreloadをtrueにするとエディタで編集して保存したタイミングでブラウザ上に結果が反映されます。現在の表示位置も覚えているようで、スクロールする手間もなく便利です。また、見出しの生成もできるようです。
