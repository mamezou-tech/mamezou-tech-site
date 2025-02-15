---
title: Eleventyで生成したサイトでNetlify Edge Functionsを使ってみる
publishedPath: netlify-edge-functions-with-11ty
author: noboru-kudo
date: 2022-08-17
templateEngineOverride: md
permalink: "/blogs/{{ page.date | date: '%Y/%m/%d' }}/{{ publishedPath }}/"
tags:
  - netlify
  - 11ty
---
一般的にサイトジェネレータで作成したサイトは、特定の場所に静的リソースを配置し、CDN経由で配信することが多いかと思います。
昨今はNext.jsやNuxt等のハイブリッドフレームワークを使って、サーバーサイド側でページを生成するSSR（Server Side Rendering）も増えてきていますが、やはり静的リソースのみを配置するスタイルは何かと開発・運用しやすいと思います。

とはいえ、このような静的サイトでも、認証、レスポンスヘッダ/Cookie操作、ローカライズ等、ちょっとしたサーバーサイド側の処理がほしくなることはよくあります。

今回は静的サイトジェネレータに[Eleventy](https://www.11ty.dev/)を使ったサイトで[Netlify](https://www.netlify.com/)が提供する[Netlify Edge Functions](https://docs.netlify.com/netlify-labs/experimental-features/edge-functions/)を適用する方法をご紹介したいと思います。

Netlify Edge Functionsは本サイトで別途紹介記事がありますので、合わせてこちらもご参考ください。

- [Deno Deploy を基盤とする Netlify Edge Functions を試す](/blogs/2022/07/23/try-netlify-edge-functions/)


ここでも触れられているように、Netlify Edge FunctionsはNetlifyのエッジ環境で任意のコードを実行するサービスです。
また、ランタイム環境として次世代のJavaScriptプラットフォーム[Deno](https://deno.land/)を利用する点でも、大きな注目が集まっています。

:::alert
ここで使うNetlify Edge Functionsは実験的(experimental)バージョンとなっています。
また、同様にNetlify Edge Functionsに対応したEleventyも2系は実験的バージョンです。
実際に利用する場合は、最新の状況を確認した上で、クリティカルでないシステムに適用することをお勧めします。
:::


## Eleventyのサンプルサイトを作成する

まずは、Eleventyでサイトを作成します。
任意のnpmプロジェクトを作成し、Eleventy本体と[Netlify CLI](https://www.npmjs.com/package/netlify-cli)(ローカル確認用)をインストールします。

```shell
npm install --save-dev @11ty/eleventy@2.0.0-canary.14 netlify-cli
```

注意点として、現時点のEleventyの安定版は1.0.1ですが、こちらではNetlify Edge Functionsの対応は含まれていません。明示的に2系バージョンを指定する必要があります。
ここでは、執筆時点で最新の`2.0.0-canary.14`をインストールしました。

Eleventyでのサイト作成は別記事で紹介していますので、ここでは省略します(記事はNetlify CMSのものですが、CMSはセットアップ不要です)。

- [Eleventy(11ty)プロジェクトを作成する](/blogs/2022/08/03/netlifycms-workflow-intro/#eleventy11tyプロジェクトを作成する)

## Eleventyの設定ファイルを修正する

EleventyのEdge Functions対応は、別途インストールは不要で、Eleventy本体に含まれています。
Eleventyの設定ファイル(.eleventy.js)に以下を追加し、Edgeプラグインを有効化します。

```javascript
const { EleventyEdgePlugin } = require("@11ty/eleventy");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyEdgePlugin);
};
```

設定はデフォルトのままで問題ありません（addPluginの第2引数でカスタム設定可能）。
なお、現時点ではEdgeプラグインがサポートするサービスは、Netlify Edge Functionsのみです。
今後対象が広がってくると、サービス別の追加設定が別途必要になってくると思います。

## Edge Functionを記述する

Edge Functionのソースコードはプロジェクトルート直下の`netlify/edge-functions`に配置します。
今回利用するNetlfiy Edge Functionsでは、ここにDeno互換のソースコードを配置する必要があります。
何も作成せずにEleventyをローカルビルド(`npx @11ty/eleventy`)すると、Netlify Edge Functionsのテンプレート(`eleventy-edge.js`)が作成されます。
初期状態のテンプレートは以下のようになりました。

```javascript
import { EleventyEdge } from "eleventy:edge";
import precompiledAppData from "./_generated/eleventy-edge-app-data.js";

export default async (request, context) => {
  try {
    let edge = new EleventyEdge("edge", {
      request,
      context,
      precompiled: precompiledAppData,

      // default is [], add more keys to opt-in e.g. ["appearance", "username"]
      cookies: [],
    });

    edge.config((eleventyConfig) => {
      // Add some custom Edge-specific configuration
      // e.g. Fancier json output
      // eleventyConfig.addFilter("json", obj => JSON.stringify(obj, null, 2));
    });

    return await edge.handleResponse();
  } catch (e) {
    console.log("ERROR", { e });
    return context.next(e);
  }
};
```

まず、EleventyEdgeプラグインのインスタンスを生成しています。
ここで利用している`precompiledAppData`(`./_generated/eleventy-edge-app-data.js`)はEleventyのプラグインが生成するソースコードで、手動で作成する必要はありません[^1]。

[^1]: テンプレートエンジンにNunjucksを使った場合に、ここに事前コンパイルしたソースコードが出力されました。

その次の`edge.config(...) => {...}`で、エッジ環境下で動作するテンプレートの関数(ショートコードやフィルター等)を記述します。
通常はプロジェクトルート配下の`.eleventy.js`内に記述しますが、エッジ環境で実行する場合はここに記述する必要があります。
今回は使用しないため、このままにしました（定義なし）。

最後の`edge.handleResponse()`では、エッジ環境固有部分をレンダリングした結果を返しています。

それでは、ここから以下2つのEdge Functionを追加してみます。
1. Basic認証
1. CookieベースのA/Bテスト

### Basic認証
`netlify/edge-functions`配下に`basic-auth.js`として以下のファイルを配置しました。

```javascript
import { decode } from "https://deno.land/std/encoding/base64.ts";

const unauthorized = new Response(null, {
  status: 401,
  headers: {
    "WWW-Authenticate": "Basic",
  },
});
export default async (request, { next, log }) => {
  const authorization = request.headers.get("authorization");
  if (!authorization) return unauthorized;
  const [, userpassword] = authorization.split(" ");
  const [user, password] = new TextDecoder("utf-8")
    .decode(decode(userpassword))
    .split(":");
  if (user === "mamezou" && password === "password123") {
    log("authentication succeeded!!");
    return next();
  }
  log("authentication failed...");
  return unauthorized;
};
```

リクエストヘッダからAuthorizationヘッダを取得して、ユーザー、パスワードの一致を比較するだけの単純なものです。
Netlify Edge Functionのシグニチャや利用可能なコンテキストの内容は、ここでは説明しません。詳細はNetlifyの公式ドキュメントを参照してください。

- [Netlify Edge Functions API](https://docs.netlify.com/netlify-labs/experimental-features/edge-functions/api/)

注意点として、Netlify Edge FunctionsはNode.jsではなく、Denoランタイムです。Node.jsのAPIは使用できません。上記でいうとBase64文字列のデコードを実装するにはDenoのAPIを使用する必要があります。

:::column:パスワード管理に環境変数を利用する
ここではシンプルさのためにユーザー、パスワードはハードコードしていますが、もちろんこれはセキュリティ上望ましくありません。
試していませんが、Netlify Edge Functionsは環境変数をサポートしていますので、通常はこれを使うのが良いかと思います。

- [Scopes and Deploy Contexts for Environment Variables](https://docs.netlify.com/netlify-labs/experimental-features/environment-variables/)

もちろん、Node.jsのAPIであるprocess.envは使えません。この場合は[Deno.env](https://doc.deno.land/deno/stable/~/Deno.env)を使うことになるかと思います。
:::

### CookieベースのA/Bテスト
`netlify/edge-functions`配下に`abtesting.js`として以下のファイルを配置しました。

```javascript
export default async (request, { next, cookies, log }) => {
  if (cookies.get("abtesting")) {
    return next();
  }
  // update A/B pattern to cookie
  const pattern = Math.random() < 0.5 ? "A" : "B";
  log("A/B Testing ->", pattern)
  const expires = new Date();
  expires.setTime(expires.getTime() + 24 * 3600 * 1000); // 1 day
  cookies.set({
    name: "abtesting",
    path: "/",
    value: pattern,
    expires,
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
  });
  return next({ sendConditionalRequest: true });
};
```

Cookie内に`abtesting`有無をチェックし、存在しない場合はランダム値として`A` or `B`を設定しています。

そして、この値に応じて生成するページを部分的に切り替えてみます。
まずは、先程Eleventyのプラグインが生成したソースコード(`eleventy-edge.js`)でこのCookieを参照できるよう指定します。

```javascript
export default async (request, context) => {
  try {
    let edge = new EleventyEdge("edge", {
      request,
      context,
      precompiled: precompiledAppData,
      cookies: ["abtesting"], // <-ここを追加
    });
  // 以下省略
};
```

テンプレート側でCookieの値を参照する場合は、プラグインが提供する`edge`ショートコードを利用します。

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
</head>
<body>
  <h1>Netlify Edge Functions example</h1>
  {% edge "liquid" %}
  {% if eleventy.edge.cookies.abtesting == "A" %}
    <p style="color: red">Aパターンコンテンツ</p>
  {% else %}
    <p style="color: blue">Bパターンコンテンツ</p>
  {% endif %}
  {% endedge %}
</body>
</html>
```

`{% edge "liquid" %}`から`{% endedge %}`で囲まれた部分はエッジ環境で実行されます(それ以外はビルド時)。
今回は、その中で先程設定したCookieの値に応じてレンダリングする内容を切り替えています。

ここではテンプレートエンジンにLiquidを使用していますが、Nunjucksやマークダウンにも対応しています[^2]。

[^2]: Edgeプラグインの制約は、[プラグイン公式ドキュメント](https://www.11ty.dev/docs/plugins/edge/#limitations)を参照してください。

:::info
ここではNetlify Edge Functionsで使ってA/Bテストをしていますが、Netlifyは複数ブランチに配置したリソースのスプリットテスト機能を提供しています。
現時点でベータバージョンではありますが、簡単にA/Bテストを実施するのであればこちらを利用するのが良いかと思います。
詳細は以下公式ドキュメントを参照してください。

- [Netlify - Split Testing](https://docs.netlify.com/site-deploys/split-testing/)
:::

## Netlify設定／ローカル動作確認(Netlify CLI)

Netlify側にこのEdge Functionを登録して、ローカルで動作確認します。
Netlifyの設定ファイル`netlify.toml`に以下を追記します。

```toml
[dev]
framework = "#static"
command = "npx @11ty/eleventy --quiet --watch"
publish = "_site"

[[edge_functions]]
function = "basic-auth"
path = "/*"

[[edge_functions]]
function = "abtesting"
path = "/*"

[[edge_functions]]
function = "eleventy-edge"
path = "/*"
```

`[dev]`セクションの内容はローカル確認向けのNetlify CLI設定です。
ここでは、`framework`を静的サイト`#static`とし、`publish`にEleventyビルドの出力先を指定しています。
`command`はEleventyのビルドコマンドで、リアルタイム反映を有効にするため`--watch`オプションを指定しています。
ここで指定可能なその他の設定項目は、以下公式ドキュメントを参照してください。
- [Netlify - File-based configuration - Netlify Dev](https://docs.netlify.com/configure-builds/file-based-configuration/#netlify-dev)

続く`[[edge_functions]]`セクションでNetlify Edge Functionsの設定を記述します。
これらは複数記述可能で、記載順に実行されます。ここでは、Basic認証 > A/Bテストパターン設定 -> レンダリングの順に指定しています。

ローカル環境でNetlify Edge Functionsを確認するには、以下コマンドを実行します。

```shell
npx netlify dev
```

デフォルトの8888ポートでNetlifyのローカルサーバーが起動し、ブラウザ上でNetlify Edge Functionsの挙動を確認できます。
アクセスするとBasic認証のダイアログが表示され、認証が成功すると以下のページが表示されました。

![netlify dev page](https://i.gyazo.com/59d3286e06e00e5f3d28d42a28c0f867.png)

Cookieの値によって、エッジ環境上でレンダリングするページが部分的に切り替わっていることが分かります。

参考までに、Eleventyで生成されたHTMLは以下のようになっていました。

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
</head>
<body>
  <h1>Netlify Edge Functions example</h1>
  <!--ELEVENTYEDGE_edge "liquid" %}
  {% if eleventy.edge.cookies.abtesting == "A" %}
    <p style="color: red">Aパターンコンテンツ</p>
  {% else %}
    <p style="color: blue">Bパターンコンテンツ</p>
  {% endif %}
  ELEVENTYEDGE_edge-->
</body>
</html>
```

エッジ環境で動作する部分は、コメントアウトされている状態です。EleventyのEdgeプラグインはこの部分をサーバーサイドでレンダリングしているようです。

## Netlifyにデプロイする

では、これをNetlifyにデプロイして、実際の環境で確認します。
ここで特別な設定は必要ありません。ソースコードをGitHubにコミットし、対象レポジトリをNetlifyにインポートするだけです。

- [Netlify - Import from an existing repository](https://docs.netlify.com/welcome/add-new-site/#import-from-an-existing-repository)

ドキュメントの通りですので、詳細は省略します。
デプロイが終わると、ローカル環境と同様にEdge Functionが動作していることが確認できます。

Netlify Edge Functionsのログはコンソールから確認できます。

![Netlify Console Edge Functions Log](https://i.gyazo.com/9ef2f9301b44a88bff6488afe08dcbd5.png)

## まとめ
Eleventyのプラグインを有効にするだけで、Netlify Edge Functionsを簡単に作成できました。
Denoランタイムに慣れる必要はありますが、軽量な処理[^3]であれば様々な用途で使っていくことができそうだと思いました。

Netlify Edge FunctionsとEleventy2系はともに実験的バージョンですので、早く安定版になるが待ち遠しい感じです。

というものの、本サイトでもNetlify Edge Functionsを使ってテーマ切り替え機能を最近追加しています。
ここではCookieを指定し、テンプレート上でCookieの値に応じてCSS切り替えを行っています。

最後に、当ブログで使用したGitHubレポジトリは以下で公開していますので、興味のある方はご参考ください。

- <https://github.com/kudoh/eleventy-netlify-edge-example>

[^3]: メモリ(512MB)やCPU時間(50ms)の制約があるため、重厚な処理には向きません。Netlify Edge Functionの制約は[公式ドキュメント](https://docs.netlify.com/netlify-labs/experimental-features/edge-functions/limits/)を参照しくてださい。

---
参照資料

- [Eleventyドキュメント - ELEVENTY EDGE](https://www.11ty.dev/docs/plugins/edge/)
