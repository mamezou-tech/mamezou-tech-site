---
title: >-
  Trying out IoT (Part 19: Challenging Low-Power Operation with the ESP32
  LightSleep Feature)
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

## Introduction

In [the previous article](/en/iot/internet-of-things-15/), we introduced how to achieve long-term battery operation by utilizing the ESP32 DeepSleep feature.  
This time, as a development of that, we will take on the **LightSleep** feature.

---

## Development Environment

The development environment is as follows.
- OS: Ubuntu 24.04 (WSL2)
- IDE: Visual Studio Code
- ESP-IDF extension "Espressif IDF": 1.10.0
- ESP-IDF version: **v5.4.1**
- Target: ESP32 development board (ESP-WROOM-32, etc.)

---

## ESP32 Operating Modes

ESP32 provides multiple power-saving modes depending on the operating state.

* Active Mode: Normal operation. All functions are available, but power consumption is highest.  
* Modem Sleep: A mode in which the Wi-Fi/Bluetooth modem power is turned off while the CPU continues to run. Use when you want to reduce power consumption while maintaining CPU processing.  
* **Light Sleep**: Keeps the CPU, RAM, and some peripherals in their current state while gating (stopping) or powering off clocks for most digital peripherals and the RF module. The CPU is paused, but RAM contents are retained, allowing very fast wake-up. It offers significant power savings over Active Mode while resuming processing faster than Deep Sleep.  
* Deep Sleep: Powers off the CPU, most RAM, and digital peripherals. Only the RTC controller and ULP coprocessor remain active. Power consumption is lowest, but after wake-up, the program starts from the reset sequence, requiring additional work to restore state.

---

## What is LightSleep

LightSleep mode is a low-power mode in which the ESP32 pauses the CPU and stops major clocks to reduce power consumption.  
The key point is that CPU registers and RAM contents are retained, so processing can resume from the state just before sleep upon wake-up.  
This eliminates the need to run the full startup sequence as in Deep Sleep, enabling very fast recovery.

### Advantages of LightSleep

* Fast wake-up: Recovery in the microsecond order is possible, making it suitable for applications requiring quick response to events.  
* State retention: RAM contents and CPU context are preserved, so you can use variables from before sleep without reinitialization.  
* Various wake-up sources: GPIO, timer, UART, Wi-Fi, Bluetooth LE, touch pad, and more can trigger wake-up.  
* Moderate power savings: Significant reduction in power consumption compared to Active Mode.

### Disadvantages and Considerations of LightSleep

* Higher power consumption than Deep Sleep: Deep Sleep is preferable for ultra-low-power applications.  
* Peripheral states: Some peripherals may still draw power during LightSleep, so overall system consumption depends on external circuitry as well.

## Comparison with DeepSleep

The comparison table with [DeepSleep](/en/iot/internet-of-things-15/) used previously is as follows.  

| Mode        | Power Consumption         | Wake-up Speed                 | Memory Retention | External Interrupt Support |
|-------------|---------------------------|-------------------------------|------------------|----------------------------|
| LightSleep  | Moderate                  | Very fast                     | Yes              | Yes                        |
| DeepSleep   | Very low                  | A few ms to several hundred ms | No               | Yes (GPIO/Timer)           |

LightSleep is suitable for applications that require a balance of power savings and quick responsiveness, such as:  
- Devices that normally sleep and immediately start processing when a sensor value changes or user input is detected.  
- Systems that perform short data processing or communication periodically and sleep the rest of the time.  
- Remote controls or wearable devices that are battery-powered yet require instant response to user operations.

---

## Sample Circuit Diagram

We created a circuit that connects a red LED to the ESP32 so that you can visually confirm LightSleep operation.

The following circuit lights the LED using the signal output from GPIO23. When the GPIO output is HIGH, the LED lights up. This is a simple **push-pull configuration (connecting the load between VCC and GND)**.

```text
ESP32
GPIO23 o────┐
            │
         [330Ω] (resistor)
            │
           |>| (red LED)
            │
           GND
```

- `|>|` represents the red LED (anode at the top, cathode at the bottom).  
- When GPIO23 is `HIGH`, current flows to GND and the LED lights up.  
- When GPIO23 is `LOW`, no current flows and the LED turns off.

## Sample Program (C Language)

Let’s go ahead and create a program to experience LightSleep.

