---
title: "Introduction to TypeScript for Java Engineers (Part 5: Types for Handling Collections)"
author: masato-ubata
date: 2024-09-13T00:00:00.000Z
tags:
  - typescript
  - java
image: true
prevPage: ./src/en/posts/typescript-intro/introduction-to-typescript-for-java-engineer_other-basic-type.md
nextPage: ./src/en/posts/typescript-intro/introduction-to-typescript-for-java-engineer_special-type.md
translate: true
---

## Introduction

This time, we will explain types for handling collections used in variables, arguments, return values, etc.

| Name, Overview | JavaScript | TypeScript | Java | Notes |
|---|---|---|---|---|
| Array | array | array | Array | |
| Tuple Type | ≒array | tuple | - (can be substituted with commons-lang, etc.) | |
| Set | Set | Set | Set | |
| Map | Map | Map | Map | |

※ The table maps TypeScript types to **similar types**.

## array (Array Type)

This type represents a variable-length array.  
By adding type annotations, you can restrict the types of elements included in the array, but you cannot set the type for each individual element.

### Characteristics of the Type

Let's check the characteristics of the type through code.

```ts: TypeScript
// Type definition only
let ary1: string[]; // *1
ary1 = ["A", "B", "C"];
let ary1_1: Array<string | number>; // Type specification using Array
let ary1_2: (number | string)[]; // Specification of multiple types

const ary2 = []; // Initialization without type: typeof ary2=any[]
ary2.push(1);
ary2.push("A");

const ary3 = [] as string[]; // Initialization with type

// Initialization with values
const ary4 = ["A", "B", "C"]; // typeof ary4=string[]
const ary4_1 = [1, "A"] //typeof ary4_1=(number | string)[]
ary4_1[0] = "hoge"; //*2

// Read-only
const aryR: readonly number[] = [1];
// aryR[0] = 1; // Operation on array element *3
// aryR.push(1); // Operation on array *3
aryR[3]; //undefined *4

const aryR_1: ReadonlyArray<number> = [1];
// aryR_1[0] = 1; //*3

interface IfR {
  readonly ids: number[],
  readonly ids2: readonly number[],
  getIds3: () => readonly number[],
}
const ifr: IfR = {
  ids: [1, 2, 3, 4, 5],
  ids2: [1, 2, 3, 4, 5],
  getIds3: () => { return [1, 2, 3, 4, 5]; }
};

// Attributes are read-only *5
ifr.ids[0] = 2;
ifr.ids.push(6);
// ifr.ids = [1];

// Both attributes and array values are read-only *6
// ifr.ids2[0] = 2;
// ifr.ids2.push(6);
// ifr.ids2 = [1];

// Return value array is read-only *7
const ids3 = ifr.getIds3();
// ids3[0] = 2;
// ids3.push(6);
```
* 1: Since it's not initialized, it's declared with `let`.
* 2: Although the array type can be limited, it's not determined for each element, so no error occurs.
* 3: Error: Read-only
* 4: If you reference a non-existent element, undefined is returned.
* 5: Attributes are read-only, so assignment results in an error.
* 6: Both attributes and values are read-only, so operations on array elements, array operations, and assignments result in errors.
* 7: Return values are read-only, so operations on array elements and array operations result in errors.

