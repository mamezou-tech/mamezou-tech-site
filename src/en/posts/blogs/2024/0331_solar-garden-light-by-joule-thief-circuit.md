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



Last time, I tried lighting up a white LED with just one dry cell using a Joule thief circuit.  
After that, while researching more about the "Joule thief circuit," I discovered a chip called the "Solar LED Driver 'YX8018'."  
It seems to have been around for quite some time, and [this site](https://github.com/mcauser/YX8018-solar-led-driver) has the circuit diagram and datasheet posted.

This time, I would like to write an article about the solar garden light using this "YX8018".

## Solar Garden Lights Sold at 100 Yen Shops

This time, I bought a "2WAY Solar Accent Light" for 110 yen (including tax) at a nearby 100 yen shop (Can Do).  
![](https://gyazo.com/34a778b78acad1b14a65cb91e2e66629.png)

The instruction manual was folded inside the light part.  
![](https://gyazo.com/e147ee1099f424d2349513497abd0409.png)

The part to be stuck into planters or the ground is supposed to be assembled and used as shown below.  
For a 100 yen product, I think it's quite well made.  
![](https://gyazo.com/63fa14124ceddd3b1690c90c01ec4a44.png)

I disassembled each part without using tools as much as possible.  
![](https://gyazo.com/509a399abadf57fdf15bad8bd31cb6f5.png)

Turning the head part with the solar panel over, I found a small LED and an ON/OFF switch.  
It seems necessary to turn the switch ON to operate the solar panel and LED.  
![](https://gyazo.com/61c9a347f5e7392eccd405d831cb36ab.png)

## Disassembling the Part with the Electronic Circuit

Although the manufacturer's warning says "Please do not replace the battery or modify the product," I wanted to know what's inside, so I went ahead and disassembled it.  
It was easy to open the cover with a screwdriver since it was just a normal Phillips screw.  
![](https://gyazo.com/59d4680cee82cdc6e3659954611e5a5b.png)

I could see a nickel-metal hydride rechargeable battery. It's size AAA.  
The capacity is written as 600mAh and the voltage is 1.2V. It feels like the capacity is somewhat small for a nickel-metal hydride battery, but maybe we should be grateful that it's available at a 100 yen shop. (Lately, I haven't seen rechargeable batteries at 100 yen shops)

The battery box is quite simple.  
To make the whole thing for 100 yen, it has to be this simple, I guess.  
(I just hope this case is waterproof... that's my only concern)

Under the battery, I could see the circuit board.  
The board was fixed to the case with just one Phillips screw, so I disassembled it further.  
![](https://gyazo.com/bec742d0d72d87bf69fc02e7385543f3.png)

The board was simple, with only the YX8018B chip, an inductor, LED, and switch mounted.  
The inductor was 330μH, and the LED was of a warm color.  
Here, the chip with the model number "YX8018" appears.  
This chip is the main character of this time, "Solar LED Driver 'YX8018'."  
![](https://gyazo.com/08d95c084424b1d581a6d9a2fbde8df2.png)

Hmm? There was some solder debris attached to the leg of the LED.  
Such debris could fall off and potentially short-circuit the board, so it's best to remove any solder debris.  
(Actually, it fell off with just a slight touch)  
![](https://gyazo.com/7875fae4811f4da694662426fe59c094.png)

## Checking the YX8018 Datasheet

I'll check the YX8018 datasheet from the site I mentioned earlier.  
I made a mistake with the model number at the beginning of the explanation, but let's not worry about it.  
This chip seems specialized for use with solar panels and rechargeable batteries.  
To construct the circuit, it seems you only need to prepare an LED, solar panel, and an inductor in addition to the chip.  
(Quoted from the [datasheet](https://github.com/mcauser/YX8018-solar-led-driver/blob/master/datasheets/YX8018-datasheet-2.pdf))  
![](https://gyazo.com/41b5324ac810eebc8d726abaa7b7b100.png)
![](https://gyazo.com/3e3cf3243353bdc30ec323e235ed2c23.png)

The datasheet also includes an example circuit.  
The circuit diagram of this board is probably something like the following.  
![](https://gyazo.com/fe9de0a68de8c66dc88d8205508a9083.png)

The amount of current flowing through the LED seems to be adjusted by changing the value of the inductor.  
The relationship between the inductor value and the current flowing through the LED is as follows.  
![](https://gyazo.com/c49e76712a45aa62e16cba018b545a85.png)

I removed the components from the board.  
Left: Inductor  
Center: LED (warm color)  
Right: YX8018  
![](https://gyazo.com/d06503371c2486b9f990cfe48bc5c924.png)

When I checked the value of the inductor with a checker, it was about 390μH. (There's quite a deviation from the value written on the package, but let's not worry about it for now)  
Based on the relationship between the inductor value and the current flowing through the LED mentioned earlier, the current flowing through the LED should be about 5.0mA.  
If the rechargeable battery (600mAh) is fully charged, it should light up for a very long time. (Assuming the battery capacity is not exaggerated)

## Checking the Solar Panel

Let's also check the solar panel.  
The cable part extending from the panel seems to be well-sealed.  
(It seems to be solidified with hot glue)  
However, I haven't conducted a submersion test, so I can't say for sure about its effectiveness.  
![](https://gyazo.com/1dff42124e01682b00ea37ab0086feb6.png)

I placed the solar panel under the fluorescent light in my room and measured the power generation voltage of the solar panel.  
I could confirm a voltage of about 1.3V.  
It seems to be just right for charging a 1.2V rechargeable battery.  
![](https://gyazo.com/26f458da45abae7b98f83d7c98d132e3.png)

## Checking the LED Lighting

I placed the removed components on a breadboard and tried lighting the LED.  
![](https://gyazo.com/f55258bc64be5b4b577c9fde9261a1e8.png)

I applied voltage from a stabilized power supply.  
The LED lit up.  
![](https://gyazo.com/de3749b2d96be527fef5f0aff89d5074.png)

The LED lit up when the applied voltage from the stabilized power supply was above 0.9V and turned off when it was below 0.8V.  
Even if the applied voltage was changed, unlike the Joule thief circuit I made before, the LED did not gradually become brighter or darker, but turned on/off like a switch.

## Changing the LED from Warm Color to White

Personally, I don't like warm-colored LEDs, so I decided to try replacing it with a regular white LED.  
![](https://gyazo.com/dc65b6cb312582d163e9587105e675d5.png)

I checked the current flow with a stabilized power supply.  
When 0.9V was applied, the current was about 4mA.  
![](https://gyazo.com/0bcf1d5f3c8e0e85c9fc111ca933ae8c.png)

I reassembled the components onto the original board.  
Only the LED was changed from a warm-colored LED to a white LED.  
![](https://gyazo.com/868114cf4a7234670714c2e06a5c97a6.png)

Well, it looks good, I guess. (Just self-satisfaction)

## Checking the Boosted Voltage Waveform

It's impossible to make a white LED emit light with a 0.9V voltage application.  
(To emit light, about 3.0V of voltage is needed)  
Let's check the waveform of the voltage applied to the LED.  
![](https://gyazo.com/3fea9b7805949b5c367490c82fbfdf73.png)

It seems that only about 2.5V is applied, but the minimum necessary voltage for emission seems to be secured. (It probably won't light up if it's below 2.4V, depending on the LED)

## Surprisingly Lights Up Beautifully

I lined up the original warm-colored LED one and the one I changed to a white LED this time.  
It lights up surprisingly beautifully.  
(The warm-colored one isn't bad either)  
![](https://gyazo.com/095c77f68ed87a5cdc47ce5d756800e6.png)

## Conclusion

The 100 yen shop is amazing.  
A AAA nickel-metal hydride rechargeable battery (600mAh), inductor, YX8018, solar panel, warm-colored LED, and frame all for 110 yen (including tax)!  
This time, the current flowing through the LED is about 4mA, so the light output of the LED is very small, but if you change the inductor to about 70μH, the current flowing through the LED should increase to about 20mA, making it much brighter (though it will consume the battery faster).  
As the manufacturer's warning says, "Please do not replace the battery or modify the product," so any modifications are at your own risk.  
(After all, it's too wasteful to just dispose of it when the battery's life is over)
