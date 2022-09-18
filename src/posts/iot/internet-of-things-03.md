---
title: IoT を使ってみる（その３：AWS IoT プログラム編）
author: shuichi-takatsu
date: 2022-09-18
tags: AWS 
---

[前回](/iot/internet-of-things-02/)は、AWS IoTとIoTデバイスの接続準備として「モノの作成」、「証明書・キーの取得」と「ポリシーの作成・設定」を個別に実施しました。  
今回はIoTデバイス側のプログラムを作成し、IoTデバイスにプログラムを登録してみましょう。  

[[TOC]]

## Arduino IDE とは

前回の記事で、IoTデバイスにESP32(LOLIN D32)を使用すると言いました。  
このIoTデバイスは、キーボード・マウスも無ければ、表示器も当然付いてません。  
PCから何かしらの操作を行うにはUSBポートに接続して通信を行います。  

IoTデバイス用のプログラム開発やIoTデバイスにプログラムを書き込むなどの操作はIDE(統合開発環境)を使うと簡単です。  
(頑張ればターミナルからコマンドラインで操作できますが、このご時世、あえて苦行に挑戦する人は少ないでしょう)  

IoTデバイス、特にArduino系IoTデバイスのプログラム開発・プログラム書き込みには「Arduino IDE」がよく用いられます。   
「Arduino IDE」は初心者でも簡単にIoTデバイス用のプログラミングができるように設計されています。  

今回はこのArduino IDEを使ってプログラミングとプログラム書き込みを実施します。

## Arduino IDE のインストール