```java: How it works in Java
@Setter
@Getter
static class IfR {
  private final List<Integer> ids;
  private final List<Integer> ids2;
  private final Supplier<List<Integer>> ids3;
  IfR(Integer[] ids, Integer[] ids2, Supplier<List<Integer>> ids3) {
    this.ids = 
    Arrays.stream(ids).collect(Collectors.toList());
    this.ids2=List.of(ids2);
    this.ids3 = ids3;
  }
  List<Integer> getIds3() {
    return List.copyOf(ids3.get());
  }
}

// Type definition only
String[] ary1;
ary1 = new String[]{"A", "B", "C"};
Object[] ary1_1; // Type specification using Array *1
Object[] ary1_2; // Specification of multiple types: Not possible *1

var ary2 = new Object[2]; // Initialization without type *2
ary2[0] = 1;
ary2[1] = "A";

var ary3 = new String[0]; // Initialization with type

// Initialization with values
var ary4 = new String[]{"A", "B", "C"}; // ary4=string[]
var ary4_1 = new Object[]{1, "A"}; // ary4_1=Object[]
ary4_1[0] = "hoge"; //*2
// System.out.println(ary4_1[3]); //*3

// Read-only *4
final List<Integer> aryR = List.of(1);
// aryR.set(0, 1); // Operation on array element *5
// aryR.add(1); // Operation on array *5

var ifr = new IfR(
  new Integer[]{1,2,3,4,5}, 
  new Integer[]{1,2,3,4,5}, 
  () -> {return List.of(1,2,3,4,5);});

// Attributes are read-only *6
ifr.getIds().set(0, 2);
ifr.getIds().add(6);
// ifr.setIds(List.of(1));

// Both attributes and array values are read-only *7
// ifr.getIds2().set(0, 2);
// ifr.getIds2().add(6);
// ifr.setIds2(List.of(1));

// Return value array is read-only *8
var ids3 = ifr.getIds3();
// ids3.set(0, 2);
// ids3.add(6);
```
* 1: Since multiple type specifications are not possible, it's substituted with an Object array.
* 2: Initialization without type is not possible. Size is also required, so it's substituted with an Object array of specified size.
* 3: If you reference a non-existent element, `ArrayIndexOutOfBoundsException` is thrown.
* 4: Since arrays cannot be made read-only, they are substituted with List.
* 5: Error: Since it's an ImmutableList, operations on the List and its elements are not possible.
* 6: Attributes are immutable, so assignment is not possible.
* 7: Attributes are immutable, so assignment is not possible. Values are also immutable, so operations on List elements and the List result in `UnsupportedOperationException`.
* 8: Return values are immutable, so operations on List elements and the List result in `UnsupportedOperationException`.

### Operations with the Spread Operator

Let's check the behavior when combined using the spread operator.

```ts: TypeScript
// Combination using the spread operator
const arySp1 = ["A", "B", "C"];
const arySp2 = [1, "D"];
const arySp3 = ["A", "D"];
const arySp12 = [...arySp1, ...arySp2]; //['A','B','C',1,'D']
const arySp13 = [...arySp1, ...arySp3]; //['A','B','C','A','D'] *1
// Check the propagation of changes to the source of the combination
arySp13[0] = "E"; //arySp1=['A','B','C'], arySp13=['E','B','C','A','D'] *2
// Check the propagation of changes to the destination of the combination
arySp1[0] = "E"; //arySp1=['E','B','C'], arySp13=['E','B','C','A','D'] *3
// Without the spread operator
const arySp_none = [arySp1, arySp2]; //[['E','B','C'],[1,'D']] *4
```
* 1: Since elements are not compared, there is no precedence, resulting in a pure combination.
* 2: Changing the attributes of the combined variable does not affect the attributes of the source variable.
* 3: The reverse of 2 is also true, with no effect.
* 4: Without using the spread operator, an array containing two arrays is generated.

