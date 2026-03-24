---
title: LeRobot × SO-101 で始めるマルチモーダルAI入門 - 技術紹介と環境構築編
author: christian-takashi-nakata
date: 2026-03-25
tags: [ロボット, AI, マルチモーダルAI, LeRobot, SO-101]
image: true
---

## こんなひとにおすすめ

- マルチモーダルAI、フィジカルAI、模倣学習、強化学習などロボティクス分野のAIに興味はあるが、どこから手をつけたらいいのか分からない方
- 実機のロボットの価格が高くて試せないと感じている方
- 手を動かして学びたいが、低コストで始めたい方

これらに該当する方に本記事をおすすめします。

## はじめに

本記事では、オープンソースプロジェクトである LeRobot とオープンソースのアームロボットである SO-101 を題材に、マルチモーダル AI に関する技術紹介と環境構築の手順を解説します。  
最終的なゴールは、片方のアームを動かすともう片方のアームが同じ動作を追従する動作を再現することです（下記GIF参照）。

![lerobot_demo](/src/img/robotics/lerobot/lerobot_demo.gif)

## 用語の説明

### マルチモーダルAI とは

従来のロボティクス開発では、ロボット本体、カメラ、通信規格など複数の技術（モダリティ）が個別に動作し、出力されるデータ形式も異なるため、それらを統合して1つのシステムとして運用するのは容易ではありませんでした。  

近年、Transformer 系モデルなどの進展により、画像・音声・テキスト・センサー値など複数モダリティを統合して扱う「マルチモーダルAI」の研究・実装が進んでおり、異なるデータ形式の扱いや統合が以前より容易になっています。これに伴い、ロボティクス領域では前述の問題点の解消が期待され、マルチモーダルAIを活用した開発が増えつつあります。  

:::info  
似たような用語として「フィジカルAI」が存在します。こちらはロボットや物理世界での学習・意思決定に焦点を当てる用語で、マルチモーダルAIと重なる部分が多いですが、本記事では区別せず「マルチモーダルAI」として扱います。  
:::

### LeRobot とは

