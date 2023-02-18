---
title: GitHub Packages - MavenとActionsを使ったオレオレ依存ライブラリの管理
author: toshio-ogiwara
date: 2023-02-19
tags: [java, maven, GitHub, CI/CD]
---

依存するライブラリをマルチレポで管理しGitHub ActionsでCIを行おうとした場合、パッケージレジストリが必要になります。記事ではこのパッケージレジストリにGitHub Packagesを使った例を紹介します。

# 記事の背景
Mavenでは依存ライブラリをリポジトリから取得します。実行しようとしているモジュール(jar)が他のオレオレライブラリに依存している場合、その依存ライブラリはパッケージレジストリ経由で取得させる必要があります。このため、なんからのパッケージレジトリが必要となります。

これに対してモノレポは依存する側／される側という括りなくすべてのコードを1つのリポジトリで管理する方式のため、すべてのコードが常に一括してcheckoutされます。このためCIを実行する際にすべてのコードを一括ビルトしローカルリポジトリにインストールするという手が使えるため、マルチレポのようにパッケージレジストリが必要となることはありません。

筆者は普段モノレポを使っていますが、ある時GitHub Packagesを使ってマルチレポでプロジェクトを作ろうとしたところ、ハマりどころが満載でネットでも情報がなくかなり手を焼きました。そこで今回は自分の備忘も兼ねてマルチレポの依存ライブラリをGitHub Packagesを使って管理する際のハマりどころやポイントなどを紹介したいと思います。

# やろうとしていること
今回の例を説明にする前に、この記事でやろうとしていること、つまり説明のゴールを明確にしたいと思います。

## お題の前提
お題の前提としてリポジトリとそこから生成されるモジュール(jar)に次のような関係があるプロジェクトがあったとします。

![overview1](/img/blogs/2023/0219_overview1.drawio.svg)

sample-console.jarはsample-service.jarに対する依存があり、sample-parent-pom.jarはsample-console.jarとsample-service.jarの親pomだけを格納したモジュールとなっており、それぞれのモジュールはそれぞれ別のリポジトリで管理されています。

## お題のゴール
このようなマルチレポ構成とモジュール関係があるプロジェクトに対して最終的にやりたいことは次の図に示すことになります。

![overview2](/img/blogs/2023/0219_overview2.drawio.svg)

やりたことはそれぞれのリポジトリで管理しているコードのビルドからテスト、デプロイをGitHub Actionsのワークフローで実行することになります。

ポイントはsample-consoleとsample-serviceのビルド時には親pomのsample-parent-pom.jarをGitHub Packagesからダウンロードして取得する必要があり、加えてsample-consoleはsample-service.jarも必要となるところになります。

# 必要なpomとworkflowの定義(お題の答え)
ここでは上述のお題を実現するために必要となるpomの定義とworkflow定義をまずは見てもらい、その後に必要な手順や定義を個別に説明しながらハマりどころや注意点などをコラム形式で紹介していくスタイルで説明します。