```java: How it works in Java
// Combination using the spread operator
final String[] arySp1 = { "A", "B", "C" };
final Object[] arySp2 = { 1, "D" };
final String[] arySp3 = { "A", "D" };

final Object[] arySp12 = new Object[arySp1.length + arySp2.length];
System.arraycopy((Object[]) arySp1, 0, arySp12, 0, arySp1.length);
System.arraycopy(arySp2, 0, arySp12, arySp1.length, arySp2.length); //['A','B','C',1,'D'] *1

final String[] arySp13 = Stream.concat(Arrays.stream(arySp1), Arrays.stream(arySp3)).toArray(String[]::new); //['A','B','C','A','D'] *2

// Check the propagation of changes to the source of the combination
arySp13[0] = "E"; // arySp1=['A','B','C'], arySp13=['E','B','C','A','D'] *3
// Check the propagation of changes to the destination of the combination
arySp1[0] = "E"; // arySp1=['E','B','C'], arySp13=['E','B','C','A','D'] *4
// Without the spread operator
Object[] arySp_none = new Object[] { arySp1, arySp2 }; // [['E','B','C'],[1,'D']]
```
* 1: An example of achieving similar processing with arraycopy.
* 2: An example of achieving similar processing with Lambda expressions.
* 3: Changing the attributes of the combined variable does not affect the attributes of the source variable.
* 4: The reverse of 2 is also true, with no effect.

### Destructuring Assignment

Let's check the assignment to variables using destructuring assignment.

```ts: TypeScript
// Destructuring assignment
const aryDivide = [1, 2, 3, 4, 5];
const [one, , three, , five] = aryDivide; //one=1, three=3, five=5
// Destructuring assignment + spread operator
const [first, second, ...rest] = [1, 2, 3, 4, 5]; //first=1, second=2, rest=3,4,5
```

```java: How it works in Java
// There is no corresponding feature for destructuring assignment.
```
Since batch assignment is not possible, it's substituted by assigning individually.

### Array Operations

Let's briefly check the operations using methods that arrays have.

```ts
const ary5 = [1, 2, 3, 4, 5];
ary5.push(6); // Add to the end: ary5=[1,2,3,4,5,6]
ary5.pop(); // Remove the last element: ary5=[1,2,3,4,5]
ary5.unshift(0); // Add an element to the beginning: ary5=[0,1,2,3,4,5]
ary5.shift(); // Remove the first element: ary5=[1,2,3,4,5]
ary5.splice(1, 2); // Remove specified elements: ary5=[1,4,5]
ary5.sort((a, b) => b - a); // Sort in descending order (swap if positive): [5,4,1]
ary5.sort(); // Sort (in UTF-16 code order): [1,4,5]
ary5.slice(0, 2); // Generate a new array from specified elements: [1, 4]
```

