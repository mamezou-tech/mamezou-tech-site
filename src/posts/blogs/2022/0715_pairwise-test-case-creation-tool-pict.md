---
title: ペアワイズ法による組み合わせテストケース生成ツール「PICT」の紹介
author: shuichi-takatsu
date: 2022-07-15
tags: [テスト, pairwise, pict]
---

[先日のブログ](/blogs/2022/07/11/pairwise-test/)にて「ペアワイズ法」をご紹介しました。  
その記事では組み合わせテストケースを作成する際に「PICT」というツールを使いました。  
今回はペアワイズ法による組み合わせテストケース生成ツール「PICT」をご紹介いたします。

[[TOC]]

## PICTとは

[PICT (Pairwise Independent Combinatorial Testing tool)](https://github.com/microsoft/pict) はMicrosoft社が開発したペアワイズ法による組み合わせテストケース生成ツールで、フリー(無償)で利用することが出来ます。  

PICTは、複数因子の組み合わせテストケースを効率よく生成することができ、様々なオプションが用意されている高機能ツールです。  
今回はインストール方法と簡単な使い方をご紹介します。

## インストール

[サイト](https://github.com/microsoft/pict/releases/)からPICTをダウンロードします。  
2022/07/14時点の最新バージョンは 3.7.4 でした。  
ダウンロードするファイルは「pict.exe」(windows版の場合)１つで大丈夫です。  
MacOSやLinuxで利用する場合にはソースコードをダウンロードしてビルドすれば使用することができます。

pict.exeをダウンロード（もしくはダウンロードしたソースコードをビルド）し、任意の場所に格納すればインストール終了です。  
フォルダに配置すること以外の登録作業は特に必要ありません。  
任意のフォルダからPICTを利用したい場合は環境変数にPICTへのパスを登録してください。

## 使用方法

PICTの詳細な使用方法は[このサイト](https://github.com/Microsoft/pict/blob/main/doc/pict.md)に掲載されています。  
ここでは簡単なサンプルを定義して実行してみましょう。

「sample.txt」というファイル名のテキストファイルを作成します。  
そのテキストファイルに、左から「因子名」を書き、コロン「:」で区切った後、「水準名」をカンマ「,」で区切りながら追記していきます。

[前回使用したサンプル](/blogs/2022/07/11/pairwise-test/)をそのまま使ってみましょう。  
組み合わせに使用する例題を以下とします。  
・OS (Windows, Linux, MacOSX)  
・ブラウザ (Firefox, Chrome)  
・Java (バージョン8, バージョン11)  

作成するテキストファイル(sample.txt)は以下のようになります。  
```text
OS:	Windows, Linux, MacOSX
ブラウザ:	Chrome, Firefox
Java:	8, 11
```

コマンドラインにて、PICT(実行ファイル)の引数に先ほど作成したテキストファイル(sample.txt)を渡してPICTを実行します。

```shell
pict sample.txt
```

実行すると以下のような結果が出力されました。

実行結果
```shell
OS	ブラウザ	Java
Windows	Firefox	11
Windows	Chrome	8
MacOSX	Firefox	8
Linux	Chrome	11
Linux	Firefox	8
MacOSX	Chrome	11
```

出力結果はタブ文字区切りなので、TSVファイルとして保存してExcel等で開くことが出来ます。  
先日のブログで紹介したものと同じ組み合わせテストケースを得ることが出来ました。

## まとめ

[ペアワイズテストサイト](https://www.pairwise.org/tools.html)にてペアワイズ法を利用できるツールが紹介されています。  
筆者はPICT以外のツールをあまり知らなかったのですが、非常に多くのツールが提供されているようです。  

その中でもPICTは、有償ツールに引けを取らない非常に高機能なツールで、PICTさえあればペアワイズ法には困らないとさえ思います。  
PICTには様々なオプションが用意されていて、制約や重みづけなどにも対応しています。  

次回はこのPICTをGUIから利用できるようにした便利ツールをご紹介したいと思います。

[ソフトウェアテストに関する技法やテクニックをまとめています。](/testing/)

テストに活用していただければ幸いです。
