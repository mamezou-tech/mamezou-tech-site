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



Last time, I tried lighting up a white LED with just one dry cell using a Joule thief circuit.  
After that, while researching the "Joule thief circuit," I discovered a chip called the "Solar LED Driver 'YX8018'."  
It seems to have been around for quite some time, and [this site](https://github.com/mcauser/YX8018-solar-led-driver) has circuit diagrams and datasheets.

This time, I researched a solar garden light using this "YX8018," and I would like to share my findings in this article.

## Solar Garden Lights Sold at 100 Yen Shops

This time, I bought a "2WAY Solar Accent Light" for 110 yen (including tax) at a nearby 100 yen shop (Can Do).  
The instruction manual was folded inside the light part.  

The part that sticks into planters or the ground is assembled and used as shown below.  
For a 100 yen product, I think it's quite well made.  

I disassembled the parts as far as they could go without using any tools.  

Turning the head part with the solar panel upside down, I found a small LED and an ON/OFF switch.  
It seems necessary to turn the switch ON to operate the solar panel and LED.  

## Disassembling the Parts with the Electronic Circuit

Despite the manufacturer's warning, "Please do not replace the battery or modify," I wanted to know what's inside, so I proceeded to disassemble it.  
It was easy to open the lid with a regular Phillips screwdriver.  

I could see a nickel-metal hydride rechargeable battery. It's size AAA.  
The capacity is written as 600mAh, and the voltage is 1.2V. The capacity seems a bit low for a nickel-metal hydride battery, but maybe we should be grateful it's available at a 100 yen shop at all. (Lately, I haven't seen rechargeable batteries at 100 yen shops.)

The battery box is quite simple.  
They probably couldn't make the whole thing for 100 yen if it wasn't this simple.  
(I just hope this case is waterproof.)

Under the battery, I could see the circuit board.  
The board was only fixed to the case with one Phillips screw, so I disassembled it further.  

The circuit board was simple, with only the YX8018B chip, inductor, LED, and switch mounted.  
The inductor was 330μH, and the LED was of a warm color.  
Here, the "YX8018" chip appears.  
This chip is the main character of this time, the "Solar LED Driver 'YX8018'."  

Huh? There was some solder debris on the LED pins.  
Such debris could fall off and potentially short-circuit the board, so it's best to remove it.  
(It actually came off quite easily with a slight touch.)  

## Checking the YX8018 Datasheet

I checked the YX8018 datasheet from the site I mentioned earlier.  
Ignoring the mistake in the model number at the beginning of the explanation, it seems this chip is specialized for use with solar panels and rechargeable batteries.  
It seems that only an LED, solar panel, and inductor are needed to construct the circuit.  
(Quoting from the [datasheet](https://github.com/mcauser/YX8018-solar-led-driver/blob/master/datasheets/YX8018-datasheet-2.pdf))  

The datasheet also includes a circuit example.  
The circuit diagram of this board is probably something like the following.  

The amount of current flowing through the LED seems to be adjusted by changing the value of the inductor.  
The relationship between the value of the inductor and the current flowing is as follows.  

I removed the components from the board.  
Left: Inductor  
Center: LED (warm color)  
Right: YX8018  

When I checked the value of the inductor with a checker, it was about 390μH. (There's quite a deviation from the value written on the package, but let's not worry about that for now.)  
Checking the value of the inductor and the current flowing through the LED, I expect the current to be about 5.0mA.  
If the rechargeable battery (600mAh) is fully charged, it should light up for a long time. (Assuming the battery's capacity isn't exaggerated.)

## Checking the Solar Panel

I also checked the solar panel.  
The cable extending from the panel seems to be well sealed.  
(It looks like it's been solidified with hot glue.)  
However, I haven't conducted a submersion test, so I can't comment on its effectiveness.  

I placed the solar panel under the fluorescent light in my room and measured the power generation voltage of the solar panel.  
I confirmed a voltage of about 1.3V.  
This seems just right for charging a 1.2V rechargeable battery.  

## Checking the LED Lighting

I arranged the removed components on a breadboard and tried lighting the LED.  

I applied voltage from a stabilized power supply.  
The LED lit up.  

The LED lit up when the applied voltage was above 0.9V and turned off when it was below 0.8V.  
Changing the applied voltage did not gradually brighten or dim the LED like the Joule thief circuit I made before; it turned on/off like a switch.  

## Changing the LED from Warm Color to White

Personally, I don't like warm-colored LEDs, so I decided to replace it with a regular white LED.  

I checked the current flow with a stabilized power supply.  
When 0.9V was applied, the current was about 4mA.  

I reassembled the components onto the original board.  
Only the LED was changed from a warm-colored LED to a white LED.  

Well, it looks pretty good. (Just self-satisfaction.)

## Checking the Boosted Voltage Waveform

It's impossible to light a white LED with an applied voltage of 0.9V.  
(To light it, about 3.0V is necessary.)  
I checked the waveform of the voltage applied to the LED.  

It seems that only about 2.5V is applied, but the minimum necessary voltage for lighting seems to be secured. (It probably won't light up if it's below 2.4V, depending on the LED.)

## Surprisingly Lights Up Beautifully

I lined up the original warm-colored LED and the white LED I changed this time.  
It lights up surprisingly beautifully.  
(The warm-colored one isn't bad either.)  

## Conclusion

The power of 100 yen shops is to be feared.  
A AAA nickel-metal hydride rechargeable battery (600mAh), inductor, YX8018, solar panel, warm-colored LED, and frame all for 110 yen (including tax)!  
This time, the current flowing through the LED is about 4mA, so the light output of the LED is very small, but if the inductor is changed to about 70μH, the current flowing through the LED should increase to about 20mA, making it light up brighter (though it will consume the battery faster).  
As the manufacturer's warning says, "Please do not replace the battery or modify," any modifications are at your own risk.  
(After all, it's a waste to just dispose of it when the battery life ends.)
