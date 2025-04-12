---
title: >-
  Remote Development with Everyone's Favorite VSCode and the Embedded Software
  Development Environment PlatformIO (Arduino Edition)
author: shuichi-takatsu
date: 2025-04-08T00:00:00.000Z
tags:
  - arduino
  - remote
  - platformio
image: true
translate: true

---

If you are developing embedded software, [PlatformIO](https://platformio.org/) is extremely convenient.  
I have previously introduced PlatformIO in the following articles:
- [Trying IoT (Part 14: Organic EL Display (OLED) SSD1306 Edition)](/iot/internet-of-things-14/)
- [Debugging the ESP32 Development Board with ESP-PROG and PlatformIO](/blogs/2024/01/03/esp32-debug-by-esp-prog/)
- [Debugging the Raspberry Pi Pico Using the Raspberry Pi Debug Probe and PlatformIO](/blogs/2024/01/07/raspberry-pi-pico-debug-by-debug-probe/)
- [Debugging the STM32 Microcontroller Board (STM32F103C8T6) Using an ST-Link V2 Compatible Device and PlatformIO](/blogs/2024/01/29/stm32-debug-by-st-link/)

Now, today's topic is "How do you transfer a program to a microcontroller when it is connected to another PC on the network?"  

One approach is to prepare a development environment for the microcontroller on the remote PC in advance. Then, you can connect via SSH from VSCode on the host PC to the remote PC to use its development environment.  
However, if you cannot set up a development environment on the remote PC or if it lacks sufficient resources, this method cannot be used.

This time, I will introduce a method to upload a blink (L-Chika) program—a program that simply makes an LED blink—to a microcontroller connected via USB to a remote PC using PlatformIO.  
For the target microcontroller, I will be using everyone's favorite [Arduino microcontroller](https://www.arduino.cc/).

## Installing PlatformIO (Host Side)

First, the method to install PlatformIO in VSCode has been briefly introduced [here](/iot/internet-of-things-14/#開発環境「platform-io」), but here's a quick recap.  
The installation is simple.  
Search for "platformio" in the VSCode Extensions Marketplace.  
Once you find the following extension, just install it.  
![](https://gyazo.com/776073d3f7845c935eb8ce0b102df75f.png)

When the following icon appears in the VSCode Extensions, it means that the extension has been successfully installed.  
![](https://gyazo.com/a577112c4f2e0a119d491db38e146de0.png)

## Installing PlatformIO Core (CLI) (Remote Side)

Since there is no need to set up an IDE on the remote side, only the [Core (CLI)](https://docs.platformio.org/en/latest/core/index.html) is installed this time.

I prepared the following two remote PCs:
- Windows 10 Pro
- Raspberry Pi 3B+

Since PlatformIO uses Python, make sure Python is installed on the PC in advance.  
There is plenty of information online on how to set up Python, so I will omit the details here.  
(When installed via the VSCode extension, a virtual Python environment is also installed along with the PlatformIO IDE.)

Install the Core (CLI) following the procedures outlined [here](https://docs.platformio.org/en/latest/core/installation/methods/installer-script.html).

I installed it by downloading the "get-platformio.py" file to my local machine.  
![](https://gyazo.com/95ea981eb1752123d83238b5fa010350.png)

Since you will be using the pio command from now on, add the path where PlatformIO is installed to your system's PATH environment variable.

For Windows, add the following to the PATH environment variable:
```shell
C:\Users\＜ユーザーID＞\.platformio\penv\Scripts
```

For the Raspberry Pi, add the following at the end of your .bashrc:
```shell
export PATH=$PATH:$HOME/.platformio/penv/bin
```

### 99-platformio-udev.rules Configuration (Only Needed for Raspberry Pi Side)

On the Raspberry Pi side, execute the following configuration.  
If you do not do this, when you connect an Arduino microcontroller to the Raspberry Pi, the COM port used for Arduino communication may not be recognized, which could cause issues later on.

Follow the steps provided [here](https://docs.platformio.org/en/latest/core/installation/udev-rules.html).

Enter the following command in the shell:
```shell
curl -fsSL https://raw.githubusercontent.com/platformio/platformio-core/develop/platformio/assets/system/99-platformio-udev.rules | sudo tee /etc/udev/rules.d/99-platformio-udev.rules
```

After that, restart the udev management service:
```shell
sudo service udev restart
```

## PlatformIO Account Registration and Login Required (Both Host and Remote)

### PlatformIO Account Registration (Only Needed Once)

To use PlatformIO's remote features, you need to register and log in to a PlatformIO account.  
Register an account from [here](https://community.platformio.org/).  
![](https://gyazo.com/d7dddfcae32e126dee02a9d3660c0115.png)

Once registration is complete, log in on both the host and remote sides.

### Logging into the PlatformIO Account on the Host Side

In PlatformIO on VSCode, click on "PIO Account" as shown below.  
Enter your Username or email address and PASSWORD.  
![](https://gyazo.com/056de1adaef9603af6506937417621bc.png)

You will see that you are successfully logged in.  
![](https://gyazo.com/b59f15d72c45b4f381afb945e9f10bc8.png)

### Logging into the PlatformIO Account on the Remote Side

On the command line, enter the following command:
```shell
pio account login
```

You will be prompted for your user ID and password—enter them.  
When you have successfully logged in, a message saying "Successfully logged in!" will be displayed.  
(Several Python modules will be downloaded/installed during the very first login.)

## Preparing the Blink Program (Host Side)

The blink (L-Chika) program has been introduced many times and can easily be found online, but I will include it here.  
This time, I will upload this blink program to the Arduino microcontroller connected to the remote PC.

```cpp
#include <Arduino.h>

static int T_DELAY = 1000;

void setup()
{
  // initialize LED digital pin as an output.
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop()
{
  // turn the LED on (HIGH is the voltage level)
  digitalWrite(LED_BUILTIN, HIGH);
  // wait for a second
  delay(T_DELAY);
  // turn the LED off by making the voltage LOW
  digitalWrite(LED_BUILTIN, LOW);
   // wait for a second
  delay(T_DELAY);
}
```

## Starting the Remote Agent (Remote Side)

To perform remote development, it is necessary to start the "Agent."  
On the remote PC, enter the following command to start the remote agent.  
(Note: Do not run this command simultaneously on two remote PCs. If you plan to execute it on multiple machines, specify a different name in the "name" portion.)

```shell
pio remote agent start --name slave
```

In this case, I named the remote side "slave."  
This name serves as an identifier to distinguish the remote environments.

Upon successful startup, you will see a message like the following:  
![](https://gyazo.com/8998b79b4356fc30002bfe88f033665f.png)

## Checking the COM Port on the Remote Side (from the Host Side)

Now, let's check the COM port on the remote PC (in reality, the USB COM port where the Arduino microcontroller is connected) from the host PC.

Click "Remote Devices" from the Project Task, and the command "pio remote device list" will be issued in the terminal, displaying the output.

### Connecting the Arduino Microcontroller to the Windows Side

Connect the Arduino microcontroller to the Windows side.  
In this case, it is observed that the remote agent "slave" has COM3 and COM5 ports.  
COM5 is the port where the Arduino microcontroller is connected.  
![](https://gyazo.com/b237cd878a9bed1b7e55eede556068ce.png)

### Connecting the Arduino Microcontroller to the Raspberry Pi Side

Earlier, I mentioned "Do not run the remote command simultaneously on two remote PCs," but let's try using different remote names.  
Set the remote names as follows:
- Windows side: slave-win
- Raspberry Pi side: slave-pi

Then, connect the Arduino microcontroller to the Raspberry Pi side.  
In this case, it is observed that the remote agent "slave-pi" has the ports /dev/ttyACM0 and /dev/ttyAMA0.  
From the description, you can tell that the Arduino microcontroller is connected to /dev/ttyACM0.  
![](https://gyazo.com/21ffeded5d77362eb2e25f2a56e7d68c.png)

## Uploading the Program to the Remote Side (from the Host Side)

At this point, uploading the program to the Arduino microcontroller connected to the remote side is straightforward.  
Simply click on "Remote Upload."  
When executed, the program will be uploaded as shown below.  
![](https://gyazo.com/e02e917af92d895b2cc848b16cae01fb.png)

If the program is uploaded successfully, the Arduino's LED should blink on and off at one-second intervals.

### When the Upload to the Arduino Microcontroller Fails

PlatformIO automatically identifies the target COM port for uploading the program, but sometimes it may fail to recognize the destination correctly.  
In such cases, specify the destination port in the "platformio.ini" file.

If "/dev/ttyACM0" is not recognized as the upload destination, add the following "upload_port" configuration to platformio.ini:
```ini
[env:uno]
platform = atmelavr
framework = arduino
board = uno
upload_port = /dev/ttyACM0
```

### When Specifying a Specific Remote Target

If you click "Remote Upload," it may repeatedly search through multiple remote destinations. Instead, try uploading the program by specifying a particular remote target via the command line.  
Enter the following command. (Assuming the destination is on the Raspberry Pi side)
```shell
pio remote --agent slave-pi run --target upload
```

This way, you can upload the program to a specific remote target.  
It appears that you can specify multiple agents.  
For example, you can write it as follows:
```shell
pio remote --agent slave-pi --agent slave-win run --target upload
```

## Checking the Remote Agent's Logs (Remote Side)

For good measure, let's check the logs of the remote agent as well.  
![](https://gyazo.com/f5fff34e7fcd79086454b17b504bfa09.png)

If you see logs for device list requests and synchronization, it means everything is working successfully.

## Conclusion

How did it go? I believe you were able to upload a program to the microcontroller connected to the remote PC surprisingly easily.  
In the future, I plan to write about remote development in PlatformIO environments on other microcontrollers (such as ESP32, Raspberry Pi Pico, STM) and even on WSL.

<style>
img {
    border: 1px gray solid;
}
</style>
