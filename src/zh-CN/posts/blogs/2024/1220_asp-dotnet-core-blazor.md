---
title: Blazor入门：使用ASP.NET Core开启最新Web开发
author: yasunori-shiota
date: 2024-12-20T00:00:00.000Z
tags:
  - dotnet
  - advent2024
image: true
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
translate: true

---

这是[is开发者网站Advent Calendar 2024](/events/advent-calendar/2024/)第20天的文章。

说到最近开始好奇“最近的.NET到底怎么了？”，于是决定写一篇关于最新LTS版本.NET 8.0的文章。

这几年中开发项目中频繁使用Java，笔者已有大约10年没有接触.NET了。这10年间，.NET发生了巨大变化，原本仅限于Windows的.NET，通过.NET Core[^1]的发布，实现了跨平台支持。

[^1]: “.NET Core”这一名称在版本5.0发布时重命名为“.NET”（去掉了名称中的“Core”）。

其中，本次将聚焦于10年前不存在的ASP.NET Core Blazor（以下简称Blazor）。

:::info
就在上个月，2024年11月12日，.NET 9.0已发布，但这是STS（**S**tandard **T**erm **S**upport）版本。因此，如本文所述，我们将使用LTS版本的.NET 8.0。
有关.NET 9.0新增功能，请参考以下官方站点：

- [.NET 9 的新功能](https://learn.microsoft.com/ja-jp/dotnet/core/whats-new/dotnet-9/overview)
- [ASP.NET Core 9.0 的新功能](https://learn.microsoft.com/ja-jp/aspnet/core/release-notes/aspnetcore-9.0?view=aspnetcore-9.0)

:::

## 什么是Blazor

首先，让我们介绍一下Blazor是什么。

简单来说，这是一个用C#开发Web UI的框架。通过Blazor，可以用C#和.NET取代JavaScript或TypeScript，构建丰富的交互式Web UI。

Blazor的出现，让开发人员仅通过一种编程语言，也就是C#，就可以实现前后端的全栈开发，这是开发人员的一大重要优势。

## Blazor的两种执行模型

Blazor有两种执行模型：“Blazor WebAssembly”和“Blazor Server”。Blazor的特点在于，可以用几乎相同的代码运行这两种不同的模型。

以下图表展示了两种执行模型的概念。

![Blazor的两种执行模型](https://i.gyazo.com/4ba0bb914c6f958b6f71fdc394ca5765.png)

Blazor WebAssembly 是以客户端为核心的执行模型，Blazor应用在浏览器上使用基于WebAssembly的标准技术运行。由于需要将应用及其相关的依赖库下载到浏览器，因此初始启动时会有一些开销。但一旦启动，之后就不再需要持续连接至网络。

相反，Blazor Server 顾名思义，是以服务器为核心的执行模型。仅将文档树（DOM）返回到浏览器，基于UI上的操作向服务器请求处理。“SignalR”这个实时通信库可让客户端和服务器之间的更改即时同步。这种模型的特点是初始启动快速，但需要保持网络的持续连接。

## .NET 8.0新增的Blazor United

Blazor United是.NET 8.0起引入的一项功能，允许每个页面或组件切换四种渲染模式。Blazor United的四种渲染模式如下：

1. 静态服务端渲染（Static SSR）
2. 交互式服务端（Interactive Server）
3. 交互式WebAssembly（Interactive WebAssembly）
4. 自动交互式（Interactive Auto）

此前在使用Blazor开发Web应用时，必须在上述两种执行模型中为整个应用选择一个。这一现状随Blazor United的引入而改变，现在一个应用可以结合使用多种渲染模式。

:::info:什么是交互式？
交互式指的是应用在用户进行屏幕操作时立即进行某些处理的能力。例如，在按下按钮或在文本框中输入时发生的即时响应，便需要选择交互式渲染模式。
:::

:::alert
“Blazor United”是一个俗称，似乎是.NET 8.0开发期间使用的名称。在Microsoft官方站点和.NET 8.0的文档中，目前的Blazor并未使用这一名称。为区分Blazor WebAssembly和Blazor Server，本文仍采用Blazor United的称呼，敬请谅解。
:::

## Blazor United的渲染模式

接下来，让我们了解Blazor United的各渲染模式。

### 1．Static SSR

Static SSR 模式类似于Blazor推出前的ASP.NET MVC Razor页面。在服务端一次性进行完整渲染处理并将结果返回客户端。可以应用于页面显示后无需交互操作的场景。

![StaticSSR](https://i.gyazo.com/5f5c414f6de992a9a481c497e4514056.png)

### 2．Interactive Server

其模型与传统的Blazor Server几乎相同，即Razor页面中的代码块（C#代码部分）在服务端执行，客户端通过SignalR与服务端实时联动，渲染工作由客户端浏览器处理。

.NET 8.0中，由于Blazor United的改进，可以针对页面或组件指定SignalR连接。此前，一个浏览器会话在起始至结束的整个过程中会持续保持SignalR连接。现在在.NET 8.0中，于页面切换时发布连接及其相关的服务端资源。

![InteractiveServer](https://i.gyazo.com/5b2faf8ae97ad00cf07c4923b4dd973a.png)

### 3．Interactive WebAssembly

与传统的Blazor WebAssembly几乎相同，使用WebAssembly在浏览器中运行。对于选择整个应用仅使用这种模式的场景，可以完全不依赖服务端，甚至仅使用静态Web服务器托管应用。

![InteractiveWasm](https://i.gyazo.com/79ef926f0c64bd6b8bebf759fab9dd32.png)

### 4．Interactive Auto

Blazor WebAssembly存在初次启动较慢的问题，而Interactive Auto模式可以解决这一瓶颈。

在首次加载页面时，以Interactive Server模式运行，同时后台下载WebAssembly模块。一旦浏览器缓存了所有模块，应用即在浏览器内运行。

![InteractiveAuto](https://i.gyazo.com/0aa3a95fd757c4c152e0bb3db65b5e5e.png)

## Blazor项目开发方法

Blazor United的引入并不意味着只能选择这一模式开发应用。即便在.NET 8.0中，也依然可以选择传统模式，根据项目和系统特点选择最适合的开发模型。

以下是使用Visual Studio开发Blazor应用的方法概览：

|开发模型|概要|
|:----|:----|
|Blazor WebAssembly型|仅使用客户端渲染模式开发应用的方法|
|Blazor Server型|仅使用服务端渲染模式开发应用的方法|
|Blazor United型|结合多种渲染模式开发应用的方法|

因篇幅原因，此次仅涵盖开发准备，对项目结构和组件细节等另行展开。

:::info
将使用免费版的“Visual Studio Community 2022”。鉴于“Visual Studio for Mac”已被废止，Visual Studio目前限Windows环境。非Windows环境可通过Visual Studio Code实现类似功能，相关介绍会在后续文章中展开。
:::

### Blazor WebAssembly型应用

使用Visual Studio，选择“Blazor WebAssembly App”模板开发传统的Blazor WebAssembly应用。

- 具体设置与截图省略（参见原文）

### Blazor Server型应用

选择“Blazor Web App”模板，设置`Interactive render mode`为`Server`。

- 补充与设置略述

### Blazor United型应用

选择“Blazor Web App”模板，允许结合四种模式开发。

- 示例无法展示此处

## 最后

本文概述了ASP.NET Core Blazor。

随着Blazor United在.NET 8.0中的引入，这一框架被称为“功能完整的Web UI框架”。希望将来Blazor在Web应用开发中被更多选择。
