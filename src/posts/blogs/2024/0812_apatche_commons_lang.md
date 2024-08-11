---
title: Javaのプログラミングをサポート！Apache Commons Lang入門
author: kenta-ishihara
date: 2024-08-12
tags: [新人向け, tips, summer2024]
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2024-summer/
---

## はじめに
この記事は[夏のリレー連載2024](/events/season/2024-summer/) 11日目の記事です。
最近流行りの風邪にかかって寝込んでいたのですが、病明けに飲んだ[アサヒスーパードライ](https://www.asahibeer.co.jp/superdry/)の味が最高に美味しく感じられた石原です。
Javaで開発していたら絶対に使いたいJavaライブラリ「[Apache Commons Lang](https://commons.apache.org/proper/commons-lang/)」について記載しました。

## Apache Commons Langとは
Javaのコアパッケージとして「[java.lang](https://docs.oracle.com/javase/jp/8/docs/api/java/lang/package-summary.html)」[^1]がありますが、コアクラスをより扱いやすくするメソッドを提供するのがApache Commons Lang(以後ACLと略称)です。
値の有無のチェックや型変換など冗長なコードの記載を可読性良く実装できます。

## Commons Lang 2とCommons Lang 3について
ACLを利用したことがある人ならば、以下2つのライブラリを見たことがあると思います。
```java
import org.apache.commons.lang;
import org.apache.commons.lang3;
```
1つ目の「org.apache.commons.lang」のライブラリについて、こちらはレガシーバージョンでJava 1.2 以上、Java 8未満向けのライブラリになります。
2つ目の「org.apache.commons.lang3」のライブラリについて、こちらは現在のリリースバージョンでJava 8以上向けのライブラリになります。

これら2つのインポートはどちらも合わせて記載可能で、同名のメソッドについては同じように扱えますが、基本的にJavaのバージョンに合わせてプロジェクトごとに統一することをおすすめします。

参照：[Commons Lang 3の新機能について](https://commons.apache.org/proper/commons-lang/article3_0.html)

## Apache Commons Langを使うメリット
Javaで良くある条件式として文字列の値あり/なしのチェックを例にApache Commons Langを使った場合とそうでない場合を比較していきましょう。
```java
/**
 * Apache Commons Lang使用例
 */
private static void demonstrateCommonsLang() {
    String name = "";
    // Apache Commons Langを使わなかった場合
    if (name != null && name.isEmpty()) {
        System.out.println("The name is not empty");
    }
    // Apache Commons Langを使った場合
    if (StringUtils.isNotEmpty(name)) {
        System.out.println("The name is not empty");
    }
}
```

上記の例からみてもわかるように以下のメリットがあげられます。
* null safeなメソッドのためnullチェックの実装が不要
　(実装忘れの防止にも)[^2]
* メソッド名からinput/outputが明示的でありわかりやすい
* 冗長なコードが減るので可読性並びに保守性向上

個人的にはnull safeなメソッドというところの利点が大きい印象です。[^3]

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

## バージョン毎による値の有無チェックについて
ACLを使っていて一番利用することが多いと思われる「変数の値の有無チェック」についてバージョン毎の違いがあるので紹介します。
レガシー版ACLでよく使われる値の有無チェックで使われるメソッドというと以下があげられます。
* StringUtils.isEmpty()/isNotEmpty()
* CollectionUtils.isEmpty()/isNotEmpty()
```java
/**
 * CollectionUtils.isNotEmpty()使用例
 */
private static void demonstrateCollectionUtilsIsNotEmpty() {
    System.out.println(CollectionUtils.isNotEmpty(null));              // false
    System.out.println(CollectionUtils.isNotEmpty(new ArrayList<>())); // false
    System.out.println(CollectionUtils.isNotEmpty(List.of("value")));  // true
}
```

lang3ではObjectUtilsにisEmpty()/isNotEmpty()のメソッド が追加されています。
上記メソッドでは文字列/配列/コレクション/マップ/オプショナルの型について値の有無チェックを全て行うことができます。
そのためlang3では値の有無チェックについてObjectUtils.isEmpty()/isNotEmpty()を使えばこと足りてしまうということが言えます。
```java
import org.apache.commons.lang3.ObjectUtils;

/**
 * ObjectUtils.isEmpty()実演例
 */
private static void demonstrateObjectUtilsIsEmpty() {
    String str = "";
    List<String> list = new ArrayList<>();
    Map<String, String> map = new HashMap<>();
    int[] array = new int[0];
    Optional<String> optional = Optional.empty();

    System.out.println(ObjectUtils.isEmpty(str));       // true
    System.out.println(ObjectUtils.isEmpty(list));      // true
    System.out.println(ObjectUtils.isEmpty(map));       // true
    System.out.println(ObjectUtils.isEmpty(array));     // true
    System.out.println(ObjectUtils.isEmpty(optional));  // true

    str = "Hello";
    list.add("item");
    map.put("key", "value");
    array = new int[]{1, 2, 3};
    optional = Optional.of("value");

    System.out.println(ObjectUtils.isEmpty(str));       // false
    System.out.println(ObjectUtils.isEmpty(list));      // false
    System.out.println(ObjectUtils.isEmpty(map));       // false
    System.out.println(ObjectUtils.isEmpty(array));     // false
    System.out.println(ObjectUtils.isEmpty(optional));  // false
}
```

## たまに使う機会があるかもなメソッド紹介
* BooleanUtils.isTrue()/isNotTrue()/isFalse()/isNotFalse()：Boolean型の条件チェックに利用
```java
BooleanUtils.isTrue(Boolean.TRUE);  // true
BooleanUtils.isTrue(Boolean.FALSE); // false
BooleanUtils.isTrue(null);          // false
```
* StringUtils.leftPad()：固定長の文字列作成に
```java
import org.apache.commons.lang3.StringUtils;

public class Main {
    public static void main(String[] args) {
        int length = 6;

        String paddedString = StringUtils.leftPad("abc", length, '0');
        System.out.println(paddedString);  // 出力: 000abc
    }
}
```
* StringUtils.chomp()/chop()：最後の改行や最終文字を削除するメソッド。今回存在を初めて知ったが使う機会があったら使いたい
```java
import org.apache.commons.lang3.StringUtils;

public class Main {
    public static void main(String[] args) {
        System.out.println("[" + StringUtils.chop("Hello World") + "]");     // 出力: [Hello Worl]
        System.out.println("[" + StringUtils.chop("Hello World\n") + "]");   // 出力: [Hello World]
        System.out.println("[" + StringUtils.chop("Hello World\r\n") + "]"); // 出力: [Hello World]
    }
}
```
上記はACLで利用できるほんの一部の機能でしかないので、[公式JavaDoc](https://commons.apache.org/proper/commons-lang/javadocs/api-release/index.html)を見ながら自分の利用用途に合った便利メソッドを発見するのも面白いかなと思います。

## [番外編]Apache Commons Beanutilsについて
ここでACLとは別ライブラリにあたるapache.commons.beanutilsについて記載します。
一般的なWebサービスにおいて、フォーム(画面)クラス → DTOクラス → エンティティクラスの値受け渡し(その逆も然り)はよくある事象かと思っていますが、
その際各項目ごとにA.set○○(B.get○○)といった実装をしているとステップ数がかさんで冗長な実装になることが多々あります。
そんな問題を解決してくれるのがBeanUtils.copyProperties()です。
コピー元とコピー先の2つのクラスでプロパティ名が同じものについて値をコピーします。
(因みにコピー元にのみ存在し、コピー先で存在しないプロパティについては無視されます)
```java
        EmployeeDTO dto = new EmployeeDTO(1, "テスト 太郎", "test@example.com", "090-XXXX-XXXX");
        Employee entity = new Employee();

        // CopyPropertiesを使わずにDTOからエンティティに値をコピー
        entity.setId(dto.getId());
        entity.setName(dto.getName());
        entity.setEMail(dto.getEMail());
        entity.setPhoneNumber(dto.getPhoneNumber());

        // CopyPropertiesを使ってDTOからエンティティに値をコピー
        BeanUtils.copyProperties(entity, dto);
```
メリットとして可読性の向上と、なによりプロパティ名が無駄に別名で実装されないことが良い点と個人的には思います。
仕様上意図を持って別名で実装されるものは仕方がないと思いますが、そうでない場合[^4]はバグを生む原因になります。
そのため利用できる箇所ではなるべくcopyPropertiesを利用することを強くおすすめします。

## 終わりに
今回はApache Commons Langについて色々とまとめてみました。
普段からお世話になっているライブラリにはなりますが、今回のように記事を作成することで知らなかった新たなことが出てきて自分自身良い勉強になったかと思います。
機会があったらまた続編を書きたいと思います。

[^1]:String,Integer,Booleanなど基本的な型として利用するクラスを提供するライブラリ
[^2]:StringUtilsクラスについては基本null safeな作りになっているが、ACL全てのクラスが対象ではないので注意
[^3]:nullチェック実装忘れて、単体テストでNullPointerExceptionはプログラマなら誰しも経験あるはず
[^4]:EmployeeDTOとEmployeeの例でいうと片方では"name"のものが、もう片方では"employeeName"になっているとか。プロジェクトが大きくなるとこういう実装が悪い意味で地味に効いてくる...。