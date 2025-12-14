---
title: 对六边形架构的“违和感”彻底剖析！通过图解清晰理解3个疑问与本质
author: toshio-ogiwara
date: 2025-12-08T00:00:00.000Z
tags:
  - ソフトウェア設計
  - advent2025
image: true
translate: true

---

这是[is开发者网站Advent日历2025](/events/advent-calendar/2025/)第8天的文章。

对于六边形架构（Ports & Adapters），虽然感觉上大概理解了，但总有一些难以释怀的地方，对吧？就我而言，主要有以下三点。

- 虽说“依赖应从外侧 → 内侧”，但为什么**在输入端口与实现之间依赖看起来是反向的**？这样可以吗？  
- **输入适配器没有实现端口接口**，却**输出适配器实现了端口接口**，这让人感觉怪怪的  
- 归根结底，**六边形架构和洋葱架构到底有什么区别？**

本文将以示例结合的方式，说明整理这些困惑时的笔记。

## 1. 用于说明示例的六边形架构结构

首先，本文以下所示的“教科书式六边形”包结构的 Spring Boot 待办（TODO）应用为示例进行说明。

```text
com.example.todohex
├─ TodoHexApplication        … @SpringBootApplication
│
├─ domain                    … 领域模型（纯Java）
│   └─ Task.java
│
├─ application
│   ├─ port
│   │   ├─ in                … 输入端口（UseCase 接口）
│   │   │   ├─ CreateTaskUseCase.java
│   │   │   └─ GetTaskUseCase.java
│   │   └─ out               … 输出端口（Repo/Gateway 接口）
│   │       ├─ SaveTaskPort.java
│   │       └─ LoadTaskPort.java
│   └─ service               … 用例实现
│       └─ TaskService.java
│
├─ adapter
│   ├─ in
│   │   └─ web                … REST 适配器（输入端）
│   │       ├─ TaskController.java
│   │       ├─ TaskRequest.java
│   │       └─ TaskResponse.java
│   └─ out
│       └─ persistence        … 持久化适配器（输出端）
│           ├─ TaskEntity.java
│           ├─ SpringDataTaskRepository.java
│           └─ TaskPersistenceAdapter.java
└─ ...
```

## 2. 有些依赖方向相反，这样可以吗？

那么，马上进入第一个困惑。哪里看起来是“反向的”呢？按照教科书式的方式，从 UseCase 推导到 Service 时，依赖关系[^1]会是反向的。如果根据示例画图，就像下图所示，红线的依赖关系是从右到左的。

![01](/img/blogs/2025/1208_hexagonal_four_questions/01_port-in.drawio.svg)

[^1]: 在 UML 中，“依赖关系”指的是两者之间的一种临时关系 (dependency)，但在此处并不是以 UML 的意义来使用，而是用“依赖关系”一词来表示简单的使用与被使用关系。

另一方面，针对六边形架构的众多教程中常常出现“模块的依赖应是外→内”的说明。此时就会产生这样的疑问：“诶，`port` 和 `service` 的依赖关系不是反向的嘛，这样可以吗？”。  

因此，我们暂且回到原典，回顾六边形架构的提出者阿里斯泰尔·柯本（Alistair Cockburn）本人是怎么说的。在他可视为原典的[原文][1]中，大致可以归纳为以下几点。

> * 应用通过 **Port** 与外部进行对话  
> * 该 **Port** 的协议以“应用程序 API”的形式存在  

这里所说的“API”可以是方法调用、HTTP，也可以是消息协议等任何形式，是相当抽象的层面。至少在原典中，并没有像 Java 生态中的那种“礼节级”说法：

* “把输入端口分为 **接口和实现类**”  
* “模块的依赖箭头**务必指向外→内**”  

另外，在他最近的[幻灯片版][2]中，为了面向强类型语言，提到了

> * 声明“required interface”  
> * 为 Port 声明准备一个文件夹  

之类的内容，但**并未深入依赖箭头规则本身**。

:::column: 结论：依赖从外侧到内侧只是个都市传说
阿里斯泰尔·柯本没有对依赖方向作出任何规定。恰恰相反，他说要在端口处暴露接口，因此端口与其实现之间的依赖关系逆向是很自然的。我个人认为，这个说法是因为在与明确指出“依赖只能从外层环向内层环”的洁净架构[^2]放在同一语境下讨论六边形架构时产生的都市传说。  
不过，如果将 `port.in` 和 `service` 看作一个“应用核心模块”，那么 `adapter.in` → `(port.in + service)` → `domain` 就形成了“外→内”的结构，因此也可以将其视为洁净架构的一种而无大碍。
:::

[^2]: 我个人认为 Bob叔所说的洁净架构只是提供了一种“洁净架构应该如何！”之类的概念，并不存在所谓的“洁净架构”这种架构。所以，文中所说的洁净架构，是指领域与技术细节分离和隔离的“洁净架构”含义。

