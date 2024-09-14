---
title: 新しく導入されたOpenAIのバッチAPIを使ってみる
author: noboru-kudo
date: 2024-04-17
tags: [OpenAI, GPT, 生成AI]
image: true
---

2024-04-16にOpenAIから複数APIを一括実行するバッチAPIが発表されました。

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Introducing the Batch API: save costs and get higher rate limits on async tasks (such as summarization, translation, and image classification).<br><br>Just upload a file of bulk requests, receive results within 24 hours, and get 50% off API prices: <a href="https://t.co/ls8DjR6qA9">https://t.co/ls8DjR6qA9</a> <a href="https://t.co/3W1GHijV3S">pic.twitter.com/3W1GHijV3S</a></p>&mdash; OpenAI Developers (@OpenAIDevs) <a href="https://twitter.com/OpenAIDevs/status/1779922566091522492?ref_src=twsrc%5Etfw">April 15, 2024</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

なんと24時間以内で終わる場合は、バッチAPIのコストは半分で済むようです。
以下はOpenAIの[Pricingページ](https://openai.com/pricing)からの抜粋です。

> Language models are also available in the Batch API that returns completions within 24 hours for a 50% discount.

今回はこれを試してみましたのでご紹介します。

- [OpenAI API Reference - Batch](https://platform.openai.com/docs/api-reference/batch)

## 事前準備

バッチで日本語を英訳するスクリプトを作成してみます。スクリプトはNode.js(TypeScript)で作成します。

任意のNPMプロジェクトに以下をインストールします(本題でないのでTypeScript関連の設定は省略しています)。

```shell
npm install openai
```

ここで使用したOpenAIのライブラリは現時点で最新の`4.36.0`です。バッチAPIは`4.34.0`以降から使えるようになっています。

なお、(ChatGPTではなく)OpenAI APIのアカウントは作成済みで、APIキーを発行していることを前提としています。

## 入力データを準備する

まずは入力データを準備して[File API](https://platform.openai.com/docs/api-reference/files/create)を使ってアップロードします。

```typescript
import OpenAI, { toFile } from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-xxxxxxxxxx'
});

const system = {
  'role': 'system',
  'content': 'あなたは英語翻訳者です。与えられらた文章の英訳のみを出力してください。'
};
const request = [
    {
      custom_id: 'request-1', // リクエストを識別する任意のID
      method: 'POST',         // 現時点ではPOSTのみ
      url: '/v1/chat/completions', // 現時点ではこれのみ
      // urlに対応したリクエストボディ(現時点ではChat Completion APIのみ)
      body: {
        model: 'gpt-3.5-turbo',
        messages: [system, { role: 'user', content: 'OpenAIからバッチAPIがリリースされました。コストが半額になるよ！' }]
      }
    },
    {
      custom_id: 'request-2',
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-3.5-turbo',
        messages: [system, { role: 'user', content: 'OpenAIのダッシュボードからプロジェクトの概念が導入されたよ！' }]
      }
    },
    {
      custom_id: 'request-3',
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-3.5-turbo',
        messages: [system, { role: 'user', content: 'アシスタントAPIでストリームレスポンスが使えるようなったよ！' }]
      }
    }
  ];
const encoder = new TextEncoder();
const jsonl = request.map(line => JSON.stringify(line)).join('\n'); // JSONLフォーマットに変換
const file = await openai.files.create({
  file: await toFile(encoder.encode(jsonl), 'translation.jsonl'), // 拡張子はjsonl
  purpose: 'batch' as any // batch必須。4.36.0時点ではまだbatchが指定できなかったので強制的に設定してます
});
```

今回はスクリプト内で入力データを作成しています。1件あたりの入力データは以下の通りです。

- custom_id: リクエストを識別するID。バッチリクエスト内で一意にする。
- method: リクエストに使われるHTTPメソッド。現時点では`POST`のみをサポート
- url: バッチAPIで利用するAPIのエンドポイント。現時点では[Chat Completion API](https://platform.openai.com/docs/api-reference/chat/create)のみをサポート。
- body: 利用するAPIのリクエストボディ。

バッチAPIに投入するファイルは[JSONLフォーマット](https://jsonlines.org/)である必要があります(拡張子も.jsonl)。上記ではJSONを文字列化して改行区切りに変換してアップロードしています。
ちなみに、JSONLファイルとして作成すると以下のようになります(冗長な感じになります)。

```
{"custom_id": "request-1", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-3.5-turbo", "messages": [{"role": "system", "content": "あなたは英語翻訳者です。与えられらた文章の英訳のみを出力してください。"}, {"role": "user", "content": "OpenAIからバッチAPIがリリースされました。コストが半額になるよ！"}]}}
{"custom_id": "request-2", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-3.5-turbo", "messages": [{"role": "system", "content": "あなたは英語翻訳者です。与えられらた文章の英訳のみを出力してください。"}, {"role": "user", "content": "OpenAIのダッシュボードからプロジェクトの概念が導入されたよ！"}]}}
{"custom_id": "request-3", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-3.5-turbo", "messages": [{"role": "system", "content": "あなたは英語翻訳者です。与えられらた文章の英訳のみを出力してください。"}, {"role": "user", "content": "アシスタントAPIでストリームレスポンスが使えるようなったよ！"}]}}
```

もちろんファイルのアップロード自体もAPI経由でなく、OpenAIの[ダッシュボード](https://platform.openai.com/storage/files)からアップロードしても問題ありません。
なお、バッチAPIで使用するファイルはアップロード時に`purpose`を`batch`に設定する必要があります。

## バッチAPIを実行する

続いて新設されたバッチAPIを実行します。

```typescript
const batch = await openai.batches.create({
  endpoint: '/v1/chat/completions',
  completion_window: '24h',
  input_file_id: file.id
});

console.log(JSON.stringify(batch)); // Batchオブジェクト
// {"id":"batch_xxxxxxx","object":"batch","endpoint":"/v1/chat/completions","errors":null,"input_file_id":"file-xxxxxxxxx","completion_window":"24h","status":"validating","output_file_id":null,"error_file_id":null,"created_at":1713330734,"in_progress_at":null,"expires_at":1713417134,"finalizing_at":null,"completed_at":null,"failed_at":null,"expired_at":null,"cancelling_at":null,"cancelled_at":null,"request_counts":{"total":0,"completed":0,"failed":0},"metadata":null}
```

入力データ同様に(なぜか)ここでも利用するAPIのエンドポイントを指定します。バッチAPIは現時点では[Chat Completion API](https://platform.openai.com/docs/api-reference/chat/create)のみをサポートしていますので、`/v1/chat/completions`を設定します。

`completion_window`はバッチAPIが全てのリクエストを完了するまでの時間です。
現時点では`24h`のみが指定可能でした。
この値はバッチAPIから返ってくるBatchオブジェクトの`expires_at`に反映されていました。未検証ですがこれを超えるとバッチステータスが期限切れ(`expired`)になると思われます。

`input_file_id`は先ほどアップロードしたファイルのIDです。OpenAIのダッシュボードからでも取得できます。

![](https://i.gyazo.com/27b6bfe05ebe20e58acb697bd8407889.png)

## バッチ処理の結果を取得する

先ほどバッチAPIを実行しましたがまだ終わっていません。
バッチAPIから返ってくるBatchオブジェクトのステータスは`validating`です。
その後`in_progress`(実行中)へと変わり、実行が終わると`completed`になり、その結果がファイルとしてアップロードされます。

ここではバッチ処理が終わるまで10秒間隔でポーリングして、完了後にバッチ処理結果をコンソールに出力してみます。

```typescript
while (true) {
  await new Promise(resolve => setTimeout(resolve, 10000)); // 10秒待つ
  const current = await openai.batches.retrieve(batch.id); // 現在の状態(Batch)を取得
  if (current.status === 'failed' || current.status === 'cancelled' || current.status === 'expired') {
    throw new Error(current.status);
  }
  if (current.status === 'completed') { // バッチ処理完了
    // 出力ファイル(JSONL)を取得して結果を出力
    const content = await openai.files.content(current.output_file_id!);
    const body = await content.text();
    const outputs = body.split('\n')
      .filter(line => !!line.trim())
      .map(line => JSON.parse(line));
    outputs.forEach(output => {
      const input = request.find(req => req.custom_id === output.custom_id);
      console.log(`${output.custom_id}:
${input?.body.messages.at(-1)?.content ?? ''}
->
${output.response.body.choices[0].message.content}`);
    });
    break;
  }
}
```

ポーリング中に[バッチ取得API](https://platform.openai.com/docs/api-reference/batch/retrieve)で現在のBatch状態(`current`)を確認しています。
そのステータス(`status`)が`completed`になったら出力ファイルを[ファイル取得API](https://platform.openai.com/docs/api-reference/files/retrieve-contents)からダウンロードしています。
バッチAPIの出力ファイルもJSONL形式です。上記はそれを解析してコンソールに出力しています。
なお、出力ファイルは入力ファイルと同じ順序ではありません。入力ファイル内で指定した`custom_id`を使って紐付けする必要があります。

出力ファイルのフォーマットはOpenAI APIの公式リファレンスを参照してください。

- [OpenAI API Reference - Batch - The request output object](https://platform.openai.com/docs/api-reference/batch/requestOutput)

上記を実行すると以下のような出力が得られました。

```
request-3:
アシスタントAPIでストリームレスポンスが使えるようなったよ！
->
The stream response is now available in the Assistant API!
request-2:
OpenAIのダッシュボードからプロジェクトの概念が導入されたよ！
->
Project concepts have been introduced in OpenAI's Dashboard!
request-1:
OpenAIからバッチAPIがリリースされました。コストが半額になるよ！
->
Batch API has been released by OpenAI. The cost will be half!
```

順不同ですが、入力データとして設定した日本語が英訳されていますね。

なお、出力ファイルは入力ファイル同様にOpenAI APIのダッシュボードからでも参照可能です。

![](https://i.gyazo.com/3c8fd3f2d5883301828a2da16cc0a475.png)

ちなみに、この3件の入力データではAPI実行から出力結果ファイル取得までの時間は1分10秒ほどでしたが、20件ほどに増幅しても1分23秒程度で完了していました。
バッチAPI内部では並列処理で各APIが実行されているようです。

## まとめ

最近では様々なシーンでOpenAIのAPIは使われていると思います。
その中でチャットのようにリアルタイム性が要求されるケースは意外に限定されるのではと思います。
特に大量データを処理する必要があるようなものは、バッチAPIを活用するとコスト削減に大きく貢献しますので検討していきたいなと思いました。
