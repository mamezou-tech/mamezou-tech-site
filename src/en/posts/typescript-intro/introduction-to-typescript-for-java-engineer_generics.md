---
title: 'Introduction to TypeScript for Java Engineers (Part 9: Generics)'
author: masato-ubata
date: 2025-01-14T00:00:00.000Z
tags:
  - typescript
  - java
image: true
prevPage: >-
  ./src/en/posts/typescript-intro/introduction-to-typescript-for-java-engineer_object.md
translate: true

---

## Introduction

This time, we'll explain generics (generic types).  
Generics are a mechanism that allows you to write more flexible and reusable code by parameterizing types.  
By doing this, you can concisely describe similar processing that handles various data types, reducing redundancy. By constraining types, you can also ensure type safety.  

## Basic Operation

Let's check the basic operation.  
Implementation is almost the same as in Java.  

```ts: TypeScript
// 1. Type parameter setting (no type constraint)
const fn1 = <T>(arg: T) => {
  if (typeof arg === "number") { //*1-1
    return arg * 2;
  }
  return 0;
}
fn1<number>(1) //2
// fn1<number>("1") //*1-2
fn1(2); //4 //*1-3
fn1("1"); //0

// 2. Type parameter setting (with type constraint)
const fn2 = <T extends number>(arg: T) => {
  return arg * 2; //*2-1
};
fn2(2); //4
// fn2("2"); //*2-2

// 3. Applied to return value
const fn3 = <T extends number>(arg: T): T => {
  // return arg * 2; //*3-1
  return arg * 2 as T;
};
fn3(3); //6

// 4
const fn4 = <T, U>(arg: T) => {
  return 0;
}
fn4(1); //U:unknown //*4-1
```
* 1-1: Since the type is unknown, type checking is necessary according to the processing.
* 1-2: Since `number` type is explicitly specified, you cannot set arguments of types other than `number`.
* 1-3: The type parameter is inferred as `number` based on the type of the argument.
* 2-1: Type checking is unnecessary because processing can be done with the type specified in the type parameter.
* 2-2: An error occurs because the argument is not a derivative of the `number` type.
* 3-1: A type error occurs because the return type is specified as `T`, which differs from the type of the processing result.
* 4-1: `T` is inferred from the argument, but `U` cannot be inferred even from the argument, so it becomes `unknown`.

## Setting Initial Types

In TypeScript, you can specify default types.  
Java does not have a corresponding feature.  

```ts: TypeScript
// Setting default types
interface Rank {rank: string}
interface CorporateRank extends Rank {corpArg: string}
interface IndividualRank extends Rank {indArg: string}

interface Customer<T = Rank> { id: number, name: string, rank: T }
interface Corporate extends Customer { dateOfEstablishment: string } // T: Rank type   *1-1
interface Individual extends Customer<IndividualRank> { dateOfBirth: string } //T: IndividualRank type

const corporate: Corporate = {id: 1, name: "suzuki", rank: {rank: "A", corpArg: "corp"} as CorporateRank, dateOfEstablishment: "2000-01"} // *1-2
const individual: Individual = {id: 1, name: "suzuki", rank: {rank: "A", indArg: "corp"}, dateOfBirth: "2000-01"}
```
* 1-1: Since the `Corporate` type does not specify a type parameter, the default type set in `Customer` is used.
* 1-2: Because the `rank` of the `Corporate` type is treated as `Rank` type, trying to use `corpArg`, which exists only in `CorporateRank`, without specifying the type parameter will result in an error. In the code example, the type is explicitly specified using type assertion, so it doesn't cause an error.

```java: How does it work in Java?
// There is no corresponding feature.
```

## Application of Generics

Generics can be used in functions, interfaces, and classes.  
Implementation is the same as in Java.  
Application to interfaces is omitted as it is no different from classes.

```ts: TypeScript
/** Product */
interface Product {
  id: number;
  name: string;
}
/** Sales Product */
interface SalesProduct extends Product {
  salesPrice: number;
}
/** Manufactured Product */
interface ManufactureProduct extends Product {
  costPrice: number;
}

/** Type guard for Sales Product */
const isSalesProduct = (product: any): product is SalesProduct => {
  return product !== null && typeof product === "object" && typeof product.salesPrice === "number";
}
/** Type guard for Manufactured Product */
const isManufactureProduct = (product: any): product is ManufactureProduct => {
  return product !== null && typeof product === "object" && typeof product.costPrice === "number";
}
/** Price calculation *1 */
const calculatePrice = <T extends Product>(product: T) => {
  // Branch processing according to the type of the argument `product`
  if (isManufactureProduct(product)) {
    return product.costPrice
  } else if (isSalesProduct(product)) {
    return (product.salesPrice * 1.1).toFixed(0);
  }
  return 0;
};

/** Contract *2 */
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
* 1: Example of applying generics to a function
* 2: Example of applying generics to a class

```java: How does it work in Java?
// The implementation method does not change. It becomes verbose, so the code is omitted.
```

## Application of Type Parameter Constraints

In TypeScript, you can constrain type parameters not only by type but also by the presence or absence of properties.

```ts: TypeScript
function getAttribute<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const person = { name: "suzuki", age: 20 };
getAttribute(person, "name"); //suzuki
getAttribute(person, "age"); //20
// getAttribute(person, "address") //*1
```
* 1: Because `keyof T` is used for constraint, specifying a non-existent property will result in an error.
