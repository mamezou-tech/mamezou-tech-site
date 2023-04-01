---
title: Contract TestをGitlab CIのパイプラインに組み込む
author: shinichiro-iwaki
date: 2023-04-03
tags: [テスト,CI/CD]
---

[前回の記事](/blogs/2023/03/09/contract-test-multilang/)では異なる採用技術の間でもContract Testによって結合性が確認できることを紹介しました。

ここまで便利に使えるということは、パイプラインに組み込んで「デプロイしても問題が起きないバージョン」のアプリケーションをデプロイするように制御してみたくなると思います。

そこで今回はPact cliツールの簡単な説明とあわせ、CI/CDのパイプラインへのContract Testの組み込みを紹介します。

## 前回までのおさらい

前回までのサンプルアプリのAPI仕様を簡単にまとめると以下のようになります。  

  | Version | API | 補足 |
  | ---- | ---- | ---- |
  | 1.0.1 | /greet |  |
  | 1.1.0 | /greet/{lang} | 1.0のConsumerと下位互換性がなく1.1のConsumerと互換なテスト用バージョン |
  | 1.1.1～ | /greet | 1.0のConsumerと下位互換性を持ち、1.1のConsumerとも互換。 <br> パッチバージョンはサンプル都合で変化 |
  |  | /greet/{lang} |  |

通常の開発シナリオではAPI V1.0のフロントエンド/バックエンドが稼働している状態からの変更になりますので、V1.1.0のAPIへの変更は(下位互換を損なうため)無停止でのデプロイが難しいことは[以前の記事](/blogs/2022/12/09/contract-test-usecase/)でお伝えしたとおりです。  
Contract Testを活用しつつ、無停止でデプロイするための流れは以下のようになります。  

* Consumer/ProviderのそれぞれV1.0がデプロイされ、稼働している  
* Consumer側の機能追加により、新しいContract(V1.1)が生成される  
  * この時点でConsumerV1.1は稼働中のデプロイ済みのProvider(V1.0)と組み合わせ不能なことがContractを確認することで分かる  
* Consumer側のContractV1.1に対応するようにProviderにも機能追加を行い、Contract(V1.1)を検証する  
  * ProviderV1.1は稼働中のConsumerV1.0と互換性を保つことで、デプロイ可能なことが分かる  
* ProviderV1.1をデプロイし、ConsumerV1.0と組み合わせて稼働させる  
  * デプロイ済みのProviderがV1.1になることで、ConsumerのV1.1はデプロイ可能になる  
* ConsumerV1.1をデプロイし、ProviderV1.1と組み合わせて稼働させる  

この流れを人の作業で実現してもいいのですが、せっかくビルド/デプロイパイプラインを組んでいる[^1]のであればわざわざ人の判断を挟まずにデプロイ可否を判定してしまいたいですよね。  

[^1]:　と、煽ってみましたが、パイプラインはこれから組みたいと思ってるんだよね と言う方は「フーンこんなことも出来るんだ～」とパイプラインを構築するモチベーションにして頂ければと。  

