---
title: OpenAIのStructured Outputsを使ってAIの出力スキーマを定義する
author: noboru-kudo
date: 2024-08-10
tags: [OpenAI, GPT, typescript, zod]
image: true
---

先日OpenAIからStructured Outputsという機能がリリースされました。

- [OpenAI Blog - Introducing Structured Outputs in the API](https://openai.com/index/introducing-structured-outputs-in-the-api/)

Structured Outputsは、その名前の通り構造化された出力を強制する機能です。
とはいえ、今までもAIからのレスポンスをJSON形式で返却するパラメータはありました(`response_format`に`json_object`を指定)。
ただ、こちらはプロンプトで具体的なJSON構造を指定する必要があり、期待通りのJSONレスポンスにならないこともあるので、バリデーションやリトライ等の追加実装が必要になったりしました。
今回リリースされたStructured Outputsは、プロンプトではなく専用パラメータに[JSONスキーマ](https://json-schema.org/)を指定することで、AIにスキーマに従ったレスポンスを生成することを強制します。

- [OpenAI Doc - Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs/introduction)

早速この機能を試してみましたので、ここで簡単に紹介したいと思います。
サンプルのお題として簡単なクイズ生成機能を作成してみます。

なお、Structured Outputsはレスポンスフォーマットと[Function calling](https://platform.openai.com/docs/guides/function-calling)の2つで利用できますが、ここではレスポンスフォーマットを使います。Function callingはコラムで触れていますのでそちらをご参考ください。

## セットアップ

ここではNode.js＋TypeScriptで実装します。
任意のディレクトリを作成してNPMプロジェクトを作成します。

```shell
npm init -f
npm install openai zod @inquirer/prompts typescript tsx
npx tsc --init
```

OpenAIのライブラリの他に、スキーマ生成用に[Zod](https://zod.dev/)、クイズのプロンプト入力用に[@inquirer/prompts](https://www.npmjs.com/package/@inquirer/prompts)をインストールしています。
ここでは現時点で最新の`4.55.1`の[OpenAIのNodeライブラリ](https://github.com/openai/openai-node)を入れています。Structured Outputsは`4.55.0`以降から反映されています。

なお、本題ではないのでTypeScript関連の設定方法は省略します[^1]。

[^1]: ここではTop-level awaitが使いたかったのでESMに変更しました(package.jsonのtypeを`module`にし、tsconfig.jsonのtargetを`ESNext`、moduleを`NodeNext`にしました)。

## JSONスキーマで構造を定義する
この方法はお勧めの方法ではありませんが、Structured Outputsを理解するための基本です。

以下のようなソースコードになります。

```typescript:jsonschema.ts
import OpenAI from 'openai';
import { input } from '@inquirer/prompts';

const client = new OpenAI();

// JSONスキーマ
const schema = {
  type: 'object',
  properties: {
    question: {
      type: 'string'
    },
    choices: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          num: {
            type: 'number',
            description: '1からの連番'
          },
          answer: {
            type: 'string'
          }
        },
        required: [
          'num',
          'answer'
        ],
        additionalProperties: false
      }
    },
    correct_num: {
      type: 'number'
    },
    score: {
      type: 'number',
      description: '問題の難易度に応じて1から10'
    }
  },
  required: [
    'question',
    'choices',
    'correct_num',
    'score'
  ],
  additionalProperties: false
};
// createではなくparseでAPIを実行する(beta)
const completion = await client.beta.chat.completions.parse({
  model: 'gpt-4o-2024-08-06', // gpt-4o-mini, gpt-4o-2024-08-06以降のモデルに対応
  messages: [
    { role: 'user', content: '難しい問題ちょうだい！' }
  ],
  response_format: {
    // Structured Output有効化
    type: 'json_schema',
    json_schema: {
      name: 'quiz',
      strict: true,
      schema,
    }
  }
});

// JSONスキーマに準じた形でパースされたものを取得
const quiz = completion.choices[0].message.parsed as any;

// クイズ開始
const message = `${quiz.question}
${quiz.choices.map((choice: any) => `${choice.num}:${choice.answer}`).join('\n')}
`;
const answer = await input({ message: message });
if (answer === quiz.correct_num.toString()) {
  console.log(`正解！！${quiz.score}点ゲットしたよ！！`);
} else {
  console.log(`残念！！正解は${quiz.correct_num}でした！！`);
}
```

上記では、まずレスポンスとなるJSON構造を[JSONスキーマ](https://json-schema.org/)で定義しています。
その後OpenAIのChat Completion APIを実行しています。ここで利用しているAPIは、従来からあるcreateではなく新しく導入されたparse(まだベータ版)を使っています[^2]。

[^2]: 従来のcreateでもStructured Outputsは利用できますが、レスポンス(content)の文字列を自分でparseする必要があります。

このとき、パラメータの`response_format`プロパティを以下のように設定します。

- `type`に`json_schema`(JSONスキーマ)を指定
- `strict`に`true`(スキーマに従う)を指定
- `schema`に定義済みのJSONスキーマを指定

新しいAPIのparseを使うとAIのレスポンスは従来のcontentではなく、parsedからパース済みのものが取得できます(JSON.parse不要)。
このオブジェクトはJSONスキーマに従ったものです。構造のチェック等は不要です。

このスクリプトを実行します。

```shell
npx tsx jsonschema.ts
```

以下のようにクイズゲームが始まります。

```
? あなたは時限爆弾の仕組みを解除する必要があります。以下の選択肢の中で、最初に行うべき適切な手順はどれですか？
1:青いワイヤーを切る
2:赤いワイヤーを切る
3:爆弾のエネルギー供給をオフにする
4:タイマーを2分進める
5:デジタルディスプレイのボタンを押す
 3
正解！！8点ゲットしたよ！！
```

:::column:Structured Outputsで使うスキーマはJSONスキーマのサブセット
Structured Outputsで指定できるスキーマはJSONスキーマのサブセットで、全ての仕様が使える訳ではありません。
例えば、思わず間違えそうなものとして以下のような制約があります。

- 全てのフィールドは必須(`required`)
- `additionalProperties`はfalseを指定
- `minLength`、`maxLength`等の制約は指定不可

これらの制約に違反している場合は、API実行時にエラーが発生します。詳細は以下公式ドキュメントに記載されています(回避策があるものもあります)。

- [OpenAI Doc - Structured Outputs - Supported schemas](https://platform.openai.com/docs/guides/structured-outputs/supported-schemas)
:::

:::column:OpenAIポリシーに違反した場合
検証できていませんが、リクエストがOpenAIのポリシーに違反した場合は、Structured Outputsでもスキーマに従ったレスポンスが返ってきません。
公式ドキュメントによると、この場合はレスポンスの`refusal`プロパティに値が設定されるとのことです。

- [OpenAI Doc - Structured Outputs - Refusals with Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs/refusals)

本記事のサンプルコードではこのチェックはしていませんが、実運用ではレスポンスを使用する前に`refusal`をチェックする必要がありそうですね。

```typescript
if (completion.choices[0].message.refusal) {
  throw new Error(completion.choices[0].message.refusal); // ポリシー違反
}
const quiz = completion.choices[0].message.parsed as any;
```
:::

:::column:Function callingでStructured Outputsを使う
Structured OutputsをFunction Callingで使う場合は、関数引数のスキーマと一緒に`strict: true`を指定します。

```typescript
const completion = await client.beta.chat.completions.parse({
  model: 'gpt-4o-2024-08-06',
  messages: [
    { role: 'user', content: 'call sampleFunc！' }
  ],
  tools: [{
    type: 'function',
    function: {
      name: 'sampleFunc',
      strict: true, // スキーマに準じた引数生成を強制
      parameters: schema
    }
  }]
});

// JSONスキーマに準じた形で返却される
const args = completion.choices[0].message.tool_calls?.[0].function.parsed_arguments as any;
```
もちろんここで指定するスキーマもレスポンスフォーマット(`response_format`)同様にStructured Outputsの制約に従う必要があります。
:::

## Zodスキーマで構造を定義する

TypeScriptに慣れている方は、[Zod](https://zod.dev/)等のスキーマライブラリを利用している方が結構多いかと思います。
OpenAI公式Nodeライブラリの`4.55.0`からは、Zodスキーマ用のヘルパーが提供されるようになりました。

- [GitHub - openai-node Structured Outputs Parsing Helpers](https://github.com/openai/openai-node/blob/master/helpers.md)

こちらを利用すると、シンプルかつTypeScriptの型システムをフル活用した実装ができます。

先ほどのコードをZodスキーマを使ったものに書き換えます。

```typescript
import OpenAI from 'openai';
import z from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { input } from '@inquirer/prompts';

const client = new OpenAI();

// Zodスキーマ
const schema = z.object({
  question: z.string(),
  choices: z.array(z.object({
    num: z.number().describe('1からの連番'),
    answer: z.string()
  })),
  correct_num: z.number(),
  score: z.number().describe('問題の難易度に応じて1から10')
});
const completion = await client.beta.chat.completions.parse({
  model: 'gpt-4o-2024-08-06',
  messages: [
    { role: 'user', content: '難しい問題ちょうだい！' }
  ],
  // Structured Output有効化
  response_format: zodResponseFormat(schema, 'quiz')
});

// Zodスキーマでパース済みのレスポンスを取得(z.infer<typeof schema>が使える)
type Quiz = z.infer<typeof schema>;
const quiz = completion.choices[0].message.parsed as Quiz;

// クイズ開始
const message = `${quiz.question}
${quiz.choices.map((choice: Quiz["choices"][number]) => `${choice.num}:${choice.answer}`).join('\n')}
`;
const answer = await input({ message });

if (answer === quiz.correct_num.toString()) {
  console.log(`正解！！${quiz.score}点ゲットしたよ！！`);
} else {
  console.log(`残念！！正解は${quiz.correct_num}でした！！`);
}
```

`zodResponseFormat`がヘルパー関数です。この関数がZodスキーマを前述のJSONスキーマに変換してくれます。
AIの出力はZodスキーマに従ったものとなりますので、`z.infer<typeof schema>`によるキャストが利用できます。その後のプロパティアクセスはIDEの補完機能がサクサク効いて楽です。
Nodeライブラリを使う場合はこれを使うべきですね。

:::column:Function callingでZodスキーマを使う
Function callingでもZodスキーマ用に`zodFunction`ユーティリティが用意されています。
この場合のソースコードは以下のようになります。
```typescript
const completion = await client.beta.chat.completions.parse({
  model: 'gpt-4o-2024-08-06',
  messages: [
    { role: 'user', content: '難しい問題ちょうだい！' }
  ],
  tools: [ zodFunction({ name: 'sampleFunc', parameters: schema }) ]
});

// JSONスキーマに準じた形で返却される
const args = completion.choices[0].message.tool_calls[0].function.parsed_arguments as z.infer<typeof schema>;
```
:::

:::column:JSONスキーマの作成にPydanticを使う
PythonでStructured Outputsを使う場合は、スキーマの定義に[Pydantic](https://docs.pydantic.dev/latest/)が使えます。

以下本サンプルのコードをPythonで書き換えたものです。

```python
import openai
from openai import OpenAI
from pydantic import BaseModel, Field
from typing import List

client = OpenAI()


class Choice(BaseModel):
    num: int = Field(description="1からの連番")
    answer: str


class Quiz(BaseModel):
    question: str
    choices: List[Choice]
    correct_num: int
    score: int = Field(description="問題の難易度に応じて1から10")


completion = client.beta.chat.completions.parse(
    model="gpt-4o-2024-08-06",
    messages=[{
        "role": "user",
        "content": "難しい問題ちょうだい！"
    }],
    response_format=Quiz
    # Function callingの場合
    # tools=[openai.pydantic_function_tool(Quiz)]
)

response = completion.choices[0].message.parsed
# Function Callingの場合
# response = (completion.choices[0].message.tool_calls or [])[0].function.parsed_arguments
assert isinstance(response, Quiz)
print(response)
# question='次のうち、紀元前の出来事として起こったのはどれですか？' choices=[Choice(num=1, answer='アレクサンドリア図書館の焼失'), Choice(num=2, answer='ハンムラビ法典の発布'), Choice(num=3, answer='ローマ帝国の東西分裂'), Choice(num=4, answer='コロンブスの新大陸発見')] correct_num=2 score=9
```

基本的な流れはZodを使った時と同じです。
Pydanticで定義したレスポンスの出力構造をAPI(parse)で指定しています。

Pythonライブラリのヘルパーについては以下にまとめられています。

- [GitHub - openai-python Structured Outputs Parsing Helpers](https://github.com/openai/openai-python/blob/main/helpers.md)
:::

## まとめ

Structured OutputsはAIをアプリケーションに組み込む場合の標準選択肢になるのかなと思います。
いろんな用途が考えられますので、うまく使っていきたいですね。
