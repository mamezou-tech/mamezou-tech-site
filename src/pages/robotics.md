---
title: ロボット
description: ロボットシステム開発の技術紹介
date: git Last Modified
icon: https://api.iconify.design/uil/robot.svg?color=%23730099&height=28
---

弊社のロボットシステム開発でこれまで取り組んできた技術に関する記事をご紹介してゆきます。

ロボットといっても様々な機構のものが存在しますがここでは現在市場で最も普及している垂直多関節ロボットを扱います。
垂直多関節型は人間の腕の構造に近いスタイルのロボットで弊社オリジナルの協働ロボット[Beanus2](https://www.mamezou.com/services/embedded/robot#mzrobot)も垂直多関節型のロボットです。
このロボットにハンドを取り付けることでワークのピック＆プレースといった仕事が行えるようになります。
また近年ではカメラ画像から画像処理でワークを認識してピック位置を検出するビジョンソフトも多くの現場で採用されています。
これらのロボット制御、ハンド、ビジョンといった要素技術を中心に記事を充実させていく予定ですので、ご参考いただければ幸いです。

## ユニバーサルロボット

[Universal Robots社](https://www.universal-robots.com/)の協働ロボットであるURシリーズは様々な可搬重量に対応したラインナップが用意されています。
6つのジョイント全てで±360度の可動範囲を有するといった特徴があります。
外部からロボットを制御するためのAPIを数多く公開しており、柔軟な構成でシステムを構築できます。
弊社でもUR3とUR5eを所持しており、研究開発やロボットSIで使用しています。
第7回ロボデックスでもURによる[食品盛り付けロボットシステム](https://www.mamezou.com/services/embedded/robot#douga)を展示致しました。

ここではそんなURに関する記事をまとめていきます。

- [URのシミュレータ環境をDockerで構築する](/robotics/ur/ursim-docker/)
- [「Universal Robots」のUR+でURCap開発](/blogs/2023/04/11/urcap-dev/)

## ロボットビジョン

### 3Dカメラ

弊社のロボットシステム開発で使用したことのある3Dカメラに関する記事をまとめていきます。

- [RealSense D435fでDisparity Shiftを調整した話](/robotics/vision/realsense-d435f-disparity-shift/)


## GUI

- [Blocklyによるビジュアルプログラミングの紹介](/robotics/gui/visual-programing-with-blockly/)
- [QtWidgets vs QtQuick](/robotics/gui/qtwidget-vs-qtquick/)
