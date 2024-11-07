---
title: FargateのTIPS
author: shigeki-shoji
date: 2024-11-06
tags: [AWS, Fargate, tips]
---

こんにちは、AWS認定インストラクター[^1]の[庄司](https://github.com/edward-mamezou)です。

11月2日「[JAWS-UG金沢支部×コンテナ支部合同企画 物理コンテナ見ながらコンテナ勉強会！](https://jawsug-kanazawa.connpass.com/event/325803/)」が金沢港で開催されました。
金沢は2000年問題対応でしばらく住んでいたお気に入りの地です。そのこともあり、今回応募しFargateについての話をする機会を得ました。
この記事では、当日の発表で使ったスライド「[Fargateを使った研修の話](https://speakerdeck.com/takesection/fargatewoshi-tutayan-xiu-nohua)」の内容を説明します。

## コンテナイメージをECRにPushするGitHub Actions

GitHub ActionsでビルドしたコンテナイメージをECRにpushする時の流れは次のようになります。

1. actions/checkoutでGitHubリポジトリのコードをclone
2. aws-actions/configure-aws-credentialsを使ってAWSへの認証情報を取得
3. aws-actions/amazon-ecr-loginを使ってECRにログイン
4. docker/build-push-actionを使って、コンテナイメージのビルドとECRへのpush

実は3つ目の部分は、最新のdocker/login-actionを使用することができます。こちらを使うようにした方がコンテナイメージのpush先に何を利用するか(ECR、DockerHubやAzure Container Registry等)に応じて使用するアクションの変更から解放されると思います。

## マルチプラットフォーム対応のコンテナイメージをECRにPushする時の注意点

コスト、サスティナビリティの観点からAWS上ではarm64でアプリケーションを起動することが増えています。ただ、開発に使用するPCはintelであることも多いのではないでしょうか。この場合、開発者のローカルPCにはintelイメージがpullできた方が便利です。この場合には`docker buildx`コマンドを使用し複数のプラットフォームに対応したイメージをビルドしECRにpushします。

このときセキュリティの最小特権の原則に従った場合、AWS公式ドキュメントから得られるIAMポリシー設定だとECRへのpushに失敗します。

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:CompleteLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:InitiateLayerUpload",
                "ecr:BatchCheckLayerAvailability",
                "ecr:PutImage",
                "ecr:BatchGetImage"
            ],
            "Resource": "arn:aws:ecr:region:111122223333:repository/repository-name"
        },
        {
            "Effect": "Allow",
            "Action": "ecr:GetAuthorizationToken",
            "Resource": "*"
        }
    ]
}
```

`docker buildx`コマンドによるECRへのpushには、追加で`ecr:GetDownloadUrlForLayer`が必要です。

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "ecr:GetDownloadUrlForLayer",
                "ecr:CompleteLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:InitiateLayerUpload",
                "ecr:BatchCheckLayerAvailability",
                "ecr:PutImage",
                "ecr:BatchGetImage"
            ],
            "Resource": "arn:aws:ecr:region:111122223333:repository/repository-name",
            "Effect": "Allow"
        },
        {
            "Effect": "Allow",
            "Action": "ecr:GetAuthorizationToken",
            "Resource": "*"
        }
    ]
}
```

## FargateをPrivate Subnetで実行する場合

最後にPrivate SubnetでFargateを実行する場合に必要なPrivateLinkです。

![](/img/blogs/2024/20241102_fargate.png)

図のように、最新のFargateのバージョンには次のPrivateLinkのEndpointが必要です。

- `com.amazonaws.<region>.ecr.api`
- `com.amazonaws.<region>.ecr.dkr`
- `com.amazonaws.<region>.ssm`
- `com.amazonaws.<region>.logs`

さらに、最後のlogsを除くEndpointのセキュリティグループはポート番号443のインバウンド許可が必要です。

## おわりに

COVID-19パンデミックの前はよく金沢に行っていました。兼六園や金沢城跡は25年以上前に初めて訪れた時からずっとお気に入りの場所です。また金沢で登壇する機会があればぜひ行きたいと思います。
JAWS-UG 金沢支部、コンテナ支部のスタッフのみなさん、参加者のみなさん、ありがとうございました！！

[^1]: [AWS【公式】トレーニング](https://www.mamezou.com/services/hrd/aws_training)
