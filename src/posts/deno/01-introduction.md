---
title: Deno を始める 第1回：開発環境とランタイム
author: masahiro-kondo
date: 2022-09-14
templateEngineOverride: md
---

この連載では「遅まきながら Deno を使い始める」というテーマで Deno の環境構築から始めて、エコシステム、ユースケースなどを扱っていこうと考えています。

Deno は Node.js を開発した Ryan Dahl が Node.js の設計の反省点を活かして開発し世に送り出した JavaScript / TypeScript ランタイムです。セキュアな設計、TypeScript をファーストクラス言語とすること、シングルバイナリの deno CLI だけで動くことなどを特徴とします。

[Deno - A modern runtime for JavaScript and TypeScript](https://deno.land/)

筆者は2年ほど前に少し触った程度したが、先日 [Fresh の記事](/blogs/2022/07/04/fresh-deno-next-gen-web-framework/)や [Netlify Edge Functions の記事](/blogs/2022/07/23/try-netlify-edge-functions/)を書いて、ちゃんと使ってみようと考えに至りました。その矢先 Big Change の発表がありました (後述)。

今回は、Deno の環境構築とランタイムの概要について見ていきたいと思います。

[[TOC]]

## 最近の Deno 動向
Deno の開発が始まった頃の状況については、このブログの解説がわかりやすいです。

[Node.js  における設計ミス By Ryan Dahl - from scratch](https://yosuke-furukawa.hatenablog.com/entry/2018/06/07/080335)

Node.js の開発言語が C/C++ であるのに対し、Deno はメモリ安全な Rust を採用しています。npm の資産を断ち切ってクリーンなアーキテクチャーを目指していました。

そして8月15日に発表された Big Changes。

[Big Changes Ahead for Deno](https://deno.com/blog/changes)

袂を分かったはずの npm を利用可能にすること、最速の JavaScript ランタイムを目指すこと、エンタープライズユーザーサポートなどが発表されました。

npm の取り込みについては大きな葛藤があったかと思いますが、ユーザーとしては利用できるメリットは大きいので、まあ妥当な決定かなという感じもあります。ただ、Node.js と Deno の使い分けについては判断が難しくなったと言えます。

速度に関しては新興の JavaScript ランタイム Bun を意識しているのでしょう。

[Bun is a fast all-in-one JavaScript runtime](https://bun.sh/)

Bun は Zig 言語で開発され、WebKit の JavaScriptCore をエンジンとして使用しています。Deno は従来通り Rust と V8 で最速を目指すようです。両者のスピード争いも目が離せないところです。

そして同月25日に v1.25がリリースされ、実験的 npm サポート、新しい実験的 HTTP サーバー API、起動速度の改善などが盛り込まれました。

[Deno 1.25 Release Notes](https://deno.com/blog/v1.25)

v1.25 ではさらに deno init というサブコマンドも提供され、プロジェクト生成が簡単になりました。

:::info
Deno は JavaScript / TypeScript の単一ファイルで開発を開始でき、設定ファイルや依存管理ファイル、マニフェストなどが不要なため、プロジェクト生成機能は不要とされていました。しかし、他のエコシステムから来たユーザーはあまりのシンプルさに戸惑い、基本的なプロジェクト構成を吐き出してくれるツールを探し始めるということで、このサブコマンドを追加したそうです。
:::

## 環境構築

### インストール
[公式マニュアル](https://deno.land/manual)をベースに進めていきます。

Deno はシングルバイナリでインストール可能です。筆者は Homebrew でインストールしましたが、Deno 自身に upgrade サブコマンドが用意されていて、`deno upgrade` で更新できます。シンプルにしたいなら、install.sh で単独インストールするのもよいでしょう。

```shell
curl -fsSL https://deno.land/x/install/install.sh | sh
```

:::info
upgrade サブコマンドでは、`deno upgrade --version 1.0.1` のようにバージョンを指定して特定のバージョンに変更することもできます。
:::

### IDE 設定

各種 IDE の環境設定は以下に書かれています。

[Set Up Your Environment | Manual | Deno](https://deno.land/manual@v1.25.2/getting_started/setup_your_environment)

VS Code を使う場合、Deno 公式の VS Code 拡張 vscode-deno が必須です。

[Deno&#32;-&#32;Visual&#32;Studio&#32;Marketplace](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno)

vscode-deno の設定方法は以下に書かれています。

[Using Visual Studio Code | Manual | Deno](https://deno.land/manual@v1.25.2/vscode_deno)

VS Code ではデフォルトで JavaScript / TypeScript サポートが組み込まれており、Node.js で従来の開発をすることも多いため、Deno を使用するワークスペースでのみ Deno 拡張を有効にしたくなります。

Deno のプロジェクトを単独で開いている場合は、プロジェクトのルートに、`.vscode/settings.json` に置くのがシンプルですが、モノレポで Deno プロジェクトがサブプロジェクトになっている場合は、`deno.enablePaths` で特定のフォルダ配下だけ有効化することが可能です。また、workspace を使っている場合は、「フォルダー」単位の設定を使うことができます。

![フォルダー別設定タブ](https://i.gyazo.com/746df5ff0588929878121a1eb3e747ac.png)

### Deno の環境変数
`deno info` で Deno の実行環境の情報を得ることができます。以下は筆者のマシンの出力です。開発中にインストールしたライブラリのキャッシュなどは、`DENO_DIR` に格納されます。

```
DENO_DIR location: /Users/masahiro-kondo/Library/Caches/deno
Remote modules cache: /Users/masahiro-kondo/Library/Caches/deno/deps
Emitted modules cache: /Users/masahiro-kondo/Library/Caches/deno/gen
Language server registries cache: /Users/masahiro-kondo/Library/Caches/deno/registries
Origin storage: /Users/masahiro-kondo/Library/Caches/deno/location_data
```

## Deno のツール
deno CLI のサブコマンドとして以下の機能がビルトインで提供されているオールインワン環境です。サードパーティの formatter や linter を個別に選択して devDependencies として別途インストールする Node.js と比べると非常にシンプルに運用できると言えます。

- benchmarker (deno bench)
- bundler (deno bundle)
- compiling executables (deno compile)
- installer (deno install)
- dependency inspector (deno info)
- documentation generator (deno doc)
- formatter (deno fmt)
- linter (deno lint)
- repl (deno repl)
- task runner (deno task)
- test runner (deno test)
- vendoring dependencies (deno vendor)

[Tools | Manual | Deno](https://deno.land/manual@v1.25.2/tools)

Node.js ユーザーのために、チートシートが用意されています。

[Node-&gt;Deno Cheatsheet | Manual | Deno](https://deno.land/manual@v1.25.2/node/cheatsheet)

## Deno ランタイム

[The Runtime | Manual | Deno](https://deno.land/manual@v1.25.2/runtime)

### ブラウザ互換のライフサイクルイベントと API
Deno プログラムの `load`、`beforeunload`、`unload` などのライフサイクルイベントは、ブラウザ互換になっています。

:::info
EventListener の登録は `window` ではなく `globalThis` プレフィクスを使用することが推奨です。

[Program Lifecycle | Manual | Deno](https://deno.land/manual@v1.25.2/runtime/program_lifecycle)
:::


以下の API はブラウザの実装と互換性があります。

- Web プラットフォーム API
- Web Storage API
- ロケーション API
- Web Workder API

Deno では、(注意深く実装すれば)クライアント(ブラウザ)とサーバーの両方で実行できる isomorphic なコードを書けるように考慮されているようです。

:::info
ブラウザとの環境の違いによる差異はあります。例えば fetch API では、現在 Deno に origin という概念がないため same-origin policy にも従わないなど、WHATWG の仕様との差異があります。
:::

### パーミッション APIs
Deno は実行時パーミッション指定が特徴で、deno CLI の実行時パラメータとして、`--allow-net` や `--allow-read` などを指定して、明示的にネットワークやファイルなどへのアクセスを許可する必要があります。

ソースコード内では API を使用して、パーミッションの検証、対話的な要求、リボークなどが可能です。以下はパラメータ無指定で実行すると、プロンプトを出してユーザーに許可を求めるコード例です。

```typescript
const desc1 = { name: "read", path: "/foo" } as const;
const status1 = await Deno.permissions.request(desc1);
console.log(status1);

const desc2 = { name: "read", path: "/bar" } as const;
const status2 = await Deno.permissions.request(desc2);
console.log(status2);
```

実行したところです。プロンプトへの入力によってパーミッションの状態(granted / denied)が変わっています。

```shell
$ deno run main.ts
⚠️  ️Deno requests read access to "/foo". Run again with --allow-read to bypass this prompt.
   Allow? [y/n (y = yes allow, n = no deny)]  y
PermissionStatus { state: "granted", onchange: null }
⚠️  ️Deno requests read access to "/bar". Run again with --allow-read to bypass this prompt.
   Allow? [y/n (y = yes allow, n = no deny)]  n
PermissionStatus { state: "denied", onchange: null }
```

### HTTP サーバー API
ハイレベルとローレベルの API が提供されています。

ハイレベル API では、Request / Response の単位で handler を書き、Deno 標準の std/http ライブラリの serve 関数を使って serving します。

```typescript
import { serve } from "https://deno.land/std@0.155.0/http/server.ts";

const port = 8080;

const handler = (request: Request): Response => {
  const body = `Your user-agent is \n\n${
    request.headers.get("user-agent") ?? "Unknown"
  }`;

  return new Response(body, { status: 200 });
};

console.log(`HTTP webserver running. Access it at: http://localhost:8080/`)
await serve(handler, { port });
```

[HTTP Server APIs | Manual | Deno](https://deno.land/manual@v1.25.2/runtime/http_server_apis)

:::info
v1.25 で `Deno.serve()` という実験的な API 実装がリリースされました。この API のパフォーマンスは従来の3倍高速とのことです。

[https://deno.com/blog/v1.25#new-experimental-http-server-api](https://deno.com/blog/v1.25#new-experimental-http-server-api)
:::

ローレベルな API では、クライアントの Connection の受付と処理を直接的に扱うコードを書きます。高速な Web サーバを構築でき、WebSockets を扱うこともできますが、その分実装の難易度は上がります。

[HTTP Server APIs (Low Level) | Manual | Deno](https://deno.land/manual@v1.25.2/runtime/http_server_apis_low_level)

### Foreign Function Interface API

C ABI(Application Binary Interface) をサポートするネイティブコード言語(Rust、C/C++、C#、Zig、Nim、Kotlin など)で書かれたライブラリを呼び出すことができます。実行時のパーミッションとして `--allow-ffi` が必要です。また、現時点では stable な機能ではないため、`--unstable` フラグも必要です。

[Foreign Function Interface API | Manual | Deno](https://deno.land/manual@v1.25.2/runtime/ffi_api)

### TypeScript の扱い
Deno では TypeScript が第1級言語になっており、Deno CLI 以外に何もインストールせずに利用できます。Deno に組み込まれた Microsoft の TypeScript Compiler と Rust の [swc](https://swc.rs/) というライブラリによって実現されています。Deno では実行時の型チェックと JavaScript へのコンパイルが行われ、結果をローカルにキャッシュします。

## まとめ
今回は Deno の環境を構築し、ランタイムの概要を確認しました。次回は外部モジュールの利用方法などについて見ていきたいと思います。
