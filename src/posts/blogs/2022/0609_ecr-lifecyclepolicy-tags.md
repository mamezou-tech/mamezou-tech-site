---
title: Amazon ECRのライフサイクルポリシーで開発環境向けのイメージのみ削除する
author: noboru-kudo
date: 2022-06-09
tags: [container, AWS, ECR]
---

つい先日、EKSを利用している社内システムで、とあるPodが起動できない障害がありました。
単純な原因でしたが、恥ずかしながらECRのライフサイクルポリシーに関して理解できていなかったので、ここでは自戒の念を込めて投稿します。

## 原因 - ライフサイクルポリシー

問題のPodの状態を探ってみると、PodからコンテナイメージのPullに失敗しているようでした。
さらに失敗原因を調べてるみると、コンテナレジストリ(ECR)に対象のイメージが存在していませんでした。

当システムではECRのライフサイクルポリシーで、開発中のイメージが溜まり続けないように一定の世代で削除するようにしていました。
ここのポリシーの設定に問題がありました。

当初のルールは、以下のようなイメージで設定していました（一部省略してます）。

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 2 dev images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["dev-"],
        "countType": "imageCountMoreThan",
        "countNumber": 2
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
```

開発環境向けのイメージ(`dev-`プレフィックスのイメージタグ)のものは2世代で削除するポリシーです。実際にはもっと多い世代数を設定しています。

この社内システムでは、ベストプラクティス通りに、開発環境で使用しているコンテナイメージと同じものを、商用環境にもデプロイするようにしています(環境差分は環境変数やボリュームマウントで吸収)。
このため、開発環境用の`dev-x`タグがつけられたイメージは、同時に商用環境向けのタグ(`prod-x`)も付けられています。

実際のものではありませんが、以下のイメージです。

![](https://i.gyazo.com/29abd32454c1300c9d6fa6b8c5f37d48.png)

赤枠部分のイメージは開発環境向けのタグ`dev-x`だけでなく、商用環境向けの`prod-x`タグの2つがついています。つまり商用環境で実際にPullするイメージです。
この商用環境イメージは`prod-x`タグがついているので、前述のポリシーの削除対象とはならないと勘違いしていまた。
実際には、このイメージには`dev-x`タグもついているので、このイメージもライフサイクルポリシーによって削除されます。

マネジメントコンソールで、ECRのライフサイクルポリシーをテストすると以下のようになります。

![](https://i.gyazo.com/782c21c62cce00c0582f04cb1c589961.png)

残念ながら、商用環境イメージ(`prod-1`)も削除対象と判定されてしまいました。
これが原因で、`dev-x`イメージの蓄積とともに、商用環境向けのイメージまで削除されてしまい、商用環境でイメージがPullできなくなりました。

## 対応方法 - ライフサイクルポリシー追加(優先度付け)

ECRのライフサイクルポリシーは優先度別で複数ルールを指定できますので、これを利用します。
具体的には以下のイメージで変更しました。

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep stable image undeleted",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["prod-"],
        "countType": "imageCountMoreThan",
        "countNumber": 1000
      },
      "action": {
        "type": "expire"
      }
    },
    {
      "rulePriority": 2,
      "description": "Keep last 2 dev images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["dev-"],
        "countType": "imageCountMoreThan",
        "countNumber": 2
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
```

従来のルールの前に、商用環境利用イメージ(`prod-`)は1000世代まで保有するようにしました。つまり実質削除しないというルールです(頻繁に商用デプロイする場合はこれでも足りないかもしれませんが)。
こちらは優先度(`rulePriority`)1として、従来のルールより高い優先順位を設定します。
こうすることで、商用環境イメージはこの新ルールの方で判定され、削除対象から除外されます。

正確には全てのルールが評価され、優先度の高いルールが適用されるようです。
以下[ECRドキュメント](https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html)からの引用です。

> ・All rules are evaluated at the same time, regardless of rule priority. After all rules are evaluated, they are then applied based on rule priority.
> ・An image is expired by exactly one or zero rules.
> ・An image that matches the tagging requirements of a rule cannot be expired by a rule with a lower priority.

再度ライフサイクルポリシーをテストします。

![](https://i.gyazo.com/df0b04f26e3209ea597d91bffc1c039e.png)

今度は商用環境向けのイメージが削除対象となっていないことが分かります(優先度により除外)。
これを適用すれば良さそうです。

## まとめ

ECRのライフサイクルポリシーの挙動は、AWSの公式ドキュメントの例等を見れば記載されています。

- <https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html>

思い込みで設定し、公式ドキュメント確認やテストを怠ってしまったことがよくありませんでした。
他の現場でも参考になれば幸いです。

---
参考資料

- [StackOverflow - ECR lifecycle policy exception](https://stackoverflow.com/questions/51375318/ecr-lifecycle-policy-exception)