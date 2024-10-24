---
title: CodeBuild + ECR + AWS BatchでAWS Lambda pythonレイヤー作成
author: yuji-kurabayashi
date: 2024-10-25
tags: [ AWS, lambda, Python, docker, CodeBuild, CloudFormation, ECR, Batch, Fargate ]
---

# 背景

　AWS Lambdaの対応言語の中でもpythonはコード実行までの手間と学習コスト的にもお手軽で利用率が高いようです。私の主要言語はJavaなのですが、手っ取り早くLambdaを使いたいときは不慣れであってもお手軽なpythonを使いたくなります。
　そして、Lambdaで外部ライブラリの力を借りたくなった時は[レイヤー](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/chapter-layers.html)というものを用意する必要があります。AWSが予め用意してくれているレイヤーで事足りればよいのですが、そうではない場合は自前でレイヤーを用意しなければなりません。しかし、実際に手を動かしてみるとpythonの環境構築（OpenSSL絡み）でハマってしまい大変でした。そこで、大変なpython環境構築には手を出したくないのでdockerを使い、面倒なコマンド作業をシェルにして実行できたらいいなと思い、レイヤー作成ツールを作ってみました。
　レイヤー作成ツールのdockerコンテナをどこで実行するべきなのかについては、紆余曲折を経てAWS Batchで実行することにしました。イメージのビルドにはCodeBuildを用います。そしてCodeBuildとAWS Batch環境構築用にCloudFormationテンプレートを用意しました。

:::column:dockerコンテナ実行環境の紆余曲折

本稿のAWS Batchを試す前に以下を全て試しましたが、そもそも無理だったり、出来たとしても納得ができるものではなかったので断念しました。

