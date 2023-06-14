---
title: OpenAI APIのChatAPIで新しく導入されたFunction callingを使ってみる
author: noboru-kudo
date: 2023-06-14
tags: [chatgpt, gpt]
---

2023-06-13にOpenAIからGPT-3.5-turboとGPT-4のアップデートに加えて、Function callingという機能を追加したと発表しました。

- [OpenAI Blog - Function calling and other API updates](https://openai.com/blog/function-calling-and-other-api-updates)

APIで任意の関数呼び出しが実行できるようになるのかと勘違いしましたが、よく読んでみるとコンテキストに応じて実行する(または実行しない)関数を選択し、その関数シグニチャーに従ったパラメータを作成してくれるもののようです。

ChatGPTプラグインはコンテキストに応じてプラグインAPIを選択して実行してくれますが、Function callingは実行の直前(関数とパラメータ準備)までを手配してくれる感じでしょうか。

ここではこのFunction callingを実際に使ってみます。

## 関数準備

まずは実行する関数を準備します。
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

2つありますが両方とも名前(name)を受け取り、生年月日や会社名を返すものです。
実際には、社内リソースを使ったり外部APIを実行したりするような感じになると思います。

## Function calling(functions)を指定する

APIはOpenAIの公式ライブラリを使って実装します。
Node.jsライブラリでは、`3.3.0`でFunction calling関連のインターフェースが追加されていました。

```typescript
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

const prompt: ChatCompletionRequestMessage = {
  role: 'user',
  content: 'Tell me about news in Japan that happened in the year mamezou was born.Your output, except for function calling, should be in japanese.'
  // content: 'Tell me the name of the company mamezou works for?.' // getCompanyNameを実行する場合
};

const response1 = await openai.createChatCompletion({
  model: 'gpt-4-0613', // or gpt-3.5-turbo-0613
  messages: [prompt],
  function_call: 'auto',
  functions: [{
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
  }, {
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
  }]
});

const message1 = response1.data.choices[0].message;
```

`mamezou`が生まれた年(1999年)に起きたニュースをChat Completion API(以下 Chat API)に教えてもらうコードです。

Function callingを使う場合は、`function_call`と`functions`というフィールドで制御します。

`function_call`は`auto`または`none`が選択できます。通常は`none`でエンドユーザーとの対話(つまり関数呼び出ししない)になりますが、`auto`にするとChat APIがエンドユーザー対話か関数呼び出しを自動判定するようになります。
上記では明示的に`auto`を指定していますが、`functions`を指定する場合は`auto`がデフォルトになるようです。

`functions`がFunction callingの本体部分です。Chat APIが実行可能な(実際には呼び出す訳ではないですが)関数のシグニチャを列挙します。
`name`は必須で、`description`は任意になっていますが、Chat APIが関数呼び出しを判定するための説明なので記述した方が良いかと思います。
`parameters`配下にChat APIが従うべきパラメータのスキーマを[JSON Schema](https://json-schema.org/)で記述します。
Chat APIはこのスキーマに準じたパラメータを生成してくれます。

また、現時点でFunction callingが使えるモデルは`gpt-3.5-turbo-0613`または`gpt-4-0613`のみです。指定する`model`はこのどちらかを指定します。

:::info
`functions`に指定する内容も入力トークンとして課金対象となるようです(`system`メッセージ扱い)。
大量の関数や膨大なスキーマを指定する場合には、トークン最大値制限や課金の状況にも注意が必要です。
以下[公式ドキュメント](https://platform.openai.com/docs/guides/gpt/function-calling)からの引用です。

> Under the hood, functions are injected into the system message in a syntax the model has been trained on. This means functions count against the model's context limit and are billed as input tokens. If running into context limits, we suggest limiting the number of functions or the length of documentation you provide for function parameters.
:::

これを実行すると、以下のようなレスポンス(message)が返ってきます[^1]。

[^1]: 実行にはOpenAI APIの[APIキー](https://platform.openai.com/account/api-keys)を取得して、環境変数(`OPENAI_API_KEY`)に指定する必要があります。

```json
{
  "role": "assistant",
  "content": null,
  "function_call": {
    "name": "getBirthday",
    "arguments": "{\n  \"name\": \"mamezou\"\n}"
  }
}
```

ユーザーとの対話の場合は、`content`にレスポンスが入ってきますが`null`となっています。
その代わりに`function_call`というフィールドが追加になっています。
ここに値が入ると、Chat APIはエンドユーザーとの対話でなく、関数呼び出しを選択していることになります。
ここでは`getBirthday`関数を呼び出すと判定し、その引数(`arguments`)として`name: mamezou`を生成している様子が分かります。

## 関数呼び出しと実行結果をChat APIに連携する

では、Chat APIの指示に従って関数を呼び出し、その結果をAPIに連携します。
続きのコードは、以下のように書きました。

```typescript
const functionCall = message1?.function_call;
if (!functionCall) {
  console.log('Sorry, Chat API made the decision not to call the function...');
  process.exit(1);
}

// Chat APIが指定した関数を実行
const args = JSON.parse(functionCall.arguments || '{}');
// @ts-ignore
const funcResponse = (functions[functionCall.name!])(args.name);

// 関数の実行結果に連携
const response2 = await openai.createChatCompletion(
  {
    model: 'gpt-4-0613', // or gpt-3.5-turbo-0613
    messages: [prompt, message1, {
      role: 'function',
      content: funcResponse,
      name: functionCall.name
    }]
  }
);
console.log(response2.data.choices[0].message);
```

`functionCall.name`で指定された関数を実行し、その結果をChat APIに連携しています。
なお、ここでの連携はAPIが会話のコンテキストを理解できるように過去のやりとりを含めるようにします。

ここでのポイントは最後のメッセージです。
今までは`role`に指定する値は`system`/`user`/`asistant`だけでしたが、新たに`function`が加わりました。これは関数自体がGPTと会話する時に使われるロールのようです。
ロールに`function`を指定する場合は`name`も必須で、ここには関数名を設定します。
もちろん、`content`には関数の実行結果を設定します。ここでは先ほど`mamezou`という名前では`1999-11-11`を返す関数にしましたので、この値が設定されます。

これを実行すると以下のメッセージが返ってきました。

```json
{
  "role": "assistant",
  "content": "「まめぞう」は1999年に生まれました。その年の日本のニュースについて調査します。\n\n1999年は、以下のような重要な出来事が日本国内で起きました。\n\n1. 1月17日：阪神淡路大震災から四周年。 \n2. 1月31日：日本の宇宙開発机構応するため、看護師や介護士などの雇用を促進。\n5. 9月21日：台風18号が関東地方を直撃、多数の死傷者と甚大な被害を出す。\n6. 11月26日：兵庫県産業振興機構（HIA）が、日本初の商用マグネットリヴィトラム（HSST）を開通。\n\nこのように1999年は、科学技術、災害など様々な出来事があった年でした。"
}
```

期待通り1999年に関するニュースが返ってきました。


## 最後に

今までもLangChain等のライブラリを使えば、割と簡単に関数呼び出しできましたが、OpenAI APIとして正式サポートされたことで外部APIとの連携が急速に広まっていきそうな気がします。

今回の発表では、GPT-3の値下げや16Kトークンまで使える`gpt-3.5-turbo-16k`新設といった開発者にうれしいものもありました。
ChatGPTだけでなくOpenAI APIのエコシステムをめぐる動向も引き続き注目が必要そうですね。

---

参考

- [OpenAI Doc - GPT models - Function calling](https://platform.openai.com/docs/guides/gpt/function-calling)