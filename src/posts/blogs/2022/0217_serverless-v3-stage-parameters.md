---
title: Serverless Framework v3新機能のStage Parameters紹介
author: noboru-kudo
date: 2022-02-17
tags: [aws, serverless]
---

2022/1/27にServerless Frameworkのメジャーアップデート(v3)がありました。

- [Serverless Framework V3 Is Live!](https://www.serverless.com/blog/serverless-framework-v3-is-live)

CLIの改善以外にそれほど大きな変更はなさそうですが、v3でStage parametersという新たな機能が導入されました。
これをうまく活用することで、環境ごとに異なる設定を簡潔に記述できます。

今回はこのStage parametersを紹介したいと思います。

## v2の書き方

いろんな方法がありますが、最もシンプルなやり方だと、環境ごとに異なる設定値は`custom`セクションに記述します。
TypeScriptで記述すると以下のようになります。関連部分のみ抜粋しています。

```typescript
const serverlessConfiguration: AWS = {
  service: 'slsv2',
  frameworkVersion: '2',
  custom: {
    // 環境ごとの設定値を用意しておく
    dev: {
      endpoint: 'https://dev-foo.example.com/api/v1',
    },
    staging: {
      endpoint: 'https://staging-foo.example.com/api/v1',
    },
    prod: {
      endpoint: 'https://foo.example.com/api/v1'
    },
  },
  functions: {
    hello: {
      handler: "src/functions/hello/handler.main",
      events: [
        {
          http: {
            method: 'post',
            path: 'hello',
          },
        },
      ],
      environment: {
        // 環境固有値。stageによって切替。存在しない場合はlocalhostにフォールバック
        FOO_API_ENDPOINT: '${self:custom.${sls:stage}.endpoint, "https://localhost:8000/api/v1"}'
      }
    }
  },
};
```

上記のように、`custom`セクションに環境ごとに異なる値をそれぞれ記述しておきます。
これをLambdaの環境変数にバインドする際には、`${self:custom.${sls:stage}.endpoint, ...}`のように、ネストした構文で環境ごとの設定値を取得しています。
ここでは1つのみで、それほど複雑ではありませんが、多数の環境固有値を持つとかなり読みにくくなってきます。
また、`custom`にはプラグインの設定なども記述するので、これが何の設定かをコメント等で補足する必要もありました。

これを軽減するには、各envファイルを作成して環境変数化するなど、ひと手間加える必要がありました。

- [Resolution of environment variables](https://www.serverless.com/framework/docs/environment-variables)

## v3からの書き方

v3からは、以下のように書き換えることができます。

```typescript
const serverlessConfiguration: AWS = {
  service: 'slsv3',
  frameworkVersion: '3',
  // v3から導入。ここに環境ごとの設定値を記述する
  params: {
    // どれにもマッチしない場合のデフォルト値
    default: {
      endpoint: "https://localhost:8000/api/v1"
    },
    dev: {
      endpoint: 'https://dev-foo.example.com/api/v1',
    },
    staging: {
      endpoint: 'https://staging-foo.example.com/api/v1',
    },
    prod: {
      endpoint: 'https://foo.example.com/api/v1',
    }
  },
  functions: {
    hello: {
      handler: "src/functions/hello/handler.main",
      events: [
        {
          http: {
            method: 'post',
            path: 'hello',
          },
        },
      ],
      environment: {
        // paramsより取得。どれを取得するかはstageパラメータによってServerless Frameworkが考慮してくれる
        FOO_API_ENDPOINT: '${param:endpoint}',
      }
    }
  },
};
```

新しく追加された`params`セクションに、環境ごとの設定値を記述します。
これを環境変数にバインドするときも、`${param:endpoint}`とv2よりもかなりシンプルになりました。
どの環境の値を設定するかは、stageパラメータ(`sls:stage`)からServerless Frameworkが判断してくれます。
優先順位ルールについては、以下を参照してください。
- [Inheritance and overriding](https://www.serverless.com/framework/docs/guides/parameters#inheritance-and-overriding)

## まとめ

環境(Stage)ごとに異なる値を新しく導入された`params`セクションに記述することで、より簡潔に環境固有値を参照できました。
まだv3には移行していませんが、移行する際には積極的に活用していきたいですね。
