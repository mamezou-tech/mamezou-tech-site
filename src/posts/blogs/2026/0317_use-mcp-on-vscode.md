---
title: GitHub MCP Registryに公開されているMCPサーバーをVS Codeで動かす手順
author: masato-ubata
date: 2026-03-17
tags: [vscode, MCP, GitHub Copilot]
image: true
---

## はじめに

MCPサーバーは、エージェントやツールが呼び出せる実行可能な「サービス」を定義する仕組みです。
このページでは、VS CodeのMCP拡張からMCPサーバー（今回はMarkitdownを使用）を起動して、AIエージェント／MCPクライアントで呼び出す手順を紹介します。  

* 用語補足（この記事での使い方）
  * **MCP（Model Context Protocol）サーバー**
    エージェントに実行可能なツールを提供する仕組み。  
    エージェントはMCPサーバーの「ツール」を呼び出すことで外部処理を実行できる。
  * **Markitdown (`microsoft/markitdown`)**
    PDFやpptxをMarkdownに変換するMCPサーバー。
  * **uvx**
    Markitdownのランチャー。  
    今回検証に使うMCPサーバーが`command`として期待するツール。

## 環境

* Windows 11
* VS Code
* Markitdown@1.8.1: 動作確認に使用したMCPサーバー
* uvx@0.10.9
* Copilot: MCPサーバーの呼び出しに使用したAIエージェント
* MCP Inspector@0.21.0: MCPサーバーの呼び出しに使用したMCPクライアント

## 手順

今回はMarkitdownを使用して、動作を確認します。

1. MCPサーバーをVS Codeにインストール
    * [GitHub MCP Registry](https://github.com/mcp)からインストールする場合
      1. GitHub MCP Registryをブラウザで開いて、インストールしたいMCPのinstallボタンを押下。
        ![MCPインストール](/img/blogs/2026/0317_use-mcp-server-on-vscode/mcp-install_mcp-registry.png)

    * VS CodeのExtensionsからインストールする場合
      1. VS Code上でMCPサーバーを検索できるように設定を有効化
        ![設定を有効化](/img/blogs/2026/0317_use-mcp-server-on-vscode/mcp-install_in-vscode_enable-setting.png)

        :::info
        ■設定を無効化したい場合  
        設定を開いてチェックを外す。
        ![設定を無効化](/img/blogs/2026/0317_use-mcp-server-on-vscode/mcp-install_in-vscode_disable-setting.png)
        :::

      2. フィルタリング（`@mcp`）された状態でMCPが表示されるので、インストールしたいMCPのinstallボタンを押下。
        ![MCPインストール](/img/blogs/2026/0317_use-mcp-server-on-vscode/mcp-install_in-vscode.png)
    * MCPサーバーのインストール後、`.vscode/mcp.json`にMCPサーバーの設定が追加される。
        ```json: .vscode/mcp.json
        {
            "servers": {
                "microsoft/markitdown": { //MCPサーバー名
                    "type": "stdio", //MCPサーバーの種類
                    "command": "uvx", //MCPサーバーが期待するコマンド
                    "args": [ //コマンドに渡す引数
                        "markitdown-mcp@0.0.1a4"
                    ],
                    "gallery": "https://api.mcp.github.com",
                    "version": "1.0.0"
                }
            },
            "inputs": []
        }
        ```
2. MCPサーバーを起動
    インストール後に作成された`.vscode/mcp.json`の設定を読み込んで、ローカルプロセスを起動します。

    * VS CodeのExtensionsから起動
        ![vscodeからMCP起動](/img/blogs/2026/0317_use-mcp-server-on-vscode/mcp-start_vscode.png)
    * `.vscode/mcp.json`から起動
        ![jsonからMCP起動](/img/blogs/2026/0317_use-mcp-server-on-vscode/mcp-start_json.png)
    * 起動例
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
        # 以下、略
        ```

        :::info
        ■uvxのインストールを促すコネクションエラー
        今回、検証用に使ったMarkitdownはPythonベースでコマンドにuvxを使用します。  
        そのため、uvxにパスが通ってない状態だと下記のコネクションエラーが発生します。
        ```sh
        2026-03-10 12:35:30.848 [info] Starting server microsoft/markitdown
        2026-03-10 12:35:30.848 [info] Connection state: Starting
        2026-03-10 12:35:30.849 [info] Starting server from LocalProcess extension host
        2026-03-10 12:35:30.920 [info] Connection state: Starting
        2026-03-10 12:35:30.920 [info] Connection state: Error
        spawn uvx ENOENT
        ```

        ■uvxをインストールしてパスを通せばエラーは解消します
        1. [uvx](https://docs.astral.sh/uv/getting-started/installation/)をインストール
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
        ※`spawn uvx ENOENT` は「uvx コマンド自体が見つからない（PATHにない）」という意味です。インストール済みでも、VS Codeを再起動してPATHが反映されているか確認してください。

        2. uvxへパスが通ってることを確認
            `uvx --version`でバージョンが表示されることを確認します。
        :::

        :::info
        `Waiting for server to respond to initialize request...`
        MCPサーバーの起動に時間がかかっているだけなので、辛抱強く待ちましょう。
        :::
3. MCPサーバーを呼び出し
    * MCPサーバーをインストールすると`.vscode/mcp.json`に設定されるので、これを使用して呼び出します。
        ```.vscode/mcp.json
        {
            "servers": {
                "microsoft/markitdown": { //MCPサーバー名
                    "type": "stdio", //MCPサーバーの種類
                    "command": "uvx", //MCPサーバーが期待するコマンド
                    "args": [ //コマンドに渡す引数
                        "markitdown-mcp@0.0.1a4"
                    ],
                    "gallery": "https://api.mcp.github.com",
                    "version": "1.0.0"
                }
            },
            "inputs": []
        }
        ```
        * AIエージェントからの呼び出し例
            * MCPサーバー名と変換対象のファイルを渡して自然言語で実行。
                 ![AIエージェントからMCP呼び出し](/img/blogs/2026/0317_use-mcp-server-on-vscode/call-mcp_ai-agent.png)

            :::info
            実行例では変換だけを指示していますが、AIエージェントから呼び出す場合、結果をファイルとして保存させるなど、プロンプト次第でさまざまな処理が可能です。  
            MCPのレスポンスを加工するなどの後続処理したい場合はAIエージェントから必要なプロンプトを定義して実行します。
            :::

            :::info
            ■期待した結果が返ってこない  
            今回使用しているMarkitdownはツールが`convert_to_markdown`しかないですが、複数のツールを持つMCPサーバーを使っている場合、期待したツールを呼び出してないと想定した結果がかえされません。  
            実行しているツールが想定と異なる場合は明示的に指定します。
            :::
        * MCPクライアントからの呼び出し例
            * MCP Inspectorをローカルで起動して`convert_to_markdown`ツールを呼び出し。
                 ![MCPクライアントからMCP呼び出し](/img/blogs/2026/0317_use-mcp-server-on-vscode/call-mcp_mcp-client.png)
4. MCPサーバーを停止
    確認が終わったら、以下のいずれかの方法で停止。
    * TerminalでCtrl+C
    * VS CodeのExtensionsから停止
    * `.vscode/mcp.json`から停止

## まとめ

VS CodeのMCP拡張で `microsoft/markitdown` を起動し、PDFをMarkdownに変換するまでを実際に確認しました。  
例としてMarkitdownを使用しましたが、他のMCPサーバーでも`mcp.json`に記述されている内容に沿って準備すれば応用できます。  
使用したいMCPサーバーがあれば導入して、AIエージェントに力を与えましょう。
