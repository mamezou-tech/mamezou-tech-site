---
title: 'Introduction to TypeScript for Java Engineers (Part 6: Special Types)'
author: masato-ubata
date: 2024-10-02T00:00:00.000Z
tags:
  - typescript
  - java
image: true
prevPage: >-
  ./src/en/posts/typescript-intro/introduction-to-typescript-for-java-engineer_collection-type.md
nextPage: >-
  ./src/en/posts/typescript-intro/introduction-to-typescript-for-java-engineer_function.md
translate: true

---

## Introduction

This time, we will explain special types used for variables, arguments, return values, etc.

|Name, Overview|JavaScript|TypeScript|Java|Remarks|
|---|---|---|---|---|
|Union Type|≒any|union|-||
|Intersection Type|≒any|intersection|-||
|Literal Type|≒any|literal|-||
|Template Literal Type|literal|template literal type|-|Sometimes referred to as template union type|
|Object Literal Type|object literal|object literal|-||
|Mapped Type|≒object|mapped type|-||
|Conditional Type|≒any|conditional type|-||
|Index Type|any|index signature|≒Map||

※The table maps TypeScript types to **similar types**.

## union (Union Type)

A method for defining a type that accepts multiple types.  
Types are specified separated by `|`.

### Characteristics of the Type

Let's confirm the characteristics of the type through code.

```ts: TypeScript
let union1: string | null; //*1
let union2: string | undefined;
let union3: string | null | undefined; //*2
let union4: string | number; //You can even specify like this
```
* 1: Nullable String
* 2: You can specify three or more types

```java: How it would be in Java
// There is no corresponding definition method.
```
Using Optional, generics, inheritance, etc., you can express similar things.  
The implementation example is the same as the literal type, so it is omitted.

## intersection (Intersection Type)

A method for defining a type that combines multiple types.  
Types are specified separated by `&`.  
It is the opposite of the union type.

### Characteristics of the Type

Let's confirm the characteristics of the type through code.

```ts: TypeScript
type Name = {lastName: string, firstName: string};
type Address = {address: string};
type Person = Name & Address;
let intersection1: Person = {lastName: "suzuki", firstName: "taro", address: "tokyo"}; //*1

let intersection_never: number & string; //*2
```
* 1: You can use the combined type
* 2: If you specify conflicting types with no common values, the type becomes never

```java: How it would be in Java
// There is no corresponding definition method.

interface Name {
  String getLastName();
  void setLastName(String lastName);
  String getFirstName();
  void setFirstName(String firstName);
}

interface Address {
  String getAddress();
  void setAddress(String address);
}

@AllArgsConstructor
@Getter
@Setter
class Person implements Name, Address {
  private String lastName;
  private String firstName;
  private String address;
}

Person intersection1 = new Person("suzuki", "taro", "tokyo");
```
Using interfaces and classes, you can express similar things.

## literal (Literal Type)

A method for defining a type that accepts specific values.  
Specific values are specified separated by `|`.

### Characteristics of the Type

Let's confirm the characteristics of the type through code.

```ts: TypeScript
//Numeric Literal
let num1: 10; //Only 10
let num2: 10 | 20; //10 or 20
const num3: 10 | 20 = getNo(); //10 or 20

//String Literal
let str1: "red"; //Only "red"
let str2: "red" | "yellow"; //"red" or "yellow"
const str3: "red" | "yellow" | "blue" = getTrafficLight(); //"red" or "yellow" or "blue"

//Boolean Literal
let bool1: true; //Only true
function process(flag: true): string;
function process(flag: false): string;
function process(flag: true | false) {
  if (flag === true) {
    return "flag is true";
  } else {
    return "flag is false";
  }
}
```

```java: How it would be in Java
// There is no corresponding definition method.

enum TenOnly {
  TEN;
}

enum TenAndTwenty {
  TEN,
  TWENTY;
}

private static TenAndTwenty getNo() {
  return TenAndTwenty.TEN;
}

// Numeric Literal Alternative
TenOnly num1;
TenAndTwenty num2;
final TenAndTwenty num3 = getNo();

// String Literal: Same as Numeric Literal Alternative, so omitted

// Boolean Literal: Same as Numeric Literal Alternative, so omitted
```
Using Enum, Optional, generics, inheritance, etc., you can express similar things.

## template literal type (Template Literal Type)

