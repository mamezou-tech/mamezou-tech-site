---
title: 超入門者向け アジャイルの見積もりとの付き合い方は蒙古タンメンが教えてくれる。
author: tomohiro-fujii
date: 2024-12-13
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
tags: [agile, アジャイル開発, advent2024]
image: true
---
これは[豆蔵デベロッパーサイトアドベントカレンダー2024](/events/advent-calendar/2024/)第13日目の記事です。

## ストーリーポイントは鬼門だ。
アジャイル開発に手を出した人たちが最初に悩むもののひとつが、”見積もり”である事は、多くの方に賛同いただけるでしょう。
本稿では、アジャイルの見積もりとの付き合い方について、”超”入門レベルの解説をし、読者があまりカリカリせずに次の1歩踏み出せるよう、その背中を押したいと思います。

## 完全な定義なんて気にするな
…ということを、まずはお伝えしたい。「ストーリーポイントって何を表してるのかよくわからない」と、お悩みの皆さんのために、まずは安心材料を提供しましょう

@[og](https://www.infoq.com/jp/news/2010/03/story-points/)


 (豆蔵のサイトではなくて恐縮ですが、ま、御愛嬌ということで）
 
どう安心した？
「誰に訊ねても、ブレのない完全な定義なんてものはない」ということが、わかっていただけましたか？

だから、完璧に理解しなくても大丈夫です。

それよりも、もっと大事なことがあります。

アジャイルの見積もりの特徴としてよく紹介される以下のテーマについて、振り返りがてら整理して、見積もりとの付き合いかたを確認しましょう。
１）相対的な見積もり
２）開発者による見積もり
３）抽象的な単位


## 「１）相対的な見積もり」ということ
　アジャイルの見積もりでは、”基準”を決めて、「”基準”の何倍？」という比較で数値化を行います。これを説明する例え話にはいろいろあり、例を挙げると…。
・隣り合うビルの大きさを比較する（「ビルBの高さは、Aの何倍？」）
・目の前に地図を広げて、2地点の距離を比較する（「東京駅ー品川駅間は、東京駅ー秋葉原駅間の何倍？」）
等々…。

これらの例を通して、私達は、「見積もり対象”単体”を絶対値で見積もりすることができない場合でも、比較だったら数値化できる」ということを学びます。
ただ、このような例で注意が必要なのは、「だから、見積もりができる」とはならないこと。
どちらの例も、「目の前に視覚的に存在しているモノ」を比較しています。
しかし、私たちが見積もりたいのは、「これから作るモノ」なので、今の時点では目の前には存在しておらず、前述した「ビルの高さ」や「地図上の２地点間の距離」と同様に見積もることはとても難しく思えます。

そこで開発者の登場です。

## ２）開発者が見積もる」ということ
　「単純なログインの機能と、複数のシステムを横断的につなぐシングルサインオンの機能、作るとしたらどっちが大変？」と訊かれたら、皆さんはどう答えますか？ほとんどの方が後者と答えるでしょう（たとえシングルサインオンの機能を作った経験がなくても、です）。
開発者はこれまでの開発経験から、ある機能を提示されたときに、どんなふうに作ればいいか、どんな作業をすればいいか？というものを、ある程度類推することができます。ひとりが経験したシステムの数はさほど多くは無いかもしれませんし、限界があることは否定できません。もしかしたら、提示された機能については、全くイメージを持てないこともあるかもしれません。しかし、人がたくさん集まれば、その集団には多種多様なシステムの開発経験が知見として蓄積されていることになるでしょう。

目の前に具体的かつ詳細な仕様が提示されなくても、「大体こんなことがしたい」という概略レベルの情報があれば、開発者は過去に開発した機能との類似点を見出したり、その延長線上で類推し、比較し、”大きい／小さい”を見立てることができます。
このような経験に裏打ちされた"肌感覚”が、見積もりには必要なのです。
言い換えれば、「肌感覚を持たない人には見積もれない」あるいは「肌感覚を持たない人の見積もりはアテにはできない」のです。

「肌感覚ってずいぶんと曖昧だなぁ。そんな曖昧な情報では、先に進めないよ」と、思ったあなた。
大丈夫、大丈夫。
だって、普段からやっていることなんだから。

# ドキュメント：「北極ラーメン」を攻略するためのアプローチ
「誤差があることが前提の曖昧な情報を判断材料として、行動を起こす」の実例として、ここではみんなだいすき「蒙◯タンメン　北極ラーメン」の攻略アプローチを取り上げてみたい。
※なお、書くまでもないことだが、弊社は蒙古タンメンとは資本関係がない（あったらいいのに）。単に私が好きなだけだ。しかも、かなり大好きだ。

辛い食べ物は大好きだが、しかしまだ蒙古タンメン初心者だった頃の私は、まさに身についたアジャイル魂で、ついに北極ラーメンを完食することができた。その際わたしが取った戦略を以下にご紹介していきたい。
※蒙古タンメン中本のホームページを御覧いただきながら、以下を読んでいただくと、疑似体験を共有できるかもしれない。

## ステージ１：ベンチマーキング
　…もういい歳になり、昔ほど内臓が強いとも思えなくなっていた私にとって、「いきなり北極」は、かなりリスキーな選択だった。そこでまずはベンチマークを取ることにした。ベンチマークによって、「辛さのインデックス」と「体感する辛味」との関係性を、体に覚え込ませる「肌感覚の醸成」に着手したのだ。
・各ラーメンの辛さを表現するインデックスに注目する
・インデックスの値から、相対的に辛さが低そうなラーメン（この場合、辛さ３味噌タンメンを選択）を基準値として選択する
・実食し、辛さ３で表現される辛味を体感する（経験による学習→辛さ３の肌感覚を獲得する）

## ステージ２：ベンチマーキング２
…目標の”北極”は辛さ９だ。しかし、「辛さ３の３倍」のイメージがどうしても掴めない。そこで、差分戦略を採ることにする。「北極ラーメン（辛さ９）」と「味噌タンメン（辛さ３）」の辛さギャップ”６”では想像しづらいので、小さく刻んで、「辛さが２変われば、辛味がどれくらい変わるのか」を体感することにする。フラッグシッププロダクト、「蒙古タンメン（辛さ５）」との対決だ。

## ステージ3：経験による学習と類推、そして意思決定
…オレの肌感覚が、だいぶ醸成されてきた。
・辛さ３と辛さ５は体験した（←経験による学習）
・辛さギャップ２が、実際にどれくらい辛くなるのか、その延長線上で辛さギャップ４が想像できるようにはなった。（←学習に基づく類推）
・「行けるのか、”北極”？＞オレ」（←仮説設定）
・「行けるぞ！」（←意思決定）

## 誤差の発現と、リスク対処計画の発動、そしてゴール達成へ
…やばい…辛い、思った以上に…不味、いやうまい…でも、想定以上に辛い…（←誤差の発現）
肌感覚だから誤差があるのは織り込み済みだ。それにしても辛い。負けるのか。船橋ビビットスクウェア店前の路上で膝をついて許しを請う羽目になるのか＞オレ…
いや、まだだ。だって、オレには卵とチーズトッピングがあるじゃないか！それで少しマイルドにすれば、まだ行けるぞ！（←リスク対処計画の発動）
…
勝った。１００点ではなかったが、それでも完食だ…

## レトロスペクティブ、さらなる高みを目指して、戦略の見直し
…レトロスペクティブの結果、今回のアプローチのミスは、「身体が辛味に慣れていないこと」だとわかった。次の対決に向けて、よく知られたハーフ戦略（注）を採用し、辛さに”慣れる”アプローチを採用し…
注：辛い麺と、あまり辛くない麺のハーフを同時に食し、身体を辛さに段階的に慣れさせていく戦略(←段階的構築アプローチ)


## 蒙古タンメンからの学び
ここまでを読んでいただいて、「誤差があることが前提の曖昧な情報を判断材料として、行動を起こす」ことが、わたしたちにとって、ごく普通の行動原理であり、何ら特殊なことではないということは理解できたでしょうか？

　私達はつい、見積もりだけを取り上げて、「従来のやり方」と「アジャイルのやり方」を比較し、（もしかしたら）優劣をつけようとします。
しかし、アジャイルにとって見積もりは、「事前に何かを精度高く予測すること」よりも、「次のアクションに進む判断をするための目処をつける」という役割のほうがより重要です。
たとえ誤差があっても、自分たちの肌感覚で見積もって、目処が経てば行動に移すことができ、誤差がなんらかの障害として発現しても、それを回収あるいは調整する手段があれば、結果を出すことができます。

見積もりだけを単品で採り上げてあれこれ悩むことを無駄だとはいいません（それをやるから知識が増える）。
でも、それより先に、
・見積もりによる目処から行動、そしてゴール達成へと続く一連の活動が自分たちのチームで機能しているか？
を見直すことに着手してはいかがでしょうか？

## そこでストーリーポイントの話。「３）抽象的な単位系」ということ
　冒頭の紹介のように、ストーリーポイントが何を表しているかの定義は必ずしも明確ではありません。
しかし、これまで説明してきたような”一連の活動”との合わせ技で、「行動に移すための目処を立てるための材料」としては、十二分に機能します。

では、その単位系として、人月（つまり工数）を使うとなにが問題なのでしょうか？
そもそも論で言えば、「相対的な見積もり」であることは、かならずしも「見積もり単位として人月を使う」ことを否定はしません。

しかし、実際の話し、一度「人月」という単語を耳にすると、あなたの周りにいるウォーターフォール脳を持った人たちの、脳内ウォーターフォール引き出しがパカッと開いて、あなたの見積もり値をウォーターフォールのときと同じような「精度の高い絶対値」とみなし始めます。
それを思うと、ストーリーポイントという抽象的な（＝なんだかよくわからない）単位は、それ自体の定義がなにかよりも、
・それを使うことで人月から切り離され、
・脳内ウォーターフォール引き出しが開かないようにロックし、
・その結果チームを不要なウォーターフォール式プレッシャーから開放することにつながる、
そこに、存在意義があるとまで思っています。


## カリカリ考えず、とりあえずやってみよう
見積もりの話は多くの人がモヤモヤとし、他人の説明をきいてもあまりスッキリせず、自分もうまく説明できないものの代表です。私も説明できた気がしない。
だったら、カリカリ考えるのは一旦やめて、「うまく廻っているか？」に注力してはどうでしょうか？

有名人も悩んでいるんだから、そんなに気にしないでさ！
　
