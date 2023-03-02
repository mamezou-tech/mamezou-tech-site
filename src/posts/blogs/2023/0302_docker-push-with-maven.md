---
title: 今さら聞けないMaven – コンテナのビルドと一緒にpushもMavenでしたい。
author: toshio-ogiwara
date: 2023-03-02
tags: [java, maven, junit, 今さら聞けないMaven, container, docker, GitHub]
---

[「今さら聞けないMaven – コンテナも一緒にビルドしたい。テスト実行前にコンテナを起動したい」](/blogs/2022/08/31/docker_with_maven/)ではMavenを使ったコンテナイメージのビルド方法を説明しました。今回は前回と同じfabric8のdocker-maven-pluginによるもう一歩進めた使い方としてコンテナイメージのタグ付けとコンテナレジストリへのpushをMavenで行う方法を紹介したいと思います。これによりJavaのビルドからコンテナイメージのビルド、pushまでJavaアプリのコンテナ化で必要となる全ての操作をMavenから行えるようになります。

## 今回のサンプルと前回のおさらい
今回はコンソールに"Hello, world!"を出力する簡単なコンテナアプリを使い、そのコンテナイメージに対するタグ付けとコンテナレジストリへのpushを説明していきます。なお説明で利用したサンプル一式はGitHubの[こちら](https://github.com/extact-io/docker-push-with-maven)にアップしてあります。

今回利用するJavaプログラムとそのビルド方法は次のとおりになります。

- Javaプログラム
```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, world!");
    }
}
```
<br/>

- ビルドするpom(`-jar`オプションで実行可能にしている)
```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" ...>
  <modelVersion>4.0.0</modelVersion>
  <groupId>io.extact</groupId>
  <artifactId>docker-push-with-maven</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <packaging>jar</packaging>
  <properties>
    ...
    <mainClass>sample.HelloWorld</mainClass>
  </properties>
  <build>
    <finalName>${project.artifactId}</finalName>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-jar-plugin</artifactId>
        <version>3.3.0</version>
        <configuration>
          <archive>
            <manifest>
              <mainClass>${mainClass}</mainClass>
            </manifest>
          </archive>
        </configuration>
      </plugin>
      ... 後述のdocker-maven-pluginの定義
  </build>
</project>
```
<br/>

- ビルドとアプリの実行
```shell
mvn clean package
java -jar target/docker-push-with-maven.jar
> Hello, world!
```
<br/>

このJavaアプリをfabric8のdocker-maven-pluginにより次のようにコンテナイメージにビルドしています。
- Dockerfile
```dockerfile
# ベースイメージはeclipse-temurin(旧OpenJDK)のJava17を使用
FROM docker.io/eclipse-temurin:17-jre-alpine
# ホストOSのMavenのビルド成果物をコンテナイメージに格納
WORKDIR /
COPY ./target/docker-push-with-maven.jar ./
# Executable Jarなのでjavaコマンドで実行
CMD ["java", "-jar", "docker-push-with-maven.jar"]
```
<br/>

- pomのdocker-maven-pluginの定義
```xml
<plugin>
  <groupId>io.fabric8</groupId>
  <artifactId>docker-maven-plugin</artifactId>
  <version>0.40.2</version>
  <configuration>
    <images>
      <image>
        <name>extact-io/hello-world</name>
        <build>
          <tags>
            <tag>latest</tag>
          </tags>
          <contextDir>${project.basedir}</contextDir>
        </build>
      </image>
    </images>
  </configuration>
</plugin>
```
<br/>

- コンテナイメージのビルドとコンテナの実行
```shell
mvn clean package docker:build

docker image ls
> REPOSITORY               TAG      IMAGE ID       CREATED          SIZE
> extact-io/hello-world    latest   398f93fe3aa5   55 seconds ago   170MB

docker run extact-io/hello-world
> Hello, world!
```
<br/>

docker-maven-pluginを使ったコンテナイメージ(以降イメージ)のビルドは[前回](/blogs/2022/08/31/docker_with_maven/)のおさらいとなるため、詳細はそちらを参照として詳しくは説明しませんが、上記の`mvn`コマンドでやっていることは、

- Mavenの`package`ゴールで作成されたhello-wold.jarを入力として
- Mavenの`docker:build`ゴールでDockerfileをもとに`extact-io/hello-world`イメージを作成する

となります。

なお、今回はコンテナレジストリに GitHub Packages Container Registry(GitHub Packages)を使うため、イメージ名にリポジトリ名の`extact-io`を明示しています。

この内容をもとにビルドしたイメージにタグを付ける方法とコンテナレジストリにpushする方法をみていきます。

## コンテナイメージのタグ付け
docker-maven-pluginにはタグ付けを行う`docker:tag`ゴールが用意されています。このゴールを使って先ほどビルドしたイメージに`0.0.1-SNAPSHOT`のタグを付け、その結果を`docker`コマンドで確認してみます。なおタグ名は`-Ddocker.image.tag`オプションで指定します。

```shell
mvn docker:tag -Ddocker.image.tag=0.0.1-SNAPSHOT

docker image ls
> REPOSITORY               TAG             IMAGE ID       CREATED        SIZE
> extact-io/hello-world    0.0.1-SNAPSHOT  398f93fe3aa5   5 minute ago   170MB
> extact-io/hello-world    latest          398f93fe3aa5   5 minute ago   170MB
```
<br/>

`latest`タグと同じイメージに対して、指定した`0.0.1-SNAPSHOT`タグが追加されています。

## 処理対象となるコンテナイメージ
`docker:tag`ゴールの`mvn`コマンドをみてdocker-maven-pluginはどのイメージを対象にタグを付けているのだ？と思われた方もいるかと思います。

答えから先にいうとタグ付けの対象となるイメージは`latest`タグが指しているイメージとなります。docker-maven-pluginはプラグイン設定の`name`タグで指定されたイメージ名の`latest`タグが指しているイメージに対して処理を行います。若干分かりずらい説明ですが、今回の例でこれを端的にいうと`extact-io/hello-world:latest`がその対象となります。

この挙動は直観的ではなくdocker-maven-pluginの分かりづらい点でもあるため、もう少し詳しく説明します。

例えば、次の`configuration`設定は明示的に`latest`タグを指定していませんが、この場合でも`latest`タグはなんらかの処理対象になります。
```xml
<plugin>
  <groupId>io.fabric8</groupId>
  <artifactId>docker-maven-plugin</artifactId>
  <version>0.40.2</version>
  <configuration>
    <images>
      <image>
        <name>extact-io/hello-world</name>
        <build>
          <tags>
            <tag>1.0.0</tag>
          </tags>
          …
        </build>
      </image>
    </images>
  </configuration>
</plugin>
```

例として`docker:build`ゴールを実行した場合、設定では`latest`タグは明示していませんが生成された`extact-io/hello-world`イメージには明示している`1.0.0`タグに加え`latest`タグが付けられます。

また、これと同じ設定で`docker:tag`ゴールを実行した場合、タグが付けられるのは`1.0.0`タグが指しているコンテナイメージではなく、`latest`タグが指しているコンテナイメージとなります。つまり`docker:tag`ゴールでは`latest`タグが指すイメージ以外にタグを付けることはできません。(なのでスゴク不便です)

そして、この挙動はpushを行う`docker:push`ゴールでも同じとなります。docker-maven-pluginのpushは明示的に指定したタグに加え、`latest`タグが必ずpushされます。もしローカルリポジトリ側に`latest`タグ存在しなかった場合、"latestタグのイメージがない"といってpushが失敗します。

## コンテナイメージのpush
### プラグイン設定の改良と接続レジストリの設定
今の設定では`latest`以外のタグをpushする場合、都度pushするタグをpomに書く必要があるため不便です。これを改善するため、pushするタグをコマンド実行時のシステムプロパティで指定できるようにpomのタグ指定を変数化します。

また、docker-maven-pluginは`configuration`設定の`registry`タグで指定されているコンテナレジストリに接続します。よってpushを行う場合は`registry`タグを追加し、そこにコンテナレジストリのURL(今回の例ではghcr.io)を設定します[^1]。

[^1]: docker-maven-pluginはデフォルトで`docker.io`に接続します。このためコンテナレジストリにDocker Hubを使う場合、`registry`タグはなくてもOKです。

タグの変数化とコンテナレジストリの設定を行ったpomは次のようになります。

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" ...>
  <modelVersion>4.0.0</modelVersion>
  <groupId>io.extact</groupId>
  <artifactId>docker-push-with-maven</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <packaging>jar</packaging>
  <properties>
    ...
    <mainClass>sample.HelloWorld</mainClass>
    <!-- ↓↓↓ docker-maven-pluginで参照するオレオレプロパティの追加 -->
    <image.registry>ghcr.io</image.registry>
    <image.owner>extact-io</image.owner>
    <image.tag>latest</image.tag>
  </properties>
  <build>
    <finalName>${project.artifactId}</finalName>
    <plugins>
      ...
      <plugin>
        <groupId>io.fabric8</groupId>
        <artifactId>docker-maven-plugin</artifactId>
        <version>0.40.2</version>
        <configuration>
          <registry>${image.registry}</registry>
          <images>
            <image>
              <name>${image.owner}/hello-world</name>
              <build>
                <tags>
                  <!-- ↓↓↓ タグ名をプロパティから参照するように変更 -->
                  <tag>${image.tag}</tag>
                </tags>
                <contextDir>${project.basedir}</contextDir>
              </build>
            </image>
          </images>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

このようにpomを定義することで実行時に`-Dimage.tag`オプションでタグを指定できるようになります。なお、上記はタグの他にコンテナレジストリやリポジトリ名なども実行時に指定できるように変数化しています。

### 認証情報の設定
pomは整ったので早速pushしたいところですが、コンテナレジストに対するpush操作には認証が必要です。docker-maven-pluginではコンテナレジストリの認証方法がいくつか用意されていますが、ここでは一番Mavenらしいやり方となるMavenのsettings.xmlを使った方法を紹介します。他の認証方法は[マニュアル](https://dmp.fabric8.io/#authentication)に記載されているので、そちらを参照ください。

settings.xmlを使った認証は次ように`servers`タグにコンテナレジストリの認証設定を`sever`タグで追加します。

```xml
<servers>
  <server>
    <id>コンテナレジストリのURL </id>
    <username>接続するID</username>
    <password>接続に利用するパスワード(もしくはPAT)</password>
  </server>
</servers>
```

`id`タグにはコンテナレジストリのURL、つまり、pom側の`registry`タグと同じ値を設定します。`username`タグと`password`タグにはそれぞれ接続に利用するものを設定します。なお、例で使用しているGitHub PackagesへはPersonal Access Token (PAT)での接続が必要となります。

:::check: GitHub Packagesに対するPATの取得
GitHub Packagesの利用法は記事の本題ではないため、そのアクセスに必要となるPATの取得手順は割愛します。なお、PATの取得方法はGitHubの公式マニュアルやネットに豊富に情報がありますが筆者として以下が分かりやすくてお勧めです。
- [GitHub「Personal access tokens」の設定方法 - Qiita](https://qiita.com/kz800/items/497ec70bff3e555dacd0) 
  - ※画面キャプチャが少し違うところがありますが雰囲気で分かると思います

また、GitHub Packagesのpushには次に示すwriteとread権限がPATに必要となります。

![capture1](/img/blogs/2023/0219_capture1.drawio.svg)
:::

前置きが長くなりましたが、これでpushの準備は完了です。

### コンテナレジストリへのpush
それでは先ほどタグを付けた`0.0.1-SNAPSHOT`タグをdocker-maven-pluginを使って、GitHub Packagesにpushしましょう。このpush操作は`docker:push`ゴールを使って次のように行います。

- pushの実行
```shell
mvn docker:push -Dimage.tag=0.0.1-SNAPSHOT
```
<br/>

- pushされたコンテナイメージ

![ghcr](/img/blogs/2023/0302_ghcr.drawio.svg)


GitHub Packagesに`extact-io/hello-world`イメージがアップされ`latest`タグと`0.0.1-SNAPSHOT`が付いているのが分かります。

今回の例はローカルリポジトリの`latest`タグと`0.0.1-SNAPSHOT`タグが同じイメージを指していたので実体としてアップされるイメージは1つでしたが、`latest`と`0.0.1-SNAPSHOT`が別のイメージを指していた場合、先ほどの1回の操作でアップされるイメージは`latest`と`0.0.1-SNAPSHOT`が指すイメージの2つとなります。

また、タグ付けとpushの操作を別々に説明してきましたが、改良後のpomの例のように対象とするタグを変数化し実行時にタグを指定できるようにすることで、次にように1回のコマンドでjarのビルドからイメージのpushまで行うことができるようになります。

```shell
mvn clean package docker:build docker:push -Dimage.tag=`date +%Y%m%dT%H%M%S-%3N`
```

上記はビルド時にタイプスタンプのタグを付け、そのタグをGitHub Packagesにpushする例となります。

:::column: GitHub Actionsによるコンテナのビルドからpushまで
最後にGitHub繋がりでGitHub Actionsを使った例を紹介します。
先ほどのコンテナのビルドからpushまで行う操作は次のようなワークフローを定義することでGitHub Actionsで実行することができます。

{% raw %}
```yaml
name: Publish to GitHub Packages 
on:
  workflow_dispatch:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
    - uses: actions/checkout@v3
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
        server-id: ghcr.io
        server-username: REPOSITORY_SERVER_USER
        server-password: REPOSITORY_SERVER_PASSWORD
        settings-path: ${{ github.workspace }}
    - name: Publish to GitHub Packages Apache Maven
      run: mvn -B package docker:build docker:push -Dimage.tag=`date +%Y%m%dT%H%M%S-%3N` --file pom.xml -s $GITHUB_WORKSPACE/settings.xml
      env:
        REPOSITORY_SERVER_USER: ${{ secrets.REPOSITORY_SERVER_USER }}
        REPOSITORY_SERVER_PASSWORD: ${{ secrets.REPOSITORY_SERVER_PASSWORD }}
```
{% endraw %}

ワークフロー実行にはコンテナレジストリへの認証が必要なため`setup-java`アクションの`server-username`パラメータと`server-password`パラメータで認証情報設定していますが、この設定はGitHub Packagesをjarを格納するパッケージレジストリとして使う場合と同じとなります。この詳細については[こちら](/blogs/2023/02/19/github-packages-with-maven/#setup-javaアクションの設定)を参照ください。

参考として、GitHub Packagesをjarのパッケージレジストリとして使う場合、publicなリポジトリでもモジュールの参照（ダウンロード）には認証が必要でしたが、コンテナレジストリの場合、publicであればその参照(pull)に認証は必要ありません。つまりDocker Hubと同じように使うことができて便利です。
:::

## 最後に
docker-maven-pluginを使うことでCI環境や利用するコンテナレジストリに依らずコンテナのビルドからpushまでMavenで使って同じように行えるようになります。しかし、その反面、latestタグの扱いなどに癖があり、その挙動をよく理解していないと意図しないイメージがpushされることも考えられます。このためタグ付けやpush対象を細かくコントロールする必要がある場合はMavenで行うのはイメージのビルドまでにとどめ、後続のタグ付けやpush操作はdockerコマンドを使って行う方がよいと思われます。

---
参照資料

- [fabric8io/docker-maven-plugin](https://dmp.fabric8.io/)
