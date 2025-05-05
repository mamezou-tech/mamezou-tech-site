---
title: 尝试使用IoT（第17篇：深入解析ESP32 OTA基础：从闪存布局到运行机制）
author: shuichi-takatsu
date: 2025-04-30T00:00:00.000Z
tags:
  - esp32
  - ota
  - platformio
image: true
translate: true

---

[前回](/iot/internet-of-things-16/)中，我们使用ESP32挑战了“OTA（Over The Air）”。  
虽然顺序前后有所调整，但这次将再次详细解说OTA的基本机制。

## 简介

ESP32标准支持通过无线方式重写程序的“Over The Air（OTA）”功能。  
在本文中，我们将深入探讨**闪存布局**和**OTA的运行机制**，解答“为什么需要两个应用区？”、“如何选择并启动更新后的应用？”等疑问。

## 支撑 OTA 的机制

### 闪存的分区结构

ESP32的闪存通过“分区表”进行管理。  
分区是闪存上区域的“划分”。

在 PlatformIO 中指定使用“Arduino框架”时，分区表信息包含在以下目录：  
`<用户文件夹路径>\.platformio\packages\framework-arduinoespressif32\tools\partitions`

上述文件夹中存放有 `default.csv` 文件。  
该文件中包含默认选用的分区表信息。  
在我的环境中，其设置如下。

| Name     | Type | SubType | Offset   | Size    | Flags |
|:---------|:-----|:--------|:---------|:--------|:------|
| nvs      | data | nvs     | 0x9000   | 0x5000  |       |
| otadata  | data | ota     | 0xe000   | 0x2000  |       |
| app0     | app  | ota_0   | 0x10000  | 0x140000|       |
| app1     | app  | ota_1   | 0x150000 | 0x140000|       |
| spiffs   | data | spiffs  | 0x290000 | 0x160000|       |
| coredump | data | coredump| 0x3F0000 | 0x10000 |       |

各分区的作用如下：  
- **nvs**：NVS 存储（Non-Volatile Storage）。用于保存配置和用户数据等的持久化存储区，断电后数据依然保留。  
- **otadata**：管理 OTA（Over-The-Air）更新的状态。指示应启动哪一个应用区（ota_0 或 ota_1）。  
- **app0 / app1**：用于 OTA 更新的应用区域。OTA 更新时，app0 和 app1 交替使用，一方运行时，另一方作为更新目标。  
- **spiffs**：使用 SPIFFS（Serial Peripheral Interface Flash File System）的文件存储区，用于保存配置文件、日志等数据。  
- **coredump**：用于保存核心转储的区域。在系统故障（如崩溃）发生时保存内存转储，以便后续故障分析。

此外，闪存的内存映射如下所示。  
为支持 OTA，应用区域准备了两个（app0 和 app1），并交替写入使用。  

各区域将写入对应的应用或数据。  
注意，通过 OTA 写入新应用时，会将其写入当前运行区域之外的另一个插槽（app0 或 app1），以便在失败时触发回退至前一状态的故障保护机制。

| 开始地址   | 结束地址   | 大小      | 名称        | 类型       | 子类型     | 备注                   |
|------------|------------|-----------|-------------|------------|------------|------------------------|
| 0x00000000 | 0x00007FFF | 0x8000    | bootloader  | -          | -          | 引导加载程序           |
| 0x00008000 | 0x00008FFF | 0x1000    | partition   | -          | -          | 分区表                 |
| 0x00009000 | 0x0000DFFF | 0x5000    | nvs         | data       | nvs        | NVS 存储              |
| 0x0000E000 | 0x0000FFFF | 0x2000    | otadata     | data       | ota        | OTA 数据              |
| 0x00010000 | 0x0014FFFF | 0x140000  | app0        | app        | ota_0      | OTA 插槽 0             |
| 0x00150000 | 0x0028FFFF | 0x140000  | app1        | app        | ota_1      | OTA 插槽 1             |
| 0x00290000 | 0x003EFFFF | 0x160000  | spiffs      | data       | spiffs     | SPIFFS 文件系统        |
| 0x003F0000 | 0x003FFFFF | 0x10000   | coredump    | data       | coredump   | 核心转储区域          |

（注：整个 Flash 通常假设为 4MB（= 0x400000））

