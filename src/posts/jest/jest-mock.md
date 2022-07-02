---
title: Jest再入門 - 関数・モジュールモック編
author: noboru-kudo
date: 2022-07-03
templateEngineOverride: md
prevPage: ./src/posts/jest/jest-snapshot-testing.md
# nextPage:
---

単体テストでは、テストを不安定化させる要因となる外部サービス、データベース等のステートフルなモジュールへの依存は極力避けるべきです。
これを実現するには、モックやスタブが必要になってきます。
Jestはモック機能が標準で備わっています。今回はJestのモック機能を見ていきましょう。

[[TOC]]

## 関数のモック化

### 基本的な使い方

Jestが提供するモック機能の最も基本的なものです。関数や関数式をモックにします。
使い方は簡単です。

```typescript
test("基本的な使い方", () => {
  const mockFn = jest.fn((a: number) => a * 10);
  mockFn(1);
  mockFn(2);

  expect(mockFn.mock.calls).toHaveLength(2);

  expect(mockFn.mock.calls[0][0]).toBe(1); // 1回目の呼出の引数
  expect(mockFn.mock.calls[1][0]).toBe(2); // 2回目の呼出の引数

  expect(mockFn.mock.results[0].value).toBe(10); // 1回目の呼出の戻り値
  expect(mockFn.mock.results[1].value).toBe(20); // 2回目の呼出の戻り値
});
```

上記はjest.fnを使ってモック関数を作成しています。引数にモックの内容を指定します。指定しない場合は固定でundefinedを返す関数になります。
その後はモック化された関数のmockプロパティに含まれるトレース内容を使って、引数や戻り値の内容を検査しています。ただし、このようなことをするよりも、大抵は後述するモック用のマッチャーを使うことが多いです。

このサンプルでは直接モック関数を呼び出していますが、実際にはこのモック関数をテスト対象に差し込んでいく形になります。

### モック関数の戻り値を指定する

先程はjest.fnの引数にモックの内容を指定しましたが、一般的にはモック関数(jest.Mock型)の持つ各種メソッドを利用することが多いです。
以下のような形で指定します。

```typescript
test("戻り値を指定する", () => {
  const syncFunc1 = jest.fn().mockImplementation(() => 1);
  const syncFunc2 = jest.fn().mockReturnValue(1);

  syncFunc1(); // 1
  syncFunc2(); // 1
});
```

syncFunc1とsyncFunc2で、2種類のやり方を記述していますが、両者の内容は同じです。
基本形はmockImplementationです。ここで先程jest.fnの引数に記述したように、モックする内容を関数として記述します。

mockReturnValueはmockImplementationのシンタックスシュガーで、引数にはモック関数の戻り値を直接記述します。
モック関数が固定の値(含むオブジェクト)を返す場合は、こちらを利用する方がシンプルです。
ただし、例外を送出するケース等には対応していませんので、そのような場合はmockImplementationを利用する必要があります。

このシンタックスシュガーはPromiseベースの関数向けにも用意されています。

```typescript
test("戻り値を指定する(Promise)", async () => {
  const asyncFunc1 = jest.fn().mockResolvedValue(1);
  const asyncFunc2 = jest.fn().mockRejectedValue(new Error("async error"));

  await asyncFunc1(); // 1
  await asyncFunc2(); // throw Error("async error")
});
```

Promiseを成功させる場合はmockResolvedValue、失敗させる場合はmockRejectedValueを利用します。
ほとんどのケースでモックは固定値を使うことが多いと思いますので、基本的にはmockReturnValue / mockResolvedValue / mockRejectedValueを使い、対応できない場合のみmockImplementationで代用すると良いでしょう。

### 呼出タイミングによって戻り値を変える
モック関数を呼び出すタイミングによって戻り値を変更したい場合は以下を使います。

```typescript
test("呼出タイミングで戻り値を変更する", () => {
  const syncFunc = jest.fn()
    .mockReturnValueOnce(1)
    .mockReturnValueOnce(2)
    .mockReturnValue(0);

  syncFunc(); // 1(1回目の呼出)
  syncFunc(); // 2(2回目の呼出)
  syncFunc(); // 0(デフォルト)
  syncFunc(); // 0(デフォルト)
});
```

