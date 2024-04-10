---
title: OpenAI Assistants APIのストリームレスポンスでUXを改善する
author: noboru-kudo
date: 2024-04-10
tags: [OpenAI, GPT]
---

OpenAIの[Assistants API](https://platform.openai.com/docs/assistants/overview)はスレッドによる会話コンテキストの維持やFunction calling、Retrieval等のツールが使えて便利ですね。
ただ、ユーザーとインタラクティブに対話するためには、アシスタント(とその先のGPT)がレスポンスを完全に生成するまでポーリングする必要がありました。
これだとユーザーが体感する待ち時間は長くなり、UX的に今ひとつになってしまいます。

これを打開すべく、先月(2024-03-14)OpenAIから以下の発表がありました。

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Streaming is now available in the Assistants API! You can build real-time experiences with tools like Code Interpreter, retrieval, and function calling.<a href="https://t.co/B0Vytm6zyE">https://t.co/B0Vytm6zyE</a> <a href="https://t.co/9QWQnQRH9x">pic.twitter.com/9QWQnQRH9x</a></p>&mdash; OpenAI Developers (@OpenAIDevs) <a href="https://twitter.com/OpenAIDevs/status/1768018196651802850?ref_src=twsrc%5Etfw">March 13, 2024</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

Chat APIの方でサポートされていたStream形式のレスポンスがAssistants APIの方でもついにサポートされたようです。

今回はこれを試してみましたので、ここでご紹介します。

## 事前準備

ここでは、Node.js(TypeScript)でターミナル形式での会話スクリプトを作成します。

任意のNPMプロジェクトに以下をインストールします(本題でないのでTypeScript関連の設定は省略しています)。

```shell
npm install openai @inquirer/prompts
```

ここで使用したOpenAIのライブラリは現時点で最新の`4.33.0`です。
なお、[@inquirer/prompts](https://www.npmjs.com/package/@inquirer/prompts)はCLIでユーザー対話をサポートするライブラリです。

## 全体的な枠組みを作る

ソースコード全体の枠組みを作成します。
この部分は、以下のAssistants API紹介記事から簡略化して持ってきています。

- [OpenAIのAssistants API(ベータ版)を試す](/blogs/2023/11/08/openai-assistants-api-intro/)

```typescript
import OpenAI from 'openai';
import { input } from '@inquirer/prompts';

const openai = new OpenAI();
const assistant = await openai.beta.assistants.create({
  name: 'フリーザ様',
  instructions: 'You act as Frieza from Dragon Ball. Speak in Japanese',
  model: 'gpt-4-turbo'
});

const thread = await openai.beta.threads.create();

try {
  while (true) {
    const req = await input({ message: '>' }); // ユーザーからのプロンプトを取得する
    if (req === 'q') break; // `q`で終了
    await openai.beta.threads.messages.create(
      thread.id,
      {
        role: 'user',
        content: req
      }
    );

    // ここにユーザーと会話するコードを記述する
    
    console.log();
  }
} finally {
  await Promise.all([
    openai.beta.threads.del(thread.id), 
    openai.beta.assistants.del(assistant.id)
  ]);
}
```

まず、Assistants APIのアシスタントと会話履歴を管理するスレッドを作成し、その後はユーザーが`q`を入力するまでアシスタントとの対話を続けます。
そして最後に作成したスレッドとアシスタントを削除します[^1]。

[^1]: アシスタントは残り続けるので消し忘れたらOpenAI APIの管理コンソールから削除しておきましょう。

## ストリームレスポンスを使う

ストリーム形式でレスポンスを受け取るには、スレッド実行時に以下のように記述します。

```typescript
const stream = await openai.beta.threads.runs.create(thread.id, {
  assistant_id: assistant.id,
  stream: true // ストリームレスポンス有効化
});
for await (const event of stream) {
  if (event.event === 'thread.message.delta') {
    const chunk = event.data.delta.content?.[0];
    if (chunk && chunk.type === 'text') {
      process.stdout.write(chunk.text?.value ?? '');
    }
  }
}
```

今までと違ってスレッド実行時に`stream: true`を指定しています。
こうするとアシスタントはいつもの実行結果(Runインスタンス)ではなく、ストリーム(Stream)を返してきます。
このストリームは[AsyncIterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncIterator)を実装していますので、for awaitでスレッド実行が終わるまで各種イベントを購読できます。
購読可能なイベントは以下の通りです。

```typescript
export type AssistantStreamEvent =
  | AssistantStreamEvent.ThreadCreated
  | AssistantStreamEvent.ThreadRunCreated
  | AssistantStreamEvent.ThreadRunQueued
  | AssistantStreamEvent.ThreadRunInProgress
  | AssistantStreamEvent.ThreadRunRequiresAction
  | AssistantStreamEvent.ThreadRunCompleted
  | AssistantStreamEvent.ThreadRunFailed
  | AssistantStreamEvent.ThreadRunCancelling
  | AssistantStreamEvent.ThreadRunCancelled
  | AssistantStreamEvent.ThreadRunExpired
  | AssistantStreamEvent.ThreadRunStepCreated
  | AssistantStreamEvent.ThreadRunStepInProgress
  | AssistantStreamEvent.ThreadRunStepDelta
  | AssistantStreamEvent.ThreadRunStepCompleted
  | AssistantStreamEvent.ThreadRunStepFailed
  | AssistantStreamEvent.ThreadRunStepCancelled
  | AssistantStreamEvent.ThreadRunStepExpired
  | AssistantStreamEvent.ThreadMessageCreated
  | AssistantStreamEvent.ThreadMessageInProgress
  | AssistantStreamEvent.ThreadMessageDelta
  | AssistantStreamEvent.ThreadMessageCompleted
  | AssistantStreamEvent.ThreadMessageIncomplete
  | AssistantStreamEvent.ErrorEvent;
```

多くのイベントをここで購読できることが分かります。
とはいえ、最も重要なイベントは`AssistantStreamEvent.ThreadMessageDelta`です。
このイベントに新しいメッセージの差分が含まれています。

ここではこのイベントを購読して、そのメッセージ差分を標準出力に書き出しています。

:::column:Stream専用のAPIを使う

OpenAIのライブラリにはストリームレスポンスに特化したAPIも含まれていました。
こちらはストリームに対してイテレートするのではなく、購読対象のイベントにリスナーを追加する形です。

```typescript
const stream = openai.beta.threads.runs
  .stream(thread.id, { assistant_id: assistant.id })
  .on('textDelta', (delta, snapshot) => process.stdout.write(delta.value ?? ''));
await stream.finalRun();
```

こちらの方が可読性は高いと思いますので、基本的にはこちらを使用した方が良いと思います。
:::

以下は動画です。

<div class="mb-5">
<a href="https://gyazo.com/a1a13b587a8f0cf0117328a1503fc98c">
<video width="100%" autoplay muted loop playsinline controls>
<source src="https://i.gyazo.com/a1a13b587a8f0cf0117328a1503fc98c.mp4" type="video/mp4"/>
</video>
</a>
</div>

全てのメッセージが完成するのを待つのではなく、段階的にメッセージが出力されているのが確認できます。

## まとめ

Assistants APIでストリーム形式のレスポンスが簡単に使えるようになりました。
ユーザーと直接対話するようなリアルタイム性が求められるシーンで活用されていくと思います。
