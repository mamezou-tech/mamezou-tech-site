---
title: 豆蔵社員のリモートワーク環境ご紹介 その7 オンライン研修の快適な配信を目指して
author: toshio-yamaoka
date: 2022-08-10
tags: リモートワーク環境
---

## はじめに

教育グループに所属する山岡です。ついに豆蔵HHKB勢初のリモートワーク環境の紹介になります。と言っても今回は残念ですがHHKBには触れません。

私は、2020年春のコロナ騒動以前から zoom や slack などを組み合わせオンライン上で仕事や大学院での授業を行ってきております。仕事では主に関西のパートナーさん、大学院では全国に散らばる学友と日夜オンラインでコミュニケーションを取り合っておりました。そのような経験から場所に縛られない働き方が今後5～10年のスパンで社会に浸透すると感じていました。

皆さんご存知のように2020年春から新型コロナ感染症が日本で蔓延し、IT業界では自宅で仕事をするという事が当たり前になりました。前述の通り、そのうち自宅で仕事をする世の中がやってくると考えていたので自宅を選ぶ際、落ち着いて仕事ができるような間取りを重視しました。新型コロナ感染症のおかげで（せいで）早くもその効果を実感しています。

今回は、PCだけでなくその周辺も含めて自宅のリモートワークの環境を紹介いたします。

## 筆者の働き方

8月に入り、私が所属する教育グループは新人研修が概ね終わり一息ついているところです。
研修の場がリアル対面からオンラインへ移行して3年目になります。この3年の年度始め4ヶ月は新人研修講師を担当しており、朝から晩までオンライン臨戦状態で次のよなことをしておりました。

 - オンライン会議システムを使った講義（zoom や Teams）
 - チャットシステムをつかった受講者、講師陣とのコミュニケーション（slack や Teams）
 - 受講者成果物のチェック（Google Workspace）
 - DaaS環境を使った演習（Azure）

担当するお客様により、zoom + slack + Google Workspace であったり、Teams だけで完結していたりします。利用するTool に依らずオンライン研修を実施する上では次の3つのポイントが重要と考えます。

 - 綺麗で安定した映像・音声の送受信
 - 円滑な情報提示
 - 受講者を含めた場の状況把握

この3つのポイントに関しては後述いたします。

