---
title: Debugging the ESP32 Development Board with ESP-PROG and Platform IO
author: shuichi-takatsu
date: 2024-01-03T00:00:00.000Z
tags:
  - esp-prog
  - esp32
  - platformio
  - debug
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/01/03/esp32-debug-by-esp-prog/).
:::



When programming with the convenient IoT device "ESP32 Development Board" (hereafter referred to as ESP32), I often find myself thinking, "Ah, I really want to debug this in Visual Studio Code (hereafter referred to as VSC)."

Previously, to debug programs, I would write print statements in the program to output the content I wanted to check to the COM port or to an external display like an OLED. However, it was cumbersome and tedious to add print statements every time to output internal variables for detailed checks.

This time, I would like to introduce the ESP-specific JTAG debugger "ESP-PROG (Espressif's official JTAG board)" which eliminates such tedious tasks all at once.

## What is ESP-PROG?

ESP-PROG appearance  
![](https://gyazo.com/a66550766c0acdb60b0b668ef8ef28c2.png)

You can purchase it from [Amazon](https://www.amazon.co.jp/dp/B0CNGS4J4V/) or [Switch Science](https://www.switch-science.com/products/7986) (although I bought it from a cheaper place).

It seems to be a board equipped with "FT2232HL (Dual USB Serial)". This device has two USB serial ports available, but this time we will use only one port for debugging, and the USB port on the ESP32 itself for programming. I would like to introduce programming using the remaining USB serial port of ESP-PROG on another occasion.

The development target is the 30-pin ESP32 (ESP32 Dev Module).  
(The reason for selecting this development target is that I only had a power board with 30 pins available for pulling out jumper pins. I considered using a breadboard, but for details on the usability of breadboards, please refer to [another article](/iot/internet-of-things-14/).)

ESP32 and power board  
![](https://gyazo.com/135b88bece0a3f32c3793675be30ec49.png)  
Set up by docking.  
![](https://gyazo.com/7fdb30dae9b6cd162c2298402b750636.png)

The pin configuration of ESP-PROG can be found at [this URL](https://www.circuitstate.com/pinouts/espressif-esp-prog-esp32-jtag-debug-probe-pinout-diagram/).  
For connecting to the ESP32, use the pins in the connector section labeled "JTAG COM n".  
(Set the jumper pin for switching the power voltage of ESP-PROG to the "5V" side.)  
![](https://gyazo.com/b2305021b977d18736957a3c6fb766d4.png)  

Connect ESP32 and ESP-PROG as shown in the following diagram.  
![](https://gyazo.com/ea4e95939e7fcde2588091f38489cfab.png)

|ESP-PROG|ESP32|
|:----|:----|
|ESP_TMS|GPIO14 (D14)|
|ESP_TCK|GPIO13 (D13)|
|ESP_TDO|GPIO15 (D15)|
|ESP_TDI|GPIO12 (D12)|
|GND|GND|

Connected state of ESP32 and ESP-PROG  
(I couldn't find a cable that fits exactly into the JTAG connector of ESP-PROG... I'm connecting using ordinary jumper cables.)  
![](https://gyazo.com/2dee33e3cdab05b8fba7568fd21efc56.png)

Connect the micro USB of both ESP-PROG and ESP32 to the PC.  
(Some types of ESP32 may have a Type-C USB connector, but it seems that micro USB types are still commonly distributed.)  
![](https://gyazo.com/e03d036c893b5a895fe0602940d5a050.png)

Check the COM ports in the Device Manager.  
![](https://gyazo.com/11ff9c723bf880121868a85d5344bf6e.png)

COM12, COM13, COM14 are the ones connected to ESP32 and ESP-PROG this time.  
The connections of the COM ports were as follows:  
- COM12: ESP32's serial port
- COM13: ESP-PROG's debug port
- COM14: ESP-PROG's UART port

※ This time, we will power and program upload from the micro USB (COM12) of ESP32, so we will not use COM14 (ESP-PROG's UART port).

## Problem where ESP-PROG is not recognized as a debugger

Here is the first major stumbling block. In fact, just having the ESP-PROG's COM port recognized as above does not allow for debugging.  
Using ESP-PROG as it is will result in an error saying "Debugger not found".  
(Although some articles on the internet say it can be used immediately after connecting)

To recognize ESP-PROG's debug port as a "debugger," an extra step is required.  
Here, we use a tool called "Zadig".  

Download Zadig from [this URL](https://zadig.akeo.ie/).  
![](https://gyazo.com/2eba1b3a62aff4dcdf1b23ac77bcbdc1.png)

Run the downloaded "Zadig-2.8.exe" (latest as of 2024-01-02).  
Zadig starts up.  
![](https://gyazo.com/b430fc5b900a029b97fc5375d8177e5b.png)

Select "List All Devices" from Options.  
![](https://gyazo.com/a127508290f4f88d9cfecdf334a00e35.png)

You should see the following two interfaces in the list:  
- Dual RS232-HS (Interface 0) ← For ESP-PROG Debug
- Dual RS232-HS (Interface 1) ← For ESP-PROG UART

![](https://gyazo.com/76b38a597db771a11ad797eae47b502a.png)

Select the "Interface 0" side of Dual RS232-HS and press the "Replace Driver" button.  
(Interface 0 side is for DEBUG)
![](https://gyazo.com/d86c8a36a9a18f9d2f3d69c89330b700.png)

The installation begins.  
![](https://gyazo.com/9a724c407ef2ad7411838e7d56998e60.png)

After the installation is complete, check "Serial Bus Device" in the Device Manager.  
If "Dual RS2332-HS" is registered under "Universal Serial Bus Devices," it's OK.  
Initially, when ESP-PROG was connected via USB, the device corresponding to Interface0 was recognized as COM13, but COM13 has been deleted, and the registration has moved to the bus device side.  
![](https://gyazo.com/b484441203c44a07e8fcd5da19418268.png)

Only UART connection COM14 remains on the COM port side. (The COM12 in the image is the COM port connected to the ESP32 side.)  
![](https://gyazo.com/0e30ab92bf45a2cf81f2bd7e5a53b8fb.png)

## Creating a Sample Project with Platform IO

As a development environment, we will use "Platform IO" (hereafter referred to as PIO), which was introduced in a previously written article "[Trying IoT (Part 14: Organic LED (OLED) SSD1306 Edition)](/iot/internet-of-things-14/#development-environment-'platform-io')".

Now, let's create a project for ESP32.  
The project created is as follows:  
- Project name: ESP32_ESP-PROG
- Board: Espressif ESP32 Dev Module
- Framework: Arduino
- Location: ＜Do not use default!＞

Here is another major stumbling block.  
This time, I changed the project location to  
　c:/opt/ESP32_ESP-PROG/  
Initially, I placed the project location at  
　C:/Users/＜username＞/OneDrive/Documents/PlatformIO/Projects  
but the debugger did not properly recognize the path name containing the "Documents" folder, so I reluctantly moved it to another location.

The project appearance is as follows.  
![](https://gyazo.com/2398133347fefa1f1eeeb2b3198d0328.png)

As a sample program for debugging, I obtained one that handles Bluetooth from the code samples.  
I only changed the part "String device_name;" to an arbitrary string.  
(This time, the Bluetooth device name is set to "BT-ESP32-Slave")

```cpp
#include <Arduino.h>

//This example code is in the Public Domain (or CC0 licensed, at your option.)
//By Evandro Copercini - 2018
//
//This example creates a bridge between Serial and Classical Bluetooth (SPP)
//and also demonstrate that SerialBT have the same functionalities of a normal Serial

#include "BluetoothSerial.h"

//#define USE_PIN // Uncomment this to use PIN during pairing. The pin is specified on the line below
const char *pin = "1234"; // Change this to more secure PIN.

String device_name = "BT-ESP32-Slave";

#if !defined(CONFIG_BT_ENABLED) || !defined(CONFIG_BLUEDROID_ENABLED)
#error Bluetooth is not enabled! Please run `make menuconfig` to and enable it
#endif

#if !defined(CONFIG_BT_SPP_ENABLED)
#error Serial Bluetooth not available or not enabled. It is only available for the ESP32 chip.
#endif

BluetoothSerial SerialBT;

void setup() {
  Serial.begin(115200);
  SerialBT.begin(device_name); //Bluetooth device name
  #ifdef USE_PIN
    SerialBT.setPin(pin);
    Serial.println("Using PIN");
  #endif
}

void loop() {
  if (Serial.available()) {
    SerialBT.write(Serial.read());
  }
  if (SerialBT.available()) {
    Serial.write(SerialBT.read());
  }
  delay(20);
}
```

## Debug Settings (platformio.ini)

For this occasion, we add some options to platformio.ini as follows.

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps = mbed-seeed/BluetoothSerial@0.0.0+sha.f56002898ee8
build_flags = 
    ; Assign LED_BUILTIN to another pin
    -D LED_BUILTIN=2
monitor_speed = 115200
upload_port = COM12
upload_speed = 921600
debug_tool = esp-prog
debug_init_break = tbreak setup
;debug_init_break = tbreak loop
build_type = debug
```

I'll explain the details of platformio.ini.  
The following three settings are basic, so there are no changes this time.

- platform: When creating a project in PIO, selecting "Espressif ESP32 Dev Module" for the board sets "espressif32".
- board: The same operation as above sets "esp32dev".
- framework: Selecting "Arduino" as the development framework sets "arduino".

The necessary library for using Bluetooth has been added.

- lib_deps: This time, since we are using Bluetooth, we have installed the "BluetoothSerial" library. (For how to set up the library, please refer to [here](/iot/internet-of-things-14/#platform-io-ide-で開発プロジェクトを作成する).)

Options added for debugging with ESP-PROG are as follows.

- build_flags: Options to set during the build. The ESP32 we used this time does not have a controllable LED on the board, so we changed the pin settings. (We won't use it in this article, but just in case)
- monitor_speed: Specifies the baud rate for serial communication. (To check the results of Bluetooth communication on the COM port monitor)
- upload_port: PIO auto-detects the COM port to upload the program, but since there are two COM ports, one for ESP-PROG's UART and one for the ESP32 side, this time we explicitly specify the COM port on the ESP32 side.
- upload_speed: Specifies the upload speed.

This is probably the most crucial part of this article.

- debug_tool: Specify "esp-prog".
- debug_init_break: Specifies the function where you want to stop (break) first when executing debugging. This time, it is set to stop at the "setup" function.
- build_type: Specify "debug" for the build option. It seems that you can specify release, test, etc., other than debug.

## Debug Settings (VSC)

VSC's debug setting "launch.json" uses the default value output by PIO.  
(Replace ＜username＞ with your own account)

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "platformio-debug",
            "request": "launch",
            "name": "PIO Debug",
            "executable": "c:/opt/ESP32_ESP-PROG/.pio/build/esp32dev/firmware.elf",
            "projectEnvName": "esp32dev",
            "toolchainBinDir": "C:/Users/＜username＞/.platformio/packages/toolchain-xtensa-esp32/bin",
            "internalConsoleOptions": "openOnSessionStart",
            "preLaunchTask": {
                "type": "PlatformIO",
                "task": "Pre-Debug"
            }
        },
        {
            "type": "platformio-debug",
            "request": "launch",
            "name": "PIO Debug (skip Pre-Debug)",
            "executable": "c:/opt/ESP32_ESP-PROG/.pio/build/esp32dev/firmware.elf",
            "projectEnvName": "esp32dev",
            "toolchainBinDir": "C:/Users/＜username＞/.platformio/packages/toolchain-xtensa-esp32/bin",
            "internalConsoleOptions": "openOnSessionStart"
        },
        {
            "type": "platformio-debug",
            "request": "launch",
            "name": "PIO Debug (without uploading)",
            "executable": "c:/opt/ESP32_ESP-PROG/.pio/build/esp32dev/firmware.elf",
            "projectEnvName": "esp32dev",
            "toolchainBinDir": "C:/Users/＜username＞/.platformio/packages/toolchain-xtensa-esp32/bin",
            "internalConsoleOptions": "openOnSessionStart",
            "loadMode": "manual"
        }
    ]
}
```

## Build, Upload, and Debug

Build the program with PIO and upload it to the ESP32.  
Sometimes ESP32 fails to write the program, but you can write it by resetting the ESP32, etc.  
Various people seem to be working on measures for problems where programs cannot be written to ESP32.  
(Reference: [What to try when you can't write a program to ESP32](https://klab.hateblo.jp/entry/2021/05/28/172843))

Select debug in VSC and run "PIO Debug" from "Run and Debug".    
![](https://gyazo.com/4a3ebe6ce85b84a0d5942d697db4cb53.png)

The debugger is activated and stops at the "Setup function".  
(Because it is specified in the INI file's "debug_init_break" option)  
![](https://gyazo.com/3dd2595870836a0bb83aef1ddfa5e45b.png)

You can see on the "Debug Console" at the bottom right of the screen that it is stopped at line 26, "void setup()".    
![](https://gyazo.com/b6064c3ba19c003316c17e835f071e16.png)

If you continue running, it will stop at the set breakpoint.  
"This is debugging!" It's definitely more efficient than debugging with print statements.    
![](https://gyazo.com/2cd9c38e5c730f09b72c41ada0953534.png)

Step execution is also possible.   
![](https://gyazo.com/2bf4513f4dd49c089397a450a99c6cd5.png)

It has become possible to check detailed parts such as what kind of operation it performs when connected via Bluetooth.

## A Little "Mystery"

Let's make a slight change to the program.  
Set up a global variable "counter" and a local variable "_counter" in the program, and simply increment them in the loop function.

Excerpt from the program
```cpp
// Definition of global variables
int counter = 0;

void setup() {
  Serial.begin(115200);
  SerialBT.begin(device_name); //Bluetooth device name
  #ifdef USE_PIN
    SerialBT.setPin(pin);
    Serial.println("Using PIN");
  #endif
}

void loop() {
  // Definition of local variables
  int _counter = 0;

  // Operation on global variables
  counter++;
  // Operation on local variables
  _counter++;

  if (Serial.available()) {
    SerialBT.write(Serial.read());
  }
  if (SerialBT.available()) {
    Serial.write(SerialBT.read());
  }
  delay(100);
}
```

I set breakpoints on the increment parts of counter and _counter in the loop function.  
The breakpoint set on the global variable worked.  
![](https://gyazo.com/67c7e2a788bb9d6e4208955b3b67110c.png)

What? The breakpoint set on the local variable was skipped, and for some reason, it jumped to the next IF statement.  
![](https://gyazo.com/c377499d3d0da9414e3f31df7fe730c4.png)

Even if I try to step through step by step, it just won't stop at the local variable part (neither the declaration nor the operation part).  
![](https://gyazo.com/8c9f08e2abc3d51371ba78e1f3352ce4.png)

I suspect that the variable was optimized and not assigned an address (this level of program might be processed on the register).  
I thought it was related to the optimization option, so I checked the debug build options.  
In the PIO INI file, the following settings seem to be the default.  
```ini
debug_build_flags = -Og -g2 -ggdb2
```

However, changing the optimization option resulted in errors such as,link errors with the Bluetooth library, and the build was not successful.  
Further investigation is needed in this area.  
I will introduce more details in another article once I find out more.

## Conclusion

In this session, we were able to debug the ESP32 program using ESP-PROG from VSC.  
It is significantly more efficient than debugging with print statements.

Well, in the case of the author, there is another question: "Am I writing programs that are so complex that I can't debug without a debugger?"
