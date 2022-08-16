---
title: serverless framework から AWS CDK/SAM へ
author: yumeto-yamagishi
date: 2022-06-23
tags: [AWS, サーバーレス]
---

[WIP]

お断り
すでにserverless framework（以後、SLS）で商用運用しているサービスについては、SLSのバージョンアップ・typescript化・serverless-compose機能を使ってメンテナンス性の向上に努められる方が幸せになれます。これは断言できます。商用デプロイ後のSLSをCDKに移行したくてもインフラストラクチャレベルで埋められない溝があります。
また、本記事で取り上げているCDK/SAMはAWS固有のサービスであり、SLSで他のクラウドベンダに依存している場合は適用できません。


モチベーション：
SLSは、簡潔な記述でLambdaを中心としたサーバレスアプリケーションのインフラを記述できるオーケストレーションツールです。多くのプラグインがコミュニティにより開発され、痒い所に手の届く拡張機能が直ぐに使えることが魅力です。一方でプラグインの品質面ではばらつきがあり、プラグイン開発の停滞やセキュリティリスクがあります。（TODO：　品質がばらついていることを示す）プラグインの恩恵を得るにはこのリスクを受け入れ、サービスオーナーがプラグイン管理を行う必要があります。
規模の大きなサービスにおいては、サービス要件に適合させるため、あるいは上記のリスクヘッジのためにアプリケーション開発と合わせてプラグイン開発を行う判断をするかもしれません。しかし、SLSプラグイン開発のためには、SLSのプラグイン用の拡張ポイント・イベントフックについて理解する必要があり、SLS・SLSプラグインの利用とは全く異なる知識が必要となります。アプリケーション本体と同じように、プラグインもSLSのバージョンに合わせてメンテナンスが必要です。
これから新たなサーバレスアプリケーションを構築する際に、serverless frameworkのような記述力と、安定した品質の両方を手に入れてみたいと感じたなら、次のステップにお進みください。
ただし、タダではありません。AWS CDKを初めて触る場合は学習コストはかかります。


対象読者：
serverless framework で AWS上にインフラ・サービスを商用展開している方。
ローカル開発 ローカルUTがPassしないと共有のAWS環境にデプロイしてはいけない

serverless framework の（特にプライグインの）セキュリティ問題・パッチ適用で悩んでいる方。
serverless framework の yaml ファイルの記述方法を調べるのが大変だ、、、と感じられている方。
AWS CDK が”熱いらしい”と聞いてはいるが、何がどう熱いのか気になる方。

serverless.yml ファイルを typescriptの力を借りて型安全に書きたい => 

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

sls と CDKの関係
SLS本体の設計思想としては、AWS上にデプロイするためにcloudformationテンプレートに変換され、それがcreate or update されます。
そういう意味ではCloudFormationテンプレートを記述するためのDSLという見方もできます。

AWS CDKは、極論するとプログラミング言語を使用して記述できるCloudFormationテンプレート開発ツールです。CDKを使うとプログラミング言語の型チェック機能をフル活用して、複数テンプレート間のリソース依存関係の解決、ネストしたスタックのためのテンプレート作成とデプロイが行えます。CDK CLIの`cdk syntth`コマンドによりCDKコードはCloudFormationテンプレートにローカルマシン上で変換(transpile)されます。この際Lambdaの実装コードもアセットとしてパッケージングして、まとめてデプロイ(`cdk deploy`)可能な点もSLSと同じです。`cdk diff`などデプロイ済みのスタックとの差分をチェックする機能もあります。

これらの点においては、いずれもCloudFormationテンプレートの記述上の制約を回避し、スタック間の入出力（リソース参照）の解決を行い、抽象度の高い記述を行う点で似ています。