You can dynamically generate types by embedding types within string literals.

### Characteristics of the Type

Let's confirm the characteristics of the type through code.

```ts: TypeScript
//*****Example embedding primitive types
type Endpoint = "users" | `users/${number}` | "orders" | `orders/${number}`; //*1
const url1_1: Endpoint = "users";
const url1_2: Endpoint = "users/1";
const url1_3: Endpoint = "orders";
const url1_4: Endpoint = "orders/1";
// const url1_e1: Endpoint = "orders/"; //Error because the number part is unspecified
// const url1_e2: Endpoint = "orders/a"; //Error because the type of the number part is different

//*****Example embedding multiple types *2
type NumberAndString = number | string;
type Endpoint2 = `users/${NumberAndString}`; //"users/" and combination of number, string
const url2: Endpoint2 = "users/u001";

type Importance = "Critical" | "High" | "Middle" | "Low" | "Minor";
type Priority = "Top" | "High" | "Middle" | "Low" | "Bottom";
type Rank = `${Importance}-${Priority}`; //Critical-Top, Critical-High・・・25 patterns
const rank1: Rank = "Critical-Top";

//*****Example defining a type using names defined as literal types as attribute names
type Person = {id: number} & {[K in "name" | "address"]: string;}; //{id: number;} & {name: string;address: string;}
const person: Person = {id: 1, name: "suzuki", address: "tokyo"};
```
* 1: The number part is treated as a type, not a variable.
* 2: The specified type combination is treated as a type.

```java: How it would be in Java
// There is no corresponding definition method.

@AllArgsConstructor
enum Endpoint {
  USERS("users"),
  USERS_WITH_ID("users/%s"),
  ORDERS("orders"),
  ORDERS_WITH_ID("orders/%s");

  private String value;

  String getUrl() {
    return getUrl(0);
  }

  String getUrl(int id) {
    return this.value.formatted(id);
  }
}

@AllArgsConstructor
enum Endpoint2 {
  USERS_WITH_ID("users/%s");

  private String value;

  String getUrl(int id) {
    return getUrl(0);
  }

  String getUrl(String id) {
    return this.value.formatted(id);
  }
}

enum Importance {
  Critical, High, Middle, Low, Minor
};

enum Priority {
  Top, High, Middle, Low, Bottom
};

static record Rank(
    Importance importance,
    Priority priority) {
  String getRank() {
    return "%s-%s".formatted(importance, priority);
  }
}

interface AttrId {
  int id();
}

interface AttrName {
  String name();
}

interface AttrAddress {
  String address();
}

static record Person(
    int id,
    String name,
    String address) implements AttrId, AttrName, AttrAddress {
}

// *****Example embedding primitive types *1
final String url1_1 = Endpoint.USERS.getUrl(); // users
final String url1_2 = Endpoint.USERS_WITH_ID.getUrl(1); // users/1
final String url1_3 = Endpoint.ORDERS.getUrl(); // orders
final String url1_4 = Endpoint.ORDERS_WITH_ID.getUrl(1); // orders/1

// *****Example embedding multiple types
final String url2 = Endpoint2.USERS_WITH_ID.getUrl("u001"); // users/u001 *1

final Rank rank = new Rank(Importance.Critical, Priority.Top); // Critical-Top *2

// *****Example defining a type using names defined as literal types as attribute names *3
final Person person = new Person(1, "suzuki", "tokyo");
```
Using Enum, interfaces, records, classes, etc., you can express similar things.
* 1: Example using enum as an alternative.
* 2: Example using enum + record as an alternative.
* 3: Example using interface + record as an alternative.

## object literal (Object Literal Type)

A method for defining the structure of an object by specifying attribute names and values, function names and processes as pairs.

### Basic Syntax of Object Literal

The syntax and definition example of object literal are as follows.

```ts: Syntax
/**
 * _Attribute Name_: Attribute name
 * _Assigned Value_: Sets the initial value.
 * _Method Name_: Behavior
 * _Arguments_: (Optional) Set if the method requires arguments. If specifying multiple, separate them with `,`.
 * _Return Type_: (Optional) Return type
 */
{
  _Attribute Name_:  _Assigned Value_,
  _Method Name_: (_Arguments_): _Return Type_ => {/** Any process. */},
}
```
* Methods can also be defined as `_Method Name_(_Arguments_): _Return Type_ {/** Any process. */},`.

