---
title: Tart で macOS / Linux の仮想マシンを使う
author: masahiro-kondo
date: 2024-02-12
tags: [tart]
image: true
---

## はじめに
筆者が Intel 版 MacBook を使っていた時 VirtualBox や VMware Fusion などの仮想化ソフトウェアを常用していました。M1 の MacBook に移行した当初これらのソフトウェアが対応しておらず、そのまま使わなくなってしまいました[^1]。先日 Tart という仮想化ツールで Apple Silicon Mac への仮想マシン導入が簡単にできることを知ったのでご紹介します。

[^1]: 現在では VMware Fusion は対応済み、VirtualBox も対応を進めているようです。- [VirtualboxはApple Silicon Macで動作しますか？](https://isapplesiliconready.com/jp/app/Virtualbox)

## Tart とは
[Tart](https://tart.run/) は、Apple Silicon Mac 専用の仮想化ツールセットです。Apple Silicon ネイティブな Virtualization Framework 上に実装され、macOS と Linux を高速に稼働できます。

> Tart is using Apple’s native Virtualization.Framework that was developed along with architecting the first M1 chip. This seamless integration between hardware and software ensures smooth performance without any drawbacks.

Tart の GitHub リポジトリは以下にあります。

[GitHub - cirruslabs/tart: macOS and Linux VMs on Apple Silicon to use in CI and other automations](https://github.com/cirruslabs/tart/)

Tart の VM イメージは OCI 互換のレジストリーで管理可能で、公式イメージは GitHub の Package Registry で公開されています。

[https://github.com/orgs/cirruslabs/packages](https://github.com/orgs/cirruslabs/packages)

さらに Tart を利用した CI 用ランナー、[Cirrus Runners](https://cirrus-runners.app/)も提供されています。

:::info
Tart は個人用マシンで使用する場合は無料です。サーバーのインストール数が一定数を超える組織は有償ライセンスの取得が必要です。

[Support & Licensing - Tart](https://tart.run/licensing/)

> Usage on personal computers including personal workstations is royalty-free, but organizations that exceed a certain number of server installations (100 CPU cores for Tart and/or 4 hosts for Orchard) will be required to obtain a paid license.
:::

## インストール
Quick Start を見るとおおよそ使い方がわかると思います。

[Quick Start - Tart](https://tart.run/quick-start/)

Homebrew でインストールします。

```shell
brew install cirruslabs/cli/tart
```

## macOS VM の起動
tart CLI によりマシンイメージの取得、起動、設定が可能です。

macOS Sonoma の Xcode インストール済みのイメージを取得してみます。レジストリのイメージとローカルでの名前(以下の例では sonoma-xcode)を指定します。

```shell
$ tart clone ghcr.io/cirruslabs/macos-sonoma-xcode:latest sonoma-xcode
pulling manifest...
pulling disk (54.0 GB compressed)...
0%
```

ダウンロードが始まります。54GB あるのでかなり時間がかかります。最後はこんな感じで完了します。

```
98%
pulling NVRAM...
```

VM を起動します。

```shell
tart run sonoma-xcode
```

![macOS starting](https://i.gyazo.com/e65f55495990490dff1f35e4a0446b51.png)

起動はかなり速いです。

![macOS Desktop](https://i.gyazo.com/bda53cefcf24791b1eb6944375bf8d44.png)

Xcode もちゃんと起動しました。筆者が使用しているホストマシンは macOS Ventura ですが、macOS Sonoma の VM で最新の Xcode を利用できます(筆者は Xcode Command Line Tools しか使いませんが)。

![run xcode](https://i.gyazo.com/7ce5868b47c8a20bd0d6a38e64f4922e.png)

デフォルトではメモリ8GBと心許ないので、拡張してみます。

![8GB](https://i.gyazo.com/834a164e5b9b1dd0952346f039563f92.png)

一旦 Control メニューから VM を停止します。

![stop](https://i.gyazo.com/9697645b8313da89ab0393be3a4f0f75.png)

Tart CLI で VM を指定してメモリサイズを MB 単位で設定します。

```shell
tart set sonoma-xcode --memory 16384
```

`tart run` で VM を起動し直すと無事にメモリが増えていました。

![16GB](https://i.gyazo.com/505c04ffb1880db5eb15b7e9ce96b22d.png)

## Ubuntu VM の起動

Ubuntu の VM イメージを取得します。

```shell
$ tart clone ghcr.io/cirruslabs/ubuntu:latest ubuntu
pulling disk (0.9 GB compressed)...
0%
```

1GB 切るぐらいなのですぐに終わりました。

デフォルトのディスクサイズが20GBなので起動前に広げておくとよいようです。

```shell
tart set ubuntu --disk-size 50
```

起動します。

```shell
tart run ubuntu
```

起動しましたが、GUI は設定されておらずコンソールでのログイン画面になります。

![Ubuntu console](https://i.gyazo.com/97cd279577a88d1c14266618af690635.png)

デフォルトのユーザー/パスワードは admin/admin です。

デスクトップ環境を使用したいので、モジュールをインストールしました。

```
sudo apt update
sudo apt install ubuntu-desktop
```

VM を起動し直すと GUI のログイン画面が表示されました。

![login gui](https://i.gyazo.com/93e4ef754b0b7de67ae3a401588e95d7.png)

ログインすると無事にデスクトップ環境が使えるようになりました。

![Ubuntu desktop](https://i.gyazo.com/1ba697bcc29f22f4928ac88bfb1e82b6.png)

数時間ほど環境構築やアプリケーションのビルドなどを行ってみましたが、サクサク動いて快適な VM 環境でした。

## 独自イメージの作成

Tart CLI で macOS の IPSW ファイル(iOS などのファームウェア形式のファイル)や Linux の ISO イメージから VM イメージを作成することも可能です。

macOS のイメージ作成例。

```shell
tart create --from-ipsw=latest sonoma-vanilla
```

:::info
上記コマンド実行時は [ipsw.me](https://ipsw.me/) から IPSW ファイルをダウンロードしてイメージを作成するようです。
:::

Linux のイメージ作成例。

```shell
tart create --linux ubuntu
tart run --disk focal-desktop-arm64.iso ubuntu
```

OCI のレジストリなら push 可能なので ECR などにイメージを push し利用時に pull 可能です。

[Managing VMs - Tart](https://tart.run/integrations/vm-management/)

Packer 用のプラグインもあり、Tart のイメージを Packer で作成・管理可能です。

[Building with Packer - Tart](https://tart.run/integrations/vm-management/#building-with-packer)

:::info
EC2 の Marketplace では AWS での利用に最適化された設定の Tart が利用できる AMI が利用可能です。 

[AWS Marketplace: Tart Virtualization for macOS](https://aws.amazon.com/marketplace/pp/prodview-qczco34wlkdws)

macOS のイメージを Packer で管理するより簡単で、パフォーマンスも良好とのことです。

[Tart is now available on AWS Marketplace - Tart](https://tart.run/blog/2023/10/06/tart-is-now-available-on-aws-marketplace/)
:::

## CI ランナー
Cirrus Runners は macOS の場合 Tart、Linux の場合は [vetu](https://github.com/cirruslabs/vetu) という仮想化技術を利用して CI ランナーを提供します。GitHub Actions や GitLab CI から利用できます。

GitHub Actions の場合は、オーガニゼーションで [Cirrus Runners](https://github.com/apps/cirrus-runners) アプリを設定すれば、あとはワークフローファイルで Cirrus Runners を指定するだけです。

```yaml
name: Tests
jobs:
  test:
    runs-on: ghcr.io/cirruslabs/macos-sonoma-xcode:latest
```

[GitHub Actions - Tart](https://tart.run/integrations/github-actions/)

macOS の場合、GitHub でホストされるランナーよりかなりお安くなるようです。

[Pricing - Cirrus Runners](https://cirrus-runners.app/pricing)

## おわりに
Tart による VM の使用感は良好でした。

今のところ macOS の VM を使う予定はないですが、検証などでホストマシンの構成を大きく変えたくない場合など、VM を手早く用意できるのは心強いです。

以前の記事「[OrbStack - macOS 専用の高速軽量なコンテナ & Linux VM 環境](/blogs/2023/06/21/orbstack/)」で紹介した OrbStack の VM はシェル環境のみのサポートでした[^2]。Tart ではデスクトップ環境も利用可能ですので Linux デスクトップアプリの動作確認に重宝しそうです。

[^2]: もちろん X サーバや VNC を導入すれば使えるとは思いますが OrbStack はコンテナの利用がメインのためそこまで頑張らないと思います。

Windows は・・実機で使いましょう[^3]。

[^3]: Intel Mac の頃は VMware Fusion で Windows を動かして Office を使ったりしてましたが、Office 365 があるので大丈夫になりました。

macOS や iOS のネイティブアプリ開発で CI/CD パイプラインを構築するケースでは Cirrus Runners はよいソリューションになりそうです。

:::info
GitHub も macOS の Actions Runner を強化しているところなので、いずれ価格も下がってくるかもしれません。

[Introducing the new, Apple silicon powered M1 macOS larger runner for GitHub Actions](https://github.blog/2023-10-02-introducing-the-new-apple-silicon-powered-m1-macos-larger-runner-for-github-actions/)
:::
