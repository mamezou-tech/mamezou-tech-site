---
title: >-
  Trying out IoT (Part 19: Challenging Power-Saving Operation with ESP32's
  LightSleep Function)
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

In [the previous article](/iot/internet-of-things-15/), we introduced how to utilize the ESP32’s DeepSleep feature to achieve long-term battery operation.  
This time, as an extension of that, we’ll challenge the **LightSleep feature**.

LightSleep cannot reduce power consumption as much as DeepSleep, but it retains the system state and memory while allowing very quick wake-up. It’s suited for use cases where you want to respond rapidly to external input while conserving power.

In this article, we will explain how to leverage the ESP32’s LightSleep feature in a development environment using VSCode and ESP-IDF (Ver 5.4.1), along with concrete sample code.

---

## Development Environment

The development environment is as follows.
- OS: Ubuntu 24.04 (WSL2)
- IDE: Visual Studio Code
- ESP-IDF Extension "Espressif IDF": 1.10.0
- ESP-IDF Version: **v5.4.1**
- Target: ESP32 development board (ESP-WROOM-32, etc.)

---

## ESP32 Operating Modes

The ESP32 offers multiple power-saving modes, depending on its operating mode.

* Active Mode: Normal operation. All functions are available, but power consumption is highest.
* Modem Sleep: A mode where the Wi-Fi/Bluetooth modem power is turned off while the CPU continues running. Used when you want to reduce power consumption while keeping CPU processing continuous.
* **Light Sleep**: Maintains the state of the CPU, RAM, and some peripherals, while gating (stopping) or cutting off power to many digital peripherals and RF modules. The CPU is paused, but RAM contents are retained, enabling very fast wake-up. It significantly reduces power consumption compared to Active Mode, while restarting processing faster than DeepSleep.
* Deep Sleep: Turns off power to the CPU, most of the RAM, and digital peripherals. Only the RTC (Real-Time Clock) controller and the ULP (Ultra-Low-Power) coprocessor can operate. Power consumption is lowest, but since the program starts from a reset sequence after wake-up, special measures are needed to restore state.

---

## What is LightSleep?

LightSleep mode is a power-saving mode where the ESP32 pauses the CPU and stops major clocks to reduce power consumption.  
The important point is that the CPU registers and RAM contents are retained, allowing processing to resume from the state just before sleep upon wake-up.  
As a result, there is no need to execute the entire boot sequence as with DeepSleep, enabling extremely fast wake-up.

### Benefits of LightSleep

* Fast wake-up: Wake-up on the order of microseconds is possible, making it suitable for applications requiring responsiveness to events.
* State retention: Since RAM contents and CPU context are retained, variables’ values before sleep can be used as is.
* Various wake-up sources: Can be woken up by a variety of sources, such as GPIO, timers, UART, Wi-Fi, Bluetooth LE, and touch pads.
* Moderate power savings: Significant power reduction can be expected compared to Active Mode.

### Drawbacks and Considerations of LightSleep

* Higher power consumption than Deep Sleep: For ultra-low-power applications, DeepSleep is more advantageous.
* Peripheral state: Some peripherals may still consume power during LightSleep, and overall system power consumption also depends on external circuitry.

## Comparison with DeepSleep

The comparison table with the previously used “[DeepSleep](/iot/internet-of-things-15/)” is shown below.

| Mode        | Power Consumption             | Wake-Up Speed                   | Memory Retention | External Interrupt Support |
|-------------|-------------------------------|---------------------------------|------------------|----------------------------|
| LightSleep  | Medium                        | Very Fast                       | Yes              | Yes                        |
| DeepSleep   | Very Low                      | a few ms to a few hundred ms    | No               | Yes (GPIO/Timer)           |

LightSleep is suitable for applications that require moderate power savings and quick responsiveness, such as:
- Devices that normally stay asleep and immediately start processing when sensor values change or user input occurs.
- Systems that perform short bursts of data processing or communication periodically, and sleep during the rest of the time.
- Battery-powered remotes or wearable devices that require immediate response to user operations for certain functions.

