---
title: >-
  Experimenting with IoT (Part 20: A 'Super' Introduction to ESP32 Programming
  with MicroPython)
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

## Introduction

In this "Experimenting with IoT" series, we have mainly used development environments such as [PlatformIO](https://platformio.org/) and [ESP-IDF](https://idf.espressif.com/).  
Even though using VSCode makes development considerably easier, many of you might want to develop even more quickly than with C/C++ languages.  
So this time, we’ll gently introduce how to install a user-friendly, lightweight Python implementation called MicroPython on the ESP32, and how to develop programs.

### What you will learn in this article
- The first step in ESP32 programming using VSCode + PyMakr (the “LED blink” program)
- How to flash the MicroPython firmware (preparing the development environment)
- Basic operations such as REPL and file upload (with actual screenshots and step-by-step instructions)

### Target audience
- Those who have heard of ESP32 and are curious about how to actually use it
- Those who want to develop with Python rather than C/C++

---

## Development Environment

The development environment uses the following:
- OS: Windows 11 (local environment)
- Python: v3.11.7
- IDE: Visual Studio Code
- PyMakr: VSCode extension (Ver 2.25.2)
- Target: ESP32 development board (e.g., ESP-WROOM-32)

*Note: Although PyMakr updates stopped around 2022, it can still be used as a MicroPython development environment, so we’ll proceed using PyMakr this time.*

### Installing PyMakr (VSCode extension)
Search for "[PyMakr](https://github.com/pycom/pymakr-vsc)" in the VSCode extensions panel and install it.  
![](https://gyazo.com/da19970e28e72a8dd9f6c0b5d5c95932.png)

*Note: I installed the Preview version, but in my environment the stable version was more unstable, so I chose the Preview version.  
If you don’t need a GUI, you can also use a tool called "[mpremote](https://docs.micropython.org/en/latest/reference/mpremote.html)".*

---

## Flashing the MicroPython Firmware

When using MicroPython on the ESP32, you need to install the MicroPython firmware on the ESP32 in advance.

### 1. Downloading the MicroPython firmware

Download the firmware from the [official site](https://micropython.org/download/esp32/).  
![](https://gyazo.com/f8cec67caa8c4ce2d577f22a2b07f9b9.png)

*In this example, I downloaded `ESP32_GENERIC-20250415-v1.25.0.bin`.*

### 2. Installing `esptool`

We’ll use the tool `esptool` to flash the MicroPython firmware onto the ESP32. Install `esptool` in your local environment:

```bash
pip install esptool
```

### 3. Erasing the ESP32’s flash memory

First, erase the flash memory of the ESP32. (Example: COM6)

```bash
esptool --port COM6 erase_flash
```

### 4. Flashing the firmware onto the ESP32

Write the downloaded MicroPython firmware to the ESP32. (Example: COM6)

```bash
esptool --chip esp32 --port COM6 --baud 460800 write_flash -z 0x1000 ESP32_GENERIC-20250415-v1.25.0.bin
```

*The COM port number may differ depending on your OS (e.g., `/dev/ttyUSB0` on Linux).*

---

## Developing with PyMakr

Connect the ESP32 via USB-COM. Create a project with PyMakr, connect to the ESP32 over USB-COM, and upload your program to the ESP32.

### 1. Creating a project

Click "PyMakr" and press the "+" button next to "PYMAKR: PROJECTS".  
![](https://gyazo.com/4cd285e0573bfcaa7497e07b3bd6b65e.png)

Select the base folder for your project and enter the project name.  
![](https://gyazo.com/400796c205c07b6253cce035d96ff0ef.png)

When asked where to store it, select the folder named after your project.  
![](https://gyazo.com/9dbf51ed9e869eadbcd973d66bbab400.png)

Choose the empty project template "empty".  
![](https://gyazo.com/9265d2b30244f5a9a656c1e385b9222a.png)

Select the USB-COM port where the ESP32 is connected (example: COM6) and press OK.  
*(Note: VSCode will automatically create a workspace due to its behavior, but you can ignore it for now.)*  
![](https://gyazo.com/b258d80506db3159637a96c358bd6bb1.png)

The project (`my-proj`) is created with the following files:
```text
my-proj/
├── boot.py
├── main.py
├── pymakr.conf
```

No programs are written in `boot.py` or `main.py` yet.  
`pymakr.conf` also contains only minimal definitions.

boot.py
```python
# boot.py -- run on boot-up
```

main.py
```python
# main.py -- put your code here!
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

### 2. Verifying the connection

The USB-COM port connected to the device appears in the "PYMAKR: PROJECTS" list.  
Select the USB-COM port and click the "connect device" button.  
![](https://gyazo.com/87f898d74ecd47b9dc259af79aadbcf1.png)

The ESP32 connects.  
![](https://gyazo.com/35302fff452b95d1aa89e1ff9d24a785.png)

Clicking "open device in file explorer" lets you view Python files stored on the ESP32 via serial communication.  
The image shows only `boot.py` stored on the device.  
*(Another workspace opened, but you can ignore it and proceed.)*  
![](https://gyazo.com/e01966aadc239ed9c5a74b5c6f328eec.png)

### 3. Creating a program (Example: LED blink)

Create the following Python file `blink.py` on your local machine.  
(The GPIO pin for the LED is set to 23.)

blink.py
```python
from machine import Pin
from time import sleep

led = Pin(23, Pin.OUT)

while True:
    led.value(not led.value())
    sleep(0.5)
```

### 4. Uploading the program

Upload the created program to the ESP32.

Use the "Upload" and "Download" buttons for the connected USB-COM port to upload local files to the ESP32 or download files from the ESP32.  
![](https://gyazo.com/2fdd0e04a42355200db7003a542ff0d9.png)

You can also right-click a file and select "Upload" to upload it individually. (Download is not available per-file.)

Below is an example of uploading all files to the device (ESP32) at once:  
![](https://gyazo.com/ded6382d32ddefdbc3bd33fe1df2b81b.png)

### 5. Running the program

You can run a file by right-clicking it and choosing "Run".  
Running `blink.py` makes the LED blink at 1-second intervals.  
(Since it’s an infinite loop, press the ESP32’s reset button to stop it.)

You can also click the "Create terminal" button to launch the REPL on the ESP32.  
![](https://gyazo.com/3bdefdb43980249884a3faa4131998a7.png)

REPL stands for "Read–Eval–Print Loop":
| Item       | Description                              |
| ---------- | ---------------------------------------- |
| **Read**   | Reads the input (code)                  |
| **Eval**   | Executes (evaluates) the input code     |
| **Print**  | Outputs (displays) the result           |
| **Loop**   | Repeats this cycle                      |

In the REPL, enter commands like:  
![](https://gyazo.com/4e2dd54b970889f5f3397f490c8324d3.png)

The LED blinks at 1-second intervals.  
(Press Ctrl+C to stop execution in the REPL.)

---

## Differences Between boot.py and main.py

Although `boot.py` and `main.py` are empty at first, they have the following roles:

| File      | Timing                  | Purpose                                  |
| --------- | ----------------------- | ---------------------------------------- |
| `boot.py` | Executed first at startup | Wi-Fi initialization, settings, etc.     |
| `main.py` | After `boot.py`         | User logic                               |

### Retrieving partition information at boot

Let’s retrieve the partition information when the ESP32 boots. To do that, use the `esp32.Partition` module provided by MicroPython. However, `Partition.find()` only returns the factory partition, so to get all partition information you need a bit of a workaround. Here’s a brute-force method: loop through the defined types.

Add the following code to `boot.py`:
```python
from esp32 import Partition

# Function to convert size to "4K", "2M", etc.
def human_readable_size(size):
    if size >= 1024 * 1024:
        return "{}M".format(size // (1024 * 1024))
    elif size >= 1024:
        return "{}K".format(size // 1024)
    else:
        return "{}B".format(size)

# Combinations of type and subtype to search (representative ones)
PARTITION_TYPES = {
    0: 'APP',      # Application
    1: 'DATA',     # Data
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

Upload this code to the ESP32 the same way as with `blink.py`. Reset the ESP32, and you’ll see a log like the following in the REPL:
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

Here’s the partition information in a table:
| Label      | Type (subtype)    | Address Range             | Size               |
| ---------- | ----------------- | ------------------------- | ------------------ |
| nvs        | DATA (subtype=2)  | 0x0009000 - 0x000EFFF     | 0x006000 (24K)     |
| phy_init   | DATA (subtype=1)  | 0x000F000 - 0x000FFFF     | 0x001000 (4K)      |
| factory    | APP (subtype=0)   | 0x0010000 - 0x020FFFF     | 0x1F0000 (1M)      |
| vfs        | DATA (subtype=129)| 0x0200000 - 0x03FFFFF     | 0x200000 (2M)      |

This shows that `boot.py` is executed at startup.

---

## Directly Editing Python Programs on the ESP32 via USB-COM

One of the greatest strengths of the MicroPython + PyMakr environment is the ability to **"directly edit" and "immediately run" remote programs**.

In typical embedded development, the flow is: "write code on the PC → compile → build → flash to device → reboot and check…".  
With PyMakr, however, you can **open files on the ESP32 directly in the editor, edit & save them, and they execute immediately**.

It feels as if you’re using the ESP32 as a "remote file server" or a "live Python environment".

### How to directly edit files on the device

1. In "PYMAKR: PROJECTS", select the connected device  
2. Click "Open device in file explorer"  
3. The ESP32’s internal files (e.g., `main.py` or `boot.py`) will appear in the explorer  
4. Edit the file directly and press Ctrl+S to save, and the ESP32 will update instantly  

![](https://gyazo.com/359bbf18cf684e8dd14e68e04bca4cfb.png)

### Why it’s useful

- **No transfer needed & immediate execution**: Editing and saving alone reflect changes on the ESP32  
- **On-site fixes**: Convenient for remote debugging and minor tweaks  
- **Develop while testing**: Experiment in `main.py`, and once it works, download locally to share on GitHub, etc.

```text
Before:
    Edit locally → Upload → Run → Debug → Fix → Re-upload

From now on:
    Edit on-device → Save → Run instantly!
```

By integrating VSCode’s REPL and File Explorer, you can manage files on the ESP32 as if they were local files.  
Once you get used to this, it may be hard to return to traditional development workflows.

## Future Prospects

The ESP32 port of MicroPython also includes features such as:
- Connecting to DHT temperature/humidity sensors
- Sending data over Wi-Fi (HTTP / MQTT)
- WebREPL for wireless access

---

## Conclusion

This time, we introduced ESP32 programming using **MicroPython + VSCode + PyMakr**.  
MicroPython is easy to use, lightweight, and enables rapid development.  
It significantly lowers the barrier to ESP32 programming.

[We’ve compiled tutorials and practical techniques related to IoT.](/iot/)

I hope this helps you in your IoT endeavors.

---

<style>
img {
    border: 1px gray solid;
}
</style>
