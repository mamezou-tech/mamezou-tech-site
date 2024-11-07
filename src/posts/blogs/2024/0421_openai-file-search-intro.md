---
title: OpenAI Assistants API(v2)で新しくなったFile Search(Vector Stores)を使う
author: noboru-kudo
date: 2024-04-21
tags: [RAG, OpenAI, GPT, 生成AI]
image: true
---

最近はOpenAI APIのアップデートが活発ですね(そろそろGPT-5が発表されるのでしょうか...)。
少し前にもAssistants APIの大きなアップデートがありました。

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Introducing a series of updates to the Assistants API 🧵<br><br>With the new file search tool, you can quickly integrate knowledge retrieval, now allowing up to 10,000 files per assistant. It works with our new vector store objects for automated file parsing, chunking, and embedding. <a href="https://t.co/SL0gYknlyA">pic.twitter.com/SL0gYknlyA</a></p>&mdash; OpenAI Developers (@OpenAIDevs) <a href="https://twitter.com/OpenAIDevs/status/1780640119890047475?ref_src=twsrc%5Etfw">April 17, 2024</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

Assistants APIのバージョンがv2になりました。
特に大きいアップデートは以前Retrievalという名前で導入されていたファイル検索機能です。
この機能を利用すると、アシスタントからファイル検索結果をベースとした最適なレスポンスを得られます。最新情報や非公開の内部情報等GPTが学習していない情報にも対応できるようになります[^1]。

[^1]: 昨今はこのような機能はナレッジベース検索やRAG等と呼ばれて、OpenAI以外でも幅広いマネージドサービスとして提供されています。

Assistants APIのv2でVector Store用のAPIが新設され、名前もFile Searchに変わりました。
また、v1(Retrieval)はファイル数が20まで(1ファイルあたり512MB/500万トークン以下)という制約があり、これに収まるようにファイルを結合したりする必要がありました(巨大なデータセットはそもそも不可)。
v2では登録可能なファイル数が10,000ファイルまでと大きく拡張され、多くのユースケースで使えるようになりました。

今回はこれを試してみましたのでご紹介します。

