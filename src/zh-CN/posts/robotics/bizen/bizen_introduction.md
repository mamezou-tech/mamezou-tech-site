---
title: 在机器人开发中也采用洁净架构。美膳®实现中食工厂的自动化
author: soonki-chang
tags:
  - ロボット
  - 美膳
  - Bizen
  - ソフトウェア設計
  - advent2025
date: 2025-12-19T00:00:00.000Z
image: true
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2025/
translate: true

---

发布有点晚了，但这是[is开发者网站Advent日历2025](/events/advent-calendar/2025/)第15天的文章。

# 引言

is 多年来一直提供机器人系统开发的支持和咨询服务。通过原创机器人「BEANus」系列等积累的技术能力，不仅限于单纯的机械控制，还融合了高级软件技术。

此次，和三井化学株式会社共同开发的面向中食工厂的食品盛盘机器人美膳®（びぜん），正是这一成果的结晶。详细的新闻稿请参见[这里](https://mamezo.tech/n/11061/)。

我主要以软件架构师的身份参与了美膳®的开发。这次，在机器人开发中采用了罕见的洁净架构（Clean Architecture），实现了面向领域的设计。在本文中，将介绍食品盛盘机器人美膳®及其背后的软件架构。

---

<div style="text-align: center; margin: 3em 0;">
  <img src="/img/robotics/bizen/bizen_logo.png" alt="美膳®徽标" style="max-width: 500px; width: 100%;" />
</div>

---

# 美膳®介绍

![](/img/robotics/bizen/bizen_main.png)

美膳®是为了解决中食行业日益严重的劳动力不足而开发的食品盛盘机器人系统。is 负责系统设计、机械和电气设计，以及包括 AI、视觉、运动控制在内的软件开发，三井化学则负责提供高性能树脂材料、开发机器人手爪、制造和销售，通过双方优势互补的联合开发诞生了该产品。

### 美膳®要解决的社会课题

如下图所示，中食工厂的许多盛盘作业仍由人力完成，劳动力不足和人力成本攀升成为严重问题。在此背景下，盛盘工序的自动化备受需求。

<img src="/img/robotics/bizen/bizen_issue.png" width="500" alt="美膳®要解决的社会课题" />

*图片提供：株式会社is*

### 美膳®能做什么

美膳®将便当和熟食的盛盘作业实现自动化。具体而言，能够高速且精准地完成以下高级作业：

- **食材识别与抓取**：通过 AI 视觉瞬时识别放置在番重（食材容器）中随机分布的食材，判断最佳抓取位置进行抓取。
- **容器跟随盛盘**：使用摄像头实时识别输送带上行进容器的位置、姿态和速度，机器人臂在跟随的同时将食材准确盛盘到指定位置。
- **双臂协作动作**：左右机械臂实时共享彼此状态，能够在上游作业遗漏时进行下游补位，或分散作业负荷等，凭借双臂独有的灵活动作最大化生产效率。

### 特点

美膳®具有以下主要特点。

#### 1. 行业内最快水平的生产力  
据说中食工厂人工作业速度约为每小时2000份，而美膳®实现了与人工作业相当的生产能力（2000份/小时）。相比之下，传统的盛盘机器人多数仅约1200份/小时，实现了大幅的生产力提升。

#### 2. 快速切换工序  
在中食工厂中，需要满足多品种小批量生产，因此需要频繁的产线切换。美膳®配备了带脚轮的设计，便于移动，机器人手爪也可轻松更换。由此，无论生产品目如何变化，都能在短时间内切换产线。

#### 3. 轻量化与紧凑设计  
通过采用三井化学的高性能树脂材料，实现了轻量化与高刚性并存。此外，尽管是双臂机器人，却实现了紧凑化，便于在现有盛盘产线的有限空间中导入。

#### 4. 人机协作  
预计将搭载非接触式外壳传感器，当有人接近时能自动减速和停止。这样可在无安全护栏的情况下，实现人与机器人在同一空间共作。

:::info
※该功能目前仍在开发中，现有产品尚未搭载。
:::

# 软件架构介绍

我以软件架构师的身份参与了此次美膳®的开发。因此，以下将介绍软件架构的概要。

## 美膳®的设计理念

美膳®不仅仅是机械动作，更实现了 AI 识别、复杂运动控制以及将它们集成的整个系统的高度联动。

该系统的核心是**「识别食品、抓取食品、盛盘食品」这一「食品盛盘业务（领域）」**。我们将这部分领域知识置于系统中心，致力于实现不依赖于特定硬件等技术细节的设计。

在架构设计方面，我们重点考虑了以下几点：  
- **领域中心**：将「食品盛盘」业务逻辑视为最重要部分，并与技术细节分离。  
- **可维护性**：具备长期运行和功能追加的结构耐性。  
- **易测试性**：不依赖硬件，可对逻辑进行单元测试。  
- **独立性**：将对框架、传感器、显示器等外部要素的依赖降至最低。  

特别强调独立性的原因在于，**美膳®也被期待作为食品盛盘机器人系统的平台**，因此需要在未来出现新传感器技术等时，具备易于替换的灵活性。

基于上述考虑，采用了下一节将介绍的**洁净架构（Clean Architecture）**思想进行设计。

## 什么是洁净架构

洁净架构（Clean Architecture）是由 Robert C. Martin（Uncle Bob）提出的软件设计思想。它常通过同心圆示意图表示，其最大特点是只有从外层向内层存在依赖关系的“依赖规则（Dependency Rule）”。

> The overriding rule that makes this architecture work is The Dependency Rule. This rule says that source code dependencies can only point inwards. Nothing in an inner circle can know anything at all about something in an outer circle.
>
> (出处: [The Clean Architecture | The Clean Code Blog](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html))

在此架构中，最内层是“实体（Entities）”和“用例（Use Cases）”等**领域（业务逻辑）**。数据库、Web 框架、UI 以及机器人中的设备等技术细节要素全部放置于外层。

也就是说，洁净架构的核心是构建**“不是领域依赖于细节（基础设施），而是细节依赖于领域”**的结构。这样可以保护系统核心的业务逻辑免受技术潮流更迭或硬件变更等外部因素的影响。

## 具体设计介绍

### 系统物理部署

以下给出系统的物理部署图。

![系统物理部署图](/img/robotics/bizen/bizen_physical_layout.png)

带有<<app>>刻板印记的元素即为软件的执行单元。因此，以下三个为主要的软件执行单元。

<table width="100%">
  <colgroup>
    <col style="width: 20%" />
    <col style="width: 80%" />
  </colgroup>
  <thead>
    <tr>
      <th>名称</th>
      <th>说明</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>GUIApp</strong></td>
      <td>具有 GUI 的应用程序。提供面向用户的 GUI。在控制器 PC 上运行，并显示在操作面板的触摸屏上。</td>
    </tr>
    <tr>
      <td><strong>ControllerApp</strong></td>
      <td>是本系统的核心应用程序。在功能上执行系统状态控制、注册数据管理和图像处理。为此，它控制连接到控制器 PC 的设备并操作数据库。此外，具有可供 GUIApp 连接的服务器功能，同时仅在生产运行期间，具备向外提供图像处理结果的视觉服务器功能。</td>
    </tr>
    <tr>
      <td><strong>MotionController</strong></td>
      <td>是主要负责机器人运动控制的应用程序。此外，还负责与 DIO 连接设备和安全基础设施的集成。具有运动控制相关功能的服务器，由 ControllerApp 作为客户端进行连接。同时，在生产运行执行期间，它会连接到 ControllerApp 的视觉服务器，以获取图像处理结果。</td>
    </tr>
  </tbody>
</table>

:::info
**为何 GUIApp 和 ControllerApp 是分开的执行单元**

由于非功能性需求中未来可能将操作面板更改为平板等其他设备，因此将 GUI 部分分离。
:::

:::info
**控制器 PC 与机器人控制器分开的原因**

在 PoC 阶段，作为机器人控制器使用了[KEBA社](https://www.keba.com/jp/home)的控制器。
:::

### 组件构成

下面对美膳®的软件组件设计进行说明。整体设计并非以洁净架构的同心圆形式表示，但基于相同的思想进行设计。与洁净架构的同心圆中依赖于中心方向相似，这里的依赖方向向下展开，底层放置了 Entities、Interactor 等领域逻辑。

![组件构成图](/img/robotics/bizen/bizen_component_diagram.png)

<table width="100%">
  <colgroup>
    <col style="width: 20%" />
    <col style="width: 80%" />
  </colgroup>
  <thead>
    <tr>
      <th>组件</th>
      <th>说明</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>ControllerApp</strong></td>
      <td>将相关组件组合并使之可执行的应用程序组件。</td>
    </tr>
    <tr>
      <td><strong>ControllerAPI</strong></td>
      <td>负责与外部（GUIApp 及上游系统）通信的 API 层。</td>
    </tr>
    <tr>
      <td><strong>Adapter</strong></td>
      <td>外部服务（视觉、运动控制等）的实现组件。</td>
    </tr>
    <tr>
      <td><strong>Controllers</strong></td>
      <td>汇集主要业务逻辑的组件。</td>
    </tr>
    <tr>
      <td><strong>Controller</strong></td>
      <td>用于集成和控制用例（Interactor）的组件。与一般洁净架构中作为接口适配层的 Controller（Interface Adapters）不同，这里更类似于汇集多个 Interactor 的“应用服务”。</td>
    </tr>
    <tr>
      <td><strong>StateMachine</strong></td>
      <td>管理系统状态迁移的组件。对 Interactor 所实现的功能进行横向的系统状态迁移管理。</td>
    </tr>
    <tr>
      <td><strong>Port</strong></td>
      <td>定义 Adapter 接口的组件。作为外部服务的接口。</td>
    </tr>
    <tr>
      <td><strong>Interactor</strong></td>
      <td>实现针对用例的业务逻辑流程（功能）的核心组件。</td>
    </tr>
    <tr>
      <td><strong>Entities</strong></td>
      <td>定义领域模型及数据结构的组件。</td>
    </tr>
    <tr>
      <td><strong>VisionController</strong></td>
      <td>具有图像处理相关功能的组件。</td>
    </tr>
    <tr>
      <td><strong>VisionAPI</strong></td>
      <td>向外部提供图像处理功能的 API。</td>
    </tr>
    <tr>
      <td><strong>MotionControllerAPI</strong></td>
      <td>向外部提供 MotionController 功能的 API。封装了通过 REST API 向 MotionController 发送指令和获取状态的操作。</td>
    </tr>
    <tr>
      <td><strong>Common</strong></td>
      <td>可高度重用的通用组件集合。汇聚了日志、数值计算、线程控制等功能。</td>
    </tr>
  </tbody>
</table>

此架构中重要的一点是**Port（接口）与 Adapter（实现）的分离**。

例如，视觉系统或运动控制等外部要素仅通过 Port 组件定义的接口进行访问。而具体实现的 Adapter 则以实现该接口的形式提供。这样，Interactor 等业务逻辑无需了解具体的相机型号或机器人控制器的通信协议。结果是业务逻辑得以分离，硬件变更更加容易，实现了测试效率和可维护性的提升。

# 结语

这次介绍了面向中食工厂的盛盘机器人美膳®的概要以及其背后的软件架构。机器人开发由于硬件和软件的紧密结合而常变得复杂，但通过应用适当的设计模式，可以让开发更加有趣和高效。如果本文能为日日奋战在机器人开发一线的工程师们提供一些启发，将甚感荣幸。

is 正在推进将此类现代化设计思想应用于机器人开发的工作。如果您“想稍微了解一下”或“也希望改善自家机器人的状况”，欢迎随时联系我们。
