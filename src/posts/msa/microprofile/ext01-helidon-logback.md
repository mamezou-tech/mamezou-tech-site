---
title: Helidon Tips - SLF4J＋LogbackへのLogger切り替え
author: toshio-ogiwara
date: 2022-03-28
tags: ["逆張りのMicroProfile", helidon, logging]
nextPage: ./src/posts/msa/microprofile/ext02-helidon-testing.md
---
HelidonのLogger実装にはJavaSEのJUL(java.util.logging)が使われています。これは標準を意識しての選択だと思われるためスタンスは理解できるのですが、実際のところJULはちょっと勘弁、、が正直なところかと思います。このため、使い慣れたLogger実装に切り替えたいところですが、SLF4Jなどのブリッジを利用せずコード上で直接`java.util.logging.Logger`を利用する実装となっているため、他のLogger実装への切り替えが一筋縄ではいきません。

そこで今回はHelidonのログをSLF4J＋Logbackへ切り替える方法を紹介します。

MicroProfileは連載を行ってます。よければ他の記事も下のリンクからどうぞ！
- [逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)

[[TOC]]

:::info
この記事はJava11+Helidon 2.4.2をもとに作成しています。
:::

## SLF4J+Logbackの依存の追加
まずはSLF4JとLogbackの依存を追加するためpomに次のdependencyを追加します。

```xml
<dependency>
    <groupId>org.slf4j</groupId>
    <artifactId>slf4j-api</artifactId>
</dependency>
<dependency>
    <groupId>org.slf4j</groupId>
    <artifactId>jul-to-slf4j</artifactId>
</dependency>
<dependency>
    <groupId>ch.qos.logback</groupId>
    <artifactId>logback-classic</artifactId>
</dependency>
```

SLF4JとLogbackのartifactである `slf4j-api`と`logback-classic`の他にもう一つ`jul-to-slf4j`がありますが、このartifactが必要な理由については後ほど説明しますので、例の3つのartifactをそのまま追加します。なお、例はあえてバージョンを指定していませんが、この点については下のコラムで触れています。

:::column:ライブラリのバージョン指定
OSSライブラリを利用した開発では動作を保証（確認）する上で利用するバージョンの組み合わせが重要になってきますが、Helidonが利用するライブラリは間接的に依存する推移的依存も含めると膨大な数に上ります。このため○○ライブラリはx.y.zのバージョンを使ってなどとこれをドキュメントで指定するのは利用する側/される側双方にとって無理があります。

これに対してHelidonは依存の可能性があるライブラリとそのバージョンをdependencyManagementに一式定義したpomを提供しています。また、このpomはHelidonのリリースバージョンごとに親pom(`io.helidon.applications:helidon-mp`)とbom(`io.helidon:helidon-dependencies`)の2つの形式で提供されます。

よって、Helidonのpomに定義さているライブラリを追加する際は、自分たちのpomにはバージョンを指定せずdependencyManagementのバージョンに従うのが原則となります。今回追加したSLF4J+Logbackの3つのartifactにバージョンを指定していないのは、HelidonのpomにdependencyManagementが定義されているためとなります。
:::

## JULのログ出力の横取り
冒頭でも触れましたがHelidonはJULを直接使っているため、SFL4Jのブリッジを変えたところでブリッジが関与する部分はありません。よって、依存を追加しただけではHelidonのログはLogbackへ切り替わりません[^1]。

[^1]: JULが直接使われているのは主に`io.helidon.*`のクラスになります。ですのでここで言っている「Helidonのログ」とは主に`io.helidon.*`のクラスから出力されるログとなります。この一方、WeldなどHelidonが利用しているOSSではSLF4Jが利用されています。このため、SLF4J+Logbackの依存追加後はJULとLogbackのログが正にシマシマに出力されます。

そこでこの流れを変えるために必要なことはJULに対するログ出力呼び出しの横取りです。

この横取り処理は次のように実装します。横取り処理はHelidonがJULにログを出力する前に行う必要があるため、HelidonのMainメソッドを呼ぶ前に追加しています。

また、この横取り処理を行う` SLF4JBridgeHandler`を格納するartifactが先ほどの手順で後ほどと言っていた`jul-to-slf4j`になります

```java
public static void main(String[] args) {
    // java.util.loggingの出力をSLF4Jへdelegate
    SLF4JBridgeHandler.removeHandlersForRootLogger(); // 1.
    SLF4JBridgeHandler.install(); // 2.
    // Helidonの起動
    io.helidon.microprofile.cdi.Main.main(args);
}
```

追加した横取り処理がやっていることは
1. JULに既にバインドされているLoggerをすべて削除
2. JULのRootLoggerにSLF4Jのアダプタをバインド

となります。Helidonは今までどおりJULに対しログ出力を行いますが、2.により、その実体はすべてSLF4Jへ流れるようになります。つまり横取りの完成です。

## Logbackのログレベルを反映させる
ここまでの手順でHelidonのログがLogback側に出力されるようになりますが、もうひと手間加える必要がります。それはJULに対するLogbackのログレベルの反映です。

Helidonのログは仕組みとしてJULを経由してくることに変わりはないため、JULのログ出力条件を満たしたものがLogback側に渡ってきます。これは換言するとJULのログ出力条件を満たさないものはそもそも出力されないことを意味します。ですので、JUL側の条件を満たさないものをLogback側でいくら設定を行っても元ネタが来ないものは出力のしようがありません。

これでピンと来た方もいるかも知れませんが、JULのデフォルトのログレベルはINFOです。つまり、JUL側でINFO未満で出力されているログはLogback側のログレベルをDEBUGにしても今のままでは出力されません。

これを解消するためlogback.xmlに次の設定を追加します。

```xml
<contextListener class="ch.qos.logback.classic.jul.LevelChangePropagator">
    <resetJUL>true</resetJUL>
</contextListener>
```

この設定により、Logbackの初期化時（初回のLoggerインスタンス生成時）にLogback側のrootのログレベルがJUL側のrootのログレベルに伝播(Propagate)され、JULのログもLogback側のログレベルに従って出力されるようになります。

以上でSLF4J+Lobackの切り替えはすべて完了となります。

最終的な上記コードとpomの一式はサンプルとして、以下のGitHubのリポジトリに格納していますので、コードの全体やpomの全体を確認したい場合はご参照ください。

- <https://github.com/extact-io/contrarian-microprofile-sample/tree/main/ex-helidon-logback>


---
参照資料

- Qiita: [アプリへのslf4j + logback 導入時の java.util.logging 向け対処](https://qiita.com/namutaka/items/61f8a99946f869cad6b3)
