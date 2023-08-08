---
title: ミュータブル・イミュータブルって何のこと？
author: yoshifumi-moriya
date: 2023-08-10
tags: [java]
---

この記事は[夏のリレー連載2023](/events/season/2023-summer/)の14日目の記事です。

## はじめに

日頃、Javaの初心者からベテランまで様々なスキルレベルの方から質問を頂く立場で仕事しておりますが、Java言語を使用するうえで基本事項でありながらも、あまり理解されていない事柄があると感じています。これらの事柄については改めて誰かに質問できず、「そういうもの」として無理やり納得しやり過ごしている方がいるのではないでしょうか。ここではそのような事柄について改めて解説し、その理由を知ることで「だらからこうするべき」、「だからこれはダメ」ということを理解する手助けになればと考えます。

今回はミュータブル、イミュータブルについて、その意味や使用方法、注意点について解説します。

## 事例

たまに寄せられる相談の中に、「これはイミュータブルだからね」とか、「それはミュータブルだからだよ」で済むようものがあります。しかし、ミュータブル、イミュータブルというのはどういうことなのか、正しく理解し解決できるでしょうか。
例えば以下のような事例です。

### 相談事例1

「数値の計算ができないんです。」という相談。計算ができないというのはどういうことかと見てみると、以下のようにBigDecimalの数値にaddしているにも関わらず値が変わらないということでした。これは「BigDecimalがイミュータブルだから」です。

```java
BigDecimal num1 = new BigDecimal(1);
BigDecimal num2 = new BigDecimal(2);

// num1にnum2を加算
num1.add(num2);

// 「3」が出力されると思ったら「1」が出力された
System.out.println(num1);
```

### 相談事例2

「定数として定義した日付がいつの間にか書き換わってしまうんです。」という相談が来ることもあります。これは「Dateがミュータブルだから」です。

```java
public static final Date BASE_DATE = new Date(12345000L);
```

※ Dateはjava.util.Date。

## ミュータブルとイミュータブル

ところで、ミュータブル、イミュータブルとはどういうことなのでしょうか。
ミュータブル（mutable - 可変）クラスは、フィールドの値が変更できるクラス、イミュータブル（immutable - 不変）クラスは、フィールドの値が変更できないクラスです。
Java標準のクラスでは、DateやArrayList、HashMapなどはミュータブル、IntegerなどのラッパークラスやString、BigDecimalなどはイミュータブルなクラスです。

## Stringってイミュータブルなのですか

ところで、Stringがイミュータブル、つまり不変である、というとビックリされることがあります。だってStringってこんな感じで値を書き換えられますよね、と。

```java
String value = "adc";
value = "def";
```

しかしこれはvalueの参照先をインスタンス"abc"から、別のインスタンスである"def"に変えているのであって、"abc"というインスタンスの中身が変わっているわけではありません。

## 相談事例の解決

さて話を戻して、先の相談事例はどのように解決するべきでしょうか。

### 相談事例1の解決

BigDecimalはイミュータブル、ということは、addしても値を変えることができないのですが、ではどうすれば良いのでしょうか。
実はaddメソッドは、num1、num2それぞれのインスタンスが持つ値は変更しませんが、加算した値を持った別のBigDecimalのインスタンスを返します。従って以下のようにaddが返してくるBigDecimalのインスタンスをnum1に代入すれば解決します。

```java
num1 = num1.add(num2);
```

### 相談事例2の解決

Dateはミュータブルなので、定数(final)として定義しても、そのインスタンスが持つ値は書き換えることができます。書き換えられたくないたそもそもfinalという修飾子は、参照先するインスタンスを変更できないことを保証するのであって、参照しているインスタンスが持つ値までは変更されないことを保証しません。

```java
public static final Date BASE_DATE = new Date(12345000L);

public static void someMethod() {
    BASE_DATE = new Date(67890000L); // ×：異なるインスタンスを代入することはできない(finalによる効果)
    BASE_DATE.setTime(67890000L); // 〇：異なる日時の値を設定することはできる(finalでは制限できない)
}
```

ではどうするべきか。それは「ミュータブルなクラスをfinalにするな」です。
代わりに、毎回同一の値を返すメソッドを用意したり、同等の値を示す別の型を使用する、というような方法があります。
今回の事例では日付の代わりにその日付を表すlong値を定数にし、そのlong値からDateを生成するメソッドを提供するのが良さそうです。（イミュータブルな日付や日時を扱うjava.time.LocalDateやjava.time.LocalDateTimeを使用する方法もありますが、型が変わるのは影響が大きいのでここでは省略）

```java
private static final long BASE_DATE_VALUE = 12345000L;
public static Date getBaseDate() {
    // 常に同一の日付が返される
    return new Date(BASE_DATE_VALUE);
}
```

## イミュータブルクラスの利点

イミュータブルなクラスには以下のような特徴・利点があります。

* 先の事例のように定数として定義できる
* 値が同じインスタンスは再利用ができるため、メモリが節約できる
  * 前回([なぜStringの比較に等価演算子(==)を使ってはいけないの？](/blogs/2022/11/06/java-string-equals/))の記事にあるようにStringのインスタンスの再利用できるのは、Stringがイミュータブルだから
