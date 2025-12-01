---
title: 【Agent Skills】「あの雰囲気」を VSCode に。Markdown プレビューを Anthropic テーマにしたいんだ！ - brand-guidelines 完全ガイド -
author: kosuke-uematsu
date: 2025-12-03
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2025/
tags: [Claude, markdown, advent2025]
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2025](/events/advent-calendar/2025/)第 3 日目の記事です！

## はじめに

Anthropicの公式ページをみたことがありますか？

@[og](https://www.anthropic.com/)

配色の雰囲気が美しくて大変好きです。

さらに、最近 Claude Code とペアプログラミングをすることが多くなり、マークダウンファイルをプレビュー表示することが非常に多くなりました。要件定義やADR、技術記事の執筆などなど。

せっかく高頻度でマークダウンファイルを扱うなら、ぼくの好きなスタイルでプレビューさせたいものです。Anthropic の公式ページのような、読みやすく美しいプレビュー環境を構築できれば、執筆作業もより快適になるはず！

しかし、一から自分でスタイリングを考えるのは非常に大変。。。
カラーパレット、タイポグラフィ、コンポーネントスタイルなど、考えるべき要素が多く、時間もかかります。

そんな折、Anthropic から **[Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)** という機能がリリースされました。

Agent Skills は、Claude の機能を拡張するための仕組みで、Claude に特定の作業を行う「スキル（技能）」を与えるためのツールセットです。

さらに、Anthropic が提供している公式の skills `brand-guidelines` なら、Anthropic のテーマを基盤に色々なスタイリングをしてくれるとのこと。これなら、自分で一から考える必要がなく、公式の洗練されたデザインを簡単に活用できるのではないかと考えました。

この記事では、Claude の Agent Skills を活用して、Markdown Preview Enhanced 拡張機能に Anthropic のブランドガイドラインを適用する方法を解説します。

## この記事のゴール

この記事を読むことで、以下のことができるようになります。

- **Claude の Agent Skills について理解できる**
  - Agent Skills とは何か、どのように有効化して使うのかがわかります
- **brand-guidelines スキルの使い方がわかる**
  - Anthropic のブランドガイドラインを基盤に、色々なスタイリングをしてくれるスキルです
- **Markdown Preview Enhanced との連携方法がわかる**
  - VSCode の拡張機能と Anthropic のブランドガイドラインを組み合わせる手順を理解できます

スタイル適用前後のプレビュー表示は以下のとおりです。

### スタイル適用前

![スタイル適用前](https://i.gyazo.com/75c86ade7e047dcee63fa69749f4d0b2.png)

### スタイル適用後

![スタイル適用後](https://i.gyazo.com/d21e177791df09ab3c4efa17c80ac335.png)

## 前提条件

この記事では、以下の環境を前提としています。

### 使用環境

- **OS**: MacOS, Windows 11
- **VSCode**: 最新版（執筆時点: 1.106.2 ）
- **Claude アカウント**: claude.ai にアクセス可能

### 必要な基礎知識

- VSCode の基本的な操作方法（ファイルの開き方、設定の変更方法など）
- claude.ai の基本的な使い方（チャット機能の利用経験）
- Markdown の基礎知識（見出し、リスト、コードブロックなど）

## 実施手順詳細

### 0. 実施手順で使用する主要な概念

#### Agent Skills とは

[Agent Skills](https://platform.claude.com/docs/ja/agents-and-tools/agent-skills/overview) は、Claude の機能を拡張するための仕組みで、Claude に特定の作業を行う「スキル（技能）」を与えるためのツールセットです。この手順では、brand-guidelines スキルを使用するために Agent Skills を有効化する必要があります。Agent Skills は実験的な機能で、Pro プラン以上のユーザーが利用できます。

##### 利用可能な公式スキル

Anthropic が提供している公式スキルには、以下のようなものがあります：
最新のスキル一覧は [Anthropic の公式スキルリポジトリ](https://github.com/anthropics/skills) で確認できます。

###### ✅ドキュメント系スキル

| スキル名 | 説明 |
|---------|------|
| **docx** | Word 文書の作成・編集（変更履歴、書式設定対応） |
| **pdf** | PDF の操作（抽出、作成、結合、フォーム処理） |
| **pptx** | PowerPoint プレゼンテーションの作成（レイアウト、テンプレート、チャート対応） |
| **xlsx** | Excel スプレッドシートの作成（数式、書式設定、データ分析） |

<br>

###### ✅クリエイティブ・デザイン系スキル

| スキル名 | 説明 |
|---------|------|
| **brand-guidelines** | Anthropic の公式ブランドカラーと Typography をアーティファクトに適用（この記事で使用） |
| **theme-factory** | 10種類のプリセットテーマまたはカスタムテーマでアーティファクトをスタイリング |
| **canvas-design** | デザイン哲学を使用した .png / .pdf 形式のビジュアルアート作成 |
| **algorithmic-art** | p5.js を使用したジェネラティブアート作成（シード付きランダム、フローフィールド、パーティクルシステム） |
| **slack-gif-creator** | Slack のサイズ制限に最適化されたアニメーション GIF 作成 |

<br>

###### ✅開発・技術系スキル

| スキル名 | 説明 |
|---------|------|
| **artifacts-builder** | React、Tailwind CSS、shadcn/ui を使用した複雑な HTML アーティファクト構築 |
| **mcp-builder** | 外部 API やサービスを統合する高品質な MCP サーバー作成ガイド |
| **webapp-testing** | Playwright を使用したローカル Web アプリケーションのテスト |

<br>

###### ✅エンタープライズ・コミュニケーション系スキル

| スキル名 | 説明 |
|---------|------|
| **internal-comms** | ステータスレポート、ニュースレター、FAQ などの社内コミュニケーション文書作成 |

<br>

###### ✅メタスキル（スキル作成用）

| スキル名 | 説明 |
|---------|------|
| **skill-creator** | Claude の機能を拡張する効果的なスキル作成ガイド |
| **template-skill** | 新しいスキル作成の出発点となる基本テンプレート |

<br>

##### スキルの呼び出し方法

Agent Skills を呼び出すには、チャットにて自然言語でスキル名を指定して依頼します：

```text
# 基本的な呼び出し方
brand-guidelines スキルを使って、○○を作成してください

# スキル名を明示的に指定
skill: brand-guidelines を使用して、CSS ファイルを生成してください
```

Claude がスキルを認識すると、必要な処理を自動的に実行してくれます。

#### brand-guidelines スキルとは

brand-guidelines スキルは、Anthropic の公式テーマファイルを生成するための Agent Skills です。このスキルを使用することで、Anthropic の公式 UI で使用されているカラーパレットや Typography を含む CSS ファイルを生成できます。

##### 生成される CSS ファイルの内容

生成される CSS ファイルには、以下のような要素が含まれています：

- **カラーパレット**: プライマリカラー、背景色、テキスト色など
- **Typography**: フォントファミリー、サイズ、行間など
- **コンポーネントスタイル**: ボタン、リンク、コードブロックなど
- **ダークモード対応**: Light テーマと Dark テーマの両方に対応

#### Markdown Preview Enhanced とは

Markdown Preview Enhanced は、VSCode の拡張機能です。
VSCode には標準で Markdown プレビュー機能が搭載されていますが、この拡張機能を使用する理由は以下の通りです：

- **カスタム CSS の適用が容易**: 独自の CSS ファイルを簡単に読み込めます
- **豊富な機能**: 数式、図表、目次など、標準プレビューにない機能が多数あります
- **高いカスタマイズ性**: 細かい設定変更が可能です

カスタムスタイル適用に関連する機能として、以下の特徴があります：

- **style.less の編集**: 拡張機能専用のスタイルファイルを持っており、そこから外部 CSS を読み込めます
- **リアルタイムプレビュー**: スタイルの変更が即座に反映されます
- **複数のプレビューモード**: さまざまな形式でのエクスポートにも対応しています

この手順では、brand-guidelines スキルで生成した CSS ファイルを、Markdown Preview Enhanced の style.less ファイルから読み込むことで、Anthropic の公式テーマを適用します。

### 1. Agent Skills の有効化

@[og](https://support.claude.com/ja/articles/12512180-claude%E3%81%A7%E3%82%B9%E3%82%AD%E3%83%AB%E3%82%92%E4%BD%BF%E7%94%A8%E3%81%99%E3%82%8B)

1. claude.ai にアクセス

    [Claude の新規チャット画面](https://claude.ai/new)

    <br>

2. 設定画面を開く

    ![](https://i.gyazo.com/8ff973db6b0433ba397af60764de5d88.png)

    <br>

3. `機能` > `コード実行とファイル作成` を有効化

    ![](https://i.gyazo.com/07ffaa0beae7cc571e8f16a3a35049c0.png)

    <br>

4. 同画面にて、利用するスキル(brand-guidelines)を有効化

    ![](https://i.gyazo.com/daa1c92d68c23dd75779f9969859f58e.png)

    <br>

5. 有効化の確認

    claude.ai のチャット画面にて、利用可能なスキルを質問してみましょう。
  
    ![](https://i.gyazo.com/0f0dc2ab3feb4e139024ab3d278f6a58.png)

### 2. Markdown Preview Enhanced 拡張機能のインストール

VSCode の拡張機能マーケットプレイスから、Markdown Preview Enhanced をインストールします。

@[og](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced)

![](https://i.gyazo.com/fe1f2cde54342aca49bc94182e02a9e3.png)

### 3. brand-guidelines スキルによるスタイル作成

claude.ai のチャット画面にて、brand-guidelines スキルを使用して、CSS ファイルを生成するよう依頼します。

プロンプトは適当ですが、例えば以下の内容で依頼してみました。

```text
vscodeでmarkdownファイルをプレビューした際のスタイルにanthropicの公式テーマを適用したい。
プレビューにはmarkdown preview enhanced 拡張機能を利用する想定。
カスタムcssファイルを生成してほしい。
```

<br>

出力結果は以下のとおりです。

![](https://i.gyazo.com/65810dbbae51791453bd3208443e55b0.png)

### 4. 生成されたスタイルの確認

今回生成された CSS ファイルは以下のとおりです。

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

### 5. Markdown Preview Enhanced への適用

1. コマンドパレットにて、`Markdown Preview Enhanced: Customize CSS (Global)` を実行

2. 表示された `style.less` ファイルに、生成された CSS ファイルの内容を追記し保存

### 6. 動作確認と微調整

プレビューに適用されたスタイルを確認して、気になる点があれば微調整します。
スタイルの微調整は、style.less ファイルを直接編集することで実施可能です。
あるいは、claude.ai のチャット画面にて、style.less ファイルの内容を変更するよう依頼もできます。

_ぼくはフォントを少し変更しました。_

::: info
Markdown Preview Enhanced には、拡張機能の設定画面からプレビューテーマを指定する機能があります（`Markdown Preview Enhanced: Preview Theme` / `Markdown-preview-enhanced: Code Block Theme` 設定）。この設定と `style.less` の内容が競合すると、意図したスタイルが適用されない場合があります。

もしスタイルが思い通りに反映されない場合は、これらの設定を変更してみてください。
:::

## まとめ

この記事では、Claude の Agent Skills を活用して、Markdown プレビューに Anthropic のスタイルを適用する方法を解説しました。

### 実現できたこと

今回の設定により、以下のことが実現できました：

1. **Agent Skills の理解**: Claude の Agent Skills を有効化し、使いこなす方法を学びました
2. **brand-guidelines スキルの活用**: 公式スタイルの CSS ファイルを簡単に生成できるようになりました
3. **統一された執筆環境**: Anthropic の公式スタイルを適用したプレビュー環境を構築しました

### さらなる発展：カスタムスキルの作成

この記事では公式の brand-guidelines スキルを使用しましたが、別の公式スキル **skill-creator** を使えば、自分だけのオリジナルスキルを作成することもできます。

例えば、以下のようなカスタムスキルを作成できます：

- 自社のブランドガイドラインに基づいた CSS 生成スキル
- 特定のフレームワーク向けのコンポーネント生成スキル
- プロジェクト固有のドキュメントテンプレート生成スキル

skill-creator スキルの使い方は、claude.ai のチャットで以下のように依頼するだけです。

```text
skill-creator スキルを使って、○○を行うカスタムスキルを作成してください
```

<br>

詳細は [Anthropic の公式スキルリポジトリ](https://github.com/anthropics/skills) を参照してください。公式の skill-creator や template-skill を参考にすることで、効果的なスキルを作成できます。

なお、skill-creator を利用する場合は、brand-guidelines スキルを有効化したように、skill-creator スキルを有効化することをお忘れなく！

---

最後までお読みいただき、ありがとうございました。この記事が、あなたの執筆環境をより快適にする助けになれば幸いです。🎨✨
