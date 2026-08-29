---
title: 'Running the Open Source Version of GFXBench on Android (1): Build Edition'
author: kazuya-iwamoto
date: 2026-08-28T00:00:00.000Z
tags:
  - GFXBench
  - android
  - gpu
translate: true

---

## Introduction

Do you know the GPU benchmarking software called GFXBench?  
It is a GPU benchmark tool by Kishonti that runs on multiple platforms such as Windows, Linux, Android, and iPhone.

[GFXBench - unified graphics benchmark based on DXBenchmark (DirectX) and GLBenchmark (OpenGL ES)](https://gfxbench.com/)

Until now, whenever I bought a new Android device, I downloaded GFXBench from the Android store and ran benchmarks.

Here is what led me to this topic:

1. I bought a new Android tablet after a long time.  
2. I searched for GFXBench in the store but couldn't find it?  
3. Even on older Android devices with GFXBench already installed, it wouldn't start or connect to the server?  
4. I thought the timing might just be bad due to maintenance, so I waited about a month, but nothing changed.  
5. I finally realized something was wrong, investigated, and discovered the service had ended and the code was open-sourced on GitHub!

It seems the open sourcing happened at the end of 2025.  
[KISHONTI Milestones - our History](https://kishonti.net/milestones)

[GFXBench and CompuBench are shutting down after 21 years, source code and toplist database move to GitHub](https://videocardz.com/newz/gfxbench-and-compubench-are-shutting-down-after-21-years-source-code-and-toplist-database-move-to-github)

I have more than just a passing interest in this benchmarking software.

That's because I once worked on a project where we ported the commercial source code version (not the free download version) to our company's hardware board (not Android) and ran benchmarks.  
GFXBench includes several benchmark types, and this was back in the T-Rex/Manhattan era.  
(I'll cover the benchmark types in the next article on running it.)  
The early-access source code wasn't very portable, so we had to make extensive modifications and debug it thoroughly...

And now it's open-sourced on GitHub.  
[GitHub - Kishonti-Opensource-gfxbench](https://github.com/Kishonti-Opensource/gfxbench)

I feel nostalgic thinking about the industry's evolution and those past days, but with gratitude for all the work so far and its open-sourcing, I'm going to build it and try running it.

My goals this time are:

- Acquire the know-how to build GFXBench from source and run it on an Android device  
  - Build environment: Windows 11  
  - Target: Android, and preferably runnable on older Android versions due to my collection of devices  
- This will allow not only a replacement for the existing binaries that no longer run but also easy local experimentation when I want to modify the source code

The intended audience:

- Those with Android app development experience  
  - Able to use Android Studio, sdkmanager, and adb commands  
  - Able to enable developer mode on Android devices  
- Comfortable with command-line operations, patches, and environment variables  
- Familiarity with Graphics APIs (this time OpenGL ES) will make it more enjoyable

## Preparing the Build Environment

The official Android build instructions for GFXBench on GitHub are here (referred to below as the "official instructions"):  
[doc/gfxbench_gl_android_build.txt](https://github.com/Kishonti-Opensource/gfxbench/blob/main/doc/gfxbench_gl_android_build.txt)

I will follow these instructions to set up the build environment.

Below, I quote the official instructions and review each item.

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

Download the above with sdkmanager as described.  
This time, I launched the sdkmanager GUI from Android Studio, specified each version, and downloaded them.  
These install paths will be referenced later via environment variables.

```txt
- On Windows suggested shell is Git Bash (Cygwin nor WSL is not supported)  
   https://git-scm.com/downloads
```

Install Git Bash. All command-line operations during the build will be done in Git Bash.

```txt
- CMake 3.5.0 or newer (tested with CMake 3.21)  
   http://www.cmake.org/cmake/resources/software.html

- Swig 3.0.12 or 4.0.2 (tested with 3.0.12 and 4.0.2)  
   http://swig.org/download.html

- Java Development Kit (e.g.: openjdk17)
```

Install each of these. The versions I used this time are 3.21, 4.0.2, and openjdk17.  
The JDK install path will also be referenced later via environment variables.

```txt
- Add cmake and swigwin applications to `PATH` (on Windows)
```

Add the cmake and swigwin executables to your PATH as instructed.

From here, **Additions to the Official Instructions**:

```txt
- Install Python
```

Although not mentioned in the official instructions, Python is required for the build, so install it.  
Other platform installation guides that mention Python do not specify a version, but I used version 3.14.5 this time.  
Also, on Windows 11, the `python` command is aliased to the Windows Store installer, so disable that alias:  
Settings > Apps > Advanced App Settings > App Execution Aliases  
Turn off:

- App Installer python.exe  
- App Installer python3.exe  

```txt
- Install CUDA Toolkit
```

Similarly not mentioned, but the CUDA Toolkit is needed for the build.  
You might wonder why CUDA for the Android version. It seems there is a cross-platform framework [frameworks/cudaw](https://github.com/Kishonti-Opensource/gfxbench/tree/main/frameworks/cudaw).  
It appears to be used only for information gathering, not in the benchmark core. Since it uses dlopen to load CUDA libraries rather than linking directly, there are no build errors or improper executions on Android (headers alone suffice).  
You could remove it by modifying the build environment or source, but to minimize changes, I left it as is.  
(A small modification will still be necessary, as described later.)  
I used the already installed v10.2 on my PC for this build.

## Preparing the Source Code

From here on, operate in Git Bash.

### Obtaining

Clone the GitHub repository:

```bash
git clone https://github.com/Kishonti-Opensource/gfxbench.git
```

In my environment, the approximate storage requirements were:

- Before build: around 6.5 GB  
- After build: around 18 GB

### Patches

**Additions to the Official Instructions**:

Adjust the CUDA header path settings as follows. The GitHub workflow [.github/workflows/main.yml](https://github.com/Kishonti-Opensource/gfxbench/blob/main/.github/workflows/main.yml) seems to assume a Linux build environment; this patch is for Windows.  
It also ensures the copy command works on Windows without side effects.  
Adjust the CUDA install directory name as appropriate for your environment.

:::stop
The following patch is an example for my environment and should be applied **at your own risk**. (See [License and Disclaimer](#ライセンスおよび免責事項) at the end of the article for details on licensing.)
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

## Building

Return to the official instructions and perform the build.

### Setting Environment Variables

In the top-level directory of the cloned source, set the following environment variables.  
**Additions/Modifications to the Official Instructions**:

- Added `JAVA_HOME`  
- Corrected the NDK version to 28.0.12674087 as mentioned above

Adjust directory names as appropriate for your environment.  
(If you installed via sdkmanager with default settings, you should see the following names.)

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

In my environment (`Git Bash using UTF-8` + `openjdk17`), the JDK command output was garbled, but the following setting resolved it:

```bash
export JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8
```

### Running the Build Scripts

As per the official instructions, run:

```bash
scripts/build-3rdparty.sh
scripts/build.sh
```

If the build succeeds, an `gfxbench-5.1.5+corporate.apk` file will appear in the directory shown in the build console log.  
In my environment, the sizes were:

- APK size: around 1.2 GB  
- Size on first launch on an Android device: around 3.4 GB  
  *Installation and launch procedures will be covered in the next article on running.*  
  *The size increase on first launch is due to the bundled data in the APK being extracted to the app data area.*

:::info
There is a procedure to avoid bundling data inside the APK (`BUNDLE_DATA=false`).  
In that case, the APK size is about 21 MB.  
However, you must then manually place the data in the app data area, so the normal bundling procedure is more convenient.
:::

The resulting APK file has the following version information:

- platformBuildVersionCode='35'  
- compileSdkVersion='35'  
- minSdkVersion:'21'  
- targetSdkVersion:'35'

Since `minSdkVersion` is '21' (Android 5.0), it should install and run on older Android devices.  
:::info
This `minSdkVersion` corresponds to the version where support for the most advanced graphics, OpenGL ES 3.1 + AEP, began in GFXBench.  
So you can expect to fully enjoy GFXBench starting from this `minSdkVersion`.  
(I also think this might be the reason for this value of `minSdkVersion`.)
:::

## Other Build Variations

This time, I used the minimal modifications and followed the official instructions, but the following build variations are also possible.  
I'll cover them in upcoming articles.  
(You could say this is where the real work begins.)

### Universal APK Build

This time, I fixed the Android platform to `android-arm64-v8a`, but there is a procedure to create a universal APK that includes multiple platforms:  
[scripts/build-multiarch-apk.sh](https://github.com/Kishonti-Opensource/gfxbench/blob/main/scripts/build-multiarch-apk.sh)  
This is especially useful if you want to support older Android devices, since you'd need `android-armv7a` as well.

### Build for Older Android Devices

> Since `minSdkVersion` is '21' (Android 5.0), it should install and run on older Android devices.

As I mentioned, but in practice I found changes were necessary.  
Runtime errors occur on the Android device.  
It seems likely that devices older than Android 8 are problematic.

### Developer Version Build

I built with `APPLICATION_TYPE=gui`, but there is also a procedure to build with `developer`. However, when I tried it, modifications were necessary.  
Build errors occur.  
As the developer version, you get the following benefits:

- Data bundling inside the APK is not allowed; data must be pushed separately via adb  
  The data to push is about 2.2 GB. You can further narrow down the required benchmarks (by directory).  
- The app GUI differs from the `gui` version, and the APK itself shrinks to around 4 MB  
  This makes the cycle of modifying the app and reinstalling it easier.  
- You might discover unexpected things :-)

There is a special procedure at the end of the official instructions starting with `Legacy install process for developer app (not supported)`.  
It even appears to support Android 4.4.4_r1 (SdkVersion:'19') and older, but I will not cover this.

## Conclusion

This article covered the motivation for looking into GFXBench and walked through the build process.  
In the next article, I'll actually run it and measure benchmark scores.

## License and Disclaimer

The build patches and quoted build instructions in this article use and reference the source code and documentation (`doc/gfxbench_gl_android_build.txt`) of [Kishonti-Opensource/gfxbench](https://github.com/Kishonti-Opensource/gfxbench), which is published under the BSD 3-Clause License.

- Original Copyright: (c) 2005–2025 Kishonti Ltd.  
- License: [BSD 3-Clause License](https://github.com/Kishonti-Opensource/gfxbench)  
- About document rights: The copyright of the official build instructions quoted in this article belongs to the original author, Kishonti Ltd.

**Disclaimer**  
The patches and procedures in this article are provided "AS IS" for a specific test environment and do not guarantee accuracy or safety.  
Neither the author nor Mamezou Co., Ltd. accepts any liability for direct or indirect damages arising from applying the patches or executing the build. Please review the content carefully and use it at your own risk.
