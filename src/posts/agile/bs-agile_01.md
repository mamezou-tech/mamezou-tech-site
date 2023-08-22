---
title: 業務システムにおけるアジャイル その1：「システム」の範囲
author: makiko-nakasato
date: 2023-08-21
tags: 
---

## はじめに
中佐藤です。アジャイルの中でもマイナー領域を攻めることにかけては割と自信があります。

そもそも私がアジャイル関連の仕事を始めた2008年頃には、アジャイルそのものがマイナーだったのです。いつの間にかすっかりメジャーになってしまいましたが。というわけで、アジャイル開発の話の中でも範囲をぐっと狭めて「業務システムにおけるアジャイル」について、連載を始めようかなと思います。

## 業務システムとは
上の文章で、ん？と思われた方はいると思います。業務システムにアジャイルの適用って、結構普通じゃないの、と。
ここで、この連載における「業務システム」を定義しておきましょう。

本連載における業務システムとは：
人（ユーザー、顧客、社員）の動きと、コンピューターシステムの組み合わせで全体の「システム」が成り立っているもの

典型的なのが、社内の承認ワークフロー系のシステムです。人事系や経理系の申請・承認フローですね。
社外のユーザーがからむものでも、コンピューターシステムだけで完結しないものは多いはずです。ネットショップでも商品が電子的コンテンツでなければ、物理的なものの発送にはほとんどの場合、人が関わっています。
コンピューターシステムだけではなく、関係する人（特に複数の立場の人）とコンピューターシステムとが組み合わさって機能することで、しかるべき結果（例えば注文主に注文した品物が届くとか、申請した経費がちゃんと支払われるとか）をもたらすもの、と考えてください。

## 業務システムの何が難しいのか
個人的偏見ですが、業務システムって割とアジャイル開発しやすい、と思われているのではないでしょうか。
対照的なものとして、例えば組み込みシステム。変更のしやすい（ということになっている）ソフトウェアだけではなく、ハードウェアがからむことで、アジャイル開発はしづらいのでは、とはよく言われます。ひとくちに組み込みシステムと言っても、対象製品によって趣は随分異なりますし、そもそものアジャイル開発の目的にもよりますが、まあ一般的にはその通りでしょう。

それに対して、業務システムってソフトウェアでほぼ何とかできるでしょ、サーバーの準備とか今時クラウドで数回クリックすればOKだし、と思ったそこのアナタ。
甘い！　甘すぎます！
業務システムには、ある意味ハードウェアよりやっかいな「人」がからんでいます。そしてその「人」がからむことで、初めて「システム」が完結するのです。
そのため、人の動きも含めて考えないと、まあまあ間違えます。ウォーターフォール開発で受け入れテスト段階になって「思っていたものと違う」と言われるのに懲りてアジャイル開発にしたにも関わらず、コンピューターシステムの開発だけを反復しても結局「コレジャナイ感」が出てしまう。

そして人はワガママです。自分の関係している業務システムが変更されると聞けば、おっ、今のめんどくさい業務がちょっとは楽になるかなと夢を見てしまう、そして大抵は裏切られ、失望する。
アジャイル開発なんて言ってしまえば、よりそのワガママ度は増します。変更が簡単なんでしょ、というアジャイル開発のごく一部だけが切り取られ、過剰な期待を抱かせてしまう。
しかしながら、業務システムが人の動きも含めてシステムとして完結するということを理解していれば、人の動きを変更するのは意外と難しいのがわかるはずです。

そんなワガママな人たちの想いをひとつにより合わせ、同じ方向を向いてもらう。
これはアジャイルだろうがウォーターフォールだろうが、とても難しいことです。

## 予告
ならどうしたらええねん、ということを、何回かにわけてお伝えしていこうかと思います。
今回は、まずは予告だけ。以下のような話をつらつらと書いていこうと思います。

- 業務システムにおける「イケてるプロダクトオーナー」vs「イケてないプロダクトオーナー」
- 業務系パッケージとアジャイル開発の相性
- プロジェクト形式でアジャイル開発する時の注意点
- プロダクトゴールによるマネジメント

では、次回をお楽しみに。