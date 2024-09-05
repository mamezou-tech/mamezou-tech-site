---
title: Javaエンジニアが始めるTypeScript入門！Javaとの比較で基礎をマスター（変数）
author: masato-ubata
date: 2024-09-06
tags: [typescript, java]
image: true
---

[記事のトップへ](/blogs/2024/09/06/introduction-to-typescript-for-java-engineer_index)

## はじめに

当ページでは変数の宣言の仕方や特性について説明します。  

|変数の宣言方法|スコープ|再代入|再宣言|備考|
|-----|---|---|---|---|
|let  |ブロックスコープ|可  |不可|再代入が必要な変数の宣言に使用する|
|const|ブロックスコープ|不可|不可|定数など、再代入が不要な変数の宣言に使用する|
|var  |関数スコープ    |可  |可  |基本的に使用しない|

## let

再代入が必要な変数を宣言する際に使用する。
* ブロックスコープの概念を持つ。

### 変数の宣言

変数宣言のパターンは下記の通りです。

```ts: 構文
/**
 * _変数名_　　: 変数の名称
 * _型or採りうる値_:（任意）
 *     変数の型を明示したい場合は型、代入可能な値を限定する場合は特定の値を設定。
 *     複数指定する場合は`|`で区切って指定。
 * _代入する値_:（任意）初期値の設定が必要な場合、設定。文中では"右辺"と表記。
 */
let _変数名_: _型or採りうる値_ = _代入する値_;
```
* 「型」が無指定で、「右辺」が設定されている場合（ex. `let x = 10;`）
  * 右辺によって型が決まる。（型推論）
  * constとは異なり再代入可能なため、リテラル型にはならない。
* 「型」および「右辺」が設定されている場合（ex. `let x: number = 10;`）
  * 指定した「型」によって型が決まる。
  * 右辺は「型」に即した値でなければならない。
* 「採りうる値」および「右辺」が設定されている場合（ex. `let x: 10 | 20 | 30 = 10`）
  * 「採りうる値」によって代入可能な値が決まる。
  * 右辺は「採りうる値」に即した値でなければならない。

```ts: 定義例
let let01; //*1
let let02: number;
let let03 = 10;
let let04: number = 10;
// ユニオン型
let let0u1: number | null;
let let0u2_1: number | null = 10;
let let0u2_2: number | null | undefined = 10;
// リテラル型
let let0l1_1: 10;
let let0l1_2: 10 | 20;
let let0l1_3: 10 | 20 | 30;
let let0l2_1: "red" = "red";
let let0l2_2: "red" | "yellow" = "yellow";
let let0l2_3: "red" | "yellow" | "blue" = "blue";
```
* 1: any型になります。

:::info
**型注釈**
型を明示して、静的に型を指定すること。  
  ```ts
  let x: string;
       ^^^^^^^^
  ```

**型推論**
代入された値や戻り値から型を類推し、型が動的に決まる仕組み。  
  ```ts
  let x = "suzuki"; //右辺が文字列なのでstring型になる
  const getName = () => {return "suzuki"}; //戻り値が文字列なので、戻り値の型はstring型になる
  ```
:::

:::check
**型推論と型注釈はどう使い分けるべきか**

Javaの`var`を使い分けるイメージで考えて頂くのが良いです。
右辺の型が一目でわかる場合は型推論を基本とし、それ以外は型注釈で型を明示する。  

```ts: 型を省略しても良いケース
let x = 10; //numberであることが自明
let x = orders.getCount(orders); //numberだろうと推測しやすい
```

```ts: 型を明示したいケース
let x:number = order.getHoge(); //戻り値が何なのかわからない 
let x: number = orders
  .filter(order => order.price > 10000)
  .map(order => order.price * 0.9)
  .reduce((total, price) => total + price, 0); //読めばわかるが一見してわかるとは言い難い
```
:::

### 変数の特性

変数の特性をコードベースで確認します。  

```ts: TypeScript 
let let1 = 10;
let1 = 11;
if (true) {
  let let2 = 11;
}
// let2 //*1
let let3: number;

//配列の操作
let let4 = [1, 2, 3];
let4.push(4); // [1,2,3,4]
let4[1] = 10; // [1,10,3,4]
```
* 1: エラー：ブロックスコープの概念があるので参照不可

