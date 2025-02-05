---
title: 事先需了解的 type-challenges 初级备忘单
author: shohei-yamashita
date: 2024-12-10T00:00:00.000Z
tags:
  - typescript
  - type-challenges
image: true
translate: true

---

# 引言
## 前言
type-challenges 是一系列通过利用 TypeScript 的类型系统来解决复杂类型定义的挑战集。  
即使了解 TypeScript 的类型理论和知识，许多人可能还是对将其熟练应用没有信心。  
为了帮助这些人通过练习题培养对 TypeScript 的应用能力，type-challenges 应运而生。  
详情请参考以下 Github 页面。  
@[og](https://github.com/type-challenges/type-challenges/blob/main/README.ja.md)

本文将总结笔者在接触初级（easy）问题之前希望了解到的知识（主观选择）。

## 内容/不涉及内容
### 内容
- 为突破初级问题所需的稍微进阶的知识：
  - 分布式条件类型 (Distributive Conditional Types)
  - 映射类型 (Mapped Types)
  - infer
- 类型问题的示例

### 不涉及内容
- TypeScript 的基础内容
- 类型挑战的具体问题及解答（请亲自查看）

## TypeScript 的基础
TypeScript 的基础不在本文覆盖范围内。请参考我们公司宇畑氏的文章：[Java 工程师开始的 TypeScript 入门](https://developer.mamezou-tech.com/frontend/#javaエンジニアが始めるtypescript入門)。

## 执行环境
```typescript
TypeScipt: 5.7.2.
执行环境: TypeScript: TS Playground
```
版本无所谓，执行环境可以是任意的。不过，建议使用能直接在浏览器中验证并能即时确认错误的 Playground。  
链接：[TypeScript Playground](https://www.typescriptlang.org/play)

# 备忘单
## 展开语法（Spread syntax）
这是在 JavaScript 中也已引入的语法，展开语法（...）可用于展开数组和对象的元素。
```typescript
// 数组展开
const arr1 = [1, 2];
const arr2 = [...arr1, 3, 4]; // [1, 2, 3, 4]
// 对象展开
const obj1 = { a: 1, b: 2 };
const obj2 = { ...obj1, c: 3 }; // { a: 1, b: 2, c: 3 }
// 也可以用作函数的参数
function sum(...numbers: number[]) {
  return numbers.reduce((a, b) => a + b, 0);
}
```
更令人惊讶的是，它也可以用于类型（我正是因为这个卡住了）。

## 分布式条件类型（Distributive Conditional Types）
如果以下例子你能理解，可以直接跳过。Test 类型会是什么类型？
```typescript
type IsString<T> = T extends string ? true : false;
type Test = IsString<"success" | 200>;
```
分布式条件类型（Distributive Conditional Types）的直译可为 "分配的条件类型"。  
在 TypeScript 的文档（[Distributive Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)）中有以下描述：
> 当条件类型作用于泛型类型时，若类型是联合类型（union type），即变为分布式（distributive）。例如：
  
可以解读为，当给条件类型提供一个联合类型时，该联合类型会被分配，从而变为分布式条件类型。请参见以下具体示例：
```typescript
type MyCommon<U, T> = U extends T ? U : never;
type Result2 = MyCommon<'a' | 'b' | 'c', 'a' | 'c' | 'd'> // 'a' | 'c'
```
此 MyCommon 是从两个联合类型中提取它们的公共部分并以联合形式表示的类型定义。  
为了确认该类型的实现原理，我们可以尝试用实际值替换其中的变量。
```typescript
type MyCommon<U, T> = U extends T ? U : never;
// = ('a' | 'b' | 'c') extends ('a' | 'c' | 'd') ? ('a' | 'b' | 'c') : never
```
由于给条件类型传递了联合类型，因此会应用分布式条件类型。其过程如下，最终结果会为一个联合类型：
```typescript
type MyCommon<U, T> = U extends T ? U : never;
// = ('a' | 'b' | 'c') extends ('a' | 'c' | 'd') ? ('a' | 'b' | 'c') : never
// ↓
// ='a' extends ('a' | 'c' | 'd') ? 'a' : never   
// 　| 'b' extends ('a' | 'c' | 'd') ? 'b' : never 
// 　| 'c' extends ('a' | 'c' | 'd') ? 'c' : never
// ↓
// = 'a' | never | 'c'
// ↓
// = 'a' | 'c'
```
根据这个规则，上述问题的答案为 boolean：
```typescript
type IsString<T> = T extends string ? true : false;
type Test = IsString<"success" | 200>;
// IsString<"success" | 200> 
//  = ("success" | 200 ) extends ? true : false
//  = "success" extends ? true : false | 200 extends ? true : false 
//  = true | false
//  = boolean
```

## 映射类型（Mapped Types）
如果能理解以下问题，可以直接跳过。让我们定义一个可以交换键和值的类型 MySwitch。
```typescript
type ShortToLong = {
  'q': 'search';
  'n': 'numberOfResults';
}
type TestRecord = { [P: string]: string; } // Record<string, string> 也可以
// type MySwitch<T extends TestRecord> = ?
type LongToShort = MySwitch<ShortToLong>
// 应为 {'search': "q", "numberOfResults": "n"}
```
在 TypeScript 的文档（[Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)）中，关于映射类型有如下描述：
> 当你不想重复定义时，某些类型需要基于其他类型进行定义。

也就是说，映射类型是一种通过现有类型创建新类型的方法。

[^1]: 前述我们公司宇畑氏的[文章](https://developer.mamezou-tech.com/typescript-intro/introduction-to-typescript-for-java-engineer_special-type/#mapped-type%EF%BC%88%E3%83%9E%E3%83%83%E3%83%94%E3%83%B3%E3%82%B0%E5%9E%8B%EF%BC%89)也写到，可以定义基于“已有类型”的“新类型”。

另一方面，“生存 TypeScript”（[Mapped Types](https://typetypescriptbook.jp/reference/type-reuse/mapped-types)）描述到：
> 映射类型主要结合联合类型（union type）使用。

TypeScript 官方文档认为“映射类型是为特定类型创建其它类型的方法”[^1]。  
但通过实际示例来看，这种类型生成通常会通过联合类型中介完成。

在本文中，将基于联合类型创建其它类型作为切入点进行说明。需要牢记的语法如下：
```typescript
{[${任意字符串} in ${作为基准的联合类型}] : ${类型}}
```
仅这样可能有些抽象，以下是一些具体示例：
```typescript
// {[${任意字符串} in ${作为基准的联合类型}] : ${类型}}
type VectorMappedTypes = {[k in ('x' | 'y' | 'z')] : number}
// {'x': number, 'y': number, 'z': number}
type IdenticalMappedTypesXYZ = {[k in ('x' | 'y' | 'z')] : k}
// {'x': 'x', 'y': 'y', 'z': 'z'}
type IdenticalMappedTypes<T extends keyof any> = {[k in T] : k}
// 从联合类型创建键值相同的类型
type IdenticalMappedTypesXY = IdenticalMappedTypes<'x' | 'y'>
// {'x': 'x', 'y': 'y'}
type MyPickUnion<T, U extends keyof T> = {[k in U]: T[k]}
// 从特定类型中仅提取键在联合类型中的那部分
type SampleType = {target: "a", other:"b", 23: "c"}
type test = MyPickUnion<SampleType, "other" | "target">
// {target: "a", other:"b"}
```
上述记法中，以下的共通结构会频繁出现：
```typescript
{[${任意字符串} in ${作为基准的联合类型}] : ${类型}}
```
利用映射类型，我们的例题可以按如下方式设计：
```typescript
type ShortToLong = {
  'q': 'search';
  'n': 'numberOfResults';
}
type LongToShort = { [k in keyof ShortToLong as ShortToLong[k]]: k }
type TestRecord = { [P: string]: string; } // Record<string, string> 也可以
type MySwitch<T extends TestRecord> = {[k in keyof T as T[k]]: k}
// 使用 as T[k] 覆盖值
type LongToShort2 = MySwitch<ShortToLong>
// {'search': "q", "numberOfResults": "n"}
```

## infer
让我个人最难理解的即是 infer。  
如果可以回答以下问题，可以直接跳过。
```typescript
const fn = (v: boolean) => {
   if (v)
     return "success"
   else
     return "error"
 }
 
 // 求 type MyReturnType
 
 type ResultString = MyReturnType<typeof fn> 
 // 应为 "success" | "error"
```
在 “生存 TypeScript”（[infer](https://typescriptbook.jp/reference/type-reuse/infer)）中，infer 是这样描述的：
> infer 是一种类型操作符，仅能在条件类型的 extends 右侧中使用。`infer` 的含义是“推断”。

这段话初看不易理解，但查阅了不同资料后发现了一些说法[^2]：
> infer 是通过类型推断决定的一种临时类型变量。

[^2]: 参考： [https://zenn.dev/axoloto210/articles/advent-calender-2023-day25](https://zenn.dev/axoloto210/articles/advent-calender-2023-day25)

为了理解 infer，来看以下类型。
```typescript
type MyPickUnion<T, U extends keyof T>= {[k in U]: T[k]}
type SampleType = {target: "a", other:"b", 23: "c"}
type test = MyPickUnion<SampleType, "other" | "target">
// {target: "a", other:"b"}
```
这是一个从已定义类型中抽取特定键所对应部分的例子，在上一节的映射类型中我们已有介绍。  
但目前返回的是对象。假如我们想仅提取值的部分，可以定义如下目标类型 MyPickValue。
```typescript
type MyPickUnion<T, U extends keyof T>= {[k in U]: T[k]}
type SampleType = {target: "a", other:"b", 23: "c"}
type test = MyPickUnion<SampleType, "other" | "target"}
// type MyPickValue = ?
type SampleTypePickedValue = MyPickValue<SampleType>
// 应为 "a" | "b"
```
以 MyPickUnion 为起点，我们需要牢记 infer 是一个用于声明的临时变量。  
首先将目标变量替换成 infer R。
```typescript
// type MyPickUnion<T, U extends keyof T>= {[k in U]: T[k]}
// ↓
// 将需要提取的部分设为 infer R
type MyPickValue<T, U extends keyof T>= {[k in U]: infer R}
```
此时，可能会出现以下报错：
> 'infer' declarations are only permitted in the 'extends' clause of a conditional type.

也就是说，infer 只能在带有 extends 的条件类型中使用。接下来添加 extends：
```typescript
// type MyPickUnion<T, U extends keyof T>= {[k in U]: T[k]}
// ↓
// 将需要提取的部分设为 infer R
// type MyPickValue<T, U extends keyof T>= {[k in U]: infer R}
// ↓
// 将 T 更改为 extends 条件类型
type MyPickValue<T, U extends keyof T>= T extends {[k in U]: infer R}
```
目前，条件表达式缺少 ? 和 :，且 R 未使用，其它报错如下：
> '?' expected.
> 'R' is declared but its value is never read.

接下来整合语法，最终形态如下：
```typescript
// type MyPickUnion<T, U extends keyof T>= {[k in U]: T[k]}
// ↓
// 将需要提取的部分设为 infer R
// type MyPickValue<T, U extends keyof T>= {[k in U]: infer R}
// ↓
// 将 T 更改为 extends 条件类型
// type MyPickValue<T, U extends keyof T>= T extends {[k in U]: infer R}
// ↓
// ???? 补充条件型的 ? 和 :，并返回 R
type MyPickValue<T, U extends keyof T>= T extends {[k in U]: infer R} ? R : never
```
最终写法长这样，使用 TS 会推断出正确结果。至于开头的函数式问题，可以用类似步骤解析：
```typescript
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never 
```

总结3个 infer 核心事项：
1. infer 仅适用于伴随 extends 的条件类型；
2. infer 可充当临时变量；
3. 此变量由推断决定。

---

# 总结
本文整理了 type-challenges 初级问题所需的一些类型运算和概念，希望对初学者有所帮助！
