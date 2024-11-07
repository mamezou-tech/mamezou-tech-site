---
title: 'Introduction to TypeScript for Java Engineers (Part 4: Other Basic Types)'
author: masato-ubata
date: 2024-09-11T00:00:00.000Z
tags:
  - typescript
  - java
prevPage: ./src/en/posts/typescript-intro/introduction-to-typescript-for-java-engineer_primitive-type.md
nextPage: ./src/en/posts/typescript-intro/introduction-to-typescript-for-java-engineer_collection-type.md
image: true
translate: true
---

## Introduction

This time, we will explain other basic types used for variables, arguments, return values, etc.

|Name, Overview|JavaScript|TypeScript|Java|Remarks|
|---|---|---|---|---|
|Any type|any|any|≒Object||
|Object|object|object|≒Object||
|Unknown type|≒object|unknown|≒Object||
|Function returns nothing|void|void|void||
|Type of values that never return|-|never|-||
|Enumeration type|≒function+array|enum|enum|Do not use if strict type safety is required|

※The table maps TypeScript types to **similar types**.

## any (Any Type)

A type to which any value can be assigned.  
Since type checking is not effective, it undermines the strength of statically typed languages, so its use should be limited.  
It might be used when you want to try something tentatively, or when you need to interact with an external library whose type is unknown.
* Any value can be assigned.
* Conversely, it can be assigned to any type.
* You can access properties and functions.
* Since type checking is not effective, you can set values of different types.

### Characteristics of the Type

Let's check the characteristics of the type through code.

```ts: TypeScript
// Directly manipulating any
let any1_1: any = { id: 1, name: "suzuki", fn: (): string => { return "hoge"; } };
any1_1.id; //*1
any1_1.fn();
any1_1.id = 2; //{ id: 2, name: "suzuki" }
any1_1.id = "hoge";  //Updated with a different type *2

// Manipulating any with type assertion
let any1_2: any = { id: 1, name: "suzuki", fn: (): string => { return "hoge"; } };
(any1_2 as { id: number }).id; //*3

// Manipulating any with a specific type using type guards
const isPerson = (obj: any): obj is Person => {
  return obj instanceof Person;
};
let any2: any = new Person(1, "suzuki");
if (isPerson(any2)) { //*4
  any2.id;
  any2.fn();
  any2.id = 2;
} else if (typeof any2 === "string") {
  any2.length;
}

// Assigning any to a variable with a specified type
let any3_1: number = 1;
let any3_2: any = "hoge";
any3_1 = any3_2; //any3_1=hoge, typeof any3_1=string *5

// Assigning various types of values to any
let any4;
any4 = 10; //typeof any4=number *6
any4 = "hoge"; //typeof any4=string
any4 = 10n; //typeof any4=bigint
any4 = { id: 1, name: "suzuki" }; //typeof any4=object
// let any4_1: string = any4; //*7
```
* 1: You can access properties and functions. (Code assist did not work in vscode)
* 2: Type checking is not effective, so you can set it even if the type is different.
* 3: If you use type assertion, you can access properties and functions, but it is not a safe process.
* 4: If you perform type checking, you can access the properties and functions that the type has. In the case of any, type information is lost, so you cannot compare with `instanceof`, and you need to define type guards yourself.
* 5: No error occurs, and the type of the assigned side also changes.
* 6: You can assign anything. The result of typeof is determined by the assigned value.
* 7: At this point, it becomes an object type, causing a type error.

:::info
**Type Assertion**
It is casting.  
When accepting multiple types like any, it is used to explicitly convey the type to the compiler.  
* Consistency with runtime type: Type assertion is just a hint to the compiler. If it does not match the actual type at runtime, it may lead to runtime errors.
* Incorrect assertion can cause bugs: Incorrect type assertion may cause unexpected bugs.
```ts
let ta1: any = new Person(1,"suzuki");
(ta1 as Person).id;

let ta2: object = {id: 1, name: "suzuki"};
(ta2 as {id: number}).id;

let ta3: unknown = {id: 1, name: "suzuki"};
(ta3 as {name: string}).name;
```
* 1: Example of type assertion
:::

```java: How it works in Java
// Since Object is similar, we will use Object for illustration.

@AllArgsConstructor
@Getter
@Setter
class Person {
  private Object id;
  private Object name;
  String fn() {return "hoge";}
}

// Alternative for "Directly manipulating any" and "Manipulating any with type assertion" *1
Object any1 = new Person(1, "suzuki");
((Person) any1).getId();
((Person) any1).fn();
((Person) any1).setId(2);
((Person) any1).setId("hoge");

// Manipulating any with a specific type using type guards
Object obj2 = new Person(1, "suzuki");
if (obj2 instanceof Person) {
  Person obj2_p = (Person) obj2;
  obj2_p.getId();
  obj2_p.fn();
  obj2_p.getName();
} else if (obj2 instanceof String) {
  String obj2_s = (String)obj2;
  obj2_s.length();
}

// Assigning any to a variable with a specified type *2
// Assigning various types of values to any *2
```
* 1: As you can see, it becomes a forced process. You can understand that the strength of the type is lost and it becomes full of dangerous processes.
* 2: It cannot be realized with existing types. Unless you create a type that changes its entity depending on the assigned value, it cannot be realized.

