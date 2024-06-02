---
title: Artifact Attestations で GitHub Actions ワークフローの成果物の出所情報を検証可能にする
author: masahiro-kondo
date: 2024-06-03
tags: [GitHub, Security]
image: true
---

## はじめに
GitHub の Artifact Attestations を使用すると GitHub Actions ワークフローでビルド成果物に署名して成果物の出所情報を検証可能にできます。

Artifact Attestations は現在パブリックベータです。

[Introducing Artifact Attestations–now in public beta](https://github.blog/2024-05-02-introducing-artifact-attestations-now-in-public-beta/)

Artifact Attestations はソフトウェア成果物の署名と検証を行うための OSS である Sigstore により実現されています。この機能のため、GitHub はルート証明機関(CA)になっています。

:::info
Sigstore を使ってコンテナイメージや Go Modules などの成果物に署名を行う GitHub Actions ワークフローの構成に関しては以下の記事で扱っています。

[ソフトウェアサプライチェーンセキュリティのための GitHub Actions ワークフロー](/blogs/2022/08/17/github-actions-workflows-for-software-supply-chain-security/)
:::

## ワークフローで成果物の署名済みビルド出所証明を生成する

ワークフローでビルド出所証明を生成するために attest-build-provenance action を使用します。

[GitHub - actions/attest-build-provenance: Action for generating build provenance attestations for workflow artifacts](https://github.com/actions/attest-build-provenance)

まず簡単なワークフローで試してみました。

```yaml:./github/workflows/artifact-attestations-trial.yml
name: Artifact Attestations Trial
on: [workflow_dispatch]

jobs:
  Build:
    permissions:
      id-token: write
      contents: read
      attestations: write  # 1

    runs-on: ubuntu-latest

    steps:
    - name: Build artifact #2
      run: |
        mkdir -p _artifacts
        echo "Hello! now is $(date)" >> _artifacts/hello.txt
        tar -czf hello.tar.gz _artifacts
    - name: Generate artifact attestation #3
      uses: actions/attest-build-provenance@v1
      with:
        subject-path: 'hello.tar.gz'
    - name: Upload artifact #4
      uses: actions/upload-artifact@v4
      with:
        name: hello
        path: hello.tar.gz
```
以下のようなステップを構成しています。

1. permission で attestations の書き込みを有効化 (`id-token: write`、`contents: read` も必要)
2. テキストファイルを作成し tar コマンドでアーカイブファイルを作成
3. attest-build-provenance を使ってアーカイブファイルの出所証明を生成
4. upload-artifact アクションでアーカイブファイルをアップロード

このワークフローを実行すると、ワークフローのサマリー画面に成果物がアップロードされ、作成された Attestation が表示されます。

![Attestation created](https://i.gyazo.com/3a89f9cf86c315ded1b8ca19e55641eb.png)

:::info
Attestation を保存できるのは public リポジトリのみです。private リポジトリで保存するには Enterprise プランの契約が必要です。
:::

## GitHub CLI で検証を行う
GitHub CLI で検証を行うことができます。GitHub CLI の v2.49.0 で GitHub Artifact Attestations のサポートが入っています。バージョンが古い場合はアップデートを行います。

[Release GitHub CLI 2.49.0 · cli/cli](https://github.com/cli/cli/releases/tag/v2.49.0)

ダウンロードしたアーカイブファイルに対し、`gh attestation verify` で GitHub アカウント(またはオーガニゼーション)を指定して検証を行います。

```shell
gh attestation verify hello.tar.gz -o kondoumh    
Loaded digest sha256:4e91db5c9c0333bdfd8e2c0a047b886509f52043ce0046e91e51e30d758bdb20 for file://hello.tar.gz
Loaded 1 attestation from GitHub API
✓ Verification succeeded!

sha256:4e91db5c9c0333bdfd8e2c0a047b886509f52043ce0046e91e51e30d758bdb20 was attested by:
REPO              PREDICATE_TYPE                  WORKFLOW                                                           
kondoumh/iac-dev  https://slsa.dev/provenance/v1  .github/workflows/artifact-attestations-trial.yml@refs/heads/master
```

ダウンロードしたアーカイブファイルから取得したダイジェストで指定のアカウントから attestation を取得することで検証を行なっています。リポジトリ名、ソフトウェアの出所を表す SLSA の predicateType[^1]、成果物がビルドされたワークフローファイルなどの情報が出力されて、検証は成功しました。

[^1]: [https://slsa.dev/spec/v1.0/provenance](https://slsa.dev/spec/v1.0/provenance)

実際のリポジトリと異なるオーガニゼーションを指定するとエラーになります[^2]。

[^2]: ダイジェストに一致する attestation が存在しないということで HTTP ステータスが 404 になっています。

```shell
gh attestation verify hello.tar.gz -o mamezou-tech
Loaded digest sha256:4e91db5c9c0333bdfd8e2c0a047b886509f52043ce0046e91e51e30d758bdb20 for file://hello.tar.gz
✗ Loading attestations from GitHub API failed

Error: failed to fetch attestations from mamezou-tech: HTTP 404: Not Found (https://api.github.com/orgs/mamezou-tech/attestations/sha256:4e91db5c9c0333bdfd8e2c0a047b886509f52043ce0046e91e51e30d758bdb20?per_page=30)
```

Attestation を確認することで、当該成果物が特定のオーガニゼーションでビルドされたことを検証できることが分かります。

## 実際のプロジェクトで使用する

mamezou-tech で公開している sbgraph のリポジトリに適用してみました。

[GitHub - mamezou-tech/sbgraph: Fetch Scrapbox project data and visualize activities.](https://github.com/mamezou-tech/sbgraph)

このリポジトリのワークフローでは Go で各プラットフォーム向けのバイナリをコンパイルし、リリースページにアーカイブファイルを公開しています。アーカイブファイルの作成とリリースページへの公開はタグが作成された時のみ実行します。

以下は、[ワークフローファイル](https://github.com/mamezou-tech/sbgraph/blob/master/.github/workflows/go.yml)の抜粋です。

```yaml
jobs:

  build:
    permissions: #1 パーミッションの設定
      id-token: write
      contents: write
      attestations: write

    - name: Build #2 各プラットフォーム向けビルド
      run: |
        GOOS=linux GOARCH=amd64 go build -o build/linux-amd64/sbgraph main.go
        GOOS=linux GOARCH=arm64 go build -o build/linux-arm64/sbgraph main.go
        GOOS=windows GOARCH=amd64 go build -o build/windows/sbgraph.exe main.go
        GOOS=darwin GOARCH=amd64 go build -o build/macos-amd64/sbgraph main.go
        GOOS=darwin GOARCH=arm64 go build -o build/macos-arm64/sbgraph main.go

    - name: Archive #3 アーカイブファイルの作成
      if: startsWith(github.ref, 'refs/tags/')
      run: |
        (cd build/linux-amd64 && tar cfvz ../sbgraph-linux-amd64.tar.gz sbgraph)
        (cd build/linux-arm64 && tar cfvz ../sbgraph-linux-arm64.tar.gz sbgraph)
        (cd build/windows && tar cfvz ../sbgraph-windows-amd64.tar.gz sbgraph.exe)
        (cd build/macos-amd64 && tar cfvz ../sbgraph-darwin-amd64.tar.gz sbgraph)
        (cd build/macos-arm64 && tar cfvz ../sbgraph-darwin-arm64.tar.gz sbgraph)

    - name: Generate artifact attestations #4 出所証明の生成
      if: startsWith(github.ref, 'refs/tags/')
      uses: actions/attest-build-provenance@v1
      with:
        subject-path: 'build/*.tar.gz'

    - name: Publish #5 リリースページへの公開
      if: startsWith(github.ref, 'refs/tags/')
      uses: softprops/action-gh-release@v2
      with:
        files: build/*.tar.gz
```
既存のワークフローに `#1` のパーミッションと `#4` の出所証明の生成ステップを追加しました。

- `contents: write` パーミッションを追加: 成果物リリースのために write にしています
- 出所証明書の生成: 各プラットフォーム向けに複数のアーカイブファイルをワイルドカードで指定しています

タグを作成してビルドを実行すると、各アーカイブファイルに Attestation が生成されました。

![Build summary](https://i.gyazo.com/dacd7eaf083a217d25ebe2de84d03895.png)

macOS 向けのアーカイブをダウンロードして、GitHub CLI で オーガニゼーションに `mamezou-tech` を指定して検証しました。

```shell
$ gh attestation verify sbgraph-darwin-arm64.tar.gz -o mamezou-tech
Loaded digest sha256:01c2b8b780ff941034b498b2eb82c571a80147f4ffdd16cedc062f7fbb3e563c for file://sbgraph-darwin-arm64.tar.gz
Loaded 1 attestation from GitHub API
✓ Verification succeeded!

sha256:01c2b8b780ff941034b498b2eb82c571a80147f4ffdd16cedc062f7fbb3e563c was attested by:
REPO                  PREDICATE_TYPE                  WORKFLOW                                      
mamezou-tech/sbgraph  https://slsa.dev/provenance/v1  .github/workflows/go.yml@refs/tags/v0.11.0-rc0
```

無事検証が成功しました。

## さいごに
ワークフローにわずかなステップを追加するだけで成果物への署名が可能な Artifact Attestations、ソフトウェアサプライチェーンセキュリティのため必須の技術となっていくのではないでしょうか。

リポジトリに成果物の SBOM が存在する場合、冒頭で紹介した GitHub のブログに attest-sbom action でビルド成果物を署名付き SBOM に関連づける方法が記載されています。
