---
title: >-
  Pitfalls with IDF Component Manager and Kconfig Configuration (VSCode +
  ESP-IDF Extension)
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

Last time, I wrote an article titled "[A Thorough Explanation of ESP-IDF Project Structure and CMake Mechanisms! (VSCode + ESP-IDF Extension)](/en/blogs/2025/05/03/esp-idf-vsc-extension-2/). Since then, feeling encouraged and trying out various things, I attempted to build a camera server using the **esp32-camera** component and got thoroughly stuck, so I've summarized that experience here.

## Development Environment

The development environment is as follows.
- OS: Ubuntu 24.04 (WSL2)
- IDE: VSCode
- ESP-IDF extension "Espressif IDF": 1.9.1
- ESP-IDF version: **v5.4.1**
- Target: ESP32-WROVER-E development board (with PSRAM)

## Pitfall #1: The Existence of `idf_component.yml`

To use the `esp32-camera` component, you first need to add it to your project.

At first, I configured `esp32-camera` in the CMakeLists.txt file, but the build failed.
```cmake
idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS "."
                    REQUIRES 
                        esp_wifi 
                        esp_netif 
                        esp_timer 
                        nvs_flash 
                        esp_psram 
                        esp32-camera # <-- Just adding the ESP32-CAM camera driver is not enough
                        esp_http_server)
```

Starting with ESP-IDF v4.1, the **[IDF Component Manager](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-guides/tools/idf-component-manager.html)** was introduced as a way to manage components. You can still manually `git clone` into the `components` folder as before, but the recommended approach is to use a manifest file (`idf_component.yml`) for management.

At first, I tried the `idf.py add-component` command based on outdated information and other projects, but I encountered errors. Apparently, the `add-component` command has been deprecated.

After researching, I discovered that the command for registering components is actually `add-dependency`. To add the `esp32-camera` component, run the following command in the project root. (Here we specify `espressif/esp32-camera^2.0.15`.)
```bash
idf.py add-dependency "espressif/esp32-camera^2.0.15"
```
If you don't specify a version, run it like this. (It will choose the latest stable version by default.)
```bash
idf.py add-dependency "espressif/esp32-camera"
```
When you run the command, an `idf_component.yml` file is created inside the `main/` folder.
```cmake
my_project/
├── main/
│   ├── CMakeLists.txt
│   ├── idf_component.yml   ← The generated idf_component.yml file
│   └── main.c
└── ...
```
The generated `idf_component.yml` looks like this.
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
  espressif/esp32-camera: ^2.0.15