```ts: Definition Example
let obj0 = { 
  id: 1, 
  name: "suzuki", 
  fn1: (): string => { return "hoge"; },
  fn2(): string {return "fuga";}
};
```

### Characteristics of the Type

Let's confirm the characteristics of the type through code.

```ts: TypeScript
let obj1 =
  { id: 1, name: "suzuki", getName: (): string => { return `${obj1.name}様` } };

let obj2: { readonly id: number, name?: string, readonly getName: () => string } =
  { id: 1, getName: () => { return `${obj2.name}様` } };
//obj2.id = 2; //*1
obj2.name = "suzuki";
```
* 1: Error: Read-only

```java: How it would be in Java
// There is no corresponding definition method.

@AllArgsConstructor
@Getter
@Setter
public static class Person {
  private Long id;
  private String name;
  private Supplier<String> getName;
}

var obj1 = new Person(1L, "suzuki", () -> {return "%s様".formatted("suzuki");});

@RequiredArgsConstructor
@Getter
@Setter
public static class Person2 {
  private final Long id;
  private String name;
  private final Supplier<String> getName;
}

Person2 obj2 = new Person2(1L, () -> {return "%s様".formatted("suzuki");});
obj2.setName("suzuki");
```
Using classes, you can express similar things.

## mapped type (Mapped Type)

A method for generating a new type from an existing type.  
Using the `keyof` keyword, you enumerate the attributes of the original type to generate a type with the same attributes.

### Characteristics of the Type

Let's confirm the characteristics of the type through code.

```ts: TypeScript
type Person = {readonly id: number, name: string};

type NewPerson<TYPE> = {[PARAMETER in keyof TYPE]: TYPE[PARAMETER]}; //{readonly id: number, name: string}
let newPerson: NewPerson<Person> = {id: 1, name: "suzuki"};
// newPerson.id = 2; //*1
newPerson.name = "sato";

type RoPerson<TYPE> = {readonly [PARAMETER in keyof TYPE]: TYPE[PARAMETER]}; //{readonly id: number, readonly name: string}
let roPerson: RoPerson<Person> = {id: 1, name: "suzuki"};
// roPerson.id = 2; //*1
// roPerson.name = "sato"; //*1
```
* 1: Error: Read-only

```java: How it would be in Java
// There is no corresponding definition method.

interface Person {
  int getId();
  String getName();
}

@AllArgsConstructor
@Getter
@Setter
static class NewPerson implements Person {
  private final int id;
  private String name;
}

@AllArgsConstructor
@Getter
static class RoPerson implements Person {
  private final int id;
  private final String name;
}

NewPerson newPerson = new NewPerson(1, "suzuki");
// newPerson.setId(0); //*1
newPerson.setName(null);

RoPerson roPerson = new RoPerson(1, "suzuki");
// roPerson.setId(0); //*1
// roPerson.setName("sato"); //*1
```
* Interfaces define only the signature, and by setting the scope in the implementation class, you can express similar things.
* 1: Error: There is no setter, so it results in an error.

## conditional type (Conditional Type)

A method for determining a type based on type conditions.  
Types are determined based on a comparison of types.  
Comparison is done using `extends`, and branching is done using the ternary operator.

### Basic Syntax of Conditional Type

The syntax and definition example of conditional type are as follows.

```ts: Syntax
/**
 * _Target Type_: The type to be compared
 * _Comparison Type_: The type to compare with the "target type"
 * _Type if True_: The type to return if the comparison between "target type" and "comparison type" is true
 * _Type if False_: The type to return if the comparison is false
 */
_Target Type_ extends _Comparison Type_ ? _Type if True_ : _Type if False_;
```
* You cannot specify multiple conditions using `&&` or `||`, so if you want to specify multiple conditions, you need to nest the branches.

```ts: Definition Example
class Ct {}
type ct<T> = T extends Ct ? string : number; //Compares T and Ct, and returns string if there is an inheritance relationship, otherwise returns number as the type
```

### Characteristics of the Type

Let's confirm the characteristics of the type through code.

