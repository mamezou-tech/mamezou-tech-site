---
title: 'Introduction to TypeScript for Java Engineers (Part 2: Variables)'
author: masato-ubata
date: 2024-09-06T00:00:00.000Z
tags:
  - typescript
  - java
prevPage: >-
  ./src/en/posts/typescript-intro/introduction-to-typescript-for-java-engineer_index.md
nextPage: >-
  ./src/en/posts/typescript-intro/introduction-to-typescript-for-java-engineer_primitive-type.md
translate: true

---

## Introduction

This time, we will explain how to declare variables and their characteristics.

| Declaration Method | Scope       | Reassignment | Redeclaration | Remarks |
|--------------------|-------------|--------------|---------------|---------|
| let                | Block scope | Possible     | Not possible  | Used for declaring variables that need reassignment |
| const              | Block scope | Not possible | Not possible  | Used for declaring variables that do not need reassignment, such as constants |
| var                | Function scope | Possible  | Possible      | Generally not used |

## let

Used when declaring variables that need reassignment.
* Has the concept of block scope.

### Variable Declaration

The patterns for variable declaration are as follows:

```ts: Syntax
/**
 * _variableName_: Name of the variable
 * _typeOrPossibleValues_: (Optional)
 *     Specify the type if you want to explicitly state the variable type, or set specific values if you want to limit assignable values.
 *     If specifying multiple, separate them with `|`.
 * _assignedValue_: (Optional) Set an initial value if necessary. Referred to as "right-hand side" in the text.
 */
let _variableName_: _typeOrPossibleValues_ = _assignedValue_;
```
* If "type" is unspecified and "right-hand side" is set (ex. `let x = 10;`)
  * The type is determined by the right-hand side (type inference).
  * Unlike const, it can be reassigned, so it does not become a literal type.
* If both "type" and "right-hand side" are set (ex. `let x: number = 10;`)
  * The type is determined by the specified "type".
  * The right-hand side must be a value consistent with the "type".
* If both "possible values" and "right-hand side" are set (ex. `let x: 10 | 20 | 30 = 10`)
  * The assignable values are determined by the "possible values".
  * The right-hand side must be a value consistent with the "possible values".

```ts: Definition Example
let let01; //*1
let let02: number;
let let03 = 10;
let let04: number = 10;
// Union type
let let0u1: number | null;
let let0u2_1: number | null = 10;
let let0u2_2: number | null | undefined = 10;
// Literal type
let let0l1_1: 10;
let let0l1_2: 10 | 20;
let let0l1_3: 10 | 20 | 30;
let let0l2_1: "red" = "red";
let let0l2_2: "red" | "yellow" = "yellow";
let let0l2_3: "red" | "yellow" | "blue" = "blue";
```
* 1: Becomes type any.

:::info
**Type Annotation**
Refers to explicitly specifying the type statically.
  ```ts
  let x: string;
       ^^^^^^^^
  ```

**Type Inference**
Refers to the mechanism where the type is dynamically determined by inferring from the assigned value or return value.
  ```ts
  let x = "suzuki"; // The right-hand side is a string, so it becomes type string
  const getName = () => {return "suzuki"}; // The return value is a string, so the return type becomes type string
  ```
:::

:::check
**How to Distinguish Between Type Inference and Type Annotation**

It's good to think of it as using Java's `var`. When the type of the right-hand side is obvious at a glance, type inference is the default, and in other cases, it is better to explicitly specify the type with type annotation.

```ts: Cases Where Type Can Be Omitted
let x = 10; // It's obvious that it's number
let x = orders.getCount(orders); // It's easy to guess that it's number
```

```ts: Cases Where Type Should Be Explicitly Stated
let x:number = order.getHoge(); // It's unclear what the return value is
let x: number = orders
  .filter(order => order.price > 10000)
  .map(order => order.price * 0.9)
  .reduce((total, price) => total + price, 0); // You can understand by reading, but it's not immediately obvious
```
:::

### Characteristics of Variables

Let's confirm the characteristics of variables based on code.

```ts: TypeScript 
let let1 = 10;
let1 = 11;
if (true) {
  let let2 = 11;
}
// let2 //*1
let let3: number;

// Array operations
let let4 = [1, 2, 3];
let4.push(4); // [1,2,3,4]
let4[1] = 10; // [1,10,3,4]
```
* 1: Error: Cannot be referenced due to the concept of block scope

