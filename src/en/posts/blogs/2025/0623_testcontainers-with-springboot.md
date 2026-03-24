---
title: Spring Tidbits - Understanding Testcontainers Integration Features
author: toshio-ogiwara
date: 2025-06-23T00:00:00.000Z
tags:
  - testcontainers
  - Springの小話
  - spring-boot
  - spring
  - java
image: true
translate: true
---

When browsing online samples, you might see the @Testcontainers annotation sometimes present and sometimes absent, or container instances annotated with @Container or @Bean, leaving you wondering what the proper way to use Testcontainers is. It's not obvious at first glance which features are native to Testcontainers and which come from Spring Boot integration (spring-boot-testcontainers).

Therefore, this time, we'll introduce, using sample programs, a step-by-step refinement from “plain Testcontainers usage” to “Testcontainers handy features” and finally to “evolution through Spring Boot integration,” so you can understand the role and benefits of each.

:::info
This article has been tested with Spring Boot 3.5.3. All the code explained here is uploaded on GitHub [here](https://github.com/extact-io/testcontainer-sample).
:::

## Quick Summary
For those short on time, here are the key points first.

#### @Testcontainers
- This is a Testcontainers (not Spring Boot) annotation.
- It automatically manages the lifecycle of container instances annotated with @Container.

#### @Container
- This is also a Testcontainers annotation.
- By annotating a test class with @Testcontainers, Testcontainers automatically starts() and stops() container instances annotated with @Container.
- You can manage scope per test method or per test class (static fields mean class-level scope, non-static fields mean method-level scope).

#### @Bean
- By registering the container instance as a bean in Spring’s DI container, Spring Boot’s integration features (spring-boot-testcontainers) take over lifecycle management on the Spring side.
- In this case, container detection and lifecycle management are done automatically by Spring Boot, so @Testcontainers and @Container are not needed.

#### @ServiceConnection
- An annotation that automatically connects Testcontainers containers to Spring Boot application services (e.g., DataSource).
- You can omit traditional property settings or @DynamicPropertySource, making test environment setup simpler.

## Step 1: Using Testcontainers as Is

First, let's explain an example of plain Testcontainers without using any Testcontainers annotations, based on the following code.

```java
@SpringBootTest(webEnvironment = WebEnvironment.NONE)
public class PersonRepositoryStep1Test {
    // database name, username, password, etc. have defaults set within PostgreSQLContainer
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine"); // (1)

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);        // (2)
        registry.add("spring.datasource.username", postgres::getUsername);  // (2)
        registry.add("spring.datasource.password", postgres::getPassword);  // (2)
    }

    @BeforeAll
    static void startContainer() {
        postgres.start();  // (3)
    }
    @AfterAll
    static void stopContainer() {
        postgres.stop();   // (4)
    }
    ...
```

Since this is the first example, let's carefully explain what the code does:

- (1) An instance of `PostgreSQLContainer` managing the `postgres:16-alpine` container is created, but at this point the container is not started.
- (2) Retrieves the information needed to connect to the container from the container instance, and dynamically sets those values using `@DynamicPropertySource`.
- Because the container is only instantiated and hasn’t been started by anyone, we manually start and stop the container using JUnit 5 lifecycle methods.

For examples like this that don’t use any Testcontainers annotations, only the core Testcontainers dependency shown below is required.

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <scope>test</scope>
</dependency>
```

:::column:Isn't the connection destination already fixed?
When you start a Postgres container with default settings (no custom configuration), you might think the connection host is `localhost`, the port is the default `5432`, and the database name is `postgres`. So why not just write `spring.datasource.url=jdbc:postgresql://localhost:5432/postgres` in the config file instead of dynamically setting it with `@DynamicPropertySource`? I thought so too, but that’s actually not the case.

Testcontainers' container classes allow you to change the container’s settings at instance creation. For `PostgreSQLContainer`, its definition is implemented something like this:

```java
static GenericContainer<?> postgres = new GenericContainer<>("postgres")
        .withExposedPorts(5432)
        .withEnv("POSTGRES_USER", "test")
        .withEnv("POSTGRES_PASSWORD", "test")
        .withEnv("POSTGRES_DB", "test")
```
※This isn’t the actual implementation, but equivalent code presented for clarity.

As you can see from the `withEnv` settings, when using `PostgreSQLContainer` the default user, password, and database name are all set to `test`. Also, `withExposedPorts` specifies the port exposed by the container; the host port mapped to it is a randomly chosen ephemeral port. This means you cannot know the host port ahead of time—it’s only known by the container instance once it’s started. Therefore, you must always retrieve the connection details from the container instance, for example via `postgres::getJdbcUrl`.

You might think `withExposedPorts(5432)` maps to `-p 5432:5432` in a `docker run` command, but note that `5432` refers to the container-side port; the host-side port is still a separate randomly assigned ephemeral port.

By the way, why ephemeral ports are used is detailed in Docker’s official [Testcontainers Best Practices](https://www.docker.com/ja-jp/blog/testcontainers-best-practices/) blog post.
:::

## Step 2: Using @Testcontainers and @Container

Now let's explain a pattern that uses Testcontainers’ `@Testcontainers` and `@Container` annotations. Rewriting Step 1 with these two annotations yields:

```java
@SpringBootTest(webEnvironment = WebEnvironment.NONE)
@Testcontainers
public class PersonRepositoryStep2Test {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    // postgres.start() and postgres.stop() calls are not needed
```

The major difference from Step 1 is that you no longer need the start/stop calls in `@BeforeAll` and `@AfterAll`. When `@Testcontainers` is specified, Testcontainers takes care of the lifecycle management for container instances annotated with `@Container`. Hence the calls to `start()` and `stop()` on the container instance that we had in Step 1 become unnecessary.

Additionally, if `@Container` is applied to a static field, the container lifecycle is managed at the test class level; if applied to a non-static field (instance variable), it’s managed at the test method level.

Since the annotations used in test classes, such as `@Testcontainers` and `@Container`, are included in a separate module from the core, you need the following dependency to use them:

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
```

## Step 3: Using Spring Boot Integration Features Without @Testcontainers

The example from Step 2 can be implemented without Testcontainers annotations by using Spring Boot’s integration features. Rewriting the Step 2 example using Spring Boot integration yields:

```java
@SpringBootTest(webEnvironment = WebEnvironment.NONE)
public class PersonRepositoryStep3Test {

    @TestConfiguration(proxyBeanMethods = false)
    @Import(ContainerApplication.class)
    static class TestConfig {
        @Bean
        PostgreSQLContainer<?> postgreSQLContainer() {
            return new PostgreSQLContainer<>("postgres:16-alpine");
        }
        @Bean
        DynamicPropertyRegistrar targetUrlRegistrar(PostgreSQLContainer<?> postgres) {
            return registry -> {
                registry.add("spring.datasource.url", postgres::getJdbcUrl);
                registry.add("spring.datasource.username", postgres::getUsername);
                registry.add("spring.datasource.password", postgres::getPassword);
            };
        }
    }
    ...
```

Aside from the slight differences in Spring context and dynamic property registration, the two main changes from Step 2 are that `@Testcontainers` is removed and the container instance annotation is `@Bean` instead of `@Container`.

If you include the following dependency for Spring Boot integration, then when a Testcontainers container instance is registered as a bean, Spring automatically starts the container (calls `start()`) at bean registration time[^1].

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-testcontainers</artifactId>
    <scope>test</scope>
</dependency>
```

Spring Boot’s integration features take over what Testcontainers was doing, so you no longer need `@Testcontainers` or `@Container`.

[^1]: Container termination (stop() call) occurs when the bean is destroyed, which is usually at application shutdown.

## Step 4: Using @ServiceConnection from Spring Boot 3.1 Onwards

Finally, here's an example using `@ServiceConnection`, introduced in Spring Boot 3.1. Similar to the other examples, rewriting the Step 3 example with `@ServiceConnection` looks like this:

```java
@SpringBootTest(webEnvironment = WebEnvironment.NONE)
public class PersonRepositoryStep3Test {

    @TestConfiguration(proxyBeanMethods = false)
    @Import(ContainerApplication.class)
    static class TestConfig {
        @Bean
        @ServiceConnection
        PostgreSQLContainer<?> postgreSQLContainer() {
            return new PostgreSQLContainer<>("postgres:16-alpine");
        }
        // Bean registration of DynamicPropertyRegistrar is no longer required
    }
    ...
```

The differences from Step 3 are that the container instance now has the `@ServiceConnection` annotation and that the `DynamicPropertyRegistrar` bean registration is no longer needed.

From these changes, you can imagine that `@ServiceConnection` is handling behind the scenes what we were doing with `DynamicPropertyRegistrar` to register connection information. Explaining exactly what's happening in words alone is difficult, so let's illustrate it with a diagram:

![service-connection](/img/blogs/2025/0623_testcontainers-with-springboot/service-connection.drawio.svg)

In Step 3, AutoConfiguration retrieves property values from the Environment and binds them to connection detail objects like `PropertiesJdbcConnectionDetails`. Then those bound objects are referenced when creating beans such as DataSource. Up to now, the key point was how to weave the necessary settings into your configuration files (property values).

With `@ServiceConnection`, however, information obtained from the container instance is bound directly to the configuration detail object, eliminating the need to go through configuration files (property values). When a container instance is annotated with `@ServiceConnection`, Spring introduces a bean that generates the corresponding connection detail object from the container instance, thereby handling the retrieval and binding process in step ①. If you're interested in learning more about this mechanism, be sure to check out the article below!

@[og](https://developer.mamezou-tech.com/en/blogs/2025/06/25/custom-serviceconnection/)

## Conclusion
Have you understood the respective roles of Testcontainers and Spring Boot integration? With this knowledge, you should be able to choose the optimal configuration for each situation.