## 3. 适配器不实现端口接口吗？

下一个困惑是这个。

* in 侧的适配器（如 Controller）没有实现 port.in（红色依赖）  
* out 侧的适配器（DB 或外部 API）实现了 port.out（蓝色依赖）

仅靠文字不太容易理解，用图示如下。

![02](/img/blogs/2025/1208_hexagonal_four_questions/02_adapter.drawio.svg)

同样是适配器，却有的要实现端口、有的不用，左右也不对称，总觉得怪怪的。说实话，难道只有我觉得这真没问题吗？

有疑问就回到[原典][1]看看柯本是怎么说的。他把 Hexagonal 也称为 Ports & Adapters，在这里的 Port 和 Adapter 是“角色名称”。

* Port：  
  * 表示“为了什么而进行对话”的**逻辑接口**  
* Adapter：  
  * 将该 Port 接入到特定技术（HTTP / CLI / DB / 邮件 / 文件…）的**转换器**  

而在他的[幻灯片][2]中，将 Port 分为

* Driving Ports（驱动应用程序的那一侧）  
* Driven Ports（被应用程序驱动的那一侧）  

来进行说明。

从这个视角来看，

* Driving Port 侧  
  * Adapter（UI / REST / Batch …）是按照 Port 定义进行调用的**客户端**  
* Driven Port 侧  
  * Adapter（DB / 邮件 / 外部 API …）是满足 Port 定义并执行的**服务器**  

因此，

* in 侧的适配器不实现端口接口  
* out 侧的适配器实现了端口接口  

这种**非对称性其实很自然**。

:::column: 结论：适配器和端口是角色名，并非语法模式
Port / Adapter 这一名称并不是指“输入 = implements，输出 = implements”这样的语法模式，而仅仅是指**“表示对话目的的窗口”和“与外界的转换器”**这两个角色。这样一来，实现与否的非对称性就不那么令人在意了。
:::

## 4. 六边形架构和洋葱架构有什么不同？

最后一个困惑是：  
> 到底六边形架构和洋葱架构有什么区别？

那么，为了看清它们的区别，我们来分别看看它们的整体结构。

### 首先是洋葱架构

粗略地画出洋葱架构，大致如下。

![03](/img/blogs/2025/1208_hexagonal_four_questions/03_onion.drawio.svg)

<br>

洋葱架构的重点是（从本图中不太容易看出……）  
* 以领域为中心，以同心圆状构建各个层  
* 依赖应当是外侧 → 内侧  
* **保护领域**  

以上几点。

### 接下来是六边形架构的结构

相对而言，六边形架构（Ports & Adapters）是一种**聚焦在边界（Port）上的架构**。

![04](/img/blogs/2025/1208_hexagonal_four_questions/04_hexagonal.drawio.svg)

将两者并排比较，可以看出六边形架构在结构上将洋葱架构的 application 部分及其边界细分为 `port.in` / `port.out` 和 `adapter.in` / `adapter.out`，**强调了输入输出的边界（在哪里进入、又从哪里退出）**。

换句话说：

- 洋葱架构：通过层（Layer）来保护内部的架构  
- 六边形架构：通过端口和适配器来强调边界的架构  

而它们所追求的目标本身都非常相似：

* 以领域为中心  
* 与外界（UI/DB/外部系统）解耦  
* 提高可测试性  

:::column: 结论：六边形架构可以说是洋葱架构的高级版本
从结构角度来看，“六边形 = 将洋葱架构的 application + 边界部分分解为 port 与 adapter，从而‘强调输入输出边界’的版本”。然而，洋葱架构的特点是从外侧向内侧依次构建层，而六边形架构则如图中蓝线所示，形成了外 → 内 → 外的结构，以在结构层面强调“从哪里进入，又向哪里退出”。因此，其原始概念是不同的。
:::

## 5. 结语

采用六边形架构确实能够实现一种干净的架构，但这也需要付出成本。柯本本人在[幻灯片][2]中也提到：

* 每个 Port 都会增加字段和 DI 配置  
* 在强类型语言中需要为 Port 准备接口和文件夹结构  
* 需要设计 Configurator（配置根）  

换言之，六边形架构以整洁为代价，会增加类和接口的数量。如果个人只是想分离领域，洋葱架构往往就足够了。  
好的方案并不总是适合所有情况。在架构设计中，重要的是思考自己真正需要什么，并选择与之相匹配的架构。

[1]: https://alistair.cockburn.us/hexagonal-architecture?utm_source=chatgpt.com "hexagonal-architecture - Alistair Cockburn"
[2]: https://alistaircockburn.com/Hexagonal%20Budapest%2023-05-18.pdf?utm_source=chatgpt.com "Hexagonal Architecture ( Ports & Adapters )"
