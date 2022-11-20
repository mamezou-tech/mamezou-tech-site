---
title: Google Test を使ってみる（その３：テストフィクスチャ編）
author: shuichi-takatsu
date: 2022-11-14
tags: [テスト, googletest]
---

[前回](/blogs/2022/11/06/google-test-02/)は簡単なサンプルプログラムのテストケースを「Google Test」を使って記述し、テストを実行してみました。  
今回はもう少し複雑なプログラムのテストケースを Google Test の「テストフィクスチャ」を使って動かしてみます。

[[TOC]]

## テストフィクスチャ とは

複数のテストケースを書いていると、複数のテストケースに同じセットアップ(テストケースに事前に値を設定するなど)を使いまわしたい場合があります。  
データの”使いまわし(再利用)”を簡単に実現するには「グローバル変数」を用いるのが最も簡単ですが、グローバル変数は名前空間を汚染するだけでなく、うっかり初期化や終了処理を怠ると他のテストケースに影響が伝搬してしまいます。  

そのような場合には「テストフィクスチャ」を使用します。  
テストフィクスチャを使うと、テストケース毎に毎回新しい変数(データ)が利用でき、テストの独立性が保たれます。  

テストフィクスチャはクラスとして実装します。  
Google Test にはテストフィクスチャの基底クラスが用意されているので、利用者はこの基底クラスを継承したテストフィクスチャを作成し、必要なデータを設定することができます。  

## お題：カウンタクラスの実装

Google Test が提供するサンプルプログラムにも同様の機能を持つクラスが実装されていますが、今回はもっと簡略化した「加算と減算のメソッドを持つクラス(カウンタクラス)」を作成し、このカウンタクラスのテストを通して、テストフィクスチャの動作を確認していきます。  
カウンタクラスの加算・減算メソッドの戻り値は正の整数とゼロのみとします。  

サンプルのカウンタクラスのソースコードを以下に示します。

カウンタクラス：counter.h, counter.cc  

counter.h  
```cpp
#ifndef _COUNTER_H_
#define _COUNTER_H_

class Counter {
 private:
  int counter_;

 public:
  Counter() {}      // 何もしない
  ~Counter() {}     // 何もしない

  void Init();      // 初期化
  int Increment();  // 加算
  int Decrement();  // 減算
};

#endif  // _COUNTER_H_
```

counter.cc  
```cpp
#include "counter.h"

void Counter::Init() {
  counter_ = 0; // 初期化
}

int Counter::Increment() {
  return ++counter_;
}

int Counter::Decrement() {
  if (counter_ <= 0) {
    return counter_;
  } else {
    return --counter_;
  }
}
```

## カウンタクラスのソースコードの解説

カウンタクラスには「Init」「Increment」「Decrement」の３つのメソッドが用意されています。  
コンストラクタ、デストラクタは何もしていません。  
Init は内部変数「counter_」の値をゼロに初期化します。  
「初期化だけならコンストラクタの初期化子で実装すればいいじゃん」と言われそうですが、今回はわざと「Init」を呼び出さないと内部変数の初期化がされない状態を作り出しています。  
Increment は内部変数をプラス１した後の変数の値を戻り値にします。  
Decrement は内部変数がゼロ以下の場合、そのままの値を戻り値にし、ゼロより大きい場合はマイナス１した後の変数の値を戻り値にします。（今回の場合、内部変数の値が０より小さい値になることはありませんが、筆者はこのように実装する癖が付いています。）

## テストフィクスチャを使わずに、カウンタクラスのテストケース(Test1)を書く

今回４つのテストケースを用意します。  
- 加算を繰り返すテスト（テスト名：Increment）
- 減算を繰り返すテスト（テスト名：Decrement）
- 加算と減算を複数回繰り返すテスト（テスト名：Both）
- 減算してもマイナスにならないことの確認テスト（テスト名：Error）

counter_test1.cc  
```cpp
#include <gtest/gtest.h>

#include "counter.h"

namespace {

TEST(CounterTest, Increment) {
  // クラスを用意して、初期化する
  Counter c;
  c.Init();

  EXPECT_EQ(1, c.Increment());  // 期待値：1
  EXPECT_EQ(2, c.Increment());  // 期待値：2
}

TEST(CounterTest, Decrement) {
  // クラスを用意して、初期化する
  Counter c;
  c.Init();

  EXPECT_EQ(0, c.Decrement());  // 期待値：0
  EXPECT_EQ(0, c.Decrement());  // 期待値：0
}

TEST(CounterTest, Both) {
  // クラスを用意して、初期化する
  Counter c;
  c.Init();

  EXPECT_EQ(1, c.Increment());  // 期待値：1
  EXPECT_EQ(2, c.Increment());  // 期待値：2

  EXPECT_EQ(1, c.Decrement());  // 期待値：1
  EXPECT_EQ(0, c.Decrement());  // 期待値：0

  EXPECT_EQ(1, c.Increment());  // 期待値：1
}

TEST(CounterTest, Error) {
  // クラスを用意して、初期化する
  Counter c;
  c.Init();

  EXPECT_NE(-1, c.Decrement());  // 期待値：0
}

}  // namespace
```
## テストケース(Test1)の実行

