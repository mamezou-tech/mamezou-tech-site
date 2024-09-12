---
title: Javaエンジニアが始めるTypeScript入門（第5回：集合を扱う型）
author: masato-ubata
date: 2024-09-14
tags: [typescript, java]
image: true
prevPage: ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_other-basic-type.md
nextPage: ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_special-type.md
---

## はじめに

今回は、変数、引数、戻り値などに使用する集合を扱う型について説明します。  

|名称、概要|JavaScript|TypeScript|Java|備考|
|---|---|---|---|---|
|配列|array|array|Array||
|タプル型|≒array|tuple|-（commons-langなどで代用可）||
|Set|Set|Set|Set||
|Map|Map|Map|Map||

※表はTypeScriptの型と**近い型**をマッピングしたものです。

## array（配列型）

可変長の配列を示す型です。  
型注釈をつけることで配列に含まれる要素の型を制限できますが、各要素ごとの型は設定できません。

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
// 型定義のみ
let ary1: string[]; // *1
ary1 = ["A", "B", "C"];
let ary1_1: Array<string | number>; //Arrayによる型指定
let ary1_2: (number | string)[]; //複数型の指定

const ary2 = []; // 型なし初期化: typeof ary2=any[]
ary2.push(1);
ary2.push("A");

const ary3 = [] as string[]; // 型あり初期化

// 値付き初期化
const ary4 = ["A", "B", "C"]; // typeof ary4=string[]
const ary4_1 = [1, "A"] //typeof ary4_1=(number | string)[]
ary4_1[0] = "hoge"; //*2

// 読み取り専用
const aryR: readonly number[] = [1];
// aryR[0] = 1; //配列の要素に対する操作 *3
// aryR.push(1); //配列に対する操作 *3
aryR[3]; //undefined *4

const aryR_1: ReadonlyArray<number> = [1];
// aryR_1[0] = 1; //*3

interface IfR {
  readonly ids: number[],
  readonly ids2: readonly number[],
  getIds3: () => readonly number[],
}
const ifr: IfR = {
  ids: [1, 2, 3, 4, 5],
  ids2: [1, 2, 3, 4, 5],
  getIds3: () => { return [1, 2, 3, 4, 5]; }
};

// 属性が読み取り専用 *5
ifr.ids[0] = 2;
ifr.ids.push(6);
// ifr.ids = [1];

// 属性および値である配列が読み取り専用 *6
// ifr.ids2[0] = 2;
// ifr.ids2.push(6);
// ifr.ids2 = [1];

// 戻り値である配列が読み取り専用 *7
const ids3 = ifr.getIds3();
// ids3[0] = 2;
// ids3.push(6);
```
* 1: 初期化されてないので`let`で宣言しています。
* 2: 配列としての型は限定できますが要素ごとに決まるわけではないため、エラーは発生しません。
* 3: エラー：読み取り専用
* 4: 存在しない要素を参照した場合、undefinedが返されます。
* 5: 属性は読み取り専用なので、代入はエラーになります。
* 6: 属性および値ともに読み取り専用なので、配列要素の操作、配列の操作、代入はエラーになります。
* 7: 戻り値は読み取り専用なので、配列要素の操作、配列の操作はエラーになります。

```java: Javaではどうなるか
@Setter
@Getter
static class IfR {
  private final List<Integer> ids;
  private final List<Integer> ids2;
  private final Supplier<List<Integer>> ids3;
  IfR(Integer[] ids, Integer[] ids2, Supplier<List<Integer>> ids3) {
    this.ids = 
    Arrays.stream(ids).collect(Collectors.toList());
    this.ids2=List.of(ids2);
    this.ids3 = ids3;
  }
  List<Integer> getIds3() {
    return List.copyOf(ids3.get());
  }
}

// 型定義のみ
String[] ary1;
ary1 = new String[]{"A", "B", "C"};
Object[] ary1_1; //Arrayによる型指定 *1
Object[] ary1_2; //複数型の指定: 不可 *1

