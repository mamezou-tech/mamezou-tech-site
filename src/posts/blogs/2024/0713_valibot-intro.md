---
title: "Valibot: 超軽量＆型安全なスキーマバリデーションライブラリ"
author: noboru-kudo
date: 2024-07-13
tags: [valibot, typescript, zod]
image: true
---

JavaScript、とりわけTypeScriptプロジェクトでデータのバリデーションを行う際、[Zod](https://zod.dev/)や[Yup](https://github.com/jquense/yup)等のライブラリがよく使われています。
今回は、最近これらの代替として注目を集めている[Valibot](https://valibot.dev/)というライブラリを紹介します。

## Valibotとは？

Valibotは構造化データを検証するためのスキーマライブラリです。

[公式ドキュメント](https://valibot.dev/guides/introduction/)ではその特徴を以下のように説明しています。

> - Fully type safe with static type inference
> - Small bundle size starting at less than 600 bytes
> - Validate everything from strings to complex objects
> - Open source and fully tested with 100 % coverage
> - Many transformation and validation actions included
> - Well structured source code without dependencies
> - Minimal, readable and well thought out API

(DeepL翻訳)

> - 静的型推論による完全な型安全性
> - 600バイト以下の小さなバンドルサイズ
> - 文字列から複雑なオブジェクトまであらゆるものを検証可能
> - オープンソースで、100%のカバレッジで完全にテストされています。
> - 多くの変換および検証アクションを含む
> - 依存関係のない構造化されたソースコード
> - 最小限の、読みやすく、考え抜かれた API

一見すると、機能的には現在のデファクト(私見です)ライブラリのZodとほとんど同じですが、Valibotはモジュール設計に力を入れていて、バンドルサイズの大幅な削減を実現しています。

Valibotのソースコードを見ると、各関数はそれぞれ独立してexportされていることに気づきます。
これによりバンドラーのツリーシェイキングが効果的に機能するようになっています。シンプルなケースではZodと比較して90%以上もバンドルサイズを減らせるとのことです。
この辺りの仕組みは、以下ブログで詳しく説明されています。

- [This technique makes Valibot’s bundle size 10x smaller than Zod’s!](https://www.builder.io/blog/valibot-bundle-size)

Valibotは最初のリリースから1年程度ととても新しいライブラリです。
現時点では、普及度やエコシステムの点でZodやYup等のメジャーなライブラリには及びません。
とはいえ、昨今はブラウザ等のフロントエンドだけでなく、バックエンドでもエッジ/サーバーレス環境の普及に伴って軽量なライブラリは重宝されます。
このような背景から、近いうちにValibotはこれらのライブラリに迫っていくものと思われます。

エコシステムの観点では、現段階でもReactやVue、Svelte等のフレームワーク向けのフォームバリデーションライブラリや、NestJSやDrizzleORMといったバックエンドのライブラリまで幅広くサポートされています。
今後ますます増えていくものと思われます。

- [Valibot Doc - Ecosystem](https://valibot.dev/guides/ecosystem/)

## 基本スキーマを定義する

まずは基本となるスキーマを見てみます。プリミティブ型やオブジェクト型/配列に加えてUnionやIntersect等、TypeScriptの型システムがサポートされています。

以下使用頻度が高そうなものをピックアップしました。

```typescript
import * as v from 'valibot';

// プリミティブ
const StringSchema = v.string();
const StringSchemaWithMessage = v.string('文字列だよ！');
const NumberSchema = v.number();
const UndefinedSchema = v.undefined();

// オブジェクト: {name: string, birthday: Date, score: number}
const ObjectSchema = v.object({
  name: v.string(),
  birthday: v.date(),
  score: v.number()
});
// 配列: Array<number>
const ArraySchema = v.array(v.number());
// レコード: Record<string, {title: string, content: string}>
const RecordSchema = v.record(
  v.string(),
  v.object({ title: v.string(), content: v.string() })
);
// string | null | undefined
const NullishSchema = v.nullish(v.string());
// string | undefined
const OptionalSchema = v.optional(v.string());
// { name: string } & { address: string }
const IntersectSchema = v.intersect([
  v.object({ name: v.string() }),
  v.object({ address: v.string() })
]);
// 'ready' | 'running' | 'complete'
const UnionSchema = v.union([
  v.literal('ready'),
  v.literal('running'),
  v.literal('complete')
]);
```

第1引数にバリデーションエラー時のメッセージを指定することで、デフォルトメッセージを変更できます。

Zodのようにスキーマはそのまま型としても利用できますので、別に型を定義をする必要はありません。
スキーマから型を生成する場合は、[InferOutput](https://valibot.dev/api/InferOutput/)を使います[^1]。

[^1]: InferOutputは変換後の型です。あまり使うケースはない気がしますが変換前の場合は[InferInput](https://valibot.dev/api/InferInput/)を使います。詳細は[公式ドキュメント](https://valibot.dev/guides/infer-types/)を参照してください。

```typescript
const User = v.object({
  name: v.string(),
  birthday: v.date(),
  score: v.number()
});

// for zod
// type User = z.infer<typeof User>;
type User = v.InferOutput<typeof User>;

const user: User = {
  name: '豆蔵　太郎',
  birthday: new Date(2000, 0, 1),
  score: 10
};
```

## パイプラインを構築する

先ほど定義したスキーマに対してバリデーションチェックやデータ変換処理を追加します。
Valibotではこのチェックや変換処理をアクション(Action)と呼びます。

このようなケースは、Zodだとメソッドチェーンで実現していますが、Valibotは[pipe](https://valibot.dev/api/pipe/)を使ってパイプラインを構築する形になります(基本スキーマ含めて全20個まで)。

- [Valibot Doc - Pipelines](https://valibot.dev/guides/pipelines/)

以下は公式ドキュメントに記載されている例です。

```typescript
import * as v from 'valibot';

const EmailSchema = v.pipe(
  v.string(),
  v.trim(),
  v.email(),
  v.endsWith('@example.com')
);
```
上記はemailの制約として以下を定義しています。 
1. [string](https://valibot.dev/api/string/): 文字列型(基本スキーマ)
2. [trim](https://valibot.dev/api/trim/): 前後トリム変換
3. [email](https://valibot.dev/api/email/): emailフォーマットであることをチェック
4. [endsWith](https://valibot.dev/api/endsWith/): ドメインが`@example.com`であることをチェック

第1引数は前述した基本スキーマ(プリミティブ、オブジェクト等)である必要があります(第1引数にアクションを指定すると型エラーになります)。

ビルトインアクション[^2]は数多く用意されていますが、これで満たせない場合はカスタムアクションを作成します。
カスタムアクションの作成は[check](https://valibot.dev/api/check/)または[transform](https://valibot.dev/api/transform/)を使います。以下使用例です。

[^2]: ビルトインアクションは[APIリファレンス](https://valibot.dev/api/)を参照してください。

```typescript
function checkEmpNumber(value: string): boolean {
  console.log("カスタムチェックを実装", value);
  return true;
}
function format(value: string): string {
  return 'mz-' + value;
}
const EmpNumber = v.pipe(
  v.string(), 
  v.check(checkEmpNumber), 
  v.transform(format)
);
```

バリデーションでよくあるユースケースとして複数項目間の相関関係を検証するチェックが考えられます。
これもカスタムアクションを使えば簡単に実現できます。
以下は相関チェックの記述例です。

```typescript
const Item = v.pipe(
  // Schema: 基本スキーマ
  v.object({
    kind: v.union([ v.literal('Gift'), v.literal('Meat'), v.literal('Fish') ]),
    price: v.optional(v.number())
  }),
  // Action: 相関チェック
  v.check(item => {
    switch (item.kind) {
      case 'Meat':
        return (item.price ?? 0) > 1000;
      case 'Gift':
        return item.price === undefined || item.price === 0
      default:
        return true;
    }
  })
);
```

オブジェクト型スキーマに続いてカスタムチェックをパイプラインに追加しています。

:::column:非同期アクションを作成する
カスタムアクションはデータベースや外部リソースへのアクセス等の非同期処理が必要になることも多いと思います。
その場合は非同期バージョンのAPI([checkAsync](https://valibot.dev/api/checkAsync/)/[transformAsync](https://valibot.dev/api/transformAsync/))を使います。

```typescript
async function checkEmpNumber(value: string): Promise<boolean> {
  console.log("カスタムチェックを実装", value);
  return true;
}
async function format(value: string): Promise<string> {
  return 'mz-' + value;
}
const EmpNumber = v.pipeAsync(
  v.string(), 
  v.checkAsync(checkEmpNumber), 
  v.transformAsync(format)
);
```

ここで使うpipeの方も非同期バージョンの[pipeAsync](https://valibot.dev/api/pipeAsync/)を使用します。
:::

## データをパースする

ユーザー入力等の未知のデータをスキーマに適用します。
ここでスキーマに定義した各種バリデーションや変換処理が実行されます。

- [Valibot Doc - Parse data](https://valibot.dev/guides/parse-data/)

基本となるAPIは[parse](https://valibot.dev/api/parse/)(非同期スキーマの場合は[parseAsync](https://valibot.dev/api/parseAsync/))です。
成功すれば変換後のデータ、失敗すれば例外(ValiError)がスローされます。

```typescript
const Email = v.pipe(
  v.string(),
  v.trim(),
  v.email(),
  v.endsWith('@example.com')
);

const User = v.object({
  name: v.string(),
  email: Email
});

try {
  const email = v.parse(User, { email: 'mame' });
} catch (e) {
  if (v.isValiError(e)) {
    console.log(e.issues);
  } else {
    throw e;
  }
}
```

ValiErrorの`issues`プロパティにエラーの内容が設定されます。
これをもとにユーザー向けのメッセージを表示する等の処理を記述することになります。

上記例は不正なデータをパースしていますので例外がスローされます。
コンソールには以下の内容が出力されます。

```
[
  {
    "kind": "schema",
    "type": "string",
    "expected": "string",
    "received": "undefined",
    "message": "Invalid type: Expected string but received undefined",
    "path": [
      {
        "type": "object",
        "origin": "value",
        "input": {
          "email": "mame"
        },
        "key": "name"
      }
    ]
  },
  {
    "kind": "validation",
    "type": "email",
    "input": "mame",
    "expected": null,
    "received": "\"mame\"",
    "message": "Invalid email: Received \"mame\"",
    "requirement": {},
    "path": [
      {
        "type": "object",
        "origin": "value",
        "input": {
          "email": "mame"
        },
        "key": "email",
        "value": "mame"
      }
    ]
  },
  {
    "kind": "validation",
    "type": "ends_with",
    "input": "mame",
    "expected": "\"@example.com\"",
    "received": "\"mame\"",
    "message": "Invalid end: Expected \"@example.com\" but received \"mame\"",
    "requirement": "@example.com",
    "path": [
      {
        "type": "object",
        "origin": "value",
        "input": {
          "email": "mame"
        },
        "key": "email",
        "value": "mame"
      }
    ]
  }
]
```
名前未入力(name:string)、フォーマット不正(email:email)、ドメイン不正(email:ends_with)と3つのチェックでエラーが発生していることが分かります(エラー発生箇所は`path`プロパティを参照します)。
バリデーションエラーの詳細な仕様は公式ドキュメントを参照してください。

- [Valibot Doc - Issues](https://valibot.dev/guides/issues/)

このように、デフォルトでは途中でエラーが発生しても全てのチェックが実行されて、発生した全てのエラーがまとめて設定されます。
初回の失敗でエラーを止める場合は、parseの第3引数(オプション)を指定します。

```typescript
// 失敗時にバリデーションを止める -> name:stringエラーのみ
const email = v.parse(User, { email: 'mame' }, { abortEarly: true });

// パイプラインのみ失敗時に止める -> name:string+emailエラーの2件
const email = v.parse(User, { email: 'mame' }, { abortPipeEarly: true });
```

ここまでは、parseを使ってTry-Catch節でバリデーションエラーを捕捉しましたが、 例外をスローしない[safeParse](https://valibot.dev/api/safeParse/)(非同期バージョンは[safeParseAsync](https://valibot.dev/api/safeParseAsync/))もあります。

safeParseを使うと以下のようなコードになります。

```typescript
const result = v.safeParse(User, { email: 'mame' });
if (result.success) {
  console.log('success!', result.output) // InferOutput<typeof User>型
} else {
  console.log('error!', JSON.stringify(result.issues, null, 2));
}
```

safeParseの場合は戻り値がパース後の値でなく成功可否を表すオブジェクト(`SafeParseResult`)になります。
`success`プロパティで成功可否を判定し、成功の場合は`output`プロパティからparse同様の出力結果を取得します。
失敗時は先ほどの`ValiError`のように`issues`プロパティからエラー内容が参照できます。

どちらを使うかは好みの問題で、各プロジェクトで決めればいいのかなと思います。

:::column:タイプガード(is)でスキーマ適合判定をする
スキーマの特殊な使い方として、タイプガード用の[is](https://valibot.dev/api/is/)も用意されています。
以下のように使います。

```typescript
// タイプガード: true
const input = { name: '豆蔵', email: 'mame@example.com' };
// タイプガード: false
// const input = { email: 'mame' };
if (v.is(User, input)) {
  console.log('success!', input.name, input.email)
} else {
  console.log('no user!')
}
```

データがスキーマに適合する場合、if文内はスキーマに従ってデータから情報を取得できます。
なお、parse/safeParseの出力型を表す`InferOutput<typeof User>`でしたが、タイプガード(is)の場合はパースではありませんので、入力型を表す`InferInput<typeof User>`になります。

また、タイプガード(is)の制約としてバリデーションエラーの内容は取得できません。
スキーマに適合する場合のみ何かしらの処理を実行するというケースに絞られてきますが、そのようなケースではisを使う方が自明な記述になりますね。
:::

## まとめ

Valibotを使ってみると、そのバンドルサイズの小ささにも関わらず豊富な機能が用意されていることに気づきます。
バリデーションはフロントエンド、バックエンドに関わらず利用シーンが多数あります。Valibotはどんな場所にでも手軽に適用できそうですので是非活用していきたいなと思いました。