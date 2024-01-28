---
title: STM32マイコンボード（STM32F103C8T6）をST-Link V2互換品とPlatform IOを使ってデバッグする
author: shuichi-takatsu
date: 2024-01-29
tags: [stm32, stlink, platformio, arduinoide]
image: true
---

これまで筆者が扱ってきたマイコンボード関連の記事では、ESP32やArduino、Raspberry piなどを取り上げてきました。  
これら御三家（と言ってもよいと思います）以外に「STM32」ファミリというマイコンボードもそこそこ有名だったりします。  
今回は「STM32」ファミリの中でも安価で入手可能な「STM32F103C8T6」というマイコンボードを使って、プログラムで”Lチカ（LEDをチカチカ点滅させる）”を実施し、Lチカ・プログラムのデバッグ実行までしてみたいと思います。

## STM32 とは

[STM32ファミリ](https://www.stmcu.jp/stm32family/)はSTマイクロエレクトロニクスが製造・販売する Arm Cortex-Mシリーズを搭載した32bit汎用マイクロコントローラです。  
CPUがARMなので、ARM用に作成された色々なアプリケーションを利用できます。  
その他に8bitの「STM8」ファミリが存在します。

## 安価なマイコンボード「STM32F103C8T6」

今回使用するマイコンボードは「STM32F103C8T6」です。  
（巷では「Blue Pill」とか呼ばれているようです）  
[Amazon](https://www.amazon.co.jp/dp/B0B6HLBR66/)などでかなり安く販売されています。 AliExpressなら配送に時間はかかりますがもっと安く入手できますね。  
（後に判明することですが、今回購入したマイコンボードは互換品でした）

STM32ファミリには非常に多くの製品ラインナップがあります。今回使用する「STM32F103C8T6」のCPUやメモリなどの情報は[製品ホームページ](https://www.stmcu.jp/stm32/stm32f1/stm32f103/12022/)を参照ください。

製品仕様：  
![](https://gyazo.com/b95624f64f781f2ac41ed0bc551aee81.png)

外観（ピンヘッダをはんだ付け済）：  
![](https://gyazo.com/1910541512ff1facafc4e02edcf0199f.png)

ESP32やArduino Nano、Raspberry pi pico と同じように組み込み向けに実装されたパッケージになっています。  
本体上面に２つのジャンパーピンがあり、それぞれ「0」または「1」の設定ができます。  
![](https://gyazo.com/3058ddfdf88f7d815e4ad86f3f44e18a.png)

通常は「Boot0:0、Boot1:0」のまま使用します。  
シリアル通信ピンからプログラムの書き込みを行う場合は「Boot0:1、Boot1:0」に設定するようです。（今回は後述するST-Linkという機器を使って書き込みを実施するので設定は通常のままとします）

## ST-Link V2互換品

ST-Linkの正規品は高価なので、互換品を使用していきます（笑）  
以下の画像にあるような ST-Link V2互換プログラマ（以降、ST-Linkと称す）を購入しました。  
[Amazon](https://www.amazon.co.jp/dp/B08ZYCRN67/)などで安価に入手できます。これもAliExpressならもっとお安いですが。  
![](https://gyazo.com/d466fb1ba6e27640b8b6df9ebde7434f.png)

ST-LinkをPCで使うにはST-Link用のドライバが必要です。  
[次のURL](https://www.st.com/ja/development-tools/stsw-link009.html)からドライバをダウンロードします。  
（ユーザー登録しなくても、ゲストでダウンロードできるようです）  
![](https://gyazo.com/51b90b98f2fe4c43ff03e7c061df73f4.png)

上記URLから「en.stsw-link009.zip」というファイルがダウンロードされますので、Zipファイルを解凍し、解凍後のフォルダ内に含まれている「dpinst_amd64.exe」（64bitのPCの場合）を実行してドライバをインストールします。
　
## ST-Link と STM32F103C8T6 の接続

ST-Link と STM32F103C8T6（以降、STM32と称す）を以下のように接続します。
![](https://gyazo.com/c8e82f8426881a7dbcb497647dacb11d.png)

| ST-Link | STM32 |
| ---- | ---- |
| SWDIO | SWO |
| GND | GND |
| SWCLK | SWCLK |
| 3.3V | 3.3V |

（STM32側の「SWO」と刻印されている端子は「SWDIO」のことだと思われます）

ST-Link用ドライバをインストールしたPCのUSB端子にST-Linkを接続すると、デバイスマネージャにてST-Linkが認識されていることを確認します。  
以下のように表示されていれば正常にドライバがインストール出来ていることになります。  

![](https://gyazo.com/fa687bf68074786a0bde37b841965cb2.png)

## ST-Linkのファームウェアのアップグレード

必須ではないかもしれませんが、ST-Linkのファームウェアをアップグレードしておきます（ST-Linkについての情報を参考にした他のサイトではファームウェアをアップグレードするように書かれていたので）

「STM32 ST-LINK Utility」というユーティリティをダンロードして、ST-Linkのファームウェアをアップグレードします。  
[次のURL](https://www.st.com/ja/development-tools/stsw-link004.html)からユーティリティをダウンロードします。  
![](https://gyazo.com/74f877879a5b51cc7e90c08b86339e73.png)

上記URLから「en.stsw-link004.zip」というファイルがダウンロードされますので、Zipファイルを解凍し、解凍後のフォルダ内に含まれている「setup.exe」を実行してユーティリティをインストールします。

インストールされた STM32 ST-LINK Utility を実行します。  
次のようなアプリケーションが起動します。  
![](https://gyazo.com/ffa51c5df0a0bc7370878dcc3d0231dd.png)

「ST-LINK」－「Firmware update」をクリックします。  
![](https://gyazo.com/50829f8527fd51889b7db6be9dbe7fae.png)

ST-Link Upgrade ダイアログが表示されますので「Device Connect」をクリックします。  
![](https://gyazo.com/b99640833f7c6172fdf70520c6115ff3.png)

デバイスが接続されたら、Upgrade to Firmwareの右側にある「YES」をクリックします。  
![](https://gyazo.com/9c18a8ddb7431a3c28e0488aa65df60b.png)

ファームウェアのアップグレードが開始されます。  
（筆者の場合、すでにファームウェアのアップグレードを実行済みだったので、画像の中のバージョンはアップグレード後も同じです）  
![](https://gyazo.com/72708ab3a5df371540119c6f97981b66.png)

アップグレードが終了しました。  
![](https://gyazo.com/ec358ca5841a11ec526080b5542709b6.png)

## STM32CubeProg のインストール

実はさきほどのユーティリティのダウンロードページには、以下のような推奨製品「STM32CubeProg」が存在すると書かれていました。  
![](https://gyazo.com/982eed5af4e811e275393853a51658bc.png)

STM32CubeProg はST-Link V2互換品には対応していないようですが、この記事の後半で使用する「Arduino IDE」がこのユーティリティの中に含まれるコマンドラインユーティリティを使用する設定になっているので、いまインストールをしておきます。  

[次のURL](https://www.st.com/ja/development-tools/stm32cubeprog.html)から STM32CubeProg をダウンロードします。
![](https://gyazo.com/3cd7fc31f804af619f8753d759001d3d.png)

上記URLから「en.stm32cubeprg-win64-v2-15-0.zip」（2024-01-27現在）というファイルがダウンロードされますので、Zipファイルを解凍し、解凍後のフォルダ内に含まれている「SetupSTM32CubeProgrammer_win64.exe」を実行してユーティリティをインストールします。

インストールを進めていきます。  
インストール途中でいくつかのオプション設定の確認が求められますが、すべてデフォルトの設定でインストールします。  
![](https://gyazo.com/5d5ca6572c2190a1f4ad9e0030413566.png)

## Arduino IDE の準備（STM32ボード情報）

これまで投稿してきたマイコンボードの記事でも使用してきた「[Arduino IDE](https://www.arduino.cc/en/software)」を使って、プログラムの記述、ビルド、書き込みを行っていきます。

まず、Arduino IDE（V2.2.1）の基本設定に、STM32のボードマネージャーのURLを追加します。  
追加するURLは以下です。
`https://github.com/stm32duino/BoardManagerFiles/raw/main/package_stmicroelectronics_index.json`

基本設定の「追加のボードマネージャ」に上記のURLを追加します。  
![](https://gyazo.com/51a44600a68a45c93ce66878f517e867.png)

Arduino IDEのボードマネージャに以下のように「STM32 MCU based boards」が表示されますので、インストールします。（かなり時間がかかります）  
![](https://gyazo.com/00a874d96bf44ba2c07938a6bd9e1f22.png)

インストールが終わると、ボードマネージャのボードリストに「STM32 MCU based boards」が追加登録されていると思います。  
![](https://gyazo.com/e9c404f7546db99d8d332b0c6581d70b.png)

## Arduino IDE でSTM32プロジェクトを作成

Arduino IDEのボードマネージャで「Generic STM32F1 series」ボードを選択します。  
![](https://gyazo.com/20e7de743c728af96b66de36bc050c72.png)

ボードの設定を次のように変更します。  
（COMポートは今回使用しないので、何が選択されていてもかまいません）  
![](https://gyazo.com/576bdb90d91cff05aa1f98095bc2ac06.png)

「Upload method」が「STM32CubeProgrammer(SWD)」になっていることを確認します。    
![](https://gyazo.com/d2978294df38bfcb2df5d4a4feb32fb3.png)

「ファイル」ー「スケッチ例」ー「0.Basics」から「Blink」を選択します。  
![](https://gyazo.com/3d99316c0dc985354e0cd2d004f91676.png)

デフォルトのBlinkプロジェクトが作成されます。  
![](https://gyazo.com/a1b1015c98d1ecd30e7c50cc4ce9bbff.png)

## Lチカ・プログラム（for STM32F103C8T6）作成

Lチカ（LEDをチカチカ点滅させる）プログラムを以下のように作成しました。  

```cpp
const int T_DELAY = 1000;

// the setup function runs once when you press reset or power the board
void setup() {
  // initialize digital pin PC13 as an output.
  pinMode(PC13, OUTPUT);
}

// the loop function runs over and over again forever
void loop() {
  digitalWrite(PC13, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(T_DELAY);             // wait for a second
  digitalWrite(PC13, LOW);    // turn the LED off by making the voltage LOW
  delay(T_DELAY);             // wait for a second
}
```

LEDを点滅させるための出力端子の指定は「PC13」としています。  
（※意外と間違いやすい部分ですので、注意してください）

## Arduino IDE からプログラムを書き込む

Arduino IDE からプログラムを書き込みします。  
![](https://gyazo.com/888706932b71faf2a928598ce4004989.png)

以下のようなメッセージが出力されました。
プログラムがSTM32に書き込まれ、無事に実行されたことがわかります。  
```shell
最大32768バイトのフラッシュメモリのうち、スケッチが18056バイト（55%）を使っています。
最大10240バイトのRAMのうち、グローバル変数が1256バイト（12%）を使っていて、ローカル変数で8984バイト使うことができます。
      -------------------------------------------------------------------
                       STM32CubeProgrammer v2.15.0                  
      -------------------------------------------------------------------

ST-LINK SN  : 9
ST-LINK FW  : V2J37S7
Board       : --
Voltage     : 3.23V
SWD freq    : 4000 KHz
Connect mode: Under Reset
Reset mode  : Hardware reset
Device ID   : 0x410
Revision ID : Rev X
Device name : STM32F101/F102/F103 Medium-density
Flash size  : 128 KBytes
Device type : MCU
Device CPU  : Cortex-M3
BL Version  : --

Memory Programming ...
Opening and parsing file: Blink_STM32F103C8T6.ino.bin
  File          : Blink_STM32F103C8T6.ino.bin
  Size          : 17.92 KB 
  Address       : 0x08000000 

Erasing memory corresponding to segment 0:
Erasing internal memory sectors [0 17]
Download in Progress:

File download complete
Time elapsed during download operation: 00:00:00.475

RUNNING Program ... 
  Address:      : 0x8000000
Application is running, Please Hold on...
Start operation achieved successfully
```

## Arduino IDE でデバッグを実行したところエラーが発生

Arduino IDEからデバッグを実行してみました。  
![](https://gyazo.com/27e91dc63ce460e154e03cb4f168b94d.png)

以下のようなメッセージが出力されました。  
```text
Licensed under GNU GPL v2
For bug reports, read
        http://openocd.org/doc/doxygen/bugs.html
CDRTOSConfigure
Info : The selected transport took over low-level target control. The results might differ compared to plain JTAG/SWD
srst_only separate srst_nogate srst_open_drain connect_deassert_srst

Info : Listening on port 50001 for tcl connections
Info : Listening on port 50002 for telnet connections
Info : clock speed 1000 kHz
Info : STLINK V2J37S7 (API v2) VID:PID 0483:3748
Info : Target voltage: 3.225296
Warn : UNEXPECTED idcode: 0x2ba01477
Error: expected 1 of 1: 0x1ba01477

[2024-01-28T01:35:54.260Z] SERVER CONSOLE DEBUG: onBackendConnect: gdb-server session closed
GDB server session ended. This terminal will be reused, waiting for next session to start...
```

どうやら「idcode」の部分で期待するコードではないというエラーのようです。
```text
Warn : UNEXPECTED idcode: 0x2ba01477
Error: expected 1 of 1: 0x1ba01477
```

Arduino IDE でのデバッグは一旦諦め、デバッグはPlatform IO側で確認していきたいと思います。

## Platform IO でSTM32プロジェクトを作成

これまでも使ってきた [Platform IO](https://platformio.org/) を使って、プログラムの書き込み・実行・デバッグを行っていきたいと思います。  
（Platform IOのセットアップ等については、以前執筆した記事「[IoT を使ってみる（その１４：有機ELディスプレイ(OLED)SSD1306編）](/iot/internet-of-things-14/#開発環境「platform-io」)」を参照ください）

Platform IO で STM32のプロジェクトを作成します。
![](https://gyazo.com/9a58702cdbaa00ac823c5fe3ab15d9be.png)

 - プロジェクト名：「Blink_STM32F103C8T6」（←任意でかまいません）
 - ボード：「STM32F103C8 (20k RAM. 64k Flash)(Generic)」
 - フレームワーク：「Arduino」
 - ロケーション：チェックOFF（デフォルトのロケーションは使用しません）

プロジェクトが作成された後、platformio.iniファイルを確認します。  
upload protocolは ST-Linkがデフォルトらしいので、記述は省略します。  
```ini
[env:genericSTM32F103C8]
platform = ststm32
board = genericSTM32F103C8
framework = arduino
```

## Platform IO からプログラムを書き込む

Arduino IDE で実行したのと同じプログラムをmain.cppに書き込みます。  
ただし、ソースコードの先頭でヘッダファイル「Arduino.h」をインクルードしました。
```cpp
#include <Arduino.h>
```

Platform IO からプログラムの書き込みを実行したところ以下のようなエラーが発生しました。
```text
Advanced Memory Usage is available via "PlatformIO Home > Project Inspect"
RAM:   [=         ]   5.5% (used 1132 bytes from 20480 bytes)
Flash: [==        ]  16.6% (used 10872 bytes from 65536 bytes)
Configuring upload protocol...
AVAILABLE: blackmagic, cmsis-dap, dfu, jlink, serial, stlink
CURRENT: upload_protocol = stlink
Uploading .pio\build\genericSTM32F103C8\firmware.elf
xPack Open On-Chip Debugger 0.12.0-01004-g9ea7f3d64-dirty (2023-01-30-15:04)
Licensed under GNU GPL v2
For bug reports, read
        http://openocd.org/doc/doxygen/bugs.html
debug_level: 1

hla_swd
Warn : UNEXPECTED idcode: 0x2ba01477
Error: expected 1 of 1: 0x1ba01477
in procedure 'program'
** OpenOCD init failed **
shutdown command invoked

*** [upload] Error 1
```

Arduino IDE のデバッグのところで発生したエラーに似ています。  
上記のエラー内容を調べたところ、[次のURL](https://community.platformio.org/t/debugging-of-stm32f103-clone-bluepill-board-wrong-idcode/14635)で情報を得ることができました。  
どうやら購入したSTM32はクローン品（STM32F103C8T6 ではなく CS32F103C8T6 チップ）なので、以下のような追加の設定が必要のようです。  
platformio.iniファイルを以下のように修正しました。  
```ini
[env:genericSTM32F103C8]
platform = ststm32
board = genericSTM32F103C8
framework = arduino
upload_flags = -c set CPUTAPID 0x2ba01477
```

設定を変更して、再度プログラムの書き込みを行います。  
```text
Advanced Memory Usage is available via "PlatformIO Home > Project Inspect"
RAM:   [=         ]   5.5% (used 1132 bytes from 20480 bytes)
Flash: [==        ]  16.6% (used 10872 bytes from 65536 bytes)
Configuring upload protocol...
AVAILABLE: blackmagic, cmsis-dap, dfu, jlink, serial, stlink
CURRENT: upload_protocol = stlink
Uploading .pio\build\genericSTM32F103C8\firmware.elf
xPack Open On-Chip Debugger 0.12.0-01004-g9ea7f3d64-dirty (2023-01-30-15:04)
Licensed under GNU GPL v2
For bug reports, read
        http://openocd.org/doc/doxygen/bugs.html
debug_level: 1

0x2ba01477
hla_swd
[stm32f1x.cpu] halted due to debug-request, current mode: Thread 
xPSR: 0x01000000 pc: 0x080001a4 msp: 0x20005000
** Programming Started **
Warn : Adding extra erase range, 0x08002b9c .. 0x08002bff
** Programming Finished **
** Verify Started **
** Verified OK **
** Resetting Target **
shutdown command invoked
```

プログラムの書き込みが成功したようです。  
設定した周期でLEDを点滅させることができました。

## Platform IO で STM32 をデバッグする

やっぱりデバッグしたいですよね（笑）  
簡単にはデバッグできない予感はするものの platformio.iniファイルを以下のように修正します。  
```ini
[env:genericSTM32F103C8]
platform = ststm32
board = genericSTM32F103C8
framework = arduino
upload_flags = -c set CPUTAPID 0x2ba01477

debug_tool = stlink
debug_init_break = tbreak setup
build_type = debug
```

プロジェクト作成時にデフォルトで作成された「.vscode/launch.json」に定義されている「PIO Debug」デバッグ設定でデバッグを実行します。  
![](https://gyazo.com/db25cc20b1748aa95bff6903a40dcffa.png)

やっぱりと言うか、、、エラーが発生しました。  
```text
PlatformIO Unified Debugger -> https://bit.ly/pio-debug
PlatformIO: debug_tool = stlink
PlatformIO: Initializing remote target...
xPack Open On-Chip Debugger 0.12.0-01004-g9ea7f3d64-dirty (2023-01-30-15:04)
Licensed under GNU GPL v2
For bug reports, read
	http://openocd.org/doc/doxygen/bugs.html
hla_swd
Info : The selected transport took over low-level target control. The results might differ compared to plain JTAG/SWD
Info : tcl server disabled
Info : telnet server disabled
Info : clock speed 1000 kHz
Info : STLINK V2J37S7 (API v2) VID:PID 0483:3748
Info : Target voltage: 3.227423
Warn : UNEXPECTED idcode: 0x2ba01477
Error: expected 1 of 1: 0x1ba01477

.pioinit:13: Error in sourced command file:
Remote communication error.  Target disconnected.: No such file or directory.
```

どうやらデバッガー（OpenOCD）がCPUTAPIDの不一致を検出してエラーになっているようです。  
```text
Warn : UNEXPECTED idcode: 0x2ba01477
Error: expected 1 of 1: 0x1ba01477
```

デバッガー実行時にCPUTAPIDを指定する必要がありそうです。  
platformio.iniファイルを以下のように修正しました。  
（＜ユーザフォルダ＞ としている部分は各自のパスで置き換えてください）
```ini
[env:genericSTM32F103C8]
platform = ststm32
board = genericSTM32F103C8
framework = arduino
upload_flags = -c set CPUTAPID 0x2ba01477

debug_tool = stlink
debug_init_break = tbreak setup
build_type = debug
debug_server =
  C:\Users\＜ユーザフォルダ＞\.platformio\packages\tool-openocd\bin\openocd.exe
  -s C:\Users\＜ユーザフォルダ＞\.platformio\packages\tool-openocd\scripts
  -f interface\stlink.cfg
  -c "transport select hla_swd"
  -c "set CPUTAPID 0x2ba01477"
  -f target\stm32f1x.cfg
  -c "reset_config none"
```

再度デバッグを実行します。  

今度は成功したようです。  
「setup」関数内のコードにブレークで停止しています。
![](https://gyazo.com/0296988ccd680e530daf6e47f4d1cb2a.png)

実行ボタンを押して、次のブレークポイントまで実行させます。  
13行目のブレークポイントで停止しました。  
![](https://gyazo.com/150ab3f8b761ef872d6be7f05efee893.png)

ステップ実行も出来ました。  
![](https://gyazo.com/9f24a3a47b898dd8caf02deacb9ce9c6.png)

## まとめ

STM32F103C8T6 マイコンボード（これも互換品ですが）で、ST-Link V2互換品と Arduino IDE や Platform IO を使って、LED点滅プログラムを書き込み・実行させることができました。  
また、Platform IOからデバッグ実行を行い、ブレークポイントで停止させ、ステップ実行できることも確認しました。  
マイコンボードもデバッカも非常に安価なので、皆様も試してみてはいかがでしょうか。
