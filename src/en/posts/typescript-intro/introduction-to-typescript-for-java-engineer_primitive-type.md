---
title: 'Introduction to TypeScript for Java Engineers (Part 3: Primitive Types)'
author: masato-ubata
date: 2024-09-06T00:00:00.000Z
tags:
  - typescript
  - java
prevPage: >-
  ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_variable.md
translate: true

---

## Introduction

This time, we will explain primitive types.

|Name, Overview|JavaScript|TypeScript|Java|Notes|
|---|---|---|---|---|
|Numbers (integers, decimals)|number|number|int, long, float, double||
|Numbers (large integers)|bigint|bigint|≒BigInteger||
|Strings|string|string|String||
|Booleans|boolean|boolean|boolean||
|Symbol type|symbol|symbol|-||
|Null value|any|null|≒null (not defined as a type)||
|Undefined value|undefined|undefined|≒null (no strict concept of undefined)||

※The table maps TypeScript types to **similar types**.

## number (Numeric Type)

A type that handles 64-bit floating-point numbers, capable of representing integers and floating-point numbers.

### Characteristics of the Type

Let's check the characteristics of the type in a code-based manner.

```ts: TypeScript
let num1: number = 1000;
let num2: number = 1000.5;
let num3: number = .5; //0.5
let num4: number = -1000;
let num5_p: number = Number.POSITIVE_INFINITY; //Infinity Positive infinity
let num5_n: number = Number.NEGATIVE_INFINITY; //-Infinity Negative infinity
let num6: number = parseInt("hoge"); //*1
let numInf = 1000; //*2
```
* 1: No exception occurs, NaN is set
* 2: Inferred as number type by type inference

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
* 1: Doing something similar throws a NumberFormatException
* 2: Inferred as int type by type inference

## bigint (BigInt Type)

A type that can represent **integers** larger than number.  
The assigned value is expressed with an 'n' at the end.  
When using it, you need to set the compiler option target to es2020 or higher. (It will cause a compile error if earlier)

```json: tsconfig.json
{
  "compilerOptions": {
    "target": "ES2023",
  }
}
```

### Characteristics of the Type

Let's check the characteristics of the type in a code-based manner.

```ts: TypeScript
let bi1: bigint = 1000n; //1000
let bi2: bigint = BigInt(1001); //1001
let bi3: bigint = BigInt("1002"); //1002
let bi4: bigint = -1000n; //-1000
// let bi5: bigint = -1.1n; //Error because it's a decimal
let biInf = 1003n; //*1
```
* 1: Inferred as number type by type inference

```java: How it works in Java
// BigInteger bi1 = 1000;
BigInteger bi2 = BigInteger.valueOf(1001);
BigInteger bi3 = BigInteger.valueOf(Long.valueOf("1002"));
BigInteger bi4 = BigInteger.valueOf(-1000);
// let bi5: bigint = -1.1n; //Error because it's a decimal
var biInf = BigInteger.valueOf(1003);
```
* 1: Inferred as BigInteger type by type inference

## string (String Type)

A type that handles strings.

### Characteristics of the Type

Let's check the characteristics of the type in a code-based manner.

```ts: TypeScript
let str1: string = "hoge";
let strInf = "fuga"; //*1
```
* 1: Inferred as string type by type inference

```java: How it works in Java
String str1 = "hoge";
var strInf = "fuga"; //*1
```
* 1: Inferred as String type by type inference

## boolean (Boolean Type)

A type that handles true and false.

### Characteristics of the Type

Let's check the characteristics of the type in a code-based manner.

```ts: TypeScript
let bool1: boolean = true;
let boolInf = false;//*1
```
* 1: Inferred as boolean type by type inference

```java: How it works in Java
boolean bool1 = true;
var boolInf = false; //*1
```
* 1: Inferred as boolean type by type inference

## symbol (Symbol Type)

A type that generates unique values.

### Characteristics of the Type

Let's check the characteristics of the type in a code-based manner.

```ts: TypeScript
let symbol1: symbol = Symbol(); //description=undefined
let symbol2: symbol = Symbol("sym-value"); //description=sym-value
let symbol3: symbol = Symbol(); //symbol1==symbol3:false, symbol1===symbol3:false *1
let obj1 = { [symbol1]: "value1", symbol2: "value2" }; //obj1[symbol1]=value1, obj1.symbol2=value2
let symbolInf = Symbol(); //*2
```
* 1: They do not match as they are uniquely individual
* 2: Inferred as symbol type by type inference

```java: How it works in Java
// There is no corresponding type.  
```
To express something similar, you need to create your own mechanism.

## null

A type that indicates the absence of a value.

### Characteristics of the Type

Let's check the characteristics of the type in a code-based manner.

```ts: TypeScript
let null1: null = null;
let nullInf = null; //*1
```
* 1: Inferred as null type by type inference.

```java: How it works in Java
// Null values exist, but there is no null type.

interface BaseCustomType {}
static class CustomType implements BaseCustomType {}
static class CustomTypeNullObject implements BaseCustomType {}

Optional<String> null1 = Optional.empty();
var nullInf = new CustomTypeNullObject();
```
Using Optional or NullObject patterns can express something similar.

## undefined

A type that indicates an undefined state.

### Characteristics of the Type

Let's check the characteristics of the type in a code-based manner.

```ts: TypeScript
let undef1; //undefined *1
let undef2: undefined; //undefined
let undef3 = undefined; //undefined *1
```
* 1: Inferred as undefined type by type inference

```java: How it works in Java
// There is no strict concept of undefined.  
```
Using NullObject patterns can express something similar.  
The implementation example is the same as Null, so it is omitted.