---

## Sample Circuit Diagram

To visually confirm LightSleep operation, we created a circuit connecting a red LED to the ESP32.

The following circuit lights the LED with a signal output from GPIO23. It is a simple **push-pull configuration** (connecting the load between power and ground), where the LED lights when the GPIO output is HIGH.

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

- `|>|` represents the red LED (anode at top, cathode at bottom).
- When GPIO23 is `HIGH`, current flows to GND and the LED lights up.
- When GPIO23 is `LOW`, no current flows and the LED turns off.

## Sample Program (C Language)

Let’s quickly create the program and experience LightSleep.

### Project Structure

The directory structure of the ESP32 LightSleep feature project (VSCode + ESP-IDF extension) is shown below.

```text
esp32_light_sleep/
├── CMakeLists.txt
├── sdkconfig.defaults
├── main/
│   ├── CMakeLists.txt
│   └── main.c
```

- `CMakeLists.txt`: Build settings for the entire project
- `sdkconfig.defaults`: Initial Kconfig settings (including power management settings)
- `main/`: Application main body
  - `main.c`: Main code that describes GPIO and LightSleep control
  - `CMakeLists.txt`: Registers `main.c` as a build target

You can add `components/` directories or `Kconfig` files as needed for further expansion.

### Definition File

The definitions for `sdkconfig.defaults` are shown below.

```ini
CONFIG_PM_ENABLE=y
CONFIG_PM_DFS_INIT_AUTO=y
CONFIG_PM_LIGHTSLEEP_RTC_OSC_CAL_INTERVAL=1
```

- `CONFIG_PM_ENABLE`: Enable power management functionality.
- `DFS_INIT_AUTO`: Automatically initialize frequency scaling.
- `RTC_OSC_CAL_INTERVAL`: Set the RTC clock calibration interval (every 1 second).

