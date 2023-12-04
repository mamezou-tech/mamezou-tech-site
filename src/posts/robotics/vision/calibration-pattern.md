---
title: OpenCVで使用できるキャリブレーションマーカーの紹介
author: shitnaro-matsui
date: 2023-12-04
---

# はじめに
今回は画像処理ライブラリOpenCVで使用できるカメラキャリブレーション用のマーカーについて紹介します。  

OpenCVでカメラを活用するためには、キャリブレーションという作業が必要になることがあります。  
カメラのキャリブレーションによってレンズによる画像の歪みを補正したり、ロボットとカメラの位置関係を計測したり、ステレオカメラを構築したりできますが、キャリブレーションのためには専用のマーカーが必要です。  
OpenCVには標準で検出機能が備わっているキャリブレーションマーカーがいくつかありますので、それらを特色とともに紹介します。  

# カメラのキャリブレーションについて
カメラのキャリブレーションでは、通常以下の3つの要素を計測します。  
- 内部パラメータ：カメラの光学的中心と焦点距離
- 外部パラメータ：カメラの位置姿勢
- レンズの歪曲収差：レンズの歪み

:::info   
各要素についての詳細な説明はWeb上にたくさん情報がありますので今回は省略させていただきます。  
:::

各要素の代表的な用途として、レンズによる画像の歪みを補正したい場合は内部パラメータおよびレンズ歪曲収差が必要になります。  
画像で検出したワークの姿勢をロボット座標に変換したい場合は、外部パラメータが必要になります。  

また測定したい要素によって、使用するキャリブレーションマーカーの要素が異なります。  
内部パラメータやレンズの歪曲収差の計測には、キャリブレーションマーカーの格子点が使用されます。  
<img src="/img/robotics/vision/calib-pattern-plate-grid.png" width="70%">

一方、外部パラメータの計測には、主にキャリブレーションマーカーの姿勢が使用されます。  
<img src="/img/robotics/vision/calib-pattern-plate-pose.png" width="70%">

計測したい内容によって、適切なキャリブレーションマーカーを選択する必要があります。  

# マーカーの種類
代表的なものは以下の4つです。
- CheckerBoard  
- CircleGrid  
- AsymmetryCircleGrid  
- ChArUco  

