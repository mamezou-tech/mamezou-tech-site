---
title: Type-challenges Easy Level Cheat Sheet You Should Know in Advance
author: shohei-yamashita
date: 2024-12-10T00:00:00.000Z
tags:
  - typescript
  - type-challenges
image: true
translate: true

---
# Introduction
## Introduction
type-challenges is a collection of challenges that solve complex type definitions by leveraging TypeScript's type system.
Even if you know the theory and knowledge about TypeScript's types, there may be many who aren't confident in using them effectively.
For those people, type-challenges is an initiative started with the aim of cultivating applied TypeScript skills through problem exercises.
For details, please refer to the GitHub page below.
@[og](https://github.com/type-challenges/type-challenges/blob/main/README.ja.md)

In this article, I will summarize (subjectively and biasedly) the knowledge I wish I had known before tackling the easy level.

## What Will Be Written / Not Written
### What Will Be Written
- Somewhat advanced knowledge necessary to clear the type puzzles (easy level)
  - Distributive Conditional Types
  - Mapped Types
  - infer
- Example problems of type puzzles
### What Will Not Be Written
- Basic content of TypeScript
- Type puzzle problems and their answers (please check them yourself)

## Basics of TypeScript
This article cannot cover the basics of TypeScript. Please also refer to the article by our company's Ubatake-san, [TypeScript Introduction for Java Engineers](https://developer.mamezou-tech.com/frontend/#javaエンジニアが始めるtypescript入門).

## About the Execution Environment
```typescript
TypeScipt: 5.7.2.
Execution Environment: TypeScript: TS Playground
```
Regardless of the version, any execution environment is fine. However, since you can test it in the browser and immediately check for errors, I recommend the Playground.
Link: [TypeScript Playground](https://www.typescriptlang.org/play)

# Cheat Sheet
## Spread syntax
This was also introduced in JavaScript, but the spread syntax (`...`) is a syntax to expand the elements of arrays or objects.
```typescript
// Spread of arrays
const arr1 = [1, 2];
const arr2 = [...arr1, 3, 4]; // [1, 2, 3, 4]
// Spread of objects
const obj1 = { a: 1, b: 2 };
const obj2 = { ...obj1, c: 3 }; // { a: 1, b: 2, c: 3 }
// Can also be used as function arguments
function sum(...numbers: number[]) {
  return numbers.reduce((a, b) => a + b, 0);
}
```
Surprisingly, you can even use it with types (I stumbled from here initially).

## Distributive Conditional Types
If you understand the following example, you can skip this section. What type does the `Test` type become?
```typescript
type IsString<T> = T extends string ? true : false
type Test = IsString<"success" | 200>
```
Distributive Conditional Types can be literally translated as "distributed conditional types".
In TypeScript's reference ([Distributive Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)), it is explained as follows.
> When conditional types act on a generic type, they become *distributive* when given a union type. For example, take the following:

You can interpret this as: when a union type is given to a conditional type, the union type is distributed, resulting in distributive conditional types.
Here's a concrete example.
```typescript
type MyCommon<U, T> = U extends T ? U : never;
type Result2 = MyCommon<'a' | 'b' | 'c', 'a' | 'c' | 'd'> // 'a' | 'c'
```
This `MyCommon` is a type definition that extracts the common parts of two unions as a union.
To understand how this type is functioning, let's replace it with actual values.
```typescript
type MyCommon<U, T> = U extends T ? U : never;
// = ('a' | 'b' | 'c') extends ('a' | 'c' | 'd') ? ('a' | 'b' | 'c') : never
```
Here, since a union type is given to a conditional type, it becomes a distributive conditional type.
Specifically, the following distribution occurs, and it is eventually defined as a union type.
```typescript
type MyCommon<U, T> = U extends T ? U : never;
// = ('a' | 'b' | 'c') extends ('a' | 'c' | 'd') ? ('a' | 'b' | 'c') : never
// ↓
// = 'a' extends ('a' | 'c' | 'd') ? 'a' : never
//   | 'b' extends ('a' | 'c' | 'd') ? 'b' : never
//   | 'c' extends ('a' | 'c' | 'd') ? 'c' : never
// ↓
// = 'a' | never | 'c'
// ↓
// = 'a' | 'c'
```
Based on this rule, the answer to the earlier example would be `boolean`.
```typescript
type IsString<T> = T extends string ? true : false
type test = IsString<"success" | 200>
// IsString<"success" | 200> 
//  = "success" extends string ? true : false | 200 extends string ? true : false 
//  = true | false
//  = boolean
```

## Mapped Types
You can skip this section if you understand the following problem.
Let's create a type called `MySwitch` that swaps keys and values.
```typescript
type ShortToLong =  {
  'q': 'search';
  'n': 'numberOfResults';
}
type TestRecord = { [P : string]: string; } // Record<string, string> is also OK
// type MySwitch<T extends TestRecord> = ?
type LongToShort = MySwitch<ShortToLong>
// Should be {'search': "q", "numberOfResults": "n"}
```
In TypeScript's reference ([Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)), Mapped Types are explained as follows.
> When you don’t want to repeat yourself, sometimes a type needs to be based on another type.

In other words, Mapped Types are used when you want to create a different type from a specific type.

[^1]: In the aforementioned article by our company's Ubatake-san ([article](https://developer.mamezou-tech.com/typescript-intro/introduction-to-typescript-for-java-engineer_special-type/#mapped-type（マッピング型）)), it is also written that you can define "new types from existing types".

On the other hand, in サバイバルTypeScript ([Mapped Types](https://typetypescriptbook.jp/reference/type-reuse/mapped-types)), it is explained that you can generate from a union, implying:
> Mapped Types are mainly used in combination with union types.

In TypeScript's official documentation, Mapped Types are said to enable "creating different types from specific types"[^1].
However, when looking at actual examples, it seems that even when generating from a Type to another Type, they are using union types as an intermediary.
In this article, for the sake of explanation, we'll proceed with the direction of generating different types from union types.
The syntax you should remember is as follows.
```typescript
{ [${arbitrary string} in ${base union type}] : ${type} }
```
This might still be hard to understand, so let's look at some examples.
```typescript
// { [${arbitrary string} in ${base union type}] : ${type} }
type VectorMappedTypes = { [k in ('x' | 'y' | 'z')] : number }
// { 'x': number, 'y': number, 'z': number }
type IdenticalMappedTypesXYZ = { [k in ('x' | 'y' | 'z')] : k }
// { 'x': 'x', 'y': 'y', 'z': 'z' }
type IdenticalMappedTypes<T extends keyof any> = { [k in T] : k }
// Create a type where the keys and values match from a union
type IdenticalMappedTypesXY = IdenticalMappedTypes<'x' | 'y'>
// { 'x': 'x', 'y': 'y' }
type MyPickUnion<T, U extends keyof T>= { [k in U]: T[k] }
// Extract only those keys included in the union from a specific type
type SampleType = { target: "a", other: "b", 23: "c" }
type test = MyPickUnion<SampleType, "other" | "target">
// { target: "a", other: "b" }
```
In all these expressions, the following syntax commonly appears.
```typescript
{ [${arbitrary string} in ${base union type}] : ${type} }
```
By utilizing Mapped Types, the previous example can be derived as follows.
```typescript
type ShortToLong =  {
  'q': 'search';
  'n': 'numberOfResults';
}
type LongToShort = { [k in keyof ShortToLong as ShortToLong[k]]: k }
type TestRecord = { [P : string]: string; } // Record<string, string> is also OK
type MySwitch<T extends TestRecord> = { [k in keyof T as T[k]]: k }
// By using `as T[k]`, overwrite with the value
type LongToShort2 = MySwitch<ShortToLong>
// { 'search': "q", "numberOfResults": "n" }
```

## infer
Personally, the most difficult to understand was `infer`.
If you can solve the following problem, you can skip this section.
```typescript
const fn = (v: boolean) => {
   if (v)
     return "success"
   else
     return "error"
 }
 
 // Find `type MyReturnType`
 
 type ResultString = MyReturnType<typeof fn> 
 // should be "success" | "error"
```
In サバイバルTypeScript ([infer](https://typescriptbook.jp/reference/type-reuse/infer)), it is written as follows.
> `infer` is a type operator used within Conditional Types. `infer` can only be written on the right side of an `extends`.

Honestly, I didn't understand what was being said, but after investigating, I found the following description[^2].

> `infer` is the declaration of a temporary type variable that is determined by type inference.

[^2]: Reference article: [https://zenn.dev/axoloto210/articles/advent-calender-2023-day25](https://zenn.dev/axoloto210/articles/advent-calender-2023-day25)

To understand `infer`, let's look at the following type.
```typescript
type MyPickUnion<T, U extends keyof T>= { [k in U]: T[k] }
type SampleType = { target: "a", other: "b", 23: "c" }
type test = MyPickUnion<SampleType, "other" | "target">
// { target: "a", other: "b" }
```
This appeared in the earlier Mapped Types section, and it's a type that extracts the specific key elements from an already defined type.
As it is, it returns an object.
So, let's create a type that can extract only the values from the key-value pairs. We will name the type `MyPickValue`.
```typescript
type MyPickUnion<T, U extends keyof T>= { [k in U]: T[k] }
type SampleType = { target: "a", other: "b", 23: "c" }
type test = MyPickUnion<SampleType, "other" | "target">
// type MyPickValue = ?
type SampleTypePickedValue = MyPickValue<SampleType>
// Should be "a" | "b"
```
Here, we start from `MyPickUnion`.
As repeatedly mentioned, keep in mind that `infer` is the declaration of a temporary variable.
First, let's replace what we want to make into a temporary variable with `infer R`. The symbol doesn't have to be `R`.
```typescript
// type MyPickUnion<T, U extends keyof T>= { [k in U]: T[k] }
// ↓
// Let's replace what we want to extract with `infer R`
type MyPickValue<T, U extends keyof T>= { [k in U]: infer R }
```
Then, you should get an error like the following.
> 'infer' declarations are only permitted in the 'extends' clause of a conditional type.

In other words, we're told that `infer` is only allowed within conditional types that include `extends`.
First, let's add `extends`. Try rewriting it as follows.
```typescript
// type MyPickUnion<T, U extends keyof T>= { [k in U]: T[k] }
// ↓
// Let's replace what we want to extract with `infer R`
// type MyPickValue<T, U extends keyof T>= { [k in U]: infer R }
// ↓
// Put `T extends` at the front
type MyPickValue<T, U extends keyof T>= T extends { [k in U]: infer R }
```
There's no `?` or `:`, so it's not a conditional type, and an error appears stating that `R` is unused.
> '?' expected.
> 'R' is declared but its value is never read.

Finally, if we adjust the conditional type to return the desired value, it's complete.
```typescript
// type MyPickUnion<T, U extends keyof T>= { [k in U]: T[k] }
// ↓
// Let's replace what we want to extract with `infer R`
// type MyPickValue<T, U extends keyof T>= { [k in U]: infer R }
// ↓
// Put `T extends` at the front
// type MyPickValue<T, U extends keyof T>= T extends { [k in U]: infer R }
// ↓
// Add `?` and `:`, and fix it to return `R`
type MyPickValue<T, U extends keyof T>= T extends { [k in U]: infer R } ? R : never
```
Looking at the final form suddenly might be perplexing, but if you follow the steps up to this point, you might understand.
As long as the syntax is correct, the type inferred by TypeScript should be returned.
The example problem at the beginning of this section can likely be derived following a similar process[^3].
```typescript
// Return the function expression itself and confirm in the generics that there are no errors (optional)
// type MyReturnType<T extends (...args: any[]) => string> = T
// ↓
// Move the function expression outside of the generics, to the right side of `=`
// type MyReturnType<T> = (...args: any[]) => string
// ↓
// Replace what we want to extract (in this case, `string`) with `infer R`
// type MyReturnType<T> = (...args: any[]) => infer R
// ↓
// Make it a conditional type and add missing symbols
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never 
```

[^3]: I'm glossing over it, but getting to an expression you can start from might be the hard part.

I've written at length, but the important points about `infer` are these three:
1. `infer` can only be used within conditional types involving an `extends` clause
2. `infer` is like a temporary variable
3. The type is determined based on type inference

It requires practice, but I'd like to be able to use it effectively.

# Conclusion
This time, I summarized concepts necessary to clear the easy level of type-challenges that are somewhat beyond the basics.
I would be delighted if this article becomes a starting point and inspires more people to challenge type-challenges.
