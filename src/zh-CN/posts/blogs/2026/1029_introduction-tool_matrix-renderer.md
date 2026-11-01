---
title: 使用绘图工具制作的矩阵图难以维护，因此我制作了一个可从 YAML 自动生成的 CLI 工具
author: masato-ubata
date: 2026-10-29T00:00:00.000Z
tags:
  - tools
  - oss
  - canvas
  - docs-as-code
  - YAML
  - javascript
image: true
translate: true

---

## 前言

二维矩阵图常用于表达开发计划等的整体概览。大多数情况下，它们会使用办公软件或绘图工具创建。  
如果内容仅在资料中使用，或不需要持续维护，那么这样已经足够；但如果需要持续修改和发布，则不断更新图像文件会非常麻烦。  

因此，我发布了一个 Node.js CLI 工具（matrix-renderer），可基于 YAML 中定义的矩阵数据生成图像文件。

本文将介绍开发该工具的背景及其具体使用方法。

**输出示例**
![输出示例](/img/blogs/2026/1029_introduction-tool_matrix-renderer/landscape.svg)

* [GitHub 仓库](https://github.com/ubata-mamezou/matrix-renderer)
* [npm 包](https://www.npmjs.com/package/matrix-renderer)

## 开发契机

在某项任务中，为了明确展示指南和工具的提供情况，创建了一个以 X 轴表示阶段、以 Y 轴表示技术关注领域（应用、基础设施、流程等）的矩阵。  
当时提出了这样的需求：将其发布到内部网站，根据指南和工具的创建情况进行更新，并且可以从各个项目跳转到对应的网站。  
由于该矩阵是用办公软件制作的，因此每次修改时都需要将其导出为图像，再重新上传到发布位置。  
在不需要持续更新的情况下这已经足够，但我认为在需要持续修改和发布的场景中会成为负担，因此在项目之外悄悄开发了这个工具。  

原本也考虑过在项目中推广，但遗憾的是无法使用 SVG，无法满足链接需求，因此放弃了推广。  
不过，我认为应该也存在类似问题的场景，所以决定将其作为一个可轻松使用的 OSS 公开发布。  

## 与类似工具的区别

与办公软件和绘图工具相比，擅长与不擅长的方面如下。

### 擅长的方面

* 易于持续更新
  * 更新对象是 YAML，因此便于修改，也易于进行差异管理。
* 可以联动更新进行发布
  * 由于是 CLI 工具，因此可将其整合到构建脚本或 CI/CD 管道中，以 YAML 文件的更新为触发条件生成图像。
  * 如果也将部署整合到 CI/CD 管道中，就可以自动完成从 YAML 文件更新到图像发布的流程。
* 布局以自动排版为主
  * X 轴和 Y 轴会以等间距自动设置。
  * 将项目放置在指定的 X 轴起始列、结束列以及 Y 轴行中。
  * 如果同一 Y 轴内存在空闲区域，则会自动放置项目。
  * 如果同一行中的项目期间重叠，则会在垂直方向排列，以避免显示重叠。
* 从项目添加链接
  * 虽然仅限 SVG，但支持在项目中嵌入 URL。

### 不擅长的方面

* 布局自由度较低
  * 无法以等间距方式自定义特定 X 轴、Y 轴的宽度。
  * 因为同一 Y 轴内会自动排列，所以无法指定项目之间的前后关系。
* 不支持使用多样图形进行绘图等功能。

## 使用场景

非常适合以下这类“通过两个轴对事物进行分类和映射，并希望持续作为文档发布”的场景。

* 按阶段 × 技术分类管理工具和指南
* 按组织技术领域 × 熟练度/采用阶段（Adopt、Trial、Assess、Hold 等）管理技术栈的熟练度
* 按应对阶段（平时、检测、初步响应、原因调查、恢复、复盘）× 负责领域，映射故障处理流程和工具
* 按部门 × 分类列出系统和功能

## 使用方法

### 运行环境

Node.js 24+

### 准备 YAML

以下是一个按开发阶段放置指南和工具的输入文件示例。  
有关模板的详细信息，请参阅[此处](https://github.com/ubata-mamezou/matrix-renderer#%EF%B8%8F-yaml-template--yaml設定テンプレート)。

```yaml
title: 内部标准 DevOps 工具链与开发指南地图
width: 1000
xAxis:
  label: 开发阶段
  values:
    - label: 需求定义与规划
      color: "#e8f8f5"
    - label: 设计与构建
      color: "#eaf2f8"
    - label: 测试与验证
      color: "#ebf5fb"
    - label: 部署
      color: "#f4ecf7"
    - label: 运维与监控
      color: "#fcf3cf"
yAxis:
  label: 技术栈
  values:
    - label: 应用开发
      color: "#fdfefe"
    - label: 基础设施与 CI/CD
      color: "#fdfefe"
    - label: 安全与质量
      color: "#fdfefe"
items:
  - id: git-guide
    label: GitHub・Git 使用规范指南
    lane: 应用开发
    from: 需求定义与规划
    to: 设计与构建
    url: https://your-wiki.internal
    color: "#2471a3"
  - id: sonar-qube
    label: SonarQube（静态分析代码审查）
    lane: 安全与质量
    from: 设计与构建
    to: 测试与验证
    url: https://internal.net
    color: "#e67e22"
  - id: play-wright
    label: Playwright（E2E 自动化测试执行环境）
    lane: 安全与质量
    from: 测试与验证
    to: 测试与验证
    url: https://your-wiki.internal
    color: "#cb4335"
  - id: argo-cd
    label: ArgoCD（生产环境部署流程）
    lane: 基础设施与 CI/CD
    from: 部署
    to: 部署
    url: https://internal.net
    color: "#1e8449"
  - id: datadog-ops
    label: Datadog 监控仪表板
    lane: 基础设施与 CI/CD
    from: 运维与监控
    to: 运维与监控
    url: https://internal.net
    color: "#6c3483"
```

| 项目 | 内容 |
|---|---|
| 标题 | 矩阵的标题 |
| 宽度 | 输出图像的宽度 |
| X 轴 | 标签、显示顺序及颜色 |
| Y 轴 | 标签、显示顺序及颜色 |
| 项目 | ID、显示名称、放置的行、起始列、结束列、颜色、URL |

* 使用 `lane` 指定项目放置的行，使用 `from` 和 `to` 指定起始列和结束列。  
* 如果同一行中的项目期间重叠，则会在垂直方向排列，以避免显示重叠。
* 写在 `xAxis.values` 和 `yAxis.values` 中的顺序，即为图像中的显示顺序。  
* 图像宽度（`width`）、颜色（`color`）和 URL（`url`）可省略。

### 生成图像文件

从 YAML 文件生成图像文件的命令示例如下。  
有关命令的详细信息，请参阅[此处](https://github.com/ubata-mamezou/matrix-renderer#-command--コマンド)。

```sh
# 1. 仅指定输入文件
npx matrix-renderer render -- docs/matrices/matrix.yaml

# 2. 指定输出文件名
npx matrix-renderer render -- docs/matrices/matrix.yaml --out public/images/development-guide

# 3. 指定输出文件类型
npx matrix-renderer render -- docs/matrices/matrix.yaml --out public/images/development-guide --out-type svg
```
* 1：在与输入文件相同的文件夹中生成图像。
  * `docs/matrices/matrix.png`
  * `docs/matrices/matrix.svg`
* 2：使用指定的目录/文件名生成图像。
  * `public/images/development-guide.png`
  * `public/images/development-guide.svg`
* 3：仅生成指定的文件类型。
  * `public/images/development-guide.svg`

### 集成到 CI/CD

只要在 GitHub Actions 等 CI/CD 工作流中添加生成命令，就能根据 YAML 的修改重新生成图像。  
以下是 GitHub Actions 的工作流示例。

```yaml
name: Build documentation

on:
  push:
    branches: [main]
    paths:
      - "docs/matrices/**"
      - ".github/workflows/docs.yml"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - name: Render matrix images
        run: npx --yes matrix-renderer@0.1.2 render -- docs/matrices/development-guide.yaml --out public/images/development-guide
      # 此后执行部署
```

## 总结

使用 matrix-renderer，可以从 YAML 中定义的矩阵数据生成 PNG 和 SVG。  
与使用办公软件等绘图相比，虽然在外观调整方面的自由度会降低，但可以将数据修改作为差异进行确认，也更容易实现通过 CI/CD 重新生成。  

该工具本身并不负责向公开网站部署，但通过将其整合到 CI/CD 中，可以自动化完成从 YAML 更新到部署的流程。

如果相比自由布局，更希望持续更新矩阵，那么它可以作为 Docs as Code 的一种选择加以利用。

有关更详细的命令、YAML 模板和示例等内容已发布在 [GitHub](https://github.com/ubata-mamezou/matrix-renderer) 上，欢迎一并查看。
