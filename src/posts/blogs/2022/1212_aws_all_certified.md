---
title: AWS認定資格を12個すべて取得したので勉強したことなどをまとめます
author: kazuyuki-shiratani
date: 2022-12-12
tags: [AWS認定, advent2022]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---
これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第12日目の記事です。

## はじめに

初めまして、白谷です。AWS認定全12個（2022年10月時点）を達成しましたので、勉強したことや受験した感想などをまとめました。

:::info
[秘密保持契約（NDA）](https://aws.amazon.com/jp/certification/certification-agreement/)があるため、詳細な試験内容については触れることができませんので、ご了承ください。
:::


## 筆者について

筆者の簡単な属性を紹介します。

- 2022年2月中途入社の社会人18年目。
- 福岡在住でフルリモート勤務（執筆時点の出社回数は4回）。
- 同居人は同業者の妻と小学生の男子二人。
- 前職では開発の片手間で社内インフラ（社内ネットワークの構成と管理、VPN構築、自社製の勤怠管理システムの管理、など）の管理をしていた。
- 情報処理技術者試験のデータベーススペシャリスト、ネットワークスペシャリスト、情報処理安全確保支援士を保有。
- 豆蔵入社時点でAWSを触った経験なし。

## AWS認定12冠までの経緯

きっかけは豆蔵入社直後の事業部長との面談で、「APN(AWS Partner Network)のTierを上げるためにAWS認定の保有者が必要なので、Cloud Practitionerを取らないか」と勧められたことでした。
豆蔵に入社した理由が、「AWSやAzureなどのメガクラウドでサーバーレスなシステム構築などモダンな技術を使った開発に携わりたい」「豆蔵ではクラウドネイティブな開発している」でした。
前述のとおりAWSを触った経験がなかったので、資格試験から勉強するのもありだと思い、まずはCloud Practitionerの勉強を始めました。

そして1か月後にCloud Practitionerを取得すると「Solutions Architect – Professionalの保有者も必要だからいつか取得出来たらいいね」と言われ、「いつかと言ってるといつまでも取れないから取るなら今でしょ」と決心し、Solutions Architect – Professionalの取得に向けてAssociate試験から順に取得を進めました。

更に4か月後にSolutions Architect – Professionalを取得すると、[2022 APN ALL AWS Certifications Engineers の発表](https://aws.amazon.com/jp/blogs/psa/2022-apn-all-aws-certifications-engineers/)という記事を見つけ、「12個全部取ればここに名前載せられる」というのをモチベーションにSpecialtyの試験に手を出し始めました。

それでは、AWS認定全12個の取得のために行ったことを取得した順に簡単にまとめて行きます。

## AWS Certified Cloud Practitioner

CLF-C01、90分、65問。

いつまで勉強しても受けなければ合格できないので、勉強期間3週間（途中２日間入院）でチャレンジしました。
まずはAWSにどのようなサービスがあるのかを知る必要があるので、範囲は広いですが浅い知識な印象でした。
会場の場所、手続きに必要なものや手順などを事前に調べておくと当日に試験以外のことで悩まなくてすみます。

- [AWSome Day Online Conference](https://aws.amazon.com/jp/about-aws/events/awsomeday/)を視聴する（毎月第一水曜日に配信予定）
- 対策本を読む
  - [AWS認定資格試験テキスト　AWS認定 クラウドプラクティショナー](https://www.amazon.co.jp/dp/B07QX45RXM)
    - 正直、これを読んだだけでは知識量が足りないので、気を付けてください。
- Udemyの問題集を解く
  - [【2022年版】この問題だけで合格可能！AWS 認定クラウドプラクティショナー 模擬試験問題集（7回分455問）](https://www.udemy.com/course/aws-4260/)
  - [【2022年版】これだけでOK! AWS認定クラウドプラクティショナー試験突破講座（豊富な試験問題290問付き）](https://www.udemy.com/course/ok-aws-e/)
- 試験範囲の網羅性はUdemyが高いと思います。

## AWS Certified Solutions Architect – Associate

SAA-C02、130分、65問。

Cloud Practitionerに比べると実際の構成などを問われるので、AWSなど抜きで、システム構成（サーバ、ミドルウェアなど）を考えられるように訓練しておくとスムーズに解答できるようになると思います。
当然、AWSの基本的なサービスは知っておく必要があります。

- 対策本を読む
	- [一夜漬け AWS認定ソリューションアーキテクト アソシエイト(CO2対応)直前対策テキスト](https://www.amazon.co.jp/dp/B08W4V95SY)
    - 正直、これを読んだだけでは知識量が足りないので、気を付けてください。
- Udemyの問題集を解く
	- [【2022年版】これだけでOK！ AWS 認定ソリューションアーキテクト – アソシエイト試験突破講座](https://www.udemy.com/course/aws-associate/)
	- [【2022年版】AWS 認定ソリューションアーキテクト アソシエイト模擬試験問題集（6回分390問）](https://www.udemy.com/course/aws-knan/)

## AWS Certified Developer – Associate

DVA-C01、130分、65問。

教材となる対策本が多くはありませんが、何らかの開発経験があり、Solutions Architect – Associateを取得していれば問題なく合格できると思います。

- 対策本を読む
	- [徹底攻略AWS認定デベロッパー - アソシエイト教科書 徹底攻略シリーズ](https://www.amazon.co.jp/dp/B09SKV1Q7C)
- Udemyの問題集を解く
	- [AWS 認定デベロッパー アソシエイト模擬試験問題集（5回分325問）](https://mamezoujp.udemy.com/course/aws-31955/)

## AWS Certified SysOps Administrator – Associate

SOA-C02、180分、65問、ラボ問題2問。

他の試験と違い、ラボ問題が２問あります。勉強中にハンズオンを行わず、実務でもほとんど触ることなく受験したため、１回不合格となりました。
ラボ試験はエミュレータ上でManagement Console（CLIも使えるらしいです）を操作し、指示通りに設定するものです。
実務経験を積むか、簡単なハンズオンを行ってから望むと問題なく合格できると思います。

- 対策本を読む
	- [AWS認定アソシエイト3資格対策～ソリューションアーキテクト、デベロッパー、SysOpsアドミニストレーター～](https://www.amazon.co.jp/dp/B07TT1N73K)
- 受験申込についてくるラボ試験の体験版を解く
	- 一時期試験申し込みにラボ試験の体験版がついてきてましたが、現在は不明
- Udemyの基本的なハンズオンで練習する（といいかも）
- ラボ問題は問題の起動に数分かかる場合もあるため、30分ずつ残しておくと安全

## AWS Certified Solutions Architect – Professional

SAP-C01、180分、75問。

AWS認定の中で最難関の試験です。私の所感はとにかく問題文と選択肢の文章が長いです。
文章が長いので、整理しながら読まないと何かいてあるのかわからなくなります。
また、ProfessionalとSpecialtyでは和訳がうまくできていないことがあるので、意味が分からない場合は原文を読むとわかりやすいことがあります。

- 対策本を読む
	- [AWS認定資格試験テキスト＆問題集　AWS認定ソリューションアーキテクト - プロフェッショナル](https://www.amazon.co.jp/dp/B09DKZWX7N)
	- [AWS認定ソリューションアーキテクト－プロフェッショナル～試験特性から導き出した演習問題と詳細解説～](https://www.amazon.co.jp/dp/B08F9CQ6LT)
- サンプル問題、模擬試験を解く
- 問題が長文なので、要件や問題点を見つけ出すトレーニングが必要
- Skill Builderで新試験に対応した模擬試験（20問）が無料で公開されてます
	- [AWS Certified Solutions Architect – Professional Official Practice Question Set (SAP-C02 - Japanese)](https://explore.skillbuilder.aws/learn/course/internal/view/elearning/13272/aws-certified-solutions-architect-professional-official-practice-question-set-sap-c02-japanese)


## AWS Certified DevOps Engineer – Professional

DOP-C01、180分、75問。

Solutions Architect – Professionalに一発合格でき、長文にも慣れていたので勢いで受験しました。
対策本は出ていないので、Developer – Associate、SysOps Administrator – Associateの範囲を再学習し、Skill BuilderのExam Readinesで理解を深めました。

- Skill BuilderでExam Readinesを見る
- 対策本を読む（DOP自体の対策本はないのでSOA、DVAの本で理解を深める）
	- [徹底攻略AWS認定デベロッパー - アソシエイト教科書 徹底攻略シリーズ](https://www.amazon.co.jp/dp/B09SKV1Q7C)
	- [AWS認定アソシエイト3資格対策～ソリューションアーキテクト、デベロッパー、SysOpsアドミニストレーター～](https://www.amazon.co.jp/dp/B07TT1N73K)
- サンプル問題、模擬試験を解く

## AWS Certified Database – Specialty

DAS-C01、180分、65問。

SpecialtyはProfessionalに比べると知識範囲は狭くなりますが、その代わりに深い問題が出題されました。
Database – Specialtyはデータベースの移行、セットアップに関する問題が多く出題されました。
なのでデータベースの移行やセットアップの経験があるととっつきやすいかもしれません。

- 対策本を読む
	- [要点整理から攻略する『AWS認定 データベース-専門知識](https://www.amazon.co.jp/dp/B0936PSMXT)
- サンプル問題、模擬試験を解く

## AWS Certified Security – Specialty

SCS-C01、170分、65問。

Security – Specialtyはどのようにして侵入や乗っ取りを防ぐかが重点的に問われました。
Solutions Architect – Professionalを取得後であれば、特に勉強することもなく合格できると思います。

- 対策本を読む
	- [要点整理から攻略する『AWS認定 セキュリティ-専門知識』](https://www.amazon.co.jp/dp/B08DCLRHC7)
- AWSの薄い本を読む
	- [AWSの薄い本　IAMのマニアックな話](https://booth.pm/ja/items/1563844)
	- [AWSの薄い本Ⅱ アカウントセキュリティのベーシックセオリー](https://booth.pm/ja/items/1919060)
- サンプル問題、模擬試験を解く

## AWS Certified Data Analytics – Specialty

DAS-C01、180分、65問。

しっかりデータ分析をやったことはなく、まずはデータ分析とは？から勉強しました。
IoTなどから発生したデータに対して以下の処理にどのようなサービスの組み合わせがよいかを考えられれば問題ないと思います。

- どのようにしてAWSへ吸い上げるか
- どのような方法で加工するか
- どこに保存するか
- どのように見せるか

オンプレからデータを移行するという点を考えるため、Database – Specialtyと重複する範囲もあります。

- AWSの薄い本を読む
	- [AWSの薄い本Ⅲ データ分析基盤を作ってみよう　〜設計編〜](https://booth.pm/ja/items/3059020)
- データレイク、データサイエンス関連の本を読む（対策本はありません）
	- [AWSではじめるデータレイク: クラウドによる統合型データリポジトリ構築入門](https://www.amazon.co.jp/dp/491031301X)
	- [実践 AWSデータサイエンス ―エンドツーエンドのMLOpsパイプライン実装](https://www.amazon.co.jp/dp/4873119685)
- Skill BuilderでExam Readinesを見る
- Skill Builderで主に以下のサービスに関する動画を見る
	- Kinesis、Glue、EMR、Redshift、Athena、MSK(Kafka)、QuickSight、Lake Formation
- サンプル問題、模擬試験を解く

## AWS Certified Machine Learning – Specialty

MLS-C01、180分、65問。

データ分析をやったことがないので、当然ながら機械学習についても「機械学習とは」から勉強しました。
データ分析について勉強した後であれば、加工したデータをどのように食わせるかを考えられるようになっているので、モデリングとSageMakerの知識をプラスすれば大丈夫だと思います。

- 機械学習の入門本を読む（対策本はありません）
	- [図解即戦力　機械学習&ディープラーニングのしくみと技術がこれ1冊でしっかりわかる教科書](https://www.amazon.co.jp/dp/429710640X)
	- [深層学習教科書 ディープラーニング G検定(ジェネラリスト)公式テキスト 第2版](https://www.amazon.co.jp/dp/4798165948)
		- 4章～6章の手法を理解していれば十分です。
- Skill BuilderでExam Readinesを見る
- Skill BuilderでSageMaker関連の動画を見る
- サンプル問題、模擬試験を解く

## AWS Certified Advanced Networking – Specialty

ANS-C01、170分、65問。

Advanced Networking – Specialtyが取得に一番苦労した試験でした。

- DevOps Engineer – Professionalの合格後、2022/7の改定前に受験するも知識不足のために不合格。
- Security – Specialtyの合格後に改定後の試験を受験するも、問題傾向の変化（長文化、ベストプラクティスの変化）についていけず不合格。
- Machine Learning – Specialtyの合格後に受験するも、まだまだ知識不足で不合格。
- 3回目の受験翌日から一家で新型コロナに感染し、モチベーションがほぼ0まで急降下。

と諦めかけましたが、[豆蔵がAWSセレクトティアサービスパートナーに認定](https://www.mamezou.com/news/press-release/20220922)されたことで、[APN ALL AWS Certifications Engineers](https://aws.amazon.com/jp/blogs/psa/2023-aws-all-certifications-engineers/)の要件が満たせる状態になったことでモチベーションが回復しました。

そこで、これまでの対策本や動画コンテンツに頼った勉強の方法を見直して、サービスを1つずつキャッチアップしていくように切り替えました。結果、無事に鬼門のAdvanced Networking – Specialtyを取得するに至りました。

- 対策本を読む
	- [要点整理から攻略する『AWS認定 高度なネットワーキング-専門知識』](https://www.amazon.co.jp/dp/B09T2B93NY)
		- 旧試験の対策になっているが、新試験で対象となったGWLBやTransitGWについても書いてある
		- AWS認定の勉強だけやってると、「GWLBって何？」「TransitGWって何？」となる
- 抑えておくとよさそうなポイント
	- Direct ConnectとVPNでAWSリージョン - オンプレのハイブリッド運用
		- 複数リージョンとの接続での可用性の向上
		- 正副の制御方法（BGP、コミュニティタグ、ASPath）
	- TransitGWでのルーティング
	- GWLBを使用したフロー検査手順
	- ミラーリング時のパケットロス対策
	- AWSリージョンとオンプレでのDNSの統合
	- Route53のパブリックゾーンとPrivateゾーン
	- Route53でサブドメインの管理を開発アカウントへ委譲
	- AWS Global Accelerator と CloudFront の使いどころ
	- SSL証明書の発行、管理、設定など
	- マルチアカウントでのTrangitGWへのピアリング手順
	- 共用VPCに対する各VPCからの接続方法（TrangitGW、Private Link）
		- 買収した企業のVPCのCIDRが重複した場合の運用方法
		- 実証実験のためのステージング環境と本番環境の一時的な接続方法
	- マルチアカウントでのNetwork Firewall の共有手順（Resource Access Manager (RAM) ）
	- EKSのネットワーク周り（ロードバランサ、SSL、フローログ監視）
	- オンプレからDirect Connect経由でS3へのアクセス（VPCエンドポイント、Route53 Resolver）
	- IPv6化
    
## AWS Certified SAP on AWS – Specialty

PAS-C01、170分、65問。

2022/4から新設された試験です。新しい試験ということもあり、Web上にはあまり情報が出回ってない状態でした。
またSAPを触った経験もなかったため、まずは「SAPとは」から勉強開始しました。
実際には、SAPそのものについては問われることはなく、AWSへ移行するために使用するサービスや手順、AWSでの運用方法について問われます。
したがって、ProfessionalやSpecialtyを取得していればあまり悩まずに解答できると思います。

- SAPの本を読んで勉強するところからスタート
	- [世界一わかりやすいSAPの教科書 入門編](https://www.amazon.co.jp/dp/B09D6P5QN5)
- Skill Builderに日本語化されているコンテンツがある
	- [SAP on AWS (Technical) (Japanese) (日本語字幕版)](https://explore.skillbuilder.aws/learn/course/12875/sap-on-aws-technical-japanese-ri-ben-yu-zi-mu-ban)

## その他に役立った本

これまでは各試験対策として使用した本を紹介しましたが、他に役に立った本を紹介します。

- [AWSコンテナ設計・構築［本格］入門](https://www.amazon.co.jp/dp/B09DKZC1ZH)
- [Amazon Web Services 基礎からのネットワーク＆サーバー構築　改訂3版](https://www.amazon.co.jp/dp/B084QQ7TCF)
- [AWSではじめるインフラ構築入門 安全で堅牢な本番環境のつくり方](https://www.amazon.co.jp/dp/B08QTQBJKZ)

## 受験時の注意点など

- たまにとんでもない誤訳があるので、問題文などの意味が分からない場合は原文を確認する。
- 問題文や選択肢でだらだら長い説明がある場合は原文を見ると主語がはっきりして理解しやすい場合もあるので、長文で悩んだら原文を見るのもお勧め。
- 合格すると次回試験で使える50%オフバウチャーがもらえます（対象試験の制限なし）。
- AWSのイベント申込などで25%オフバウチャーをもらえることがあります（対象試験の制限あり）。
- AWS主催でアソシエイト試験のチャレンジ期間に25%オフバウチャーを配布していることがあります（対象試験の制限あり）。
- [再受験無料キャンペーン](https://twitter.com/shktmzrm/status/1575027757636980736)（2022年は12/15まで）で受験すると心理的に少し余裕ができると思います（半額バウチャーとの併用はできません）。

## まとめ

2022/2/27にCloud Practitionerを受験し、2022/10/15にSAP on AWS – Specialty合格まで、約8か月間かかりました。
転職して完全リモートとなったため、通勤時間を勉強に充てることが出来なくなり、土日は子供と遊ぶために時間を取るため、子供が寝てからを勉強の時間に充てることで、仕事以外の勉強をする習慣を身に付けました。
データ分析や機械学習など、今まで触れることもなかった知識領域に触れる機会にもなりました。

ですが、AWS認定12冠という目標は達成したものの、実際にAWSを触ってシステムを構築したわけでもないので、今後は実際のシステム構築で使える技能を付けていきたいと考えています。
