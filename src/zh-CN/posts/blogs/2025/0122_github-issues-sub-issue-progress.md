---
title: 可以通过 GitHub Issues 的子问题追踪进度
author: masahiro-kondo
date: 2025-01-22T00:00:00.000Z
tags:
  - プロジェクト管理
  - GitHub
image: true
translate: true

---

## 引言

去年秋天，GitHub Issues 的子问题功能成为私密预览版时，我曾撰写了一篇文章尝试介绍这一功能。

- [GitHub Issues 支持创建子问题（Beta 版）](/blogs/2024/10/05/github-issues-with-sub-issues-beta/)

今年年初，这一功能进入了公共预览阶段，所有用户都可以使用。

@[og](https://github.blog/changelog/2025-01-13-evolving-github-issues-public-preview/)

## 项目中的父子关系和进度可视化

在私密预览阶段的文章中，我介绍了一种[通过分组展示 Issue 父子关系的可视化方法](/blogs/2024/10/05/github-issues-with-sub-issues-beta/#issue-の階層構造の可視化)。

在 Table 视图和 Roadmap 视图中，可以通过将 `Group By` 设置为 `Parent issue` 来表达层级结构。这时，还会显示子问题状态对应的进度条。

![Group by parent issue](https://i.gyazo.com/9479ff561b49190ad7fcdf9bd9f760a5.png)

## 通过进度字段进行进度可视化

现在，即使不进行分组，也可以通过专用的进度字段实现可视化[^1]。

[^1]: 可能在私密预览阶段已经支持这一功能，但笔者当时没有注意到。

用法详见官方文档。

[关于父问题与子问题的进度字段 - GitHub Docs](https://docs.github.com/ja/issues/planning-and-tracking-with-projects/understanding-fields/about-parent-issue-and-sub-issue-progress-fields)

接下来，使用上一篇文章中用到的存储库和项目来进行设置。由于前一篇文章中的 Issue 已经关闭，因此新增了一些 Issue 和子问题。

![Issue and sub-issues](https://i.gyazo.com/c9df8229161077e419feb93e3d411357.png)

在父 Issue 的设置中，选择要添加的项目。

![Select project](https://i.gyazo.com/b20677075835686639245b6b32f53de5.png)

:::info
如前文所述，因项目的工作流会自动添加子问题，因此无需单独进行操作。
:::

项目中已经添加了 Issue 和子问题。

![Issues added](https://i.gyazo.com/3d79da2aa285ad746a7688dead3761d7.png)

接下来，我们来显示进度字段。

在 `+` 按钮弹出的菜单中，从 `Hidden fields` 中选择 `Sub-issues progress`。

![Set Sub-issues progress](https://i.gyazo.com/7b41cbf381a1bd7d6d58702c2286f55c.png)

一个展示父 Issue 进度条的列被添加了。

![Show Sub-issues progress](https://i.gyazo.com/a07ba5d868dfccc76a470ffcbe8bf4f6.png)

看起来不错。接下来通过过滤器隐藏子问题，仅保留父 Issue。只需在过滤器中指定`no:parent-issue` 即可。

![set filter](https://i.gyazo.com/fc0ec0b835e5e7be1a3f19f4b3df9bab.png)

现在只剩父 Issue 和进度条，界面更加简洁。

![parent issue only view](https://i.gyazo.com/6aa5396a24c132e10f8c042a40e3c297.png)

此时点击 `Save` 即可随时查看这一视图。

## 结语

GitHub Issues 正在不断进步。  
以前通过 Issue 内的任务列表也可以实现进度可视化，而借助子问题和进度字段，现在可以在 Issue 的粒度下追踪进展，实用性更强。建议将其应用到项目管理中试试看吧！
