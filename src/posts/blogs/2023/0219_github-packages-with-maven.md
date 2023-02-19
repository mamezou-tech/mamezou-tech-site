---
title: GitHub Packages - マルチレポによるライブラリ管理とGitHub ActionsとMavenを使ったCIの実行
author: toshio-ogiwara
date: 2023-02-19
tags: [java, maven, GitHub, CI/CD]
---

マルチレポで管理しているモジュールのCIを行うにはパッケージレジストリが必要となります。今回はこのパッケージレジストリにGitHub Packagesを使った例を紹介します。

# 記事の背景
Mavenは依存ライブラリをパッケージレジトリから取得しますが、実行対象のモジュール(jar)が他のリポジトリのモジュールに依存している場合、その依存ライブラリはパッケージレジストリ経由で取得する必要があります。このためマルチレポのCIではなんからのパッケージレジトリが必要となります。

これに対してモノレポはすべてのモジュールのコードを1つのリポジトリで管理する方式のため、モノレポのcheckoutで全てのコードを一括で取得できます。これによりCIの実行時にすべてのモジュールをビルトしてローカルリポジトリにインストールするという手が使えるため、マルチレポと違いモノレポではパッケージレジストリがなくてもCIを実行することができます。

GitHubでマルチレポのプロジェクトを作る場合、パッケージレジストリはその手軽さからGitHub Packagesが候補になるかと思います。しかし、実際に使ってみるとハマりどころが多いわりにネットにまとまった情報がなかったりします。そこで今回は自分の備忘も兼ねマルチレポのモジュールをGitHub Packagesを使って管理する際のハマりどころやポイントなどを紹介したいと思います。

# やろうとしていること
細かい説明をする前に、この記事でやろうとしていること、つまり説明のゴールを明確にしたいと思います。

## お題の前提
まずお題の前提としてリポジトリとそこから生成されるモジュール(jar)が次のようになっているプロジェクトがあったとします。

![overview1](/img/blogs/2023/0219_overview1.drawio.svg)

図はsample-console.jarにはsample-service.jarに対する依存があり、sample-parent-pom.jarはsample-console.jarとsample-service.jarの親pomだけを格納したモジュールで、それぞれのモジュールは別々のリポジトリで管理されていることを意味しています。

## お題のゴール
このようなリポジトリとモジュールの関係があるプロジェクトに対して最終的にやりたいことは、それぞれのリポジトリで管理しているモジュールのビルドからテスト、デプロイをGitHub Actionsのワークフローで実行することになります。これを図で表すと次のようになります。


![overview2](/img/blogs/2023/0219_overview2.drawio.svg)

モジュールを管理する上でのポイントはsample-consoleとsample-serviceのビルド時に親pomのsample-parent-pom.jarをGitHub Packagesからダウンロードして取得する必要がある点とsample-consoleはsample-service.jarが必要となる点となります。


# 必要なpomとworkflowの定義(お題の答え)
お題を説明したのでここからはこのお題を実現するために必要となるpomの定義とワークフローの定義をまずは見てもらい、その後に必要な手順や定義を個別に説明しながらハマりどころや注意点などをコラム形式で紹介していくスタイルで説明していきます。

