---
title: ESP32開発ボードをESP-PROGとPlatform IOを使ってデバッグする
author: shuichi-takatsu
date: 2024-01-03
tags: [esp-prog, esp32, platformio, debug]
---

お手軽なIoTデバイス「ESP32開発ボード（以降、ESP32と称す）」を使ってプログラミングをしていると  
「あー、やっぱり Visual Studio Code（以降、VSCと称す）でデバッグしたいなー」  
って思うのは筆者だけでは無いと思います。  

これまでのプログラムのデバッグでは、プログラム中にprint文を書いて、確認したい内容をCOMポートに出力したり、OLEDなどの外部表示器に出力してデバッグしていました。
しかし内部変数などの細かい部分の確認をするときに毎回内部変数を出力するprint文を追加するのは手間がかかり、なにより面倒な作業でした。

今回は、そんな面倒事を一気に解消するESP専用JTAGデバッガ「ESP-PROG（Espressif社純正JTAGボード）」を紹介したいと思います。

## ESP-PROGとは

ESP-PROG外観  
![](https://gyazo.com/a66550766c0acdb60b0b668ef8ef28c2.png)

[Amazon](https://www.amazon.co.jp/dp/B0CNGS4J4V/)や[スイッチサイエンス](https://www.switch-science.com/products/7986)から購入できます。（筆者はもっと安いところから購入しましたけど）

中身は「FT2232HL（デュアルタイプのUSBシリアル）」が載ったボードみたいです。  
この機器はUSBシリアルが2ポート使えますが、今回はデバッグ用の1ポートだけを使用し、プログラムの書き込みにはESP32本体が持つUSBポートを使用します。  
ESP-PROGの残りのUSBシリアルポートを使ったプログラムの書き込みは、また別の機会に紹介したいと思います。  

開発対象には 30ピンのESP32（ESP32 Dev Module）を使用します。  
（開発対象の選定理由は、ジャンパーピンを引き出す電源ボードが30ピンのものしか持ち合わせがなかったためです。ブレッドボードの使用も考えましたが、ブレッドボードの使い勝手については、[別の記事](/iot/internet-of-things-14/)を参照ください）

ESP32と電源ボード  
![](https://gyazo.com/135b88bece0a3f32c3793675be30ec49.png)  
ドッキングしてセットアップします。  
![](https://gyazo.com/7fdb30dae9b6cd162c2298402b750636.png)

ESP-PROGのピン配置は [こちらのURL](https://www.circuitstate.com/pinouts/espressif-esp-prog-esp32-jtag-debug-probe-pinout-diagram/) にあります。  
ESP32との接続にはESP-PROGの「JTAG COM n」と書かれたコネクタ部分のピンを使用します。  
（ESP-PROGの電源電圧を3.3Vと5Vを切り替えるジャンパーピンは”5V”側に設定します）  
![](https://gyazo.com/b2305021b977d18736957a3c6fb766d4.png)  

ESP32とESP-PROGの結線は以下の図のようにします。  
![](https://gyazo.com/ea4e95939e7fcde2588091f38489cfab.png)

|ESP-PROG|ESP32|
|:----|:----|
|ESP_TMS|GPIO14 (D14)|
|ESP_TCK|GPIO13 (D13)|
|ESP_TDO|GPIO15 (D15)|
|ESP_TDI|GPIO12 (D12)|
|GND|GND|

ESP32とESP-PROGを接続した状態  
（ESP-PROGのJTAGコネクタにちょうど合うケーブルが見つからず・・・。通常のジャンパーケーブルを挿し込んで接続しています）
![](https://gyazo.com/2dee33e3cdab05b8fba7568fd21efc56.png)

ESP-PROGとESP32のそれぞれの micro USBを PC と接続します。  
（ESP32のタイプによっては Type-C USBコネクタを持った物もあるようですが、まだ一般的にはmicroUSBのタイプのものが流通しているようです）
![](https://gyazo.com/e03d036c893b5a895fe0602940d5a050.png)

デバイスマネージャでCOMポートを確認します。  
![](https://gyazo.com/11ff9c723bf880121868a85d5344bf6e.png)

COM12,COM13,COM14 が今回接続したESP32とESP-PROGのものです。  
COMポートの接続先は次のようになっていました。  
- COM12 : ESP32のシリアルポート
- COM13 : ESP-PROGのデバッグポート
- COM14 : ESP-PROGのUARTポート

※ 今回、ESP32のmicro USB（COM12）から給電＋プログラム書き込みを実施しますので、COM14（ESP-PROGのUARTポート）は使用しません。

## ESP-PROGがデバッガとして認識されない問題

さて、ここが<strong style="color:red;">【ハマりポイント その１】</strong>です。 
実はESP-PROGのCOMポートが上記のように認識されているだけではデバッグができません。  
このままESP-PROGを使用しても「デバッガが見つかりません」と言われてエラーになってしまいます。  
（ネット上の記事では接続後すぐに使用できたという記事も見かけますが）  

ESP-PROGのデバッグポートを「デバッガ」として認識させるためにはひと手間必要です。  
ここで「Zadig」というツールを使います。  

[このURL](https://zadig.akeo.ie/)から Zadig をダウンロードします。  
![](https://gyazo.com/2eba1b3a62aff4dcdf1b23ac77bcbdc1.png)

ダウンロードした「Zadig-2.8.exe」（2024-01-02現在の最新）を実行します。  
Zadig が起動します。  
![](https://gyazo.com/b430fc5b900a029b97fc5375d8177e5b.png)

Options から「List All Devices」を選択します。 　
![](https://gyazo.com/a127508290f4f88d9cfecdf334a00e35.png)

リストの中に以下の２つのインターフェースがあると思います。  
- Dual RS232-HS (Interface 0) ← ESP-PROG Debug用
- Dual RS232-HS (Interface 1) ← ESP-PROG UART用

![](https://gyazo.com/76b38a597db771a11ad797eae47b502a.png)

Dual RS232-HS の「Interface 0」側を選択して「Replace Driver」ボタンを押します。  
（Interface 0側が DEBUG用です）
![](https://gyazo.com/d86c8a36a9a18f9d2f3d69c89330b700.png)

インストールが始まります。  
![](https://gyazo.com/9a724c407ef2ad7411838e7d56998e60.png)

インストールが終了した後、デバイスマネージャーで「シリアル バス デバイス」を確認します。  
「ユニバーサル シリアル バス デバイス」に「Dual RS2332-HS」が登録されていればOKです。  
最初ESP-PROGをUSB接続した時はInterface0に相当するデバイスがCOM13 として認識されていましたが、COM13が消去され、バス デバイス側に登録が移動しています。  
![](https://gyazo.com/b484441203c44a07e8fcd5da19418268.png)

UART接続用のCOM14 のみCOMポート側に残っている状態になっています。（今回はこちらのポートは使用しません）  
（画像の中のCOM12はESP32を接続している側のCOMポートです）  
![](https://gyazo.com/0e30ab92bf45a2cf81f2bd7e5a53b8fb.png)

## Platform IOでサンプルプロジェクト作成

開発環境として、以前執筆した記事「[IoT を使ってみる（その１４：有機ELディスプレイ(OLED)SSD1306編）](/iot/internet-of-things-14/#開発環境「platform-io」)」の中で紹介した「[Platform IO](https://platformio.org/)（以降、PIOと称す）」を使っていきます。

では、ESP32用のプロジェクトを作成します。  
作成したプロジェクトは以下です。  
- プロジェクト名： ESP32_ESP-PROG
- ボード： Espressif ESP32 Dev Module
- フレームワーク： Arduino
- ロケーション： ＜デフォルトを使用しない！＞

さて、ここでさらに<strong style="color:red;">【ハマりポイント その２】</strong>です。 
今回、プロジェクトのロケーションを  
　c:/opt/ESP32_ESP-PROG/  
に変更しました。  
実は最初、プロジェクトのロケーションを  
　C:\Users\＜username＞\OneDrive\ドキュメント\PlatformIO\Projects  
に置いところ、デバッガが「ドキュメント」フォルダを含むパス名を正常に認識しなかったので、仕方なく別の場所に移動しました。

プロジェクト外観は以下のようになりました。  
![](https://gyazo.com/2398133347fefa1f1eeeb2b3198d0328.png)

デバックするサンプルプログラムとして Bluetooth を扱うものをコードサンプルから取得しました。  
サンプルプログラムの「String device_name;」の部分だけ、任意の文字列に書き換えています。  
（今回Bluetoothデバイス名は「BT-ESP32-Slave」としました）

```cpp
#include <Arduino.h>

//This example code is in the Public Domain (or CC0 licensed, at your option.)
//By Evandro Copercini - 2018
//
//This example creates a bridge between Serial and Classical Bluetooth (SPP)
//and also demonstrate that SerialBT have the same functionalities of a normal Serial

#include "BluetoothSerial.h"

//#define USE_PIN // Uncomment this to use PIN during pairing. The pin is specified on the line below
const char *pin = "1234"; // Change this to more secure PIN.

String device_name = "BT-ESP32-Slave";

#if !defined(CONFIG_BT_ENABLED) || !defined(CONFIG_BLUEDROID_ENABLED)
#error Bluetooth is not enabled! Please run `make menuconfig` to and enable it
#endif

#if !defined(CONFIG_BT_SPP_ENABLED)
#error Serial Bluetooth not available or not enabled. It is only available for the ESP32 chip.
#endif

BluetoothSerial SerialBT;

void setup() {
  Serial.begin(115200);
  SerialBT.begin(device_name); //Bluetooth device name
  #ifdef USE_PIN
    SerialBT.setPin(pin);
    Serial.println("Using PIN");
  #endif
}

void loop() {
  if (Serial.available()) {
    SerialBT.write(Serial.read());
  }
  if (SerialBT.available()) {
    Serial.write(SerialBT.read());
  }
  delay(20);
}
```

## デバッグ設定（platformio.ini）

今回はESP-PROGでデバッグを行うため、platformio.ini にいくつかオプションを追加していきます。
platformio.ini ファイルの内容を以下のようにしました。  

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps = mbed-seeed/BluetoothSerial@0.0.0+sha.f56002898ee8
build_flags = 
    ; LED_BUILTIN を別のピンにアサイン
    -D LED_BUILTIN=2
monitor_speed = 115200
upload_port = COM12
upload_speed = 921600
debug_tool = esp-prog
debug_init_break = tbreak setup
;debug_init_break = tbreak loop
build_type = debug
```

platformio.ini の詳細を説明していきます。  
以下の３つの設定は基本なので今回特に変更はありません。

- platform : PIOでプロジェクト作成時、ボードに「Espressif ESP32 Dev Module」を選択すると「espressif32」が設定されます。
- board : 上記と同様の操作で「esp32dev」が設定されます。
- framework : 開発フレームワークに「Arduino」を選択したので「arduino」が設定されます。

Bluetoothを使うのに必要なライブラリを追加しています。  

- lib_deps : 今回はBluetoothを使用するので「BluetoothSerial」ライブラリをインストールしています。（ライブラリの設定方法は [こちら](/iot/internet-of-things-14/#platform-io-ide-で開発プロジェクトを作成する) を参照ください）

ESP-PROGでデバッグするために追加したオプションは以下です。  

- build_flags : ビルド時に設定するオプションです。今回利用したESP32はボード上に制御できるLEDを持っていないのでピン設定を変更しています。（今回の記事では利用しませんが、念の為）
- monitor_speed : シリアル通信のボーレートを指定します。（Bluetooth通信の結果をCOMポートのモニタで確認するため）
- upload_port : PIOはプログラムをアップロードするCOMポートを自動検出しますが、ESP-PROGのUARTとESP32側の２つのCOMポートが存在するので、今回はESP32側のCOMポートを明示的に指定しています。
- upload_speed : アップロードのスピードを指定します。

今回の記事の肝と言ってもいい部分です。  

- debug_tool : 「esp-prog」を指定します。
- debug_init_break : デバッグ実行時に最初に停止（ブレーク）させたい関数を指定します。今回は「setup」関数で止まるように指定しました。
- build_type : ビルドオプションに「debug」を指定します。debug以外に release、testの指定ができるようです。

## デバッグ設定（VSC）

VSCのデバッグ設定「launch.json」はPIOが出力した初期値のままを使用します。  
(＜username＞の部分は、自分のアカウントに読み替えてください)

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "platformio-debug",
            "request": "launch",
            "name": "PIO Debug",
            "executable": "c:/opt/ESP32_ESP-PROG/.pio/build/esp32dev/firmware.elf",
            "projectEnvName": "esp32dev",
            "toolchainBinDir": "C:/Users/＜username＞/.platformio/packages/toolchain-xtensa-esp32/bin",
            "internalConsoleOptions": "openOnSessionStart",
            "preLaunchTask": {
                "type": "PlatformIO",
                "task": "Pre-Debug"
            }
        },
        {
            "type": "platformio-debug",
            "request": "launch",
            "name": "PIO Debug (skip Pre-Debug)",
            "executable": "c:/opt/ESP32_ESP-PROG/.pio/build/esp32dev/firmware.elf",
            "projectEnvName": "esp32dev",
            "toolchainBinDir": "C:/Users/＜username＞/.platformio/packages/toolchain-xtensa-esp32/bin",
            "internalConsoleOptions": "openOnSessionStart"
        },
        {
            "type": "platformio-debug",
            "request": "launch",
            "name": "PIO Debug (without uploading)",
            "executable": "c:/opt/ESP32_ESP-PROG/.pio/build/esp32dev/firmware.elf",
            "projectEnvName": "esp32dev",
            "toolchainBinDir": "C:/Users/＜username＞/.platformio/packages/toolchain-xtensa-esp32/bin",
            "internalConsoleOptions": "openOnSessionStart",
            "loadMode": "manual"
        }
    ]
}
```

## ビルド、アップロード、そしてデバッグ

PIOでプログラムをビルドし、ESP32にアップロードします。  
ESP32は時々プログラム書き込みに失敗することもありますが、ESP32をリセットするなどすると書き込めるようになります。  
ESP32にプログラムが書き込めない問題については、いろいろな方が対策に取り組んでいるようです。
（参考：[ESP32にプログラムを書き込めないときに試す対処法](https://klab.hateblo.jp/entry/2021/05/28/172843)）

VSCのデバッグを選択し「実行とデバッグ」から「PIO Debug」を実行します。    
![](https://gyazo.com/4a3ebe6ce85b84a0d5942d697db4cb53.png)

デバッガーが起動され「Setup関数」で停止します。  
（INIファイルの「debug_init_break」オプションで指定しているため）  
![](https://gyazo.com/3dd2595870836a0bb83aef1ddfa5e45b.png)

画面右下の「デバッグコンソール」上でも 26行目の「void setup()」で停止していることが見て取れます。    
![](https://gyazo.com/b6064c3ba19c003316c17e835f071e16.png)

そのまま実行させると、設定したブレークポイントで停止します。  
「これぞデバッグ！」って感じですね。  
print文でちまちまデバッグするよりも効率が良いと思います。    
![](https://gyazo.com/2cd9c38e5c730f09b72c41ada0953534.png)

ステップ実行も可能です。   
![](https://gyazo.com/2bf4513f4dd49c089397a450a99c6cd5.png)

Bluetoothで接続し、どんな動作をするかなど細かい部分の確認ができるようになりました。

## ちょっとした「謎」

プログラムを少し書き換えてみましょう。
プログラムにグローバル変数「counter」とローカル変数「_counter」を設け、loop関数の中でインクリメントするだけの単純な変更です。

プログラムの一部抜粋
```cpp
// グローバル変数の定義
int counter = 0;

void setup() {
  Serial.begin(115200);
  SerialBT.begin(device_name); //Bluetooth device name
  #ifdef USE_PIN
    SerialBT.setPin(pin);
    Serial.println("Using PIN");
  #endif
}

void loop() {
  // ローカル変数の定義
  int _counter = 0;

  // グローバル変数の演算
  counter++;
  // ローカル変数の演算
  _counter++;

  if (Serial.available()) {
    SerialBT.write(Serial.read());
  }
  if (SerialBT.available()) {
    Serial.write(SerialBT.read());
  }
  delay(100);
}
```

loop関数の中で counter, _counter のインクリメント部分にブレークポイントを設定してみました。
グローバル変数に設定したブレークポイントは機能しました。  
![](https://gyazo.com/67c7e2a788bb9d6e4208955b3b67110c.png)

あれ？ローカル変数に設定したブレークポイントがスキップされて、なぜか次の IF文まで飛ばされてしまいました。  
![](https://gyazo.com/c377499d3d0da9414e3f31df7fe730c4.png)

ステップ実行でステップごとに進めようとしても、どうしてもローカル変数部分（宣言部分も演算部分も）に止まってくれません。  
![](https://gyazo.com/8c9f08e2abc3d51371ba78e1f3352ce4.png)

おそらく変数が最適化されてアドレスが振られていないのかと想像します（この程度のプログラムならレジスタ上の処理で済んでしまうのでしょう）。  
最適化オプションの関係だと思ったので、デバッグビルドのオプションを調べました。
PIOのINIファイルでは、デフォルトで以下の指定がされているようです。  
```ini
debug_build_flags = -Og -g2 -ggdb2
```

ただし、最適化オプションを変更すると Bluetoothライブラリのリンクでエラーになるなどしてしてビルドが成功しませんでした。  
このあたりについてはもう少し調査が必要のようです。  
詳細が分かったら、また別の記事で紹介したいと思います。  

## まとめ

今回、ESP-PROGを使ってESP32のプログラムを VSC からデバッグすることが出来ました。  
print文を使ってデバッグするよりも格段に効率がよいと思います。  

まあ、筆者の場合は「デバッガーを使わないとデバッグ出来ないほど難しいプログラムを書いているか？」という別の問題がありますが。
