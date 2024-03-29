---
title: 品質保証者の憂鬱「そこのあなた、無闇にメトリクスを増やしていませんか？」
author: shuichi-takatsu
date: 2023-08-03
tags: [品質保証, QA, summer2023]
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2023-summer/
---

この記事は[夏のリレー連載2023](/events/season/2023-summer/)第9日目の記事です。
いやぁ、本当に毎日暑いですね。  
なので今回はちょっとゾッとする（肝が冷えるかどうかは別ですが）話をしたいと思います。  

## 「エビデンスを見せろ」と詰められる

[前回](/blogs/2023/06/26/melancholy-of-qaer-06/)はトム・デマルコ氏による「計測できないものは制御できない」について筆者の思うところを語りました。  

筆者はソフトウェア開発現場で長い期間にわたり品質管理・品質保証の仕事に従事してまいりました。  
時間的な長さで言えば、品質管理・品質保証の仕事に従事していた期間よりもソフトウェア開発に従事していた期間の方が圧倒的に長いのですが、品質管理・品質保証を担当していた時の仕事内容は、開発者時代に引けを取らないような驚異の連続でした。  

40年近くソフトウェア開発関連の仕事に従事していると、ソフトウェアに期待される性能がどんどんと高度になっていくのを目の当たりにしてきました。  
同時にソフトウェアの品質に対する要求もどんどんと高度になり、更に重要になっていきました。

筆者がまだバリバリのソフトウェア開発者だった時代、何度も品質保証部門の方から怒られたものです。  
品質管理・品質保証とは何なのかよく分かっていなかった頃は、品質保証部門の方に「エビデンスを見せろ」と詰められたものです。  

「エビデンス」という言葉を当時の筆者は知らなかったので、品質保証部門の人から「エビデンス！」って言われた時には、一応分かったような顔をして頷いておいて、家に帰ってから辞書を使って調べたものです。（まだインターネットも無かった時代の話です）

皆様は既にご存知かと思いますが「エビデンス」とは「証拠、根拠、形跡」という意味です。  
品質保証部門の人からは「いまお前の作っているソフトウェアが正しく作成され、正しく動作するというエビデンスを見せろ」と詰められ、それがとにかく怖かったのを覚えています。    
とくに現場でトラブルが発生した後の品質保証担当者の眼光と言ったら、、。  
あの目に睨まれたら石にされそうでした。  
「鬼の形相」とはこういうことかと思ったものです。  

筆者が新人だった頃はまさにソフトウェア黎明期って感じで、良くも悪くも開発者の腕一つでソフトウェア品質の良し悪しが左右された時代でした。  
まだ「メトリクス（管理指標）」なんて言葉も聞いたことが無く（世間では当然言われていたと思いますが）、ソフトウェアの品質保証に必要なエビデンスになりうるようなメトリクスはほとんど収集されていませんでした。

当時、計画したテストを全件実施したりとか、検出した欠陥はすべて修正したといったありきたりのメトリクスは収集できていましたが、現場のトラブルは全く収束する気配がなく、最後は開発部門と品質保証部門の双方で「困ったなぁ」と嘆きつつ、全力で「もぐら叩き」でバグを修正する日々でした。  

# 無限増殖するメトリクス（奴らはいつも大群でやってくる）

ソフトウェア製品を納品したほぼ全ての現場でトラブルが発生していた時、困っていたのは品質保証部門だけではありません。  
当然、当事者である開発部門も頭を抱えていました。  
担当者も管理者も自問自答します。  
「何が駄目なんだろう？」  
「まだ管理が甘いのだろうか？」  

何度もQC7つ道具の管理図や特性要因図（フィッシュボーンダイアグラム）を描いてみたり、過去に発生したトラブルの原因と対策のチェックリストを作ってみたりと、様々な対策が取られました。  
このような活動を通して新しいメトリクス（管理指標）が次々に導入されました。

当時収集していたメトリクスは以下のようなデータが大半を占めました。  
- 仕様書や設計書の作成に何時間を費やした。
- 何件のテスト項目を実施した。
- 仕様書や設計書のレビューを何時間実施した。
- 既存障害を分析して作成したチェックリストを全件チェックした。

作業見積もりなどの作業に要する時間データは重要なメトリクスです。  
テスト項目数も、レビュー時間も、チェック実施数も「条件によっては」重要なメトリクスです。  
しかし、これらのメトリクスだけではあまり意味がありません。  
上記に示したメトリクスはどれも「インプット情報」です。  
言い過ぎのように聞こえるかもしれませんが、インプット情報だけを取り続けても労力の無駄に終わるでしょう。  
原因（インプット）と結果（アウトプット）を正しく評価できないメトリクス収集は無駄な労力となって担当者を苦しめます。  

