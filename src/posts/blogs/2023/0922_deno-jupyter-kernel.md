---
title: Deno 1.37 でリリースされた Jupyter Notebook の Deno カーネルを使う
author: masahiro-kondo
date: 2023-09-22
tags: [Deno, Jupyter]
---

## はじめに
Deno 1.37 がリリースされました。このリリースの目玉は Jupyter Notebook の Deno カーネルでしょう。

[Deno 1.37: Modern JavaScript in Jupyter Notebooks](https://deno.com/blog/v1.37)

Jupyter Notebook で Deno をインタラクティブに利用することができます。

## 準備

[JupyterLab](https://jupyter.org/) を事前にインストールします。筆者の環境(macOS Ventula)では Homebrew で Python 3.11 が導入されていました。

```shell
$ python3 --version
Python 3.11.5
```

pip3 コマンドで JupyterLab をインストールします。

```shell
pip3 install jupyterlab
```

Jupyterlab をビルドします。

```shell
jupyter lab build
```

JupyterLab を起動します。

```shell
jupyter lab
```

`localhost:8888/lab`　にアクセスすると Jupyter Notebook が使えるようになっています。

![JupyterLab](https://i.gyazo.com/f4b43aae870255c639ebab0338c26459.png)

## Deno カーネルのインストールと起動

まず Deno を 1.37 に更新します。

```shell
Deno upgrade
```

Deno カーネルをインストールします。 --unstable フラグが必要です。

```shell
$ deno jupyter --unstable --install
[InstallKernelSpec] Installed kernelspec deno in /Users/kondoh/Library/Jupyter/kernels/deno
✅ Deno kernelspec installed successfully.
```

この状態で、`jupyter lab` で Jupyter Notebook を起動すると、Deno カーネルが有効化されているのがわかります。

![Deno kernel](https://i.gyazo.com/5ce569f420c4ad06b3769d549a2aecaf.png)

## Deno カーネルを使う

それでは、Deno カーネルを使ってみましょう。上記の JupyterLab の画面で、Notebook セクションに追加された Deno カーネルのアイコンをクリックすると Deno カーネルを使える Jupyter Notebook が開きます。

:::info
以下のサンプルは1.37リリースブログのサンプルの写経がほとんどです。
:::

まずは、コンソールへの出力や Deno の top level await の利用です。問題ないようです。

![hello world](https://i.gyazo.com/c9fe081c5f202df3fecb26f0c08fdaf6.png)

Deno の標準 API は import なしで使えます。fetch API を使用する例です。

![Deno API](https://i.gyazo.com/121342275f510b0130118c14d719f0ea.png)

NPM の d3 パッケージを使ったパイチャートの描画[^1]です。NPM パッケージのインポートも普通にできます。

![D3 Chart](https://i.gyazo.com/f2f2bda4c10824e7afb5fe7bb2b115c4.png)

[^1]: 参照 - [https://app.noteable.io/f/0c265ea3-fd8b-43e5-9bcc-2e862a1acb00/Using-D3-with-Canvas-in-Deno-Notebooks.ipynb](https://app.noteable.io/f/0c265ea3-fd8b-43e5-9bcc-2e862a1acb00/Using-D3-with-Canvas-in-Deno-Notebooks.ipynb)

:::info
NPM パッケージをインストールするので初回実行には時間がかかります。JupyterLab を起動しているコンソールでは、パッケージインストール時にログが出ていました。

```
Warning Implicitly using latest version (v0.1.1) for https://deno.land/x/display/mod.ts
Warning Implicitly using latest version (0.5.4) for https://deno.land/x/skia_canvas/mod.ts
```
:::

以前の、記事「[Deno のビルトイン key-value データベース Deno KV が登場](/blogs/2023/05/09/deno-kv/)」で紹介した Deno KV ですが、Deno 1.36.4 リリースでリモートのデータベースに https で接続できるようになりました。以下のようにデータベースの UUID を使って openKv API を使用します。

```typescript
await Deno.openKv("https://api.deno.com/databases/<uuid>/connect");
```
接続文字列はプロジェクトページからコピーできます。

![connection string](https://i.gyazo.com/ea8b28d7580520379106eb460586f8e1.png)

以下の例では、上記の記事で作成していた books データベースに接続して、[nodejs-polars](https://www.npmjs.com/package/nodejs-polars)[^2] を使用して、テーブルを表示する例です。

[^2]: Rust で書かれた Pandas ライクなデータフレームライブラリ Polars を Node.js で使えるようにしたパッケージのようです。

Notebook で Deno KV にアクセスするには、環境変数 `DENO_KV_ACCESS_TOKEN` に Deno Deploy で発行したアクセストークンが必要になります。`Deno.env.set` でアクセストークンを指定して、`Deno.openKv` で Deno KV のデータベースに接続しました。あとは、データを取り出して、テーブルに出力するだけです。

![Deno kv](https://i.gyazo.com/eca7e1a132b48a3b5fb1a1b21fc9c77b.png)

## 最後に

Deno を Jupyter Notebook で使うのなかなか楽しいです。
