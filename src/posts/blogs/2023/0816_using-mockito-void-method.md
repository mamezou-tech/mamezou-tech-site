---
title: Java用モック・フレームワーク「Mockito」を使ってみる（その２：void型メソッドのモック編）
author: shuichi-takatsu
date: 2023-08-16
tags: [テスト, mockito, java, junit]
---

[前回](/blogs/2023/08/13/using-mockito-basic/)は「Mockito」の基本的な使い方を解説しました。  
今回は「void型メソッド」をモック化する方法を解説したいと思います。  

## 「whenメソッド」と「doメソッド」

void型メソッドのモック化について解説する前に、モックの動作定義について再度説明したいと思います。  
前回はモックの動作を定義するとき「whenメソッド（when/thenReturn）」を使用しました。  

whenメソッドの使用例：  
```java
    when(this.barSensor.scan()).thenReturn(150);
```

実は上記は、次のように「doメソッド（doReturn/when）」を使って実装しても問題なく動作します。  

doメソッドの使用例：  
```java
    doReturn(150).when(this.barSensor).scan();
```

では、両者のどちらを使っても問題ないのでしょうか。  
この２つの定義方法に差はほとんどありませんが、「void型メソッド」をモック化したい場合は「doメソッド」を使う以外に方法がありません。

void型メソッドをモック化する手順を見ていきます。  

## 前回使用したサンプルの仕様を変更「キャリブレーションの追加」

前回使用した「BarSensor」インターフェイスに「センサーをキャリブレーションする」メソッドが追加されることになったと仮定します。  
センサーをキャリブレーションするメソッドを以下のように定義します。  

```java
    public void calibration();
```

「BarSensor」インターフェイスにキャリブレーションメソッドを追加します。  
BarSensor のコードを以下のように実装します。  

```java
package com.example;

/**
 * 距離センサー
 */
public interface BarSensor {

    /**
     * scan
     * 
     * @return 対象までの距離
     */
    public int scan();

    /**
     * キャリブレーション
     */
    public void calibration();
}
```

上記の「BarSensor」を利用する「FooController」側にキャリブレーションメソッドの呼び出しを行う実装を追加します。  
BarSensor の scan メソッドを呼び出す前に BarSensor の calibration メソッドを呼び出します。
FooController のコードを以下のように実装します。  
（実際はもっと複雑なコードになると思いますが、今回はあくまでvoid型メソッドのモック化のサンプルとして実装します）

```java
package com.example;

/**
 * コントローラー
 */
public class FooController {

    /**
     * 上限距離
     */
    private static final int UPPER_LIMIT = 200;

    /**
     * 下限距離
     */
    private static final int LOWER_LIMIT = 100;

    /**
     * 距離センサーインスタンス変数
     */
    private BarSensor barSensor = null;

    /**
     * コンストラクタ
     * 
     * @param barSensor 距離センサーインスタンス
     */
    public FooController(BarSensor barSensor) {
        this.barSensor = barSensor;
    }

    /**
     * check 対象までの距離が上限／下限の範囲内かをチェックする
     * 
     * @return 判定(true/false)
     */
    public boolean check() {
        if (null == this.barSensor)
            throw new NullPointerException();
        this.barSensor.calibration(); // 今回追加したキャリブレーション
        if (FooController.UPPER_LIMIT >= this.barSensor.scan() && this.barSensor.scan() >= FooController.LOWER_LIMIT)
            return true;
        return false;
    }
}
```

## void型メソッドのモック化

今回の Calibration メソッドに戻り値は無いので doメソッドの中の「doNothing」を使ってモック化します。  

```java
    doNothing().when(this.barSensor).calibration();
```

前回使用した whenメソッドでは実装できません。  
試しに、以下のように実装しようとしてもエラーになります。

```java
    when(this.barSensor.calibration()).thenReturn(void);
```

thenReturn の部分には何かしらの値を設定する必要があります。void は戻り値が「無い」ことを示すので、「無い」を戻すという設定自体に無理があります。  
（なぜ Mockito に doNothing が実装されていて、thenNothing が実装されていないのかは不明ですが）

