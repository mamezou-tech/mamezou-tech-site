---
title: 尝试使用IoT（第18回：使用ESP32和OV2640实现实时JPEG视频流传输）
author: shuichi-takatsu
date: 2025-05-05T00:00:00.000Z
tags:
  - esp32
  - ota
  - platformio
  - camera
image: true
translate: true

---

[上一篇](/zh-cn/iot/internet-of-things-17/)介绍了ESP32 OTA的基本内容。  
这次我们将使用ESP32-WROVER-E开发板和OV2640摄像头模块，通过Wi-Fi实时流式传输JPEG图像。  
（虽然不是本篇重点，但也会一起实现OTA功能）

## 前言

在PlatformIO中，即使使用Arduino框架，也可以使用部分ESP-IDF库。  
这次我们将在PlatformIO+Arduino框架环境中使用`esp32-camera`驱动。  
该驱动原本是为ESP-IDF开发的，但也可以在Arduino框架中使用。  

本文重点介绍**PlatformIO.ini文件的配置和JPEG流式程序的编写**。  
关于VSCode的安装、PlatformIO扩展的导入、项目创建方法，请参阅[其他文章](/iot/internet-of-things-14/#開発環境「platform-io」)。  

## 准备工作

介绍本次使用的硬件。  

### ESP32-WROVER-E 开发板

ESP32-WROVER-E开发板（例如[这个](https://electronicwork.shop/items/658456c145c7bd0ccc8ad086?srsltid=AfmBOoqdnz6Fxa3Fuu6BuT_WSC3hzkBS1L6KCc_ARC9VB8YjaCqlNPp5)）是一块搭载了可使用Wi-Fi和蓝牙的MCU“ESP32”，并内置了外部存储器（PSRAM）的开发板。  
适用于图像处理或网络摄像等需要大量内存的场景，可在Arduino或PlatformIO等开发环境中轻松使用。  
（※遗憾的是，在Arduino框架中似乎最多只能识别4MB的PSRAM）  

### 摄像头模块 OV2640

OV2640（例如[这个](https://www.amazon.co.jp/dp/B0BPMCSVQK/?th=1)）是一款搭载200万像素CMOS传感器的小型摄像头模块。  
支持JPEG输出，常与ESP32等MCU组合使用于网络摄像或图像识别等场景。其体积小、功耗低也是特点。  
不过，在SVGA分辨率下帧率最高约为30FPS。  
作为入门设备，其价格非常低廉，易于获取，十分合适。  

## 摄像头库 `esp32-camera`

这次为了在ESP32+PlatformIO+Arduino框架中使用摄像头模块，我们使用了`esp32-camera`（摄像头控制驱动）。  
`esp32-camera`是一个使ESP32与摄像头模块协同工作，并实现图像捕获和流式传输的库。  
它利用PSRAM来处理高分辨率的JPEG图像。  

由于内部存储器容量不足以暂存高分辨率图像或进行高速传输，外部PSRAM（4MB/8MB）是必不可少的。  
如果没有PSRAM，分辨率和帧率会受限，JPEG压缩和图像处理也会变得不稳定。  
开发板应选择内置PSRAM的ESP32-WROVER/ESP32-CAM等型号。  

## 项目配置 (`platformio.ini`)

下面解说项目的基本配置文件`platformio.ini`的内容。

```ini
[env:esp-wrover-kit]
platform = espressif32
board = esp-wrover-kit
framework = arduino
; OTA设置
upload_protocol = espota
upload_port = 192.168.0.66  # 目标ESP32的IP地址
monitor_speed = 115200
upload_flags =
    --auth=admin            # ArduinoOTA的密码
; PSRAM设置
build_flags =
    -DBOARD_HAS_PSRAM
    -mfix-esp32-psram-cache-issue
```

关于OTA配置，请参阅[上一篇](/zh-cn/iot/internet-of-things-16/)，此处省略详细说明。  

`esp32-camera`库已包含在“Arduino for ESP32”中，因此无需在platformio.ini中进行额外配置。  
在主程序中添加`#include "esp_camera.h"`后，作为框架一部分编译的头文件即可在默认搜索路径中被找到。  

要使用`esp32-camera`，以下配置非常关键。  
* `build_flags`：  
  * `-DBOARD_HAS_PSRAM`：用于告诉编译器这是带PSRAM的开发板的宏定义。该宏对`esp32-camera`驱动在帧缓冲中使用PSRAM至关重要。  
  * `-mfix-esp32-psram-cache-issue`：用于在使用PSRAM时规避缓存相关问题的编译器标志。（详情请参见ESP32的PSRAM相关限制）  

## 示例程序

```c
#include <Arduino.h>
#include "esp_camera.h"                 // 声明使用 esp32-camera 库
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoOTA.h>

const char* ssid = "YOUR_SSID";         // 根据各自的 WiFi 环境指定 SSID
const char* password = "YOUR_PASSWORD"; // 根据各自的 WiFi 环境指定密码

// https://github.com/espressif/arduino-esp32/blob/master/libraries/ESP32/examples/Camera/CameraWebServer/camera_pins.h
// 使用 CAMERA_MODEL_WROVER_KIT 的设置
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

// 摄像头配置结构体
camera_config_t config;

// 创建 Web 服务器实例
WebServer server(80);  // 使用端口号 80

// MJPEG 流的头部
const char* STREAM_HEADER = 
  "HTTP/1.1 200 OK\r\n"
  "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n"
  "\r\n";

// JPEG 帧的头部
const char* FRAME_HEADER = 
  "--frame\r\n"
  "Content-Type: image/jpeg\r\n"
  "Content-Length: %d\r\n"
  "\r\n";

// 根端点
const char* root_html = R"rawliteral(
  <form method='POST' action='/update' enctype='multipart/form-data'>
    <input type='file' name='update'>
    <input type='submit' value='Update'>
  </form>
  <p><a href='/stream'>Stream Video</a></p>
  )rawliteral";  

// 更新成功后重定向的 HTML
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

// JPEG 流处理
void handleJPGStream() {
  WiFiClient client = server.client();
  if (!client.connected()) {
    Serial.println("Client disconnected");
    return;
  }

  camera_fb_t * fb = NULL;

  // 发送 MJPEG 流的头部
  client.print(STREAM_HEADER);

  while (client.connected()) {
    // 捕获摄像头帧
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Camera capture failed");
      return;
    }

    // 发送 JPEG 帧的头部
    client.printf(FRAME_HEADER, fb->len);
    client.write(fb->buf, fb->len);  // 发送 JPEG 数据

    // 释放帧缓冲区
    esp_camera_fb_return(fb);

    // 10 FPS: delay(100)
    // 20 FPS: delay(50)
    // 30 FPS: delay(33)
    delay(33);  // 等待到下一帧（FPS 调整）
  }
}

void setup() {
  // 初始化串口监视
  Serial.begin(115200);
  Serial.setDebugOutput(true);

  // 检查 PSRAM 大小
  if (ESP.getPsramSize()) {
    Serial.println("PSRAM is present.");
    Serial.print("PSRAM size: ");
    Serial.println(ESP.getPsramSize());
  } else {
    Serial.println("PSRAM is not present.");
  }

  // 连接 Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());  // 显示 IP 地址

  // 摄像头设置
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
  config.jpeg_quality = 12;  // 图像质量
  config.fb_count = 2;  // 使用多个帧缓冲
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;  // 当帧缓冲为空时才捕获
  config.pixel_format = PIXFORMAT_JPEG;  // 将图像格式设置为 JPEG
  config.fb_location = CAMERA_FB_IN_PSRAM;  // 将帧缓冲放置在 PSRAM 中

  // 初始化摄像头
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
  
  // 在根端点显示主页
  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html", root_html);
  });

  // 在 /stream 端点流式传输视频
  server.on("/stream", HTTP_GET, handleJPGStream);

  // 在 /update 端点处理固件更新
  server.on("/update", HTTP_POST, []() {
    server.send(200, "text/html", update_success_html);  // 更新成功后返回重定向 HTML
    delay(1000);  // 用于显示消息的延迟
    ESP.restart();  // 重启 ESP32
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

  ArduinoOTA.setPassword("admin");  // <- 与 platform.ini 中指定的密码一致

  ArduinoOTA.begin();  

  // 启动服务器
  server.begin();
  Serial.println("Web server started!");
}

void loop() {
  ArduinoOTA.handle();
  server.handleClient();
}
```

## 程序说明

OTA更新部分已在[上一篇](/iot/internet-of-things-16/)中介绍过，这里只说明以下两点：  
* setup() 函数中的摄像头初始化部分  
* handleJPGStream() 函数  

### 摄像头初始化配置（**`setup()` 函数**）

- **摄像头配置 (`camera_config_t config;`)**  
  - **引脚配置**：将OV2640等摄像头模块与ESP32连接所需的各GPIO引脚（D0〜D7、XCLK、PCLK、VSYNC、HREF、SDA、SCL、RESET、PWDN）分配到`config`中。  
  - **时钟频率**：将提供给摄像头的外部时钟（XCLK）设置为**20MHz**。  
  - **帧大小 (`FRAMESIZE_SVGA`)**：将图像帧大小（分辨率）设置为**SVGA（800×600）**。  
  - **JPEG质量 (`jpeg_quality = 12`)**：指定JPEG压缩的质量。数值越小质量越高（0: 最高质量 ～ 63: 最低质量），`12`为中等质量设置。  
  - **帧缓冲数量 (`fb_count = 2`)**：分配**2**个帧缓冲以支持连续图像获取。  
  - **获取模式 (`CAMERA_GRAB_WHEN_EMPTY`)**：仅在帧缓冲为空时才获取新图像，有助于提高内存使用效率。  
  - **像素格式 (`PIXFORMAT_JPEG`)**：以JPEG格式输出图像，压缩数据尺寸，适合传输和存储。  
  - **帧缓冲位置 (`CAMERA_FB_IN_PSRAM`)**：将帧缓冲放置在PSRAM中，既能节省内部RAM使用，又可获得更大缓冲区。  

- **摄像头初始化 (`esp_camera_init(&config)`) 及错误检查**  
    使用`esp_camera_init()`函数进行初始化。若初始化失败，将错误信息输出到日志并中断处理。  

### JPEG流式传输（**`handleJPGStream()` 函数**）

- **客户端连接检查**  
  在函数开头使用`WiFiClient client = server.client();`获取当前连接的客户端，再用`client.connected()`检查连接状态。如连接已断开，则中断处理。  

- **发送MJPEG开始头 (`STREAM_HEADER`)**  
  向客户端发送multipart格式的流头，使后续JPEG帧可连续传输。  

- **流循环处理**  
  当客户端保持连接时，重复以下操作：  
  - 通过`esp_camera_fb_get()`获取一帧JPEG格式图像。  
  - 使用`client.printf(FRAME_HEADER, fb->len);`发送该帧的头部（如Content-Type等）。  
  - 使用`client.write(fb->buf, fb->len);`向客户端发送JPEG数据。  
  - 调用`esp_camera_fb_return(fb);`释放帧缓冲，为下一帧获取做准备。  

- **帧率调整 (`delay(33)`)**  
  为实现约30FPS的流式传输，在帧间加入**33毫秒**延迟。如需修改FPS，可调整`delay()`的参数值。  

## 运行验证

在Web浏览器中访问 `http://<ESP32的IP地址>/`，确认能显示更新表单和流式传输链接。  
点击 `/stream` 链接（或直接访问 `http://<ESP32的IP地址>/stream`），确认能进行视频流式传输。  

流式传输的画面如下所示。  
![](https://gyazo.com/03a33c1e13bf50670b03c94112511fc4.png)  

实话说，这画面谈不上漂亮（笑）  
或许还可以做些调整，但暂且先到这里。  

## 出现的问题与解决方案

* ESP32-WROVER-E 的摄像头引脚配置  
  我花了很长时间查找，非常苦恼。  
  最终从[这里](https://github.com/espressif/arduino-esp32/blob/master/libraries/ESP32/examples/Camera/CameraWebServer/camera_pins.h)借用了“`CAMERA_MODEL_WROVER_KIT`”的配置。  

* 神秘的RAM“PSRAM”  
  我完全不知道它是干什么的，也翻了很多资料。  
  它似乎叫“Pseudo Static RAM（伪静态RAM）”，光看字面也不知道是什么。  
  ESP32内置的RAM只有约520KB，非常有限，做图像处理或音频处理等时很快就会不够用。  
  这时就需要PSRAM了，它是一种外部连接的存储芯片，可以额外提供约4MB～8MB的RAM。  
  你可能会想“那干脆一开始就多配点RAM不就行了…”，但从成本、功耗、芯片体积等方面的平衡来看，估计就只能这样了。  
  在使用摄像头时，这个PSRAM几乎是必需的。  
  如果要在缓冲区保存多帧JPEG图像，内置RAM根本不够用。`camera_config_t`中的`fb_location = CAMERA_FB_IN_PSRAM`设置正是为此而设。  
  如果不使用PSRAM来分配帧缓冲，根本无法正常运行。  
  也因此感谢当初不太懂便买了“带PSRAM的型号”的自己（笑）。  

* 摄像头配置的初始值  
  一切靠“试错”（笑）。  
  分辨率调高到SVGA以上时帧丢失严重，非常吃力。  
  我当作实验用，对性能妥协使用。  

## 总结

使用VSCode+PlatformIO，成功在ESP32-WROVER-E和OV2640摄像头上实现了JPEG流式传输。  
这表明将Arduino的易用性与ESP-IDF的摄像头驱动 `esp32-camera` 结合，可以相对轻松地开发出功能强大的应用。  

[我们整理了有关IoT的教程和实践技巧。](/iot/)  

希望能对IoT应用有所帮助。  

<style>
img {
    border: 1px gray solid;
}
</style>
