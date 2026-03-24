---
title: 使用免费 OSS 工具 SysON 开始 SysMLv2 建模（4）～ Part Usage 的创建
author: yasumasa-takahashi
date: 2026-01-29T00:00:00.000Z
tags:
  - SysON
  - SysMLv2
  - MBSE
  - モデリング
image: true
translate: true

---

在上一篇文章「使用免费 OSS 工具 SysON 开始 SysMLv2 建模（3）～ Part Definition 的创建」中，我们创建了 Part Definition。

@[og](/blogs/2026/01/22/sysmlv2-tool-syson-partdef/)

本文将创建 Part Usage。

本文使用的 SysON 与上次相同，为 v2025.8.0。  
由于 SysON 仍在不断演进，实际最新版本的行为可能会有所不同。敬请谅解。

本次建模示例借鉴自 SysMLv2 规范的附录 A：Example Model。  
让我们尝试创建“Figure 63. Variant engine4Cyl”。

![Figure 63](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/fig.63.png)

## 创建新的 Part Usage

在 General View 上右键点击，在弹出的上下文菜单中选择“Structure”>“New Part”，即可在 General View 中添加“part1”。

![新規Part Usageコンテキストメニュー](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/01.png)

还有另一种添加元素的方法。  
在左侧边栏的树状结构中，点击包等元素右侧的三点图标（︙）。  
在弹出的对话框中选择 Part，然后点击“CREATE”按钮，就可以在指定的元素中添加新的元素。

![新規Part Usageダイアグラム](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/02.png)

将新增的元素拖拽到 General View 后，即可以图形化记法显示。

## 在 Part Definition 与 Part Usage 之间创建 definition

按照上一篇文章的步骤创建 Part Definition，并将其重命名为“Engine”。  
接着创建 Part Usage，并将其重命名为“engine”。

选中“engine”，将其四边外侧显示的三角形（＞）拖拽到“Engine”上，即可弹出上下文菜单。  
在上下文菜单中选择“New Feature Typing”，即可在 Part Definition 与 Part Usage 之间创建 definition。

![definition作成](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/03.png)

definition 通过带有空心三角和两个点的连线来表示。  
再创建一组 Part Definition 的“Cylinder”与 Part Usage 的“cylinders”。

![definition作成済](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/04.png)

## 在 Part Usage 之间创建 composite-feature-membership

在“engine”与“cylinders”之间创建 composite-feature-membership。

选中“engine”，将其四边外的三角形（＞）拖拽到“cylinder”上，弹出上下文菜单。  
在上下文菜单中选择“Add as nested Part”即可在 Part Usage 之间创建 composite-feature-membership。

![composite作成](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/05.png)

如果从“cylinders”拖拽到“engine”，在上下文菜单中选择“Become nested Part”也可以同样地创建。

![composite](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/06.png)

也可以在左侧边栏的树状结构中，将“cylinders”拖动到“engine”上进行创建。

![composite drag&drop](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/07.png)

composite-feature-membership 以带有实心菱形的连线来表示。

![composite](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/08.png)

## 在 Part Usage 之间创建 noncomposite-feature-membership

将“engine”与“cylinders”之间的 relationship 设置为 noncomposite-feature-membership。

noncomposite-feature-membership 表示该 usage 是参照性的。  
因此，需要修改被引用一方的 usage 设置。

选中被引用的一方“cylinders”，在右侧边栏的 Details 中选择 Advanced 标签。  
取消此处的 Is Composite 勾选。  
这样会自动勾选 Is Reference，并且编辑器中“cylinders”的 stereotype 会变为“«ref part»”。  
同时，“engine”与“cylinders”之间的 relationship 会变为 noncomposite-feature-membership（空心菱形）。

![noncomposite](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/09.png)

若要还原，请勾选 Is Composite。

## 在 Usage 上设置 Multiplicity

将“cylinders”的 Multiplicity 设置为“4..8”。

选中“cylinders”，按 F2 键或在 Edit 中进行直接编辑。  
然后，将“cylinders”修改为“cylinders[4..8]”。  
此时，左侧边栏的树状视图中“cylinders”下会新增一个 MultiplicityRange。  
MultiplicityRange 中包含两个 LiteralInteger，其中一个的 Value 设置为“4”，另一个的 Value 设置为“8”。

![multiplicity](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/10.png)

在编辑“cylinders”时，有时会变为“cylinders[4..8] : ShapeItems::Cylinder”。  
此时，ShapeItems Library 中的“Cylinder”会被选为 definition。  
此时可按以下步骤修正：

1. 在右侧边栏的 Detail 中删除 Typed by 所设置的“Cylinder”  
2. 在左侧边栏的树中，删除“cylinders”下的“FeatureTyping”模型元素  
3. 在“cylinders[4..8]”与“Cylinder”之间重新创建 definition

## 在 Part Usage 之间创建 subsetting

在“engine”与“engine4Cyl”之间创建 subsetting。

创建 Part Usage，并将名称修改为“engine4Cyl”。  
选中“engine4Cyl”，然后将外侧出现的三角形（＞）拖至“engine : Engine”。  
在弹出的上下文菜单中选择“New Subsetting”。

![subsetting contextmenu](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/11.png)

subsetting 以带空心三角的连线来表示。

![subsetting](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/12.png)

## 在 Part Usage 之间创建 redefinition

创建“cylinders[4]”的 Part Usage，并在其与“cylinders[4..8]”之间创建 redefinition。

选中“cylinders[4]”，将外侧显示的三角形（＞）拖至“cylinders[4..8]”。  
在弹出的上下文菜单中选择“New Redifinition”。

![redifinition contextmenu](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/13.png)

redefinition 以带空心三角和一条线的连线来表示。

![redifinition](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/14.png)

## 完成 View

创建四个 Part Usage：“cylinder1[1]”、“cylinder2[1]”、“cylinder3[1]”、“cylinder4[1]”。  
在所创建的四个 Part Usage 与“cylinders[4]”之间创建 subsetting。  
此外，除了上述四个 Part Usage，还需在“cylinders[4]”与“engine4Cyl”之间创建 composite-feature-membership。

选中“engine4Cyl”与“cylinders[4]”之间的 composite-feature-membership。  
右键点击，弹出上下文菜单后选择“Show/Hide”>“Hide”。

将“Engine”与“Cylinder”这两个 Part Definition 从图表中移除（并非从模型中删除）后，如下图所示。

![view](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/15.png)

虽然与示例并非完全相同，但已创建出等价的模型。

## 下次预告

本文创建了 Part Usage 元素，并对结构进行了建模。

下次将创建行为模型元素 Action Definition 和 Action Usage。