* スレッドセーフである

## イミュータブルなクラスの定義

イミュータブルなクラスが理解できると、自分でもイミュータブルなクラスを定義したい、という時が来ます。または、このクラスをイミュータブルにしておいてよ、と言われる時が来ます。きっと。ではイミュータブルなクラスを定義するにはどうすれば良いでしょうか。

* インスタンス変数はprivateで宣言する
* インスタンス変数の値を書き換えるメソッド（setterなど）を提供しない
* クラスにはfinal修飾子を付ける
* ミュータブルな変数の扱いに注意

### インスタンス変数はprivateで宣言する

これは当然ですね。Javaではインスタンス変数はprivateで定義することが推奨されています。これにより、外から値の書き換えを防止できます。

### インスタンス変数の値を書き換えるメソッドを提供しない

外部に提供したい情報はgetterメソッドで公開します。setterはその名の通り変数を書き換えるためのメソッドですが、イミュータブルなクラスには不要です。また、setterでなくても変数の値を書き換えるようなメソッドは提供しないようにしましょう。
インスタンスの値を書き換えたい場合は、代わりに値の異なるインスタンスを返すメソッドを提供しましょう。BigDecimalのaddメソッドなどが良い例です。

### クラスにはfinal修飾子を付ける

せっかくイミュータブルなクラスを定義したと思っても、finalが付いていないと、拡張してミュータブルなクラスにオーバーライドすることが出来てしまいます。これは、イミュータブルクラスが「値が変わらないことを保証する」というルールを崩すことになります。

### ミュータブルな変数の扱いに注意

さて、ここが今回一番書きたかったポイントです。「注意」なんてあいまいに書きましたが、一言では言い表せないのです。
インスタンス変数にミュータブルな変数を持っている場合、注意が必要です。それはミュータブルな変数の参照を外部にさらす可能性があるからです。ミュータブルな変数の参照を外部にさらすということは、その参照先のインスタンスが書き換えられるということです。それは、その変数を保持するインスタンスの値が書き換えられるこであり、イミュータブルとは言えません。

実例を見てみましょう。

```java
public final class MyImmutable {
    private Date dateValue;
    public MyImmutable(Date dateValue) {
        this.dateValue = dateValue;
    }
    public Date getDateValue() {
        return dateValue;
    }
}
```

このようなクラスを定義したとします。先の3つの条件は満たしています。しかし、このクラスが持っているDteのインスタンスはが書き換えられてしまうポイントが2か所あります。

1つ目は、getter。このgetterはインスタンスが保持するDateのインスタンスを外部にさらしますので、そのDateのインスタンスを外から書き換えることが可能になります。

```java
MyImmutable myImmutable = new MyImmutable(new Date(12345000L));
// MyImmutableが保持するDateインスタンスを書き換える
myImmutable.getDateValue().setTime(67890000L);
```

2つ目はコンストラクタです。コンストラクタで渡したDateインスタンスへの参照は、コンストラクタを呼び出した側から参照可能ですので、書き換えることが可能です。

```java
Date date = new Date(12345000L);
MyImmutable myImmutable = new MyImmutable(date);
// MyImmutableに渡したDateインスタンスを書き換える
date.setTime(67890000L);
```

このような場合は、外部から渡された、または、外部にさらすミュータブルなインスタンスは同じ値を保持する別インスタンスにする（ディープコピーする）とい方法があります。

```java
public final class MyImmutable {
    private Date dateValue;
    public MyImmutable(Date dateValue) {
        this.dateValue = (Date)dateValue.clone();
    }
    public Date getDateValue() {
        return (Date)dateValue.clone();
    }
}
```

Dateの場合は、インスタンス内ではその日付を示すlongを保持し、外部に公開する際にはまたDateへ変換する、という手段もあります。

```java
public final class MyImmutable {
    private long dateValue;
    public MyImmutable(Date dateValue) {
        this.dateValue = dateValue.getTime();
    }
    public Date getDateValue() {
        return new Date(dateValue);
    }
}
```

また、インスタンス変数がListやMapなどの場合には、インスタンスを値が書き換え不可能な実装クラスに差し替える、という手段もあります。
以下の例では、ListをCollections.unmodifiableListを使って、書き換え不可能なListの実装に変換しています。この場合、addメソッドなどで書き換えようとすると例外が発生します。

※ Listの要素がイミュータブルな場合のみ。ミュータブルな場合はListの要素をディープコピーする必要あり。

変更前の実装。

```java
public final class MyImmutable {
    private List<String> values;
    public MyImmutable(List<String> values) {
        this.values = values;
    }
    public List<String> getValues() {
        return values;
    }
}
```

変更後の実装。

```java
public final class MyImmutable {
    private List<String> values;
    public MyImmutable(List<String> values) {
        this.values = Collections.unmodifiableList(values);
    }
    public List<String> getValues() {
        return values;
    }
}
```

## まとめ

* ミュータブル・イミュータブルの違いを理解しよう
* 正しく扱えない場合は、不具合を引き起こす可能性がある
* イミュータブルなクラスを定義する場合には特に注意が必要
