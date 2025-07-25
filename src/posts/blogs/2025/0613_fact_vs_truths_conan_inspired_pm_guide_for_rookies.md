---
title:  「事実はひとつ、真実は人の数だけ？」─ 新人プロジェクトマネージャーがコナンに学ぶ“探偵型マネジメント”思考法
author: makoto-takahashi
date: 2025-06-13
tags: [ProjectManagement, プロジェクト管理, 新人向け]
---
# はじめに
新人プロジェクトマネージャー（PM）の皆さん。
メンバーとの「認識のズレ」やコミュニケーションの難しさに悩むことがありますよね。

その原因は、客観的な **「事実」** と、主観的な **「真実」** を混同しているからかもしれません。

この記事では「探偵型マネジメント」という思考法を紹介します。
コナンの言葉をヒントに「事実」と「真実」を見極め、プロジェクトを円滑に進めます。

> 「真実はいつもひとつ！」  
> ― 名探偵コナン

しかし、プロジェクトの現場に立つと、次のように思うことがあります。
「本当に、私たちが向き合うべき“真実”は、1つだけなのだろうか。」と。

報告書の内容と現場の肌感覚のギャップ、噛み合わない会話…。
そういった状況を乗り越えるヒントが、この記事にはあります。

:::info
この記事は新人プロジェクトマネージャー向けシリーズ記事の一部です。