いずれのマーカーも[calib.io](https://calib.io/pages/camera-calibration-pattern-generator)にて自在なサイズで生成することが出来ます。  

## CheckerBoard
格子模様のマーカーです。  
ChessBoardとも呼ばれます。  
<img src="/img/robotics/vision/calib-pattern-chess.png" width="50%">

```
マーカー仕様
- Rows: 7
- Columns: 7
- Checker Width[mm]: 28
```

最も基本的で有名なキャリブレーションマーカーです。  
内側の格子点がキャリブレーションに使用されます。  
キャリブレーションマーカーの検出結果は以下の通りです。  
![chess-detect](/img/robotics/vision/calib-pattern-chess-detect.png)
OpenCVでは検出できた格子点をこのように色付けして描画できるので、視覚的にもわかりやすいです。  

マーカーをカメラの光軸周りに回転させると、以下のようにマーカー座標軸の原点や向きが一意に定まりません。  
従ってマーカー姿勢が一意に定まらないため、外部パラメータのキャリブレーションには使用できません。  
![chess-pose](/img/robotics/vision/calib-pattern-chess-pose.png)  
X軸を赤、Y軸を緑、Z軸を青として座標軸を描画しています。  

## CircleGrid
格子状に並んだドットのマーカーです。  
<img src="/img/robotics/vision/calib-pattern-circle-grid.png" width="50%">

```
マーカー仕様
- Rows: 7
- Columns: 7
- Circle Spacing[mm]: 28
- Diameter[mm]: 16
```

各サークルの重心点が格子点としてキャリブレーションに使用されます。  
マーカーの検出結果は以下の通りです。  
![circle-detect](/img/robotics/vision/calib-pattern-circle-detect.png)  

マーカーがカメラに対して傾いた場合、サークルドットの形状が楕円になるだけで各ドットの重心点の位置はほとんど変化しません。  
なのでChessBoardと比較してCircleGridの方が精度の良い検出ができると言われています。  

こちらもマーカーをカメラの光軸周りに回転させるとマーカー姿勢が一意に定まらないので、外部パラメータのキャリブレーションには使用できません。  
![circle-pose](/img/robotics/vision/calib-pattern-circle-pose.png)  

## Asymmetry-CircleGrid
斜め格子状にドットが並んだマーカーです。  
<img src="/img/robotics/vision/calib-pattern-asym-circle-grid.png" width="50%">

```
マーカー仕様
- Rows: 4
- Columns: 9
- Circle Spacing[mm]: 28
- Diameter[mm]: 16
```

CircleGridとの違いは、マーカーが非対称なのでマーカー姿勢が一意に定まる点です。  
なので内部パラメータ、外部パラメータ、レンズの歪曲収差、全てのキャリブレーションに使用できます。  
![asyme-circle-pose](/img/robotics/vision/calib-pattern-asym-circle-pose.png)  

上記例は列数が9と奇数ですが、以下のように列数を偶数にしてしまうと点対称になりマーカー座標軸が一意に定まらないので注意が必要です。
<img src="/img/robotics/vision/calib-pattern-asym-circle-grid88.png" width="50%">

## ChArUco
CheckerBoardとArUcoマーカーを組み合わせたキャリブレーションマーカーです。  
<img src="/img/robotics/vision/calib-pattern-charuco.png" width="50%">

```
マーカー仕様
- Rows: 5
- Columns: 5
- Checker Width[mm]: 40
- Dictionary: DICT_6X6
```

通常のCheckerBoardとしての使用も可能ですが、最大の特徴は散りばめられたArUcoマーカーにあります。  
通常のCheckerBoardではマーカー姿勢が一意に定まりませんが、ChArUcoではArUcoマーカーにより一意に定まります。  
![charuco-pose](/img/robotics/vision/calib-pattern-charuco-pose.png)  
こちらも内部パラメータ、外部パラメータ、レンズの歪曲収差、全てのキャリブレーションに使用できます。  
ただしArUcoマーカーがある関係上、グリッド一辺の長さがそこそこ大きくなってしまうため通常のCheckerBoardと比較して格子点が少ないです。  
なので精度の良い内部パラメータ測定のためにはデータ数を多く取る必要があるので注意しましょう。

またキャリブレーションマーカーの一部が隠れていても、検出されたArUcoマーカーにより隠れを補間しての姿勢推定が可能です。  
![charuco-occlusion](/img/robotics/vision/calib-pattern-charuco-occlusion.png)  
カメラとロボットの外部パラメータを計測するときには、ロボットの先端にキャリブレーションマーカーを取り付けてカメラで撮影する手法を取ることがあります。  
その時、ロボットアーム自体がカメラの視界の妨げとなりキャリブレーションマーカーの一部が隠れてしまうことがあるのですが、ChArUcoを用いればそのような場合でも問題なくキャリブレーションできるので重宝しています。  

## 各マーカー機能のまとめ

各マーカーのキャリブレーションが出来る対象についてまとめました。  

|マーカー|内部パラメータ・レンズの歪曲収差|外部パラメータ| 
|:---:|:---:|:---:| 
|CheckerBoard|◯|×| 
|CircleGrid|◎|×| 
|Asymmetry-CircleGrid|◎|◯| 
|ChArUco|◯|◎| 

◎：特に適しているため推奨  
◯：キャリブレーション可  
×：キャリブレーション不可  

# おわりに　

今回はOpenCVで使用できるキャリブレーションマーカーについて紹介しました。  
OpenCVでカメラのキャリブレーションを行いたいがどのようなマーカーを使用すれば良いかわからない、といった方々の助けになれば幸いです。