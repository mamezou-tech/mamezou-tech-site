---
title: 'Introduction to TypeScript for Java Engineers (Part 3: Primitive Types)'
author: masato-ubata
date: 2024-09-06T00:00:00.000Z
tags:
  - typescript
  - java
prevPage: ./src/en/posts/typescript-intro/introduction-to-typescript-for-java-engineer_variable.md
nextPage: ./src/en/posts/typescript-intro/introduction-to-typescript-for-java-engineer_other-basic-type.md
translate: true
---

## Introduction

This time, we will explain primitive types.

|Name, Overview|JavaScript|TypeScript|Java|Remarks|
|---|---|---|---|---|
|Numbers (integers, decimals)|number|number|int, long, float, double||
|Numbers (large integers)|bigint|bigint|≒BigInteger||
|Strings|string|string|String||
|Boolean values|boolean|boolean|boolean||
|Symbol type|symbol|symbol|-||
|Null value|any|null|≒null (no definition as a type)||
|Undefined value|undefined|undefined|≒null (no strict concept of undefined)||

* The table maps TypeScript types to **similar types**.

## number (Numeric Type)

A type that handles 64-bit floating-point numbers, capable of representing both integers and floating points.

### Characteristics of the Type

Let's confirm the characteristics of the type through code.

```ts: TypeScript
let num1: number = 1000;
let num2: number = 1000.5;
let num3: number = .5; //0.5
let num4: number = -1000;
let num5_p: number = Number.POSITIVE_INFINITY; //Infinity positive infinity
let num5_n: number = Number.NEGATIVE_INFINITY; //-Infinity negative infinity
let num6: number = parseInt("hoge"); //*1
let numInf = 1000; //*2
```
* 1: NaN is set without throwing an exception
* 2: Determined to be of type number by type inference

```java: How it works in Java
int num1 = 1000;
double num2 = 1000.5;
double num3 = .5;
int num4 = -1000;
double num5_p = Double.POSITIVE_INFINITY;
double num5_n = Double.NEGATIVE_INFINITY;
//int num6 = Long.parseLong("hoge"); //*1
var numInf = 1000;
```
* 1: Doing similar results in a NumberFormatException being thrown
* 2: Determined to be of type int by type inference

## bigint (BigInt Type)

A type that can represent **integers** larger than those handled by number.  
The assigned value is expressed by appending n to the end.  
When using it, the compiler option target must be set to es2020 or higher. (Otherwise, it will result in a compilation error)
  ```json: tsconfig.json
  {
    "compilerOptions": {
      "target": "ES2023",
    }
  }
  ```

### Characteristics of the Type

Let's confirm the characteristics of the type through code.

```ts: TypeScript
let bi1: bigint = 1000n; //1000
let bi2: bigint = BigInt(1001); //1001
let bi3: bigint = BigInt("1002"); //1002
let bi4: bigint = -1000n; //-1000
// let bi5: bigint = -1.1n; //Error because it's a decimal
let biInf = 1003n; //*1
```
* 1: Determined to be of type number by type inference

```java: How it works in Java
// BigInteger bi1 = 1000;
BigInteger bi2 = BigInteger.valueOf(1001);
BigInteger bi3 = BigInteger.valueOf(Long.valueOf("1002"));
BigInteger bi4 = BigInteger.valueOf(-1000);
// let bi5: bigint = -1.1n; //Error because it's a decimal
var biInf = BigInteger.valueOf(1003);
```
* 1: Determined to be of type BigInteger by type inference

## string (String Type)

A type that handles strings.

### Characteristics of the Type

Let's confirm the characteristics of the type through code.

```ts: TypeScript
let str1: string = "hoge";
let strInf = "fuga"; //*1
```
* 1: Determined to be of type string by type inference

```java: How it works in Java
String str1 = "hoge";
var strInf = "fuga"; //*1
```
* 1: Determined to be of type String by type inference

## boolean (Boolean Type)

A type that handles true and false.

### Characteristics of the Type

Let's confirm the characteristics of the type through code.

```ts: TypeScript
let bool1: boolean = true;
let boolInf = false;//*1
```
* 1: Determined to be of type boolean by type inference

```java: How it works in Java
boolean bool1 = true;
var boolInf = false; //*1
```
* 1: Determined to be of type boolean by type inference

## symbol (Symbol Type)

A type that generates unique values.

### Characteristics of the Type

Let's confirm the characteristics of the type through code.

```ts: TypeScript
let symbol1: symbol = Symbol(); //description=undefined
let symbol2: symbol = Symbol("sym-value"); //description=sym-value
let symbol3: symbol = Symbol(); //symbol1==symbol3:false, symbol1===symbol3:false *1
let obj1 = { [symbol1]: "value1", symbol2: "value2" }; //obj1[symbol1]=value1, obj1.symbol2=value2
let symbolInf = Symbol(); //*2
```
* 1: They do not match because each is unique
* 2: Determined to be of type symbol by type inference

```java: How it works in Java
// There is no corresponding type.
```
To express something similar, you need to create your own mechanism.

## null

A type that indicates the absence of a value.

### Characteristics of the Type

Let's confirm the characteristics of the type through code.

```ts: TypeScript
let null1: null = null;
let nullInf = null; //*1
```
* 1: Determined to be of type null by type inference.

```java: How it works in Java
// Null values exist, but there is no null type.

interface BaseCustomType {}
static class CustomType implements BaseCustomType {}
static class CustomTypeNullObject implements BaseCustomType {}

Optional<String> null1 = Optional.empty();
var nullInf = new CustomTypeNullObject();
```
Using Optional or the Null Object pattern can express something similar.

## undefined

A type that indicates an undefined state.

### Characteristics of the Type

Let's confirm the characteristics of the type through code.

```ts: TypeScript
let undef1; //undefined *1
let undef2: undefined; //undefined
let undef3 = undefined; //undefined *1
```
* 1: Determined to be of type undefined by type inference

```java: How it works in Java
// There is no strict concept of undefined.
```
Using the Null Object pattern can express something similar.  
The implementation example is the same as for Null, so it is omitted.
