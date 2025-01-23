---
title: 【補足記事】textlint-filter-rule-allowlistをkernelから使ってみよう
author: shohei-yamashita
date: 2025-01-27
tags: [textlint, typescript, javascript]
image: true
---

## 注意事項
この記事は、関連記事で網羅できなかったことをフォローしている記事です。
記事そのものの内容は独立していますが、細かい経緯を知りたい場合には前の記事をご確認ください。

サンプルについては前回の記事と同様、以下に掲載しています。
[https://github.com/shohei-yamashit/lint-sample-vscode](https://github.com/shohei-yamashit/lint-sample-vscode)

## 背景
前回の記事の内容でテキスト上の問題をビューワーで確認するところまではできました。
しかしながら、以下の課題が残っています。

- プロジェクト特有のシンタックス（”:::”）まで検知されてしまう
- メッセージのパースがうまくいかない

後者については、後述のとおり校正結果を補正してあげることで解決できます。
しかしながら、特定のシンタックスを無視するためには、textlintそのものを制御しなければなりません。
また、今回はtextlintのCLIツールではなく、Kernelから呼び出している場合について考えてみます。

## 実装例
textlintをKernel(ライブラリ)から呼び出している場合に、特定のワード(今回は”:::”)を校正対象外とするコードの抜粋は次のとおりです。

```diff-js:lint_modified.ts
const descriptor: TextlintKernelDescriptor = new TextlintKernelDescriptor({
  rules: [
    ...presetRules,
  ],
  plugins: [{
    pluginId: "@textlint/markdown",
    plugin: moduleInterop(markdownProcessor.default) as any,
    options: {
      extensions: ".md",
    },
  }],
  filterRules: [
+    {
+      ruleId: "allowlist",
+      rule: moduleInterop(allowlistFilter.default),
+      options: {
+        allow: ['/:::/'],
+      },
+    },
  ],
});
const linter = createLinter({
  descriptor: descriptor,
});
```

コードの全文はサンプルリポジトリ内src/lint_modified.tsをご確認ください。
適切なルールセットをlintの定義時に渡すことで、特定の記号を無視して校正できることを確認しました。

## textlintについて
textlintは、テキストやMarkdownファイルの校正を自動化するためのツールおよびライブラリ群です。
主に以下のような特徴があります。

- プラグイン形式で拡張可能な設計となっており、様々なルールやフィルターを追加できる
- Node.jsベースで動作し、コマンドラインやエディタ連携で利用可能
- 日本語テキストの校正に特化したルールセットが充実

独立したCLIツールだけではなく、メソッドのみを切り出したライブラリまで提供されているMITライセンスのオープンソースです[^1]。
[^1]: 興味があれば、[ライブラリの設計者が書かれたドキュメント](https://azu.github.io/slide/reactsushi/textlint.html)もご確認ください。

豆蔵デベロッパーサイトにおいては、CLIツールからではなくKernelからライブラリを切り出して校正に利用しています。

## Kernelによる制御
textlintのカーネルライブラリを呼び出して構成処理をする場合には、以下の流れでおおむね実行できます。

1. まず、TextlintKernelDescriptorというクラスを準備し、ルールを定義しておく
1. この定義を元にlintを実行するクラスであるLinterを作成する
1. Linterがファイルや文字列を対象に校正する

サンプルから実装を抜粋します。
```typescript:lint_original.ts
const descriptor: TextlintKernelDescriptor = new TextlintKernelDescriptor({
  rules: [
    ...presetRules,
  ],
  plugins: [{
    pluginId: "@textlint/markdown",
    plugin: moduleInterop(markdownProcessor.default) as any,
    options: {
      extensions: ".md",
    },
  }],
  filterRules: [],
});
```
TextlintKernelDescriptorにはrules, plugins, filterRulesという項目があります。
特定の文字を無視した校正処理をしたい場合には、filterRules内を編集すれば良さそうです。

## textlint-filter-rule-allowlistについて
text-lintにおいて、特定のパターンを無視したい場合には、textlint-filter-rule-allowlistと呼ばれる別のライブラリが提供されています。
今回のケースのようなワードレベルの制御だけではなく、以下のような柔軟な指定も可能です。

```typescript
- "ignored-word" // 単語指定
- "/\\d{4}-\\d{2}-\\d{2}/" // パターン
- "/===IGNORE===[\\s\\S]*?===\/IGNORE===/m" // 特定のシンタックスで囲まれた表現
```

## メッセージのパースエラー対策
もう1つの問題であるパースエラーについてですが、lintの結果を整形することで対処できます。
Linterによる出力結果はオブジェクトになっています。この中に改行等[^2]があるとパースの失敗が確認できました。

[^2]: この例では現れませんでしたが、タイミングによっては連続した空白が現れます。エディタで見えるヒントの見栄えが悪くなるので除外します。

```typescript
// const results = await linter.lintFiles([...args.paths]);
//  const resultsCopy = [...results]; // resultsのコピーを作成
//  resultsCopy.map((result) => {
//    console.log(result);
//  });
{
  messages: [
    {
      type: 'lint',
      ruleId: 'ja-no-successive-word',
      message: '"か" が連続して2回使われています。',
      index: 7,
      line: 1,
      column: 8,
      range: [Array],
      loc: [Object],
      severity: 2,
      fix: undefined
    },
		 // (略)
    {
      type: 'lint',
      ruleId: 'sentence-length',
      message: 'Line 4 sentence length(104) exceeds the maximum sentence length of 100.\n' +
        'Over 4 characters.',　// 改行文字があると出力を適切にキャプチャできない
      index: 89,
      line: 4,
      column: 1,
      range: [Array],
      loc: [Object],
      severity: 2,
      fix: undefined
    },
    {
      type: 'lint',
      ruleId: 'no-doubled-conjunctive-particle-ga',
      message: '文中に逆接の接続助詞 "が" が二回以上使われています。',
      index: 103,
      line: 4,
      column: 15,
      range: [Array],
      loc: [Object],
      severity: 2,
      fix: undefined
    }
  ],
  filePath: '/Users/shoheiyamashita/myprj/JSTest/text-lint-custom/lint-sample/post/sample.md'
}
```
messageフィールドに含まれる連続した空白や改行を半角スペース等で置き換えれば、パターンに合致するような出力が得られそうです。
実装例は次のようになります。
```typescript:lint_modified.ts
  const results = await linter.lintFiles([...args.paths]);
  // Lint結果をフォーマット
  const resultsFormatted = results.map((result) => {
    return {
      ...result,
      messages: result.messages.map((message) => ({
        ...message,
        message: message.message.replace(/[\n\t]/g, " ").replace(/\s+/g, " "),
      })),
    };
  });
```
## 実行結果
サンプルのテキストファイル(.md)に今回改良したLintスクリプトを実行すると、過不足なく問題が表示されていることがわかります。
前回の記事とは違い、シンタックスが検知されていない上、エラーの数とビューワーの表示も一致しています。
![024bce60041df3b882c96de8b1f53d09.png](https://i.gyazo.com/024bce60041df3b882c96de8b1f53d09.png)

## まとめ
今回は、textlintをKernelレベル制御する方法について例を交えながら、簡単に紹介させていただきました。
単純にtextlintを実行するだけであれば、CLIツールで十分事足ります。
ただ、text-lint/kernelモジュールレベルで制御することにより細かい処理が可能になります。
今回は、JSで実装されている処理を組み込む例を紹介しました。

## （参考）型レベルでのエビデンスチェック
今回の実装について、型レベルで実装の妥当性を確認していきます。
本章の情報は2025年1月20日時点での実装であることに注意してください。
まず、TextlintKernelDescriptorの定義を確認します。TextlintKernelDescriptorには以下のようにコンストラクタがあります。

```typescript:TextlintKernelDescriptor.ts:TextlintKernelDescriptor.ts
// TextlintKernelDescriptor.ts
export class TextlintKernelDescriptor {
    readonly rule: TextlintRuleDescriptors;
    readonly filterRule: TextlintFilterRuleDescriptors;
    readonly plugin: TextlintPluginDescriptors;
    readonly configBaseDir?: string;
    constructor(private args: TextlintKernelDescriptorArgs) {
        this.rule = createTextlintRuleDescriptors(args.rules);
        this.filterRule = createTextlintFilterRuleDescriptors(args.filterRules);
        this.plugin = createTextlintPluginDescriptors(args.plugins);
        this.configBaseDir = args.configBaseDir;
    }
    // (略)
}
```
次にコンストラクタの引数であるTextlintKernelDescriptorArgsに着目します。
filterRulesの型がTextlintKernelFilterRule[]で定義されていることが分かります。

```typescript:TextlintKernelDescriptor.ts
// TextlintKernelDescriptor.ts
export interface TextlintKernelDescriptorArgs {
    // config base directory
    configBaseDir?: string;
    rules: TextlintKernelRule[];
    filterRules: TextlintKernelFilterRule[];
    plugins: TextlintKernelPlugin[];
}
```
次にTextlintKernelFilterRuleの細部に注目すると、ruleと呼ばれるフィールドを確認できます。
```typescript:textlint-kernel-interface.ts
// textlint-kernel-interface.ts
export interface TextlintKernelFilterRule {
    // filter rule name as key
    // this key should be normalized
    ruleId: string;
    // filter rule module instance
    rule: TextlintFilterRuleReporter;
    // filter rule options
    // Often rule option is written in .textlintrc
    options?: TextlintFilterRuleOptions | boolean;
}
```
TextlintFilterRuleReporterと、textlint-filter-rule-allowlist内の関数との間で整合性が取れれば、型レベルでの動作は保証されます。
ここで、TextlintFilterRuleReporterの定義を確認します。

```typescript:TextlintFilterRuleModule.ts
/**
 * textlint filter rule option values is object or boolean.
 * if this option value is false, disable the filter rule.
 */
export type TextlintFilterRuleOptions = {
    [index: string]: any;
};
/**
 * Rule Reporter Handler object define handler for each TxtNode type.
 */
export type TextlintFilterRuleReportHandler = {
    [P in ASTNodeTypes]?: (node: TypeofTxtNode<P>) => void | Promise<any>;
} & {
    [index: string]: (node: any) => void | Promise<any>;
};
/**
 * textlint filter rule report function
 */
export type TextlintFilterRuleReporter = (
    context: Readonly<TextlintFilterRuleContext>,
    options?: TextlintFilterRuleOptions
) => TextlintFilterRuleReportHandler;
```

次にtextlint-filter-rule-allowlistを見てみると、次のように実装されています。

```javascript:textlint-filter-rule-allowlist.js
// textlint-filter-rule-allowlist.js
"use strict";
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;
// (略)
function _default(context, options) {
  var {
    Syntax,
    shouldIgnore,
    getSource
  } = context;
  var baseDirectory = (0, _getConfigBaseDir.getConfigBaseDir)(context) || process.cwd();
  var allowWords = options.allow || defaultOptions.allow;
  var allowlistConfigPaths = options.allowlistConfigPaths ? getAllowWordsFromFiles(options.allowlistConfigPaths, baseDirectory) : [];
  var allAllowWords = allowWords.concat(allowlistConfigPaths);
  return {
    [Syntax.Document](node) {
      var text = getSource(node);
      var matchResults = (0, _regexpStringMatcher.matchPatterns)(text, allAllowWords);
      matchResults.forEach(result => {
        shouldIgnore([result.startIndex, result.endIndex]);
      });
    }
  };
}
```
textlint-filter-rule-allowlistはあくまでJSのスクリプトなので、型情報はありません。
しかしながら、引数名や返り値の形式をみると、TextlintFilterRuleReporterという型定義とJavaScriptでの実装は一致しているように見えます。
したがって以下のような定義を作成することで、textlint-filter-rule-allowlistをKernelライブラリから呼び出せそうです[^4]。

```diff-js:lint_modified.ts
const descriptor: TextlintKernelDescriptor = new TextlintKernelDescriptor({
  rules: [
    ...presetRules,
  ],
  plugins: [{
    pluginId: "@textlint/markdown",
    plugin: moduleInterop(markdownProcessor.default) as any,
    options: {
      extensions: ".md",
    },
  }],
  filterRules: [
+    {
+      ruleId: "allowlist",
+      rule: moduleInterop(allowlistFilter.default),
+      options: {
+        allow: ['/:::/'],
+      },
+    },
  ],
});
const linter = createLinter({
  descriptor: descriptor,
});
```


[^4]: モジュールのエクスポートが CommonJS 形式か ESモジュール形式かに関わらず、適切に処理できるようにするためのユーティリティです。
