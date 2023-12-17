---
title: IoT を使ってみる（その１４：有機ELディスプレイ(OLED)SSD1306編）
author: shuichi-takatsu
date: 2023-12-18
tags: [esp32, arduino, ssd1306, dht11, oled, platformio, advent2023]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
---
この記事は[豆蔵デベロッパーサイトアドベントカレンダー2023](/events/advent-calendar/2023/)第18日目の記事です。 

[前回](/iot/internet-of-things-13/)は温湿度センサモジュール「DHT11」を紹介しました。  
今回はIoTデバイスに接続して使用する「有機ELディスプレイ(OLED) SSD1306」を紹介致します。  

## 有機ELディスプレイ(OLED) SSD1306

前回は DHT11 で取得した温度・湿度の情報をシリアル通信でPCに転送して、COMポートの情報をシリアルモニタで確認していました。  
ただ、毎回シリアルモニタを起動して結果を確認するのは煩わしいものです。  
そこで今回は「有機ELディスプレイ(OLED)」を使って温度・湿度をディスプレイ表示してみます。  
（OLED とは「有機発光ダイオード（organic light-emitting diode）」の略です）  

今回使うのは”小型で安価”な OLED の品番「SSD1306」のIoTデバイスです。  
サイズは0.96インチ（横128ピクセル×縦64ピクセル）のものを選びました。  
通信方式はI2C(IIC)方式とSPI方式の2種類のものがありますが、接続するピン数が4ピンで動作するI2C通信タイプのものです。