## object (Object Type)

A type that represents all types other than primitive types.  
It is similar to any, but since it can be safely operated by specifying the type, the strictness toward the type is different.  
* You can assign values other than primitive types.
* If you perform type guards, you can operate according to that type.

:::info
**Type Guard**
It is type checking.
It is used when checking the type of a variable at runtime and branching according to the result.

```ts
class Person {
  id: number;
  name: string;
  fn = () => { return "hoge"; };
  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }
}

// User-defined type guard
const isPerson = (obj: any): obj is Person => {
  return obj instanceof Person;
};
let tg1: any = new Person(1, "suzuki");
if (isPerson(tg1)) { //*1
  tg1.id;
  tg1.fn();
  tg1.id = 2;
}

let tg2: object = new Person(1, "suzuki");
if (tg2 instanceof Person) { //*1
  tg2.id;
}

let tg3: unknown = new Person(1, "suzuki");
if (tg3 instanceof Person) { //*1
  tg3.id;
} else if (typeof tg3 === "string") {
  tg3.length;
}

const fnTg4 = (arg: number | string) => {
  if (typeof arg === "number") { //*1
    arg.valueOf();
  } else if (typeof arg === "string") {
    arg.length;
  }
}
```
* 1: Example of type guard
:::

### Characteristics of the Type

Let's check the characteristics of the type through code.

```ts: TypeScript
// Manipulating object with type assertion
let obj1: object = { id: 1, name: "suzuki", fn: (): string => { return "hoge"; } };
// obj1.id; //*1
(obj1 as { id: number }).id; //*2
(obj1 as { fn: () => {} }).fn(); //*2
(obj1 as { id2: number }).id2; //undefined *3
(obj1 as { id2: number }).id2 = 2; //{ id: 1, name: 'suzuki', fn: [Function: fn], id2: 2 } *4

// Manipulating object with a specific type using type guards
let obj2: object = new Person(1, "suzuki");
if (obj2 instanceof Person) { //*5
  obj2.id;
  obj2.fn();
  obj2.id = 2;
} else if (typeof obj2 === "string") {
  // obj2.length; //never *6
}

// Assigning object to a variable with a specified type
let obj3_1: number = 1;
let obj3_2: object = { id: 1 };
// obj3_1 = obj3_2; //*7

// Assigning various types of values to object
let obj4: object;
// obj4 = 1; //*6
obj4 = { id: 1 };
obj4 = [1, 2, 3];
obj4 = () => {return "hoge"};
```
* 1: Error: Cannot access properties because the type is not specified.
* 2: If you use type assertion, you can access properties and functions, but it is not a safe process.
* 3: Since the type is not specified, such incorrect specifications can be made. It is not an exception, but you can imagine that it is a dangerous process.
* 4: You can also add non-existent properties.
* 5: If you perform type checking, you can access the properties and functions that the type has.
* 6: Error: Primitive types cannot be used.
* 7: Error: Unknown type cannot be assigned to other types.

```java: How it works in Java
// Object can be said to be a similar type.
```
The implementation example is the same as any, so it is omitted.

### Operations with Spread Operator

Let's check the behavior when combined using the spread operator.

:::info
**What is the Spread Operator?**
It is a syntax introduced in JavaScript ES6.  
It is used to expand the elements of iterable objects (arrays, strings, etc.) or expand the properties of objects.  
The part with the prefix `...` corresponds to it.

::: 

```ts: TypeSCript
// Combining with the spread operator
let objSp1_1 = {id: 1, name: "suzuki"};
let objSp1_2 = {address: "tokyo"};
let objSp1_3 = {name: "sato", address: "tokyo"};
let objSp12 = {...objSp1_1, ...objSp1_2}; //{"id":1,"name":"suzuki","address":"tokyo"}
let objSp13 = {...objSp1_1, ...objSp1_3}; //{"id":1,"name":"sato","address":"tokyo"} *1
// Checking the propagation of changes to the source after combining
objSp13.name = "takahashi"; // objSp1_2={"name":"sato","address":"tokyo"}, objSp13={"id":1,"name":"takahashi","address":"tokyo"} *2
// Checking the propagation of changes to the destination after combining
objSp1_3.name = "yamaguchi"; // objSp2={"name":"yamaguchi","address":"tokyo"}, objSp13={"id":1,"name":"takahashi","address":"tokyo"} *3
```
* 1: When there are properties with the same name, the latter takes precedence.
* 2: Changing the properties of the variable after combining does not affect the properties of the source variable.
* 3: The reverse of 2 is also true, no effect.

