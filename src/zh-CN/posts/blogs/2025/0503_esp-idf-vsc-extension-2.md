---
title: 彻底解读ESP-IDF项目结构与CMake机制！（VSCode＋ESP-IDF扩展功能）
author: shuichi-takatsu
date: 2025-05-03T00:00:00.000Z
tags:
  - vscode
  - esp32
  - esp-idf
  - cmake
  - sdkconfig
  - kconfig
image: true
translate: true

---

## 引言

在之前写的“[试用 VSCode 的 ESP-IDF 扩展‘Espressif IDF’](/blogs/2023/02/19/esp-idf-vsc-extension/)”这篇文章之后，已经过去了相当长的时间。  
这次将重点解说“**ESP-IDF 项目是如何构建的**”和“**CMake 的机制是怎样的**”。  

[ESP-IDF](https://www.espressif.com/en/products/sdks/esp-idf) 采用了 [**CMake**](https://cmake.org/) 这种“构建系统生成工具”。  
借助 CMake，可以以不依赖特定环境或工具的方式编写和管理构建流程（支持跨平台）。  
通过深入理解平时不太接触的 `CMakeLists.txt`、ESP-IDF 特有的 `sdkconfig` 以及 `idf.py` 机制，可以实现更灵活、更具扩展性的开发。  

另外，虽然本文与此没有直接关系，但 ESP-IDF 支持使用 [**Ninja（忍者）**](https://github.com/ninja-build/ninja) 作为构建系统。  
如果已安装 Ninja，则默认会使用 Ninja。  
Ninja 是超高速的构建系统。它基于 CMake 等构建生成工具生成的构建规则，高效地编译和链接源代码，生成可执行文件等。  

此前我大量使用 [PlatformIO](https://platformio.org/)，但由于需要调用 ESP-IDF 的功能来进行一些细节设置，最近开始学习 ESP-IDF。  
以前使用 ESP-IDF 时，对构建速度感到十分头疼，但自从开始使用 Ninja，构建速度大幅提升，现在可以无压力地使用。

## 目标读者

- 刚开始使用 ESP-IDF 进行 ESP32 开发的读者  
- 对 `CMakeLists.txt` 的编辑感到不安的读者  
- 想要在项目中添加自制库或可重用组件的读者  

## ESP-IDF项目的基本结构

假设已参照[之前的文章](/blogs/2023/02/19/esp-idf-vsc-extension/)完成 ESP-IDF 开发环境的安装，下面开始说明。

选择“New Project”来创建项目。  
![](https://gyazo.com/0f8409da6b0708eeff090ca384d80cc4.png)

分别设置“项目名称”、“项目目录”、“开发板”和“串口通信端口”。  
（组件目录无需设置）  
![](https://gyazo.com/01c447e5486618f2121dab6f985d470a.png)

选择“template-app”，然后点击“Create project using template template-app”。  
![](https://gyazo.com/499a7b7cef96f964c0df80ee2954100e.png)

创建完成的 ESP-IDF 项目结构如下：  
```makefile
my_project/
├── CMakeLists.txt      ← 项目整体的CMake配置
├── sdkconfig           ← menuconfig 的设置内容会反映到此配置文件
├── build/              ← 构建输出的存放目录（自动生成）
├── main/
│   ├── CMakeLists.txt    ← 指定源文件的CMake配置
│   └── main.c            ← 入口点（主程序）
├── .gitignore          ← git 忽略设置
```

## main/CMakeLists.txt 的含义

默认情况下，main/CMakeLists.txt 如下所示：  
```cmake
idf_component_register(SRCS "main.c"
                       INCLUDE_DIRS "")
```

其中的 `idf_component_register()` 非常重要。  
`idf_component_register()` 用于注册当前 CMakeLists.txt 所属组件的信息。

其含义如下：  
| 参数 | 指定值 | 说明 |
| ------------- | ---------- | :--------- |
| `SRCS`         | `"main.c"`    | 指定构成本组件的**C/C++ 源文件**。<br>此例中，将 `main.c` 注册为该组件的源文件。<br>也可指定多个文件。<br>在 ESP-IDF 中，main 也被视为“组件”。 |
| `INCLUDE_DIRS` | `""`          | 指定编译本组件的源文件（`main.c`）时所需的**私有头文件**所在目录。<br>此处指定的目录通常不被其他组件引用。<br>此例中指定 `""`（空字符串），表示该组件内部无需额外的包含目录。 |

## 项目根目录的 CMakeLists.txt 的含义

项目根目录下的 CMakeLists.txt 默认如下所示：  
```cmake
cmake_minimum_required(VERSION 3.5)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(my_project)
```

其含义如下：  
| 命令 | 说明 |
| ---------- | :------------ |
| `cmake_minimum_required(VERSION 3.5)` | 指定处理此 `CMakeLists.txt` 文件所需的 CMake**最低版本**。<br>此例中需 CMake 3.5 及以上版本。若安装的 CMake 版本低于此版本，将出现错误并停止处理。 |
| `include($ENV{IDF_PATH}/tools/cmake/project.cmake)` | 引入定义了 ESP-IDF 构建系统所需的**基本设置和自定义函数/宏**的 CMake 脚本文件。<br>`$ENV{IDF_PATH}` 会读取环境变量 `IDF_PATH` 的值，表示 ESP-IDF 的安装目录。<br>因此在执行构建之前，需要正确设置 `IDF_PATH`。<br>此 `include` 命令使得 `idf_component_register` 等 ESP-IDF 特有函数可以使用。 |
| `project(my_project)` | 定义要构建的**项目名称**。<br>此例中项目名称为 `my_project`。<br>执行此命令后，CMake 会设置项目名称（`PROJECT_NAME`）、项目源目录（`PROJECT_SOURCE_DIR`）、构建目录（`PROJECT_BINARY_DIR`）等重要变量。 |

通常该文件无需编辑，仅在需要添加自定义设置时才进行更改。

## sdkconfig 的含义

sdkconfig 是 ESP-IDF 项目的配置文件，是管理开发时构建选项和功能启用/禁用的核心文件。  
sdkconfig 是通过 Kconfig 系统生成的。（关于“Kconfig 系统”将在后文说明，目前只需将其理解为“管理开发时构建选项和功能启用/禁用的文件”即可）  

sdkconfig 文件内容大致如下，建议不要手动修改：  
```ini
#
# Automatically generated file. DO NOT EDIT.
# Espressif IoT Development Framework (ESP-IDF) 5.4.1 Project Configuration
#
```

通过以下 menuconfig 子命令进行设置后，内容会反映到 sdkconfig 文件中。（后文将介绍 idf.py 命令）  
```bash
idf.py menuconfig 
```
在 VSCode 的以下菜单中也可以操作 “menuconfig”：  
![](https://gyazo.com/e6bffd630e0c18a8f6dd440a8d5e6f2c.png)

VSCode 的 menuconfig 提供图形化界面，便于操作。  
要保存设置，点击 “Save” 按钮。  
![](https://gyazo.com/c7a6a0f2e04e6201a71b58f59489498a.png)

sdkconfig 中配置的内容通常包括以下几类（不同 ESP-IDF 版本可能略有差异）。  
例如在此定义 UART 波特率、Wi-Fi 启用等。  
| 类别 | 配置示例 |
| :---------------------- | :----------------------------------------------------- |
| 板子或芯片相关 | 芯片类型（ESP32/ESP32-S3 等） |
| 外设功能 | 启用 UART、SPI、I2C、Wi-Fi、BLE 等 |
| FreeRTOS 配置 | 任务数、栈大小、Tick 周期等 |
| 日志输出 | LOG_LEVEL 的设置（DEBUG、INFO、WARN 等） |
| 各组件配置 | 例如是否使用 SPIFFS、Wi-Fi 的最大连接数等 |

※ 也可以在 sdkconfig 中添加自定义定义（添加方法将在后文介绍）。

### 条件编译

构建系统（CMake）会根据 sdkconfig 中的配置对源代码进行条件编译。

例如，假设 sdkconfig 中有以下配置：  
```ini
CONFIG_MY_LED_ENABLE=y
CONFIG_MY_LED_GPIO=2
```

在代码中可以这样使用条件编译：  
```c
#include <stdio.h>
#include "driver/gpio.h"

void app_main(void)
{
#ifdef CONFIG_MY_LED_ENABLE
    gpio_reset_pin(CONFIG_MY_LED_GPIO);
    gpio_set_direction(CONFIG_MY_LED_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(CONFIG_MY_LED_GPIO, 1);  // 点亮 LED
#endif
}
```

### 相关文件及其对构建的影响

除了 sdkconfig 文件外，还有两个相关文件：  
| 文件 | 含义 |
|------|------|
| sdkconfig (配置文件本体) | 存储实际配置值 |
| sdkconfig.defaults | 初始值（在团队开发等需要将初始设置纳入仓库管理时非常有用） |
| build/config/sdkconfig.h | 编译时引用的头文件（由 sdkconfig 自动生成） |

在团队开发并通过 Git 管理成果物时，建议将团队所需的初始配置提取到 `sdkconfig.defaults` 中。

### sdkconfig.defaults 概述

sdkconfig.defaults 会在执行 `idf.py menuconfig` 或 `idf.py build` 时，仅当尚不存在 sdkconfig 文件时才应用初始值。  
如果 sdkconfig 已存在，则会**完全忽略** sdkconfig.defaults，以 sdkconfig 为**优先**。  
即使 sdkconfig.defaults 中存在 sdkconfig 没有的配置项，也不会被加载，请注意。  

```
your_project/
├── sdkconfig.defaults        ← 将初始配置写在此处（仅在无 sdkconfig 时使用）
├── sdkconfig                 ← 通过 menuconfig 等生成的实际配置文件
├── main/
│   ├── CMakeLists.txt
│   └── ...
```

格式与 sdkconfig 相同，例如可以这样写：  
```ini
CONFIG_LOG_DEFAULT_LEVEL=3
CONFIG_PROJECT_USE_LED=y
CONFIG_MY_DRIVER_GPIO_NUM=13
```

### Kconfig 系统

Kconfig 系统是“根据用户选择的配置选项（例如：是否使用 Wi-Fi），自动生成 sdkconfig 的机制”。

Kconfig 文件在各组件或目录中创建，用于定义可用的配置项。

以下是自制 LED 驱动的 Kconfig 文件示例。  
（普通 ESP32 的 LED GPIO 为 2 号，但在 ESP32 LOLIN D32 上为 5 号，所以这里指定为 “5”）
```ini
menu "My LED Driver Configuration"

    config MY_LED_ENABLE
        bool "Enable LED driver"
        default y
    
    config MY_LED_GPIO
        int "GPIO number for LED"
        default 5
        depends on MY_LED_ENABLE
    
endmenu
```

执行 `idf.py menuconfig` 后，设置会自动生成到 sdkconfig 中。  
用户在 menuconfig 中设置的内容最终会写入 sdkconfig 文件并反映到构建过程中。

在 menuconfig 界面进行如下设置，然后保存：  
![](https://gyazo.com/6a72d4365b82a30bcd8c07f293a5ea4d.png)

sdkconfig 文件中将生成以下定义：  
```ini
#
# My LED Driver Configuration
#
CONFIG_MY_LED_ENABLE=y
CONFIG_MY_LED_GPIO=5
# end of My LED Driver Configuration
# end of Component config
```

### Kconfig 与 Kconfig.projbuild 的区别

Kconfig 文件分为 “Kconfig” 和 “Kconfig.projbuild” 两种。

#### Kconfig 文件

Kconfig 用于：  
- 放置在各组件中  
- 在 menuconfig 中显示，供用户选择设置  

以下是组件端的 “Kconfig” 文件示例：  
```ini
menu "My Custom Driver Configuration"

    config USE_MY_DRIVER
        bool "Use my custom driver"
        default y
    
endmenu
```

#### Kconfig.projbuild 文件

Kconfig.projbuild 用于：  
- 在 main/ 目录或任意项目范围内使用  
- 当需要在该项目中集中定义额外配置项时使用  
- 在构建时自动加载并反映到 menuconfig  

以下是 main 端的 “Kconfig.projbuild” 文件示例：  
```ini
menu "Project-wide Options"

    config PROJECT_USE_LED
        bool "Enable LED feature for the whole project"
        default y

endmenu
```

#### 编写时注意

在 Kconfig 或 Kconfig.projbuild 中定义 “USE_XXXX” 时，sdkconfig 中会注册为 “CONFIG_USE_XXXX”。（在 sdkconfig 展开时会自动添加 “CONFIG_” 前缀）

### Kconfig 与 Kconfig.projbuild 的行为差异

| 特点                        | `Kconfig`                          | `Kconfig.projbuild`                            |
|-----------------------------|------------------------------------|------------------------------------------------|
| 加载来源                  | 各组件的 `CMakeLists.txt`             | 自动加载 main 目录下的文件                       |
| 主要用途          | 定义每个组件的配置项                    | 定义与项目整体相关的配置项                        |
| 是否自动使用            | 需要 `idf_component_register()`        | 自动加载（只要在 main 中即可）                    |
| menuconfig 显示   | 自动显示（如果组件被使用）            | 自动显示（只要在 main/ 下即可）                  |
| 作用范围      | 组件级别                            | 项目整体或应用层                              |

使用场景如下：  
- 库或可重用组件：Kconfig  
- 项目专属配置：Kconfig.projbuild  

```makefile
my_project/
├── main/
│   ├── CMakeLists.txt
│   ├── my_code.c
│   └── Kconfig.projbuild   ← ※项目专属配置
├── components/
│   └── my_led_driver/
│       ├── Kconfig         ← ※组件的配置
│       └── CMakeLists.txt
├── sdkconfig
└── build/
    └── config/
        └── sdkconfig.h
```

## idf.py 概述

在 ESP-IDF 项目中，`idf.py` 扮演着构建、烧录、监视等一体化管理工具的核心角色。  
它是一个基于 Python 的 CLI（命令行界面），内部调用 CMake、Ninja 等各类工具。  

下面列出常用的 `idf.py` 子命令示例：  
| 子命令               | 含义                                |
| ------------------------- | --------------------------------- |
| `idf.py set-target esp32` | 设置目标芯片（ESP32、ESP32-C3 等） |
| `idf.py menuconfig`       | 以 GUI 形式编辑 `sdkconfig`（基于 Kconfig） |
| `idf.py build`            | 使用 `CMake` 和 `Ninja` 执行构建  |
| `idf.py flash`            | 将编译好的二进制烧录到 ESP32     |
| `idf.py monitor`          | 使用串口监视 UART 日志            |
| `idf.py flash monitor`    | 同时执行烧录和监视                |
| `idf.py menuconfig`       | 打开设置界面（基于 ncurses）      |

由此可见，`idf.py` 是 ESP-IDF 开发的“枢纽”，简化了各种工具的桥接和项目管理。

在 VSCode 扩展中，也可以通过以下界面调用相同的子命令。  
![](https://gyazo.com/04b198b3123485b7d7326433eef68964.png)

## 创建自定义组件时的结构

以创建 `components/my_led_driver/` 这个自定义组件（自制 LED 驱动）为例。

目录结构如下：  
```makefile
components/
└── my_led_driver/
    ├── CMakeLists.txt
    ├── my_led_driver.c
    └── include/
        └── my_led_driver.h
```

在 `components/my_led_driver/CMakeLists.txt` 中进行如下设置：  
```cmake
idf_component_register(SRCS "my_led_driver.c"
                    INCLUDE_DIRS "include"
                    REQUIRES ＜必要的库。若无则无需 REQUIRES＞)
```

在调用此自定义组件的 `main.c` 中，包含以下头文件：  
```c
#include "my_led_driver.h"
```

在 `main/CMakeLists.txt` 中，通过如下设置指定自定义组件：  
```cmake
idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS "."
                    REQUIRES my_led_driver)
```

## Lチカ 示例程序（使用自定义组件版）

下面是一个针对 ESP-IDF 的自定义组件 `my_led_driver` 的简易示例代码。  
通过 GPIO 控制 LED 闪烁的基本结构（俗称 “Lチカ”）。

以下示例给出包含自定义组件的项目结构：  
```
my_project/
├── CMakeLists.txt          ← 项目整体的定义入口
├── Makefile                ← 用于调用 CMake 构建的简单包装
├── sdkconfig               ← 通过 menuconfig 设置的构建选项
├── build/                  ← 构建产物（自动生成）
├── main/
│   ├── CMakeLists.txt      ← 定义此目录下的构建目标（例如 main.c）
│   └── main.c              ← 应用程序的入口点
│   └── Kconfig.projbuild   ← 项目专属定义
├── components/             ← 自定义组件存放目录
│   └── my_led_driver/
│       ├── CMakeLists.txt  ← 自定义组件的构建配置
│       ├── my_led_driver.c
│       ├── Kconfig         ← 自定义组件定义
│       └── include/
│           └── my_led_driver.h
```

### 自定义组件示例

“`Kconfig`”“头文件”“C 文件”“CMakeLists.txt”如下所示。

components/my_led_driver/Kconfig  
（将 LED 的 GPIO 设置为 5）  
```ini
menu "My LED Driver Configuration"

    config MY_LED_GPIO
        int "GPIO number for LED"
        default 5
    
endmenu
```

components/my_led_driver/my_led_driver.h  
（定义了 `my_led_init`、`my_led_on`、`my_led_off` 三个函数）  
```c
#pragma once

#include "driver/gpio.h"

#ifdef __cplusplus
extern "C" {
#endif

// 初始化函数
void my_led_init(gpio_num_t gpio_num);

// ON/OFF 控制
void my_led_on(void);
void my_led_off(void);

#ifdef __cplusplus
}
#endif
```

components/my_led_driver/my_led_driver.c  
（GPIO 操作部分的实现）  
```c
#include "my_led_driver.h"

static gpio_num_t led_gpio = GPIO_NUM_NC;

void my_led_init(gpio_num_t gpio_num)
{
    led_gpio = gpio_num;

    gpio_config_t io_conf = {
        .pin_bit_mask = 1ULL << led_gpio,
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&io_conf);

    my_led_off(); // 初始状态关闭
}

void my_led_on(void)
{
    if (led_gpio != GPIO_NUM_NC) {
        gpio_set_level(led_gpio, 1);
    }
}

void my_led_off(void)
{
    if (led_gpio != GPIO_NUM_NC) {
        gpio_set_level(led_gpio, 0);
    }
}
```

components/my_led_driver/CMakeLists.txt  
（因为操作 GPIO，需要设置 esp_driver_gpio 库）  
```cmake
idf_component_register(SRCS "my_led_driver.c"
                       INCLUDE_DIRS "include"
                       REQUIRES esp_driver_gpio)
```

### 主程序示例

“`Kconfig.projbuild`”“C 文件”“CMakeLists.txt”如下所示。

main/Kconfig.projbuild  
（定义 LED 操作启用标志）  
```ini
menu "My LED Driver Configuration"

    config MY_LED_ENABLE
        bool "Enable LED driver"
        default y
   
endmenu
```

main/main.c  
（调用了自定义组件）  
```c
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "my_led_driver.h"

void app_main(void)
{
    my_led_init(CONFIG_MY_LED_GPIO);

    #ifdef CONFIG_MY_LED_ENABLE
    while (1) {
        my_led_on();
        vTaskDelay(pdMS_TO_TICKS(500));
        my_led_off();
        vTaskDelay(pdMS_TO_TICKS(500));
    }
    #endif    
}
```

main/CMakeLists.txt  
（通过 REQUIRES 引用自定义组件）  
```cmake
idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS "."
                    REQUIRES my_led_driver)
```

如此一来，`components/my_led_driver` 就作为自定义组件被整合到 ESP-IDF 构建中，形成可扩展的项目结构。

## 总结

本文解说了 ESP-IDF 项目的构成要素及其作用，以及 `idf.py` 命令的定位和自定义组件的创建方法。  
ESP-IDF 项目以 CMakeLists.txt 和 sdkconfig 为核心构成，能够灵活地管理构建和配置。  
对初学者来说，通过 `idf.py` 可以无需担心环境依赖和 CMake 的复杂性，轻松开始开发。  

与 PlatformIO 相比，ESP-IDF 刚开始看似门槛较高，但一旦理解各文件和工具的含义，就能更加自信地开展开发。  

希望能对 IoT 开发有所帮助。
