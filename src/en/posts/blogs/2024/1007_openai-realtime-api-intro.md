---
title: Conversing with AI Using the Newly Released OpenAI Realtime API
author: noboru-kudo
date: 2024-10-07T00:00:00.000Z
tags:
  - OpenAI
  - RealtimeAPI
  - GPT
  - 生成AI
  - typescript
image: true
translate: true

---

Recently, OpenAI released a notable feature called the Realtime API.

- [OpenAI Blog - Introducing the Realtime API](https://openai.com/index/introducing-the-realtime-api/)

The Realtime API corresponds to the [Advanced Voice Mode](https://help.openai.com/en/articles/8400625-voice-mode-faq) of ChatGPT, which was gradually rolled out this fall.

Previously, similar functionality was possible, but it required a long process of converting speech to text, inputting it as a prompt to the LLM, and converting the response text back to speech. This method had significant time lags and couldn't detect interruptions, making it far from natural conversation in the real world.

The Realtime API solves these issues by directly handling both text and voice input/output. Unlike the traditional OpenAI API (REST API), the Realtime API is provided via WebSocket for real-time conversations. It also supports arbitrary API execution using Function calling, familiar from the Chat Completion API, which might allow it to do various things as a human substitute depending on how it's used.

- [OpenAI Doc - Realtime API](https://platform.openai.com/docs/guides/realtime)

I implemented a simple CLI-based conversation interaction using this Realtime API, which I will introduce here.

Note that the source code in this article focuses on the parts dealing with the Realtime API, omitting termination processes, etc. The full source code is available [here](https://gist.github.com/kudoh/c0995ba2233138312c2f412868f196d0).

:::info
The Realtime API is still in beta. Please check the latest status before using it.

Additionally, OpenAI has released a React-based frontend app on GitHub. If you want to try it immediately, you might want to start with this.

- [GitHub openai/openai-realtime-console](https://github.com/openai/openai-realtime-console)
:::

## Setup

As of now, the Realtime API is not integrated into the official library, and only the WebSocket interface is available. Here, we will create a WebSocket client using Node.js's [ws](https://www.npmjs.com/package/ws).

```shell
npm install ws
```

:::info
Although not used in this article, a reference implementation of a WebSocket client is available on GitHub.

- [GitHub - openai/openai-realtime-api-beta](https://github.com/openai/openai-realtime-api-beta)

This library might eventually develop into an official library.
:::

Additionally, we will use [SoX (Sound eXchange)](https://sourceforge.net/projects/sox/) as a tool for recording (input), playing (output), and converting audio data. Here, we use macOS and install it via HomeBrew.

```shell
brew install sox
```

## Connecting to the Realtime API WebSocket Server

Let's start coding. The Realtime API is provided as a WebSocket server, so the app will be implemented as a WebSocket client. First, connect to the server.

```typescript
import WebSocket from 'ws';
// Currently, only gpt-4o-realtime-preview-2024-10-01 is available
const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
const ws = new WebSocket(url, {
  headers: {
    'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
    'OpenAI-Beta': 'realtime=v1'
  }
});

// WebSocket connection
ws.on('open', () => {
  // ...
})
```

Connect to the URL (`wss://api.openai.com/v1...`) specified in the [official documentation](https://platform.openai.com/docs/guides/realtime/overview) for the Realtime API using WebSocket. At this time, set the OpenAI API key in the Authorization header. This API key is the same as the one used for the Chat Completion API, etc.

## Configuring the Session

Once connected, a session with the Realtime API is created. Various settings are made for this session.

```typescript
const instructions = `Please converse as an assistant who occasionally intersperses haikus or senryus in responses. Add poetic flavor to normal replies. Even simple task instructions will suddenly include haikus. Example: "Task completed, thank you for your hard work. Autumn wind, slightly chilly, quietly ends."`

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'session.update',
    session: {
      voice: 'echo',
      instructions: instructions,
      input_audio_transcription: { model: 'whisper-1' },
      turn_detection: { type: "server_vad" }
    }
  }));
  // To be continued
})
```

The settings for the Realtime API are made by sending a `session.update` event. Here, the following were set:

**voice**
The type of AI voice. We chose `echo` this time. Currently, `alloy`/`shimmer` can also be set.

**instructions**
Describes the overall settings for the AI, similar to the instructions in the Assistants API or the System Message in the Chat Completion API.

**input_audio_transcription**
Specifies the model for converting input audio to text. This is necessary if text data from audio input is needed. The text data can be obtained from the `conversation.item.input_audio_transcription.completed` event (this event did not fire if not specified). It's better to specify it to determine if the input audio is being converted as expected.

**turn_detection**
Specifies the mode for detecting conversation switches in the Realtime API. You can specify null (no detection) or `server_vad` (VAD: voice activity detection). If VAD is enabled, the Realtime API automatically adjusts the response timing by detecting conversation ends or interruptions. Here, VAD is explicitly specified for explanation purposes, but it is the default setting.

Many other settings can be made with the `session.update` event. Refer to the official API reference for event details.

- [OpenAI API Reference - session.update](https://platform.openai.com/docs/api-reference/realtime-client-events/session/update)

## Inputting Audio to the Realtime API

As mentioned earlier, audio recorded and converted with SoX is input to the Realtime API.

Pre-launch the SoX process for recording.

```typescript
const recorder = spawn('sox', [
  '--default-device', // Default audio input device (microphone)
  '--no-show-progress',
  '--rate', '24000',
  '--channels', '1', // Mono
  '--encoding', 'signed-integer',
  '--bits', '16',
  '--type', 'raw',
  '-' // Output audio data to standard output
]);

const recorderStream = recorder.stdout; // Standard output from SoX is an audio data stream (8KB chunks)
```

Specify 16-bit PCM audio (24kHz, mono) as the audio format in SoX's arguments. Currently, the Realtime API supports this and G.711 audio (8kHz, u-law/a-law) formats. More formats are expected to be added sequentially, so check the [official documentation](https://platform.openai.com/docs/guides/realtime/audio-formats) as needed when using.

The audio from the microphone is sequentially written to the standard output stream and sent to the Realtime API in sequence.

```typescript
ws.on('open', () => {
  // Omitted
  recorderStream.on('data', (chunk: Buffer) => {
    ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: chunk.toString('base64')
    }));
  });
});
```

Use the `input_audio_buffer.append` event to send input audio, setting the Base64-encoded audio data in the `audio` property and sending it.

As mentioned earlier, since we are using VAD mode, the end of input audio or interruptions are judged by the server (Realtime API), and an audio response is returned. Here, there is no need to worry about the end of the conversation; just keep sending audio.

:::alert:Be Aware of Speaker-to-Microphone Loopback
In my environment (MacBook Pro 2023 model), using the built-in microphone for audio input picked up not only my voice but also the AI's playback audio. This led to a loop of "Played audio input -> Response obtained (AI reacts to my voice) -> Obtained audio playback." Rate Limit over-detection occurs, causing errors, but it consumes a significant amount of tokens (= high cost). Here, using an external audio device for audio input/output resolved the issue.
:::

:::column:Inputting via Text
The Realtime API can handle not only audio but also text. For text, input as follows.

```typescript
ws.on('open', () => {
  const event = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: 'Hello! I'm feeling great today!'
        }
      ]
    }
  };
  ws.send(JSON.stringify(event));
  ws.send(JSON.stringify({ type: 'response.create' })); // Request response generation
});
```

By sending the `response.create` event following the `conversation.item.create` event, you can obtain audio output (including text) from the Realtime API.
:::

## Playing Responses (Audio) from the Realtime API

Having completed the part for sending input audio, let's now obtain and play the response from the Realtime API. Audio playback is also done using SoX. Pre-launch it as a subprocess.

```typescript
const player = spawn('sox', [
  '--type', 'raw',
  '--rate', '24000',
  '--encoding', 'signed-integer',
  '--bits', '16',
  '--channels', '1',
  '-', // Standard input
  '--no-show-progress',
  '--default-device',
]);
const audioStream = player.stdin;
```

Unlike input audio, here we play audio received from standard input on the default device (speakers/headphones, etc.).

Next is the part for obtaining audio responses from the Realtime API. Since we set up in VAD mode, audio responses are sent when the end of input audio is detected.

```typescript
ws.on('message', (message) => {
  const event = JSON.parse(message.toString());
  switch (event.type) {
    case 'response.audio.delta':
      // Stream audio to SoX (Player) standard input for playback
      audioStream.write(Buffer.from(event.delta, 'base64'));
      break;
    case 'response.audio_transcript.done':
    case 'conversation.item.input_audio_transcription.completed':
      console.log(event.type, event.transcript); // Display input, output audio text
      break;
    case 'error':
      console.error('ERROR', event.error);
      break;
  }
});
```

The key point is the `response.audio.delta` event. Audio data is sent step-by-step in Base64-encoded form in `event.delta`, so decoding it and streaming it directly to the speaker (SoX process standard input) completes the process.

By executing this script from the CLI, you can continuously converse with the AI via voice. The accuracy of Japanese feels a bit lacking, but the conversation switch felt natural.

:::column:Checking Token Consumption
To check token consumption, refer to the `response.done` event. This event fires each time a response is completed from the Realtime API.

Below is a sample output of the `response.done` event.

```json
{
  "type": "response.done",
  "event_id": "event_AGFqWW4CX2z42FF0vlp6v",
  "response": {
    "object": "realtime.response",
    "id": "resp_AGFqVS4FcpdQVsZzorL9X",
    "status": "completed",
    "output": [
        // Omitted
    ],
    "usage": {
      "total_tokens": 140,
      "input_tokens": 118,
      "output_tokens": 22,
      "input_token_details": {
        "cached_tokens": 0,
        "text_tokens": 102,
        "audio_tokens": 16
      },
      "output_token_details": {
        "text_tokens": 22,
        "audio_tokens": 0
      }
    }
  }
}
```

The `usage` property allows you to check the token consumption for text and audio. For specific costs, check OpenAI's official page.

- [OpenAI Pricing](https://openai.com/api/pricing/)

The token unit price differs significantly between text and audio, so be careful not to overuse and incur large bills.
:::

## Summary

This time, I wrote a simple CLI-based script using the newly released Realtime API. Although it's about 100 lines of code, it provided an experience that couldn't be felt with text-based interactions familiar from chat. If you're interested, please try it out.

- [Realtime API (CLI) Sample Code](https://gist.github.com/kudoh/c0995ba2233138312c2f412868f196d0)

However, the audio input/output of the Realtime API is quite expensive, so be careful not to overuse it and incur high costs (please do so at your own risk). In the future, I would like to try more tuning and experiment with Function calling.

:::info
I also published a version with Function calling.
- [Execute Functions Using Voice with OpenAI's Realtime API (Function Calling Edition)](/en/blogs/2024/10/09/openai-realtime-api-function-calling/)
:::

