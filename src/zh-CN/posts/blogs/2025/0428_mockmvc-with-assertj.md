---
title: Spring 小故事 - 使用 AssertJ 改写 MockMvc 测试
author: toshio-ogiwara
date: 2025-04-28T00:00:00.000Z
tags:
  - java
  - spring
  - spring-boot
  - Springの小話
image: true
translate: true

---
在针对 Spring 控制器的 MockMvc 测试中，过去我们使用 [Hamcrest](https://hamcrest.org/) 进行断言，但从 Spring Framework 6.2（对应的 Spring Boot 3.4）开始，也可以使用 [AssertJ](https://joel-costigliola.github.io/assertj/)。  
AssertJ 的优点之一是可以以流式方式编写 MockMvc 测试，但对于作者来说，更让人高兴的是，它使得以 given-when-then 风格编写测试变得更加容易。

所以，这次我想通过“解释少、代码多”的方式，介绍将 Hamcrest 测试改为 AssertJ 会是什么样子，以及它们在用法和风格上的差异。

:::info
本文已在 Spring Boot 3.4.5 上验证可正常运行。此外，文章中讲解的所有代码都已上传至 GitHub 的 [此处](https://github.com/extact-io/mockmvctester-sample)。
:::

## 获取 Mock 对象

- Hamcrest 情况下
```java
@WebMvcTest(BookController.class)
class HamcrestBookControllerTest {
    @Autowired
    private MockMvc mockMvc;
    ...
```
<br>

- AssertJ 情况下
```java
@WebMvcTest(BookController.class)
public class AssertjBookControllerTest {
    @Autowired
    private MockMvcTester mockMvc;
    ...
```
<br>

所使用的 Mock 对象，在 Hamcrest 中是 `MockMvc` 类，而在 AssertJ 中是从 Spring Framework 6.2 引入的 `MockMvcTester` 类。

:::info: 获取 Mock 对象还有多种方式
这里介绍的是最简单的方法，但获取 Mock 对象的方法还有多种。如果想了解详细内容，请参阅 [MockMvc :: Spring Framework - 参考文档](https://spring.pleiades.io/spring-framework/reference/testing/mockmvc.html)。
:::

## 发送 GET 请求并验证响应
了解了获取 Mock 对象的方法后，让我们立即来看测试实现。首先以常见的以下场景来比较二者的区别。  
  - 发送 GET 请求  
  - HTTP 状态为 OK  
  - 验证响应体中的 JSON  

在 Hamcrest 情况下如下：
```java
@Test
// 当
mockMvc.perform(get("/books"))
        // 然后
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(3))
        .andExpect(jsonPath("$[0].id").value(1))
        .andExpect(jsonPath("$[0].title").value("燃えよ剣"))
        .andExpect(jsonPath("$[0].author").value("司馬遼太郎"))
        .andExpect(jsonPath("$[0].published").value("1972.06.01")); // 省略第2项及之后的验证
```
<br>

而 AssertJ 如下所示：
```java
// 当
MvcTestResult result = mockMvc
        .get()
        .uri("/books")
        .exchange();
// 然后
assertThat(result)
        // 验证 HTTP 状态
        .hasStatusOk()
        // 将响应体作为 JSON 处理
        .bodyJson()
        // 检查指定的 JSON 路径是否满足条件
        .hasPathSatisfying("$.length()", p -> p.assertThat().isEqualTo(3))
        // 聚焦到第1项路径
        .extractingPath("$[0]")
        // 验证当前聚焦路径下（='$[0].id'）的值
        .hasFieldOrPropertyWithValue("id", 1)
        // 其余类似
        .hasFieldOrPropertyWithValue("title", "燃えよ剣")
        .hasFieldOrPropertyWithValue("author", "司馬遼太郎")
        .hasFieldOrPropertyWithValue("published", "1972.06.01"); // 省略第2项及之后的验证
```
<br>

AssertJ 提供的各个 API 通过代码注释就能理解，因此这里略过，但对于 Hamcrest 来说，需要在外层使用大量的 `andExpect` 包裹，在编写代码时需要频繁地来回移动光标。而 AssertJ 如上所示，可以从头到尾以流式的方式编写想要执行和验证的内容，编写代码时非常顺畅。

:::info: 需要路径参数或请求参数时
如果需要参数，在 AssertJ 中如下所示。它类似于 RestClient 的调用 API，我个人也很喜欢这种方式。

- 添加路径参数的例子
```java
MvcTestResult result = mockMvc
        .get()
        .uri("/books/{id}", id)
        .exchange();
```

- 添加请求参数的例子
```java
MvcTestResult result = mockMvc
        .get()
        .uri("/books/search")
        .param("title", title)
        .param("author", author)
        .exchange();
```
:::

## 发送 POST 请求
这次来看 POST 请求。POST 请求需要设置请求体，下面来看看在两者中会如何实现。

在 Hamcrest 情况下如下：
```java
// 给定
Book book = new Book(4, "雪国", "川端康成", "1937.06.12");
String body = mapper.writeValueAsString(book);
// 当
mockMvc.perform(post("/books")
        .contentType(MediaType.APPLICATION_JSON)
        .content(body))
        // 然后
        .andExpect(status().isOk());
```
<br>

而 AssertJ 如下所示：
```java
// 给定
Book book = new Book(4, "雪国", "川端康成", "1937.06.12");
String body = mapper.writeValueAsString(book);
// 当
MvcTestResult result = mockMvc
        .post()
        .uri("/books")
        .contentType(MediaType.APPLICATION_JSON)
        .content(body)
        .exchange();
// 然后
assertThat(result).hasStatusOk();
```
<br>

几乎没有变化。

## 验证 HTTP 状态和 HTTP 头
在看完基本的验证模式后，接下来看看如何验证 HTTP 状态和 HTTP 头。下面以实现以下场景为例来对比二者的写法：  
  - HTTP 状态为 BAD_REQUEST  
  - 在 EXCEPTION 头中设置了发生的异常类名  
  - 响应体中包含一部分错误信息  

在 Hamcrest 情况下如下：
```java
// 给定
Book book = new Book(5, "ノルウェイの森", "村上春樹", "1987.09.04");
String body = mapper.writeValueAsString(book);
// 当
mockMvc.perform(post("/books")
        .contentType(MediaType.APPLICATION_JSON)
        .content(body))
        // 然后
        .andExpect(status().isBadRequest())
        .andExpect(header().string("EXCEPTION", DuplicateKeyException.class.getSimpleName()))
        .andExpect(content().string(allOf(
                containsString("既に登録されています"),
                containsString("title"),
                containsString("ノルウェイの森") //
        )));
```
<br>

而 AssertJ 如下所示：
```java
// 给定
Book book = new Book(5, "ノルウェイの森", "村上春樹", "1987.09.04");
String body = mapper.writeValueAsString(book);
// 当
MvcTestResult result = mockMvc
        .post()
        .uri("/books")
        .contentType(MediaType.APPLICATION_JSON)
        .content(body)
        .exchange();
// 然后
assertThat(result)
        .hasStatus(HttpStatus.BAD_REQUEST)
        // 是否存在对应的头？
        .hasHeader("EXCEPTION", DuplicateKeyException.class.getSimpleName())
        // 将响应体作为 JSON 处理
        .bodyText()
        // 验证响应文本中包含的字符串
        .contains("既に登録されています", "title", "ノルウェイの森");
```
<br>

这明显更简洁了。

## 有条件的 HTTP 头验证
以上是对 HTTP 头是否存在的简单验证，但有时需要对头的值添加条件。最后以稍复杂的以下场景为例，看看二者的写法：  
  - 登录成功时，响应头中 `Authorization` 头设置了 Bearer Token  
  - 登录失败时，响应头中未设置 `Authorization` 头  

在 Hamcrest 情况下如下：
```java
@Test
void testLoginSuccess() throws Exception {
    // 给定
    String loginId = "member";
    String password = "password1";
    // 当
    mockMvc.perform(get("/login")
            .param("loginId", loginId)
            .param("password", password))
            // 然后
            .andExpect(status().isOk())
            .andExpect(header().string(
                    AUTHORIZATION,
                    // 以 'Bearer ' 开头，且之后至少有 1 个字符
                    matchesPattern("^Bearer .+$")))
            .andExpect(content().string(equalTo("true")));
}

@Test
void testLoginFail() throws Exception {
    // 给定
    String loginId = "NG_id";
    String password = "NG_password";
    // 当
    mockMvc.perform(get("/login")
            .param("loginId", loginId)
            .param("password", password))
            // 然后
            .andExpect(header().doesNotExist(AUTHORIZATION))
            .andExpect(status().isUnauthorized());
}
```
<br>

而 AssertJ 如下所示：
```java
@Test
void testLoginSuccess() throws Exception {
    // 给定
    String loginId = "member";
    String password = "password1";
    // 当
    MvcTestResult result = mockMvc
            .get()
            .uri("/login")
            .param("loginId", loginId)
            .param("password", password)
            .exchange();
    // 然后
    assertThat(result)
            .hasStatusOk();
    assertThat(result)
            // 切换到专门用于头验证的 Assert
            .headers()
            // 验证是否存在满足条件的头
            .hasEntrySatisfying(AUTHORIZATION, v -> assertThat(v)
                    .element(0) // 获取 value 的第一个元素
                    .asString() // 作为字符串处理
                    .matches("^Bearer .+$")); // 验证是否满足条件
    assertThat(result)
            // 切换到将响应体作为文本（字符串）处理的 Assert
            .bodyText()
            .isEqualTo("true");
}

@Test
void testLoginFail() throws Exception {
    // 给定
    String loginId = "NG_id";
    String password = "NG_password";
    // 当
    MvcTestResult result = mockMvc
            .get()
            .uri("/login")
            .param("loginId", loginId)
            .param("password", password)
            .exchange();
    // 然后
    assertThat(result)
            .hasStatus(HttpStatus.UNAUTHORIZED)
            .doesNotContainHeader(AUTHORIZATION);
}
```
<br>

AssertJ 的代码量略有增加，但可以直观地看出其所做的操作（个人观点）。

## 结束语
比较了双方，不知道大家感觉如何？虽然使用 AssertJ 并不会让代码量急剧减少，也不会让某些功能变得特别易用，但毫无疑问它更加易读、易写。作者今后也打算使用 AssertJ。
