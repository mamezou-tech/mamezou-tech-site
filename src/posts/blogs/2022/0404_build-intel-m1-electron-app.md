---
title: "Intel / M1 Mac で動作する Electron バイナリを作る - 2022.4"
author: masahiro-kondo
date: 2022-04-04
tags: electron
---

M1 Mac では Rosetta により Intel Mac 用のバイナリを動かせますが、できれば Apple Silicon 用のバイナリを提供したいところです。

electron-builder は M1 Mac にも対応しており、Intel Mac と M1 Mac でクロスコンパイル可能です。

[GitHub - electron-userland/electron-builder: A complete solution to package and build a ready for distribution Electron app with “auto update” support out of the box](https://github.com/electron-userland/electron-builder)

Intel Mac でビルドしても M1 Mac 用のバイナリが生成できます(実行はできません)。

M1 Mac 用のビルド。

```shell
npx electron-builder --dir --mac --arm64
```

Intel Mac 用のビルド。

```shell
npx electron-builder --dir --mac --x64
```

Intel / M1 両方で実行できるユニバーサルビルドもできます。

```shell
npx electron-builder --dir --mac --universal
```

両プラットフォーム用の実行イメージを含むためファイルサイズは2倍近い大きさになりますが、起動するプロセスのサイズが2倍になるわけではないので気になりません。

:::alert:配布形式の選択
手元で動かす分にはユニバーサルビルドで問題ありませんが、配布については、ダウンロード時間が変わってくるので、ユニバーサルにするか各プラットフォーム向けに専用のバイナリを提供するかは検討した方がよいでしょう。
:::

ビルドオプションにより、以下のようなディレクトリ構成で実行ファイルが生成されます。Intel 向けはサフィックスが付きません。

```
dist
  ├── mac
  │     └── xx.app
  ├── mac-arm64
  │     └── xx.app
  ├── mac-universal
  │     └── xx.app
```

各プラットフォーム向けのインストーラーは `--dir` オプションを付けないで実行すると生成されます。

macOS 12.3 (Monterey) のマシンでインストーラーを作ろうとすると下記のエラーが出て dmg ファイルが生成できません。

```shell
$ npx electron-builder --mac --universal 
  • electron-builder  version=22.14.13 os=21.4.0
  • loaded configuration  file=package.json ("build" field)
  • writing effective config  file=dist/builder-effective-config.yaml
  • packaging       platform=darwin arch=x64 electron=14.2.9 appOutDir=dist/mac-universal--x64
  • packaging       platform=darwin arch=arm64 electron=14.2.9 appOutDir=dist/mac-universal--arm64
  • packaging       platform=darwin arch=universal electron=14.2.9 appOutDir=dist/mac-universal
  • skipped macOS application code signing  reason=cannot find valid "Developer ID Application" identity or custom non-Apple code signing certificate, it could cause some undefined behaviour, e.g. macOS localized description not visible, see https://electron.build/code-signing allIdentities=     0 identities found
                                                Valid identities only
     0 valid identities found
  • building        target=macOS zip arch=universal file=dist/xxx-universal-mac.zip
  • building        target=DMG arch=universal file=dist/sbe-2.6.4-universal.dmg
  • Detected arm64 process, HFS+ is unavailable. Creating dmg with APFS - supports Mac OSX 10.12+
  • building block map  blockMapFile=dist/sbe-2.6.4-universal-mac.zip.blockmap
  ⨯ Exit code: ENOENT. spawn /usr/bin/python ENOENT  failedTask=build stackTrace=Error: Exit code: ENOENT. spawn /usr/bin/python ENOENT
    at /Users/masahiro-kondo/dev/xxx/node_modules/builder-util/src/util.ts:133:18
    at exithandler (node:child_process:406:5)
    at ChildProcess.errorhandler (node:child_process:418:5)
    at ChildProcess.emit (node:events:520:28)
    at Process.ChildProcess._handle.onexit (node:internal/child_process:289:12)
    at onErrorNT (node:internal/child_process:478:16)
    at processTicksAndRejections (node:internal/process/task_queues:83:21)
```

Python を起動しようとしてエラーになっているようです。electron-builder の issue がありました。

- [macOS 12.3 Beta has removed the Python 2 support: spawn /usr/bin/python ENOENT · Issue #6606 · electron-userland/electron-builder](https://github.com/electron-userland/electron-builder/issues/6606)
- [Exit code: ENOENT. spawn /usr/bin/python error after updating macOS · Issue #6726 · electron-userland/electron-builder](https://github.com/electron-userland/electron-builder/issues/6726)

dmg ファイル生成スクリプトが Python 2 に依存していて Monterey で Python 2 が完全に駆逐されたのが原因のようです。

こちらの [issue コメント](https://github.com/electron-userland/electron-builder/issues/6726#issuecomment-1069847112)にあるように Python 2 がインストールされたマシンなら環境変数 `PYTHON_PATH` を定義することでこのエラーを回避できます。

```shell
export PYTHON_PATH=/usr/local/bin/python
```

古い macOS からアップグレードした場合は Python 2 がインストールされています。しかし、新規購入の場合や macOS 12.3 をクリーンインストールした場合はインストールされていません。現在は HomeBrew でも Python 2 はインストールできなくなっています。無理矢理入れられなくはないですが、せっかくシステムから駆逐されものを復活させる行為でちょっと(というか、かなり)抵抗があります。

記事執筆時点では Pre-release ですが、electron-builder v23 に Python3 で動かす PR がマージされています。

[fix(dmg-builder): Support python 3 by mmaietta · Pull Request #6617 · electron-userland/electron-builder](https://github.com/electron-userland/electron-builder/pull/6617)

ということで、v23.0.3 をインストールして実行すると無事 dmg ファイルも生成されました。

```
dist
  ├── mac-universal
  │     └── xx.app
  └── xxx-0.1.0-universal.dmg
```

:::column:GitHub Actions Runner の macOS バージョン

GitHub Actions で electron-builder を使ってリリース用 CI を作っている場合、GitHub Actions Runner の macOS バージョンが気になるところです。記事執筆時点では、Mac の Runner(`macos-latest`) は macOS 11 Big Sur です。

[GitHub Actions&#058; Jobs running on `macos-latest` are now running on macOS Big Sur (11). | GitHub Changelog](https://github.blog/changelog/2021-09-29-github-actions-jobs-running-on-macos-latest-are-now-running-on-macos-big-sur-11/)

Monterey を使うには `macos-12` を明示的に指定する必要があります。

electron-builder はバージョンアップすれば OK ですが、`macos-latest` が Monterey にアップデートされたら色々なビルドが壊れそうな予感がします。そこで macos-12 の runner のインストールソフトウェアを見てみると Python 2 も入っていました。

[virtual-environments/macos-12-Readme.md at main · actions/virtual-environments](https://github.com/actions/virtual-environments/blob/main/images/macos/macos-12-Readme.md)

GitHub Actions で Python 2 がいきなり使えなくなるということはなさそうです(Python 2 撲滅のためにはいいこととは言えませんが)。
:::