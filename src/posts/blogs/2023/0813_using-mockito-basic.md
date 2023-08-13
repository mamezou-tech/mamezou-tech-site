---
title: Java用モック・フレームワーク「Mockito」を使ってみる（その１：基本編）
author: shuichi-takatsu
date: 2023-08-13
tags: [テスト, mockito, java, junit]
---

## 「Mockito」とは

[Mockito](https://site.mockito.org/) は、Java でユニットテストを行う際に使用されるモック・フレームワーク(mocking framework)です。  
Mockito を使用すると、実際のオブジェクトの代わりに「モック(仮の実装)」を作成し、テストケース内で特定の振る舞いを模倣できます。  
外部依存の他のクラスが完成していない状態でも、独立してテストを実行することができます。 

Mockito は、テスト駆動開発(TDD)と相性が良く、コードの品質を向上させるのに役立つツールです。  
段階的にテストを実装できるので、効率的にバグを発見できます。  

また、すでに動いているコードを変更する際にも、回帰テストやリファクタリングを強力にサポートします。  

## 今回使用するモジュールのバージョン

今回使用していく Mockito と JUnit のバージョンは以下です。(2023/08/11時点での最新)  
- [JUnit](https://junit.org/junit5/): 5.10.0
- [Mockito](https://site.mockito.org/): 5.4.0

Mavenで環境を構築している場合は以下のように依存関係を設定します。

```xml
  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.0</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.mockito</groupId>
      <artifactId>mockito-core</artifactId>
      <version>5.4.0</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
```

## サンプルプログラム

今回は架空のプロジェクトとして「距離センサーを使用して、対象物との距離を判定するコントローラー」を開発するプロジェクトを想定します。  

対象物との距離を判定するコントローラー「FooController」を自部門で開発します。Javaのクラスとして実装することにします。  
この FooController が実際に対象物の距離を測定するために使用するモジュールが「距離を測定するセンサー ”BarSensor”」です。これはJavaのインターフェイスとして定義します。  
この距離センサーモジュールは他部門で作成中であり、インターフェイスの仕様は決まっていますが、まだ実装を受け取っていません。  

FooController と BarSensor の関係  
![](https://gyazo.com/49ac2fe38e4f7b9e43b01384ce391e21.png)

「FooController」の仕様を以下のように定義します。  

- コンストラクタでセンサーオブジェクトを受け取る。  
- 対象物との距離の上限を設定する内部変数「UPPER_LIMIT」を持つ。（今回は上限値を「200」とする）
- 対象物との距離の下限を設定する内部変数「LOWER_LIMIT」を持つ。（今回は下限値を「100」とする）
- 対象物との距離を判定する「check」メソッドを持ち、このメソッドは上記の上限値／下限値の範囲内に対象物が収まっている場合Trueを返す。それ以外はFalseを返す。（今回は対象物の距離が100から200の範囲内であればTrueを戻す。それ以外はFalseを戻す）
- センサーオブジェクトがNullの場合は「NullPointerException」例外をThrowする。  

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
        if (FooController.UPPER_LIMIT >= this.barSensor.scan() && this.barSensor.scan() >= FooController.LOWER_LIMIT)
            return true;
        return false;
    }
}
```

「BarSensor」の仕様については、距離センサーを開発する部門と以下のように取り決めてあります。（Javaのインターフェイス）  

- 対象物との距離を測定する「scan」メソッドを持つ。戻り値はInt型。  

（今回、距離センサーが物理故障をしていた場合の挙動については未定義とします）

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

}
```

## テストクラス

今回、「FooController」をテストしたいのですが、まだ距離センサー「BarSensor」の実装が完成していません。  
BarSensor が完成していない状態で FooController をテストするために BarSensor をモックで置き換えます。  

テストクラス「FooControllerTest」を以下のように実装していきます。  

```java
package com.example;

public class FooControllerTest {

    private FooController fooController = null;

    private BarSensor barSensor = null;

    @Test
    void testCase() {
        // ここにテストコードを記述します。
    }

}
```

## モックの作成とコントローラーへの設定

BarSensor のモックを作成します。  
モックの作成には、Mockitoの「mock」メソッドを利用します。
以下のコードで「BarSensor」のモックを作成します。

```java
    this.barSensor = mock(BarSensor.class);
```

次のコードで「FooController」のコンストラクタに先ほど作成したモックを渡して、コントローラーのオブジェクトを作成します。

```java
    this.fooController = new FooController(this.barSensor);
```

これらのコードを JUnitの「BeforeEach」アノテーションを使って、毎テストケース実行前にオブジェクトを生成するように定義します。  
（今回の実装では毎回オブジェクトを生成する必要はありませんが、オブジェクトが状態を保持するようなケースもあるので、毎テストケース実行前にテスト対象を生成する方が安全です）
BeforeEach アノテーションを使ったテストケース実行前のセットアップメソッドを以下とします。  

```java
    @BeforeEach
    void setUp() {
        this.barSensor = mock(BarSensor.class);
        this.fooController = new FooController(this.barSensor);
    }
```

## モックの動作定義

テストケース内に評価を実装していきます。  
とりあえず、「check()メソッドが成功するケース」を実装します。  

```java
    @Test
    void testCase() {
        assertEquals(true, this.fooController.check(), "成功するケース");
    }
```

ただし、上記のテストケースを実行しても正しく動作しません。  
まだモックの動作を定義していないからです。  
モックの動作を指定するには Mockito の「when」メソッドを使用します。  
（他の実装方法もありますが、今回は”基本”なので when メソッドで動作を定義します）

```java
    when(this.barSensor.scan()).thenReturn(150);
```

上記の「when(this.barSensor.scan())」で動作を指定し、「thenReturn(150)」で戻り値を指定します。  
今回の場合「距離センサーのscanメソッドが実行された時、値”150”を戻す」となります。

モックの動作定義と評価を組み合わせて、テストケースを以下のように実装します。  

```java
    @Test
    void testCase() {
        when(this.barSensor.scan()).thenReturn(150);
        assertEquals(true, this.fooController.check(), "成功するケース");
    }
```

## テストケースの実装

簡単なテストケースの例として、以下の３つのテストケースを実装してみましょう。
- 距離センサーが値50を戻す場合、コントローラーのチェックはFalseを戻すこと。（テストケース：testCase01）
- 距離センサーが値150を戻す場合、コントローラーのチェックはTrueを戻すこと。（テストケース：testCase02）
- 距離センサーが値250を戻す場合、コントローラーのチェックはFalseを戻すこと。（テストケース：testCase03）

（距離センサーがNullオブジェクトの場合に例外が発生するケースは除外しています）

```java
package com.example;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;

import static org.junit.jupiter.api.Assertions.assertEquals;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

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
        when(this.barSensor.scan()).thenReturn(50);
        assertEquals(false, this.fooController.check(), "距離50 : False");
    }

    @Test
    void testCase02() {
        when(this.barSensor.scan()).thenReturn(150);
        assertEquals(true, this.fooController.check(), "距離150 : True");
    }

    @Test
    void testCase03() {
        when(this.barSensor.scan()).thenReturn(250);
        assertEquals(false, this.fooController.check(), "距離250 : False");
    }

}
```

## テストケース実行結果

上記のテストケースを実行してみます。  
JUnit5の実行にはVisual Studio Codeの拡張機能「[Test Runner for Java](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-test)」を利用しました。

![](https://gyazo.com/a44da2dd45fe376dfe8c46250995fc52.png)

テストエクスプローラーからテストを実行します。  
すべてのテストケースが成功と表示されました。  

![](https://gyazo.com/1b32022cbc77750c0fe8f2803aefd48c.png)

## もう一つのモック作成方法

Mockito ではモックの作成にアノテーションを使うこともできます。  
アノテーションを使ったモック作成方法を以下に示します。  

```java
public class FooControllerTest {

    @Mock
    private BarSensor barSensor;

    @InjectMocks
    private FooController fooController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testCase() {
        // テストケース
    }

}
```

上記のように「Mock」アノテーションでモック対象を指定します。  
「InjectMocks」アノテーションには、モックを挿入する対象を指定します。  
次におまじないのように以下のコードを追加しています。

```java
    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }
```

アノテーションを使用すると”いつ”、”どうやって” モックが挿入されたのかがよく分からないので、筆者としては前述の「mock()」メソッドを使った記述の方がわかりやすいと感じています。  

## まとめ

このように Mockito を使うことで、まだ実装されていないインターフェイスを組み込んでテストを実施することができました。  
大きなプロジェクトの場合、すべてのモジュールが同時に出来上がってくることは稀です。  
また仮にすべてのモジュールが出来上がってきたとしても、一気に結合してテストすることは非効率です。  

Mockito を使ってメソッドの返り値や例外をカスタマイズして、特定のシナリオをしっかりとユニットテストでテストして次の工程に進めたいと思います。  
ソフトウェアの品質向上に役立てていただければと幸いです。