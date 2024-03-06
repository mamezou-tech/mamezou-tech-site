---
title: C++でProtocol Buffersを使ってみる
author: shuji-morimoto
date: 2024-03-08
tags: [ロボット, C++]
image: true
---

アプリケーション内で利用しているデータをプロセス間で送受信したり、データをファイルシステムやデータベースに保存・復元したいという状況がよくあります。そのためオブジェクト⇔JSONやオブジェクト⇔XMLなど変換するライブラリが豊富にありますがProtocol Buffersも選択肢の１つとなります。

本記事は以前C++でProtocol Buffersを利用したときの備忘録の内容を元に「ちょっとした小技」を紹介します。なお、Protocol BuffersやC++のメモリ管理についてある程度の知識を持っていることを前提に記載しています。


## C++でProtocol Buffersを使った背景
製品設計を行うデスクトップアプリの開発(C++)を行いました。設計データはローカルファイルで保存・読み込みします。このとき以下のような要件・要望がありました。

- 永続化する際のスキーマ定義をデータとして残しておきたい
- 数MByteのデータを扱いたい
- 永続化したときのデータサイズを小さくしたい
- シリアライズ・デシリアライズは高速に行いたい
- アプリで保持しているデータ構造をそのままシリアライズ・デシリアライズしたい
- 永続化データはバイナリデータでもよい
- 下位互換性を維持したい
- データの保存・読み込み処理の開発にあまり工数を掛けたくない

XMLだと下手するとデータ容量よりも要素タグや属性名の記述のほうが多くなり、パースも比較的遅い傾向があります。またC++でJSONを扱うにはKeyValue形式(マップ)のようなデータ構造を扱う必要があり、キー名やデータ型に注意を払ってset/getする必要があります。

Protocol Buffersなら上記要件を満たし、事前にコンパイルされたデータ型を利用するため、そのままシリアライズもできるため利用してみることにしました。

protoファイルによるスキーマの定義 == C++のクラス定義(\*.hと\*.ccの生成) となるため完全にソースコードと1対1で対応しますのでシリアライズするデータは検証済みデータとなります。


## Protocol Buffers定義ファイル(.proto)のフォーマット＆スタイル

