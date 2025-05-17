---
title: >-
  Trying IoT (Part 20: Ultra-Beginner's Guide to ESP32 Programming with
  MicroPython)
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

In this "Trying IoT" series, we've primarily used development environments like [PlatformIO](https://platformio.org/) and [ESP-IDF](https://idf.espressif.com/). Although using VSCode makes development considerably easier, many of you may still want an even smoother development experience than with C/C++. In this article, we'll gently introduce how to install a lightweight, easy-to-use Python implementation called MicroPython on the ESP32 and develop programs with it.

### What You Will Learn in This Article
- The first steps of ESP32 programming with VSCode + PyMakr (a "blink" program)
- How to flash the MicroPython firmware (setting up the development environment)
- Basic operations such as using the REPL and uploading files (with actual screens and step-by-step instructions)

### Intended Audience
- Those who have heard of ESP32 and wonder how to actually use it
- Those who want to develop in Python rather than C/C++

---

## Development Environment

We use the following setup:
- OS: Windows 11 (local environment)
- Python: v3.11.7
- IDE: Visual Studio Code
- PyMakr: VSCode extension (Ver 2.25.2)
- Target: ESP32 development board (e.g., ESP-WROOM-32)

*Note: Although PyMakr hasn't been updated since around 2022, it still works as a MicroPython development environment, so we'll use PyMakr here.*

### Installing the PyMakr (VSCode Extension)

