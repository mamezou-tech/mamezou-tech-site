---
title: OpenAIのAssistants API(ベータ版)を試す
author: noboru-kudo
date: 2023-11-08
tags: [OpenAI, GPT]
---


先日のOpenAIの開発者イベント(DevDay)では、新モデル(GPT-4 turbo)やカスタムGPT(GPTs)等、数多くの注目機能が発表されましたね。

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">We&#39;re rolling out new features and improvements that developers have been asking for:<br><br>1. Our new model GPT-4 Turbo supports 128K context and has fresher knowledge than GPT-4. Its input and output tokens are respectively 3× and 2× less expensive than GPT-4. It’s available now to…</p>&mdash; OpenAI (@OpenAI) <a href="https://twitter.com/OpenAI/status/1721596740024078340?ref_src=twsrc%5Etfw">November 6, 2023</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

この中で、新たなAPIとして発表されたAssistants APIに今回注目してみます。

- [OpenAI API Doc - Assistants API](https://platform.openai.com/docs/assistants/overview)

Assistants APIは会話履歴をスレッドとして管理してくれます。今までのChat Completion APIでは、文脈を維持するために履歴管理を自前でやる必要がありましたがOpenAIに委ねることができるようになりました。

また、Assistants APIはCode InterpreterやFunction Calling等の各種ツールに加えて、ファインチューニングしたカスタムモデルを使うこともできます。
これらを調停してくれるのがアシスタントです。アシスタントはリクエストの内容からGPTを使うのか各種ツールを使うのかを判断するエージェント機能としての役割を果たします。

このように、Assistants APIを使えばアプリケーションに高度なGPT機能を組み込むことが簡単になり、その使い方も多様化してくることが想像できますね。

早速これを試してみたいと思います。
ここではNode.jsで実行します。Assistants APIは[OpenAIモジュール](https://www.npmjs.com/package/openai)のv4.16.0以降のバージョンに含まれています。

なお、本文中の引用は全てAssistants APIの[公式ドキュメント](https://platform.openai.com/docs/assistants/overview)が出典元になります。

## アシスタント作成

まずは、Assistants APIのアシスタントを作成します。

```typescript
const assistant = await openai.beta.assistants.create({
  name: 'My Assistant',
  instructions: 'You act as Frieza from Dragon Ball. Speak in Japanese',
  tools: [{ type: 'code_interpreter' }, {
    type: 'function',
    function: {
      name: 'calcStrength',
      description: 'Calculate Battle Strength',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The user name'
          }
        }
      }
    }
  }],
  model: 'gpt-4',
  file_ids: []
});
```

`instructions`はChatGPTの[カスタムインストラクション](https://openai.com/blog/custom-instructions-for-chatgpt)と同じで、アシスタント自体のセットアップをします。
ここでは、某アニメキャラクターとして振る舞うようにするのと、日本語を返すようにしました。

`tools`の部分ではアシスタントが使えるツールを指定します。ここでは[Code Interpreter](https://platform.openai.com/docs/assistants/tools/code-interpreter)と[Function Calling](https://platform.openai.com/docs/assistants/tools/function-calling)を設定しました。
前述の通り、ここで指定したツールはリクエスト内容に応じてアシスタントが利用有無を判断します。

利用できるツールとしては、この他にも任意のファイルからインデックス検索する[Retrieval](https://platform.openai.com/docs/assistants/tools/knowledge-retrieval)も使えます。
Assistants APIのドキュメントによると、将来的には自作ツールを含めた拡張も予定しているようです。

> In the future, we plan to release more OpenAI-built tools, and allow you to provide your own tools on our platform

現時点で利用可能なツールの詳細は、以下公式ドキュメントを参照してください。

- [OpenAI API Doc - Assistants Tools](https://platform.openai.com/docs/assistants/tools)

最後に`model`です。GPT-3.5 または GPT-4の他にファインチューニングしたカスタムモデルも利用可能とのことです。

> you can specify any GPT-3.5 or GPT-4 models, including fine-tuned models. The Retrieval tool requires gpt-3.5-turbo-1106 and gpt-4-1106-preview models.

:::info
ここで作成したアシスタントはOpenAIのUIから参照できます（新規作成もできます）。

- <https://platform.openai.com/assistants>

一度作成したアシスタントは、APIからは`openai.beta.assistants.retrieve(assistantId)`で取得して再利用できます。
長く使うアシスタントは、都度作成するのではなく事前に登録しておく方が良いのかもしれませんね(現時点で有効期限は確認できませんでした)。
:::

## スレッド作成

次にスレッドを作成します。スレッドはユーザーとアシスタントの会話履歴を管理します。

```typescript
const thread = await openai.beta.threads.create({});
```

ここでパラメータに何も指定しませんでしたが、初期メッセージもここで設定できます。

公式ドキュメントによると、スレッドにサイズリミットはなく、利用モデルの上限に応じたメッセージの削除も自動でやってくれるそうです。

> Threads don’t have a size limit. You can pass as many Messages as you want to a Thread. The API will ensure that requests to the model fit within the maximum context window, using relevant optimization techniques such as truncation.

会話の文脈を維持するためにメッセージをどこかに保存しておいたり、モデルのトークン上限を超えないように履歴サイズ調整する手間から解放されます。

## メッセージ作成

作成したスレッドにメッセージを追加していきます。

```typescript
const message = await openai.beta.threads.messages.create(
  thread.id,
  {
    role: 'user',
    content: '豆香の戦闘力を教えてください'
  }
);
```

先ほど作成したスレッドのIDを指定してメッセージを追加しています。スレッドには複数のメッセージが追加できます。
なお、ここで指定可能なroleは`user`のみです。

## スレッド実行

メッセージを追加したので、スレッドを実行します。

```typescript
const run = await openai.beta.threads.runs.create(
  thread.id,
  {
    assistant_id: assistant.id
  }
);
```

スレッドとアシスタントのIDをそれぞれ指定するだけです。
ここでは特に指定していませんが、第2引数でアシスタント生成時に指定したツールやモデル、カスタムインストラクション等を上書き可能です。

## レスポンス取得

スレッド実行は非同期です。実行状態は以下で取得します。

```typescript
const currentRun = await openai.beta.threads.runs.retrieve(
  thread.id,
  run.id
);
```

スレッドとスレッド実行(run)のIDを設定します。
アシスタントからのレスポンスを参照するには、この`currentRun.status`が`completed`になるまで待つ必要があります。

注意点として、任意のユーザー関数を実行するFunction Callingの場合は、`status`が`completed`ではなく`requires_action`になります。
これはユーザーサイド(クライアント側)でのアクションを要求するという意味です。
この場合は、以下のように実行結果を再度アシスタントに連携する必要があります。

```typescript
if (currentRun.status === 'requires_action') {
  // 実行する関数の名前や引数を取得
  console.log('function calling -> ', currentRun.required_action?.submit_tool_outputs.tool_calls);
  // --- ここで関数実行 ---
  // 自前の関数を呼んだ体にして結果を取得
  await openai.beta.threads.runs.submitToolOutputs(
    thread.id,
    run.id,
    {
      tool_outputs: [{
        tool_call_id: currentRun.required_action?.submit_tool_outputs.tool_calls[0].id, // 複数の場合もあり
        output: '戦闘力は53万です...'
      }]
    }
  );
}
```

スレッド実行(run)の`currentRun.required_action.submit_tool_outputs.tool_calls`に実行するユーザー関数名やその引数が含まれます。上記の場合は以下のような情報が含まれます。

```typescript
[
  {
    id: 'call_zVi1576XEUYIw0MyDjxU8ZW4',
    type: 'function',
    function: { name: 'calcStrength', arguments: '{\n  "name": "豆香"\n}' }
  }
]
```

ここで取得したID(`tool_call_id`)と関数実行結果を再連携すると、再度アシスタントは実行状態(`in_progress`)に戻ります[^1]。

[^1]: ここで紹介したもの以外にもいくつかステータスが存在します。ステータスの詳細は[公式ドキュメント](https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps)を参照してください。

:::info
Function callingについては、以下記事で紹介していますので詳細は省略しています。

- [OpenAIのChat APIに追加されたFunction callingを使ってみる](/blogs/2023/06/14/gpt-function-calling-intro/)

こちらの記事はAssistants APIについてではありませんが、設定内容は同じです。
:::

最終的にステータスが`completed`になれば実行完了です。
アシスタントのレスポンスを取得します。

```typescript
const messages = await openai.beta.threads.messages.list(
  thread.id
);
for (const message of messages.data) {
  if (message.role === 'user') break; // ユーザーメッセージに到達したら終了
  // 以下はアシスタント(role===assistant)メッセージ
  const [content] = message.content;
  switch (content.type) {
    case 'text':
      console.log(content.text.value);
      break;
    case 'image_file':
      console.log('image_file', content.image_file.file_id);
  }
}
```

スレッドIDを指定して、メッセージを取得して直近のアシスタントメッセージを表示しています。

なお、レスポンスタイプとしてイメージファイル(`image_file`)もサポートされています(この場合は現時点で最新のモデル`gpt-4-1106-preview`を指定する必要がありました)。
上記はファイルIDを出力しているだけですが、この後で[ファイル取得API](https://platform.openai.com/docs/api-reference/files/retrieve-contents)を実行すれば、イメージファイルも取得できます[^2]。

[^2]: テキストベースのレスポンスでも注釈(annotations)にファイルIDが含まれていることもあります。詳細は[公式ドキュメント](https://platform.openai.com/docs/assistants/how-it-works/managing-threads-and-messages)を参照してください。

## CLIベースのChatGPTを作成する

即席ですが、今までの内容をまとめてCLIベースのChatGPTを書いてみました。

```typescript
import OpenAI from 'openai';
import { input } from '@inquirer/prompts';

const openai = new OpenAI();

// アシスタント作成
const assistant = await openai.beta.assistants.create({
  name: 'My Assistant',
  instructions: 'You act as Frieza from Dragon Ball. Speak in Japanese',
  tools: [{ type: 'code_interpreter' }, {
    type: 'function',
    function: {
      name: 'calcStrength',
      description: 'Calculate Battle Strength',
      parameters: {
        type: 'object', properties: {
          name: {
            type: 'string',
            description: 'The user name'
          }
        }
      }
    }
  }],
  model: 'gpt-4',
  file_ids: []
});

// スレッド作成
const thread = await openai.beta.threads.create({});

while (true) { // 会話ループ
  const req = await input({ message: '>' });
  if (req === 'q') break; // `q`で終了
  // スレッドにメッセージ追加
  const message = await openai.beta.threads.messages.create(
    thread.id,
    {
      role: 'user',
      content: req
    }
  );

  // スレッド実行
  const run = await openai.beta.threads.runs.create(
    thread.id,
    {
      assistant_id: assistant.id
    }
  );

  // 完了するまでポーリング
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const currentRun = await openai.beta.threads.runs.retrieve(
      thread.id,
      run.id
    );
    if (currentRun.status === 'completed') {
      break;
    } else if (currentRun.status === 'requires_action') {
      console.log('function calling -> ', currentRun.required_action?.submit_tool_outputs.tool_calls);
      // 自前の関数を呼んだ体にする
      await openai.beta.threads.runs.submitToolOutputs(
        thread.id,
        run.id,
        {
          tool_outputs: [{
            tool_call_id: currentRun.required_action?.submit_tool_outputs.tool_calls[0].id, // 複数の場合もあり
            output: '戦闘力は53万です...'
          }]
        }
      );
    } else if (currentRun.status === 'failed' || currentRun.status === 'cancelled' || currentRun.status === 'expired') {
      throw new Error(currentRun.status);
    }
  }

  // レスポンス取得
  const messages = await openai.beta.threads.messages.list(thread.id);
  const result = [];
  for (const message of messages.data) {
    if (message.role === 'user') break;
    const [content] = message.content;
    switch (content.type) {
      case 'text':
        result.push(content.text.value);
        break;
      case 'image_file':
        console.log('image_file', content.image_file.file_id);
    }
  }
  console.log(result.reverse().join('\n'));
}

// クリーンアップ処理
await Promise.all([openai.beta.threads.del(thread.id), openai.beta.assistants.del(assistant.id)]);
```

これを実行すると、以下ような感じになりました。

![](https://i.gyazo.com/6dd5155a47f1db3df6ffce3c0c22e264.png)

大した量のコードは書いていませんが、なかなかいい感じのフリーザ様ですね。

## まとめ

今回はOpenAIに導入されたベータ版のAssistants APIを試してみました。
少しのコードを書くだけで、結構何でもできる感じがします。
うまくアプリケーションに組み込めれば、革新的なものができそうで夢が膨らんできますね。

今度は今回できなかったファイル周りも再チャレンジしてみたいと思います。