---
title: USB/IPを活用したキーボードとマウスの切替器
author: shigeki-shoji
date: 2024-07-10
tags: [USBIP]
image: true
---

こんにちは、[庄司](https://github.com/edward-mamezou)です。

リモートワークをする機会が増えるとともに、複数台のPCを利用する機会もまた増えました。複数台のPCを利用する時の課題はキーボードやマウスをそれぞれの台数分用意するかどうかです。使い慣れたキーボードとマウス１セットを複数台のPCで使えるようにしたいと思う方は多いのではないでしょうか。

この課題に以前紹介したUSB/IPが利用できるのではないかと考えて PoC してみました。構成図は次のとおりです。

![構成図](/img/blogs/2024/keyboard-mouse-switch/diagram.png)

## USB/IPサーバ

キーボードとマウスのサーバに Raspberry Pi を利用します。

```text
sudo apt-get install -y usbip
```

/etc/modules-load.d/modules.conf に次の3行を追記します。

```text
usbip-core
vhci-hcd
usbip-host
```

一度 Raspberry Pi を再起動して、追記したモジュールを読み込ませます。さらに、起動時に自動的に `usbipd -D` を実行する設定にすると便利でしょう。

キーボードとマウスを bind して Windows PC で使えるようにします。まず、接続したデバイスの busid を確認しましょう。

```text
sudo usbip list -l
```

筆者の環境のレスポンスは次のとおりです。

```text
 - busid 1-1.2 (0411:01ea)
   BUFFALO INC. (formerly MelCo., Inc.) : SATA Bridge (0411:01ea)

 - busid 1-1.3 (413c:301a)
   Dell Computer Corp. : Dell MS116 Optical Mouse (413c:301a)

 - busid 1-1.4 (413c:2113)
   Dell Computer Corp. : KB216 Wired Keyboard (413c:2113)
```

キーボード (1-1.4) とマウス (1-1.3) の busid がわかったので、bind します。

```text
sudo usbip bind -b 1-1.3
sudo usbip bind -b 1-1.4
```

bind した一覧は次のコマンドで確認できます。

```text
sudo usbip list -r localhost
```

## Windows PC

以前公開した USB/IP を紹介した記事「[USB/IPを使ってWindowsのUSBデバイスをLinuxで使用する](/blogs/2024/01/09/usbip/)」は、Windows PC に接続された USB デバイスを Linux で利用する方法を説明しました。

この記事は Linux に接続された USB デバイスを Windows PC で利用する方法を説明します。その前にいくつか注意事項があります。

- BIOS の設定でセキュアブートを無効にする
- Windows OS をテストモードにする

セキュリティレベルを下げる必要があるので、例えば会社等から貸与された PC で試すのはやめた方がいいでしょう。Windows が USB/IP クライアントを正式サポートする日を気長に待ちましょう。

### セキュアブートの無効化

Windows で msinfo32 あるいは システム情報 を実行すると「システムの要約」のところに「セキュア ブートの状態」があります。これが「有効」となっている場合はお使いの PC の BIOS 設定を変更して無効にしてください。

![システム情報](/img/blogs/2024/keyboard-mouse-switch/msinfo32.png)

### Windows をテストモードにする

PowerShell を管理者権限で開き、`bcdedit.exe /set testsigning on` を実行します。変更を反映するため、PC を再起動します。

### usbip-win2 をインストール

私は、vadimgrn 氏の [usbip-win2](https://github.com/vadimgrn/usbip-win2) をインストールしました。[releases](https://github.com/vadimgrn/usbip-win2/releases) の最新の Assets から `USBip-x.x.x.x-Release.exe` をダウンロードし、実行するとインストールできます。

### usbip コマンドの実行

筆者が試した Raspberry Pi のホスト名は `mary` です。Windows 11 等であれば mDNS をサポートしているはずなのでホスト名で bind された USB デバイスがわかります。リモートデスクトップや ssh を使用して、リモートから PowerShell を起動して確認します。

```text
usbip list -r mary
```

筆者の環境のレスポンスは次のとおりです。

```text
Exportable USB devices
======================
   1-1.4   : Dell Computer Corp. : KB216 Wired Keyboard (413c:2113)
           : /sys/devices/platform/scb/fd500000.pcie/pci0000:00/0000:00:00.0/0000:01:00.0/usb1/1-1/1-1.4
           : (Defined at Interface level) (00/00/00)

   1-1.3   : Dell Computer Corp. : Dell MS116 Optical Mouse (413c:301a)
           : /sys/devices/platform/scb/fd500000.pcie/pci0000:00/0000:00:00.0/0000:01:00.0/usb1/1-1/1-1.3
           : (Defined at Interface level) (00/00/00)
```

キーボードとマウスを使用する Windows PC で次のコマンドを実行するとデバイスに接続します。

```text
usbip attach -r mary -b 1-1.3
usbip attach -r mary -b 1-1.4
```

それぞれのコマンドの実行結果の port で detach する時に使用するポート番号が表示されます。解除するときは次のコマンドを実行します。

```text
usbip detach -p 1
usbip detach -p 2
```

解除したら、別の Windows PC で attach でき、キーボードとマウスを使用できます。

この一連のコマンドをネットワークを通じて実行するようにすれば、キーボードとマウスの切替器と同様の機能が実現できそうです。

## おわりに

Windows の USB デバイスを Linux で使用する方法については、Microsoft 社の公式ドキュメント「[USB デバイスを接続する](https://learn.microsoft.com/ja-jp/windows/wsl/connect-usb)」で説明されていますが、Windows や Linux の USB デバイスを他の Windows で使用する方法についての公式ドキュメントは無いようです。サードパーティのデバイスドライバを利用するため、現時点ではセキュアブートを無効にして、さらにテストモードを有効にしないと USB/IP を利用できません。

この記事だけに限らないのですが、あらためて、この記事により発生するいかなる損害について責任は負えないことをご理解ください。
