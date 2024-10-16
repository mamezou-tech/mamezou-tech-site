---
title: Building a Web App to Talk with AI Using OpenAI's Realtime API
author: noboru-kudo
date: 2024-10-16T00:00:00.000Z
tags:
  - RealtimeAPI
  - OpenAI
  - nuxt
  - vue
  - GPT
  - 生成AI
  - typescript
image: true
translate: true
---

Until now, I have created a CLI-based voice conversation script using OpenAI's Realtime API.

- [Voice Conversations with AI Using the Newly Released OpenAI Realtime API](/blogs/2024/10/07/openai-realtime-api-intro/)
- [Executing Arbitrary Functions Using Voice with OpenAI's Realtime API (Function Calling Edition)](/blogs/2024/10/09/openai-realtime-api-function-calling/)

Thanks to the voice conversion tool [SoX (Sound eXchange)](https://sourceforge.net/projects/sox/), this script was easy to implement, but I also wanted to try creating a web app. Here, I will use the Vue framework [Nuxt](https://nuxt.com/) to create an app that allows voice conversations with the Realtime API on a web browser.

:::info
An official sample React-based web app from OpenAI is available on GitHub. I have heavily referenced this repository while writing this article.

- [GitHub openai/openai-realtime-console](https://github.com/openai/openai-realtime-console)
:::

The structure of the web app is as follows.

![Nuxt Realtime API Diagram](https://i.gyazo.com/d39dc7613edaf48339677522320c0e9a.png)

Accessing the Realtime API directly from the browser would expose the OpenAI API key to users. To avoid this, we use Nuxt's server function (Nitro) to mediate access to the Realtime API.

Below is a video of this web app in action (**unmute to hear the AI voice. Please be mindful of your surroundings**).

<video width="60%" autoplay muted loop playsinline controls style="margin: 15px 0;">
<source src="https://i.gyazo.com/d7f6919c131918fdeb2f644d76e8a7a4.mp4" type="video/mp4"/>
</video>

In this video, my input voice was not recorded (for some reason), but I am actually speaking as represented by the text messages and audio waveform.

This article focuses on key parts and does not cover all the source code. The source code is available on GitHub, so if you want to try it out, please run it yourself (note that the Realtime API is quite expensive, so be careful not to overuse it).

- [GitHub kudoh/nuxt-openai-realtimeapi-example](https://github.com/kudoh/nuxt-openai-realtimeapi-example)

:::alert
This sample is a simple implementation aimed at experimenting with app development using the Realtime API. It only implements minimal functionality and does not consider scalability or fault tolerance. It is not suitable for production use.
:::

## Setup

I will only explain the overview. First, create an application from the Nuxt CLI.

```shell
npx nuxi@latest init <nuxt-app-name>
cd <nuxt-app-name>
```

Here, I installed the latest Nuxt version v3.13.2 at the time. Next, install the necessary libraries.

```shell
# WebSocket client (Nitro)
npm install ws

# Development libraries, Nuxt modules, etc. (eslint, tailwindcss...)
npm install -D @types/ws eslint @nuxt/eslint @nuxtjs/tailwindcss
```

In the browser, use the [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) implemented as a web API, but for interactions with the Realtime API on the server side, use [ws](https://www.npmjs.com/package/ws).

The nuxt.config.ts is as follows.

```typescript:nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/eslint'],
  // Nitro's WebSocket support
  nitro: {
    experimental: {
      websocket: true,
    },
  },
  eslint: {
    config: {
      stylistic: {
        semi: true,
        braceStyle: '1tbs',
      },
    },
  },
});
```

The key point is the `nitro.experimental.websocket` setting. To mediate the Realtime API, WebSocket communication is needed on the server side as well, but Nitro, used by Nuxt as the server engine, currently treats WebSocket support as experimental. As shown above, you need to explicitly enable it if you want to use it.

## Application Structure

The main components of the application are as follows.

```
.
├── server
│   └── routes
│     └── ws.ts                // Relay server for Realtime API requests
├── composables
│   ├── audio.ts               // Audio recording/playback
│   ├── audioVisualizer.ts     // Audio waveform visualization
│   └── realtimeApi.ts         // Realtime API communication
├── public
│   └── audio-processor.js     // Conversion processing of recorded audio (audio thread processing)
├── utils
│   └── index.ts               // Entry point for common functions (omitted as it only converts audio formats)
├── app.vue                    // Entry point
├── nuxt.config.ts
└── package.json
```

It's a regular Nuxt SSR application, but a relay server for the Realtime API is prepared under the server directory.

From here, I will explain an overview of each component.

## Relay Server

In Nuxt, you can create server-side APIs just by placing source code under the server/routes directory.

- [Nuxt Docs - Server Routes](https://nuxt.com/docs/guide/directory-structure/server#server-routes)

Here, I will use this to create a relay server for the Realtime API. However, it will be implemented as a WebSocket server rather than a regular API.

It is implemented as follows.

```typescript:/server/routes/ws.ts
import { WebSocket } from 'ws';

// Manage Realtime API sessions per connected user (peer)
const connections: { [id: string]: WebSocket } = {};

export default defineWebSocketHandler({
  open(peer) {
    if (!connections[peer.id]) {
      // Connect to OpenAI's Realtime API
      const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
      connections[peer.id] = new WebSocket(url, {
        headers: {
          'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
          'OpenAI-Beta': 'realtime=v1',
        },
      });
    }
    const instructions = 'Please speak cheerfully and energetically. Act like a close friend and do not use honorifics. Output should be in Japanese.';

    connections[peer.id].on('open', () => {
      // Realtime API session settings
      connections[peer.id].send(JSON.stringify({
        type: 'session.update',
        session: {
          voice: 'shimmer',
          instructions: instructions,
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: { type: 'server_vad' },
        },
      }));
    });
    connections[peer.id].on('message', (message) => {
      // Relay Realtime API server events directly to the client
      peer.send(message.toString());
    });
  },
  message(peer, message) {
    // Relay client events directly to the Realtime API
    connections[peer.id].send(message.text());
  },
  close(peer) {
    connections[peer.id].close();
    connections[peer.id] = undefined;
    console.log('closed websocket');
  },
  error(peer, error) {
    console.log('error', { error, id: peer.id });
  },
});
```

The WebSocket server API (Nitro) is defined using defineWebSocketHandler. Various event hooks for WebSocket are implemented as arguments.

The main implementation here includes the following:

1. Connecting and disconnecting from the Realtime API
2. Session settings (session.update)
3. Relaying client events to the Realtime API
4. Relaying server events to the client (web browser)

As such, it only has the function of relaying events between the client (web browser) and the Realtime API, aside from connecting to the Realtime API.

If you modify this to be an API specialized for the application's purpose rather than just a relay server, the client-side implementation might feel more streamlined.

:::column:Nitro's WebSocket Support
Nuxt's server engine, Nitro, uses a cross-platform WebSocket library called [crossws](https://crossws.unjs.io/) for implementing WebSocket servers. For more details on implementing with crossws, refer to the official documentation below.

- [crossws Doc](https://crossws.unjs.io/guide)

Although not used here, it also supports the Pub/Sub pattern, making it easy to implement conversations with multiple users.
:::

## Client Features (Composables)

Three Composables are prepared as components this time.

### Realtime API Client (realtimeApi.ts)

- [GitHub - /composables/realtimeApi.ts](https://github.com/kudoh/nuxt-openai-realtimeapi-example/blob/main/composables/realtimeApi.ts)

Although it is called a Realtime API client, it does not directly access the Realtime API but goes through a relay server.

```typescript:/composables/realtimeApi.ts
type Params = {
  url: string;
  logMessage: (string) => void;
  onMessageCallback?: (message: MessageEvent) => void;
};

export const useRealtimeApi = ({ url, logMessage, onMessageCallback }: Params) => {
  let ws: WebSocket | null = null;
  const isConnected = ref(false);

  function connect() {
    if (isConnected.value) return;

    ws = new WebSocket(url);
    ws.onopen = () => {
      logMessage('Connected to server🍻');
      isConnected.value = true;
    };

    ws.onclose = () => {
      logMessage('Disconnected👋');
      isConnected.value = false;
    };

    ws.onerror = (error) => {
      logMessage('Error occurred😭: ' + error.message);
    };

    ws.onmessage = (message: MessageEvent) => {
      if (onMessageCallback) onMessageCallback(message); // Realtime API server events
    };
  }

  function disconnect() {
    ws?.close();
  }

  function sendMessage(data: unknown) {
    if (isConnected.value) {
      ws?.send(JSON.stringify(data)); // Realtime API client events
    }
  }

  return {
    connect,
    disconnect,
    sendMessage,
    isConnected,
  };
};
```

As mentioned earlier, it uses the [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) implemented in the browser to interact with the relay server.

Handling of Realtime API server events requires audio-related processing such as playback, so instead of implementing it here, it executes a callback received as a parameter.

### Audio Processing (audio.ts)

- [GitHub - /composables/audio.ts](https://github.com/kudoh/nuxt-openai-realtimeapi-example/blob/main/composables/audio.ts)

It provides functions for inputting audio from the microphone and playing audio output from the Realtime API through speakers. Since it becomes lengthy if fully included, I will excerpt mainly the interface part.

```typescript:/composables/audio.ts
const BUFFER_SIZE = 8192;
const BUFFER_INTERVAL = 1000;

type Params = {
  audioCanvas: Ref<HTMLCanvasElement>;
  logMessage: (string) => void;
  onFlushCallback: (buffer: ArrayBuffer) => void;
};

export function useAudio({ audioCanvas, logMessage, onFlushCallback }: Params) {
  const isRecording = ref(false);
  const isPlaying = ref(false);

  // Omitted

  /**
   * Function to start audio recording
   * Audio is buffered and callback executed after exceeding a certain size or time
   */
  async function startRecording() {
    isRecording.value = true;
    try {
      // Prepare microphone (request permission)
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });

      // Omitted (audio input conversion and callback execution)
    } catch (e) {
      // Omitted
    }
  }

  /**
   * Function to stop audio recording
   */
  function stopRecording() {
    // Omitted
  }

  /**
   * Enqueue audio to be played -> Play sequentially
   */
  function enqueueAudio(buffer: Float32Array) {
    audioQueue.push(buffer);
    if (!isPlaying.value) {
      playFromQueue();
    }
  }
  
  return {
    startRecording,
    stopRecording,
    enqueueAudio,
    isPlaying,
    isRecording,
  };
}
```

It uses the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) implemented in the browser for audio recording and playback.

Note that the Web Audio API adopts a 32bit-float audio format, which the Realtime API does not currently support. Therefore, mutual conversion to the default format PCM16 is necessary for both recording and playback[^1].

[^1]: In OpenAI's [official sample](https://github.com/openai/openai-realtime-console), conversion processing is offloaded to the audio thread using [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet) for both input and output, but this sample only uses it for input. For production-level use, it would be preferable to execute the output side on the audio thread as in the official sample.

Also, since audio is returned as a stream response faster than playback speed, implementing a queuing process is necessary to prevent overlapping audio output.

Although not directly related to the Realtime API, this was the most challenging part 😂 Nonetheless, since audio processing is akin to the UI in programming involving audio, I realized I need to improve further.

### Audio Visualization (audioVisualizer.ts)

- [GitHub - /composables/audioVisualizer.ts](https://github.com/kudoh/nuxt-openai-realtimeapi-example/blob/main/composables/audioVisualizer.ts)

It provides functionality to render audio signals as waveforms on a Canvas element. It uses the [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) audio analysis tool provided as a web API in the browser to visualize audio signals in real-time.

This feature is not the main topic of the article, so the source code is omitted.

## Entry Point (app.vue)

- [GitHub - /app.vue](https://github.com/kudoh/nuxt-openai-realtimeapi-example/blob/main/app.vue)
 
Finally, the application's entry point. Since it is a single page this time, the page component is directly implemented in Nuxt's entry point, app.vue. Since various functions are extracted as Composable components, the page component is simplified.

UI rendering is off-topic, so I will excerpt and explain the parts related to audio recording and Realtime API integration below.

### Audio Recording

The main processing is implemented in the audio processing (audio.ts) Composable. The responsibility of this page component is to implement the processing (callback function) when the recorded audio is flushed[^2].

[^2]: By default, audio data is processed in 256-byte increments, resulting in high-frequency audio transmission. The audio processing Composable buffers audio data and flushes it every 8192 bytes or 1 second.

```typescript
// Callback when playing audio is flushed
function handleAudioFlush(buffer: ArrayBuffer) {
  // Send audio input from the microphone to the Realtime API
  sendMessage({ type: 'input_audio_buffer.append', audio: arrayBufferToBase64(buffer) });
}

const { startRecording, stopRecording, enqueueAudio, isRecording } = useAudio({
  audioCanvas, // Canvas for waveform display
  logMessage,  // Log addition callback
  onFlushCallback: handleAudioFlush, // Callback when audio is flushed
});
```

Here, the buffered audio data is Base64 encoded and sent to the Realtime API as an [input_audio_buffer.append](https://platform.openai.com/docs/api-reference/realtime-client-events/input_audio_buffer/append) event.

### Realtime API

Since the WebSocket client implementation around the Realtime API is extracted as a Composable component, you only need to implement the event handler for server events and pass it here.

```typescript
// RealtimeAPI server event handler
function handleWebSocketMessage(message: MessageEvent) {
  const event = JSON.parse(message.data);
  logEvent(event.type);
  switch (event.type) {
    case 'response.audio.delta': {
      enqueueAudio(base64ToArrayBuffer(event.delta));
      break;
    }
    case 'response.audio_transcript.done':
      // Delay logging as the event may fire before the response
      setTimeout(() => logMessage(`🤖: ${event.transcript}`), 100);
      break;
    case 'conversation.item.input_audio_transcription.completed':
      logMessage(`😄: ${event.transcript}`);
      break;
    case 'error':
      logEvent(event.error);
      if (isRecording.value) stopRecording();
      // The Realtime API session times out after 15 minutes
      if (event.code === 'session_expired') disconnect();
      break;
    default:
      break;
  }
}

// Realtime API
const { connect, isConnected, disconnect, sendMessage } = useRealtimeApi({
  url: 'ws://localhost:3000/ws',
  logMessage,
  onMessageCallback: handleWebSocketMessage,
});
```

The main processing of the callback function here includes the following two (excluding error processing).

**Audio Data Playback**
The audio output from the Realtime API is set in the payload of the `response.audio.delta` event. The audio data is not provided all at once but incrementally as a stream in deltas. This is queued in the audio processing's queue (enqueueAudio). This queue is played sequentially through the speakers.

**Text Message Rendering**
The Realtime API can output text messages for both input and output audio. Here, this event is hooked to store it in a reactive variable. As a result, it is displayed in real-time in a chat-like manner.

## Conclusion

The above is an overview of the key points when trying out web app development using the Realtime API.

I struggled with many pitfalls, especially in audio processing. Nonetheless, a web app allows for easy use by multiple users, and there are many potential use cases. I hope to find time to improve aspects like scalability.
