---
title: Spring Boot 4标准采用！JSpecify带来的null安全性
author: yasunori-shiota
date: 2025-12-09T00:00:00.000Z
tags:
  - java
  - spring
  - spring-boot
  - advent2025
image: true
translate: true

---

这是 [is开发者网站Advent日历2025](/events/advent-calendar/2025/) 第9天的文章。

在上个月（11月），[Spring Boot 4](https://spring.io/blog/2025/11/20/spring-boot-4-0-0-available-now) 和 [Spring Framework 7](https://spring.io/blog/2025/11/13/spring-framework-7-0-general-availability) 发布了。  
在 Spring Boot 4 中，null 安全性（Null-Safety）得到了强化，并将 **[JSpecify](https://jspecify.dev/)** 作为标准采纳。

因此，这次想介绍一下 Spring Boot 4 中的 JSpecify。

## 什么是 JSpecify

JSpecify 是一个开源项目，提供用于在 Java 中对 null 安全性进行标准化的规范及其注解。  
你可以将它视为一本通用的规则手册，用于提升 Java 程序的 null 安全性，并解决不同工具或库之间的兼容性问题。

在 [JSR-305](https://jcp.org/en/jsr/proposalDetails?id=305) 停滞以及关于 null 安全性的注解泛滥的背景下，Google 于 2021 年发起了 JSpecify 项目，并与 JetBrains、Meta、Sonar 等多个组织合作推进开发。

JSpecify 1.0.0 版于 2024 年 7 月发布。此后，在 Spring Boot 4.0.0-M2 的[发布说明](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0.0-M2-Release-Notes) 中，宣布将在代码库中引入符合 JSpecify 规范的注解。

## Spring Boot 3 系的 null 安全性

笔者个人推测，在 Spring Boot 3 系中使用 JSpecify 的开发项目应该不多。  
在笔者参与的开发项目中，从未使用过 JSpecify，也未在身边听说过有人使用过。  
因此，实话说，在这个时机引入 JSpecify 完全出乎意料。

那么，在 Spring Boot 3 系中，null 安全性是如何实现的呢？  
笔者主要使用 Spring Framework 提供的注解。  
基本上，大多数情况下是通过组合使用 Spring Framework 的 `@NonNullApi` 和 `@Nullable`。

首先，在 `package-info.java` 的包声明上添加 `@NonNullApi` 注解，  
然后在该包下的类中，对允许为 null 的方法返回值或参数添加 `@Nullable` 注解。

```java:package-info.java
@org.springframework.lang.NonNullApi
package com.mamezou.blog.batch.util;
```

```java
// 将 null 转换为空字符串。
public static String nullToEmpty(@Nullable String value) {
  return value == null ? "" : value;
}

// 将空字符串转换为 null。
@Nullable
public static String emptyToNull(@Nullable String value) {
  return (value == null || value.isEmpty()) ? null : value;
}
```

此外，还提供了 `@NonNullFields` 注解和 `@NonNull` 注解，但笔者记得大多情况下是使用上述组合。

## 引入 JSpecify

在说明如何使用 JSpecify 之前，先简单介绍一下在项目中引入 JSpecify 的方法。

在 Spring Boot 3 系中，如果要引入 JSpecify，需要在 Maven 项目的 `pom.xml` 中添加如下依赖：

```xml:pom.xml
<dependency>
    <groupId>org.jspecify</groupId>
    <artifactId>jspecify</artifactId>
    <version>1.0.0</version>
</dependency>
```

但在 Spring Boot 4 中，由于已将 JSpecify 作为标准采纳，  
无需单独添加上述依赖。  
只要包含了 Spring Boot 的 Starter 库，就可以使用 JSpecify。

在为撰写本文而创建的 Maven 项目中，检查依赖库后如下所示：

```bash
$ mvn dependency:tree -Dincludes=org.jspecify:jspecify
[INFO] --- dependency:3.9.0:tree (default-cli) @ mamezou-blog-batch ---
[INFO] com.mamezou.blog:mamezou-blog-batch:jar:1.0.0
[INFO] \- org.springframework.boot:spring-boot-h2console:jar:4.0.0:compile
[INFO]    \- org.springframework.boot:spring-boot:jar:4.0.0:compile
[INFO]       \- org.springframework:spring-core:jar:7.0.1:compile
[INFO]          \- org.jspecify:jspecify:jar:1.0.0:compile
```

另外，由于这里使用 `ApplicationRunner` 构建的是基于 CLI 的批处理应用，  
因此并未包含 Spring MVC 等 Web 开发相关的 Starter 库。

:::info
在 Spring Boot 4 中，Spring MVC 的 Starter 库名称已更改。  
在 Spring Boot 3 系中，Spring MVC 的 Starter 库是 `spring-boot-starter-web`，  
而在 Spring Boot 4 中变为 `spring-boot-starter-webmvc`。  
通过 [Spring Initializr](https://start.spring.io/) 等创建项目时无需特别注意，  
但如果直接编辑 `pom.xml` 或 `build.gradle` 时请留意。
:::

## 使用 JSpecify

接下来，介绍 JSpecify 提供的注解。

JSpecify 中用于 null 安全性的注解有以下四种：

|No.|注解|说明|
|:---:|:----|:----|
|1|`@Nullable`|表示允许为 null 的注解。|
|2|`@NonNull`|表示不允许为 null 的注解。|
|3|`@NullMarked`|用于统一将范围内标记为不允许为 null 的注解。|
|4|`@NullUnmarked`|用于将范围排除在 null 安全性检查之外的注解。|

### Nullable 和 NonNull

当方法返回值或参数允许为 null 时，使用 `@Nullable` 注解。  
当不允许为 null 时，使用 `@NonNull` 注解。  
使用方式与 Spring Framework 提供的注解相同。

与 Spring Framework 的注解相比，  
JSpecify 的 `@Nullable` 和 `@NonNull` 在定义时的 `@Target` 指定了 `ElementType.TYPE_USE`。

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

这样一来，JSpecify 的 `@Nullable` 和 `@NonNull` 可以应用到所有使用类型的地方。  
例如，下面这种在类型参数上使用 `@Nullable` 的写法，  
在 Spring Framework 的注解中会导致构建错误，但在 JSpecify 的注解中不会报错：

```java
@NonNull
public List<@Nullable String> getValues {
  // ----- ＜中略＞ ----- //
}
```

这里表示，返回的 `List` 本身不允许为 null，但其元素可以包含 null。

### NullMarked

`@NullMarked` 类似于 Spring Framework 的 `@NonNullApi` 或 `@NonNullFields`，  
可在 `package-info.java` 的包声明上添加，将整个包内的类统一标记为不允许为 null。  
也就是说，使用 `@NullMarked` 后，就无需再在每个不允许为 null 的位置添加 `@NonNull` 了。

```java:package-info.java
@org.jspecify.annotations.NullMarked
package com.mamezou.blog.batch.util;
```

```java
// @NonNull ← 此处无需再标记
public static String nullToEmpty(@Nullable String value) {
  return value == null ? "" : value;
}
```

如前文“[Spring Boot 3 系的 null 安全性](#spring-boot-3系的null安全性)”所述，  
在 JSpecify 中同样可以通过 `@NullMarked` 和 `@Nullable` 的组合来实现 null 安全。

### NullUnmarked

最后是 `@NullUnmarked`，Spring Framework 中没有对应注解，是 JSpecify 特有的注解。  
`@NullUnmarked` 用于排除在 null 安全性检查之外。

下面这个方法，按理来说需要在返回值和参数上添加 `@Nullable`，  
但在类上添加 `@NullUnmarked` 后，即可将其排除在 null 安全性检查之外：

```java
@NoArgsConstructor(access = AccessLevel.PRIVATE)
@NullUnmarked
public final class StringUtils {

  public static String emptyToNull(String value) {
    return (value == null || value.isEmpty()) ? null : value;
  }

}
```

与 `@NullMarked` 类似，`@NullUnmarked` 也可以在 `package-info.java` 的包声明中添加。  
但如果在包声明上使用 `@NullUnmarked`，会将排除检查的范围扩大。  
因此，笔者认为包级别应以 `@NullMarked` 为主，在需要时再在具体的类或方法级别使用 `@NullUnmarked`。

## 注解的对应关系

针对 null 安全性，本文对比了 Spring Framework 的注解，并介绍了 JSpecify 的注解。  
下表总结了这些注解之间的对应关系：

|No.|Spring Boot 4（JSpecify）|Spring Boot 3 系（Spring Framework）|
|:---:|:----|:----|
|1|`org.jspecify.annotations.Nullable`|`org.springframework.lang.Nullable`|
|2|`org.jspecify.annotations.NonNull`|`org.springframework.lang.NonNull`|
|3|`org.jspecify.annotations.NullMarked`|`org.springframework.lang.NonNullApi`|
|4|`org.jspecify.annotations.NullMarked`|`org.springframework.lang.NonNullFields`|
|5|`org.jspecify.annotations.NullUnmarked`|无对应|

在此有一个遗憾的消息。  
随着 Spring Boot 4 的发布，Spring Framework 提供的 `@Nullable`、`@NonNull`、`@NonNullApi` 以及 `@NonNullFields` 已被标记为不推荐使用（`@Deprecated`）。  
查看它们的 Javadoc 会发现，都建议迁移到 JSpecify 的注解。

也就是说，在使用 Spring Framework 注解的开发项目中，  
随着 Spring Boot 版本升级，需要将注解替换为 JSpecify 注解。  
对于已经计划升级到 Spring Boot 4 的项目，或几年后才会发布新版本的项目，多少会受到一些影响吧。

## 最后

以上就是对 Spring Boot 4 标准采纳的 “JSpecify” 的简要介绍。  
如需更详细的使用方法，请参考 JSpecify 官方的[用户指南](https://jspecify.dev/docs/user-guide/)。

在 Spring Framework、Jakarta 项目、JetBrains、Lombok 等多种 null 安全注解并存的情况下，  
JSpecify 项目推动的标准化工作本身是非常正确的举措。  
但与此同时，在使用 Spring Boot 进行应用开发时，Spring Framework 的注解被标记为不推荐使用确实出乎意料，也如开头所述，并未料到 JSpecify 会迎来反击。

即便随着 Spring Boot 更新，Spring Framework 中的 null 安全注解变为不推荐使用，对应用的运行不会有直接影响。  
但如若继续使用不推荐注解，总觉得有些……不太好吧！  
而且大多数开发项目也会制定“不使用不推荐项目”的基本原则。  
因此，在升级 Spring Boot 时将 Spring Framework 的注解替换为 JSpecify 的注解，可谓是正确的应对之策。

这次虽然是有关 JSpecify null 安全性的略显低调的话题，感谢各位阅读到最后。
