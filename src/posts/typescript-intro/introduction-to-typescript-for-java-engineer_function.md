---
title: Javaエンジニアが始めるTypeScript入門（第7回：関数）
author: masato-ubata
date: 2024-10-09
tags: [typescript, java]
image: true
prevPage: ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_special-type.md
nextPage: ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_object.md
---

## はじめに

今回は関数について説明します。

## 関数の基本構文

関数の構文と定義例は下記の通りです。  

```ts: 構文
/**
 * _関数名_　: 関数の名称
 * _引数_　　:（任意）引数が必要な関数の場合設定します。複数指定する場合は`,`で区切って指定します。
 * _戻り値型_:（任意）戻り値の型を明示したい場合に設定します。
 */
//関数式
function _関数名_(_引数_)[: _戻り値型_] {/** 任意の処理。 */}
//アロー関数
const _関数名_ = (_引数_)[: _戻り値型_] => {/** 任意の処理。 */};
```

```ts: 定義例
function fn1_1(x: number, y: number): number { return x * y; }
const fn1_2 = (x: number, y: number): number => { return x * y; };
const fn1_3 = (x: number, y: number) => { return x * y; }; //*1
const fn1_4 = (x: number, y: number) => x * y; //*2
const fn1_5: (x: number, y: number) => number = (x, y) => x * y;
const fn1_6 = (x?: number, y = 10) => {if(x) { return x * y; } return y;}; //x: number | undefined *3
fn1_6(); //x: undefined, y: 10
fn1_6(2); //x: 2, y: 10
fn1_6(3, 4); //x: 3, y: 4
const fnVariableArgument = (...etc: number[]) => { //*4
  return etc.reduce((sum, current) => sum += current, 0);
};
fnVariableArgument(1, 2, 3, 4, 5, 6, 7, 8, 9, 10); //55
```
* 1: 戻り値の型を型推論に任せて省略した例です。
* 2: 処理が1文なので、中括弧も省略した例です。
* 3: 
  * オプション引数（`_引数名_?`）を指定した引数はundefinedが許容されます。この引数の指定を省略した場合、undefinedとして扱われます。
  * 初期値を設定（`_引数名_ = _初期値_`）した引数を省略した場合、初期値が使用されます。
* 4: 残余引数（`..._引数名_`）として指定した引数は可変長引数になります。
:::check
**関数の書き方はプロジェクトまたはチーム内で統一することをお奨めします**
関数は色々な書き方が可能です。  
記述方法がバラバラだと視認性や理解性が低下するので、プロジェクトやチームなどの単位に書き方を統一することをお奨めします。  
過度に省略して書くのが良いとは限らないので、社内の文化、チームの成熟度を加味して方針を決定するのが良いと思います。

:::

## 型ガード関数