表：  
![](https://gyazo.com/9ad0112702e56a935ef9704ed4c422b7.png)  
裏：  
![](https://gyazo.com/247f73e2208c4fdb0494d7edf4338217.png)

Amazonとかで1個500円程度で販売されています。  
AliExpressだともっとお安いです。（私はAliExpressで1個160円ほどで購入しました）  
表示色は「Blue」「White」「Blue+Yellow」の3種類があります。  
私は好みで「White」のものを選びました。

## 開発環境「Platform IO」

以前まで ESP32 や Arduino のソフトウェア開発には「[Arduino IDE](https://www.arduino.cc/en/software)」を使っていましたが、プログラム実装中にコード補完が出来ないのが辛いと思っていました。  
また普段から使っている VSC（[Visual Studio Code](https://code.visualstudio.com/)）でコードを書きたいと思っていたところ「[Platform IO](https://platformio.org/)」という開発環境があることを知りました。

この Platform IO（以降 PIO と称す）のIDEは VSC のプラグインとして利用できます。  
早速 VSC の拡張機能で「PlatformIO IDE」を検索し、インストールします。
![](https://gyazo.com/f25f3144667fcbe2f7fd7c136799bd40.png)

また、[次のURL](https://platformio.org/platformio-ide)からでもインストールできるようです。  

インストールが完了すると VSC に以下のようなアイコンが追加されます。  
![](https://gyazo.com/0c8d88a0599ce0fe293825808d57e1dd.png)

このアイコンは蟻なのか宇宙人なのか？  
わからないので ChatGPT 先生にお聞きしました。  
答えは以下です。  
![](https://gyazo.com/826ac87880b6675d9945042134562e0f.png)

## 開発対象マイコンボード「ESP32」

開発するマイコンボードは「ESP32 DevkitC V4」（以降 ESP32 と称す）です。  
[以前](http://localhost:8080/iot/internet-of-things-06/)も使用しましたね。  
今回は DHT11 と SSD1306 の２つを載せるのでブレッドボード上に ESP32 も一緒に配置したいと思います。   
ですが・・・ここで問題が一つ発生しました。  

ESP32 をブレッドボードに挿したところの画像です。  
![](https://gyazo.com/fc0b134b95ca852ece648eb73a0c2ff1.png)

あれ？？？何か変ですよね。  
<strong style="color:red;">皆様、お気づきだろうか・・・。</strong>
実はこの ESP32 はピン幅が広くて、片側5ピンのブレッドボードにうまく収まりません。  
片側１列はなんとかジャンパーピンでピンを引き出せますが、反対側はジャンパーピンを挿す余裕が無いのです。  

片側はかろうじて１列空きができます。  
![](https://gyazo.com/153733c4a9aa24d4a195e17b2e8144f2.png)  
反対側は電源ラインのギリギリまで詰まってしまいます。  
![](https://gyazo.com/dc00927bf41dedfc28a7302d394aa48f.png)

結局、ESP32 の片側だけを活かして、5V ピンの電源だけをジャンパワイヤで引き出して無理やりブレッドボードに載せました。
（ブレッドボードが複数枚あったので、ESP32 を２つのブレッドボード間に跨がせれば良いと気がついたのは試行錯誤が終わった後でした・・・）  

この問題は多くの人が遭遇しているみたいです。  
[ブレッドボードを中央から切断した猛者](http://radiopench.blog96.fc2.com/blog-entry-1020.html)もいるようです。  
また[片側6ピンのブレッドボード](https://www.amazon.co.jp/dp/B00DSKCS68/)も発売されているようです。  

## 機器を接続する

では、ESP32 に DHT11 と SSD1306 を接続していきます。  
DHT11 については、前回とは ESP32 への接続先ピンが異なります。今回は 23番ピンを使用します（ESP32 の片側しか使えないため）  
|ESP32|DHT11|
|:---:|:---:|
|5V|+|
|23番|OUT|
|GND|-|

SSD1306については、デフォルトのSDA（21番）、SCL（22番）がそのまま使えました。
|ESP32|SSD1306|
|:---:|:---:|
|GND|GND|
|5V|VCC|
|21番|SDA|
|22番|SCL|

![](https://gyazo.com/19f64d2c8c685dd12a5d8fd1ebba4c5d.png)

## Platform IO IDE で開発プロジェクトを作成する

前置きがめっちゃ長くなりました。申し訳ありません。  
では早速 Platform IO IDE（以降、PIO IDE と称す）でプログラムを組んでいきたいと思います。  

PIO IDE のアイコンをクリックして、VSC の下側のバーにある「HOME」アイコンをクリックします。すると「PIO HOME」画面が表示されます。  
![](https://gyazo.com/5935ebcd35baeaab1c7e8b769a7a2b2a.png)

「New Project」をクリックします。  
![](https://gyazo.com/702cca35af934dad72bd730bbc547ef4.png)

Project Wizard で次のように設定し、「Finish」ボタンを押します。  
- Name （自由記述）：プロジェクト名（何でも良いので実装内容を表したプロジェクト名を設定します）
- Board （選択）：今回は ESP32 なので「Espressif ESP32 Dev Module」を選択しました。
- Framework （選択）：「Arduino」を選択しました。（他に Espidf が選択できますが、今回 Arduino 互換のプログラミングをしたいので Arduino を選択します）  
- Location： 「Use default location」にチェックを入れたままとします。  

![](https://gyazo.com/c6ab76ea85176e6fff7de395d29e0707.png)

プロジェクトが作成されます。  
「platformio.ini」の内容を確認してみます。  
このINIファイルにプロジェクトに必要な情報が設定されています。  
以下のように設定されていれば環境設定は成功しています。    
![](https://gyazo.com/a99971fdea7a578d2fb2ea2dd24a9a96.png)

しかし、このままでは DHT11 や SSD1306 を利用できないので、ライブラリを追加します。 

HOMEボタンを押して「PIO Home」を表示し、「Libraries」ボタンを押して「Search libraries」から必要なライブラリを検索してインストールします。  
![](https://gyazo.com/b212c31a27514366cfd0f49ddfd5a876.png)

必要なライブラリは以下の３つになります。  

DHT11関連：
- DHT sensor library by Adafruit
- Adafruit Unified Sensor by Adafruit

SSD1306関連：
- ESP8266 and ESP32 OLED driver for SSD1306 displays by ThingPulse

ライブラリを検索し「Add to Project」ボタンでプロジェクトに追加します。  
（以下は SSD1306 のライブラリを選択している例です）
![](https://gyazo.com/6a81aad8675f7916dcd221d428dff54e.png)

ライブラリを追加すると「platformio.ini」にライブラリの情報が追加されます。  
```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps = 
	thingpulse/ESP8266 and ESP32 OLED driver for SSD1306 displays@^4.4.0
	adafruit/Adafruit Unified Sensor@^1.1.14
	adafruit/DHT sensor library@^1.4.6
```
プログラミングの環境が整いました。

## プログラムを組んでいく

では、DHT11 から温湿度情報を取得し、OLED 上にデータを表示するプログラムを組んでいきます。  
Framework として Arduino を選択しているので、基本的に「void setup()」「void loop()」の２個所の関数内にコードを記述していく流れになります。

最終的に出来上がったプログラムは以下のようになりました。
```cpp
#include <Arduino.h>
#include "DHT.h"
#include "SSD1306Wire.h"            // legacy: #include "SSD1306.h"

// DHT11
#define DHTPIN 23                   // 23番ピンを指定
#define DHTTYPE DHT11               // for DHT 11
DHT dht(DHTPIN, DHTTYPE);

// SSD1306
//  ADDRESS I2Cアドレス 0x3C
//  SDA データ線 GPIO 21
//  SCL クロック線 GPIO 22
SSD1306Wire lcd(0x3c, SDA, SCL);

void setup() {
  dht.begin();                      // DHT初期化

  lcd.init();                       // ディスプレイを初期化
  lcd.setFont(ArialMT_Plain_16);    // フォントを設定
  lcd.flipScreenVertically();       // 表示反転（ボードにLCDを固定する向きに応じて）
}

void loop() {
  float t = dht.readTemperature();  // 温度 取得
  float h = dht.readHumidity();     // 湿度 取得

  lcd.clear();                      // 表示クリア 

  if( isnan(t) || isnan(h) ) {
    // センサー異常時
    lcd.drawString(0, 0, "DHT Error.");
    lcd.display();
  }
  else {
    // 温度 =================================
    char buf_t[32];
    sprintf(buf_t, "Temp: %.1f[C]", t);

    // LCD (0,0)の位置に表示指示
    lcd.drawString(0, 0, buf_t);
    
    // 湿度 =================================
    char buf_h[32];
    sprintf(buf_h, "Humi : %.1f[%%]", h);

    // LCD (0,16)の位置に表示指示
    lcd.drawString(0, 16, buf_h);

    // 指定された情報を描画
    lcd.display();
  }
  delay(100);

}
```

プログラムの各部を解説していきます。  

まずヘッダの宣言です。  
```cpp
#include <Arduino.h>
#include "DHT.h"
#include "SSD1306Wire.h"            // legacy: #include "SSD1306.h"
```
Framework として Arduino を選択しているので、先頭行に「#include <Arduino.h>」を追加します。  
これはお約束のようです。  
続いて DHTライブラリのヘッダ、SSD1306ライブラリのヘッダを追加します。    
（過去の情報で「SSD1306.h」が選択されている例も見受けられますが、最新は「SSD1306Wire.h」のようです）  

次は DHT11 の設定です。  
```cpp
#define DHTPIN 23
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);
```
OUTピンを23番ピンに設定し、DHTタイプを「DHT11」に指定します。  
DHTオブジェクト「dht」を生成します。

SSD1306の設定です。  
```cpp
SSD1306Wire lcd(0x3c, SDA, SCL);
```
SSD1306 は、I2Cアドレス(=0x3c)、SDAピン番号(=21)、SCLピンパン号(=22) を引数に取ります。  
SDA と SCL は「pins_arduino.h」() の中に以下のように定義されていました。  
このように簡単に宣言や定義を参照できるのも VSC ならではの機能ですね。  
```cpp
static const uint8_t SDA = 21;
static const uint8_t SCL = 22;
```

余談ですが、I2Cアドレスの見分け方を説明します。
今回 SSD1306 購入時に設定されていた I2Cアドレスは「0x3C」でした。   
このアドレスの見分け方は OLED の裏側のジャンパ部分が 0x78 側に接続されていることでわかります。   
![](https://gyazo.com/d5bebefd0bac3394178f908896a6435c.png)  
ジャンパしているものはチップ抵抗でしょう。  
（文字が小さいですが「472」と読めるので、47×10^2=4700[Ω]=4.7[kΩ]ですかね？）
このジャンパの位置によって、I2Cのアドレスが変わります。  
対応は以下のようになっているようです。
|ジャンパ位置|I2Cアドレス|
|:---:|:---:|
|0x78|0x3C|
|0x7A|0x3D|

void setup() の内容です。  
```cpp
  dht.begin();                      // DHT初期化

  lcd.init();                       // ディスプレイを初期化
  lcd.setFont(ArialMT_Plain_16);    // フォントを設定
  lcd.flipScreenVertically();       // 表示反転（ボードにLCDを固定する向きに応じて）
```
まず、DHT11 の初期化を実施します。
続いて、ディスプレイ(OLED)の初期化を実施します。  
表示用のフォントは「ArialMT_Plain_16」を選択しました。（他にもありそうですが、詳しく調べていません）  
また、デフォルトのディスプレイ表示方向がシルク印刷の方向と反対だったので、ディスプレイ表示を反転させています（ピン位置がディスプレイ上部になるように設定）

次に void loop() の部分です。  
ここは少し長いので分割します。  
```cpp
  float t = dht.readTemperature();  // 温度 取得
  float h = dht.readHumidity();     // 湿度 取得
```
DHT11 から温度、湿度の情報を取得しています。

```cpp
  lcd.clear();                      // 表示クリア 
```
ディスプレイ表示を一回クリアします。

```cpp
  if( isnan(t) || isnan(h) ) {
    // センサー異常時
    lcd.drawString(0, 0, "DHT Error.");
    lcd.display();
  }
```
DHT11 からのデータが取得できない場合には「DHT Error」の文字をディスプレイに表示します。

```cpp
    // 温度 =================================
    char buf_t[32];
    sprintf(buf_t, "Temp: %.1f[C]", t);

    // LCD (0,0)の位置に表示指示
    lcd.drawString(0, 0, buf_t);
```
温度情報をディスプレイの「0,0」位置に表示指示します。

```cpp
    // 湿度 =================================
    char buf_h[32];
    sprintf(buf_h, "Humi : %.1f[%%]", h);

    // LCD (0,16)の位置に表示指示
    lcd.drawString(0, 16, buf_h);
```
湿度情報をディスプレイの「0,16」位置に表示指示します。
（フォントサイズが16ピクセルなので、16ピクセルずれた位置に設定しました）

```cpp
    // 指定された情報を描画
    lcd.display();
```
指定した情報をディスプレイ上に表示します。

```cpp
  delay(100);
```
まあ、おまじないみたいなものです。

## プログラムを ESP32 に書き込む

PIO IDE でプログラムをビルドし、ESP32 にアップロードします。  
アップロードするときの COMポートを自動的に検出してくれるようです。  
![](https://gyazo.com/a7d2219f9b1ef6b688ffcdb9541420b1.png)

まず「ビルド」を押してプログラムが正常にビルドされることを確認します。  
次に ESP32 を COMポート に接続し、「アップロード」を押してプログラムを ESP32 にアップロードします。  

プログラムがアップロードされ、OLED 上に温度、湿度が表示されれば成功です。   
![](https://gyazo.com/a585a87d55f35069ad7c9c16bd84e5ba.png)

OLED を使う前は別の LCD (下の画像のIoTデバイスは「1602A」)に表示させていましたが OLED の方が小さくて取り回しがし易いと思いました。  
（OLED はバックライトが不要なので、消費電力も少ないでしょう）  
![](https://gyazo.com/0b163c777056f640a24691a7b5892745.png)
（やっぱり 1602A はデカい・・・）

## おまけ（Arduino UNO編）

ついでに PIO IDE で Arduino UNO（以降、Arduino と称す）用にもプログラムを組んでみました。

出来上がったプログラムは以下です。  

```cpp
#include <Arduino.h>
#include "DHT.h"
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels

// On an arduino UNO:       A4(SDA), A5(SCL)
#define OLED_RESET     -1 // Reset pin # (or -1 if sharing Arduino reset pin)
#define SCREEN_ADDRESS 0x3C ///< See datasheet for Address;
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

#define DHTPIN 14 // A0ピンを使用するため
#define DHTTYPE DHT11
DHT dht( DHTPIN, DHTTYPE );

void setup() {
  dht.begin();

  // SSD1306_SWITCHCAPVCC = generate display voltage from 3.3V internally
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;); // Don't proceed, loop forever
  }

  // Show initial display buffer contents on the screen --
  // the library initializes this with an Adafruit splash screen.
  display.display();
  delay(2000); // Pause for 2 seconds

  // Clear the buffer
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(2); // Draw 2X-scale text
}

void loop() {

  float t = dht.readTemperature();  // 温度
  float h = dht.readHumidity();     // 湿度

  display.clearDisplay();

  if( isnan(t) || isnan(h) ) {
    display.setCursor(0, 0);
    display.println("Failed to read DHT");
  }
  else {
    // 温度 =================================
    char strTemperature[32];
    dtostrf(t,4,1,strTemperature);
    char buf_t[32];
    sprintf(buf_t, "T: %s(C)", strTemperature);
 
    // LCD
    display.setCursor(0, 0);
    display.println(buf_t);

    // 湿度 =================================
    char strHumidity[32];
    dtostrf(h,4,1,strHumidity);
    char buf_h[32];
    sprintf(buf_h, "H: %s(%%)", strHumidity);

    // LCD
    display.setCursor(0, 16);
    display.println(buf_h);

  }
  display.display();
  
  delay(100);
}
```

ESP32 でうまく動作したので問題ないだろうと思って組んだのですが、いろいろとハマりました。  
先ほど ESP32 で使った SSD1306 用のライブラリは「ESP8266 and ESP32」用だったらしく、Arduino では動作しませんでした。  
Arduino で使用できるライブラリに変更する必要がありました。  
Platform IO のINIファイルで以下のようにライブラリを指定しました。  

```ini
[env:uno]
platform = atmelavr
board = uno
framework = arduino
lib_deps = 
	adafruit/Adafruit Unified Sensor@^1.1.14
	adafruit/DHT sensor library@^1.4.6
	adafruit/Adafruit SSD1306@^2.5.9
```
（全部のライブラリが adafruit 製になって、美しいと言えば美しいのですけどね）

しかし、最大のハマりポイントだったのは  
<strong style="color:red;">「Arduino では、浮動小数点のフォーマット指定をした sprintf が機能しない」</strong>  
ことでした。  

まさか「sprintf」が原因なんて思いもしませんので、なぜデータが取得できないのかかなり悩みました。  
PIO を使ったからという訳ではなく、Arduino IDE でも同様の現象が発生したので Arduino 自体の制約なのでしょう。  
[こちらのURL](https://kurobekoblog.com/arduino_sprint)にあった情報に助けられました。  

「dtostrf」という専用の関数を使い、かなり雑ですが次のような実装で逃げました。  
```cpp
    char strTemperature[32];
    dtostrf(t,4,1,strTemperature);
    char buf_t[32];
    sprintf(buf_t, "T: %s(C)", strTemperature);
```

いろいろとありましたが、取りえずは Arduino でも OLED を動作させることが出来ました。  
![](https://gyazo.com/7b9399e00d676ba11f4fdae0736a8555.png)  
（Arduino 上に 拡張ボード ＋ ブレッドボード を配置して、DHT11 と SSD1306 を載せています）

## まとめ

今回は「有機ELディスプレイ(OLED) SSD1306」を使って DHT11 からのデータを表示してみました。  
わざわざ COMポートにデータを出力する手間が省けます。  
ESP32 と Arduino で微妙に差があったりして、ちょっと苦労しました。  
VSC ＋ PIO IDE でコード補完が使用できるのはとても便利です。  
![](https://gyazo.com/8134bc4f6d9458487a527705cbbaa6c0.png)

[IoTに関するチュートリアルや実践テクニックをまとめています。](/iot/)

IoT活用の参考になれば幸いです。
