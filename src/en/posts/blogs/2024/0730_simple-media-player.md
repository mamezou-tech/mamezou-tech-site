---
title: >-
  I Made a Media Player Because My Wife Said, 'I Want Something That Makes a
  Warning Sound Since I Had a Scary Experience Leaving the Gas Stove On'
author: shuji-morimoto
date: 2024-07-30T00:00:00.000Z
tags:
  - 電子工作
  - メディアプレイヤー
  - summer2024
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2024-summer/
image: true
translate: true

---



This article is the second day of the [Summer Relay Series 2024](/events/season/2024-summer/).

![](/img/blogs/2024/0730_simple-media-player/image_top.jpg)

One day after the Golden Week in May had passed

Me: "I want to go to Akizuki[^1] to buy some parts."
Wife: "Ugh, again?"
Me: "Don't you think it would be convenient to turn USB devices on and off from a smartphone using a WIFI module[^2]? Don't you have anything you want to do?"
Wife: "Hmm... Oh, speaking of which, I had a scary experience the other day."
Wife: "While cooking, I remembered something else and got distracted, and I forgot that I had turned on the gas stove..."
Me: "What? That's dangerous."
Wife: "I had a scary experience leaving the gas stove on, so I want something that makes a warning sound."
Me: "Isn't that something you can find at a 100 yen shop? Can't a kitchen timer work?"
Wife: "There's nothing like what I have in mind."
Me: "Ah (laughs), you're looking for something with design appeal."

Thus, MY project began.

:::alert
Although it was mentioned in the conversation, the MY project does not utilize a WIFI module.
:::

[^1]: When it comes to purchasing hobby electronic circuit parts, Akizuki Electronics is the go-to.
[^2]: The ESP32 series is an IoT product that has a built-in WIFI module and web server functionality, making it perfect for smart home devices.

# Development Method Using the V-Model

