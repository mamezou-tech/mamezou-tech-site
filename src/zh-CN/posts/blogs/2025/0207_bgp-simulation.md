---
title: BGP的基础与实践 ~使用bgpsim模拟路由控制~
author: shohei-yamashita
date: 2025-02-07T00:00:00.000Z
tags:
  - TCP/IP
  - bgp
  - シミュレーション
  - 探索
image: true
translate: true

---

## 引言
我是商业解决方案事业部的山下。这次我打算介绍网络协议之一——边界网关协议（BGP）。  
即使在日常工作中不常涉及，许多人在学习IPA或云服务供应商认证时，也会听说这种可以用于路径查找的协议。  
这次有机会研究BGP，于是整理了它的概要，并想介绍一个可以在Web上验证BGP的模拟器——bgpsim。  
另外，本篇文章的宗旨仅在于解释BGP，因此不会涉及实际设备或命令的说明。

## BGP的前提知识
在解释边界网关协议（BGP）之前，我们先整理一些前提话题。

### 互联网与自治系统
互联网是由巨量网络集合而成。这些网络并不是作为一个整体进行管理，而是以称为自治系统（AS）的单元进行管理。  
每个自治系统拥有独立的路由策略，能够独立控制路径，与其他AS互不干扰。  
每个AS都会被分配一个2字节的唯一号码，该号码由Internet Assigned Numbers Authority (IANA) 进行管理。

