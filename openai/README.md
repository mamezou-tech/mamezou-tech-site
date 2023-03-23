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

生成したAPI Keyは環境変数に指定してください。

```shell
export OPENAI_API_KEY=<openai-api-key>
```

## ChatGPTに記事をレビューしてもらう

チェックしたいファイルを引数に以下を実行してください。

```shell
npm run review:gpt -- src/posts/blogs/2023/0319_aws-lambda-with-rust.md
```

コンソール上にレビュー結果が表示されます。また、ここで消費したトークンも表示しますので、確認するようにしましょう（total_tokensが課金対象です）。

## ChatGPTに記事のドラフトを作ってもらう

ChatGPTと会話しながら記事のドラフトを作成してもらえます。

ドラフトとなる出力マークダウンを引数に以下を実行してください。

```shell
npm run generate:article draft-output.md
```

記事のテーマを最初に聞かれます。生成後に気に入らない内容の場合はChatGPTとやり取りをしながら改善できます。

## カスタマイズ

ChatGPTへのプロンプトをカスタマイズする場合は`prompt-message.ts`を修正してください。これがいいよっていうのがあればそちらを採用します。
