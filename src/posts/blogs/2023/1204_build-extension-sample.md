---
title: CDI 4.0 Lite - BuildCompatibleExtensionをサンプルで理解する
author: toshio-ogiwara
date: 2023-12-04
tags: [msa, mp, java, "逆張りのMicroProfile", advent2023]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2023](/events/advent-calendar/2023/)第2日目の記事です。

Jakarta EE 10がリリースされてから1年が経ちますが、Jakarta EE 10から導入されたCDI 4.0 LiteのBuildCompatibleExtensionに関する情報は未だにほぼ皆無といっていい状況です。[公式のSpecification](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0#spi_lite)を見てもクラス名やメソッド名を言い直しただけのような簡素な説明で、実際にどのように使えばよいのか？そしてユーザによるCDI拡張機能として以前よりあった[Portable extensions](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0#spi_full)との違いも理解できませんでした。

そんな中、良いサンプルはないかとGitHubをさまよっていたところ[^1]、とても分かりやすいサンプルを見つけることができました。今回はこのサンプルをもとにBuildCompatibleExtensionを解説してみたいと思います。

:::info: 記事で使用するサンプルコード
記事では紙面の関係上、一部のコードのみを掲載しています。コード全量は下記リポジトリに一式格納してあります。必要な場合はそちらを確認ください。

- <https://github.com/extact-io/build-extension-sample>

サンプルはCDIコンテナ実装に[ArC](https://quarkus.io/guides/cdi-reference)を使った[Quakus](https://quarkus.io/)版と[Weld](https://weld.cdi-spec.org/)を使った[Helidon](https://helidon.io/)版の2つを用意しています。どちらのフレームワークもBuildCompatibleExtensionをサポートしていますが、CDIコンテナの実装により特徴的な違いありますが、これは後ほど本文で触れたいと思います。

最後に記事で使用しているこのサンプルコードはRed Hatのプリンシパルソフトウェアエンジニアの[Ladislav Thon](https://github.com/Ladicek)さん個人のリポジトリにある[cdi-extensions-demo](https://github.com/Ladicek/cdi-extensions-demo)をもとにしています。サンプルはLadislav Thonさんのコードに対し最新のQuarkusでは動かない箇所や理解しやすいように一部修正したものを使っています。
:::

[^1]: [GitHub Code Search で世界中のコードを検索する](xxx)でも紹介されているコード検索機能で`BuildCompatibleExtension`を検索してみました。ネットに参考となる情報がないので、これホントに世の中で使っている人いるのかなぁと思って検索してみたのですが、これが結構ありました。それも実際に動くコード例となるので非常に参考になりました。使い方が分からないようなAPIはGitHub Code Searchで検索して他人のコードから理解するやり方、お勧めです！

BuildCompatibleExtensionですが、実装を説明する前にその用途や機能の目的などを理解してもらうことは難しいため、まずはBuildCompatibleExtensionを使ったサンプルコードから説明したいと思います。

# サンプルのお題
今回の記事で説明するサンプルはBuildCompatibleExtensionを使い次のようなCDI拡張を行います。

## CDI拡張の対象
CDI拡張を行う対象は次のようなクラスになります。

![pic01](/img/blogs/2023/1204_01_buidextension_before.drawio.svg)

それぞれのクラスの実装はコードを見れば分かるようにいたってシンプルなもになっています。

Processorインタフェースは何かのお仕事を実行する`doWork`メソッドが定義されたもので、その実装クラスとして今回はMyProcessorクラスとAnotherProcessorクラスの2つを使います。どちらもProcessorインタフェースの実装クラスですが@Importantを付いているのはMyProcessorクラスだけになります。また、`doWork`のメソッドの実装はどちらもログを出力だけのシンプルなものになっています。

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

次にImportantClassCheckerは引数で渡されたクラスが重要なものかをチェックするインタフェースなります。今回は予め仕訳された重要なクラスの集合をインスタンス変数で持ち、その集合に含まれるクラスは「重要」と判断するImportantClassCheckerImplクラスを実装として使います。

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

## CDI拡張後の状態
上で説明したクラスをBuildCompatibleExtensionを使い、実行時には次のようになるようにします。

- CDI拡張後
![pic02](/img/blogs/2023/1204_02_buidextension_after.drawio.svg)


[CDI拡張の対象](#cdi拡張の対象)で説明した実装を「CDI拡張後」のような実装にどうやったらなるのだ？と思われる方もいるかと思います。これにはJavaの黒魔術的なバイトコード操作が使われます。CDIコンテナはBuildCompatibleExtensionの実装に従い、[CDI拡張の対象](#cdi拡張の対象)で説明したコードから生成されたクラスファイルのバイトコードを操作し、実行時まで「CDI拡張後」のクラスファイルを生成しそれを利用します。

このことからBuildCompatibleExtensionの実装はCDIコンテナに対して「どのクラスを」「どのように改変するか」を指示するものといえます。

では、今回のサンプルではどのような指示が必要となるでしょうか？これは次のとおりになります。

1. AnotherProcessorとMyProcessorをCDI Beanの対象にする（CDIコンテナ管理対象となるようにする）
2. AnotherProcessorとMyProcessorのCDIスコープを@Applicationにする
3. ProcessorインタフェースのdoWorkメソッドの実装にログマーカーを追加する
4. @Importantが付いているProcessorのCDI Beanのクラス名を収集する
5. CDI Beanの実体(Bean型)がImportantClassCheckerImplで、ImportantClassCheckerでもInjection可能なCDI BeanのインスタンスをImportantClassCheckerCreatorで生成する
6. ImportantClassCheckerCreatorの生成時に4.で収集したクラス名を渡す

なお、CDI Beanのインスタンス生成を行うImportantClassCheckerCreatorの実装は次ようになっています。

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

`SyntheticBeanCreator`はBuildCompatibleExtensionの一部として定義されているインタフェースですが、ここでは引数で渡された`params`を使ってImportantClassCheckerImplのインスタンスを生成する単純なものとだけ理解してもらえば十分となります。

# BuildCompatibleExtensionによるサンプルの実装
ここからが本題になります。まず上で説明したサンプルをBuildCompatibleExtensionを使って実現したコードの全量を出すと次のようになります。

- BuildExtension
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

## 初期化フェーズとコールバックアノテーション
最初に目につくのがメソッドに付けられているアノテーションかと思います。このアノテーションが付いているメソッドはアプリケーションの初期化ライフサイクルに応じてCDIランタイムからコールバックされます。アノテーションとライフサイクルの関係は次のとおりになります

- `@Discovery`
  - CDIランタイムが`@ApplicationScoped`や`@RequestScoped Bean`などのBean定義アノテーションを持つクラスを検出するフェーズ
  - このフェーズでは検出するクラスを追加したり、インターセプターバインディングするアノテーションの追加などCDI関連のアノテーションを追加したりすることができます

- `@Enhancement`
  - 検出(Discovery)されたクラスのアノテーションが変更される可能性があるフェーズ
  - 検出されたクラスやフィールド、メソッドに対してアノテーションを追加、削除することができます

- `@Registration`
  - 検出されたクラスをCDIのBeanやインターセプター、オブザーバーとしてCDIコンテナへ登録するフェーズ
  - 指定したクラスがCDIコンテナに登録されたときに行いたい処理を実装することができます

- `@Synthesis`
  - 動的にその定義を行う合成Beanやオブザーバーを登録するフェーズ
  - BeanやオブザーバーをBuildCompatibleExtensionのAPIを使って動的に定義し登録することができます

- `@Validation`
  - 最終的にBuildCompatibleExtensionの処理を検証するフェーズ
  - BuildCompatibleExtensionの処理を検証し、問題がある場合はデプロイ処理を失敗させることができます

:::info: BuildCompatibleExtensionの実装と登録
BuildCompatibleExtensionを実装する場合はサンプルのように`BuildCompatibleExtension`インターフェースを実装します。`BuildCompatibleExtension`はマーカーインターフェースでメソッドは定義されていません。ですので、自分でCDI拡張を行いたいフェーズの任意のメソッドを実装し、そのメソッドに`@Discovery`などのフェーズアノテーションを付けます。こうすることで該当フェーズでCDIランタイムからコールバックが掛かります。

BuildCompatibleExtension の実装クラスは`java.util.ServiceLoader`の仕組みを使って有効化されます。したがって実装クラスを有効化するには` META-INF/services jakarta.enterprise.inject.build.compatible.spi.BuildCompatibleExtension`のファイルを作成し、そこに実装クラスを登録します。
:::

BuildCompatibleExtensionの初期化フェーズと対応するアノテーションが理解できたところで、次からはそれぞれのフェーズでサンプルがどのようなことをやっているかを見ていきましょう。

## Discoveryフェーズ
Discoverフェーズでは次のことを行っています（該当コードの再掲）。

```java
@Discovery
public void discoverFrameworkClasses(ScannedClasses scan) {
    log.info("*** execute Discovery ***");
    Config config = ConfigProvider.getConfig();
    config.getOptionalValue("sample.app.processer.class", String[].class) ...(1)
            .ifPresent(values -> Stream.of(values).forEach(scan::add));   ...(2)
}
```

1. `sample.app.processer.class`キーで設定ファイル[^2]に登録されているクラス名(FQCN)を読み込む
2. 読み込んだクラス名を`ScannedClasses#add(String)`を検出されたBeanのクラス集合に追加します。後続のEnhancementフェーズはDiscoveryフェーズで検出されたBeanのクラス集合に対するアノテーションの操作となります。`@ApplicationScoped`や`@RequestScoped Bean`などのBean定義アノテーションが付いているクラスは自動でBeanのクラス集合に含まれますが、それ以外は含まれません。したがって、Bean定義アノテーションが付いていないクラスを検出対象にした場合はサンプルのようにDiscoveryフェーズで`ScannedClasses#add(String)`を使い任意のクラスを追加します。

[^2]:サンプルでは設定ファイルの仕組みに[MicroProfile Config](https://download.eclipse.org/microprofile/microprofile-config-3.0/microprofile-config-spec-3.0.html)を使用しています

## Enhancementフェーズ
Enhancementフェーズでは次のことを行っています（該当コードの再掲）。

```java
@Enhancement(types = Processor.class, withSubtypes = true) ...(1)
public void addInterceptorBindingToProcessors(ClassConfig clazz) { ...(2)
    log.info("*** execute Enhancement ***");
    clazz.addAnnotation(ApplicationScoped.class); ...(3)
    clazz.methods()
            .stream()
            .filter(it -> it.info().name().equals("doWork") && it.info().parameters().isEmpty())
            .forEach(it -> it.addAnnotation(Logged.class)); ...(4)
}
```

1. Enhancementフェーズで処理したい（アノテーション操作を行いたい）クラスを`types`属性で指定します。一致したクラスだけでなく、そのサブクラスも対象に含めたい場合は`withSubtypes`属性でtrueを指定します(デフォルトはfalse)。
2. Discoveryフェーズで検出されたクラス集合の中で`Enhancement`アノテーションで指定された条件に合致するクラスの分だけコールバックが掛かります。今回の例では`types`属性の指定がインターフェースなので、そのサブクラス(実装クラス)の`AnotherProcessor`クラスと`MyProcessor`クラスの2つが該当するため、`@Enhancement`が付けられた`addInterceptorBindingToProcessors`メソッドが2回呼び出されます。また、呼び出し時にはClassConfig引数に対象となっているクラスの情報がそれぞれ設定されます。
3. 対象となっているクラスに`ApplicationScoped`アノテーションの定義を追加します。サンプルの場合、これにより`AnotherProcessor`クラスと`MyProcessor`クラスの双方がApplicationスコープのBeanとして管理されるようになります。
4. 対象となっているクラスの引数なしの`doWork`メソッドに`Logged`アノテーションの定義を追加します。`Logged`アノテーションは`LoggingInterceptor`にバインドされているため、このアノテーション操作により、`doWork`メソッドが`LoggingInterceptor`の対象になります。

:::alert: WeldとArc(Quarkus)では微妙に挙動が異なる
`Enhancement`アノテーションの条件に合致するものは`AnotherProcessor`クラスと`MyProcessor`クラスの2つと説明しましたが、これはCDI実装にWeldを使った場合で、Quarkus独自のCDI実装のArCを使った場合は実は結果が異なります。ArCではインタフェースの`Processor`に対してもコールバックが掛かるため、該当は3つと解釈します。

また、DiscoveryフェーズではBean定義アノテーションが付いていないクラスは検出対象にならないと説明していますが、ArCでは検出対象をBean定義アノテーションが付いているクラスではなく、CDIのBeanクラスの条件[^3]を満たすクラスとしていると思われる[^4]ため、Bean定義アノテーションがないクラスも検出対象に含まれます。なので、ArCでは実はサンプルのDiscoveryフェーズの実装を削除しても期待どおりに動作します。

CDI 4.0のリファレンス実装はWeldですが、DiscoveryフェーズとEnhancementフェーズの挙動はそこまで厳密に仕様で規定されていないため、どちらが正解とは言えないですが、感覚的にはWeldの挙動の方がやっぱり自然な気がします。
::::
[^3]: 条件は[Jakarta Contexts and Dependency Injection / 2.2.1.1. Which Java classes are managed beans](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0#what_classes_are_beans)を参照
[^4]: Quarkusのマニュアルから何を検出対象にしているかの記載を見つけることができなかったため、動作を試した結果から推測しています

## Registrationフェーズ
Registrationフェーズでは次のことを行っています（該当コードの再掲）。

```java
@Registration(types = Processor.class) ...(1)
public void rememberProcessors(BeanInfo bean) { ...(2)
    log.info("*** execute Registration ***");
    if (bean.isClassBean()) {
        processors.add(bean.declaringClass()); ...(3)
    }
}
```

1. RegistrationフェーズでCDIコンテナへの登録イベントを監視したいクラスを`types`属性で指定します。CDIコンテナへBeanやインターセプター、オブザーバーとして登録されたクラスの内、`Registration`アノテーションで指定された型に合致するする分だけコールバックが掛かります。サンプル場合はAnotherProcessor`クラスと`MyProcessor`クラスの2つが該当します
2. コールバック対象となっているBeanの情報がBeanInfoの引数に設定され呼び出されます
3. サンプルでは後続のSynthesisフェーズで`@Important`が付いている`Processor`のCDIのBeanクラスをチェックできるように、CDIコンテナに登録された`Processor`型のBeanクラスの情報(`ClassInfo`)をインスタン変数に貯めておきます。なお、BuildCompatibleExtensionのインスタンスは実装クラスごとに1つであることはCDIコンテナにより保証されています

## Synthesisフェーズ
Synthesisフェーズでは次のことを行っています（該当コードの再掲）。

```java
@Synthesis
public void registerImportanceImpl(SyntheticComponents synth) {
    log.info("*** execute Synthesis ***");
    String[] importantProcessors = processors.stream()
            .filter(it -> it.hasAnnotation(Important.class))
            .map(ClassInfo::name)
            .toArray(String[]::new); ...(1)

    synth.addBean(ImportantClassCheckerImpl.class) ...(2)
            .type(ImportantClassChecker.class)     ...(3)
            .withParam("importantProcessors", importantProcessors) ...(4)
            .createWith(ImportantClassCheckerCreator.class); ...(5)
}
```

1. Registrationフェーズで収集した`Processor`型のBeanクラスのうち、クラスに`@Important`が付いているクラス名の配列を作成します
2. `ImportantClassCheckerImpl`を実体クラスとした合成Beanを作成する
3. 作成した合成Beanが持つ型に`ImportantClassChecker`インタフェースを追加する。Beanが持つ型とは要はインジェクション可能な型を意味する
4. 作成した合成Beanのインスタン生成時に渡すパラメータを指定する。ここで指定したパラメータは後続の`createWith`メソッドで指定した合成Beanの生成クラスの`create`メソッドの引数で渡されます
5. 作成した合成Beanの生成クラス(SyntheticBeanCreatorインタフェースの実装クラス)を指定します。生成クラスの`create`メソッドで戻されたインスタンスがCDIコンテナでスコープに応じて管理されます。今回のサンプルでは明示的にスコープを指定していませんが、その場合のスコープは`Dependent`になります

## Validationフェーズ
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

1. 引数で渡されたMessageインスタンスに対してerrorメソッドを呼び出すことでデプロイ処理を失敗されることができます。サンプルの場合、`Processor`型のBeanクラスが１つもCDIコンテナに登録されなかった場合にデプロイ処理が失敗するようにしています。

::: column: MicroProfile 6.0からはBuildCompatibleExtensionが標準
MicroProfile 6.0からJakarta EEの必須サポートがJakarta EE 10のCore Profileとなりました。

![pic03](/img/blogs/2023/1204_03_microprfile6.drawio.svg)

MicroProfile 5.xまではCDI Fullに相当する機能を使うことができましたが、MicroProfile 6.0からはCDI Liteとなります。MicroProfileとしてこの変更により一番大きな影響があるのはCDI拡張です。今までMicroProfile 準拠の実装であればPortable extensionsを使うことができましたが、CDI 4.0からPortable extensionsはCDI Fullの機能となったため、実装によっては使うことができません[^5]。しがって、MicroProfile 6.0以降はBuildCompatibleExtensionがCDI拡張の標準APIとなります。
:::

[^5]: Open LibertyやHelidonなどCDIの実装にWeldを使っているものは現時点ではMicroProfile 6.0以降のサポートバージョンでもPortable extensionsを使うことはできています。

# 結局BuildCompatibleExtensionはなんなのか
実装例を見たところでBuildCompatibleExtensionはなんなのかを考えてみたいと思います。
結論からいうとBuildCompatibleExtensionはPortable extensionsに対して以下の2点を実現したものといえます。

- CDI拡張の簡易的なAPIの実現
- CDI初期化処理のシフトレフト化

## CDI拡張の簡易的なAPIの実現
今回紹介したBuildCompatibleExtensionのサンプルはPortable extensionsを使っても同じことができますが、Portable extensionsのAPIは複雑（難しい）です。
例えばBean定義アノテーションが付いていなクラスを単にCDI Beanにする場合、Portable extensionsでは次のような実装を必要とします。行数は少ないですが、やっていることと呼び出しているメソッドに乖離があるため、理解しづらいコードとなっています。

```java
public class SamplePortableExtension implements Extension {
    void addBean(@Observes BeforeBeanDiscovery event) {
        event.addAnnotatedType(SampleBean.class, "sampleBean");
    }
}
```

これに対してBuildCompatibleExtensionでは次のような簡潔な実装で実現できます。

```java
public class SampleBuildExtension implements BuildCompatibleExtension {
    @Discovery
    public void discovery(ScannedClasses scan) {
        scan.add(SampleBean.class.getName());
    }
}
```

Portable extensionsは加えてCDIコンテナのライフサイクルに対する深い知識が必要となります。

BuildCompatibleExtensionは今まで難易度が高く扱いづらかったCDI拡張の実装を簡易なAPIで実現できるようにしたものといえます。

## CDIの初期化処理のシフトレフト化
Portable extensionsはリフレクションを使って必要なオブジェクトをインスタンス化してメタデータを動的に収集します。このため、CDIの初期化処理は起動時に行う必要がありました。

しかし、このCDIの初期化処理で行っている主なことは
1. Bean定義アノテーションのスキャン
2. @Injectionのスキャン
3. 依存性の解決
4. プロキシバイトコードの生成
5. Beanの生成（インスタンス化）
の1から5ですが、そのうちの1から4は毎回結果同じになります。加えて、この1から4の処理には時間が掛かるため、CDIコンテナの起動に時間が掛かる要因となっていました。

このため、1から4の初期化処理を起動時ではなく、アプリケーションのビルド時（コンパイル時）に行えるようにできないかとして考えられたのがBuildCompatibleExtensionとなります。
従来のPortable extensionsはリフレクションを使っていたため、どうしても起動時にしか行うことができませんでした。このため、リフレクションを使わずにCDI拡張の実装ができるようにしたものがBuildCompatibleExtensionとなります

従来のPortable extensionsによるCDIの初期化処理のタイミングと、BuildCompatibleExtensionのタイミングを並べて比較すると次のとおりになります。

![pic04](/img/blogs/2023/1204_04_bootstrap.drawio.svg)

CDIの初期化処理が左に移動しているのが分かると思います。これがCDIの初期化処理のシフトレフトで、毎回同じことは起動時ではなくビルド時に行い、結果としてアプリケーションの起動を高速化します。

:::alert: ほんとにシフトレフトするかは実装次第
BuildCompatibleExtensionのパッケージ化とデプロイについて [CDI 4.0の仕様](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0#packaging_deployment)では次のように説明しています。（Google翻訳したものを記載）
> デプロイメント時に、コンテナは Bean の検出を実行し、BuildCompatibleExtensionを実行し、定義エラーとデプロイメントの問題を検出する必要があります。 CDI Lite におけるデプロイメント時という用語は、アプリケーションのコンパイル中、遅くともアプリケーションの起動中など、アプリケーションが開始される前を意味します。

若干難解なことをいっていますが、要約するとBuildCompatibleExtensionに対する処理はコンパイル時からアプリケーションが開始されるまでに行えばよいとしています。ここまでの説明ではBuildCompatibleExtensionはあたかもコンパイル時に行われるように言っていましたが、実は仕様としてはアプリケーションが開始するまでに行えばよいとなっており、BuildCompatibleExtensionの処理をどこで行うかはCDIの実装次第にしています。

事実、WeldではBuildCompatibleExtensionの処理はコンパイル時ではなくコンテナ起動時に行われます。Weld はCDI 4.0 Fullをサポートしているため、BuildCompatibleExtensionとPortable extensionsの両方をサポートしています。しかし、その実装はBuildCompatibleExtensionのAPI呼び出しをPortable extensionsのAPI呼び出しに変換しで実行するだけのため、実行されるタイミングはPortable extensionsと変わりません。[^6]

現時点でほんとにシフトレフトする実装はRed HatのQuarkusだけです。Quarkusは独自CDIコンテナのArCと独自のMavenプラグインを組み合わせ、ビルド時にBuildCompatibleExtensionに対する処理を行い、その結果をバイトコードに直接記録し、その記録したバイトコードを起動時にロードする仕組みを採っています。[^7]
[^6]: [Weld 5.1.2.Final - CDI Reference Implementation / 17. Build Compatible extensions](https://docs.jboss.org/weld/reference/latest-5.1/en-US/html_single/#extend_lite)
[^7]: [初めてのエクステンションの作成 – Quarkus / Quarkus アプリケーションブートストラップ](https://ja.quarkus.io/guides/building-my-first-extension#quarkus-application-bootstrap)
:::

# さいごに
サンプルを実現するのに必要なBuildCompatibleExtensionのクラスやメソッドを紹介しましたが、コールバックメソッドで取れる引数は他にもいつくもあります。CDI拡張を使いこなせるようになるとCDIでできることがグッと広がりますので、この記事をきっかけに是非色々調べてみてはいかがでしょうか。
