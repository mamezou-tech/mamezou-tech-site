---
title: 尝试使用 IoT（第20回：MicroPython ESP32 编程「超」入门）
author: shuichi-takatsu
date: 2025-05-14T00:00:00.000Z
tags:
  - vscode
  - esp32
  - micropython
  - pymakr
image: true
translate: true

---

## 引言

在本“尝试使用 IoT”系列中，我们主要使用了 [PlatformIO](https://platformio.org/) 和 [ESP-IDF](https://idf.espressif.com/) 这样的开发环境。  
虽然使用 VSCode 可以使开发变得相当轻松，但也许有很多人想要比 C/C++ 语言更快速地进行开发。  
因此，这次我们将向大家温和地介绍如何在 `ESP32` 上导入名为 `MicroPython` 的易用轻量级 Python 实现，并进行程序开发。  

### 本文将介绍的内容
- 使用 VSCode + PyMakr 进行 ESP32 编程的第一步（“LED闪烁”程序）
- MicroPython 固件的写入方法（开发环境准备）
- REPL 和文件上传等基本操作（附实际界面和步骤）

### 目标读者
- 对“ESP32 经常听说，但实际如何使用？”感兴趣的读者
- 想尝试使用 Python 而非 C/C++ 进行开发的读者

---

## 开发环境

开发环境使用如下。  
- 操作系统: Windows 11（本地环境）  
- Python: v3.11.7  
- IDE: Visual Studio Code  
- PyMakr: VSCode 扩展（Ver 2.25.2）  
- 目标: ESP32 开发板（ESP-WROOM-32 等）  

※PyMakr 从大约2022年起就停止了更新，但作为 MicroPython 开发环境仍可使用，所以这次我们将使用 PyMakr 进行操作。  

### 安装 PyMakr（VSCode 扩展）
在 VSCode 的扩展商店中搜索“PyMakr”并安装。  
![](https://gyazo.com/da19970e28e72a8dd9f6c0b5d5c95932.png)

※ 我安装的是 Preview 版，因为在我的环境中稳定版更不稳定，所以采用了 Preview 版。如果不需要 GUI 操作，也可以使用“mpremote”这一工具。

---

## 写入 MicroPython 固件

在 ESP32 上使用 MicroPython 时，需要事先将 MicroPython 固件安装到 ESP32 上。

### 1. 下载 MicroPython 固件

从[官方站点](https://micropython.org/download/esp32/)下载固件。  
![](https://gyazo.com/f8cec67caa8c4ce2d577f22a2b07f9b9.png)

※在示例中下载了 `ESP32_GENERIC-20250415-v1.25.0.bin`。

### 2. 安装 `esptool`

使用“esptool”作为将 MicroPython 固件写入 ESP32 的工具。在本地环境中安装 `esptool`。

```bash
pip install esptool
```

### 3. 初始化 ESP32 的 Flash 内存

在此之前初始化 ESP32 的 Flash 内存。（示例：COM6）

```bash
esptool --port COM6 erase_flash
```

### 4. 向 ESP32 写入固件

将刚才下载的 MicroPython 固件写入 ESP32。（示例：COM6）

```bash
esptool --chip esp32 --port COM6 --baud 460800 write_flash -z 0x1000 ESP32_GENERIC-20250415-v1.25.0.bin
```

※COM 端口号可能因操作系统而异。（Linux: `/dev/ttyUSB0` 等）

---

## 使用 PyMakr 开发

将 ESP32 通过 USB-COM 连接好。  
在 PyMakr 中创建项目，连接 ESP32 与 USB-COM，将程序上传到 ESP32。  

### 1. 创建项目

点击“PyMakr”，然后在 “PYMAKR: PROJECTS” 右侧点击 “+” 按钮。  
![](https://gyazo.com/4cd285e0573bfcaa7497e07b3bd6b65e.png)

选择项目的基础文件夹，并输入项目名称。  
![](https://gyazo.com/400796c205c07b6253cce035d96ff0ef.png)

系统会要求选择存储位置，请选择“项目名称”对应的选项。  
![](https://gyazo.com/9dbf51ed9e869eadbcd973d66bbab400.png)

选择空项目“empty”。  
![](https://gyazo.com/9265d2b30244f5a9a656c1e385b9222a.png)

选择 ESP32 所连接的 USB-COM 端口（示例为 COM6），然后按 OK。  
（※此时，根据 VSCode 的特性会自动创建工作区，但可以暂时忽略）  
![](https://gyazo.com/b258d80506db3159637a96c358bd6bb1.png)

项目（my-proj）中会创建如下文件。  
```text
my-proj/
├── boot.py
├── main.py
├── pymakr.conf
```

‘boot.py’ 和 ‘main.py’ 中尚未编写任何程序。  
‘pymakr.conf’ 也仅包含了最小定义。  

boot.py
```python
# boot.py -- 在启动时运行
```

main.py
```python
# main.py -- 在此处编写你的代码！
```

pymakr.conf
```conf
{
  "py_ignore": [
    ".vscode",
    ".gitignore",
    ".git",
    "env",
    "venv"
  ],
  "name": "my-proj"
}
```

### 2. 确认连接

在“PYMAKR: PROJECTS”列表中会显示可连接的 USB-COM 端口。选择 USB-COM 端口后点击“connect device”按钮。  
![](https://gyazo.com/87f898d74ecd47b9dc259af79aadbcf1.png)

ESP32 随即连接。  
![](https://gyazo.com/35302fff452b95d1aa89e1ff9d24a785.png)

点击“open device in file explorer”后，可通过串口通信查看存储在 ESP32 内部的 Python 文件。图中可以看到仅存有“boot.py”。  
（※虽然工作区又被打开，可暂且不予理会，继续下一步即可）  
![](https://gyazo.com/e01966aadc239ed9c5a74b5c6f328eec.png)

### 3. 编写程序（示例：LED 闪烁）

在本地创建以下 Python 文件“blink.py”。  
（GPIO 引脚已设置为 23，用于点亮 LED）

blink.py
```python
from machine import Pin
from time import sleep

led = Pin(23, Pin.OUT)

while True:
    led.value(not led.value())
    sleep(0.5)
```

### 4. 上传程序

将所编写的程序上传到 ESP32 端。  
在已连接的 USB-COM 端口下，通过“Upload”“Download”按钮可将本地文件上传至 ESP32，或将 ESP32 文件下载到本地。  
![](https://gyazo.com/2fdd0e04a42355200db7003a542ff0d9.png)

也可以在文件上右键→选择“Upload”进行单文件上传。（单文件模式下无法使用 Download）  

以下示例展示了将文件一次性批量上传到设备（ESP32）端的过程。  
![](https://gyazo.com/ded6382d32ddefdbc3bd33fe1df2b81b.png)

### 5. 运行程序

可以对单个文件进行右键→“Run”操作。运行“blink.py”后，LED 以 1 秒间隔重复闪烁。（因使用了无限循环，若要结束，可按 ESP32 上的重置按钮）

另点击“Create terminal”按钮后，会在 ESP32 端启动 REPL。  
![](https://gyazo.com/3bdefdb43980249884a3faa4131998a7.png)

**REPL** 是“Read–Eval–Print Loop（读取–执行–输出–循环）”各单词首字母的缩写。  
| 项目 | 含义 |
| ---- | ---- |
| **Read**  | 读取输入（代码） |
| **Eval**  | 执行（评估）输入的代码 |
| **Print** | 输出（显示）结果 |
| **Loop**  | 重复这一循环 |

在 REPL 中输入以下指令：  
![](https://gyazo.com/4e2dd54b970889f5f3397f490c8324d3.png)

LED 会以 1 秒间隔不断闪烁。（要结束闪烁，可在 REPL 中按“Ctrl+C”结束执行）

---

## boot.py 与 main.py 的区别

项目中的 “boot.py”“main.py” 中虽然尚未编写任何内容，但它们具有如下角色。

| 文件      | 时机              | 用途                   |
|-----------|-------------------|------------------------|
| `boot.py` | 启动时最先执行     | Wi-Fi 初始化、相关设置等 |
| `main.py` | 在 `boot.py` 之后 | 用户逻辑               |

### 在 boot 时获取分区信息

我们来在 ESP32 启动时获取分区信息。  
要获取分区信息，可以使用 MicroPython 提供的 “esp32.Partition” 类。  
但是，`Partition.find()` 仅返回 factory 类型，为了获取所有分区信息，需要稍作技巧。  
下面是一种相当强硬的方法，通过循环所有已定义的类型来获取信息。

在 boot.py 中写入以下程序。
```python
from esp32 import Partition

# 将大小转换为“4K”或“2M”等的函数
def human_readable_size(size):
    if size >= 1024 * 1024:
        return "{}M".format(size // (1024 * 1024))
    elif size >= 1024:
        return "{}K".format(size // 1024)
    else:
        return "{}B".format(size)

# 要搜索的 type, subtype 组合（常见示例）
PARTITION_TYPES = {
    0: 'APP',      # 应用程序
    1: 'DATA',     # 数据
}

PARTITION_SUBTYPES = {
    0: 'factory',
    1: 'ota_0',
    2: 'ota_1',
    16: 'test',
    32: 'nvs',
    33: 'phy',
    34: 'nvs_keys',
    129: 'fat',
    130: 'spiffs',
}

print("[BOOT] Scanning partitions...")

found_labels = set()
for type_id, type_name in PARTITION_TYPES.items():
    for subtype_id, subtype_name in PARTITION_SUBTYPES.items():
        try:
            parts = Partition.find(type_id, subtype_id)
            for part in parts:
                info = part.info()
                label = info[4]
                if label not in found_labels:
                    found_labels.add(label)
                    size = info[3]
                    print(" - type={}({}) subtype={}({}) label='{}' offset={} size={} ({}) readonly={}".format(
                        type_id, type_name,
                        subtype_id, subtype_name,
                        label,
                        hex(info[2]),
                        hex(size), human_readable_size(size),
                        info[5]
                    ))
        except Exception:
            continue
```

使用与 blink.py 相同的方法将程序上传到 ESP32。  
重置 ESP32 后，在 REPL 中会输出如下日志：  
```text
rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
configsip: 0, SPIWP:0xee
clk_drv:0x00,q_drv:0x00,d_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00
mode:DIO, clock div:2
load:0x3fff0030,len:4892
ho 0 tail 12 room 4
load:0x40078000,len:14896
load:0x40080400,len:4
load:0x40080404,len:3372
entry 0x400805b0
[BOOT] Scanning partitions...
 - type=0(APP) subtype=0(factory) label='factory' offset=0x10000 size=0x1f0000 (1M) readonly=False
 - type=1(DATA) subtype=1(ota_0) label='phy_init' offset=0xf000 size=0x1000 (4K) readonly=False
 - type=1(DATA) subtype=2(ota_1) label='nvs' offset=0x9000 size=0x6000 (24K) readonly=False
 - type=1(DATA) subtype=129(fat) label='vfs' offset=0x200000 size=0x200000 (2M) readonly=False
MicroPython v1.25.0 on 2025-04-15; Generic ESP32 module with ESP32
Type "help()" for more information.
>>>
```

将分区信息整理如下表。  
| 标签 (label)      | 类型 (type)              | 地址范围                      | 大小                    |
|-------------------|--------------------------|-------------------------------|-------------------------|
| nvs               | DATA (subtype=2)         | 0x0009000 - 0x000EFFF         | 0x006000 (24K)          |
| phy_init          | DATA (subtype=1)         | 0x000F000 - 0x000FFFF         | 0x001000 (4K)           |
| factory           | APP (subtype=0)          | 0x0010000 - 0x020FFFF         | 0x1F0000 (1M)           |
| vfs               | DATA (subtype=129/FAT)   | 0x0200000 - 0x03FFFFF         | 0x200000 (2M)           |

可以看出启动时会执行 boot.py。

---

## 通过 USB-COM 端口直接修改 ESP32 上的 Python 程序

MicroPython + PyMakr 环境的一大优势是**可以远程“直接编辑”程序并“立即执行”**。

通常，在嵌入式开发中，常见流程是：“在 PC 上编写代码 → 编译 → 构建 → 写入设备 → 重启后检查……”  
然而在 PyMakr 中，**可以直接在编辑器中打开 ESP32 上的文件，编辑并保存后立即执行**。

这就好像将 ESP32 当作“远程文件服务器”或“实时 Python 环境”来使用的感觉。

### 如何直接编辑设备上的文件

1. 在“PYMAKR: PROJECTS”中选择已连接的设备  
2. 点击“Open device in file explorer”  
3. ESP32 内部的文件（如 `main.py` 或 `boot.py`）将以资源管理器形式显示  
4. 直接编辑文件并按 `Ctrl+S` 保存后，ESP32 端会立即更新  

![](https://gyazo.com/359bbf18cf684e8dd14e68e04bca4cfb.png)

### 为什么这么方便

- **无需传输、即刻执行**：只需编辑 → 保存，ESP32 即可反映  
- **现场修改**：远程调试和微调时也很方便  
- **一边确认一边开发**：可在 main.py 中尝试编写，成功后下载到本地，并分享至 GitHub 等平台  

```text
以前：
    本地编辑 → 上传 → 运行 → 调试 → 修改 → 再次上传

现在：
    在设备上编辑 → 保存 → 即刻执行！
```

通过将 VSCode 的“REPL”和“文件资源管理器”联动，就能像编辑本地文件一样管理 ESP32 上的文件。  
习惯之后，可能再也回不去传统的开发方式了。

## 未来展望

MicroPython 的 ESP32 支持版本还具备以下功能，因而可进行多种应用。  
- 与 DHT 温湿度传感器的连接  
- 通过 Wi-Fi 发送数据（HTTP / MQTT）  
- 通过 WebREPL 进行无线访问  

---

## 总结

本次介绍了使用 **MicroPython + VSCode + PyMakr** 进行 ESP32 编程。  
`MicroPython` 易于使用，轻量且可实现高速开发。  
我认为它能大幅降低 ESP32 编程的门槛。  

[已汇总关于 IoT 的教程和实战技巧。](/iot/)

希望对 IoT 应用有所帮助。

---

<style>
img {
    border: 1px gray solid;
}
</style>