```java: How It Works in Java
var let1 = 10;
let1 = 11;
if (true) {
  var let2 = 11;
}
// let2 //*1
int let3;

// Array operations
var let4 = new int[] { 1, 2, 3 };
//*2
var let4_a = new int[let4.length + 1];
System.arraycopy(let4, 0, let4_a, 0, let4.length);
let4_a[let4_a.length - 1] = 4; //[1,2,3,4]
let4_a[1] = 10; //[1,10,3,4]
//*3 Equivalent operations using List
var let4_l = new ArrayList<Integer>();
Collections.addAll(let4_l, 1, 2, 3);
let4_l.add(4); //[1,2,3,4]
let4_l.set(1, 10); //[1,10,3,4]
```
* 1: Error: Cannot be referenced due to the concept of block scope
* 2: Arrays cannot be extended as they are, so a new array must be prepared and copied, etc.
* 3: If the number of elements changes, it's safer to use a List rather than forcibly using an array

## const

Used when declaring variables that do not need reassignment.
* Has the concept of block scope.
* Cannot be reassigned, so assignment is mandatory.

### Variable Declaration

The patterns for variable declaration are as follows:

```ts: Syntax 
/**
 * _variableName_: Name of the variable
 * _typeOrPossibleValues_: (Optional)
 *     Specify the type if you want to explicitly state the variable type, or set specific values if you want to limit assignable values.
 *     If specifying multiple, separate them with `|`.
 * _assignedValue_: Set an initial value. Referred to as "right-hand side" in the text.
 */
const _variableName_: _typeOrPossibleValues_ = _assignedValue_;
```
* If "type" is unspecified and "right-hand side" is set (ex. `const x = 10;`)
  * The type is determined by the right-hand side (type inference).
  * Since it cannot be reassigned, it is inferred as a literal type.
* If both "type" and "right-hand side" are set (ex. `const x: number = 10;`)
  * The type is determined by the specified "type".
  * The right-hand side must be a value consistent with the "type".
* If both "possible values" and "right-hand side" are set (ex. `const x: 10 | 20 | 30 = 10`)
  * The assignable values are determined by the "possible values".
  * The right-hand side must be a value consistent with the "possible values".

```ts: Definition Example 
const const01: number = 10;
const const0u1: number | null = getNo();
const const0u2: number | null | undefined = getNo2();
const const0l1 = 10;
const const0l2: 10 = 10;
const const0l3: "red" | "yellow" | "blue" = getTrafficLight();
```

### Characteristics of Variables

Let's confirm the characteristics of variables based on code.

```ts: TypeScript 
const const1 = 10;
// const1 = 11; //*1
if (true) {
  const const2 = 11;
}
// const2 //*2
const const3: number = getHoge();

// Array operations
const const3 = [1,2,3];
const3.push(4); //[1,2,3,4] *3
const3[1] = 10; //[1,10,3,4] *4
```
* 1: Error: Cannot be reassigned
* 2: Error: Cannot be referenced due to the concept of block scope
* 3: Arrays can be manipulated
* 4: Array elements can be manipulated

```java: How It Works in Java
final var const1 = 10;
// const1 = 11; //*1
if (true) {
  final var const2 = 11;
}
// const2 //*2
final int const3 = getHoge();

// Array operations
final var const4 = new int[] { 1, 2, 3 };
//*3
final var const4_a = new int[const4.length + 1];
System.arraycopy(const4, 0, const4_a, 0, const4.length);
const4_a[const4_a.length - 1] = 4; // [1,2,3,4]
const4_a[1] = 10; // [1,10,3,4]

//*4 Equivalent operations using List
final var const4_l = new ArrayList<Integer>();
Collections.addAll(const4_l, 1, 2, 3);
const4_l.add(4); //[1,2,3,4]
const4_l.set(1, 10); //[1,10,3,4]
```
* 1: Error: Cannot be reassigned
* 2: Error: Cannot be referenced due to the concept of block scope
* 3: Arrays cannot be extended as they are, so a new array must be prepared and copied, etc.
* 3: If the number of elements changes, it's safer to use a List rather than forcibly using an array

## var

Generally not used.
* Function scope (no concept of block scope)
* Can be defined with the same name.

### Characteristics of Variables

Let's confirm the characteristics of variables based on code.

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
* 1: Can be defined with the same name, increasing the potential for bugs
* 2: No concept of block scope, allowing access from outside the block, increasing the potential for bugs
* 3: Error: Type is still enforced, so an error occurs