在包含 Arduino 框架的 ESP32 开发环境中，分区表文件（partition-table.bin）默认始终写入到闪存的 0x8000。

### 引导加载程序的工作流程

本文基于 Arduino 框架，ESP32 启动时，首先运行 ROM 内置的一级引导加载程序。  
然后读取闪存中写入的用户自定义 bootloader.bin 并继续后续处理。

- 检查 UART 引导（开发模式）  
  首先确认是否有通过 UART（串口）发起的写入模式请求。如果检测到来自 PC 的写入请求，则进入固件刷写流程。  
- 初始化闪存并读取分区表  
  闪存起始处（0x0000）已写入引导加载程序，引导加载程序会读取位于 0x8000 的分区表，并执行应用程序的启动流程。  
- 读取 otadata（OTA 配置时）  
  从 otadata 分区（默认地址 0xE000）读取最后一次正常启动的应用信息以及下次应启动的应用信息。  
- 决定合适的应用区域  
  根据读取的信息，通常选择 ota_0 或 ota_1 中的一个应用区域。  
- 回退（替代）处理  
  如果 otadata 中无有效信息，或应用区域验证失败，将执行以下回退操作：  
  - 如果存在 factory 分区（*见后文*），则启动该分区。  
  - 否则视为引导失败，停止或复位。  
- 加载并执行应用  
  将选定的应用从闪存区域加载到 RAM 并开始执行。  

关于 factory 分区的补充：  
- 在 Arduino 中通常不使用 factory，但在不启用 OTA 功能的配置中，可以仅使用 factory 分区。  
- factory 分区作为默认应用程序运行。  
- 在 OTA 配置中，推荐使用 ota_0 / ota_1 的双分区结构，有时可省略 factory。

## OTA 流程

ESP32 的 OTA（Over-The-Air）更新按以下步骤进行。

- 接收新的固件  
  通过 Wi-Fi 或 HTTP 接收新的 .bin 文件（固件）。  
- 确定写入目标  
  选择当前未运行的应用区域（例如当前运行于 ota_0，则选择 ota_1），并将固件写入该区域。  
- 写入完成后更新 otadata  
  写入成功后，会更新 otadata 分区，使下次启动时使用新的区域。  
- 重启并运行新固件  
  设备重启后，将使用新固件启动。  
- 启动失败时的回滚  
  如果启动后检测到问题，系统会自动回滚到之前正常的固件区域。

## 为什么需要两个插槽？

OTA 更新是一项“可能失败”的操作。由于断电或网络中断等原因，可能只能写入部分二进制，此时若保留了之前的应用，就能进行恢复。

如此通过“保留当前应用，同时写入新应用”的冗余方式，提升了 OTA 的可靠性。  
这是固件更新中极为重要的设计理念。

## 常见误解与故障示例

### “factory 分区未使用” 问题

一旦执行 OTA 后，之后基本在 **ota_0** 和 **ota_1** 之间切换。  
**factory 分区**仅作为“首次启动”或“紧急恢复”用途。

### “分区不足” 问题

使用 OTA 时，需要为**两个 OTA 插槽（ota_0 和 ota_1）**预留区域。  
如果区域不足，就无法写入 OTA 更新固件，会报错。

### “启动循环” 问题

即使写入了新固件，启动失败也可能陷入重启循环。  
为防止这种情况，建议在设计中加入应用验证和回滚处理。  
以下 ESP-IDF 函数非常有效。（该函数也可以在 Arduino 框架中使用）  
```c
esp_ota_mark_app_valid_cancel_rollback();
```
在应用能够判断“正常启动并运行”的时机调用上述函数，可清除回滚标记，并保证之后的启动继续使用当前固件。

但需满足以下条件。

- 分区表需支持 OTA（包含 ota_0 / ota_1）  
  使用 default_ota.csv 或自定义包含两个插槽。  
- 在用 esp_ota_set_boot_partition() 等函数修改后，需要重启  
  在应用启动后的验证阶段需调用 esp_ota_mark_app_valid_cancel_rollback()。

#### 示例程序

在 [前回](/iot/internet-of-things-16/) 创建的程序中，尝试集成了 `esp_ota_mark_app_valid_cancel_rollback()`。  
添加的源码如下两处。  
```cpp
#include "esp_ota_ops.h"
```
```cpp
  if (WiFi.waitForConnectResult() == WL_CONNECTED) {
    esp_ota_mark_app_valid_cancel_rollback();
    Serial.println("Marked as valid, rollback canceled");
  }
```

