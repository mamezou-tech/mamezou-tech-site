---
title: Google Test を使ってみる（その５：GoogleMock編）
author: shuichi-takatsu
date: 2023-10-08
tags: [テスト, googletest, googlemock]
---

[前回](/blogs/2022/11/20/google-test-04/)は Google Test の実行をサポートするVSCode拡張機能「GoogleTest Adapter」の設定や使い方を紹介しました。  
今回は Google Test を使う際によく使われるモック・フレームワーク「Google Mock」の簡単な使い方を紹介したいと思います。  

## Google Mock とは

Google Mock は「Google C++ Mocking Framework」の略称です。    
Google Mock はモック・クラスを作成・利用するためのフレームワークで、単体テスト（ユニットテスト）を実行する際によく利用されます。  
同じ単体テスト用のフレームワークとして、Java言語用では「Mockito」、Python言語用では「pytest-mock」などがあります。  

## なぜ「モック」を使うのか

単体テスト（ユニットテスト）を実行するときに、テスト対象のオブジェクトが呼び出す他のオブジェクトがまだ未完成だったり、他のオブジェクトを用意してテストを実行するのに多くの労力を要するなど、単体テストの実行を妨げる要因が発生することがあります。    
そのような時に、他のオブジェクトの代わりに「モック(仮の実装)」を作成することで、外部依存している他のオブジェクトが完成していないとか用意できない状態でも、独立してテストを実行することができます。

Google Mock は、テスト駆動開発(TDD)と相性が良く、コードの品質を向上させるのに役立つツールです。
段階的にテストを実装できるので、効率的にバグを発見できます。  

## サンプルクラス「湯沸かし器コントローラ」と「水位センサ」

簡単なサンプルを使って Google Mock の使い方を見てみましょう。  
まず、サンプルとして「湯沸かし器コントローラ」と「水位センサ」を考えます。  
Google Mock の動作を見るためなので、仕様は”超簡単”にしています。  

「湯沸かし器コントローラ」クラスの仕様：  
- 湯沸かし器に投入できる水の水位の上限値と下限値を「定数」として持つ。
- 湯沸かし器コントローラは取得した水位が上限値以下かつ下限値以上だった場合に湯沸かし可能とし、それ以外は湯沸かし不可と判断する関数（メソッド）を持つ。
- 湯沸かし器コントローラは「水位センサ」を使って湯沸かし器内の水位を計測する。

湯沸かし器コントローラが「水位センサ」を使用することがわかりました。  
では、水位センサのインターフェイス仕様を考えます。

「水位センサ」インターフェイスの仕様：  
- 設置された容器（今回の場合は湯沸かし器）内の水位を取得する関数（メソッド）を持つ。

:::info
C++言語にはJava言語のような「interface」宣言が無いですが、純粋仮想関数と純粋仮想デストラクタを用いて「インターフェイスクラス」を用意することで対応します。インターフェイスクラスの実装については後述します。  
:::

まず「湯沸かし器コントローラ」クラスのソースコードを掲載します。
  
「KettleController.h」  
```cpp
#ifndef KETTLE_CONTROLLER_H_
#define KETTLE_CONTROLLER_H_

#include "IWaterVolumeSensor.h"

/**
 * KettleController
 * 湯沸かしコントローラ
 */
class KettleController
{
private:
  // 水位センサ・インターフェイスのポインタ
  IWaterVolumeSensor *pWaterVolumeSensor_ = nullptr;
  // 水位上限(単位：mm)
  const int UPPER_LIMIT = 100;
  // 水位下限(単位：mm)
  const int LOWER_LIMIT = 10;

public:
  KettleController(IWaterVolumeSensor* pWaterVolumeSensor)
  {
    pWaterVolumeSensor_ = pWaterVolumeSensor;
  }
  virtual ~KettleController() {}

  // 湯沸かし可能判定
  bool canBoil();
};

#endif // KETTLE_CONTROLLER_H_
```

「KettleController.cpp」  
```cpp
#include "KettleController.h"

bool KettleController::canBoil()
{
    // 湯沸かし器内の水位を取得
    int level = pWaterVolumeSensor_->scan();
     // 水位が10mm以上、100mm以下の場合はTRUE、それ以外はFALSE
    return (level <= UPPER_LIMIT && level >= LOWER_LIMIT);
}
```

湯沸かし器コントローラクラス（KettleController）のソースコードの内容を説明します。  
湯沸かし器コントローラクラスはコンストラクタで「水位センサ（IWaterVolumeSensor）」インターフェイスのポインタを受け取ります。  

