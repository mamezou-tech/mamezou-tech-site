---
title: 免费OSS工具SysON开始SysML v2建模（2）〜 创建Package
author: yasumasa-takahashi
date: 2026-01-15T00:00:00.000Z
tags:
  - SysON
  - SysMLv2
  - MBSE
  - モデリング
image: true
translate: true

---

在上一篇文章「免费OSS工具SysON开始SysML v2建模（1）〜 初识SysON」中，我们已经安装了SysON，并在Web浏览器中显示了主界面。

@[og](/blogs/2026/01/08/sysmlv2-tool-syson-intro/)

在本篇文章中，让我们尝试创建一个新的项目和包。

本文使用 Release 2025.8.0 版本。请注意，在最新版本中，UI 或行为可能有所不同，敬请谅解。

主界面也称为项目浏览器界面。在项目浏览器界面的上方排列着创建项目的图标，下方则显示已有项目的列表。

![项目浏览器界面](/img/blogs/2026/sysmlv2-tool-syson-pkg/browser.png)

## 创建项目

要创建一个新的 SysMLv2 项目，请在“Create a new project”中选择从左数第2个标有“SysMLv2”的图标（SysMLv2 模板）。

选择后，将显示项目编辑器界面。

编辑器界面由4部分组成：屏幕顶部的“工具栏”、左侧的“左侧边栏”、右侧的“右侧边栏”以及左右边栏之间的“编辑区”。

![项目编辑器界面](/img/blogs/2026/sysmlv2-tool-syson-pkg/editor.png)

## 更改项目名称

项目名称显示在工具栏中央的“SysMLv2”处。

首先，我们来更改项目名称。点击工具栏中项目名称旁的省略号按钮（︙），选择“Rename”，将弹出“Rename the project”对话框。在本例中，输入“SysMLv2.trial”，然后点击“RENAME”按钮。

![更改项目名称](/img/blogs/2026/sysmlv2-tool-syson-pkg/project.1.png)

## 显示视图

在左侧边栏的树中选择“General View”，编辑区将显示绘制图形的界面。如果使用图形化符号创建模型，就在此处绘制图形。

![视图](/img/blogs/2026/sysmlv2-tool-syson-pkg/project.2.png)

## 添加视图

如果想添加新的视图，请点击左侧边栏树中包等元素旁的省略号图标（︙）。在弹出的上下文菜单中选择“New representation”，将显示用于添加视图的对话框。在该对话框中输入名称并指定视图类型，然后点击“CREATE”按钮即可添加视图。

![添加视图对话框](/img/blogs/2026/sysmlv2-tool-syson-pkg/project.3.png)

## 返回项目浏览器界面

要返回项目浏览器界面，请点击屏幕上方工具栏右侧的汉堡按钮（≡），然后选择“Projects”。

![汉堡按钮](/img/blogs/2026/sysmlv2-tool-syson-pkg/hamburger.png)

也可以点击工具栏左侧的立方体图标，返回项目浏览器界面。

## 创建新的包元素

首先尝试创建一个包元素。

在中央编辑区的空白处右键单击，将在上下文菜单中显示可在图中放置的元素类别列表。

![编辑区上下文菜单](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.01.png)

选择“Structure”后，上下文菜单将切换为可放置在图中的“Structure”元素列表，然后选择“New Package”。

![添加Package上下文菜单](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.02.png)

然后，编辑区将显示包元素，左侧边栏的树中也会添加该包元素。此时，在左侧边栏的树中可以看到，新添加的“Package1”被置于包含“General View”的“Package1”之内。在右侧边栏的“Details”中的“Declared Name”中也显示为“Package1”。

![Package与编辑器界面](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.03.png)

在此，再按照创建“Package1”的同样步骤添加“Package2”。

接下来，将左侧边栏树中的“Package2”通过拖放移动到“Package1”之中。然后右键单击“Package1”以显示上下文菜单。

在弹出的上下文菜单中依次选择“Related Elements” > “Add existing nested elements”。这样，“Package1”之中就会显示“Package2”。

![Package嵌套](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.04.png)

此时，显示在“Package1”外部的“Package2”不会有任何变化。

从SysMLv2规范来看，似乎应该在“Package1”和“Package2”之间显示 owned-membership。未来的版本中可能会修改为显示 owned-membership。

## 从视图中删除包

在“General View”中显示了两个“Package2”。其中，我们将删除位于“Package1”外部的那个“Package2”。

选中“Package2”后右键单击以显示上下文菜单。在上下文菜单顶部排列的图标中，点击从左数第4个带斜线的方形图标。

![隐藏与上下文菜单](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.05.png)

“Package2”将从视图中删除，但仍保留在左侧边栏的树中。

## 将包放置到视图中

请将左侧边栏树中的“Package2”拖放到编辑区。

视图中将再次显示“Package2”。

![将Package放置到视图](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.06.png)

## 导入包

在左侧边栏的树中点击Package右侧的省略号图标（︙）。在弹出的上下文菜单中选择“New object”，将显示“Create a new object”对话框。在对话框的“Object type”中选择“Namespace Import”。

![Namespace Import](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.07.png)

这样，在树中所选的Package之下将添加一个“Namespace Import”。选择该“Namespace Import”后，右侧边栏的“Details”中将显示其详细信息。在左侧边栏的“Details”中的“Imported Namespace”里选择要导入的Package，即可完成导入设置。

![导入的Package设置](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.08.png)

在图中的Package上右键单击，在上下文菜单中选择“Related Elements” > “Add existing nested elements”。Package内部显示的虚线Package表示导入。

![导入与可视性](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.09.png)

可以在左侧边栏的“Details”中的“Visibility”调整导入Package的可视性。

## 从模型中删除包

将“Package1”从模型中删除。

按照从视图中删除“Package2”时相同的步骤显示上下文菜单。在上下文菜单顶部的图标中，这次点击从左数第2个垃圾桶图标。

![删除与上下文菜单](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.10.png)

这时，会出现一个确认是否删除的对话框。

![删除时警告对话框](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.11.png)

点击“DELETE”按钮后，“Package1”中包含的“Package2”也会一起从左侧边栏的树中删除，并且“Package1”和“Package2”会从视图中消失。

## 使用文本记法添加包

SysON 还支持处理 SysML v2 的特点之一——文本记法。

在左侧边栏的树中，点击“Package1”右侧的省略号图标（︙），然后在弹出的菜单中选择“New objects from text”。随后，会弹出一个对话框，上方标有“Enter or paste SysMLv2 text to create new objects in the model”。

![文本输入对话框](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.12.png)

在对话框中输入以下内容，然后点击“CREATE OBJECTS”按钮。

```
package Package2 {
	package 'Package 3' {
	}
}
package 'パッケージ' {
}
```

左侧边栏的树中将添加“Package2”、“Package3”和“パッケージ”这三个包。如果不继续添加，点击“CLOSE”按钮关闭对话框。

![树状图](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.13.png)

在文本记法中，如果用单引号（'）将包名称括起来，就可以使用包含日语或半角空格的字符串。

## 下次预告

在本篇文章中，我们创建了新的项目并添加了包。下一次将创建 Part Definition 元素。
