---
title: Spring Expression Language(SpEL)ではできないことに抗ってみた～ラムダ式書きたい！複数ステップ書きたい！
author: yuji-kurabayashi
date: 2023-09-22
tags: [ spring, spring-boot ]
---

# 背景

## Spring Expression Language(SpEL)とは

[Spring Expression Language](https://spring.pleiades.io/spring-framework/reference/core/expressions.html)(以降は省略して「SpEL」と記載します)は、Spring Framework基盤を担う強力な式言語です。文字列テンプレートとしても機能します。Spring Frameworkを採用しているプロジェクトでは、何かしらかの形で触れる機会が多いのではと思います。言わずもがなSpELはとても便利ですが、以下の制限事項があります。

## SpELの制限事項

下記についてはSpELでは実現できません。どうしても下記をSpELで利用したい場合は、下記に該当する処理をわざわざ1つのメソッドに切り出して、SpELからそのメソッドを呼び出すようにしなければなりません。

### 1. ラムダ式を評価できない

ラムダ式を使いたいと思ったことはないでしょうか？
SpELにはラムダ式を評価する機能がないため、記述してもパースエラーになってしまいます。そして、ラムダ式を併用することが多いStream APIも利用がかなり制限されます。SpELではコレクションに対して、[フィルタリング](https://spring.pleiades.io/spring-framework/reference/core/expressions/language-ref/collection-selection.html)と[変換](https://spring.pleiades.io/spring-framework/reference/core/expressions/language-ref/collection-projection.html)を行う機能がありますが、やはりこれだけではやれることに限りがあって、Stream APIと比べると物足りないです。

### 2. 記述は1ステップのみ

1ステップで処理を書けなくて、あと数ステップだけでいいから書かせてほしいと思ったことはないでしょうか？
SpELでは複数ステップ記述に近しいものとして、[三項演算子](https://spring.pleiades.io/spring-framework/reference/core/expressions/language-ref/operator-ternary.html)や[エルビス演算子](https://spring.pleiades.io/spring-framework/reference/core/expressions/language-ref/operator-elvis.html)がありますが、あくまで分岐処理としてしか利用できません。

## SpELの制限事項をなんとかしたい

私は過去にフレームワークを作っていたことがあり、是非ともSpELを生かしたいと考えていました。しかし、上記の制限事項があるためSpELを導入しても少々不便さを感じていました。情報を検索してみても「できない」という情報しか見当たりません。試しにChatGPTに聞いてみたらなんと「できます」とお返事がありました！`#{ (param1, param2) -> param1 + param2 }` もしこれで動作するなら苦労しませんし、私は本稿を執筆していませんね。残念です。それでも何とかできないかと考えていたら、ちょっとしたアイデアを閃きました。
そこで、本稿ではSpELに関する解説を交えながら、上記の制限事項を実際に乗り越えた方法について解説します。
おそらくこんなおかしなことを思いついて試そうとするのは私だけなのではないかと思います。興味のある方はお付き合いくださいませ。

# 準備

## 環境準備

Spring Frameworkを基盤とするプロジェクトであれば、追加で必要になるライブラリ等は特にありません。利便性のためにLombokを使っているぐらいです。
動作確認用のプロジェクトを用意する場合は、[Spring Initializr](https://start.spring.io/)の「ADD DEPENDENCIES」でLombokを追加してプロジェクトを用意すると簡単です。なお、本稿を執筆するにあたって、Java20 & Spring Boot 3.1.3 の環境で動作確認しています。

# 実装

SpELにラムダ式や複数ステップの解釈機能を追加するために、おそらくSpring Frameworkを改造するのではないかと想像されたのではないでしょうか。改造と聞くと身構えてしまって導入を躊躇ってしまうかもしれませんが、実はこのアイデアでは何も改造をしません。制限事項の範囲内で同等のことをできるようにするという方法なので、導入しやすいと思います。

## 0. SpELを評価する機能を用意する

### SpEL評価クラス

何はともあれ、まずはSpELを評価する機能を用意します。

```java
@Value
@Builder
public class SpelEvaluator {

  private static final ParserContext PARSER_CONTEXT = new TemplateParserContext();

  private static final ExpressionParser EXPRESSION_PARSER = new SpelExpressionParser();

  @Builder.Default
  ParserContext parserContext = PARSER_CONTEXT;

  @Builder.Default
  ExpressionParser expressionParser = EXPRESSION_PARSER;

  BeanResolver beanResolver;

  public <T> T evaluate(String spel, Object rootObject, Map<String, Object> variables) {
    StandardEvaluationContext evaluationContext = new StandardEvaluationContext(rootObject);
    if (!CollectionUtils.isEmpty(variables)) {
      evaluationContext.setVariables(variables);
    }
    if (beanResolver != null) {
      evaluationContext.setBeanResolver(beanResolver);
    }
    return evaluate(spel, evaluationContext);
  }

  @SuppressWarnings("unchecked")
  public <T> T evaluate(String spel, EvaluationContext evaluationContext) {
    Expression expression = expressionParser.parseExpression(spel, parserContext);
    return (T) expression.getValue(evaluationContext);
  }
}
```

#### コーディングポイント

[公式ページ](https://spring.pleiades.io/spring-framework/reference/core/expressions/evaluation.html)に書いてあるコードなどを参考にしながら用意しました。そして、下記によってSpEL評価をする上での設定や振る舞いをカスタマイズできるため、これらを受け入れられる作りにしました。

* `ParserContext`

   詳細は[式テンプレート](https://spring.pleiades.io/spring-framework/reference/core/expressions/language-ref/templating.html)参照。
   `TemplateParserContext`を使って、SpELであることを表す囲い文字（デフォルトで`#{`と`}`）を変更できます。

* `ExpressionParser`

   詳細は[パーサー構成](https://spring.pleiades.io/spring-framework/reference/core/expressions/evaluation.html#expressions-parser-configuration)参照。
   `SpelExpressionParser`に対して`SpelParserConfiguration`を使って設定します。配列やリストをSpELで参照する際に、存在しないインデックスが指定されると自動的に指定インデックスまでサイズを拡張した配列やリストを生成する設定や、SpELのコンパイルについての設定ができます。

* `EvaluationContext`

   詳細は[EvaluationContext理解する](https://spring.pleiades.io/spring-framework/reference/core/expressions/evaluation.html#expressions-evaluation-context)参照。
   beanを参照できるようにしたいので、`StandardEvaluationContext`を使って`BeanResolver`の設定ができるようにしてあります。その他に、プロパティアクセスなどの記法に関する設定等ができます。

:::column:static finalなメンバ
デフォルト実装として用意している`TemplateParserContext`や`SpelExpressionParser`のクラスの実装コードを読んでみたら不変クラスでした。
不変クラスはスレッドセーフであるため、シングルトンでインスタンスを保持して使いまわしています。
:::

### SpEL評価クラスbean定義

そして、SpEL評価クラスをbean定義します。

```java
@Configuration
public class BeanConfig {

  @Bean("spel")
  public SpelEvaluator spelEvaluator(ApplicationContext applicationContext) {
    return SpelEvaluator.builder().beanResolver(new BeanFactoryResolver(applicationContext)).build();
  }
}
```

#### コーディングポイント

* bean名称はわかりやすく

   SpEL評価クラスをbean化する理由は、本稿のテーマを実現するために自身をbean参照して利用するためです。ここでは、`@Bean("spel")`のように、明示的にbean名を付けます。随所で使いやすくしておきたいため、短くてわかりやすい名称が望ましいです。もちろん、他に同一名称のbean名が使われておらずユニークである名称にしてください。

* BeanResolverはApplicationContextを使って用意する

   そして、ただbean化しただけでは、SpEL評価クラスで明示的にSpELを評価する際にbeanを参照できるようにはなりません。BeanResolverを`new BeanFactoryResolver(applicationContext)`で用意することがポイントです。SpEL評価時にこのBeanResolverを用いることによって、Springアプリケーションで管理されている全てのbeanを`@bean名`と記述することで参照できるようになります。上記例だと`@spel`と記述すればSpEL評価クラスをbean参照できるようになります。

:::check
公式ページの[Bean参照](https://spring.pleiades.io/spring-framework/reference/core/expressions/language-ref/bean-references.html)を読んで参考にしようとしましたが、`context.setBeanResolver(new MyBeanResolver());`の`MyBeanResolver`という名称が自前で実装を用意することを前提にしている感じがして、本当にその必要があるのか戸惑いました。そもそもSpring Frameworkでは標準機能として`@bean名`と記述することでbean参照できます。明示的にSpELを評価する際も、全く同じ使い勝手でbean参照できるようにしたいというのが私の意図するところであり理想です。そして、それを実現するための実装が既に用意されているはずであり、自前実装は不要なはずだと考えました。[`BeanResolver`](https://spring.pleiades.io/spring-framework/docs/current/javadoc-api/org/springframework/expression/BeanResolver.html)インターフェイスのドキュメントの「すべての既知の実装クラス」に[`BeanFactoryResolver`](https://spring.pleiades.io/spring-framework/docs/current/javadoc-api/org/springframework/context/expression/BeanFactoryResolver.html)が用意されているのを見て、このクラスにDIコンテナであり`BeanFactory`として機能する[`ApplicationContext`](https://spring.pleiades.io/spring-framework/docs/current/javadoc-api/org/springframework/context/ApplicationContext.html)ごと渡せばよさそうだと察しました。
:::

## 1. ラムダ式を使える機能を用意する

これ以降に説明する内容は、私のオリジナルアイデアとなります。
ラムダ式の正体は「Functional Interface型の実装クラス『インスタンス』」であることに着目しました。
この『インスタンス』を生成する手段を用意して、SpELからその手段を呼び出すことができれば解決します。

### SpEL評価クラス

先ほど用意したSpEL評価クラスに以下のメソッドを追加します。

```java
public class SpelEvaluator {

  // omitted

  public <T> Supplier<T> supplier(String spel) {
    return () -> evaluate(spel, null, null);
  }

  public <T> Predicate<T> predicate(String key, String spel) {
    return (t) -> evaluate(spel, null, Collections.singletonMap(key, t));
  }

  public <T, R> Function<T, R> function(String key, String spel) {
    return (t) -> evaluate(spel, null, Collections.singletonMap(key, t));
  }

  public <T> BinaryOperator<T> binaryOperator(String key1, String key2, String spel) {
    return (t, u) -> evaluate(spel, null, mapOfNullable(key1, t, key2, u));
  }

  public <T> Consumer<T> consumer(String key, String spel) {
    return (t) -> evaluate(spel, null, Collections.singletonMap(key, t));
  }

  public <T, U> BiConsumer<T, U> biConsumer(String key1, String key2, String spel) {
    return (t, u) -> evaluate(spel, null, mapOfNullable(key1, t, key2, u));
  }

  private static <K, V> Map<K, V> mapOfNullable(K key1, V value1, K key2, V value2) {
    Map<K, V> map = new LinkedHashMap<>();
    map.put(key1, value1);
    map.put(key2, value2);
    return map;
  }
}
```

#### コーディングポイント

ラムダ式に渡された変数に対してkeyで指定された名前とセットにしたMapを用意します。これを先ほど用意したSpELを評価する`evaluate`メソッドに渡して、その評価結果を返す、という実装をしたFunctional Interfaceを返すメソッドをひたすら用意するだけです。
ここでは、ラムダ式の変数が無し、1つ、2つの3パターンをそれぞれ用意しました。もし他のFunctional Interfaceを追加したい場合は、上記と全く同一のシグネチャーかつ同一のコードを変数の数に応じて使い分けて用意すればできます。例えば、変数無しであれば`supplier`メソッド、変数が1つであれば`predicate`・`function`・`consumer`メソッド、変数が2つであれば`binaryOperator`・`biConsumer`メソッドを真似して用意すればよいです。

* 評価に渡す変数Mapはnull値を許容しておく

   渡される変数の値がnullである可能性は十分にありえるため、null値が許容される方法でMapを生成しています。
   Java9から導入された`Map.of`シリーズは簡潔に記載できて便利ですが、null値を許容しないのでここでの利用は不適切です。

* ラムダ式の記法との親和性

   これは私のちょっとしたこだわりです。
   各メソッドシグネチャーを左から「変数名」、「SpEL」の順番にしている理由は、ラムダ式の記法（`(変数名) → 処理コード`）と似た感じで記述できるので、可読性も良くなるし書きやすいと思ったからです。
   そして、`evaluate`メソッドへ変数を渡す際も、`rootObject`に渡さずに`variables`に変数名と値をセットにしたMapを渡すことで、SpELでは変数名そのもので参照できるようになります。
   これらのこだわりによって、例えば、ラムダ式が`s -> s.toUpperCase()`だとすると、SpELでは`@spel.function('s', '#{#s.toUpperCase()}')`と書くことができます。

:::column:戻り値がない処理のSpEL評価
Functional InterfaceであるConsumerのacceptメソッドの戻り値の型はvoidであり、戻り値がありません。さて、
Q. 例えば以下のように、戻り値がないvoidメソッド呼び出しを記述したSpELを評価します。一体どうなるでしょうか？そもそも解釈されるでしょうか？実行できるでしょうか？
```java
@Value("#{T(java.lang.System).out.print('Hello, World!')}")
private String voidResult;
```
A. SpEL自体は解釈されて評価実行されます。そして、評価結果としてnullが返却されます。
「Hello, World!」とコンソールに表示されて、voidResultはnullとなります。
:::


## 2. SpELを複数ステップ記述して評価できる機能を用意する

SpELが1ステップしか書けないのであれば、その1ステップの中で複数ステップを表現して書けるようにしてしまえばよい、という発想です。
私はよくビルダーパターンを使うことが多いのですが、メソッドチェーンすることで1ステップで書けるという特徴から着想を得ました。

### 複数SpEL評価クラス

```java
@Value
@Builder
public class MultiSpelEvaluator {

  SpelEvaluator evaluator;

  List<Map.Entry<String, String>> variableNameAndSpelList;

  @SuppressWarnings("unchecked")
  public <T> T evaluate(Object rootObject) {
    Map<String, Object> results = new LinkedHashMap<>();
    Object result = null;
    for (Map.Entry<String, String> input : variableNameAndSpelList) {
      result = evaluator.evaluate(input.getValue(), rootObject, results);
      results.put(input.getKey(), result);
    }
    return (T) result;
  }

  public static class MultiSpelEvaluatorBuilder {

    public MultiSpelEvaluatorBuilder add(String variableName, String spel) {
      if (this.variableNameAndSpelList == null) {
        this.variableNameAndSpelList = new ArrayList<>();
      }
      this.variableNameAndSpelList.add(new AbstractMap.SimpleImmutableEntry<>(variableName, spel));
      return this;
    }
  }
}
```

#### コーディングポイント

とても単純な仕組みです。
下記のようなコードを書いて実行するイメージです。

```java
String a = "Hello";
String b = a + ", ";
a = b + "World";
b = a + "!";
return b; // "Hello, World!"
```

ビルダーを使って「変数名」と「SpEL」のセット（1ステップに相当）をいくつかリストに登録します。
評価メソッドでは、リストから取り出した順番で（`ArrayList`ならば登録した順番で）都度「SpEL」の評価（ステップ実行に相当）およびその評価結果を指定された「変数名」でMapに保持する、を繰り返すだけです。
なお、その評価結果は次のステップ以降の「SpEL」にて、`#変数名`と記述することでアクセス可能になります。
また、「変数名」と「SpEL」のセットで、同一の「変数名」で複数登録した場合、後勝ちで上書きされます。
そして、最終的には最後のステップの評価結果を返します。

### SpEL評価クラス

先ほど用意したSpEL評価クラスに以下のメソッドを追加します。

```java
public class SpelEvaluator {

  // omitted

  public MultiSpelEvaluator.MultiSpelEvaluatorBuilder multiSpel() {
    return MultiSpelEvaluator.builder().evaluator(this);
  }
}
```

#### コーディングポイント

複数SpEL評価クラスのビルダーを提供しているだけです。
この`multiSpel`メソッドが複数SpELを実現するメソッドチェーンの起点となります。

## 完成コード

ここでは各クラスの完成コード全体を示します。

<details>
<summary>SpEL評価クラス（ここをクリックするとコード全体を表示 or 非表示にします）</summary>

```java
package com.example.spel.util;

import lombok.Builder;
import lombok.Value;
import org.springframework.expression.BeanResolver;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.ParserContext;
import org.springframework.expression.common.TemplateParserContext;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.util.CollectionUtils;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.BinaryOperator;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;

@Value
@Builder
public class SpelEvaluator {

  private static final ParserContext PARSER_CONTEXT = new TemplateParserContext();

  private static final ExpressionParser EXPRESSION_PARSER = new SpelExpressionParser();

  @Builder.Default
  ParserContext parserContext = PARSER_CONTEXT;

  @Builder.Default
  ExpressionParser expressionParser = EXPRESSION_PARSER;

  BeanResolver beanResolver;

  public <T> T evaluate(String spel, Object rootObject, Map<String, Object> variables) {
    StandardEvaluationContext evaluationContext = new StandardEvaluationContext(rootObject);
    if (!CollectionUtils.isEmpty(variables)) {
      evaluationContext.setVariables(variables);
    }
    if (beanResolver != null) {
      evaluationContext.setBeanResolver(beanResolver);
    }
    return evaluate(spel, evaluationContext);
  }

  @SuppressWarnings("unchecked")
  public <T> T evaluate(String spel, EvaluationContext evaluationContext) {
    Expression expression = expressionParser.parseExpression(spel, parserContext);
    return (T) expression.getValue(evaluationContext);
  }

  public MultiSpelEvaluator.MultiSpelEvaluatorBuilder multiSpel() {
    return MultiSpelEvaluator.builder().evaluator(this);
  }

  public <T> Supplier<T> supplier(String spel) {
    return () -> evaluate(spel, null, null);
  }

  public <T> Predicate<T> predicate(String key, String spel) {
    return (t) -> evaluate(spel, null, Collections.singletonMap(key, t));
  }

  public <T, R> Function<T, R> function(String key, String spel) {
    return (t) -> evaluate(spel, null, Collections.singletonMap(key, t));
  }

  public <T> BinaryOperator<T> binaryOperator(String key1, String key2, String spel) {
    return (t, u) -> evaluate(spel, null, mapOfNullable(key1, t, key2, u));
  }

  public <T> Consumer<T> consumer(String key, String spel) {
    return (t) -> evaluate(spel, null, Collections.singletonMap(key, t));
  }

  public <T, U> BiConsumer<T, U> biConsumer(String key1, String key2, String spel) {
    return (t, u) -> evaluate(spel, null, mapOfNullable(key1, t, key2, u));
  }

  private static <K, V> Map<K, V> mapOfNullable(K key1, V value1, K key2, V value2) {
    Map<K, V> map = new LinkedHashMap<>();
    map.put(key1, value1);
    map.put(key2, value2);
    return map;
  }
}
```

</details>

<details>
<summary>SpEL評価クラスbean定義（ここをクリックするとコード全体を表示 or 非表示にします）</summary>

```java
package com.example.spel.util;

import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.expression.BeanFactoryResolver;

@Configuration
public class BeanConfig {

  @Bean("spel")
  public SpelEvaluator spelEvaluator(ApplicationContext applicationContext) {
    return SpelEvaluator.builder().beanResolver(new BeanFactoryResolver(applicationContext)).build();
  }
}
```

</details>

<details>
<summary>複数SpEL評価クラス（ここをクリックするとコード全体を表示 or 非表示にします）</summary>

```java
package com.example.spel.util;

import lombok.Builder;
import lombok.Value;

import java.util.AbstractMap;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Value
@Builder
public class MultiSpelEvaluator {

  SpelEvaluator evaluator;

  List<Map.Entry<String, String>> variableNameAndSpelList;

  @SuppressWarnings("unchecked")
  public <T> T evaluate(Object rootObject) {
    Map<String, Object> results = new LinkedHashMap<>();
    Object result = null;
    for (Map.Entry<String, String> input : variableNameAndSpelList) {
      result = evaluator.evaluate(input.getValue(), rootObject, results);
      results.put(input.getKey(), result);
    }
    return (T) result;
  }

  public static class MultiSpelEvaluatorBuilder {

    public MultiSpelEvaluatorBuilder add(String variableName, String spel) {
      if (this.variableNameAndSpelList == null) {
        this.variableNameAndSpelList = new ArrayList<>();
      }
      this.variableNameAndSpelList.add(new AbstractMap.SimpleImmutableEntry<>(variableName, spel));
      return this;
    }
  }
}
```

</details>

# さらなる改良

さらに改良を加えて、私個人的なこだわりを存分に反映したバージョンです。
ここまでこだわったサンプルはなかなか出てこないと思います。

* Spring Framework基盤で実際に行われているSpEL評価処理の実装ソースコードを調べて同等の実装を取り込んだ
* SpEL評価、複数SpEL評価にてvariablesおよびfunctions対応
    * この対応に伴うSpEL評価の再帰的呼び出し時にvariablesおよびfunctionsを引き継ぐ対応
* その他軽微な改善

## Spring Framework基盤で実際に行われているSpEL評価処理をどうやって特定したのか

それは失敗から学ぶことができます。しかも簡単です。
```java
@Value("#{}")
String value;
```
というフィールドをbean化するクラスに仕込んで、テストでもよいのでとにかくAPを起動するだけです。
そうすると以下のエラーログが出力されます。
```
Caused by: org.springframework.expression.ParseException: Expression [#{}] @0: No expression defined within delimiter '#{}' at character 0
	at org.springframework.expression.common.TemplateAwareExpressionParser.parseExpressions(TemplateAwareExpressionParser.java:114)
	at org.springframework.expression.common.TemplateAwareExpressionParser.parseTemplate(TemplateAwareExpressionParser.java:66)
	at org.springframework.expression.common.TemplateAwareExpressionParser.parseExpression(TemplateAwareExpressionParser.java:52)
	at org.springframework.context.expression.StandardBeanExpressionResolver.evaluate(StandardBeanExpressionResolver.java:148)
	... 106 more
```
これは`StandardBeanExpressionResolver`([document](https://spring.pleiades.io/spring-framework/docs/current/javadoc-api/org/springframework/context/expression/StandardBeanExpressionResolver.html), [source](https://github.com/spring-projects/spring-framework/blob/main/spring-context/src/main/java/org/springframework/context/expression/StandardBeanExpressionResolver.java))で評価が行われている確たる証拠です。
ソースコードを見ると、`ExpressionParser`には`SpelExpressionParser`を使っています。`ParserContext`には`TemplateParserContext`と同等のものを使っています。これらを用いてSpEL文字列から生成した`Expression`オブジェクトはキャッシュして使いまわしています。そして、`EvaluationContext`には`StandardEvaluationContext`を使っており、BeanResolverの設定などその他いろいろな設定を加えていることがわかります。`EvaluationContext`もキャッシュしていますが、今回はrootObjectやvariablesを使いたいので利用の都度異なる情報をセットして使うことになるため、このキャッシュ処理は実装には取り込みません。

:::column:おすすめ設定
`StandardEvaluationContext`の設定で個人的におすすめなのは`MapAccessor`です。SpELでキーがString型のMapの要素にアクセスする際は「マップ物理名['マップキー']」もしくは「マップ物理名.get('マップキー')」と記述する必要があります。`MapAccessor`を設定すると、上述の方法の他に「マップ物理名.マップキー」と記述してもアクセスできるようになります。JavaBeansのメンバーにアクセスする場合と同様にドット「.」繋ぎで簡潔に記述できるので、SpELではMapとJavaBeansのどちらの型であってもアクセスを同様に取り扱えるようになるので便利です。
:::

## 完成コード

<details>
<summary>SpEL評価クラス（ここをクリックするとコード全体を表示 or 非表示にします）</summary>

```java
package com.example.spel.util;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.Value;
import org.springframework.beans.factory.config.ConfigurableBeanFactory;
import org.springframework.context.expression.BeanExpressionContextAccessor;
import org.springframework.context.expression.BeanFactoryAccessor;
import org.springframework.context.expression.EnvironmentAccessor;
import org.springframework.context.expression.MapAccessor;
import org.springframework.core.convert.ConversionService;
import org.springframework.core.convert.support.DefaultConversionService;
import org.springframework.expression.BeanResolver;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.ParserContext;
import org.springframework.expression.PropertyAccessor;
import org.springframework.expression.common.TemplateParserContext;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.expression.spel.support.StandardTypeConverter;
import org.springframework.expression.spel.support.StandardTypeLocator;
import org.springframework.util.CollectionUtils;
import org.springframework.util.ConcurrentReferenceHashMap;
import org.springframework.util.StringUtils;

import java.lang.reflect.Method;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.BinaryOperator;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;

@Value
@Builder
@Getter(AccessLevel.NONE)
public class SpelEvaluator {

  public static final String DEFAULT_INHERIT_VARIABLES_KEY = "inheritVariables";

  public static final String DEFAULT_INHERIT_FUNCTIONS_KEY = "inheritFunctions";

  private static final ParserContext PARSER_CONTEXT = new TemplateParserContext();

  private static final ExpressionParser EXPRESSION_PARSER = new SpelExpressionParser();

  private static final List<PropertyAccessor> PROPERTY_ACCESSORS = List.of(
      new BeanExpressionContextAccessor(),
      new BeanFactoryAccessor(),
      new MapAccessor(),
      new EnvironmentAccessor()
  );

  @Builder.Default
  ParserContext parserContext = PARSER_CONTEXT;

  @Builder.Default
  ExpressionParser expressionParser = EXPRESSION_PARSER;

  ConfigurableBeanFactory beanFactory;

  BeanResolver beanResolver;

  @Builder.Default
  String inheritVariablesKey = DEFAULT_INHERIT_VARIABLES_KEY;

  @Builder.Default
  String inheritFunctionsKey = DEFAULT_INHERIT_FUNCTIONS_KEY;

  // StandardBeanExpressionResolverではExpressionをConcurrentHashMapでキャッシュしていましたが、
  // Spring Framework内でキャッシュとして多用されているのはConcurrentReferenceHashMapなのでこちらを用います.
  // 作成されたバージョンを見るとConcurrentReferenceHashMapが用意される前に
  // StandardBeanExpressionResolverが作られていたようなので、
  // おそらく当初の実装から差し替えていないだけであると思われます.
  Map<String, Expression> expressionCache = new ConcurrentReferenceHashMap<>(256);

  public <T> T evaluate(String spel, Map<String, Object> variables) {
    return evaluate(spel, null, variables, null);
  }

  public <T> T evaluate(String spel,
                        Object rootObject,
                        Map<String, Object> variables) {
    return evaluate(spel, rootObject, variables, null);
  }

  public <T> T evaluate(String spel,
                        Object rootObject,
                        Map<String, Object> variables,
                        Map<String, Method> functions) {
    // 引継ぎキーワードの指定があって、なおかつSpEL内に引継ぎキーワードが出現しているかどうかで
    // 引継ぎ設定を施すかどうかを判断します.
    boolean requireInheritVariables
        = StringUtils.hasText(inheritVariablesKey) && spel.contains(inheritVariablesKey);
    boolean requireInheritFunctions
        = StringUtils.hasText(inheritFunctionsKey) && spel.contains(inheritFunctionsKey);
    return evaluate(spel, createAndConfigureEvaluationContext(
        rootObject, variables, functions, requireInheritVariables, requireInheritFunctions));
  }

  @SuppressWarnings("unchecked")
  public <T> T evaluate(String spel, EvaluationContext evaluationContext) {
    // StandardBeanExpressionResolverではSpEL文字列のパース結果であるExpressionをセットにしてキャッシュしています.
    // StandardBeanExpressionResolverのコードとは異なりますが、全く同じ処理です.
    Expression expression = expressionCache.computeIfAbsent(
        spel, s -> expressionParser.parseExpression(s, parserContext));
    return (T) expression.getValue(evaluationContext);
  }

  public StandardEvaluationContext createAndConfigureEvaluationContext(Object rootObject,
                                                                       Map<String, Object> variables,
                                                                       Map<String, Method> functions,
                                                                       boolean requireInheritVariables,
                                                                       boolean requireInheritFunctions) {

    // 複数SpEL（MultiSpelEvaluator）クラスのSpEL評価メソッドの呼び出しを記述したSpELを
    // 当クラスの評価メソッドで評価する場合、SpELの入れ子評価を行うことになります.
    // その際に、当クラスの評価メソッド（親）に対して渡された引数「rootObject」と「variables」と「functions」を
    // 複数SpEL（MultiSpelEvaluator）クラスのSpEL評価メソッド（子）の引数へ引き継いでおきたいですよね.
    // そして、複数SpEL（MultiSpelEvaluator）クラスのSpEL評価メソッド（子）内部の処理では、
    // さらに当クラスの評価呼び出しメソッドを呼び出しており、そこでさらに引き継がれて再帰的に呼び出されます.
    // 「rootObject」は「#root」と記述することで引き継ぐことができますが、
    // 「variables」と「functions」の引継ぎができません.
    // そこで、この再帰呼び出しへの引継ぎを可能にするために、
    // 「variables」に対して、「variables」自身と「functions」の2つを
    // それぞれ特定のキー（inheritVariables、inheritFunctions）で丸ごと加えておいて、
    // 複数SpEL（MultiSpelEvaluator）クラスのSpEL評価メソッド（子）呼び出し時に
    // 特定のキーを指定して取り出すことで実現させます.
    // 例えば、複数SpEL（MultiSpelEvaluator）クラスのSpEL評価メソッドを
    // evaluate(#root, #inheritVariables, #inheritFunctions)
    // と記述して呼び出すことで引継ぎできるようになります.
    // この特定のキーは、元々のvariablesのMapに対して意図せぬ上書きが発生しにくくなるように、
    // 他では使わないような名称にします.
    // 他にもThreadLocalを使って引き継ぐ方法も考えられますが、この方法の方がシンプルで分かりやすいです.
    Map<String, Object> inheritVariables = (requireInheritVariables || requireInheritFunctions)
        ? (CollectionUtils.isEmpty(variables) ? new HashMap<>() : new HashMap<>(variables))
        : variables;

    if (requireInheritVariables) {
      // SpEL入れ子評価する場合のvariables引継ぎ設定
      // 値がnullの場合、StandardEvaluationContextのsetVariableメソッドでの内部処理でキーごと削除されてしまいます.
      // SpELでキーを指定した際に参照エラーになってしまうのを回避するためnullセーフ対策をしています.
      inheritVariables.put(inheritVariablesKey, variables == null ? Collections.emptyMap() : variables);
    }

    if (requireInheritFunctions) {
      // SpEL入れ子評価する場合のfunctions引継ぎ設定
      inheritVariables.put(inheritFunctionsKey, functions == null ? Collections.emptyMap() : functions);
    }

    return configureEvaluationContext(createEvaluationContext(rootObject, inheritVariables, functions));
  }

  public StandardEvaluationContext createEvaluationContext(Object rootObject,
                                                           Map<String, Object> variables,
                                                           Map<String, Method> functions) {

    // ここに指定したオブジェクトは、SpELで「#root」というキーワードでアクセスできます.
    StandardEvaluationContext context = new StandardEvaluationContext(rootObject);

    if (!CollectionUtils.isEmpty(variables)) {
      // SpELで「#登録した名称」と書くことでMap値にアクセスできるようになります.
      // 登録した名称とは、ここではメソッド引数variablesのMapキーということになります.
      variables.forEach(context::setVariable);
    }

    if (!CollectionUtils.isEmpty(functions)) {
      // staticメソッドはSpELにて「T(FQCN).メソッド名(カンマ「,」区切りで引数列挙)」と記述すれば呼び出せます.
      // しかし、FQCN部分の記述量が長くなりがちで、これが何度も出てくると煩わしいです.
      // そこで、registerFunctionを使ってMethodを登録しておくと、
      // 「#登録した名称(カンマ「,」区切りで引数列挙)」のように簡略化した記述で呼び出せるようになります.
      // 登録した名称とは、ここではメソッド引数functionsのMapキーということになります.
      functions.forEach(context::registerFunction);
    }

    return context;
  }

  /**
   * @see org.springframework.context.expression.StandardBeanExpressionResolver#evaluate(String,
   * org.springframework.beans.factory.config.BeanExpressionContext)
   */
  public StandardEvaluationContext configureEvaluationContext(StandardEvaluationContext context) {
    // ここでは、Spring Framework基盤におけるSpEL評価で用いられている
    // StandardBeanExpressionResolverクラスで行っている
    // StandardEvaluationContextへの設定と同等の設定を行っています.
    // ここでは不変クラスであると断言できるもののみシングルトンで保持して使いまわしています.
    // 各PropertyAccessorクラスは状態を持っていないため不変クラスです.
    PROPERTY_ACCESSORS.forEach(context::addPropertyAccessor);
    if (beanResolver != null) {
      context.setBeanResolver(beanResolver);
    }
    if (beanFactory != null) {
      context.setTypeLocator(new StandardTypeLocator(beanFactory.getBeanClassLoader()));
      context.setTypeConverter(new StandardTypeConverter(() -> {
        ConversionService cs = beanFactory.getConversionService();
        return (cs != null ? cs : DefaultConversionService.getSharedInstance());
      }));
    }
    return context;
  }

  public MultiSpelEvaluator.MultiSpelEvaluatorBuilder multiSpel() {
    return MultiSpelEvaluator.builder().evaluator(this);
  }

  public <T> Supplier<T> supplier(String spel) {
    return () -> evaluate(spel, Collections.emptyMap());
  }

  // 各Functional Interfaceに対してパラメータ引継ぎ用のメソッドを追加しています.
  public <T> Supplier<T> supplier(String spel,
                                  Object rootObject,
                                  Map<String, Object> variables,
                                  Map<String, Method> functions) {
    return () -> evaluate(spel, rootObject, variables, functions);
  }

  public <T> Predicate<T> predicate(String key, String spel) {
    return (t) -> evaluate(spel, Collections.singletonMap(key, t));
  }

  public <T> Predicate<T> predicate(String key, String spel,
                                    Object rootObject,
                                    Map<String, Object> variables,
                                    Map<String, Method> functions) {
    return (t) -> evaluate(spel, rootObject, addMap(variables, key, t), functions);
  }

  public <T, R> Function<T, R> function(String key, String spel) {
    return (t) -> evaluate(spel, Collections.singletonMap(key, t));
  }

  public <T, R> Function<T, R> function(String key, String spel,
                                        Object rootObject,
                                        Map<String, Object> variables,
                                        Map<String, Method> functions) {
    return (t) -> evaluate(spel, rootObject, addMap(variables, key, t), functions);
  }

  public <T> BinaryOperator<T> binaryOperator(String key1, String key2, String spel) {
    return (t, u) -> evaluate(spel, mapOfNullable(key1, t, key2, u));
  }

  public <T> BinaryOperator<T> binaryOperator(String key1, String key2, String spel,
                                              Object rootObject,
                                              Map<String, Object> variables,
                                              Map<String, Method> functions) {
    return (t, u) -> evaluate(spel, rootObject, addMap(variables, key1, t, key2, u), functions);
  }

  public <T> Consumer<T> consumer(String key, String spel) {
    return (t) -> evaluate(spel, Collections.singletonMap(key, t));
  }

  public <T> Consumer<T> consumer(String key, String spel,
                                  Object rootObject,
                                  Map<String, Object> variables,
                                  Map<String, Method> functions) {
    return (t) -> evaluate(spel, rootObject, addMap(variables, key, t), functions);
  }

  public <T, U> BiConsumer<T, U> biConsumer(String key1, String key2, String spel) {
    return (t, u) -> evaluate(spel, mapOfNullable(key1, t, key2, u));
  }

  public <T, U> BiConsumer<T, U> biConsumer(String key1, String key2, String spel,
                                            Object rootObject,
                                            Map<String, Object> variables,
                                            Map<String, Method> functions) {
    return (t, u) -> evaluate(spel, rootObject, addMap(variables, key1, t, key2, u), functions);
  }

  private static <K, V> Map<K, V> mapOfNullable(K key1, V value1, K key2, V value2) {
    Map<K, V> map = new HashMap<>();
    map.put(key1, value1);
    map.put(key2, value2);
    return map;
  }

  private static <K, V> Map<K, V> addMap(Map<K, V> map, K key, V value) {
    Map<K, V> mutableMap = CollectionUtils.isEmpty(map) ? new HashMap<>() : new HashMap<>(map);
    mutableMap.put(key, value);
    return mutableMap;
  }

  private static <K, V> Map<K, V> addMap(Map<K, V> map, K key1, V value1, K key2, V value2) {
    Map<K, V> mutableMap = CollectionUtils.isEmpty(map) ? new HashMap<>() : new HashMap<>(map);
    mutableMap.put(key1, value1);
    mutableMap.put(key2, value2);
    return mutableMap;
  }
}
```

</details>

<details>
<summary>SpEL評価クラスbean定義（ここをクリックするとコード全体を表示 or 非表示にします）</summary>

```java
package com.example.spel.util;

import org.springframework.beans.factory.config.ConfigurableBeanFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.expression.BeanFactoryResolver;

@Configuration
public class BeanConfig {

  // 実装の便宜上、引数をApplicationContextから型をConfigurableBeanFactoryに変更しました.
  // 型をどちらにしていてもDIコンテナそのものがDIされることに変わりありません.
  @Bean("spel")
  public SpelEvaluator spelEvaluator(ConfigurableBeanFactory beanFactory) {
    return SpelEvaluator.builder()
        .beanFactory(beanFactory)
        // ここでは、Spring Framework基盤におけるSpEL評価で用いられている
        // StandardBeanExpressionResolverクラスで行っている
        // StandardEvaluationContextへの設定と同等の設定となるようにBeanResolverを用意しています.
        // やはりBeanFactoryResolverにDIコンテナをセットする使い方で合っていたようです.
        .beanResolver(new BeanFactoryResolver(beanFactory))
        .build();
  }
}
```

</details>

<details>
<summary>複数SpEL評価クラス（ここをクリックするとコード全体を表示 or 非表示にします）</summary>

```java
package com.example.spel.util;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.Value;
import org.springframework.util.CollectionUtils;

import java.lang.reflect.Method;
import java.util.AbstractMap;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Value
@Builder
@Getter(AccessLevel.NONE)
public class MultiSpelEvaluator {

  SpelEvaluator evaluator;

  List<Map.Entry<String, String>> variableNameAndSpelList;

  public <T> T evaluate(Object rootObject) {
    return evaluate(rootObject, null, null);
  }

  @SuppressWarnings("unchecked")
  public <T> T evaluate(Object rootObject,
                        Map<String, Object> variables,
                        Map<String, Method> functions) {
    Map<String, Object> results = CollectionUtils.isEmpty(variables)
        ? new HashMap<>() : new HashMap<>(variables);
    Object result = null;
    for (Map.Entry<String, String> input : variableNameAndSpelList) {
      result = evaluator.evaluate(input.getValue(), rootObject, results, functions);
      results.put(input.getKey(), result);
    }
    return (T) result;
  }

  public static class MultiSpelEvaluatorBuilder {

    public MultiSpelEvaluatorBuilder add(String variableName, String spel) {
      if (this.variableNameAndSpelList == null) {
        this.variableNameAndSpelList = new ArrayList<>();
      }
      this.variableNameAndSpelList.add(new AbstractMap.SimpleImmutableEntry<>(variableName, spel));
      return this;
    }

    private MultiSpelEvaluatorBuilder variableNameAndSpelList(
        List<Map.Entry<String, String>> variableNameAndSpelList) {
      throw new UnsupportedOperationException();
    }

    public MultiSpelEvaluator build() {
      return new MultiSpelEvaluator(this.evaluator, Collections.unmodifiableList(this.variableNameAndSpelList));
    }
  }
}
```

</details>

# 検証

テストコードを書いて、実際に使ってみて検証してみます。

## 完成テストコード

いきなりですが、完成テストコード全体を示します。

<details open>
<summary>テストクラス（ここをクリックするとコード全体を表示 or 非表示にします）</summary>

「1. SpEL内でラムダ式を使いたい」で行っていることを複数ステップにばらしたものが「2. 複数SpELを使いたい」になっています。
「2. 複数SpELを使いたい」に対してさらにvariablesとfunctions引継ぎを使ったのもが「3. 複数SpELを使いたい（variablesやfunctionを引き継いで使いたい）」になっています。
複数SpELを利用する際の`add`メソッドに渡しているSpEL文字列には二重エスケープが必要なので、少々書きっぷりがうるさくなってしまいますね。
Streamの終端操作に`reduce`を使っていますが、`Collectors.joining(" ")`とするほうがスマートです。しかし、ラムダ式を何とかしてみせることが本稿の目的なのでここではわざと利用しています。悪しからず。
余談ですが、文字列リテラルのテキストブロック対応のおかげで長い文字列が書きやすくてありがたいですね。

```java
package com.example.spel.util;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.util.ReflectionUtils;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.BiFunction;
import java.util.stream.Stream;

@SpringBootTest
@ExtendWith(SpringExtension.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class SpelEvaluatorTest {

  // @Valueアノテーション内のSpELから参照できるようにするために意図的にpublicにしてあります
  public static final List<String> TEST_DATA
      = List.of("hello,", "spring", "expression", "language", "(spel)!");

  public static final Map<String, Object> TEST_VARIABLES = Map.of(
      "list", List.of("hello,", "spring", "expression", "language", "(spel)!")
  );

  public static final Map<String, Method> TEST_FUNCTIONS = Map.of("concat",
      ReflectionUtils.findMethod(SpelEvaluatorTest.class, "concatWithSpace", String.class, String.class));

  public static String concatWithSpace(String s1, String s2) {
    return s1 + " " + s2;
  }

  @Autowired
  private SpelEvaluator evaluator;

  // 1. SpEL内でlambda式を使いたい
  @Value("""
      #{T(com.example.spel.util.SpelEvaluatorTest).TEST_DATA.stream()
      .map(@spel.function('s', '#{#s.toUpperCase()}'))
      .reduce(@spel.binaryOperator('a', 'v', '#{#a + '' '' + #v}'))
      .get()}""")
  private String valueAnnotationEvaluatedValue1;

  // 2. 複数SpELを使いたい
  @Value("""
      #{@spel.multiSpel()
      .add('stream1', '#{#root.stream()}')
      .add('stream2', '#{#stream1.map(@spel.function(''s'', ''#{#s.toUpperCase()}''))}')
      .add('optional',
      '#{#stream2.reduce(@spel.binaryOperator(''a'', ''v'', ''#{#a + '''' '''' + #v}''))}')
      .add('result', '#{#optional.get()}')
      .build()
      .evaluate(T(com.example.spel.util.SpelEvaluatorTest).TEST_DATA)}""")
  private String valueAnnotationEvaluatedValue2;

  // 3. 複数SpELを使いたい（variablesやfunctionを引き継いで使いたい）
  @Value("""
      #{@spel.multiSpel()
      .add('stream1', '#{#list.stream()}')
      .add('stream2', '#{#stream1.map(@spel.function(''s'', ''#{#s.toUpperCase()}''))}')
      .add('optional', '#{#stream2.reduce(@spel.binaryOperator
      (''a'', ''v'', ''#{#concat(#a, #v)}'', #root, #inheritVariables, #inheritFunctions))}')
      .add('result', '#{#optional.get()}')
      .build()
      .evaluate(null,
      T(com.example.spel.util.SpelEvaluatorTest).TEST_VARIABLES,
      T(com.example.spel.util.SpelEvaluatorTest).TEST_FUNCTIONS)}""")
  private String valueAnnotationEvaluatedValue3;

  @DisplayName("testEvaluate")
  @ParameterizedTest(name = "{0}")
  @MethodSource("testEvaluateParameterProvider")
  void testEvaluate(String display,
                    String spel,
                    Object root,
                    Map<String, Object> variables,
                    Map<String, Method> functions,
                    BiFunction<Object, Map<String, Object>, ?> expectedProcess,
                    String valueAnnotationEvaluatedValue,
                    Object expectedResult) {
    // プログラム的に明示的に行ったSpEL文字列評価結果の検証
    Assertions.assertEquals(expectedResult, evaluator.evaluate(spel, root, variables, functions));
    // 参考までにSpEL文字列相当の実コードをBiFunctionに封じ込めて実行した結果
    Assertions.assertEquals(expectedResult, expectedProcess.apply(root, variables));
    // @Valueアノテーション内のSpEL文字列評価結果（＝フィールドにバインドされた値）の検証
    Assertions.assertEquals(expectedResult, valueAnnotationEvaluatedValue);
  }

  @SuppressWarnings("unchecked")
  Stream<Arguments> testEvaluateParameterProvider() {
    return Stream.of(
        Arguments.of(
            "1. SpEL内でlambda式を使いたい", // display
            """
                #{#root.stream()
                .map(@spel.function('s', '#{#s.toUpperCase()}'))
                .reduce(@spel.binaryOperator('a', 'v', '#{#a + '' '' + #v}'))
                .get()}""", // spel
            TEST_DATA, // root
            null, // variables
            null, // functions
            (BiFunction<Object, Map<String, Object>, ?>) (root, variables) ->
                ((List<String>) root).stream()
                    .map(s -> s.toUpperCase())
                    .reduce((a, v) -> a + " " + v)
                    .get(), // expectedProcess
            this.valueAnnotationEvaluatedValue1, // valueAnnotationEvaluatedValue
            "HELLO, SPRING EXPRESSION LANGUAGE (SPEL)!" // expectedResult
        ),
        Arguments.of(
            "2. 複数SpELを使いたい", // display
            """
                #{@spel.multiSpel()
                .add('stream1', '#{#root.stream()}')
                .add('stream2', '#{#stream1.map(@spel.function(''s'', ''#{#s.toUpperCase()}''))}')
                .add('optional',
                '#{#stream2.reduce(@spel.binaryOperator(''a'', ''v'', ''#{#a + '''' '''' + #v}''))}')
                .add('result', '#{#optional.get()}')
                .build()
                .evaluate(#root)}""", // spel
            TEST_DATA, // root
            null, // variables
            null, // functions
            (BiFunction<Object, Map<String, Object>, ?>) (root, variables) ->
            {
              Stream<String> stream1 = ((List<String>) root).stream();
              Stream<String> stream2 = stream1.map(s -> s.toUpperCase());
              Optional<String> optional = stream2.reduce((a, v) -> a + " " + v);
              String result = optional.get();
              return result;
            }, // expectedProcess
            this.valueAnnotationEvaluatedValue2, // valueAnnotationEvaluatedValue
            "HELLO, SPRING EXPRESSION LANGUAGE (SPEL)!" // expectedResult
        ),
        Arguments.of(
            "3. 複数SpELを使いたい（variablesやfunctionを引き継いで使いたい）", // display
            """
                #{@spel.multiSpel()
                .add('stream1', '#{#list.stream()}')
                .add('stream2', '#{#stream1.map(@spel.function(''s'', ''#{#s.toUpperCase()}''))}')
                .add('optional', '#{#stream2.reduce(@spel.binaryOperator
                (''a'', ''v'', ''#{#concat(#a, #v)}'', #root, #inheritVariables, #inheritFunctions))}')
                .add('result', '#{#optional.get()}')
                .build()
                .evaluate(#root, #inheritVariables, #inheritFunctions)}""", // spel
            null, // root
            TEST_VARIABLES, // variables
            TEST_FUNCTIONS, // functions
            (BiFunction<Object, Map<String, Object>, ?>) (root, variables) ->
            {
              Stream<String> stream1 = ((List<String>) variables.get("list")).stream();
              Stream<String> stream2 = stream1.map(s -> s.toUpperCase());
              Optional<String> optional = stream2.reduce((a, v) -> concatWithSpace(a, v));
              String result = optional.get();
              return result;
            }, // expectedProcess
            this.valueAnnotationEvaluatedValue3, // valueAnnotationEvaluatedValue
            "HELLO, SPRING EXPRESSION LANGUAGE (SPEL)!" // expectedResult
        )
    );
  }
}
```

</details>

# さいごに

以上、SpELでラムダ式を使い、なおかつ複数ステップ記述できるようにすることをSpring Frameworkを改造せずに、何か特別なライブラリを使うこともなく簡単な実装によって実現できました。
SpELは非常に便利ですが、[コード実行](https://spring.io/security/cve-2022-22963)や[DoS攻撃](https://spring.io/security/cve-2023-20861)といった脆弱性が報告されています。しかし、結局のところ第三者によって外部から渡された情報（SpEL文字列）を受け入れて検証せずにそのまま評価実行してしまっていることが問題なのです。そもそも受け入れずに他の運用を考えるか、どうしても受け入れるならばその内容を慎重に検証して実行できることに制限を設ける必要があります。取り扱い方さえ間違えなければ、本来SpELはとても便利なものなので是非とも活用してみてはいかがでしょうか。
