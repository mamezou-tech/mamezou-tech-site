---
title: 在Android上运行开源版GFXBench（3）旧版本构建篇
author: kazuya-iwamoto
date: 2026-09-25T00:00:00.000Z
tags:
  - GFXBench
  - android
  - gpu
translate: true

---

## 前言

这是关于 GPU 基准测试软件 GFXBench 系列的第3篇。  
到上次为止，已经能够在较新的 Android 版本上运行。  
这次开始尝试在较旧的 Android 版本上运行。

## 源代码准备

在较旧的 Android 版本上运行到上次生成的 APK 文件时会发生错误（详细情况后文描述），无法执行基准测试。  
我们将从错误原因出发，研究是否能通过修改源代码来规避该问题。

### 修正方案

关于修正方案有很多种可能，但本次前提是不更改 Android SDK 及 NDK 版本、Java 端的设置，尽力尝试在此基础上进行修复。  

下面重申上次的设置。

  Path                 | Version           | Description                             | Location
  -------              | -------           | -------                                 | -------
  build-tools;35.0.0   | 35.0.0            | Android SDK Build-Tools 35              | build-tools/35.0.0
  cmdline-tools;latest | 16.0              | Android SDK Command-line Tools (latest) | cmdline-tools/latest
  ndk;28.0.12674087    | 28.0.12674087 rc2 | NDK (Side by side) 28.0.12674087        | ndk/28.0.12674087
  platform-tools       | 35.0.2            | Android SDK Platform-Tools              | platform-tools
  platforms;android-35 | 1                 | Android SDK Platform 35                 | platforms/android-35

- platformBuildVersionCode='35'
- compileSdkVersion='35'
- minSdkVersion:'21'
- targetSdkVersion:'35'

在上述设置基础上考虑修正方案。

### 运行时错误及修正方案

起初不太清楚运行时错误的原因，但整理后似乎有以下三个问题。

#### Android 版本 8 → 7 的障碍

由于 commons-io 依赖于 java.nio，在运行时发生了 `NoSuchMethodError`。

```monitor
E AndroidRuntime: Caused by: java.lang.NoSuchMethodError: No virtual method toPath()Ljava/nio/file/Path; in class Ljava/io/File; or its super classes (declaration of 'java.io.File' appears in /system/framework/core-libart.jar)
E AndroidRuntime:   at org.apache.commons.io.IOCase$$ExternalSyntheticApiModelOutline0.m(D8$$SyntheticClass:0)
・・・
```

