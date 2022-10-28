---
title: Go で CI/CD パイプラインを書ける Dagger Go SDK
author: masahiro-kondo
date: 2022-10-28
tags: [CI/CD, dagger]
---

4月に「[話題の CI/CD ツール Dagger を体験してみる](/blogs/2022/04/21/try-running-dagger/)」という記事で、コンテナベースのポータブルな CI/CD ツール Dagger を紹介しました。YAML より少しリッチな CUE 言語(cuelang) で記述し、コンテナ環境で実行するため CI 環境だけでなく手元でも動作確認できるユニークなツールでした。

先日、Dagger から Go 言語による SDK が公開されました。Go でパイプラインを記述できます。

[Your CI pipelines should be code: introducing the Dagger Go SDK](https://dagger.io/blog/go-sdk)

ドキュメントはこちらです。

[Dagger Go SDK | Dagger](https://docs.dagger.io/sdk/go)

さっそく動かしてみましょう。

[[TOC]]

## プロジェクトの作成
Go 1.19 と Docker Desktop for macOS で試しました。公式ドキュメントがステップ・バイ・ステップで書かれているので迷うところはないでしょう。

[Get Started with the Dagger Go SDK | Dagger](https://docs.dagger.io/sdk/go/959738/get-started)

パイプラインのプロジェクトを作成します。通常の Go Modules を作成する手順です。

```shell
mkdir multibuild
cd multibuild
go mod init multibuild
```

プロジェクトに Dagger Go SDK の依存を追加します。

```shell
go get dagger.io/dagger@latest
```

現状、SDK をインストールした上で docker の Module を replace で置き換える必要があります。

```shell
go mod edit -replace github.com/docker/docker=github.com/docker/docker@v20.10.3-0.20220414164044-61404de7df1a+incompatible
```

:::info
replace は Go Module をローカルで置き換える際に使う設定です。現在 Dagger の依存モジュールで replace を使用しているものがあるため必要なワークアラウンドのようです。go.mod ファイルは以下のようになります。

```
module multibuild

go 1.19

require dagger.io/dagger v0.3.1

require (
	github.com/Khan/genqlient v0.5.0 // indirect
	github.com/Microsoft/go-winio v0.5.2 // indirect
	// 中略
)
replace github.com/docker/docker => github.com/docker/docker v20.10.3-0.20220414164044-61404de7df1a+incompatible
```
:::

## シンプルなパイプライン
あとは main.go ファイルを作成してパイプラインの処理を書いていきます。リモートリポジトリ(Go のプロジェクト)を checkout しコンテナ内でビルド、ホストマシンの指定パスに成果物のバイナリファイルをコピーするパイプラインです。

```go
package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"dagger.io/dagger"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("must pass in a git repo to build")
		os.Exit(1)
	}
	repo := os.Args[1]
	if err := build(repo); err != nil {
		fmt.Println(err)
	}
}

func build(repoUrl string) error {
	fmt.Printf("Building %s\n", repoUrl)

	// 1. Get a context
	ctx := context.Background()
	// 2. Initialize dagger client
	client, err := dagger.Connect(ctx)
	if err != nil {
		return err
	}
	defer client.Close()
	// 3. Clone the repo using Dagger
	repo := client.Git(repoUrl)
	src, err := repo.Branch("main").Tree().ID(ctx)
	if err != nil {
		return err
	}
	// 4. Load the golang image
	golang := client.Container().From("golang:latest")
	// 5. Mount the cloned repo to the golang image
	golang = golang.WithMountedDirectory("src", src).WithWorkdir("src")
	// 6. Create the output path on the host for the build
	workdir := client.Host().Workdir()
	path := "build/"
	outpath := filepath.Join(".", path)
	err = os.MkdirAll(outpath, os.ModePerm)
	if err != nil {
		return err
	}
	// 7. Do the go build
	golang = golang.Exec(dagger.ContainerExecOpts{
		Args: []string{"go", "build", "-o", "build/"},
	})

	// 8. Get build output from builder
	output, err := golang.Directory(path).ID(ctx)
	if err != nil {
		return err
	}

	// 9. Write the build output to the host
	_, err = workdir.Write(ctx, output, dagger.HostDirectoryWriteOpts{Path: path})
	if err != nil {
		return err
	}
	return nil
}
```
コードとコメントを追っていけばなんとなく読めると思いますが、build 関数は以下の9ステップからなります。

1. Go 標準の Context を生成
1. Dagger のクライアントを生成
1. 指定されたリポジトリを git clone
1. Go のコンテナをロード (docker run 相当)
1. チェックアウトしたリポジトリをコンテナにマウント
1. ホスト側にバイナリ出力先のディレクトリを作成
1. ビルドを実行
1. ビルド成果物の取り出し
1. ビルド成果物をホストの出力先にコピー

3-8 のステップが Daggar SDK の機能を使っている部分です。

go mod tidy で go.sum ファイルを生成してからビルドします。

```shell
go mod tidy
go build
```

ビルドしてできる実行モジュール multibuild を対象のリポジトリを指定して実行します。事前に Docker Desktop は起動しておく必要があります。

```shell
./multibuild https://github.com/kpenfound/greetings-api.git
```

終了したらプロジェクトの build 配下にバイナリが生成されていることを確認します。

```
build
└── greetings-api
```

## Matix ビルド
１つのパイプラインで OS(Linux / macOS)、プロセッサアーキテクチャ(Intel / Arm) それぞれのバイナリを生成するような、いわゆる Matrix build は Go の言語機能を使って以下のように書きます。build 関数だけを掲載します。

```go
func build(repoUrl string) error {
	fmt.Printf("Building %s\n", repoUrl)

	ctx := context.Background()
	client, err := dagger.Connect(ctx)
	if err != nil {
		return err
	}
	defer client.Close()
	repo := client.Git(repoUrl)
	src, err := repo.Branch("main").Tree().ID(ctx)
	if err != nil {
		return err
	}

	workdir := client.Host().Workdir()

	// 1. Define our build matrix
	golang := client.Container().From("golang:latest")
	golang = golang.WithMountedDirectory("src", src).WithWorkdir("src")

	oses := []string{"linux", "darwin"}
	arches := []string{"amd64", "arm64"}

	// 2. Loop through the os and arch matrices
	for _, goos := range oses {
		for _, goarch := range arches {
			path := fmt.Sprintf("build/%s/%s/", goos, goarch)
			outpath := filepath.Join(".", path)
			err = os.MkdirAll(outpath, os.ModePerm)
			if err != nil {
				return err
			}
			build := golang.WithEnvVariable("GOOS", goos)
			build = build.WithEnvVariable("GOARCH", goarch)
			build = build.Exec(dagger.ContainerExecOpts{
				Args: []string{"go", "build", "-o", path},
			})
			output, err := build.Directory(path).ID(ctx)
			if err != nil {
				return err
			}
		
			_, err = workdir.Write(ctx, output, dagger.HostDirectoryWriteOpts{Path: path})
			if err != nil {
				return err
			}
		}
	}

	return nil
}
```

ポイントは以下の2つです。

1. Go の slice で OS とプロセッサアーキテクチャの Matrix を定義
1. for をネストさせて OS とプロセッサアーキテクチャ毎のビルドを実行

成功すると、以下のようにプラットフォーム別のバイナリが生成されます。

```
build
├── darwin
│   ├── amd64
│   │   └── greetings-api
│   └── arm64
│       └── greetings-api
└── linux
    ├── amd64
    │   └── greetings-api
    └── arm64
        └── greetings-api
```

## goroutine による Matrix の並列実行

上記のコードではループ内の処理が順次実行されるため、プラットフォームの組み合わせが増えると時間がかかります。main に stopwatch を仕込んで処理時間を計測してみました。

[GitHub - bradhe/stopwatch: Simple stopwatch utility for golang. I&#39;m definitely re-inventing the wheel here.](https://github.com/bradhe/stopwatch)


```
Milliseconds elapsed: 8.583µs
```

8秒以上かかっています。これは goroutine で解決です。ErrGroup を使うことでターゲット毎のビルドを並列に実行、エラーハンドリングも可能です。

```go
func build(repoUrl string) error {
	fmt.Printf("Building %s\n", repoUrl)
	
	ctx := context.Background()
	
	// 1. Create an errgroup
	g, ctx := errgroup.WithContext(ctx)

	client, err := dagger.Connect(ctx)
	if err != nil {
		return err
	}
	defer client.Close()
	repo := client.Git(repoUrl)
	src, err := repo.Branch("main").Tree().ID(ctx)
	if err != nil {
		return err
	}

	workdir := client.Host().Workdir()

	golang := client.Container().From("golang:latest")
	golang = golang.WithMountedDirectory("src", src).WithWorkdir("src")

	oses := []string{"linux", "darwin"}
	arches := []string{"amd64", "arm64"}

	for _, goos := range oses {
		for _, goarch := range arches {
			// 2. Run os/arch build in errgroup
			goos, goarch := goos, goarch
			g.Go(func() error {
				path := fmt.Sprintf("build/%s/%s/", goos, goarch)
				outpath := filepath.Join(".", path)
				err = os.MkdirAll(outpath, os.ModePerm)
				if err != nil {
					return err
				}
				build := golang.WithEnvVariable("GOOS", goos)
				build = build.WithEnvVariable("GOARCH", goarch)
				build = build.Exec(dagger.ContainerExecOpts{
					Args: []string{"go", "build", "-o", path},
				})
				output, err := build.Directory(path).ID(ctx)
				if err != nil {
					return err
				}
			
				_, err = workdir.Write(ctx, output, dagger.HostDirectoryWriteOpts{Path: path})
				if err != nil {
					return err
				}
				return nil
			})
		}
	}

	return nil
}
```

順次実行版との違いは以下の2点です。

1. errgroup を作成
1. OS とプロセッサアーキテクチャ毎に errgroup 内でビルドを実行

goroutine 導入後に処理時間を再計測したところ、半分以下に短縮できました。

```shell
Milliseconds elapsed: 3.577µs
```
## まとめ

YAML や CUE のようなデータ指向の言語ではなく、Jenkinsfile[^1] のような DSL でもなく Go をそのまま使い Go の言語特性を生かしたパイプラインを開発できる Dagger Go SDK を触ってみました。

[^1]: Jenkins のパイプラインを定義するファイル

筆者としては、パイプラインは YAML のようなチューリング完全でない (なんでもできるわけではない) 言語で宣言的に書く方が (後々の保守を考えると) よいと思っていますが、Go のシンプルなコード、goroutine による並列性、手軽な実行環境を目の当たりにするとちょっと考えが揺らぎました。

Dagger プロジェクトでは Go 以外の言語による SDK の提供も予定しているようです。プロダクトコードと同じ言語で CI/CD パイプラインも書く。そんな時代が来るのかもしれません。
