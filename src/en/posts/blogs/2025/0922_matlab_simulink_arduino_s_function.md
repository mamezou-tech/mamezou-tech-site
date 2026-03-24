---
title: >-
  Learning MATLAB/Simulink and Arduino — Device Integration with Custom
  S-Function Blocks
author: shuichi-takatsu
date: 2025-09-22T00:00:00.000Z
tags:
  - MATLAB
  - simulink
  - arduino
  - s-function
image: true
translate: true

---

## Introduction: Creating Custom S-Function Blocks with Simulink and Arduino

Arduino supports a wide range of devices, but there are many sensors and displays not directly supported by Simulink.  
This is where custom blocks using **S-Function** come in handy.  
In this article, using the **OLED Display SSD1306** as an example, we will introduce the steps to create a custom S-Function block for Simulink and run it on Arduino.  

---

## Preparation of the Development Environment

- **Software**
  - MATLAB (Version: R2025a)
  - Simulink (Version: 25.1)
- **Add-Ons (for Simulink)**
  - Simulink Support Package for Arduino Hardware (Version: 25.1.0)
- **Hardware**
  - Arduino Uno (or compatible board)
  - USB cable (for communication between PC and Arduino)
  - HC-SR04 (ultrasonic distance sensor)
  - OLED SSD1306 (I2C-connected display)

### Detailed Steps for Environment Setup:

#### 1. Installing MATLAB/Simulink and Basic Packages  
For instructions on installing MATLAB, Simulink, and the Arduino Support Package, refer to [the previous article](/blogs/2025/09/18/matlab_simulink_arduino_led_on_off/).

