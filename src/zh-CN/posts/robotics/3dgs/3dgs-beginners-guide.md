---
title: 连初学者也能挑战！使用 3D Gaussian Splatting 制作真实 3D 建模入门
author: Daiki-Yamada
date: 2026-02-13T00:00:00.000Z
tags:
  - 3DGS
  - 3D再構成
  - 3Dモデリング
  - VR
  - ComputerVision
image: true
translate: true

---

## 推荐人群
- 对3D扫描，特别是利用动态图像进行三维物体/空间重建技术感兴趣
- 想将自己喜爱的收藏或风景以数字形式保存
- 想花最少成本制作逼真的3D模型

<img src="/img/robotics/3dgs/3dgs_example.gif">

## 前言
我们公司专注于建模技术。在系统设计方面，我们主要高效利用UML对系统进行建模，擅长客观地俯瞰整体。这里我们将介绍与本公司常用的“客观俯瞰系统整体”目的不同的模型化（即三维重建技术），其目的是“将现实世界准确再现到数字空间”。

## 三维重建技术的应用场景
例如：  
- 逼真的现实世界数字空间仿真  
    - 示例：[自动驾驶](https://tur.ing/turipo/7u4Sl6wN)  
- 基于VR设备的沉浸式体验内容  
    - 示例：[VRchat with MetaQuest3](https://www.youtube.com/watch?v=VXj9umRidvA)  
- 将建筑物或遗址等作为历史资料进行保存（数字化档案）  
    - 示例：[首里城复原](https://www.our-shurijo.org/)

## 使用的软件
- [COLMAP](https://github.com/colmap/colmap/releases)  
- [LichtFeldStudio(LFS)](https://github.com/MrNeRF/LichtFeld-Studio/releases)  
- [SuperSplat](https://superspl.at/editor)

## 运行环境与规格
- 操作系统 : Windows 11 Home 25H2  
- CPU : Intel Core i7-11700K  
- RAM : 64GB (DDR4-3200，可用较少的内存运行)  
- GPU : NVIDIA GeForce RTX 4060Ti（使用 VRAM 16GB 版本，LichtFeldStudio 建议使用 8GB 以上 VRAM）  
- CUDA Toolkit : 12.1 (LichtFeldStudio 建议 12.8 以上，但已确认此版本亦可运行)

## 什么是 3D Gaussian Splatting (3DGS)
这是一种于2023年提出的三维重建技术[^1]，通过大量三维高斯分布来构建 3D 模型。相较于传统的三维表示方法，它对于透明物体和具有光泽（镜面反射）的物体具有更高的表现能力，且渲染更加轻量。下图展示了该技术中三维高斯分布的概要。简而言之，**“一种根据视点（从何处观看）而改变颜色的半透明椭球体”**。

椭球体通常会让人联想到橄榄球或杏仁巧克力的形状。如果不受尺度限制，根据长宽比，也可能看起来像针状。由于它通常为半透明，给人类似雾气的感觉。通过为椭球体设置“不透明度”，即可逼真地再现玻璃等半透明物体或光的分布。

此外，根据视点改变颜色正是 3DGS 的关键所在，使得以往难以表达的光泽效果也成为可能。此种表现技术使用了特殊函数——球面调和函数（Spherical Harmonics, SH）。

<img src="/img/robotics/3dgs/3dgs_parameters.svg" width="800">

通过在空间中大量布置具有上述特性的椭球体来表达物体与空间。它们的具体布置方式是基于对目标物体或空间拍摄的动态图像来确定的。

<img src="/img/robotics/3dgs/3dgs_comparison.svg" width="800">

## 工作流程
1. **拍摄**：对目标（物体/空间）进行照片拍摄  
2. **点云生成**：从拍摄的照片中计算出以点表示的粗略三维形状（点云）  
3. **3DGS 创建**：基于生成的点云计算 3DGS（可将点云视为“骨架”，进行“填充”）  
4. **编辑**：编辑生成的 3DGS 并完成优化  

![3dgs_workflow](/img/robotics/3dgs/3dgs_workflow.png)

---

### 1. 拍摄
以如下花束为拍摄对象。拍摄要点是从上下不同角度对对象的全方位进行无遗漏拍摄。如果想提高最终 3DGS 的分辨率，也可以包含近距离或光学变焦拍摄的图像。此次拍摄总计 204 张照片。

<img src="/img/robotics/3dgs/imgs_for_learning.png" width="800">

拍摄条件如下：  
- 相机：iPhone16 Pro  
- 焦距：24mm（固定）  
- 分辨率：24MP（2400万像素）  
- 曝光：0.0（默认设置）  
- 闪光灯：无（仅室内照明）

:::info:小知识
混合使用不同焦距和分辨率的图像也是可以的。
:::

---

### 2. 点云生成
我们使用称为 Structure from Motion（以下简称 SfM）的方法，从拍摄的图像中重建原始的三维物体/空间。该技术通过提取每张图像的特征点并在图像间进行匹配来推测三维空间中各位置的物体分布。此处理的输出是带有 RGB 信息的三维点云。市面上有多种可用于 SfM 的应用程序，这里我们使用易于执行的开源软件 [COLMAP](https://github.com/colmap/colmap/releases)。COLMAP 的详细设置在此不做深入说明，基本采用默认值即可。

<img src="/img/robotics/3dgs/feature_matching.png" width="600">

<br>
1. 下载并解压 [COLMAP](https://github.com/colmap/colmap/releases) 的最新版（撰文时最新版本为 3.13.0）  
2. 在解压后的文件夹内点击 `COLMAP.bat`，即可启动 COLMAP 的 GUI 界面  

    <img src="/img/robotics/3dgs/colmap_gui.png" width="800">
<br>
3. 在左上菜单选择 `File` -> `New project`，新建项目  
<br>
4. 设置数据库文件的路径以及用于生成点云的图像所在目录的路径，然后保存（按①~③的顺序操作）  

    <img src="/img/robotics/3dgs/setting_project.png" width="800">
<br>
5. 在左上菜单选择 `Processing` -> `Feature extraction`，完成以下项目 (①, ②) 后点击 `Extract` (③) 来提取各图像的特征点（本次使用默认设置）  

    <img src="/img/robotics/3dgs/setting_feature_extraction.png" width="600">
<br>
6. 等待处理完成（直到 “Extracting...” 对话框消失）  
<br>
7. 在左上菜单选择 `Processing` -> `Feature matching`，进行相关设置后点击 `Run` (②) 执行图像间特征点匹配（本次使用默认设置）  

    <img src="/img/robotics/3dgs/setting_feature_matching.png" width="400">
<br>
8. 等待处理完成（直到 “Matching...” 对话框消失）  
<br>
9. 在左上菜单选择 `Reconstruction` -> `Start reconstruction`，根据特征点匹配结果生成带 RGB 信息的三维点云  

    <img src="/img/robotics/3dgs/reconstruction.png" width="800">
<br>
10. 在左上菜单选择 `Extras` -> `Undistortion`，生成去除相机镜头畸变的图像  
    - 在 “Select folder” 中创建并指定输出保存文件夹  
    - 此处在输入图像所在的同级目录创建名为 “dense” 的文件夹  

    <img src="/img/robotics/3dgs/undistortion.png" width="800">
<br>
11. 等待处理完成（直到 “Undistorting...” 对话框消失）  
<br>
12. 如果在已创建并指定的文件夹内生成了输出图像等，则处理完成  
<br>

---

### 3. 3DGS 创建
终于进入主要流程。将使用 COLMAP 生成的三维点云以及经过畸变校正的图像来创建 3DGS。本步骤我们使用开源软件 [LichtFeldStudio](https://github.com/MrNeRF/LichtFeld-Studio/releases)。与 COLMAP 相似，LichtFeldStudio 可配置的参数也很多，此处不做详细说明，基本使用默认值。

<br>
1. 下载并解压 [LichtFeldStudio](https://github.com/MrNeRF/LichtFeld-Studio/releases) 的最新版（撰文时最新版为 0.41）  
<br>
2. 在解压后的文件夹内打开 `bin -> LichtFeld-Studio.exe`，即可启动 GUI 界面  
    - 可通过中部的下拉菜单将语言更改为日语等  

    <img src="/img/robotics/3dgs/lfs_home.png" width="800">
<br>
3. 在应用程序窗口的任意位置点击，界面将切换如下所示  

    <img src="/img/robotics/3dgs/lfs_start.png" width="800">
<br>
4. 将 COLMAP 的输出（本例中为 `dense` 文件夹）整体拖放到界面，会出现如下画面，确认 Output 位置后，点击 `Load` 按钮  

    <img src="/img/robotics/3dgs/lfs_loading.png" width="800">
<br>
5. 界面将显示 COLMAP 生成的三维点云以及表示图像位置和朝向的视锥体（Frustum）  

    <img src="/img/robotics/3dgs/lfs_inputs.png" width="800">
<br>
6. 点击窗口右侧的 `Training` 选项卡，确认设置参数后点击 `Start Training`  
    以下列出主要的设置参数：  
    - Iterations：迭代计算次数  
    - Max Gaussians：三维高斯分布的最大数量  
    - SH Degree：球面调和函数的次数（次数越低参数越少）  

    以上参数数值越大，虽可获得更高质量结果，但计算量也更多，因此包括其他设置参数在内，可能需要通过反复试验调整。  

    <img src="/img/robotics/3dgs/lfs_training.png" width="800">  

    以下是训练过程中的情况。  

    - 以 COLMAP 的点云为初始值，增加或移动点（即三维高斯分布的中心）（10 倍速，点云显示模式）  

        <img src="/img/robotics/3dgs/lfs_pcd.gif" width="600">  

    - 生成以各点为中心的三维高斯分布，并调整参数（10 倍速）  

        <img src="/img/robotics/3dgs/lfs_early.gif" width="600">  
<br>
7. 等待出现 `Training Complete` 对话框  

    <img src="/img/robotics/3dgs/lfs_finish.png" width="600">
<br>
8. 选择 `File` -> `Export...`，将生成的 3DGS 导出保存，如无报错即完成  

    <img src="/img/robotics/3dgs/lfs_export.png" width="400">
<br>

---

### 4. 编辑
这是对生成的 3DGS 进行美化的阶段。  
如果您认为无需额外处理就可达到满意的质量，也可跳过此步骤。  
但通常背景分辨率较低，或在目标物体周围会出现不必要的雾状物（浮游体），处理它们可以进一步提升视觉效果，同时也有助于提升渲染速度和减小文件体积。此处我们使用 [SuperSplat](https://superspl.at/editor) 来编辑 3DGS。  

<br>
1. 访问 [SuperSplat](https://superspl.at/editor)  

    <img src="/img/robotics/3dgs/supersplat_home.png" width="800">
<br>
2. 在打开的 SuperSplat 浏览器界面中，将生成的 3DGS 文件拖拽导入  

    <img src="/img/robotics/3dgs/supersplat_import.png" width="800">
<br>
3. 编辑导入的 3DGS  

    - 修改原点位置和坐标系方向  
        导入时世界坐标系的原点往往处于非预期的位置或朝向，这会给后续编辑带来不便。因此首先使用平移和旋转工具，将目标物体与世界坐标系的位置与方向对齐。  

        <img src="/img/robotics/3dgs/supersplat_tools.png" width="600">  
        <img src="/img/robotics/3dgs/supersplat_coordinate.png" width="600">  

    - 选定目标物体的背景区域并删除  
        <img src="/img/robotics/3dgs/supersplat_delete1.png" width="800">  
        <img src="/img/robotics/3dgs/supersplat_delete2.png" width="800">  

    - 单独选择并删除不需要的高斯分布  
        <img src="/img/robotics/3dgs/supersplat_delete3.png" width="800">  
<br>
4. 保存编辑后的 3DGS  

    <img src="/img/robotics/3dgs/supersplat_save.gif" width="800">
<br>

## 结语
本篇重点介绍了如何以免费且高分辨率的方式创建能够将三维物体/空间逼真重建的 3DGS。后续我们将深入探讨技术原理、3DGS 的挑战以及最新研究动态。

## 附加内容
本文中介绍的应用目前均为免费，但由于环境搭建较为繁琐且必须具备 GPU，如果说是轻量便捷，实话实说可能还有些勉强。为此，我们还准备了其他选项。  
- 如果希望付费也没关系且想更简单地制作...[Postshot](https://www.jawset.com)  
- 如果想用手机轻松快速制作...[Scaniverse](https://scaniverse.com)  

| 方案       | 便捷度 | 可表现分辨率 | 参数自由度 | GPU    | 备注                      |
|----------|:---:|:---:|:---:|:---:|-------------------------------|
| COLMAP+LFS | △   | 〇~◎ | ◎   | 必须  | 免费，可进行细致调优       |
| Postshot  | 〇   | 〇~◎ | 〇   | 必须  | 付费，可轻松创建高品质 3DGS |
| Scaniverse | ◎   | △~〇 | △   | 不需要 | 免费，仅需手机即可创建     |

不过，本篇撰写于 2026 年 1 月的 LichtFeldStudio 正在积极开发中，预计其便捷性和功能将进一步提升。

[^1]:[3D Gaussian Splatting for Real-Time Radiance Field Rendering](https://arxiv.org/pdf/2308.04079)
