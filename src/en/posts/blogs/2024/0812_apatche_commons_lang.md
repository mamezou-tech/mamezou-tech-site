---
title: Supporting Java Programming! Introduction to Apache Commons Lang
author: kenta-ishihara
date: 2024-08-12T00:00:00.000Z
tags:
  - 新人向け
  - tips
  - summer2024
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2024-summer/
translate: true
---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/08/12/apatche_commons_lang/).
:::

## Introduction
This article is the 11th day of the [Summer Relay Series 2024](/events/season/2024-summer/).
I am Ishihara, who recently caught the trendy cold and was bedridden, but the taste of [Asahi Super Dry](https://www.asahibeer.co.jp/superdry/) I drank after recovering felt incredibly delicious.
I've written about the Java library "[Apache Commons Lang](https://commons.apache.org/proper/commons-lang/)" that you definitely want to use when developing in Java.

## What is Apache Commons Lang?
As a core package of Java, there is "[java.lang](https://docs.oracle.com/javase/jp/8/docs/api/java/lang/package-summary.html)"[^1], but Apache Commons Lang (hereafter abbreviated as ACL) provides methods to make core classes easier to handle.
You can implement redundant code such as checking the presence of values and type conversion in a readable manner.

## About Commons Lang 2 and Commons Lang 3
If you have used ACL before, you might have seen the following two libraries.
```java
import org.apache.commons.lang;
import org.apache.commons.lang3;
```
The first library, "org.apache.commons.lang", is a legacy version for Java 1.2 and above, but below Java 8.
The second library, "org.apache.commons.lang3", is the current release version for Java 8 and above.

Both of these imports can be written together, and methods with the same name can be handled in the same way, but it is generally recommended to unify them per project according to the Java version.

Reference: [New Features of Commons Lang 3](https://commons.apache.org/proper/commons-lang/article3_0.html)

## Benefits of Using Apache Commons Lang
Let's compare using Apache Commons Lang and not using it with a common conditional expression in Java, such as checking for the presence/absence of a string value.
```java
/**
 * Example of using Apache Commons Lang
 */
private static void demonstrateCommonsLang() {
    String name = "";
    // When not using Apache Commons Lang
    if (name != null && name.isEmpty()) {
        System.out.println("The name is not empty");
    }
    // When using Apache Commons Lang
    if (StringUtils.isNotEmpty(name)) {
        System.out.println("The name is not empty");
    }
}
```

From the above example, the following benefits can be noted:
* No need to implement null checks due to null-safe methods (also prevents forgetting to implement)[^2]
* The input/output is explicit and easy to understand from the method name
* Reduces redundant code, improving readability and maintainability

Personally, I have a strong impression that the advantage of null-safe methods is significant. [^3]

## How to Introduce Apache Commons Lang
If you are using Maven as a build tool, you can simply add the following dependency tag within the dependencies tag.
```xml
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-lang3</artifactId>
    <version>3.15.0</version>
</dependency>
```
For installation methods with other build tools like Gradle, please check the [official site's article](https://commons.apache.org/proper/commons-lang/dependency-info.html).

## Checking the Presence of Values by Version
Regarding the "check for the presence of variable values," which is probably the most used feature when using ACL, there are differences by version, so I will introduce them.
The following methods are commonly used for checking the presence of values in the legacy version of ACL:
* StringUtils.isEmpty()/isNotEmpty()
* CollectionUtils.isEmpty()/isNotEmpty()
```java
/**
 * Example of using CollectionUtils.isNotEmpty()
 */
private static void demonstrateCollectionUtilsIsNotEmpty() {
    System.out.println(CollectionUtils.isNotEmpty(null));              // false
    System.out.println(CollectionUtils.isNotEmpty(new ArrayList<>())); // false
    System.out.println(CollectionUtils.isNotEmpty(List.of("value")));  // true
}
```

In lang3, isEmpty()/isNotEmpty() methods have been added to ObjectUtils.
These methods can check the presence of values for string/array/collection/map/optional types.
Therefore, it can be said that using ObjectUtils.isEmpty()/isNotEmpty() in lang3 is sufficient for checking the presence of values.
```java
import org.apache.commons.lang3.ObjectUtils;

/**
 * Example of demonstrating ObjectUtils.isEmpty()
 */
private static void demonstrateObjectUtilsIsEmpty() {
    String str = "";
    List<String> list = new ArrayList<>();
    Map<String, String> map = new HashMap<>();
    int[] array = new int[0];
    Optional<String> optional = Optional.empty();

    System.out.println(ObjectUtils.isEmpty(str));       // true
    System.out.println(ObjectUtils.isEmpty(list));      // true
    System.out.println(ObjectUtils.isEmpty(map));       // true
    System.out.println(ObjectUtils.isEmpty(array));     // true
    System.out.println(ObjectUtils.isEmpty(optional));  // true

    str = "Hello";
    list.add("item");
    map.put("key", "value");
    array = new int[]{1, 2, 3};
    optional = Optional.of("value");

    System.out.println(ObjectUtils.isEmpty(str));       // false
    System.out.println(ObjectUtils.isEmpty(list));      // false
    System.out.println(ObjectUtils.isEmpty(map));       // false
    System.out.println(ObjectUtils.isEmpty(array));     // false
    System.out.println(ObjectUtils.isEmpty(optional));  // false
}
```

## Introduction of Methods You Might Occasionally Use
* BooleanUtils.isTrue()/isNotTrue()/isFalse()/isNotFalse(): Used for Boolean type condition checks
```java
BooleanUtils.isTrue(Boolean.TRUE);  // true
BooleanUtils.isTrue(Boolean.FALSE); // false
BooleanUtils.isTrue(null);          // false
```
* StringUtils.leftPad(): For creating fixed-length strings
```java
import org.apache.commons.lang3.StringUtils;

public class Main {
    public static void main(String[] args) {
        int length = 6;

        String paddedString = StringUtils.leftPad("abc", length, '0');
        System.out.println(paddedString);  // Output: 000abc
    }
}
```
* StringUtils.chomp()/chop(): Methods to remove the last newline or final character. I learned about their existence for the first time, and I would like to use them if the opportunity arises.
```java
import org.apache.commons.lang3.StringUtils;

public class Main {
    public static void main(String[] args) {
        System.out.println("[" + StringUtils.chop("Hello World") + "]");     // Output: [Hello Worl]
        System.out.println("[" + StringUtils.chop("Hello World\n") + "]");   // Output: [Hello World]
        System.out.println("[" + StringUtils.chop("Hello World\r\n") + "]"); // Output: [Hello World]
    }
}
```
The above is just a small part of the features available in ACL, so I think it might be interesting to discover convenient methods that suit your use case while looking at the [official JavaDoc](https://commons.apache.org/proper/commons-lang/javadocs/api-release/index.html).

## [Extra Edition] About Apache Commons Beanutils
Here, I will write about apache.commons.beanutils, which is a separate library from ACL.
In general web services, passing values between form (screen) classes → DTO classes → entity classes (and vice versa) is a common occurrence, but implementing A.set○○(B.get○○) for each item can often lead to redundant implementations with increased steps.
BeanUtils.copyProperties() is what solves such problems.
It copies values for properties with the same name between the source and destination classes.
(Incidentally, properties that exist only in the source and not in the destination are ignored.)
```java
        EmployeeDTO dto = new EmployeeDTO(1, "Test Taro", "test@example.com", "090-XXXX-XXXX");
        Employee entity = new Employee();

        // Copy values from DTO to entity without using CopyProperties
        entity.setId(dto.getId());
        entity.setName(dto.getName());
        entity.setEMail(dto.getEMail());
        entity.setPhoneNumber(dto.getPhoneNumber());

        // Copy values from DTO to entity using CopyProperties
        BeanUtils.copyProperties(entity, dto);
```
The advantages include improved readability and, most importantly, avoiding unnecessary implementation of properties with different names, which I personally think is a good point.
I think it cannot be helped if there are cases where properties are intentionally implemented with different names due to specifications, but in cases where it is not[^4], it can cause bugs.
Therefore, I strongly recommend using copyProperties wherever possible.

## Conclusion
This time, I summarized various aspects of Apache Commons Lang.
It is a library that I am usually indebted to, but by creating an article like this, I think I learned new things that I didn't know before, which was a good study for myself.
If I have the opportunity, I would like to write a sequel again.

[^1]: A library that provides classes used as basic types such as String, Integer, Boolean, etc.
[^2]: The StringUtils class is basically designed to be null-safe, but not all classes of ACL are subject to this, so be careful.
[^3]: Forgetting to implement null checks and encountering NullPointerException in unit tests is an experience that every programmer must have had.
[^4]: In the example of EmployeeDTO and Employee, one might have "name" while the other has "employeeName". In large projects, such implementations can subtly cause problems in a bad way...
