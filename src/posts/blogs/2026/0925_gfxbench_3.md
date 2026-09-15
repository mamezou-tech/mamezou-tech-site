---
title: オープンソース版GFXBenchをAndroidで動かす（3）オールドビルド編
author: kazuya-iwamoto
date: 2026-09-25
tags: [GFXBench, android, gpu]
---

## はじめに

GFXBenchというGPUベンチマークソフトを取り上げたシリーズの3回目です。  
前回までで新しいAndroidバージョンで実行が行えました。
今回からは古いAndroidバージョンでの実行を試みてみます。

## ソースコード準備

前回までのAPKファイルを古いAndroidバージョンで実行するとエラーが発生し（詳細は後述）終了してしまいました。  
エラー原因からソースコードを修正して回避出来ないか検討してみます。

### 修正方針

修正方針も色々あるかと思いますが、今回の前提としてAndroid SDKおよびNDKバージョン、Java側の設定は変更しないで頑張ってみる事にしました。  

以下前回までの設定を再掲します。

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

これら設定の元で修正案を考えていきます。  

### 実行時のエラーと修正案

最初は実行時のエラーの理由が訳わからなかったのですが、整理すると以下の3つの様でした。

#### Androidバージョン 8 → 7 の壁

commons-io が  java.nio に依存していてそれで `NoSuchMethodError` が実行時に発生しました。  

```monitor
E AndroidRuntime: Caused by: java.lang.NoSuchMethodError: No virtual method toPath()Ljava/nio/file/Path; in class Ljava/io/File; or its super classes (declaration of 'java.io.File' appears in /system/framework/core-libart.jar)
E AndroidRuntime:   at org.apache.commons.io.IOCase$$ExternalSyntheticApiModelOutline0.m(D8$$SyntheticClass:0)
・・・
```

Androidバージョンによる java.nio サポート可否が原因ですが、そもそものところで java.nio を使っていないバージョンにしてみます。  
[Apache Commons IO](https://mvnrepository.com/artifact/commons-io/commons-io) のDependencies情報あたりからバージョンを 2.6 まで下げればいい様なのでそうしてみます。

#### Androidバージョン 7 → 6 の壁

`cannot locate symbole "__fread_chk"` という問題が実行時に発生しました。  

```monitor
W Runner  : Failed to preload lib: dlopen failed: cannot locate symbol "__fread_chk" referenced by "/data/app/net.kishonti.gfxbench.v50105.corporate-1/lib/arm/libgfxbench40_gl.so"...
```

`E` (Error) ではなく `W` (Warning) 表記なので最初は見過ごしていたのですが、これがクリティカルでした。  
これも何かネイティブ側のライブラリバージョンを下げる方法があればいいと思われます。探すと ANDROID_NATIVE_API_LEVEL という定義が見つかったので、元の値 24 (Android7.0) から 21 (Android5.0) と下げてみます。

#### Androidバージョン 6 → 5 の壁

requestPermissions() で `NoSuchMethodError` が実行時に発生しました。  

```monitor
E/AndroidRuntime(22812): java.lang.NoSuchMethodError: No virtual method requestPermissions([Ljava/lang/String;I)V in class Lnet/kishonti/testfw/app/MainActivity; or its super classes (declaration of 'net.kishonti.testfw.app.MainActivity' appears in /data/app/net.kishonti.testfw.app-1/base.apk)
```

このメソッドは APIレベル23 (Android6.0) からなのでそのバージョンから有効な記述に修正します。  

### 修正

以上の修正をまとめたパッチです。Android用**公式手順へのプラス分**となります。  

:::stop
  以下のパッチは筆者の環境における一例であり、適用は**自己責任**にてお願いいたします。（ライセンス等の詳細は[記事末尾](#ライセンスおよび免責事項)に記載しています）
:::

なお、前々回適用したパッチ `frameworks/cudaw/CMakeLists.txt` （CUDAヘッダパスの設定を修正）の内容も含まれています。

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

## ビルド実行

古いAndroid端末でも動作する様に `android-arm64-v8a android-armv7a` 両対応のユニバーサルAPKとしてビルドしてみます。  
前々回の環境変数を設定の後、**公式手順** ビルドスクリプト2種 **の代わりに以下のスクリプト**を実行します。  
（環境変数の内、 PLATFORM, CONFIG, APPLICATION_TYPE はこのsh内で再設定されます）

```bash
scripts/build-multiarch-apk.sh
```

:::info
前々回のAndroid用公式手順には載っていないのですが、GitHub workflow手順ではAndroid用にこのスクリプトでビルドしている様でそこからの拝借です。
:::

デフォルトだと `android-armv7a android-x86 android-arm64-v8a android-x86-64` の4種類分ビルドされます。  
`android-armv7a android-arm64-v8a` の2種類だけで良ければ以下の様に実行します。

```bash
PLATFORMS="android-armv7a android-arm64-v8a" scripts/build-multiarch-apk.sh
```

apkサイズとビルド時間を削減する効果があります。特にビルド時間の削減効果が大きいです。

ビルドが成功すると、ビルドのコンソールログで表示されるディレクトリに gfxbench-5.1.5+corporate.apk ファイルが出来上がります。  

## おわりに

今回はGFXBenchを古いAndroid端末用にビルドしてみました。  
次回は実際に古いAndroid端末で実行しベンチマークスコアを測ってみます。

## ライセンスおよび免責事項

本記事に掲載しているビルド修正パッチ、引用しているビルド手順は、BSD 3-Clause Licenseのもとで公開されている [Kishonti-Opensource/gfxbench](https://github.com/Kishonti-Opensource/gfxbench) のソースコードおよびドキュメント（`doc/gfxbench_gl_android_build.txt`）を利用・引用したものです。

- **Original Copyright:** (c) 2005–2025 Kishonti Ltd.
- **License:** [BSD 3-Clause License](https://github.com/Kishonti-Opensource/gfxbench)
- **ドキュメントの権利について:** 記事内で引用している公式ビルド手順のテキストの著作権は、原著作者であるKishonti Ltd.に帰属します。

**【免責事項】**  
本記事に掲載しているパッチ、手順は、特定の検証環境における現状のまま（AS IS）のものであり、その正確性や安全性を保証するものではありません。  
パッチの適用やビルドの実行により生じた直接的・間接的な損害について、筆者および株式会社豆蔵は一切の責任を負いません。内容を十分にご確認の上、ご自身の責任においてご利用ください。