上記はメソッドチェーンで呼出タイミングごとに戻り値を指定しています。
まず、mockReturnValueOnceを2回呼び出しています。これで、それぞれ1回目、2回目の呼出時に戻り値を変えています。
最後のmockReturnValueでは3回目以降の呼出し全てに適用されるデフォルトです。 これを指定しない場合は、3回目以降はundefinedが戻り値になります。

もちろんこれは、mockImplementationやmockResolvedValue等でも同様に利用できます。

### モック用のマッチャー

先程はモック関数のmockプロパティの中身を検査しましたが、Jestではモック用のカスタムマッチャーが用意されています。
よく利用するものだと、以下のようなものがあります。

```typescript
test("モック用のマッチャー", () => {
  const mockFunc = jest.fn().mockReturnValue(100);

  // 2回呼出
  mockFunc(1);
  mockFunc(2);

  expect(mockFunc).toHaveBeenCalled();
  expect(mockFunc).toBeCalled(); // alias

  expect(mockFunc).toHaveBeenCalledTimes(2);
  expect(mockFunc).toBeCalledTimes(2); // alias

  expect(mockFunc).toHaveBeenNthCalledWith(1, 1); // 1回目の呼出の引数
  expect(mockFunc).toHaveBeenLastCalledWith(2); // 最後の呼出の引数

  expect(mockFunc).toHaveReturned();
  expect(mockFunc).toHaveReturnedTimes(2);
  expect(mockFunc).toHaveNthReturnedWith(1, 100); // 1回目の戻り値
  expect(mockFunc).toHaveLastReturnedWith(100); // 最後の呼出の戻り値

  expect(mockFunc).toMatchSnapshot(); // スナップショットテスト(モックの全呼び出しの引数・戻り値が前回実行時から変わっていないこと)
});
```

それぞれのマッチャーは名前から自明だと思います。このマッチャーで引数や戻り値を検査しています。先程のmockプロパティを使うよりこちらを使うほうが可読性の点で好ましいでしょう。

最後の検査ではスナップショットテストを利用しています。
この場合はスナップショットファイルには以下のように記録されます。

```
exports[`mock モック用のマッチャー 1`] = `
[MockFunction] {
  "calls": Array [
    Array [
      1,
    ],
    Array [
      2,
    ],
  ],
  "results": Array [
    Object {
      "type": "return",
      "value": 100,
    },
    Object {
      "type": "return",
      "value": 100,
    },
  ],
}
`;
```

このように、前回実行時の引数、戻り値をスナップショットとして保存することで、変更によるデグレが発生していないことを確認できます。
スナップショットテストについては、以下の記事を参照してください。

- [Jest再入門 - スナップショットテスト編](/testing/jest/jest-snapshot-testing/)

## モジュールのモック化

一般的にアプリケーションはexport/importでモジュール化して利用することがほとんどです。
ここではJestのモジュールモックについて見ていきます。

### オブジェクトモジュール

まずは、関数を含むオブジェクトをexportしたモジュールをモック化するケースを見てみます。
以下のモジュールを作成しました。

```typescript
// src/random.ts
const random = {
  randomModule: () => Math.random(),
};

export { random };
```

randomモジュールはランダム値を返すrandomModule関数を持っています。
次に、このモジュール利用する側です。

```typescript
// src/sample-handler.ts
import { random } from "./random";

export function calculate(): number {
  return random.randomModule();
}
```

先程のrandomモジュールをimportし、calculateメソッド内で呼び出しています。
これをテスト対象とします。このとき実行の都度結果が変わるrandomモジュールをモック化するものとします。

テストコードは以下のようになります。

```typescript
import { random } from "../src/random";
jest.mock("../src/random");

test("Objectとしてexportしたモジュールのモック化", () => {
  const mockModule = random as jest.Mocked<typeof random>;
  mockModule.randomModule.mockReturnValue(100);

  calculate(); // 100
 
  expect(mockModule.randomModule).toHaveBeenCalledTimes(1);
});
```

