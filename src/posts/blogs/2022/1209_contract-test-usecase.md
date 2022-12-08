---
title: Contract Testの使いどころを考える
author: shinichiro-iwaki
date: 2022-12-09
tags: [advent2022, テスト]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---

これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第9日目の記事です。

[前回の記事](/blogs/2022/12/03/contract-test-with-pact/)ではContract Testについてサンプルを交えて簡単に説明しました。その範囲では、どのようなケースで有効なアプローチなのかまでは紹介しきれていません。

今回は、Contract Testをどのように開発に取り入れるのが効果的なのかを、同じようにサンプルコードを使いながら考察していきます。

[[TOC]]

## 前回のおさらい

前回はフロントエンド/バックエンドの間でhttp通信を行うサンプルアプリを題材にして、Contract TestでAPIの結合可能性を検証可能なことを説明しました。

![サンプルアプリV1.0シーケンス](/img/blogs/2022/1203_app-sequence.drawio.svg)

勘の良い方は気付いているのではないかと思いますが、このサンプルアプリではAPIの構造は共通のOpenAPIスキーマから生成していますので、前回のContract Testの保証内容は実は自明な内容です。

それでは実際の開発を想定した場合、サンプルアプリはどのように変化していくのでしょうか。

:::column: サンプルアプリの構造変更
前回の記事時点でのサンプルアプリは、フロント/バックの各アプリケーションビルド時にOpenAPIGeneratorを利用してAPIのソースコードを生成するように構成していました。
今回の記事はAPIの仕様変更を行う想定で説明するため、この構造ではAPIのスキーマ変更にあわせて各アプリケーションを修正しないとビルドに失敗してしまいます。
スキーマ変更後も旧API定義を参照してビルドが可能となるように、サンプルアプリの構成は、APIを別途ライブラリ化してアプリケーションから参照するように変更しています。
:::

## 想定する開発シナリオ

よくあるサンプルアプリ[^1]に、日本語/英語の多言語対応の要望が入ったとします。クライアントのロケール情報はhttpのヘッダから取得できるので、取得したロケールにあわせてあいさつ文を取得するように変更することを考えます。

[^1]:　今回からの方のために一応ですが、アプリ側の解説は抑えておきたい、他テーマでも扱いやすそうなつくり、といった筆者のヨコシマな思いは多々入っていますのでご了承ください。

### フロント側のAPI変更検討

ブラウザからのリクエストを受けるのはフロントサービスですので、そこでhttpヘッダから言語情報を取得してバックエンドのGreetサービスに渡す仕様を考えたことにしましょう。APIの仕様変更[^2]ですね。仕様変更前の状態をV1.0、今回の変更でV1.1にバージョンアップされるとします。

![API仕様変更](/img/blogs/2022/1209_app-sequence-revise.drawio.svg)

[^2]:　変更後のAPI仕様は、、、と気付いてしまった方、この時点では何も言わずに見守ってあげるのが大人の余裕ってモンですよ。

Consumer Drivenで開発を進めるとして、API定義とフロントサービス側を以下のように変更してみます。httpヘッダに含まれるブラウザの言語設定(ロケール)はSpringが提供する`AcceptHeaderLocaleResolver`を利用して取得できます。GreetApiの呼び出しはAPI変更にあわせ、`lang`変数を渡して呼び出す処理になっていますのであわせて修正していきます。

- API定義(スキーマ) 
```yaml
openapi: 3.0.0
info:
  version: '1.1'
paths:
  # V1.0の/greetを変更
  '/greet/{lang}':
    get:
      operationId: getGreet
      parameters:
      - name: "lang"
        in: "path"
        required: true
        schema:
          type: string
          enum: ["en", "ja"]
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/greetMessage'
```

- フロントエンドからバックエンド(Greet)のAPI呼び出し 
```java
public class GreetService {

    // API変更にあわせてlangを渡した呼び出しに変更
    public GreetMessage greet(String lang) {
        try {
            return greetApi.getGreet(lang);
        } catch (HttpClientErrorException e){
            throw e;
        }
    }
}
```

- フロントエンドのRestController 
```java
@Controller
public class IndexController {

    @GetMapping(value = {"/", ""})
    public String index(Model model) {
        AcceptHeaderLocaleResolver localeResolver = new AcceptHeaderLocaleResolver();
        localeResolver.setDefaultLocale(Locale.ENGLISH); 
        localeResolver.setSupportedLocales(List.of(Locale.JAPANESE, Locale.ENGLISH));

        // AcceptHeaderLocaleResolverを利用してヘッダから取得したロケール情報を使用してバックエンドを呼出すように処理修正
        GreetMessage message = greeterService.greet(localeResolver.resolveLocale(request).getLanguage());
        model.addAttribute("message", message.getContent());
        return "index";
    }
}
```

