---
title: ほんの少しだけOpenAPI Generatorを拡張してみません？
author: yasunori-shiota
date: 2024-08-08
tags: [openapi-generator, spring-boot, java, summer2024]
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2024-summer/
image: true
---

この記事は[夏のリレー連載2024](/events/season/2024-summer/) 9日目の記事です。

APIファーストな開発アプローチをとられている方は、「[OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator)」を用いてOpenAPIの定義ファイルからソースコードを自動生成されたことがあるかと思います。

このとき、自動生成されるソースコードにひと手間加えられたらいいのになぁ～と感じたことはありませんか。
たとえば、Spring BootでREST APIを構築するとき、自動生成されるソースコードに独自のカスタムバリデーションを埋め込んで、入力チェックが行えたらちょっとだけうれしかったりしますよね。

そこで今回は、OpenAPI Generatorをほんの少し拡張して、自動生成されるソースコードにカスタムバリデーションを適用する方法をご紹介したいと思います。

## REST APIの定義

まずは、OpenAPI仕様に準拠したREST APIの定義になります。
この時点では、OpenAPI Generatorの拡張が行われていないものとします。

```yaml:openapi.yaml
openapi: 3.0.3
info:
  title: 利用者サービスAPI仕様
  description: 利用者サービスのAPI仕様です。
  version: 1.0.0
servers:
  - url: http://localhost:8081
tags:
  - name: user
    description: 利用者サービスのインタフェースです。
paths:
  /users:
    post:
      tags:
        - user
      summary: 利用者登録
      description: 利用者を登録します。
      operationId: create-user
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserDto'
        required: true
        description: 登録対象の利用者です。
      responses:
        "201":
          description: 利用者が登録されました。
components:
  schemas:
    UserDto:
      description: 利用者DTO
      required:
        - name
        - age
        - postalCode
        - address
      type: object
      properties:
        id:
          type: integer
          format: int64
          description: 利用者のIDです。
        name:
          type: string
          description: 利用者の氏名です。
          maxLength: 50
        age:
          type: integer
          format: int32
          description: 利用者の年齢です。
          minimum: 20
        postalCode:
          type: string
          description: お住まいの郵便番号です。
          pattern: "[0-9]{7}"
        address:
          type: string
          description: 都道府県からの住所です。
          maxLength: 120
```

OpenAPI仕様について詳細までは説明しませんが、標準仕様でもプロパティごとに`maxLength`や`minimum`、`pattern`などを指定することで一定の入力チェックを行うことができますよね。

では次に、OpenAPI Generatorを用いて、REST APIの定義ファイルからソースコードを自動生成したいと思います。

## OpenAPI Generatorによる自動生成

