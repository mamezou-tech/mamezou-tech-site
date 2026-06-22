---
title: オープンソース版GFXBenchをAndroidで動かす（1）ビルド編
author: kazuya-iwamoto
date: 2026-07-03
tags: [GFXBench, android]
---

## はじめに

GFXBenchというGPUベンチマークソフトをご存じでしょうか。  
Windows, Linux, Android, iPhone等のマルチプラットフォームで実行出来るkishonti社のGPUベンチマークソフトです。

[GFXBench - unified graphics benchmark based on DXBenchmark (DirectX) and GLBenchmark (OpenGL ES)](https://gfxbench.com/)

今まで新しいAndroid端末を買ってはAndroidのストアからダウンロードしてベンチマークを行ったものでした。

今回取り上げるきっかけとなった流れです。

1. 久々に新しいAndroidタブレットを購入
2. ストアからGFXBenchを探すと見つからない？
3. 過去Android端末にインストール済のGFXBenchもサーバに接続出来ず起動しない？
4. たまたまメンテナンス等でタイミングが悪いのかと1か月位待っても状況変わらず
5. 流石におかしいと思い調べたところサービス終了、GitHubでオープンソース化されていた事が発覚！

オープンソース化は2025年末の出来事の様です。  
[KISHONTI Milestones - our History](https://kishonti.net/milestones)

[GFXBench and CompuBench are shutting down after 21 years, source code and toplist database move to GitHub](https://videocardz.com/newz/gfxbench-and-compubench-are-shutting-down-after-21-years-source-code-and-toplist-database-move-to-github)

単なるベンチマークソフト以上に筆者には思い入れがありました。

無料のダウンロード版ではなくkishonti社からライセンスを受けたソースコード版を自社製品の基板（not Android）に移植しベンチマークを行う、という業務を行った事があったからです。  
GFXBenchの中にはいくつかベンチマークの種類がありますが、T-Rex/Manhattanあたりの時代の事でした。  
（ベンチマーク種類については次回の実行編で触れます）  
アーリーアクセスのソースコードだと移植性も良くなく、かなり手を入れて移植しデバッグしたものでした...。

それがGitHubでオープンソース化です。  
[GitHub - Kishonti-Opensource-gfxbench](https://github.com/Kishonti-Opensource/gfxbench)

時代の流れを感じたり当時の事を思い出したりでしんみりしてしまいますが、今までの活動やオープンソース化された事に感謝しつつビルドを行い実行してみようと思います。

今回の目標としては以下とします。

- GFXBenchをソースコードからビルドしてAndroid端末で実行出来るノウハウを修得する
  - ビルド環境：Windows11
  - ビルド対象：Android用、かつ筆者のAndroid端末コレクションの関係上古いAndroidバージョンでも実行出来る事が望ましい
- それにより、既存の実行出来なくなった実行バイナリの代替としてだけではなく、実験でソースコードを修正したくなった時も気軽にローカルで試せる様にする

対象者は以下とします。

- Androidアプリ開発経験あり
  - Android Studio、sdkmanager、adbコマンドを扱える人
  - Android端末を開発者モードに出来る人
- コマンドライン操作、環境変数に戸惑わない人
- Graphics API (今回は OpenGL ES) に詳しいとより楽しむ事が可能

## ビルド環境準備

GitHub GFXBench公式のAndroid用ビルド手順は以下にあります（以下"公式手順"として参照します）。  
[doc/gfxbench_gl_android_build.txt](https://github.com/Kishonti-Opensource/gfxbench/blob/main/doc/gfxbench_gl_android_build.txt)

この内容に従ってビルド環境を構築していきます。

以下、公式手順を引用し、項目ごと見ていきます。

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

この内容に従って、sdkmanagerで上記をダウンロードします。  
今回はAndroidStudio上からsdkmanagerのGUIを起動して各バージョンを指定してダウンロードしました。  
各インストール場所を後に環境変数で指定する事になります。  

```txt
- On Windows suggested shell is Git Bash (Cygwin nor WSL is not supported)
   https://git-scm.com/downloads
```

Git Bashをインストールします。ビルドの際のコマンドライン操作もGit Bash上で行います。

```txt
- CMake 3.5.0 or newer (tested with CMake 3.21)
   http://www.cmake.org/cmake/resources/software.html

- Swig 3.0.12 or 4.0.2 (tested with 3.0.12 and 4.0.2)
  http://swig.org/download.html

- Java Development Kit (e.g.: openjdk17)
```

それぞれインストールします。今回使用したバージョンはそれぞれ以下です。3.21, 4.02, openjdk17  
JDKはインストール場所を後に環境変数で指定する事になります。

```txt
- Add cmake and swigwin applications to `PATH` (on Windows)
```

そして、指定通り環境変数 PATH に加えます。

ここから **公式手順へのプラス分** です。

```txt
- pythonインストール  
```

公式手順には記載ありませんが、pythonがビルドに必要となりますのでインストールします。  
pythonへ言及のある他プラットフォーム用インストールにおいてもversionについては記載はなく不明ですが、今回は version 3.14.5 を使用しました。  
また、Windows11ではpythonコマンドからWindowsストアのインストーラにエイリアスが貼られているため、それも外しておきます。  
Windows11の  
　設定 > アプリ > アプリの詳細設定 > アプリ実行エイリアス  
から以下の2つをオフにします。

- アプリインストーラー python.exe
- アプリインストーラー python3.exe  

```txt
- CUDA Toolkitインストール  
```

同じく記載ありませんが、CUDA Toolkitがビルドに必要となりますのでインストールします。  
Android版なのにCUDA？となりますが、[frameworks/cudaw](https://github.com/Kishonti-Opensource/gfxbench/tree/main/frameworks/cudaw) というフレームワークでプラットフォーム共通に使用されているからの様です。  
使われ方もベンチマーク本体ではなく情報収集のためだけの様です。dlopenでCUDAライブラリがロードされ直接リンクされない仕組みのため、Android版であってもビルドエラーや不正な実行になる事もありません（ヘッダファイルがあればいいレベル）。  
であればビルド環境やソースコードを修正して外してしまってもいいのですが、今回は修正点を少なくしたかったのでそのままにしています。  
（後述の様に若干の修正は必要にはなります）  
今回はビルドに使用したPCインストール済の v10.2 を使用しました。  

## ソースコード準備

以降Git Bashにて操作します。

### 入手

GitHubのリポジトリからgit cloneします。

```bash
git clone https://github.com/Kishonti-Opensource/gfxbench.git
```

必要なストレージサイズの目安は筆者の環境では以下でした。  

- ビルド前：6.5GB台  
- ビルド後：18GB台  

### 修正  

**公式手順へのプラス分** です。

以下の様にCUDAヘッダパスの設定を修正します。  
GitHub workflow手順 [.github/workflows/main.yml](https://github.com/Kishonti-Opensource/gfxbench/blob/main/.github/workflows/main.yml) ではビルド環境はLinuxの様で、今回のWindowsビルド環境のための修正です。  
またWindows環境でコピーコマンドの影響なしにコピー出来る様にも修正しています。  
CUDAインストールディレクトリ名は各自の環境に合わせて適宜変更してください。

:::stop
以下のパッチは筆者の環境における一例であり、適用は**自己責任**にてお願いいたします。（ライセンス等の詳細は[記事末尾](#ライセンスおよび免責事項)に記載しています）
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

## ビルド実行

再び公式手順に戻りビルドを行います。

### 環境変数設定  

git cloneしたソースのトップディレクトリで以下の環境変数をセットします。  
**JAVE_HOME** のみ **公式手順へのプラス分** です。  
各ディレクトリ名は各自の環境に合わせて適宜変更してください。

```bash
export JAVA_HOME="/c/Tools/jdk-17.0.18+8"
export ANDROID_NDK="$HOME/AppData/Local/Android/Sdk/ndk/24.0.8215888/"
export ANDROID_HOME="$HOME/AppData/Local/Android/Sdk"
export NG_CMAKE_TOOLCHAIN_FILE="$HOME/AppData/Local/Android/Sdk/ndk/24.0.8215888/build/cmake/android.toolchain.cmake"
export CMAKE_MAKE_PROGRAM="$HOME/AppData/Local/Android/Sdk/ndk/24.0.8215888/prebuilt/windows-x86_64/bin/make.exe"

export WORKSPACE=$PWD
export PLATFORM=android-arm64-v8a
export CONFIG=Release
export APPLICATION_TYPE=gui
```

なお、筆者の環境 `Git BashでUTF-8使用 ＋ openjdk17` の場合、JDKのコマンド出力が文字化けしたのですが、以下の設定で回避出来ました。

```bash
export JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8
```

### ビルドスクリプト実行

公式手順通り以下のスクリプトを実行します。

```bash
scripts/build-3rdparty.sh
scripts/build.sh
```

ビルドが成功すると gfxbench-5.1.5+corporate.apk ファイルが出来上がります。  
サイズは筆者の環境では以下でした。  

- apkサイズ：1.2GB台  
- Android端末で起動後のサイズ：3.4GB台  
  ※起動後のサイズが増えるのは、初回起動時apk内にバンドルされたデータがアプリデータ領域に展開されるため。

:::info
apk内にデータをバンドルさせない手順もあります（環境変数 BUNDLE_DATA=false）。  
この場合のapkサイズは 21MB台 となります。  
ただしその場合は手動でデータをアプリデータ領域に配置する必要があるのでバンドルさせる通常手順のままが便利です。  
:::

出来上がったapkファイルの各バージョン情報は以下です。

- platformBuildVersionCode='35'
- compileSdkVersion='35'
- minSdkVersion:'21'
- targetSdkVersion:'35'

minSdkVersion:'21' (Android5.0) なので古いAndroid端末でもインストール出来、動作する事も期待されます。  
:::info
このminSdkVersionはGFXBenchが要求する一番リッチなGraphics、OpenGL ES 3.1 + AEP に対応が始まったversionとなります。
なのでこのminSdkVersionからフルにGFXBenchを楽しむ事が出来ると期待されます。  
（後に実際に確認してみます）
:::

## 他のビルドバリエーション

今回は一番少ない修正案、及び公式の記載準拠でビルドを行いましたが、以下のビルドのバリエーションも考えられます。  
次々回以降で取り上げたいと思います。  
（筆者の目標としてはここからが本番とも言えます）

### ユニバーサルAPKビルド  

今回は `PLATFORM=android-arm64-v8a` でAndroidプラットフォームを固定する方法でしたが、複数プラットフォームを含むユニバーサルAPKを作成する方法も存在する様です。  
[scripts/build-multiarch-apk.sh](https://github.com/Kishonti-Opensource/gfxbench/blob/main/scripts/build-multiarch-apk.sh)  
特に古いAndroid端末での実行を考えると `android-armv7a` も必要になってくるので両対応させたい場合に便利と思われます。

### 古いAndroid端末用ビルド  

> minSdkVersion:'21' (Android5.0) なので古いAndroid端末でもインストール出来、動作する事も期待されます。

と書いたのですが、実際に試すと修正が必要となりました。  
実行時にAndroid端末上でエラーが発生します。  
おそらくAndroid8より古い場合にNGと思われます。  

### developer版ビルド  

`APPLICATION_TYPE=gui` としてビルドしましたが、`developer` としてビルドする方法もあります。ただこれも実際に試すと修正が必要となりました。  
ビルド時にエラーが発生します。  
developer版らしく以下の恩恵があります。

- データがapkにバンドルされない形式必須で別途adb pushする形式となる  
  adb push分データのサイズは 2.2GB台 程度。更に必要ベンチマーク分（ディレクトリ単位）で絞れる可能性もあり
- アプリのGUIが`gui`版とは変わりapkファイル自体も 4MB台 と小さくなる  
  アプリを修正してはインストールし直すというサイクルが楽になる  
- 思わぬ発見もあるかもしれません :-)

なお、公式手順の最後に `Legacy install process for developer app (not supported)` から始まる特殊な手順があります。  
その中で 4.4.4_r1（SdkVersion:'19'）と更に古いAndroidバージョンに対応出来る様に見える旨があるのですが、これは対象外とします。  

## おわりに

今回はGFXBenchというベンチマークについて取り上げるきっかけのお話とビルドまでを行いました。  
次回は実際に実行しベンチマークスコアを測ってみます。

## ライセンスおよび免責事項

本記事に掲載しているビルド修正パッチ、引用しているビルド手順は、BSD 3-Clause Licenseのもとで公開されている [Kishonti-Opensource/gfxbench](https://github.com/Kishonti-Opensource/gfxbench) のソースコードおよびドキュメント（`doc/gfxbench_gl_android_build.txt`）を利用・引用したものです。

- **Original Copyright:** (c) 2005–2025 Kishonti Ltd.
- **License:** [BSD 3-Clause License](https://github.com/Kishonti-Opensource/gfxbench)
- **ドキュメントの権利について:** 記事内で引用している公式ビルド手順のテキストの著作権は、原著作者であるKishonti Ltd.に帰属します。

**【免責事項】**  
本記事に掲載しているパッチ、手順は、特定の検証環境における現状のまま（AS IS）のものであり、その正確性や安全性を保証するものではありません。  
パッチの適用やビルドの実行により生じた直接的・間接的な損害について、筆者および株式会社豆蔵は一切の責任を負いません。内容を十分にご確認の上、ご自身の責任においてご利用ください。
