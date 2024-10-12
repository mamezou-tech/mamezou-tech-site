---
title: 'Introduction to TypeScript for Java Engineers (Part 7: Functions)'
author: masato-ubata
date: 2024-10-09T00:00:00.000Z
tags:
  - typescript
  - java
image: true
prevPage: >-
  ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_special-type.md
nextPage: >-
  ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_object.md
translate: true

---

## Introduction

This time, we will explain functions.

## Basic Syntax of Functions

The syntax and definition examples of functions are as follows.

```ts: Syntax
/**
 * _Function Name_: The name of the function
 * _Arguments_: (Optional) Set if the function requires arguments. If specifying multiple, separate them with `,`.
 * _Return Type_: (Optional) Set if you want to explicitly specify the return type.
 */
// Function expression
function _functionName_(_arguments_)[: _returnType_] {/** Any process. */}
// Arrow function
const _functionName_ = (_arguments_)[: _returnType_] => {/** Any process. */};
```

```ts: Definition Examples
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
* 1: An example where the return type is omitted by relying on type inference.
* 2: An example where curly braces are omitted because the process is a single statement.
* 3:
  * Optional arguments (`_argumentName_?`) allow undefined. If this argument is omitted, it is treated as undefined.
  * If an initial value is set (`_argumentName_ = _initialValue_`), the initial value is used when the argument is omitted.
* 4: Arguments specified as rest parameters (`..._argumentName_`) become variable-length arguments.
:::check
**It is recommended to unify the way functions are written within a project or team**
Functions can be written in various ways.  
If the writing method is inconsistent, visibility and comprehensibility decrease, so it is recommended to unify the way of writing at the unit of projects or teams.  
Writing in an overly abbreviated manner is not always good, so it is better to decide the policy considering the company's culture and the maturity of the team.

:::

## Type Guard Functions

Please check the [column here](/typescript-intro/introduction-to-typescript-for-java-engineer_other-basic-type/#object（オブジェクト型）) for type guard functions.

## Overload

This refers to the relationship between the specification of a function and its implementation.  
Since JavaScript does not have overload, TypeScript implements it in a way that allows a single function to have different function signatures.  
Compared to Java, this is one of the points that feels special.

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

```java: How it would be in Java
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
**Differences between TypeScript and Java**
* TypeScript: Implements multiple specifications in a single function.
* Java: Provides implementations for each specification.
:::

## Higher-Order Functions

Higher-order functions are functions that satisfy one of the following: "a function is included in the arguments," "the return value is a function," or "both of the above."  
In TypeScript, you can handle higher-order functions just like in JavaScript.  
Let's check these variations below.

### Using a Function as an Argument

Let's check an example of using a function (a) as an argument and executing a within the function.

```ts: TypeScript
// Example of using a function with arguments and return value as an argument
const fn_yy = (x: number, fn: (y: number) => number) => {
  const ret = fn(x);
  console.log(`fn_yy=${ret}`);
};

// Example of using a function with arguments and no return value as an argument
const fn_yn = (x: number, fn: (y: number) => void) => {
  fn(x);
};

// Example of using a function with no arguments and a return value as an argument
const fn_ny = (fn: () => number) => {
  const ret = fn();
  console.log(`fn_ny=${ret}`);
};

// Example of using a function with no arguments and no return value as an argument
const fn_nn = (fn: () => void) => {
  fn();
};

fn_yy(10, (y) => { return y + 1; }); //11
fn_yn(10, (y) => { console.log(`fn_yn=${y + 2}`); }); //12
fn_ny(() => { return 1; }); //1
fn_nn(() => { console.log(`fn_nn=${2}`); }); //2
```

```java: How it would be in Java
// Example of using a function with arguments and return value as an argument *1
private static void fn_yy(Integer x, Function<Integer, Integer> fn) {
  var ret = fn.apply(x);
  System.out.println("fn_yy=%s".formatted(ret));
}

// Example of using a function with arguments and no return value as an argument *2
private static void fn_yn(Integer x, Consumer<Integer> fn) {
  fn.accept(x);
}

// Example of using a function with no arguments and a return value as an argument *3
private static void fn_ny(Supplier<Integer> fn) {
  var ret = fn.get();
  System.out.println("fn_ny=%s".formatted(ret));
}

// Example of using a function with no arguments and no return value as an argument *4
private static void fn_nn(Runnable fn) {
  fn.run();
}

fn_yy(10, (y) -> {return y + 1;});
fn_yn(10, (y) -> {System.out.println("fn_yn=%s".formatted(y + 2));});
fn_ny(() -> {return 1;});
fn_nn(() -> {System.out.println("fn_nn=%s".formatted(2));});
```
Java cannot directly use functions (methods) as first-class objects in arguments and return values, so equivalent processing can be expressed using function interfaces.
* 1: Functions with arguments and return values can be handled with the Function interface.
* 2: Functions with arguments and no return values can be handled with the Consumer interface.
* 3: Functions with no arguments and return values can be handled with the Supplier interface.
* 4: Functions with no arguments and no return values can be handled with the Runnable interface.

