---
title: IoT を使ってみる（その１７：ESP32 OTAの基本を徹底解説：フラッシュメモリ構成から動作の仕組みまで）
author: shuichi-takatsu
date: 2025-04-30
tags: [esp32, ota, platformio]
image: true
---

[前回](/iot/internet-of-things-16/)は、ESP32 を使って "OTA (Over The Air)" に挑戦しました。  
順番は前後しましたが、今回は OTA の基本的な仕組みについて、改めて詳しく解説します。

## はじめに

ESP32は、無線経由でプログラムを書き換える「Over The Air（OTA）」機能を標準サポートしています。  
本記事では、**フラッシュメモリの構成**や**OTAの動作の仕組み**に踏み込み、「なぜ2つのアプリ領域が必要なのか？」「どうやって更新後のアプリを選んで起動しているのか？」といった疑問に答えます。

## OTAを支える仕組み

### フラッシュメモリの構成

ESP32のフラッシュメモリは「パーティションテーブル」で管理されています。  
パーティションとは、フラッシュメモリ上の領域の「区切り」です。

PlatformIOで「Arduinoフレームワーク」を指定している場合、パーティションテーブル情報は以下のフォルダに含まれています。  
`＜ユーザーフォルダパス＞\.platformio\packages\framework-arduinoespressif32\tools\partitions`

上記のフォルダの中に `default.csv` ファイルが格納されています。
このファイルにデフォルトで選択されるパーティションテーブル情報が格納されています。  
私の環境では以下のように設定されていました。  

| Name     | Type | SubType | Offset   | Size    | Flags |
|:---------|:-----|:--------|:---------|:--------|:------|
| nvs      | data | nvs     | 0x9000   | 0x5000  |       |
| otadata  | data | ota     | 0xe000   | 0x2000  |       |
| app0     | app  | ota_0   | 0x10000  | 0x140000|       |
| app1     | app  | ota_1   | 0x150000 | 0x140000|       |
| spiffs   | data | spiffs  | 0x290000 | 0x160000|       |
| coredump | data | coredump| 0x3F0000 | 0x10000 |       |

各パーティションの役割は以下のとおりです。  
- **nvs** : NVSストレージ（Non-Volatile Storage）。設定やユーザーデータなどの永続的な保存領域。電源が切れてもデータが保持されます。
- **otadata** ：OTA（Over-The-Air）アップデートの状態を管理。どちらのアプリケーション領域（ota_0またはota_1）を起動するかを示します。
- **app0 / app1** ：OTAアップデート用のアプリケーション領域。OTA更新時には、app0 と app1 が交互に使用されます。一方が実行中の場合、もう一方が更新対象となります。  
- **spiffs** : SPIFFS（Serial Peripheral Interface Flash File System）を使用したファイル保存領域。設定ファイルやログなどのデータを保存します。
- **coredump** : コアダンプ領域。システム障害（クラッシュなど）発生時にメモリダンプを保存し、後で障害解析に使用されます。

また、フラッシュメモリマップ は以下のようになります。  
アプリ領域は OTA に対応するため「2つ（app0 と app1）」用意されており、交互に書き換えて使用されます。  

それぞれの領域に対応したアプリ、データが書き込まれます。  
なお、OTAにより新しいアプリを書き込む際、現在実行中の領域とは別のスロット（app0またはapp1）に書き込むことで、失敗時に前の状態へ戻すフェイルセーフ機構が働きます。


| 開始アドレス | 終了アドレス | サイズ    | 名前      | タイプ     | サブタイプ | 備考                  |
|--------------|--------------|-----------|-----------|------------|------------|-----------------------|
| 0x00000000   | 0x00007FFF   | 0x8000    | bootloader| -          | -          | ブートローダー        |
| 0x00008000   | 0x00008FFF   | 0x1000    | partition | -          | -          | パーティションテーブル |
| 0x00009000   | 0x0000DFFF   | 0x5000    | nvs       | data       | nvs        | NVSストレージ         |
| 0x0000E000   | 0x0000FFFF   | 0x2000    | otadata   | data       | ota        | OTAデータ             |
| 0x00010000   | 0x0014FFFF   | 0x140000  | app0      | app        | ota_0      | OTAスロット 0         |
| 0x00150000   | 0x0028FFFF   | 0x140000  | app1      | app        | ota_1      | OTAスロット 1         |
| 0x00290000   | 0x003EFFFF   | 0x160000  | spiffs    | data       | spiffs     | SPIFFSファイルシステム |
| 0x003F0000   | 0x003FFFFF   | 0x10000   | coredump  | data       | coredump   | コアダンプ領域        |

