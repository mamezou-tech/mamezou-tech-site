---
title: 通过 MATLAB/Simulink 和 Arduino 学习 — 通过自制 S-Function 模块实现设备联动
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

## 前言：在 Simulink 与 Arduino 中开始自制 S-Function 模块

Arduino 可用的设备种类繁多，但 Simulink 并不直接支持许多传感器和显示器。  
因此，使用 **S-Function** 自制模块非常有效。  
本文以 **OLED 显示屏 SSD1306** 为例，介绍如何自制 Simulink 专用的 S-Function 模块，并在 Arduino 上运行的步骤。  

---

## 开发环境准备

- **软件**
  - MATLAB（版本：R2025a）
  - Simulink（版本：25.1）
- **应用（for Simulink）**
  - Simulink Support Package for Arduino Hardware（版本：25.1.0）
- **硬件**
  - Arduino Uno（或兼容板）
  - USB 数据线（用于 PC 与 Arduino 通信）
  - HC-SR04（超声波距离传感器）
  - OLED SSD1306（I2C 接口显示屏）

### 环境搭建详细步骤：

#### 1. 引入 MATLAB/Simulink 与基础软件包
有关 MATLAB、Simulink 以及 Arduino Support Package 的安装，请参见[上一篇文章](/blogs/2025/09/18/matlab_simulink_arduino_led_on_off/)。

