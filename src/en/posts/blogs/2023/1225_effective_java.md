---
title: Reading Effective Java 3rd Edition
author: ryo-nakagaito
date: 2023-12-25T00:00:00.000Z
tags:
  - java
  - advent2023
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2023/12/25/effective_java/).
:::



This is the article for the 25th day of the [Mamezou Developer Site Advent Calendar 2023](/events/advent-calendar/2023/).

# Introduction
I am Nakagaito from BS Group 2. This time, I will contribute my thoughts on the book "Effective Java 3rd Edition," which was recommended to me by a senior employee, in light of my own development experience at the workplace. Everything written in this book is beneficial for developing in Java, but this time I will pick up and introduce the things that I personally found particularly beneficial and learned from.

# About Effective Java
This book is a must-read for Java programmers, and the third edition includes new chapters on lambdas and streams introduced from Java 8. It targets people who have mastered the basic syntax of Java rather than beginners and is a book that demonstrates know-how and design patterns for writing **better Java code**.

[Effective Java 3rd Edition / Joshua Bloch (author), Yoshiyuki Shibata (translator) Amazon link](https://amzn.asia/d/bH4A7T5)

# Chapter 2: Creating and Destroying Objects

## Item 1: Consider static factory methods instead of constructors
Static factory methods are used as a means other than constructors to provide instances of a specific class, and I learned that they have the following advantages:

- Programmers can give them understandable names.

While method names in constructors are limited to the class name, you can give them more understandable names such as:

`from`, `of`, `valueOf`, `getInstance`, `create`, `newInstance`

- There is no need to create new objects, and the same objects can be reused.

This is the biggest advantage in terms of "being able to manage object creation," I felt.

Reading up to this second item, I wondered, "Does the `valueOf` method of the `Integer` class fall under this?" Upon researching, I found that the `Integer` class internally caches instances within the range of `-128 to 127` (because these numbers are frequently used), and when it receives an `int` type parameter within this range, it returns the corresponding instance from the cache instead of creating a new one. The same concept applies to `Boolean.valueOf`.

The standard library is cleverly designed to avoid unnecessarily duplicating instances and to reuse what can be reused. I thought about implementing static factory methods when designing classes where separate instances do not need to be created or when instances have the same logical meaning.

- Unlike constructors, they can return objects of a subtype of the return type.
- The type of object returned can be varied depending on the input parameters

For example, depending on the parameters passed, it can return an instance of the appropriate collection interface implementation class, and the caller does not need to know the specific type of the returned instance if they understand the conventions of the return type interface (implementation can be hidden), which I thought was superior in allowing more object-oriented implementation.

## Item 2: Consider a builder when faced with many constructor parameters
When creating instances of classes with many instance variables, constructors or static factory methods require you to provide many parameters in a specified order. I learned that implementing with the builder pattern is useful in such cases.

The code on the caller's side described in the book is shown below:

> ```Java
> NutritionFacts cocaCola = new NutritionFacts.Builder(240, 8).
>     calories(100).sodium(35).carbohydrate(27).build();
> ``` 
> (Quoted from Effective Java 3rd Edition, page 14)

Passing the required parameters first and then setting the necessary parameters in a flowing manner is very clear and convenient. Such a design minimizes the need for modifications to existing sources when new fields need to be added to the `NutritionFacts` class, and I felt it also has good maintainability. I have often encountered situations in my work where the order of constructor arguments is complicated or the source becomes messy when using the JavaBeans pattern with setters to set many fields, so I would like to make use of this builder pattern.

Also, although not mentioned in this book, I found out that using the `@Builder` annotation from `Lombok` makes it easy to implement this builder pattern with good readability. I would like to actively use it.

# Chapter 7: Lambdas and Streams
This is a chapter added from the third edition. Since joining Mamezou, I have been able to code using the `Stream API` for the first time, and although I wrote it "somehow," I was able to systematically learn again through this chapter.

## Item 42: Choose lambdas over anonymous classes
> ```Java
> // Lambda expressions as function objects (replacing anonymous classes)
> Collection.sort(words,
>         (s1, s2) -> Integer.compare(s1.length(), s2.length()));
> ```
> Note that the type of lambda (Comparator<String>), the type of its parameters (both s1 and s2 are String), and its return type (int) are not written in the code. The compiler uses a process called **type inference** to infer these types from the context. Sometimes the compiler cannot determine the type, and in that case, you must specify the type.
> 
> ～Omitted～
> 
> **Unless specifying the type makes the program clearer, please omit the type for all lambda parameters**. If the compiler displays an error that it cannot infer the type of lambda parameters, **then** specify the type. Occasionally, you may need to cast the return value or the entire lambda expression, but this is rare.
> 
> (Quoted from Effective Java 3rd Edition, page 196)

Reading this item, I realized that I had been writing lambdas using the IDE's auto-compilation feature and indeed omitting the type in my descriptions, and the compiler had been inferring the types for me. The advantage of lambda is its conciseness in description, and it is good to omit the type as much as possible.

## Item 43: Choose method references over lambdas
I had been using method references in actual business source code, but there were parts I did not fully understand, and reading this book, I learned that there are several classifications.

> | Type of Method Reference | Example | Equivalent Lambda |
> |:-----|:-----|:-----|
> | Static | `Integer::parseInt` | `str -> Integer.parseInt(str)` |
> | Bound | `Instant.now()::isAfter` | `Instant then = instant.now();`<br>`t -> then.isAfter(t)` |
> | Unbound | `String::toLowerCase` | `str -> str.toLowerCase()` |
> | Class constructor | `TreeMap<K,V>::new` | `() -> new TreeMap<K,V>()` |
> | Array constructor | `int[]::new` | `len -> new int[len]` |
> 
> (Quoted from Effective Java 3rd Edition, page 200)

I learned that there is a difference between a **bound reference** expressed as `instance-returning expression::method name` and an **unbound reference** that calls an instance method with `class name::method name`. Using method references makes the code cleaner, so I will keep these classifications in mind and continue to actively use them.

Overall, what I thought after reading this chapter is that **code using streams and lambdas is concise, but should only be used when readability can be ensured**. When intermediate operations in streams continue for several lines or when operations are complex, considering whether it might be clearer to write with a for loop, and lambda parameter names should be immediately understandable as to what they represent, otherwise readability may decrease, resulting in code that is ultimately less maintainable. I will carefully consider using streams and lambdas with an emphasis on readability.

# Chapter 10: Exceptions

## Item 71: Avoid unnecessary use of checked exceptions
Using checked exceptions excessively forces the calling code to handle exceptions with `catch blocks` or propagate exceptions, so **checked exceptions should only be thrown when the calling side truly needs to recover from the exception**. I also learned that using `Optional` is a simple way to avoid throwing checked exceptions. Making the method's return value optional and returning an empty optional instead of throwing an exception reduces the load on the calling side. It should be carefully considered whether the calling side needs to receive detailed information about the exception to implement recovery, and whether to use exceptions or optionals should be considered.

## Item 76: Strive for failure atomicity
I learned the term failure atomicity for the first time. Below is a quote from the book.

> **Generally, a method call that fails should leave the object in the state it was in before the method was called**. Such methods are called **failure atomic**.
>
> (Quoted from Effective Java 3rd Edition, page 308)

It is desirable that the object's state does not change when a method fails. I learned that there are several ways to achieve this:

- Design the class so that the object is immutable in the first place (mentioned in Item 17: Minimize mutability)
- If you operate on a mutable object, check the validity of parameters before performing the operation
- Perform potentially failing operations before changing the object
- Temporarily copy the original object and operate on it. Once the operation is complete, replace the content with the copied object
- Write recovery code to return the object to its state before the operation began in case of failure (not a very common method)

There are several ways to ensure failure atomicity, and generally, it is desirable to make objects immutable, but when the cost is too high, it is necessary to determine whether it is really necessary, whether to make it failure atomic, or to note in the `Javadoc` comments that the object's state may change in case of failure.

# Conclusion
This time, I wrote about some items I noticed and thought about from Effective Java 3rd Edition, but the book contains many other things that are generally beneficial for programming, Java-specific considerations, and personally developmental content (such as concurrency) that are of interest to me.

I will actively apply the parts I have fully understood to actual work design and coding, and for the parts I still do not fully understand, I plan to read them repeatedly after a period to understand and apply them to my future work over the long term.
