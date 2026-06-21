---
title: 连接AI代理与系统的MCP入门（提示篇）
author: masato-ubata
date: 2026-06-19T00:00:00.000Z
tags:
  - MCP
  - typescript
image: true
translate: true

---

## 引言

本页面是“连接AI代理与系统的MCP入门”的续篇。  
这次将介绍提示（Prompt）。

MCP 的提示功能是为 MCP 客户端提供模板化的消息和工作流程的功能。  
在需要将生成指令或工具使用顺序的工作流程等模板化以便重用的场景中非常有效。

本文中展示的代码已在以下地址公开：https://github.com/ubata-mamezou/developer-site-article-examples/tree/main/mcp-server_http

:::info: 系列目录
**连载：连接AI代理与系统的MCP入门**
* [介绍](/blogs/2026/04/24/mcp-impl_introduction/)
* [stdio 实现篇](/blogs/2026/05/08/mcp-impl_stdio/)
* [StreamableHTTP 无状态实现篇](/blogs/2026/05/22/mcp-impl_http_stateless/)
* [StreamableHTTP 有状态实现篇](/blogs/2026/06/05/mcp-impl_http_stateful/)
* **提示篇（本页）**
:::

## 本次使用的库等

* npm@11.11.1
* node@22.22.0
* typescript@6.0.3
* @modelcontextprotocol/sdk@1.29.0
* zod@4.3.6

## 使用示例

* 定型任务模板化：将代码生成或审查等高频指令模板化，可省略客户端的指令编写  
* 应用角色或规则：将角色或输出格式的约束作为上下文应用  
* 工作流程模板化：定义工具的使用顺序，引导一系列流程  

## 实现示例

代码整体请参见[此处](https://github.com/ubata-mamezou/developer-site-article-examples/blob/main/mcp-server_http/src/index.prompt-and-resource.ts)。

### 定型任务模板化

以下是将定型任务（代码审查指令）模板化的实现示例。  
尽管实际项目中常常省略角色说明，但此示例中仍明确指定了角色。

* argsSchema（参数模式）：定义提示中的变量部分  
* messages：由 role 和 content 组成的消息数组  
  * role：表示消息发言者的标识符，可设置为 user 或 assistant  
    * user（用户）：表示来自人类的输入。在此处编写对 AI 的指令（提示正文）。  
    * assistant（助手）：表示 AI 的回复。  
      :::info: 如果仅有提示指令，回复格式可能不稳定  
      通过提前将输出格式的“示例（Few-shot）”作为 AI 自身的回复放置，可以获得更高精度的结果。  
      :::  
  * content：消息主体。示例中仅使用文本，但也可处理二进制（图像、音频、嵌入式资源）。  
    * text（文本）：纯文本消息，是自然语言交互中常用的类型  
    * image（图像）：包含视觉信息的消息  
    * audio（音频）：包含音频信息的消息  
    * resource（嵌入式资源）：将服务器资源（文档、代码示例等）嵌入对话。  
      :::info: 处理二进制时  
      需要使用 Base64 编码，并设置合适的 MIME 类型。  
      :::  

```ts
  // 提示：将代码审查指令模板化
  server.registerPrompt(
    "code-review-prompt",
    {
      title: "code-review-prompt",
      description: "代码审查指令",
      // 参数模式定义：在 MCP Inspector 等 MCP 客户端的 UI 中作为输入表单展示，并传递给服务器端函数。
      argsSchema: {
        specPath: z.string().describe("规格文档路径"),
        codePath: z.string().describe("目标代码路径"),
      },
    },
    async ({ specPath, codePath }) => {
      return {
        messages: [
          // user: 提示正文
          {
            role: "user",
            content: {
              type: "text",
              // 在实际业务中需要更详细的指令，但为了减少行数，此处保持最简
              text: [
                "代码审查指令",
                "你是 Node.js/TypeScript 的后端开发专家。",
                "* 优先考量：规格一致性、异常设计、授权控制、事务控制、性能、可维护性、安全性。",
                "* 禁止：不要凭猜测补全规格。不要无依据断定。",
                "* 指出问题的严重度：High（必需）/Medium（原则上处理）/Low（尽可能处理）。",
                "* 指出应以「问题」「对应位置」「修正方案」的形式在一行中展示。",
                "* 输出最多10条，重复指出的问题要合并。",
                "* 如果需要改进代码，请最小差异方式提出。",
                `* 规格文档路径: ${specPath}`,
                `* 目标代码路径: ${codePath}`,
              ].join("\n"),
            },
          },
          // assistant: 示例
          {
            role: "assistant",
            content: {
              type: "text",
              text: [
                "（代码审查指出输出示例）",
                "1. High: [问题] 存在未在规格中记载的 API 端点。 [对应位置] src/api/user.ts 的 getUser 函数。 [修正方案] 如果是多余的端点则删除，如果规格过旧则更新以保持一致。",
                // omit
              ].join("\n"),
            },
          },
        ],
      };
    },
  );
```

* 运行确认（MCP Inspector）  
  ![MCP Inspector 确认](/img/blogs/2026/0619_mcp-impl_prompt/example1-1_mcp-inspector.png)

### 工作流程模板化

下面是将工具执行顺序模板化的实现示例。

```ts
  // 提示：将指令和工作流程模板化
  server.registerPrompt(
    "inventory-check-workflow",
    {
      title: "inventory-check-workflow",
      description: "库存确认工作流",
      argsSchema: {
        orderNo: z.string().describe("订单号"),
      },
    },
    async ({ orderNo }) => {
      const prompt = [
        "库存确认工作流",
        `1. 请通过 tools/call 执行 get-order。（参数 orderNo: "${orderNo}"）`,
        "2. 请通过 tools/call 执行 check-attached-inventory。（参数：orderId 从第1步响应中获取的 orderId，quantity 从第1步响应中获取的 quantity 总和）",
        "3. 如果第2步响应的 available 为 true，则返回“库存已分配”，否则返回“库存不足”。",
      ].join("\n");
      return { messages: [{ role: "user", content: { type: "text", text: prompt } }] };
    },
  );
  server.registerTool(
    "get-order",
    // omit: 本次仅实现为返回固定值
  );
  server.registerTool(
    "check-attached-inventory",
    // omit: 本次仅实现为返回固定值
  );
```

* 运行确认（MCP Inspector）  
  ![MCP Inspector 确认](/img/blogs/2026/0619_mcp-impl_prompt/example2-1_mcp-inspector.png)  
* 在 VS Code 中使用提示  
  实际使用提示来指示工具执行并确认运行。  
  提示按照指定的顺序执行工具，结果也按提示返回。  
  ![在 VS Code 中运行提示](/img/blogs/2026/0619_mcp-impl_prompt/example2-2_vscode.png)

## 总结

* 提示在需要标准化定型任务的场景中非常有效。  
* 通过在提示中指示工具的调用顺序，并在同一服务器内使用 `registerTool` 提供相关工具，LLM 可以按照提示自主调用工具，一次性自动完成整个流程。  
* 下一篇将介绍如何处理资源。  
