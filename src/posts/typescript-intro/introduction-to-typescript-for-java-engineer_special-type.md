---
title: Javaエンジニアが始めるTypeScript入門（第6回：特殊な型）
author: masato-ubata
date: 2024-10-02
tags: [typescript, java]
image: true
prevPage: ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_collection-type.md
nextPage: ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_function.md
---

## はじめに

今回は、変数、引数、戻り値などに使用する特殊な型について説明します。  

|名称、概要|JavaScript|TypeScript|Java|備考|
|---|---|---|---|---|
|ユニオン型|≒any|union|-||
|インターセクション型|≒any|intersection|-||
|リテラル型|≒any|literal|-||
|テンプレートリテラル型|literal|template literal type|-|template union typeと表記されていることもあります|
|オブジェクトリテラル型|object literal|object literal|-||
|マッピング型|≒object|mapped type|-||
|条件付き型|≒any|conditional type|-||
|インデックス型|any|index signature|≒Map||

※表はTypeScriptの型と**近い型**をマッピングしたものです。

## union（ユニオン型）

複数の型を受容する型の定義方法です。  
型は`|`で区切って指定します。  

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
let union1: string | null; //*1
let union2: string | undefined;
let union3: string | null | undefined; //*2
let union4: string | number; //こんな指定もできてしまいます
```
* 1: NullableなString
* 2: 3つ以上も指定できます

```java: Javaではどうなるか
// 対応する定義方法はありません。
```
Optional、ジェネリクス、継承などを使えば同じようなことは表現できます。  
実装例はリテラル型と変わらないので省略します。

## intersection（インターセクション型）

複数の型を合成する型の定義方法です。  
型は`&`で区切って指定します。  
ユニオン型と相対するものです。

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
type Name = {lastName: string, firstName: string};
type Address = {address: string};
type Person = Name & Address;
let intersection1: Person = {lastName: "suzuki", firstName: "taro", address: "tokyo"}; //*1

let intersection_never: number & string; //*2
```
* 1: 合成された型が使用できます
* 2: 共通する値を持たない矛盾した指定をすると型はneverになります

```java: Javaではどうなるか
// 対応する定義方法はありません。

interface Name {
  String getLastName();
  void setLastName(String lastName);
  String getFirstName();
  void setFirstName(String firstName);
}

interface Address {
  String getAddress();
  void setAddress(String address);
}

@AllArgsConstructor
@Getter
@Setter
class Person implements Name, Address {
  private String lastName;
  private String firstName;
  private String address;
}

Person intersection1 = new Person("suzuki", "taro", "tokyo");
```
インターフェイスとクラスを使えば同じようなことは表現できます。  

## literal（リテラル型）

特定の値を受容する型の定義方法です。  
特定の値は`|`で区切って指定します。  

### 型の特性

型の特性をコードベースで確認します。


```ts: TypeScript
//数値リテラル
let num1: 10; //10のみ
let num2: 10 | 20; //10 or 20
const num3: 10 | 20 = getNo(); //10 or 20

//文字列リテラル
let str1: "red"; //"red"のみ
let str2: "red" | "yellow"; //"red" or "yellow"
const str3: "red" | "yellow" | "blue" = getTrafficLight(); //"red" or "yellow" or "blue"

//真偽値リテラル
let bool1: true; //trueのみ
function process(flag: true): string;
function process(flag: false): string;
function process(flag: true | false) {
  if (flag === true) {
    return "flag is true";
  } else {
    return "flag is false";
  }
}
```

```java: Javaではどうなるか
// 対応する定義方法はありません。

enum TenOnly {
  TEN;
}

enum TenAndTwenty {
  TEN,
  TWENTY;
}

private static TenAndTwenty getNo() {
  return TenAndTwenty.TEN;
}

// 数値リテラルの代替
TenOnly num1;
TenAndTwenty num2;
final TenAndTwenty num3 = getNo();

// 文字列リテラル：数値リテラルの代替方法と変わらないので省略します

// 真偽値リテラル：数値リテラルの代替方法と変わらないので省略します
```
Enum、Optional、ジェネリクス、継承などを使えば同じようなことは表現できます。

## template literal type（テンプレートリテラル型）

