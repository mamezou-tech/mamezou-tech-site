---
title: Rancher Desktop 紹介
author: shigeki-shoji
date: 2022-01-29
tags: [k8s, container]
---

つい先日 (2022年1月21日) に、[lima 紹介](/blogs/2022/01/21/lima/) という記事を書いたばかりですが、Mac (M1/Intel) と Windows のどちらにも対応し (さらに Linux にも)、それぞれ Lima と WSL2 を利用してコンテナランタイムを実行する、[Rancher Desktop](https://rancherdesktop.io/) がついに v1.0.0 に到達したというニュースを受け取りました。

Rancher Desktop では、Rancher らしく、Kubernetes には、以前の[記事](/blogs/2022/01/03/dapr-on-jetson-nano-with-k3s/) でも紹介した [k3s](https://k3s.io/) を利用します。

# Mac へのインストール

Mac でのインストールですが、ARM の M1 チップ搭載の場合でも、インテルチップ搭載の場合でも、同様に [Homebrew](https://brew.sh/index_ja) を使うと楽にインストールできます。

```shell
brew install --cask rancher
```

# Windows へのインストール

Windows の場合は [Rancher Desktop サイト](https://rancherdesktop.io/) からインストーラをダウンロードして行ってください。

# Linux

Linux へもインストールできるようですが、私は試していませんのでここでは割愛します。

# まとめ

まだ使い始めたばかりではありますが、セットアップの容易さはとてもいいなと思っています。