The contents of CMakeLists.txt are listed below; detailed explanation can be found [here](/blogs/2025/05/03/esp-idf-vsc-extension-2/), so it is omitted here.

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

        // Post-wake-up processing
        ESP_LOGI(TAG, "復帰しました！");
        gpio_set_level(LED_GPIO, 1);  // LED on

        // Stay active for 5 seconds
        vTaskDelay(pdMS_TO_TICKS(5000));
    }
}
```

## Program Explanation

We used pin 23 for the GPIO that lights the LED.  
GPIO 0 is typically connected to the **BOOT button** on an ESP32 development board.  
When the BOOT button is pressed, GPIO0 goes **LOW**.  
In this project, this LOW signal is used as the trigger to wake up from LightSleep.

The details of each function are explained below.

### GPIO Configuration (`configure_gpio`)

Sets the mode for the `LED_GPIO` and `WAKEUP_GPIO` pins.

```c
esp_rom_gpio_pad_select_gpio(LED_GPIO);
gpio_set_direction(LED_GPIO, GPIO_MODE_OUTPUT);
```
Configures the `LED_GPIO` pin.  
- `esp_rom_gpio_pad_select_gpio()`  
  -> Sets the pin to be used as GPIO (switching from other peripheral functions).  
- `gpio_set_direction(..., GPIO_MODE_OUTPUT)`  
  -> Sets the pin direction to output, used to turn the LED on and off.

```c
esp_rom_gpio_pad_select_gpio(WAKEUP_GPIO);
gpio_set_direction(WAKEUP_GPIO, GPIO_MODE_INPUT);
gpio_pulldown_en(WAKEUP_GPIO);
gpio_pullup_dis(WAKEUP_GPIO);
```
Configures the `WAKEUP_GPIO` pin.  
- `esp_rom_gpio_pad_select_gpio()`  
  -> Sets the pin to be used as GPIO (switching from other peripheral functions).  
- `gpio_set_direction(..., GPIO_MODE_INPUT)`  
  -> Sets the pin to input mode, allowing detection of external signals (button presses).  
- `gpio_pulldown_en()`  
  -> Enables the pull-down resistor. Keeps the pin LOW when the button is not pressed, preventing noise or floating.  
- `gpio_pullup_dis()`  
  -> Disables the pull-up resistor. Pull-up and pull-down resistors are not used simultaneously.

### Sleep Transition and Wake-Up Handling (`enter_light_sleep`)

This function sets up wake-up via GPIO and safely enters LightSleep.  
Since wake-up occurs on a LOW signal from the GPIO (BOOT button press), you can coordinate sleep control with user interaction.

```c
ESP_ERROR_CHECK(esp_sleep_enable_gpio_wakeup());
gpio_wakeup_enable(WAKEUP_GPIO, GPIO_INTR_LOW_LEVEL);
```
- `esp_sleep_enable_gpio_wakeup()`  
  -> Enables wake-up from sleep using GPIO (this API call is required beforehand).  
- `gpio_wakeup_enable(..., GPIO_INTR_LOW_LEVEL)`  
  -> Configures the specified pin (BOOT button) to wake up on a **LOW level** signal.

```c
gpio_set_level(LED_GPIO, 0);  // LED off
```
- Turns off the LED to avoid unnecessary power consumption during sleep.

```c
ESP_ERROR_CHECK(esp_light_sleep_start());
```
- When this function is called, the ESP32 enters LightSleep mode.  
  The process is blocked until it detects the wake-up trigger (in this case, GPIO0 going LOW).  
  After wake-up, it returns from this function, and the subsequent processing in `app_main()` resumes.

### Main Processing (`app_main`)

```c
configure_gpio();
```
- At the start of the application, configure the GPIOs (LED and BOOT button).  
- Performing this initialization enables LED control and sleep wake-up detection.

```c
enter_light_sleep();
```
- Sets the GPIO wake-up condition and enters LightSleep with the LED turned off.  
- This function blocks until the BOOT button is pressed to wake up.

```c
gpio_set_level(LED_GPIO, 1);  // LED on
```
- Turns on the LED to visually indicate that the device is active.

```c
vTaskDelay(pdMS_TO_TICKS(5000));
```
- Uses FreeRTOS’s task delay function to wait for 5 seconds, including yielding CPU time to other tasks.

## Power Consumption Comparison

We compared the power consumption between Active Mode and LightSleep mode using the circuit we created.

The results were as follows:
- Active: 72 mW
- LightSleep: **13 mW**

*Note: The LED consumes a significant amount of power when active, so consider these power consumption values as approximate.*

Active Mode  
![](https://gyazo.com/731d5849c4066def082b157df18c4f91.png)

LightSleep  
![](https://gyazo.com/cfbe9ba3d46e70e1f9e9b65d16ad05a9.png)

*Note: It may be hard to see in the images, but the LED is lit during Active Mode.*

It consumes more power than when using DeepSleep previously, but it still achieves significant power savings.

## Application Examples

The LightSleep feature is suitable for the following applications:
- Waiting in minimal power consumption mode while waiting for button or sensor inputs
- Interactive devices that need to respond quickly (e.g., touch panel devices)
- Sensor terminals that need to respond immediately to external events

## Points to Note

When using LightSleep, UART communication is interrupted, so be careful of the output timing when checking serial logs.  
The GPIO interrupt trigger condition (low level or high level) depends on the board’s implementation.

## Conclusion

In this article, we introduced how to use the ESP32’s **LightSleep feature** to achieve power-efficient and high-responsive applications.  
Although it consumes more power than DeepSleep, it is ideal for applications that require immediate wake-up in response to external events.  
In the future, I would like to explore **integration of LightSleep with Wi-Fi communication** and **advanced power-saving designs that combine multiple wake-up conditions**.

[I have compiled tutorials and practical techniques related to IoT.](/iot/)  
I hope this will be helpful for your IoT implementations.

<style>
img {
    border: 1px gray solid;
}
</style>