```
The meaning of each field is as follows:
* `dependencies`: This section lists the components (libraries) that this project depends on.
* `idf`: Specifies the requirements for ESP-IDF.
  * `version: '>=4.1.0'` means "requires ESP-IDF version 4.1.0 or higher."
* `espressif/esp32-camera: ^2.0.15`: Declares that you will use the `esp32-camera` component provided by Espressif.
  * `^2.0.15` is a semantic versioning spec meaning "use a version ≥2.0.15 and <3.0.0."

The comments in the manifest are written as follows:
* You can also specify third-party components.
* Using `public: true` makes this dependency visible to other components (in the `main` component, dependencies are always public by default, so specifying it is unnecessary).

Strangely, simply defining the component in `idf_component.yml` was enough for the build to pass without adding `esp32-camera` in CMakeLists.txt. This behavior is quite odd, but as a precaution, I register the component in CMakeLists.txt as well.

## Pitfall #2: The `managed_components` Folder Is Automatically Created

After creating `idf_component.yml` and running `idf.py build` or `idf.py reconfigure`, the `managed_components/esp32-camera` folder is automatically generated.

At first, I was confused, thinking, “Huh? Isn’t it supposed to go into the components/ folder?” The component source code is downloaded into a folder called `managed_components`, not the `components` folder. This behavior is part of ESP-IDF’s Dependency Manager by design. With `idf_component.yml` in place, components will be automatically fetched from the internet even if they are not present locally.

Adding a component via the ESP-IDF extension’s “Components Manager” yields the same behavior.

Select “Components Manager.”
![](https://gyazo.com/ab50f04f34eee46ebf5ae09ec5bdf689.png)

Search for `espressif/esp32-camera` in the ESP Registry.
![](https://gyazo.com/bf95bcbe8e1dfca902231d7b4d0fcd5b.png)

Click the “install” button.
![](https://gyazo.com/b08670f4e4bd40f7493e106e6b7195c6.png)

There is the following difference between using the command line and the GUI (Components Manager):
- When you run `idf.py add-dependency` from the command line, the `managed_components` folder is not added until you run `idf.py build` or `idf.py reconfigure`.
- When you install a component via the ESP-IDF extension’s “Components Manager,” the `managed_components` folder is automatically created in the project, and an `idf_component.yml` file is added.

When the `esp32-camera` component is added, the folder path becomes `managed_components/espressif__esp32-camera`.
```cmake
my_project/
├── main/
│   ├── CMakeLists.txt
│   ├── idf_component.yml
│   └── main.c
├── CMakeLists.txt
├── managed_components/     <-- Components are added under here
│   └── espressif__esp32-camera/
│       ├── CMakeLists.txt
│       ├── Kconfig
│       └── ... 
├── sdkconfig
└── ...
```

By the way, **there is no `remove-dependency` command**. The procedure to remove a component is as follows.
- Manually delete the `managed_components` folder
- Manually edit the `idf_component.yml` file
- Run the `idf.py reconfigure` command

## Pitfall #3: `sdkconfig.defaults` Is Not Applied

I also ran into an issue with the `sdkconfig.defaults` file, which is used for project default settings. I had written the Wi-Fi SSID/PASSWORD settings in the `sdkconfig.defaults` file like this:
```text
CONFIG_ESP_WIFI_SSID="myssid"
CONFIG_ESP_WIFI_PASSWORD="mypassword"
```
However, no matter how many full builds I performed, the settings were not reflected in `sdkconfig`.

After looking into it, the reason turned out to be quite simple. The role of `sdkconfig.defaults` is to set default values for **already defined** configuration options, and it does **not add new definitions**.

Therefore, for new configuration options, you need to add the definition in advance to `Kconfig.projbuild` or `Kconfig`.

The correct workflow is as follows. As an example, let's assume the development team uses a `CONFIG_USE_LED` definition.

### Step 1: Create `Kconfig.projbuild` (or `Kconfig`)

Add the USE_LED definition in `Kconfig.projbuild` like this. (Note: In `Kconfig.projbuild`, you write the part without the `CONFIG_` prefix, such as `USE_LED`.)

Here, we set the default to `n` (disabled).
```kconfig
menu "USE LED Configuration"

    config USE_LED
        bool "Use LED"
        default n           # Set default to disabled
    
endmenu
```
Place the `Kconfig.projbuild` file directly under the main folder.
```cmake
my_project/
├── main/
│   ├── ...
│   ├── Kconfig.projbuild      ← Defines new configuration options
│   └── ...
└── ...
```

### Step 2: Write Override Default Values in `sdkconfig.defaults`

Suppose you want to enable it (`y`) for the team. In that case, configure it as follows:
```text
# ===== LED setting used by the team
CONFIG_USE_LED=y
```
Place the `sdkconfig.defaults` file at the project root.
```cmake
my_project/
├── main/
│   ├── ...
│   ├── Kconfig.projbuild      ← Defines new configuration options
│   └── ...
├── ...
├── sdkconfig.defaults          ← Document override default values for existing config options
└── ...
```
With this setup, when you open `menuconfig`, the option appears and is shown as `y` (enabled).
![](https://gyazo.com/c7fa6f6e1b6c218749c8dcc2ad03b579.png)

The contents of `sdkconfig.defaults` are then reflected in `sdkconfig`.

## Summary of This Article's Pitfalls

Here are the pitfalls I encountered:
| Point                   | Description                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| `idf_component.yml`     | Essential for adding components. If you delete it, you won’t be able to build. |
| `managed_components`    | Storage location for automatically generated dependent components. This is expected behavior. |
| `sdkconfig.defaults`    | A place to define default values for **existing** configuration options.    |
| `Kconfig.projbuild`     | Where to define new configuration options. Also reflected in `menuconfig`. |

```cmake
my_project/
├── main/
│   ├── CMakeLists.txt
│   ├── idf_component.yml       ← Essential for adding components
│   ├── Kconfig.projbuild       ← Defines new configuration options
│   └── main.c
├── CMakeLists.txt
├── sdkconfig.defaults          ← Document override default values for existing config options
├── sdkconfig
├── managed_components/         ← Components are added under here
│   └── espressif__esp32-camera/
│       ├── CMakeLists.txt
│       ├── Kconfig
│       └── ... (source files, etc.)
└── ...
```

## Bonus: A Simple Camera Server Using `esp32-camera`

Below are the configuration files and source code for the simple camera server using `esp32-camera`, which inspired this article.

### Project Structure

The project setup is as follows:
- Project name: esp32_wrover_e_camera
- Development board: ESP32-WROVER-E development board (8MB PSRAM version)
- Camera module: OV2640

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

Details about the development board (ESP32-WROVER-E), the camera module (OV2640), and the streaming setup can be found in [another article (VSCode + PlatformIO + Arduino Framework)](/en/iot/internet-of-things-18/), so we'll skip the detailed explanation here. (In the Arduino framework PSRAM was limited to 4MB, but under ESP-IDF it properly recognizes all 8MB.)

### Usage

Use menuconfig to set the Wi-Fi SSID/PASSWORD. After building and uploading the program to the device, connect to `http://<ESP32 IP address>/stream` to view the camera feed.

