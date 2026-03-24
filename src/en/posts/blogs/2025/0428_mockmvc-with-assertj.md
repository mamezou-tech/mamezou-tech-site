---
title: Spring Tidbit - Trying AssertJ for MockMvc Tests
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

In MockMvc tests targeting Spring Controllers, assertions have traditionally been done with [Hamcrest](https://hamcrest.org/), but starting with Spring Framework 6.2 (and the corresponding Spring Boot 3.4), [AssertJ](https://joel-costigliola.github.io/assertj/) has also become available. One advantage of AssertJ is that you can write MockMvc tests in a fluent style, but personally I'm even more happy that it makes it easier to write tests in the given-when-then style.

Therefore, in this post I'd like to show what happens when you convert tests from Hamcrest to AssertJ, introducing how to use it and the difference in feel with minimal explanation and plenty of code.

:::info
This article has been tested with Spring Boot 3.4.5. Also, all the code explained in this article is uploaded to GitHub [here](https://github.com/extact-io/mockmvctester-sample).
:::

## Obtaining the Mock Object

- In the case of Hamcrest
```java
@WebMvcTest(BookController.class)
class HamcrestBookControllerTest {
    @Autowired
    private MockMvc mockMvc;
    ...
```
<br>

- In the case of AssertJ
```java
@WebMvcTest(BookController.class)
public class AssertjBookControllerTest {
    @Autowired
    private MockMvcTester mockMvc;
    ...
```
<br>

The mock object used is the `MockMvc` class in Hamcrest, whereas in AssertJ it's the `MockMvcTester` class introduced in Spring Framework 6.2.

:::info: There are various ways to get the mock object
Here we explain the simplest method, but there are various other ways to obtain the mock object. If you want more details, please refer to [MockMvc :: Spring Framework - Reference](https://spring.pleiades.io/spring-framework/reference/testing/mockmvc.html).
:::

## Sending a GET Request and Verifying the Response

Now that we've seen how to obtain the mock object, let's dive into the test implementation. First, let's compare the two approaches with the following common case:
  - Sending a GET request
  - Asserting that the HTTP status is OK
  - Verifying the JSON in the response body

With Hamcrest, it looks like this:
```java
@Test
// when
mockMvc.perform(get("/books"))
        // then
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(3))
        .andExpect(jsonPath("$[0].id").value(1))
        .andExpect(jsonPath("$[0].title").value("燃えよ剣"))
        .andExpect(jsonPath("$[0].author").value("司馬遼太郎"))
        .andExpect(jsonPath("$[0].published").value("1972.06.01")); // checks from the second item onward are omitted
```
<br>

On the other hand, with AssertJ it becomes this:
```java
// when
MvcTestResult result = mockMvc
        .get()
        .uri("/books")
        .exchange();
// then
assertThat(result)
        // verify HTTP status
        .hasStatusOk()
        // treat body as JSON
        .bodyJson()
        // does the specified JSON path satisfy the condition?
        .hasPathSatisfying("$.length()", p -> p.assertThat().isEqualTo(3))
        // focus on the first item path
        .extractingPath("$[0]")
        // verify the value under the focused path (='[0].id')
        .hasFieldOrPropertyWithValue("id", 1)
        // and so on
        .hasFieldOrPropertyWithValue("title", "燃えよ剣")
        .hasFieldOrPropertyWithValue("author", "司馬遼太郎")
        .hasFieldOrPropertyWithValue("published", "1972.06.01"); // checks for the second and subsequent items are omitted
```
<br>

I’ll omit explaining each API in AssertJ since the code comments should make them clear, but with Hamcrest’s style of wrapping everything in large `andExpect` calls, when writing code you often have to move the cursor back and forth... In contrast, as you can see, AssertJ lets you write what you want to do and what you want to verify in a flowing manner from the start, making writing code a very pleasant experience.

:::info: When path parameters or request parameters are needed
When parameters are required, in AssertJ you do it like this. It’s similar to the call API of RestClient, which I personally like as well.

- Example of adding a path parameter
```java
MvcTestResult result = mockMvc
        .get()
        .uri("/books/{id}", id)
        .exchange();
```

- Example of adding request parameters
```java
MvcTestResult result = mockMvc
        .get()
        .uri("/books/search")
        .param("title", title)
        .param("author", author)
        .exchange();
```
:::

## Sending a POST Request

Next, let’s look at POST requests. Since POST requests require setting up a body, let’s see how this looks with each approach.

With Hamcrest, it looks like this:
```java
// given
Book book = new Book(4, "雪国", "川端康成", "1937.06.12");
String body = mapper.writeValueAsString(book);
// when
mockMvc.perform(post("/books")
        .contentType(MediaType.APPLICATION_JSON)
        .content(body))
        // then
        .andExpect(status().isOk());
```
<br>

On the other hand, with AssertJ it becomes:
```java
// given
Book book = new Book(4, "雪国", "川端康成", "1937.06.12");
String body = mapper.writeValueAsString(book);
// when
MvcTestResult result = mockMvc
        .post()
        .uri("/books")
        .contentType(MediaType.APPLICATION_JSON)
        .content(body)
        .exchange();
// then
assertThat(result).hasStatusOk();
```
<br>

This is hardly any different.

## Verifying HTTP Status and HTTP Headers

Having looked at basic verification patterns, let's move on to verifying HTTP status and HTTP headers. Here, we’ll examine how each approach handles the following case:
  - The HTTP status is BAD_REQUEST
  - The EXCEPTION header contains the name of the exception class that occurred
  - The body contains a part of the error message

With Hamcrest, it looks like this:
```java
// given
Book book = new Book(5, "ノルウェイの森", "村上春樹", "1987.09.04");
String body = mapper.writeValueAsString(book);
// when
mockMvc.perform(post("/books")
        .contentType(MediaType.APPLICATION_JSON)
        .content(body))
        // then
        .andExpect(status().isBadRequest())
        .andExpect(header().string("EXCEPTION", DuplicateKeyException.class.getSimpleName()))
        .andExpect(content().string(allOf(
                containsString("既に登録されています"),
                containsString("title"),
                containsString("ノルウェイの森") //

        )));
```
<br>

On the other hand, with AssertJ it looks like this:
```java
// given
Book book = new Book(5, "ノルウェイの森", "村上春樹", "1987.09.04");
String body = mapper.writeValueAsString(book);
// when
MvcTestResult result = mockMvc
        .post()
        .uri("/books")
        .contentType(MediaType.APPLICATION_JSON)
        .content(body)
        .exchange();
// then
assertThat(result)
        .hasStatus(HttpStatus.BAD_REQUEST)
        // is the target header present?
        .hasHeader("EXCEPTION", DuplicateKeyException.class.getSimpleName())
        // treat body as JSON
        .bodyText()
        // verify that the body text contains the strings
        .contains("既に登録されています", "title", "ノルウェイの森");
```
<br>

This is clearly more concise with AssertJ.

## Conditional Verification of HTTP Headers

The above was a simple check whether a header exists or not, but sometimes you want to add conditions to header values. Finally, let's look at a more elaborate case and see how each approach handles it:

  - When login succeeds, the response header Authorization is set with a Bearer token
  - When login fails, the response header Authorization is not set

With Hamcrest, it looks like this:
```java
@Test
void testLoginSuccess() throws Exception {
    // given
    String loginId = "member";
    String password = "password1";
    // when
    mockMvc.perform(get("/login")
            .param("loginId", loginId)
            .param("password", password))
            // then
            .andExpect(status().isOk())
            .andExpect(header().string(
                    AUTHORIZATION,
                    // starts with 'Bearer ' followed by one or more characters
                    matchesPattern("^Bearer .+$")))
            .andExpect(content().string(equalTo("true")));
}

@Test
void testLoginFail() throws Exception {
    // given
    String loginId = "NG_id";
    String password = "NG_password";
    // when
    mockMvc.perform(get("/login")
            .param("loginId", loginId)
            .param("password", password))
            // then
            .andExpect(header().doesNotExist(AUTHORIZATION))
            .andExpect(status().isUnauthorized());
}
```
<br>

On the other hand, with AssertJ it looks like this:
```java
@Test
void testLoginSuccess() throws Exception {
    // given
    String loginId = "member";
    String password = "password1";
    // when
    MvcTestResult result = mockMvc
            .get()
            .uri("/login")
            .param("loginId", loginId)
            .param("password", password)
            .exchange();
    // then
    assertThat(result)
            .hasStatusOk();
    assertThat(result)
            // switch to an assertion specialized for header verification
            .headers()
            // verify that there is a header satisfying the condition
            .hasEntrySatisfying(AUTHORIZATION, v -> assertThat(v)
                    .element(0) // take the first value
                    .asString() // treat it as a string
                    .matches("^Bearer .+$")); // verify it matches the condition
    assertThat(result)
            // switch to an assertion that treats the body as text (string)
            .bodyText()
            .isEqualTo("true");
}

@Test
void testLoginFail() throws Exception {
    // given
    String loginId = "NG_id";
    String password = "NG_password";
    // when
    MvcTestResult result = mockMvc
            .get()
            .uri("/login")
            .param("loginId", loginId)
            .param("password", password)
            .exchange();
    // then
    assertThat(result)
            .hasStatus(HttpStatus.UNAUTHORIZED)
            .doesNotContainHeader(AUTHORIZATION);
}
```
<br>

The amount of code is slightly more with AssertJ, but what AssertJ is doing is more intuitive at a glance (just my personal opinion).

## Conclusion

So, what do you think after comparing the two? Switching to AssertJ doesn’t dramatically reduce the amount of code or make something especially easier to use, but it undeniably makes code more readable and easier to write. As for me, I plan to use AssertJ going forward.
