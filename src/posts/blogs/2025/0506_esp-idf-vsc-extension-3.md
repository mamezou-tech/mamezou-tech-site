---
title: IDF Component ManagerとKconfig設定でハマった話（VSCode＋ESP-IDF拡張機能）
author: shuichi-takatsu
date: 2025-05-06
tags: [vscode, esp32, esp-idf, cmake, sdkconfig, kconfig]
image: true
---

前回、「[ESP-IDFプロジェクトの構成とCMakeの仕組みを徹底解説！（VSCode＋ESP-IDF拡張機能）](/blogs/2025/05/03/esp-idf-vsc-extension-2/)」という記事を書きました。  
その後、気をよくしていろいろ試していくうちに、**esp32-camera**コンポーネントを使ってカメラサーバーを作ろうとして盛大にハマったので、その体験談をまとめてみました。  

## 開発環境

開発環境は以下の通りです。
- OS: Ubuntu 24.04 (WSL2)
- IDE: VSCode + ESP-IDF拡張機能「Espressif IDF」
- ESP-IDF バージョン: **v5.4.1**
- ターゲット: ESP32-WROVER-E開発ボード（PSRAMあり）

## ハマりポイント その１「`idf_component.yml`」の存在

`esp32-camera` コンポーネントを使うには、まずプロジェクトに`esp32-camera`コンポーネントを追加する必要があります。  

最初に CMakeLists.txt ファイルに `esp32-camera` を設定しましたが、ビルドが通りませんでした。
```cmake
idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS "."
                    REQUIRES 
                        esp_wifi 
                        esp_netif 
                        esp_timer 
                        nvs_flash 
                        esp_psram 
                        esp32-camera # <-- ESP32-CAM camera driver を追加しただけではNG
                        esp_http_server)
```

ESP-IDF v4.1 以降、コンポーネント管理の方法として **[IDF Component Manager](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-guides/tools/idf-component-manager.html)** が導入されました。  
以前のように `components` フォルダに手動で `git clone` する方法も使えますが、推奨されているのはマニフェストファイル（`idf_component.yml`）を使った管理です。  

最初は、古い情報や他のプロジェクトを参考に `idf.py add-component` コマンドを試しましたが、エラーが発生しました。 
どうやら `add-component`コマンドは現在廃止されているようです。  

調べていくうちに、コンポーネント登録のコマンドは `add-dependency` であることがわかりました。  
`esp32-camera` コンポーネントを追加するには、プロジェクトのルートで以下のコマンドを実行します。
（ここでは「esp32-camera^2.0.15」を指定しています）  
```bash
idf.py add-dependency "espressif/esp32-camera^2.0.15"
```

また、バージョン指定なしの場合は以下のように実行します。 (最新の安定版などが選択されます)  
```bash
idf.py add-dependency "espressif/esp32-camera"
```

コマンドを実行すると、`main/`フォルダ内に `idf_component.yml` ファイルが作成されます。  
```cmake
my_project/
├── main/
│   ├── CMakeLists.txt
│   ├── idf_component.yml   ← 作成された idf_component.yml ファイル
│   └── main.c
└── ...
```

生成された `idf_component.yml` は以下のようになっています。
```yaml
## IDF Component Manager Manifest File
dependencies:
  ## Required IDF version
  idf:
    version: '>=4.1.0'
  # # Put list of dependencies here
  # # For components maintained by Espressif:
  # component: "~1.0.0"
  # # For 3rd party components:
  # username/component: ">=1.0.0,<2.0.0"
  # username2/component2:
  #   version: "~1.0.0"
  #   # For transient dependencies `public` flag can be set.
  #   # `public` flag doesn't have an effect dependencies of the `main` component.
  #   # All dependencies of `main` are public by default.
  #   public: true
  espressif/esp32-camera: ^2.0.15
```

各フィールドの意味は以下です。  
* `dependencies`： このセクションでは、このプロジェクトが依存するコンポーネント（ライブラリ）を列挙します。
* `idf`： ESP-IDF の要件を示します。
  * `version: '>=4.1.0'` は「ESP-IDFのバージョンが 4.1.0 以上である必要がある」ことを意味します。
* `espressif/esp32-camera: ^2.0.15`： Espressifが提供する `esp32-camera` コンポーネントを使用することを宣言しています。
  * `^2.0.15` はセマンティックバージョニングに基づく指定で「2.0.15 以上、3.0.0 未満のバージョンを使用する」ことを意味します。

