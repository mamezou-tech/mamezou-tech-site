---
title: 東京 POP もできた Wasmer Edge (Beta) を試す
author: masahiro-kondo
date: 2024-03-20
tags: [wasmer, WASM]
image: true
---

## はじめに

Wasmer から Wasmer Edge (Beta) の GA と東京など新たな拠点の追加が発表されました。

[Wasmer Edge (Beta) is now Generally Available · Blog · Wasmer](https://wasmer.io/posts/wasmer-edge-beta-is-ga)

Wasmer Edge は WASM(Webassembly) ランタイムを利用して構築されたクラウドプラットフォームです。Kubernetes に代表されるコンテナ技術よりもシンプル・セキュアで、スケーラビリティと回復力を備えたプラットフォームを目指して開発されています。

C / Rust / JavaScript / Python / WASM とその他、WASM / WASI(X)[^1] をサポートする任意のプログラミング言語でアプリを書けます。

[^1]: WASI は WASM を はブラウザ外で実行するための仕様、WASIX は WASI を POSIX に対応させる拡張仕様です。

将来的には、OSS バージョンが提供されオンプレミスでの運用も可能になるようです。

:::info
Wasmer については以下の記事でも紹介しています。

- [スタンドアローンおよび言語組み込みの WebAssembly ランタイム Wasmer](/blogs/2022/03/21/wasmer/)
- [Wasmer 3.0 の WASM からの各プラットフォーム用バイナリ生成機能を試す](/blogs/2022/12/13/wasmer-v3/)
:::

## Wasmer Edge でのアカウント作成

Wasmer Edge には GitHub アカウントなどでサインアップ可能です。筆者は9ヶ月前にアカウントを作っていました。

![Dashboard](https://i.gyazo.com/f330e1b3dbbde16e62de09b3bef8fd98.png)

## Wasmer CLI のインストール

まず Wasmer CLI をインストールします。

[Install Wasmer](https://docs.wasmer.io/install)

```shell
curl https://get.wasmer.io -sSfL | sh
```

`$HOME/.wasmer` 配下にインストールされ `$HOME/.zshrc` にパスなどが書き込まれますので、新規のシェルを開くか `source ~/.zshrc` で設定を読み込みます。

:::info
すでにインストール済みの場合は、`wasmer self-update` でアップデート可能です。
:::

## CLI から Wasmer Edge へのログイン
wasmer CLI から Wasmer Edge にデプロイするためにログインを実行します。

```shell
wasmer login
```

ブラウザの認証完了ページが開きます。

![wasmer login](https://i.gyazo.com/2f18214e4ce3b38c84b2e5f7082f1efc.png)

ターミナルでも完了メッセージが出力されます。

```
Opening auth link in your default browser: https://wasmer.io/auth/cli?nonce_id*****=&secret=******
Waiting for session... Done!
✅ Login for Wasmer user "kondoumh" saved
```

ログイン状態になっています。

```shell
$ wasmer whoami
logged into registry "https://registry.wasmer.io/graphql" as user "kondoumh"
```

## Rust で書いた HTTP Server をデプロイしてみる
以下のガイドにあるサンプルの HTTP Server をデプロイしてみます。

[Wasmer Edge Quickstart for deploying an HTTP Server](https://docs.wasmer.io/edge/quickstart/http-server)

Rust 環境を最新化します。

```shell
rustup update
```

プロジェクトを作成します。

```shell
cargo new wasmer-hello --bin
```

Cargo.toml に依存ライブラリを追加します。

```log:Cargo.toml
[package]
name = "wasmer-hello"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = { version = "=0.6.9", features = ["tokio", "json"] }
serde = { version = "1.0.160", features = ["derive"] }
tracing = "0.1.37"
tracing-subscriber = { version = "0.3.16", features = ["fmt"] }
tokio = { version = "=1.24.2", default-features = false, features = ["full"] }
parking_lot = { version = "=0.12.1", features = ["nightly"] }
 
[patch.crates-io]
tokio = { git = "https://github.com/wasix-org/tokio.git", branch = "wasix-1.24.2" }
socket2 = { git = "https://github.com/wasix-org/socket2.git", branch = "v0.4.9" }
libc = { git = "https://github.com/wasix-org/libc.git", branch = "master" }
```

WASIX との互換性のためにバージョン固定や、フォークされパッチされたバージョンが指定されています。

次に main.rs にコードを追加します。Rust の Web アプリフレームワーク [axum](https://github.com/tokio-rs/axum) を使っています。

```rust:main.rs
use axum::{routing::get, Router};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    let app = Router::new().route("/", get(handler));

    let port = std::env::var("PORT").unwrap_or("3000".to_string());
    let port = port.parse::<u16>().unwrap_or_else(|_| {
        eprintln!("Invalid port number: {}", port);
        std::process::exit(1);
    });
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    eprintln!("Listening on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn handler() -> &'static str {
    "Hello, Axum ❤️ WASMER!"
}
```

環境変数 `PORT`からポート番号を取得しています。ローカルで確認しやすいよう、デフォルトを3000にしています。Wasmer Edge にデプロイされた場合、`PORT` には80が設定されます。

依存ライブラリの更新、cargo-wasix のインストールを行います。

```shell
cargo update
cargo install cargo-wasix
```

WASIX のバイナリをビルドします。

```shell
cargo wasix build --release
```

ローカルで起動します。wasmer CLI を使用します。

```shell
wasmer run ./target/wasm32-wasmer-wasi/release/wasmer-hello.wasm --net --env PORT=3000
```

これで localhost:3000 にリクエストを送るとメッセージが返ってきます。

```shell
$ curl -X GET localhost:3000
Hello, Axum ❤️ WASMER!
```

次に Wasmer Edge にデプロイするための設定ファイル (wasmer.toml と app.yaml) を追加します。

```log:wasmer.toml
[package]
name = "kondoumh/kondoumh-hello"
version = "0.1.0"
description = "Sample Axum server for Wasmer Edge"
license = "MIT"
wasmer-extra-flags = "--net --enable-threads --enable-bulk-memory"

[[module]]
name = "wasmer-hello"
source = "./target/wasm32-wasmer-wasi/release/wasmer-hello.wasm"
abi = "wasi"

[[command]]
name = "proxy"
module = "wasmer-hello"
runner = "https://webc.org/runner/wasi"
```

```yaml:app.yaml
kind: wasmer.io/App.v0
name: kondoumh-hello
package: kondoumh/kondoumh-hello@
```

:::info
app.yaml については、ガイドのサンプルでは `description` 属性があったのですが、デプロイ時にエラーになったため削除しました。
:::

最後にデプロイです。`wasmer deply` を実行します。

```shell
$ wasmer deploy
Loaded app from: /Users/kondoh/dev/rust-study/wasmer-hello/app.yaml

Publish new version of package 'kondoumh/kondoumh-hello'? yes
Publishing package...
[1/2] ⬆️  Uploading...
[2/2] 📦 Publishing...
🚀 Successfully published package `kondoumh/kondoumh-hello@0.1.0`
Waiting for package to become available......
Package 'kondoumh/kondoumh-hello@0.1.0' published successfully!

Deploying app kondoumh-hello...

 ✅ App kondoumh/kondoumh-hello was successfully deployed!

> App URL: https://kondoumh-hello.wasmer.app
> Versioned URL: https://xxxxxxxx.id.wasmer.app
> Admin dashboard: https://wasmer.io/apps/kondoumh-hello

Waiting for new deployment to become available...
(You can safely stop waiting now with CTRL-C)
.
New version is now reachable at https://kondoumh-hello.wasmer.app
Deployment complete
```

デプロイ成功後、app.yaml にバージョンや app_id が書き込まれました。以下の例では失敗してやり直したため、ビルド番号が上がっています。

```yaml:app.yaml
---
kind: wasmer.io/App.v0
name: kondoumh-hello
package: kondoumh/kondoumh-hello@0.1.1
app_id: da_xxxxxxxxxx
```

Wasmer Deploy のダッシュボードでデプロイされたアプリのメトリクスやログが確認できます。

![dashboard](https://i.gyazo.com/765d35781ac172736aa3e4c30f51a0a1.png)

アプリの URL にリクエストを投げるとメッセージが取得できました。

```shell
$ curl https://xxxxxxxxx.id.wasmer.app 
Hello, Axum ❤️ WASMER!
```

この HTTP Server 以外にも、React の 静的サイト、JS Service Worker、Python Flask Server などのチュートリアルが提供されています。

## Wasmer Edge のアーキテクチャ
以下のドキュメントで Wasmer Edge のアーキテクチャがアーキテクチャが解説されています。

[Architecture of Wasmer Edge](https://docs.wasmer.io/edge/architecture)

分散モノリスと shared nothing が大きな特徴と言えるでしょう。

- 分散モノリス: プラットフォーム全体を実行する全く同じ単一のバイナリが全てのノードに配備される
- shared nothing: どのノードも完全にスタンドアローンで動作可能

Amazon Lambda や Cloudflare Workers との比較が以下のドキュメントに記載されています。

- [Wasmer Edge vs Amazon Lambda](https://docs.wasmer.io/edge/vs/amazon-lambda)
- [Wasmer Edge vs Cloudflare Workers](https://docs.wasmer.io/edge/vs/cloudflare-workers)

## さいごに

現在、多くのエッジ環境がありますが、Wasmer Edge は WASM ベースのユニークなプラットフォームです。今後 Ruby や Go のサポートも予定されており、各プログラミング言語の WASM 対応が進めば選択肢も広がりそうです。

東京にも POP (Point Of Presence) 開設されたので、プロダクションでの使用も視野に入ってきますね。

独自の分散ファイルシステムを使用したステートフルなワークロードのサポートや特定のリージョンだけで稼動させる機能も予定されています。
