---
title: JetBrainsのJunieを使ってみた（導入編）
author: yasunori-shiota
date: 2025-09-11
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2025-summer/
tags: [JetBrains, AIエージェント, java, summer2025]
image: true
---

この記事は夏のリレー連載2025 11日目の記事です。
カレーの付け合わせには、福神漬けよりもらっきょうの方が好きな塩田です。

今年の4月に、JetBrains社からAIエージェントのJunieが一般公開されました。
AIエージェントとしては他にも、Claude CodeやCursorなどがありますよね。

筆者は日ごろからIntelliJ IDEAを利用する機会が多いので、今回はJetBrainsのJunieについて記事にしたいと思います。

## Junieとは

Junieとは、JetBrains社が開発した自律型のAIコーディングエージェントです。

@[og](https://www.jetbrains.com/ja-jp/junie/)

筆者は以前、JetBrainsのAI Assistantを利用していました。豆蔵デベロッパーサイトでも過去に、AI Assistantに関する記事が投稿されていましたよね。

- [開発者体験(DX)を進化させるJetBrainsのAIアシスタント機能の紹介](https://developer.mamezou-tech.com/blogs/2023/12/09/jetbrains-ai-assistant-intro/)

このような従来のコード補完やプロンプトによるコード生成とは異なり、Junieはプロジェクト全体のコンテキストを理解したうえで、コードの生成からテストの実行までを行ってくれるのが特徴のようです。

とは書いてみたもののあまりイメージができないので、簡単ですが前置きはこれくらいにして早速、Junieを使っていきたいと思います。

なお、JunieはIntelliJ IDEA Community Editionもサポートしているため、記事の執筆にあたっては無償枠のIntelliJ IDEAおよびJunieを使わせていただきます。
無償枠ですと機能制限等があるかと思いますが、ご理解いただきたく存じます。

:::info
IntelliJ IDEA以外のJetBrains IDEにも対応しており、PyCharmやWebStormなどでJunieを利用することもできます。
また、Googleが提供する[Android Studio](https://developer.android.com/studio?hl=ja)でも利用することができます。
:::

## Junieのインストール

IntelliJ IDEAがすでにインストールされていることは前提とさせていただき、Junieをインストールするところから始めていきます。

何も難しいことはありません。IntelliJ IDEAを起動し、MarketplaceからJunieを検索してプラグインをインストールします。ただそれだけです。

![プラグイン](https://i.gyazo.com/fd10d400a0da19d6ef893c26b1925496.png)

:::info
筆者が使用しているIntelliJ IDEAのバージョンは`2025.2.1`となります。
Junieのインストールがうまくいかない場合は、IntelliJ IDEAのバージョンをご確認ください。
:::

## プロジェクトの準備

Junieのインストールを終えたら[Spring Initializr](https://start.spring.io/)などを利用して、空のプロジェクトをご準備ください。
もちろん、Spring Bootのプロジェクトでなくても構いません。IntelliJ IDEAのサポート範囲でお好きなものをご準備いただければと思います。

本投稿では、Junieを使ってREST APIのSpring Bootアプリケーションを開発していきたいと思います。

筆者が準備したプロジェクトはこのとおり、ほぼほぼ空の状態です。

![SpringBootプロジェクト](https://i.gyazo.com/8b25af8e51ddd2e0f874934a5952c919.png)

`build.gradle`の依存関係も最低限のものだけ記述しています。Spring MVCやSpring Data JPAに関するスターターライブラリも含まれておりません。

```gradle:build.gradle
dependencies {
  implementation 'org.springframework.boot:spring-boot-starter'
  compileOnly 'org.projectlombok:lombok'
  developmentOnly 'org.springframework.boot:spring-boot-devtools'
  annotationProcessor 'org.springframework.boot:spring-boot-configuration-processor'
  annotationProcessor 'org.projectlombok:lombok'
  testImplementation 'org.springframework.boot:spring-boot-starter-test'
  testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}
```

## Junieを使用する前に

IntelliJ IDEAから先ほどのプロジェクトを開いてみます。
すると、IntelliJ IDEAの右サイドバーにこのようなJunieのアイコンがあるので、それをクリックするとJunieのツールウィンドウが表示されるはずです。

![Junieツールウィンドウ](https://i.gyazo.com/0dbbf4ef39c19d869a2b89c15f2b1808.png)

最初の印象は「あぁ、日本語に対応しているのかなぁ～」でしたが、どうやら日本語にも対応しているようですね。安心しました。

### Junieの動作モード

Junieには、「Codeモード」と「Askモード」の2つの動作モードがあります。

| 動作モード | 概要 |
| :--- | :--- |
| Codeモード | Junieがコードの追加や編集、テストの実行までを自律的に実行するモード。 |
| Askモード | Junieと自然言語でやりとりしながら、設計や実装の方針などについて「相談」できるモード。 |

JetBrainsの公式サイトやブログを見てみると、Askモードで設計方針を定め、それに基づいてCodeモードで実装、テストを実施するといった使い方を想定されているように感じました。
時間の関係上、今回はCodeモードについてのみ投稿させていただきます。

### JunieのLLM

JunieのLLMを確認してみようと設定画面を開いてみたら、OpenAIのGPT-5がデフォルトで選択されていました。

![Junieの設定画面](https://i.gyazo.com/cc6d3714f48834adef8718017e2cda8a.png)

Junieの設定は変更せずに、このままGPT-5を使いたいと思います。

## Junieを使ってみる

それではここから、Junieを使って先ほどのプロジェクトがどのように変化していくのかを体験したいと思います。

何も考えずに、`社員情報を管理するREST APIを実装してください。`とだけプロンプトに入力してみました。

![Step-01](https://i.gyazo.com/742f36efb5f8f0a88f11f1a505bcce8f.png)

すると、次のような計画ステップが作成され、これに沿って順番に各ステップが実行されます。

![Step-02](https://i.gyazo.com/c2bd7d6ffda937b957b5bd9f7af5e0bc.png)

何度か`Approve`ボタンを押下したのち、ビルドおよびテストの実行まで終えると、すべてのステップの完了が通知されます。

![Step-03](https://i.gyazo.com/06667930abb9b0f35968adc4c4e21931.png)

実際に生成されたコードを見てみると、なんてことでしょう、詳細な指示を与えていないのに社員情報（リソース）を扱うためのソースコード一式が揃っているではありませんか。
REST APIに加え、エンティティクラスやリポジトリインタフェースも存在します。

![Tree](https://i.gyazo.com/a1494814f4abc1028bf121e4d58c970f.png)

なお、ここではパッケージ構造やレイヤ構造については触れないでおくこととします。

```java:Employee.java
@Entity
@Table(name = "employees")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Employee {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotBlank private String name;

  @Email
  @NotBlank
  @Column(unique = true)
  private String email;

  @NotBlank private String department;

  @PastOrPresent private LocalDate hireDate;
}
```

```java:EmployeeRepository.java
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
  Optional<Employee> findByEmail(String email);
}
```

```java:EmployeeController.java
@RestController
@RequestMapping("/employees")
public class EmployeeController {

  // ---------- ＜中略＞ ---------- //

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Employee create(@RequestBody @Valid Employee employee) {
    try {
      employee.setId(null);
      return repository.save(employee);
    } catch (DataIntegrityViolationException e) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
    }
  }

  @GetMapping
  public List<Employee> list() {
    return repository.findAll();
  }

  @GetMapping("/{id}")
  public Employee get(@PathVariable Long id) {
    return repository
        .findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
  }

  @PutMapping("/{id}")
  public Employee update(@PathVariable Long id, @RequestBody @Valid Employee updated) {
    Employee existing =
        repository
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    
    // ---------- ＜中略＞ ---------- //

    try {
      return repository.save(existing);
    } catch (DataIntegrityViolationException e) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
    }
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    if (!repository.existsById(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
    repository.deleteById(id);
  }
}
```

もちろんのこと、`build.gradle`や`application.yaml`も編集されています。

```gradle:build.gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    runtimeOnly 'com.h2database:h2'

    // ---------- ＜中略＞ ---------- // 
}
```

`build.gradle`はこのとおり、プロジェクト作成時点で記述されていなかったSpring MVCやSpring Data JPAなどのライブラリが依存関係に追加されています。

```yaml:application.yaml
spring:
  application:
    name: mamezou-blog-restapi
  datasource:
    url: jdbc:h2:mem:employees;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    driverClassName: org.h2.Driver
    username: sa
    password: ""
  jpa:
    hibernate:
      ddl-auto: update
  h2:
    console:
      enabled: true
      path: /h2-console
```

また、プロジェクト作成時点でのアプリケーションプロパティは`application.properties`でしたが、筆者の好みで`application.yaml`に変更させていただきました。
これもJunieを使って変更しています。

## Junieによるテストの追加

先述の「[Junieを使ってみる](#junieを使ってみる)」の時点では、テストクラスが実装されていませんでした。
そこで、テストクラスを追加するため、Junieのプロンプトに`単体テストを実装してください。`と入力してみました。

![Test-01](https://i.gyazo.com/cc9178c2319330331526041ab4f1d4f3.png)

はい、このとおり`EmployeeController`クラスのテストクラス、つまり`EmployeeControllerTest`クラスが追加されました。

![Test-02](https://i.gyazo.com/2c7ee2e4ee78db8fd76c925275053c4f.png)

`EmployeeController`クラスのREST API（ハンドラメソッド）に対するテストメソッドが実装されていることも確認できます。

```java:EmployeeControllerTest.java
@WebMvcTest(EmployeeController.class)
class EmployeeControllerTest {

  @Autowired MockMvc mockMvc;
  @Autowired ObjectMapper objectMapper;

  @MockBean EmployeeRepository repository;

  private Employee sample(Long id) {
    return new Employee(id, "Taro Yamada", "taro@example.com", "IT", LocalDate.of(2020, 1, 1));
  }

  @Test
  @DisplayName("POST /employees - creates employee and returns 201")
  void create_success() throws Exception {
    Employee input = sample(null);
    Employee saved = sample(1L);

    when(repository.save(any(Employee.class))).thenReturn(saved);

    mockMvc
        .perform(
            post("/employees")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(input)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(1))
        .andExpect(jsonPath("$.email").value("taro@example.com"));
  }

  // ---------- ＜中略＞ ---------- //

  @Test
  @DisplayName("GET /employees/{id} - returns employee or 404")
  void get_by_id() throws Exception {
    when(repository.findById(1L)).thenReturn(Optional.of(sample(1L)));
    when(repository.findById(99L)).thenReturn(Optional.empty());

    mockMvc
        .perform(get("/employees/1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(1));
    mockMvc.perform(get("/employees/99")).andExpect(status().isNotFound());
  }

  // ---------- ＜後略＞ ---------- //

}
```

なお、エンティティクラスとリポジトリインタフェースは振る舞いを持たないため、これらのテストクラスは生成されなかったものと思われます。

Junieによって、テストクラスが生成された時点ですべてのテストが成功することは確認されています。
念のため、改めてテストを流してみましたが、このとおりすべてのテストが成功していますね。

![Test-03](https://i.gyazo.com/dcdf2ff9566a3367c2df3424b82d6cb5.png)

:::stop
テストクラスで使用している`MockBean`アノテーションは、Spring Boot 3.4.0以降で非推奨かつ廃止予定となっています。
その代わりにとして、`MockitoBean`アノテーションの使用が推奨されています。
:::

## 最後に

JetBrainsのJunieに関して、ここまでいかがでしたでしょうか。

筆者はまだJunieの一部の機能しか利用していませんが、とても便利に感じております。
普段の開発活動においてIntelliJ IDEAを利用している方はぜひ、Junieを導入してみて体感いただければと思います。
個人ライセンスでしたら月額 1,540円から利用できますので、お小遣いへの負担も少なくてすみますしね。

@[og](https://www.jetbrains.com/ja-jp/ai-ides/buy/?section=personal&billing=monthly)

今回は、JunieのCodeモードによるコード生成を試してみました。今後は、Askモードとの組み合わせや、Braveモードなども試していきたいと思います。
また、プロジェクトルートに`.junie/guidelines.md`を配置し、コーディング規約等を記述することで、これに準拠したコードの生成や編集も可能なようです。

これらにつきましても次回以降の記事で、投稿していきたいと考えています。

それでは最後までご覧いただき、本当にありがとうございました。
