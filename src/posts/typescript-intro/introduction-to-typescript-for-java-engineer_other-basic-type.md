---
title: Javaエンジニアが始めるTypeScript入門（第4回：その他の基本型）
author: masato-ubata
date: 2024-09-11
tags: [typescript, java]
prevPage: ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_primitive-type.md
nextPage: ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_collection-type.md
image: true
---

## はじめに

今回は、変数、引数、戻り値などに使用するその他の基本型について説明します。  

|名称、概要|JavaScript|TypeScript|Java|備考|
|---|---|---|---|---|
|任意の型|any|any|≒Object||
|オブジェクト|object|object|≒Object||
|unknown型|≒object|unknown|≒Object||
|関数が何も返さないこと|void|void|void||
|決して返らない値の型|-|never|-||
|列挙型|≒function+array|enum|enum|厳密なタイプセーフが必要な場合は使わない|

※表はTypeScriptの型と**近い型**をマッピングしたものです。

## any（任意の型）

どんな値も代入できる型です。  
型チェックが効かず、静的型付け言語の強みを損なうので使用は限定すべきです。  
お試しでいったん取り込みたいものがあるとか、型が不明な外部ライブラリと連携する必要があるような場合、使用することになると思います。
* どんな値も代入できます。
* 逆にどんな型にも代入できます。
* 属性や関数にアクセスできます。
* 型チェックが効かないため、異なる型の値も設定できます。

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
//anyをそのまま操作
let any1_1: any = { id: 1, name: "suzuki", fn: (): string => { return "hoge"; } };
any1_1.id; //*1
any1_1.fn();
any1_1.id = 2; //{ id: 2, name: "suzuki" }
any1_1.id = "hoge";  //異なる型で更新 *2

//型アサーションしてanyを操作
let any1_2: any = { id: 1, name: "suzuki", fn: (): string => { return "hoge"; } };
(any1_2 as { id: number }).id; //*3

//型ガードで型を特定したanyを操作
const isPerson = (obj: any): obj is Person => {
  return obj instanceof Person;
};
let any2: any = new Person(1, "suzuki");
if (isPerson(any2)) { //*4
  any2.id;
  any2.fn();
  any2.id = 2;
} else if (typeof any2 === "string") {
  any2.length;
}

//型を明示している変数にanyを代入してみる
let any3_1: number = 1;
let any3_2: any = "hoge";
any3_1 = any3_2; //any3_1=hoge, typeof any3_1=string *5

//anyにいろいろな型の値を代入してみる
let any4;
any4 = 10; //typeof any4=number *6
any4 = "hoge"; //typeof any4=string
any4 = 10n; //typeof any4=bigint
any4 = { id: 1, name: "suzuki" }; //typeof any4=object
// let any4_1: string = any4; //*7
```
* 1: 属性や関数にアクセスできます。（vscodeではコードアシストが効きませんでした）
* 2: 型チェックが効かず、型が違っても設定できてしまいます。
* 3: 型アサーションすれば属性や関数にアクセスできますが、安全な処理ではありません。
* 4: 型チェックすれば、その型が持つ属性や関数にアクセスできます。anyの場合、型の情報が失われるので`instanceof`では比較できないので型ガードを自身で定義する必要があります。
* 5: エラーは発生せず、代入された側の型も変わってしまいます。
* 6: なんでも代入できます。typeofの結果は代入された値によって決まります。
* 7: このタイミングではobject型になっているため、型エラーが発生します。

:::info
**型アサーション**
キャストのことです。  
anyなどのように複数の型を受け入れている場合、コンパイラに型を明示的に伝える際に使用します。  
* 実行時の型と一致していること: 型アサーションはあくまでもコンパイラへのヒントです。実行時に実際の型と一致していなければ、実行時エラーにつながる可能性があります。
* 誤ったアサーションはバグの原因: 型アサーションを誤ると予期せぬバグの原因になる可能性があります。
```ts
let ta1: any = new Person(1,"suzuki");
(ta1 as Person).id;

let ta2: object = {id: 1, name: "suzuki"};
(ta2 as {id: number}).id;

let ta3: unknown = {id: 1, name: "suzuki"};
(ta3 as {name: string}).name;
```
* 1: 型アサーションの例
:::

```java: Javaではどうなるか
// Objectが近いので、Objectを使って例示します。

@AllArgsConstructor
@Getter
@Setter
class Person {
  private Object id;
  private Object name;
  String fn() {return "hoge";}
}

// 「anyをそのまま操作」「型アサーションしてanyを操作」の代替 *1
Object any1 = new Person(1, "suzuki");
((Person) any1).getId();
((Person) any1).fn();
((Person) any1).setId(2);
((Person) any1).setId("hoge");

