---
title: Mamezo's Original Robot Beanus
author: takehiro-toyoshima
tags: [ロボット, Beanus]
date: 2024-03-23T00:00:00.000Z
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/robotics/beanus/beanus_introduction/).
:::



# Introduction

Since 2013, Mamezo has been supporting and consulting on robot system development. Originally a company strong in software development, it also offers comprehensive support including mechanics and electronics.

Beanus is an original robot from Mamezo, born from the knowledge accumulated over the years. The name Beanus is derived from Bean and Venus. The Beanus series consists of two models: Beaus and Beanus2. The Beanus series is not a product, but a robot created to showcase Mamezo's robot development technology.

This article introduces the Beanus series, Mamezo's original robots.

# Beanus

In 2017, in collaboration with Tokyo University of Agriculture and Technology, we realized the practical application of a design method that shortens the development period of industrial robot arms. Our software technology and model-based development process, combined with the robotics knowledge of Professor Shigeki Toyama from the Advanced Mechanical Systems Division of the Faculty of Engineering at Tokyo University of Agriculture and Technology, established a design method to bring competitive industrial robots to market with fewer prototypes.

Beanus is a robot developed in a short period (8 months) as a prototype for demonstration, applying this design method. Its feature is a vertical multi-joint robot composed of 7 axes. While vertical multi-joint robots generally have a 6-axis configuration, having a 7-axis configuration allows it to navigate around obstacles and operate in tight spaces. The control controller and pendant software that enable the 7-axis robot's operation were developed from scratch by Mamezo.

Below is a video from the first time Beanus was exhibited at a trade show (International Robot Exhibition 2017), where it performed a demo of making juice and serving it to visitors.

Various other demos have been performed and exhibited at trade shows. In collaboration with an application developed by Nextscape Inc., we exhibited a demo of "Holo-Teach – Holographic Robot Remote Control." By wearing the Microsoft HoloLens, users could control a hologram that appears in front of them, instructing the physical robot to sort trash and throw it into a waste bin.

# Beanus2

Beanus2 is a robot jointly researched and developed by Mitsui Chemicals, Nidec Drive Technology (formerly Nidec-Shimpo), and Mamezo. Keeping the concept of the "7-axis cooperative robot," "high-performance controller developed in-house," and "intuitive pendant using a commercial tablet" of the Beanus series, it has the following new features:

### Resin Frame
With Mitsui Chemicals' resin molding technology, most of the robot's frame is made of resin, reducing its weight by up to half compared to metal. Metal-resin integrated molding technology is used for parts that require metal joining, achieving high rigidity even with resin. Lighter weight allows for reduced impact force in collisions, increased payload, and power saving.

### High Backdrivability Gearbox
Common gearboxes make it difficult to detect external forces from motor current values, leading to the frequent use of torque sensors in each joint. By adopting Nidec-Shimpo's high-efficiency, low-friction high backdrivability gearbox, it is possible to precisely estimate external forces from motor current values.

### Sensorless Force Control
Accurate estimation of the torque in each joint is essential for force control. To estimate torque sensorlessly, it's necessary to estimate the effects of gravity, inertia, and friction. Mamezo has realized this estimation with its technology. Also, Mamezo's technology has enabled control that moves the robot softly in response to external forces.

Below is a demo video of the direct operation feature, where workers can move the robot by hand using sensorless force control.

Robots commonly use harmonic drive gearboxes, which are significantly affected by friction, making sensorless force control challenging. Friction is difficult to model accurately, making precise torque estimation difficult. Typically, approaches such as dead zone processing are adopted. However, if the dead zone is too large, small external forces cannot be detected, reducing the accuracy of force control. On the other hand, using a high backdrivability gearbox minimizes the impact of friction, allowing for the detection of minute external forces and enabling the robot to be moved with a light force as shown in the video.

In addition, we have also demonstrated non-contact collision avoidance when the robot approaches a person by combining it with an external sensor from Fogale Robotics. The external sensor is a capacitive sensor that can measure the distance to conductive objects. Mamezo has realized control to avoid collisions based on distance information.

In collaborative robots, it is common to stop the robot upon contact to ensure human safety, but at high speeds, the impact force at the moment of detection can be significant, compromising safety. Therefore, when operating in collaboration with humans, it is common to limit the operating speed. However, using external sensors allows for stopping or avoiding actions before contact, potentially relaxing speed restrictions and achieving both safety and high-speed operation.

# Conclusion

This article introduced Mamezo's original robots, Beanus and Beanus2. While we touched on the core technologies realized in Beanus, such as "7-axis robot control," "sensorless force control," and "non-contact collision avoidance," we could not cover the details. In another article, we plan to introduce these technologies in more detail.
