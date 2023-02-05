---
title: 機械学習モデル可視化ツール「Netron」を使ってみる
author: shuichi-takatsu
date: 2023-02-06
tags: [ディープラーニング, 深層学習, 機械学習, openvino, onnx]
---

[前回](/blogs/2023/02/01/onnx-01/)、ディープラーニングモデルのオープンフォーマット「ONNX（Open Neural Network Exchange）」を紹介しました。
その時に機械学習モデル可視化ツール「Netron」の存在を知りました。    
今回は「Netron」を紹介したいと思います。   

## Netron って何？

[Netron](https://github.com/lutzroeder/netron)は、機械学習モデルを可視化するツールです。  
ブラウザを含むクロスプラットフォームで動作します。  

2023/02/05現在、Netron は、ONNX、TensorFlow Lite、Caffe、Keras、Darknet、PaddlePaddle、ncnn、MNN、Core ML、RKNN、MXNet、MindSpore Lite、TNN、Barracuda、Tengine、CNTK、TensorFlow.js、Caffe2、UFF など非常に多くの機械学習モデルをサポートしています。

## Netron のインストール

自分の環境にあったインストールモジュールを[ここ](https://github.com/lutzroeder/netron/releases/latest)からダウンロードします。  

最新版は V6.5.3 のようです。  
筆者の環境はWindows10なので、Windows用のインストーラーをダウンロードします。  
![](https://gyazo.com/fb9af3b986d07b1145baba69a02f19ab.png)

ダウンロードしたEXEファイルを実行すると、すぐにインストールが開始されます。  
![](https://gyazo.com/2bc3b81c3f9a7866b3b415dafcbfb848.png)

インストールが終了すると「Netron」が起動してきました。  
![](https://gyazo.com/03cd159114c365a32d870656e91a22fe.png)

## 機械学習モデルの可視化

アプリケーションの左上の「File」－「Open」を選択し、[前回](/blogs/2023/02/01/onnx-01/)に使用した「VGG19」のONNXモデルを選択してみます。  

VGG19機械学習モデルの構造が表示されました。  
![](https://gyazo.com/20b9f0e89c3d04a5d5b171bb845bf360.png)

アプリケーションの左上の「View」を押して、機能リストを表示させます。  
その中から「Show Attributes」を選択します。  
![](https://gyazo.com/018970b80bd3efe956c05fe32972460a.png)

モデル中の各レイヤの詳細が表示されました。  
![](https://gyazo.com/7c4f8a1bc8e2c535a5088918ef84a144.png)

レイヤの一つをマウスでクリックしてみます。  
クリックしたレイヤのプロパティが右側のペインに表示されました。  
![](https://gyazo.com/8ecfc01246e4e6c0de34feeb1ae80cc8.png)

## ブラウザ版を使う

Netron はブラウザでも動作するので、[次のURL](https://netron.app/)からブラウザ版Netronを開きます。  
ブラウザに次のような画面が表示されます。  
![](https://gyazo.com/c380071efcfc100ed3c9632ffa55bb69.png)

「Open Model…」をクリックし、先程と同様に「VGG19」のONNXモデルを選択してみます。  

VGG19機械学習モデルの構造が表示されました。  
![](https://gyazo.com/18e7c35e228feb5123187a4acfebe004.png)

画面左上の「ハンバーガーボタン」を押すと、機能リストが表示されます。  
![](https://gyazo.com/920b7ea3e37a60d71d981dfdb9d869f3.png)

リストの一番上の「Properties…」を選択します。  
表示したモデルのプロパティが表示されました。
![](https://gyazo.com/a28011d9254e5c3f7ddf4022b91df31c.png)

## まとめ

Netron はビューアなので機械学習モデルを修正・変更することは出来ませんが、自分で作成した機械学習モデルやインターネットからダウンロードした学習済み機械学習モデルの構造を簡単に可視化できるので、ディープラーニングを学習するための強力なツールになると思います。