では早速必要となるpomの定義とworkflow定義は次のとおりになります。記事の説明に使用したリポジトリやpom定義等はすべてGitHubの[こちら](https://github.com/extact-io/github-packages-sample-registry)に格納してあります。


- 用意するリポジトリ

|リポジトリ名|用途|
|-----------|---|
|sample-parent-pom|プロジェクトの親pomを格納するリポジトリ|
|sample-console|sample-console.jarのコードを格納するリポジトリ|
|sample-service|sample-service.jarのコードを格納するリポジトリ|
|sample-registry|パッケージレジストリとして利用するリポジトリ|

<br/>

- pomの定義
  - sample-parent-pom
```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" ...>
  <modelVersion>4.0.0</modelVersion>
  <groupId>io.extact</groupId>
  <artifactId>sample-parent-pom</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <packaging>pom</packaging>
  <name>sample-parent-pom</name>
  <distributionManagement>
    <repository>
      <id>github</id>
      <name>GitHub Apache Maven Packages</name>
      <url>https://maven.pkg.github.com/extact-io/sample-registry</url>
    </repository>
    <snapshotRepository>
      <id>github</id>
      <name>GitHub Apache Maven Packages</name>
      <url>https://maven.pkg.github.com/extact-io/sample-registry</url>
    </snapshotRepository>
  </distributionManagement>
  ...
</project>
```
  - sample-console
```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" ...>
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>io.extact</groupId>
    <artifactId>sample-parent-pom</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <relativePath>../sample-parent-pom/pom.xml</relativePath>
  </parent>
  <artifactId>sample-console</artifactId>
  <packaging>jar</packaging>
  <name>sample-console</name>
  <repositories>
    <repository>
      <id>github</id>
      <name>GitHub Apache Maven Packages</name>
      <url>https://maven.pkg.github.com/extact-io/sample-registry</url>
      <releases>
        <enabled>true</enabled>
      </releases>
      <snapshots>
        <enabled>true</enabled>
      </snapshots>
    </repository>
  </repositories>
  <dependencies>
    <dependency>
      <groupId>io.extact</groupId>
      <artifactId>sample-service</artifactId>
      <version>0.0.1-SNAPSHOT</version>
    </dependency>
  </dependencies>
  ...
</project>
```
  - sample-service
```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" ...>
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>io.extact</groupId>
    <artifactId>sample-parent-pom</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <relativePath>../sample-parent-pom/pom.xml</relativePath>
  </parent>
  <artifactId>sample-service</artifactId>
  <packaging>jar</packaging>
  <name>sample-service</name>
  <repositories>
    <repository>
      <id>github</id>
      <name>GitHub Apache Maven Packages</name>
      <url>https://maven.pkg.github.com/extact-io/sample-registry</url>
      <releases>
        <enabled>true</enabled>
      </releases>
      <snapshots>
        <enabled>true</enabled>
      </snapshots>
    </repository>
  </repositories>
</project>
```
<br/>

- GitHub Actionsのワークフロー定義
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
        server-id: github
        server-username: REPOSITORY_SERVER_USER
        server-password: REPOSITORY_SERVER_PASSWORD
        settings-path: ${{ github.workspace }}
    - name: Publish to GitHub Packages Apache Maven
      run: mvn -B deploy --file pom.xml -s $GITHUB_WORKSPACE/settings.xml
      env:
        REPOSITORY_SERVER_USER: ${{ secrets.REPOSITORY_SERVER_USER }}
        REPOSITORY_SERVER_PASSWORD: ${{ secrets.REPOSITORY_SERVER_PASSWORD }}
```

3つリポジトリで利用するものはすべて同じでOKです（問題を簡単にするため共通化は敢えてしてないけど、実際は共通化した方がいいよ。この記事見るといいよ）

それでは手順やポイントを順に説明してきます。

## deploy先とオレオレ依存ライブラリの取得先のリポジトリをpomに定義する
Maven Central以外のリポジトリを利用しない場合は明示的にリポジトリを指定することはありませんが、モジュールのdeploy先リポジトリとしてsample-registryのGitHub Packagesを、依存ライブラリの取得先としてデフォルトのMaven Centralに加えてdeploy先リポジトリと同じsample-registryのGitHub Packagesを指定する必要があります。

deploy先のリポジトリ指定はsample-parent-pomのpomに定義した次の`distributionManagement`タグ部分が相当します。
```xml
<distributionManagement>
  <repository>
    <id>github</id>
    <name>GitHub Apache Maven Packages</name>
    <url>https://maven.pkg.github.com/extact-io/sample-registry</url>
  </repository>
  <snapshotRepository>
    <id>github</id>
    <name>GitHub Apache Maven Packages</name>
    <url>https://maven.pkg.github.com/extact-io/sample-registry</url>
  </snapshotRepository>
</distributionManagement>
```

今回の例ではすべてのモジュールをsample-registryのGitHub Packagesにdeployするようにしています。親pomの`distributionManagement`タグの定義は子側の引き継がれるためsample-consoleとsample-serviceに`distributionManagement`タグを定義する必要はありません。

次に依存ライブラリの取得先リポジトリの指定はsample-consoleとsample-serviceのpomに定義した次の`repositories`タグ部分が相当します。
```xml
<repositories>
  <repository>
    <id>github</id>
    <name>GitHub Apache Maven Packages</name>
    <url>https://maven.pkg.github.com/extact-io/sample-registry</url>
    <releases>
      <enabled>true</enabled>
    </releases>
    <snapshots>
      <enabled>true</enabled>
    </snapshots>
  </repository>
</repositories>
```

一見`distributionManagement`タグと同じように親pomだけに定義すればよいように思いますが、子側のすべてのpomに定義が必要です。今回は親pomも独立したsample-parent-pomモジュールとしているため、子側にその取得先リポジトリの定義がなければ親pomを取得することができません。このため、`repositories`タグは子側に定義が必要となります。

:::alert: snapshot参照があるモジュールで依存ライブラリのキャッシュはNG
GitHub Actionsのワークフローは毎回クリーンな環境で実行されるメリットがありますが、その反面毎回Mavenのプライグインや依存ライブラリの取得が発生するため、実行に時間が掛かるといったデメリットがあります。

setup-javaアクションではこのデメリットを解消するため、次のように`cache`属性を指定すると以降のワークフロー実行に備えダウンロードしたライブラリをキャッシュする仕組みが提供されています。

```yaml
uses: actions/setup-java@v3
with:
  java-version: '17'
  distribution: 'temurin'
  cache: 'maven'
```

キャッシュされたライブラリはpomが修正されるまで有効となります。したがって、pomを変更しない限り、ライブラリのダウンロードが発生しないため、ワークフローの実行が高速化します。

このキャッシュの有効期間、つまりキャッシュを破棄してライブラリを再取得するタイミングは必要な依存関係はすべてpomに定義されているため、pomが変更されない限り必要な依存ライブラリは変わらないという考えに基づいていると思いますが、これには1つ落とし穴があります。

それは依存関係にsnapshot参照が含まれている場合です。今回の例でいえばsample-consoleは次のようにsample-serviceをsnapshot参照しています。
```xml
<dependencies>
  <dependency>
    <groupId>io.extact</groupId>
    <artifactId>sample-service</artifactId>
    <version>0.0.1-SNAPSHOT</version>
  </dependency>
</dependencies>
```

この依存関係を持つsample-consoleのビルドでcacheを有効した場合、どうなるでしょうか？

sample-serviceモジュールを変更してsample-console側には反映されないといった問題が発生します。snapshot参照はバージョンに対して取得するモジュールを固定せず、常に最新のモノを有効にするMavenの固有の機能ですが、cacheが有効になっている場合、pomが変更されない限り最新を確認するダウンロードも発生しないため、パッケージレジストリのモジュールには最新版が登録されているが、これが取得されないといった現象が発生します。このため、依存関係にsnapshot参照を持っているモジュールのビルドではcacheを使わないほうが無難です。
:::

## GitHub Packagesにアクセスする認証情報をシークレットに登録する
GtiHub Actionsのワークフローから別のリポジトリのGitHub Packagesにアクセスするために必要となる認証情報をリポジトリのシークレットに設定します。

::: check
シークレットの登録方法とPersonal Access Token (PAT)の発行方法については説明しません。GitHubのマニュアルやネットに豊富に情報はありますが、筆者として以下が分かりやすくてお勧めです。
- [暗号化されたシークレット - GitHub Docs](https://docs.github.com/ja/actions/security-guides/encrypted-secrets)
- [GitHub「Personal access tokens」の設定方法 - Qiita](https://qiita.com/kz800/items/497ec70bff3e555dacd0) 
  - ※画面キャプチャが少し違うところがありますが雰囲気で分かると思います
:::

認証情報として必要となるのはIDとパスワードの2つになります。また、シークレットを登録する際のシークレット名は任意となります。

IDはそのGitHub Packagesにアクセスする際に利用されるIDとなります。アクセスに利用するIDを例えば筆者であれば`ogiwarat`など特定のユーザに固定する場合は、シークレット値にGitHubのユーザIDを設定します。アクセスするIDは固定ではなく、ワークフローを実行したユーザでよい場合は、実行時の自動で環境変数に割り当てられる`env.GITHUB_ACTOR`を使うことができるため、IDをシークレットに登録する必要はありません。

パスワードはアクセスするPackagesに対してwriteとread権限が付与されたPersonal Access Token (PAT)を設定します。PATがない場合は新たに発行する必要があります。記事ではPATの発行手順は説明しませんが、必要な権限設定は次のようになります。

![capture1](/img/blogs/2023/0219_capture1.drawio.svg)

このシークレットはワークフローの実行に必要なるので、ワークフローを実行するすべてのワークフローを実行するすべてのリポジトリに対して設定します。

今回の例の場合であれば、samaple-parent-bom, samaple-console, samaple-serviceの3つのリポジトリに対して以下の設定がされている状態になります。

![capture2](/img/blogs/2023/0219_capture2.drawio.svg)

:::alert: publicリポジトリの参照(ダウンロード)でもPATは必要
GitHub Packagesは1つのリポジトリにつき、1つの独立したパッケージレジストリが付いてきます。今回の例のようにコードを格納しているリポジトリとは別のGitHub Packagesにモジュールを 書き込む(deploy)のであれば、リポジトリに対する何らかの権限が必要となるのは分かりますが、参照(ダウンロード)する場合でも該当リポジトリに対する参照権限が必要なります。これはなんとpublicリポジトリについても同じです。
また、必要な権限をワークフローに与える方式は今回の例で示しているsetup-javaアクションの`server-password`パラメータでPATを与える方法しかありません。

筆者は感覚的にpublicリポジトリのGitHub Packagesの参照だけなら特別な権限は必要なく自リポジトリの`GITHUB_TOKEN`の権限で大丈夫だろうと思い込んでいたので、モジュールの参照（ダウンロード）で認証エラーが出たところから原因が分からずかなりハマりました。

また、途中で参照権限を与える必要なことが分かりましたが、その与え方がPATしかないことに辿りつくまでこれまた時間が掛かりました。PATは有効期限の問題などもあるので可能であれば避けたいので別の方法を頑張って探しましたが、ないことが分かったので素直にRepository secretsにPATを定義することにしました。

なお、今回は別のリポジトリにあるGitHub PackagesにアクセスするためPATが必要になりましたが、同じリポジトリのGitHub Packagesへのアクセスについては書き込みも含め`GITHUB_TOKEN`権限で行うことができます。
:::

## Packagesに対するsetup-javaアクションの設定
今回の例ではsetup-javaアクションの設定を次のようにやっていますが、この設定の中でPackagesの利用に関する設定はserver-id, server-username, server-password, settings-pathの4つになります。
```yaml
- name: Set up JDK 17
  uses: actions/setup-java@v3
  with:
    java-version: '17'
    distribution: 'temurin'
    server-id: github
    server-username: REPOSITORY_SERVER_USER
    server-password: REPOSITORY_SERVER_PASSWORD
    settings-path: ${{ github.workspace }}
```

setup-javaアクションはこの設定内容をもとにMavenを実行するステップで利用するためのsettting.xmlを`settings-path`で指定されたパスの配下に生成します。今回の例であればワークスペースディレクトリの直下に次のsetteings.xmlが生成されます。

```xml
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0" ...>
  <servers>
    <server>
      <id>github</id>
      <username>${env.REPOSITORY_SERVER_USER}</username>
      <password>${env.REPOSITORY_SERVER_PASSWORD}</password>
    </server>
  </servers>
</settings>
```

設定項目と生成されたsetteings.xmlとのマッピングは見てそのままだと思いますが、ポイントは`username`と`password`に対する設定です。感覚的に先ほど登録したシークレットの値が参照されて、その値がsettings.xmlに直接展開されるように思いますが、そうはなっていません。`username`と`password`に設定されているのは環境変数を参照することを意味する`${env.REPOSITORY_SERVER_USER}`と`${env.REPOSITORY_SERVER_PASSWORD}`です。

GitHub Actionsに慣れている方であればこれを見てsettings.xmlはMavenが読み込み解釈する設定であり`${env.VAL}`の記法はGitHub Actions独自のモノなのでMavenからすれば`${env.xxx}`は単なる文字列でしかないのでは？と思われると思います。

が、しかし、環境変数を参照する`${env.xxx}`のこの表記方は実はMavenも同じです。
したがって、mvnコマンド実行時にsettings.xmlに設定された環境変数が参照されるようになります。ワークフローのmvn実行で次のように`-s`オプションでsettings.xmlを明示的に指定しているのはこのためです。

```yaml
run: mvn -B deploy --file pom.xml -s $GITHUB_WORKSPACE/settings.xml
```

Maven実行時にIDとパスワードが環境変数から取得されるのが分かりましたが、その環境変数とシークレットの値を紐づけているのがmvnコマンドを実行するステップに定義している`env`属性となります。今回の例では次の箇所がこれに該当します。

```yaml
- name: Publish to GitHub Packages Apache Maven
  run: mvn -B deploy --file pom.xml -s $GITHUB_WORKSPACE/settings.xml
  env:
    REPOSITORY_SERVER_USER: ${{ secrets.REPOSITORY_SERVER_USER }}
    REPOSITORY_SERVER_PASSWORD: ${{ secrets.REPOSITORY_SERVER_PASSWORD }}
```
この定義があることでmvn実行時に`env`属性で定義した環境変数を経由してシークレットが参照されるようになります。

:::alert: 認証情報の設定に使う変数名のお約束
上記の仕組みが分かるとワークフローに設定する変数名のお約束が分かってきます。仕組みをもとにこのお約束を整理してまとめると次のようなります。

- setup-javaアクションの`server-username`パラメータと`server-password`パラメータの値にはユーザ名とパスワードの参照に利用する任意の環境変数名を指定する
- リポジトリに登録するシークレット名は任意
- `env`属性で定義するワークフロー環境変数名にはsetup-javaアクションで定義した変数名を使用し、値には登録したシークレットへの参照を指定する

筆者は環境変数とシークレットの紐づけの仕組みをきちんと理解してなかっため、変数名指定の誤りに気がつくのに非常に時間が掛かりました。mvn実行時にPackagesに対する認証エラーが出る場合は上記のお約束を確認してみるとよいです。
:::

# 最後に
コラムで説明したとおりGitHub Packagesはpublicリポジトリでもその参照(ダウンロード)にはPATが必要となるため、Maven Centralのように不特定多数にモジュールを公開するといったことはできません。このため、GitHub Packagesの用途は個人やチーム内での利用に限られますが、言い換えれば個人やチーム内利用であれば十分に利用する価値のあるパッケージレジストリサービスといえます。

---
参照資料

- [Publishing Java packages with Maven - GitHub Docs](https://docs.github.com/en/actions/publishing-packages/publishing-java-packages-with-maven)
- [actions/setup-java: Set up your GitHub Actions workflow with a specific version of Java](https://github.com/actions/setup-java)

