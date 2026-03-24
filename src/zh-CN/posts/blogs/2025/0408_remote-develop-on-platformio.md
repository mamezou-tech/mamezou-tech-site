---
title: 大家喜爱的VSCode与嵌入式软件开发环境PlatformIO进行远程开发尝试（Arduino篇）
author: shuichi-takatsu
date: 2025-04-08T00:00:00.000Z
tags:
  - arduino
  - remote
  - platformio
image: true
translate: true

---
如果进行嵌入式软件开发的话，[PlatformIO](https://platformio.org/) 非常方便。  
之前也在下面的文章中介绍过 PlatformIO。  
- [尝试使用 IoT（第14篇：有机EL显示屏(OLED)SSD1306篇）](/iot/internet-of-things-14/)  
- [使用 ESP-PROG 与 PlatformIO 对 ESP32 开发板进行调试](/blogs/2024/01/03/esp32-debug-by-esp-prog/)  
- [使用 Raspberry Pi 调试探针与 PlatformIO 对 Raspberry Pi Pico 进行调试](/blogs/2024/01/07/raspberry-pi-pico-debug-by-debug-probe/)  
- [使用 ST-Link V2 兼容品与 PlatformIO 对 STM32 微控制器板（STM32F103C8T6）进行调试](/blogs/2024/01/29/stm32-debug-by-st-link/)

那么，今天的主题是“当微控制器连接在网络上其它PC时，应如何将程序传输给微控制器？”  

一种方法是在远程PC上预先搭建微控制器的开发环境，然后从主机PC的VSCode通过SSH连接到远程PC，利用其开发环境进行开发。  
但如果远程PC无法准备开发环境或资源不足，就无法使用这种方法。

此次我们将介绍如何利用 PlatformIO，将通过USB连接在网络上远程PC上的微控制器上传闪烁测试程序（一个仅使LED闪烁的程序）。  
程序的传输目标微控制器采用大家喜爱的 [Arduino微控制器](https://www.arduino.cc/)。

## PlatformIO的安装（主机侧）

首先，关于如何在VSCode上安装PlatformIO的方法，虽然在[这里](/iot/internet-of-things-14/#開発環境「platform-io」)也有简要介绍，但这里做个快速回顾。  
安装非常简单。  
在VSCode的扩展市场里搜索“platformio”。  
找到下面的扩展后，只需安装该扩展即可。  
![](https://gyazo.com/776073d3f7845c935eb8ce0b102df75f.png)

如果在VSCode的扩展中出现下图图标，则表示已成功安装。  
![](https://gyazo.com/a577112c4f2e0a119d491db38e146de0.png)

## PlatformIO Core（CLI）的安装（远程侧）

这次远程侧不需要准备IDE，因此只安装 [Core（CLI）](https://docs.platformio.org/en/latest/core/index.html)。

作为远程PC，我准备了以下两种设备：
- Windows 10 pro
- Raspberry Pi 3B+

PlatformIO 会使用 Python，因此需要提前在PC上安装 Python。  
关于如何准备 Python 的方法网上有很多资料，这里就不再赘述。  
（如果通过 VSCode 扩展进行安装，则会同时安装 Platform IDE 及虚拟环境中的 Python）

Core（CLI）的安装按照[这里](https://docs.platformio.org/en/latest/core/installation/methods/installer-script.html)所示步骤进行。

我是通过下载本地 "get-platformio.py" 文件的方式安装的。  
![](https://gyazo.com/95ea981eb1752123d83238b5fa010350.png)

以后会使用 pio 命令，因此请将 PlatformIO 安装路径添加到环境变量 Path 中。

Windows 的情况下，在 path 环境变量中添加以下内容：
```shell
C:\Users\＜ユーザーID＞\.platformio\penv\Scripts
```

在 Raspberry Pi 的情况下，在 .bashrc 文件末尾添加：
```shell
export PATH=$PATH:$HOME/.platformio/penv/bin
```

### 99-platformio-udev.rules 设置（仅在Raspberry Pi侧需要）

在这里，仅在 Raspberry Pi 侧执行以下设置。  
如果不执行此操作，当在 Raspberry Pi 侧连接 Arduino 微控制器时，其用于通信的 COM 端口将无法被识别，后续可能会遇到问题。  

设置方法请参照[这里](https://docs.platformio.org/en/latest/core/installation/udev-rules.html)的步骤。

在 shell 中输入以下命令：
```shell
curl -fsSL https://raw.githubusercontent.com/platformio/platformio-core/develop/platformio/assets/system/99-platformio-udev.rules | sudo tee /etc/udev/rules.d/99-platformio-udev.rules
```

然后，重启 “udev” 管理工具：
```shell
sudo service udev restart
```

## 需要注册并登录 PlatformIO 账户（主机／远程双方）

### PlatformIO账户注册（仅需一次）

要使用 PlatformIO 的远程功能，需要注册并登录 PlatformIO 账户。  
请在[这里](https://community.platformio.org/)注册账户。  
![](https://gyazo.com/d7dddfcae32e126dee02a9d3660c0115.png)

注册完成后，主机侧和远程侧都需要登录。

### 主机侧 PlatformIO 账户登录

在 VSCode 中的 PlatformIO 界面上点击 “PIO Account”。  
输入 Username（或电子邮件地址）以及 PASSWORD。  
![](https://gyazo.com/056de1adaef9603af6506937417621bc.png)  

登录成功后会显示如下提示。  
![](https://gyazo.com/b59f15d72c45b4f381afb945e9f10bc8.png)  

### 远程侧 PlatformIO 账户登录

在命令行中输入以下命令：
```shell
pio account login
```

此时会提示输入用户ID和密码，请输入相应信息。  
登录成功后，会显示 “Successfully logged in!” 的信息。  
（首次登录时，会下载/安装一些 Python 模块）

## 准备闪烁程序（主机侧）

闪烁程序已经介绍过很多次了，而且在网上也能搜到，下面再附上。  
这次，我们将此闪烁程序上传到连接在远程PC上的 Arduino 微控制器。

```cpp
#include <Arduino.h>

static int T_DELAY = 1000;

void setup()
{
  // 将 LED 数字引脚初始化为输出。
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop()
{
  // 打开 LED（HIGH 为电压高）
  digitalWrite(LED_BUILTIN, HIGH);
  // 等待一秒
  delay(T_DELAY);
  // 通过将电压设为 LOW 来关闭 LED
  digitalWrite(LED_BUILTIN, LOW);
  // 等待一秒
  delay(T_DELAY);
}
```

## 启动远程代理（远程侧）

进行远程开发时，需要先启动 “Agent”。  
在远程PC上输入以下命令以启动远程代理。  
（※注意：不要在两台远程PC上同时执行下面的命令。如果需要执行，请为 “--name” 部分指定不同的名称）

```shell
pio remote agent start --name slave
```

这次，将远程侧的名称设置为 “slave”。  
这个名称将用作区分远程环境的标识符。  

启动成功后，会出现如下提示。  
![](https://gyazo.com/8998b79b4356fc30002bfe88f033665f.png)

## 在主机侧确认远程COM端口

接下来，在主机PC上确认远程PC上的 COM 端口（实际上是连接了 Arduino 微控制器的 USB-COM 端口）。

点击 Project Task 中的 “Remote Devices”，这时终端会自动执行 “pio remote device list” 命令，并显示输出。

### 将 Arduino 微控制器连接到 Windows 侧

将 Arduino 微控制器连接到 Windows 侧。  
这次，从远程代理 “slave” 中可以看到 COM3 和 COM5 端口。  
其中，COM5 端口即为连接 Arduino 微控制器的端口。  
![](https://gyazo.com/b237cd878a9bed1b7e55eede556068ce.png)

### 将 Arduino 微控制器连接到 Raspberry Pi 侧

之前提到“不要在两台远程PC上同时执行远程命令”，不过我们可以更改远程端的名称试一下。  
将远程名称设置如下：  
- Windows侧：slave-win  
- Raspberry Pi侧：slave-pi

然后，将 Arduino 微控制器连接到 Raspberry Pi 侧。  
这次，从远程代理 “slave-pi” 可以看到 /dev/ttyACM0 和 /dev/ttyAMA0 端口。  
从描述中可以看出 /dev/ttyACM0 是 Arduino 微控制器的一侧。  
![](https://gyazo.com/21ffeded5d77362eb2e25f2a56e7d68c.png)

## 在远程侧上传程序（主机侧）

到此为止，将程序上传到连接在远程PC上的 Arduino 微控制器就非常简单了。  
只需点击 “Remote Upload”。  
执行后，程序会按如下方式上传。  
![](https://gyazo.com/e02e917af92d895b2cc848b16cae01fb.png)

如果程序上传成功，Arduino 的 LED 应该会以 1 秒间隔闪烁。

### 当无法上传到 Arduino 微控制器时

PlatformIO 会自动识别上传目标的 COM 端口并传输程序，但有时可能无法正确识别目标。  
这种情况下，请在 “platformio.ini” 中指定传输目标的端口名称。

如果 “/dev/ttyACM0” 未被识别为传输目标，请在 platformio.ini 中添加 “upload_port”，如下所示。
```ini
[env:uno]
platform = atmelavr
framework = arduino
board = uno
upload_port = /dev/ttyACM0
```

### 指定特定远程目标时

点击 “Remote Upload” 时，会多次搜索多个远程目标，因此可以通过命令行指定特定的远程目标进行程序上传。  
假设目标为 Raspberry Pi 侧，输入以下命令：
```shell
pio remote --agent slave-pi run --target upload
```

通过这种方式，就可以向特定的远程目标上传程序。  
agent 也可以同时指定多个。  
例如，也可以如下书写：
```shell
pio remote --agent slave-pi --agent slave-win run --target upload
```

## 查看远程侧代理日志（远程侧）

为了确保万无一失，请检查一下远程侧代理的日志。  
![](https://gyazo.com/f5fff34e7fcd79086454b17b504bfa09.png)

如果显示了设备列表请求和同步日志，则说明一切正常。

## 总结

怎么样？相信大家能轻松将程序上传到连接在远程PC上的微控制器。  
今后，我还计划撰写关于其他微控制器（如 ESP32、Raspberry Pi Pico、STM）以及在 WSL 上的 PlatformIO 环境中进行远程开发的相关内容。

<style>
img {
    border: 1px gray solid;
}
</style>
