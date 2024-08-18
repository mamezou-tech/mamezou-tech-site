---
title: >-
  JJUG CCC 2024 Spring Post-Presentation Notes - Supplement and Correction of
  Spring Boot vs MicroProfile Session
author: toshio-ogiwara
date: 2024-06-20T00:00:00.000Z
tags:
  - java
  - mp
  - spring
  - spring-boot
image: true
translate: true
---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/06/20/after_jjug_spring-mp/).
:::

Last Sunday (6/16), I had the opportunity to present at [JJUG CCC 2024 Spring](https://ccc2024spring.java-users.jp/) with the title '[Spring Boot vs MicroProfile - Comparison and Selection of Frameworks in Cloud Native](https://www.mamezou.com/news/event/20240616)'. This was my second time presenting at JJUG CCC, but unlike the previous hybrid online and offline event where attendance was sparse, this time, so many people attended that I wondered if I had mistakenly entered the wrong venue.

As for the content of the presentation, I made the same mistake as last time by having too many slides and talking about unnecessary things, resulting in a lack of time. However, I am satisfied that I was able to convey what I wanted to communicate.

After the session, I received several questions outside the venue and on X (twitter). From those, I will write about three questions and their answers that I thought were indeed worth considering as post-presentation notes. The session materials from that day can be found [here](https://speakerdeck.com/ogiwarat/spring-boot-vs-microprofile-kuraudoneiteibuniokeruhuremuwakunobi-jiao-toxuan-ze).

## Is the initialization timing of the `@PostConstruct` method specified?
### Question
In [Slide 13](https://speakerdeck.com/ogiwarat/spring-boot-vs-microprofile-kuraudoneiteibuniokeruhuremuwakunobi-jiao-toxuan-ze?slide=13), it was explained that for the `@PostConstruct` initialization method, Spring calls back when the DI container starts, whereas in CDI (MicroProfile), the call to `@PostConstruct` is delayed until a method on the Bean is called. Isn't this delayed behavior in CDI dependent on the CDI container implementation rather than the CDI specification?

### Answer

It is specified by the CDI specification.
(I initially thought it was specification, but upon being asked, I wondered if it could be implementation-dependent. However, upon investigation, it indeed is specified.)

While there is no direct statement in the CDI Specification (JSR), the initialization lifecycle of applications specified in both [CDI Lite](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0.html#initialization) and [CDI Full](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0.html#initialization_full) only includes the detection of Beans during initialization (startup). This indicates that the Bean instances that become CDI Beans (e.g., the `BookController` instance in the session example) are not created at startup.

In practice, in CDI, a ClientProxy is created for all Beans in normal scopes except `@Dependent` and custom scopes, and the InjectionPoint injects the ClientProxy instead of the actual Bean instance. This mechanism delays the creation of Bean instances until they are actually needed.

Additionally, I have confirmed through actual operation that the CDI implementations in Quarkus's Arc and Helidon's Weld exhibit the same behavior.

For reference, Spring by default creates the actual Bean instance when the DI container starts. In Spring, setting `spring.main.lazy-initialization=true` delays the creation of Bean instances similar to a CDI container, and the behavior of `@PostConstruct` when delayed is the same as CDI. Therefore, the difference in the timing of the `@PostConstruct` initialization method call is due to the timing of Bean instance creation.

:::alert:Lazy Initialization is not highly recommended in Spring
[Lazy Initialized Beans :: Spring Framework - Reference](https://spring.pleiades.io/spring-framework/reference/core/beans/dependencies/factory-lazy-init.html) states the following:
> Generally, this pre-instantiation is desirable because configuration or surrounding environment errors are discovered immediately rather than hours or days later.

This implies that lazy initialization is undesirable because it delays the discovery of errors.

So why is CDI lazy initialized? As clearly stated in the CDI specification, during deployment, the container verifies Bean dependencies and throws exceptions if there are issues such as missing injection targets, causing the startup to fail. Therefore, injection can be safely performed even if delayed. From the perspective of efficient resource utilization, CDI is superior to Spring in this regard.
:::

## Is it not possible to switch CDI Beans with Producers?
### Question
In [Slide 15](https://speakerdeck.com/ogiwarat/spring-boot-vs-microprofile-kuraudoneiteibuniokeruhuremuwakunobi-jiao-toxuan-ze?slide=15), it was mentioned that there is no standard way to switch Beans in CDI (MicroProfile), and an example using Build compatible extensions was introduced. Is it not possible to use the CDI Producer feature?

### Answer
For the BookRepository example used in the session, Producers would work. However, Producers have several drawbacks, so I consider Build compatible extensions to be better.

An exemplary implementation to switch the BookRepository Bean using Producers might look like this:

```java
@ApplicationScoped
@Database // Qualifier
@Transactional
public class DatabaseBookRepository implements BookRepository {
...
```
```java
@ApplicationScoped
@InMemory // Qualifier
public class InMemoryBookRepository implements BookRepository {
...
```
```java
@Dependent
public class BookRepositoryProducer {
    private String type;
    @Inject
    public BookRepositoryProducer(Config config) {
        this.type = config.getValue("use.repository", String.class);
    }
    // Producer method receives candidate Beans and returns the implementation based on the configuration
    @Produces
    BookRepository bookRepository(
            @InMemory BookRepository inmemory,
            @Database BookRepository database) {
        return switch (type) {
            case "inmemory" -> inmemory;
            case "jpa" -> database;
            default -> throw new IllegalArgumentException("Unexpected value: " + type);
        };
    }
}
```

Implementations using Producers will generally look like the above, but they have the following drawbacks:

1. The Bean candidates for switching must be known at compile time.
2. Even Beans deemed unnecessary at startup are instantiated and registered in the container.
3. Interceptors, which are also CDI Beans, cannot use this method.

On the other hand, Build compatible extensions (or Portable extensions) can be used without these constraints. Therefore, I personally consider Build compatible extensions, which can be used without issues for anything, to be the best practice.

## Is it possible to verify the aud claim with MicroProfile JWT?
### Question
In [Slide 26](https://speakerdeck.com/ogiwarat/spring-boot-vs-microprofile-kuraudoneiteibuniokeruhuremuwakunobi-jiao-toxuan-ze?slide=26), it was mentioned that the verification contents of JWT possible with MicroProfile JWT are only the public key, expiration date, and Issuer claim. Isn't it also possible to verify the Audience (aud) claim?

### Answer
As you pointed out, from [MicroProfile JWT 2.1](https://download.eclipse.org/microprofile/microprofile-jwt-auth-2.1/microprofile-jwt-auth-spec-2.1.html#_mp_jwt_verify_audiences), it has become possible to verify the Audience (aud) claim as well. Thank you for pointing this out. I have corrected the slide materials.

This concludes the introduction of questions and answers related to the session. Thank you to everyone who asked questions. It helped deepen my understanding!
