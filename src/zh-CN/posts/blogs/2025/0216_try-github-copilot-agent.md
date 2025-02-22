---
title: 试用 GitHub Copilot 的代理模式（公测版）
author: masahiro-kondo
date: 2025-02-16T00:00:00.000Z
tags:
  - AIエージェント
  - GitHub Copilot
  - vscode
image: true
translate: true

---

## 介绍
听说 GitHub Copilot 的代理模式已经觉醒了。

@[og](https://github.blog/news-insights/product-news/github-copilot-the-agent-awakens/)

介绍视频也已上传到 YouTube。

<iframe width="560" height="315" src="https://www.youtube.com/embed/of--3Fq1M3w?si=p7HCmjJYvpVsOliV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

我想试试 GitHub Copilot 的代理，看看它到底是什么样的。

:::info
在去年的 Adkale 文章中也预言过，今年 2025 年会出现代理。
@[og](/zh-cn/blogs/2024/12/04/openai-swarm-multi-agent-intro/)
:::

## 使用准备
在撰写本文时，需要安装的是 VS Code Insiders 版本而不是正式发布版，所以请从下面的链接下载并安装 VS Code Insiders 版。[^1]

@[og](https://code.visualstudio.com/insiders/)

[^1]: 即使安装 Insiders 版本，也不会影响正式版 VS Code，所以请放心。

启动 VS Code Insider 版后，请安装 GitHub Copilot Chat 扩展的预发布版。在扩展选项卡中搜索 "Copilot Chat" 将会在顶部显示。

![Install GitHub Copilot Chat Pre-Release](https://i.gyazo.com/ab949401efa609baafceac984976b6a2.png)

为了使用 Copilot，请用持有有效订阅的 GitHub 帐户登录。

![Sign in with GitHub](https://i.gyazo.com/848c132eb54c47d645693579e84479f9.png)

请在 Copilot 设置中确认已启用 Agent。

![Settings](https://i.gyazo.com/76aacce1da4d0468ce44bb741d8228cb.png)

打开 Copilot Edits 模式。

![Open Copilot Edits](https://i.gyazo.com/b4e0f8c139e01aaaf3e0ce7f4b4d0bae.png)

在自律执行任务的代理模式下，我认为与传统的 Chat UI 相比，能够直接编辑任务文件的 Copilot Edits 更为合适。

:::info
关于 Copilot Edits，请参阅以下文章。

@[og](/zh-cn/blogs/2025/02/15/refactor-code-with-github-copilot-edits/)
:::

在提示输入框下方的选项中，将模式从 Edit 切换到 Agent。

![Switch to Agent](https://i.gyazo.com/59b0cdc7cf175b70a32173aed271fd6c.png)

这样一来，Copilot Edits 就会进入代理模式 (Experimental)。

![Agent Mode Panel](https://i.gyazo.com/a5805735f8b80a9535280d50cb8c65a7.png)

既然如此，我还顺便选择了模型，不是 GPT 4o，而是 Claude 3.5 Sonnet (Preview)。

![Cloude](https://i.gyazo.com/caf9c20f6014767a5732720a02d55770.png)

## 利用代理模式构建一个简单的应用
由于是代理模式，所以我要求它做一些稍微复杂的事情，就像下面这样给出指示：

「请使用 Nuxt 3 创建一个管理 ToDo 的网站，并将数据保存到 SQLite 中。」

最初弹出了启用 Sonnet 的对话框，所以我点击了 Enable。

![Enable sonnet](https://i.gyazo.com/1ae71ec613e0496b308956c731e93f2d.png)

接下来建议执行生成 Nuxt 应用的命令。

![Create Nuxt app](https://i.gyazo.com/d5e68389c41f2f8712a9fce5b162f7cd.png)

点击 Continue 后，命令便实际执行起来。在命令执行期间，状态处于等待中。

![waiting for executing CLI](https://i.gyazo.com/927d1c92faeeeb7c5b6e188d98eaba5c.png)

终端中开始生成 Nuxt 项目，同时进行包安装和项目创建（在运行 nuxi 时，通常会像往常一样由人工选择包管理器等操作）。

![npx nuxi](https://i.gyazo.com/336031d7f102eec7e0a8c858179c3d03.png)

在项目创建之后，据说接下来是安装与 SQLite 相关的包。就照它的要求点击 Continue。

![Install SQLite](https://i.gyazo.com/f535f239760b72fe5f7a086821d2558c.png)

在终端中，各个包开始被安装。

![Install npm packages](https://i.gyazo.com/64f52741c0eed17a47df4cb175f05a7b.png)

项目创建和必要包的安装完成后，应用便以惊人的速度生成。最后，系统提示启动开发服务器。

![Building App and run app](https://i.gyazo.com/d62258c02679942f0cdb2f18a528bc99.png)

此时，项目中已添加了生成的文件。

![Explorer](https://i.gyazo.com/3398ad498474aace2961b2b36b944906.png)

暂且启动了开发服务器试试。

![npm run dev](https://i.gyazo.com/b1145b992887b7a125be99d6719ec0dc.png)

应用已经可以使用了。

![ready to use](https://i.gyazo.com/fbb4a889597bd696e8f60ef61de7e369.png)

连接到 localhost:3000 后，就能看到该应用。

![Open App](https://i.gyazo.com/d7a5e0ce31dfdabc60b0786a697eccbe.png)

随便输入了一个 ToDo 并点击添加按钮，但没有任何反应。

![Cannot add todo](https://i.gyazo.com/54326d2dfc6d9b59b1d94d9163b523d0.png)

终端中出现了提示缺少 todos 表的错误。

![Error message](https://i.gyazo.com/5c82ac17a3f55dc2385d0a1ae48d97ce.png)

## 修复运行错误
好了，虽然应用以惊人速度生成了，但它并不能正常运行。于是我复制了终端中的错误信息并粘贴到了提示框中。它似乎打算通过 Dizzle ORM 的迁移来创建表。

![recover from error](https://i.gyazo.com/0b44b3217e4e5a99a31d4d030a41969f.png)

点击 Continue 后，由于目标终端的当前路径不同，导致出现了错误。

![Command execution error](https://i.gyazo.com/0a03d2f9b99e78cd1d248e76a70e5cc4.png)

检测到运行错误后，它提出了替代方案，所以我点击了 Continue。

![retry command](https://i.gyazo.com/4baf8004ab247f78bb4bb07a1a18ad72.png)

虽然出现了弃用警告，但似乎执行成功了。

![dizzle-kit](https://i.gyazo.com/5ac64f3d63ea2a25fbb6738f36a63bdc.png)

检测到命令执行成功后，系统提示需重启开发服务器，我便点击了 Continue。

![Rerun app](https://i.gyazo.com/1fbcd794476e5166411ab7d375a975b6.png)

这次终于顺利运行了。

![ToDo App worked](https://i.gyazo.com/1ad6e284883a01eb2d536e60b10fa3af.png)

## 添加功能
虽然代理模式的威力已经得到充分验证，但趁此机会，我让它添加一点小功能。

我给出了如下提示：
「我希望在 ToDo 项目中添加截止日期。截止日期的默认值为当天，并希望能通过日历控件进行选择。」

![Add feature](https://i.gyazo.com/5c1d686c5d98c32d149c88985b27fc70.png)

随后，任务以惊人的速度被规划和执行，代码修正也已完成。接下来，只需初始化数据库并重启。

![Feature implemented](https://i.gyazo.com/6045f5d20cef11215e3c13984729e513.png)

由于笔者操作失误，数据库没有被创建。遇到问题后，我在提示框中询问并获得了相应的命令。

![Ask DB initialize command](https://i.gyazo.com/0a72bfdb1552ca93c5ab846b886d3a56.png)

数据库创建虽然成功，但在启动时出现了错误，于是我粘贴了错误信息进行询问。

![Fix error](https://i.gyazo.com/792a2c65acb2f964cd8c2213aeb25f9c.png)

它很快重新识别出自己生成代码中的问题，并按照要求添加了功能。

![Updated app](https://i.gyazo.com/1aa52e53d3f36a24a830cd900d688e79.png)

## 最后
以上就是对 Copilot 代理功能的试用。应用的生成和功能添加分别仅用时几十秒。正如前文所述，它表现得非常自律，完全不负代理这一称号。即使在出错时，只需给予反馈，它就会自发地修正代码。实在是太能干了。