- Consumer側のContract Test 
```java
public class GreetServiceTest {
    @Pact(provider="GreetProvider", consumer="Greet_Front")
    public RequestResponsePact englishGreet(PactDslWithProvider builder) {

        PactDslJsonBody body = new PactDslJsonBody()
            .numberValue("id", 1)
            .stringValue("content", "Hello Microservice");
        
        return builder
            .given("test state")
            .uponReceiving("GreeterPactTest get greet")
                // Contractに含むAPIのパス情報を変更にあわせ修正
                .path("/greet/en")
                .method("GET")
            .willRespondWith()
                .status(200)
                .body(body)
            .toPact();
    }    

    @Test
    @PactTestFor(pactMethod = "englishGreet")
    void englishGreetTest(MockServer mockServer) throws IOException {
        var apiClient = new com.example.iwaki.greet.ApiClient();
        apiClient.setBasePath(mockServer.getUrl());
        // Contract TestのAPI呼出しも変更にあわせて修正
        GreetMessage message = new GreetService(apiClient).greet("en");
        assertEquals("Hello Microservice", message.getContent());
    }
}
```

これでフロント側は正常に動作する状態になりました。API変更にあわせてPactファイルも更新されていますので、Consumer側V1.1.0のPactをPact-brokerに登録しておきましょう。

### バックエンド側の変更

バックエンドのGreeterアプリケーションはV1.0時点では変更後のAPIを提供していません。当然、この状態でProvider V1.0のContract Testを行うとContractの不一致によりテストは失敗します。つまり、V1.0のGreeterサービスが稼働している環境にV1.1のフロントサービスをデプロイしたらAPIの不整合が起きるということですね。

それではバックエンド側もV1.1のAPI使用にあわせて修正を入れていきます。メッセージの切り替えはSpringが提供する`MessageSource`を利用すれば以下のように実現できます。Contract Testコードは、更新されたPactを取り込んでテストを実施するため、特に変更不要です。

- バックエンドのRestController 
```java
public class GreetController implements GreetApi {
	@Autowired
	MessageSource messages;

	@Override
	public ResponseEntity<GreetMessage> getGreetIn(String lang) {
		GreetMessage target = new GreetMessage();
		target.setId(BigDecimal.ONE);
		target.setContent(messages.getMessage("greet.default",new String[]{},new Locale(lang)));
		return ResponseEntity.ok(target);
	}
}
```

- バックエンドのリソース 
```
#messages_en.properties
greet.default=Hello Microservice

#messages_ja.properties
greet.default=マイクロサービスさん、こんにちは
```

これでProvider側がV1.1のAPIを提供するようになったので、Contract Testは成功するはずですね。

実際にテストを実行すると、以下のようにContract Testは失敗します。エラーメッセージに示されるように、V1.0のフロントサービスのPactとV1.1のGreeterの組み合わせがContractを満たさないことが分かります。

![ContractTestエラー](/img/blogs/2022/1209_mvn-error.jpg)

同じことはPact-Broker上でも確認できます。現状のConsumerとProviderの関係は、同時にV1.0からV1.1にバージョンアップしない限り上手く動作しない(Contractを守る関係ではない)ということですね。立派な分散モノリス[^3]のできあがりですね。ナンテコッタ。

![分散モノリスのPact](/img/blogs/2022/1209_dist-monolyth-pact.jpg)

