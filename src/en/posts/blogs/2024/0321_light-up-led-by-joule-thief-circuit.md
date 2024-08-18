---
title: Lighting a White LED with a Single Battery Using a Joule Thief Circuit
author: shuichi-takatsu
date: 2024-03-21T00:00:00.000Z
tags: [joulethief, circuit, led]
image: true
translate: true
---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/03/21/light-up-led-by-joule-thief-circuit/).
:::



This time, I'd like to try a small electronic project.  
The theme is "lighting a white LED with a single used battery."

## How much voltage does a single battery have?

Let's find out how much voltage a single battery has.  
Taking the commonly used AA alkaline battery as an example, the voltage at the start of use is usually about 1.5 volts.  
The voltage transitions relatively steadily, but gradually decreases as it is used.  
The rate of voltage decrease varies depending on the device and usage conditions, but generally, it is not a sudden decrease but a slow one.  
The voltage at the end of use is usually lower than the starting voltage, around 0.9 volts to 1.0 volt.  
This also varies depending on the environment and device used.

Upon investigation, there seems to be a standard for the end voltage of batteries, internationally established.  
For a typical AA alkaline battery, it is based on the International Electrotechnical Commission (IEC) 60086 standard, which sets the end voltage at 0.9 volts.

## How much voltage is needed to light an LED?

The voltage required to light an LED (Light Emitting Diode) varies depending on the type and color of the LED and the manufacturer, but the operating voltage for a typical LED is between 2 volts and 3.5 volts.

I looked into how much voltage (forward voltage: Vf) is needed for each color of LED.  
You would need to refer to the data sheet of each LED for details, but roughly it is as follows:

|Color|Forward Voltage (Vf)|
|---|---|
|Red, Orange, Yellow, Yellow-Green, Pure Green|About 1.8 to 2.2 volts|
|White, Warm White, Blue, Cyan|Around 3.2 volts|

According to the table above, it concludes that it is "impossible" to light a white LED with a single AA battery (below 1.5 volts).

## Joule Thief Circuit

In dollar stores, etc., you can find LED flashlights that light up with a single AA battery.  
According to the logic mentioned earlier, it should be impossible to light a white LED.  
Upon further research, I came across the term "Joule Thief circuit."

It seems that with a Joule Thief circuit, you can light a white LED even with a voltage of about 1.0 volt.  
Joule Thief is a play on the words "Jewel Thief."  
Rather than "thief," "extractor" might be more appropriate.

Searching the internet for "Joule Thief" leads to various sites, but based on the information [here](http://7ujm.net/micro/JT/JT.html), I assembled the following circuit.  
Here is the circuit diagram.  
![](https://gyazo.com/4b8583c35134d157b075465567da8a56.png)

Here is an image of the circuit assembled on a breadboard.  
![](https://gyazo.com/06d53a155e56d726923fe4a39f050a70.png)
The components were assembled with whatever was available, so the values of the resistors, capacitors, and coils (used two micro inductors) are quite arbitrary.  
The transistor used is C1815. (It's a standard transistor, and I had about 20 to 30 of them at home)

The main players in this circuit are the coil and the transistor.  
Since modifying the transistor is difficult, I tried various adjustments with the coil.

I had a toroidal core on hand, so I tried making a hand-wound coil.  
![](https://gyazo.com/f3973036bd23ee83abae62b37528a8a8.png)

I also added windings to a choke coil that was lying in the corner of my junk box.  
![](https://gyazo.com/94fb985603de57a57ac1a90833336401.png)

Despite the quite arbitrary values of each component, I was able to light a white LED with a voltage of about 1.0 volt in every assembly method.
The power consumption was 1.0 volt, 3 milliamperes (= 3 milliwatts) for the circuit using micro inductors.  
For the circuits using hand-wound coils and choke coils, it was 1.0 volt, 1 milliampere (= 1 milliwatt!).  
Significant power savings can be expected.  
![](https://gyazo.com/6b9a04771f932ef26de05e8073d0eb73.png)

## Why does the white LED light up?

However, why can a white LED be lit with an input voltage of about one battery in the first place?

The circuit assembled this time is an oscillating circuit, and in reality, the LED is flashing at high speed, but it appears to be lit to the human eye.  
Using the smartphone oscilloscope "Scoppy" introduced in the previous article "[Building an Oscilloscope with Raspberry Pi Pico and Android Smartphone](/blogs/2024/03/18/raspberry-pi-pico-to-oscilloscope/)," I checked the voltage waveform applied to the LED.  
![](https://gyazo.com/2f447e0a9610791f8d2ada5e5a6fde51.png)

The frequency is about 145kHz, with a duty cycle of about 50%, and a voltage of around 3 volts can be observed.  
This voltage is applied to the white LED, causing it to light (flash rapidly).

## Modifying an LED Lantern like Magic(?)

With a Joule Thief circuit, it seems possible to extract power to the limit from a used battery.  
Taking advantage of this, I decided to modify an LED lantern for emergency use that I had at home.  
(I think it was something I received when visiting an exhibition)  
![](https://gyazo.com/a9a57f29eed60ffb90352cdf80195bff.png)

This LED lantern required four AA batteries to light up, but batteries are precious during disasters, so I "magically" modified it to light up with just one AA battery.  

I implemented the circuit on a universal board (a cheap product bought from AliExpress).  
To fit the circuit board into the lantern, I changed the coil to a smaller 63μH one and the capacitor to a smaller 0.047μF one.  
(It was bright enough)

Then, I "forcefully" squeezed the circuit board into the space for three AA batteries.  
![](https://gyazo.com/70d9486e70f8fd7dc8a1bcd3ab296eeb.png)

This LED lantern, which had seven LEDs, lit up properly with just one AA battery.  
Using a stabilized power supply to measure the power consumption, it consumed about 1.0 volt, 8 milliamperes (= 8 milliwatts).  
![](https://gyazo.com/125271ab14707f1688056e612689df6c.png)

## Conclusion

Using a Joule Thief circuit, I was able to light a white LED with a single battery (actually, it flashes rapidly).  
Especially, since a used battery can still provide a voltage of around 1.0 volt, why not try reusing it in LED lights, etc.?

I hope the time when the LED lantern I created comes in handy never comes.
