---
title: 使用TwinCAT开始软件PLC开发（第2部分：ST语言编程（1/2））
author: hayato-ota
tags:
  - PLC
  - TwinCAT
date: 2025-10-08T00:00:00.000Z
image: true
translate: true

---

# 0. 前言
[上一篇](https://developer.mamezou-tech.com/robotics/twincat/introduction/twincat-introduction/)中介绍了TwinCAT的开发环境（XAE）和运行环境（XAR）的构建方法。  
这次将介绍基本的PLC程序的实现方法。

# 1. 什么是ST语言？
它是IEC61131-3规范中规定的5种编程语言之一。  
这是一种支持以文本形式实现的语言，使用类似Pascal的语法进行编写。  
本文将使用该语言。

```cs: 使用ST语言编写的程序示例
FOR i:=0 TO 10 DO
    // 执行方法，通过参数进行数据的输入输出
    fbHogeHoge.FugaFuga(i, outData => tmpData)
END_FOR
```

# 2. PLC程序的创建与实现
启动开发环境，并使用ST语言来实现PLC程序。

## 2.1 创建解决方案
打开Visual Studio或XAE Shell。  
（本次选择了Visual Studio）

选择“创建新项目”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-twincat-solution-1.png)

在项目模板中选择“TwinCAT XAE Project (XML format)”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-twincat-solution-2.png)

指定项目名称和解决方案名称。勾选“将解决方案和项目放在同一目录中”。  
项目名称和解决方案名称均设为“TwinCAT-Tutorial”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-twincat-solution-3.png)

## 2.2 创建PLC项目
在“解决方案资源管理器”中右键单击“PLC”，然后点击“添加新项”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-plc-project-1.png)

:::info: 如何打开解决方案资源管理器
如果在XAEShell或Visual Studio的左侧没有显示解决方案资源管理器，请点击以下菜单：  
- “视图”>“解决方案资源管理器”  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/howto-show-solution-explorer.png)
:::

选择“Standard PLC Project”，并指定项目名称。  
本次命名为“PlcTutorialProject”，然后点击“添加”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-plc-project-2.png)

## 2.3 编辑MAIN程序
新建PLC程序后，在“解决方案资源管理器”中“PLC”节点下会添加相关项。  
点击“POUs”文件夹中的“MAIN(PRG)”以打开编辑界面。

编辑界面的上半部分用于定义变量，下半部分用于编写程序逻辑。  
（类比C++，上半部分相当于头文件，下半部分相当于源文件）  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-plc-project-3.png)

在定义区（上半部分）中按如下方式编写。本次定义一个DINT类型（有符号32位整数）的变量。  
定义变量时按照“变量名 : 类型”的格式进行书写。

```cs: MAIN程序 定义区
PROGRAM MAIN
VAR
    /// 程序调用次数
    CycleCount : DINT;
END_VAR
```
在实现区（下半部分）中按如下方式编写。  
本次每次执行时对变量“CycleCount”进行自增。

```cs: MAIN程序 实现区
// 自增变量
CycleCount := CycleCount + 1;
```

:::alert: 赋值符号
赋值使用“:=”。请注意“=”是**相等判断（值是否相等）**运算符。
:::

:::info: TwinCAT中可用的基本类型
可用的基本类型列表请参见[此处](https://infosys.beckhoff.com/english.php?content=../content/1033/tcplccontrol/925424907.html&id=)。
:::

:::check: 自动补全功能
按“Ctrl+Space”键可显示补全候选窗口，推荐用于加快编码效率。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/editor-auto-complementation.gif)
:::

编辑完成后，构建并确认无错误。  
点击IDE上方的“生成”选项卡 > “生成解决方案”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-plc-project-4.png)

在IDE下方的“输出”选项卡中确认失败数为0。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-plc-project-5.png)

# 3. 项目的部署与运行验证
## 3.1 部署前的检查
为了写入程序，首先确认能否访问XAR环境（即运行环境）。

在系统托盘中右键点击齿轮图标，选择  
“Router”>“Edit Routes”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/configure-ams-routing-1.png)