文字列リテラルの中に型を埋め込むことで、動的に型を生成できます。

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
//*****プリミティブ型を埋め込んだ例
type Endpoint = "users" | `users/${number}` | "orders" | `orders/${number}`; //*1
const url1_1: Endpoint = "users";
const url1_2: Endpoint = "users/1";
const url1_3: Endpoint = "orders";
const url1_4: Endpoint = "orders/1";
// const url1_e1: Endpoint = "orders/"; //number部分が無指定のため、エラー
// const url1_e2: Endpoint = "orders/a"; //number部分の型が違うため、エラー

//*****複数の型を埋め込んだ例 *2
type NumberAndString = number | string;
type Endpoint2 = `users/${NumberAndString}`; //"users/"とnumber, stringの組み合わせ
const url2: Endpoint2 = "users/u001";

type Importance = "Critical" | "High" | "Middle" | "Low" | "Minor";
type Priority = "Top" | "High" | "Middle" | "Low" | "Bottom";
type Rank = `${Importance}-${Priority}`; //Critical-Top, Critical-High・・・25パターン
const rank1: Rank = "Critical-Top";

//*****リテラル型で定義している名称を属性名として型を定義した例
type Person = {id: number} & {[K in "name" | "address"]: string;}; //{id: number;} & {name: string;address: string;}
const person: Person = {id: 1, name: "suzuki", address: "tokyo"};
```
* 1: numberの部分は変数ではなく型として扱われます。
* 2: 指定した型の組み合わせが型として扱われます。

```java: Javaではどうなるか
// 対応する定義方法はありません。

@AllArgsConstructor
enum Endpoint {
  USERS("users"),
  USERS_WITH_ID("users/%s"),
  ORDERS("orders"),
  ORDERS_WITH_ID("orders/%s");

  private String value;

  String getUrl() {
    return getUrl(0);
  }

  String getUrl(int id) {
    return this.value.formatted(id);
  }
}

@AllArgsConstructor
enum Endpoint2 {
  USERS_WITH_ID("users/%s");

  private String value;

  String getUrl(int id) {
    return getUrl(0);
  }

  String getUrl(String id) {
    return this.value.formatted(id);
  }
}

enum Importance {
  Critical, High, Middle, Low, Minor
};

enum Priority {
  Top, High, Middle, Low, Bottom
};

static record Rank(
    Importance importance,
    Priority priority) {
  String getRank() {
    return "%s-%s".formatted(importance, priority);
  }
}

interface AttrId {
  int id();
}

interface AttrName {
  String name();
}

interface AttrAddress {
  String address();
}

static record Person(
    int id,
    String name,
    String address) implements AttrId, AttrName, AttrAddress {
}

// *****プリミティブ型を埋め込んだ例 *1
final String url1_1 = Endpoint.USERS.getUrl(); // users
final String url1_2 = Endpoint.USERS_WITH_ID.getUrl(1); // users/1
final String url1_3 = Endpoint.ORDERS.getUrl(); // orders
final String url1_4 = Endpoint.ORDERS_WITH_ID.getUrl(1); // orders/1

// *****複数の型を埋め込んだ例
final String url2 = Endpoint2.USERS_WITH_ID.getUrl("u001"); // users/u001 *1

final Rank rank = new Rank(Importance.Critical, Priority.Top); // Critical-Top *2

// *****リテラル型で定義している名称を属性名として型を定義した例 *3
final Person person = new Person(1, "suzuki", "tokyo");
```
Enum、インターフェイス、 レコード、クラスなどを使えば同じようなことは表現できます。
* 1: enumで代替した例です。
* 2: enum + recordで代替した例です。
* 3: interface + recordで代替した例です。

## object literal（オブジェクトリテラル型）

オブジェクトの属性名と値、関数名と処理をペアで指定して、オブジェクトの構造を定義する方法です。

### オブジェクトリテラルの基本構文

オブジェクトリテラルの構文と定義例は下記の通りです。  

```ts: 構文
/**
 * _属性名_　　: 属性名
 * _代入する値_: 初期値を設定します。
 * _メソッド名_: 振る舞い
 * _引数_　　　:（任意）引数が必要なメソッドの場合設定します。複数指定する場合は`,`で区切って指定します。
 * _戻り値型_　:（任意）戻り値の型
 */
{
  _属性名_:  _代入する値_,
  _メソッド名_: (_引数_): _戻り値型_ => {/** 任意の処理。 */},
}
```
* メソッドは`_メソッド名_(_引数_): _戻り値型_ {/** 任意の処理。 */},`でも定義できます。  

```ts: 定義例
let obj0 = { 
  id: 1, 
  name: "suzuki", 
  fn1: (): string => { return "hoge"; },
  fn2(): string {return "fuga";}
};
```

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
let obj1 =
  { id: 1, name: "suzuki", getName: (): string => { return `${obj1.name}様` } };

let obj2: { readonly id: number, name?: string, readonly getName: () => string } =
  { id: 1, getName: () => { return `${obj2.name}様` } };
//obj2.id = 2; //*1
obj2.name = "suzuki";
```
* 1: エラー：読み取り専用