var ary2 = new Object[2]; // 型なし初期化 *2
ary2[0] = 1;
ary2[1] = "A";

var ary3 = new String[0]; // 型あり初期化

// 値付き初期化
var ary4 = new String[]{"A", "B", "C"}; // ary4=string[]
var ary4_1 = new Object[]{1, "A"}; // ary4_1=Object[]
ary4_1[0] = "hoge"; //*2
// System.out.println(ary4_1[3]); //*3

// 読み取り専用 *4
final List<Integer> aryR = List.of(1);
// aryR.set(0, 1); //配列の要素に対する操作 *5
// aryR.add(1); //配列に対する操作 *5

var ifr = new IfR(
  new Integer[]{1,2,3,4,5}, 
  new Integer[]{1,2,3,4,5}, 
  () -> {return List.of(1,2,3,4,5);});

// 属性が読み取り専用 *6
ifr.getIds().set(0, 2);
ifr.getIds().add(6);
// ifr.setIds(List.of(1));

// 属性および値である配列が読み取り専用 *7
// ifr.getIds2().set(0, 2);
// ifr.getIds2().add(6);
// ifr.setIds2(List.of(1));

// 戻り値である配列が読み取り専用 *8
var ids3 = ifr.getIds3();
// ids3.set(0, 2);
// ids3.add(6);
```
* 1: 複数の型指定はできないのでObject配列で代替しています。
* 2: 型なしの初期化はできません。サイズも必要なので、サイズを指定したObject配列で代替しています。
* 3: 存在しない要素を参照した場合、`ArrayIndexOutOfBoundsException`がスローされます。
* 4: 配列を読み取り専用にできないのでListで代替しています。
* 5: エラー：ImmutableListなので、Listに対する操作、Listの要素に対する操作はできません。
* 6: 属性は変更不可なので、代入できません。
* 7: 属性は変更不可なので、代入できません。値も変更不可なので、List要素の操作、Listの操作は`UnsupportedOperationException`がスローされます。
* 8: 戻り値は変更不可なので、List要素の操作、Listの操作は`UnsupportedOperationException`がスローされます。

### スプレッド演算子による操作

スプレッド演算子を使って結合した際の動きを確認します。

```ts: TypeScript
//スプレッド演算子による合成
const arySp1 = ["A", "B", "C"];
const arySp2 = [1, "D"];
const arySp3 = ["A", "D"];
const arySp12 = [...arySp1, ...arySp2]; //['A','B','C',1,'D']
const arySp13 = [...arySp1, ...arySp3]; //['A','B','C','A','D'] *1
//合成元への変更の波及を確認
arySp13[0] = "E"; //arySp1=['A','B','C'], arySp13=['E','B','C','A','D'] *2
//合成先への変更の波及を確認
arySp1[0] = "E"; //arySp1=['E','B','C'], arySp13=['E','B','C','A','D'] *3
//スプレッド演算子なし
const arySp_none = [arySp1, arySp2]; //[['E','B','C'],[1,'D']] *4
```
* 1: 要素を比較しているわけではないので後勝ちなどはなく、純粋な結合になります。
* 2: 合成後の変数の属性を変更しても、合成元の変数の属性に影響はありません。
* 3: 2の逆も同じく、影響はありません。
* 4: スプレッド演算子を使わない場合、2つの配列を持つ配列が生成されます。

```java: Javaではどうなるか
// スプレッド演算子による合成
final String[] arySp1 = { "A", "B", "C" };
final Object[] arySp2 = { 1, "D" };
final String[] arySp3 = { "A", "D" };

final Object[] arySp12 = new Object[arySp1.length + arySp2.length];
System.arraycopy((Object[]) arySp1, 0, arySp12, 0, arySp1.length);
System.arraycopy(arySp2, 0, arySp12, arySp1.length, arySp2.length); //['A','B','C',1,'D'] *1

final String[] arySp13 = Stream.concat(Arrays.stream(arySp1), Arrays.stream(arySp3)).toArray(String[]::new); //['A','B','C','A','D'] *2