```java: Javaではどうなるか
var let1 = 10;
let1 = 11;
if (true) {
  var let2 = 11;
}
// let2 //*1
long let3;

// 配列の操作
var let4 = new int[] { 1, 2, 3 };
//*2
var let4_a = new int[let4.length + 1];
System.arraycopy(let4, 0, let4_a, 0, let4.length);
let4_a[let4_a.length - 1] = 4;
System.out.println("配列に値を追加%s".formatted(to(let4_a)));
let4_a[1] = 10;
System.out.println("配列[1]を変更してみる%s".formatted(to(let4_a)));
//*3 Listによる同等の操作
var let4_l = new ArrayList<Integer>();
Collections.addAll(let4_l, 1, 2, 3);
let4_l.add(4);
System.out.println("Listに値を追加%s".formatted(to(let4_l)));
let4_l.set(1, 10);
System.out.println("List[1]を変更してみる%s".formatted(to(let4_l)));
```
* 1: エラー：ブロックスコープの概念があるので参照不可
* 3: 配列はそのまま拡張できないので、新たな配列を用意してコピーなどの処理が必要
* 3: 要素数が変動するなら配列を無理やり使うより、Listを使うのが無難

## const

再代入不要な変数を宣言する際に使用する。
* ブロックスコープの概念を持つ。
* 再代入不可なので、代入が必須。

### 変数の宣言

変数宣言のパターンは下記の通りです。

```ts: 構文 
/**
 * _変数名_　　: 変数の名称
 * _型or採りうる値_:（任意）
 *     変数の型を明示したい場合は型、代入可能な値を限定する場合は特定の値を設定。
 *     複数指定する場合は`|`で区切って指定。
 * _代入する値_:初期値を設定。文中では"右辺"と表記。
 */
const _変数名_: _型or採りうる値_ = _代入する値_;
```
* 「型」が無指定で、「右辺」が設定されている場合（ex. `const x = 10;`）
  * 右辺によって型が決まる。（型推論）
  * 再代入不可能なため、リテラル型に推論される。
* 「型」および「右辺」が設定されている場合（ex. `const x: number = 10;`）
  * 指定した「型」によって型が決まる。
  * 右辺は「型」に即した値でなければならない。
* 「採りうる値」および「右辺」が設定されている場合（ex. `const x: 10 | 20 | 30 = 10`）
  * 「採りうる値」によって代入可能な値が決まる。
  * 右辺は「採りうる値」に即した値でなければならない。

```ts: 定義例 
const const01: number = 10;
const const0u1: number | null = getNo();
const const0u2: number | null | undefined = getNo2();
const const0l1 = 10;
const const0l2: 10 = 10;
const const0l3: "red" | "yellow" | "blue" = getTrafficLight();
```

### 変数の特性

変数の特性をコードベースで確認します。  

```ts: TypeScript 
const const1 = 10;
// const1 = 11; //*1
if (true) {
  const const2 = 11;
}
// const2 //*2
const const3: number = getHoge();

//配列の操作
const const3 = [1,2,3];
const3.push(4); //[1,2,3,4] *3
const3[1] = 10; //[1,10,3,4] *4
```
* 1: エラー：再代入不可
* 2: エラー：ブロックスコープの概念があるので参照不可
* 3: 配列を操作できてしまう
* 4: 配列要素を操作できてしまう

```java: javaではどうなるか
final var const1 = 10;
// const1 = 11; //*1
if (true) {
  final var const2 = 11;
}
// const2 //*2
final long const3 = getHoge();

// 配列の操作
final var const4 = new int[] { 1, 2, 3 };
//*3
final var const4_a = new int[const4.length + 1];
System.arraycopy(const4, 0, const4_a, 0, const4.length);
const4_a[const4_a.length - 1] = 4;
System.out.println("配列に値を追加%s".formatted(to(const4_a)));
const4_a[1] = 10;
System.out.println("配列[1]を変更してみる%s".formatted(to(const4_a)));

//*4 Listによる同等の操作
final var const4_l = new ArrayList<Integer>();
Collections.addAll(const4_l, 1, 2, 3);
const4_l.add(4);
System.out.println("Listに値を追加%s".formatted(to(const4_l)));
const4_l.set(1, 10);
System.out.println("List[1]を変更してみる%s".formatted(to(const4_l)));
```
* 1: エラー：再代入不可
* 2: エラー：ブロックスコープの概念があるので参照不可
* 3: 配列はそのまま拡張できないので、新たな配列を用意してコピーなどの処理が必要
* 3: 要素数が変動するなら配列を無理やり使うより、Listを使うのが無難

## var

基本的に使わない。
* 関数スコープ（ブロックスコープの概念はない）
* 同名で定義できてしまう。

### 変数の特性

変数の特性をコードベースで確認します。

```ts 
var var1 = 10;  
var1 = 11;
var var1 = 100; //*1
if (true) {
  var var2 = 11;
}
var2; //*2
// var2 = ""; //*3
```
* 1: 同名で定義できてしまう。
* 2: ブロックスコープの概念がないため、ブロック外からもアクセスできてしまう
* 3: エラー：さすがに型は守られるのでエラー