```java: How it works in Java
// Example code when the target of combination is Map
Map<String, Object> objSp1_1 = new HashMap<>() {{
  put("id", 1);
  put("name", "suzuki");
}};
Map<String, Object> objSp1_2 = new HashMap<>() {{
  put("address", "tokyo");
}};
Map<String, Object> objSp1_3 = new HashMap<>() {{
  put("name", "sato");
  put("address", "tokyo");
}};
Map<String, Object> objSp12 = new HashMap<>() {{ //{name=suzuki, id=1, address=tokyo}
  putAll(objSp1_1);
  putAll(objSp1_2);
}};
Map<String, Object> objSp13 = new HashMap<>() {{ //{name=sato, id=1, address=tokyo}
  putAll(objSp1_1);
  putAll(objSp1_3);
}};
// Checking the propagation of changes to the source after combining
objSp13.put("name", "takahashi"); //objSp1_3={address=tokyo, name=sato}, objSp13={name=takahashi, id=1, address=tokyo}
// Checking the propagation of changes to the destination after combining
objSp1_3.put("name", "yamaguchi"); //objSp1_3={address=tokyo, name=yamaguchi}, objSp13={name=takahashi, id=1, address=tokyo}
```

### Destructuring Assignment

Let's check the assignment to variables using destructuring assignment.

:::info
**What is Destructuring Assignment?**
It is a syntax that extracts values from arrays or objects and assigns them to multiple variables in one statement.

:::

```ts: TypeScript
// Destructuring assignment
const objDivide = {id: 1, name: "suzuki", address: "tokyo"};
const {id, address} = objDivide; //id=1, address=tokyo

// Destructuring assignment + spread operator
const objDivide2 = {first: 1, second: 2, third: 3, forth: 4, fifth: 5};
const {first, second, ...rest} = objDivide2; //first=1, second=2, rest={"third":3,"forth":4,"fifth":5}

// Defining different variable names
const {first: iti, second: ni} = objDivide2; //iti=1, ni=2
```

```java: How it works in Java
// There is no feature corresponding to destructuring assignment.
```
Since batch assignment is not possible, it is replaced by individual assignment.

## unknown

A type introduced in TypeScript 3 to handle values with unknown types (≒uncertain values).  
It is similar to any, but since it can be safely operated by specifying the type, the strictness toward the type is different.  
It can be used when handling external data whose type is unknown in advance.
* Any value can be assigned.
* If you perform type guards, you can operate according to that type.

### Characteristics of the Type

Let's check the characteristics of the type through code.

```ts: TypeScript
class Person {
  id: number = 0;
  name: string = "";

  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }

  fn() {
    console.log("Person#fn");
  };
}

// Manipulating unknown with type assertion
let unk1: unknown = { id: 1, name: "suzuki", fn: (): string => { return "hoge"; } };
// unk1.id; //*1
(unk1 as { id: number }).id; //*2
(unk1 as { fn: () => {} }).fn(); //*2
(unk1 as { id2: number }).id2; //undefined *3

// Manipulating unknown with a specific type using type guards
let unk2: unknown = new Person(1, "suzuki");
if (unk2 instanceof Person) { //*4
  unk2.id;
  unk2.fn();
  unk2.id = 2;
} else if (typeof unk2 === "string") {
  unk2.length; //function that string has
} else if (typeof unk2 === "number") {
  unk2 * 2; //multiply number
}

// Assigning unknown to a variable with a specified type
let unk3_1: number = 1;
let unk3_2: unknown = 2;
// unk3_1 = unk3_2; //*5

// Assigning various types of values to unknown
let unk4: unknown;
unk4 = "hoge"; //typeof unk4=string *6
unk4 = 1; //typeof unk4=number
```
* 1: Error: Cannot access properties because the type is not specified.
* 2: If you use type assertion, you can access properties and functions, but it is not a safe process.
* 3: Since the type is not specified, such incorrect specifications can be made. It is not an exception, but you can imagine that it is a dangerous process.
* 4: If you perform type checking, you can access the properties and functions that the type has.
* 5: Error: Unknown type cannot be assigned to other types.
* 6: You can assign anything. The result of typeof is determined by the assigned value.

```java: How it works in Java
// Object can be said to be a similar type.
```
The implementation example is the same as any, so it is omitted.

