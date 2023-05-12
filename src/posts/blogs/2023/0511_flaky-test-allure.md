---
title: テストのフレイキーさを簡単に確認するためにレポートツールAllureを利用する
author: shinichiro-iwaki
date: 2023-05-11
tags: [テスト]
---

フレイキーなテスト(flaky test[^1])とは、ソースコードに変更を加えていないにも関わらず成功と失敗の両方の結果を出すテストです。ソフトウェアテストのシンポジウムJaSSTでのGoogleのJohn Micco氏の講演[^2]などが有名ですね。  

[^1]:　余談ですが、flakyって語彙は「薄片/フレーク状の」から転じて「風変り」や「信用できない」ような俗語的な意味(日本語の「薄っぺらい奴」のような感覚でしょうか)があるようです。筆者は「壊れやすくて儚い」ようなロマンチックな妄想をしていましたが、snowflake(雪の結晶)に引っ張られすぎていたようです。  

[^2]:　[講演資料](https://www.jasst.jp/symposium/jasst18tokyo/pdf/A1.pdf)によると当時のGoogle社においても16%ほどのテストが何かしらのフレイキーさを有し、開発者の誤判断を誘発したりテスト再実行の無駄コストを生んでいた模様です。  

「フレイキーさ」はテストを自動化していくとついてまわる問題であり、放置してしまうといわゆるオオカミ少年効果[^3]により順調なデプロイを妨げる一因になり得ます。これに対して今もなお様々な研究やアプローチ[^4]が行われていますが、どのようなアプローチを採るにしても第一歩目には「どこにフレイキーさがあるか」を特定していくことが必要なことは論を待たないと思います。  

[^3]:　[誤った警報が繰り返されることで、警報そのものが信頼されなくなること](https://www.weblio.jp/content/%E8%AA%A4%E5%A0%B1%E5%8A%B9%E6%9E%9C)を有名なイソップ童話にちなんで命名されたものです。ちょっと古いお話ですが数百億円の損害を生んだジェイコム株誤発注の事例でも、[「普段から警告が頻発していたこと」が問題の警告を無視してしまった一因である という分析](https://www.shippai.org/fkd/cf/CZ0200714.html)がされています。  

[^4]:　最近の動向については例えばDevOps Days Tokyo 2022の講演で川口耕介氏が紹介してくれています。[ダイジェスト紹介](https://www.publickey1.jp/blog/22/itjenkinsdevops_days_tokyo_2022.html)ですが、興味のあるかたはご覧いただければ。  

「同じコードに対してテストの結果が変わる」部分を特定するということは、テスト結果を蓄積して分析することに他なりません。テスト結果をDB等に保持して分析しても良いですし、[Launchable](https://www.launchableinc.com/docs/features/insights/)のようなテスト支援サービスや[CircleCI](https://circleci.com/docs/ja/insights-tests/)のようにCI/CDプラットフォームが提供するテスト結果の分析機能もあります。しかしいずれのアプローチでもそれなりのコストがかかりますので、これから取り組む場合はそこにコストをかけるべきかの判断が難しいかもしれません。  

今回は「フレイキーさ」を分析する一歩目として、簡易に導入可能なレポーティングツールのAllureをサンプルコードを交えて紹介します。

この記事のコードサンプルは、[Gitlab リポジトリ](https://gitlab.com/shinichiro-iwaki/testexample/) にありますので、興味がある方はあわせてご利用下さい。

※2023/5/12 細かな誤記に気付きましたので修正しました  

## Allureの導入

[Allure](https://docs.qameta.io/allure/)は多言語/テスティングフレームワークに対応したレポーティングツールです。テスト結果を収集し、様々な視点で観察可能なレポート[^5]を生成します。  

[^5]:　必要な情報(テストの実行ログ等)を集約していくことで失敗箇所の詳細や全体的な傾向など、興味を持つ視点で「分析し易い」レポートを生成できます。e2eテストとの組み合わせに特にメリットが大きいようで、様々な方が技術情報を公開されていますのでレポーティング内容そのものについては説明を割愛します。  

サンプルアプリケーションの構成(Java/Gradle/JUnit5)に対しては、以下のようにプラグインを設定するだけでテストコード側には特に改変を加えずに導入が可能[^6]です。  

[^6]:　と、書きましたがライブラリ間の相性問題はあるようで、筆者の環境(Java11)ではPactのバージョンを上げないとAspectJ WeaverのExceptionが発生してしまう状況でした。発生個所を見る限りテスト結果そのものに影響は無さそうでしたが、サンプルコードではPactのバージョンアップも行っています。  

 ```groovy
 plugins {
  ・・・
  id 'io.qameta.allure' version '2.11.2'
 }
 def allureVersion = "2.21.0"
 ・・・
 allure {
    autoconfigure = true
    aspectjweaver = true
    version = allureVersion

    useJUnit5 {
        version = allureVersion
    }
 }
 ```

allureはJUnitとも統合されていますので、テスト実行時にレポーティング用のデータ(allure-results)がビルドディレクトリ以下に出力されます。javaの場合には[gradle](https://docs.qameta.io/allure/#_gradle_6)や[maven](https://docs.qameta.io/allure/#_maven_7)のプラグインも提供されていますのでビルドツールを介してレポートを出力/表示できますし、[cliツールを導入して直接利用](https://docs.qameta.io/allure/#_commandline)も可能です。  

allureはwebブラウザから参照可能なレポートをファイルとして出力(gradleの場合`allureReport`タスク)します。出力したレポートをサーバに配置する等して確認可能ですし、組み込み提供されているJettyサーバを利用してレポートを確認(gradleの場合`allureServe`タスク)も可能です。  

![レポート出力イメージ](/img/blogs/2023/0511-allure-report-image.jpg)  

上記レポートはテスト結果の履歴(history)を含んでいますが、履歴データを含めたレポートを出力するためには「前回までの履歴データ」をレポーティング用データ(allure-results)に含めた状態でレポート出力を行う[^7]必要があります。  

[^7]:　日本語の説明だとピンときにくいところですが、具体的な作業としては前回のレポートに含まれる履歴データ(allure-reports/history)をレポーティング用データ(allure-results)以下にコピーすれば良いです。プラグインによってはこの処理を担ってくれるもの(Jenkisプラグイン等)もありますが、残念ながらgradleプラグイン等では手作業なりスクリプトなりで履歴データをコピーしていく必要があります。  

手作業で履歴を保持していくのはそれなりの手間ですが、CIツールなどを利用すれば比較的簡単に履歴を含んだレポートを出力させることが可能です。例えばGitlab CIであれば下記サンプル(レポート出力に関わる部分以外は省略しています)のようにジョブを定義することでレポートを出力し、Gitlabが提供するPagesのサーバ上で公開可能です。  

```yaml
backend-build-and-test:
  stage: build
  ・・・
  artifacts: # レポーティング用データを後続ジョブに引き渡すためのジョブの成果物設定
    when: always
    expire_in: 3 days  
    paths:
      - back/build/allure-results

pages:
  stage: verify
  image: gradle:7.6-jdk11
  dependencies:
    - backend-build-and-test
  before_script: 
    - cd back
    - echo "generate report and backup history..."
    # gradle pluginを利用してbackend-build-and-testジョブの成果物として引き継いだデータ、及びキャッシュ保持したhistoryからレポート生成
    - ./gradlew allureReport 
    # allure-reportに出力されたhistoryデータをGitlabのキャッシュとして保持するために上書き
    - cp -rf build/reports/allure-report/allureReport/history/* build/allure-results/history
    - cd ../
  script: 
    - echo "prepare reports for Gitlab Pages"
    # 生成したレポートファイルをGitlab Pagesを利用した公開対象パスに移動
    - mkdir -p .public
    - mv back/build/reports/allure-report/allureReport/* .public
    - mv .public public
  artifacts:
    paths:
      - public
  cache:
    paths:
      - back/.gradle/
      # 「前回までのhistory」をGitlab CIのキャッシュ機能を利用して保持  
      - back/build/allure-results/history/
```

## 開発の想定シナリオ
これまで[別記事](/blogs/2023/04/03/contract-test-pipeline/)で利用してきた「よくあるサンプルアプリ」ですが、あいさつ文が素っ気ないのでアクセスする時間に応じて[^8]「おはよう」、「こんばんは」のようにメッセージを出し分けて欲しいという要望が入りました。  

[^8]:　はい、お気づきかとは思いますが「時刻に応じて結果が変わる」フレイキーな予感しかしないナンチャッテ要望です。一般的には処理が複雑に(マルチスレッドや利用メモリ量の増加など)なっていくとフレイキーさの発生確率が上がっていきますが、作者の力量的に自然なフレイキーケースは作りづらいので、、、  

そこで時刻によって返却メッセージを変更する処理を追加していきます。コントローラクラスに処理を増やすのもよろしくないので、時刻によってメッセージを切り替える役割を持ったGreetServiceクラスを作成してControllerから利用[^9]するようにしました。  

[^9]:　GreetServiceは時刻に応じてMessageSourceから取得したあいさつ文(文字列)を返すインタフェースとなっています。Serviceの単体テストとしてはMessageSourceをモック化してGreetServiceのみのテストを行うのが望ましいとは思いますが、セットアップの手間を省くためにサンプルコードはSpringBootTestを利用してテストコード中でSpringのDIコンテナを利用する形としました。  

* GreetController  
 ```java
 public class GreetController implements GreetApi {

    private final GreetService greeter;
    @Autowired
    public GreetController(GreetService greeter) {
        this.greeter = greeter;
    }
  
	@Override
	public ResponseEntity<GreetMessage> getGreetIn(String lang) {
		GreetMessage target = new GreetMessage();
		target.setId(BigDecimal.ONE);
		target.setContent(greeter.greetIn(lang));
		return ResponseEntity.ok(target);
	}
  ・・・
 }
 ```

* GreetService  
 ```java
 @Service
 public class GreetService {
 
  @Autowired
  MessageSource messages;

    public String greetIn(String lang) {
        int hour = LocalDateTime.now().getHour();
        String greetId;
        if (4 <= hour && hour < 11) {
            greetId = "greet.morning";
        } else if (11 <= hour && hour < 18) {
            greetId = "greet.default";
        } else {
            greetId = "greet.night";
        }
        return messages.getMessage(greetId, new String[]{}, new Locale(lang));
    }
 }
 ```

* GreetServiceTest  
 ```java
 @SpringBootTest
 public class GreetServiceTest {
  @Autowired
  private GreetService target;
  
	@Test
	@DisplayName("通常のあいさつ")
	void testDefaultGreet() {
	   String expectedEnglish = "Hello Microservice";
		 String actual = target.greetIn("en");

     assertEquals(expectedEnglish, actual);
	}
 }
 ```

## テストの実行とレポートの確認

さて、簡単な開発でしたのでお昼休み前には無事終わりました。テストもバッチリ成功です。午後は終業時間の18時まで打ち合わせ予定が詰まってしまっているので、pushしてから帰宅しようと念のため再度テストをしたところ、アレ、、、テストが(略  

今回のサンプルコードはテスト結果が実施時刻に依存しているため、同一コードでのテストが成功したり失敗したりします。(気付いていた方には予定調和の)フレイキーなテストですね。  

このケースで、allureのレポートは以下のように「同じテストに対する結果」を履歴として保持していますので成功/失敗を繰り返していることが判別できます。  

![テスト実施の履歴](/img/blogs/2023/0511-allure-test-history.jpg)

また、保持している結果からallure側でフレイキーであると判定した場合は、レポート上に属性として反映されますので「フレイキーな可能性があるテスト結果[^10]のみを抽出して確認」するようなことも可能です。今回のサンプルアプリは該当しませんが、テスト失敗時のリトライなども記録できますので実行タイミングなどによる「フレイキーさ」についてはテストを再実行で結果を安定させつつレポート上で判断できるようにすることも可能と思います。  

[^10]:　レポート上で「フレイキー」と判定する仕様は公開されていません。執筆時点のallureのソースコードを読む限り、「失敗したテスト」かつ「履歴データの前回結果が成功」のものがフレイキーとして扱われる模様のため、あくまでもフレイキーな可能性がある失敗テストを見つけるための指標として利用するのが良いと考えます。  

![flaky判定されたテストケース](/img/blogs/2023/0511-allure-flaky-report.jpg)

## 補足:フレイキーさの解消

フレイキーさを特定できたら当然対処するべきですよね。テスト結果が時刻による影響を受ける件についてはテストコードを時刻に依存しないように修正すれば解消可能です。例えば「実際の時刻」でなくテストケースに応じた時刻での結果となるよう、テストコード中で扱われる時刻を(モック応答などに)差し替えれば良いですね。  

サンプルコードでは最終的にJava8から追加されているClockを利用し、テスト用のConfigurationなどで時刻を差し替えられるように修正することでテストケースが実施時刻の影響を受けないように修正しています。  

* GreetService  
 ```java
 @Service
 public class GreetService {

  private final Clock clock;

  @Autowired
  public GreetService(Clock clock) {
		this.clock = clock;
	}

    public String greetIn(String lang) {
        int hour = LocalDateTime.now(clock).getHour();
        ・・・
    }
 }
 ```

* GreetServiceTest  
 ```java
 @SpringBootTest
 public class GreetServiceTest {
	 private final GreetService target;

   @Autowired
	 public GreetServiceTest(GreetService greetService) {
      this.target = greetService;
   }

   @MockBean
   Clock clock;

   @Test
	 @DisplayName("通常のあいさつ")
	 void testDefaultGreet() {
	   when(clock.instant()).thenReturn(Instant.parse("2023-04-06T03:00:00Z"));
		 when(clock.getZone()).thenReturn(ZoneId.of("Asia/Tokyo"));
     ・・・
	}
 }
 ```

## まとめ

レポーティングツールAllureを簡単に紹介し、「フレイキーさ」を判別するための手がかりとして利用できる可能性について紹介しました。  

実際にフレイキーと戦う際にはより多くのテスト結果を蓄積し、分析することが必要になるかとは思います。が、抱えるテスト対象がどれだけ「フレイキーさ」を抱えているかを把握して、次のアプローチに繋げるためには、簡単に導入できるこのようなレポートツールが有用ではないかと思います。

