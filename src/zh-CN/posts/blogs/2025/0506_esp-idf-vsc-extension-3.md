---
title: 在 IDF Component Manager 和 Kconfig 设置中遇到的坑（VSCode＋ESP-IDF 扩展功能）
author: shuichi-takatsu
date: 2025-05-06T00:00:00.000Z
tags:
  - vscode
  - esp32
  - esp-idf
  - cmake
  - sdkconfig
  - kconfig
image: true
translate: true

---

上次我写了「[ESP-IDF项目的结构与CMake机制彻底解读！（VSCode＋ESP-IDF 扩展功能）](/zh-cn/blogs/2025/05/03/esp-idf-vsc-extension-2/)」一文。  
之后，心情不错，一边尝试各种方法，一边想用 **esp32-camera** 组件搭建摄像头服务器，结果大大踩了坑，特此总结下这次的经历。

## 开发环境

开发环境如下所示。  
- 操作系统: Ubuntu 24.04 (WSL2)  
- IDE: VSCode  
- ESP-IDF 扩展功能 “Espressif IDF”: 1.9.1  
- ESP-IDF 版本: **v5.4.1**  
- 目标: ESP32-WROVER-E 开发板（含 PSRAM）

## 坑点 其一 “idf_component.yml”的存在

要使用 `esp32-camera` 组件，首先需要在工程中添加 `esp32-camera` 组件。

起初我在 CMakeLists.txt 文件中配置了 `esp32-camera`，但构建并未通过。  
```cmake
idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS "."
                    REQUIRES 
                        esp_wifi 
                        esp_netif 
                        esp_timer 
                        nvs_flash 
                        esp_psram 
                        esp32-camera # <-- 仅添加 ESP32-CAM 摄像头驱动并不足够
                        esp_http_server)
```

自 ESP-IDF v4.1 起，引入了 **[IDF Component Manager](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-guides/tools/idf-component-manager.html)** 作为组件管理方式。  
虽然仍可以像以前那样在 `components` 文件夹中手动 `git clone`，但更推荐使用声明清单文件（`idf_component.yml`）来管理。

一开始参考了一些过时的信息和其他项目，尝试了 `idf.py add-component` 命令，却报错了。  
看来 `add-component` 命令已经被废弃了。

进一步查找后，发现用于注册组件的命令应为 `add-dependency`。  
要添加 `esp32-camera` 组件，需要在工程根目录执行以下命令（此处指定了 “esp32-camera^2.0.15”）：
```bash
idf.py add-dependency "espressif/esp32-camera^2.0.15"
```

如果不指定版本，则可如下执行。（将会选择最新的稳定版）
```bash
idf.py add-dependency "espressif/esp32-camera"
```

执行命令后，会在 `main/` 文件夹内生成 `idf_component.yml` 文件。  
```cmake
my_project/
├── main/
│   ├── CMakeLists.txt
│   ├── idf_component.yml   ← 生成的 idf_component.yml 文件
│   └── main.c
└── ...
```

生成的 `idf_component.yml` 如下所示：
```yaml
## IDF Component 管理器清单文件
dependencies:
  ## 所需的 IDF 版本
  idf:
    version: '>=4.1.0'
  # 在此处列出依赖项
  # 对于 Espressif 维护的组件：
  # component: "~1.0.0"
  # 对于第三方组件：
  # username/component: ">=1.0.0,<2.0.0"
  # username2/component2:
  #   version: "~1.0.0"
  #   对于传递性依赖，可设置 public 标志。
  #   public 标志对 main 组件的依赖无效。
  #   main 的所有依赖默认都是 public。
  espressif/esp32-camera: ^2.0.15
```

各字段含义如下：  
* `dependencies`： 此部分列举了工程所依赖的组件（库）。  
* `idf`： 指定 ESP-IDF 的版本要求。  
  * `version: '>=4.1.0'` 意味着 “ESP-IDF 版本需大于等于 4.1.0”。  
