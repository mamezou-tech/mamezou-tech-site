---
title: Viteベースの高速テスティングフレームワークVitestを使ってみる
author: noboru-kudo
date: 2022-12-28
tags: ["テスト", vite]
---

現在JavaScriptのスタンダードなテスティングフレームワークと言えば、[Jest](https://jestjs.io/)かと思います。
Jestはそれ単体でテストランナー、マッチャーからモックまでテストに関する一通りの機能を網羅する万能なフレームワークです。
とはいえ、プロダクトがある程度の規模になってくるとテスト実行時間に不満を持っている方もいるかもしれません。

今回はJestに代わる新しいテスティングフレームワークの[Vitest](https://vitest.dev/)を試してみたいと思います。
VitestはWebpackに代わる高速ビルドツールの[Vite](https://vitejs.dev/)を基盤としています[^1]。
Viteのパイプラインとして実行されますので、テストも高速になるはずです。
Vitestの公式サイトでも、`Blazing Fast Unit Test Framework`と宣伝してるところからも期待できそうです。

また、API自体もJestと互換性を保つように設計されていますので、既存のJestベースのテストからの移行も比較的簡単にできそうです。

[^1]: [こちら](/blogs/2022/11/16/jamstack-survey-insight/)の記事でも言及してますが、Viteはフロントエンド向けの高速ビルドツールとしてかなりシェアを伸ばしています。

[[TOC]]

## Vitestを導入する

前述の通り、VitestはVite上で動作しますので、Vitestに加えてViteも導入します。
ここでは、それ以外にもTypeScriptとVitestのUI機能(後述)もインストールします。

```shell
# 任意のディレクトリを作成し以下を実施
npm init -y
npm install -D vite viest @vitest/ui typescript
# tsconfig.jsonを生成
tsc --init
```

ここでは現時点で最新のv0.26.1を導入しました。

次に、プロジェクトルート直下にViteの設定ファイル`vite.config.ts`を作成します[^2]。
ファイルの内容は以下にしました。

[^2]: Vitest専用の設定ファイル(vitest.config.ts)でも可能です。

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    globals: true,
  }
});
```

通常はdefineConfigにビルド設定を記述しますが、Vitestの設定は`test`配下に記述します。
ここでは`globals`をtrueとしています。これはJestのようにtest/itやExpect API等の利用頻度の高いAPIをimport不要でグローバルに利用するためです。
その他の設定可能な項目は、以下公式ドキュメントを参照してください。

- [Vitestドキュメント - Configuring Vitest](https://vitest.dev/config/)

:::column:グローバルなセットアップ処理
グローバルで使うテスト前処理やカスタムマッチャーを利用する場合は、セットアップファイルを用意し、`setupFiles`に指定します。

```typescript
export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["specs/register-matchers"] 
  }
});
```
:::

TypeScriptの`tsconfig.ts`は以下のようにしました。

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "noImplicitAny": false,
    "moduleResolution": "node",
    "types": [
      "vitest/globals" // 追加
    ]
  }
}
```

VitestのグローバルAPIをTypeScriptで認識できるようにtypesに`vitest/globals`を追加しています。

これで準備完了です。Jest同様にセットアップは簡単ですね。

## Vitestの基本構文

Jestで以前書いたものをVitestに置き換えてみました。
以下代表的なものを抜粋してみました。

