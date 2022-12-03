---
title: AWSが公開したFinchでコンテナの実行/ビルドをする
author: noboru-kudo
date: 2022-12-05
tags: [advent2022, aws, container]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---

これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第5日目の記事です。

今回はAWSが2022/11/22に公開したコンテナ開発ツール[Finch](https://github.com/runfinch/finch)を使ってみた感想を書きたいと思います(ググるとすでに結構な数のブログが出てきますが)。

- [Introducing Finch: An Open Source Client for Container Development](https://aws.amazon.com/jp/blogs/opensource/introducing-finch-an-open-source-client-for-container-development/)
- [(邦訳)コンテナ開発用のオープンソースクライアント「Finch」のご紹介](https://aws.amazon.com/jp/blogs/news/introducing-finch-an-open-source-client-for-container-development/)

Finchはコンテナのビルドから実行までコンテナを利用した開発ワークフローをトータルでサポートするDocker Desktopの代替ツールです。OSSとして公開されており、無償で使うことができます。
現時点では、Mac(Intel/M1アーキテクチャ)のみをサポートしていますが、今後はWindows／Linuxにも対応する予定のようです。

内部的には関連する各種OSSを利用しており、Finchはこれらをオールインワンで管理するツールの位置づけのようです。

- コンテナランタイム: [containerd](https://containerd.io/)
- CLI: [nerdctl](https://github.com/containerd/nerdctl)
- 仮想マシン: [Lima](https://github.com/lima-vm/lima)
- イメージビルド: [BuildKit](https://github.com/moby/buildkit)

なお、現状ではDocker DesktopのダッシュボードようなGUI[^1]やKubernetes拡張機能[^2]は提供していません。

[^1]: とはいえ、Docker DesktopでGUIを使っている方をあまり見かけたことがありませんが。
[^2]: Kubernetesを使う場合は、minikubeやRancher Desktop等を検討すると良いかと思います。

[[TOC]]

## Finchをインストールする

現時点でFinchのインストールは、GitHubリリースページよりパッケージをダウンロードして展開します。

- [GitHub - Finch release](https://github.com/runfinch/finch/releases)

使っているMacのCPUアーキテクチャによってダウンロード対象は異なります。

- Intel: Finch-v<x.x.x>-x86_64.pkg
- Apple Silicon M1: Finch-v<x.x.x>-aarch64.pkg

ここでは、Intel Mac(macOS Monterey)に現時点で最新のv0.1.0をインストールしました。

```shell
finch version
> finch version v0.1.0
```

## 仮想マシンのセットアップ

まず、コンテナを実行する仮想マシンを初期化して起動します。

Finchの設定は`${HOME}/.finch/finch.yaml`に格納されます。インストール直後は存在しませんが、何かしらのfinchコマンドを実行すると作成されます。

ここでは以下のようにファイルが作成されていました。

```yaml
cpus: 3
memory: 8GiB
```

現時点ではこの2つのみです。ここではコンテナランタイムのLima仮想マシンに割り当てるCPUコア/メモリサイズです。
初期値はホストOSの空きスペックを考慮して動的に決定されるようです。もちろん必要に応じて変更可能です。

それでは、まず仮想マシンを初期化・実行します。

```shell
finch vm init

> INFO[0000] Initializing and starting Finch virtual machine...
> INFO[0097] Finch virtual machine started successfully
```

少し時間がかかりますが、無事成功しました。
ここでは仮想マシンの初期化とともに開始処理も実行されました。

ここまで実施すると、コンテナの実行やビルドが可能な状態となります。

:::column:仮想マシンを停止・削除する
作成した仮想マシンを停止・削除する場合は以下のコマンドを実行します。

```shell
# 停止
finch vm stop
# 削除
finch vm remove
```

停止のみの場合は`finch vm start`で再開できます。
:::

## コンテナイメージを実行する

ここではDockerHubに公開されている[nginxの公式イメージ](https://hub.docker.com/_/nginx)を実行してみます。
また、Nginxで公開するコンテンツはローカル環境側に配置したものをボリュームとしてマウントします。

```shell
# カレントディレクトリのcontents配下に任意のindex.htmlを配置
finch run --name nginx -p 8080:80 -d \
  -v $(pwd)/contents:/usr/share/nginx/html:ro nginx:latest
> docker.io/library/nginx:latest:                                                   resolved       |++++++++++++++++++++++++++++++++++++++| 
> index-sha256:e209ac2f37c70c1e0e9873a5f7231e91dcd83fdf1178d8ed36c2ec09974210ba:    done           |++++++++++++++++++++++++++++++++++++++| 
> manifest-sha256:6ad8394ad31b269b563566998fd80a8f259e8decf16e807f8310ecc10c687385: done           |++++++++++++++++++++++++++++++++++++++| 
> config-sha256:88736fe827391462a4db99252117f136b2b25d1d31719006326a437bb40cb12d:   done           |++++++++++++++++++++++++++++++++++++++| 
> layer-sha256:90cfefba34d7c6a81fe1dfbb4a579998c65ff49092052967f63ddc48f6be85d9:    done           |++++++++++++++++++++++++++++++++++++++| 
> (省略)
> elapsed: 18.3s                                                                    total:  54.2 M (3.0 MiB/s)                                       
> df4f0dc64496cbae501ff5cb5f4542a3410dd36ba808e17bc5bcd9664613a878
```

実行はDocker CLIとほとんど変わりません。違いはコマンドがdockerではなくfinchに変わったくらいです。

もちろんDocker CLI同様にimages/ps/start/stop/exec/logs等の利用頻度の高いコマンドもサポートしています。
この辺りはDocker CLI互換のnerdctlを内部的に利用していることからくるのでしょうか。Docker CLIを使っている方であればFinchの使い方で迷うことはなさそうです。

実行中のコンテナを確認するのもいつもの通りです。

```shell
finch ps
```
```
CONTAINER ID    IMAGE                             COMMAND                   CREATED           STATUS    PORTS                   NAMES
df4f0dc64496    docker.io/library/nginx:latest    "/docker-entrypoint.…"    17 minutes ago    Up        0.0.0.0:8080->80/tcp    nginx
```

上記はローカル環境の8080ポートにポートフォワードしていますので、以下のようにアクセスできます。

```shell
curl localhost:8080
```
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Finch</title>
</head>
<body>
  <h1>Hello Finch!!</h1>
</body>
</html>
```

仮想マシンを意識せずにDocker Desktopを使っているのと同じようにlocalhostでコンテナにアクセスできました。
ここではLimaの自動ポートフォワードが活用されているようです。

:::info
現在ではM1 Mac(ARMアーキテクチャ)が主流となりつつありますが、筆者のようにIntel Macを使っている開発者もまだ相当数いるでしょう。
Finchでは`--platform`を指定することで、指定したアーキテクチャ上でコンテナを実行できるようになっています。

以下はARMアーキテクチャでビルドしたコンテナイメージをIntel Macで実行する例です。

```shell
# Intelの場合は`amd64`を指定
finch run --name arm-image --platform arm64 -d arm-container-image:v1
```

この指定はビルド(`finch build`)でも同様で、CPUアーキテクチャにあったイメージを作成できるようになっています。
:::

## Composeで複数コンテナを実行する

Finchでは、内部的に使用しているnerdctlでサポートするDocker Composeにも対応しています。
ここではnerdctlのComposeサンプルとしてGitHubに公開されているものをベースにdocker-compose.ymlを作成しました。

- [GitHub nerdctl - compose example](https://github.com/containerd/nerdctl/blob/main/examples/compose-wordpress/docker-compose.yaml)

```yaml
version: '3.7'
services:
  wordpress:
    image: wordpress:5.7
    restart: always
    ports:
      - 8080:80
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: exampleuser
      WORDPRESS_DB_PASSWORD: examplepass
      WORDPRESS_DB_NAME: exampledb
    volumes:
      - wordpress:/var/www/html
  db:
    image: mariadb:10.5
    restart: always
    environment:
      MYSQL_DATABASE: exampledb
      MYSQL_USER: exampleuser
      MYSQL_PASSWORD: examplepass
      MYSQL_RANDOM_ROOT_PASSWORD: '1'
    volumes:
      - db:/var/lib/mysql

volumes:
  wordpress:
  db:
```

WordPressとMariaDBのコンテナを起動するDocker Composeのファイルです。
起動方法もDocker Composeと同じです。

```shell
finch compose up -d
```

初回はコンテナイメージのPULLに時間がかかります。
実行が終わるとブラウザから`localhost:8080`にアクセスすればWordPressのサイトが表示されます。

![](https://i.gyazo.com/53680d0cbfdf6b70813fe45812997afb.png)

まとめてコンテナを終了する場合もDocker Composeを使っていたときと同じです。

```shell
finch compose down
```

## コンテナイメージをビルド・公開する

最後に、自作でコンテナイメージを作成してDockerHubにプッシュしてみます。
以前記事作成で使用したGoのHTTPサーバーとDockerfileを使います。

- HTTPサーバー
```go
package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello Finch app!!!")
	})
	http.ListenAndServe(":8000", nil)
}
```
- Dockerfile
```dockerfile
FROM golang:1.16 as builder
WORKDIR /src
COPY main.go /src
RUN CGO_ENABLED=0 GOOS=linux go build -o sample-app main.go

FROM scratch
COPY --from=builder /src/sample-app /sample-app
EXPOSE 8000
CMD ["/sample-app"]
```

コンテナイメージのビルドにはマルチステージビルドを使ってイメージサイズを小さくするようにしています。
ビルドもDocker CLIと同じです。

```shell
finch build -t sample-app:v1 .

> [+] Building 60.9s (10/10) FINISHED                                                                                                                                                                                                     
> => [internal] load build definition from Dockerfile                                                                                                                                                                               0.2s
> => => transferring dockerfile: 252B                                                                                                                                                                                               0.0s
> => [internal] load .dockerignore                                                                                                                                                                                                  0.2s
> => => transferring context: 2B                                                                                                                                                                                                    0.0s
> => [internal] load metadata for docker.io/library/golang:1.16                                                                                                                                                                     2.3s
> => [builder 1/4] FROM docker.io/library/golang:1.16@sha256:5f6a4662de3efc6d6bb812d02e9de3d8698eea16b8eb7281f03e6f3e8383018e                                                                                                      46.3s
> => => resolve docker.io/library/golang:1.16@sha256:5f6a4662de3efc6d6bb812d02e9de3d8698eea16b8eb7281f03e6f3e8383018e
> (省略)
>  => [builder 2/4] WORKDIR /src                                                                                                                                                                                                     0.1s
>  => [builder 3/4] COPY main.go /src                                                                                                                                                                                                0.1s
>  => [builder 4/4] RUN CGO_ENABLED=0 GOOS=linux go build -o sample-app main.go                                                                                                                                                      9.3s
>  => [stage-1 1/1] COPY --from=builder /src/sample-app /sample-app                                                                                                                                                                  0.1s
>  => exporting to oci image format                                                                                                                                                                                                  2.3s
>  => => exporting layers                                                                                                                                                                                                            1.2s
>  => => exporting manifest sha256:41ce2a3201e448d7ce48c91cf4735490c497e2bd7e268832cdda2cde5dcde94e                                                                                                                                  0.1s
>  => => exporting config sha256:2a21df434ac17596e9217616ee9fcbed79542294365165dd73221e207ae8f4e9                                                                                                                                    0.1s
>  => => sending tarball                                                                                                                                                                                                             0.8s
> unpacking docker.io/library/sample-app:v1 (sha256:41ce2a3201e448d7ce48c91cf4735490c497e2bd7e268832cdda2cde5dcde94e)...
> Loaded image: docker.io/library/sample-app:v1
```

ここではFinchはBuildKitを使ってイメージのビルドを実行しています。
BuildKitは現在Docker Desktopでもデフォルトで使われるようになっていますので、見慣れた出力の方も多いかと思います。

作成したイメージを確認します。

```shell
finch images
> REPOSITORY    TAG       IMAGE ID        CREATED           PLATFORM          SIZE         BLOB SIZE
> sample-app    v1        41ce2a3201e4    9 minutes ago     linux/amd64       5.8 MiB      3.1 MiB
```

次に、このイメージをDockerHubにイメージをプッシュして公開してみます。

```shell
DOCKER_HUB_USER_NAME=<docker-hub-user-name>
finch tag sample-app:v1 ${DOCKER_HUB_USER_NAME}/sample-app:v1
finch login # DockerHubにログイン
finch push ${DOCKER_HUB_USER_NAME}/sample-app:v1
> INFO[0000] pushing as a reduced-platform image (application/vnd.docker.distribution.manifest.v2+json, sha256:41ce2a3201e448d7ce48c91cf4735490c497e2bd7e268832cdda2cde5dcde94e) 
> manifest-sha256:41ce2a3201e448d7ce48c91cf4735490c497e2bd7e268832cdda2cde5dcde94e: done           |++++++++++++++++++++++++++++++++++++++| 
> config-sha256:2a21df434ac17596e9217616ee9fcbed79542294365165dd73221e207ae8f4e9:   done           |++++++++++++++++++++++++++++++++++++++| 
> elapsed: 7.0 s                                                                    total:  1.6 Ki (229.0 B/s) 
```

コンテナレジストリへのプッシュも、Docker Desktop利用時と全く変わりませんね。
最後に、ここでDockerHubにプッシュしたイメージをローカル環境のFinchから実行してみます。

```shell
# あらかじめローカルイメージを削除しておく
finch rmi ${DOCKER_HUB_USER_NAME}/sample-app:v1

# イメージPULL&実行
finch run --name sample-app -p 8000:8000 -d ${DOCKER_HUB_USER_NAME}/sample-app:v1
> docker.io/xxxxxx/sample-app:v1:                                                   resolved       |++++++++++++++++++++++++++++++++++++++| 
> manifest-sha256:41ce2a3201e448d7ce48c91cf4735490c497e2bd7e268832cdda2cde5dcde94e: exists         |++++++++++++++++++++++++++++++++++++++| 
> config-sha256:2a21df434ac17596e9217616ee9fcbed79542294365165dd73221e207ae8f4e9:   exists         |++++++++++++++++++++++++++++++++++++++| 
> elapsed: 1.5 s                                                                    total:   0.0 B (0.0 B/s)                                         
> c8e647d1a1bde4baf406cdf0297b3fbb95b5ff8813acd9fe226fbba346947227

# APIアクセス
curl localhost:8000
> Hello Finch app!!!
```

いつもと同じワークフローで、イメージのビルドから公開ができていることが分かります。

## 最後に
Finchを使ってDocker Desktopでいつもやっていたことをしてみました。ドキュメントが不要なくらいほとんど違和感なく操作できました。
コンテナを使いたいけど、Kubernetesを使うほどではないという場合は利用を検討すると良さそうです（現時点ではMacのみですが）。

AWSがこのようなOSSを公開するのは少し意外な感じがしますが、今後AWSサービスでの活用も視野に入っているのかもしれませんね。

Finch自体まだ公開されたばかりです。現状は内包している各ツールのラッパーのようなイメージです[^3]。
今後の機能拡張・エコシステムに期待したいところですね。

[^3]: こちらの記事が参考になります→[Finch の内部実装を見てみた。](https://qiita.com/YmBIgo/items/96218278f40ec0f3d83b)。私もソースコード眺めてみましたが同じ印象でした。