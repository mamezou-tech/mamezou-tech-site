---
title: 尝试使用 IoT（第19回：使用 ESP32 的 LightSleep 功能挑战省电运行）
author: shuichi-takatsu
date: 2025-05-11T00:00:00.000Z
tags:
  - esp32
  - lightsleep
  - esp-idf
  - vscode
image: true
translate: true

---

## 前言

在[之前的文章](/iot/internet-of-things-15/)中，我们介绍了如何利用 ESP32 的 DeepSleep 功能，实现长时间的电池供电。  
这次作为其延伸，我们将挑战 **LightSleep（轻度睡眠）功能**。

LightSleep 虽然无法像 DeepSleep 那样大幅减少功耗，但其特点是在保持系统状态和内存的前提下，能够在较短时间内恢复。例如，它适用于希望在快速响应外部输入的同时节约电力等场景。

本文将以使用 VSCode 和 ESP-IDF (Ver 5.4.1) 的开发环境为基础，结合具体示例代码，讲解如何在 ESP32 上利用 LightSleep 功能。

---

## 开发环境

开发环境如下所示。  
- 操作系统：Ubuntu 24.04（WSL2）  
- IDE：Visual Studio Code  
- ESP-IDF 扩展 “Espressif IDF”：1.10.0  
- ESP-IDF 版本：**v5.4.1**  
- 目标板：ESP32 开发板（如 ESP-WROOM-32 等）

---

## ESP32 的运行模式

ESP32 根据运行模式提供了多种省电模式。

* 活动模式：正常运行状态。可以使用全部功能，但功耗最高。  
* Modem Sleep：关闭 Wi-Fi/蓝牙调制解调器电源，CPU 保持运行模式。在需要抑制功耗的同时继续 CPU 处理时使用。  
* **Light Sleep**：保持 CPU、RAM 及部分外设的状态，同时对大多数数字外设和射频模块的时钟进行门控（停止）或关闭电源。CPU 处于暂停状态，但 RAM 内容被保留，能够实现非常快速的唤醒恢复。相比活动模式可大幅减少功耗，同时比 DeepSleep 恢复速度更快。  
* Deep Sleep：关闭 CPU、绝大多数 RAM 和数字外设的电源，仅 RTC（实时时钟）控制器和 ULP（超低功耗）协处理器可继续运行。功耗最低，但唤醒后会从复位序列重新启动程序，需要额外设计状态恢复逻辑。

---

## 什么是 LightSleep

LightSleep 模式是一种通过暂停 ESP32 的 CPU 并停止主要时钟来降低功耗的省电模式。  
重要的是，它能够保留 CPU 寄存器和 RAM 的内容，唤醒时能够从进入睡眠前的状态继续执行。  
因此无需像 DeepSleep 那样执行完整的启动序列，能够实现非常快速的恢复。

### LightSleep 的优点

* 快速唤醒：可在微秒级别恢复，适用于对事件响应性要求高的场景。  
* 状态保留：RAM 内容和 CPU 上下文保存，能够继续使用睡眠前的变量值等。  
* 多种唤醒源：可通过 GPIO、定时器、UART、Wi-Fi、Bluetooth LE、触摸传感器等多样触发源唤醒。  
* 中等功耗降低效果：相比活动模式可显著节电。

### LightSleep 的缺点与注意点

* 相比 DeepSleep 功耗较高：追求极低功耗的场景下 DeepSleep 更具优势。  
* 外设状态：部分外设在 LightSleep 中仍可能消耗电力，系统整体功耗还取决于外围电路。

## 与 DeepSleep 的比较

与之前使用的「[DeepSleep](/iot/internet-of-things-15/)」的比较表如下。  
| 模式        | 功耗     | 恢复速度       | 内存保留 | 外部中断支持         |
|-------------|----------|----------------|----------|----------------------|
| LightSleep  | 中等     | 非常快速       | ○        | ○                    |
| DeepSleep   | 非常低   | 数毫秒～数百毫秒 | ×        | ○（GPIO/定时器）     |

LightSleep 适用于需要在适度省电与快速响应之间取得平衡的应用场景，例如：  
- 平时进入睡眠状态，当传感器数值变化或用户输入时，立即开始处理的设备。  
- 定期进行短时间数据处理或通信，其余时间进入睡眠的系统。  
- 电池供电且需要对用户操作立即响应的遥控器或可穿戴设备等部分功能。

---

## 示例电路图

为了可视化 LightSleep 的运行，我们在 ESP32 上连接了一个红色 LED。

以下电路图中，GPIO23 输出信号用于控制 LED。  
当 GPIO 输出为 HIGH 时，LED 点亮。这是一个简单的 **推挽式（在电源与 GND 间连接负载）结构**。

