---
title: AI 代理与系统连接的 MCP 入门（StreamableHTTP 无状态实现篇）
author: masato-ubata
date: 2026-05-22T00:00:00.000Z
tags:
  - MCP
  - typescript
image: true
translate: true

---

## 引言

本页面是「AI代理与系统连接的MCP入门」的续篇。  
此次将说明使用 StreamableHTTP 通信的 MCP 服务器（无状态）的实现。  

上次的 stdio 实现篇是将 MCP 客户端作为子进程运行并在本地完成的架构。StreamableHTTP 是通过 HTTP 对外公开 MCP 服务器，允许多个 MCP 客户端利用的架构。  
适用于 MCP 服务器调用 Web API 并让 MCP 客户端参照最新数据的用途。  
此外，无状态的特点是每个请求的处理都是自包含的，因此生命周期管理简单易用。  

由于篇幅较长，本文将无状态和有状态分别说明。  
本文所示代码已在[此处](https://github.com/ubata-mamezou/developer-site-article-examples/tree/main/mcp-server_http)公开。  

:::info: 系列目录
**连载：AI代理与系统连接的MCP入门**
* [导论](/blogs/2026/04/24/mcp-impl_introduction/)
* [stdio 实现篇](/blogs/2026/05/08/mcp-impl_stdio/)
* **StreamableHTTP 无状态实现篇（本页）**
:::

## 本次使用的库等

* npm@11.11.1
* node@22.22.0
* typescript@6.0.3
* @modelcontextprotocol/sdk@1.29.0
* zod@4.3.6

## 实现一个简单的服务器

简单地实现 MCP 服务器并进行运行确认。  

### 服务器实现

如在 stdio 中提到的，基本要素（「生成服务器实例」「注册工具」「启动处理」）是相同的。  
这里重点说明相较 stdio 更具特色的「启动处理」。  

**启动处理**  
* 定义接收的端点  
  定义传输设置、工具注册及响应后处理等  
  * 由于使用 StreamableHTTP，将 `StreamableHTTPServerTransport` 的实例作为 connect 的参数传入。  
  * 由于是无状态，也不分发任何会话 ID。  
    ```ts
    app.post("/mcp", async (req, res) => {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport();

      try {
        // 1: 参见下方专栏
        await server.connect(refineTransport(server, transport));
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
          res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
        }
      } finally {
        await transport.close();
        await server.close();
      }
    });
    ```
    :::info: 1. 为了匹配参数类型，使用类型断言调整类型  
    `StreamableHTTPServerTransport` 实现了 `Transport`。  
    但在本次使用的版本中，`Transport` 定义的行为与 `StreamableHTTPServerTransport` 的定义存在差异。（onclose 就是一个例子）  
      ```ts: 仅部分展示相关片段
      // transport.d.ts
      export interface Transport {
        onclose?: () => void;
      }
      // streamableHttp.d.ts
      export declare class StreamableHTTPServerTransport implements Transport {
          set onclose(handler: (() => void) | undefined);
          get onclose(): (() => void) | undefined;
      }
      ```
    `server.connect` 的参数类型为 `Transport`，但结构不匹配，因此使用类型断言进行调整。  
      ```ts: 用于类型调整的代码
      export const refineTransport = (server: McpServer, transport: StreamableHTTPServerTransport) => {
        return transport as Parameters<typeof server.connect>[0];
      };
      ```
    :::

* 定义拒绝的端点  
    对于需要拒绝的端点，定义返回 405 等响应。  
    ```ts
    app.get("/mcp", (_req, res) => {
        res.writeHead(405).end(JSON.stringify({jsonrpc: "2.0", error: {code: -32000, message: "Method not allowed."}, id: null}));
    });
    ```
* 绑定端口  
    将服务绑定到指定端口。  
    ```ts
    app.listen(MCP_PORT, (error?: Error) => {
        // 略
    });
    ```

* 全部代码
```ts: index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { refineTransport } from "./transport.util.js";
import { ApplicationError } from "./application.error.js";

const PORT = Number(process.env.PORT ?? "3000");
const WEB_API_BASE_URL = process.env.WEB_API_BASE_URL ?? "http://localhost:3001";
const WEB_API_CALL_FAILED_MESSAGE = "WebAPI call failed";

function createServer() {
  // 生成服务器实例
  const server = new McpServer({
    name: "todo-mcp-stateless",
    version: "1.0.0",
  });

  // 注册工具
  server.registerTool(
    "get_todo",
    {
      title: "get_todo",
      description: "获取一条 Todo",
      inputSchema: {
        id: z.number().describe("Todo 的 ID"),
      },
    },
    async ({ id }) => {
      const endpoint = `${WEB_API_BASE_URL}/todos/${id}`;
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10_000),
        });
        // 因为省略了注册，所以省略了对响应的验证。
        const body = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(body) }] };
      } catch (error) {
        const message = error instanceof ApplicationError ? error.message : WEB_API_CALL_FAILED_MESSAGE;
        throw new ApplicationError(message);
      }
    },
  );

  return server;
}

const app = createMcpExpressApp();

// 启动处理
async function boot() {

  // 接收 POST 请求的端点
  app.post("/mcp", async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport();

    try {
      await server.connect(refineTransport(server, transport));
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
      }
    } finally {
      await transport.close();
      await server.close();
    }
  });

  // 禁止 GET 请求
  app.get("/mcp", (_req, res) => {
    res.writeHead(405).end(JSON.stringify({jsonrpc: "2.0", error: {code: -32000, message: "Method not allowed."}, id: null}));
  });

  // 禁止 DELETE 请求
  app.delete("/mcp", (_req, res) => {
    res.writeHead(405).end(JSON.stringify({jsonrpc: "2.0", error: {code: -32000, message: "Method not allowed."}, id: null}));
  });

  // 绑定端口
  app.listen(PORT, (error?: Error) => {
    if (error) {
      console.error("Failed to start stateless server:", error);
      process.exit(1);
    }
    console.error(`Stateless MCP endpoint: http://localhost:${PORT}/mcp`);
  });
}

await boot();
```

### 服务器运行确认

使用 MCP Inspector 确认相同的运行效果。  
![运行结果](/img/blogs/2026/0522_mcp-impl_http_stateless/example1_success_mcp-inspector.png)

:::info: 异常抛出导致终止时的显示  
停止目标 API 服务器后执行工具并查看显示  
![运行结果](/img/blogs/2026/0522_mcp-impl_http_stateless/example1_error_mcp-inspector.png)
:::

## 总结

* 在 StreamableHTTP 的无状态实现中，通过为每个请求生成 McpServer 和 Transport，并在处理后关闭它们，可以保持简单的生命周期。  
* 由于 MCP SDK 即使是次要版本更新也可能影响类型定义和行为差异，因此建议固定依赖版本，并在更新时准备验证流程逐步确认以确保安全。  
* 本篇在最小构成中确认了无状态的流程。覆盖 API CRUD 的示例实现也已在[此处](https://github.com/ubata-mamezou/developer-site-article-examples/tree/main/mcp-server_http)公开，如有需要请参考。  
* 下篇将讨论与有状态架构的区别（会话管理和服务器生命周期）。
