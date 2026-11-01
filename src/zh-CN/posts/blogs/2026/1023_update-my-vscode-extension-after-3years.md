---
title: 时隔3年再次更新自制 VS Code 扩展：借助过去的自己与 AI 的故事
author: masahiro-kondo
date: 2026-10-23T00:00:00.000Z
tags:
  - vscode
  - 個人開発
image: true
translate: true

---

## 前言
大约3年多前，我写过一篇更新自制 VS Code 扩展的文章。要将 VS Code 扩展发布到 Marketplace，需要在平时几乎完全不用的 Azure DevOps 项目中创建 PAT（Personal Access Token），而这个流程极其难懂，所以我将其作为个人备忘记录了下来。

@[og](/blogs/2023/07/11/update-vs-code-extension/)

笔者发布的 VS Code 扩展用于辅助编写 ChangeLog。

@[og](https://marketplace.visualstudio.com/items?itemName=kondoumh.changelog-support)

GitHub 仓库在这里。

@[og](https://github.com/kondoumh/changelog-support)

:::info
正如上一篇文章中所写，这个扩展处理的并不是 Markdown 的 CHANGELOG.md，而是 Emacs 等工具所支持的（早在 Markdown 出现之前就存在的）ChangeLog 格式。该扩展旨在将 ChangeLog 用作日常工作的日志和备忘录。
:::

## 首次收到功能增强请求

这个在 Marketplace 上没有星标、5年间仅下载约620次的小众 Extension，前些天竟然一下子收到了3个 enhancement issue。

- [auto-complete / go to filenames · Issue #27 · kondoumh/changelog-support](https://github.com/kondoumh/changelog-support/issues/27)
- [setting language "none" to not insert weekday · Issue #28 · kondoumh/changelog-support](https://github.com/kondoumh/changelog-support/issues/28)
- [add outline · Issue #29 · kondoumh/changelog-support](https://github.com/kondoumh/changelog-support/issues/29)

**auto-complete / go to filenames · Issue #27**

需求是：“在输入 ChangeLog 条目时，希望能补全文件名，进一步还能辅助输入文件内函数等符号（token）。另外也希望有跳转到该文件的功能。”虽然在我的使用场景中不会用到，但这是 IDE 中常见的功能，而且看起来很有意思，因此决定支持。其关键似乎是实现目录中的文件枚举和解析。要在 VS Code 扩展中实现，似乎需要将这些信息传递给 CompletionProvider 和 DefinitionProvider。

**setting language "none" to not insert weekday · Issue #28**

changelog-support 具有输出日期条目的功能，并通过 `dayOfWeekLang` 选项的 `en/ja` 切换来指定星期使用日语还是英语显示。

使用 `en` 时：

```
2026-10-23 Fri <kondoumh@local>
```

使用 `ja` 时：

```
2026-10-23 (金) <kondoumh@local>
```

该请求希望在 `dayOfWeekLang` 的选项中增加 `none`，以提供不显示星期的选项。由于内容很简单，决定支持。

**add outline · Issue #29**

内容是希望将 ChangeLog 的大纲结构显示在 VS Code 标准的大纲小部件中。大纲似乎使用 DocumentSymbolProvider 实现。这样也能让扩展功能显得更加丰富，因此也决定支持。

## 成果

### #27 文件名 token 补全与跳转
在输入 ChangeLog 条目 `* hoge:` 的过程中，会枚举相对于目录内 ChangeLog 文件所在路径的文件中、与当前输入条目匹配的文件，并在选择时进行补全。此外，检测到输入 `* hoge()` 后，会解析文件内部并列举符号。现在还可以通过右键点击条目跳转到文件。虽然我自己不会用，但感觉很方便☺️

![文件名补全](/img/blogs/2026/1023_update-my-vscode-extension-after-3years/filename-completion.gif)

### #28 为日期条目增加不显示星期的选项
这是一个简单的功能，因此省略说明。

### #29 大纲显示

现在 ChangeLog 的内容可以显示为大纲了。很有扩展的感觉，帅气😄

![大纲视图](/img/blogs/2026/1023_update-my-vscode-extension-after-3years/outline-view.png)

:::column:更多请求
提交 enhancement issue 的人还创建了一个请求 issue：“既然如此，也请发布到 VSX Registry 吧。”当无法访问 Marketplace 时，或者想要将扩展安装到兼容 VS Code 的 Web IDE 中时，如果能方便地从 VSX 获取，应该会很实用吧。

[FR: please co-publish on Open VSX Registry · Issue #34 · kondoumh/changelog-support](https://github.com/kondoumh/changelog-support/issues/34)

这个计划在下次发布时处理。
:::

## 更新发布到 Marketplace 的流程

与上一篇文章几乎采用相同的步骤，在 Azure DevOps 项目中创建了用于发布的 Personal Access Token。UI 虽然略有变化，但总算没有迷路，顺利找到了。

上次我是通过 npm 全局安装 vsce 命令的，但使用 npx 快速执行会更优雅。

```shell
npx @vscode/vsce login <publisher-name>

npx @vscode/vsce publish
```

:::info
这次将版本提升至 0.3.0 和 0.3.1 时，使用了 npm 的 version 子命令。

```
npm version 0.3.0
```

它会一次性完成 package.json（+ lockfile）更新、提交以及创建标签。我之前都不知道有这么方便的命令（是 Copilot 告诉我的）。
感觉像是“Node.js 都用了这么多年，居然还不知道”，不过也就这样吧。
:::

我此前并不知道 package.json 中 `engines.vscode` 的版本（如下例中的 1.80.0）必须与 devDependencies 中 `@types/vscode` 的版本保持一致，结果在发布时因错误而卡住了。这个版本指定并不是越新越好，而是要指定所支持的最旧 VS Code 版本，因此需要注意。

```json:package.json
{
  "name": "changelog-support",
  "description": "Extension to support writing ChangeLog.",
  "version": "0.3.1",
  "publisher": "kondoumh",
  "engines": {
    "vscode": "^1.80.0"
  },
  :
  "devDependencies": {
    "@types/vscode": "1.80.0",
  },
```

## 最后

多亏了上一篇文章，这次发布到 Marketplace 时没有变成浦岛太郎。果然，博客最好也作为个人记录写下来。

从热心用户？那里收到功能增强请求后，作为作者果然会更有动力。
这次在文件解析部分和大纲结构构建等方面，代码量增加了不少，但 AI 也能够理解现有代码并完成工作，因此这3个 issue 从需求理解到测试，大约2小时就处理完了。
即使是个人开发的 OSS，也能够缩短从 issue 到达至发布之间的交付周期。
