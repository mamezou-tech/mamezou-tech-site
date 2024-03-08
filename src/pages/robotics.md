---
title: ロボット
description: ロボットシステム開発の技術紹介
date: git Last Modified
icon: https://api.iconify.design/uil/robot.svg?color=%23730099&height=28
---

弊社のロボットシステム開発でこれまで取り組んできた技術に関する記事をご紹介していきます。

ロボットといっても様々な機構のものが存在しますがここでは現在市場で最も普及している垂直多関節ロボットを扱います。
垂直多関節型は人間の腕の構造に近いスタイルのロボットで弊社オリジナルの協働ロボット[Beanus2](https://www.mamezou.com/services/embedded/robot#mzrobot)も垂直多関節型のロボットです。
このロボットにハンドを取り付けることでワークのピック＆プレースといった仕事が行えるようになります。
また近年ではカメラ画像から画像処理でワークを認識してピック位置を検出するビジョンソフトも多くの現場で採用されています。
これらのロボット制御、ハンド、ビジョンといった要素技術を中心に記事を充実させていく予定ですので、ご参考いただければ幸いです。

## ロボット工学

主に工場や店舗で使われるロボットマニピュレータ制御の基礎技術をまとめてます。

- [ロボットマニピュレータ制御のアルゴリズム](/robotics/manip-algo/manip-algo/)

## ユニバーサルロボット

[Universal Robots 社](https://www.universal-robots.com/)の協働ロボットである UR シリーズは様々な可搬重量に対応したラインナップが用意されています。
6 つのジョイント全てで ±360 度の可動範囲を有するといった特徴があります。
外部からロボットを制御するための API を数多く公開しており、柔軟な構成でシステムを構築できます。
弊社でも UR3 と UR5e を所持しており、研究開発やロボット SI で使用しています。
第 7 回ロボデックスでも UR による[食品盛り付けロボットシステム](https://www.mamezou.com/services/embedded/robot#douga)を展示致しました。

ここではそんな UR に関する記事をまとめていきます。

- [UR のシミュレータ環境を Docker で構築する](/robotics/ur/ursim-docker/)
- [「Universal Robots」の UR+で URCap 開発](/blogs/2023/04/11/urcap-dev/)

## 産業用ネットワーク・通信

- [Open62541 を使用した OPC-UA サーバ開発](/robotics/opcua/opcua_open62541_server/)
- [Open62541 を使用した OPC-UA クライアント開発](/robotics/opcua/opcua_open62541_client/)
- [C++でProtocol Buffersを使ってみる](/blogs/2024/03/08/protocol-buffers-cpp/)


## ロボットビジョン

### 2D カメラ

- [CCTag マーカーを使ってみた](/robotics/vision/cctag/)
- [OpenCV で使用できるキャリブレーション用パターンの紹介](/robotics/vision/calibration-pattern/)

### 3D カメラ

弊社のロボットシステム開発で使用したことのある 3D カメラに関する記事をまとめていきます。

- [RealSense D435f で Disparity Shift を調整した話](/robotics/vision/realsense-d435f-disparity-shift/)


## GUI

- [Blockly によるビジュアルプログラミングの紹介](/robotics/gui/visual-programing-with-blockly/)
- [QtWidgets vs QtQuick](/robotics/gui/qtwidget-vs-qtquick/)


## ROS

- [ROS2 の UI 開発に Tauri を使用した話](/robotics/ros/ros2-tauri/)
