---
title: オンライン研修の設計勘所（その１：学習内容の構造化）
author: toshio-yamaoka
date: 2022-10-13
tags: ["オンライン研修", "研修設計"]
---

## はじめに

前回は研修設計の全体像（プロセス）に関して記載いたしました。

[オンライン研修の設計勘所（その０：そもそも研修設計とは研修設計していますか？）](https://developer.mamezou-tech.com/blogs/2022/09/20/instructional_d-001/)

以降、ADDIEモデルにおける D:Design「研修の設計」に一歩踏み込んでいきます。

今回は「学習内容の構造化」について記載いたします。

ここでは、学習内容を研修内で取り扱う学習トピックと捉えます。

この学習内容（学習トピック）を検討する際に気をつけなければいけない事は次の３つです。

- 学習目標との関わり

    A:Analysis で定義した学習目標に到達するための学習トピックは何をかを考える。


- 学習トピック間の依存関係

    「○○を学ぶには、その前に□□を学んでおく必要がある」といったような学習トピックの繋がりを考える。


- 学習の粒度感

    １単元（１つの学習の区切り）にどれ位の量の学習トピックをまとめるかを考える。



## 学習トピックの抽出方法

さて、皆さんは研修で取り扱う学習トピックをどのように抽出しているでしょうか？

多くの方は、書籍の目次構造のようなイメージで「章節項」の見出しを並べ、教える内容を抽出しているのではないでしょうか。

目次構造のイメージのみで学習トピックを考え捉えていると、次のような弊害が発生してしまいます。


### 学習トピックが肥大化する

「その学習トピックは、学習目標を達成するために本当に必要ですか？」

目次構造の場合、リファレンス的になり学習目標に繋がりのない学習トピックまで入れ込んでしまう危険性が高まります。

項の見出しレベルなどでは、同じ見出しレベルの内容だけをみて、○○を教えるのであれば□□も教えないとねとなりがちで、研修で掲げている大きな目標とは直接紐づかない学習トピックが紛れ込んでしまう事があります。これにより研修で取り扱う学習トピックが肥大化してしまいます。


### 学習トピック間の繋がりがイマイチになる

「その学習トピックは、研修内のそのタイミングで取り扱うのがベストですか？」

目次構造で学習トピックを捉えると
章節項の同じ段落レベルでは1次元的な 1 対 1 の繋がりに見えてしまう。
章→節、節→項のレベルでは主従の 1 対 n の関係に見えてしまう。
これは、目次がページ数ベースで前半から後半へという流れで、どうしても1次元的表現に見えてしまうためと考えます。

学習効果や学習粒度（１単元の分量）の観点から、ある学習トピックを別の章で取り扱った方が良いと判断した時、目次構造のように１次元的に学習トピック間の繋がりを捉えていると、学習トピックの移動が可能かを判断しずらくなってしまいます。

例えば、ある学習トピックを学習単元の前の方へ移動する場合、その移動させたい学習トピックに紐づきそれ以前に学習しなければいけない学習トピックが、目次構造では判りづらいのです。


### １単元あたりの学習量が不均一になる

「１単元で取り扱う学習トピックの分量・学習時間は適切ですか？」

目次構造のみで学習トピックを考えていると、ある章やある節の分量が他の章節よりも多くなってしまい各章の学習時間に偏りがでてしまいます。また、学習した内容を確認するためのワークを入れて、学習の１区切りをつけるタイミングを考えるのが難しくなります。

研修教材を作り慣れていないと上のような落とし穴にハマりがちです。私は過去何度も経験してきました。

これまで述べてきた目次構造で学習トピックを考える弊害の具体的イメージを次に掲載します。

![目次構造で学習トピックを考える弊害](https://i.gyazo.com/282e40ab2cf351b9503104eea7609150.jpg)

学習トピックを検討する上では、目標に掲げている「基本的なクラス」を事前に（Analysis工程で）具体化しておくことが大切です。何が基本的なクラスなのか。例えば、単体のクラスとして存在し、基本データ型及びString型の属性（メンバー変数）が複数定義され、その属性を操作するメソッドも複数定義されている。などです。


## ID（インストラクショナルデザイン）における学習内容の構造化手法

では、目次構造ではない手法とは何かと言うと、「課題分析」という手法を使います。

課題分析ではAnalysis工程で定義した学習目標を頂上とし、その学習目標へ到達するために必要となる学習トピックを順に紐解き洗い出していきます。これにより学習トピック間のつながりが目次構造と比較しより明確になります。

「これを学習する前には、これを学習しておく必要があると。」いった感じに上位の学習目標へ到達するために必要となる学習トピック（抽出された下位の学習目標）を順に抽出していきます。

イメージとしては上位目標と下位目標の上下の繋がりと、目標階層が同じという左右の繋がりの２次元的な繋がりや配置を意識して学習トピックを抽出します。

![課題分析図例](https://i.gyazo.com/cef28670ba13000d84967871bb610ce8.png)

## 学習目標の特性による課題分析の４種類

IDでは、学習目標の特性にあわせて、課題分析のアプローチを以下の４つに分類しています。


**1. クラスター分析**

「用語を覚える」系の学習目標に対する課題分析です。
様々な研修で基礎的に活用されます。


![クラスター分析の例](https://i.gyazo.com/3cc911ff21d1abcff09e8534c7914966.png)


**2. 階層分析**

「ルールや定理・理論を適用・活用する」系の学習目標に対する課題分析です。
IT系の研修では、階層分析を活用することが多いです。

例えば、プログラミング言語の forループの文法を覚え、指定されたシチュエーションで適用するような学習目標の場合は、階層分析を使います。

![階層分析の例](https://i.gyazo.com/d8f6ea0389cfe123104c52fffc8f4ac1.png)


**3. 手順分析**

「体を動かす・コントロールする」系の学習目標に対する課題分析です。
IT系の研修では、ツールやアプリケーションの操作方法を取得するような場合に活用されます。

![手順分析の例](https://i.gyazo.com/8a3b6ded4b313b56de1406dd6bc20a29.png)


**4. 複合型分析（態度に対する課題分析）**

「心や気持ちの変化」系の学習目標に対する課題分析です。
IT系研修においても分野によっては、複合型分析を活用することがあります。

![複合型分析の例](https://i.gyazo.com/2d8abccebb90b0974d53f3e533190ea1.png)

IDでは、これら４つの課題分析の手法を活用して、学習トピックの抽出と学習トピック間の繋がりを整理します。


## 学習粒度の括り

出来上がった課題分析図をもとに、学習粒度（１単元の分量）の検討をします。

課題分析で抽出された学習トピックのいくつかを１つにまとめ、その単位で学習の区切りをつけます。

イメージとしては、学習単位の終わりに１つ演習を実施し、学習内容が習得できたか目標に到達できたかを確認してから、次の単元へ進みます。

次の図では、赤の雲枠で括った１つ１つを学習単元と表現しています。

![学習粒度の例](https://i.gyazo.com/8fc1b80192540d817d4d97b9ace79933.png)


## おわりに

最終的に目次構造にはするのですが、その前段階として課題分析をすることで、研修の学習目標を意識した学習トピックの抽出と適切な学習粒度を導き出すことが可能になります。

オンライン研修を念頭にした場合、

学習粒度は集合研修と比較して細かくします。１単元演習も含めで１時間以内を目安としたいところです。PC画面を1時間以上見続けると集中力が低下するため、なるべく１単元の時間を短めにします。

また、下位レベルの学習目標が達成できているかの演習を１単元ごとに実施するのがベストです。演習やワークもできる限り小さなステップで研修内に差し込むことで集中力を持続できます。

さらに、集中力を持続するだけでなく学習目標に沿ったスキルを習得できているという手応えを感じながら学習を進めることが可能になります。

***

参考文献
1) [鈴木克明(2002) 教材設計マニュアル 独学を支援するために 北大路書房](https://www.kitaohji.com/book/b579461.html)
2) [鈴木克明、市川尚、根本淳子(2016) インストラクショナルデザインの道具箱１０１ 北大路書房](https://www.kitaohji.com/book/b580099.html)
