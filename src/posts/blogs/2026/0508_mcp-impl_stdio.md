---
title: AIエージェントとシステムをつなぐMCP入門（stdio実装編）
author: masato-ubata
date: 2026-05-08
tags: [MCP, typescript]
image: true
---

## はじめに

本ページは「AIエージェントとシステムをつなぐMCP入門」の続編です。  
今回はstdioで通信するMCPサーバーの実装について説明します。標準入出力（stdin/stdout）を利用したMCPサーバーの構築手順と、stdio特有の注意点について見ていきます。  
本ページで掲載しているコードは[こちら](https://github.com/ubata-mamezou/developer-site-article-examples/tree/main/mcp-server_stdio)で公開しています。  

:::info: シリーズ目次
**連載：AIエージェントとシステムをつなぐMCP入門**
* [イントロダクション](/blogs/2026/04/24/mcp-impl_introduction/)
* **stdio実装編（本ページ）**
:::

## 今回使用するライブラリなど

* npm@11.11.1
* node@22.22.0
* typescript@6.0.3
* @modelcontextprotocol/sdk@1.29.0
* zod@4.3.6

## 簡単なサーバーを実装

簡単にMCPサーバーを実装して動作確認します。  

### サーバーの実装

**サーバーインスタンスの生成**  
サーバー名やバージョンを設定し、MCPサーバーのインスタンスを生成します。

**ツールの登録**  
MCPサーバーにツール（公開する振る舞い）を登録します。  
ここで登録したツールをMCPクライアントから呼び出せます。  
ツールには、下記のような内容を実装します。
* ツール名
* 入力スキーマ: ツールが受け取るデータの構造
* 出力スキーマ: ツールが返却するデータの構造。構造化したデータを返却したい場合のみ定義する。
* リクエストハンドラー: ツールの内部処理。contentの返却は必須。

**起動処理**  
MCPサーバーの起動処理。  
今回はstdioなので、`StdioServerTransport`のインスタンスをconnectの引数に設定します。

```ts: index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// サーバーのインスタンス化
const server = new McpServer({
  name: "hello-world-server",
  version: "1.0.0",
});

// ツールの登録
server.registerTool(
  "hello",
  {
    title: "hello, world!",
    inputSchema: { name: z.string().describe("メッセージに追加する名前") }, // 入力スキーマの定義
    outputSchema: { message: z.string().describe("メッセージ") }, // 出力スキーマの定義
  },
  async ({ name }) => {
    return {
      content: [{ type: "text", text: `Hello, ${name}!` }], // デフォルトのレスポンス
      structuredContent: { message: `Hello, ${name}!` }, // 出力スキーマに基づくレスポンス
    };
  },
);

// 起動処理
async function boot() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Hello World Server (Modern) running on stdio"); // 標準出力にログを出力するとエラーになるため、`console.error`を使用しています
}

try {
  await boot();
} catch (error) {
  console.error("Fatal error:", error);
  process.exit(1);
}
```

### サーバーの動作確認

#### コンソールで確認

コンソール上でサーバーを起動して、動作を確認します。

1. 起動
   ```sh: サーバーのビルドと起動
   npx tsc
   node dist/index.js
   ```
1. ツール一覧取得
   `tools/list`を実行して一覧を取得。
   ```json: ツール一覧取得と結果
   // 標準入出力に下記を入力
   {"jsonrpc":"2.0", "id":"1", "method":"tools/list", "params":{}}
   // ツール一覧が表示されました　※レスポンスは一部成形しています
   {"result":{"tools":[
      {
        "name":"hello",
        "title":"hello, world!",
        "inputSchema":{"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"name":{"type":"string","description":"メッセージに追加する名前"}},"required":["name"]},
        "execution":{"taskSupport":"forbidden"},
        "outputSchema":{"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"message":{"type":"string","description":"メッセージ"}},"required":["message"],"additionalProperties":false}
      }
   ]},"jsonrpc":"2.0","id":"1"}
   ```
2. ツール呼び出し
   `tools/call`で`hello`を実行。
   ```json: ツールの呼び出しと結果
   // 標準入出力に下記を入力
   {"jsonrpc":"2.0", "id":"1", "method": "tools/call", "params": { "name": "hello", "arguments": { "name": "MCP" }}}
   // ツールの実行結果が表示されました　※レスポンスは一部成形しています
   {"result":{
      "content":[{"type":"text","text":"Hello, MCP!"}],
      "structuredContent":{"message":"Hello, MCP!"}},
   "jsonrpc":"2.0","id":"1"}
   ```

#### MCP Inspectorで確認

MCP Inspectorを使って、同じ動作を確認します。
![ツールの表示](/img/blogs/2026/0508_mcp-impl_stdio/example1_mcp-inspector.png)

## デバッグログを出力したらどうなるのか検証

通信に使われる標準出力へJSON形式ではない文字列を出力した場合の挙動を検証してみます。  
通常、標準エラー出力はプロトコル本体とは分離されるため、併せて挙動を確認します。

### ツールを追加実装

標準出力（stdout）、標準エラー（stderr）にログを出力するツールを追加実装します。

```ts: index.ts
server.registerTool(
  `output_log`,
  { title: 'output_log' },
  async () => {
    console.log('debug log'); // to stdout
    console.info('info log'); // to stdout
    console.warn('warn log'); // to stderr
    console.error('error log'); // to stderr
    return { content: [{ type: "text", text: 'output log tool' }] };
  },
);
```

### 追加したツールの動作確認

追加したツールを実行してみます。  
基本的にstdioは標準出力をJSON-RPCメッセージ専用、ログは標準エラー出力へ分離して動作します。
標準出力にJSON形式ではない文字列が混入したタイミングで、パースエラーになりました。
標準エラー出力にも同様の出力していますが、分離されているためエラーは発生しません。（標準出力を汚さないことが前提）

```sh: MCP Inspectorを起動しているコンソール
Received POST message for sessionId xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxx1xx
Error from MCP server: SyntaxError: Unexpected token 'd', "debug log" is not valid JSON
    at JSON.parse (<anonymous>)
    at deserializeMessage (file:///C:/Users/~/shared/stdio.js:26:44)
    at ReadBuffer.readMessage (file:///C:/Users/~/shared/stdio.js:19:16)
    at StdioClientTransport.processReadBuffer (file:///C:/Users/~/client/stdio.js:126:50)
    at Socket.<anonymous> (file:///C:/Users/~/client/stdio.js:92:22)
    at Socket.emit (node:events:519:28)
    at addChunk (node:internal/streams/readable:561:12)
    at readableAddChunkPushByteMode (node:internal/streams/readable:512:3)
    at Readable.push (node:internal/streams/readable:392:5)
    at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)
Error from MCP server: SyntaxError: Unexpected token 'i', "info log" is not valid JSON
    at JSON.parse (<anonymous>)
    at deserializeMessage (file:///C:/Users/~/shared/stdio.js:26:44)
    at ReadBuffer.readMessage (file:///C:/Users/~/shared/stdio.js:19:16)
    at StdioClientTransport.processReadBuffer (file:///C:/Users/~/client/stdio.js:126:50)
    at Socket.<anonymous> (file:///C:/Users/~/client/stdio.js:92:22)
    at Socket.emit (node:events:519:28)
    at addChunk (node:internal/streams/readable:561:12)
    at readableAddChunkPushByteMode (node:internal/streams/readable:512:3)
    at Readable.push (node:internal/streams/readable:392:5)
    at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)
```

:::column: MCP Inspectorの表示
上記の通り、コンソール上はパースエラーになりました。
今回使用したInspectorは後続の正しいJSONメッセージを拾ってくれたため、UI上は成功に見えます。
![ツールの表示](/img/blogs/2026/0508_mcp-impl_stdio/example2_mcp-inspector.png)
:::

## まとめ

* stdioでは標準出力をJSON-RPCメッセージ専用にし、ログは標準エラー出力へ分離する。
* 標準出力に非JSON文字列が混入すると、クライアント側でパースエラーが発生しやすい。
