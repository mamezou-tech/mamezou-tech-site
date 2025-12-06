---
title: >-
  【Agent Skills】把「那种氛围」带到 VSCode。想让 Markdown 预览采用 Anthropic 主题！-
  brand-guidelines 完全指南 -
author: kosuke-uematsu
date: 2025-12-03T00:00:00.000Z
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2025/
tags:
  - Claude
  - markdown
  - vscode
  - advent2025
translate: true

---

这是[is开发者站点 Advent Calendar 2025](/events/advent-calendar/2025/)的第 3 天文章！

## 引言

你看过Anthropic的官方网站吗？  
@[og](https://www.anthropic.com/)

其配色氛围非常优美，我非常喜欢。

而且，最近我经常与 Claude Code 进行结对编程，预览 Markdown 文件的场景也越来越多，无论是需求定义、ADR，还是技术文章的撰写等等。

既然要高频率地处理 Markdown 文件，就希望能用我喜欢的风格来预览。如果能够构建像 Anthropic 官方页面那样可读且优美的预览环境，写作过程一定会更舒适！

但是，要从头开始自行设计样式非常费力……要考虑调色板、排版、组件样式等众多要素，还要耗费大量时间。

就在此时，Anthropic 发布了一个名为 **[Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)** 的功能。

Agent Skills 是一种扩展 Claude 功能的机制，是为 Claude 提供执行特定任务的“技能”所需的工具集。

此外，Anthropic 提供的官方技能 `brand-guidelines` 可以基于 Anthropic 主题进行各种样式设计。有了它，就无需从零开始自己构思，可以轻松利用官方的精美设计。

本文将介绍如何利用 Claude 的 Agent Skills，将 Anthropic 的品牌指南应用于 Markdown Preview Enhanced 扩展。

## 本文目标

阅读本文后，你将能够：

- **了解 Claude 的 Agent Skills**  
  - 清楚 Agent Skills 是什么，以及如何启用和使用
- **掌握 brand-guidelines 技能的使用方法**  
  - 该技能基于 Anthropic 品牌指南，进行各种样式设计
- **了解与 Markdown Preview Enhanced 的集成方式**  
  - 理解如何将 VSCode 扩展与 Anthropic 品牌指南结合的步骤

<br>

### 应用样式前

应用样式前的预览效果如下。

![スタイル適用前](https://i.gyazo.com/75c86ade7e047dcee63fa69749f4d0b2.png)  
*应用样式前的预览效果示例*

<br>

### 应用样式后

应用样式后的预览效果如下。

![スタイル適用後](https://i.gyazo.com/d21e177791df09ab3c4efa17c80ac335.png)  
*应用样式后的预览效果示例*

## 前提条件

本文假设以下环境。

### 使用环境

- **操作系统**：MacOS, Windows 11
- **VSCode**：最新版（撰写时点: 1.106.2）
- **Claude 账户**：可以访问 claude.ai

### 需要的基础知识

- VSCode 的基本操作（如文件打开、设置修改等）
- claude.ai 的基本使用方法（有使用聊天功能的经验）
- Markdown 基础知识（标题、列表、代码块等）

## 详细实施步骤

### 0. 本实施步骤中使用的主要概念

#### 什么是 Agent Skills

[Agent Skills](https://platform.claude.com/docs/ja/agents-and-tools/agent-skills/overview) 是扩展 Claude 功能的机制，是为 Claude 提供执行特定任务的“技能”所需的工具集。在本步骤中，需要启用 Agent Skills 以使用 brand-guidelines 技能。Agent Skills 属于实验性功能，仅 Pro 计划及以上用户可使用。

##### 可用的官方技能

Anthropic 提供的官方技能包括以下几种：最新的技能列表可在 [Anthropic 官方技能仓库](https://github.com/anthropics/skills) 查看。

###### ✅ 文档类技能

| 技能名      | 说明                                     |
|-------------|------------------------------------------|
| **docx**    | 创建与编辑 Word 文档（支持修订记录、格式设置） |
| **pdf**     | 操作 PDF（提取、创建、合并、表单处理）     |
| **pptx**    | 创建 PowerPoint 演示文稿（布局、模板、图表支持） |
| **xlsx**    | 创建 Excel 电子表格（公式、格式设置、数据分析） |

<br>

###### ✅ 创意与设计类技能

| 技能名             | 说明                                            |
|--------------------|-------------------------------------------------|
| **brand-guidelines** | 将 Anthropic 官方品牌色彩和排版应用到产物（本文中使用） |
| **theme-factory**    | 使用 10 种预设主题或自定义主题为产物进行样式化     |
| **canvas-design**    | 基于设计哲学创建 .png / .pdf 格式的视觉艺术        |
| **algorithmic-art**  | 使用 p5.js 创建生成艺术（带种子随机、流场、粒子系统） |
| **slack-gif-creator**| 创建针对 Slack 大小限制优化的动画 GIF             |

<br>

###### ✅ 开发与技术类技能

| 技能名               | 说明                                       |
|----------------------|--------------------------------------------|
| **artifacts-builder**| 使用 React、Tailwind CSS、shadcn/ui 构建复杂的 HTML 产物 |
| **mcp-builder**      | 集成外部 API 和服务的高质量 MCP 服务器创建指南     |
| **webapp-testing**   | 使用 Playwright 对本地 Web 应用进行测试        |

<br>

###### ✅ 企业与沟通类技能

| 技能名               | 说明                             |
|----------------------|----------------------------------|
| **internal-comms**   | 创建状态报告、新闻通讯、FAQ 等内部沟通文档 |

<br>

###### ✅ 元技能（用于创建技能）

| 技能名               | 说明                                   |
|----------------------|----------------------------------------|
| **skill-creator**    | Claude 功能扩展的高效技能创建指南      |
| **template-skill**   | 作为新技能创建起点的基础模板           |

<br>

##### 调用技能的方法

要调用 Agent Skills，可在聊天中以自然语言指定技能名进行请求：

```text
# 基本调用方式
请使用 brand-guidelines 技能来创建 ○○

# 明确指定技能名
使用 skill: brand-guidelines 生成 CSS 文件
```

当 Claude 识别到技能后，会自动执行所需处理。

#### 什么是 brand-guidelines 技能

brand-guidelines 技能是用于生成 Anthropic 官方主题文件的 Agent Skills。使用此技能可以生成包含 Anthropic 官方 UI 所用调色板和排版信息的 CSS 文件。

##### 生成的 CSS 文件内容

生成的 CSS 文件将包含以下要素：

- **调色板**：主色、背景色、文本色等
- **排版**：字体系列、字号、行距等
- **组件样式**：按钮、链接、代码块等
- **支持暗模式**：同时支持 Light 主题和 Dark 主题

#### 什么是 Markdown Preview Enhanced

Markdown Preview Enhanced 是 VSCode 的扩展。  
虽然 VSCode 自带 Markdown 预览功能，但使用此扩展的原因如下：

- **易于应用自定义 CSS**：可轻松加载自定义 CSS 文件
- **功能丰富**：支持公式、图表、目录等众多标准预览所不具备的功能
- **高定制性**：可进行细粒度的设置修改

与自定义样式应用相关的功能包括：

- **编辑 style.less**：扩展专用样式文件，可从中加载外部 CSS
- **实时预览**：样式更改会立即生效
- **多种预览模式**：还支持导出为各种格式

在此步骤中，将通过在 Markdown Preview Enhanced 的 style.less 文件中加载 brand-guidelines 技能生成的 CSS 文件，来应用 Anthropic 官方主题。

### 1. 启用 Agent Skills

@[og](https://support.claude.com/ja/articles/12512180-claude%E3%81%A7%E3%82%B9%E3%82%AD%E3%83%AB%E3%82%92%E4%BD%BF%E7%94%A8%E3%81%99%E3%82%8B)

1. 访问 claude.ai

    [Claude 的新建聊天界面](https://claude.ai/new)

    <br>

2. 打开设置界面

    ![](https://i.gyazo.com/8ff973db6b0433ba397af60764de5d88.png)

    <br>

3. 在 `功能` > `代码执行与文件创建` 中启用

    ![](https://i.gyazo.com/07ffaa0beae7cc571e8f16a3a35049c0.png)

    <br>

4. 在同一界面启用要使用的技能（brand-guidelines）

    ![](https://i.gyazo.com/daa1c92d68c23dd75779f9969859f58e.png)

    <br>

5. 确认已启用  
    在 claude.ai 的聊天界面中，询问可用的技能。  
    ![](https://i.gyazo.com/0f0dc2ab3feb4e139024ab3d278f6a58.png)

### 2. 安装 Markdown Preview Enhanced 扩展

在 VSCode 扩展市场中安装 Markdown Preview Enhanced。

@[og](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced)

![](https://i.gyazo.com/fe1f2cde54342aca49bc94182e02a9e3.png)

### 3. 使用 brand-guidelines 技能创建样式

在 claude.ai 的聊天界面中，使用 brand-guidelines 技能请求生成 CSS 文件。

以下是一个示例提示，供参考：

```text
希望在 VSCode 中预览 markdown 文件时应用 Anthropic 官方主题的样式。
预览假设使用 Markdown Preview Enhanced 扩展。
请生成自定义 CSS 文件。
```

<br>

输出结果如下。

![](https://i.gyazo.com/65810dbbae51791453bd3208443e55b0.png)

### 4. 检查生成的样式

此次生成的 CSS 文件如下。

```css:anthropic-markdown-preview.css
/*
 * Anthropic Brand Theme for Markdown Preview Enhanced
 * VS Code Extension Custom CSS
 * 
 * Installation:
 * 1. Open VS Code Settings (Cmd/Ctrl + ,)
 * 2. Search for "Markdown Preview Enhanced: Style"
 * 3. Add the path to this file, or
 * 4. Copy this content to ~/.mume/style.less (or style.css)
 */

/* ============================================
   Import Google Fonts
   ============================================ */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');

/* ============================================
   CSS Variables - Anthropic Brand Colors
   ============================================ */
:root {
  /* Main Colors */
  --anthropic-dark: #141413;
  --anthropic-light: #faf9f5;
  --anthropic-mid-gray: #b0aea5;
  --anthropic-light-gray: #e8e6dc;
  
  /* Accent Colors */
  --anthropic-orange: #d97757;
  --anthropic-blue: #6a9bcc;
  --anthropic-green: #788c5d;
  
  /* Typography */
  --font-heading: 'Poppins', Arial, sans-serif;
  --font-body: 'Lora', Georgia, serif;
  --font-code: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
}

/* ============================================
   Base Styles
   ============================================ */
.markdown-preview.markdown-preview {
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.7;
  color: var(--anthropic-dark);
  background-color: var(--anthropic-light);
  padding: 2rem 3rem;
  max-width: 900px;
  margin: 0 auto;
}

/* ============================================
   Headings - Poppins Font
   ============================================ */
.markdown-preview h1,
.markdown-preview h2,
.markdown-preview h3,
.markdown-preview h4,
.markdown-preview h5,
.markdown-preview h6 {
  font-family: var(--font-heading);
  font-weight: 600;
  color: var(--anthropic-dark);
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  line-height: 1.3;
}

.markdown-preview h1 {
  font-size: 2.25rem;
  font-weight: 700;
  border-bottom: 3px solid var(--anthropic-orange);
  padding-bottom: 0.4em;
  margin-top: 0;
}

.markdown-preview h2 {
  font-size: 1.75rem;
  border-bottom: 2px solid var(--anthropic-light-gray);
  padding-bottom: 0.3em;
}

.markdown-preview h3 {
  font-size: 1.4rem;
  color: var(--anthropic-dark);
}

.markdown-preview h4 {
  font-size: 1.2rem;
  color: var(--anthropic-mid-gray);
}

.markdown-preview h5,
.markdown-preview h6 {
  font-size: 1rem;
  color: var(--anthropic-mid-gray);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ============================================
   Paragraphs and Body Text
   ============================================ */
.markdown-preview p {
  margin: 1em 0;
  text-align: justify;
  hyphens: auto;
}

/* ============================================
   Links
   ============================================ */
.markdown-preview a {
  color: var(--anthropic-orange);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.markdown-preview a:hover {
  color: var(--anthropic-blue);
  border-bottom-color: var(--anthropic-blue);
}

.markdown-preview a:visited {
  color: var(--anthropic-green);
}

/* ============================================
   Lists
   ============================================ */
.markdown-preview ul,
.markdown-preview ol {
  margin: 1em 0;
  padding-left: 1.5em;
}

.markdown-preview li {
  margin: 0.4em 0;
  line-height: 1.6;
}

.markdown-preview ul li::marker {
  color: var(--anthropic-orange);
}

.markdown-preview ol li::marker {
  color: var(--anthropic-blue);
  font-weight: 600;
}

/* Nested lists */
.markdown-preview ul ul,
.markdown-preview ol ol,
.markdown-preview ul ol,
.markdown-preview ol ul {
  margin: 0.3em 0;
}

/* Task lists */
.markdown-preview input[type="checkbox"] {
  accent-color: var(--anthropic-orange);
  margin-right: 0.5em;
}

/* ============================================
   Blockquotes
   ============================================ */
.markdown-preview blockquote {
  margin: 1.5em 0;
  padding: 1em 1.5em;
  border-left: 4px solid var(--anthropic-orange);
  background-color: var(--anthropic-light-gray);
  color: var(--anthropic-dark);
  font-style: italic;
  border-radius: 0 8px 8px 0;
}

.markdown-preview blockquote p {
  margin: 0.5em 0;
}

.markdown-preview blockquote p:first-child {
  margin-top: 0;
}

.markdown-preview blockquote p:last-child {
  margin-bottom: 0;
}

/* Nested blockquotes */
.markdown-preview blockquote blockquote {
  border-left-color: var(--anthropic-blue);
  margin: 1em 0;
}

/* ============================================
   Code - Inline and Blocks
   ============================================ */
.markdown-preview code {
  font-family: var(--font-code);
  font-size: 0.9em;
}

/* Inline code */
.markdown-preview :not(pre) > code {
  background-color: var(--anthropic-light-gray);
  color: var(--anthropic-dark);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  border: 1px solid var(--anthropic-mid-gray);
}

/* Code blocks */
.markdown-preview pre {
  background-color: var(--anthropic-dark);
  color: var(--anthropic-light);
  padding: 1.25em 1.5em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5em 0;
  border: 1px solid var(--anthropic-mid-gray);
}

.markdown-preview pre code {
  background: none;
  border: none;
  padding: 0;
  color: inherit;
  font-size: 0.875em;
  line-height: 1.6;
}

/* ============================================
   Syntax Highlighting (Custom Theme)
   ============================================ */
.markdown-preview pre .hljs-keyword,
.markdown-preview pre .hljs-selector-tag,
.markdown-preview pre .hljs-built_in {
  color: var(--anthropic-orange);
}

.markdown-preview pre .hljs-string,
.markdown-preview pre .hljs-attr {
  color: var(--anthropic-green);
}

.markdown-preview pre .hljs-number,
.markdown-preview pre .hljs-literal {
  color: var(--anthropic-blue);
}

.markdown-preview pre .hljs-comment {
  color: var(--anthropic-mid-gray);
  font-style: italic;
}

.markdown-preview pre .hljs-function,
.markdown-preview pre .hljs-title {
  color: var(--anthropic-blue);
}

.markdown-preview pre .hljs-variable,
.markdown-preview pre .hljs-params {
  color: var(--anthropic-light);
}

.markdown-preview pre .hljs-type,
.markdown-preview pre .hljs-class {
  color: var(--anthropic-orange);
}

/* ============================================
   Tables
   ============================================ */
.markdown-preview table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
  font-size: 0.95em;
}

.markdown-preview table th,
.markdown-preview table td {
  padding: 0.75em 1em;
  text-align: left;
  border: 1px solid var(--anthropic-light-gray);
}

.markdown-preview table th {
  font-family: var(--font-heading);
  font-weight: 600;
  background-color: var(--anthropic-dark);
  color: var(--anthropic-light);
  border-color: var(--anthropic-dark);
}

.markdown-preview table tr:nth-child(even) {
  background-color: var(--anthropic-light-gray);
}

.markdown-preview table tr:hover {
  background-color: rgba(217, 119, 87, 0.1);
}

/* ============================================
   Horizontal Rules
   ============================================ */
.markdown-preview hr {
  border: none;
  height: 2px;
  background: linear-gradient(
    90deg,
    var(--anthropic-orange),
    var(--anthropic-blue),
    var(--anthropic-green)
  );
  margin: 2em 0;
  border-radius: 1px;
}

/* ============================================
   Images
   ============================================ */
.markdown-preview img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1em 0;
  box-shadow: 0 4px 12px rgba(20, 20, 19, 0.1);
}

/* ============================================
   Footnotes
   ============================================ */
.markdown-preview .footnotes {
  margin-top: 3em;
  padding-top: 1.5em;
  border-top: 2px solid var(--anthropic-light-gray);
  font-size: 0.9em;
  color: var(--anthropic-mid-gray);
}

.markdown-preview .footnote-ref {
  color: var(--anthropic-orange);
  font-weight: 600;
}

/* ============================================
   Definition Lists
   ============================================ */
.markdown-preview dl {
  margin: 1em 0;
}

.markdown-preview dt {
  font-family: var(--font-heading);
  font-weight: 600;
  color: var(--anthropic-dark);
  margin-top: 1em;
}

.markdown-preview dd {
  margin-left: 1.5em;
  color: var(--anthropic-mid-gray);
}

/* ============================================
   Keyboard Keys
   ============================================ */
.markdown-preview kbd {
  font-family: var(--font-code);
  font-size: 0.85em;
  padding: 0.2em 0.5em;
  background-color: var(--anthropic-light-gray);
  border: 1px solid var(--anthropic-mid-gray);
  border-radius: 4px;
  box-shadow: 0 2px 0 var(--anthropic-mid-gray);
}

/* ============================================
   Mark / Highlight
   ============================================ */
.markdown-preview mark {
  background-color: rgba(217, 119, 87, 0.3);
  color: var(--anthropic-dark);
  padding: 0.1em 0.3em;
  border-radius: 2px;
}

/* ============================================
   Abbreviations
   ============================================ */
.markdown-preview abbr {
  text-decoration: underline dotted var(--anthropic-blue);
  cursor: help;
}

/* ============================================
   Selection
   ============================================ */
.markdown-preview ::selection {
  background-color: rgba(106, 155, 204, 0.3);
  color: var(--anthropic-dark);
}

/* ============================================
   Scrollbar Styling
   ============================================ */
.markdown-preview ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.markdown-preview ::-webkit-scrollbar-track {
  background: var(--anthropic-light-gray);
  border-radius: 4px;
}

.markdown-preview ::-webkit-scrollbar-thumb {
  background: var(--anthropic-mid-gray);
  border-radius: 4px;
}

.markdown-preview ::-webkit-scrollbar-thumb:hover {
  background: var(--anthropic-orange);
}

/* ============================================
   Print Styles
   ============================================ */
@media print {
  .markdown-preview.markdown-preview {
    background-color: white;
    color: black;
    padding: 0;
  }
  
  .markdown-preview a {
    color: var(--anthropic-dark);
    text-decoration: underline;
  }
  
  .markdown-preview pre {
    border: 1px solid var(--anthropic-mid-gray);
    background-color: var(--anthropic-light-gray);
    color: var(--anthropic-dark);
  }
}

/* ============================================
   Mermaid Diagrams
   ============================================ */
.markdown-preview .mermaid {
  background-color: var(--anthropic-light);
  padding: 1em;
  border-radius: 8px;
  text-align: center;
}

/* ============================================
   Math (KaTeX/MathJax)
   ============================================ */
.markdown-preview .katex,
.markdown-preview .MathJax {
  font-size: 1.1em;
}

.markdown-preview .katex-display,
.markdown-preview .MathJax_Display {
  margin: 1.5em 0;
  padding: 1em;
  background-color: var(--anthropic-light-gray);
  border-radius: 8px;
  overflow-x: auto;
}

/* ============================================
   Admonitions / Callouts
   ============================================ */
.markdown-preview .admonition,
.markdown-preview .callout {
  margin: 1.5em 0;
  padding: 1em 1.5em;
  border-radius: 8px;
  border-left: 4px solid;
}

.markdown-preview .admonition.note,
.markdown-preview .callout.note {
  background-color: rgba(106, 155, 204, 0.1);
  border-left-color: var(--anthropic-blue);
}

.markdown-preview .admonition.warning,
.markdown-preview .callout.warning {
  background-color: rgba(217, 119, 87, 0.1);
  border-left-color: var(--anthropic-orange);
}

.markdown-preview .admonition.tip,
.markdown-preview .callout.tip {
  background-color: rgba(120, 140, 93, 0.1);
  border-left-color: var(--anthropic-green);
}

/* ============================================
   TOC (Table of Contents)
   ============================================ */
.markdown-preview .md-toc {
  background-color: var(--anthropic-light-gray);
  padding: 1.5em;
  border-radius: 8px;
  margin: 1.5em 0;
}

.markdown-preview .md-toc-content {
  font-family: var(--font-heading);
}

.markdown-preview .md-toc a {
  color: var(--anthropic-dark);
}

.markdown-preview .md-toc a:hover {
  color: var(--anthropic-orange);
}
```

### 5. 应用到 Markdown Preview Enhanced

1. 在命令面板中执行 `Markdown Preview Enhanced: Customize CSS (Global)`  
2. 在打开的 `style.less` 文件中追加生成的 CSS 内容并保存

### 6. 功能检查与微调

检查预览中应用的样式，如有问题可进行微调。样式微调可直接编辑 style.less 文件，也可以在 claude.ai 的聊天界面中请求修改 style.less 文件内容。  
_我稍微修改了字体。_

::: info
Markdown Preview Enhanced 提供了在扩展设置界面指定预览主题的功能（`Markdown Preview Enhanced: Preview Theme` / `Markdown-preview-enhanced: Code Block Theme` 设置）。当此设置与 `style.less` 内容冲突时，可能无法应用预期样式。如果样式未按预期显示，请尝试修改这些设置。
:::

## 总结

本文介绍了如何利用 Claude 的 Agent Skills 将 Anthropic 样式应用于 Markdown 预览。

### 实现的功能

通过此次设置，实现了以下功能：

1. **理解 Agent Skills**：学习了如何启用并驾驭 Claude 的 Agent Skills  
2. **利用 brand-guidelines 技能**：能够轻松生成官方样式的 CSS 文件  
3. **统一的写作环境**：构建了应用 Anthropic 官方样式的预览环境  

### 更进一步的发展：创建自定义技能

本文使用了官方的 brand-guidelines 技能，但如果使用另一个官方技能 **skill-creator**，也可以创建专属于自己的原创技能。

例如，可以创建如下自定义技能：

- 基于自家品牌指南生成 CSS 的技能  
- 针对特定框架生成组件的技能  
- 生成项目专属文档模板的技能  

使用 skill-creator 技能的方法，只需在 claude.ai 聊天中这样请求即可：

```text
请使用 skill-creator 技能，创建一个能够执行 ○○ 的自定义技能
```

<br>

详情请参考 [Anthropic 官方技能仓库](https://github.com/anthropics/skills)。可借鉴官方的 skill-creator 和 template-skill 来创建高效技能。

另外，若要使用 skill-creator，请别忘了像启用 brand-guidelines 那样启用 skill-creator 技能！

---

感谢阅读到最后。希望本文能帮助你打造更舒适的写作环境。🎨✨
