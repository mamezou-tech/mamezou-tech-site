---
title: 「AWS Certified Data Engineer - Associate」が正式リリースされたので、さっそく受験してきた
author: kazuyuki-shiratani
date: 2024-03-23
tags: [AWS認定]
image: true
---

## はじめに

AWS認定に「AWS Certified Data Engineer - Associate」が追加されたので、さっそく受験してきました。感想などをまとめます。

:::info
[秘密保持契約（NDA）](https://aws.amazon.com/jp/certification/certification-agreement/)があるため、詳細な試験内容については触れることができませんので、ご了承ください。
:::

## 試験について

[AWS Certified Data Engineer - Associate（以下、データエンジニア）](https://aws.amazon.com/jp/certification/certified-data-engineer-associate/)は以下のように説明されています。

:::column:試験の概要
AWS Certified Data Engineer - Associate は、コアデータ関連の AWS サービスに関するスキルと知識や、データの取り込みと変換、プログラミングの概念を適用しながらのデータパイプラインのオーケストレート、データモデルの設計、データライフサイクルの管理、データ品質の確保といった能力を検証します。
:::

類似の[AWS Certified Data Analytics - Specialty（以下、データ分析）](https://aws.amazon.com/jp/certification/certified-data-analytics-specialty/)がありますが、こちらはあくまで**収集、保管、処理、視覚化のデータライフサイクルに AWS データ分析サービスがどのように適しているかを説明する能力**の認定です。

勘違いしていたのですが、データエンジニアはデータ分析の代わりではなく、**データパイプラインのオーケストレート、データモデルの設計、データライフサイクルの管理、データ品質の確保といった能力**が必要です。

## 申し込み

3月12日から受験の申込みが開始されるとアナウンスされていたこともあり、当日は申込サイトを覗いてました。

勝手に受験可能なのは4月以降だと思い込んでいましたが、申し込み開始後すぐに受験できたので直近で受験可能な日程で申し込みました。

ちなみにAssociate試験なので受験料は16,500円のはずが33,000円となっていましたが、当日夜間には修正されていました。

## 準備したこと

ベータ版が発表されたタイミングから少しずつ準備しました。内容は他の認定とあまり変わりません。

- 公式ガイドを読み込む
- Skill Builderで関連サービスの資料を読み込む
- 公式問題集を解く
- データ分析の対策本を読む
  - [要点整理から攻略する『AWS認定 セキュリティ-専門知識』](https://book.mynavi.jp/ec/products/detail/id=137677)
- Udemyで関連の教材を視聴する
  - [AWS認定Data Engineer Associate（DEA-C01）試験 対策トレーニング](https://www.udemy.com/course/aws-data-engineer-associate-dea/)
- [データ分析](/blogs/2022/12/12/aws_all_certified/#aws-certified-data-analytics-%E2%80%93-specialty)取得時にやった内容を一通り行い、1年半以上前の記憶を呼び起こす

## 受験

AWS認定試験は2022年10月以来、約1年半ぶりで、特に複数選択の問題の解き方は少し戸惑いがありましたが、この1年間にJava、[UMTP](/blogs/2023/12/11/umtp_l3_challenge/)、JSTQB、簿記などのCBTを受験していたため、あまり違和感なく、またProfessionalやSpecialtyの印象が強く残っていたこともあり問題文が短く単純だと感じました。

試験時間は130分でしたが残り20分には完了して退室しました。

## 受験後

結果はその場では出ず、夜にポータルサイトで確認できました。最近はその場で結果が出ないようです。

なおスコアはギリギリでの合格でした。

## まとめ

- 現在のAWS認定取得状況です。

| 名前 | 略称 | グループ | 発効日 | 有効期限 |
| - | :-: | :-: | :-: | :-: |
| AWS Certified Data Engineer - Associate | DEA | Associate | 2024/03/15 | 2027/03/15	 |
| AWS Certified: SAP on AWS - Specialty (Retiring April 29, 2024) | PAS | Specialty | 2022/10/15 | 2025/10/15 |
| AWS Certified Advanced Networking - Specialty | ANS | Specialty | 2022/10/01 | 2025/10/01 |
| AWS Certified Machine Learning - Specialty | MLS | Specialty | 2022/08/18 | 2025/08/18 |
| AWS Certified Data Analytics - Specialty (Retiring April 8th, 2024) | DAS | Specialty | 2022/08/10 | 2025/08/10 |
| AWS Certified Security - Specialty | SCS | Specialty | 2022/07/18 | 2025/07/18 |
| AWS Certified Database - Specialty (Retiring April 29, 2024) | DBS | Specialty | 2022/07/14 | 2025/07/14 |
| AWS Certified DevOps Engineer - Professional | DOP | Professional | 2022/06/24 | 2025/06/24 |
| AWS Certified Solutions Architect - Professional | SAP | Professional | 2022/06/16 | 2025/06/16 |
| AWS Certified SysOps Administrator - Associate | SOA | Associate | 2022/05/06 | 2025/06/24 |
| AWS Certified Developer - Associate | DVA | Associate | 2022/03/18 | 2025/06/24 |
| AWS Certified Solutions Architect - Associate | SAA | Associate | 2022/03/11 | 2025/06/16 |
| AWS Certified Cloud Practitioner | CLF | Foundational | 2022/02/27 | 2027/03/15 |

- 先日、[2024 Japan AWS All Certifications Engineers](https://aws.amazon.com/jp/blogs/psa/2024-japan-aws-all-certifications-engineers-apply/)に申し込みましたが、今回の認定取得で来年度まで条件は整ったはず（2024年3月時点）。
- しかし2024年4月で3つの認定（DAS、DBS、PAS）が廃止になると発表されています（[AWS 認定の廃止と開始のお知らせ](https://aws.amazon.com/jp/blogs/news/aws-certification-retirements-and-launches/)）が、データエンジニア関連の上位認定がなくなるため、Professionalが追加されるのではないかと勝手に予想してます。
- 来年度は5つの認定で更新期限が来る（3つの廃止がなければ8つだったと考えると恐ろしい）ため、継続的に知識をインプットし、本サイト内でアウトプットしていければと考えています。

## おまけ

- [再受験無料キャンペーン](https://twitter.com/Moro_Cert/status/1750394343985475861)（１回目の受験が2024年4月15日まで）で受験すると心理的に少し余裕ができると思います（半額バウチャーとの併用はできません）。

- 円安の影響で2024年4月1日の申込分から[料金が改定される](https://aws.amazon.com/jp/certification/policies/before-testing/#Exam_pricing)ようです。受験予定の方は3/31までに申し込みを済ませておくと少し安く受験できるようです。
  | 試験の種類 | USD | 旧料金(税抜き) | 新料金(税抜き) |
	| - | -: | -: | -: |
	| Foundational | 100 USD | 11,000円 | 15,000円 |
	| Associate | 150 USD | 15,000円 | 20,000円 |
	| Professional | 300 USD | 30,000円 | 40,000円 |
	| Specialty | 300 USD | 30,000円 | 40,000円 |