[^3]:　[マイクロサービスアーキテクチャを取っているのにサービス間が過度に密結合なためマイクロサービスの利点を享受できない状態](https://www.infoq.com/jp/news/2016/03/services-distributed-monolith/)。本来的な「密結合」とは違うかもしれませんが、API由来でデプロイ可能なものに制約が出るのであれば立派に密だと思いますヨ。

### 問題点と解決方法

Contract Test結果が示してくれたように、今回のAPI変更は下位互換性を損なうものでした。V1.0時点の`GET /greet`については呼出し可能なようにしておかないとデプロイ済み(想定)のフロントエンドからの呼出しができなくなってしまいますね。  

フロントエンド側はV1.0のAPI呼出しはしないため特に変更不要ですが、バックエンド側にV1.0のAPI呼出しを復活させます。  

- API定義(スキーマ) 
```yaml
openapi: 3.0.0
info:
  version: '1.1'
paths:
  # V1.0と下位互換のためのAPI定義
  '/greet':
    get:
      operationId: getGreet
      responses:
        '200':
          description: あいさつ文を取得
          headers: {}
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/greetMessage'
  '/greet/{lang}':
    get:
      operationId: getGreetIn
      ・・・
```

- バックエンドのRestController 
```java
public class GreetController implements GreetApi {
	@Autowired
	MessageSource messages;

	@Override
	public ResponseEntity<GreetMessage> getGreet() {
		GreetMessage target = new GreetMessage();
		target.setId(BigDecimal.ONE);
        // V1.0互換のために英語メッセージを応答
		target.setContent(messages.getMessage("greet.default",new String[]{},new Locale("en")));
		return ResponseEntity.ok(target);
	}

	@Override
	public ResponseEntity<GreetMessage> getGreetIn(String lang) {
		・・・
	}
}
```

これでContract Testは成功するようになりました。V1.0のConsumerとV1.1.1(修正後のV1.1)のProviderの間でContractが守られているため、バックエンドのV1.1はフロントエンドのV1.0と組み合わせて動作可能です。その後でフロントエンドのV1.1をデプロイすれば無停止でバージョンアップできますね。  

![下位互換が担保されたPact](/img/blogs/2022/1209_pact-broker-matrix.jpg)  

以上の例では画面上でデプロイの可否を確認していましたが、Pact-Brokerのcliツールを利用すれば[^4]Pactの検証状態を参照してデプロイ可否をチェック可能です。  

[^4]:　前回の記事で紹介したmavenプラグインからも`mvn pact:can-i-deploy`コマンドでPactの検証状態を確認可能です。しかし、機能の追従が遅れているようで「デプロイ先」を設定しての確認など、最近の機能には対応していないようです。今回はcliツールを使った例を紹介します。  

[スタンドアロンで稼働するcliツール](https://github.com/pact-foundation/pact-ruby-standalone/releases)が公開されていますので端末にインストール(解凍+Path設定)すれば利用可能です。Windowsでは各コマンドがバッチファイルで提供されていますので、以下のようなコマンドでデプロイ可否の問い合わせができます。  

```bash
pact-broker.bat can-i-deploy \
  --broker-base-url <Pact-BrokerのURL> \
  --pacticipant <検証したいconsumerまたはproviderの名称> \
  --version <consumerまたはproviderのバージョン> \
  --to-environment <デプロイ可否を判定するデプロイ先=Pact-brokerに登録されているenv名>
```

![デプロイ可否検証結果](/img/blogs/2022/1209_pact-can-i-deploy.jpg)

コマンド実行なので、CI/CDのパイプラインを組んでいる場合はデプロイ実行前に`can-i-deploy`を組み込むことも容易です。デプロイ完了時にPact-Brokerのデプロイ先情報もあわせて更新するようにすれば、より安全なデプロイになります。  

## Contract Testの利点について

今回紹介したように、Contract Testの情報を管理することでAPIの互換性を検証し、より安定的なデプロイを実現できます。  

今回のサンプルでは紹介しきれませんでしたが、エラー応答を含めた主要な振舞いをContractにしておけば[^5]さらに互換性の精度を高めることもできますね。  

テストの意義の1つは、関係者に「判断するための情報」を提供すること[^6]にあります。その意味で、Contract Testはデプロイ可否をデプロイ前に提示できる有力なアプローチです。デプロイ後のE2EテストでAPIの不整合に悩まされていたり、デプロイ可否の判断に悩まされていたりするケースでは有効です。  

[^5]:　Contractを増やすことで保証できる振舞いは増えますが、無作為に増やすことはテストのコスト上昇に繋がります。また、重要でないケースをContractにするとAPIの変更が行いにくくなり、硬直化を招くこともあります。Contractをどこまで網羅的にするべきかはテスト対象により異なると思いますが、正常系と(エラー応答することが)重要なエラーケース程度というのが1つの指標になるのではないかと思います。  

[^6]:　まさか「テスト終わりました」「で、これはリリースしていいの?」って会話をしてるなんてことはないですよね。自戒の意も込めて。  

:::column: CookPadさんの事例紹介記事のその後
前回の記事で[CookPadさんがContractTestを採用したという少し前の技術ブログ](https://techlife.cookpad.com/entry/2016/06/28/164247)を紹介しました。
これに関しては「主に開発スピードとのミスマッチ」という理由で使用をやめた というお話がその後あがっていますのでここでも紹介しておきます。

 [Pact をやめた理由](https://scrapbox.io/yoshiori/Pact_%E3%82%92%E3%82%84%E3%82%81%E3%81%9F%E7%90%86%E7%94%B1)
筆者の責任で要約すると、以下の経緯のようです。
- マイクロサービスの安定化が目的だった
  - APIの結合可能性の検証をシフトレフトするためにContract Testを採用した
  - 運用を続けていく中で、安定性は2サービス間の結合のみで保証できるものではないことが分かった
- エラー抑止のためテストにコストをかけるアプローチを変更した
  - 通信速度にメリットがある(しかし、開発コストはRESTよりも高くなりがちな)gRPC型API開発にコストをかける
  - テストはシフトライトし、エラー発生時の対処(分散トレーシングやカオスエンジニアリング)にコストをかける
:::

## まとめ

[前回の記事](/blogs/2022/12/03/contract-test-with-pact/)とあわせて、Contract Testの概念と活用箇所について紹介しました。次回はPactを利用するためのTipsを紹介できれば[^7]と思っています。

この記事のコードサンプルは、[Gitlab リポジトリ](https://gitlab.com/shinichiro-iwaki/testexample) にありますので、興味がある方はあわせてご利用下さい。

[^7]:　非同期連携のMessage Pactを紹介したいところですが、良い感じのサンプルアプリのアイデアが浮かんでおらずでして。今のところ内容未定ですが、軽めのTips紹介などできたらと考えています。  
