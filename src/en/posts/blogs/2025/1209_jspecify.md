---
title: Standard Adoption in Spring Boot 4! Null Safety with JSpecify
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

This is Day 9 of the Mamezou Developer Site Advent Calendar 2025.

Last month in November, [Spring Boot 4](https://spring.io/blog/2025/11/20/spring-boot-4-0-0-available-now) and [Spring Framework 7](https://spring.io/blog/2025/11/13/spring-framework-7-0-general-availability) were released.  
In Spring Boot 4, null safety has been enhanced and **[JSpecify](https://jspecify.dev/)** has been adopted as a standard.

In this article, I would like to write about JSpecify in Spring Boot 4.

## What is JSpecify

JSpecify is a specification and an open-source project providing annotations to standardize null safety in Java.  
You can think of it as a common rulebook to improve null safety in Java programs and resolve compatibility issues between different tools and libraries.

Against the backdrop of the stagnation of [JSR-305](https://jcp.org/en/jsr/proposalDetails?id=305) and the proliferation of annotations related to null safety, Google launched the JSpecify project in 2021 and has been developing it in collaboration with multiple organizations such as JetBrains, Meta, and Sonar.

Version 1.0.0 of JSpecify was released in July 2024.  
Thereafter, in the release notes for Spring Boot 4.0.0-M2, it was announced that JSpecify-compliant annotations would be introduced into the codebase.

## Null Safety in Spring Boot 3.x

This may be just my assumption, but I suspect that few development projects were using JSpecify in Spring Boot 3.x.  
In the projects I’ve been involved in, I never used JSpecify. Nor have I heard of anyone around me using JSpecify.  
Therefore, to be honest, I didn’t foresee JSpecify coming at this time.

So how was null safety implemented in Spring Boot 3.x? I was using the annotations provided by Spring Framework.  
Basically, I mostly used a combination of Spring Framework’s `@NonNullApi` and `@Nullable`.

First, I added the `@NonNullApi` annotation to the package declaration in `package-info.java`, and for methods that allowed null return values or arguments within that package, I annotated them with `@Nullable`.

```java:package-info.java
@org.springframework.lang.NonNullApi
package com.mamezou.blog.batch.util;
```

```java
// Convert null to an empty string.
public static String nullToEmpty(@Nullable String value) {
  return value == null ? "" : value;
}

// Convert an empty string to null.
@Nullable
public static String emptyToNull(@Nullable String value) {
  return (value == null || value.isEmpty()) ? null : value;
}
```

Spring Framework also provides `@NonNullFields` and `@NonNull` annotations, but I mainly used the combination described above.

## Introducing JSpecify

Before explaining how to use JSpecify, I’d like to briefly touch on introducing JSpecify into a project.

When introducing JSpecify in Spring Boot 3.x, it was necessary to add JSpecify as a dependency in the Maven project’s `pom.xml` as follows:

```xml:pom.xml
<dependency>
    <groupId>org.jspecify</groupId>
    <artifactId>jspecify</artifactId>
    <version>1.0.0</version>
</dependency>
```

However, in Spring Boot 4, JSpecify is adopted as a standard, so there’s no need to add such a dependency individually.  
If you have the Spring Boot Starter libraries included, you can use JSpecify.

When I checked the dependencies of the Maven project I created for writing this article, they were as follows:

```bash
$ mvn dependency:tree -Dincludes=org.jspecify:jspecify
[INFO] --- dependency:3.9.0:tree (default-cli) @ mamezou-blog-batch ---
[INFO] com.mamezou.blog:mamezou-blog-batch:jar:1.0.0
[INFO] \- org.springframework.boot:spring-boot-h2console:jar:4.0.0:compile
[INFO]    \- org.springframework.boot:spring-boot:jar:4.0.0:compile
[INFO]       \- org.springframework:spring-core:jar:7.0.1:compile
[INFO]          \- org.jspecify:jspecify:jar:1.0.0:compile
```

Note that since this is a CLI-based batch application using `ApplicationRunner`, it doesn’t include Starter libraries related to web development such as Spring MVC.

:::info
In Spring Boot 4, the name of the Spring MVC Starter library has changed.  
In Spring Boot 3.x, it was `spring-boot-starter-web`, but in Spring Boot 4 it is `spring-boot-starter-webmvc`.  
When creating a project from tools like [Spring Initializr](https://start.spring.io/), you don’t need to worry about this, but if you’re editing `pom.xml` or `build.gradle` directly, please be aware.
:::

## Using JSpecify

Now, let’s explain the annotations provided by JSpecify.

JSpecify provides four annotations for null safety:

|No.|Annotation|Description|
|:---:|:----|:----|
|1|`@Nullable`|Indicates that null is allowed.|
|2|`@NonNull`|Indicates that null is not allowed.|
|3|`@NullMarked`|Annotation to treat everything in the scope as non-nullable.|
|4|`@NullUnmarked`|Annotation to exclude from null-safety checks.|

### Nullable and NonNull

Use the `@Nullable` annotation when a method return value or parameter allows null.  
Conversely, use the `@NonNull` annotation when null is not allowed.  
The usage is the same as the annotations provided by Spring Framework.

A major difference compared to Spring Framework’s annotations is that JSpecify’s `@Nullable` and `@NonNull` specify `ElementType.TYPE_USE` in their `@Target` definitions.

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

This allows JSpecify’s `@Nullable` and `@NonNull` to annotate any usage of a type.  
For example, the following `@Nullable` specification would cause a build error with Spring Framework’s annotation, but not with JSpecify’s:

```java
@NonNull
public List<@Nullable String> getValues() {
  // ----- omitted -----
}
```

This indicates that the elements of the returned `List` may be null, while the `List` itself is non-nullable.

### NullMarked

`@NullMarked` is similar to Spring Framework’s `@NonNullApi` or `@NonNullFields`, and when added to the package declaration in `package-info.java`, treats classes within the package as non-nullable.  
Using `@NullMarked` means you no longer need to annotate non-nullable elements with `@NonNull`.

```java:package-info.java
@org.jspecify.annotations.NullMarked
package com.mamezou.blog.batch.util;
```

```java
// @NonNull ← Not needed
public static String nullToEmpty(@Nullable String value) {
  return value == null ? "" : value;
}
```

As in the section on null safety in Spring Boot 3.x, you can achieve null safety in JSpecify by combining `@NullMarked` and `@Nullable`.

### NullUnmarked

Finally, `@NullUnmarked` is unique to JSpecify and has no equivalent in Spring Framework.  
`@NullUnmarked` excludes the annotated scope from null-safety checks.

For example, you would normally need to annotate the return value and parameter with `@Nullable`, but by adding `@NullUnmarked` to the class, it is excluded from null-safety checks.

```java
@NoArgsConstructor(access = AccessLevel.PRIVATE)
@NullUnmarked
public final class StringUtils {

  public static String emptyToNull(String value) {
    return (value == null || value.isEmpty()) ? null : value;
  }

}
```

Like `@NullMarked`, `@NullUnmarked` can also be added to a package declaration in `package-info.java`.  
However, adding `@NullUnmarked` at the package level widens the scope excluded from null-safety checks, so I recommend using `@NullMarked` at the package level and applying `@NullUnmarked` to individual classes or methods as needed.

## Mapping of Annotations

We’ve explained JSpecify’s annotations in comparison with Spring Framework’s annotations regarding null safety.  
The correspondence between these annotations is summarized in the table below:

|No.|Spring Boot 4 (JSpecify)|Spring Boot 3.x (Spring Framework)|
|:---:|:----|:----|
|1|`org.jspecify.annotations.Nullable`|`org.springframework.lang.Nullable`|
|2|`org.jspecify.annotations.NonNull`|`org.springframework.lang.NonNull`|
|3|`org.jspecify.annotations.NullMarked`|`org.springframework.lang.NonNullApi`|
|4|`org.jspecify.annotations.NullMarked`|`org.springframework.lang.NonNullFields`|
|5|`org.jspecify.annotations.NullUnmarked`|n/a|

Here is one piece of disappointing news.  
With the release of Spring Boot 4, Spring Framework’s `@Nullable`, `@NonNull`, `@NonNullApi`, and `@NonNullFields` have been marked as deprecated.  
Referring to their Javadocs, all encourage migration to JSpecify annotations.

This means that development projects using Spring Framework’s annotations will need to replace them with JSpecify annotations when upgrading Spring Boot.  
For projects planning to upgrade to Spring Boot 4 or with releases several years away, this may have a non-negligible impact.

## Finally

That concludes my brief explanation of JSpecify, which has been adopted as a standard in Spring Boot 4.  
For more detailed usage instructions, please refer to the JSpecify official [User Guide](https://jspecify.dev/docs/user-guide/).

With null-safety annotations proliferating in Spring Framework, the Jakarta project, JetBrains, Lombok, and others, I feel that the movement by the JSpecify project towards standardization is the right approach.  
However, at the same time, I never expected that Spring Framework’s annotations would be deprecated in Spring Boot application development, and, as I mentioned at the beginning, I didn’t foresee JSpecify making a comeback.

Although deprecation of Spring Framework’s null-safety annotations with the Spring Boot update will not directly affect application behavior, continuing to use deprecated annotations is, well, no good! I imagine that for many development projects, “don’t use deprecated features” is a basic principle.  
Therefore, when updating Spring Boot, replacing Spring Framework’s annotations with JSpecify annotations is the right course of action.

This time, the topic of JSpecify’s null safety may have been a bit on the niche side, but thank you very much for reading to the end.
