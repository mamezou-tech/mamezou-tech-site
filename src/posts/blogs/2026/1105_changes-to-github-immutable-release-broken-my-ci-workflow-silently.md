---
title: GitHub Immutable Releases を設定したリポジトリのリリース用パイプラインが静かに壊れたので直した話
author: masahiro-kondo
date: 2026-11-05
tags: [GitHub, CI/CD, electron, Security]
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

Jack さんのブログにあるように、Electron は Chromium の証明書ストアを同梱しており、Chromium や Node を更新してビルドし直さない限りストアが更新されません。つまり、古いバージョンの Electron で作られたアプリを配布し続けていると、信頼すべきでなくなったルート証明書をいつまでも信頼し続けてしまいます。

@[og](https://blog.jxck.io/entries/2026-10-25/emudhra.html)

Electron アプリはビルド時点のルート証明書を内包するため、古い Electron バージョンでビルドされたままのアプリは、失効すべき証明書を信頼し続けてしまうリスクがあるということです。
:::


## リリース用ワークフローにエラーが発生
さて、アプリの細かい修正や Electron のバージョンアップを実施して、リリースの段階になりました。このリポジトリでは新しいバージョンのタグを作成し push するとリリース用のワークフローが起動するように設定しています。冒頭の記事で書いているように、macOS / Windows / Linux のバイナリーを strategy.matrix を使ってそれぞれのプラットフォームの Actions Runner で生成し、GitHub のリリースを作成する [softprops/action-gh-release](https://github.com/softprops/action-gh-release) を使ってリリースしています。

今回、アプリのバージョンを v3.9.0 に bump してこのワークフローを1年ぶりに起動したところ以下のようなエラーで失敗しました。

```shell
Found release v3.9.0 (with id=432353934)
⚠️ Unexpected error fetching GitHub release for tag refs/tags/v3.9.0: HttpError: Validation Failed: {"resource":"Release","code":"custom","field":"target_commitish","message":"target_commitish cannot be changed when release is immutable"} - https://docs.github.com/rest/releases/releases#update-a-release
Error: Validation Failed: {"resource":"Release","code":"custom","field":"target_commitish","message":"target_commitish cannot be changed when release is immutable"} - https://docs.github.com/rest/releases/releases#update-a-release
```

Immutable releases にまつわるエラーのようです。

調べると、v3.9.0 のタグに2つのリリースオブジェクトが作成されているようでした。

- id=432353876(draft, immutable=false): アセットに必要なファイル(sbe-Setup-3.9.0.exe, sbe-3.9.0-universal.dmg, sbe-3.9.0.AppImage)は全部揃っている。そしてまだ Imutable にはなっていない
- id=432353934(published, prerelease, immutable=true): アセット0件のまま Immutable として確定されてしまい、同じタグ名を握ってしまっている

## 初期のワークフローの実装
エラーが発生した時点のワークフローファイルは以下のようになっていました。strategy.matrix で各プラットフォームの Runner のジョブでビルドとリリースを一気に行う形です。

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

> `prerelease` を `true` にすることで、ドラフトリリースを作成してくれます。

とあり、ドラフトで添付ファイルと差分を確認してから Publish をクリックするという、人間が最後に明示的に公開する手順を踏んでいました。

## 失敗した Pre-release は捨てるしかない
今回、v3.9.0 の重複して作られたリリースのうち、空のまま immutable 化してしまった方を削除すれば、もう一方の(アセットが揃っている)ドラフトを publish できると考え、空のリリースを削除しました。ところが、ドラフトページから `publish` ボタンを押すと、今度は以下のエラーになりました。

> There was an error creating your Release: tag name was used by an immutable release.

Pre-release とはいえ一度 immutable なリリースに使われたタグ名は、そのリリースを削除してもリポジトリ側で「使用済み」として記録され続けるようです（改竄防止のための仕様としては筋が通っています）。v3.9.0 というタグ自体がもう使えなくなってしまったので、バージョンを上げて v3.9.1 として仕切り直すことにしました。

## レースコンディションの回避
対策として最初に考えたのは、strategy.matrix で独立した3つのプロセスで publish が実行されることによるレースの解消です。並列の matrix ジョブが実行され、各ジョブが個別に softprops/action-gh-release を呼んで同じ v3.9.0 タグのリリースを作成・更新しようとします。そこへほぼ同時にリクエストが飛んだ結果、同じタグに対してリリースオブジェクトが複数作られるような動きになったのではないか。そこで、ビルドとリリースでジョブを分けて、ビルドだけをマトリクスで実行するように修正しました。また、バイナリを作成している electron-builder のオプションに `--publish never` をつけることで暗黙的な公開を抑止しました。

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
ジョブを分離したワークフローで v3.9.1 のタグを push し直したところ、3つの Runner のビルドジョブはすべて成功しました。ところが、最後の publish ジョブの Publish ステップそのものが、今度は以下のエラーで失敗してしまいました。

> Cannot upload asset sbe-3.9.1-universal-mac.zip to an immutable release.

ジョブは1つに統合したはずなのに、4つのアセット（exe, dmg, zip, AppImage）のうち3つまではアップロードできて、最後の1つだけ弾かれる、という中途半端な失敗でした。原因は softprops/action-gh-release 自身が出力したエラーメッセージに書かれていました。

> GitHub only allows asset uploads before a release is published, but draft prereleases publish with the release.published event instead of release.prereleased. If you need prereleases with assets on an immutable-release repository, keep the release as a draft with draft: true, then publish it later from that draft and subscribe downstream workflows to release.published.

つまり、Immutable releases が有効なリポジトリでは `prerelease: true` を指定しただけの場合、リリースの作成と同時に `release.published` イベントが発火して即座に公開・immutable 化されてしまうとのことでした。4つのアセットをほぼ同時にアップロードし始めたものの、その途中でリリースがロックされてしまい、間に合わなかったアセットだけ弾かれた、というわけです。

そこで、以下のように softprops/action-gh-release のオプションで `draft: true` を指定し、Pre-release ではなくドラフトでリリースを作成するように変更しました。

```yaml:Release.yml
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
        draft: true # ドラフトモードでリリースを作成
```

v3.9.1 のタグも、空のまま immutable 化したリリースに使われてしまっていたため、こちらも再利用できません。結局、v3.9.2 としてもう一度タグを push し直し、ようやく4つのアセットが揃ったドラフトリリースが作成されました。ドラフトのまま変更可能な状態なので、不要な `.blockmap` ファイルなどを削除し、内容を確認してから `publish` をクリックして、無事リリースが完了しました。

## 何が変わったのか
softprops/action-gh-release の現在の最新版である@v3のドキュメントにはこうあります。

> GitHub only allows asset uploads before a release is published, but draft prereleases publish with the release.published event instead of release.prereleased. If you need prereleases with assets on an immutable-release repository, keep the release as a draft with draft: true, then publish it later from that draft.

つまり現時点で prerelease: true では即座に release.published イベントで公開・immutable 化されてしまうということです。

- 1年前は `prerelease: true` でも人間が「Publish」を押すまでは公開されない・ロックされない挙動だった(事実上 draft と同じように振る舞っていた)
- 今は `prerelease: true` だけだと即座に公開・ロックされ、`draft: true` を明示しないと同じ挙動にならない。

つまり、ジョブが並列で同じリリースに書き込みに行く構造自体は1年前から変わっていない。当時それでも壊れなかったのは、「Pre-release は人間が手動 Publish するまでロックされない」という仕様のおかげで、並列書き込みが衝突する前に猶予があったから。GitHub がこの間に「Pre-release も即ロック」という形に仕様を厳格化した(おそらく、誰も手動で publish しなければ永久にミュータブルなままで immutable release の保証が骨抜きになる抜け道を塞ぐため)。そして、今回1年ぶりに実行したことでその変更の影響を受けてしまったということのようです。

:::info
上記は推論であり、この仕様変更を明記した GitHub 公式の Changelog ブログのエントリは見つけられませんでした。確度の高い状況証拠(筆者の過去のブログの記述・softprops/action-gh-release ドキュメントの現在の注意書き)からの推測である点はご承知おきください。
:::

## さいごに
以上、Immutable releases の仕様変更によりリリース用ビルドパイプラインがいつの間にか壊れていた話でした。
今回は v3.8.0 から v3.9.2 へのアップデートになりましたが、v3.9.0 と v3.9.1 は immutable なリリースにタグ名を奪われたことで使い捨てになっています。実際のアプリコードの変更は CWE-918 (SSRF) の修正など軽微な修正のみ。残りはすべてこのワークフロー周りの修正によるバージョン消費でした。

Matrix ビルドはジョブを並列化する有効な手段ですが、Immutable Releases のようにリソースを固定化してしまう機能と併用する際は注意が必要ということがわかりました。Immutable Release 自体はよりセキュアになっていると思いますので、安心して使っていただいてよいと思います。
