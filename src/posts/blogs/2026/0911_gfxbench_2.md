---
title: オープンソース版GFXBenchをAndroidで動かす（2）実行編
author: kazuya-iwamoto
date: 2026-09-11
tags: [GFXBench, android, gpu]
---

## はじめに

GFXBenchというGPUベンチマークソフトを取り上げたシリーズの2回目です。  
前回でGitHub公開されたGFXBenchのビルドが行えました。  
今回は実際に実行してベンチマークスコアを確認してみます。

## ベンチマーク紹介

GFXBenchは様々なベンチマークから構成されており、起動時に選択して実行する様になっています。  
カテゴリは大きく 高レベルテスト と 低レベルテスト に分かれています。  

今回取り上げるのは 高レベルテスト の方で、その中からいくつか抜粋して紹介します。  
:::check
 以降画像は筆者のスマートフォンのGFXBench実行時スクリーンショットより引用  
 スマートフォン/タブレットによってはレイアウト等見え方が異なる場合があります
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

色々説明されていますが、まずは "Required minimum API" の部分だけに注目してみます。  
以下の様にベンチマークが OpenGL ESバージョン に伴って進化してきた事がわかります。  
（GFXBenchのバージョンアップで各ベンチマークが追加されるという見え方）

| ベンチマーク | OpenGL ES version |
| ---------------- | ----------- |
| T-Rex | 2.0 |
| Manhattan | 3.0 |
| Manhattan 3.1 | 3.1 |
| Car Chase | 3.1 + AEP (Android Extension Pack) |

そのため、そのAndroid端末が対応している OpenGL ESバージョン によって実行出来るベンチマークが変わります。実行できない場合は後のベンチマーク選択画面で選択出来ない状態となります。

※ Aztec Ruins は路線が変わった様なので省略（APIのバージョンではなくマルチAPIでのベンチマークというニュアンスになった模様）

## ベンチマークインストール

前回ビルドを行ったapkファイルをAndroid端末にインストールします。  
Android端末側は開発者モードになっていてビルド用PCとadb接続出来ているとします。  
なお、adbコマンド実行時は Git Bash でなく Windowsターミナル を使用した方が（何かと）トラブルが起きずに済みます。

```cmd
adb install gfxbench-5.1.5+corporate.apk
```

## ベンチマーク実行

Android端末上からGFXBenchのアイコンをクリックし起動します。  
初回起動時は「Pushed data not found」という表示が出ます。  
![Pushd_data_not_found](/img/blogs/2026/0911_gfxbench_2/Pushd_data_not_found.jpg)

「OK」を選択してapkバンドルのデータをアプリデータ領域にコピーをします。  
:::info
前回も触れましたが初回起動時にこのコピー分だけアプリサイズが増える事になります。  
手動でデータを配置する手順も上記表示の様に案内されます。  
:::

起動すると、ベンチマークの初期画面が表示されます。  
![Title](/img/blogs/2026/0911_gfxbench_2/Title.jpg)

そこで "テスト選択" ボタンを押すと テスト選択 の画面になります。  
![Select](/img/blogs/2026/0911_gfxbench_2/Select.jpg)

実行するベンチマークとしては筆者の思い入れより以下の2つとします。

- T-Rex
- Manhattan

また、それぞれについて、オンスクリーン版とオフスクリーン版があります。  
オンスクリーン版では実際に画面にベンチマークが描画されて実行されます。そのためAndroid端末の実際の画面サイズにベンチマークスコアが依存します。  
オフスクリーン版では画面に描画されず（進行がわかる程度の描画はあり）オフスクリーンサイズ固定で実行されます。そのためAndroid端末の実際の画面サイズに依存せずベンチマークスコアを得る事が出来ます。  
Android端末を横断的に（画面サイズに依存せず）GPU性能を比較したい場合はこちらを選択します。  

最初起動すると全ベンチマークがチェックされた状態になっているので、実行したいベンチマークのみをチェックし "開始" ボタンを押します。  
（高レベルテスト、低レベルテスト といったカテゴリでチェックを外すと一括でチェックを外せるので便利です）

