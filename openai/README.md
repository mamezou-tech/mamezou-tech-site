# OpenAI API活用実験(Experimental)

ChatGPTを使って記事をレビューします。事前にOpenAIのアカウントが必要です。
OpenAIの課金については公式ドキュメントを参照してください。フリートライアルが終われば有料になりますのでご注意を。

- <https://openai.com/pricing>

## インストール

[Rust](https://doc.rust-lang.org/cargo/getting-started/installation.html)をインストールしてください。
Cargoを使います。

## API Key生成

OpenAIのアカウントを作成し、API Keyを生成してください。

- <https://platform.openai.com/account/api-keys>

生成したAPI Keyは環境変数に指定してください。

```shell
export OPENAI_API_KEY=<openai-api-key>
```

## ChatGPTに記事をレビューしてもらう

記事全体のレビューをして、10点満点評価します。

チェックしたいファイルを引数に以下を実行してください。

```shell
cargo run --bin scoring src/posts/11ty-ssg/11ty-reusable-components.md
```

コンソール上にレビュー結果が表示されます。また、ここで消費したトークンも表示しますので、確認するようにしましょう（total_tokensが課金対象です）。

## Lint(スペルチェック/日本語)

スペルや冗長な表現等をチェックします。textlintのChatGPT版(?)です。

```shell
cargo run --bin lint src/posts/11ty-ssg/11ty-reusable-components.md
```

100行を超える記事は、エラーにならないように分割してChatGPTにチェックしてもらいます。

## カスタマイズ

ChatGPTへのプロンプトをカスタマイズする場合は`config.toml`を修正してください。
