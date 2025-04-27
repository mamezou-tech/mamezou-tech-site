---
title: IoT を使ってみる（その１６：OTAを使ってESP32のファームウェアを無線で楽々アップデート！）
author: shuichi-takatsu
date: 2025-04-28
tags: [esp32, ota, webserver, platformio]
image: true
---

[前回](/iot/internet-of-things-15/)はESP32のDeepSleep機能で長時間バッテリー駆動に挑戦しました。
今回は、ESP32 を使って "OTA (Over The Air)" に挑戦します。

## OTAとは？

"OTA"とは "Over The Air" の略で、**無線通信経由でプログラムを書き換える仕組み**のことです。

通常、ESP32にプログラムを書き込むにはUSBケーブルでPCと接続する必要があります。  
しかし、多くのESP32には WifiやBluetooth機能が最初から搭載されているので、無線通信でプログラムを書き換えられれば凄く便利だと思います。  
OTAを使えば、Wifi経由でプログラムを書き換えられるため、以下のようなシーンで効果を発揮します。  

- 屋外に設置したセンサー
- 手の届きにくい場所に設置したデバイス

これらができると、一歩進んだIoTって気がしますね。

## VSCode＋PlatformIOを使ったESP32 OTAアップデート環境構築

本記事では、**VSCode＋PlatformIO**を用いて、ESP32の**OTA（Over The Air）アップデート**を行うための環境構築方法を解説します。
ただし、VSCodeのインストール、PlatformIO拡張機能の導入、プロジェクト作成方法については、[他の記事](/iot/internet-of-things-14/#開発環境「platform-io」)に譲り、**PlatformIO.iniファイルの設定とOTAプログラムの作成**に重点を置いて説明します。  

今回、使うESP32ボードは「ESP32 LOLIN D32」です。  
ESP32 LOLIN D32 は基板上にLEDが実装されていますので、視覚的な動作確認が楽なので使用しました。  
コントロール可能なLEDを持っていない ESP32 で試す場合は、LEDを点灯させるように外部回路を組む必要があります。（LEDの点滅は視覚的な動作確認にのみ使用しているので、実装から省いてもOKです）  
また、LOLIN D32にはバッテリーを接続する端子が用意されおり、マイクロUSB給電ではなくバッテリー駆動させることが可能です。  
（以降、単に「ESP32」と呼びます）

### PlatformIO.ini ファイルの設定

ESP32でOTAを有効にするためには、`platformio.ini`に以下の設定をします。

```ini
[env:lolin_d32]
platform = espressif32
board = lolin_d32           ; ← 今回使用する board名
framework = arduino

; --- OTA設定 ---
upload_protocol = espota
upload_port = 192.168.0.65   ; ← Wifi経由でアップデートするESP32のIPアドレス
upload_flags =
    --auth=admin             ; ← OTAパスワードを設定（プログラム側と合わせる）

; --- シリアルモニタ設定 ---
monitor_speed = 115200
```

### 各項目の説明

各設定項目を説明します。  
| 項目             | 説明 |
|------------------|------|
| `platform`       | 使用するプラットフォーム。ESP32の場合は`espressif32` |
| `board`          | 使用するボード。ここでは`lolin_d32` |
| `framework`      | 使用するフレームワーク。ここでは`arduino` |
| `upload_protocol`| アップロード方法を`espota`（OTA）に指定 |
| `upload_port`    | ESP32のIPアドレスを指定（皆様の環境に合わせて設定してください） |
| `upload_flags`   | OTA時に使用する認証情報（auth）を指定（例ではパスワードを「`admin`」にしています） |
| `monitor_speed`  | シリアルモニタの通信速度（シリアル通信は Wifiが正しく機能しているかなどの動作確認に使います） |

### 注意点

- **ESP32のプログラム**側でも、OTAアップデートを受け付けるコードが必要です。今回は「ArduinoOTAライブラリ」を使用します。  
- また当然と言えば当然ですが、**一番最初**は通常の方法（USB-COMポート経由）でプログラムを ESP32 にアップロードする必要があります。  
  USB-COMポートを使ってプログラムをアップロードする場合は「upload_protocol」「upload_port」「upload_flags」の部分をコメントアウトします。  
- OTA用のポート（デフォルトでは3232番）をルータやファイアウォールでブロックしないように設定します。（ポートの許可方法についてはネット上に情報がたくさんありますので割愛します）
- `upload_port`に設定するIPアドレスは、**ESP32がWifi接続後に取得するアドレス**を指定します。

### WifiのIPアドレスについて

OTAアップデート時に使うIPアドレス（upload_portに指定するIPアドレス）は、ESP32がWifi接続時に取得するアドレスを指定する必要があります。
DHCPなどでルーターから割り当てられるIPアドレスが変わってしまうと、OTAアップロードができなくなるので、以下の対策が考えられます。

- ルーター側でESP32のMACアドレスに固定IPを割り当てる
- ESP32側で静的IPアドレス（Static IP）を設定する

これによって、常に同じIPアドレスでOTAアップデートができるようになり、運用が安定します。  
自宅ルーターの設定画面から ESP32 のIPアドレスが分からない（MACアドレスが分からない）場合は、プログラムをUSB-COMポート経由でアップロードし、一度リセットボタンを押して再起動すれば、シリアル通信出力にポート番号情報が出力されるので確認できます。  

ESP32 のリセットボタンを押したとき、以下のようなログが出力されます。    
（今回は「IP address: 192.168.0.65」と出力されています）
```shell
rst:0xc (SW_CPU_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
configsip: 0, SPIWP:0xee
clk_drv:0x00,q_drv:0x00,d_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00
mode:DIO, clock div:2
load:0x3fff0030,len:1184
load:0x40078000,len:13232
load:0x40080400,len:3028
entry 0x400805e4
.WiFi connected
IP address: 192.168.0.65
```

## 簡単なOTA（”Lチカ”プログラム）

まずはシンプルに、LEDを点滅させるだけのプログラムにOTA機能を組み込みます。  
以下がサンプルプログラムです。  
LEDを500ミリ秒間隔で点滅させるだけのシンプル構成です。  

OTAのためのポイントは以下です。  
- 「`<WiFi.h>`」「`<ArduinoOTA.h>`」の2つのファイルをインクルードする
- `ArduinoOTA.begin();` を必ず `setup()` に書くこと
- `loop()` 中で `ArduinoOTA.handle();` を呼び続けること

```cpp
#include <Arduino.h>

#include <WiFi.h>
#include <ArduinoOTA.h>

const char* ssid = "YOUR_SSID";         // 各自のWifi環境のSSIDを指定する
const char* password = "YOUR_PASSWORD"; // 各自のWifi環境のPasswordを指定する

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  ArduinoOTA.setPassword("admin");  // <- platform.iniに指定した password と合わせる

  ArduinoOTA.begin();

  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  ArduinoOTA.handle();

  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}
```

これだけで、Wifiで ESP32 プログラムの書き換えができるようになります。  
通常のUSB-COMポート経由でプログラムをアップロードするのと同じ要領でプログラムをOTAアップロードできます。  
（**注：初回のみ、事前にUSB-COMポート経由でプログラムをアップロード**しておいてください）

アップロードを実行したとき、以下のようなログが出力されればアップロードは成功です。  
```shell
Configuring upload protocol...
AVAILABLE: cmsis-dap, esp-bridge, esp-prog, espota, esptool, iot-bus-jtag, jlink, minimodule, olimex-arm-usb-ocd, olimex-arm-usb-ocd-h, olimex-arm-usb-tiny-h, olimex-jtag-tiny, tumpa
CURRENT: upload_protocol = espota
Uploading .pio\build\lolin_d32\firmware.bin
20:50:58 [DEBUG]: Options: {'esp_ip': '192.168.0.65', 'host_ip': '0.0.0.0', 'esp_port': 3232, 'host_port': 40415, 'auth': 'admin', 'image': '.pio\\build\\lolin_d32\\firmware.bin', 'spiffs': False, 'debug': True, 'progress': True, 'timeout': 10}
20:50:58 [INFO]: Starting on 0.0.0.0:40415
20:50:58 [INFO]: Upload size: 792672
Sending invitation to 192.168.0.65 
Authenticating...OK
20:51:00 [INFO]: Waiting for device...

Uploading: [                                                            ] 0% 
Uploading: [                                                            ] 0%
Uploading: [                                                            ] 0% 
Uploading: [                                                            ] 0%
Uploading: [                                                            ] 0% 
Uploading: [                                                            ] 0% 
Uploading: [                                                            ] 0% 
Uploading: [=                                                           ] 0% 
Uploading: [=                                                           ] 1% 
Uploading: [=                                                           ] 1% 
・・・
（中略）
・・・
Uploading: [============================================================] 99%
Uploading: [============================================================] 99%
Uploading: [============================================================] 99%
Uploading: [============================================================] 99%
Uploading: [============================================================] 99%
Uploading: [============================================================] 99%
Uploading: [============================================================] 99% 
Uploading: [============================================================] 100% Done...


20:51:11 [INFO]: Waiting for result...
20:51:11 [INFO]: Result: OK
20:51:11 [INFO]: Success
```

ESP32 側のシリアル通信を監視していれば、次のようなログが出力されていると思います。  
ESP32 をリセットした時と同じようなログですね。  
正しく OTAアップロードされ、ESP32 が再起動（リブート）していることがわかります。  
```shell
rst:0xc (SW_CPU_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
configsip: 0, SPIWP:0xee
clk_drv:0x00,q_drv:0x00,d_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00
mode:DIO, clock div:2
load:0x3fff0030,len:1184
load:0x40078000,len:13232
load:0x40080400,len:3028
entry 0x400805e4
.WiFi connected
IP address: 192.168.0.65
```

### 注意点

OTAアップデートすると ESP32 は再起動（リブート）します。  
よって、当然のこととしてメモリに保持されていた値などは初期化されます。  
もし「アップデート前のデータを引き継ぎたい」なら、次の方法が考えられます。  

- NVS（Non-Volatile Storage）に保存しておく
  ESP32には「NVS」というフラッシュメモリの一部にデータを保存できる仕組みがあります。  
  キーとバリューのセットで保存できるから、例えば設定情報や小さいカウンター値みたいなものは簡単に残せます。
- SPIFFSやLittleFSにファイルとして保存する
  もう少しまとまったデータ（設定ファイル、ログファイルなど）がある場合は、ファイルシステムを使ってファイルとして保存しておく方法もあります。
- 外部ストレージ（SDカードなど）に書き出す
  さらに大量のデータならSDカードなどに一時保存しておく方法もあります。ただしちょっとハードウェア増えます。

今回はデータ保持までは実施しませんが、機会があれば挑戦してみたいと思います。  

## WebServerを立ててOTA対応

次は、ちょっとレベルアップしてみます。  
ESP32 に簡単なWebサーバを立てて、ブラウザからアクセスできるようにします。
もちろんOTA対応も残したままです。

以下がサンプルプログラムです。  
インクルードに「`<WebServer.h>`」を追加しました。  

```cpp
#include <Arduino.h>

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoOTA.h>

const char* ssid = "YOUR_SSID";         // 各自のWifi環境のSSIDを指定する
const char* password = "YOUR_PASSWORD"; // 各自のWifi環境のPasswordを指定する

WebServer server(80);

void handleRoot() {
  server.send(200, "text/plain", "Hello from ESP32 WebServer!");
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  ArduinoOTA.setPassword("admin");  // <- platform.iniに指定した password と合わせる

  ArduinoOTA.begin();

  server.on("/", handleRoot);
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  ArduinoOTA.handle();
  server.handleClient();
}
```

ビルドしてプログラムをアップロードします。（先ほどのLEDチカチカプログラムをアップロードしてあるなら、もうOTAでアップロードできます！）  
ESP32 から以下ようなログが出力されていれば、WeBServerが起動しています。
```shell
rst:0xc (SW_CPU_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
configsip: 0, SPIWP:0xee
clk_drv:0x00,q_drv:0x00,d_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00
mode:DIO, clock div:2
load:0x3fff0030,len:1184
load:0x40078000,len:13232
load:0x40080400,len:3028
entry 0x400805e4
.WiFi connected
IP address: 192.168.0.65
HTTP server started
```

ブラウザでESP32のIPアドレス（今回は 192.168.0.65 ）にアクセスすると、以下のように表示されると思います。  
```
Hello from ESP32 WebServer!
```
これで、Webサーバ機能とOTA機能を両立できました。  
すごく簡単ですね。  

## ブラウザからファームウェアアップロード

最後は、**自前のWeb画面からファームウェアをアップロードして書き換え**できるようにしてみます。

以下がサンプルプログラムです。  
インクルードに「`<Update.h>`」を追加して、Update機能を追加しました。  
このプログラムを ESP32 にアップロードします。（もちろん OTAで！）  

```cpp
#include <Arduino.h>

#include <WiFi.h>
#include <WebServer.h>
#include <Update.h>
#include <ArduinoOTA.h>

const char* ssid = "YOUR_SSID";         // 各自のWifi環境のSSIDを指定する
const char* password = "YOUR_PASSWORD"; // 各自のWifi環境のPasswordを指定する

WebServer server(80);

const char* upload_html = R"rawliteral(
<form method='POST' action='/update' enctype='multipart/form-data'>
  <input type='file' name='update'>
  <input type='submit' value='Update'>
</form>
)rawliteral";

// アップデート成功後にリダイレクトするHTML
const char* update_success_html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="5; url=/" />
</head>
<body>
  <h1>Update Successful! Rebooting...</h1>
  <p>You will be redirected to Home page in 5 seconds.</p>
</body>
</html>
)rawliteral";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html", upload_html);
  });

  server.on("/update", HTTP_POST, []() {
    server.send(200, "text/html", update_success_html);  // アップデート成功後にリダイレクトHTMLを返す
    delay(1000);  // メッセージを表示するための時間
    ESP.restart();  // ESP32をリセット
  }, []() {
    HTTPUpload& upload = server.upload();
    if (upload.status == UPLOAD_FILE_START) {
      Serial.printf("Update: %s\n", upload.filename.c_str());
      if (!Update.begin()) {
        Update.printError(Serial);
      }
    } else if (upload.status == UPLOAD_FILE_WRITE) {
      if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
        Update.printError(Serial);
      }
    } else if (upload.status == UPLOAD_FILE_END) {
      if (Update.end(true)) {
        Serial.println("Update complete");
      } else {
        Update.printError(Serial);
      }
    }
  });

  ArduinoOTA.setPassword("admin");  // <- platform.iniに指定した password と合わせる

  ArduinoOTA.begin();

  server.begin();
}

void loop() {
  ArduinoOTA.handle();
  server.handleClient();
}
```

プログラムをアップロードした後、ブラウザでESP32のIPアドレスにアクセスすると、ファイル選択とアップロードボタンが表示されます。
![](https://gyazo.com/59214f2e7a201cfb3719a4768417dde9.png)

ここでビルド済みのファームウェア（.binファイル）をアップロードすれば、**ESP32自身が新しいファームウェアに書き換わる**わけです。  
作成された Firmware の bin ファイルを選択します。
![](https://gyazo.com/98ae15444c37e0255abc38d0333c652e.png)

「firmware.bin」が選択されます。
![](https://gyazo.com/0e7e0a8e1bc5654dc15c7dea43fb0a8b.png)

「update」ボタンを押します。  
![](https://gyazo.com/d7900c8bc96d696a1161db7be31df6f4.png)

アップデートが成功し、5秒後、ホーム画面に遷移することが告げられます。  
![](https://gyazo.com/0bce04cd85c252b513ef511c2360b523.png)

また、シリアル通信には、以下のように「firmware.bin」がUpdateされた旨のログが出力されます。  
```shell
Update: firmware.bin
Update complete
ets Jul 29 2019 12:21:46

rst:0xc (SW_CPU_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
configsip: 0, SPIWP:0xee
clk_drv:0x00,q_drv:0x00,d_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00
mode:DIO, clock div:2
load:0x3fff0030,len:1184
load:0x40078000,len:13232
load:0x40080400,len:3028
entry 0x400805e4
.WiFi connected
IP address: 192.168.0.65
```

これは本当に便利なので、IoTデバイス開発ではぜひ取り入れたいテクニックだと思います。

## まとめ

今回は、以下の順にレベルアップしながら、ESP32のOTA機能を試してみました。  

- OTAの基本（LEDチカチカ）
- WebServerを立てたOTA
- WebからファームウェアアップロードできるOTA

今回のサンプルにはエラー処理やセキュリティ面での課題がたくさん残されていますが、基本的な枠組みは体験してもらえたのではないかと思います。  

特に現地でのメンテナンスが難しいIoT機器では、OTA機能の重要性が高いです。
ぜひ、みなさんの開発でも活用してみてください。

## おまけ

### ESPAsyncWebServer バージョン

もっと高機能なWeBServerに「ESPAsyncWebServer」があります。  
色々と試行錯誤して作成したプログラムを以下に掲載します。  
かなり突貫工事ですが、一応動いてます（笑）  
ここでは、LittleFS（ファイルシステム） や FreeRTOSのタスクを使ったりして、ちょっと凝ってます。  
解読してみてください。  
（セキュリティ面などは甘々なので、もっと改善が必要ですが）

```cpp
#include <Arduino.h>

#include <WiFi.h>
#include <ArduinoOTA.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <Update.h>
#include <Ticker.h>

const char* ssid = "YOUR_SSID";         // 各自のWifi環境のSSIDを指定する
const char* password = "YOUR_PASSWORD"; // 各自のWifi環境のPasswordを指定する

static int T_DELAY = 500;

// Webサーバーをポート80番で作成
AsyncWebServer server(80);

// OTA用
Ticker otaTicker;
bool otaRequested = false;
String otaFilename;

// --- 関数プロトタイプ ---
void handleFileUpdate(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final);
void updateFirmware(String filename);
void otaTask(void *pvParameters);

// --- セットアップ ---
void setup(){
  Serial.begin(115200);

  if (!LittleFS.begin(true)) {
    Serial.println("An error has occurred while mounting LittleFS");
  } else {
    Serial.println("LittleFS mounted successfully");
  }
    
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected.");
  Serial.println(WiFi.localIP());
  Serial.println("MAC Address: " + WiFi.macAddress()); // MACアドレスを出力

  pinMode(LED_BUILTIN, OUTPUT);

  ArduinoOTA.setPassword("admin");  // <- platform.iniに指定した password と合わせる
  
  ArduinoOTA
    .onStart([]() {
      String type = (ArduinoOTA.getCommand() == U_FLASH) ? "sketch" : "filesystem";
      Serial.println("Start updating " + type);
    })
    .onEnd([]() {
      Serial.println("\nEnd");
    })
    .onProgress([](unsigned int progress, unsigned int total) {
      Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
    })
    .onError([](ota_error_t error) {
      Serial.printf("Error[%u]: ", error);
      if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
      else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
      else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
      else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
      else if (error == OTA_END_ERROR) Serial.println("End Failed");
    });

  // FreeRTOSのOTAタスクを作成
  xTaskCreatePinnedToCore(otaTask, "OTA Task", 10000, NULL, 1, NULL, 1);  

  // "/" にアクセスされたらトップページを表示
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "text/html", R"rawliteral(
      <!DOCTYPE html>
      <html>
      <head>
        <title>ESP32 Firmware Update</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
          h1 { color: #333; }
          button { padding: 10px 20px; font-size: 16px; margin-top: 20px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>ESP32 Firmware Management</h1>
        <p>Welcome! Please proceed to firmware update.</p>
        <a href="/update"><button>Go to Firmware Update</button></a>
      </body>
      </html>
    )rawliteral");
  });

  // Updateページ（GET）
  server.on("/update", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "text/html", R"rawliteral(
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Update Firmware</title></head>
      <body>
        <h2>Update Firmware (.bin)</h2>
        <form method="POST" action="/update" enctype="multipart/form-data">
          <input type="file" name="update" accept=".bin" required>
          <input type="submit" value="Update">
        </form>
      </body>
      </html>
    )rawliteral");
  });

  // Update処理（POST）
  server.on("/update", HTTP_POST, [](AsyncWebServerRequest *request){ 
    // 完了時（ここでは何もしない）
  }, handleFileUpdate);

  // Webサーバ起動
  server.begin();
}

// --- ファイルアップロード処理 ---
void handleFileUpdate(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final){
  if (!index){
    Serial.printf("UpdateStart: %s\n", filename.c_str());

    // 拡張子チェック（.bin以外は受け付けない）
    if (!filename.endsWith(".bin")) {
      request->send(400, "text/plain", "Only .bin files are allowed");
      return;
    }

    // 同名ファイルがあれば削除
    LittleFS.remove("/" + filename);
    request->_tempFile = LittleFS.open("/" + filename, "w");
  }
  if (len){
    request->_tempFile.write(data, len);
  }
  if (final){
    Serial.printf("UpdateEnd: %s (%u)\n", filename.c_str(), index+len);
    request->_tempFile.close();

    // まずブラウザにレスポンスを返す
    request->send(200, "text/html", R"rawliteral(
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Update Success</title>
        <script>
          setTimeout(function(){
            window.location.href = '/';
          }, 2000); // 2秒後にトップページへ
        </script>
      </head>
      <body>
        <h2>Update successful!</h2>
        <p>Restarting device... Redirecting to Home in 2 seconds.</p>
      </body>
      </html>
    )rawliteral");

    // OTA実行を予約
    otaFilename = "/" + filename;
    otaRequested = true;
    otaTicker.once(1, []() {
      updateFirmware(otaFilename);
    });
  }
}

// --- ファームウェアアップデート処理 ---
void updateFirmware(String filename) {
  File firmware = LittleFS.open(filename, "r");
  if (!firmware) {
    Serial.println("Failed to open file for OTA");
    return;
  }

  if (Update.begin(firmware.size(), U_FLASH)) { // U_FLASHを明示
    size_t written = Update.writeStream(firmware);
    if (written == firmware.size()) {
      Serial.println("OTA Update successful");
      if (Update.end()) {
        Serial.println("Rebooting...");
        firmware.close();
        LittleFS.remove(filename); // 成功後にアップロードファイルを削除
        delay(500);
        ESP.restart();
      } else {
        Serial.println("Error ending OTA update");
      }
    } else {
      Serial.println("Error writing OTA update");
    }
  } else {
    Serial.println("Failed to begin OTA update");
  }
  firmware.close();
}

// OTAタスク
void otaTask(void *pvParameters) {
  ArduinoOTA.begin();  // OTAの初期化

  while (true) {
    ArduinoOTA.handle();  // OTAの進行状況をチェック
    delay(100);  // 他のタスクをブロックしないように少し待つ
  }
}

// --- ループ ---
void loop(){
  // ユーザーの処理

  // LED点滅
  digitalWrite(LED_BUILTIN, HIGH);
  delay(T_DELAY);
  digitalWrite(LED_BUILTIN, LOW);
  delay(T_DELAY);
}
```

platformio.ini ファイルの内容は以下です。  
ボードタイプやIPアドレス、OTAパスワードなどは各自の環境に合わせて書き換えてください。  
```ini
[env:lolin_d32]
platform = espressif32
board = lolin_d32            ; ← 使用するボードタイプ
framework = arduino
upload_protocol = espota
upload_port = 192.168.0.65   ; ← Wifi経由でアップデートするESP32のIPアドレス
monitor_speed = 115200
board_build.filesystem = littlefs
upload_flags = 
    --auth=admin             ; ← OTAパスワードを設定（プログラム側と合わせる）
lib_deps = 
  # RECOMMENDED
  # Accept new functionality in a backwards compatible manner and patches
  esp32async/ESPAsyncWebServer @ ^3.7.7
  # RECOMMENDED
  # Accept new functionality in a backwards compatible manner and patches
  esp32async/AsyncTCP @ ^3.4.0
```

<style>
img {
    border: 1px gray solid;
}
</style>
