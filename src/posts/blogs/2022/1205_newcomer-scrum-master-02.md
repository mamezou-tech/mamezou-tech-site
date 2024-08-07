---
title: 新米スクラムマスターの思考メモ（その２　Retrospective編）
author: hiroaki-taka
date: 2022-12-05
tags: [スクラム]
---

## はじめに
「新米スクラムマスターの思考メモ」の２回目の記事です。今回の記事では新米スクラムマスターとして、Retrospectiveではどのようなことを感じ、行動したかについてまとめてみたいと思います。ちなみに、前回の記事は以下の通りです。

[新米スクラムマスターの思考メモ（その１　スクラムマスターになるまで）](/blogs/2022/11/24/newcomer-scrum-master-01/)

なお、スクラムイベントとしてはSprint Planning → DailyScrum → Sprint Review → Retrospective の順番が一般的だとは思いますが、このシリーズではあえて取り上げる順番を変えています。あくまでも個人的な印象として、Retrospectiveがスクラムイベントの中では最も取り組みやすいと感じています（スクラムイベントの中では比較的取り組みやすいというだけで、簡単と言っているわけではありませんのであしからず）。

このシリーズでは以降、私個人が取り組みやすいと感じた順で、各スクラムイベントについて記載していきたいと思います。

### なぜRetrospectiveが最も取り組みやすいと感じたか？
そもそも、なぜRetrospectiveがスクラムイベントの中では最も取り組みやすいと感じたのか？それは、研修講師の仕事に一番近いイベントだからです。

私は普段新人研修など教育に関する仕事を担当していますが、その中で、演習中に受講者の様子を観察すること、受講者間のグループディスカッションのファシリテーションを行っています。Retrospectiveは、これらの作業に近い感覚があります。

言い方を変えると、講師スキルを最も活かしやすいイベントがRetrospectiveということです。この記事を執筆している最中でも、Retrospectiveについて色々考え、どのように進めるべきかを考えています。この思考プロセスも、研修でどのように受講者に教えるべきかを考えることと似ているように思います。

## Retrospectiveで取り組んでいること
### Retrospectiveの目的を示す
直近のRetrospectiveで実践し始めたことですが、Retrospectiveの目的を示すようにしました。具体的には、スクラムガイドの記載内容をそのまま表示しているだけです。

:::column:Retrospective(冒頭部分のみ)
スプリントレトロスペクティブの目的は、品質と効果を⾼める方法を計画することである。

スクラムチームは、個⼈、相互作⽤、プロセス、ツール、完成の定義に関して、今回のスプリントがどのように進んだかを検査する。

[スクラムガイド 2020年版](https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-Japanese.pdf)より
:::

個人的な印象ですが、開発メンバー同士が会話をしていると、自然と技術よりの話題に関心が向くようです。開発メンバー、そして私自身がRetrospectiveの意義を見失わないようにし、視野をプロセス全体に広げることを目的として、スクラムガイドをRetrospectiveの冒頭に示すことにしました。

ちなみに私は、Retrospectiveの話題が技術面にフォーカスしすぎないように、できるだけ議論の場を俯瞰で見るように意識しています。現在スクラムマスター兼開発者としてチームに参加し、Retrospectiveのファシリテーションも行っています。ファシリテーターの私もガッツリと技術面の話題に参加してしまうと、プロセスのことに関心が向かなくなる危険性があると考えています。俯瞰で見るようにしているとはいえ、度々深入りしてしまうこともある気がしますが（苦笑）。

### 意識的に話を振る
私はRetrospectiveの議論の内容だけではなく、参加者の状況に気を配るようにしています。リモートいう環境の制約上難しい面はあるのですが、私は個人の発言量を気にしています。

さまざまな意見が出た方がRetrospectiveとしては健全です。そのため私は、意識的にメンバーに話を振っています（社内プロジェクトだから話を振りやすい面もありますが）。

今回のスクラムチームは教育目的も兼ねているため、新卒社員も参加しています。新卒の立場だと、先輩社員がいる中ではなかなか意見が言いづらい面もあるかと思いますが、それでも新卒には特に意識的に話を振っています。

スクラムの価値基準には「勇気（Courage）」があります。恐れずに発言することは、勇気という価値基準を実践できることになり、スクラムの理解につながると思います。

:::column:「真理の探究に上下関係は不問」
少し話はそれますが、新卒に話を振っているのは「真理の探究に上下関係は不問」ということを伝えたい側面もあります。この言葉は、大学院生時代に指導教員から賜った言葉です。実際に、同期とは「うちの研究室は、指導教員と学生という立場より、共同研究者という位置づけに近いよね。」という話をした記憶があります。その分大変だったりするんですが…（笑）。

Retrospectiveのコンテキストであれば、「プロセス改善のための議論に上下関係は不問」ということでしょうか。もちろん、Retrospectiveに限らずスクラム全体、そして仕事についても通じる部分はあるかなと思います。
:::

### タイムボックスを意識しすぎない
スクラムガイドではスプリントが1か月であれば、Retrospectiveは最大3時間というように、タイムボックスが意識されています。現在のチームではもともと1時間が採用されていました。

私は、Retrospectiveに関してはタイムボックスはあまり意識しないようにしています。正確には、プロセス改善のため有意義な議論が成されているのであれば、時間超過で議論を打ち切ることはせず、多少の時間オーバーには目をつぶっています。タイムボックスを守ることを優先し、Retrospectiveの本来の目的が損なわれるのは避けたいからです。

現状、スクラムチームとしてまだまだ成長過程にあるので、そういった状況ではタイムボックス厳守よりも、プロセス改善にまずはフォーカスすべきだと考えています。もちろん、将来的にはタイムボックスも意識するようにした方が良いと思います。

ちなみに現在のチームでは、「いまの状況だとそもそもRetrospectiveの時間が足りないから、伸ばしても良いのでは」と意見が出たので、十分な議論ができるようにタイムボックス自体を伸ばし1時間半とすることにしました。これも、Retrospectiveの本来の目的のためです。

### 意識的に改善点、進化すべき点は出すべき
個人的な意見かもしれませんが、Retrospectiveの場では意識的に改善点(=Try)を挙げるべきなのは当然だと思います。また、特段悪いところがなくともチームとしてさらにより良い方向に向かうTryを掲げ、常に進化し続けるチームを目指すべきだと思います。

改善点については言わずもがな、現状のチームとして良くない状況を正すために必要なものです。現在のチームでは、改善すべき点があるためRetrospectiveではTryが挙げられています。当面の間、Tryが挙がらないということはないと思います。

チームとしてさらにより良い方向に向かうTryは、「現状維持は衰退」という状況を避けるためです。よく言われている言葉だとは思いますが、スクラムにとっても同じことかなと思います。改善点がないから目立った議論がなくRetrospectiveは終了ということであれば、それは衰退への第一歩かなと。

## おわりに

新米スクラムマスターの思考メモの第２回、Retrospective編は以上となります。今回も個人的な意見が色濃く入ってしまいました^^;

次回は、Sprint Planningでの思考メモについて記述したいと思います。

