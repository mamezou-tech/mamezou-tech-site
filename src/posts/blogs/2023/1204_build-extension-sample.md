---
title: CDI 4.0 Lite - Build compatible extensionsをサンプルで理解する
author: toshio-ogiwara
date: 2023-12-04
tags: [msa, mp, java, "逆張りのMicroProfile", advent2023]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2023](/events/advent-calendar/2023/)第2日目の記事です。

JakartaEE 10がリリースされてから1年が経ちますが、JakartaEE 10から導入されたCDI 4.0 Liteの[Build compatible extensions](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0#spi_lite)に関する情報は未だにほぼ皆無といっていい状況です。[公式のSpecification](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0#spi_lite)を見てもクラス名やメソッド名を言い直しただけのような簡素な説明で、実際にどのように使えばよいのか？そして以前からあった[Portable extensions](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0#spi_full)となにが違うのかも理解できませんでした。

そんな中、いいサンプルはないかとGitHubをさまよっていたところ[^1]、非常に分かりやすいサンプルを見つけることができました。今回はこのサンプルをもとにBuild compatible extensionsを解説してみたいと思います。

[^1]: 「[GitHub Code Search で世界中のコードを検索する](/blogs/2023/02/25/github-code-search/)」で紹介されているGitHubのコード検索機能を使って`BuildCompatibleExtension`を検索してみました。当初はネットに参考となる情報が全くないので、これホントに世の中で使っている人いるのかなぁ？と思っていましたが、検索したらこれが結構ありました。それも実際に動くコードに対して検索することができるので非常に参考になります。使い方が分からないようなAPIはGitHub Code Searchで検索して他人のコードから理解するやり方、お勧めです！


:::info: 記事で使用するサンプルコード
記事は一部のコードのみを掲載しています。コードの全量は下記リポジトリに一式格納してあります。全量を眺めてみたい方はそちらを確認ください。

- <https://github.com/extact-io/build-extension-sample>

サンプルの実装は独自CDIコンテナの[ArC](https://quarkus.io/guides/cdi-reference)を使った[Quakus](https://quarkus.io/)版と[Weld](https://weld.cdi-spec.org/)を使った[Helidon](https://helidon.io/)版の2つを用意しています。どちらのフレームワークもBuild compatible extensionsをサポートしていますが、CDIコンテナの実装により挙動に微妙な違いあります。これについては後ほど本文で触れたいと思います。
最後に記事で使用しているこのサンプルコードはRed Hatのプリンシパルソフトウェアエンジニアの[Ladislav Thon](https://github.com/Ladicek)さんの個人リポジトリにある[cdi-extensions-demo](https://github.com/Ladicek/cdi-extensions-demo)をもとにしています。記事ではLadislav Thonさんのコードに対し最新のQuarkusでは動かない箇所や理解しやすいように一部修正したものを使っています。
:::

<br>

それではさっそく本題に入っていきます。通常であれば用途や機能の目的などを説明した後に「それでは」的な流れでコードの説明に入るのですが、Build compatible extensionsは掴みどころが難しい機能であるため、まずはBuild compatible extensionsを使ったサンプルコードから説明していきます。

## サンプルのお題
今回の記事で使用するBuild compatible extensionsのお題を説明していきます。

### CDI拡張の対象
Build compatible extensionsはその仕様で定められているAPI等を使い既存のCDIの機能を拡張するものとなります。まず最初にBuild compatible extensionsを使って機能を拡張する対象を説明します。

CDI拡張を行う対象は次のクラスになります。
以降に示すコードを見れば分かるとおり、それぞれのクラスの実装はいたってシンプルなものになっています。


![pic01](/img/blogs/2023/1204_01_buidextension_before.drawio.svg)


Processorは何かのお仕事を実行する`doWork`メソッドが定義されたインタフェースで、その実装クラスとして今回はMyProcessorクラスとAnotherProcessorクラスの2つを使います。どちらもProcessorインタフェースの実装クラスですが`@Important`はMyProcessorクラスだけに付いています。また`doWork`メソッドの実装はどちらもログを出力だけのシンプルなものになります。

```java
public interface Processor {
    void doWork();
}
```

```java
@Important
public class MyProcessor implements Processor {
    private static final Logger log = LoggerFactory.getLogger(MyProcessor.class);
    @Override
    public void doWork() {
        log.info("Working really hard");
    }
}
```

```java
public class AnotherProcessor implements Processor {
    private static final Logger log = LoggerFactory.getLogger(AnotherProcessor.class);
    @Override
    public void doWork() {
        log.info("Working barely enough");
    }
}
```
<br>

次にImportantClassCheckerですが、これは引数で渡されたクラスが重要なクラスかをチェックするインタフェースとなります。今回は予め仕訳された重要クラスの集合(Set)をフィールドで持ち、引数で渡されたクラスがその集合に含まれる場合に「重要」と判断するImportantClassCheckerImplを実装クラスとして使用します。

```java
public interface ImportantClassChecker {
    boolean isImportant(Class<?> clazz);
}
```
```java
public class ImportantClassCheckerImpl implements ImportantClassChecker {
    private final Set<String> importantClasses;

    public ImportantClassCheckerImpl(Set<String> importantClasses) {
        this.importantClasses = importantClasses;
    }

    @Override
    public boolean isImportant(Class<?> clazz) {
        return importantClasses.contains(clazz.getName());
    }
}
```

### CDI拡張後の状態
「[CDI拡張の対象](#cdi拡張の対象)」で説明したクラスをBuild compatible extensionsを使って実行時に次に示す状態にします。

- CDI拡張後（赤い要素が変更・追加箇所）

![pic02](/img/blogs/2023/1204_02_buidextension_after.drawio.svg)


「[CDI拡張の対象](#cdi拡張の対象)」の実装が「CDI拡張後」の実装にどうやったらなるのだ？と思われる方もいるかと思います。これにはJavaの黒魔術的なバイトコード操作が使われます。CDIコンテナはBuild compatible extensionsの実装に従い「[CDI拡張の対象](#cdi拡張の対象)」で説明したクラスファイルのバイトコードを操作し、実行時（起動時）までに「CDI拡張後」のクラスファイルに改変します。

このことからBuild compatible extensionsの実装はCDIコンテナに対して「どのクラスを」「どのように改変するか」を指示するものともいえます。

### Build compatible extensionsで行うこと
では、今回のサンプルではどのような指示が必要となるでしょうか？これは次のとおりになります。

1. MyProcessorクラスとAnotherProcessorクラスをCDI Beanの対象にする（CDIコンテナ管理対象にする）
2. MyProcessorクラスとAnotherProcessorクラスのCDIスコープを`@ApplicationScoped`にする
3. Processorインタフェースの`doWork`の実装メソッドにログマーカーを追加する
4. `@Important`が付いているProcessorのCDI Beanのクラス名を収集する
5. CDI Beanの実体(Beanクラス)がImportantClassCheckerImplクラスで、ImportantClassCheckerインターフェースでもInjection可能なCDI BeanのインスタンスをImportantClassCheckerCreatorで生成する
6. ImportantClassCheckerCreatorでImportantClassCheckerImplのインスタンスを生成する際に4.で収集したクラス名を渡す

なお、CDI Beanのインスタンス生成を行うImportantClassCheckerCreatorの実装は次のようになっています。

```java
public class ImportantClassCheckerCreator 
        implements SyntheticBeanCreator<ImportantClassCheckerImpl> {
    @Override
    public ImportantClassCheckerImpl create(Instance<Object> lookup, Parameters params) {
        String[] importantProcessors = params.get("importantProcessors", String[].class);
        return new ImportantClassCheckerImpl(Set.of(importantProcessors));
    }
}
```

`SyntheticBeanCreator`はBuild compatible extensionsの一部として定義されているインタフェースですが、ここでは引数で渡された`params`をImportantClassCheckerImplのコンストラクタで渡す単純なものとだけ理解してもらえば十分となります。

## サンプルの実装
お題の説明が終わったところで、ここからが本題になります。まず最初に上述のお題を実現するBuild compatible extensionsの実装を示すと次のとおりになります。

```java
public class BuildExtension implements BuildCompatibleExtension {
    private static Logger log = LoggerFactory.getLogger(BuildExtension.class);
    private final Set<ClassInfo> processors = new HashSet<>();
    @Discovery
    public void discoverFrameworkClasses(ScannedClasses scan) {
        log.info("*** execute Discovery ***");
        Config config = ConfigProvider.getConfig();
        config.getOptionalValue("sample.app.processer.class", String[].class)
                .ifPresent(values -> Stream.of(values).forEach(scan::add));
    }
    @Enhancement(types = Processor.class, withSubtypes = true)
    public void addInterceptorBindingToProcessors(ClassConfig clazz) {
        log.info("*** execute Enhancement ***");
        clazz.addAnnotation(ApplicationScoped.class);
        clazz.methods()
                .stream()
                .filter(it -> it.info().name().equals("doWork") && it.info().parameters().isEmpty())
                .forEach(it -> it.addAnnotation(Logged.class));
    }
    @Registration(types = Processor.class)
    public void rememberProcessors(BeanInfo bean) {
        log.info("*** execute Registration ***");
        if (bean.isClassBean()) {
            processors.add(bean.declaringClass());
        }
    }
    @Synthesis
    public void registerImportanceImpl(SyntheticComponents synth) {
        log.info("*** execute Synthesis ***");
        String[] importantProcessors = processors.stream()
                .filter(it -> it.hasAnnotation(Important.class))
                .map(ClassInfo::name)
                .toArray(String[]::new);
        synth.addBean(ImportantClassCheckerImpl.class)
                .type(ImportantClassChecker.class)
                .withParam("importantProcessors", importantProcessors)
                .createWith(ImportantClassCheckerCreator.class);
    }
    @Validation
    public void validateProcessors(Messages msg) {
        log.info("*** execute Validation ***");
        if (processors.isEmpty()) {
            msg.error("At least one `Processor` implementation must exist");
        }
    }
}
```

### 初期化フェーズとコールバックアノテーション
コードを見て最初に目につくのはメソッドに付けられているアノテーションになるかと思います。CDI Beanの初期化はいくつかのフェーズに区切って行われ、それぞれに対応したアノテーションがBuild compatible extensionsで定義されています。このフェーズアノテーションが付けられたメソッドはCDI Beanの初期化ライフサイクルに応じてCDIランタイムからコールバックされます。

- Discoveryフェーズ
  - CDIランタイムが`@ApplicationScoped`や`@RequestScoped Bean`などのBean定義アノテーションを持つクラスを検出するフェーズ
  - `@Discovery`のメソッドに対して呼び出され、検出するクラスを追加したり、インターセプターバインディングするアノテーションを追加したりすることができます

- Enhancementフェーズ
  - 検出(Discovery)されたクラスのアノテーションが変更される可能性があるフェーズ
  - `@Enhancement`のメソッドに対して呼び出され、検出されたクラスやフィールド、メソッドに対してアノテーションを追加、削除することができます

- Registrationフェーズ
  - 検出されたクラスをCDIのBeanやインターセプター、オブザーバーとしてCDIコンテナへ登録するフェーズ
  - `@Registration`のメソッドに対して呼び出され、指定したクラスがCDIコンテナに登録されたときに行いたい処理を実施することができます

- Synthesisフェーズ
  - 動的にCDI Beanの定義を行う合成Beanやオブザーバーを登録するフェーズ
  - `@Synthesis`のメソッドに対して呼び出され、BeanやオブザーバーをBuild compatible extensionsのAPIを使って動的に定義し登録することができます

- Validationフェーズ
  - 最終的にBuild compatible extensionsの処理を検証するフェーズ
  - `@Validation`のメソッドに対して呼び出され、Build compatible extensionsの処理を検証し、問題がある場合はデプロイ処理を失敗させることができます

:::info: Build compatible extensionsの実装と登録
Build compatible extensionsを実装する場合はサンプルのように`BuildCompatibleExtension`インターフェースを実装します。`BuildCompatibleExtension`はマーカーインターフェースでメソッドは定義されていません。ですので、自分でCDI拡張を行いたいフェーズの任意のメソッドを実装し、そのメソッドに`@Discovery`などのフェーズアノテーションを付けます。こうすることで該当フェーズでCDIランタイムからコールバックが掛かります。また`BuildCompatibleExtension`の実装クラスは`java.util.ServiceLoader`の仕組みで有効化されます。実装クラスを有効化する際は` META-INF/services/BuildCompatibleExtensionのクラス名(FQCN)`のファイルを作成し、そこに実装クラスを記載します。
:::

Build compatible extensionsの初期化フェーズと対応するアノテーションが理解できたところで、次からはそれぞれのフェーズでサンプルがどのようなことをやっているかを見ていきます。

### Discoveryフェーズ
Discoverフェーズでは次のことを行っています（該当コードの再掲）。

```java
@Discovery
public void discoverFrameworkClasses(ScannedClasses scan) {
  log.info("*** execute Discovery ***");
  Config config = ConfigProvider.getConfig();
  config.getOptionalValue("sample.app.processer.class", String[].class) ...(1)
        .ifPresent(values -> Stream.of(values).forEach(scan::add));     ...(2)
}
```

1. `sample.app.processer.class`キーで設定ファイル[^2]に登録されているクラス名(FQCN)を読み込む
2. 読み込んだクラス名を`ScannedClasses#add(String)`で検出されたBeanのクラスとして追加します。後続のEnhancementフェーズではDiscoveryフェーズで検出されたBeanクラスに対するアノテーションの操作が可能となります。
   `@ApplicationScoped`や`@RequestScoped Bean`などBean定義アノテーションが付いているクラスは自動でBeanのクラスとして検出されますが、それ以外のクラスは検出されませ。したがって、Bean定義アノテーションが付いていないクラスを検出対象としたい場合はサンプルのようにDiscoveryフェーズで`ScannedClasses#add(String)`を使って検出クラスとして追加します。
   なお、サンプルは設定ファイルからクラス名を取得していますが、これはBuild compatible extensionsの仕様とは関係ありません。`"foo.bar.Baz"`のように文字列リテラルで直接記述しても`Foo.class.getName()`のようにやっても問題ありません


[^2]:サンプルでは設定ファイルの仕組みに[MicroProfile Config](https://download.eclipse.org/microprofile/microprofile-config-3.0/microprofile-config-spec-3.0.html)を使用しています

### Enhancementフェーズ
Enhancementフェーズでは次のことを行っています（該当コードの再掲）。

```java
@Enhancement(types = Processor.class, withSubtypes = true)         ...(1)
public void addInterceptorBindingToProcessors(ClassConfig clazz) { ...(2)
    log.info("*** execute Enhancement ***");
    clazz.addAnnotation(ApplicationScoped.class);                  ...(3)
    clazz.methods()
            .stream()
            .filter(it -> it.info().name().equals("doWork") && it.info().parameters().isEmpty())
            .forEach(it -> it.addAnnotation(Logged.class));        ...(4)
}
```

1. Enhancementフェーズで処理したい（アノテーション操作を行いたい）Beanクラスを`types`属性で指定します。一致したクラスだけでなく、そのサブクラスも対象に含めたい場合は`withSubtypes`属性でtrueを指定します(デフォルトはfalse)
2. Discoveryフェーズで検出されたクラスの中から`Enhancement`アノテーションの指定条件に合致するクラスの分だけコールバックが掛かります。今回の例は`types`属性の指定がインターフェースなので、該当はその実装クラスのMyProcessorクラスとAnotherProcessorクラスの2つとなり、`@Enhancement`が付けられた`addInterceptorBindingToProcessors`メソッドが2回呼び出されます。そして、呼び出し時には呼び出し対象のクラス情報がClassConfigに設定されて渡されます
3. 呼び出し対象のクラス定義に`ApplicationScoped`アノテーションを追加します。これによりMyProcessorクラスとAnotherProcessorクラスの双方がApplicationスコープのBeanとして管理されるようになります
4. 呼び出し対象のクラスに定義されている引数なしの`doWork`メソッドに`Logged`アノテーションを追加します。`Logged`アノテーションは`LoggingInterceptor`にバインドされているため、このアノテーション操作により、`doWork`メソッドの呼び出しが`LoggingInterceptor`の対象になります。なお、`LoggingInterceptor`は次のような実装になっています
```java
@Logged
@Interceptor
@Priority(Interceptor.Priority.APPLICATION)
public class LoggingInterceptor {
    private static final Logger log = LoggerFactory.getLogger(LoggingInterceptor.class);
    @Inject
    ImportantClassChecker importance;
    @AroundInvoke
    public Object intercept(InvocationContext ctx) throws Exception {
        Class<?> clazz = ctx.getMethod().getDeclaringClass();
        Level level = importance.isImportant(clazz) ? Level.WARN : Level.INFO;
        try {
            log.atLevel(level).setMessage("Starting work").log();
            return ctx.proceed();
        } finally {
            log.atLevel(level).setMessage("Work finished").log();
        }
    }
}
```
:::check: WeldとArc(Quarkus)では微妙に挙動が異なる
`Enhancement`アノテーションの条件に合致するものはAnotherProcessorクラスとMyProcessorクラスの2つと説明しましたが、これはCDI実装にWeldを使った場合でArC(Quarkus)を使った場合、実は結果が変わります。ArCではインタフェースのProcessorに対してもコールバックが掛かるため該当は3つとなります。

またBean定義アノテーションがついていないクラスはDiscoveryフェーズの検出対象にならないと説明しましたが、ArC(Quarkus)では検出対象を「CDI Beanにすることができるクラスの条件」[^3]としていると思われる[^4]ため、Bean定義アノテーションがないクラスも検出対象に含まれます。このため、ArC(Quarkus)のサンプルではDiscoveryフェーズの実装を削除しても実は期待どおりに動作したりします。

CDI 4.0のリファレンス実装はWeldですが、DiscoveryフェーズとEnhancementフェーズの挙動に関してはそこまで厳密に仕様で規定されていません。このためどちらが正解とは一概に言えないですが感覚的にはWeldの挙動の方が自然な気がしています。
::::

[^3]: 条件は[Jakarta Contexts and Dependency Injection / 2.2.1.1. Which Java classes are managed beans](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0#what_classes_are_beans)を参照
[^4]: Quarkusのマニュアルから何を検出対象にしているかの記載を見つけることができなかったため、動作を試した結果から推測しています

### Registrationフェーズ
Registrationフェーズでは次のことを行っています（該当コードの再掲）。

```java
@Registration(types = Processor.class)          ...(1)
public void rememberProcessors(BeanInfo bean) { ...(2)
    log.info("*** execute Registration ***");
    if (bean.isClassBean()) {
        processors.add(bean.declaringClass());  ...(3)
    }
}
```

1. CDIコンテナへ登録されたことをを監視したいBeanクラスを`types`属性で指定します。`Enhancement`フェーズと同様に`Registration`アノテーションで指定された型に合致するする分だけコールバックが掛かります。今回のサンプルではMyProcessorクラスとAnotherProcessorクラスとの2つが該当します
2. コールバック対象となっているCDI Beanの情報がBeanInfoの引数に設定され呼び出されます
3. 今回のサンプルは後続のSynthesisフェーズで`@Important`が付いているProcessorのBeanクラスを確認できるように`Processor`型のBeanクラスの情報(`ClassInfo`)をフィールドのSetに貯めています。なお`BuildCompatibleExtension`のインスタンスは実装クラスごとに1つであることがCDIコンテナにより保証されます

### Synthesisフェーズ
Synthesisフェーズでは次のことを行っています（該当コードの再掲）。

```java
@Synthesis
public void registerImportanceImpl(SyntheticComponents synth) {
    log.info("*** execute Synthesis ***");
    String[] importantProcessors = processors.stream()
            .filter(it -> it.hasAnnotation(Important.class))
            .map(ClassInfo::name)
            .toArray(String[]::new); ...(1)

    synth.addBean(ImportantClassCheckerImpl.class)                 ...(2)
            .type(ImportantClassChecker.class)                     ...(3)
            .withParam("importantProcessors", importantProcessors) ...(4)
            .createWith(ImportantClassCheckerCreator.class);       ...(5)
}
```

1. Registrationフェーズで収集した`Processor`型のBeanクラスのうち、クラスに`@Important`が付いているクラス名の配列を作成します
2. `ImportantClassCheckerImpl`をBeanクラスとした合成Beanを作成する
3. 作成する合成Beanが持つ型に`ImportantClassChecker`インタフェースを追加する。Beanが持つ型とはインジェクション可能な型のことを意味します
4. 作成する合成Beanのインスタン生成時に渡すパラメータを指定する。ここで指定したパラメータは後続の`createWith`メソッドで指定した合成Beanの生成クラスの`create`メソッドに引数で渡されます
5. 作成する合成Beanの生成クラス(SyntheticBeanCreatorインタフェースの実装クラス)を指定します。生成クラスの`create`メソッドで返されたインスタンスがスコープに応じてCDIコンテナで管理されます。今回のサンプルでは明示的にスコープを指定していませんが、その場合は`Dependent`になります

### Validationフェーズ
Validationフェーズでは次のことを行っています（該当コードの再掲）。

```java
@Validation
public void validateProcessors(Messages msg) {
    log.info("*** execute Validation ***");
    if (processors.isEmpty()) {
        msg.error("At least one `Processor` implementation must exist"); ...(1)
    }
}
```

1. 引数で渡されたMessageインスタンスに対してerrorメソッドを呼び出すことでデプロイ処理を失敗されることができます。サンプルでは`Processor`型のBeanクラスが１つもCDIコンテナに登録されなかった場合にデプロイ処理を失敗するようにしています。

::: column: MicroProfile 6.0からはBuild compatible extensionsが標準
MicroProfile 6.0からJakarta EEの必須サポートがJakarta EE 10のCore Profileとなりました。

![pic03](/img/blogs/2023/1204_03_microprfile6.drawio.svg)

MicroProfile 5.xまではCDI Fullに相当する機能を使うことができましたが、MicroProfile 6.0からはそれがCDI Liteとなります。MicroProfileとしてこの変更で一番大きな影響があるのはCDI拡張です。今までMicroProfile 準拠の実装であればPortable extensionsを使うことができましたが、CDI 4.0からはPortable extensionsがCDI Fullの機能となったため、実装によっては使うことができません[^5]。しがって、MicroProfile 6.0以降はBuild compatible extensionsがCDI拡張の標準APIとなります。
:::

[^5]: Open LibertyやHelidonなどCDIの実装にWeldを使っているものは現時点ではMicroProfile 6.0以降のサポートバージョンでもPortable extensionsを使うことはできています。

## Build compatible extensionsとは何か
実装例を見たところで最後にBuild compatible extensionsは結局なんなのかを考えてみたいと思います。
結論からいうとBuild compatible extensionsはPortable extensionsに対して以下の2つを実現したものといえます。

- CDI拡張に対する簡易的なAPIの実現
- CDI初期化処理のシフトレフト化

### CDI拡張に対する簡易的なAPIの実現
今回紹介したサンプルはPortable extensionsを使っても同じことができますが、Portable extensionsのAPIはハッキリ言って複雑（難しい）です。

例えばBean定義アノテーションが付いていなクラスを単にCDI Beanにする場合、Portable extensionsでは次のような実装を必要とします。行数は少ないですが、やっていることと呼び出しているメソッドに乖離があるため、理解しづらいコードとなります。

```java
public class SamplePortableExtension implements Extension {
    void addBean(@Observes BeforeBeanDiscovery event) {
        event.addAnnotatedType(SampleBean.class, "sampleBean");
    }
}
```
<br>

これに対しBuild compatible extensionsは次のような簡潔な実装で実現できます。

```java
public class SampleBuildExtension implements BuildCompatibleExtension {
    @Discovery
    public void discovery(ScannedClasses scan) {
        scan.add(SampleBean.class.getName());
    }
}
```
<br>

Portable extensionsはAPIが複雑なことに加えて、CDIコンテナのライフサイクルに対する深い知識が必要となります。
このため、Build compatible extensionsは今まで難易度が高く扱いづらかったCDI拡張の実装を簡易なAPIで実現できるようにしたものといえます。

### CDIの初期化処理のシフトレフト化
Portable extensionsはリフレクションを使って必要なオブジェクトのメタデータを動的に収集します。このため、Portable extensionsの初期化処理はBean等のインスタンス化を行う起動時に行う必要がありました。

しかし、このCDIの初期化処理で行っている主なことは
1. Bean定義アノテーションのスキャン
2. @Injectionのスキャン
3. 依存性の解決
4. プロキシバイトコードの生成
5. Beanの生成（インスタンス化）

の1.から5.ですが、そのうちの1.から4.は毎回結果同じになります。これに加えて1.から4.の処理には時間が掛かるため、CDIコンテナの起動に時間が掛かる要因となっていました。

この1.から4.の初期化処理を起動時ではなく、アプリケーションのビルド時（コンパイル時）に行えるようにできないかと考えられたのがBuild compatible extensionsとなります。従来のPortable extensionsはリフレクションを使っていたため、先に説明したとおり起動時にしか行う必要がうことができませんでした。この起動時の課題をクリアするためにリフレクションを使わずにCDI拡張をできるようにしたものがBuild compatible extensionsとなります[^6]。

[^6]: これはCDI的な見方で実際はQuarkusがもとから持っていたQuarkus独自のExtensionの仕組みを標準化したものともいえます。

従来のPortable extensionsによるCDIの初期化処理のタイミングとBuild compatible extensionsのタイミングを並べて比較すると次のとおりになります。

![pic04](/img/blogs/2023/1204_04_bootstrap.drawio.svg)

CDIの初期化処理が左に移動しているのが分かると思います。これがCDIの初期化処理のシフトレフトで、毎回同じことは起動時ではなくビルド時に行うようにし、結果としてアプリケーションの起動を高速化します。

:::check: ほんとにシフトレフトするかは実装次第
Build compatible extensionsのパッケージ化とデプロイについて [CDI 4.0の仕様](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0#packaging_deployment)は次のように説明しています。（Google翻訳したものを記載）
> デプロイメント時に、コンテナは Bean の検出を実行し、Build compatible extensionsを実行し、定義エラーとデプロイメントの問題を検出する必要があります。 CDI Lite におけるデプロイメント時という用語は、アプリケーションのコンパイル中、遅くともアプリケーションの起動中など、アプリケーションが開始される前を意味します。

若干難解なことをいっていますが、要は「Build compatible extensionsに対する処理はコンパイル時からアプリケーションが開始されるまでに行えばよい」としています。ここまでの説明はBuild compatible extensionsはあたかもコンパイル時に行われるように言っていましたが、実は仕様としてはアプリケーションが開始するまでに行えばよいとなっており、Build compatible extensionsの処理をどこで行うかはCDIの実装次第にしています。

事実、WeldではBuild compatible extensionsの処理はコンパイル時ではなくコンテナ起動時に行われます。Weld はCDI 4.0 Fullをサポートしているため、Build compatible extensionsとPortable extensionsの両方をサポートしています。しかし、その実装はBuild compatible extensionsのAPI呼び出しをPortable extensionsのAPI呼び出しに変換しで実行するだけで、実行されるタイミングはPortable extensionsと変わりません[^7]。

現時点でほんとにシフトレフトするBuild compatible extensionsの実装はRed HatのQuarkusだけです。Quarkusは独自CDIコンテナのArCと独自のMavenプラグインを組み合わせ、ビルド時にBuild compatible extensionsに対する処理を行い、その結果をバイトコードに直接記録し、その記録したバイトコードを起動時にロードする仕組みを採っています[^8]。
[^7]: [Weld 5.1.2.Final - CDI Reference Implementation / 17. Build Compatible extensions](https://docs.jboss.org/weld/reference/latest-5.1/en-US/html_single/#extend_lite)
[^8]: [初めてのエクステンションの作成 – Quarkus / Quarkus アプリケーションブートストラップ](https://ja.quarkus.io/guides/building-my-first-extension#quarkus-application-bootstrap)
:::

## さいごに
記事ではサンプルを実現するために必要なBuild compatible extensionsのAPIだけを紹介しましたが、コールバックメソッドで取れる引数は他にもいつくもあります。CDI拡張を使いこなせるようになるとCDIでできることがグッと広がります。この記事をきっかけに是非色々調べてみてはいかがでしょうか。
