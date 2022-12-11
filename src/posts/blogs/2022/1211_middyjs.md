---
title: AWS Lambda 向け軽量Node.jsミドルウエアエンジン Middy の紹介
author: yumeto-yamagishi
date: 2022-12-11
tags: ["middleware", nodejs, typescript, advent2022]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---
これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第11日目の記事です。

今年偶然[^1]に見つけた [middyjs](https://middy.js.org/) が、「シンプルでパワフル・軽量で拡張性あり」というサイトの謳い文句どおり素晴らしかったのでご紹介します。

[^1]::[serverlessのtypescript用テンプレート](https://www.serverless.com/framework/docs/providers/aws/cli-reference/create)の中で見つけました。 `npx serverless create --template aws-nodejs-typescript`で雛形を作成できます。

[[TOC]]

# AWSにおけるLambdaの位置づけとミドルウエア処理の必要性

AWSの多くのサービスは、サービスの機能拡張やアプリケーション部分の実装としてLambda関数を指定できるように統合されています。例えばApiGatewayと連携しAPIサーバを構築する、S3と連携し多機能なオブジェクトストレージを実現する、SNSやSQSと連携しPub/Subシステムを構築するといった具合です。

Lambda関数には、様々なサービスからのイベントを処理する業務ロジックが実装されます。
```typescript
// file: my-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResultV2 } from "aws-lambda";

// ApiGatewayのイベントハンドラ
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResultV2> {
  // ログ出力
  try {
    // 入力値の検証
    const constraintViolations = validate(event);
    if (constraintViolations) {
      return { status: 400, body: JSON.stringify(constraintViolations)};
    }
    // ビジネスロジック向けの入力データ構造へのマッピング
    const inputData = ...

　　// 業務処理本体
    const outputData = await doMyBusinessLogic(inputData);
    
    // ログ出力
    // 成功時レスポンス
    return { status: 200, body: JSON.stringify(outputData)};
  } catch (e) {
    // エラーハンドリング
    // ログ出力
    // エラー時レスポンス
    return { status: 500, body: JSON.stringify(...)};
  }
}
```
上記の関数は、ApiGatewayのリクエストハンドラをイメージしています。
ハンドラ内では、入力値の検証・ログ出力・エラーハンドリングも実装しています。リクエストパス毎にハンドラ関数を作成するなら、そのハンドラ内でも同様の実装が必要になります。もっと言うと、連携するサービスがSNS/SQS/S3などと違っても、必要な処理に大差はありません。

この手の共通処理は、Webフレームワークにおいては**ミドルウエア**の役割とすることが多いです。
しかしLambda関数の`event`オブジェクトを処理させるために直接Webフレームワークを使うことは不適切です。なぜなら、関数呼び出し時の`event`引数はHTTP Request風のイベントデータですが、もちろんHTTP/1.1のRequestバイナリストリームではありません。そもそもミドルウエア機能を使いたいがためにルーター機能やコネクション管理機能まで持ち込むのはやりすぎです。[^2]

[^2]::代表的なWebFrameworkにおけるミドルウエア -- [express](https://expressjs.com/ja/guide/using-middleware.html), [next.js](https://nextjs.org/docs/advanced-features/middleware) など。
Webフレームワークの使用は不適切と書いてはいるが、SSR目的でApiGatewayの統合プロキシ関数としてLambdaハンドラを作成し、[serverless-expres](https://github.com/vendia/serverless-express)を使う方法はある。

我々が欲しいのは、AWS Lambdaのeventに適用可能な、Webフレームワークにあるミドルウエアの部分だけです。

これが Middy です。


# The "Middy" style

### インストール

最もシンプルなケースのインストール方法。
```bash
npm install @middy/core
```
ここで示すサンプルの場合はこちら。
```bash
npm install @middy/core @middy/http-error-handler @middy/validator @middy/input-output-logger
npm install --save-dev json-schema-to-ts
```

### ハンドラの実装例

Middyを使うと、上記ハンドラの実装は次のようになります。

```typescript
// file: my-handler.ts
import { ResponseModel } from "./my-busuness";
import { responseModelConverter } from "./my-middy-utils";
import eventSchema from "./my-event-schema";
import { FromSchema } from "json-schema-to-ts";
import middy from '@middy/core';
import validator from '@middy/validator'
import inputOutputLogger from '@middy/input-output-logger'

async function doMyBusinessLogic(request: FromSchema<typeof eventSchema>): Promise<ResponseModel> {
  // request: {body: {foo: string; bar?: string}} で型付けされている。
  // この型情報は ./my-event-schema.ts で定義した JSON Schemaから取得している。

  // ビジネスロジック本体
  const foo = request.body.foo; // string
  const bar = request.body.bar; // string | undefined
  ...
  return new ResponseModel(...);
}

// これがexportされるhandler
export const handler = middy()
  .use(httpErrorHandler())
  .use(inputOutputLogger())
  .use(validator({eventSchema}))
  .use(responseModelConverter())
  .handlelr(doMyBusinessLogic);
```
実際にexportしている関数は `handler`関数で、これは`middy()`により`doMyBusinessLogic(request)`関数をWrapし、次のミドルウエアを適用したものです。
  - `httpErrorHandler` (公式Middleware)
  - `inputOutputLogger` (公式Middleware)
  - `validator` (公式Middleware)
  - `responseModelConverter` (カスタムmiddleware関数。[後述](#middlewareについて)します。)

### さらなる非機能的処理の共通化

複数のApiGatewayハンドラを実装するならば、さらに共通化を進めて次のような形にまで直せます。
```typescript
// file: my-handler.ts
import { FromSchema } from "json-schema-to-ts";
import eventSchema from "./my-event-schema";
import { middify } from "./my-middy-utils";

async function doMyBusinessLogic(request: FromSchema<typeof eventSchema>): Promise<ResponseModel> {
  // 変更なし
}

// これがexportされるhandler
// middyfyは ./my-middy-utils.ts ファイルにおいて、ミドルウエアのuseチェインをラップしている関数。
// useのうち、可変になる部分だけ引数で渡している。
export const handler = middyfy({eventSchema, handler: doMyBusinessLogic})
```

いかがでしょうか。`doMyBusinessLogic(event)`からは、ApiGateway固有の匂いはほとんどありません。バリデーション済みのHTTPリクエスト、しかも必要なプロパティが型付けされている状態の引数を受け取ります。
戻り値も業務的な応答を表す`ResponseModel`とし、`APIGatewayProxyResultV2`への変換は、カスタムミドルウエア`responseModelConverter`にさせています。

ここまでできるので、Middyのトップページに"Focus on what matters"[^3]と書いてありますが、本当です。非機能的な処理をすべてミドルウエアに押し込んでいます。

[^3]::[Middyの特徴](https://middy.js.org/)を説明している中の1つ。

### スキーマ定義からバリデーションと型安全なrequestオブジェクトを取得する

`./my-event-schema`ファイルには、JSON-Schema objectを(定数として)返すように実装します。
```typescript
// file: my-event-schema

export default {
  type: "object",
  properties: {
    body: {
      type: "object",
      properties: {
        foo: { type: 'string', minLength: 1 },
        bar: { type: 'string', minLength: 1 }
      },
      required: ['foo']
    }
  },
  required: ['body']
} as const;
```
この定義を使って次の効果を同時に得ます。
- 実行時に`validator`ミドルウエアにより、`APIGatewayProxyEvent`型の入力イベントデータを指定したスキーマに対して検証（バリデーション）する。
  - 詳しくは[validator middleware](https://middy.js.org/docs/middlewares/validator)をご覧ください。
- Typescriptのコンパイル時に、`doMyBusinessLogic`に渡す引数の型を`FromSchema<typeof eventSchema>`型とする。
  - 実際にバリデーションを通った後に存在するプロパティのみに絞り、かつプロパティ値の型付けも行う。
    ```typescript
    // file: my-handler.ts
    import { FromSchema } from "json-schema-to-ts";
    import eventSchema from "./my-event-schema";

    async function doMyBusinessLogic(request: FromSchema<typeof eventSchema>): Promise<ResponseModel> {
      // request: {body: {foo: string; bar?: string}} で型付けされている。
      ...
    }
    ```
  - この静的型付けは Middy の機能ではありませんが大変便利なのでここに記載しています。
  - JSON Schemaからオブジェクトの型への変換に興味のある方は[`json-schema-to-typescript`](https://github.com/bcherny/json-schema-to-typescript#readme)をご覧ください。




# Middy の ミドルウエアについて

middlewareの適用順序ついては[公式ドキュメント](https://middy.js.org/docs/intro/how-it-works)がわかりやすいです。

ここではカスタムミドルウエア`responseModelConverter`の実装例を通して、リクエスト・レスポンスに仲介する方法を見てみましょう。
このミドルウエアは、ハンドラ関数の戻り値（`ResponseModel`型）を`APIGatewayProxyResultV2`型に変換する機能を持っています。
```typescript
// file: my-middy-utils.ts

// ResponseModel: {code: number; body: object;} という型を想定
export function responseModelConverter(): middy.MiddlewareObj {
  return {
    // handlerがreturnした後に適用される処理
    after: (request) => {
      const response = request.response;
      if (response instanceof ResponseModel) {
       // レスポンスを変換
        request.response = {
          statusCode: response.code,
          body: JSON.stringify(response.body),
        };
      }
    },
  }
}

```
`responseModelConverter()`は、`after`プロパティを定義したobjectを返しています。
`after`では、responseが`ResponseModel`インスタンスの場合は`APIGatewayProxyResultV2`に合うように変換しています。

このように、`middy.MiddlewareObj`を実装するオブジェクトを`middy().use(...)`に渡すことで、ミドルウエアを追加できます。詳しくは[カスタムミドルウエアの実装方法ドキュメント](https://middy.js.org/docs/writing-middlewares/intro)をご覧ください。

# 共通化実装について

[上記の例](#さらなる非機能的処理の共通化)では `./my-middy-utils.ts`ファイルにおいて、`middyfy`関数を定義することで, `handler.ts`ファイルから非機能的な要素を排除しました。では、具体的に`middify`関数の実装例を見てみましょう。

```typescript
// file: my-middy-utils.ts

import { ResponseModel } from "./my-busuness";
import { FromSchema, JSONSchema } from "json-schema-to-ts";
import { APIGatewayProxyEvent, Handler } from "aws-lambda";

export type ValidatedRequestEventHandler<S extends JSONSchema> = Handler<FromSchema<S>, ResponseModel>;

export function middyfy<S extends JSONSchema, H extends ValidatedRequestEventHandler<S>>(
  opt : { handler: H; eventSchema: S; }
): middy.MiddyfiedHandler {
  const {eventSchema, handler} = opt;
  return middy()
    .use(httpErrorHandler())
    .use(inputOutputLogger())
    .use(validator({ eventSchema }))
    .handlelr(handler);
}
```
実装自体は`middy().use(...)`をラップしているだけなので単純なのですが、Typescriptの型定義が複雑になっています。
これは、`eventSchema`の型と`handler`の型（引数の型）の整合性をコンパイル時にチェックさせるためですが、現実問題ここまで厳密でなくても問題ないと思います。

また、共通化と言えども、多少ハンドラ実装側からミドルウエアの振る舞いをコントロールしたい場合もあると思います。こういう場合に`middyfy`のインターフェイスをどういう風に切るか、こういうところはチーム開発や複数プロダクトにまたがる仕組みを作る際には重要になります。
例えば以下のように、オプションの渡し方を工夫することで振る舞いを柔軟に変更できます。
```typescript
// エラーハンドリング失敗時のメッセージを可変にしたい場合
// バリデーションをオプションにする場合
export function middyfy<S extends JSONSchema, H extends ValidatedRequestEventHandler<S>>(
  opt : { handler: H; eventSchema?: S; unhandledErrorMessage?: string; }
): middy.MiddyfiedHandler {
  const {eventSchema, handler, unhandledErrorMessage, skipValidate} = opt;
  const m = middy()
    .use(httpErrorHandler({ fallbackMessage: unhandledErrorMessage }))
    .use(inputOutputLogger());
  if (eventSchema !== undefined) {
    m.use(validator({ eventSchema }));
  }
  m.handlelr(handler);
  return m;
}
```

# まとめ

Middyは、AWS Lambdaにミドルウエア処理を追加することに特化した、シンプルで軽量なライブラリです。使い勝手の良い公式ミドルウエア実装もありますが、カスタムミドルウエア自体の実装も容易で、ライブラリ自体の振る舞いも単純です。ハンドラに非機能的な処理を「コピペ」せずに、ミドルウエアを実装するよう動機づけられます。

なにより、ミドルウエアを書く”場所”が提供されることで、これから書こうとしている処理は「ハンドラに書くべきこと」なのか「ミドルウエアで処理すべきこと」なのか、考えるようになります。

最後に、nodejs系のライブラリ全般に言えることですが、ライブラリの採用はOwnリスクです。しっかりと内容を理解して、用法・用量を守って使うことが肝要です。
