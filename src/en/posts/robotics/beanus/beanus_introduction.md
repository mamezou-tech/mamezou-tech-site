---
title: Mamezou Original Robot Beanus
author: takehiro-toyoshima
tags: [ロボット, BEANus]
date: 2024-03-23T00:00:00.000Z
image: true
translate: true

---




# Introduction

Since 2013, Mamezou has been providing support and consulting for robot system development. Originally a company strong in software development, it now offers comprehensive support including mechanics and electronics.

Beanus is an original robot from Mamezou, born from the knowledge accumulated over the years. The name Beanus comes from combining "Bean" and "Venus". The Beanus series consists of two models: Beaus and Beanus2. The Beanus series is not a product but was created to showcase Mamezou's robot development technology.

This article introduces the original robots of Mamezou, the Beanus series.

# Beanus

In 2017, in collaboration with Tokyo University of Agriculture and Technology, we realized the practical application of a design method that shortens the development period of industrial robot arms. By integrating our software technology and model-based development process with the knowledge of robotics from Professor Shigeki Toyama of the Faculty of Engineering, Advanced Mechanical Systems Division, Tokyo University of Agriculture and Technology, we established a design method to bring competitive industrial robots to the market with fewer prototypes.

![](/img/robotics/beanus/noukoudai_kyoudou.png)

Beanus is a robot developed in a short period (8 months) as a demonstration prototype by applying this design method. Its feature is that it is a vertically articulated robot composed of 7 axes. Generally, vertically articulated robots have a 6-axis configuration, but with a 7-axis configuration, it is possible to maneuver around obstacles and operate in tight spaces.
The control controller and the pendant software that enable the 7-axis robot's movement were developed from scratch by Mamezou.

Below is a video from the first time Beanus was exhibited at a trade show (International Robot Exhibition 2017). Beanus performed a demo of making juice and serving it to visitors.

<iframe width="560" height="315" src="https://www.youtube.com/embed/yB6r_LOnhLs?si=FQ0Zn52biMBjGLuj" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

We have also demonstrated various other demos and exhibited at trade shows.
In collaboration with an application developed by Nextscape Inc., we exhibited a demo of "Holo-Teach - Holographic Robot Remote Operation". By wearing the Microsoft HoloLens, you can control a real robot by manipulating the hologram that appears in front of you, instructing it to sort trash and throw it into a waste bin.

<iframe width="560" height="315" src="https://www.youtube.com/embed/J130rFdeh48?si=A6Po3xPAGjgzkSbD" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

# Beanus2

Beanus2 is a robot jointly researched and developed by Mitsui Chemicals, Nidec Drive Technology (formerly Nidec-Shimpo), and Mamezou. While retaining the concepts of the "7-axis collaborative robot", "high-performance controller developed in-house", and "intuitive pendant using a commercial tablet" characteristic of the Beanus series, it has the following new features:

### Resin Frame
Thanks to Mitsui Chemicals' resin molding technology, most of the robot's frame is made of resin, reducing its weight by up to half compared to metal. Metal-resin integrated molding technology is used for parts that require metal joining, achieving high rigidity despite being made of resin. Lighter weight allows for reduced impact force upon collision, increased payload, and power savings.

### High Backdrivability Gearbox
Typically, using a general gearbox makes it difficult to detect external forces from motor current values, so torque sensors are often installed at each joint. By adopting Nidec-Shimpo's high-efficiency, low-friction high backdrivability gearbox, it is possible to accurately estimate external forces from motor current values.

### Sensorless Force Control
Accurate estimation of torque applied to each joint is essential for force control. To estimate torque accurately without sensors, it is necessary to estimate the effects of gravity, inertia, and friction. Mamezou has realized this estimation with its technology.
Also, Mamezou's technology has realized control that allows the robot to move softly in response to external forces.

Below is a demo video of the direct operation function, where the worker moves the robot directly by hand, applying sensorless force control.
<iframe width="560" height="315" src="https://www.youtube.com/embed/Wx6d8uE_IKo?si=okAzrx7xYsZC7jg-" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

It is difficult to achieve sensorless force control with widely used harmonic drive gearboxes due to the significant impact of friction. Friction is difficult to model accurately, making it hard to precisely estimate torque. Therefore, approaches such as dead zone processing are often adopted. However, if the dead zone is too large, small external forces cannot be detected, reducing the accuracy of force control. On the other hand, using a high backdrivability gearbox, which has a minor impact from friction, allows for a smaller dead zone. This enables the detection of minute external forces, allowing the robot to be moved with a light force as shown in the video.

Additionally, in combination with Fogale Robotics' external sensor, we have also demonstrated avoiding contact with people non-contact when the robot approaches them. The external sensor is a capacitive sensor that can measure the distance to conductive objects. Mamezou has implemented control to avoid collisions based on distance information.

<iframe width="560" height="315" src="https://www.youtube.com/embed/z-rUd-ylx58?si=Cv33SeoRFQEre0Un" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

In collaborative robots, it is common to stop the robot upon contact to ensure human safety, but at high speeds, the impact force at the moment of detection can be significant, compromising safety. Therefore, when collaborating with humans, it is common to limit the operating speed. However, using an external sensor can react before contact, allowing for less restrictive speed limits compared to when detecting contact, thus expecting both safety and high-speed operation.

# Conclusion

This article introduced Mamezou's original robots, Beanus and Beanus2.
While we touched on the core technologies realized with Beanus, such as "7-axis robot control", "sensorless force control", and "non-contact collision avoidance", we could not go into detail. In another article, we plan to introduce these technologies in more detail.
