---
title: 🤖通过PC-SDK与ABB机器人控制器集成时的10大陷阱🕳️
author: shuji-morimoto
tags:
  - ロボット
  - PC-SDK
  - ABB
date: 2026-03-26T00:00:00.000Z
image: true
translate: true

---

2025年10月8日，一条震撼机器人产业的重磅新闻传来。  
报道说，软银集团从瑞士重电巨头 ABB[^a] 收购了其机器人部门。

恰在那个时候，我正日夜奋战于与 ABB 机器人控制器对接的程序开发工作。  
我尝试使用机器人控制 API——PC-SDK[^b] 进行对接，却多次陷入各种坑里。  
那种感觉就像在玩「死而复生」的游戏。在反复失败中，我不断检验 API 的行为、学习用法、思考最优流程，逐一解决各种问题和任务。

如今，这些经历已成为我攻克 PC-SDK 的诀窍。因此，我挑选出了 10 个印象深刻的坑，并将其连同如何回避的方式一并公开，兼作备忘。

:::info:机器人开发前提知识
如想了解离线示教或机器人控制 API 的相关概念，请参阅「[产业用机器人的示教方法及其应用](https://developer.mamezou-tech.com/blogs/2025/09/09/robot-teaching-and-applications/)」。
:::

# 什么是 PC-SDK
此处所指的 PC-SDK 是一款用于从 PC 对 ABB 机器人控制器/机器人进行控制和监视的开发套件（库）。它基于 .NET Framework，可用于创建在 Windows PC 上运行的自定义应用程序。由于依赖于 .NET Framework 且后面将介绍的通信驱动仅适用于 Windows，因此似乎不支持 Linux。

**主要功能**
- 控制器状态访问：获取机器人控制器的执行状态、机器人姿态，以及 I/O 信号的读写
- 程序操作：加载程序、启动、停止
- 数据访问：读写机器人程序中的变量
- 文件传输：在 PC 与机器人控制器之间进行文件发送和接收

:::info:在模拟器环境中的使用
作为开发时使用的工具，除了 PC-SDK 之外，还有 RobotStudio[^d]。RobotStudio 内含虚拟机器人控制器，是一款可通过 GUI 应用进行离线示教的应用程序。由于 PC-SDK 也能连接到该虚拟机器人控制器，只要有 RobotStudio，即使没有实机也能进行 PC-SDK 开发。
:::

# 陷阱分级表
我将使用 PC-SDK 时可能遇到的陷阱按损害程度进行了分级。可基于此对陷阱进行评估。

|级别|损害等级|
|:----:|----|
|<span style="font-weight: bold; color: white;background-color: #E63946; padding: 4px 10px; border-radius: 6px;">S</span>|这也太离谱了！？该怎么规避？会造成精神层面巨大损伤的级别|
|<span style="font-weight: bold; color: white;background-color: #F4A261; padding: 4px 10px; border-radius: 6px;">A</span>|诶，为什么？好惊讶——大概……总能想办法应付过来的级别|
|<span style="font-weight: bold; color: white;background-color: #2A9D8F; padding: 4px 10px; border-radius: 6px;">B</span>|原来如此，这种事常有。被坑了啊的级别|
|<span style="font-weight: bold; color: white;background-color: #457B9D; padding: 4px 10px; border-radius: 6px;">C</span>|事先可规避 或者 掉坑也不太痛的级别|

仅代表个人观点。

# 🕳️1. 网络上的信息很少 <span style="font-weight: bold; color: white;background-color: #2A9D8F; padding: 4px 10px; border-radius: 6px;">B</span>
**陷阱**  
当我们使用开源库时，如果有不懂的地方会在网上搜索，没错吧。以同样的方式搜索 PC-SDK 相关信息或 API 时，几乎找不到资料，显示的要么是 ABB 官网上的内容，要么是 Stack Overflow 等涉及编程主题的英文问答网站。

几乎找不到日语的个人站点或 ABB 以外的科技公司所撰写的说明。就连 ABB 官网上的示例代码也寥寥无几。因此，需要仔细翻阅英文 QA 网站并边翻译[^c] 边确认内容。不过，有时也难以获得有用信息，或者信息已经是 5～10 年前的旧资料。

**对策**  
可从官方站点（或通过网络搜索）下载 API 参考和说明书等 PDF 文件。将其保存在手边，作为第一手资料粗略了解内容，遇到不懂的地方就从中查询。

最近我还会使用 Google 的 NotebookLM。如果将 API 参考、说明书 PDF，以及有用的网站信息注册到 NotebookLM，就可以通过提示词进行提问。它还能提供摘要并显示证据，让你比自己搜索更便捷地获取信息。

# 🕳️2. AI 常常产生幻觉 <span style="font-weight: bold; color: white;background-color: #2A9D8F; padding: 4px 10px; border-radius: 6px;">B</span>
**陷阱**  
最近如果遇到不懂的问题，我更常向 AI 提问，而不是自己搜索，  
“告诉我 PC-SDK 的 API xxxx 的用法”  
“用 xxxx 实现 xxxxx 处理的示例”  
等类似提示词时，可能受到前面“🕳️1. 网络上的信息很少” 的影响，AI 会输出不存在的 API 或参数错误的代码示例。

它会轻描淡写地自然撒谎。当你指出错误并重新输入提示词时，它可能会出现其他参数错误，或者输出无法在新版环境运行的老旧代码，几乎毫无帮助。

**对策**  
- 在 Visual Studio 等中创建项目，引用 PC-SDK 库，然后通过对象浏览器查看 API  
- 打开随 PC-SDK 附带的 `abb.robotics.controllers.pc.xml`，参考其中关于 API 的说明信息  

# 🕳️3. 有时无法找到机器人控制器 <span style="font-weight: bold; color: white;background-color: #F4A261; padding: 4px 10px; border-radius: 6px;">A</span>
**陷阱**  
API 会在本地网络中搜索（UDP 广播）运行中的机器人控制器，找到后登录并连接控制器。由于 RobotStudio 在本地 PC 上运行，可以瞬时完成连接，但在实际运营环境中，却出现搜索机器人控制器超时或在第二次搜索时才检测到等奇怪现象。

**对策**  
在网络接口（NIC）多达 4、8 个的环境中，不知道该搜索哪个网络，会导致搜索时超时而找不到控制器。为了解决此问题，可以在搜索之前指定机器人控制器的 IP 地址。

```cs:实机机器人控制器连接示例
var scanner = new NetworkScanner();

// 直接指定机器人控制器的 IP 地址，并将其添加到扫描器的探索列表中
// 这样 PC-SDK 就能判断通过哪个 NIC 进行连接
NetworkScanner.AddRemoteController("xxx.xxx.xxx.xxx");

// 使用事先获取的机器人控制器 UUID 进行搜索
var systemId = Guid.Parse("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
// systemId, 等待时间[msec], 重试次数
var controllerInfo = scanner.Find(systemId, 1000,3);

if (controllerInfo == null)
{
    throw new Exception("未找到控制器。");
}

// 连接到实机
_controller = Controller.Connect(controllerInfo, ConnectionType.Standalone);
```

如果已经指定了 IP 地址，那么使用 Find() 的意义就不大了，不过这样可以解决问题。

# 🕳️4. 忘记获取控制权 <span style="font-weight: bold; color: white;background-color: #457B9D; padding: 4px 10px; border-radius: 6px;">C</span>
**陷阱**  
当连接到机器人控制器后，若执行如下需要更改状态的操作，就会报错：  
- 更新 RAPID[^e] 变量的值  
- 将伺服电机打开  
- 加载 RAPID 程序（任务分配）  
- 启动 RAPID 程序

**对策**  
需要向控制器发出 Mastership 请求（写入权限请求）并获取控制权后再进行更新。示例代码和网上例子有不少，不用慌。

```cs:Mastership 请求
using (Mastership.Request(_controller))
{
    // 在此处编写更新操作
}
```

不过，有时 Mastership 请求会失败，需要加入重试机制或在异常处理中编写错误处理逻辑。此外，获取控制器状态或 RAPID 变量值等只读操作无需 Mastership 请求。

# 🕳️5. 在运营环境中无法连接到机器人控制器 <span style="font-weight: bold; color: white;background-color: #E63946; padding: 4px 10px; border-radius: 6px;">S</span>
**陷阱**  
在开发环境中可以连接到 RobotStudio 上的虚拟机器人控制器。但是在运营环境中，即使 IP 地址等正确且 `ping` 正常，也无法获取机器人控制器的状态。

开发环境的构成  
![](/img/robotics/industrial-network/pc_sdk-avoiding-pitfall/development_env.png)

运营环境的构成  
![](/img/robotics/industrial-network/pc_sdk-avoiding-pitfall/production_env.png)

**对策**  
安装 RobotStudio 时，会（在后台）安装用于与机器人控制器通信的驱动。没有这个驱动无法通信。在运营环境中不需要安装 RobotStudio，如果仅使用 PC-SDK（库），就不会安装该驱动，从而导致错误。

可从 ABB 网站下载 `RobotWare_Tools_and_Utilities_x.x.x.zip`（x.x.x 为版本号），解压后运行 `RobotCommunicationRuntime/ABB Industrial Robot Communication Runtime.msi` 安装驱动，PC-SDK 即可正常连接。真是太容易忽略了。

# 🕳️6. 无法从远程 PC 连接到 RobotStudio <span style="font-weight: bold; color: white;background-color: #457B9D; padding: 4px 10px; border-radius: 6px;">C</span>
**陷阱**  
我在开发环境中验证了前面的 “🕳️5. 在运营环境中无法连接到机器人控制器”。  
1. 准备两台 PC  
2. 将其中一台（称为 A）作为应用运行环境  
3. 在另一台（称为 B）上安装 RobotStudio（虚拟机器人控制器），将其视为机器人控制器  
4. 在 A 和 B 上安装 `RobotWare_Tools_and_Utilities_x.x.x.zip` 中的驱动  
5. 从 A 使用 PC-SDK 连接 B 的虚拟控制器

连接测试环境的构成  
![](/img/robotics/industrial-network/pc_sdk-avoiding-pitfall/connection_test_env.png)

尝试以上步骤后，还是惨遭失败，无法连接。

**对策**  
似乎 RobotStudio 只接受本地 PC 的访问，因此无法从远程 PC 进行连接。这可能与许可证有关（1 台 RobotStudio 对应 1 个许可证）。无可奈何。

# 🕳️7. 在运营环境中无法执行 RAPID <span style="font-weight: bold; color: white;background-color: #F4A261; padding: 4px 10px; border-radius: 6px;">A</span>
**陷阱**  
在 RobotStudio 中，登录后可以正常加载和执行 RAPID。然而在运营环境中，虽然能连接到控制器，但在指示加载或执行 RAPID 时却会抛出异常。这是怎么回事？

**对策**  
连接到机器人控制器时的默认用户为 `Default User`，但在 RobotStudio 和运营环境中该用户拥有的权限不同。各类权限中，执行权限和程序加载权限存在差异。

| 权限       | RobotStudio | 实机 |
|----------|:---------:|:--:|
| 执行权限   |   有      |  无 |
| 加载权限   |   有      |  无 |

即使是 `Default User`，在 RobotStudio 中似乎已被赋予了多种权限，但在实机上有部分权限未被授予。因此，我在实机上新建了一个用户，并赋予与 RobotStudio 上相同的权限，然后使用该用户登录，程序便能正常执行。

此外，RobotStudio 上的虚拟控制器不具备创建用户或授予权限的功能，只有在实机控制器上才能进行，这也是导致我受坑的原因之一。

# 🕳️8. 无法进行数字输出 <span style="font-weight: bold; color: white;background-color: #2A9D8F; padding: 4px 10px; border-radius: 6px;">B</span>
**陷阱**  
机器人控制器具有用于与各类设备通过数字信号（0 or 1）进行交互的物理接口（I/O 端口）。当向该输出端口写入 0 或 1 时会抛出异常，无法输出。

**对策**  
在 ABB 机器人控制器中，需要在 I/O 设置中指定将数字输出分配到哪个物理接口，此时需指定 `Access Level`，默认值为 `Default`。  
`Access Level` 表示在不同层级下，控制端的上下文中读写权限是否可用会有所不同。

| Access Level | Rapid         | Local Client<br>in Auto Mode | Remote Client<br>in Auto Mode |
|-------------|---------------|------------------------------|-------------------------------|
| All         | Write Enabled | Write Enabled                | Write Enabled                 |
| AWACCESS    | Write Enabled | Write Enabled                | Read Only                     |
| Default     | Write Enabled | Read Only                    | Read Only                     |
| Internal    | Read Only     | Read Only                    | Read Only                     |
| ReadOnly    | Read Only     | Read Only                    | Read Only                     |

`Auto Mode` 指的是非人工操作而由程序驱动机器人运动的模式。当机器人控制器处于 `Auto Mode` 时，从外部访问控制器并操作 I/O 时对应最右侧的 `Remote Client in Auto Mode` 列。机器人程序的执行则对应 `Rapid` 列。

这次我们通过 PC-SDK 从外部以程序方式控制机器人控制器，因此属于 `Remote Client in Auto Mode`。在表中，`Access Level` 为 `Default` 行，模式为 `Remote Client in Auto Mode` 列，两者交叉处是 `Read Only`。也就是说，当 `Access Level` 为 `Default` 时，无法进行写入。只有 `Access Level` 为 `All` 时才能写入。真够严苛的。

因此，将数字输出分配时的 `Access Level` 设置为 `All`，就能正常写入了。

:::info
似乎还可以新建 `Access Level`。
:::

# 🕳️9. 数组数据传输缓慢 <span style="font-weight: bold; color: white;background-color: #F4A261; padding: 4px 10px; border-radius: 6px;">A</span>
**陷阱**  
RAPID 端的数组定义  
```cs
MODULE MainModule
    PERS num dataArray{100};
ENDMODULE
```

向数组写入值的一般写法如下。  
```cs
// 仅在第一次时获取一次
RapidData rd = _controller.Rapid.GetRapidData(
        "T_ROB1", "MainModule", "dataArray");
  :
using (Mastership.Request(_controller))
{
    for (int i = 0; i < 100; i++)
    {
        rd.WriteItem(new Num(i), i);
    }
}
```
此时，每调用一次 rd.WriteItem() 就会进行一次网络访问。因此总共需要数百毫秒到几秒的时间。

**对策**  
应尽可能减少 rd.WriteItem() 的调用次数，改为一次性设置数据。在 RAPID 端用 `RECORD` 类型定义结构体。

```cs
MODULE MainModule
    RECORD StructData
        num value1;
        num value2;
        num value3;
        num value4;
        num value5;
    ENDRECORD
    :
ENDMODULE
```

C# 端可以将该结构体作为 UserDefined 类型来引用。在为 UserDefined 类型设置值时如下所示。

```cs
// 仅在第一次时获取一次（创建 RAPID 端 StructData 的副本）
UserDefined ud = new UserDefined(_controller.Rapid.GetRapidDataType(
            "T_ROB1","MainModule","StructData"));
// 仅在第一次时获取一次（创建 RAPID 端 StructData 的引用）
RapidData rd = _controller.Rapid.GetRapidData(
            "T_ROB1","MainModule","StructData");
  :
using (Mastership.Request(_controller))
{
    int value1 = 1;
    int value2 = 2;
    int value3 = 3;
    int value4 = 4;
    int value5 = 5;

    // 构建要设置到 UserDefined 的数据
    structData = $"[{value1},{value2},{value3},{value4},{value5}]";

    // 将数据设置到 UserDefined
    ud.FillFromString2(structData);

    // 向机器人控制器传输数据
    rd.Value = ud;
}
```

此外，RAPID 数据类型如 robtarget 或 jointtarget 数据量非常大。如果只需更新部分数据，可仅传输该部分值，并在 RAPID 端更新数据后使用，这也是有效方法。

:::alert
可以像 ud.FillFromString2("[0,1,2,3,4,5,.....]") 那样通过字符串字面量直接设置所有元素。但对于超大的结构体或数组，有时只设置到中途部分，需要注意。另外解析处理会耗时，但与网络访问相比可忽略不计。
:::

:::alert
当向 AI 请求示例时，它可能会提供过时的 API，甚至提示不存在的 API 导致编译错误。
:::

# 🕳️10. 在实机上执行 RAPID 时出现运行时错误 <span style="font-weight: bold; color: white;background-color: #E63946; padding: 4px 10px; border-radius: 6px;">S</span>
**陷阱**  
在 RobotStudio 上的模拟器中执行 RAPID 时一切正常，程序语法检查也能通过，但将相同程序放到实机运行时却出现运行时错误。若输出以下异常务必注意！！

```
Operation is illegal in current execution state
```

这是运行时错误，可知与状态有关，但究竟是什么状态却毫无头绪。查看控制器日志也看不到直接原因。这种“控制常见问题”里，未知原因的运行时错误最让人头痛。

**对策**  
由于在模拟器上能正常运行，因此直觉上认为是运营环境的配置差异导致。于是我将 RAPID 程序源码全部注释，然后类似二分法地逐步取消注释并重新执行，从程序开头到哪一步出错来定位问题。（或许也可以通过单步执行来完成这一步）

结果发现有两个问题。  
1. 实机上未定义 I/O  
   - 模拟器上定义的 I/O 名称（在引用时为字符串指定）在实机上找不到，导致运行时错误  
2. 中断定时器的触发时间在实机上过短  
   - 以 10[msec] 设置时在模拟器上可运行，但在实机上会出现运行时错误

上述问题本身修复简单，但定位过程耗时。请注意由环境差异引发的运行时错误。

# 为降低风险的开发进度安排
大家看完感觉如何？大多数问题在开发环境（RobotStudio 模拟器）中并未出现，却会在运营环境（实机控制器）中暴露出来。而且，往往刚刚从一个坑里爬出来，又会立即掉进下一个坑，让人不禁灰心丧气。

在开发环境中，对连接虚拟控制器的用户安全策略较宽松，赋予了较高权限；而在运营环境中则安全策略严苛，权限被设定为最小，因而常会发生不兼容的问题。

若运营环境位于远程，需要现场处理时会在人员、时间、行程和资金方面产生巨大成本。因此，如果计划在开发环境中完成开发与功能确认，只在运营环境中一次性进行系统测试，则可能因突发状况而导致进度延迟。

为规避风险，强烈建议在进度计划中设立多个里程碑，分阶段在现场进行功能确认。另外，委托当地工程师进行验证（虽然较为困难）也是从成本效益角度非常有效的手段。

# 总结
在日本，FANUC 和 安川电机（YASKAWA）等世界顶级机器人厂商市场占有率较高，因此欧洲巨头 ABB 的市场份额仅有数个百分点。

ABB 的机器人研发中心位于瑞士，对于较高级的技术难题，通常需要通过日本国内的支持团队升级到总部技术人员。这期间会因时差和各站点间的协作流程而导致回复延迟。

虽然对 PC-SDK 有些苛刻评价，但 ABB 机器人和机器人控制器的功能与性能都非常出色，RobotStudio 的离线示教环境也非常易用且处于顶级水平。ABB 机器人事业部如今成为软银集团的一部分，若其在日本市场扩大份额也不足为奇。届时，其销售和支持团队的规模和质量也将更为厚重。期待 ABB 机器人业务的未来发展。

这次以 PC-SDK 的陷阱为题列举了几个问题，但 RAPID 中也潜藏诸多陷阱。如有机会，也希望能写篇相关内容的文章。

[^a]: 读作 ABB。由 Asea 公司与 Brown Boveri 公司合资成立（Asea·Brown·Boveri）。  
[^b]: 用于从 PC 连接到 ABB 机器人控制器的 SDK（库）。  
[^c]: DeepL、Google 翻译，或在浏览器中右键“翻译成日语”等。  
[^d]: ABB 提供的离线示教（仿真）软件。  
[^e]: 为控制 ABB 工业机器人而开发的专用编程语言。
