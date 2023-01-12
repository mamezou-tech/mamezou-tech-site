---
title: "Cloud Custodian: AWSリソース作成時に自動でOwnerタグをつける"
author: noboru-kudo
date: 2022-09-18
templateEngineOverride: md
tags: [AWS, Security, lambda]
---

技術検証等の目的で1つのAWSアカウントを組織内で共有して利用することは結構多いかと思います。
弊社でもサンドボックスAWSアカウントを保有しており、個人の勉強からプロジェクトでの技術検証まで様々な用途で利用されています。

ここでよくある悩みの種は、AWSリソースを消し忘れて意図しない課金が発生してしまうことです。目的によっては一時的に高スペックなEC2インスタンスを起動することもありますが、利用終了後に消し忘れると継続的に高価な請求がきます。
時間が経過してしまうと誰がこのリソースを作成したのかを調べるのも一苦労です。
とはいえ、このAWSはPoC目的のアカウントで、個人情報や機密情報は含まれませんので、緩く管理したい感じです。
もちろんこのような環境でポリシー強制の仕組み作りに力を入れるモチベーションもありません。

そんな折に、[Cloud Custodian](https://cloudcustodian.io/)というプロダクトが[CNCF](https://www.cncf.io/)のIncubating Projectにホスティングされたという記事を目にしました。

- [Cloud Custodian becomes a CNCF incubating project](https://www.cncf.io/blog/2022/09/14/cloud-custodian-becomes-a-cncf-incubating-project/)

Cloud Custodianはマルチクラウド対応のルールエンジンで、リソースの状態に応じて様々なアクションが定義できます。
また、AWS環境ではLambdaを使って[CloudTrail](https://aws.amazon.com/cloudtrail/)経由のイベントに対してルールエンジンを実行する機能も備わっています。

今回はCloud Custodianを利用して、AWSリソース作成時に誰がそのリソースを作成したのかをタグ付けする仕組みを試してみたいと思います。

最初に触れておきますが、結論としてCloudFormation等のIaCツールを使うケースではこの仕組みだけでは不足しますのであしからず。

:::info
EC2でタグ付けを強制したい場合は、IAMレベルで指定できます。厳格なプロジェクトではこのように指定すると抜け道を防止できそうです。
こちらの詳細は以下AWS公式ブログをご参照ください。

- [Tag EC2 Instances & EBS Volumes on Creation](https://aws.amazon.com/jp/blogs/aws/new-tag-ec2-instances-ebs-volumes-on-creation/)
:::


## Cloud Custodianをインストールする

Cloud CustodianはPythonアプリケーションとして提供されています。
ローカル環境にセットアップしてみます。ここでは現時点で最新の`0.9.18`をインストールしました。

```shell
python3 -m venv custodian
source custodian/bin/activate
pip install c7n
```

上記はmacOSでの例です。それ以外の環境は[公式ドキュメント](https://cloudcustodian.io/docs/quickstart/index.html#install-cc)を参照してください。Dockerから利用するという方法もあります。

AWS環境の場合は上記になります。GCP、Azure等は追加でインストールが必要ですので、上記公式ドキュメントを参照してください。

Cloud Custodianで管理しているリソースを一覧に出力してみます。

```shell
custodian schema
```
```
resources:
- aws.account
- aws.acm-certificate
- aws.airflow
- aws.alarm
- aws.ami
- aws.apigw-domain-name
- aws.app-elb
(以降省略)
```

Cloud Custodianに組み込まれている多数のAWSリソースが一覧表示されます。
スキーマの詳細を見たい場合は、`<cloud>.<resource>.<category>.<item>`のフォーマットを指定します。

以下は今回利用したいactions.auto-tag-userの出力です。

```shell
custodian schema aws.ec2.actions.auto-tag-user
```
```
Help
----

Tag a resource with the user who created/modified it.

.. code-block:: yaml

  policies:
    - name: ec2-auto-tag-ownercontact
      resource: ec2
      description: |
        Triggered when a new EC2 Instance is launched. Checks to see if
        it's missing the OwnerContact tag. If missing it gets created
        with the value of the ID of whomever called the RunInstances API
      mode:
        type: cloudtrail
        role: arn:aws:iam::123456789000:role/custodian-auto-tagger
        events:
          - RunInstances
      filters:
       - tag:OwnerContact: absent
      actions:
       - type: auto-tag-user
         tag: OwnerContact
(省略)
```

使い方が分からない場合は、随時これを実行すればWebドキュメントを参照せずとも詳細なスキーマを確認できます。

## CLIでルールエンジンを実行してみる

まずは、ローカル環境からCLIでCloud Custodianを実行してみます。
CLIでは作成者のタグ付けはできませんので、今回は以下のルールで試してみます。

- フィルター条件(filter)
  - Nameタグが`c7n`から始まるEC2インスタンス
  - インスタンが実行中
- アクション(action)
  - インスタンスを停止
  - Cloud Custodianによって停止された旨のタグを追加

このようにCloud Custodianの基本形はフィルターで対象リソースを絞り込み、合致したリソースに対して何らかのアクションを実行していく形になります。
クラウドリソースによって、利用可能なフィルターやアクションは変わってきますので、利用前に前述のスキーマ定義を確認する必要があります。

- [Cloud Custodian - AWS Reference](https://cloudcustodian.io/docs/aws/resources/index.html)

ここでは、以下のようなYMALのポリシーファイル(`ec2-test-policy.yml`)を作成します。

```yaml
policies:
  - name: ec2-tag-policy
    resource: aws.ec2
    filters:
      - type: value
        key: "tag:Name"
        op: regex
        value: "^c7n.*$"
      - "State.Name": "running"
    actions:
      - stop
      - type: tag
        tags:
          Custodian: Stopped by custodian
```

これがポリシーファイルの基本形です。
ポリシー名(`name`)やクラウドリソース(`resource`)を指定し、以降にフィルター、アクションを複数指定します。
なお、アクションを指定しない場合はフィルターのみ実行されます（ログ出力のみ）。

動作確認のために、これに該当するEC2インスタンスを1つ作成しておき、以下を実行します。

```shell
custodian run --output-dir=. ec2-test-policy.yml 
```
```
2022-09-18 14:50:49,987 - custodian.policy - INFO - policy:ec2-tag-policy resource:aws.ec2 region:ap-northeast-1 count:1 time:0.35
2022-09-18 14:50:50,440 - custodian.policy - INFO - policy:ec2-tag-policy action:stop resources:1 execution_time:0.45
2022-09-18 14:50:50,612 - custodian.policy - INFO - policy:ec2-tag-policy action:tag resources:1 execution_time:0.17
```

標準出力を見ると1つのEC2インスタンスが検出され、インスタンス停止とタグ付けが実施されていることが分かります。
詳細な内容は、`--output-dir`で指定した場所へポリシー別に出力されます。

実際にマネジメントコンソール上で確認すると、以下のようになりました。

![EC2 コンソール](https://i.gyazo.com/f2be855edbfd74da8823101d0ba1d188.png)

インスタンスが停止され、Cloud Custodianによって停止された旨のタグが追加されています。

## CloudTrail + Lambdaで作成したリソースにOwnerタグを追加する

Cloud Custodianの使い方が分かりましたので、AWSリソースの作成を検知して自動でタグを追加するようにしてみたいと思います。

- [Cloud Custodian - Lambda Support](https://cloudcustodian.io/docs/aws/lambda.html)

ここではCloudTrailのイベントをEventBridge経由でCloud CustodianのLambdaを実行するようにします。

![Cloud Custodian - Lambda architecture](https://i.gyazo.com/8379b2c2c778e89f8acf1fa7e6f5b399.png)

その前に、CloudTrailの証跡を有効にして、EventBridgeからイベントを拾えるようにする必要があります。
CloudTrailとEventBridgeとの連携方法は、DeveloperIOの以下ブログを参考にしました。

- [EventBridgeを使用してCloudTrail経由でAWS APIコールのログを記録してみた。](https://dev.classmethod.jp/articles/log-aws-api-call-via-cloudtrail-using-eventbridge/)

なお、EventBridgeのルールやLambda本体はCloud Custodianで作成しますので、実施不要です。

ポリシーファイルは以下のようにしました（抜粋）。

```yaml
policies:
  - name: ec2-tag-policy
    resource: aws.ec2
    # CloudTrail + Lambdaでの実行モード
    mode:
      type: cloudtrail
      events:
        - event: RunInstances
          source: ec2.amazonaws.com
          ids: "responseElements.instancesSet.items[].instanceId"
      role: &lambda-role custodian-lambda-role
    filters: &tag-filter
      - "tag:Owner": absent # Ownerタグが存在しないものに限定
    actions: &auto-tagger-action
      - type: auto-tag-user
        tag: Owner # Ownerタグに実行ユーザーを追加
  - name: dynamodb-tag-policy
    resource: aws.dynamodb-table
    mode:
      type: cloudtrail
      events:
        - event: CreateTable
          source: dynamodb.amazonaws.com
          ids: "requestParameters.tableName"
      role: *lambda-role
    filters: *tag-filter
    actions: *auto-tagger-action
  # 以降省略
```

AWSリソース別[^1]に生成時のCloudTrailのイベントを検知し、`auto-tag-user`アクションを使って作成者のOwnerタグを追加します。
CLIの時は何も指定しませんでしが、今回は`mode`を追加し、`type`に`cloudtrail`を指定しました。
こうするとCloud Custodianは以下のことを実行します。

- ルールエンジンを実行するLambda作成(ポリシー別)
- EventBridgeへのルール作成(イベントパターン:CloudTrail、ターゲット:Lambda)

`mode.events`でフィルタ対象のイベントを指定します。ここではCloudTrailのイベント名を指定します。`mode.events.ids`にはCloudTrail出力からリソースを識別する[JMESPath](https://jmespath.org/)を指定します[^2]。
また、`mode.role`ではLambdaの実行ロールを別途作成し指定します。今回は通常のLambdaの実行ロール(AWSLambdaBasicExecutionRole)と対象のAWSリソースの参照とタグ付けを許可すれば事足ります。

[^1]: 現状はまとめてポリシーを作成できず、AWSリソース別にポリシーを作成する必要があります。
[^2]: 公式ドキュメントによると、よく使うものは[ショートカット記法](https://cloudcustodian.io/docs/aws/lambda.html#cloudtrail-api-calls)がサポートされていますが、なぜか正しくEventBridgeのルールに変換されず動作しませんでした。

実行の手順はCLIのときと同じです。

```shell
custodian run --output-dir=. policy.yml 
```
```
2022-09-18 15:38:33,398: custodian.policy:INFO Provisioning policy lambda: ec2-tag-policy region: ap-northeast-1
2022-09-18 15:38:39,688: custodian.policy:INFO Provisioning policy lambda: dynamodb-tag-policy region: ap-northeast-1
(以下省略)
```

今度は先程と違う出力になりました。各ポリシー別にLambdaを作成しているようです。
マネジメントコンソールからLambdaとEventBridgeを確認してみます。

**Lambda**
![custodian - lambda](https://i.gyazo.com/d296ecea534c651fa5cbf2512d117158.png)

**EventBridge**
![cloudtrail - eventbridge](https://i.gyazo.com/891d8a51d4ee5040f5d5b8e8c304ccb2.png)

ポリシーファイルを作成しただけでLambdaやEventBridgeのセットアップを全部やってくれました。

実際にOwnerタグなしで、EC2を作成すると以下のように自動でタグが追加されました。

![EC2 - Owner Tag](https://i.gyazo.com/aa0737d55980bcb0c60065a7c0796fb7.png)

Cloud Custodianの実行ログはLambdaからCloudWatchに連携されていますので、ここから実行内容を確認できます。

![CloudWatch - Custodian lambda log](https://i.gyazo.com/e1709fd401aba8facbf880f07fc2bd17.png)

## まとめ

今回はCloud Custodianを使って、ポリシーファイルのみで自動的にタグをつけるようにしました。LambdaやEventBridgeに触ることなく、1コマンドで実行できて簡単だなと感じました。

とはいえ、、、課題もあります。IaCツールの存在です。
一般的にAWSリソースはCloudFormation等を使いますが、Cloud Custodianで作成したタグはドリフトになりますので、IaCツールを使って同期すると追加したタグは消えてしまいます。
リソース作成時だけでなく更新も検知したいところですが、そこは各リソースによってCloudTrailのイベント定義が異なって、、、というところで挫折しました（限界もありそうですね）。

そうは言っても、今回のようなタグ付けはCloud Custodianの1つの機能(アクション)でしかありません。
ポリシーファイルをCIで定期的に実行して、課金が心配な構成を検知してメール通知する等いろいろと使い途はありそうですので、もう少し調べてみたいと思いました。