### Using a Function as a Return Value

Let's check an example of returning a function as the result of a function's processing.

```ts: TypeScript
const fnRetFn = (x: number) => {return () => {return x * 3;}};
fnRetFn(2)(); //6
```

```java: How it would be in Java
Function<Integer, Integer> fnRetFn = x -> x * 3; //*1
fnRetFn.apply(2); //6
```
* 1: Since it returns a function with arguments and return values, it is handled with the Function interface.

### Using Curried Functions

Currying is an advanced technique of transforming a function that takes multiple arguments into a sequence of functions, each taking a single argument.

The benefits of using currying in TypeScript are as follows:
* Partial application: You can generate a new function by fixing some of the function's arguments.
* Function composition: You can express more complex processing by combining multiple functions.
* Lazy evaluation: Calculation can be delayed until the arguments are provided.
* Functional programming style: You can incorporate the functional programming style of treating functions as first-class objects.

While there are many benefits, there are also drawbacks, so it is important to use it carefully.
* Decreased readability: The code can become complex, leading to decreased readability.
* Decreased performance: As functions are generated, closures are created, which can lead to decreased performance.

```ts: TypeScript
const fnCurry = (x: number) => (y: number) => {return x * y;};
fnCurry(2)(3); //6
```

```java: How it would be in Java
Function<Integer, Function<Integer, Integer>> fnCurry = x -> y -> x * y; //*1
fnCurry.apply(2).apply(3); //6
```
* 1: Since it returns a function with arguments and return values, it is handled with the Function interface.

### Built-in Higher-Order Functions in JavaScript/TypeScript

Let's check examples of using built-in higher-order functions in JavaScript/TypeScript.
Equivalent methods are also provided in Java, so there is not much difference.

| Function Name | Description | Return Value |
|---------------|-------------|--------------|
| forEach | Calls the specified function for each element in the array.<br/>You can modify elements directly, but it does not return a new array. | undefined |
| map | Calls the specified function for each element in the array and returns a new array with the returned values as elements.<br/>The original array is not modified. | New array |
| filter | Returns a new array containing only the elements that satisfy the specified condition.<br/>The original array is not modified. | New array |
| reduce | Processes each element of the array and eventually reduces it to a single value. | Single value |
| every | Determines whether **all** elements of the array satisfy the specified condition. | boolean |
| some | Determines whether **any** element of the array satisfies the specified condition. | boolean |
* Since map and filter return arrays, they can be chained in method chains.

```ts: TypeScript
const numbers = [1, 2, 3, 4, 5];

// forEach: Output each element
numbers.forEach(number => {
  console.log(number); // Outputs 1, 2, 3, 4, 5 in order
});

// map: Create a new array with each element multiplied by 2
const doubledNumbers = numbers.map(number => number * 2); //2,4,6,8,10

// filter: Extract only even elements
const evenNumbers = numbers.filter(number => number % 2 === 0); //2,4

// reduce: Calculate the sum of all elements
const sum = numbers.reduce((total, number) => total + number, 0); //15

// every: All elements are greater than 2
const allGreaterThanTwo = numbers.every(number => number > 2); //false

// some: At least one even element exists
const hasEvenNumber = numbers.some(number => number % 2 === 0); //true

// Combining higher-order functions
const mix = numbers
  .filter(number => number >= 3)
  .map(number => number * 3); //9,12,15
```

```java: How it would be in Java
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

// Combining higher-order functions *2
List<Integer> mix = numbers.stream()
    .filter(number -> number >= 3)
    .map(number -> number * 3)
    .collect(Collectors.toList());
```
* 1: Uses List instead of an array.
* 2: Uses collect to generate the return List.
* 3: Uses allMatch as a substitute.