```typescript
describe("Vitest", () => {
  beforeAll(() => {
    console.log("テストファイル開始前");
  });
  afterAll(() => {
    console.log("テストファイル終了後");
  });

  beforeEach(() => {
    console.log("テスト開始前");
  });
  afterEach(() => {
    console.log("テスト終了後");
  });

  test("マッチャー", () => {
    expect(1 + 1).toBe(2);

    expect({foo: "bar"}).toEqual({foo: "bar"});
    expect([1, 2, 3]).toStrictEqual([1, 2, 3]);

    expect(undefined).toBeUndefined();
    expect("foo").toBeDefined();

    expect(true).toBeTruthy();
    expect(false).toBeFalsy();

    expect(null).toBeNull();
    expect("foo").not.toBeNull();

    expect("foo").toHaveLength(3);
    expect([1, 2, 3]).toHaveLength(3);

    expect({foo: "bar", baz: "hoge"}).toHaveProperty("foo");
    expect(["foo", "bar"]).toContain("foo");
    expect([{foo: "bar"}, {foo: "hoge"}]).toContainEqual({foo: "bar"});
    expect("foo12345").toMatch(/foo\d{5}/);

    class CustomError extends Error {
    }

    const throwError = (message: string) => {
      throw new CustomError(message);
    };
    expect(() => throwError("")).toThrow(); // エラーになることを検証
    expect(() => throwError("")).toThrow(CustomError); // 送出したエラーの型判定
  });

  test.each`
    unitPrice | quantity | expected
    ${100}    | ${1}     | ${100}
    ${150}    | ${2}     | ${300}
    ${200}    | ${0}     | ${0}
  `(
    "パラメタライズドテスト:$unitPrice * $quantity = $expected",
    ({unitPrice, quantity, expected}) => {
      expect(unitPrice * quantity).toBe(expected);
    }
  );

  test("モック", () => {
    const mockFn = vi.fn((a: number) => a * 10);
    mockFn(1);
    mockFn(2);

    expect(mockFn.mock.calls).toHaveLength(2);

    expect(mockFn.mock.calls[0][0]).toBe(1); // 1回目の呼出の引数
    expect(mockFn.mock.calls[1][0]).toBe(2); // 2回目の呼出の引数

    expect(mockFn.mock.results[0].value).toBe(10); // 1回目の呼出の戻り値
    expect(mockFn.mock.results[1].value).toBe(20); // 1回目の呼出の戻り値
  });

  test("Expectマッチャーユーティリティ", () => {
    const obj = {
      foo: "bar",
      count: 10,
      id: "123-456",
      nested: {hoge: true, fuga: false},
      array: [1, 2, 3],
    };
    expect(obj).toEqual({
      foo: expect.any(String), // String
      count: expect.anything(), // 値は何でもOK
      id: expect.stringMatching(/\d{3}-\d{3}/), // 正規表現
      nested: expect.objectContaining({hoge: true}), // 指定したkey-valueが含まれていること
      array: expect.arrayContaining([1, 2]), // 配列に要素が含まれていること
    });
  });
  
  test("スナップショットテスト", () => {
    const html = `<div class="container">
  <article>
    <p class="title">UI生成結果</p>
  </article>
</div>`;
    expect(html).toMatchSnapshot();
  });
});
```

describeでのグルーピングや、before(All/Each)、after(All/Each)、test/itを使ったテスト記述、Expect APIのアサーションなどはJestと同じです。
`jest.fn`等のjest名前空間内の関数は`vi.fn`に変更すればそのまま使えました。

試してみた感じだと、100%とまではいきませんがJestで記述したテストがほぼそのまま使えました[^3]。
JestベースのテストをVitestへ移行するのは、かなりスムーズにできそうです。

[^3]: jestでグローバルに使えたfailは、VitestではExpect APIの一部でexpect.failとする必要がありました。

## コマンドラインからテストを実行する

コマンドラインからVitestを実行します。
実行コマンドは以下です。

```shell
npx vitest

>  DEV  v0.26.1 /Users/noboru-kudo/workspace/vitest
> 
>  (省略)
> 
> ✓ specs/vitest-basic.spec.ts (7)
>
>  Snapshots  1 written
> Test Files  1 passed (1)
>      Tests  7 passed (7)
>   Start at  23:05:34
>   Duration  839ms (transform 345ms, setup 14ms, collect 8ms, tests 15ms)
> 
>  PASS  Waiting for file changes...
>        press h to show help, press q to quit
```

