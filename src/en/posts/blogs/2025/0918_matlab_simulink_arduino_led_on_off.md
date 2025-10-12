---
title: Trying LED Blinking Control (L-Chika) with MATLAB/Simulink and Arduino
author: shuichi-takatsu
date: 2025-09-18T00:00:00.000Z
tags:
  - MATLAB
  - simulink
  - arduino
  - led
  - model
image: true
translate: true

---

## Introduction: Getting Started with "L-Chika" Using Simulink and Arduino

**"L-Chika" (LED blinking)** is the most fundamental experiment for an introduction to hardware control.  
In this article, we explain how to create a program to blink an LED by **integrating MATLAB/Simulink with Arduino**.

---

## Preparing the Development Environment

- **Software**
  - MATLAB (Version: R2025a)
  - Simulink (Version: 25.1)
- **App (for Simulink)**
  - Simulink Support Package for Arduino Hardware (Version: 25.1.0)
- **Hardware**
  - Arduino Uno/Nano (or compatible board)
  - USB cable (for communication between PC and Arduino)
- **(Optional)**
  - LED + resistor (around 330 Ω)
  - Breadboard, jumper wires

### Detailed Steps for Environment Setup:

#### 1. Install MATLAB and Simulink
- Download the installer from MathWorks’ official website  
- Perform license activation and install MATLAB and Simulink  
- Make sure to check the “Simulink” component during installation  

#### 2. Install the Arduino Support Package
- Launch MATLAB → From the menu, select **Add-Ons → Get Hardware Support Packages** (This opens the Add-On Explorer)  
![](https://gyazo.com/9ceee87178adfec2db1a1532234d9f4b.png)

- Type **"Arduino"** into the search box and select `Simulink Support Package for Arduino Hardware`  
![](https://gyazo.com/1ac037a6c8cb0717eb32b943603c6279.png)

- Click **Install** to add the package  
- After installation, the “Simulink Support Package for Arduino Hardware” blocks will appear in the Simulink library  
![](https://gyazo.com/ef646001e6b629551be16d102fbc76a5.png)

#### 3. Verify Arduino Serial Communication
- When you connect the Arduino board to your PC via USB, the driver is automatically recognized  
- If it’s not recognized, check the port in Device Manager (Windows) or with `ls /dev/tty*` (Mac/Linux) (the example below shows it connected to COM7)  
![](https://gyazo.com/3a1f36c3ded15efa1a0b255064fe8720.png)

---

## Circuit Connection

Connect the LED + resistor between Arduino **pin 13** and GND.  
(If you use the built-in LED, no external wiring is required.)

Circuit diagram example:
```
(Arduino 13) ----[330Ω resistor]----|>|(LED)---- (GND)
```

---

## Creating the Simulink Model

### Creating a New Model

1. Launch Simulink and create a new “Blank Model”  
![](https://gyazo.com/cdace23527b4c533399601303b5f7b57.png)

2. From the block library, add the following blocks:
   - Pulse Generator (generates a pulse waveform)  
![](https://gyazo.com/6b0df6c3e58e40f2e98a1b5bb224a2b4.png)

   - Digital Output (Arduino pin output): this block is included in the “Simulink Support Package for Arduino Hardware.”  
![](https://gyazo.com/20a0754c9292245eaa1a7f85244011cd.png)

   - Connect the placed blocks as follows:  
![](https://gyazo.com/47ca7f677e8222acc896e822bf5926ed.png)

### Parameter Settings
Set the parameters for the blocks you placed.

- **Pulse Generator**
  - Pulse type: “Sample based”
  - Time: “Use simulation time”
  - Amplitude: 1
  - Period (samples): 1000
  - Pulse width (samples): 500
  - Phase delay (samples): 0
  - Sample time: 0.001
  - Interpret vector parameters as 1-D: checked  
![](https://gyazo.com/6b876f9cb98643fcac7181116f861c6b.png)

- **Digital Output**
  - Pin number: 13  
![](https://gyazo.com/7186e934cc55fcf82814ba0c01067c47.png)

:::info
With a sample time of 0.001 seconds and a sample period of 1000, the period (time) becomes 1 second.  
Since the pulse width is set to 500, the LED will toggle ON/OFF every 500 milliseconds with this configuration.
:::

### Model Configuration
Configure the hardware board as follows.  
(In this example, we used an Arduino Nano-compatible board. The compatible board’s bootloader was an older version, so the baud rate for application download is lower.)  
- Hardware board:  
![](https://gyazo.com/032099d6556f02ee155fe6e574bf984d.png)

---

## Verifying the Pulse Generator Output
Before uploading the application to the Arduino, verify that the pulse is being output correctly.

1. Set up signal logging (click the connection line and enable “Log Signal”)  
![](https://gyazo.com/31f387eef75d6c23817b4b73db1cd534.png)  
You can confirm that signal logging is enabled by the icon  
![](https://gyazo.com/b69de6f744961a53bb98befb214be63a.png)

2. Run the simulation  
![](https://gyazo.com/bc9cba6c4fc136cf9fe37732c72bdb4e.png)

3. Check the pulse waveform in the Data Inspector  
![](https://gyazo.com/916a9aacabd53bddc703740a90b0c8fc.png)

---

## Monitor and Tune (Verifying Execution via USB Port)
Transfer the program to the Arduino Nano via USB and verify that the program runs correctly.

1. In the Hardware tab, select “Monitor & Tune” (set the stop time to “inf” so it continues running until you stop it)  
![](https://gyazo.com/762cd9896aebc396b0be64f9772ba9cb.png)

2. If the Arduino’s built-in LED blinks with a 1-second period, the model is running correctly  
![](https://gyazo.com/a6d9b1019ceb29cc92523ad3bd6890b9.png)

---

## Writing to Arduino and Execution
Upload the program to the Arduino and enable automatic execution.

1. In Simulink, select “Build, Deploy & Start”  
![](https://gyazo.com/e3b97bb638ba9f6f7c68296969acfeef.png)

2. The process compiles and transfers to the Arduino.  
   When the transfer succeeds, the following log is displayed.  
   If the LED blinks every second, the transfer was successful.  
![](https://gyazo.com/b2f102adc2e50a980ae93b782e7aef66.png)

---

## Results and Discussion

- With just two blocks connected, it was easy to create an LED blinking program.
- Reducing the period results in “fast blinking” (for example, a period of 100 and a pulse width of 50).
- By changing the pulse width (duty cycle), you can also apply this to **brightness control (the basics of PWM)**.

---

## Conclusion

- Combining MATLAB/Simulink with Arduino demonstrated that **you can intuitively develop control programs using block diagrams**.
- Although LED blinking is a simple example, it can be extended to PWM control, sensor input, motor control, and more.

If you only need to blink an LED, programming in an environment such as the Arduino IDE or PlatformIO might be faster. However, for more complex programming in the future, I feel that MATLAB/Simulink will become a powerful tool for model-based design (MBD) development.  
Going forward, I plan to create custom libraries and connect advanced peripherals to tackle more detailed programming challenges.

---

<style>
img {
    border: 1px gray solid;
}
</style>
