---
title: 電子工作でクリスマスイルミネーションにチャレンジ
author: shuji-morimoto
date: 2023-12-22
tags: [電子工作, クリスマス, advent2023]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
image: true
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2023](/events/advent-calendar/2023/)第22日目の記事です。

あと数日でクリスマスがやってきます。街中いたる所でイルミネーションが輝いています。この輝きを家でも鑑賞すべく電子工作でクリスマスイルミネーションにチャレンジしてみました。

![](/img/blogs/2023/1222_electronic-kit/xmas_illumination.png)


目標は以下としました。
- マイコンは利用しない
- ツリーに近づくと人感センサーで反応する
- ツリーに飾り付けたLEDを交互に点灯させる
- 5V電池駆動
- 回路はブレッドボード上に単線ジャンパーワイヤーで結線(見た目も意識)
- なるべくありもので作る[^1]

[^1]:最終的には不足したトランジスタと音楽再生モジュール[スピーカー付き]のみ新規購入しました


## 電源
電源は余っていた9V電池(7Vしか出ない)を5Vに降圧して利用しました。以前作成した3端子レギュレータを使ったシンプルな回路を電源としました。
この3端子レギュレータは6V～16Vの電圧を5Vに変換します。消費電流が多い場合、熱を発生するためヒートシンクが必要との事です。
今回は大電流(2Aとか)を長時間流すことは無いため不要ですが、以前作成したものをそのまま利用しています。


## ツリーの装飾

![](/img/blogs/2023/1222_electronic-kit/xmas_tree.png)

ツリーに飾り付けするLEDは電子工作で利用する一般的なものを利用しています。黄、赤、緑、青のLED8個の端子とワイヤー16本をハンダ付けし延長しています。
またツリーは金属製のためワイヤーは絶縁の必要があり、ハンダ部分は絶縁皮膜加工しています。

当初、ツリー自体をGND(0V)として全LEDのカソード(マイナス端子)をツリーに接続することでワイヤー数を削減しようと思っていました。しかしLEDを交互に点滅させる回路の仕組み上、1つのGNDとはできない(知識不足)ため系統ごとGNDをまとめました。最終的には計10本のワイヤーで回路に接続するよう修正しました。

LEDを直列接続すればワイヤーは４本でシンプルになります。しかしLEDは色ごとに必要な電圧(順電圧)が異なるためバラバラの明るさになってしまいます。そのため並列接続としてそれぞれのLEDに抵抗を繋げて流れる電流を制限し明るさを調整しています。


## トランジスタの動作

作成した回路ではトランジスタが大活躍しています。トランジスタは電気的なスイッチになり、電流の流れをON/OFFしたり小さな電流で大きな電流を制御したりします。

![](/img/blogs/2023/1222_electronic-kit/transistor.png)

B:ベース、C:コレクタ、E:エミッタと呼ばれます。
ベース-エミッタ間の電圧が0.6V以上になるとB-E間に電流が流れます。これでスイッチがONとなります。この電流が呼び水となりC-E間に電流が流れるようになります。このときC-E間に流れる電流はB-E間に流れる電流の100倍以上流すことができます。0.6Vを境に小さな電流で大きな電流の量を調整したり、電気的にON/OFF制御できるというわけです。



## 回路図

