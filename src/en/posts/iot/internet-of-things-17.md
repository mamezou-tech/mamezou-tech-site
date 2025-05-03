---
title: >-
  Trying Out IoT (Part 17: A Thorough Guide to ESP32 OTA Fundamentals: From
  Flash Memory Layout to Operation Mechanisms)
author: shuichi-takatsu
date: 2025-04-30T00:00:00.000Z
tags:
  - esp32
  - ota
  - platformio
image: true
translate: true

---

[Previous](/iot/internet-of-things-16/) we tried "OTA (Over The Air)" with ESP32.  
Although the order was reversed, this time we’ll take a detailed look at the basic mechanism of OTA.

## Introduction

The ESP32 natively supports the "Over The Air (OTA)" feature, which allows rewriting the program wirelessly.  
In this article, we will delve into the **flash memory layout** and the **mechanism of OTA operation**, answering questions such as "Why are two application partitions necessary?" and "How is the updated application selected and booted?"

## Mechanisms Behind OTA

### Flash Memory Layout

The flash memory of the ESP32 is managed by a "partition table."  
A partition is a "division" of an area on flash memory.

When using the "Arduino framework" in PlatformIO, the partition table information is included in the following folder:  
`<UserFolderPath>\.platformio\packages\framework-arduinoespressif32\tools\partitions`

In that folder you will find a `default.csv` file.  
This file contains the default partition table configuration.  
In my environment, it was set up as follows:

| Name     | Type | SubType | Offset   | Size    | Flags |
|:---------|:-----|:--------|:---------|:--------|:------|
| nvs      | data | nvs     | 0x9000   | 0x5000  |       |
| otadata  | data | ota     | 0xe000   | 0x2000  |       |
| app0     | app  | ota_0   | 0x10000  | 0x140000|       |
| app1     | app  | ota_1   | 0x150000 | 0x140000|       |
| spiffs   | data | spiffs  | 0x290000 | 0x160000|       |
| coredump | data | coredump| 0x3F0000 | 0x10000 |       |

The roles of each partition are as follows:
- **nvs** : NVS Storage (Non-Volatile Storage). A persistent storage area for settings and user data. Data is retained even when the power is off.
- **otadata**: Manages the state of OTA (Over-The-Air) updates. Indicates which application partition (ota_0 or ota_1) should be booted.
- **app0 / app1**: Application partitions for OTA updates. During an OTA update, app0 and app1 are used alternately. While one is running, the other is updated.
- **spiffs**: File storage area using SPIFFS (Serial Peripheral Interface Flash File System). Stores data such as configuration files and logs.
- **coredump**: Core dump area. Saves a memory dump when a system failure (e.g., crash) occurs, used later for failure analysis.

The flash memory map looks like this:  
The application partitions are provided in two slots (app0 and app1) to support OTA, and they are written alternately.

| Start Address | End Address   | Size      | Name      | Type  | Subtype | Remarks                |
|---------------|---------------|-----------|-----------|-------|---------|------------------------|
| 0x00000000    | 0x00007FFF    | 0x8000    | bootloader| -     | -       | Bootloader             |
| 0x00008000    | 0x00008FFF    | 0x1000    | partition | -     | -       | Partition Table        |
| 0x00009000    | 0x0000DFFF    | 0x5000    | nvs       | data  | nvs     | NVS Storage            |
| 0x0000E000    | 0x0000FFFF    | 0x2000    | otadata   | data  | ota     | OTA Data               |
| 0x00010000    | 0x0014FFFF    | 0x140000  | app0      | app   | ota_0   | OTA Slot 0             |
| 0x00150000    | 0x0028FFFF    | 0x140000  | app1      | app   | ota_1   | OTA Slot 1             |
| 0x00290000    | 0x003EFFFF    | 0x160000  | spiffs    | data  | spiffs  | SPIFFS File System     |
| 0x003F0000    | 0x003FFFFF    | 0x10000   | coredump  | data  | coredump| Core Dump Area         |

(Note: The entire flash is typically assumed to be 4MB (= 0x400000))