コメント部分には以下のように書かれています。
* サードパーティ製のコンポーネントも指定可能です。
* `public: true` を使うと、他のコンポーネントからもこの依存が見えるようになります（`main` コンポーネントでは常に `public` 扱いとなるため、指定する必要はありません）。

不思議なことに、`idf_component.yml` にコンポーネントを定義しただけで、CMakeLists.txt 側に `esp32-camera` を追加しなくてもビルドが通るようになりました。  
このあたりの挙動はかなり不思議ですが、私は安全策を取って、CMakeLists.txt にもコンポーネントを登録するようにしています。  

## ハマりポイント その２ 「`managed_components`フォルダ」が勝手に生成される

`idf_component.yml` を作成し、`idf.py build` または `idf.py reconfigure` を実行すると、`managed_components/esp32-camera` フォルダが自動的に生成されます。

最初は「あれ？ components/ フォルダに入るんじゃないの？」と混乱しました。  
コンポーネントのソースコードは、`components` フォルダではなく、`managed_components` というフォルダの中にダウンロードされるのです。
これは、ESP-IDF の「Dependency Manager」の仕様のようです。  
`idf_component.yml` を作成しておけば、ローカルにコンポーネントが無くてもインターネットから自動で取ってきてくれる仕組みです。  

ESP-IDF拡張機能の「Components Manager」からコンポーネントを追加しても同じ挙動になります。  

