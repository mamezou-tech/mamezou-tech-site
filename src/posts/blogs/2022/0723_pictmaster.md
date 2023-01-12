---
title: ペアワイズ法をGUIから使いこなすツール「PictMaster」の紹介
author: shuichi-takatsu
date: 2022-07-23
tags: [テスト, pairwise, pict, pictmaster]
---

[前々回](/blogs/2022/07/11/pairwise-test/)、[前回](/blogs/2022/07/15/pairwise-test-case-creation-tool-pict/)とペアワイズ法に関する情報を発信してきました。  
今回は前回紹介したPICTをGUIから利用できるようにした便利ツールである「PictMaster」について紹介します。


## PictMasterとは

詳しくは[PictMasterのサイト](https://ja.osdn.net/projects/pictmaster/)の説明を読んでいただくとして、PictMasterについて簡単にご説明します。  
PictMasterはExcelベースのツールです。  
Excel上で因子・水準等を設定するだけで簡単にPICTを操作して、結果をExcel表にして出力してくれます。

PictMasterのテストケース生成エンジンとして
- Microsoft製ペアワイズ法テストケース生成エンジンPICT
- 大阪大学の土屋達弘教授が開発したCIT-BACH

の２つが利用できます。  
（デフォルトはPICTが選択されています）  
また直交表ツールとしてのテストケース生成もサポートしています。

## ダウンロード

PictMasterは次のプロジェクトサイトからダウンロードします。

[PictMaster](https://ja.osdn.net/projects/pictmaster/)  

（2022-07-22 時点最新：PictMaster Japanese version 7.0.4J ）

## インストール

ダウンロードしたファイルはZip形式になっていますのでファイルを解凍します。  
以下に示すファイルが同梱されています。

![](https://gyazo.com/fb86f166bdb1b2005d9d012a7de5b215.png)

「0.初めに読んでください.txt」を開いて中身を確認します。  
PictMasterには32ビット版と64ビットの２種類が用意されていることが書かれています。  

ユーザマニュアル内にPICTのダウンロードURLが記述されていますが、URLが誤っていますので、[このURL](https://github.com/microsoft/pict/releases/download/v3.7.4/pict.exe)からPICTをダウンロードしてください。

ダウンロードしたPICT実行ファイル(pict.exe)と一緒に、先ほどダウンロードしたPictMaster関連ファイルの中に含まれている
- cit.jar
- nkf.exe
- oalib
- oalibmix

の4ファイルをPICTと同じフォルダパスに格納します。  
筆者はPictMasterユーザーズマニュアルに従って以下のパスにインストールしました。  
`C:\Program Files (x86)\PICT`

![](https://gyazo.com/747260d35e1a915dd911b52beafbbaf0.png)

## 起動

PictMasterは32ビット版と64ビット版の2種類が同梱されています。  
各自の環境に合ったものを使用してください。  
- PictMaster.xlsm (32ビット版)
- PictMaster64.xlsm (64ビット版)

(注意：予めExcelがインストールされていることが条件です)

PictMasterを起動すると以下のようなExcelシートが開きます。

![](https://gyazo.com/963c29eec6919afc11dce6f4a51c06e8.png)

大項目No.、小項目No.、大項目名、小項目名、作成日、作成者の項目は必要に応じて記入します。

環境設定ボタンを押します。  

![](https://gyazo.com/5a3847a40e1db2b7ea87590624d2f7db.png)

以下のようなダイアログが表示されました。

![](https://gyazo.com/00334b773baa15731d580f379700e934.png)

取りあえず、デフォルトのままとします。  
キャンセルボタンを押してダイアログを閉じます。  

前回のブログで紹介した組み合わせテストの例題をPictMasterのシート上に設定してみましょう。  
例題は以下です。    
・OS (Windows, Linux, MacOSX)  
・ブラウザ (Firefox, Chrome)  
・Java (バージョン8, バージョン11)  

Excelシート上に以下のようにデータを設定します。  

![](https://gyazo.com/d76071e5c6679fd10b7b5fa6c741fa79.png)

シート右上の「実行」ボタンを押します。  

![](https://gyazo.com/a535bed3e4727cafaf241716649e8ce2.png)

以下のような結果が別シートで開きました。  

![](https://gyazo.com/b10735965a3921af03204496cd748808.png)

上記の出力結果は、前回PICTをコマンドラインから実行したときに得たものと同じ結果になりました。  
２因子網羅のテストケースが生成されていることがわかります。

## まとめ

今回はPICTをGUIから便利に使いこなす「PictMaster」を取り上げました。  
PICTには豊富なオプションが用意されていますが、多くをPictMasterから利用できます。  
次回はそれらのオプションを紹介していきたいと思います。

[ソフトウェアテストに関する技法やテクニックをまとめています。](/testing/)

テストに活用していただければ幸いです。