```ts: TypeScript
//*****Try type guards with conditional types
type TypeGuard<T, U> = T extends U ? U extends T ? T : never : never; //*1

// Verification with types defined in the language
let ct1 = "hoge";
let ct11: TypeGuard<typeof ct1, string>; //string
let ct12: TypeGuard<typeof ct1, number>; //never

// Verification of classes with inheritance relationships
interface BaseOrder { }
class Order001 implements BaseOrder { order001Attr: string = "order001"; }
class Order002 implements BaseOrder { order002Attr: string = "order002"; }

let ct2 = new Order001();
let ct211: TypeGuard<typeof ct2, BaseOrder>; //never
let ct212: TypeGuard<typeof ct2, Order001>; //Order001
let ct213: TypeGuard<typeof ct2, Order002>; //never

//*****Verify the behavior of extends *2
type TypeGuardB<T, U> = T extends U ? T : never;

let ct221: TypeGuardB<typeof ct2, BaseOrder>; //Order001 *3
let ct222: TypeGuardB<typeof ct2, Order001>; //Order001
let ct223: TypeGuardB<typeof ct2, Order002>; //never
```
* 1: An example equivalent to a type guard that returns T if T and U match.
* 2: Code to verify the behavior of `extends` by setting only the condition to compare T with U in a conditional type.
* 3: Since there is an inheritance relationship, the type set for success is applied.

```java: How it would be in Java
// There is no corresponding definition method.

interface BaseOrder {}

static class Order001 implements BaseOrder {
  String order001Attr = "order001";
}

static class Order002 implements BaseOrder {
  String order002Attr = "order002";
}

@SuppressWarnings("rawtypes")
static class TypeGuard<U> {
  @Getter
  private final Class clazz;

  @SuppressWarnings("unchecked")
  TypeGuard(Class t, Class<U> u) {
    if (u.isAssignableFrom(t) && t.isAssignableFrom(u)) {
      this.clazz = t;
    } else {
      this.clazz = NeverType.class;
    }
  }
}

@SuppressWarnings("rawtypes")
static class TypeGuardB<U> {
  @Getter
  private final Class clazz;

  TypeGuardB(Class t, Class<U> u) {
    if (u.isAssignableFrom(t)) {
      this.clazz = t;
    } else {
      this.clazz = NeverType.class;
    }
  }
}

static class NeverType {} //Alternative for never

// Verification with types defined in the language
var ct1 = "hoge";
var ct11 = new TypeGuard<String>(ct1.getClass(), String.class);
var ct12 = new TypeGuard<Integer>(ct1.getClass(), Integer.class);

// Verification of classes with inheritance relationships
var ct2 = new Order001();
var ct211 = new TypeGuard<BaseOrder>(ct2.getClass(), BaseOrder.class); // NeverType
var ct212 = new TypeGuard<Order001>(ct2.getClass(), Order001.class); // Order001
var ct213 = new TypeGuard<Order002>(ct2.getClass(), Order002.class); // NeverType

// *****Verify the behavior of extends
var ct221 = new TypeGuardB<BaseOrder>(ct2.getClass(), BaseOrder.class); // Order001
var ct222 = new TypeGuardB<Order001>(ct2.getClass(), Order001.class); // Order001
var ct223 = new TypeGuardB<Order002>(ct2.getClass(), Order002.class); // never
```
Since you cannot dynamically set types, you can express similar things by processing them in a superclass or defining custom types.

:::info
**Structural Typing vs. Nominal Typing**
The way TypeScript and Java judge class equivalence is different.  
TypeScript judges equivalence by structure. Even if the names are different, if the structure is the same, they are considered the same.  
Java assigns names to structures, so it judges equivalence,based on these names. Even if the class structures are the same, if the names are different, they are considered different.  
This can be confusing when thinking in Java terms, so here is some verification code.

