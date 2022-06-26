---
title: Jest再入門 - マッチャー編
author: noboru-kudo
date: 2022-06-26
templateEngineOverride: md
prevPage: ./src/posts/jest/jest-intro.md
---

Jestはオールインワンのテストフレームワークです。
テストランナーだけでなく、各種マッチャーもJest内でExpect APIとして提供されています。
利用方法は[Jasmine](https://jasmine.github.io/)とほとんど同じで、こちらの利用経験があれば戸惑うことはないはずです。

ここでは、よく利用するものについて筆者の独断でピックアップして、カテゴリ別にまとめます。
全てのマッチャーは以下公式ドキュメントを参照してください。
- [Jest APIリファレンス - Expect](https://jestjs.io/docs/expect)

[[TOC]]

## プリミティブ型の等価条件

string/number/boolean等のプリミティブ型の値を等価チェックする場合は、[toBe](https://jestjs.io/docs/expect#tobevalue)を利用します。

```typescript
test("expect.toBe", () => {
  // 以下はチェックOK
  expect("foo").toBe("foo");
  expect(1).toBe(1);
  expect(true).toBe(true);

  // 参照先の異なるオブジェクト同士の等価条件は判定できない
  const foo = { foo: "bar" };
  expect(foo).not.toBe({ foo: "bar" });
  expect(foo).toBe(foo); // 同じインスタンスはOK
});
```

Jest内部では[Object.is()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is)メソッドで値の等価であるかを判定しています。
このため、参照先の異なるオブジェクトの比較は期待通りに動作しません。

## オブジェクト/配列の等価条件

オブジェクト/配列の等価チェックには[toEqual](https://jestjs.io/docs/expect#toequalvalue)/[toStrictEqual](https://jestjs.io/docs/expect#tostrictequalvalue)を利用します。
オブジェクトのプロパティを再帰的に走査して、値が等価であることをチェックします。

```typescript
test("expect.toEqual/toStrictEqual", () => {
  expect({ foo: "bar" }).toEqual({ foo: "bar" });
  expect({ foo: "bar" }).toStrictEqual({ foo: "bar" });
  expect([1, 2, 3]).toEqual([1, 2, 3]);
  expect([1, 2, 3]).toStrictEqual([1, 2, 3]);
});
```

上記のように、toBeとは異なりオブジェクトや配列内の値をチェックできます。

toEqualとtoStrictEqualでは、undefinedの扱い方等でその厳密性に違いがあります。以下コードはその違いを表しています。

```typescript
test("toEqual/toStrictEqual違い", () => {
  class ClassA {
    foo = "bar";
  }

  // toEqual
  expect({ foo: undefined }).toEqual({});
  expect([, 1]).toEqual([undefined, 1]);
  expect(new ClassA()).toEqual({ foo: "bar" });
  // toStrictEqual
  expect({ foo: undefined }).not.toStrictEqual({});
  expect([, 1]).not.toStrictEqual([undefined, 1]);
  expect(new ClassA()).not.toStrictEqual({ foo: "bar" });
});
```
基本はtoEqualで問題ないと思いますが、厳密性が求められる場合は、toStrictEqualを使うと良いでしょう。

:::info
テスト観点でないプロパティやタイムスタンプ等、テスト実行の度に変わるものは、等価条件以外で検証したいこともあるでしょう。
そのような場合は、Expect APIで用意されているユーティリティとしてのマッチャーを使うと便利です。

```typescript
test("expectマッチャーユーティリティ利用", () => {
  const obj = {
    foo: "bar",
    count: 10,
    id: "123-456",
    nested: { hoge: true, fuga: false },
    array: [1, 2, 3],
  };
  expect(obj).toEqual({
    foo: expect.any(String), // String
    count: expect.anything(), // 値は何でもOK
    id: expect.stringMatching(/\d{3}-\d{3}/), // 正規表現
    nested: expect.objectContaining({ hoge: true }), // 指定したkey-valueが含まれていること
    array: expect.arrayContaining([1, 2]), // 配列に要素が含まれていること
  });
});
```
:::

## Truthy/Falsy

JavaScriptのTruthy(真値)/Falsy(偽値)の検証は[toBeTruthy](https://jestjs.io/docs/expect#tobetruthy)/[toBeFalsy](https://jestjs.io/docs/expect#tobefalsy)を使用します。

```typescript
test("toBeTruthy/toBeFalsy", () => {
  expect(true).toBeTruthy();
  expect(false).toBeFalsy();

  expect("foo").toBeTruthy(); // 空文字以外はtruthy
  expect(1).toBeTruthy(); // 空文字以外はtruthy
  expect({}).toBeTruthy(); // オブジェクトはtruthy
  expect([]).toBeTruthy(); // 配列はtruthy
  expect(undefined).toBeFalsy(); // undefined/nullはfalsy
  expect(0).toBeFalsy(); // 0はfalsy
  expect("").toBeFalsy(); // 空文字はfalsy
});
```

よく勘違いされるのですが、toBeTruthy/toBeFalsyはboolean型の値判定ではありません。
上記のように、文字列やオブジェクト型等もその値の内容に応じて判定されます。
厳密にboolean型の`true`/`false`で判定したい場合は、`toBe(true)`/`toBe(false)`を利用すると良いでしょう。

詳細なTruthy/Falsyの判定方法については、以下を参照してください。

- [MDN - Truthy](https://developer.mozilla.org/ja/docs/Glossary/Truthy)
- [MDN - Falsy](https://developer.mozilla.org/ja/docs/Glossary/Falsy)

## undefined/null

undefinedやnullを検査する場合は、[toBeDefined](https://jestjs.io/docs/expect#tobedefined)/[toBeUndefined](https://jestjs.io/docs/expect#tobeundefined)、[toBeNull](https://jestjs.io/docs/expect#tobenull)を利用します。

```typescript
test("toBeUndefined/toBeNull/toBeDefined", () => {
  expect(undefined).toBeUndefined();
  expect("foo").toBeDefined();
  expect(null).toBeDefined(); // nullはundefinedではない

  expect(null).toBeNull();
  expect("foo").not.toBeNull();
  expect(undefined).not.toBeNull(); // undefinedはnullではない
});
```

もちろん、これらは`toBe(undefined)`や`toBe(null)`等でも代用可能です。
パラメタライズドテスト等で利用する場合は、こちらを利用することが多いと思います。

## 配列長、文字数

配列や文字数等の`length`プロパティを検査する場合は、[toHaveLength](https://jestjs.io/docs/expect#tohavelengthnumber)を利用します。

```typescript
test("toHaveLength", () => {
  expect("foo").toHaveLength(3);
  expect([1, 2, 3]).toHaveLength(3);
});
```

これらは、`expect([1, 2, 3].length).toBe(3)`等としても同じですが、toHaveLengthを使用した方が可読性は高いでしょう。

## 正規表現

文字列を正規表現で判定する場合は、[toMatch](https://jestjs.io/docs/expect#tomatchregexp--string)を利用します。

```typescript
test("toMatch", () => {
  expect("foo12345").toMatch(/foo\d{5}/); // 正規表現・部分一致
  expect("foo12345").toMatch(/^foo\d{5}$/); // 正規表現・全体一致
  expect("foo12345").toMatch("foo"); // 部分一致
});
```

3つ目の例のように、正規表現でなくとも特定の文字列が含まれているのかを検査する場合にも使用できます。

## 配列要素

配列に指定した要素が含まれていることを検査する場合には、[toContain](https://jestjs.io/docs/expect#tocontainitem)/[toContainEqual](https://jestjs.io/docs/expect#tocontainequalitem)を利用します。

```typescript
test("toContain/toContainEqual", () => {
  expect(["foo", "bar"]).toContain("foo");
  expect([{ foo: "bar" }, { foo: "hoge" }]).toContainEqual({ foo: "bar" });
});
```

配列要素がプリミティブ型の場合はtoContain、オブジェクト型の場合はtoContainEqualを使用します。

## 例外送出

例外送出を検査する場合は、[toThrow](https://jestjs.io/docs/expect#tothrowerror)を利用します。

```typescript
test("toThrow", () => {
  class CustomError extends Error {}
  const throwError = () => {
    throw new CustomError("エラー発生");
  };
  expect(throwError).toThrow(); // エラーになることを検証
  expect(throwError).toThrow(CustomError); // 送出したエラーの型判定
  expect(throwError).toThrow(new Error("エラー発生")); // Errorオブジェクト(messageプロパティ一致)
  expect(throwError).toThrow("エラー発生"); // messageプロパティの値
  expect(throwError).toThrow(/^エラー.*$/); // messageプロパティの値(正規表現)
});
```
toThrowを利用する場合は、expectの引数には値でなくテスト対象のメソッドを指定します。

toThrowの引数を省略すると、エラーが送出されたことのみを検証します。
上記のように、引数には送出した型やErrorオブジェクト、Errorのmessageプロパティを指定できます。

カスタムエラー等で定義したmessage以外のプロパティを検査する場合は従来通りtry-catchでラップする必要があります。
例えば、カスタムエラーとして追加定義したcodeプロパティを検査する場合は以下のようになります。

```typescript
test("message以外を検査", () => {
  class CustomError extends Error {
    constructor(message: string, readonly code: string) {
      super(message);
    }
  }
  const throwError = () => {
    throw new CustomError("エラー発生", "E001");
  };
  try {
    throwError();
    fail();
  } catch (e) {
    expect(e).toBeInstanceOf(CustomError);
    expect((e as CustomError).code).toBe("E001"); // codeプロパティを検査
  }
});
```

注意点としてテストが正常に終了した場合に`fail()`を呼び出し、エラーが発生しなかった場合にテストを失敗させる必要があります。
これを忘れると意図せずテスト対象でエラーが発生しなかった場合に、テストが成功してしまいます。

---

これ以外にも、モックやスナップショットテストに関するマッチャーも用意されています。
これらは、それぞれの記事(モック編、スナップショットテスト編)に掲載予定です。

---
参照資料

- [Jest公式ドキュメント](https://jestjs.io/docs/getting-started)
