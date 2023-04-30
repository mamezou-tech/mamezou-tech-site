---
title: 今さら聞けないMaven – 実行オプションの固定化
author: toshio-ogiwara
date: 2023-04-30
tags: [java, maven, 今さら聞けないMaven]
---

Mavenでは多数の条件をmvnコマンドのオプションで指定することが多いですが、指定するオプションにはプロジェクトや環境が同じであればに常に同じとなるオプションがあるため、オプションを固定化したい場合があったりします。また [「ローカルリポジトリの分割」](/blogs/2023/03/05/maven-split-local-repo/)で紹介したような長いオプションを都度指定するのが面倒だったりもします。このような場合、実行コマンドをbatファイルやシェルスクリプトでスクリプト化する方法がよく行われますが、Mavenにはオプションを固定化し実行ごとに必要なる入力を省略可能にする機能があります。今回はこのMavenのオプションを固定化する機能を紹介します。

# オプションの種類(予備知識)
オプションを固定化する方法はその種類によって分かれているため、本題に入る前にMavenの実行時に指定するオプションの種類について簡単に説明します。

Mavenの実行時に指定するオプションは大きく次の２つに大別できます。
- VMオプション
- Mavenオプション

Mavenはご存じのとおりJavaVM上で実行されますが、VMオプションはこのMavenを実行する土台となるJavaVMに対するオプションとなります。具体的には最大ヒープサイズを指定する`-Xmx1024m`などjavaコマンドで定義されているオプションとなります。

これに対してMavenオプションはMaven機能に対するオプションとなります。この具体的なものとしてはプロファイルを指定する`-P`オプションやバッチモードで実行する`-B`オプションなどmvnコマンドで定義されているオプションとなります。

