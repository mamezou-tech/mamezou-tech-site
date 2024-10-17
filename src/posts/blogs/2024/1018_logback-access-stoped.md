---
title: Springの小話 - Spring Bootを3.3系にBumpしたらLogback-accessが動かなくなった
author: toshio-ogiwara
date: 2024-10-17
tags: [java, spring, spring-boot, Springの小話]
image: true
---
個人的に育てているアプリのSpring Bootのバージョンが3.2系のままだったので、直近の最新の3.3.4にしたら Logback-access が動かなくなりました。一周遅れのバージョンアップなので、ググればすぐ解決方法は出てくるだろうなと思っていたらネットに情報はなく、そこそこ苦労したので、今回はこのネタを共有したいと思います。（Logback-accessってあまり使われていないのですかね・・）

# Logback-accessとは
そもそもLogback-accessってなに？からですが、Spring Bootに内包されているTomcatやJettyのアクセスログをLogbackのログとして出力してくれるものです。興味を持った方は [Spring Bootとlogback-accessでTomcatのアクセスログを出力 #Java – Qiita](https://qiita.com/kagamihoge/items/56ecfacd962fac6070f0)で使い方も説明されていますのでどうぞ。

# 今回の記事で幸せになれる方
この記事を読むと幸せになれる人は次の方です。

- Spring Bootのバージョンを3.3.3もしくはそれ以上に上げたら、それまで動いていた Logback-access が動かなくなった
- 次のスタックトレースが出ているが原因がわからず途方にくれている
```java
... 
Caused by: java.lang.AbstractMethodError: Receiver class ch.qos.logback.access.tomcat.LogbackValve does not define or inherit an implementation of the resolved method 'abstract java.util.concurrent.locks.ReentrantLock getConfigurationLock()' of interface ch.qos.logback.core.Context.
	at ch.qos.logback.core.joran.GenericXMLConfigurator.processModel(GenericXMLConfigurator.java:218)
	at ch.qos.logback.core.joran.GenericXMLConfigurator.doConfigure(GenericXMLConfigurator.java:178)
	at ch.qos.logback.core.joran.GenericXMLConfigurator.doConfigure(GenericXMLConfigurator.java:123)
	at ch.qos.logback.core.joran.GenericXMLConfigurator.doConfigure(GenericXMLConfigurator.java:66)
	at ch.qos.logback.access.tomcat.LogbackValve.configureAsResource(LogbackValve.java:230)
	at ch.qos.logback.access.tomcat.LogbackValve.startInternal(LogbackValve.java:159)
	at org.apache.catalina.util.LifecycleBase.start(LifecycleBase.java:164)
	... 63 more
```

この両方に該当している方は筆者が踏んだ非互換と全く同じです。下に解決方法を書いているので、そのとおりにやっていただければ幸せになれます（キッと。

# まずは解決方法
Logback-access の dependency 定義を次のようにするとエラーは解消されます。

- 変更前
```xml
<dependency>
    <groupId>ch.qos.logback</groupId>
    <artifactId>logback-access</artifactId>
    <version>(1.4系など2.0未満のバージョン)</version>
</dependency>
```

- 変更後
```xml
<dependency>
    <groupId>ch.qos.logback.access</groupId>
    <artifactId>logback-access-tomcat</artifactId>
    <version>2.0.4</version>
</dependency>
```

# 動かなくなった原因
いろいろ調べていった結果、Spring BootをBumpして動かなくなった原因は以下のとおりでした。

1. `spring-boot-starter-parent`(pom)で指定されているlogback-coreのバージョンがSpring Bootのv3.3.3でlogback-core-1.5.7になった
2. logback-core-1.5.7の`ch.qos.logback.core.Context`には次の変更が含まれている
     - 1.5.6
       ```java
       Object getConfigurationLock()
       ```
     - 1.5.7
       ```java
       ReentrantLock getConfigurationLock()
       ```
3. Logback-accessの`ch.qos.logback.access.tomcat.LogbackValve`は上述の`Context`インターフェースを実装しているため、logback-core-1.5.7に対応した、つまり`getConfigurationLock()`の戻り値を`Object`から`ReentrantLock`に変更したバージョンが必要となった
4. しかし、Logback-accessのバージョンはそのままにしていため、動作しなくなった

ということで、動かなくなった原因はわかったのですが、問題はLogback-accessのどのバージョンを使えばよいかでした。

Maven Centralを除くと、Logback本体と同じv1.5系がLogback-accessにもあったので、コレだなと思い指定したが動かず、、、よくよく見てみるとv1.5系の実体はpomだけで中身がない！実質、使えないバージョンということがわかる。

しょうがないので、まじめに調べるかと思い、Logback-accessの[公式ページ](https://logback.qos.ch/access.html)をみているとなにやら難しそうなことが書かれていて結局artifactとバージョンになにを指定すればいいのかよくわからず。が、ダメもとで[解決方法](#まずは解決方法)のとおりに指定したら問題なく動いて🙌となりました。

# さいごに
`spring-boot-starter-parent`(pom)で指定されているライブラリであれば、Spring Boot自体が(恐らく)統合テストを行っているため、ライブラリ間やバージョン間の相性や非互換はあまり心配しなくてもよいですが、それ以外、つまり`spring-boot-dependencies`(pom)の`dependencyManagement`に定義されていないライブラリはSpring Bootのバージョンを上げる際に要注意だなぁと改めて思った、そんなBump作業でした。
