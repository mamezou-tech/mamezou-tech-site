---
title: Improving UX with Stream Responses in OpenAI Assistants API
author: noboru-kudo
date: 2024-04-10T00:00:00.000Z
tags:
  - OpenAI
  - GPT
image: true
translate: true

---




The [Assistants API](https://platform.openai.com/docs/assistants/overview) from OpenAI is convenient with tools for maintaining conversation context through threading, Function calling, Retrieval, and more. However, to interact with users interactively, it was necessary to poll until the assistant (and the subsequent GPT) fully generated a response. This resulted in longer perceived wait times for users, which was not ideal for UX.

To address this, OpenAI made the following announcement last month (2024-03-14):

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Streaming is now available in the Assistants API! You can build real-time experiences with tools like Code Interpreter, retrieval, and function calling.<a href="https://t.co/B0Vytm6zyE">https://t.co/B0Vytm6zyE</a> <a href="https://t.co/9QWQnQRH9x">pic.twitter.com/9QWQnQRH9x</a></p>&mdash; OpenAI Developers (@OpenAIDevs) <a href="https://twitter.com/OpenAIDevs/status/1768018196651802850?ref_src=twsrc%5Etfw">March 13, 2024</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

It seems that the Stream format response, which was supported in the Chat API, is now also supported in the Assistants API.

Here, I tried it out and will introduce it.

## Preliminary Setup

Here, we will create a terminal-style conversation script using Node.js (TypeScript).

Install the following in any NPM project (TypeScript-related settings are omitted as they are not the main topic).

```shell
npm install openai @inquirer/prompts
```

The OpenAI library used here is currently the latest version `4.33.0`.
Also, [@inquirer/prompts](https://www.npmjs.com/package/@inquirer/prompts) is a library that supports user interaction in CLI.

## Building the Overall Framework

We create the overall framework of the source code.
This part is simplified from the following Assistants API introductory article:

- [Trying OpenAI's Assistants API (Beta)](/blogs/2023/11/08/openai-assistants-api-intro/)

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
    const req = await input({ message: '>' }); // Get user prompt
    if (req === 'q') break; // Exit with `q`
    await openai.beta.threads.messages.create(
      thread.id,
      {
        role: 'user',
        content: req
      }
    );

    // Write code to execute the thread and return results to the user
    
    console.log();
  }
} finally {
  await Promise.all([
    openai.beta.threads.del(thread.id), 
    openai.beta.assistants.del(assistant.id)
  ]);
}
```

First, create an assistant and a thread to manage conversation history in the Assistants API, and continue the dialogue with the assistant until the user enters `q`. Finally, delete the created thread and assistant[^1].

[^1]: Assistants remain, so if forgotten, delete them from the OpenAI API management console.

For terms such as assistant and thread, please refer to the [aforementioned article](/blogs/2023/11/08/openai-assistants-api-intro/) or the following official document:

- [OpenAI Doc - How Assistants work - Objects](https://platform.openai.com/docs/assistants/how-it-works/objects)

## Using Stream Response

Now, let's write the thread execution code that we didn't describe earlier.
To receive responses in stream format, write as follows:

```typescript
const stream = await openai.beta.threads.runs.create(thread.id, {
  assistant_id: assistant.id,
  stream: true // Enable stream response
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

Unlike before, we specify `stream: true` during thread execution.
This way, the assistant returns a Stream instead of the usual execution result (Run instance).
This stream implements [AsyncIterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncIterator), so you can subscribe to various events until the thread execution is complete.
The subscribable events are as follows:

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

As you can see, many events can be subscribed to here.
However, the most important event is `AssistantStreamEvent.ThreadMessageDelta`.
This event contains the new message delta.

Here, we subscribe to this event and write the message delta to standard output.

:::column:Using Stream-specific API

The OpenAI library also included APIs specialized for stream responses.
This method does not iterate over the stream but adds a listener to the subscribed event.

```typescript
const stream = openai.beta.threads.runs
  .stream(thread.id, { assistant_id: assistant.id })
  .on('textDelta', (delta, snapshot) => process.stdout.write(delta.value ?? ''));
await stream.finalRun();
```

This method is more readable, so it is generally better to use this one.
:::

Below is a video of this script in action.

<div class="mb-5">
<a href="https://gyazo.com/a1a13b587a8f0cf0117328a1503fc98c">
<video width="100%" autoplay muted loop playsinline controls>
<source src="https://i.gyazo.com/a1a13b587a8f0cf0117328a1503fc98c.mp4" type="video/mp4"/>
</video>
</a>
</div>

You can see that messages are output in stages instead of waiting for all messages to complete.

## Summary

It has become easy to use stream format responses in the Assistants API.
It is expected to be utilized in scenarios where real-time interaction with users is required.
