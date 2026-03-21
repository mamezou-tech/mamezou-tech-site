---
title: 在 GitHub MCP Registry 上公开的 MCP 服务器在 VS Code 中运行的步骤
author: masato-ubata
date: 2026-03-17T00:00:00.000Z
tags:
  - MCP
  - GitHub Copilot
  - vscode
image: true
translate: true

---

## 介绍

MCP 服务器是一种定义可由代理或工具调用的可执行“服务”的机制。  
在本页面中，将介绍如何从 VS Code 的 MCP 扩展启动 MCP 服务器（这次使用 Markitdown），并在 AI 代理／MCP 客户端中调用它的步骤。  

* 术语补充（本文中的用法）
  * **MCP（Model Context Protocol）服务器**  
    一种向代理提供可执行工具的机制。  
    代理可以通过调用 MCP 服务器的“工具”来执行外部处理。  
  * **Markitdown (`microsoft/markitdown`)**  
    将 PDF 或 pptx 转换为 Markdown 的 MCP 服务器。  
  * **uvx**  
    Markitdown 的启动器。  
    本次测试用的 MCP 服务器所期望的 `command` 工具。  

## 环境

* Windows 11  
* VS Code  
* Markitdown@1.8.1: 用于运行确认的 MCP 服务器  
* uvx@0.10.9  
* Copilot: 用于调用 MCP 服务器的 AI 代理  
* MCP Inspector@0.21.0: 用于调用 MCP 服务器的 MCP 客户端  

## 步骤

这次使用 Markitdown 来进行运行确认。

