---
title: 奥さんが「ガスコンロつけっぱなしで危ない思いをしたので警告音出るものがほしいなぁ」というのでメディアプレイヤーを作ってみた
author: shuji-morimoto
date: 2024-07-30
tags: [電子工作, メディアプレイヤー, summer2024]
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2024-summer/
image: true
---
この記事は[夏のリレー連載2024](/events/season/2024-summer/) 2日目の記事です。

![](/img/blogs/2024/0730_simple-media-player/image_top.jpg)

5月のゴールデンウィークも過ぎたある日

僕「ちょっと秋月[^1]行って部品買いたい」
奥さん「え～、また～？」
僕「WIFIモジュール[^2]使ってスマホからUSB機器とかの電源オン・オフできたら便利だと思わない？なんかやりたいことない？」
奥さん「う～ん・・・あ、そう言えばこの前、ヒヤッとしたことがあって」
奥さん「料理中に別のこと思い出して、そっちのことやってたらガスコンロに火をつけてるの忘れてて・・・」
僕「え？あぶな」
奥さん「ガスコンロつけっぱなしで危ない思いをしたので警告音出るものがほしいなぁ」
僕「そんなん百均とかでないの？キッチンタイマーとかダメなん？」
奥さん「私の思うようなのがないの」
僕「あ(笑)、デザイン性とか求めてるんだ」


こうしてMYプロジェクトが開始されました。

:::alert
話の流れであっただけでMYプロジェクトではWIFIモジュールは利用していません。
:::

[^1]:ホビー用電子回路部品の購入と言えば秋月電子通商ですね
[^2]:ESP32シリーズはWIFIモジュールを内蔵したマイクロコントローラでWEBサーバー機能もあるのでスマート家電にはもってこいのIoT製品です


# V字モデルを使った開発手法

