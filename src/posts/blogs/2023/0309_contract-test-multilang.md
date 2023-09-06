---
title: 異言語間でContract Testを実施する
author: shinichiro-iwaki
date: 2023-03-09
tags: [テスト]
---

[前回の記事](/blogs/2022/12/09/contract-test-usecase/)でTipsを書きますと告知してから早3ヶ月となります。

これ以上ハードルを上げると小ネタといいつつそこそこのものを書かないといけないことになりそうなので、今回はPactの利点の1つである異なる言語間でのContract Testの実装例を紹介します。

## 前回までのおさらい

前回までにフロントエンド/バックエンドの間でhttp通信を行うサンプルアプリを題材にして、Contract TestでAPIの結合可能性を検証可能なことを説明してきました。

![サンプルアプリV1.1シーケンス](/img/blogs/2022/1209_app-sequence-revise.drawio.svg)

とはいえ、フロントエンド/バックエンドとも同じ技術(Java/Spring-boot)で開発している限りにおいては、APIの変更点も「変更点はソース見といてよ[^1]」が通じないことはありません。

[^1]:　と、書いてはみましたが、まさかまさかですよね。

実際の開発では、サービス毎に適した技術を選定しAPIを接点として開発を進めることも多いと思います。そのようなケースで様々な言語に対応するPactは有効な選択肢となり得ます。