In VSCode's Extensions panel, search for “[PyMakr](https://github.com/pycom/pymakr-vsc)” and install it.  
![](https://gyazo.com/da19970e28e72a8dd9f6c0b5d5c95932.png)

*I installed the Preview version, since the stable release was less reliable in my environment. If you don't need a GUI, you can also use a tool called [mpremote](https://docs.micropython.org/en/latest/reference/mpremote.html).*

---

## Flashing the MicroPython Firmware

To use MicroPython on the ESP32, you need to install the MicroPython firmware onto the ESP32 in advance.

### 1. Download the MicroPython Firmware

Download the firmware from the [official site](https://micropython.org/download/esp32/).  
![](https://gyazo.com/f8cec67caa8c4ce2d577f22a2b07f9b9.png)

*In this example, I downloaded “ESP32_GENERIC-20250415-v1.25.0.bin”.*

### 2. Install `esptool`

We use `esptool` to flash the MicroPython firmware onto the ESP32. Install it locally:

```bash
pip install esptool
```

### 3. Erase the ESP32’s Flash Memory

Erase the ESP32’s flash memory in advance (example: COM6):

```bash
esptool --port COM6 erase_flash
```

### 4. Flash the Firmware onto the ESP32

Flash the downloaded MicroPython firmware onto the ESP32 (example: COM6):

```bash
esptool --chip esp32 --port COM6 --baud 460800 write_flash -z 0x1000 ESP32_GENERIC-20250415-v1.25.0.bin
```

*The COM port number may differ depending on your OS (Linux: `/dev/ttyUSB0`, etc.).*

---

## Development with PyMakr

Connect the ESP32 via USB-COM. In PyMakr, create a project, connect to the ESP32 over USB-COM, and upload your program to the device.

### 1. Create a Project

Click “PyMakr” and press the “＋” button next to “PYMAKR: PROJECTS”.  
![](https://gyazo.com/4cd285e0573bfcaa7497e07b3bd6b65e.png)

Select the base folder for your project and enter a project name.  
![](https://gyazo.com/400796c205c07b6253cce035d96ff0ef.png)

When prompted for the storage location, choose the side labeled with your project name.  
![](https://gyazo.com/9dbf51ed9e869eadbcd973d66bbab400.png)

Select the empty project template “empty”.  
![](https://gyazo.com/9265d2b30244f5a9a656c1e385b9222a.png)

Choose the USB-COM port to which the ESP32 is connected (COM6 in this example) and click OK.  
*(At this point, VSCode will auto-create a workspace, but you can ignore that for now.)*  
![](https://gyazo.com/b258d80506db3159637a96c358bd6bb1.png)

Your project (`my-proj`) will contain the following files:

```text
my-proj/
├── boot.py
├── main.py
├── pymakr.conf
```

Both `boot.py` and `main.py` are empty at this point. `pymakr.conf` contains only minimal definitions.

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

### 2. Verify the Connection

In the “PYMAKR: PROJECTS” list, you’ll see the connected USB-COM port. Select it and click “connect device”.  
![](https://gyazo.com/87f898d74ecd47b9dc259af79aadbcf1.png)

The ESP32 will connect.  
![](https://gyazo.com/35302fff452b95d1aa89e1ff9d24a785.png)

Click “open device in file explorer” to view the Python files stored on the ESP32 via serial communication. In the image, you can see only `boot.py` is present.  
*(Another workspace may open, but you can continue without worrying about it.)*  
![](https://gyazo.com/e01966aadc239ed9c5a74b5c6f328eec.png)

### 3. Create the Program (Example: LED Blink)

On your local machine, create a Python file named `blink.py`:  
*(The GPIO pin for the LED is set to 23.)*

blink.py
```python
from machine import Pin
from time import sleep

led = Pin(23, Pin.OUT)

while True:
    led.value(not led.value())
    sleep(0.5)
```

### 4. Upload the Program

Upload your program to the ESP32.

Use the “Upload” and “Download” buttons for the connected USB-COM port to transfer local files to the ESP32 or retrieve files from the ESP32 to your local machine.  
![](https://gyazo.com/2fdd0e04a42355200db7003a542ff0d9.png)

You can also right-click on a file → “Upload” to upload a single file (single-file Download is not available).

Below is an example of uploading all files to the device at once.  
![](https://gyazo.com/ded6382d32ddefdbc3bd33fe1df2b81b.png)

### 5. Run the Program

You can right-click on a file → “Run”. Running `blink.py` will make the LED blink at 1-second intervals. *(Since it’s in an infinite loop, press the ESP32’s reset button to stop it.)*

Click the “Create terminal” button to launch the REPL on the ESP32.  
![](https://gyazo.com/3bdefdb43980249884a3faa4131998a7.png)

**REPL** stands for “Read–Eval–Print Loop”.  
| Item      | Description                      |
|-----------|----------------------------------|
| **Read**  | Read the input (code)            |
| **Eval**  | Execute/evaluate the input code  |
| **Print** | Output the result                |
| **Loop**  | Repeat this cycle                |

At the REPL prompt, enter commands like this:  
![](https://gyazo.com/4e2dd54b970889f5f3397f490c8324d3.png)

The LED will blink at 1-second intervals. *(To stop the blinking, press Ctrl+C in the REPL.)*

---

## Differences Between boot.py and main.py

The `boot.py` and `main.py` files in your project are empty right now but serve the following roles:

| File       | Timing             | Purpose                          |
|------------|--------------------|----------------------------------|
| `boot.py`  | Executed first at startup | Initialize Wi-Fi, settings, etc. |
| `main.py`  | After `boot.py`    | User logic                       |

### Retrieving Partition Information at Boot

Let’s retrieve partition information at ESP32 startup. To get partition info, use MicroPython’s `esp32.Partition`. However, `Partition.find()` only returns the factory partition, so to obtain all partition information we’ll loop through all defined type/subtype combinations. It’s a rather brute-force method.

Add the following program to `boot.py`:

```python
from esp32 import Partition

# Function to convert size into human-readable strings like "4K" or "2M"
def human_readable_size(size):
    if size >= 1024 * 1024:
        return "{}M".format(size // (1024 * 1024))
    elif size >= 1024:
        return "{}K".format(size // 1024)
    else:
        return "{}B".format(size)

# The combinations of type and subtype to search (representative ones)
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

Upload this to the ESP32 just like `blink.py`. After resetting the ESP32, you’ll see logs like this in the REPL:

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

We can tabulate the partition information:

| Label    | Type                      | Address Range             | Size               |
|----------|---------------------------|---------------------------|--------------------|
| nvs      | DATA (subtype=2)          | 0x0009000 – 0x000EFFF     | 0x006000 (24K)     |
| phy_init | DATA (subtype=1)          | 0x000F000 – 0x000FFFF     | 0x001000 (4K)      |
| factory  | APP (subtype=0)           | 0x0010000 – 0x020FFFF     | 0x1F0000 (1M)      |
| vfs      | DATA (subtype=129/FAT)    | 0x0200000 – 0x03FFFFF     | 0x200000 (2M)      |

This confirms that `boot.py` runs at startup.

---

## Directly Editing Python Programs on the ESP32 via USB-COM Port

One major advantage of the MicroPython + PyMakr environment is the ability to **directly edit remote programs and execute them instantly**.

In typical embedded development, the workflow is:
    write code on your PC → compile → build → flash to the device → reboot and test…

With PyMakr, however, you can **open files on the ESP32 directly in the editor, edit and save them, and have them run immediately**.

It feels as if the ESP32 is being used like a “remote file server” or a “live Python environment.”

### How to Directly Edit Files on the Device

1. In “PYMAKR: PROJECTS,” select your connected device  
2. Click “Open device in file explorer”  
3. The ESP32’s internal files (such as `main.py` or `boot.py`) are displayed in an explorer view  
4. Edit the file and press `Ctrl+S` to save; the ESP32 updates immediately  

![](https://gyazo.com/359bbf18cf684e8dd14e68e04bca4cfb.png)

### Why It’s Convenient

- **No transfer needed & instant execution**: just edit → save, and the ESP32 reflects changes immediately  
- **On-site modification**: useful for remote debugging or small fixes  
- **Develop while checking operation**: try things in `main.py`, and if it works, download locally and share via GitHub, etc.

```text
Before:
    Edit locally → Upload → Run → Debug → Modify → Re-upload

From now on:
    Edit on the device → Save → Run immediately!
```

By integrating VSCode’s REPL and File Explorer, you can manage files on the ESP32 as though you were editing local files. Once you get used to this, you may never go back to the traditional development style.

## Future Prospects

The ESP32 port of MicroPython also includes features such as:
- Connecting a DHT temperature and humidity sensor  
- Sending data over Wi-Fi (HTTP / MQTT)  
- Access via WebREPL  

---

## Conclusion

In this article, we introduced ESP32 programming using **MicroPython + VSCode + PyMakr**.  
`MicroPython` is user-friendly, lightweight, and enables fast development.  
We believe it significantly lowers the barrier to entry for ESP32 programming.

[I have compiled IoT-related tutorials and practical techniques.](/iot/)

I hope this will be helpful for your IoT projects.

---

<style>
img {
    border: 1px gray solid;
}
</style>
