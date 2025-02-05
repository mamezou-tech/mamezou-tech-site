---
title: 如何从 kernel 中利用 textlint 的 allowlist 规则
author: shohei-yamashita
date: 2025-01-27T00:00:00.000Z
tags:
  - textlint
  - typescript
  - javascript
image: true
translate: true

---

## 注意事项
这篇文章延伸了[VSCode中显示校对工具提示 - problem matcher的解说](/blogs/2025/01/24/vscode-problemmatcher/)中未能涵盖的内容。  
文章本身的内容是独立的，但如果想了解至今为止的背景，请参阅[上一篇文章](/blogs/2025/01/24/vscode-problemmatcher/)。

与上一篇文章相同，示例代码如下。  
@[og](https://github.com/shohei-yamashit/lint-sample-vscode)

## 背景
虽然在上一篇文章中已经能在查看器中确认文本问题的情况，但仍存在以下问题：

- 甚至会检测到项目特有的语法（”:::”）
- 消息解析无法正常进行

对于后者，可以通过后文所述的方式修正校对结果来解决。  
但是，为了忽略特定的语法，必须控制 textlint 本身。  
另外，本次讨论的是从 Kernel 调用 textlint 而非使用其 CLI 工具的情况。

## 实现例
以下是从 Kernel（库）调用 textlint 时，将特定单词（本次为”:::”）排除在校对范围外的代码摘录。

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

完整的代码请参阅示例仓库内的```src/lint_modified.ts```。  
通过在定义 lint 时传入适当的规则集，我们确认可以在校对时忽略特定符号。

## 关于 textlint
textlint 是一套用于自动化校对文本和 Markdown 文件的工具及库。  
主要具有以下特点：

- 可以通过插件形式扩展设计，支持添加各种规则和过滤器
- 基于 Node.js 运行，可在命令行或编辑器中配合使用
- 拥有专门针对日语文本校对的丰富规则集

它不仅提供了独立的 CLI 工具，还提供了只包含方法的库，是 MIT 许可的开源软件[^1]。  
[^1]: 如有兴趣，请参阅[由库设计者撰写的文档](https://azu.github.io/slide/reactsushi/textlint.html)。

在 isデベロッパーサイト上，并不是从 CLI 工具调用，而是从 Kernel 中分离出库进行校对。

## 通过 Kernel 进行控制
当从 textlint 的 Kernel 库中调用以执行配置处理时，可以大致按照以下流程执行：

1. 首先，准备一个名为 ```TextlintKernelDescriptor``` 的类，并定义规则
2. 基于此定义，创建执行 lint 的类 ```Linter```
3. 然后，```Linter``` 对文件或者字符串进行校对

下面摘取自示例的部分实现。
```typescript:lint_original.ts
const descriptor: TextlintKernelDescriptor = new TextlintKernelDescriptor({
  rules: [
    ...presetRules,
  ],
  plugins: [{
    pluginId: "@textlint/markdown",
    plugin: moduleInterop(markdownProcessor.default) as any, // 在章节末尾进行解说
    options: {
      extensions: ".md",
    },
  }],
  filterRules: [],
});

// 创建 Linter
const linter = createLinter({
  descriptor: descriptor,
});

// 以下执行 Lint 处理
```

```TextlintKernelDescriptor``` 包含有 ```rules```、```plugins```、```filterRules``` 等项目。  
如果希望在校对处理中忽略特定字符，可以直接在 ```filterRules``` 内进行编辑。

:::info:moduleInterop函数について
这是由 "@textlint/module-interop" 提供的实用工具函数。  
它的作用是无论模块导出是 CommonJS 格式还是 ES 模块格式，都能正确处理。  
目前，其实现如下：
```typescript:module-interop/src/index.ts
export function moduleInterop<T>(moduleExports: T): T {
    return moduleExports && (moduleExports as any).__esModule ? (moduleExports as any).default! : moduleExports;
}
```
:::

## 关于 textlint-filter-rule-allowlist
在 textlint 中，如果想要忽略特定模式，可以使用名为 ```textlint-filter-rule-allowlist``` 的库。  
不仅可以进行像本次案例中那样的单词级别控制，还可以实现如下灵活的指定方式：

```typescript
- "ignored-word" // 指定单词
- "/\\d{4}-\\d{2}-\\d{2}/" // 模式
- "/===IGNORE===[\\s\\S]*?===\/IGNORE===/m" // 被特定语法包围的表达式
```

## 消息解析错误的对策
另外一个问题，亦即解析错误，可以通过格式化 lint 结果来应对。  
lint 的结果是一个对象。如果其中包含换行等[^2]内容，就会出现解析失败的情况。

[^2]: 虽然在此示例中未出现，但在某些时机会出现连续空白，为了避免在编辑器中显示提示效果差，因此将其排除。

```typescript
// const results = await linter.lintFiles([...args.paths]);
//  const resultsCopy = [...results]; // 创建 results 的副本
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
		 // (省略)
    {
      type: 'lint',
      ruleId: 'sentence-length',
      message: 'Line 4 sentence length(104) exceeds the maximum sentence length of 100.\n' +
        'Over 4 characters.',　// 如果存在换行字符，则无法正确捕捉输出
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

如果将 message 字段中包含的连续空白或换行替换为半角空格等，就能获得符合预期模式的输出。  
实现例如下：

```typescript:lint_modified.ts
  const results = await linter.lintFiles([...args.paths]);
  // 格式化 Lint 结果
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

## 执行结果
当在示例文本文件（.md）上运行此次改进的 Lint 脚本时，可以看到所有问题均被准确显示。  
与上一篇文章不同，该脚本未检测到语法，并且错误的数量与查看器中的显示一致。  
![024bce60041df3b882c96de8b1f53d09.png](https://i.gyazo.com/024bce60041df3b882c96de8b1f53d09.png)

## 总结
本文结合实例，简单介绍了如何在 Kernel 级别控制 textlint。  
如果只需简单地执行 textlint，CLI 工具即可满足需求。  
但是，借助 text-lint/kernel 模块，则可以实现更细致的控制。  
本文介绍了一个在 JavaScript 中嵌入实现的例子。

## （参考）基于类型级别的证据检查
对于本次的实现，将从类型层面验证其合理性。  
请注意，本章中的信息反映的是截至2025年1月20日的实现情况。  
首先，来看一下 ```TextlintKernelDescriptor``` 的定义。
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
    // （省略）
}
```

接下来注意构造函数的参数 ```TextlintKernelDescriptorArgs```。
```typescript:TextlintKernelDescriptor.ts
// TextlintKernelDescriptor.ts
export interface TextlintKernelDescriptorArgs {
    // 配置基目录
    configBaseDir?: string;
    rules: TextlintKernelRule[];
    filterRules: TextlintKernelFilterRule[];
    plugins: TextlintKernelPlugin[];
}
```

接下来，关注 ```TextlintKernelFilterRule``` 的细节，可以看到一个名为 ```rule``` 的字段。
```typescript:textlint-kernel-interface.ts
// textlint-kernel-interface.ts
export interface TextlintKernelFilterRule {
    // 作为过滤规则名称的键
    // 此键应当被标准化
    ruleId: string;
    // 过滤规则模块实例
    rule: TextlintFilterRuleReporter;
    // 过滤规则选项
    // 通常规则选项写在 .textlintrc 中
    options?: TextlintFilterRuleOptions | boolean;
}
```

只要```TextlintFilterRuleReporter```与 ```textlint-filter-rule-allowlist``` 中的函数保持一致，类型层面的运行便能得到保证。  
在此，我们来确认 ```TextlintFilterRuleReporter``` 的定义。
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

接下来看一下 ```textlint-filter-rule-allowlist```，其实现如下所示：
```javascript:textlint-filter-rule-allowlist.js
// textlint-filter-rule-allowlist.js
"use strict";
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;
// （省略）
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

由于 ```textlint-filter-rule-allowlist``` 是纯 JavaScript 实现，因此没有类型信息。  
不过，比较其参数名和返回值形式后，可以看出与 ```TextlintFilterRuleReporter``` 的类型定义是相符的。  
因此，通过创建以下定义，就可以从 Kernel 库中调用 ```textlint-filter-rule-allowlist```。

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