:::info: 系统托盘未显示图标时
若系统托盘未显示齿轮图标，请运行以下exe文件：  
`C:\Program Files (x86)\Beckhoff\TwinCAT\3.1\System\TcAmsRemoteMgr.exe`  
（若更改了TwinCAT的安装路径，上述路径可能不同）  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/configure-ams-routing-2.png)
:::

在弹出的“TwinCAT Static Routes”窗口中，若显示为绿色即表示连接正常。  
若无绿色项，请参照[上一篇文章的3章和4章](https://developer.mamezou-tech.com/robotics/twincat/introduction/twincat-introduction/#3-%E3%83%95%E3%82%A1%E3%82%A4%E3%82%A2%E3%82%A6%E3%82%AA%E3%83%BC%E3%83%AB%E8%A8%AD%E5%AE%9A)重新检查配置。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/configure-ams-routing-3.png)

## 3.2 部署项目
确认已与XAR建立通信后，在IDE中指定目标。

打开IDE，点击“视图”选项卡 > “工具栏” > 勾选“TwinCAT XAE Base”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/deploy-to-xar-1.png)

这将使IDE顶部显示与TwinCAT相关的选项。

【更改前】  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/deploy-to-xar-2.png)

【更改后】  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/deploy-to-xar-3.png)

在新增的选项中，点击显示“本地(Local)”的组合框，指定XAR环境为目标。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/deploy-to-xar-4.png)

指定目标后，点击蓝色楼梯图标。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/deploy-to-xar-5.png)

弹出“激活配置”窗口，点击“OK”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/deploy-to-xar-6.png)

首次写入时会提示生成评估许可证，选择“是”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/deploy-to-xar-7.png)

在文本框中输入显示的相同字符串，点击“OK”。  
此操作将生成评估许可证，使程序可运行。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/deploy-to-xar-8.png)

:::info: TwinCAT运行时许可证说明
若要在XAR环境中使用TwinCAT的各个软件包，则需要许可证。  
若无许可证，可生成免费评估许可证使用。  
但此评估许可证有效期为7天，过期后需重新生成。  
评估许可证相较正式许可证在功能上有限制，但仅用于基本功能验证已足够。
:::

系统会提示是否重启TwinCAT，点击“OK”以重启。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/deploy-to-xar-9.png)

若IDE右下角的齿轮图标如图所示绿色且旋转，表示程序已正常运行。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/deploy-to-xar-10.gif)

## 3.3 登录并验证运行
在TwinCAT中，通过登录XAR可实时查看变量值。  
使用此登录功能检查刚写入的程序是否正常运行。

点击“扩展功能”选项卡 > “PLC” > “登录”以登录。  
若此按钮处于不可用状态，请检查目标组合框中是否指定了正确的目标。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/login-and-check-program-1.png)

登录后打开MAIN程序，即可实时查看CycleCount变量的值。  
可看到每秒大约增加100次。  
这是因为创建TwinCAT项目时生成的任务执行周期为10ms。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/login-and-check-program-2.png)

# 4. 修改任务的执行周期
默认生成的任务周期为10ms，下面将其修改。  
首先删除项目生成时自动添加的任务。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-1.png)

创建新任务：在“SYSTEM”>“任务”上右键点击，选择“添加新项”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-2.png)

选择类型为“TwinCAT Task”，命名为“MainTask”，点击“OK”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-3.png)

在打开的任务详细设置界面，将“周期性(Cyclic)”从10改为100。  
这样任务的执行周期即为100ms。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-4.png)

:::info
默认情况下，每个周期性时间单位为1ms，但可通过CPU核心设置进行修改。  
详情请参见：https://infosys.beckhoff.com/english.php?content=../content/1033/tc3_system/5210414219.html&id=
:::

创建任务后，设置调用哪个程序。  
右键点击“PLC项目”>“添加”>“可引用的任务”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-5.png)

在可分配的任务列表中，选择刚创建的“MainTask”，点击“Open”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-6.png)

右键点击生成的“任务引用”项，选择“添加”>“现有项”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-7.png)

