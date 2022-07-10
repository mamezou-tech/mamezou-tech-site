---
title: Windows への Docker CLI のインストール 
author: shigeki-shoji
date: 2021-12-27
tags: [container, docker]
---

Docker は背後で Docker デーモンが実行されて、Docker コマンドは Unix ドメインソケット (Linux や macOS の場合) または tcp ソケットで Docker デーモンと通信します。

Linux にインストールした Docker デーモンは設定により Unix ドメインではなく tcp で外部マシンからのアクセスもできます。これは、Windows Subsystem for Linux 2 にインストールした Docker デーモンの場合も同様です。

この記事では、ローカルの WSL2 またはリモートの Amazon Linux 2 などで動作している Docker デーモンにリモートで接続して、Docker を利用するために、Windows 環境に Docker クライアントの Docker CLI をインストールする手順を説明します。また、Docker デーモンへのアクセスには暗号化されていない tcp/2375 を使用する場合について記述しています。

:::info
Linux 環境の Docker Engine を外部に公開する場合は、次のような `/etc/docker/daemon.json` ファイルを作成します。

```json
{
     "tls": false,
     "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"]
}
```
:::

## Windows Package Manager のインストール

Windows のパッケージマネージャの [Chocolatey](https://chocolatey.org/) を最初にインストールします。

Power Shell を管理者権限で起動して、次のコマンドを実行します。

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

## Docker CLI のインストール

Docker CLI をインストールするため、次のコマンドを実行します。

```powershell
choco install docker-cli
```

## 環境変数の設定

Docker デーモンを WSL2 にインストールし公開している場合は、環境変数 `DOCKER_HOST` を次のように設定します。

コマンドプロンプトの場合。

```shell
set DOCKER_HOST=tcp://localhost:2375
```

PowerShellの場合。

```powershell
$Env:DOCKER_HOST="tcp://localhost:2375"
```

リモートサーバで公開している場合は Linux の Docker デーモンのホストまたは IP アドレス (例では 192.168.1.3) を環境変数 `DOCKER_HOST` に設定します。

コマンドプロンプトの場合。

```shell
set DOCKER_HOST=tcp://192.168.1.3:2375
```

PowerShellの場合。

```powershell
$Env:DOCKER_HOST="tcp://192.168.1.3:2375"
```

## 確認

以下のコマンドの実行が成功すれば、リモートの Docker デーモンへの接続できています。

```powershell
docker run -it --rm hello-world
```

## 何に役立つか

Docker Engine への接続に外部から tcp を使って接続できる知識は、コンテナを利用するタイプの CI/CD を活用する場合に役立ちます。

例えば、GitLab CI/CD の中で [Docker in Docker](https://docs.gitlab.com/ee/ci/docker/using_docker_build.html#use-docker-in-docker) を使う場合は、`tcp://docker:2375` で Docker デーモンと接続されます。

`docker` の IP アドレスは `getent hosts docker` コマンド等で知ることができます。
