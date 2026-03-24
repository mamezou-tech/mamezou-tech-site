---
title: 尝试使用 IoT（第16回：使用 OTA 无线轻松更新 ESP32 固件！）
author: shuichi-takatsu
date: 2025-04-28T00:00:00.000Z
tags:
  - esp32
  - ota
  - webserver
  - platformio
image: true
translate: true

---

[上次](/iot/internet-of-things-15/)的文章中，我们通过 ESP32 的 DeepSleep 功能尝试了长时间电池供电。这次，我们将使用 ESP32 来尝试“OTA (Over The Air)”功能。

## 什么是 OTA？

“OTA”是“Over The Air”的缩写，是**通过无线通信替换程序的机制**。

通常，要向 ESP32 写入程序，需要通过 USB 数据线将其与电脑连接。  
但是，许多 ESP32 从一开始就集成了 Wifi 和 Bluetooth 功能，如果能通过无线通信替换程序，就会非常方便。  
使用 OTA，可以通过 Wifi 替换程序，因此在以下场景中效果显著：

- 安装在室外的传感器  
- 安装在难以触及位置的设备  

如果能做到这些，就能体验更进一步的 IoT 了。

## 使用 VSCode＋PlatformIO 构建 ESP32 OTA 更新环境

本文将介绍如何使用 **VSCode＋PlatformIO** 构建用于 ESP32 **OTA（Over The Air）更新**的开发环境。  
VSCode 的安装、PlatformIO 扩展的引入及项目创建方法等内容移步 [其他文章](/iot/internet-of-things-14/#开发环境「platform-io」)，这里重点讲解 **PlatformIO.ini 文件的设置和 OTA 程序的编写**。

本次使用的 ESP32 开发板为 “ESP32 LOLIN D32”。  
ESP32 LOLIN D32 板上集成了 LED，可用于直观的运行状态确认，因此选用此板。  
如果在不带可控 LED 的 ESP32 上试验，需要自行搭建外部电路点亮 LED。（LED 的闪烁仅用于直观确认运行，可根据需要省略该电路）  
另外，LOLIN D32 板上提供了电池接口，可不依赖 Micro USB 而改用电池供电。  
（下文中统一简称“ESP32”）

### PlatformIO.ini 文件的设置

要在 ESP32 上启用 OTA，需要在 `platformio.ini` 中添加以下设置。

```ini
[env:lolin_d32]
platform = espressif32
board = lolin_d32           ; ← 本次使用的开发板名称
framework = arduino

; --- OTA 设置 ---
upload_protocol = espota
upload_port = 192.168.0.65   ; ← 通过 Wifi 更新的 ESP32 的 IP 地址
upload_flags =
    --auth=admin             ; ← 设置 OTA 密码（需与程序中一致）

; --- 串口监视设置 ---
monitor_speed = 115200
```

### 各项说明

下面说明各个配置项。  
| 项目                | 说明 |
|---------------------|------|
| `platform`          | 使用的平台。ESP32 时为 `espressif32` |
| `board`             | 使用的开发板。此处为 `lolin_d32` |
| `framework`         | 使用的框架。此处为 `arduino` |
| `upload_protocol`   | 上传协议，指定为 `espota`（OTA） |
| `upload_port`       | 指定 ESP32 的 IP 地址（请根据实际环境设置） |
| `upload_flags`      | OTA 时使用的认证信息（auth），示例中密码为 `admin` |
| `monitor_speed`     | 串口监视波特率（用于通过串口确认 Wifi 是否正常工作等） |

### 注意事项

- **ESP32 程序**中也需要加入接收 OTA 更新的代码，本例使用“ArduinoOTA 库”。  
- 在首次使用时，需要通过常规方式（USB-COM 端口）将程序上传到 ESP32。  
  若使用 USB-COM 端口上传，请注释掉 `upload_protocol`、`upload_port` 和 `upload_flags` 部分。  
- 请确保路由器或防火墙未阻止 OTA 使用的端口（默认端口为 3232）。  
- `upload_port` 中设置的 IP 地址须为 **ESP32 连接 Wifi 后获得的地址**。

### 关于 Wifi 的 IP 地址

OTA 更新时使用的 IP 地址（`upload_port` 中指定的 IP 地址）必须是 ESP32 连接 Wifi 后获得的地址。  
如果路由器通过 DHCP 分配的 IP 地址会发生变化，就无法进行 OTA 上传，可采取以下对策：

- 在路由器端为 ESP32 的 MAC 地址分配固定 IP  
- 在 ESP32 端设置静态 IP 地址（Static IP）  

通过上述方法可以始终使用相同 IP 进行 OTA 更新，从而保证运行稳定。  
如果在自家路由器设置界面中无法找到 ESP32 的 IP 地址（或不知道 MAC 地址），可先通过 USB-COM 端口上传程序，按下复位按钮重启后，在串口输出中查看 IP 地址信息。

按下 ESP32 复位按钮时会在串口输出中看到如下日志（此处演示输出“IP address: 192.168.0.65”）：
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

## 简易 OTA（“LED 闪烁”示例）

首先，编写一个最简单的程序，只让 LED 以 500 毫秒间隔闪烁，并集成 OTA 功能。  
以下是示例程序。  
要实现 OTA 功能，需要注意以下几点：  
- 包含 `<WiFi.h>` 和 `<ArduinoOTA.h>` 两个头文件  
- 必须在 `setup()` 中调用 `ArduinoOTA.begin();`  
- 在 `loop()` 中持续调用 `ArduinoOTA.handle();`

```cpp
#include <Arduino.h>

#include <WiFi.h>
#include <ArduinoOTA.h>

const char* ssid = "YOUR_SSID";         // 指定自己的 WiFi 环境的 SSID
const char* password = "YOUR_PASSWORD"; // 指定自己的 WiFi 环境的密码

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

  ArduinoOTA.setPassword("admin");  // ← 与 platform.ini 中设置的密码保持一致

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

仅此即可通过 Wifi 替换 ESP32 上的程序。  
上传方式与通过 USB-COM 端口相同，只需选择 OTA 上传即可。  
（**注意：首次需先通过 USB-COM 端口上传一次程序**）

执行上传时，如果在终端看到如下日志，则说明上传成功：
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

如果监视 ESP32 侧的串口输出，会看到如下日志：  
该日志与按下复位按钮时输出的日志相同，可看出 OTA 已正确上传并使 ESP32 重启（复位）：
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

### 注意事项

OTA 更新后，ESP32 会重启（复位）。  
因此，之前保存在内存中的值会被重置。  
如果需要“在更新前后保留数据”，可考虑以下方法：

- 使用 NVS（Non-Volatile Storage）保存  
  ESP32 有一套称为 NVS 的机制，可在闪存中以键值对方式保存数据，例如配置信息或小型计数器等。  
- 使用 SPIFFS 或 LittleFS 以文件形式保存  
  若需保存较多数据（如配置文件、日志文件等），可使用文件系统将其保存为文件。  
- 写入外部存储（如 SD 卡）  
  若数据量更大，可临时写入 SD 卡等外部存储，但需要额外硬件。

本次不对数据保持进行深入展示，有机会再做尝试。

## 在 WebServer 上启用 OTA

接下来，进行稍微进阶的演示。  
在 ESP32 上搭建一个简单的 Web 服务器，并保留 OTA 功能，可通过浏览器访问。

以下是示例程序，新增了 `#include <WebServer.h>`：
```cpp
#include <Arduino.h>

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoOTA.h>

const char* ssid = "YOUR_SSID";         // 指定自己的 WiFi 环境的 SSID
const char* password = "YOUR_PASSWORD"; // 指定自己的 WiFi 环境的密码

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

  ArduinoOTA.setPassword("admin");  // ← 与 platform.ini 中设置的密码保持一致

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

构建并上传程序后（若已上传过闪烁 LED 的示例，现在可直接通过 OTA 上传），  
若在串口输出中看到以下日志，说明 WebServer 已启动：
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

在浏览器中访问 ESP32 的 IP 地址（本例为 192.168.0.65），应该能看到：
```
Hello from ESP32 WebServer!
```
这样就同时具备了 Web 服务器和 OTA 功能，非常简单。

## 从浏览器上传固件

最后，展示如何**通过自定义的 Web 页面上传固件并完成更新**。

以下是示例程序，新增了 `#include <Update.h>`：
```cpp
#include <Arduino.h>

#include <WiFi.h>
#include <WebServer.h>
#include <Update.h>
#include <ArduinoOTA.h>

const char* ssid = "YOUR_SSID";         // 指定自己的 WiFi 环境的 SSID
const char* password = "YOUR_PASSWORD"; // 指定自己的 WiFi 环境的密码

WebServer server(80);

const char* upload_html = R"rawliteral(
<form method='POST' action='/update' enctype='multipart/form-data'>
  <input type='file' name='update'>
  <input type='submit' value='Update'>
</form>
)rawliteral";

// 上传成功后重定向的 HTML
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
    server.send(200, "text/html", update_success_html);  // 更新成功后返回重定向 HTML
    delay(1000);  // 留出时间显示消息
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

  ArduinoOTA.setPassword("admin");  // ← 与 platform.ini 中设置的密码保持一致

  ArduinoOTA.begin();

  server.begin();
}

void loop() {
  ArduinoOTA.handle();
  server.handleClient();
}
```

上传程序后，在浏览器访问 ESP32 的 IP 地址，会显示文件选择和上传按钮。  
![](https://gyazo.com/59214f2e7a201cfb3719a4768417dde9.png)

在此上传已编译的固件（.bin 文件），即可**让 ESP32 自身完成固件替换**。  
选择生成的 bin 文件即可。  
![](https://gyazo.com/98ae15444c37e0255abc38d0333c652e.png)

“firmware.bin” 被选择。  
![](https://gyazo.com/0e7e0a8e1bc5654dc15c7dea43fb0a8b.png)

点击“update”按钮。  
![](https://gyazo.com/d7900c8bc96d696a1161db7be31df6f4.png)

更新成功后，页面会提示 5 秒后跳转回主页。  
![](https://gyazo.com/0bce04cd85c252b513ef511c2360b523.png)

同时在串口输出中，会显示如下“firmware.bin”更新日志：
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

这真是非常实用的技术，对于 IoT 设备开发值得一试。

## 总结

此次我们依次通过以下示例体验了 ESP32 的 OTA 功能：

- OTA 基础（LED 闪烁）  
- 搭建 WebServer 的 OTA  
- 可从 Web 上传固件的 OTA  

虽然示例在错误处理和安全性方面仍有改进空间，但希望能让大家了解基本框架。  
对于现场维护困难的 IoT 设备，OTA 功能尤为重要，欢迎在自己的开发中加以 활용。

[我们整理了 IoT 相关的教程和实战技巧。](/iot/)  
希望对 IoT 应用有所帮助。

## 附录

### ESPAsyncWebServer 版本

还有更高功能的 WebServer——“ESPAsyncWebServer”。  
下面贴出我在试验中调试出的程序，虽然写法有些临时急就章，但能正常运行（笑）。  
此版示例中使用了 LittleFS（文件系统）和 FreeRTOS 任务，稍微复杂些，请自行阅读并体会。  
（安全性方面还需改进，此处仅作参考）

```cpp
#include <Arduino.h>

#include <WiFi.h>
#include <ArduinoOTA.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <Update.h>
#include <Ticker.h>

const char* ssid = "YOUR_SSID";         // 指定自己的 WiFi 环境的 SSID
const char* password = "YOUR_PASSWORD"; // 指定自己的 WiFi 环境的密码

static int T_DELAY = 500;

// Web 服务器端口设置为 80
AsyncWebServer server(80);

// OTA 用
Ticker otaTicker;
bool otaRequested = false;
String otaFilename;

// --- 函数原型 ---
void handleFileUpdate(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final);
void updateFirmware(String filename);
void otaTask(void *pvParameters);

// --- 初始化 ---
void setup(){
  Serial.begin(115200);

  if (!LittleFS.begin(true)) {
    Serial.println("LittleFS 挂载时发生错误");
  } else {
    Serial.println("LittleFS 挂载成功");
  }
    
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected.");
  Serial.println(WiFi.localIP());
  Serial.println("MAC Address: " + WiFi.macAddress()); // 输出 MAC 地址

  pinMode(LED_BUILTIN, OUTPUT);

  ArduinoOTA.setPassword("admin");  // ← 与 platform.ini 中设置的密码保持一致
  
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

  // 创建 FreeRTOS 的 OTA 任务
  xTaskCreatePinnedToCore(otaTask, "OTA Task", 10000, NULL, 1, NULL, 1);  

  // 访问 "/" 时显示主页
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

  // Update 页面（GET）
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

  // Update 处理（POST）
  server.on("/update", HTTP_POST, [](AsyncWebServerRequest *request){ 
    // 完成时不做任何操作
  }, handleFileUpdate);

  // 启动 Web 服务器
  server.begin();
}

// --- 文件上传处理 ---
void handleFileUpdate(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final){
  if (!index){
    Serial.printf("UpdateStart: %s\n", filename.c_str());

    // 扩展名检查（仅接受 .bin）
    if (!filename.endsWith(".bin")) {
      request->send(400, "text/plain", "Only .bin files are allowed");
      return;
    }

    // 如果存在同名文件则删除
    LittleFS.remove("/" + filename);
    request->_tempFile = LittleFS.open("/" + filename, "w");
  }
  if (len){
    request->_tempFile.write(data, len);
  }
  if (final){
    Serial.printf("UpdateEnd: %s (%u)\n", filename.c_str(), index+len);
    request->_tempFile.close();

    // 先向浏览器返回响应
    request->send(200, "text/html", R"rawliteral(
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Update Success</title>
        <script>
          setTimeout(function(){
            window.location.href = '/';
          }, 2000); // 2秒后跳转到主页
        </script>
      </head>
      <body>
        <h2>Update successful!</h2>
        <p>Restarting device... Redirecting to Home in 2 seconds.</p>
      </body>
      </html>
    )rawliteral");

    // 预约执行 OTA
    otaFilename = "/" + filename;
    otaRequested = true;
    otaTicker.once(1, []() {
      updateFirmware(otaFilename);
    });
  }
}

// --- 固件更新处理 ---
void updateFirmware(String filename) {
  File firmware = LittleFS.open(filename, "r");
  if (!firmware) {
    Serial.println("Failed to open file for OTA");
    return;
  }

  if (Update.begin(firmware.size(), U_FLASH)) { // 明确指定 U_FLASH
    size_t written = Update.writeStream(firmware);
    if (written == firmware.size()) {
      Serial.println("OTA Update successful");
      if (Update.end()) {
        Serial.println("Rebooting...");
        firmware.close();
        LittleFS.remove(filename); // 更新成功后删除上传文件
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

// OTA 任务
void otaTask(void *pvParameters) {
  ArduinoOTA.begin();  // 初始化 OTA

  while (true) {
    ArduinoOTA.handle();  // 检查 OTA 进度
    delay(100);  // 避免阻塞其他任务
  }
}

// --- 主循环 ---
void loop(){
  // 用户处理

  // LED 闪烁
  digitalWrite(LED_BUILTIN, HIGH);
  delay(T_DELAY);
  digitalWrite(LED_BUILTIN, LOW);
  delay(T_DELAY);
}
```

platformio.ini 文件内容如下，请根据实际环境修改开发板类型、IP 地址和 OTA 密码等：
```ini
[env:lolin_d32]
platform = espressif32
board = lolin_d32            ; ← 使用的开发板类型
framework = arduino
upload_protocol = espota
upload_port = 192.168.0.65   ; ← 通过 Wifi 更新的 ESP32 的 IP 地址
monitor_speed = 115200
board_build.filesystem = littlefs
upload_flags = 
    --auth=admin             ; ← 设置 OTA 密码（需与程序中一致）
lib_deps = 
  # 推荐
  # 接受向后兼容方式的新功能与补丁
  esp32async/ESPAsyncWebServer @ ^3.7.7
  # 推荐
  # 接受向后兼容方式的新功能与补丁
  esp32async/AsyncTCP @ ^3.4.0
```

<style>
img {
    border: 1px gray solid;
}
</style>
