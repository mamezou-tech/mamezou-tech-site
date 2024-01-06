---
title: USB/IPを使ってWindowsのUSBデバイスをLinuxで使用する
author: shigeki-shoji
date: 2024-01-09
tags: [USBIP]
---

こんにちは、[庄司](https://github.com/edward-mamezou)です。

Windows をホストとして Linux 環境を稼働したい場合 Windows Subsystem for Linux (WSL) の登場でとても便利になりました。標準機能を使う場合では、もう1つ Hyper-V を使う方法もあります。筆者は Windows にログインしていなくても起動できる Linux 環境 (Ubuntu 22.04.3 LTS) が欲しくて Hyper-V を使って構築しています。そして、この Ubuntu には "amazon-ssm-agent" をインストールして、[AWS System Manager](https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/what-is-systems-manager.html) でモニタリングやアップデートできるようにしています。

PC に接続された USB デバイスを利用するためには、WSL、Hyper-V どちらの場合も Microsoft のドキュメント「[USB デバイスを接続する](https://learn.microsoft.com/ja-jp/windows/wsl/connect-usb)」に紹介されている方法を使って接続できます。この記事では WSL 環境で使用するケースが記述されていますが、ここでは、Hyper-V 上の Ubuntu 22.04.3 LTS で利用する方法を紹介します。

## Windows 側の準備

「[USB デバイスを接続する](https://learn.microsoft.com/ja-jp/windows/wsl/connect-usb)」に書かれた手順に従って、Windows に [USBIPD-WIN プロジェクト](https://github.com/dorssel/usbipd-win)をインストールします。

共有 (share) する USB デバイスを確認しましょう。管理者として PowerShell を実行します。

```powershell
usbipd list
```

接続されている USB デバイスの BUSID やデバイス名、状態が表示されます。
次にデバイスを共有するために次のコマンドを実行します。

```powershell
usbipd bind -b 共有するデバイスのBUSID
```

再度 `usbipd list` を実行すると、指定したデバイスの状態が "Shared" に変わっていることが確認できます。

共有をやめたい場合は、`usbipd unbind -b デバイスのBUSID` を実行します。

:::info:例

筆者環境で実行した例です。

```text
> usbipd list
Connected:
BUSID  VID:PID    DEVICE                                                        STATE
1-17   0411:01f0  USB 大容量記憶装置                                            Not shared

> usbipd bind -b 1-17

> usbipd list
Connected:
BUSID  VID:PID    DEVICE                                                        STATE
1-17   0411:01f0  USB 大容量記憶装置                                            Shared
```
:::

## Ubuntu 側

Windows で共有されたデバイスをアタッチ (attach) します。

```shell
sudo modprobe vhci-hcd
sudo usbip attach -r WindowsのIPアドレス -b デバイスのBUSID
```

:::info:筆者の場合
筆者の環境の場合、usbip を実行するためにいくつか準備が必要でした。そして、前述のドキュメント通りに進めてもうまくいかなかったため、筆者が行った手順を紹介します。

```shell
sudo apt install linux-tools-6.2.0-39-generic hwdata
sudo update-alternatives --install /usr/local/bin/usbip usbip /usr/lib/linux-tools/6.2.0-39-generic 20
```
:::

デバイスをデタッチ (detach) したい場合は、Windows 側で `usbipd detach -b デバイスのBUSID` を実行するか、次の手順を実行します。

### ポートの確認

```shell
usbip port
```

### デタッチ

```shell
usbip detach -p 確認したポート
```

:::info:例

筆者環境で実行した例です。

アタッチすると、/dev/sdb が認識され、デタッチすると /dev/sdb がなくなることで USB-HDD を認識していることが確認できます。

```text
$ sudo ls /dev/sd*
/dev/sda  /dev/sda1  /dev/sda2  /dev/sda3

$ sudo usbip attach -r lachesis.local -b 1-17

$ sudo ls /dev/sd*
/dev/sda  /dev/sda1  /dev/sda2  /dev/sda3  /dev/sdb  /dev/sdb1

$ sudo usbip port
Imported USB devices
====================
Port 08: <Port in Use> at Super Speed(5000Mbps)
       BUFFALO INC. (formerly MelCo., Inc.) : unknown product (0411:01f0)
       2-1 -> usbip://lachesis.local:3240/1-17
           -> remote bus/dev 001/017

$ sudo usbip detach -p 8
usbip: info: Port 8 is now detached!

$ sudo ls /dev/sd*
/dev/sda  /dev/sda1  /dev/sda2  /dev/sda3
```

著者は、iTunes を Windows にインストールしているため、IP アドレスの代わりに Bonjour つまり dns-sd を使って Windows ホスト (lachesis.local) を指定しています。

アタッチした時、`lsusb` コマンドでも確認できます。

```text
$ sudo lsusb
Bus 002 Device 004: ID 0411:01f0 BUFFALO INC. (formerly MelCo., Inc.) HD-LBU3
Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
```
:::

## USB/IP について

USB/IP は奈良先端科学技術大学院大学 ([NAIST](https://www.naist.jp/)) で開発され、その成果が Linux 2.6.38 のカーネルにマージされたものだそうです。以来 Linux カーネルに入っているため信頼性は高いと考えられます。

## 性能

Windows PC に USB 接続の外付け HDD を接続して、同 PC の Ubuntu でそれをマウントして使用してみました。特に問題なく利用できています。

Wifi 経由で Raspberry Pi に Windows 上の USB-HDD デバイスを接続した場合はさすがに不安定になりました。不安定あるいは低品質のネットワーク経由では問題がありそうです。

## おわりに

この記事では、Windows PC に接続した USB デバイスの共有を説明しました。Windows - Linux だけでなく、Raspberry Pi のような機器も使った Linux - Linux、あるいは、この記事とは逆の Linux に接続した USB デバイスを Windows で利用もできます。

## 参考

- [USB Device Sharing over IP Network](https://usbip.sourceforge.net/old/index.html)