1. [第1回：「問題」と「課題」の違いから始めよう（課題管理入門）](https://developer.mamezou-tech.com/blogs/2025/06/06/from_problem_to_action_issue_management_for_rookies/)
2. **第2回：探偵型マネジメント ― 真実をどう見抜くか？（思考法・観察編）**
3. [第3回：「問題」と「リスク」の違いから始める（リスク管理入門）](https://developer.mamezou-tech.com/blogs/2025/06/20/risk_management_starting_with_risk_vs_problem_for_rookies/)
4. [第4回：「問題」をSOAPで診て「課題」を処方する（問題解決編）](https://developer.mamezou-tech.com/blogs/2025/06/27/soap_based_project_problem_diagnosis_for_rookie/)
5. [第5回：「問題解決型」と「課題達成型」を切り替える思考法（思考スイッチ編）](https://developer.mamezou-tech.com/blogs/2025/06/30/problem_solving_vs_task_achieving_pm_thinking_for_rookies/)

👉 初めて読む方は [第1回から読む](https://developer.mamezou-tech.com/blogs/2025/06/06/from_problem_to_action_issue_management_for_rookies/) のがおすすめです。
:::

# 「事実」と「真実」の違いを、まず整理しましょう
さて、まず始めに、この2つの言葉が持つ意味の基本的な違いを押さえておきましょう。

| 種類          | 定義                                     | 特徴                      |
| :------------ | :--------------------------------------- | :------------------------ |
| **事実 (Fact)** | 客観的に観測・検証可能な出来事やデータ         | 基本的に1つしか存在しない   |
| **真実 (Truth)**| 人が「本当だ」と信じている主観的な理解や信念 | 人の数だけ存在しうる      |

## プロジェクトにおける「事実」の例
これらは、誰が見ても「はい、その通りです」と確認できる、客観的な情報のことですね。
- WBS上のタスク「機能仕様書を作成する」が昨日完了した。（成果物が提出されています）
- テストケース100件のうち、バグが5件検出された。（テストレポートに記録があります）
- 今週のチームメンバーの総作業時間は120時間だった。（勤怠記録と一致します）
- 顧客との会議で「X機能の追加」が正式に決定された。（議事録に明記されています）

これらは、データや記録によって裏付けられる客観的な情報です。

:::info:【用語補足】WBS（Work Breakdown Structure）とは
WBSは「Work Breakdown Structure」の略で、プロジェクト全体の作業を構造的に分解した作業一覧表のことです。  
要件定義・設計・実装・テストなどをタスク単位に分けることで、スケジュールや進捗管理を行いやすくします。
:::

## 一方で、「真実」は少し複雑です
これらは、決して“嘘”というわけではありません。それぞれの人にとっては、紛れもない「本当のこと」なのです。
- 開発者のAさん：「このスケジュールでは、十分な品質を担保するのは無理だと思っています」
  （Aさんの経験に基づいた偽らざる“真実”です）
- 営業担当のBさん：「お客様は絶対、この機能に満足してくれるはずです」
  （Bさんの期待が込められた“真実”ですね）
- ユーザーのCさん：「この新しいシステムは、どうも使いにくいと感じます」
  （Cさんの実体験からくる、率直な“真実”です）
- そしてPMのあなた：「チームの雰囲気は良好だと思っている」
  （あなたの観察に基づいた“真実”です）

# コナンの「真実はいつもひとつ！」は、正しいのでしょうか
この問いに対する私の答えは、 **「文脈によります」** というものです。
名探偵コナンの「真実はいつもひとつ！」という有名なセリフ。

これは主に、 **事件の客観的な真相、つまり「事実」そのもの** を指しています。
探偵は、嘘や誤解、食い違う証言が渦巻く中でも、たった1つだけ起きた「出来事」を追い求めます。

- 本当に起こったことは、1つだけです。
- 犯人も、その動機や手口も、突き詰めれば1つの真相にたどり着くはずです。

この信念のもと、 **唯一解明されるべき事実** を追求する立場から、この言葉は使われているのですね。
一方で、私たちの日常やプロジェクトにおける「真実」には、その人の主観的な解釈や信念が含まれます。

ですから、「真実」は人の数だけあり得る。
このように、文脈や対象によって「真実」という言葉の意味合いは変わってくるのです。

# コナンの言葉は、私たちPMにどう響くでしょうか
プロジェクトマネジメントでも「探偵的な視点」は不可欠です。
つまり、客観的な事実をとことん追求する姿勢が求められます。

- なぜ、計画に対して遅延が発生したのか。
- なぜ、同じような不具合が繰り返し起きてしまうのか。
- なぜ、お客様との間に認識の齟齬が生まれてしまったのか。

その「根本的な原因となっている事実」を特定する作業は、まさに探偵の捜査プロセスに似ています。
データや記録を調べ、関係者に丁寧に話を聞き、証拠を集めて原因を究明する。

ここで曖昧な情報を鵜呑みにしたり、表面的な事象に惑わされたりしていては、的確な対策を打つことはできません。

## しかし、現場は“複数の真実”に満ちています
一方で、プロジェクトは論理や客観的な事実だけで成り立っているわけではありません。
多くの「人」が関わり、それぞれの「想い」や「立場」、「経験」に基づいた多様な「真実」が存在します。

例えば、あるメンバーが会議に遅刻した、という1つの「事実」があったとしましょう。

- 上司の“真実”：「また遅刻だ。彼は業務を軽んじているのではないか。」
- 本人の“真実”：「直前の緊急対応に追われ連絡も入れた。最速で来たつもりなのに…。」

どちらかが「嘘」をついているとは限りませんよね。
同じ「事実」に対する、主観的な解釈の違いが、すれ違いや人間関係の対立を生んでしまうのです。

ここに、コナンの言葉だけでは乗り越えられない、プロジェクトの人間的な複雑さがあります。

# では、私たちPMには、何ができるのでしょうか
私たちPMには、客観的な「事実」を収集・分析する大切な責任があります。
それに基づき計画を立て、進捗を管理するのです。

それと同時に、多様なステークホルダーが抱える「真実」にも向き合う必要があります。
それぞれの「真実」に、真摯に耳を傾けなければなりません。

:::info:【用語補足】ステークホルダー（Stakeholder）とは
プロジェクトに関わる利害関係者のことです。  
チームメンバー、顧客、上司、経営層などが該当し、プロジェクトの意思決定や成果に影響を与えたり、受けたりします。
:::

## 1. まずは「事実」に基づいたマネジメントを徹底する
PMは、客観的な「事実」に基づいて計画を立て、進捗を管理する責任があります。
これは、[以前の記事](https://developer.mamezou-tech.com/blogs/2025/06/06/from_problem_to_action_issue_management_for_rookies/)で触れた「問題」を正確に把握し、対策を講じるための大前提です。
「問題」とは「あるべき姿と現状のギャップ」のことを指します。

これらの「事実」は、プロジェクトの健康状態を示すバイタルサインです。
そして、客観的な意思決定の拠り所となります。

- 進捗報告、課題リスト、品質データなどの「事実」を正確に把握します。
  そして、関係者と透明性を持って共有しましょう。
- 「なんとなく遅れている気がします」といった曖昧な表現は避けましょう。
  「計画に対し実績が3日遅延しています」のように、具体的な「事実」で話すのが大切です。

## 2. 多様な「真実」に、丁寧に耳を傾ける

- **お客様の“真実”の例:** 「この機能がないと業務が回らない（だから何としても実現してほしい）」
- **チームメンバーの“真実”の例:** 「この技術的負債を解消しないと、将来必ず大きな問題になります（だから今対応させてほしい）」
- **経営層の“真実”の例:** 「このプロジェクトの成功が会社の成長に不可欠だ（だから絶対に失敗は許されない）」

これらの「真実」は客観的な「事実」と異なり、感情や期待、不安を含んでいます。
しかし、これらはプロジェクトの進行に非常に大きな影響を与えます。

PMがこれらの「真実」を無視したり、一方的に「それは違う」と否定したりすることは避けるべきです。
そうしてしまうと、関係者のモチベーション低下や協力体制の崩壊を招きかねません。

:::info:【用語補足】技術的負債（Technical Debt）とは
将来のメンテナンス性や品質を犠牲にして、短期的な開発スピードを優先した結果生じる設計上の“ツケ”のことです。
:::

## 3. 「事実」を土台に、「真実」を調和させるコミュニケーションを
では、PMは「客観的な事実」と「主観的な真実」を、具体的にどう取り扱えば良いのでしょうか。

1.  **徹底的な事実収集と共有:**
    まず、プロジェクトの状態を映す「事実」を偏りなく集めます。
    これを関係者間でオープンに共有することが、すべての出発点です。
    議論のための共通の土台を築くことが大切です。

2.  **アクティブリスニングによる「真実」の理解:**
    関係者が表明する「真実」に対して、まずは評価や判断を挟まずに耳を傾けましょう。
    「なぜそう思うのですか」「なぜそのように感じたのですか」
    「その背景には何があるのですか」といった点を丁寧にヒアリングします。
    そして、その人にとっての「本当のこと」を理解しようと努めることが大切です。

3.  **「事実」と「真実」の紐付けと分析:**
    収集した「事実」と、関係者の語る「真実」を照らし合わせてみましょう。
    例えば、メンバーが「スケジュールが厳しい」という「真実」を語っているとします。
    それを裏付ける進捗の遅れや稼働時間などの「事実」が、データにあるか確認します。
    あるいは、過去の失敗経験からの不安感が大きいのかもしれません。
    このように分析することで、問題の本質が見えやすくなります。

4.  **対話による共通理解の醸成と合意形成:**
    客観的な「事実」を示しつつ、各々の「真実」の背景にある想いや懸念を議題にします。
    そして、建設的な対話をしましょう。
    時には、全ての「真実」を完全に満たすことはできないかもしれません。
    その場合はプロジェクトの目標達成という大局的な視点に立ち返ります。
    優先順位をつけ、関係者が納得できる着地点を見つける努力が必要です。
    このプロセスでは、PMには議論を円滑に進める **ファシリテーター** としての役割が強く求められますね。

5.  **透明性の高い意思決定とその伝達:**
    最終的に決まったことと、なぜその決定に至ったのかという根拠を、関係者に明確に伝えましょう。
    その根拠には客観的な事実に加え、多様な真実をどう考慮したかを含めます。
    そうすることで関係者の納得感を高め、主体的な協力を引き出せます。

:::info:【用語補足】アクティブリスニング（Active Listening）とは
話し手の考えや感情を正確に理解するために、共感や質問を通じて注意深く耳を傾けるコミュニケーション技法のことです。
:::

## 新人PMの皆さんへ。明日から試せる3つのアクション
理屈は分かっても、何から始めれば…と戸惑うかもしれません。
まずは、小さなことからで大丈夫です。

明日から試せる3つのアクションを提案します。

- **アクション１：議事録の取り方を工夫してみる**
    会議の記録で「何が決まったか（事実）」と「誰がどんな意見を言ったか（真実/意見）」。
    この2つを意識して分けてメモを取ってみましょう。
- **アクション２：チームの声を聞き出す時間を作る**
    普段の会話で、少し勇気を出してチームメンバーに聞いてみましょう。
    「最近、気になっていることや、やりにくいと感じることはありますか。」と聞いてみましょう。
- **アクション３：報告に一言、現場の声を添える**
    週次報告などで、プロジェクトの進捗データ（事実）だけを伝えません。
    「現場ではこういう声が上がっています」といった定性的な情報（真実）も伝えましょう。

# まとめ：名探偵の目と、優れたカウンセラーの心で
「真実はいつもひとつ！」と断言できるのは、情報が出揃い、検証が終わった後です。
これは「事件の真相（＝事実）」に対しての言葉なのです。

しかし、私たちが日々向き合う進行中のプロジェクトは、常に不確実です。
そこでは多様な人々の主観的な「真実」が、複雑に絡み合っています。

優れたPMは、まるで名探偵のように鋭い観察眼で客観的な「事実」を追求し、問題の核心を見抜きます。
同時に、多様な関係者の「真実」に共感的に耳を傾け、調和させる姿勢も必要です。

プロジェクトを共通の目標へ導く、カウンセラーのような心も持っているのです。
事実を見極め、真実に耳を傾ける。

この姿勢を大切にすることで、あなたのプロジェクトはもっとスムーズに進むはずです。
最初から完璧にできなくても全く問題ありません。

今日から少しずつ、「探偵型マネジメント」を実践していきましょう。
もし困ったときは、一人で悩まず、ぜひ周りの先輩や上司に相談してくださいね。

あなたのPMとしての大切な一歩を、心から応援しています。