#### 2. 安装 Rensselaer Arduino Support Package Library
- 启动 MATLAB → 从菜单选择 **“附加组件” → “获取硬件支持包”**   （将启动附加组件资源管理器）  
![](https://gyazo.com/9ceee87178adfec2db1a1532234d9f4b.png)

- 在搜索框输入 **“Arduino”**，然后选择 `Rensselaer Arduino Support Package Library (RASPLib)`  
![](https://gyazo.com/6db08037f57ab46fcbb8e890303561fc.png)

- 点击 **Install** 并导入包  
- 安装完成后，Simulink 库中将添加 “Rensselaer Arduino Support Package Library” 模块  
![](https://gyazo.com/26ec9b2aa134084e6941e2a0160df2c4.png)  
↓  
其中包含用于 “超声波距离传感器 HC-SR04” 的模块。为了驱动 HC-SR04，将使用此模块。  
![](https://gyazo.com/6c44a0005da7c96def362ca02e115847.png)

---

## 电路连接

### HC-SR04
- **VCC** → Arduino 5V  
- **GND** → Arduino GND  
- **Trig** → Arduino 数字引脚 7（示例）  
- **Echo** → Arduino 数字引脚 8（示例）  

### OLED SSD1306（I2C）
- **VCC** → Arduino 3.3V 或 5V  
- **GND** → Arduino GND  
- **SCL** → Arduino A5（Uno）  
- **SDA** → Arduino A4（Uno）  

## 创建用于 SSD1306 的 S-Function 模块

HC-SR04 已被 RASPLib 支持，但未找到专用支持 SSD1306 的模块，因此将通过 S-Function 模块自行创建。  

关键在于，**对于 Simulink 不直接支持的功能，可以调用 Arduino 库来补充**。Arduino 库是用 C/C++ 编写的设备控制函数集合，可以通过 S-Function 从 Simulink 模型中调用。这样，即使是 Simulink 不支持的设备，也可以**利用 Arduino 丰富的库生态系统来驱动**。  

### 选择 Arduino 用的 OLED SSD1306 库
在 Arduino 平台上知名的 OLED 库有以下几个：

- [Adafruit_SSD1306](https://github.com/adafruit/Adafruit_SSD1306)
- [Adafruit-GFX-Library](https://github.com/adafruit/Adafruit-GFX-Library)

但由于可能无法在 Uno 的 Flash 空间中安装，这里采用更轻量的 **[U8g2_Arduino](https://github.com/olikraus/U8g2_Arduino)**。U8g2 功能强大，但考虑到 Uno 的内存限制，这次只使用 **U8x8 文本模式**。  

### 项目创建

虽然 S-Function Builder 可单独使用，但在处理多个 S-Function 时，使用 **Simulink 项目功能** 会更加方便。  

1. **创建新项目**  
   - 在 MATLAB 中选择 “新建 → 项目 → 空项目”  
   - 保存位置即为“项目文件夹”  
   ![](https://gyazo.com/0c37e868197d917b5f829704eee53608.png)  

采用此方式，即使处理多个设备，也能更易整理，并提高可重用性。  

### 构建库

1. **创建新的 Simulink 库**  
   - 启动 MATLAB，使用 `simulink` 命令打开 Simulink 库浏览器  
   - 在菜单中选择 “新建 → 库” 来创建空库文件  
   - 在此处添加自制模块  
   ![](https://gyazo.com/90fbd29baeed34dfbe69bf563d8fa22e.png)

2. **在新库中放置 S-Function Builder 模块**  
   - 在新库中放置 “S-Function Builder” 模块  
   - 生成的 `.cpp` 文件和 `.tlc` 文件将与库文件一起管理  
   ![](https://gyazo.com/bb80ee8ec993e02ab03a4393e6beb5aa.png)

3. **准备外部库**  
   - 确保 Arduino 使用的 `Wire.h` 和 `U8x8lib.h` 可被包含  
   - 将 `U8g2_Arduino` 放置在 `C:\ProgramData\MATLAB\thirdpartylibs\U8g2_Arduino` 等目录下  
   - 根据环境确认 Support Package 的路径  

### 使用 S-Function Builder 自制模块

这次，我们简化规格，以使其在较少内存下也可运行。设计为使用 U8g2 的 U8x8 文本模式，在 SSD1306 128×64 (I²C) 上显示一行 ASCII 字符串（最多 16 字符）。  

项目名称：`sfun_ssd1306_u8x8_display_block`  
S-Function 名称：`sfun_ssd1306_u8x8_display`  
语言：C++  

- 源代码：  
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
    // 字体（轻量级 ASCII 字体）
    u8x8.setFont(u8x8_font_chroma48medium8_r);
    // 如有需要可指定 I2C 地址（通常的 0x3C 的 8 位表示）
    // u8x8.setI2CAddress(0x3C << 1);  // 仅在无显示时尝试
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

  // 根据输入向量长度进行调整
  const uint8_t MAX_STR = 16;

  char buf[MAX_STR + 1];
  uint8_t i = 0;
  for (; i < MAX_STR; ++i) {
    uint8_t b = u[i];
    buf[i] = (char)b;
    if (b == 0) break;
  }
  buf[(i < MAX_STR) ? i : MAX_STR] = '\0';

  // 在第 1 行 (行=0) 显示 ASCII 字符串
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

- 端口和参数：  
![](https://gyazo.com/ea0dbe48e6d3233855778a86d4675f36.png)

- 外部代码：  
将所需的 “U8g2_Arduino” 使用 Git 克隆到以下路径：  
`C:\ProgramData\MATLAB\thirdpartylibs\U8g2_Arduino`  
Arduino Support Package 的路径为：（取决于 MATLAB 安装环境，请在各自环境中确认 Support Package 的路径）  
`C:\ProgramData\MATLAB\SupportPackages\R2025a\aCLI\data\packages\arduino`  
![](https://gyazo.com/7a55a525705dc828420b22d7b0bcc929.png)

### 构建与库注册

构建 S-Function 后，将生成以下文件：  
![](https://gyazo.com/9c7c577deac87dc0f46806d49d4cebae.png)

- `.cpp`（主体源代码）  
- `_wrapper.cpp`（包装代码）  
- `.tlc`（目标语言编译器用）  
- `.mexw64`（Windows 平台二进制）  

```text
### 输出文件夹是 'C:\Users\<用户名>\Documents\MATLAB\sfun_ssd1306_u8x8_display_block'
### 'sfun_ssd1306_u8x8_display.cpp' 已成功创建
### 'sfun_ssd1306_u8x8_display_wrapper.cpp' 已成功创建
### 'sfun_ssd1306_u8x8_display.tlc' 已成功创建
### S-Function 'sfun_ssd1306_u8x8_display.mexw64' 已成功创建
```

此外，要在库浏览器中注册，还需准备以下文件：  
- `slblocks.m`（必需）  
- `setup.m`（推荐）  
- `INSTALL.m`（可选）※在分发项目时很方便

slblocks.m
```text
function blkStruct = slblocks
% 此函数用于将指定库显示在 Simulink 库浏览器中。

    % --- 库的注册信息 ---
    % 在 Browser.Library 中指定库文件名（不含扩展名）。
    Browser.Library = 'ssd1306_u8x8_display_lib';

    % 在 Browser.Name 中指定在库浏览器中显示的名称。
    Browser.Name = 'Arduino SSD1306 U8x8 display library';

    % --- 汇总到结构体中 ---
    blkStruct.Browser = Browser;

end
```

setup.m
```text
function setup
addpath(fileparts(mfilename('fullpath')));   % #ok<MCAP> 将此文件夹添加到 PATH
try
    lb = LibraryBrowser.LibraryBrowser2;
    refresh(lb);
catch
    sl_refresh_customizations;
end
% 依赖检查（例如：Arduino 支持）
% assert(exist('arduino','file')~=0, 'Install MATLAB Support Package for Arduino');
end
```

INSTALL.m
```text
%% Add library to path
addpath(pwd);
savepath;

%% Refresh library browser
lb = LibraryBrowser.LibraryBrowser2;
refresh(lb);
```

在路径设置中注册路径。  
![](https://gyazo.com/55d95206419a8887fb0f15cfabd96797.png)

注册成功后，自制的 SSD1306 模块将添加到 Simulink 库中。  
![](https://gyazo.com/a47f143e62810d41c68b31462262ada1.png)

---

## 创建主 Simulink 模型

### 创建新模型

1. 启动 Simulink，创建新的“空模型”  
![](https://gyazo.com/cdace23527b4c533399601303b5f7b57.png)

2. 从模块库中添加以下内容：  
   - HC-SR04 模块（RASPLib）  
   - 用于 SSD1306 显示的 S-Function 模块（自制）  
   - 字符串处理模块（常数字符串、数字→字符串转换、字符串拼接、字符串→ASCII转换）  
   - 显示模块（用于调试确认）  
   ![](https://gyazo.com/7037b58004ce62bf5e537ad5ff25c714.png)

### 参数设置

在 “硬件设置” – “硬件执行” 中进行如下设置：  
  - 硬件执行  
![](https://gyazo.com/cfbfb0463f4056e55a6ba8d234547e90.png)

---

## 写入 Arduino 并运行

将程序上传到 Arduino，使其可以自动运行。

1. 执行 Simulink 的 “构建、部署并启动”  
![](https://gyazo.com/e3b97bb638ba9f6f7c68296969acfeef.png)

2. 编译 → 传输到 Arduino  
   传输成功后，将输出如下日志：  
![](https://gyazo.com/7df4cece5f2ae23f56b1d61a728261cf.png)

超声波距离传感器测量到的物体距离现在会显示在 OLED 上。  
![](https://gyazo.com/7cbb2ebfaeab8ae4df766cd18d58d664.png)  
（数值有点难以读取，此处放置了大约 7 cm 的障碍物）

---

## 运行结果与分析

- 成功地将 HC-SR04 获取到的距离即时显示在 OLED 上，实现了通过 Simulink 集成传感器与显示器  
- 由于 Uno 的内存限制，难以使用 U8g2 的全缓冲功能，但 U8x8 模式轻量且实用  
- 在此架构下 **传感器输入 → 字符串转换 → 显示输出** 能够直观地构建  
- 今后可通过参数化实现 **可变行列位置显示**、**字体切换**、**I²C 地址指定** 等功能，将其发展为更通用的模块

---

## 总结

- **HC-SR04** 利用 RASPLib 即可在 Simulink 上轻松使用。  
- **SSD1306** 通过自制 S-Function 可以扩展其显示功能。  
- **U8g2 库** 利用 U8x8 模式，考虑内存限制，是实用的选择。  
- 结合项目功能与 slblocks/setup/INSTALL，可以轻松进行库管理和分发。  

- 本次实践展示了使用 Arduino 进行 **多设备集成的一个示例**。  
- 将来可将此方法推广到其他传感器和执行器，丰富库内容，进一步拓展模型驱动开发的应用范围。  

---

<style>
img {
    border: 1px gray solid;
}
</style>