湯沸かし器コントローラクラスは、canBoil メソッドの中で水位センサを使って水位を取得します。  
canBoil メソッドは、水位が上限値・下限値の範囲内に収まっている場合には TRUE を戻し、それ以外の場合は FALSE を戻します。  

次に「水位センサ」インターフェイスのソースコードを掲載します。  

「IWaterVolumeSensor.h」
```cpp
#ifndef IWATER_VOLUME_SENSOR_H_
#define IWATER_VOLUME_SENSOR_H_

/**
 * IWaterVolumeSensor
 * 水位センサ
 */
class IWaterVolumeSensor
{
public:
  virtual ~IWaterVolumeSensor() = 0; // 純粋仮想デストラクタ
  virtual int scan() = 0;            // 純粋仮想関数
};

#endif // IWATER_VOLUME_SENSOR_H_
```

「IWaterVolumeSensor.cpp」
```cpp
#include "IWaterVolumeSensor.h"

IWaterVolumeSensor::~IWaterVolumeSensor() {}
```

水位センサインターフェイス（IWaterVolumeSensor）のソースコードの内容を説明します。

水位センサインターフェイスはクラスの中身を「純粋仮想関数」と「純粋仮想デストラクタ」を使って定義します。  
「デストラクタ」を「純粋仮想デストラクタ」に、「関数」を「純粋仮想関数」にします。  
実装方法は、デストラクタと関数を virtual 指定子で宣言し、末尾に「= 0」を付加します。  
```cpp
  virtual ~IWaterVolumeSensor() = 0; // 純粋仮想デストラクタ
  virtual int scan() = 0;            // 純粋仮想関数
```

純粋仮想デストラクタは、空でも良いので定義を実装する必要があります。（これが無いとビルドでエラーになります）  
```cpp
IWaterVolumeSensor::~IWaterVolumeSensor() {}
```

## 水位センサの実装がなくてもテストを実施したい

湯沸かし器コントローラクラスの単体テストを実施する場合を考えます。  
本来の単体テストであれば、”実際の”水位センサを用意して湯沸かし器コントローラクラスをテストをしたいところですが、水位センサデバイスの準備が必要だったりなど、単体テストに”実際の”水位センサを持ち込むのは得策ではないことが多々あります。  
そこで「モック」を作成して、あたかも”水位センサ”が機能しているかのように振る舞わせることにします。

水位センサのモック実装のソースコードを掲載します。

「MockWaterVolumeSensor.h」  
```cpp
#ifndef MOCK_WATER_VOLUME_SENSOR_H_
#define MOCK_WATER_VOLUME_SENSOR_H_

#include <gmock/gmock.h>

#include "IWaterVolumeSensor.h"

/**
 * MockWaterVolumeSensor
 * 水位センサのMock
 */
class MockWaterVolumeSensor : public IWaterVolumeSensor
{
public:
  MOCK_METHOD(int , scan, ());
};

#endif // MOCK_WATER_VOLUME_SENSOR_H_
```

水位センサのモック実装（MockWaterVolumeSensor）のソースコードの内容を説明します。

Google Mock を使用するため次のヘッダをインクルードします。  
```cpp
#include <gmock/gmock.h>
```

モッククラス（MockWaterVolumeSensor）は「IWaterVolumeSensor」を継承して作成します。  
モック化する対象のメソッド「scan」を「MOCK_METHOD」マクロを使って記述します。   

「MOCK_METHOD」の引数には以下を指定します。  
- 第１引数：モック化するメソッドの戻り値の型
- 第２引数：モック化するメソッドのメソッド名
- 第３引数：モック化するメソッドの引数

```cpp
  MOCK_METHOD(int , scan, ());
```