### Project Structure

Below is the directory structure of the ESP32 LightSleep feature project (VSCode + ESP-IDF extension).

```text
esp32_light_sleep/
├── CMakeLists.txt
├── sdkconfig.defaults
├── main/
│   ├── CMakeLists.txt
│   └── main.c
```

- `CMakeLists.txt`: Build settings for the entire project  
- `sdkconfig.defaults`: Default Kconfig settings (including power management settings)  
- `main/`: Application source  
  - `main.c`: Main code describing GPIO and LightSleep control  
  - `CMakeLists.txt`: Registers `main.c` as a build target  

You can add and extend with directories such as `components/` or `Kconfig` as needed.

### Configuration File

The `sdkconfig.defaults` definitions are shown below.

```ini
CONFIG_PM_ENABLE=y
CONFIG_PM_DFS_INIT_AUTO=y
CONFIG_PM_LIGHTSLEEP_RTC_OSC_CAL_INTERVAL=1
```

- `CONFIG_PM_ENABLE`: Enables the power management feature.  
- `DFS_INIT_AUTO`: Automatically initialize frequency scaling.  
- `RTC_OSC_CAL_INTERVAL`: Sets the RTC clock calibration interval (every 1 second).

Regarding CMakeLists.txt, only the contents are shown here; a detailed explanation is provided [here](/en/blogs/2025/05/03/esp-idf-vsc-extension-2/), so it is omitted here.

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

### Program File

The main program is shown below.

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

#define WAKEUP_GPIO GPIO_NUM_0        // BOOT button
#define LED_GPIO    GPIO_NUM_23       // LED pin

void configure_gpio()
{
    // LED configuration
    esp_rom_gpio_pad_select_gpio(LED_GPIO);
    gpio_set_direction(LED_GPIO, GPIO_MODE_OUTPUT);

    // Wakeup pin configuration
    esp_rom_gpio_pad_select_gpio(WAKEUP_GPIO);
    gpio_set_direction(WAKEUP_GPIO, GPIO_MODE_INPUT);
    gpio_pulldown_en(WAKEUP_GPIO);  // For stabilization
    gpio_pullup_dis(WAKEUP_GPIO);
}

void enter_light_sleep()
{
    ESP_LOGI(TAG, "設定: GPIO %d の LOW レベルで復帰", WAKEUP_GPIO);
    ESP_ERROR_CHECK(esp_sleep_enable_gpio_wakeup());
    gpio_wakeup_enable(WAKEUP_GPIO, GPIO_INTR_LOW_LEVEL);

    ESP_LOGI(TAG, "LightSleep に入ります。BOOTボタンを押してください。");
    gpio_set_level(LED_GPIO, 0);  // LED off

    // Enter LightSleep
    ESP_ERROR_CHECK(esp_light_sleep_start());
}

