---
title: Raspberry PiにCompanionをインストールする方法
author: shigeki-shoji
date: 2024-07-19
tags: ["リモートワーク環境"]
image: false
---

こんにちは、[庄司](https://github.com/edward-mamezou)です。

リモートワーク環境を改善しようと Elgato の [Stream Deck](https://www.elgato.com/jp/ja/p/stream-deck-mk2-black) を購入しました。この Stream Deck で Blackmagic Design の [ATEM Mini](https://www.blackmagicdesign.com/jp/products/atemmini) を操作する方法を調べたところ、Bitfocus の [Companion](https://bitfocus.io/companion) を使うと良さそうだとわかりました。

さらに調べると、[Companion Pi](https://bitfocus.io/companion-pi) が提供されていて [Raspberry Pi](https://www.raspberrypi.com/) で Stream Deck が使えそうと考えました。

この記事は、手元にある Raspberry Pi 4 (8GB) にインストールした手順を説明します。

## インストール手順

Companion で ATEM Mini を操作する場合、有線 LAN が使用されます。また Compaion Pi の実行には Node.js が必要です。Node.js のパッケージマネージャ npm は IPv6 を利用したダウンロードが失敗するバージョンがあるため、インストールの前に nmcli コマンドを使って IPv6 を無効化します。

次のコマンドで NAME を確認します。

```text
sudo nmcli c
```

私の環境では以下のような応答が得られました。UUID の列はマスクしています。

```text
NAME                UUID                                  TYPE      DEVICE 
preconfigured       xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  wifi      wlan0  
lo                  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  loopback  lo     
Wired connection 1  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  ethernet  eth0 
```

インターネットに接続しているデバイスの NAME を使って次のコマンドで IPv6 を無効化して、再起動します。ここでは preconfigured を無効化する場合の例を示します。

```text
sudo nmcli c mod "preconfigured" ipv6.method "disabled"
sudo reboot
```

最新の LTS バージョンの Node.js と yarn を次のコマンドでインストールします。

```text
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install npm nodejs -y
sudo npm i n -g
sudo n lts
sudo npm i yarn -g
```

以降は、Companion Pi の [Manual Install](https://user.bitfocus.io/docs/companion-pi) に書かれた手順でインストールします。

最初に root ユーザとしてコマンドを実行できるようにします。

```text
sudo -s
```

公式のドキュメントにある、次のコマンドを実行します。

```text
curl https://raw.githubusercontent.com/bitfocus/companion-pi/main/install.sh | bash
```

インストールに成功すると、次のように表示されます。

```text
Companion is installed!
You can start it with "sudo systemctl start companion" or "sudo companion-update"
```

応答メッセージにあるとおり `systemctl start companion` で起動できます。Stream Deck を Raspberry Pi の USB ポートに接続し、ブラウザから `http://raspberrypi.local:8000` (Raspberry Pi のホスト名が raspberrypi の場合です。ホスト名はご使用の環境に合わせて置換してください) にアクセスすると Companion にアクセスする画面が開きます。設定すると Stream Deck で ATEM Mini を操作できるようになります。

![companion](/img/blogs/2024/0719_companion.jpg)

## おわりに

USB を利用するガジェットが増え、Stream Deck をどうつなごうかと悩んでいたので、Raspberry Pi を使った LAN 経由で ATEM Mini 等を制御する Component が非常に気に入っています。まだ導入したばかりで、より便利にする方法を探求していきたいと思います。
