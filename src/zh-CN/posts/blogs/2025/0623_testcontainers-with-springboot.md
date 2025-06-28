---
title: Spring 小故事 - 理解 Testcontainers 的集成功能
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

在网上查看示例时，你可能会看到有的示例使用了@Testcontainers注解，有的示例没有；有的示例在容器实例上使用@Container注解，有的示例使用@Bean注解……对于如何正确使用Testcontainers，你可能会感到困惑。到底哪些是Testcontainers本身的功能，哪些是Spring Boot的集成功能（spring-boot-testcontainers），初次接触时很难区分，对吧？

因此，这次我们将基于示例程序，分阶段从“纯粹的 Testcontainers 用法”、到“Testcontainers 的便捷功能”、再到“通过 Spring Boot 集成的演进”，来介绍并理解各自的角色与便利点。

:::info
本文已在 Spring Boot 3.5.3 上确认可运行。文中所示代码已全部上传至 GitHub 的 [此处](https://github.com/extact-io/testcontainer-sample)。
:::

## 首先总结
为了没有太多时间的读者，先把重点整理如下。

#### @Testcontainers
- 这是（不是 Spring Boot 而是）**Testcontainers** 的注解
- 它会**自动管理**带有`@Container`注解的容器实例的生命周期

#### @Container
- 这也是 **Testcontainers** 的注解
- 在测试类上添加`@Testcontainers`后，Testcontainers 会**自动对带有 `@Container` 注解的字段的容器实例执行 start()/stop()**
- 可以按测试方法或测试类（如果是 static 则以类为单位，非 static 则以方法为单位）的作用域管理

#### @Bean
- 如果将容器实例注册到 Spring 的 DI 容器中作为 Bean，**Spring Boot 的集成功能**（spring-boot-testcontainers）就会在 Spring 侧**管理容器的生命周期**
- 在这种情况下，容器实例的发现和生命周期管理会由 Spring Boot 自动完成，因此无需 `@Testcontainers` 和 `@Container`

#### @ServiceConnection
- 该注解可以将 Testcontainers 的容器自动连接到 Spring Boot 的应用服务（如 DataSource）上
- 这样可以省略传统的属性配置或 `@DynamicPropertySource` 等操作，从而以更简洁的方式构建测试环境

## Step1: 原生使用 Testcontainers
首先，基于下面的代码示例来说明不使用任何 Testcontainers 注解的原生 Testcontainers 用法。

```java
@SpringBootTest(webEnvironment = WebEnvironment.NONE)
public class PersonRepositoryStep1Test {
    // 数据库名、用户名、密码等在 PostgreSQLContainer 内已默认设置
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

因为是最初的示例，所以稍微详细说明一下代码的含义，如下所示：

- 在 (1) 处生成了一个管理 `postgres:16-alpine` 容器的 `PostgreSQLContainer` 实例，但此时该容器并未启动
- 在 (2) 处，从容器实例获取连接容器所需的信息，并通过 `@DynamicPropertySource` 动态设置这些值
- 由于容器仅生成了实例并未启动，所以使用 JUnit5 的生命周期方法自行启动和停止容器

对于像本示例这样不使用 Testcontainers 注解的情况，只需要下述的 Testcontainers 核心依赖即可运行：

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <scope>test</scope>
</dependency>
```

:::column:连接地址难道不是固定的吗？
当使用容器默认启动 Postgres 时，连接主机应该是localhost，端口是Postgres的默认5432，数据库名是`postgres`，所以你可能会想不如直接在配置文件中写`spring.datasource.url=jdbc:postgresql://localhost:5432/postgres`，省去用 `@DynamicPropertySource` 动态设置的麻烦？我也是这么想的，但事实上并非如此。

Testcontainers 的容器类可以在实例生成时修改容器的配置。以 `PostgreSQLContainer` 为例，其容器定义大致实现如下：

```java
static GenericContainer<?> postgres = new GenericContainer<>("postgres")
        .withExposedPorts(5432)
        .withEnv("POSTGRES_USER", "test")
        .withEnv("POSTGRES_PASSWORD", "test")
        .withEnv("POSTGRES_DB", "test")
```
※ 实际实现可能有所不同，此处为了易于理解而编写的等价代码

从 `withEnv` 的指定可以看出，使用 `PostgreSQLContainer` 时默认的用户名、密码、数据库名均设置为 `test`。另外，`withExposedPorts` 指定的是容器内部公开的端口，而宿主机映射的端口会随机分配为一个临时端口 (ephemeral port)。因此，测试代码中用于连接的宿主机端口在事前是未知的，只能在容器启动后通过容器实例获取到。因此连接地址必须像 `postgres::getJdbcUrl` 一样从容器实例中获取。

虽然看起来 `withExposedPorts(5432)` 会让人以为对应的 `docker run` 命令会指定 `-p 5432:5432`，但实际上这里的 5432 是容器内部的端口，宿主机的端口会被分配为一个随机的临时端口，这点需要理解。

顺便说一句，为什么要使用临时端口可以参考 Docker 官方的 [Testcontainers のベスト プラクティス](https://www.docker.com/ja-jp/blog/testcontainers-best-practices/)。
:::

## Step2: 使用 @Testcontainers 和 @Container
接下来说明利用 Testcontainers 自带的 `@Testcontainers` 和 `@Container` 的模式。将 Step1 中的示例改写为这两个注解后如下：

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

    // 不需要调用 postgres.start() 和 postgres.stop()
```

<br>

与 Step1 最大的区别在于无需在 `@BeforeAll` 和 `@AfterAll` 中手动执行容器的 start 和 stop。如果指定了 `@Testcontainers`，则 Testcontainers 会管理带有 `@Container` 注解的容器实例的生命周期。因此，不需要像 Step1 那样调用容器实例的 `start()` 和 `stop()`。

此外，当 `@Container` 注解作用于 static 字段时，容器的启动和停止将以测试类为单位进行；而当 `@Container` 作用于非 static 字段（实例变量）时，则以测试方法为单位进行。

像 `@Testcontainers` 和 `@Container` 这类用于测试类的注解包含在另一个模块中，因此使用时需要添加以下依赖：

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
```

## Step3: 不使用 @Testcontainers，使用 Spring Boot 集成功能
Step2 的示例可以通过使用 Spring Boot 的集成功能来实现而无需使用 Testcontainers 注解。若将 Step2 的示例改写为使用 Spring Boot 集成功能，则如下所示：

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

撇开 Spring 上下文和动态配置方式稍有不同不谈，与 Step2 的区别主要有两点：一是去掉了 `@Testcontainers`，二是容器实例的注解由 `@Container` 改为 `@Bean`。

当包含以下 Spring Boot 集成功能所需的依赖时，一旦将 Testcontainers 的容器实例注册为 Bean，Spring 就会在 Bean 注册时自动执行容器的启动（调用 start()）[^1]。

[^1]: 容器的停止（调用 stop()）会在 Bean 被销毁时执行，通常是在应用程序退出时。

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-testcontainers</artifactId>
    <scope>test</scope>
</dependency>
```

<br>

使用 Spring Boot 集成功能时，Spring Boot 会负责原本由 Testcontainers 执行的任务，因此无需再使用 `@Testcontainers` 和 `@Container`。

## Step4: 使用 Spring Boot 3.1 以后的 @ServiceConnection
最后是使用 Spring Boot 3.1 引入的 `@ServiceConnection` 的示例。将 Step3 的示例改写为使用 `@ServiceConnection` 如下：

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
        // 无需注册 DynamicPropertyRegistrar Bean
    }
    ...
```

<br>

与 Step3 的区别有两点：一是容器实例增加了 `@ServiceConnection`，二是无需再注册 `DynamicPropertyRegistrar` Bean。

从这些差异可以想象到，通过添加 `@ServiceConnection` 会在后台替代原先 `DynamicPropertyRegistrar` 所做的连接信息注册，但仅用文字说明其到底做了什么是比较困难的，因此下面通过图示来说明：

![service-connection](/img/blogs/2025/0623_testcontainers-with-springboot/service-connection.drawio.svg)

<br>

在 Step3 中，AutoConfiguration 会获取 Environment 的属性值，并将这些值绑定到 `PropertiesJdbcConnectionDetails` 等连接详情对象上。然后，在生成 DataSource 等 Bean 时会引用该绑定对象。如此一来，以往的关键就在于如何在配置文件（属性值）中织入必要的设置。

而在 `@ServiceConnection` 中，从容器实例获取的信息会被直接绑定到设置信息对象上，因此无需再经过配置文件（属性值），这是一个重要特点。当容器实例添加了 `@ServiceConnection` 注解时，Spring 会插入一个 Bean 来根据容器实例生成相应的连接详情对象，从而实现了之前步骤中①的获取与绑定操作。如果对这方面的机制更感兴趣，欢迎查看以下文章！

@[og](https://developer.mamezou-tech.com/blogs/2025/06/25/custom-serviceconnection/)

## 最后
大家是否已经能够理解 Testcontainers 与 Spring Boot 集成各自的作用了？如果掌握了这些，就可以根据不同的场景选择最合适的配置了。
