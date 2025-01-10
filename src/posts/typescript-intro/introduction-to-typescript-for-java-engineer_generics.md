---
title: Javaエンジニアが始めるTypeScript入門（第9回：ジェネリクス）
author: masato-ubata
date: 2025-01-14
tags: [typescript, java]
image: true
prevPage: ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_object.md
---

## はじめに

今回はジェネリクス（総称型）について説明します。  
ジェネリクスは型をパラメーター化することで、より柔軟で再利用性の高いコードが書ける仕組みです。  
これにより、さまざまなデータ型を扱う同じような処理を簡潔に記述できるため、冗長性を低減できます。型を限定することで型安全性も確保できます。  

## 基本的な動作

基本的な動作を確認します。  
実装の仕方はJavaとほとんど変わりません。  

```ts: TypeScript
// 1. 型パラメーターの設定（型の制限なし）
const fn1 = <T>(arg: T) => {
  if (typeof arg === "number") { //*1-1
    return arg * 2;
  }
  return 0;
}
fn1<number>(1) //2
// fn1<number>("1") //*1-2
fn1(2); //4 *1-3
fn1("1"); //0

// 2. 型パラメーターの設定（型の制限あり）
const fn2 = <T extends number>(arg: T) => {
  return arg * 2; //*2-1
};
fn2(2); //4
// fn2("2"); //*2-2

// 3. 戻り値にも適用
const fn3 = <T extends number>(arg: T): T => {
  // return arg * 2; //*3-1
  return arg * 2 as T;
};
fn3(3); //6

// 4
const fn4 = <T, U>(arg: T) => {
  return 0;
}
fn4(1); //U:unknown *4-1
```
* 1-1: 型が不明なので、処理に合わせて型判定が必要です。
* 1-2: `number`型を明示しているので、引数は`number`型以外設定できません。
* 1-3: 引数の型によって型推論されるため、型パラメーターは`number`として処理されます。
* 2-1: 型パラメーターに指定した型で処理できるため、型判定は不要です。
* 2-2: 引数が`number`型の派生ではないため、エラーになります。
* 3-1: 戻り値に`T`型を指定しているため、処理結果の型と異なるため、型エラーになります。
* 4-1: `T`は引数から型推論されますが、`U`は引数からも推論できないため`unknown`になります。

## 初期型の設定

TypeScriptでは初期値となる型を指定できます。  
Javaには対応する機能はありません。  

```ts: TypeScript
// 初期値となる型の設定
interface Rank {rank: string}
interface CorporateRank extends Rank {corpArg: string}
interface IndividualRank extends Rank {indArg: string}

interface Customer<T = Rank> { id: number, name: string, rank: T }
interface Corporate extends Customer { dateOfEstablishment: string } // T:Rank型　*1-1
interface Individual extends Customer<IndividualRank> { dateOfBirth: string } //T:IndividualRank型

const corporate: Corporate = {id: 1, name: "suzuki", rank: {rank: "A", corpArg: "corp"} as CorporateRank, dateOfEstablishment: "2000-01"} // *1-2
const individual: Individual = {id: 1, name: "suzuki", rank: {rank: "A", indArg: "corp"}, dateOfBirth: "2000-01"}
```
* 1-1: `Corporate`型で型パラメーターを指定していないため、`Customer`で設定している初期型が使用されます。
* 1-2: `Corporate.rank`は`Rank`型として扱われているので、そのまま`corpArg`を使おうとするとエラーになります。エラーを回避するため、コード例では型アサーションを掛けています。

```java: Javaではどうなるのか
// 対応する機能はありません。
```

## ジェネリクスの適用

ジェネリクスは関数、インターフェイスおよびクラスに使用できます。  
実装の仕方はJavaと変わりません。
インターフェイスへの適用は、クラスと変わらないので省略しています。

```ts: TypeScript
/** 商品 */
interface Product {
  id: number;
  name: string;
}
/** 販売商品 */
interface SalesProduct extends Product {
  salesPrice: number;
}
/** 製造商品 */
interface ManufactureProduct extends Product {
  costPrice: number;
}

/** 販売商品の型ガード */
const isSalesProduct = (product: any): product is SalesProduct => {
  return product !== null && typeof product === "object" && typeof product.salesPrice === "number";
}
/** 製造商品の型ガード */
const isManufactureProduct = (product: any): product is ManufactureProduct => {
  return product !== null && typeof product === "object" && typeof product.costPrice === "number";
}
/** 価格計算 *1 */
const calculatePrice = <T extends Product>(product: T) => {
  // 引数の`product`の型に応じて処理を分岐
  if (isManufactureProduct(product)) {
    return product.costPrice
  } else if (isSalesProduct(product)) {
    return (product.salesPrice * 1.1).toFixed(0);
  }
  return 0;
};

/** 契約 *2 */
class Contract<T extends Product> {
  id: number;
  no: string;
  product: T;
  constructor(id: number, no: string, product: T) {
    this.id = id;
    this.no = no;
    this.product = product;
  }
}

const salesProduct: SalesProduct = { id: 1, name: "pen", salesPrice: 100 };
calculatePrice(salesProduct); //110

const manufactureProduct: ManufactureProduct = { id: 1, name: "pen", costPrice: 50 };
calculatePrice(manufactureProduct); //50

let contract: Contract<SalesProduct> = { id: 1, no: "C001", product: { id: 1, name: "item", salesPrice: 100 } }
```
* 1: 関数にジェネリクスを適用した例
* 2: クラスにジェネリクスを適用した例

```java: Javaではどうなるのか
// 実装方法は変わりません。冗長になるため、コードは省略します。
```

## 型パラメーター制限の応用

TypeScriptでは型パラメーターの制限に型だけでなく、属性の有無でも制限できます。

```ts: TypeScript
function getAttribute<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const person = { name: "suzuki", age: 20 };
getAttribute(person, "name"); //suzuki
getAttribute(person, "age"); //20
// ${getAttribute(person, "address")} //*1
```
* 1: `keyof T`で制限しているため、存在しない属性を指定するとエラーになります。
