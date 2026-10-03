---
title: 在Android上运行开源版GFXBench（4）旧版执行篇
author: kazuya-iwamoto
date: 2026-10-02T00:00:00.000Z
tags:
  - GFXBench
  - android
  - gpu
image: true
translate: true

---

## 引言

这是探讨 GPU 基准测试软件 GFXBench 系列的第4篇。  
上次我们已经完成了针对旧 Android 版本的构建。  
这次我们将实际在旧 Android 版本上运行，并确认基准测试得分。

## 基准测试运行结果

运行步骤与以往相同，首先来看结果。

我们从手头的设备收藏中挑选了一些 Android 版本较旧的终端。

目标是 SdkVersion:'21' (Android5.0)，但由于手头 Android 设备的限制，实际测试到 SdkVersion:'22' (Android5.1) 为止。

以下是实测的结果示例。基准测试分数为离屏模式的 fps 值。  
:::alert  
这仅为 **“作者在当前环境和测试时点下的一个示例”**，即便使用相同的 GPU 和步骤进行测试，不同环境也可能产生不同结果，敬请谅解。  
:::

| GPU              | SoC                         | Driver version               | Android version | T-Rex score | Manhattan score |
| ---------------- | --------------------------- | ---------------------------- | --------------- | ----------- | --------------- |
| Adreno 418       | Snapdragon 808              | OpenGL ES 3.1 V@103.0        | 5.1.1           | 34          | 15              |
| Kepler GK20A     | Tegra K1                    | OpenGL ES 3.2 NVIDIA 361.00  | 6.0.1           | 66          | 32              |
| Kepler GK20A     | Tegra K1 (Denver)           | OpenGL ES 3.1 NVIDIA 343.00  | 7.1.1           | 63          | 30              |
| Maxwell GM20B    | Tegra X1                    | OpenGL ES 3.2 NVIDIA 361.00  | 8.1.0           | 109         | 59              |

上述 Tegra X1 的分数来自一款名为 Pixel C 的平板。大概因为是便携式设备，分数较低，而据我记得用于桌面式的 Android 终端 SHIELD 上，T-Rex/Manhattan 大约能达到 120/60 量级的分数。

Tegra K1 的 T-Rex/Manhattan = 60/30 分数和 Tegra X1 的 120/60 量级成绩，一直是我长期比较时的基准分数。

:::info  
从在 Tegra K1 的 SHIELD 平板上实际运行示例（Unreal Engine、Unity 等）或游戏的体验来看，这些都是让我印象深刻且易于记忆的数值。  
虽然时代所限，如果当时这些平板配备的不是 2GB 而是 4GB 内存，我想现在可能还在日常使用它们……令人惋惜。  
:::

在评估智能手机/平板时，我通常以 Tegra K1 的分数为及格线；一旦超过 Tegra X1，那可就是大件事了（※个人感想）。

![Who is the fastest](/img/blogs/2026/1002_gfxbench_4/Who_is_the_fastest.webp)

这次虽然 GPU 不同，但因为是离屏模式的结果，所以可以直接进行比较。如果考虑 GPU 的 FLOPS (Floating-point Operations Per Second)，则可以做出不同的比较。下次有机会的话我想谈谈这部分内容。

以下是与分数无关的附记。

1. 关于构建时需要 CUDA Toolkit 一事，在 Tegra K1 上顺利显示了 CUDA 信息。看来在 Android 版上并非完全没有用处。虽然例子也只有这些。

2. 在这台旧版本为 5.1.1 的 Android 终端上，连 Car Chase（OpenGL ES 3.1 + AEP）和 Aztec Ruins（OpenGL ES 3.1）都能运行。  
从 Android 版本 5.0 就开始支持 OpenGL ES 3.1 + AEP，确实可行，但当我看到实际渲染的画面和那低帧率下仍顽强运行的样子时，不禁感动落泪。真没想到它们从那么早就一直在努力工作啊……

## 结语

这次我们实际运行了上次构建的旧 Android 版本 GFXBench，并确认了基准测试分数。

读到这里的各位，或许也有让旧 Android 终端闲置在一旁的。何不久违地把它们拿出来，挑战一下它们还能坚持到什么程度呢？  
版本越旧、运行的基准测试项目越多、得分越低，越是赢家！

## 许可证及免责声明

本文中刊载的验证结果使用了在 BSD 3-Clause License 下开源的 [Kishonti-Opensource/gfxbench](https://github.com/Kishonti-Opensource/gfxbench) 软件及资源。

- **Original Copyright:** (c) 2005–2025 Kishonti Ltd.  
- **License:** [BSD 3-Clause License](https://github.com/Kishonti-Opensource/gfxbench)

**【免责声明】**  
本文中刊载的步骤、基准测试分数等测量结果均为特定验证环境下的现状（AS IS），不保证其准确性、安全性或可重复性。  
因使用本信息或执行验证而产生的任何直接或间接损害，作者及株式会社is概不负责。请在充分确认内容后，自行承担责任使用。