![76b1c816f8558104c9fc112a4c43fc14.png](https://i.gyazo.com/76b1c816f8558104c9fc112a4c43fc14.png)

### 路径查找
当需要从某个特定网络向另一个网络通信时，就必须选择并控制最优路径。  
手动控制路径在现实中是不切实际的。幸运的是，TCP/IP中已经实现了几种能够自动查找路径的协议。首先，关于路径控制的协议可根据是否跨越AS分为两类：  
- IGP (Interior Gateway Protocol)：用于自治系统内部的路径控制协议群  
- EGP (Exterior Gateway Protocol)：用于自治系统之间的路径控制协议群

![90fb8857691b5e4db1fb72dfdc20b20f.png](https://i.gyazo.com/90fb8857691b5e4db1fb72dfdc20b20f.png)

由于BGP是EGP的一种实现，因此它负责控制通向其它AS的通信路径。

## 关于BGP
综合前述内容，用一句话来描述BGP就是：  
- BGP是一种用于网络路径查找的协议，实现了跨自治系统的路径查找

### iBGP与eBGP
BGP也可以根据是否涉及AS外部情况分为两类：  
- iBGP (internal BGP)：用于同一自治系统内BGP路由器之间的实现，交换AS内部的路由信息  
- eBGP (external BGP)：用于不同自治系统之间BGP路由器之间的实现，在互联网上交换不同AS之间的路由信息  
如图所示：

![d39029c9761f37bb4110182f16e6db1b.png](https://i.gyazo.com/d39029c9761f37bb4110182f16e6db1b.png)

:::info:iBGP与IGP的区别
在此梳理一下iBGP与前面提到的IGP之间的差异。  
请注意，iBGP仅作为BGP存在，它关注的是如何通过某条路径访问其他自治系统的设备；而IGP则用于决定自治系统内部的路由方式。
:::

### 关于BGP相关术语
支持BGP通信并进行中继的设备被称为BGP Speaker。  
为了交换路由信息，BGP Speaker[^1]之间必须建立TCP连接（端口179）。  
用于交换路由信息的TCP连接称为“BGP会话”。  
[^1]: 查看过许多网站，实际上可以将其视作路由器。

另外，已建立BGP会话的关系称为“BGP对等（Peering）”。  
只要TCP连接持续存在，BGP对等关系就会维持，并能够通过发现的路径进行数据交换。  
整理一下与BGP相关的关键词如下：  
- BGP Speaker：支持BGP并能交换路由信息的设备（与路由器同义）  
- BGP会话：用于交换路由信息的逻辑连接  
- BGP对等：指BGP会话已经建立的关系

### 用于路径查找的BGP参数
接下来进一步了解BGP的具体实现。在BGP路径查找中，常用的代表性参数包括：  
- ORIGIN：取决于以何种方式建立BGP会话[^2]。  
- AS_PATH：表示路由信息经过的AS编号列表，是评估优先路径的重要指标。  
- NEXT_HOP：数据包下一跳路由器的IP地址。  
- MULTI_EXIT_DISC (MED)：当同一AS中存在多个连接点时，用于向访问源AS展示优先路径的对外参数。  
- LOCAL_PREF：表示AS内设备在访问AS外设备时路径优先级的参数。  
[^2]: 由于这涉及到设备的具体实现，本文不会过多深入，但这个属性会根据建立BGP会话的具体方式（命令）而发生变化。

### BGP路径查找算法
在BGP中，路径查找算法依照以下顺序确定：  
- 优先选择LOCAL_PREF值较大的路径  
- 选择AS_PATH长度最短的路径  
- 根据ORIGIN值按 IGP、EGP、Incomplete 的顺序选择  
- 选择MED值最小的路径  
- 若以上条件相同，则优先使用通过eBGP对等体接收到的路由信息  
- 选择NEXT_HOP最接近的路径  
- （以下略）[^3]

[^3]: 因为后续还有诸如ID较小等不具决定性条件，这里省略不表。

虽然条件远不止这些，但本文仅对LOCAL_PREF与AS_PATH相关的条件进行说明。  
首先介绍第二个判断标准，即关于AS_PATH的条件。  
AS_PATH是从eBGP接收到的值，用来表达在数据通信路径上经过了哪些AS。  
其格式如下所示，依次列出经过的AS编号：

```sh
${AS_ID_1}, ${AS_ID_2}, ${AS_ID_3}, ...${AS_ID_N}, 
```

在下图中，我们考虑从起始路由器（黄色）到目标路由器（绿色）的路径。  
虽然存在两个通往外部AS的出口，但其中一条路径会经过更多AS，显得较为冗长。

![3ad051081f670b247c6bfe3a725f809a.png](https://i.gyazo.com/3ad051081f670b247c6bfe3a725f809a.png)

原则上，BGP会选择经过较少AS的路径。  
因此，在上面的例子中，蓝色标示的路径被选中。

![80e04f337206dfd567b774bc6e41e256.png](https://i.gyazo.com/80e04f337206dfd567b774bc6e41e256.png)

另一方面，为使路径选择不受经过AS数量影响，引入了参数LOCAL_PREF。  
增大LOCAL_PREF值，可以使该路径无论AS情况如何都获得更高优先级。  
在刚才的例子中，通过改变LOCAL_PREF，就能使较为绕远的路径被选中。

![d200c9cb4880f500633207e455389c2b.png](https://i.gyazo.com/d200c9cb4880f500633207e455389c2b.png)

### AS内部路由的反映
虽然探索通向AS外部的路径是EGP的职责，但AS内部的路径探索主要由IGP承担。  
因此，当AS内部存在多条路径时，希望能够利用由IGP计算出的内部路由。  
由于这些属于不同协议，无法直接交互，但通过一种称为再分发（redistribute）的机制，可以引用来自其他协议的路由信息[^4].

[^4]: 有的作为路由器功能自带，有的则如从OSPF到BGP的再分发那样在RFC中有明确规定（RFC 1403）。

本文将不再赘述，但在本次介绍的bgpsim中，可以利用OSPF协议求得的路径信息来辅助BGP路径查找。

:::info:关于OSPF
OSPF（Open Shortest Path First）也是一种用于路径查找的协议。  
在相邻路由器之间，会为连接分配一个“成本”，系统会自动选择成本总和最小的路径。  
在后续使用模拟器时，只需要了解可以为每个连接设置成本以进行路径控制即可，无需过分深入。
:::

## bgpsim的操作方法
接下来介绍能够在Web上模拟BGP的工具——bgpsim。  
截至2025年1月，可以通过以下链接访问该网站：  
[https://bgpsim.github.io/](https://bgpsim.github.io/)

:::stop:关于bgpsim卡顿问题
截至2025年1月，某些特定操作可能会因Wasm模块错误导致界面无法响应，建议定期保存。  
在模拟器界面左侧菜单中，可以通过“Export Network”将网络配置以json格式下载。
:::

下面让我们按以下步骤进行操作。

### 路由器布局
可以通过屏幕左上角的“＋”按钮添加BGP路由器。

![e08ce66aed3085ee69a114ed778f3f75.png](https://i.gyazo.com/e08ce66aed3085ee69a114ed778f3f75.png)

可以选择Internal Router和External Router两种类型，但首先我们摆放的是AS内部的路由器，即Internal Router。

![bb6d747b4d9cfc187beb3437b4143846.png](https://i.gyazo.com/bb6d747b4d9cfc187beb3437b4143846.png)

接下来配置External Router。External Router代表位于其它AS中的路由器。

![2f7586a8544edc657ec713b76555ff42.png](https://i.gyazo.com/2f7586a8544edc657ec713b76555ff42.png)

### 定义连接
右键点击选择 Add Link，即可定义物理连接。

![71922170ba4921725df5a2d0c642ca3a.png](https://i.gyazo.com/71922170ba4921725df5a2d0c642ca3a.png)

尝试创建如下的简单连接。

![d83b752ede6d2371419d7e8175e4ba18.png](https://i.gyazo.com/d83b752ede6d2371419d7e8175e4ba18.png)

### 建立BGP会话
接下来开始建立BGP会话。首先，将视图从 Data Plane 切换到 BGP Config。  
然后，在任意一个 Internal Router 上右键点击，会弹出菜单，选择 Add iBGP Session。

![023c5d902fcc4f2995b74df71af436ff.png](https://i.gyazo.com/023c5d902fcc4f2995b74df71af436ff.png)

此时蓝色箭头会跟随鼠标移动，在该状态下点击某个路由器，即可建立会话。  
将三个 Internal Router 相互连接后，最终建立出如下会话：

![c09958c4a7a92c5a24877a1d636feab4.png](https://i.gyazo.com/c09958c4a7a92c5a24877a1d636feab4.png)

接下来构建eBGP。在 External Router 上右键点击，选择 Add eBGP Session。  
同样地，与相邻的路由器建立 eBGP 会话。

![c67006521f2c04c0455f64b510855edc.png](https://i.gyazo.com/c67006521f2c04c0455f64b510855edc.png)

### 从eBGP向路由器的广告
在之前的操作中，由于没有传递任何AS外部的信息，BGP尚未生效。  
首先，左键点击任意 External Router。  
在右侧弹出的菜单中，在 Advertised Routes 下的 New route 项中输入AS的CIDR（100.0.0.0/24）。

![ac56784bceab557de019fddce8c3b4d1.png](https://i.gyazo.com/ac56784bceab557de019fddce8c3b4d1.png)

此时点击 Advertise，即可添加更多配置。  
因为有输入 AS_PATH 的项，所以请输入任意路径（本例中为 “2”）。

![6e8054833cdde818c13b586789bedca9.png](https://i.gyazo.com/6e8054833cdde818c13b586789bedca9.png)

另一个 eBGP 的 AS Path 也需要修改。  
希望下一条路径稍长，因此设置为 “1; 3”。

![7eb94f3baa9991a79998e346e6b815c2.png](https://i.gyazo.com/7eb94f3baa9991a79998e346e6b815c2.png)

此时，从左上菜单将视图从 BGP Config 切换回 Data Plane，BGP路径便会被可视化。  
如前文所述，BGP会选择AS_PATH较短的路径。

![28a89842920de230788d591dac4bc585.png](https://i.gyazo.com/28a89842920de230788d591dac4bc585.png)

通过这种方式，我们就在bgpsim上完成了通信路径的查找。

## 使用bgpsim进行参数验证

### 通过AS_PATH变化进行控制
如前文所示，当访问外部AS时，会选择经过较少AS的路径。  
在两个eBGP会话中，对于原本路径较短的那一个，我们将逐步添加路径。  
修正前的路径如下：

![3d5a681418e3f5b013c9e0006f642182.png](https://i.gyazo.com/3d5a681418e3f5b013c9e0006f642182.png)

将该AS_PATH由 “2” 改为 “2, 5, 7” 等形式后，可以确认路径发生如下变化：

![d5a48e99adb0215184e5d1968d6f897f.png](https://i.gyazo.com/d5a48e99adb0215184e5d1968d6f897f.png)

### 通过LOCAL_PREF变化进行控制
接下来，利用LOCAL_PREF在不改变AS_PATH的情况下，使最优路径方向恢复原状。  
在下图中，提高白色粗框围住的 External Router (E2) 与带蓝色标记的路由器之间的优先级，就可以使路径恢复原状。

![2e1fdd58bf860a517d099aef800cda41.png](https://i.gyazo.com/2e1fdd58bf860a517d099aef800cda41.png)

只要按如下方式调整LOCAL_PREF参数，路径便能恢复：  
- 设置参数的路由器：带蓝色标记的路由器 (R3)  
- 需要设置的路由：E2 → R3  
- 参数值：将 LOCAL_PREF 从 100 修改为 1000

选中目标路由器后左键点击以调出菜单，然后编辑 BGP Route-Maps 如下，优先路由便会恢复到原先的状态。

![78c6bf14de1817a822e0e86580f65005.png](https://i.gyazo.com/78c6bf14de1817a822e0e86580f65005.png)

接着，将视图切换至 Control Plane，然后将鼠标悬停在某个路由器上，可以确认显示出刚刚设置的路径已成为优先路由。

![8a62778e5acf409bb3d4153a7fd48b70.png](https://i.gyazo.com/8a62778e5acf409bb3d4153a7fd48b70.png)

## 总结
本文简要介绍了作为路径查找协议的BGP的概要及用于验证BGP的模拟器。  
我本人之前仅仅知道BGP这个术语，但通过在模拟器上进行实验，对其有了模糊但逐步深化的理解。
