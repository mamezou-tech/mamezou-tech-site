---
title: JSpecifyの導入によるnull安全性
author: yasunori-shiota
date: 2025-12-09
tags: [java, advent2025]
image: true
---

これは [豆蔵デベロッパーサイトアドベントカレンダー2025](/events/advent-calendar/2025/) 第9日目の記事です。

先月の11月に、[Spring Boot 4.0.0](https://spring.io/blog/2025/11/20/spring-boot-4-0-0-available-now) と [Spring Framework 7.0](https://spring.io/blog/2025/11/13/spring-framework-7-0-general-availability) がリリースされました。
Spring Boot 4.0.0ではnull安全性（Null-Safety）の強化が図られ、**[JSpecify](https://jspecify.dev/)** が標準採用されました。

そこで今回は、Spring Boot 4.0.0によるJSpecifyについて記事にしたいと思います。

## JSpecifyとは

JSpecifyは、Javaにおけるnull安全性を標準化するための仕様と、そのアノテーションを提供するオープンソースプロジェクトとなります。
簡単に言えば、JSpecifyはJavaのコードのnull安全性を高め、異なるツールやライブラリ間での互換性の問題を解決するための共通的なルールブックのようなものと捉えていただければよいと思います。

[JSR-305](https://jcp.org/en/jsr/proposalDetails?id=305)の停滞やnull安全性に関したアノテーションの乱立を背景に、2021年頃にGoogleがJSpecifyプロジェクトを立ち上げ、JetBrainsやUberなどの複数の組織と協力して開発を進めてきました。
JSpecifyの1.0.0版がリリースされたのは2024年の7月で、それを受けてSpring Boot 4.0.0-M2の[リリースノート](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0.0-M2-Release-Notes)では、JSpecify準拠のアノテーションをコードベースに導入することが発表されました。

なお、さらに詳細な情報については、JSpecifyの[公式サイト](https://jspecify.dev/)をご参照ください。

## Spring Boot 3系でのnull安全性

筆者の勝手な想像ですが、Spring Boot 3系でJSpecifyを利用されていた開発プロジェクトは少ないのではないでしょうか。
筆者が関わってきた開発プロジェクトで、JSpecifyを利用したことは一度もありませんでした。また、筆者のまわりでもJSpecifyを利用された話は聞いたことがありません。
つまるところ、JSpecifyがくるとはまったく予想していなかったというのが正直なところです。

では、Spring Boot 3系でのnull安全性はどのように実装していたかと言いますと、筆者はSpring Frameworkから提供されるアノテーションを利用していました。
基本的には、Spring Frameworkの`NonNullApi`と`Nullable`の組み合わせで利用することが多かったです。

まず、`package-info.java`のパッケージ宣言に`NonNullApi`アノテーションを付与し、そのパッケージ配下のクラス等でnullを許容するメソッドの戻り値や引数に`Nullable`アノテーションを付与していました。

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

この他にも`NonNullFields`アノテーションや`NonNull`アノテーションが提供されていますが、主にはこの組み合わせで利用することがほとんどでした。

## JSpecifyの利用

それでは、Spring Boot 4.0.0に標準採用されたJSpecifyを利用していきたいと思います。

Spring Boot 3系でJSpecifyを利用する際には、次のようにMavenプロジェクトの`pom.xml`にJSpecifyの依存関係を追加する必要がありました。

```xml:pom.xml
<dependency>
    <groupId>org.jspecify</groupId>
    <artifactId>jspecify</artifactId>
    <version>1.0.0</version>
</dependency>
```

ですが、Spring Boot 4.0.0ではJSpecifyが標準採用されたため、このような依存関係を追加する必要がありません。
Spring Boot のStarterライブラリが含まれていれば、JSpecifyが利用できる状態となります。

記事の執筆に向けて作成したMavenプロジェクトの依存ライブラリを確認してみると、次のとおりとなります。

```bash
$ mvn dependency:tree -Dincludes=org.jspecify:jspecify
[INFO] --- dependency:3.9.0:tree (default-cli) @ mamezou-blog-batch ---
[INFO] com.mamezou.blog:mamezou-blog-batch:jar:1.0.0
[INFO] \- org.springframework.boot:spring-boot-h2console:jar:4.0.0:compile
[INFO]    \- org.springframework.boot:spring-boot:jar:4.0.0:compile
[INFO]       \- org.springframework:spring-core:jar:7.0.1:compile
[INFO]          \- org.jspecify:jspecify:jar:1.0.0:compile
```

なお、今回はCLIベースのバッチアプリケーションとしたため、Spring MVCなどのWeb開発に関したStarterライブラリは含んでおりません。

:::info
Spring Boot 4.0.0にて、Spring MVCのStarterライブラリの名称が変更されました。
Spring Boot 3系では`spring-boot-starter-web`でしたが、Spring Boot 4.0.0では`spring-boot-starter-webmvc`となります。
[Spring Initializr](https://start.spring.io/)などからプロジェクトを作成する際は特に気にすることはないですが、`pom.xml`や`build.gradle`を直接編集する際はご注意ください。
:::
