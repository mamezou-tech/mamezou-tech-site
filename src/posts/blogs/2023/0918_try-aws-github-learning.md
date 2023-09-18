---
title: AWSとGitHubを使ってみよう勉強会の資料公開します
author: toshio-ogiwara
date: 2023-09-18
tags: [AWS, GitHub, java, 学び]
---

筆者は日頃はとあるお客様の基幹システムを構築していますが、基幹システムは安定第一となるため、モダンな技術とは少し縁遠くなってしまいがちです。ただそれではダメだよねということで完全業務外の活動として「モダン」をテーマに毎年お客様と一緒に勉強会を行っています。

毎年、講師役の人が好きなテーマ、得意なテーマで勉強会を実施しているのですが、今年は筆者が講師を行ったので、興味があるテーマとしてGitHub Codespaces、そして（ちょっと）得意なテーマとしてGitHub ActionsとAWSを組み合わせた勉強会を実施しました。

勉強は上述のとおり、完全業務外のボランティア活動で、かつ内容的にもプロジェクト固有な情報は含んでいないため、折角なので、この勉強会資料を記事で紹介したいと思います。

記事は前半で勉強会の概要的なことを紹介した後、後半で実際のスライドすべてをお見せします。内容的には大したことはないかもしれませんが、勉強会をやりたいけどどんな感じでやるのがいいのかな？などと思われている方へ一つの参考になればと思います。

:::info: 勉強会の資材
記事で紹介した資料やひな形プロジェクトなど勉強会の資材は一式下記リポジトリに格納してあります。
-	[mamezou-tech/try-aws-github-learning](https://github.com/mamezou-tech/try-aws-github-learning)
:::

## 勉強会の目的と目標
まずは目的と目標ですが、これは次のようにしました。
![cap01](/img/blogs/2023/0918_try-awa-github_01.drawio.svg)

今回の勉強会はテーマに興味を持った人なら誰でも参加できる会にしました[^1]。なので、個々の知識やスキルレベルはまちまちですが、参加者の心理的ハードルを下げることと勉強会でできることは限られているため、個々人の今後の興味に繋がればという期待から上記のような目的と目標にしました。
[^1]: 今回の勉強会は好評でインフラの方からアプリの方と色々な方面から参加いただきた最終的には20名強の活動となりました。

## 勉強会の形式
今回の勉強会は次のように「反転学習」形式でやってみました。
![cap02](/img/blogs/2023/0918_try-awa-github_02.drawio.svg)

今までは講師が説明して終わる講義形式や勉強会中に講師が指示した手順で実際に何かをやってみるハンズオン形式で勉強会をやっていましたが、それぞれ一長一短がありました。

講義形式は聞いているだけだとやっぱり飽きがきます。ではということで、ハンズオン形式でやってみましたが、手を動かすことに集中し、やっていることに対する理解が疎かになりがちです。またこれには時間の都合もあります。

では、ということで今回は細かいことは伝えずにまずは課題を提示し、次の勉強会までに自分で調べて課題をこなす。そして次の勉強会で講師が細かいことを解説するといった反転学習形式でやってみることにしました。

結果から言うと、この形式が今までの中で一番良かった気がします。参加者は業務多忙の中、勉強会に参加されるため1回1時間程度しか時間を取れませんが、頭と手を動かす部分は各自で持ち帰り、そしてみんなが知っておくべきことを講義で展開という形で時間を有効的に使うことができたと思います。また、課題はできたけどボンヤリしていると思われる箇所を講義で解説するため、参加者の解説に対する関心度合いが高くなることは言うまでもありません。

## 勉強会の内容
今回の勉強会は全6回でそれぞれ次のテーマで実施しました。

![cap03](/img/blogs/2023/0918_try-awa-github_03.drawio.svg)

冒頭でも少し触れたようにAWSとGitHubを組み合わせてクラウド完結でアプリケーションを作成することを目標にした構成にしました。それぞれでやっていることは実際それほど深い内容ではありませんが、1つのお題をクラウドサービスを使って成長させていくストーリーにしているため、目的であるクラウドサービスの便利さは十分体感してもらえたと思います。

## 勉強会のスライド
最後に実際のスライドを紹介します。スライドから雰囲気を感じでいただければと思います。
### 第1回：キックオフ
<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/345b07de179b4c2786030bf8a2993ae1" title="第1回 AWSとGitHub勉強会 - キックオフ - " allowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 100%; height: auto; aspect-ratio: 560 / 315;" data-ratio="1.7777777777777777"></iframe>

### 第2回：GitHub CodespacesとHelidonの利用
<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/cec0278884d04b6b8514a220aaa2a4b4" title="第2回 AWSとGitHub勉強会 - CodespacesとHelidonの利用 -" allowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 100%; height: auto; aspect-ratio: 560 / 315;" data-ratio="1.7777777777777777"></iframe>

### 第3回：GitHub Actionsを使ったCI環境の構築
<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/c5875f8251ba4d7f9c2c47ae0736b653" title="第3回 AWSとGitHub勉強会 - GitHub Actionsを使ったCI環境の構築 -" allowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 100%; height: auto; aspect-ratio: 560 / 315;" data-ratio="1.7777777777777777"></iframe>

### 第4回：GitHub Actionsを使ったCD環境の構築
<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/39662f1210f64a21a9144986900cf99e" title="第4回 AWSとGitHub勉強会 - GitHub Actionsを使ったCD環境の構築 -" allowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 100%; height: auto; aspect-ratio: 560 / 315;" data-ratio="1.7777777777777777"></iframe>

### 第5回：AWS EC2環境の構築
<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/86bc4dc4c08e41fbb2153ed91bad612c" title="第5回 AWSとGitHub勉強会 - AWS EC2環境の構築 -" allowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 100%; height: auto; aspect-ratio: 560 / 315;" data-ratio="1.7777777777777777"></iframe>

### 第6回(最終回)：AWS ECS Fargate環境の構築
<iframe class="speakerdeck-iframe" frameborder="0" src="https://speakerdeck.com/player/bd35263084e7484faad187bcf0a17976" title="第6回 AWSとGitHub勉強会 - AWS ECS Fargate環境の構築 -" allowfullscreen="true" style="border: 0px; background: padding-box padding-box rgba(0, 0, 0, 0.1); margin: 0px; padding: 0px; border-radius: 6px; box-shadow: rgba(0, 0, 0, 0.2) 0px 5px 40px; width: 100%; height: auto; aspect-ratio: 560 / 315;" data-ratio="1.7777777777777777"></iframe>

## 最後に
豆蔵は会社のカルチャーとして勉強会が好きな会社だと思います。今回はお客さまと一緒に行った例ですが、少しでも豆蔵の雰囲気を感じていただけたら幸いです。
