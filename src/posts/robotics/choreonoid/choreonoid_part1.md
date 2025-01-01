---
title: Choreonoidで始めるロボットシミュレーション（その1）
author: hayato-ota
tags: [ロボット, Choreonoid]
date: 2025-01-10
image: true
---

# はじめに
## Choreonoidとは
Choreonoid[^1]は、産業技術総合研究所（AIST）が開発したオープンソースのロボットシミュレーションソフトウェアです。
2025年1月10日の最新バージョンでは下記のOSでの動作をサポートしています。

- Ubuntu Linux
- Windows

:::check
本記事ではUbuntu 22.04を使用します。
:::


[^1]: [Choreonoidとは](https://choreonoid.org/ja/about.html)

元々はロボットの動作振り付けツールとして開発されていたようであり、"Choreograph"（振り付けをする）と"Humanoid"（ヒューマノイド）を組み合わせた名前となっています。

現在は、株式会社コレオノイドにより開発が継続されており、ソースコードは[こちら](https://github.com/choreonoid/choreonoid)[^2]のGitHubで公開されています。

[^2]: [Choreonoid GitHubリンク](https://github.com/choreonoid/choreonoid)

本シミュレータの特徴として、以下の点が挙げられます。

- 動力学シミュレータとして利用可能
- 軽快な動作性能
- プラグインによる高い拡張性
- ROS1およびROS2との連携が可能

筆者は学生時代に本シミュレータを研究で使用しており、特に動力学シミュレータであるGazeboと比較しても、動作の軽快さについては目を見張るものがありました。

本記事では、Choreonoidの魅力について、使用方法やサンプルを交えてご紹介します。


## GitHubリンク
本記事で実装するコードは[こちら](https://github.com/hayat0-ota/choreonoid-simple-controllers/tree/part1)で共有しています。必要に応じてご覧ください。


# 1. 開発環境構築
## 使用ツールのインストール
本記事では下記のツールを使用します。事前にインストールしてください。

- make
- CMake
- git

## 作業用ディレクトリの作成
使用するワークスペースディレクトリを作成します。
本記事ではHomeディレクトリ内に`Chorenoid_ws`という名前のフォルダを作成します。
これ以外のフォルダ名とする場合は、適宜読み替えてください。

```shell
$ mkdir -p ~/Choreonoid_ws
```


## リポジトリのクローン
ワークスペースディレクトリ内にChoreonoidのリポジトリをクローンします。

```shell
$ cd ~/Choreonoid_ws
$ git clone git@github.com:choreonoid/choreonoid.git
```

## 関連ツールのインストール
Choreonoidに関連するツールをインストールします。リポジトリ内に一括でインストールするためのbashファイルが存在するため、それを使用します。

:::alert
実行するファイルはOS毎によって変わります。ファイル名のsuffixに注意してください。
今回はUbuntu22.04に対応するファイルを使用します。
:::

```shell
$ cd ~/Choreonoid_ws/choreonoid/misc/script
$ bash install-requisites-ubuntu-22.04.sh
```


## ビルド
クローンしたソースコード内に入り、CMakeを使用してビルドします。

```shell
# ディレクトリ移動
$ cd ~/Choreonoid_ws/choreonoid

# ビルドシステム生成
$ cmake -S . -B build

# ビルド実行（並列ビルド）
$ cmake --build build --parallel 4
```

## インストール



# 参考資料
- [Choreonoid開発版ドキュメント](https://choreonoid.org/ja/manuals/latest/index.html)
- [Choreonoid研修 RTF 2023年8月24日〜26日 Choreonoid研修資料](https://choreonoid.org/ja/workshop/summar-training-2023.html)