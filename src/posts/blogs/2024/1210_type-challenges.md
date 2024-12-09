---
title: 早く教えて欲しかったtype-challenges初級チートシート
author: shohei-yamashita
date: 2024-12-10
tags: [typescript, type-challenges]
image: true
---
# 導入部
## はじめに
type-challengesはTypeScriptの型システムを活用して複雑な型定義を解決するチャレンジ集です。
TypeScriptの型に関する理論や知識を知っていても、うまく使いこなせる自信がないという方は少なくないと思います。
そんな方向けに、問題演習を通してTypeScriptの応用力を養うことを目的として始まった試みがtype-challengesです。
詳細は以下のGithubのページからご参照ください。
@[og](https://github.com/type-challenges/type-challenges/blob/main/README.ja.md)

本記事では初級(easy)に手を付ける前に筆者が知っておきたかった知識を、（独断と偏見で）まとめておきます。
## 書くこと/書かないこと
### 書くこと
- 型パズル（初級）を突破するための、やや応用的な知識
	- Distributed Conditional Types
	- Mapped Types
	- infer
- 型パズルの例題
### 書かないこと
- TypeScriptの基本的な内容
- 型パズルの問題と解答(ご自身の目で確認してください)
## TypeScriptの基本
TypeScriptの基本については、この記事で網羅できません。弊社宇畑氏による過去の投稿記事も併せてご参照ください。
[Javaエンジニアが始めるTypeScript入門（第1回：イントロダクション）](https://developer.mamezou-tech.com/typescript-intro/introduction-to-typescript-for-java-engineer_index/)
[Javaエンジニアが始めるTypeScript入門（第2回：変数）](https://developer.mamezou-tech.com/typescript-intro/introduction-to-typescript-for-java-engineer_variable/)
[Javaエンジニアが始めるTypeScript入門（第3回：プリミティブ型）](https://developer.mamezou-tech.com/typescript-intro/introduction-to-typescript-for-java-engineer_primitive-type/)
[Javaエンジニアが始めるTypeScript入門（第4回：その他の基本型）](https://developer.mamezou-tech.com/typescript-intro/introduction-to-typescript-for-java-engineer_other-basic-type/)
[Javaエンジニアが始めるTypeScript入門（第5回：集合を扱う型）](https://developer.mamezou-tech.com/typescript-intro/introduction-to-typescript-for-java-engineer_collection-type/)
[Javaエンジニアが始めるTypeScript入門（第6回：特殊な型）](https://developer.mamezou-tech.com/typescript-intro/introduction-to-typescript-for-java-engineer_special-type/)
[Javaエンジニアが始めるTypeScript入門（第7回：関数）](https://developer.mamezou-tech.com/typescript-intro/introduction-to-typescript-for-java-engineer_function/)
[Javaエンジニアが始めるTypeScript入門（第8回：オブジェクト）](https://developer.mamezou-tech.com/typescript-intro/introduction-to-typescript-for-java-engineer_object/)

## 実行環境について
```typescript
TypeScipt: 5.7.2.
実行環境: TypeScript: TS Playground
```
バージョンはともかく、実行環境はなんでもいいと思います。ただ、ブラウザ上で検証できてかつエラーも即座に確認できるため、Playgroundをお勧めします。
リンク：[TypeScript Playground](https://www.typescriptlang.org/play)

# チートシート
## Spread syntax
これはJavaScriptでも導入されていますが、スプレッド構文（...）は、配列やオブジェクトの要素を展開する構文です。
```typescript
// 配列のスプレッド
const arr1 = [1, 2];
const arr2 = [...arr1, 3, 4]; // [1, 2, 3, 4]
// オブジェクトのスプレッド
const obj1 = { a: 1, b: 2 };
const obj2 = { ...obj1, c: 3 }; // { a: 1, b: 2, c: 3 }
// 関数の引数としても使用可能
function sum(...numbers: number[]) {
  return numbers.reduce((a, b) => a + b, 0);
}
```
なんと型でも使えます（はじめはここからつまずきました）。

## Distributed Conditional Types
以下の例がわかる方は読み飛ばしてください。Test型はどんな型になるでしょうか？
```typescript
type IsString<T> = T extends string ? true: false
type Test = IsString<"success" | 200>
```
Distributed Conditional Typesを直訳すると、分配された条件型という表現になります。
TypeScriptのリファレンス（[Distributed Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)）においては以下のように説明されています。
> When conditional types act on a generic type, they become *distributive* when given a union type. For example, take the following:
条件型に対してユニオン型を与えると、ユニオン型が分配されて、Distributed Conditional Typesとなるといった解釈ができます。
以下に具体例を提示します。
```typescript
type MyCommon<U, T> = U extends T ? U : never;
type Result2 = MyCommon<'a' | 'b' | 'c', 'a' | 'c' | 'd'> // 'a' | 'c'
```
このMyCommonは2つのユニオンの共通部分をユニオンとして抽出する型定義です。
この型がどのように機能しているのかを確認するため、実際の値を代入してみましょう。
```typescript
type MyCommon<U, T> = U extends T ? U : never;
// = ('a' | 'b' | 'c') extends ('a' | 'c' | 'd') ? ('a' | 'b' | 'c') : never
```
ここで、条件型に対してユニオン型が与えられていることからDistributed Conditional Typesとなります。
具体的には以下のような分配が行われ、最終的にはユニオン型として定義されます。
```typescript
// type MyCommon<U, T> = U extends T ? U : never;
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
先ほどの例題の答えは、このルールに従うとbooleanとなります。
```typescript
type IsString<T> = T extends string ? true: false
type test = IsString<"success" | 200>
// IsString<"success" | 200> 
//  = ("success" | 200 ) extends ? true : false
//  = "success" extends ? true : false | 200 extends ? true : false 
//  = true | false
//  = boolean
```

## Mapped Types
以下の問題がわかる方はスキップしてください。
キーとバリューを入れ替えるような型であるMySwitchを作ってみましょう。
```typescript
type ShortToLong =  {
  'q': 'search';
  'n': 'numberOfResults';
}
type TestRecord = { [P : string]: string; } // Record<string, string>でもOK
// type MySwitch<T extends TestRecord> = ?
type LongToShort = MySwitch<ShortToLong>
// Should be {'search': "q", "numberOfResults": "n"}
```
TypeScriptのリファレンス（[Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)）において、Mapped Typesは以下のように説明がされています。
> When you don’t want to repeat yourself, sometimes a type needs to be based on another type.

すなわち、特定のタイプから別のタイプを作りたいときに使えるのがMapped Typesとなります。

[^1]: 前述した弊社宇畑氏の[記事](https://developer.mamezou-tech.com/typescript-intro/introduction-to-typescript-for-java-engineer_special-type/#mapped-type%EF%BC%88%E3%83%9E%E3%83%83%E3%83%94%E3%83%B3%E3%82%B0%E5%9E%8B%EF%BC%89)でも「既存の型から新しい型」を定義する旨が書かれています

一方、サバイバルTypeScrtipt（[Mapped Types](https://typetypescriptbook.jp/reference/type-reuse/mapped-types)）ではユニオンから生成できるという主旨の説明がされています。
> Mapped Typesは主にユニオン型と組み合わせて使います。

フォーマルとしては型から型というのが正しいのかもしれません[^1]。
ただ、実例を見るとTypeから別のTypeを生成するにも、ユニオン型を経由して生成しているように見えます。
本記事においては、説明の都合上、ユニオン型から別のタイプを生成するという方向性とさせてください。
頭に入れるべき構文は次のとおりです。
```typescript
{[${任意の文字列} in ${基準となるユニオン型}] : ${タイプ}}
```
これだけだとわかりにくいので、いくつか例を提示します。
```typescript
// {[${任意の文字列} in ${基準となるユニオン型}] : ${タイプ}}
type VectorMappedTypes = {[k in ('x' | 'y' | 'z')] : number}
// {'x': number, 'y': number, 'z': number}
type IdenticalMappedTypesXYZ = {[k in ('x' | 'y' | 'z')] : k}
// {'x': 'x', 'y': 'y', 'z': 'z'}
type IdenticalMappedTypes<T extends keyof any> = {[k in T] : k}
// ユニオンからキーとマップが一致する型を作成
type IdenticalMappedTypesXY= IdenticalMappedTypes<'x' | 'y'>
// {'x': 'x', 'y': 'y'}
type MyPickUnion<T, U extends keyof T>= {[k in U]: T[k]}
// 特定の型から、ユニオンにキーが含まれているもののみを抽出
type SampleType = {target: "a", other:"b", 23: "c"}
type test = MyPickUnion<SampleType, "other" | "target">
// {target: "a", other:"b"}
```
いずれの表現においても、共通して以下の構文が登場していますね。
```typescript
{[${任意の文字列} in ${基準となるユニオン型}] : ${タイプ}}
```
Mapped Typesを利用すれば、先の例題は以下のように導かれるでしょう。
```typescript
type ShortToLong =  {
  'q': 'search';
  'n': 'numberOfResults';
}
type LongToShort = { [k in keyof ShortToLong as ShortToLong[k]]: k }
type TestRecord = { [P : string]: string; } // Record<string, string>でもOK
type MySwitch<T extends TestRecord> = {[k in keyof T as T[k]]: k}
// as T[k]により、バリューとして上書きする
type LongToShort2 = MySwitch<ShortToLong>
// {'search': "q", "numberOfResults": "n"}
```

## infer
個人的に最も理解に苦しんだのがinferです。
以下の問題が分かる人はスキップしてください。
```typescript
const fn = (v: boolean) => {
   if (v)
     return "success"
   else
     return "error"
 }
 
 // type MyReturnType を求める
 
 type ResultString = MyReturnType<typeof fn> 
 // should be "success" | "error"
```
サバイバルTypeScrtipt（[infer](https://typescriptbook.jp/reference/type-reuse/infer)）においては以下のように書かれています。
> inferはConditional Typesの中で使われる型演算子です。`infer`は「推論する」という意味で`extends`の右辺にのみ書くことができます。


何を言っているのか正直理解できませんでしたが、色々調べてみると次のような記述を見つけました[^2]。

> inferとは型推論によって決まる、一時的な型変数の宣言

[^2]: 参考記事：[https://zenn.dev/axoloto210/articles/advent-calender-2023-day25](https://zenn.dev/axoloto210/articles/advent-calender-2023-day25)

inferを理解するために以下の型を見てみましょう。
```typescript
type MyPickUnion<T, U extends keyof T>= {[k in U]: T[k]}
type SampleType = {target: "a", other:"b", 23: "c"}
type test = MyPickUnion<SampleType, "other" | "target">
// {target: "a", other:"b"}
```
先ほどのMapped Typesの章で出てきたもので、既に定義されている型から特定のキーの成分のみを抽出する型です。
このままだとオブジェクトが返されてしまいます。
そこで、キーバリューのうちバリューのみの抽出できる型を作ってみましょう。型の名前はMyPickValueとします。
```typescript
type MyPickUnion<T, U extends keyof T>= {[k in U]: T[k]}
type SampleType = {target: "a", other:"b", 23: "c"}
type test = MyPickUnion<SampleType, "other" | "target">
// type MyPickValue = ?
type SampleTypePickedValue = MyPickValue<SampleType>
// Should Be "a" | "b"
```
ここではMyPickUnionを起点に考えます。
繰り返しになりますが、inferは一時変数の宣言であることを念頭においてください。
まず、一時変数としたいものをinfer Rとおきかえましょう。シンボルはRでなくても問題ないです。
```typescript
// type MyPickUnion<T, U extends keyof T>= {[k in U]: T[k]}
// ↓
// 抽出したいものをinfer Rとする
type MyPickValue<T, U extends keyof T>= {[k in U]: infer R}
```
すると、以下のようなエラーが表示されるはずです。
>  'infer' declarations are only permitted in the 'extends' clause of a conditional type.

すなわち、extendsが含まれている条件型の中でしかinferは許されないと言われています。
まずはextendsを付け足してみます。次のように書き換えてみましょう。
```typescript
// type MyPickUnion<T, U extends keyof T>= {[k in U]: T[k]}
// ↓
// 抽出したいものをinfer Rとする
// type MyPickValue<T, U extends keyof T>= {[k in U]: infer R}
// ↓
// T extendsを前段に置く
type MyPickValue<T, U extends keyof T>= T extends {[k in U]: infer R}
```
そもそも”？”や“:”がなく、条件型にはなっていない上、Rが未使用である旨のエラーが出ています。
> '?' expected.
> 'R' is declared but its value is never read.

最後は、目的の値を返すように条件型を整えれば完成です。
```typescript
// type MyPickUnion<T, U extends keyof T>= {[k in U]: T[k]}
// ↓
// 抽出したいものをinfer Rとする
// type MyPickValue<T, U extends keyof T>= {[k in U]: infer R}
// ↓
// T extendsを前段に置く
// type MyPickValue<T, U extends keyof T>= T extends {[k in U]: infer R}
// ↓
// ?や:を補って整える。返したいのはR
type MyPickValue<T, U extends keyof T>= T extends {[k in U]: infer R} ? R: never
```
いきなり最終系をみると困惑するかもしれませんが、ここまで順を追うと納得できるのではないでしょうか。
文法さえ間違っていなければ、TypeScript側で「推論」された型が返ってくるはずです。
章頭の例題も同様の流れで導出できそうです[^3]。
```typescript
// 関数そのものの表現を返却し、ジェネリクスの中で検証してエラーが出ないことを確認する（任意）
// type MyReturnType<T extends (...args: any[]) => string> = T
// ↓
// 関数の表現をジェネリクスの外に出し、 = の右辺に持ってくる
// type MyReturnType<T> = (...args: any[]) => string
// ↓
// 取り出したいもの（今回はstring）をinfer Rに置き換える
// type MyReturnType<T> = (...args: any[]) => infer R
// ↓
// 条件型にして足りないシンボルを補う
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never 
```

[^3]: さらっと流していますが、スタートとして使える表現を導出するまでが大変かもしれません。

長々と書きましたが、以下の３点がinferで重要なポイントです。
1. inferはextends句を伴う条件型でしか使えない
1. inferは一時変数のようなもの
1. その型は型推論に基づいて決定される

慣れは必要ですが、使いこなせるようになりたいですね。

# まとめ
今回は、type-challenges初級突破に必要な概念のうち、基本から外れてそうなものをまとめてみました。
この記事を取っ掛かりにしてtype-challengesに挑戦してくれる方々が増えれば喜ばしい限りです。


