---
title: 用最前沿的机器人×AI来玩！LeRobot与SO-101体验多模态AI及环境搭建指南
author: christian-takashi-nakata
date: 2026-03-31T00:00:00.000Z
tags:
  - LeRobot
  - SO-101
  - マルチモーダルAI
  - AI
image: true
translate: true

---

## 适合这些人

- 对多模态AI、物理AI、模仿学习、强化学习等机器人领域的AI感兴趣，但不知道从何入手的人
- 感觉实物机器人价格昂贵，无法尝试的人
- 想动手学习，但想以低成本开始的人

## 介绍

在本文中，以开源项目 LeRobot 和开源机械臂 SO-101 为主题，介绍多模态AI相关技术并说明环境搭建的步骤。  
最终目标是实现当移动一只机械臂时，另一只机械臂能够同步执行相同动作（参见下方 GIF）。

<p align="center">
  <img width="460" height="300" src="../../../img/robotics/lerobot/lerobot_demo.gif">
</p>

## 术语说明

### 什么是多模态AI

在传统的机器人开发中，机器人本体、摄像头、通信协议等多种技术（模态）各自独立运行，且输出的数据格式也不一致，因此将它们整合为一个系统并投入使用并不容易。

近年来，随着以 Transformer 系模型为代表的进展，能够将图像、音频、文本、传感器数据等多种模态整合处理的“多模态AI”研究与实践取得了进展，不同数据格式的处理与整合比以往更为容易。

因此，在机器人领域预期能解决上述问题，基于多模态AI的开发正在逐渐增多。

:::info  
有一个相似的术语“物理AI”。该术语聚焦于机器人或物理世界中的学习与决策，与多模态AI有较多重叠之处，但在本文中不做区分，一律称为“多模态AI”。  
:::

### 什么是 LeRobot