こんなことを続けていても、お客様のところで発生する障害の件数は高止まりしたままでした。  
現場で発生するトラブル数が小手先の対処では対応不可能なレベルになり、ついには事業部全体に「ソフトウェア品質総点検」の大号令がかかりました。  
大号令の結果、ルールを逸脱していないかを逐一チェックされ、工数は更に細かく管理され、計画と実績が少しでも乖離すると原因究明の名のもとに更にメトリクス（管理指標）が追加され、チェックリストはチェック項目の内容が変更されるよりも早く新しいチェック項目が追加されていきました。  
それでも飽き足らず、世の中に公開されている様々な文献を調べ、次々と新しいメトリクス（管理指標）の収集が求められていきました。  
ついに「無限に増え続けるメトリクス（管理指標）」地獄のループが完成します。  

筆者の在籍していた開発部門の壁を見ると、壁一面に訳の分からないメトリクスの表やグラフが貼り出されているのです。  
今思えば「何の古代壁画ですか？」ってくらい意味不明なメトリクスでしたが、当時としてはかなり真面目にやっていました。  
担当者が毎日方眼紙にグラフを作成し（Excelなんてものが無かった頃の話です）、そのグラフを壁に貼り付ける様は、地獄の囚人が懺悔のためにグラフを貼り出しているようなものでした。  
グラフを貼りさえすれば、これまでの罪が許されると思っているかのような光景でした。  

# 誰も「止めよう」と言えない（それを言ったらジ・エンド）

皆様の職場にも”無闇に長いチェックリスト”とか”何に利用しているのかわからないデータ収集”のようなものはないでしょうか？

当時の筆者の職場にも長大な絵巻物みたいなチェックリストや、何に使われているがが分からないデータが大量にありました。  
おそらく何かの「権威ある文献」には”有用なメトリクス”として紹介されているメトリクスだと思われます。

しかし、無駄に増え続けるチェックリストなどは害悪でしかないと思います。  
筆者が知っている最も長かったチェックリストは2000行ほどありました。  
（別の部署には数年分の現場クレームの対策リストを繋げ合わせたチェックリストがあり、行数はもっと多かったと記憶しています）  
ただし、開発者がそんな重厚長大なチェックリストをちゃんと全件チェックするか？と問われたら、そのほとんどは「NO！」だと思います。  
無駄に長いチェックリストは一括で”全件チェック完了”と設定されてしまうのが関の山です。  

何に利用しているかわからないデータについても、正しくデータが投入されない可能性があります。  
特にデータをインプットしている担当者が「投入したデータから有益なフィードバックを受け取ったことがない」と思っている場合は、”確実に”データ投入は形骸化していきます。  
筆者の知人（日科技連の研究会で知り合いました）の勤める会社では、毎日終業前の30分はその日に実施した作業内容をデータ投入する時間に当てられると言っていました。  
しかし、悲しいことに、そのデータが何に利用され、自分たちの開発に役立っているのかどうか不明だと嘆いていました。（仕組み化されているので、データ投入しない限りその日の業務が終了したことにならないのだとか）

では、誰かが「そんな馬鹿らしいこと止めよう」と言えばいいのでしょうか？  

一度始めたメトリクスの収集を止めることはなかなかできません。  
事実として、そのメトリクスが有効に活用されていなかったとしても。  

仮に誰かが「止めよう！」と叫んでも、他の誰かが「いや、何か役になっているかもしれない。止めたことによる影響が無いって断言できるだろうか？」と反論し、「影響が無いことを証明できない限り継続」が選択されてしまいます。  
それでもめげずに廃止を訴えようものなら「はぁ？じゃあお前が責任取ってくれるんだよな」と詰め寄られます。それを言ってしまったら「ジ・エンド」になる可能性があります。  
誰も責任なんて取りたくないのです。  

# 絢爛豪華なダッシュボード（誰も見ていないのに増える）

どこの職場にもルールやプロセスがあるでしょう。  
決めたことをきっちり守ることは重要です。  
でも、ルールやプロセスの見直しをかけることは守ることと同じくらい重要だと思います。  
ルールやプロセスを「頑なに」守ろうとするあまり、目的と手段が入れ替わってしまうことは意外と多く起こります。  
メトリクスを活用することよりも、メトリクスを収集することが目的化しているケースは多いです。  

あるメトリクスを導入しようとした時は何か目的があったはずです。  
しかし、時間の経過とともにメトリクスの導入当時に設定していた目的・目標を知る人がいなくなり、ルール（メトリクスを収集する）を管理する人だけが無機質的に運用するようになることが多いです。  

筆者の過去の職場にも「誰も見ない絢爛豪華なダッシュボード」がありました。  
きっと最初の頃は必要最低限のメトリクスを表示していたのだと想像します。  
しかし長い年月を経て「あれも見たい」「これも見たい」と無作為にメトリクス（管理指標）が追加され、今となっては「何を判断するためのダッシュボードか不明」という状態でした。  
ツギハギなので、当時の面影はありません。  
フランケンシュタイン博士の怪物の誕生です。  