しかし、根本的な違いは機能拡張の方式にあります。Slsの場合はserverlessインスタンスが提供するイベントフックを利用して独自機能を実装したプラグインを提供します。多くのプラグインはcustom属性や既存の定義を読み取り、独自のインフラリソースを作成したり、既存のプラグインの振る舞いを変えます。非常に柔軟なメカニズムである一方、プラグイン間に依存関係が発生する場合がります。またPlugin開発においてはServerlessのフレームワークの内部の仕組みを知る必要があるため、利用するだけのスキルセットではプラグイン開発を行うことができません。プラグインによっては必ずしもCloudFormationリソースを経由しないカスタマイズが可能で、プライグイン内部で直接HTTP API等でリソースを操作するものもあります。これはもちろん利点にもなり得ますが欠点にもなり得ます。
AWS CDKでは、「コンストラクト」という単位（ほとんどがプログラミング言語依存のコンストラクタを指している）でクラウドリソースを定義します。このコンストラクトにはレベルがあり`L1`はjsonやyamlで定義するCloudFormationテンプレートと完全に1対1のプロパティによる定義です。`L2`レベルではより抽象度が高い方法でクラウドリソースを定義できます。CloudFormationでは必須のプロパティをオプションにしたり複数の種類のリソースをまとめたりできますが、内容は`L1`定義への変換や最も低レベルのCloudFormationプロパティへの変換を行っているにすぎず、簡単に作成することができます。AWS公式のコンストラクトもあればコミュニティーベースのコンストラクトもあり、[ConstructHubで公開](https://constructs.dev/packages/@aws-cdk/aws-sam/v/1.160.0?lang=typescript)されています。アプリケーション専用のコンストラクトを作成し、社内で共有したりしても構いません。
SLSを使った場合でもCDKを使った場合でも、これらのツールにより出力されたCloudFormationテンプレートをエディタで直接編集したりデプロイ済みのスタックを、ツール以外の方法でUpdateすると、動作しないどころか致命的なエラーが発生し復旧不可能になる可能性が大きいです。ここでは生成されたCloudFormationテンプレートの中身がどうのこうのという議論はしませんが、CDKにより定義されたインフラは、全てCloudFormationTemplateに含まれているという点は重要です。つまりCDKの場合、スタックの更新に対する責務はCloudForamtionサービスが担います。一方SLSの場合はSLSとCloudFormationの共同作業になるケースがあります。

SLSとSAMの関係
SLSの魅力の1つは、サーバレスアプリケーションの記述容易性およびローカル環境におけるテスタビリティにあると思います。
処理本体である`function`の定義を中心に、イベントトリガ(`events`)を紐づける書き方は、非常に直感的です。ApiGatewayのRestAPIに処理を紐づける場合、関数定義のeventとしてRestAPIのリソースやメソッドを書くだけで必要なAPI定義を完了できます。
いっぽうCloudFormationで同じようなことを定義する場合、まずentry_pointとなるサービス（例えばApiGateway:RestAPI)を定義し、その構成要素としてLambda::FunctionをListener（handler)として紐づける形になりますが、RestAPIにはResource, Method, functionの順で構成する必要があります。
ことこと自体は仕方ないのですが、その記述においてボイルプレート（無駄な重複記述）が多く発生します。
SAMはエントリサービス（イベントソース）からhandler(Lambda)という定義順序を逆転させて、ちょうどSLSのようにhandlerにイベントソースを紐づける書き方で、CloudFormationテンプレートを書けるようにした、AWS公式のサポートツール一式です。
（少し深堀：　SAMでは、cloudformationのtransformation機能を使って、SAM固有のリソース記述方式でCloudFormationテンプレートに変換しています。）
また、SAM CLIを使うと、RestAPIやHTTPApiにバインドされるサービスを簡単にローカルデプロイしたり、Lambdaを直接ローカルで起動することができます。


開発最前線：
ローカル実行中のfunctionデバッグについてです。個人的にはローカル実行中のデバッグは、避けられるなら避けたい開発手法ですが、やはり必要になる場合があります。（これはログ埋め込みで代替できるという話をしているわけではありません。実行中にブレークポイントを貼らないと問題の原因が特定できないことは望ましくなく、モジュール・関数に適切な事前条件・不変条件の検証（assertion）を設定したうえで、UTで十分に動作検証できる単位でモジュール化すべきという意味です。）
ですのでCDK/SAMでローカル実行中の、Lambdaランタイムのデバッグ方法を確認してみます。






まとめ：
serverless framework も CDK/SAM の組み合わせも、サーバレスアプリケーションの記述という面においては、似たような側面がある。
ただしツールの特性として、serverlessの豊富な拡張機能を利用することで得られる利点と、拡張機能の管理そのものにかかるコスト・構成管理上のリスクがトレードオフの関係にある。CDKも非常に更新頻度の激しい（やく2週間に1度）ツールではあるものの、AWS公式であるため、最新版の品質は安定している。
そもそも CDK/SAM が serverless の代替案になるなど、1年前には想像ができなかった。（それぐらい CDK も SAM も最近やっと使えるようになったレベル。）
また、CDK が プログラマブルであることは利点ではあるが、インフラ構成レベルのものは「宣言的に定義として書く」ことが原則であり、CDKで動的定義ができることの価値については、テスタビリティの面において別の議論が必要になると思う。

したがって「IDEの補完機能が使える」という点では serverless - typescriptの組み合わせも十分に有効ですので

