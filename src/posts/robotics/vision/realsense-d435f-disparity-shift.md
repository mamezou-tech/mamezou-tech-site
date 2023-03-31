---
title: RealSense D435fでDisparity Shiftを調整した話
author: masayuki-kono
date: 2023-03-31
---

Intel社のRealSenseシリーズの[D435f](https://www.intelrealsense.com/depth-camera-d435f/)をハンドアイ構成で(ロボットの手先に固定して)ビンピッキング[^1]を行う研究開発を行いました。
その際にRealSenseのカメラパラメータである Disparity Shift を調整してワークの撮像距離の最適化に取り組んだのでご紹介いたします。

[^1]: ばら積みピッキングとも言います。容器内にランダムで積まれたワークをつかむ作業をさします。

D435fは従来の[D435](https://www.intelrealsense.com/depth-camera-d435/)に対してIR(Infrared:赤外線)パスフィルタが追加された3Dカメラです。
D435と同様に赤外線プロジェクタによるアクティブステレオ方式で深度を得ますが、IRパスフィルタにより低ノイズな深度を得られることが特徴です。

## D435fの最小深度距離のカタログ値

D435fでは深度センサの最高解像度(1280x720)において最小深度距離は280mmとなります[^2]。

| 解像度 | D415 | D435f | D455 | D405 |
| ---- | ---- | ---- | ---- | ---- |
| 1280x720 | 450mm | 280mm | 520mm | 100mm |

[^2]: [Intel RealSense D400 Series Product Family Datasheet](https://dev.intelrealsense.com/docs/intel-realsense-d400-series-product-family-datasheet)

:::info
ステレオカメラでは原理上、深度を計測可能な距離範囲が存在します。
ここではこの距離範囲の下限値を最小深度距離(MinZ)、上限値を最大深度距離(MaxZ)と呼ぶこととします。
ちなみにD435fで得られる深度の原点(Depth Start Point)はフロントのカバーガラスの表面からバック側に4.7mmの位置となります[^2]。
この原点から被写体までの深度が計測されることになります。

![](https://i.gyazo.com/ce69783b2fca6f8e2eceafdab56f9a5f.png)
:::

以下の式[^3]の通り、理論上は深度の誤差は被写体までの距離の2乗に比例します。

$\Delta z=\frac{z^2}{b\cdot f}\cdot \Delta d$

- $\Delta z$: 深度の誤差
- z: 被写体までの距離
- b(baseline): 基線長(左右のカメラ間距離)
- f: 焦点距離
- $\Delta d$: 視差の誤差(左右のカメラで検出した特徴点のマッチングの誤差)

[^3]: ここでは導出は割愛しますが、三角測量の原理による視差と深度の関係式において深度を視差で偏微分して求められます。

深度の要求精度はワークの形状や寸法、ハンドの機構(吸着式やチャック式)などに依存しますが、今回は比較的小さなワークを対象としたため、MinZの小さいD435fを選定しています。

[D405](https://www.intelrealsense.com/depth-camera-d405/)の方がMinZは100mmと小さいですが、D405はプロジェクタを搭載していないパッシブステレオ方式の3Dカメラであり、特徴の少ないワークでは視差の誤差が大きくなります。
今回は特徴の少ないワークをピッキングするため、D405は選定対象から除外しています。D405の評価については別の記事でご紹介したいと思います。

:::info
表面に模様や凹凸があれば画像上でこれを特徴として検出してマッチングが可能ですが、今回のワークは表面が平坦で白色(無地)でした。

:::

## Depth Quality Toolで深度のRMSエラーを確認する

[RealSense SDK](https://www.intelrealsense.com/sdk-2/)にはDepth Quality Tool(DQT)という診断ツール[^4]が付属しています。

[^4]: DQTについては[深さの品質テストのためのホワイトペーパー](https://www.intel.co.jp/content/www/jp/ja/support/articles/000026982/emerging-technologies/intel-realsense-technology.html)や[Best Known Methods for Optimal Camera Performance over Lifetime](https://www.intelrealsense.com/best-known-methods-for-optimal-camera-performance-over-lifetime#3.7)を参照下さい。

DQTでは平面に対する深度を元に以下のメトリクスがリアルタイムで表示されます。

- Z Accuracy[%]
  - 与えられた深度の真値(Ground Truth)を用いて深度の精度を求めます。
  - 真値が必要となるためレーザ変位計などが必要となります。
- Plane Fit RMS Error[%]
  - 得られた深度(点群)で平面フィッティングを行い、各点群からこの平面までの垂線の長さで Root Mean Square(RMS) を求めます。

今回は機材の制約で後者のRMSエラーのみを確認しました。
MinZは280mmですが少しマージン設けて300mmの距離で計測します。
RMSエラーは深度に対する割合で表示されるため、平面までの深度値を乗じて物理量(mm)に換算したものも併せて示します。
DQTでは指定したROI(Region of Interest)の範囲内の深度のみを用いてメトリクスを算出するため、複数のROIの条件で確認しています。

| ROI[%] | RMS[%] | RMS[mm] |
| ---- | ---- | ---- |
| 80 | 0.18 | 0.54 |
| 60 | 0.18 | 0.54 |
| 40 | 0.17 | 0.51 |
| 20 | 0.16 | 0.48 |

80%のROIでもRMSエラーが1mmを下回っており、深度のばらつきは比較的少ないですね。
今回は小さなワークを対象としていたため、RMSエラーの改善に向けてここからさらなる追い込みを行いました。

ちなみにRealSenseでは[Post-processing filters](https://dev.intelrealsense.com/docs/post-processing-filters)[^5]という点群に対するフィルタ機能を有しており、その内の以下のフィルタを活用してRMSエラーを小さくできる可能性があります。

- [Spatial Edge-Preserving filter](https://dev.intelrealsense.com/docs/post-processing-filters#spatial-edge-preserving-filter)
- [Temporal filter](https://dev.intelrealsense.com/docs/post-processing-filters#temporal-filter)

ただし、これらは場合によっては適用が難しい場面もあるので今回は使用せずに評価しました。

[^5]: [Depth Post-Processing for Intel® RealSense™ Depth Camera D400 Series](https://dev.intelrealsense.com/docs/depth-post-processing)も参照下さい。

![](https://i.gyazo.com/a7617edd339926fcdb803b74c3e1beef.png)

## Disparity Shiftの調整

ここでやっと Disparity Shift の登場です。

> An alternative approach to reducing the minZ is to use the “Disparity shift” parameter in the advanced mode api.
> Normally the depth sensor is set to generate depth for objects at distances ranging from minZ-to-infinity.
> By increasing the disparity shift from 0 to 128, for example, you will be able to shift that range to a NewMinZ-to-NewMaxZ.
> We normally only recommend doing this when it is known that there will be no objects farther away than MaxZ,
> such as having a depth camera mounted above a table pointing down at the table surface.
> Note that, because of the inverse relationship between disparity and depth,
> MaxZ will decrease much faster than minZ as the disparity shift is increased.
> Therefore, it is advised to not use a larger than necessary disparity shift.
> For example, if using a disparity shift of 128 then the newMaxZ is roughly equal to the original MinZ and the newMinZ is roughly equal to half of the original MinZ.
> Note that the tradeoff in reducing the MinZ this way is that objects at distances farther away than MaxZ will not be seen.

出典: [Tuning depth cameras for best performance](https://dev.intelrealsense.com/docs/tuning-depth-cameras-for-best-performance#move-as-close-as-possible)

RealSenseの深度センサは、デフォルトではMinZから無限遠までの深度を生成します。
Disparity Shift に値を設定することでMaxZが小さくなり、同時にMinZも小さくなります(カタログ値より小さくできます)。
ただし、Disparity Shiftを大きくしてゆくと、MinZよりもMaxZの方が急激に減少するため、深度の計測可能範囲が狭まっていきます。

今回のワークの位置範囲を考慮するとMinZからMaxZまでの幅は100～200mm程度必要であったため、その条件でDisparity Shiftをどこまで大きくできるか検証しました。

Disparity Shiftは、RealSense SDKに付属のRealSense Viewerの以下の項目で設定可能です。

Advanced Controls > Depth Table > Disparity Shift
![](https://i.gyazo.com/da5b1ee1ad80e821af7164ffd8873201.png)

平坦な壁を撮像対象としてカメラと壁の間の距離を調整しながら、設定したDisparity Shiftの値に対してMinZとMaxZを調査しました。
RealSense Viewerで深度画像の半分以上の領域で深度が得られなくなった時の深度をMinZ或いはMaxZとみなします。

![](https://i.gyazo.com/eb581ca966a257220183d10a8606752e.png)

結果は以下のようになりました。

![](https://i.gyazo.com/6d3ccc1700f8037ebea2f1e566c2a55c.png)

横軸がDisparity Shiftの設定値で縦軸がMinZとMaxZです。
Disparity Shiftの値が大きくなるに従って急激にMaxZの値が小さくなっています。

Disparity Shiftが100の場合にはMaxZ(325mm)-MinZ(145mm)=180mmとなり、今回のワークの位置範囲をカバーできるため、100の設定値を採用しました。

## Depth Quality Toolで深度のRMSエラーを確認する（再）

Disparity Shiftを100に設定して再度RMSエラーを確認してみます。
MinZは145mmですが50mm程度マージンをとって200mmの距離で計測しました。

| ROI[%] | RMS[%] | RMS[mm] |
| ---- | ---- | ---- |
| 80 | 計測不可 | - |
| 60 | 0.13 | 0.26 |
| 40 | 0.12 | 0.24 |
| 20 | 0.11 | 0.22 |

被写体までの距離が300mmから200mmになったことでRMSエラーが0.3mm以下となりました。
一方で80%のROIでは平面フィッティングに失敗してRMSエラーの算出に失敗しています。

DQTで表示される深度画像は左右の深度センサの内、左側の深度センサの深度画像となりますが、左端の領域では深度が得られません。
距離を300mmから200mmにしたことで深度の得られない領域が広がり、ROIの範囲内にこれが含まれてしまい平面フィッティングに失敗したようです。

![](https://i.gyazo.com/3596eb4faec7c10781680a44e503b8bb.png)

ステレオカメラは左右の深度センサの画像のそれぞれで得られた特徴をマッチングして視差および深度をもとめます。
D435fではIRパスフィルタを備えているため、基本的にはプロジェクタからの照射光によるランダムドットのみが特徴として検出されます。
左端の領域は右側の深度センサの撮像範囲外となりマッチングを行えないため深度が得られません。
また、距離が小さくなるほど撮像範囲に対して深度が得られる範囲は相対的に狭まって行きます。

![](https://i.gyazo.com/9fcc3ff85a960f112d6d4817c41435a4.png)

ROIの中心位置を少し右寄りに移動できれば良いのですが、そのような機能はDQTにはないようです。

## まとめ

今回はRealSense D435fでDisparity Shiftを調整し、深度のRMSエラーを改善しました。

[IDS社のENSENSO](https://jp.ids-imaging.com/ensenso-stereo-3d-camera.html)のようなハイエンドの3Dカメラと比較すると、RealSenseシリーズは非常に安価(10万円以下)でコストパフォーマンスが良いです。
ただし、撮像対象のワークや照明環境に依存して得られる深度の精度やばらつきが問題となることが多々生じるので、撮像条件に合わせて今回のようなカメラパラメータの調整や点群に対する後処理が重要となります。

弊社では様々なロボットシステム開発でRealSenseを活用しており上記のような研究開発に日々取り組んでいます。
今後も開発の現場で得られた知見についてご紹介できればと思います。

## おまけ: RealSenseのカメラケーブル

D435fに付属のカメラケーブル(USB Type-C)は1mと短いので、ハンドアイ構成で使用する場合は別途ケーブルの購入が必要となります。
今回はUR5e(リーチ半径:850mm)を使用しましたので5m程度の長さのものを調べました。

最終的に選定したのはNewnex社のケーブルで [ホワイトペーパー](https://www.newnex.com/realsense-3d-camera-connectivity.php)や[COMPATIBILITY TEST](https://www.newnex.com/documents/testing_Intel.pdf)の通り、RealSenseのカメラとの接続実績があるものです。

[Intelのページ](https://www.intel.co.jp/content/www/jp/ja/support/articles/000030117/emerging-technologies/intel-realsense-technology.html)でもNewnex社のケーブルが紹介されています。

スクリューロック式ですのでロボットの移動によりケーブルが抜けてしまうといったリスクも低減できそうです。
