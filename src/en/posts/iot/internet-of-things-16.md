---
title: 'Trying IoT (Part 16: Easily update ESP32 firmware wirelessly using OTA!)'
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

[Last time](/iot/internet-of-things-15/) we tackled long-duration battery operation using the ESP32's DeepSleep feature. This time, we will take on OTA (Over The Air) with the ESP32.

## What is OTA?

OTA stands for "Over The Air," a mechanism to rewrite programs via wireless communication.

Normally, to write a program to the ESP32, you need to connect it to your PC with a USB cable. However, many ESP32s come equipped with WiFi and Bluetooth from the factory, so it would be very convenient if you could rewrite programs wirelessly. By using OTA, you can rewrite programs via WiFi, making it effective in scenarios like:

- Sensors installed outdoors
- Devices installed in hard-to-reach places

Achieving these makes IoT feel like a step forward.

## Setting up ESP32 OTA update environment with VSCode + PlatformIO

In this article, we will explain how to set up an environment for ESP32 OTA updates using VSCode + PlatformIO. We will focus on configuring the PlatformIO.ini file and creating the OTA program, leaving VSCode installation, PlatformIO extension installation, and project creation to another article [here](/iot/internet-of-things-14/#開発環境「platform-io」).

For this article, we will use the "ESP32 LOLIN D32" board. The ESP32 LOLIN D32 has a built-in LED on the board, making visual confirmation of operation easy. If you are testing on an ESP32 without a controllable LED, you will need to build an external circuit to light an LED (LED blinking is used only for visual confirmation, so you can omit it if you like). Also, the LOLIN D32 has a terminal for connecting a battery, so it can run on battery power instead of micro USB. (Hereafter, we will simply refer to it as "ESP32".)

### PlatformIO.ini file configuration

To enable OTA on the ESP32, add the following settings to platformio.ini:

```ini
[env:lolin_d32]
platform = espressif32
board = lolin_d32           ; ← The board name used this time
framework = arduino

; --- OTA settings ---
upload_protocol = espota
upload_port = 192.168.0.65   ; ← IP address of the ESP32 to update via WiFi
upload_flags =
    --auth=admin             ; ← Set the OTA password (must match the one in your program)

; --- Serial monitor settings ---
monitor_speed = 115200
```

### Explanation of each item

We will explain each setting:

| Item               | Description                                                                           |
|--------------------|---------------------------------------------------------------------------------------|
| `platform`         | The platform to use. For ESP32, use `espressif32`.                                    |
| `board`            | The board to use. Here it is `lolin_d32`.                                             |
| `framework`        | The framework to use. Here it is `arduino`.                                           |
| `upload_protocol`  | Specify the upload method as `espota` (OTA).                                          |
| `upload_port`      | Specify the ESP32's IP address (set according to your environment).                   |
| `upload_flags`     | Specify authentication info (auth) for OTA (in this example, the password is `admin`).|
| `monitor_speed`    | Serial monitor baud rate (serial communication is used to confirm if WiFi is working correctly). |

### Notes

- You need code on the **ESP32 side** to accept OTA updates. In this article, we will use the "ArduinoOTA" library.  
- As expected, you need to upload the program to the ESP32 via the usual method (USB-COM port) **at least once** initially.  
  When uploading via USB-COM port, comment out the `upload_protocol`, `upload_port`, and `upload_flags` sections.  
- Make sure that the OTA port (default is port 3232) is not blocked by your router or firewall (there is plenty of information online on how to allow ports, so we'll skip that).  
- The IP address set in `upload_port` must be the one the ESP32 obtains after connecting to WiFi.

### About the WiFi IP address

The IP address used for OTA updates (the IP address specified in `upload_port`) must be the one the ESP32 obtains when it connects to WiFi.  
If the IP address assigned by DHCP changes, you will not be able to upload via OTA, so consider the following countermeasures:

- Assign a fixed IP address to the ESP32’s MAC address on the router side.  
- Set a static IP address on the ESP32 side.

This ensures you can always update via OTA using the same IP address, stabilizing operation.  
If you don't know the ESP32’s IP address (or MAC address) in your home router settings, you can upload a program via USB-COM port, press the reset button to reboot, and check the serial output for the port information.

When you press the reset button on the ESP32, you will see logs like this:  
(This time it shows "IP address: 192.168.0.65")

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

## Simple OTA ("LED Blink" program)

First, let's integrate OTA into a simple program that just blinks an LED.  
Below is the sample program. It simply blinks the LED at 500 ms intervals.

Key points for OTA:  
- Include `<WiFi.h>` and `<ArduinoOTA.h>`.  
- Always call `ArduinoOTA.begin();` in `setup()`.  
- Continuously call `ArduinoOTA.handle();` in `loop()`.

```cpp
#include <Arduino.h>

#include <WiFi.h>
#include <ArduinoOTA.h>

const char* ssid = "YOUR_SSID";         // Specify your WiFi SSID
const char* password = "YOUR_PASSWORD"; // Specify your WiFi Password

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

  ArduinoOTA.setPassword("admin");  // <- Match this password with the one in platform.ini

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

With just this, you can rewrite the ESP32 program over WiFi. You can upload via OTA in the same way as uploading via the USB-COM port.  
(Note: **For the first time only, upload the program via the USB-COM port in advance**.)

When you execute the upload, you will see logs like this if the upload succeeds:
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
...
Uploading: [============================================================] 100% Done...

20:51:11 [INFO]: Waiting for result...
20:51:11 [INFO]: Result: OK
20:51:11 [INFO]: Success
```

If you monitor the ESP32’s serial communication, you should see logs like this, indicating that the ESP32 has rebooted after a successful OTA upload:
```shell
rst:0xc (SW_CPU_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
...
.WiFi connected
IP address: 192.168.0.65
```

### Note

When performing an OTA update, the ESP32 will restart (reboot).  
Therefore, any values held in memory will be initialized. If you want to carry over "data from before the update," consider these methods:

- Save to NVS (Non-Volatile Storage)  
  The ESP32 has a mechanism called NVS, which allows you to save key-value pairs in a portion of flash memory. You can easily preserve settings or small counters.
- Save as files in SPIFFS or LittleFS  
  If you have more substantial data (configuration files, log files, etc.), you can use a file system to save them as files.
- Write to external storage (e.g., SD card)  
  For larger amounts of data, you can temporarily store it on an SD card, though it adds hardware.

We won’t implement data retention this time, but I’d like to try it when I get the chance.

## Setting up a WebServer with OTA support

Next, let's level up a bit. We’ll set up a simple Web server on the ESP32 that can be accessed from a browser, while keeping OTA support.

Below is the sample program. We added `<WebServer.h>` to the includes.

```cpp
#include <Arduino.h>

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoOTA.h>

const char* ssid = "YOUR_SSID";         // Specify your WiFi SSID
const char* password = "YOUR_PASSWORD"; // Specify your WiFi Password

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

  ArduinoOTA.setPassword("admin");  // <- Match this password with the one in platform.ini

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

Build and upload the program. (If you have already uploaded the LED blink program, you can upload this via OTA!)  
If the ESP32 outputs logs like this, the WebServer has started:
```shell
rst:0xc (SW_CPU_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
...
.WiFi connected
IP address: 192.168.0.65
HTTP server started
```

In your browser, navigate to the ESP32’s IP address (e.g., 192.168.0.65), and you should see:
```
Hello from ESP32 WebServer!
```
This shows that both the Web server and OTA functions are working simultaneously. Very simple!

## Firmware upload from the browser

Finally, let’s enable firmware upload and rewriting from our own web page.

Below is the sample program. We added `<Update.h>` to includes to add the Update functionality. Upload this program to the ESP32 (of course via OTA!).

```cpp
#include <Arduino.h>

#include <WiFi.h>
#include <WebServer.h>
#include <Update.h>
#include <ArduinoOTA.h>

const char* ssid = "YOUR_SSID";         // Specify your WiFi SSID
const char* password = "YOUR_PASSWORD"; // Specify your WiFi Password

WebServer server(80);

const char* upload_html = R"rawliteral(
<form method='POST' action='/update' enctype='multipart/form-data'>
  <input type='file' name='update'>
  <input type='submit' value='Update'>
</form>
)rawliteral";

// HTML to redirect after successful update
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
    server.send(200, "text/html", update_success_html);  // Return the redirect HTML after a successful update
    delay(1000);  // Time to display the message
    ESP.restart();  // Restart the ESP32
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

  ArduinoOTA.setPassword("admin");  // <- Match this password with the one in platform.ini

  ArduinoOTA.begin();

  server.begin();
}

void loop() {
  ArduinoOTA.handle();
  server.handleClient();
}
```

After uploading the program, access the ESP32’s IP address in your browser, and you will see a file selector and upload button.  
![](https://gyazo.com/59214f2e7a201cfb3719a4768417dde9.png)

Select the built firmware (.bin file) here to upload, and the ESP32 itself will be rewritten with the new firmware.  
![](https://gyazo.com/98ae15444c37e0255abc38d0333c652e.png)

"firmware.bin" is selected.  
![](https://gyazo.com/0e7e0a8e1bc5654dc15c7dea43fb0a8b.png)

Click the "update" button.  
![](https://gyazo.com/d7900c8bc96d696a1161db7be31df6f4.png)

You will be informed that the update was successful and that you will be redirected to the home page after 5 seconds.  
![](https://gyazo.com/0bce04cd85c252b513ef511c2360b523.png)

Additionally, on the serial console, you will see logs indicating that "firmware.bin" was updated:  
```shell
Update: firmware.bin
Update complete
ets Jul 29 2019 12:21:46

rst:0xc (SW_CPU_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
...
.WiFi connected
IP address: 192.168.0.65
```

This is really convenient, so I think it's a technique you’ll want to incorporate into IoT device development.

## Conclusion

This time, we tried out the ESP32's OTA feature, leveling up in the following order:

- Basic OTA (LED blinking)  
- OTA with a WebServer  
- OTA with firmware upload from the web

There are still many issues in the sample code regarding error handling and security, but I hope you got a feel for the basic framework.

OTA functionality is particularly important for IoT devices that are difficult to maintain on site.  
Please try using it in your own development.

[I'm compiling tutorials and practical techniques for IoT here.](/iot/)

I hope this is helpful for your IoT applications.

## Appendix

### ESPAsyncWebServer version

There is a more powerful WebServer called "ESPAsyncWebServer".  
Below is a program I put together after trial and error. It’s a bit of a quick and dirty job, but it works (haha).  
Here, I'm using LittleFS (file system) and FreeRTOS tasks for a bit of sophistication. Try to decipher it!  
(Security aspects are quite lax, so it needs improvement.)

```cpp
#include <Arduino.h>

#include <WiFi.h>
#include <ArduinoOTA.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <Update.h>
#include <Ticker.h>

const char* ssid = "YOUR_SSID";         // Specify your WiFi SSID
const char* password = "YOUR_PASSWORD"; // Specify your WiFi Password

static int T_DELAY = 500;

// Create a web server on port 80
AsyncWebServer server(80);

// For OTA
Ticker otaTicker;
bool otaRequested = false;
String otaFilename;

// --- Function prototypes ---
void handleFileUpdate(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final);
void updateFirmware(String filename);
void otaTask(void *pvParameters);

// --- Setup ---
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
  Serial.println("MAC Address: " + WiFi.macAddress()); // Output MAC address

  pinMode(LED_BUILTIN, OUTPUT);

  ArduinoOTA.setPassword("admin");  // <- Match this password with the one in platform.ini
  
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

  // Create FreeRTOS OTA task
  xTaskCreatePinnedToCore(otaTask, "OTA Task", 10000, NULL, 1, NULL, 1);  

  // When "/" is accessed, display the top page
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

  // Update page (GET)
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

  // Update handling (POST)
  server.on("/update", HTTP_POST, [](AsyncWebServerRequest *request){ 
    // Do nothing on completion here
  }, handleFileUpdate);

  // Start web server
  server.begin();
}

// --- File upload handling ---
void handleFileUpdate(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final){
  if (!index){
    Serial.printf("UpdateStart: %s\n", filename.c_str());

    // Extension check (only accept .bin)
    if (!filename.endsWith(".bin")) {
      request->send(400, "text/plain", "Only .bin files are allowed");
      return;
    }

    // Remove existing file with the same name
    LittleFS.remove("/" + filename);
    request->_tempFile = LittleFS.open("/" + filename, "w");
  }
  if (len){
    request->_tempFile.write(data, len);
  }
  if (final){
    Serial.printf("UpdateEnd: %s (%u)\n", filename.c_str(), index+len);
    request->_tempFile.close();

    // First, return a response to the browser
    request->send(200, "text/html", R"rawliteral(
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Update Success</title>
        <script>
          setTimeout(function(){
            window.location.href = '/';
          }, 2000); // Redirect to top page after 2 seconds
        </script>
      </head>
      <body>
        <h2>Update successful!</h2>
        <p>Restarting device... Redirecting to Home in 2 seconds.</p>
      </body>
      </html>
    )rawliteral");

    // Schedule OTA execution
    otaFilename = "/" + filename;
    otaRequested = true;
    otaTicker.once(1, []() {
      updateFirmware(otaFilename);
    });
  }
}

// --- Firmware update processing ---
void updateFirmware(String filename) {
  File firmware = LittleFS.open(filename, "r");
  if (!firmware) {
    Serial.println("Failed to open file for OTA");
    return;
  }

  if (Update.begin(firmware.size(), U_FLASH)) { // Specify U_FLASH explicitly
    size_t written = Update.writeStream(firmware);
    if (written == firmware.size()) {
      Serial.println("OTA Update successful");
      if (Update.end()) {
        Serial.println("Rebooting...");
        firmware.close();
        LittleFS.remove(filename); // Remove the uploaded file after success
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

// OTA task
void otaTask(void *pvParameters) {
  ArduinoOTA.begin();  // Initialize OTA

  while (true) {
    ArduinoOTA.handle();  // Check OTA progress
    delay(100);  // Wait a bit to avoid blocking other tasks
  }
}

// --- Loop ---
void loop(){
  // User processing

  // LED blink
  digitalWrite(LED_BUILTIN, HIGH);
  delay(T_DELAY);
  digitalWrite(LED_BUILTIN, LOW);
  delay(T_DELAY);
}
```

platformio.ini file contents are as follows. Adjust the board type, IP address, OTA password, etc. to your environment.
```ini
[env:lolin_d32]
platform = espressif32
board = lolin_d32            ; ← Board type to use
framework = arduino
upload_protocol = espota
upload_port = 192.168.0.65   ; ← IP address of the ESP32 to update via WiFi
monitor_speed = 115200
board_build.filesystem = littlefs
upload_flags = 
    --auth=admin             ; ← Set the OTA password (must match the one in your program)
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
