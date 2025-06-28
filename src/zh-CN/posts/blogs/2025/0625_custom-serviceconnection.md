---
title: Spring 小故事 - ServiceConnection 的自定义支持
author: toshio-ogiwara
date: 2025-06-25T00:00:00.000Z
tags:
  - testcontainers
  - Springの小話
  - spring-boot
  - spring
  - java
image: true
translate: true

---
从 Spring Boot 3.1 起，引入了与 Testcontainers 更易集成的 ServiceConnection 功能。使用后我觉得“这真方便！”，但它只支持 PostgreSQL 等一部分中间件。虽然容器化 PostgreSQL 等中间件的场景确实很多，但同时也有大量将对端 REST 应用容器化并作为存根使用的场景，而 ServiceConnection 默认无法用于自定义容器。

因此，这次将介绍如何对容器化的 REST 应用进行自定义的 ServiceConnection 支持，并通过 `@ServiceConnection` 来连接。

本文不做 Testcontainers 的说明，如果想从头了解的读者，可以参考下面的博客。

@[og](https://developer.mamezou-tech.com/blogs/2025/06/23/testcontainers-with-springboot/)

:::info
本文已在 Spring Boot 3.5.3 上确认可用。此外，文章中说明的代码已全部上传至 GitHub 的 [此处](https://github.com/extact-io/testcontainer-sample)。
:::

## ServiceConnection 支持前
首先来看自定义 ServiceConnection 支持前的应用，如下所示。本文将基于此示例说明 ServiceConnection 支持的方法。

#### ＜ServiceConnection 支持前＞
```java
@SpringBootTest(webEnvironment = WebEnvironment.NONE)
class ContainerClientStep5Test {
    @Autowired
    private ContainerClient client;

    @Configuration(proxyBeanMethods = false)
    @Import(ClientApplication.class)
    static class TestConfig {
        @Bean
        GenericContainer<?> appContainer() {
            return new GenericContainer<>("container-app:latest")
                    .withExposedPorts(8080);
        }
        @Bean
        DynamicPropertyRegistrar targetUrlRegistrar(GenericContainer<?> appContainer, Environment env) {
            String destination = "http://" + appContainer.getHost() + ":" + appContainer.getFirstMappedPort();
            return registry -> registry.add("client.connect-url", () -> destination);
        }
    }
}
```

该应用将 REST 应用镜像化为 `container-app:latest`，并通过 Testcontainers 的 `GenericContainer` 实例化它。正如类名所示，`GenericContainer` 是通用的容器类，用于实例化构造函数中指定的镜像。

使用此容器的客户端应用从 `client.connect-url` 属性获取容器的连接地址，并基于该值使用 [RestClient](https://spring.pleiades.io/spring-framework/reference/integration/rest-clients.html) 调用容器的 REST API。

由于 `GenericContainer` 不支持 ServiceConnection，因此连接地址的获取与设置需要通过 `DynamicPropertyRegistrar` 自行完成。

下面将按步骤说明如何使其支持 ServiceConnection 所需的内容。

## ServiceConnection 的机制
在讨论如何支持 ServiceConnection 的具体细节之前，先来说明一下 ServiceConnection 的机制。

比较 ServiceConnection 支持前后配置信息的流转更易理解，因此使用下面的图来说明。但此部分使用的示例不是前文示例，而是以 PostgreSQLContainer 为例说明。

![service-connection](/img/blogs/2025/0625_custom-service-connection/custome-service-connection.drawio.svg)

如图所示，ServiceConnection 支持前，连接信息仍然是通过配置文件（属性值）获取。而支持后，连接信息会直接从容器实例中获取，这是最大的区别。

下面简单说明连接信息使用前的各个流程（1～5）：（严格而言与实现略有差异，但为了便于理解，此处简要说明）

1. 由于使用了 `@Bean`，生成的容器实例会被注册为 Spring 的 Bean。  
2. 如果 Bean 使用了 `@ServiceConnection`，Spring 会从 `spring.factories` 中获取用于获取连接信息的连接详细工厂。Spring 会从 `spring.factories` 中注册的多个工厂里，选择与要注册为 Bean 的容器实例类型相匹配的工厂。**这意味着原则上需要为每个容器类提供对应的工厂类。**  
3. 工厂从容器实例获取连接所需的信息。  
4. 工厂生成连接详细信息的实例，并绑定获取到的连接信息。该连接详细信息实例也会被 Spring 注册为 Bean。  
5. 需要连接信息的 Bean 通过注入获取连接详细信息实例并引用所需值。

从该机制可以得出，要自定义实现 ServiceConnection 需要以下 4 点：

- Testcontainers 的自定义容器类  
  - 如第 2 步所示，Spring 会根据容器实例的类型匹配对应的工厂类，因此需要创建独立的容器类  
- 连接详细信息工厂实现  
  - 需要为创建的自定义容器类提供对应的工厂类实现  
- 连接详细信息  
  - 需要提供用于绑定获取到的连接信息的接口及其实现  
- 注册到 `spring.factories`  
  - 将工厂类注册到 `spring.factories`，以便 Spring 能获取到创建的工厂类

## ServiceConnection 支持的实现
基于上述内容，将[支持前的示例](#serviceconnection支持前)中所需的内容映射到 ServiceConnection 支持中，结果如下所示。

![service-connection-classes](/img/blogs/2025/0625_custom-service-connection/custome-service-connection-classes.drawio.svg)

处理 REST 应用的容器类创建为 `RestAppContainer`，并按照该命名创建其他相关类。下面来看各自的实现。

#### <RestAppContainer>
```java
public class RestAppContainer extends GenericContainer<RestAppContainer> {
    public RestAppContainer(@NonNull String dockerImageName) {
        super(dockerImageName);
    }
}
```
`RestAppContainer` 的本质与 `GenericContainer` 相同，但作为工厂搜索的标识，创建了继承自 `GenericContainer` 的自定义类。

#### <RestAppConnectionDetails>
```java
public interface RestAppConnectionDetails extends ConnectionDetails {
    String getConnectUrl();
}
```
该接口表示来自 `RestAppContainer` 的连接详细信息。连接详细信息接口需要继承自 Spring 的 `ConnectionDetails`。

#### <RestAppContainerConnectionDetailsFactory>
```java
class RestAppContainerConnectionDetailsFactory
    extends ContainerConnectionDetailsFactory<RestAppContainer, RestAppConnectionDetails> {

    @Override
    protected RestAppContainerConnectionDetails getContainerConnectionDetails(
            ContainerConnectionSource<RestAppContainer> source) {

        return new RestAppContainerConnectionDetails(source);
    }
    
    private static final class RestAppContainerConnectionDetails
    ... // 这部分将在后面出现
}
```
连接详细信息工厂的实现需要实现 Spring 用于表示它是连接详细信息工厂的 `ConnectionDetailsFactory` 接口。Spring 提供了针对该接口的骨架实现 `ContainerConnectionDetailsFactory`，因此这里继承了它。

`ConnectionDetailsFactory` 接口需要两个类型参数：容器类（`RestAppContainer`）和连接详细信息（`RestAppConnectionDetails`）。容器类用于标识该工厂对应哪个容器类，连接详细信息用于标识该工厂生成的连接详细信息类型。也就是说，工厂类的匹配基本上由工厂类定义的容器类类型参数决定。

`ConnectionDetailsFactory` 接口所需的实现都在 `ContainerConnectionSource` 中完成，因此只需返回针对连接详细信息接口的 `RestAppContainerConnectionDetails` 实例。

#### <RestAppContainerConnectionDetails>
```java
private static final class RestAppContainerConnectionDetails
    extends ContainerConnectionDetails<RestAppContainer>
    implements RestAppConnectionDetails {

    protected RestAppContainerConnectionDetails(ContainerConnectionSource<RestAppContainer> source) {
        super(source);
    }
    @Override
    public String getConnectUrl() {
        String host = getContainer().getHost();
        int port = getContainer().getFirstMappedPort();
        return "http://%s:%s".formatted(host, port);
    }
}
```
该类是 `RestAppConnectionDetails` 接口的实现，类的职责仅是返回连接地址，但 Spring 提供了面向连接详细信息的骨架实现 `ContainerConnectionDetails`，因此这里继承它。

该类的核心部分是 `getConnectUrl` 方法，其实现如你所见，是从容器实例获取容器运行的主机（通常为 localhost）和映射到主机的端口，并将其作为连接地址返回，这正体现了“连接信息由容器自己提供”的理念。

#### <spring.factories>
```shell
org.springframework.boot.autoconfigure.service.connection.ConnectionDetailsFactory=\
package.name.RestAppContainerConnectionDetailsFactory
```
最后，将创建的工厂实现以 FQCN 注册到 `spring.factories` 即可完成。如果项目中不存在 `spring.factories`，只需在项目的 `META-INF` 下创建一个普通文本文件即可。

这样就可以在自定义的 `RestAppContainer` 上使用 `@ServiceConnection` 了。  
将支持前的代码修改如下后，就会与支持前完全相同地运行。

#### <ServiceConnection 支持后>
```java
@SpringBootTest(webEnvironment = WebEnvironment.NONE)
class ContainerClientStep6Test {

    @Autowired
    private ContainerClient client;

    @Configuration(proxyBeanMethods = false)
    @Import(ClientApplication.class)
    static class TestConfig {
        @Bean
        @ServiceConnection // ← 添加此注解
        RestAppContainer appContainer() {
            return new RestAppContainer("container-app:latest")
                    .withExposedPorts(8080);
        }
    }
    // 无需 DynamicPropertyRegistrar
```
## 最后
自定义实现 ServiceConnection 支持大家觉得如何？在理解机制之前，它略有些黑魔法的感觉，看起来很难，但一旦理解就不会太难。通过支持 ServiceConnection，有一个直接的好处：无需再操作 `DynamicPropertyRegistrar` 或 `@DynamicPropertySource`；除此之外，对提供方和使用方而言，都无需了解连接相关的属性，从而减轻了认知负担。希望大家一定尝试一下自定义实现。
