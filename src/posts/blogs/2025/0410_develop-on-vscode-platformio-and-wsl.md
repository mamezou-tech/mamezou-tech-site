---
title: 組み込み開発環境をWSLに入れてしまおう！（VSCode＋PlatformIO＋WSL編)
author: shuichi-takatsu
date: 2025-04-10
tags: [arduino, platformio, wsl, vscode]
image: true
---

これまで以下の記事で [VSCode](https://code.visualstudio.com/) と [PlatformIO](https://platformio.org/) を使った組み込みソフトウェア開発を紹介してきました。  
- [ESP32開発ボードをESP-PROGとPlatformIOを使ってデバッグする](/blogs/2024/01/03/esp32-debug-by-esp-prog/)
- [Raspberry Pi PicoをRaspberry Pi デバッグプローブとPlatformIOを使ってデバッグする](/blogs/2024/01/07/raspberry-pi-pico-debug-by-debug-probe/)
- [STM32マイコンボード（STM32F103C8T6）をST-Link V2互換品とPlatformIOを使ってデバッグする](/blogs/2024/01/29/stm32-debug-by-st-link/)
- [みんな大好きVSCodeと組み込みソフトウェア開発環境PlatformIOでリモート開発をしてみる（Arduino編）](/blogs/2025/04/08/remote-develop-on-platformio/)

さて、今日のお題は「WSL（Ubuntu）に、PlatformIO を入れて 組み込みソフトウェア開発環境 を作ってみよう」です。  
最終的な構築イメージは以下のようになると考えています。  
![](https://gyazo.com/2ff3d4c2bd86b63730015cd1f5f94aa9.png)

あらかじめ、Windows上にVSCodeのインストールは済んでいるとします。

構築の手順は以下です。  
- Windowsに WSL を使って Ubuntu24.04 を導入する
- VSCodeに拡張機能（WSL または Remote Development）をインストールする
- VSCode で WSL に接続する
- WSL 上に PlatformIO をインストールする
- WSL から USB を認識させる（Usbipd-WIN を使用）
- WSL（上のPlatformIO）から、プログラムを Arduino にアップロードする

では、早速実施してきましょう。

## WSL(Ubuntu)の準備

WSL（Windows Subsystem for Linux）とは、Windows上でLinux環境を実行できる機能です。  
WSLを使えばWindows上に簡単にLinux環境が用意できます。  

WSLを使ってWindows上にLinux（Ubuntu）インストールする手順については[こちらの記事](/blogs/2023/09/09/docker_ubuntu_on_wsl2/)で詳しく書いてあります。  
ただし今回は Docker まで入れる必要はありません。  

## VSCodeに拡張機能「WSL」または「Remote Development」をインストールする

ソフトウェア開発自体は Windows上にインストールしてある VSCode 上で行います。  
VSCode から WSL につなぐために 拡張機能「WSL」を使用します。  
![](https://gyazo.com/a384a1691ba88f91263fa35af843456c.png)

今後、SSH接続やDockerコンテナ上での開発もする場合は、以下の拡張機能「Remote Development」をインストールしておいた方が良いでしょう。
![](https://gyazo.com/602be6ac50015f5acdf6d00508ffdbf8.png)  

「Remote Development」拡張機能をインストールすると、以下の4つの拡張機能が同時にインストールされます。
- WSL（今回の記事で使用する拡張機能）
- Remote - SSH
- Dev Containers
- Remote - Tunnels

拡張機能がインストールされると、VSCodeにの左側ペインに「リモートエクスプローラー」が追加されます。  
![](https://gyazo.com/ed804fad4963f3b399b7d55ae0502b74.png)

## VSCode で WSL に接続する

VSCodeの左下の「リモートウィンドウを開きます」をクリックして「WSLへの接続」を選択します。  
![](https://gyazo.com/01afc6789bf1dcb88db17ad782a3e5b4.png)

接続が完了すると、VSCodeの左下の表示が以下のように変わります。（接続先 WSL が Ubuntu24.04の場合）  
![](https://gyazo.com/7482344d2a0c5dbd229a3c8fba63486e.png)

## WSL 上に PlatformIO をインストールする。

PlatformIOのインストール先が WSLであろうと、ローカル環境であろうと、PlatformIOのインストール方法は同じです。  
VSCodeでWSLに接続した状態<font color="#ff0000">（★ここ重要）</font>で、VSCodeの拡張機能「PlatformIO IDE」をインストールします。  
![](https://gyazo.com/a55bc79cf369a4341f05f147c95168d9.png)

PlatformIO が正しく WSL側にインストールされると、拡張機能のアイコンの右下に インストール先がリモート側であることを示すマークがつきます。  
また、拡張機能が有効である環境が WSLの何の環境であるかが表示されます。  
![](https://gyazo.com/dd1365870e3ede5eb666f00bf23edfa0.png)

## WSL から USB を認識させる

さて、ここで１つ課題にぶち当たります。  
ArduinoマイコンをホストPCに接続して、USB-COMポート経由でプログラムのアップロードを行うのですが、今回は開発環境が WSL 上の Ubuntu にあります。

「どうやって WSL（Ubuntu）にホストPC上のUSBを認識させるか？」

VirtualBoxとかの仮想環境だったら、設定すればUSBデバイスを認識させることはできると思いますが、いまさら WSLを諦めて、他の環境を導入したくありません。  
どうにかして、USB-COMポートを WSL（Ubuntu）に認識させることができないか？  
色々と探したいたら、マイクロソフトのサイトで [このような情報](https://learn.microsoft.com/ja-jp/windows/wsl/connect-usb) を見つけました。
このサイトで紹介されている [usbipd-win](https://github.com/dorssel/usbipd-win/releases) を使えば課題を解決できそうです。  
上記のサイトから最新版をダウンロードして、ホストPCにインストールします。  

アプリをインストールした後、以下のコマンドで USBデバイス一覧 を表示します。
```shell
usbipd list
```

私の環境では以下のUSBデバイス一覧が表示されました。  
![](https://gyazo.com/d07156cf77a4e1961331a3869d9ac8e6.png)

ホストPCに Arduinoマイコン を接続してから、再度USBデバイス一覧を取得します。  
すると以下のようにデバイスが一つ増えました。  
どうやら、このBUSID「3-2」ってやつが、Arduinoマイコンを接続したときに作成された USBデバイス のようです。  
![](https://gyazo.com/8a5aa3c7ddcc2047ce91230e2a94aefd.png)

では、この BUSID が示す USBデバイス を WSL から利用できるように共有（バインド）します。  
Powershellかコマンドプロンプトを管理者権限で起動して、以下のコマンドを実行します。  
（BUSID は各自の環境にあわせて置き換えてください）

```shell
usbipd bind --busid 3-2
```

すると、STATEのところが「Shared」に変化し、共有されていることがわかります。  
![](https://gyazo.com/6639d2a430f85b0dbf3a675453187543.png)

ただし、この状態ではまだ WSL からUSBデバイスを利用できません。  
利用するためには割り当て（アタッチ）が必要です。  
USBデバイス を WSL に割り当てていきます。  
以下のコマンドを実行します。  

```shell
usbipd attach --wsl --busid 3-2
```
以下のログが出力されました。  
![](https://gyazo.com/3cc79cca0c7f5cef3009f5d71a1d4fe0.png)

USBデバイス一覧で確認すると STATE が「Attached」に変化していることがわかります。  
![](https://gyazo.com/c93e766ca4ae351b214fe7a9fa0b8f2e.png)

ちなみに 割り当て解除コマンドは以下です。  
```shell
usbipd detach --busid <busid>
```

また、共有解除コマンドは以下です。   
```shell
usbipd unbind --busid <busid>
```
## 99-platformio-udev.rules 設定

また、LinuxでPlatformIOを使う場合は、[以前の記事](/blogs/2025/04/08/remote-develop-on-platformio/#99-platformio-udevrules-設定（raspberry-pi側のみ必要）)で紹介した「99-platformio-udev.rules 設定」が必要になりますので、WSL上のUbuntuにて、設定を実施します。
（上で紹介した記事では Rasbian（Raspberry Pi）を対象にしてましたけど、Linux系なので同じ手順で実施して大丈夫です）

## WSL上からプログラムのアップロード

これでやっとプログラムの開発＆アップロードができる環境が整いました。  
今にして思えば、PlatformIOの設定よりも、USBデバイス設定の方が色々と面倒だったような気がしないでもありません。  

Arduinoマイコン にアップロードするプログラムには、いつもの「Lチカプログラム」を使用します。  
プログラムは[こちら](/blogs/2025/04/08/remote-develop-on-platformio/#l%E3%83%81%E3%82%AB%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%A0%E3%82%92%E7%94%A8%E6%84%8F%EF%BC%88%E3%83%9B%E3%82%B9%E3%83%88%E5%81%B4%EF%BC%89)と同じです。

アップロードボタンをクリックします。
![](https://gyazo.com/4ee0f74e68b35917e6c774e53ca638cf.png)

アップロード後に以下のようにログが出力され、ArduinoマイコンのLEDが1秒間隔でチカチカと点滅していたら、アップロード成功です。  
![](https://gyazo.com/fe1dee58e393e9edd6c537c0491bfd81.png)

## おまけ（GUIでUSB操作）

USBの共有や割り当てを、コマンドラインからポチポチと実施するのは面倒だと感じるあなたに、GUIツールをご紹介します。  
[こちらのツール](https://github.com/nickbeth/wsl-usb-manager)をインストールすると、GUIでUSBの共有、割り当てなどの操作ができます。

操作画面はこんな感じです。  
![](https://gyazo.com/3fc13d90cb9bfb7dd5cb3a52ea9ab1b2.png)

## まとめ

VSCode＋WSL＋PlatformIO だけですべてを完結したかったのですが、USBデバイスの操作をするために、一部ではありますが Windowsにアプリのインストールが必要になってしまいました。  
ただ、usbipd-win はマイクロソフトのサイトでも紹介されているアプリので、そこは取り敢えずは良しとしましょう。  
これでホストPCを汚さずに WSL上のUbuntu で組み込みソフトウェアを開発していく環境ができました。  
今後も いろいろな組み込みデバイスの開発環境を紹介していきたいと思います。    

<style>
img {
    border: 1px gray solid;
}
</style>
