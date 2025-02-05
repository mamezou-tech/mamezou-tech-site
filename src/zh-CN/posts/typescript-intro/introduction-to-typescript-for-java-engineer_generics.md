---
title: Java工程师入门TypeScript（第9期：泛型）
author: masato-ubata
date: 2025-01-14T00:00:00.000Z
tags:
  - typescript
  - java
image: true
prevPage: >-
  ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_object.md
translate: true

---

## 引言

这次我们来讲解泛型的相关知识。  
泛型通过将类型参数化，使代码更加灵活且具备更高的可复用性。  
通过泛型，可以简洁地描述处理各种数据类型的相似逻辑，从而减少冗余。在限制类型的同时，还可以确保类型安全性。

## 基本用法

首先来看基本用法。  
实现方式与Java几乎相同。  

```ts: TypeScript
// 1. 设置类型参数（无类型限制）
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

// 2. 设置类型参数（有类型限制）
const fn2 = <T extends number>(arg: T) => {
  return arg * 2; //*2-1
};
fn2(2); //4
// fn2("2"); //*2-2

// 3. 应用于返回值
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
* 1-1: 类型未知，因此需要根据处理逻辑进行类型判断。
* 1-2: 明确指定了`number`类型，因此参数不能设置为`number`类型以外的值。
* 1-3: 参数类型会被推断为`number`，类型参数的处理方式也会作为`number`处理。
* 2-1: 由于类型参数的指定，能够直接处理，因此不需要类型判断。
* 2-2: 参数不是`number`类型的派生类型，因此报错。
* 3-1: 返回值被指定为`T`类型，由于处理结果类型不同，因此发生类型错误。
* 4-1: `T`的类型可以从参数中推断，但由于`U`无法从参数中推断，被设置为`unknown`。

## 设置初始类型

在TypeScript中，可以指定初始值类型。  
Java中没有对应的功能。

```ts: TypeScript
// 设置初始值类型
interface Rank {rank: string}
interface CorporateRank extends Rank {corpArg: string}
interface IndividualRank extends Rank {indArg: string}

interface Customer<T = Rank> { id: number, name: string, rank: T }
interface Corporate extends Customer { dateOfEstablishment: string } // T:默认为Rank类型 *1-1
interface Individual extends Customer<IndividualRank> { dateOfBirth: string } //T:IndividualRank类型

const corporate: Corporate = {id: 1, name: "suzuki", rank: {rank: "A", corpArg: "corp"} as CorporateRank, dateOfEstablishment: "2000-01"} // *1-2
const individual: Individual = {id: 1, name: "suzuki", rank: {rank: "A", indArg: "corp"}, dateOfBirth: "2000-01"}
```
* 1-1: 由于`Corporate`类型未指定类型参数，因此会使用`Customer`中设置的初始类型。
* 1-2: `Corporate`类型的`rank`被视为`Rank`类型，如果不指定类型参数而直接使用`CorporateRank`中特有的`corpArg`，则会报错。在代码示例中，通过强制类型声明对类型进行了明确指定，因此不会报错。

```java: Java中的实现
// 没有对应的功能。
```

## 泛型的应用

泛型可以用于函数、接口和类。  
实现方式与Java一致。  
由于接口的应用与类相同，这里省略接口的例子。

```ts: TypeScript
/** 商品 */
interface Product {
  id: number;
  name: string;
}
/** 销售商品 */
interface SalesProduct extends Product {
  salesPrice: number;
}
/** 制造商品 */
interface ManufactureProduct extends Product {
  costPrice: number;
}

/** 销售商品的类型守卫 */
const isSalesProduct = (product: any): product is SalesProduct => {
  return product !== null && typeof product === "object" && typeof product.salesPrice === "number";
}
/** 制造商品的类型守卫 */
const isManufactureProduct = (product: any): product is ManufactureProduct => {
  return product !== null && typeof product === "object" && typeof product.costPrice === "number";
}
/** 价格计算 *1 */
const calculatePrice = <T extends Product>(product: T) => {
  // 根据参数`product`的类型进行处理分支
  if (isManufactureProduct(product)) {
    return product.costPrice
  } else if (isSalesProduct(product)) {
    return (product.salesPrice * 1.1).toFixed(0);
  }
  return 0;
};

/** 合同 *2 */
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
* 1: 将泛型应用于函数的例子
* 2: 将泛型应用于类的例子

```java: Java中的实现
// 实现方式也是相同的。由于会显得繁琐，这里省略代码。
```

## 类型参数限制的扩展

在TypeScript中，类型参数的限制不仅可以基于类型，还可以基于属性的存在与否。

```ts: TypeScript
function getAttribute<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const person = { name: "suzuki", age: 20 };
getAttribute(person, "name"); //suzuki
getAttribute(person, "age"); //20
// ${getAttribute(person, "address")} //*1
```
* 1: 由于通过`keyof T`进行了限制，指定不存在的属性会报错。