（注：Flash全体は通常 4MB（= 0x400000）を想定）

Arduinoフレームワーク含むESP32用開発環境では、パーティションテーブル自体（partition-table.bin）は常にフラッシュの 0x8000 に書き込まれるのがデフォルトです。  

### ブートローダーの動き

Arduinoフレームワークを前提にしますが、ESP32の起動時、まずROM内蔵の第1ブートローダーが動作します。  
その後、フラッシュに書き込まれたユーザー定義の bootloader.bin を読み込んで処理を続行します。  

- UARTブートの確認（開発モード）  
最初に、UART（シリアル）経由での書き込みモードが要求されていないかを確認します。これにより、PCからの書き込み要求があればファームウェアの書き換えに移行します。

- フラッシュメモリの初期化とパーティションテーブルの読み込み
フラッシュメモリの先頭（0x0000）にはブートローダーが書き込まれており、ブートローダーは0x8000 にあるパーティションテーブルを読み込んで、アプリケーションの起動処理を行います。

- otadata の読み取り（OTA構成時）
otadata パーティション（デフォルトでは 0xE000）から、最後に正常に起動したアプリケーションの情報や、次回起動すべきアプリケーションの情報を読み取ります。

- 適切なアプリケーション領域を決定
読み取った情報に基づいて、通常は ota_0 または ota_1 のどちらかのアプリケーション領域を選択します。

- フォールバック（代替）処理
otadata に有効な情報がない場合、またはアプリケーション領域の検証に失敗した場合、以下のようなフォールバック動作が行われます。  
  - factory パーティション（※後述）が存在すれば、そちらを起動。
  - それもなければ、ブート失敗として停止、またはリセット。

- アプリケーションのロードと実行
選択されたアプリケーションのフラッシュ領域から、コードをRAMにロードし、実行を開始します。

factory パーティションについての補足です。  
- Arduinoでは標準で使用されないことが多いですが、OTA機能を使わない構成では factory のみを使うことも可能です。
- factory パーティションはデフォルトのアプリケーションとして動作します。
- OTA構成では、ota_0 / ota_1 による二重構成が推奨され、factory は省略される場合もあります。

## OTAの流れ

ESP32のOTA（Over-The-Air）によるアップデートは、以下のようなステップで進行します。

- 新しいファームウェアを受信
Wi-FiやHTTP経由で、新しい .bin ファイル（ファームウェア）を受信します。

- 書き込み先の決定
現在動作していない方のアプリ領域（たとえば、現在 ota_0 で動作中なら ota_1）を選び、そこにファームウェアを書き込みます。

- 書き込み完了後、otadataを更新
書き込みが成功すると、次回の起動で新しい領域が使われるように otadata セクションが更新されます。

- 再起動して新ファームウェアを実行
デバイスを再起動し、新しいファームウェアを使って起動します。

- 起動失敗時のロールバック
起動後に問題が検出された場合、自動的に以前の正常なファームウェア領域にロールバックする仕組みがあります。

## なぜ2スロットなのか？

OTAアップデートは「失敗する可能性」がある操作です。電源断やネットワーク切断により、バイナリの一部しか書き込めなかった場合でも、前のアプリが残っていれば復旧できます。

このように「現在のアプリを残したまま、新しいアプリを書き込む」という冗長性が、OTAの信頼性を高めています。  
これはファームウェア更新において極めて重要な設計思想です。

## よくある誤解とトラブル例

### 「factory領域が使われない」問題

一度OTAを実施すると、以降は基本的に**ota_0**と**ota_1**の間で切り替えが続きます。  
**factory領域**は、あくまで「初回起動時」または「非常時のリカバリー用途」として使用されます。

### 「パーティション足りない」問題

OTAを利用する場合は、**2つのOTAスロット（ota_0 と ota_1）** のための領域を確保する必要があります。
領域が不足していると、OTAの更新用ファームを書き込むことができず、エラーになります。

### 「起動ループ」問題

新しいファームウェアを書き込んでも、起動に失敗するとリブートループに陥る場合があります。
これを防ぐためには、アプリケーションの検証とロールバック処理を設計に組み込むことが推奨されます。  
ESP-IDFの以下の関数が有効です。（この関数は Arduinoフレームワークでも利用できます）  
```c
esp_ota_mark_app_valid_cancel_rollback();
```
上記の関数をアプリケーションが「正常に起動・動作した」と判断できるタイミングで呼び出すことで、ロールバックのフラグを解除し、以降の起動時にも現在のファームウェアが使用され続けます。