型ガード関数は[こちらのコラム](/typescript-intro/introduction-to-typescript-for-java-engineer_other-basic-type/#object（オブジェクト型）)を確認してください。

## オーバーロード

関数の仕様とそれに対する実装の関係のことです。  
JavaScriptにオーバーロードがないため、TypeScriptは1つの関数に異なる関数シグネチャをもつ形で実装します。  
Javaと比較すると特殊に感じる点の1つです。  

```ts: TypeScript
function fnOverload(x: number, y: number): number;
function fnOverload(x: number, y: string): number;
function fnOverload(x: number, y: number | string): number {
  if (typeof y === "number") {
    return x * y;
  }
  return x * 2;
};
```

```java: Javaではどうなるか
interface IOverload {
  int fnOverload(int x, int y);
  int fnOverload(int x, String y);
}
class COverload implements IOverload {
  @Override
  public int fnOverload(int x, int y) {
    return x * y;
  }
  @Override
  public int fnOverload(int x, String y) {
    return x * 2;
  }
}
```

:::info
**TypeScriptとJavaの相違点**
* TypeScript: 1つの関数で、複数の仕様を実装します。
* Java: 仕様ごとに実装を設けます。
:::

## 高階関数

高階関数とは、「引数に関数が含まれる」「戻り値が関数」「左記の両方」のいずれかを満たす関数のことです。  
TypeScriptでは、JavaScript同様高階関数を扱うことができます。  
以降、これらのバリエーションについて確認します。

### 引数に関数を使用する

引数に関数（a）を使用して、関数内でaを実行する処理例を確認します。

```ts: TypeScript
//引数、戻り値ありの関数を引数に使用した例
const fn_yy = (x: number, fn: (y: number) => number) => {
  const ret = fn(x);
  console.log(`fn_yy=${ret}`);
};

//引数あり、戻り値なしの関数を引数に使用した例
const fn_yn = (x: number, fn: (y: number) => void) => {
  fn(x);
};

//引数なし、戻り値ありの関数を引数に使用した例
const fn_ny = (fn: () => number) => {
  const ret = fn();
  console.log(`fn_ny=${ret}`);
};

//引数、戻り値なしの関数を引数に使用した例
const fn_nn = (fn: () => void) => {
  fn();
};

fn_yy(10, (y) => { return y + 1; }); //11
fn_yn(10, (y) => { console.log(`fn_yn=${y + 2}`); }); //12
fn_ny(() => { return 1; }); //1
fn_nn(() => { console.log(`fn_nn=${2}`); }); //2
```

```java: Javaではどうなるか
// 引数、戻り値ありの関数を引数に使用した例 *1
private static void fn_yy(Integer x, Function<Integer, Integer> fn) {
  var ret = fn.apply(x);
  System.out.println("fn_yy=%s".formatted(ret));
}

// 引数あり、戻り値なしの関数を引数に使用した例 *2
private static void fn_yn(Integer x, Consumer<Integer> fn) {
  fn.accept(x);
}

// 引数なし、戻り値ありの関数を引数に使用した例 *3
private static void fn_ny(Supplier<Integer> fn) {
  var ret = fn.get();
  System.out.println("fn_ny=%s".formatted(ret));
}

// 引数、戻り値なしの関数を引数に使用した例 *4
private static void fn_nn(Runnable fn) {
  fn.run();
}

fn_yy(10, (y) -> {return y + 1;});
fn_yn(10, (y) -> {System.out.println("fn_yn=%s".formatted(y + 2));});
fn_ny(() -> {return 1;});
fn_nn(() -> {System.out.println("fn_nn=%s".formatted(2));});
```
Javaは関数（メソッド）が第一級オブジェクトではなく、直接的に引数や戻り値に使用できないため、関数インターフェイスを使用することで同等の処理を表現できます。
* 1: 引数、戻り値ありはFunctionインターフェイスで対応できます。
* 2: 引数あり、戻り値なしはConsumerインターフェイスで対応できます。
* 3: 引数なし、戻り値ありはSupplierインターフェイスで対応できます。
* 4: 引数、戻り値なしはRunnableインターフェイスで対応できます。

### 戻り値に関数を使用する

関数の処理結果として、関数を戻り値として返す処理例を確認します。

```ts: TypeScript
const fnRetFn = (x: number) => {return () => {return x * 3;}};
fnRetFn(2)(); //6
```

```java: Javaではどうなるか
Function<Integer, Integer> fnRetFn = x -> x * 3; //*1
fnRetFn.apply(2); //6
```
* 1: 引数、戻り値ありの関数を返すため、Functionインターフェイスで対応しています。

### 関数をカリー化して使用する

カリー化とは、複数の引数を取る関数を、1つの引数を取る関数を連続して適用する形に変換する応用的な手法です。  

TypeScriptでカリー化を使うメリットは以下のとおりです。
* 部分適用: 関数の引数を一部固定することで、新しい関数を生成できます。
* 関数合成: 複数の関数を組み合わせることで、より複雑な処理を表現できます。
* 遅延評価: 引数が渡されるまで、計算が遅延できます。
* 関数型プログラミングのスタイル: 関数を第一級オブジェクトとして扱う関数型プログラミングのスタイルを取り入れることができます。

メリットが多い反面、デメリットもあるので注意して使用したいところです。
* 可読性の低下: コードが複雑になり、可読性の低下を招く可能性があります。
* 性能の低下: 関数が生成されるたび、クロージャーが生成されるため、性能の低下を招く可能性があります。

```ts: TypeScript
const fnCurry = (x: number) => (y: number) => {return x * y;};
fnCurry(2)(3); //6
```

```java: Javaではどうなるか
Function<Integer, Function<Integer, Integer>> fnCurry = x -> y -> x * y; //*1
fnCurry.apply(2).apply(3); //6
```
* 1: 引数、戻り値ありの関数を返すため、Functionインターフェイスで対応しています。

### JavaScript/TypeScript組み込みの高階関数

JavaScript/TypeScript組み込みの高階関数を使用した例を確認します。
同等のメソッドがJavaでも提供されているため、大きな差はありません。

|関数名|説明|戻り値|
|-----|----|------|
|forEach|配列の各要素に対して、指定された関数を呼び出します。<br/>要素を直接変更することは可能ですが、新しい配列は返しません。|undefined|
|map|配列の各要素に対して指定された関数を呼び出し、その戻り値を要素とする新しい配列を返します。<br/>元の配列は変更されません。|新しい配列|
|filter|配列の要素のうち、指定された条件を満たす要素のみ含む新しい配列を返します。<br/>元の配列は変更されません。|新しい配列|
|reduce|配列の要素を1つずつ処理し、最終的に1つの値にまとめます。|単一の値|
|every|配列の**すべて**の要素が指定された条件を満たすかどうかを判定します。|boolean|
|some|配列の**いずれか**の要素が指定された条件を満たすかどうかを判定します。|boolean|
* map、filterは戻り値が配列なので、メソッドチェーンで組めます。

```ts: TypeScript
const numbers = [1, 2, 3, 4, 5];

// forEach: 各要素を出力
numbers.forEach(number => {
  console.log(number); //1, 2, 3, 4, 5を順に出力
});

// map: 各要素に2を掛けた新しい配列を作成
const doubledNumbers = numbers.map(number => number * 2); //2,4,6,8,10

// filter: 偶数の要素のみを抽出
const evenNumbers = numbers.filter(number => number % 2 === 0); //2,4

// reduce: 全ての要素の合計を計算
const sum = numbers.reduce((total, number) => total + number, 0); //15

// every: 全ての要素が2より大きい
const allGreaterThanTwo = numbers.every(number => number > 2); //false

// some: 偶数の要素が一つでも存在するか
const hasEvenNumber = numbers.some(number => number % 2 === 0); //true

// 高階関数を組み合わせ
const mix = numbers
  .filter(number => number >= 3)
  .map(number => number * 3); //9,12,15
```

```java: Javaではどうなるか
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5); //*1

// forEach
numbers.forEach(number -> System.out.println(number));

// map *2
List<Integer> doubledNumbers = numbers.stream()
    .map(number -> number * 2)
    .collect(Collectors.toList());

// filter *2
List<Integer> evenNumbers = numbers.stream()
    .filter(number -> number % 2 == 0)
    .collect(Collectors.toList());

// reduce
int sum = numbers.stream()
    .reduce(0, Integer::sum);

// every *3
boolean allGreaterThanTwo = numbers.stream()
    .allMatch(number -> number > 2);

// some *3
boolean hasEvenNumber = numbers.stream()
    .anyMatch(number -> number % 2 == 0);

// 高階関数を組み合わせ *2
List<Integer> mix = numbers.stream()
    .filter(number -> number >= 3)
    .map(number -> number * 3)
    .collect(Collectors.toList());
```
* 1: 配列ではなくListを使用しています。
* 2: 戻り値のListを生成するため、collectを併用します。
* 3: allMatchで代替しています。
