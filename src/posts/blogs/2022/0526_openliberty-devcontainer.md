---
title: OpenLibertyとVSCodeによるコンテナを用いた開発環境の構築
author: toshio-ogiwara
date: 2022-05-26
tags: [container, vscode]
---
昨今の開発ではコードの修正が即反映されデバックも行えるHot Reloadの仕組みが当たり前になっていますが、これをコンテナを使ったJava開発で行おうとした場合、変更をどのように即座にコンテナ側に反映させるかが少し悩ましかったりします。

この問題の解としてはIDEのビルド出力フォルダをコンテナ側でマウントし直接参照させる方法がありますが、アプリケーションサーバを使ったWebアプリケーションの場合、IDEがビルドした結果をwarアーカイブにする必要があるため、単にマウントした出力フォルダをアプリケーションサーバから参照させるだけでは問題は解決できません。

この問題に対する一般的な解にはなりませんが、OpenLiberty(Liberty)ではその辺をうまくやってくれるMavenのliberty-maven-pluginが提供されています。また、開発で使うにはコンテナ内のアプリケーションに対するステップ実行などIDEを使ったデバッグが必要となりますが、これはVSCodeを使うことで簡単に行うことができます。

ということで今回はコンテナを使った開発環境の一例として、Libertyとliberty-maven-pluginによるコンテナ連携とVSCodeによるコンテナアプリのデバッグ方法を紹介します。


## 使うもの
- Maven
- VSCode
- Docker Desktop

LibertyとJDKはコンテナイメージ内のものを使うためローカルに用意する必要はありません。

## 開発環境のゴールイメージ
最初に今回の説明で作ろうとしている環境のゴールイメージを示しておくと次のようになります。

![イメージ](/img/blogs/2022/0526_openliberty-devcontainer-image.drawio.svg)

必要な手順や設定は順を追って説明してきますが、大まかな手順としては
1. liberty-maven-pluginの追加
2. server.xmlの配置
3. Dockerfileの作成
4. コンテナの起動
5. アクションの実行（任意）
6. デバッグの実行

となります。説明には予めこちらで用意した以下のサンプルを使用しますが、既にあるプロジェクトでも同じ手順を実施すればイメージの環境をつくることができると思います。

- <https://github.com/extact-io/openliberty-devcontainer-sample>

## Step1: liberty-maven-pluginの追加
プロジェクトで使用しているpomにliberty-maven-pluginを追加します。必要な設定は以下のとおりです。特に変える必要はありませんので、そのままコピペで問題ありません。（バージョンは現時点での最新ですが、より最新のものがあればお好みで変えてもOKです）

```xml
<plugin>
    <groupId>io.openliberty.tools</groupId>
    <artifactId>liberty-maven-plugin</artifactId>
    <version>3.5.1</version>
</plugin>
```

## Step2: server.xmlの配置
コンテナ内のLibertyで使用するserver.xmlをソースツリーの`/src/main/liberty/config`に配置します。後ほど説明するDockerfileを見れば分かりますが`/src/main/liberty/config`に配置したファイルはコンテナの`${WAS_HOME}/usr/servers/defaultServer`直下にCOPYされます。ですので、環境変数や起動オプションを設定したい場合はserver.envやjvm.optionsをserver.xmlと同じフォルダに配置しておくことで有効になります。

server.xmlは他の環境のLibetryで使っているものを利用することも可能ですが、ここではサンプルアプリで利用しているシンプルな以下のserver.xmlをもとに必要な設定を説明します。

```xml
<server description="Sample Liberty server">
  <featureManager>
    <feature>restfulWS-3.0</feature>
    <feature>jsonp-2.0</feature>
    <feature>jsonb-2.0</feature>
    <feature>cdi-3.0</feature>
  </featureManager>
  <variable name="default.http.port" defaultValue="9080" />
  <variable name="default.https.port" defaultValue="9443" />
  <!-- location属性とcontextRoot属性は適宜修正する-->
  <webApplication location="openliberty-person-sample.war" contextRoot="/dev" />
  <httpEndpoint host="*" httpPort="${default.http.port}" httpsPort="${default.https.port}"
    id="defaultHttpEndpoint" />
</server>
```


環境ごとに変更が必要な箇所は`webApplication`タグの部分となります。liberty-maven-pluginはコンテナイメージをビルドする際にwarファイルの実体ではなく、pomの情報をもとにアプリが参照するclassファイルやjarファイルへのパスを記述した設定ファイルを`${project.artifactId}.war.xml`[^1]のファイル名で作成します。ですので、`location`属性にはwarファイルのパスではなく、liberty-maven-pluginが生成する設定ファイルのファイル名、つまりpomに指定しているartifactIdに.war.xmlを付けた値を設定します。サンプルではコンテキストルートを`/dev`としていますが、コンテキストルートは任意ですので、`contextRoot`タグにはコンテキストルートとして利用したい任意の文字列を設定します。