#### 2. Installing the Rensselaer Arduino Support Package Library  
- Launch MATLAB → from the menu select **Add-Ons** → **Get Hardware Support Packages** (the Add-On Explorer will open)  
![](https://gyazo.com/9ceee87178adfec2db1a1532234d9f4b.png)

- In the search box, type **"Arduino"** and select `Rensselaer Arduino Support Package Library (RASPLib)`  
![](https://gyazo.com/6db08037f57ab46fcbb8e890303561fc.png)

- Click **Install** to add the package  
- After installation, the "Rensselaer Arduino Support Package Library" blocks will be added to the Simulink library  
![](https://gyazo.com/26ec9b2aa134084e6941e2a0160df2c4.png)  
↓  
Inside, there is a block for the ultrasonic distance sensor HC-SR04. We will use this block to operate the HC-SR04.  
![](https://gyazo.com/6c44a0005da7c96def362ca02e115847.png)

---

## Circuit Connections

### HC-SR04
- **VCC** → Arduino 5V  
- **GND** → Arduino GND  
- **Trig** → Arduino Digital Pin 7 (example)  
- **Echo** → Arduino Digital Pin 8 (example)  

### OLED SSD1306 (I2C)
- **VCC** → Arduino 3.3V or 5V  
- **GND** → Arduino GND  
- **SCL** → Arduino A5 (for Uno)  
- **SDA** → Arduino A4 (for Uno)  

## Creating the S-Function Block for SSD1306

The HC-SR04 is supported by RASPLib, but since we couldn't find a dedicated block for the SSD1306, we will create one ourselves using an S-Function block.

The key point here is that **features not directly supported by Simulink can be supplemented by calling Arduino libraries**. Arduino libraries are collections of device-control functions written in C/C++, and can be invoked from a Simulink model via an S-Function. This allows even devices not supported by Simulink to be operated by **leveraging the extensive Arduino library ecosystem**.

### Selecting an Arduino OLED SSD1306 Library

Well-known Arduino OLED libraries include:

- [Adafruit_SSD1306](https://github.com/adafruit/Adafruit_SSD1306)
- [Adafruit-GFX-Library](https://github.com/adafruit/Adafruit-GFX-Library)

However, since these may not fit into the Uno's flash memory, we will use the more lightweight **[U8g2_Arduino](https://github.com/olikraus/U8g2_Arduino)**. U8g2 is feature-rich, but considering the Uno's memory constraints, we will use **only the U8x8 text mode** in this example.

### Creating the Project

The S-Function Builder can be used on its own, but when dealing with multiple S-Functions, it's convenient to use the **Simulink Project feature**.

1. Creating a New Project  
   - In MATLAB, select "New → Project → Blank Project"  
   - The chosen folder becomes the "Project Folder"  
   ![](https://gyazo.com/0c37e868197d917b5f829704eee53608.png)  

This approach makes it easier to organize multiple devices and enhances reusability.

### Creating the Library

1. Creating a New Simulink Library  
   - Launch MATLAB and open the Simulink Library Browser using the `simulink` command  
   - From the menu, select "New → Library" to create an empty library file  
   - You will add your custom blocks here  
   ![](https://gyazo.com/90fbd29baeed34dfbe69bf563d8fa22e.png)

2. Placing the S-Function Builder Block  
   - Place an "S-Function Builder" block in the new library  
   - The generated `.cpp` and `.tlc` files will be managed in sync with the library  
   ![](https://gyazo.com/bb80ee8ec993e02ab03a4393e6beb5aa.png)

3. Preparing External Libraries  
   - Prepare so that Arduino headers like `Wire.h` and `U8x8lib.h` can be included  
   - Place `U8g2_Arduino` in, for example, `C:\ProgramData\MATLAB\thirdpartylibs\U8g2_Arduino`  
   - Also verify the Support Package path according to your environment  

### Creating the Block with S-Function Builder

In this example, we will simplify the specifications and design for operation with minimal memory. The specification is to display a single line of ASCII text (up to 16 characters) on an SSD1306 128×64 (I²C) using U8g2's U8x8 text mode.

Project Name: `sfun_ssd1306_u8x8_display_block`  
S-Function Name: `sfun_ssd1306_u8x8_display`  
Language: C++  

- Source code:  
```cpp
/* Includes_BEGIN */
#ifndef MATLAB_MEX_FILE
  #include <Arduino.h>
  #include <Wire.h>
  #include <U8x8lib.h>
  // SSD1306 128x64 via hardware I2C, no reset pin (UNO: SCL=A5, SDA=A4)
  static U8X8_SSD1306_128X64_NONAME_HW_I2C u8x8(/* reset = */ U8X8_PIN_NONE);
  static bool isDisplayInitialized_u8x8 = false;
#endif
/* Includes_END */

/* Externs_BEGIN */
/* extern double func(double a); */
/* Externs_END */

void sfun_ssd1306_u8x8_display_Start_wrapper(void)
{
/* Start_BEGIN */
#if !defined(MATLAB_MEX_FILE)
  if (!isDisplayInitialized_u8x8) {
    u8x8.begin();
    u8x8.setPowerSave(0);
    // Font (lightweight ASCII font)
    u8x8.setFont(u8x8_font_chroma48medium8_r);
    // Optionally specify the I2C address (common 0x3C in 8-bit representation)
    // u8x8.setI2CAddress(0x3C << 1);  // Try only if nothing is displayed
    u8x8.clearDisplay();
    isDisplayInitialized_u8x8 = true;
  }
#endif
/* Start_END */
}

void sfun_ssd1306_u8x8_display_Outputs_wrapper(const uint8_T *u)
{
/* Output_BEGIN */
#if !defined(MATLAB_MEX_FILE)
  if (!isDisplayInitialized_u8x8) return;

  // Adjust based on input vector length
  const uint8_t MAX_STR = 16;

  char buf[MAX_STR + 1];
  uint8_t i = 0;
  for (; i < MAX_STR; ++i) {
    uint8_t b = u[i];
    buf[i] = (char)b;
    if (b == 0) break;
  }
  buf[(i < MAX_STR) ? i : MAX_STR] = '\0';

  // Display ASCII string on the first line (row=0)
  u8x8.clearLine(0);
  u8x8.drawString(0, 0, buf);
#endif
/* Output_END */
}

void sfun_ssd1306_u8x8_display_Terminate_wrapper(void)
{
/* Terminate_BEGIN */
#if !defined(MATLAB_MEX_FILE)
// nothing
#endif
/* Terminate_END */
}
```

- Ports and parameters:  
![](https://gyazo.com/ea0dbe48e6d3233855778a86d4675f36.png)

- External Code:  
Clone the required `U8g2_Arduino` via Git at:  
`C:\ProgramData\MATLAB\thirdpartylibs\U8g2_Arduino`  
The Arduino Support Package path was as follows (this depends on your MATLAB installation, so please verify the Support Package path in your environment):  
`C:\ProgramData\MATLAB\SupportPackages\R2025a\aCLI\data\packages\arduino`  
![](https://gyazo.com/7a55a525705dc828420b22d7b0bcc929.png)

### Build and Library Registration

When you build the S-Function, the following files are generated:  
![](https://gyazo.com/9c7c577deac87dc0f46806d49d4cebae.png)

- `.cpp` (main source)  
- `_wrapper.cpp` (wrapper code)  
- `.tlc` (Target Language Compiler file)  
- `.mexw64` (Windows binary)  

```text
### Output folder is 'C:\Users\<UserName>\Documents\MATLAB\sfun_ssd1306_u8x8_display_block'
### 'sfun_ssd1306_u8x8_display.cpp' was successfully created
### 'sfun_ssd1306_u8x8_display_wrapper.cpp' was successfully created
### 'sfun_ssd1306_u8x8_display.tlc' was successfully created
### S-Function 'sfun_ssd1306_u8x8_display.mexw64' was successfully created
```

Additionally, to register with the Library Browser, prepare the following files:  
- `slblocks.m` (required)  
- `setup.m` (recommended)  
- `INSTALL.m` (optional) *Useful when distributing the project.*  

slblocks.m  
```matlab
function blkStruct = slblocks
% This function is defined to display the specified library
% in the Simulink Library Browser.

    % --- Library registration information ---
    % Set Browser.Library to the library file name (without extension).
    Browser.Library = 'ssd1306_u8x8_display_lib';

    % Set Browser.Name to the name you want to display in the library browser.
    Browser.Name = 'Arduino SSD1306 U8x8 display library';

    % --- Combine into the structure ---
    blkStruct.Browser = Browser;

end
```

setup.m  
```matlab
function setup
addpath(fileparts(mfilename('fullpath')));   % #ok<MCAP> Add current folder to PATH
try
    lb = LibraryBrowser.LibraryBrowser2;
    refresh(lb);
catch
    sl_refresh_customizations;
end
% Dependency check (e.g., Arduino support)
% assert(exist('arduino','file')~=0, 'Install MATLAB Support Package for Arduino');
end
```

INSTALL.m  
```matlab
%% Add library to path
addpath(pwd);
savepath;

%% Refresh library browser
lb = LibraryBrowser.LibraryBrowser2;
refresh(lb);
```

Register the path in the path settings.  
![](https://gyazo.com/55d95206419a8887fb0f15cfabd96797.png)

When registration succeeds, your custom SSD1306 block is added to the Simulink library.  
![](https://gyazo.com/a47f143e62810d41c68b31462262ada1.png)

---

## Creating the Main Simulink Model

### Creating a New Model

1. Launch Simulink and create a new "Blank Model"  
![](https://gyazo.com/cdace23527b4c533399601303b5f7b57.png)

2. From the block library, place the following:  
   - HC-SR04 block (RASPLib)  
   - SSD1306 display S-Function block (custom)  
   - String processing blocks (constant string, number-to-string conversion, string concatenation, string-to-ASCII conversion)  
   - Display block (for debugging)  
   ![](https://gyazo.com/7037b58004ce62bf5e537ad5ff25c714.png)

### Parameter Settings

Set "Hardware Settings" → "Hardware Execution" as follows:  
- Hardware Execution  
![](https://gyazo.com/cfbfb0463f4056e55a6ba8d234547e90.png)

---

## Uploading to Arduino and Execution

We will upload the program to the Arduino and enable automatic execution.

1. In Simulink, run "Build, Deploy & Start"  
![](https://gyazo.com/e3b97bb638ba9f6f7c68296969acfeef.png)

2. Compile → Transfer to Arduino  
When the transfer is successful, the following log is output:  
![](https://gyazo.com/7df4cece5f2ae23f56b1d61a728261cf.png)

The distance to the object measured by the ultrasonic distance sensor is now displayed on the OLED.  
![](https://gyazo.com/7cbb2ebfaeab8ae4df766cd18d58d664.png)  
(The numbers are a bit hard to read, but an obstacle is placed at about 7 cm.)

---

## Results and Discussion

- The distance obtained by the HC-SR04 can be instantly displayed on the OLED, allowing integration of sensor and display via Simulink.  
- Due to the Uno's memory constraints, using U8g2's full-buffer mode is difficult, but the U8x8 mode is lightweight and practical.  
- With this setup, **sensor input → string conversion → display output** can be constructed intuitively.  
- Going forward, by parameterizing features such as **variable row/column display positions**, **font switching**, and **I²C address specification**, the block can be developed into a more versatile component.

---

## Conclusion

- **HC-SR04** can be easily used in Simulink by leveraging RASPLib.  
- **SSD1306** display functionality can be extended by creating a custom S-Function.  
- It is practical to use the **U8g2 library** in U8x8 mode to accommodate memory constraints.  
- By combining the Project feature with slblocks/setup/INSTALL, managing and distributing the library becomes easy.

- This effort demonstrates an **example of integrating multiple devices** using Arduino.  
- In the future, this approach can be applied to other sensors and actuators, enriching the library and further expanding the scope of model-based development.

---

<style>
img {
    border: 1px gray solid;
}
</style>
