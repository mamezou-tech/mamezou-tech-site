---
title: Deno を始める - 第2回 (外部ライブラリの利用)
author: masahiro-kondo
date: 2022-09-21
templateEngineOverride: md
prevPage: ./src/posts/deno/01-introduction.md
---

[前回](/deno/getting-started/01-introduction/)は開発環境の構築を行い、Deno ランタイムの概要を見ました。

今回は、外部ライブラリの利用方法について見ていきます。

[[TOC]]

## 外部コードのインポート

[Linking to External Code | Manual | Deno](https://deno.land/manual@v1.25.3/linking_to_external_code)

Deno はブラウザ上の JavaScript のように URL を指定してスクリプトを実行できます。

```typescript
import { serve } from "https://deno.land/std@0.155.0/http/server.ts";

function handler(req: Request): Response {
  return new Response("Hello, World!");
}

serve(handler);
```

インポートされたコードは、[前回記事にも書いた](/deno/getting-started/01-introduction/#deno-の環境変数)ように 環境変数 `DENO_DIR` に対応するディレクトリにダウンロードされ、キャッシュされます。

:::info
上記のコードは Web サーバーを動かすので `--allow-net` オプションが必要ですが、URL からのスクリプトインポートおよびキャッシュからのローディングに関しては、Deno ランタイムの特権モードで実行されるため、パーミッションを指定する必要はありません。

社内プロキシサーバ配下で開発している場合、環境変数 `HTTP_PROXY`、`HTTPS_PROXY`、`NO_PROXY` を設定することで、インポートが可能です(Windows の場合は、環境変数がない場合、レジストリの値を読み取ってくれます)。

GitHub や GitLab のプライベートリポジトリのモジュールをインポートする必要がある場合、環境変数 `DENO_AUTH_TOKENS` にホスティングサービスで発行された認証トークンを設定することで、利用可能です。
[Private Modules | Manual | Deno](https://deno.land/manual@v1.25.3/linking_to_external_code/private)
:::

インポートで、URL を直接指定する方式のため、同じライブラリを利用する複数のファイルがある場合、バージョンアップが煩雑になるなどの問題があります。これは、インポートを一つのファイルに集約し、再エクスポートすることで解決できます。

```typescript
// deps.ts
export {
  serve
} from "https://deno.land/std@0.155.0/http/server.ts";
```

利用側。
```typescript
import { serve } from "./deps.ts";
```
## vendor コマンドによる依存ライブラリのダウンロード
利用しているコードがホストされているリモートのサーバーが変わったり、ダウンしたりしているするリスクに備えるため、deno vendor サブコマンドが用意されています。このコマンドは、プロジェクトのルートフォルダに vendor ディレクトリを作成し全ての依存関係のコードをダウンロードします(npm の node_modules に相当)。本番環境へのデプロイ時には、この構成を利用することになります。

`https://deno.land/std@0.155.0/http/server.ts` をインポートしたコードで、`deno vendor main.ts` を実行すると、以下のように vendor ディレクトリが生成されました。

```
├── main.ts
└── vendor
    ├── deno.land
    │   └── std@0.155.0
    │       ├── async
    │       │   ├── abortable.ts
    │       │   ├── deadline.ts
    │       │   ├── debounce.ts
    │       │   ├── deferred.ts
    │       │   ├── delay.ts
    │       │   ├── mod.ts
    │       │   ├── mux_async_iterator.ts
    │       │   ├── pool.ts
    │       │   └── tee.ts
    │       └── http
    │           └── server.ts
    └── import_map.json
```

## ロックファイルによる検証
利用している外部モジュールが、変更されていないことを検証するためにロックファイルを使用することができます。`--lock=lock.json`、`--lock-write` オプション付きで `deno cache` コマンドを実行し、ロックファイルを生成します。deps.ts ファイルにインポートをまとめている場合は以下のように実行します。

```shell
deno cache --lock=lock.json --lock-write deps.ts
```

生成される lock.json の例です。URL とハッシュが保存されます。

```json
{
  "https://deno.land/std@0.156.0/_util/assert.ts": "e94f2eb37cebd7f199952e242c77654e43333c1ac4c5c700e929ea3aa5489f74",
  "https://deno.land/std@0.156.0/bytes/bytes_list.ts": "aba5e2369e77d426b10af1de0dcc4531acecec27f9b9056f4f7bfbf8ac147ab4",
  "https://deno.land/std@0.156.0/bytes/equals.ts": "3c3558c3ae85526f84510aa2b48ab2ad7bdd899e2e0f5b7a8ffc85acb3a6043a",
  "https://deno.land/std@0.156.0/bytes/mod.ts": "763f97d33051cc3f28af1a688dfe2830841192a9fea0cbaa55f927b49d49d0bf",
  "https://deno.land/std@0.156.0/io/buffer.ts": "fae02290f52301c4e0188670e730cd902f9307fb732d79c4aa14ebdc82497289",
  "https://deno.land/std@0.156.0/io/types.d.ts": "0cae3a62da7a37043661746c65c021058bae020b54e50c0e774916e5d4baee43",
  "https://deno.land/std@0.156.0/streams/conversion.ts": "fc4eb76a14148c43f0b85e903a5a1526391aa40ed9434dc21e34f88304eb823e"
}
```

この lock.json をソースコードと共にリポジトリに commit / push します。

他の開発者は、プロジェクトをリポジトリから clone して、以下のように `deno cache` を `--reload` フラグ付きで実行することで、キャッシュリロード時に依存関係を検証できます。

```shell
deno cache --reload --lock=lock.json deps.ts
```

実行すると、再ダウンロードと検証が行われます。

```
Download https://deno.land/std@0.156.0/streams/conversion.ts
Download https://deno.land/std@0.156.0/io/buffer.ts
Download https://deno.land/std@0.156.0/_util/assert.ts
Download https://deno.land/std@0.156.0/bytes/bytes_list.ts
Download https://deno.land/std@0.156.0/bytes/mod.ts
Download https://deno.land/std@0.156.0/io/types.d.ts
Download https://deno.land/std@0.156.0/bytes/equals.ts
```

## Node.js / npm との相互運用

Deno v1.25 で npm パッケージの実験的サポートが追加されました。

[Deno 1.25 Release Notes](https://deno.com/blog/v1.25#experimental-npm-support)

リリースノートにあるように、express をインポートして利用できます。

```typescript
import express from "npm:express";
const app = express();

app.get("/", function (req, res) {
  res.send("Hello World");
});

app.listen(3000);
console.log("listening on http://localhost:3000/");
```

npmjs で公開されているパッケージは、上記のように `npm:<パッケージ名>` というショートハンドが使用できます。

このコードを実行するには、`--allow-net`、`--allow-env` の他にカレントディレクトリの読み取りパーミッション(`--allow-read`)が必要です。安定板ではないので、`--unstable` フラグの指定も必要です。

```shell
deno run \
  --allow-net --allow-env --allow-read=./ \
  --unstable \
  main.ts
```

実行すると、npm から依存パッケージをダウンロードして起動します。
```
Download https://registry.npmjs.org/express
Download https://registry.npmjs.org/accepts
Download https://registry.npmjs.org/array-flatten
Download https://registry.npmjs.org/body-parser
Download https://registry.npmjs.org/content-disposition
Download https://registry.npmjs.org/content-type
...
Download https://registry.npmjs.org/parseurl/-/parseurl-1.3.3.tgz
Download https://registry.npmjs.org/has-symbols/-/has-symbols-1.0.3.tgz
Download https://registry.npmjs.org/content-type/-/content-type-1.0.4.tgz
Download https://registry.npmjs.org/ms/-/ms-2.0.0.tgz
listening on http://localhost:3000/
```

### Node 互換モードの利用

[Node Compatibility Mode | Manual | Deno](https://deno.land/manual@v1.25.3/node/compatibility_mode)

Node.js のプロジェクトで、Deno を `--compat` フラグ付きで互換モードで動かす方法です。

次のようにサードパーティの npm パッケージを利用するプロジェクトで試しました。

package.json

```json
{
  "name": "node-sample-project",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
  },
  "type":"module",
  "dependencies": {
    "compare-versions": "^5.0.1"
  }
}
```

スクリプトのコード。

```javascript
import { compareVersions } from 'compare-versions';

console.log(compareVersions('11.1.1', '10.0.0'));
console.log(compareVersions('10.0.0', '10.0.0'));
console.log(compareVersions('10.0.0', '11.1.1'));
```

まずは npm スクリプトでの実行。

```shell
$ npm start
```
実行結果。
```
> node-sample-project@1.0.0 start
> node index.js

1
0
-1
```

次に Deno での実行。互換モードは安定版ではないため、`--unstable` も必要です。

```shell
$ deno run \
  --compat --unstable \
  --allow-read --allow-write=./ --allow-env \
  index.js
```

実行結果。`std/node` の Node 互換モード用のライブラリのダウンロードが行われ、その後に実行されました。

```
Download https://deno.land/std@0.154.0/node/global.ts
Download https://deno.land/std@0.154.0/node/module.ts
Download https://deno.land/std@0.154.0/node/module_esm.ts
Download https://deno.land/std@0.154.0/node/upstream_modules.ts
1
0
-1
```

std/node ライブラリは、Node のビルトインモジュール用のポリフィルと、Deno でサポートしていない CommonJS 形式のモジュールのローディングなどをサポートする標準ライブラリです。

[The std/node Library | Manual | Deno](https://deno.land/manual@v1.25.3/node/std_node)

:::info
実際には、あまりこういう使い方はしないと思われますが、Deno でバッチ処理を構成して、一部 Node.js のコードをまるっと動かしたいけど Node.js は入れたくないといったケースでは有効かもしれません。
:::

### Deno フレンドリーな CDN からのパッケージ取得
[Packages from CDNs | Manual | Deno](https://deno.land/manual@v1.25.3/node/cdns)

Deno フレンドリーな CDN から取得することにより npm パッケージを簡単に利用できる可能性が大きくなるとされています。CDN は npm での公開方法に関係なく、パッケージとモジュールを (Deno がサポートする) ES Module 形式として提供します。また、モジュールの依存関係解決を CDN に委ねられるのもメリットです。多くの場合、パッケージの型定義が提供されており型チェックに利用できます。

マニュアルでは、Deno フレンドリーな CDN として、esm.sh / Skypack.dev が紹介されています。

- [ESM>CDN](https://esm.sh/)
- [Skypack: search millions of open source JavaScript packages](https://www.skypack.dev/)


### Import Maps の利用
Deno はブラウザでのモジュール解決に使用される Web プラットフォーム標準 Import Maps を利用できます。Deno のパッケージ解決にも利用できますし、Node コードと Deno を連携させるのにも利用できます。

[GitHub - WICG/import-maps: How to control the behavior of JavaScript imports](https://github.com/WICG/import-maps)

Deno は拡張子を含む完全修飾されたモジュールのみをローディングしますが、Import Maps を使うと、コード上は完全修飾されたインポート宣言を簡略化できます。

import_map.json の例。

```json
{
  "imports": {
    "lodash": "https://cdn.skypack.dev/lodash",
    "add": "./add.ts"
  }
}
```

コード上のインポート宣言。

```typescript
import lodash from "lodash";
import { add } from "add";
```

実行するには、`--import-map` オプションを使用します。

```shell
deno run --import-map ./import_map.json example.ts
```

:::info
Node.js では拡張子を解決するための機構を組み込んでおり、これはローカルファイルシステムのアクセス権を要求してしまうので Deno では採用されませんでした。
:::

## まとめ
今回は、Deno から外部ライブラリを利用する方法について紹介しました。

次回は Deno のユースケースとして、JSX と DOM による SSR(Server side rendering) について見ていきたいと思います。
