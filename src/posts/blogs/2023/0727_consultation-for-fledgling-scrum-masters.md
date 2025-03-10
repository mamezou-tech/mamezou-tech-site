---
title: 駆け出しスクラムマスターのあれこれ相談室
author: misato-kamei
date: 2023-07-27
tags: [summer2023, アジャイル開発]
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2023-summer/
---

この記事は[夏のリレー連載2023](/events/season/2023-summer/)第4日目の記事です。

## はじめに
はじめまして。
２つのウォーターフォール型プロジェクトとアジャイルのスクラムによる開発を3カ月経験した後、 縁あって今年5月からあるプロジェクトでスクラムマスターデビューを果たしました亀井と申します。
晴れて駆け出しスクラムマスターとなった私ですが、正直に言うと3カ月スクラムを経験しているとは言え、 スクラム開発って何？ 何がすごいの？ と聞かれるとその人に合わせて分かりやすく説明できない、ということはあんまり理解できてない...!という状況でした。
そこから、まずスクラムマスターとなったからには必読のスクラムガイド2020を読みこみ、書籍「[SCRUM BOOT CAMP THE BOOK](https://www.amazon.co.jp/dp/B086GBXRN6/)」に目を通して一通りスクラムとは何か？への理解を深めていった...のです。
しかし、これらを読んだところスクラムってこうだったのか!となるどころか、スクラムについてむむむ...？と疑問が深まるばかり...
そんな時に幸いにも、社内のアジャイル・スクラム勉強会(と称したすごく私優先の質問会)にばしばし疑問を解決していただくありがたい機会を賜りました。
ここでは、駆け出しスクラムマスターとなった私が「スクラムとは何ぞ？」の基本的な部分で浮かんだ疑問と答えを社内の勉強会で回答いただいた内容をもとにまとめています。

---

## Q1.「完成の定義」って何？

Q) スクラムガイドに「完成の定義」の記載があるけれど、結局どういうことを言っているの？

A) 開発者によってもテストをどこまで終えて完成とするのか、UXをどこまでできてOKとするのか違いがあります。
人によって違う、「ここまでできたら完成‼」について共通認識を得るために合意するのが「完成の定義」です。
開発者のみならず、POやスクラムマスターも含めたスクラムチームで完成の定義を定め、完成の定義を満たしたものをインクリメントとします。

---

## Q2. 顧客がPOを担うことはありえる?

Q) プロダクトオーナー(以下、PO)は顧客の欲しいものの声を集めて、プロダクトバックログアイテムの並びの最終決定者である。だとすると、POは顧客が担うことはありえるのか？

A) 結論から言うと、顧客が使用する社内システムの開発プロジェクトといった場合、顧客がPOとなるパターンはあります。
社内での業務の悩み事に精通しシステムの機能化への取捨選択できる判断力や、予算をとってこれる等の権限、社内へ意見を通せる声の大きさを持っている...
というのが理想ではあるけれど、そういう方は役職をもち総じて忙しい方が多いです。
理想的なアサインは難しいものの、半分はステークホルダーのため、もう半分はスクラムチームのために働ける人がスクラムチームのPOを担うのが良いです。

---

## Q3. ベロシティの安定のために残業はすべきではない？

Q）スプリントを重ねるとベロシティが安定してくるが、ベロシティの安定のために残業して開発を無理するのはいけないこと？

A) ベロシティは実績値ではなく、あくまで開発速度の指標です。
スクラムガイドに「持続可能なペースでスプリントの作業を⾏うことにより、スクラムチームの集中と⼀貫性が向上する」の一文があります。
この通り、無理をして高いベロシティを出しても、それをずっと維持をするのは難しいですし、無理をするとスクラムチームとしてのパフォーマンスに影響しかねません。
時には障害対応等で残業してでも開発をしないといけない状況はあるとは思います。
しかし、今のペースで開発をすすめるとあと何スプリントで今着手しているプロダクトができあがるのかという計測のためにベロシティは用いられるので、無理をするとベロシティが不安定化し開発速度の指標としては参考とならなくなってしまいます。
これにより、無理をするのはオススメしません。

---

## Q4. スクラムを上手に機能させるコツはある？

Q) スクラムマスターとして心がけるべきこと・スクラムを上手く機能させるコツはあるのか？

A) これ、というステキなおまじないはありません。
しかし、自分がどんなスクラムチームを作っていきたいか、スクラムマスターとしてどうチームに貢献したいか、という方針を自分の中でしっかりと持つのは大事だと思います。
人間関係のことも絡むし、常に明確な正解はないけれど参考になる書籍はご紹介いただきました。
駆け出しスクラムマスターの私はまだそのレベルに至っていないですが、いずれ壁が立ちはだかった際、為になるであろう書籍は「[SCRUMMASTER THE BOOK 優れたスクラムマスターになるための極意――メタスキル、学習、心理、リーダーシップ](https://www.amazon.co.jp/dp/4798166855)」です。
ひとまず今の私は、着実に経験値を積んで少しずつレベルアップを頑張ります。

---

## おわりに

スクラムガイドには「スクラムのルールは詳細な指⽰を提供するものではなく、実践者の関係性や相互作⽤をガイドするもの」とあります。
スクラムガイドを読んでいただくと、抽象的な表現が多くあり、「こういう場合はこうする」といった明確な手法は記載されていません。
だからこそ、プロジェクトの状況によってそのスクラムチームに合わせたプロセス、技法、手法を自分で模索してより良い価値を生み出すようプロジェクトにつなげていく努力が必要なのかな、と今考えています。
明確な正解がないからこそ、ひとまずやってみてダメならやめる、上手くいけば続けるといった試行錯誤を短いスプリントにてくり返し実施することでプロジェクトの改善に繋がるのでしょう。
スクラムマスターデビューして早2カ月、スクラムマスターとスクラムの深みに驚きつつ目まぐるしく日々が過ぎていきます。
技術以外の部分でスクラムマスターとしてどうプロジェクトに貢献するのか私自身もがいている最中ですが、精進していきたいと思います。

---

最後まで、お読みいただきありがとうございました。