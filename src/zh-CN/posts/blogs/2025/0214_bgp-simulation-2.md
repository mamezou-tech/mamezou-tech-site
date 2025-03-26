---
title: 让我们在bgpsim上验证BGP路由反射
author: shohei-yamashita
date: 2025-02-14T00:00:00.000Z
tags:
  - TCP/IP
  - bgp
  - シミュレーション
  - 探索
image: true
translate: true

---

## 引言
我是业务解决方案事业部的山下。  
在上一篇文章中，我写了关于用于网络路径探索的协议 BGP 以及可以在浏览器上验证 BGP 的 bgpsim 的内容。  
这次作为延续，我打算在 bgpsim 上实现并验证一种能够使 BGP 对等体建立更简单的方案——“路由反射器”。

## BGP 和 bgpsim 回顾
在此，我简单回顾一下 BGP 和 bgpsim。更为详细的概述请参考上一篇文章。  
@[og](https://developer.mamezou-tech.com/blogs/2025/02/07/bgp-simulation)

BGP 是用于设备之间进行通信路径探索的协议。它可以搜索到自治系统（Autonomous System）之外的路径。  
bgpsim 是一个可以在浏览器上验证 BGP 的模拟器，上一篇文章中已有简单介绍。

![d8f5874aba4a508a0c680db142a4f0c3.png](https://i.gyazo.com/d8f5874aba4a508a0c680db142a4f0c3.png)

## 什么是路由反射

### 全网状 iBGP 带来的开销
通常，在希望在 AS 内的 BGP 路由器之间应用 BGP 路径探索时，必须构建一个全网状结构，即在所有路由器对之间建立 iBGP 会话。

下面展示的是对 5 个 BGP 路由器中每一对建立 iBGP 会话，从而构成全网状会话的情形。

![cbded36f6ff9c93939e18937cf94bc9d.png](https://i.gyazo.com/cbded36f6ff9c93939e18937cf94bc9d.png)

假设有 10 个 BGP 路由器，则需要准备 $10 \times 9 \div 2(=45)$ 个 BGP 会话。  
照这种方式，一旦增加 BGP 路由器，就必须与所有现有的路由器建立 BGP 对等关系。  
为了解决这一问题，制定了被称为路由反射的标准。

### 路由反射
如前所述，为了避免构建全网状 iBGP 会话而定义的标准，就是所谓的路由反射（Route Reflection）标准[^1].

[^1]: 细则在 RFC 4456 中定义。

从字面上理解，路由反射就是将 Route（路径） Reflect（反映）的意思。  
更准确地说，所谓路由反射是指“由特定路由器学习的路径传递给其他路由器”的机制。

理解路由反射时，必须掌握以下两个基本术语：
- 路由反射器：将其他路由器学到的路径进行反映的路由器  
- 客户端：从路由反射器接收路径信息的路由器

那么，现在让我们用 bgpsim 来进行验证吧。

## 在 bgpsim 中的实现
### 定义 BGP Speaker 以及 eBGP
首先，按照下图布置 4 个 Internal Router 和 1 个 External Router。

![f6985d98748ef2cda169fbbb903bfcac.png](https://i.gyazo.com/f6985d98748ef2cda169fbbb903bfcac.png)

接下来，建立物理连接。作为示例，定义如下的连接方式。  
只要所有路由器以某种方式相连，拓扑形状便可随意设定。

![306def86745c12b4dfd98ec25f138da2.png](https://i.gyazo.com/306def86745c12b4dfd98ec25f138da2.png)

然后，只需在 External Router 上配置 eBGP 会话，基本的准备工作就完成了。  
按照如下方式设置 Prefix 和 AS Path[^2]。

![8c4650bc88f7411cc30eb4022166f96c.png](https://i.gyazo.com/8c4650bc88f7411cc30eb4022166f96c.png)

[^2]: 由于不像上一篇文章那样进行参数控制，所以 AS Path 直接填写值即可，不必过于考虑细节。

检查 Data Plane 视图，如果确认只有与 External Router 相邻的路由器启用了路径探索，基本配置则已完成。

![613caa3dbd5d91792d5fdcdb429597e6.png](https://i.gyazo.com/613caa3dbd5d91792d5fdcdb429597e6.png)

### 创建全网状 iBGP 会话
首先，我们的目标是不使用 BGP 路由反射，而是让所有路由器都能进行路径探索。  
与构建 eBGP 会话类似，右键点击任一路由器并选择 Add iBGP Session。

![8afcf861026ded2ed91d75cbf9790dbe.png](https://i.gyazo.com/8afcf861026ded2ed91d75cbf9790dbe.png)

为 4 个路由器之间的所有组合建立 6 个 iBGP 会话后，所有路由器就能通过 BGP 进行路径探索。  
切换视图到 BGP Config，确认全网状的 BGP 会话已经建立。

![756aeff6bb507679f40023a94075f65a.png](https://i.gyazo.com/756aeff6bb507679f40023a94075f65a.png)

此时，切换视图到 Data Plane 后，可以确认任一路由器均能探索到 AS 外的最佳路径。

![a82eef188242a5b2bb5d22049200bff7.png](https://i.gyazo.com/a82eef188242a5b2bb5d22049200bff7.png)

### 使用 BGP 路由反射
这次我们使用 BGP 路由反射来构建相同的环境。  
首先回到尚未建立全网状 iBGP 会话的状态。

![af2028f2ca44cbc6091757c9a313e408.png](https://i.gyazo.com/af2028f2ca44cbc6091757c9a313e408.png)

首先，在 Internal Router 中选定一台作为路由反射器。  
在本例中，将下图中以蓝色标记的 BGP 路由器选为路由反射器。

![606fc4b130ee27326fb2cb891aa23b31.png](https://i.gyazo.com/606fc4b130ee27326fb2cb891aa23b31.png)

在当前选定为路由反射器的路由器上右键点击，并选择 Add iBGP Client。

![4bdc0ee705d939bcca5caa0ac8a057bb.png](https://i.gyazo.com/4bdc0ee705d939bcca5caa0ac8a057bb.png)

接着，点击另一台路由器，即可建立一对路由反射器与客户端的连接，显示为从路由反射器指向客户端的箭头。

![cc6f85540884c9494dfd8ff88b4fc7fd.png](https://i.gyazo.com/cc6f85540884c9494dfd8ff88b4fc7fd.png)

同样地，将其他路由器定义为路由反射器的客户端。切换视图到 BGP Config，确保配置如下即可。

![eac2be9245e8de47596fbe8fddf30f8b.png](https://i.gyazo.com/eac2be9245e8de47596fbe8fddf30f8b.png)

切换视图到 Data Plane 后，可以确认 BGP 路径探索的效果与全网状 iBGP 配置时相同。

![8708335987ed99e4a8427e5049d524fd.png](https://i.gyazo.com/8708335987ed99e4a8427e5049d524fd.png)

虽然这只是模拟器中的实验，但可以确认，充分利用路由反射能够通过更简单的配置来实现 BGP 的功能。  
顺便提一下，将其他路由器设置为路由反射器同样会得到相同的结果。

![21675da4f690a04a9e74c507def03473.png](https://i.gyazo.com/21675da4f690a04a9e74c507def03473.png)

## 总结
在本文中，作为上一篇文章的延续，我介绍了可以更高效建立 BGP 对等体的 BGP 路由反射技术。  
就我个人而言，由于我一直从事应用程序开发，所以 BGP 这一协议对我来说门槛颇高。  
不过，通过这次介绍的模拟器，我对 BGP 有了更深入的理解。有兴趣的朋友可以随意尝试。