// 型ガードで型を特定したanyを操作
Object obj2 = new Person(1, "suzuki");
if (obj2 instanceof Person) {
  Person obj2_p = (Person) obj2;
  obj2_p.getId();
  obj2_p.fn();
  obj2_p.getName();
} else if (obj2 instanceof String) {
  String obj2_s = (String)obj2;
  obj2_s.length();
}

// 型を明示している変数にanyを代入してみる *2
// anyにいろいろな型の値を代入してみる *2
```
* 1: 見ての通り、無理やりすぎる処理になります。型の強みが失われて危険な処理だらけになることがお解り頂けると思います。
* 2: 既存の型では実現できません。代入した値によって実体を変えるような型でも作らないと実現はできません。

## object（オブジェクト型）

プリミティブ型以外のすべての型を表す型です。  
anyと似ていますが、型を特定すると安全に操作できるため、型に対する厳密性が異なります。  
* プリミティブ型以外の値を代入できます。
* 型ガードすると、その型に合わせた操作が可能になります。

:::info
**型ガード**
型チェックのことです。
変数の型を実行時にチェックし、その結果に応じて分岐させる際に使用します。

```ts
class Person {
  id: number;
  name: string;
  fn = () => { return "hoge"; };
  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }
}

//ユーザー定義型ガード
const isPerson = (obj: any): obj is Person => {
  return obj instanceof Person;
};
let tg1: any = new Person(1, "suzuki");
if (isPerson(tg1)) { //*1
  tg1.id;
  tg1.fn();
  tg1.id = 2;
}

let tg2: object = new Person(1, "suzuki");
if (tg2 instanceof Person) { //*1
  tg2.id;
}

let tg3: unknown = new Person(1, "suzuki");
if (tg3 instanceof Person) { //*1
  tg3.id;
} else if (typeof tg3 === "string") {
  tg3.length;
}

const fnTg4 = (arg: number | string) => {
  if (typeof arg === "number") { //*1
    arg.valueOf();
  } else if (typeof arg === "string") {
    arg.length;
  }
}
```
* 1: 型ガードの例
:::

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
//型アサーションしてobjectを操作
let obj1: object = { id: 1, name: "suzuki", fn: (): string => { return "hoge"; } };
// obj1.id; //*1
(obj1 as { id: number }).id; //*2
(obj1 as { fn: () => {} }).fn(); //*2
(obj1 as { id2: number }).id2; //undefined *3
(obj1 as { id2: number }).id2 = 2; //{ id: 1, name: 'suzuki', fn: [Function: fn], id2: 2 } *4

//型ガードで型を特定したobjectを操作
let obj2: object = new Person(1, "suzuki");
if (obj2 instanceof Person) { //*5
  obj2.id;
  obj2.fn();
  obj2.id = 2;
} else if (typeof obj2 === "string") {
  // obj2.length; //never *6
}

//型を明示している変数にobjectを代入してみる
let obj3_1: number = 1;
let obj3_2: object = { id: 1 };
// obj3_1 = obj3_2; //*7

//objectにいろいろな型の値を代入してみる
let obj4: object;
// obj4 = 1; //*6
obj4 = { id: 1 };
obj4 = [1, 2, 3];
obj4 = () => {return "hoge"};
```
* 1: エラー：型を特定していないため、属性へアクセスできません。
* 2: 型アサーションすれば属性や関数にアクセスできますが、安全な処理ではありません。
* 3: 型を特定してないので、こんな誤った指定もできてしまいます。例外にはなりませんが、危険な処理であることは想像して頂けると思います。
* 4: 存在しない属性も追加できます。
* 5: 型チェックすれば、その型が持つ属性や関数にアクセスできます。
* 6: エラー：プリミティブ型は使用できません。
* 7: エラー：unknown型は他の型に代入できません。

```java: Javaではどうなるか
// Objectが近い型と言えます。
```
実装例はanyと変わらないので省略します。

### スプレッド演算子による操作

スプレッド演算子を使って結合した際の動きを確認します。

:::info
**スプレッド演算子とは**
JavaScriptのES6で導入された構文です。  
イテラブルなオブジェクト（配列、文字列など）の要素を展開したり、オブジェクトの属性を展開したりする際に使用します。  
プレフィックスに`...`を付与している部分が該当します。

::: 

