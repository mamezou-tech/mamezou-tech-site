---
title: 使用ATtiny13A制作能用纽扣电池驱动的吸顶灯遥控器【准备篇】
author: shuji-morimoto
date: 2025-03-28T00:00:00.000Z
tags:
  - 電子工作
  - IRリモコン
  - arduino
  - ATtiny13A
  - AVR
image: true
translate: true

---
![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/attiny13a.png)
在这一年中，工作上使用C#进行开发，依托充足的开发环境以及CPU和内存资源，并不追求速度和内存效率，而是采用[「富豪的プログラミング」](http://www.pitecan.com/fugo.html)来开发。

另一方面，在私下我也利用Arduino进行了各种电子制作，并一直乐在其中。于是我便想到，
「微控制器的规格完全没有发挥到极致啊」
。

这种仅有一颗芯片、可以放在手掌中的微控制器，以前我做的作品都没有太在意速度、程序大小和数据大小等问题。可用的引脚也多得很，微控制器内部功能也仅仅用了其中1到2项，以至于没有那种将性能发挥到极限的成就感。即使在Arduino上，我也采用了「富豪的プログラミング」。

因此这次虽然背道而驰，但以
「将硬件性能发挥到极限，用低预算制作一些实用的东西」
为主题，挑战制作吸顶灯（LED照明）的遥控器。

由于文章内容较多，所以分为【准备篇】、【开发篇】、【基板・外壳制作篇】来描述。整个过程既是制作备忘录，也记录了我的制作历程。


# ATtiny13A概述
虽然Arduino有各种不同的型号，但Arduino Uno R3使用的是名为ATMega328P的微控制器。AT代表开发该微控制器的Atmel公司[^b]，而Mega则意味着“大”。没错，虽然叫做微控制器，但其中的CPU却是“大”级别的。当我寻找适用于Arduino开发环境的更小型（Tiny）的微控制器时，就发现了ATtiny13A。

## ATtiny13A的主要规格

摘自ATtiny13A的数据手册中的部分内容[^c]

| 项目 | 规格及概述 |
| ---- | ---------- |
| CPU | AVR 8Bit 微控制器 |
| クロック | 最大20MHz |
| 動作電圧 | 1.8-5.5V |
| フラッシュメモリ | 非易失性存储器（高速·大容量）1024Byte（程序存储区域） |
| EEPROM | 非易失性存储器（低速·小容量）64Byte（数据存储区域） |
| SRAM | 易失性存储器（高速）64Byte（工作内存） |
| タイマー | 1个8Bit定时器 |
| アナログデジタル変換 | 4通道 10Bit |