## 全景
![全景](https://i.gyazo.com/cfc976b1637c388a0ee7b9f8292d8bed.jpg)
まずは全景から、PCは2台使っています。

 - 研修実施用のデスクトップPC(机下に配置)
自作PC（AMD Ryzen 5 3500、32GB、RADEON RX560 X 2枚、有線LAN接続、モニター4出力）
 - 業務と研修の映像・音声確認用のノートPC
会社貸与のLet's NOTE(Core i7-10810U、16GB、UHD Graphics、WiFi接続)

オンライン研修の講師を担当すると、デスク上にアナログ資料を展開したり後述する卓上書画カメラでPC部品などを撮影したりするため奥行きが必要になります。更にデスク上に映像・音声用機材も設置するためとにかく広さが要求されます。

![メインデスク](https://i.gyazo.com/db429fed0dfe9739a3ff35d432a68452.jpg)

そのため、デスクは IKEA で購入した 150 cm X 75 cm のテーブルトップを使っています。今現在 IKEA オフィシャルでは販売していないサイズのようです。元々はダイニングテーブル用に購入したのですが、仕事部屋が確保できるようになってからは仕事用として使っています。

デスク１つでは足りないため、手作りデスクがもう１つ 85 cm x45 cm を L字構成で配置してあります。

椅子は、昔々10年程前に中古で購入したオカムラの[Baron](https://product.okamura.co.jp/ext/DispCate.do?volumeName=00001&lv0=%E3%83%81%E3%82%A7%E3%82%A2%EF%BC%8F%E3%82%BD%E3%83%95%E3%82%A1&lv2=%E3%82%BF%E3%82%B9%E3%82%AF%E3%83%81%E3%82%A7%E3%82%A2&lv3=%E3%83%90%E3%83%AD%E3%83%B3)を末永く大切に使っています。
お気に入りの点は、オールメッシュ・Extra High Back です。この椅子のおかげで朝から晩まで座っての研修を担当できています。

## 綺麗で安定した映像・音声の送受信

### デスクトップPCの利用

全景でも記述した通りオンライン研修の実施・運営にはデスクトップPCを利用しています。テレビ会議システム zoom は、10名程度のオンライン会議を実施する分には高いPCスペックは要求されません。しかしオンライン研修を実施するとなると話は別です。参加者が100名を超え、更に頻繁にブレークアウトルームの機能を使ったりするとCPU性能が要求されます。ブレークアウト開始時にタスクマネージャーのCPU使用率を見てみると面白いと思います。

### ネットワークは有線接続
![有線ネットワーク](https://i.gyazo.com/8ba2d68547f95f280f8efe21d0b34bc7.jpg)

「ネットワークは有線接続」これ重要です。もう一度言いますね。「ネットワークは有線接続」
オンライン研修を安定して運用するには、PCスペックだけでなく高速で安定したネットワーク接続が不可欠です。そのためには無線接続ではなく有線接続が必須です。

リモートワークが始まった当初は、ルーターから仕事部屋までLANケーブルを床にはわせて接続していましたが、あまりに不格好だったのでLANケーブルを壁内に通すようにリフォームをしました。それにあわせ、ルーターやL2スイッチ、無線APのグレードアップをし自宅ネットワーク構成を1から見直しをかけました。

### 映像・音声デバイス
![カメラとマイク](https://i.gyazo.com/24e7e7997b5d6610a4c5d66ed86f0f62.jpg)

カメラは研修撮影用に会社で購入したCANONの[XA20](https://faq.canon.jp/app/answers/detail/a_id/73232/~/%E3%80%90%E6%A5%AD%E5%8B%99%E7%94%A8%E3%83%93%E3%83%87%E3%82%AA%E3%82%AB%E3%83%A1%E3%83%A9%E3%80%91xa20-%E6%A9%9F%E7%A8%AE%E4%BB%95%E6%A7%98)を使っています。講師の写りが良いからといって研修が良いものになるわけではないですが、業務用ビデオカメラなので映像は明るく色合いも綺麗です。

オンライン研修において映像は一瞬多少乱れても何とかなるのですが、音声が聞き取りづらいと相手側に強いストレスを与えてしまいます。環境ノイズを抑え、声のボリュームレベルも整えられるような機材構成と設定に気を使っています。

マイクはSHUREの[MV7](https://www.shure.com/ja-JP/products/microphones/mv7)というダイナミックマイクを使っています。このマイクは周囲の雑音はなるべく拾わず、マイク正面で話している声を中心に拾ってくれる優れものです。ダイナミックマイク単体ですと音声レベルが低いため、マイクとPCの間には、マイププリアンプ Focusriteの[ISA One](https://kcmusic.jp/focusrite/isa-one/)を挟んでいます。ISA one の出力を ビデオカメラ XA20 のマイク入力に入れ、マイクからの音声はビデオカメラの HDMI 信号に載せて、ATEM Mini（後述） 経由で、PCに取り込んでいます。また、音声はATEM Mini のイコライザー機能を使い男性の声がはっきり聞こえるように加工しています。低音域を抑えたり、声の中心1kHz周辺を高めたり、耳障りな特定域を落とすような設定をしています。

## 円滑な情報提示

### ATEM Mini Pro を中心とした画面共有の切り替え
![配線図](https://i.gyazo.com/2eab8179ab454c0c6719ac79afa90026.png)
もう [ATEM Mini Pro](https://www.blackmagicdesign.com/jp/products/atemmini) なくしてオンライン研修は成り立ちませんという位、神デバイスです。

zoom などのテレビ会議システムはPCの画面（アプリのウィンドウやデスクトップなど）を共有表示するための機能が備えられています。オンライン研修では画面共有機能を使って次のようなものを表示します。

 - PDFやワード、パワポの画面
 - eclipse などのIDEの画面を見せながらのライブコーディング
 - フリーハンドの図を描く

これらの表示ウィンドウを適宜切り替えて受講者の理解へとつなげます。

ATEM Mini を使わな場合、切り替えの都度 zoom を操作しなくてはいけません。都度都度、共有するウィンドウを選択していては研修のテンポが乱れてしまいます。また、画面切り替えの待ちが発生し時間が無駄になります。

切り替え操作に関して、画面の共有ボタンを押す、表示したい画面を選択する、zoom が切り替わる。この一連の流れで 15秒程度かかったとします（PCスペックが低いと時間がかかります）。1時間のうちに10回切り替えると、計2分半です。4%です。1日6時間とすると14分が切り替えの時間となります。もったいない。14分もあったら小さな演習1つ分位の時間が確保できてしまいますね。

時間節約のため、画面切り替えが頻発する講義時間帯は、zoom の画面の共有で第2カメラのコンテンツを選択し、ATEM mini の映像を常に画面共有しておきます。

これで、zoom 側の操作を伴う画面切り替えは発生せず、ATEM Mini の HDMI入力ソース切り替えボタンをポンと押すだけで一瞬で共有画面の内容を切りけることができます。

ATEM Mini へのHDMI入力は、ビデオカメラXA20の映像、デスクトップPCのマルチディスプレイ出力②を分配器で分けた映像、液晶ペンタブレットの映像、書画カメラの映像の計4つです。これら4入力をボタン押すだけでzoomの画面共有を簡単に瞬時に切り替えることができます。

更に、私の配線構成では次のようなことが可能です。
講義の進行に合わせ次に画面共有したいPDFやパワポのウィンドウを ATEM Mini つないでいないディスプレイ①に表示しておき、画面共有したくなった時に画面共有したいウィンドウをATEM Mini に繋がっているディスプレイ②へドラッグして移動させてあげれば zoom の操作なしで迅速・簡単に画面共有できます。

### ATEM Mini への接続機器
![ATEM Mini](https://i.gyazo.com/9d3ce68cd6d13c8df361ab69b7664241.jpg)
ATEM Mini へのHDMI入力をまとめておきます。

 - ビデオカメラ CANON XA20
 - PCのディスプレイ出力②
 - 液晶ペンタブレット XP-PENの[Artist 15.6 Pro](https://www.storexppen.jp/buy/artist15_6pro.html)
デジタルドキュメントへのペン書き込みはコチラの液晶タブレットを活用しています。

 - 書画カメラ IPEVOの[VZ-R](https://www.ipevo.jp/vzr.html)
インフラ研修でPCパーツの実物（CPUやGPU、マザーボードなど）を投影する際に活躍しています。

## 受講者を含めた場の状況把握

### メインPCは4画面出力
オンライン研修の際メインで利用しているPCは4画面のマルチディスプレイ出力です。出力構成は以下です。

 - ディスプレイ出力① EIZO FlexScan EV2336W
 - ディスプレイ出力② EIZO FlexScan EV2336W
 - ディスプレイ出力③ DELL U2212HM
 - ディスプレイ出力④ 液晶ペンタブレット XP-PEN Artist 15.6 Pro]

オンライン研修の使い分けとして
出力①は、講師用の参考資料表示や、次に画面共有するためのウィンドウ表示
出力②は、前述のように zoom の第2カメラの共有でデスクトップ全体を画面共有
出力④は、ペンで手書きするための液晶ペンタブレットの画面

出力③は、重要ポイントで zoom のギャラリービューや Google Workspace で共同作業しているファイルを表示します。出力②や④を用いてテキスト内容を解説したり板書しつつ出力③のギャラリービューで受講者の反応を見て話すスピードや話す内容を調整しています。

### 2台目PC(業務用ノートPC)

会社貸与のノートPCは、社内リソースへのアクセスや事務処理的な業務などを行います。また、メインPCからの配信（画面共有や音声）が正しく行えているかを確認するために使っています。

メインPCだけで配信をしていると相手側に映像や音声がどのように届いているのかわからないため、2台目のPCからも zoom などに接続し受講者視点でオンライン会議の場の映像・音声を確認するようにしています。

## その他

配線は悩みのタネです。
![配線](https://i.gyazo.com/c36c2427e64061ed6574a1cddd1f42ca.jpg)


## おわりに

メインPCは2年前に組み毎日仕事で酷使しているため、近々新調予定です。部品は購入済みで次はIntelへ乗り換えです。
