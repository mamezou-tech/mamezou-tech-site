---
title: Conversing with AI Using the Newly Released OpenAI Realtime API
author: noboru-kudo
date: 2024-10-07T00:00:00.000Z
tags:
  - OpenAI
  - GPT
  - 生成AI
  - typescript
image: true
translate: true

---

Recently, OpenAI released a noteworthy feature called the Realtime API.

- [OpenAI Blog - Introducing the Realtime API](https://openai.com/index/introducing-the-realtime-api/)

The Realtime API corresponds to the [Advanced Voice Mode](https://help.openai.com/en/articles/8400625-voice-mode-faq) of ChatGPT, which has been gradually rolled out since this fall.

Previously, similar functionality was possible, but it required a long series of steps: converting speech to text, inputting it as a prompt to the LLM, and converting the response text back to speech. This method had significant time lags and could not detect interruptions, making it far from natural conversation in the real world.

The Realtime API is a new API that solves this problem, directly supporting both text and voice input and output. Unlike the traditional OpenAI APIs (REST API), the Realtime API is provided via WebSocket for real-time conversation. It also supports arbitrary API execution using Function calling, familiar from the Chat Completion API, allowing for a wide range of possibilities as a human substitute depending on how it's used.

- [OpenAI Doc - Realtime API](https://platform.openai.com/docs/guides/realtime)

I implemented a simple CLI-based conversation using this Realtime API, which I will introduce here (Function calling is planned for next time).

The source code featured in this article focuses on the parts dealing with the Realtime API, omitting termination processes. The full source code is available [here](https://gist.github.com/kudoh/c0995ba2233138312c2f412868f196d0).

:::info
The Realtime API is still in beta. Please check the latest status when using it.

Additionally, OpenAI has released a React-based frontend app on GitHub. If you want to try it out quickly, we recommend starting with this.

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

This library seems likely to evolve into an official library in the future.
:::

Additionally, we will use [SoX (Sound eXchange)](https://sourceforge.net/projects/sox/) as a tool for recording (input), playback (output), and converting audio data. Here, we are using macOS, so we will install it with HomeBrew.

```shell
brew install sox
```

## Connecting to the Realtime API WebSocket Server

Let's start coding. The Realtime API is provided as a WebSocket server, so the app will be implemented as a WebSocket client. First, we connect to the server.

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

Connect to the URL (`wss://api.openai.com/v1...`) specified in the [official Realtime API documentation](https://platform.openai.com/docs/guides/realtime/overview) using WebSocket. At this time, set the OpenAI API key in the Authorization header. The same API key as the Chat Completion API, etc., can be used.

## Setting Up the Session

Once connected, a session with the Realtime API is created. Various settings are made for this session.

```typescript
const instructions = `Please converse as an assistant who occasionally intersperses haikus or senryus in your replies.
Add a poetic flavor to ordinary responses. Even simple task instructions may suddenly include a haiku.
Example: "Task complete, well done. The autumn wind, a bit chilly, quietly ends."`

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
  // To be discussed later
})
```

Settings for the Realtime API are made by sending a `session.update` event. Here, the following were set:

**voice**  
The type of AI voice. We chose `echo` this time. Currently, `alloy`/`shimmer` can also be set.

**instructions**  
This describes the overall settings for the AI, similar to the instructions in the Assistants API or the System Message in the Chat Completion API.

**input_audio_transcription**  
Specifies the model to transcribe input audio to text. Necessary if text data from voice input is required. Text data can be obtained from the `conversation.item.input_audio_transcription.completed` event (this event did not fire if not specified). It is advisable to specify this to judge whether the input audio is being converted as expected.

**turn_detection**  
Specifies the mode for detecting conversation switches in the Realtime API. You can specify `none` (no detection) or `server_vad` (VAD: voice activity detection). If VAD is enabled, the Realtime API detects the end of the conversation or interruptions and automatically adjusts the response timing. Here, VAD is explicitly specified for explanation purposes, but it is the default.

Many other settings are possible with the `session.update` event. Refer to the official API reference for event details.

- [OpenAI API Reference - session.updated](https://platform.openai.com/docs/api-reference/realtime-server-events/session-updated)

## Inputting Audio to the Realtime API

As mentioned earlier, audio recorded and converted with SoX is input to the Realtime API.

Start the SoX process for recording in advance.

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

const recorderStream = recorder.stdout; // Standard output from SoX is an audio data stream (8KB chunk)
```

The SoX arguments specify 16-bit PCM audio (24kHz, mono) as the audio format. Currently, the Realtime API supports this and G.711 audio (8kHz, u-law/a-law). More formats are expected to be added in the future, so check the [official documentation](https://platform.openai.com/docs/guides/realtime/audio-formats) as needed when using.

Audio from the microphone is sequentially written to the standard output stream, which is then sequentially sent to the Realtime API.

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

To send input audio, use the `input_audio_buffer.append` event, setting the Base64 encoded audio data in the `audio` property and sending it.

As mentioned earlier, since we are using VAD mode, the end of the input audio or interruptions are judged server-side (Realtime API), and an audio response is returned. You don't need to worry about the end of the conversation here, just keep sending the audio.

:::alert:Be cautious of speaker-to-microphone loopback
In the author's environment (MacBook Pro 2023 model), using the built-in microphone for audio input picked up not only my voice but also the AI's playback audio. This led to a loop of "played audio input -> response acquisition (AI reacts to my voice) -> playback of acquired audio". A Rate Limit over is detected, causing an error, but it consumes a significant amount of tokens (= high cost). This was resolved by using external audio devices (such as AirPods Pro) for audio input and output.
:::

:::column:Inputting via text
The Realtime API can interact not only with audio but also with text. For text, input as follows.

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
          text: 'Hello! I am doing great today!'
        }
      ]
    }
  };
  ws.send(JSON.stringify(event));
  ws.send(JSON.stringify({ type: 'response.create' })); // Request response generation
});
```

By sending a `response.create` event following the `conversation.item.create` event, you can obtain audio output (including text) from the Realtime API.
:::

## Playing the Response (Audio) from the Realtime API

The part for sending input audio is complete, so now let's obtain and play the response from the Realtime API. We will also use SoX for audio playback. Start it as a subprocess in advance.

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

Unlike input audio, here we play audio received from standard input on the default device (speaker/headphones, etc.).

Next is the part for obtaining audio responses from the Realtime API. Since we set it up in VAD mode, audio responses are sent when the end of the input audio is detected.

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
      console.log(event.type, event.transcript); // Display input/output audio text
      break;
    case 'error':
      console.error('ERROR', event.error);
      break;
  }
});
```

The key point is the `response.audio.delta` event. Audio data is sent in stages, Base64 encoded in `event.delta`, so simply decode it and stream it to the speaker (standard input of the SoX process) to complete the process.

By running this script from the CLI, you can continuously converse with the AI via voice. The accuracy in Japanese seems a bit lacking, but the conversation switching and interruptions felt quite natural.

## Summary

This time, I wrote a simple CLI-based script using the newly released Realtime API. Although it's about 100 lines of code, it offered a unique experience not found in text-based chat. If you're interested, please give it a try.

- [Realtime API (CLI) Sample Code](https://gist.github.com/kudoh/c0995ba2233138312c2f412868f196d0)

However, note that audio input and output with the Realtime API are quite expensive, so excessive use could lead to high costs (use at your own risk). In the future, I plan to fine-tune it further and try out Function calling.
