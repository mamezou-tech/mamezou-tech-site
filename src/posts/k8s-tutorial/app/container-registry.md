---
title: クラスタ環境デプロイ - コンテナレジストリ(ECR)
author: noboru-kudo
date: 2022-01-13
prevPage: ./src/posts/k8s-tutorial/app/batch.md
nextPage: ./src/posts/k8s-tutorial/app/eks-1.md
---

さて、ここまででWeb・バッチアプリケーションの開発が終わり、ローカル環境で動作確認ができました。
いよいよここからは、AWS EKSにアプリケーションをデプロイしていきます。

その前に、アプリケーションをEKSにデプロイする際、コンテナイメージはどこで管理すべきでしょうか？
今まではコンテナのビルドと実行が同一環境(ローカル環境)のため、イメージビルド後にそのまま実行できていました[^1]。
ローカル環境での開発はこれで問題ありませんが、その後のテスト・商用環境では、イメージのビルドはCI/CDパイプラインで、その実行はKubernetesと分離することが一般的です。
これを実現するには、ビルドしたイメージを保管・配布する仕組みが必要になります。

これを担うのがコンテナレジストリです。コンテナレジストリを導入することで、ビルドしたイメージをバージョン管理し、各実行環境で取得(Pull)できるようになります[^2]。
まずコンテナレジストリと聞いて、[Docker Hub](https://hub.docker.com/)を思いつく方が多いでしょう。
Docker Hubは最も古いコンテナレジストリで、パブリックなリポジトリは無料で作成できますし、利用方法も簡単で今でも最も多く利用されているであろうと思います[^3]。

[^1]: Podのマニフェストで`imagePullPolicy`を`Never`にしていました。

[^2]: 昨今はコンテナイメージの脆弱性スキャンに力を入れる製品・サービスが増えてきました。

[^3]: 2020-11-20よりDockerHubからイメージのPULLにはRateLimitがかけられるようになりました。詳細は[こちら](https://www.docker.com/increase-rate-limits)を参照してください。

その一方で、Docker Hub以外にもコンテナレジストリには多くのサービスやプロダクトがあり、よく知られているものだけでも以下のようなものがあります。

- [Amazon Elastic Container Registry(ECR)](https://aws.amazon.com/ecr/)
- [Google Container Registry(GCR)](https://cloud.google.com/container-registry/) / [Google Artifact Registry(GAR)](https://cloud.google.com/artifact-registry/)
- [Azure Container Registry(ACR)](https://azure.microsoft.com/services/container-registry/)
- [Red Hat Quay.io](https://quay.io/)
- [GitHub Packages](https://github.com/features/packages)
- [GitLab Container Registry](https://docs.gitlab.com/ee/user/packages/container_registry/)
- [Sonatype Nexus](https://www.sonatype.com/)
- [JFrog Artifactory](https://jfrog.com/artifactory/)
- [Harbor](https://goharbor.io/)

このように多くの選択肢がありますが、プライベートのコンテナレジストリが必要であれば、組織的な制約がない限り、各クラウドプロバイダで提供されているものを利用するのが手っ取り早いでしょう。
今回はAWS EKSをアプリケーションのホスティング先として選択しますので、AWSマネージドサービスであるコンテナレジストリのECRを使用します[^4]。

[^4]: ECRを使うメリットとして、リポジトリへのアクセス許可(Pull/Push)にIAMを利用できますので、他のAWSリソースのアクセスポリシーとの一貫性を確保できます。

[[TOC]]

## 事前準備

### アプリケーションソースコード

ビルド対象のアプリケーションのソースコードやDockerfileは、前回同様にGitHubに用意していますので、未実施の場合はクローンしてください。

```shell
git clone https://github.com/mamezou-tech/k8s-tutorial.git
```

### Terraform CLI
また、今回AWSリソースのプロビジョニングには[Terraform](https://www.terraform.io/)を利用します[^5]。
未インストールの場合は、以下よりTerraformのCLIをセットアップしてください。

- <https://learn.hashicorp.com/tutorials/terraform/install-cli>

[^5]: もちろんCloudFormationやAWS CLI等でも対応可能ですが、個人的な好みもありTerraformとしました。

また、ECRを作成するために必要なポリシーは、[こちら](https://raw.githubusercontent.com/mamezou-tech/k8s-tutorial/main/app/terraform-ans/ecr-policy.json)に準備しました。Terraformを実行するIAMユーザーのポリシーに追加してください。

### AWS CLI/Docker CLI

コンテナレジストリの操作にはAWS CLI/Docker CLIを使用します。未セットアップの場合はインストールしてください。

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- Docker CLI
  - MacOS: `brew install docker`
  - Windows: `choco install docker-cli`

### S3(Terraformリモートステート)

AWSマネジメントコンソールに、任意のS3バケットを作成してください。Terraformのリモートステートの保管場所として使用します。
詳細は[こちら](/containers/k8s/tutorial/infra/aws-eks-terraform/#リモートステート用のバケット作成)を参照してください。
既に作成済みの場合は、同一バケットを再利用できます。

## リポジトリ作成

では、ECRにコンテナイメージのリポジトリを作成しましょう。
対象のタスク管理ツールのイメージのリポジトリ名は、以下のようにします。

1. タスク管理API: `mamezou-tech/task-service`
2. タスク管理ツールUI: `mamezou-tech/task-web`
3. 完了タスクレポート出力バッチ: `mamezou-tech/task-reporter`

`2.`のタスク管理ツールのUIは、ローカル環境ではコンテナ化せずに、Vue CLIを使って起動しました。ここでは、コンテナ化してEKS上にホスティングすることとします[^6]。

[^6]: AWSだと静的リソースはS3にホスティングし、CloudFront(CDN)で配信するというスタイルが一般的ですが、本題ではないため触れません。

`app/terraform`配下に`main.tf`を作成し、以下を記述しましょう。

```hcl
terraform {
  required_version = "~> 1.0.8"
  # リモートステートの設定
  backend "s3" {
    bucket = "<remote-state-bucket>"
    key    = "task-tool-state"
    region = "ap-northeast-1"
  }
  # 実行するProviderの条件
  required_providers {
    aws        = {
      source  = "hashicorp/aws"
      version = "~> 3.62"
    }
  }
}

provider "aws" {}
```

ここではリモートステートとしてS3を使用し、リソースの作成には[AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)を使用する設定を指定しています。
`backend`の`bucket`は自分のリモートステート用のS3バケット名に置き換えてください。

次に、ECRの作成です。以下を追記してください。

```hcl
# タスク管理API
resource "aws_ecr_repository" "task_service" {
  name = "mamezou-tech/task-service"
}
# タスク管理UI(静的リソース)
resource "aws_ecr_repository" "task_web" {
  name = "mamezou-tech/task-web"
}
# 完了タスクレポート出力バッチ
resource "aws_ecr_repository" "task_reporter" {
  name = "mamezou-tech/task-reporter"
}
```

ECRにアプリで使用する3つのリポジトリを定義しました。
今回はデフォルト設定のみの非常にシンプルな構成ですが、他にもタグの変更可否や脆弱性スキャン等の設定も可能です。詳細は[こちら](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository)を参照しくてださい。

これをAWSに反映しましょう。

```shell
# モジュール初期化
terraform init
# 実行計画確認
terraform plan
# AWSリソース作成
terraform apply
```

作成が終わったら、マネジメントコンソールからも確認してみましょう。以下のようになっているはずです。

![](https://i.gyazo.com/e5c6df5ea6dfe76ac5335cff06bdb4a6.png)

今回は実施しませんでしたが、不要なイメージが溜まり続けると、ECRのストレージ費用が高くなります。
実際にプロジェクトでECRを運用する場合は、ライフサイクルポリシーを必ず設定して、定期的に不要なイメージを削除してください。
AWS公式ドキュメントは[こちら](https://docs.aws.amazon.com/ja_jp/AmazonECR/latest/userguide/LifecyclePolicies.html)を参照してください。Terraformでは[ecr_lifecycle_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_lifecycle_policy)リソースを追加することでライフサイクルポリシーを作成できます。

これ以外にも、ECRには[レプリケーション](https://docs.aws.amazon.com/AmazonECR/latest/userguide/replication.html)や[Pull Through Cache](https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache.html)等、実用的な機能が数多くありますので、興味のある方は一度[公式ドキュメント](https://docs.aws.amazon.com/ecr/index.html)を眺めてみるとよいでしょう。

## イメージビルド/プッシュ

それでは、作成したリポジトリにそれぞれのアプリケーションのイメージをプッシュしていきましょう。
ECRへの操作はDocker CLIを使用します。まず、ECRにログインする必要があります。
Terraformとは別のターミナルを起動し、ECRのポリシーを持ったIAMユーザーで、以下を実行してください(前述のTerraform用のポリシーには含まれていません)。

```shell
aws ecr get-login-password --region <aws-region> | \
  docker login --username AWS --password-stdin \
    <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com
```

`<aws-account-id>`/`<aws-region>`には、対象のAWSアカウントIDとリージョンを設定してください（以下同様）。
正常にログインできると、`Login Succeeded`というメッセージが出力されます。

エラーとなる場合は、利用しているIAMユーザー(またはRole)でECR認証トークン取得(`ecr:GetAuthorizationToken`)が許可されているかを確認してください。
実行している現在のIAMユーザーは、以下を実行すると参照できます。

```shell
aws sts get-caller-identity
```

### タスク管理API
それでは、まずタスク管理APIのイメージ(`mamezou-tech/task-service`)をビルドして、ECRにプッシュしてみましょう。
タスク管理APIのソースコードは`app/apis/task-service`に格納されています。

イメージのビルドはDocker CLIで以下のようにします。

```shell
# PROJECT_ROOTはクローンしたディレクトリを指定してください(以下同様)
cd ${PROJECT_ROOT}/app/apis/task-service
docker build -t <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:test-v1 .
```

`<aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com`の部分がECRのエンドポイントになります。
ここでにリポジトリ名を`mamezou-tech/task-service`、タグを`test-v1`としてイメージをビルドしました。

後は、ECRにプッシュするだけです。

```shell
docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:test-v1
```

標準出力で、ECRにプッシュされている様子が分かるはずです。

### タスク管理ツールUI
続いて、UIリソースです。`app/web`にソースコードが格納されています。ビルド、プッシュの手順は先程と同じです(リポジトリ名のみ変更)。

```shell
# イメージビルド
cd ${PROJECT_ROOT}/app/web
docker build -t <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-web:test-v1 .
# ECRプッシュ
docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-web:test-v1
```

### タスクレポート出力バッチ
最後はバッチアプリです。`app/jobs/task-reporter`にソースコードが格納されています。こちらもビルド、プッシュの手順は同じです(リポジトリ名のみ変更)。

```shell
# イメージビルド
cd ${PROJECT_ROOT}/app/jobs/task-reporter
docker build -t <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-reporter:test-v1 .
# ECRプッシュ
docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-reporter:test-v1
```

### プッシュしたイメージ確認

マネジメントコンソールから、ECRに登録されたイメージを見てみましょう。
各リポジトリに、`test-v1`というタグでイメージがプッシュされていることが確認できるはずです。
以下はタスク管理APIの例です。

![](https://i.gyazo.com/88470233da87669e9eeecb2c794f1458.png)

## 動作確認

プッシュしたイメージが取得できることを確認しましょう。
今回はタスク管理API(`mamezou-tech/task-service`)のみ確認します（もちろんバッチの方でも確認できます）。

その前にローカル環境のKubernetesを起動しておきましょう。

- [ローカル開発環境準備 - 実行環境(minikube)](/containers/k8s/tutorial/app/minikube/)

KubernetesがイメージをPULLするためには、事前にSecretとしてECRの認証情報を設定する必要があります[^7]。

[^7]: EKSにデプロイする場合は、EKS自身のIAMで制御されるため、ここでのSecret登録は不要です。なお、トークンの有効期限は12時間で、期限切れの場合は再度Secretを作成する必要があります。

以下を実行して、Secretを登録しておきましょう。

```shell
ECR_PASSWORD=$(aws ecr get-login-password)
kubectl create secret docker-registry ecr-secret \
  --docker-server=<aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com \
  --docker-username=AWS \
  --docker-password=${ECR_PASSWORD}
```

次に、`k8s/<version>/task-service/deployment.yaml`を、以下のように変更しましょう(`<version>`はv1/v2どちらでも構いません)。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
spec:
  # 省略
  template:
    # 省略
    spec:
      imagePullSecrets:
        - name: ecr-secret
      containers:
        - name: task-service
          # アプリケーションコンテナ
          image: <aws-account-id>.dkr.<aws-region>.amazonaws.com/mamezou-tech/task-service:test-v1
          imagePullPolicy: IfNotPresent
          # 省略
```

変更点は以下の通りです。
- `imagePullSecrets`で先程登録したSecretを指定
- `image`をプッシュしたイメージのリポジトリ名とタグ`test-v1`
- `imagePullPolicy`を`Never`から`IfNotPresent`を指定（ノードにキャッシュされていなければ、コンテナレジストリから取得）。

こうすることで、このイメージはECRからPULLされるようになります。
これをデプロイしましょう。今回はSkaffoldではなくkubectlで直接反映します。

```shell
kubectl apply -f k8s/<version>task-service
```

デプロイが終わったら、`kubectl describe pod task-service`でPodのEventsを確認してみましょう。

```
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  114s  default-scheduler  Successfully assigned default/task-service-7fc98b5ffb-nqctl to minikube
  Normal  Pulling    113s  kubelet            Pulling image "xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-service:test-v1"
  Normal  Pulled     105s  kubelet            Successfully pulled image "xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-service:test-v1" in 8.173489005s
  Normal  Created    105s  kubelet            Created container task-service
  Normal  Started    105s  kubelet            Started container task-service
```

このように、ECRからイメージをPULLしている様子が出力されていれば、動作確認は完了です。
IngressやLocalStackもセットアップ済みであれば、Ingressを追加デプロイし、curlやUI等から確認してみてください。
今までローカル環境でやってきたように動作するはずです。

## まとめ

今まではローカル環境でビルドしたイメージをそのまま実行してきました。
ローカル環境ではこれで問題ありませんが、実際のKubernetesクラスタ環境では、イメージのビルドと実行は別になるため、この方法は使用できません。

ここでは、プライベートなコンテナレジストリを導入し、ここにビルドしたイメージを登録(Push)し、それを実行環境で取得(Pull)できるところまで確認しました。

次回は、アプリケーションをローカル環境のKubernetesに加えて、実際のクラウド環境(EKS)上で実行できるようにします。
