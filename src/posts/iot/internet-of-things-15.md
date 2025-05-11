---
title: IoT を使ってみる（その１５：ESP32のディープスリープで長時間バッテリー駆動に挑戦）
author: shuichi-takatsu
date: 2024-02-24
tags: [esp32, deepsleep]
image: true
---

[前回](/iot/internet-of-things-14/)は有機ELディスプレイ(OLED)「SSD1306」を紹介しました。  
今回はIoTデバイス「ESP32」を長時間バッテリー駆動する際に必須とも言える「DeepSleep」機能を使ってみたいと思います。  

## ESP32は意外と電力を食う

ESP32 は非常に安価でありながらWi-FiやBluetoothが使える超お得マイコンです。  
[以前の回](/iot/internet-of-things-02/)でもESP32について紹介しました。  

開発ボードの大きさもマッチ箱程度（最近マッチ箱を見ませんが）であり、IoT機器として利用するには非常に便利です。

ESP32開発ボード外観  
![](https://gyazo.com/9aa1567edbd54b03d89d84fdb60869ed.png)

この安さと小ささを利用して、屋外や狭い場所での運用を考えたいところですが、やはり電力の供給がネックになります。  
乾電池やバッテリーなどで１ヶ月程度安定して稼働させることを考えると、常時消費される電力をかなり抑える必要があります。

ESP32を使うならば、ESP32の特徴であるWi-FiやBluetoothなどの無線機能を使用したいですね。  
しかし、無線機能を使用すると100mA以上の電流を消費します。  
無線機能を使用した連続稼働はかなり厳しいと言えます。  
また、Wi-FiやBluetoothなど電力を多く消費する無線機能を使わなくても、ESP32を起動しているだけで（プログラム的にスリープ状態にしても）数十mAの電力を常に消費してしまいます。  

なので、コンセントなどから安定的に電力を供給できない場所でESP32を使用する場合には、常時稼働する部品を減らし、いかに電力を節約するかが重要になります。

## 温湿度計測時の電力測定

温度、湿度を計測するだけの装置をブレッドボード上に組んでみました。  
バッテリーの電圧をチェックするために、バッテリー電圧を抵抗で分圧して39ピンに入れてあります。  
（本当はMOSFETなどのスイッチ回路を使って、温湿度の計測時にだけ電圧を計測するようにした方が省エネですけど、今回は省略）

温湿度センサは[以前の回](/iot/internet-of-things-13/)でも使用した「DHT11」を使っていきます。  

組んだプログラムは以下です。  

```cpp
#include <Arduino.h>
#include "DHT.h"

#define uS_TO_S_FACTOR 1000000 // Conversion factor for micro seconds to seconds
#define TIME_TO_SLEEP 5       // 測定周期（秒）

#define BATTERY 39 // バッテリー電圧を測るピン

#define DHTPIN 23
#define DHTTYPE DHT11 // DHT 11

DHT dht(DHTPIN, DHTTYPE);

void setup()
{
  Serial.begin(115200);
  while (!Serial)
    ;

  dht.begin();  // DHT初期化

  pinMode(BATTERY, INPUT); // バッテリー電圧測定ピンをINPUTモードにする
}

void loop()
{
  unsigned long starttime = micros();

  float temp = dht.readTemperature();
  float humi = dht.readHumidity();
  float vbat = (analogRead(BATTERY) / 4095.0) * 3.6 * 2.0;
  Serial.printf("temp: %.2f, humi: %.2f, vbat: %.1f\r\n", temp, humi, vbat);

  // sleepする時間（マイクロ秒）を計算する
  uint64_t sleeptime = TIME_TO_SLEEP * uS_TO_S_FACTOR - (micros() - starttime);
  Serial.printf("sleep: %.2f\r\n", (double)sleeptime / uS_TO_S_FACTOR);
  delayMicroseconds(sleeptime); // Sleepに移行
}
```

5秒周期で温度、湿度、バッテリー電圧を測定しシリアルに出力するだけの単純なものです。  
DHT11からデータを測定した後は単純に「Sleep」しています。

動かしてみます。（安定化電源装置から電力を供給します。）  

![](https://gyazo.com/c5cac29e6ee3429c11f4c8c7c61f3a14.png)  

Sleep時の消費電力は72mWでした。  
消費電流は22mAです。単3乾電池１本の電池容量が2000mAhだと仮定すると、100時間も持たない計算になりますね。  

## DeepSleep を使う

今回のお題である「DeepSleep」（ディープスリープ）という機能を使ってみます。  

DeepSleepは、通常のSleep時よりも多く機能を止めて消費電力を減らす動作モードのようです。  
DeepSleep状態から復帰する方法は色々ありますが、今回は単純に指定時間が経過したら復帰する方法を用います。  
DeepSleep状態からの色々な復帰方法は[こちら](https://lang-ship.com/blog/work/esp32-deep-sleep/)などを参照してみてください。

先程のプログラムを「DeepSleep」を使用するように改造します。

```cpp
#include <Arduino.h>
#include "DHT.h"

#define uS_TO_S_FACTOR 1000000 // Conversion factor for micro seconds to seconds
#define TIME_TO_SLEEP 5       // 測定周期（秒）

#define BATTERY 39 // バッテリー電圧を測るピン

#define DHTPIN 23
#define DHTTYPE DHT11 // DHT 11

DHT dht(DHTPIN, DHTTYPE);

void setup()
{
  unsigned long starttime = micros();
  Serial.begin(115200);
  while (!Serial)
    ;

  dht.begin();  // DHT初期化

  pinMode(BATTERY, INPUT); // バッテリー電圧測定ピンをINPUTモードにする

  float temp = dht.readTemperature();
  float humi = dht.readHumidity();
  float vbat = (analogRead(BATTERY) / 4095.0) * 3.6 * 2.0;
  Serial.printf("temp: %.2f, humi: %.2f, vbat: %.1f\r\n", temp, humi, vbat);

  // Deep sleepする時間（マイクロ秒）を計算する
  uint64_t sleeptime = TIME_TO_SLEEP * uS_TO_S_FACTOR - (micros() - starttime);
  Serial.printf("deep sleep: %.2f\r\n", (double)sleeptime / uS_TO_S_FACTOR);
  esp_deep_sleep(sleeptime); // DeepSleepモードに移行
}

void loop()
{
}
```

次のコマンドを実行し、指定時間だけ「DeepSleep状態」に入ります。
```cpp
  esp_deep_sleep(sleeptime);
```
ここで「あれ？」って思われる方が居るかと思います。  
DeepSleepコマンドを「setUp関数」の中で使用しています。  
筆者も最初は不思議に思いました。  
よくよくDeepSleepの解説を読むと、DeepSleepでは、通常のSleepのようにコマンドを実行した行の次のコマンドに復帰できません。   
DeepSleepからの復帰は「リセット」になります。  

動かして、ログを確認します。
```txt
rst:0x5 (DEEPSLEEP_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
configsip: 0, SPIWP:0xee
clk_drv:0x00,q_drv:0x00,d_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00
mode:DIO, clock div:2
load:0x3fff0030,len:1184
load:0x40078000,len:13232
load:0x40080400,len:3028
entry 0x400805e4
temp: 25.30, humi: 43.00, vbat: 3.3
deep sleep: 4.97
```

ログに `DEEPSLEEP_RESET` と書かれています。  
DeepSleep状態から復帰して再度起動していることがわかります。  

消費電力を確認します。  

![](https://gyazo.com/d2d14f945980e761212e212a6a6ca43f.png)

なんとDeepSleep時の消費電力が3mW。消費電流は1mAです。  
ESP32のチップ自体の消費電力はもっと低いと思いますが、開発ボード上の他の部品が少なくない電力を消費しているのでしょう。  

以前使用したバッテリー接続端子を持つ「LOLIN D32」という開発ボードでDeepSleep時の消費電流を測定したところ、1mAを下回る値でした。  
（測定機器の表示桁が足りずに0mAと表示されてしまいました）  

Wi-FiやBluetoothなど大電力を消費する機能は一瞬だけ使用して、その他の大半の時間を「DeepSleep」させておけば、ESP32をかなり長時間にわたってバッテリー駆動できそうです。  

## データの保持

DeepSleepで劇的に消費電力が抑えられることがわかりましたが、ESP32がリセットされてしまうので、プログラムは最初からスタートしてしまいます。  
もしリスタート後も保持しておきたいデータがある場合は「RTC_DATA_ATTR」を使ってデータを保持させることができます。  
「RTC_DATA_ATTR」の使い方は[先ほど紹介したページ](https://lang-ship.com/blog/work/esp32-deep-sleep/)に書かれていますので参考にしてみてください。

## 単3乾電池2本で駆動

ESP32をバッテリー駆動させたいと思います。
ESP32の動作電圧は3.0V～3.6Vの間であれば大丈夫のようです。  
通常売られているリチウムイオンバッテリーの電圧は3.7Vです。  
これではESP32を壊してしまうことになるので、最低電圧の3.0V（乾電池２本を直列）で動作させることにします。  
（降圧コンバータの使用も考えましたが、とりあえずはシンプルに動かすことを優先しました）

実際に動かしてみると、3.0Vを下回った電圧でも動作してくれます。（2.5V程度から動作が不安定になりましたが）

[電池ボックス](https://www.amazon.co.jp/dp/B001TRXVQI/)を購入して、早速バッテリー駆動させてみました。

![](https://gyazo.com/81f6c10b80a3097807917530737c5187.png)

DeepSleep中に淡く電源LEDが点灯し、動作していることがわかります。  
（本当はLEDは消灯しておいてもらった方が消費電力は少ないと思いますが、開発ボードの改造はしないでおきます）  

## まとめ

今回は ESP32 をバッテリー駆動する際に必須とも言える機能「DeepSleep」（ディープスリープ）を試してみました。  
使い方にちょっと癖がありますが、かなり電力の節約になることがわかったと思います。  
ただし、今のままでは計測したデータをどこにも送信できていないので、外部にデータ送信する方法については、また別の機会に報告したいと思います。

[IoTに関するチュートリアルや実践テクニックをまとめています。](/iot/)

IoT活用の参考になれば幸いです。

★追記：ESP32省電力関連記事を別記事でアップしました。
- [IoT を使ってみる（その１９：ESP32の LightSleep 機能で省電力運転に挑戦する）](/iot/internet-of-things-19/)
