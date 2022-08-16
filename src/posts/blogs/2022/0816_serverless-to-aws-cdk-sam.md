---
title: serverless から AWS CDK/SAM へ
author: yumeto-yamagishi
date: 2022-08-16
tags: [AWS, サーバーレス]
---

serverlessからAWS CDKへの構成変更を通して、それぞれのツールの良さ・課題とCDKのコンストラクトの効果的な使い方を解説します。0からCDKで構成する際の参考にもどうぞ。

[[TOC]]

## モチベーション

[serverless framework](https://www.serverless.com/) (以後、SLS) は、簡潔な記述でサーバレスアプリケーションのインフラを記述できるオーケストレーションツールです。多くの[プラグイン](https://www.serverless.com/plugins)がコミュニティにより開発され、痒い所に手の届く拡張機能の豊富さが魅力です。

一方で、開発の停滞に伴うセキュリティ問題やプラグインの相互依存による更新の難しさがあります。対応として「プラグインの自社開発・独自拡張を行う」という選択肢もあるとは思いますが、すぐに使える（＝開発コストがかからない）ことを理由に使い始めたプラグインに於いては”想定外のコスト”となり得ます。主な要因は「プラグイン」という拡張方式がもたらす難しさで、やりたいことことをプログラミングするコストに加えプラグイン固有の実装方式（SLSの拡張方法）を知る必要があるからです。

コミュニティが活発で十分にメンテナンスがされているプラグインしか使用しなければ、上記問題のリスクは回避できます。また、ちょっとした機能であれば（SLSと無関係な）スクリプトとして記述できる場合も多いです。SLSはframework本体の基本機能だけでもサーバレスアプリケーションのコア部分を簡潔に記述したり定義ファイル分割ができるので、どの程度プラグインに依存するかについては選択の余地があります。

今回ご紹介するAWS CDKもインフラを記述するためのオーケストレーションツールですが、ユーザが機能拡張を行う方式として「プログラミングスタイル」を採用している点が異なります。

### 対象読者と記事の目的

本記事は、SLS、TypeScript (nodejs/npm)およびAWS CloudFormationを使ったインフラ・サーバレスアプリケーション構築のご経験がある方を対象として、AWS CDK/SAMの概要説明を目的としております。
- SLSの（特にプライグインの）セキュリティ問題・パッチ適用で悩んでいる方
- サーバレスアプリケーションのローカル開発が必要な方。
- AWS CDK が”熱いらしい”と聞いてはいるが、何がどう熱いのか気になる方

### SLSからCDKへの"移行"に関する制限

- AWS CDK/SAMはAWS固有のサービスであり、SLSで他のクラウドベンダに依存している場合は適用できません。
- 多くのフレームワークと同様、SLSとCDKのように同じ目的を持つ異なるフレームワーク（ツール）を混ぜて使うことは百害あって一利なしです。
- 既にSLSで商用運用しているシステムのCDK/SAMへの移行については、ステートフルリソース（データベースやS3など）の移行に伴う難しさがあり、個人的にはあまりお勧めいたしません。
  - SLSのバージョンアップ・typescript化・serverless-compose機能を使い、過剰なプラグイン依存からの脱却を含めてSLSのメンテナンス性向上に努めるほうが幸せになれるでしょう。
  - 本記事では「移行シナリオ」を紹介していますが、現実的には新規アプリケーション開発時の選択肢として、SLSではなくCDKを採用するという意味での「開発手法の変更」を指しています。

## ツール・用語の概要紹介

ここでは、SLSの`aws-nodejs-typescript`テンプレート[^1]と同じ構成で作成された[HTTP API アプリケーション](https://github.com/yumeto-yamagishi/serverless-example-typescript)を、CDK+SAMに置き換え、ローカル環境で（AWSアカウントが無くても）APIの動作確認を可能にするまでを紹介します。


[^1]: SLSでは `sls create -t aws-nodejs-typescript -p sample_app` のような方法で、アプリケーションのひな形を作成できます。


移行作業を始める前に、serverlessによるアプリケーション定義を見てみましょう。
```yaml
# serverless による HTTP APIの定義
functions:
  createTask:
    handler: handler.createTask # handler.jsファイルのexportされたcreateTask関数を参照
    events:
      - http: # ApiGateway HTTP APIを表すイベントソース
          method: "POST"
          path: "/task/create"
```
非常にシンプルです。Lambda関数定義 -> ApiGateway HTTPイベントの順で定義することで、ApiGatewayで提供されるHTTP Api機能にLambda関数を紐づけています。

### AWS CDK (Cloud Development Kit)

AWS CDKは、極論するとプログラミング言語を使用して記述できるCloudFormationテンプレート開発ツールです。CDKによる開発の場合、IDEのプログラミング言語サポート機能をフル活用して、自動補完やドキュメント参照をしながらインフラ定義を記述できます。

```typescript
// todo-task-stack.ts
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

// CloudFormationのスタック定義
export class TodoTaskStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 関数の定義
    const createTaskFn = new lambda.Function(this, 'createTask', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler.createTask', // ../app/handler.tsのcreateTask関数を参照
      code: lambda.Code.fromAsset(path.join(__dirname, '../app/'))
    });

    // RestAPI の定義
    const api = new apigateway.RestApi(this, "TodoApi");
    const taskCreateResource = api.root.addResource("task").addResource("create");
    taskCreateResource.addMethod('POST', new apigateway.LambdaIntegration(createTask));
  }
};
```
これをSLSと見比べると、記述が冗長になっただけでそこまでメリットを感じられないのですが、詳しく見ていきましょう。

上記のサンプルでは、SLSの場合と同じようにApiGatewayのRestAPI(※１)とLambdaFunctionのリソースを定義しています。`lambda.Function`や`apigateway.RestApi`はコンストラクト(※）と言い、newによりリソースを作成します。コンストラクトの第一引数にスコープ（上位のリソース）、第二引数にリソースの論理名、第三引数にコンストラクトオプションを渡すのはCDKライブラリのお作法です。コンストラクトのオプションや属性（attribute）に他のリソースを設定することで、CloudFormation上の`Fn::Ref`の解決が行われます。

全体の定義は、今回のアプリ全体を表すスタッククラス`TodoTaskStack`のコンストラクタ内で行います。`TodoTaskStack`のコンストラクタ自体が、`aws-cdk-lib.Stack`を拡張した独自コンストラクトの定義になっています。

CDKのコードは`cdk synth`コマンドによりCloudFormationテンプレートにローカルマシン上で変換(transpile)されます。Assetとしてローカルパスで参照されているアプリケーションソースフォルダは、デプロイ時にZipにまとめられ（※）S3にアップロードされます。変換されたテンプレートには、Assetのアップロード先のBucket/ObjectKeyが設定されています。このあたりの振る舞いは`sls package`とそっくりです。

※）AssertはZip化/S3へのアップロードの他に、DockerImageへのビルド/ECRへのPushをネイティブサポートしています。

`cdk deploy`コマンドを実行すると、実際に上記のスタックがAWSアカウント上にデプロイされます。この際の起点となるコードは以下のようになります。
```typescript
#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TodoTaskStack } from './todo-task-stack';
new TodoTaskStack(app, 'TodoTaskStack')
```
`cdk diff`により現在のデプロイ済みのスタックと、CDKコードの差分を確認できます。

※１）CloudFormationのapigatewayv2に対応するCDKの[HTTP APIのコンストラクト](https://constructs.dev/packages/@aws-cdk/aws-apigatewayv2-alpha/v/2.29.1-alpha.0?lang=typescript#http-api)は2022/06/28現在プレビュー状態ですので、上記ではStableなRestAPIでイメージを紹介しています。

＊２）コンストラクト
ここでのコンストラクトという表現は実装言語非依存の「リソース構築方法を隠蔽した概念」という意味と理解しています。コンストラクタという場合、例えばTypescriptでいうconstructor構文を指し、クラスをインスタンス化する際の処理を書く場所、もしくはそのメカニズムを指します。

### Local Stack + CDKLocal

（AWSアカウントが無くても）


### AWS SAM (Serverless Application Model)
[AWS SAM](https://aws.amazon.com/jp/serverless/sam/)は、Lambdaとイベントソースの定義を容易に記述するためのyamlベースのインフラモデル言語（SAM
テンプレート）、およびデプロイ支援ツール（`SAM CLI`）です。
HTTP API(Rest API), DB, SQS, Kinesisなどのイベントに紐づいた処理を簡潔に記述できます。SAMテンプレートの構造は、SLSの`events`定義に似ており、処理本体である`function`の定義を中心に、イベントトリガ(`events`)を紐づける書き方は、非常に直感的です。（ただしSLSの方が定義方法は洗練されているように感じます。）
- ApiGatewayのRestAPIに処理を紐づける場合、関数定義のeventとしてRestAPIのリソースやメソッドを書くだけで必要なAPI定義を完了できます。

CDKにおけるSAMは2022/06/28現在、CloudFormationと同じ記述レベルであるL1コンストラクタ（後述）のみ提供されています。

SAMテンプレートは、CloudFormationのTransformation機能を活用してスタック構築時にCloudFormationテンプレートに変換されます。
SAM CLIを使うと、RestAPIやHTTPApiにバインドされるサービスを簡単にローカルデプロイしたり、Lambdaを直接ローカルで起動することができます。

### Local Stack + CDK Local
ローカル実行中のfunctionデバッグについてです。個人的にはローカル実行中のデバッグは、避けられるなら避けたい開発手法ですが、やはり必要になる場合があります。（これはログ埋め込みで代替できるという話をしているわけではありません。実行中にブレークポイントを貼らないと問題の原因が特定できないことは望ましくなく、モジュール・関数に適切な事前条件・不変条件の検証（assertion）を設定したうえで、UTで十分に動作検証できる単位でモジュール化すべきという意味です。）
ですのでCDK/SAMでローカル実行中の、Lambdaランタイムのデバッグ方法を確認してみます。

（AWSアカウントが無くても）


---
How To Migrate:

serverlessのサンプルプロジェクトを使い、CDK/SAM 版に書き換えます。
以下の環境を前提とします。
- aws cli v2 が利用できること（`aws --version`）
- nodejs（10.13.0以上, npm 6以上）が利用できること(確認： `node --version`, `npm --version`)

1. [AWS CDKのセットアップ](https://aws.amazon.com/jp/getting-started/guides/setup-cdk/)から全ての必要な情報は得られます。
    - とりあえず試す場合はCDK CLIのインストールとSAM CLIのインストールをすれば、AWSアカウントが無くても最低限の動作確認できます。（もちろんアカウントが無ければdeployやdiffはできません。）
    ```
    # npm install -g aws-cdk
    $ cdk --version
    ```
1. AWS CDKに慣れる
    サブフォルダ内に[サンプルプロジェクトを作成](https://aws.amazon.com/jp/getting-started/guides/setup-cdk/module-three/)して、動作確認をしてみます。
    ```
    $ mkdir cdk-demo
    $ cd cdk-demo
    $ cdk init --language typescript
    Applying project template app for typescript
    ...
    Executing npm install...
    ✅ All done!

    $ npm run build
    ```
    CloudFormationテンプレート`cdk.out/CdkDemoStack.template.json`を含む、いくつかのファイルが生成されます。

1. AWS CDKとSAMの連携に慣れる
    サブフォルダ内に[SAMのサンプルプロジェクトを作成](https://docs.aws.amazon.com/ja_jp/serverless-application-model/latest/developerguide/serverless-cdk-getting-started.html)して、動作確認をしてみます。
    ```
    $ mkdir cdk-sam-example
    $ cd cdk-sam-example
    $ cdk init app --language typescript
    Applying project template app for typescript
    ...
    Executing npm install...
    ✅ All done!
    ```
    引き続きビルドを行ってみます。
    ```
    $ npm run build
    ```


---

## SLSとCDKの関係

SLS本体の設計思想としては、`serverless.yml`の定義をCloudFormationテンプレートに変換し、CloudFormationスタックとしてdeploy (create or update)することでインフラを構築します。この振る舞いに着目すればSLSはCloudFormationテンプレートを記述するためのDSLのようも見えます。
CDKもSAMも、CloudFormationリソースの定義の冗長性を回避し、サーバレスアプリケーション構築向けに使いやすい記述方法でインフラ定義を行うツール行う点で似ています。

しかし、SLSとCDK/SAMの根本的な違いは機能拡張の方式にあります。
SLSで機能拡張を行う場合、Pluginを使い、`serverless.yaml`でプラグインにパラメータを付与する形でPluginの振る舞いを変えます。プラグインは用途別に設計されていることが多く**適切なプラグインの選定さえ誤らなければ**`serverless.yaml`はインフラ定義の簡潔さを維持しつつ、記述レベルの統一などに絶大な効果があります。SLSにおいてプラグインは非常に重要な位置づけにあるが故に、プラグインの品質問題・管理にまつわる問題が無視できなくなります。プラグインを自社開発することはもちろん可能ですが、アプリケーション開発に集中したい場合にはフラストレーションとなります。

AWS CDKでは、全く別のアプローチをとります。インフラ定義を拡張したい場合は「どうぞあなたがプログラミングしてください」というスタンスです。クラウドリソースの最も単純な定義は`L1`コンストラクトと呼ばれ、ほぼ全ての最新CloudFormationリソースと完全に1対1に対応しています。`L2`コンストラクトは、サービス固有あるいは複数のサービスにまたがるインフラリソースをまとめた抽象度が高い定義方法ですが、内部的には`L1`定義への変換を行っているだけ、つまり`L1`コンストラクトのBuilderに相当するだけです。AWS公式のコンストラクトもあればコミュニティーベースのコンストラクトもあり、[ConstructHubで公開](https://constructs.dev/packages/@aws-cdk/aws-sam/v/1.160.0?lang=typescript)されています。社内専用の`L2`コンストラクトをライブラリとして作成・共有するのは容易です。

同じことがSLSでできないかというと、不可能ではありません。`serverless.yml`の一部を再利用可能な形で独立(例えば`common.yml`など）させて、メインとなる`serverless.yml`からインクルードする方法です。しかし外部化したファイル内の定義のパラメータ化などが危険なことは想像できると思います。はyamlというマークアップ言語を使って、定義内容（データ）の参照解決を行うことはできないので、記述時にミスに気づくことは困難です。デプロイして初めてミスに気づけます。外部化したリソース定義の汎用性は失われ再利用性も低くなります。SLSにおけるファイルの外部化は、モジュール性を高めるためというより、単に巨大な`serverless.yml`ファイルの見通しをよくするために用いられます。`serverless.ts`(typescript)化は、この問題を解決するための銀の弾丸、かもしれません。

SLSを使った場合でもCDKを使った場合でも、これらのツールにより出力されたCloudFormationテンプレートをエディタで直接編集したりデプロイ済みのスタックを、ツール以外の方法でUpdateすると、動作しないどころか致命的なエラーが発生し復旧不可能になる可能性が大きいです。ここでは生成されたCloudFormationテンプレートの中身がどうのこうのという議論はしませんが、CDKにより定義されたインフラは、全てCloudFormationTemplateに含まれているという点は重要です。つまりCDKの場合、スタックの更新に対する責務はCloudForamtionサービスが担います。一方SLSの場合はSLSとCloudFormationの共同作業になるケースがあります。


## 開発最前線
ローカル実行中のfunctionデバッグについてです。個人的にはローカル実行中のデバッグは、避けられるなら避けたい開発手法ですが、やはり必要になる場合があります。（これはログ埋め込みで代替できるという話をしているわけではありません。実行中にブレークポイントを貼らないと問題の原因が特定できないことは望ましくなく、モジュール・関数に適切な事前条件・不変条件の検証（assertion）を設定したうえで、UTで十分に動作検証できる単位でモジュール化すべきという意味です。）
ですのでCDK/SAMでローカル実行中の、Lambdaランタイムのデバッグ方法を確認してみます。






まとめ：
serverless framework も CDK/SAM の組み合わせも、サーバレスアプリケーションの記述という面においては、似たような側面がある。
ただしツールの特性として、serverlessの豊富な拡張機能を利用することで得られる利点と、拡張機能の管理そのものにかかるコスト・構成管理上のリスクがトレードオフの関係にある。CDKも非常に更新頻度の激しい（やく2週間に1度）ツールではあるものの、AWS公式であるため、最新版の品質は安定している。
そもそも CDK/SAM が serverless の代替案になるなど、1年前には想像ができなかった。（それぐらい CDK も SAM も最近やっと使えるようになったレベル。）
また、CDK が プログラマブルであることは利点ではあるが、インフラ構成レベルのものは「宣言的に定義として書く」ことが原則であり、CDKで動的定義ができることの価値については、テスタビリティの面において別の議論が必要になると思う。

したがって「IDEの補完機能が使える」という点では serverless - typescriptの組み合わせも十分に有効ですので

