---
title: 今さら聞けないMaven – コンテナも一緒にビルドしたい。テスト実行前にコンテナを起動したい
author: toshio-ogiwara
date: 2022-08-31
tags: [java, maven, junit, 今さら聞けないMaven, container]
templateEngineOverride: md
---

Javaの開発ではMavenなどのビルドツールでビルドやテストの手順を定義し実行するのが一般的ですが、コンテナも一緒にビルドしたいなぁと思うときはありませんか？また、マイクロサービスの普及に伴ってREST通信を行う処理が多くなってきましたが、REST通信部分のテストは手間が掛かるので、いっその事、スタブにコンテナを使いたいけど、テスト実行前にコンテナを起動するにはどうしたらいいんだろう？など、今回はそんなMavenからのコンテナ操作をfabric8のdocker-maven-pluginを使って実現する方法を紹介します。

記事はコードや設定の一部の記載となります。今回の記事で使用したサンプルは一式以下のGitHubに格納しています。全体を見たい場合や動作を確認したい場合はこちらを参照ください。
- <https://github.com/extact-io/docker-with-maven>

:::info:今さら聞けないMaven
Mavenが誕生してから早20年ですが、開発で使っていると未だにハマってしまうことやコレってどうやるのだろう？と思うことがあったりします。そんなハマった！できた！こうやった！的な今さら大きな声で聞けない、言えないMavenのあれこれを備忘を兼ねライトに紹介してきたいと思います。他の記事は [こちら](/tags/今さら聞けないMaven)からどうぞ。
:::

[[TOC]]

## コンテナイメージのビルド
はじめにMavenでビルドした成果物（アプリ）からコンテナイメージをビルドする方法を紹介します。

ここではコンテナイメージを生成するアプリとして"hello!"を返す Jakarta RESTful Web Services(旧JAX-RS) で作られたごく簡単なRESTサーバアプリを使って説明していきます。(アプリの説明は本題ではないのでコードは雰囲気程度の理解で大丈夫です)

```java
@ApplicationScoped
@Path("hello")
public class HelloResourceImpl implements HelloResource  {
    @Override
    public String hello() {
        return "hello!";
    }
}
```

このRESTアプリはJDKがローカルにインストールされていればjavaコマンドから実行可能なExecutable JarとしてMavenで次のようにビルドされています（targetディレクトリはMavenのビルド成果物の出力ディレクトリになります）

- targetディレクトリ直下にアプリ本体のhello-server.jarが作られる
- target/libsディレクトリに実行に必要なすべての依存ライブラリがコピーされる
- アプリは`java -jar hello-server.jar`で起動できるようにmainクラスとclasspathが設定されたMANIFESTファイルがhello-server.jarに同梱されている




### コンテナイメージをビルドするdockerプラグインの設定
では、このExecutable JarなRESTアプリをMavenでコンテナ化、つまりコンテナイメージをビルドする方法を見ていきます。

今回紹介するfabric8のdocker-maven-plugin（dockerプラグイン）にはコンテナイメージをビルドする方法が2つあります。

1つはDockerfileをもとにビルドする方法、もう1つはpomの定義をもとにビルドする方法となります。後者はDockerfile不要でコンテナイメージをビルドできる素敵な方法なのですが、その代わりとしてそれなりな数のdockerプラグイン固有の設定が必要となり学習コストが掛かります。

ですので、今回はDockerfileがあれば簡単にコンテナイメージがビルドできる前者のDockerfileをもとにビルドする方法を紹介します。後者のpomの定義をもとにビルドする方法は後ほどコラムで簡単に紹介します。

早速そのDockerfileですが、上で説明したMavenのビルド成果物からコンテナイメージをビルドする定義として次のDockerfileを使います（簡単な定義のため説明は割愛します）

```dockerfile
# ベースイメージはeclipse-temurin(旧OpenJDK)のJava17を使用
FROM eclipse-temurin:17-jre-alpine
# ホストOSのMavenのビルド成果物をコンテナイメージに格納
WORKDIR /
COPY ./target/hello-server.jar ./
COPY ./target/libs ./libs
# Executable Jarなのでjavaコマンドでサーバを起動
CMD ["java", "-jar", "hello-server.jar"]
# 公開ポートの指定
EXPOSE 7001
```

