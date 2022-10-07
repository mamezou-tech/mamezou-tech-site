---
title: Deno による Slack プラットフォーム(オープンベータ)
author: masahiro-kondo
date: 2022-09-27
tags: Deno
---

Slack から Deno による新しいプラットフォームがオープンベータとしてリリースされました。

[Slack releases platform open beta powered by Deno](https://deno.com/blog/slack-open-beta)

ちょうど [Deno について連載をやっている](/deno/getting-started/01-introduction/)こともあり興味を持ちました。Deno については、Blog に [Slack’s journey with Deno](https://deno.com/blog/slack-open-beta#slacks-journey-with-deno) と題して以下のように書かれています。

- **Easy**: Deno を利用した Slack CLI を使用することで、セットアップや依存関係のライブラリのインストールなしに機能の実装に集中できる。
- **Fast**: Deno の JavaScript ランタイムの高速性の恩恵を受けられる。
- **Secure**: Deno の安全性の恩恵を受けられる。

公式ドキュメントも整備されています。ベータということで現在、`https://api.slack.com/future` という URL になっています。

[Build the future of work with the new Slack platform](https://api.slack.com/future)

イントロダクションのページに、Functions / Workflows / Triggers というビルディングブロックで構築することが書かれています。

![ビルディングブロック](https://i.gyazo.com/5ad26cd66f7a46b87af60330229382b5.png)

[Welcome to our future-generation platform!](https://api.slack.com/future/intro)

現在のところこのプラットフォームを試すには、有料プランのワークスペースが必要です。

> For now, you need a Slack workspace on a paid plan you can work on. 

弊社で契約している Slack ワークスペースで Quickstart してみました。

[Quickstart guide for the beta Slack platform](https://api.slack.com/future/quickstart)

まず、Slack CLI のインストール。

```shell
curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash
```

バージョンを確認。

```shell
$ slack version
Using slack v1.11.0
```

Slack CLI で Slack ワークスペースにログインします。`slack login` コマンドを実行すると、認証チケットが発行されます。

```shell
$ slack login
📋 Run the following slash command in any Slack channel or DM
   The command will open a prompt detailing the user permissions for you to approve

/slackauthticket MWFjZTcyMzYtMGY2ZS00NzJhLWE1ZmYtNjQxMjU4NzU4NmRm

⠏ Waiting for authentication (press ^c to cancel)
```

出力された認証チケットを Slack のチャネルに投稿します。個人用チャネルに投稿しました。

![認証チケットをチャネルに投稿](https://i.gyazo.com/3b518035f9e27f2600168dbe75d914f8.png)

Slack CLI に対するパーミッションの承認ダイアログが表示されますので、`Confirm` をクリックします。

![パーミッションを承認](https://i.gyazo.com/a5d5d18f5ae6099f571e5a701d17fd3d.png)

承認すると、Slackbot がメッセージをくれます。

![承認された](https://i.gyazo.com/a1f9f9bf8fe17547097e268b39630c2f.png)

ターミナルに戻ると認証成功のメッセージが出ています。

```
✅ You've successfully authenticated! 🎉 
   Authorization data was saved to /Users/masahiro-kondo/.slack/credentials.json

💡 Run slack create my-app to create a new app, or slack help for details on available commands
```

ここで、`slack auth list` を実行すると、認証されたチャネルの情報が表示されます。

```shell
$ slack auth list

 ACTIVE  channel-name (Team ID: TXXXXXXXX)
User ID: UXXXXXXXX
Last update: 2022-09-26 23:21:29 +09:00

To change your active workspace authorization run slack login
```

次に Slack のアプリを作成します。`slack create` コマンドで、アプリ名を指定すると、Hello World 的なプロジェクトか、Scaffold project でちゃんとした構造のプロジェクトを生成するか、などが選べます。とりあえず Hello World を選択。

```shell
$ slack create slack-app-example
? Select a template to build from:

> Hello World
  A simple workflow that sends a greeting

  Scaffolded project
  A solid foundation to start building upon

  Blank project
  A, well.. blank project

  To see all available samples, visit github.com/slack-samples.
```

テンプレートを選択するとプロジェクト生成と、依存ライブラリのインストールなどが実行されます。

```
? Select a template to build from: Hello World

Creating new Slack app at /Users/masahiro-kondo/dev/slack-app-example

📦 Installed project dependencies

✨ slack-app-example successfully created

🧭 Explore your project's README.md for documentation and code samples, and at any time run slack help to display a list of available commands

🧑‍🚀 Follow the steps below to try out your new project

1️⃣  Change into your project directory with: cd slack-app-example

2️⃣  Develop locally and see changes in real-time with: slack run

3️⃣  When you're ready to deploy for production use: slack deploy

🔔 If you leave the workspace, you won’t be able to manage any apps you’ve deployed to it. Apps you deploy will belong to the workspace even if you leave the workspace
```

生成されたプロジェクト構造。functions / triggers / workflows というビルディングブロックに対応したディレクトリにコードが生成されています。

```
.
├── LICENSE
├── README.md
├── assets
│   └── icon.png
├── deno.jsonc
├── functions
│   ├── greeting_function.ts
│   └── greeting_function_test.ts
├── import_map.json
├── manifest.ts
├── slack.json
├── triggers
│   └── greeting_trigger.ts
└── workflows
    └── greeting_workflow.ts
```

[Deno を始める - 第2回](/deno/getting-started/02-use-external-packages/)で取り上げた Import Maps が使用されており、Deno による Slack SDK / Slack API がインポートされています。

```json
{
  "imports": {
    "deno-slack-sdk/": "https://deno.land/x/deno_slack_sdk@1.1.2/",
    "deno-slack-api/": "https://deno.land/x/deno_slack_api@1.0.1/"
  }
}
```

`slack trigger create` コマンドでアプリの Workflow を起動するトリガーの登録を行います。`--trigger-def` で生成された greeting_trigger.ts を指定してます。開発中のアプリ(ここでは、slack-app-example (dev))を選択します。

```shell
slack trigger create --trigger-def "triggers/greeting_trigger.ts"
? Choose an app  [Use arrows to move, type to filter]
  slack-app-example
   App ID: N/A   Status: Not installed
   Workspace: channel-name    Team ID: TXXXXXXXX

> slack-app-example  (dev) 
   App ID: N/A   Status: Not installed
   Workspace: channel-name    Team ID: TXXXXXXXX
```

実行すると、プロジェクトの `.slack` ディレクトリ配下に apps.dev.json という開発用のマニフェストが生成され、Trigger のエンドポイントが作成されます。ここで出力されるエンドポイントの URL を使用することで、登録したアプリの Workflow を実行できます。

```
 App Manifest
   Created app manifest for "slack-app-example (dev)" in "channel-name" workspace

🏠 Workspace Install
   Installed "slack-app-example (dev)" app to "channel-name" workspace
   Finished in 1.6s

⚡ Trigger created
   Trigger ID:   XXXXXXXXXXXX
   Trigger Type: shortcut
   Trigger Name: Send a greeting
   URL: https://slack.com/shortcuts/XXXXXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

:::info
開発用のマニフェスト(.slack/apps.dev.json)は、実際に稼働している Slack ワークスペースの team_id / user_id が含まれています。このファイルは .gitignore によって誤ってコミットされないようになっています。
:::

この状態で、`slack run` コマンドでアプリを実行します。

```shell
slack run
? Choose a workspace  [Use arrows to move, type to filter]
> channel-name  Team ID: TXXXXXXXX 
   App ID: AXXXXXXXXXX   Status: Installed
```

ローカルでアプリが実行され、接続したチャネルでのイベント待ち受け状態に入ります。

```
Updating dev app install for workspace "channel-name"
✨  kondoumh of channel-name
Connected, awaiting events
```

Trigger をテストするための Slack チャネルを作成します。チャネルはパブリックにしないといけないようです。

![テスト用チャネル](https://i.gyazo.com/99a7fb4c0180327bb22aeacd944757d6.png)

Slack CLI を認証した個人用チャネルで `slack trigger create` コマンドで作成した Trigger の URL を投稿します。

![shortcuts URL](https://i.gyazo.com/88dbc19345accde248e0157c258f654f.png)

Send a greeting のカードが出ますので、`実行`をクリックします。

![form](https://i.gyazo.com/547f09ae461fa4f48462f9266e108772.png)

greeting のフォームが出ますので、メンション相手とチャネルを選択します。上記で作成したチャネルを選択しました。メッセージを書き込んで `Send greeting` をクリック。

![Send a greeting](https://i.gyazo.com/7c73977f9958ccb8a17a440c1f67fb48.png)

テスト用チャネルに設定した Recipient 宛のメンションが投稿されました。

![投稿されたメッセージ](https://i.gyazo.com/db22813cd2e21c11a24e9e39dd88fe78.png)

この後は、アプリを Slack にデプロイして運用していく流れになります。

Slack の管理者権限を持っていないので、デプロイはまだ試していないのですが、`slack deploy` コマンド一発で Slack がホストする環境にデプロイされます。Deno Deploy が使われているのでしょうか？

生成された Greeting のコードを軽く見てみます。

まず、Function のコードから。
入出力パラメータを定義した GreetingFunctionDefinition を作り、SlackFunction で Function の実装を行なっています。実装としては、入力から recipient と message を取得し、ランダムな挨拶ワードと message の引用を recipient にメンションする greeting を返すというものです。ここでは、greeting の作成のみ行なっています。

```typescript
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const GreetingFunctionDefinition = DefineFunction({
  callback_id: "greeting_function",
  title: "Generate a greeting",
  description: "Generate a greeting",
  source_file: "functions/greeting_function.ts",
  input_parameters: {
    properties: {
      recipient: {
        type: Schema.slack.types.user_id,
        description: "Greeting recipient",
      },
      message: {
        type: Schema.types.string,
        description: "Message to the recipient",
      },
    },
    required: ["message"],
  },
  output_parameters: {
    properties: {
      greeting: {
        type: Schema.types.string,
        description: "Greeting for the recipient",
      },
    },
    required: ["greeting"],
  },
});

export default SlackFunction(
  GreetingFunctionDefinition,
  ({ inputs }) => {
    const { recipient, message } = inputs;
    const salutations = ["Hello", "Hi", "Howdy", "Hola", "Salut"];
    const salutation =
      salutations[Math.floor(Math.random() * salutations.length)];
    const greeting =
      `${salutation}, <@${recipient}>! :wave: Someone sent the following greeting: \n\n>${message}`;
    return { outputs: { greeting } };
  },
);
```

次に Workflow のコードです。

- Slack のフォームの表示
- フォームから greeting 作成
- greeting 送信

というステップを定義しています。greeting 作成の部分で、上記の GreetingFunctionDefinition を使用しています。
TypeScript の型情報を使って、ワークフロー本体のみならず、入力フォームの情報まで宣言的なコードで書いています。

```typescript
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { GreetingFunctionDefinition } from "../functions/greeting_function.ts";

const GreetingWorkflow = DefineWorkflow({
  callback_id: "greeting_workflow",
  title: "Send a greeting",
  description: "Send a greeting to channel",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
      },
      channel: {
        type: Schema.slack.types.channel_id,
      },
    },
    required: ["interactivity"],
  },
});

const inputForm = GreetingWorkflow.addStep(
  Schema.slack.functions.OpenForm,
  {
    title: "Send a greeting",
    interactivity: GreetingWorkflow.inputs.interactivity,
    submit_label: "Send greeting",
    fields: {
      elements: [{
        name: "recipient",
        title: "Recipient",
        type: Schema.slack.types.user_id,
      }, {
        name: "channel",
        title: "Channel to send message to",
        type: Schema.slack.types.channel_id,
        default: GreetingWorkflow.inputs.channel,
      }, {
        name: "message",
        title: "Message to recipient",
        type: Schema.types.string,
        long: true,
      }],
      required: ["recipient", "channel", "message"],
    },
  },
);

const greetingFunctionStep = GreetingWorkflow.addStep(
  GreetingFunctionDefinition,
  {
    recipient: inputForm.outputs.fields.recipient,
    message: inputForm.outputs.fields.message,
  },
);

GreetingWorkflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: inputForm.outputs.fields.channel,
  message: greetingFunctionStep.outputs.greeting,
});

export default GreetingWorkflow;
```

最後に Trigger のコード。上記の GreetingWorkflow を 起動するトリガーを定義しています。

```typescript
import { Trigger } from "deno-slack-api/types.ts";
import GreetingWorkflow from "../workflows/greeting_workflow.ts";

const greetingTrigger: Trigger<typeof GreetingWorkflow.definition> = {
  type: "shortcut",
  name: "Send a greeting",
  description: "Send greeting to channel",
  workflow: "#/workflows/greeting_workflow",
  inputs: {
    interactivity: {
      value: "{{data.interactivity}}",
    },
    channel: {
      value: "{{data.channel_id}}",
    },
  },
};

export default greetingTrigger;
```

以上、Slack の新プラットフォームでの開発の雰囲気を見てみました。Deno のランタイムにより簡単に開発を始められ、ローカルの開発サーバーと Slack が連動して動作確認も簡単なのはすごいです。

ビルディングブロックを使って宣言的にアプリを記述していくスタイルは慣れるまでちょっと苦労しそうですが、Deno の TypeScript サポートで開発体験自体はよさそうです。
