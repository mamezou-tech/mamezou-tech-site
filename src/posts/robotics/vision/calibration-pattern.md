---
title: OpenCVで使用できるキャリブレーションマーカーの紹介
author: shitnaro-matsui
date: 2023-11-27
---

# はじめに
今回は画像処理ライブラリOpenCVで使用できるカメラキャリブレーション用のマーカーについて紹介します。  

OpenCVでカメラを活用するためには、キャリブレーションという作業が必要になることがあります。  
カメラのキャリブレーションによってレンズの歪みを計測したり、ロボットとカメラの位置関係を計測したりできますが、その作業のためにはキャリブレーションマーカーが必要です。  
OpenCVには標準で検出機能が備わっているキャリブレーションマーカーがいくつかありますので、それらを特色とともに紹介します。  

# カメラのキャリブレーションについて
カメラのキャリブレーションでは、通常以下の3つの要素を計測します。  
- 内部パラメータ：カメラの光学的中心と焦点距離
- 外部パラメータ：カメラの位置姿勢
- レンズの歪曲収差：レンズの歪み

各項目についての詳細な説明はWeb上にたくさん情報がありますので今回は省略させていただきます。  
代表的な用途として、レンズの歪みによる画像の歪みを補正したいのであれば内部パラメータおよびレンズ歪曲収差を計測します。  
ステレオカメラを構築したり、画像検出したワークの姿勢をロボット座標に変換したい、といった用途では、外部パラメータの計測が必要になります。  

内部パラメータやレンズの歪曲収差の計測には、キャリブレーションマーカーの格子点を使用します。  
![marker-grid](/src/img/robotics/vision/calib-pattern-plate-grid.png)  

外部パラメータの計測には、主にキャリブレーションマーカーの姿勢を使用します。  
![marker-pose](/src/img/robotics/vision/calib-pattern-plate-pose.png)  

計測したい内容によって、適切なキャリブレーションマーカーを選択する必要があります。  

# マーカーの種類
代表的なものは以下の4つです。
- CheckerBoard  
- CircleGrid  
- ChArUco  
- AsymmetryCircleGrid  

いずれのマーカーも[calib.io](https://calib.io/pages/camera-calibration-pattern-generator)にて自在なサイズで生成することが出来ます。  

## CheckerBoard
格子模様のマーカーです。  
ChessBoardとも呼ばれます。  
![chess](/src/img/robotics/vision/calib-pattern-chess.png)  

```
マーカー仕様
- Rows: 7
- Columns: 7
- Checker Width[mm]: 28
```

最も基本的で有名なキャリブレーションマーカーです。  
内側の格子点がキャリブレーションに使用されます。  
![chess-detect](/src/img/robotics/vision/calib-pattern-chess-detect.png)  
OpenCVでは検出できた格子点をこのように描画できるので、視覚的にもわかりやすいです。  

マーカーをカメラの光軸周りに回転させると姿勢が一意に定まらないので、姿勢検出には使用できません。  
![chess-pose](/src/img/robotics/vision/calib-pattern-chess-pose.png)  
描画した座標軸に付きましては、X軸が赤、Y軸が緑、Z軸が青です。  

## CircleGrid
格子状に並んだドットのマーカーです。  
![circle-grid](/src/img/robotics/vision/calib-pattern-circle-grid.png)  

```
マーカー仕様
- Rows: 7
- Columns: 7
- Circle Spacing[mm]: 28
- Diameter[mm]: 16
```

各サークルの重心点が格子点としてキャリブレーションに使用されます。  
![circle-detect](/src/img/robotics/vision/calib-pattern-circle-detect.png)  

サークルドットがカメラに対して傾いた場合、ドットの円形状が楕円になるだけで各ドットの重心点の位置はほとんど変化しません。  
なのでChessBoardと比較してCircleGridの方が精度の良い検出ができると言われています。  

こちらもマーカーをカメラの光軸周りに回転させると姿勢が一意に定まらないので、姿勢検出には使用できません。  
![circle-pose](/src/img/robotics/vision/calib-pattern-circle-pose.png)  

## Asymmetry-CircleGrid
斜め格子状に並んだドットのマーカーです。  
![asyme-circle-grid](/src/img/robotics/vision/calib-pattern-asym-circle-grid.png)  

```
マーカー仕様
- Rows: 4
- Columns: 9
- Circle Spacing[mm]: 28
- Diameter[mm]: 16
```

CircleGridとの違いは、マーカーが非対称なので姿勢が一意に定まる点です。  
![asyme-circle-pose](/src/img/robotics/vision/calib-pattern-asym-circle-pose.png)  

上記例は列数が9と奇数ですが、以下のように列数を偶数にしてしまうと点対称になり姿勢が一意に定まらないので注意が必要です。  
![asyme-circle-grid](/src/img/robotics/vision/calib-pattern-asym-circle-grid88.png)  

## ChArUco
CheckerBoardとArUcoマーカーを組み合わせたキャリブレーションマーカーです。  
![charuco](/src/img/robotics/vision/calib-pattern-charuco.png)  

```
マーカー仕様
- Rows: 5
- Columns: 5
- Checker Width[mm]: 40
- Dictionary: DICT_6X6
```

通常のCheckerBoardとしての使用も可能ですが、最大の特徴は散りばめられたArUcoマーカーにあります。  
通常のCheckerBoardでは姿勢が一意に定まりませんが、ArUcoマーカーを検出することにより姿勢が一意に定まります。  
![charuco-pose](/src/img/robotics/vision/calib-pattern-charuco-pose.png)  

また検出されたArUcoマーカーにより、キャリブレーションマーカーの一部が隠れていてもマーカーを補間して姿勢推定が可能です。  
![charuco-occlusion](/src/img/robotics/vision/calib-pattern-charuco-occlusion.png)  

カメラとロボットの外部パラメータを計測するときには、ロボットの先端にキャリブレーションマーカーを取り付けてカメラで撮影する手法を取ることがあります。  
その時、ロボットアーム自体がカメラの視界の妨げとなりキャリブレーションマーカーの一部が隠れてしまうことがあるのですが、ChArUcoを用いればそのような場合でも問題なくキャリブレーションできるので重宝しています。  

## まとめ

各マーカーのキャリブレーション出来る項目についてまとめました。  

|マーカー|内部パラメータ・歪み係数|外部パラメータ| 
|:---:|:---:|:---:| 
|CheckerBoard|◯|×| 
|CircleGrid|◎|×| 
|Asymmetry-CircleGrid|◎|◯| 
|ChArUco|◯|◎| 

◎：特に適しているため推奨  
◯：使用可  
×：使用不可  

# おわりに　

今回はOpenCVで使用できるキャリブレーションマーカーについて紹介しました。  
OpenCVでカメラのキャリブレーションを行いたいがどのようなマーカーを使用すれば良いかわからない、といった方々の助けになれば幸いです。