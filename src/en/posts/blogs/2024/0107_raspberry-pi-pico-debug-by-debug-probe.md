---
title: Debugging Raspberry Pi Pico with Raspberry Pi Debug Probe and Platform IO
author: shuichi-takatsu
date: 2024-01-07T00:00:00.000Z
tags:
  - debugprobe
  - raspberrypipico
  - platformio
  - debug
  - arduinoide
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/01/07/raspberry-pi-pico-debug-by-debug-probe/).
:::



In the [previous article](/blogs/2024/01/03/esp32-debug-by-esp-prog/), we introduced how to debug an ESP32 development board using ESP-PROG and Platform IO.  
This time, I would like to introduce how to debug the Raspberry Pi Pico using a Raspberry Pi Debug Probe and Platform IO.

## What is Raspberry Pi Pico?

The Raspberry Pi series are single-board computers equipped with ARM processors.  
The most recently released model is probably the [Model 5](https://www.raspberrypi.com/products/raspberry-pi-5/).  
Models 5 and 4 come with HDMI and USB ports, microSD card slots, etc., and can be used as a high-performance single-board computer by installing an OS on a microSD card.  

In contrast, the "Raspberry Pi Pico" looks like the following and is closer to embedded development boards like the ESP32 or Arduino Nano.  

Appearance of Raspberry Pi Pico  
(The photo shows the H type, which is equipped with a JST 3-pin SH connector on the debug terminal and has pin headers pre-soldered)  
![](https://gyazo.com/df32a03214f568298292dce3a0473512.png)

It may not be suitable for high-performance applications like the Model 5 or Model 4, but the Raspberry Pi Pico (hereafter referred to as "Pico") is cheaper and more suitable for electronic projects. (Reference: [Switch Science](https://www.switch-science.com/products/6900))

## What is a Raspberry Pi Debug Probe?

Appearance of Raspberry Pi Debug Probe  
(The board surrounded by the plastic case in the middle is the debug probe itself)  
![](https://gyazo.com/b30cf12de520b70709854d5e3ed25053.png)

You can purchase it from [Amazon](https://www.amazon.co.jp/dp/B0C695JZT1/) or [Switch Science](https://www.switch-science.com/products/8708). (I bought it from a cheaper place though)

The Raspberry Pi Debug Probe (hereafter referred to as "Debug Probe") is the "official Raspberry Pi Debug Probe" similar to the ESP-PROG I introduced last time, with two USB serial conversion ports.  
It is equipped with a "CMSIS-DAP" debug interface.  
[CMSIS-DAP](https://arm-software.github.io/CMSIS_5/DAP/html/index.html) seems to be a standard specification for JTAG emulators (debuggers).  
Also, the Debug Probe has a UART serial communication port, so UART communication is also possible.

(Left side is the UART port, the right side is the CMSIS-DAP debug port)  
![](https://gyazo.com/acceac27745a78582c10243ae08828b4.png)

Upon further research, the Debug Probe is based on an application called "[picoprobe](https://github.com/raspberrypi/picoprobe)," and the Debug Probe itself is composed of a Pico.  
In fact, [this article](https://zenn.dev/oze/articles/7cfa65eb8904c0) shows two Picos side by side, using one as a Debug Probe.

## Connecting the Raspberry Pi Debug Probe to PC and Raspberry Pi Pico

This time we will only use the CMSIS-DAP debug port.  
Actually, this port alone allows both program upload and debugging.  
Connect the Debug Probe and Pico with a JST 3-pin SH connector as shown below, and do not connect anything to the UART port side.

![](https://gyazo.com/a8ee34d17a84f2eaf0dbf2e43373b5d6.png)

Then, connect both microUSB terminals to the PC side.  
(The microUSB on the Pico side is used only for power supply. A cable without communication function is OK.)

![](https://gyazo.com/811502c428092d5f44d9e76079d16b59.png)

Check the COM port and Serial Bus Device in Device Manager.  
You can see that the "CMSIS-DAP v2 interface" is recognized correctly.

![](https://gyazo.com/6108d3501df5cf54bb6c5b9820f007d4.png)

Just in case, let's check the interface with "Zadig" used last time.  
Launch Zadig and display the List.  
Each interface was confirmed.  
(Although the same name interface was displayed in [ESP-PROG](/blogs/2024/01/03/esp32-debug-by-esp-prog/#esp-progがデバッガとして認識されない問題), the Debug Probe showed different interfaces)
![](https://gyazo.com/f0c35baaabef8510afc179dac8909635.png)

## Creating a Sample Project with Platform IO

As a development environment, we will use "[Platform IO](https://platformio.org/) (hereafter referred to as PIO)" introduced in the article "[Trying IoT (Part 14: OLED Display SSD1306 Edition)](/iot/internet-of-things-14/#開発環境「platform-io」)".

Let's create a project for Pico.  
The project created is as follows.  

![](https://gyazo.com/fa34688533017cfe8f1ddda69c6b503b.png)

- Project Name: PICO_DEBUG-PROBE
- Board: Raspberry Pi Pico
- Framework: Arduino
- Location: ＜Do not use the default!＞

(※ As last time, the project location was set to "c:/opt/ESP32_ESP-PROG/" instead of the default)

The sample program is a simple one that just blinks an LED.  
(Pico has an LED on board that can be controlled by a program)  

The sample program is as follows.  

```cpp
#include <Arduino.h>

const int T_DELAY = 1000;

// the setup function runs once when you press reset or power the board
void setup() {
  // initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);
}

// the loop function runs over and over again forever
void loop() {
  digitalWrite(LED_BUILTIN, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(T_DELAY);                    // wait for a second
  digitalWrite(LED_BUILTIN, LOW);    // turn the LED off by making the voltage LOW
  delay(T_DELAY);                    // wait for a second
}
```

## Debugging Settings (platformio.ini)

This time, we will add some options to platformio.ini to debug with the Debug Probe.
The content of the platformio.ini file was as follows.  

```ini
[env:pico]
platform = raspberrypi
board = pico
framework = arduino
upload_protocol = cmsis-dap
debug_tool = cmsis-dap
debug_init_break = tbreak setup
build_type = debug
```

Let's explain the details of platformio.ini.  
The following three settings are basic, so there are no particular changes this time.

- platform: When creating a project in PIO and selecting "Raspberry Pi Pico" as the board, "raspberrypi" is set.
- board: The same operation as above sets "pico".
- framework: Since "Arduino" was selected as the development framework, "arduino" is set.

The options added to debug with the Debug Probe are as follows.  

- upload_protocol: Specifies "CMSIS-DAP" for program upload from PIO. (※ As mentioned later, for some reason, PIO's upload did not function well)

This is probably the most crucial part of this article.  

- debug_tool: Specifies "cmsis-dap".
- debug_init_break: Specifies the function where you want to stop (break) first when executing debug. This time, it is specified to stop at the "setup" function.
- build_type: Specifies "debug" as the build option. Besides debug, it seems that release and test can be specified.

## Debugging Settings (Visual Studio Code)

The debugging settings "launch.json" for Visual Studio Code (hereafter referred to as VSC) will use the default values output by PIO.  
(Replace ＜username＞ with your own account)

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "platformio-debug",
            "request": "launch",
            "name": "PIO Debug",
            "executable": "c:/opt/PICO_DEBUG-PROBE/.pio/build/pico/firmware.elf",
            "projectEnvName": "pico",
            "toolchainBinDir": "C:/Users/＜username＞/.platformio/packages/toolchain-gccarmnoneeabi/bin",
            "internalConsoleOptions": "openOnSessionStart",
            "svdPath": "C:/Users/＜username＞/.platformio/platforms/raspberrypi/misc/svd/rp2040.svd",
            "preLaunchTask": {
                "type": "PlatformIO",
                "task": "Pre-Debug"
            }
        },
        {
            "type": "platformio-debug",
            "request": "launch",
            "name": "PIO Debug (skip Pre-Debug)",
            "executable": "c:/opt/PICO_DEBUG-PROBE/.pio/build/pico/firmware.elf",
            "projectEnvName": "pico",
            "toolchainBinDir": "C:/Users/＜username＞/.platformio/packages/toolchain-gccarmnoneeabi/bin",
            "internalConsoleOptions": "openOnSessionStart",
            "svdPath": "C:/Users/＜username＞/.platformio/platforms/raspberrypi/misc/svd/rp2040.svd"
        },
        {
            "type": "platformio-debug",
            "request": "launch",
            "name": "PIO Debug (without uploading)",
            "executable": "c:/opt/PICO_DEBUG-PROBE/.pio/build/pico/firmware.elf",
            "projectEnvName": "pico",
            "toolchainBinDir": "C:/Users/＜username＞/.platformio/packages/toolchain-gccarmnoneeabi/bin",
            "internalConsoleOptions": "openOnSessionStart",
            "svdPath": "C:/Users/＜username＞/.platformio/platforms/raspberrypi/misc/svd/rp2040.svd",
            "loadMode": "manual"
        }
    ]
}
```

## Build, Upload, and Debug

Build the program with PIO and upload it to Pico.  

Here, a problem occurred.  
The build finishes normally, but the program upload fails.  

![](https://gyazo.com/5b18056e42a36f2e9be215af028e98ab.png)

After further research, I couldn't find a solution.  
I suspected a version mismatch with OpenOCD and changed the version, but it didn't improve.  

PIO's "PIO Debug" seems to automatically execute both "build" and "upload" when starting debugging, so for now, let's run "PIO Debug" from "Run and Debug".    
![](https://gyazo.com/fc1166d70218011d468f2dd6a9cf3ada.png)

The program is built, uploaded, and the debugger starts, stopping at the "Setup function".  
(It feels like the stopping position is slightly different from when using ESP-PROG)

![](https://gyazo.com/4b568b1301f9a14b1f541a7b4e815b4f.png)

On the "Debug Console" at the bottom right of the screen, you can also see that it stopped inside the 8th line "void setup()" function.    
![](https://gyazo.com/4b5f5aef5d79811b47759d88ab1a7bea.png)

If you continue running, it stops at the set breakpoint.  
![](https://gyazo.com/b54dd7dd9af2e2843dd1ee7233fc74ad.png)

Step execution is also possible.   
![](https://gyazo.com/f52ceb826ea37e8a5a5762afa4497756.png)

## Uploading Programs from Arduino IDE 2.0

Although PIO failed to upload the program correctly, it was unclear whether the problem was with the Debug Probe or PIO's settings.  
Just in case, let's try uploading the program only from another development environment, "[Arduino IDE 2.0](https://www.arduino.cc/en/software#future-version-of-the-arduino-ide)".  
(The installation method for Arduino IDE is omitted)  

![](https://gyazo.com/ede4545165eee306b138eca0082523e6.png)

The program code is exactly the same.  
Set the Arduino IDE as follows.

![](https://gyazo.com/459f4eb3b1d155654fe332ea0d3df1c9.png)

- Board: "Raspberry Pi Pico"
- Port: ＜Not necessary to select since it's not used＞
- Upload Method: Picoprobe(CMSIS-DAP)

By specifying "Picoprobe(CMSIS-DAP)" as the Upload Method, you can upload the program via the Debug Probe.  

Press the "Upload" button to write the program to Pico.  
![](https://gyazo.com/ede03506e483f1534b3b3607e1791410.png)

The program was successfully written to Pico.
(The text appears red, which seems like an error, but the message indicates that the writing was completed successfully)  
![](https://gyazo.com/006fb4f0e275a86c22a2957580b43cf8.png)

It seems that the Debug Probe is working correctly.

Actually, Arduino IDE version 2.0 and later can also perform debugging.  
However, I feel that the code completion and other features are "not quite there," so I still prefer to use PIO. (It's more about VSC than PIO)  
For now, since I can debug and write programs with PIO, I will continue to use PIO as my main tool, and if the problem with program uploads is resolved, I will report back.

## Summary

This time, we were able to debug the Raspberry Pi Pico program from VSC (Platform IO) using the Raspberry Pi Debug Probe.  

Although there was a problem with the program not being uploaded correctly, I think there was some success.
