---
title: OpenAPI Generator を使って Spring Boot アプリを作る
author: shigeki-shoji
date: 2022-06-04
tags: [java, "openapi-generator", "spring-boot"]
---

REST API の仕様を記述する [OpenAPI Specification](https://swagger.io/specification/) があります。この仕様では、JSON または YAML で API の仕様を記述します。

この業界標準の仕様で API を定義すると、開発に利用しやすいフォーマットされたドキュメントの提供やテスト用のモックを提供できます。

この定義を使うツールに [OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator) があります。これを使用すると、さまざまな言語、フレームワークの API Client、あるいは Server のスタブコードを生成できます。

この記事では、OpenAPI Generator を使って簡単な Spring Boot アプリを作成します。

## OpenAPI Specification

YAML 形式でサンプル API を記述します。

```yaml
openapi: 3.0.2
info:
  version: 0.1.0
  title: example
servers:
  - url: 'http://localhost:8080/example'
paths:
  /hello:
    get:
      description: Hello World
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Hello'
      tags:
        - example
components:
  schemas:
    Hello:
      type: object
      properties:
        message:
          type: string
          example: 'Hello World'
      x-tags:
        - example
```

この例では、`/{base-path}/hello` パスの `GET` メソッドを受け入れる API を定義しています。レスポンスは HTTP Status が 200 のみで、`Hello` と定義されたスキーマ の JSON を返します。

## 生成するモジュール構成

ここでは、application と controller の2つのモジュール (jar) を生成します。

- `application` モジュールは、Spring Boot アプリケーションとして実行するために必要なクラスが生成され、実行可能 jar としてビルドされます。
- `controller` モジュールは、OpenAPI Specification で定義された API ハンドラとなるインターフェース、リクエストおよびレスポンスのクラスのコードが生成されます。

生成するモジュールをなぜこのように分離するかというと、生成したコードに直接手を入れて、再生成した時にコードが壊れることを避けたいからです。つまり、[Generation Gap パターン](https://martinfowler.com/dslCatalog/generationGap.html)を適用したいためです。

### application モジュールの生成とビルド

OpenAPI Generator を使用するためには、Java を実行する環境が必要です。また、生成後には [Maven](https://maven.apache.org/) を使ってビルドすることになるため、DockerHub にあるオフィシャルな [maven](https://hub.docker.com/_/maven) イメージを使用します。

モジュールを生成するプロジェクトルートに、前述の API 定義を openapi.yaml ファイルとして置きます。

次に、application モジュールを生成するパラメータファイルとして `application.yaml` ファイルを次の内容で記述します。

```yaml
inputSpec: 'openapi.yml'
generatorName: spring
outputDir: modules/application
additionalProperties:
  configPackage: 'com.mamezou_tech.example.controller.configuration'
  modelPackage: 'com.mamezou_tech.example.controller.model'
  apiPackage: 'com.mamezou_tech.example.controller.api'
  invokerPackage: 'com.mamezou_tech.example.controller.api'
  groupId: 'com.mamezou_tech.example-service'
  dateLibrary: java8
  java8: true
  library: spring-boot
  artifactId: 'example-application'
  artifactVersion: '0.1.0'
  snapshotVersion: 'true'
  useTags: true
```

プロジェクトのルートで、Docker コマンドを実行します。

```shell
$ docker run -it --rm -v `pwd`:/build -v example:/root/.m2 maven:3.8-eclipse-temurin-17-focal bash
```

起動したコンテナ上で、次のコマンドを実行します。

```shell
# curl -L https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli/6.0.0/openapi-generator-cli-6.0.0.jar -o /tmp/openapi-generator-cli.jar
# cd /build
# java -DsupportingFiles -jar /tmp/openapi-generator-cli.jar batch application.yaml
```

ここまでの実行で `/build/modules/application` ディレクトリにプロジェクトが生成されます。

```shell
# cd modules/application
# mvn install
```

生成したアーティファクトは、example ボリュームに保存されます。

### controller モジュールの生成とビルド

openapi.yaml ファイルを作成したのと同じ場所に `controller.yaml` ファイルを次の内容で作成します。

```yaml
inputSpec: 'openapi.yml'
generatorName: spring
outputDir: modules/controller
additionalProperties:
  configPackage: 'com.mamezou_tech.example.controller.configuration'
  modelPackage: 'com.mamezou_tech.example.controller.model'
  apiPackage: 'com.mamezou_tech.example.controller.api'
  invokerPackage: 'com.mamezou_tech.example.controller.api'
  groupId: 'com.mamezou_tech.example-service'
  dateLibrary: java8
  java8: true
  library: spring-boot
  artifactId: 'example-controller'
  artifactVersion: '0.1.0'
  interfaceOnly: true
  snapshotVersion: 'true'
  useTags: true
```

プロジェクトのルートで、Docker コマンドを実行します。

```shell
$ docker run -it --rm -v `pwd`:/build -v example:/root/.m2 maven:3.8-eclipse-temurin-17-focal bash
```

起動したコンテナ上で、次のコマンドを実行します。

```shell
# curl -L https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli/6.0.0/openapi-generator-cli-6.0.0.jar -o /tmp/openapi-generator-cli.jar
# cd /build
# java -jar /tmp/openapi-generator-cli.jar batch controller.yaml
```

ここまでの実行で `/build/modules/controller` ディレクトリにプロジェクトが生成されます。

```shell
# cd modules/controller
# mvn install
```

生成したアーティファクトは、application モジュール同様、example ボリュームに保存されます。

:::info
開発者が一人の場合は、この手順のようにローカルのストレージにアーティファクトを保存しても問題ありません。しかし、複数人で開発する場合には、Sonatype [Nexus](https://www.sonatype.com/products/nexus-repository) や JFrog [Artifactory](https://jfrog.com/artifactory/)、AWS [CodeArtifact](https://aws.amazon.com/jp/codeartifact/) などに deploy して共有することになるでしょう。
:::

## コードを完成させる

まず、modules/controller に生成されたコードを見てみましょう。

`src/main/java` の `com.mamezou_tech.example.controller.api` パッケージに `ExampleApi` インターフェースのコードが見つかります。

コードは controller モジュールに生成された `ExampleAPI` インターフェースを実装することで完成します。

1. プロジェクトのルートに、`src/main/java` ディレクトリを作成します。
2. 作成したディレクトリに、`com.mamezou_tech.example.controller.api` パッケージを作成します。
3. 作成したパッケージに `ExampleAPIController` クラスを作成します。

`ExampleAPIController` クラスのコードは次のようになりました。

```java
import com.mamezou_tech.example.controller.model.Hello;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("${openapi.exampleService.base-path:/example}")
public class ExampleAPIController implements ExampleApi {

    @Override
    public ResponseEntity<Hello> helloGet() {
        Hello hello = new Hello();
        hello.setMessage("Hello World!");
        return new ResponseEntity<>(hello, HttpStatus.OK);
    }
}
```

このコードでは application.properties の `openapi.exampleService.base-path`、環境変数の `OPENAPI_EXAMPLESERVICE_BASE_PATH` 等に値が指定されていない場合のデフォルトベースパスを `/example` に指定しています。つまり、API 定義の `/hello` は `/example/hello` になります。

:::info
Spring Boot では application.properties の `server.servlet.context-path`、環境変数の `SERVER_SERVLET_CONTEXT_PATH` 等でコンテキストパスを設定もできます。例えば、環境変数に `SERVER_SERVLET_CONTEXT_PATH=/stg` と設定すると、`/example/hello` は `/stg/example/hello` が有効なパスになります。
:::

### ビルド

コードを実装するプロジェクトでは人気のある [Gradle](https://gradle.org/) を使ってみます。

プロジェクトのルートに、以下の内容の `build.gradle` ファイルを作成します。Spring Boot 等のバージョンは、application モジュールの `pom.xml` を参考にしています。

```groovy
plugins {
    id 'org.springframework.boot' version '2.7.0'
    id 'io.spring.dependency-management' version '1.0.11.RELEASE'
    id 'java'
}

configurations {
    all {
        resolutionStrategy.cacheChangingModulesFor 0, 'seconds'
    }
    unzipFile
}

group = 'com.mamezou_tech.example-service'
version = '0.1.0-SNAPSHOT'
sourceCompatibility = '1.8'

repositories {
    mavenCentral()
    mavenLocal()
}

dependencies {
    implementation     'org.springframework.boot:spring-boot-starter-web'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    implementation     ('com.mamezou_tech.example-service:example-controller:0.1.0-SNAPSHOT') {
        changing = true
    }
    unzipFile          ('com.mamezou_tech.example-service:example-application:0.1.0-SNAPSHOT') {
        changing = true
    }
}

test {
    useJUnitPlatform()
}

task unzip(type: Copy) {
    def file = configurations.unzipFile.files.find {
        'example-application-0.1.0-SNAPSHOT.jar'
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

Gradle のイメージは DockerHub にあるオフィシャルなイメージを使います。

```shell
$ docker run -it --rm -v `pwd`:/build -v example:/root/.m2 -p 8080:8080 gradle:jdk17-focal bash
```

起動したコンテナ上で、次のコマンドを実行します。

```shell
# cd /build
# gradle bootRun
```

ホストPCのブラウザから、次の URL にアクセスします。

- http://localhost:8080/example/hello

ブラウザには、以下のようなレスポンスが表示されます。

```json
{"message":"Hello World!"}
```

次の URL で、API の仕様を実行中のアプリケーションから取得できます。

- http://localhost:8080/swagger-ui/index.html

## まとめ

この記事では、OpenAPI Generator を使用して Spring Boot のサーバーアプリケーションが容易に作成できることを説明しました。

次回以降の記事で、ここで作成したサンプルをさらに深掘りして説明します。
