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



In [the previous article](/blogs/2024/03/21/light-up-led-by-joule-thief-circuit/), I tried lighting a white LED with just one battery using a Joule thief circuit.  
After that, while researching more about "Joule thief circuits," I discovered a chip called the "Solar LED Driver 'YX8018'."  
It seems to have been around for quite a while, and [this site](https://github.com/mcauser/YX8018-solar-led-driver) has the circuit diagram and datasheet.

This time, I researched a solar garden light using this "YX8018," and I would like to share my findings in this article.

## Solar Garden Lights Sold at Dollar Stores

This time, I bought a "2WAY Solar Accent Light" for 110 yen (tax included) at a nearby dollar store (Can Do).  
The instruction manual was folded inside the light part.  

The part to be stuck into planters or the ground is assembled as shown below.  
For a 100-yen product, I think it's quite well made.  

I disassembled each part without using any tools.  

Turning the head part with the solar panel upside down, I found a small LED and an ON/OFF switch.  
It seems necessary to turn the switch ON to operate the solar panel and LED.  

## Disassembling the Part with the Electronic Circuit

The manufacturer's caution note says, "Please do not replace the battery or modify the product," but I really wanted to see the inside, so I disassembled it.  
It was easy to open the lid with a regular Phillips screwdriver.  

I could see a nickel-metal hydride rechargeable battery. It's size AAA.  
The capacity is 600mAh, and the voltage is 1.2V. The capacity seems a bit low for a nickel-metal hydride battery, but perhaps we should be grateful that it's available at a dollar store. (Lately, rechargeable batteries seem to have disappeared from dollar stores.)

The battery box is quite simple.  
To keep the overall cost down to about a dollar, it has to be this simple.  
(I'm just worried if this case is waterproof.)

Underneath the battery, I could see the circuit board.  
The board was fixed to the case with just one Phillips screw, so I disassembled it further.  

The board had a simple layout with just the YX8018B chip, an inductor, LED, and switch.  
The inductor was 330μH, and the LED was a warm white color.  
Here, the chip with the model number "YX8018" makes its appearance.  
This chip is the main focus of today's article, the "Solar LED Driver 'YX8018'."  

Huh? There was some solder debris on the LED legs.  
Such debris could fall off and potentially short-circuit the board, so it's best to remove it.  
(It actually came off quite easily with a slight touch.)  

## Checking the YX8018 Datasheet

I checked the YX8018 datasheet from the site mentioned earlier.  
Although I made a mistake with the model number at the beginning of the explanation, let's not worry about it.  
This chip seems to be specialized for the use of solar panels and rechargeable batteries.  
To construct the circuit, besides the LED and solar panel, it seems only an inductor is needed.  
(Quoted from the [datasheet](https://github.com/mcauser/YX8018-solar-led-driver/blob/master/datasheets/YX8018-datasheet-2.pdf))  

The datasheet also includes a circuit example.  
The circuit diagram of today's board is probably similar to the one below.  

The current flowing through the LED seems to be adjusted by changing the value of the inductor.  
The relationship between the inductor value and the current flowing through the LED is as follows.  

I removed the components from the board.  
Left: Inductor  
Center: LED (warm white)  
Right: YX8018  

When I checked the value of the inductor with a checker, it was about 390μH. (There's quite a deviation from the value written on the package, but let's not worry about it for now.)  
Looking at the relationship between the inductor value and the current flowing through the LED, the current flowing through the LED should be about 5.0mA.  
If the rechargeable battery (600mAh) is fully charged, it should light up for a very long time. (Assuming the battery capacity is not exaggerated.)

## Checking the Solar Panel

I also checked the solar panel part.  
The cable extending from the panel seems to be well sealed.  
(It looks like it's been solidified with hot glue.)  
However, I haven't conducted a submersion test, so I can't comment on its effectiveness.  

I placed the solar panel under the fluorescent light in my room and measured the power generation voltage of the solar panel.  
I confirmed a voltage of about 1.3V.  
It seems just right for charging a 1.2V rechargeable battery.  

## Checking the LED Lighting

I arranged the removed components on a breadboard and tried lighting the LED.  

I applied voltage from a stabilized power supply.  
The LED lit up.  

The LED lit up when the applied voltage was above 0.9V and turned off when it was below 0.8V.  
Even when changing the applied voltage, unlike the Joule thief circuit I made before, the LED did not gradually get brighter or dimmer; it turned on and off like a switch.  

## Changing the LED from Warm White to White

Personally, I don't like warm white LEDs, so I decided to replace it with a regular white LED.  

I checked the current flow with a stabilized power supply.  
When applying 0.9V, the current was about 4mA.  

I reassembled the components onto the original board.  
Only the LED was changed from a warm white LED to a white LED.  

Well, it looks pretty good. (Just self-satisfaction.)

## Checking the Boosted Voltage Waveform

It's impossible to emit light from a white LED with an applied voltage of 0.9V.  
(To emit light, about 3.0V is necessary.)  
I checked the waveform of the voltage applied to the LED.  

It seems that only about 2.5V is applied, but the minimum necessary voltage for emission seems to be secured. (It probably won't light up if it's below 2.4V, depending on the LED.)

## Surprisingly Beautiful Light

I lined up the original warm white LED and the one I changed to a white LED this time.  
It lights up surprisingly beautifully.  
(The warm white one isn't bad either.)  

## Summary

Dollar stores are amazing.  
For just 110 yen (including tax), you get a AAA nickel-metal hydride rechargeable battery (600mAh), an inductor, YX8018, solar panel, warm white LED, and frame!
This time, since the current flowing through the LED is about 4mA, the brightness of the LED is very low, but if you change the inductor to about 70μH, the current flowing through the LED should increase to about 20mA, making it shine brighter (but it will consume the battery faster).
As the manufacturer's caution note says, "Please do not replace the battery or modify the product," any modifications are at your own risk.
(But it would be a shame to dispose of it immediately after the battery's life ends.)
