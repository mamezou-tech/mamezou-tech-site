---
title: OpenAIのChat APIに追加されたFunction callingを使ってみる
author: noboru-kudo
date: 2023-06-14
updated: 2023-11-15
tags: [chatgpt, OpenAI]
---

2023-06-13にOpenAIからGPT-3.5-turboとGPT-4のアップデートに加えて、Function callingという機能をAPIに追加したと発表しました。

- [OpenAI Blog - Function calling and other API updates](https://openai.com/blog/function-calling-and-other-api-updates)

最初はAPI内で任意の関数呼び出しが実行できるようになるのかと思いましたが、よく読んでみるとコンテキストに応じて実行する(または実行しない)関数を選択し、その関数シグニチャーに従ったパラメータを作成してくれるものです。

ChatGPTプラグインは、コンテキストに応じてプラグインAPIを選択して実行してくれますが、Function callingは実行の直前(関数選択とパラメータ準備)までを手配してくれる感じでしょうか。

ここではこのFunction callingを実際に使ってみます。

:::info
2023-11-15: 気づいたらOpenAI APIのインタフェースがかなり変わっていましたので、現時点で最新の情報に更新しました(OpenAI Node.jsモジュールのバージョン`4.18.0`に対応しました)。
:::

## サンプル関数を準備する

まずは実行するサンプル関数を準備します。
TypeScriptで以下の関数を用意しました。

```typescript
const functions = {
  getBirthday(name: string): string {
    return name === 'mamezou' ? '1999-11-11' : '2000-01-01';
  },
  getCompanyName(name: string): string {
    return name === 'mamezou' ? '株式会社豆蔵' : 'その他';
  }
} as const;
```

2つありますが、両方とも名前(name)を受け取り、生年月日や会社名を返すものです。
実際には、社内リソースを使ったり外部APIを実行するような関数になると思います。

## Function calling(functions)を指定する

OpenAI APIのNode.js公式ライブラリを使って実装します。

```typescript
import OpenAI from 'openai';

const functions = {
  getBirthday(name: string): string {
    return name === 'mamezou' ? '1999-11-11' : '2000-01-01';
  },
  getCompanyName(name: string): string {
    return name === 'mamezou' ? '株式会社豆蔵' : 'その他';
  }
} as const;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const prompt: OpenAI.Chat.ChatCompletionMessageParam = {
  role: 'user',
  content: 'Tell me about news in Japan that happened in the year mamezou was born.Your output, except for function calling, should be in japanese.'
  // content: 'Tell me the name of the company mamezou works for?.' // getCompanyNameを実行する場合
};

const response1 = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [prompt],
  tool_choice: 'auto',
  tools: [{
    type: 'function',
    function: {
      name: 'getCompanyName',
      description: 'Retrieve the company to which the user belongs.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The user name'
          }
        },
        required: ['name']
      }
    }
  }, {
    type: 'function',
    function: {
      name: 'getBirthday',
      description: 'Retrieve the user\'s birthday.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The user name'
          }
        },
        required: ['name']
      }
    }
  }]
});

const message1 = response1.choices[0].message;
```

`mamezou`が生まれた年(1999年)に起きたニュースをChat Completion API(以下 Chat API)に教えてもらうコードです。

Function callingを使う場合は、`tool_choice`と`tools`というフィールドで制御します。

`tool_choice`は関数の選択方法を指定します。通常は`none`でエンドユーザーとの対話(つまり関数呼び出ししない)になりますが、`auto`にするとChat APIにエンドユーザーとの対話 or 関数呼び出しを選ばせるようになります。
上記では明示的に`auto`を指定していますが、`tools`を指定する場合は`auto`がデフォルトになるようです。

:::info
以前は`function_call`でしたが、現在は非推奨となっています。
また、ここで特定の関数を指定すると利用する関数を強制できます。
```typescript
  // ...
  tool_choice: {
    type: 'function',
    function: {
      name: 'getBirthday'
    }
  }
  // ...
```
どの関数を実行するのかをChat APIに委ねたくない場合に活用できそうです。
:::

`tools`がFunction callingの本体部分です。Chat APIが実行可能な(実際に呼び出す訳ではないですが)関数を列挙します。
なお、現時点で利用可能な`type`は`function`のみです。

`name`は関数名で必須です。`description`は任意ですが、関数呼び出しの判定に使っている可能性が高いので記述しておいた方が良いと思います。

`parameters`配下にChat APIが従うべきパラメータを[JSON Schema](https://json-schema.org/)で記述します。
Chat APIはこのスキーマに準じたパラメータを生成してくれます。

`model`には利用するモデルを指定します。Function callingで使えるモデルは公式ドキュメンを参照してください。

- [OpenAI Doc - function calling - Supported models](https://platform.openai.com/docs/guides/function-calling/supported-models)

:::info
`functions`に指定する内容も入力トークンとして課金対象となるようです(`system`メッセージ扱い)。
大量の関数や膨大なスキーマを指定する場合には、トークン最大値制限や課金の状況にも注意が必要です。
以下[公式ドキュメント](https://platform.openai.com/docs/guides/function-calling)からの引用です。

> Under the hood, functions are injected into the system message in a syntax the model has been trained on. This means functions count against the model's context limit and are billed as input tokens. If running into context limits, we suggest limiting the number of functions or the length of documentation you provide for function parameters.
:::

これを実行すると、以下のようなレスポンス(message)が返ってきます[^1]。

[^1]: 実行にはOpenAI APIの[APIキー](https://platform.openai.com/account/api-keys)を取得して、環境変数(`OPENAI_API_KEY`)に指定する必要があります。

```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_0xBlsazt2SlXGRNc3rKmfIx2",
      "type": "function",
      "function": {
        "name": "getBirthday",
        "arguments": "{\n  \"name\": \"mamezou\"\n}"
      }
    }
  ]
}
```

ユーザーとの対話の場合は、`content`にレスポンスが入ってきますが`null`となっています。
その代わりに`tool_calls`というフィールドが追加になっています。
ここに値が入ると、Chat APIはエンドユーザーとの対話でなく、関数呼び出しを選択していることになります。
ここでは`getBirthday`関数を呼び出すと判定し、その引数(`arguments`)として`name: mamezou`を生成している様子が分かります。

## 関数呼び出しと実行結果をChat APIに連携する

では、Chat APIの指示に従って関数を呼び出し、その結果をAPIに連携します。
続きのコードは、以下のように書きました。

```typescript
const [functionCall] = message1?.tool_calls ?? [];
if (!functionCall) {
  console.log('Sorry, Chat API made the decision not to call the function...');
  process.exit(1);
}

// Chat APIが指定した関数を実行
const args = JSON.parse(functionCall.function.arguments || '{}');
// @ts-ignore
const funcResponse = (functions[functionCall.function.name!])(args.name);

// 関数の実行結果に連携
const response2 = await openai.chat.completions.create(
  {
    model: 'gpt-4',
    messages: [prompt, message1, {
      role: 'tool',
      content: funcResponse,
      tool_call_id: functionCall.id
    }]
  }
);
console.log(response2.choices[0].message);
```

`functionCall.function.name`で指定された関数を実行し、その結果をChat APIに連携しています。
なお、ここでの連携はAPIが会話のコンテキストを理解できるように過去のやりとりを含めるようにします。

ここでのポイントは最後のメッセージです。
今までは`role`に指定する値は`system`/`user`/`asistant`だけでしたが、新たに`tool`が加わりました。これは関数自体がChat APIと会話する時に使われるロールのようです。
ロールに`tool`を指定する場合は`tool_call_id`も必須で、ここにはChat APIから返されたツールのIDを設定します。

:::info
以前はFunction callingの結果連携時の`role`は`function`でした。これは現在は非推奨で代わりに`tool`を使うことが推奨されています。
:::

もちろん、`content`には関数の実行結果を設定します。ここでは先ほど`mamezou`という名前では`1999-11-11`を返す関数にしましたので、この値が設定されます。

これを実行すると以下のメッセージが返ってきました。

```json
{
  "role": "assistant",
  "content": "1999年、つまり豆蔵が生まれた年には、たくさんの出来事がありました。その中でも特に注目すべきは以下のようなニュースです。\n\n1. 茨城県で発生した茨城県南部地震が記憶に新しい。最大震度6弱を記録し、被害が広範囲に及んだ。\L3DO FZ-10」を発表した。これは、家庭用ゲーム機としては初めて3D映像を出力することが可能だった。\n\n4. また、この年には、小惑星「エロス」への無人探査機「NEARショーメーカー」が打ち上げられた。この探査機は、地球から約2億km離れたエロスでは、アニメ映画「となりのトトロ」が大ヒットし、その人気は未だ衰えない 。 同年、宮崎駿の「もののけ姫」が公開され、国内外で大きな話題を呼んだ。\n\n以上、豆蔵が生まれた1999年の主な出来事をご紹介しました。"
}
```

期待通り1999年に関するニュースが返ってきました。

:::column:並列に関数を実行する
2023/11のアップデートでChat APIが複数の関数呼び出しを返却し、その実行結果を同時に連携できるようになりました。
これにより関数の並列実行が可能となり、パフォーマンスを改善できるようになりました。
詳細は以下公式ドキュメントを参照しくてください。

- [OpenAI Doc - Function calling - Parallel function calling](https://platform.openai.com/docs/guides/function-calling/parallel-function-calling)
:::

## 最後に

今までもLangChain等のライブラリを使えば、割と簡単に関数呼び出しできましたが、OpenAI APIとして正式サポートされたことで外部APIとの連携が急速に広まっていきそうな気がします。

今回の発表では、Function callingだけでなくGPT-3の値下げや16Kトークンまで使える`gpt-3.5-turbo-16k`新設といった開発者にうれしいものが多くありました。
ChatGPTだけでなくOpenAI APIのエコシステムをめぐる動向も引き続き注目が必要そうですね。

---

参考

- [OpenAI Doc - GPT models - Function calling](https://platform.openai.com/docs/guides/function-calling)