:::info
**Comparison with any, unknown, and object**
|Characteristic to Compare|any|unknown|object|
|---|---|---|---|
|Assignable values|Any value can be assigned|Same as left|Except for primitive types|
|Assignment to other types|Can be assigned to any type|Cannot be assigned to types other than any and unknown||
|Type checking|None|Strict|Restricted to non-primitive types, so safer than any|
|Access to properties and functions|Can access|Can access if type guard is performed|,|Access to properties and functions|Can access|Can access if type guard is performed|Same as left|
:::

## void

A type that indicates a function returns nothing.

### Characteristics of the Type

Let's check the characteristics of the type through code.

```ts: TypeScript
const fnVoid = (): void => {};
const fnVoidInf = () => {};
```

```java: How it works in Java
void fnVoid() {}
void fnVoidInf() {}
```

## never

A type for values that never return.
* Cannot be assigned except for never

### Characteristics of the Type

Let's check the characteristics of the type through code.

```ts: TypeScript
const nv0_1: any = 1;
// const nv0_2: never = nv0_1; //*1
const nv1: never = 1 as never; //*2
const nv2 = 1 as never;
const nv2_1: string = nv2; //*3
const nv2_2: number = nv2;
```
* 1: Error: Cannot be assigned even with any
* 2: Can be assigned with never
* 3: Never can be assigned to any type

```java: How it works in Java
// There is no corresponding type.
```

## enum (Enumeration Type)

A type that handles predefined constants collectively.  
TypeScript's enum is compiled as a JavaScript object, so it does not guarantee strict type safety like Java's enum. If strict type safety is required, you need to consider other means.

### Characteristics of the Type

Let's check the characteristics of the type through code.

```ts: TypeScript
enum Enum1 {
  ONE,
  TWO,
  THREE,
}

// Enum with single values
enum Enum2 {
  ONE = 1,
  TWO = 2,
  THREE = 3,
}

// Something like an Enum with multiple values *1
type Enum3 = {
  [K in "ONE" | "TWO" | "THREE"]: {
    value: number;
    viewString: string;
  };
};
//Enum3={ONE: {value: number;viewString: string;}; TWO: {value: number;viewString: string;}; THREE: {value: number;viewString: string;};}
const enum3: Enum3 = {
  ONE: { value: 1, viewString: "いち" },
  TWO: { value: 2, viewString: "に" },
  THREE: { value: 3, viewString: "さん" },
};
//enum3.ONE.value=1, enum3.ONE.viewString="いち"
```
* 1: Since Enums with multiple values cannot be defined, the example uses type alias + const mapping to express equivalent content.

```java: How it works in Java
enum Enum1 {
  ONE,
  TWO,
  THREE,
}

// Enum with single values
@AllArgsConstructor
enum Enum2 {
  ONE(1), TWO(2), THREE(3);

  private int value;
}

// Enum with multiple values
@AllArgsConstructor
enum Enum3 {
  ONE(1, "いち"), TWO(2, "に"), THREE(3, "さん");

  private int value;
  private String viewString;
}
```

:::info
* Unlike Java, TypeScript's Enum cannot define behavior or Enums with multiple values. If necessary, you need to take other measures. The example of implementation that can be used like an Enum with multiple values is shown in the code above.  
* Although the issue regarding type safety in TypeScript's Enum has been improved in TypeScript 5+, if strict type safety is required, consider other methods.
  * Example of substitution using union type: A method of defining a type that limits keys (literals) by defining keys
    ```ts
    type EnumAlt1 = "ONE" | "TWO" | "THREE";
    let enumAlt1: EnumAlt1 = "ONE"; //enumAlt1="ONE"
    ```
  * Example of substitution using literal type: A method of defining a type that limits keys (literals) from constants of keys and values
    ```ts
    const enumAlt2_1 = {ONE: 1, TWO: 2, THREE: 3};
    type EnumAlt2_2 = keyof typeof enumAlt2_1;
    let enumAlt2_3: EnumAlt2_2 = "ONE"; //enumAlt2_1="ONE", enumAlt2_1[enumAlt2_2]=1
    ```
  * Example of substitution using const assertion + type alias: A method of defining a type that limits values from constants of keys and values
    ```ts
    const enumAlt3_1 = {ONE: 1, TWO: 2, THREE: 3} as const;
    type EnumAlt3Type = typeof enumAlt3_1[keyof typeof enumAlt3_1];
    let enumAlt3_2: EnumAlt3Type = enumAlt3_1.ONE; //enumAlt3_2=1
    console.log(`${enumAlt1} ${enumAlt2_3} ${enumAlt2_1[enumAlt2_3]} ${enumAlt3_2}`);
    ```
  * Example of substitution by mapping const assertion + type alias: A method of defining a type that manages keys and values as a pair from constants that become keys
    * The example shown in "Characteristics of the Type" corresponds to this, so please refer to it.
:::


