---
title: アジャイル実践者に捧ぐちょっぴり(?)ダークなステークホルダーマネジメント
author: makiko-nakasato
date: 2023-07-28
tags: [アジャイル開発, summer2023]
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2023-summer/
---
この記事は[夏のリレー連載2023](/events/season/2023-summer/)の5日目の記事です。

## はじめに
中佐藤です。

夏といえば「怪談」ですね。この記事は夏のリレー企画の怪談枠です。みなさま、背筋がヒヤッとする内容をお楽しみください。ここに書かれている内容はフィクションです（いいですか、フィクションですよ）。
ちなみに、後になればなるほど、ダーク度合が増します。

## なぜこんな内容を？
アジャイル開発もごく当たり前になり、キラキラした事例はたくさん聞きます。それはそれでもちろんすばらしいのですが、裏にある薄暗い部分はなかなか表には出てきません。あえて出すことで、もしかしたら救われる人もいるかも、と思い記事にすることにしました。
では、みなさん、百物語ならぬ六物語をお楽しみください。

## 一．ステークホルダーを可能な限り「仲間」にする
アジャイルのチームというのは、うまくチームになると結束力が強いです。これはこれで正しいのですが、チームの外の人から見ると、何だかチーム内では楽しげにやっているけど、何やっているかようわからん、という一種の疎外感につながることがあります。リモートワークが当たり前になって、この傾向はより強くなったような気がします。

ステークホルダーもできるだけ「仲間」にしてください。ずっとチームに同席しろってのは無理な話なのですが、ステークホルダーも一緒にプロダクトを作り上げる仲間である、ということを意識してもらうようにするのが大事です。

そしてこのための仕組みのひとつがスプリントレビューだと思っています。スプリントレビューで、ステークホルダーを「敵」にしないでください。うまく場の雰囲気を作っていくファシリテーション力が、スクラムマスターやプロダクトオーナーに求められます。よりよいプロダクトを作るための意見交換の場であることを参加者全員に認識してもらい、その場で出た意見を歓迎し、その意見が結果的にどう反映されたかフィードバックする、これを繰り返し実施する必要があります。

## 二．レビュー依頼すればフィードバックはあって当然
レビューを受けた結果、いろいろとコメントが出てきます。その時に、ああ完璧じゃなかった、とがっかりする人がいるのですが、そんな風に落ち込まないでください。

レビューしてください、とお願いしているのですから、何らかのフィードバックは返ってきて当然です。相手のステークホルダーの立場になって考えてみましょう。意見を求められているのですから、何かコメントしないと、仕事をしていないような気になるものです。

ステークホルダーを「敵」と見なさないという、前の項目にも関係していますが、プロダクトをよりよくするために現時点のプロダクトに対して意見を述べているのであり、それを作った自分やチームを責められているわけではない、と考えましょう。そうでないと、レビューを受けることそのものを忌避してしまう傾向さえ出てきます。

## 三．選択肢を用意する
設計というのは絶えず選択肢を考え、それを選ぶ行為の連続です。これはモノの作り方もそうですし、プロダクトの機能もそうです。例えば、多くのユーザーを取り込むために機能は豊富にしたいけれど、機能が増えると性能は落ちる、もしくは使いづらくなる、ということはよく起こるジレンマです。

ここに唯一の正解はありません。ただ、選択したひとつの結果だけを見せられた側としては、え、別の選択肢はなかったの、と言いたくなることもあります。選択の経緯まで含めて共有しましょう。「こういう選択肢があって、このように考えてこちらを選びました」と言えば納得してもらいやすいです。

もしくは時間的に余裕があれば、選択そのものをステークホルダーに任せてもよいでしょう。「複数の選択肢があるのですが、どちらがよいでしょう」をメリット・デメリットも含めて提示します。自分で選んだ選択肢であれば、納得しやすいです。

ちょっと腹黒く、コンサルがお客様に提案する時のテクニックとして、以前聞いたことをこっそりお教えします：
> 提案をする時には、複数案を示せ。
> ひとつの案だけだと、提案を受けた相手にとってはそれに「ケチをつける」ことが仕事になる。
> 複数案があれば、そこから「選択する」ことが仕事になる。

## 四．説明や資料で「なぜ」を付け加える
前項目にも出てきますが、人間、選んだ結果だけを示されるより、その経緯まで共有されるほうが、納得しやすいです。アジャイルチーム内は、絶えず対話することで、自然にこのような共有を行っていますが、チーム外にはこれが伝わりづらい。「中の人」は当たり前に知っていることで、外の人には伝わっていないことがあり、かつ、外の人が知らないということそのものを中の人は知らない、という点が悩ましいです。

口頭で説明する時にも「結果として決まったこと」以上に「決定の背景や理由」を共有するようにしてください。ステークホルダーとのやり取りは、文書ベースになることも多く、その場合も「なぜこうなったか」を書くことが重要です。

## 五．プロダクトバックログの仕組みを利用する
思いつきでものを言うステークホルダーは残念ながら存在します。こういう方相手には、プロダクトバックログの優先順位付けの仕組みをうまく利用しましょう。大丈夫、この手のステークホルダーはどうせスクラムの仕組みなんてちゃんと理解していません。「かしこまりました、いただいたご意見はチームのToDoリストに入れて対応します（優先順位は最低だけど、と心の中だけで付け加えておく）」で、その場は収まります。

相手が本当にその内容を大事だと思っているなら、後日、そういえばあれどうなった？と言ってきます。言ってこなかったら、完全にその場の思いつきであり、プロダクトバックログの低ぅぅぅい優先順位の闇に寝かしておけばよいのです。ええ、チームのやることリストに入れた、ってのは嘘じゃないですよ。

## 六．あえてアジャイル開発と言わない
おい、「アジャイル実践者に捧ぐ」やないんかーい、という声が聞こえますが、これがラストの項目です。

ここまでアジャイルが一般的になった現時点でも、非常に残念なことにアジャイルの自分に都合のよい面だけを見ている輩は存在します。この手の輩はアジャイル開発の難しい面には目をつぶり、いや、ビジネス側にも継続的に関与してもらわないといけないんですが、なんて話を出すと「純粋なアジャイル開発は実践的ではない（だから自分たちに都合よく変えていい）」などと言い出します。

そのくせ、「変化に柔軟に対応」とか「要件変更はいつでもできる」とかは聞きかじっていて、アジャイル開発なんだからどんどん変更できるんでしょ、とオレオレ要望を出してきます。こういうステークホルダーには、アジャイル開発と明言しないほうが、実際にものづくりをするチームが不幸にならなくて済みます。

本来トップマネジメントからすれば、細かいスプリント期間なんてどうでもよくて、例えば今までリリース期間が1年だったものが、四半期ごとになるだけで、ビジネスインパクトはあるはずです。めんどくさいステークホルダーには、ここを強調すればいいだけであり、中の「作り方」はチームにお任せでよいはずです。

## まとめ
実はこれらのテクニックは、昔から存在するものです。

ウォーターフォール開発前提の頃から、老練なプロジェクトマネージャーはこの類のテクニックをほぼ無意識に使い、ステークホルダーマネジメントをしてきました。ところが、アジャイル開発の理想を追い求める実践者（これはこれで尊い）には、こういう腹黒ノウハウが逆に失われているのでは、と感じています。

理想と現実の狭間で潰れてしまう人たちの、少しでも心の支えになれば、と思い、この記事を書きました。