ここでは、ソースコードの自動生成にOpenAPI GeneratorのGradleプラグイン「[OpenAPI Generator Gradle Plugin](https://github.com/OpenAPITools/openapi-generator/tree/master/modules/openapi-generator-gradle-plugin)」を利用させていただきます。
OpenAPI Generator Gradle Pluginを用いた`build.gradle`の記述は、次のとおりです。

```groovy:build.gradle
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.3.2'
    id 'io.spring.dependency-management' version '1.1.6'
    id 'org.openapi.generator' version '7.6.0'
}

openApiGenerate {
    generatorName = 'spring'
    inputSpec = "$rootDir/schema/openapi.yaml"
    apiPackage = 'com.mamezou.blog.service.adapter.restapi'
    modelPackage = 'com.mamezou.blog.service.adapter.restapi'
    configOptions = [
            interfaceOnly : 'true',
            useSpringBoot3: 'true',
            useTags       : 'true'
    ]
}

compileJava {
    dependsOn tasks.openApiGenerate
}
```

それでは、`gradle build`によって実際に自動生成された、REST APIのインタフェースとDTOのクラスを確認していきましょう。
といっても、すべてを確認する必要はないので、このあとカスタムバリデーションを適用する利用者DTOの郵便番号（`UserDto#postalCode`）を見てみましょうか。

```java:UserDto.java
@NotNull
@Pattern(regexp = "[0-9]{7}")
@Schema(
    name = "postalCode",
    description = "お住まいの郵便番号です。",
    requiredMode = Schema.RequiredMode.REQUIRED)
@JsonProperty("postalCode")
public String getPostalCode() {
  return postalCode;
}
```

このとおり、郵便番号にはOpenAPI定義で指定した正規表現のパターンが、制約アノテーションの`@Pattern`として付与されているのが見て取れますね。

ついでだから、自動生成されたREST APIのインタフェースも載せておきますね。

```java:UserApi.java
@Generated(
    value = "org.openapitools.codegen.languages.SpringCodegen",
    date = "2024-08-06T20:06:05.150384400+09:00[Asia/Tokyo]",
    comments = "Generator version: 7.6.0")
@Validated
@Tag(name = "user", description = "利用者サービスのインタフェースです。")
public interface UserApi {

  // ---------- ＜中略＞ ---------- //

  @Operation(
      operationId = "createUser",
      summary = "利用者登録",
      description = "利用者を登録します。",
      tags = {"user"},
      responses = {@ApiResponse(responseCode = "201", description = "利用者が登録されました。")})
  @RequestMapping(
      method = RequestMethod.POST,
      value = "/users",
      consumes = {"application/json"})
  default ResponseEntity<Void> createUser(
      @Parameter(name = "UserDto", description = "登録対象の利用者です。", required = true) @Valid @RequestBody
          UserDto userDto) {
    return new ResponseEntity<>(HttpStatus.NOT_IMPLEMENTED);
  }
}
```

## OpenAPI Generatorの拡張

すみません、前置きが長くなりました。
はい、ここから本題のOpenAPI Generatorの拡張について解説していきます。

OpenAPI Generatorの拡張にあたり、予め独自のカスタムバリデーションを準備しておきました。
これを使って、OpenAPI Generatorの拡張ならびにソースコードの自動生成を見ていきたいと思います。

- **郵便番号チェック（ハイフンなし）**

| 要素 | 説明 |
| :--- | :--- |
| パッケージ | com.mamezou.blog.validation.constraints |
| 制約アノテーション | @PostalCode |
| チェック内容 | 7桁の半角数字であることをチェックする。 |
| エラーメッセージ | 郵便番号は半角数字7桁で指定してください。 |

### OpenAPI Generatorのテンプレートをダウンロード

これまでOpenAPI Generatorの拡張と言ってきましたが、OpenAPI Generatorのテンプレート（mustache）をほんの少し編集するだけで、自動生成されるソースコードに独自のカスタムバリデーションを適用することが可能となります。

まずは、OpenAPI GeneratorのGitHubから、テンプレートファイルをダウンロードしてください。
筆者が利用しているOpenAPI Generatorのバージョンは`7.6.0`ですので、次の場所からテンプレートファイルをダウンロードしました。

- [openapi-generator:v7.6.0 - JavaSpring](https://github.com/OpenAPITools/openapi-generator/tree/v7.6.0/modules/openapi-generator/src/main/resources/JavaSpring)

なお、ダウンロードするテンプレートファイルは、次の2つのファイルとなります。

- [model.mustache](https://github.com/OpenAPITools/openapi-generator/blob/v7.6.0/modules/openapi-generator/src/main/resources/JavaSpring/model.mustache)
- [pojo.mustache](https://github.com/OpenAPITools/openapi-generator/blob/v7.6.0/modules/openapi-generator/src/main/resources/JavaSpring/pojo.mustache)

ダウンロードできたら、プロジェクト直下に`template/JavaSpring`というディレクトリを作成して、ここにテンプレートファイルを格納しておいてください。

### テンプレートファイルの編集

それでは、ダウンロードしたテンプレートファイルを編集していきます。

まずはじめに`model.mustache`を開いて、`useBeanValidation`の個所にカスタムバリデーション（制約アノテーション）が含まれるパッケージのimport文を追加してください。
あとから制約アノテーションが追加されてもテンプレートファイルの編集をしなくて済むように、ここでのimport文はワイルドカードとしています。

```mustache:model.mustache
・・・・・
{{#useBeanValidation}}
import {{javaxPackage}}.validation.Valid;
import {{javaxPackage}}.validation.constraints.*;
{{! ---------- カスタムバリデーションのパッケージのimport文 ---------- }}
import com.mamezou.blog.validation.constraints.*;
{{/useBeanValidation}}
・・・・・
```

次は`pojo.mustache`を開いて、OpenAPI拡張の`vendorExtensions`に`x-constraints`というカスタムプロパティを定義します。
OpenAPIの定義ファイルでは、この`x-constraints`にカスタムバリデーションを指定します。

```mustache:pojo.mustache
・・・・・
{{#vendorExtensions.x-extra-annotation}}
{{{vendorExtensions.x-extra-annotation}}}
{{/vendorExtensions.x-extra-annotation}}
{{! ---------- カスタムバリデーションを指定するカスタムプロパティ ---------- }}
{{#vendorExtensions.x-constraints}}@{{{.}}} {{/vendorExtensions.x-constraints}}
・・・・・
```

テンプレートファイルの編集、つまりOpenAPI Generatorの拡張は以上となります。

カスタムバリデーションに限定して言えば、編集するのはこの2つのファイルだけです。
しかも、それぞれ1行追加しただけですので、拡張そのものは比較的容易に行えたと考えてもよいですよね。

## 拡張後のソースコード生成

REST APIの定義ファイルの利用者DTOに、郵便番号のプロパティがあったかと思います。
ここに、カスタムバリデーションを適用してみます。

拡張前は`pattern`で郵便番号の形式を指定していましたが、この箇所をカスタムプロパティの`x-constraints`に置き換えます。
そして、郵便番号チェックの制約アノテーションをシーケンス（配列）として指定します。

なお、シーケンスとして記述できるため、複数の制約アノテーションの指定も可能です。

```diff-yaml:openapi.yaml
components:
  schemas:
    UserDto:
      description: 利用者DTO
        # ---------- ＜中略＞ ---------- #
        postalCode:
          type: string
          description: お住まいの郵便番号です。
-         pattern: "[0-9]{7}"
+         x-constraints:
+           - PostalCode
```

REST APIの定義ファイルの変更はこれで終了です。

次に、OpenAPI Generatorからソースコードを自動生成する際、先ほど編集を加えたテンプレートファイルが使用されるように`build.gradle`を変更します。
`openApiGenerate`タスクの`templateDir`に、テンプレートファイルが格納されたディレクトリのパスを指定します。

```diff-groovy:build.gradle
openApiGenerate {
    generatorName = 'spring'
    inputSpec = "$rootDir/schema/openapi.yaml"
+   templateDir = "$rootDir/template/JavaSpring"
    apiPackage = 'com.mamezou.blog.service.adapter.restapi'
    modelPackage = 'com.mamezou.blog.service.adapter.restapi'
    configOptions = [
            interfaceOnly : 'true',
            useSpringBoot3: 'true',
            useTags       : 'true'
    ]
}
```

`build.gradle`を変更したら、`gradle`コマンドで`build`タスクを実行します。

OpenAPI Generatorの拡張後に生成した利用者DTOを見てみると、このとおり郵便番号の制約アノテーションが`@Pattern`から`@PostalCode`に置き換わりましたね。
また、`model.mustache`の編集によってimport宣言も出力されていますので、自動生成されたソースコードでビルドエラーが発生することもありません。

```diff-java:UserDto.java
import com.mamezou.blog.validation.constraints.*;

// ---------- ＜中略＞ ---------- //

  @NotNull
- @Pattern(regexp = "[0-9]{7}")
+ @PostalCode
  @Schema(
      name = "postalCode",
      description = "お住まいの郵便番号です。",
      requiredMode = Schema.RequiredMode.REQUIRED)
  @JsonProperty("postalCode")
  public String getPostalCode() {
    return postalCode;
  }
```

## 動作確認

ここまでできたので、簡単に動作確認もしておきましょうか。

Visual Studio Codeの拡張機能「[REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)」を使って、利用者登録のエンドポイントにリクエストを送信したいと思います。

```bash
POST http://localhost:8081/users HTTP/1.1
content-type: application/json

{
    "name": "豆田蔵之介",
    "age": 48,
    "postalCode": "163-0434",
    "address": "東京都新宿区西新宿2-1-1"
}
```

ハイフンを含む郵便番号を指定したときには、期待どおり`400 Bad Request`のHTTPステータスコードが返却されました。
エラーメッセージには、「郵便番号は半角数字7桁で指定してください。」と出力されていました。

これで、REST APIの定義ファイルから自動生成したソースコードにカスタムバリデーションが適用され、正しく入力チェックが行われたことも確認できましたね。

## 最後に

例示のコードが多かったため、少し長くなってしまいました。

郵便番号の形式チェック程度ですと、ありがたみが薄れてしまったかもしれませんね。
しかし、これが文字種に応じた許容文字のチェックであったり、特殊な番号体系を持つ項目のケースでは、OpenAPI Generatorの拡張によってカスタムバリデーションが適用できるのは有効な手段と筆者は考えます。

それなら素のSpring MVCでREST APIを実装したほうがいいんじゃね？というのは一旦置いときまして、OpenAPI Generatorのテンプレートファイルをほんの少し編集するだけでこのような拡張が行えるのは便利ですよね。

最後までご覧いただき、ありがとうございました。
