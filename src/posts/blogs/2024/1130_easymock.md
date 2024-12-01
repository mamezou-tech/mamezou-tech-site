---
title: EasyMockの基本的な使い方の備忘録
author: issei-fujimoto
date: 2024-11-30
tags: [テスト, easymock, java, junit]
image: true
---

内製化支援などの案件で実装初心者の方にレクチャすることがあるのですが、テストの実装は皆さん躓きやすい部分です。単体テストでもモックオブジェクトを使ったりしてなおさら難しい。それらに関しては外部のライブラリなのでJavaの講座でもやらなかったりします。
というわけでそのようなライブラリの中でも以前の案件でよく使われていたEasyMockについて、大体カバーできるかなという使い方をおさらいしようと思います。

## EasyMockについて

[EasyMock](https://easymock.org/)はモックオブジェクトを作成するモックライブラリになります。
モックオブジェクトは設定したオブジェクトのふるまいを模倣でき、テスト対象が依存しているクラスを置き換えてテストを実行することで、依存先の実装状況に依らずテストを作成できるようになります。

## 実行環境

JUnitとEasyMockに関しては以下のバージョンを使用しています。
- [JUnit](https://junit.org/junit5/): 5.10.2
- [EasyMock](https://easymock.org/): 5.4.0

## テスト対象

今回は対戦ゲームの対戦結果から、特定のプレイヤーの勝率を取得する処理を作成します。
まず対戦結果のエンティティとして「GameResult」クラスが以下になります。簡易化のためにプレイヤーのエンティティなどは作らずに名前だけを持つ形とします。
プレイヤーは二人で対戦するゲームとして、画面に対して右か左か、将棋なら王将側か玉将側か、のようなイメージでplayer1とplayer2を持っています。同じプレイヤー同士、AさんとBさんの対戦でも「player1:A, player2:B」にも「player1:B, player2:A」にもなり得ます。

```java:GameResult.java
public class GameResult {
    /** 対戦結果ID */
    private Long id;
    /** プレイヤー1の名前 */
    private String player1;
    /** プレイヤー2の名前 */
    private String player2;
    /** 対戦結果(0:引き分け 1:プレイヤー1の勝利 2:プレイヤー2の勝利) */
    private int result;

    // コンストラクタ
    public GameResult(Long id, String player1, String player2, int result) {
        this.id = id;
        this.player1 = player1;
        this.player2 = player2;
        this.result = result;
    }

    // 以下getterとsetterを省略
}
```

次にGameResultを取得するインターフェースの「GameResultDao」及び「findByPlayer」メソッドを定義します。
findByPlayerメソッドはプレイヤーの名前を引数としてGameResultのリストを返すという仕様とします。実装では「GameResult」を保管しているDBテーブルから、引数のplayerがplayer1もしくはplayer2と一致するGameResultを返すような気がしますね。
このメソッドを使う「GameResultRepository」クラスを次に作り、その単体テストにおいてGameResultDaoのモックオブジェクトでfindByPlayerを模倣します。

```java:GameResultDao.java

import java.util.List;
import entity.GameResult;

public interface GameResultDao {
    List<GameResult> findByPlayer(String player);
}

```

プロダクトコードの最後が「GameResultrepository」になります。
引数のプレイヤーの 勝利数/戦績の数 を計算する「calcWinningRate」メソッドを作成します。勝ったのがplayer1の場合とplayer2の場合があるので、その部分を判断して勝利数に計上します。また割り算の誤差などに対応するため、BigDecimalクラスを使って計算しています。
ロジックに関してはコメントにある通りですが、GameResultDaoはインジェクションされる想定としてgetterを作成していません。

```java:GameResultRepository.java

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import dao.GameResultDao;
import entity.GameResult;

public class GameResultRepository {

    // 本来はインジェクションなどでインスタンスを取得する想定
    // テスト時にモックを使う対象
    private GameResultDao gameResultDao;

    /**
     * 勝率を計算するメソッド
     * 
     * @param player プレイヤー名
     * @return 10進数の勝率
     * @throws Exception 例外
     */
    public BigDecimal calcWinningRate(String player) throws Exception {
        // テスト時にはこのふるまいをモックで模倣したい
        List<GameResult> results = gameResultDao.findByPlayer(player);

        // 引数のプレイヤーに関する戦績がない場合は例外を投げる
        if (results.size() == 0) {
            throw new Exception();
        }

        // 引数のプレイヤーが勝利した回数を数える
        int winningCount = 0;
        for (GameResult result : results) {
            String winner;
            // GameResultのresultの値によって勝ったのがplayer1かplayer2かを判断する
            switch (result.getResult()) {
                case 1:
                    winner = result.getPlayer1();
                    break;
                case 2:
                    winner = result.getPlayer2();
                    break;
                default:
                    continue;
            }
            if (player.equals(winner)) {
                winningCount++;
            }
        }

        // 10進数で割り算を行い勝率を求める(勝った数/対戦結果の数)
        return new BigDecimal(winningCount).divide(new BigDecimal(results.size()), 4,
                RoundingMode.HALF_UP);
    }
}

```

## テストコード

以下のようなテストコードを作成しました。EasyMockに関する部分にコメントを入れていますが、下で解説します。
参考:EasyMockの[ユーザーガイド](https://easymock.org/user-guide.html)

```java:GameResultRepositoryTest.java

import static org.easymock.EasyMock.expect;
import static org.easymock.EasyMock.mock;
import static org.easymock.EasyMock.replay;
import static org.easymock.EasyMock.verify;
import static org.junit.jupiter.api.Assertions.assertEquals;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import dao.GameResultDao;
import entity.GameResult;

public class GameResultRepositoryTest {

    /* テスト対象 */
    private GameResultRepository testee;

    /* モック化対象 */
    private GameResultDao mockGameResultDao;

    @BeforeEach
    public void setUp() throws Exception {
        testee = new GameResultRepository();

        // 1:モックオブジェクトを作成する
        mockGameResultDao = mock(GameResultDao.class);

        // 2:モックオブジェクトを差し込む
        Field field = testee.getClass().getDeclaredField("gameResultDao");
        field.setAccessible(true);
        field.set(testee, mockGameResultDao);
    }

    @Test
    public void testCalcWinningRate() throws Exception {
        /* Daoの返り値にしたい対戦結果のリスト */
        List<GameResult> resultList = new ArrayList<>();
        resultList.add(new GameResult(1L, "Ryu", "Ken", 1));
        resultList.add(new GameResult(2L, "Guile", "Ryu", 1));
        resultList.add(new GameResult(4L, "Guile", "Ryu", 2));
        resultList.add(new GameResult(5L, "Ryu", "Ken", 2));
        resultList.add(new GameResult(6L, "Ryu", "Ken", 0));

        // 3:ふるまいを定義する
        expect(mockGameResultDao.findByPlayer("Ryu")).andReturn(resultList);

        // 4:定義したふるまいの実行を準備する
        replay(mockGameResultDao);

        BigDecimal actual = testee.calcWinningRate("Ryu");
        assertEquals(new BigDecimal("0.4000"), actual);

        // 5:定義したとおりにふるまったかを確認する
        verify(mockGameResultDao);
    }
}
```

### 1:モックオブジェクトを作成する

```java
    // 1:モックオブジェクトを作成する
    mockGameResultDao = mock(GameResultDao.class);
```

「@BeforeEach」アノテーションを付けたメソッド内で「mockGameResultDao」の中身となるモックオブジェクトを作成しています。「mock」メソッドを使うことで引数に渡したクラスを模倣したモックオブジェクトが作られます。

::: info
モック作成についての補足

mockメソッドはeasymockバージョン3.4から使用可能で、それ以前のバージョンはcreateMockを使用します。
```java
mockGameResultDao = createMock(GameResultDao.class);
```
↓createMockのjavadoc
> <GameResultDao> GameResultDao org.easymock.EasyMock.createMock(Class<?> toMock)
> Creates a mock object that implements the given interface, order checking is disabled by default.
>
> Note: This is the old version of mock(Class), which is more completion friendly


また、バージョン3.2以降ではモックオブジェクトを差し込む操作も含めてアノテーションを使う方法もあります。[ユーザーガイド](https://easymock.org/user-guide.html#:~:text=There%20is%20a%20nice%20and%20shorter%20way%20to%20create%20your%20mocks%20and%20inject%20them%20to%20the%20tested%20class.%20Here%20is%20the%20example%20above%2C%20now%20using%20annotations%3A)
::::


### 2:モックオブジェクトを差し込む

```java
    // 2:モックオブジェクトを差し込む
    Field field = testee.getClass().getDeclaredField("gameResultDao");
    field.setAccessible(true);
    field.set(testee, mockGameResultDao);
```

作ったモックがテスト対象のロジックで使われるようにする必要があります。
今回のテスト対象クラス「GameResultRepository」は変数「gameResultDao」のgetterを用意していないため「java.lang.reflect.Field」を用いてリフレクションにより取得させます。これによってテスト対象である「testee」内の変数「gameResultDao」がモックオブジェクトに差し替えられます。
他によくあるパターンとしては、他のリポジトリから取得してきたドメインのロジックをモックするなどがあります。こういった場合はリポジトリのモックからドメインのモックを返すように、ふるまいを作ったりします。

### 3:ふるまいを定義する

```java
    // 3:ふるまいを定義する
    expect(mockGameResultDao.findByPlayer("Ryu")).andReturn(resultList);
```

モックオブジェクトのメソッド呼び出しによって、そのメソッドのふるまいを定義します。後に「replay」を行うと定義した通りにふるまうようになります。返り値などを定義する場合は「org.easymock.EasyMock.expect」の引数の中でメソッドの呼び出され方を定義し、続く「andReturn」メソッドの引数に返り値を定義します。
↑の例の場合、「mockGameResultDaoのfindByPlayerメソッドが引数"Ryu"で呼ばれたらresultListを返す。」というふるまいを定義しています。
何度か呼ばれる場合、同じ動きをするなら続けて「times」メソッドを使います。別の動き方をする場合はその数だけ定義します。また、同じ引数に対しては基本的に定義した順にふるまいます。

```java
    /* 複数回呼ばれる場合の例 */

    // 3回同じふるまいをするように呼ばれる場合、「times」メソッドを使って回数を定義する
    expect(mockGameResultDao.findByPlayer("Ryu")).andReturn(resultList).times(3);
    // 異なる呼ばれ方をする場合、その数だけ定義する
    expect(mockGameResultDao.findByPlayer("Ken")).andReturn(resultList);
```

他のパターンとして、以下もよく使います。
- 返り値のないメソッドの場合、expectメソッドは不要
- 例外を投げさせたい場合はandReturnではなく「andThrow(Throwable throwable)」メソッドを使用

```java
    // 返り値がないメソッドの場合はexpectは不要となる
    mockGameResultDao.findByPlayer("Ryu");
    // 例外を投げさせたい場合、andThrowの引数に投げさせる例外のインスタンスを渡す
    expect(mockGameResultDao.findByPlayer("Ryu")).andThrow(new Exception());
```

ここで定義していない呼び出され方をした場合、AssertionErrorが発生します。
↓はGameResultDao.findByPlayerメソッドの引数が"Ken"で呼び出されたことと、"Ryu"で1回呼び出されるはずが0回呼び出された旨のエラー表示です。

```
java.lang.AssertionError: 
  Unexpected method call EasyMock for interface dao.GameResultDao -> GameResultDao.findByPlayer("Ken"):
    EasyMock for interface dao.GameResultDao -> GameResultDao.findByPlayer("Ryu"): expected: 1, actual: 0
    ...
```


### 4:定義したふるまいの実行を準備する

```java 
    // 4:定義したふるまいの実行を準備する
    replay(mockGameResultDao);
```

ふるまいを定義できたら、次は実際にモックオブジェクトを動かすため「replay」メソッドを使います。このメソッドの実行後は、モックオブジェクトが定義したふるまい通り動くようになります。
引数にモックオブジェクトのインスタンスを渡します。動かしたいモックが複数ある場合も一度に入れてあげればよいです。

```java
    // モックが複数ある場合は一緒に入れる
    // void org.easymock.EasyMock.replay(Object... mocks)
    replay(mockGameResultDao, mockNanka, mockBetsuno);
```

### 5:定義したとおりにふるまったかを確認する

```java
    // 5:定義したとおりにふるまったかを確認する
    verify(mockGameResultDao);
```


テスト対象のメソッドの実行後、定義した通りにモックが呼び出されたかを確認します。replayと同様、複数のモックを同時に引数に入れられます。
定義したのに呼ばれていないメソッドなどがあるとここでAssertionErrorが発生します。

↓はverifyメソッドの呼び出し時点で定義されたのに呼び出されていないモックのメソッドがあることを示すエラーです。

```
java.lang.AssertionError: 
  Expectation failure on verify:
    EasyMock for interface dao.GameResultDao -> GameResultDao.findByPlayer("Ken"): expected: 1, actual: 0
    ...
```

## キャプチャ機能

オブジェクトを受け取るメソッドをモックで模倣する場合は、ここまでの方法でふるまいを定義すると値の確認が難しいです。
そのような場合はキャプチャクラスを使うと、テスト対象の実行後に引数の内容の確認が可能です。

```java
// キャプチャを使うためのimport
import static org.easymock.EasyMock.capture;
import org.easymock.Capture;

/* 略 */

    @Test
    public void testCalcWinningRate() throws Exception {

        List<GameResult> resultList = new ArrayList<>();
        resultList.add(new GameResult(1L, "Ryu", "Ken", 1));
        resultList.add(new GameResult(2L, "Guile", "Ryu", 1));
        resultList.add(new GameResult(4L, "Guile", "Ryu", 2));
        resultList.add(new GameResult(5L, "Ryu", "Ken", 2));
        resultList.add(new GameResult(6L, "Ryu", "Ken", 0));

        // 1:キャプチャを作成する
        Capture<String> captured = Capture.newInstance();

        // 2:ふるまい定義時の引数をキャプチャにする
        expect(mockGameResultDao.findByPlayer(capture(captured))).andReturn(resultList);

        replay(mockGameResultDao);

        BigDecimal actual = testee.calcWinningRate("Ryu");

        // 3:定義したメソッドの引数をキャプチャから取得して内容を確認する
        String capturedValue = captured.getValue();
        assertEquals("Ryu", capturedValue);

        assertEquals(new BigDecimal("0.4000"), actual);
        verify(mockGameResultDao);
    }
```

### 1:キャプチャを作成する

キャプチャしたいクラスをジェネリクスに指定してCapture型を宣言し、「Capture.newInstance()」でインスタンスを作成します。
最終的にはテスト中にモックのメソッドに渡された引数を、このインスタンスから取得する形になります。

```java
// 1:キャプチャを作成する
Capture<String> captured = Capture.newInstance();
```

### 2:ふるまい定義時の引数をキャプチャにする

モックオブジェクトの引数に「capture」メソッドを指定し、更にその引数に先ほど作成したインスタンスを渡します。

```java
// 2:ふるまい定義時の引数をキャプチャにする
expect(mockGameResultDao.findByPlayer(capture(captured))).andReturn(resultList);
```

### 3:キャプチャから値を取得して内容を確認する

テスト対象の実行後、「getValue」メソッドを使ってモックの引数をCaptureクラスから取得し、その内容を確認します。

```java
// 3:キャプチャから取得して内容を確認する
String capturedValue = captured.getValue();
assertEquals("Ryu", capturedValue);
```

## まとめ

EasyMockの基本的な使い方をまとめました。大体のテストケースをカバーできるのではないかなと思います。
他にもアノテーションでのオブジェクト作成・差し込みや複数のモックを使いやすくする機能など色々あったりしますので、やってみたらすごく面倒臭いという場合には調べてみたら楽になるかもしれません。



