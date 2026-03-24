---
title: >-
  Getting Started with VSCode & PlatformIO! A Complete Guide to Building an
  Embedded Software Development Environment on WSL
author: shuichi-takatsu
date: 2025-04-10T00:00:00.000Z
tags:
  - arduino
  - platformio
  - wsl
  - vscode
image: true
translate: true

---

Up until now, I have introduced embedded software development using [VSCode](https://code.visualstudio.com/) and [PlatformIO](https://platformio.org/) in the following articles.  
- [Trying out IoT (Part 14: OLED SSD1306 Edition with Organic EL Display)](/iot/internet-of-things-14/)
- [Debugging an ESP32 Development Board using ESP-PROG and PlatformIO](/blogs/2024/01/03/esp32-debug-by-esp-prog/)
- [Debugging a Raspberry Pi Pico using a Raspberry Pi Debug Probe and PlatformIO](/blogs/2024/01/07/raspberry-pi-pico-debug-by-debug-probe/)
- [Debugging an STM32 Microcontroller Board (STM32F103C8T6) using an ST-Link V2 Compatible Device and PlatformIO](/blogs/2024/01/29/stm32-debug-by-st-link/)
- [Remote Development with the Ever-Popular VSCode and the Embedded Software Development Environment PlatformIO (Arduino)](/blogs/2025/04/08/remote-develop-on-platformio/)

Now, today's topic is "Let's install PlatformIO on WSL (Ubuntu) and create an embedded software development environment."  
The final setup image is envisioned as follows:  
![](https://gyazo.com/2ff3d4c2bd86b63730015cd1f5f94aa9.png)

Assume that VSCode is already installed on Windows.

The steps for the setup are as follows:  
- Install Ubuntu 24.04 on Windows using WSL  
- Install the VSCode extension (WSL or Remote Development)  
- Connect to WSL in VSCode  
- Install PlatformIO on WSL  
- Recognize USB devices in WSL (using Usbipd-WIN)  
- Upload the program to Arduino from WSL (using PlatformIO)

Now, let's get started.

## Preparing WSL (Ubuntu)

WSL (Windows Subsystem for Linux) is a feature that allows you to run a Linux environment on Windows.  
Using WSL, you can easily set up a Linux environment on Windows.

For detailed steps on installing Linux (Ubuntu) on Windows using WSL, please refer to [this article](/blogs/2023/09/09/docker_ubuntu_on_wsl2/).  
Note, however, that there is no need to install Docker this time.

## Installing the "WSL" or "Remote Development" Extension in VSCode

The software development itself is carried out in VSCode, which is installed on Windows.  
To connect from VSCode to WSL, the "WSL" extension is used.  
![](https://gyazo.com/a384a1691ba88f91263fa35af843456c.png)

In the future, if you plan to develop via SSH connections or within Docker containers, it is advisable to install the "Remote Development" extension.  
![](https://gyazo.com/602be6ac50015f5acdf6d00508ffdbf8.png)  

When you install the "Remote Development" extension, the following four extensions are installed simultaneously:
- WSL (the extension used in this article)
- Remote - SSH
- Dev Containers
- Remote - Tunnels

Once the extensions are installed, the "Remote Explorer" is added to the left pane in VSCode.  
![](https://gyazo.com/ed804fad4963f3b399b7d55ae0502b74.png)

## Connecting to WSL in VSCode

Click on the "Open a Remote Window" button at the bottom left of VSCode and select "Connect to WSL".  
![](https://gyazo.com/01afc6789bf1dcb88db17ad782a3e5b4.png)

Once the connection is complete, the display at the bottom left of VSCode changes as shown below (when connected to Ubuntu 24.04 in WSL):  
![](https://gyazo.com/7482344d2a0c5dbd229a3c8fba63486e.png)

## Installing PlatformIO on WSL.

Whether PlatformIO is installed on WSL or on the local environment, the installation method is the same.  
Make sure you are connected to WSL in VSCode (<font color="#ff0000">★ This is important</font>) and then install the "PlatformIO IDE" extension in VSCode.  
![](https://gyazo.com/a55bc79cf369a4341f05f147c95168d9.png)

When PlatformIO is correctly installed on the WSL side, a marker indicating that the installation target is remote appears at the bottom right of the extension's icon.  
Additionally, it will display which WSL environment the extension is active in.  
![](https://gyazo.com/dd1365870e3ede5eb666f00bf23edfa0.png)

## Recognizing USB Devices from WSL

Now, here's a challenge.  
While the Arduino microcontroller is connected to the host PC and the program is uploaded via the USB COM port, this time the development environment is Ubuntu on WSL.

"How do we get the USB from the host PC to be recognized in WSL (Ubuntu)?"

In a virtual environment like VirtualBox, you might be able to set it up to recognize USB devices, but I have no desire to give up on WSL now and switch to another environment.  
So, is there any way to get the USB COM port recognized in WSL (Ubuntu)?  
After some searching, I found [this information](https://learn.microsoft.com/ja-jp/windows/wsl/connect-usb) on Microsoft's website.  
It appears that using [usbipd-win](https://github.com/dorssel/usbipd-win/releases) as introduced there can solve the problem.  
Download the latest version from the above site and install it on the host PC.  

After installing the application, display the list of USB devices by running the following command.
```shell
usbipd list
```

In my environment, the following USB device list was displayed.  
![](https://gyazo.com/d07156cf77a4e1961331a3869d9ac8e6.png)

After connecting the Arduino microcontroller to the host PC, run the USB device list command again.  
This time, one additional device appears.  
It seems that the BUSID "3-2" corresponds to the USB device created when the Arduino microcontroller was connected.  
![](https://gyazo.com/8a5aa3c7ddcc2047ce91230e2a94aefd.png)

Now, share (bind) the USB device indicated by this BUSID so that it can be used from WSL.  
Launch PowerShell or the Command Prompt as an administrator and run the following command.  
(Replace the BUSID according to your environment.)

```shell
usbipd bind --busid 3-2
```

Then, the STATE field changes to "Shared", indicating that the device is now shared.  
![](https://gyazo.com/6639d2a430f85b0dbf3a675453187543.png)

However, in this state, the USB device is still not usable from WSL.  
To utilize it, you need to attach it.  
Attach the USB device to WSL by executing the following command.

```shell
usbipd attach --wsl --busid 3-2
```
The following log was output.  
![](https://gyazo.com/3cc79cca0c7f5cef3009f5d71a1d4fe0.png)

When you check the USB device list again, you can confirm that the STATE has changed to "Attached".  
![](https://gyazo.com/c93e766ca4ae351b214fe7a9fa0b8f2e.png)

By the way, the command to detach is as follows.
```shell
usbipd detach --busid <busid>
```

Additionally, the command to unbind (stop sharing) is as follows.   
```shell
usbipd unbind --busid <busid>
```

## 99-platformio-udev.rules Configuration

Also, when using PlatformIO on Linux, the "99-platformio-udev.rules configuration" introduced in [a previous article](/blogs/2025/04/08/remote-develop-on-platformio/#99-platformio-udevrules-設定（raspberry-pi側のみ必要）) is required, so perform this configuration on Ubuntu running on WSL.  
(The article introduced above targeted Rasbian (Raspberry Pi), but since it's Linux-based, the same procedure applies.)

## Uploading the Program from WSL

Now, the environment for program development and uploading is finally set up.  
Looking back, it seems that configuring the USB device was far more troublesome than setting up PlatformIO.

For uploading the program to the Arduino microcontroller, the usual "Blink (L-Chika) program" is used.  
The program is the same as the one found [here](/blogs/2025/04/08/remote-develop-on-platformio/#l%E3%83%81%E3%82%AB%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%A0%E3%82%92%E7%94%A8%E6%84%8F%EF%BC%88%E3%83%9B%E3%82%B9%E3%83%88%E5%81%B4%EF%BC%89).

Click the upload button.  
![](https://gyazo.com/4ee0f74e68b35917e6c774e53ca638cf.png)

After the upload, if the log output appears as shown below and the LED on the Arduino microcontroller blinks at one-second intervals, the upload is successful.  
![](https://gyazo.com/fe1dee58e393e9edd6c537c0491bfd81.png)

## Bonus (USB Operations with GUI)

For those who find it tedious to perform USB sharing and attachment via the command line, here is a GUI tool for you.  
Installing [this tool](https://github.com/nickbeth/wsl-usb-manager) allows you to manage USB sharing and attachment through a graphical interface.

The interface looks something like this:  
![](https://gyazo.com/3fc13d90cb9bfb7dd5cb3a52ea9ab1b2.png)

## Summary

I had hoped to accomplish everything with just VSCode + WSL + PlatformIO, but to manage USB device operations, it was necessary to install some applications on Windows.  
However, since usbipd-win is also featured on Microsoft's website, that's acceptable for now.  
With this, you now have an environment to develop embedded software on Ubuntu running on WSL without cluttering your host PC.  
I plan to continue introducing various embedded device development environments in the future.

<style>
img {
    border: 1px gray solid;
}
</style>
