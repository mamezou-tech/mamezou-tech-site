---
title: Spring Boot 4で標準採用！JSpecifyによるnull安全性
author: yasunori-shiota
date: 2025-12-09
tags: [java, spring, spring-boot, advent2025]
image: true
---

これは [豆蔵デベロッパーサイトアドベントカレンダー2025](/events/advent-calendar/2025/) 第9日目の記事です。

先月の11月に、[Spring Boot 4](https://spring.io/blog/2025/11/20/spring-boot-4-0-0-available-now) と [Spring Framework 7](https://spring.io/blog/2025/11/13/spring-framework-7-0-general-availability) がリリースされました。
Spring Boot 4ではnull安全性（Null-Safety）の強化が図られ、**[JSpecify](https://jspecify.dev/)** が標準採用されました。

そこで今回は、Spring Boot 4によるJSpecifyについて記事にしたいと思います。

## JSpecifyとは

JSpecifyは、Javaにおけるnull安全性を標準化するための仕様と、そのアノテーションを提供するオープンソースプロジェクトです。
Javaプログラムのnull安全性を高め、異なるツールやライブラリ間での互換性の問題を解決するための共通的なルールブックのようなものと捉えていただければよいと思います。

[JSR-305](https://jcp.org/en/jsr/proposalDetails?id=305)の停滞やnull安全性に関したアノテーションの乱立を背景に、2021年にGoogleがJSpecifyプロジェクトを立ち上げ、JetBrainsやMeta、Sonarなどの複数の組織と協力して開発を進めてきました。

JSpecifyの1.0.0版がリリースされたのは2024年の7月です。
その後、Spring Boot 4.0.0-M2の[リリースノート](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0.0-M2-Release-Notes)では、JSpecify準拠のアノテーションをコードベースに導入することが発表されました。

## Spring Boot 3系でのnull安全性

筆者の勝手な想像ですが、Spring Boot 3系でJSpecifyを利用されていた開発プロジェクトは少ないのではないでしょうか。
筆者が関わってきた開発プロジェクトで、JSpecifyを利用したことは一度もありませんでした。また、筆者のまわりでもJSpecifyを利用された話は聞いたことがありません。
そのため、このタイミングでJSpecifyがくるとは、まったく予想していなかったというのが正直なところです。

では、Spring Boot 3系でのnull安全性はどのように実装していたかと言いますと、筆者はSpring Frameworkから提供されるアノテーションを利用していました。
基本的には、Spring Frameworkの`@NonNullApi`と`@Nullable`の組み合わせで利用することがほとんどでした。

まず、`package-info.java`のパッケージ宣言に`@NonNullApi`アノテーションを付与し、そのパッケージ配下のクラス等でnullを許容するメソッドの戻り値や引数に`@Nullable`アノテーションを付与していました。

```java:package-info.java
@org.springframework.lang.NonNullApi
package com.mamezou.blog.batch.util;
```

```java
// nullを空文字へ変換する。
public static String nullToEmpty(@Nullable String value) {
  return value == null ? "" : value;
}

// 空文字をnullへ変換する。
@Nullable
public static String emptyToNull(@Nullable String value) {
  return (value == null || value.isEmpty()) ? null : value;
}
```

この他にも`@NonNullFields`アノテーションや`@NonNull`アノテーションが提供されていますが、主にはこの組み合わせで利用することが多かったと記憶しています。

## JSpecifyの導入

JSpecifyの利用方法を説明する前に、プロジェクトへのJSpecifyの導入について簡単に触れておきたいと思います。

Spring Boot 3系でJSpecifyを導入する際には、次のようにMavenプロジェクトの`pom.xml`にJSpecifyの依存関係を追加する必要がありました。

```xml:pom.xml
<dependency>
    <groupId>org.jspecify</groupId>
    <artifactId>jspecify</artifactId>
    <version>1.0.0</version>
</dependency>
```

ですが、Spring Boot 4ではJSpecifyが標準採用されたため、個別にこのような依存関係を追加する必要がありません。
Spring BootのStarterライブラリが含まれていれば、JSpecifyを利用することができます。

記事の執筆に向けて作成したMavenプロジェクトの依存ライブラリを確認してみると、次のとおりとなりました。

```bash
$ mvn dependency:tree -Dincludes=org.jspecify:jspecify
[INFO] --- dependency:3.9.0:tree (default-cli) @ mamezou-blog-batch ---
[INFO] com.mamezou.blog:mamezou-blog-batch:jar:1.0.0
[INFO] \- org.springframework.boot:spring-boot-h2console:jar:4.0.0:compile
[INFO]    \- org.springframework.boot:spring-boot:jar:4.0.0:compile
[INFO]       \- org.springframework:spring-core:jar:7.0.1:compile
[INFO]          \- org.jspecify:jspecify:jar:1.0.0:compile
```

なお、今回は`ApplicationRunner`を用いたCLIベースのバッチアプリケーションとしたため、Spring MVCなどのWeb開発に関したStarterライブラリは含んでおりません。

:::info
Spring Boot 4にて、Spring MVCのStarterライブラリの名称が変更されました。
Spring MVCのStarterライブラリは、Spring Boot 3系では`spring-boot-starter-web`でしたが、Spring Boot 4では`spring-boot-starter-webmvc`となります。
[Spring Initializr](https://start.spring.io/)などからプロジェクトを作成する際は特に気にすることもありませんが、直接`pom.xml`や`build.gradle`を編集する際はご注意ください。
:::

## JSpecifyの利用

それでは、JSpecifyが提供するアノテーションについて説明していきたいと思います。

JSpecifyにおけるnull安全性のアノテーションは、次の4つを利用します。

|No.|アノテーション|説明|
|:---:|:----|:----|
|1|`@Nullable`|null許容であることを示すアノテーション。|
|2|`@NonNull`|null非許容であることを示すアノテーション。|
|3|`@NullMarked`|一律でnull非許容とするためのアノテーション。|
|4|`@NullUnmarked`|null安全性チェックの対象外とするアノテーション。|

### Nullable と NonNull

メソッドの戻り値や引数にnullを許容する場合は、`@Nullable`アノテーションを使用します。
一方で、nullを非許容とする場合は、`@NonNull`アノテーションを使用します。
利用方法としては、Spring Frameworkから提供されるアノテーションと同じです。

Spring Frameworkのアノテーションと比較して大きく異なるのが、JSpecifyの`@Nullable`と`@NonNull`は、アノテーションの定義における`@Target`に`ElementType.TYPE_USE`が指定されている点です。

```java:org.springframework.lang.Nullable
@Target({ElementType.METHOD, ElementType.PARAMETER, ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@CheckForNull
@Deprecated(since = "7.0")
@TypeQualifierNickname
public @interface Nullable
```

```java:org.jspecify.annotations.Nullable
@Documented
@Target({ElementType.TYPE_USE})
@Retention(RetentionPolicy.RUNTIME)
public @interface Nullable
```

これにより、JSpecifyの`@Nullable`と`@NonNull`は、型が使用されているあらゆるところにアノテーションを付与することができます。
たとえば、次のような`@Nullable`の指定は、Spring Frameworkのアノテーションではビルドエラーとなりますが、JSpecifyのアノテーションではエラーになりません。

```java
@NonNull
public List<@Nullable String> getValues {
  // ----- ＜中略＞ ----- //
}
```

この場合、戻り値となる`List`の要素にnullが含まれてもよいことを示しています。`List`そのものはnull非許容となります。

### NullMarked

`@NullMarked`は、Spring Frameworkの`@NonNullApi`や`@NonNullFields`と同様となり、`package-info.java`のパッケージ宣言に付与することで、パッケージ内のクラス等を一括でnull非許容として扱うことができます。
つまり、`@NullMarked`を使用すれば、null非許容とする箇所に`@NonNull`を指定する必要がなくなりますね。

```java:package-info.java
@org.jspecify.annotations.NullMarked
package com.mamezou.blog.batch.util;
```

```java
// @NonNull ← これは不要
public static String nullToEmpty(@Nullable String value) {
  return value == null ? "" : value;
}
```

先述の「[Spring Boot 3系でのnull安全性](#spring-boot-3系でのnull安全性)」のように、JSpecifyにおいても`@NullMarked`と`@Nullable`の組み合わせでnull安全性を実現することができます。

### NullUnmarked

最後に`@NullUnmarked`ですが、Spring Frameworkにこれ相応のアノテーションは存在せず、JSpecify特有のアノテーションとなります。
`@NullUnmarked`は、null安全性チェックの対象外とするためのアノテーションです。

次のようなメソッドは本来、戻り値と引数に`@Nullable`を付与する必要がありますが、`@NullUnmarked`をクラスに付与することでnull安全性チェックの対象外とすることができます。

```java
@NoArgsConstructor(access = AccessLevel.PRIVATE)
@NullUnmarked
public final class StringUtils {

  public static String emptyToNull(String value) {
    return (value == null || value.isEmpty()) ? null : value;
  }

}
```

`@NullMarked`と同様、`@NullUnmarked`も`package-info.java`のパッケージ宣言に付与することができます。
しかし、パッケージ宣言に`@NullUnmarked`を指定してしまうと、null安全性チェックの対象外のスコープを広めてしまうため、パッケージ宣言は`@NullMarked`を基本とし、必要に応じてクラスまたはメソッドの単位に`@NullUnmarked`を指定するのがよいと筆者は考えます。

## アノテーションの対応関係

null安全性に関して、Spring Frameworkのアノテーションと比較しながら、JSpecifyのアノテーションについて説明してきました。
これらのアノテーションの対応関係をまとめると、下表のとおりとなります。

|No.|Spring Boot 4（JSpecify）|Spring Boot 3系（Spring Framework）|
|:---:|:----|:----|
|1|`org.jspecify.annotations.Nullable`|`org.springframework.lang.Nullable`|
|2|`org.jspecify.annotations.NonNull`|`org.springframework.lang.NonNull`|
|3|`org.jspecify.annotations.NullMarked`|`org.springframework.lang.NonNullApi`|
|4|`org.jspecify.annotations.NullMarked`|`org.springframework.lang.NonNullFields`|
|5|`org.jspecify.annotations.NullUnmarked`|該当なし|

ここでひとつ、残念なお知らせがあります。
Spring Boot 4のリリースと併せて、Spring Frameworkから提供される`@Nullable`、`@NonNull`、`@NonNullApi`、および`@NonNullFields` は非推奨（`@Deprecated`）となりました。
これらのJavadocを参照すると、すべてJSpecifyのアノテーションへの移行を促しています。

つまり、Spring Frameworkのアノテーションを利用している開発プロジェクトでは、Spring Bootのバージョンアップに伴ってJSpecifyのアノテーションへの置き換えが必要となります。
すでにSpring Boot 4へのバージョンアップが計画されている開発プロジェクトや、数年先にリリースを控えている開発プロジェクトでは、少なからず影響があるのではないでしょうか。

## 最後に

というわけでして、簡単ですがSpring Boot 4に標準採用されました「JSpecify」について説明させていただきました。
さらに詳細な利用方法については、JSpecify公式の[ユーザーガイド](https://jspecify.dev/docs/user-guide/)などを参照いただきたく存じます。

Spring FrameworkやJakartaプロジェクト、JetBrains、Lombokなど、null安全性のアノテーションが乱立する中、JSpecifyプロジェクトによる標準化に向けた動きそのものは正しい取り組みと感じています。
しかし、その一方でSpring Bootを用いたアプリケーション開発において、Spring Frameworkのアノテーションが非推奨となることは予想できなかったですし、冒頭でも述べたとおりJSpecifyが巻き返してくるとは思ってもみませんでした。

Spring Bootのアップデートに伴い、Spring Frameworkにおけるnull安全性のアノテーションが非推奨となっても、アプリケーションの動作に直接影響することはないと思います。
ですが、非推奨のまま利用し続けるのは、ちょっと！ちょっとちょっと！という想いです。
また、多くの開発プロジェクトでも、非推奨のものを利用するな！が基本原則として定められていることと推察します。
ですので、これに関してはSpring Bootをアップデートする際、Spring FrameworkのアノテーションをJSpecifyのアノテーションに置き換えるというのが正しい対応と言えるでしょう。

今回は、JSpecifyのnull安全性といった少し地味目のネタではありましたが、最後までご覧いただき本当にありがとうございました。
