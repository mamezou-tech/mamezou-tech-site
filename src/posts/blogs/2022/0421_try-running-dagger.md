---
title: 話題の CI/CD ツール Dagger を体験してみる
author: masahiro-kondo
date: 2022-04-21
tags: [CI/CD, dagger]
---

[Dagger](https://dagger.io/) は、Docker を開発した人たちによるポータブルな CI/CD ツールです。先月末公開されました。

[Introducing Dagger: a new way to create CI/CD pipelines](https://dagger.io/blog/public-launch-announcement)

ポータビリティ実現のためコンテナ環境が前提になっています。

Dagger は DAG (Directed Acyclic Graph)に由来するものと思われますが、CI/CD の文脈で DAG はパイプラインを構成するジョブの依存関係グラフのことです。

Dagger はビルドエンジンとして BuildKit を利用しています。BuildKit は Docker に統合されたツールキットで docker build の高速化・ルートレス化を実現したテクノロジーです。

[GitHub - moby/buildkit: concurrent, cache-efficient, and Dockerfile-agnostic builder toolkit](https://github.com/moby/buildkit)

Dagger は多くの CI/CD ツールや IaC (Infrastructure as Code) ツールで採用されている YAML ではなく、[CUE](https://cuelang.org/) 言語を採用しています。

[GitHub - cue-lang/cue: The new home of the CUE language! Validate and define text-based and dynamic configuration](https://github.com/cue-lang/cue)

CUE 言語(cuelang) はJSON のスーパーセットで YAML/JSON と相互変換でき、人が読み書きしやすい設定記述言語です。汎用プログラミング言語ほどではないですが、データを記述するだけの JSON/YAML と違い、環境変数展開や値のバリデーションなど自身のデータに対する処理を自己記述できます。CI/CD 開発者が CUE に馴染んでくれれば流行るかもしれません。[^1]

[^1]: GitHUb Actions は当初 HCL を採用していましたが、リリースまでに YAML にスイッチしたという歴史があります。

では、[公式ドキュメント](https://docs.dagger.io/getting-started)に従って、ローカルでの環境構築からサンプル動作確認までやってみましょう。

macOS だと HomeBrew でインストールできます。

```shell
brew install dagger/tap/dagger
```

GitHub から dagger のリポジトリを clone して v0.2.7 のタグにスイッチします。

```shell
git clone https://github.com/dagger/dagger
cd dagger
git checkout v0.2.7
```

サンプルをの React 製 TODO アプリをビルドします。Docker Desktop など Docker daemon を予め起動しておく必要があります。

```shell
$ cd pkg/universe.dagger.io/examples/todoapp
$ dagger do build
[✔] actions.build.run.script                          0.1s
[✔] actions.deps                                      0.1s
[✔] client.filesystem."./".read                       0.1s
[✔] actions.test.script                               0.1s
[✔] actions.test                                      0.7s
[✔] actions.build.run                                 5.2s
[✔] actions.build.contents                            0.0s
[✔] client.filesystem."./_build".write                0.1s
```

`_build` 配下にビルドされたアプリが展開されます。TODO アプリは以下のコマンドを叩けばブラウザで動作確認できます。

```shell
open _build/index.html
```

さて、dagger do build を実行してもプロジェクト配下に node_modules は生成されていません。そのかわり moby/buildkit のコンテナが起動していました。

```shell
$ docker ps
CONTAINER ID   IMAGE                   COMMAND       CREATED          STATUS          PORTS     NAMES
6aa120f61e0e   moby/buildkit:v0.10.1   "buildkitd"   44 minutes ago   Up 44 minutes             dagger-buildkitd
```

TODO アプリのプロジェクトルートには、cuelang で記述されたビルドスクリプトが配置されています。以下がその todoapp.cue の全コードです。

```json
package todoapp

import (
	"dagger.io/dagger"
	"dagger.io/dagger/core"
	"universe.dagger.io/alpine"
	"universe.dagger.io/bash"
	"universe.dagger.io/docker"
	"universe.dagger.io/netlify"
)

dagger.#Plan & {
	_nodeModulesMount: "/src/node_modules": {
		dest:     "/src/node_modules"
		type:     "cache"
		contents: core.#CacheDir & {
			id: "todoapp-modules-cache"
		}

	}
	client: {
		filesystem: {
			"./": read: {
				contents: dagger.#FS
				exclude: [
					"README.md",
					"_build",
					"todoapp.cue",
					"node_modules",
				]
			}
			"./_build": write: contents: actions.build.contents.output
		}
		env: {
			APP_NAME:      string
			NETLIFY_TEAM:  string
			NETLIFY_TOKEN: dagger.#Secret
		}
	}
	actions: {
		deps: docker.#Build & {
			steps: [
				alpine.#Build & {
					packages: {
						bash: {}
						yarn: {}
						git: {}
					}
				},
				docker.#Copy & {
					contents: client.filesystem."./".read.contents
					dest:     "/src"
				},
				bash.#Run & {
					workdir: "/src"
					mounts: {
						"/cache/yarn": {
							dest:     "/cache/yarn"
							type:     "cache"
							contents: core.#CacheDir & {
								id: "todoapp-yarn-cache"
							}
						}
						_nodeModulesMount
					}
					script: contents: #"""
						yarn config set cache-folder /cache/yarn
						yarn install
						"""#
				},
			]
		}

		test: bash.#Run & {
			input:   deps.output
			workdir: "/src"
			mounts:  _nodeModulesMount
			script: contents: #"""
				yarn run test
				"""#
		}

		build: {
			run: bash.#Run & {
				input:   test.output
				mounts:  _nodeModulesMount
				workdir: "/src"
				script: contents: #"""
					yarn run build
					"""#
			}

			contents: core.#Subdir & {
				input: run.output.rootfs
				path:  "/src/build"
			}
		}

		deploy: netlify.#Deploy & {
			contents: build.contents.output
			site:     client.env.APP_NAME
			token:    client.env.NETLIFY_TOKEN
			team:     client.env.NETLIFY_TEAM
		}
	}
}
```

モジュール機構もあって、かなり汎用プログラミング言語っぽいコードですね。dagger do で実行されていたのは、`actions:` 配下の `build:` ブロックのようです。記述方法の詳細は公式ドキュメントを参照してください。

[Core Concepts | Dagger](https://docs.dagger.io/category/core-concepts)

dagger do build で起動した moby/buildkit コンテナのファイルシステムにビルド時キャッシュが格納されているようです。

```shell
$ docker container exec -it dagger-buildkitd sh
% ls /var/lib/buildkit/runc-overlayfs/snapshots
metadata.db  snapshots
```

Docker が利用できる環境であれば、ローカルでも CI/CD パイプラインを定義、実行できることがわかりました。

GitHub Actions で利用するには、公式の Action(dagger-for-github) を使用します。

[Dagger for GitHub - GitHub Marketplace](https://github.com/marketplace/actions/dagger-for-github)


GitHub Actions ワークフローで todoapp をビルドする例です。dagger-for-github action の with/cmds でプロジェクトの初期化と更新、ビルドを実行します。

```yaml
name: Dagger sample

on: [workflow_dispatch]

jobs:
  dagger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build
        uses: dagger/dagger-for-github@v2
        with:
          version: 0.2
          workdir: dagger/todoapp
          cmds: |
            project init
            project update
            do build
```

ワークフローの実行ログです。

```log
/opt/hostedtoolcache/dagger/0.2.7/x64/dagger do build
  time="2022-04-21T12:32:52Z" level=warning msg="commandConn.CloseRead: commandconn: failed to wait: signal: terminated"
  12:32PM INF actions.build.run.script._write | computing
  12:32PM INF client.filesystem."./".read | computing
  12:32PM INF actions.deps._dag."0"._dag."0"._op | computing
  12:32PM INF actions.deps._dag."2".script._write | computing
  12:32PM INF actions.test.script._write | computing
  12:32PM INF actions.build.run.script._write | completed    duration=0s
  12:32PM INF actions.test.script._write | completed    duration=100ms
  12:32PM INF actions.deps._dag."2".script._write | completed    duration=100ms
  12:32PM INF client.filesystem."./".read | completed    duration=200ms
  12:32PM INF actions.deps._dag."0"._dag."0"._op | completed    duration=500ms
  12:32PM INF actions.deps._dag."0"._dag."1"._exec | computing
  12:32PM INF actions.deps._dag."0"._dag."1"._exec | #8 0.116 fetch https://dl-cdn.alpinelinux.org/alpine/v3.15/main/x86_64/APKINDEX.tar.gz
  12:32PM INF actions.deps._dag."0"._dag."1"._exec | #8 0.202 fetch https://dl-cdn.alpinelinux.org/alpine/v3.15/community/x86_64/APKINDEX.tar.gz
  12:32PM INF actions.deps._dag."0"._dag."1"._exec | #8 0.462 (1/4) Installing ncurses-terminfo-base (6.3_p20211120-r0)
   :
  12:33PM INF actions.build.run._exec | #14 12.68 The build folder is ready to be deployed.
  12:33PM INF actions.build.run._exec | #14 12.68
  12:33PM INF actions.build.run._exec | #14 12.68 Find out more about deployment here:
  12:33PM INF actions.build.run._exec | #14 12.68
  12:33PM INF actions.build.run._exec | #14 12.68   bit.ly/CRA-deploy
  12:33PM INF actions.build.run._exec | #14 12.68
  12:33PM INF actions.build.run._exec | #14 12.73 Done in 12.40s.
  12:33PM INF client.filesystem."./_build".write | completed    duration=100ms
```

従来の GitHub Actions ワークフローでは React アプリのパイプラインを構築するには、setup-node アクションで Runner の VM をプロビジョニングします。そして npm script でビルドやテストを実行します。つまり利用する言語やフレームワークごとにシェルや Action を駆使して構築するわけです。dagger-for-github を使うとそれらのコードは CUE 言語ファイルに隠蔽され、コンテナで実行されます。GitHub Actions ワークフローは単なる起動シェルのような位置付けになっています。これは GitLab や Jenkins で実行する場合も同様です。詳細はドキュメントを参照してください。

[Integrating with your CI environment | Dagger](https://docs.dagger.io/1201/ci-environment)

以上のように、Dagger は CI/CD パイプラインを CUE 言語で記述、BuildKit で実行することで、ポータブルな CI/CD 開発実行環境を実現しています。実際にパイプラインを別のプラットフォームに移行する必要性がどれぐらいあるかはわかりませんし、書き換えが1回で済むなら移行先のお作法に従ってパイプラインを組み直す方がよいでしょう。また、コンテナの中でコンテナイメージをビルド・実行するようないわゆる Docker in Docker な処理を行うパイプラインにも不向きでしょう。GitHub Actions の Matrix ビルドのような便利機能も利用できません。ただ、ローカルで動かせるので、パイプラインの開発やデバッグが簡単になるメリットは無視できません。

正式リリースまでにどのような機能追加やブラッシュアップが行われるかウォッチしておきたいところです。
