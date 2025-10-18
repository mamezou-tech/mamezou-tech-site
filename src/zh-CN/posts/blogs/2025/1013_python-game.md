---
title: 业务应用开发者业余使用Python尝试游戏开发 ～tkinter篇～
author: ryo-nakagaito
date: 2025-10-13T00:00:00.000Z
tags:
  - tkinter
  - ゲーム開発
  - Python
image: true
translate: true

---

![](/img/blogs/2025/1013_python-game/python-game-top.gif)

## 前言

我平时从事业务应用的开发。开发语言几乎都是Java，并且经常使用Spring Framework/Spring Boot。

除了工作之外，我几乎没有编写程序的机会或兴趣。不过最近沉迷于一些独立制作的2D动作游戏（喜欢Hollow Knight、Cuphead、Ori系列等），于是突然心血来潮想尝试自己开发一些简单的小游戏！就这样开始了这次尝试。

这次写这篇文章，想介绍一下在迷你游戏开发中使用的Python库以及开发过程的情况。欢迎阅读。

## 开发流程

首先，我想通过阅读书籍系统地掌握相关技术知识，于是参考了以下图书。

[Pythonでつくる ゲーム開発 入門講座 実践編 / 廣瀬 豪 ](https://www.amazon.co.jp/dp/4800712564?ref_=cm_sw_r_ffobk_cp_ud_dp_DSFGHR8G1Y7RSRAG3WPH_1&bestFormat=true)

通过阅读这本书可以按照书中所述制作出相同的迷你游戏，但有时会想添加些原创要素或功能，这时我就求助于ChatGPT。这就是书籍和生成式AI的混合开发。

## 关于所使用的库“tkinter”

书中介绍了Python库`tkinter`和`Pygame`。`Pygame`是功能强大的游戏用库，但这次为了制作简单的迷你游戏，仅使用`tkinter`。

向ChatGPT询问后，得到以下对这个库的描述。

> tkinter（Tkinter）是用于用Python创建GUI（图形用户界面）应用的标准库。  
> 这是一个只用Python就能“打开窗口、放置按钮或标签、显示图像”等  
> 用于创建桌面应用的便利工具。

不仅限于游戏，也可以用来创建简单的GUI工具。我觉得它是Python的标准库这一点很令人高兴。

## 迷你游戏的需求

将制作一个满足以下需求的2D迷你游戏。

- 游戏的概念是兔子从蛇那里逃跑
- 当兔子与蛇接触时游戏结束
- 蛇在屏幕内随机方向移动
- 由玩家操作兔子并让它跟随鼠标光标移动

我对游戏开发还是初学者，所以先做到这些就可以了。

## tkinter基础

一边阅读书籍一边编写代码。据说要使用tkinter制作迷你游戏应用，以下代码是必不可少的。

```Python
# 主窗口和画布的设置
root = tkinter.Tk()
root.title("兔子的迷你游戏")

# ----------------------
# 设置用于绘制图像的画布
# （设置宽高比、背景图像素材、将鼠标移动事件与画布绑定等）
# ----------------------

root.mainloop()
```

书中写到`root = tkinter.Tk()`是“创建窗口组件”，`root.mainloop()`是“显示窗口”的处理，但我想更详细地了解，所以向ChatGPT询问。

> - root = tkinter.Tk()  
>   - 在做什么</br>  
>     - `tkinter.Tk()`**生成整个应用的主窗口（顶层窗口）**。也就是“创建一个窗口”的命令。  
>   - 具体行为  
>     - 在操作系统上创建一个新的空窗口。该窗口将成为之后放置按钮、画布、标签等控件的“基础”。`root`是用来操作此窗口的变量名（惯例写作`root`或`window`）。  
> - root.mainloop()  
>   - 在做什么  
>     - 启动事件循环(main roop)。这是保持窗口打开并持续等待用户操作（点击、键盘输入等）的机制。  
>   - 具体行为  
>     - 执行这一行后，程序进入“循环状态”。  
>     - tkinter在内部监视“事件（点击、键盘输入等）”，并调用相应的处理函数。  
>     - 如果不调用`mainloop`，窗口会一闪而过，立刻关闭。

这样我就更清楚了。可以看出这是用`tkinter`创建、显示并维持窗口的最基础代码。由于GUI应用需要等待用户操作，所以它内部有一个用于管理循环状态的机制。

## 试着做做看

![](/img/blogs/2025/1013_python-game/python-game-playing_1.gif)

暂时实现了。虽然很粗糙，但能作为迷你游戏正常运行，我感到很激动。

由于无法写出所有细节，这里挑选出这个迷你游戏的核心——碰撞检测逻辑进行说明。

## 碰撞检测逻辑

书中介绍了两种“圆与圆碰撞检测”和“矩形与矩形碰撞检测”。对于等身较高的角色，矩形检测可能更合适，但这次我实现的是圆与圆的碰撞检测。

使用兔子和蛇各自的 x、y 坐标值以及半径 r 进行计算。通过求取两点之间的距离，然后判断该距离是否小于等于双方半径之和。

```Python
def hit_check(self):
    dis = math.sqrt((self.rabbit.x - self.snake.x) ** 2 + (self.rabbit.y - self.snake.y) ** 2)
    return dis <= self.rabbit.r + self.snake.r
```

在鼠标移动事件的处理函数中调用hit_check方法，当返回True时就显示游戏结束画面。

## 改进点

虽然勉强成型了，但也出现了一些想改进的地方。我最初实现的蛇以0.05秒的间隔朝随机方向移动一定距离，但从视觉上看动作非常僵硬。我在与ChatGPT讨论后，尝试修改处理逻辑，让蛇缓慢地追随兔子的位置。

下面是在管理蛇的Snake类中实现的修正后的蛇移动方法。参数target_x、target_y接收兔子的坐标，on_move_done是用于重复调用此移动处理的回调。

```Python
def move_toward(self, target_x, target_y, on_move_done):
    # 向兔子方向移动
    dx = target_x - self.x
    dy = target_y - self.y
    dist = math.sqrt(dx**2 + dy**2)
    # 仅当距离不为0时对移动方向进行归一化
    if dist != 0:
        dx /= dist
        dy /= dist
    new_x = self.x + dx * self.speed
    new_y = self.y + dy * self.speed

    # 检查屏幕范围，如在范围内则更新
    if 0 < new_x < 1200 and 0 < new_y < 676:
        self.x, self.y = new_x, new_y
        self.draw()

    # 每50毫秒重新执行
    self.job = self.canvas.after(50, on_move_done)
```

修正后的动作效果如下。

![](/img/blogs/2025/1013_python-game/python-game-playing_2.gif)

蛇现在能以自然的动作追逐兔子了。如果再做些改进，还可以将追踪和随机方向结合起来，或者让它每隔一定时间加速等等。

## 结语

这是我第一次制作游戏，但实践下来发现制作一个小型迷你游戏其实相当简单，很有趣。现在不仅可以通过书籍学习基础，还能在开发过程中向生成式AI咨询，真是非常方便。先通过书籍学习基础，然后与ChatGPT讨论并实现原创要素，这样的开发方式也很有乐趣。

还有很多想要改进的地方：
- 让兔子不再跟随鼠标移动，而是通过按钮操作
- 实现跳跃功能
- 放置障碍物
- 与蛇战斗并将其击败（引入攻击动作和生命值）

等等。

此外，这次的素材图片是从いらすとや下载并使用的，但我觉得将所有素材都由生成式AI来制作也不错。

我将继续以兴趣进行游戏开发，下一步计划使用`Pygame`制作些什么并写成文章。  
感谢您的阅读。
