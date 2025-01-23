---
title: VSCodeで校正ツールからのヒントをビューワーに表示しよう - ProblemMatcherの解説
author: shohei-yamashita
date: 2025-01-24
tags: [vscode, textlint, regex]
image: true
---

## はじめに
ビジネスソリューション事業部の山下です。今回は、Visual Studio Code(VSCode)のタスク機能で設定できるProbrem Matcherについて解説していこうと思います。
普段の開発にあたって、コードチェック機能はエディタやその拡張機能で提供されるため、あまり意識しないはずです。
しかしながら、スクラッチで開発したCLIツールの出力をエディタ上でも確認したいといったケースもあるでしょう。
今回は、VSCode上での開発でTaskとProblem Matcherを併用することで、手軽に自作ツールの出力結果をヒントとして出す手順を紹介します。
本記事に関するサンプルコードは以下のリポジトリに掲載しております。
[https://github.com/shohei-yamashit/lint-sample-vscode](https://github.com/shohei-yamashit/lint-sample-vscode)

## 背景
豆蔵デベロッパーサイトで記事を投稿する前には、記事のマークダウンに対してlintツールをかけることが決まりになっています[^1]。
lintツールはdenoのタスクとして登録されており、以下のようなコマンドで実行できます。
[^1]: 豆蔵デベロッパーサイトにおいては、[過去の記事](https://developer.mamezou-tech.com/blogs/2022/03/31/4q-retrospective/#%E7%B6%99%E7%B6%9A%E7%9A%84%E3%81%AA%E3%82%B5%E3%82%A4%E3%83%88%E6%94%B9%E5%96%84)にあるように文書校正にtextlintを採用しています。

```sh
deno task lint ${mdファイルのパス}
```

このコマンドを実行すると、校正結果が標準出力で検出されます。

```sh
/.../mamezou-tech-site/src/posts/blogs/2025/0117_cycle-postgres.md
   10:19  error  "で" が連続して2回使われています。                                                                                                                                                                ja-no-successive-word
   10:20  error  "で" が連続して2回使われています。                                                                                                                                                                ja-no-successive-word
   10:21  error  "で" が連続して2回使われています。                                                                                                                                                                ja-no-successive-word
   11:4   error  漢字が7つ以上連続しています: 漢字七文字以上                                                                                                                                                       max-kanji-continuous-len
   12:11  error  【dict2】 "することのできること"は冗長な表現です。"することの"を省き簡潔な表現にすると文章が明瞭になります。 解説: https://github.com/textlint-ja/textlint-rule-ja-no-redundant-expression#dict2  ja-no-redundant-expression
  128:3   error  文末が"。"で終わっていません。                                                                                                                                                                    ja-no-mixed-period
  213:3   error  文末が"。"で終わっていません。                                                                                                                                                                    ja-no-mixed-period
✖ 7 problems (7 errors, 0 warnings)      
```

基本的にはコンソール出力から修正箇所を特定しますが、修正量が多いと確認作業も一苦労です。
そこでリサーチの結果、TaskとProblemMatcherの併用という手段に行き着きました。
以下に示すように、修正箇所がヒントとして一目でわかるようになります。

![56417c0c0a1767ea8c321da603c590d8.png](https://i.gyazo.com/56417c0c0a1767ea8c321da603c590d8.png)

## VSCodeのTaskとProblem Matcher

### Taskについて
TaskはVSCodeに備わっている標準機能の1つであり、一言でいえば、「コマンド操作にエイリアス等を指定できるVSCodeの標準機能」です。
tasks.jsonファイルに適切な定義をすることにより、様々なコマンドやスクリプトにエイリアスを指定できます。
エイリアスが指定されたコマンドはGUI上で実行できるだけでなく、ショートカットキーを割り当てられます[^2]。
tasks.jsonでは、コマンドそのものや実行方式に関わる設定ができるだけでなく、次に説明するようにコマンドをトリガーとした追加の操作を設定可能です。
[^2]: [https://code.visualstudio.com/docs/editor/tasks#_binding-keyboard-shortcuts-to-tasks](https://code.visualstudio.com/docs/editor/tasks#_binding-keyboard-shortcuts-to-tasks)

### ProblemMatcher
Problem Matcherはtasks.jsonの設定項目の1つであり、エイリアス定義されたコマンドの出力をキャプチャしてエディタ上でヒントとして出すための設定項目です。
本章では、公式に掲載されているサンプル[^3]を紹介します。
[^3]: [https://code.visualstudio.com/docs/editor/tasks#_defining-a-problem-matcher](https://code.visualstudio.com/docs/editor/tasks#_defining-a-problem-matcher)

```javascript
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "command": "gcc",
      "args": ["-Wall", "helloWorld.c", "-o", "helloWorld"],
      "problemMatcher": {
        "owner": "cpp",
        "fileLocation": ["relative", "${workspaceFolder}"],
        "source": "gcc",
        "pattern": {
          "regexp": "^(.*):(\\d+):(\\d+):\\s+(warning|error):\\s+(.*)$",
          "file": 1,
          "line": 2,
          "column": 3,
          "severity": 4,
          "message": 5
        }
      }
    }
  ]
}
```

ProblemMatcherに注目すると、次の4つの属性が確認できるはずです。

```sh
- owner
- fileLocation
- source
- pattern
```

まず、pattern以外の3つについて概要だけ説明していきます。
- **owner**: 何に違反しているのかを記述します[^4]。(例：言語名や規格など)
- **fileLocation**: 問題が検出されたファイルの場所の解釈方法。（例：絶対パス、相対パス）
- **source**: 問題が出力されたツール（例：linter名、ツール名、コンパイラ等）

[^4]: The problem is owned by … .といった記述が公式ページでされています。あまり馴染みのない表現だったので、自分なりの解釈を入れていました。

次に、メインの設定項目であるpatternについて深堀りしていきます。説明のためpatternのみに注目したものを以下に掲載します。
```javascript
{
  "version": "2.0.0",
  "tasks": [
    {
		  // (略)
      "problemMatcher": {
        // (略)
        "pattern": {
          "regexp": "^(.*):(\\d+):(\\d+):\\s+(warning|error):\\s+(.*)$",
          "file": 1, // １つめのキャプチャグループはファイルである
          "line": 2, //　同上
          "column": 3, //
          "severity": 4, //
          "message": 5 //
        }
      }
    }
  ]
}
```

patternについては説明の都合上、regexpとそれ以外に分けて示していきます。
まず、regexpには、必要な情報が含まれているパターンを示す正規表現を指定します。
この際、必要な情報を適切な粒度で正規表現から抽出できるよう、適切なキャプチャグループを指定してください。
例えば、次のような出力から情報を取得する例を考えてみます。

```sh
helloWorld.c:5:3: warning: implicit declaration of function ‘prinft’
```

この行には以下のような情報が含まれているのが確認できます。

```sh
- ファイル名
- 行番号
- 列番号
- 重要度
- エラー内容
```

今の例であれば、次のような正規表現で出力をキャプチャできそうです[^5]。

```js
"^(.*):(\\d+):(\\d+):\\s+(warning|error):\\s+(.*)$"
```

[^5]: 正規表現のチェックには[Regex Playground](https://regex101.com/)などを使ってみてもいいかもしれません。

次に、どのキャプチャグループが何に対応するのかを指定すれば、ヒントに必要な情報はエディタ側に渡せそうです。
そこで設定するのがregexp以外の項目です。適切の項目を設定したproblemMatcherは以下のとおりです。

```javascript
{
  "version": "2.0.0",
  "tasks": [
    {
      //(略)
      "problemMatcher": {
        "owner": "cpp",
        "fileLocation": ["relative", "${workspaceFolder}"],
        "source": "gcc",
        "pattern": {
          "regexp": "^(.*):(\\d+):(\\d+):\\s+(warning|error):\\s+(.*)$",
          "file": 1, // １つめのキャプチャグループはファイルである
          "line": 2, //　同上
          "column": 3, //
          "severity": 4, //
          "message": 5 //
        }
      }
    }
  ]
}
```

一方、ツールによっては複数行にまたがって出力されます。

```sh
test.js
  1:0   error  Missing "use strict" statement                 strict
  1:9   error  foo is defined but never used                  no-unused-vars
  2:5   error  x is defined but never used                    no-unused-vars
  2:11  error  Missing semicolon                              semi
  3:1   error  "bar" is not defined                           no-undef
  4:1   error  Newline required at end of file but not found  eol-last
```

このような出力であっても、次のようにproblemMatcherを設定すればエラーをパースできます。

```javascript
{
  "version": "2.0.0",
  "tasks": [
    {
      //(略)
      "problemMatcher": {
        "owner": "cpp",
        "fileLocation": ["relative", "${workspaceFolder}"],
        "source": "gcc",
        "pattern": [
          {
            "regexp": "^([^\\s]+\\.\\w+)$",
            "file": 1
          },
          {
            "regexp": "^\\s*(\\d+):(\\d+)\\s*\\S?\\s*(error|warning)\\s+(.*)\\s+(.*)$",
            "line": 1,
            "column": 2,
            "severity": 3,
            "message": 4,
            "code": 5,
            "loop": true
          }
        ]
      }
    }
  ]
}
```

具体的には、まず、①ファイル名検出用、②それ以外検出用の２パターンを用意しています。
後者に”loop”:trueを追加することで、[ファイル名]→[それ以外（の繰り返し）]という出力からパースしています。 

## 実装結果
豆蔵デベロッパーサイトで使っているLintツールの出力結果は、「おおむねファイルの絶対パス→修正箇所の繰り返し」という形式をとります。

```sh
/.../mamezou-tech-site/src/posts/blogs/2025/0117_cycle-postgres.md
   10:19  error   "で" が連続して2回使われています。                                                                                                                                                                ja-no-successive-word
   10:20  error   "で" が連続して2回使われています。                                                                                                                                                                ja-no-successive-word
   10:21  error   "で" が連続して2回使われています。                                                                                                                                                                ja-no-successive-word
   11:4   error ✔︎ 漢字が7つ以上連続しています: 漢字七文字以上                                                                                                                                                       max-kanji-continuous-len
   12:11  error  【dict2】 "することのできること"は冗長な表現です。"することの"を省き簡潔な表現にすると文章が明瞭になります。 解説: https://github.com/textlint-ja/textlint-rule-ja-no-redundant-expression#dict2  ja-no-redundant-expression
  128:3   error   文末が"。"で終わっていません。                                                                                                                                                                    ja-no-mixed-period
  213:3   error   文末が"。"で終わっていません。
```

一般化して記述すると次のようになります。

```sh
${ファイルの絶対パス}
(複数の空白)${行番号}:${列番号}(複数の空白)$(0or1文字)(複数の空白)${重要度}(複数の空白)${エラーメッセージ}(複数の空白)${エラーの識別子}
以下繰り返し

```
したがって、次のようにproblemMatcherを指定すればキャプチャできることが想定されます。

```javascript
    {
      "label": "deno lint Manual",
      // (略)
      "problemMatcher": {
        "owner": "md",
        "fileLocation": [
          "absolute",
        ],
        "pattern": [
          {
            "regexp": "^([^\\s]+\\.\\w+)$",
            "file": 1
          },
          {
            "regexp": "^\\s*(\\d+):(\\d+)\\s*\\S?\\s*(error|warning)\\s+(.*)\\s+(.*)$",
            "line": 1,
            "column": 2,
            "severity": 3,
            "message": 4,
            "code": 5,
            "loop": true
          }
        ]
      },
    }
```
ここで、サンプルを実行してみましょう。
[https://github.com/shohei-yamashit/lint-sample-vscode](https://github.com/shohei-yamashit/lint-sample-vscode)

サンプルリポジトリ上で校正処理を実行すると、以下のようにmdの編集画面に問題がヒントとして表示されます。

![ed0f92a0da10cefa2ce10ef1b1f72acf.png](https://i.gyazo.com/ed0f92a0da10cefa2ce10ef1b1f72acf.png)

しかしながら、これで万事解決というわけではなく、次のような改善点がみられました。
- “:::”といったプロジェクト特有のシンタックスも校正対象になってしまっている
- エラーを十分にパースできない

これらの問題の解決はProblemMatcherから逸脱するので別の記事で補足させてください。

## まとめ
今回はVScodeのTaskにあるProblemMatcher属性をコントロールすることで、CLIツールからの結果を反映できました。
ツールさえ用意できれば、tasks.jsonを編集するだけでエディタ上でツールの結果を可視化できます。
