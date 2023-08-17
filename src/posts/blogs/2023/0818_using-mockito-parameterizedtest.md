---
title: Java用モック・フレームワーク「Mockito」を使ってみる（その３：テストケースをまとめる編）
author: shuichi-takatsu
date: 2023-08-18
tags: [テスト, mockito, java, junit]
---

[前回](/blogs/2023/08/16/using-mockito-void-method/)は「Mockito」でvoid型メソッドをモック化する方法について解説しました。  
今回は「複数のテストケースを１つのテストケースにまとめる」方法について解説したいと思います。  

## テストケース数が多くなりすぎた時

これまで使用してきたサンプルプログラム「FooController」と「BarSensor」の仕様を再度確認します。  

![](https://gyazo.com/b94473b363471605a7ee1e9de01cffd3.png)

「BarSensor」の仕様：  
- 対象物との距離を測定する「scan」メソッドを持つ。戻り値はInt型。  
- センサーをキャリブレーションする「calibration」メソッドを持つ。戻り値は無し（void型）  

「FooController」の仕様：  
- コンストラクタでセンサーオブジェクト（BarSensor）を受け取る。  
- 対象物との距離の上限を設定する内部変数「UPPER_LIMIT」を持つ。（今回は上限値を「200」とする）
- 対象物との距離の下限を設定する内部変数「LOWER_LIMIT」を持つ。（今回は下限値を「100」とする）
- 対象物との距離を判定する「check」メソッドを持ち、このメソッドは上記の上限値／下限値の範囲内に対象物が収まっている場合Trueを返す。それ以外はFalseを返す。（今回は対象物の距離が100から200の範囲内であればTrueを戻す。それ以外はFalseを戻す）
- BarSensor の scan メソッドを呼び出す前に BarSensor の calibration メソッドを呼び出す。
- センサーオブジェクトがNullの場合は「NullPointerException」例外をThrowする。  

前回までの実装では、モック化した scanメソッドを扱うテストケースとして以下の３つのテストケースを定義しました。

```java
    @Test
    void testCase01() {
        doReturn(50).when(this.barSensor).scan();
        assertEquals(false, this.fooController.check(), "距離50 : False");
    }

    @Test
    void testCase02() {
        doReturn(150).when(this.barSensor).scan();
        assertEquals(true, this.fooController.check(), "距離150 : True");
    }

    @Test
    void testCase03() {
        doReturn(250).when(this.barSensor).scan();
        assertEquals(false, this.fooController.check(), "距離250 : False");
    }
```

モック化した scanメソッドの戻り値に「50」「150」「250」の３つを設定していますが、FooController の「上限値／下限値の範囲内に対象物が収まっている」という仕様を境界値分析を使って考えると、モック化したscanメソッドの戻り値に設定する値は「99」「100」「200」「201」の４つが適当でしょう。  
設定値と期待結果の組み合わせは以下のようになります。
- 距離99 ： 期待結果False
- 距離100： 期待結果True
- 距離200： 期待結果True
- 距離201： 期待結果False

テストケースを以下のように作り替えます。  

```java
    @Test
    void testCase01() {
        doReturn(99).when(this.barSensor).scan();
        assertEquals(false, this.fooController.check(), "距離99 : False");
    }

    @Test
    void testCase02() {
        doReturn(100).when(this.barSensor).scan();
        assertEquals(true, this.fooController.check(), "距離100 : True");
    }

    @Test
    void testCase03() {
        doReturn(200).when(this.barSensor).scan();
        assertEquals(true, this.fooController.check(), "距離200 : True");
    }

    @Test
    void testCase04() {
        doReturn(201).when(this.barSensor).scan();
        assertEquals(false, this.fooController.check(), "距離201 : False");
    }
```

上記はテストケースが４つ程度ですんでいますが、もっと複雑な仕様の場合、このように一つ一つの値を設定してテストケースを作成しているとテストケースの数がとても多くなります。  
また、テストケース作成から時間が経ってしまうと、どのテスト分析をどのテストケースが担当していたのかを確認することが困難になってしまいます。  

そこで今回はテストケースを意味のある単位にまとめてみたいと思います。

## doメソッドに複数の戻り値を定義する

前回も使用した doメソッドは「複数の引数」を取ることができます。  
例えば scanメソッドが呼び出される毎に「99」「100」「200」「201」の値を戻したい場合は次のように記述できます。

```java
    doReturn(99, 100, 200, 201).when(this.barSensor).scan();
```

この場合、scanメソッドが１回目に呼び出された時の戻り値は「99」になり、２回目に呼び出された時の戻り値は「100」になります。  
そして、３回目には「200」、４回目には「201」を戻します。  
複数の引数を設定したテストケースは以下のようになります。  

```java
    @Test
    void testCase01() {
        doReturn(99, 100, 200, 201).when(this.barSensor).scan();
        assertEquals(false, this.fooController.check(), "距離99 : False");
        assertEquals(true, this.fooController.check(), "距離100 : true");
        assertEquals(true, this.fooController.check(), "距離200 : true");
        assertEquals(false, this.fooController.check(), "距離201 : true");
    }
```

上記のテストケースを実行すると、テストケースが失敗しました。  
実行時の戻り値と期待した戻り値が異なるようです。  
FooController の実装を確認します。  
すると checkメソッドの実装が以下のようになっていることが確認できました。  

```java
    public boolean check() {
        if (null == this.barSensor)
            throw new NullPointerException();
        this.barSensor.calibration();
        if (FooController.UPPER_LIMIT >= this.barSensor.scan() && this.barSensor.scan() >= FooController.LOWER_LIMIT)   // scanメソッドが２回呼び出されている
            return true;
        return false;
    }
```

FooController の checkメソッドを１回呼び出した時、BarSensor の scanメソッドが２回呼び出されています。  
実機に装置にセンサーが接続されていて、センサーを２回連続で起動して計測した時、計測の微妙な時間差でセンサーからの戻り値（計測値）が異なったものになってしまう可能性があります。  
１回の判定のためにセンサーを２回呼び出す必要はないので、センサーの呼び出しを１回にして、センサーからの戻り値を一旦ローカル変数に受けてから、ローカル変数を使って判定をすべきでしょう。  

checkメソッドの実装を以下のように変更します。  

```java
    public boolean check() {
        if (null == this.barSensor)
            throw new NullPointerException();
        this.barSensor.calibration();
        int distance = this.barSensor.scan();   // 一旦ローカル変数に戻り値を受け取る
        if (FooController.UPPER_LIMIT >= distance && distance >= FooController.LOWER_LIMIT)
            return true;
        return false;
    }
```

FooController の checkメソッドの実装を上記のように変更することで、テストケースの実行が成功するようになりました。  

ここまでで４つのテストケースを１つのテストケースにまとめることができましたが、まだ以下の部分が冗長です。

```java
    assertEquals(false, this.fooController.check(), "距離99 : False");
    assertEquals(true, this.fooController.check(), "距離100 : true");
    assertEquals(true, this.fooController.check(), "距離200 : true");
    assertEquals(false, this.fooController.check(), "距離201 : true");
```

次は上記の assertEqualsメソッドの部分をまとめてみたいと思います。  

## ParameterizedTest を使う

これまで JUnit5 の「Test」アノテーションを使ってテストケースを定義していましたが、JUnit5 には「ParameterizedTest」アノテーションというものがあります。  
このアノテーションを使うとテストケースに引数（パラメータ）を設定することができます。  
引数は「ValueSource」アノテーションで設定することができます。

今回、doReturnメソッドへの引数として「99」「100」「200」「201」を指定し、期待結果（assertEqualsメソッドの第一引数）に「false」「true」「true」「false」を指定します。  
以下のようにテストケースケースを実装します。  

```java
    @ParameterizedTest
    @ValueSource(ints = { 99, 100, 200, 201 })
    @ValueSource(booleans = { false, true, true, false })
    void testCase01(int distance, boolean result) {
        doReturn(distance).when(this.barSensor).scan();
        assertEquals(result, this.fooController.check(),
                "距離" + String.valueOf(distance) + " : " + String.valueOf(result));
    }
```

しかし、上記のテストケースのビルドは失敗します。  
失敗時に報告されるエラー情報を確認します。  

```text
Duplicate annotation of non-repeatable type @ValueSource. Only annotation types marked @Repeatable can be used multiple times at one target.
```

どうやら「ValueSource」アノテーションは１つのテストケースに対して複数回利用できないようです。

設定値と期待結果をセットにして複数個の配列として引数に設定する場合には「CsvSource」アノテーションを使うことができます。  
設定値と期待結果の組み合わせは以下です。  
- 距離99 ： 期待結果False
- 距離100： 期待結果True
- 距離200： 期待結果True
- 距離201： 期待結果False

第一引数（距離）と第二引数（期待結果）をカンマで分割した一つの文字列に収め、「CsvSource」アノテーションを使って次のように設定します。

```java
    @CsvSource({ "99, false", "100, true", "200, true", "201, false" })
```

以下のようにテストケースケースを実装します。  
（テストケースの引数の第一引数として「距離（整数型）」、第二引数として「期待結果（ブーリアン型）」を指定します）  

```java
    @ParameterizedTest
    @CsvSource({ "99, false", "100, true", "200, true", "201, false" })
    void testCase01(int distance, boolean result) {
        doReturn(distance).when(this.barSensor).scan();
        assertEquals(result, this.fooController.check(),
                "距離" + String.valueOf(distance) + " : " + String.valueOf(result));
    }
```

testCase01メソッドの引数の型に従って、CsvSourceアノテーションに設定された文字列がカンマで分割され、適切な型の値に置き換えられます。  
”99, false”文字列は、整数「99」とブーリアン「false」に変換されます。  

設定した回数（今回の場合は４パターン）のテストが実行されているか、確かめて見ます。  
テストの実行結果は以下のようになりました。  

![](https://gyazo.com/98b92c94e09fb54cd6b8036c7f1d2bc5.png)

テストが指定した回数繰り返して実行されていることがわかります。  

## まとめ

今回作成したテストクラス（FooControllerTest）全体を以下に示します。  
テストケースの説明を「DisplayName」アノテーションを使って追加してあります。

```java
package com.example;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;

import static org.junit.jupiter.api.Assertions.assertEquals;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

public class FooControllerTest {

    private FooController fooController = null;

    private BarSensor barSensor = null;

    @BeforeEach
    void setUp() {
        this.barSensor = mock(BarSensor.class);
        this.fooController = new FooController(this.barSensor);
    }

    @ParameterizedTest
    @CsvSource({ "99, false", "100, true", "200, true", "201, false" })
    @DisplayName("scanメソッドの戻り値と上限・下限の動作確認")
    void testCase01(int distance, boolean result) {
        doReturn(distance).when(this.barSensor).scan();
        assertEquals(result, this.fooController.check(),
                "距離" + String.valueOf(distance) + " : " + String.valueOf(result));
    }

    @Test
    @DisplayName("キャリブレーションの呼び出し回数確認")
    void testCase02() {
        doNothing().when(this.barSensor).calibration();
        this.fooController.check();
        verify(this.barSensor, times(1)).calibration();
    }

}
```

JUnit5 の ParameterizedTest を使って Mockito のテストを簡潔に書きつつ網羅性を高めることができました。
Mockito にはもっと多くの機能がありますので、今後も順次紹介していきたいと思います。  
ソフトウェアの品質向上に役立てていただければと幸いです。
