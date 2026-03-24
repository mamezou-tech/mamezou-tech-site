---
title: 使用ATtiny13A制作纽扣电池供电的吸顶灯遥控器【电路板与外壳制作篇】
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
![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/image10.png)

上一篇文章请见[【开发篇】](/zh-cn/blogs/2025/03/28/ir-remote-control-with-attiny13a_epi2/)

# 外壳选择
【开发篇】中使用面包板制作了遥控器。
![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/remocon_vs_breadboard_remocon.png)

但是尺寸太大，而且布线裸露，无法手持操作，也不能替代遥控器。因此，我打算在电路板上组装电路，将其装入外壳，以便平时使用。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/image00.png)
总之，我先准备了一些可能作为外壳的物品。
- 左：小型通用塑料外壳
- 中央：ミンティアブリーズ レモンライムドレス
- 右：半透明卡片盒

在与妻子享受休闲购物之余，我在一贯的秋月店购买了塑料外壳，并且作为保险也从百元店选择了卡片盒。两者都有足够的高度（厚度）足以容纳电路板，但感觉作为遥控器使用又太大了。回家途中，我顺便去超市购买食材，当妻子正排队结账时，突然发现旁边竟然有ミンティア。这正合适，我便悄悄把它塞进了购物篮里，结果就这么不知不觉地买下了它。
ミンティア握在手里非常合适，厚度也和遥控器差不多。如果能以这种尺寸实现，我就觉得足以写篇文章了。

# 电路板加工
![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/image01.png)
我立即把平板（内部物品）移开，打开了外壳。意外地，外壳有相当的高度而且很结实。由于中间设有支柱，外壳不会被压扁。但预想在组装电路时会失去布局的自由度。
首先，为了安置电路板，我做了尺寸对照的标记，并按照这个标记加工电路板的尺寸和打孔。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/image02.png)
正在进行电路板与外壳的位置对齐。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/image03.png)
我在电路板上贴上透明胶带，然后用路由器按外壳尺寸切割，并用电钻打孔，最后用锉刀对尺寸进行了微调。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/image04.png)
将电路板装入外壳后，尺寸正好匹配。利用各支柱的外形固定电路板，无需螺丝固定。左右支柱的位置略有不同，调整起来颇为费劲。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/image05.png)
从平板取出口处观察装入外壳的电路板，发现上部还有余裕。实际上，由于电路板背面也需要布线，电路板会被放置在稍高的位置。但即便如此，高度仍不到一半，因此在电路板上依然有足够的空间放置ATtiny13A微控制器和编码器。我甚至恍惚以为ミンティア就是为了这个目的而存在的。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/image06.png)
大致确定了按钮的位置。由于计划与现有遥控器按钮布局保持一致，所以就是这样安排的。此外，还考虑到了ミンティア包装设计，尽量寻找不遮挡文字的位置。按钮的颜色也挑选得与各自的功能相符合。

# 电路板设计
接下来进入电路板设计阶段。
我使用了一个使用方法简单的、适用于电路原理图的CAD工具[BSch3V](https://www.suigyodo.com/online/schsoft.htm)来进行电路板设计。
由于该工具可以以图层为单位描述图形，因此我试用了这一功能。

:::alert
请将设计数据视为“草图”。笔者从未在工作中做过电路板设计，对于CAD也是凭经验模仿使用的。设计要素（如总线线、接合点等）的使用方法也颇为独特，请注意。
:::

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/mintia_ir_remote_controller1.png)
在图层1上绘制了“外壳内部”。由于电路板尺寸与外壳的位置对齐已经确定，所以按照电路板的尺寸绘制了外壳内部与支柱的位置关系。通常，电路板上焊盘间距为2.54mm（0.1英寸），CAD也正是依据这一尺寸绘制，从而能与实际尺寸完全吻合。

:::info
将元件焊接于电路板上铜箔部分称为焊盘。
:::

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/mintia_ir_remote_controller2.png)
在图层2上绘制了“通用电路板”。仅在外周及中央支柱所在打孔周围，绘制了看似点状的焊盘。元件将安装在这些焊盘范围内。

:::info
虽然一直称之为“电路板”，但能够自由布置元件和布线的板子实际上称为“通用电路板”。而预先决定好元件布局及布线的板子则称为“印刷电路板”。
:::

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/mintia_ir_remote_controller3.png)
在图层3上绘制了“元件及布线”。按钮的位置和红外LED的位置基本确定，但其他元件该如何布局则是关键所在。

- 如何安排微控制器和编码器的位置？
- 如何使连线更简洁？
- 如何才能使布线不交叉？
- 怎样在正反两面分配布线？

经过多次更改布局，最终我定下了这个方案。虽然过程颇为辛苦，但由于采用了图层划分，修改起来非常方便。不借助CAD根本做不到。

关于图中的 Tn（n: 1至6）：以 T1 为例，意味着两个 T1 是相互连接的。由于无法完全避免布线交叉，T1 至 T6 部分均使用了塑料线进行悬空布线。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/mintia_ir_remote_controller4.png)
在图层4上绘制了“外壳外观及按钮布局”。所有图层均处于显示状态。由于将ミンティア外壳的图像也导入进来，可以叠加在电路图上确认按钮的位置。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/image08.png)
根据CAD绘制的设计图，我将元件焊接到电路板上，然后装入外壳试装了一下。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/image07.png)
这是从电路板背面看到的情况，可以发现到处都有导线悬浮在上面。原因在于焊盘的铜箔在正反两面互相连接，一旦触碰到焊盘，就会与正面的导线接触。这点我之前没有考虑到。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/image09.png)
由于将钮扣电池装入电池座后无法装入ミンティア外壳，因此我根据钮扣电池的直径在电路板上开了孔，并将其安放于此。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/image12.png)
……没想到，我竟然忘了给ATtiny13A烧录程序！哎呀😢
我忘记了还有一块单独安装的ATtiny13A（与面包板上的不同），现在这块ATtiny13A已不易拆卸。于是，为了紧急烧录程序，我从Arduino（烧录设备）引出导线，通过焊接连接到ATtiny13A上后进行了烧录。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/image11.png)
叭——！！完成了。焊接一气呵成，一次成功运行。虽然我一直以为肯定哪里有错，但自我感觉还是做得不错。
顺便提一句，最贵的元件大概就是ミンティア，约200日元左右。总体元件费用应该不足1000日元。

那么，请欣赏这件成品。`嘀`的声音会响起，请注意！！
<video src="/img/blogs/2025/0328_ir-remote-control-with-attiny13a/demo.mp4" style="max-width: 800px;" poster="/img/blogs/2025/0328_ir-remote-control-with-attiny13a/thumb.png" preload="none" controls></video>
按下按钮的顺序如下：
1. 开灯
2. 白色（长按）
3. 暖色（长按）
4. 明亮（长按）
5. 暗（长按）
6. 全亮
7. 夜灯
8. 关灯

# 总结
在制作红外遥控器过程中，ATtiny13A（AVR微控制器）数据手册是不可或缺的参考资料。
过去我几乎只写过利用Arduino API的程序，从未直接阅读过AVR微控制器的数据手册。通过阅读数据手册，我了解到了之前未曾留意的、更贴近硬件的部分，从而对Arduino和AVR微控制器有了更深刻的理解。