```ts: TypeScript
interface BaseItem { }
class Item001 implements BaseItem { item001Attr: string = "item001"; }
class Item002 implements BaseItem { }
class Item003 implements BaseItem { fn = () => { return "hoge"; }; } // Class with a member method
class Item004 implements BaseItem { item001Attr: number = 0; } // Class with a member variable of the same name but different type

interface BaseOrder { }
class Order001 implements BaseOrder { order001Attr: string = "order001"; }
class Order002 implements BaseOrder { order002Attr: string = "order002"; }
class Order003 implements BaseOrder { order003Attr: string = "order003"; }
class Order004 implements BaseOrder { order004Attr: string = "order004"; }

// Conditional type that sets OrderXXX as the type when compared with ItemXXX
type GeneralOrder<T extends BaseItem> =
  T extends Item001 ? Order001 :
  T extends Item002 ? Order002 :
  T extends Item003 ? Order003 :
  T extends Item004 ? Order004 :
  never;

// Conditional type with the judgment of Item002 moved to the end
type GeneralOrderB<T extends BaseItem> =
  T extends Item001 ? Order001 :
  T extends Item003 ? Order003 :
  T extends Item004 ? Order004 :
  T extends Item002 ? Order002 :
  never;

let item001 = new Item001();
let order001: GeneralOrder<typeof item001>; //Order001
order001 = new Order001();
order001.order001Attr;

let item002 = new Item002();
let order002: GeneralOrder<typeof item002>; //Order002
order002 = new Order002();
order002.order002Attr;

let item003 = new Item003();
let order003: GeneralOrder<typeof item003>; //Order002 *1
// order003 = new Order003(); // *2
// order003.order003Attr;

let item004 = new Item004();
let order004: GeneralOrder<typeof item004>; //Order002 *1
// order004 = new Order004(); //*2
// order004.order004Attr;

//*****Verify behavior with the reordered conditional type
let item003b = new Item003();
let order003b: GeneralOrderB<typeof item003b>; //Order003 *3
order003b = new Order003();
order003b.order003Attr;

let item004b = new Item004();
let order004b: GeneralOrderB<typeof item004b>; //Order004 *3
order004b = new Order004();
order004b.order004Attr;

//*****Verify what happens with assignment and instanceof
// item004b = new Item002(); //*4
item004b instanceof Item002; //false *5
item004b instanceof Item004; //true
```
* 1: For some reason, it is judged as `Item002`, and the type becomes `Order002`. Why is this?
  * The structure of `Item002` is `{}`, and the structure of `Item003` is `{fn = () => { return "hoge"; };}`.
  * Therefore, it seems that the structure of `Item002` is judged to be a generalized version of the structure of `Item003`.
  * Similarly, the structure of `Item004` is `{item001Attr: number}`, and it seems to be judged as a generalized version for the same reason.
* 2: Of course, it results in a type error.
* 3: The judgment was verified using a conditional type with the judgment of `Item002` moved to the end.
  * The result was as expected, with `Item003` judged as `Order003` and `Item004` judged as `Order004`.
* 4: `extends` results in `true`, but assignment results in a type error.
* 5: `extends` results in `true`, but `instanceof` results in `false`.
:::

## index signature (Index Type)

A method for defining a type that dynamically accepts arbitrary attributes.

### Characteristics of the Type

Let's confirm the characteristics of the type through code.

```ts: TypeScript
interface BasePerson {
  id: number;
  name: string;
  [index: string]: any;
}
let indexSig1: BasePerson = { id: 1, name: "suzuki", address: "tokyo", getName: () => {return "suzuki";} };
indexSig1.address; //tokyo *1
indexSig1.getName(); //suzuki *1
```
* 1: You can access index signatures by writing the attribute name (like with any type, code assist in vscode did not work).

```java: How it would be in Java
// There is no corresponding definition method.

interface BasePerson {
}

@AllArgsConstructor
@Getter
@Setter
static class Person implements BasePerson {
  private int id;
  private String name;
  Map<String, Object> indexSig = new HashMap<>();
}

var indexSig1 = new Person(1, "suzuki", Map.of("address", "tokyo", "getName", (Supplier<String>) () -> "suzuki"));
indexSig1.getIndexSig().get("address"); //tokyo
Object getNameLogic = indexSig1.getIndexSig().get("getName");
if (getNameLogic instanceof Supplier) {
  ((Supplier<String>)getNameLogic).get(); //suzuki
}
```
You can express similar things using a Map.

:::info
**Use Cases**
1. Temporarily use in situations with frequent changes
  For example, in the early stages of Web API design, when the interface definition between two parties is unstable, attributes are frequently changed. Trying to keep up with these changes can be exhausting for both parties.  
  In such situations, using index types to define attributes at the beginning and gradually transitioning to static definitions as things stabilize can be useful.
2. Use when you want to handle K/V structures like JSON as they are
3. Use when the interface specification is unclear
   There are many situations where you have to proceed with tasks even when the interface of a legacy system is not clear.  
   By using it as a type that accepts everything, you can proceed with tasks even when specifications are unclear.
:::

