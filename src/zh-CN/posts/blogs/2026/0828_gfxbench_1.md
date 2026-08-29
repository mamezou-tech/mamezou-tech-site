---
title: 在 Android 上运行开源版 GFXBench（1）构建篇
author: kazuya-iwamoto
date: 2026-08-28T00:00:00.000Z
tags:
  - GFXBench
  - android
  - gpu
translate: true

---

## 前言

您是否知道 GFXBench 这款 GPU 基准测试软件？  
它是 Kishonti 公司开发的可在 Windows、Linux、Android、iPhone 等多平台运行的 GPU 基准测试软件。

[GFXBench - unified graphics benchmark based on DXBenchmark (DirectX) and GLBenchmark (OpenGL ES)](https://gfxbench.com/)

过去每当买到新的 Android 设备时，都会从 Android 应用商店下载并运行这个基准测试。

以下是促使我写这篇文章的来由。

1. 时隔许久购买了新的 Android 平板  
2. 在应用商店搜索 GFXBench 却找不到？  
3. 在过去 Android 设备上已安装的 GFXBench 也无法连接服务器，无法启动？  
4. 以为只是维护时机不对，就等了大约一个月，情况依旧没有变化  
5. 觉得情况实在不对，调查后发现该服务已停止，且已在 GitHub 上开源！

开源似乎发生在 2025 年年底。  
[KISHONTI Milestones - our History](https://kishonti.net/milestones)

[GFXBench and CompuBench are shutting down after 21 years, source code and toplist database move to GitHub](https://videocardz.com/newz/gfxbench-and-compubench-are-shutting-down-after-21-years-source-code-and-toplist-database-move-to-github)

对我而言，这不仅仅是一款普通的基准测试软件，还有更深的感情。

因为我曾经做过一项业务，将商业版的源代码（而非免费的下载版）移植到自家产品的板卡（非 Android 平台）上，然后运行基准测试。  
GFXBench 中包含多种基准测试项目，当时是 T-Rex/Manhattan 时代左右。  
（有关基准测试种类的内容将在下次的“执行篇”中介绍）  
当时拿到的早期访问源代码可移植性不佳，我花了不少工夫进行移植和调试......

如今它已经在 GitHub 上开源了。  
[GitHub - Kishonti-Opensource-gfxbench](https://github.com/Kishonti-Opensource/gfxbench)

虽然让我感慨时代的变迁、回忆当年的点滴，但我还是怀着对过去工作及开源这件事的感激之情，开始进行构建并尝试运行。

本次的目标如下。

- 掌握从源代码构建 GFXBench 并在 Android 设备上运行的技巧  
  - 构建环境：Windows 11  
  - 构建目标：Android 版，同时考虑到我收集的 Android 设备中包含较旧版本，希望能在较旧的 Android 系统上也能运行  
- 通过此方法，不仅可以替代那些已无法运行的可执行二进制文件，还能在想对源代码做实验性修改时，轻松在本地进行测试  

适用对象如下。

- 有 Android 应用开发经验  
  - 能使用 Android Studio、sdkmanager、adb 命令  
  - 能将 Android 设备切换到开发者模式  
- 不会对命令行操作、补丁、环境变量感到困惑  
- 熟悉图形 API（本次为 OpenGL ES）者将更易享受本过程  

## 构建环境准备

GitHub GFXBench 官方的 Android 构建步骤如下（下文称为“官方步骤”）。  
[doc/gfxbench_gl_android_build.txt](https://github.com/Kishonti-Opensource/gfxbench/blob/main/doc/gfxbench_gl_android_build.txt)

接下来将按照此内容搭建构建环境。

以下引用官方步骤，逐项进行说明。

```bash
./sdkmanager  "ndk;28.0.12674087" "build-tools;35.0.0" "platforms;android-35" "platform-tools" "cmdline-tools;latest"
```

  Path                 | Version           | Description                             | Location  
  -------              | -------           | -------                                 | -------  
  build-tools;35.0.0   | 35.0.0            | Android SDK Build-Tools 35              | build-tools/35.0.0  
  cmdline-tools;latest | 16.0              | Android SDK Command-line Tools (latest) | cmdline-tools/latest  
  ndk;28.0.12674087    | 28.0.12674087 rc2 | NDK (Side by side) 28.0.12674087        | ndk/28.0.12674087  
  platform-tools       | 35.0.2            | Android SDK Platform-Tools              | platform-tools  
  platforms;android-35 | 1                 | Android SDK Platform 35                 | platforms/android-35  

```txt
- Android NDK 28.0.12674087 (tested version), GCC is no longer supported
   http://developer.android.com/sdk/ndk/index.html

- Android SDK, API Level 35 (recommended versions, store version built with API 35)
   http://developer.android.com/sdk/index.html
```

根据此内容，通过 sdkmanager 下载上述组件。  
本次我在 Android Studio 中启动 sdkmanager 的 GUI，指定各版本进行下载。  
各安装目录稍后会在环境变量中指定。

```txt
- On Windows suggested shell is Git Bash (Cygwin nor WSL is not supported)
   https://git-scm.com/downloads
```

安装 Git Bash。构建时的命令行操作也将在 Git Bash 上进行。

```txt
- CMake 3.5.0 or newer (tested with CMake 3.21)
   http://www.cmake.org/cmake/resources/software.html

- Swig 3.0.12 or 4.0.2 (tested with 3.0.12 and 4.0.2)
  http://swig.org/download.html

- Java Development Kit (e.g.: openjdk17)
```

分别进行安装。本次使用的版本如下：3.21、4.0.2、openjdk17  
JDK 的安装目录稍后会在环境变量中指定。

```txt
- Add cmake and swigwin applications to `PATH` (on Windows)
```

按照要求将 cmake 和 swigwin 添加到环境变量 PATH 中。

从这里开始，是对官方步骤的**补充**。

```txt
- pythonインストール  
```

官方步骤中未提及，但构建需要 Python，因此需安装 Python。  
其它平台的安装说明中提到 Python 时也未说明版本，这里使用版本 3.14.5。  
此外，在 Windows 11 中，python 命令会关联到 Windows 商店的安装程序，需要将此关联取消。  
在 Windows 11 的  
  设置 > 应用 > 应用的详细设置 > 应用执行别名  
中将以下两项关闭：

- “应用安装程序 python.exe”  
- “应用安装程序 python3.exe”  

```txt
- CUDA Toolkitインストール  
```

同样官方步骤中未提及，但构建需要 CUDA Toolkit，因此需安装 CUDA Toolkit。  
虽然是 Android 版却需要 CUDA？这是因为在 [frameworks/cudaw](https://github.com/Kishonti-Opensource/gfxbench/tree/main/frameworks/cudaw) 框架中被用作跨平台的通用组件。  
其用途也仅限于信息收集，而非在基准测试主体中执行。由于采用 dlopen 方式加载 CUDA 库，而不是直接链接，即使针对 Android 版本，也不会引发构建错误或运行异常（只要有头文件即可）。  
如果愿意，也可以通过修改构建环境或源代码将其去除，但本次为了减少变更，保留了其原状。  
（后文也会提到需做少量修正）  
本次构建使用的是 PC 上已安装的 v10.2。

## 源代码准备

以下操作将在 Git Bash 中进行。

### 获取

从 GitHub 仓库执行 git clone：

```bash
git clone https://github.com/Kishonti-Opensource/gfxbench.git
```

在我的环境中，所需存储空间约为：

- 构建前：约 6.5GB  
- 构建后：约 18GB  

### 修正

**对官方步骤的补充**。

按如下方式修改 CUDA 头文件路径的设置。  
在 GitHub workflow 步骤 [.github/workflows/main.yml](https://github.com/Kishonti-Opensource/gfxbench/blob/main/.github/workflows/main.yml) 中，构建环境似乎为 Linux，此处为 Windows 构建环境所需的修改。  
同时还做了修改，以便在 Windows 环境中能不受复制命令影响地正确复制。  
CUDA 安装目录名称请根据实际环境进行相应调整。

:::stop
以下补丁为我在本机环境下的示例，应用请**自行承担风险**。（有关许可等详情，请参见[文章末尾](#许可与免责声明)）
:::

```diff
diff --git a/frameworks/cudaw/CMakeLists.txt b/frameworks/cudaw/CMakeLists.txt
index 0cc4a30e..710b4519 100644
--- a/frameworks/cudaw/CMakeLists.txt
+++ b/frameworks/cudaw/CMakeLists.txt
@@ -13,7 +13,9 @@ add_library(cudaw STATIC
 
 if(ANDROID)
     execute_process(
-        COMMAND cp -rL /usr/local/cuda/include ${CMAKE_CURRENT_SOURCE_DIR}/include/nvidia
+        COMMAND ${CMAKE_COMMAND} -E copy_directory
+            "C:/Program Files/NVIDIA GPU Computing Toolkit/CUDA/v10.2/include"
+            ${CMAKE_CURRENT_SOURCE_DIR}/include/nvidia
         RESULT_VARIABLE COPY_RESULT
     )
     if(NOT COPY_RESULT EQUAL 0)
```

## 执行构建

回到官方步骤，进行构建。

### 环境变量设置

在 git clone 后的源码顶层目录，设置以下环境变量。  
**对官方步骤的补充/修正** 如下：

- 增加 JAVA_HOME  
- 将 NDK 版本按前述修改为 28.0.12674087  

各目录名称请根据实际环境进行相应调整。  
（通过 sdkmanager 安装的如果使用默认设置，应该为以下目录名称）

```bash
export JAVA_HOME="/c/Tools/jdk-17.0.18+8"
export ANDROID_NDK="$HOME/AppData/Local/Android/Sdk/ndk/28.0.12674087/"
export ANDROID_HOME="$HOME/AppData/Local/Android/Sdk"
export NG_CMAKE_TOOLCHAIN_FILE="$HOME/AppData/Local/Android/Sdk/ndk/28.0.12674087/build/cmake/android.toolchain.cmake"
export CMAKE_MAKE_PROGRAM="$HOME/AppData/Local/Android/Sdk/ndk/28.0.12674087/prebuilt/windows-x86_64/bin/make.exe"

export WORKSPACE=$PWD
export PLATFORM=android-arm64-v8a
export CONFIG=Release
export APPLICATION_TYPE=gui
```

另外，在我的环境中（Git Bash 使用 UTF-8 + openjdk17），JDK 的命令输出出现了乱码，但通过以下设置可避免该问题。

```bash
export JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8
```

### 执行构建脚本

按照官方步骤执行以下脚本：

```bash
scripts/build-3rdparty.sh
scripts/build.sh
```

构建成功后，会在构建控制台日志中显示的目录下生成 gfxbench-5.1.5+corporate.apk 文件。  
在我的环境中，大小如下：

- apk 大小：约 1.2GB  
- 在 Android 设备上启动后的大小：约 3.4GB  
  ※有关安装、启动方法将在下次的“执行篇”中介绍  
  ※启动后大小增加是因为首次启动时，apk 内捆绑的数据会被解压到应用数据区域

:::info
也可以采用不将数据捆绑到 apk 内的过程（设置环境变量 BUNDLE_DATA=false）。  
此时 apk 大小约为 21MB。  
但这样需要手动将数据放置到应用数据区域，因此还是按默认的捆绑数据流程更为方便。
:::

生成的 apk 文件的各版本信息如下：

- platformBuildVersionCode='35'  
- compileSdkVersion='35'  
- minSdkVersion:'21'  
- targetSdkVersion:'35'  

minSdkVersion:'21'（Android 5.0），因此可以安装在较旧的 Android 设备上，并有望正常运行。  
:::info
这个 minSdkVersion 是 GFXBench 开始支持最丰富的图形功能、OpenGL ES 3.1 + AEP 的版本。  
因此，从此 minSdkVersion 起，应能充分享受 GFXBench。  
（我也觉得这或许就是该 minSdkVersion 取此值的原因）
:::

## 其他构建变体

本次是以最少的修改方案、并遵循官方说明的方式进行构建，但也可考虑以下几种变体。  
将在未来几篇文章中介绍这些内容。  
（对我而言，从此才是重头戏）

### 构建通用 APK

本次示例中通过设置 `PLATFORM=android-arm64-v8a` 将 Android 平台固定，但也存在包含多个平台的通用 APK 构建流程。  
[scripts/build-multiarch-apk.sh](https://github.com/Kishonti-Opensource/gfxbench/blob/main/scripts/build-multiarch-apk.sh)  
特别是考虑到在较旧 Android 设备上运行，可能还需要 `android-armv7a`，可在需要兼容多平台时使用。

### 旧 Android 设备构建

> minSdkVersion:'21'（Android 5.0），因此应能安装并在较旧 Android 设备上运行。

虽然如此，但实际测试时发现需要进行修正。  
运行时会在 Android 设备上出现错误。  
可能在 Android 8 之前的版本上会出现问题。

### Developer 版构建

本文示例中以 `APPLICATION_TYPE=gui` 进行构建，但也可按 `developer` 方式构建。不过实际测试时同样需做修正。  
构建时会出现错误。  
Developer 版具有如下优势：

- 必须采用不将数据捆绑到 apk 内的形式，数据需通过 adb push 单独推送  
  通过 adb push 的数据大小约 2.2GB。还可能按所需基准测试部分（按目录）进行精简  
- 应用的 GUI 与 `gui` 版有所不同，apk 文件本身也变小至约 4MB  
  修改应用后重新安装的循环将更加轻便  
- 也许还能有所意外的收获 :-)

另外，官方步骤最后有一段以 `Legacy install process for developer app (not supported)` 开头的特殊流程。  
其中似乎提到可支持 4.4.4_r1（SdkVersion:'19'）及更早版本，但这里不在讨论范围内。

## 结语

本文介绍了 GFXBench 这款基准测试软件的来龙去脉，并完成了构建工作。  
下篇将实际运行并测试基准分数。

## 许可与免责声明

本文中提供的构建修正补丁及引用的构建步骤，均基于以 BSD 3-Clause License 公开的 [Kishonti-Opensource/gfxbench](https://github.com/Kishonti-Opensource/gfxbench) 源代码及文档（`doc/gfxbench_gl_android_build.txt`）进行使用和引用。

- **原始版权：** (c) 2005–2025 Kishonti Ltd.  
- **许可证：** [BSD 3-Clause License](https://github.com/Kishonti-Opensource/gfxbench)  
- **关于文档的权利：** 文章中引用的官方构建步骤文字版权归原作者 Kishonti Ltd. 所有。

**【免责声明】**  
本文中提供的补丁和步骤均以特定验证环境中的现状（AS IS）提供，不对其准确性或安全性作任何保证。  
因应用补丁或执行构建而导致的任何直接或间接损害，作者及株式会社is概不负责。请在充分确认内容后，自行承担风险使用。
