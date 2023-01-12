---
title: Wasmer 3.0 の WASM からの各プラットフォーム用バイナリ生成機能を試す
author: masahiro-kondo
date: 2022-12-13
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
tags: [wasmer, WASM, advent2022]
---

これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第13日目の記事です。

3月の記事「[スタンドアローンおよび言語組み込みの WebAssembly ランタイム Wasmer](/blogs/2022/03/21/wasmer/)」で、WASI 対応の WASM ランタイム Wasmer について紹介しました。

先月 Wasmer 3.0 のリリースがアナウンスされました。

[Announcing Wasmer 3.0](https://wasmer.io/posts/announcing-wasmer-3.0)

この記事では Wasmer 3.0 の新機能、特に各プラットフォーム向けバイナリ生成機能について確認していこうと思います。


## Wasmer 3.0 へのアップデート
さっそく Wasmer を最新版に更新しました。`self-update` サブコマンドを使用しました。wasmer / wapm はそれぞれ、3.0.2 / 0.5.9 になっていました。

```shell
$ wasmer self-update
already installed in /Users/masahiro-kondo/.wasmer with version: 2.2.1
Downloading archive from https://github.com/wasmerio/wasmer/releases/download/v3.0.2/wasmer-darwin-arm64.tar.gz
installing: /Users/masahiro-kondo/.wasmer
Updating bash profile /Users/masahiro-kondo/.zshrc
warning: the profile already has Wasmer and has not been changed
check: wasmer 3.0.2 installed successfully ✓
downloading: wapm-cli-darwin-aarch64
Latest release: 0.5.9
WAPM already installed in /Users/masahiro-kondo/.wasmer with version: 0.5.3
Downloading archive from https://github.com/wasmerio/wapm-cli/releases/download/v0.5.9/wapm-cli-darwin-aarch64.tar.gz
installing: /Users/masahiro-kondo/.wasmer
```

:::info
今回は `curl https://get.wasmer.io -sSfL | sh` でインストールしていた Wasmer をアップデートしました。このコマンドを再実行することでも更新可能です。また、Wasmer は Homebrew などのパッケージマネージャーでもインストールできます。詳しくはインストーラーのリポジトリの README を参照してください。

[GitHub - wasmerio/wasmer-install: Wasmer Binary Installer https://wasmer.io/](https://github.com/wasmerio/wasmer-install)
:::

## WASM パッケージの直接実行(wasmer run)
[3月の記事](/blogs/2022/03/21/wasmer/#wapm-の利用)では WASM のパッケージを `wapm install` コマンドでローカルにインストールしてから `wapm run` で実行していましたが、3.0 からはインストールステップをスキップして `wasmer run` で直接実行できるようになりました[^1]。

[^1]: ローカルにパッケージがインストールされていない場合、初回実行時に自動でインストールされます。

```shell
$ wasmer run cowsay hello wasmer!
 _______________
< hello wasmer! >
 ---------------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
               ||----w |
                ||     ||
```

wasmer run でリモートのパッケージを直接実行できるようになったので、docker run と同様な感じでパッケージが手軽に利用できるようになりました。

冒頭のアナウンスの記事では python パッケージをダイレクトに実行する例が紹介されています。実際に、WASM で実装された Python インタープリタが起動してきました。

```shell
$ wasmer run python/python
Python 3.6.7 (default, Feb 14 2020, 03:17:48)    
[Wasm WASI vClang 9.0.0 (https://github.com/llvm/llvm-project 0399d5a9682b3cef7 on generic
Type "help", "copyright", "credits" or "license" for more information.
>>> 
```
:::info
wapm.io にはまだ数は少ないですが、このような言語処理系も WASM パッケージとして公開されています。Ruby の irb や JavaScript Engine の SpiderMonkey なども利用可能になっています。

[Explore WAPM Packages](https://wapm.io/explore)
:::

## 各プラットフォーム向けバイナリ生成(wasmer create-exe)
`create-exe` サブコマンドで、各プラットフォーム向けネイティブ実行形式ファイルをクロスコンパイルで生成できるようになっています。

ネイティブコード生成対象として、標準入力からの入力を出力するだけの簡単な WASM を作成して検証してみます。

### WASM プロジェクトの準備
まず Rust を最新化して WASI 対応 WASM をビルドターゲットに追加します。

```shell
rustup update
rustup target add wasm32-wasi
```

cargo でプロジェクトを作成。

```shell
cargo new simple_echo
```

main.rs を以下のようにしました。

- main.rs
```rust
fn main() {
  let mut s = String::new();
  std::io::stdin().read_line(&mut s)
    .expect("input error at read_line()");
  println!("input: {}", s);
}
```

プロジェクトをビルドすると、`target/wasm32-wasi/debug` に WASM ファイルが生成されます。

```shell
cargo build --target wasm32-wasi
```

### Apple シリコン Mac 用バイナリ生成
WASM ファイルが生成されたディレクトリに移動します。

```shell
cd target/wasm32-wasi/debug
```

WASM ファイルを引数にして `create-exe` でバイナリを生成します。

まず作業している Apple シリコン MacBook 用のバイナリです。ターゲットアーキテクチャのディレクトリ `arm64-darwin` を事前に作成し、ターゲットプラットフォームを指定せずに `create-exe` を実行するとバイナリが作成されました。

```shell
$ mkdir arm64-darwin
$ wasmer create-exe simple_echo.wasm -o arm64-darwin/simple_echo
Compiler: cranelift
Target: aarch64-apple-darwin
Format: Symbols
Using path `/Users/masahiro-kondo/.wasmer/lib/libwasmer.a` as libwasmer path.
✔ Native executable compiled successfully to `arm64-darwin/simple_echo`.
```

file コマンドで生成されたバイナリの形式を確認すると `Mach-O 64-bit executable arm64` になっています。

```shell
$ file arm64-darwin/simple_echo
arm64-darwin/simple_echo: Mach-O 64-bit executable arm64
```

普通に実行できます。

```shell
$ arm64-darwin/simple_echo
hoge
input: hoge
```

### クロスコンパイルで Intel Mac 用バイナリ生成
次にクロスコンパイルです。クロスコンパイルには[プログラミング言語 Zig](https://ziglang.org/) が必要です。筆者は brew でインストールしました。

```shell
breww install zig
```

Intel Mac 用のディレクトリ `x86_64-darwin` を事前に作成して、`--target=x86_64-darwin` を指定して `create-exe` を実行します。かなり時間がかかりますが、うまくいくとバイナリが生成されます。

```shell
$ mkidir x84_64-darwin
$ wasmer create-exe simple_echo.wasm --target x86_64-darwin -o x86_64-darwin/simple_echo
Cached tarball to cache path `/Users/masahiro-kondo/.wasmer/cache/wasmer-darwin-amd64.tar.gz`.
Compiler: cranelift
Target: x86_64-unknown-darwin
Format: Symbols
Library Path: /Users/masahiro-kondo/.wasmer/cache/wasmer-darwin-amd64/lib/libwasmer.a
Using zig binary: /opt/homebrew/bin/zig
Using zig target triple: x86_64-macos-none
✔ Cross-compiled executable for `x86_64-unknown-darwin` target compiled successfully to `x86_64-darwin/simple_echo`.
```

file コマンドで形式を確認。`64-bit executable x86_64` になっています。

```shell
$ file x86_64-darwin/simple_echo
x86_64-darwin/simple_echo: Mach-O 64-bit executable x86_64
```

このように、1つの WASM ファイルから、複数のプラットフォーム用のネイティブバイナリをクロスコンパイルで生成できます[^2]。

[^2]: Windows の実行形式へのクロスコンパイルも試みましたが、エラーが出てうまくいきませんでした。


### WASM ファイルからネイティブコードを生成するメリット
これは、各プラットフォーム用のネイティブコードコンパイラや、各言語のクロスコンパイル機能を使用するのとどう違うのでしょうか？ Wasmer の公式ブログを見てみます。

[WebAssembly as a Universal Binary Format (Part I: Native executables)](https://wasmer.io/posts/wasm-as-universal-binary-format-part-1-native-executables)

以下は Google 翻訳によるものです。

> CLI ツールが最終ターゲットとして WebAssembly をターゲットにし始めると、Wasmer に各プラットフォームとチップセットのネイティブ実行可能ファイルを自動的に生成させることができるため、新しいチップと OSS が登場したときに、ソフトウェアを再コンパイルすることを心配する必要はありません。それらは単に機能します。

> ネイティブ バイナリは自動的にサンドボックス化され、明示的に決定されない限り、基盤となる OS へのアクセス許可を持たないため、日常的に使用する通常のバイナリよりもはるかに安全です。

Wasmer が「各プラットフォームとチップセットのネイティブ実行可能ファイルを自動的に生成」するため、対象のプラットフォームのネイティブコードコンパイラやツールチェインの整備を待たずに実行可能ファイルの生成が可能ということになります。
さらに、Wasmer から生成されるネイティブコードは Wasmer のサンドボックスモデルを引き継いでいるため、サンドボックスで動作する安全なバイナリであるということができます。

以下のブログでは、このような「ユニバーサル」バイナリ形式が CI やバイナリの配布の手間を軽減してくれることが書かれています。CI でいうと、クロスコンパイルのおかげで、全プラットフォームの仮想マシンやツールチェインを準備する必要がなくなります。

[WebAssembly as a Universal Binary Format (Part II: WAPM)](https://wasmer.io/posts/wasm-as-universal-binary-format-part-2-wapm)

:::info
wapm.io の各パッケージも、`Exectables` リンクからネイティブ実行形式のファイルがダウンロードできるようになっています。

![wapm の exectables リンク](https://i.gyazo.com/a274041515210427d379902d074d9244.png)

![プラットフォームの選択](https://i.gyazo.com/02b0922ff82256cf9ace8e42fc13450e.png)
:::

## 最後に
以上、Wasmer 3.0 の新機能を見てみました。フロントエンドのエコシステムでもかなり WASM が使用されるようになっていますが、ブラウザ外でも着々と WASM のエコシステムが整備されて行っているのがわかります。クロスコンパイルに Zig が使用されているのも興味深いですね。
