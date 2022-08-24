---
title: 今さら聞けないMaven - JUnit5のテストクラスがなぜか実行されない
author: toshio-ogiwara
date: 2022-08-24
tags: [java, maven, junit]
templateEngineOverride: md
---

JUnit5のテストクラスをEclipseなどのIDEからは問題なく実行できるのにMavenコマンドから実行するとなぜかテストクラスが検出されず実行されなくなる。そんなお困りの事象と対処方法について今回は説明します。とりあえずどうすればいいかだけ教えて！という方は[対処](#症状への対処)からどうぞ。

:::info:今さら聞けないMaven
Mavenが誕生してから早20年ですが、開発で使っていると未だにハマってしまうことやコレってどうやるのだろう？と思うことがあったりします。そんなハマった！できた！こうやった！的な今さら大きな声で聞けない、言えないMavenのあれこれを備忘を兼ねライトに紹介してきたいと思います。
:::

[[TOC]]

## 実行されない症状
Eclispseでは問題なく実行できるJUnit5のテストクラスがMavenで実行すると以下のようにrunが0件となりテストが実行されない。
![コンソールログ1](/img/blogs/2022/0824_maven-junit5-log1.png)

アノテーションはJUnit5の`org.junit.jupiter.api.Test`を使っていること、dependencyにもJUnit5の`junit-jupiter-engine`を指定していることは確認しているが、実行すると次のようなログが出力されSurefireプラグインがなぜかJUni4モードで実行されているように見える。
![コンソールログ2](/img/blogs/2022/0824_maven-junit5-log2.png)

## 症状の原因
Surefireプラグインはクラスパス上に存在するJUnitのライブラリから実行するテストフレームワークのプロバイダーを自動で決定します[^1]。コンソールログに`Using auto detected provider org.apache.maven.Surefire.junit4.JUnit4Provider`と出力されている場合、その原因はクラスパス上にJUnit4のなんらかのクラスが存在し、それによりSurefireプラグインでJUnit4のプロバイダーが選択され、結果JUnit5のテストモジュールが検出されず1件も実行されないためとなります。

[^1]: 公式ドキュメント: [Maven Surefire Plugin - Selecting Providers](https://maven.apache.org/surefire/maven-surefire-plugin/examples/providers.html)
 


筆者がハマったケースは、テストスイートクラスだけはEclipseのJUnit4のテストランナーで実行する必要があるため、dependencyにJUnitPlatform runnerを追加していたのが原因でした。この原因となったテストスイートとdependencyは次のようなものです。

```java
import org.junit.platform.runner.JUnitPlatform;
import org.junit.platform.suite.api.SelectPackages;
import org.junit.runner.RunWith;

@RunWith(JUnitPlatform.class) // JUnitPlatform runner
@SelectPackages("io.extact.maven.sample")
public class AllTestSuite {
}
```
```xml
<dependencies>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.8.2</version>
        <scope>test</scope>
    </dependency>
    <!-- ↓↓↓ 原因となったdependency ↓↓↓ -->
    <dependency>
        <groupId>org.junit.platform</groupId>
        <artifactId>junit-platform-runner</artifactId>
        <version>1.8.2</version>
        <scope>test</scope>
    </dependency>
    ...
</dependencies>
```

JUnitPlatform runner(`junit-platform-runner`)はJUnit5のテストクラスをJUnit4環境で実行できるようにするものです。このため、推移的依存にJUnit4のjunit-4.x.jarを含みます。筆者がハマったケースではこの推移的依存があるために、SurefireプラグインがJUnit4のプロバイダーを誤検出する要因となっていました。

と、原因が分かると、JUnitPlatform runnerをdependencyに含めてるのでJUnit4のランタイムが入るのは当たり前じゃん！と思われるかも知れませんが、言い訳をさせてもらうとクラス名が”Test”で終わらないxxxSuiteクラスはテスト実行の対象とならないため、このクラスがSurefireのテスト実行に副作用を与えるとは思っていませんでした・・

また、それ以前にそもそもテストスイートを実行するのになんでJUnitPlatform runnerを使ってるの？と思われる方は最後のコラムをみていただければと思います。

## 症状への対処
一番本質的な対処方法はJUnit4ライブラリの依存を排除することですが、筆者がそうであったようになんらかの理由により排除することができない場合があると思います。その場合はSurefireプラグインに次のように`<dependency>`の設定を追加し、強制的にJUnit5のプロバイダーが利用されるようにします。

```xml
<build>
    <plugins>
    <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.0.0-M7</version>
        <!-- ↓↓↓ dependencyを追加する ↓↓↓ -->
        <dependencies>
            <dependency>
                <groupId>org.apache.maven.surefire</groupId>
                <artifactId>surefire-junit-platform</artifactId>
                <version>3.0.0-M7</version>
            </dependency>
        </dependencies>
        </plugin>
    </plugins>
</build>
```

これにより次のように常にJUnit5のプロバイダー(`JUnitPlatformProvider`)が検出されるようになり、JUnit5のテストクラスが実行されるようになります。

![コンソールログ3](/img/blogs/2022/0824_maven-junit5-log3.png)

対処は以上となります。サンプルコードの全量は以下のGitHubに格納してあります。
- <https://github.com/extact-io/maven-junit5-not-running>


:::column:JUnit5におけるテストスイートの実行
JUnit5でも当然テストスイートの機能はサポートされており、JUnit5ネイティブな機能を使う場合、JUnitPlatform runnerは使わず次のように`@Suite`と`junit-platform-suite-api`、`junit-platform-suite-engine`を使います。

```java
import org.junit.platform.suite.api.SelectPackages;
import org.junit.platform.suite.api.Suite;

@Suite
@SelectPackages("io.extact.maven.sample")
public class AllTestSuite {
}
```

```xml
<dependencies>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        ...
    </dependency>
    <dependency>
        <groupId>org.junit.platform</groupId>
        <artifactId>junit-platform-runner</artifactId>
        ...
    </dependency>
    <dependency>
        <groupId>org.junit.platform</groupId>
        <artifactId>junit-platform-suite-api</artifactId>
        <version>1.8.2</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.junit.platform</groupId>
        <artifactId>junit-platform-suite-engine</artifactId>
        <version>1.8.2</version>
        <scope>test</scope>
    </dependency>
...
</dependencies>
```

が、このようにJUnit5ネイティブでテストスイートを定義した場合、Eclipseはテストモジュールと認識してくれなくなり、コンテキストメニューからのテスト実行ができなくなります（要はEclipseから普通にテストスイートの実行ができなくなります）。この問題に対処するため、筆者はテストスイートだけはJUnitPlatform runnerの機能を使うようにしています。

一方でVSCodeではJUnit5ネイティブなテストスイートを問題なく実行することができるところから、この原因は恐らくEclipseのJUnitランナー実装が@Suiteに対応していないためではないかと思います。
:::

---
参考資料

- stackoverflow: [How Does Surefire decide on the Test framework?](https://stackoverflow.com/questions/71098049/how-does-Surefire-decide-on-the-test-framework)



