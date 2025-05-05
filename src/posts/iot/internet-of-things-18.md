---
title: IoT を使ってみる（その１８：ESP32とOV2640でリアルタイムJPEG映像配信をやってみた）
author: shuichi-takatsu
date: 2025-05-05
tags: [esp32, ota, platformio, camera]
image: true
---

[前回](/iot/internet-of-things-17/)は、ESP32 OTAの基本を解説しました。  
今回は、ESP32-WROVER-E 開発ボードと OV2640 カメラモジュールを使い、Wi-Fi経由でJPEG画像をリアルタイムにストリーミング配信する機能を実装してみます。  
（本題ではありませんが、OTA機能も併せて実装します）

## はじめに

PlatformIOでは、Arduinoフレームワークでも一部のESP-IDFライブラリが利用できるようになっています。  
今回はPlatformIO＋Arduinoフレームワーク環境で、`esp32-camera` ドライバを利用します。  
このドライバは本来ESP-IDF向けに開発されたものですが、Arduinoフレームワークでも使用できます。  

本記事では、**PlatformIO.iniファイルの設定とJPEGストリーミングプログラムの作成**に重点を置いて説明します。  
VSCodeのインストール、PlatformIO拡張機能の導入、プロジェクト作成方法については、[他の記事](/iot/internet-of-things-14/#開発環境「platform-io」)を参照ください。  

## 用意するもの

今回使用したハードウェアを紹介します。

### ESP32-WROVER-E 開発ボード

ESP32-WROVER-E 開発ボード（たとえば[これ](https://electronicwork.shop/items/658456c145c7bd0ccc8ad086?srsltid=AfmBOoqdnz6Fxa3Fuu6BuT_WSC3hzkBS1L6KCc_ARC9VB8YjaCqlNPp5)）は、Wi-FiとBluetoothが使えるマイコン「ESP32」を搭載したボードで、外部メモリ（PSRAM）を内蔵しているのが特徴です。  
画像処理やWebカメラなど、メモリを多く使用する用途に適しています。ArduinoやPlatformIOなどの開発環境で手軽に使えます。  
（※残念ながら、Arduinoフレームワークでは最大4MBまでしかPSRAMを認識できないようです）  

### カメラモジュール「OV2640」

OV2640（たとえば[これ](https://www.amazon.co.jp/dp/B0BPMCSVQK/?th=1)） は、200万画素（2MP）CMOSセンサ搭載の小型カメラモジュールです。  
JPEG出力に対応しており、ESP32などのマイコンと組み合わせてWebカメラや画像認識などに広く使われています。コンパクトで低消費電力である点も特徴です。  
ただし、フレームレートは SVGA で最大30FPSくらいのようです。  
入門用としては非常に安価で手に入るので適していると思います。  

## カメラライブラリ「esp32-camera」

今回 ESP32＋PlatformIO＋Arduinoフレームワーク でカメラモジュールを使用するために「`esp32-camera`（カメラ制御用ドライバ）」を使用します。  
`esp32-camera` は、ESP32とカメラモジュールを連携させ、画像キャプチャやストリーミングを可能にするライブラリです。  
PSRAMを活用して高解像度のJPEG画像を処理します。  

高解像度画像の一時保存や高速転送に内部メモリでは容量不足のため、外部PSRAM（4MB/8MB）が不可欠です。  
PSRAMがない場合は、解像度やフレームレートが制限され、JPEG圧縮や画像処理も不安定になります。   
開発ボードは、ESP32-WROVER/ESP32-CAM等のPSRAM内蔵モデルを選択します。  

## プロジェクト設定 (`platformio.ini`)

プロジェクトの基本設定ファイル `platformio.ini` の内容を解説します。

```ini
[env:esp-wrover-kit]
platform = espressif32
board = esp-wrover-kit
framework = arduino
; OTA設定
upload_protocol = espota
upload_port = 192.168.0.66  # 対象ESP32のIPアドレス
monitor_speed = 115200
upload_flags =
    --auth=admin            # ArduinoOTAのパスワード
; PSRAM設定
build_flags =
    -DBOARD_HAS_PSRAM
    -mfix-esp32-psram-cache-issue
```

OTAの設定については[前回](/iot/internet-of-things-16/)で説明していますので、ここでの詳細説明は割愛します。  

`esp32-camera` ライブラリは「Arduino for ESP32」に含まれているため、platformio.ini での個別設定は不要です。  
メインプログラムに `#include "esp_camera.h"` を記述すれば、フレームワークの一部としてコンパイルされたヘッダファイルがデフォルトの検索パス内で見つかります。  

`esp32-camera` を使うには以下の設定が重要です。  
* `build_flags`:
  * `-DBOARD_HAS_PSRAM`: コンパイラに対してPSRAM搭載ボードであることを伝えるためのマクロ定義です。`esp32-camera` ドライバがフレームバッファにPSRAMを利用するために重要です。
  * `-mfix-esp32-psram-cache-issue`: PSRAM利用時のキャッシュ関連の問題を回避するためのコンパイラフラグです。（詳しくはESP32のPSRAM関連の制約に起因します）  

## サンプルプログラム

```c
#include <Arduino.h>
#include "esp_camera.h"                 // esp32-camera ライブラリを使用する宣言
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoOTA.h>

const char* ssid = "YOUR_SSID";         // 各自のWifi環境のSSIDを指定する
const char* password = "YOUR_PASSWORD"; // 各自のWifi環境のPasswordを指定する

// https://github.com/espressif/arduino-esp32/blob/master/libraries/ESP32/examples/Camera/CameraWebServer/camera_pins.h
// CAMERA_MODEL_WROVER_KIT の設定を使用
#define CAMERA_MODEL_WROVER_KIT

#if defined(CAMERA_MODEL_WROVER_KIT)
  #define PWDN_GPIO_NUM     -1
  #define RESET_GPIO_NUM    -1
  #define XCLK_GPIO_NUM     21
  #define SIOD_GPIO_NUM     26
  #define SIOC_GPIO_NUM     27

  #define Y9_GPIO_NUM       35
  #define Y8_GPIO_NUM       34
  #define Y7_GPIO_NUM       39
  #define Y6_GPIO_NUM       36
  #define Y5_GPIO_NUM       19
  #define Y4_GPIO_NUM       18
  #define Y3_GPIO_NUM        5
  #define Y2_GPIO_NUM        4
  #define VSYNC_GPIO_NUM    25
  #define HREF_GPIO_NUM     23
  #define PCLK_GPIO_NUM     22
#endif

// カメラの設定構造体
camera_config_t config;

// Webサーバーのインスタンスを作成
WebServer server(80);  // ポート番号は80を使用

// MJPEGストリームのヘッダ
const char* STREAM_HEADER = 
  "HTTP/1.1 200 OK\r\n"
  "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n"
  "\r\n";

// JPEGフレームのヘッダ
const char* FRAME_HEADER = 
  "--frame\r\n"
  "Content-Type: image/jpeg\r\n"
  "Content-Length: %d\r\n"
  "\r\n";

// ルートエンドポイント
const char* root_html = R"rawliteral(
  <form method='POST' action='/update' enctype='multipart/form-data'>
    <input type='file' name='update'>
    <input type='submit' value='Update'>
  </form>
  <p><a href='/stream'>Stream Video</a></p>
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

// JPEGストリームハンドル
void handleJPGStream() {
  WiFiClient client = server.client();
  if (!client.connected()) {
    Serial.println("Client disconnected");
    return;
  }

  camera_fb_t * fb = NULL;

  // MJPEGストリームのヘッダーを送信
  client.print(STREAM_HEADER);

  while (client.connected()) {
    // カメラのフレームをキャプチャ
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Camera capture failed");
      return;
    }

    // JPEGフレームのヘッダーを送信
    client.printf(FRAME_HEADER, fb->len);
    client.write(fb->buf, fb->len);  // JPEGデータを送信

    // フレームバッファを開放
    esp_camera_fb_return(fb);

    // 10 FPS: delay(100)
    // 20 FPS: delay(50)
    // 30 FPS: delay(33)
    delay(33);  // 次のフレームまで待機（FPS調整）
  }
}

void setup() {
  // シリアルモニタを初期化
  Serial.begin(115200);
  Serial.setDebugOutput(true);

  // PSRAMのサイズを確認
  if (ESP.getPsramSize()) {
    Serial.println("PSRAM is present.");
    Serial.print("PSRAM size: ");
    Serial.println(ESP.getPsramSize());
  } else {
    Serial.println("PSRAM is not present.");
  }

  // Wi-Fi接続
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());  // IPアドレスを表示

  // カメラ設定
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;

  config.xclk_freq_hz = 20 * 1000 * 1000;  // 20MHz
  config.frame_size = FRAMESIZE_SVGA;
  config.jpeg_quality = 12;  // 画質
  config.fb_count = 2;  // 複数のフレームバッファを使用
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;  // フレームバッファが空のときにキャプチャ
  config.pixel_format = PIXFORMAT_JPEG;  // 画像フォーマットをJPEGに設定
  config.fb_location = CAMERA_FB_IN_PSRAM;  // フレームバッファをPSRAMに配置

  // カメラ初期化
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
  
  // ルートエンドポイントでホームページを表示
  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html", root_html);
  });

  // /stream エンドポイントで映像をストリーム
  server.on("/stream", HTTP_GET, handleJPGStream);

  //update エンドポイントでファームウェアのアップデートを処理
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

  // サーバーを開始
  server.begin();
  Serial.println("Web server started!");
}

void loop() {
  ArduinoOTA.handle();
  server.handleClient();
}
```

## プログラム解説

OTAアップデート部分は[以前の記事](/iot/internet-of-things-16/)で紹介済なので、ここでは以下の2点のみ解説します。
* setup()関数の中のカメラ初期化部分
* handleJPGStream() 関数

### カメラ初期化設定（**`setup()` 関数**）

- **カメラ設定 (`camera_config_t config;`)**
  - **ピン設定**：  
    OV2640 などのカメラモジュールと ESP32 を接続するための各種 GPIO ピン（D0〜D7、XCLK、PCLK、VSYNC、HREF、SDA、SCL、RESET、PWDN）を `config` に割り当てます。
  - **クロック周波数**：  
    カメラに供給する外部クロック（XCLK）を **20MHz** に設定します。
  - **フレームサイズ (`FRAMESIZE_SVGA`)**：  
    画像のフレームサイズ（解像度）を **SVGA（800×600）** に設定します。
  - **JPEG品質 (`jpeg_quality = 12`)**：  
    JPEG圧縮の品質を指定します。値が小さいほど高画質（0: 高画質 ～ 63: 低画質）で、`12` は中程度の画質設定です。
  - **フレームバッファ数 (`fb_count = 2`)**：  
    フレームバッファを **2つ** 確保して連続した画像取得に対応します。
  - **取得モード (`CAMERA_GRAB_WHEN_EMPTY`)**：  
    フレームバッファが空のときのみ新しい画像を取得します。メモリ使用の効率化が期待できます。  
  - **ピクセルフォーマット (`PIXFORMAT_JPEG`)**：  
    JPEG形式で画像を出力し、データサイズを圧縮して通信や保存に適した形式にします。
  - **フレームバッファ位置 (`CAMERA_FB_IN_PSRAM`)**：  
    フレームバッファを PSRAM に配置することで、内蔵RAMの使用を抑えつつ大きなバッファを確保します。

- **カメラ初期化 (`esp_camera_init(&config)`) とエラーチェック**
    初期化には `esp_camera_init()` 関数を使用します。初期化に失敗した場合は、エラー内容をログに出力して処理を中断します。  

### JPEGストリーミング（**`handleJPGStream()` 関数**）

- **クライアント接続確認**  
  関数冒頭で `WiFiClient client = server.client();` により接続中のクライアントを取得し、`client.connected()` を使って接続状態をチェックします。  
  接続が切れていれば処理を中断します。

- **MJPEGの開始ヘッダー送信 (`STREAM_HEADER`)**  
  クライアントに対して multipart 形式のストリーム用ヘッダーを送信し、以降のJPEGフレームを連続的に送れるようにします。

- **ストリームループ処理**  
  クライアントが接続されている限り、以下の処理を繰り返します。
  - `esp_camera_fb_get()` によってカメラから1フレームをJPEG形式で取得します。
  - `client.printf(FRAME_HEADER, fb->len);` によって、1フレームごとのヘッダー（Content-Typeなど）を送信します。
  - `client.write(fb->buf, fb->len);` によってJPEGデータ本体をクライアントに送信します。
  - `esp_camera_fb_return(fb);` によりフレームバッファを開放し、次のフレーム取得に備えます。

- **フレームレート調整 (`delay(33)`)**  
  約30FPSのストリーミングを実現するため、フレーム間に **33ミリ秒** の遅延を入れています。  
  FPSを変更したい場合は `delay()` の値を変更することで調整可能です。

## 動作確認

Webブラウザから `http://<ESP32のIPアドレス>/` にアクセスし、アップデートフォームとストリームへのリンクが表示されることを確認します。  
`/stream` リンクをクリック（または直接 `http://<ESP32のIPアドレス>/stream` にアクセス）し、カメラ映像がストリーミングされることを確認します。  

ストリーミング配信された映像は以下のような感じでした。  
![](https://gyazo.com/03a33c1e13bf50670b03c94112511fc4.png)

お世辞にも綺麗とは言えないですね（笑）  
もう少し調整できるかもしれませんが、今のところはここまでにしておきます。  

## 発生した問題と解決策

* ESP32-WROVER-EのカメラPIN設定
　なかなか探せずに非常に悩みました。
　最終的に[ここ](https://github.com/espressif/arduino-esp32/blob/master/libraries/ESP32/examples/Camera/CameraWebServer/camera_pins.h)から「`CAMERA_MODEL_WROVER_KIT`」設定を拝借しました。  

* 謎のRAM「PSRAM」
　何をするものかさっぱりわからずに、これもググりまくりました。  
どうやら「Pseudo Static RAM（擬似静的RAM）」というものらしく、文字を読んでも何のことだかわかりません。  
　ESP32に内蔵されているRAMは約520KBとかなり限られていて、画像処理や音声処理などをやろうとするとすぐに足りなくなります。  
　そこで登場するのがこのPSRAMです。外部に接続されたメモリチップで、追加で4MB〜8MB程度のRAMを確保できるようになります。  
　「じゃあ最初からもっとRAMを積んでくれれば…」と思いますが、コストや消費電力、チップサイズとのバランスを取るとこうなるんでしょうね。  
　カメラを使う場合には、このPSRAMがほぼ必須です。  
　JPEG画像を数フレーム分バッファに持つとなると、内蔵RAMだけでは全然足りません。`camera_config_t` の `fb_location = CAMERA_FB_IN_PSRAM` という設定も、まさにそのためのものです。  
　PSRAMを使ってフレームバッファを確保しないと、まともに動きません。
　というわけで、よくわからないまま「PSRAM付きモデル」を買っていた自分に感謝です（笑）。  

* カメラ設定の初期値
　とにかく「トライ＆エラー」です（笑）。
　解像度をSVGAより上にするとコマ落ちが激しく、かなり厳しいです。  
　実験用と思って割り切って使ってます。  

## まとめ

VSCode＋PlatformIOを使い、ESP32-WROVER-EとOV2640カメラでJPEGストリーミングを実装できました。  
Arduinoの手軽さとESP-IDFのカメラドライバ `esp32-camera` を組み合わせることで、比較的容易に高機能なアプリケーションが開発できることを示しました。

[IoTに関するチュートリアルや実践テクニックをまとめています。](/iot/)

IoT活用の参考になれば幸いです。

<style>
img {
    border: 1px gray solid;
}
</style>
