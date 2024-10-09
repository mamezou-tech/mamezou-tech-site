---
title: 新登場の OpenAI の Realtime API でAIと音声会話する
author: noboru-kudo
date: 2024-10-07
tags: [OpenAI, RealtimeAPI, GPT, 生成AI, typescript]
image: true
---

先日OpenAI から Realtime API という注目機能がリリースされました。

- [OpenAI Blog - Introducing the Realtime API](https://openai.com/index/introducing-the-realtime-api/)

Realtime APIは今秋から段階的にロールアウトしたChatGPTの[アドバンスドボイスモード](https://help.openai.com/en/articles/8400625-voice-mode-faq)に相当するAPIです。

以前も類似のことはできましたが、音声をテキストに変換、プロンプトとしてLLMにインプット、レスポンスのテキストを音声に変換という長いステップを踏む必要がありました。
この方式は、タイムラグが大きく、割り込みが検知できない等、現実世界の自然な会話には程遠い状況でした。

Realtime APIはこの問題を解消する新しいAPIで、テキストだけでなく音声の入出力にも直接対応しています。
従来のOpenAIのAPI(REST API)と異なり、Realtime APIはリアルタイムで会話するためにWebSocketで提供されています。
また、Chat Completion APIでお馴染みのFunction callingを使った任意のAPI実行もサポートされており、使い方によっては人間の代替としていろんなことができそうです。

- [OpenAI Doc - Realtime API](https://platform.openai.com/docs/guides/realtime)

このRealtime APIを使ってCLIベースの簡単な会話のやりとりを実装してみましたのでご紹介します。

なお、本記事に掲載しているソースコードはRealtime APIを扱っている部分にフォーカスし、終了処理等は省略しています。
ソースコード全体は[こちら](https://gist.github.com/kudoh/c0995ba2233138312c2f412868f196d0)で公開しています。

:::info
Realtime APIはまだベータ版です。実際に利用する際は最新の状況を確認してください。

また、OpenAIからReactベースのフロントエンドアプリがGitHubで公開されています。
すぐに試してみたい場合はまずこちらをやってみることをお勧めします。

- [GitHub openai/openai-realtime-console](https://github.com/openai/openai-realtime-console)
:::

## セットアップ

現時点でRealtime APIは公式ライブラリに組み込まれておらず、WebSocketのインターフェースのみ公開されています。
ここでは、Node.jsの[ws](https://www.npmjs.com/package/ws)を使ってWebSocketクライアントを作成します。

```shell
npm install ws
```

:::info
本記事では使っていませんが、GitHubにWebSocketクライアントのリファレンス実装が公開されています。

- [GitHub - openai/openai-realtime-api-beta](https://github.com/openai/openai-realtime-api-beta)

このライブラリが今後公式ライブラリへと発展しそうな気もします。
:::

また、音声の録音(入力)、再生(出力)に加えて音声データの変換ツールとして[SoX(Sound eXchange)](https://sourceforge.net/projects/sox/)を使用します。
ここでは、macOSを使っていますのでHomeBrewでインストールします。

```shell
brew install sox
```

## Realtime APIのWebSocketサーバーに接続する

では早速コードを書いていきます。
Realtime APIはWebSocketサーバーとして提供されていますので、アプリはWebSocketクライアントとして実装します。
まずはサーバーに接続します。

```typescript
import WebSocket from 'ws';
// 現時点ではgpt-4o-realtime-preview-2024-10-01のみ利用可能
const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
const ws = new WebSocket(url, {
  headers: {
    'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
    'OpenAI-Beta': 'realtime=v1'
  }
});

// WebSocket接続
ws.on('open', () => {
  // ...
})
```

Realtime APIの[公式ドキュメント](https://platform.openai.com/docs/guides/realtime/overview)に指定されている通りのURL(`wss://api.openai.com/v1...`)に対してWebSocketで接続します。
この時に、AuthorizationヘッダにOpenAIのAPIキーを設定します。このAPIキーはChat Completion API等と同じもので構いません。

## セッションの設定をする

接続するとRealtime APIとのセッションが作成されます。
このセッションに対して各種設定をします。

```typescript
const instructions = `時々俳句や川柳を織り交ぜて返事するアシスタントとして会話してください。
普通の返答に詩的なフレーバーを追加。シンプルなタスク指示でも突然俳句が入ってきます。
例：「タスク完了、おつかれさまです。秋の風、少し寒くて、そっと終わる。」`

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
  // 後述
})
```

Realtime APIの設定は`session.update`のイベントを送信することで行います。ここでは以下を設定しました。

**voice**
AI音声の種類です。今回は`echo`を選択しました。現時点では、この他に`alloy`/`shimmer`が設定可能でした。

**instructions**
Assistants APIのinstructionsやChat Completion APIのSystem Messageと同じようにAI全体の設定を記述します。

**input_audio_transcription**
入力音声をテキスト化するモデルを指定します。音声入力のテキストデータが必要な場合必要になります。
テキストデータは`conversation.item.input_audio_transcription.completed`イベントから取得できます(指定しないとこのイベントは発火しませんでした)。
入力音声が期待通りに変換されているのかを判断するために指定しておいた方が良いと思います。

**turn_detection**
Realtime APIが会話の切り替えを検知するモードを指定します。`none`(検知しない)か`server_vad`(VAD: voice activity detection)を指定できます。
VADが有効になっている場合、Realtime API側で会話の終わりや割り込みを検知してレスポンスのタイミングを自動調整してくれます。
ここでは項目を説明するために明示的にVADを指定していますが、VADはデフォルトになっています。

その他にも多数の設定が`session.update`イベントで可能です。イベント詳細は公式APIリファレンスを参照してください。

- [OpenAI API Reference - session.updated](https://platform.openai.com/docs/api-reference/realtime-server-events/session-updated)

## Realtime APIに音声をインプットする

前述の通り、音声はSoXで録音・変換したものをRealtime APIにインプットします。

事前に録音用のSoXのプロセスを起動しておきます。

```typescript
const recorder = spawn('sox', [
  '--default-device', // デフォルトの音声入力デバイス(マイク)
  '--no-show-progress',
  '--rate', '24000',
  '--channels', '1', // モノラル
  '--encoding', 'signed-integer',
  '--bits', '16',
  '--type', 'raw',
  '-' // 標準出力に音声データを出力
]);

const recorderStream = recorder.stdout; // SoXからの標準出力は音声データストリーム(8KBチャンク)
```

SoXの引数で音声フォーマットとして16ビットPCM音声（24kHz、モノラル）を指定しています。
現時点では、Realtime APIのサポートフォーマットはこれとG.711音声（8kHz、u-law/a-law）の2種類です。
今後順次追加される予定とのことですので、利用する際には適宜[公式ドキュメント](https://platform.openai.com/docs/guides/realtime/audio-formats)を確認してください。

マイクからの音声は標準出力ストリームに順次書き出されていきますので、それをRealtime APIに順次送信します。

```typescript
ws.on('open', () => {
  // 省略
  recorderStream.on('data', (chunk: Buffer) => {
    ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: chunk.toString('base64')
    }));
  });
});
```

入力音声の送信には`input_audio_buffer.append`イベントを使い、そこにBase64エンコードした音声データを`audio`プロパティに設定して送信します。

前述の通り、今回はVADモードを使用していますので、入力音声の終わりや割り込みはサーバー側(Realtime API)で判断し、音声レスポンスが返ってきます。
ここでは会話の終わりを気にする必要はなく、音声を送信し続けるだけです。

:::alert:スピーカーからマイクのループバックに注意
筆者の環境(MacBook Pro 2023年モデル)では、音声入力に内蔵マイクを使うと自分の声だけでなくAIが再生した音声も拾ってしまいました。
これにより、「再生した音声の入力 -> レスポンス取得(AIが自分の声に反応) -> 取得した音声再生」 のループに陥りました。 
Rate Limitオーバーが検知されてエラーが発生しますが、かなりのトークン量を消費します(＝高コスト)。
ここでは、音声の入出力に外部オーディオデバイスを使用したところ解消しました。
:::

:::column:テキストで入力する
Realtime APIは音声だけでなくテキストでもやりとりできます。
テキストの場合は以下のように入力します。

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
          text: 'こんにちわ！今日も快調です！'
        }
      ]
    }
  };
  ws.send(JSON.stringify(event));
  ws.send(JSON.stringify({ type: 'response.create' })); // レスポンス生成要求
});
```

`conversation.item.create`イベントに続いて、`response.create`イベントを送信することでRealtime APIから音声出力(含むテキスト)が得られます。
:::

## Realtime APIからのレスポンス(音声)を再生する

入力音声を送信する部分は完成しましたので、今度はRealtime APIからのレスポンスを取得して再生してみます。
音声の再生もSoXを使います。事前にサブプロセスとして起動しておきます。

```typescript
const player = spawn('sox', [
  '--type', 'raw',
  '--rate', '24000',
  '--encoding', 'signed-integer',
  '--bits', '16',
  '--channels', '1',
  '-', // 標準入力
  '--no-show-progress',
  '--default-device',
]);
const audioStream = player.stdin;
```

入力音声とは逆に、ここでは標準入力から受け取った音声をデフォルトデバイス(スピーカー/ヘッドフォン等)で再生するようにしています。

続いてRealtime APIからの音声レスポンス取得部分です
ここではVADモードでセットアップしていますので、音声レスポンスは入力音声の終了を検知したタイミングで送信されてきます。

```typescript
ws.on('message', (message) => {
  const event = JSON.parse(message.toString());
  switch (event.type) {
    case 'response.audio.delta':
      // 音声をSoX(Player)の標準入力に流して再生する
      audioStream.write(Buffer.from(event.delta, 'base64'));
      break;
    case 'response.audio_transcript.done':
    case 'conversation.item.input_audio_transcription.completed':
      console.log(event.type, event.transcript); // 入力、出力音声のテキスト表示
      break;
    case 'error':
      console.error('ERROR', event.error);
      break;
  }
});
```

ポイントは`response.audio.delta`イベントの部分です。
`event.delta`に音声データがBase64エンコードされた状態で段階的に送信されてきますので、デコード後にそのままスピーカー(SoXプロセスの標準入力)に流せば完成です。

実際にこのスクリプトをCLIから実行すれば、AIと音声で継続的に会話できます。
日本語の精度は今ひとつな気がしますが、会話の切り替えも自然に感じました。

:::column:消費トークンの確認
トークン消費量を確認する場合は、`response.done`イベントを参照します。
このイベントはRealtime APIからレスポンス完了する都度発火されます。

以下は`response.done`イベントの出力サンプルです。

```json
{
  "type": "response.done",
  "event_id": "event_AGFqWW4CX2z42FF0vlp6v",
  "response": {
    "object": "realtime.response",
    "id": "resp_AGFqVS4FcpdQVsZzorL9X",
    "status": "completed",
    "output": [
        // 省略
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

`usage`プロパティでテキスト、音声のトークン消費量が確認できます。
具体的な費用については、OpenAIの公式ページから確認してください。

- [OpenAI Pricing](https://openai.com/api/pricing/)

テキストと音声ではトークン単価が大きく異なりますので、使いすぎて大変な請求にならないように注意しましょう。
:::

## まとめ

今回は登場したばかりのRealtime APIを使ってCLIベースの簡単なスクリプトを書いてみました。
100行程度のコードではありますが、チャットで慣れたテキストベースでは味わえない感動がありました。
興味のある方は是非お試しください。

- [Realtime API(CLI)サンプルコード](https://gist.github.com/kudoh/c0995ba2233138312c2f412868f196d0)
 
ただし、Realtime APIの音声入出力はかなり高単価なので、遊び過ぎると高額な費用になりますのでその点はご注意ください(自己責任でお願いします)。
今後はもっとチューニングしてみたり、Function callingを試してみたいと思います。

:::info
Function callingバージョンも公開しました。
- [OpenAI の Realtime API で音声を使って任意の関数を実行する(Function calling編)](/blogs/2024/10/09/openai-realtime-api-function-calling/)
:::