For MY project, I adopted the [V-Model](https://ja.wikipedia.org/wiki/V%E3%83%A2%E3%83%87%E3%83%AB), a method of IT product development. The priority was not to create what I wanted but to understand and create what my wife desired.

![](/img/blogs/2024/0730_simple-media-player/v_model.png)

| V-Model Tasks | MY Project Tasks |
|----------------|------------------|
| Requirement Definition (Demand Analysis) | Hearing requests |
| External Design (Basic Design) | Design concerning exterior and operation |
| Internal Design (Detailed Design) | Design of internal electronic circuits |
| Development (Implementation & Coding) | Fun crafting time |
| Unit Testing | Operation verification and adjustments for each circuit |
| Integration Testing | Overall operation verification and adjustments |
| Acceptance Testing | Getting feedback by having it actually used |

Well, to be honest, the V-Model is a retrospective fit, but this is generally how the process flows when making things. Once work begins, we somehow manage to tackle the next task. Each test confirms and verifies the contents from the requirement definition and design phases.

# Hearing Requests

I started by understanding what kind of device was desired. After asking various questions, I discovered the following requests. The thoughts in parentheses are my inner voice.

- Portable size (of course)
- The sound playback should be turned on/off manually (Isn't it a timer!?)
- Only one song should play (It's a waste to have just one song)
- I want a cute-sounding tone (Okay)
- It would be nice to adjust the volume (I think so too)
- I want to adjust the volume with my left hand (That's quite a preference)
- I won't open it (Does that mean I have to do battery replacements and maintenance?)
- About 1000 yen would be fine (I'm the one paying for it...)
- I prefer an aluminum case instead of plastic (There's no way that can be done for 1000 yen)
- I want something nostalgic and retro (Sounds good)
- Since it will be used in the kitchen, it would be nice if it were waterproof (Probably impossible)
- It should be able to stand vertically or horizontally (Huh?)
- It would be nice to have a ring-shaped hole to hang it with a string (Aren't you going to place it down?)
- I want to try hanging it around my neck like a necklace when going out (laughs)

It seems she is considering various ways to use it. There were a few unexpected requests, but we could somehow share a vision of completion. It seems she is imagining something like a boombox (Sony WALKMAN?).

# Design Concerning Exterior and Operation

Based on the hearing, it seems that a switch to turn the sound ON/OFF and a volume adjustment component would be sufficient. Additionally, a ring for attaching a string is needed.

## Consideration of Parts

The ON/OFF switch will be a toggle switch with an analog feel, and the volume adjustment will also have an analog feel with a knob that allows for continuous volume adjustment.

For music playback, I will use an MP3 module that is compatible with the one I created earlier for the <[Christmas Illumination](/blogs/2023/12/22/electronic-kit/)>.

I decided to use a leftover speaker that came with the music playback module. The speaker can be embedded by making a hole in the case, but I was worried about how to embed it.

To hang it with a string, I thought a bolt with a ring-shaped hole would suffice, and I could simply screw it into the case. This would later become a significant challenge.

To keep the power supply as light as possible, I decided to use a single AA battery (1.5V) and boost it from 1.5V to 3.3V (the minimum operating voltage of the MP3 module) using a DC-DC boost converter.

I have gathered basic components such as a circuit board, resistors, capacitors, wiring, spacers, and screws. The case will be a compact aluminum case that can easily be opened and closed.

Additionally, based on previous <[reflections](/blogs/2023/12/22/electronic-kit/#ケース)>, I decided to connect the case mounting components (ON/OFF switch and speaker) and the circuit board with XH connectors so that the wiring can be detached when opening and closing the case.

## Purchase of Parts

Off to Akizuki. The store is always crowded, and it takes time to find the parts in the cases, so I prepare a parts list in advance. However, I end up buying about half the parts that are different or additional series items.

### Parts Purchased at Akizuki

- [AA Battery Holder](https://akizukidenshi.com/catalog/g/g100308/)
- [Waterproof Toggle Switch (for Panel)](https://akizukidenshi.com/catalog/g/g116176/)
- [ON/OFF Label for Toggle Switch](https://akizukidenshi.com/catalog/g/g116813/)
- [Rubber Hood for Toggle Switch (Green)](https://akizukidenshi.com/catalog/g/g105914/)
- [500Ω Small Volume Control with Linear Characteristics (for Panel)](https://akizukidenshi.com/catalog/g/g115216/)
- [Aluminum Case](https://akizukidenshi.com/catalog/g/g109534/)
- [Aluminum Knob](https://akizukidenshi.com/catalog/g/g112202/)

While the speaker and case have zero waterproof performance, I purchased a waterproof toggle switch (IP67[^3]). It can be turned ON/OFF with wet hands without any issues. 
I splurged on the aluminum knob. It harmonizes well with the case.
The ON/OFF label and rubber hood serve as nice accents.

[^3]: IP67 6: No ingress of dust, 7: No effect on the device even if temporarily submerged in water.

### Other Parts

- XH connectors and DC-DC boost converters were purchased in bulk from AliExpress (can't beat the price).
- The MP3 module was purchased on Amazon as a [DFPlayer mini compatible device](https://www.amazon.co.jp/gp/product/B076F5LMSB).
- The sound source was purchased from Yamaha's music distribution site, known for the "Yobikomi-kun" sound source [ポポーポポポポ♪](https://mysound.jp/song/4541889/).
- A microSD card (4GByte) was used from what I had lying around.
- The [ring bolt](https://www.yodobashi.com/product/100000001004521519/) was purchased from Yodobashi.com.

In the nearby supermarket's seafood section, "Yobikomi-kun" was playing ポポーポポポポ♪, and I couldn't help but hum along to the catchy tune that stuck in my head. I had already decided that the music would be ポポーポポポポ♪ from the start.

I searched extensively in Akihabara's parts shops for bolts with a ring-shaped hole but struggled to find what I imagined and eventually found a round ring bolt. I will attach it to the case with two M6 hex nuts.

# Design of Internal Electronic Circuits

The circuit diagram was easily completed by using the music playback module and delay circuit from the <[Christmas Illumination Circuit Diagram](/blogs/2023/12/22/electronic-kit/#回路図)>.

![](/img/blogs/2024/0730_simple-media-player/circuit_diagram.png)

Next, I just need to consider the following installations:
- AA battery holder
- DC-DC boost converter (DC1)
- ON/OFF toggle switch (SW1-1)
- Connect resistor (R3) and variable resistor (VR1) in series to adjust the range to a minimum of N (N: about 100-300) Ω and a maximum of 700Ω.
- A switch (SW2-1) to switch between playing the first song (shorting at 0Ω) or the second song (shorting R1+R2 at 3KΩ).

The speaker (SP1) and ON/OFF toggle switch (SW1-1) will be mounted on the top of the case, while the variable resistor (VR1) and knob will be mounted on the side of the case.

The music that will be played can be switched, with the first song being "ポポーポポポポ♪" and the second song being "ポポーポポポポ♪ 8bit Pico Pico Sound Version." When I asked which one was better, she preferred the first song. Therefore, the switch (SW2-1) is set to the 0Ω side. This switch cannot be changed without opening the case.

# Fun Crafting Time

Finally, it’s time to create the circuit and process the case.

## Wiring and Soldering
I used a [breadboard pattern](https://akizukidenshi.com/catalog/g/g104303/) printed with silk[^4].
Since the wiring is the same as the breadboard from the start, I can arrange the components on the board just like on a breadboard. However, unlike a breadboard, I want the surface to look neat with only the modules, so I solder the wiring on the back side.

Back of the circuit board
![](/img/blogs/2024/0730_simple-media-player/image_circuit.jpg)

To minimize the number of wires, I cut the patterns in multiple places. Therefore, I arranged the resistors and other components in a layout that cannot be assembled on a breadboard.

[^4]: Guides and part numbers printed on the surface.

## Speaker Installation

The speaker needs to be fixed by making a hole in the aluminum case. Since it has a diameter of about 50mm, I cannot make such a large hole in one go. Therefore, I followed the steps below to make the hole.

1. Draw two concentric circles with a compass.
2. Make an indentation on the inner circle with a punch.
3. Use a power drill to make a small hole at the punch position.
4. Use a slightly larger drill to make a hole (without hitting the outer circle).
5. Use a file to connect the holes and create a larger hole.
6. Smooth the edges around the circle with a file.
7. Apply instant adhesive to the speaker and fix it in this hole.

Making the hole
![](/img/blogs/2024/0730_simple-media-player/image_hole.jpg)

Filing
![](/img/blogs/2024/0730_simple-media-player/image_rasp.jpg)

## Storing in the Case

I made a hole in the back of the aluminum case and secured the circuit board with spacers and screws. It is slightly elevated due to the rubber feet.

The round ring bolt has long legs that hit the MP3 module, so I needed to cut them. I patiently filed them down while applying oil with a jigsaw. This was the most challenging task.

I have significantly abbreviated the component installation process, but what is housed in the case is as follows.
![](/img/blogs/2024/0730_simple-media-player/image_internal.jpg)

# Operation Verification and Adjustments for Each Circuit

The delay circuit worked without any issues since it was something I had made previously.

The LED light from the MP3 module shines inside the case but is not visible, making it a waste of power.
Since circuits using LEDs are often wired in parallel, I thought that removing the LED would not affect music playback, so I cut it off with a soldering iron. (It was able to play music without the LED.)

For volume adjustment with the knob, I initially set R3 to 100Ω and the variable resistance value from 100Ω to 600Ω. However, at 100Ω, too much current flowed (increasing the volume), which caused power shortages and the music would stop midway, so I changed it to 200Ω.

The song-switching switch (SW2-1) was initially planned to be installed on the side of the case, but it was deemed unnecessary, so it remains housed inside.

The battery is the heaviest component and needs to be centrally located for balance. However, the battery holder was too large to fit, so I laid it out diagonally. This allowed it to fit nicely in the center.

The volume adjustment knob did not fit because it hit the circuit board, so I had to shave a bit off the board.

The ON/OFF switch was right on the edge of hitting the circuit board.

# Overall Operation Verification and Adjustments

I checked the length adjustment of the hemp string, the center of gravity balance when placed vertically and horizontally, cut the front and back blank spaces during music playback, tested vibrations during music playback, and checked how well the ON/OFF switch worked.

Once the circuit board was housed in the case, I could feel a significant increase in durability compared to the wiring on the breadboard. Even if handled somewhat roughly, there was no sign of breaking at all.

# Getting Feedback by Having It Actually Used
Until this article is published, it is still in development, so it has not been delivered yet. It seems she liked the music and appearance, so I have passed the first hurdle.
I am curious whether she will actually hang it around her neck when going out, but I hope she will use it for a long time.

Now, please take a look at the completed product. `Please be careful as it makes sound!!`

<video src="/img/blogs/2024/0730_simple-media-player/demo.mp4" style="max-width: 100%;" poster="/img/blogs/2024/0730_simple-media-player/thumb.png" preload="none" controls></video>

Since she wanted to adjust the volume with her left hand, I set it so that turning it counterclockwise increases the volume.

:::info
It seemed that the speaker sounded louder when it was embedded in the case and in a sealed state than when it was bare. Upon investigation, it turns out that sound travels not only from the front of the speaker but also from the back, so when sealed, the air spring effect occurs inside the box, controlling the diaphragm's movement and resulting in sharper sound response.
:::

# Finally
I tried making a media player using the [V-Model](#v字モデルを使った開発手法) development method, but in actual work, the process from "requirement definition" to "development" was repeated many times. There are things you can only understand by doing, so it felt like gradually improving. Rather than a typical team effort, it felt more like I was repeating a solo Scrum Sprint. I truly felt that the risk of failure was mitigated.
