---
title: エクストリームプログラミング解説 その3：価値(2/2)
author: makiko-nakasato
date: 2022-09-02
tags: XP
---

## はじめに

中佐藤です。XP解説その3です。一応、[エクストリームプログラミング解説 その1：全体像](https://developer.mamezou-tech.com/agile/agile-xp_01/)から続き物として読んでいただくことを想定しています。前回は「価値」のうち「コミュニケーション」を解説しました。

## 価値（続き）

あらためて4+1の価値を再掲します。今回は「フィードバック」から。

- コミュニケーション ⇒ [その2：価値(1/2)](https://developer.mamezou-tech.com/agile/agile-xp_02/)を参照
- フィードバック
- シンプリシティ
- 勇気
- リスペクト

### 価値：フィードバック

これは理解しやすいです。スクラムの三本柱のうち「検査・適応」をセットにしたものだと思えばよいでしょう。

![価値：フィードバック](/img/agile/agile-xp_03-1.jpg)

上の図では一番わかりやすい日次／イテレーション／リリースの繰り返しを挙げましたが、これ以外にもアジャイル開発ではあちこちでフィードバックループが回っています。例えば、継続的インテグレーションはチームとシステム間のフィードバックの仕組みですし、テスト駆動開発は今自分が作っているコードとの対話（フィードバックループ）です。

### 価値：シンプリシティ

シンプリシティは名詞ですが、他のものにかかる「シンプルな」という形容詞として考えるとすっきりします。

![価値：シンプリシティ](/img/agile/agile-xp_03-2.jpg)

有名なのは「シンプルな設計」ですね。YAGNI (You ain’t gonna need it) って最近聞かなくなっちゃいましたねぇ（遠い目）。最初に聞いた時にはちょっとびっくりしたものです。従来の考え方だと、先の変更を見越してそれに対応できる設計をするのがあるべきアーキテクトの姿だ、とか言われていたにも関わらず、「現在の仕様だけを考えて最もシンプルな設計をしろ」なんてねぇ。でもその意図を聞けば納得で、変化の激しいアジャイル開発では先を見越した設計が無駄になる可能性もあり、逆にソフトウェアの理解を妨げるおそれもある、それくらいなら現時点で最もシンプルな設計にしとけ、ってことです。

この形容詞はここまで紹介した「コミュニケーション」や「フィードバック」にもかかると私は思っています。コミュニケーションやフィードバック、大事だよね、でもコミュニケーションやフィードバックの方法っていっぱいある。その中でどれが一番いいやり方なの、というと、よりシンプルなコミュニケーションやフィードバックだよね、という考え方です。例えば、文書で行うコミュニケーションと口頭で行うコミュニケーション、どっちがよりシンプルか、という判断基準です。

この価値は簡単そうで実は難しいと思っています。例えば、上に挙げたコミュニケーションの話。文書と口頭、どっちがよりシンプル？　と訊くと、大抵は「口頭」と答えると思うのですね。じゃあ、本当に常にそうでしょうか。例えば別々のタイムゾーンにいる分散チームでの開発の場合、本当に口頭だけで行うのがよりシンプルなコミュニケーションでしょうか。きっちりした文書でなくても、ある程度のドキュメント（wikiとかホワイトボードとか）があったほうが伝わりやすくないですか？

先に挙げたシンプル設計の話もそうです。「現在の仕様だけ考えて」と言っても、将来実装するのがわかりきっていることを想定しなくてもいいのか、わかりきっていると思っていたらそれがひっくり返る可能性が自分たちの開発でどの程度あるのか。そんなことを常に考えながら設計し続ける必要がある。

自分たちにとって何が一番「シンプル」なのか。これを自分たちの状況に合わせて考え続けなければいけないという意味で、これって結構難しい価値なのではと思っています。

### 価値：勇気

ソフトウェア開発の話が知りたいだけで学校の道徳の時間じゃないんだぞ、と言われてしまうキーワードNo.1（私調べ）ですが、以下の図のように考えるとちょっと理解できないでしょうか。スクラムの三本柱で言えば「透明性」に近いかなと考えています。

![価値：勇気](/img/agile/agile-xp_03-3.jpg)

そして単に”気合”で勇気をもってこれらを行え、と言っているわけではなく、そういう勇気を出せるための仕組みが必要です。「勇気のみでは危険」ということは、[書籍（第2版）](https://www.amazon.co.jp/dp/B012UWOLOQ/)にも書かれています。「システムをシンプルに保つ勇気」を出してコードを綺麗にするぞ、と言っても、テストもなしで実施するのは「蛮勇」です。リファクタリングのテクニックにきちんと則ってあらかじめテストという安全網を作るのが、「仕組み」なのです。

また都合の悪いことも隠さず報告してもらうためには、そういう環境を作る必要があります。心理的安全性というキーワードにも通じます。そのためにも仕組みが必要ですね。例えば想定よりも進捗が遅れた時に、日頃のコミュニケーションもなしにいきなり顧客にそれを報告しても、不信感を持たれるだけです。チームの開発状況を常日頃から開示する（例えばタスクボード等で）ことができていてこそ、遅れた時も隠さず相談・報告ができます。

### 価値：リスペクト

ここまで紹介した4つの価値の水面下にあるもう1つの価値が、リスペクトです。

![価値：リスペクト](/img/agile/agile-xp_03-4.jpg)

書籍に書かれているのは、チームやその関係者が互いに互いを尊敬することです。チーム内の開発者同士だけではありません。立場もスキルも違う者同士が集まった時に、互いを尊重し合わないと、他の価値（例えばコミュニケーション）は成り立ちません。

もうひとつ、自分たちが作るものに対するリスペクトもあると私は思っています。開発者は自分たちが作るものを通して、世の中に貢献しています。だからこそ、顧客やリーダーは「今作っているものがどう役立つか／何が目的か」を示すべきだし、開発者もその目的を踏まえてよりよい手段があるのであれば、それを提案する必要があります。「給料をもらうためにやっているだけで、それがどう役立つかなんてどうでもいい」と思っている人達から自律性なんて出てくるわけがないのです。

## 次回に続く

エモい価値の話は今回で一旦終わりにします。以降、原則はちょっと後回しにして、次回はプラクティスについて解説予定です。