Jestと違うのは、VitestではデフォルトがWatchモードとなります。
全テスト実行後は、ファイル変更を監視し、変更を検知すると関連のある部分のみをビルドしてテストを実行します。
この辺りはViteのHMR(Hot Module Replacement)が活用されています。
とにかく爆速ですので、普段の開発時はこちらを常に有効にしておくとリズムよく実装が進められそうです。
`q`キーを押すとWatchモードは終了します。

全テストを1回限り実行する場合は以下になります。

```shell
npx vitest run
```

CI等ではこちらを使うことになります。

テストファイルを複製して、同じ環境でJest/Vitestそれぞれで実行時間を計測してみました。

| ファイル数 | ケース数 | Jest実行時間 | Vitest実行時間 |
|-------|------|----------|------------|
| 10    | 70   | 9.6秒     | 1.5秒       |
| 20    | 140  | 12.0秒    | 2.7秒       |
| 50    | 350  | 16,4秒    | 6.0秒       |
| 100   | 700  | 23.3秒    | 11.6秒      |
| 1000  | 7000 | 254秒     | 176秒       |

Vitestは特に起動が早い印象で、Jestを圧倒する結果になりました。

## Vitestオリジナルの機能

Jestとの互換性に注目しがちですが、Vitestオリジナルの機能もあります。
発見したものをいくつかご紹介します。

### UIモード

VitestはCLIだけでなく、強力なUI機能も持っています。

