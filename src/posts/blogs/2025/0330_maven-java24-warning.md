---
title: 今さら聞けないMaven – Java24にしたら警告がでる
author: toshio-ogiwara
date: 2025-03-30
tags: [java, maven, 今さら聞けないMaven]
---

今年の秋には新しいLTSのJava25がでるので、そろそろ予習をしておこうかと思いJavaを24にしたところ`mvn`コマンドを実行するとこれまでは出ていなかった警告がモリっとでるようになりました。なんとなくそのままでも大丈夫なような気もしましたが、それも精神衛生上よろしくないので調べてみました。非LTSのJava24を使う人はそれほど多くないと思いますが、次に登場するLTSのJava25でもおそらく同様の警告が出力されと思います。そのときにこの記事が参考になればと思い、今回はJava24から表示されるようになった警告の背景と、その抑止方法を紹介します。

# 出力される警告
Mavenの実行に使うJDKをJava24にし、フェーズやゴールはなんでもよいので`mvn`コマンドを実行すると次のように警告が2つ出力されます。

- `test`フェーズを指定して`mvn`コマンドを実行した例
```shell
> mvn test
WARNING: A restricted method in java.lang.System has been called
WARNING: java.lang.System::load has been called by org.fusesource.jansi.internal.JansiLoader in an unnamed module (file:/path/to/apache-maven-3.x.x/lib/jansi-2.4.0.jar)
WARNING: Use --enable-native-access=ALL-UNNAMED to avoid a warning for callers in this module
WARNING: Restricted methods will be blocked in a future release unless native access is enabled

WARNING: A terminally deprecated method in sun.misc.Unsafe has been called
WARNING: sun.misc.Unsafe::objectFieldOffset has been called by com.google.common.util.concurrent.AbstractFuture$UnsafeAtomicHelper (file:/path/to/apache-maven-3.x.x/lib/guava-30.1-jre.jar)
WARNING: Please consider reporting this to the maintainers of class com.google.common.util.concurrent.AbstractFuture$UnsafeAtomicHelper
WARNING: sun.misc.Unsafe::objectFieldOffset will be removed in a future release
[INFO] Scanning for projects...
```

# 警告内容とMaven側の対応
1つ目の`A restricted method in java.lang.System has been called..`は [JEP 472: Prepare to Restrict the Use of JNI](https://openjdk.org/jeps/472) によるもので、今後のJNIの利用制限に向けた警告となっています。メッセージからMavenが使っている`jansi-2.4.0.jar`からJNIが利用されていることによる警告と思われます。

この警告に対するチケットはMavenプロジェクト側でも [MNG-8248:WARNING: A restricted method in java.lang.System has been called](https://issues.apache.org/jira/browse/MNG-8248) として登録されており、これをみるとMavenの3.9.10で修正がされています（ですが記事を書いている2025年3月29日時点ではまだ3.9.10はリリースされていません）。

もう1つの`A terminally deprecated method in sun.misc.Unsafe has been called...`は [JEP 498: Warn upon Use of Memory-Access Methods in sun.misc.Unsafe](https://issues.apache.org/jira/browse/MNG-8455) によるもので、`Unsafe`クラスの削除に向けたもので利用している場合は警告が出力されるようになりました。メッセージからこちらはMavenが使っている [Google Guava](https://github.com/google/guava) が `Unsafe`クラスを使っているための警告と思われます。

こちらの警告も [MNG-8455:WARNING deprecated method in sun.misc.Unsafe has been called](https://issues.apache.org/jira/browse/MNG-8455) としてチケットが登録されていますが、対応については Google Guava を使わないようにするのはムリということで`Won't Fix`(修正しない)としてCLOSEされています。つまり、この警告は Google Guava が`Unsafe`クラスに対する対応をしない限り[^1]、なくなることはないと推測されます。

[^1]: Google Guavaについては[こちら](https://github.com/google/guava/issues/6806)のチケットをみると対応されるようにも思われますが、よくわかりません。

# 警告の抑止方法
警告とチケットの内容からどちらも警告が出ていても問題はなく、また利用者側ができることはMavenの対応を待つのみとなります。このため、警告は見ないことにして、このまま使い続けても問題はないのですが、やっぱりウザいですよね。

ということで、JEPをみると警告の抑止方法も記載されていました。その方法は`java`コマンドのVMオプションに決まった呪文を指定するだけです。ただ、ここで？になるのが`mvn`コマンドで`java`のVMオプションをどうやって指定するかですが、一番手っ取り早いのは環境変数`MAVEN_OPTS`に設定する方法です。これは次のようになります。

```shell
> export MAVEN_OPTS="--enable-native-access=ALL-UNNAMED --sun-misc-unsafe-memory-access=allow"
> mvn test
[INFO] Scanning for projects...
```

`MAVEN_OPTS`に設定している前方の`--enable-native-access=ALL-UNNAMED`がJNIの警告を抑止するオプションで、後方の`--sun-misc-unsafe-memory-access=allow`が`Unsafe`クラスに対する警告を抑止するオプションになります。

VMオプション指定の細かいことは別のブログに書かれています。今回は環境変数を使いましたが設定ファイルで指定する方法も紹介しています。興味がある方はこちらもみていただければと思います。
@[og](/blogs/2023/04/30/maven-option-fixation/)

# 設定の除去は忘れずに
環境変数を毎回設定するのは手間なため実際には `.bashrc` などに登録して使うことになると思います。これに対して今回の設定はMavenが対応するまでの一時的な対応となります。そのままにしておくと本来気づくべき警告を見逃してしまう可能性もあるので、Mavenが対応したら、この設定を忘れずに削除するようにしましょうと、自分に言い聞かせつつ、今回はこのあたりで締めたいと思います。
