---
title: C#×TwinCAT ADS 轻松操控PLC数据！动手学习联动基础
author: shuji-morimoto
tags:
  - csharp
  - ADS
  - TwinCAT
date: 2026-03-09T00:00:00.000Z
image: true
translate: true

---

本文将介绍如何使用 C# 进行 ADS 通信来与 TwinCAT 上的 PLC 数据进行联动。

# 在机器人控制领域 C# 很受欢迎？

在系统开发中，使用了多种编程语言。Python、JavaScript（Node.js, Deno）、C#、Java、C++、C 等都是主流。最近 Rust 和 Go 等也很受欢迎。

在机器人控制和工厂自动化中，同样使用了多种语言。服务或设备供应商在提供自有产品给系统时，会同时提供 API 和库。因此，期望以用户多的编程语言或开放标准提供。与 AI 相关或开源项目通常以 Python 模块形式提供，但在许可授权业务中，我感觉更多以 C# 库形式提供。

原因可归结为以下几点：
- 用户众多
- 使用简单（编程语言门槛低）
- 丰富的实用库（可组合以降低开发成本）
- 与供应商提供的 Windows 上的 GUI 应用或模拟器（使用 C# 开发）联动相性良好
- 供应商自身也容易开发库
- 闭源（适用于授权业务等）
- 可在 Linux（.NET Core）上运行

也有以 Python 模块形式提供的情况，但在此情形下，核心库（为闭源或提速）通常采用 C++ 等库，Python 仅作为该库的 Wrapper 提供。

# 什么是 ADS 通信

ADS (Automation Device Specification) 是 Beckhoff Automation 公司开发的专有通信协议。在 TCP/IP 或 UDP/IP 之上运行，用于 TwinCAT 系统内外软件模块间的数据交换。

提供了 C#（.NET）库，如果已配置好 TwinCAT 环境，就能立即使用。

TwinCAT 作为枢纽，可通过 ADS 协议对 TwinCAT PLC 变量进行监控和操作。

