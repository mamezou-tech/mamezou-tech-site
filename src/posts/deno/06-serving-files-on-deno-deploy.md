---
title: Deno を始める - 第6回 (Deno Deploy で静的ファイルを配信)
author: masahiro-kondo
date: 2022-11-22
templateEngineOverride: md
prevPage: ./src/posts/deno/05-using-wasm.md
nextPage: ./src/posts/deno/07-all-in-one-deno-sub-commands.md
---

今回は Deno Deploy についてです。Deno Deploy は JavaScript / TypeScript / WebAssembly を実行できるエッジサービスです。Deno の開発元 Deno Company が運営しています。今年の5月 Beta 4 に到達し、一般提供を間近に控えています。

[Deno Deploy Beta 4](https://deno.com/blog/deploy-beta4)

現在34のリージョンに展開されており、日本にも Tokyo と Osaka リージョンがあります。

[Regions | Deploy Docs](https://deno.com/deploy/docs/regions)

「[Fresh - Deno の 次世代 Web フレームワーク](/blogs/2022/07/04/fresh-deno-next-gen-web-framework/)」で紹介した Fresh の実行基盤になっており、「[Deno Deploy を基盤とする Netlify Edge Functions を試す](/blogs/2022/07/23/try-netlify-edge-functions/)」で書いたように他のホスティングサービスの基盤にもなっています。

今回は「Deno Deploy で JSON などの静的なファイルを配信する」というシナリオで、ダッシュボードやツールの利用方法などについて見ていきたいと思います。


## Playground によるデプロイ

Deno Deploy ではプロジェクト作成時に Playground を選ぶことができます。`Play` をクリックするとコード作成からデプロイまで、ブラウザ内で完結するプロジェクトが作成されます。

![Create Playground](https://i.gyazo.com/76eb3890d9f0a57155231cd23799a566.png)

コードエディタ、ログ、プレビューの画面が起動します。

![Playground1](https://i.gyazo.com/6b28b14d311678a057e64a87f7eefc76.png)

テンプレートの Hello World サンプルを[第3回](/deno/getting-started/03-server-side-rendering/)の preact で SSR するコードに置き換え、上部のセレクトボックスで `media type` を `TS` から `TSX` に変更、`Save & Deploy` をクリックすると数秒でデプロイが完了し、プレビューに反映されました。

![Playground2](https://i.gyazo.com/34a78944bc98ec65e6024ffed1940e93.png)

このサイトは実際に Deno Deploy にデプロイされ公開されます[^1]。

Playground のプロジェクトでも Deno Deploy のフル機能を利用可能で、コードは、Settings から GitHub にエクスポートもできます。

![Playground settings](https://i.gyazo.com/729880e3e1ab6fc205d2a94bb1d11007.png)

[^1]: Playground で書いたソースコードはデフォルトでは private です。

Playground ではファイルを1個しか置けないようなので、CSS や UI コンポーネントを切り出して配置するには通常のプロジェクトを使用する必要があります。

## deployctl によるデプロイ

ローカルの開発環境からデプロイする場合は、deployctl という CLI ツールを利用します。

[GitHub - denoland/deployctl: Command line tool for Deno Deploy](https://github.com/denoland/deployctl)

本格的な開発では後述の Git Integration を使うべきですが、Playground の範囲を超えてあれこれ試したい段階では deployctl を使うのが手軽です。

[deployctl | Deploy Docs](https://deno.com/deploy/docs/deployctl)

deployctl をインストールするコマンドです。

```shell
deno install --allow-read --allow-write --allow-env --allow-net --allow-run --no-check -r -f https://deno.land/x/deploy/deployctl.ts
```

deployctl の実体は、deno.land で公開されている deployctl.ts を deno CLI で実行するシェルスクリプトで、`$HOME/.deno/bin` にインストールされます。

deployctl を使ってデプロイを行うには PAT(Personal Access Token) が必要です。Deno Deploy にログインしていれば、[Account Settings の画面](https://dash.deno.com/account)の `Access Tokens` セクションで `New Access Token` をクリックすると生成できます。生成される Token を環境変数 `DENO_DEPLOY_TOKEN` に設定して使用します。

デプロイ先のプロジェクトはあらかじめ Web UI で作っておく必要があります。[プロジェクトのダッシュボード](https://dash.deno.com/projects)で `New Project` をクリックし作成画面で `Empty Project` をクリックします。

![Create Empty Project](https://i.gyazo.com/64941de4142ff537115e3be7857ef9e7.png)

空のプロジェクトが作成されます。プロジェクト名は自動生成です。

![Empty Project](https://i.gyazo.com/9631c36ce184e8d36e9be3af8dde8105.png)

以下のようなファイル構成の Deno プロジェクトがあるとします。

```
.
├── deno.json
├── deno.lock
└── mod.ts
```

Deno のプロジェクトディレクトリに移動して環境変数に PAT を設定し、作成したプロジェクト `afraid-salmon-17` に対して`deplyctl deploy` を `--dry-run` オプションで実行してみます。

```shell
export DENO_DEPLOY_TOKEN=xxxxx # アカウント画面で作成した PAT
# Web UI で作成したプロジェクトの名前を指定して、deploy の dry-run を実行
deployctl deploy --project=afraid-salmon-17 --dry-run mod.ts
```

PAT とプロジェクト名が正しく指定されていれば、以下のように dry-run が成功します。

```
ℹ Performing dry run of deployment
✔ Project: afraid-salmon-17
ℹ Uploading all files from the current dir (/Users/masahiro-kondo/dev/deno-project)
✔ Found 3 assets.
✔ 3 new assets to upload.
```

`--dry-run` オプションを指定しないで実行すれば実際にデプロイが行われます。10秒ぐらいで完了します。

```
✔ Project: afraid-salmon-17
ℹ Uploading all files from the current dir (/Users/masahiro-kondo/dev/deno-project)
✔ Found 3 assets.
✔ Uploaded 3 new assets.
✔ Deployment complete.

View at:
 - https://afraid-salmon-17-d8xmqv030g2g.deno.dev
```

Project のページで Deploymentのリストが確認できます。

![Deployments](https://i.gyazo.com/7951e5a8d3e70f312a043a91149a44f7.png)

Deployment は、アプリを実行するのに必要なすべてのコードと環境変数のスナップショットです。`{project_name}-{deployment_id}.deno.dev` というネーミングで作成されます。Deployment は不変(イミュータブル)であり作成後の変更はできません。アプリのコードが変更されたら、別の Deployment を作成する必要があります。

## JSON ファイルを配信する

以下のような JSON ファイルを Deno Deploy で配信したいとします。

- todo.json
```json
{
  "todos": [
    {
      "id": 1,
      "title": "Buy bread",
      "done": true
    },
    {
      "id": 2,
      "title": "Buy milk",
      "done": false
    },
    {
      "id": 3,
      "title": "Buy coffee",
      "done": false
    }
  ]
}
```

以下のスクリプトは、`Deno.readFile` を使って HTTP Server で JSON ファイルを配信する例です。

- mod.ts
```typescript
import { serve } from "https://deno.land/std@0.165.0/http/server.ts";

async function handleRequest(request: Request): Promise<Response> {
  const file = await Deno.readFile("./todo.json");
  return new Response(file, {
    headers: {
      "content-type": "application/json",
    },
  });
}

serve(handleRequest);
```

File Server を使うと Content-Type の指定などは不要で、パスを指定するだけになります。

- mod.ts
```typescript
import { serve } from "https://deno.land/std@0.165.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.165.0/http/file_server.ts";

async function handleRequest(request: Request): Promise<Response> {
  return await serveFile(request, `${Deno.cwd()}/todo.json`);
}

serve(handleRequest);
```

以上のように静的ファイルの配信は、Deno の標準ライブラリで配信用コードを書いて静的ファイルと共にデプロイすることで実現します。

deno.json に task を記述します。

- deno.json
```json
{
  "tasks": {
    "start": "deno run --allow-net --allow-read mod.ts"
  }
}
```

プロジェクト構成は以下のようになります。

```
.
├── deno.json
├── deno.lock
├── mod.ts
└── todo.json
```

deployctl でデプロイします。

```shell
deployctl deploy --project=afraid-salmon-17 mod.ts
```

```
✔ Project: afraid-salmon-17
ℹ Uploading all files from the current dir (/Users/masahiro-kondo/dev/serve-json)
✔ Found 4 assets.
✔ Uploaded 4 new assets.
✔ Deployment complete.
```

デプロイできたので、Deployment の URL を取得して、データを取得してみます。

```shell
curl -i https://afraid-salmon-17-d8xmqv030g2g.deno.dev/
```
```
HTTP/2 200
content-type: application/json
vary: Accept-Encoding
date: Mon, 21 Nov 2022 14:09:50 GMT
content-length: 246
x-robots-tag: noindex
server: deno/asia-northeast1-a

{
  "todos": [
    {
      "id": 1,
      "title": "Buy bread",
      "done": true
    },
    {
      "id": 2,
      "title": "Buy milk",
      "done": false
    },
    {
      "id": 3,
      "title": "Buy coffee",
      "done": false
    }
  ]
}
```

無事取得できました。

次にJSON ファイルにデータ(id:4)を追加してみます。

```json
{
  "todos": [
    {
      "id": 1,
      "title": "Buy bread",
      "done": true
    },
    {
      "id": 2,
      "title": "Buy milk",
      "done": false
    },
    {
      "id": 3,
      "title": "Buy coffee",
      "done": false
    },
    {
      "id": 4,
      "title": "Buy wine",
      "done": false
    }
  ]
}
```

deployctl で dry-run すると、変更された1ファイルだけをアップロードするという結果になります。

```shell
deployctl deploy --project=afraid-salmon-17 --dry-run mod.ts
```
```
ℹ Performing dry run of deployment
✔ Project: afraid-salmon-17
ℹ Uploading all files from the current dir (/Users/masahiro-kondo/dev/serve-json)
✔ Found 4 assets.
✔ 1 new asset to upload.
```

実際にデプロイしました。

```shell
deployctl deploy --project=afraid-salmon-17 mod.ts
```
```
✔ Project: afraid-salmon-17
ℹ Uploading all files from the current dir (/Users/masahiro-kondo/dev/serve-json)
✔ Found 4 assets.
✔ Uploaded 1 new asset.
✔ Deployment complete.
```

Deployment が新しく作られるのでその URL を指定してデータを取得します。

```shell
curl -i https://afraid-salmon-17-nhgcbcgqfg3g.deno.dev/
```
```
HTTP/2 200
accept-ranges: bytes
content-length: 321
content-type: application/json; charset=UTF-8
date: Mon, 21 Nov 2022 14:41:01 GMT
server: deno/asia-northeast1-a
vary: Accept-Encoding
x-robots-tag: noindex

{
  "todos": [
    {
      "id": 1,
      "title": "Buy bread",
      "done": true
    },
    {
      "id": 2,
      "title": "Buy milk",
      "done": false
    },
    {
      "id": 3,
      "title": "Buy coffee",
      "done": false
    },
    {
      "id": 4,
      "title": "Buy wine",
      "done": false
    }
  ]
}
```
追加したデータが反映されています。このように、デプロイのたび全体がアップロードされるわけではなく、差分だけがアップロードされます。

## 簡単なフィルタリング API を実装
JSON データのサイズが大きい場合、全量を受信するのではなく、リクエストパスに応じて絞り込まれたデータを受信したいケースもあるかと思います。以下の実装では、リクエストパスが `/` の場合はファイル全体を返しますが、`/todo` の場合、done になっていない todo だけを返却します。

```typescript
import { serve } from "https://deno.land/std@0.165.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.165.0/http/file_server.ts";

async function handleRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname.startsWith("/todo")) {
    const text = await Deno.readTextFile("./todo.json");
    const data = JSON.parse(text);
    const todos = data.todos.filter(item => item.done === false);
    data.todos = todos;
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json",
      },
    });
  }

  return await serveFile(request, `${Deno.cwd()}/todo.json`);
}

serve(handleRequest);
```

リクエストパスに応じて異なるファイルを配信するなどの用途にも使えます。

## プロダクションデプロイ
Deno Deploy の Deployment には Production(本番) と Preview(プレビュー) があり、この記事でここまでで作成してきたのは Preview Deployment でした。Production が Preview と異なる点は、プロジェクト名の URL (deployment_id がつかないもの)、及びカスタムドメインからのトラフィックを受け付けることです。

Deployment 一覧の画面で Preview Deployment を選択して、`Promote to Production` をクリックすることでそれを Production Deployment としてプロモートすることができます。

![Promote to Production](https://i.gyazo.com/6ede072320637ae5b5f488e3b5b2fa7d.png)

実行すると Production ドメインが指定の Deployment を指すことになるという確認ダイアログが出ます。

![Confirming](https://i.gyazo.com/2735f42ad845f2c3705d7f57c519f120.png)

`Promote` をクリックすると Production Deployment が更新されます。

![Deployed](https://i.gyazo.com/7b623ce782710476ecfd7b4cd4eb1bba.png)

deployctl でも Production Deploy を行うことができます。それには、`--prod` オプションを指定して実行します。結果に Production の URL が deployment_id 付きのものと並んで表示されます。

```shell
deployctl deploy --project=afraid-salmon-17 --prod mod.ts
```
```
✔ Project: afraid-salmon-17
ℹ Uploading all files from the current dir (/Users/masahiro-kondo/dev/serve-json)
✔ Found 4 assets.
✔ Uploaded 1 new asset.
✔ Deployment complete.

View at:
 - https://afraid-salmon-17-1x2enrbbgqx0.deno.dev
 - https://afraid-salmon-17.deno.dev
```

:::info
deployctl には Web UI のような既存の Deployment ID を指定して promote するサブコマンドはないようです。
:::

## Git Integration (Automatic) によるデプロイ
次に実開発で使用する Git Integration を見てみましょう。この記事のコードを以下の GitHub リポジトリに push しました。

[GitHub - kondoumh/deno-deploy-serve-json: Serving static JSON on Deno Deploy](https://github.com/kondoumh/deno-deploy-serve-json)

Deno Deploy のダッシュボードで新規プロジェクトを作ります。GitHub リポジトリを選択し、プロジェクト名をつけて `Link` をクリックします。

![Link GitHub Repo](https://i.gyazo.com/f4511598b316e8770f20facbb03cb893.png)

Link が成功するとデプロイが実行され、サイトが公開されます。

![Linked Project](https://i.gyazo.com/8feedcd8ab3c0c133234044369ce2b36.png)

JSON ファイルを更新(id:2 の done を true に変更)して GitHub リポジトリに push してみます。

```json
{
  "todos": [
    {
      "id": 1,
      "title": "Buy bread",
      "done": true
    },
    {
      "id": 2,
      "title": "Buy milk",
      "done": true
    },
    {
      "id": 3,
      "title": "Buy coffee",
      "done": false
    },
    {
      "id": 4,
      "title": "Buy wine",
      "done": false
    }
  ]
}
```

リポジトリの変更を検知して自動的に新しい Deployment 作成されます。Web UI で Promote to Production すると更新済みの JSON が返却されるようになりました。

```shell
curl -i https://kondoumh-serve-json.deno.dev/
```
```
HTTP/2 200 
accept-ranges: bytes
content-length: 320
content-type: application/json; charset=UTF-8
date: Tue, 22 Nov 2022 00:18:25 GMT
server: deno/asia-northeast1-a
vary: Accept-Encoding

{
  "todos": [
    {
      "id": 1,
      "title": "Buy bread",
      "done": true
    },
    {
      "id": 2,
      "title": "Buy milk",
      "done": true
    },
    {
      "id": 3,
      "title": "Buy coffee",
      "done": false
    },
    {
      "id": 4,
      "title": "Buy wine",
      "done": false
    }
  ]
}
```

## Git Integration (GitHub Actions) によるデプロイ
Automatic より細かい制御をしたい場合、GitHub Actions ワークフローを利用できます。これは、SSG のように配信する静的ファイルをワークフロー内でビルドするようなシナリオで有効です。GitHub Actions ワークフローでデプロイを実行するための、`denoland/deployctl` という Action が提供されています。

[deployctl/README.md at main · denoland/deployctl](https://github.com/denoland/deployctl/blob/main/action/README.md)

この Action の README に以下のような注意書きがあります。

> If your project does not require a build step, we recommend you use the "Automatic" deployment mode of our GitHub integration. It is faster and requires no setup.

SSG のようなビルドステップが必要ないのであれば、デプロイが速くて設定不要な Automatic が推奨されています。

既存プロジェクトが Automatic に設定されている場合、GitHub Actions に切り替えるには、Git Integration の設定で、リポジトリ設定を `Unlink` する必要があります。

![Unlink Git Integration](https://i.gyazo.com/f0a18c2d71b62d3af91d803b1b479f57.png)

その上で、再度同じリポジトリを選択し GitHub Action を選択します。

![Re-link with GitHub Action](https://i.gyazo.com/9d68250c8633193ce479ed33ac56b1bc.png)

`Link` をクリックすると変更完了です。

![Re-link done](https://i.gyazo.com/4cb5c3a2b01e207a715f5fc4026df553.png)

プロジェクトにデプロイ用のワークフローを追加します。以下の例では TODO コメントにしていますが、配信する JSON ファイルを生成するステップを追加します。denoland/deployctl のパラメータには、デプロイ先のプロジェクト名や Import Map を指定しています。詳しくは [README](https://github.com/denoland/deployctl/blob/main/action/README.md) を参照してください。

```yaml
name: Deploy

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    permissions:
      id-token: write
      contents: read

    steps:
      - name: Clone repository
        uses: actions/checkout@v3

      # TODO: Add step to generate JSON file 

      - name: Deploy to Deno Deploy
        uses: denoland/deployctl@v1
        with:
          project: kondoumh-serve-json
          entrypoint: mod.ts
          import-map: import_map.json
```

## まとめ
今回は、Deno Deploy で静的ファイルを配信するというシナリオで Deployment の概念、各種デプロイ方法を見てきました。

Netlify の場合だと配信するファイルをカスタムヘッダー用のファイルと共に配置するだけという手軽さですが、Deno Deploy では配信用のスクリプトを書いて Deno の API を使って Serving するスタイルでした。プログラマブルにすることで、柔軟な配信が可能になることがメリットかと思います。

Git Integration では GitHub Actions ワークフローによるビルドステップが注入できるため、自動的にデータを更新するサイトの構築がやりやすくなっていると感じました。

Deno Deploy は現在ベータということで正式公開までにどのような改善が加えられるのか注目したいところです。

次回は、Deno が標準で提供する formatter / linter / doc などのツールを確認して連載を締めくくりたいと思います。