:::alert: VMオプションはmvnコマンドの引数で直接指定できない
Mavenをよくご存じの方は`-Xmx1024m`などのVMオプションってmvnコマンドで指定できたっけ？と思うかもしれませんがその疑問は正しいです。VMオプションは`mvn -Xmx1024m clean package`のようにmvnコマンドの引数で直接指定することはできません。VMオプションを指定する場合は次の[「VMオプションの固定化」](#vmオプションの固定化)で紹介する方法で指定する必要があります。この点はMavenオプションと異なり混乱しやすいところですので留意が必要です。
:::


# VMオプションの固定化
本題に入ってまずはVMオプションを固定化して指定する方法ですが、これには次の２つの方法があります。

- 環境変数`MAVEN_OPTS`による設定
- `.mvn/jvm.config`による指定

例えば、最大ヒープサイズを2GB(2048MB)、最小ヒープサイズを1GB(1024MB)でMavenを実行する指定を`MAVEN_OPTS`を使って行う場合は、次のようになります。

```shell
export MAVEN_OPTS="-Xmx2048m -Xms1024m"
mvn clean compile
```
<br>

これと同じ内容を`.mvn/jvm.config`で指定する場合は、プロジェクト直下に`.mvn/jvm.config`ファイルを作成し、そのファイルに固定化するオプションを次のようにそのまま記述します。

```java
-Xmx2048m -Xms1024m
```
<br>

なお`MAVEN_OPTS`と`jvm.config`の指定は併存可能性です。
現実的な例ではないですが、`MAVEN_OPTS`に`-Xmx2048m`、`jvm.config`に`-Xms1024m`を設定した場合、実行時にはこの２つが連結され、JavaVMには`-Xmx2048m -Xms1024m`が渡るようになっています。

このことから、この２つの使い分けは、プロジェクトごとに共通となる設定はビルド担当者が`.mvn/jvm.config`を作成してプロジェクトのリポジトリにコミットしておき、環境変数`MAVEN_OPTS`はその環境ごとに個別に設定する、プロジェクトの共通設定と環境ごとの個別設定になると思います。

:::stop: 同じオプションが指定された場合の優先度は不定
`MAVEN_OPTS`に`-Xmx2048m`が設定されているのに対して`jvm.config`にも最大ヒープサイズを指定する`-Xmx1024m `が設定されている場合、2048mと1024mのどちらが有効になるかはMavenのマニュアルにも明記されていません。また、mvnコマンドの実体のシェルスクリプトを確認しても、単に`MAVEN_OPTS`と`jvm.config`の設定を連結しているだけで、そのどちらが有効となるかはJavaVM次第で結果は不定となります。したがって、プロジェクトの共通的な`MAVEN_OPTS`の設定を環境個別の`jvm.config`の設定で上書きするといったことはできないので注意しましょう。
:::

# Mavenオプションの固定化
次にMavenオプションを固定して指定する方法ですが、これはVMオプションと同様に次の2つになります。

- 環境変数`MAVEN_ARGS`による設定
- `.mvn/maven.config`による指定

:::alert: MAVEN_ARGSが使えるのはMaven 3.9.0から
環境変数`MAVEN_ARGS`の機能が入ったのはMaven 3.9.0からとなります。それ以前のバージョンではMavenオプションを固定化する方法は`.mvn/maven.config`による指定のみとなります。
:::

VMオプションと同様に例をもとに説明すると、例えばMavenのバージョン情報を出力する`-V`オプションとリモートとローカルの取得元別にアーティファクトを別々に格納するようにする`-Daether.enhancedLocalRepository.split`オプション[^1]が常に指定されるようにしたい場合の設定は次のようになります。

[^1]:[「今さら聞けないMaven – 3.9.0で追加されたローカルリポジトリの分割 | 豆蔵デベロッパーサイト」](https://developer.mamezou-tech.com/blogs/2023/03/05/maven-split-local-repo/)を参照

- 環境変数`MAVEN_OPTS`による指定
```shell
export MAVEN_ARGS="-V -Daether.enhancedLocalRepository.split"
 mvn clean compile
```
<br>

- `maven.config`の設定内容
```java
-V
-Daether.enhancedLocalRepository.split
```

`maven.config`は`jvm.config`と同様に`.mvn`ディレクトリの直下にファイルを作成して設定を行います。

:::stop: maven.configの改行は3.9.0より以前では不要
Maven 3.9.0以降では`maven.config`に複数のオプションを指定する場合、上述の例のように1行に1オプションとなるように記述する必要がありますが、3.9.0より以前では1行にすべてのオプションを記述する必要があります。このため、上述の例は3.9.0より以前では次のように記述します。
```java
-V -Daether.enhancedLocalRepository.split
```
:::

:::alert: pomのプロパティを上書きする-DオプションはMavenオプション
pomのpropertiesで定義したプロパティはmvnコマンドの`-D`オプションで書き換えることができます。例えば、次のような設定があった場合、

```xml
<project xmlns=...>
  ...
  <properties>
    <sample.arg>arg1</sample.arg>
  </properties>
  <build>
    <plugins>
      <plugin>
        <groupId>org.codehaus.mojo</groupId>
        <artifactId>exec-maven-plugin</artifactId>
        <version>3.1.0</version>
        <configuration>
          ...
          <arguments>
            <argument>${sample.arg}</argument>
          </arguments>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project> 
```

pomに定義された`sample.arg`は次のようにmvnコマンドの`-D`オプションで値を書き換えることができます。
```shell
mvn clean compile -Dsample.arg=hello
```

この場合の`-D`オプションはシステムプロパティの設定を行うjavaコマンドの`-D`オプションではなく、mvnコマンドが持つpomのプロパティを書き換える`-D`オプションとなります。したがって、pomのプロパティを書き換える`-D`オプションを固定化する場合はVMオプションを固定化する`MAVEN_OPTS`や`jvm.config`ではなく、`MAVEN_ARGS`か`maven.config`に指定する必要があります。これはオプションを固定化する際の固有な扱いではなく、Mavenのhelpにもあるとおり、MavenがJavaVMと同じ`-D`オプションを別の用途で定義しているためとなります。

```shell
mvn --help
> usage: mvn [options] [<goal(s)>] [<phase(s)>]
> 
> Options:
>  -D,--define <arg>       Define a user property
> ...
```
:::
<br>

`MAVEN_ARGS`と`maven.config`の併存と双方に同じオプションの設定があった場合の扱いはVMオプションと同じとなりますが、VMオプションはmvnコマンドで直接指定することができないのに対し、Mavenオプションは(通常行っているように)mvnコマンドでオプションを都度指定することができるといった違いがあります。

このため、次のようなオプション指定を行うコマンドがあった場合、

```shell
mvn clean compile exec:java -P product -V -Daether.enhancedLocalRepository.split
```

`-V`と`-D`オプションを`MAVEN_ARGS`や`maven.config`で固定化することで次のように実行の都度指定が変わるものだけを指定して実行することができるようになります。

```shell
mvn clean compile exec:java -P product
```

# まとめ
記事ではMaven実行時のオプション指定を固定する方法として4つを説明しましたが、この4つの用途は次のようにまとめることができます。

||VMオプション|Mavenオプション|
|---|----|---|
|プロジェクトごとの設定|`.mvn/jvm.config`|`.mvn/maven.config`|
|環境ごとの設定|`MAVEN_OPTS`|`MAVEN_ARGS`|

<br>

Mavenが持つオプションの固定化機能はbatファイルやシェルスクリプトによるスクリプト化よりも簡潔に設定することができるため、ここぞ！というオプション指定があった場合は是非使ってみたいと思います。


---
参照資料

- [Maven – Configuring Apache Maven](https://maven.apache.org/configure.html)