选择要由任务调用的程序。选择刚才修改的“MAIN”程序，然后点击“OK”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-8.png)

同样地，登录并观察变量变化。  
可观察到每秒新增量为10。  
这是因为新的任务每100ms调用一次MAIN程序。

# 5. 在同一任务中注册多个程序
一个任务可以注册多个程序。  
例如，如果在执行周期为10ms的任务中注册程序A和程序B，则每10ms将依次执行程序A和程序B。  
但请注意，程序A和B并非并行执行，而是**在某一程序完成后再执行另一程序**。

下图展示了其概念结构。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/relation-between-task-and-program.png)

:::stop
如果两程序的处理时间之和超过任务执行周期（任务超时），系统可能会挂起。  
请注意程序执行时间与任务执行周期。
:::

下面实际将多个程序分配到同一任务。  
右键点击“POUs”文件夹，选择“添加”>“POU”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/add-program-1.png)

将程序命名为“MAIN2”，类型选择“程序(Program)”，实现语言选择“结构化文本(ST)”，然后点击“Open”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/add-program-2.png)

在MAIN2程序中，同样编写对变量的计数处理。  
（为与MAIN程序区分，将自增量设为2倍）

```cs: MAIN2程序 定义区
PROGRAM MAIN2
VAR
    /// 程序调用次数的2倍值
    CycleDoubleCount : DINT;
END_VAR
```

```cs: MAIN2程序 实现区
CycleDoubleCount := CycleDoubleCount + 2;
```

与MAIN程序相同，将MAIN2程序分配给MainTask。  

![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/assign-new-task-1.png)  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/assign-new-task-2.png)

确认MainTask引用项的子元素中包含“MAIN”和“MAIN2”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/assign-new-task-3.png)

写入并验证运行。  
MAIN2程序将与MAIN程序相同周期（100ms）执行，可观察到CycleDoubleCount每秒增加20。

# 6. 在程序间共享数据
有时需要在一个程序中计算的值在另一个程序中使用。  
此时可以在程序或任务间定义共享数据（全局变量）。  
全局变量作为所有任务可访问的共享资源定义，可实现跨任务的数据共享。

下面在MAIN程序中写入的值将在MAIN2程序中读取。

右键点击“GVLs”文件夹，选择“添加”>“Global Variable List”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/add-new-global-variable-1.png)

将变量列表命名为“GVL_Var”，然后点击“Open”。  
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/add-new-global-variable-2.png)

在“GVL_Var”节点下点击打开编辑界面，按如下定义全局变量。

```cs: GVL_Var
{attribute 'qualified_only'}
VAR_GLOBAL
    /// 程序间共享数据
    SharedData : DINT;
END_VAR
```

:::info
首行大括号内内容为全局变量属性(Attribute)。  
有关属性详细信息，请参见：  
https://infosys.beckhoff.com/english.php?content=../content/1033/tc3_plc_intro/2529567115.html&id=
:::

在MAIN程序中，将全局变量(SharedData)赋值为CycleCount变量的值。

```cs: MAIN程序 实现区
CycleCount := CycleCount + 1;

// 将值写入共享数据（新增）
GVL_Var.SharedData := CycleCount;
```

在MAIN2程序中，作为另一个变量接收该值。

```cs: MAIN2程序 定义区
PROGRAM MAIN2
VAR
    CycleDoubleCount : DINT;
    
    /// MAIN程序的数据
    MainProgramData : DINT;
END_VAR
```

```cs: MAIN2程序 实现区
CycleDoubleCount := CycleDoubleCount + 1;

// 将共享数据的值存入本地变量
MainProgramData := GVL_Var.SharedData;
```

将TwinCAT项目写入并验证。  
可在MAIN2程序的MainProgramData变量中确认已存储MAIN程序CycleCount变量的值。

# 7. 结语
本文尝试使用ST语言创建了基本的PLC程序。  
相信您已理解任务和程序的使用方法。  
至此的项目可在[此处](https://github.com/hayat0-ota/TwinCAT-Tutorial/tree/Chapter2)获取，供参考。

下次将介绍使用功能块(Function Block)的PLC编程。
