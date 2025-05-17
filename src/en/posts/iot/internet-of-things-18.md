---
title: 'Trying Out IoT (Part 18: Real-time JPEG Video Streaming with ESP32 and OV2640)'
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

[Last time](/en/iot/internet-of-things-17/), we explained the basics of ESP32 OTA.  
This time, we'll try implementing real-time streaming of JPEG images over Wi-Fi using the ESP32-WROVER-E development board and an OV2640 camera module.  
(This is not the main topic, but we'll also implement OTA functionality.)

## Introduction

In PlatformIO, some ESP-IDF libraries are available even under the Arduino framework.  
This time, we'll use the `esp32-camera` driver in a PlatformIO + Arduino framework environment.  
Although this driver was originally developed for ESP-IDF, it can also be used with the Arduino framework.

In this article, we'll focus on **setting up the PlatformIO.ini file and creating the JPEG streaming program**.  
For instructions on installing VSCode, adding the PlatformIO extension, and creating a project, refer to [another article](/en/iot/internet-of-things-14/#開発環境「platform-io」).

## Required Items

Here’s the hardware we used this time.

### ESP32-WROVER-E Development Board

The ESP32-WROVER-E development board (for example, [this one](https://electronicwork.shop/items/658456c145c7bd0ccc8ad086?srsltid=AfmBOoqdnz6Fxa3Fuu6BuT_WSC3hzkBS1L6KCc_ARC9VB8YjaCqlNPp5)) is a board equipped with the ESP32 microcontroller, which supports Wi-Fi and Bluetooth, and features built-in external memory (PSRAM).  
It's suitable for memory-intensive applications like image processing or webcams. You can use it easily in development environments such as Arduino or PlatformIO.  
(Note: Unfortunately, the Arduino framework seems to recognize only up to 4MB of PSRAM.)

### OV2640 Camera Module

The OV2640 (for example, [this one](https://www.amazon.co.jp/dp/B0BPMCSVQK/?th=1)) is a small camera module with a 2MP CMOS sensor.  
It supports JPEG output and is widely used in webcams, image recognition, and other applications when paired with microcontrollers like the ESP32. It's also compact and low power.  
However, the frame rate is about up to 30 FPS at SVGA resolution.  
It's very inexpensive and easy to acquire, making it suitable for beginners.

## Camera Library "esp32-camera"

To use the camera module with ESP32 + PlatformIO + Arduino framework, we'll use the `esp32-camera` (camera control driver).  
`esp32-camera` is a library that connects the ESP32 with a camera module to enable image capture and streaming.  
It uses PSRAM to handle high-resolution JPEG images.

Because internal memory is insufficient for temporarily storing high-resolution images or high-speed transfer, external PSRAM (4MB/8MB) is essential.  
Without PSRAM, resolution and frame rate are limited, and JPEG compression and image processing become unstable.  
Choose a development board with built-in PSRAM, such as ESP32-WROVER or ESP32-CAM.

## Project Configuration (`platformio.ini`)

Let's explain the contents of the project's main configuration file, `platformio.ini`.

```ini
[env:esp-wrover-kit]
platform = espressif32
board = esp-wrover-kit
framework = arduino
; OTA settings
upload_protocol = espota
upload_port = 192.168.0.66  # IP address of the target ESP32
monitor_speed = 115200
upload_flags =
    --auth=admin            # ArduinoOTA password
; PSRAM settings
build_flags =
    -DBOARD_HAS_PSRAM
    -mfix-esp32-psram-cache-issue
```

The OTA settings are explained in [a previous article](/en/iot/internet-of-things-16/), so we won't go into detail here.

The `esp32-camera` library is included in "Arduino for ESP32", so no additional settings are required in platformio.ini.  
Simply add `#include "esp_camera.h"` in your main program, and the compiled header will be found in the default include path as part of the framework.

The following settings are important when using `esp32-camera`:
* `build_flags`:
  * `-DBOARD_HAS_PSRAM`: A macro definition that tells the compiler that the board has PSRAM. This is crucial for the driver to use PSRAM for the frame buffer.
  * `-mfix-esp32-psram-cache-issue`: A compiler flag to avoid cache-related issues when using PSRAM (details are due to ESP32's PSRAM constraints).

## Sample Program

```c
#include <Arduino.h>
#include "esp_camera.h"                 // Declaration to use the esp32-camera library
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoOTA.h>

const char* ssid = "YOUR_SSID";         // Specify the SSID of your WiFi network
const char* password = "YOUR_PASSWORD"; // Specify the password of your WiFi network

// https://github.com/espressif/arduino-esp32/blob/master/libraries/ESP32/examples/Camera/CameraWebServer/camera_pins.h
// Using the CAMERA_MODEL_WROVER_KIT configuration
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

// Camera configuration structure
camera_config_t config;

// Create an instance of the web server
WebServer server(80);  // Using port number 80

// MJPEG stream header
const char* STREAM_HEADER = 
  "HTTP/1.1 200 OK\r\n"
  "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n"
  "\r\n";

// JPEG frame header
const char* FRAME_HEADER = 
  "--frame\r\n"
  "Content-Type: image/jpeg\r\n"
  "Content-Length: %d\r\n"
  "\r\n";

// Root endpoint
const char* root_html = R"rawliteral(
  <form method='POST' action='/update' enctype='multipart/form-data'>
    <input type='file' name='update'>
    <input type='submit' value='Update'>
  </form>
  <p><a href='/stream'>Stream Video</a></p>
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

// JPEG stream handler
void handleJPGStream() {
  WiFiClient client = server.client();
  if (!client.connected()) {
    Serial.println("Client disconnected");
    return;
  }

  camera_fb_t * fb = NULL;

  // Send MJPEG stream header
  client.print(STREAM_HEADER);

  while (client.connected()) {
    // Capture a frame from the camera
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Camera capture failed");
      return;
    }

    // Send JPEG frame header
    client.printf(FRAME_HEADER, fb->len);
    client.write(fb->buf, fb->len);  // Send JPEG data

    // Release the frame buffer
    esp_camera_fb_return(fb);

    // 10 FPS: delay(100)
    // 20 FPS: delay(50)
    // 30 FPS: delay(33)
    delay(33);  // Wait until the next frame (adjust FPS)
  }
}

void setup() {
  // Initialize the serial monitor
  Serial.begin(115200);
  Serial.setDebugOutput(true);

  // Check the size of PSRAM
  if (ESP.getPsramSize()) {
    Serial.println("PSRAM is present.");
    Serial.print("PSRAM size: ");
    Serial.println(ESP.getPsramSize());
  } else {
    Serial.println("PSRAM is not present.");
  }

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());  // Print the IP address

  // Camera configuration
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
  config.jpeg_quality = 12;  // Image quality
  config.fb_count = 2;  // Use multiple frame buffers
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;  // Capture when frame buffer is empty
  config.pixel_format = PIXFORMAT_JPEG;  // Set image format to JPEG
  config.fb_location = CAMERA_FB_IN_PSRAM;  // Place frame buffer in PSRAM

  // Initialize the camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
  
  // Serve the homepage at the root endpoint
  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html", root_html);
  });

  // Stream video at the /stream endpoint
  server.on("/stream", HTTP_GET, handleJPGStream);

  // Handle firmware update at the /update endpoint
  server.on("/update", HTTP_POST, []() {
    server.send(200, "text/html", update_success_html);  // Return redirect HTML after update
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

  ArduinoOTA.setPassword("admin");  // Match the password specified in platform.ini

  ArduinoOTA.begin();  

  // Start the server
  server.begin();
  Serial.println("Web server started!");
}

void loop() {
  ArduinoOTA.handle();
  server.handleClient();
}
```

## Program Explanation

Because the OTA update part was introduced in [a previous article](/en/iot/internet-of-things-16/), we'll explain only the following two points here:
* The camera initialization part in the setup() function
* The handleJPGStream() function

### Camera Initialization Settings (setup() function)

- **Camera configuration (camera_config_t config;)**
  - **Pin configuration**:  
    Assign various GPIO pins (D0–D7, XCLK, PCLK, VSYNC, HREF, SDA, SCL, RESET, PWDN) to config to connect a camera module such as OV2640 to the ESP32.
  - **Clock frequency**:  
    Set the external clock signal (XCLK) supplied to the camera to **20 MHz**.
  - **Frame size (FRAMESIZE_SVGA)**:  
    Set the frame size (resolution) of the image to **SVGA (800×600)**.
  - **JPEG quality (jpeg_quality = 12)**:  
    Specify the quality of JPEG compression. Lower values produce higher quality (0: highest quality – 63: lowest quality), and 12 is a moderate quality setting.
  - **Frame buffer count (fb_count = 2)**:  
    Allocate **2** frame buffers to support continuous image capture.
  - **Grab mode (CAMERA_GRAB_WHEN_EMPTY)**:  
    Only capture a new image when the frame buffer is empty, which can make memory usage more efficient.  
  - **Pixel format (PIXFORMAT_JPEG)**:  
    Output images in JPEG format, compressing data size for efficient transmission and storage.
  - **Frame buffer location (CAMERA_FB_IN_PSRAM)**:  
    Place the frame buffer in PSRAM to secure a large buffer while minimizing the use of internal RAM.

- **Camera initialization (esp_camera_init(&config)) and error checking**  
    Use the esp_camera_init() function for initialization. If initialization fails, the error is logged and the process stops.

### JPEG Streaming (handleJPGStream() function)

- **Client connection check**  
  At the beginning of the function, get the connected client with `WiFiClient client = server.client();` and use `client.connected()` to check the connection status. If the connection is closed, terminate the process.

- **Send MJPEG start header (STREAM_HEADER)**  
  Send a multipart stream header to the client so that subsequent JPEG frames can be sent continuously.

- **Stream loop processing**  
  As long as the client is connected, repeat the following process:
  - Use `esp_camera_fb_get()` to capture a frame from the camera in JPEG format.
  - Use `client.printf(FRAME_HEADER, fb->len);` to send the per-frame header (Content-Type, etc.).
  - Use `client.write(fb->buf, fb->len);` to send the JPEG data to the client.
  - Use `esp_camera_fb_return(fb);` to release the frame buffer and prepare for the next frame.

- **Frame rate adjustment (delay(33))**  
  To achieve about 30 FPS streaming, insert a **33 ms** delay between frames.  
  You can adjust the FPS by changing the value in `delay()`.

## Operation Check

Access `http://<ESP32_IP_ADDRESS>/` from a web browser and confirm that the update form and a link to the stream are displayed.  
Click the `/stream` link (or directly access `http://<ESP32_IP_ADDRESS>/stream`) and confirm that the camera video is streaming.

The streamed video looked like this:  
![](https://gyazo.com/03a33c1e13bf50670b03c94112511fc4.png)

It's hardly pretty, to be honest (lol).  
Maybe I can fine-tune it a bit more, but I'll stop here for now.

## Issues Encountered and Solutions

* Camera PIN configuration for ESP32-WROVER-E  
  I struggled a lot because I couldn't find it anywhere.  
  I finally borrowed the `CAMERA_MODEL_WROVER_KIT` configuration from [here](https://github.com/espressif/arduino-esp32/blob/master/libraries/ESP32/examples/Camera/CameraWebServer/camera_pins.h).

* The mysterious RAM called PSRAM  
  I had no idea what it was for and googled it extensively.  
  Apparently, it's called "Pseudo Static RAM", but the name alone doesn't explain much.  
  The built-in RAM on the ESP32 is about 520KB, which is quite limited, and it's quickly exhausted when you try to do image or audio processing.  
  This is where PSRAM comes in. It's an external memory chip that can provide an additional 4MB to 8MB of RAM.  
  You might think, "Why didn't they just put more RAM on the chip in the first place?" but it's probably a balance of cost, power consumption, and chip size.  
  When using a camera, PSRAM is almost essential.  
  If you want to buffer a few frames of JPEG images, the internal RAM alone is not enough. The `fb_location = CAMERA_FB_IN_PSRAM` setting in `camera_config_t` is exactly for that purpose.  
  The system won't work properly unless you use PSRAM to secure the frame buffer.  
  So, I'm grateful I bought a "PSRAM-equipped model" without really understanding it (lol).

* Camera configuration defaults  
  It's basically a "trial and error" process (lol).  
  If you set the resolution above SVGA, you'll get severe frame drops.  
  I'm using it with the mindset that it's for experimentation.

## Conclusion

Using VSCode + PlatformIO, I was able to implement JPEG streaming with an ESP32-WROVER-E and an OV2640 camera.  
This demonstrates that by combining the ease of Arduino with the ESP-IDF camera driver `esp32-camera`, you can relatively easily develop high-performance applications.

[I've compiled tutorials and practical techniques related to IoT.](/iot/)

I hope this serves as a useful reference for leveraging IoT.

<style>
img {
    border: 1px gray solid;
}
</style>