MYプロジェクトではIT製品開発の手法の一種である[V字モデル(Vモデル)](https://ja.wikipedia.org/wiki/V%E3%83%A2%E3%83%87%E3%83%AB)を採用しました。自分が作りたいものを作るのではなく奥さんが欲しているものを汲み取って作ることを最優先としました。

![](/img/blogs/2024/0730_simple-media-player/v_model.png)

|V字モデルの作業|MYプロジェクトでの作業|
|-------------|----------------------|
|要件定義(要求分析)|要望をヒアリング|
|外部設計(基本設計)|外装や操作に関する設計|
|内部設計(詳細設計)|内部の電子回路の設計|
|開発(実装・コーディング)|楽しい工作の時間|
|単体テスト|各回路毎の動作検証や調整|
|結合テスト|全体を通して動作検証や調整|
|受け入れテスト|実際に使ってもらってフィードバックを得る|

まあ、ぶっちゃけV字モデルは後付けですが普通にモノ作りすればこのような流れになりますよね。
作業が開始したら次の作業に向けて曲がりなりにも何とかこなしていきます。各テストでは要件定義や設計時の内容を確認・検証しています。



# 要望をヒアリング

一体どのようなものを求めているのかを理解することから始めました。いろいろ質問してみると以下のような要望を持っていることがわかりました。なお、カッコ内は私の心の声です。

- 持ち運べるサイズ(当然)
- 音の再生は自分でオン・オフする(タイマーじゃないんか!?)
- 音楽は１曲だけ鳴ればいい(１曲だけとは勿体ないなぁ)
- かわいい感じの音がほしい(OK)
- ボリュームの調整ができればいいね(自分もそう思う)
- ボリュームの調整は左手でしたい(凄いこだわりですね)
- 中を開けたりはしない(電池交換とかメンテナンスは僕がするのか)
- 1000円くらいとかでもいい(お金は僕が出すのですが・・・) 
- プラスチックじゃなくてアルミケースがいい(絶対1000円じゃできない)
- 昔懐かしい、レトロ感があるものがほしい(いいねぇ)
- キッチンで利用するから防水されてたらいいなぁ(たぶん無理)
- 縦置き、横置きどちらもできるようなの(え？)
- 紐で吊るせるようにリング状の穴があればいい(置くんじゃないんかい)
- ネックレスみたいに首からぶら下げて外出してみたい(笑)

どうやらいろんな使い方を考えているようです。いくつか想定外の要望がありましたが、なんとなく完成イメージを共有できました。ラジカセっぽいもの(ソニーのWALKMAN?)をイメージしているようです。


# 外装や操作に関する設計

ヒアリングした結果、操作としては音をON/OFFするスイッチとボリューム調整の部品があれば良さそうです。あとは紐を付けるリングですね。

## 部品の検討

ON/OFFスイッチはアナログ感があるトグルスイッチとし、ボリューム調整もアナログ感がでるようにツマミとし無段階で音量を調整できるものとしました。

音楽再生は以前作成した<[クリスマスイルミネーション](/blogs/2023/12/22/electronic-kit/)>のものと互換性があるMP3モジュールを利用します。

スピーカーは音楽再生モジュールと同封の余っていたものを利用することとしました。スピーカーはケースに穴を開けて埋め込めばいいけどどうやって埋め込むのか不安がありました。

紐で吊るすにはリング状の穴の開いたボルトがあればケースにそのままボルトを締め付ければよいかなと軽い気持ちでいました。これが後で大苦戦することになります。

電源はなるべく軽くしたいため単３電池一本(1.5V)で動作するようDC-DC昇圧コンバータで1.5Vから3.3V(MP3モジュールの最小動作電圧)に昇圧して利用することとしました。

基板、抵抗、コンデンサ、配線ワイヤー、スペーサー、ネジ等の基本的なものは揃っています。ケースは基板が収まるなるべく小型のアルミケースで開け閉めが簡単にできるものとしました。

また以前の<[反省](/blogs/2023/12/22/electronic-kit/#ケース)>を元にケースの蓋を開け閉めするときケース取り付け部品(ON/OFFスイッチとスピーカー)と基板との配線ワイヤーが外せるようにXHコネクタで接続することとしました。


## 部品の購入

秋月にGOです。なお店内は常に混んでおり部品のあるケースを探すにも時間が掛かるため前もって部品表を作っておきます。・・・が、半分くらいは別の部品を買ったり、シリーズものを追加で買ったりしてしまいます。

### 秋月で購入したもの

- [単三電池ホルダー](https://akizukidenshi.com/catalog/g/g100308/)
- [防水式トグルスイッチ(パネル用)](https://akizukidenshi.com/catalog/g/g116176/)
- [トグルスイッチ用ON/OFF文字板](https://akizukidenshi.com/catalog/g/g116813/)
- [トグルスイッチ用ラバーフード(緑)](https://akizukidenshi.com/catalog/g/g105914/)
- [カーブ特性が直線の500Ω小型ボリューム(パネル用)](https://akizukidenshi.com/catalog/g/g115216/)
- [アルミケース](https://akizukidenshi.com/catalog/g/g109534/)
- [アルミのツマミ](https://akizukidenshi.com/catalog/g/g112202/)

スピーカーやケースの防水性能は０なのですがとりあえずトグルスイッチは防水性(IP67[^3])のものを購入。濡れた手でトグルスイッチをON/OFFしても問題ありません。
ツマミは奮発してアルミ製にしました。ケースと調和が取れています。
ON/OFF文字板とラバーフードはちょっとしたアクセントです。

[^3]:IP67 6:塵埃の侵入がない、7:一時的に水中に沈めた場合でも機器が影響を受けない

### その他のパーツ

- XHコネクタとDC-DC昇圧コンバータはAliExpressからロットで購入済み(安さには勝てない)
- MP3モジュールは[DFPlayer mini 互換機](https://www.amazon.co.jp/gp/product/B076F5LMSB)をアマゾンで購入
- 音源は[ポポーポポポポ♪で有名？な「呼び込み君」の音源](https://mysound.jp/song/4541889/)をヤマハの音楽配信サイトで購入
- マイクロSDカード(4GByte)はその辺にあったものを利用
- [丸カンボルトのボルトのみ](https://www.yodobashi.com/product/100000001004521519/)をヨドバシ・ドット・コムで購入

近くにあるスーパーの鮮魚コーナーでは「呼び込み君」がポポーポポポポ♪と奏でており、思わず口ずさんでしまうポップな音色は頭から離れません。音楽は最初からポポーポポポポ♪に決めてました。

リング状の穴があるボルトは秋葉のパーツショップを探しまくりましたが思ったものが無く探すのに苦労し丸カンボルトというものを見つけました。これをM6六角ナット２つでケースを挟むように取り付けます。


# 内部の電子回路の設計

回路図は<[クリスマスイルミネーションの回路図](/blogs/2023/12/22/electronic-kit/#回路図)>の音楽再生モジュールと遅延回路をそのまま利用するためすぐにできました。

![](/img/blogs/2024/0730_simple-media-player/circuit_diagram.png)

後は以下の取付を考えるだけです。
- 単三電池ホルダー
- DC-DC昇圧コンバータ(DC1)
- ON/OFFトグルスイッチ(SW1-1)
- 抵抗(R3)と可変抵抗(VR1)を直列接続して最小N(N:100-300程度)Ω、最大700Ωの範囲になるように調整する
- 音楽再生を1曲目(0Ωでショートさせる)か2曲目(R1+R2の3KΩでショートさせる)かを切り替えるスイッチ(SW2-1)

スピーカー(SP1)とON/OFFトグルスイッチ(SW1-1)はケース上面、可変抵抗(VR1)とツマミはケース側面に取り付けます。

再生する音楽は切り替えることができ、1曲目「ポポーポポポポ♪」、2曲目「ポポーポポポポ♪8bitピコピコ音バージョン」にしています。どっちがいいか聞いてもらったところ1曲目が良いとのことでした。そのためスイッチ(SW2-1)を0Ω側に設定してあります。このスイッチはケースを開けないと変更できません。


# 楽しい工作の時間

いよいよ回路の作成とケースの加工となります。

## 配線・半田
基板は[ブレッドボードパターン](https://akizukidenshi.com/catalog/g/g104303/)のシルク[^4]印刷がされているものを利用。
配線は最初からブレッドボードと同じになっているためブレッドボードのように基板に部品を配置できます。しかし、ブレッドボードとは異なり表面はモジュールのみを配置して綺麗に見せたいので配線ワイヤーは裏面で半田しています。

基板の裏面
![](/img/blogs/2024/0730_simple-media-player/image_circuit.jpg)

なるべく配線の数が少なくなるように複数箇所でパターンカットしています。そのためブレッドボードでは組めないレイアウトで抵抗などを配置しています。


[^4]:表面に印刷されたガイドや部品番号

## スピーカーの取り付け

スピーカーはアルミケースに穴を開けて固定する必要があります。直径50mm程あるため、1回でこれほど大きな穴を開けることができません。そのため以下の工程で穴開けしました。

1. コンパスで2重の円弧を引く
1. 内側の円弧上にポンチで窪みを付ける
1. 電動ドライバーでポンチの位置に小さなドリルで穴を開ける
1. 3.からもう少し大きいドリルで穴を開ける(外側の円弧に当たらないように)
1. ヤスリを使って穴同士を繋ぎ大きな穴を開ける
1. 円弧の周りをきれいにヤスリ掛けする
1. スピーカーに瞬間接着剤を付けてこの穴に固定する


穴あけ
![](/img/blogs/2024/0730_simple-media-player/image_hole.jpg)



ヤスリ掛け
![](/img/blogs/2024/0730_simple-media-player/image_rasp.jpg)


## ケースに収納

アルミケース背面に穴を開けて、基板にスペーサーを挟んでアルミケースにネジ止めします。ゴム足がついているため少し浮いています。

丸カンボルトは足が長くMP3モジュールに当たってしまうためカットする必要があるのですが糸鋸で油をさしながら根気よく削りました。これが一番大変な作業でした。

部品取り付け工程を大分端折っていますがケースに収めたものが以下です。
![](/img/blogs/2024/0730_simple-media-player/image_internal.jpg)



# 各回路毎の動作検証や調整

遅延回路は以前作ったものなので問題なく動作しました。

MP3モジュールのLEDの光はケース内部で光っているけど見えないので無駄で電力も消費します。
LEDを利用した回路は並列で回路を組むことが多いのでLEDを外しても音楽再生には影響はないだろうと思い半田コテで焼き切りました。(LEDなしでも再生できました)

ツマミによるボリューム調整ですが最初はR3を100Ωとして可変抵抗値を100Ω～600Ωとしましたが100Ωだと多くの電流が流れ(音量が大きくなって)電力不足で音楽が途中で止まるときがあったため200Ωとしました。

曲目切り替えスイッチ(SW2-1)は当初ケース側面に取り付ける予定でしたがその必要はないとのことでしたので内部に収めたままとしています。

電池は最も重量があり重心バランスをとるため中央に配置する必要があります。しかし電池ホルダーが大きすぎて収まり切れないため斜めにレイアウトしました。これがいい感じで中心に収めることができました。

ボリューム調整ツマミは基板に当たってしまい入らなかったので少し基板を削っています。

ON/OFFスイッチは基板にあたるかどうかのギリギリでした。


# 全体を通して動作検証や調整

麻紐の長さ調整、縦置き、横置き時の重心バランスの確認、音楽再生時の前後の空白時間のカット、音楽再生時の振動テスト、ON/OFFスイッチの入り具合などを確認しました。

基板をケースに収めるとブレッドボードでの配線に比べて各段に耐久性の向上が実感できました。多少ラフに扱ってもまったく壊れる気配がありません。


# 実際に使ってもらってフィードバックを得る
この記事が公開されるまでは開発中のため実はまだ納品していません。音楽や見た目は気に入っていただけたようですのでまずは第一関門突破です。
本当に首からぶら下げて外出するのか気になるところですが末永く使ってくれれば幸いです。

それでは完成したものをご覧ください。`音が出ますのでご注意ください!!`

<video src="/img/blogs/2024/0730_simple-media-player/demo.mp4" style="max-width: 100%;" poster="/img/blogs/2024/0730_simple-media-player/thumb.png" preload="none" controls></video>

ボリューム調整は左手でということでしたので反時計回りで音量が大きくなるようにしています。

:::info
スピーカーは裸のときよりもケースにはめ込んでケースを密閉状態にしているときのほうが音が大きく聞こえるような気がしました。調べてみると音はスピーカーの前だけではなく後ろにも進むので密閉されていると箱の中で空気のバネの力が生じて振動板の動きが制御されてシャープな音の反応となるとのことでした。
:::

# 最後に
[V字モデル](#v字モデルを使った開発手法)の開発手法でメディアプレイヤーを作ってみましたが、実際の作業は「要件定義」から「開発」は何度も繰り返しました。やってみないとわからないことがあるため少しずつ改良を重ねていく感じです。どちらかというと一人でスクラム(Scrum)のスプリント(Sprint)を繰り返した感じです。なるほど失敗のリスクが軽減されるというのが実感できました。