- [OpenAI API Doc - File Search](https://platform.openai.com/docs/assistants/tools/file-search)


:::alert
現時点ではVector Storeはもちろんv2になったAssistants API自体もまだベータ版です(結局v1はGAになることなく非推奨になりました)。
実際に利用する際は最新の公式ドキュメントを参照してください。

- [OpenAI API Doc - Assistants](https://platform.openai.com/docs/assistants/overview)
:::

## 事前準備

ここでは、本サイトの最新記事をいくつかVector StoreにアップロードしてAssistants APIを使ってみます。

スクリプトはNode.js(TypeScript)で作成します。
任意のNPMプロジェクトに以下をインストールします(本題でないのでTypeScript関連の設定は省略しています)。

```shell
npm install openai
```

使用したOpenAIのライブラリは現時点で最新の`4.38.2`です。v2のAssistants APIは`4.36.0`以降から使えるようになっています。

なお、(ChatGPTではなく)OpenAI APIのアカウントは作成済みで、APIキーを発行していることを前提としています。

## Vector Storeを作成してファイルを追加する

早速ですが、新しく追加されたVector Storeを作成してみます。
v1のRetrievalでは、ナレッジとなるファイルをアップロード(`purpose=retrieval`)して、そのファイルIDをアシスタントにアタッチしました。
v2のFile Searchでは、直接ファイルをアシスタントにアタッチするのではなく、Vector Storeをアタッチします。

以下はVector Storeを作成するコードです。

```typescript
import OpenAI, { toFile } from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-xxxxxxxxxx' // OpenAI APIキー
});

const vectorStore = await openai.beta.vectorStores.create({ name: 'ブログ記事' });
console.log('vectorStoreId', vectorStore.id); // アタッチするVector StoreのID(vs_xxxxxxxxxxxxxxxxxxxxxxxx)
```

これでVector Storeが作成されました。このVector StoreをアシスタントやスレッドにアタッチすることでFile Searchが使えるようになります。

なお、File SearchではこのVector Storeのサイズに対して課金が発生します(この時点ではファイルを追加していないので課金は発生していません)。現時点でFile Searchは1日単位で$0.1 / 1GBのコストが発生します(最初の1GBは無料)。

以下[公式ドキュメント](https://platform.openai.com/docs/assistants/tools/file-search/managing-costs-with-expiration-policies)からの抜粋です。

> The file_search tool uses the vector_stores object as its resource and you will be billed based on the size of the vector_store objects created. The size of the vector store object is the sum of all the parsed chunks from your files and their corresponding embeddings.
>
> You first GB is free and beyond that, usage is billed at $0.10/GB/day of vector storage. There are no other costs associated with vector store operations.

このようにVector Storeはサイズで課金されるため、検証目的等で作成した場合等で削除を忘れてしまうと予想外のコストが発生します(無料枠を超えるサイズの場合)。
公式ドキュメントでも言及されていますが、`expires_after`を設定するとVector Storeが未使用状態で指定期間経過すれば有効期限切れとなります。

```typescript
const vectorStore = await openai.beta.vectorStores.create({
  name: 'ブログ記事',
  expires_after: { anchor: 'last_active_at', days: 3 } // 最終利用から3日で有効期限切れ
});
```

では、作成した空のVector Storeにファイルを追加してみます。
以下のソースコードは特定のディレクトリ配下にあるブログ記事(マークダウンファイル)をVector Storeにアップロードしています。

```typescript
const articleDir = '/path/to/blogs';
const fileNames = (await fs.promises.readdir(articleDir))
  .filter(name => name.endsWith('.md'));

const files = await Promise.all(fileNames
  .map(fileName => toFile(fs.createReadStream(path.join(articleDir, fileName)))));

await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, { files });
```

ここで使っている`uploadAndPoll`の内部では以下のことを実行しています。

- ファイルアップロード
- Vector Storeにファイルをアタッチ
- Vector Storeが利用可能となるまで状態監視(ポーリング)

ファイルはアタッチすればすぐに使えるわけでなく、OpenAI側でのファイルのチャンク化やベクトル化等の一連の準備が終わるのを待つ必要があります。

処理が終わると、OpenAIのダッシュボード(Storage -> Vector Storesトグル)からVector Storeが確認できます。

![OpenAI dashboard - Vector Store](https://i.gyazo.com/59fb76d56131a52a1f5e9b48a687cc4d.png)

Vector Storeとそこに保存されているファイル(ここでは約40ファイル程度)が表示されています。
サイズは748KBなので無料の範囲(1GB)内です。

## アシスタントを作成する

それでは先ほど作成したVector Storeをアシスタントにアタッチして使ってみます。

```typescript
const assistant = await openai.beta.assistants.create({
  name: 'ブログマスター',
  model: 'gpt-4-turbo',
  tools: [{ type: 'file_search' }], // retrieval -> file_search
  tool_resources: { // file_idでなくVector StoreのIDを追加
    file_search: {
      vector_store_ids: [vectorStore.id] // 作成したVector StoreのID
    }
  }
});
```

大きな違いはありませんが、v2ではtoolsに指定するタイプが`retrieval`から`file_search`に変わっています。
また、v1は`file_ids`に検索対象のファイルのIDを指定していましたが、v2では新たに追加された`tool_resources.file_search.vector_store_ids`にVector StoreのIDを指定しています。

実行後にOpenAIのダッシュボードで確認すると、作成したアシスタントにVector Storeがアタッチされている様子がわかります。

![Assistant attached Vector Store](https://i.gyazo.com/187e4f0d521c96683db588dc7b273523.png)

:::column:アシスタント作成時にVector Storeも作成する
ここでは事前にVector Storeを作成しましたが、アシスタント作成と同時にVector Storeを作成する機能も用意されています。

以下のソースコードは、この機能を利用してアシスタント作成時にVector Storeも一緒に作成しています。

```typescript
const newFile = await openai.files.create({
  purpose: 'assistants',
  file: await toFile(fs.createReadStream('/path/to/file-A'), 'file-A')
});

const assistant = await openai.beta.assistants.create({
  name: 'ブログマスター',
  model: 'gpt-4-turbo',
  tools: [{ type: 'file_search' }],
  tool_resources: {
    file_search: {
      // ファイルIDを直接指定
      vector_stores: [{
        file_ids: [newFile.id]
      }]
    }
  }
});
```

Vector StoreのIDではなく、`tool_resources.file_search.vector_stores`に登録対象のファイルIDを指定しています。
:::

## スレッドを作成して実行する

ここは今までと変わりません。アップロードしたファイルの内容についてアシスタントとチャットしてみます。
現時点でGPT-4 TurboにないOpenAIのバッチAPIについて聞いてみます。
ここでは以下記事のファイルが検索されるはずです。

- [新しく導入されたOpenAIのバッチAPIを使ってみる](/blogs/2024/04/17/openai-batch-api-intro/)

ソースコードは以下です。

```typescript
// スレッド作成
const thread = await openai.beta.threads.create({
  messages: [
    {
      role: 'user',
      content: 'OpenAIのバッチAPIはいつ発表された？その詳細を教えて'
    }
  ]
});
// スレッド実行&ポーリング
const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
  assistant_id: assistant.id
});
// 結果出力
const messages = await openai.beta.threads.messages.list(
  thread.id
);
const reply = messages.data[0]?.content[0];
if (reply.type === 'text') {
  console.log('message: ', reply.text.value); // 本文
  console.log('annotations: ', reply.text.annotations); // File Searchの注釈
}
```

これを実行すると以下の結果が返ってきました。

![reply with file search](https://i.gyazo.com/90a1f4e5ddeaecebd7f4b42f1014e0eb.png)

最新の記事が検索されていることが分かります。注釈(annotations)には引用元のソースも正しく設定されていました。

ちなみに、File Searchを無効化したアシスタントに対して同じプロンプトを送信すると以下の結果でした。

![reply without file search](https://i.gyazo.com/2e695c7dd696d5b0e1eb5485249c5975.png)

未学習の情報のため、適切なレスポンスを返せていません(ここではハルシネーションは発生せずに正直な回答でそれはそれで好感を持ちましたが)。

:::column:スレッドに対してVector Storeをアタッチする
Vector Storeはアシスタントだけでなくスレッドに対してもアタッチできます。

以下のソースコードは既存のVector Storeをスレッドにアタッチするソースコードです。

```typescript
const thread = await openai.beta.threads.create({
  tool_resources: {
    file_search: {
      vector_store_ids: [vectorStore.id]
    }
  },
  messages: [
    {
      role: 'user',
      content: 'OpenAIのバッチAPIはいつ発表された？その詳細を教えて'
    }
  ]
});
```

アシスタント作成時と同じように`tool_resources.file_search.vector_store_ids`にVector StoreのIDを設定しています。

これだけでなく、Vector Storeはスレッド作成時に新規作成もできます。

```typescript
const thread = await openai.beta.threads.create({
  tool_resources: {
    file_search: {
      // Vector Store作成
      vector_stores: [{
       file_ids: ['file-xxxxxx']
      }]
    }
  },
  messages: [
    {
      role: 'user',
      content: 'OpenAIのバッチAPIはいつ発表された？その詳細を教えて'
      // 以下のようにメッセージ対して添付でも可
      // attachments: [{
      //   tools: [{ type: 'file_search' }],
      //   file_id: "file-xxxxxx"
      // }]
    }
  ]
});
```
スレッドまたはメッセージでファイルを指定することで、Vector Storeが作成されます。
なお、スレッドに対して作成されるVector Storeは1つで、その後は作成したVector Storeにファイルが追加される流れとなります。

スレッドに対して作成されたVector Storeは有効期限(最終利用時間起点)が7日間になります。期限切れの場合は新しいVector Storeを使うようにスレッドを更新する必要があります。
:::

## まとめ

今回はOpenAIのAssistants APIのv2で大きくアップデートがあったFile Search機能にフォーカスしてみました。
登録可能なファイル数の大幅増加が注目されますが、個人的な感覚ではv1のRetrievalよりも回答の精度がかなり上がったと思います。

Vector Storeのサイズ課金のみで1GBの無料枠があるなどコストも魅力的ですので、積極的に活用してみようかなと思いました。