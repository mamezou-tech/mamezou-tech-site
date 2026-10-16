---
title: 自作 VS Code 拡張をまたまた3年ぶりにアップデート
author: masahiro-kondo
date: 2026-10-14
tags: [vscode]
---

## はじめに
3年ちょっと前に自作の VS Code 拡張を更新した記事を書きました。VS Code の拡張を Marketplace に公開するには、日頃全然使わない Azure DevOps のプロジェクトで PAT(Personal Access Toke)を発行する必要があり、その手順が超絶がわかりにくかったので自分用のメモとして残したものです。

@[og](/blogs/2023/07/11/update-vs-code-extension/)

筆者が公開している VS Code 拡張は ChangeLog を書くことを支援するものです。

@[og](https://marketplace.visualstudio.com/items?itemName=kondoumh.changelog-support)

:::info
前の記事にも書きましたが、ChangeLog の書式を日々の作業のログというかメモとして活用するという「ChangeLog メモ」のための拡張です。ソフトウェアの CHANGELOG.md を書くことを支援するものではありません。
:::

## 初めての機能拡張リクエスト

Marketplace で星もついてない、5年ぐらいで620件ぐらいしかダウンロードされていない弱小 Extension に issue が3つも登録されていました。

- [auto-complete / go to filenames · Issue #27 · kondoumh/changelog-support](https://github.com/kondoumh/changelog-support/issues/27)
- [setting language "none" to not insert weekday · Issue #28 · kondoumh/changelog-support](https://github.com/kondoumh/changelog-support/issues/28)
- [add outline · Issue #29 · kondoumh/changelog-support](https://github.com/kondoumh/changelog-support/issues/29)

Changelog

**kondoumh/changelog-support#27**

ファイル名/トークン補完、Go to（参照ジャンプ）

価値: GNU形式を使う人には非常に強い
実装: 最も大きい（CompletionProvider + DefinitionProvider + 参照形式の仕様決め）
優先度: 中（段階導入推奨）

これは知らなかったんですが、ChangeLog はソフトウェアの変更情報を書くためのものなので、ファイル名を補完出来たら、更にファイル中の関数などのシンボルに飛べたら、便利なんだろうなと。自分のユースケースでは使わないですが、面白そうなので追加することにしました。

**kondoumh/changelog-support#28**

dayOfWeekLang に none を追加して曜日を出さない

価値: すぐ分かる・すぐ使える改善
実装: 比較的簡単（設定 enum 追加 + createHeadline の分岐）
優先度: 高（先に出しやすい）

**kondoumh/changelog-support#29**
Outline 表示（日時、summary、必要なら bullet の先頭タグ）

価値: 長い ChangeLog の可読性がかなり上がる
実装: DocumentSymbolProvider 実装が必要、parser ルール設計が肝
優先度: 中〜高（価値大、工数中）

アウトラインは VS Code のアウトラインに対して ChangeLog の構造を渡すだけで実装できてしまう

## 実装

ということで、#28 と #29 から対応していきました。

## 公開手順のアップデート

前回のブログとほぼ同じで順で、Azure DevOps プロジェクトで公開用の Personal Access Token を発行

npm install -g v vsce

npx @vscode/vsce login <publisher-name>

npx @vscode/vsce publish


:::info
npm version 0.3.0

npm version で package.json（+ lockfile）更新、コミット、タグ作成まで一気にやってくれます。
こんな便利なコマンドがあるの知りませんでした。
Node.js 何年使ってるねんって感じですが、まあこんなもんです。
:::

@types/vscode と engines.vscode の整合ポイント が必要なのに気づかずハマってました。

## Open VSX Registry

[FR: please co-publish on Open VSX Registry · Issue #34 · kondoumh/changelog-support](https://github.com/kondoumh/changelog-support/issues/34)

## さいごに


今度は浦島太郎にはなりませんでした。記録しておいてよかったです。俺得記事でした。

今回、熱心なユーザーから機能拡張リクエストをもらったことで、やはり作者としてはモチベが上がりますね。
今は、AI が既存コードも理解して機能拡張もやってくれるので、個人開発の OSS でも issue 到着からリリースまでのリードタイムが圧縮できます。
ツール系なのでパッと対応して作ってもらって不具合やさらなる要望があったらフィードバック貰えばいいので、間違いが許容さにくい業務システムとは違う最適化プロセスがある気がします。
