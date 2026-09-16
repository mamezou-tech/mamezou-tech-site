---
title: オープンソース版GFXBenchをAndroidで動かす（4）オールド実行編
author: kazuya-iwamoto
date: 2026-10-02
tags: [GFXBench, android, gpu]
---

## はじめに

GFXBenchというGPUベンチマークソフトを取り上げたシリーズの4回目です。  
前回で古いAndroidバージョン対応のビルドが行えました。  
今回は実際に古いAndroidバージョンで実行してベンチマークスコアを確認してみます。

## ベンチマーク実行結果

実行までの手順は今までと変わらないので、早速結果からです。  

実行するAndroid端末はAndroidバージョンが古いものを手元のコレクションから見繕ってみます。  

目標は SdkVersion:'21' (Android5.0) だったのですが、手元のAndroid端末の都合上、SdkVersion:'22' (Android5.1) までとなりました。

以下、実測した結果例です。ベンチマークスコアはオフスクリーン版のfps値です。  
:::alert
あくまで **「筆者の環境および測定時点における一例」** であり、同様のGPU、手順で測定された場合でも、環境によって異なる結果となる可能性がある点をご了承ください。
:::

| GPU | SoC | Driver version | Android version | T-Rex score | Manhattan score |
| ------ | --------- | ---------------------- | ----- | ---- | ---- |
| Adreno 418 | Snapdragon 808 | OpenGL ES 3.1 V@103.0 | 5.1.1 | 34 | 15 |
| Kepler GK20A | Tegra K1 | OpenGL ES 3.2 NVIDIA 361.00 | 6.0.1 | 66 | 32 |
| Kepler GK20A | Tegra K1 (Denver) | OpenGL ES 3.1 NVIDIA 343.00 | 7.1.1 | 63 | 30 |
| Maxwell GM20B | Tegra X1 | OpenGL ES 3.2 NVIDIA 361.00 | 8.1.0 | 109 | 59 |

上記 Tegra X1 のスコア は Pixel C というタブレットのものです。携帯用のためか低い値となっている様で、確か据え置き用のAnddroid端末の SHIELD だと T-Rex/Manhattan = 120/60 オーダーのスコアだったかと思います。  

この Tegra K1 のスコア T-Rex/Manhattan = 60/30 と Tegra X1 のスコア 同 120/60 のオーダーが長らく私の中で比較する際の基準のスコアとなっていました。  

:::info
Tegra K1の SHIELDタブレット で実際にサンプル（UnrealEngine、Unity等）を動かしたりゲームをしたりの感触より。覚えやすい値だったというのもあります。  
時代的に仕方ないですが、このあたりのタブレットがメモリ2GBでなく4GB積んでいれば今でも普段使いしていたのに...と惜しく思います。
:::

スマートフォン/タブレットを見る時はまずは Tegra K1 のスコア位あれば十分と見ていたものでした。Tegra X1を超えようものならもうえらい事です（※個人の感想です）。

今回はGPU違いですがオフスクリーン版の結果なのでそのまま比較出来ます。ただGPUの FLOPS (Floating-point Operations Per Second) も考慮にいれるとまた違った比較が行えます。次回以降に機会があれば触れてみたいと思います。

以下スコア以外の余談です。  
・その1．ビルド時に CUDA Toolkit が必要だった件ですが、Tegra K1 で無事CUDA情報が表示されていました。Android版でまったく無駄という訳でもなかった様です。例はこれ位かもですが。  
・その2．今回の古いバージョン5.1.1のAndroid端末でも、Car Chase（OpenGL ES 3.1 + AEP）および Aztec Ruins（OpenGL ES 3.1）までも実行が可能でした。  
Androidバージョン5.0から OpenGL ES 3.1 + AEP 対応が始まっていたので確かに可能ではあるのですが、実際に描画される画、fpsも低く健気に動く姿に目頭が熱くなる思いでした。
こんな昔からきちんと頑張ってくれていたのだなと...。

## おわりに

今回は前回ビルドした古いAndroidバージョン用のGFXBenchを実際に実行してベンチマークスコアを確認しました。  

この記事をお読みの方の中にも、古いAndroid端末を眠らせたままにしている方は多いかもしれません。  
久しぶりに取り出して、どこまで頑張れたのかチャレンジしてみてはいかがでしょうか。  
より古いAndroidバージョン、より多くのベンチマーク種類の実行、より低いスコアを出せた方が優勝！です。

## ライセンスおよび免責事項

本記事に掲載しているスクリーンショット、検証結果は、BSD 3-Clause Licenseのもとで公開されている [Kishonti-Opensource/gfxbench](https://github.com/Kishonti-Opensource/gfxbench) のソフトウェアおよびアセットを利用・引用したものです。

- **Original Copyright:** (c) 2005–2025 Kishonti Ltd.
- **License:** [BSD 3-Clause License](https://github.com/Kishonti-Opensource/gfxbench)
- **画像等の権利について:** 記事内で引用しているGFXBenchのベンチマーク実行画面およびUIの著作権は、原著作者であるKishonti Ltd.に帰属します。

**【免責事項】**  
本記事に掲載している手順、ベンチマークスコア等の測定結果は、特定の検証環境における現状のまま（AS IS）のものであり、その正確性、安全性、再現性を保証するものではありません。  
本情報の利用や検証の実行により生じた直接的・間接的な損害について、筆者および株式会社豆蔵は一切の責任を負いません。内容を十分にご確認の上、ご自身の責任においてご利用ください。
