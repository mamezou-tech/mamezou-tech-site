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

Up to now, I have created CLI-based voice conversation scripts using OpenAI's Realtime API.

@[og](/en/blogs/2024/10/07/openai-realtime-api-intro/)
@[og](/en/blogs/2024/10/09/openai-realtime-api-function-calling/)

Thanks to the audio conversion tool [SoX (Sound eXchange)](https://sourceforge.net/projects/sox/), these scripts were easy to implement, but I wanted to try making a web app as well. Here, I will create an app using the Vue framework [Nuxt](https://nuxt.com/) that allows voice conversations with the Realtime API on a web browser.

:::info
On December 18, 2024, the WebRTC version of the Realtime API was introduced. With this update, browser apps are now recommended to use WebRTC instead of WebSocket.

We have also introduced the WebRTC version in the following article, so please refer to it.

@[og](/en/blogs/2024/12/21/openai-realtime-api-webrtc/)
:::

The configuration of the web app is as follows.

![Nuxt Realtime API Diagram](https://i.gyazo.com/d39dc7613edaf48339677522320c0e9a.png)

If you access the Realtime API directly from the browser, you will be exposing your OpenAI API key to users. To avoid this, we use Nuxt's server functionality (Nitro) to mediate access to the Realtime API.

Below is a video of this web app in action (**Unmute to hear the AI's voice. Please be mindful of your surroundings before unmuting**).

<video width="60%" autoplay muted loop playsinline controls style="margin: 15px 0;">
<source src="https://i.gyazo.com/d7f6919c131918fdeb2f644d76e8a7a4.mp4" type="video/mp4"/>
</video>

In this video, my input voice was not recorded (for some reason), but in reality, I am speaking as represented by the text messages and audio waveforms.

This article focuses on the important parts, so I will not list or explain all the source code. The source code is published on GitHub, so if you want to actually try it out, please run it (however, the Realtime API is quite expensive, so please be careful not to overuse it).

@[og](https://github.com/kudoh/nuxt-openai-realtimeapi-example)

:::alert
This sample is intended to experiment with app development using the Realtime API and is a simplified implementation focusing on simplicity. Only the minimum necessary functions are implemented, and scalability, fault tolerance, etc., are not considered. It is not suitable for actual operational use.
:::

## Setup

I will only explain the overview.

First, create an application from the Nuxt CLI.

```shell
npx nuxi@latest init <nuxt-app-name>
cd <nuxt-app-name>
```

Here, I installed Nuxt v3.13.2, which is the latest at the moment. Next, install the necessary libraries.

```shell
# WebSocket client (Nitro)
npm install ws

# Development libraries, Nuxt modules (eslint, tailwindcss...)
npm install -D @types/ws eslint @nuxt/eslint @nuxtjs/tailwindcss
```

From the browser, we use the [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) implemented as a Web API in the browser, but we use [ws](https://www.npmjs.com/package/ws) for communication with the Realtime API on the server side.

The `nuxt.config.ts` is as follows.

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

The key point is the setting of `nitro.experimental.websocket`. To mediate access to the Realtime API, server-side WebSocket communication is required, but Nitro, used by Nuxt as a server engine, currently treats WebSocket as experimental. As shown above, you need to explicitly enable it if you want to use it.

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
│   └── audio-processor.js     // Processing of recorded audio (audio thread processing)
├── utils
│   └── index.ts               // Entry point for common functions (omitted as only audio format conversion)
├── pages
│   └── websocket.vue          // UI component
├── app.vue                    // Entry point
├── nuxt.config.ts
└── package.json
```

It's a normal Nuxt SSR application, but we have prepared a relay server to the Realtime API under the `server` directory.

From here, I will explain an overview of each component.

## Relay Server

In Nuxt, you can create server-side APIs just by placing source code under the `server/routes` directory.

- [Nuxt Docs - Server Routes](https://nuxt.com/docs/guide/directory-structure/server#server-routes)

Here, we will use this to create a relay server to the Realtime API. However, it will be implemented as a WebSocket server instead of the usual API.

I implemented it as follows.

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
    const instructions = 'Speak cheerfully and energetically. Act like a close friend, and do not use honorifics. Please output in Japanese.';

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
      // Realtime API server events are returned to the client as is
      peer.send(message.toString());
    });
  },
  message(peer, message) {
    // Client events are relayed to the Realtime API as is
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

We define the WebSocket server API (Nitro) using `defineWebSocketHandler`. In the argument, we implement various WebSocket event hooks.

The main implementation here is as follows.

1. Connecting and disconnecting connections with the Realtime API
2. Session settings (`session.update`)
3. Relaying client events to the Realtime API
4. Relaying server events from the Realtime API to the client (web browser)

As such, aside from the connection to the Realtime API, the server only functions to relay events between the client (web browser) and the Realtime API.

If you modify this from a mere relay server to an API specialized for application purposes, the client-side implementation might look cleaner.

:::column:Nitro's WebSocket Support
Nuxt's server engine Nitro uses a cross-platform WebSocket library called [crossws](https://crossws.unjs.io/) for WebSocket server implementation. For details on the implementation using crossws, please refer to the official documentation below.

- [crossws Doc](https://crossws.unjs.io/guide)

Although not used here, it also supports the Pub/Sub pattern, making it easy to implement conversations among multiple users.
:::

## Client Functions (Composables)

This time, the composables prepared as components are three.

### Realtime API Client (`realtimeApi.ts`)

- [GitHub - /composables/realtimeApi.ts](https://github.com/kudoh/nuxt-openai-realtimeapi-example/blob/main/composables/realtimeApi.ts)

Although called a Realtime API client, it does not directly access the Realtime API but goes through the relay server.

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
      logMessage('Error occurred😭');
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

As mentioned earlier, we are using the [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) implemented in the browser to interact with the relay server.

Since handling of server events from the Realtime API requires audio-related processing such as audio playback, we implement it not here but by executing the callback passed as a parameter.

### Audio Processing (`audio.ts`)

- [GitHub - /composables/audio.ts](https://github.com/kudoh/nuxt-openai-realtimeapi-example/blob/main/composables/audio.ts)

This provides functions for voice input from the microphone and output from the Realtime API to be played back from the speaker. It's too long to include all, so I will excerpt and focus on the interface parts.

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
   * Audio is buffered and flushes after exceeding a certain size or after a certain time interval, then executes the callback
   */
  async function startRecording() {
    isRecording.value = true;
    try {
      // Prepare microphone (request permission)
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new window.AudioContext({ sampleRate: 24000 });

      // Omitted (audio input conversion and callback processing)
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
   * Enqueue audio to be played – sequentially play back
   */
  function enqueueAudio(buffer: ArrayBuffer) {
    audioQueue.push(arrayBufferToAudioData(buffer));
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

We use the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) implemented as standard in the browser to record and play back audio.

Note that the Web Audio API employs a 32-bit float audio format, but the Realtime API currently does not support it. Therefore, we need to record in PCM16 and perform mutual conversion during both recording and playback.

[^1]: OpenAI's [official sample](https://github.com/openai/openai-realtime-console) uses [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet) to perform the conversion process in the audio thread for both input and output, but this sample uses it only for input. To make it production-level, it would be desirable to execute the output side in the audio thread as in the official sample.

Also, since the audio returns as a stream response faster than playback speed, if you don't implement queuing processing, an issue occurs where audio outputs overlap. Although this is not directly related to the Realtime API, this is where I struggled the most 😂

That said, audio processing is akin to the UI in programming that uses voice, so I realized I need to improve more.

### Audio Visualization (`audioVisualizer.ts`)

- [GitHub - /composables/audioVisualizer.ts](https://github.com/kudoh/nuxt-openai-realtimeapi-example/blob/main/composables/audioVisualizer.ts)

This provides a function to draw audio signals as waveforms on a Canvas element. It uses [AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode), an audio analysis tool provided in the browser as a Web API, to visualize audio signals in real-time.

Since this function is not the main subject of the article, I will omit posting the source code.

## UI Component (`websocket.vue`)

- [GitHub - /websocket.vue](https://github.com/kudoh/nuxt-openai-realtimeapi-example/blob/main/pages/websocket.vue)

Finally, the application's UI. Since we have extracted various functions into composable components, the page component has become simple.

Because UI rendering deviates from the main topic, I will extract and explain the parts of audio recording and Realtime API integration.

### Audio Recording

The main processing is implemented in the audio processing (`audio.ts`) composable. The responsibility of this page component is to implement the processing (callback function) when the recorded audio is flushed.

[^2]: By default, audio data is processed in 256-byte chunks, resulting in very frequent audio transmissions. In the audio processing composable, audio data is buffered and set to flush every 8192 bytes or every 1 second.

```typescript
// Callback when audio is flushed during recording
function handleAudioFlush(buffer: ArrayBuffer) {
  // Send microphone audio input to the Realtime API
  sendMessage({ type: 'input_audio_buffer.append', audio: arrayBufferToBase64(buffer) });
}

const { startRecording, stopRecording, enqueueAudio, isRecording } = useAudio({
  audioCanvas, // Canvas for waveform display
  logMessage,  // Log addition callback
  onFlushCallback: handleAudioFlush, // Callback when audio is flushed
});
```

Here, we encode the buffered audio data in Base64 and send it to the Realtime API as an [input_audio_buffer.append](https://platform.openai.com/docs/api-reference/realtime-client-events/input_audio_buffer/append) event.

### Realtime API

Since the WebSocket client implementation around the Realtime API has also been extracted into a composable as a component, here we just need to implement the event handler when a server event occurs and pass it in.

```typescript
// Realtime API server event handler
function handleWebSocketMessage(message: MessageEvent) {
  const event = JSON.parse(message.data);
  logEvent(event.type);
  switch (event.type) {
    case 'response.audio.delta': {
      enqueueAudio(base64ToArrayBuffer(event.delta));
      break;
    }
    case 'response.audio_transcript.done':
      // Output voice text. It can be fired before the user's voice, so display it with a delay
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

The main processing of the callback function here is as follows (excluding error handling).

**Audio Data Playback**

The Realtime API's audio output is set in the payload of the `response.audio.delta` event. The audio data is not all at once but is stored incrementally in delta as a stream format. We enqueue this in the audio processing queue (`enqueueAudio`). This queue is sequentially played back from the speaker.

**Text Message Display**

The Realtime API can output text messages not only for input voice but also for output voice. Here, we hook this event and store it in a reactive variable. As a result, it is displayed in real-time like a chat.

## Conclusion

I have explained the key points when trying web app development using the Realtime API, focusing on the overview.

I struggled a lot, especially with audio-related processing, which had many pitfalls. That said, since web apps allow easy use by multiple people, there are many potential use cases. I hope to find time to improve aspects like scalability.
