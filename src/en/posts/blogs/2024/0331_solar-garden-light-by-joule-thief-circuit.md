---
title: Trying Out the Solar LED Driver "YX8018"
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



In the [previous post](/blogs/2024/03/21/light-up-led-by-joule-thief-circuit/), I tried lighting a white LED with a single battery using a Joule thief circuit.  
After that, while researching more about "Joule thief circuits," I discovered a chip called the "Solar LED Driver 'YX8018'."  
It seems to have been around for quite some time, and [this site](https://github.com/mcauser/YX8018-solar-led-driver) has circuit diagrams and datasheets.

This time, I decided to write an article about a solar garden light using this "YX8018".

## Solar Garden Lights Sold at 100 Yen Stores

This time, I purchased a "2WAY Solar Accent Light" for 110 yen (tax included) at a nearby 100 yen store (Can Do).  
![](https://gyazo.com/34a778b78acad1b14a65cb91e2e66629.png)

The instruction manual was folded inside the light part.  
![](https://gyazo.com/e147ee1099f424d2349513497abd0409.png)

The part that sticks into planters or the ground is assembled as shown below.  
I think it's quite well made for a 100 yen product.  
![](https://gyazo.com/63fa14124ceddd3b1690c90c01ec4a44.png)

I disassembled each part without using any tools as far as possible.  
![](https://gyazo.com/509a399abadf57fdf15bad8bd31cb6f5.png)

Turning over the head part where the solar panel is attached, I found a small LED and an ON/OFF switch.  
It seems necessary to turn the switch ON to operate the solar panel and LED.  
![](https://gyazo.com/61c9a347f5e7392eccd405d831cb36ab.png)

## Disassembling the Part with the Electronic Circuit

The manufacturer's warning says "Please do not replace the battery or modify the product," but I wanted to know what's inside, so I proceeded to disassemble it.  
It was easy to open the lid with a regular Phillips screwdriver.  
![](https://gyazo.com/59d4680cee82cdc6e3659954611e5a5b.png)

I could see a nickel-metal hydride rechargeable battery. It's size AAA.  
It's marked as 600mAh capacity and 1.2V. The capacity feels somewhat low for a nickel-metal hydride battery, but perhaps we should be grateful it's available at a 100 yen store at all. (Lately, it's become rare to see rechargeable batteries at 100 yen stores.)

The battery box is quite simple.  
It has to be this simple to produce the whole thing for around 100 yen.  
(I just hope it's waterproof—that's my only concern.)

Under the battery, there's a circuit board.  
The board is fixed to the case with only one Phillips screw, so I disassembled it further.  
![](https://gyazo.com/bec742d0d72d87bf69fc02e7385543f3.png)

The board had a simple layout with a YX8018B chip, an inductor, an LED, and a switch.  
The inductor was 330μH, and the LED was a warm white type.  
This is where the "YX8018" chip, the main character of this time, appears.  
![](https://gyazo.com/08d95c084424b1d581a6d9a2fbde8df2.png)

Huh? There was some solder debris attached to the LED's leg.  
Such debris could fall off and potentially cause a short circuit on the board, so it's best to remove it.  
(Actually, it came off quite easily with a slight touch.)  
![](https://gyazo.com/7875fae4811f4da694662426fe59c094.png)

## Checking the YX8018 Datasheet

I checked the YX8018 datasheet from the site mentioned earlier.  
The model number is wrong at the beginning of the description, but let's not worry about it.  
This chip seems specialized for use with solar panels and rechargeable batteries.  
It seems you only need to prepare an LED, a solar panel, and an inductor to construct the circuit.  
(Quotes from the [datasheet](https://github.com/mcauser/YX8018-solar-led-driver/blob/master/datasheets/YX8018-datasheet-2.pdf) below)  
![](https://gyazo.com/41b5324ac810eebc8d726abaa7b7b100.png)
![](https://gyazo.com/3e3cf3243353bdc30ec323e235ed2c23.png)

The datasheet also includes a circuit example.  
The circuit diagram of this board is probably similar to the one below.  
![](https://gyazo.com/fe9de0a68de8c66dc88d8205508a9083.png)

The current flowing through the LED seems to be adjusted by changing the value of the inductor.  
The relationship between the inductor's value and the current flow is as follows.  
![](https://gyazo.com/c49e76712a45aa62e16cba018b545a85.png)

I removed the components from the board.  
Left: Inductor  
Center: LED (warm white)  
Right: YX8018  
![](https://gyazo.com/d06503371c2486b9f990cfe48bc5c924.png)

When I checked the value of the inductor with a checker, it was about 390μH. (There's quite a deviation from the value written on the package, but let's not worry about it for now.)  
Checking the value of the inductor and the current flowing through the LED, it seems that the current would be about 5.0mA.  
If the rechargeable battery (600mAh) is fully charged, it should light up for a very long time. (Assuming the battery capacity isn't exaggerated.)

## Checking the Solar Panel

I also checked the solar panel.  
The cable extending from the panel seems to be well sealed.  
(It looks like it's fixed with hot glue.)  
However, I haven't conducted a submersion test, so I can't comment on its effectiveness.  
![](https://gyazo.com/1dff42124e01682b00ea37ab0086feb6.png)

I placed the solar panel under the fluorescent light in my room and measured the power generation voltage.  
About 1.3V was confirmed.  
It seems just right for charging a 1.2V rechargeable battery.  
![](https://gyazo.com/26f458da45abae7b98f83d7c98d132e3.png)

## Checking LED Lighting

I placed the removed components on a breadboard and tried lighting the LED.  
![](https://gyazo.com/f55258bc64be5b4b577c9fde9261a1e8.png)

I applied voltage from a stabilized power supply.  
The LED lit up.  
![](https://gyazo.com/de3749b2d96be527fef5f0aff89d5074.png)

The LED lit up when the applied voltage was above 0.9V and turned off when it was below 0.8V.  
Changing the applied voltage did not gradually increase or decrease the brightness of the LED like the Joule thief circuit I made before. Instead, it turned on/off like a switch.

## Changing the LED from Warm White to White

Personally, I don't like warm white LEDs, so I decided to replace it with a normal white LED.  
![](https://gyazo.com/dc65b6cb312582d163e9587105e675d5.png)

I checked the current flow with a stabilized power supply.  
When 0.9V was applied, the current was about 4mA.  
![](https://gyazo.com/0bcf1d5f3c8e0e85c9fc111ca933ae8c.png)

I reassembled the components on the original board.  
Only the LED was replaced from a warm white LED to a white LED.  
![](https://gyazo.com/868114cf4a7234670714c2e06a5c97a6.png)

Well, it looks fine to me. (Just self-satisfaction.)

## Checking the Boosted Voltage Waveform

You cannot make a white LED emit light with a 0.9V voltage application.  
(To emit light, about 3.0V is required.)  
I checked the voltage waveform applied to the LED.  
![](https://gyazo.com/3fea9b7805949b5c367490c82fbfdf73.png)

It seems that only about 2.5V is applied, but the minimum voltage required for emission seems to be secured. (Depending on the LED, it probably won't light up below 2.4V.)

## Surprisingly Beautiful Light

I compared the original warm white LED with the one I changed to a white LED this time.  
It lights up quite beautifully.  
(The warm white one isn't bad either.)  
![](https://gyazo.com/095c77f68ed87a5cdc47ce5d756800e6.png)

## Summary

The 100 yen store is amazing.  
A AAA nickel-metal hydride rechargeable battery (600mAh), an inductor, YX8018, a solar panel, a warm white LED, and a frame all for 110 yen (including tax)!
This time, the current flowing through the LED was about 4mA, so the brightness of the LED is very small, but if you change the inductor to about 70μH, the current flowing through the LED should increase to about 20mA, making it brighter (but it will consume the battery faster).  
As the manufacturer's warning says, "Please do not replace the battery or modify the product," so any modifications are at your own risk.  
(After all, it's a shame to just throw it away when the battery life is over.)
