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




Last time, I tried lighting a white LED with a single battery using a Joule thief circuit.  
After that, when I researched more about the "Joule thief circuit," I discovered a chip called "Solar LED Driver 'YX8018'."  
It seems to have existed for quite some time, and [this site](https://github.com/mcauser/YX8018-solar-led-driver) has circuit diagrams and datasheets.

This time, I researched a solar garden light using this "YX8018," and I would like to share my findings in this article.

## Solar Garden Lights Sold at Dollar Stores

This time, I bought a "2WAY Solar Accent Light" for 110 yen (tax included) at a nearby dollar store (Can Do).  
The instruction manual was folded inside the light part.  
The part to be stuck into planters or the ground is assembled as shown below.  
For a 100 yen product, I think it's quite well made.  
I disassembled it as far as I could without using any tools.  
Turning the head part, where the solar panel is attached, upside down, I found a small LED and an ON/OFF switch.  
It seems you need to switch it ON to operate the solar panel and LED.  

## Disassembling the Part with the Electronic Circuit

Although the manufacturer's caution says, "Please do not replace batteries or modify," I wanted to know what's inside, so I disassembled it.  
It was easy to open the lid with a screwdriver because it was an ordinary Phillips screw.  
I could see a nickel-metal hydride rechargeable battery. It's size AAA.  
The capacity is written as 600mAh, and the voltage is 1.2V. Although the capacity feels a bit low for a nickel-metal hydride battery, I suppose we should be grateful that it's available at a dollar store. (Lately, rechargeable batteries are becoming rare in dollar stores.)

The battery box is quite simple.  
Such simplicity is probably necessary to produce the whole thing for about 100 yen.  
(The only concern is whether this case is waterproof.)

Under the battery, I could see a circuit board.  
The board was fixed to the case with only one Phillips screw, so I disassembled it further.  
The board had a very simple layout with only the YX8018B chip, an inductor, LED, and switch.  
The inductor was 330μH, and the LED was of a warm color.  
Here, the "YX8018" chip model number appears.  
This chip is the main focus of this time, "Solar LED Driver 'YX8018'."  
Ah? There was some solder debris attached to the LED leg.  
Such debris could fall off and potentially short the board, so it's best to remove it.  
(It actually came off with just a slight touch.)

## Checking the YX8018 Datasheet

I checked the YX8018 datasheet from the site mentioned earlier.  
Although I made a mistake with the model number at the beginning of the explanation, let's ignore that.  
This chip seems specialized for use with solar panels and rechargeable batteries.  
To construct the circuit, besides the LED and solar panel, it seems you only need to prepare an inductor.  
(The following is quoted from the [datasheet](https://github.com/mcauser/YX8018-solar-led-driver/blob/master/datasheets/YX8018-datasheet-2.pdf))  

The datasheet also includes a circuit example.  
The circuit diagram of this board is probably something like the following.  
The amount of current flowing through the LED seems to be adjusted by changing the value of the inductor.  
The relationship between the inductor value and the current flowing through the LED is as follows.  

I removed the components from the board.  
Left: Inductor  
Center: LED (warm color)  
Right: YX8018  

When I checked the value of the inductor with a checker, it was about 390μH. (There's quite a deviation from the value written on the package, but let's not worry about that for now.)  
Checking the value of the inductor and the current flowing through the LED, it seems that the current through the LED would be about 5.0mA.  
If the rechargeable battery (600mAh) is fully charged, it should light up for a very long time. (Assuming the battery capacity is not overstated.)

## Checking the Solar Panel

I also checked the solar panel part.  
The cable extending from the panel seems to be well sealed.  
(It looks like it's been solidified with hot glue.)  
However, I haven't conducted a submersion test, so I can't say for sure about its effectiveness.  

I placed the solar panel under the fluorescent light in my room and measured the power generation voltage of the solar panel.  
I confirmed a voltage of about 1.3V.  
It seems just right for charging a 1.2V rechargeable battery.  

## Checking LED Illumination

I arranged the removed components on a breadboard and tried to light the LED.  
I applied voltage from a stabilized power supply.  
The LED lit up.  
The LED lit up when the applied voltage was above 0.9V and turned off when it was below 0.8V.  
Even if I changed the applied voltage, unlike the Joule thief circuit I made before, the LED did not gradually get brighter or dimmer but turned on/off like a switch.  

## Changing the LED from Warm Color to White

Personally, I don't like warm-colored LEDs, so I decided to try replacing it with a regular white LED.  
I checked the current flow with a stabilized power supply.  
When I applied 0.9V, the current was about 4mA.  

I reassembled the components onto the original board.  
Only the LED was replaced from a warm color LED to a white LED.  
Well, it looks good enough. (Just self-satisfaction.)

## Checking the Boosted Voltage Waveform

It's not possible to illuminate a white LED with an applied voltage of 0.9V.  
(To illuminate, about 3.0V is required.)  
I checked the waveform of the voltage applied to the LED.  
It seems that the minimum necessary voltage for illumination is secured, although only about 2.5V is applied. (Depending on the LED, it probably won't light up if it's below 2.4V.)

## Surprisingly Beautiful Illumination

I compared the original warm-colored LED with the one I changed to a white LED this time.  
It's surprisingly beautifully illuminated.  
(The warm-colored one isn't bad either.)

## Conclusion

Dollar stores are amazing.  
For 110 yen (including tax), you get a AAA nickel-metal hydride rechargeable battery (600mAh), an inductor, YX8018, solar panel, warm-colored LED, and frame!
This time, the current flowing through the LED is about 4mA, so the amount of light from the LED is very small, but if you change the inductor to about 70μH, the current flowing through the LED should increase to about 20mA, making it shine brighter (though it will consume the battery faster).
The manufacturer's caution says, "Please do not replace batteries or modify," so any modifications are at your own risk.
(After all, it seems too wasteful to simply dispose of it when the battery's life ends.)