このDockrefileをもとにMavenでコンテナイメージをビルドできるようにpomの`build`タグに次のようにdockerプラグインを定義します。

```xml
<build>
  <plugins>
    <plugin>
      <groupId>io.fabric8</groupId>
      <artifactId>docker-maven-plugin</artifactId>
      <version>0.40.2</version>
      <configuration>
        <images>
          <image>
            <name>io.extact/hello-server</name>
            <build>
              <tags>
                <tag>latest</tag>
                <tag>${project.version}</tag>
              </tags>
              <contextDir>${project.basedir}</contextDir>
            </build>
          </image>
        <images>
      <configuration>
    </plugin>
    ...
  </plugins>
</build>
```

dockerプラグインはビルド方法を定義する`configuration`タグにある`contextDir`タグのディレクトリにあるDockerflieをもとにコンテナイメージを生成し、生成したイメージを`name`タグと`tags`タグの内容でローカルレジストリに登録します。

また`tags`タグの指定がない場合はデフォルトでlatestが付けられます。dockerプラグインにはこの他にも豊富な指定が用意されています。他の設定項目やデフォルト値を知りたい場合は[公式マニュアル](http://dmp.fabric8.io/)を参照してみてください。

pomの定義ができたので、次はdockerプラグインを実行し実際にコンテナイメージが生成される様子を見ていきます。

dockerプラグインはどのフェーズにも割り当てていないので、コンテナイメージのビルド実行には次のようにdockerプラグインのbuildゴールを直接指定します。

`mvn clean package docker:build`

このMavenコマンドはcleanした後にpackageフェーズを実行し、targetディレクトリに生成された成果物をもとに`docker:build`ゴールでコンテナイメージを生成する指定となります。

コンソールにはコンテナイメージの生成を行った次のログが出力されます。このログが出力されればコンテナイメージの生成は成功です。

![コンソールログ1](/img/blogs/2022/0831_docker-w-maven-log1.png)

`docker images`コマンドで実際に生成されたイメージを確認することができます。
![コンソールログ2](/img/blogs/2022/0831_docker-w-maven-log2.png)


この他にも設定を追加することで、Docker Hubなどの外部のコンテナレジストリへの登録もできますし、タグについても細かく設定することも可能です。ですので、Mavenでビルドした後に別で行っていたコンテナイメージのビルドと登録はほとんどの場合、ビルドと一緒にMavenコマンド一発でできるようになります。

:::column:Dockerfileを使用しないコンテナイメージのビルド
冒頭でdockerプラグインを使ったビルド方法は2つあると言いました。ここではもう一つのDockerfileを使用しないpom定義によるビルド方法がどのようなものかを簡単に説明します。上で説明したDockerfileをもとにしたビルド方法と同様なことを行うpom定義は次のようになります。

```xml
<image>
  <name>io.extact/hello-server</name>
  <build>
    <from>eclipse-temurin:17-jre-alpine</from>
    <assemblies>
      <assembly>
        <descriptorRef>release-dependencies</descriptorRef>
        <targetDir>/libs</targetDir>
      </assembly>
      <assembly>
        <descriptorRef>artifact</descriptorRef>
        <targetDir>/</targetDir>
      </assembly>
    </assemblies>
    <cmd>java -jar hello-server.jar</cmd>
  </build>
</image>
```

この方法のポイントは`assembly`タグでコンテナイメージへ格納するものを指定していくところになります。格納するモノの指定にはMavenと連携したアセンブリパターンがいくつか用意されており、パターンは`descriptorRef`タグで指定します。上の例は`release-dependencies`にマッチするもの(＝実行時に必要な依存ライブラリすべて)を`/libs`ディレクトリに格納し、`artifact`にマッチするもの（＝生成したアーティファクト、つまり生成したjarファイル）を`/`ディレクトリに格納するといった指定をしています。

pom定義をもとにしたビルド方法はMavenと連携しtargetディレクトリや生成したアーティファクトなどMavenが認識しているものを抽象化して扱うことができるため、Dockerfileのように物理的な生々しいパスの指定を少なくすることができるため、targetディレクトリやアーティファクト名を変更してもコンテナイメージのビルド定義は変更せずに済みます。

このようにpom定義をもとにしたビルド方法のメリットは十分理解できるのですが、それにはDockerfileの個々の定義に相当するdockerプラグインの細かい設定を理解しなければないらないため、個人的にはDockerfileをもとにしたビルドの方が現実的と考えています。
:::

## テスト実行前にコンテナを起動したい
上の説明で"hello!"を返す簡単なRESTサーバーアプリをコンテナ化してみましたが、このREST APIを呼び出す次のようなRESTクライアントアプリがあった場合、皆さんならどのようにテストしますか？

```java
@ApplicationScoped
public class AppService {
    private HelloServerClient helloClient;
    @Inject
    public AppService(@RestClient HelloServerClient helloClient) {
        this.helloClient = helloClient;
    }
    public String getHello() {
        return helloClient.hello();
    }
}
```

:::check
サンプルのRESTクライアントアプリはインタフェースベースでREST APIを呼び出すことができるMicroProfileのRestClientの機能を使っています。今回の記事の本題からは逸れるため説明は割愛しますが、詳しく知りたい方は以下の記事を参照ください。とっても便利でお勧めです。
- [第7回 らくらくMicroProfile RestClient](/msa/mp/cntrn07-mp-restclient/)
:::

### 起動停止を行うdockerプラグインの設定
Mockライブラリを使ったり、スタブクラスを作ったりして単体テストを行っていたとしても、対向システムとなるRESTサーバアプリがコンテナ化されて簡単に動作させられるのならコンテナと繋いだテストをしてみたいですよね！

ということで、今度はdockerプラグインで先ほど作ったhello-serverコンテナをテスト実行前に起動しテスト終了後に停止する例を紹介します。

テスト実行前後にコンテナの起動停止を行う場合、そのコンテナを呼び出す側（今回の例ではRESTクライアントアプリ側）のpomに次の定義を追加します。

```xml
<build>
    <plugins>
        <!-- dockerプラグインの設定 -->
        <plugin>
            <groupId>io.fabric8</groupId>
            <artifactId>docker-maven-plugin</artifactId>
            <version>0.40.2</version>
            <!-- 起動コンテナの設定 -->
            <configuration>
                <images>
                    <image>
                        <name>io.extact/hello-server</name>
                    </image>
                </images>
            </configuration>
            <!-- フェーズとゴールの割り当て -->
            <executions>
                <execution>
                    <id>start</id>
                    <phase>pre-integration-test</phase>
                    <goals>
                        <goal>start</goal>
                    </goals>
                </execution>
                <execution>
                    <id>stop</id>
                    <phase>post-integration-test</phase>
                    <goals>
                        <goal>stop</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
        <!-- failsafeプラグインの設定 -->
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-failsafe-plugin</artifactId>
            <version>3.0.0-M7</version>
            <executions>
                <execution>
                    <goals>
                        <goal>integration-test</goal>
                        <goal>verify</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
        ...
    </plugins>
</build>
```

必要となる定義はコレだけです。コンテナを使ったテストを行う場合は、前処理の`pre-integration-test`フェーズと後処理の`post-integration-test`フェーズが実行される`integration-test`フェーズでfailsafeプラグインでテストを実行するようにします。

次にdockerプラグインには`pre-integration-test`フェーズにコンテナを起動する`start`ゴールを、`post-integration-test`フェーズにはコンテナを停止する`stop`ゴールを`execution`タグで割り当てます。

この定義により`mvn clean verify`コマンドで`integration-test`フェーズのテスト実行前に`name`タグで指定したコンテナイメージが起動し、テスト終了後に起動したコンテナが終了削除されるようになります。

:::info:failsafeプラグインとsurefireプラグインの違い
failsafeプラグインはtestフェーズで使われるsurefireプラグインと基本的に機能は同じですが、以下の2点が異なります。
- テストが失敗した場合、surefireプラグインはMavenの処理自体を終了するのに対して、failsafeプラグインではテストが失敗してもMavenは終了せず、後続のフェーズが続行される
- デフォルトのテスト実行対象のクラス名がsurefireプラグインは"Test"なのに対して、failsafeプラグイン"IT"となる

integration-testフェーズでfailsafeプラグインでテストを実行するのは、テストが失敗してもpost-integration-testフェーズで停止処理が行われるようにするためです。
:::

### とっても便利なwait処理

これでめでたくコンテナをテスト実行前に起動できるようになったのですが、問題が1つあります。それはコンテナの起動完了待ち合わせです。

コンテナがテスト実行前に起動するようになりましたが、このままでは起動後、すぐに次のフェーズの`integration-test`フェーズが実行されてしまいます。`integration-test`フェーズでコンテナを使ったテストをしたいのですが、コンテナの起動完了は待ってくれないため、場合によっては、というよりもほぼすべての場合で、コンテナ起動中にテストが実行されflakyな状態となりテスト結果が安定しません。

この起動完了の待ち合わせ問題は、Docker Composeも含めDockerを使った場合の典型的な悩ましい問題なのですが、なんとdockerプラグインには次のフェーズに移行するまでwaitしてくれる素敵な機能があります。

このwait機能にはいくつかの待ち合わせ方法が用意されているのですが、安全確実で簡単なのは次のように実際に利用するREST APIを用いてヘルスチェックする方法になります。

```xml
<image>
    <name>io.extact/hello-server</name>
    <run>
        <ports>7001:7001</ports>
        <!-- ↓↓↓起動完了の待ち合わせの設定 -->
        <wait>
            <http>
                <url>http://localhost:7001/hello</url>
                <method>GET</method>
                <status>200..399</status>
            </http>
            <time>60000</time>
        </wait>
    </run>
</image>
```

この例ではテストで呼び出す`http://localhost:7001/hello`にGETでリクエストを投げ、そのレスポンスのステータスコードが`200`から`399`だったら成功とし、60秒経っても成功しない場合は起動失敗として処理を中断するようにしています。

dockerプラグインはコンテナ起動後、`wait`タグのリクエストを投げ、成功条件以外のレスポンスを受け取った場合は再度リクエストを投げるといったことを`time`タグに指定したタイムアウトになるまで繰り返してくれます。よって、`integration-test`フェーズに移行した時点ではコンテナが正常に起動していることが保証され、安全にテストを実行することができます。

`mvn clean verify`コマンドによるテスト実行時のログを見ると次のように起動完了を待ってからテストを実行するようになるのが分かります。

- コンソールログ
![コンソールログ3](/img/blogs/2022/0831_docker-w-maven-log3.png)

## コンテナを複数起動したい場合
テストで必要なコンテナは１つじゃないよ、、という場合もあるかと思います。
dockerプラグインはDocker Composeによる起動もサポートしています。ですので、複数コンテナを起動したい場合、次のように`extenal`タグでdocker-compose.ymlを指定して複数コンテナを起動することができます。

```xml
<image>
    <external>
        <type>compose</type>
        <basedir>./</basedir>
        <composeFile>docker-compose.yml</composeFile>
    </external>
</image>
```

ただし、このDocker Composeを使った機能には次のような制限やデメリットがあります。
- dockerプラグインはdocker-compose.ymlを使ってdocker-composeコマンドで起動している訳ではなく、ymlファイルを解析して個々のコンテナとして起動している
- サポートされるdocker-compose.ymlのバージョンが2のみ（現在はバージョン3）
- バージョンが2のdocker-compose.ymlでもすべての機能がサポートされている訳ではない（depends_onが効かいないのは確認できた）

なので、機能として中途半端でハマりどころも多いため、個人的には利用は避けた方が良いとみています

では、どうやるかですが`image`タグは複数定義することができます。ですので、次のように起動するコンテナをツブツブで定義することで複数のコンテナをテスト実行前に起動することができます。

```xml
<images>
    <image>
        <name>io.extact/hello-server</name>
        <run>
            <ports>7001:7001</ports>
            <wait>
            ...
            </wait>
        </run>
    </image>
    <image>
        <name>io.extact/goodbye-server</name>
        <run>
            <ports>7002:7002</ports>
            <wait>
            ...
            </wait>
        </run>
    </image>
</images>
```


今回のdockerプラグインの紹介は以上となります。dockerプラグインの機能は豊富で今回紹介した機能はほんの一部となります。Mavenでコンテナに対してこんなことやりたいんだよなぁと思う方は[公式マニュアル](http://dmp.fabric8.io/)の一読の価値ありです。
