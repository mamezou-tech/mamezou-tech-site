---
title: 使用ATtiny13A制作以纽扣电池供电的顶棚灯遥控器【开发篇】
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

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/ir_remocon_breadboard.png)

上一篇的文章请看[【準備編】](../ir-remote-control-with-attiny13a_epi1/)

到目前为止，前期准备终于完成。从这里开始进入正题，进行电路设计和程序开发。

# 自制红外遥控器的目标

目标如下：
- 尽可能集成遥控器(HK9493)的功能
- 纽扣电池(3V)供电
- 省电
- 降低零件成本

# 遥控器操作按钮规格

根据[【準備編】中对红外线发送数据的解析](../ir-remote-control-with-attiny13a_epi1/#%E8%B5%A4%E5%A4%96%E7%B7%9A%E9%80%81%E4%BF%A1%E3%83%87%E3%83%BC%E3%82%BF%E3%81%AE%E8%A7%A3%E6%9E%90)得到，按钮对应的发送数据（命令）如下：

| 命令数组       |      ch1       |      ch2       |      ch3       | 长按 |
|:---------------|:--------------:|:--------------:|:--------------:|:----:|
| 暖色         | 0x9139522C(0xA8) | 0x9539522C(0xAC) | 0x9939522C(0xA0) | 〇   |
| 白色         | 0x9039522C(0xA9) | 0x9439522C(0xAD) | 0x9839522C(0xA1) | 〇   |
| 点亮         | 0x2D09522C(0x24) | 0x3509522C(0x3C) | 0x3D09522C(0x34) |     |
| 熄灯         | 0x2F09522C(0x26) | 0x3709522C(0x3E) | 0x3F09522C(0x36) |     |
| 明亮         | 0x2A09522C(0x23) | 0x3209522C(0x3B) | 0x3A09522C(0x33) | 〇   |
| 暗淡         | 0x2B09522C(0x22) | 0x3309522C(0x3A) | 0x3B09522C(0x32) | 〇   |
| 夜灯         | 0x2E09522C(0x27) | 0x3609522C(0x3F) | 0x3E09522C(0x37) |     |
| 全灯         | 0x2C09522C(0x25) | 0x3409522C(0x3D) | 0x3C09522C(0x35) |     |
| 晚安30分钟   | 0xA139522C(0x98) | 0xAA39522C(0x93) | 0xB339522C(0x8A) |     |
| 频道确定     | 0xDA39522C(0xE3) | 0xDB39522C(0xE2) | 0xDC39522C(0xE5) |     |

(0xNN)是奇偶校验数据，`长按`表示该命令支持长按，通过持续按下按钮可实现调光。

共有3个频道，通过按对应的频道确定按钮，可以只接受该频道的命令。

# 电路图

![电路图](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/schematic.png)

左侧有8个用于遥控控制的开关(SW)，通过中央模块（编码器）连接到ATtiny13A。  
虽然红外LED需要流过50mA到100mA的大电流，但由于ATtiny13A无法直接输出大电流，因此采用了晶体管驱动。  
由于开关数量较多，且通过中央模块连接到ATtiny13A，所以布线较多。

## 开关的ON/OFF

电路图左侧排列有8个开关，这些正是遥控器中用于点亮、熄灯等功能的按钮。  
对于初学者（我也曾是其中的一员）来说，可能会对这种电路设计感到疑惑，因此我展示了类似的三种电路。你能看出当SW开/关时OUT电压的区别吗？

![pull_up](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/three_circuites.png)

__左侧__  
当SW打开时，电源电压3V施加于OUT，电流随之流动；当SW关闭时，OUT并非实际为0V，而是处于未连接的悬浮状态，状态不确定。这种情况称为“浮动状态”或“高阻抗”，是不允许出现的，必须确保输出固定为0V或保持在施加电压状态。

__中间__  
当SW关闭时，电源电压3V施加于OUT，OUT上会流过依电源电压与电阻R决定的电流（V/R）；当SW打开时，OUT变为0V。  
如果没有电阻R，电源的正负极会直接短路，造成大电流和短路故障。  
而加入电阻R后，由于电流不易流动，当电阻值较大（10K至数MΩ）时，几乎不流电，从而避免了短路。在这种情况下，电阻R的正极侧为3V，负极侧为0V，所以OUT保持在0V。  
这种电阻称为上拉电阻，此电路称为上拉电路。

__右侧__  
这是将中间电路中电阻R和SW的位置调换所得。  
当SW关闭时，OUT连接到电源的负极，因此为0V。  
当SW打开时，与先前相同，电阻R的正极侧为3V，负极侧为0V，因此OUT变为3V。  
这种电阻称为下拉电阻，此电路称为下拉电路。

电路图中的所有按钮均为上拉电路。

## 引脚数量问题

在ATtiny13A中，作为输入的引脚共有PB0到PB5共6个，但PB5兼作复位并在程序写入时使用，所以不予使用。  
因此（除去1个RESET、4个GND和8个VCC）仅可使用5个引脚，其中1个用于红外发送时LED点亮的输出，故实际上只有4个输入引脚。

需要用4个引脚判断8个开关中哪个被按下[^1]，为此我考虑了以下几种方法。

__A: 使用AD转换__  
将其中1根引脚设置为模拟输入模式，通过各开关接入不同阻值后测量电压值，并依据该电压判断按下了哪个开关。

__B: 利用编码器__  
将8个输入线路接入编码器，通过3根或4根输出线路以二进制（3或4位数字）的形式进行判断。

__C: 利用IO扩展器__  
将8个输入线路接入IO扩展器，ATtiny13A通过I2C（2根线）与IO扩展器通信，从而判断按下了哪个开关。

尝试方法A后发现，由于AD转换为8位，可将最大3V的输入电压转换为0到255的值，但由于开关有8个，需要利用不同阻值产生8个电压区间。设定各个阈值区间既繁琐又精度不足，容易误判，因此放弃此法。

方法B可利用SN74HC148N编码器电路实现，并且所需接入ATtiny13A的引脚数也正合适。

方法C由于需要编写I2C通信程序，既脱离主题又会占用较大程序空间，因此判断不切实际。

所以，最终采用了方法B。

:::info
IO扩展器正如其名，是用于扩展（增加）输入输出引脚数量的电路。
:::

:::info
I2C (Inter Integrated Circuit) 是一种只需2根线（数据线和时钟线）即可与多个模块通信的协议。通常用于与液晶显示器、简单传感器等设备通信。发音为“爱斯克威尔德西”或“爱二西”。
:::

查看SN74HC148N的数据手册（规格书）[^2]，输入与输出的对应关系如下表所示。

![function table](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/sn74hc148_function_table.png)

从浅蓝色框中，通过观察INPUTS 0到7的高/低电平和OUTPUTS A0到A2的高/低电平，可以判断出哪个开关被按下[^3]。

但是，当仅INPUTS的0为低电平（最后一行）和所有INPUTS均为高（第二行）时，OUTPUTS A0到A2均为相同的高电平状态。这样，无论是对应INPUTS的0的开关被按下，还是没有任何开关按下，OUTPUTS都相同，无法判断。

因此，如红色框所示，作为INPUTS额外加入了EI（但始终为低电平），使得输入线路总数达到9根，同时在OUTPUTS中添加GS，使输出线路增加到4根。  
这样，输出便以4位二进制表示出9种不同的模式。  
当OUTPUTS的EO为低电平时，表示没有任何开关被按下，从而也可以据此判断，不过无论如何，输出仍然需要4根线路。

另外，输入引脚在无输入时必须保持为高电平（即低有效），因此需要预先上拉（[前述: 开关的ON/OFF](#开关的onoff)）。

可能会有人质疑：“那干脆用一个一开始就带有8个引脚可用的单片机不就好了？”但我想做点用ATtiny13A制作的东西，所以请理解为“这也是可以实现的”😅。

## 旁路电容

电容(C)即使不装也可能能工作，但具有以下作用：
- 缓和电压变化（降噪）
- 在电流突增时提供电力

:::info
在电源(V)与地(GND)之间并联电容，可以旁通过滤噪声，因此称为旁路电容（简称为パスコン）。
:::

程序在稳态下几乎不耗电（低于0.1uA）（后述），但一旦按下遥控器按钮，红外LED便会点亮。红外虽然肉眼不可见，但会像普通LED一样发光。  
由于用于遥控器，需要发出比普通LED更强的光以保证信号能传达到几米之外的红外接收器，因此需要流过约50到100mA的电流[^4]。这就会导致电流骤增、电压下降。

在电池供电的情况下，最初使用新电池时无碍，但随着电量消耗，电压会逐渐降低。当电压降至接近单片机最低工作电压（ATtiny13A为1.8V）时，单片机可能会运行不稳定。但加装旁路电容可提供缓冲，使得电池能更长久（更高效）地使用。

# 程序

程序总行数约为280行。
- 头文件include、define定义、数据数组定义约90行
- setup()约90行
- loop()约70行

控制逻辑（setup(), loop(), 以及其他函数）超过100行，但每段处理均有注释说明，并用大括号分块，寄存器设置中的位运算也逐位换行，因此尽管代码行数较多，但其内容十分简单。

```cpp
#include <avr/io.h>
#include <util/delay.h>
#include <util/delay_basic.h>
#include <avr/interrupt.h>
#include <avr/sleep.h>
#include <wiring_private.h>
#include <avr/pgmspace.h>
#include <avr/eeprom.h>

#define IR_COMMAND_WARMER   0 // 暖色
#define IR_COMMAND_WHITER   1 // 白色
#define IR_COMMAND_ON       2 // 点亮
#define IR_COMMAND_OFF      3 // 熄灯
#define IR_COMMAND_BRIGHTER 4 // 明亮
#define IR_COMMAND_DARKER   5 // 暗淡
#define IR_COMMAND_NIGHT    6 // 夜灯
#define IR_COMMAND_FULL     7 // 全灯
#define IR_COMMAND_NONE    15 // 无

#define HEADERMARK       1035 // 8T(3450微秒)
#define HEADERSPACE       510 // 4T(1700微秒)
#define DATAMARK          135 // 1T(450微秒)
#define ONESPACE          390 // 3T(1300微秒)
#define ZEROSPACE         135 // 1T(450微秒)

#define COMMAND_SIZE  5

// 照明控制
const byte command_1ch_0[] PROGMEM = {0x91, 0x39, 0x52, 0x2C, 1};
const byte command_1ch_1[] PROGMEM = {0x90, 0x39, 0x52, 0x2C, 1};
const byte command_1ch_2[] PROGMEM = {0x2D, 0x09, 0x52, 0x2C, 0};
const byte command_1ch_3[] PROGMEM = {0x2F, 0x09, 0x52, 0x2C, 0};
const byte command_1ch_4[] PROGMEM = {0x2A, 0x09, 0x52, 0x2C, 1};
const byte command_1ch_5[] PROGMEM = {0x2B, 0x09, 0x52, 0x2C, 1};
const byte command_1ch_6[] PROGMEM = {0x2E, 0x09, 0x52, 0x2C, 0};
const byte command_1ch_7[] PROGMEM = {0x2C, 0x09, 0x52, 0x2C, 0};
const byte command_2ch_0[] PROGMEM = {0x95, 0x39, 0x52, 0x2C, 1};
const byte command_2ch_1[] PROGMEM = {0x94, 0x39, 0x52, 0x2C, 1};
const byte command_2ch_2[] PROGMEM = {0x35, 0x09, 0x52, 0x2C, 0};
const byte command_2ch_3[] PROGMEM = {0x37, 0x09, 0x52, 0x2C, 0};
const byte command_2ch_4[] PROGMEM = {0x32, 0x09, 0x52, 0x2C, 1};
const byte command_2ch_5[] PROGMEM = {0x33, 0x09, 0x52, 0x2C, 1};
const byte command_2ch_6[] PROGMEM = {0x36, 0x09, 0x52, 0x2C, 0};
const byte command_2ch_7[] PROGMEM = {0x34, 0x09, 0x52, 0x2C, 0};
const byte command_3ch_0[] PROGMEM = {0x99, 0x39, 0x52, 0x2C, 1};
const byte command_3ch_1[] PROGMEM = {0x98, 0x39, 0x52, 0x2C, 1};
const byte command_3ch_2[] PROGMEM = {0x3D, 0x09, 0x52, 0x2C, 0};
const byte command_3ch_3[] PROGMEM = {0x3F, 0x09, 0x52, 0x2C, 0};
const byte command_3ch_4[] PROGMEM = {0x3A, 0x09, 0x52, 0x2C, 1};
const byte command_3ch_5[] PROGMEM = {0x3B, 0x09, 0x52, 0x2C, 1};
const byte command_3ch_6[] PROGMEM = {0x3E, 0x09, 0x52, 0x2C, 0};
const byte command_3ch_7[] PROGMEM = {0x3C, 0x09, 0x52, 0x2C, 0};

// 频道确定
const byte command_channel_1[] PROGMEM = {0xDA, 0x39, 0x52, 0x2C, 0};
const byte command_channel_2[] PROGMEM = {0xDB, 0x39, 0x52, 0x2C, 0};
const byte command_channel_3[] PROGMEM = {0xDC, 0x39, 0x52, 0x2C, 0};

// 晚安30分钟
const byte command_sleep30_1[] PROGMEM = {0xA1, 0x39, 0x52, 0x2C, 0};
const byte command_sleep30_2[] PROGMEM = {0xAA, 0x39, 0x52, 0x2C, 0};
const byte command_sleep30_3[] PROGMEM = {0xB3, 0x39, 0x52, 0x2C, 0};

// 红外线发送数据列表
const byte * const commands[] PROGMEM = {
    command_1ch_0,
    command_1ch_1,
    command_1ch_2,
    command_1ch_3,
    command_1ch_4,
    command_1ch_5,
    command_1ch_6,
    command_1ch_7,
    command_2ch_0,
    command_2ch_1,
    command_2ch_2,
    command_2ch_3,
    command_2ch_4,
    command_2ch_5,
    command_2ch_6,
    command_2ch_7,
    command_3ch_0,
    command_3ch_1,
    command_3ch_2,
    command_3ch_3,
    command_3ch_4,
    command_3ch_5,
    command_3ch_6,
    command_3ch_7,
    command_channel_1,
    command_channel_2,
    command_channel_3,
    command_sleep30_1,
    command_sleep30_2,
    command_sleep30_3,
};

// 用于频道切换的偏移量
byte command_offset = 0;

void setup() {
    // 端口设置
    {
        sbi(DDRB, DDB1);

        sbi(PORTB, PORTB0);
        sbi(PORTB, PORTB2);
        sbi(PORTB, PORTB3);
        sbi(PORTB, PORTB4);
    }

    // 定时器设置 
    {
        TCCR0A =
            (0 << COM0A1)
          | (0 << COM0A0)
          | (0 << COM0B1)
          | (0 << COM0B0)
          | (1 << WGM01)
          | (1 << WGM00)
          ; 

        TCCR0B =
            (0 << FOC0A)
          | (0 << FOC0B)
          | (1 << WGM02)
          | (0 << CS02)
          | (0 << CS01)
          | (1 << CS00)
          ;

        OCR0A = 31;
        OCR0B = 11;
        TIMSK0 = 0;
    }

    // 省电设置
    {
        sbi(PRR, PRADC);
    }

    // 频道设置的读写及频道设置的发送
    {
        uint8_t eeprom_address = 0x00;
        uint8_t read_data = eeprom_read_byte(&eeprom_address);

        if (read_data == 0 || read_data == 8 || read_data == 16) {
            command_offset = read_data;
        } else {
            command_offset = 0;
            eeprom_update_byte(&eeprom_address, command_offset);
        }

        _delay_ms(20);

        byte command_no = get_command_no();

        if (command_no == IR_COMMAND_ON) {
            read_data = 0;
            command_no = 0;
        } else if (command_no == IR_COMMAND_FULL) {
            read_data = 8;
            command_no = 1;
        } else if (command_no == IR_COMMAND_NIGHT) {
            read_data = 16;
            command_no = 2;
        } else {
            read_data = command_offset;
        }

        if (read_data != command_offset) {
            command_offset = read_data;
            eeprom_update_byte(&eeprom_address, command_offset);

            byte buffer[COMMAND_SIZE] = {0};
            command_offset = 24;
            get_command_data(command_no, buffer);
            ir_send(buffer);
            command_offset = read_data;
        }
    }

    // 中断设置与睡眠设置 
    cli();
    {
        sbi(GIMSK, PCIE);

        sbi(PCMSK, PCINT0);
        sbi(PCMSK, PCINT2);
        sbi(PCMSK, PCINT3);
        sbi(PCMSK, PCINT4);

        set_sleep_mode(SLEEP_MODE_PWR_DOWN);
    }
    sei();
}

void loop() {
    sleep_mode();

    _delay_ms(20);

    byte command_no;
    byte buffer[COMMAND_SIZE] = {0};
    byte *longPress = &buffer[4];

    do {
        if (*longPress) {
            _delay_ms(100);
        }

        command_no = get_command_no();

        if (command_no == IR_COMMAND_NONE) {
            return;
        }

        get_command_data(command_no, buffer);
        ir_send(buffer);
    } while (*longPress);
}

// 获取命令号
byte get_command_no() {
    return
          ((bit_is_set(PINB, PINB4) ? 1 : 0) << 3)
        | ((bit_is_set(PINB, PINB2) ? 1 : 0) << 2)
        | ((bit_is_set(PINB, PINB0) ? 1 : 0) << 1)
        | ((bit_is_set(PINB, PINB3) ? 1 : 0) << 0)
        ;
}

// 获取指定命令号的红外线发送数据
void get_command_data(byte command_no, byte *out) {
    memcpy_P(out, (byte *)pgm_read_byte(
                &commands[command_offset + command_no]), COMMAND_SIZE);
}

// 红外线发送
void ir_send(byte *command) {
    // 生成数据部分
    uint32_t data =
          ((uint32_t)command[0] << 24)
        | ((uint32_t)command[1] << 16)
        | ((uint32_t)command[2] <<  8)
        | ((uint32_t)command[3] <<  0)
        ;

    // 奇偶校验计算
    byte parity = command[0] ^ command[1];

    // 发送引导部分
    sbi(TCCR0A, COM0B1);
    _delay_loop_2(HEADERMARK);
    cbi(TCCR0A, COM0B1);
    _delay_loop_2(HEADERSPACE);

    // 发送数据部分
    for (uint8_t i = 0; i < 32; i++) {
        sbi(TCCR0A, COM0B1);
        _delay_loop_2(DATAMARK);
        cbi(TCCR0A, COM0B1);
        _delay_loop_2((data>>i) & 1 ? ONESPACE : ZEROSPACE);
    }
    
    // 发送奇偶校验
    for (uint8_t i = 0; i < 8; i++) {
        sbi(TCCR0A, COM0B1);
        _delay_loop_2(DATAMARK);
        cbi(TCCR0A, COM0B1);
        _delay_loop_2((parity>>i) & 1 ? ONESPACE : ZEROSPACE);
    }

    // 发送尾部
    sbi(TCCR0A, COM0B1);
    _delay_loop_2(DATAMARK);
    cbi(TCCR0A, COM0B1);
    _delay_loop_2(ZEROSPACE);
}
```

## 编译（保险丝）设置

为了实现省电，修改了以下设置：
- 禁用BOD (Brown Out Detection)
- 将时钟频率改为1.2MHz

__禁用BOD__  
电源电压为3V，但当电压低于单片机的工作电压（ATtiny13A为1.8V）时，可能会引起误操作。BOD是一种检测电压下降并向单片机施加复位使其停止工作的机制。  
可能在单片机发生误操作前，就因电压不足（LED点亮所需的正向电压不足）而无法进行红外发送。而且禁用BOD后功耗大幅降低，对省电贡献显著。

__更改时钟频率__  
基本上，AVR单片机的时钟频率越低，其能在更低电压下运行。  
另外，虽然默认的时钟频率为9.6MHz，但由于红外发送仅需要38KHz调制以及约450微秒延时（等待处理）的精度，所以不需要高频。  
定时器依赖于时钟频率，因此在生成38KHz调制信号及计算延时时需做相应计算，但为了简化处理，便采用了网络上常用的1.2MHz。

## 数据声明

在包含头文件与常量定义后，各个命令数据以数组形式定义。  
用于控制照明的命令，每个命令为4字节（不含奇偶校验），共30个命令，因此数据总计为120字节。  
如前所述，SRAM仅有64字节，完全不足，因此必须加以巧妙处理。

```cpp
const byte command_1ch_0[] PROGMEM = {0x91, 0x39, 0x52, 0x2C, 1};
```

数组最后一个元素若为`1`则表示该命令支持长按，否则为`0`，以此判断是否为长按命令。

[PROGMEM](https://www.arduino.cc/reference/tr/language/variables/utilities/progmem/) 是Arduino草图中的特殊关键字，用于将数据存储在Flash内存（程序存储区）而非SRAM中。由此可以定义超出SRAM容量的数据。虽然这增加了程序体积，但仍能勉强控制在Flash内存容量以内。

编译时日志  
```
最大1024字节的Flash内存中，草图使用了972字节（94%）。
最大64字节的RAM中，全局变量占用1字节（1%），局部变量可用63字节。
```

## setup() 处理

这里进行寄存器设置。由于需要参考数据手册了解各寄存器的配置，仅凭代码可能难以完全理解，所以这里只作简要说明。

使用`sbi(寄存器, 位)`将指定寄存器的指定位置为1；使用`cbi(寄存器, 位)`则将其置为0。

__端口设置__  
- 由于红外LED连接在PB1(pin6)上，因此将该端口设为输出模式。  
- 连接到编码器的8个按钮在关闭时输出为HIGH（低有效），故将PB0、PB2、PB3、PB4的输出均设为HIGH。

__定时器设置__  
用于生成38KHz调制信号（38KHz交替ON/OFF的信号）的设置：
- 将波形生成模式设为高速PWM  
- OCR0A = 31，由公式 ((1.2MHz / 38KHz) / 1(分频)) - 1 = 30.6 计算得出  
- OCR0B = 11，使占空比为1/3，由 (1.2MHz / 38KHz) / 3 = 10.5 得出

38KHz调制波形的生成由单片机定时器完成，因此在程序（loop函数中）只需指定PB1(pin6)的输出状态，控制非常简洁。

下面的图片为使用简易示波器实际测得的波形。虽然测得的矩形波为36.7KHz而非38KHz，但在这种误差范围内红外发送完全没有问题。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/38khz.png)

__省电设置__  
这里设置了降低A/D转换器功耗的选项，但似乎仅在Active状态或使用set_sleep_mode(SLEEP_MODE_IDLE)时有效，因此可能并非必需。本程序指定的睡眠模式为set_sleep_mode(SLEEP_MODE_PWR_DOWN)。

__红外线发送频道设置的读写__  
遥控器具有频道切换（3档）和确定按钮。原本计划只在初次设置后便不再使用，因此一开始打算不实现此功能。但因程序区域有余，遂实现了该功能。不过，由于ATtiny13A的所有端口均已占用，故无可用引脚。经过反复斟酌，决定在通电（安装纽扣电池）且调用setup函数时，根据当时按下的按钮类型来进行频道设置。

|  按钮       | 频道设置       |
|:-----------:|:--------------:|
| 未按下时  | 保存的频道     |
| 点亮按钮    | 1ch            |
| 夜灯按钮    | 2ch            |
| 全灯按钮    | 3ch            |

频道设置写入EEPROM中，因此即使更换纽扣电池，也能恢复先前设定的频道。

__中断设置与睡眠设置__  
- 将中断类型设置为当引脚状态发生变化时触发中断  
- 对编码器的输出（PB0, PB2, PB3, PB4）启用引脚变化中断  
- 将睡眠模式设定为SLEEP_MODE_PWR_DOWN

睡眠模式共有SLEEP_MODE_IDLE、SLEEP_MODE_ADC、SLEEP_MODE_PWR_DOWN三种，其工作方式如下图所示：

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/sleep_mode.png)

设定为SLEEP_MODE_PWR_DOWN时，所有时钟停止，发射电路亦停止，单片机进入深度睡眠状态，除监测中断外一切活动均停止。因而功耗降至0.1uA以下，几乎不再消耗电力。  
唤醒方式仅有以下几种：
- INT0外部中断或引脚变化中断  
- 看门狗定时器中断

## loop() 处理

__循环处理__  
这是程序的主循环。
1. 通过sleep_mode()函数进入睡眠状态，直到按钮被按下程序才会唤醒  
2. 当按钮按下并通过引脚变化中断唤醒后，为防止抖动延时20毫秒  
3. 确定被按下的按钮，获取对应命令数据并执行红外发送（使红外LED闪烁）  
4. 若按下的按钮为支持长按的按钮，则每隔100毫秒重复相同处理  
5. 退出loop()函数后会立即重新调用loop()，回到第1步

:::info
抖动是指按钮或开关在开启/关闭时因机械振动而产生短暂的多次开闭现象。如果利用引脚变化中断触发中断，则一次按下可能会引发多次中断。
:::

__获取命令号__  
将编码器的输出（PB0, PB2, PB3, PB4）通过位移运算转换为4位数字并返回，该数字即为命令号。

__获取指定命令号的红外线发送数据__  
在[数据声明](#データ宣言)时，命令数据存储在Flash内存中，此处从Flash内存中获取。

__红外线发送__

1. 从命令数据数组生成发送数据  
　　通过位移运算生成32位数据  
2. 奇偶校验计算  
　　奇偶校验通过对数据代码执行异或(xor) `data[0] ^ data[1]`计算  
3. 发送引导部分  
　　先发送ON状态8T，再转为OFF并等待4T  
4. 发送数据部分  
　　对命令数据右移，检查最低位以决定发送时的空闲等待时间  
5. 发送奇偶校验  
　　对奇偶校验数据，同样执行与引导部分相同的处理  
6. 发送尾部  
　　理论上OFF状态至少需8ms，但下述设置亦可正常工作

根据IRremote库测量结果，T=450微秒。为测量此时间，使用ATTiny13A中定义于`util/delay_basic.h`的`_delay_loop_2(loop_count)`函数。  
根据数据手册，`_delay_loop_2(1)`消耗4个CPU周期。当CPU频率(F_CPU)为1.2MHz时，则1,200,000[Hz] / 4[周期] = 300,000，即300,000次循环约等于1秒。  
由于参数为16位计数器（最大可达65536），故当传入30000时，`_delay_loop_2(30000)`约等于延时100毫秒。  

由此，若要延时1T=450微秒，则应使用`_delay_loop_2(135)`。求出8T、4T、3T时，`loop_count`的值如下：

```cpp
#define headerMark  1035 // 8T(3450微秒):3450*30000/100000 = 345*3 = 1035
#define headerSpace  510 // 4T(1700微秒):1700*30000/100000 = 170*3 =  510
#define dataMark     135 // 1T(450微秒) : 450*30000/100000    45*3 =  135
#define oneSpace     390 // 3T(1300微秒):1300*30000/100000 = 130*3 =  390
#define zeroSpace    135 // 1T(450微秒) : 450*30000/100000 =  45*3 =  135
```

# 总结

经过反复试验，实现了目标所要求的充分利用单片机功能、省电且低成本的设计，并使得loop()函数编写得异常简洁。唯一遗憾的是“晚安30分钟”命令尚未能调用，计划在未来的机会中挑战此功能。  
下一篇将是[【基板・ケース作成編】](../ir-remote-control-with-attiny13a_epi3/)。

[^1]: 未考虑多个开关同时按下的情况  
[^2]: [SN74HC148N的数据手册](https://www.ti.com/lit/ds/symlink/sn74hc148.pdf)。在秋月电子售价仅30日元，非常便宜  
[^3]: X的值与判断无关  
[^4]: 实际上，由于红外信号以38KHz脉冲形式反复ON/OFF，因此并非持续点亮，而是以高速闪烁。
