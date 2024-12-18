---
title: ベイジアンの逆襲
author: shuichi-takatsu
date: 2022-06-03
tags: [Analytics]
---

皆さんは「ベイズ統計」という言葉を聞いたことがあるでしょうか？  
私が統計学を勉強した時は、統計と言えば「記述統計」か「推計統計」のことでした。  
なので最初にベイズ統計という言葉を聞いた時も「ベイズ？何それ美味しいの？」っていう感じでした。  
近年はベイズ統計やベイズの定理、ベイズ確率などの言葉を頻繁に聞くようになりました。

ベイズの理論を使って実用化されている物には「迷惑メールの振り分け機能」などがあり、様々な分野で利用されているようです。  

統計学の世界では、記述統計や推計統計を推すグループとベイズ統計を推すグループは現在も対立していて、特にベイズ統計学を推す人々のことを”ベイジアン”と呼ぶそうです。  
（恥ずかしいことに、私は”ベイジアン”という言葉を最初に聞いたときに”ベジタリアン”の亜種だと勘違いしました）  
なぜ対立しているのかということについては、私は統計学で生計を立てている身ではないので、あまりピンときていません。  
今回は「ベイズ統計」について少々解説をしてみたいと思います。


## ベイズ統計とは

最近はネットを検索すれば大抵の情報を探し出せるので、ここでは詳しく述べませんが
「ベイズ統計」の”ベイズ”はトーマス・ベイズという人物に由来するようです。  
18世紀の数学者で、統計的データ問題を初めて数学的に扱った人物とされています。

この「ベイズ統計学」はこれまで一般に言われている古典的統計学（主に推計統計学）とは考え方がまったく異なります。180度違うと言ってもいいでしょう。

ベイズ統計学と古典的統計学（推計統計学）の違いを表現する言葉として、以下の記述を良く見ます。

> ベイズ統計学は「主観確率」で考える  
> 推計統計学は「客観確率」で考える

うーん、何のことだかさっぱりですよね。

