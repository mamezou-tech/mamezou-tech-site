---
title: ロボットSotaにTCP/IP通信で受信したテキストを話してもらう
author: kotaro-miura
date: 2024-09-03
tags:  [Sota, TCP/IP, java, ビジュアルプログラミング]
image: true
---

# はじめに

[前回の記事](https://developer.mamezou-tech.com/blogs/2024/09/02/monitor-pptx-py/)の冒頭でも触れたのですが、弊社デジタル戦略支援事業部から出展した[AI博覧会](https://aismiley.co.jp/ai_hakurankai/2024_summer_visitor/)にて、ブースにあるディスプレイで流すPowerPointのスライドショーの内容をロボットに話してもらいました。
その準備の中でコミュニケーションロボットSotaにTCP/IP通信でメッセージを受信する設定をしたので、設定方法等をまとめさせていただきたいと思います。

# コミュニケーションロボットSotaとは

今回のイベントで話してもらったロボットというのはヴイストン株式会社様から販売されているコミュニケーションロボットの[Sota](https://sota.vstone.co.jp/home/)(デベロッパー版)という製品です。
この製品では、Sotaが話したり動いたりする動作をユーザがプログラミングできます。
プログラミングには専用のSDK環境「VstoneMagic」が提供されており、以下でも実装例を出しているように、用意されたブロックを並べるビジュアルプログラミングができます。
また、TCP/IP通信でメッセージの送受信ができるため、今回はその機能を使ってプログラムを作成しました。

# プログラム内容

今回実装したプログラムを以下に示します。

このプログラムを起動すると、SotaはTCP/IPサーバを起動し接続待ち状態になります。
そして他のTCPクライアントからメッセージを受信したときに、そのメッセージをスピーカから話してくれます。

![TCP受信](/img/blogs/2024/0903_sota_tcp/sota_tcp_project.png)
(赤字番号は筆者による追記)

## 使用するブロックについて

上記プログラムで使用しているブロックについて説明します。上記画像に付記した番号と対応しております。

### ①[TCP/IPサーバ初期化](https://www.vstone.co.jp/sotamanual/index.php?VstoneMagic%2F%E5%91%BD%E4%BB%A4%E3%83%96%E3%83%AD%E3%83%83%E3%82%AF#e4ca0c1b)

Sota上でTCP/IPサーバの初期化を行います。 通信に利用するポート番号やタイムアウト時間をこのブロックで設定できます。
TCP/IPサーバ受信ブロックはこのブロックの開始・終了の間に入れる必要があります。

### ②[無限ループ](https://www.vstone.co.jp/sotamanual/index.php?VstoneMagic%2F%E5%91%BD%E4%BB%A4%E3%83%96%E3%83%AD%E3%83%83%E3%82%AF#d9b44900)

このブロックの開始・終了の間にある処理を無限にループ実行します。

### ③[TCP/IPサーバ受信](https://www.vstone.co.jp/sotamanual/index.php?VstoneMagic%2F%E5%91%BD%E4%BB%A4%E3%83%96%E3%83%AD%E3%83%83%E3%82%AF#a2463870)

TCP/IP通信でSotaに送られたメッセージを受信します。
このブロックには受信文字列に関する条件分岐を設定でき、ブロックに設定した文字列と完全一致する分岐に進むことができます。
今回の設定内容はデフォルトのままなのですが、受信した文字列が`packet`であれば上の分岐に進みます。異なる場合は下の`else`の分岐に進みます。

今回のユースケースにおいて`packet`という文字列が送られて来ないことが分かっていたので、すべてのメッセージを下の`else`の分岐で処理する想定です。

### ④[発話](https://www.vstone.co.jp/sotamanual/index.php?VstoneMagic%2F%E5%91%BD%E4%BB%A4%E3%83%96%E3%83%AD%E3%83%83%E3%82%AF#cd54ce74)

このブロックに設定した文字列をSotaがスピーカから話してくれます。腕や頭も自動で動いてくれるので可愛いです。
TCP/IP通信で受信したメッセージを話すには、このブロックの設定項目の`say_words`に`GlobalVariable.recvString`を設定します。

以下に設定手順を示します。

1. 発話ブロックをダブルクリックします。
2. 「<発話>のプロパティ」画面で以下赤枠に示した場所をクリックします
   ![発話設定開く](/img/blogs/2024/0903_sota_tcp/sota_tcp_speech_setting.png)
3. 「<say_words>の設定画面」で、「変数選択」を選択し、プルダウンから値を`GlobalVariable.recvString`に設定し「OK」を押します。
   ![発話saywords](/img/blogs/2024/0903_sota_tcp/sota_tcp_speech_setting_variable.png)

# 応用(文字列の部分一致による分岐)

TCP/IPサーバ受信ブロックでは受信メッセージに対する特定の文字列の **完全一致** に基づく条件分岐しかできないですが、
ここでは少し応用して、受信したメッセージ対する特定の文字列の **部分一致** による条件分岐をしてみます。

以下のプログラムでは、受信したメッセージに`:`(コロン)が含まれる場合は②-1の発話ブロックを、含まれない場合には②-2の発話ブロックを実行します。
2つの発話ブロックは音声のイントネーションやピッチを変えていて、②-1は②-2よりも元気よく話す設定をしています。

![部分一致プログラム](/img/blogs/2024/0903_sota_tcp/sota_tcp_project_contain.png)
(赤字番号は筆者による追記)

ここで番号を付与したブロック以外は最初に紹介したプログラムとまったく設定が同じです。

## ①[ifブロック](https://www.vstone.co.jp/sotamanual/index.php?VstoneMagic%2F%E5%91%BD%E4%BB%A4%E3%83%96%E3%83%AD%E3%83%83%E3%82%AF#lae99ffc)の設定

部分一致の判定をするためにifブロックを利用するのでその設定を説明します。

ifブロックをダブルクリックして表示される「\<ifブロック\>のプロパティ」画面の「条件分岐の設定」タブの画像を以下に添付します。

![if設定](/img/blogs/2024/0903_sota_tcp/sota_tcp_project_if_setting.png)

画面右側の「その他」で条件を設定できます。判定される条件の形式は`<left><condition><right>`となっており、上記の場合は

```java
GlobalVariable.recvString.indexOf(":")!=-1
```

という条件式になります。

ここで`indexOf`というメソッドを呼び出していますが、
**Sotaのプログラムは内部的にはJavaに変換されるため、JavaのStringが持つメソッドを利用可能です**。

上記ではJavaの[`String#indexOf`](https://docs.oracle.com/javase/jp/8/docs/api/java/lang/String.html#indexOf-java.lang.String-)による判定ということで、受信したメッセージに`:`が含まれていれば左辺は-1以外の数となり、②-1の発話ブロックが実行されます。

今回のようにJavaのメソッド呼び出しも利用した条件を設定する際は、下記画像のように「\<left\>の設定」画面で「自由入力」を選択してJavaの式を入力します。

![if条件左](/img/blogs/2024/0903_sota_tcp/sota_tcp_if_condition_left.png)

同様に「\<right\>の設定画面」でも下記のように入力します。

![if条件右](/img/blogs/2024/0903_sota_tcp/sota_tcp_if_condition_right.png)

以上のようにしてTCP/IP通信でも文字列の部分一致による条件分岐を実装できました。

# さいごに

今回は、コミュニケーションロボットSotaを用いて、TCP/IP通信でメッセージを受信する設定をしました。
GUI上でブロックを並べるだけでプログラミングができるので作っていて面白かったです。
内部で利用している言語がJavaなので、より複雑なこともできることが分かりました。

# 参考情報

[Youtube-【Arduino関連】VS-RC202とSotaを連携 ～VS-RC202とSotaでTCP/IP通信～](https://www.youtube.com/watch?v=bdosn2wlmp8&t=57s)