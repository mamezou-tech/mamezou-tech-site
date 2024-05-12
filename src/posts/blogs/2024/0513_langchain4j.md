---
title: LangChainのJava用ライブラリLangChain4jを使ってみる
author: kotaro-miura
date: 2024-05-13
tags: [RAG, OpenAI, GPT, LangChain]
image: true
---

# はじめに

こんにちは。デジタル戦略支援事業部の三浦です。

今回はLangChainのJava用ライブラリである **LangChain4j** を触ってみたので紹介したいと思います。

LangChainとはLLM(大規模言語モデル)を利用したアプリケーション開発において便利な機能をまとめたフレームワークです。
多種の言語モデルを統一的なインターフェースで利用できることや、プロンプトテンプレート、会話履歴の保存、エンベディング、ベクトルDBとの接続など多くの機能に対応しています。
LangChainは各プログラミング言語のライブラリとして提供されており、特にPython,JavaScript/TypeScript用のものがメジャーとなっています。
ですが個人的にJavaをよく利用しているので今回はJava用のLangChainライブラリを触ってみようと思います。

Java用のLangChainライブラリはオープンソースなものでいくつかあるようなのですが、Mavenリポジトリの中で一番人気となっている[LangChain4j](https://docs.langchain4j.dev/)を利用して見たいと思います。

# パッケージ

以下のパッケージをインポートします。

```xml
<dependency>
  <groupId>dev.langchain4j</groupId>
  <artifactId>langchain4j</artifactId>
  <version>0.30.0</version>
</dependency>
```

質問にOpenAIのAPIを利用する場合には次のパッケージが必要です。
```xml
<dependency>
  <groupId>dev.langchain4j</groupId>
  <artifactId>langchain4j-open-ai</artifactId>
  <version>0.30.0</version>
</dependency>
```

:::info
Azure OpenAIやAmazon Bedrock,Anthropicなど他の生成AIサービスを利用する場合にはそれぞれ必要なパッケージをインポートする必要があります。
以下リンクでサポートしているサービス一覧を確認できます。
[Supported LLM Integrations](https://github.com/langchain4j#supported-llm-integrations-docs)
:::


# チャットモデルへの質問

チャットモデルへ質問する一番シンプルなコードは以下のようになっております。

```java
OpenAiChatModel model = OpenAiChatModel.withApiKey("API_KEY");
String answer = model.generate("こんにちは");
System.out.println(answer);
// こんにちは！何かお手伝いできることはありますか？
```

デフォルトではgpt-3.5-turboモデルへの質問をします。

モデルやその他のパラメタを指定する場合は以下のようにビルダーメソッドを利用します。

```java
OpenAiChatModel model = OpenAiChatModel.builder()
        .apiKey("API_KEY")
        .modelName(OpenAiChatModelName.GPT_3_5_TURBO)
        .build();
String answer = model.generate("こんにちは");
```
他にも以下のように過去の応答を含めて質問できます。

```java
OpenAiChatModel model = OpenAiChatModel.builder()
        .apiKey("API_KEY")
        .modelName("gpt-4")
        .build();
var userMsg1 = UserMessage.from("こんにちは、私の名前は豆田豆蔵です");
AiMessage aiMsg1 = model.generate(userMsg1).content();
System.out.println(aiMsg1.text());
// こんにちは、豆田豆蔵さん。何かお手伝いできることがありますか？

var userMsg2 = UserMessage.from("私の名前はなんですか？");
AiMessage aiMsg2 = model.generate(userMsg1, aiMsg1, userMsg2).content();
System.out.println(aiMsg2.text());
// あなたの名前は豆田豆蔵さんです。
```

# ストリーム出力

質問の回答内容をトークン単位でストリーム出力する場合は以下のようなコードとなります。

```java
StreamingChatLanguageModel model = OpenAiStreamingChatModel.withApiKey("API_KEY");

String userMessage = "こんにちは";

model.generate(userMessage, new StreamingResponseHandler<AiMessage>() {

    @Override
    public void onNext(String token) {
        System.out.println("onNext: " + token);
    }

    @Override
    public void onComplete(Response<AiMessage> response) {
        System.out.println("onComplete: " + response);
    }

    @Override
    public void onError(Throwable error) {
        error.printStackTrace();
    }
});

/* 出力結果
onNext: 
onNext: こんにちは
onNext: ！
onNext: お
onNext: 元
onNext: 気
onNext: です
onNext: か
onNext: ？
onNext: お
onNext: 手
onNext: 伝
onNext: い
onNext: で
onNext: き
onNext: る
onNext: こ
onNext: と
onNext: が
onNext: あ
onNext: れ
onNext: ば
onNext: お
onNext: 知
onNext: ら
onNext: せ
onNext: ください
onNext: 。
onComplete: Response { content = AiMessage { text = "こんにちは！お元気ですか？お手伝いできることがあればお知らせください。" toolExecutionRequests = null }, tokenUsage = TokenUsage { inputTokenCount = 8, outputTokenCount = 28, totalTokenCount = 36 }, finishReason = STOP }
*/
```

`generate`メソッドに`StreamingResponseHandler`の実装インスタンスを渡す必要があります。トークンごとの処理を`onNext`に、出力完了時の処理を`onComplete`に、エラー発生時の処理を`onError`に実装します。

# AI Service

LangChain4jでは生成AIを使った機能の実装をより簡単にするために **AI Service** というモジュールが提供されています。AI Serviceでは会話履歴の保持やTools、RAG等の機能に対応しています。

## 質問

以下のコードでは単純に質問をするAI Service`Assistant`を作成しています。

```java
interface Assistant {
    String chat(String userMessage);
}

OpenAiChatModel model = OpenAiChatModel.withApiKey("API_KEY");
Assistant assistant = AiServices.create(Assistant.class, model);
String answer = assistant.chat("こんにちは");
```

`Assistant`というインターフェースを用意し、入力と出力を`String`とした`chat`メソッドを持たせます。

この`Assistant`は`AiServices#create`を使ってインスタンス生成することで質問ができるようになります。

LangChain4jでは`Assistant#chat`メソッドの処理内容を自動で決めてくれているわけですが、このメソッドの入出力の型のパターンによって自動で実装内容を変えてくれます。今回は、入出力ともに`String`のメソッドとなっていることから単純な質問処理をするように決めてくれています。

## システムメッセージ

`@SystemMessage`アノテーションを付与することでシステムメッセージによる指示にしたがった返答をしてくれます。

以下は質問に対して砕けた変更をしてくれるAI Service`Friend`を作成しています。

```java
interface Friend {
    @SystemMessage("あなたは私の親友です。くだけた返答をしてください。")
    String chat(String userMessage);
}

OpenAiChatModel model = OpenAiChatModel.withApiKey("API_KEY");
Friend friend = AiServices.create(Friend.class, model);
String answer = assistant.chat("こんにちは");
// おーい、どうも！何か面白いことあった？
```

## AI出力のパース

AIの返信内容から、Javaのオブジェクトに変換できます。

例えば以下のコードでは文章がどういう感情を含んでいるかの分類結果をEnumやBooleanで出力してくれるAI Service`SentimentAnalyzer`を作成しています。

```java
enum Sentiment {
    POSITIVE, NEUTRAL, NEGATIVE
}

interface SentimentAnalyzer {
    @UserMessage("次の文章の感情を分析してください： {{it}}")
    Sentiment analyzeSentimentOf(String text);

    @UserMessage("次の文章はポジティブな感情を表していますか？： {{it}}")
    boolean isPositive(String text);
}

OpenAiChatModel model = OpenAiChatModel.withApiKey("API_KEY");
SentimentAnalyzer sentimentAnalyzer = AiServices.create(SentimentAnalyzer.class, model);

Sentiment sentiment = sentimentAnalyzer.analyzeSentimentOf("これは素晴らしい！");
System.out.println(sentiment);
// POSITIVE

boolean isPositive = sentimentAnalyzer.isPositive("怖い");
System.out.println(isPositive);
// false
```

他にも独自のPOJOへのパースもしてくれます。

以下は文章に含まれる人物情報を`Person`クラスにパースしてくれるAI Service`PersonExtractor`を作成しています。

```java
record Person {
    String firstName;
    String lastName;
    LocalDate birthDate;
    Address address;
}

record Address {
    String street;
    Integer streetNumber;
    String city;
}

interface PersonExtractor {
    @UserMessage("次の文章から人物の情報を抽出してください： {{it}}")
    Person extractPersonFrom(String text);
}

OpenAiChatModel model = OpenAiChatModel.builder()
        .apiKey("API_KEY")
        .modelName(OpenAiChatModelName.GPT_3_5_TURBO)
        .responseFormat("json_object")
        .build();
PersonExtractor personExtractor = AiServices.create(PersonExtractor.class, model);

String text = """
        こんにちは私の名前は豆田豆蔵です。2024年5月1日生まれです。
        東京都新宿区西新宿二丁目1番1号 新宿三井ビルディング34階に住んでいます。
        """;

Person person = personExtractor.extractPersonFrom(text);
System.out.println(person.toString());
// Person[firstName=豆蔵, lastName=豆田, birthDate=2024-05-01, address=Address[street=西新宿二丁目, streetNumber=1, city=東京都新宿区]]
```

## Memory

`ChatMemory`を利用して過去の応答を含めて質問できます。

直近のN個のメッセージまたは、直近のNトークン分のメッセージを考慮するように設定できます。

以下では`MessageWindowChatMemory`を用いて直近10個分のメッセージを考慮して回答してくれるようにしています。

```java
ChatMemory chatMemory = MessageWindowChatMemory.withMaxMessages(10);

Assistant assistant = AiServices.builder(Assistant.class)
        .chatLanguageModel(OpenAiChatModel.withApiKey("API_KEY"))
        .chatMemory(chatMemory)
        .build();

String answer = assistant.chat("こんにちは、私の名前は豆田豆蔵です");
System.out.println(answer);
// 初めまして、豆田豆蔵さん。どのようなお仕事をされていますか？

String answerWithName = assistant.chat("私の名前がわかりますか？");
System.out.println(answerWithName);
// はい、お名前は豆田豆蔵さんですね。どのようなお話でもお聞きしますので、お気軽にどうぞ。
```

## Tools (Function Calling)

Function Callingは以下のように`@Tool`アノテーションを付けたメソッドを持つクラスを用意することで実行できます。

質問の回答内容がToolの実行を促している場合に自動で実行し、結果の再連携まで行ってくれます。

以下のコードでは足し算や平方根の計算をしてくれるAI Service`MathGenius`を作成しています。

```java
interface MathGenius {
    String ask(String question);
}

class Calculator {
    @Tool
    public double add(int a, int b) {
        return a + b;
    }

    @Tool
    public double squareRoot(double x) {
        return Math.sqrt(x);
    }
}

OpenAiChatModel model = OpenAiChatModel.withApiKey("API_KEY");
MathGenius mathGenius = AiServices.builder(MathGenius.class)
        .chatLanguageModel(model)
        .tools(new Calculator())
        .build();

String answer = mathGenius.ask("475695037565の平方根は?");
System.out.println(answer);
// 475695037565の平方根は約689706.49です。
```

# RAG

独自のデータに基づいた回答を生成する手法としてRAGというものが良く使われています。RAGそのものについての説明は本記事では割愛させていただきますが、LangChain4jではRAGの実装を簡単にするためのインターフェースが用意されているので紹介します。

RAGの基本的な流れを1通り実装したコードが以下になります。

```java
OpenAiChatModel model = OpenAiChatModel.withApiKey("API_KEY");

DocumentParser documentParser = new ApacheTikaDocumentParser();
Document document = FileSystemDocumentLoader.loadDocument("DOCUMENT_PATH", documentParser);

DocumentSplitter splitter = DocumentSplitters.recursive(300, 0);

EmbeddingModel embeddingModel = new BgeSmallEnV15QuantizedEmbeddingModel();

EmbeddingStore<TextSegment> embeddingStore = new InMemoryEmbeddingStore<>();

EmbeddingStoreIngestor ingestor = EmbeddingStoreIngestor.builder()
        .documentSplitter(splitter)
        .embeddingModel(embeddingModel)
        .embeddingStore(embeddingStore)
        .build();

ingestor.ingest(document);

ContentRetriever contentRetriever = EmbeddingStoreContentRetriever.builder()
        .embeddingStore(embeddingStore)
        .embeddingModel(embeddingModel)
        .maxResults(2)
        .minScore(0.5)
        .build();

ChatMemory chatMemory = MessageWindowChatMemory.withMaxMessages(10);

var assistant = AiServices.builder(Assistant.class)
        .chatLanguageModel(model)
        .contentRetriever(contentRetriever)
        .chatMemory(chatMemory)
        .build();

String answer = assistant.chat("質問文");
System.out.println(answer);
```

`DocumentParser`はファイルのテキスト情報を抽出するためのインターフェースです。テキストファイルだけでなく、pdfやPowerPoint等にも対応しています。

`DocumentLoader`はファイル読み込むを行うインターフェースです。他にもAWS S3やAzure blobからの読込みにも対応しています。

`DocumentSplitter`は テキストをチャンクに分割するためのインターフェースです。何文字ごとに分割するか、チャンク同士は何文字重複させるかの設定ができます。

`EmbeddingModel`はテキストをベクトルに変換するモデルを表すインターフェースです。ローカルで処理してくれるモデルや、OpenAI等の公開モデルを利用できます。

`EmbeddingStore`はベクトルデータを保存するデータソースを表すインターフェースです。メモリに保存するだけもできますし、他にPostgreSQLやRedisなど多くのDBに対応しています。

`EmbeddingStoreIngestor`を使うことでドキュメントをテキストのチャンクごとに分割してベクトル変換したものをベクトルストアに保存してくれます。

`ContentRetriever`には、質問文をベクトル変換する埋めこみモデルと、検索するベクトルストアを指定します。

必要なモジュールが結構ありますが、それでもRAGに必要な処理の大部分を手実装しなくて済むようになっていると思います。


# 応用RAG

RAGの工程を分解し、各工程に工夫を加えることで回答精度を向上させる方法がいろいろ考案されています。

LangChain4jでは分解された工程ごとにインターフェースが用意されており、RAGの精度向上手法を実装しやすくなっております。

次のページにある概念図も見るとRAGの工程分解のイメージがつきやすいと思います。

[LangChain4j Advanced RAG](https://docs.langchain4j.dev/tutorials/rag#advanced-rag)

- QueryTransformer
  - ベクトルストアの検索クエリの変換
  - 使用例　Query Compression(過去の会話履歴を検索クエリに適した単体の質問に言い換える)
- QueryRouter
  - 検索するベクトルストアが複数あった場合に、どのベクトルストアを検索するか選択する
  - 使用例　Query Routing, 検索処理のスキップ
- ContentAggregator
  - 取り出したデータの集約処理
  - 使用例　Re-rank(取り出されたチャンクを、質問文との関連度の高い順に並べ直す)
- ContentInjector
  - 取り出したデータへの情報付与
  - 使用例　メタデータ(取得ドキュメント名、分割インデックス)の付与

[実装例](https://github.com/langchain4j/langchain4j-examples/tree/main/rag-examples/src/main/java/_3_advanced)も多く用意されていて理解に助かります。

# さいごに

使ってみた感想としましては、Function CallingやRAGの実装が簡単にできてとても助かるなと思いました。

今回は質問にはOpenAIの公開APIを利用しましたが、他のAzure OpenAIやAmazon Bedrock等のサービスも試してみたいなと思いました。

LangChain4jのGithubのコミットを見た感じ開発がまだまだ盛んに行われているようなので今後の発展も追っていきたいなと思いました。