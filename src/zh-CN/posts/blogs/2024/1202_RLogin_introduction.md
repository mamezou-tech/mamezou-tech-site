---
title: 脱TeraTerm、便利で简单的「RLogin」を试用一下吧。
author: takahiro-maeda
date: 2024-12-02T00:00:00.000Z
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
tags:
  - advent2024
  - ターミナルエミュレータ
  - ターミナル
  - RLogin
translate: true

---

这是[is开发者网站Advent Calendar2024](/events/advent-calendar/2024/)第2天的文章。

## 前言

在Windows上操作AWS的EC2或Azure的虚拟机等时，大家都使用什么终端软件呢？

如今市面上有很多种终端软件，相信使用过“TeraTerm”的人也是不在少数。笔者进入IT行业后也一直在使用TeraTerm，但在使用过程中感觉到了一些不便之处。

就这样，当我开始寻找更好的终端软件时，遇到了“RLogin”。
这次，我将为大家介绍“RLogin”的部分功能。

::: info
本篇文章的目标用户是以下人群：
- 想使用可以轻松设置的终端软件的人
- 有兴趣了解TeraTerm以外终端软件的人
- 觉得TeraTerm的功能太多用不上的人
:::

## TeraTerm的历史与发展

TeraTerm在服务器基础设施的运维管理领域被广泛使用，可以说是在日本国内终端软件（模拟器）中占有第一的市场份额。
TeraTerm能够取得如此高的市场占有率，原因在于它通过长期的使用积累了非常高的稳定性与可靠性。

TeraTerm的历史可以追溯到很久以前，前身TeraTerm Pro的最后一个版本2.3于1998年3月10日发布[^1] [^2]。
此后，由目前仍然广泛使用的TeraTermProject所开发的版本4.10于2005年1月30日发布，并且持续开发至今已有约20年的历史。
此外，支持Unicode的TeraTerm 5.0于2023年10月15日发布[^3]，目前仍在不断更新完善。

