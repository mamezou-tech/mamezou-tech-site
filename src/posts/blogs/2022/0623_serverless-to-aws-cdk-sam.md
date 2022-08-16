---
title: serverless から AWS CDK/SAM へ
author: yumeto-yamagishi
date: 2022-06-23
tags: [AWS, サーバーレス]
---

**[WIP]**

serverlessからAWS CDKへの構成変更を通して、それぞれのツールの良さ・課題とCDKのコンストラクトの効果的な使い方を解説します。0からCDKで構成する際の参考にもどうぞ。

## モチベーション
[serverless framework](https://www.serverless.com/) (以後、SLS) は、簡潔な記述でAWS Lambdaを中心としたサーバレスアプリケーションのインフラを記述できるオーケストレーションツールです。多くの[プラグイン](https://www.serverless.com/plugins)がコミュニティにより開発され、痒い所に手の届く拡張機能が直ぐに使えることが魅力です。

一方、運用開始後にプラグイン開発の停滞に伴うセキュリティ問題やプラグインの相互依存による更新の難しさに直面された方もいらっしゃると思います。このリスクを軽減するためにプラグインのフォーク・自社開発・独自拡張を行う判断をするかもしれません。しかしSLSのプラグイン開発をするには、SLSのライフサイクル・イベントフックを理解する必要があり、プラグインを利用する場合とは全く異なる知識が必要となります。開発したプラグインは、SLSのバージョンに合わせて維持管理が必要です。

これから新たなサーバレスアプリケーションを構築する際に、SLSのような記述力と、安定した品質の両方を手に入れてみたいと感じたなら、次のステップにお進みください。AWS CDK/SAMの組み合わせがSLSの代替となり得ることをご紹介いたします。

### お断り

- 既にSLSで商用運用しているシステムのCDK/SAMへの移行については、ステートフルリソース（データベースやS3など）の移行に伴う難しさがあり、あまりお勧めいたしません。SLSのバージョンアップ・typescript化・serverless-compose機能を使い、過剰なプラグイン依存からの脱却を含めてSLSのメンテナンス性向上に努めるほうが幸せになれるでしょう。
- 本記事で取り上げているCDK/SAMはAWS固有のサービスであり、SLSで他のクラウドベンダに依存している場合は適用できません。

### 対象読者

本記事の移行ステップの章は、SLS、TypeScript (nodejs/npm)およびAWS CloudFormationを使ったインフラ・サーバレスアプリケーション構築のご経験がある方を対象としております。
- SLSの（特にプライグインの）セキュリティ問題・パッチ適用で悩んでいる方
- サーバレスアプリケーションのローカル開発が必要な方。
- AWS CDK が”熱いらしい”と聞いてはいるが、何がどう熱いのか気になる方

## ツールの概要

最初にSLSによる構成定義の例を見てみましょう。
```yaml
# serverless.yaml による HTTP APIの定義
functions:
  createTask:
    handler: handler.createTask # handler.jsファイルのexportされたcreateTask関数を参照
    events:
      - http: # ApiGateway HTTP APIを表すイベントソース
          method: "POST"
          path: "/task/create"
```
非常にシンプルです。Lambda関数定義 -> ApiGateway HTTPイベントの順で定義することで、ApiGatewayで提供されるHTTP Api機能にLambda関数を紐づけています。2020年から`yaml`ファイルに加えて[`serverless.ts`で構成定義ができるようになりました](https://github.com/serverless/typescript)ので、IDEによる自動補完の恩恵も受けられます。

### AWS CDK (Cloud Development Kit)の概要

[AWS CDK](https://aws.amazon.com/jp/cdk/)は、極論するとプログラミング言語を使用して記述できるCloudFormationテンプレート開発ツールです。CDKを使うとプログラミング言語とIDEの言語サポート機能をフル活用して、自動補完やドキュメント参照をしながらインフラ定義を記述できます。

先ほどのSLSによる定義をCDKで書き直すと次のようになります。
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
SLSの場合と同じようにApiGatewayのRestAPI(※１)とLambdaFunctionのリソースを定義しています。`lambda.Function`や`apigateway.RestApi`はコンストラクト(Construct ※）と言い、newによりリソースを作成します。コンストラクトの第一引数にスコープ（上位のリソース）、第二引数にリソースの論理名、第三引数にコンストラクトオプションを渡すのはCDKライブラリのお作法です。
`api.root`に`/task/create`のRestAPI Resourceおよび`POST`Methodを追加し、そこに`createTask`関数を紐づけています。コンストラクトオプションや属性（attribute）に他のリソースを設定することで、CloudFormation上の`Fn::Ref`による紐づけが行われます。

これらの定義は、アプリ全体を表すスタッククラス`TodoTaskStack`のコンストラクタ内で行います。`TodoTaskStack`のコンストラクタ自体が、`aws-cdk-lib.Stack`を拡張した独自コンストラクトの定義になっています。

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

### Local Stack + CDK Local によるローカル開発
[LocalStack](https://github.com/localstack/localstack)は、単一のContainer上で実行可能なクラウドサービスのエミュレータです。[CDK Local](https://github.com/localstack/aws-cdk-local)はLocalStackのサブプロジェクトで、CDKのデプロイ先をLocalStackに変えるためのCDK CLIのラッパーツールです。
これらを組み合わせることで、アプリケーションを開発マシン上やCI環境内にデプロイし、実行することができます。ローカルなのでAWSアカウントは不要です。

開発マシン上でエンドツーエンドの動作確認ができることは開発効率を高める上で重要です。とくに1つの開発用AWSアカウントを複数人の開発者で共有している場合など、次に紹介するようなセットアップ作業の手間を差し引いても価値があります。

---
## Serverless から CDKへの移行

ここでは、SLSでインフラ定義された[serverless-example-typescript アプリケーション](https://github.com/mamezou-tech/serverless-example-typescript)を、CDKに置き換え、ローカル環境でAPIの動作確認を可能にするまでを紹介します。

移行前のフォルダ構成は次の通りです。
```sh
serverless-example-typescript
├── app            <--- アプリケーションの実装
│   ├── actions
│   ├── ...
│   └── utils
├── resources
│   ├── cloudwatch-alarms.ts <--- アラーム定義
│   ├── dynamodb-tables.ts   <--- DynamoDBテーブル定義
│   └── functions.ts         <--- ApiGatewayの定義、handlerへのマップ
├── handler.ts    <--- Lambdaのハンドラー関数をexport
├── package-lock.json
├── package.json
├── serverless.ts <--- SLSの定義
└── tsconfig.json
```
- このアプリはApiGatewayでHttpApiを公開し、DynamoDBにデータを保持します。
- 監視のためにCloudWatchダッシュボードとCloudWatch Alarmを設定します。
- `serverless.yaml`ではなく`serverless.ts`で定義しています。


#### 開発環境
- aws cli v2 が利用できること（確認: `aws --version`）
- nodejs（10.13.0以上, npm 6以上）が利用できること(確認： `node --version`, `npm --version`)
- docker/docker-composeが利用可能なこと. (LocalStackを動かすためです。)

#### インストール
1.  CDK / CDK Localのインストール。
    [AWS CDKのセットアップ](https://aws.amazon.com/jp/getting-started/guides/setup-cdk/)から全ての必要な情報は得られます。
    ```
    # npm install -g aws-cdk aws-cdk-local
    $ cdk --version
    2.29.1 (build c42e961)
    $ cdklocal --version
    2.29.1 (build c42e961)
    ```

1.  LocalStackのインストール。
    [docker-composeのインストール](http://docs.docker.jp/compose/install.html)後、プロジェクトフォルダ直下に[`docker-compose.yml`](https://github.com/mamezou-tech/serverless-example-typescript/blob/main/serverless.ts)を配置します。


1.  AWS CDKに慣れる
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

### AWS SAM (Serverless Application Model)
[AWS SAM](https://aws.amazon.com/jp/serverless/sam/)は、Lambdaとイベントソースの定義を容易に記述するためのyamlベースのインフラモデル言語（SAM
テンプレート）、およびデプロイ支援ツール（`SAM CLI`）です。
HTTP API(Rest API), DB, SQS, Kinesisなどのイベントに紐づいた処理を簡潔に記述できます。SAMテンプレートの構造は、SLSの`events`定義に似ており、処理本体である`function`の定義を中心に、イベントトリガ(`events`)を紐づける書き方は、非常に直感的です。（ただしSLSの方が定義方法は洗練されているように感じます。）
- ApiGatewayのRestAPIに処理を紐づける場合、関数定義のeventとしてRestAPIのリソースやメソッドを書くだけで必要なAPI定義を完了できます。

CDKにおけるSAMは2022/06/28現在、CloudFormationと同じ記述レベルであるL1コンストラクタ（後述）のみ提供されています。

SAMテンプレートは、CloudFormationのTransformation機能を活用してスタック構築時にCloudFormationテンプレートに変換されます。
SAM CLIを使うと、RestAPIやHTTPApiにバインドされるサービスを簡単にローカルデプロイしたり、Lambdaを直接ローカルで起動することができます。








まとめ：
serverless framework も CDK/SAM の組み合わせも、サーバレスアプリケーションの記述という面においては、似たような側面がある。
ただしツールの特性として、serverlessの拡張機能はプラグインを利用することで得られるのに対し、CDKでは定義の共通化や機能追加をユーザが「プログラミング」することで得られる。SLSでは拡張機能の管理そのものにかかるコスト・構成管理上のリスクがある一方で、適切に拡張機能を選定すればが少ない記述・統一感のある定義が可能なのでバランスが大事である。
CDKも非常に更新頻度の激しい（やく2週間に1度）ツールではあるものの、AWS公式のコンストラクトを中心に利用している限り、ある程度の品質問題はクリアできる。ただし、最新版への追従が必要なことはSLSの変わらない。

そもそも CDK/SAM が serverless の代替案になるなど、数年前には想像ができなかった。（執筆時点でもApiGatewayV2.HttpApiのL2コンストラクトが存在していないなど。。。）


また、CDK が プログラマブルであることは利点ではあるが、インフラ構成レベルのものは「宣言的に定義として書く」ことが原則であり、CDKで動的定義ができることの価値については、テスタビリティの面において別の議論が必要になると思う。

したがって「IDEの補完機能が使える」という点では serverless - typescriptの組み合わせも十分に有効ですので