// 合成元への変更の波及を確認
arySp13[0] = "E"; // arySp1=['A','B','C'], arySp13=['E','B','C','A','D'] *3
// 合成先への変更の波及を確認
arySp1[0] = "E"; // arySp1=['E','B','C'], arySp13=['E','B','C','A','D'] *4
// スプレッド演算子なし
Object[] arySp_none = new Object[] { arySp1, arySp2 }; // [['E','B','C'],[1,'D']]
```
* 1: arraycopyで同じような処理を実現した例です。
* 2: Lambda式で同じような処理を実現した例です。
* 3: 合成後の変数の属性を変更しても、合成元の変数の属性に影響はありません。
* 4: 2の逆も同じく、影響はありません。

### 分割代入

分割代入による変数への代入を確認します。

```ts: TypeScript
// 分割代入
const aryDivide = [1, 2, 3, 4, 5];
const [one, , three, , five] = aryDivide; //one=1, three=3, five=5
// 分割代入＋スプレッド演算子
const [first, second, ...rest] = [1, 2, 3, 4, 5]; //first=1, second=2, rest=3,4,5
```

```java: Javaではどうなるか
// 分割代入に対応する機能はありません。
```
まとめて代入はできないので、個別に代入して代替します。

### 配列の操作

配列が持つメソッドを使って簡単に動作を確認します。  

```ts
const ary5 = [1, 2, 3, 4, 5];
ary5.push(6); //最後に追加: ary5=[1,2,3,4,5,6]
ary5.pop(); //最後の要素を取り出す: ary5=[1,2,3,4,5]
ary5.unshift(0); //最初に要素を追加: ary5=[0,1,2,3,4,5]
ary5.shift(); //最初の要素を取り出す: ary5=[1,2,3,4,5]
ary5.splice(1, 2); //指定した要素を除去: ary5=[1,4,5]
ary5.sort((a, b) => b - a); //降順にソート（正数の場合、入れ替え）: [5,4,1]
ary5.sort(); //ソート（UTF-16コードの順）: [1,4,5]
ary5.slice(0, 2); //指定した要素から新しい配列を生成: [1, 4]
```

```java: Javaではどうなるか
// 配列はそのまま操作できません。
```
変数編でも触れたように配列を操作できないので、配列を再生成するか、Listで代替する必要があります。  
コード例は[変数編](/typescript-intro/introduction-to-typescript-for-java-engineer_variable/#変数の特性-1)を参照してください。  

### 繰り返しによる操作

forを使った繰り返しによる操作を確認します。
若干の差はありますが、Javaと変わりません。

```ts
const ary6 = [1, 2, 3, 4, 5];
for (let i = 0; i < ary6.length; i++) {console.log(ary6[i])} //for
ary6.forEach(num => console.log(num)); //forEach
for (let num of ary6) {console.log(num)} //for-of
```

```java: Javaではどうなるか
int[] ary6 = { 1, 2, 3, 4, 5 };
for (int i = 0; i < ary6.length; i++) {System.out.println(ary6[i]);} // for
Arrays.stream(ary6).boxed().toList().forEach(num -> System.out.println(num)); // forEach
for (int num : ary6) {System.out.println(num);} //for-of
```

:::info
**TypeScriptとJavaの相違点**
* TypeScript: 配列は**可変長**なので、要素の追加（push）や削除（pop, shift）などの操作が可能です。
* Java: 配列は**固定長**なので、要素の追加や削除はできません。
:::

## tuple（タプル型）

固定長の配列を示す型です。  
各要素の型、順番、サイズが定義内容によって決まります。

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
let tuple1: [number, string]; //型定義のみ *1
tuple1 = [1, "suzuki"];

const tupleInf = [1, "suzuki"]; //値付き初期化 *2
tupleInf[0] = "hoge"; //[hoge, suzuki]

const tuple2: [number, string] = [1, "suzuki"];
// tuple2[0] = "hoge"; //*3

const tuple3: [number, string, string] = [1, "suzuki", "tokyo"];
tuple3[2] = "oosaka";  //[1, suzuki, oosaka]

const tupleR: readonly [number, string, string] = [1, "suzuki", "tokyo"]; //読み取り専用
// tupleR[2] = "oosaka"; //*4
```
* 1: 初期化されてないので`let`で宣言しています。
* 2: 型注釈を省略するとタプル型ではなく、配列型として推論されます。number or stringの配列になっているため、1つめの要素に文字を代入してもエラーは発生しません。
* 3: エラー：1つ目の要素はnumberなので型エラーになります。
* 4: エラー：読み取り専用なので、要素の変更はできません。

