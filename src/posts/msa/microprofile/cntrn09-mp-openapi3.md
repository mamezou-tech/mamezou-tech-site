---
title: 第9回 MicroProfile OpenAPI 3.0の新機能と既存機能の比較
author: toshio-ogiwara
date: 2022-09-16
tags: ["逆張りのMicroProfile"]
prevPage: ./src/posts/msa/microprofile/cntrn08-mp-config3.md
nextPage: ./src/posts/msa/microprofile/cntrn10-mp-health.md
---

Helidon 3.0からMicroprofile OpenAPI 3.0(MP OpenAPI 3.0)が使えるようになりました。今回はMP OpenAPI 2.0からMP OpenAPI 3.0までに取り入れられた新機能を紹介します。今回紹介する新機能はそれほど多くなく、それだけでは少し寂しいため、新機能と既存機能の比較として[第5回 コードが仕様の源泉MicroProfile OpenAPI](/msa/mp/cntrn05-mp-openapi/)で紹介できなかった便利な機能も併せて紹介します。

記事はコードの抜粋を記載します。全体を見たい場合や動作を確認したい場合は以下のGitHubリポジトリを参照ください。
- <https://github.com/extact-io/contrarian-microprofile-sample/tree/main/06-openapi_3.0>

MicroProfileをテーマにブログを連載しています。他の記事もよければ以下のリンクからどうぞ！
- [逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)


[[TOC]]

