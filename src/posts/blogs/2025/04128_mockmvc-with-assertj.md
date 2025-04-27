---
title: Springの小話 - MockMvcのテストをAssertJにしてみる
author: toshio-ogiwara
date: 2025-04-28
tags: [java, spring, spring-boot, Springの小話]
image: true
---
Spring の Controller を対象とした MockMvc テストでは、従来はアサーションに [Hamcrest](https://hamcrest.org/) を使っていましたが、Spring Framework 6.2（対応する Spring Boot 3.4）からは [AssertJ](https://joel-costigliola.github.io/assertj/) も利用できるようになりました。
AssertJ の利点として fluent にMockMvcテストが書けることが挙げられますが、筆者としてはそれよりも given-when-then のスタイルでテストを書きやすくなった点が嬉しかったりします。

ということで、今回は Hamcrest のテストを AssertJ にするとどうなるか、その使い方や雰囲気の違いを説明少なめ、コード多めで紹介したいと思います。

:::info
この記事は Spring Boot 3.4.5 で動作を確認しています。また記事で説明したコードはGitHubの [こちら](https://github.com/extact-io/mockmvctester-sample) にすべてアップしています。
:::

## Mockオブジェクトの取得

- Hamcrest の場合
```java
@WebMvcTest(BookController.class)
class HamcrestBookControllerTest {
    @Autowired
    private MockMvc mockMvc;
    ...
```
<br>

- AssertJ の場合
```java
@WebMvcTest(BookController.class)
public class AssertjBookControllerTest {
    @Autowired
    private MockMvcTester mockMvc;
    ...
```
<br>

使うMockオブジェクトは Hamcrest は `MockMvc`クラスなのに対して、AssertJは Spring Framework 6.2 から導入された `MockMvcTester`クラスになります。

:::info: Mockオブジェクトの取得は他にも色々ある
ここでは一番シンプルな方法を説明していますが、Mockオブジェクトの取得方法は他に色々あります。もし詳しいことを知りたい方は [MockMvc :: Spring Framework - リファレンス](https://spring.pleiades.io/spring-framework/reference/testing/mockmvc.html) を参照ください。
:::


## GETリクエストの送信とレスポンスの検証
Mockオブジェクトの取得方法を見たので、さっそくテスト実装をみていきましょう。まずはよくある次のケースで両者の違いをみてみます。
  - GETでリクエスト送信を行う
  - HTTPステータスがOKであること
  - レスポンスボディのJSONを検証する

Hamcrest の場合は次のようになります。
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
        .andExpect(jsonPath("$[0].published").value("1972.06.01")); // 2件目以降の確認は省略
```
<br>

これに対して AssertJ はこのようになります。
```java
// when
MvcTestResult result = mockMvc
        .get()
        .uri("/books")
        .exchange();
// then
assertThat(result)
        // HTTPステータスの確認
        .hasStatusOk()
        // ボディをJSONとして扱う
        .bodyJson()
        // 指定したJSONパスが条件を満たしているか？
        .hasPathSatisfying("$.length()", p -> p.assertThat().isEqualTo(3))
        // 1件目のパスにフォーカス
        .extractingPath("$[0]")
        // フォーカスしているパス配下(='$[0].id')の値の検証
        .hasFieldOrPropertyWithValue("id", 1)
        // 以降同様
        .hasFieldOrPropertyWithValue("title", "燃えよ剣")
        .hasFieldOrPropertyWithValue("author", "司馬遼太郎")
        .hasFieldOrPropertyWithValue("published", "1972.06.01"); // 2件目以降の検証は省略
```
<br>

AssertJで出てくる個々のAPIはコードのコメントを見てもらえれば分かると思うため省略しますが、Hamcrestは外側で大きく`andExpect` で囲うスタイルのため、コードを書いている際にカーソルを前に戻して...などと行ったり来たりが必要となります。一方のAssertJは見て分かるように、先頭からやりたいこと、確認したいことをまさに流れるように書いていくことができ、コードを書いていてとても気持ちがいいです。

:::info: パスパラメータやリクエストパラメータが必要な場合
パラメータが必要な場合、AssertJでは次のようにします。RestClientの呼び出しAPIに似ていて、これも個人的に気にいっています。

- パスパラメータを付ける例
```java
MvcTestResult result = mockMvc
        .get()
        .uri("/books/{id}", id)
        .exchange();
```

- リクエストパラメータを付ける例
```java
MvcTestResult result = mockMvc
        .get()
        .uri("/books/search")
        .param("title", title)
        .param("author", author)
        .exchange();
```
:::


## POSTリクエストの送信
今度はPOSTリクエストを見てみましょう。POSTリクエストにはボディの設定が必要となりますが、これがそれぞれでどうなるかをみてみます。

Hamcrest の場合は次のようになります。
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

これに対して AssertJ はこのようになります。
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

これはほとんど変わらないですね。

## HTTPステータスとHTTPヘッダの検証
基本的な検証パターンをみたところで、次はHTTPステータスやHTTPヘッダの検証をみてみましょう。ここでは次のようなケースを実装する場合にそれぞれがどうなるかをみてみます。
  - HTTPステータスがBAD_REQUESTであること
  - EXCEPTIONヘッダに発生した例外クラス名が設定されていること
  - ボディにエラーメッセージの一部が含まれていること

Hamcrest の場合は次のようになります。
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

これに対して AssertJ はこのようになります。
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
        // 該当のヘッダーがあるか？
        .hasHeader("EXCEPTION", DuplicateKeyException.class.getSimpleName())
        // ボディをJSONとして扱う
        .bodyText()
        // ボディのテキストに含まれる文字列を検証
        .contains("既に登録されています", "title", "ノルウェイの森");
```
<br>

これは AssertJ の方が明らかにスッキリしていますね。

## HTTPヘッダーの条件付き検証
上記はHTTPヘッダーが存在するかしないかの単純な検証でしたが、ヘッダーの値に条件を付けたい場合もあります。最後に少し凝った次のようなケースを実装する場合、それぞれどうなるかをみてみます。

  - ログインが成功したらレスポンスヘッダに Authorization ヘッダに Bearer トークンが設定されていること
  - ログインが失敗したらレスポンスヘッダに Authorization ヘッダが設定されていないこと

Hamcrest の場合は次のようになります。
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
                    // 'Bearer 'で始まりその後に1文字以上あること
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

これに対して AssertJ はこのようになります。
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
            // ヘッダー検証に特化したAssertに切り替える
            .headers()
            // 条件を満たすヘッダーがあるか検証する
            .hasEntrySatisfying(AUTHORIZATION, v -> assertThat(v)
                    .element(0) // valueの1件目を
                    .asString() // 文字列として扱い
                    .matches("^Bearer .+$")); // 条件に合うか検証する
    assertThat(result)
            // ボディをテキスト(文字列)として扱うAssertに切り替える
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

AssertJ の方が記述量は若干増えますが、AssertJ の方がやっていることが直観的にみてとれます（個人の感想です）。

## おわりに
双方を見比べてきましたがどうだったでしょうか？ AssertJ にすることでコード量が劇的に減ったり、なにかが特別使いやすくなったりする訳ではないですが、見やすく・書きやすいのは間違いありません。筆者としては今後は AssetJ を使っていきたいと思います。