このダッシュボードも「このメトリクスはもう見られていないからダッシュボードから消そう」と思っても、「いやいや、もしかしたらまだ誰かが見ているかもしれない」という懸念を消し去ることができず、お掃除はいつも後回しになってしまうのです。  
（誰だって、消してしまった後に「なんで消したんだ！」って怒られたくはないですからね）

そして誰も見ていないはずのダッシュボードなのに、何故かメトリクスが増えていくんです。  
いつか誰かに見てもらうために…。  
怖いですよね。

# GQMという考え方

暗い怖い話ばかりをしてきましたが「無限増殖メトリクス」や「長大なチェックリスト」「見られないダッシュボード」を改善する手立てが無いわけではありません。  

GQMは、ソフトウェアエンジニアリングやプロジェクト管理などで使用される効果的な目標設定と測定の手法です。  
GQMは「Goal」と「Question」と「Metric」のそれぞれの頭文字を取ったものです。  
GQMの主要な目的は、具体的なゴールを設定し、それに基づいて適切な質問を置き、質問に対応するメトリクスを策定することで、プロジェクトの成果や品質を評価・向上させることです。

GQM手法のそれぞれの項目の定義は以下になります。  

- ゴール（Goal）の定義：  
プロジェクトやプロセスの成功基準を定めるために、具体的なゴールを設定します。  
ゴールは、プロジェクトやプロセスの改善や問題解決に向けた望ましい結果や成果を明確に示すものです。  
例えば、「出荷前のソフトウェア品質を安定させる」がゴールの例です。  

- 質問（Question）の定義：  
ゴールが設定されたら、そのゴールを達成するために必要な情報を得るための具体的な質問を立てます。  
これらの質問は、ゴールに関連し、達成状況を測定するための基準となります。  
例えば、「総合評価で検出されるソフトウェアの欠陥は収束しているか？」が質問の例です。

- メトリック（Metric）の定義：  
質問が設定されたら、それに対応する答えを定量的に測定するための指標（メトリック）を定義します。  
これにより、目標の進捗状況や達成度を客観的に評価することが可能になります。  
メトリックは数値化されることが一般的で、定量的なデータを用いて評価されます。  
例えば、「テスト全期間の欠陥検出率と出荷前の一定期間の欠陥検出率の比率」がメトリックの例です。

GQM手法は、プロジェクトの目標と成功基準を明確にし、それらを定量的に評価することで、プロジェクトの進行状況を把握し、改善策を立てるのに役立ちます。  

メトリクスを見て「これは何のためにやっているんだ？」という素朴な質問に誰も答えられない場合、そんなメトリクスには”無理・無駄・ムラ”が潜んでいます。  
見直しのチャンスです。  

# 人間は追い詰められるとどんな嘘でもつく

どんなに仕組みやプロセスを整備しても、それを運用する人間が仕組みやプロセスを遵守しないなら、絵に描いた餅になります。  
前回も話しましたが、人間は追い詰められるとどんな嘘でもつきます。
データを改ざんしたり、都合のいいように仕組みを変えたりするのです。  

筆者が品質保証を担当したあるプロジェクトでの話ですが、そのプロジェクトで作成されるソフトウェア製品は他の製品に比べて格段に品質が悪かったのですが、何故かテスト結果は良好でした。  
そのプロジェクトではソフトウェアの品質が安定したかどうかを判断する指標の一つに「信頼度成長曲線」を使っていました。  
その「信頼度成長曲線」がなんというか…綺麗すぎるのです。  
普通はテストの停滞やボトルネック障害の影響で曲線が「ガタガタ」するのが常なのですが、そのプロジェクトで描かれている信頼度成長曲線は”異常”に綺麗なのです。  

信頼度成長曲線を作成している担当者に「信頼度成長曲線がすごく綺麗だけど、生データを見せていただけますか？」と問いかけると、担当者は非常に困った顔をして生データを出し渋りました。  
担当者曰く「生データを見てもよく分からないと思いますよ。色々と整形しているので」。  
一体何のことを言っているのだろう？と不思議に思いながら、彼がデータをプロットしているマクロ付きのExcelシートをもらいました。  
そこには「信頼度成長曲線を綺麗に整形するマクロ」が組み込まれていたのです。  
担当者によると、綺麗な信頼度成長曲線以外は上長が認めてくれないからこのような補正（データ改ざん）をするようになったとのこと。
でも、これではまったく意味がありません。  

メトリクスに無理・無駄・ムラを発見したら、上記のGQMの視点でメトリクスを再点検し「このメトリクスは本当に役に立っているのか？」を今一度検討することが必要です。  
メトリクスが多すぎる場合「止める勇気」を持つためにも、GQM手法は有効だと思います。

もし、あなたの部門が増えすぎたメトリクスのせいで、開発者／品質保証者ともに疲弊している場合、危機的な状況に陥る前に手を打つことをおすすめします。
