---
title: 使用免费OSS工具SysON开始SysMLv2建模（5）～Action的创建
author: yasumasa-takahashi
date: 2026-02-05T00:00:00.000Z
tags:
  - SysON
  - SysMLv2
  - MBSE
  - モデリング
image: true
translate: true

---

到目前为止的文章中，我们介绍了 Part Definition、Part Usage 和 Package 的创建。

@[og](/blogs/2026/01/29/sysmlv2-tool-syson-partusage/)

从本篇文章开始，我们将进行行为（Behavior）的建模。

撰写时 SysON 的稳定版最新为 v2025.12.0，但本篇文章继续使用 v2025.8.0。  
从文档快速浏览来看，v2025.8.0 与 v2025.12.0 之间似乎没有大的功能新增。  
不过，请注意，未来（及包括）最新版本的行为可能会有所不同。

## 创建带参数的 Action Definition

让我们尝试创建 “[Intro to the SysML v2 Language-Graphical Notation.pdf]” 幻灯片第50页的图。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/slide-50.png)

打开 General View，在编辑器画面上右键单击，从上下文菜单中选择 "Behavior" > "New Action Definition"。

![New Action Definition](/img/blogs/2026/0205_sysmlv2-tool-syson-action/01.png)

将创建的 Action Definition 的名称更改为 "ProvidePower"。更改方法请参见之前的文章。

接下来添加 Parameter。

右键单击 "ProvidePower"，从上下文菜单中选择 "Structure" > "New Item In"。

![New Item In](/img/blogs/2026/0205_sysmlv2-tool-syson-action/02.png)

将新添加的 Item 修改为 "pwrCmd : PwrCmd"。  
此时，请注意左侧边栏的树中已添加了 "PwrCmd"。  
这就是 "pwrCmd" 的 Item Definition。  
将树中的 "PwrCmd" 拖拽到编辑器画面中，即可在与 "pwrCmd" 之间显示 definition。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/03.png)

再次选择 "ProvidePower"，将鼠标光标移到名称右侧，点击显示的眼睛图标。  
在弹出的 "Manage Visibility" 上下文菜单中，将 "parameters" 勾选为 ON，将 "pwrCmd : PwrCmd" 勾选为 OFF。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/04.png)

从图形中删除 pwrCmd 项（而不删除模型中的对应元素）。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/05.png)

以同样的方法，添加 "torque : Torque"。  
与 “pwrCmd : PwrCmd” 一样，左侧边栏的树中会添加 "Torque"。

Parameter 的 in、out、inout、none 可以在右侧边栏的 Details 中通过 "Direction" 单选按钮进行更改。

示例中 "torque" 为数组类型。  
请将 "torque : Torque" 修改为 "torque[*] : Torque"。  
在右侧边栏的树中，"torque" 下会添加一个包含 "LiteralInfinity" 的 "MultiplicityRange"。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/06.png)

在示例中为 "torque : Torque [*]"，但在 v2025.8.0 的 SysON 中，这种表示会导致多重度被忽略。

## 从 Action Definition 创建 Action Usage

在编辑器画面上右键单击，从上下文菜单中选择 "Behavior" > "New Action"。  
将创建的 Action Usage 名称更改为 "providePower"。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/07.png)

选择 "providePower"，将元素四边外侧显示的 "＞" 拖拽到 "ProvidePower" 上。  
在弹出的上下文菜单中选择 "New Feature Typing"。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/08.png)

以与在 Action Definition 中添加 Parameter 相同的方式，为 Action Usage "providePower" 添加 Item。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/09.png)

在 "Manage Visibility" 中将 "item1In" 设为隐藏，并将 "item1In" 修改为 "fuelCmd : FuelCmd :>> pwrCmd"。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/10.png)

在外观上有一些差异，但在含义上它们是相同的。

## Action Usage 的 Decomposition

让我们来创建 “[Intro to the SysML v2 Language-Graphical Notation.pdf]” 幻灯片第51页的图。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/slide-51.png)

创建 4 个 Action Usage（"generateTorque"、"amplifyTorque"、"distributeTorque"、"transferTorque"）。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/11.png)

Action Usage 的 Decomposition 无法在编辑器画面中绘制完成。  
（今后可能会支持）

在左侧边栏的树中选择先前创建的 4 个 Action Usage，将它们拖拽到 "providePower" 上。  
随后，在拖拽的 4 个 Action Usage 与 "providePower" 之间会显示 Decomposition。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/12.png)

如果想将其设为引用（reference），请选择对应的 Action Usage。  
在右侧边栏中选择 "Advance" 标签，将 "Is Composite" 的勾选取消（OFF）。  
对应的 Action Usage 的 stereotype 会从 "action" 变为 "ref action"，"providePower" 这边的实心菱形会变为空心。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/13.png)

## Action Definition 与 Action Usage 的 Decomposition

在 SysMLv2 规范中，也可以将 Action Usage 作为 Action Definition 的部件。

将先前幻灯片51的图中的 "providePower" 更改为 Action Definition "ProvidePower"。

将左侧边栏树中的 "ProvidePower" 拖拽到编辑器画面中。  
接着，在左侧边栏的树中，将在 "provodePower" 内的 4 个 Action Usage 移动到 "ProvidePower"。  
在 "Manage Visibility" 中将端口从图中删除后，如下图所示。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/14.png)

## 处理 SysON 启动时出错的情况

到目前为止，我们已经多次进行了 SysON 的启动和退出。  
其中，有时在 SysON 启动时会遇到错误而无法启动。  
这种情况下，请尝试使用以下命令删除 Docker 未使用的资源。

```bash
docker system prune
```

删除后，再次通过 Docker 启动 SysON。

## 下次预告

本篇文章中，我们创建了 Action Definition 和 Action Usage。  
此外，还通过 Decomposition 在模型中表示了 Action 的分割。

下次，我们将连接 Action Usage，创建 Action Flow。
