---
title: Javaエンジニアが始めるTypeScript入門（第3回：プリミティブ型）
author: masato-ubata
date: 2024-09-06
tags: [typescript, java]
prevPage: ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_variable.md
nextPage: ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_other-basic-type.md
---

## はじめに

今回は、プリミティブ型について説明します。  

|名称、概要|JavaScript|TypeScript|Java|備考|
|---|---|---|---|---|
|数値（正数、少数）|number|number|int, long, float, double||
|数値（大きな整数）|bigint|bigint|≒BigInteger||
|文字列|string|string|String||
|真偽値|boolean|boolean|boolean||
|シンボル型|symbol|symbol|-||
|null値|any|null|≒null（型としての定義はありません）||
|undefined値|undefined|undefined|≒null（厳密なundefinedの概念はありません）||

※表はTypeScriptの型と**近い型**をマッピングしたものです。

## number（数値型）

64bitの浮動小数点数を扱う型で、整数および浮動小数点が表現できます。

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
let num1: number = 1000;
let num2: number = 1000.5;
let num3: number = .5; //0.5
let num4: number = -1000;
let num5_p: number = Number.POSITIVE_INFINITY; //Infinity 正数の無限大
let num5_n: number = Number.NEGATIVE_INFINITY; //-Infinity 負数の無限大
let num6: number = parseInt("hoge"); //*1
let numInf = 1000; //*2
```
* 1: 例外は発生せずNaNが設定されます
* 2: 型推論によりnumber型と判定されます

```java: Javaではどうなるか
int num1 = 1000;
double num2 = 1000.5;
double num3 = .5;
int num4 = -1000;
double num5_p = Double.POSITIVE_INFINITY;
double num5_n = Double.NEGATIVE_INFINITY;
//int num6 = Long.parseLong("hoge"); //*1
var numInf = 1000;
```
* 1: 同じようなことをするとNumberFormatExceptionがスローされます
* 2: 型推論によりint型と判定されます

## bigint（BigInt型） 

numberよりも大きな**整数**を表すことができる型です。  
代入値は末尾にnを付けて表現します。  
使用する場合は、コンパイラオプションのtargetをes2020以上にする必要があります。（それ以前だとコンパイルエラーになります）
  ```json: tsconfig.json
  {
    "compilerOptions": {
      "target": "ES2023",
    }
  }
  ```

### 型の特性

型の特性をコードベースで確認します。


```ts: TypeScript
let bi1: bigint = 1000n; //1000
let bi2: bigint = BigInt(1001); //1001
let bi3: bigint = BigInt("1002"); //1002
let bi4: bigint = -1000n; //-1000
// let bi5: bigint = -1.1n; //少数なのでエラー
let biInf = 1003n; //*1
```
* 1: 型推論によりnumber型と判定されます

```java: Javaではどうなるか
// BigInteger bi1 = 1000;
BigInteger bi2 = BigInteger.valueOf(1001);
BigInteger bi3 = BigInteger.valueOf(Long.valueOf("1002"));
BigInteger bi4 = BigInteger.valueOf(-1000);
// let bi5: bigint = -1.1n; //少数なのでエラー
var biInf = BigInteger.valueOf(1003);
```
* 1: 型推論によりBigInteger型と判定されます

## string（文字列型）

文字列を扱う型です。

### 型の特性

型の特性をコードベースで確認します。


```ts: TypeScript
let str1: string = "hoge";
let strInf = "fuga"; //*1
```
* 1: 型推論によりstring型と判定されます

```java: Javaではどうなるか
String str1 = "hoge";
var strInf = "fuga"; //*1
```
* 1: 型推論によりString型と判定されます

## boolean（真偽値型）

真（true）, 偽（false）を扱う型です。

### 型の特性

型の特性をコードベースで確認します。


```ts: TypeScript
let bool1: boolean = true;
let boolInf = false;//*1
```
* 1: 型推論によりboolean型と判定されます

```java: Javaではどうなるか
boolean bool1 = true;
var boolInf = false; //*1
```
* 1: 型推論によりboolean型と判定されます

## symbol（シンボル型）

ユニークな値を生成する型です。

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
let symbol1: symbol = Symbol(); //description=undefined
let symbol2: symbol = Symbol("sym-value"); //description=sym-value
let symbol3: symbol = Symbol(); //symbol1==symbol3:false, symbol1===symbol3:false *1
let obj1 = { [symbol1]: "value1", symbol2: "value2" }; //obj1[symbol1]=value1, obj1.symbol2=value2
let symbolInf = Symbol(); //*2
```
* 1: 個々にユニークなので一致しません
* 2: 型推論によりsymbol型と判定されます

```java: Javaではどうなるか
// 対応する型はありません。  
```
同じようなことを表現するには独自の仕組みを作る必要があります。

## null

値の欠如を示す型です。

### 型の特性

型の特性をコードベースで確認します。


```ts: TypeScript
let null1: null = null;
let nullInf = null; //*1
```
* 1: 型推論によりnull型と判定されます。

```java: Javaではどうなるか
// null値は存在しますが、null型はありません。

interface BaseCustomType {}
static class CustomType implements BaseCustomType {}
static class CustomTypeNullObject implements BaseCustomType {}

Optional<String> null1 = Optional.empty();
var nullInf = new CustomTypeNullObject();
```
OptionalやNullObjectパターンなどを使えば同じようなことは表現できます。  

## undefined

未定義の状態を示す型です。

### 型の特性

型の特性をコードベースで確認します。

```ts: TypeScript
let undef1; //undefined *1
let undef2: undefined; //undefined
let undef3 = undefined; //undefined *1
```
* 1: 型推論によりundefined型と判定されます

```java: Javaではどうなるか
// 厳密なundefinedの概念はありません。  
```
NullObjectパターンなどを使えば同じようなことは表現できます。  
実装例はNullと変わらないので省略します。
