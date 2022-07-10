---
title: M1 mac の Rancher Desktop で intel のコンテナイメージを実行する
author: shigeki-shoji
date: 2022-07-04
tags: [container, "rancher-desktop"]
---

M1 mac にインストールした Rancher Desktop では Amd64 のコンテナイメージの実行ができません。

しかし、Rancher Desktop が利用している lima の [GitHub リポジトリ](https://github.com/lima-vm/lima) にはマルチアーキテクチャについての[ドキュメント](https://github.com/lima-vm/lima/blob/master/docs/multi-arch.md)があります。

ドキュメントに書かれている Fast mode なら、Amd64 (intel) のコンテナイメージの実行が可能ではないかと考え試してみました。

ここで説明されている Fast mode は QEMU を使ってエミュレーションする [tonistiigi/binfmt](https://hub.docker.com/r/tonistiigi/binfmt) をインストールします。

## インストール

Rancher Desktop の設定で Docker (moby) を使用している場合は、次のコマンドを実行します。

```shell
docker run --privileged --rm tonistiigi/binfmt --install amd64
```

Docker (moby) を使っていない場合は、次のコマンドを実行します。

```shell
sudo nerdctl run --privileged --rm tonistiigi/binfmt --install amd64
```

:::info
kubectl を使う場合は、次のコマンドを実行してインストールします。

```shell
sudo kubectl run binfmt --privileged=true --rm=true -i -t --image=tonistiigi/binfmt -- --install amd64
```
:::

### 実行

Amd64 の Ubuntu を実行してみましょう。Docker を使用していない場合は、`docker` を `sudo nerdctl` に置き換えてください。

```shell
docker run --platform linux/amd64 -it --rm ubuntu
```

Amd64 のコンテナイメージが動いていることを確認するため、次のコマンドを実行します。

```shell
uname -m
```

`x86_64` と表示されます。

:::info
kubectl を使う場合は次のようにダイジェストを使って実行します。

```shell
sudo kubectl run ubuntu --rm=true -i -t --image=ubuntu@sha256:bace9fb0d5923a675c894d5c815da75ffe35e24970166a48a4460a48ae6e0d19
```
:::

## アンインストール

マルチアーキテクチャサポートをアンインストールしたい場合は、次のコマンドを実行します。Docker を使用していない場合は、`docker` を `sudo nerdctl` に置き換えてください。

```shell
docker run --privileged --rm tonistiigi/binfmt --uninstall qemu-x86_64
```

:::info
kubectl を使う場合は、次のコマンドを実行してアンインストールします。

```shell
sudo kubectl run binfmt --privileged=true --rm=true -i -t --image=tonistiigi/binfmt -- --uninstall qemu-x86_64
```
:::

## まとめ

Arm64 で実行されている仮想 Linux (lima) 上で QEMU を使って実行するため、結局のところ動作しないイメージが多くあります。例えば、筆者は `openpolicyagent/opa:latest-envoy` の実行には成功しましたが、`jboss/keycloak` を実行しようとするとソケットを作るところでエラーが発生して正常に起動しませんでした。この方法で実行可能なイメージはかなり限定されるようです。

ここで説明した方法は、Arm64 の Raspberry Pi にも適用できます。

WWDC 2022 の「[Create macOS or Linux virtual machines](https://developer.apple.com/videos/play/wwdc2022/10002/)」で紹介された Rosetta 2 を搭載した macOS がリリースされると、Windows Subsystem for Linux のような手軽さで Linux を実行できるようになるため、コンテナ実行環境が大きく改善されるのではと期待を持っています。

## 参考

- [AppleがmacOSの仮想化機能を拡張し、Linuxバイナリ向けのRosettaを導入](https://www.infoq.com/jp/news/2022/06/apple-virtualization-framework/)