```text
ESP32
GPIO23 o────┐
            │ 
         [330Ω]（电阻）
            │  
           |>| （红色 LED）
            │
           GND
```
- `|>|` 表示红色 LED（上方为正极，下方为负极）。  
- GPIO23 为 `HIGH` 时，电流流向 GND，LED 点亮。  
- GPIO23 为 `LOW` 时，无电流流动，LED 熄灭。

## 示例程序（C 语言）

马上编写程序，体验 LightSleep 吧。

### 项目结构

下面是 ESP32 LightSleep 功能项目的目录结构（VSCode + ESP-IDF 扩展）：
```text
esp32_light_sleep/
├── CMakeLists.txt
├── sdkconfig.defaults
├── main/
│   ├── CMakeLists.txt
│   └── main.c
```
- `CMakeLists.txt`：项目总体构建设置  
- `sdkconfig.defaults`：初始 Kconfig 设置（含省电配置）  
- `main/`：应用主体  
  - `main.c`：GPIO 与 LightSleep 控制的主代码  
  - `CMakeLists.txt`：将 `main.c` 注册为构建目标

如有需要，可添加 `components/` 目录或 `Kconfig` 进行扩展。

### 定义文件

`sdkconfig.defaults` 内容如下：
```ini
CONFIG_PM_ENABLE=y
CONFIG_PM_DFS_INIT_AUTO=y
CONFIG_PM_LIGHTSLEEP_RTC_OSC_CAL_INTERVAL=1
```
- `CONFIG_PM_ENABLE`：启用电源管理功能。  
- `CONFIG_PM_DFS_INIT_AUTO`：自动初始化频率调节。  
- `CONFIG_PM_LIGHTSLEEP_RTC_OSC_CAL_INTERVAL`：设置 RTC 时钟校准间隔（每 1 秒）。

CMakeLists.txt 内容可参考[此处](/blogs/2025/05/03/esp-idf-vsc-extension-2/)的详细说明，此处略去。

`CMakeLists.txt`
```cmake
cmake_minimum_required(VERSION 3.5)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(esp32_light_sleep)
```

`main/CMakeLists.txt`
```cmake
idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS ".")
```

### 程序文件

主程序如下所示。

`main/main.c`
```c
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_sleep.h"
#include "esp_log.h"
#include "esp_rom_gpio.h"

#define TAG "LightSleep"

#define WAKEUP_GPIO GPIO_NUM_0        // BOOT按钮
#define LED_GPIO    GPIO_NUM_23       // LED 引脚

void configure_gpio()
{
    // LED 设置
    esp_rom_gpio_pad_select_gpio(LED_GPIO);
    gpio_set_direction(LED_GPIO, GPIO_MODE_OUTPUT);

    // 唤醒引脚设置
    esp_rom_gpio_pad_select_gpio(WAKEUP_GPIO);
    gpio_set_direction(WAKEUP_GPIO, GPIO_MODE_INPUT);
    gpio_pulldown_en(WAKEUP_GPIO);  // 为了稳定性
    gpio_pullup_dis(WAKEUP_GPIO);
}

void enter_light_sleep()
{
    ESP_LOGI(TAG, "设置：GPIO %d 的 LOW 电平唤醒", WAKEUP_GPIO);
    ESP_ERROR_CHECK(esp_sleep_enable_gpio_wakeup());
    gpio_wakeup_enable(WAKEUP_GPIO, GPIO_INTR_LOW_LEVEL);

    ESP_LOGI(TAG, "进入 LightSleep。请按下 BOOT 按钮。");
    gpio_set_level(LED_GPIO, 0);  // 熄灭 LED

    // 进入 LightSleep
    ESP_ERROR_CHECK(esp_light_sleep_start());
}

void app_main(void)
{
    configure_gpio();

    while (1) {
        enter_light_sleep();

        // 唤醒后的处理
        ESP_LOGI(TAG, "已唤醒！");
        gpio_set_level(LED_GPIO, 1);  // 点亮 LED

        // 保持运行状态 5 秒
        vTaskDelay(pdMS_TO_TICKS(5000));
    }
}
```

## 程序解说

我们将 LED 控制引脚设为 23 号。  
GPIO0 通常连接到 ESP32 开发板上的 **BOOT 按钮**。  
按下 BOOT 按钮时，GPIO0 会被拉为 **LOW**。  
本项目以该 LOW 信号为触发，从 LightSleep 中唤醒。

下面详细解说各函数。

### GPIO 设置（`configure_gpio`）

配置 `LED_GPIO` 与 `WAKEUP_GPIO` 的引脚模式。

```c
esp_rom_gpio_pad_select_gpio(LED_GPIO);
gpio_set_direction(LED_GPIO, GPIO_MODE_OUTPUT);
```
设置 LED 引脚。  
- `esp_rom_gpio_pad_select_gpio()`  
  → 将引脚切换为 GPIO 功能（从其他外设功能切换）。  
