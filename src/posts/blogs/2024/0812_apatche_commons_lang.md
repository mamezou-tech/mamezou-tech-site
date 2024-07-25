---
title: Javaで開発していたら絶対に使いたい「Apache Commons Lang」のおすすめの使い方
author: kenta-ishihara
date: 2024-08-12
tags: [新人向け, tips]
image: true　
---

## はじめに

(後でなんか書く)

Javaで開発していたら絶対に使いたいJavaライブラリ「[Apache Commons Lang](https://commons.apache.org/proper/commons-lang/)」(以後ACLと略称)について記載しました。

## Apache Commons Langとは？
Javaのコアパッケージとして「[java.lang](https://docs.oracle.com/javase/jp/8/docs/api/java/lang/package-summary.html)」[^1]がありますが、コアクラスをより扱いやすくするメソッドを提供するのがACLです。
値の有無のチェックや型変換など冗長なコードの記載を可読性良く実装できます。

## Commons Lang 2とCommons Lang 3について
ACLを利用したことがある人ならば、以下二つのライブラリを見たことがあると思います。
```java
import org.apache.commons.lang;
import org.apache.commons.lang3;
```
一つ目の「org.apache.commons.lang」のライブラリについて、こちらはレガシーバージョンでJava 1.2 以上、Java 8未満向けのライブラリになります。
二つ目の「org.apache.commons.lang3」のライブラリについて、こちらは現在のリリースバージョンでJava 8以上向けのライブラリになります。

これら二つのインポートはどちらも合わせて記載することは可能で、同名のメソッドについては同じように扱えますが、基本的にJavaのバージョンに合わせてプロジェクトごとに統一することをおすすめします。[^2]

参照：[Commons Lang 3の新機能について](https://commons.apache.org/proper/commons-lang/article3_0.html)

## Apache Commons Langを使うメリット
Javaで良くある条件式として文字列の値あり/なしのチェックを例にApache Commons Langを使った場合とそうでない場合を比較していきましょう。
```java
        // Apache Commons Langを使わなかった場合
        if (name != null && name.isEmpty()) {
        System.out.println("The name is not empty");
        }
        // Apache Commons Langを使った場合
        if (StringUtils.isNotEmpty(name)) {
            System.out.println("The name is not empty");
        }
```

上記の例からみてもわかるように以下のメリットがあげられます。
・null safeなメソッドのためnullチェックの実装が不要(実装忘れの防止にも)[^3]
・メソッド名からinput/outputが明示的でありわかりやすい
・冗長なコードが減るので可読性並びに保守性が向上

個人的にはnull safeなメソッドというところの利点が大きい印象です。[^4]

## Apache Commons Langの導入方法
ビルドツールとしてmavenを利用している場合、dependenciesタグ内に以下dependencyタグを追加すればOKです。
```xml
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-lang3</artifactId>
    <version>3.15.0</version>
</dependency>
```
Gradleなどその他ビルドツールの導入方法は[公式サイトの記事](https://commons.apache.org/proper/commons-lang/dependency-info.html)を確認してください。

## 個人的によく使うメソッドランキング
(これがやりたいがためにこの記事を書いてるまであります)

★nullチェック系
・StringUtills.isEmpty()/isNotEmpty()
・CollectionUtils.isEmpty()/isNotEmpty()
・BooleanUtils.isTrue()/isNotTrue()/isFalse()/isNotFalse()
・ObjectUtils.isEmpty()/isNotEmpty()

★変換系

## ObjectUtils.isEmpty()/isNotEmpty()について
レガシー版ACLのCollectionUtilsを使っていたのに新バージョンだとなくなった？と思っている人にlang3での立ち位置について記載いたします。



[^1]:String,Integer,Booleanなど基本的な型として利用するクラスを提供するライブラリ。Java標準で搭載しているためimportは不要。
[^2]:意図せず「org.springframework.util」のStringUtilsなど別ライブラリの同名メソッドで実装していた経験、エンジニアなら一度はあるはず。
[^3]:StringUtilsクラスについては基本nullSafeな作りになっているが、ACL全てのクラスが対象ではないので注意
[^4]:nullチェック実装忘れて、単体テストでNullPointerExceptionはプログラマなら一回は経験あるはず