[こちらの情報](http://opencv.jp/googlemockdocs/fordummies.html#fordummies-how-to-define)では「MOCK_METHODn」マクロを使うとありますが、今回は「MOCK_METHOD」マクロを使います。
「MOCK_METHODn」マクロを使う場合は以下のように記述するようです。  
```cpp
  MOCK_METHOD0(scan, int());
```

この場合、第１引数にメソッド名、第二引数にメソッドの戻り値の型＋引数を書きます。  
今回引数は無しだったので「 MOCK_METHOD0」を使用します。  

## テストコードの実装

では、モッククラス（MockWaterVolumeSensor）を使った湯沸かし器コントローラクラスのテストコードを書いていきます。  
湯沸かし器コントローラクラスの仕様から境界値分析を行い、次の４つのテストケースを作成します。  
- 水位が9(mm)の場合、湯沸かし不可
- 水位が10(mm)の場合、湯沸かし可
- 水位が100(mm)の場合、湯沸かし可
- 水位が101(mm)の場合、湯沸かし不可

湯沸かし器コントローラクラスのテストコードを掲載します。

「KettleController_test.cpp」  
```cpp
#include <gtest/gtest.h>

#include "MockWaterVolumeSensor.h"
#include "KettleController.h"

namespace
{

  using ::testing::AtLeast;
  using ::testing::Return;
  using ::testing::Test;

  // フィクスチャークラスを作る
  class KettleControllerTest : public Test {
    protected:
      MockWaterVolumeSensor mock;
      KettleController kettleController = KettleController(&mock);
      // virtual void TearDown() {}
  };

  TEST_F(KettleControllerTest, 水位9：FALSE)
  {
    EXPECT_CALL(mock, scan()).Times(AtLeast(1)).WillOnce(Return(9)); // 水位 9
    EXPECT_EQ(false, kettleController.canBoil()); // 期待値：false
  }

  TEST_F(KettleControllerTest, 水位10：TRUE)
  {
    EXPECT_CALL(mock, scan()).Times(AtLeast(1)).WillOnce(Return(10)); // 水位 10
    EXPECT_EQ(true, kettleController.canBoil()); // 期待値：true
  }

  TEST_F(KettleControllerTest, 水位100：TRUE)
  {
    EXPECT_CALL(mock, scan()).Times(AtLeast(1)).WillOnce(Return(100)); // 水位 100
    EXPECT_EQ(true, kettleController.canBoil()); // 期待値：true
  }

  TEST_F(KettleControllerTest, 水位101：FALSE)
  {
    EXPECT_CALL(mock, scan()).Times(AtLeast(1)).WillOnce(Return(101)); // 水位 101
    EXPECT_EQ(false, kettleController.canBoil()); // 期待値：false
  }

  int main(int argc, char **argv)
  {
    // 以下の行は，テスト開始前に Google Mock （と Google Test）
    // を初期化するために必ず実行する必要があります．
    ::testing::InitGoogleMock(&argc, argv);
    return RUN_ALL_TESTS();
  }

} // namespace
```

湯沸かし器コントローラクラスのテストコードを内容を説明します。

フィクスチャークラスとして以下のクラスを定義しています。  
```cpp
class KettleControllerTest : public Test 
```

この中でモック化した水位センサクラス「MockWaterVolumeSensor」を定義し、湯沸かし器コントローラクラス「KettleController」のコンストラクタに渡しています。  
```cpp
    MockWaterVolumeSensor mock;
    KettleController kettleController = KettleController(&mock);
```

各テストケース「TEST_F」（テストフィクスチャ）の中では、モックの動作を設定しています。  
「EXPECT_CALL」マクロを使い、呼び出しに対して期待する動作を設定します。
「EXPECT_CALL」マクロの引数は以下です。  
- 第１引数：モックオブジェクト
- 第２引数：メソッド＋引数

今回は「EXPECT_CALL(mock, scan())」を設定しています。  

「EXPECT_CALL」マクロの直後の節「Times」で、呼び出しが何回起こるかを指定します。  
これを cardinality と呼びます。  
今回は「Times(AtLeast(1))」として、最低１回を設定しています。  
（AtLeast(n) は呼び出し回数が最低でも n 回であることが期待されます）  

その次の節「WillOnce」で、メソッドが呼び出されたときに何をすればよいのかを指示します。   
これを Action と呼びます。  
今回は「Return」アクションを使って、戻り値を設定しています。

例えば「EXPECT_CALL(mock, scan()).Times(AtLeast(1)).WillOnce(Return(9));」の例では、mock オブジェクトの scan メソッドが少なくとも１回呼び出された場合に、scan メソッドは値「9」を戻す、となります。

その後「EXPECT_EQ」マクロを使って、湯沸かし器コントローラクラスの「canBoil」メソッドの結果を判定しています。

また、Google Mock を使用する場合、以下のコードを追加する必要があるようです。  
```cpp
  int main(int argc, char **argv)
  {
    // 以下の行は，テスト開始前に Google Mock （と Google Test）
    // を初期化するために必ず実行する必要があります．
    ::testing::InitGoogleMock(&argc, argv);
    return RUN_ALL_TESTS();
  }
```
:::info
筆者が試したところ、上記の main 関数を記述しなくても Google Mock は機能しているように見えました。  
詳細は不明です。  
:::

## テストケースの実行

では早速、テストケースを実行してみましょう。  
次のコマンドでテストケースをビルドします。  
```shell
g++ IWaterVolumeSensor.cpp KettleController.cpp KettleController_test.cpp -o kettle -g -pthread -lgtest_main -lgtest -lgmock_main -lgmock
```

上記のコマンドを実行した後、実行ファイル「kettle.exe」が生成されているはずです。  
kettle.exe を実行すると以下のような出力が得られました。  
```text
[==========] Running 4 tests from 1 test suite.
[----------] Global test environment set-up.

[----------] 4 tests from KettleControllerTest
[ RUN      ] KettleControllerTest.水位9：FALSE
[       OK ] KettleControllerTest.水位9：FALSE (0 ms)
[ RUN      ] KettleControllerTest.水位10：TRUE
[       OK ] KettleControllerTest.水位10：TRUE (0 ms)
[ RUN      ] KettleControllerTest.水位100：TRUE
[       OK ] KettleControllerTest.水位100：TRUE (0 ms)
[ RUN      ] KettleControllerTest.水位101：FALSE
[       OK ] KettleControllerTest.水位101：FALSE (0 ms)
[----------] 4 tests from KettleControllerTest (0 ms total)

[----------] Global test environment tear-down
[==========] 4 tests from 1 test suite ran. (0 ms total)
[  PASSED  ] 4 tests.
```

VSCodeでテストエクスプローラーを利用している場合は次のように結果が可視化されます。  
![](https://gyazo.com/e8879c5c4a97bc9f554c34052e34fb93.png)

## テストケースをまとめる

上記のコードはわかりやすいですが、テストケース数が多く少し冗長です。  
Times()とWillOnce()をうまく使ってテストケースをまとめてみましょう。  

まとめ版のテストコードを掲載します。
```cpp
#include <gtest/gtest.h>

#include "MockWaterVolumeSensor.h"
#include "KettleController.h"

namespace
{

  using ::testing::AtLeast;
  using ::testing::Return;
  using ::testing::Test;

  // フィクスチャークラスを作る
  class KettleControllerTest : public Test {
    protected:
      MockWaterVolumeSensor mock;
      KettleController kettleController = KettleController(&mock);
      // virtual void TearDown() {}
  };

  TEST_F(KettleControllerTest, 繰り返し確認)
  {
    EXPECT_CALL(mock, scan())
      .Times(AtLeast(4))
      .WillOnce(Return(9))    // 水位 9
      .WillOnce(Return(10))   // 水位 10
      .WillOnce(Return(100))  // 水位 100
      .WillOnce(Return(101)); // 水位 101
    EXPECT_EQ(false, kettleController.canBoil()); // 期待値：false,水位：9
    EXPECT_EQ(true, kettleController.canBoil()); // 期待値：true,水位：10
    EXPECT_EQ(true, kettleController.canBoil()); // 期待値：true,水位：100
    EXPECT_EQ(false, kettleController.canBoil()); // 期待値：false,水位：101
  }

  int main(int argc, char **argv)
  {
    // 以下の行は，テスト開始前に Google Mock （と Google Test）
    // を初期化するために必ず実行する必要があります．
    ::testing::InitGoogleMock(&argc, argv);
    return RUN_ALL_TESTS();
  }

} // namespace
```

Times を4回に設定し、WillOnce を4段つなげて実装しました。  
これで scan メソッドが呼び出されるたびに WillOnce で定義した値が順番に反映されます。  
```cpp
    EXPECT_CALL(mock, scan())
      .Times(AtLeast(4))
      .WillOnce(Return(9))    // 水位 9
      .WillOnce(Return(10))   // 水位 10
      .WillOnce(Return(100))  // 水位 100
      .WillOnce(Return(101)); // 水位 101
```

テストケースを実行すると以下のような出力が得られました。  
```text
[==========] Running 1 test from 1 test suite.
[----------] Global test environment set-up.

[----------] 1 test from KettleControllerTest
[ RUN      ] KettleControllerTest.繰り返し確認
[       OK ] KettleControllerTest.繰り返し確認 (0 ms)
[----------] 1 test from KettleControllerTest (0 ms total)

[----------] Global test environment tear-down
[==========] 1 test from 1 test suite ran. (0 ms total)
[  PASSED  ] 1 test.
```

![](https://gyazo.com/84673bb59b3898161a4525b4f603af0a.png)

このようにテストケースをまとめることで、テストケース数の増大を防ぐことができます。

## まとめ

今回はGoogle Test を使う際によく使われるモック・フレームワーク「Google Mock」の簡単な使い方を紹介しました。  
参考情報として Google Mock に関する情報へのリンクを本稿の末尾に掲載してあります。  
機会があれば Google Test / Google Mock の便利な使い方や自動化のTips系なども紹介していきたいと思います。  

[ソフトウェアテストに関する技法やテクニックをまとめています。](/testing/)

テストに活用していただければ幸いです。

## 参考情報

[Google Mock ドキュメント日本語訳](http://opencv.jp/googlemockdocs/index.html)
[gMock Cookbook](https://google.github.io/googletest/gmock_cook_book.html)