:::info
この記事はJava17+Helidon 3.0.1 + MicroProfile OpenAPI 3.0.1をもとに作成しています。
MicroProfile OpenAPIの詳細は[公式マニュアル](https://download.eclipse.org/microprofile/microprofile-open-api-3.0/microprofile-openapi-spec-3.0.html)を参照くだい。
:::

# 紹介する新機能
MP OpenAPI 1.1から3.0までに取り入れられた機能は次の3つとなります。
1. 特定クラスに対するスキーマ[^1]指定
2. @SchemaPropertyの導入
3. @RequestBodySchema/@APIResponseSchemaの導入

1.の特定クラスに対するスキーマ指定は待ってました！というくらい個人的に気にいっている機能です。お気に入り機能ということもありますが、その便利さを理解してもらう意味も含め、今回は同様なことを以前のバージョンでやったら？としてまだ紹介していない既存機能も紹介します。

2.と3.のアノテーションの導入機能は実際のそれほど使いどころがあるかな？という感じの小規模なもののため、こちらは例を簡単に紹介する程度となります。

[^1]: OpenAPIではスキーマ/Schemaの単語がよく出てきますが、OpenAPIのコンテキストにおけるスキーマ/Schemaは”データ構造”として捉えると理解しやすくなります。

:::column:MP OpenAPIのバージョンと主な変更点
執筆時点の最新メジャーバージョンのHelidon 3.0はMicroProfile 4.0対応を飛ばして一気にMicroProfile 5.0へジャンプアップした形となります。このためMP OpenAPIのバージョンの動きと対応関係が掴みづらくなっていますが、整理すると次のようになります。

- MP OpenAPI 3.0
  - MicroProfile 5.0で取り込まれたバージョン。Helidonでは3.0で対応
  - Jakarta EE 9.1に対応し依存パッケージがjavax.*からjakarta.*に変更となった。機能自体はMP OpenAPI 2.0と同じ
- MP OpenAPI 2.0
  - MicroProfile 4.0で取り込まれたバージョン
  - 今回紹介する3つの機能や互換性のないAPIの変更など大きな変更が加えられた
- MP OpenAPI 1.1
  - MicroProfile 2.2で取り込まれたバージョン。Helidonは1.xから対応
  - 小規模な変更がいくつか加えられた
:::

# 特定クラスに対するスキーマ指定
この機能を説明する前に、この機能が登場した背景を少し説明したいと思います。

MP OpenAPIランタイムはJavaのデータクラスのclass情報をスキャンし、自動でOpenAPIドキュメントのスキーマ情報を生成します。この際、データクラスのフィールドがjava.lang.StringであればOASのデータ型のstringへといったように、MP OpenAPIランタイムはOpenAPI Specification(OAS)で定義されているデータ型[^2]と対応するJava型との対応については、特に何も宣言することなく、デフォルトでマッピングを行ってくれます。

これは非常に便利なのですがOASには日時に関するデータ型が定義されていません。このためLocalDateやLocalDateTimeなど日時に関する型はjava.nio.Pathやjava.sql.Connectionなどその他大勢のクラスと同じようにOASのobject型に割り当てられるのが不便でした。

また、LocalDateなど日時に関する型はStringやintなどと同じように業務アプリケーションではよく利用する型で、かつ文字列にしたときのフォーマットに対する説明が必要となります。しかし、MP OpenAPI 1.1ではLocalDateなど任意の型をStringやintなどと同様にMP OpenAPIランタイムの既定としてマッピングを行わせるような共通的な仕組みがありませんでした。

そこでMP OpenAPI 2.0で導入されたのが、特定クラスに対するスキーマ指定の機能です。この機能を使うことでLocalDateなどの任意の型に対するスキーマ情報を共通的に定義することができます。

今回はLocalDateに対するスキーマを指定する例を説明していきます。また、MP OpenAPI 1.1ではできなかったといいましたが、共通的な仕組みが全くできなかった訳ではありません。機能の比較として同様なことをMP OpenAPI 1.1以前の機能で行う例も紹介してみたいと思います。

[^2]: string, number, integer, boolean, array, objectの6種類。詳細は[OpenAPI Guide/Data Types](https://swagger.io/docs/specification/data-models/data-types/)を参照


## 特定クラスに対するスキーマ指定の利用法
LocalDateに対するスキーマ指定を行う前に、その効果が分かるようにLocalDateに対して何も指定しなかった場合の動きを確認してみましょう。

第5回 コードが仕様の源泉MicroProfile OpenAPIの説明で利用した [Personサンプル](/msa/mp/cntrn05-mp-openapi/#サンプルアプリと動作方法)ではPersonのフィールドとしてint型で年齢(age)を持っていましたが、これを次のようにLocalDateの誕生日(birthday)フィールドに変更したものを使って説明してきます。

-	Personクラス
```java
@Schema(description = "Person情報")
public class Person {
    @Schema(description = "インスタンスID", implementation = Long.class, minimum = "0", maximum = "9999999")
    private Long id;
    @Schema(description = "名前", required = true,  minLength = 1, maxLength = 10)
    private String name;
    // ↓↓↓ 今回の説明の中心となるフィールド
    private LocalDate birthday;
}
```

このクラス定義を入力としてMP OpenAPIから出力されるOpenAPIドキュメントのスキーマ情報は次のようになります(一部分かりやすいようにコメントを追加しています)

```yaml
components:
  schemas:
    Person:
      required:
      - name
      properties:
        birthday: # ← 注目する部分
          format: date
          type: string
        id:
          description: インスタンスID
          format: int64
          maximum: 9999999
          minimum: 0
          type: integer
        name:
          description: 名前
          maxLength: 10
          minLength: 1
          type: string
      description: Person情報
      type: object
    ...
```

LocalDateもその他大勢のクラスと同じようにといいましたが、1つだけ違うところがあります、それはformatです。OASには日時に関する型の定義はありませんが、[RFC3339](https://www.rfc-editor.org/rfc/rfc3339)（2017-07-21のようにゼロパティングありのハイフン区切り）形式のフォーマットパターンが`date`として用意されています。

MP OpenAPIランタイムはLocalDateなどの日付に関する型はOASのobjectとして認識しますがformatについては`date`を割りあててくれます。ですので、アプリが扱う日付のフォーマットがRFC3339形式でよければ実用的にはなんら問題とならないかも知れません。

しかし、日付のフィーマットは外部システムの要件として規定され受け入れざる得ない場合もあり、RFC3339形式だけで押し通すのは無理な場合があります。そこで登場するのが特定クラスに対するスキーマ指定です。

ということで、やっとここから本題です。ここからは特定クラスに対するスキーマ指定を使ってLocalDateに対するフォーマットを一律にハイフンなしの`yyyyMMdd`とする例を見ていきます。

特定クラスに対するスキーマ指定は`mp.openapi.schema.<指定するクラスのFQCN>`をキーに、マッピングしたいスキーマ定義を次のようにJSON形式で設定ファイルに定義します。

-	META-INF/microprofile-config.properties[^3]
```shell
mp.openapi.schema.java.time.LocalDate = { \
      "name": "LocalDate", \
      "description": "app date format(type)", \
      "example": "20220904", \
      "format": "yyyyMMdd", \
      "type": "string" \
    }
```

[^3]: プロパティファイルのため改行箇所には`\`(バックスラッシュ)が必要となります。また、全角文字を含める場合はnative2asciiが必要となります。

この設定を行った上で先ほどと同じPersonクラスを入力としてMP OpenAPIから出力されたOpenAPIドキュメントのスキーマ情報を見ると次のようになっています。

```yaml
components:
  schemas:
    LocalDate:
      description: app date format(type)
      example: '20220904'
      format: yyyyMMdd
      type: string
    Person:
      required:
      - name
      properties:
        birthday:
          $ref: '#/components/schemas/LocalDate'
        ...
```

設定を追加しただけで、Personクラスはなにも変えていません。今回の例はLocalDateのフィールドが1つしか登場しませんが、`mp.openapi.schema`で指定したクラスはMP OpenAPIランタイムの全体レベルで認識されるため、特定クラスに対するスキーマ指定を使うことで、特定のクラスに対するアプリ全体のルールを設定ファイルに局所化することができます。

# MP OpenAPI 1.1以前からあった共通化の仕組み
MP OpenAPI 2.0からの新機能として特定クラスに対するスキーマ指定を見てきましたが、ここからは以前からあった機能を使ってLocalDateに対するスキーマ定義を共通化するやり方を見ていきます。

MP OpenAPI 1.1以前にもOAS情報を共通化する仕組みとして次の３つがありました。
- @OpenAPIDefinitionによる共通項目の定義
- OASFactoryを使ったプログラムによるOAS情報の定義
- OpenAPIドキュメントによる共通項目の定義

OASでは共通的な項目を`components`プロパティで定義するため、上記の３つは、つまるところ下記の`components`プロパティに対する定義方法の違いとなります。

```yaml
components:
  schemas:
    LocalDate:
      description: app date format(...)
      example: '20220904'
      format: yyyyMMdd
      type: string
    ...
```

それでは3つの共通化の仕組みを見ていきます。なお、今回は例としてスキーマ情報を共通化しているだけで、この3つの機能はスキーマ情報だけでなくOASの他の要素も共通化することができます。

## @OpenAPIDefinitionによる共通項目の定義
[第5回 コードが仕様の源泉MicroProfile OpenAPIのアプリケーション情報を定義してみよう！](/msa/mp/cntrn05-mp-openapi/#アプリケーション情報を定義してみよう！)でアプリケーション情報を定義するアノテーションとして`@OpenAPIDefinition`を紹介しましたが、このアノテーションはアプリケーション情報だけではなく、共通的なスキーマ情報やレスポンス情報も定義することができます。

では、実際の定義例を見てみます。
-	PersonApplicationクラス
```java
@OpenAPIDefinition(
    info = @Info(
        title = "MicroProfile OpneAPI Sample",
        ...
    components = @Components(
        schemas = {
            @Schema( // LocalDateに対するスキーマ定義
                name = "LocalDate",
                description = "app date format(annotation)",
                example = "20210314",
                format = "yyyyMMdd",
                implementation = String.class)}))
@ApplicationScoped
@ApplicationPath("api")
public class PersonApplication extends Application {
    ...
}
```
-	Personクラス
```java
@Schema(description = "Person情報")
public class Person {
    @Schema(description = "インスタンスID", implementation = Long.class, minimum = "0", maximum = "9999999")
    private Long id;
    @Schema(description = "名前", required = true,  minLength = 1, maxLength = 10)
    private String name;
    // ↓↓↓ @Schemaのref属性で@OpenAPIDefinitionのLocalDateスキーマを参照
    @Schema(required = true, ref = "#/components/schemas/LocalDate")
    private LocalDate birthday;
}
```

1.	`@OpenAPIDefinition`に`components`属性を追加し`@Schema`でLocalDateのスキーマ情報を定義します。`components`属性配下のアノテーションや属性はOASで定義されている`components`プロパティと対応するものが用意されています。ですので、最終的に出力させたいOpenAPIドキュメントを浮かべながらIDEの入力補完機能を使って行けばそれほど苦もなく定義することができます。
2.	`LocalDate`フィールドのスキーマ情報として`@Schema`で`@OpenAPIDefinition`に定義したLocalDateのスキーマ(`#/components/schemas/LocalDate`)を参照するようにします。この時の参照するスキーマ名は`@Schema`の`name`属性の値(LocalDate)となります。

このクラス定義を入力として出力されるOpenAPIドキュメントは次のとおりです。
```yaml
components:
  schemas:
    LocalDate:
      description: app date format(annotation)
      example: 20210314
      format: yyyyMMdd
      type: string
    Person:
      required:
      - birthday
      - name
      properties:
        birthday:
          $ref: '#/components/schemas/LocalDate'
      ...
```

このように`@OpenAPIDefinition`の`@Schema`でスキーマ情報を定義し、それぞれ必要なところから`ref`で参照することで、REST APIで複数出現するクラスのスキーマ情報を1元化して共通的に扱うことができます。

## OASFactoryを使ったプログラムによるOAS情報の定義
今度は同じことをMP OpenAPIのOASFactoryを使ってプログラムで定義してみます。OASFactoryはMP OpenAPIのアノテーション要素に対するファクトリーメソッドがそれぞれ定義されており、アノテーションで定義したOAS定義と同様なことをプログラムで定義することができます。

それではOASFactoryを使ってLocalDateのスキーマ情報を定義した例を見ていきましょう。OAS定義をプログラムで行う場合はMP OpenAPIで定義されているOASModelReaderインタフェースを次のように実装します。

```java
public class LocalDateApiModelReader implements OASModelReader {
    @Override
    public OpenAPI buildModel() {
        Components components = OASFactory.createComponents()
                .addSchema("LocalDate", OASFactory.createSchema()
                        .description("日付型フォーマット(ModelReader)")
                        .example("20220904")
                        .format("yyyyMMdd")
                        .type(SchemaType.STRING));
        OpenAPI openAPI = OASFactory.createOpenAPI();
        openAPI.components(components);
        return openAPI;
    }
}
```

OASFactory配下のファクトリーメソッドはMP OpenAPIのアノテーションやOASのプロパティと対称性が取れた分かりやすいAPIとなっているため、コード例からおおよその内容は推測が付くかと思われるため、詳細の説明は[APIドキュメント](https://javadoc.io/doc/org.eclipse.microprofile.openapi/microprofile-openapi-api/3.0/index.html)を参照として割愛しますが、やっていることは先ほどのアノテーションの例とまったく同じです（比較しやすいように以下に再掲します）

-	PersonApplicationクラス（再掲）
```java
@OpenAPIDefinition(
    info = @Info(
        title = "MicroProfile OpneAPI Sample",
        ...
    components = @Components(
        schemas = {
            @Schema(
                name = "LocalDate",
                description = "app date format(annotation)",
                example = "20210314",
                format = "yyyyMMdd",
                implementation = String.class)}))
@ApplicationScoped
@ApplicationPath("api")
public class PersonApplication extends Application {
    ...
}
```

動作させる際はOASModelReaderの実装クラスをMP OpenAPIランタイムに認識させる必要があるため、設定ファイルに` mp.openapi.model.reader`で実装クラスのFQCNを登録します。

- META-INF/microprofile-config.properties
```shell
mp.openapi.model.reader = io.extact.mp.sample.openapi3.reader.LocalDateApiModelReader
```

@OpenAPIDefinitionによる定義とOASFactoryによる定義でできることは同じですが、前者はソースコードにアノテーションを指定するスタイルのため、アプリを跨っての参照、つまり共通化はできません。

一方、OASFactoryはクラス定義のため、OASModelReaderインタフェースを実装したクラスを他のアプリから参照することで、アプリを跨ってのOAS情報の共通化が可能となります。したがって、できることは同じですが、利用可能な範囲は異なります。

## OpenAPIドキュメントによる共通項目の定義
OASを定義する仕組みとしてここまではMP OpenAPIに固有なものを使ってきましたが、最後に紹介するこの仕組みはOpenAPIドキュメントの断片を使って共通的な要素を定義するものとなります。

今まで見てきたLocalDateのスキーマ情報はいずれもOpenAPIドキュメントとしては次のとおりに出力されます。（出力元を識別するために意図的に付けているdescriptionの括弧の部分は除きます）

```yaml
components:
  schemas:
    LocalDate:
      description: app date format(yaml)
      example: '20220904'
      format: yyyyMMdd
      type: string
```
MP OpenAPIでは`META-INF/openapi.yaml`（もしくは`openapi.yml`） にOpenAPIドキュメントを配置するとそのOpenAPIドキュメントの内容とMP OpenAPIから出力された内容をマージ／統合してくれます。

このOpenAPIドキュメントを使った仕組みもできることは今まで見てきたものと同じですが、OpenAPIドキュメントを使った仕組みはその元ネタのOpenAPIドキュメントがMP OpenAPIにもJavaにも依存せず実装に中立なモノとなります。このため実装が異なったアプリを跨って共通化を行える余地があるのが他との違いとなります。

## 共通化手段の使い分け
MP OpenAPI 2.0で導入された新機能から既存の機能まで4つの異なった共通化の仕組みを見てきました。

[特定クラスに対するスキーマ指定](#特定クラスに対するスキーマ指定の利用法)で共通化できる要素はスキーマ情報だけですが、特定のクラスをStringやintなどの組み込み型と同じように扱えるようになる点が非常に強力です。また既存の3つの機能はいずれもできることは同じですが、定義した情報の利用範囲に違いがあります。

このようにMP OpenAPIでは共通化の手段が複数用意され、共通化するものの特性に応じて手段を選択することができるようになっています。

特定クラスに対するスキーマ指定の機能から始まった共通化のお話は終わりにして次からはMP OpenAPI 2.0から導入された他の2つの機能を紹介していきます。

# @SchemaPropertyの導入
MP OpenAPIはJavaのclass情報から自動的にスキーマ情報を生成しますが、クラス定義がないデータに対してはスキーマ情報を定義することができませんでした。例えばMapのフィールドがあった場合、そのMapに格納されるキー名や値の説明を直接的に定義することはできませんでした。

このような課題に対して導入されたのが`@SchemaProperty`となります。ここまで例に使っていたPersonクラスに汎用的な情報を格納する項目としてMapのフィールドを追加し、そのMapにはニックネームと職位が格納されることを期待したスキーマ定義を`@SchemaProperty`を使って行うと次のようになります。

```java
@Schema(description = "Person情報")
public class Person {
    @With
    @Schema(description = "インスタンスID", implementation = Long.class, minimum = "0", maximum = "9999999")
    private Long id;
    @Schema(description = "名前", required = true,  minLength = 1, maxLength = 10)
    private String name;
    @Schema(required = true, ref = "#/components/schemas/LocalDate")
    private LocalDate birthday;
    // ↓↓↓ 追加したMapフィールド 
    @Schema(properties = {
            @SchemaProperty(name = "nickname", description = "あだ名"),
            @SchemaProperty(name = "rank", description = "職位")
    }, implementation = Object.class)
    private Map<String, String> optins;
}
```

今まではデータクラスがなければスキーマ情報を定義することができませんでしたが、`@SchemaProperty`が導入されたことにより、クラス定義がなくても`@SchemaProperty`を使ってインラインでスキーマ情報を定義できるようになりました。

# @RequestBodySchema/@APIResponseSchemaの導入
この仕組みも先ほど紹介した`@SchemaProperty`と同じようにデータ構造を表す明示的に示すために導入されたものです。`@SchemaProperty`との違いは定義したいスキーマ情報に対するクラス定義はあるが、それがREST APIのメソッド定義に表れない点となります。

この具体的な例としては次のようなもの[^4]があります。
[^4]: [RequestBodySchema](https://javadoc.io/static/org.eclipse.microprofile.openapi/microprofile-openapi-api/3.0/org/eclipse/microprofile/openapi/annotations/parameters/RequestBodySchema.html)と[APIResponseSchema](https://javadoc.io/static/org.eclipse.microprofile.openapi/microprofile-openapi-api/3.0/org/eclipse/microprofile/openapi/annotations/responses/APIResponseSchema.html)のJavadocサンプルを例にしています。

- Requestの例
```java
@PUT
@Path("{id}")
@RequestBody(content = { @Content(schema = @Schema(implementation = MyRequestObject.class)) })
public Response updateItem(@PathParam("{id}") long id, InputStream rawData) {
    MyRequestObject entity = service.deserialize(rawData);
    service.persist(entity);
    return Response.status(204).build();
}
```
- Responseの例
```java
@GET
@Path("{id}")
@APIResponse(content = { @Content(schema = @Schema(implementation = MyResponseObject.class)) })
public Response getById(@PathParam("{id}") long id) {
     MyResponseObject entity = service.load(id);
     return Response.status(200).entity(entity).build();
}
```

どちらもREST APIのメソッドにInputoStremやResponseといった汎用的なクラスを使っているため、リクエストボディやレスポンスボディに格納されるデータに対するデータクラスがメソッド定義に現れません。このためスキーマ情報を明示する場合は上の例のように冗長なアノテーションの定義が必要でした。

これをMP OpenAPI 2.0から導入された`@RequestBodySchema`/`@APIResponseSchema`を使うことで次のように簡潔に定義することができます。

- Requestの例
```java
@PUT
@Path("{id}")
@RequestBodySchema(MyRequestObject.class) // ← 簡潔になった定義
public Response updateItem(@PathParam("{id}") long id, InputStream rawData) {
    MyRequestObject entity = service.deserialize(rawData);
    service.persist(entity);
    return Response.status(204).build();
}
```
- Responseの例
```java
@GET
@Path("{id}")
@APIResponseSchema(MyResponseObject.class) // ← 簡潔になった定義
public Response getById(@PathParam("{id}") long id) {
     MyResponseObject entity = service.load(id);
     return Response.status(200).entity(entity).build();
}
```

やりたいことは同じですが、`@RequestBodySchema`/`@APIResponseSchema`を使うことでグッと簡潔に記述できるようになりました。

# まとめ
MP OpenAPIは1.1の時から十分に便利で使い勝手のよい仕様でしたが、2.0で今回紹介した痒いところも手が届くような機能が追加され、より一層使い勝手がよくなりました。

OpenAPIドキュメントはプレーンなテキストファイルのため、それ自体で共通化を行うことが難しいですが、MP OpenAPIの元ネタはプログラムのため、効率よくかつ厳格に共通化を行うことができます。

OpenAPIの定義はSwaggerUIなどのツールを使ったスキーマファーストのアプローチが知られていますが、MP OpenAPIを使ったソースコードを起点としたボトムアップアプローチも検討してみてはいかがでしょうか。