集成回滚处理的完整程序如下。  
```cpp
#include <Arduino.h>

#include <WiFi.h>
#include <WebServer.h>
#include <Update.h>
#include <ArduinoOTA.h>
#include "esp_ota_ops.h"

const char* ssid = "YOUR_SSID";         // 请根据各自的 Wi-Fi 环境指定 SSID
const char* password = "YOUR_PASSWORD"; // 请根据各自的 Wi-Fi 环境指定密码

WebServer server(80);

const char* upload_html = R"rawliteral(
<form method='POST' action='/update' enctype='multipart/form-data'>
  <input type='file' name='update'>
  <input type='submit' value='Update'>
</form>
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

  // 建议在 Wi-Fi 连接完成后等安全时机调用
  if (WiFi.waitForConnectResult() == WL_CONNECTED) {
    esp_ota_mark_app_valid_cancel_rollback();
    Serial.println("Marked as valid, rollback canceled");
  }

  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html", upload_html);
  });

  server.on("/update", HTTP_POST, []() {
    server.send(200, "text/html", update_success_html);  // 返回更新成功后的重定向 HTML
    delay(1000);  // 用于显示消息的延迟时间
    ESP.restart();  // 重置 ESP32
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

  ArduinoOTA.setPassword("admin");  // <- 与 platform.ini 中指定的 password 保持一致

  ArduinoOTA.begin();

  server.begin();
}

void loop() {
  ArduinoOTA.handle();
  server.handleClient();
}
```

程序启动后，将输出如下日志。  
```shell
.WiFi connected
IP address: 192.168.0.65
Marked as valid, rollback canceled
```

## 面向实际应用的建议

- 由于 OTA 会重写整个**固件**而非小补丁，因此需关注固件大小  
- 为应对接收错误，需谨慎设计**重试次数**和**超时设置**  
- 在应用中加入**版本号**，并对 OTA 对象与当前固件进行**兼容性检查**  
- 为恢复出厂状态，需提供**复位模式（如长按按钮）**

## 默认以外的分区表

最新的分区表信息可在以下 [仓库](https://github.com/espressif/arduino-esp32) 的 `tools/partitions/` 文件夹中查看。

| 文件名              | 内容                                         |
|---------------------|----------------------------------------------|
| `minimal.csv`       | 最小配置（无 SPIFFS、无 OTA）                  |
| `no_ota.csv`        | 无 OTA 功能（仅一个应用）                     |
| `huge_app.csv`      | 针对大型应用（最大化应用区域）                |
| `minimal_spiffs.csv`| 含最小 SPIFFS（需要最小文件系统时）           |

### 在 platformio.ini 中的指定方法

若要使用默认分区表之外的分区表，在 platformio.ini 文件中进行如下设置：  
（示例使用 `huge_app.csv`）

```ini
board_build.partitions = huge_app.csv
```

之前在使用带相机的 ESP32 开发板（ESP32-WROVER-E）时，集成相机模块的程序体积相当大。  
由于需要增大分区表中的应用区域，我不知情地使用了 `huge_app.csv`，结果陷入了困境。  
顺便提一下，`huge_app.csv` 的分区表如下所示。

| Name     | Type | SubType | Offset   | Size    | Flags |
|----------|------|---------|----------|---------|-------|
| nvs      | data | nvs     | 0x9000   | 0x5000  |       |
| otadata  | data | ota     | 0xe000   | 0x2000  |       |
| app0     | app  | ota_0   | 0x10000  | 0x300000|       |
| spiffs   | data | spiffs  | 0x310000 | 0xE0000 |       |
| coredump | data | coredump| 0x3F0000 | 0x10000 |       |

该配置仅定义了 `ota_0`，未定义 `ota_1`，因此执行 OTA 会失败。

## 总结

理解其机制后，ESP32 的 OTA 并不难。  
关键在于“分区设计”和“错误恢复设计”。  
若构建得当，将成为可稳定进行无线更新的强大系统。

[在此汇总了有关 IoT 的教程和实战技巧。](/iot/)

希望对 IoT 的应用有所帮助。

<style>
img {
    border: 1px gray solid;
}
</style>
