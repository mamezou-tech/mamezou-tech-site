---
title: Spring Tidbits - Custom ServiceConnection Handling
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

Spring Boot 3.1 introduced the ServiceConnection feature to simplify integration with Testcontainers. When I tried it, I thought “This is great!”, but it only supports certain middleware like PostgreSQL. While using middleware such as PostgreSQL in containers is indeed common, it’s just as common to containerize a counterpart REST application and use it as a stub—and ServiceConnection doesn’t work out of the box for custom containers.

So in this article, I’ll show you how to make a containerized REST application customly (i.e. “homemade”) ServiceConnection-ready so that you can connect to it with `@ServiceConnection`.

I won’t explain Testcontainers here, so if you’d like to get up to speed from scratch, please refer to the blog below.

@[og](https://developer.mamezou-tech.com/en/blogs/2025/06/23/testcontainers-with-springboot/)

:::info
This article has been tested with Spring Boot 3.5.3. Also, all of the code shown here is uploaded to GitHub [here](https://github.com/extact-io/testcontainer-sample).
:::

## Before ServiceConnection Support
First, here’s our app before custom ServiceConnection support. We’ll use this example throughout the article to explain how to add ServiceConnection support.

#### <Before ServiceConnection Support>
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

This app images the REST application as `container-app:latest`, and instantiates it with Testcontainers’ `GenericContainer`. As the class name suggests, `GenericContainer` is a generic container class that materializes whatever image you specify in its constructor.

The client app using this container obtains the container’s endpoint from the `client.connect-url` property, and then uses Spring’s [RestClient](https://spring.pleiades.io/spring-framework/reference/integration/rest-clients.html) to call the container’s REST API.

Because `GenericContainer` doesn’t support ServiceConnection, we manually retrieve and set the connection information using `DynamicPropertyRegistrar`.

Now, let’s go through what’s needed to add ServiceConnection support.

## How ServiceConnection Works
Before diving into the details of supporting ServiceConnection, let’s first explain what ServiceConnection is and how it works.

The mechanism of ServiceConnection is easiest to understand by comparing the flow of configuration information before and after support. For this part only, we’ll illustrate using `PostgreSQLContainer` as an example rather than the previous REST app.

![service-connection](/img/blogs/2025/0625_custom-service-connection/custome-service-connection.drawio.svg)

As shown in the diagram, before ServiceConnection support, connection information was obtained solely through configuration files (property values). After support, the biggest difference is that the connection information obtained directly from the container instance is used.

Let’s briefly explain the steps (1–5) of how the connection information is used. (Strictly speaking, there are some differences from the actual implementation, but this is simplified for clarity.)

1. Because the container bean is annotated with `@Bean`, the generated container instance is registered as a Spring Bean.
2. If a Bean is annotated with `@ServiceConnection`, Spring looks up a connection details factory from `spring.factories`. Among the factories registered there, Spring selects the one whose container instance type matches the Bean being registered. This means you need a separate factory class for each container class.
3. The factory retrieves the necessary connection information from the container instance.
4. The factory creates a connection details instance, binds the retrieved information to it, and registers this instance as a Spring Bean.
5. Any Bean that needs the connection information injects the connection details Bean and reads the required values.

From this mechanism, we can see that the following four items are necessary to customly support ServiceConnection:

- A custom Testcontainers container class  
  As shown in step 2, Spring matches the factory based on the container instance’s type, so you need to create a dedicated class.
- A connection details factory implementation  
  You need to implement a factory class corresponding to your custom container class.
- Connection details  
  You need an interface and its implementation to bind the retrieved connection information.
- Registration in `spring.factories`  
  Register your factory class in `spring.factories` so Spring can discover it.

## Implementing ServiceConnection Support
Based on what we’ve covered so far, applying the requirements to the [example before](#serviceconnection対応前) looks like this:

![service-connection-classes](/img/blogs/2025/0625_custom-service-connection/custome-service-connection-classes.drawio.svg)

We’ll create the container class for the REST app as `RestAppContainer`, and name the other classes accordingly. Let’s look at each implementation.

#### <RestAppContainer>
```java
public class RestAppContainer extends GenericContainer<RestAppContainer> {
    public RestAppContainer(@NonNull String dockerImageName) {
        super(dockerImageName);
    }
}
```
The implementation of `RestAppContainer` is identical to `GenericContainer`, but we create a custom subclass of `GenericContainer` as a marker for factory lookup.

#### <RestAppConnectionDetails>
```java
public interface RestAppConnectionDetails extends ConnectionDetails {
    String getConnectUrl();
}
```
This interface represents the connection details for `RestAppContainer`. The connection details interface must extend Spring’s `ConnectionDetails`.

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
    ... // we’ll get to this part shortly
}
```
The connection details factory implementation must implement Spring’s `ConnectionDetailsFactory` interface to indicate it’s a factory. Spring provides the skeleton implementation `ContainerConnectionDetailsFactory`, which we extend here.

The `ConnectionDetailsFactory` interface requires two type parameters: the container class (`RestAppContainer`) and the connection details (`RestAppConnectionDetails`). The container class indicates which container class the factory supports, and the connection details indicate the type of details the factory produces. In other words, factory matching is determined by the container class type parameter declared in the factory class.

Since the necessary implementation for `ConnectionDetailsFactory` is provided by `ContainerConnectionSource`, our only task here is to return an instance of `RestAppContainerConnectionDetails`.

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
This class implements the `RestAppConnectionDetails` interface. Its responsibility is simply to return the endpoint. Since Spring provides the skeleton implementation `ContainerConnectionDetails` for connection details, we extend it here.

The core of this class is the `getConnectUrl` method. As you can see, it retrieves the host on which the container is running (typically localhost) and the exposed port on the host, then returns them as the endpoint. This is exactly the part that demonstrates “the container knows the connection information.”

#### <spring.factories>
```shell
org.springframework.boot.autoconfigure.service.connection.ConnectionDetailsFactory=\
package.name.RestAppContainerConnectionDetailsFactory
```
Finally, register your factory implementation’s FQCN in `spring.factories`, and you’re done. If you don’t already have a `spring.factories` file, just create a plain text file under `META-INF` in your project.

Now you can use `@ServiceConnection` with your `RestAppContainer`. Modify the pre-support code as follows and it will behave exactly the same as before:

#### <After ServiceConnection Support>
```java
@SpringBootTest(webEnvironment = WebEnvironment.NONE)
class ContainerClientStep6Test {

    @Autowired
    private ContainerClient client;

    @Configuration(proxyBeanMethods = false)
    @Import(ClientApplication.class)
    static class TestConfig {
        @Bean
        @ServiceConnection // ← add this
        RestAppContainer appContainer() {
            return new RestAppContainer("container-app:latest")
                    .withExposedPorts(8080);
        }
    }
    // DynamicPropertyRegistrar is not needed
}
```

## Finally
How was this custom ServiceConnection support? Before understanding the mechanism, it may feel like a bit of black magic and seem difficult, but once you get it, it’s not that hard. Adding ServiceConnection support removes the need to work with `DynamicPropertyRegistrar` or `@DynamicPropertySource`, and it also reduces cognitive load for both providers and consumers by eliminating the need to know connection-related properties. Give your custom implementation a try!
