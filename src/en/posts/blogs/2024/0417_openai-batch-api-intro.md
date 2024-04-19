---
title: Trying Out the Newly Introduced OpenAI Batch API
author: noboru-kudo
date: 2024-04-17T00:00:00.000Z
tags:
  - OpenAI
  - GPT
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/04/17/openai-batch-api-intro/).
:::



On April 16, 2024, OpenAI announced a new Batch API that allows for the execution of multiple APIs in bulk.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Introducing the Batch API: save costs and get higher rate limits on async tasks (such as summarization, translation, and image classification).<br><br>Just upload a file of bulk requests, receive results within 24 hours, and get 50% off API prices: <a href="https://t.co/ls8DjR6qA9">https://t.co/ls8DjR6qA9</a> <a href="https://t.co/3W1GHijV3S">pic.twitter.com/3W1GHijV3S</a></p>&mdash; OpenAI Developers (@OpenAIDevs) <a href="https://twitter.com/OpenAIDevs/status/1779922566091522492?ref_src=twsrc%5Etfw">April 15, 2024</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

It seems that if completed within 24 hours, the cost of using the Batch API is halved. Below is an excerpt from OpenAI's [Pricing page](https://openai.com/pricing).

> Language models are also available in the Batch API that returns completions within 24 hours for a 50% discount.

I tried this out and will introduce it here.

- [OpenAI API Reference - Batch](https://platform.openai.com/docs/api-reference/batch)

## Preliminary Preparation

I will create a script to translate Japanese into English in batch. The script is created in Node.js (TypeScript).

Install the following in any NPM project (TypeScript-related settings are omitted as they are not the main topic).

```shell
npm install openai
```

The OpenAI library used here is currently the latest version `4.36.0`. The Batch API has been available since `4.34.0`.

It is assumed that you have already created an OpenAI API account and issued an API key.

## Prepare the Input Data

First, prepare the input data and upload it using the [File API](https://platform.openai.com/docs/api-reference/files/create).

```typescript
import OpenAI, { toFile } from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-xxxxxxxxxx'
});

const system = {
  'role': 'system',
  'content': 'You are an English translator. Please output only the English translation of the given text.'
};
const request = [
    {
      custom_id: 'request-1',
      method: 'POST',
      url: '/v1/chat/completions',
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
const jsonl = request.map(line => JSON.stringify(line)).join('\n');
const file = await openai.files.create({
  file: await toFile(encoder.encode(jsonl), 'translation.jsonl'),
  purpose: 'batch' as any
});
```

## Execute the Batch API

Next, execute the newly established Batch API.

```typescript
const batch = await openai.batches.create({
  endpoint: '/v1/chat/completions',
  completion_window: '24h',
  input_file_id: file.id
});

console.log(JSON.stringify(batch));
```

## Retrieve Batch Processing Results

After executing the Batch API, it is not yet finished. The status of the Batch object returned by the Batch API is `validating`. After that, it changes to `in_progress` (in progress), and when the execution is completed, it becomes `completed`, and the results are uploaded as a file.

Here, we poll every 10 seconds until the batch processing is completed, and output the batch processing results to the console after completion.

```typescript
while (true) {
  await new Promise(resolve => setTimeout(resolve, 10000));
  const current = await openai.batches.retrieve(batch.id);
  if (current.status === 'failed' || current.status === 'cancelled' || current.status === 'expired') {
    throw new Error(current.status);
  }
  if (current.status === 'completed') {
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

Checking the current Batch status (`current`) via the [Batch Retrieval API](https://platform.openai.com/docs/api-reference/batch/retrieve) during polling.
When that status (`status`) becomes `completed`, the output file is being downloaded from the [File Retrieval API](https://platform.openai.com/docs/api-reference/files/retrieve-contents).
The output files of the Batch API are also in JSONL format. The above is parsing it and outputting it to the console.
The output file is not in the same order as the input file. You will need to link them using the `custom_id` specified in the input file.

Please refer to the OpenAI API official reference for the format of the output file.

- [OpenAI API Reference - Batch - The request output object](https://platform.openai.com/docs/api-reference/batch/requestOutput)

Batch processing results:

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

## Summary

Recently, OpenAI's APIs are being used in various scenes. In cases where real-time performance is required, such as chats, it is surprisingly limited. Particularly for processing large amounts of data, using the Batch API can greatly contribute to cost reduction, so I would like to consider it.
