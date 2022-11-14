---
title: Deno を始める - 第5回 (WebAssembry の利用)
author: masahiro-kondo
date: 2022-11-15
tags: [WASM]
templateEngineOverride: md
prevPage: ./src/posts/deno/04-using-os-and-ffi.md
---

Deno v1.28 がリリースされました。安定化された(`--unstable` フラグが不要になった) API、新しい(unstable な) `Deno.Command` API の追加などがブログで説明されています。npm パッケージのインポートも安定化されたようで、`--unstable` が不要になりました。

[Deno 1.28: Featuring 1.3 Million New Modules](https://deno.com/blog/v1.28)

とりあえず `deno upgrade` でアップデートしました。アップデート用のサブコマンドが本体に内蔵されているのは便利ですね。

今回は Deno からの WebAssembry(WASM) 利用について見ていきましょう。

[[TOC]]

## Deno の Web 標準 API による WASM サポート
Deno ランタイムで提供される WASM 用 API は Web 標準の API ですので、Web ブラウザー用にビルドされた WASM を利用できます。

- [Using WebAssembly | Manual | Deno](https://deno.land/manual@v1.28.0/runtime/webassembly)
- [WebAssembly JavaScript API の使用 - WebAssembly | MDN](https://developer.mozilla.org/ja/docs/WebAssembly/Using_the_JavaScript_API)

Deno では `WebAssembly.instantiate()` や `WebAssembly.instantiateStreaming()` などの Web 標準 API を使って WASM をインスタンス化、実行できます。下記のコードはリモートに配置された simple.wasm という WASM ファイルを fetch して実行するサンプルです。

- use_wasm.ts
```typescript
const importObject = {
  imports: { imported_func: (arg) => console.log(arg) }
};

const obj = await WebAssembly.instantiateStreaming(
  fetch("https://mdn.github.io/webassembly-examples/js-api-examples/simple.wasm"),
  importObject
);

obj.instance.exports.exported_func()
```

`WebAssembly.instantiateStreaming()` は リモートの WASM バイナリをソースとするストリームから直接 WASM モジュールをコンパイル・インスタンス化する関数です。

simple.wasm の WAT(WebAssembly Text) 形式のコードは以下のようになります。`i32` 型の引数を受け取る関数をインポートし、その関数に固定値 42 を渡して実行するというものです。上記の use_wasm.ts では、`imported_func` として `condole.log()` を渡しているため、`call $i` でこれが呼び出されます。

- simple.wat
```lisp
(module
  (func $i (import "imports" "imported_func") (param i32))
  (func (export "exported_func")
    i32.const 42
    call $i
  )
)
```

このファイルをホストする HTTP Server は MIME タイプ `application/wasm` でファイルを Serve する必要があります。

use_wasm.ts を `--allow-net` フラグ付きで実行すると次のように WASM 内で定義された固定値がインポートされた console.log 関数により出力されます。

```shell
$ deno run --allow-net use_wasm.ts
42
```

:::info
ブラウザー外で WASM を実行するための共通規格には WASI (WebAssembly System Interface) があり、Wasmer や Wasmtime  などのランタイムがあります。それぞれ以下の記事で紹介していますので、興味があればご覧ください。

- [スタンドアローンおよび言語組み込みの WebAssembly ランタイム Wasmer](/blogs/2022/03/21/wasmer/)
- [Wasmtime が Production Ready に](/blogs/2022/10/02/wasmtime_v1/)

Deno は Web 標準の API で WASM を使用するため WASI には対応していません。
:::

ブラウザーでは WASM の処理で UI の処理をブロックしないよう、Web Worker に WASM モジュールを渡してワーカースレッドで処理させることができます。Deno でも Web 標準の Worker API 提供されているのでワーカースレッドでの処理が可能です。

[Workers | Manual | Deno](https://deno.land/manual@v1.28.0/runtime/workers)

上記のサンプルを Worker で実行するように変更してみます。まず main スレッドの処理です。事前に Worker を複数作成して、`WebAssembly.compileStreaming` でコンパイル済みのモジュールを作成し Worker に渡しています。

- use_wasm.ts
```typescript
const worker1 = createWorker("worker1");
const worker2 = createWorker("worker2");

const mod = await WebAssembly.compileStreaming(
  fetch("https://mdn.github.io/webassembly-examples/js-api-examples/simple.wasm"),
);

worker1.postMessage({ module: mod });
worker2.postMessage({ module: mod });

function createWorker(name: string): worker {
  const worker = new Worker(new URL("./worker.ts", import.meta.url).href, {
    type: "module",
    name: name,
  });
  return worker;
}
```

Worker の処理。`WebAssembly.instantiate` で main スレッドから受け取ったモジュールをインスタンス化し実行します。

- worker.ts
```typescript
const importObject = {
  imports: {
    imported_func: arg => {
      console.log(arg);
    }
  }
};

self.onmessage = async (e) => {
  console.log(self.name, "module received from main thread");
  const { module } = e.data;
  const instance = await WebAssembly.instantiate(module, importObject);
  instance.exports.exported_func();

  self.close();
};
```

実行すると、WASM のインスタンス化と呼び出しが各 Worker で並列で実行されるのが分かります。

```shell
$ deno run --allow-read --allow-net use_wasm.ts
worker1 module received from main thread
worker2 module received from main thread
42
42
```

以上のように、Deno では Web 標準の API により効率よく WASM を利用できます。バッチ処理や複数のクライアントからのリクエストを捌くサーバープログラムでも高いスループットを実現できます。

## WASM ベースの Deno ライブラリ
Deno では WASM ベースのライブラリも数多く提供されています。これらライブラリは内部実装として WASM を使っていても、利用側は WASM 連携用のグルーコードを書く必要はありません。いくつか例を見て見ましょう。

### deno-dom
DOM 操作ライブラリです。

- [https://deno.land/x/deno_dom](https://deno.land/x/deno_dom@v0.1.35-alpha)
- [GitHub - b-fuze/deno-dom: Browser DOM &amp; HTML parser in Deno](https://github.com/b-fuze/deno-dom)

[第3回](/deno/getting-started/03-server-side-rendering/#dom-api-の利用)で使用した linkdom と同様の DOM 操作用サードパーティライブラリです。deno-dom は HTML Parser が Rust / WASM で実装されており、Deno Deploy での実行もサポートされているのが特徴です。使用感は linkdom と同様です。

### deno-canvas
Deno で Web ブラウザの Canvas API を使えるようにするライブラリです。

- [https://deno.land/x/canvas](https://deno.land/x/canvas@v1.4.1)
- [GitHub - DjDeveloperr/deno-canvas: Canvas API for Deno, ported from canvaskit-wasm (Skia).](https://github.com/DjDeveloperr/deno-canvas)

Google の 2D Graphics ライブラリ [Skia](https://skia.org/) の CanvasKit を WASM に移植したライブラリです。

簡単なサンプルです。

- use_canvas.ts
```typescript
import { createCanvas } from "https://deno.land/x/canvas/mod.ts";

const canvas = createCanvas(200, 200);
const ctx = canvas.getContext("2d");

ctx.fillStyle = "red";
ctx.fillRect(10, 10, 200 - 20, 200 - 20);

await Deno.writeFile("image.png", canvas.toBuffer());
```

`createCanvas` は(ブラウザ環境を)エミュレートした Canvas2D オブジェクトを生成して返す API です。生成した Canvas2D オブジェクトから `getContext` でグラフィック描画用のオブジェクトを取得し、`fillRect` で四角形を塗りつぶしています。

このコードを以下のように実行すると、赤い正方形が描かれた画像ファイルが生成されます。

```shell
deno run --allow-write --allow-env --allow-net use_canvas.ts
```

ヘッドレスブラウザを使わなくても Web 標準の Canvas 2D でグラフィックを描画できるこのライブラリ、サーバーサイドで定型的な画像生成処理ができるので色々と使い道ありそうです。

### OpenCV-WASM
コンピュータビジョンのライブラリ [OpenCV](https://opencv.org/) の WASM 版です。Node.js と Deno 両方に対応しています。

[https://deno.land/x/opencv](https://deno.land/x/opencv@v4.3.0-10)

円とハートが混じった画像からテンプレート(ハート)を抽出するテンプレートマッチングのサンプルです。

![template matching](https://i.gyazo.com/d34e46ed5e0289c9549671c01ac2f94b.png)

ドキュメントに掲載されているのは Node.js 用のものなので、Deno で動くようにしてみました。[Node.js 用のサンプルコード](https://github.com/echamudi/opencv-wasm/blob/master/examples/templateMatching.js)を以下のように変更しました。Deno は Top-level await が使えるのでコード全体を `(async () => {})` で囲むのが不要です。また、Jimp という NPM のイメージ操作ライブラリを使用するため、`npm:jimp` でインポートしています。後は、`Jimp.write` の `data` で Node.js の `Buffer.from` を使わないようにしたぐらいです。

- use_opencv.ts
```typescript
import { cv } from "https://deno.land/x/opencv@v4.3.0-10/mod.ts";
import Jimp from "npm:jimp";

const imageSource = await Jimp.read("./image-sample.png");
const imageTemplate = await Jimp.read("./image-sample-template.png");

let src = cv.matFromImageData(imageSource.bitmap);
let templ = cv.matFromImageData(imageTemplate.bitmap);
let processedImage = new cv.Mat();
let mask = new cv.Mat();

cv.matchTemplate(src, templ, processedImage, cv.TM_CCOEFF_NORMED, mask);
cv.threshold(processedImage, processedImage, 0.999, 1, cv.THRESH_BINARY);
processedImage.convertTo(processedImage, cv.CV_8UC1);

let contours = new cv.MatVector();
let hierarchy = new cv.Mat();

cv.findContours(processedImage, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
for (let i = 0; i < contours.size(); ++i) {
    let countour = contours.get(i).data32S; // Contains the points
    let x = countour[0];
    let y = countour[1];
    
    let color = new cv.Scalar(0, 255, 0, 255);
    let pointA = new cv.Point(x, y);
    let pointB = new cv.Point(x + templ.cols, y + templ.rows);
    cv.rectangle(src, pointA, pointB, color, 2, cv.LINE_8, 0);
}

new Jimp({
    width: src.cols,
    height: src.rows,
    data: src.data
}).write("template-matching.png");
```

以下のようにフラグ付きで実行。

```shell
deno run --allow-env --allow-net --allow-read --allow-write use_opencv.ts
```

無事にハートが識別されたマッチング結果の画像が生成されました。

![生成されたマッチング結果](https://i.gyazo.com/68d30e27694e9b89430787897ee92829.png)

### deno-sqlite
SQLite を Deno から使えるライブラリです。SQLite3 WASM 版の JavaScript/TypeScript ラッパーです。

[GitHub - dyedgreen/deno-sqlite: Deno SQLite module](https://github.com/dyedgreen/deno-sqlite)

公式のサンプルがわかりやすいです。

```typescript
import { DB } from "https://deno.land/x/sqlite/mod.ts";

// Open a database
const db = new DB("test.db");
db.execute(`
  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  )
`);

// Run a simple query
for (const name of ["Peter Parker", "Clark Kent", "Bruce Wayne"]) {
  db.query("INSERT INTO people (name) VALUES (?)", [name]);
}

// Print out data in table
for (const [name] of db.query("SELECT name FROM people")) {
  console.log(name);
}

// Close connection
db.close();
```

以下のようなフラグ付きで実行すると test.db ファイルが作成され、データベースに格納されたデータが出力されます。

```shell
$ deno run --unstable --allow-read --allow-write use_sqlite.ts
Peter Parker
Clark Kent
Bruce Wayne
```

## まとめ
今回は WASM の利用について見てきました。Web 標準の API でブラウザ用の WASM 実装がそのまま使えるのが利点と言えるでしょう。
WASM ベースのライブラリも増えてきているので、直接・間接に使う機会も多くなっていくのではないでしょうか。

次回は Deno のエッジ環境 Deno Deploy の利用について見ていきたいと思います。
