---
title: WSL上のPlaywrightの実行ブラウザを画面表示するときにハマったこと
author: kotaro-miura
date: 2024-09-10
tags:  [playwright,wsl,linux,テスト,トラブルシューティング,X_Window_System,VcXsrv]
image: true
---

# はじめに

Windows10でWSL2上にインストールされた[Playwright](https://playwright.dev/)の実行ブラウザを画面に表示(ヘッドレスモードオフ)しようとした際、最初上手くいかなかったので原因とその対処した内容をまとめます。

:::info:動作環境
OS:：Windows10(22H2)
WSL：2.2.4.0 (Ubuntu 24.04 LTS)
Playwright：1.45.3
:::

# ハマったこと

前提として、Playwrightのテストコード自体には問題がなく、ヘッドレスモードでは正常にテスト完了する状態でした。

まず以下のように、Playwrightの設定でヘッドレスモードを無効にします。

```typescript:playwright.config.ts
  use: {
    headless: false
  }
```

そしてPlaywrightのテストを実行します。

```sh
$ npx playwright test
```

すると以下のようにエラーが表示されて実行失敗してしまいました。

```sh
  Error: browserType.launch: Target page, context or browser has been closed
    Browser logs:

    ╔════════════════════════════════════════════════════════════════════════════════════════════════╗
    ║ Looks like you launched a headed browser without having a XServer running.                     ║
    ║ Set either 'headless: true' or use 'xvfb-run <your-playwright-app>' before running Playwright. ║
    ║                                                                                                ║
    ║ <3 Playwright Team                                                                             ║
    ╚════════════════════════════════════════════════════════════════════════════════════════════════╝
```

# 対処法

エラー内容は要約すると「Xサーバが起動していない状態でHeadedブラウザは起動できませんよ」という内容でした。

ですので、Windows側でXサーバを起動したいと思います。

:::alert:WSLgを有効化することでも解決します
手動でXサーバを起動しなくても、最新のWSLでは[**WSLg**](https://github.com/microsoft/wslg)というWSL上のGUIアプリをサポートする機能が標準で搭載されていて、これが有効であれば上記のような問題は起きないようです。

WSLgはWindowsとWSLとグラフィックスドライバが最新であれば、勝手に有効となるので実施できる場合は行いましょう。

私の環境の場合、WindowsとWSLは最新のものでしたが、グラフィックスドライバが古いものだったので動かなかったようです。
手動でグラフィックスドライバをアップデートして相性とかの問題で画面が動かなくなるのも怖いので、WSLgの有効化は諦めました。
:::

## X Window Systemとは

一旦話が逸れるのですが用語の解説です。

X Window Systemとは、UNIX系OSがディスプレイにGUIを表示するために標準的に利用されているウィンドウシステムです。
クライアント・サーバモデルを採用しており、実際に表示したいディスプレイが繋がっているマシンでXサーバを起動し、GUIアプリを起動している別マシンからXサーバに対してグラフィックスの描画命令をネットワーク経由で送ることができます[^aboutX]。

[^aboutX]:[X Windows Systemとは](https://www.astec-x.com/FAQ/aboutx.html)

今回は同一マシン上ですが、Windows側でXサーバを起動し、WSL側がXクライアントとしてXサーバにPlaywrightのブラウザの描画命令を出します。

## Windows側でXサーバを起動する

話を戻しまして、対応内容をまとめていきます。

Windows対応のフリーのXサーバソフトウェアとしては、[VcXsrv](https://sourceforge.net/projects/vcxsrv/)がメジャーなようなのでこれを使います。

1. まず、VcXsrvのインストーラをダウンロードして、インストールします。
  [インストーラ配布サイトリンク](https://sourceforge.net/projects/vcxsrv/)
2. VcXsrvを起動します。
3. 表示される画面で以下のように設定します。
    - Select display settings：Multiple windows
    - Display number：-1
      ![VcXsrv1](/img/blogs/2024/0910_playwright_headed_wsl/VcXsrv1.png)
    - Select how to start clients： Start no client
      ![VcXsrv2](/img/blogs/2024/0910_playwright_headed_wsl/VcXsrv2.png)
    - Extra settings：全てチェックを入れる
      ![VcXsrv3](/img/blogs/2024/0910_playwright_headed_wsl/VcXsrv3.png)
    - 完了を押す
      ![VcXsrv4](/img/blogs/2024/0910_playwright_headed_wsl/VcXsrv4.png)
    - ファイアウォール設定：接続しているネットワークプロファイルについて許可してください。
      ![VcXsrv5](/img/blogs/2024/0910_playwright_headed_wsl/VcXsrv5.png)


4. WSL上の環境変数を設定します。

以下のコマンドをWSL上で実行することで、環境変数`DISPLAY`に`{WindowsのホストIPアドレス}:0`という文字列を設定します。

```sh
export DISPLAY=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2; exit;}'):0
```

以上の設定をすることでエラーが解消されて、WLS上のPlaywrightの実行ブラウザを画面に表示できるようになりました。

:::column:DISPLAY変数に設定するアドレス
- 余談ですがWindowsのホストIPアドレスの取得は
  `ip route show | grep -i default | awk '{ print $3}'`というコマンドでも行えます。[^getIp]
- `:0`という部分の番号は、ディスプレイ番号を表しています[^address]。 VcXsrvの起動時の設定項目の「Display number」で指定できます。今回は-1と入力しおり、この時は自動で0が割り当てられています。
  VcXsrvは多重起動ができるのですが、続けて起動するたびに「Display number=-1」と指定していればディスプレイ番号も順番に0,1,2,...と割り当てられていきます。
:::

[^getIp]:[WSL を使用したネットワーク アプリケーションへのアクセス](https://learn.microsoft.com/ja-jp/windows/wsl/networking)
[^address]:アドレスについての説明: [Chapter 2 Display Functions](https://xjman.dsl.gr.jp/X11R6/X11/CH02.html)


# さいごに

今回はWSL上のPlaywrightのブラウザを画面に表示しようとした時に起きたエラーの対処として、Xサーバを起動する方法をまとめました。
同様のエラーに遭遇した方がおりましたら参考になれば幸いです。