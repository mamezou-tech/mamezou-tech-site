---
title: Windows、macOS で sshfs を使用する
author: shigeki-shoji
date: 2022-05-17
---

sshfs について説明する前に、sshfs について調べるきっかけになった背景を説明します。

私は Docker Desktop の代替として [Rancher Desktop](https://rancherdesktop.io/) を使っています。macOS 上では Rancher Desktop の仮想 Linux 環境に [lima](https://github.com/lima-vm/lima) が利用されています。

Windows や macOS の場合、仮想 Linux 環境上でコンテナが動作します。
つまり docker-cli を Windows や macOS のホスト側にインストールして、Linux 環境のソケットを通じて Docker デーモンと通信するようにした場合、ホストと Linux 環境でファイルシステムの構成は異なる可能性があります。

具体例を示すと、次のような Docker コマンドを実行してもホスト側のファイルシステム (例では `/Volumes/Disk`) にコンテナからアクセスできるとは限らないということです。

```shell
docker run -it --rm -v /Volumes/Disk:/mnt ubuntu
```

そこで Rancher Desktop のベースにもなっている lima では、sshfs を使って仮想 Linux 環境にユーザのホームディレクトリ (読み取りのみ) と一時ディレクトリ (lima の場合 `/tmp/lima`、Rancher Desktop の場合 `/tmp/rancher-desktop`) をマウントして、一部のディレクトリについてはホスト側にあるパスでマウントできるようになっています。

[Rancher Desktop の FAQ](https://docs.rancherdesktop.io/faq/) には次のような記述があります。

>Q: Does file sharing work similarly to Docker Desktop? Do I have to do any additional configuration to mount volumes to VMs?
>A: Currently, the following directories are shared by default: `/Users/$USER` on macOS, `/home/$USER` on Linux, and `/tmp/rancher-desktop` on both. For Windows, all files are automatically shared via WSL2.

sshfs は ssh プロトコルを使ってリモートのファイルシステムをローカルファイルシステムにマウントします。

クラウドコンピューティングでは、ssh でサーバーのインスタンス (EC2 等) にアクセスすることがほとんどでしょう。サーバーのインスタンスとの間でファイルをアップロードやダウンロードする場合に、sshfs を使ってローカルのファイルシステムと同じ感覚で操作できると非常に便利です。

このようなことからホスト側 (Windows、macOS 等) に sshfs をインストールしてみることにしました。

# Windows の場合

## インストール

[Chocolatey](https://chocolatey.org/) を使用して、次のコマンドで [sshfs-win](https://github.com/winfsp/sshfs-win) をインストールできます。

```powershell
choco install sshfs
```

## マウント

エクスプローラーを使う場合は、パスを次のような形式で入力します。

```text
\\sshfs.r\REMOTEUSER@HOST\PATH
```

もちろん、任意のドライブ (`X:` 等) に割り当てることもできます。

# macOS の場合

## インストール

macOS の場合は、[Homebrew](https://brew.sh/) を使って、次のようにインストールできます。

```shell
brew install --cask macfuse
brew install gromgit/fuse/sshfs-mac
```

## マウント

ローカルへのマウントは次のようにコマンドを実行します。

```shell
sshfs REMOTEUSER@HOST:/PATH MOUNTPOINT
```

# 参考

- [Rancher Desktop 紹介](https://developer.mamezou-tech.com/blogs/2022/01/29/rancher-desktop/)
- [Windows への Docker CLI のインストール](https://developer.mamezou-tech.com/blogs/2021/12/27/install-dockercli-for-windows/)