公式リポジトリ：[LeRobot](https://github.com/huggingface/lerobot)

LeRobot は Hugging Face が公開しているオープンソースのロボティクスライブラリで、実ロボット向けのモデル、データセット、ツールを提供しています。  
本記事では LeRobot をインストールし、最終的に SO-101 を動作させるための手順を解説します。

### SO-101 とは

公式リポジトリ：[SO-101](https://github.com/TheRobotStudio/SO-ARM100)

| ![so101_follower](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/lerobot/SO101_Follower.webp) | ![so101_leader](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/lerobot/SO101_Leader.webp) |
|---|---|

<img src="https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/lerobot/SO101_Follower.webp" alt="Left aligned" style="float: left; margin: 0 15px 15px 0;">

<!-- Right aligned with text wrap -->
<img src="https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/lerobot/SO101_Leader.webp" alt="Right aligned" style="float: right; margin: 0 0 15px 15px;">

SO-101 は RobotStudio と Hugging Face が共同で開発した、低コストのオープンソース・ロボットアームで、ロボティクス分野への参入ハードルを下げることを目的としています。

SO-101 は「Leader（先導者）」と「Follower（従者）」の2台のロボットアームで構成されます。一般的な利用では Leader をユーザーが手動で操作してデータ収集を行い、Follower はその記録や学習済みモデルに基づいて同じ動作を再現することを想定しています。

本記事では SO-101 の入手方法と、LeRobot で動かす際に必要な手順を解説します。

## 環境構築方法

本記事では SO-101 と LeRobot を用いた、環境構築の手順を解説します。

## 動作環境

本記事では環境構築の手順に重点を置くため詳細な環境要件は簡略化しますが、LeRobot の多くのチュートリアルが CLI 操作を前提とし、また学習に PyTorch を用いる点から、OS は Linux または macOSを 推奨します。  

:::alert:GPU に関して  
将来的に LeRobot と SO-101 で学習を行うのであれば、VRAM容量が 8GB 以上の GPU も必要となります。  
:::  

:::info:あると便利なもの  
本記事の手順を遂行するのに必ずしも必要ありませんが、以下の物があると便利です：

- 2口以上の電源タップ：2台のロボットアームへの電源供給に必要なため
- 2口以上で電源供給可能な USB3.0 ハブ：2台のロボットアームをPCに接続するため
- タックシール：複数のモーターを管理しやすくするため
:::

### SO-101 の環境構築

#### SO-101 の印刷（もしくは購入）

SO-101 のハードウェア構成は [公式リポジトリ](https://github.com/TheRobotStudio/SO-ARM100) で公開されており、リポジトリの3Dデータを使ってパーツを3Dプリントするか、リポジトリで案内されている [公認販売サイト](https://github.com/TheRobotStudio/SO-ARM100) からパーツキットを購入して、Follower と Leader の両アームを組み立てられます。

注意点として、公式リポジトリで入手できるのは主に外装・機構パーツで、サーボモーターなどの駆動部品は別途用意する必要があります。モーター購入時は公式リポジトリ内の [Parts For Two Arms (Follower and Leader Setup):](github.com/TheRobotStudio/SO-ARM100?tab=readme-ov-file#parts-for-two-arms-follower-and-leader-setup) の記載を参照するか、公認販売元のキットを購入してください。

参考として、筆者の場合は公式リポジトリで紹介されていた秋月電子通商のサイトから、以下の2つのキットを購入しました。また、説明の整合性を図るために、これらのパーツを基準として手順を解説します。

- [[131169]SO-101 オープンソースロボットアームキット Pro版](https://akizukidenshi.com/catalog/g/g131228)
- [[131222]SO-101 オープンソースロボットアームキット 3Dプリントパーツ](https://akizukidenshi.com/catalog/g/g131222)

#### SO-101 の組み立て

前述でも触れましたが、SO-101 は Leader と Follower の2台のロボットアームで構成されるため、一部の手順が異なります。本記事では

##### 1. モーター   
組み立ては公式サイトのこれかこれを参照してください

## LeRobot の環境構築方法

LeRobot の環境構築方法は Hugging Face の [Installation] ページを参照しているため、重要な手順に絞って解説します。

### 0. 【任意】conda 系のパッケージがインストールされていない場合

LeRobot は複数の Python パッケージを扱うため、Conda を用いて仮想環境を構築することを勧めている。そのため、Conda がインストールされていない場合は下記コマンドでインストールすること：

```bash
wget "https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-$(uname)-$(uname -m).sh"
bash Miniforge3-$(uname)-$(uname -m).sh
```

### 1. 仮想環境構築

1. Conda で仮想環境を構築する

    ```bash
    conda create -y -n lerobot python=3.12
    ```

2. Conda の仮想環境をアクティブする

    ```bash
    conda activate lerobot
    ```

3. `ffmpeg` を仮想環境にインストールする
   
    ```bash
    conda install ffmpeg -c conda-forge
    ```

    LeRobot の現在のバージョンでは、`ffmpeg` のバージョン 8.x に対応していないので、前のコマンドでインストールされた `ffmpeg` のバージョンを確認します：

    ```bash
    ffmpeg -version
    ```

    このとき、`ffmpeg` のバージョン 8.x になっていれば、下記コマンドで `ffmpeg` のバージョンをダウングレードします：

    ```bash
    conda install ffmpeg=7.1.1 -c conda-forge
    ```

### 2. LeRobot をインストールする

LeRobot はリポジトリのソース、もしくは PyPl からインストール出来ます。将来的に個人開発を行いたい場合は、コードの編集が可能なソースからのインストールを推奨します。

リポジトリのソースからインストールする場合：
```bash
git clone https://github.com/huggingface/lerobot.git
cd lerobot
# 編集可能モードで Conda 環境にインストールする
pip install -e .
```

PyPl からインストールする場合：
```bash
pip install lerobot
```

---

```bash
lerobot-setup-motors \
    --robot.type=so101_follower \
    --robot.port=/dev/ttyACM0
lerobot-setup-motors \
    --teleop.type=so101_leader \
    --teleop.port=/dev/ttyACM1

lerobot-calibrate \
    --robot.type=so101_follower \
    --robot.port=/dev/ttyACM0 \
    --robot.id=my_awesome_follower_arm
    
lerobot-calibrate \
    --teleop.type=so101_leader \
    --teleop.port=/dev/ttyACM1 \
    --teleop.id=my_awesome_leader_arm
    
    
lerobot-teleoperate \
    --robot.type=so101_follower \
    --robot.port=/dev/ttyACM0 \
    --robot.id=my_awesome_follower_arm \
    --teleop.type=so101_leader \
    --teleop.port=/dev/ttyACM1 \
    --teleop.id=my_awesome_leader_arm
```

参考リンク：
- https://github.com/TheRobotStudio/SO-ARM100
- https://huggingface.co/docs/lerobot/installation
- https://huggingface.co/docs/lerobot/so101
- https://qiita.com/tatsuya1970/items/3f04c9c6d21744190f41
- https://huggingface.co/docs/lerobot/il_robots
- https://note.com/shu127/n/n6551f1aed0e8
- https://huggingface.co/docs/lerobot/installation