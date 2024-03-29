---
title: ペアワイズ法テストケース生成ツール「PictMaster」の無効値を使う
author: shuichi-takatsu
date: 2022-10-01
tags: [テスト, pairwise, pict, pictmaster]
---

[前回](/blogs/2022/09/11/pictmaster-submodel-option/)はペアワイズ法テストケース生成ツール「PictMaster」の”サブモデル”機能について紹介しました。  
今回はPictMasterの”無効値”機能について紹介したいと思います。


## 特定の因子・水準同士の組み合わせを制限したい場合

２因子網羅のテストケースを効率よく生成するペアワイズ法ですが、特定の因子・水準同士の組み合わせに意味がない、または組み合わせたテストケースが実施不可能の場合、あらかじめ特定の水準・因子の組み合わせをテストケース中に”生成させない”ようにする必要があります。  
以下の例で考えてみましょう。  

・OS (Windows, Linux, macOS)  
・ブラウザ (Chrome, Firefox, IE)  
・Java (バージョン8, バージョン11)  

上記において、ブラウザの水準に設定されているIE(インターネット・エクスプローラ)はWindowsでしか動作しません。  
Windows以外のLinuxやmacOSとIEの組み合わせテストケースを生成しないようにする必要があります。  
PictMasterではこのような組み合わせ  
- OS: Linux, macOS
- ブラウザ: IE

を”無効値”と呼びます。

## 無効値の設定

特定の因子・水準を無効値に指定します。  
因子「OS」「ブラウザ」の各水準を以下のように記述します。  
`OS: Windows, ~Linux, ~macOS`  
`ブラウザ: chrome, Firefox, ~IE`  

無効値に指定する水準は、水準名の前に「~」(チルダ)を記述します。

![](https://gyazo.com/e71cfb59c00fe1efe8528c7201e6801b.png)

組み合わせテストケース生成を実行します。  
以下の結果が出力されました。

![](https://gyazo.com/e2e10aaa4b1fd2c828e7d6766faa0446.png)

全テストケース数は10個になりました。  
無効値を使用した場合、無効値同士の組み合わせテストケースは生成されていません。  
(上記の例ではLinux,macOSとIEのペアは生成されていません)  

無効値を設定せずにテストケースを生成した場合は以下のようになります。

![](https://gyazo.com/edbe7971b51b1ebb8ca5c128ce914e08.png)

全テストケース数は9個になりました。  
上記のテストケースでは、本来組み合わせが不可能な「LinuxとIE」「macOSとIE」の組み合わせがテストケース中に現れてしまっています。  

## 制約表との違い

テストケースの組み合わせを制御する別の方法としては、[以前の回](/blogs/2022/08/01/pictmaster-constraint-option/)でご紹介した”制約表”があります。  

制約表は無効値よりもきめ細かい制御ができますが、制約表に条件を細かく設定する必要があり、複雑な条件を書く場合はテストケース自体の検証が必要になり手間がかかります。  
無効値機能は組み合わせ不可の水準値の前に「~」を追記するだけであり、テストケースの検証も簡単です。

## まとめ

「無効値」機能を使うことによって、特定の因子・水準同士の組み合わせを生成しないテストケースを作ることができました。  
PICTには他にも色々なオプションが用意されていて、PictMasterから利用可能です。  
次回も別のオプションを紹介していきたいと思います。

[ソフトウェアテストに関する技法やテクニックをまとめています。](/testing/)

テストに活用していただければ幸いです。