```java: Javaではどうなるか
// 対応する定義方法はありません。

@AllArgsConstructor
@Getter
@Setter
public static class Person {
  private Long id;
  private String name;
  private Supplier<String> getName;
}

var obj1 = new Person(1L, "suzuki", () -> {return "%s様".formatted("suzuki");});

@RequiredArgsConstructor
@Getter
@Setter
public static class Person2 {
  private final Long id;
  private String name;
  private final Supplier<String> getName;
}

Person2 obj2 = new Person2(1L, () -> {return "%s様".formatted("suzuki");});
obj2.setName("suzuki");
```
クラスを使えば同じようなことが表現できます。  

## mapped type（マッピング型）

既存の型から新しい型を生成する定義方法です。  
`keyof`キーワードを使って、元の型がもつ属性を列挙して、同じ属性を持つ型を生成します。

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
type Person = {readonly id: number, name: string};

type NewPerson<TYPE> = {[PARAMETER in keyof TYPE]: TYPE[PARAMETER]}; //{readonly id: number, name: string}
let newPerson: NewPerson<Person> = {id: 1, name: "suzuki"};
// newPerson.id = 2; //*1
newPerson.name = "sato";

type RoPerson<TYPE> = {readonly [PARAMETER in keyof TYPE]: TYPE[PARAMETER]}; //{readonly id: number, readonly name: string}
let roPerson: RoPerson<Person> = {id: 1, name: "suzuki"};
// roPerson.id = 2; //*1
// roPerson.name = "sato"; //*1
```
* 1: エラー：読み取り専用

```java: Javaではどうなるか
// 対応する定義方法はありません。

interface Person {
  int getId();
  String getName();
}

@AllArgsConstructor
@Getter
@Setter
static class NewPerson implements Person {
  private final int id;
  private String name;
}

@AllArgsConstructor
@Getter
static class RoPerson implements Person {
  private final int id;
  private final String name;
}

NewPerson newPerson = new NewPerson(1, "suzuki");
// newPerson.setId(0); //*1
newPerson.setName(null);

RoPerson roPerson = new RoPerson(1, "suzuki");
// roPerson.setId(0); //*1
// roPerson.setName("sato"); //*1
```
* 下位クラスでスコープを狭められないので、スコープの設定などは下位クラスに委譲することで同じようなことが表現できます。
* 1: エラー：セッターが存在しないため、エラーになります。

## conditional type（条件付き型）

型の条件に基づいて型を決定する定義方法です。  
型の比較して、その結果に基づいて型が決定されます。  
比較は`extends`、分岐は三項演算子で行います。

### 条件付き型の基本構文

条件付き型の構文と定義例は下記の通りです。  

```ts: 構文
/**
 * _対象の型_　　: 比較対象となる型
 * _比較する型_　: 「対象の型」と比較したい型
 * _成立時の型_　: 「対象の型」と「比較する型」の比較が成立した場合に返す型
 * _不成立時の型_: 比較が成立しなかった場合に返す型
 */
_対象の型_ extends _比較する型_ ? _成立時の型_, _不成立時の型_;
```
* `&&`や`||`を使って複数条件を指定できないので、複数の条件を指定する場合は分岐をネストさせる必要があります。

```ts: 定義例
class Ct {}
type ct<T> = T extends Ct ? string : number; //TとCtを比較して、継承関係にあればstring、なければnumberを型として返す
```

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
//*****条件付き型で型ガードを試してみる
type TypeGuard<T, U> = T extends U ? U extends T ? T : never : never; //*1

// 言語で定義されている型で検証
let ct1 = "hoge";
let ct11: TypeGuard<typeof ct1, string>; //string
let ct12: TypeGuard<typeof ct1, number>; //never

// 継承関係にあるクラスの検証
interface BaseOrder { }
class Order001 implements BaseOrder { order001Attr: string = "order001"; }
class Order002 implements BaseOrder { order002Attr: string = "order002"; }

let ct2 = new Order001();
let ct211: TypeGuard<typeof ct2, BaseOrder>; //never
let ct212: TypeGuard<typeof ct2, Order001>; //Order001
let ct213: TypeGuard<typeof ct2, Order002>; //never

//*****extendsの動きを検証 *2
type TypeGuardB<T, U> = T extends U ? T : never;

let ct221: TypeGuardB<typeof ct2, BaseOrder>; //Order001 *3
let ct222: TypeGuardB<typeof ct2, Order001>; //Order001
let ct223: TypeGuardB<typeof ct2, Order002>; //never
```
* 1: TとUが一致している場合、Tを返す型ガードに相当する例です。
* 2: `extends`が継承関係を判定していことを検証するため、TをUと比較する条件のみ設定した条件付き型で動きを検証したコードです。
* 3: 継承関係にあるので成立時の型が設定されます。