:::info:关于 TwinCAT 及 ADS 通信
请参阅连载文章「TwinCATで始めるソフトウェアPLC开发」「[第1回：环境构建篇](https://developer.mamezou-tech.com/robotics/twincat/introduction/twincat-introduction/)」。
:::

# 使用 TwinCAT ADS 的系统构成示例

![image](../../../../img/robotics/industrial-network/cs-ads-communication/SystemConfigurationUsingADS.png)

系统以 TwinCAT PLC 为中心构成。因此需要 XAR（运行环境）。同时，为了让应用程序 1-3 通过 ADS 通信与 TwinCAT 联动，还需要 XAE（开发环境）。

**联动方式**
TwinCAT 作为枢纽，设备和应用程序可通过工业网络或 ADS 连接，通过 TwinCAT 实现数据联动。
- TwinCAT PLC 与 应用程序1-3 通过 `ADS` 连接
- TwinCAT PLC 与 Device1 通过 `EtherCAT` 连接
- TwinCAT PLC 与 Device2 通过 `EtherNet/IP` 连接

:::info:其他数据联动方式
通过为 TwinCAT PLC 添加专用硬件模块，可以将温度计等测量的温度以模拟值的电压形式接收。此外，通过购买网络通信的软件许可，还可以通过套接字通信接收数据。
:::

**用途**
在 TwinCAT PLC 上定义全局变量后，可用于以下用途：
- 传感器控制
- 接收传感器数据
- 监控和操作 TwinCAT PLC 变量
- 与设备或机器人等联动
- 对 TwinCAT PLC 上的程序(Function Block)进行 RPC
- 通过 TwinCAT 实现进程间通信

TwinCAT PLC 上全局变量的赋值由 TwinCAT 程序完成。

:::info:关于全局变量的定义及赋值
请参阅连载文章「TwinCATで始めるソフトウェアPLC开发」「[第2回：ST语言编程（1/2）](https://developer.mamezou-tech.com/robotics/twincat/introduction-chapter2/twincat-introduction-chapter2/)」。
:::

# 安装库

请通过 NuGet 包管理器安装 `Beckhoff.TwinCAT.Ads` 并将其添加到项目引用中。该库的更新周期（主要为 Bug 修复）相对较快，每隔几个月就会升级次要版本。尽管多次更新，但因具有向后兼容性，现有代码可正常运行。

# TwinCAT 数据类型与 C# 数据类型的对应关系

TwinCAT 数据类型与 C# 数据类型的对应表如下。需要注意 INT 对应 short、REAL 对应 float 等。

| TwinCAT 数据类型 | 位宽    | C# 数据类型 | 说明 |
|:---------------:|:-------:|:-----------:|----|
| BOOL            | 8 bit   | byte        | 布尔值 / 虽然也有标注为 bool 1bit，但内部实际上以 1 byte 处理 (**注意**) |
| BYTE            | 8 bit   | byte        | 无符号 8 bit 整数 |
| SINT            | 8 bit   | sbyte       | 有符号 8 bit 整数 |
| USINT           | 8 bit   | byte        | 无符号 8 bit 整数 |
| INT             | 16 bit  | short       | 有符号 16 bit 整数 (**注意**) |
| UINT            | 16 bit  | ushort      | 无符号 16 bit 整数 |
| DINT            | 32 bit  | int         | 有符号 32 bit 整数 |
| UDINT           | 32 bit  | uint        | 无符号 32 bit 整数 |
| LINT            | 64 bit  | long        | 有符号 64 bit 整数 |
| ULINT           | 64 bit  | ulong       | 无符号 64 bit 整数 |
| REAL            | 32 bit  | float       | 单精度浮点数 (**注意**) |
| LREAL           | 64 bit  | double      | 双精度浮点数 |
| ENUM            | 16 bit  | short       | 有符号 16 bit 整数 (**注意**) |
| STRING          | 1 byte/char | string  | 1 字符 1 字节的字节序列 + 终止的 NULL(0) 字符 (**注意**) |
| TIME            | 32 bit  | TimeSpan    | 以毫秒为单位的无符号整数 |

# TwinCAT 端的设置

按以下条件注册变量：
- 在 `PlcProject 项目` 的 `GVLs` 中定义全局变量列表名 `GVL_Test`（名称可任意）
- 变量名为 `TestData`，数据类型为 `DINT`

```cs: TwinCAT 端的设置
{attribute 'qualified_only'}
VAR_GLOBAL
    TestData : DINT;
END_VAR
```

下面我们从 C# 端访问 TestData 变量。

# 通过 AdsClient 访问变量

AdsClient 是与 TwinCAT 交互时的入口。数值数据均可通过相同方式进行 Read/Write。

```cs: AdsClient 创建示例
using System;
using TwinCAT.Ads;

namespace AdsComponent
{
    class Program
    {
        static void Main(string[] args)
        {
            // 创建 AdsClient 实例
            AdsClient client = new AdsClient();

            // 连接到 TwinCAT
            // 第1个参数：AmsNetId 字符串
            // 第2个参数：端口号（TwinCAT3 PLC 默认为 851）
            client.Connect("192.168.1.101.1.1", 851);

            // 为引用 TwinCAT 全局变量创建句柄
            // 使用 TwinCAT 端定义的 "全局变量列表名.变量名" 来指定
            uint handle = client.CreateVariableHandle("GVL_Test.TestData");

            // 写入操作
            int writeValue = 123;
            client.WriteAny(handle, writeValue);

            // 读取操作
            int readValue = (int)client.ReadAny(handle, typeof(int));
            Console.WriteLine($"read:{readValue}");

            // 释放句柄
            client.DeleteVariableHandle(handle);

            // 关闭连接并释放资源
            client.Close();
            client.Dispose();
        }
    }
}
```

:::alert:为了可读性省略了异常处理和常量定义等
:::

:::info:AmsNetId 的指定
请指定在连载文章「TwinCATで始めるソフトウェアPLC开发」「[第1回：环境构建篇](https://developer.mamezou-tech.com/robotics/twincat/introduction/twincat-introduction/)」的“ADS通信路由设置”中显示的 AmsNetId。
:::

:::info:连接可保持打开，但使用完毕后务必释放资源
:::

:::info:AdsClient 实现了 System.IDisposable 接口，因此可以使用 using 语句
:::

# 数据变更回调通知

要监视 TwinCAT 端的 `GVL_Test.TestData` 变量是否发生变化，通过 ReadAny() 进行定期轮询效率低且需要自行管理线程。为了解决这个问题，可以在值变化时自动向客户端发送回调通知。

```cs: 数据变更回调通知示例
private AdsClient _adsClient;  // 实例已创建，连接已完成
private uint _handleNotification = 0;

// 开始数据变更通知
public void StartValueChangeNotification()
{
    // 注册事件处理器
    _adsClient.AdsNotificationEx += OnAdsNotified;

    // 注册数据变更通知句柄（开始通知）
    _handleNotification = _adsClient.AddDeviceNotificationEx(
            "GVL_Test.TestData",
            // 当有更改时每 50 毫秒通知一次
            // 最大延迟时间设为 0 毫秒
            new NotificationSettings(AdsTransMode.OnChange, 50, 0),
            null,
            typeof(int));
}

// 接收事件
private void OnAdsNotified(object sender, AdsNotificationExEventArgs evn)
{
    if (evn.Handle != _handleNotification)
    {
        return;
    }

    var data = (int)evn.Value;
    Console.WriteLine($"notified:{data}");
}

// 停止数据变更通知
public void StopValueChangeNotification()
{
    // 删除数据变更通知句柄（停止通知）
    _adsClient.DeleteDeviceNotification(_handleNotification);                 
    _handleNotification = 0;

    // 注销事件处理器
    _adsClient.AdsNotificationEx -= OnAdsNotified;
}
```

`StartValueChangeNotification()` 执行后，当 TwinCAT 端的 `GVL_Test.TestData` 值更新时，C# 端会回调 `OnAdsNotified()`。完成回调通知处理后，请务必执行 `StopValueChangeNotification()` 以释放句柄。

:::info:如何更新 `GVL_Test.TestData` 的值
要手动更新全局变量的定义及其值，请登录 PLC，并在连载文章「TwinCATで始めるソフトウェアPLC开发」「[第2回：ST语言编程（1/2）](https://developer.mamezou-tech.com/robotics/twincat/introduction-chapter2/twincat-introduction-chapter2/)」的“3.3 通过登录进行操作确认”中，直接修改相应变量的值。
:::

# 回调周期通知

通过更改数据变更回调通知的参数，也可以实现周期性通知。

```cs: 回调周期通知示例
// 开始定期通知
public void StartCyclicNotification()
{
    // 注册事件处理器
    _adsClient.AdsNotificationEx += OnAdsNotified;

    // 注册周期通知句柄（开始通知）
    _handleNotification = _adsClient.AddDeviceNotificationEx(
            "GVL_Test.TestData",
            // 每 10 毫秒通知一次
            // 最大延迟时间设为 1 毫秒
            new NotificationSettings(AdsTransMode.Cyclic, 10, 1),
            null,
            typeof(int));
}
```
指定 `AdsTransMode.Cyclic` 后即为周期性通知。将通知间隔设为 10 毫秒，最大延迟时间设为 1 毫秒时，虽然偶尔会出现 1 毫秒的延迟，但基本上能每 10 毫秒准确通知一次。TwinCAT 端在内核模式下运行，因此可以实现精确周期的值通知；但 C# 端作为普通 Windows 应用，受限于 Windows OS 的调度精度和网络驱动的接收处理等可能产生延迟，这种现象很有趣，期待将来对其进行研究。

# 结构体的定义

在 Read/Write 的数据或回调通知的数据类型中，不仅可以使用基本类型，也可以使用结构体，而且结构体可以嵌套。下面以在 TwinCAT 端定义结构体 `DUT_Sample` 为例。

```cs: TwinCAT 端的结构体设置
// 定义 DUT_Sample 结构体
TYPE DUT_Sample :
STRUCT
    IsValid : BOOL;      // BOOL 类型
    Height : DINT;       // DINT 类型
    CurrentMode : EMode; // ENUM 类型
    Status : DUT_Status; // 结构体
END_STRUCT
END_TYPE

// 定义 EMode ENUM 类型
{attribute 'strict'}
{attribute 'to_string'}
TYPE EMode :
(
    Vertical := 0,
    Horizontal := 1
);
END_TYPE

// 定义 DUT_Status 结构体
TYPE DUT_Status :
STRUCT
    Status1 : DINT; // DINT 类型
    Status2 : DINT; // DINT 类型
END_STRUCT
END_TYPE
```

在全局变量列表 `GVL_Test` 中添加 `Sample`。

```cs: TwinCAT 端的全局变量设置
{attribute 'qualified_only'}
VAR_GLOBAL
    TestData : DINT;
    Sample : DUT_Sample;
END_VAR
```

为了让 C# 端也能处理全局变量 `GVL_Test.Sample`，需要在 C# 端定义相同的结构体。但由于对齐问题（在内存中排列数据时的对齐规则），需要注意。TwinCAT 3 默认采用 8 字节对齐，需要按照此规则在 C# 端定义结构体。

- 在结构体上添加属性 `[StructLayout(LayoutKind.Sequential, Pack = 8)]`
- 除结构体外的数据类型需参照「[TwinCAT 数据类型与 C# 数据类型的对应关系](#twincat%E3%81%AE%E3%83%87%E3%83%BC%E3%82%BF%E5%9E%8B%E3%81%A8c#%E3%81%AE%E3%83%87%E3%83%BC%E3%82%BF%E5%9E%8B%E3%81%AE%E5%AF%BE%E5%BF%9C)」进行对应
- 变量的定义顺序需与 TwinCAT 端保持一致

另外，变量和结构体的名称并不一定要与 TwinCAT 端保持一致，但若保持一致能更清晰地对应，推荐如此。

```cs: C# 端结构体定义示例
// Sample 结构体
[StructLayout(LayoutKind.Sequential, Pack = 8)]
public struct Sample
{
    public byte   IsValid;     // BOOL 类型 => byte
    public int    Height;      // DINT 类型 => int
    public EMode  CurrentMode; // ENUM 类型 => EMode
    public Status Status;      // 结构体 => Status
}

// 定义 EMode
public enum EMode : short     // ENUM 类型 => short
{
    Vertical,
    Horizontal,
}

// Status 结构体
[StructLayout(LayoutKind.Sequential, Pack = 8)]
public struct Sample
{
    public int Status1; // DINT => int
    public int Status2; // DINT => int
}
```

可通过 `int readValue = (Sample)client.ReadAny(handle, typeof(Sample));` 这样使用强制转换和 `typeof()`，与基本类型使用相同的 API。

# 字符串(string) 的读写

在 TwinCAT 端可以使用 STRING 类型来处理字符串。但由于它作为单字节 ASCII 编码（Latin-1）处理，直接写入日文会出现乱码。此外，需要以字节数来指定定义。因此，需要指定使用 UTF-8 编码来定义。

```cs: TwinCAT 端的设置
{attribute 'qualified_only'}
VAR_GLOBAL
    TestData : DINT;
    Sample : DUT_Sample;

    // 分层应用程序发送数据
    {attribute 'TcEncoding':='UTF-8'}
    Message : STRING(1024);
END_VAR
```

- 在变量定义中添加 `{attribute 'TcEncoding':='UTF-8'}` 以使其将字符编码解释为 UTF-8
- 字符大小以字节数指定
- 字符大小需包含终止的 NULL(0) 字符

在 UTF-8 下，单个字符的字节数可变（1～4 字节）。一般常见的日文占用 3 字节，请指定足够的字节大小。

```cs: 字符串(string) Read/Write 示例
using System.Text;

private const int STRING_SIZE = 1024;
private AdsClient _adsClient; // 实例已创建，连接已完成
private uint _handle; // 用于指向 'GVL_Test.Message'

// 写入字符串
public void WriteMessage(string message)
{
    // 将 UTF-8 字符串转换为字节数组
    byte[] utf8Bytes = Encoding.UTF8.GetBytes(message);

    // 检查字节大小
    if (utf8Bytes.Length > STRING_SIZE)
    {
        throw new Exception($"字节数超出限制");
    }

    // 缓冲区初始状态已用 NULL(0) 字符填充
    byte[] targetBuffer = new byte[STRING_SIZE];
    // 将转换后的字节数组从固定长度数组的起始位置复制
    Buffer.BlockCopy(utf8Bytes, 0, targetBuffer, 0, utf8Bytes.Length);

    _adsClient.WriteAny(_handle, targetBuffer);
}

// 读取字符串
public string ReadMessage()
{
    // 获取固定长度字节数组（包括终止 NULL 字符）
    var byteArray = (byte[])_adsClient.ReadAny(
            _handle, typeof(byte[]), new int[] {STRING_SIZE});

    // 在字节数组中查找第一个 NULL 字符 (0)
    int nullCharIndex = Array.IndexOf(byteArray, (byte)0);

    // 如果找到 NULL 字符，则将其之前作为字符串
    if (nullCharIndex >= 0)
    {
        // GetString(字节数组, 起始索引, 长度)
        return Encoding.UTF8.GetString(byteArray, 0, nullCharIndex);
    }

    // 如果未找到 NULL 字符（缓冲区被字符串填满），
    // 转换整个数组
    return Encoding.UTF8.GetString(byteArray);
}
```

处理 UTF-8 字符串的代码比其他数据类型稍显冗长。由于字符串以定义时指定的字节大小的数组进行收发，即使只想发送一个字符，其余部分也会用 NULL 字符填充，按缓冲区大小传输数据。

# 总结

通过 ADS 通信，相信大家已经理解了多种数据类型的使用方式及回调通知的方法。应用这些技术即可实现 RPC 或进程间通信。当在 `PC1上的进程A` 与 `PC2上的进程B` 协作时，如果将数据类型定义为 JSON 字符串（如 STRING(1024)），就可以使用通用数据构建分布式处理系统。另外，若巧妙利用回调通知机制，也许可以将 TwinCAT 上的变量视为 Topic，构建 Publish/Subscribe 型系统。

Beckhoff 在其网站公开了 ADS 通信协议规范，也有开源的 ADS 通信库。因此，Python、Node.js、Go 等语言也能够进行 ADS 通信。但需要注意，这些开源库显然无法获得 Beckhoff 的官方支持。