Below are the contents of each file.

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
                        esp32-camera # <-- Strange that the build passes even without adding it here
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
// Use settings for CAMERA_MODEL_WROVER_KIT
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

// Start the web server
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
        // Camera settings
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
        .jpeg_quality = 10,                // 1-63 (lower is higher quality)
        .fb_count = 3,                     // Triple buffering
        .grab_mode = CAMERA_GRAB_LATEST,   // Prioritize the latest frame
        .fb_location = CAMERA_FB_IN_PSRAM, // Place frame buffer in PSRAM
        .pixel_format = PIXFORMAT_JPEG,    // Set image format to JPEG
    };

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Camera init failed: 0x%x", err);
        abort();
    }

    // Settings for low-light environment
    sensor_t *s = esp_camera_sensor_get();
    if (s)
    {
        s->set_brightness(s, 1); // Brightness (+1 to +2)
        s->set_contrast(s, 1);   // Contrast (0 to +2)
        s->set_saturation(s, 0); // Saturation (-2 to +2)
    }
}

// Wi-Fi event handler
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

// Wi-Fi initialization
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
    // Initialization
    ESP_ERROR_CHECK(nvs_flash_init());
    wifi_init_sta();

    // If PSRAM is enabled, check its size
#if CONFIG_SPIRAM
    if (esp_psram_is_initialized())
    {
        size_t size = esp_psram_get_size();
        ESP_LOGI(TAG, "PSRAM Size: %.2f MB", (float)size / (1024 * 1024));

        // PSRAM allocation test
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

    // Initialize the camera
    init_camera();

    // Start the web server
    start_webserver();

    ESP_LOGI(TAG, "Camera streaming server started");
}
```

### sdkconfig.defaults 
```sdkconfig
# ===== PSRAM Basic Settings =====
CONFIG_ESP32_SPIRAM_SUPPORT=y
CONFIG_SPIRAM=y
CONFIG_SPIRAM_MODE_QUAD=y       # WROVER-E requires Quad mode
CONFIG_SPIRAM_SPEED_80M=y       # 80MHz recommended
CONFIG_SPIRAM_BOOT_INIT=y       # Boot-time initialization (required)
CONFIG_SPIRAM_IGNORE_NOTFOUND=y # Continue even if PSRAM not detected

# ===== Memory Optimization =====
CONFIG_SPIRAM_MALLOC_ALWAYSINTERNAL=16384  # Favor internal RAM
CONFIG_SPIRAM_USE_MALLOC=y      # Use PSRAM for malloc
CONFIG_SPIRAM_USE_CAPS_ALLOC=y  # Enable heap_caps_malloc()

# ===== Flash Settings =====
CONFIG_ESPTOOLPY_FLASHSIZE_4MB=y
CONFIG_ESPTOOLPY_FLASHSIZE="4MB"
CONFIG_PARTITION_TABLE_OFFSET=0x10000  # Required offset

# ===== Performance Tuning =====
CONFIG_SPIRAM_CACHE_WORKAROUND=y  # Workaround for cache issues
CONFIG_SPIRAM_FETCH_RESOURCE_OVER_4BYTE_LEN=y  # Access over 4-byte length
```

### CMakeLists.txt
```cmake
cmake_minimum_required(VERSION 3.5)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(esp32_wrover_e_camera)      # Change this to match your project name
```

## Conclusion

Building a camera server with the latest ESP-IDF (v5.x) requires a solid understanding of the IDF Component Manager (`idf_component.yml`) and Kconfig (`sdkconfig.defaults` etc.). In this article, I have shared the key points of dependency management and configuration techniques that I struggled with and eventually resolved. I hope this article helps reduce the number of pitfalls you encounter.

<style>
img {
    border: 1px gray solid;
}
</style>
