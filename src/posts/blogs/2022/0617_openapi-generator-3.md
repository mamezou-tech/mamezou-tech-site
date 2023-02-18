---
title: 第3回 OpenAPI Generator 利用時の Generation Gap パターンの適用
author: shigeki-shoji
date: 2022-06-17
tags: [java, "openapi-generator", "spring-boot", "実践マイクロサービス"]
---

[庄司](https://github.com/edward-mamezou)です。

[前回](/blogs/2022/06/09/openapi-generator-2/)はドメイン駆動設計の話題を中心に説明しました。

今回は [OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator) の使い方について説明します。

説明する OpenAPI Generator のバージョンは 6.0.0 です。

OpenAPI Generator はさまざまな言語とフレームワークに対応したクライアントサイド、サーバーサイドのコードを生成します。OpenAPI Generator 自体の実行は Java を使います。OpenAPI Generator には [Maven Plugin](https://github.com/OpenAPITools/openapi-generator/tree/master/modules/openapi-generator-maven-plugin)、[Gradle Plugin](https://github.com/OpenAPITools/openapi-generator/tree/master/modules/openapi-generator-gradle-plugin) 等もあります。Java のコードを生成したい場合はこれらを使用するのもよいでしょう。

ただ、次のいくつかの理由からこのシリーズの記事では [CLI](https://search.maven.org/artifact/org.openapitools/openapi-generator-cli) を選択しています。

- Java 以外のコード生成の可能性。
- サーバーサイドとクライアントサイドのコード生成の可能性。
- OpenAPI Generator のバージョンアップ対応の簡素化。
- Generation Gap パターンの適用の簡素化。

:::info
OpenAPI Generator を使ったコード生成プロジェクトで、私はコンテナイメージを使う自動ビルドを使用することが多いです。この場合、OpenAPI Generator を使ってコードを生成するフェーズでは Java の実行が可能なコンテナイメージを使い、生成されたそれぞれのコードのビルド、デプロイにはそれぞれ別のコンテナイメージを使用することになります。例えば、Spring Boot のサーバーサイドのコードのビルド、デプロイであれば Maven の実行が可能なコンテナイメージで、TypeScript のクライアントコードのビルド、デプロイであれば Node.js の実行が可能なコンテナイメージとなります。
:::

OpenAPI Generator には Node.js を使う別の [CLI](https://github.com/OpenAPITools/openapi-generator-cli) もあります。これを使うと OpenAPI Generator のバージョンアップへの対応を容易になりそうですが、詳細は別の機会にします。

前回までの記事で、Generation Gap パターンの適用について説明しました。この記事では Generation Gap パターンと OpenAPI Generator の使用方法との関連について説明します。

## Generation Gap パターンを適用できない生成例

前回までの記事で、application モジュールの生成パラメータに [application.yaml](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.3.0/application.yaml) を使っていました。生成時 -DsupportingFiles を設定していましたが、次のようにこの設定なしで生成してみます。

```shell
java -jar /tmp/openapi-generator-cli.jar batch application.yaml
```

生成したコードは次の手順で実行できます。

```shell
mvn spring-boot:run
```

生成されたコードを実行するだけで `http://localhost:8080/example/hello` にアクセスして `Hello World` のレスポンスが得られます。

このレスポンスは [openapi.yml](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.3.0/openapi.yml) の `example` に設定された値です。

ここから、実際のアプリケーションを構築するためには、生成された `ExampleApiController` クラスのコードに手を入れる必要があります。

次のコードに `ExampleApi` インターフェースで定義された `ResponseEntity<Hello> helloGet()`　メソッドを定義します。

```java
package com.mamezou_tech.example.controller.api;

import com.mamezou_tech.example.controller.model.Hello;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.context.request.NativeWebRequest;

import javax.validation.constraints.*;
import javax.validation.Valid;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import javax.annotation.Generated;

@Generated(value = "org.openapitools.codegen.languages.SpringCodegen", date = "2022-06-17T06:24:23.027223+09:00[Asia/Tokyo]")
@Controller
@RequestMapping("${openapi.exampleService.base-path:/example}")
public class ExampleApiController implements ExampleApi {

    private final NativeWebRequest request;

    @Autowired
    public ExampleApiController(NativeWebRequest request) {
        this.request = request;
    }

    @Override
    public Optional<NativeWebRequest> getRequest() {
        return Optional.ofNullable(request);
    }

}
```

API 定義 (openapi.yml) に変更があった場合等で、再び OpenAPI Generator によるコード生成を実行すると実装したメソッド定義が失われます。

[Generation Gap](https://martinfowler.com/dslCatalog/generationGap.html) パターンは正にこの課題を説明しています。

> Separate generated code from non-generated code by inheritance.
> 
> 生成されるコードと生成しないコードを継承によって分離せよ。

## Generation Gap パターンが適用可能な生成の例

前回までの記事で使用していない別の例を示します。

[application.yaml](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.3.0/application.yaml) の最後に以下を追記してコード生成します。

```yaml
  delegatePattern: true
```

生成されたコードには、`ExampleApiController` クラスから呼び出される `ExampleApiDelegate` インターフェースが生成されていることがわかります。

したがって、`ExampleApiDelegate` インターフェースを `implements` するクラスを作成することで、コードを再生成してもハンドライティングした実装が失われることはありません。

委譲による Generation Gap パターンの適用については、参考にも挙げている「[OpenAPI Generatorを使ったコードの自動生成とインタフェースの守り方](https://zenn.dev/angelica/articles/3b7ac906f73638)」を参照してください。

## Generation Gap パターンが適用可能な生成のもう一つの例

「[OpenAPI Generatorを使ったコードの自動生成とインタフェースの守り方](https://zenn.dev/angelica/articles/3b7ac906f73638)」にも書かれていますが、この一連の記事では、`interfaceOnly=true` を使って Generation Gap パターンを適用しています。

このパラメータが設定されているファイルは [controller.yaml](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.3.0/controller.yaml#L15) です。

```shell
java -jar /tmp/openapi-generator-cli.jar batch controller.yaml
```

`interfaceOnly=true` で生成すると、API のインターフェースとリクエストやレスポンスで使用するモデル等最小限のコードしか生成されません。つまり、これで生成されたコードをビルドしても Spring Boot アプリケーションとして実行できません。

そこで、記事では Spring Boot アプリケーションとして実行に必要となるインターフェースやクラスを生成するために、-DsupportingFiles を設定して application モジュールを生成していました。

## Spring Boot 実行可能 jar の構成

Spring Boot アプリケーションを [Spring Boot Maven Plugin](https://docs.spring.io/spring-boot/docs/current/maven-plugin/reference/htmlsingle/)、[Spring Boot Gradle Plugin](https://docs.spring.io/spring-boot/docs/current/gradle-plugin/reference/htmlsingle/) でパッケージングすると実行可能 jar になります。

OpenAPI Generator を使って生成される application モジュールでは Spring Boot Maven Plugin を使用する `pom.xml` ファイルとなっているため、`mvn install` や `mvn deploy` で登録されるパッケージは実行可能 jar です。

実行可能 jar は通常のライブラリで使用する jar ファイルの構成と異なります。

```text
├── BOOT-INF
│   ├── classes
│   │   ├── application.properties
│   │   └── com
│   │       └── mamezou_tech
│   │           └── example
│   │               └── controller
│   └── lib
├── META-INF
└── org
    └── springframework
        └── boot
            └── loader
```

application モジュールのコードをコンパイルした `.class` ファイル等は `BOOT-INF/classes` に配置されます。また、依存するライブラリ等のファイルは `BOOT-INF/lib` に配置されます。

通常のライブラリ等の jar ファイルで `.class` ファイル等が配置されるトップレベルには Spring Boot アプリケーションを起動するためのファイルが配置されています。

したがって、application モジュールをパッケージングしたアーティファクトを別のプロジェクトの Maven や Gradle 依存ライブラリの定義に加えても application モジュールに定義されたクラスやインターフェースを参照できません。

記事では Gradle を使用したため、[build.gradle](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.3.0/build.gradle) で次のようなタスクを使って application モジュールの `BOOT-INF/classes` 以下を取り込むように設定しました。

```groovy
configurations {
    unzipFile
}

dependencies {
    unzipFile ('com.mamezou_tech.example-service:example-application:0.2.0-SNAPSHOT') {
        changing = true
    }
}

task unzip(type: Copy) {
    def file = configurations.unzipFile.files.find {
        'example-application-0.2.0-SNAPSHOT.jar'
    }
    from zipTree(file)
    into 'build/unzipFile'
}

task copy(type: Copy) {
    from fileTree('build/unzipFile/BOOT-INF/classes')
    into 'build/classes/java/main'
}

tasks.copy.dependsOn(tasks.unzip)
tasks.compileJava.dependsOn(tasks.copy)
```

参考までに Maven では `unpack` を使うことで同様のことができます。

```xml
    <build>
        <plugins>
            <plugin>
                <artifactId>maven-dependency-plugin</artifactId>
                <executions>
                    <execution>
                        <id>unpack</id>
                        <phase>generate-resources</phase>
                        <goals>
                            <goal>unpack</goal>
                        </goals>
                        <configuration>
                            <artifactItems>
                                <artifactItem>
                                    <groupId>com.mamezou_tech.example-service</groupId>
                                    <artifactId>example-application</artifactId>
                                    <version>0.2.0-SNAPSHOT</version>
                                </artifactItem>
                            </artifactItems>
                            <includes>BOOT-INF/classes/**/*</includes>
                        </configuration>
                    </execution>
                </executions>
            </plugin>
            <plugin>
                <artifactId>maven-resources-plugin</artifactId>
                <configuration>
                    <resources>
                        <resource>
                            <directory>${basedir}/target/dependency/BOOT-INF/classes</directory>
                        </resource>
                    </resources>
                    <outputDirectory>${basedir}/target/classes</outputDirectory>
                </configuration>
            </plugin>
        </plugins>
    </build>
```

## まとめ

OpenAPI Generator は多くの言語とフレームワーク、サーバーサイドとクライアントサイドのコード生成をサポートしています。非常に活発な開発も継続されていて、脆弱性が見つかった時にも素早い対応がみられます。

API の定義自体が変わらなかったとしても、脆弱性に対応したコードを再生成する機会は多くあります。そのため、Generation Gap パターンの理解は重要です。

OpenAPI Generator に設定可能なパラメータも多くあります。パラメータのメンテナンスを考えると、この記事で採用したように YAML ファイルなどにまとめて変更しやすくすることをおすすめします。

そして、GitHub Actions のような自動デプロイの[スクリプト](https://github.com/edward-mamezou/use-openapi-generator/blob/v0.3.0/.github/workflows/build.yml)で、生成、ビルド、デプロイをどのようなステップで実行するかを可視化することも有益です。

[次回](/blogs/2022/06/24/openapi-generator-4/)はこのサンプルサービスを完成させるため、ドメイン駆動設計 (Domain-driven design) の戦術的設計を説明します。

## 参考

- [OpenAPI Generatorを使ったコードの自動生成とインタフェースの守り方](https://zenn.dev/angelica/articles/3b7ac906f73638)

## 関連記事

- [第1回 OpenAPI Generator を使ったコード生成](/blogs/2022/06/04/openapi-generator-1/)
  - 最初に OpenAPI Generator を使った簡単なサービスを実装します。
- [第2回 イベントストーミングとドメイン駆動設計の戦略的設計](/blogs/2022/06/09/openapi-generator-2/)
  - ドメイン駆動設計の主に戦略的設計で活用するイベントストーミングと、サイドカーパターンを紹介します。
- [第4回 ドメイン層の実装とサービスの完成](/blogs/2022/06/24/openapi-generator-4/)
  - ドメイン駆動設計の戦術的設計によってサービスの実装を完成します。
- [第5回 Open Policy Agent とサイドカーパターンによる認可の実装](/blogs/2022/07/01/openapi-generator-5/)
  - サイドカーパターンで Open Policy Agent を使ってサービス全体を完成します。