- [Vitestドキュメント - Vitest UI](https://vitest.dev/guide/ui.html)

UI機能を試す場合は、`--ui`をつけて実行します。

```shell
npx vitest --ui
```

ブラウザが起動し、リッチなUI上でテストが実行されていることが確認できます。
このUIは、テスト結果の確認や再実行だけでなく、UI上でテストの修正もできます。
さらに、モジュールの依存関係グラフやTypeScriptの変換結果まで参照できます。

以下動画です。

![vitest ui](https://i.gyazo.com/3793f75b8dde77d5f890b8d3f89f8a69.gif)

テストコードは基本IDEで記述すると思いますが、その後のトライ＆エラーは視覚的に依存関係を確認できるUI機能を使うと便利そうです。

:::column:HTML形式のテストレポートを出力する
v0.26.0からこのUI機能にもとづいて、HTML形式のテストレポートが出力できるようになりました。

HTMLレポートを出力する場合は、`vite.config.ts`の設定を修正します。

```typescript
export default defineConfig({
  define: {
    vitest: undefined,
  },
  test: {
    globals: true,
    reporters: ["default", "html"],
  }
});
```

`test.reporters`にデフォルトのコンソール出力(`default`)に加えて、`html`を指定しました。
これでテストを実行すると、プロジェクトルート直下の`html`ディレクトリにHTMLが出力されます。

HTMLを参照するにはViteのプレビュー機能を使います。

```shell
npx vite preview --base __vitest__ --outDir html
```

コンソールに表示されるURLにブラウザからアクセスすれば、テスト結果を参照できます(ここではテストコードの編集や依存関係確認はできません)。
:::

### runIf/skipIf

特定の条件に合致する場合、テストを実行またはスキップします。
需要はありそうですが、現時点のJestでネイティブにサポートされていない機能です。

- [Vitest API - test.runIf](https://vitest.dev/api/#test-runif)
- [Vitest API - test.skipIf](https://vitest.dev/api/#test-skipif)

実装としてはtest.only等と同じですが、引数として実行/スキップ条件を記述します。

```typescript
test.runIf(process.env.NODE_ENV === "dev")("devモードのみ実行するテスト", () => {
  expect(true).toBe(true);
});

test.skipIf(process.env.NODE_ENV === "dev")("devモードではスキップ", () => {
  expect(true).toBe(true);
});
```

### プロダクトコード内にテストを記述する

Rustで採用されているプロダクトコード内にテストを記述するスタイルのIn-sourceテストもサポートされています。

- [Vitest Doc - In-source testing](https://vitest.dev/guide/in-source.html)

好き嫌いはありそうですが、プロダクトコード内にテストを記述することで、テストしにくいプライベート関数のテストも容易にできます。
In-sourceテストを記述するには以下のようにします。

```typescript
// プロダクトコード
export function calc(a: number, b: number) {
  return a * b;
}

// テストコード
if (import.meta.vitest) {
  test.each`
    a    | b    | expected
    ${1} | ${0} | ${0}
    ${2} | ${3} | ${6}
    ${0} | ${1} | ${0}
  `("$a x $b = $expected", ({ a, b, expected }) => {
    expect(calc(a, b)).toBe(expected);
  });
}
```

`import.meta.vitest`をチェックし、その中にテストを記述します。

このままだと`import.meta.vitest`の型が存在しないと怒られます。
これはTypeScriptの`tsconfig.json`に`vitest/importMeta`を追加すれば解決します。

```json
{
  "compilerOptions": {
    // (省略)
    "types": [
      "vitest/globals",
      "vitest/importMeta" // 追加
    ]
  }
}
```

次に、Viteの設定(`vite.config.ts`)は以下のようにします。

```typescript
export default defineConfig({
  test: {
    globals: true,
    includeSource: ["src/**/*.{js,ts}"] // プロダクトコードを含める
  },
  define: {
    vitest: undefined,
  },
});
```

`test.includeSource`にsrc配下のソースコードを指定します。これを指定しないとIn-sourceテストは実行されません。
また、`define.vitest`にundefinedを指定しています。これはビルド時にテストコードをバンドルから除くためのものです。

### 型チェック
Vitestにはちょっと特殊なテストもあります。型チェックはテストの実行ではなく、静的な解析のみを実施します。

Vitestの基盤となるViteは、ビルド時にTypeScriptの型チェックを実施しません。
これは以下Vite公式ドキュメントにも記載があります。

- [Vite Doc - TypeScript](https://vitejs.dev/guide/features.html#typescript)

つまり、TypeScriptの型エラーがあってもビルドは成功します。
一般的には、CIパイプライン等でビルド前に`tsc --noEmit`を使って型チェックをすると思いますが、Vitestではこれに加えて型自体をテストとして記述できます。

- [Vitest doc - Testing Types](https://vitest.dev/guide/testing-types.html)

デフォルトでは、型チェックのテストは`<test-name>-test-d.ts`または`<test-name>-spec-d.ts`としてテストコードを記述します。

```typescript
test("型チェック", () => {
  expectTypeOf("foo").toEqualTypeOf<string>();
  expectTypeOf<number>(1).toBeNumber();
  expectTypeOf({ foo: "bar" }).toHaveProperty("foo");

  assertType<{ foo: string }>({ foo: "bar" });
  
  // 引数・戻り値
  const fn = (param: string) => param;
  expectTypeOf<typeof fn>().parameters.toEqualTypeOf<[string]>();
  expectTypeOf<typeof fn>().returns.toEqualTypeOf<string>();
});
```

IDEを使っていると視覚的にエラーになることが分かるので、このテストを記述するシーンがパッと思い浮かびませんでしたが、ライブラリ開発では公開インターフェースが仕様に沿っていることを保証するのにいいかもしれません。

型チェックを実行するには、以下のコマンドを実行します。

```shell
# --runを除くとWatchモード
npx vitest typecheck --run
> 
> RUN  v0.26.1 /Users/noboru-kudo/workspace/vitest
>
>  ✓ specs/vitest-sample.test-d.ts (1)
> 
>  Test Files  1 passed (1)
>       Tests  1 passed (1)
> Type Errors  no errors
>    Start at  16:02:38
>    Duration  1.01s
```

実際にはテストファイルを実行する訳ではなく、`tsc --noEmit`を実行して静的解析をしています。
前述の通り型チェック用のテストだけでなく、プロダクトコード自体も全体的にチェックしますので、tscコマンドの代わりに使うと良さそうです。

## カバレッジを取得する

最後に、テストのカバレッジを取得してみます。

Vitestのカバレッジプロバイダーとして、[c8](https://github.com/bcoe/c8)または[istanbul](https://istanbul.js.org/)が指定可能です。
ここではc8を使います。Jestのようにビルトインされていませんので、事前に別途インストールしておきます[^4]。

[^4]: 未実施ですが、インストールしていない場合は、テスト実行時に対話形式でのインストールもできるようです。

```shell
npm install -D @vitest/coverage-c8
```

次に、`vite.config.ts`を修正します。

```typescript
export default defineConfig({
  define: {
    vitest: undefined,
  },
  test: {
    globals: true,
    coverage: {
      provider: "c8", // デフォルト。istanbulも指定可(要インストール)
      include: ["src/**/*.{js,ts}"], // src配下のみを対象
      exclude: ["src/**/__mocks__/**"], // ディレクトリ除外
      all: true, // 未テストのコードもカバレッジに含める
      reporter: ["html", "clover", "text"] // HTML,Clover,テキスト形式のカバレッジレポート
    }
  }
});
```
 
`test.coverage`配下にカバレッジの設定を追加します。
上記以外にも、設定可能な項目は多数あります。詳細は以下公式ドキュメントを参照してください。

- [Vitestドキュメント - coverage](https://vitest.dev/config/#coverage)

カバレッジ取得は、通常のテスト実行に`--coverage`を追加するだけです。

```shell
npx vitest run --coverage
> (省略)
>  % Coverage report from c8
> -------------------|---------|----------|---------|---------|------------------------------------
> File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                  
> -------------------|---------|----------|---------|---------|------------------------------------
> All files          |   62.56 |    92.85 |   55.81 |   62.56 |                                    
>  RandomService.ts  |   66.66 |      100 |       0 |   66.66 | 4-5                                
>  RandomService2.ts |   66.66 |      100 |      50 |   66.66 | 4-5                                
>  RandomService3.ts |   66.66 |      100 |       0 |   66.66 | 4-5                                
>  RandomUtil.ts     |   71.42 |      100 |       0 |   71.42 | 5-6                                
>  bar.ts            |       0 |        0 |       0 |       0 | 1-6                                
>  foo-bar.ts        |     100 |      100 |      50 |     100 |                                    
>  foo.ts            |     100 |      100 |     100 |     100 |                                    
>  hoge.ts           |       0 |        0 |       0 |       0 | 1-18                               
>  in-source.ts      |   94.11 |      100 |      50 |   94.11 | 4                                  
>  random.ts         |    90.9 |      100 |      50 |    90.9 | 10                                 
>  sample-handler.ts |     100 |      100 |     100 |     100 |                                    
>  timer.ts          |   45.45 |      100 |      25 |   45.45 | 4-10,13-14,16-17,19-20,22-24,47-66 
> -------------------|---------|----------|---------|---------|------------------------------------
```

カバレッジ結果が出力されました。この出力は先程reporterに`text`として指定したものです。
それ以外に指定したClover形式やHTMLのレポートはプロジェクトルート直下の`coverage`ディレクトリ配下に出力されます。

以下はHTML形式のレポートです。

![coverage report](https://i.gyazo.com/160ace65b6128d4fcd7d9a9b7c4dbe64.png)

もちろんソースコードをクリックすれば、コードレベルで未通過のパスが確認できます。

## 最後に

Vitestは、開発者の生産性を最大化しようとしている心意気が伝わって好感が持てました。
すぐにJestを置き換えるような存在になるのは難しいかもしれませんが、ビルドツールとしてViteを使っているのであれば採用する価値はありそうです。

と言いつつも、たとえプロダクションビルドでViteを使っていなくても、テストにVitestを導入するのも、テスト効率の向上に貢献できると思います。
使い方もJestとほとんど同じですし、Jest経験者にとって導入の敷居は高くないと感じます。
VitestのGitHubレポジトリには、各フレームワークに対応した実装例もありますので、導入の際はこれを参考にすると良さそうです。

- [GitHub - Vitest - examples](https://github.com/vitest-dev/vitest/tree/main/examples)

Vitest自体まだまだ若いプロダクトです。今後の発展に注目したいところです。
