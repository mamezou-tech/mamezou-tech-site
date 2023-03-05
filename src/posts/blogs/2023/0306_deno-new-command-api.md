---
title: Deno 1.31で安定化されたプロセス起動 API Deno.Command を使ってみる
author: masahiro-kondo
date: 2023-03-06
tags: [Deno]
---

Deno にはサブプロセスを起動する API がいくつかあります。現在公式マニュアルに記載されているのは Deno.run です。

[Creating a Subprocess | Manual | Deno](https://deno.land/manual@v1.31.1/examples/subprocess)

Deno 1.28 で Deno.Command が不安定版として追加され、1.31 で安定化されました。

- [Release v1.28.0 · denoland/deno](https://github.com/denoland/deno/releases/tag/v1.28.0)
- [Release v1.31.0 · denoland/deno](https://github.com/denoland/deno/releases/tag/v1.31.0)

## Deno.run
以前執筆した「[Deno を始める](/frontend/#denoを始める)」連載の第4回では、Deno.run API を紹介していました。

[Deno を始める - 第4回 (OS 機能と FFI の利用)](/deno/getting-started/04-using-os-and-ffi/)

cat コマンドにファイルのパスを渡して起動し結果を出力するサンプルです。

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
  console.info(new TextDecoder().decode(rawOutput));
} else {
  console.error(new TextDecoder().decode(rawError));
}

Deno.exit(code);
```

Deno.run のオプションで、標準出力、標準エラー出力をパイプで受け取るようにしています。Deno.run はサブプロセスのオブジェクトを返却するので、そのプロパティから結果コード・標準出力・標準エラー出力を取得しています。標準出力および標準エラー出力は、`Uint8Array` なので、`TextDecoder` を使ってデコードしています。

この Deno.run API は Deno.Command の安定化に伴い、非推奨化が決まっているようです。

## Deno.Command
Deno.Command の API ドキュメントは以下です。

[Deno.Command | Runtime APIs | Deno](https://deno.land/api@v1.29.2?unstable=&s=Deno.Command)

`Deno.Command` オブジェクトを作成して、`output` や `spawn` メソッドを呼ぶという2フェーズの API になっています。

`output` メソッドは、非同期呼び出しで、`Promise<CommandOutput>` を返します[^1]。

[^1]: 同期呼び出し用の `outputSync` メソッドもあります。

以下は Deno.run のサンプルと同様、cat コマンドにファイルパスを渡して結果を出力するものです。`output` メソッドから結果コード・標準出力・標準エラー出力を取得し、結果コードに応じて読み取ったファイルの内容かエラーメッセージを出力しています。

```typescript
const fileNames : string[] = Deno.args;

const command = new Deno.Command(
  "cat", {
  args: fileNames
});

const { code, stdout, stderr } = await command.output();

if (code === 0) {
  console.info(new TextDecoder().decode(stdout));
} else {
  console.error(new TextDecoder().decode(stderr));
}
```

このスクリプトを実行するには、`--allow-run` オプションを指定します。

```shell
deno run --allow-run main.ts hoge.txt
```

起動した子プロセスの標準入力にパイプ渡しする例も紹介します。`spawn` メソッドを使用しています。

```typescript
const fileNames : string[] = Deno.args;

const p = new Deno.Command("cat", {
  stdin: "piped",
  stdout: "piped",
}).spawn();

const file = await Deno.open(fileNames[0]);
file.readable.pipeTo(p.stdin);

const { stdout } = await p.output();

console.info(new TextDecoder().decode(stdout));
```

わざとらしいですが、ファイルのパスを cat の引数として渡すのではなく、Deno.open でファイルを開いて `spawn` で起動したプロセスの標準入力にパイプ渡ししています。このスクリプトを実行するには、`--allow-run` に加え、内部的なファイル読み取り用の `--allow-read` オプションも必要です。

```shell
deno run --allow-run --allow-read main.ts hoge.txt
```

## 最後に
以上、Deno.Command API の利用方法を紹介しました。Deno.run では、起動するコマンドを配列の形で渡していましたが、Deno.Command では専用のオブジェクトにより扱いやすくなっています。普通に実行するだけなら `spawn` メソッドではなく `output` を使うとパイプの扱いが不要になり、コードがシンプルになります。

Deno.Command 登場前に Deno.spawn という、これまた子プロセスを起動する API があったのですが、すでに削除されています。基本的な API が短期間で変わっていくのは開発が活発な証拠ですし、API の洗練だけでなくパフォーマンス改善もされているのだとは思いますが、バージョンアップ時に多少の痛みを伴うという側面はあります。