* `espressif/esp32-camera: ^2.0.15`： 声明使用 Espressif 提供的 `esp32-camera` 组件。  
  * `^2.0.15` 基于语义化版本标记，表示 “使用 2.0.15 以上且小于 3.0.0 的版本”。

注释部分说明：  
* 也可以指定第三方组件。  
* 使用 `public: true` 时，其他组件也可见此依赖（`main` 组件的依赖总是默认 `public`，因此无需在 `main` 中指定）。

奇怪的是，仅在 `idf_component.yml` 中定义了组件，甚至不在 CMakeLists.txt 中添加 `esp32-camera`，也能通过编译。  
这一行为非常神秘，但我为了安全起见，还是在 CMakeLists.txt 中手动注册了该组件。

## 坑点 其二 “managed_components” 文件夹会自动生成

创建 `idf_component.yml` 后，执行 `idf.py build` 或 `idf.py reconfigure`，会自动生成 `managed_components/esp32-camera` 文件夹。

起初还以为 “组件应该放到 components/ 文件夹吧？”  
实际上，组件源码并不会放在 `components` 文件夹，而是下载到名为 `managed_components` 的文件夹下。  
这就是 ESP-IDF “Dependency Manager” 的设计。  
只要创建了 `idf_component.yml`，即便本地没有组件，也会自动从网络拉取。

使用 ESP-IDF 扩展功能的 “Components Manager” 添加组件时，也会发生同样的行为。