```java: Javaではどうなるか
// 対応する定義方法はありません。

interface BaseOrder {}

static class Order001 implements BaseOrder {
  String order001Attr = "order001";
}

static class Order002 implements BaseOrder {
  String order002Attr = "order002";
}

@SuppressWarnings("rawtypes")
static class TypeGuard<U> {
  @Getter
  private final Class clazz;

  @SuppressWarnings("unchecked")
  TypeGuard(Class t, Class<U> u) {
    if (u.isAssignableFrom(t) && t.isAssignableFrom(u)) {
      this.clazz = t;
    } else {
      this.clazz = NeverType.class;
    }
  }
}

@SuppressWarnings("rawtypes")
static class TypeGuardB<U> {
  @Getter
  private final Class clazz;

  TypeGuardB(Class t, Class<U> u) {
    if (u.isAssignableFrom(t)) {
      this.clazz = t;
    } else {
      this.clazz = NeverType.class;
    }
  }
}

static class NeverType {} //neverの代替

// 言語で定義されている型で検証
var ct1 = "hoge";
var ct11 = new TypeGuard<String>(ct1.getClass(), String.class);
var ct12 = new TypeGuard<Integer>(ct1.getClass(), Integer.class);

// 継承関係にあるクラスの検証
var ct2 = new Order001();
var ct211 = new TypeGuard<BaseOrder>(ct2.getClass(), BaseOrder.class); // NeverType
var ct212 = new TypeGuard<Order001>(ct2.getClass(), Order001.class); // Order001
var ct213 = new TypeGuard<Order002>(ct2.getClass(), Order002.class); // NeverType

// *****extendsの動きを検証
var ct221 = new TypeGuardB<BaseOrder>(ct2.getClass(), BaseOrder.class); // Order001
var ct222 = new TypeGuardB<Order001>(ct2.getClass(), Order001.class); // Order001
var ct223 = new TypeGuardB<Order002>(ct2.getClass(), Order002.class); // never
```
動的な型設定はできないので、スーパークラスで処理する形にするとか、独自型を定義するなどの対応で同じようなことが表現できます。

:::info
**構造的型付けと名前ベース型付け**
クラスの一致性の判断がTypeScriptとJavaは異なります。  
TypeScriptは構造を見て一致性を判断します。名称が異なっていても構造が同じ場合、同一と判断します。  
Javaは構造に名称を付けるので、この名称から一致性を判断します。クラス構造が同じだとしても名称が異なれば別物として判断します。  
Java思考で考えていると迷うところなので、検証コードを付けておきます。

