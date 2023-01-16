---
title: 今さら聞けないMaven – インタフェースと実装のスコープを分ける
author: toshio-ogiwara
date: 2023-01-15
tags: [java, maven, 今さら聞けないMaven]
---

インタフェースと実装のモジュール(jar)が分かれていてアプリはインタフェースしか使ってはいけないハズだったがウッカリ実装側のクラスを使っていたという経験はないですか？

このようなことを防ぐにはCheckStyleやArchUnitなどの静的解析ツールで検知することや属人的にコードレビューで指摘するといった方法も考えられますが、一番リーズナブルなのはdependencyのスコープをcompileとruntimeに分けて定義することです。

インタフェースと実装を分けて使いたい例としてよくあるのがJakarta Persistence(JPA)とだと思いますので今回はその実装のHibernateを例にどのようなことかを説明してみます。

## 丸っとcompileスコープの問題
Hibernateを使うがAPIの依存はJPA/JTA(Jakarta Transactions)に留めるといったお題があった場合、皆さんはpomのdependencyをどのように定義しますか？もしかして、こんな感じでHibernateだけしか定義しなかったりしませんか？

```xml
<dependency>
    <groupId>org.hibernate.orm</groupId>
    <artifactId>hibernate-core</artifactId>
    <version>6.1.6.Final</version>
</dependency>
```

dependencyにはscopeが必要ですが、この例では省略しているのでscopeはデフォルトのcompileになります。ですので、この定義だけでもなに不自由なく実装や実行をすることできます。ガっ、しかし問題は不必要なモノが混じる可能性があることです。

hibernate-coreの依存関係は次のようになっています（今回関係する部分だけ記載）

![dependency](/img/blogs/2023/0115_dependency.drawio.svg)

今回のお題を思い出してもらうとAPIの利用はJPA/JTAのみにしたいハズです。ですがhibernate-coreのスコープをcompileで定義しているため、hibernate-coreのすべてのクラスが参照できるようになってしまっています。

VSCodeやEclipseなどのIDEの入力補完にもhibernate-coreのクラスがでてくるため、JPAのクラスと勘違いしてポチッとしてしまい、あげく気がつかないといったこともあります（そしてテストも後半になった頃に、気がついてヒィィ～となることに、、、）

![capture1](/img/blogs/2023/0115_capture1.drawio.svg)


## スコープを分けて改善
今回のお題のようにインタフェースと実装とでモジュールが分かれていて、かつインタフェースだけに依存するようにしたいといった場合、次のようにインタフェース側のモジュールをcomipleスコープで定義し、実装側はruntimeで定義することで実装側のクラスを直接参照させないようにすることができます。

```xml
<dependency>
    <groupId>jakarta.persistence</groupId>
    <artifactId>jakarta.persistence-api</artifactId>
    <version>3.0.0</version>
</dependency>
<dependency>
    <groupId>jakarta.transaction</groupId>
    <artifactId>jakarta.transaction-api</artifactId>
    <version>2.0.0</version>
</dependency>
<dependency>
    <groupId>org.hibernate.orm</groupId>
    <artifactId>hibernate-core</artifactId>
    <version>6.1.6.Final</version>
    <scope>runtime</scope>
</dependency>
```

comipleスコープはコンパイル時にその依存が必要なるのに対して、runtimeスコープは実行時だけに必要なスコープとなるためコンパイル時にその依存は含まれません。このためrutimeスコープのクラスがimportに含まれていた場合はコンパイルエラーになりますし、そもそもIDEの入力補完の候補としても出てこなくなります。

![capture1](/img/blogs/2023/0115_capture2.drawio.svg)

このデメリットとして丸っとcompileスコープでは書かなくてもよかった推移的依存のdependencyを書かないといけないことがあります。これはこれで面倒くさい上にpomが大きくなりがちですが、インタフェースだけに依存させるというお題があるのであれば分けて定義しておく方が絶対に無難です（経験者は語る・・
