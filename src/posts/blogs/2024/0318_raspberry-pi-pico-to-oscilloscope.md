---
title: Raspberry Pi PicoとAndroidスマートフォンでオシロスコープを構築する
author: shuichi-takatsu
date: 2024-03-18
tags: [raspberrypipico, oscilloscope, android, smartphone]
image: true
---

[以前](/blogs/2024/01/07/raspberry-pi-pico-debug-by-debug-probe/)、Raspberry Pi PicoをRaspberry Pi デバッグプローブとPlatform IOを使ってデバッグする方法を紹介しました。  
今回はRaspberry Pi PicoとAndroidスマートフォンを使って簡易的なオシロスコープを構築してみたいと思います。

## Raspberry Pi Picoとは

Raspberry PiシリーズはARMプロセッサを搭載したシングルボードコンピュータです。  
最近発売された最新モデルは[モデル5](https://www.raspberrypi.com/products/raspberry-pi-5/)でしょうか。  
モデル5やモデル4はHDMI端子やUSB端子、microSDカードスロットなどを備えており、microSDカードにOSをインストールすればそのままPCとしても利用可能な高性能シングルボードコンピュータです。  

それに対して「Raspberry Pi Pico」は以下のような外観をしており、ESP32やArduino Nanoのような組み込み開発ボードに近い存在です。  

Raspberry Pi Pico外観  
（写真のものは、デバッグ端子にJSTの3ピンSHコネクタを搭載し、あらかじめピンヘッダがはんだ付けされている Hタイプです）  
![](https://gyazo.com/df32a03214f568298292dce3a0473512.png)

モデル5やモデル4のような高機能な用途には向きませんが、Raspberry Pi Pico（以降「Pico」と称す）はその分安価であり電子工作向きだと言えます。（参考：[スイッチサイエンス](https://www.switch-science.com/products/6900)）

## オシロスコープ とは

オシロスコープは、入力した電気信号の波形を視覚的に表示する計測器です。  
一般的に横軸に時間、縦軸に入力の信号波形を表示します。  

最近はAmazonなどでも比較的安価なオシロスコープが販売されていますが、安価になったと言っても１万円弱程度はしますので「ちょっと買ってみよう」と言うには敷居が高いものです。

## PWM制御回路や発振回路を作ったときに信号波形を確認したい

一般の電子工作者の普段使いでオシロスコープが活躍する場面ってそんなに多くはないとは思いますが、モーターのPWM制御回路や発振回路を作成したときには、やっぱり信号波形を確認したい場合があります。  
そこで今回は「Androidスマートフォン」をオシロスコープに変えてしまう便利なアプリを紹介したいと思います。

## Scoppy - Oscilloscope and Logic Analyzer

今回紹介するアプリは [Scoppy - Oscilloscope and Logic Analyzer](https://oscilloscope.fhdm.xyz/) です。  

このアプリをAndroidスマートフォンにインストールします。  

そして次にPicoを用意し、[ここ](https://oscilloscope.fhdm.xyz/wiki/firmware-versions)からPico用のファームウェアをダウンロードしてPicoにインストールします。  
（ファームウェアのインストールを行うには、Pico基板上のボタンを押したままMicroUSBコネクタとPCを接続します。PicoがBOOTSELモードで起動し、PC側にPicoがストレージとしてマウントされますので、Picoにファームウェアのファイルをドラッグして書き込みます）

詳しい使い方を書こうと思ったのですが、アプリのインストール、Picoへのファームウェアの書き込み、回路の設計（Pico＋抵抗少々）を解説した[動画](https://www.youtube.com/watch?v=LRcMg56Tius)を見つけたので紹介します。  

動画の通りにPicoとスマートフォンを接続して、セルフで動作チェックをしてみます。  
GPIO 22 を ADC ピン(GPIO 26)に直接接続し、GPIO 22上のテスト信号を表示します。  
GPIO 22 は、デューティ・サイクル 50% の 1kHz の矩形波です。  

![](https://gyazo.com/1039cfca133d68c77bb01dc0874493bf.png)

上記で紹介した動画では入力電圧の範囲をマイナス5Vからプラス5Vまで入力できるように配線していますが、私は少し手を抜いてこちらの[動画](https://www.youtube.com/watch?v=TDA-7wgfBe0)で紹介されているように0Vから3.3Vまでの範囲で測定できるようにしただけのものを作りました。  
こちらの方法なら抵抗が3個だけ(100kΩ×1, 10kΩ×2)ですみます。

## PWMモジュールを使ったオシロスコープの動作確認

先ほど紹介した動画でも使われていた「[PWMモジュール](https://www.amazon.co.jp/gp/product/B077Z3TD8B)」を使って動作確認してみます。  

![](https://gyazo.com/7bf4755108150720e3c72e9511ce0ea9.png)

100Hzでデューティ比50％の信号を発生させてみます。  
Scoppy（スマートフォン・オシロスコープ）には次のように信号波形が表示されました。  
![](https://gyazo.com/72261564dbb2956db695bcffe1c46966.png)

次に、デューティ比を25％、75％と変えて信号を発生させてみます。  

25％の場合  
![](https://gyazo.com/101d0a50527e494676aee25658a56943.png)

75％の場合  
![](https://gyazo.com/961d020d98b51741dc4f497b9aa316b8.png)

多少の誤差はありますが、正しく信号波形を捉えているようです。

## まとめ

今回、Raspberry Pi PicoとAndroidスマートフォンに「[Scoppy - Oscilloscope and Logic Analyzer](https://oscilloscope.fhdm.xyz/)」をインストールして、オシロスコープを構築することが出来ました。  

今の回路ですと0Vから3.3Vまでの信号波形しか測定できませんが、[こちらの基板](https://www.switch-science.com/products/8832)を使えばその制限を超えて信号波形を測定できるようです。  
キットになっていますが、製品版のオシロスコープを購入するよりもかなり安価にオシロスコープが手に入ります。  
（Scoppyを無料で使用する場合には使用できるチャンネル数が1チャンネルに制限されるようです）  
皆様もトライしてみてはいかがでしょうか。
