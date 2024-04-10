---
title: >-
  Debugging the STM32 Microcontroller Board (STM32F103C8T6) with a ST-Link V2
  Clone and Platform IO
author: shuichi-takatsu
date: 2024-01-29T00:00:00.000Z
tags:
  - stm32
  - stlink
  - platformio
  - arduinoide
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/01/29/stm32-debug-by-st-link/).
:::



In previous articles related to microcontroller boards, I have discussed ESP32, Arduino, and Raspberry Pi. Apart from these well-known families, the "STM32" family of microcontroller boards is also fairly popular. This time, I would like to use the affordable and readily available "STM32F103C8T6" microcontroller board to implement a program to blink an LED (referred to as "L Chika") and execute debugging of the L Chika program.

## What is STM32?

The [STM32 family](https://www.stmcu.jp/stm32family/) consists of 32-bit general-purpose microcontrollers manufactured and sold by STMicroelectronics, equipped with the Arm Cortex-M series. Since the CPU is ARM, it can utilize various applications created for ARM. There is also an 8-bit "STM8" family.

## Affordable Microcontroller Board "STM32F103C8T6"

The microcontroller board we are using this time is the "STM32F103C8T6". It is often referred to as the "Blue Pill" and is sold at a very low price on [Amazon](https://www.amazon.co.jp/dp/B0B6HLBR66/). It can be obtained even cheaper on AliExpress, though it takes longer to deliver. It turned out that the microcontroller board I purchased this time was a clone.

There is a wide range of products in the STM32 family. Please refer to the [product homepage](https://www.stmcu.jp/stm32/stm32f1/stm32f103/12022/) for information on the CPU and memory of the "STM32F103C8T6" we are using this time.

Product specifications:  
![](https://gyazo.com/b95624f64f781f2ac41ed0bc551aee81.png)

Appearance (with soldered pin headers):  
![](https://gyazo.com/1910541512ff1facafc4e02edcf0199f.png)

Like the ESP32, Arduino Nano, and Raspberry Pi Pico, it comes in a package intended for embedded applications. There are two jumper pins on the top of the body, each of which can be set to "0" or "1".  
![](https://gyazo.com/3058ddfdf88f7d815e4ad86f3f44e18a.png)

Normally, it is used with the settings "Boot0:0, Boot1:0". When programming via serial communication pins, it seems that it should be set to "Boot0:1, Boot1:0". (This time, as mentioned later, we will perform the writing using a device called ST-Link, so the settings will remain normal.)

## ST-Link V2 Clone

Since the genuine ST-Link is expensive, we will use a clone (laughs). We purchased the ST-Link V2 compatible programmer (hereafter referred to as ST-Link) as shown in the image below. It can be obtained at a low price from [Amazon](https://www.amazon.co.jp/dp/B08ZYCRN67/). It is even cheaper on AliExpress.  
![](https://gyazo.com/d466fb1ba6e27640b8b6df9ebde7434f.png)

To use ST-Link on a PC, you need a driver for ST-Link. Download the driver from the [following URL](https://www.st.com/ja/development-tools/stsw-link009.html).  
(It seems that you can download it as a guest without registering as a user.)  
![](https://gyazo.com/51b90b98f2fe4c43ff03e7c061df73f4.png)

The file "en.stsw-link009.zip" will be downloaded from the above URL, so unzip the Zip file and run "dpinst_amd64.exe" (for 64-bit PCs) included in the unzipped folder to install the driver.

## Connecting ST-Link and STM32F103C8T6

Connect ST-Link and STM32F103C8T6 (hereafter referred to as STM32) as follows.
![](https://gyazo.com/c8e82f8426881a7dbcb497647dacb11d.png)

| ST-Link | STM32 |
| ---- | ---- |
| SWDIO | SWO |
| GND | GND |
| SWCLK | SWCLK |
| 3.3V | 3.3V |

(The terminal marked "SWO" on the STM32 side is believed to be "SWDIO").

After installing the ST-Link driver, connect ST-Link to the USB port of the PC and check that ST-Link is recognized in the Device Manager. If it is displayed as follows, the driver has been successfully installed.

![](https://gyazo.com/fa687bf68074786a0bde37b841965cb2.png)

## ST-Link Firmware Upgrade

It may not be mandatory, but we will upgrade the firmware of ST-Link (other sites referring to ST-Link information recommended upgrading the firmware).

Download the utility called "STM32 ST-LINK Utility" and upgrade the firmware of ST-Link. Download the utility from the [following URL](https://www.st.com/ja/development-tools/stsw-link004.html).  
![](https://gyazo.com/74f877879a5b51cc7e90c08b86339e73.png)

The file "en.stsw-link004.zip" will be downloaded from the above URL, so unzip the Zip file and run "setup.exe" included in the unzipped folder to install the utility.

Run the installed STM32 ST-LINK Utility. The following application will start.  
![](https://gyazo.com/ffa51c5df0a0bc7370878dcc3d0231dd.png)

Click "ST-LINK" - "Firmware update".  
![](https://gyazo.com/50829f8527fd51889b7db6be9dbe7fae.png)

When the ST-Link Upgrade dialog appears, click "Device Connect".  
![](https://gyazo.com/b99640833f7c6172fdf70520c6115ff3.png)

Once the device is connected, click "YES" on the right side of Upgrade to Firmware.  
![](https://gyazo.com/9c18a8ddb7431a3c28e0488aa65df60b.png)

The firmware upgrade will begin.  
(In my case, the firmware had already been upgraded, so the version in the image remains the same after the upgrade.)  
![](https://gyazo.com/72708ab3a5df371540119c6f97981b66.png)

The upgrade is complete.  
![](https://gyazo.com/ec358ca5841a11ec526080b5542709b6.png)

## Installation of STM32CubeProg

Actually, the utility download page mentioned earlier also mentioned the recommended product "STM32CubeProg".  
![](https://gyazo.com/982eed5af4e811e275393853a51658bc.png)

STM32CubeProg does not seem to support ST-Link V2 clones, but since the "Arduino IDE" used in the latter part of this article is set to use the command line utility included in this utility, let's install it now.

Download STM32CubeProg from the [following URL](https://www.st.com/ja/development-tools/stm32cubeprog.html).
![](https://gyazo.com/3cd7fc31f804af619f8753d759001d3d.png)

The file "en.stm32cubeprg-win64-v2-15-0.zip" (as of 2024-01-27) will be downloaded from the above URL, so unzip the Zip file and run "SetupSTM32CubeProgrammer_win64.exe" included in the unzipped folder to install the utility.

Proceed with the installation. Several option settings are confirmed during the installation, but install with all default settings.  
![](https://gyazo.com/5d5ca6572c2190a1f4ad9e0030413566.png)

## Preparing Arduino IDE (STM32 Board Information)

We will use the "[Arduino IDE](https://www.arduino.cc/en/software)" that has been used in previous microcontroller board articles to write, build, and write programs.

First, add the URL of the STM32 board manager to the basic settings of Arduino IDE (V2.2.1). The URL to add is as follows:
`https://github.com/stm32duino/BoardManagerFiles/raw/main/package_stmicroelectronics_index.json`

Add the above URL to the "Additional Board Managers" in the basic settings.  
![](https://gyazo.com/51a44600a68a45c93ce66878f517e867.png)

"STM32 MCU based boards" will be displayed in the Arduino IDE board manager as shown below, so install it. (It takes quite a while.)  
![](https://gyazo.com/00a874d96bf44ba2c07938a6bd9e1f22.png)

Once the installation is complete, "STM32 MCU based boards" should be added to the board manager's board list.  
![](https://gyazo.com/e9c404f7546db99d8d332b0c6581d70b.png)

## Creating an STM32 Project in Arduino IDE

Select the "Generic STM32F1 series" board in the Arduino IDE board manager.  
![](https://gyazo.com/20e7de743c728af96b66de36bc050c72.png)

Change the board settings as follows.  
(The COM port is not used this time, so it doesn't matter what is selected.)  
![](https://gyazo.com/576bdb90d91cff05aa1f98095bc2ac06.png)

Make sure that "Upload method" is set to "STM32CubeProgrammer(SWD)".    
![](https://gyazo.com/d2978294df38bfcb2df5d4a4feb32fb3.png)

Select "Blink" from "File" - "Sketch Example" - "0.Basics".  
![](https://gyazo.com/3d99316c0dc985354e0cd2d004f91676.png)

The default Blink project is created.  
![](https://gyazo.com/a1b1015c98d1ecd30e7c50cc4ce9bbff.png)

## Creating an L Chika Program (for STM32F103C8T6)

I created an L Chika (LED blinking) program as follows.  

```cpp
const int T_DELAY = 1000;

// the setup function runs once when you press reset or power the board
void setup() {
  // initialize digital pin PC13 as an output.
  pinMode(PC13, OUTPUT);
}

// the loop function runs over and over again forever
void loop() {
  digitalWrite(PC13, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(T_DELAY);             // wait for a second
  digitalWrite(PC13, LOW);    // turn the LED off by making the voltage LOW
  delay(T_DELAY);             // wait for a second
}
```

The output terminal for blinking the LED is specified as "PC13".  
(Please be careful, as this is a part that is often mistaken.)

## Writing the Program from Arduino IDE

Write the program from Arduino IDE.  
![](https://gyazo.com/888706932b71faf2a928598ce4004989.png)

The following message was output. It can be seen that the program has been written to the STM32 and executed successfully.  
```shell
Maximum 32768 bytes of flash memory, of which the sketch uses 18056 bytes (55%).
Maximum 10240 bytes of RAM, of which global variables use 1256 bytes (12%), and local variables can use 8984 bytes.
      -------------------------------------------------------------------
                       STM32CubeProgrammer v2.15.0                   
      -------------------------------------------------------------------

ST-LINK SN  : 9
ST-LINK FW  : V2J37S7
Board       : --
Voltage     : 3.23V
SWD freq    : 4000 KHz
Connect mode: Under Reset
Reset mode  : Hardware reset
Device ID   : 0x410
Revision ID : Rev X
Device name : STM32F101/F102/F103 Medium-density
Flash size  : 128 KBytes
Device type : MCU
Device CPU  : Cortex-M3
BL Version  : --

Memory Programming ...
Opening and parsing file: Blink_STM32F103C8T6.ino.bin
  File          : Blink_STM32F103C8T6.ino.bin
  Size          : 17.92 KB 
  Address       : 0x08000000 

Erasing memory corresponding to segment 0:
Erasing internal memory sectors [0 17]
Download in Progress:

File download complete
Time elapsed during download operation: 00:00:00.475

RUNNING Program ... 
  Address:      : 0x8000000
Application is running, Please Hold on...
Start operation achieved successfully
```

## Error Occurred When Executing Debug from Arduino IDE

I tried executing debug from Arduino IDE.  
![](https://gyazo.com/27e91dc63ce460e154e03cb4f168b94d.png)

The following message was output.  
```text
Licensed under GNU GPL v2
For bug reports, read
        http://openocd.org/doc/doxygen/bugs.html
CDRTOSConfigure
Info : The selected transport took over low-level target control. The results might differ compared to plain JTAG/SWD
srst_only separate srst_nogate srst_open_drain connect_deassert_srst

Info : Listening on port 50001 for tcl connections
Info : Listening on port 50002 for telnet connections
Info : clock speed 1000 kHz
Info : STLINK V2J37S7 (API v2) VID:PID 0483:3748
Info : Target voltage: 3.225296
Warn : UNEXPECTED idcode: 0x2ba01477
Error: expected 1 of 1: 0x1ba01477

[2024-01-28T01:35:54.260Z] SERVER CONSOLE DEBUG: onBackendConnect: gdb-server session closed
GDB server session ended. This terminal will be reused, waiting for next session to start...
```

It seems to be an error where the expected code is not found in the "idcode" part.
```text
Warn : UNEXPECTED idcode: 0x2ba01477
Error: expected 1 of 1: 0x1ba01477
```

I will give up on debugging with Arduino IDE for now and will check debugging on the Platform IO side.

## Creating an STM32 Project in Platform IO

I would like to use [Platform IO](https://platformio.org/), which I have used before, to write, execute, and debug programs.  
(For setup of Platform IO, please refer to the previously written article "[Trying IoT (Part 14: OLED SSD1306 Edition)](/iot/internet-of-things-14/#開発環境「platform-io」)").

Create an STM32 project in Platform IO.
![](https://gyazo.com/9a58702cdbaa00ac823c5fe3ab15d9be.png)

 - Project Name: "Blink_STM32F103C8T6" (← you can name it whatever you like)
 - Board: "STM32F103C8 (20k RAM. 64k Flash)(Generic)"
 - Framework: "Arduino"
 - Location: Check OFF (do not use the default location)

After the project is created, check the platformio.ini file.  
The upload protocol seems to be ST-Link by default, so the description is omitted.  
```ini
[env:genericSTM32F103C8]
platform = ststm32
board = genericSTM32F103C8
framework = arduino
```

## Writing the Program from Platform IO

Write the same program as executed in Arduino IDE into main.cpp.  
However, I included the header file "Arduino.h" at the beginning of the source code.
```cpp
#include <Arduino.h>
```

When I executed the program writing from Platform IO, the following error occurred.
```text
Advanced Memory Usage is available via "PlatformIO Home > Project Inspect"
RAM:   [=         ]   5.5% (used 1132 bytes from 20480 bytes)
Flash: [==        ]  16.6% (used 10872 bytes from 65536 bytes)
Configuring upload protocol...
AVAILABLE: blackmagic, cmsis-dap, dfu, jlink, serial, stlink
CURRENT: upload_protocol = stlink
Uploading .pio\build\genericSTM32F103C8\firmware.elf
xPack Open On-Chip Debugger 0.12.0-01004-g9ea7f3d64-dirty (2023-01-30-15:04)
Licensed under GNU GPL v2
For bug reports, read
        http://openocd.org/doc/doxygen/bugs.html
debug_level: 1

hla_swd
Warn : UNEXPECTED idcode: 0x2ba01477
Error: expected 1 of 1: 0x1ba01477
in procedure 'program'
** OpenOCD init failed **
shutdown command invoked

*** [upload] Error 1
```

The error that occurred in the debugging part of the Arduino IDE seems similar.  
I researched the above error content and was able to obtain information from the [following URL](https://community.platformio.org/t/debugging-of-stm32f103-clone-bluepill-board-wrong-idcode/14635).  
It seems that the purchased STM32 is a clone product (CS32F103C8T6 chip instead of STM32F103C8T6), so additional settings like the following are necessary.  
I modified the platformio.ini file as follows.  
```ini
[env:genericSTM32F103C8]
platform = ststm32
board = genericSTM32F103C8
framework = arduino
upload_flags = -c set CPUTAPID 0x2ba01477
```

Change the settings and write the program again.  
```text
Advanced Memory Usage is available via "PlatformIO Home > Project Inspect"
RAM:   [=         ]   5.5% (used 1132 bytes from 20480 bytes)
Flash: [==        ],16.6% (used 10872 bytes from 65536 bytes)
Configuring upload protocol...
AVAILABLE: blackmagic, cmsis-dap, dfu, jlink, serial, stlink
CURRENT: upload_protocol = stlink
Uploading .pio\build\genericSTM32F103C8\firmware.elf
xPack Open On-Chip Debugger 0.12.0-01004-g9ea7f3d64-dirty (2023-01-30-15:04)
Licensed under GNU GPL v2
For bug reports, read
        http://openocd.org/doc/doxygen/bugs.html
debug_level: 1

0x2ba01477
hla_swd
[stm32f1x.cpu] halted due to debug-request, current mode: Thread 
xPSR: 0x01000000 pc: 0x080001a4 msp: 0x20005000
** Programming Started **
Warn : Adding extra erase range, 0x08002b9c .. 0x08002bff
** Programming Finished **
** Verify Started **
** Verified OK **
** Resetting Target **
shutdown command invoked

The program writing was successful. The LED was able to blink at the set interval.

## Debugging STM32 with Platform IO

Of course, we would like to debug as well (laughs). Although I have a feeling that it won't be straightforward, I modify the platformio.ini file as follows:  
```ini
[env:genericSTM32F103C8]
platform = ststm32
board = genericSTM32F103C8
framework = arduino
upload_flags = -c set CPUTAPID 0x2ba01477

debug_tool = stlink
debug_init_break = tbreak setup
build_type = debug
```

I execute debugging using the "PIO Debug" debug configuration defined in the default-created ".vscode/launch.json" of the project.  
![](https://gyazo.com/db25cc20b1748aa95bff6903a40dcffa.png)

As expected, an error occurred.  
```text
PlatformIO Unified Debugger -> https://bit.ly/pio-debug
PlatformIO: debug_tool = stlink
PlatformIO: Initializing remote target...
xPack Open On-Chip Debugger 0.12.0-01004-g9ea7f3d64-dirty (2023-01-30-15:04)
Licensed under GNU GPL v2
For bug reports, read
	http://openocd.org/doc/doxygen/bugs.html
hla_swd
Info : The selected transport took over low-level target control. The results might differ compared to plain JTAG/SWD
Info : tcl server disabled
Info : telnet server disabled
Info : clock speed 1000 kHz
Info : STLINK V2J37S7 (API v2) VID:PID 0483:3748
Info : Target voltage: 3.227423
Warn : UNEXPECTED idcode: 0x2ba01477
Error: expected 1 of 1: 0x1ba01477

.pioinit:13: Error in sourced command file:
Remote communication error.  Target disconnected.: No such file or directory.
```

It seems that the debugger (OpenOCD) is detecting a mismatch in the CPUTAPID and causing an error.  
```text
Warn : UNEXPECTED idcode: 0x2ba01477
Error: expected 1 of 1: 0x1ba01477
```

It appears necessary to specify the CPUTAPID when executing the debugger.  
I modified the platformio.ini file as follows (replace ＜User Folder＞ with your own path):  
```ini
[env:genericSTM32F103C8]
platform = ststm32
board = genericSTM32F103C8
framework = arduino
upload_flags = -c set CPUTAPID 0x2ba01477

debug_tool = stlink
debug_init_break = tbreak setup
build_type = debug
debug_server =
  C:\Users\＜User Folder＞\.platformio\packages\tool-openocd\bin\openocd.exe
  -s C:\Users\＜User Folder＞\.platformio\packages\tool-openocd\scripts
  -f interface\stlink.cfg
  -c "transport select hla_swd"
  -c "set CPUTAPID 0x2ba01477"
  -f target\stm32f1x.cfg
  -c "reset_config none"
```

I execute debugging again.  

This time it was successful. The code in the 'setup' function is halted at the breakpoint.
![](https://gyazo.com/0296988ccd680e530daf6e47f4d1cb2a.png)

I press the run button to execute up to the next breakpoint. It stops at the breakpoint on line 13.
![](https://gyazo.com/150ab3f8b761ef872d6be7f05efee893.png)

Step execution was also possible.  
![](https://gyazo.com/9f24a3a47b898dd8caf02deacb9ce9c6.png)

## Conclusion

Using the STM32F103C8T6 microcontroller board (although it is a clone), ST-Link V2 clone, Arduino IDE, and Platform IO, I was able to write and execute an LED blinking program. Additionally, I confirmed that debugging execution from Platform IO could stop at breakpoints and perform step execution. Both the microcontroller board and the debugger are very affordable, so why not give it a try?
