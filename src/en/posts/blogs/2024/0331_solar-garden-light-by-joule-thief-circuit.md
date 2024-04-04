---
title: Trying out the Solar LED Driver "YX8018"
author: shuichi-takatsu
date: 2024-03-31T00:00:00.000Z
tags:
  - joulethief
  - circuit
  - led
  - solar
  - garden
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/03/31/solar-garden-light-by-joule-thief-circuit/).
:::



In the [previous article](/blogs/2024/03/21/light-up-led-by-joule-thief-circuit/), I tried lighting a white LED with just one dry cell using a Joule Thief circuit.  
After that, while researching more about the "Joule Thief circuit," I discovered a chip called the "Solar LED Driver 'YX8018'."  
It seems to have been around for quite some time, and [this site](https://github.com/mcauser/YX8018-solar-led-driver) has the circuit diagram and datasheet.

This time, I investigated a solar garden light using this "YX8018," and I would like to share my findings in this article.

## Solar Garden Lights Sold at 100 Yen Stores

This time, I bought a "2WAY Solar Accent Light" for 110 yen (including tax) at a nearby 100 yen store (Can Do).  
The instruction manual was folded inside the light part.  

The part to be stuck into planters or the ground is assembled as shown below.  
For a 100 yen product, it is quite well made.  

I disassembled the parts as far as possible without using tools.  

Turning over the head part where the solar panel is attached, I found a small LED and an ON/OFF switch.  
It seems necessary to switch it ON to operate the solar panel and LED.  

## Disassembling the Part with the Electronic Circuit

Despite the manufacturer's warning "Do not replace batteries or modify," I wanted to know what's inside, so I disassembled it.  
It was easy to open the lid with a regular Phillips screwdriver.  

Inside, I saw a nickel-metal hydride rechargeable battery, size AAA.  
The capacity is written as 600mAh, and the voltage is 1.2V. The capacity seems a bit low for a nickel-metal hydride battery, but perhaps we should be grateful it's available at a 100 yen store. (Recently, rechargeable batteries have become rare in 100 yen stores)

The battery box is quite simple.  
To keep the whole thing at 100 yen, it has to be this simple.  
(I'm just worried if this case is waterproof)

Below the battery, there's a circuit board.  
The board is fixed to the case with just one Phillips screw, so I disassembled it further.  

The circuit board was simple, with only the YX8018B chip, an inductor, LED, and switch mounted.  
The inductor is 330μH, and the LED is a warm white color.  
Here, the "YX8018" chip, the star of this article, makes its appearance.  

Oops? There was some solder debris on the LED pins.  
Such debris could fall off and potentially short the circuit, so it's best to remove it.  
(It actually fell off with just a light touch)  

## Checking the YX8018 Datasheet

From the site mentioned earlier, I checked the YX8018 datasheet.  
Ignoring the typo in the model number at the beginning, this chip seems to be specialized for use with solar panels and rechargeable batteries.  
To construct the circuit, it seems all you need besides the LED and solar panel is an inductor.  
(Quoted from the [datasheet](https://github.com/mcauser/YX8018-solar-led-driver/blob/master/datasheets/YX8018-datasheet-2.pdf))  

The datasheet also includes a circuit example.  
The circuit diagram of this board is probably similar to the one below.  

The current flowing through the LED can be adjusted by changing the value of the inductor.  
The relationship between the inductor value and the current flow is as follows.  

I removed the components from the board.  
Left: Inductor  
Center: LED (warm white)  
Right: YX8018  

Checking the inductor value with a checker, it was about 390μH. (This deviates quite a bit from the value written on the package, but let's not worry about it for now)  
Considering the inductor value and the current flow, the current through the LED should be about 5.0mA.  
If the rechargeable battery (600mAh) is fully charged, it should light up for a long time. (Assuming the battery capacity is not exaggerated)

## Checking the Solar Panel

I also checked the solar panel.  
The cable extending from the panel seems to be well sealed.  
(It looks like it's solidified with hot glue)  
However, I haven't conducted a submersion test, so I can't confirm its effectiveness.  

Placing the solar panel under the fluorescent light in my room, I measured the generated voltage.  
About 1.3V was confirmed.  
This seems about right for charging a 1.2V rechargeable battery.  

## Checking LED Lighting

I arranged the removed components on a breadboard and tried lighting the LED.  

Applying voltage from a stabilized power supply, the LED lit up.  

The LED lit up when the applied voltage was above 0.9V and turned off when it was below 0.8V.  
Changing the applied voltage did not gradually brighten or dim the LED like the Joule Thief circuit I made before; it turned on/off like a switch.  

## Changing the LED from Warm White to White

Personally, I don't like warm white LEDs, so I decided to replace it with a regular white LED.  

I checked the current flow with a stabilized power supply.  
When applying 0.9V, the current was about 4mA.  

I reassembled the components onto the original board.  
Only the LED was changed from warm white to white.  

Well, it looks good enough. (Just self-satisfaction)

## Checking the Boosted Voltage Waveform

A voltage of 0.9V is not enough to make a white LED emit light.  
(Normally, about 3.0V is required)  
I checked the waveform of the voltage applied to the LED.  

It seems only about 2.5V is applied, but it seems to secure the minimum voltage required for emission. (Depending on the LED, it probably won't light up below 2.4V)

## Surprisingly Beautiful Light

I placed the original warm white LED and the newly changed white LED side by side.  
They light up quite beautifully.  
(The warm white one isn't bad either)  

## Summary

The 100 yen store is amazing.  
For 110 yen (including tax), you get a AAA nickel-metal hydride rechargeable battery (600mAh), an inductor, YX8018, solar panel, warm white LED, and frame!
In this case, the current flowing through the LED is about 4mA, so the light output is very small, but if you change the inductor to about 70μH, the current flowing through the LED should increase to about 20mA, making it shine brighter (at the expense of faster battery consumption).  
As the manufacturer's warning says, "Do not replace batteries or modify," please remember that any modifications are at your own risk.  
(After all, it seems too wasteful to just throw it away when the battery life ends)