## ベンチマーク実行結果

実際にオフスクリーン版を実行してみます。  
（画面描画を見たい方はオンスクリーン版でお楽しみください）  
実行するAndroid端末はAndroidバージョンが(比較的)新しいものを手元のコレクションから見繕ってみます。  

なお、今回対象とするAndroid端末のスペック帯はベンチマークスコアが最大でも 100台半ば 程度のfpsのものとします。  
（ハイスペックな端末にとってはいまや T-Rex/Manhattan ベンチマークは軽い部類となってしまいましたので...。  
その場合はもっと重いベンチマークが適していると思われます）

以下、実測した結果例です。ベンチマークスコアはオフスクリーン版のfps値です。  
:::alert
あくまで **「筆者の環境および測定時点における一例」** であり、同様のGUP、手順で測定された場合でも、環境によって異なる結果となる可能性がある点をご了承ください。
:::

| GPU | SoC | Driver version | Android version | T-Rex score | Manhattan score |
| ---------------- | ------------------------ | ---- | ---- | ---- | ---- |
| ARM Mali G57 MC1 | Allwinner A537 | OpenGL ES 3.2 v1.r51p0-00eac0.26a7a06524af59d6533aad5e5bab3098 | 15 | 19 | 13 |
| ARM Mali G57 MC2 | Mediatek Helio G99 | OpenGL ES 3.2 v1.r32p1-01eac0.394145956bc7cd8e697b330aba11e3d3 | 13 | 57 | 37 |
| ARM Mali G57 MC3 | Mediatek Dimensity 800U | OpenGL ES 3.2 v1.r32p1-01eac0.461cd25a1c7796cc6d3ad05234c053ac | 12 | 85 | 54 |

偶然にも:-) core数(MC)違いのGPUですが、core数が多いもの程いい結果となりました（それはそう）。  
もう少し比較をするためにベンチマークスコアをcore数で割ってみます。

| GPU | T-Rex/core score | Manhattan/core score |
| ------ | ---- | ---- |
| ARM Mali G57 MC1 | 19 | 13 |
| ARM Mali G57 MC2 | 28.5 | 18.5 |
| ARM Mali G57 MC3 | 28.3 | 18 |

今回のAndroid端末のMC2, MC3のものは同じ傾向（同等MC1想定値からの比例関係）である事がわかります。  
その値からすると今回のAndroid端末のMC1のものは控えめな値である事もわかります。  
低スペック帯なのでそこまで周波数が高くない？等の理由で控えめなのかもしれません。

## おわりに

今回はGFXBenchの内容紹介と、前回ビルドしたGFXBenchを実際に実行してベンチマークスコアを確認しました。  
次回は今回実行したAndroid端末よりも古いAndroidバージョンで実行したい場合の手順を取り上げます。  

## ライセンスおよび免責事項

本記事に掲載しているスクリーンショット、検証結果は、BSD 3-Clause Licenseのもとで公開されている [Kishonti-Opensource/gfxbench](https://github.com/Kishonti-Opensource/gfxbench) のソフトウェアおよびアセットを利用・引用したものです。

- **Original Copyright:** (c) 2005–2025 Kishonti Ltd.
- **License:** [BSD 3-Clause License](https://github.com/Kishonti-Opensource/gfxbench)
- **画像等の権利について:** 記事内で引用しているGFXBenchのベンチマーク実行画面およびUIの著作権は、原著作者であるKishonti Ltd.に帰属します。

**【免責事項】**  
本記事に掲載している手順、ベンチマークスコア等の測定結果は、特定の検証環境における現状のまま（AS IS）のものであり、その正確性、安全性、再現性を保証するものではありません。  
本情報の利用や検証の実行により生じた直接的・間接的な損害について、筆者および株式会社豆蔵は一切の責任を負いません。内容を十分にご確認の上、ご自身の責任においてご利用ください。