In ESP32 development environments, including the Arduino framework, the partition table itself (partition-table.bin) is by default always written to flash at 0x8000.

### Bootloader Operation

Assuming the Arduino framework, when the ESP32 boots, the first-stage bootloader built into ROM runs first. Then it loads the user-defined bootloader.bin written in flash and continues.

- UART Boot Check (Development Mode)  
  First, it checks whether write mode via UART (serial) is requested. If there is a write request from a PC, it switches to firmware rewriting.

- Flash Memory Initialization and Partition Table Loading  
  The beginning of flash memory (0x0000) contains the bootloader, which reads the partition table at 0x8000 and initiates the application startup process.

- Reading otadata (in OTA configuration)  
  From the otadata partition (default 0xE000), it reads information on the last successfully booted application and which application should be booted next.

- Determining the Appropriate Application Partition  
  Based on the read information, it selects either the ota_0 or ota_1 application partition.

- Fallback (Alternative) Process  
  If there is no valid information in otadata or partition validation fails, the following fallback actions are performed:  
    - If a factory partition (*described below) exists, it boots from that.  
    - If not, it stops or resets as a boot failure.

- Loading and Executing the Application  
  It loads the code from the selected application flash partition into RAM and starts execution.

Supplementary notes on the factory partition:
- In Arduino, it is often not used by default, but in configurations without OTA, you can use only the factory partition.
- The factory partition acts as the default application.
- In OTA configurations, a dual setup using ota_0 / ota_1 is recommended, and the factory partition may be omitted.

## OTA Workflow

OTA updates on ESP32 proceed in the following steps:

- Receiving the New Firmware  
  Receive the new .bin file (firmware) via Wi-Fi or HTTP.

- Determining the Write Destination  
  Select the application partition that is not currently running (e.g., if ota_0 is running, choose ota_1) and write the firmware there.

- Updating otadata After Write Completion  
  Once the write succeeds, the otadata section is updated so that the new partition will be used on the next boot.

- Restarting to Run the New Firmware  
  Restart the device and boot with the new firmware.

- Rollback on Boot Failure  
  If an issue is detected after booting, there is a mechanism to automatically roll back to the previously working firmware partition.

## Why Are There Two Slots?

OTA updates are operations that can potentially fail. Even if only part of the binary is written due to a power outage or network disconnection, if the previous application remains intact, you can recover.

This redundancy of "keeping the current application while writing the new one" enhances the reliability of OTA. This is an extremely important design philosophy in firmware updates.

## Common Misconceptions and Trouble Examples

### 'Factory Partition Not Used' Issue

Once you perform OTA, it will basically continue switching between **ota_0** and **ota_1**. The **factory partition** is used only for the "first boot" or for "emergency recovery."

### 'Not Enough Partition Space' Issue

When using OTA, you need to allocate space for **two OTA slots (ota_0 and ota_1)**. If there isn't enough space, you won't be able to write the firmware for the OTA update, resulting in an error.

### 'Boot Loop' Issue

Even if you write new firmware, a failed boot can cause a reboot loop. To prevent this, it is recommended to incorporate application validation and rollback processing into your design. The following function in ESP-IDF is effective (this function can also be used with the Arduino framework):

```c
esp_ota_mark_app_valid_cancel_rollback();
```

By calling the above function at a point where the application can determine that it "has started and operated correctly," it clears the rollback flag, ensuring that the current firmware continues to be used on subsequent boots.

However, the following conditions must be met:

- The partition table must support OTA (including ota_0 / ota_1), e.g., default_ota.csv or a custom table containing two slots.
- After calling functions like esp_ota_set_boot_partition(), the device must be rebooted. After the application starts, you need to call esp_ota_mark_app_valid_cancel_rollback() during the validation phase.

#### Sample Program

In the program we created in [the previous article](/iot/internet-of-things-16/), I integrated `esp_ota_mark_app_valid_cancel_rollback()`. The added source code is the following two points:

```cpp
#include "esp_ota_ops.h"
```

```cpp
  if (WiFi.waitForConnectResult() == WL_CONNECTED) {
    esp_ota_mark_app_valid_cancel_rollback();
    Serial.println("Marked as valid, rollback canceled");
  }
```

