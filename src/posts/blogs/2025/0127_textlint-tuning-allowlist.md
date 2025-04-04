---
title: textlintのallowlistルールをkernelから活用する方法
author: shohei-yamashita
date: 2025-01-27
tags: [textlint, typescript, javascript]
image: true
---

## 注意事項
この記事は、[VSCodeで校正ツールのヒントを表示 - problem matcherの解説](/blogs/2025/01/24/vscode-problemmatcher/)で網羅できなかったことをフォローしている記事です。
記事そのものの内容は独立していますが、これまでの背景を知りたい場合には[前の記事](/blogs/2025/01/24/vscode-problemmatcher/)をご確認ください。

前回の記事と同様、サンプルは以下に掲載しています。
@[og](https://github.com/shohei-yamashit/lint-sample-vscode)

## 背景
前回の記事の内容でテキスト上の問題をビューワーで確認するところまではできましたが、以下の課題が残っています。

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

コードの全文はサンプルリポジトリ内```src/lint_modified.ts```をご確認ください。
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

## kernelによる制御
textlintのカーネルライブラリを呼び出して構成処理をする場合には、以下の流れでおおむね実行できます。

1. まず、```TextlintKernelDescriptor```というクラスを準備し、ルールを定義しておく
1. この定義を元にlintを実行するクラスである```Linter```を作成する
1. ```Linter```がファイルや文字列を対象に校正する

サンプルから実装を抜粋します。
```typescript:lint_original.ts
const descriptor: TextlintKernelDescriptor = new TextlintKernelDescriptor({
  rules: [
    ...presetRules,
  ],
  plugins: [{
    pluginId: "@textlint/markdown",
    plugin: moduleInterop(markdownProcessor.default) as any, //章末で解説
    options: {
      extensions: ".md",
    },
  }],
  filterRules: [],
});

// Linterを作成
const linter = createLinter({
  descriptor: descriptor,
});

// 以下Lint処理を実行
```
```TextlintKernelDescriptor```には```rules```, ```plugins```, ```filterRules```という項目があります。
特定の文字を無視した校正処理をしたい場合には、```filterRules```内を編集すれば良さそうです。

:::info:moduleInterop関数について
こちらは、"@textlint/module-interop"より提供されているユーティリティ関数です。
モジュールのエクスポートが CommonJS 形式か ESモジュール形式かに関わらず、適切に処理できるようにするためのものです。
現在、以下のような実装となっております。
```typescript:module-interop/src/index.ts
export function moduleInterop<T>(moduleExports: T): T {
    return moduleExports && (moduleExports as any).__esModule ? (moduleExports as any).default! : moduleExports;
}
```
:::

## textlint-filter-rule-allowlistについて
textlintにおいて、特定のパターンを無視したい場合には、```textlint-filter-rule-allowlist```と呼ばれるライブラリが利用できます。
今回のケースのようなワードレベルの制御だけではなく、以下のような柔軟な指定も可能です。

```typescript
- "ignored-word" // 単語指定
- "/\\d{4}-\\d{2}-\\d{2}/" // パターン
- "/===IGNORE===[\\s\\S]*?===\/IGNORE===/m" // 特定のシンタックスで囲まれた表現
```

## メッセージのパースエラー対策
もう1つの問題であるパースエラーについてですが、lintの結果を整形することで対処できます。
lintの結果はオブジェクトになっています。この中に改行等[^2]があるとパースの失敗が確認できました。

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
今回は、textlintをkernelレベル制御する方法について例を交えながら、簡単に紹介させていただきました。
単純にtextlintを実行するだけであれば、CLIツールで十分事足ります。
ただ、text-lint/kernelモジュールを使えば、より細かい制御が可能になります。
今回は、JavaScriptで実装されている処理を組み込む例を紹介しました。

## （参考）型レベルでのエビデンスチェック
今回の実装について、型レベルで実装の妥当性を確認していきます。
本章の情報は2025年1月20日時点での実装であることに注意してください。
まず、```TextlintKernelDescriptor```の定義を確認します。
```TextlintKernelDescriptor```には以下のようなコンストラクタがあります。

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
次にコンストラクタの引数である```TextlintKernelDescriptorArgs```に着目します。
```filterRules```の型が```TextlintKernelFilterRule[]```で定義されていることが分かります。

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
次に```TextlintKernelFilterRule```の細部に注目すると、```rule```と呼ばれるフィールドを確認できます。
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
```TextlintFilterRuleReporter```と、```textlint-filter-rule-allowlist```内の関数との間で整合性が取れれば、型レベルでの動作は保証されます。
ここで、```TextlintFilterRuleReporter```の定義を確認します。

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

次に```textlint-filter-rule-allowlist```を見てみると、以下のように実装されています。

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
```textlint-filter-rule-allowlist```はあくまでJavaScriptで実装されているので、型情報はありません。
しかしながら、引数名や返り値の形式を比較すると、```TextlintFilterRuleReporter```の型定義とJavaScriptでの実装は一致しているように見えます。
したがって、以下のような定義を作成することで、```textlint-filter-rule-allowlist```をKernelライブラリから呼び出せそうです。

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
