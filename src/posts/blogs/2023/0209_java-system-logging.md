---
title: System.Loggerって知ってる？ - Javaの標準Loggerインタフェースに今更気がついた
author: toshio-ogiwara
date: 2023-02-12
tags: [java]
---

筆者が普段から使っているHelidonの4.0.0 ALPHA-4の[リリースノート](https://github.com/helidon-io/helidon/releases/tag/4.0.0-ALPHA4)を眺めていたところ"Logging: Change JUL to System.Logger in most modules"という変更が目に留まり"System.Logger"ってなんだ？と調べてみたところ、なっ、なっ、なんとJava9からLoggerのインタフェースが標準化されているではないですかー！！ということで今回は登場背景も交えながらSystem.Loggerを今さら紹介してみたいと思います。

# System.Loggerとは
System.Loggerを一言でいうと、ロギングライブラリのブリッジとしてよく使われるOSSの[SLF4J](https://www.slf4j.org/)や[Apache Commons Logging](https://commons.apache.org/proper/commons-logging/)のJava標準版です。ここでのJava標準版とはjava.lang.Stringなどと同様にJavaの標準ライブラリとしてJDKに含まれものを指していますが、System.Loggerは`java.lang.System.Logger`インタフェースとしてJava9からJava標準ライブラリに含まれるようになりました。

SLF4JやApache Commons Loggingを知っている人への説明は以上で終了！なのですが、これだけでは少々乱暴すぎるため、そのモチベーション(背景)や仕組みなども含めSystem.Loggerについてもう少し深掘りしてみたいと思います。

## 登場背景
まずSystem.Loggerは[JEP 264:Platform Logging API and Service](https://openjdk.org/jeps/264)としてJava9から取り入れられたJavaの標準Logging APIとなります。

この標準が取り入れられた背景には主に次の2つのことがあります。

1つ目はJavaの標準ロギング機能としてのjava.util.logging(通称JUL)の存在です。
使っている人がいるかどうかは別として建前上はJULがあることでJava(JDK)の標準仕様でロギングも行えることになっていますが、Java9から導入されたモジュールシステムにより、標準ライブラリが細かくモジュール化（分割）されたことで、今まで前提として成り立っていたJavaが動作する実行環境では常にJULが使えるという前提が成り立たなくなりました[^1]。

[^1]: JULは`java.logging`として`java.base`モジュールから切り離されました。このためモジュールシステムによって依存を制限されている場合やjlinkで必要な標準ライブラリしか含まないJREが実行環境で使われている場合などで実行時にJULを使えないケースが発生します。

この変更によりJavaとしては具体的なロギング機能ではなく、抽象的なロギングAPIを提供し、利用するロギング機能は実行時に決定する仕組みが必要となりました。


もう1つの背景としてはJULよりもLogbackやLog4jなどのロギングライブラリが使われていることがあります。Javaにおけるのロギング機能の標準化を目指してJDK 1.4から導入されたJULですが当時既に使われていたLog4jのシェアを覆すことはできず今に至っています。（理由はJULが機能がショボく使いづらいからで疑いようがないですが）

Javaに限らずソフトウェア設計における原則として不安定なモジュールよりも安定しているモジュールに依存すべきという原則があります。このため仕様変更やプロダクトライフサイクルがコントロールできないOSSに依存するよりも標準機能があるのであれば、そちらを選択することが一般的には好まれますが、これがロギング機能においてはJULは選択されず、LogbackやLog4jなどのOSSが選択されているのが実際です。

Javaとしてはこの現実を受け止め標準的な仕組みでLogbackやLog4jなどのロギングライブラリを使えるようにすることが求められていました。


## 仕組み
このような背景から導入された仕組みが今回紹介するSystem.Loggerです。この仕組みの全体像は次のようになっています。

![overview](/img/blogs/2023/0209_overview.drawio.svg)

Loggerインスタンスを取得するまでの処理の流れは図のとおりですが、その仕組み上のポイントを挙げると次のようなものがあります。

- `System`クラスに追加された`getLogger`メソッドが`System.Logger`インタフェースのファクトリーメソッドとなる
- `System.Logger`インタフェースのインスタンスは`META-INF/services/java.lang.System$LoggerFinder`(provider-configurationファイル)[^2]をもとに生成されたファクトリーオブジェクト(`System.LoggingFinder`インスタンス)により生成される
- つまり、利用するロギングライブラリはprovider-configurationファイルにより次のように切り替えることができる
  - provider-configurationファイルがクラスパス上になく、かつJULが利用できない場合は、デフォルトのLoggerFinder実装により`コンソールLogger`が使われる
  - provider-configurationファイルがクラスパス上にないがJULが利用できる場合は、デフォルトのLoggerFinder実装によりログ出力をJULへ委譲する`JULのブリッジ実装`が使われる
  - provider-configurationファイルがクラスパス上に存在する場合はそこに設定されているLoggerFinder実装により、生成するLoggerインスタンスが決定される。

[^2]: JavaのServiceLoaderにより読み込まれるファイル

また、図から分かるとおり、どのロギングライブラリを利用したとしてもアプリから依存するのはJava標準ライブラリのみとなり、SFL4JやLog4jなどのロギングライブラリへの直接的な依存は不要となっています。この構造によりアプリはコードを変更することなく、ロギングライブラリをJULからSLF4Jへ変更するといったことができるようになっています。

# System.LoggerのAPI
全体的な視点からSystem.Loggerをみてきましたが、ここからはコードをもとにSystem.Loggerの具体的な利用方法を見ていきます。説明は基本的なAPIの利用方法を説明した後、コードを変えず利用するロガー実装を切り替えていく方法を順に説明していきます。

## 基本的なAPIの利用
まずは特に何も設定せずデフォルトの状態からSystem.Loggerを使う例を見ていきます。この場合のLoggerインスタンスの取得からログの出力コードは次のようになります。

- コード例
```java
import java.lang.System.Logger;
import java.lang.System.Logger.Level;

public class SystemLoggerSample {
    private static final Logger logger = 
        System.getLogger(SystemLoggerSample.class.getName());
    public static void main(String[] args) {
        logger.log(Level.TRACE, "これはTRACEレベルの出力");
        logger.log(Level.DEBUG, "これはDEBUGレベルの出力");
        logger.log(Level.INFO, "これはINFOレベルの出力");
        logger.log(Level.WARNING, "これはWARNレベルの出力");
        logger.log(Level.ERROR, "これはERRORレベルの出力");
    }
}
```
- 実行と出力結果
```shell
java -jar target/system-logger-sample.jar

2月 12, 2023 6:29:37 午後 sample.SystemLoggerSample main
情報: これはINFOレベルの出力
2月 12, 2023 6:29:37 午後 sample.SystemLoggerSample main
警告: これはWARNレベルの出力
2月 12, 2023 6:29:37 午後 sample.SystemLoggerSample main
重大: これはERRORレベルの出力
```

`System.Logger`インスタンスは`System`クラスの`getLogger`メソッドから取得します。`getLogger`の引数はロガー名になります。ロガー名は慣習的にFQCNにするため、SLF4JやLog4jでは引数に`SystemLoggerSample.class`のようにClassインスタンスを渡しますが、`System.Logger`ではClassインスタンスを直接渡すことができないため、`getName`した文字列を渡しています。JULもそうですがロガー名に文字列しか渡すことができないのは少し残念です。

また、SLF4JやLog4jなどの他のロギングライブラリとは異なり`System.Logger`はログレベルを引数で指定します。これは好みの問題ですが、筆者はSLF4JやLog4jのように`debug()`や`info()`などのメソッドで指定する方が好みだったりします。

デフォルトで取得できる`System.Logger`のインスタンスはJULのブリッジ実装になります。したがって、実行結果の出力例はJULのブリッジ実装から委譲されたJULが出力したものとなります。今回はJULをデフォルト設定のまま使っているため、出力結果にはINFO未満のログは出力されていません。

System.loggerはロギング実装を切り替えるだけの機能のため、実際のログの出力設定には関与していません。ログの出力設定を変えたい場合は利用しているロギングライブラリ、今回の場合であればJULのlogging.propertiesを変更することで出力を変えることができます。

試しにlogging.propertiesの出力フォーマットをシステムプロパティを使って変更した場合は次のようになります。
```shell
java -Djava.util.logging.SimpleFormatter.format='[JULLogger]%1$tb %1$td, %1$tY %1$tl:%1$tM:%1$tS %1$Tp %4$s: %5$s%6$s%n' \
    -jar target/system-logger-sample.jar

[JULLogger]2月 12, 2023 6:57:56 午後 情報: これはINFOレベルの出力
[JULLogger]2月 12, 2023 6:57:56 午後 警告: これはWARNレベルの出力
[JULLogger]2月 12, 2023 6:57:56 午後 重大: これはERRORレベルの出力
```

## 有効なロギングライブラリが存在しない場合
上述の[仕組み](#仕組み)で説明したようにSystem.Loggerはランタイムに有効なロギングライブラリが存在しない場合、生成されるLoggerインスタンスはコンソールLoggerにフォールバックされ、ログがどこにも出力されないといった最悪のケースは回避されるようになっています。

ということで、コンソールLoggerにフォールバックされるケースを試してみたいと思いますが、JDK(JRE)にはデフォルトでJULが含まれています。このため、例ではモジュールシステムによる起動を使い、起動オプションには`-m`でルートモジュールとmainクラスを指定し、加えて`-limit-modules`でロードするモジュールをjava.baseに制限するようにします。これによりJULの`java.logging`モジュールがロードされないようになります。なお、ログの出力コードは上述のJULのサンプルコードのままとなります。

- 実行と出力結果
```shell
java -Djdk.system.logger.format='[ConsoleLogger]%1$tb %1$td, %1$tY %1$tl:%1$tM:%1$tS %1$Tp %4$s: %5$s%6$s%n' \
    --module-path target/system-logger-sample.jar \
    --limit-modules java.base \
    -m sample/sample.SystemLoggerSample

[ConsoleLogger]Feb 12, 2023 7:10:10 PM INFO: これはINFOレベルの出力
[ConsoleLogger]Feb 12, 2023 7:10:10 PM WARNING: これはWARNレベルの出力
[ConsoleLogger]Feb 12, 2023 7:10:10 PM ERROR: これはERRORレベルの出力
```

実行時にコンソールLoggerが使われていることを確認するため、`jdk.system.logger.format`プロパティ[^3]でコンソールLoggerの出力フォーマットを変更しています。出力結果の先頭に`[ConsoleLogger]`が出力されていることから確かにコンソールLoggerが使われていることが分かります。

[^3]: コンソールLoggerの設定はドキュメントに明記されていませんが、その実装クラスである`jdk.internal.logger. SimpleConsoleLogger`の実装から各種設定可能なプロパティを確認することができます。

## ロギングライブラリの切り替え
ここまではJava標準のロギング機能を使った例でしたが、今度は本題の標準外のライブラリを利用する例を説明していきます。

System.Loggerに対するブリッジ実装が提供されているロギングライブラリは筆者が知る限り現時点ではSLF4JとLog4jの2つとなります。Logbackに対するブリッジ実装は提供されていないため、Logbackをロギングライブラリに使用する場合はSLF4Jのブリッジ実装を経由した利用のみとなります[^4]。

[^4]: SLF4JとLogbackの開発元は実質的に同じで、かつSLF4JのデフォルトのロギングライブラリはLogbackとなっていることから、System.Loggerを使う場合は、SLF4JとLogbackをセットで使って欲しいとの開発元の意図があるのではないかと筆者は勝手に読んでいます。とは言え役割が同じSystem.LoggerとSLF4Jを経由させるのは若干気持ち悪くはありますが・・

今回はSLF4J+Logbackに切り替えてみたいと思います。
この切り替えはクラスパスにSLF4Jのブリッジ実装とLogbackを追加するだけです。具体的にはpomに次のdependencyを追加します。

```xml
<dependency>
	<groupId>org.slf4j</groupId>
	<artifactId>slf4j-jdk-platform-logging</artifactId>
	<version>2.0.6</version>
</dependency>
<dependency>
	<groupId>ch.qos.logback</groupId>
	<artifactId>logback-classic</artifactId>
	<version>1.4.5</version>
</dependency>
```

:::check: Log4jを使う場合
Log4jを使う場合のSystem.Loggerのブリッジ実装は次のとおりになります。
```xml
<dependency>
    <groupId>org.apache.logging.log4j</groupId>    
    <artifactId>log4j-jpl</artifactId>
    <version>2.17.0</version>
</dependency>
```
:::

slf4j-jdk-platform-loggingがSLF4Jのブリッジ実装となります。[System.Loggerの仕組み](#仕組み)で説明したとおり、ブリッジ実装の切り替えにはprovider-configurationファイルによる実装クラスの指定が必要となりますがslf4j-jdk-platform-loggingには下記のファイルが含まれています。よって利用者がprovider-configurationファイルを用意する必要はありません。

- slf4j-jdk-platform-logging に含まれるprovider-configurationファイル
```shell
org.slf4j.jdk.platform.logging.SLF4JSystemLoggerFinder
```

実行時にはこのファイルがServiceLoaderにより読み込まれ、SLF4Jの`SLF4JSystemLoggerFinder`が使われることでLoggerインスタンスにSLF４Jのブリッジ実装が使われるようになります。

ログ出力コードは変えずにlogback.xmlでログの出力設定を変えた結果は次のとおりになります。
- logback.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE configuration >
<configuration>
  <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
    <encoder>
      <pattern>[SLF4J+Logback]%date [%-5level] [%logger{1}] [%thread] - %message%n</pattern>
    </encoder>
  </appender>
  <root level="INFO">
    <appender-ref ref="STDOUT" />
  </root>
</configuration>
```
- 実行と出力結果
```shell
java -jar target/system-logger-sample.jar

[SLF4J+Logback]2023-02-12 19:31:09,324 [INFO ] [s.SystemLoggerSample] [main] - これはINFOレベルの出力
[SLF4J+Logback]2023-02-12 19:31:09,328 [WARN ] [s.SystemLoggerSample] [main] - これはWARNレベルの出力
[SLF4J+Logback]2023-02-12 19:31:09,328 [ERROR] [s.SystemLoggerSample] [main] - これはERRORレベルの出力
```

## オマケのAPI紹介
基本的なAPIの紹介は以上となります。ここからはSystem.Loggerインタフェースに用意されているその他のAPIを簡単に紹介したいと思います。

### メッセージフォーマットの利用
JavaのMessageFormatの書式を使ってログを次のように出力することができます。

- コード例
```java
private static final Logger logger = 
    System.getLogger(SystemLoggerSample.class.getName());
---
logger.log(Level.INFO, "これは{0}レベルの出力", level.name());
```
- 出力結果
```shell
情報: これはINFOレベルの出力
```

:::alert: 使用可能なメッセージフォーマットは実装依存
書式化に利用するメッセージフォーマットはロギングライブラリごとに異なります。JULとコンソールLoggerでは上記例のとおりMessageFormatが使われますが、SLF4Jのブリッジ実装ではprintfのフォーマットが使われます。
:::


### ResourceBundlerの利用（引数渡し）
引数のメッセージフォーマットは次のようにResourceBundle化して使うこともできます。

- ResourceBundle(/message.properties)
```java
key1=これは{0}レベルの出力
```
- コード例
```java
private static final ResourceBundle RESOURCE = 
    ResourceBundle.getBundle("message");
private static final Logger logger = 
    System.getLogger(SystemLoggerSample.class.getName());
---
logger.log(Level.INFO, RESOURCE, "key1", level.name());
logger.log(Level.WARNING, RESOURCE, "これは{0}レベルの出力", level.name());
```
- 出力結果
```shell
情報: これはINFOレベルの出力
情報: これはWARNINGレベルの出力
```

第3引数の文字列はResourceBundleのキーとして使われますが、キーに該当するものがなかった場合は2つ目の例のようにメッセージフォーマットとして使われます。

### ResourceBundleの利用（Factory渡し）
引数で都度渡していたResourceBundleは次のようにLogger生成時に渡すこともできます。

- コード例
```java
private static final ResourceBundle RESOURCE = 
    ResourceBundle.getBundle("message");
private static final Logger logger = 
    System.getLogger(SystemLoggerSample.class.getName(), RESOURCE);
---
logger.log(Level.INFO, "key1", level.name());
logger.log(Level.WARNING, "これは{0}レベルの出力", level.name());
```
- 出力結果
```shell
情報: これはINFOレベルの出力
情報: これはWARNINGレベルの出力
```

### 出力メッセージの遅延評価
LogbackやLog4jと同様に次のようにラムダを使ってメッセージの評価を実際の出力時まで遅延させることができます。

- コード例
```java
private static final ResourceBundle RESOURCE = 
    ResourceBundle.getBundle("message");
private static final Logger logger = 
    System.getLogger(SystemLoggerSample.class.getName());
---
logger.log(Level.INFO, 
    () -> MessageFormat.format(RESOURCE.getString("key1"), level.name()));
```
- 出力結果
```shell
情報: これはINFOレベルの出力
```

# さいごに
タイトルにあるとおり、その存在に全く気がついていなかったため、これまでSystem.Loggerを使うことはなかったですが、その存在や機能を理解した今の段階で「これ使いますか？」と聞かれたら正直、判断に迷います。

JULは機能的に全く論外でしたが、System.LoggerはSLF4Jと比較した場合、機能的には同等といえます。なので、JakartaEEやMicroProfileなど標準準拠を指向したアプリでは使う意味はあると思いますが、SpringなどのOSSを中心に据えたアプリにおいては現時点ではマイナーで情報量や実績も少ないSystem.Loggerを敢えて使う意味はないかなとは思ったりします。

記事に説明に使用したサンプルコードは一式、[GitHubのリポジトリ](https://github.com/extact-io/system-logger-sample)にアップしています。

---
参照資料

- [A Java geek — System Logger](https://blog.frankel.ch/system-logger/)