この記事のコードサンプルは、[Gitlab リポジトリ](https://gitlab.com/shinichiro-iwaki/testexample/) にありますので、興味がある方はあわせてご利用下さい。

## Pact-Broker CLIツールの動作
Pact-BrokerにPactを登録する際には(ソースの)ブランチ名、(デプロイした)環境名、タグ名の情報が付与可能なことは[以前の記事](/blogs/2022/12/03/contract-test-with-pact/)で簡単に紹介しました。  

これらの付加情報は、以下の手段で操作が可能です。  

  | 付加情報 | 操作手段 | 備考 |
  | ---- | ---- | ---- |
  | ブランチ名/タグ名 | 登録時付加 |  |
  |  | cliツールでの操作 | Pactのバージョンを指定して`create-or-update-version`など |
  | 環境名 | cliツールでの操作 | Pactのバージョンを指定して`record-deployment`など |

例えばAPIバージョン1.0.1のConsumer/Providerがテスト環境にデプロイ済みの状況を仮定すると、Pact-Brokerのcliツール[^2]を利用すると以下のコマンドでデプロイ先の「環境」の情報を付加できます。  

[^2]:　ここで紹介した以外にも様々なコマンド/オプションがありますので興味がある方は[公式ガイド](https://docs.pact.io/pact_broker/client_cli/readme)等を参照ください。  

```shell
pact-broker record-deployment --pacticipant GreetProvider --version 1.0.1 --environment test --broker-base-url=<登録先のPact-BrokerURL>
pact-broker record-deployment --pacticipant Greet_Front --version 1.0.1 --environment test --broker-base-url=<登録先のPact-BrokerURL>
```

![デプロイ先を付加したPact](/img/blogs/2023/0403_pact-broker-01.jpg)

付与された情報を利用することで、その情報を持つPactに対しての整合性のチェック(≒デプロイの可否)がcliから確認できます。  

```shell
pact-broker can-i-deploy --pacticipant GreetProvider --version 1.1.0 --to-environment test --broker-base-url=<登録先のPact-BrokerURL>
pact-broker can-i-deploy --pacticipant GreetProvider --version 1.1.1 --to-environment test --broker-base-url=<登録先のPact-BrokerURL>
```

上記のコマンドで、V1.1.0のProviderはデプロイ済みのConsumerV1.0.1と互換性が無いためデプロイ不可だが、V1.1.1は互換性を有するためデプロイ可能なことが確認できるかと思います。  

![Providerデプロイ可否](/img/blogs/2023/0403_pact-broker-02.jpg)

その後、V1.1.1のConsumerはV1.0.1のProviderとは互換性が無いのですが、V1.1.1のProviderをデプロイした後はデプロイが可能となります。  

```shell
pact-broker can-i-deploy --pacticipant Greet_Front --version 1.1.1 --to-environment test --broker-base-url=<登録先のPact-BrokerURL>
pact-broker record-deployment --pacticipant GreetProvider --version 1.1.1 --environment test --broker-base-url=<登録先のPact-BrokerURL>
pact-broker can-i-deploy --pacticipant Greet_Front --version 1.1.1 --to-environment test --broker-base-url=<登録先のPact-BrokerURL>
```

![Consumerデプロイ可否](/img/blogs/2023/0403_pact-broker-03.jpg)

## CIに組み込むための準備
### Pact-Brokerサーバ
[cliツール](#pact-broker-cliツールの動作)で紹介した処理を組み込むことで、パイプラインの中でデプロイ可否を判定して処理を制御することが可能になります。  

今回はGitlab CIを利用してパイプラインを実装していきますが、パイプラインのジョブ中でアクセス可能なPact-Brokerのサーバが必要です。  

自分で構築して利用しても良いのですが、Pact-Brokerの機能を提供しているPactFlow[^3]サービスなどを利用することもできます。  

[^3]:　通常のPact-Broker機能相当のConsumer DrivenなContract Testだけでなく、OpenAPIスキーマなどを入力としたPactFlowに固有の[Bi-Directinal](https://pactflow.io/bi-directional-contract-testing/)なContract Testの機能提供もありますがここでは省略しています。

執筆時点ではアカウントを作成すれば5Contractまで無償利用可能な[Starterプラン](https://pactflow.io/pricing/)が存在していますので、そちらを利用することにします。  

アカウントを作成すると固有のアクセスポイントが割り当てられますので、設定画面からアクセスに必要となるトークンを確認しておきます。  

![PactFlowトークン](/img/blogs/2023/0403_pactflow-token.jpg)

### Consumer側の設定変更
Consumer側のContract Testは、テストの結果出力されるPactファイルをPact Brokerに公開し、デプロイ前に可否を検証する流れになります。  

Pactファイルの公開は(package.jsonに定義したscriptで)pact-brokerのcliツールを利用して実現していますので、このアクセス先を変更する必要があります。pact-broker-cliツールがpact-brokerにアクセスするための情報はオプションでの指定のみでなく[環境変数から参照させることも可能](https://docs.pact.io/pact_broker/client_cli/readme#usage---cli)です。パイプライン中で実行時にしていすることを想定し、scriptから`consumer-app-version`と`broker-base-url`の指定を除外しておきます。  

```json
{
  "name": "front",
  "version": "1.1.2",
  "scripts": {
    "pact:publish": "pact-broker publish ./pact/pacts --auto-detect-version-properties"
    ・・・
  },
  ・・・
}
```

この変更に伴い、開発端末からpact:publishを実行する場合は環境変数`PACT_BROKER_BASE_URL`(PactFlowを利用する場合は認証情報としてPACT_BROKER_TOKENも)の設定が必要となります。  

```shell
export PACT_BROKER_BASE_URL=<pact broker url>
export PACT_BROKER_TOKEN=<your token>
```

### Provider側の設定変更
Provider側のContract Testは、Pact Brokerに公開されているPactを入力として提供するAPIの振舞いを検証し、結果をPact Brokerに登録する流れで実施されます。  

APIの振舞いを検証するテストコードでPact Brokerの接続先を設定していますので、今後の変更も見据えて環境変数経由で接続先を指定するように変更します。  

```java
@WebMvcTest
@Provider("GreetProvider") 
@PactBroker(scheme = "https", host = "${PACT_BROKER_HOST}", authentication = @PactBrokerAuth(token = "${PACT_BROKER_TOKEN}"))
public class GreetContractTest {
     ・・・・
}
```

また、provider側のpactバージョンや、検証対象とするconsumerの条件[^4]などの情報はJVMのプロパティを通じて設定可能ですのでgradleのタスク定義で参照設定を行い、gradleのプロパティなどを介して[^5]外部から変更できるように設定しておきます。  

[^4]:　[Consumer Version Selector](https://docs.pact.io/implementation_guides/jvm/provider/junit5#selecting-the-pacts-to-verify-with-consumer-version-selectors-4312)を設定することでProviderのテスト時に対象とするConsumerの条件を設定できます。サンプルではCI中に適宜条件を変更することを考慮してraw Jsonでの指定します。

[^5]:　`gradle.properties`で設定した値はコマンドラインオプションや環境変数`ORG_GRADLE_PROJECT_<プロパティ名>`などで上書きが可能です。とはいえGitのブランチ名をgradleのプロパティに持たせるのは筋がよろしくないので、サンプルではブランチ名だけはシステムの環境変数から取得するようにしました。  

```groovy
tasks.named('test') {
	useJUnitPlatform()

	systemProperty("pact.provider.version", api_version)
	systemProperty("pactbroker.consumerversionselectors.rawjson", PACT_BROKER_CONSUMER_SELECTOR)
  systemProperty("pact.verifier.publishResults", PACT_BROKER_PUBLISH_VERIFICATION_RESULTS)
	systemProperty("pact.provider.branch", System.getenv("GIT_BRANCH") == null ? "" : System.getenv("GIT_BRANCH"))
}
```

```shell
PACT_BROKER_PUBLISH_VERIFICATION_RESULTS=false
PACT_BROKER_CONSUMER_SELECTOR=[{\\\"deployedOrReleased\\\":true}]
```

## Gitlab CIでのパイプライン作成
Gitlabはyaml形式でジョブを定義することでCIやCDのパイプラインを実行する機能を提供[^6]しています。  

[^6]:　Gitlabを利用しているのは純然たる筆者の好みです。一昔前にワンストップで必要な要素を含むプラットフォームに心を射貫かれたまま今に至っていますが、他のサービス/ツールを否定するつもりは一切ありません。

詳細な書式などの説明は省略しますが、実行したい処理を「ジョブ」の単位で定義し、前後関係(stageやdependency)や実行条件(rule)などを定めることで定義に従ったパイプラインが生成されます。  

アプリケーションの開発は分岐したブランチ上で行い、開発終了したものをマージしてデプロイ候補とするブランチ運用を想定すると、以下イメージのようなパイプラインが設計できます。  

 1. ConsumerのContract変更時に新しいバージョンのPactを登録する  
 1. 登録されたPactはProvider側でテストされ、Contract Test結果が登録される  
 1. Consumer側はProviderのテスト結果を参照してデプロイ可否を判定する(通例、Consumer側の変更が先行するのでこの時点ではデプロイ不可)  
 1. Consumer(のリリース候補)に対してContract Testが成功するようにProviderを変更する  
 1. Provider側はテスト成功する状態(=デプロイ済みのConsumer/デプロイ候補のConsumerの両者と互換性を持つ)でデプロイを行い、Pactのデプロイ情報を更新する  
 1. Consumer側はProviderのテスト結果を参照してデプロイ可否を判定する(デプロイ済みのPactが更新されているのでデプロイ可能になる)  
 1. Consumer側はデプロイを行い、Pactのデプロイ情報を更新する  

![パイプラインのイメージ](/img/blogs/2023/0403-pipeline.drawio.svg)

### Gitlab CIの設定
Contract Testを組み込んだパイプラインとしては、「アプリケーションのビルド/テスト」、「Pactによるデプロイ可否の検証」、「デプロイ処理/Pactの情報更新」の順に`build`、`verify`、`deploy`の各stageを定義[^7]します。各ステージには以下に説明する内容のジョブを追加していきます。  

[^7]:　サンプルコードではそれ以外に「APIライブラリのビルド/デプロイ」を行うためのstageとして`prebuild`も追加しています。  

#### PactFlowを利用するための設定  
Pact Brokerの接続情報については環境変数から値を取得するように設定を入れていますので、Gitlab CIで利用される環境変数を設定します。  
パイプラインの設定である`.gitlab-ci.yml`に記載しても良いのですが、アクセストークンの情報が流出するのはリスクですのでGitlabの機能を利用してプロジェクトのCI/CD変数に必要な環境変数を設定します。  
ここで設定した値はパイプラインの中で環境変数として展開され、各ジョブ中で参照されます。アクセストークンなどのセキュア情報は変数にマスク設定をしておくことで、実行ログ上などで値がマスクされます。  
![環境変数設定](/img/blogs/2023/0403-gitlab-env.jpg)  

#### Consumer側のジョブ定義  
Consumer側を変更するMerge Requestの発生時にContract Testを実行し、Pactを公開するジョブを定義します。  

Contractのバージョン情報は`package.json`に定義されているAPIのバージョン情報から取得します。PactFlowのURLとTokenの情報は[前述](#pactflowを利用するための設定)のとおりGitlabの環境変数定義から反映されます。  

また、変更がマージされた際のパイプラインでは、マージされた内容でのデプロイ可否を検証し、可能であればデプロイを実施します。(といっても実際のデプロイ先は準備できていないため、下記サンプルはデプロイ処理が動いた想定でPactの環境情報を更新するだけの内容です)  

```yaml
frontend-build-and-test:
  stage: build
  image: node:18
  script: 
    - cd front
    - echo "Contract Test用途なのでビルドは省略してテストのみ実行"
    - yarn jest
    - api_ver=`cat package.json | grep @shinichiro-iwaki | sed -r 's/.*"@shinichiro-iwaki\/greeter-api".*"(.*)",?/\1/'`
    - pact_option="--consumer-app-version=$api_ver"
    - yarn pact:publish $pact_option 
  rules:
    - if: '$CI_PIPELINE_SOURCE == "trigger"'
      when: never
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH || $CI_MERGE_REQUEST_IID
      changes:
        - front/*
        - front/**/*

frontend-verify:
  stage: verify
  image: pactfoundation/pact-cli:latest
  dependencies:
    - "frontend-build-and-test"
  script: 
    - cd front
    - api_ver=`cat package.json | grep @shinichiro-iwaki | sed -r 's/.*"@shinichiro-iwaki\/greeter-api".*"(.*)",?/\1/'`
    - echo "PactFlowの登録済み情報から、環境を指定してデプロイ可否を問い合わせる"
    - pact-broker can-i-deploy --pacticipant=Greet_Front --version=$api_ver --to-environment=test
  rules:
    - if: '$CI_PIPELINE_SOURCE == "trigger"'
      when: never
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      changes:
        - front/*
        - front/**/*

frontend-deploy:
  stage: deploy
  image: pactfoundation/pact-cli:latest
  dependencies:
    - "frontend-verify"
  before_script: 
    - cd front
    - api_ver=`cat package.json | grep @shinichiro-iwaki | sed -r 's/.*"@shinichiro-iwaki\/greeter-api".*"(.*)",?/\1/'`
    - echo "デプロイ処理が済んだらPactFlowの環境情報を更新する。デモ用途のためデプロイ処理は省略"
    - pact-broker record-deployment --environment=test --pacticipant=Greet_Front --version=$api_ver
  rules:
     - if: '$CI_PIPELINE_SOURCE == "trigger"'
      when: never
   - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      changes:
        - front/*
        - front/**/*
```

#### Provider側のジョブ定義  
Pactの更新時にContract Testを実行し、検証結果を反映するジョブを定義します。Contract TestはProviderの変更時にも実施されるため、実行条件は後続で説明する[トリガー](#gitlabへのジョブトリガーの追加)とProvider側の変更の両者を含むようにしています。  

Provider側のContract Testの設定はgradleプロパティを介して設定できるように作成していますので、`ORG_GRADLE_PROJECT_xxx`の環境変数でパイプライン向けの設定を上書きします。  

変更がマージされた際のパイプライン[^8]ではConsumerと同様にデプロイ可否の検証からデプロイまでを実施するようにします。  

[^8]:　通常はMerge Requestに対してもパイプラインを設定するかと思いますが、本稿の内容から逸れるためここでは割愛しています。  

```yaml
backend-build-and-test:
  stage: build
  image: gradle:7.6-jdk11
  script: 
    - echo "Contract Test用途なのでビルドは省略してテストのみ実行"
    - cd back
    - chmod +x gradlew
    - ./gradlew test
  variables:
    ORG_GRADLE_PROJECT_PACT_BROKER_PUBLISH_VERIFICATION_RESULTS: 'true'
    ORG_GRADLE_PROJECT_PACT_BROKER_CONSUMER_SELECTOR: '[{"branch":"main"}]'
  rules:
    - if: '$CI_PIPELINE_SOURCE == "trigger"'
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      changes:
        - back/*
        - back/**/*

backend-verify:
  stage: verify
  image: pactfoundation/pact-cli:latest
  dependencies:
    - "backend-build-and-test"
  script: 
    - cd back
    - api_ver=`cat build.gradle | grep ext.api_version | sed -r 's/^.*ext.api_version.*([0-9]+\.[0-9]+\.[0-9]+).*/\1/g'`
    - echo "PactFlowの登録済み情報から、環境を指定してデプロイ可否を問い合わせる"
    - pact-broker can-i-deploy --pacticipant=GreetProvider --version=$api_ver --to-environment=test
  rules:
    - if: '$CI_PIPELINE_SOURCE == "trigger"'
      when: never
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      changes:
        - back/*
        - back/**/*

backend-deploy:
  stage: deploy
  image: pactfoundation/pact-cli:latest
  dependencies:
    - "backend-verify"
  script: 
    - cd back
    - api_ver=`cat build.gradle | grep ext.api_version | sed -r 's/^.*ext.api_version.*([0-9]+\.[0-9]+\.[0-9]+).*/\1/g'`
    - echo "デプロイ処理が済んだらPactFlowの環境情報を更新する。デモ用途のためデプロイ処理は省略"
    - pact-broker record-deployment --environment=test --pacticipant=GreetProvider --version=$api_ver
  rules:
    - if: '$CI_PIPELINE_SOURCE == "trigger"'
      when: never
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
      changes:
        - back/*
        - back/**/*
```

### Pact Brokerの設定
Consumer側のContractが更新された際に、Provider側のContract Testを実行するために以下の設定を追加していきます。  

#### Gitlabへのジョブトリガーの追加  
外部からパイプラインを起動するためのジョブトリガーを設定します。設定したトリガーのトークンはWebHookの設定に必要ですので控えておきます。  

![パイプライントリガーの設定](/img/blogs/2023/0403-pipeline-trigger.jpg)

#### Pact Broker側にWebHookの追加  
Gitlab側で設定したトリガーを呼び出すWebHookをPactFlow側に設定します。PactFlowを利用する場合は、別途登録したークレット情報を参照してHookを定義できますので、Gitlabのアクセストークンについてはシークレット情報として別途定義しています。  

![シークレット情報の設定](/img/blogs/2023/0403-pact-secrets.jpg)

![WebHookの設定](/img/blogs/2023/0403-pact-webhook.jpg)

なお、Pact Brokerを使用する場合には[Pact公式が提供するテンプレート](https://docs.pact.io/pact_broker/webhooks/template_library)を参考にjson形式で同様の内容を設定することになります。  

## まとめ

Pact-Broker CLIツールの簡単な利用方法と、それを活かしたContract Testのパイプライン組み込みについて紹介しました。紹介した設定で、Contract Testを利用したデプロイ可否の判定を含めたパイプラインが構築できます。  
デプロイ先の環境や開発のブランチ運用にあわせてパイプラインを構成することでデプロイの安定性を高めた運用が可能になります。  