AVR微控制器采用所谓的[哈佛架构](https://ja.wikipedia.org/wiki/%E3%83%8F%E3%83%BC%E3%83%90%E3%83%BC%E3%83%89%E3%83%BB%E3%82%A2%E3%83%BC%E3%82%AD%E3%83%86%E3%82%AF%E3%83%81%E3%83%A3)，即程序指令和数据在物理上是分开的，所以在编写程序时必须关注程序大小和数据大小。

由于ATtiny13A能够在1.8V下工作，所以可以用钮扣电池（3V）供电。程序容量仅限于闪存的1024Byte，数据容量仅有SRAM的64Byte。在这有限的空间内如何编写程序便成为关键所在。

顺便提一句，顶部图片中为了表现ATtiny13A的体积感，将其与单4电池放在一起拍摄。该图片尺寸为135KByte(139190Byte)，大约是ATtiny13A闪存1024Byte容量的135倍。仅仅1024Byte的容量能否写出遥控器程序，让我有些担心。

:::info
程序以C/C++编写（也可使用汇编语言）。由于SRAM只有64Byte，所以字符串数据（ASCII）最多只能使用64个字符，插入调试语句会消耗宝贵的程序容量和数据容量，从而无法放心使用。而且硬件上也并不支持调试输出（UART）🫠
:::

## 引脚布局
![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/pin_config.png)

ATtiny13A共有8个引脚，从左上角开始，逆时针依次编号1到8。
其中pin8用作电源，pin4连接GND，因此功能分配在除1和4之外的其他6个引脚（1～3及5～7）。
每个引脚除了作为表示输入输出端口的PB（共有0到5的6个）外，还可以分配上表中提到的其他功能中的一项。
例如，pin6可以使用INT0，而INT0代表外部中断。
将开关或按钮接在pin6上，当其状态发生变化时，就可以调用外部中断处理函数。
此外，ADC0至ADC3在各自的引脚上均可使用。ADC功能用于读取模拟值（电压值），并转换为10位（1024级）数值。

需要注意的是，每个引脚可以使用的功能各不相同。

如果使用Arduino的API，配置会非常简单。但在ATtiny13A上使用Arduino API会导致程序体积增大，迅速超过1024Byte，因此不可行，所以只能直接操作寄存器来分配各功能。


## 寄存器操作
寄存器是用于保存微控制器状态或者在更改引脚分配时使用的区域，程序（C、C++、汇编）可以直接读取或设置寄存器的值。从程序来看，它们就像指向内存地址的普通变量一样。

__寄存器示例__

| 寄存器 | 寄存器名称                 | 说明                                 |
| ------ | -------------------------- | ------------------------------------ |
| DDRB   | B端口方向寄存器            | 设置端口为输入或输出                 |
| PORTB  | B端口输出寄存器            | 设置端口的开/关                      |
| TCCR0A | 定时器/计数器0控制寄存器A  | 控制定时器/计数器                     |
| OCR0A  | 定时器/计数器比较A寄存器    | 设置定时器/计数器的比较值             |
| PRR    | 电源节能寄存器             | 与电源节能相关的设置                  |
| GIMSK  | 通用中断允许寄存器         | 与中断允许相关的设置                  |
| PCMSK  | 引脚变化中断允许寄存器     | 与引脚中断允许相关的设置              |

直接操作寄存器可以降低程序体积，实现低层级的操作。但代价是会使程序对微控制器产生依赖，同时由于需要查阅数据手册来编写程序，工作量也会增加。

:::info
每种微控制器的引脚布局和寄存器都可能不同。Arduino API在内部屏蔽了这些寄存器操作上的差异，从而可以用相同的函数来控制各种微控制器。但缺点是头文件中的预处理器分支（#if、#ifdef、#define）太多，看起来比较复杂。
:::

# 通信格式
红外线发送有多种标准，很多厂商和企业都是按照各自的标准进行红外线发送的。据说在日本常用的有NEC格式、家製協格式和SONY格式。

为了理解通信格式，我参考了以下网站：

[通信格式](http://elm-chan.org/docs/ir_format.html)  
[红外线遥控器的格式](http://www.asahi-net.or.jp/~gt3n-tnk/IR_TX1.html)  
[红外线遥控器信号定义数据的合成](https://shrkn65.nobody.jp/remocon/index.html)  
[38KHz调制脉冲发送示意图](https://www.sbprojects.net/knowledge/ir/)

查看客厅吸顶灯遥控器的型号时，发现标记为[Panasonic HK9493](https://panasonic.jp/consumables/c-db/products/HK9493MM.html)。因此有必要调查该遥控器采用哪种通信格式发送红外信号。


# 开发环境准备

## 使用Arduino IDE进行开发的设定
使用Arduino IDE对ATtiny13A进行开发需要以下内容：

- 作为板管理器的 `MicroCore`
- 草图（程序）的写入设备（我使用Arduino Uno）

关于板管理器及安装，请参考下面的内容：

@[og](https://github.com/MCUdude/MicroCore)

:::alert
由于Arduino IDE已有不少历史遗留版本，我这里使用的是1.8.19版。  
是否能够在Arduino IDE 2.X.X下运行，目前尚不确定。
:::

## 红外线发送数据的解析
那么，红外线发送数据该如何获取呢？厂家的官网并没有公开此类信息。  
必须利用红外线遥控接收模块，从实际遥控器发送的红外信号中接收数据，并据此解析出通信格式。

Arduino平台上有许多优秀的开源库。  
其中有一个名为IRremote的库，可用于红外信号的收发，我正是用它来解析数据的。

@[og](https://github.com/Arduino-IRremote/Arduino-IRremote)

我在[秋月电子](https://akizukidenshi.com/)购买了OSRB38C9AA型号的红外线遥控接收模块。参考数据手册[^d]中的应用例，我用面包板简单搭建了一下电路。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/ir_receive.png)

左边的黄色线是红外线接收模块用于输出信号的Output，右边的黄色线为电源，绿色为GND。  
那三脚直立的模块就是红外线遥控接收模块。

虽然省略了详细说明，但在Arduino上编写了如下草图，并将之前搭建的面包板连接在一起。

```cpp
#include <IRremote.h>

int receiverPin = 8;

void setup() {
    Serial.begin(9600);
    IrReceiver.begin(receiverPin, true); 
}

void loop() {
    if (IrReceiver.decode()) {
        // 显示发送接收到信号所需的代码
        IrReceiver.printIRSendUsage(&Serial);
        // 以RAW格式显示结果
        IrReceiver.printIRResultRawFormatted(&Serial, true);
        IrReceiver.resume();
    }
}
```

当遥控器向红外线接收模块发送红外信号时，会输出如下内容：
```
uint32_t tRawData[]={0x9939522C, 0xA0};
IrSender.sendPulseDistanceWidthFromArray(38, 3450, 1700, 450, 1300,
        450, 450, &tRawData[0], 40, PROTOCOL_IS_LSB_FIRST,
        <RepeatPeriodMillis>, <numberOfRepeats>);
 -3276750
 +3450,-1700
 + 450,- 400 + 450,- 400 + 450,-1300 + 400,-1300
 + 450,- 400 + 450,-1250 + 450,- 450 + 400,- 450
 + 400,- 450 + 450,-1250 + 450,- 400 + 400,- 450
 + 450,-1300 + 400,- 450 + 450,-1250 + 450,- 400
 + 450,-1250 + 450,- 450 + 400,- 450 + 400,-1300
 + 400,-1300 + 450,-1300 + 400,- 450 + 400,- 450
 + 400,-1300 + 450,- 400 + 450,- 450 + 400,-1300
 + 450,-1250 + 450,- 400 + 450,- 400 + 450,-1300
 + 400,- 450 + 400,- 450 + 400,- 450 + 450,- 400
 + 400,- 450 + 450,-1300 + 400,- 450 + 400,-1300
 + 450
Sum: 53600
```
- `uint32_t tRawData[]={0x9939522C, 0xA0};`
    - 0x9939522C 是接收到的数据
    - 0xA0 是校验值
- 对 `IrSender.sendPulseDistanceWidthFromArray()` 函数参数的说明
    ```cpp
    void IRsend::sendPulseDistanceWidthFromArray(
        // 频率[kHz]
        uint_fast8_t aFrequencyKHz,
        // 读头部分发送ON时间[微秒]
        uint16_t aHeaderMarkMicros,
        // 读头部分发送OFF时间[微秒]
        uint16_t aHeaderSpaceMicros,
        // 数据部分，当发送位值为1时的发送ON时间[微秒]
        uint16_t aOneMarkMicros,
        // 数据部分，当发送位值为1时的发送后等待时间[微秒]
        uint16_t aOneSpaceMicros,
        // 数据部分，当发送位值为0时的发送ON时间[微秒]
        uint16_t aZeroMarkMicros,
        // 数据部分，当发送位值为0时的发送后等待时间[微秒]
        uint16_t aZeroSpaceMicros,
        // 发送数据数组
        IRRawDataType *aDecodedRawDataArray,
        // 读头部分发送的位数
        uint16_t aNumberOfBits,
        // 位发送顺序
        uint8_t aFlags,
        // 重复发送时的等待时间
        uint16_t aRepeatPeriodMillis,
        // 重复发送的次数
        int_fast8_t aNumberOfRepeats
    )
    ```
- +- 的数字排列表示的是接收时各位（0或1）的持续时间，正是用来计算 IrSender.sendPulseDistanceWidthFromArray() 函数参数的数据。
    - “+” 表示接收时间[微秒]
    - “-” 表示未接收时间[微秒]

可以看出，+和-交替以固定的时间间隔重复出现。

读头部分的ON/OFF时间为 `+3450(8T), -1700(4T)`，而数据部分的ON时间为 `+450(1T)`，因此可以判断采用的是 `家製協格式`。

在中间部分，+和-成对出现，其中
- “+在400到450之间且相对应的-也在400到450之间”的配对视为0；
- “+在400到450之间且对应的-在1250到1300之间”的配对视为1。

将这些转换成二进制后，从 **LSB（最低有效位）开始读取，并以16进制表示**，结果如下：

```
 (+xxx, -xxx)(+xxx, -xxx)(+xxx, -xxx)(+xxx, -xxx)    2進数  16進数
 + 450,- 400 + 450,- 400 + 450,-1300 + 400,-1300  →  0011    C
 + 450,- 400 + 450,-1250 + 450,- 450 + 400,- 450  →  0100    2
 + 400,- 450 + 450,-1250 + 450,- 400 + 400,- 450  →  0100    2
 + 450,-1300 + 400,- 450 + 450,-1250 + 450,- 400  →  1010    5
 + 450,-1250 + 450,- 450 + 400,- 450 + 400,-1300  →  1001    9
 + 400,-1300 + 450,-1300 + 400,- 450 + 400,- 450  →  1100    3
 + 400,-1300 + 450,- 400 + 450,- 450 + 400,-1300  →  1001    9
 + 450,-1250 + 450,- 400 + 450,- 400 + 450,-1300  →  1001    9
 + 400,- 450 + 400,- 450 + 400,- 450 + 450,- 400  →  0000    0
 + 400,- 450 + 450,-1300 + 400,- 450 + 400,-1300  →  0101    A
```
可以看出，此值与之前的 `uint32_t tRawData[]={0x9939522C, 0xA0};` 数据相对应。  
将0x9939522C从LSB（最低有效位）开始按位读取后，结果与上面一致，因此在数据发送后，校验值0xA0也是按LSB顺序发送的。

最终，通过38KHz调制按如下步骤发送：
1. 读头部分发送（通知即将发送数据）
    - 利用 IRsend::sendPulseDistanceWidthFromArray() 的第2个参数的时间发送1，第3个参数的时间发送0
2. 数据部分发送
    - 将0x9939522C通过 IRsend::sendPulseDistanceWidthFromArray() 的第4到第7参数所规定的时间间隔，从LSB（最低有效位）起依次发送
3. 校验值发送
    - 按LSB顺序发送0xA0
    - 时间间隔与数据部分相同
4. 尾部发送（表示数据发送结束）

关键点在于，发送1时，并不是单纯让红外LED点亮450[微秒]后熄灭1300[微秒]，而是在点亮期间，LED以38KHz的频率反复闪烁。  
也就是说，38kHz的频率对应周期约26[微秒]，即每13[微秒]交替点亮和熄灭，在450[微秒]内实现。

:::info
在Windows或Linux等操作系统上实现微秒级别的控制相当困难（甚至可能无法实现？），能用一只价值160日元[^e]的微控制器做到这一点，真是令人感慨万分。
:::

## 通过串口通信进行调试

由于ATtiny13A没有内建硬件UART，所以程序状态的检测较为困难，只能通过简单的LED闪烁来确认。  
虽然也可以编写软件UART通信库，但为了调试而仅占用少数引脚的两个用于收发显得相当麻烦，而且UART通信库还会占用大量程序空间。

:::info
UART是一种异步全双工的串行数据通信方式。Arduino使用硬件实现UART，在调试微控制器程序时，通常会将UART连接到终端软件中查看程序输出。
:::

为了解决这些问题，Nerd Ralph先生开发并公开了一个非常棒的库。
@[og](https://nerdralph.blogspot.com/2014/01/avr-half-duplex-software-uart.html)

该库名为BasicSerial3，是专为ATtiny设计、仅用一个引脚实现半双工串行通信的汇编语言库，仅占62Byte。但遗憾的是原链接已失效，于是我从另一个网站获取了BasicSerial3并加以使用。

:::info
- 虽然现在已有[picoUART](https://nerdralph.blogspot.com/2020/02/building-better-bit-bang-uart-picouart.html)这一新产品，但它已从汇编转为C++实现，ROM占用大约增加了一倍。
- 对我来说，BasicSerial3已绰绰有余，所以我找到了一个[在Github上利用BasicSerial3的项目](https://github.com/Tamakichi/Arduino_ATtiny13_HC_SR04)来使用。
:::

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/serial_io.png)

这块白色的面包板展示的就是串口通信电路。将一根黄色导线接到ATtiny13A的PB3（pin2），并将波特率设置为115200。接着，将橙色和黄色的导线分别连接到[USB-串口转换适配器](https://amzn.asia/d/hG79fBZ)的TX/RX端口，再将USB连接到PC上，通过Tera Term等软件进行显示。  
由于该USB-串口转换适配器支持DTR信号，所以在自制Arduino兼容机上写入草图时也很方便，有一只就很实用。  
接下来，只需编写用于输出字符串和数字的函数，调用它们即可实现UART输出。

```cpp
// 输出字符串
void serOut(const char* str) {
    while (*str) {TxByte (*str++);}
}

// 以10进制输出整数
void OutDEC(uint16_t d) {
    int8_t n =-1;
    uint16_t v = 10000;
    for (uint8_t i=0; i<5; i++) {
        if (d >= v) {
            TxByte(d/v + '0');
            d %= v;
            n=i;
        } else {
            if (n!=-1||i==4) TxByte ('0');
        }
        v/=10;
    }
}
```

# 总结
虽然在查阅资料、收集零件、搭建测试电路以及编写程序上花了不少时间，但制作遥控器的各种技术诀窍几乎都已具备。  
虽然目前还没有实物，但我已经获得了一种“应该可以做出来”的感觉。  
下一篇将是[【开发篇】](../ir-remote-control-with-attiny13a_epi2/)。

[^b]: Atmel公司于2016年被Microchip Technology公司收购
[^c]: [ATtiny13A数据手册](https://ww1.microchip.com/downloads/en/DeviceDoc/ATtiny13A-Data-Sheet-DS40002307A.pdf)
[^d]: [红外线接收模块OSRB38C9AA数据手册](https://www.optosupply.com/uppic/2022715399964.pdf)
[^e]: 截至2025年2月。几年前约为50日元左右