トップレベルで`jest.mock("../src/random")`を呼び出します。これを実行するとJestはこのモジュール全体をモックにします。
オプションですが、第2引数にモック化する内容についても記述可能です([module factory](https://jestjs.io/docs/jest-object#jestdomockmodulename-factory-options))。

この状態ではrandomモジュールの関数の呼出はundefinedが返ってきますが、これではテストがしにくいので、その後でrandomModuleの戻り値を固定値に変更しています。
具体的には、モック化されたrandomモジュールのrandomModule関数をmockReturnValueで戻り値を固定にします。
ただし、TypeScriptの場合は、これがモック化されたものであるのかコンパイラが判別できず、そのままではmockReturnValueが呼び出せません。
このため、事前に対象モジュールをjest.Mockedにキャストしています。jest.Mocked以外でも対象の型に応じたものがJestのindex.d.tsに用意されていますので、モック対象に応じて適宜確認すると良いでしょう。

### 関数モジュール

次は、関数としてexportしたモジュールに対してモックを適用します。

```typescript
// src/random.ts
export function randomFunc(): number {
  return Math.random();
}
```

ランダム値を返すrandomFunc関数を直接exportしています。
次に、このモジュールを利用する側です。

```typescript
// src/sample-handler.ts
import { randomFunc } from "./random";

export function calculate2(): number {
  return randomFunc();
}
```

これも先程同様にrandomFuncをモック化して、戻り値を固定にします。

```typescript
import { randomFunc } from "../src/random";
jest.mock("../src/random");

test("関数としてexportしたモジュールのモック化", () => {
  const mockFunc = randomFunc as jest.MockedFunction<typeof randomFunc>;
  mockFunc.mockReturnValue(100);

  calculate2(); // 100

  expect(randomFunc).toHaveBeenCalledTimes(1);
});
```

先程とほとんど同じです。jest.mockを使ってモジュールをモック化し、mockReturnValueで固定値を返すようにしています。
違いとしては、今回はFunction自体を対象としているので、キャストしている部分が、jest.Mockedでなくjest.MockedFunctionにしているところくらいです。

### クラスモジュール

次はClassとしてexportしたモジュールをモック化するケースを見てみます。
以下のモジュールを作成しました。

```typescript
// src/RandomService.ts
export default class RandomService {
  random(): number {
    return Math.random();
  }
}
```

ランダム値を返すrandomメソッドを持つRandomServiceをexportしています。
次に、このモジュールを利用する側です。

```typescript
// src/sample-handler.ts
import RandomService from "./RandomService";

export function calculate3(): number {
  return new RandomService().random();
}
```

RandomServiceクラスをインスタンス化して、メソッドrandomを呼び出しています。
では、このクラスをモック化してみましょう。

```typescript
import RandomService from "../src/RandomService";
jest.mock("../src/RandomService");

test("Classとしてexportしたモジュールをモック化 - メソッド", () => {
  const mockMethod = RandomService.prototype.random as jest.MockedFunction<typeof RandomService.prototype.random>;
  mockMethod.mockReturnValue(100);
  
  calculate3(); // 100

  expect(mockMethod).toHaveBeenCalledTimes(1);
});
```

こちらも先程と大きく変わることはありません。jest.mockを使ってクラスをモック化し、そのメソッドをmockReturnValueで固定値を返すようにしています。
TypeScript向けのキャストもほとんど同じですが、対象はインスタンスメソッドなので、RandomService.prototype.randomとしました。
ちなみに、もしrandomをstaticメソッドとして定義した場合は以下のようにします。

```typescript
test("Classとしてexportしたモジュールをモック化 - staticメソッド", () => {
  const mockStaticMethod = RandomUtil.random as jest.MockedFunction<typeof RandomUtil.random>;
  mockStaticMethod.mockReturnValue(100);
  calculate3(); // 100
});
```

### マニュアルモック

これまではJestの自動モック機能によって、jest.mockで指定したモジュールを自動でモック化(Auto Mock)してきました。
Jestにはマニュアルモック（Manual Mock）というやり方もあります。 
マニュアルモックは一般的にはスタブという言葉が分かりやすいと思います。
モック化対象を手動で作成したスタブモジュールに置き換えて実行します。

ここではUUID生成ライブラリの[uuid](https://www.npmjs.com/package/uuid)のモック化を実施してみます。
このライブラリで生成するv4タイプのUUIDはテストによって実行結果が変わるため、スタブ化してどのテストも固定値を返すようにします。

プロジェクトルートに`__mocks__`というディレクトリを作成します。このディレクトリ名はJestで決められたルールです。
このディレクトリ内にuuid.tsを作成します。ここでは以下の内容にしました。

```typescript
// <rootDir>/__mocks__/uuid.ts
const v4 = () => "00000000-0000-0000-0000-000000000000";
export { v4 };
```

ゼロ埋めのUUIDを固定で返すモジュールをexportしています。
このようにするとJestはテスト実行時にuuid.v4が呼び出されると、この固定値を返すようになります。

これを確認するテストは以下のようになります。

```typescript
import { v4 as uuidv4 } from "uuid";

test("マニュアルモック", () => {
  expect(uuidv4()).toBe("00000000-0000-0000-0000-000000000000");
});
```

先程のようにjest.mockは不要です。Jestが該当のマニュアルモックを検知して適用します。
このようにすると、各テストでモックの記述が不要になりますので、一律スタブ化したい場合はこのマニュアルモックを使うと良いかと思います。

なお、node.jsに組み込まれているものや自作モジュールに対してマニュアルモックを適用する場合は、明示的にjest.mockの指定は必要となりますので注意してください。

マニュアルモックの詳細は[公式ドキュメント](https://jestjs.io/docs/manual-mocks)を参照してください。

### 部分的なモック

ケースによっては、モジュールの一部のメソッドのみをモック(Partial Mock)にしたいというケースもあります。
以下のモジュールを作成したとします。

```typescript
// src/foo-bar.ts
const fooBar = {
  foo: () => "foo",
  bar: () => "bar",
};

export default fooBar;
```

ここでfooBarモジュールのfooメソッドのみをモックにしたいと仮定します。

```typescript
import fooBar from "./foo-bar";

test("部分モック", () => {
  const spy = jest.spyOn(fooBar, "foo").mockReturnValue("mock");
  expect(fooBar.foo()).toBe("mock");
  expect(fooBar.bar()).toBe("bar");
  expect(spy).toHaveBeenCalledTimes(1);
});
```

上記のテストは成功します。
これは、jest.spyOnでfooBarモジュールのfooメソッドで固定値`mock`を返すようにしているからです。
一方で、barメソッドについてはモックではなく実体が使われるため、`bar`がそのまま返ってきます。
spyも他のモック同様に、モック用のマッチャーで呼出内容の検査ができます。

:::info
[公式ドキュメント](https://jestjs.io/docs/mock-functions#mocking-partials)では、jest.mockメソッドのmodule factoryを使用した方法も紹介されています。
この場合は、以下の記述になります。

```typescript
import fooBar from "./foo-bar";
jest.mock("./foo-bar", () => {
  const original = jest.requireActual("./foo-bar");
  return {
    __esModule: true,
    ...original,
    default: {
      foo: () => "mock",
      bar: original.default.bar,
    },
  };
});
test("部分モック", () => {
  expect(fooBar.foo()).toBe("mock");
  expect(fooBar.bar()).toBe("bar");
});
```

テスト本文自体はシンプルになりますが、モック化の難易度が高く、利用するモチベーションが感じられなかったため、簡易的な紹介とします。
詳細は上記公式ドキュメントを参照してください（今後大きなメリットを感じたら加筆修正します）。
:::

---

次回はタイマーモック編に続きます。

---
関連記事

- [Jest再入門 - 導入編](/testing/jest/jest-intro/)
- [Jest再入門 - マッチャー編](/testing/jest/jest-matchers/)
- [Jest再入門 - スナップショットテスト編](/testing/jest/jest-snapshot-testing/)

---
参照資料

- [Jest公式ドキュメント](https://jestjs.io/docs/getting-started)