早速必要となるpomとワークフローの定義ですがこれは次のようになります。なお今回の記事で利用したリポジトリやpom定義等は一式GitHubの[こちら](https://github.com/extact-io/github-packages-sample-registry)[^1]に格納してあります。

[^1]: GitHubのサンプルには`sample-console`は`github-packages-sample-console`のようにそれぞれのリポジトリ名の先頭に`github-packages-`を付けています。

- 用意するリポジトリ

|リポジトリ名|用途|
|-----------|---|
|sample-parent-pom|プロジェクトの親pomを格納するリポジトリ|
|sample-console|sample-consoleモジュールのコードを格納するリポジトリ|
|sample-service|sample-serviceモジュールのコードを格納するリポジトリ|
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

それぞれのリポジトリで利用するワーフクロー定義はすべて上記と同じものとなります。

::: check: ワークフロー定義の共通化
今回は難しくならないようにワークフロー定義の共通化は敢えてしていませんが実際に利用する際は共通化した方がよいです。ワークフローの共通化手段はいくつかありますが、今回のケースであれば[こちらの記事](/blogs/2022/03/08/github-actions-reuse-workflows/)で紹介している再利用可能ワークフローが適しています。
:::


ここからは上記の回答例に対する手順の補足やポイントなどを順に説明していきます。

## パッケージレジストリをpomに定義する
Maven Centralしか使わない場合、Mavenがデフォルトでその接続先を知っているためパッケージレジストリ(リポジトリ)をpomに指定することはありませんが、今回はデプロイ先としてsample-registryリポジトリのGitHub Packagesを使うため、pomにリポジトリの指定が必要となります。これは依存ライブラリの取得先として使うリポジトリについても同じとなります。

このデプロイ先のリポジトリ指定はsample-parent-pomモジュールのpomに定義した次の`distributionManagement`タグが相当します。
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

親pomの`distributionManagement`は子側の引き継がれます。今回の例はすべてのモジュールをsample-registryのGitHub Packagesにデプロイするため、子側のsample-consoleとsample-serviceに`distributionManagement`を定義する必要はありません。

次に依存ライブラリの取得先リポジトリの指定ですが、これはsample-consoleとsample-serviceのpomに定義した次の`repositories`タグが相当します。

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

`repositories`タグも`distributionManagement`タグと同様に親pomだけに定義すればよいように思いますが、これは子側のすべてのpomに定義が必要です。今回は親pomも独立したsample-parent-pomモジュールとしているため、子側にその取得先リポジトリの定義がなければ親pom自体を取得することができないためです。

:::alert: snapshot参照があるモジュールでの依存ライブラリのキャッシュはNG
GitHub Actionsのワークフローは毎回クリーンな環境で実行されるメリットがありますが、その反面Mavenのプライグインや依存ライブラリの取得が毎回発生するため、実行に時間が掛かるデメリットがあります。

setup-javaアクションはこのデメリットを解消するため、次回以降のワークフローの実行に備えダウンロードしたライブラリをキャッシュする仕組みを持っています。このキャッシュの仕組みは次のように`cache`属性を指定することで有効になります。

```yaml
uses: actions/setup-java@v3
with:
  java-version: '17'
  distribution: 'temurin'
  cache: 'maven'
```

キャッシュされたライブラリの有効期間は簡単にいうとpomが変更されるまでとなります。したがって、pomを変更しない限り、ライブラリのダウンロードは発生しないため、ワークフローの実行が高速化します。

このキャッシュの有効期間、つまりキャッシュを破棄してライブラリを再取得するタイミングは「pomが変更されない限り必要な依存ライブラリは変わらない」という考えに基づいていると思いますが、これには1つ落とし穴があります。

それは依存関係にsnapshot参照が含まれる場合です。今回の例でいえばsample-consoleがsample-serviceを次のようにsnapshot参照しています。
```xml
<dependencies>
  <dependency>
    <groupId>io.extact</groupId>
    <artifactId>sample-service</artifactId>
    <version>0.0.1-SNAPSHOT</version>
  </dependency>
</dependencies>
```

この依存関係を持つsample-consoleモジュールのビルドでキャッシュを有効した場合、どうなるでしょうか？

sample-serviceモジュールを変更してもsample-console側には反映されないといった問題が発生します。snapshot参照は指定バージョンに対し取得するモジュールを固定せず、常に最新のビルドを取得するMaven固有の機能ですが、キャッシュが有効になっている場合、pomが変更されない限り最新を確認するダウンロードも発生しません。

このためパッケージレジストリには最新版のモジュールが登録されているが、キャッシュが効いているため最新が取得できないといった事象が発生します。よって、この事象を回避するため依存関係にsnapshot参照を持っているモジュールのビルドではキャッシュ機能を使わないほうが無難です。
:::

## 認証情報をシークレットに登録する
GtiHub Actionsのワークフローから別のリポジトリのGitHub Packagesにアクセスするために必要となる認証情報をリポジトリのシークレットに設定します。

::: check: シークレットとPATに関する手順
シークレットの登録方法とPersonal Access Token (PAT)の発行方法は、GitHubの公式マニュアルやネットに豊富に情報があるため説明を割愛します。これらの情報を参照する場合は筆者として以下が分かりやすくてお勧めです。
- [暗号化されたシークレット - GitHub Docs](https://docs.github.com/ja/actions/security-guides/encrypted-secrets)
- [GitHub「Personal access tokens」の設定方法 - Qiita](https://qiita.com/kz800/items/497ec70bff3e555dacd0) 
  - ※画面キャプチャが少し違うところがありますが雰囲気で分かると思います
:::

認証情報としてシークレットに登録が必要なのはIDとパスワードの2つになります。なお、シークレットを登録する際のシークレット名は任意となります。

IDのシークレット値にはGitHubのユーザIDを設定します。アクセスするIDは固定ではなくワークフローを実行したユーザでよい場合はワークフロー実行時に自動で環境変更に割り当てられる`env.GITHUB_ACTOR`を使うことができるため、IDをシークレットに登録する必要はありません。

次にパスワードですが、これには利用するGitHub Packagesに対してwriteとread権限が付与されたPersonal Access Token (PAT)を設定します。PATがない場合は新たに発行する必要があります。記事ではPATの発行手順は説明しませんがPATに必要な権限は次のとおりになります。

![capture1](/img/blogs/2023/0219_capture1.drawio.svg)

登録したシークレットはワークフローの実行に必要となるため、ワークフローを実行するすべてのリポジトリに対して設定します。今回の例の場合であれば、samaple-parent-bom, samaple-console, samaple-serviceの3つのリポジトリに対し以下が設定されている必要があります。

![capture2](/img/blogs/2023/0219_capture2.drawio.svg)


:::alert: publicリポジトリの参照(ダウンロード)にもPATは必要
GitHub Packagesは1つのリポジトリにつき1つの独立したパッケージレジストリが付いてきます。今回の例のようにコードを格納しているリポジトリとは別のリポジトリのGitHub Packagesにモジュールを書き込む(deploy)のであれば、何らかの権限が必要となるのは分かりますが、参照(ダウンロード)する場合でも該当リポジトリに対する参照権限が必要なります。これはなんとpublicリポジトリについても同じです。また、ワークフローに必要な権限を与える方法もsetup-javaアクションの`server-password`でPATを与える方法しかありません。

感覚的にpublicリポジトリのGitHub Packagesの参照だけなら特別な権限は必要なく自リポジトリの`GITHUB_TOKEN`の権限で大丈夫だろうと思い込んでいたので、モジュールの参照(ダウンロード)で認証エラーが出たところから原因が分からずかなりハマりました。また、参照権限が必要なことが分かってもその与え方がPATしかないことに辿りつくまでこれまた時間が掛かりました。PATは有効期限の問題などがあるため可能であれば避けたかったところです。

なお、今回は別のリポジトリのGitHub Packagesを利用するためPATが必要になりましたが、同じリポジトリのGitHub Packagesであれば書き込みも含め`GITHUB_TOKEN`権限で行うことができます。これについては後述のコラムでもう少し詳しく説明します。
:::

## setup-javaアクションの設定
今回の例ではsetup-javaアクションの設定を次のようにしていますが、この中でGitHub Packagesに関する設定は`server-id`, `server-username`, `server-password`, `settings-path`の4つになります。

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

setup-javaアクションはこの設定をもとにMavenの実行に利用するsettting.xmlを`settings-path`で指定されたパスの配下に生成します。今回の例であればワークスペースディレクトリの直下に次のようなsetteings.xmlが生成されます。

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

`id`にはsetup-javaアクションの`server-id`で設定した値がマッピングされます。Mavenはこのidをもとにpomに定義されている`repository`と突合せ接続先情報を取得します。したがって`server-id`に設定する値はpomに定義されている`repository`のidとなります。

`username`と`password`の設定は`id`で指定されたリポジトリに接続する際に使用する認証情報となります。感覚的に先ほど登録したシークレットの値が参照されて、その値がsettings.xmlに直接展開されるように思いますが、そうはなっていません。`username`と`password`に設定されるのは指定した環境変数を参照することを意味する`${env.REPOSITORY_SERVER_USER}`と`${env.REPOSITORY_SERVER_PASSWORD}`です。

GitHub Actionsに慣れている方であればこれをみて`${env.XXX}`の記法はGitHub Actions独自のモノなのでMavenからすれば`${env.xxx}`は単なる文字列でしかないのでは？と思われると思います。

が、しかし、環境変数を参照する`${env.xxx}`のこの記法は実はMavenも同じです。このためmvnコマンド実行時にsettings.xmlに設定された環境変数が参照されるようになります。ワークフローのmvn実行で次のように`-s`オプションでsettings.xmlを明示的に指定しているのはこのためです。

```yaml
run: mvn -B deploy --file pom.xml -s $GITHUB_WORKSPACE/settings.xml
```

Maven実行時にIDとパスワードが環境変数から取得されるのは分かりましたが、その環境変数と実際のIDとパスワードが設定されているシークレットの値を紐づけているのがmvnコマンドの実行ステップで定義している`env`属性となります。今回の例では次の箇所がこれに該当します。

```yaml
- name: Publish to GitHub Packages Apache Maven
  run: mvn -B deploy --file pom.xml -s $GITHUB_WORKSPACE/settings.xml
  env:
    REPOSITORY_SERVER_USER: ${{ secrets.REPOSITORY_SERVER_USER }}
    REPOSITORY_SERVER_PASSWORD: ${{ secrets.REPOSITORY_SERVER_PASSWORD }}
```
この定義があることでmvn実行時に`env`属性で定義した環境変数を経由してシークレットが参照されるようになります。

:::alert: 認証情報の設定に使う変数名のお約束
上記の仕組みが分かるとワークフローに設定する変数名のお約束が分かってきます。このお約束はまとめると次のようなります。

1. setup-javaアクションの`server-username`パラメータと`server-password`パラメータの値には任意の環境変数名を指定可
2. リポジトリに登録するシークレット名は任意に指定可
3. `env`属性で定義する環境変数名には1.で設定した変数名を使用し、値には2.で登録したシークレットへの参照を指定する

筆者は環境変数とシークレットの紐づけの仕組みをきちんと理解してなかっため、変数名の指定誤りに気がつくのに非常に時間が掛かりました。mvn実行時にGitHub Packagesへの認証エラーが出る場合は上記のお約束を確認してみるとよいです。
:::

::: check: 同じリポジトリのGitHub Packagesの利用は簡単
今回はワークフローを実行するリポジトリとは別のGithub Packagesを使うため`server-id`などの設定が必要となりましたが、同じリポジトリのGitHub Packagesを利用する場合はsetup-javaの設定はデフォルトのままでよく、mvnコマンドの実行ステップの環境変数に`GITHUB_TOKEN`を設定するだけで使うことができます。この例は次のようになります。

```yaml
- name: Set up JDK 11
  uses: actions/setup-java@v3
  with:
    distribution: '<distribution>'
    java-version: '11'
- name: Publish to GitHub Packages Apache Maven
  run: mvn deploy
  env:
    GITHUB_TOKEN: ${{ github.token }} # GITHUB_TOKEN is the default env for the password
```

`server-id`には`github`が使われるので、このidに対するpomのリポジトリ設定は必要となります。
:::

# 最後に
コラムで説明したとおりGitHub Packagesはpublicリポジトリでもその参照(ダウンロード)にはPATが必要となるため、Maven Centralのように不特定多数にモジュールを公開するといった利用はできません。このため、GitHub Packagesの用途は個人やチーム内での利用に限られます。しかし、これは言い換えると個人やチーム内の利用であればその手軽さから十分に利用する価値があるパッケージレジストリサービスともいえます。

また、GitHub Packagesは今回紹介した以外にも色々な使い方ができます。setup-javaアクションの公式ページには設定項目の詳細やパターンに応じた設定例など豊富に記載されているため、なにか調べたいことがあればまずは[こちら](https://github.com/actions/setup-java)の公式ページを見るのが一番の近道です。

今回はJavaのモジュールを例にした紹介となりますが、GitHub PackagesではJavaに限らず様々なモジュールに対するパッケージレジストリとして使うことができます。npmモジュールでの使い方については同じ豆蔵デベロッパーサイトの[こちらの記事](/blogs/2022/07/11/deploy-to-github-packages/)で紹介してますのでnpmモジュールを使う際はこちらを見ていただければと思います。

---
参照資料

- [Publishing Java packages with Maven - GitHub Docs](https://docs.github.com/en/actions/publishing-packages/publishing-java-packages-with-maven)
- [actions/setup-java: Set up your GitHub Actions workflow with a specific version of Java](https://github.com/actions/setup-java)

