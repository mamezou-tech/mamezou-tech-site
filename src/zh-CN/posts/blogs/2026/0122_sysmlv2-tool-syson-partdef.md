---
title: 免费的开源工具SysON开始SysMLv2建模（3）～创建 Part Definition
author: yasumasa-takahashi
date: 2026-01-22T00:00:00.000Z
tags:
  - SysON
  - SysMLv2
  - MBSE
  - モデリング
image: true
translate: true

---

在上一篇文章中，我们创建了一个新的项目和 Package 元素。

@[og](/blogs/2026/01/15/sysmlv2-tool-syson-pkg/)

在本文中，我们将创建结构定义的核心之一 Part Definition。

截至撰写本文时，SysON 的稳定版最新为 v2025.12.0，但本文与上一篇相同使用 v2025.8.0。  
最新发布版的行为可能会有部分不同，敬请谅解。

建模的案例取自 SysMLv2 规范书 A Annex: Example Model。  
让我们来创建 "Figure 59. Axle and its Subclass FrontA"。

![Figure 59](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/fig.59.png)

## 创建新的 Part Definition
如同上次一样，显示 General View，在右键菜单中选择 "Structure" > "New Part Definition"。

![新建 Part Definition](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.01.png)

这时，General View 中会显示出 Part Definition。

## 更改 Part Definition 的名称
将新建的 Part Definition 的名称更改为 "Axle"。

更改名称有两种方式。后面会详细说明，这两种方式在操作上存在差异。

### 方法一
一种是在右侧边栏中更改。  
选中目标元素（PartDefinition1）后，右侧边栏会显示 Details。  
在 Declared Name 栏中直接编辑显示的名称。

![右侧边栏更改名称](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.02.png)

### 方法二
另一种是通过元素的上下文菜单或功能键更改。  
在上下文菜单中，点击最左侧的笔形图标。

![上下文菜单更改名称](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.03.png)

点击笔形图标后，就可以直接在元素中编辑显示的名称。  
在上下文菜单中，也可以选择 "Edit" > "Edit" 而不是笔形图标，同样可以直接编辑名称。

![F键更改名称](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.04.png)

选中元素后按下 F2 键，也可以直接编辑名称。

## 为 Part Definition 添加 Attribute
接下来，为 "Axle" 的 attributes 添加 "mass"。

选中 "Axle" 并打开上下文菜单，选择 "Structure" > "New Attribute"。  
"Axle" 会显示 attributes 区块，并在该区块中添加 "attribute1"。

![新建 Attribute](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/attribute.01.png)

选择新增的 "attribute1"，将名称更改为 "mass :> ISQBase::mass"。

如果通过上下文菜单或功能键更改名称，右侧边栏的 Details 中会出现 Subsets 项，并显示 mass。

![将 Attribute 设为 subset](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/attribute.02.png)

如果在左侧边栏的 Details 中通过 Declared Name 更改 "attribute1" 的名称，虽然图形显示相同，但 Details 中不会出现 Subsets 项。

这是为什么呢？

前者（通过上下文菜单等更改）会解析 subsets 符号（:>），将 mass 设为 ISQBase::mass 的 subsets。  
而后者（通过 Declared Name 更改）则仅将名称简单更改为 "mass :> ISQBase::mass"。  

这一差异在图形外观上无法看出，请注意。

## 在 Part Definition 间设置 Subclassification
以与 Axle 相同的步骤，再创建一个 Part Definition，名称改为 "FrontAxle"。

将鼠标悬停在选中 "FrontAxle" 时元素上下左右显示的三角（＞）上，鼠标指针会变为十字（＋）。  
在此状态下向 "Axle" 拖拽，就会显示选择 relationship 的上下文菜单。

![两个 Part Definition](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.05.png)

在此选择 "New Subclassification"，会显示表示 Subclassification 的空心箭头线。  
同时，"FrontAxle" 的名称会改为 "FrontAxle :> Axle"。

![subclassification](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.06.png)

还有另一种设置 Subclassification 的方法。  
即通过上下文菜单或功能键将 "FrontAxle" 更改为 "FrontAxle :> Axle"。  
更改后，"FrontAxle" 的显示会改变，并在与 Axle 之间显示表示 Subclassification 的线。

为 "FrontAxle" 添加 "steering" 的 attribute。

![创建好的图示](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.07.png)

这样，就得到了与 SysMLv2 规范书中 "Figure 59. Axle and its Subclass FrontA" 等价的图。

## 通过文本表示法添加 Part Definition
到目前为止我们都是通过绘图来创建模型，但同样可以像写 Package 一样使用文本来创建模型。

```
part def Axle {
	attribute mass:>ISQ::mass;
}
part def FrontAxle :> Axle {
	attribute steeringAngle :> ISQ::angularMeasure;
}
```

将创建好的 Axle 和 FrontAxle 拖放到 General View。

要显示 attribute 区块，首先在 Part Definition 名称右侧将鼠标悬停至显示的眼睛图标上并点击。  
在出现的 "Manage Visibility" 上下文菜单中勾选 "attribute"。

![显示 attribute 区块](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.08.png)

## 下回预告
在本文中，我们创建了 Part Definition 元素，并在元素间设置了 Subclassification。

下次我们将创建 Part Usage，并与 Part Definition 进行关联。