参照元は[Language Guide (proto 3)](https://developers.google.com/protocol-buffers/docs/proto3)

### 利用可能なデータタイプ

スカラー型のデータタイプは一通り揃っています。

double, float, int32, int64, uint32, uint64, sint64, fixed32, fixed64, sfixed32, sfixed64, bool, string, bytes

タイムスタンプ型や構造体(JSONライクな)型などもライブラリで提供されていますのでimportすることで使うことができます。


### 下位互換性を維持するためのルール

messageの各フィールドはフィールド番号で識別します。
- 各フィールドの名称は変更可能
- 各フィールドの削除が可能(そのフィールド番号は永久欠番とする)
    - reserved フィールド番号n, フィールド番号m,フィールド番号x to フィールド番号y;
    - reserved "フィールド名1", "フィールド名2";
- 各フィールドの型の変更は不可
- 各フィールドのフィールド番号の変更は不可
- フィールドの追加は可能(新規のフィールド番号を割り振る)
- フィールド番号はメッセージのフィールドは1～
    - ただし19000-19999は予約番号のため利用不可


### enum型の定義のルール
- 値は大文字スネークケース
    - 例:HELLO_WORLD
- 値は0から連番
    - 0は指定無しを表す
- **enum型が異なっていても同じ値を定義できない**
    - 以下はUNSPECIFIEDやAが重複エラーとなる
    ```protobuf
    enum Foo {
      UNSPECIFIED = 0;
      A = 1;
      VALUE_FOO = 2;
    }

    enum Bar {
      UNSPECIFIED = 0;
      A = 1;
      VALUE_BAR = 2;
    }
    ```

    - 修正版その1:値は常にプレフィックスを付け重複しないようにする
    ```protobuf
    enum Foo {
      FOO_UNSPECIFIED = 0;
      FOO_A = 1;
      FOO_VALUE_FOO = 2;
    }

    enum Bar {
      BAR_UNSPECIFIED = 0;
      BAR_A = 1;
      BAR_VALUE_BAR = 2;
    }
    ```

    - 修正版その2:enum型毎にmessage内で定義する
    ```protobuf
    message Foo {
      enum Enum {
        UNSPECIFIED = 0;
        A = 1;
      }
    }

    message Bar {
      enum Enum {
        UNSPECIFIED = 0;
        A = 1;
      }
    }

    // enumを使ったmessage定義
    message Xyz {
      enum Foo.Enum foo = 1;
      enum Bar.Enum bar = 2;
    }
    ```

### protoファイルのスタイルガイド
- インデントは2スペース
- ファイル名は、小文字のスネークケース
- messageの名前はキャメルケース
- フィールドはスネークケース
- repeatedがついた配列の名前は複数形にする
- enumの名前はキャメルケース、enum値の名前には大文字、アンダースコアを使う
- enumの最初の値はid=0でUNSPECIFIED(指定無し)としたほうが良い
- RPCのサービスを定義するときは、RPCのサービス名もRPCの関数もキャメルケースにする

### データ型のimport
package や message単位で \*.proto ファイルを分割し、他の \*.proto ファイルの定義された message を利用したい場合は import を使います。定義済みの message も利用できます。以下の import "google/..." は、include フォルダにあるprotoファイルを指します。
```protobuf
syntax = "proto3";
// 様々なデータ型を構造化したデータ型を利用したい場合(JSONライクな型)
import "google/protobuf/struct.proto";

message MyObject {
  int32  no                   = 1;
  string name                 = 2;
  google.protobuf.Struct json = 3;
}
```

- protocの `--proto_path` パラメータで、いくつでも \*.proto のあるフォルダを指定できます
- C++APIは include/google/protobuf/struct.pb.h で定義されています
- C++コードの中で直接Struct型を利用できます


### optionの指定
option は、特定のコンテキストで解釈されます。
[option一覧](https://github.com/protocolbuffers/protobuf/blob/master/src/google/protobuf/descriptor.proto)

最適化に関するoptionは `optimize_for` で指定します。
```protobuf
// 軽量のランタイムを利用したい場合
option optimize_for = LITE_RUNTIME;
```
:::alert
LITE_RUNTIME最適をするとライブラリサイズが小さくなりますが、messageをJSON文字列化する関数(google::protobuf::util::MessageToJsonString())などが使えなくなります。
:::

protobufのメモリーアロケーションバッファを利用する場合は `cc_enable_arenas` で指定します。
- Arenaと呼ぶメモリ管理の最適化・高速化処理
- messageはArena上で構築し、deleteしない
- Arena領域のライフサイクルとmessageオブジェクトのライフサイクルが同期する

```protobuf
option cc_enable_arenas = true;
```



## Protocol Buffers C++ API
PythonやJavaなどのメモリー安全機構がランタイムで提供されている場合、オブジェクトのライフサイクルをあまり気にせずオブジェクトの生成や操作を行います。しかし、C++では開発者自身で管理する必要があります。そこで Protocol Buffers C++ APIはメモリー安全と効率化(開発者への負担を減らす)を考慮した設計となっています。

[C++ チュートリアル](https://developers.google.com/protocol-buffers/docs/cpptutorial)

[C++ APIリファレンス](https://developers.google.com/protocol-buffers/docs/reference/cpp)


### データアクセス時の基本
C++で気を付けることはメモリー管理と暗黙(意図しない)コピーかなと思います。

オブジェクトをヒープ領域で管理するためにnewでコンストラクタをコールするとインスタンスのライフサイクルはユーザーが適切に管理する必要があります。また、スタック上で生成したインスタンスを別の変数に代入するとオブジェクトのコピーとなるためループ処理などで大量に行うとボトルネックになることがあります。ですので、できるだけどちらも避けたいところです。

スマートポインタを使って回避できますが、protocで生成されたC++のクラス定義はこのあたりを巧妙に回避するようなAPIとなっています。C++で操作するときメモリ管理と効率を考えてprimitive(bool, int32, double等)型 と stringおよびmessage型(ユーザー定義)とではアクセス方法が異なっています。

- 戻り値が参照の場合は、必ず参照で受ける
  - auto& または const auto& で受ける
  - **参照で受けない場合はコピーが発生する**ので注意(コンパイル時に警告してくれたらなぁ)

- データを更新する場合はadd_xxx()やmutable_xxx()で戻り値をポインタで受け取る
  - listへ追加する場合はadd_xxx()して追加されたオブジェクトを受け取る
  - mapの場合はmutable_xxx()で受ける(mutable_がつく場合は必ずポインタが返る)
  - messageの場合はmutable_xxx()で受ける
  - 戻り値はポインタなので auto で受けるとよい

どのように操作するか具体的に見ていきましょう。


### 事前準備

.protoファイルに以下を定義したとします。

```protobuf:example.proto
syntax = "proto3";

message Product {
  int32             id        = 1; // primitive型
  string            name      = 2; // string
  Detail            detail    = 3; // message型
  repeated int32    ids       = 4; // primitive型のリスト
  repeated Material materials = 5; // message型のリスト
  map<int32, Value> value_map = 6; // message型のmap
}

message Detail {
  int32 id = 1;
}

message Material {
  int32 id = 1;
}

message Value {
  int32 id = 1;
}
```


### protoc で生成されたC++ヘッダファイル
自動生成されたヘッダファイルはあまり見やすさが考慮されていません。また膨大な情報を持っていますのでポイントとなる部分だけ抜き出してみました。

生成されるクラスは以下の内容となります。

- Messageを継承
- コンストラクタ
- インスタンス操作
- メンバ変数アクセス

**stringやmessage型へのアクセスはすべてポインタまたは参照またはムーブ** になっており、不要なコピーを発生させないようになっています。メンバ変数アクセス用関数は目的に応じて関数を定義しているため数が多いです。ただし、関数定義にはパターンがあるのでそれを覚えれば難しくありません。


```cpp:example.pb.h
class Product final : public Message {
public:
  Product();
  Product(const Product& from);
  Product(Product&& from);

  ~Product() override;

  Product& operator=(const Product& from);
  Product& operator=(Product&& from) noexcept;

  void Swap(Product* other);
  void CopyFrom(const Product& from);
  void MergeFrom(const Product& from);
  void Clear() final;
  bool IsInitialized() const final;
  size_t ByteSizeLong() const final;

  // int32 id = 1;
  void clear_id();
  int32_t id() const;
  void set_id(int32_t value);

  // string name = 2;
  void clear_name();
  const std::string& name() const;
  template <typename ArgT0 = const std::string&, typename... ArgT>
  void set_name(ArgT0&& arg0, ArgT... args);
  std::string* mutable_name();
  std::string* release_name();
  void set_allocated_name(std::string* name);

  // Detail detail = 3;
  bool has_detail() const;
  void clear_detail();
  const Detail& detail() const;
  Detail* release_detail();
  Detail* mutable_detail();
  void set_allocated_detail(Detail* detail);

  // repeated int32 ids = 4;
  int ids_size() const;
  void clear_ids();
  int32_t ids(int index) const;
  void set_ids(int index, int32_t value);
  void add_ids(int32_t value);
  const RepeatedField<int32_t>& ids() const;
  RepeatedField<int32_t>* mutable_ids();

  // repeated Material materials = 5;
  int materials_size() const;
  void clear_materials();
  const Material& materials(int index) const;
  Material* add_materials();
  const RepeatedPtrField<Material>& materials() const;
  RepeatedPtrField<Material>* mutable_materials();
  Material* mutable_materials(int index);

  // map<int32, Value> value_map = 6;
  int value_map_size() const;
  void clear_value_map();
  const Map<int32_t, Value>& value_map() const;
  Map<int32_t, Value>* mutable_value_map();
};
```


### Messageを継承

[Message API](https://protobuf.dev/reference/cpp/api-docs/google.protobuf.message/)

生成されたクラスはMessageを継承しています。すべてのメッセージで利用できる関数やメタデータを参照できる関数が定義されており、メッセージを透過的に利用できます。

以下はメッセージの内容を出力(デバッグ出力とJSON出力)する例です。
```cpp
#include <google/protobuf/util/json_util.h>
#include "example.pb.h"

std::string ToJson(const google::protobuf::Message &m)
{
    std::string json;

    google::protobuf::util::JsonOptions option;
    option.add_whitespace = true;
    option.always_print_primitive_fields = true;

    google::protobuf::util::MessageToJsonString(m, &json, option);
    return json;
}

int main()
{
    Product product;
    product.set_id(123);
    product.set_name("製品１");

    auto detail = product.mutable_detail();
    detail->set_id(999);

    // デバッグ文字列出力
    std::cout << product.Utf8DebugString() << std::endl;

    // JSON文字列出力
    std::cout << ToJson(product) << std::endl;

    return 0;
}
```

```json:出力結果
id: 123
name: "製品１"
detail {
  id: 999
}

{
 "id": 123,
 "name": "製品１",
 "detail": {
  "id": 999
 },
 "ids": [],
 "materials": [],
 "valueMap": {}
}
```

:::info
ソースコードをutf-8で保存し、Visual Studioのコンパイルオプションに /utf-8 を指定すれば日本語を含むデータも出力できます。
:::

:::info
google::protobuf::util::JsonStringToMessage()を使えばJSON文字列をメッセージに変換できます。
:::

### コンストラクタ

```cpp
Product();
Product(const Product& from);
Product(Product&& from);
```

デフォルトコンストラクタ、コピーコンストラクタ、ムーブコンストラクタがあります。一般的ですね。


### インスタンス操作

```cpp
Product& operator=(const Product& from);
Product& operator=(Product&& from) noexcept;

void Swap(Product* other);
void CopyFrom(const Product& from);
void MergeFrom(const Product& from);
void Clear() final;
bool IsInitialized() const final;
size_t ByteSizeLong() const final;
```

コピー代入演算子、ムーブ代入演算子をオーバーロードしています。またSwap(入れ替え処理), MergeFrom(追記処理), Clear(クリア処理), CopyFrom(ClearしてMergeFromを実施)などの便利な関数も生成されます。


### primitive型メンバ変数アクセス

```cpp
// int32 id = 1;
void clear_id();
int32_t id() const;
void set_id(int32_t value);
```
setter/getterとクリア用の関数のみでシンプルです。

初期状態では値は未設定となっており、set_xxxすることで値が設定されます。値が未設定のときにgetするとデフォルト値を取得できます。clear_xxxで未設定となります。未設定の場合、シリアライズするときにその値を出力しないためデータサイズが小さくなります。


### stringメンバ変数アクセス

```cpp
void clear_name();
const std::string& name() const;
template <typename ArgT0 = const std::string&, typename... ArgT>
void set_name(ArgT0&& arg0, ArgT... args);
std::string* mutable_name();
std::string* release_name();
void set_allocated_name(std::string* name);
```

set_xxxは関数テンプレートになっており、おそらくムーブに対応しているということだと思います。
getterは const 参照となっています。

`std::string* mutable_name()` はポインタを返しておりstringの値を変更するときに利用します。

`std::string* release_name()` はメッセージ内部で管理しているstringの所有権を取得します。メッセージ側はstringが未設定の状態となります。取得したstring(ポインタ)のライフサイクルは開発者が管理する必要があります。

`void set_allocated_name(std::string* name)` は開発者が管理していたstring(ポインタ)をメッセージ側の所有権とします。

### message型メンバ変数アクセス

```cpp
// Detail detail = 3;
bool has_detail() const;
void clear_detail();
const Detail& detail() const;
Detail* release_detail();
Detail* mutable_detail();
void set_allocated_detail(Detail* detail);
```

stringと似ていますがsetterがありません。値を設定するには以下のようにします。
```cpp
Product product;
auto detail = product.mutable_detail();
detail->set_id(999);
```

`product.mutable_detail()`を実施したときにDetailインスタンスがあればそれを返し、未設定の場合はDetailインスタンスを生成して返します。そのためインスタンスがあるかどうかは `bool has_detail() const` で判定します。それ以外はstringと同じ操作方法となります。


### リスト(primitive型)メンバ変数アクセス

```cpp
  // repeated int32 ids = 4;
  int ids_size() const;
  void clear_ids();
  int32_t ids(int index) const;
  void set_ids(int index, int32_t value);
  void add_ids(int32_t value);
  const RepeatedField<int32_t>& ids() const;
  RepeatedField<int32_t>* mutable_ids();
```
リスト操作になりますのでリストのサイズ取得、クリア、指定したインデックスに対する要素のsetter/getterがあります。

`void add_ids(int32_t value)` はリストの最後に要素を追加します。

`const RepeatedField<int32_t>& ids() const` はリストを表すクラスであるRepeatedFieldのconst 参照を返します。

[RepeatedField API](https://protobuf.dev/reference/cpp/api-docs/google.protobuf.repeated_field/)

RepeatedFieldはstd::vectorと同じようなクラスです。インデックスアクセスやサイズ取得の他にiterator begin()とiterator end()を持つため範囲ベースループで要素にアクセスできます。


### インデックスループと範囲ベースループ

```cpp
Product product;
for (int i = 0; i < 3; i++) {
    product.add_ids(i);
}

const auto& ids = product.ids();
for (int i = 0; i < ids.size(); i++) {
    std::cout << ids[i] << std::endl;
}

for (const auto& id : ids) { // &を付けないとコピーになるため注意
    std::cout << id << std::endl;
}
```

`RepeatedField<int32_t>* mutable_ids()` は変更可能なRepeatedFieldのポインタを返します。


### リスト(message型)メンバ変数アクセス

```cpp
  // repeated Material materials = 5;
  int materials_size() const;
  void clear_materials();
  const Material& materials(int index) const;
  Material* add_materials();
  const RepeatedPtrField<Material>& materials() const;
  RepeatedPtrField<Material>* mutable_materials();
  Material* mutable_materials(int index);
```
リスト(primitive型)との違いは返されるメッセージが常にconst 参照かポインタとなるところです。またリストへの追加は `Material* add_materials()` のようにメッセージ内部でインスタンスが生成されて、そのポインタが返ります。そのポインタに対して値を設定します。

`const RepeatedPtrField<Material>& materials() const` はstringやメッセージ型を要素としてもつリストクラスであるRepeatedPtrFieldのconst 参照を返します。

[RepeatedPtrField API](https://protobuf.dev/reference/cpp/api-docs/google.protobuf.repeated_field/#RepeatedPtrField)

RepeatedPtrField は stringやメッセージ型を扱う RepeatedField となりますので同じような操作ができます。mutable_xxxアクセスはRepeatedPtrFieldを返すものと指定したインデックスの要素のポインタを返すものがあります。

### マップメンバ変数アクセス

```cpp
  // map<int32, Value> value_map = 6;
  int value_map_size() const;
  void clear_value_map();
  const Map<int32_t, Value>& value_map() const;
  Map<int32_t, Value>* mutable_value_map();
```

マップ操作になります。マップのサイズ取得、クリアはありますが、指定したキーに対する値のsetter/getterはありません。Mapクラスを取得してから行います。

`const Map<int32_t, Value>& value_map() const` はMapおよび要素をconst 参照で返します。

`Map<int32_t, Value>* mutable_value_map()` はMapおよび要素のポインタを返すため更新ができます。

[Map API](https://protobuf.dev/reference/cpp/api-docs/google.protobuf.map/)

Map は std::unordered_map に似た操作を持っています。


### Mapに値を設定する
mapをポインタ(変更可能状態)で取得し参照に変換して設定します。
```cpp
Product product;

Value value;
value.set_id(5);

// ポインタを参照に変換
auto& map = *product.mutable_value_map();
map[value.id()] = value;
```


### Mapにキーに対応する値があるか確認する
```cpp
if (product.value_map().contains(8)) {
    // キーに対応する値がある
} else {
    // キーに対応する値が存在しない
}
```


### Mapから値を取得してデータを参照する
```cpp
// at(key)で値がconst 参照が返る
// keyが含まれていない場合は実行時エラーで落ちることに注意
const auto& value = product.value_map().at(5);
```
value_map().at()で取得した値はconst参照なので値の変更はできません。


### Mapの範囲ベースループ
```cpp
for (const auto& ite : product.value_map()) {
    auto k = ite.first;         // firstはキー
    const auto& v = ite.second; // secondは値
}

// c++17準拠でコンパイルする場合は以下のようにタプルが利用可能
for (const auto& [k, v] : product.value_map()) {
}
```

:::alert
std::map ではなく std::unordered_map に似た操作を持っていることに注意。ハッシュ値に基づきデータを格納するため格納順序が規定されていません。そのため辞書順で取り出すと言ったことができないことに注意が必要です。
また、同じキーで登録してもインスタンスが異なれば取り出す際、異なる順序になる場合があります。
:::


### Mapから値を取得してデータを更新する

```cpp
// Mapポインタからat(key)でvalueを取得する場合
// 含まれていない場合は実行時エラーで落ちることに注意
auto& value = product.mutable_value_map()->at(5);

// Map参照から[key]でvalueを取得するの場合
// 含まれていない場合は新規にvalueが生成されることに注意
auto& value = (*product.mutable_value_map())[5];

value.set_id(100);
```

mutable_xxxから取得した値はconstではないただの参照なので値の変更ができます。


## まとめ
APIはメッセージの参照と更新が別々の関数となっているため分かりやすくなっています。またメモリ管理もあまり意識する必要なく扱うことができます。C++でデータ連携やシリアライズの必要性がある場合、Protocol Buffersも是非検討してみてください。
