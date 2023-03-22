# OpenAI API活用実験(Experimental)

ChatGPTを使って記事をレビューします。事前にOpenAIのアカウントが必要です。
OpenAIの課金については公式ドキュメントを参照してください。フリートライアルが終われば有料になりますのでご注意を。

- <https://openai.com/pricing>

## インストール

```shell
cd openai
npm install
```

## API Key生成

OpenAIのアカウントを作成し、API Keyを生成してください。

- <https://platform.openai.com/account/api-keys>

## ChatGPTに記事をレビューしてもらう

チェックしたいファイルを引数に`npm run review:gpt`を実行してください。

```shell
cd openai
OPENAI_API_KEY=<openai-api-key> npm run review:gpt src/posts/blogs/2023/0319_aws-lambda-with-rust.md
```

コンソール上にレビュー結果が表示されます。また、ここで消費したトークンも表示しますので、確認するようにしましょう（total_tokensが課金対象です）。

OpenAIのAPI KeyはOSの自分の環境変数に入れておくと省略できます。

## カスタマイズ

ChatGPTへのプロンプトをカスタマイズする場合は`prompt.ts`を修正してください。これがいいよっていうのがあればこちらを採用します。
