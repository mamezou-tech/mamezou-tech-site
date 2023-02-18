---
title: コンテナ内から Rancher Desktop のホストに接続する方法 
author: shigeki-shoji
date: 2022-06-08
tags: [k8s, container, "rancher-desktop"]
---

[庄司](https://github.com/edward-mamezou)です。

[Rancher Desktop](https://rancherdesktop.io/) で実行しているコンテナ内からホストにアクセスしたくなる場合があります。

コンテナはそれぞれ固有のIPアドレスを持っています。コンテナをグルーピングして特定のコンテナ間でセキュアな通信もできます。これを応用して[サイドカーパターン](https://azure.microsoft.com/ja-jp/resources/designing-distributed-systems/)などが実現できますが、逆にいうと、コンテナからホストにアクセスしたいと考えて `localhost` を指定してもそれは単にコンテナ自身をしているということになります。

[Docker Desktop](https://docs.docker.com/) では、`host.docker.internal` を指定することでホストにアクセスできます。

結論から書くと、Rancher Desktop Version 1.3.0 でも `host.docker.internal` を使用できます。そして、さらにいくつかのホスト名が追加されています。

Windows の場合。

- `host.rancher-desktop.internal`

macOS の場合。

- `host.rancher-desktop.internal`
- `host.lima.internal`

macOS で [lima](https://github.com/lima-vm/lima) を使用している場合は、`host.lima.internal` だけが有効で Rancher Desktop は Linux VM に lima を使用していますが、これに加えて `host.docker.internal` と `host.rancher-desktop.internal` を加えたようです。

## Windows

Windows 10 以降では OpenSSH サーバーをオプション機能で有効にできます。

コンテナから、この OpenSSH サーバーにアクセスしてみます。イメージは ssh クライアントが含まれていると便利なので、ここでは maven を使います。

```shell
docker run -it --rm maven bash
```

コンテナからホストにアクセスしてみます。ホスト名は `host.rancher-desktop.internal` も使えます。

```shell
ssh USER@host.docker.internal
```

## macOS

macOS では「システム環境設定...」、「共有」、「リモートログイン」を有効にして ssh サーバー機能を有効にできます。

Windows の時と同様に maven のイメージを利用します。

```shell
docker run -it --rm maven bash
```

コンテナからホストにアクセスしてみます。ホスト名は `host.rancher-desktop.internal`、`host.lima.internal` も使えます。

```shell
ssh USER@host.docker.internal
```

## まとめ

コンテナが、それぞれ IP アドレスを持っていることがクラウドネイティブなアプリケーションでコンテナ利用を促進している重要な要因の1つです。しかし、コンテナからホストにアクセスしたい場合もあります。

先日投稿した「[Windows、macOS で sshfs を使用する](https://developer.mamezou-tech.com/blogs/2022/05/17/sshfs/)」の中で、macOS で lima や Rancher Desktop を使用する場合、コンテナにマウントできるディレクトリの制約があることを説明しました。

このような環境の場合でも、次のように sshfs をコンテナにインストールすればホストの任意のディレクトリのマウントが可能になります。

```shell
docker run -it --rm --privileged ubuntu
```

```shell
apt update
apt install sshfs -y
mkdir /build
sshfs USER@host.docker.internal:/workspace /build
```

## 参考

- [セキュリティソフト ESET を利用している環境で Rancher Desktop (lima) を使う](https://developer.mamezou-tech.com/blogs/2022/06/02/lime-with-eset/)
- [Windows、macOS で sshfs を使用する](https://developer.mamezou-tech.com/blogs/2022/05/17/sshfs/)
- [Rancher Desktop 紹介](https://developer.mamezou-tech.com/blogs/2022/01/29/rancher-desktop/)
- [lima 紹介](https://developer.mamezou-tech.com/blogs/2022/01/21/lima/)
 