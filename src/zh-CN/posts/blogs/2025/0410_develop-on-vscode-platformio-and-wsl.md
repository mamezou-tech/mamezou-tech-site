---
title: VSCode & PlatformIO启动！WSL×嵌入式开发环境构建的完整指南
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

至今为止，我已在以下文章中介绍了使用 [VSCode](https://code.visualstudio.com/) 与 [PlatformIO](https://platformio.org/) 进行嵌入式软件开发的方法。  
- [试用 IoT（第14篇：有机EL显示屏(OLED)SSD1306篇）](/iot/internet-of-things-14/)
- [使用 ESP-PROG 和 PlatformIO 调试 ESP32 开发板](/blogs/2024/01/03/esp32-debug-by-esp-prog/)
- [使用 Raspberry Pi Debug Probe 和 PlatformIO 调试 Raspberry Pi Pico](/blogs/2024/01/07/raspberry-pi-pico-debug-by-debug-probe/)
- [使用与 ST-Link V2 兼容的设备和 PlatformIO 调试 STM32 微控制器板（STM32F103C8T6）](/blogs/2024/01/29/stm32-debug-by-st-link/)
- [尝试使用大家喜爱的 VSCode 与嵌入式软件开发环境 PlatformIO 进行远程开发（Arduino 版）](/blogs/2025/04/08/remote-develop-on-platformio/)

那么，今天的主题是「在 WSL（Ubuntu）中安装 PlatformIO，构建嵌入式软件开发环境」。  
我设想最终的构建效果如下：  
![](https://gyazo.com/2ff3d4c2bd86b63730015cd1f5f94aa9.png)

预先假设你已经在 Windows 上完成了 VSCode 的安装。

构建步骤如下：  
- 利用 WSL 在 Windows 上安装 Ubuntu24.04  
- 在 VSCode 中安装扩展功能（WSL 或 Remote Development）  
- 在 VSCode 中连接到 WSL  
- 在 WSL 上安装 PlatformIO  
- 使 WSL 识别 USB（使用 Usbipd-WIN）  
- 从 WSL（上面的 PlatformIO）向 Arduino 上传程序

那么，马上开始实践吧。

## 准备 WSL（Ubuntu）

WSL（Windows Subsystem for Linux）是一种可以在 Windows 上运行 Linux 环境的功能。  
使用 WSL 可以在 Windows 上轻松搭建 Linux 环境。  

关于如何通过 WSL 在 Windows 上安装 Linux（Ubuntu）的步骤，请参见[这篇文章](/blogs/2023/09/09/docker_ubuntu_on_wsl2/)。  
不过这次不需要安装 Docker。  

## 在 VSCode 中安装扩展功能「WSL」或「Remote Development」

软件开发本身是在安装在 Windows 上的 VSCode 中进行的。  
为了从 VSCode 连接到 WSL，我们使用扩展功能「WSL」。  
![](https://gyazo.com/a384a1691ba88f91263fa35af843456c.png)

今后如果需要通过 SSH 连接或在 Docker 容器中进行开发，建议安装扩展功能「Remote Development」。  
![](https://gyazo.com/602be6ac50015f5acdf6d00508ffdbf8.png)  

安装了「Remote Development」扩展功能后，会同时安装以下四个扩展功能：
- WSL（本篇文章中使用的扩展功能）
- Remote - SSH
- Dev Containers
- Remote - Tunnels

安装扩展功能后，VSCode 左侧面板中会增加「远程资源管理器」。  
![](https://gyazo.com/ed804fad4963f3b399b7d55ae0502b74.png)

## 在 VSCode 中连接到 WSL

点击 VSCode 左下角的「打开远程窗口」，然后选择「连接到 WSL」。  
![](https://gyazo.com/01afc6789bf1dcb88db17ad782a3e5b4.png)

连接完成后，VSCode 左下角的显示将变成如下样子。（连接的 WSL 为 Ubuntu24.04时）  
![](https://gyazo.com/7482344d2a0c5dbd229a3c8fba63486e.png)

## 在 WSL 上安装 PlatformIO

无论 PlatformIO 安装在 WSL 上还是本地环境中，其安装方法都是一样的。  
在 VSCode 已连接到 WSL 的状态下<font color="#ff0000">（★这里重要）</font>，安装 VSCode 的扩展功能「PlatformIO IDE」。  
![](https://gyazo.com/a55bc79cf369a4341f05f147c95168d9.png)

如果 PlatformIO 正确安装在 WSL 端，扩展功能图标的右下角会出现一个标记，表明安装目标为远程端。  
此外，还会显示当前激活扩展功能所在的 WSL 环境信息。  
![](https://gyazo.com/dd1365870e3ede5eb666f00bf23edfa0.png)

## 使 WSL 识别 USB

现在，这里遇到一个问题。  
虽然将 Arduino 微控制器连接到宿主 PC 后，通过 USB-COM 端口上传程序，但本次开发环境位于 WSL 上的 Ubuntu。

「如何让 WSL（Ubuntu）识别宿主 PC 上的 USB 呢？」

在 VirtualBox 等虚拟环境中，只需设置即可使 USB 设备被识别，但现在可不想放弃 WSL 或引进其他环境。  
有没有办法让 USB-COM 端口在 WSL（Ubuntu）中得到识别呢？  
经过各种查询，我在微软网站上发现了[这样的信息](https://learn.microsoft.com/ja-jp/windows/wsl/connect-usb)。  
如果使用该网站上介绍的 [usbipd-win](https://github.com/dorssel/usbipd-win/releases)，问题似乎可以得到解决。  
从上述网站下载最新版本并安装到宿主 PC 上。  

安装应用后，用以下命令显示 USB 设备列表。
```shell
usbipd list
```

在我的环境中，显示了以下 USB 设备列表。  
![](https://gyazo.com/d07156cf77a4e1961331a3869d9ac8e6.png)

随后，在将 Arduino 微控制器连接到宿主 PC 后，再次获取 USB 设备列表。  
这时，会看到设备数量增加了一个。  
看来，这个 BUSID「3-2」就是当 Arduino 微控制器连接时生成的 USB 设备。  
![](https://gyazo.com/8a5aa3c7ddcc2047ce91230e2a94aefd.png)

那么，将用这个 BUSID 所指示的 USB 设备共享（绑定），以便在 WSL 中使用。  
请以管理员权限启动 Powershell 或命令提示符，并执行以下命令。  
（请根据各自环境将 BUSID 替换为相应值）

```shell
usbipd bind --busid 3-2
```

这样，STATE 部分会变为「Shared」，表明设备已被共享。  
![](https://gyazo.com/6639d2a430f85b0dbf3a675453187543.png)

不过，在这种状态下，仍然不能在 WSL 中使用 USB 设备。  
要使其可用，还需要进行分配（附加）。  
接下来将 USB 设备附加给 WSL。  
执行以下命令：  

```shell
usbipd attach --wsl --busid 3-2
```
随后输出了如下日志。  
![](https://gyazo.com/3cc79cca0c7f5cef3009f5d71a1d4fe0.png)

在 USB 设备列表中可以确认，STATE 已变为「Attached」。  
![](https://gyazo.com/c93e766ca4ae351b214fe7a9fa0b8f2e.png)

顺便一提，解除附加的命令如下：  
```shell
usbipd detach --busid <busid>
```

另外，取消共享的命令如下：   
```shell
usbipd unbind --busid <busid>
```

## 99-platformio-udev.rules 设置

另外，在 Linux 上使用 PlatformIO 时，需要进行之前文章中介绍的「99-platformio-udev.rules 设置」，因此在 WSL 上的 Ubuntu 中执行该设置。  
（虽然上述文章中是针对 Rasbian（Raspberry Pi）的，但因为都是 Linux 系统，所以使用相同步骤进行设置即可）

## 从 WSL 上上传程序

到此为止，终于构建出了可以进行程序开发和上传的环境。  
回想起来，似乎 USB 设备的设置竟比 PlatformIO 的配置更为繁琐。

向 Arduino 微控制器上传的程序使用的是一如既往的「L闪灯程序」。  
该程序与[这里](/blogs/2025/04/08/remote-develop-on-platformio/#l%E3%83%81%E3%82%AB%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%A0%E3%82%92%E7%94%A8%E6%84%8F%EF%BC%88%E3%83%9B%E3%82%B9%E3%83%88%E5%81%B4%EF%BC%89)中的内容相同。

点击上传按钮。  
![](https://gyazo.com/4ee0f74e68b35917e6c774e53ca638cf.png)

上传后，如果看到以下日志输出且 Arduino 微控制器的 LED 以1秒间隔闪烁，即表示上传成功。  
![](https://gyazo.com/fe1dee58e393e9edd6c537c0491bfd81.png)

## 附录（使用 GUI 操作 USB）

对于觉得通过命令行逐条进行 USB 共享或附加操作很麻烦的你，下面推荐一个 GUI 工具。  
安装[此工具](https://github.com/nickbeth/wsl-usb-manager)后，可通过 GUI 进行 USB 共享、附加等操作。

操作界面如下：  
![](https://gyazo.com/3fc13d90cb9bfb7dd5cb3a52ea9ab1b2.png)

## 总结

原本希望仅用 VSCode＋WSL＋PlatformIO 完全实现整个流程，但由于涉及 USB 设备的操作，部分情况下仍需要在 Windows 上安装额外应用。  
不过，由于 usbipd-win 是微软网站上也介绍过的应用程序，所以姑且认为问题不大。  
至此，我们构建了一个在不污染宿主 PC 环境的情况下，在 WSL 上的 Ubuntu 中进行嵌入式软件开发的环境。  
今后还会介绍更多不同嵌入式设备的开发环境。    

<style>
img {
    border: 1px gray solid;
}
</style>