## モックが呼び出されているかを確認する

上記のように void型メソッドをモック化することができました。  
今回定義した calibration メソッドの動作は「doNothing」なので、モックの応答によって FooController の挙動が変わることがありません。  
（今回は仕様として、例外をThrowすることは無いとしています）  
では、どうやって「モックが呼び出されたことを確認する」のでしょうか？  
Mockito には「モックが呼び出された回数」を確認する機能が用意されています。  

テストケースとして BarSensor の calibration メソッドが何回呼び出されているかを検証する実装を行います。
テストケースのコードを以下のように実装します。

```java
    @Test
    void testCase04() {
        doNothing().when(this.barSensor).calibration(); // ➀
        this.fooController.check();                     // ➁
        verify(this.barSensor, times(1)).calibration(); // ➂
    }
```

ソースコードの解説を行います。  
➀の部分でモックの動作定義を行います。  
➁の部分で FooController の checkメソッドを呼び出しています。今回の実装では checkメソッド中で BarSensor の calibration メソッドを「１回」呼び出しています。  
➂の部分で BarSensor の calibrationメソッドが「１回」呼び出されたかどうかを確認しています。  

モック化されたメソッドが何回呼び出されたのかを検証するには Mockito の「verify」メソッドを利用します。  
verify メソッドの第１引数にモックを設定し、第２引数に「回数」を設定します。  
今回の実装では calibrationメソッドが１回呼び出されているはずなので「times(1)」を引数に与えています。  
上記のテストケースは成功します。  

呼び出し回数を以下のように「２回」に指定してテストケースを実行すると、テストが失敗します。

```java
    verify(this.barSensor, times(2)).calibration(); // ➂
```

テストが失敗した旨のメッセージが以下のように出力されました。  

```text
org.mockito.exceptions.verification.TooFewActualInvocations: 
barSensor.calibration();
Wanted 2 times:
 at com.example.FooControllerTest.testCase04(FooControllerTest.java:52)
But was 1 time:
 at com.example.FooController.check(FooController.java:40)
```

期待結果として「２回」が指定されているのに、実行結果は「１回」だったと報告されています。

今度は以下のように FooController の checkメソッドを２回呼び出してみます。
期待結果は「２」としています。  
このテストケースは成功します。（checkメソッドが２回呼ばれているので、calibrationメソッドも２回呼び出されている）

```java
    @Test
    void testCase04() {
        doNothing().when(this.barSensor).calibration(); // ➀
        this.fooController.check();                     // ➁-1
        this.fooController.check();                     // ➁-2
        verify(this.barSensor, times(2)).calibration(); // ➂
    }
```

## void型メソッドのモックの動作定義は不要か？

ここで、次のようにモックの動作定義を省略してみます。

```java
    @Test
    void testCase04() {
        // doNothing().when(this.barSensor).calibration(); // ➀(省略)
        this.fooController.check();                     // ➁
        verify(this.barSensor, times(1)).calibration(); // ➂
    }
```

実は上記のように実装してもテストケースは成功します。  
こんなことを言ってしまうと「あれ？ 呼び出し回数を検証するだけなら、doNothingによるモックの動作定義なんて不要？」って思うかもしれませんが、doNothingは Mockito のvoid型メソッドに対するデフォルトの動作なので、void型メソッドのモック化も自動で行われていると考えた方が良いです。  
このように省略はできるのですが、筆者としてはできる限り明示的にコードを記述しておきたいと思います。  

## まとめ

今回作成したテストクラス（FooControllerTest）全体を以下に示します。  
前回 whenメソッドで定義してあった部分は、doメソッドで書き直しました。  

```java
package com.example;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;

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

    @Test
    void testCase04() {
        doNothing().when(this.barSensor).calibration();
        this.fooController.check();
        verify(this.barSensor, times(1)).calibration();
    }

}
```

今回は戻り値の無いVoid型メソッドのモック化を解説しました。  
Mockito にはもっと多くの機能がありますので、今後も順次紹介していきたいと思います。  
ソフトウェアの品質向上に役立てていただければと幸いです。