void app_main(void)
{
    configure_gpio();

    while (1) {
        enter_light_sleep();

        // Post-wake processing
        ESP_LOGI(TAG, "復帰しました！");
        gpio_set_level(LED_GPIO, 1);  // Turn on LED

        // Keep the system active for 5 seconds
        vTaskDelay(pdMS_TO_TICKS(5000));
    }
}
```

## Program Explanation

Pin 23 was used as the GPIO for LED lighting.  
GPIO 0 is usually connected to the **BOOT button** on the ESP32 development board.  
When the BOOT button is pressed, GPIO0 becomes **LOW**.  
In this project, this LOW is used as the trigger to wake up from LightSleep.

The details of each function are explained below.

### GPIO Configuration (`configure_gpio`)

Set the mode of the `LED_GPIO` and `WAKEUP_GPIO` GPIO pins.

```c
esp_rom_gpio_pad_select_gpio(LED_GPIO);
gpio_set_direction(LED_GPIO, GPIO_MODE_OUTPUT);
```
Configures the `LED_GPIO` pin.  
- `esp_rom_gpio_pad_select_gpio()`: Configure the pin for use as GPIO (switching from other peripheral functions).  
- `gpio_set_direction(..., GPIO_MODE_OUTPUT)`: Set the pin direction to output. Used to turn the LED on and off.

```c
esp_rom_gpio_pad_select_gpio(WAKEUP_GPIO);
gpio_set_direction(WAKEUP_GPIO, GPIO_MODE_INPUT);
gpio_pulldown_en(WAKEUP_GPIO);
gpio_pullup_dis(WAKEUP_GPIO);
```
Configures the `WAKEUP_GPIO` pin.  
- `esp_rom_gpio_pad_select_gpio()`: Configure the pin for use as GPIO (switching from other peripheral functions).  
- `gpio_set_direction(..., GPIO_MODE_INPUT)`: Set the pin to input mode to detect external signals (button presses).  
- `gpio_pulldown_en()`: Enable the pull-down resistor. Keeps the pin LOW when the button is not pressed, preventing noise and floating.  
- `gpio_pullup_dis()`: Disable the pull-up resistor. Pull-up and pull-down resistors should not be used simultaneously.

### Sleep Transition and Wake-up Handling (`enter_light_sleep`)

This function configures the wake-up by GPIO and safely enters LightSleep. Because it wakes up on a LOW signal from the GPIO (when the BOOT button is pressed), it allows sleep control linked to user interaction.

```c
ESP_ERROR_CHECK(esp_sleep_enable_gpio_wakeup());
gpio_wakeup_enable(WAKEUP_GPIO, GPIO_INTR_LOW_LEVEL);
```
- `esp_sleep_enable_gpio_wakeup()`: Enable wake-up from sleep using GPIO (this API call is required beforehand).  
- `gpio_wakeup_enable(..., GPIO_INTR_LOW_LEVEL)`: Configure to wake up when a **LOW level** signal is detected on the specified pin (BOOT button).

```c
gpio_set_level(LED_GPIO, 0);  // LED off
```
- Turn off the LED to avoid unnecessary power consumption during sleep.

```c
ESP_ERROR_CHECK(esp_light_sleep_start());
```
- This call puts the ESP32 into LightSleep mode. Processing is blocked until the wake-up trigger (in this case, LOW on GPIO0) is detected. After wake-up, this function returns and processing in `app_main()` resumes.

### Main Processing (`app_main`)

```c
configure_gpio();
```
- At the start of the application, set up the GPIO (LED and BOOT button). This initialization allows control of the LED and detection of sleep wake-up.

```c
enter_light_sleep();
```
- Set the GPIO wake-up condition and enter LightSleep with the LED off. The function blocks until the BOOT button is pressed to wake up.

```c
gpio_set_level(LED_GPIO, 1);  // Turn on LED
```
- Turn on the LED to visually indicate that the system is active.

```c
vTaskDelay(pdMS_TO_TICKS(5000));
```
- Wait for 5 seconds using FreeRTOS’s task delay function, allowing other tasks to run.

## Power Consumption Comparison

We compared the power consumption between Active Mode and LightSleep Mode using the circuit created in this article.

The results were as follows:
- Active: 72 mW  
- LightSleep: **13 mW**

Note: The power consumption during Active Mode may be significantly influenced by the LED being lit, so please use the values as a reference only.

Active mode  
![](https://gyazo.com/731d5849c4066def082b157df18c4f91.png)

LightSleep mode  
![](https://gyazo.com/cfbe9ba3d46e70e1f9e9b65d16ad05a9.png)

Note: It is hard to see in the images, but the LED is lit in Active Mode.

Although it consumes significantly more power than when using DeepSleep previously, you can still see that it achieves substantial power savings.

## Example Applications

The LightSleep feature is suitable for the following use cases:
- Waiting with minimal power consumption while monitoring for button or sensor inputs  
- Interactive devices that respond in a short time (e.g., touch panel devices)  
- Sensor terminals that need to respond immediately to external events

## Precautions

When using LightSleep, UART communication is interrupted, so you need to pay attention to output timing when checking serial logs.  
GPIO interrupt condition settings (Low level or High level) depend on the board’s implementation.

## Summary

This time, we introduced how to use the ESP32 **LightSleep feature** to achieve power-efficient and highly responsive applications. Although it consumes more power than DeepSleep, it is ideal for applications that require immediate wake-up in response to external events. In the future, I would like to explore **integration of LightSleep with Wi-Fi communication** and **advanced power-saving designs that combine multiple wake-up conditions**.

[I have compiled tutorials and practical techniques on IoT.](/iot/)

I hope this will be useful for leveraging IoT.

<style>
img {
    border: 1px gray solid;
}
</style>