1. 在 VS Code 中安装 MCP 服务器  
    * 从 [GitHub MCP Registry](https://github.com/mcp) 安装时  
      1. 在浏览器中打开 GitHub MCP Registry，点击想要安装的 MCP 的 install 按钮。  
        ![MCP 安装](/img/blogs/2026/0317_use-mcp-server-on-vscode/mcp-install_mcp-registry.png)

    * 从 VS Code 扩展视图安装时  
      1. 在 VS Code 中启用设置，以便可以搜索 MCP 服务器。  
        ![启用设置](/img/blogs/2026/0317_use-mcp-server-on-vscode/mcp-install_in-vscode_enable-setting.png)

        :::info
        ■想要禁用该设置时  
        打开设置并取消勾选。  
        ![禁用设置](/img/blogs/2026/0317_use-mcp-server-on-vscode/mcp-install_in-vscode_disable-setting.png)
        :::

      2. 在过滤（`@mcp`）后会显示 MCP，然后点击想要安装的 MCP 的 install 按钮。  
        ![MCP 安装](/img/blogs/2026/0317_use-mcp-server-on-vscode/mcp-install_in-vscode.png)
    * 安装 MCP 服务器后，`.vscode/mcp.json` 会添加 MCP 服务器的设置。  
        ```json: .vscode/mcp.json
        {
            "servers": {
                "microsoft/markitdown": { // MCP 服务器名称
                    "type": "stdio", // MCP 服务器类型
                    "command": "uvx", // MCP 服务器期望的命令
                    "args": [ // 传递给命令的参数
                        "markitdown-mcp@0.0.1a4"
                    ],
                    "gallery": "https://api.mcp.github.com",
                    "version": "1.0.0"
                }
            },
            "inputs": []
        }
        ```
2. 启动 MCP 服务器  
    读取安装后创建的 `.vscode/mcp.json` 中的设置，启动本地进程。  

    * 从 VS Code 的扩展视图启动  
        ![从 VS Code 启动 MCP](/img/blogs/2026/0317_use-mcp-server-on-vscode/mcp-start_vscode.png)
    * 从 `.vscode/mcp.json` 启动  
        ![从 JSON 启动 MCP](/img/blogs/2026/0317_use-mcp-server-on-vscode/mcp-start_json.png)
    * 启动示例  
        ```sh
        2026-03-10 12:35:30.848 [info] Starting server microsoft/markitdown
        2026-03-10 12:35:30.848 [info] Connection state: Starting
        2026-03-10 12:35:30.849 [info] Starting server from LocalProcess extension host
        2026-03-10 12:35:30.920 [info] Connection state: Starting
        2026-03-10 12:35:30.920 [info] Connection state: Running
        2026-03-10 12:35:35.925 [info] Waiting for server to respond to `initialize` request...
        2026-03-10 12:35:40.922 [info] Waiting for server to respond to `initialize` request...
        2026-03-10 12:35:45.927 [info] Waiting for server to respond to `initialize` request...
        2026-03-10 12:35:50.921 [info] Waiting for server to respond to `initialize` request...
        2026-03-10 12:35:55.923 [info] Waiting for server to respond to `initialize` request...
        2026-03-10 12:36:00.924 [info] Waiting for server to respond to `initialize` request...
        # 以下省略
        ```

        :::info
        ■提示安装 uvx 的连接错误  
        本次用于验证的 Markitdown 基于 Python，命令使用 uvx。  
        因此，如果系统中未将 uvx 添加到 PATH，会出现以下连接错误。  
        ```sh
        2026-03-10 12:35:30.848 [info] Starting server microsoft/markitdown
        2026-03-10 12:35:30.848 [info] Connection state: Starting
        2026-03-10 12:35:30.849 [info] Starting server from LocalProcess extension host
        2026-03-10 12:35:30.920 [info] Connection state: Starting
        2026-03-10 12:35:30.920 [info] Connection state: Error
        spawn uvx ENOENT
        ```

        ■安装 uvx 并配置 PATH 即可解决该错误  
        1. 安装 [uvx](https://docs.astral.sh/uv/getting-started/installation/)  
        ```PowerShell
        PS > powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

        downloading uv 0.10.9 (x86_64-pc-windows-msvc)
        failed to download from https://releases.astral.sh/github/uv/releases/download/0.10.9
        trying alternative download URL
        installing to C:\Users\xxx\.local\bin
        uv.exe
        uvx.exe
        uvw.exe
        everything's installed!

        To add C:\Users\xxx\.local\bin to your PATH, either restart your shell or run:

            set Path=C:\Users\xxx\.local\bin;%Path%   (cmd)
            $env:Path = "C:\Users\xxx\.local\bin;$env:Path"   (powershell)
        ```
        ※`spawn uvx ENOENT` 的意思是“未找到 uvx 命令（不在 PATH 中）”。即使安装完成，也请重启 VS Code 以确保 PATH 生效。

        2. 确认已将 uvx 添加到 PATH  
           通过 `uvx --version` 确认能显示版本号。  
        :::

        :::info
        `Waiting for server to respond to initialize request...`  
        只是 MCP 服务器启动需要一些时间，请耐心等待。  
        :::
3. 调用 MCP 服务器  
    * 安装 MCP 服务器后，会在 `.vscode/mcp.json` 中添加相应设置，可使用该设置来调用。  
        ```.vscode/mcp.json
        {
            "servers": {
                "microsoft/markitdown": { // MCP 服务器名称
                    "type": "stdio", // MCP 服务器类型
                    "command": "uvx", // MCP 服务器期望的命令
                    "args": [ // 传递给命令的参数
                        "markitdown-mcp@0.0.1a4"
                    ],
                    "gallery": "https://api.mcp.github.com",
                    "version": "1.0.0"
                }
            },
            "inputs": []
        }
        ```
        * 从 AI 代理调用示例  
            * 以自然语言传递 MCP 服务器名称和待转换文件并执行。  
                 ![从 AI 代理调用 MCP](/img/blogs/2026/0317_use-mcp-server-on-vscode/call-mcp_ai-agent.png)

            :::info
            示例中仅指示了转换，但通过 AI 代理调用时，可以根据提示进行各种处理，例如将结果保存为文件等。  
            如果想对 MCP 的响应进行后续处理，需要在 AI 代理中定义相应提示并执行。  
            :::

            :::info
            ■未返回预期结果时  
            本次使用的 Markitdown 仅提供 `convert_to_markdown` 一个工具，但如果使用具有多个工具的 MCP 服务器且未调用预期的工具，就不会返回想要的结果。  
            若执行的工具与预期不符，请显式指定工具。  
            :::
        * 从 MCP 客户端调用示例  
            * 本地启动 MCP Inspector 并调用 `convert_to_markdown` 工具。  
                 ![从 MCP 客户端调用 MCP](/img/blogs/2026/0317_use-mcp-server-on-vscode/call-mcp_mcp-client.png)
4. 停止 MCP 服务器  
    确认完毕后，可通过以下任一方法停止：  
    * 在终端按 Ctrl+C  
    * 从 VS Code 扩展视图停止  
    * 从 `.vscode/mcp.json` 停止  

## 总结

本文实操验证了如何使用 VS Code 的 MCP 扩展启动 `microsoft/markitdown` 并将 PDF 转换为 Markdown。  
示例中使用了 Markitdown，但对于其它 MCP 服务器，只要按照 `mcp.json` 中描述的内容进行准备即可进行应用。  
如果有想要使用的 MCP 服务器，请引入它，为 AI 代理赋能吧。
