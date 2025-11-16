---
title: GitHub の Immutable releases でリリースを変更不可にする
author: masahiro-kondo
date: 2025-11-16
tags: [GitHub, Security]
image: true
---

## はじめに
先月 Immutable releases が GA になりました。

@[og](https://github.blog/changelog/2025-10-28-immutable-releases-are-now-generally-available/)

これによりリリースが公開後に変更されていないことを確認でき、改ざんや偶発的な変更を回避できるようになります。

## 変更不可リリースの特徴
ドキュメントは以下で参照できます。

@[og](https://docs.github.com/ja/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases)

変更不可リリースは以下のような特徴があります。

- **Git タグは移動または削除できない**：リリースに関連付けられている Git タグは特定のコミットにロックされ、変更または削除することはできなくなります。
- **リリースアセットを変更または削除することはできない**:リリースにアタッチされているすべてのファイルは、変更または削除から保護されます。

リリース構成証明が自動的に生成され、リリース タグ、コミット SHA、アセットなどの検証が可能になります。 

変更不可リリースが有効な場合、そのリポジトリを削除し、同じ名前の新しいリポジトリを作成した場合でも、元のリポジトリの変更不可リリースに関連付けられたタグを再利用することはできなくなります。これは強力な保護機能ですね。

## 使ってみる
筆者がメンテナンスしている野良 Cosense アプリ [sbe](https://github.com/kondoumh/sbe) のリポジトリで設定してみました。

![Enable release immiutability](https://i.gyazo.com/b351baf2f4f29e26c64597ec1d75aa90.png)

:::info
Immutable releases は、リポジトリ単位、オーガニゼーション単位で設定可能です。
:::

一度リリースしてしまうとリポジトリのコミッタでも変更はできないため、以下のようにドラフトリリースで作業する手順が推奨されています。

- ドラフトリリースを作成
- 全てのアセットをドラフトリリースにアタッチ
- ドラフトリリースを正式リリースにする

ちょうど sbe の変更が溜まっていたので、ベストプラクティスに従ってリリースドラフトを作成します。

![Create draft release](https://i.gyazo.com/c7fcc3d69b5bb2f6f6dbef04ae2d05a5.jpg)

保存されたドラフトリリースはまだ非公開で変更可能です。

![Draft release](https://i.gyazo.com/a69962e36213d6f0820ba38b6bea38dd.png)

:::info
このアプリのリリース用ワークフローではタグ作成を契機にリリースを作るようにしています。
[softprops/action-gh-release](https://github.com/softprops/action-gh-release) という Action を使っています。リリース成果物のアタッチもやってくれます。`prerelease` を `true` にすることで、ドラフトリリースを作成してくれます。

```yaml
    - name: Publish
      uses: softprops/action-gh-release@v2
      with:
        files: |
          dist/**/*.exe
          dist/**/*.deb
          dist/**/*.AppImage
          dist/**/*.dmg
        prerelease: true
```
:::

添付ファイルや差分を指差し確認してリリースを発行します。

![Publish release](https://i.gyazo.com/c6ba06e4e593492a3d301f5f5c60c27f.png)

Immutable release を有効にしていると確認のダイアログが出ます。

![Confirm to publish](https://i.gyazo.com/2dc74c05ef35a8631210c4475aafea27.png)

発行されたリリースには Immutable マークが付きました。

![Immutable mark](https://i.gyazo.com/c7643b4b1199ee15394c3bc50f06fbbc.png)

アセットには、リリースの attestation (証明) の JSON ファイルも追加されています。

![Release attestation](https://i.gyazo.com/b32ab0187a63223535352a5478133ef6.png)

編集画面では、リリースの説明などは編集可能ですが、タグやアセットは編集できない旨のメッセージが表示されます。

![Cannot Edit tag or asset](https://i.gyazo.com/ba4249ba6e4e2110f45c67a7a3be7ae1.png)

## リリースを検証する
利用者は Immutable release で作成された変更不可リリースを GitHub CLI で検証できます。

@[og](https://docs.github.com/ja/code-security/supply-chain-security/understanding-your-software-supply-chain/verifying-the-integrity-of-a-release?utm_medium=changelog&utm_campaign=universe25)

リリースが存在し、かつ不変であることを検証するには、クローンしたリポジトリのディレクトリ内で release verify コマンドを実行します。

```shell
gh release verify RELEASE-TAG
```
sbe の v3.8.0 リリースを検証すると GitHub API を使って証明を読み取り表示してくれます。

```shell
$ gh release verify v3.8.0

Resolved tag v3.8.0 to sha1:1f3f380d33f022230046a3200a67950ea027c8a1
Loaded attestation from GitHub API
✓ Release v3.8.0 verified!

Assets
NAME                     DIGEST                                                                 
sbe-3.8.0-universal.dmg  sha256:ab1c2595601136bf82aa7594d48bc764fe6f226ed1071c52441eb531f34e0252
sbe-3.8.0.AppImage       sha256:de1797b12152531df71e78519d660e32e1a79dca203bc3201d85b2facfe4b5a9
sbe-Setup-3.8.0.exe      sha256:a4a8d6fe8ddde6e1a2005a29d7e2759511cb537427e4a0ff03440c5e9f48fb94
```

ローカルにある成果物がリリース成果物と完全に一致していることを検証するには release verify-asset コマンドを使用します。

```shell
gh release verify-asset RELEASE-TAG ARTIFACT-PATH
```

リリースのアセットから Linux 用 AppImage バイナリをダウンロードして検証してみました。

```shell
$ gh release verify-asset v3.8.0 ~/Downloads/sbe-3.8.0.AppImage 

Calculated digest for sbe-3.8.0.AppImage: sha256:de1797b12152531df71e78519d660e32e1a79dca203bc3201d85b2facfe4b5a9
Resolved tag v3.8.0 to sha1:1f3f380d33f022230046a3200a67950ea027c8a1
Loaded attestation from GitHub API

✓ Verification succeeded! sbe-3.8.0.AppImage is present in release v3.8.0
```

:::info
アセットの証明には Sigstore の署名技術が利用されています。ソフトウェアの出所情報を検証可能し、ソフトウェアサプライチェーンの安全性を高めるための技術です。かなり前の記事ですが以下で紹介しています。

@[og](https://developer.mamezou-tech.com/blogs/2022/08/17/github-actions-workflows-for-software-supply-chain-security/)
:::

## さいごに
以上、Immutable releases の紹介でした。一定数ユーザーがいる OSS では変更不可リリースを採用する方がいいでしょう。

GitHub Actions でもサードパーティの Action を利用する際は、不意な変更の影響を受けないためにバージョンだけでなくコミットハッシュまで指定して固定することもあります。変更不可リリースを採用してくれる Action が増えれば使う側も安心ですね。