1. Lambda
    * Lambdaをコンテナで実行しているときは`/tmp`ディレクトリにしか書き込みができません。`pip install`でインストール先を`/tmp`にしましたが、結局インストールの管理情報の書き込みが`/tmp`以外のディレクトリに対して行われるのでエラーになってしまい断念しました。
    * 参考までに、[コンテナ開発者向けの AWS Lambda](https://aws.amazon.com/jp/blogs/news/aws-lambda-for-the-containers-developer/)の「コンテナの制約」に以下の記載があります。
        * コンテナは読み取り専用のルートファイルシステムで実行されます（ /tmp は書き込み可能な唯一のパスです）
1. CloudShell
    * 標準でdockerが使えて無料でいいなと思ったのですが、CloudShell自体のCPUアーキテクチャーがx86_64だけしかなさそうで、Amazonが推しているarm64で作成したイメージのコンテナ実行ができなかったため断念しました。[docker用クロスプラットフォームエミュレーター](https://hub.docker.com/r/tonistiigi/binfmt)を入れてみても上手くいきませんでした。
1. EC2
    * arm64のインスタンスを用意したので、当然arm64で作成したイメージのコンテナ実行はできました。しかし、都度利用するには手順が多くて、インスタンス稼働時間も純粋にコンテナ実行時間のみにはできずコストが勿体ないので、AWS Batchがよさそうだと思いました。
:::

# レイヤー作成ツール

レイヤー作成ツールを作ってみました。とにかくdockerさえ利用できればどこでも利用可能です。ローカル開発環境でも利用できます。

## レイヤー作成シェル

* <span style="font-size: 120%;"><b>[PublishPythonLambdaLayer.sh](https://github.com/yuji-kurabayashi/publish_lambda_layer/blob/main/python/PublishPythonLambdaLayer.sh)</b></span>

一般的にpythonのLambdaレイヤーを作成および登録する手順は以下の通りです。

1. pythonライブラリインストールコマンドを実行します
    * 対象ライブラリを列挙した[requirements.txt](https://pip.pypa.io/en/latest/reference/requirements-file-format/)ファイルを用意します
    * [`python -m pip install [options] -r <requirements file> [package-index-options] ...`](https://pip.pypa.io/en/latest/cli/pip_install/#pip-install)
1. レイヤー（zipファイル）を作成します
    * [定められたディレクトリ構成](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/packaging-layers.html#packaging-layers-paths)で用意してzipファイルに圧縮しなければなりません
        * python
        * python/lib/python3.x/site-packages (サイトディレクトリ)
1. レイヤー（zipファイル）をS3にアップロードします
    * AWS CLIだと[`s3 cp`](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3/cp.html)
    * AWSマネジメントコンソール操作ではレイヤー作成時に直接レイヤーのzipファイルをアップロードできますが、10MBを超える場合はS3に置いてアップロードする必要があります
1. Lambdaレイヤーを登録します
    * AWS CLIだと[`publish-layer-version`](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/lambda/publish-layer-version.html)

レイヤー作成シェルではこれらを一気通貫で実施します。なお、python自作モジュールも併せて含めたLambdaレイヤーの作成には対応していません。

作成したLambdaレイヤーアップロード先のS3バケット名を指定しない場合はレイヤー作成までを行います。実行している環境からはS3に接続できないことが予めわかっている、といった場合でもレイヤー作成までは利用できるようにするためです。レイヤー（zipファイル）さえ作成できてファイルが手元にあれば、あとは手作業でなんとか対応できますよね。

また、普通にpythonが利用できる環境であれば、レイヤー作成シェルのみを直接利用してレイヤーを作成できます。

レイヤー作成シェルの使い方の詳細は以下のようなコマンドで確認できます。

```sh
./PublishPythonLambdaLayer.sh -h
```

## Dockerfile

* <span style="font-size: 120%;"><b>[Dockerfile](https://github.com/yuji-kurabayashi/publish_lambda_layer/blob/main/python/Dockerfile)</b></span>

```dockerfile:Dockerfile
# see https://hub.docker.com/r/amazon/aws-lambda-python/
ARG BASE_IMAGE_TAG=latest

FROM amazon/aws-lambda-python:${BASE_IMAGE_TAG?}

COPY ./PublishPythonLambdaLayer.sh .

RUN <<EOF
chmod +x ./PublishPythonLambdaLayer.sh

# for Amazon Linux 2023 (for python 3.12)
if (type dnf > /dev/null 2>&1); then
  # see https://docs.aws.amazon.com/ja_jp/linux/al2023/ug/deterministic-upgrades-usage.html
  # dnf update -y
  dnf upgrade -y --releasever=latest
  dnf install -y zip unzip
  dnf clean all
  rm -rf /var/cache/dnf/*
# for Amazon Linux 2 (for python 3.11)
elif (type yum > /dev/null 2>&1); then
  yum update -y
  yum install -y zip unzip
  yum clean all
  rm -rf /var/cache/yum/*
else
  echo update failed. unsupported package management tool.
  exit 1
fi

# see https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/getting-started-install.html
if !(type aws > /dev/null 2>&1); then
  CPU_ARCHITECTURE=$(uname -m)
  if [ "$CPU_ARCHITECTURE" = "x86_64" ]; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
  elif [ "$CPU_ARCHITECTURE" = "aarch64" ]; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"
  else
    echo aws cli install failed. unsupported cpu architecture.
    exit 1
  fi
  unzip -qq awscliv2.zip
  ./aws/install > /dev/null 2>&1
  rm -f awscliv2.zip
fi
EOF

ENTRYPOINT [ "bash", "./PublishPythonLambdaLayer.sh" ]
CMD [ "" ]
```

1. ベースイメージ
    * [amazon/aws-lambda-python](https://hub.docker.com/r/amazon/aws-lambda-python/)を利用します。AWS Lambda pythonの実行環境そのものなのでレイヤーを作成するには最適な環境です。
1. ベースイメージタグ
    * docker build時にベースイメージのタグを`--build-arg BASE_IMAGE_TAG=<tag>`で指定できます。利用したいCPUアーキテクチャやpythonバージョンに見合った環境を柔軟に選択できます。例えば`3.11`や`3.12`を指定できます。しかし、Amazon Linux 2ベースのpython3.11では`yum`、Amazon Linux 2023ベースのpython3.12では`dnf`しか使えず、互換性がありませんでした。そこで、dnfコマンドが通るかどうかをチェックして、dnfとyumの使い分けをするようにして対応しました。
1. インストールなどの初期化処理
    * [ヒアドキュメント](https://www.docker.com/blog/introduction-to-heredocs-in-dockerfiles/)で書いています。コマンドを頑張って`&& \`で数珠繋ぎしなくて済むので複雑な処理が書きやすくなり、その結果dockerイメージのレイヤ数も減らしやすくなるのでイメージのサイズを小さくできます。
1. その他
    * AWS CLIのファイル解凍やインストールのログが大量に出て煩わしく感じたのでカットしています。
    * レイヤー作成シェルのオプションは実行時にCMDで上書きできるようにしてあります。

# レイヤー作成ツールインフラ構成図

## ビルド環境

1. S3にソース（レイヤー作成ツール）を置いて
1. CodeBuildでdockerイメージを作成し
1. ECRにpushします

![ビルド環境のインフラ構成図](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/024.png)

## 実行環境

1. AWS BatchでECRからdockerイメージをpullして
1. AWS Batchでコンテナを実行してレイヤーを作成し
1. S3にアップロードして
1. Lambdaにレイヤーを登録します

![実行環境のインフラ構成図](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/025.png)

# レイヤー作成ツール環境構築および実行方法

AWS公式ではLambdaをはじめとするコンピューティングリソースのCPUアーキテクチャにarm64を利用することを強く推しているので、環境作成用のCloudFormationテンプレートのデフォルト値はarm64向けにしてあります。

:::check:AWS公式ではコンピューティングリソースはarm64推し
AWS公式では[Lambdaはarm64を強く推している](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/foundation-arch.html)ようです。arm64への移行まで言及していますね。[Lambdaの料金](https://aws.amazon.com/jp/lambda/pricing/#aws-element-9ccd9262-b656-4d9c-8a72-34ee6b662135)をx86_64とarm64で比較してみると、arm64のほうがおよそ20%安いです。そして[性能比較](https://aws.amazon.com/jp/blogs/apn/comparing-aws-lambda-arm-vs-x86-performance-cost-and-analysis-2/)でも明らかにarm64に軍配が上がります。以下、引用です。

> arm64 アーキテクチャ (AWS Graviton2 プロセッサ) を使用するLambda 関数は、x86_64 アーキテクチャで実行される同等の関数よりも大幅に優れた料金とパフォーマンスを実現します。高性能コンピューティング、ビデオエンコーディング、シミュレーションワークロードなど、コンピュータ集約型のアプリケーションに arm64 を使用することを検討してください。

ちなみに[Fargate料金](https://aws.amazon.com/jp/fargate/pricing/)でx86_64とarm64を比較した場合でも、CPUとメモリどちらもarm64のほうがおよそ20%安いです。
:::

## （１）ネットワーク構築

AWS Batchの環境を作成するための、以下のネットワーク要件を全て満たすサブネットを用意します。
私が以前執筆した「[AWS CloudFormationでやさしくネットワーク構築 - IPv6対応、NATゲートウェイ設置切替作業も易しくてお財布にも優しい！](/blogs/2024/09/27/aws_cfn_network_ipv6/)」という記事のCloudFormationテンプレートを使うと簡単に用意できます。

* S3に接続可能
    * 外部アクセス不能なS3バケットに接続する場合はプライベートリンクで接続する（Gateway型VPCエンドポイントを用意してルーティングする）必要があります
* IPv4でインターネット接続可能

## （２）レイヤー作成ツールソースコード格納用S3バケット作成

CodeBuildではS3からソースコードを参照するようにしたので、レイヤー作成ツールソースコードを格納するS3バケットおよびフォルダを用意して、レイヤー作成ツールソースコード（[Dockerfile](https://github.com/yuji-kurabayashi/publish_lambda_layer/blob/main/python/Dockerfile)と[PublishPythonLambdaLayer.sh](https://github.com/yuji-kurabayashi/publish_lambda_layer/blob/main/python/PublishPythonLambdaLayer.sh)）を同一階層に格納します。後で利用するrequirements.txtはついでに同じ場所に置いただけですので、他のバケットに置いても構いません。
例として、`s3://publish-lambda-layer-tool-pcjkn63zhk/python/`に用意しました。
なお、S3バケット作成時の設定「パブリックアクセスをすべて ブロック」はチェックを付けておくことが望ましいです。

|![レイヤー作成ツールソースコード格納用S3バケット](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/001.jpg)|
|:--|

## （３）Lambdaレイヤー格納用S3バケットの作成

作成したLambdaレイヤーをアップロードするS3バケットを用意します。
例として、`s3://lambda-layer-pcjkn63zhk/`を用意しました。
なお、S3バケット作成時の設定「パブリックアクセスをすべて ブロック」はチェックを付けておくことが望ましいです。

|![Lambdaレイヤー格納用S3バケット](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/000.jpg)|
|:--|

## （４）CodeBuildプロジェクトおよびECRリポジトリ作成

CodeBuildプロジェクトおよびECRリポジトリを作成するCloudFormationテンプレートを用意しました。これを用いてリソースを作成します。

* <span style="font-size: 120%;"><b>[cfn_codebuild.yaml](https://github.com/yuji-kurabayashi/cloudformation_templates/blob/main/cfn_codebuild.yaml)</b></span>

|![cfn_codebuildパラメータ設定例](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/022.jpg)|
|:--|

以下、arm64向けのパラメータ設定例です。

| パラメータ項目名 | 値(arm64向け) | コメント |
| --- | --- | --- |
| スタック名 | publish-python-lambda-layer-tool-build-project-arm64 | |
| CodeBuildProjectName | publish-python-lambda-layer-tool-arm64 | |
| BuildProjectDescription | （任意） | |
| BuildEnvironmentOSContainer | ARM_CONTAINER | |
| BuildEnvironmentComputeSpec | BUILD_GENERAL1_SMALL | |
| BuildEnvironmentImage | aws/codebuild/amazonlinux2-aarch64-standard:3.0 | [こちら](https://docs.aws.amazon.com/ja_jp/codebuild/latest/userguide/ec2-compute-images.html)からaarch64のものを選んで設定します。 |
| SourceLocation | publish-lambda-layer-tool-pcjkn63zhk/python/ | 「（２）レイヤー作成ツールソースコード格納用S3バケット作成」の格納パスを指定します。`s3://`は取り除きます。 |
| RepositoryName | publish-python-lambda-layer-tool-arm64 | |

もちろんx86_64向けも用意できます。以下、パラメータ設定例です。

| パラメータ項目名 | 値(x86_64向け) | コメント |
| --- | --- | --- |
| スタック名 | publish-python-lambda-layer-tool-build-project-x86-64 | |
| CodeBuildProjectName | publish-python-lambda-layer-tool-x86-64 | |
| BuildProjectDescription | （任意） | |
| BuildEnvironmentOSContainer | LINUX_CONTAINER | |
| BuildEnvironmentComputeSpec | BUILD_GENERAL1_SMALL | |
| BuildEnvironmentImage | aws/codebuild/amazonlinux2-x86_64-standard:5.0 | [こちら](https://docs.aws.amazon.com/ja_jp/codebuild/latest/userguide/ec2-compute-images.html)からx86_64のものを選んで設定します。 |
| SourceLocation | publish-lambda-layer-tool-pcjkn63zhk/python/ | 「（２）レイヤー作成ツールソースコード格納用S3バケット作成」の格納パスを指定します。`s3://`は取り除きます。 |
| RepositoryName | publish-python-lambda-layer-tool-x86-64 | |

## （５）レイヤー作成ツールdockerイメージ作成

作成したCodeBuildプロジェクトにてビルドを実行します。
dockerイメージを作成し、ECRリポジトリにpushする処理を書いたbuildspec、およびbuildspec内で参照する環境変数はCloudFormationでプロジェクトを作成した際に既に用意されています。
実行時に設定する環境変数を設定するだけでビルドができます。

```yaml:buildspec.yml
version: 0.2
phases:
  pre_build:
    commands:
      - |
        export AWS_ECR_REGISTRY_URL=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.$AWS_URL_SUFFIX
        export DOCKER_IMAGE_REPO_NAME_AND_TAG=$IMAGE_REPO_NAME:$IMAGE_TAG
        echo "AWS_ECR_REGISTRY_URL="$AWS_ECR_REGISTRY_URL
        echo "DOCKER_IMAGE_REPO_NAME_AND_TAG="$DOCKER_IMAGE_REPO_NAME_AND_TAG
      - echo "----- login to Amazon ECR Repository -----"
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ECR_REGISTRY_URL
      - |
        if [ -n "$DOCKER_USER" ] && [ -n "$DOCKER_TOKEN" ]; then
          echo "----- login to docker hub -----"
          echo $DOCKER_TOKEN | docker login -u $DOCKER_USER --password-stdin
        fi
  build:
    commands:
      - echo "----- build docker image -----"
      - echo Build started on `date`
      - docker build -t $DOCKER_IMAGE_REPO_NAME_AND_TAG $DOCKER_BUILD_OPTIONS .
      - echo Build completed on `date`
  post_build:
    commands:
      - echo "----- add docker image tag -----"
      - docker tag $DOCKER_IMAGE_REPO_NAME_AND_TAG $AWS_ECR_REGISTRY_URL/$DOCKER_IMAGE_REPO_NAME_AND_TAG
      - echo "----- push docker image to Amazon ECR Repository -----"
      - docker push $AWS_ECR_REGISTRY_URL/$DOCKER_IMAGE_REPO_NAME_AND_TAG
```

### 環境変数設定

CodeBuildプロジェクトの「編集」->「環境」->「追加設定」->「環境変数」にて設定します。
設定が終わったら「プロジェクトを更新する」を押下します。

|![CodeBuildプロジェクト環境変数](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/004.jpg)|
|:--|

以下、arm64向けのパラメータ設定例です。

| 環境変数名 | 値(arm64向け) | コメント |
| --- | --- | --- |
| IMAGE_TAG | latest | CodeBuildで作成したdockerイメージに付与するタグです。`DOCKER_BUILD_OPTIONS`の`--build-arg BASE_IMAGE_TAG`に設定するものと同じものを設定して識別できるようにするのもありです。 |
| DOCKER_BUILD_OPTIONS | --build-arg BASE_IMAGE_TAG=3.12.2024.10.15.10 | ベースイメージのタグを指定します。[ここ](https://hub.docker.com/r/amazon/aws-lambda-python/tags)から目的のpythonバージョンかつOS/ARCHがarm64のものを探します。|

以下、x86_64向けのパラメータ設定例です。

| 環境変数名 | 値(arm64向け) | コメント |
| --- | --- | --- |
| IMAGE_TAG | latest | CodeBuildで作成したdockerイメージに付与するタグです。`DOCKER_BUILD_OPTIONS`の`--build-arg BASE_IMAGE_TAG`に設定するものと同じものを設定して識別できるようにするのもありです。 |
| DOCKER_BUILD_OPTIONS | --build-arg BASE_IMAGE_TAG=3.12.2024.10.16.13 | ベースイメージのタグを指定します。[ここ](https://hub.docker.com/r/amazon/aws-lambda-python/tags)から目的のpythonバージョンかつOS/ARCHがamd64のものを探します。|

:::alert:ベースイメージのタグはバージョンを固定できるものを明示的に指定すべし
`DOCKER_BUILD_OPTIONS`で`--build-arg BASE_IMAGE_TAG`を指定しない場合は`latest`が適用されます。ちなみに`latest`でdocker buildしていると、ある日突然ベースイメージで使われる内部のバージョンが上がってしまい、その結果動作に影響が出てしまって突然動かなくなってしまうというリスクがあります。よって一般的にはバージョンが固定されるタグを明示的に指定することが望ましいです。ちなみに[amazon/aws-lambda-python](https://hub.docker.com/r/amazon/aws-lambda-python/)では、`latest`の他に`3.11`や`3.12`などでも内部でバージョンが上がってしまうので注意します。
:::

### ビルド実行

「ビルドを開始」を押下します。

|![CodeBuildプロジェクト環境変数](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/003.jpg)|
|:--|

成功したことを確認します。

|![CodeBuildビルド成功](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/005.jpg)|
|:--|

イメージがECRリポジトリにpushされていることを確認します。

|![ECRリポジトリ](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/006.jpg)|
|:--|

### ビルド実行が失敗してしまう時は

docker buildコマンドを実行している際にベースイメージのプルが「Too Many Requests.(リクエストが多すぎます)」という全く心当たりのない謎のエラーメッセージでビルドが失敗することがあります（原因は後述します）。この場合はビルドを再実行すれば成功する可能性があります。もし再実行しても失敗が続く場合、あるいはビルドを安定して成功させたい場合は、自分の docker hub ユーザを用意して、CodeBuildの環境変数`DOCKER_USER`と`DOCKER_TOKEN`を設定します。これらの認証情報は環境変数にプレーンテキストで直接設定せずに、パラメータストアまたはシークレットマネージャーに登録して参照することが望ましいです。

#### パラメータストア設定例

|![パラメータストア設定例](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/019.jpg)|
|:--|

#### シークレットマネージャー設定例

|![シークレットマネージャー設定例](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/020.jpg)|
|:--|

#### CodeBuildの環境変数の設定例

* パラメータストアを参照する場合
    * 値を「マイパラメータの名前」、タイプを「パラメータ」に設定します。
        * 値の設定例：`DOCKER_USER`
* シークレットマネージャーを参照する場合
    * 値を「シークレットの名前:シークレットキー」、タイプを「Secrets Manager」に設定します。
        * 値の設定例：`MyDockerHubAccount:DOCKER_TOKEN`

|![DockerHubアカウント環境変数の設定例](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/021.jpg)|
|:--|

:::check:CodeBuildでdocker buildが失敗する原因について
　docker buildコマンドを実行している際にベースイメージのプルが「Too Many Requests.(リクエストが多すぎます)」という全く心当たりのない謎のエラーメッセージでビルドが失敗してしまう原因ですが、現在のAWSリージョンにいる全てのCodeBuildユーザが、そのリージョンのCodeBuildのグローバルIPアドレスを共有しており、おそらくそのうちの多くのユーザが匿名ユーザとして docker hub にアクセスしていることが想定されるため、割り当てられたCodeBuildのグローバルIPアドレスの運が悪いと[Anonymous users（匿名ユーザ）の流量制限](https://docs.docker.com/docker-hub/download-rate-limit/#whats-the-download-rate-limit-on-docker-hub)「100 pulls per 6 hours per IP address（1IPアドレスあたり6時間あたり100プル）」に引っかかってしまうからです。そこで、環境変数「DOCKER_USER」と「DOCKER_TOKEN」を設定して docker hub へログインするようにします。そうするとAuthenticated users（認証ユーザ）としての流量制限「200 pulls per 6 hour period（1ユーザあたり6時間あたり200プル）」が適用されるため、そのユーザで過剰にイメージのプルを行っていなければ成功します。

ちなみに、[こちら](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/aws-ip-ranges.html)からAWS IPアドレスの範囲のjsonをダウンロードして確認してみると、本稿執筆時点では東京リージョンのCodeBuildのIPアドレスは 8 + 8 = 16個 確保されているようです。つまり、CodeBuildにて匿名ユーザでdocker buildする都度、最大で16個のIPアドレスの中からビルド成否の運試しをすることになりますね。

```json
    {
      "ip_prefix": "13.112.191.184/29",
      "region": "ap-northeast-1",
      "service": "CODEBUILD",
      "network_border_group": "ap-northeast-1"
    },
    {
      "ip_prefix": "35.75.131.80/29",
      "region": "ap-northeast-1",
      "service": "CODEBUILD",
      "network_border_group": "ap-northeast-1"
    },
```
:::

## （６）AWS Batch環境作成

AWS Batch環境を作成するCloudFormationテンプレートを用意しました。これを用いてリソースを作成します。

* <span style="font-size: 120%;"><b>[cfn_aws_batch.yaml](https://github.com/yuji-kurabayashi/cloudformation_templates/blob/main/cfn_aws_batch.yaml)</b></span>

|![cfn_aws_batchパラメータ設定例](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/023.jpg)|
|:--|

以下、arm64向けのパラメータ設定例です。

| パラメータ項目名 | 値(arm64向け) | コメント |
| --- | --- | --- |
| スタック名 | publish-python-lambda-layer-tool-aws-batch-arm64 | |
| prefix | publish-python-lambda-layer-tool-arm64 | |
| AwsBatchVpcId | 指定したAwsBatchSubnetIdsが属するVPC | |
| AwsBatchSubnetIds | IPv4が利用できるサブネット | インターネット接続可能な状態にしておきます。 |
| ComputeResourcesType | FARGATE | 現状AWS Batchではarm64でFargate Spotは使えません。 |
| AssignPublicIp | （ネットワーク次第） | AwsBatchSubnetIdsでパブリックサブネットを選択した場合はENABLED |
| CpuArchitecture | ARM64 | |
| AwsBatchVCPU | （任意） | |
| AwsBatchMemory | （任意） | |
| AllowActions | s3:GetObject,s3:ListBucket,s3:PutObject,lambda:PublishLayerVersion | レイヤー作成ツールで必要な権限です。 |
| EcrRepositoryName | publish-python-lambda-layer-tool-arm64 | pushしたECRリポジトリ |
| DockerImageTag | latest | pushしたECRリポジトリのイメージタグ |

:::check:AWS Batchではarm64でFargate Spotはサポートしていません
[Fargate Spot](https://aws.amazon.com/jp/blogs/news/aws-fargate-spot-now-generally-available/)はタスクが中断されるリスクは伴うものの、Fargateよりも70%オフで利用できます。レイヤー作成ツールは仮にタスクが中断されたらまた実行すればよいだけであまりデメリットにはならないので積極的に利用したいです。[ECSではarm64でFargate Spotが使える](https://aws.amazon.com/jp/about-aws/whats-new/2024/09/amazon-ecs-graviton-based-spot-compute-fargate/)にもかかわらず、残念なことに本稿執筆時点で[AWS Batchではarm64でFargate Spotが使えない](https://docs.aws.amazon.com/ja_jp/batch/latest/APIReference/API_RuntimePlatform.html)です。実際にCloudFormationでarm64でFargate Spotを指定してみたところ、コンピューティング環境等のリソースは作成できますが、ジョブを実行してもステータスがRunnableのままいつまで経っても変化せず、実行を止められてしまっている感じでした。AWS Batch内部でECS Fargateを使っていそうなのに解せないですね。ちなみにx86_64では使えます。是非ともarm64でも使えるようにしてほしいですね。
:::

以下、x86_64向けのパラメータ設定例です。

| パラメータ項目名 | 値(x86_64向け) | コメント |
| --- | --- | --- |
| スタック名 | publish-python-lambda-layer-tool-aws-batch-x86-64 | |
| prefix | publish-python-lambda-layer-tool-x86-64 | |
| AwsBatchVpcId | 指定したAwsBatchSubnetIdsが属するVPC | |
| AwsBatchSubnetIds | IPv4が利用できるサブネット | インターネット接続可能な状態にしておきます。 |
| ComputeResourcesType | FARGATE_SPOT | x86_64ではFargate Spotが利用できます。 |
| AssignPublicIp | （ネットワーク次第） | AwsBatchSubnetIdsでパブリックサブネットを選択した場合はENABLED |
| CpuArchitecture | X86_64 | |
| AwsBatchVCPU | （任意） | |
| AwsBatchMemory | （任意） | |
| AllowActions | s3:GetObject,s3:ListBucket,s3:PutObject,lambda:PublishLayerVersion | レイヤー作成ツールで必要な権限です。 |
| EcrRepositoryName | publish-python-lambda-layer-tool-x86-64 | pushしたECRリポジトリ |
| DockerImageTag | latest | pushしたECRリポジトリのイメージタグ |

## （７）レイヤー作成実施

作成したAWS Batch環境にてジョブを作成してLambdaレイヤーを作成します。
AWS Batchの「ジョブ」にて「新しいジョブを送信」ボタンを押下します。

|![新しいジョブを送信](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/007.jpg)|
|:--|

### 全般設定

以下を選択します。

* ジョブ定義
    * CloudFormationのパラメータ「prefix」値-job-definition
* ジョブキュー
    * CloudFormationのパラメータ「prefix」値-job-queue

|![ジョブ全般設定](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/008.jpg)|
|:--|

### コンテナの上書き コマンド - オプション

以下はarm64向けの必要最低限のパラメータ設定例です。
Dockerfileの`CMD [ "" ]`を上書きしてレイヤー作成シェルのオプションを設定します。

|![コンテナの上書き](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/009.jpg)|
|:--|

```
[ "-p s3://publish-lambda-layer-tool-pcjkn63zhk/python/requirements.txt", "-n http_request_lib_test_python_3_12_arm64", "-s lambda-layer-pcjkn63zhk" ]
```

#### レイヤー作成シェルのオプション

| オプション | 必須or任意 | 説明 |
| --- | --- | --- |
| -p | 「-r」と「-p」のどちらかが必須 | requirements.txtのパスを指定します。S3 URLもしくはローカルファイルパスを指定します。 |
| -r | 「-r」と「-p」のどちらかが必須 | requirements.txtの内容を指定します。requirements.txtの中身の改行を「&#124;」で置換したものを指定します。 |
| -n | 必須 | レイヤー名を指定します。 |
| -s | （レイヤーをS3にアップロードする前提なので）必須 | レイヤー格納S3バケット名を指定します。「（３）Lambdaレイヤー格納用S3バケットの作成」で作成したバケット名を指定します。シェルとしてはこのオプションは必須ではないですが、AWS Batchで動かす場合は作成したレイヤーzipファイルを取得する術がないのでS3アップロードは実質上必須です。 |
| -k | 任意 | レイヤー格納S3キー（デフォルトは「python」）を変更できます。 |
| -l | 任意 | レイヤーのライセンス情報を指定します。 |

例として、`s3://publish-lambda-layer-tool-pcjkn63zhk/python/`に`requirements.txt`を用意しました。
その内容は以下の通りです。

```
requests == 2.32.3
httpx == 0.27.2
```

「-p」オプションを使わず`requirements.txt`ファイルを用意せずに「-r」オプションを使うこともできます。

```
[ "-r requests == 2.32.3|httpx == 0.27.2", "-n http_request_lib_test_python_3_12_arm64", "-s lambda-layer-pcjkn63zhk" ]
```

以下はx86_64向けの必要最低限のパラメータ設定例です。

```
[ "-p s3://publish-lambda-layer-tool-pcjkn63zhk/python/requirements.txt", "-n http_request_lib_test_python_3_12_x86_64", "-s lambda-layer-pcjkn63zhk" ]
```

### ジョブの送信

ステータスがSucceededになれば成功です。

|![ジョブ成功](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/010.jpg)|
|:--|

S3にレイヤーのzipファイルが格納されます。

|![S3レイヤーzip](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/011.jpg)|
|:--|

レイヤーのzipファイルのメタデータにはレイヤーの各種情報が設定されます。

|![S3レイヤーzipメタデータ](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/012.jpg)|
|:--|

Lambdaレイヤーにも登録されています。

|![Lambdaレイヤー](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/013.jpg)|
|:--|

|![Lambdaレイヤー詳細](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/014.jpg)|
|:--|

## （８）実際にレイヤーを利用してみる

### 関数作成

目的のランタイムとアーキテクチャを指定して関数を作成します。

|![関数作成](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/015.jpg)|
|:--|

### レイヤー追加

関数にレイヤーを追加します。

|![レイヤー追加](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/016.jpg)|
|:--|

### 一般設定 - タイムアウト時間

Lambdaはタイムアウト時間がデフォルトで3秒なので、念のためこれを1分ぐらいに変更しておきます。

### ソースコード

レイヤーで取り込んだモジュール（requests, httpx）を利用してみます。
ついでに`platform.python_version()`で、実際に動作しているpythonのバージョンを取得してみます。

```python:lambda_function.py
import platform
import httpx
import requests

def lambda_handler(event, context):
    python_version = platform.python_version()
    print('[lambda python runtime version] ' + python_version)
    url = 'https://aws.amazon.com/'
    httpx_response = httpx.get(url)
    print('[httpx response]')
    print(httpx_response)
    requests_response = requests.get(url)
    print('[requests response]')
    print(requests_response)
    return python_version
```

### 実行結果

HTTPリクエストが通っており、動作しているpythonバージョンが返されて成功しているのでレイヤーが利用できています。

|![Lambda実行結果](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/018.jpg)|
|:--|

レイヤー作成のベースイメージ(3.12.7)がリリースされて間もなかったので、実際のLambda(3.12.5)がまだ追い付いていなかったようです。もしpythonのバージョンが違っている状態でうまく動かなかったときは、pythonバージョンが一致するようにベースイメージを選定し直してレイヤーを作り直してみるとよいかもしれません。

# 最後に

今回はpythonで実現しましたが、レイヤー作成ツールの中身（Dockerfileとシェルのみ）を差し替えれば他のLambda対応言語もこの方式で簡単にレイヤー作成できるのではないかと思います。
そして、イメージ作成環境のCodeBuildおよびコンテナ実行環境のAWS BatchのCloudFormationテンプレートは、レイヤー作成ツールには特化せず汎用的に利用できるように作ったので、これを用いて自由な言語で自由にツールやアプリケーションを用意できると思います。
