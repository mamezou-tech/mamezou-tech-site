---
title: Docker＋Wasm で WASM をコンテナとして実行する
author: masahiro-kondo
date: 2023-01-26
tags: [WASM]
---

昨年10月に Docker+Wasm がテクニカルプレビューとして発表されました。WebAssembly ランタイムをターゲットとしてビルドされた WASM バイナリーを OCI 互換の環境で実行できるようにするものです。

[Introducing the Docker+Wasm Technical Preview | Docker](https://www.docker.com/blog/docker-wasm-technical-preview/)

ブログから、Docker+Wasm の実行イメージを引用します。

![containerd-wasm-shim](https://i.gyazo.com/5392f8cb4f7350da95154a2c21df67b8.webp)

Docker Desktop では OCI ランタイム containerd を使用してコンテナイメージを管理・実行します。コンテナは runc などのさらに低レベルなライタイムにより実行されます。Docker+Wasm はこの runc にあたるレイヤーに [WasmEdge](https://wasmedge.org/) を適用して WASM を実行します(図の右下)。Docker Desktop では containerd のサブプロセスである containerd-shim を介して runc の機能を利用します。WasmEdge と containerd を仲介するために containerd-wasm-shim が開発されました。

:::info
[WasmEdge](https://wasmedge.org/) は WASM をエッジ環境で実行するためのランタイムです。
:::

## Docker+Wasm を利用するための設定
Apple Silicon 用 Docker Desktop 4.16.2 で試しました。

:::info
Docker+Wasm はまだベータ版であり、プロダクションには適用しないよう注意書きされています。

[Docker+Wasm (Beta)](https://docs.docker.com/desktop/wasm/)
:::

Docker Desktop では containerd によるイメージ管理もまだベータ版であり、Docker+Wasm の機能を利用するには、containerd image store の機能を有効化する必要があります。

[containerd image store (Beta)](https://docs.docker.com/desktop/containerd/)

Docker Desktop の Settings > Features in development の Beta features で、`Use containerd for pulling and storing images` のチェックボックスをチェックして、`Apply & restart` で 反映します。

![Use containerd for puling and storing images](https://i.gyazo.com/c050fcc837684f43590606580a3e9ef3.png)

## WASM を docker run で実行する

公式ドキュメントにあるコマンドをで サンプルの WASM アプリを実行してみます。`--runtime` オプションと `--platform` オプションで、それぞれ、`io.containerd.wasmedge.v1` と `wasi/wasm32` を指定しています。

```shell
docker run -dp 8080:8080 \
  --name=wasm-example \
  --runtime=io.containerd.wasmedge.v1 \
  --platform=wasi/wasm32 \
  michaelirwin244/wasm-example
```

:::info
WASI は Web 標準である WASM をブラウザ外で利用するための標準です。WASI のランタイムについては以下の記事でも取り上げています。

- [スタンドアローンおよび言語組み込みの WebAssembly ランタイム Wasmer](https://developer.mamezou-tech.com/blogs/2022/03/21/wasmer/)
- [Wasmtime が Production Ready に](https://developer.mamezou-tech.com/blogs/2022/10/02/wasmtime_v1/)
:::

実行すると、以下のようにイメージが取得され実行されました。

```
Unable to find image 'michaelirwin244/wasm-example:latest' locally
2a58923a21cb: Download complete 
130eeaf02640: Download complete 
e049f00c5289: Download complete 
f74ee7cf8049b69ef1279b8eab95e00366a11397bd26988f67ed6cea068e5dae
```

`docker ps` で確認するとポート8080で WASM のバイナリがサーバーとして起動しています。

```shell
docker ps
```

```
CONTAINER ID   IMAGE                          COMMAND              CREATED          STATUS          PORTS                    NAMES
f74ee7cf8049   michaelirwin244/wasm-example   "hello_world.wasm"   11 seconds ago   Up 10 seconds   0.0.0.0:8080->8080/tcp   wasm-example
```

コンテナイメージを確認すると 1.57MB と通常のイメージと比べると非常に小さいです。

```shell
docker image ls
```
```
REPOSITORY                     TAG       IMAGE ID       CREATED         SIZE
michaelirwin244/wasm-example   latest    2a58923a21cb   2 minutes ago   1.57MB
```

ブラウザで localhost:8080 に接続するとちゃんと動作しています。

![show localhost:8080](https://i.gyazo.com/1e296671b0d60f794aab6f44a7c5408b.png)

このデモで使用されたのは、Docker Hub に push されている以下のイメージです。

[michaelirwin244/wasm-example - Docker image | Docker Hub](https://hub.docker.com/r/michaelirwin244/wasm-example)

ソースコードは以下のリポジトリにあります。Rust でシンプルな Web サーバーが実装されています。

[GitHub - mikesir87/wasm-example](https://github.com/mikesir87/wasm-example)

Dockerfile を見ると、Rust から WASM をビルドする部分と、scratch イメージに ビルド済みの WASM を COPY して最終的なイメージを作る部分からなるマルチステージビルドになっています。

```dockerfile
# WASM ビルド
FROM --platform=$BUILDPLATFORM rust:1.64 AS buildbase
## ビルドステップ省略
RUN /root/.wasmedge/bin/wasmedgec target/wasm32-wasi/release/hello_world.wasm hello_world.wasm

# 最終的なイメージのビルド
FROM scratch
ENTRYPOINT [ "hello_world.wasm" ]
COPY --link --from=build /src/hello_world.wasm /hello_world.wasm
```

scratch イメージに WASM のバイナリファイルが置いてあるだけなので非常に小さいサイズのイメージになっています。

Docker+Wasm ではこの WASM だけのイメージから WASM を直接ロードし WasmEdge で実行します。従来の Docker 環境で (Wasmtime などの)WASM ランタイム入りのコンテナを実行するより、少ないオーバーヘッドで高速に実行できるということなのでしょう。

## docker-compose で動かす

docker-compose で動かす場合は以下のように platform と runtime を指定します。

- docker-compose.yml
```yaml
services:
  app:
    image: michaelirwin244/wasm-example
    platform: wasi/wasm32
    runtime: io.containerd.wasmedge.v1
    ports:
      - 8080:8080
```

docker-compose で起動します。

```shell
docker-compose up -d
```

```
[+] Running 1/1
 ⠿ Container docker-wasm-app-1  Started 
```

起動されたアプリケーションを見てみます。docker run と同様に起動しています。

```shell
docker-compose ps
```

```
NAME                IMAGE                          COMMAND              SERVICE             CREATED              STATUS              PORTS
docker-wasm-app-1   michaelirwin244/wasm-example   "hello_world.wasm"   app                 About a minute ago   Up 7 seconds        0.0.0.0:8080->8080/tcp
```

## 通常のコンテナイメージとの相互運用
公式ドキュメントでは、WASM と通常のコンテナが混在して実行できるサンプルも紹介されています。

[GitHub - second-state/microservice-rust-mysql: A template project for building a database-driven microservice in Rust and run it in the WasmEdge sandbox.](https://github.com/second-state/microservice-rust-mysql)

このサンプルは、MySQL にデータを永続化する Web アプリケーションです。以下の3つのコンポーネントから構成されています。

- MariaDB のコンテナイメージ
- HTML/JS のアセットを配信するための NGINX のコンテナイメージ
- Rust で書かれ WASI/WASM でビルドされたマイクロサービス

マイクロサービス用の Dockerfile はやはり scratch イメージに WASM をコピーしただけのものです。

docker-compose.yml は以下のようになっています。NGINX は ports と volumes を指定。WASM のマイクロサービス(demo-microservice)は、platform と ruintime を指定して Dockerfile をビルドするようになっています。それ以外は通常のアプリと同様です。

```yaml
services:
  client:
    image: nginx:alpine
    ports:
      - 8090:80
    volumes:
      - ./client:/usr/share/nginx/html
  server:
    image: demo-microservice
    platform: wasi/wasm
    build:
      context: .
    ports:
      - 8080:8080
    environment:
      DATABASE_URL: mysql://root:whalehello@db:3306/mysql
      RUST_BACKTRACE: full
    restart: unless-stopped
    runtime: io.containerd.wasmedge.v1
  db:
    image: mariadb:10.9
    environment:
      MYSQL_ROOT_PASSWORD: whalehello
```

docker-compose up すると Rust のマイクロサービスのビルドとイメージ作成・実行、及び、NGINX / MariaDB のイメージの pull・実行が行われます。

localhost:8090 に接続するとデモアプリ(何かの発注画面)が利用できるようになっています。登録した注文はDBに格納されます。

![デモアプリ画面](https://i.gyazo.com/0519d13f2bebc09577dc548c9268a0fa.png)

## 最後に
以上、Docker Desktop に統合された WASM 実行環境 Docker+Wasm を動かしてみました。WASM ランタイム入りのイメージを用意することなく直接 Docker が WASM を実行してくれるので、オーバーヘッドもイメージサイズも小さく通常のコンテナとの相互運用も簡単でした。

Kuberenetes の場合、WASM のワークロードを直接実行できる [Krustlet](https://krustlet.dev/) という OSS が開発されています。これは、kubelet に相当する実装で、WASM を Pod として実行するソフトウェアです。

このように、コンテナの世界でも WASM が軽量なワークロードとして、既存のコンテナと共に実行されるのが普通になっていくのではないかと思いました。
