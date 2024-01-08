---
title: Raspberry Pi PicoをRaspberry Pi デバッグプローブとPlatform IOを使ってデバッグする
author: shuichi-takatsu
date: 2024-01-07
tags: [debugprobe, raspberrypipico, platformio, debug, arduinoide]
image: true
---

[前回](/blogs/2024/01/03/esp32-debug-by-esp-prog)は、ESP32開発ボードをESP-PROGとPlatform IOを使ってデバッグする方法を紹介しました。  
今回は、Raspberry Pi PicoをRaspberry Pi デバッグプローブとPlatform IOを使ってデバッグする方法を紹介したいと思います。

## Raspberry Pi Picoとは

Raspberry PiシリーズはARMプロセッサを搭載したシングルボードコンピュータです。  
最近発売された最新モデルは[モデル5](https://www.raspberrypi.com/products/raspberry-pi-5/)でしょうか。  
モデル5やモデル4はHDMI端子やUSB端子、microSDカードスロットなどを備えており、microSDカードにOSをインストールすればそのままPCとしても利用可能な高性能シングルボードコンピュータです。  

それに対して「Raspberry Pi Pico」は以下のような外観をしており、ESP32やArduino Nanoのような組み込み開発ボードに近い存在です。  

Raspberry Pi Pico外観  
（写真のものは、デバッグ端子にJSTの3ピンSHコネクタを搭載し、あらかじめピンヘッダがはんだ付けされている Hタイプです）  
![](https://gyazo.com/df32a03214f568298292dce3a0473512.png)

モデル5やモデル4のような高機能な用途には向きませんが、Raspberry Pi Pico（以降「Pico」と称す）はその分安価であり電子工作向きだと言えます。（参考：[スイッチサイエンス](https://www.switch-science.com/products/6900)）

## Raspberry Pi デバッグプローブとは

Raspberry Pi デバッグプローブ外観  
（真ん中のプラスチックケースに囲われているボードがデバッグプローブ本体です）  
![](https://gyazo.com/b30cf12de520b70709854d5e3ed25053.png)

[Amazon](https://www.amazon.co.jp/dp/B0C695JZT1/)や[スイッチサイエンス](https://www.switch-science.com/products/8708)から購入できます。（筆者はもっと安いところから購入しましたけど）

Raspberry Pi デバッグプローブ（以降「デバッグプローブ」と称す）は、前回のESP-PROGと同様にUSBシリアル変換を２ポート持つ「Raspberry Pi公式のデバッグプローブ」です。  
デバッグインターフェースとして「CMSIS-DAP」を装備しています。  
[CMSIS-DAP](https://arm-software.github.io/CMSIS_5/DAP/html/index.html)とは、JTAGエミュレータ(デバッガ)の標準的な規格のようです。  
またデバッグプローブはUARTシリアル通信ポートも持っているのでUART通信も可能です。

（左側がUARTポート、右側がCMSIS-DAPデバッグポート）  
![](https://gyazo.com/acceac27745a78582c10243ae08828b4.png)

デバッグプローブを調べてみると、デバッグプローブは「[picoprobe](https://github.com/raspberrypi/picoprobe)」というアプリケーションがベースになっており、デバッグプローブ自体がPicoで構成されているようです。  
実際に[こちらの記事](https://zenn.dev/oze/articles/7cfa65eb8904c0)ではPicoを2台並べて、一台をデバッグプローブとして使用していることがわかります。

## Raspberry Pi デバッグプローブをPC、Raspberry Pi Picoと接続する

今回使用するのはCMSIS-DAPデバッグポートのみです。  
実は、このポートのみでプログラムのアップロードとデバッグの両方が出来てしまいます。  
デバッグプローブとPicoをJSTの3ピンSHコネクタで以下のように接続し、UARTポート側はどこにも接続しません。

![](https://gyazo.com/a8ee34d17a84f2eaf0dbf2e43373b5d6.png)

その後、両方のmicroUSB端子をPC側に接続します。  
（Pico側のmicroUSBは給電のためだけに使用します。通信機能の無いケーブルでOKです）

![](https://gyazo.com/811502c428092d5f44d9e76079d16b59.png)

デバイスマネージャでCOMポートとシリアルバスデバイスを確認します。  
ちゃんと「CMSIS-DAP v2 interface」が認識されていることがわかります。

![](https://gyazo.com/6108d3501df5cf54bb6c5b9820f007d4.png)

念の為、前回も使用した「Zadig」でインターフェースを確認してみます。  
Zadigを起動し、Listを表示します。  
それぞれのインターフェースが確認できました。  
（[ESP-PROGでは同じ名称のインターフェースが表示](/blogs/2024/01/03/esp32-debug-by-esp-prog/#esp-progがデバッガとして認識されない問題)されていましたが、デバッグプローブは異なるインターフェースが表示されました）
![](https://gyazo.com/f0c35baaabef8510afc179dac8909635.png)

## Platform IOでサンプルプロジェクト作成

開発環境として、以前執筆した記事「[IoT を使ってみる（その１４：有機ELディスプレイ(OLED)SSD1306編）](/iot/internet-of-things-14/#開発環境「platform-io」)」の中で紹介した「[Platform IO](https://platformio.org/)（以降、PIOと称す）」を使っていきます。

では、Pico用のプロジェクトを作成します。  
作成したプロジェクトは以下です。  

![](https://gyazo.com/fa34688533017cfe8f1ddda69c6b503b.png)

- プロジェクト名： PICO_DEBUG-PROBE
- ボード： Raspberry Pi Pico
- フレームワーク： Arduino
- ロケーション： ＜デフォルトを使用しない！＞

（※前回同様、プロジェクトのロケーションをデフォルト以外の「c:/opt/ESP32_ESP-PROG/」に設定しました）

サンプルプログラムは「LEDを点滅させるだけ」の簡単なサンプルとしました。  
（Picoはオンボード上にプログラムで制御できるLEDを持っています）  

サンプルプログラムは以下です。  

```cpp
#include <Arduino.h>

const int T_DELAY = 1000;

// the setup function runs once when you press reset or power the board
void setup() {
  // initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);
}

// the loop function runs over and over again forever
void loop() {
  digitalWrite(LED_BUILTIN, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(T_DELAY);                    // wait for a second
  digitalWrite(LED_BUILTIN, LOW);    // turn the LED off by making the voltage LOW
  delay(T_DELAY);                    // wait for a second
}
```

## デバッグ設定（platformio.ini）

今回はデバッグプローブでデバッグを行うため、platformio.ini にいくつかオプションを追加していきます。
platformio.ini ファイルの内容を以下のようにしました。  

```ini
[env:pico]
platform = raspberrypi
board = pico
framework = arduino
upload_protocol = cmsis-dap
debug_tool = cmsis-dap
debug_init_break = tbreak setup
build_type = debug
```

platformio.ini の詳細を説明していきます。  
以下の３つの設定は基本なので今回特に変更はありません。

- platform : PIOでプロジェクト作成時、ボードに「Raspberry Pi Pico」を選択すると「raspberrypi」が設定されます。
- board : 上記と同様の操作で「pico」が設定されます。
- framework : 開発フレームワークに「Arduino」を選択したので「arduino」が設定されます。

デバッグプローブでデバッグするために追加したオプションは以下です。  

- upload_protocol : PIOからのプログラムのアップロードに「CMSIS-DAP」を指定します。（※後述しますが、なぜかPIOのuploadがうまく機能しませんでした）

今回の記事の肝と言ってもいい部分です。  

- debug_tool : 「cmsis-dap」を指定します。
- debug_init_break : デバッグ実行時に最初に停止（ブレーク）させたい関数を指定します。今回は「setup」関数で止まるように指定しました。
- build_type : ビルドオプションに「debug」を指定します。debug以外に release、testの指定ができるようです。

## デバッグ設定（Visual Studio Code）

Visual Studio Code（以降、VSCと称す）のデバッグ設定「launch.json」はPIOが出力した初期値のままを使用します。  
(＜username＞の部分は、自分のアカウントに読み替えてください)

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "platformio-debug",
            "request": "launch",
            "name": "PIO Debug",
            "executable": "c:/opt/PICO_DEBUG-PROBE/.pio/build/pico/firmware.elf",
            "projectEnvName": "pico",
            "toolchainBinDir": "C:/Users/＜username＞/.platformio/packages/toolchain-gccarmnoneeabi/bin",
            "internalConsoleOptions": "openOnSessionStart",
            "svdPath": "C:/Users/＜username＞/.platformio/platforms/raspberrypi/misc/svd/rp2040.svd",
            "preLaunchTask": {
                "type": "PlatformIO",
                "task": "Pre-Debug"
            }
        },
        {
            "type": "platformio-debug",
            "request": "launch",
            "name": "PIO Debug (skip Pre-Debug)",
            "executable": "c:/opt/PICO_DEBUG-PROBE/.pio/build/pico/firmware.elf",
            "projectEnvName": "pico",
            "toolchainBinDir": "C:/Users/＜username＞/.platformio/packages/toolchain-gccarmnoneeabi/bin",
            "internalConsoleOptions": "openOnSessionStart",
            "svdPath": "C:/Users/＜username＞/.platformio/platforms/raspberrypi/misc/svd/rp2040.svd"
        },
        {
            "type": "platformio-debug",
            "request": "launch",
            "name": "PIO Debug (without uploading)",
            "executable": "c:/opt/PICO_DEBUG-PROBE/.pio/build/pico/firmware.elf",
            "projectEnvName": "pico",
            "toolchainBinDir": "C:/Users/＜username＞/.platformio/packages/toolchain-gccarmnoneeabi/bin",
            "internalConsoleOptions": "openOnSessionStart",
            "svdPath": "C:/Users/＜username＞/.platformio/platforms/raspberrypi/misc/svd/rp2040.svd",
            "loadMode": "manual"
        }
    ]
}
```

## ビルド、アップロード、そしてデバッグ

PIOでプログラムをビルドし、Picoにアップロードします。  

ここで一つ問題が発生しました。  
ビルドは正常に終了しますが、プログラムのアップロードに失敗してしまうのです。  

![](https://gyazo.com/5b18056e42a36f2e9be215af028e98ab.png)

その後いろいろと調べましたが、どうにも解決策が見つけられません。  
OpenOCDのバージョンの不一致を疑い、バージョンを変更したりしましたが改善されませんでした。  

PIOのデバッグ「PIO Debug」はデバッグ開始時に「ビルド」「アップロード」の２つも自動的に実行してくれるようなので、とりあえず「実行とデバッグ」から「PIO Debug」を実行します。    
![](https://gyazo.com/fc1166d70218011d468f2dd6a9cf3ada.png)

プログラムのビルド、アップロードが実行され、デバッガーが起動し「Setup関数」で停止します。  
（ESP-PROGのときとは止まる位置が若干違うような気がしますが）

![](https://gyazo.com/4b568b1301f9a14b1f541a7b4e815b4f.png)

画面右下の「デバッグコンソール」上でも 8行目の「void setup()」関数内で停止していることが見て取れます。    
![](https://gyazo.com/4b5f5aef5d79811b47759d88ab1a7bea.png)

そのまま実行させると、設定したブレークポイントで停止します。  
![](https://gyazo.com/b54dd7dd9af2e2843dd1ee7233fc74ad.png)

ステップ実行も可能です。   
![](https://gyazo.com/f52ceb826ea37e8a5a5762afa4497756.png)

## Arduino IDE 2.0 からプログラムをアップロードさせてみる

PIOではプログラムのアップロードが正しく実行できませんでしたが、デバッグプローブ側が悪いのか、PIO側の設定が悪いのかが分かっていません。  
念の為、別の開発環境「[Arduino IDE 2.0](https://www.arduino.cc/en/software#future-version-of-the-arduino-ide)」からプログラムのアップロードだけ実施してみようと思います。  
（Arduino IDEのインストール方法は割愛します）  

![](https://gyazo.com/ede4545165eee306b138eca0082523e6.png)

プログラムのコードはまったく同じものを使用します。  
Arduino IDEの設定を以下のようにします。

![](https://gyazo.com/459f4eb3b1d155654fe332ea0d3df1c9.png)

- ボード : 「Raspberry Pi Pico」
- ポート : ＜使用しないので選択しなくてもよい＞
- Upload Method : Picoprobe(CMSIS-DAP)

Upload Methodに「Picoprobe(CMSIS-DAP)」を指定することで、デバッグプローブ経由でプログラムをアップロードできます。  

「書き込み」ボタンを押して、プログラムをPicoに書き込みます。  
![](https://gyazo.com/ede03506e483f1534b3b3607e1791410.png)

正常にPicoに書き込みが出来てしまいました。
（文字が赤いのでエラーっぽく見えますが、メッセージは書き込みが正常に終了したことを示しています）  
![](https://gyazo.com/006fb4f0e275a86c22a2957580b43cf8.png)

どうやらデバッグプローブは正常に働いているようです。

実は Arduino IDEもバージョン2.0以降はデバッグが出来るようになりました。  
しかし、筆者としてはコード補完などの機能が”いまいち”に思うところがあって、筆者はまだPIOを愛用しています。（PIOはというよりもVSCを）  
とりあえず、PIOでもデバッグしながらプログラムの書き込みは出来るので、当面はPIOをメインに使いつつ、プログラムのアップロードできない問題が解決できたら再度ご報告したいと思います。

## まとめ

今回、Raspberry Pi デバッグプローブを使って Raspberry Pi Pico のプログラムを VSC（Platform IO）からデバッグすることが出来ました。  

ビルドしたプログラムが正常にアップロード出来ないという問題もありましたが、一応の成果はあったと思います。
