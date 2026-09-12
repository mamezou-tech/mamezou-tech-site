---
title: 在Android上运行开源版GFXBench（2）执行篇
author: kazuya-iwamoto
date: 2026-09-11T00:00:00.000Z
tags:
  - GFXBench
  - android
  - gpu
translate: true

---

## 前言

这是关于GFXBench这款GPU基准测试软件的系列文章的第二篇。  
在上一篇中，我们已经完成了从GitHub上获取的GFXBench的构建。  
这次我们将实际运行它，并查看基准测试分数。

## 基准测试简介

GFXBench由多种基准测试组成，启动时可以选择要执行的项目。  
大致可以分为高层次测试和低层次测试两个类别。

这次将介绍高层次测试，并从中选取几个做展示。  
:::check
以下图片引用自作者智能手机运行GFXBench时的截图  
在不同智能手机/平板设备上，布局及显示效果可能有所差异
:::

### T-Rex

![T-Rex](/img/blogs/2026/0911_gfxbench_2/T-Rex.jpg)

### Manhattan

![Manhattan](/img/blogs/2026/0911_gfxbench_2/Manhattan.jpg)

### Manhattan 3.1

![Manhattan](/img/blogs/2026/0911_gfxbench_2/Manhattan31.jpg)

### Car Chase

![CarChase](/img/blogs/2026/0911_gfxbench_2/CarChase.jpg)

### Aztec Ruins

![AztecRuins](/img/blogs/2026/0911_gfxbench_2/AztecRuins.jpg)

虽然有各种说明，但我们先关注“Required minimum API”这一项。  
可以看到如下所示，随着OpenGL ES版本的迭代，各基准测试也在不断更新。  
（看起来就是随着GFXBench的版本升级而添加了各个基准测试）

| 基准测试 | OpenGL ES version |
| ---------------- | ----------- |
| T-Rex | 2.0 |
| Manhattan | 3.0 |
| Manhattan 3.1 | 3.1 |
| Car Chase | 3.1 + AEP (Android Extension Pack) |

因此，Android 设备所支持的OpenGL ES版本决定了可以运行哪些基准测试。如果不支持，则在后面的基准测试选择界面中无法选择该测试。

※ Aztec Ruins好像路线有变，这里省略（它更像是一个多API的基准测试，而不是基于API版本）

## 基准测试安装

将上次构建好的apk文件安装到Android设备中。  
假设Android设备已启用开发者模式，并已通过adb与构建用PC连接。  
另外，在执行adb命令时，使用Windows Terminal而不是Git Bash可以避免（各种）故障。

```cmd
adb install gfxbench-5.1.5+corporate.apk
```

## 基准测试执行

在Android设备上点击GFXBench图标启动应用。  
首次启动时会出现“Pushed data not found”的提示。  
![Pushd_data_not_found](/img/blogs/2026/0911_gfxbench_2/Pushd_data_not_found.jpg)

选择“OK”将apk包中的数据复制到应用的数据目录。  
:::info
如上次所述，首次启动时仅由于这部分复制，应用的体积会增大。  
也会如上图所示，指南中也会告知手动放置数据的步骤。  
:::

启动后，会显示基准测试的初始界面。  
![Title](/img/blogs/2026/0911_gfxbench_2/Title.jpg)

点击“测试选择”按钮，即可进入测试选择界面。  
![Select](/img/blogs/2026/0911_gfxbench_2/Select.jpg)

出于作者的偏好，这里选择以下两个基准测试进行执行：

- T-Rex
- Manhattan

另外，每个测试都有屏幕版（On-screen 版）和离屏版（Off-screen 版）。  
在屏幕版中，基准测试会实际绘制在屏幕上执行，因此基准分数会依赖于Android设备的实际屏幕尺寸。  
在离屏版中，基准测试不会绘制到屏幕上执行（仅有足以了解进度的少量绘制），以固定的离屏尺寸进行，因此可以获得不受Android设备屏幕尺寸影响的基准分数。  
如果想跨设备比较GPU性能（不受屏幕尺寸影响），请选择离屏版。

首次启动时，所有基准测试都是选中状态，请仅选中想要执行的测试，然后点击“开始”按钮。  
（在高层次测试、低层次测试等分类中取消勾选可一次性取消多个测试，非常方便）

## 基准测试执行结果

下面实际执行离屏版测试。  
（想要看到画面绘制效果的，请使用屏幕版欣赏）  
选取手头Android版本（相对）较新的设备进行测试。

本次测试的Android设备规格定位在基准分数最高也不过在100左右fps的范围内。  
（对于高性能设备来说，现在T-Rex/Manhattan基准测试已经算是轻量级了……  
在那种情况下，建议使用更重的基准测试。）

以下为实际测得的结果示例。基准分数为离屏版的fps值。  
:::alert
这仅是 **“作者环境及测量时点的一个示例”**，即使在相同GPU、相同步骤下测量，不同环境也可能产生不同的结果，敬请谅解。  
:::

| GPU | SoC | Driver version | Android version | T-Rex score | Manhattan score |
| ---------------- | ------------------------ | ---- | ---- | ---- | ---- |
| ARM Mali G57 MC1 | Allwinner A537 | OpenGL ES 3.2 v1.r51p0-00eac0.26a7a06524af59d6533aad5e5bab3098 | 15 | 19 | 13 |
| ARM Mali G57 MC2 | Mediatek Helio G99 | OpenGL ES 3.2 v1.r32p1-01eac0.394145956bc7cd8e697b330aba11e3d3 | 13 | 57 | 37 |
| ARM Mali G57 MC3 | Mediatek Dimensity 800U | OpenGL ES 3.2 v1.r32p1-01eac0.461cd25a1c7796cc6d3ad05234c053ac | 12 | 85 | 54 |

凑巧的是:-) 这些GPU的不同之处在于核心数量（MC），核心数越多，结果越好（那是当然）。  
为了进一步比较，我们将基准分数除以核心数。

| GPU | T-Rex/core score | Manhattan/core score |
| ------ | ---- | ---- |
| ARM Mali G57 MC1 | 19 | 13 |
| ARM Mali G57 MC2 | 28.5 | 18.5 |
| ARM Mali G57 MC3 | 28.3 | 18 |

可以看出，本次Android设备中MC2和MC3的设备呈现相同的趋势（与假定的MC1值比例关系一致）。  
由此也可看出，本次MC1设备的值偏低。  
可能由于处于低规格市场，频率不够高等原因，导致该值偏低。

## 结语

这次介绍了GFXBench的内容，并对上次构建的GFXBench进行了实际运行并确认了基准测试分数。  
下次将介绍在比本次所用Android设备更旧的Android版本上运行的步骤。

## 许可与免责声明

本文中所引用的截图和测试结果，均使用、引用了以BSD 3-Clause License许可发布的[Kishonti-Opensource/gfxbench](https://github.com/Kishonti-Opensource/gfxbench)软件及其资源。

- **Original Copyright:** (c) 2005–2025 Kishonti Ltd.
- **License:** [BSD 3-Clause License](https://github.com/Kishonti-Opensource/gfxbench)
- **关于图像等的权利：** 文中引用的GFXBench基准测试执行画面及UI的著作权归原著作者Kishonti Ltd.所有。

**【免责声明】**  
本文所载的步骤、基准测试分数等测量结果都是在特定验证环境下的现状（AS IS），不保证其准确性、安全性、可重现性。  
因使用本信息或执行测试而导致的任何直接或间接损失，作者及株式会社is概不负责。请充分确认内容后，自行承担责任使用。
