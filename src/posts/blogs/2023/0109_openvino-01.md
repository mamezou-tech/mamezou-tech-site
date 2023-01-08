---
title: ディープラーニング初心者がOpenVINOを使ってみる（その１：インストール編）
author: shuichi-takatsu
date: 2023-01-09
tags: [ディープラーニング, 深層学習, 機械学習, openvino]
---

今回から数回に分けて「ディープラーニング・アプリケーション開発キット”[OpenVINO](https://www.intel.co.jp/content/www/jp/ja/internet-of-things/openvino-toolkit.html)”」について紹介したいと思います。  

実は、数年前に一度トライはしたものの、当時はまだWindowsプラットフォームでの運用が推奨されておらず、Windowsでの動作確認を断念していました。  
最近はWindowsやRaspberryPiの運用報告もあるようなのでまた興味が出てきました。  
今回は第一回目ということで「OpenVINOのインストール」と「チュートリアルの動作確認」まで行いたいと思います。  

[[TOC]]

## ディープラーニングとは

私がここで説明するまでもないと思いますが、ディープラーニング(deep learning：深層学習)とは、これまで人間が行ってきたタスクをコンピュータに学習させる機械学習手法の一つです。近年は医療での新薬発見や自動車の自動運転技術、自動翻訳など様々な分野に応用されていて、非常に発展してる分野の一つです。  

## OpenVINO とは

[OpenVINO](https://www.intel.co.jp/content/www/jp/ja/internet-of-things/openvino-toolkit.html)は、インテルが無償で提供しているディープラーニング・モデルを最適化および展開するためのオープンソースのツールキットです。  
Keras、TensorFlow、PyTorch などのフレームワークからディープラーニング・モデルを最適化し、インテルが提供する各種プロセッサやその他のハードウェア・プラットフォームでのパフォーマンスを向上させます。  

![](https://gyazo.com/0fcf9cbe0c59d536b5739e43d39c2893.png)

OpenVINO の基本ワークフローは以下の３ステップで構成されます。  

- 事前学習済みモデルの取得
- OpenVINO独自のIRモデルへ変換   
- 推論実行とデブロイ

ディープラーニングを始めるにあたって、まずはモデルを取得しなくてはなりません。  
自分で独自にモデルを作成して学習(トレーニング)させることも出来ますが、初心者が最初から高度なモデルを作成して学習させるのはかなりハードルの高い作業になります。  
そこで、OpenVINO では「[Open Model Zoo](https://github.com/openvinotoolkit/open_model_zoo)」と呼ばれる事前学習済みモデルのデータベースを提供しています。  

OpenVINO で実行可能なモデルは IR(Intermediate Representation) という形式のモデルです。  
IR はxml形式とbin形式の２つのファイルから構成されます。  
OpenVINO が提供する「モデル・オプティマイザ(Model Optimizer)」を使って、Keras、TensorFlow、PyTorch などの他の形式のモデルをIR形式に変換します。  

「Open Model Zoo」が提供する事前学習済みモデルにはIR形式のモデルも含まれているので、取得してすぐに利用することが可能です。  
これから、OpenVINO を動かすための環境を構築していきます。  

## OpenVINO コア・コンポーネントをダウンロードしてインストールする

インテルの[サイト](https://docs.openvino.ai/latest/openvino_docs_install_guides_installing_openvino_windows_header.html)を参照しながら、Windows用の OpenVINO をインストールしていきます。  
(2022/01/07現在では、OpenVINO の最新バージョンは 2022.3.0 のようです)

上記のURLから、アーカイブ・ファイルをダウンロードします。  

![](https://gyazo.com/436879442ea3bb3623e347737d1fe855.png)

まず、ダウンロードしたファイルを展開するためのフォルダ  
  `"C:\Program Files (x86)\Intel"`  
を事前に作成しておきます。(管理者権限で実行します)  

```shell
mkdir "C:\Program Files (x86)\Intel"
```

任意のフォルダに移動し、アーカイブ・ファイルをダウンロードします。  

![](https://gyazo.com/4936e97a0ada72221a73841979557678.png)
(上記のURLのリンクを直接クリックしてファイルをダウンロードすることも出来ます)

```shell
curl -L https://storage.openvinotoolkit.org/repositories/openvino/packages/2022.3/windows/w_openvino_toolkit_windows_2022.3.0.9052.9752fafe8eb_x86_64.zip --output openvino_2022.3.0.zip
```

ダウンロードしたアーカイブ・ファイルを解凍し、解凍されたフォルダを「openvino_2022.3.0」にリネームした後、Intelフォルダ下に移動させます。
(管理者権限で実行します)   

```shell
tar -xf openvino_2022.3.0.zip
ren w_openvino_toolkit_windows_2022.3.0.9052.9752fafe8eb_x86_64 openvino_2022.3.0
move openvino_2022.3.0 "C:\Program Files (x86)\Intel"
```
解凍したフォルダを移動した後は、ダウンロードしたアーカイブ・ファイルは削除しても大丈夫です。  

今後 `"C:\Program Files (x86)\Intel\openvino_2022.3.0"` へのアクセスを簡単にするために”シンボリックリンク”を作成します。(管理者権限で実行します)    

```shell
cd C:\Program Files (x86)\Intel
mklink /D openvino_2022 openvino_2022.3.0
```

以下のようにシンボリックリンクが作成されました。  
![](https://gyazo.com/4c193ea3b1d4e3683696b4752bdf1774.png)

今後は  
`"C:\Program Files (x86)\Intel\openvino_2022"`  
でアクセスが出来ます。  

## 環境変数を設定する

OpenVINO を実行するには、いくつかの環境変数を設定する必要があります。  
環境変数を設定するコマンドが用意されていますので、コマンドプロンプトを開き、setupvars.bat バッチファイルを実行して環境変数を一時的に設定します。  
(別のコマンドプロンプトを立ち上げた時は、再度以下のコマンドを実行して環境変数を設定します)  

```shell
"C:\Program Files (x86)\Intel\openvino_2022\setupvars.bat"
```

## Python、Gitをインストールする

OpenVINO の実行には、C++ もしくは Python が必要です。  
今回は Python を使いますので、まだPCに Python が入っていない場合は Python をインストールしてください。  
複数のバージョンの Python を併用したい場合は conda などのパッケージ管理ツールを使用した方が便利です。  
私は conda を使って Python 3.9.7 をインストールしました。
(Pythonのインストールについては説明を割愛します。他の方の情報を参照ください)

またインターネットからファイルのダウンロードする際には Git を利用しますので、まだ Git をインストールしていない場合は事前に Git をインストールしておいてください。  

## 開発ツールをインストールする

今回インストールしたランタイムに対応したバージョンの開発ツールをインストールします。  
インストールは Python のパッケージ管理ツール pip で行います。  

```shell
pip install openvino-dev==2022.3.0
```

ここまでで、OpenVINO のコア・コンポーネントと開発ツールのインストールが完了しました。  

続いて、OpenVINO の Jupyter Notebook チュートリアルをインストールしていきます。

## OpenVINO notebooksをインストールする

次の[URL](https://github.com/openvinotoolkit/openvino_notebooks/wiki/Windows)を参考にして「OpenVINO notebooks」をインストールします。

任意のフォルダに移動して(例：ドキュメントフォルダ)、OpenVINO Jupyter Notebook チュートリアルをダウンロードします。  

```shell
git clone --depth=1 https://github.com/openvinotoolkit/openvino_notebooks.git
```
「openvino_notebooks」フォルダが作成されていることを確認します。  

カレントディレクトリを「openvino_notebooks」に移動して、必要なモジュールをインストールします。  
(インストールにかなり時間を要します)  

```shell
cd openvino_notebooks
python -m pip install --upgrade pip wheel setuptools
pip install -r requirements.txt
```

## jupyter lab 起動

さっそくチュートリアルを実行してみましょう。  
チュートリアルの実行には「jupyter lab」を使用します。  

jupyter lab は Pythonプログラムをインタラクティブに実行する環境です。  
ブラウザ上で結果を確認しつつ、グラフ等も表示できるので便利です。  
jupyter lab の詳細については[ここ](https://ai-inter1.com/jupyter-lab/)などを参考にしてください。  

次のコマンドを実行して jupyter lab を起動します。  
(jupyter lab起動前に「環境を構成する」の章で説明した「setupvars.bat バッチファイル」を実行して、環境変数を設定しておきます)

```shell
jupyter lab notebooks
```

ブラウザに次のような画面が表示されれば jupyter lab は起動できています。  

![](https://gyazo.com/9d3126d6d72ddd9be569a35180be24ea.png)

## チュートリアルの実行

OpenVINO 環境が正しくインストールされているかを確認するために、チュートリアルのうちの一つを選んで実行してみます。  

jupyter lab で以下のフォルダを選択し、

`/201-vision-monodepth/`

上記のフォルダの中の

`201-vision-monodepth.ipynb`

ファイルをダブルクリックして表示させます。  

![](https://gyazo.com/95005e6e42855831792922288883efb1.png)

jupyter lab の一番右のタブに「201-vision-monodepth.ipynb」が表示されていると思います。  
Monodepth Estimation(単眼深度推定) のチュートリアルになります。  
単眼深度推定とは単眼カメラの情報から深度(奥行き)を推定するもののようです。  
(ここはOpenVINO環境のセットアップの確認が目的なので、本チュートリアルの詳細の説明は次回以降に譲ります)  

タブの「▶▶」ボタンを押します。  

![](https://gyazo.com/9b9c6f5d465859f3dde02cedfd7f29ff.png)

次のようなダイアログが表示された場合は「Restart」を押します。  

![](https://gyazo.com/1bcf08531ff52bdf9e130917d90e535c.png)

(PCの性能によって、この後多少時間がかかります)

タブの中のセル(jupyterのコマンドを記述していく単位)の左端の「[ ]」の中に、数字が連番で付番されていきます。  
番号が付番されたセルは実行済を意味します。

![](https://gyazo.com/c294ac3a5e73e263dd1c957a6af6c9c0.png)

シートの一番最後までスクロールして、次のようなVideo(mp4ファイル)が表示されていたら正常に実行できています。  
(正常に実行できていない場合は、シートの中にエラーが表示されます。大抵は Pythonモジュールが正常にインストールできていないので、モジュールが正常にインストール出来ているか確認してください)

![](https://gyazo.com/aaf5f19c443fd7e67d47d8719dbf4634.png)

上記のVideoの「▶」ボタンを押して、動画が再生されることを確認してください。  
数秒間の動画ですが、左半分がオリジナル動画で、右半分が「Monodepth Estimation(単眼深度推定)」した結果になります。  

## まとめ

今回は OpenVINO 環境の構築とチュートリアルの動作確認を行いました。  
OpenVINO は GPUやVPU、NCS2(Neural Compute Stick 2)もサポートしているようなので、手持ちの NCS2 で動作確認も実施してみたいと思います。(NCS2 での動作確認では実は色々とハマりました。ハマった件については次回以降にご紹介します)  

ディープラーニングは奥が深いので、今後は順次チュートリアルを解析しつつ、その魅力に迫っていきたいと思います。  
