---
title: Google Cloud認定全制覇！……まであと一歩で跳ね返されたリアルな軌跡
author: kazuyuki-shiratani
date: 2026-03-26
tags: [Google Cloud,Google Cloud認定]
image: true
---

## はじめに
これまで豆蔵デベロッパーサイトで、AWS認定に関する記事（[2022年の12冠達成](/blogs/2022/12/12/aws_all_certified/)やその後の新認定取得など）をいくつか執筆してきました。現在、AWS認定は最新の「Generative AI Developer - Professional (AIP-C01)」以外はすべて取得しています。

そんなAWS偏重な私が、今回は「Google Cloud認定の全冠」に挑戦しました。結論から言うと、約2か月で一気に制覇しようと挑んだものの、あと1歩のところで失敗してしまいました。本記事では、Google Cloud認定を目指した経緯や、短期集中で受験した所感、おすすめの受験順番、そしてなぜ失敗したのかについてまとめます。

:::info
秘密保持契約（NDA）があるため、詳細な試験内容については触れることができませんので、ご了承ください。
また記載の情報は2026年3月時点のものです。
:::

## Google Cloud認定を目指したきっかけ

事の発端は、2025年夏に携わったプロジェクトです。このプロジェクトではGoogle Cloud上で開発が行われていましたが、私の担当はAWS側でのAPI開発だったため、実際にはGoogle Cloud環境を触っていませんでした。しかし、「今後のためにも知っておいた方がいいだろう」と思い立ち、勉強がてらGoogle Cloudの「Associate Cloud Engineer (ACE)」を受験し合格しました。

ちょうどその頃はAWS認定の更新時期と重なっていたため、まずはそちらを優先しました。そして2025年12月に「Japan AWS All Certifications Engineers」の条件を満たしたのを区切りとして、本格的にGoogle Cloud認定の全冠を目指し始めました。

## 約2か月間の怒涛の受験ラッシュとテストセンター裏話

2025年12月末のProfessional Cloud Architectを皮切りに、全冠を目指して2026年1月〜2月にかけて約2か月間で一気に受験を進めました。

以下がその受験履歴です。既に取得済みだったAssociate Cloud Engineerも一覧に含めています。