```java: Javaではどうなるか
// 対応する型はありません。  
```
commons-langなどのライブラリが提供している型を使うか、独自に型を定義すれば代替できます。  

## Set

重複する要素を含まない値の集合を表現します。
* 順序: 順序は保証しない。順序がないため、インデックスを指定したアクセスもできません。
* 重複する要素は排除する: 同じ値を複数回追加しても重複要素は排除されるため、一度しか登録されません。

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
let set1: Set<number>; //型定義のみ *1
set1 = new Set([1,2,3]);

const set2 = new Set(); // 型なし初期化: typeof set2=unknown
set2.add(1);
set2.add("A");

const set3 = new Set<string>(); // 型あり初期化

const set4 = new Set(["A", "B", "C", "D", "E"]); // 値付き初期化: typeof set6=Set<string>
```
* 1: 初期化されてないので`let`で宣言しています。

```java: Javaではどうなるか
Set<Long> set1; // 型定義のみ
var set2 = new HashSet(); // 型なし初期化 *1
Set<String> set3 = new HashSet<>(); // 型あり初期化 *2
Set<String> set4 = new HashSet<>(Arrays.asList("A", "B", "C", "D", "E")); // 値付き初期化 *2
var set4_1 = Set.of("A", "B", "C", "D", "E"); //値付き初期化（読み取り専用）: set4_1=Set<String>型
```
* コード例では、Setの実装としてHashSetを使用しています。
* 1: 型無指定のため、rowタイプとして警告されます。
* 2: Set型にしたいのでvarは使用できません。

### Setの操作

Setが持つメソッドを使って簡単に動作を確認します。  
若干の差はありますが、Javaと変わりません。

```ts
const set5 = new Set<string>();
set5.add("A").add("B").add("C"); //値追加: [A,B,C] *1
set5.add("C"); //存在している値を更新: [A,B,C] *2
set5.delete("C"); //値削除: [A,B]
set5.delete("Z"); //値削除(存在しない値): [A,B] *3
set5.clear(); //クリア: []
```
* 1: addの戻り値が`Set<T>`なのでメソッドチェーンで呼び出せます。
* 2: 存在している値を更新しても何も起きず、例外も発生しません。
* 3: 存在しない値を削除するとfalseが返されるだけで例外は発生しません。

```java: Javaではどうなるか
var set5 = new HashSet<String>();
set5.add("A"); // 値追加: *1
set5.add("B");
set5.add("C"); // [A,B,C]
set5.add("C"); //存在している値を更新: [A,B,C] *2
set5.remove("C"); //値削除: [A,B]
set5.remove("Z"); //値削除(存在しない値): [A,B] *3
set5.clear(); //クリア: []
```
* 1: addの戻り値はbooleanなのでメソッドチェーンで呼び出すことはできません。
* 2: 存在している値を更新しても何も起きず、例外も発生しません。
* 3: 存在しない値を削除するとfalseが返されるだけで例外は発生しません。

### 繰り返しによる操作

forを使った繰り返しによる操作を確認します。
若干の差はありますが、Javaと変わりません。

```ts
const set6 = new Set(["A", "B", "C"]); 
set6.forEach((value) => {console.log(value)}); //forEach
for (const value of set6) {console.log(value)} //for-of
```

```java: Javaではどうなるか
final var set6 = Set.of("A", "B", "C");
set6.forEach(value -> System.out.println(value)); // forEach
for (var value : set6) {System.out.println(value);} // 拡張for
```

## Map

キーと値のペアを格納するデータ構造です。キーはユニークで、そのキーに対応する値を取得できます。
* キーの型: 文字列、数値、オブジェクトなど、任意のデータ型をキーとして使用できます。
* キーの重複: 不可。同じキーで値を設定すると値が更新されます。
* 要素の挿入順序を保持します。

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
let map1: Map<String, number>; //型定義のみ *1
map1 = new Map([["A", 1], ["B", 2]]);

const map2 = new Map(); // 型なし初期化: typeof map2=Map<any, any>
map2.set(1, 1);
map2.set("key", "value");

const map3 = new Map<String, number>(); // 型あり初期化

const map4 = new Map([["A", 1], ["B", 2]]); // 値付き初期化: typeof map4=Map<string, number>
```
* 1: 初期化されてないのでletで宣言しています。

