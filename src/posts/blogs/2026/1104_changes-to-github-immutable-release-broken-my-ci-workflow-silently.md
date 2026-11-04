---
title: GitHub Immutable Releases を設定したリポジトリのリリース用パイプラインが静かに壊れたので直した話
author: masahiro-kondo
date: 2026-11-03
tags: [GitHub, CI/CD, electron]
image: true
---

## はじめに
リリースの改竄を防ぎソフトウェアサプライチェーンのセキュリティを確保する Immutable releases を試すため、個人開発の Electron アプリのリポジトリに適用したのが1年前。

@[og](https://developer.mamezou-tech.com/blogs/2025/11/16/github-immutable-releases/)

それから随分経ちましたが、eMudhra のインシデントで古い Electron アプリを放置しておくのはよくないということでリリース作業を行いました。

筆者の Electron アプリのリポジトリは以下です。

@[og](https://github.com/kondoumh/sbe)

:::info:eMudhra のセキュリティインシデントについて
> 認証局「eMudhra」の「emSign G3」階層で、中間CAの鍵8件（TLS用6件、コード署名用2件）が復元できるほど脆弱に生成されていた問題。

*窓の杜の記事より*

@[og](https://forest.watch.impress.co.jp/docs/news/2152996.html)

Jack さんのブログにあるように、古いバージョンの Electron でビルドした脆弱性を含むアプリを配布していると、ユーザーがダウンロードしてインストールしてしまう可能性があります。

@[og](https://blog.jxck.io/entries/2026-10-25/emudhra.html)
:::

## リリース用ワークフローにエラーが発生
さて、アプリの細かい修正や Electron のバージョンアップを実施して、リリースの段階になりました。このリポジトリでは新しいバージョンのタグを作成し push するとリリース用のワークフローが起動するように設定しています。冒頭の記事で書いているように、macOS / Windows / Linux のバイナリーを strategy.matrix を使ってそれぞれのプラットフォームの Actions Runner で生成し、GitHub のリリースを作成する [softprops/action-gh-release](https://github.com/softprops/action-gh-release) を使ってリリースしています。

今回このワークフローを1年ぶりに起動したところ以下のようなエラーで失敗しました。

```shell
Found release v3.9.0 (with id=432353934)
⚠️ Unexpected error fetching GitHub release for tag refs/tags/v3.9.0: HttpError: Validation Failed: {"resource":"Release","code":"custom","field":"target_commitish","message":"target_commitish cannot be changed when release is immutable"} - https://docs.github.com/rest/releases/releases#update-a-release
Error: Validation Failed: {"resource":"Release","code":"custom","field":"target_commitish","message":"target_commitish cannot be changed when release is immutable"} - https://docs.github.com/rest/releases/releases#update-a-release
```

Immutable releases にまつわるエラーのようです。

## 初期のワークフローの実装
エラーが発生した時点のワークフローファイルは以下のようになっていました。matrics.strategy で各プラットフォームの Runner のジョブでビルドとリリースを一気に行う形です。

```yaml:Release.yml(エラー発生時点)
name: Release

on:
  push:
    branches:
      - "!*"
    tags:
      - "v*"

jobs:
  build:

    runs-on: ${{ matrix.os }}

    strategy:
      fail-fast: false
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    steps:
    - uses: actions/checkout@v4
    - name: Setup nodejs
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    - name: Install dependencies
      run: npm install
    - name: Package (Windows / Linux)
      if: matrix.os != 'macos-latest'
      run: npm run dist
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    - name: Package (macOS)
      if: matrix.os == 'macos-latest'
      run: npx electron-builder --mac --universal
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    - name: Publish
      uses: softprops/action-gh-release@v2
      with:
        files: |
          dist/**/*.exe
          dist/**/*.deb
          dist/**/*.AppImage
          dist/**/*.dmg
        prerelease: true ## Pre-release の状態で作成する
```

action-gh-release のパラメータに `prerelease: true` を指定しているため、それぞれの Runner でビルド成果物を Pre-release に追加するワークフローとなっています。

当時は、この設定でちゃんとドラフトのリリースが作成されていたようです。記事にも

> 「prerelease を trueにすることで、ドラフトリリースを作成してくれます」

とあり、ドラフトで添付ファイルと差分を確認してから Publish をクリックと、人間が最後に明示的に公開する手順を踏んでいました。

## レースコンディションの回避
最初に考えたのは、strategy.matrix で独立した3つのプロセスで publish が実行されることによるレースです。並列の matrix ジョブが実行され、各ジョブが個別に softprops/action-gh-release を呼んで同じ v3.9.0 タグのリリースを作成・更新しようとします。そこへほぼ同時にリクエストが飛んだ結果、同じタグに対してリリースオブジェクトが複数作られるような動きになったのではないか。そこで、ビルドとリリースでジョブを分けて、ビルドだけをマトリクスで実行するように修正しました。また、バイナリを作成している electron-builder のオプションに `--publish never` をつけることで暗黙的な公開を抑止しました。

```yaml
name: Release

on:
  push:
    branches:
      - "!*"
    tags:
      - "v*"

jobs:
  build:

    runs-on: ${{ matrix.os }}

    strategy:
      fail-fast: false
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    steps:
    - uses: actions/checkout@v4
    - name: Setup nodejs
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    - name: Install dependencies
      run: npm install
    - name: Package (Windows / Linux)
      if: matrix.os != 'macos-latest'
      run: npm run dist -- --publish never
    - name: Package (macOS)
      if: matrix.os == 'macos-latest'
      run: npx electron-builder --mac --universal --publish never # electron-builder の暗黙リリースを抑止
    - name: Upload artifacts
      uses: actions/upload-artifact@v4
      with:
        name: dist-${{ matrix.os }}
        path: |
          dist/**/*.exe
          dist/**/*.exe.blockmap
          dist/**/*.deb
          dist/**/*.AppImage
          dist/**/*.dmg
          dist/**/*.dmg.blockmap
          dist/**/*.zip
          dist/**/*.zip.blockmap
          dist/latest*.yml
        if-no-files-found: ignore

  publish:
    needs: build
    runs-on: ubuntu-latest

    steps:
    - name: Download artifacts
      uses: actions/download-artifact@v4
      with:
        path: dist
        pattern: dist-*
        merge-multiple: true
    - name: Publish
      uses: softprops/action-gh-release@v2
      with:
        files: |
          dist/*.exe
          dist/*.deb
          dist/*.AppImage
          dist/*.dmg
          dist/*.zip
        prerelease: true
```

`fail-fast: false` にしているので、全ての Runner のジョブが終わってから後続の publish ジョブが実行されます。

## Pre-release 自体が immutable になっていた
これで、ドラフトのリリースは作成されました。うまくいったと思ったのですが、ドラフトページから `publish` ボタンで公開しようとした時点でエラーになってしまいました。

> There was an error creating your Release: tag name was used by an immutable release.

ドラフトのまま公開できない状態でした。いろいろ調べて、原因が分かりました。softprops/action-gh-release の出力するエラーメッセージに原因と解決策が書かれていました。

> prerelease は release.published イベントで即座に公開されて immutable になってしまうので、immutable release が有効なリポジトリでアセット付きの prerelease を 作りたいなら、draft: true のままにして後から publish してください

そこで、以下のように softprops/action-gh-release のオプションで `draft: true` を指定し Pre-release ではなくドラフトでリリースを作成するように変更しました。

```yaml:Release.yml
name: Release

on:
  push:
    branches:
      - "!*"
    tags:
      - "v*"

jobs:
  build:

  # 中略

  publish:
    needs: build
    runs-on: ubuntu-latest

    steps:
    - name: Download artifacts
      uses: actions/download-artifact@v8
      with:
        path: dist
        pattern: dist-*
        merge-multiple: true
    - name: Publish
      uses: softprops/action-gh-release@v3
      with:
        files: |
          dist/*.exe
          dist/*.deb
          dist/*.AppImage
          dist/*.dmg
          dist/*.zip
        prerelease: true
        draft: true # ドラフトモードでリリースを作成
```

これで、ドラフトリリースの画面から publish をクリックできるようになり、無事リリースが完了しました。

## 何が変わったのか
softprops/action-gh-release@v3自身の現在のドキュメントにはこうあります。

> GitHub only allows asset uploads before a release is published, but draft prereleases publish with the release.published event instead of release.prereleased. If you need prereleases with assets on an immutable-release repository, keep the release as a draft with draft: true, then publish it later from that draft.

つまり現時点で prerelease: true では即座に release.published イベントで公開・immutable 化されてしまうということです。

- 1年前は `prerelease: true` でも人間が「Publish」を押すまでは公開されない・ロックされない挙動だった(事実上 draft と同じように振る舞っていた)
- 今は `prerelease: true` だけだと即座に公開・ロックされ、`draft: true` を明示しないと同じ挙動にならない。

つまり、ジョブが並列で同じリリースに書き込みに行く構造自体は1年前から変わっていない。当時それでも壊れなかったのは、「prerelease は人間が手動 Publish するまでロックされない」という仕様のおかげで、並列書き込みが衝突する前に猶予があったから。GitHub がこの間に「prerelease も即ロック」という形に仕様を厳格化した(おそらく、誰も手動で publish しなければ永久にミュータブルなままで immutable release の保証が骨抜きになる抜け道を塞ぐため)ことで、今回1年ぶりに実行したことでその変更の影響を受けてしまったということのようです。

:::info
上記は推論であり、の仕様変更を明記した GitHub 公式の Changelog ブログのエントリは見つけられませんでした。確度の高い状況証拠(ブログの記述・softprops/action-gh-release ドキュメントの現在の注意書き)からの推測である点はご承知おきください。
:::

## さいごに
以上、Immutable releases の仕様変更により、リリース用ビルドパイプラインがいつの間にか壊れていた話でした。
今回、v3.8.0 から v3,9.2 へのアップデートになりました。2つのリビジョンの変更はワークフローのみです。

Immutable Release 自体はよりセキュアになっていると思いますので、安心して使っていただいてよいと思います。
