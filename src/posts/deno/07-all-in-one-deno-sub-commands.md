---
title: Deno を始める - 第7回 (All in one な deno のサブコマンド)
author: masahiro-kondo
date: 2022-11-25
templateEngineOverride: md
prevPage: ./src/posts/deno/06-serving-files-on-deno-deploy.md
---

ここまで Deno の様々な機能を見てきました。今回は、Deno のツール(サブコマンド)について見ていきます。


## Deno のサブコマンド
[第1回](/deno/getting-started/01-introduction/#deno-のツール)でも軽く紹介したように、deno CLI は多くのサブコマンドを提供しています。表にして本連載で取り上げたものは該当の箇所にリンクを貼ってみました。

| サブコマンド  | 説明                       | 本連載での言及   |
|:------------|:--------------------------|:---------------|
| bench       | Run benchmarks | |
| bundle      | Bundle module and dependencies into single file | |
| cache       | Cache the dependencies | [第2回](/deno/getting-started/02-use-external-packages/#ロックファイルによる検証) |
| check       | Type-check the dependencies | |
| compile     | Compile the script into a self contained executable | |
| completions | Generate shell completions | |
| coverage    | Print coverage reports | |
| doc         | Show documentation for a module | |
| eval        | Eval script | |
| fmt         | Format source files| |
| info        | Show info about cache or info related to source file | [第1回](/deno/getting-started/01-introduction/#deno-の環境変数) |
| init        | Initialize a new project | [第1回](/deno/getting-started/01-introduction/#最近の-deno-動向) |
| install     | Install script as an executable | [第6回](/deno/getting-started/06-serving-files-on-deno-deploy/#deployctl-によるデプロイ) |
| lint        | Lint source files | |
| lsp         | Start the language server | |
| repl        | Read Eval Print Loop | |
| run         | Run a JavaScript or TypeScript program | 毎回 |
| task        | Run a task defined in the configuration file | [第3回](/deno/getting-started/03-server-side-rendering/#import-maps-と-task-runner-の適用) |
| test        | Run tests | |
| types       | Print runtime TypeScript declarations | |
| uninstall   | Uninstall a script previously installed with deno install | |
| upgrade     | Upgrade deno executable to given version | [第1回](/deno/getting-started/01-introduction/#インストール) |
| vendor      | Vendor remote modules into a local directory | [第2回](/deno/getting-started/02-use-external-packages/#vendor-コマンドによる依存ライブラリのダウンロード) | |

Node.js でいうと node / npm コマンドに加え、複数のサードパーティ製 npm パッケージをインストールし、設定ファイルをいくつか書いて整うレベルの機能が最初から揃っています。実際、install サブコマンドも第6回の deployctl まで使う機会がありませんでした[^1]。

[^1]: これは URL import に依るところも大きいです。

以下、これまで触れていなかったサブコマンドのいくつかを軽く見てみましょう。

## fmt
JavaScript / TypeScript のフォーマッタです。JSX/TSX、JSON に加えて Markdown 中のコードブロックのフォーマットにも対応しています。

`deno fmt` で実際にカレントディレクトリのファイルをフォーマットします。
`--check` オプションをつけるとフォーマット箇所をプレビューできます。

![fmt --check](https://i.gyazo.com/a0965fc4fc68bd86264d9def29c802a4.png)

[deno fmt | Manual | Deno](https://deno.land/manual@v1.28.1/tools/formatter)

## repl
REPL(read-eval-print-loop) を使うとコードスニペットの動作を素早く確認できます。TypeScript にも対応していますが、型チェックは行われず JavaScript にトランスパイルされ実行されます。

[deno repl | Manual | Deno](https://deno.land/manual@v1.28.1/tools/repl)

## lint
JavaScript / TypeScript の Linter です。[deno_lint docs](https://lint.deno.land/) にあるルールに基づいて静的コード分析を行います。

[deno lint | Manual | Deno](https://deno.land/manual@v1.28.1/tools/linter)

## test
JavaScript / TypeScript コードをテストするための組み込みのテストランナーです。テストコードは `Deno.test` API と assert 用のライブラリを使用して書きます。

```typescript
import { assertEquals } from "https://deno.land/std@0.165.0/testing/asserts.ts";

// Compact form: name and function
Deno.test("hello world #1", () => {
  const x = 1 + 2;
  assertEquals(x, 3);
});
```

[Testing | Manual | Deno](https://deno.land/manual@v1.28.1/basics/testing)

## coverage
テスト実行時に `--coverage` オプションをつけてカバレッジ情報を出力しておけば、coverage サブコマンドでカバレッジを視覚的に確認したり、カバレッジレポートを作成したりできます。

[Coverage | Manual | Deno](https://deno.land/manual@v1.28.1/basics/testing/coverage)

## doc
JSDoc 形式のコメントを書いておくと、deno doc コマンドでドキュメントを生成できます。

[deno doc | Manual | Deno](https://deno.land/manual@v1.28.1/tools/documentation_generator)

## compile
Deno のスクリプトを自己実行可能なシングルバイナリにコンパイルします。現状不安定版の機能です。

[メッセージを表示するだけの Deno のコード](https://deno.land/std@0.166.0/examples/welcome.ts?source)をコンパイルしてサイズを確認すると 94Mbyte でした。

```shell
deno compile https://deno.land/std/examples/welcome.ts
```

```shell
$ ls -lh welcome
-rwxrwxrwx  1 masahiro-kondo  staff    94M 11 25 11:29 welcome
```

Deno をライブラリとしてスタティックリンクしているようです。Worker が使えないなどの制約があり、サイズは大きいですがシングルバイナリとして配布できるのが嬉しいケースもあるかもしれません。

[deno compile | Manual | Deno](https://deno.land/manual@v1.28.1/tools/compiler)

## completions
シェルで Deno のコマンドを補完してくれる設定を出力します。筆者は [ohmyzsh](https://github.com/ohmyzsh/ohmyzsh) を使っているので以下のように plugins 配下に設定を書き出しました。

```shell
mkdir ~/.oh-my-zsh/custom/plugins/deno
deno completions zsh > ~/.oh-my-zsh/custom/plugins/deno/_deno
```

.zshrc に以下のように deno plugin を追加しました。

```shell
plugins=(git deno)
```

これでコマンド入力途中に TAB キーで保管してくれたり候補を出したりしてくれるようになります。

![shell completions](https://i.gyazo.com/c3b90f8cef1e5814e55711c86f7a54f7.png)

[Set Up Your Environment | Manual | Deno](https://deno.land/manual@v1.28.1/getting_started/setup_your_environment#shell-completions)

## types

Deno ランタイムの TypeScript 型定義を表示するサブコマンドです。型定義ファイルを作成して利用できます。

```shell
deno types > lib.deno.d.ts
```

## 最後に
Deno はビルトインの最適化されたツールをサブコマンドとして提供しており、deno CLI と 公式の VS Code 拡張をインストールするだけで環境が整います。これも開発体験のよさにつながっていると思います。

この連載執筆で Deno に入門してエコシステムを理解しつつあるので、アプリやライブラリを書いていきたいと思っています。

連載はこれで終了ですが、また Deno 関連の面白い話題があったらブログ記事などで取り上げていこうと思います。
