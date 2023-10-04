---
title: GitHub Actions を AWS CodeBuild で実行する
author: noboru-kudo
date: 2023-07-12
tags: [AWS, CI/CD, GitHub]
---

代表的なCI/CDサービスの1つになったGitHub Actionsですが、その大きな強みの1つにエコシステムの充実度があげられます。
[GitHub マーケットプレイス](https://github.com/marketplace?type=actions)を覗くと、数多くのActionsが公開されており、様々なツール・サービスとの統合が簡単にできるようになっています。

AWSにもCodeBuildやCodePipeline、CodeDeployといったCI/CDのマネージドサービスがあります。
これらはAWSが提供するサービスだけに、AWSリソースと高度に統合されてます。これはAWS中心のプロジェクトでは効率が良いですが、AWS外のツールやサービスを使う場合はシェルで頑張るというケースが多いのかなと思います。

そんな中、AWSからCodeBuildでGitHub Actionsの実行をサポートすると発表がありました。

- [AWS Blog - AWS CodeBuild now supports GitHub Actions](https://aws.amazon.com/jp/about-aws/whats-new/2023/07/aws-codebuild-github-actions/)

最初は、GitHub ActionsのセルフホステッドランナーとしてCodeBuildが使えるようになったのかなくらいに思っていましたが、そうではなくジョブはCodeBuildとして動作するようです。
さらに、VCSとしてGitHub以外も利用可能だったり、制限はありますがGitHub Actionsのマーケットプレイスで公開されているActionsも利用可能です[^1]。

[^1]: GitHub Actionsのエコシステムにタダ乗りな感じですが、GitHub側の承諾は取っているんでしょうかね。。。

- [AWS CodeBuild Doc - GitHub Action runner in AWS CodeBuild](https://docs.aws.amazon.com/codebuild/latest/userguide/action-runner.html)

これは。。と思いましたので早速試してみました。

## GitHubとの接続設定

GitHub以外のVCSで動かすのになぜ必要なのかと思いましたが、[公式ドキュメント](https://docs.aws.amazon.com/codebuild/latest/userguide/action-runner.html#action-runner-connect-source-provider)を見ると以下のように記載がありました。

> Why do I need to connect to GitHub as a source provider in order to use GitHub Actions?
> 
> In order to use GitHub Actions, the source must be downloaded on a build compute. Anonymous downloads will be rate limited, so by connecting to GitHub, it can help ensure consistent access.

ActionsをGitHubからダウンロードする際のRateリミットを回避するために、GitHubとの接続設定が必要なようです。

この方法として、[公式ドキュメント](https://docs.aws.amazon.com/codebuild/latest/userguide/action-runner.html#action-runner-how-to)では管理コンソール経由(OAuth)またはCLIでアクセストークンをCodeBuildに設定する方式が説明されています。
今回はCLIの方で実施しました。

事前にGitHubからパーソナルアクセストークンを発行し、以下AWS CLIで登録します。

```shell
# アクセストークンをGITHUB_TOKENに設定
aws codebuild import-source-credentials --token ${GITHUB_TOKEN} \
  --server-type GITHUB --auth-type PERSONAL_ACCESS_TOKEN
```

登録したアクセストークンは、以下コマンドから確認できます。

```shell
aws codebuild list-source-credentials
```
```json
{
    "sourceCredentialsInfos": [
        {
            "arn": "arn:aws:codebuild:ap-northeast-1:xxxxxxxxxxxx:token/github",
            "serverType": "GITHUB",
            "authType": "PERSONAL_ACCESS_TOKEN"
        }
    ]
}
```

GitHub Actionsを利用する準備はこれで完了です。

## CodeBuildプロジェクト

CodeBuildの作成は、GitHub Actionsを使わない場合と基本変わりません。

今回はAmazon Linux2で最新のイメージをセットアップしました。
また、VCS(ソース)にはGitHubでなくCodeCommitを指定し、Serverless FrameworkベースのLambdaソースコードをコミットしておきました。

唯一の注意点として、利用予定のActionsでコンテナを使う場合は特権モードを設定する必要があります。

![CodeBuild - enable privilege mode](https://i.gyazo.com/24b0f27b6573e2c2a4ba19344541d701.png)

今回利用予定のServerless FrameworkのActionsは、コンテナベースのため特権モードを有効にしました。

## BuildSpec

作成したCodeBuildプロジェクトには、以下のBuildSpecを登録しました。

```yaml
version: 0.2

env:
  variables:
    STAGE: "prod"
  parameter-store:
    DOCKER_PASS: /dockerhub/password

phases:
  pre_build:
    commands:
      # Actionsが登録されているDockerHubのRateリミット回避
      - echo ${DOCKER_PASS} | docker login --username <docker-username> --password-stdin
  build:
    # GitHub Actions
    steps:
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test
      - if: ${{ env.STAGE == 'prod' && success() }}
        name: serverless deploy
        uses: serverless/github-action@v3
        with:
          args: deploy
      - if: ${{ failure() }}
        run: echo "github action failed!!"
```

一見すると通常のCodeBuildのBuildSpecですが、buildフェーズ配下が`commands`ではなく、`steps`となっています。
この部分の記述がGitHub Actionsのものとなっています。
ここで`actions/setup-node`や`serverless/github-actions`といったGitHub Actionsのマーケットプレイスに登録されているものを使っています。
`if`や`failure()`等の関数もGitHub Actionsの仕様と同じです。環境変数の参照などはCodeBuildのものも使えます(この例だと`env.STAGE`)。
詳細な仕様は以下公式ドキュメントを参照してください。

- [CodeBuild Doc - GitHub Action runner buildspec reference](https://docs.aws.amazon.com/codebuild/latest/userguide/action-runner-buildspec.html)

もちろん、GitHubの外で実行されますので、利用可能なActionsには制約があります。
[github context](https://docs.github.com/en/actions/learn-github-actions/contexts#github-context)に依存するものや、プルリクエストやIssue等、GitHub自体を操作するものは利用できません。
制約の詳細は[公式ドキュメント](https://docs.aws.amazon.com/codebuild/latest/userguide/action-runner.html#action-runner-limitations)を参照してください。

なお、ここではbuildフェーズ配下に記述していますが、`steps`は任意のフェーズで記述可能です。ただし、`commands`との併用はできないようです。

## CodeBuildジョブ実行

CodeBuildの実行方法は、GitHub Actions利用有無で変わりません。
スクショ等は省略しますが、`steps`配下に記述した通りv20系のNode.jsがセットアップされ、インストール・テスト後に、Serverless FrameworkでLambda関数がデプロイされている様子が確認できました。

ちなみに、GitHub接続をしていない場合は以下のエラーが出ました。

![](https://i.gyazo.com/bc80546f304b64027faa777474efe328.png)

GitHub接続設定をしない状態だと`steps`は有効にならないようです。

## 最後に

使えるActionsに制限はありますが、成熟したエコシステムを持つGitHub ActionsをCodeBuildで利用することで、両者のいいとこ取りができるようになりました。

個人的には、GitHub Actionsのエコシステムをそのまま取り込む戦略には違和感はありましたが、今後の動向に注目していきたいと思いました。