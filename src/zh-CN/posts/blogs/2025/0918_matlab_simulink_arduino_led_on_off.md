---
title: 挑战使用MATLAB/Simulink和Arduino实现LED闪烁控制（L闪）
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

## 引言：使用 Simulink 和 Arduino 开始“L闪”

**“L闪”（LED 闪烁）** 是硬件控制入门中最基本的实验。  
在本篇文章中，我将解说**如何将 MATLAB/Simulink 与 Arduino 联动**，以及创建 LED 闪烁程序的方法。

---

## 开发环境准备

- **软件**
  - MATLAB（版本：R2025a）
  - Simulink（版本：25.1）
- **应用（for Simulink）**
  - Simulink Support Package for Arduino Hardware（版本：25.1.0）
- **硬件**
  - Arduino Uno/Nano（或兼容板）
  - USB 数据线（用于 PC 与 Arduino 通信）
- **（可选）**
  - LED + 电阻（约 330Ω）
  - 面包板、跳线

### 环境搭建详细步骤：

#### 1. 安装 MATLAB 和 Simulink
- 从 MathWorks 官方网站下载安装程序  
- 进行许可证认证，安装 MATLAB 和 Simulink  
- 安装时请务必勾选“Simulink”组件  

#### 2. 导入 Arduino 支持包
- 启动 MATLAB → 从菜单选择 **“附加组件” → “获取硬件支持包”**（附加组件资源管理器将启动）  
![](https://gyazo.com/9ceee87178adfec2db1a1532234d9f4b.png)

- 在搜索框中输入 **“Arduino”**，选择 `Simulink Support Package for Arduino Hardware`  
![](https://gyazo.com/1ac037a6c8cb0717eb32b943603c6279.png)

- 点击 **Install** 并安装该包  
- 安装完成后，Simulink 库中将添加“Simulink Support Package for Arduino Hardware”模块  
![](https://gyazo.com/ef646001e6b629551be16d102fbc76a5.png)

#### 3. 确认 Arduino 的串口通信
- 将 Arduino 板通过 USB 连接到 PC，会自动识别驱动  
- 如果未识别，请在设备管理器（Windows）或使用 `ls /dev/tty*`（Mac/Linux）检查端口（※下图示例连接在 COM7）  
![](https://gyazo.com/3a1f36c3ded15efa1a0b255064fe8720.png)

---

## 电路连接

将 Arduino 的 **13 号引脚** 和 GND 连接到 LED + 电阻。  
（如果使用板载 LED，则无需外部接线）

电路示意图：
```
(Arduino 13) ----[电阻330Ω]----|>|(LED)---- (GND)
```

---

## 创建 Simulink 模型

### 创建新模型

1. 启动 Simulink，创建一个新的“空模型”  
![](https://gyazo.com/cdace23527b4c533399601303b5f7b57.png)

2. 从模块库中放置以下模块：
   - Pulse Generator（生成脉冲波形）  
![](https://gyazo.com/6b0df6c3e58e40f2e98a1b5bb224a2b4.png)

   - Digital Output（Arduino 引脚输出）：该模块包含在“Simulink Support Package for Arduino Hardware”中。  
![](https://gyazo.com/20a0754c9292245eaa1a7f85244011cd.png)

   - 将放置的模块连接如下：  
![](https://gyazo.com/47ca7f677e8222acc896e822bf5926ed.png)

### 参数设置
设置刚才放置模块的参数。

- **Pulse Generator**
  - 脉冲类型：“基于采样”
  - 时间：“使用仿真时间”
  - 幅值：1
  - 周期（采样数）：1000
  - 脉宽（采样数）：500
  - 相位延迟（采样数）：0
  - 采样时间：0.001
  - 将向量参数解释为一维：勾选  
![](https://gyazo.com/6b876f9cb98643fcac7181116f861c6b.png)

- **Digital Output**
  - 引脚编号：13  
![](https://gyazo.com/7186e934cc55fcf82814ba0c01067c47.png)

:::info
由于采样时间为“0.001”(秒)，采样周期为“1000”，因此周期（时间）为“1（秒）”。  
脉宽设置为“500”，因此在此设置下，LED 将每 500 毫秒重复 ON/OFF。
:::

### 模型设置
按如下方式配置硬件参数。  
（本次使用了 Arduino Nano 兼容板。由于兼容板使用的是旧版 bootloader，应用下载的波特率较低）  
- 硬件实现  
![](https://gyazo.com/032099d6556f02ee155fe6e574bf984d.png)

---

## 确认脉冲发生器输出
在将应用程序上传到 Arduino 之前，先确认脉冲是否正确输出。

1. 设置信号日志（点击连接线，启用“信号日志”）  
![](https://gyazo.com/31f387eef75d6c23817b4b73db1cd534.png)  
↓  
可通过图标确认信号日志已设置  
![](https://gyazo.com/b69de6f744961a53bb98befb214be63a.png)

2. 运行仿真  
![](https://gyazo.com/bc9cba6c4fc136cf9fe37732c72bdb4e.png)

3. 可在数据检查器中查看脉冲波形  
![](https://gyazo.com/916a9aacabd53bddc703740a90b0c8fc.png)

---

## 监视与调整（通过 USB 端口确认运行）
通过 USB 将程序传输到 Arduino Nano，确认程序是否正常运行。

1. 在硬件选项卡中执行“监视与调整”（在结束时间设置为“inf”，程序将持续运行直到手动停止）  
![](https://gyazo.com/762cd9896aebc396b0be64f9772ba9cb.png)

2. 如果 Arduino 板载 LED 以 1 秒周期闪烁，则模型已正确运行  
![](https://gyazo.com/a6d9b1019ceb29cc92523ad3bd6890b9.png)

---

## 写入并运行 Arduino
将程序上传到 Arduino，使其能够自动运行。

1. 在 Simulink 中执行“构建、部署并启动”  
![](https://gyazo.com/e3b97bb638ba9f6f7c68296969acfeef.png)

2. 编译 → 传输到 Arduino  
   传输成功后，将输出以下日志。  
   如果 LED 以每秒闪烁一次，则表示传输成功。  
![](https://gyazo.com/b2f102adc2e50a980ae93b782e7aef66.png)

---

## 运行结果与思考

- 仅需连接两个模块，就能轻松创建 LED 闪烁程序。  
- 缩短周期即可实现“高速闪烁”（例如，周期设为100，脉宽设为50 等）。  
- 通过改变脉宽 (占空比)，可应用于**亮度控制（PWM 基础）**。

---

## 总结

- 通过将 MATLAB/Simulink 与 Arduino 结合，**可以基于方块图直观地开发控制程序**。  
- LED 闪烁是一个简单的示例，但可扩展到 PWM 控制、传感器输入、马达控制等应用。

如果仅仅是让 LED 闪烁，使用 Arduino IDE 或 PlatformIO 等开发环境编程可能更快速，但在今后进行复杂编程时，我认为 MATLAB/Simulink 将成为 MBD 开发的强大工具。  
今后我想制作自定义库，并连接更高级的外围设备来进行更细致的编程挑战。  

---

<style>
img {
    border: 1px gray solid;
}
</style>