Arduino IDEは[このサイト](https://www.arduino.cc/en/software)からダウンロードできます。

ファイルをダウンロードしたら、インストーラを起動し、すべてデフォルト設定でインストールします。
途中で「COMポートドライバ」のインストールを求められた場合は「YES」を押してCOMポートドライバをインストールします。  
(Arduino IDEはUSBポートに割り当てられた仮想COMポートを使ってデバイスと通信します)

Arduino IDEをインストールして起動すると、以下のような画面が表示されます。  
Arduino IDEではプログラムを記述するシートのこと「スケッチ」と呼びます。  
スケッチにはデフォルトで「void setup()」「void loop()」という２つの関数が定義されています。  
最初は２つの関数の中身は空です。  

![](https://gyazo.com/c73966206f2fb17e16c63f5316874ffe.png)

## Arduino IDE の設定

IoTデバイスにArduinoを使用する場合はデフォルトの設定で使用できますが、今回使用するIoTデバイスは「ESP32」というタイプです。  
ESP32用の設定・ライブラリを追加でインストールする必要があります。  
以下の手順でインストールします。  

Arduino IDEを起動し「環境設定」ウィンドウを開きます。  

![](https://gyazo.com/7ccd42fea14871b9369c81425b281d44.png)

「環境設定」－「追加のボードマネージャーのURL」に以下のURLを設定します。  
`https://dl.espressif.com/dl/package_esp32_index.json`

![](https://gyazo.com/9d699d6772bc757db61fdebfeee94f73.png)

「ツール」－「ボード」－「ボードマネージャー」を選択します。  

![](https://gyazo.com/b2101b3ce8755a28161add11601a5675.png)

検索窓に「esp32」と設定し、以下の拡張パッケージをインストールします。  
(筆者の環境には既にESP32用の拡張パッケージがインストール済みのため、インストールボタンが不活性の状態ですが、未インストールならばボタンは活性化しています)

![](https://gyazo.com/6edb89faa789cc698aa8c58cc1eb4612.png)

拡張パッケージのインストールが終了したら、「ライブラリを管理」を選択します。

![](https://gyazo.com/5327e470be1837d4062b4127f3e23caa.png)

以下の２つのライブラリ
・MQTT　(※複数件ヒットするので”Joel Gaehwiler”作のものを選択します)

![](https://gyazo.com/d84793875834ac9bd34b8832326f0b24.png)

・ArduinoJson

![](https://gyazo.com/f8ad8c851416583c7a83ce6175a267a5.png)

を検索して、ライブラリをインストールします。  

すべてのインストールと設定が終わったら、ボードマネージャーから「ESP32 Arduino」－「LOLIN D32」を選択します。

![](https://gyazo.com/73ad0547624c2661ea8b34f5f45b0143.png)

## プログラム作成

IDE上で「ファイル」－「新規ファイル」を選択し、新規スケッチを開きます。  

### ヘッダーファイル

新規スケッチがタブに表示されているので、タブ名を「secrets.h」に変更します。  
スケッチ上に以下のプログラムを記述します。

```c
#include <pgmspace.h>

#define SECRET
#define THINGNAME "thing.name"

const char WIFI_SSID[] = "ssid";
const char WIFI_PASSWORD[] = "passwd";
const char AWS_IOT_ENDPOINT[] = "xxxxx.amazonaws.com";

// Amazon Root CA 1
static const char AWS_CERT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
-----END CERTIFICATE-----
)EOF";

// Device Certificate
static const char AWS_CERT_CRT[] PROGMEM = R"KEY(
-----BEGIN CERTIFICATE-----
-----END CERTIFICATE-----
)KEY";

// Device Private Key
static const char AWS_CERT_PRIVATE[] PROGMEM = R"KEY(
-----BEGIN RSA PRIVATE KEY-----
-----END RSA PRIVATE KEY-----
)KEY";
```

以下の項目をご自分の環境用に書き換えます。  
- THINGNAME: モノの名前
- WIFI_SSID: 自分の家／職場のWifiのSSID
- WIFI_PASSWORD: 自分の家／職場のWifiのパスワード
- AWS_IOT_ENDPOINT: AWS IoTのエンドポイントのURL

また[前回](/iot/internet-of-things-02/)の「モノの準備編」で保存しておいた
- ルートCA証明書
- デバイス証明書
- プライベートキー

をテキストエディターで開き、ファイルに書かれている内容をプログラムコード中の
- AWS_CERT_CA
- AWS_CERT_CRT
- AWS_CERT_PRIVATE

の部分にコピーペーストします。

### プログラム本体

新しいタブを作成します。

![](https://gyazo.com/4be5176afb8eaeb9333344cb6e10b62d.png)

タブ名称は「MyNewESP32」とします。
以下のプログラムを”そのまま”コピーペーストします。  

```c
#include "secrets.h"
#include <WiFiClientSecure.h>
#include <MQTTClient.h>
#include <ArduinoJson.h>
#include "WiFi.h"

// The MQTT topics that this device should publish/subscribe
#define AWS_IOT_PUBLISH_TOPIC   "esp32/pub"
#define AWS_IOT_SUBSCRIBE_TOPIC "esp32/sub"

WiFiClientSecure net = WiFiClientSecure();
MQTTClient client = MQTTClient(256);

void connectAWS()
{
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.println("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED){
    delay(500);
    Serial.print(".");
  }

  // Configure WiFiClientSecure to use the AWS IoT device credentials
  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_CERT_PRIVATE);

  // Connect to the MQTT broker on the AWS endpoint we defined earlier
  client.begin(AWS_IOT_ENDPOINT, 8883, net);

  // Create a message handler
  client.onMessage(messageHandler);

  Serial.print("Connecting to AWS IOT");

  while (!client.connect(THINGNAME)) {
    Serial.print(".");
    delay(100);
  }

  if(!client.connected()){
    Serial.println("AWS IoT Timeout!");
    return;
  }

  // Subscribe to a topic
  client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC);

  Serial.println("AWS IoT Connected!");
}

void publishMessage()
{
  StaticJsonDocument<200> doc;
  doc["time"] = millis();
  doc["sensor_a0"] = analogRead(0);
  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer); // print to client

  client.publish(AWS_IOT_PUBLISH_TOPIC, jsonBuffer);
}

void messageHandler(String &topic, String &payload) {
  Serial.println("incoming: " + topic + " - " + payload);

//  StaticJsonDocument<200> doc;
//  deserializeJson(doc, payload);
//  const char* message = doc["message"];
}

void setup() {
  Serial.begin(9600);
  connectAWS();
  // initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  publishMessage();
  client.loop();
  // LED ON
  digitalWrite(LED_BUILTIN, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(500);                       // wait for a second
  // LED OFF
  digitalWrite(LED_BUILTIN, LOW);    // turn the LED off by making the voltage LOW
  delay(500);                       // wait for a second
}
```

今回、[オリジナルのプログラム](https://aws.amazon.com/jp/blogs/compute/building-an-aws-iot-core-device-using-aws-serverless-and-an-esp32/)をちょっと変更しています。  
プログラムが”本当に動作しているのか分かりづらい”と思ったので、Arduinoプログラマの間で「Lチカ」と呼ばれている「LEDをチカチカ点灯させる」をコードに追加しています。  

変更点は、setup()関数に  
```c
  // initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);
```
を追加し、loop()関数の「delay(1000)」を  
```c
  // LED ON
  digitalWrite(LED_BUILTIN, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(500);                       // wait for a second
  // LED OFF
  digitalWrite(LED_BUILTIN, LOW);    // turn the LED off by making the voltage LOW
  delay(500);                       // wait for a second
```
に変更してあります。  
これでプログラムの動作を視覚的に認識できます。

## プログラムのコンパイル・書き込み

Arduino IDEのコンパイル・書き込みは至って簡単です。  
ボタンひとつでコンパイル・書き込みを行ってくれます。  
以下のボタン(右矢印)を押します。

![](https://gyazo.com/5ccbb6fca3f7dae70a72694904c4d3cc.png)

プログラムのコンパイル・書き込みが正常に行われると、IDEの下部に「ボードへの書き込みが完了しました」のメッセージが表示されます。  

![](https://gyazo.com/b86003458ecb38d4eed231f3c4be81f2.png)

プログラムに文法的なエラーがある場合はIDE下部にエラーメッセージが表示されます。  
プログラム書き込み時の「書き込みエラー」の原因の多くは「COMポートが見つからない」というケースだと思います。  
IDEを起動しているPCがWindows10の場合、CH340ドライバ(USBポートをCOMポートとして認識させArduino IDEと通信させるためのドライバ)がうまくインストールできていない可能性があります。  
ドライバを確認してみてください。

## プログラムの実行

正常にプログラムがESP32に転送されると、プログラムが実行され、ESP32のLEDが0.5秒間隔(厳密には時間は少しずれますが)で点滅します。  
LEDが”チカチカ”するのを確認します。(赤色LEDはUSB接続して給電されている状態を示します)

LED点灯(青色LED)  
![](https://gyazo.com/e4758cc8686e9531cec0687fddb6628a.png)

LED消灯
![](https://gyazo.com/3f708a232c5cac2df85153effd6882b9.png)

今回は、ESP32にプログラムを転送するところまでを実施しました。  

## まとめ

Arduino IDEのインストールを行い、ESP32を扱うための拡張パッケージをインストールしました。  
IDE上でプログラムを作成し、IoTデバイス(ESP32)にプログラムを書き込むことができました。  
LEDを点滅させ、プログラムが動作していることを確認しました。  
次回(こそ)は、AWS IoTとESP32の間の通信を確認します。

過去記事インデックス：  
- [IoT を使ってみる（その１：AWS IoT チュートリアル編）](/iot/internet-of-things-01/)
- [IoT を使ってみる（その２：AWS IoT モノの準備編）](/iot/internet-of-things-02/)