コマンドラインでテストをコンパイルします。  
```shell
g++ counter.cc counter_test1.cc -o counter1 -g -pthread -lgtest_main -lgtest
```

テストを実行した結果を以下に示します。  

![](https://gyazo.com/a0bae80cf2a5c781f9d81e5a62bc3c38.png)

期待した通りの結果になりました。  
テストとしては結果的に目的を達成しているわけですが、テストケースに毎回  
```cpp
  // クラスを用意して、初期化する
  Counter c;
  c.Init();
```
を記述しなくてはなりません。  
もっとテストケースを”スマートに”書きたいと思います。  
テストケース内にはテストに必要な処理以外は極力書きたくないのです。

## テストフィクスチャを使って、カウンタクラスのテストケース(Test2)を書く

テストフィクスチャは
```cpp
testing::Test
```
を継承して作成します。  
今回の場合、テストフィクスチャを以下のように実装しました。  

```cpp
// フィクスチャクラスを作る
class CounterTest : public testing::Test {
  protected:
    Counter c;

    virtual void SetUp() {
      c.Init();
    }
    // virtual void TearDown() {}
};
```

今回作成したカウンタクラスには終了処理は必要無いので、初期化セットアップの部分のみを記述しています。  
その部分が  
```cpp
    virtual void SetUp() {
      c.Init();
    }
```
になります。  
この部分でカウンタクラスの内部変数を初期化する「Init」メソッドを呼び出しています。  

また、テストケースから参照される内部変数「c」は protected で定義します。  
```cpp
  protected:
    Counter c;
```

テストフィクスチャを使ったテストケース全体を以下のようにしました。  

counter_test2.cc
```cpp
#include <gtest/gtest.h>

#include "counter.h"

namespace {

// フィクスチャークラスを作る
class CounterTest : public testing::Test {
  protected:
    Counter c;

    virtual void SetUp() {
      c.Init();
    }
    // virtual void TearDown() {}
};

TEST_F(CounterTest, Increment) {
  // Counter c; としても良いが、フィクスチャーとしてデータやクラスを使いまわしたいので、CounterTestというフィクスチャークラスを作る

  EXPECT_EQ(1, c.Increment());  // 期待値：1
  EXPECT_EQ(2, c.Increment());  // 期待値：2
}

TEST_F(CounterTest, Decrement) {
  EXPECT_EQ(0, c.Decrement());  // 期待値：0
  EXPECT_EQ(0, c.Decrement());  // 期待値：0
}

TEST_F(CounterTest, Both) {
  EXPECT_EQ(1, c.Increment());  // 期待値：1
  EXPECT_EQ(2, c.Increment());  // 期待値：2

  EXPECT_EQ(1, c.Decrement());  // 期待値：1
  EXPECT_EQ(0, c.Decrement());  // 期待値：0

  EXPECT_EQ(1, c.Increment());  // 期待値：1
}

TEST_F(CounterTest, Error) {
  EXPECT_NE(-1, c.Decrement());  // 期待値：0
}

}  // namespace
```

先ほどの「counter_test1.cc」と異なるところは以下の点です。  
- TEST マクロから TEST_F マクロに変更されている
- 各テストケース内から、counter_test1では必要だった「カウンタクラス実体登録」と「初期化メソッド呼び出し」の処理が無くなっている
- テストケース名の部分にテストフィクスチャクラスそのもの(CounterTest)を渡している

テストケース内で参照しているカウンタクラスの実体「c」は特別な設定をすることなく、そのままテストケース内で参照が可能になっています。  

## テストケース(Test2)の実行

コマンドラインでテストをコンパイルします。  
```shell
g++ counter.cc counter_test2.cc -o counter2 -g -pthread -lgtest_main -lgtest
```

テストを実行した結果を以下に示します。  

![](https://gyazo.com/af04b25900d703e9176ffb72d6facac1.png)

Test1の場合と同様の結果になりました。  
正しく「テストフィクスチャ」が機能していることがわかりました。  

## おまけ

もし、Initメソッドを呼ばずにテストを実行した場合はどうなるでしょうか？  
試しにInitメソッドを呼ばないバージョンを作成し、Incrementテストを実行してみます。  
結果は以下のようになりました。

![](https://gyazo.com/e0a881df325d06b42ec219550dffa905.png)

クラスの初期化が実行されていないため、テストが失敗していることがわかります。

## まとめ

今回は Google Test のテストフィクスチャを使うことで、テストケースを実行する前に、データをテストケースに渡すことができることを確認しました。  
次回はテストケースの実行をサポートするVSCode拡張機能「GoogleTest Adapter」の設定や使い方を紹介したいと思います。   

[ソフトウェアテストに関する技法やテクニックをまとめています。](/testing/)

テストに活用していただければ幸いです。