官方仓库：[LeRobot](https://github.com/huggingface/lerobot)

<p align="center">
    <img height="120" src="https://raw.githubusercontent.com/huggingface/lerobot/refs/heads/main/media/readme/lerobot-logo-thumbnail.png">
</p>

LeRobot 是 Hugging Face 发布的开源机器人库，为真实机器人提供模型、数据集和工具。使用 LeRobot 可以轻松实现多种机器人控制、数据收集和学习工作流的构建。  
在本文中，我们重点介绍 LeRobot 的安装与配置，并最终演示如何驱动 SO-101。[1]

### 什么是 SO-101

官方仓库：[SO-101](https://github.com/TheRobotStudio/SO-ARM100)

| ![so101_follower](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/lerobot/SO101_Follower.webp) | ![so101_leader](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/lerobot/SO101_Leader.webp) |
|---|---|
| SO101 Follower 的图片。<br>与实物机器人构造相近。 | SO101 Leader 的图片。<br>配有人体操作更便的握柄部分。 |

SO-101 是 RobotStudio 与 Hugging Face 共同开发的低成本开源机器人机械臂，旨在降低机器人领域的入门门槛。

SO-101 由两台机器人机械臂“Leader（先导臂）”和“Follower（从动臂）”组成。一般使用时，用户手动操作 Leader 进行数据采集，Follower 则基于该记录或已训练模型重现相同动作。

本文将介绍 [SO-101 的获取方式](#prepare-so101)及在 LeRobot 中驱动其所需的步骤。

## 运行环境

由于本文重点在环境搭建步骤，环境需求有所简化。但考虑到 LeRobot 的大多数教程以 CLI 操作为前提，建议操作系统使用 Linux 或 macOS。  
为了保持一致性，本文以 Linux 为前提。

:::alert:关于 GPU  
将来如果要在 LeRobot 和 SO-101 上进行学习，将需要显存容量在 8GB 以上的 GPU。  
:::

:::info:建议准备  
以下物品虽非执行本文步骤的必需，但如果具备会更便利：

- 两位以上的插线板：用于向两台机械臂供电。
- 支持两位以上供电的 USB3.0 集线器：用于将两台机械臂连接至电脑。
- 标签贴：方便管理多个电机和零部件。

关于标签贴，推荐使用 Daiso 的 [可干净撕下标签贴 525 枚装](https://jp.daisonet.com/products/4550480482910)。该标签贴几乎适用于 SO-101 的所有零件尺寸，可实现如下图所示的标记。

| ![motor_labeling](/img/robotics/lerobot/motor_labeling.jpg) | ![follower_labeling](/img/robotics/lerobot/follower_labeling.jpg) |
|---|---|
| 使用标签贴对电机进行标记时的图片。 | 使用标签贴对电机总线进行标记时的图片。 |

:::

## 环境搭建方法

在此我们将介绍使用 LeRobot 与 SO-101 的环境搭建步骤。  
步骤大致如下：

1. [LeRobot 的环境搭建方法](#lerobot-の環境構築方法)
2. [SO-101 的环境搭建](#so-101-の環境構築)

建议事先查看 [SO-101 的打印（或购买）](#prepare-so101)，并准备好 SO-101 的零件。

## LeRobot 的环境搭建方法

LeRobot 的环境搭建方法参考了 Hugging Face 的 [Installation](https://huggingface.co/docs/lerobot/installation) 页面，本文只聚焦于关键步骤。

### 0.【可选】未安装 conda 相关软件包时 {#conda-install}

由于 LeRobot 需要处理多个 Python 软件包，建议使用 Conda 构建虚拟环境。如果尚未安装 Conda，可通过以下命令进行安装：

```bash
wget "https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-$(uname)-$(uname -m).sh"
bash Miniforge3-$(uname)-$(uname -m).sh
```

### 1. 构建虚拟环境 {#virtual-env-setup}

1. 使用 Conda 创建虚拟环境

    ```bash
    # 下述的 lerobot 是要创建的环境名称，可根据喜好修改
    # 如果修改，请在其他步骤中同样做出相应更改
    conda create -y -n lerobot python=3.12
    ```

2. 激活 Conda 虚拟环境

    ```bash
    conda activate lerobot
    ```

3. 在虚拟环境中安装 ffmpeg

    ```bash
    conda install ffmpeg -c conda-forge
    ```

    当前版本的 LeRobot 不支持 ffmpeg 8.x，因此请检查上条命令所安装的 ffmpeg 版本：

    ```bash
    ffmpeg -version
    ```

    如果此时 ffmpeg 版本为 8.x，请通过以下命令降级 ffmpeg：

    ```bash
    conda install ffmpeg=7.1.1 -c conda-forge
    ```

### 2. 安装 LeRobot

LeRobot 可以从仓库源码或 PyPI 安装。如果希望将来进行个人开发，建议从源码安装以便编辑代码。

如果从源码安装，请执行以下命令：

```bash
git clone https://github.com/huggingface/lerobot.git
cd lerobot
# 以可编辑模式安装到 Conda 环境
pip install -e .
```

如果从 PyPI 安装，请执行以下命令：

```bash
pip install lerobot
```

## SO-101 的环境搭建

### 1. SO-101 的打印（或购买） {#prepare-so101}

SO-101 的硬件构成在 [官方仓库](https://github.com/TheRobotStudio/SO-ARM100) 中公开。  
可以使用仓库中的 3D 数据对零件进行 3D 打印，或从仓库中指引的[授权销售网站](https://github.com/TheRobotStudio/SO-ARM100)购买零件套件，以组装 Follower 和 Leader 两只机械臂。

注意：在官方仓库中获取的主要是外壳及机构零件，伺服电机等驱动部件需另行准备。购买电机时，请参考官方仓库中的 [Parts For Two Arms (Follower and Leader Setup):](github.com/TheRobotStudio/SO-ARM100?tab=readme-ov-file#parts-for-two-arms-follower-and-leader-setup) 或购买授权销售方的套件。

作为参考，作者本人从官方仓库推荐的秋月电子通商网站购买了以下两款套件。为保持说明一致，以下步骤将以这些零件为基准。

- [[131169]SO-101 开源机械臂套件 Pro 版](https://akizukidenshi.com/catalog/g/g131228)
- [[131222]SO-101 开源机械臂套件 3D 打印零件](https://akizukidenshi.com/catalog/g/g131222)

### 2. SO-101 的设置

SO-101 的设置参考了 Hugging Face 的 [SO-101](https://huggingface.co/docs/lerobot/so101) 页面，本文选取关键步骤进行说明。另外，正如前文所述，SO-101 由 Leader 与 Follower 两台机械臂组成，部分操作会有所不同，请注意。

首先，通过下述命令安装驱动 SO-101 所需的 SDK：

```bash
pip install -e ".[feetech]"
```

#### 2.1. 电机分类 {#label-motors}

参考链接：[Configure the motors](https://huggingface.co/docs/lerobot/so101#configure-the-motors)

首先将[前一节](#prepare-so101)准备的电机分为 Leader 和 Follower 两类。Leader 端由多种齿比的电机构成，而 Follower 端则由相同规格（1/345）的电机构成。

Leader 各关节分配的电机 ID（[参见后文](#connect-motor-motorbus)）及齿比如下。

|   Leader-Arm Axis   | Motor | Gear Ratio |
|:-------------------:|-------|------------|
| Base / Shoulder Pan | 1     | 1 / 191    |
| Shoulder Lift       | 2     | 1 / 345    |
| Elbow Flex          | 3     | 1 / 191    |
| Wrist Flex          | 4     | 1 / 147    |
| Wrist Roll          | 5     | 1 / 147    |
| Gripper             | 6     | 1 / 147    |

电机类型可通过机身标签（贴纸）识别。Leader 用电机通常标明齿比，而 Follower 用因规格相同，可能不注明齿比。

##### 2.2. MotorBus（电机总线）的设置 {#setup-motorbus}

完成电机分类后，开始配置电机总线（参见下图）。

<p align="center">
    <img width=400" src="https://akizukidenshi.com/img/goods/L/131540.jpg"/>
</p>

电机总线是用于统一管理和通信多个电机的设备。  
为前节分类的 Leader 用所有电机准备一台电机总线，为 Follower 用所有电机准备另一台电机总线。此时若将 Leader 与 Follower 电机混用会导致后续难以修正，建议在所有电机上贴标签（如标签贴），明确对应到哪台电机总线。

以下步骤中为方便起见，使用以下简称：

- Leader 用电机总线：Leader_MB
- Follower 用电机总线：Follower_MB

1. 连接 Leader_MB 和 Follower_MB 的电源，并将其接入电脑。  
2. 确认各电机总线的 USB 端口。

    在同时连接两台电机总线的情况下执行以下命令。  
    脚本运行过程中会有指示，此时拔下 Leader_MB 的 USB 线并按下 Enter 键。

    ```bash
    lerobot-find-port
    ```

    示例）脚本输出示例：

    ```bash
    Finding all available ports for the MotorBus.  
    ['/dev/ttyACM0', '/dev/ttyACM1']  
    Remove the usb cable from your MotorsBus and press Enter when done.

    #（拔下对应的 Leader_MB 数据线并按 Enter）

    The port of this MotorsBus is /dev/ttyACM0
    Reconnect the USB cable.

    #（重新插入对应的 Leader_MB 数据线）
    ```

    当出现 `Reconnect the USB cable.` 时，请重新插入 Leader_MB 的数据线。在上述示例中，`/dev/ttyACM0` 为 Leader_MB 的端口，请记录该端口。

    同理，拔下 Follower_MB 的 USB 数据线，确认并记录 Follower_MB 的端口。在上述示例中，`/dev/ttyACM1` 为 Follower_MB 的端口号，但实际环境中可能会不同，请留意。

:::alert:关于 Linux 设备权限  
在 Linux 系统中，可能因设备文件访问权限导致无法识别，必要时请执行以下命令授予权限。以下示例对 `ttyACM0` 设备修改权限，实际设备名可能因环境而异，请注意。

```bash
sudo chmod 666 /dev/ttyACM0
```  
:::

#### 2.3. 将电机与电机总线关联 {#connect-motor-motorbus}

出厂时所有电机 ID 均设置为 1，为了与电机总线正确通信并关联，需要为每个电机分配唯一的 ID。  
首先，为设置 Leader_MB，请执行以下命令：

```bash
lerobot-setup-motors \
    --robot.type=so101_follower \
    --robot.port=/dev/ttyACM0 # Leader_MB 的端口
```

请在 `--robot.port=` 后填写在 [电机总线设置](#setup-motorbus) 中确认的 Leader_MB 端口。如端口不是 `/dev/ttyACM0`，请相应修改后再执行。

当 PC 与 Leader_MB 通信建立后，会出现以下消息：

```bash
Connect the controller board to the '<关节名>' motor only and press enter.
```

此处显示的 `<关节名>` 表示即将分配 ID 的电机所负责的关节名称（例如：`gripper`）。操作步骤如下。

1. 对照[电机分类](#label-motors)中准备的电机与该节表格，准备对应类型的电机（例如：gripper → 齿比 1/147 的电机）。  
2. 使用电机附带的数据线将该电机连接到电机总线。  
3. 在终端按下 Enter 键。

当 ID 分配成功后，会显示如下：

```bash
'<关节名>' motor id set to <ID>
```

请继续为其他 Leader 用电机以相同方式设置 ID。可通过下述官方视频查看整套操作流程。

<video align="center"  controls>
  <source src="https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/lerobot/setup_motors_so101_2.mp4" type="video/mp4">
</video>

完成 Leader_MB 设置后，请以同样方式设置 Follower_MB。如前所述，Follower 端电机通常为相同齿比，无需对照关节名称。但请注意不要混淆已设置的 ID。

:::info:建议  
官方仓库的视频中是在电机已经安装到臂上后设置 ID，但作者建议在安装前先设置 ID。Leader 端由多种齿比不同的电机构成，安装后难以区分，如装错位置则需拆解并重新设置 ID。  
建议预先分配 ID，并使用标签（如标签贴）进行区分后再组装到机械臂，以大幅减少问题。  
:::

#### 2.4. 机械臂组装

由于 SO-101 的组装步骤较多，请先参考官方教程视频或销售方的组装视频。

- [LeRobot 官方网站教程](https://huggingface.co/docs/lerobot/so101?example=Linux#joint-1)
- [WoWRobo 发布的组装教程视频](https://www.youtube.com/watch?v=70GuJf2jbYk)

:::stop::关于校准  
组装完成后，请务必按照各官方页面或教程中指导的校准步骤进行电机位置校准。校准不足会导致关节角度偏移，机器人以意外姿态运动，可能撞击周围物体或人员，存在危险。  
:::

:::info:建议  
关于组装，你只需观看上述任一视频即可，接下来针对伺服霍恩（参见下图）提供几点建议。

<p align="center">
    <img width="200" src="../../../img/robotics/lerobot/servo_bone.png"/>
</p>

1. 将机械臂的外壳及机构零件固定到伺服霍恩时使用大螺钉；将电机本体固定到机械臂时使用小螺钉。  
2. 安装伺服霍恩时，请将“凸部（突出部分）”朝向内侧（不朝外），平面朝外。若装反，螺钉无法完全拧紧，会影响机械臂的活动范围及平滑度。[2]  
:::

### 3. 运行确认

参考链接：[Imitation Learning on Real-World Robots](https://huggingface.co/docs/lerobot/il_robots#imitation-learning-on-real-world-robots)

最后，使用 LeRobot 提供的模仿学习示例代码，通过 Leader 到 Follower 的远程操作进行运行确认。请确保电机总线已连接到电脑，然后执行以下命令：

```bash
lerobot-teleoperate \
    --robot.type=so101_follower \
    --robot.port=/dev/ttyACM0 \ # 请填写在电机总线设置中确认的 Follower_MB 端口
    --robot.id=my_awesome_follower_arm \ # 请输入你喜欢的变量名
    --teleop.type=so101_leader \
    --teleop.port=/dev/ttyttyACM0 \ # 请填写在电机总线设置中确认的 Leader_MB 端口
    --teleop.id=my_awesome_leader_arm # 请输入你喜欢的变量名
```

如果之前的步骤均正确执行，就会如[介绍](#はじめに)章节的 GIF 所示，当移动 Leader 时，Follower 会同步跟随动作。

### 最后

本文作为使用 LeRobot 与 SO-101 的物理 AI 入门，介绍了环境搭建与基本运行确认步骤。今后如有机会，将深入探讨利用 LeRobot 进行学习（模仿学习、强化学习）以及机器人领域 AI 方法的细节。

[^1]: 可能会在有机会时撰写有关学习方法的文章。  
[^2]: 作者因此将已组装的机械臂拆开并重新组装。
