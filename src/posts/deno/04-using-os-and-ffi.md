---
title: Deno を始める - 第4回 (OS 機能と FFI の利用)
author: masahiro-kondo
date: 2022-11-02
templateEngineOverride: md
prevPage: ./src/posts/deno/03-server-side-rendering.md
nextPage: ./src/posts/deno/05-using-wasm.md
---

第3回の後、Deno 1.27 がリリースされましたので、本編に入る前に少し内容を見てみましょう。

[Deno 1.27: Major IDE Improvements](https://deno.com/blog/v1.27)

1.27 では Language Server や deno task など開発環境に関する改善が多く含まれているようです。
Language Server 関連では Inlay Hints が使えるようになりました。Inlay Hints は IDE 上で引数の名前や型、enum の値などを実際のコードとともに表示するもので、IntelliJ IDEA ではお馴染みの機能ですが、TypeScript でのサポートも進み、Deno にも取り込まれた形です。

以下のコードを VS Code で開いたとします。

```typescript
function a(b: string) {
  return b;
}

a("foo");

export enum C {
  A,
  B,
  C,
}

parseInt("123", 8);

export const d = Date.now();

export class E {
  f = Date.now();
}

["a"].map((v) => v + v);
```

Inlay Hints が有効化されていると、VS Code 上でこのようにヒント付きで表示されます。

![inlay hints](https://i.gyazo.com/37650c01eac82f2eddb3cd3d9aba0a55.png)

TypeScript を使うモチベーションが高まるリリースですね。

さて、今回は、Deno から OS の機能を利用する方法と、ネイティブ言語で書かれたライブラリを利用する方法について見ていきます。
Deno は Node.js 同様ブラウザ外で実行される JavaScript ランタイムなので、OS の環境変数の操作、プロセス起動、ファイルシステムへのアクセス、シグナルの処理などをタンタイム API を通して行えます。また、FFI という API を使うと C/C++、Rust などのネイティブコード生成言語で作成されたライブラリを呼び出すことが可能です。

[[TOC]]

## 環境変数の利用
コード内からのシステム環境変数の利用はどんな言語でも必須で、Deno でもランタイムの API `Deno.Env` として提供されています。 

`Deno.env.get` では `HOME` などのシェル埋め込みの環境変数と、ユーザーが定義した環境変数を取得できます。

- get_env.ts
```typescript
// Shell environment variables
console.log(Deno.env.get("HOME"));
console.log(Deno.env.get("USER"));
console.log(Deno.env.get("LANG"));

// User defiened environment variables
const HOST = Deno.env.get("HOST");
const PORT = Deno.env.get("PORT");
console.log(`Serving at ${HOST}:${PORT}`);
```

ユーザー定義の `HOST` や `PORT` などを事前に設定して、このコードを `--allow-env` フラグ付きで実行すると、下記のように環境変数の値が出力されます。

```shell
$ HOST=localhost PORT=8080 deno run --allow-env get_env.ts
/Users/masahiro-kondo
masahiro-kondo
ja_JP.UTF-8
Serving at localhost:8080
```

環境変数の設定や削除も可能です。API ドキュメントを参照してください。

[Deno.Env | Runtime APIs | Deno](https://deno.land/api@v1.27.0?s=Deno.Env)

## OS シグナルのハンドリング
HTTP サーバーや、バッチプログラムは、SIGTERM による終了要求を検知して、処理中のメソッドを完了させ、速やかにリソースを解放して終了処理を行う必要があります(Graceful Shutdown)。Deno ではシグナルを受信する SignalListener を追加して、受信時の処理を実装できます。

```typescript
const pid = Deno.pid;
console.log(`Run 'kill ${pid}' to terminate.`);

Deno.addSignalListener("SIGTERM", () => {
  console.log("Terminating...");
  Deno.exit();
});

setTimeout(() => {}, 10000);
```

プロセス ID を取得するため、`Deno.pid` プロパティを使用しています。`Deno.addSignalListener` を使用して、SIGTERM 受信時の処理を書いています。しばらく起動状態にするため、setTimeout で待機しています。プログラムを起動するとプロセス ID を表示します。別のターミナルから `kill <pid>` を実行すると、登録した SignalListener が動き、メッセージを表示して終了します。

```shell
$ deno run add_signal_listener.ts
Run 'kill 28365' to terminate. # ここで ’kill 28365’ を実行
Terminating...
```

[https://deno.land/std@0.161.0/signal/mod.ts?s=signal](https://deno.land/std@0.161.0/signal/mod.ts?s=signal)

:::info
Node.js の場合、process API でシグナルをハンドリングできます。

```javascript
import process from 'node:process';

process.on('SIGINT', () => {
  console.log('Received SIGINT. Press Control-D to exit.');
});
```
:::

## サブプロセスの起動
OS のコマンドや任意の CLI アプリケーションを起動したい場合は、ランタイム API の `Deno.run` を使用します。RunOptions にコマンドや標準入出力の設定を指定します。コマンドの引数は、`...fileNames` のようにスプレッド構文を使えて、複数ファイルを処理するなどの用途に利用できます。

```typescript
const fileNames = Deno.args;

const p = Deno.run({
  cmd: [
    "cat",
    ...fileNames,
  ],
  stdout: "piped",
  stderr: "piped"
});

const { code } = await p.status();

const rawOutput = await p.output();
const rawError = await p.stderrOutput();

if (code === 0) {
  await Deno.stdout.write(rawOutput);
} else {
  await Deno.stderr.write(rawError);
}

Deno.exit(code);
```

このコードでは、OS 標準の cat コマンドを起動し、プログラムの引数(ファイル名)を cat コマンドに渡します。`Deno.run` の戻り値は Process オブジェクトで、`Process.status()` メソッドは ProcessStatus の Promise を返します。この status でプロセスの終了ステータスが取得できるので、結果を標準出力または標準エラー出力に出力しています。

存在するファイルを指定した場合の結果です。ファイルの中身が出力されます。

```shell
$ deno run --allow-run run_cat.ts hoge.txt
contents of hoge.txt
```

存在しないファイルを指定した場合の結果です。cat コマンドからのエラー出力が取得され出力されます。

```shell
$ deno run --allow-run run_cat.ts fuga
cat: fuga: No such file or directory
```

いずれも、呼び出し元の Deno プログラムに、サブプロセスの出力がパイプされ取得できていることがわかります。`Deno.run` ではこのように起動したプロセスの結果や入出力を扱いやすくするメソッドやプロパティが提供されています。

[Deno.run | Runtime APIs | Deno](https://deno.land/api@v1.27.0?s=Deno.run)

## ファイルシステムイベント監視

特定のディレクトリ配下のファイルを監視し、ファイルの変更をトリガーに処理を実行したい場合があります。このようなケースでは、Deno.watchFs API が利用できます。

- watcher.ts
```typescript
const watcher = Deno.watchFs(".");

for await (const event of watcher) {
  console.log(">>>> event", event);
}
```
`Deno.watchFs(".")` でカレントディレクトリを監視対象として、FsWatcher オブジェクトが生成されます。デフォルトでは、サブディレクトリも監視対象となっています。FsWatcher から生成されるファイルシステムの変更イベントを `for await..of` 構文で反復処理しています。

プログラムは `--allow-read` フラグつきで実行します。

```shell
deno run --allow-read watcher.ts
```

カレントディレクトリで、以下のようにファイル操作を行います。

```shell
touch hoge.txt
echo fuga > hoge.txt
rm hoge.txt
```

ファイル操作に応じて、ファイルの変更イベントが出力されていきます。

```
>>>> event {
  kind: "create",
  paths: [
    "/Users/masahiro-kondo/work/hoge.txt"
  ],
  flag: null
}
>>>> event {
  kind: "modify",
  paths: [
    "/Users/masahiro-kondo/work/hoge.txt"
  ],
  flag: null
}
>>>> event {
  kind: "modify",
  paths: [
    "/Users/masahiro-kondo/work/hoge.txt"
  ],
  flag: null
}
>>>> event {
  kind: "remove",
  paths: [
    "/Users/masahiro-kondo/work/hoge.txt"
  ],
  flag: null
}
```

[Deno.watchFs | Runtime APIs | Deno](https://deno.land/api@v1.27.0?s=Deno.watchFs)

## FFI
FFI は Foreign Function Interface API の略で、C ABI[^1] をサポートするネイティブコード生成言語で書かれたライブラリを呼び出すことができます。

サポートされるライブラリ形式は以下のようになります。

| OS | バイナリ形式(拡張子) |
|:---|:---------------|
| Linux   | .so    |
| macOS   | .dylib |
| Windows | .dll   |

C/C++ や Rust で関数を作成しライブラリとしてビルドします。C で足し算の関数を作り、ライブラリにする例です。

- add.c
```c
int add(int a, int b) {
  return a + b;
}
```

macOS の dylib 形式のバイナリは以下のように生成します。

```shell
cc -c -o add.o add.c
cc -shared -W -o libadd.dylib add.o
```

Deno からは `Deno.dlopen` 関数を使って関数をロードし、`symbols.<関数名>` の形式で呼び出します。dlopen 関数のオプションには、関数名、引数と戻り値の型名を指定しています[^2]。

[^2]: サポートされる型はこちらを参照してください。[https://deno.land/manual@v1.27.0/runtime/ffi_api#supported-types](https://deno.land/manual@v1.27.0/runtime/ffi_api#supported-types)

```typescript
const dylib = Deno.dlopen(
  "./libadd.dylib",
  {
    "add": { parameters: ["i32", "i32"], result: "i32" },
  } as const,
);

const result = dylib.symbols.add(35, 34);

console.log(`Result from extrnal addition of 35 and 34: ${result}`);
```

実行には、`--allow-ffi` フラグと、不安定バージョンの API を使用するための `--unstable` フラグが必要です。

```shell
$ deno run --allow-ffi --unstable ffi.ts
Result from extrnal addition of 35 and 34: 69
```

`Deno.dlopen` でロードされた関数呼び出しは専用のスレッドで実行され Promise を返すため、await などでノンブロッキングで呼び出すことが可能です。

拡張なしで利用できるため、ネイティブコードで高速に計算させたいケースなどで対応しやすい API になっています。

[^1]: Application Binary Interface: バイナリレベルのプログラムインターフェース。

[Deno.dlopen | Runtime APIs | Deno](https://deno.land/api@v1.27.0?unstable&s=Deno.dlopen)

## まとめ
今回は、環境変数やシグナルの扱い、プロセス起動、ファイルイベントの監視やネイティブコードのモジュールの呼び出しについて見ました。サーバープログラムやバッチ処理を書く上で必要となるので、使いこなしてサクッと目的を達成できるようにしたいところです。