[^1]:参考：[关于TeraTerm>前言](https://teratermproject.github.io/manual/5/ja/about/foreword.html)  
[^2]:参考：[Tera Term主页](https://hp.vector.co.jp/authors/VA002416/)  
[^3]:参考：[关于TeraTerm>版本历史](https://teratermproject.github.io/manual/5/ja/about/history.html#teraterm)  

## 什么是RLogin
::: info
协议中的“rlogin”和终端软件“RLogin”是完全不同的，请注意不要混淆。
:::

RLogin是一款在Windows上运行的终端软件。
最初在1998年只支持rlogin和telnet，但到了2005年，它成为了一款正式支持SSH1/SSH2的终端软件。
此后，它以1-2个月的周期持续更新，与TeraTermProject几乎同时期发展，成为一款拥有悠久历史的终端软件。[^4]
截至撰稿时（2024年11月），最新版本为2.29.9。

[^4]:参考：[RLogin>程序历史](https://kmiya-culti.github.io/RLogin/history.html)  

## 推荐使用RLogin的理由

笔者推荐“RLogin”的理由如下：
- 具备必要的基本功能。
- 用户界面（UI）直观易操作，各种设置具有高自定义性且设置简单。
- 拥有精选的“理想功能”。
  - RLogin的官方网站内容易读性良好。
  - 官网整理了各种功能的使用案例。
  - 可从功能列表中查阅各项功能，附有图片说明，易于理解。
- 是一款开源软件，其源码公开，并且无论商用还是个人用途都没有限制。
  - 虽然部分许可规定在使用软件时需要注意，但RLogin的使用没有特别的限制。

## 安装方法
前往[RLogin的官方Github](https://github.com/kmiya-culti/RLogin/releases/)页面下载最新版本的zip文件，解压后运行`RLogin.exe`即可开始使用。
可以将exe文件保存为快捷方式或固定到任务栏，以便快速启动。

## 基本用法
### 推荐的初始设置
以下是笔者推荐的初始设置。

#### 剪贴板设置
- 左键选择范围时自动复制到剪贴板
- 右键粘贴
![剪贴板设置界面](/img/blogs/2024/1202_RLogin_introduction/rlogin_initial_clipbord.png)

另外，笔者推荐以下设置。

#### 颜色设置
  - 如果需要更改背景色，默认提供了14套预设。
  - 可以根据服务器的环境（生产、开发）或用途（后端、数据库服务器）进行颜色分类。
  ![终端背景颜色设置界面](/img/blogs/2024/1202_RLogin_introduction/rlogin_backscreen_color_setting.png)

#### 模板和标准设置
- 完成上述初始设置后，可以将其作为模板保存。
  - 将模板设为标准设置，在新建连接时无需重新设置标准项。
    - 例如，可以开启剪贴板设置的红框部分。
    ![模板设置](/img/blogs/2024/1202_RLogin_introduction/rlogin_template_setting.png)
    - 将其保存为模板并设为标准设置。
    ![标准设置](/img/blogs/2024/1202_RLogin_introduction/rlogin_default_setting.png)
    - 新建连接时，所有标准设置的选项（黄框部分）都会被默认开启。
    ![继承标准设置](/img/blogs/2024/1202_RLogin_introduction/rlogin_new_server_connect.png)
- 如果想排除标准设置或继承其他连接设置：
  - 在服务器选择界面，右键点击相关服务器，选择“恢复为标准设置”，可以进行以下更改：
    - “恢复为程序初始值”以初始化服务器设置。
    - “匹配以下设置”以导入其他服务器的设置。
    ![恢复为标准设置](/img/blogs/2024/1202_RLogin_introduction/rlogin_return_default_setting_dialog.png)

#### 标签功能
- 可以以分组的形式在服务器选择界面显示。
- 有以下两种方式：
  - 标签显示模式
    - 在服务器设置界面的标签（顶部）中，输入标签（分组）名称即可显示。
  ![标签（横向显示）](/img/blogs/2024/1202_RLogin_introduction/rlogin_tab_setting_x_view.png)
  ![标签设置（横向显示）](/img/blogs/2024/1202_RLogin_introduction/rlogin_tab_xview.png)
  - 层级显示模式
    - 在服务器设置界面的标签（顶部）中，在标签（分组）名称前加“￥”即可显示。
  ![标签设置（层级显示）](/img/blogs/2024/1202_RLogin_introduction/rlogin_tab_setting_tree_view.png)
  ![标签（层级显示）](/img/blogs/2024/1202_RLogin_introduction/rlogin_tab_tree_view.png)

### 保存连接信息

完成上述初始设置后，可以保存服务器连接信息及设置。
在服务器选择界面，还可以以以下方式使用连接信息：
- 创建快捷方式（★）
  - 将快捷方式放置在桌面等任何位置，即可一键连接服务器。
- 从专用的RLogin文件（扩展名`.rlg`）中导入或导出设置信息。
- 将设置信息复制到剪贴板或从剪贴板粘贴设置信息。

::: alert
如果使用的是密码认证方式，可以保存密码，但从安全性的角度出发，应尽量避免保存密码。
在使用场景、环境以及企业内使用时，请注意遵守运营规则。
:::

### 连接到服务器

选择服务器后，点击“OK”按钮即可连接到服务器。
![服务器连接界面](/img/blogs/2024/1202_RLogin_introduction/rlogin_server_select.png)

## 三个推荐功能

### 屏幕分割功能
RLogin的亮点功能之一是“屏幕分割功能”。
近年来，1920×1080的全高清（Full HD）逐渐成为主流，4K、8K以及超宽屏等高分辨率屏幕能显示更多信息。[^5]
![屏幕分割演示](/img/blogs/2024/1202_RLogin_introduction/rlogin_full_screen.png)

对于希望在一个屏幕上同时查看多个服务器信息的人来说，这项功能非常便捷且实用。
（当然，也可以通过多个窗口来使用RLogin。）
以下是分割功能的快捷键：
- 分割快捷键
  - 纵向分割并连接(Ctrl+DOWN(↓))  
  - 横向分割并连接(Ctrl+RIGHT(→))  
  - 纵向分割并新建连接(Ctrl+Shift+DOWN(↓))  
  - 横向分割并新建连接(Ctrl+Shift+RIGHT(→))  
- 窗口移动快捷键
  - 移动到下一个窗口(Ctrl+TAB)
  - 移动到上一个窗口(Ctrl+Shift+TAB)
  - 移动到上方窗口(Alt+UP(↑))
  - 移动到下方窗口(Alt+DOWN(↓))
  - 移动到右侧窗口(Alt+RIGHT(→))
  - 移动到左侧窗口(Alt+LEFT(←))

[^5]:笔者目前使用的是4K显示器和1920×1080显示屏的多屏配置。

### 粘贴确认功能
RLogin默认启用的粘贴确认功能，也是我个人觉得非常实用的功能。
在粘贴多行文本时，该功能会显示文本中的Tab键数和换行数，
可以有效防止因意外字符导致的错误。

例如，复制时可能无意间在末尾包含了换行符或Tab键。
(从Excel、电子表格或网页中复制文本时，是否曾遇到末尾夹杂换行符或Tab键的情况？)

虽然在文本编辑器中很难察觉到这些隐含的字符，但粘贴确认功能会显示Tab键和换行符数量，从而提前排除导致错误的可能性。
在执行不容出错的命令（例如生产环境），以及确保命令或脚本准确运行的预检查中，这项功能尤为有用。

::: info
以下图片中，为了便于识别篡入的末尾Tab键或换行符，我特意选取了相关范围。
:::

- 末尾含有Tab键的情况
![末尾含有Tab键的情况](/img/blogs/2024/1202_RLogin_introduction/rlogin_paste_tab_pattern.png)
- 末尾含有换行符的情况
![末尾含有换行符的情况](/img/blogs/2024/1202_RLogin_introduction/rlogin_paste_rn_pattern.png)

两种情况均可在粘贴确认功能中的编辑器内删除不需要的Tab键或换行符后再发送。

### 搜索功能
虽然不适合用于复杂的全文搜索或提取，但RLogin具有基本的终端显示搜索功能。
通过右键菜单或屏幕顶部工具栏的编辑按钮，选择“搜索字符串”，即可查找指定内容，并将结果高亮显示。

它支持英文字母大小写不敏感搜索、通配符或正则表达式搜索，这对于简单查找特定内容非常实用。
![使用搜索功能](/img/blogs/2024/1202_RLogin_introduction/rlogin_string_search.png)
搜索到的内容会以高亮颜色显示。
![搜索功能的结果](/img/blogs/2024/1202_RLogin_introduction/rlogin_string_search_result.png)

## 总结
RLogin还有更多丰富的功能，远超本篇文章能够介绍的内容。
TeraTerm也有很多出色的优点，但其独特的宏等功能使用起来需要更高的学习成本。

而较高的学习成本/门槛，可能让人难以实现一些灵光一现的想法。
相较而言，RLogin的UI提供了较高的自定义性，且官方网站内容易于理解，学习门槛较低，因此非常推荐尝试。
笔者已经用了半年时间，非常满意，推荐大家也试着用一用。

## 最后
本篇文章是[is开发者网站Advent Calendar2024](/events/advent-calendar/2024/)的首篇之一。
从12月2日到12月25日的18个工作日里，我们将陆续发布各种主题的文章。
希望大家能看到最后，非常感谢！