初めて回路図を見様見真似で描いてみました。使い方が簡単な回路図用のCADである[BSch3V](https://www.suigyodo.com/online/schsoft.htm)というCADを利用しました。

![](/img/blogs/2023/1222_electronic-kit/ILLUMINATION_AND_SOUNDS_BY_PIR.png)

最終的な回路[^2]は上図のようになりました。
初期バージョンは中央下の人感センサー(PIR1)と右半分の点滅回路のみでしたが、後で左半分の音楽再生回路を追加しました。

[^2]:回路を構成するトランジスタ(BC547B)が不足し実際の回路では異なるトランジスタ(2SC1815)ものを使用している箇所があります


## 点滅回路

LEDの点滅は[非安定マルチバイブレータ](https://ja.wikipedia.org/wiki/%E3%83%9E%E3%83%AB%E3%83%81%E3%83%90%E3%82%A4%E3%83%96%E3%83%AC%E3%83%BC%E3%82%BF#%E9%9D%9E%E5%AE%89%E5%AE%9A%E3%83%9E%E3%83%AB%E3%83%81%E3%83%90%E3%82%A4%E3%83%96%E3%83%AC%E3%83%BC%E3%82%BF%E5%9B%9E%E8%B7%AF)という回路を組んで実現しています。回路設計の基礎的なものだそうです。ソフトウェアでの「Hello World」、3Dモデルでの「teapot」、マイコンでの「Lチカ」といったところでしょうか？(それよりも難しい気がします・・・)
![](/img/blogs/2023/1222_electronic-kit/illumination_circuit.png)

中央の抵抗が並んでいる下にLEDのケーブルを差し込みます。2つのコンデンサが交互に充電・放電を繰り返してトランジスタのスイッチを制御し左右どちらかのみが通電することでLEDを点滅させています。

電圧や電流の流れが複雑で細かな挙動は理解できていません。直観的に抵抗値やコンデンサ容量を大きくすれば点滅がゆっくりになるのは理解できます。適度な点滅速度になるようにR5,R6,C1,C2を調整しました。

写真右下のトランジスタがQ5で点滅回路の電源スイッチになります。後でPIR1のOUT(ピン2)を繋げます。


## 省電力化と明るさ調整
ツリーの点滅は消費電力を軽減させるため大きめの抵抗を設定し、流す電流を絞っています。その副作用で点滅ではなくホタルの発光のように少しずつ明暗するような幻想的な光になりました。


## PIR モーションセンサー
PIR (Passive Infra-Red) モーションセンサーは人が発する赤外線量の変化を検出するセンサーで、近くにいる人の動きに反応します。動くというのがポイントでじっと止まっていると検知しないようです。

今回利用したセンサーは可変抵抗によって検知距離や検知信号発生時間を調整できます。検知距離を3メートル程度、検知信号発生時間を30秒程度にしています。

検知信号がONの時、PIR1のOUTがON(HIGH)になります。このとき、点滅回路の電源がONになるようにPIR1のOUTをQ5のベースに繋げています。また、後述する音楽再生回路の電源もONになるようにQ3のベースにも繋げています。


ここまでで目標達成の目処がついたのでさらに以下の目標を立てました。
- LEDの点滅とともに音楽を再生する
- スケルトンケースに入れて持ち運び可能にする


## 音楽再生回路

回路図の左側の音楽再生モジュールと PIR センサーを組み合わせたものが以下になります。

![](/img/blogs/2023/1222_electronic-kit/pir_and_sound_circuit.png)

写真のPIR センサーの下にあるトランジスタが回路図のQ3となり、右の音楽再生モジュールの電源スイッチとなります。音楽再生モジュールにはmicroSDが刺さっています。スピーカーのボリュームは抵抗R16の抵抗値で調整しています。


## 音楽再生モジュール
音を奏でるには様々な周波数の波を合成し電圧変化に置き換える必要があります。さすがに回路を組むことはできないため音楽再生モジュール[^3]を利用しています。

このモジュールはよくできておりmicroSDにmp3ファイルを書き込んでおいたもの(複数ファイル可)を再生できます。しかも外部からのシグナル信号により再生、停止、音量調整、繰り返し、曲選択などができます。

[^3]:DFPlayer Mini。アマゾンでスピーカー込み890円でした


## 再生タイミング処理
シグナルを発生させるにはADKEY_1(ピン11)から出ているHIGHの線をGNDに落とす必要がありますが、その前に音楽再生モジュールが起動された状態になっている必要があります。そのため[パワーオンディレイ回路](https://cc.cqpub.co.jp/system/contents/2660/)を参考にしました。

パワーオンディレイ回路はその名の通り電源がONした時に動作を遅延させて実行する回路です。JavaScriptでいえばsetTimeout()関数のようなものでしょうか。回路図の左下の抵抗R14,R15、コンデンサC3、トランジスタQ4で構成されています。トランジスタQ3のコレクタ-エミッタ間が導通すると音楽再生モジュールの電源が入ります。コンデンサC3の電圧が0Vから少しずつ上昇し、0.6Vに達するとトランジスタQ4のコレクタ-エミッタ間が導通しADKEY_1がGNDに落ちて音楽が再生されます。落ちるまでの時間は点滅回路の点滅周期の調整と同じようにR14の抵抗値とC3のコンデンサ容量で調整します。

しかし2回目に電源をONしても音楽は再生されませんでした。電源をOFFにするとコンデンサC3に蓄えられた電荷は逃げ場が無いため蓄えられたままの状態となり電池のようなものになります。そのため2回目に電源をONした時すぐに0.6V以上の電圧がかかった状態になります。このため音楽再生モジュールの起動時にトランジスタQ4もONとなりADKEY_1がGND状態のままのためシグナル信号が発生せず音楽が鳴りませんでした。

これを解消するため、コンデンサC3と並行に抵抗R15を配置し抵抗値を10kオームとしました。こうすることで電源ON時はほとんどR15に電流は流れません。しかし電源OFF時、コンデンサC3で蓄えられた電力を1秒程度で消費するようになりました。電源ON時は何もせずOFFになると動き出すなんてグリム童話の小人の靴屋みたいで面白いです。


## ケース
余っていたプラケースを加工して使っています。リューターや電気ドリルを使い蓋部分に穴を開けワイヤーを通しています。設置のことをあまり考えていなかったため、スピーカーとツリーは内部回路と結線したまま蓋を閉じる必要があり困難を極めました。
また、若干ケースが深かったため底上げのために「かまぼこ」の板をおいています。取っておくものですね。
時間がなかったため、スピーカーとPIRセンサーは固定せずぶら下がった状態です。


## 消費電流

PIRセンサーが未検知のときと検知したときの各モジュールの消費電力を測定してみました。

|モジュール|未検知時|検知時|
|:--:|:--:|:--:|
|PIRセンサー|0.1mA|1.6mA|
|ツリー(LED)|0mA| 10～15mA|
|音楽再生モジュール|0mA|30mA|
|スピーカー|0mA|0.1mA|
|全体|0.1mA|40～45mA|

PIRセンサーは常に電流が流れていますが消費電流0.1mAと非常に少ないです。その他のモジュールはPIRセンサーが検知信号を発生している間の数十秒程度しか動作していません。また、検知時も全体で最大45mA程しか流れていませんでした。

LEDは8個ありますが点滅させているため実際は4個しか点灯していなく、しかも明るさを絞っているため消費電流は低いです。しかし音楽再生モジュールは思った以上に消費電流が高いです。おそらく音楽がなっている間、音楽再生モジュールのLEDがかなり明るく点灯しているためかと思います。

乾電池の容量は数百mAhらしい(数百mAを1時間利用出来る)です。仮に5Vで容量450mAhの乾電池を利用した場合、10時間くらい連続で流せるほどの消費電力となりました。


### 動画

それでは完成したものをご覧ください。`音が出ますのでご注意ください!!`

<video src="/img/blogs/2023/1222_electronic-kit/xmas_illumination_demo.mp4" width="100%" style="max-width: 800px;" poster="/img/blogs/2023/1222_electronic-kit/thumb.png" preload="none" controls></video>

ツリートップの★に某カフェの景品でゲットした黒猫サンタ(ふちねこ)がぶら下がっています。センサーは3メートル程の距離でも反応するのですが、手をかざして人を感知して鳴っていることをアピールしています😀

回路図、音楽、動画は[こちら](https://github.com/shuji-morimoto/1222_electronic-kit)からダウンロードできます。


## マイコン制御との比較

Arduinoでの「Lチカ」では以下のような例が記述されています。(500[msec]ごとに「Lチカ」させる)

```C
void loop()
{
   digitalWrite(ピン番号N, HIGH);
   delay(500);
   digitalWrite(ピン番号N, LOW);
   delay(500);
}
```

ここに追加で2個目のLEDを300[msec]ごとに「Lチカ」させたい場合、どうなるでしょうか？(またはボタンを押している間だけ「Lチカ」させたいなど)

```C
void loop()
{
   digitalWrite(ピン番号N, HIGH);
   delay(500);
   digitalWrite(ピン番号N, LOW);
   delay(500);
   digitalWrite(ピン番号M, HIGH);
   delay(300);
   digitalWrite(ピン番号M, LOW);
   delay(300);
}
```
これはループする関数の中でdelay()をコールしCPUを待ち状態にさせて「Lチカ」を実現させているため当然うまくいきません。ループのなかでsleep()するなとよく言われたものです。

Arduinoの場合マルチスレッドには対応していないため、「Lチカ」を並列に実行させることはできません。
そこで疑似的にマルチスレッドのように見せかけるようなライブラリを利用したり、100[msec]ごとに同期を取って[FizzBuzz問題](https://ja.wikipedia.org/wiki/Fizz_Buzz)みたいなことをするなどあるかと思います。

あぁ、なんと難しい。

一方、電子回路では並列回路は基本的な回路の利用方法です。いくらでも並列に処理を実行できます。「Lチカ」を回路側で実現するのもアリだなと思いました。


## 最後に

今まで回路やモジュールは「ちょっと遊んで終わり」ばかりでしたが初めて本格的なものを作ってみました。回路設計の知識がないので試行錯誤しながらでしたが何とかやりきることができ、とても満足しています。また何か作ってみたいです。

素敵なクリスマスを！ 🎄🎅✨