```java: How it works in Java
// Arrays cannot be operated on directly.
```
As mentioned in the variables section, arrays cannot be operated on directly, so you need to regenerate the array or substitute it with a List.  
For code examples, refer to the [Variables Section](/typescript-intro/introduction-to-typescript-for-java-engineer_variable/#変数の特性-1).

### Operations with Loops

Let's check the operations using loops with for.
There are slight differences, but it's similar to Java.

```ts
const ary6 = [1, 2, 3, 4, 5];
for (let i = 0; i < ary6.length; i++) {console.log(ary6[i])} //for
ary6.forEach(num => console.log(num)); //forEach
for (let num of ary6) {console.log(num)} //for-of
```

```java: How it works in Java
int[] ary6 = { 1, 2, 3, 4, 5 };
for (int i = 0; i < ary6.length; i++) {System.out.println(ary6[i]);} // for
Arrays.stream(ary6).boxed().toList().forEach(num -> System.out.println(num)); // forEach
for (int num : ary6) {System.out.println(num);} //for-of
```

:::info
**Differences between TypeScript and Java**
* TypeScript: Arrays are **variable-length**, so operations like adding (push) or removing (pop, shift) elements are possible.
* Java: Arrays are **fixed-length**, so adding or removing elements is not possible.
:::

## tuple (Tuple Type)

This type represents a fixed-length array.  
The type, order, and size of each element are determined by the definition.

### Characteristics of the Type

Let's check the characteristics of the type through code.

```ts: TypeScript
let tuple1: [number, string]; // Type definition only *1
tuple1 = [1, "suzuki"];

const tupleInf = [1, "suzuki"]; // Initialization with values *2
tupleInf[0] = "hoge"; //[hoge, suzuki]

const tuple2: [number, string] = [1, "suzuki"];
// tuple2[0] = "hoge"; //*3

const tuple3: [number, string, string] = [1, "suzuki", "tokyo"];
tuple3[2] = "oosaka";  //[1, suzuki, oosaka]

const tupleR: readonly [number, string, string] = [1, "suzuki", "tokyo"]; // Read-only
// tupleR[2] = "oosaka"; //*4
```
* 1: Since it's not initialized, it's declared with `let`.
* 2: If you omit the type annotation, it's inferred as an array type, not a tuple type. Since it's inferred as an array of number or string, no error occurs when assigning a string to the first element.
* 3: Error: The first element is a number, so it's a type error.
* 4: Error: Since it's read-only, elements cannot be changed.

```java: How it works in Java
// There is no corresponding type.
```
You can substitute it by using types provided by libraries like commons-lang or by defining your own type.

## Set

Represents a collection of values that do not contain duplicate elements.
* Order: Order is not guaranteed. Since there is no order, access by specifying an index is also not possible.
* Duplicate elements are eliminated: Even if you add the same value multiple times, duplicate elements are eliminated, so it is only registered once.

### Characteristics of the Type

Let's check the characteristics of the type through code.

```ts: TypeScript
let set1: Set<number>; // Type definition only *1
set1 = new Set([1,2,3]);

const set2 = new Set(); // Initialization without type: typeof set2=unknown
set2.add(1);
set2.add("A");

const set3 = new Set<string>(); // Initialization with type

const set4 = new Set(["A", "B", "C", "D", "E"]); // Initialization with values: typeof set6=Set<string>
```
* 1: Since it's not initialized, it's declared with `let`.

```java: How it works in Java
Set<Long> set1; // Type definition only
var set2 = new HashSet(); // Initialization without type *1
Set<String> set3 = new HashSet<>(); // Initialization with type *2
Set<String> set4 = new HashSet<>(Arrays.asList("A", "B", "C", "D", "E")); // Initialization with values *2
var set4_1 = Set.of("A", "B", "C", "D", "E"); // Initialization with values (read-only): set4_1=Set<String> type
```
* In the code example, HashSet is used as the implementation of Set.
* 1: Since the type is unspecified, it's warned as a raw type.
* 2: Since we want a Set type, var cannot be used.

### Operations with Set

Let's briefly check the operations using methods that Set has.  
There are slight differences, but it's similar to Java.

```ts
const set5 = new Set<string>();
set5.add("A").add("B").add("C"); // Add values: [A,B,C] *1
set5.add("C"); // Update existing value: [A,B,C] *2
set5.delete("C"); // Delete value: [A,B]
set5.delete("Z"); // Delete value (non-existent value): [A,B] *3
set5.clear(); // Clear: []
```
* 1: Since the return value of add is `Set<T>`, it can be called in a method chain.
* 2: Updating an existing value does nothing, and no exception occurs.
* 3: Deleting a non-existent value only returns false, and no exception occurs.

```java: How it works in Java
var set5 = new HashSet<String>();
set5.add("A"); // Add values: *1
set5.add("B");
set5.add("C"); // [A,B,C]
set5.add("C"); // Update existing value: [A,B,C] *2
set5,.remove("C"); // Delete value: [A,B]
set5.remove("Z"); // Delete value (non-existent value): [A,B] *3
set5.clear(); // Clear: []
```
* 1: The return value of add is boolean, so it cannot be called in a method chain.
* 2: Updating an existing value does nothing, and no exception occurs.
* 3: Deleting a non-existent value only returns false, and no exception occurs.

### Operations with Loops

Let's check the operations using loops with for.
There are slight differences, but it's similar to Java.

```ts
const set6 = new Set(["A", "B", "C"]); 
set6.forEach((value) => {console.log(value)}); //forEach
for (const value of set6) {console.log(value)} //for-of
```

```java: How it works in Java
final var set6 = Set.of("A", "B", "C");
set6.forEach(value -> System.out.println(value)); // forEach
for (var value : set6) {System.out.println(value);} // Enhanced for
```

## Map

A data structure that stores key-value pairs. Keys are unique, and you can retrieve the value corresponding to a key.
* Key Type: You can use any data type as a key, such as strings, numbers, or objects.
* Duplicate Keys: Not allowed. If you set a value with the same key, the value is updated.
* Maintains the insertion order of elements.

### Characteristics of the Type

Let's check the characteristics of the type through code.

```ts: TypeScript
let map1: Map<String, number>; // Type definition only *1
map1 = new Map([["A", 1], ["B", 2]]);

const map2 = new Map(); // Initialization without type: typeof map2=Map<any, any>
map2.set(1, 1);
map2.set("key", "value");

const map3 = new Map<String, number>(); // Initialization with type

const map4 = new Map([["A", 1], ["B", 2]]); // Initialization with values: typeof map4=Map<string, number>
```
* 1: Since it's not initialized, it's declared with `let`.

```java: How it works in Java
Map<String, Integer> map1; // Type definition only
var map2 = new HashMap(); // Initialization without type *1
Map<String, Integer> map3 = new HashMap<>(); // Initialization with type *2
Map<String, Integer> map4 = new HashMap<>() {{put("A", 1);put("B", 2);}}; // Initialization with values *2
var map4_1 = Map.of("A", 1, "B", 2); // Initialization with values (read-only): map4_1=Map<String, Integer> type
```
* In the code example, HashMap is used as the implementation of Map.
* 1: Since the type is unspecified, it's warned as a raw type.
* 2: Since we want a Map type, var cannot be used.

### Operations with Map

Let's briefly check the operations using methods that Map has.  
There are slight differences, but it's similar to Java.

```ts
const map5 = new Map<string, number>();
map5.set("A", 1).set("B", 2).set("C", 3); // Add values: [A,1][B,2][C,3] *1
map5.set("C", 4); // Update existing value: [A,1][B,2][C,4]
map5.get("A"); // Retrieve value: 1
map5.get("Z"); // Retrieve value (non-existent value): undefined
map5.delete("C"); // Delete value: [A,1][B,2]
map5.delete("Z"); // Delete value (non-existent value): [A,1][B,2] *2
map5.clear(); // Clear: []
```
* 1: Since the return value of set is `Map<K, V>`, it can be called in a method chain.
* 2: Deleting a non-existent value only returns false, and no exception occurs.

```java: How it works in Java
var map5 = new HashMap<String, Integer>();
map5.put("A", 1); // Add values *1
map5.put("B", 2);
map5.put("C", 3); // {A=1,B=2,C=3}
map5.put("C", 4); // Update existing value: {A=1,B=2,C=4}
map5.get("A"); // Retrieve value: 1
map5.get("Z"); // Retrieve value (non-existent value): null
map5.remove("C"); // Delete value: {A=1,B=2}
map5.remove("Z"); // Delete value (non-existent value): {A=1,B=2} *2
map5.clear(); // Clear: {}
```
* 1: The return value of put is boolean, so it cannot be called in a method chain.
* 2: Deleting a non-existent value only returns null, and no exception occurs.

### Operations with Loops

Let's check the operations using loops with for.
There are slight differences, but it's similar to Java.

```ts
const map6 = new Map([["A", 1], ["B", 2], ["C", 3]]);
map6.forEach((value, key) => {console.log(value)}); //forEach *1
for (const[key, value] of map6) {console.log(value)} //for-of
```
* 1: The order is value, key, so be careful.

```java: How it works in Java
var map6 = Map.of("A", 1, "B", 2, "C", 3);
map6.forEach((key, value) -> System.out.println("%s:%s".formatted(key, value))); // forEach
for (String key : map6.keySet()) {System.out.println("%s:%s".formatted(key, map6.get(key)));} // Enhanced for
```