在 “Components Manager” 中选择组件。  
![](https://gyazo.com/ab50f04f34eee46ebf5ae09ec5bdf689.png)

在 ESP Registry 中搜索 “`espressif/esp32-camera`”。  
![](https://gyazo.com/bf95bcbe8e1dfca902231d7b4d0fcd5b.png)

点击 “install” 按钮。  
![](https://gyazo.com/b08670f4e4bd40f7493e106e6b7195c6.png)

命令行和 GUI（Components Manager）操作的区别如下：  
- 通过命令行 `idf.py add-dependency` 添加时，需执行 `idf.py build` 或 `idf.py reconfigure`，`managed_components` 文件夹才会被添加。  
- 通过 ESP-IDF 扩展的 “Components Manager” 安装时，会自动在工程中创建 `managed_components` 文件夹，并添加 `idf_component.yml` 文件。

当添加 `esp32-camera` 组件时，文件夹路径会变成 `managed_components/espressif__esp32-camera` 之类。  
```cmake
my_project/
├── main/
│   ├── CMakeLists.txt
│   ├── idf_component.yml
│   └── main.c
├── CMakeLists.txt
├── managed_components/     <-- 组件会添加到此处
│   └── espressif__esp32-camera/
│       ├── CMakeLists.txt
│       ├── Kconfig
│       └── ... 
├── sdkconfig
└── ...
```

顺便提一下，**不存在 `remove-dependency` 命令**。  
删除组件的步骤如下：  
- 手动删除 `managed_components` 文件夹  
- 手动修改 `idf_component.yml` 文件  
- 执行 `idf.py reconfigure`

## 坑点 其三 `sdkconfig.defaults` 不生效

作为工程初始配置使用的 `sdkconfig.defaults` 文件，也让我遇到了麻烦。  
我在 `sdkconfig.defaults` 文件中像下面这样写入了 Wi-Fi 的 SSID/PASSWORD 配置：  
```text
CONFIG_ESP_WIFI_SSID="myssid"
CONFIG_ESP_WIFI_PASSWORD="mypassword"
```

然而，无论怎样全量构建，`sdkconfig` 中始终没有反映这些配置。

经过各种查找，原因非常简单：  
`sdkconfig.defaults` 的作用是 **为已定义的配置设置默认值**，而不是 **新增配置定义**。

因此，对于新的配置定义，需要事先在 `Kconfig.projbuild` 或 `Kconfig` 中添加相应定义。

正确的流程如下。  
以“开发团队要使用 `CONFIG_USE_LED` 这一定义”为例。

### 步骤1：创建 `Kconfig.projbuild`（或 `Kconfig`）

在 `Kconfig.projbuild` 中添加 USE_LED 定义，如下所示。  
（注：在 `Kconfig.projbuild` 中，写的是不含 “CONFIG_” 前缀的部分，如 “USE_LED”）  
这里将默认设置为 n（禁用）。  
```kconfig
menu "USE LED Configuration"

    config USE_LED
        bool "Use LED"
        default n           # 将默认值设为禁用
    
endmenu
```
将 `Kconfig.projbuild` 文件放在 main 文件夹下。  
```cmake
my_project/
├── main/
│   ├── ...
│   ├── Kconfig.projbuild      ← 用于定义新的配置项
│   └── ...
└── ...
```

### 步骤2：在 `sdkconfig.defaults` 中写入覆盖默认值

假设团队想将该配置置为 y（启用）。  
则在 `sdkconfig.defaults` 中这样设置：  
```text
# ===== 团队使用的 LED 配置
CONFIG_USE_LED=y
```
将 `sdkconfig.defaults` 文件放在工程根目录。  
```cmake
my_project/
├── main/
│   ├── ...
│   ├── Kconfig.projbuild      ← 用于定义新的配置项
│   └── ...
├── ...
├── sdkconfig.defaults          ← 为已有配置项写入覆盖默认值
└── ...
```

这样在打开 `menuconfig` 时，就能看到该配置项，并显示为 y（启用）。  
![](https://gyazo.com/c7fa6f6e1b6c218749c8dcc2ad03b579.png)

`sdkconfig.defaults` 的内容会反映到 `sdkconfig` 中。

## 本次踩坑要点总结

本次踩坑的要点如下：  
| 要点 | 说明 |
|----------|------|
| `idf_component.yml` | 导入组件时的必需项。误删将导致无法构建。 |
| `managed_components` | 自动生成的依赖组件保存目录。符合设计预期。 |
| `sdkconfig.defaults` | 只用于写入“**已有**配置项的默认值”。 |
| `Kconfig.projbuild` | 用于定义新的配置项。也会反映到 `menuconfig`。 |

```cmake
my_project/
├── main/
│   ├── CMakeLists.txt
│   ├── idf_component.yml       ← 导入组件的必需文件
│   ├── Kconfig.projbuild       ← 定义新的配置项
│   └── main.c
├── CMakeLists.txt
├── sdkconfig.defaults          ← 为已有配置项写入覆盖默认值
├── sdkconfig
├── managed_components/         ← 组件会添加到此处
│   └── espressif__esp32-camera/
│       ├── CMakeLists.txt
│       ├── Kconfig
│       └── ... (源码文件等)
└── ...
```

## 附录 “使用 `esp32-camera` 的简单摄像头服务器”

本文写作的契机是“使用 `esp32-camera` 的简单摄像头服务器”，以下列出其配置文件和源码。

### 项目结构

项目结构如下：  
- 项目名： esp32_wrover_e_camera  
- 开发板： ESP32-WROVER-E 开发板（PSRAM 8MB 版）  
- 摄像头模组： OV2640  

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

开发板（ESP32-WROVER-E）和摄像头模组（OV2640）、以及流媒体设置方法等在[另一篇文章（VSCode＋PlatformIO＋Arduino 框架）](/zh-cn/iot/internet-of-things-18/)中有介绍，此处不再赘述。  
（在 Arduino 框架中 PSRAM 最多只能使用 4MB，但在 ESP-IDF 中似乎能正常识别并使用到 8MB）

### 使用方法

使用 menuconfig 设置 Wi-Fi 的 SSID/PASSWORD。  
构建完成并上传程序到设备后，访问 `http://＜ESP32 的 IP 地址＞/stream` 即可查看摄像头画面。

下面列出各文件内容。

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
                        esp32-camera # <-- ※即使不在此处添加也能通过构建的神秘现象
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

// 使用 CAMERA_MODEL_WROVER_KIT 设置
// https://github.com/espressif/arduino-esp32/blob/master/libraries/ESP32/examples/Camera/CameraWebServer/camera_pins.h
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

    // 设置响应类型为 multipart/x-mixed-replace
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

        // 为 part_buf 分配 PSRAM 或 SRAM
        char *part_buf = heap_caps_malloc(64, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
        if (!part_buf)
        {
            ESP_LOGE(TAG, "PSRAM allocation failed for part_buf");
            return ESP_FAIL;
        }
        // 构建分块报头
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

// 启动 Web 服务器
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
        // 摄像头配置
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
        .jpeg_quality = 10,                // 1-63（值越小画质越高）
        .fb_count = 3,                     // 三重缓冲
        .grab_mode = CAMERA_GRAB_LATEST,   // 优先最新帧
        .fb_location = CAMERA_FB_IN_PSRAM, // 将帧缓冲放入 PSRAM
        .pixel_format = PIXFORMAT_JPEG,    // 设置图像格式为 JPEG
    };

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Camera init failed: 0x%x", err);
        abort();
    }

    // 低光环境下的配置
    sensor_t *s = esp_camera_sensor_get();
    if (s)
    {
        s->set_brightness(s, 1); // 亮度 (+1 到 +2)
        s->set_contrast(s, 1);   // 对比度 (0 到 +2)
        s->set_saturation(s, 0); // 饱和度 (-2 到 +2)
    }
}

// Wi-Fi 事件处理函数
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

// Wi-Fi 初始化（STA 模式）
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
    // 初始化
    ESP_ERROR_CHECK(nvs_flash_init());
    wifi_init_sta();

// 使用 PSRAM 并获取其大小
#if CONFIG_SPIRAM
    if (esp_psram_is_initialized())
    {
        size_t size = esp_psram_get_size();
        ESP_LOGI(TAG, "PSRAM Size: %.2f MB", (float)size / (1024 * 1024));

        // PSRAM 内存分配测试
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

    // 摄像头初始化
    init_camera();

    // 启动 Web 服务器
    start_webserver();

    ESP_LOGI(TAG, "Camera streaming server started");
}
```

### sdkconfig.defaults 
```sdkconfig
# ===== PSRAM 基本配置 =====
CONFIG_ESP32_SPIRAM_SUPPORT=y
CONFIG_SPIRAM=y
CONFIG_SPIRAM_MODE_QUAD=y       # WROVER-E 要求使用 Quad 模式
CONFIG_SPIRAM_SPEED_80M=y       # 建议 80MHz
CONFIG_SPIRAM_BOOT_INIT=y       # 启动时初始化（必需）
CONFIG_SPIRAM_IGNORE_NOTFOUND=y # PSRAM 未检测到时仍继续

# ===== 内存优化 =====
CONFIG_SPIRAM_MALLOC_ALWAYSINTERNAL=16384  # 优先使用内部 RAM
CONFIG_SPIRAM_USE_MALLOC=y      # 在 malloc 中使用 PSRAM
CONFIG_SPIRAM_USE_CAPS_ALLOC=y  # 支持 heap_caps_malloc()

# ===== Flash 配置 =====
CONFIG_ESPTOOLPY_FLASHSIZE_4MB=y
CONFIG_ESPTOOLPY_FLASHSIZE="4MB"
CONFIG_PARTITION_TABLE_OFFSET=0x10000  # 必需偏移

# ===== 性能调优 =====
CONFIG_SPIRAM_CACHE_WORKAROUND=y  # 缓存问题解决方案
CONFIG_SPIRAM_FETCH_RESOURCE_OVER_4BYTE_LEN=y  # 支持 4 字节以上访问
```

### CMakeLists.txt
```cmake
cmake_minimum_required(VERSION 3.5)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(esp32_wrover_e_camera)      # 按各自项目名修改
```

## 结语

在最新 ESP-IDF(v5.x) 下构建摄像头服务器，理解 IDF Component Manager (`idf_component.yml`) 和 Kconfig (`sdkconfig.defaults` 等) 至关重要。  
本文分享了我实际遇到的依赖管理和配置方法要点，希望能对大家减少踩坑有所帮助。

<style>
img {
    border: 1px gray solid;
}
</style>
