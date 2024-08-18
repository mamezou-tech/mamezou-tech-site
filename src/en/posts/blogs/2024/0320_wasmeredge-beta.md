---
title: Trying Out Wasmer Edge (Beta) with a New Tokyo POP
author: masahiro-kondo
date: 2024-03-20T00:00:00.000Z
tags: [wasmer, WASM]
image: true
translate: true
---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/03/20/wasmeredge-beta/).
:::



## Introduction

Wasmer announced the GA of Wasmer Edge (Beta) and the addition of new locations such as Tokyo.

[Wasmer Edge (Beta) is now Generally Available · Blog · Wasmer](https://wasmer.io/posts/wasmer-edge-beta-is-ga)

Wasmer Edge is a cloud platform built using the WASM (Webassembly) runtime. It is being developed with the aim of being simpler and more secure than container technologies represented by Kubernetes, and to provide a platform with scalability and resilience.

You can write apps in C / Rust / JavaScript / Python / WASM and any other programming language that supports WASM / WASI(X)[^1].

[^1]: WASI is a specification for running WASM outside of browsers, and WASIX is an extension specification to make WASI compatible with POSIX.

In the future, an OSS version will be provided, making it possible to operate on-premises.

:::info
For more information about Wasmer, see the following articles:

- [Standalone and Embedded WebAssembly Runtime Wasmer](/blogs/2022/03/21/wasmer/)
- [Trying out Wasmer 3.0's Binary Generation Feature from WASM for Various Platforms](/blogs/2022/12/13/wasmer-v3/)
:::

## Creating an Account on Wasmer Edge

You can sign up for Wasmer Edge with a GitHub account, among other options. I created an account 9 months ago.

![Dashboard](https://i.gyazo.com/f330e1b3dbbde16e62de09b3bef8fd98.png)

## Installing Wasmer CLI

First, install the Wasmer CLI.

[Install Wasmer](https://docs.wasmer.io/install)

```shell
curl https://get.wasmer.io -sSfL | sh
```

It is installed under `$HOME/.wasmer`, and the path is written in `$HOME/.zshrc`, so open a new shell or run `source ~/.zshrc` to load the settings.

:::info
If you have already installed it, you can update it with `wasmer self-update`.
:::

## Logging into Wasmer Edge from the CLI

Log into Wasmer Edge for deployment from the wasmer CLI.

```shell
wasmer login
```

The authentication completion page opens in your browser.

![wasmer login](https://i.gyazo.com/2f18214e4ce3b38c84b2e5f7082f1efc.png)

A completion message is also output in the terminal.

```
Opening auth link in your default browser: https://wasmer.io/auth/cli?nonce_id*****=&secret=******
Waiting for session... Done!
✅ Login for Wasmer user "kondoumh" saved
```

You are now logged in.

```shell
$ wasmer whoami
logged into registry "https://registry.wasmer.io/graphql" as user "kondoumh"
```

## Deploying a Rust-written HTTP Server

Let's deploy the sample HTTP Server found in the following guide.

[Wasmer Edge Quickstart for deploying an HTTP Server](https://docs.wasmer.io/edge/quickstart/http-server)

Update the Rust environment.

```shell
rustup update
```

Create a project.

```shell
cargo new wasmer-hello --bin
```

Add dependencies to Cargo.toml.

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

Versions are fixed for compatibility with WASIX, and forked, patched versions are specified.

Next, add code to main.rs. It uses the Rust web app framework [axum](https://github.com/tokio-rs/axum).

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

The port number is obtained from the environment variable `PORT`. The default is set to 3000 for easy local verification. When deployed on Wasmer Edge, `PORT` will be set to 80.

Update dependencies and install cargo-wasix.

```shell
cargo update
cargo install cargo-wasix
```

Build the WASIX binary.

```shell
cargo wasix build --release
```

Launch locally using the wasmer CLI.

```shell
wasmer run ./target/wasm32-wasmer-wasi/release/wasmer-hello.wasm --net --env PORT=3000
```

Sending a request to localhost:3000 will return a message.

```shell
$ curl -X GET localhost:3000
Hello, Axum ❤️ WASMER!
```

Next, add the configuration files (wasmer.toml and app.yaml) for deploying to Wasmer Edge.

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
Regarding app.yaml, the guide's sample included a `description` attribute, but it caused an error during deployment, so it was removed.
:::

Finally, deploy with `wasmer deploy`.

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

After successful deployment, versions and app_id were written to app.yaml. In the example below, the build number has increased due to a failure and retry.

```yaml:app.yaml
---
kind: wasmer.io/App.v0
name: kondoumh-hello
package: kondoumh/kondoumh-hello@0.1.1
app_id: da_xxxxxxxxxx
```

The Wasmer Deploy dashboard allows you to view metrics and logs of the deployed app.

![dashboard](https://i.gyazo.com/765d35781ac172736aa3e4c30f51a0a1.png)

Sending a request to the app's URL retrieves the message.

```shell
$ curl https://xxxxxxxxx.id.wasmer.app 
Hello, Axum ❤️ WASMER!
```

In addition to this HTTP Server, tutorials for React static sites, JS Service Worker, Python Flask Server, and more are provided.

## Architecture of Wasmer Edge

The architecture of Wasmer Edge is explained in the following document.

[Architecture of Wasmer Edge](https://docs.wasmer.io/edge/architecture)

Distributed monolith and shared nothing are major features.

- Distributed monolith: The same single binary that runs the entire platform is deployed on all nodes.
- Shared nothing: Each node can operate completely standalone.

Comparisons with Amazon Lambda and Cloudflare Workers are documented below.

- [Wasmer Edge vs Amazon Lambda](https://docs.wasmer.io/edge/vs/amazon-lambda)
- [Wasmer Edge vs Cloudflare Workers](https://docs.wasmer.io/edge/vs/cloudflare-workers)

## Conclusion

Currently, there are many edge environments, but Wasmer Edge is a unique platform based on WASM. Support for Ruby and Go is also planned, and as support for WASM progresses in various programming languages, the options will expand.

With the opening of a POP (Point Of Presence) in Tokyo, its use in production is also coming into view.

Support for stateful workloads using a proprietary distributed file system and the ability to operate in specific regions only is also planned.
