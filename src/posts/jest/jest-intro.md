---
title: Jest再入門 - 導入編
author: noboru-kudo
date: 2022-06-25
templateEngineOverride: md
nextPage: ./src/posts/jest/jest-matchers.md
---

[Jest](https://jestjs.io/)はMeta(旧Facebook)社によって開発されたJavaScript向けのテストフレームワークです[^1]。
Jestは、テストランナーからマッチャー、カバレッジ等のテストに必要な一連の機能が備わっています。また、それらのセットアップが非常に簡単であることから、現在のJavaScriptで最も多く利用されているテストフレームワークです。

![npm trend](https://i.gyazo.com/e05f42a68275f87a199df20c63e3eb9f.png)
出典：[NPM Trend](https://www.npmtrends.com/jest-vs-mocha-vs-jasmine)

[^1]: 現在は[OpenJS](https://openjsf.org/)への寄贈手続きが進められています。詳細は[こちら](https://openjsf.org/blog/2022/05/11/openjs-foundation-welcomes-jest/)を参照してください。

Jestはメジャーなプロダクトではありますが、フレームワーク等であらかじめセットアップされたものを何となく使っている方が結構多いのではと思います。
そこで本シリーズでは「Jest再入門」と題して、改めてJestのセットアップから基本的な使い方、応用編までを連載します。

第1回目は導入編として、セットアップや基本的な使い方を紹介します。
なお、ここではTypeScriptを実装言語として進めていきます。

[[TOC]]

## Jestセットアップ

まず、任意のnpmプロジェクトを用意します。

```shell
mkdir jest-example
cd jest-example
npm init
```

ディレクトリ名は任意で構いません(ここではjest-example)。空のnpmプロジェクトを作成しました。

では、TypeScript及びJestをインストールします。

```shell
npm install --save-dev typescript jest ts-jest @types/jest
```

ここではTypeScriptは`4.7.4`、Jestは`28.1.1`のバージョンをインストールしました(現時点の最新)。

TypeScriptでは[@types/jest](https://www.npmjs.com/package/@types/jest)を一緒にインストールしておくと、使用頻度の高いメソッド(describeやtest等)をimport不要で利用できます。

まず、TypeScriptのセットアップです。以下のコマンドを実行します。

```shell
npx tsc --init
```

プロジェクトルート配下に`tsconfig.json`が作成されます。今回はデフォルトのままで構いません。

次にJestの設定ファイルを作成します。

```shell
npx jest --init

✔ Would you like to use Typescript for the configuration file? … yes
✔ Choose the test environment that will be used for testing › node
✔ Do you want Jest to add coverage reports? … no
✔ Which provider should be used to instrument code for coverage? › v8
✔ Automatically clear mock calls, instances, contexts and results before every test? … yes

📝  Configuration file created at jest.config.ts
```

対話形式で上記のとおり選択しました。

プロジェクトルート直下にJestの設定ファイルの`jest.config.ts`が作成されます。

こちらは必要に応じて変更していきます。
ここでは、プロダクトコードにTypeScriptを使用することを想定し、Presetに以下を設定します。

```typescript
  // A preset that is used as a base for Jest's configuration
  preset: "ts-jest",
```
[ts-jest](https://kulshekhar.github.io/ts-jest/)は先程Jestと一緒にインストールしたJest用のTypeScriptプリプロセッサです。
なお、これ以外にBabelを使用する方法もあります。こちらを利用する場合は[公式ドキュメントの手順](https://jestjs.io/docs/getting-started#via-babel)を参照してください。

これでJestのセットアップは完了です。Zero Configurationと謳っているだけあって導入は簡単です。

## テストファイル

Jestがテスト対象として認識するファイルは、デフォルトでは`__tests__`ディレクトリ配下のts/jsファイル、またはファイル名が`xxxx.spec.ts`/`xxxx.test.ts`のものです。
変更する場合は、設定ファイル(`jest.config.ts`)の`testMatch`/`testRegex`(正規表現バージョン)で指定します。
設定方法の詳細は[公式ドキュメント](https://jestjs.io/docs/configuration#testmatch-arraystring)を参照してください。

ここではプロジェクトルート配下に`specs`ディレクトリを作成し、そこにテストファイルを配置していくものとします。

## 基本構文

Jestの基本構文はdescribeとtest/itメソッドです。

describeはテストをグループ化するものです。作成自体は任意ですが、後述する前後処理でスコープ指定できますので記述しておくことをお勧めします。
describeはネストして階層構造でも記述可能です。

test/itはどちらでも同じ意味で、テスト本体を記述します[^2]。以降はtestメソッドの方で記述します。

いずれも引数にテストの説明と、本文をアロー関数として設定します。
特に、第1引数の説明はテストレポートとして出力されますので、テストの内容がひと目で分かるようなものをつけます。

[^2]: [公式ドキュメント](https://jestjs.io/docs/api#testname-fn-timeout)によると`it`は`test`のエイリアスになっています。

一般的に以下のスタイルで記述されます。

```typescript
describe("Foo.ts", () => {
  test("AがBに変換されること", () => {
    // ...テスト本文
  });
 
  test("Cを渡すとエラーが送出されること", () => {
    // ...テスト本文
  });
});
```

## テスト実行

もちろんIDEからもできますが、CLIの場合はJestコマンドでテストを実行します。

```shell
npx jest
```

実行すると、Jestに検知されたテストが実行されます。

```
 PASS  specs/todo.spec.ts (5.696 s)
 PASS  specs/parameterrized.spec.ts (5.76 s)
 PASS  specs/foo.spec.ts (5.763 s)
 PASS  specs/matcher.spec.ts (5.765 s)
 PASS  specs/basic.spec.ts (5.77 s)
 PASS  specs/skip.spec.ts (5.765 s)
 PASS  specs/concurrent.spec.ts (7.991 s)

Test Suites: 7 passed, 7 total
Tests:       6 skipped, 2 todo, 125 passed, 133 total
Snapshots:   0 total
Time:        8.551 s
Ran all test suites.
```
失敗すると最後に失敗したテストと内容が出力されます。

一般的には、npm/yarnのスクリプトにこのコマンドを登録して利用します。

## 事前・事後処理

テスト前のセットアップやテスト後のクリーンアップには`beforeEach`/`afterEach`、`beforeAll`/`afterAll`を使用します。
その名前から自明ですが、`beforeEach`/`afterEach`は各テスト前後、`beforeAll`/`afterAll`はファイルまたはグループ(`describe`)内の全テストの前後で実行されます。

`describe`でのテストのグループ化を使うことで、ファイルを分割せずとも、特定の前後処理を必要なテストでのみ実行できます。
例えば、以下のように記述します。

```typescript
describe("Foo", () => {
  beforeAll(() => {
    console.log(">>> Foo:beforeAll");
  });
  afterAll(() => {
    console.log("<<< Foo:afterAll");
  });

  beforeEach(() => {
    console.log("> Foo:beforeEach");
  });
  afterEach(() => {
    console.log("< Foo:afterEach");
  });

  test("Foo:テスト1", () => {
    console.log("- Foo:テスト1");
  });
  test("Foo:テスト2", () => {
    console.log("- Foo:テスト2");
  });

  describe("Bar", () => {
    beforeAll(() => {
      console.log(">>> Bar:beforeAll");
    });
    afterAll(() => {
      console.log("<<< Bar:afterAll");
    });

    beforeEach(() => {
      console.log("> Bar:beforeEach");
    });
    afterEach(() => {
      console.log("< Bar:afterEach");
    });

    test("Bar:テスト1", () => {
      console.log("- Bar:テスト1");
    });
    test("Bar:テスト2", () => {
      console.log("- Bar:テスト2");
    });
  });
});
```
上記は以下の順序で実行されます。
```
>>> Foo:beforeAll
  > Foo:beforeEach
    - Foo:テスト1
  < Foo:afterEach
  > Foo:beforeEach
    - Foo:テスト2
  < Foo:afterEach
  >>> Bar:beforeAll
    > Foo:beforeEach
    > Bar:beforeEach
      - Bar:テスト1
    < Bar:afterEach
    < Foo:afterEach
    > Foo:beforeEach
    > Bar:beforeEach
      - Bar:テスト2
    < Bar:afterEach
    < Foo:afterEach
  <<< Bar:afterAll
<<< Foo:afterAll
```

Foo describe内の前後処理は全テストに対して実行されますが、Bar describe内の前後処理は該当グループ内のテストでのみ実行されます。
このようにdescribeでテストスコープを区切っておくと、前後処理を必要な場所でのみ実行できます。
公式ドキュメントでも言及されていますので、ご参考ください。

- [Jest - Setup and Teardown](https://jestjs.io/docs/setup-teardown)


## スキップ

一時的にテストの実行をスキップしたい場合に使用します。

- describeの単位: describe.skip または xdescribe
- test/it: test.skip/it.skip または xtest/xit

例えば、以下のテストは全てスキップされます。
```typescript
describe.skip("describeテストスキップ", () => {
  test("(describe.skip)実行されない", () => {
    fail();
  });
  test("(describe.skip)これも実行されない", () => {
    fail();
  });
});

xdescribe("describeテストスキップ", () => {
  test("(xdescribe)実行されない", () => {
    fail();
  });
  test("(xdescribe)これも実行されない", () => {
    fail();
  });
});

test.skip("(test.skip)実行されない", () => {
  fail();
});
xtest("(xtest)実行されない", () => {
  fail();
});
```

これとは逆に、describe.only/test.onlyとすると、そのテスト(またはグループ)のみを実行できます。
ただ、通常はIDEの機能で実行するテストを指定できますので、あまり利用機会はないように感じます。

## パラメタライズドテスト
テスト本文をパラメータのバリエーションとして再利用する場合に重宝します。
配列で指定する方法と、テンプレートリテラルを用いてテーブル形式で記述する方法の2つのやり方があります[^3]。

[^3]: パラメタライズドテストの詳細は[公式ドキュメント](https://jestjs.io/docs/api#testeachtablename-fn-timeout)を参照してください。

配列の場合はtest.eachに続いて配列でパラメータを指定します。

```typescript
describe("配列ベースのパラメタライズドテスト", () => {
  test.each([
    [100, 1, 100],
    [150, 2, 300],
    [200, 0, 0],
  ])("料金計算v1:%p * %p = %p", (unitPrice, quantity, expected) => {
    expect(unitPrice * quantity).toBe(expected);
  });
  test.each([
    { unitPrice: 100, quantity: 1, expected: 100 },
    { unitPrice: 150, quantity: 2, expected: 300 },
    { unitPrice: 200, quantity: 0, expected: 0 },
  ])(
    "料金計算v2:$unitPrice * $quantity = $expected",
    ({ unitPrice, quantity, expected }) => {
      expect(unitPrice * quantity).toBe(expected);
    }
  );
});
```

test.eachを利用して、可変パラメータを記述し、それをテスト本文の引数として受け取ります。
テストは配列の要素数分(ここではそれぞれ3回)実行されます。
2つありますがやっている内容は同じです。1つ目はネストした配列にパラメータを記述していますが、2つ目はオブジェクト形式の配列にして、パラメータの内容を分かりやすくしています。
ただ、これでもパラメータ名の記述が冗長です。これらはテンプレートリテラルで記述するとスッキリできます。

同様のことをテンプレートリテラルで記述します。

```typescript
describe("テンプレートリテラルでテーブル形式にしたパラメタライズドテスト", () => {
  test.each`
    unitPrice | quantity | expected
    ${100}    | ${1}     | ${100}
    ${150}    | ${2}     | ${300}
    ${200}    | ${0}     | ${0}
  `(
    "料金計算:$unitPrice * $quantity = $expected",
    ({ unitPrice, quantity, expected }) => {
      expect(unitPrice * quantity).toBe(expected);
    }
  );
});
```

テンプレートリテラルの中にはマークダウンのテーブルのように記述します。各パラメータはテスト本文の引数として受け取ります。
この場合、パラメータ値は`${...}`のプレースホルダ形式で記述する必要があります。
パラメータ数が多い場合は、可読性の観点からテンプレートリテラルによる記述をした方が良いでしょう。

パラメタライズドテストはdescribeでも利用可能で、この場合はグループ内の全テストが適用対象となります。

## 並列実行(experimental)

テストを並列に実行する場合は、test.concurrentを利用します。
以下はパラメタライズドテストで100回実行するケースを並列化しています。テスト内では100msウェイトさせて、擬似的に時間のかかるテストとしています。

```typescript
describe("配列ベースのパラメタライズドテストを並列に実行する", () => {
  const arr = [...Array(100).keys()]
  test.concurrent.each(arr)("concurrent:%p", async (num) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    expect(num * num).toBe(num * num);
  });
});
```

これを実行すると2.5秒程で終了します。concurrentを付けないとシリアル実行になりますので、約10秒(100ms * 100)かかります。

デフォルトでは最大5並列で実行されます。この多重度は設定ファイル(`jest.config.ts`)の`maxConcurrency`で調節可能です。
設定の詳細は[公式ドキュメント](https://jestjs.io/docs/configuration#maxconcurrency-number)を参照しくてださい。

なお、これは実験的機能の位置づけで制約があります。例えばbeforeEach/afterEachは実行されません。
また、beforeAll/afterAllは実行されますが、実行タイミングがテスト実行前後ではありませんでした。
制約の詳細は[こちら](https://github.com/facebook/jest/labels/Area%3A%20Concurrent)のGitHub Issueを参照してください。

## 未実装(TODO)

テストの実装が必要だけど、現在は未実装であることを表します。

```typescript
test.todo("FooがBarに変換されること");
test.todo("Bazを渡すとエラーを送出すること");
```

これらはテストを実行すると、未実装であることが分かるように出力されます。
CLIでは以下のように出力されます（抜粋）。

```shell
 PASS  specs/todo.spec.ts
  ✎ todo FooがBarに変換されること
  ✎ todo Bazを渡すとエラーを送出すること
(省略)
Test Suites: 1 passed, 1 total
Tests:       2 todo, 2 total
```

テストケースを先に作成しておく場合に使うと良いかと思います。

## カバレッジレポート

Jest単体でカバレッジレポートの出力もできます。
カバレッジレポートは以下で取得します（設定ファイルでも可）。

```shell
# 先程jest.config.tsに指定しているため--coverageは省略可能
npx jest --coverage --collectCoverageFrom='./src/**'
```

実行するとデフォルトでは`coverage`ディレクトリ配下に各種のレポートファイル(lcov/clover形式)が配置されます。
これらをSonarQube等の静的解析ツールに連携することで、各種カバレッジ状況を解析できます。
また、`coverage/lcov-report`配下にはHTML形式でも出力されています。`index.html`をブラウザで開くと以下のようになります。

![coverage report sample](https://i.gyazo.com/a4f435f390d640b3f9da99c3b8c5f59a.png)

各ファイルのリンクをクリックすると、行レベルでのカバレッジ状況が確認できます。

:::info
`--collectCoverageFrom`を省略すると、テストファイルから参照したソースファイルのみがカバレッジ取得対象となり、未テストのソースファイルのカバレッジが加味されません。
CLIパラメータでなく`jest.config.ts`でも指定できますので、事前に設定しておくと良いでしょう。

[リファレンス - collectCoverageFrom](https://jestjs.io/docs/configuration#collectcoveragefrom-array)

また、自動生成ファイル等、カバレッジ対象として除外したいファイルがあることも多いでしょう。
このような場合は`coveragePathIgnorePatterns`を別途指定して、カバレッジ測定対象から除外できます。

[リファレンス - coveragePathIgnorePatterns](https://jestjs.io/docs/configuration#coveragepathignorepatterns-arraystring)
:::

## テストレポート

デフォルトではコンソール上にテストレポートを出力しますが、CI等でテストを実行した場合に、別の形でテストレポートを確認したいことが多いと思います。
そのような場合は、別途カスタムレポーターをセットアップする必要があります。

ここではHTML形式のレポート出力するカスタムレポーターとして[jest-html-reporters](https://www.npmjs.com/package/jest-html-reporters)を導入してみます。

```shell
npm install --save-dev jest-html-reporters
```

インストール後は`--reporters`オプションでレポーターを指定します。

```shell
npx jest --reporters=default --reporters=jest-html-reporters
```

上記は`--reporters=jest-html-reporters`に加えて、`--reporters=default`も合わせて指定し、デフォルトのコンソールレポートとHTMLレポート両方を出力するようにしています。
ここではjestコマンドの引数に指定していますが、一般的には設定ファイル(`jest.config.ts`)に指定することが多いと思います。設定ファイルへの指定方法の詳細は[公式ドキュメント](https://jestjs.io/docs/configuration#reporters-arraymodulename--modulename-options)を参照してください。

テスト実行が終わると、プロジェクトルート直下に`jest_html_reporters.html`というHTMLレポートが出力されます[^4]。

[^4]: 実際のテスト結果は`jest-html-reporters-attach`ディレクトリ内に生成されます。

これをブラウザで開くと、以下のようにリッチなUIでテスト結果を確認できます。

![](https://i.gyazo.com/e2c056d1be582807a046a91978e7aae4.png)

---

次はマッチャー編に続きます。

- [Jest再入門 - マッチャー編](/testing/jest/jest-matchers/)

---
参照資料

- [Jest公式ドキュメント](https://jestjs.io/docs/getting-started)