Here is the complete program with the rollback processing integrated:

```cpp
#include <Arduino.h>

#include <WiFi.h>
#include <WebServer.h>
#include <Update.h>
#include <ArduinoOTA.h>
#include "esp_ota_ops.h"

const char* ssid = "YOUR_SSID";         // Specify the SSID of your own Wi-Fi environment
const char* password = "YOUR_PASSWORD"; // Specify the password of your own Wi-Fi environment

WebServer server(80);

const char* upload_html = R"rawliteral(
<form method='POST' action='/update' enctype='multipart/form-data'>
  <input type='file' name='update'>
  <input type='submit' value='Update'>
</form>
)rawliteral";

// HTML to redirect after a successful update
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

  // Call at a safe timing, such as after Wi-Fi connection is complete
  if (WiFi.waitForConnectResult() == WL_CONNECTED) {
    esp_ota_mark_app_valid_cancel_rollback();
    Serial.println("Marked as valid, rollback canceled");
  }

  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html", upload_html);
  });

  server.on("/update", HTTP_POST, []() {
    server.send(200, "text/html", update_success_html);  // Return the redirect HTML after a successful update
    delay(1000);  // Time to display the message
    ESP.restart();  // Reset the ESP32
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

  ArduinoOTA.setPassword("admin");  // <- Match the password specified in platform.ini

  ArduinoOTA.begin();

  server.begin();
}

void loop() {
  ArduinoOTA.handle();
  server.handleClient();
}
```

When the program starts, the following log is output:

```shell
.WiFi connected
IP address: 192.168.0.65
Marked as valid, rollback canceled
```

## Advice for Production Use

- Because OTA rewrites the **entire firmware** rather than small diffs, be mindful of the firmware size.
- Design **retry counts** and **timeout settings** carefully to handle reception errors.
- Include a **version number** in the application and perform **compatibility checks** between the OTA target and the current firmware.
- Provide a **reset mode (e.g., long press of a button)** to return to factory settings.

## Non-Default Partition Tables

You can find the latest partition table information in the `tools/partitions/` folder of the [following repository](https://github.com/espressif/arduino-esp32).

Here are some representative partition tables other than the default one:

| Filename               | Description                                    |
|:-----------------------|:-----------------------------------------------|
| `minimal.csv`          | Minimal configuration (no SPIFFS, no OTA)      |
| `no_ota.csv`           | No OTA functionality (single application only) |
| `huge_app.csv`         | For large applications (maximized app area)    |
| `minimal_spiffs.csv`   | Minimal with SPIFFS (when you want a basic file system) |

### Specifying in platformio.ini

To use a partition table other than the default, set it in the platformio.ini file as follows (the example uses `huge_app.csv`):

```ini
board_build.partitions = huge_app.csv
```

In the past, when I was using an ESP32 development kit with a camera module (ESP32-WROVER-E), the program integrating the camera became quite large. Because I needed to enlarge the application partition in the partition table, I fell into a trap by unknowingly using `huge_app.csv`. By the way, the partition table in `huge_app.csv` is as follows:

| Name     | Type | SubType | Offset   | Size     | Flags |
|----------|------|---------|----------|----------|-------|
| nvs      | data | nvs     | 0x9000   | 0x5000   |       |
| otadata  | data | ota     | 0xe000   | 0x2000   |       |
| app0     | app  | ota_0   | 0x10000  | 0x300000 |       |
| spiffs   | data | spiffs  | 0x310000 | 0xE0000  |       |
| coredump | data | coredump| 0x3F0000 | 0x10000  |       |

Only ota_0 is defined; there is no ota_1. Therefore, OTA will fail.

## Summary

ESP32 OTA is not that difficult once you understand the mechanism. The key points are "partition design" and "error recovery design." If properly implemented, it becomes a powerful system capable of stable wireless updates.

[I have compiled tutorials and practical techniques related to IoT.](/iot/)

I hope this will be helpful for your IoT applications.

<style>
img {
    border: 1px gray solid;
}
</style>