[^1]:${project.artifactId}はpomのprojectタグ直下のartifactIdの値となることを意味しています。

liberty-maven-pluginに関係する設定は`webApplication`タグのみです。Libertyで利用するfeatureなどを含め、後はliberty-maven-pluginに関係ない設定となるので（もちろん動作する範囲で）任意の設定を追加／変更が可能です。

## Step3: Dockerfileの作成
準備の最後としてコンテナイメージをビルドするDockerfileをプロジェクト直下に作成します。サンプルアプリでも利用している必要最小限の内容[^2]を示すと次のとおりになります。

[^2]: OpenLiberty公式の[guide-getting-started](https://github.com/OpenLiberty/guide-getting-started/blob/prod/finish/Dockerfile)をもとにコンテナ動作に不要な記述を削除したものになります。

```dockerfile
FROM icr.io/appcafe/open-liberty:full-java11-openj9-ubi

COPY --chown=1001:0 src/main/liberty/config/ /config/
COPY --chown=1001:0 target/*.war /config/apps/

RUN configure.sh
```

変更が必要な個所はありませんので、この内容をそのまま配置してもOKです。ベースイメージには[公式のサンプル](https://github.com/OpenLiberty/guide-getting-started/blob/prod/finish/Dockerfile)で利用されているイメージを使っていますが、LibertyやJDKのバージョンが違うイメージ[^3]を指定することも可能です。

なお、この設定を見て「これだとソースの修正都度、イメージを再生成しないとダメじゃん・・」と思う方がいるかと思いますが、このDockerfileはliberty-maven-pluginが生成する別のDockerfileの元ネタとして参照されるだけでイメージのビルドにはliberty-maven-pluginが生成したDockerfileファイルが利用されます。この仕組みの詳細は後ほど説明します。

[^3]: Docker Officat Imageの`websphere-liberty:22.0.0.3-full-java11-openj9`を試したところ問題なく動きました。試してはいないですが`https://icr.io/v2/appcafe/open-liberty/tags/list`から取得したリストから適当なものを選んでも動作すると思います。

## Step4: コンテナの起動
ここまでで準備は完了です。それではMavenコマンドを使ってコンテナを起動してみましょう。起動はコンソールから以下のコマンドを実行します。このMavenコマンドはVSCodeとは全く関係ないため、VSCode以外のコンソールから実行しても問題ありません。

```shell
mvn liberty:devc
```


初回実行時はコンテナイメージの取得が行われるため時間が掛かりますが、待っていれば次のように起動が完了します。

```shell
[INFO] ************************************************************************
[INFO] *    Liberty is running in dev mode.
[INFO] *        To run tests on demand, press Enter.
~~ 省略 ~~
[INFO] *    Docker network information:
[INFO] *        Container name: [ liberty-dev-1 ]
[INFO] *        IP address [ 172.17.0.2 ] on Docker network [ bridge ]
[INFO] ************************************************************************
[INFO] [AUDIT   ] CWWKT0017I: Web application removed (default_host): http://94ed2507248f:9080/dev/
[INFO] Source compilation was successful.
[INFO] [AUDIT   ] CWWKZ0009I: The application openliberty-person-sample has stopped successfully.
[INFO] Tests compilation was successful.
[INFO] [AUDIT   ] CWWKT0016I: Web application available (default_host): http://94ed2507248f:9080/dev/
[INFO] [AUDIT   ] CWWKZ0003I: The application openliberty-person-sample updated in 20.941 seconds.
```


起動完了後はローカルのソースコードの変更がLibertyにより追跡[^4]され、コードを修正した場合、次のように即座に修正がコンテナ内のLibertyに反映されます。よって、コードの修正ごとにコンテナを終了し、ビルドをしなおして起動といったことが不要となります。

[^4]:厳密には追跡されているのはソースファイルではなくコンパイル出力フォルダに出力されたclassファイルなどのモジュールになります。

```shell
[INFO] Source compilation was successful.
[INFO] [AUDIT   ] CWWKT0017I: Web application removed (default_host): http://0f76c0c1c902:9080/dev/
[INFO] [AUDIT   ] CWWKZ0009I: The application openliberty-person-sample has stopped successfully.
[INFO] [AUDIT   ] CWWKT0016I: Web application available (default_host): http://0f76c0c1c902:9080/dev/
[INFO] [AUDIT   ] CWWKZ0003I: The application openliberty-person-sample updated in 4.363 seconds.
```

:::check
コンテナに起動オプションを指定したい場合、liberty-maven-pluginの設定に次のように追加することができます。
```xml
<groupId>io.openliberty.tools</groupId>
<artifactId>liberty-maven-plugin</artifactId>
<version>3.3.4</version>
<configuration>
  <dockerRunOpts>-e ENV_VAR=exampleValue</dockerRunOpts>
</configuration>
```

指定可能なオプションについては以下が参考になります。
- [OpenLiberty : Using Docker containers to develop microservices](https://openliberty.io/guides/docker.html)
- [GitHub : OpenLiberty/ci.maven - devc, Container Mode](https://github.com/OpenLiberty/ci.maven/blob/main/docs/dev.md#devc-container-mode)
:::

## Step5: アクションの実行（任意）
起動コンソールはログの出力が完了すると実はヒッソリと入力待ち状態になっています。最初は全く気がつきませんでしたが（環境に依るかもしれませんが）よく見るとカーソルが点滅しています。

これはliberty-maven-pluginの機能によるものでキー入力を行うことで次の3つのアクションが実行できるようになっています。
|入力|アクション|
|---|-----|
|Enter|（次の）テストを実行します|
|`r` + Enter |サーバを再起動します|
|Control-`c` or<br>`q` + Enter |サーバを終了します|

Enterによるテストの実行には内部的に[Maven Failsafe Plugin](https://maven.apache.org/surefire/maven-failsafe-plugin/)が使われているようで、クラス名のsuffixが”IT”のテストクラスが実行されます。実行時の動作は次のようになります。

```shell
[INFO] Running unit tests...
[INFO] Unit tests finished.
[INFO]
....
[INFO] Running integration tests...
[INFO]
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running io.extact.openliberty.sample.webapi.resource.PersonResourceIT
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 7.998 s - in io.extact.openliberty.sample.webapi.resource.PersonResourceIT
[INFO]
[INFO] Results:
[INFO]
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] Integration tests finished.
[INFO]
[INFO] To run tests on demand, press Enter.
```


なお、このテストクラスはアプリケーションサーバとは別のプロセスで実行されるため、CDIコンテナからCDIインスタンスを取得しCDIを直接テストするといったことはできません。したがって、用途としては以下のようなアプリの外部からRESTで呼び出して結果を検証するといったものになると思われます。

```java
public class PersonResourceIT {
    private static final String TARGET_URL = "http://localhost:9080/dev/api/persons";
    @Test
    void testGet() {
        var expected = new Person(1L, "taro", 12);
        // @Cleanup is the effect of loombok.
        @Cleanup var client = ClientBuilder.newClient();
        @Cleanup var response = client
                .target(TARGET_URL)
                .path("{id}")
                .resolveTemplate("id", 1)
                .request()
                .get();
        var actual = response.readEntity(Person.class);
        assertEquals(expected, actual);
    }
    ...
}
```

## Step6: デバッグの実行
コンテナ内のLibertyはデバッグモードで起動しているため、デバッカを接続すればいつでもデバッグが可能です。ということで、ここでやっとVSCodeの出番となります。それではVSCodeをLibertyに繋いでみましょう！

### launch.jsonに接続エントリを追加する
プロジェクト直下の`/.vscode/launch.json`ファイルに以下の`"type": "java"`をブロックごと追加します。なお、launch.jsonがない場合はファイルを作成して以下の内容を丸々コピーします。

```json
{
    "configurations": [
        {
            "type": "java",
            "name": "Attach Liberty in Container",
            "request": "attach",
            "hostName": "localhost",
            "port": 7777
        },
    ]
}
```


デフォルトではローカルホストの7777ポートでデバッグポートがListenされるようになっています。ですので、この設定はデバッグポートにVSCodeのデバッカを接続するという内容になります。

### コンテナに接続する
launch.jsonの設定を行った後に [実行とデバッグ]ビューを開くとビューの上部に「▷Attach Liberty in Container」が現れるので、コンテナが起動している状態でこの部分をクリックします。VSCodeがコンテナ内のLibertyにアタッチ（接続）されデバッグが可能になります。

![image1](https://i.gyazo.com/34adda6f650e457daf4e02cb95835948.png)

デバッグしているアプリはコンテナ内のLiberty上で動作していますが、デバッグはローカルでmainメソッドから起動したアプリと同じように行えます。特別な操作はありませんので、好きなところにブレークポイントを置いてデバッグすることができます。

![image2](https://i.gyazo.com/57bcfbd84c0afb8118b89881d4f4af6e.png)

ここまでの手順でゴールイメージとしていた開発環境ができました🙌

次からはどんな仕組みで開発環境が動いているのか、そのカラクリについて見ていきます。

## コンテナイメージのビルドから実行までの仕組み
`mvn liberty:devc`のコマンドを実行したときのコンソールログを見てみると、コンテナイメージのビルド(docker build)と実行(docker run)が行われているのが分かります。

この時に実行されているビルドコマンドを抜きだすと、以下のようになっており、なにやら「[dockerfileの作成](#step3-dockerfileの作成)」で作成したDockerfileとは別のファイルをもとにイメージをビルドしているのが分かります。

```shell
docker build --pull 
  -f <project.home>/target/.libertyDevc/tempDockerfile18301555174951279632
  -t openliberty-person-sample-dev-mode 
  <project.home>
```
（<project.home>は実行しているプロジェクトのホームディレクトリになります）

そこで、この`tempDockerfile18301555174951279632`の中身を見てみると次のようになっています。なお、tempDockerfileの後ろの数字は出力例でビルドの都度変わりますので適宜読み替えてください。

```dockerfile
FROM icr.io/appcafe/open-liberty:full-java11-openj9-ubi
COPY --chown=1001:0 src/main/liberty/config/ /config/
ENV OPENJ9_SCC=false
RUN configure.sh
```

「[dockerfileの作成](#step3-dockerfileの作成)」でも少し触れましたが、パスが`\target\.libertyDevc`となっていることからも分かる通り、このファイルは`./Dockerfile`をもとにliberty-maven-pluginが生成したものとなります。

この生成されたファイルと`./Dockerfile`を見比べると`target/*.war `をCOPYしている部分がありません。したがって、イメージにはLibertyやJDKを含めた実行環境と自分たちで準備したserver.xmlが含まれるだけでアプリの実体は含まれていません。では実行するアプリはどうようにしてるのでしょうか？ということで、今度はコンソールログの出力からコンテナイメージを実行しているコマンドを見てみましょう。実行しているコマンドを抜き出すと次のとおりになっています（見やすいように整形しコメントを追加しています）。

```shell
docker run 
  --rm 
  # HTTPポートの公開
  -p 9080:9080
  # HTTPSポートの公開
  -p 9443:9443
  # デバッグポートの公開
  -p 7777:7777
  # デバッガでアタッチされるまで起動を待つか
  -e WLP_DEBUG_SUSPEND=n
  # デバッガポートの指定
  -e WLP_DEBUG_ADDRESS=7777
  # リモートホストからのデバッグポートの接続を許可するか
  -e WLP_DEBUG_REMOTE=y
  # ローカルのappsディレクトリをLibertyのappsディレクトリとしてマウント
  -v <project.home>/target/.libertyDevc/apps:/config/apps
  # ローカルのdropinsディレクトリをLibertyのdropinsディレクトリとしてマウント
  -v <project.home>/target/.libertyDevc/dropins:/config/dropins
  # ローカルのプロジェクトディレクトリ全体をコンテナ側にマウント
  -v <project.home>/:/devmode
  # ローカルのlogsディレクトリをLibertyのログ出力ディレクトリとしてマウント
  -v <project.home>/target/liberty/wlp/usr/servers/defaultServer/logs:/logs
  # ローカルのMavenリポジトリをコンテナ側にマウント
  -v <user.home>/.m2/repository:/devmode-maven-cache
  --name liberty-dev-1 openliberty-person-sample-dev-mode server
  debug defaultServer
  -- --io.openliberty.tools.projectRoot=/devmode
```
（<project.home>は実行しているプロジェクトのホームディレクトリ、<user.home>はログインユーザのホームディレクトリになります）

まず分かりやすいところから見ていくと`-p`オプションでHTTPポート(9080)、HTTPSポート(9443)、デバッグポート(7777)がマッピングされています。これでローカル側のブラウザやVSCodeからコンテナ内のLibertyにアクセスできるようになります。

次に注目すべきは`-v`オプションの`<project.home>/target/.libertyDevc/apps:/config/apps`のボリュームマウント指定です。マウント先の`/config`をコンテナに入って確認すると`/config`にはシンボリックリングが張られており、そのリンク先は次のようになっています。

```shell
bash-4.4$ ls -al /config
lrwxrwxrwx 1 default root 37 May 12 18:47 /config -> /opt/ol/wlp/usr/servers/defaultServer
```

よって、マウントポイントの`/config/apps`は`/opt/ol/wlp/usr/servers/defaultServer/apps`となります。これはLibertyをご存じな方にはお馴染みですが、Libertyにおけるwarファイルの配置ディレクトリになります。

ですので、このボリュームマウント指定はローカルの`./target/.libertyDevc/apps`ディレクトリをコンテナ内のLibertyのアプリケーション配置ディレクトリとしてマウントする指定となり、結果`./target/.libertyDevc/apps`に配置したものがコンテナ内のLibertyにアプリケーションとして認識される仕組みとなっています。

では、ローカル側、つまりliberty-maven-pluginはなにをappsに置いているのでしょうか？ということで`./target/.libertyDevc/apps`を見てみると「[serverxmlの配置](#step2-serverxmlの配置)」でserver.xmlの`webApplication`タグで指定した`openliberty-person-sample.war.xml`が置かれています。そして中身は次のようになっています。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<archive>
  <dir sourceOnDisk="<project.home>/src/main/webapp" targetInArchive="/"/>
  <dir sourceOnDisk="<project.home>/target/classes" targetInArchive="/WEB-INF/classes"/>
  <file sourceOnDisk="<user.home>/.m2/repository/org/projectlombok/lombok/1.18.22/lombok-1.18.22.jar" targetInArchive="/WEB-INF/lib/lombok-1.18.22.jar"/>
  <file sourceOnDisk="<project.home>/target/tmp/META-INF/MANIFEST.MF" targetInArchive="/META-INF/MANIFEST.MF"/>
</archive>
```

細かい説明は省きますが、雰囲気的にwebアプリケーションを構成するclassファイルやjarファイルへのパスが書かれているのが分かります。つまり、liberty-maven-pluginはwarアーカイブの替わりにその内容に相当するclassファイルやjarファイルの実体の在りかを記述したxmlファイルを生成し、それをLiberty側に認識させるようにしています。

よって、コンテナ内のLibertyがアプリとして参照しているものはwarファイルではなく、ローカル側のVSCode(Maven)のコンパイル出力ディレクトリとなり、結果VSCodeによる変更がコンテナ内のLibertyに即座に反映される仕組みとなっています。なるほどよくできていますね。

なお、liberty-maven-plugin が生成している*.war.xml形式のファイルはLiberty固有なため他のアプリケーションサーバでは使えません。逆にこの実体参照の仕組みがあることでLibertyはこのような仕組みを実現できているとも言えます。

:::column:VSCode以外のIDEの利用について
今回はコンテナに接続するデバッガにVSCodeを使用しましたが、EclipseなどリモートデバッグがサポートされているIDEであれば代替は可能です（が、VSCodeが一番簡単にできます）。

参考までに筆者はJavaのコードはEclipseを使って書きます。なんだかんだ言ってもEclipseはリファクタリング機能も含めコードエディタがよくできているため、いまだにガッツリ本気でコードを書く際はEclipseを使ってます。が、、残念ながらそれ以外は昨今のIDEの機能としては少し残念な感じは否めません。特にGitやコンテナに対する支援機能(プラグイン)は業務で利用するには厳しいモノがあります。このため、最近はコードがそこそこ動くような状態になった後はVSCodeで作業をするようになってきました。Dockerの支援機能はコマンド要らずでホボぼストレスなくすべてのことができますし、Git GraphをはじめとしたGitの支援機能は最高の一言です。

このようなことからコンテナを使った開発環境であればVSCode一択のため記事で取り上げるIDEとしてVSCodeを選択しています。なお、有償も含めるのであればIntelliJ IDEAが間違いなく最上であることは言うまでもありません。
:::

## まとめ
ローカルの環境を汚したくないなどといった事情がないのであれば、普段使いの環境としては今回紹介したようなコンテナ環境ではなく、ローカルに必要なものをインストールして開発を行う従来のスタイルの方が正直なところ効率が良かったりします。

しかし、昨今のJava開発はJDKに代表されるようにリリースサイクルが短くなってきているため、お試しでバージョンを上げてみるといったようなことは頻繁に行うようになってきました。

このような場合に普段使いのローカル環境を汚さず、かつ何かあったときに今回のようなデバッグ＆反映が即座にできる環境を用意しておくとよいのではないでしょうか。

今回の内容はLibertyに特化しているものとなっていますが、Java開発におけるコンテナの利用法といった点では参考にできる部分があるのではと思います。

---
参照資料

- [OpenLiberty : Getting started with Open Liberty](https://openliberty.io/guides/getting-started.html)
- [OpenLiberty : Using Docker containers to develop microservices](https://openliberty.io/guides/docker.html)
- [GitHub : OpenLiberty/ci.maven - devc, Container Mode](https://github.com/OpenLiberty/ci.maven/blob/main/docs/dev.md#devc-container-mode)
