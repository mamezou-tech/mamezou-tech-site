---
title: 'Trying Out IoT (Part 15: Challenging Long Battery Life with ESP32 Deep Sleep)'
author: shuichi-takatsu
date: 2024-02-24T00:00:00.000Z
tags:
  - esp32
  - deepsleep
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/iot/internet-of-things-15/).
:::



In the [previous article](/iot/internet-of-things-14/), we introduced the OLED display "SSD1306".  
This time, we would like to use the "DeepSleep" function, which can be said to be essential for long battery operation of the IoT device "ESP32".  

## ESP32 Consumes Surprisingly Much Power

ESP32 is a super bargain microcontroller that is very inexpensive yet capable of using Wi-Fi and Bluetooth.  
We introduced ESP32 in a [previous article](/iot/internet-of-things-02/).  

The size of the development board is about that of a matchbox (though we don't see matchboxes much these days), making it very convenient for use in IoT devices.

Photo of ESP32 development board  
![](https://gyazo.com/9aa1567edbd54b03d89d84fdb60869ed.png)

With its affordability and compact size, it would be ideal for outdoor or confined space operations. However, power supply becomes a bottleneck.  
If you consider operating it stably for about a month with batteries, you need to significantly reduce the power consumption that is constantly being used.

If you're using ESP32, you'll want to use its features such as Wi-Fi and Bluetooth.  
However, using wireless functions consumes more than 100mA of current.  
Continuous operation using wireless functions is quite difficult.  
Moreover, even without using power-hungry wireless functions like Wi-Fi or Bluetooth, just powering on the ESP32 (even in a programmatically sleep state) constantly consumes tens of mA of power.  

Therefore, when using ESP32 in places where stable power supply from outlets and such is not available, it's important to reduce the parts that are always operating and save as much power as possible.

## Power Measurement During Temperature and Humidity Measurement

We assembled a device on a breadboard that only measures temperature and humidity.  
To check the battery voltage, the battery voltage was divided by a resistor and input to pin 39.  
(It would be more energy-efficient to measure the voltage only during temperature and humidity measurement using a switch circuit such as a MOSFET, but we'll skip that for now.)

For the temperature and humidity sensor, we will use "DHT11" which we used in a [previous article](/iot/internet-of-things-13/).  

The assembled program is as follows.  

```cpp
#include <Arduino.h>
#include "DHT.h"

#define uS_TO_S_FACTOR 1000000 // Conversion factor for micro seconds to seconds
#define TIME_TO_SLEEP 5       // Measurement cycle (seconds)

#define BATTERY 39 // Pin to measure battery voltage

#define DHTPIN 23
#define DHTTYPE DHT11 // DHT 11

DHT dht(DHTPIN, DHTTYPE);

void setup()
{
  Serial.begin(115200);
  while (!Serial)
    ;

  dht.begin();  // Initialize DHT

  pinMode(BATTERY, INPUT); // Set battery voltage measurement pin to INPUT mode
}

void loop()
{
  unsigned long starttime = micros();

  float temp = dht.readTemperature();
  float humi = dht.readHumidity();
  float vbat = (analogRead(BATTERY) / 4095.0) * 3.6 * 2.0;
  Serial.printf("temp: %.2f, humi: %.2f, vbat: %.1f\r\n", temp, humi, vbat);

  // Calculate the time to sleep (in microseconds)
  uint64_t sleeptime = TIME_TO_SLEEP * uS_TO_S_FACTOR - (micros() - starttime);
  Serial.printf("sleep: %.2f\r\n", (double)sleeptime / uS_TO_S_FACTOR);
  delayMicroseconds(sleeptime); // Transition to Sleep
}
```

It simply measures the temperature, humidity, and battery voltage every 5 seconds and outputs them to the serial.  
After measuring data from DHT11, it simply "Sleeps".

Let's try running it. (Power is supplied from a stabilized power supply unit.)  

![](https://gyazo.com/c5cac29e6ee3429c11f4c8c7c61f3a14.png)  

The power consumption during Sleep was 72mW.  
The current consumption is 22mA. Assuming a single AA battery has a capacity of 2000mAh, it calculates to last less than 100 hours.  

## Using DeepSleep

Now, let's try using the "DeepSleep" function, which is the topic of this time.  

DeepSleep is a mode of operation that stops more functions than normal Sleep to reduce power consumption.  
There are various ways to return from DeepSleep state, but this time we will use a simple method of returning after a specified time has elapsed.  
For various methods of returning from DeepSleep state, please refer to [this page](https://lang-ship.com/blog/work/esp32-deep-sleep/) and others.

We modify the previous program to use "DeepSleep".

```cpp
#include <Arduino.h>
#include "DHT.h"

#define uS_TO_S_FACTOR 1000000 // Conversion factor for micro seconds to seconds
#define TIME_TO_SLEEP 5       // Measurement cycle (seconds)

#define BATTERY 39 // Pin to measure battery voltage

#define DHTPIN 23
#define DHTTYPE DHT11 // DHT 11

DHT dht(DHTPIN, DHTTYPE);

void setup()
{
  unsigned long starttime = micros();
  Serial.begin(115200);
  while (!Serial)
    ;

  dht.begin();  // Initialize DHT

  pinMode(BATTERY, INPUT); // Set battery voltage measurement pin to INPUT mode

  float temp = dht.readTemperature();
  float humi = dht.readHumidity();
  float vbat = (analogRead(BATTERY) / 4095.0) * 3.6 * 2.0;
  Serial.printf("temp: %.2f, humi: %.2f, vbat: %.1f\r\n", temp, humi, vbat);

  // Calculate the time for Deep Sleep (in microseconds)
  uint64_t sleeptime = TIME_TO_SLEEP * uS_TO_S_FACTOR - (micros() - starttime);
  Serial.printf("deep sleep: %.2f\r\n", (double)sleeptime / uS_TO_S_FACTOR);
  esp_deep_sleep(sleeptime); // Transition to DeepSleep mode
}

void loop()
{
}
```

Execute the following command to enter "DeepSleep state" for the specified time.
```cpp
  esp_deep_sleep(sleeptime);
```
At this point, you might wonder.  
The DeepSleep command is used inside the `setup function`.  
I also found it strange at first.  
Upon reading more about DeepSleep, it turns out that unlike normal Sleep, you cannot return to the command line after executing DeepSleep.   
Returning from DeepSleep is considered a "reset".  

Let's run it and check the log.
```txt
rst:0x5 (DEEPSLEEP_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
configsip: 0, SPIWP:0xee
clk_drv:0x00,q_drv:0x00,d_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00
mode:DIO, clock div:2
load:0x3fff0030,len:1184
load:0x40078000,len:13232
load:0x40080400,len:3028
entry 0x400805e4
temp: 25.30, humi: 43.00, vbat: 3.3
deep sleep: 4.97
```

The log shows `DEEPSLEEP_RESET`.  
It indicates that it has returned from DeepSleep state and restarted.  

Let's check the power consumption.  

![](https://gyazo.com/d2d14f945980e761212e212a6a6ca43f.png)

The power consumption during DeepSleep was an astonishing 3mW. The current consumption is 1mA.  
The chip of ESP32 itself probably consumes even less power, but other components on the development board must be consuming a not insignificant amount of power.  

When measuring the current consumption during DeepSleep with the "LOLIN D32" development board, which has a battery connection terminal that we used before, the value was below 1mA.  
(The measuring instrument's display digits were insufficient, showing 0mA.)  

By using high-power-consuming functions like Wi-Fi or Bluetooth for a moment and keeping the device in "DeepSleep" for most of the time, it seems possible to operate ESP32 on battery for a considerably long time.  

## Data Retention

We have seen that DeepSleep dramatically reduces power consumption, but since ESP32 is reset, the program starts from the beginning.  
If there is data you want to retain after restart, you can use "RTC_DATA_ATTR" to retain data.  
The usage of "RTC_DATA_ATTR" is described in [the page introduced earlier](https://lang-ship.com/blog/work/esp32-deep-sleep/), so please refer to it.

## Operating with Two AA Batteries

We want to operate ESP32 on battery power.  
The operating voltage of ESP32 seems to be fine between 3.0V to 3.6V.  
The voltage of commonly sold lithium-ion batteries is 3.7V.  
This would damage the ESP32, so we will operate it at the minimum voltage of 3.0V (two AA batteries in series).  
(We considered using a step-down converter, but for now, we prioritized keeping it simple.)

When actually running it, it operates on voltages below 3.0V. (It became unstable from around 2.5V.)

We purchased a [battery box](https://www.amazon.co.jp/dp/B001TRXVQI/) and immediately tried operating it on battery power.

![](https://gyazo.com/81f6c10b80a3097807917530737c5187.png)

The power LED lights up faintly during DeepSleep, indicating that it is operating.  
(Ideally, turning off the LED would save more power, but we will not modify the development board.)

## Summary

This time, we tried the "DeepSleep" function, which is essential for battery operation of ESP32.  
It has a bit of a learning curve to use, but it's clear that it can save a significant amount of power.  
However, as it stands, we haven't been able to send the measured data anywhere, so we would like to report on methods for external data transmission on another occasion.

[We have compiled tutorials and practical techniques related to IoT.](/iot/)

We hope this will be helpful for your IoT applications.