这是由不同 Android 版本对 java.nio 支持与否导致的，但可以尝试使用本身不使用 java.nio 的版本。根据 [Apache Commons IO](https://mvnrepository.com/artifact/commons-io/commons-io) 的 Dependencies 信息，将版本降到 2.6 就可以了，所以试试这个版本。

#### Android 版本 7 → 6 的障碍

运行时发生了 `cannot locate symbol "__fread_chk"` 问题。

```monitor
W Runner  : Failed to preload lib: dlopen failed: cannot locate symbol "__fread_chk" referenced by "/data/app/net.kishonti.gfxbench.v50105.corporate-1/lib/arm/libgfxbench40_gl.so"...
```

`E` (Error) 而非 `W` (Warning) 的日志表示，起初被忽略了，但这是个关键问题。  
同样，如果能降低本地(native)库的版本可能就能解决。搜索后发现了 ANDROID_NATIVE_API_LEVEL 这个定义，就将其从原来的 24 (Android7.0) 降到 21 (Android5.0) 试试。

#### Android 版本 6 → 5 的障碍

调用 requestPermissions() 时发生了 `NoSuchMethodError`。

```monitor
E/AndroidRuntime(22812): java.lang.NoSuchMethodError: No virtual method requestPermissions([Ljava/lang/String;I)V in class Lnet/kishonti/testfw/app/MainActivity; or its super classes (declaration of 'net.kishonti.testfw.app.MainActivity' appears in /data/app/net.kishonti.testfw.app-1/base.apk)
```

此方法从 API 级别23 (Android6.0) 开始才可用，因此需修改为从该版本起才执行调用的写法。

### 修正

以上是汇总上述修正的补丁，是 Android 官方步骤的额外补充。  

:::stop
以下补丁为笔者环境下的示例，应用请**自行承担风险**。（有关许可证等详细信息，请参阅[文章末尾](#ライセンスおよび免責事項)）
:::

另外，还包含了上上次应用的补丁 `frameworks/cudaw/CMakeLists.txt` （修正 CUDA 头文件路径设置）的内容。

```diff
diff --git a/app_android/benchui-lib/build.gradle b/app_android/benchui-lib/build.gradle
index ceb9dbaa..534663bf 100644
--- a/app_android/benchui-lib/build.gradle
+++ b/app_android/benchui-lib/build.gradle
@@ -24,7 +24,7 @@ android {
 
 dependencies {
     implementation('com.google.code.gson:gson:2.10.1')
-    implementation('commons-io:commons-io:2.15.0')
+    implementation('commons-io:commons-io:2.6')
     implementation('de.greenrobot:greendao:2.1.0')
 
     implementation project(':testfw')
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
diff --git a/frameworks/testfw/android/testfw-app/build.gradle b/frameworks/testfw/android/testfw-app/build.gradle
index a4edba77..59e41cbf 100644
--- a/frameworks/testfw/android/testfw-app/build.gradle
+++ b/frameworks/testfw/android/testfw-app/build.gradle
@@ -45,7 +45,7 @@ android {
 }
 
 dependencies {
-    implementation("commons-io:commons-io:2.11.0")
+    implementation("commons-io:commons-io:2.6")
 
     implementation project(':testfw')
     implementation project(':platform-utils')
diff --git a/frameworks/testfw/android/testfw-app/src/main/java/net/kishonti/testfw/app/MainActivity.java b/frameworks/testfw/android/testfw-app/src/main/java/net/kishonti/testfw/app/MainActivity.java
index 808b4a47..89c53e1d 100644
--- a/frameworks/testfw/android/testfw-app/src/main/java/net/kishonti/testfw/app/MainActivity.java
+++ b/frameworks/testfw/android/testfw-app/src/main/java/net/kishonti/testfw/app/MainActivity.java
@@ -38,7 +38,9 @@ public class MainActivity extends Activity {
         super.onCreate(savedInstanceState);
         setContentView(R.layout.activity_main);
 
-        requestPermissions(new String[] { Manifest.permission.WRITE_EXTERNAL_STORAGE }, 2);
+        if (android.os.Build.VERSION.SDK_INT >= 23) {
+            requestPermissions(new String[] { Manifest.permission.WRITE_EXTERNAL_STORAGE }, 2);
+        }
 
         mDetailView = (TextView) findViewById(R.id.detailView);
         mDetailView.setMovementMethod(new ScrollingMovementMethod());
diff --git a/frameworks/testfw/android/testfw-lib/build.gradle b/frameworks/testfw/android/testfw-lib/build.gradle
index d0e757b1..37dc1bcf 100644
--- a/frameworks/testfw/android/testfw-lib/build.gradle
+++ b/frameworks/testfw/android/testfw-lib/build.gradle
@@ -27,5 +27,5 @@ android {
 
 dependencies {
     implementation('com.google.code.gson:gson:2.10.1')
-    implementation('commons-io:commons-io:2.15.0')
+    implementation('commons-io:commons-io:2.6')
 }
diff --git a/scripts/build-3rdparty.sh b/scripts/build-3rdparty.sh
index 26e1cce7..c72e0d73 100644
--- a/scripts/build-3rdparty.sh
+++ b/scripts/build-3rdparty.sh
@@ -28,7 +28,7 @@ fi
 : ${CONFIG?"not set"}
 
 # set default values
-: ${ANDROID_NATIVE_API_LEVEL:="android-24"}
+: ${ANDROID_NATIVE_API_LEVEL:="android-21"}
 
 : ${ENABLE_CLANG:="false"}
 : ${USE_WAYLAND:="false"}
diff --git a/scripts/build.sh b/scripts/build.sh
index 8e501d7a..a34fb2a7 100644
--- a/scripts/build.sh
+++ b/scripts/build.sh
@@ -385,7 +385,7 @@ case $PLATFORM in
         fi
         RENDER_API=${OVERRIDE_RENDER_API:="${RENDER_API}"}
         COMMON_OPTS+=" -DRENDER_API=${RENDER_API}"
-        COMMON_OPTS+=" -DANDROID_NATIVE_API_LEVEL=24"
+        COMMON_OPTS+=" -DANDROID_NATIVE_API_LEVEL=21"
 
         PROJECTS="frameworks/platform-utils $PROJECTS frameworks/testfw"
         COMMON_OPTS+=" -DOPT_SWIG_JAVA=1 -DLIBRARY_OUTPUT_PATH_ROOT:PATH=${TFW_PACKAGE_DIR}"
```

## 构建执行

为了让其在旧版 Android 设备上也能运行，我们将以同时支持 `android-arm64-v8a` 和 `android-armv7a` 的通用 APK 进行构建。设置好上上次的环境变量后，**使用以下脚本替代** 官方说明中的两种构建脚本执行。（在这些环境变量中，PLATFORM、CONFIG、APPLICATION_TYPE 会在该脚本内重新设置）

```bash
scripts/build-multiarch-apk.sh
```

:::info
该脚本并未列在上上次的 Android 官方说明中，但在 GitHub workflow 中似乎使用该脚本进行 Android 构建，故在此借用。
:::

默认会构建 `android-armv7a android-x86 android-arm64-v8a android-x86-64` 四种架构。如果只需 `android-armv7a android-arm64-v8a` 两种，可以如下执行。

```bash
PLATFORMS="android-armv7a android-arm64-v8a" scripts/build-multiarch-apk.sh
```

这样可以减少 APK 大小和构建时间，尤其是能显著缩短构建时间。

构建成功后，在构建控制台日志显示的目录中会生成 gfxbench-5.1.5+corporate.apk 文件。

## 结语

这次尝试为旧版 Android 设备构建了 GFXBench。  
下次将实际在旧版 Android 设备上运行并测量基准测试分数。

## 许可及免责声明

本文中所示的构建修正补丁和引用的构建步骤，均使用/引用了在 BSD 3-Clause License 下发布的 [Kishonti-Opensource/gfxbench](https://github.com/Kishonti-Opensource/gfxbench) 的源代码及文档（`doc/gfxbench_gl_android_build.txt`）。

- **Original Copyright:** (c) 2005–2025 Kishonti Ltd.
- **License:** [BSD 3-Clause License](https://github.com/Kishonti-Opensource/gfxbench)
- **文档权利说明：** 文章中引用的官方构建步骤文本的著作权归原作者 Kishonti Ltd. 所有。

**【免责声明】**  
本文所载补丁及步骤均为在特定验证环境下的现状（AS IS），不保证其准确性及安全性。  
因应用补丁或执行构建所导致的直接或间接损失，笔者及 is 均不承担任何责任。请在充分确认内容后，自行承担风险并使用。