- `gpio_set_direction(..., GPIO_MODE_OUTPUT)`  
  → 设置为输出，用于点亮/熄灭 LED。

```c
esp_rom_gpio_pad_select_gpio(WAKEUP_GPIO);
gpio_set_direction(WAKEUP_GPIO, GPIO_MODE_INPUT);
gpio_pulldown_en(WAKEUP_GPIO);
gpio_pullup_dis(WAKEUP_GPIO);
```
设置唤醒引脚。  
- `esp_rom_gpio_pad_select_gpio()`  
  → 切换为 GPIO 功能。  
- `gpio_set_direction(..., GPIO_MODE_INPUT)`  
  → 设置为输入模式，以检测外部信号（按钮按下）。  
- `gpio_pulldown_en()`  
  → 启用下拉电阻。当按钮未按下时保持 LOW，防止噪声或浮空。  
- `gpio_pullup_dis()`  
  → 禁用上拉电阻。通常同一引脚不同时使用上拉和下拉。

### 睡眠切换与唤醒处理（`enter_light_sleep`）

此函数配置 GPIO 唤醒条件，并安全地进入 LightSleep。  
通过 GPIO 的 LOW 信号（BOOT 按钮）唤醒，实现与用户交互的睡眠控制。

```c
ESP_ERROR_CHECK(esp_sleep_enable_gpio_wakeup());
gpio_wakeup_enable(WAKEUP_GPIO, GPIO_INTR_LOW_LEVEL);
```
- `esp_sleep_enable_gpio_wakeup()`  
  → 启用 GPIO 唤醒功能（必须在调用前配置）。  
- `gpio_wakeup_enable(..., GPIO_INTR_LOW_LEVEL)`  
  → 配置在指定引脚（BOOT 按钮）检测到 **LOW 水平** 时唤醒。

```c
gpio_set_level(LED_GPIO, 0);  // 熄灭 LED
```
- 睡眠期间关闭 LED，避免多余功耗。

```c
ESP_ERROR_CHECK(esp_light_sleep_start());
```
- 调用此函数后，ESP32 进入 LightSleep 模式。  
  直到检测到唤醒触发（本例为 GPIO0 的 LOW）前会阻塞。  
  唤醒后函数返回，后续处理继续在 `app_main()` 中执行。

### 主处理流程（`app_main`）

```c
configure_gpio();
```
- 程序启动时进行 GPIO（LED、BOOT 按钮）初始化。  
- 完成后即可控制 LED 与检测唤醒。

```c
enter_light_sleep();
```
- 配置 GPIO 唤醒条件，并在 LED 熄灭的状态下进入 LightSleep。  
- 等待 BOOT 按钮按下后唤醒，该函数内部会阻塞，直至唤醒。

```c
gpio_set_level(LED_GPIO, 1);  // 点亮 LED
```
- 唤醒后点亮 LED，以视觉方式表示“正在运行”。

```c
vTaskDelay(pdMS_TO_TICKS(5000));
```
- 调用 FreeRTOS 的任务延迟函数，等待 5 秒并让出 CPU 时间给其他任务。

## 功耗对比

我们在该电路上测试了活动模式和 LightSleep 模式下的功耗。

结果如下：  
- 活动模式： 72 mW  
- LightSleep 模式： **13 mW**

※活动模式下 LED 点亮会消耗较多电力，以上数据仅供参考。

活动模式  
![](https://gyazo.com/731d5849c4066def082b157df18c4f91.png)

LightSleep 模式  
![](https://gyazo.com/cfbe9ba3d46e70e1f9e9b65d16ad05a9.png)

※图片中不易分辨，活动模式下 LED 是点亮状态。

相比之前使用 DeepSleep 时的功耗有所增加，但仍能显著节电。

## 应用示例

LightSleep 功能适用于以下场景：  
- 按钮或传感器输入等待时以最低功耗待机  
- 需要短时间响应的交互设备（如触摸屏设备）  
- 需要对外部事件立即反应的传感器终端

## 注意事项

使用 LightSleep 时 UART 通信会中断，查看串口日志时请注意输出时机。  
GPIO 中断的条件设置（低电平或高电平）取决于所用开发板的实现。

## 总结

本文介绍了如何利用 ESP32 的 **LightSleep 功能** 实现兼具省电和高响应性的应用。  
虽然功耗高于 DeepSleep，但对于需要对外部事件即时恢复的场景是最优选择。  
今后我还计划探讨 **LightSleep 与 Wi-Fi 通信的结合** 以及 **组合多种唤醒条件的高级省电设计**。

[我们汇总了有关 IoT 的教程和实用技巧。](/iot/)

希望能对 IoT 的应用提供参考。

<style>
img {
    border: 1px gray solid;
}
</style>
