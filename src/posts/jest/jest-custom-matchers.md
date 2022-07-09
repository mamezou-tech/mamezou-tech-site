---
title: Jest再入門 - カスタムマッチャー作成編
author: noboru-kudo
date: 2022-07-10
templateEngineOverride: md
prevPage: ./src/posts/jest/jest-mock.md
---

Jest再入門シリーズの最後はカスタムマッチャーの作成にチャレンジします。
JestのExpect APIには、組み込みで多くのマッチャーが提供されていますが、これだけでは不足するケースや複雑なアサートを書かざるを得ないケースが往々にしてあります。

そんなときは、Jestのカスタムマッチャーを作成して、テストをシンプルにしていきましょう。

:::info
カスタムマッチャーにはJestコミュニティで開発・公開されているものもあります。
有用なカスタムマッチャーが多数提供されていますので、必要に応じて導入すると良いでしょう。

- [jest-extended](https://github.com/jest-community/jest-extended)
:::

[[TOC]]

## カスタムマッチャーの基本
シンプルなケースでカスタムマッチャーを作成します。
ここではUUIDのフォーマットが正しいことを検証するマッチャーを作成してみましょう。

まずは、Jestのカスタムマッチャーです。テストファイルに以下を記述します。

```typescript
expect.extend({
  toBeUUID(received: unknown): jest.CustomMatcherResult {
    if (typeof received !== "string") throw new Error("actual value must be a string");
    const pass = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/.test(received);
    const message = () => {
      return pass
        ? `期待値: Not UUIDフォーマット、テスト結果: ${received}(UUIDフォーマット)`
        : `期待値: UUIDフォーマット、テスト結果: ${received}(Not UUIDフォーマット)`;
    };
    return {
      pass,
      message,
    };
  },
});
```

上記がカスタムマッチャーの基本形です。
jest.extendの引数にカスタムマッチャーとなるFunctionを定義します。
カスタムマッチャーの定義は以下になります。

```typescript
type MatcherContext = MatcherUtils & Readonly<MatcherState>;
type CustomMatcher = (
    this: MatcherContext,
    received: any,
    ...actual: any[]
) => CustomMatcherResult | Promise<CustomMatcherResult>;
```

引数としてテスト対象の値を受け取り、戻り値として、jest.CustomMatcherResultを返します。
jest.CustomMatcherResultの型定義は以下のようになります。

```typescript
interface CustomMatcherResult {
    pass: boolean;
    message: () => string;
}
```
passに検査結果、messageがテスト失敗時のメッセージです。
ここでは正規表現による一致を検査し、trueまたはfalseをpassに指定しています。
message指定時は注意が必要です。passがtrueだからと言ってテストが成功する訳ではありません。
これは`expect("foo").not.toBe("bar")`のように否定のケースがあるためです。
上記では、その点を考慮してpassがtrueでも、notを指定した場合のmessageも定義しています（3項演算子の部分）。

このカスタムマッチャーを使ったテストは以下のように記述できます。

```typescript
test("UUIDフォーマットマッチャー", () => {
  expect("00000000-0000-0000-0000-000000000000").toBeUUID();
  expect("foo").not.toBeUUID();
});
```

使い方は、Jestの組み込みマッチャーと同様です。
TypeScriptの場合は、これだけではコンパイラが追加したカスタムマッチャーを認識できません。
この場合は、d.tsファイルを作成するのが一般的です。
名前は任意ですが、以下のようなd.tsファイルを作成します。

```typescript
export interface CustomMatchers<R = unknown> {
  toBeUUID(): R;
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R> {}
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}
```

CustomMatcherにTypeScriptが認識可能なマッチャーのインターフェースを記述し、その下のdeclare内でjestの既存インターフェースにマージしています。

これで準備は完了です。後は通常のテスト同様に上記テストは成功します。
テストが失敗する場合は以下のような出力となります。

```shell
  ● カスタムマッチャー › UUIDフォーマットマッチャー

    期待値: UUIDフォーマット、テスト結果: 00000000-0000-0000-0000-00000000000(Not UUIDフォーマット)

      51 | describe("カスタムマッチャー", () => {
      52 |   test("UUIDフォーマットマッチャー", () => {
    > 53 |     expect("00000000-0000-0000-0000-00000000000").toBeUUID();
         |                                                   ^
      54 |     expect("foo").not.toBeUUID();
      55 |   });
      56 |
```

テストが失敗して、messageに設定した内容が表示されていることが分かります。

:::info
自作のマッチャーはゼロベースで作成するのではなく、Jest本体のマッチャーの実装を参考に作成するのがお勧めです。

- <https://github.com/facebook/jest/blob/main/packages/expect/src/matchers.ts>
:::

## 期待値を受け取るパターン

次は、比較対象の期待値を受け取るパターンを作成します。さらに今回はJestで用意されているユーティリティで出力結果の見栄えを良くしてみましょう。
ここでは、文字列を大文字小文字を区別せずに比較するtoMatchCaseInsensitiveマッチャーを作成します。
まずは先程同様にマッチャーを作成し、先程のextendに追加しましょう。

```typescript
expect.extend({
  // (省略)
  toMatchCaseInsensitive(received: unknown, expected: string): jest.CustomMatcherResult {
    if (typeof received !== "string") throw new Error("actual value must be a string");
    const pass = Object.is(received.toLowerCase(), expected.toLowerCase());
    const message = () => {
      const hint = this.utils.matcherHint("toMatchCaseInsensitive", received, expected, {
        isNot: this.isNot,
        promise: this.promise,
        comment: "何か違う。。",
      });
      const diff = this.utils.printDiffOrStringify(
        received.toLowerCase(),
        expected.toLowerCase(),
        "期待値",
        "実際値",
        this.expand !== false
      );
      return hint + "\n\n" + diff;
    };
    return {
      pass,
      message,
    };
  },
});
```
今回は期待値を受け取るので、引数にexpectedを追加しています。検証は期待値(expected)、実際値(received)を小文字に変換して比較(Object.is)します。
message部分ですが、今回はJestのユーティリティ([jest-matcher-utility](https://github.com/facebook/jest/tree/main/packages/jest-matcher-utils))で用意されているものを活用しています。
これは、カスタムマッチャー内のthis.utilsで呼出しできます。今回はmatcherHint/printDiffOrStringifyを利用してmessageを構築しました。

後はd.tsファイルにこのマッチャーのエントリーを追加して、テストを記述するだけです(d.tsファイルは先程のCustomMatcherに追加するだけですので割愛します)。
テストは以下のようになります。

```typescript
test("大文字小文字区別しないマッチャー", () => {
  expect("foo").toMatchCaseInsensitive("Foo");
  expect("foo").not.toMatchCaseInsensitive("BAR");
});
```

上記テストは成功します。失敗すると以下のように表示されます。

```shell
  ● カスタムマッチャー › 大文字小文字区別しないマッチャー

    expect(foo).toMatchCaseInsensitive(Fooa) // 何か違う。。

    期待値: "foo"
    実際値: "fooa"

      61 |   test("大文字小文字区別しないマッチャー", () => {
      62 |     // expect("a").toBe("b")
    > 63 |     expect("foo").toMatchCaseInsensitive("Fooa");
         |                   ^
      64 |     expect("foo").not.toMatchCaseInsensitive("BAR");
      65 |   });
      66 |
```

先程よりも出力結果が見やすくなっていることが分かります。

## スナップショットテストのカスタムマッチャー

カスタムマッチャーはスナップショットテスト[^1]にも適用できます。
ここではJSON形式でpayloadフィールド配下のみをスナップショットテストするカスタムマッチャーを作成してみます。

[^1]: スナップショットテストは [Jest再入門 - スナップショットテスト編](/testing/jest/jest-snapshot-testing/)を参照してください。

スナップショットテストのカスタムマッチャーはJestが提供する[jest-snapshot](https://github.com/facebook/jest/tree/main/packages/jest-snapshot)を包含する形で作成します。
以下のようになります。

```typescript
import { SnapshotState, toMatchSnapshot } from "jest-snapshot";

expect.extend({
  // (省略)

  toMatchPayloadSnapshot(received: {
    [key: string]: unknown;
  }): jest.CustomMatcherResult | Promise<jest.CustomMatcherResult> {
    if (typeof received !== "object") throw new Error("actual value must be a object");
    if (!("payload" in received)) throw new Error("payload not found");
    const thisInstance = this as jest.MatcherContext & { snapshotState: SnapshotState };
    return toMatchSnapshot.bind(thisInstance, received["payload"], "toMatchPayloadSnapshot")();
  },
});
```

ポイントはカスタムマッチャーの最後の`toMatchSnapshot.bind(...)`の部分です。
ここで、Jestが提供しているスナップショットテストのカスタムマッチャーにスナップショット検査を移譲しています。
現状はTypeScriptで型付けしようとすると、事前にthisをjest-snapshotが提供する型(`jest.MatcherContext & { snapshotState: SnapshotState }`)にキャストする必要がありました。

作成するテストは以下のようになります(先程同様にd.tsファイルは先程のCustomMatcherに追加するだけですので割愛します)。

```typescript
test("スナップショットテストのカスタムマッチャー", () => {
  const obj = {
    created: new Date().getTime(), // テスト対象外
    payload: { // テスト対象
      test: "foo-bar-hoge",
      count: 100,
    },
  };
  expect(obj).toMatchPayloadSnapshot();
});
```

createdフィールドはテストの都度結果が変わるようにしていますが、カスタムマッチャーはpayload配下のみを検証しますので、常にテストは成功します。
スナップショットテストなので、もちろんスナップショットファイルも更新されます。
payload配下を変更してテストを失敗させると、以下のような出力となります。

```shell
  ● カスタムマッチャー › スナップショットテストのカスタムマッチャー

    expect(received).toMatchSnapshot(hint)

    Snapshot name: `カスタムマッチャー スナップショットテストのカスタムマッチャー: toMatchPayloadSnapshot 1`

    - Snapshot  - 2
    + Received  + 2

      Object {
    -   "count": 100,
    -   "test": "foo-bar-hoge",
    +   "count": 200,
    +   "test": "foo-bar-hoge-fuga",
      }

      73 |       },
      74 |     };
    > 75 |     expect(obj).toMatchPayloadSnapshot();
         |                 ^
      76 |   });
      77 | });
      78 |
```

payload配下のみの差分がテスト失敗として検出されていることが分かります。

## カスタムマッチャーをテスト全体に適用する

これまで作成したカスタムマッチャーは、このままだと各テストファイル内でjest.extendを使って登録する必要があります。通常はデフォルトで使えるようにしたいと思います。
Jestではテストファイル実行時のフックポイントがあります。

- [Jestドキュメント - setupFilesAfterEnv](https://jestjs.io/docs/configuration#setupfilesafterenv-array)

最後の仕上げに今まで作成したカスタムマッチャーをテスト全体で利用できるようにしてみましょう。
まずはセットアップファイルを作成します。ここでは`specs/register-matchers.ts`というファイルを作成しました。

```typescript
import { SnapshotState, toMatchSnapshot } from "jest-snapshot";

expect.extend({
  toBeUUID(received: unknown): jest.CustomMatcherResult {
    // (省略)
  },

  toMatchCaseInsensitive(received: unknown, expected: string): jest.CustomMatcherResult {
    // (省略)
  },

  toMatchPayloadSnapshot(received: {
    [key: string]: unknown;
  }): jest.CustomMatcherResult | Promise<jest.CustomMatcherResult> {
    // (省略)
  },
});
```

今までテストファイル内で作成したカスタムマッチャーをこちらに移動します。
続いてjest.config.tsの設定を以下のように変更します。

```typescript
export default {
  // 追加(それ以外は変更不要)
  setupFilesAfterEnv: ["<rootDir>/specs/register-matchers.ts"],
};
```

`<rootDir>`はデフォルトではプロジェクトルートを指します。これで各テストファイル実行前にこのセットアップスクリプトが実行されるようになります。
各テストファイルではjest.extendの定義が不要で、作成したカスタムマッチャーがデフォルトで利用できるようになります。

## 終わりに
今回でJest再入門シリーズは最終回になります。
Jestは予め用意されたものを何となく使うことが多いですが、ゼロベースから導入するのも簡単で、これだけで単体テストのユースケースのほとんどを賄えることが理解いただけたでしょうか？
と偉そうなことを言いましたが、筆者も執筆していて気づいたことが結構多く、改めてJestの使い方を再認識しました。

Jest+TypeScriptはフロントエンドに限らず、バックエンドでも多く使われるようになってきたと思います。
本シリーズが皆さんの参考になれば幸いです。

---
関連記事

- [Jest再入門 - 導入編](/testing/jest/jest-intro/)
- [Jest再入門 - スナップショットテスト編](/testing/jest/jest-snapshot-testing/)
- [Jest再入門 - マッチャー編](/testing/jest/jest-matchers/)
- [Jest再入門 - 関数・モジュールモック編](/testing/jest/jest-mock/)

---
参照資料

- [Jest公式ドキュメント](https://jestjs.io/docs/getting-started)