```java: Javaではどうなるか
Map<String, Integer> map1; // 型定義のみ
var map2 = new HashMap(); // 型なし初期化 *1
Map<String, Integer> map3 = new HashMap<>(); // 型あり初期化 *2
Map<String, Integer> map4 = new HashMap<>() {{put("A", 1);put("B", 2);}}; // 値付き初期化 *2
var map4_1 = Map.of("A", 1, "B", 2); // 値付き初期化（読み取り専用）: map4_1=Map<String, Integer>型
```
* コード例では、Mapの実装としてHashMapを使用しています。
* 1: 型無指定のため、rowタイプとして警告されます。
* 2: Map型にしたいので、varは使用できません。

### Mapの操作

Mapが持つメソッドを使って簡単に動作を確認します。  
若干の差はありますが、Javaと変わりません。

```ts
const map5 = new Map<string, number>();
map5.set("A", 1).set("B", 2).set("C", 3); //値追加: [A,1][B,2][C,3] *1
map5.set("C", 4); //存在している値を更新: [A,1][B,2][C,4]
map5.get("A"); //値取得: 1
map5.get("Z"); //値取得(存在しない値): undefined
map5.delete("C"); //値削除: [A,1][B,2]
map5.delete("Z"); //値削除(存在しない値): [A,1][B,2] *2
map5.clear(); //クリア: []
```
* 1: setの戻り値が`Map<K, V>`なのでメソッドチェーンで呼び出せます。
* 2: 存在しない値を削除するとfalseが返されるだけで例外は発生しません。

```java: Javaではどうなるか
var map5 = new HashMap<String, Integer>();
map5.put("A", 1); // 値追加 *1
map5.put("B", 2);
map5.put("C", 3); // {A=1,B=2,C=3}
map5.put("C", 4); // 存在している値を更新: {A=1,B=2,C=4}
map5.get("A"); // 値取得: 1
map5.get("Z"); // 値取得(存在しない値): null
map5.remove("C"); // 値削除: {A=1,B=2}
map5.remove("Z"); // 値削除(存在しない値): {A=1,B=2} *2
map5.clear(); // クリア: {}
```
* 1: putの戻り値はbooleanなのでメソッドチェーンで呼び出すことはできません。
* 2: 存在しない値を削除するとnullが返されるだけで例外は発生しません。

### 繰り返しによる操作

forを使った繰り返しによる操作を確認します。
若干の差はありますが、Javaと変わりません。

```ts
const map6 = new Map([["A", 1], ["B", 2], ["C", 3]]);
map6.forEach((value, key) => {console.log(value)}); //forEach *1
for (const[key, value] of map6) {console.log(value)} //for-of
```
* 1: value, keyの順になるので要注意です。

```java: Javaではどうなるか
var map6 = Map.of("A", 1, "B", 2, "C", 3);
map6.forEach((key, value) -> System.out.println("%s:%s".formatted(key, value))); // forEach
for (String key : map6.keySet()) {System.out.println("%s:%s".formatted(key, map6.get(key)));} // 拡張for
```
