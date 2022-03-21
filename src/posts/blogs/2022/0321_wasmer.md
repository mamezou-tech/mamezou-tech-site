---
title: スタンドアローンおよび言語組み込みの WebAssembly ランタイム Wasmer
author: masahiro-kondo
date: 2022-03-21
---

[WebAssembly (Wasm)](https://developer.mozilla.org/ja/docs/WebAssembly) はブラウザで実行可能なバイナリフォーマットの標準として策定され、各ブラウザベンターにより実装されました。その後 Wasm の実行効率、ポータブルでセキュアな特徴をブラウザ外でも利用可能にするため [WebAssembly System Interface (WASI)](https://wasi.dev/) が策定されました。Wasmtime や Wasmer などの WASI 対応 Wasm ランタイムが開発されています。
Docker はコンテナ仮想化で任意の言語・フレームワークで開発されたコードを実行する環境を実現しました。Wasm/WASI は標準的なバイナリフォーマットとランタイムによりそれを実現したと言えます。

:::alert
もちろん Wasm を生成できるプログラミンング言語は限られており、Docker ランタイムがカバーする範囲に比べて非常に限定されています。また WASI はサンドボックスモデルのため、汎用言語と違って大きな機能制約もあります。
:::

:::check
Kubernetes でも Krustlet という Wasm ランタイムをコンテナとして扱う kubelet 実装が OSS として登場し、注目を集めています。
[GitHub - krustlet/krustlet: Kubernetes Rust Kubelet](https://github.com/krustlet/krustlet)
:::


今回は Wasmer の概要を見てみます。macOS にインストールしてみました。

[[TOC]]

# Wasmer のインストール
[Wasmer - The Universal WebAssembly Runtime](https://wasmer.io/)

公式のトップページ記載のコマンドで簡単にインストールできます。

```shell
curl https://get.wasmer.io -sSfL | sh
```

ホームディレクトリに `~/.wasmer` というディレクトリが作成され、zshrc に環境変数や PATH が追加されます。新しいシェルを起動して作業を続けます。

# WAPM の利用

Wasmer をインストールすると、WAPM という Wasm のパッケージマネージャーもインストールされます。

[WAPM - WebAssembly Package Manager](https://wapm.io/)

WAPM は Wasmer にバンドルされますが、[Wasmtime](https://wasmtime.dev/) のような他の Wasm ランタイムでも利用可能です。

wapm.io では ブラウザでパッケージを直接実行して動作を確認できます。

![](https://i.gyazo.com/e8b0a5ff814fa6b421ad3aea04608a77.png)

この Wasm パッケージ cowsay をローカルインストールして動かしてみます。

[syrusakbary/cowsay - wapm](https://wapm.io/syrusakbary/cowsay)

```shell
$ wapm install cowsay
[INFO] Installing syrusakbary/cowsay@0.2.0
Package installed successfully to wapm_packages!

$ wapm run cowsay hello wapm!
 _____________
< hello wapm! >
 -------------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
               ||----w |
                ||     ||

```

パッケージをインストールするとカレントディレクトリに `wapm_packages` ディレクトリができます。

![](https://i.gyazo.com/97ad312db9145f52c29ab38eff0139b1.png)

cowsay パッケージ内に cowsay.wasm という Wasm ファイルが格納されます。

パッケージ情報は wapm.toml に記述されています[^1]。

[^1]: wapm init コマンドにより生成されます。

```toml
[package]
name = "cowsay"
version = "0.2.0"
description = "cowsay is a program that generates ASCII pictures of a cow with a message"
readme = "README.md"
repository = "https://github.com/wapm-packages/cowsay"

[[module]]
name = "cowsay"
source = "target/wasm32-wasi/release/cowsay.wasm"
abi = "wasi"
interfaces = {wasi= "0.0.0-unstable"}

[[command]]
name = "cowsay"
module = "cowsay"

[[command]]
name = "cowthink"
module = "cowsay"
```

NPM の npx コマンドのような Wasm パッケージを直接実行できる wax コマンドも利用できます。これにより、Wasm パッケージをグローバルインストールしなくても簡単に実行できます。

```shell
wax cowsay hello          
```

# wasienv の利用

wasienv を使うと C/C++ から簡単に WASI 対応の Wasm を生成できます。

[GitHub - wasienv/wasienv: Wasienv: WASI Development Toolchain for C/C++](https://github.com/wasienv/wasienv)

現在 C/C++, Swift をサポートしています。Wasmer とは直接依存していませんが、[ブログ](https://medium.com/wasmer/wasienv-wasi-development-workflow-for-humans-1811d9a50345)によると Wasmer のコンパニオンプロジェクト的な位置づけでしょうか。WASI SDK のインストールや既存プロジェクトを移植するためのツール統合を簡単にするため開発されているようです。Rust には WASI 対応の Wasm 生成機能[^2]がありますが、ユーザの多い C/C++ からの移植が簡単になれば、Wasm の利用が促進されるでしょう。

[^2]: ビルドターゲットに wasm32-wasi を指定してビルドします。

wasienv のインストール。

```shell
curl https://raw.githubusercontent.com/wasienv/wasienv/master/install.sh | sh
```

インストーラが wasmer もインストールしようとしてエラーになりますが、wasienv は利用可能です。ホームディレクトリに `~/.wasienv` というディレクトリが作成され、zshrc に環境変数や PATH が追加されます。新しいシェルを起動して作業を続けます。C/C++ のコードをコンパイルするための SDK をインストールします。

```shell
wasienv install-sdk unstable
```

ドキュメントにある、example のコードを作成します。

[Compile C/C++ to Wasm WASI - Wasmer Docs](https://docs.wasmer.io/ecosystem/wasienv/compile-c-c++-to-wasm-wasi)

wasicc コマンドでコンパイルします。いくつか warining が出ますが、example.wasm が生成されます。

```shell
wasicc example.c -o example.wasm
```

wasmer で実行確認。

```shell
$ wasmer example.wasm
Hello, WASI!
```

# 様々な言語からの利用

Wasmer はスタンドアローンランタイムだけでなく、Rust, C/C++, JavaScript, Go, Python, PHP, Ruby との統合機能を提供しています。それぞれの言語のライブラリが提供されています。

[https://github.com/wasmerio/wasmer#-language-integrations](https://github.com/wasmerio/wasmer#-language-integrations)

元々ブラウザ外で Wasm を実行するための WASI のバイナリコードをブラウザで実行するため、WASI の機能を提供する Polyfill として動作する Wasmer JS が開発されています[^3]。

[GitHub - wasmerio/wasmer-js: Monorepo for Javascript WebAssembly packages by Wasmer](https://github.com/wasmerio/wasmer-js)

[^3]: Wasmar JS によって起動されるネイティブ機能は OS ではなく JavaScript のランタイムに属するものです。[https://docs.wasmer.io/integrations/js/wasi](https://docs.wasmer.io/integrations/js/wasi)

# まとめ
以上のように Wasmer はパッケージマネージャやコンパイラツールチェインなどのエコシステム、各種プログラミング言語との interop もサポートする総合的な基盤として整備されています。

昨今はエッジを含むサーバーサイド、IoT を含むデバイスなど様々な環境で動作するソフトウェアを開発する必要があります。ネイティブコードをそれぞれの環境で用意するのではなく、Wasm ランタイムで Wasm バイナリを実行するという手段も現実的な選択肢になりつつあります。もちろん実行環境にマッチしたソフトウェアを適した言語で書くというのは王道ではあります。ただ WAPM のようなパッケージ単位で再利用できるソフトウェアが増えていけば、実装言語を意識しないで利用しているというケースも増えていくかもしれません。
