---
title: AIエージェントとシステムをつなぐMCP入門（プロンプト編）
author: masato-ubata
date: 2026-06-19
tags: [MCP, typescript]
image: true
---

## はじめに

本ページは「AIエージェントとシステムをつなぐMCP入門」の続編です。  
今回は、プロンプトについて説明します。  

MCPのプロンプトは、MCPクライアント向けにテンプレート化されたメッセージやワークフローを提供する機能です。  
生成指示やツールの利用順序を定義したワークフローなど、テンプレート化して再利用したい場合に有効です。  

本記事で掲載しているコードは[こちら](https://github.com/ubata-mamezou/developer-site-article-examples/tree/main/mcp-server_http)で公開しています。

:::info: シリーズ目次
**連載：AIエージェントとシステムをつなぐMCP入門**
* [イントロダクション](/blogs/2026/04/24/mcp-impl_introduction/)
* [stdio実装編](/blogs/2026/05/08/mcp-impl_stdio/)
* [StreamableHTTPステートレス実装編](/blogs/2026/05/22/mcp-impl_http_stateless/)
* [StreamableHTTPステートフル実装編](/blogs/2026/06/05/mcp-impl_http_stateful/)
* **プロンプト編（本ページ）**
::: 

## 今回使用するライブラリなど

* npm@11.11.1
* node@22.22.0
* typescript@6.0.3
* @modelcontextprotocol/sdk@1.29.0
* zod@4.3.6

## 使用例

* 定形タスクのテンプレート化: コード生成やレビューなど利用頻度の高い指示をテンプレート化することで、クライアント側の指示作成を省略できます
* ペルソナやルールの適用: 役割や出力形式の制約をコンテキストとして適用します
* ワークフローのテンプレート化: ツールの利用順序などを定義して一連の流れをガイドします

## 実装サンプル

コードの全体は[こちら](https://github.com/ubata-mamezou/developer-site-article-examples/blob/main/mcp-server_http/src/index.prompt-and-resource.ts)をご覧ください。  

### 定形タスクのテンプレート化

定形タスクであるレビュー指示をテンプレート化した実装例です。  
最近は省略されがちですが、サンプルなので役割も明示しています。  

* `argsSchema`（引数スキーマ）: プロンプトの変数部分を定義するもの
* `messages`: `role`と`content`で構成されるメッセージ配列
  * `role`: メッセージの役割
    * `user`、`assistant`のいずれかを設定します
    * `user`がプロンプト本体、`assistant`は見本という位置付けです
    * プロンプトだけではレスポンスの形式がブレしまう場合、`assistant`を付けてレスポンス形式のブレを補正します  

```ts
  // プロンプト：コードレビュー指示をテンプレート化
  server.registerPrompt(
    "code-review-prompt",
    {
      title: "code-review-prompt",
      description: "コードレビュー指示",
      // 引数スキーマの定義
      argsSchema: {
        specPath: z.string().describe("仕様書パス"),
        codePath: z.string().describe("対象コードパス"),
      },
    },
    async ({ specPath, codePath }) => {
      return {
        messages: [
          // user: プロンプト本文
          {
            role: "user",
            content: {
              type: "text",
			  // 実務ではもっと細かい指示が必要になりますが、行数を抑えるため最小限に留めています
              text: [
                "コードレビュー指示",
                "あなたはNode.js/TypeScriptのバックエンド開発スペシャリストです。",
                "* 優先観点: 仕様整合性、例外設計、認可制御、トランザクション制御、性能、保守性、セキュリティ。",
                "* 禁止: 推測で仕様補完しない。根拠のない断定をしない。",
                "* 指摘の重大度: High(必須)/Medium(基本的に対応)/Low(できるだけ対応)を付ける。",
                "* 指摘は「問題」「対象個所」「修正案」を1行で示す。",
                "* 出力は最大10件、重複指摘は統合する。",
                "* 改善コードが必要なら最小差分で提案する。",
                `* 仕様書パス: ${specPath}`,
                `* 対象コードパス: ${codePath}`,
              ].join("\n"),
            },
          },
          // assistant: 見本
          {
            role: "assistant",
            content: {
              type: "text",
              text: ["（コードレビュー指摘の出力例）",
                "1. High: [問題] 仕様に記載のないAPIエンドポイントが存在する。 [対象個所] src/api/user.tsのgetUser関数。 [修正案] 不要なエンドポイントなら削除、仕様が古いなら更新して整合させる。",
				// omit
              ].join("\n")},
          },
        ],
      };
    },
  );
```
* 動作確認（MCP Inspector）
	![MCP Inspectorからの確認](/img/blogs/2026/0619_mcp-impl_prompt/example1-1_mcp-inspector.png)

### ワークフローのテンプレート化

ツールの実行順序をテンプレート化した実装例です。  

```ts
  // プロンプト: 指示やワークフローをテンプレート化。
  server.registerPrompt(
    "inventory-check-workflow",
    {
      title: "inventory-check-workflow",
      description: "在庫確認ワークフロー",
      argsSchema: {
        orderNo: z.string().describe("受注番号"),
      },
    },
    async ({ orderNo }) => {
      const prompt = [
        "在庫確認ワークフロー",
        `1. tools/callでget-orderを実行してください。（引数 orderNo: "${orderNo}"）`,
        "2. tools/callでcheck-attached-inventoryを実行してください。（引数: orderId: 1のレスポンスのorderId, quantity: 1のレスポンスのquantityの合計）",
        "3. 2のレスポンスのavailableがtrueなら「在庫引当済み」、falseなら「在庫不足」と返してください。",
      ].join("\n")
      return {messages: [{role: "user", content: {type: "text", text: prompt,}}]};
    },
  );
  server.registerTool(
    "get-order",
	// omit: 今回は固定値を返すだけの実装にしています
  );
  server.registerTool(
    "check-attached-inventory",
	// omit: 今回は固定値を返すだけの実装にしています
  );
```

* 動作確認（MCP Inspector）
	![MCP Inspectorからの確認](/img/blogs/2026/0619_mcp-impl_prompt/example2-1_mcp-inspector.png)
* プロンプトの利用（VS Code）
    実際にプロンプトを使ってツールの実行を指示して動作を確認。  
	プロンプトで指示した順にツールを実行し、結果も指示した通りに返されました。
	![VS Codeでプロンプトを実行](/img/blogs/2026/0619_mcp-impl_prompt/example2-2_vscode.png)

## まとめ

* プロンプトは、定形タスクを標準化したい場面で効果を発揮します。
* サーバー側でプロンプトを管理することで、ツール呼び出しのフローを共有できます。
* 次編ではリソースを扱います。