```ts: TypeSCript
//スプレッド演算子による合成
let objSp1_1 = {id: 1, name: "suzuki"};
let objSp1_2 = {address: "tokyo"};
let objSp1_3 = {name: "sato", address: "tokyo"};
let objSp12 = {...objSp1_1, ...objSp1_2}; //{"id":1,"name":"suzuki","address":"tokyo"}
let objSp13 = {...objSp1_1, ...objSp1_3}; //{"id":1,"name":"sato","address":"tokyo"} *1
//合成元への変更の波及を確認
objSp13.name = "takahashi"; // objSp1_2={"name":"sato","address":"tokyo"}, objSp13={"id":1,"name":"takahashi","address":"tokyo"} *2
//合成先への変更の波及を確認
objSp1_3.name = "yamaguchi"; // objSp2={"name":"yamaguchi","address":"tokyo"}, objSp13={"id":1,"name":"takahashi","address":"tokyo"} *3
```
* 1: 同名の属性をもつ場合、後勝ちになります
* 2: 合成後の変数の属性を変更しても、合成元の変数の属性に影響はありません。
* 3: 2の逆も同じく、影響はありません。

```java: Javaではどうなるか
// 結合対象がMapとした場合のコード例
Map<String, Object> objSp1_1 = new HashMap<>() {{
  put("id", 1);
  put("name", "suzuki");
}};
Map<String, Object> objSp1_2 = new HashMap<>() {{
  put("address", "tokyo");
}};
Map<String, Object> objSp1_3 = new HashMap<>() {{
  put("name", "sato");
  put("address", "tokyo");
}};
Map<String, Object> objSp12 = new HashMap<>() {{ //{name=suzuki, id=1, address=tokyo}
  putAll(objSp1_1);
  putAll(objSp1_2);
}};
Map<String, Object> objSp13 = new HashMap<>() {{ //{name=sato, id=1, address=tokyo}
  putAll(objSp1_1);
  putAll(objSp1_3);
}};
//合成元への変更の波及を確認
objSp13.put("name", "takahashi"); //objSp1_3={address=tokyo, name=sato}, objSp13={name=takahashi, id=1, address=tokyo}
//合成先への変更の波及を確認
objSp1_3.put("name", "yamaguchi"); //objSp1_3={address=tokyo, name=yamaguchi}, objSp13={name=takahashi, id=1, address=tokyo}
```

## unknown

型が不明な値（≒確定してない値）を扱う型で、TypeScript3で導入されました。  
anyと似ていますが、型を特定すると安全に操作できるため、型に対する厳密性が異なります。  
型が事前にわからない外部データなどを扱う場合に使用できると思います。
* どんな値も代入できます。
* 型ガードすると、その型に合わせた操作が可能になります。

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
class Person {
  id: number = 0;
  name: string = "";

  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }

  fn() {
    console.log("Person#fn");
  };
}

//型アサーションしてunknownを操作
let unk1: unknown = { id: 1, name: "suzuki", fn: (): string => { return "hoge"; } };
// unk1.id; //*1
(unk1 as { id: number }).id; //*2
(unk1 as { fn: () => {} }).fn(); //*2
(unk1 as { id2: number }).id2; //undefined *3

//型ガードで型を特定したunknownを操作
let unk2: unknown = new Person(1, "suzuki");
if (unk2 instanceof Person) { //*4
  unk2.id;
  unk2.fn();
  unk2.id = 2;
} else if (typeof unk2 === "string") {
  unk2.length; //stringが持つ関数
} else if (typeof unk2 === "number") {
  unk2 * 2; //numberを積算
}

//型を明示している変数にunknownを代入してみる
let unk3_1: number = 1;
let unk3_2: unknown = 2;
// unk3_1 = unk3_2; //*5

//unknownにいろいろな型の値を代入してみる
let unk4: unknown;
unk4 = "hoge"; //typeof unk4=string *6
unk4 = 1; //typeof unk4=number
```
* 1: エラー：型を特定していないため、属性へアクセスできません。
* 2: 型アサーションすれば属性や関数にアクセスできますが、安全な処理ではありません。
* 3: 型を特定してないので、こんな誤った指定もできてしまいます。例外にはなりませんが、危険な処理であることは想像して頂けると思います。
* 4: 型チェックすれば、その型が持つ属性や関数にアクセスできます。
* 5: エラー：unknown型は他の型に代入できません。
* 6: なんでも代入できます。typeofの結果は代入された値によって決まります。

```java: Javaではどうなるか
// Objectが近い型と言えます。
```
実装例はanyと変わらないので省略します。

:::info
**any, unknown, objectとの比較**
|比較する特性|any|unknown|object|
|---|---|---|---|
|代入可能な値|どんな値も代入可能です|同左|プリミティブ型以外|
|他の型への代入|どんな型にも代入できます|anyおよびunknown以外の型には代入できません||
|型チェック|なし|厳密|プリミティブ型以外に制限されるため、anyに比べれば安全|
|属性や関数へのアクセス|アクセスできます|型ガードすればアクセスできます|同左|
:::

## void

関数が何も返さないことを示す型です。  

### 型の特性

型の特性をコードベースで確認します。


```ts: TypeScript
const fnVoid = (): void => {};
const fnVoidInf = () => {};
```

```java: Javaではどうなるか
void fnVoid() {}
void fnVoidInf() {}
```

## never

決して返らない値の型です。
* never以外は代入不可

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
const nv0_1: any = 1;
// const nv0_2: never = nv0_1; //*1
const nv1: never = 1 as never; //*2
const nv2 = 1 as never;
const nv2_1: string = nv2; //*3
const nv2_2: number = nv2;
```
* 1: エラー：anyでも代入できません
* 2: neverは代入できます
* 3: neverはどんな型にも代入できます

