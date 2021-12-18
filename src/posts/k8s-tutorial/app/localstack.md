---
title: ローカル開発環境準備 - ローカルAWS(LocalStack)
author: noboru-kudo
date: 2021-12-19
prevPage: ./src/posts/k8s-tutorial/app/skaffold.md
---

これまでローカルでKubernetesを実行する環境として[minikube](https://minikube.sigs.k8s.io/)、開発からデプロイまでを自動化するツールとして[Skaffold](https://skaffold.dev/)を導入し、いよいよ開発が始められる状況が整ってきました。

最後にアプリケーションが外部プロダクトに依存する場合を考えてみましょう。
一般的にアプリケーションはそれのみで完結することはほとんどなく、DBやキャッシュ等他のプロダクトを利用することが大半です。

ここでは開発対象のアプリケーションがS3やDynamoDB等のAWSのサービスを使うことを想定してみましょう。
開発者が少ない場合は、ローカル環境から直接AWSのサービスを使うことも可能ですが、数十名以上の規模になってくるとAWS利用料が重くのしかかってきます。
回避案としてローカル環境はモック/スタブを使うということが考えられますが、これはバグ検出の先送りに過ぎず理想的な解決策とは言えません。

やはりAWSのサービスについても、ローカル環境で動かして確認することが品質面で理想的です。
今回は(程度はありますが)主要なサービス[^1]に対応している[LocalStack](https://localstack.cloud/)のCommunity Edition[^2]を導入してローカル環境でAWSを利用したアプリケーションの開発をする準備をしましょう。
[^1]: LocalStackで対応しているサービスは[こちら](https://docs.localstack.cloud/aws/feature-coverage/)を参照してください。

LocalStackの実行はDockerが基本となっています。既にminikubeやDocker Desktopでローカル環境でKubernetesが動くようになっていますので、コンテナとしてここで動かしてしまうのが効率的です。

[^2]: Pro Edition/Enterprise Editionを使用すると利用できるサービスの範囲も広がります。プロジェクトで利用するサービスに応じてこちらの導入を検討するのが良いかと思います。

## 事前準備

未セットアップの場合はローカル環境のKubernetesを準備しておきましょう。
実施内容は[前回](/containers/k8s/tutorial/app/skaffold/#事前準備)と同様です。

また、LocalStackのインストールには[helm](https://helm.sh/)を利用します。
未セットアップの場合は[こちら](https://helm.sh/docs/intro/install/) を参考にv3以降のバージョンをセットアップしてください。

## LocalStackインストール

LocalStackにはHelmチャートが用意されていますので、迷わずこちらを使いましょう。
- <https://github.com/localstack/helm-charts/tree/main/charts/localstack>

まずはHelmのリポジトリを追加します。

```shell
helm repo add localstack-charts https://localstack.github.io/helm-charts
helm repo update
```

LocalStackをインストールする前に、LocalStack上で動作させるAWSサービスについて考えてみましょう。
アプリケーションで利用するS3バケットやDynamoDBテーブル等のAWSリソース作成は、どこで実施するのがいいでしょうか？

コンテナは永続的なものではなく、必要に応じて再起動が発生するものと心得ておく必要があります。実際のアプリケーションではないものの、LocalStackをコンテナで動かす場合も同様です。
とはいえ、その都度必要なAWSリソースを再作成するのは、かなりの手間になると思います。

これに対する簡単な解決策としては、LocalStackは起動時にスクリプト実行するフックポイントを提供していますので、これを利用するのが良いでしょう[^3][^4]。
LocalStackのHelmチャートは、必要なスクリプトをConfigMapリソースとして提供することで、初期化処理として適用することが可能です。
必要なAWSリソースを作成するスクリプトを用意しましょう。`localstack-init-scripts-config.yaml`というYAMLファイルを用意し、以下を記述しましょう。

[^3]: AWSリソースの構成管理については、IaCツールの[Terraform](https://www.terraform.io/)でも実行することができます。公式ドキュメントに記載がありますので、ローカル環境でもTerraformを利用する場合は[こちら](https://docs.localstack.cloud/integrations/terraform/)を参考にしてください。

[^4]: 未検証ですがLocalStackではユーザーデータを永続化することもできますので、必要に応じて[こちら](https://github.com/localstack/helm-charts/tree/main/charts/localstack#persistence-parameters)の設定も追加すると良いでしょう。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: localstack-init-scripts-config
data:
  # AWS Credential情報初期化
  01-credential.sh: |
    #!/bin/bash
    aws configure set aws_access_key_id localstack
    aws configure set aws_secret_access_key localstack
    aws configure set region local
    export LOCALSTACK_ENDPOINT=http://localhost:4566
  # S3バケット作成
  02-create-bucket.sh: |
    #!/bin/bash
    aws s3api create-bucket --bucket localstack-test-bucket --endpoint ${LOCALSTACK_ENDPOINT}
    aws s3api list-buckets --endpoint ${LOCALSTACK_ENDPOINT}
  # DynamoDBテーブル作成
  03-create-dynamodb-table.sh: |
    #!/bin/bash
    aws dynamodb create-table --table-name localstack-test \
      --key-schema file:///docker-entrypoint-initaws.d/localstack-test-table-key-schema.json \
      --attribute-definitions file:///docker-entrypoint-initaws.d/localstack-test-table-attribute-definitions.json \
      --billing-mode PAY_PER_REQUEST \
      --endpoint ${LOCALSTACK_ENDPOINT}
    aws dynamodb list-tables --endpoint ${LOCALSTACK_ENDPOINT} --region local
  localstack-test-table-key-schema.json: |
    [
      {
        "AttributeName": "test_key",
        "KeyType": "HASH"
      }
    ]
  localstack-test-table-attribute-definitions.json: |
    [
      {
        "AttributeName": "test_key",
        "AttributeType": "S"
      }
    ]
```

ConfigMapリソースの中(`data`フィールド)に5つのファイル(3つのシェルと2つのJSON)を作成しました。

- 01-credential.sh: AWS CLIの認証情報の初期化スクリプト。これらはAWSを利用する場合に必須のものですが、LocalStackでは任意の値で構いません。
- 02-create-bucket.sh: LocalStackにS3バケットを作成するスクリプト
- 03-create-dynamodb-table.sh: LocalStackにDynamoDBテーブルを作成するスクリプト
- localstack-test-table-key-schema.json/localstack-test-table-attribute-definitions.json: DynamoDBテーブルのスキーマ定義

各スクリプトは、AWS CLIの[公式ドキュメント](https://docs.aws.amazon.com/cli/latest/index.html)を参照して作成できます。

注意点としては、AWS CLIの各種コマンドでは、必ず`--endpoint`を`http://localhost:4566`とする必要があります。
このオプションがない場合、AWS CLIは本物のAWSに対してリソースの生成を要求しますので、ネットワークエラーや認証エラーが発生します。
したがって、ここでエンドポイントをLocalStackの公開エンドポイントの方に振り向けてあげる必要があります(4566番ポートはLocalStackのデフォルト公開ポートです)。

なお、ConfigMapの名前は`<Helmリリース名>-init-scripts-config`とする必要があります(リリース名はインストール時に指定するもの)。

これを事前にローカル環境のKubernetesに適用しましょう。

```shell
kubectl apply -f localstack-init-scripts-config.yaml
```

ここでようやくLocalStackのインストールを行います。
インストールは以下のコマンドを実行します。ここではHelmチャートのバージョンは現時点で最新の`0.3.7`を指定しました。

```shell
helm upgrade localstack localstack-charts/localstack \
  --install --version 0.3.7 \
  --set startServices="s3\,dynamodb" \
  --set enableStartupScripts=true \
  --set service.edgeService.nodePort=30000 \
  --wait
```

今回はS3とDynamoDBを利用しますので、`startServices`には起動するサービスを限定しました（指定しない場合は全て起動します）。
LocalStackで利用可能なサービスは[こちら](https://docs.localstack.cloud/aws/feature-coverage/)から、指定する値の命名ルールは[こちら](https://docs.aws.amazon.com/cli/latest/reference/#available-services)を参照してください。
なお、複数指定する場合は`,`はエスケープする必要があります。

また、先程初期化スクリプトを準備しましたので、`enableStartupScripts`を有効にしています。

LocalStackが正常に起動していかを確認してみましょう。

```shell
kubectl get pod -l app.kubernetes.io/name=localstack
```
```
NAME                          READY   STATUS    RESTARTS   AGE
localstack-6675bf759b-56tct   1/1     Running   0          36s
```

また、Pod(コンテナ)の起動ログを確認し、初期化スクリプトが正常に実行されたかも確認した方が良いでしょう。

```shell
LOCAL_STACK=$(kubectl get pod -l app.kubernetes.io/name=localstack -o jsonpath='{.items[0].metadata.name}')
kubectl logs $LOCAL_STACK
```
```
(省略)
LocalStack version: 0.13.1
LocalStack build date: 2021-12-17
LocalStack build git hash: c8d95a2c

Starting edge router (https port 4566)...
Ready.
[2021-12-18 08:58:02 +0000] [22] [INFO] Running on https://0.0.0.0:4566 (CTRL + C to quit)
2021-12-18T08:58:02.630:INFO:hypercorn.error: Running on https://0.0.0.0:4566 (CTRL + C to quit)
/usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initaws.d/01-credential.sh

/usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initaws.d/02-create-bucket.sh
{
    "Location": "http://localstack-test-bucket.s3.localhost.localstack.cloud:4566/"
}
2021-12-18T08:58:08.571:INFO:localstack.services.motoserver: starting moto server on http://0.0.0.0:44979
2021-12-18T08:58:08.571:INFO:localstack.services.infra: Starting mock S3 service on http port 4566 ...
{
    "Buckets": [
        {
            "Name": "localstack-test-bucket",
            "CreationDate": "2021-12-18T08:58:08.000Z"
        }
    ],
    "Owner": {
        "DisplayName": "webfile",
        "ID": "bcaf1ffd86f41161ca5fb16fd081034f"
    }
}
/usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initaws.d/03-create-dynamodb-table.sh
2021-12-18T08:58:09.995:INFO:localstack.services.infra: Starting mock DynamoDB service on http port 4566 ...
2021-12-18T08:58:10.372:INFO:localstack.services.dynamodb.server: Initializing DynamoDB Local with the following configuration:
(省略)
2021-12-18T08:58:12.719:INFO:bootstrap.py: Execution of "require" took 2802.71ms
{
    "TableNames": [
        "localstack-test"
    ]
}
/usr/local/bin/docker-entrypoint.sh: ignoring /docker-entrypoint-initaws.d/localstack-test-table-attribute-definitions.json
/usr/local/bin/docker-entrypoint.sh: ignoring /docker-entrypoint-initaws.d/localstack-test-table-key-schema.json
```

ログの内容から初期化スクリプトが実行されている様子が確認できます。

実際に初期化スクリプトで必要なリソースが作成されたかをローカル環境から確認してみましょう。
インストール時に`service.edgeService.nodePort=30000`としてLocalStackが外部に公開するポートを30000番ポートを指定していますので、ここからアクセスできます。
なお、LocalStackが公開しているポートは4566ですが、これはクラスタ内部からのみアクセス可能なポートで外部から直接アクセスすることはできません。


```shell
# minikube: 仮想マシン上のLocalStack
LOCALSTACK_ENDPOINT="http://$(minikube ip):30000"
# Docker Desktopの場合
LOCALSTACK_ENDPOINT="http://localhost:30000"

aws s3api list-buckets --endpoint ${LOCALSTACK_ENDPOINT}
aws dynamodb describe-table --table-name localstack-test --region local --endpoint ${LOCALSTACK_ENDPOINT}
```

LocalStack上に作成されたAWSリソースが正常に取得できていれば準備完了です。

## 動作確認

最後に、Kubernetes内のコンテナからLocalStackにアクセスできることを確認しましょう。

