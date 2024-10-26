---
title: Spring's Little Story - I Want to Test RestClient with RANDOM_PORT!
author: toshio-ogiwara
date: 2024-10-26T00:00:00.000Z
tags:
  - java
  - spring
  - spring-boot
  - Springの小話
image: true
translate: true

---

This little story is about testing with RestClient. If you are wondering how to do it with RestClient when there were no worries with TestRestTemplate, please read on.

:::info
This article has been verified to work with Spring Boot 3.3.5. The code explained in the article is available in full on GitHub [here](https://github.com/extact-io/restclient-with-random-port).
:::

# Problem When Obtaining Port Number
With the TestRestTemplate traditionally provided by Spring, there was no need to worry about which port the servlet container, such as Tomcat, used when running tests. On the other hand, RestClient does not have a test class like TestRestTemplate, so you need to explicitly specify the port yourself when configuring RestClient.

In such cases, the `local.server.port` setting or the meta-annotation `@LocalServerPort` of `@Value("${local.server.port}")` comes in handy[^1].

[^1]: [Embedded Web Server#Discovering the HTTP Port at Runtime :: Spring Boot - Reference](https://spring.pleiades.io/spring-boot/how-to/webserver.html#howto.webserver.discover-port)

Spring Boot sets the port number of the servlet container started in the test to `local.server.port` in the `Environment`. Therefore, if you want to know the port number at test execution, you can find it through this setting.

Therefore, you might want to configure the RestClient used in the test as follows, but this is actually not possible.

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT) // (1)
class RestclientWithRandomPortApplicationTest {

    @Autowired
    private RestClient restClient; // (3)

    @Configuration(proxyBeanMethods = false)
    @EnableAutoConfiguration
    static class TestConfig {
        ...
        @Bean
        RestClient restClient(@Value("${local.server.port}") int port) { // (2)
            return RestClient.builder()
                    .baseUrl("http://localhost:" + port) // Specify destination URL
                    .build();
        }
    }

    @Test
    void testHello() {
        String actual = restClient // (4)
                .get()
                .uri("/hello")
                .retrieve()
                .body(String.class);
        assertThat(actual).isEqualTo("hello!");
    }
}
```

Before explaining why this doesn't work, let's briefly explain the flow of the test code:
- Start the servlet container with a random port specified in (1).
- Receive the `local.server.port` setting as an argument in (2) and register the RestClient instance generated using that port number as a Bean.
- Receive the RestClient instance registered in (2) with `@Autowired` in (3).
- Use the RestClient instance received in (3) in (4) to test the target controller (`@RestController`).

Spring Boot starts the servlet container, such as Tomcat, after the creation of the ApplicationContext, which is a DI container. When using `RANDOM_PORT`, the port number is not determined until after the servlet container starts, so you cannot refer to the `local.server.port` setting during the DI container startup that occurs before that.

Since Bean registration via JavaConfig is naturally done during DI container startup, trying to configure RestClient with `RANDOM_PORT` will not work because the port number is not determined at that point. This is the reason it doesn't work. (There is a clever way to make it work, which will be introduced later.)

If the port number is not determined at the time of Bean registration, you might think of specifying the destination URL each time you send a request like `restClient.get().uri("https://petclinic.example.com:" + port)`, but this would require specifying the same thing each time, making the code redundant, which is something you want to avoid if possible.

Moreover, as you can see from the example of using the HTTP interface below, the HTTP interface does not specify the destination URL, and the underlying RestClient needs to determine the destination URL. For this reason, you want to decide the destination URL when generating the RestClient instance.

- Example of using in combination with HTTP interface

```java
// Example where port number cannot be obtained
@Bean
RestClient restClient(@Value("${local.server.port}") int port) {
    return RestClient.builder()
            .baseUrl("http://localhost:" + port) // Specify destination URL
            .build();
}
// Generate an instance of the HelloService interface using the functionality of the HTTP interface
@Bean
HelloService helloService(RestClient restClient) {
    RestClientAdapter adapter = RestClientAdapter.create(restClient); // Underlying RestClient
    HttpServiceProxyFactory factory = HttpServiceProxyFactory.builderFor(adapter).build();
    return factory.createClient(HelloService.class);
}
// Test the controller (@RestController) using the generated instance of HelloService
@Test
void testHello(@Autowired HelloService helloService) {
    String actual =  helloService.hello(); // 
    assertThat(actual).isEqualTo("hello!");
}
```

:::column: I don't really like mock testing...
Suddenly, but the author doesn't really like testing using so-called mocking libraries like Mockito. The main reasons are that mock testing is inherently difficult to understand and because it manipulates bytecode-level content in a truly black magic way, the behavior can change depending on the library or Java version, leading to many pitfalls.

There are other reasons to avoid it, but listing them would be endless and turn into a critical discussion, so I'll stop here. I dislike it so much that for unit tests, if the quality is ensured, I use the real thing, and if I want to control the behavior of return values from lower modules (which I don't do often) or verify if a certain path was taken, I prefer a stub approach that tests the interface of the target I want to control, rather than using mocks.

The reason I brought this up is that I dislike mocks so much that I conduct unit tests for `@RestController` using RestClient introduced in this article, not `@WebMvcTest`. (However, if the project's test policy is to use mocks, I will of course follow that.)
:::

# Solution 1: Create RestClient in @BeforeAll
One possible solution to the `RANDOM_PORT` problem is to generate an instance of RestClient in `@BeforeAll` (or `@BeforeEach`). Specifically, it looks like this:

```java
private static RestClient restClient;

// Solution 1: Create RestClient in @BeforeAll
@BeforeAll
static void beforeEach(@Value("${local.server.port}") int port) {
    restClient = RestClient.builder()
            .baseUrl("http://localhost:" + port)
            .build();

}
```

`@BeforeAll` in JUnit tests with `SpringExtension` (also included in `@SpringBootTest`) is called after Spring starts, so `local.server.port` is set. Therefore, you can always obtain the port number in `@BeforeAll`.

This solution usually works without problems, but there is one issue. It arises when you want to treat RestClient or an HTTP interface based on it as a Bean. Since the DI container processing is completed by the time `@BeforeAll` is called (although it can be done with effort), you cannot register the instance generated there as a Bean.

Therefore, if you want to treat RestClient as a Bean, you need to go back to square one and generate an instance of RestClient with JavaConfig.

So next, let's introduce a method to generate an instance of RestClient with JavaConfig.

# Solution 2: Delay Destination Determination
While a string was used to specify the destination URL for RestClient, you can also use `UriBuilderFactory` for the destination. If a factory is specified for the destination, the resolution (retrieval) of the destination is delayed until the request is sent.

Therefore, by implementing `UriBuilderFactory` as follows, you can specify a factory that only defines the method of obtaining the destination during Bean generation with JavaConfig, and perform the actual retrieval of the port number, etc., at the time of sending.

- Example implementation of `UriBuilderFactory`
```java
public class LocalHostUriBuilderFactory extends DefaultUriBuilderFactory {

    private Environment env;
    private String basePath;

    public LocalHostUriBuilderFactory(Environment env) {
        this(env, "");
    }
    public LocalHostUriBuilderFactory(Environment env, String basePath) {
        this.env = env;
        this.basePath = basePath;
    }

    // UriBuilderFactory
    @Override
    public UriBuilder uriString(String uriTemplate) {
        return super.uriString(localhostUriTemplate() + uriTemplate);
    }
    @Override
    public UriBuilder builder() {
        return super.uriString(localhostUriTemplate());
    }

    private String localhostUriTemplate() {
        return "http://localhost:" + env.getProperty("local.server.port") + basePath;
    }
}
```

- Example of generating RestClient with JavaConfig
```java
// Solution 2: Delay Destination Determination
@Bean
RestClient restClient(Environment env) {
    return RestClient.builder()
            .uriBuilderFactory(new LocalHostUriBuilderFactory(env)) // Specify uri with factory
            .build();
}
```

The `uriString` method is called at the time of request sending, so it is set to create the destination string in this method. Also, `Environment` is passed to the constructor so that the settings can be obtained in the `uriString` method.

Although implementing `UriBuilderFactory` is necessary, by preparing such a class, you can use RestClient without inconvenience even when using `RANDOM_PORT`.

# In Conclusion
The method of delaying destination determination was inspired by wondering why TestRestTemplate could obtain a random port number and checking its implementation. TestRestTemplate has a `LocalHostUriTemplateHandler` class with a similar implementation, but RestClient does not. Therefore, I created a similar class myself, but I feel that Spring might create a similar implementation in the not-too-distant future. If you are reading this article one or two years later, it might be a good idea to check Spring's implementation first.
