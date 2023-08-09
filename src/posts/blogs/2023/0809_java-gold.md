---
title: プログラミング未経験者がJava Gold取得してきました
author: kohei-tsukano
date: 2023-08-09
tags: [java, 初心者向け, summer2023]
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2023-summer/
---
この記事は[夏のリレー連載2023](/events/season/2023-summer/)の13日目の記事です。



# はじめに

4月から新卒で入社しました塚野です。入社前はアフリカツメガエルという手のひら大のカエルから毎日卵を絞りだしては、それを実験材料に顔や目、鼻などを作る遺伝子の研究をしていました。
そのためプログラミング未経験での入社で、7月末までは新人研修として基本的なITの知識と、Java、JDBC、JSP・サーブレットに関する講習を受けていました。
8月からは社内プロジェクトに配属となり、日々謎の呪文たちと戦っています。
ちなみに、私が最近覚えた呪文は、「Gitのプルはフェッチしてマージ」です。


少しでも知っている呪文を増やそうと入社時から資格試験の勉強を続けています。
こんな自分でも8月からの配属に合わせてJava Goldを取得できました。そこで、今回の夏のリレー企画に参加させていただき、
これからJavaの勉強始めようと思っている方や、Java Gold取得しようという方へ向けて勉強法や受験した感想など書いていけたらと思います。

:::info
Oracleの定める秘密保持義務のため、本記事では具体的な試験内容には触れられません。あらかじめご了承ください。
:::

# 勉強法

Java SE 11 Programmer II (1Z0-816-JPN) 試験（通称Java Gold）は前提資格として通称Java Silverと呼ばれる以下、

- Oracle Certified Java Programmer, Silver SE 11
- Oracle Certified Java Programmer, Silver SE 8
- Oracle Certified Java Programmer, Silver SE 7

のいずれかの試験に合格している必要があります。Javaの勉強は豆蔵に内定をいただいた後から少しずつ始めており、入社前にJava Silverの範囲は勉強を終わらせ入社後すぐに取得しました。
新人研修でのJavaの講習内容はSilverの範囲のためJava Goldの勉強はほぼ自分で行いました（ほぼとしたのは後述の試験範囲にJDBCも含まれるためです。ここは研修が役立ちました）。


勉強を始める前にまず、実際に社内でGoldを取得した方にお話を伺うことができました。これは事業部長が取り持ってくださり、実際の試験内容や勉強法など聞くことができ、大変参考になりました。
Java Goldの勉強は書籍のみで行いました。書籍は未経験からの合格体験記を書かれているほかのサイトでも必ず紹介される通称[黒本](https://book.impress.co.jp/books/1121101020)と[紫本](https://www.shoeisha.co.jp/book/detail/9784798162027)を使用しています（ちなみにSilverでも大変お世話になった黒本の著者は元豆蔵の方だそうです）。


まずは一通り紫本を読んだあと黒本は3周、紫本は2周しました。
数日あけて同じ問題を解きなおすと「これなんだったっけ…」となるものもあると思いますが、そのような積極的な思い出しこそ効率的な学習に重要だとする[研究](https://nazology.net/archives/116884)もあるそうですので、少し間隔を空けつつ反復をするようにしました。

受験した感覚として、黒本にプラスして紫本もやっておくと安心して合格できる、という感じです。黒本は必須ですが十分ではなく、紫本にしか載っていないない内容もたくさんあります。
実際、黒本の正答率を100％にしてから紫本の確認問題を解きなおすと正答率75％程度だったりしていました。
受験の目的として、試験合格ではなくJavaの勉強がメインにあったため、黒本＋紫本での勉強を選びましたが黒本だけでも合格ラインには届くかと思います。
逆に黒本＋紫本が完璧でも正答率100％は難しいように感じましたので、効率よく合格を求めるなら黒本だけでもいいと思います。

「Goldは実務経験がないと難しい、Goldから難易度が一気に上がる」とネットで見ていたため、Silverの勉強しかしていなかった自分が手を出していいものか不安でした。
結果として、Silverの内容が理解できているのであれば未経験であろうが問題なくGoldの勉強を進められると思います。ただし勉強量はSilverの２倍くらい必要です。
参考までに、試験範囲はOracleの公式HPにて使用するメソッド名やインターフェース名まで含めて細かく掲載されています。

[Java SE11 ProgrammerII(1Z0-816-JPN) 試験 試験内容チェックリスト](https://www.oracle.com/jp/education/certification/1z0-816-jpn-31705-ja.html)

ここにある通り、JDBCに関する知識も問われるため、教本を読み進めるにあたり基本的なDBやSQLに関する勉強はしておいた方がいいかもしれません。とはいっても、SQLの4大命令(SELECT、INSERT、UPDATE、DELETE)が分かれば問題ないかと思います。

以上の勉強法で、合格基準63％のところ正答率83％で無事Java Goldに合格できました。

# 受験した感想

正直本番は問題集よりも難しかったと感じました。紫本までやっておいてよかったと思っています。
今回Javaの最上位資格ということもあり合格できたことは、入社前は難しそうと思っていたプログラミングに関する知識でもちゃんとキャッチアップできるぞという大きな自信にもなりました。
これが配属先の実務に直接役立つかどうかは今のところ分かりませんが、多くの引き出しが増えた実感はあり、今後はこの調子でJavaにとどまらず色々な引き出しを作っていけたらと思っています。
次は現在業務でも使われているAWSの資格取得を狙っています。呪文が理解できるようになるまでまだまだ先は長そうです。






