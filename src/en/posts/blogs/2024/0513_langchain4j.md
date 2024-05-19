---
title: Trying Out LangChain4j, the Java Library for LangChain
author: kotaro-miura
date: 2024-05-13T00:00:00.000Z
tags:
  - RAG
  - OpenAI
  - GPT
  - LangChain
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/05/13/langchain4j/).
:::



# Introduction

Hello. This is Miura from the Digital Strategy Support Division.

This time, I would like to introduce **LangChain4j**, the Java library for LangChain, which I have tried out.

LangChain is a framework that consolidates useful features for application development using LLM (Large Language Models). It supports many features such as utilizing various language models with a unified interface, prompt templates, conversation history storage, embeddings, and connections to vector DBs. LangChain is provided as libraries for various programming languages, with Python and JavaScript/TypeScript being particularly popular. However, since I often use Java personally, I decided to try out the LangChain library for Java this time.

There seem to be several open-source LangChain libraries for Java, but I would like to use [LangChain4j](https://docs.langchain4j.dev/), which is the most popular in the Maven repository.

# Package

Import the following package.

```xml
<dependency>
  <groupId>dev.langchain4j</groupId>
  <artifactId>langchain4j</artifactId>
  <version>0.30.0</version>
</dependency>
```

If you are using OpenAI's API for questions, you will need the following package.
```xml
<dependency>
  <groupId>dev.langchain4j</groupId>
  <artifactId>langchain4j-open-ai</artifactId>
  <version>0.30.0</version>
</dependency>
```

:::info
If you are using other generative AI services such as Azure OpenAI, Amazon Bedrock, or Anthropic, you need to import the necessary packages for each. You can check the list of supported services at the following link.
[Supported LLM Integrations](https://github.com/langchain4j#supported-llm-integrations-docs)
:::

# Asking the Chat Model

The simplest code to ask the chat model is as follows.

```java
OpenAiChatModel model = OpenAiChatModel.withApiKey("API_KEY");
String answer = model.generate("こんにちは");
System.out.println(answer);
// こんにちは！何かお手伝いできることはありますか？
```

By default, it asks the gpt-3.5-turbo model.

To specify the model and other parameters, use the builder method as follows.

```java
OpenAiChatModel model = OpenAiChatModel.builder()
        .apiKey("API_KEY")
        .modelName(OpenAiChatModelName.GPT_3_5_TURBO)
        .build();
String answer = model.generate("こんにちは");
```
You can also ask questions including past responses as follows.

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

# Stream Output

To stream the response content token by token, the code is as follows.

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

/* Output result
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

You need to pass an implementation instance of `StreamingResponseHandler` to the `generate` method. Implement the processing for each token in `onNext`, the processing when output is complete in `onComplete`, and the processing when an error occurs in `onError`.

# AI Service

LangChain4j provides a module called **AI Service** to make it easier to implement features using generative AI. AI Service supports features such as conversation history retention, Tools, and RAG.

## Question

The following code creates an AI Service `Assistant` that simply asks questions.

```java
interface Assistant {
    String chat(String userMessage);
}

OpenAiChatModel model = OpenAiChatModel.withApiKey("API_KEY");
Assistant assistant = AiServices.create(Assistant.class, model);
String answer = assistant.chat("こんにちは");
```

Prepare an interface called `Assistant` and let it have a `chat` method with `String` as input and output.

This `Assistant` can ask questions by creating an instance using `AiServices#create`.

LangChain4j automatically determines the processing content of the `Assistant#chat` method, and the implementation content changes automatically depending on the input and output type patterns of this method. This time, since the method has both input and output as `String`, it is determined to perform simple question processing.

## System Message

By adding the `@SystemMessage` annotation, it will respond according to the instructions in the system message.

The following creates an AI Service `Friend` that gives casual responses to questions.

```java
interface Friend {
    @SystemMessage("You are my best friend. Please give casual responses.")
    String chat(String userMessage);
}

OpenAiChatModel model = OpenAiChatModel.withApiKey("API_KEY");
Friend friend = AiServices.create(Friend.class, model);
String answer = assistant.chat("こんにちは");
// おーい、どうも！何か面白いことあった？
```

## Parsing AI Output

You can convert the content of AI responses into Java objects.

For example, the following code creates an AI Service `SentimentAnalyzer` that outputs the classification results of the emotions contained in a sentence as Enum or Boolean.

```java
enum Sentiment {
    POSITIVE, NEUTRAL, NEGATIVE
}

interface SentimentAnalyzer {
    @UserMessage("Please analyze the sentiment of the following sentence: {{it}}")
    Sentiment analyzeSentimentOf(String text);

    @UserMessage("Does the following sentence express positive sentiment?: {{it}}")
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

It can also parse into custom POJOs.

The following creates an AI Service `PersonExtractor` that parses the person information contained in a sentence into the `Person` class.

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
    @UserMessage("Please extract the person information from the following sentence: {{it}}")
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

You can ask questions including past responses using `ChatMemory`.

You can set it to consider the last N messages or the last N tokens of messages.

The following uses `MessageWindowChatMemory` to consider the last 10 messages when answering.

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

Function Calling can be executed by preparing a class with methods annotated with `@Tool`.

If the response content of the question prompts the execution of a Tool, it will automatically execute and relay the results.

The following code creates an AI Service `MathGenius` that performs addition and square root calculations.

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

String answer = mathGenius.ask("What is the square root of 475695037565?");
System.out.println(answer);
// The square root of 475695037565 is approximately 689706.49.
```

# RAG

RAG is often used as a method to generate responses based on proprietary data. Although the explanation of RAG itself is omitted in this article, LangChain4j provides interfaces to simplify the implementation of RAG, so I will introduce them.

The following code implements the basic flow of RAG.

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

String answer = assistant.chat("Question text");
System.out.println(answer);
```

`DocumentParser` is an interface for extracting text information from files. It supports not only text files but also pdfs, PowerPoints, etc.

`DocumentLoader` is an interface for loading files. It also supports loading from AWS S3 and Azure blob.

`DocumentSplitter` is an interface for splitting text into chunks. You can set how many characters to split and how many characters to overlap between chunks.

`EmbeddingModel` is an interface that represents a model that converts text into vectors. It can use models that process locally or public models such as OpenAI.

`EmbeddingStore` is an interface that represents a data source that stores vector data. It can be stored in memory, and it also supports many DBs such as PostgreSQL and Redis.

By using `EmbeddingStoreIngestor`, it splits the document into text chunks, converts them into vectors, and stores them in the vector store.

Specify the embedding model that converts the question text into vectors and the vector store to search in `ContentRetriever`.

Although there are quite a few necessary modules, I think it makes it possible to avoid implementing most of the processes required for RAG manually.

# Advanced RAG

Various methods have been devised to improve the accuracy of responses by breaking down the RAG process and adding ingenuity to each process.

LangChain4j provides interfaces for each decomposed process, making it easier to implement methods to improve RAG accuracy.

The conceptual diagram on the next page may help you get an image of the decomposition of the RAG process.

[LangChain4j Advanced RAG](https://docs.langchain4j.dev/tutorials/rag#advanced-rag)

- QueryTransformer
  - Transforming search queries for the vector store
  - Example usage: Query Compression (rephrasing past conversation history into a single question suitable for the search query)
- QueryRouter
  - Selecting which vector store to search when there are multiple vector stores
  - Example usage: Query Routing, skipping the search process
- ContentAggregator
  - Aggregating the extracted data
  - Example usage: Re-rank (reordering the extracted chunks in order of relevance to the question text)
- ContentInjector
  - Adding information to the extracted data
  - Example usage: Adding metadata (document name, split index)

[Implementation examples](https://github.com/langchain4j/langchain4j-examples/tree/main/rag-examples/src/main/java/_3_advanced) are also provided, which helps in understanding.

# Conclusion

My impression after trying it out is that it is very helpful to be able to easily implement Function Calling and RAG.

This time, I used OpenAI's public API for questions, but I would like to try other services such as Azure OpenAI and Amazon Bedrock.

Looking at the commits on LangChain4j's GitHub, it seems that development is still actively ongoing, so I would like to keep an eye on future developments.