この記事のコードサンプルは、[Gitlab リポジトリ](https://gitlab.com/shinichiro-iwaki/testexample/-/tree/feature-ts-front/) にありますので、興味がある方はあわせてご利用下さい。

## 想定する開発シナリオ

開発中のサンプルアプリを見た上司が、「このUIなんか古臭いんだよねー。イマドキっぽくReactとかで作り直さない?[^2]」などと無茶振りをしてきたことにします。

[^2]:　Thymeleafを批判するつもりは一切ありません。フロントエンド界隈は技術変化も早く、こういうケースもあるのかな と笑って許して下さい。

せっかくなので世の流れに乗っかって、SSR/SSGを見据えてアプリケーションフレームワークにはNext.jsを採用することにします。型情報を利用して安全に開発したいので、言語はTypescriptがいいですよね[^3]。

[^3]:　この辺は無根拠に筆者の好み(2023/03現在)を含みます。ツッコミ入れたくなった方は生暖かい目で見守っていただけると幸いです。

アプリケーション側は記事の本筋ではないので、細かい設定には拘らず公式ドキュメントに倣ってフロントエンドの環境を作っていきます。[Node.js](https://nodejs.org/ja/download)を導入済みの端末で、以下のコマンドを入力するだけ[^4]で「front」フォルダ以下にアプリケーション開発に必要な雛型プロジェクトを作成してくれます。
以後の説明は筆者の好みで[yarn](https://yarnpkg.com/getting-started/install)を使って進めていきますが、標準のnpmでも同様のことができます。

[^4]:　こういったテンプレートの充実は参入障壁を下げてくれるので有難いですよね。Reactを「完全に理解した」レベルでも簡単に開発を開始できるのがNext.jsが浸透していっている一因ではないかと思います。

```shell
npx create-next-app front --typescript
```

## APIクライアントのライブラリの準備
フロントエンドからのAPI呼出し処理ですが、OpenAPI GeneratorがTypescriptにも対応しているので引き続き利用していきます。
前回の記事ではライブラリを介したGenerationGapパターン[^5]を実現していたので、それを踏襲してAPIのクライアントライブラリをnpmのプライベートリポジトリにデプロイして利用するようにしましょう。

[^5]:　自動生成したソースコードと人が手を加えるコードを継承を利用して分離する(要は再生成した際に手を加えた部分が影響を受けないよう、自動生成コードには直接手を加えない)手法です。[当デベロッパーサイト](/blogs/2022/06/17/openapi-generator-3/)をはじめとして様々に紹介されていますので詳細は省略させて下さい。

下記サンプルのように設定することでインハウスリポジトリ(サンプルではGitlab Package Registryを利用)に自動生成したライブラリを公開するプロジェクトが作成できます。

- .npmrc 
  パッケージの名前空間「@shinichiro-iwaki」に対しインハウスリポジトリのURLを設定し、リポジトリアクセスに使用する認証情報を定義します。
  認証情報は公開してしまうとまずいので、インハウスへのアクセスが必要なタイミングで記載し、リモートにはpushしないような使い方を想定しています。
  ```shell
  @shinichiro-iwaki:registry=https://gitlab.com/api/v4/projects/41356985/packages/npm/
  gitlab.com/api/v4/projects/41356985/packages/npm/:_authToken=<リポジトリにアクセス可能なトーク>
  ```

- package.json 
  アプリケーション開発時に型情報を利用するために、TypescriptのソースコードをOpenAPI Generatorで生成し、JavaScriptにトランスパイルしたライブラリをビルドするための設定を定義します。
  Generatorの実行スクリプトは`openapi-generator-cli generate -g <利用するgenerator名> -i <入力スキーマ> -o <出力先>`で設定できますのでtsコンパイラの設定(後述)とパスを合わせるように設定していきます。
  ライブラリの公開(publish)の際に必要な処理が実行されるように`prepublishOnly`スクリプトにGeneratorの実行とトランスパイル処理を定義しました。また、ライブラリのバージョンは前回記事時点のAPIバージョンとあわせています。
  APIのクライアントライブラリにはaxiosを利用していますが、Generatorが出力可能なソースコードであれば何を利用してもライブラリのビルドは可能です。
  ```json
  {
    "name": "@shinichiro-iwaki/greeter-api",
    "version": "1.1.2",
    "main": "src/client/greeter/index.d.ts",
    "files": [
      "src"
    ],
    "scripts": {
      "generate": "openapi-generator-cli generate -g typescript-axios -i ../schema/openapi.yaml -o ./gen/client/greeter",
      "build": "tsc",
      "prepublishOnly": "yarn generate && yarn build"
    },
    "devDependencies": {
      "@openapitools/openapi-generator-cli": "^2.5.2",
      "@types/node": "^18.11.14",
      "typescript": "^4.9.4"
    },
    "dependencies": {
      "axios": "^1.2.1"
    }
  }
  ```

- tsconfig.json 
  アプリケーションから呼出し可能なライブラリを作成するためのTSコンパイラの設定を行います。あまり凝った設定はせずにライブラリとして動作する条件になっています。
  前述のとおり、OpenAPI Generatorの出力先「gen」以下を入力とし、「src」以下にライブラリのコードを出力します。
  型情報の出力(declaration)を有効にしているため、ライブラリは型定義(.d.ts)ファイルを含んで出力されます。
  ```json
  {
    "compilerOptions": {
      /* Language and Environment */
      "target": "esnext",
      "lib": ["esnext","dom"],
  
      /* Modules */
      "module": "commonjs",
      "rootDir": "gen",
      "moduleResolution": "node",
  
      /* Emit */
      "declaration": true,
      "outDir": "src",
      "newLine": "lf",
  
      /* Interop Constraints */
      "esModuleInterop": true,
      "forceConsistentCasingInFileNames": true,
  
      /* Type Checking */
      "strict": true,
  
      "skipLibCheck": true
    }
  }
  ```

## フロントエンドアプリケーションの実装
APIの呼出し処理はクライアントライブラリで実装されていますので、アプリケーションのプロジェクトにクライアントライブラリを追加します。マイナー/パッチバージョンが動いてしまうのはよろしくないので、`^`や`~`を利用したバージョン指定はしていません。

```json
{
  "name": "front",
  "version": "1.1.2",
  "private": true,
  "scripts": {
    "dev": "next dev",
    ・・・
  },
  "dependencies": {
    "@shinichiro-iwaki/greeter-api": "1.1.2",
    "@types/node": "18.11.15",
    "@types/react": "18.0.26",
    "@types/react-dom": "18.0.9",
    "next": "13.0.6",
    "react": "18.2.0",
    "react-aria": "^3.22.0",
    "react-dom": "18.2.0",
    "serve": "^14.1.2",
    "typescript": "4.9.4"
  },
  "devDependencies": {
  }
}
```

生成されたライブラリのAPI定義(api.d.ts)には用途に応じたモジュールが定義されていますが、今回はシンプルにAPIのクラスモジュールを利用してフロントエンドを実装していきます。

APIの応答結果を表示するコンポーネントは、例えばReactのuseEffect/useStateフックを用いて以下のように実装可能です。

- Greet.tsx 
  GreetApiの応答結果をStateとして保持し、保持データがある場合にはhtmlのリスト要素として表示するコンポーネントの定義です。
  APIの呼び出し先は変更されることを想定してNodeの環境変数(.env)から取得し設定しています。
  また、呼び出し元のロケールを取得するためにreact-ariaのuseLocaleを利用しています、
  ```ts
  import React, {useState, useEffect} from 'react'
  import {useLocale} from 'react-aria'
  import { GreetApi, GreetMessage } from '@shinichiro-iwaki/greeter-api/src/client/greeter'

  const Greet = () => {
      const [greet, setGreet] = useState<GreetMessage>()
      let locale = useLocale()
  
      // useEffectでGreetApiを呼出し、応答結果をStateに格納
      useEffect(() => {
          // GreetApiのConfigを環境変数からbasePathを取得するように設定
          const greetApi = new GreetApi(undefined, process.env.NEXT_PUBLIC_API_URL);
          // useLocaleで取得できる値はen-us(<言語>-<国名>)書式の値なのでAPIに合わせて言語の値を設定
          greetApi.getGreetIn(locale.locale.slice(0,2))
          .then(response => {
              setGreet(response.data)   
         })
      },[])
  
      if (!greet) return null;
  
      return (
          <div>
              <li>{greet.content}</li>
          </div>
      )
  }
  export default Greet
  ```

実装したコンポーネントをページに組み込むことであいさつ文の表示が可能です。サンプルですのでテンプレートに含まれるトップページに組み込んでみます。

```ts
export default function Home() {
  return (
    <div className={styles.container}>
      ・・・

      <main className={styles.main}>
        <h1 className={styles.title}>
          <Greet />
        </h1>
      ・・・
    </div>
  )
}
```

:::column: 余談:バックエンド側の変更
バックエンド側も言語を変えて作り直しできるとよかったのですが、余力が無かったのでバックエンド側はソースコードを変更していません。
まったくそのままというのも芸がないので、サンプルコードではビルドツールだけmaven→gradleに変更しています。
Provider側のテストはJUnit5と統合されているため、Pactに必要な設定を反映すればgradleでもそのままテストコードが利用可能です。
:::

## フロントエンドのContract Test
Contract Testを実装するために、テスティングフレームワークJestを利用したTypescriptの環境を構築し、Node.js上からPactを使用するためのライブラリ(@pact-foundation/pact[^6]、jest-pact)を依存関係に追加(`yarn add -D`)します。
```shell
yarn add -D jest ts-jest @types/jest
yarn ts-jest config:init
yarn add -D jest-pact @pact-foundation/pact@^10.0.2
```

[^6]:　余談ですがpact-jsはnode-gypを利用しているためPython、C/C＋＋の開発環境を整えておく必要があります。インストールすれば済む話ではありますが、ちょっと不便と言えば不便な部分ですね。

執筆時点ではjest-pactがpactの最新版に対応していないようですので上記のコマンド例ではpactのバージョンを指定しています。この辺の組み合わせは利用時点によって変わってくる部分になります。

これでContract Testの準備が整いました。シンプルにAPIモジュールを対象[^7]とした場合、以下のようなテストコードになります。

[^7]:　コンポーネントのテストで接続先をPactのモックサーバにすることも技術的には可能と思いますが、レンダリング処理等でテストコードが複雑になるためGreetApiのテストにしました。

- Greet.contract.test.ts 
  ```ts
  import { pactWith } from 'jest-pact/dist/v3';
  import { MatchersV3 } from '@pact-foundation/pact';
  import { Configuration, GreetApi } from '@shinichiro-iwaki/greeter-api/src/client/greeter'
  
  pactWith({ consumer: 'Greet_Front', provider: 'GreetProvider' }, (interaction) => {
    interaction('A request for API greet', ({ provider, execute }) => {
      beforeEach(() =>
        // Pact(=Providerに期待する呼出し/応答)の定義
        provider
          .uponReceiving('A request for API greet')
          .withRequest({
            method: 'GET',
            path: '/greet/en',
          })
          .willRespondWith({
            status: 200,
            body: {
              id: 1,
              content: MatchersV3.like("Hello Microservice")
            },
          })
      );
  
      // Pactが提供するmockserverを接続先としてAPIの応答値をテスト
      execute('greet api call', (mockserver) =>
        new GreetApi(new Configuration({ basePath: mockserver.url, }))
          .getGreetIn('en')
          .then((response) => {
            expect(response.data.id).toEqual(1);
            expect(response.data.content).toEqual("Hello Microservice");
          })
      );
    });
  });
  ```

`yarn jest`などでテストを実行すると、デフォルト出力先である`./pact/pacts`以下にPactファイルが作成されます。

pact-brokerへのPactの登録はCLIツールを利用して`pact-broker publish ./pact/pacts --consumer-app-version=<consumerのバージョン> --broker-base-url=<pacy-brokerのURL>`で実施できます。
コマンドオプションでタグ名などの付加情報の指定が可能ですし、`--auto-detect-version-properties `などでgitのブランチ名情報などの連携も可能です。
各種CLIツールはnodeのライブラリに同梱されていますので、package.jsonのscriptに定義[^8]しておけば勘弁に利用できます。

[^8]:　コマンドラインオプションでconsumerのバージョン指定が必要なのが玉に瑕です。上手いこと工夫すればAPIクライアントライブラリのバージョンと同期できるとは思うのですが、、、

もちろん、今回のフロントエンドのPactを利用して前回作成したバックエンドとの整合性の検証が可能です。採用技術が異なるConsumerとPeoviderの間の検証にも使えますし、リプレースの際のAPI互換性の確認にも有効ですね。

:::column: Pactを利用した便利機能
Pactライブラリに同梱されるCLIツールを利用すると、Pactファイルを利用したスタブサーバを簡単に利用できます。
`pact-stub-service <スタブ応答の入力となるPact> --port <サーバのポート番号>`でlocalhostにPactに従った応答をするスタブサーバが起動されますので、後続のフロントエンドアプリを起動しての作業[^9]などにも流用可能です。
:::


[^9]:　と紹介しましたが、今回のアプリはaxiosを利用しているためスタブサーバに繋いで動作させるには一工夫(スタブのレスポンスヘッダにAllowedOriginを設定する、preflightリクエストを抑制するなど)必要になります。サンプル実装前にもっと調べておけばよかったと後悔している部分です、、

## まとめ

分量的には本題のContract TestよりもNode.jsプロジェクトの説明が多くなってしまいましたが、フロントエンド(Consumer)アプリケーションでのContract Testの実装について紹介しました。次回はContract TestのCI組み込みについて紹介できればと思います。