| No | 受験日 | 認定名称 | 略称 | 受験言語 | 結果 |
| :-: | :-: | - | :-: | :-: | :-: |
| 1 | 2025-09-15 | [Associate Cloud Engineer](https://cloud.google.com/certification/cloud-engineer) | ACE | 日本語 | 合格 |
| 2 | 2025-12-27 | [Professional Cloud Architect](https://cloud.google.com/certification/cloud-architect) | PCA | 日本語 | 合格 |
| 3 | 2026-01-12 | [Professional Cloud Developer](https://cloud.google.com/certification/cloud-developer) | PCD | 日本語 | 合格 |
| 4 | 2026-01-17 | [Professional Cloud DevOps Engineer](https://cloud.google.com/certification/cloud-devops-engineer) | PCDOE | 日本語 | 合格 |
| 5 | 2026-01-25 | [Professional Cloud Network Engineer](https://cloud.google.com/certification/cloud-network-engineer) | PCNE | 日本語 | 合格 |
| 6 | 2026-01-29 | [Cloud Digital Leader](https://cloud.google.com/certification/cloud-digital-leader) | CDL | 日本語 | 合格 |
| 7 | 2026-01-31 | [Professional Cloud Security Engineer](https://cloud.google.com/certification/cloud-security-engineer) | PCSE | 日本語 | 合格 |
| 8 | 2026-01-31 | [Professional Security Operations Engineer](https://cloud.google.com/learn/certification/security-operations-engineer) | PSOE | 英語 | **不合格** |
| 9 | 2026-02-05 | [Associate Google Workspace Administrator](https://cloud.google.com/certification/associate-google-workspace-administrator) | AGWA | 日本語 | 合格 |
| 10 | 2026-02-08 | [Associate Data Practitioner](https://cloud.google.com/learn/certification/data-practitioner) | ADP | 日本語 | 合格 |
| 11 | 2026-02-08 | [Generative AI Leader](https://cloud.google.com/learn/certification/generative-ai-leader) | GAIL | 日本語 | 合格 |
| 12 | 2026-02-11 | [Professional Data Engineer](https://cloud.google.com/certification/data-engineer) | PDE | 日本語 | 合格 |
| 13 | 2026-02-13 | [Professional Cloud Database Engineer](https://cloud.google.com/certification/cloud-database-engineer) | PCDBE | 英語 | 合格 |
| 14 | 2026-02-21 | [Professional Machine Learning Engineer](https://cloud.google.com/certification/machine-learning-engineer) | PMLE | 日本語 | 合格 |

なお、Google Cloud認定の試験プロバイダは2026年2月23日までKryterionによる配信でしたが、3月からはPearsonVUEに変更になりました。

私が受験した地域では、Kryterion時代は特定のテストセンター一択でしたが、PearsonVUEに変わったことで複数のテストセンターが選択できるようになりました。また、Kryterionでは試験日時の変更が72時間前でロックされていましたが（手数料を払えば変更可能）、PearsonVUEでは24時間前まで変更可能になったのは受験者にとってかなりの朗報です。

ちなみに、私はこの2か月間で同じテストセンターに11回も通った（2回は同日受験）ので、すっかりスタッフの方に顔を覚えられてしまいました。スタッフの方と少し雑談した際に「PearsonVUEに対応する準備をしている」と聞いていたのですが、3月中旬からPearsonVUEにも対応したとのことで、今後も通い慣れたテストセンターを引き続き利用できそうです。

### 受験料は「米ドル決済」である点に注意

テストセンターについての余談に関連してもう一つ、実際に短期間で大量受験して痛感したのが **受験料の支払い通貨** の違いです。
AWS認定の受験料は日本円（JPY）で確定決済されますが、Google Cloud認定の受験料はプロバイダ画面上で **米ドル（USD）決済** となります。
Professionalレベルの試験は1回200ドルかかるため、これだけの数を短期間で一気に受験すると、クレジットカードの請求額が為替レートの影響をダイレクトに受けます。会社の資格取得支援制度などを利用して経費精算をする場合は、予算申請の際に為替変動分のゆとりを持たせておくことをお勧めします。

## 全体的な難易度：AWS認定との比較

これだけ短期間で多くの試験に合格できたのは、 **「合格した認定のほとんどがAWSの知識の焼き直しでクリアできる内容だったから」** です。加えて、Googleが提唱するSRE（Site Reliability Engineering）をしっかりと理解しておくことが大事だと感じました。

また、文章量という点でも難易度に違いがありました。AWS認定のProfessionalやSpecialityは問題文も選択肢も文章が長く、内容を把握するのに苦労しましたが、Google Cloud認定のProfessionalはほとんどがAWS認定のAssociateレベルの長さであり、読み取るのにあまり苦労しませんでした。

### Google Cloud試験の鍵を握る「SREの基本概念」

複数の試験（特にCloud ArchitectやDevOps Engineerなど）を通して、Googleが提唱する **SRE（Site Reliability Engineering）** のコア概念は共通言語として頻出します。ここをしっかり押さえておくと、シナリオ問題においてGoogle Cloudが推奨する「正解の行動」がすぐに選べるようになります。

- **SLI / SLO / SLA の違い**： サービスの信頼性を測る指標（SLI）、開発チームと運用チームの共通の目標値（SLO）、顧客とのビジネス上の契約（SLA）の役割の違い。
- **エラーバジェット（Error Budget）**： 100%の可用性を目指すのではなく「許容できる障害の予算」を定め、予算内であれば新機能のリリースを優先し、予算が尽きたら信頼性向上（バク修正など）を優先するという運用ルール。
- **トイル（Toil）の削減**： 手作業で反復的かつ自己修復されない運用作業（トイル）を、システム化や自動化によって徹底的に減らすこと。
- **非難なきポストモーテム（Blameless Postmortem）**： 障害発生時に特定の個人を責めるのではなく、システムやプロセスの欠陥を分析し、自社システムにおける再発防止の仕組みづくりにフォーカスする文化。

## AWSとGoogle Cloudの概念の違い（試験で注意すべきポイント）

AWSの知識があれば解ける問題が多いとはいえ、アーキテクチャの基本概念においていくつか決定的な違いがあり、試験でもここが問われます。代表的なものをいくつか挙げます。

- **VPCのスコープ**　： AWSのVPCは特定の「リージョン」内に作成されますが、Google CloudのVPCは「グローバル」リソースです。VPCの配下に作成するサブネットが各リージョンに紐づくため、複数リージョンにまたがるネットワーク構築の考え方が大きく異なります。
- **リソースの管理単位（アカウントとプロジェクト）**　： AWSでは環境や権限の分離に「AWSアカウント」を境界として使用しますが、Google Cloudでは「プロジェクト」という単位が基本となり、これらを「フォルダ」や「組織」で階層化して管理します。
- **ロードバランサの配置**　： AWSの主要なロードバランサ（ALBなど）はリージョンリソースですが、Google Cloudのグローバルロードバランサ（Cloud Load Balancing）は、単一のAnycast IPアドレスを使用して世界中のユーザーからのトラフィックを最も近いリージョンに振り分けることができます。

## 各レベル・特徴的な試験の所感

Google Cloud認定には、AWSのような「上位資格取得による下位資格の自動更新」の仕組みがありません。そのため、有効期限（2年または3年）が切れる前に各資格を個別に更新する必要があります。
ただし、有効期限が近づいた資格保持者向けには通常の新規受験とは異なる **「更新用の試験（Recertification Exam）」** が提供されているため、更新時期には公式の案内に従ってそちらを受験する形になりそうです。

### Foundationレベル

50～60問。90分。$99（税別）。3年間有効。

Cloud Digital Leader (CDL) と Generative AI Leader (GAIL) は、Google Cloudのどのサービスが使えるかという基本的な内容や、AIの一般論などがメインでした。試験時間は90分ですが、45分くらいで解き終わるボリューム感です。

### Associateレベル

50～60問。120分。$125（税別）。3年間有効。

Associate Cloud Engineer (ACE) と Associate Data Practitioner (ADP) は、AWSの知識を焼き直せばすぐに解ける内容でした。こちらは120分ですが、1時間もかからずに完了しました。

少し毛色が違うのが、Associate Google Workspace Administrator (AGWA) です。その名の通りGoogle Cloudに関する内容はなく、Google Workspaceの管理（監査対応、退職者対応、入職者対応、企業合併などで必要な作業等）がメインです。私は独自ドメインのメールアドレスを管理しており、Geminiなどを使うためにGoogle Workspaceに移行していたため、だいたいの概念は理解できておりスムーズに対応できました。

### Professionalレベル

50～60問。120分。$200（税別）。2年間有効。

先に書きましたが、問題文はAWS認定のAssociateレベルの長さであり、読み取るのにあまり苦労しませんでした。ただし、たまに長文が出てくることもありますので油断は禁物です。

### 特徴的な問題

Professional Cloud Architect (PCA) では、画面の半分くらい（調整可能）に事例会社の説明が表示され、その内容を基に回答を選択するケーススタディ問題がありました。ただし、こちらは2026年3月30日に試験内容が更新される予定のため、今後形式が変更になる可能性があります。

また、Professional Cloud Network Engineer (PCNE) に関しては、公式が発表している問題数の上限（50〜60問）である「60問」がみっちり出題されました。他のProfessionalレベルの試験より問題数が多くなるケースがあるため、集中力を維持する体力的なハードルも少し高めでした。私は39問目の回答中に問題数に気づいたため心理的ダメージが大きかったです。最初に問題数を確認することをお勧めします。

## 唯一の壁、PSOEの難しさと反省点

順調に進んでいた全冠への道ですが、ちょうど折り返し地点であるProfessional Security Operations Engineer (PSOE) で不合格となり、ここで無敗記録がストップしてしまいました。

他の試験（AWS認定やPSOE以外のGoogle Cloud認定）は「どのように設計するか」が主に問われますが、PSOEは「問題が起きた時にどのように対処するか」に重きを置いています。扱われるセキュリティツールも特殊であり、そもそも英語が苦手なのに「英語の問題を解いて理解しようとした」のが間違いでした。

PSOEは日本語未対応です。PearsonVUEに移行するタイミングでついでに日本語化されることを願っていましたが、今のところその気配はありません。英語のみのProfessional Cloud Database Engineer (PCDBE) は内容が単調だったため何とか読み取れましたが、PSOEの複雑なシチュエーションは苦戦しました。

## 勉強方法の転換と「Google Cloud Skills Boost」の活用

これまで私は、サードパーティの教材（Udemyの演習問題など）を活用して対策を進めていました。しかし、演習に使用していたUdemyの教材の一部が削除されてしまったこともあり、今後は方針を転換します。

これからは、公式の学習プラットフォームである 「Google Cloud Skills Boost」 をしっかりと使用していく予定です。

### Google Cloud Skills Boostとは？

Google Cloudが公式に提供しているオンデマンドの学習プラットフォームです。主に以下のような特徴があります。

- 実践的なハンズオンラボ： 用意された一時的なGoogle Cloud環境を使って、実際のコンソール画面やCLIから手を動かしながら学ぶことができます。
- 認定試験向けの学習パス： 各資格試験の出題範囲に合わせたコースやクエストが体系的にまとめられています。
- 日本語での概念理解： 各種サービスの概念やベストプラクティスを解説する動画やドキュメントが充実しています。

PSOEのような実践的なトラブルシューティングが問われる試験では、単なる暗記ではなく実際の挙動を知っておく必要があります。そのため、Skills Boostのハンズオン等を活用して **「まずは日本語で概念と対処法を理解する → その後英語で読めるようにする」** という順番で対策を進めるべきだと痛感しました。

## おすすめの受験順番と難易度（完全主観）

これからGoogle Cloud認定を目指す方に向けて、私がおすすめする受験順序と主観的な難易度（★5段階）を表にまとめました。

基本的な戦略として、 **「インフラ系 → データ系 → 機械学習系 → 管理系」** の順に進めるのがベストです。最初のインフラ系でネットワーク境界やセキュリティ周りをしっかり理解できているため、データ系以降の学習でその知識をそのまま活かすことができます。

振り返ってみると（まだ全冠は終わっていませんが）、完全ではありませんが我ながら非常に理にかなった順番で受験していたなと感じています。

| 受験順 | 分野 | 認定名称 | 難易度 | 備考・おすすめの理由 |
| :-: | :-: | - | :-: | - |
| 1 | インフラ系 | Cloud Digital Leader | ★☆☆☆☆ | どこでも可。<br/>ACEの前なら軽く知識が入る。<br/>上位の資格取得後ならほぼ勉強なしで合格できる。 |
| 2 | インフラ系 | Associate Cloud Engineer | ★★☆☆☆ | |
| 3 | インフラ系 | Professional Cloud Architect | ★★★☆☆ | |
| 4 | インフラ系 | Professional Cloud Developer | ★★★☆☆ | |
| 5 | インフラ系 | Professional Cloud DevOps Engineer | ★★★☆☆ | |
| 6 | インフラ系 | Professional Cloud Network Engineer | ★★★★☆ | |
| 7 | インフラ系 | Professional Cloud Security Engineer | ★★★☆☆ | |
| 8 | インフラ系 | Professional Security Operations Engineer | ★★★★★ | 英語のみ。 |
| 9 | データ系 | Associate Data Practitioner | ★★☆☆☆ | |
| 10 | データ系 | Professional Data Engineer | ★★★★☆ | |
| 11 | データ系 | Professional Cloud Database Engineer | ★★★☆☆ | 英語のみ。<br/>どこでも可。<br/>データを扱うという点でPDEの付近がおすすめ。 |
| 12 | 機械学習系 | Generative AI Leader | ★☆☆☆☆ | どこでも可。<br/>PMLEの前なら軽く知識が入る。<br/>PMLEの後ならほぼ勉強なしで合格できる。 |
| 13 | 機械学習系 | Professional Machine Learning Engineer | ★★★★★ | |
| 14 | 管理系 | Associate Google Workspace Administrator | ★★☆☆☆ | どこでも可。 |

## おわりに
約2か月での「無敗での全冠制覇」という目標は、唯一不合格となったPSOEによって阻まれてしまいましたが、AWSの知識ベースがあればGoogle Cloudのキャッチアップも非常にスムーズに行えることが実証できました。

当初は3月中のリベンジを考えていましたが、諸事情と教材の見直しにより4月に先延ばしにしました。4月にはSkills Boostを活用した新たな勉強方法でPSOEにリベンジし、次こそは「Google Cloud全冠達成」の記事を書けるように頑張ります！
