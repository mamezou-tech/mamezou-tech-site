---
title: CCTagマーカーを使ってみた
author: shintaro-matsui
date: 2023-10-04
---

# はじめに

今回は画像認識用のマーカーの一種であるCCTagについて紹介します。  
  
ロボットと画像認識は切っても切り離せない関係にあり、近年では画像認識により自律的に動作したり、周囲の様子を把握して移動するロボットが多く登場してきています。  
画像認識には様々な技術がありますが、画像認識を補助するマーカーを用いる事で対象の位置姿勢を推測する手法はよく見受けられます。  
有名な画像認識用のマーカーの1つにARマーカーがあり、例えばOpenCVで使用できるArUcoマーカーでは単一のマーカーで3次元の位置および姿勢を推定することが出来ます[^1]。
![Aruco画像](/img/robotics/vision/aruco-merge.png)  
  
[^1]: [Detection of ArUco Markers](https://docs.opencv.org/4.x/d5/dae/tutorial_aruco_detection.html)  


# CCTagとは
CCTagとは、複数の円で構成される画像認識用の2次元マーカーです。  
![CCTag画像](/img/robotics/vision/cctags-example.png)  
先ほど紹介したARマーカーとは異なり、CCTagマーカーは2次元の位置しか推定できません。  
その代わり一般的な2次元マーカーと比べて、以下のようにノイズに屈強なようです[^2]。  
![CCTag説明](/img/robotics/vision/cctag-explanation.png)  
[^2]: [CCTag documentation](https://cctag.readthedocs.io/en/latest/index.html)  

マーカーを認識する上で考えらえるノイズとして、マーカー・カメラの移動や焦点のズレによる画像のぼやけ、照明環境の変化による画像の明るさの変化、マーカーの汚れ等、様々なものが想定されます。  
従って環境変化の大きい屋外で動作するロボットや、カメラの画像がブレやすい移動ロボットの画像認識に向いていそうです。  
上記シーンには該当しませんが、私は屋内における固定ロボットと3Dセンサとのハンドアイキャリブレーション[^3]の精度検証に使用しました。  
使用できるプログラム言語は現時点ではC++のみであり、ライセンスはMPL2.0です。  
  
[^3]: ロボットとカメラの間の位置姿勢のキャリブレーション

# CCTagの導入
推奨スペックは以下の通りです。  

| 項目 | 推奨スペック |
| ---- | ---- |
| OS | Windows x64, Linux, macOS |
| CPU | 比較的最近のIntelかAMD CPUであれば |
| メモリ | 8GB以上 |
| GPU | CUDAが利用できるGPU (compute capability 3.5以上) |

CCTagはCPU、GPUどちらにも対応しております。  
CUDAが無い場合や高速な認識が必要ない場合はCPUのみで使う事が出来ます。  

以下、Ubuntuを想定した環境構築手順を説明していきます。  
依存ライブラリのバージョンは以下のとおりです。

 - Eigen3 >= 3.3.4
 - Boost >= 1.66
 - OpenCV >= 3.1
 - TBB >= 2021.5.0

まずは依存ライブラリをインストールしていきます。  

```shell
sudo apt-get install g++ cmake git-all libpng-dev libjpeg-dev libeigen3-dev libboost-all-dev libopencv-dev
```

TBBにつきましては、私の環境Ubuntu20.04では`apt-get install`によるインストールだとバージョンが古いのでソースコードからインストールしました。

```shell
git clone https://github.com/oneapi-src/oneTBB.git
cd oneTBB
mkdir build
cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make
sudo make install
```

Ubuntu22.04だと以下のように`apt-get install`で十分なようです。

```shell
sudo make install libtbb-dev 
```

CCTagのソースコードをクローンし、インストールしていきます。

```shell
git clone https://github.com/alicevision/CCTag.git
cd CCTag
mkdir build
cd build
```

CUDAを利用しなくて良い場合は、以下のように`CCTAG_WITH_CUDA`オプションをOFFにしてcmakeしてください。  
デフォルトはONです。  

```shell
cmake -DCMAKE_BUILD_TYPE=Release -DCCTAG_WITH_CUDA=OFF ..
make
sudo make install
```

インストール完了です。  


# マーカーを認識する

CCTagマーカーを認識する簡単なC++のコードを紹介します。  
マーカーの認識にCCTagを、画像の読み込み・表示にOpenCVを使用します。  

```cpp
#include <cctag/CCTag.hpp>
#include <opencv2/opencv.hpp>

void drawMarkers(const boost::ptr_list<cctag::ICCTag>& markers, cv::Mat& image)
{
    // 描画パラメータ
    const int RADIUS{3};
    const int FONT_SIZE{1};
    const int THICKNESS{2};
    const int FONT_FACE{cv::FONT_HERSHEY_SIMPLEX};

    for (const auto& marker : markers) {
        // (3) マーカー中心を取得
        const auto center = cv::Point(marker.x(), marker.y());
        // (4) マーカーの外接楕円の情報を取得
        const auto outerEllipse = marker.rescaledOuterEllipse();

        // (5) 有効な認識結果かをチェック
        const auto isValid = marker.getStatus() == cctag::status::id_reliable;
        const auto color = isValid ? cv::Scalar(0, 255, 0)  // 緑
                                   : cv::Scalar(0, 0, 255); // 赤
        cv::circle(image, center, RADIUS, color, THICKNESS);
        cv::putText(image,
                    std::to_string(marker.id()),
                    center,
                    FONT_FACE,
                    FONT_SIZE,
                    color,
                    THICKNESS);
        if (isValid) {
            // (6) マーカー外郭を描画
            cv::ellipse(image,
                        center,
                        cv::Size(outerEllipse.a(), outerEllipse.b()),
                        outerEllipse.angle() * 180. / CV_PI,
                        0,
                        360.,
                        color,
                        THICKNESS);
        }
    }
}

int main(int argc, char** argv)
{
    // マーカーを撮影した画像を読み込み
    const std::string IMG_PATH{"../scene_marker.png"};
    cv::Mat imageRgb = cv::imread(IMG_PATH, 1);
    if (imageRgb.empty()) {
        std::cerr << "'" << IMG_PATH << "' was not found." << std::endl;
        return 1;
    }
    cv::Mat imageGray;
    cv::cvtColor(imageRgb, imageGray, cv::COLOR_BGR2GRAY);

    // (1) マーカーのパラメータを設定
    const std::size_t NUM_CROWNS{3};
    cctag::Parameters params(NUM_CROWNS);
    // (2) マーカーを認識
    boost::ptr_list<cctag::ICCTag> markers{};
    cctag::cctagDetection(markers, 0, 0, imageGray, params);

    // 認識結果を描画
    drawMarkers(markers, imageRgb);

    // 認識結果の表示
    cv::imshow("Result", imageRgb);

    // 何らかのキーを押したら表示終了
    cv::waitKey(0);

    return 0;
}
```

:::info
今回はOpenCVの関数の説明は省略させていただきます。  
:::

// (1) マーカーのパラメータを設定  
`cctag::Parameters`でマーカーのパラメータを設定しています。  
ただ設定できるのはマーカーの輪の数が3つか4つか指定できる程度です。  
// (2) マーカーを認識  
`cctag::cctagDetection()`でマーカーを認識します。  
認識結果は`markers{}`に格納されます。  
// (3) マーカー中心を取得  
`cctag::ICCTag`型の`marker`に対し、`marker.x()`でマーカー中心のX座標、`marker.y()`でマーカー中心のY座標を取得できます。  
他にも`marker.id()`でマーカーのIDを取得できます。  
// (4) マーカーの外接楕円の情報を取得  
`cctag::ICCTag::rescaledOuterEllipse()`を使用し、外接楕円の情報を`cctag::numerical::geometry::Ellipse`型の`ellipse`として取得します。  
// (5) 有効な認識結果かをチェック  
`marker.getStatus()`が`status::id_reliable`の場合は有効な検出結果と判断されます。  
今回の場合は1つのマーカーにつき3つの輪が検出されなければ有効でないと判断されます。  
// (6) マーカー外接楕円を描画  
`ellipse.a()`で楕円の長径の長さ、`ellipse.b()`で楕円の短径の長さ、`ellipse.angle()`で楕円の回転角度を取得できます。  
  
他、APIのリファレンスは[こちら](https://cctag.readthedocs.io/en/latest/api/api.html)以下をご覧ください。  

コードをコンパイルするためにcmakeを使用します。  
先ほどのコードをmain.cppとし、これをコンパイルするためのCMakeLists.txtを書きます。  

```cmake
cmake_minimum_required(VERSION 3.16)
project(CCTagSample)

find_package(OpenCV REQUIRED)
find_package(CCTag REQUIRED)

add_executable(cctag_sample main.cpp)
target_link_libraries(cctag_sample PRIVATE ${OpenCV_LIBRARIES} CCTag::CCTag)
```

scene_marker.pngは以下の画像を使用します。  
![CCTagシーン画像](/img/robotics/vision/scene_marker.png)  

任意のディレクトリにて、以下のようにファイルを配置します。

```shell
.
├── CMakeLists.txt
├── scene_marker.png
└── main.cpp
```

コンパイルして実行してみます。

```shell
mkdir build
cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make
./cctag_sample
```

以下のように画像が表示されれば成功です。  
![CCTag認識結果](/img/robotics/vision/result.png)  

# マーカー画像の生成

[CCTagの導入](#cctagの導入)でcloneしたCCTagリポジトリにマーカー画像を生成するスクリプトが置いてあります。

```shell
cd CCTag
cd markersToPrint/generators
```

generate.pyを実行することで、SVG形式でマーカーが出力されます。  
実行にはSVG関連のライブラリが必要なのでインストールしておきましょう。  

```shell
pip install svgwrite svglib
```

オプションを指定することでPNGやPDF形式で出力したり、マーカーの大きさを変更することが出来ます。  
例えば、直径500[pix]で、マーカーにIDを追記し、PNG形式にて出力したい場合は以下のように実行します。  

```shell
./generate.py --radius 500 --addId --generatePng
```

使い方および他のオプションは以下の通りです。

```shell
usage: generate.py [-h] [--rings N] [--outdir dir] [--margin N] [--radius N] [--addId] [--addCross] [--generatePng] [--generatePdf] [--whiteBackground]

optional arguments:
  --rings N          マーカーの輪の数 (3か4のみ指定可、デフォルトは3)
  --outdir dir       出力先のパスを指定 (デフォルトは"./")
  --margin N         マーカーの周囲の余白[pix] (デフォルトは400)
  --radius N         マーカーの直径[pix] (デフォルトは500)
  --addId            マーカー左上にIDを追記
  --addCross         マーカー中心にクロスマークを追記
  --generatePng      PNGファイルも出力
  --generatePdf      PDFファイルも出力
  --whiteBackground  背景を透過ではなく白色にする
```

生成したマーカーを紙や他媒体に印刷して使用してください。  

# おわりに

今回は少し珍しい2Dマーカー、CCTagの紹介しました。  
CCTag単体では3次元位置姿勢を検出できませんが、最低3つのマーカーを組み合わせてその配置情報を利用すれば3次元位置姿勢も求める事ができます。  
ARマーカーでは認識が安定しないような困難な環境にてマーカー認識が必要となった場合等に、ぜひCCTagを使用してみてください。

今回の記事は公式のドキュメントを元に作成しておりますので、更に詳細を知りたい方は確認してみてください（[こちら](https://cctag.readthedocs.io/en/latest/index.html)）。  