---
title: How to Utilize textlint's allowlist Rule from the Kernel
author: shohei-yamashita
date: 2025-01-27T00:00:00.000Z
tags:
  - textlint
  - typescript
  - javascript
image: true
translate: true
---

## Important Notes
This article follows up on points that could not be covered in [Displaying Hints for Proofreading Tools in VSCode - An Explanation of Problem Matcher](/en/blogs/2025/01/24/vscode-problemmatcher/). Although the content of this article is self-contained, if you want to know the background so far, please check out [the previous article](/en/blogs/2025/01/24/vscode-problemmatcher/).

As in the previous article, the sample is provided here.
@[og](https://github.com/shohei-yamashit/lint-sample-vscode)

## Background
Based on the previous article, while we were able to view textual issues in the viewer, the following challenges remain:

- It also detects project-specific syntax (":::")
- The parsing of messages does not work properly

As for the latter, it can be resolved by adjusting the proofreading results, as explained later. However, if you want to ignore a specific syntax, you must control textlint itself. In this case, we will consider the scenario where textlint is invoked from the Kernel rather than its CLI tool.

## Implementation Example
When textlint is invoked from the Kernel (library), the following is an excerpt of code that excludes a specific word (this time, ":::") from the proofreading targets.

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

For the full code, please refer to ```src/lint_modified.ts``` in the sample repository.
By passing an appropriate rule set during the lint definition, it has been confirmed that proofreading can be performed while ignoring specific symbols.

## About textlint
textlint is a tool and a set of libraries for automating proofreading of text and Markdown files. It mainly has the following features:

- It is designed to be extensible via plugins, so that various rules and filters can be added
- It is Node.js based and can be used with command-line and editor integrations
- It comes with an extensive rule set specifically for proofreading Japanese text

It is open source under the MIT license and is provided not only as a standalone CLI tool but also as a library with individual methods[^1].

[^1]: If you're interested, please also check out [the documentation written by the library's designer](https://azu.github.io/slide/reactsushi/textlint.html).

At the Mamezou developer site, the library is utilized for proofreading by extracting it from the Kernel rather than from the CLI tool.

## Kernel-based Control
When invoking and configuring textlint's kernel library, you can generally follow these steps:

1. First, prepare the class `TextlintKernelDescriptor` and define the rules.
2. Based on this definition, create the class `Linter` that executes linting.
3. The `Linter` will proofread files or strings.

Here is an excerpt of the implementation from the sample:
```typescript:lint_original.ts
const descriptor: TextlintKernelDescriptor = new TextlintKernelDescriptor({
  rules: [
    ...presetRules,
  ],
  plugins: [{
    pluginId: "@textlint/markdown",
    plugin: moduleInterop(markdownProcessor.default) as any, // explained at the end of the chapter
    options: {
      extensions: ".md",
    },
  }],
  filterRules: [],
});

// Create Linter
const linter = createLinter({
  descriptor: descriptor,
});

// Execute the following lint process
```

The `TextlintKernelDescriptor` contains the items `rules`, `plugins`, and `filterRules`. If you want to perform proofreading that ignores specific characters, you can simply modify the contents of `filterRules`.

:::info:moduleInterop Function
This is a utility function provided by "@textlint/module-interop". It is designed to appropriately handle module exports regardless of whether they are in CommonJS format or ES module format. Currently, it is implemented as follows.
```typescript:module-interop/src/index.ts
export function moduleInterop<T>(moduleExports: T): T {
    return moduleExports && (moduleExports as any).__esModule ? (moduleExports as any).default! : moduleExports;
}
```
:::

## About textlint-filter-rule-allowlist
In textlint, if you want to ignore specific patterns, you can use a library called `textlint-filter-rule-allowlist`. It allows not only word-level control as in this case but also flexible specifications as shown below.

```typescript
- "ignored-word" // specific word
- "/\\d{4}-\\d{2}-\\d{2}/" // pattern
- "/===IGNORE===[\\s\\S]*?===\/IGNORE===/m" // expression enclosed in a specific syntax
```

## Countermeasures for Message Parsing Errors
Regarding the other issue of parsing errors, this can be addressed by formatting the lint results. The lint results come as an object. It has been observed that if newline characters, etc.[^2] are present, parsing fails.

[^2]: Although this did not occur in this example, contiguous white spaces may sometimes appear. They are excluded as they detract from the appearance of hints in the editor.

```typescript
// const results = await linter.lintFiles([...args.paths]);
//  const resultsCopy = [...results]; // create a copy of results
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
		 // (omitted)
    {
      type: 'lint',
      ruleId: 'sentence-length',
      message: 'Line 4 sentence length(104) exceeds the maximum sentence length of 100.\n' +
        'Over 4 characters.', // When newline characters are present, the output cannot be captured properly
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

If you replace the consecutive spaces and newline characters contained in the message field with single-byte spaces (or similar), you can obtain output that matches the intended pattern. An implementation example is as follows.

```typescript:lint_modified.ts
  const results = await linter.lintFiles([...args.paths]);
  // Format the lint results
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

## Execution Results
When running the improved Lint script on the sample text file (.md), you can see that all issues are displayed correctly without any excess or deficiency. Unlike the previous article, the syntax is no longer detected, and both the number of errors and the display in the viewer are consistent.
![024bce60041df3b882c96de8b1f53d09.png](https://i.gyazo.com/024bce60041df3b882c96de8b1f53d09.png)

## Conclusion
This time, we provided a brief introduction, with examples, on how to control textlint at the kernel level. If you only need to execute textlint straightforwardly, the CLI tool is sufficient. However, by using the text-lint/kernel module, more fine-grained control becomes possible. Here, we introduced an example of incorporating a process implemented in JavaScript.

## (Reference) Type-Level Evidence Check
For this implementation, we will verify its validity at the type level. Please note that the information in this section is based on the implementation as of January 20, 2025.
First, let's examine the definition of `TextlintKernelDescriptor`.
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
    // (omitted)
}
```

Next, we focus on the constructor argument `TextlintKernelDescriptorArgs`.
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

Next, if you look at the details of `TextlintKernelFilterRule`, you can see the field called `rule`.
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

As long as consistency is maintained between `TextlintFilterRuleReporter` and the functions within `textlint-filter-rule-allowlist`, proper behavior at the type level is ensured. Here, let's examine the definition of `TextlintFilterRuleReporter`.
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

Next, let's look at `textlint-filter-rule-allowlist`, which is implemented as follows.
```javascript:textlint-filter-rule-allowlist.js
// textlint-filter-rule-allowlist.js
"use strict";
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;
// (omitted)
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

Since `textlint-filter-rule-allowlist` is implemented in JavaScript, there is no type information. However, by comparing the argument names and the format of the return value, it appears that the JavaScript implementation aligns with the type definition of `TextlintFilterRuleReporter`. Therefore, by creating a definition as shown below, it seems that `textlint-filter-rule-allowlist` can be invoked from the Kernel library.

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
