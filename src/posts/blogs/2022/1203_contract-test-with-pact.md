---
title: Contract TestツールPactの紹介
author: shinichiro-iwaki
date: 2022-12-03
tags: [advent2022, テスト]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---

これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第3日目の記事です。

マイクロサービスのようにAPIを介して要素を結合させてシステムを構成する場合、要素間の結合可能性をどのように担保していますか。

要素単体でキッチリとテストを済ませて、いざテスト環境にデプロイしてみたらAPIの不整合で動かなかったような経験は、かなりの方にあるのではないかと思います。

APIの結合性をデプロイ前に検証するアイデアとしてContract Testという考え方があります。英国政府のサイトGov.UKのテスト標準[^1]や、CookPadさんの技術ブログ[^2]で採用技術として紹介されているアプローチになります。

今回は、Contract Testの考え方と、ツールとしてPactを利用した実現例を紹介します。

[^1]: [A new standard of testing for GOV.UK](https://technology.blog.gov.uk/2021/10/08/a-new-standard-of-testing-for-gov-uk/)

[^2]: [実践 Pact:マイクロサービス時代のテストツール](https://techlife.cookpad.com/entry/2016/06/28/164247)


[[TOC]]

## Contract Testとは

Contract Testは、APIを介して連携するサービスの結合をテストするためのアプローチです。

APIが満たすべき振舞いをAPIの提供側(Provider)と利用側(Consumer)の間の契約(Contract)と捉え、契約どおりに振る舞うかを(実際に結合せずに)検証し、結合可能性を確認します。

![Contract Testイメージ](/img/blogs/2022/1203_contract-test.drawio.svg)

ここではContractをどうやって定めるかが鍵となります。1つの有力なアイデアは、利用者側がAPIに期待する振舞いを定め、提供者側が検証するという利用者駆動(Consumer-driven)のContract Testです。

この概念はそれほど真新しいものでもなく、例えば2006年にサービスを進化させていく開発のパターンとして紹介[^3]されていたりします。

[^3]: [Consumer-Driven Contracts: A Service Evolution Pattern](https://martinfowler.com/articles/consumerDrivenContracts.html)

## Pactを利用したContract Testの実装

テストの概念だけでは想像しにくい部分もあるかと思いますので、よくあるサンプルアプリ[^4]を題材にして実際にConsumer Driven Contract Testを作成してみます。テストにはContract TestツールのPactを利用しています。

[^4]:　当然のことながら、アプリ側の解説は抑えておきたいだとか、他テーマでも扱いやすそうなつくりだとか、筆者のヨコシマな思いは色々と入っていますのでご了承ください。

### Pactとは

PactはContract Testを支援するツールの1つです。様々な言語に対応[^5]されていますし、テスティングフレームワークやビルドツールとの統合も積極的に行われているようです。また、今回紹介するのはhttpの同期連携のテストですが、メッセージを介した非同期連携にも対応(Message Pact)しています。

フロントエンドとバックエンドで技術スタックが異なっているようなケースでも、比較的広範に渡って利用可能なのがこのツールの強みの1つです。

Pactは、ConsumerとProviderとの間のContractを(ツールと同名の)「Pact」というjsonフォーマットのデータで扱います。以後の説明では紛らわしさを回避するため、ツールとしてのPactを指す場合は「Pactツール」と呼ぶことにします。

:::column:
Pactツールの仕様や用法の詳細については説明しきれないので割愛します。
[公式サイト](https://docs.pact.io/)の説明がかなり親切ですので、興味を持っていただいた方はそちらもご参照下さい。
残念なことに日本語化はされていませんが、比較的平易な英語ですし、図やサンプルコードも豊富ですので理解しやすいかと思います。
:::

[^5]:　執筆時点の公式情報ではJS、Java、.Net、Go、Python、Swift、Scala、PHP、Ruby、Rust、C++ に対応しています。

### テスト対象のサンプルアプリ

サンプルアプリはSpring bootフレームワークを利用してJavaで実装したHello Worldアプリケーションです。ブラウザでフロントエンドにアクセスすると、バックエンドから挨拶メッセージを取得して表示するシンプルなものです。

![サンプルアプリシーケンス](/img/blogs/2022/1203_app-sequence.drawio.svg)

アプリケーションを実現するための基本的な機能はフレームワークが提供するものを利用し、フロントエンドとバックエンドの間のAPIはOpenAPI仕様に従った定義(スキーマ)から自動生成させる形を取っています。

アプリケーションは[以下](#サンプルアプリのコードスニペット)に示すように少量の実装で実現できます。

![サンプルアプリ概要](/img/blogs/2022/1203_app-overview.drawio.svg)

なお、SpringやOpenAPI Generatorの詳細については本稿の主題から逸れますし、ネット上などに情報も多彩ですのでここでは説明を割愛しています。

### サンプルアプリのコードスニペット

APIを介した連携をAPI定義からの自動生成コードとSpring提供機能を利用して簡易に実装しています。アプリケーションのアーキテクチャなどは特に考慮していませんので、予めご承知おき下さい。

- API定義(スキーマ) 
```yaml
openapi: 3.0.0
// Openapi Specに従ったAPIの定義
paths:
  '/greet':
    get:
      operationId: getGreet
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/greetMessage'
// 通信で使用するデータの構造定義
components:
  schemas:
    greetMessage:
      type: object
      properties:
        id:
          type: number
        content:
          type: string
```

- フロントエンドからバックエンド(Greet)のAPI呼び出し 
```java
@Service
public class GreetService {
    // Openapi Generatorが生成したRestTemplateのClientを使用したバックエンド呼び出し処理
    private final GreetApi greetApi;
    public GreetService(ApiClient apiClient) {
        GreetApi greetApi = new GreetApi(apiClient);
        this.greetApi = greetApi;
    }

    public GreetMessage greet() {
        try {
            return greetApi.getGreet();
        } catch (HttpClientErrorException e){
            throw e;
        }
    }
}
```

- バックエンド(Greet)のController実装 
```java
// Openapi Generatorが生成したAPI定義(interface)を実装するRestController
@RestController
public class GreetController implements GreetApi {
	@Override
	public ResponseEntity<GreetMessage> getGreet() {
		// 固定の挨拶文を返却
		GreetMessage target = new GreetMessage();
		target.setId(BigDecimal.ONE);
		target.setContent("Hello Microservice");
		return ResponseEntity.ok(target);
	}
}
```

### Consumer側のテスト

APIの利用側(Consumer)であるフロントエンドは、`GreetService`クラスからRestTemplateを利用してバックエンドのAPIを呼び出しています。Pactツールが提供するモックサーバを利用してこのクラスをテストすることで、テストで使用したRequest/Responseの組み合わせをContractとして記録できます。テストの実現イメージは以下のようになります。

![Consumerテスト概要](/img/blogs/2022/1203_consumer-mechanism.drawio.svg)

テスティングフレームワークとしてJUnit5を使用すると、以下のようなテストコードでConsumer側のテストが実装できます。

```java
@ExtendWith(PactConsumerTestExt.class)  // JUnit5のテストでPactを利用するための拡張
@PactTestFor(providerName = "GreetProvider")
public class GreetServiceTest {
    // 応答データをPactツールが提供する DSLを利用して定義
    @Pact(provider="GreetProvider", consumer="Greet_Front")
    public RequestResponsePact defaultGreet(PactDslWithProvider builder) {
        PactDslJsonBody body = new PactDslJsonBody()
            .numberValue("id", 1)
            .stringValue("content", "Hello Microservice");
        
        return builder
            .given("test state")
            .uponReceiving("GreeterPactTest get greet")
                .path("/greet")
                .method("GET")
            .willRespondWith()
                .status(200)
                .body(body)
            .toPact();
    }    

    @Test
    @PactTestFor(pactMethod = "defaultGreet") // モックに応答させる内容を定義したPactから指定
    void defaltGreetTest(MockServer mockServer) throws IOException {
        // テストで使用するapiClientのアクセス先をPactツールのモックサーバに設定
        var apiClient = new com.example.iwaki.greet.ApiClient();
        apiClient.setBasePath(mockServer.getUrl());

        GreetMessage message = new GreetService(apiClient).greet();
        assertEquals("Hello Microservice", message.getContent());
    }
}
```

テストを実行すると、ビルド出力フォルダ以下に`pacts`フォルダ[^6]が作成され、テストコードで利用したContractの内容がjson形式のPactファイルとして出力されます。

```json
{
  "consumer": {
    "name": "Greet_Front"
  },
  "interactions": [
    {
      "description": "GreeterPactTest get greet",
      "providerStates": [
        {
          "name": "test state"
        }
      ],
      "request": {
        "method": "GET",
        "path": "/greet"
      },
      "response": {
        "body": {
          "content": "Hello Microservice",
          "id": 1
        },
        (略)
       "status": 200
      }
    }
  ],
  (略)
  "provider": {
    "name": "GreetProvider"
  }
}
```

このPactファイルの内容に従って、Provider側のテストが可能になります。

[^6]:　設定で変更することはもちろん可能ですが、今回は簡単のためにデフォルトの出力先を利用しています。

### Provider側のテスト

APIの提供側(Provider)であるバックエンドは、Springの機能を利用してhttpのリクエストに応答します。具体的な応答処理は`GreetController`クラスで実装しています。Pactツールの機能を利用してContractに基づいたhttpリクエストを送信することでContractに従った応答をするかテストできます。

Provider側のアプリケーションを起動してhttp通信しても良いのですが、PactツールはSpringのMockMVCとも統合可能ですので今回はMockMVCを利用して実装してみます。テストの実現イメージは以下のようになります。

![Providerテスト概要](/img/blogs/2022/1203_provider-mechanism.drawio.svg)

Provider側のテストコードは以下のようになります。

```java
@WebMvcTest // SpringのMockMVCを利用するための拡張
@Provider("GreetProvider")  // Pact(Contract)で検証対象となるProvider名を指定
@PactFile("../front/target/pacts") // 検証するPactファイルを含むフォルダを指定
public class GreetContractTest {
     
    @Autowired
    private MockMvc mockMvc;

    @TestTemplate // JUnit5のTestTemplateを利用してPactの内容に応じたコンテキスト毎のテストを設定
    @ExtendWith(PactVerificationSpringProvider.class) // Pactツールからのコンテキスト提供を設定
    void pactVerificationTestTemplate(PactVerificationContext context) {
      context.verifyInteraction();
    }
    
    // コンテキスト毎の初期処理でテスト対象をmockmvcに設定
    @BeforeEach
    void before(PactVerificationContext context) {
        context.setTarget(new MockMvcTestTarget(mockMvc));
    }

    // Pactの条件(providerStates)毎に異なる処理が必要であれば記載
    @State("test state")
    void testState() {}
}
```

テストを実行すると指定したPactファイルの内容に従って、Provider側の応答が検証され、テストの成否として出力されます。

:::info:Providerテスト時の留意点
テスト時にデータベースや後続サービスなど、依存する外部要素をモック化することはよくあるアプローチです。
あるいはデータベースにテスト用の簡易データを投入してテストするようなケースもあるかと思います。
Contract TestはProviderのリクエストに対する応答が正しいかを検証するため、モック応答やテストデータについてはContractの成否に影響を与えないようにする必要があります。

例えば`GET /product`で全件検索、`GET /product?status=xxx`で条件一致の検索をするAPIがあったとします。
このContract TestでProvider側の検索処理をモック化した場合、正しく条件に従った応答をすることを保証できなくなります。
:::

### Contractの管理

ここまでPactファイルを介しての検証を紹介してきましたが、実際の開発を想定するとPactファイルの管理(受け渡しやバージョン管理)が煩雑になりそうです。

Pactを管理するツールとして、Pact-Brokerが提供されているので、そちらを利用するケースについても軽くご紹介します。

Pact-Brokerはdockerイメージでも提供されており、ローカルでも簡易に利用可能です。ここでは公式ページで提供されている[docker-compose.yml](https://github.com/pact-foundation/pact-broker-docker/blob/master/docker-compose.yml)を最小限設定に修正して`docker-compose up -d`で起動します。

```yaml
services:
  postgres:
    image: postgres
    healthcheck:
      test: psql postgres --command "select 1" -U postgres
    volumes:
      - postgres-volume:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: postgres

  pact-broker:
    image: pactfoundation/pact-broker:2.105.0.1
    ports:
      - "9292:9292"
    depends_on:
      - postgres
    environment:
      PACT_BROKER_PORT: '9292'
      PACT_BROKER_DATABASE_URL: "postgres://postgres:password@postgres/postgres"
      PACT_BROKER_LOG_LEVEL: INFO
      PACT_BROKER_SQL_LOG_LEVEL: DEBUG
      PACT_BROKER_DATABASE_CONNECT_MAX_RETRIES: "5"
      PACT_BROKER_BASE_URL: 'http://localhost:9292 http://pact-broker:9292'

volumes:
  postgres-volume:
```

docker-compose.ymlの設定に従い、`localhost:9292`にブラウザでアクセスするとPact-BrokerのUIが表示されます。サンプルデータを含んだ状態ですので、色々と動きを確認してみても分かりやすいと思います。

![Pact-Brokerトップ画面](/img/blogs/2022/1203_pact-broker-01.jpg)

さて、Pact-Brokerが起動できたら[Consumerのテスト](#consumer側のテスト)で生成されたPactファイルを登録してみます。

Pactの登録はPact-Brokerのcliツールを使用して実施しますが、Javaで開発している場合はmaven/gradleのPluginも提供されているため、そちらの利用も可能です。

今回は簡単にmaven Pluginを使用した登録手順を紹介します。Consumer側のMavenプロジェクトに以下のようにPactツールのPlugin設定を追加します。

```xml
<plugin>
    <groupId>au.com.dius.pact.provider</groupId>
	<artifactId>maven</artifactId>
    <version>4.1.11</version>
    <configuration>
	    <pactDirectory>${project.build.directory}/pacts</pactDirectory> <!-- 登録するPactファイルが存在するパス -->
		<pactBrokerUrl>http://localhost:9292</pactBrokerUrl>
        <projectVersion>${project.version}</projectVersion> <!-- PactのバージョンにはMavenプロジェクトのバージョンを使用 -->
		<trimSnapshot>true</trimSnapshot> <!-- MavenプロジェクトのバージョンがSNAPSHOTの場合に除外 -->
        <tags> <!-- Pactに付加する情報 -->
            <tag>test</tag>
        </tags>
    </configuration>
</plugin>
```

これでmavenコマンド`mvn pact:publish`によるPact-BrokerへのPactファイルの登録が可能になります。上記サンプルのように設定して登録するPactに付加情報を加える[^7]ことも可能です。

Pactを登録すると、UI上からも内容を確認できます。この段階ではConsumer側から登録した状態ですので未検証の状態(Verified欄が空白)で表示されているかと思います。

![登録済みPact画面](/img/blogs/2022/1203_pact-broker-02.jpg)

[Provider側のテスト](#provider側のテスト)コードを以下のようにPact-Brokerを使用する設定に変更することで、Pactの内容をPact-Brokerから取得してテスト可能です。

```java
@WebMvcTest
@Provider("GreetProvider") 
@PactBroker(host = "localhost", port = "9292") // Pact参照先をファイルからBrokerに変更
public class GreetContractTest {
  ・・・
}
```

JUnitで実行するテストの場合は、テストの実行時に`pact.verifier.publishResults`と `pact.provider.version`のシステムプロパティを設定することでProviderの検証結果がPact-Brokerに登録されます。

上記プロパティを実行時変数などで設定してProviderのテストを実行すると以下のようにContractの状態が検証済みに変化します。

![検証済みPact画面](/img/blogs/2022/1203_pact-broker-03.jpg)

[^7]:　Pact-Broker側には(ソースの)ブランチ名、(デプロイした)環境名、タグ名が設定可能ですが、mavenプラグインの場合`tags`で指定した内容がブランチ/環境/タグの全てに付与される模様です。きめ細かく情報を設定する場合はcliツールなどの利用が望ましいですね。

## まとめ

簡単にまとめるつもりでしたが、そこそこに長文になってしまいました。お付き合い下さった方、ありがとうございます。

Contract Testをどう活用していくかについては、次回の記事で考察できればと思っています。

この記事のコードサンプルは、[Gitlab リポジトリ](https://gitlab.com/shinichiro-iwaki/testexample) にもありますので、興味がある方はあわせてご利用下さい。