ただし、次の条件が満たされている必要があります。

- Partition Table が OTA対応（ota_0 / ota_1 含む）
default_ota.csv やカスタムで2スロット分あること。

- esp_ota_set_boot_partition() などで書き換えた後に、再起動していること
アプリ起動後、検証フェーズ中に esp_ota_mark_app_valid_cancel_rollback() を呼ぶ必要があります。

#### サンプルプログラム

[前回](/iot/internet-of-things-16/)作成したプログラムに `esp_ota_mark_app_valid_cancel_rollback()` を組み込んでみました。  
追加したソースコードは以下の２点です。  
```cpp
#include "esp_ota_ops.h"
```
```cpp
  if (WiFi.waitForConnectResult() == WL_CONNECTED) {
    esp_ota_mark_app_valid_cancel_rollback();
    Serial.println("Marked as valid, rollback canceled");
  }
```

ロールバック処理を組み込んだ完成版プログラムは以下です。  
```cpp
#include <Arduino.h>

#include <WiFi.h>
#include <WebServer.h>
#include <Update.h>
#include <ArduinoOTA.h>
#include "esp_ota_ops.h"

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

  // WiFi接続完了後など、安全なタイミングで呼ぶ
  if (WiFi.waitForConnectResult() == WL_CONNECTED) {
    esp_ota_mark_app_valid_cancel_rollback();
    Serial.println("Marked as valid, rollback canceled");
  }

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

プログラムが起動すると、以下のようなログが出力されます。  
```shell
.WiFi connected
IP address: 192.168.0.65
Marked as valid, rollback canceled
```

## 実運用に向けたアドバイス

- OTAは小さな差分ではなく**ファーム全体**を書き換えるので、ファームサイズを意識する
- 受信エラーに備えて**リトライ回数**や**タイムアウト設定**を慎重に設計する
- アプリに**バージョン番号**を持たせ、OTA対象と現行ファームの**互換性チェック**を行う
- 工場出荷状態に戻せるよう、**リセットモード（ボタン長押しなど）** を用意する

## デフォルト以外のパーティションテーブル

最新のパーティションテーブル情報は次の[リポジトリ](https://github.com/espressif/arduino-esp32)にある `tools/partitions/` フォルダで確認します。  

デフォルトパーティションテーブル以外で、代表的なパーティションテーブルを紹介します。

| ファイル名            | 内容                                           |
|:-----------------------|:-----------------------------------------------|
| `minimal.csv`           | 最小構成（SPIFFSなし、OTAなし）                |
| `no_ota.csv`            | OTA機能なし（アプリ1つだけ）                   |
| `huge_app.csv`          | 巨大なアプリ向け（アプリ領域を最大化）          |
| `minimal_spiffs.csv`    | 最小SPIFFSあり（最小限ファイルシステムも欲しい場合） |

### platformio.ini での指定方法

デフォルトパーティションテーブル以外のパーティションデーブルを使用する場合、platformio.ini ファイルに以下のように設定します。  
（例は `huge_app.csv`）

```ini
board_build.partitions = huge_app.csv
```

以前、ESP32のカメラ付き開発キット（ESP32-WROVER-E）を使っていた時、カメラモジュールを組み込んだプログラムはサイズがかなり大きくなりました。  
パーティションテーブルのアプリ領域を大きくする必要があったことから、何も知らずに「huge_app.csv」を使ってドツボにハマった経験があります。
ちなみに `huge_app.csv` のパーティションテーブルは以下のようになっています。  

| Name     | Type | SubType | Offset   | Size    | Flags |
|----------|------|---------|----------|---------|-------|
| nvs      | data | nvs     | 0x9000   | 0x5000  |       |
| otadata  | data | ota     | 0xe000   | 0x2000  |       |
| app0     | app  | ota_0   | 0x10000  | 0x300000|       |
| spiffs   | data | spiffs  | 0x310000 | 0xE0000 |       |
| coredump | data | coredump| 0x3F0000 | 0x10000 |       |

`ota_0` しか定義がなく、`ota_1`がありません。
このため、OTA すると失敗します。  

## まとめ

ESP32のOTAは、仕組みを理解すればそれほど難しくありません。
ポイントは「パーティション設計」と「エラーリカバリ設計」です。  
しっかり作り込めば、安定して無線アップデートができる強力なシステムになります。

[IoTに関するチュートリアルや実践テクニックをまとめています。](/iot/)

IoT活用の参考になれば幸いです。

<style>
img {
    border: 1px gray solid;
}
</style>
