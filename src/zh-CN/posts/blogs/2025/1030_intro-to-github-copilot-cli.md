---
title: GitHub Copilot 的 CLI 也来了！
author: masahiro-kondo
date: 2025-10-30T00:00:00.000Z
tags:
  - GitHub Copilot
image: true
translate: true

---

## 前言
虽然有点耽搁了一段时间，但在上月底 GitHub Copilot CLI 已进入公测预览。

@[og](https://github.blog/changelog/2025-09-25-github-copilot-cli-is-now-in-public-preview/)

从 VS Code 扩展开始的 GitHub Copilot 也像 Claude Code 和 Gemini 一样，可以作为 CLI 来运行。以 CLI 形式提供后，
- 不再受限于 IDE
- 可以使用管道与其他 CLI 工具联动

这为它增添了以上优势。许多人也会对只用终端就可以完成工作的这一点感到吸引。

此外，由于你处于已登录 GitHub 的状态，还可以操作自己参与的仓库，也可以立即使用 GitHub 的 MCP 服务器。

可以从以下链接参考日文文档。

[GitHub Copilot CLI 的使用 - GitHub Docs](https://docs.github.com/ja/copilot/how-tos/use-copilot-agents/use-copilot-cli)

:::alert
以前作为 GitHub CLI 扩展提供的 gh-cpilot 随着 Copilot CLI 的公测预览而被弃用，并将被 Copilot CLI 所取代。

@[og](https://github.blog/changelog/2025-09-24-deprecate-github-copilot-extensions-github-apps/)

关于 gh-copilot，去年二月已做过介绍。

@[og](https://developer.mamezou-tech.com/blogs/2024/02/28/github-copilot-in-cli/)
:::

:::info
GitHub Copilot CLI 可在 GitHub Copilot Pro、GitHub Copilot Pro+、GitHub Copilot Business、GitHub Copilot Enterprise 计划中使用。
:::

## 安装与启动
按照文档进行安装。

@[og](https://docs.github.com/ja/copilot/how-tos/set-up/install-copilot-cli)

可以通过 npm 进行全局安装。

```shell
npm install -g @github/copilot
```

启动 GitHub CLI。

```shell
copilot
```

将启动 GitHub CLI 的 TUI，显示登录 GitHub 的状态以及与 GitHub MCP 服务器的连接情况。

![run copilot](https://i.gyazo.com/619b7fec51279ed982a4b7cf9f5e3831.png)

系统会询问要执行操作的文件夹是否可信。因为我总是在 `$HOME/dev` 下工作，所以选择了第 2 个选项 `Yes, and remember this folder for future sessions`。

:::info
在我的环境中，由于已通过 GitHub CLI（不是 Copilot CLI）预先登录了 GitHub，所以我认为它使用的是该认证令牌来保持登录状态。
:::

## 试用
要了解如何使用，以下页面很有帮助。

@[og](https://docs.github.com/ja/copilot/concepts/agents/about-copilot-cli)

### 对话模式
这是在 TUI 上输入提示，以交互方式推进工作的一种模式。

我先切换到从 GitHub 克隆的我正在开发的 Electron 应用仓库([sbe](https://github.com/kondoumh/sbe))所在目录，然后启动了 Copilot CLI。

```shell
cd sbe
copilot 
```

你可以使用 `@` 来提及文件。在 `@` 后输入路径的一部分，就会列出匹配的候选项。

![mention file](https://i.gyazo.com/21ad22a50b6bc96c81c4e13382fa8f6e.png)

它对源代码进行了说明。

![explain](https://i.gyazo.com/bc474ee9da491423f47de4c8bd099328.png)

用日语提问，它会用日语回答。

![explain in japanese](https://i.gyazo.com/1e9e556c84d1a93264a46b1f9006557a.png)

退出对话模式后，会显示使用统计和代码变更行数等信息。

```
 Total usage est:       2 Premium requests
 Total duration (API):  15.1s
 Total duration (wall): 12m 33.3s
 Total code changes:    0 lines added, 0 lines removed
 Usage by model:
     claude-sonnet-4.5    24.9k input, 414 output, 0 cache read, 0 cache write (Est. 2 Premium requests)

 Shutting down...
```

### 编程模式
这是通过参数或管道向 Copilot CLI 提供提示并直接执行的模式。

```
copilot -p "explain src/favs.js"
```

不会启动 TUI，而是直接输出提示的结果。

```
I'll read the src/favs.js file to explain it to you.

✓ Read src/favs.js (57 lines)

This is a Vue.js 3 app that manages favorites in an Electron application. It creates a UI for displaying and deleting favorite items with these key features:

**Core functionality**: Loads favorites from the Electron backend via `window.favsApi`, displays them in a list, and provides delete functionality with a confirmation dialog. It listens for window focus events to refresh the favorites list.

**Theme support**: Automatically detects and applies light/dark mode based on system preferences using Vuetify's theming system.


Total usage est:       1 Premium request
Total duration (API):  11.5s
Total duration (wall): 15.2s
Total code changes:    0 lines added, 0 lines removed
Usage by model:
    claude-sonnet-4.5    23.6k input, 239 output, 0 cache read, 0 cache write (Est. 1 Premium request)
```

结果会输出到标准输出，然后显示使用统计信息。

### 本地任务
可以指示其修改本地的代码。

首先，请求对一个源代码文件进行审查，并让它提出改进点。

```
Review @src/about.js
```

![Review code](https://i.gyazo.com/638ec52f5d4cfb23e2ecbd75936fe142.png)

它夸奖了诸如具有适当生命周期钩子的清晰组件结构，以及通过 IPC 进行关注点适当分离等优点。

它也提出了一些问题，其中让我在意的是，在使用的 Vue `beforeUnmount` 钩子中没有移除与焦点相关的监听器，因此存在内存泄漏的隐患。

于是，我请求它修复该问题。

```
Fix No cleanup problem
```

![Fix code](https://i.gyazo.com/5ac5afa32e800e409e8bc69ec68a1390.png)

它添加了 `beforeUnmount` 钩子方法和删除监听器的代码。但由于不存在通过 `off` 删除监听器的 API，因此该更改并不被接受。不过，现在我只是想尝试 Copilot CLI 的功能，所以请求它也对其他文件做同样的应用。它会询问是否针对每个文件都应用更改。

```
Apply this fix to other files too
```
![Apply to other files](https://i.gyazo.com/ee1029b82a463ec3f84b6d041f833c7e.png)

已将更改应用到所有文件。

:::info
在此示例中未使用，但在本地任务中使用 sed、chmod 等外部命令时，会询问是否允许使用。也可以通过 `--allow-tool` 在执行时预先授予权限。
:::

### GitHub 任务（获取 issue 列表）
也可以执行与 GitHub 操作相关的任务。首先，让它显示仓库的 issue 列表。

```shell
list my open issues
```

![list issues](https://i.gyazo.com/6dd6ffdf93f9deb5bb7356014be84029.png)

### GitHub 任务（创建 PR）
我手上已有刚才在 Electron 应用中移除监听器的更改，所以让它基于此创建 PR。

```shell
create a pull request from this changes
```

![Creating PR](https://i.gyazo.com/b0663df6854b6c70aea8e303484b1fc6.png)

它创建了分支并完成了 push。接着询问是否要基于此创建 PR。

![Confirming create PR](https://i.gyazo.com/758ac0295fb4df46824a5453bf5d2f45.png)

选择 Yes 后，PR 已创建。

![Created PR](https://i.gyazo.com/5d318abfc590e54d2e124dff3d0ede86.png)

PR 的作者是我本人。

### GitHub 任务（执行 Actions 工作流）
通过 GitHub 任务，也可以操作 GitHub Actions 工作流。首先，让它列出该仓库的工作流。

![list workflows](https://i.gyazo.com/f9a84487aa6642d692e566ed9edd5e96.png)

在列出的工作流中，`OS Matrix` 是一个跨平台执行 Electron 应用测试的工作流。当手动执行时，将参数 `beta` 设置为 `true`，就会安装最新的 Electron 测试版并进行测试。工作流文件可从[此处](https://github.com/kondoumh/sbe/blob/main/.github/workflows/ci.yml)查看。

我尝试指示执行该工作流。

```
Run OS Matrix with input value "beta" to true
```

它提供了使用 GitHub CLI（而非 GitHub Copilot CLI）来执行的方案，并提示了执行选项。

![Trigger Workflow](https://i.gyazo.com/90ce6d7d5e1e03942647a27d02bfb47d.png)

选择 1 可允许执行一次，选择 2 则在本次会话中一直给予权限。选择 1 后，似乎执行成功了。

![Workflow triggerd](https://i.gyazo.com/ea3da2b3a8d5c335f6aa060adf535f65.png)

实际上，它确实安装了 Electron 测试版并执行了测试。

![Running workflow](https://i.gyazo.com/4d1f9abea98b1b7ed90f128f3c705b1a.png)

即使不使用 Web UI，也不需要了解 GitHub CLI 的工作流执行方式，只需用自然语言下达指令，真是太方便了。

## 最后
GitHub Copilot CLI 提供了超出预期的强大 Copilot 协作环境。

它已经支持多行输入提示等功能，正在朝 GA 版本不断改进。

@[og](https://github.blog/changelog/2025-10-17-copilot-cli-multiline-input-new-mcp-enhancements-and-haiku-4-5/)

如果能熟练运用与 MCP 服务器的联动等功能，仅通过终端就能完成许多复杂的任务呢。
