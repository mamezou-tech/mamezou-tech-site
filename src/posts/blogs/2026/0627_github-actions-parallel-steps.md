---
title: GitHub Actions ワークフローのステップが並行実行可能になりました
author: masahiro-kondo
date: 2026-06-27
tags: [GitHub, CI/CD]
---

## はじめに
先日、GitHub Actions ワークフローで background 機能が実装され、単一のワークフロー内でステップを並行で実行可能になったことが発表されました。

@[og](https://github.blog/changelog/2026-06-25-actions-steps-can-now-be-run-in-parallel/)

これまでも、Strategy Matrix を使うと複数のランナーを使って並行処理させることはできましたが、今回の機能で、単一のランナーでの並行処理がサポートされたことになります。

[公式ドキュメント](https://docs.github.com/ja/actions/reference/workflows-and-actions/workflow-syntax)には、バックエンドとフロントエンドのビルドを並行で実行するサンプルが掲載されています。

```yaml
steps:
  - name: Build frontend
    id: build-frontend
    run: npm run build:frontend
    background: true

  - name: Build backend
    id: build-backend
    run: npm run build:backend
    background: true

  - name: Run linter while builds run
    run: npm run lint

  - name: Wait for both builds to finish
    wait: [build-frontend, build-backend]

  - name: Run tests
    run: npm test
```

## 並行実行を試す (background 版)
ステップ毎に `background: true` を指定する方法です。この属性を付与したステップは、実行開始後即座にフォアグラウンドに処理を戻します。

```yaml
name: Background Hello World

on:
  workflow_dispatch:

jobs:
  hello-background:
    runs-on: ubuntu-latest
    steps:
      - name: Background hello 1 #1
        id: hello1
        run: |
          echo "hello1 start: $(date -u +%H:%M:%S)"
          sleep 4
          echo "hello1 end:   $(date -u +%H:%M:%S)"
        background: true

      - name: Background hello 2 #2
        id: hello2
        run: |
          echo "hello2 start: $(date -u +%H:%M:%S)"
          sleep 3
          echo "hello2 end:   $(date -u +%H:%M:%S)"
        background: true

      - name: Foreground step (runs while background steps are active) #3
        run: |
          echo "foreground start: $(date -u +%H:%M:%S)"
          sleep 1
          echo "foreground end:   $(date -u +%H:%M:%S)"

      - name: Wait for background steps #4
        wait: [hello1, hello2]

      - name: Done
        run: echo "Both background steps have completed."
```
1. バックグラウンド実行するステップ。4秒間のスリープの開始と終了で時刻を表示します。`background: true` を指定します。
2. バックグラウンド実行するステップ２個目。1個目と同様の処理です。
3. バックグラウンド実行しながら、フォアグラウンドで実行されるステップ。1秒間スリープします。
4. バックグラウンドの2つのステップを待ち受けるステップです。`wait` でステップの ID を配列で指定するだけです。

実行結果です。

![実行結果](https://i.gyazo.com/e912fffafeecdbeef29120d645e8d45f.png)

- hello1 と hello2 が同一時刻に開始され、ほぼ同一の時刻に終了しています。
- フォアグラウンドステップも2つのバックグラウンドステップと同時刻に開始されています。
- wait ステップで2つのバックグラウンドステップの完了を待っています。


## 並行実行を試す (parallel 版)
`parallel` キーワード配下にステップを並べるだけで並列化できます。parallel ブロックを抜けると完了するため、wait で待つ必要はありません。

```yaml
name: Parallel Hello World

on:
  workflow_dispatch:

jobs:
  hello-parallel:
    runs-on: ubuntu-latest
    steps:
      - parallel: #1
          - name: Parallel hello 1
            run: |
              echo "parallel-1 start: $(date -u +%H:%M:%S)"
              sleep 4
              echo "parallel-1 end:   $(date -u +%H:%M:%S)"

          - name: Parallel hello 2
            run: |
              echo "parallel-2 start: $(date -u +%H:%M:%S)"
              sleep 3
              echo "parallel-2 end:   $(date -u +%H:%M:%S)"

          - name: Parallel hello 3
            run: |
              echo "parallel-3 start: $(date -u +%H:%M:%S)"
              sleep 2
              echo "parallel-3 end:   $(date -u +%H:%M:%S)"

      - name: Done after all parallel steps #2
        run: |
          echo "done step start: $(date -u +%H:%M:%S)"
          echo "All parallel steps have completed."
          echo "done step end:   $(date -u +%H:%M:%S)"
```

1. parallel 配下に3つのステップを配置します。sleep は4秒、3秒、2秒とバリエーションを持たせています。
2. 通常のステップです。parallel ステップ完了後に実行されます。

実行結果です。

![実行結果](https://i.gyazo.com/93eb5621835575d7926031e9c1a4e78f.png)

- hell1, hello2, hello3 が同時刻に開始されています。それぞれ、指定通り、4秒、3秒、2秒実行にかかっています。
- 最後のステップは、parallel ステップ完了後の時刻から開始されていることがわかります。


## クロスコンパイルで使ってみる
応用として、すぐに思いつくのは、クロスコンパイルで複数プラットフォーム向けのバイナリ生成を並行で実行することです。例えば、Go 言語では Linux / macOS / Windows の向けのバイナリをクロスコンパイルできます。

```yaml
    - name: Build
      run: |
        GOOS=linux GOARCH=amd64 go build -o build/linux-amd64/sb2md main.go
        GOOS=linux GOARCH=arm64 go build -o build/linux-arm64/sb2md main.go
        GOOS=windows GOARCH=amd64 go build -o build/windows/sb2md.exe main.go
        GOOS=darwin GOARCH=amd64 go build -o build/macos/sb2md main.go
        GOOS=darwin GOARCH=arm64 go build -o build/macos_arm/sb2md main.go
```

並列化する以前のビルド結果です。5つのバイナリを生成するのに44秒かかっています。

![並列化前のビルド結果](https://i.gyazo.com/644565af3f0f937740ddbc6e698585e1.png)

並列化を適用しました。run で複数行書いてましたが、個別のステップに分けて、parallel 配下に置きました。

```yaml
    - parallel:
        - name: Build linux amd64
          run: GOOS=linux GOARCH=amd64 go build -o build/linux-amd64/sb2md main.go

        - name: Build linux arm64
          run: GOOS=linux GOARCH=arm64 go build -o build/linux-arm64/sb2md main.go

        - name: Build windows amd64
          run: GOOS=windows GOARCH=amd64 go build -o build/windows/sb2md.exe main.go

        - name: Build darwin amd64
          run: GOOS=darwin GOARCH=amd64 go build -o build/macos/sb2md main.go

        - name: Build darwin arm64
          run: GOOS=darwin GOARCH=arm64 go build -o build/macos_arm/sb2md main.go
```

![並列化後のビルド結果](https://i.gyazo.com/bcd9816c71a6b59db11aeb068778ff1e.png)

トータルは40秒でした、Linux amd64 のビルドは3秒で終わってますが、他のプラットフォーム用のビルドはそれぞれで40秒かかっています。思ったより短縮されませんでした。考えられる原因としては、やはりランナーの CPU コア数でしょうか。

- ランナー(ubuntu-latest)の vCPU が2コアであることから多重度が上がらなかった
  - 5つのプロセスが2つのコアを奪い合ってコンテキストスイッチが大きかった
- ランナーのアーキテクチャ自体が Linux amd64 なので、ネイティブのバイナリ生成は瞬時に終わった

CPU コアの多い Larger Runner にすればもっと短縮できそうですが、40秒が3秒程度に短縮されるだけなら、コストパフォーマンスはイマイチですね。今回のユースケースには合わない感じがします。

## さいごに
以上、GitHub Actions ワークフローでの並行ステップ実行を試してみました。公式ドキュメントの例のように、同じ言語で、バックエンドとフロントエンドをビルドするような例だとビルド時間の短縮が期待できそうです。(2コアでも効率よく並行化できますし)
