---
title: SysMLv2 Modeling with the Free OSS Tool SysON (6) – Creating ActionFlows
author: yasumasa-takahashi
date: 2026-02-12T00:00:00.000Z
tags:
  - SysON
  - SysMLv2
  - MBSE
  - モデリング
image: true
translate: true

---

In the previous article, we created Action Definitions and Action Usages.

@[og](/blogs/2026/02/05/sysmlv2-tool-syson-action/)

In this article, we'll use those to create an ActionFlow.

SysMLv2 provides a standard ActionFlowView for displaying connections between Actions. It would be natural to use this ActionFlowView to create an ActionFlow. However, on the Action Flow View page in the SysON documentation, it is marked as "under development". This was the case not only in v2025.8.0 used throughout this series, but also in the current main branch at the time of writing.

Therefore, this time we'll create an ActionFlow within an element's Graphical Compartment. A Graphical Compartment is a section within a Part or Action frame where a graphical view can be displayed.

In this article, we mainly introduce the creation flow. For operational details like how to add elements, please refer to the previous articles in this series.

## Creating an Action Flow (Part 1)

Let's create the diagram from slide 30 of "[Introduction to the SysML v2 Language Textual Notation](https://github.com/Systems-Modeling/SysML-v2-Release/blob/2025-12/doc/Intro%20to%20the%20SysML%20v2%20Language-Textual%20Notation.pdf)".

![slide30](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/slide30.png)

Open the General View and create three Action Definitions. Rename the created Action Definitions to "Focus", "Shoot", and "TakePicture", respectively.

![Three action definitions](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/01.png)

Add one input Item and one output Item to "TakePicture". Rename the input Item to "scene : Scene" and the output Item to "picture : Picture".

![Two items in the action](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/02.png)

Open the Manage Visibility context menu for "TakePicture" and turn on the "action flow" checkbox. This displays the Graphical Compartment for showing the Action Flow View in "TakePicture".

![Graphical Compartment in the TakePicture](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/03.png)

Right-click the action flow compartment in "TakePicture" and create two Action Usages from the context menu. Rename the created Action Usages to "focus : Focus" and "shoot : Shoot", respectively.

![Two Action Usage in the TakePicture](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/04.png)

Add one input Item and one output Item to the Action Usage "focus". Rename the input Item to "scene" and the output Item to "image". Similarly, add one input Item and one output Item to the Action Usage "shoot". Rename the input Item and output Item to "image" and "picture", respectively.

![Two Action Usage with I/O items](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/05.png)

Select the input Item "scene" in "TakePicture". Drag the ">" displayed outside and drop it on the input Item of "focus" to display a menu for selecting the connection type. From the menu, select "New Binding Connector As Usage (bind)".

![flow context menu](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/06.png)

A line (connector) connecting the two Items will be added. Also, an "=" symbol appears near this connector. This is a Binding Connection.

Similarly, connect the output Item of the Action Usage "shoot" and the output Item of "TakePicture", which is "picture", with a connector.

![Add bind connection](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/07.png)

Now connect the output Item of "focus" and the input Item of "shoot". Again, drag & drop to bring up the menu for selecting the connection type, but this time choose "New Flow (flow)" from the menu. A line with an arrow on one end is added. This is a Flow Connection.

![Add flow connection](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/08.png)

Hiding any unnecessary elements completes the diagram.

![slide30 action flow](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/09.png)

## Creating an Action Flow (Part 2)

This time, we'll create another diagram.

It's the diagram from slide 58 of "[Intro to the SysML v2 Language-Graphical Notation.pdf](https://github.com/Systems-Modeling/SysML-v2-Release/blob/2025-12/doc/Intro%20to%20the%20SysML%20v2%20Language-Graphical%20Notation.pdf)". It uses several Control Nodes such as branching and merging.

![slide58](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/slide58.png)

Open the General View and add an Action Usage. Rename the added Action Usage to "transportPassenger".

In the Manage Visibility for "transportPassenger", check "action flow". Add Action Usages to the displayed action flow compartment. Add 11 Action Usages according to the example and rename each one.

![11 action usages](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/11.png)

Right-click the action flow compartment, and from the "Behavior" section of the context menu, add the required Control Nodes.

![Add control nodes](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/12.png)

It seems that you cannot change the size of Decision Nodes or Merge Nodes, or make Fork Nodes or Join Nodes vertically elongated.

When selecting a Control Node or Action Usage, drag & drop the ">" displayed outside to connect them in the flow. When connecting, select "New Transition" from the context menu.

![flow context menu](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/13.png)

We managed to rearrange the elements in the action flow and write the flow.

![Action flow with flow connection](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/14.png)

We would finish the diagram by adding guards, but we couldn't find this procedure.

## Creating an Action Flow with the Text Notation

Using the text notation, you can also add guard conditions.

Based on the text notation listed in the table on p. 92 of the SysMLv2 specification, I created the following. Since guards must be Boolean, I added them as attributes. I changed "terminate" to "done" because "terminate" is not displayed.

```
action act {
	attribute guard1 : ScalarValues::Boolean;
	attribute guard2 : ScalarValues::Boolean;

	first start;
	then fork fork1;
		then action1;
		then action2;
	action action1;
		then join1;
	action action2;
		then join1;
	join join1;
	then decide decision1;
		if guard2 then action3;
		if guard1 then action4;
	action action3;
		then merge1;
	action action4;
		then merge1;
	merge merge1;
	then done;
}
```

Feeding this into SysON to generate objects and then displaying and formatting it in the General View results in the following figure.

![Action flow created by text](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/15.png)

## Summary and Next Preview

The SysMLv2 specification contains other examples of Action Flows as well. Also, the document that serves as the theme of this series includes additional Action Flows beyond the ones mentioned above. However, in the version of SysON used in this series, it is not possible to represent all of these Action Flows using the graphical notation. On the other hand, the GitHub commit logs show that SysON is being actively developed on a daily basis. Let's look forward to future releases, including the Action Flow View.

Next time, we will create State Definitions and State Usages. I believe State is still under development as well, but let's see how far we can go.