しかし、よくよく聞いてみると考え方は至極単純です。  
と言うよりも現実的と言った方が良いでしょうか。  
前回の[ブログ記事](https://developer.mamezou-tech.com/blogs/2022/06/01/hypothesis-test/)で紹介した「仮説検定」の”ややこしさ”なんて論外だと思うほど簡単な考え方です。  
逆に言うと「仮説検定」で統計学をずっと勉強していると、とっさに理解するには「脳が痛い」のです。  

ベイズ統計の詳しい説明はまた別の機会に譲るとして（と言いますか、まだ筆者も説明できるほど理解していない）、今なぜベイズ統計が注目されているかについて簡単に紹介しましょう。

## 異端の統計学

先ほども述べたようにベイズ統計の発祥は18世紀です。  
しかし今頃になってなぜ忽然と脚光を浴びたのでしょう？  
なぜそれまで不遇の時代を生きたのでしょうか？  

これには先ほど述べた「主観確率」というベイズ統計学の考え方が、「正確性」と「客観性」を重んじる科学者から異端扱いをされたからだという説が有力のようです。  

近代科学には何よりも「正確性」と「客観性」が要求されます。  
近代科学者に言わせれば  
`「主観によって結果の値が変わってしまう理論なんて科学と言えない！」`  
って主張だと思います。

幸いなことに、私の周りには統計学論争を起こす同僚は居ませんが、昔はかなり厳しい対立があったのでしょう。

## ベイジアンの逆襲

では、なぜ今「ベイズ統計」なのでしょうか。  
近年コンピュータの処理速度が飛躍的に向上したことで膨大な量のデータを処理することが可能になり、AI・機械学習・ディープラーニングが一気に実用の域に達しました。

AI・機械学習・ディープラーニングとベイズ統計学（というかベイズ推定）は関わりが深いのです。  
ベイズ統計とモンテカルロ法については頻繁に文献を目にするでしょう（筆者は詳しくないですが）。  
モンテカルロ法はニューラルネットワークにも使われるようです。  
（モンテカルロシミュレーションという言葉は学生の時に聞いたような気がします。もう35年以上前のことですが）

コンピュータの処理速度が劇的に上がったことで、これまでは難しかったベイズ統計の応用が加速しています。  
機械学習は学習データをどんどん追加して学習結果の精度を高めます。  
ベイズ統計も同じです。  
データ(これが主観データ)を追加する毎に確率が再計算されて新しい結果(事後確率)が得られます。  

これまでの古典的統計学(推計統計学)では、データが追加される毎にすべての統計計算を最初からやり直す必要がありますが、ベイズ統計は追加したデータ分だけの再計算で良いので、機械学習と相性が良いようです。  

このような背景から最近は統計と言えば「ベイズ統計と推計統計」と言うくらいまでは認知度が上がったと(勝手に)考えています。  

## 簡単にベイズ統計を試すには

実は[jamovi](https://www.jamovi.org/)にはベイズ統計を使ったt検定が追加されています。  
他の「分散分析」や「回帰分析」においてベイズ統計を使用したい場合は [JASP](https://jasp-stats.org/) が利用できます。  
JASPもjamovi同様に無料で使える統計解析プラットフォームで、操作性等はjamoviとほぼ同じですので扱いに戸惑うことも少ないでしょう。  
バージョン0.15以降からはメニューが[日本語対応](https://jasp-stats.org/2021/10/28/日本語でjaspが使えるようになりました/)されています。（結果表示は英語のままですけど）  

以前の[ブログ記事](https://developer.mamezou-tech.com/blogs/2022/05/19/confirm-the-quality-improvement-effect/)で使用した「対応のないt検定」のデータをそのまま用いてjamoviで「ベイズ統計版t検定」を実施してみましょう。  

変更する設定は以下の一か所だけです。  

![](https://gyazo.com/6a109c44d2343fdeb68ad81c3baf3800.png)

対応なしt検定の結果が以下のように表示されます。

![](https://gyazo.com/07a33255da2eee9c4333e458087c4230.png)

スチューデントのt検定の結果は有意水準を満たしているので帰無仮説は棄却されています。（前回と同じ）  
しかしベイズ因子10（ベイズファクター10）は「4.13」です。  
これは「棄却する」「棄却しない」のどちらの判断をすれば良いのでしょうか。  

「ベイズ因子10」という文字列の後ろの「10」という文字は数字の10のことではなく、対立仮説を「１」とし、帰無仮説を「０」とした場合、分子と分母がどちらにあたるかを示しています。  
今回の場合は  
> 対立仮説：帰無仮説 ＝ 4.13 : 1  

を意味します。  
もし、「ベイズ因子01」と書かれていたら
> 帰無仮説：対立仮説 ＝ 4.13 : 1

となります。

今回の結果の値をざっくり「4:1」として考えると  
> 対立仮説を支持するが80％  
> 帰無仮説を支持するが20％  
と言えます。  
あれれ？スチューデントのt検定のp値は0.018なのに、これはどういうことなのでしょうか。

このように、実はベイズ統計はかなり厳しい判定を下します。  
ベイズ因子の値を「オッズ比」と言うようです。  
このオッズ比は大体30くらいないと「十分な確証が得られたとはいえない」という判断をするようです。（文献によって、この閾値には差があります）

ベイズ因子10が「30」であれば  
> 対立仮説：帰無仮説 ＝ 30 : 1  

ということです。  
つまり  
> 対立仮説を支持するが97％  
> 帰無仮説を支持するが3％  

くらいでしょう。
ここまでしてやっと推計統計の有意水準に近くなります。

## まとめ

ベイズ統計が日の目を見たからと言って、従来の推計統計が凋落したわけではありません。  
これは物理学におけるニュートンとアインシュタインの関係に似ていると考えています。  
アインシュタインが相対性理論を唱えたからといって、リンゴが木から落ちなくなったわけではありません。  
「速度が光速よりも十分に遅く」そして「質量が十分に軽い対象」に対してはニュートン力学で十分に説明がつくのですから。  

要は適材適所。必要な場面で必要な手法を用いるだけの事だと考えています。  

[統計解析ツール紹介やその活用方法をまとめています。](https://developer.mamezou-tech.com/analytics/)

データ分析に活用して頂ければ幸いです。