```ts: TypeScript
interface BaseItem { }
class Item001 implements BaseItem { item001Attr: string = "item001"; }
class Item002 implements BaseItem { }
class Item003 implements BaseItem { fn = () => { return "hoge"; }; } //メンバメソッドを持つクラス
class Item004 implements BaseItem { item001Attr: number = 0; } //同じ名称で型の異なるメンバ変数を持つクラス

interface BaseOrder { }
class Order001 implements BaseOrder { order001Attr: string = "order001"; }
class Order002 implements BaseOrder { order002Attr: string = "order002"; }
class Order003 implements BaseOrder { order003Attr: string = "order003"; }
class Order004 implements BaseOrder { order004Attr: string = "order004"; }

//ItemXXXと比較して、OrderXXXを型として設定する条件付き型
type GeneralOrder<T extends BaseItem> =
  T extends Item001 ? Order001 :
  T extends Item002 ? Order002 :
  T extends Item003 ? Order003 :
  T extends Item004 ? Order004 :
  never;

//Item002の判定を最後に移動した条件付き型
type GeneralOrderB<T extends BaseItem> =
  T extends Item001 ? Order001 :
  T extends Item003 ? Order003 :
  T extends Item004 ? Order004 :
  T extends Item002 ? Order002 :
  never;

let item001 = new Item001();
let order001: GeneralOrder<typeof item001>; //Order001
order001 = new Order001();
order001.order001Attr;

let item002 = new Item002();
let order002: GeneralOrder<typeof item002>; //Order002
order002 = new Order002();
order002.order002Attr;

let item003 = new Item003();
let order003: GeneralOrder<typeof item003>; //Order002 *1
// order003 = new Order003(); // *2
// order003.order003Attr;

let item004 = new Item004();
let order004: GeneralOrder<typeof item004>; //Order002 *1
// order004 = new Order004(); //*2
// order004.order004Attr;

//*****判定順を入れ替えた条件付き型で動きを確認
let item003b = new Item003();
let order003b: GeneralOrderB<typeof item003b>; //Order003 *3
order003b = new Order003();
order003b.order003Attr;

let item004b = new Item004();
let order004b: GeneralOrderB<typeof item004b>; //Order004 *3
order004b = new Order004();
order004b.order004Attr;

//*****代入やinstanceofはどうなるのか確認
// item004b = new Item002(); //*4
item004b instanceof Item002; //false *5
item004b instanceof Item004; //true
```
* 1: なぜか`Item002`と判定され、型が`Order002`になりました。これはどうことでしょうか。
  * `Item002`の構造は`{}`、`Item003`の構造は`{fn = () => { return "hoge"; };}`と解釈されます。
  * よって`Item002`の構造は`Item003`の構造を汎化したものであると判定されるようです。
  * 同様に`Item004`の構造は`{item001Attr: number}`と解釈され、こちらも同じ理由で汎化したものと判断されるようです。
* 2: 勿論、型エラーになるのでエラーになります。
* 3: `Item002`の判定を最後に移動した条件付き型で判定し、1の内容を検証しました。
  * 結果は想定通りで、`Item003`は`Order003`、 `Item004`は`Order004`に型判定されました。 
* 4: `extends`は`true`になりましたが、代入は型エラーになります。
* 5: `extends`は`true`になりましたが、`instanceof`は`false`になります。
:::

## index signature（インデックス型）

任意の属性を動的に受容する型の定義方法です。  

:::info
**使いどころ**
1. 変更が激しい状況下で一時的に使用する
  たとえばWebAPI設計の序盤など、2者間のインターフェイス定義が不安定な状況下では属性の変更は度々実施されます。この状況下で変更に追従し続けようとすると互いに疲弊してしまいます。  
  このような状況下で、序盤はインデックス型で属性を定義しておき、固まったものから静的な定義に移行していくアプローチに使用すると有用ではないかと考えます。
2. JSONなどのK/V構造をそのまま扱いたい場合に使用する
3. インターフェイス仕様が不明確な場合に使用する
   レガシーシステムなどのインターフェイスが明確になっていない状況下でもタスクを進めなければならない状況は多々あります。  
   まず、すべてを受け入れるための型として使用することで、仕様が不明確な状態でもタスクを進めることができるのではないでしょうか。

:::

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
interface BasePerson {
  id: number;
  name: string;
  [index: string]: any;
}
let indexSig1: BasePerson = { id: 1, name: "suzuki", address: "tokyo", getName: () => {return "suzuki";} };
indexSig1.address; //tokyo *1
indexSig1.getName(); //suzuki *1
```
* 1: インデックスシグネチャには属性名を書けばアクセスできます（any型と同様、vscodeではコードアシストが効きませんでした）

```java: Javaではどうなるか
// 対応する定義方法はありません。

interface BasePerson {
}

@AllArgsConstructor
@Getter
@Setter
static class Person implements BasePerson {
  private int id;
  private String name;
  Map<String, Object> indexSig = new HashMap<>();
}

var indexSig1 = new Person(1, "suzuki", Map.of("address", "tokyo", "getName", (Supplier<String>) () -> "suzuki"));
indexSig1.getIndexSig().get("address"); //tokyo
Object getNameLogic = indexSig1.getIndexSig().get("getName");
if (getNameLogic instanceof Supplier) {
  ((Supplier<String>)getNameLogic).get(); //suzuki
}
```
Mapで同じようなことが表現できます。
