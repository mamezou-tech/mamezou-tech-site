---
title: スクラム入門の勉強会を開催しました
author: shigeki-shoji
date: 2024-04-18
tags: ["アジャイル開発", AWS, "新人向け"]
image: false
---

こんにちは、[庄司](https://github.com/edward-mamezou)です。弊社では隔週の朝「アジャイル勉強会」を開催しています。2月にあったこの「アジャイル勉強会」で4月に入ってこられる新入社員向けの勉強会をしてみたいという提案がスクラムマスターの亀井からありました。この提案をエスカレーションしたところ正式に進めましょうということになり準備が始まりました。

アジャイル開発にはいくつかのフレームワークがあります。この中で最もポピュラーな「スクラム」を題材にチーム基盤型学習 (Team-based Learning) で進めると良さそうと設計を進めました。日程は4日でそれを1スプリントとしてプランニングからレトロスペクティブまでを体験していただくことにしました。

スクラムはチームが協働してプロダクトを開発していきます。チームはスクラムマスター1人 (亀井)、プロダクトオーナー1人 (中村)、複数の開発者 (今回は3人の新入社員とテックリードとして庄司が参画) で構成されます。スクラムの勉強会というとスクラムマスターにフォーカスするケースが多いですが、今回は開発者を意識して設計しました。

## 1日目

まず参加者の自己紹介からはじめて、スクラムの概要の説明、そしてバーチャルステークホルダー (ある韓国ドラマに登場する牛のぬいぐるみを活用) からプロダクトの構想を説明しました。プロダクトの企画は簡略化した Amazon の Working Backwards を使用しました。

プロダクトのアーキテクチャ図は下のようになります。

![アーキテクチャ図](/img/blogs/2024/introduction-to-scrum/architecture.png)

このプロダクト企画ではサービス名を考えていなかったのですが、これを開発者で検討していただきました。命名では活発に意見を出し合い、略称やキャッチコピーまで出ました。これは想定外の嬉しい出来事でした。

この後プランニングに入りました。実際の開発現場と同様、最初はわからないことばかりからのスタートです。プロダクトの概要の説明とこれまで経験したことのない AWS のアーキテクチャ図を見た後、見積もりをと言われて大きな戸惑いを感じているようでした。

この状況下でフィボナッチ数を使った見積もりは無理があると判断して、Tシャツのサイズ (S、M、L) で見積もりをすることにして、このアイテムは S だろうということから、見積もりが進むようになりました。

初日1スプリント目のスプリントゴール、バックログを作成できました。とはいえ、命名時の表情との違いからも、大きな不安を抱えた船出となったように思います。

## 2日目

プロダクト開発を探索的に進めるからといって、ただ闇雲に突き進むのは効率の良いものではありません。実際のスクラムでの開発の場合も「技術的スパイク」としてタイムボックスを決めて取り組むことがよくあります。

プランニングの時点で2日目の大半を「技術的スパイク」として AWS を学ぶことを計画していて、それを実施しました。マネジメントコンソールの使い方に始まり、S3へのファイルのアップロード、S3からのダウンロードや Step Functions の使い方を学びました。

技術的スパイク解決のために、AWS のハンズオンに近いことを実施しました。これで初日に感じたであろう不安を少しは軽減できたように思います。実際、操作に慣れてくるに従って会話が増え、また表情も明るくなったように感じました。そして、会話が増えるにつれコラボレーションの質も高まっていったように思います。さらには私の凡ミスへの指摘や自身で調べて内容を共有するといったことが起こりました。

この日は「S3にアップロードされた動画ファイルから文字を起こし、S3からダウンロードできるようにする」という目標に到達できました。目標を達成したことで不安の軽減に大きく貢献したのではないかと思います。この日のデイリーレトロスペクティブでホワイトボードに非常に多くの付箋が貼られたことからもそう考えています。Fun - Done - Learn で行ったのですが、Learn にかなり偏りがありました。

## 3日目

アーキテクチャ図では、文字起こしから [Amazon Bedrock](https://aws.amazon.com/jp/bedrock/) を使用して要約するプロダクトゴールを構想していましたが、プランニングの時点でそれよりも先に文字起こしから英訳の実現をプロダクトオーナーから要求されたというシナリオにしていたため、3日目は英訳の機能を追加することになりました。

英訳機能追加のおおよその目処がたったところで、プロダクトとしての魅力を高めるにはどうしたら良いかや今の実装での課題を4人でディスカッションしました。このうちのいくつかあった軽いものを最終日に向けて反映しました。2日目で多くの不安が解消していたように思いますが、3日目はかなり余裕があったようです。この課題のディスカッションの中でも、スプリントのスコープ外の課題が話題になるなど、活発に意見交換ができました。

![改善案](/img/blogs/2024/introduction-to-scrum/issues.jpg)

[Amazon Transcribe](https://aws.amazon.com/jp/transcribe/) による文字起こしを使って、翻訳を実現する Step Functions は 2021年10月5日の AWS の公式ブログに「[AWS Step Functions が、ワークフローの自動化を容易にする 200 の AWS サービスのサポートを開始](https://aws.amazon.com/jp/blogs/news/now-aws-step-functions-supports-200-aws-services-to-enable-easier-workflow-automation/)」という記事があり、幾らかはまりポイントはありましたがこれを参考にして構築できました。

3日目のデイリーレトロスペクティブでは、Fun が少ないなと個人的にはさびしく感じながら Done と Learn が多いという結果になりました。

## 最終日 (4日目)

最終日は、スプリントレビューに向けて作成物を整理しプレゼンテーションの準備とスプリントレビュー、そしてレトロスペクティブを行いました。スプリントレビューには社内からも数名の参加があり4日間の成果であることに驚く声もあって活発なフィードバックを得られる良い機会となりました。

スプリントレビューで当初のプロダクト企画への改善点も含む内容でプレゼンテーションとデモをしていただき、実際のプロダクト開発だったとしても有益なフィードバックとなっただろうと感じています。

レトロスペクティブでは、偏りも少なくなっていた印象です。最終的にはチーム開発を楽しいと感じていただけたように受け止めています。

![レトロスペクティブ](/img/blogs/2024/introduction-to-scrum/retro.jpg)

## おわりに

実際の開発案件のスプリント期間をみると1週間というところも多く見かけます。4日を1スプリントとする今回の取り組みは、ほぼ1週間スプリントに対応するものであり現実的なプログラムになったと考えています。またスクラムとチーム基盤型学習 (TBL) の相性の良さを感じることができました。

今回の勉強会の場合、全員が最初のフェーズから入っていますが、それでも最初のプランニングで大きな不安を感じたと考えていて、実際のスクラムを採用する開発チームに参画する場合だと、そのチームに蓄積された暗黙知が大きければ大きいほどプランニングの場で大きな不安を感じるだろうなとメンバーを通して大きな気づきが得られました。こうした不安の軽減策を考えていきたいです。