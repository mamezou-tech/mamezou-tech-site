---
title: 'Running the Open Source GFXBench on Android (3): Old Build Edition'
author: kazuya-iwamoto
date: 2026-09-25T00:00:00.000Z
tags:
  - GFXBench
  - android
  - gpu
translate: true

---

## Introduction

This is the third installment in the series covering GFXBench, a GPU benchmarking tool.  
In the previous articles, we were able to run it on newer versions of Android.  
Starting this time, we'll attempt to run it on older Android versions.

## Preparing the Source Code

When running the APK from the previous article on older Android versions, errors occurred (details below), making benchmark execution impossible.  
We'll examine the causes of these errors and see if we can modify the source code to avoid them.

### Modification Strategy

There are various possible approaches, but for this article we'll try to keep the Android SDK and NDK versions, as well as the Java settings, unchanged.

Below is a recap of the settings from the previous article.

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

With these settings as our basis, we'll consider our proposed changes.

### Runtime Errors and Proposed Fixes

At first I couldn't figure out the reasons for the runtime errors, but after reviewing them, they fell into three categories:

#### The Android 8 to 7 Barrier

commons-io depends on java.nio, which triggered a `NoSuchMethodError` at runtime:

```monitor
E AndroidRuntime: Caused by: java.lang.NoSuchMethodError: No virtual method toPath()Ljava/nio/file/Path; in class Ljava/io/File; or its super classes (declaration of 'java.io.File' appears in /system/framework/core-libart.jar)
E AndroidRuntime:   at org.apache.commons.io.IOCase$$ExternalSyntheticApiModelOutline0.m(D8$$SyntheticClass:0)
・・・
```

The cause is the varying support for java.nio across Android versions, so we'll try using a version of commons-io that doesn't use java.nio.  
Based on the dependencies info for Apache Commons IO, downgrading to version 2.6 should work, so we'll do that.

#### The Android 7 to 6 Barrier

At runtime, the issue `cannot locate symbol "__fread_chk"` occurred:

```monitor
W Runner  : Failed to preload lib: dlopen failed: cannot locate symbol "__fread_chk" referenced by "/data/app/net.kishonti.gfxbench.v50105.corporate-1/lib/arm/libgfxbench40_gl.so"...
```

Since it was labeled `W` (Warning) instead of `E` (Error), I initially overlooked it, but it turned out to be critical.  
Similarly, it seemed necessary to downgrade some native library version. I found a definition called ANDROID_NATIVE_API_LEVEL, so I'll change its original value from 24 (Android 7.0) to 21 (Android 5.0).

#### The Android 6 to 5 Barrier

A `NoSuchMethodError` occurred at runtime when calling requestPermissions():

```monitor
E/AndroidRuntime(22812): java.lang.NoSuchMethodError: No virtual method requestPermissions([Ljava/lang/String;I)V in class Lnet/kishonti/testfw/app/MainActivity; or its super classes (declaration of 'net.kishonti.testfw.app.MainActivity' appears in /data/app/net.kishonti.testfw.app-1/base.apk)
```

Since this method is only available from API level 23 (Android 6.0), we'll modify the code to only call it on API level 23 and above.

### Fixes

Below is the patch summarizing these fixes. This is the addition to the official Android instructions.

:::stop
The following patch is an example for the author's environment and should be applied at your own risk. (For license details, see [License and Disclaimer](#license-and-disclaimer) at the end of the article.)
:::

Note that this also includes the patch applied in the previous article to `frameworks/cudaw/CMakeLists.txt` (which fixes the CUDA header path settings).

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

## Building and Execution

We'll try building as a universal APK supporting both `android-arm64-v8a` and `android-armv7a` so it works on older Android devices.  
After setting the environment variables as in the previous article, run the following script instead of the two official build scripts. (Among the environment variables, PLATFORM, CONFIG, and APPLICATION_TYPE are reconfigured within this sh script.)

```bash
scripts/build-multiarch-apk.sh
```

:::info
This isn't included in the official Android instructions from the previous article, but the GitHub workflow seems to use this script to build Android, so I've borrowed it from there.
:::

By default, it builds for four architectures: `android-armv7a android-x86 android-arm64-v8a android-x86-64`.  
If you only need the two architectures `android-armv7a` and `android-arm64-v8a`, run it like this:

```bash
PLATFORMS="android-armv7a android-arm64-v8a" scripts/build-multiarch-apk.sh
```

This reduces the APK size and build time, especially significantly reducing the build time.  
Upon successful build, you'll find the gfxbench-5.1.5+corporate.apk file in the directory shown in the build console log.

## Conclusion

This time, we built GFXBench for older Android devices.  
Next time, we'll run it on an actual older Android device and measure the benchmark scores.

## License and Disclaimer

The build modification patches and the cited build instructions in this article utilize and quote the source code and documentation (`doc/gfxbench_gl_android_build.txt`) of [Kishonti-Opensource/gfxbench](https://github.com/Kishonti-Opensource/gfxbench), which is published under the BSD 3-Clause License.

- **Original Copyright:** (c) 2005–2025 Kishonti Ltd.
- **License:** [BSD 3-Clause License](https://github.com/Kishonti-Opensource/gfxbench)
- **Document Rights:** The copyright of the official build instructions quoted in this article belongs to the original author, Kishonti Ltd.

**Disclaimer**  
The patches and procedures in this article are provided AS IS for a specific test environment and do not guarantee accuracy or safety.  
The author and Mamezou Co., Ltd. assume no responsibility for any direct or indirect damages arising from applying the patches or running the build. Please review the contents carefully and use them at your own risk.