```java: Javaではどうなるか
//対応する型はありません。
```

## enum（列挙型）

あらかじめ定義した定数をまとめて扱う型です。  
TypeScriptのenumはJavaScriptのオブジェクトとしてコンパイルされるため、Javaのenumのように厳密なタイプセーフは保証されません。厳密なタイプセーフを求める場合、他の手段を検討する必要があります。  

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
enum Enum1 {
  ONE,
  TWO,
  THREE,
}

//単数の値を持つEnum
enum Enum2 {
  ONE = 1,
  TWO = 2,
  THREE = 3,
}

//複数の値を持つEnumっぽいもの *1
type Enum3 = {
  [K in "ONE" | "TWO" | "THREE"]: {
    value: number;
    viewString: string;
  };
};
//Enum3={ONE: {value: number;viewString: string;}; TWO: {value: number;viewString: string;}; THREE: : {value: number;viewString: string;};}
const enum3: Enum3 = {
  ONE: { value: 1, viewString: "いち" },
  TWO: { value: 2, viewString: "に" },
  THREE: { value: 3, viewString: "さん" },
};
//enum3.ONE.value=1, enum3.ONE.viewString="いち"
```
* 1: 複数の値を持つEnumは定義できないため、例ではタイプエイリアス＋constをマッピングして同等の内容を表現しています。

```java: Javaではどうなるか
enum Enum1 {
  ONE,
  TWO,
  THREE,
}

//単数の値を持つEnum
@AllArgsConstructor
enum Enum2 {
  ONE(1), TWO(2), THREE(3);

  private int value;
}

//複数の値を持つEnum
@AllArgsConstructor
enum Enum3 {
  ONE(1, "いち"), TWO(2, "に"), THREE(3, "さん");

  private int value;
  private String viewString;
}
```

:::info
* Javaとは異なり、TypeScriptのEnumは振る舞いや複数の値を持つEnumは定義できません。必要なら他の手段を採る必要があります。複数の値を持つEnum的に使える実装の例は上記のコードに示しています。  
* TypeScript5+ではEnumのタイプセーフに関する問題が改善されたものの、厳密なタイプセーフを求める場合は別の手段も検討してください。
  * ユニオン型による代替例: キーを定義して、キー（リテラル）を限定する型を定義する方法です
    ```ts
    type EnumAlt1 = "ONE" | "TWO" | "THREE";
    let enumAlt1: EnumAlt1 = "ONE"; //enumAlt1="ONE"
    ```
  * リテラル型による代替例: キーと値の定数から、キー（リテラル）を限定する型を定義する方法です
    ```ts
    const enumAlt2_1 = {ONE: 1, TWO: 2, THREE: 3};
    type EnumAlt2_2 = keyof typeof enumAlt2_1;
    let enumAlt2_3: EnumAlt2_2 = "ONE"; //enumAlt2_1="ONE", enumAlt2_1[enumAlt2_2]=1
    ```
  * constアサーション＋タイプエイリアスによる代替例: キーと値の定数から、値を限定する型を定義する方法です
    ```ts
    const enumAlt3_1 = {ONE: 1, TWO: 2, THREE: 3} as const;
    type EnumAlt3Type = typeof enumAlt3_1[keyof typeof enumAlt3_1];
    let enumAlt3_2: EnumAlt3Type = enumAlt3_1.ONE; //enumAlt3_2=1
    console.log(`${enumAlt1} ${enumAlt2_3} ${enumAlt2_1[enumAlt2_3]} ${enumAlt3_2}`);
    ```
  * constアサーション＋タイプエイリアスをマッピングする代替例: キーになる定数から、キーと値を対で管理する型を定義する方法です
    * 「型の特性」で掲載した例がこれに該当するので、そちらを参照してください。
:::
