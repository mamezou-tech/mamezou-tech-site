---
title: Windows への Docker CLI のインストール 
author: shigeki-shoji
date: 2021-12-27
---

Docker は背後で Docker デーモンが実行されて、Docker コマンドは Unix ドメインソケット (Linux や macOS の場合) または tcp ソケットで Docker デーモンと通信します。

Linux にインストールした Docker デーモンは設定により Unix ドメインではなく tcp で外部マシンからのアクセスも可能にすることができます。これは、Windows Subsystem for Linux 2 にインストールした Docker デーモンの場合も同様です。

この記事では、ローカルの WSL2 またはリモートの Amazon Linux 2 などで動作している Docker デーモンにリモートで接続して、Docker を利用するために、Windows 環境に Docker クライアントの Docker CLI をインストールする手順を説明します。また、Docker デーモンへのアクセスには暗号化されていない tcp/2375 を使用する場合について記述しています。

# Windows Package Manager のインストール

Windows のパッケージマネージャの [Chocolatey](https://chocolatey.org/) を最初にインストールします。

Power Shell を管理者権限で起動して、次のコマンドを実行します。

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

# Docker CLI のインストール

Docker CLI をインストールするため、次のコマンドを実行します。

```powershell
choco install docker
```

# 環境変数の設定

Docker デーモンを WSL2 にインストールし公開している場合は、環境変数 `DOCKER_HOST` を次のように設定します。

コマンドプロンプトの場合
```shell
set DOCKER_HOST=tcp://localhost:2375
```

PowerShellの場合
```powershell
$Env:DOCKER_HOST="tcp://localhost:2375"
```

リモートサーバで公開している場合は Linux の Docker デーモンのホストまたは IP アドレス (例では 192.168.1.3) を環境変数 `DOCKER_HOST` に設定します。

コマンドプロンプトの場合
```shell
set DOCKER_HOST=tcp://192.168.1.3:2375
```

PowerShellの場合
```powershell
$Env:DOCKER_HOST="tcp://192.168.1.3:2375"
```

# 確認

以下のコマンドの実行が成功すれば、リモートの Docker デーモンへの接続できています。

```powershell
docker run -it --rm hello-world
```