「Components Manager」を選択します。
![](https://gyazo.com/ab50f04f34eee46ebf5ae09ec5bdf689.png)

ESP Registry で「`espressif/esp32-camera`」を検索します。  
![](https://gyazo.com/bf95bcbe8e1dfca902231d7b4d0fcd5b.png)

「install」ボタンを押します。  
![](https://gyazo.com/b08670f4e4bd40f7493e106e6b7195c6.png)

コマンドライン と GUIからの操作（Components Manager）では以下のような差があります。  
- コマンドラインから `idf.py add-dependency` した場合は、`idf.py build` または `idf.py reconfigure` を実行するまで `managed_components` フォルダは追加されません。  
- ESP-IDF拡張機能の「Components Manager」からコンポーネントをインストールした場合は、自動的にプロジェクトに `managed_components` フォルダが作成され、`idf_component.yml` ファイルも追加されます。  

`esp32-camera` コンポーネントを追加した場合、フォルダパスは `managed_components/espressif__esp32-camera` のようになります。
```cmake
my_project/
├── main/
│   ├── CMakeLists.txt
│   ├── idf_component.yml
│   └── main.c
├── CMakeLists.txt
├── managed_components/     <-- この下にコンポーネントが追加される
│   └── espressif__esp32-camera/
│       ├── CMakeLists.txt
│       ├── Kconfig
│       └── ... 
├── sdkconfig
└── ...
```

ちなみに **`remove-dependency` コマンドは存在しません**。
コンポーネントを削除する手順は以下です。
- `managed_components` フォルダを手動削除
- `idf_component.yml` ファイル手修正
- `idf.py reconfigure` コマンドを実行

## ハマりポイント その３ `sdkconfig.defaults` が反映されない

プロジェクトの初期設定として使う `sdkconfig.defaults` ファイルですが、ここでもハマりました。    
私は `sdkconfig.defaults` ファイルに Wi-FiのSSID/PASSWORD設定を以下のように記述していました。  
```text
CONFIG_ESP_WIFI_SSID="myssid"
CONFIG_ESP_WIFI_PASSWORD="mypassword"
```

ところが、何度フルビルドしても、`sdkconfig` に設定が反映されません。  

色々と調べた結果、理由は非常にシンプルなものでした。  
`sdkconfig.defaults` の役割は **既に定義済みの設定にデフォルト値を設定する** ことであって、**新規の定義を追加はしない** からでした。  

そのため新規の定義については、あらかじめ `Kconfig.projbuild` か `Kconfig` に定義を追加しておく必要があります。  

正しい流れは以下のようになります。
例として「開発チームで `CONFIG_USE_LED` という定義を使用する」と仮定します。  

### ステップ1：`Kconfig.projbuild` （または `Kconfig`）を作成する

USE_LEDの定義を `Kconfig.projbuild` に以下のように記述します。  
（注： `Kconfig.projbuild` には 「USE_LED」のように「CONFIG_」を除いた部分を記述します）

ここでは「default n（無効）」に設定します。
```kconfig
menu "USE LED Configuration"

    config USE_LED
        bool "Use LED"
        default n           # デフォルトを無効に設定する
    
endmenu
```
`Kconfig.projbuild` ファイルは main フォルダ直下に置きます。  
```cmake
my_project/
├── main/
│   ├── ...
│   ├── Kconfig.projbuild      ← 新しい設定項目を定義する
│   └── ...
└── ...
```

### ステップ2：`sdkconfig.defaults` に上書きデフォルト値を記述する

チームとしての設定を「y（有効）」にしたいとします。  
その場合は、以下のように設定します。
```text
# ===== チームで利用する LED設定
CONFIG_USE_LED=y
```
`sdkconfig.defaults` ファイルはプロジェクトのルートに置きます。  
```cmake
my_project/
├── main/
│   ├── ...
│   ├── Kconfig.projbuild      ← 新しい設定項目を定義する
│   └── ...
├── ...
├── sdkconfig.defaults          ← 既存の設定項目の上書きデフォルト値を記述する
└── ...
```

このようにすると、`menuconfig` を開いたときに設定項目が表示され、内容も「y（有効）」と表示されます。  
![](https://gyazo.com/c7fa6f6e1b6c218749c8dcc2ad03b579.png)

`sdkconfig.defaults` の内容が `sdkconfig` に反映されます。  

## 今回のハマりポイントまとめ

今回ハマったポイントをまとめると以下です。  
| ポイント | 説明 |
|----------|------|
| `idf_component.yml` | コンポーネントの導入に必須です。誤って消すとビルドできません。 |
| `managed_components` | 自動生成される依存コンポーネントの保存先です。仕様通りの動きです。 |
| `sdkconfig.defaults` | あくまで「**既存の**設定項目のデフォルト値」を記述する場所です。 |
| `Kconfig.projbuild` | 新しい設定項目を定義する場所です。`menuconfig` にも反映されます。 |

```cmake
my_project/
├── main/
│   ├── CMakeLists.txt
│   ├── idf_component.yml       ← コンポーネントの導入に必須
│   ├── Kconfig.projbuild       ← 新しい設定項目を定義する
│   └── main.c
├── CMakeLists.txt
├── sdkconfig.defaults          ← 既存の設定項目の上書きデフォルト値を記述する
├── sdkconfig
├── managed_components/         ← この下にコンポーネントが追加される
│   └── espressif__esp32-camera/
│       ├── CMakeLists.txt
│       ├── Kconfig
│       └── ... (ソースファイルなど)
└── ...
```

## おまけ「`esp32-camera` を使ったシンプルなカメラサーバー」

本記事を書くきっかけとなった「`esp32-camera` を使ったシンプルなカメラサーバー」の設定ファイルとソースコードを以下に記述します。  

### プロジェクト構成

プロジェクトの構成は以下です。
- プロジェクト名： esp32_wrover_e_camera
- 開発ボード： ESP32-WROVER-E 開発ボード（PSRAM 8MB版）
- カメラモジュール：OV2640

```cmake
esp32_wrover_e_camera/
├── main/
│   ├── CMakeLists.txt
│   ├── idf_component.yml
│   ├── Kconfig.projbuild 
│   └── main.c
├── sdkconfig.defaults
├── CMakeLists.txt
└── ...
```

開発ボード（ESP32-WROVER-E）やカメラモジュール（OV2640）、ストリーミング設定方法などは、[他の記事（VSCode＋PlatformIO＋Arduinoフレームワーク）](/iot/internet-of-things-18/)で紹介していますので、ここでの詳細な説明は割愛します。
（ArduinoフレームワークではPSRAMが4MBまでしか使用できませんでしたが、ESP-IDFではちゃんと8MBまで認識されているようです）  

### 使い方

menuconfig を使って Wi-FiのSSID/PASSWORDを設定します。  
ビルド後、デバイスにプログラムをアップロードした後、`http://＜ESP32のIPアドレス＞/stream` に接続すればカメラからの映像を確認できるはずです。

それぞれのファイルの内容を以下に記述します。  

### main/CMakeLists.txt
```cmake
idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS "."
                    REQUIRES 
                        esp_wifi 
                        esp_netif 
                        esp_timer 
                        nvs_flash 
                        esp_psram 
                        esp32-camera # <-- ※ここに追記しなくてもビルドが通る不思議
                        esp_http_server)
```

### main/idf_component.yml
```yml
dependencies:
  idf:
    version: '>=4.1.0'
  espressif/esp32-camera: ^2.0.15
```

### main/Kconfig.projbuild
```Kconfig
menu "Wi-Fi Configuration"

    config ESP_WIFI_SSID
        string "WiFi SSID"
        default "myssid"
    
    config ESP_WIFI_PASSWORD
        string "WiFi Password"
        default "mypassword"
    
endmenu
```

### main/main.c
```c
#include "esp_psram.h"
#include "esp_camera.h"
#include "esp_log.h"
#include "esp_http_server.h"
#include "esp_timer.h"
#include "esp_system.h"
#include "nvs_flash.h"
#include "driver/gpio.h"
#include "esp_netif.h"
#include "esp_wifi.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "CAM_SERVER";

// https://github.com/espressif/arduino-esp32/blob/master/libraries/ESP32/examples/Camera/CameraWebServer/camera_pins.h
// CAMERA_MODEL_WROVER_KIT の設定を使用
#define CAMERA_MODEL_WROVER_KIT

#if defined(CAMERA_MODEL_WROVER_KIT)
#define PWDN_GPIO_NUM -1
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 21
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27

#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 19
#define Y4_GPIO_NUM 18
#define Y3_GPIO_NUM 5
#define Y2_GPIO_NUM 4
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22
#endif

esp_err_t jpg_stream_http_handler(httpd_req_t *req)
{
    camera_fb_t *fb = NULL;
    esp_err_t res = ESP_OK;

    res = httpd_resp_set_type(req, "multipart/x-mixed-replace; boundary=frame");

    while (true)
    {
        fb = esp_camera_fb_get();
        if (!fb)
        {
            ESP_LOGE(TAG, "Camera capture failed");
            res = ESP_FAIL;
            break;
        }

        char *part_buf = heap_caps_malloc(64, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
        if (!part_buf)
        {
            ESP_LOGE(TAG, "PSRAM allocation failed for part_buf");
            return ESP_FAIL;
        }
        size_t hlen = snprintf(part_buf, 64,
                               "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n",
                               fb->len);

        res = httpd_resp_send_chunk(req, part_buf, hlen);
        res |= httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);
        res |= httpd_resp_send_chunk(req, "\r\n", 2);
        esp_camera_fb_return(fb);

        if (res != ESP_OK)
            break;
    }

    return res;
}

// Webサーバー起動
static httpd_handle_t start_webserver()
{
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.max_uri_handlers = 16;
    config.stack_size = 8192;
    config.core_id = 0;

    httpd_handle_t server = NULL;
    if (httpd_start(&server, &config) == ESP_OK)
    {
        httpd_uri_t stream_uri = {
            .uri = "/stream",
            .method = HTTP_GET,
            .handler = jpg_stream_http_handler,
            .user_ctx = NULL};
        httpd_register_uri_handler(server, &stream_uri);
    }
    return server;
}

void init_camera()
{
    camera_config_t config = {
        // カメラ設定
        .ledc_channel = LEDC_CHANNEL_0,
        .ledc_timer = LEDC_TIMER_0,
        .pin_d0 = Y2_GPIO_NUM,
        .pin_d1 = Y3_GPIO_NUM,
        .pin_d2 = Y4_GPIO_NUM,
        .pin_d3 = Y5_GPIO_NUM,
        .pin_d4 = Y6_GPIO_NUM,
        .pin_d5 = Y7_GPIO_NUM,
        .pin_d6 = Y8_GPIO_NUM,
        .pin_d7 = Y9_GPIO_NUM,
        .pin_xclk = XCLK_GPIO_NUM,
        .pin_pclk = PCLK_GPIO_NUM,
        .pin_vsync = VSYNC_GPIO_NUM,
        .pin_href = HREF_GPIO_NUM,
        .pin_sccb_sda = SIOD_GPIO_NUM,
        .pin_sccb_scl = SIOC_GPIO_NUM,
        .pin_reset = RESET_GPIO_NUM,
        .pin_pwdn = PWDN_GPIO_NUM,

        .xclk_freq_hz = 20 * 1000 * 1000,  // 20MHz
        .frame_size = FRAMESIZE_SVGA,      // 800x600
        .jpeg_quality = 10,                // 1-63 (低いほど高画質)
        .fb_count = 3,                     // トリプルバッファ
        .grab_mode = CAMERA_GRAB_LATEST,   // 最新フレームを優先
        .fb_location = CAMERA_FB_IN_PSRAM, // フレームバッファをPSRAMに配置
        .pixel_format = PIXFORMAT_JPEG,    // 画像フォーマットをJPEGに設定
    };

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Camera init failed: 0x%x", err);
        abort();
    }

    // 低照度環境向け設定
    sensor_t *s = esp_camera_sensor_get();
    if (s)
    {
        s->set_brightness(s, 1); // 明るさ (+1 to +2)
        s->set_contrast(s, 1);   // コントラスト (0 to +2)
        s->set_saturation(s, 0); // 彩度 (-2 to +2)
    }
}

// Wi-Fiイベントハンドラ
void wifi_event_handler(void *arg, esp_event_base_t event_base,
                        int32_t event_id, void *event_data)
{
    if (event_base == WIFI_EVENT)
    {
        if (event_id == WIFI_EVENT_STA_START)
        {
            esp_wifi_connect();
        }
        else if (event_id == WIFI_EVENT_STA_DISCONNECTED)
        {
            ESP_LOGI(TAG, "Wi-Fi disconnected, retrying...");
            vTaskDelay(5000 / portTICK_PERIOD_MS);
            esp_wifi_connect();
        }
    }
    else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP)
    {
        ip_event_got_ip_t *event = (ip_event_got_ip_t *)event_data;
        ESP_LOGI(TAG, "Got IP: " IPSTR, IP2STR(&event->ip_info.ip));
    }
}

// Wi-Fi初期化
void wifi_init_sta()
{
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, NULL));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL, NULL));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = CONFIG_ESP_WIFI_SSID,
            .password = CONFIG_ESP_WIFI_PASSWORD,
            .threshold.authmode = WIFI_AUTH_WPA2_PSK,
        },
    };

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());
}

void app_main(void)
{
    // 初期化
    ESP_ERROR_CHECK(nvs_flash_init());
    wifi_init_sta();

// PSRAMを使用してPSRAMのサイズを確認
#if CONFIG_SPIRAM
    if (esp_psram_is_initialized())
    {
        size_t size = esp_psram_get_size();
        ESP_LOGI(TAG, "PSRAM Size: %.2f MB", (float)size / (1024 * 1024));

        // PSRAMメモリ割当テスト
        void *test_ptr = heap_caps_malloc(1024, MALLOC_CAP_SPIRAM);
        if (test_ptr)
        {
            ESP_LOGI(TAG, "PSRAM allocation test passed");
            free(test_ptr);
        }
        else
        {
            ESP_LOGE(TAG, "PSRAM allocation failed!");
        }
    }
    else
    {
        ESP_LOGW(TAG, "PSRAM support disabled");
    }
#else
    ESP_LOGW(TAG, "Running without PSRAM - performance may be degraded");
#endif

    // カメラ初期化
    init_camera();

    // Webサーバー起動
    start_webserver();

    ESP_LOGI(TAG, "Camera streaming server started");
}
```

### sdkconfig.defaults 
```sdkconfig
# ===== PSRAM 基本設定 =====
CONFIG_ESP32_SPIRAM_SUPPORT=y
CONFIG_SPIRAM=y
CONFIG_SPIRAM_MODE_QUAD=y       # WROVER-EはQuadモード必須
CONFIG_SPIRAM_SPEED_80M=y       # 80MHz推奨
CONFIG_SPIRAM_BOOT_INIT=y       # ブート時初期化(必須)
CONFIG_SPIRAM_IGNORE_NOTFOUND=y # PSRAM未検出時も続行

# ===== メモリ最適化 =====
CONFIG_SPIRAM_MALLOC_ALWAYSINTERNAL=16384  # 内部RAM優先
CONFIG_SPIRAM_USE_MALLOC=y      # mallocでPSRAM使用
CONFIG_SPIRAM_USE_CAPS_ALLOC=y  # heap_caps_malloc()対応

# ===== フラッシュ設定 =====
CONFIG_ESPTOOLPY_FLASHSIZE_4MB=y
CONFIG_ESPTOOLPY_FLASHSIZE="4MB"
CONFIG_PARTITION_TABLE_OFFSET=0x10000  # 必須オフセット

# ===== パフォーマンスチューニング =====
CONFIG_SPIRAM_CACHE_WORKAROUND=y  # キャッシュ問題対策
CONFIG_SPIRAM_FETCH_RESOURCE_OVER_4BYTE_LEN=y  # 4byte超アクセス
```

### CMakeLists.txt
```cmake
cmake_minimum_required(VERSION 3.5)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(esp32_wrover_e_camera)      # 各自のプロジェクト名に合わせて変更してください
```

## まとめ

最新ESP-IDF(v5.x)でのカメラサーバー構築は、IDF Component Manager (idf_component.yml) と Kconfig (sdkconfig.defaults等) の理解が不可欠でした。  
本記事では、私が実際に戸惑い、解決に至った依存関係管理や設定方法のポイントを共有しています。  
この記事が、皆さんの「ハマりポイント」を少しでも減らす一助となれば幸いです。

<style>
img {
    border: 1px gray solid;
}
</style>