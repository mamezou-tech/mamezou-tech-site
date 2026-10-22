---
title: 自作 VS Code 拡張をまた3年ぶりにアップデート 〜過去の自分と AI に助けてもらった話〜
author: masahiro-kondo
date: 2026-10-23
tags: [vscode, 個人開発]
image: true
---

## はじめに
3年ちょっと前に自作の VS Code 拡張を更新した記事を書きました。VS Code の拡張を Marketplace に公開するには、日頃全然使わない Azure DevOps のプロジェクトで PAT(Personal Access Token)を発行する必要があり、その手順が超絶がわかりにくかったので自分用のメモとして残したものです。

@[og](/blogs/2023/07/11/update-vs-code-extension/)

筆者が公開している VS Code 拡張は ChangeLog を書くことを支援するものです。

@[og](https://marketplace.visualstudio.com/items?itemName=kondoumh.changelog-support)

GitHub リポジトリはこちらです。

@[og](https://github.com/kondoumh/changelog-support)

:::info
前の記事にも書きましたが、Markdown の CHANGELOG.md ではなく、Emacs などでサポートされている (Markdown 登場以前からある) ChangeLog フォーマットを扱うものです。ChangeLog を日々の作業のログ・メモとして活用するというための拡張です。
:::

## 初めての機能拡張リクエスト

この Marketplace で星もついてない、5年間で620件ぐらいしかダウンロードされていない弱小 Extension に 先日 enhancement issue が3つも登録されていました。

- [auto-complete / go to filenames · Issue #27 · kondoumh/changelog-support](https://github.com/kondoumh/changelog-support/issues/27)
- [setting language "none" to not insert weekday · Issue #28 · kondoumh/changelog-support](https://github.com/kondoumh/changelog-support/issues/28)
- [add outline · Issue #29 · kondoumh/changelog-support](https://github.com/kondoumh/changelog-support/issues/29)

**auto-complete / go to filenames · Issue #27**

「ChangeLog のアイテム入力中に、ファイル名を補完したり、更にファイル内の関数などのシンボル(トークン)の入力もアシストしてほしい。さらに当該ファイルにジャンプする機能も欲しい。」という要望でした。自分のユースケースでは使わないですが、よく IDE にある機能ですし面白そうなので対応することにしました。ディレクトリ内のファイル列挙やパースの実装が肝になりそうです。VS Code 拡張で実装するには、CompletionProvider や DefinitionProvider にこれらの情報を渡す必要があるようです。

**setting language "none" to not insert weekday · Issue #28**

changelog-support では日付のエントリを出力する機能があり、曜日を日本語で出すか英語で出すかを `dayOfWeekLang` オプションの `en/ja` 切り替えで指定していました。

`en` の場合
```
2026-10-23 Fri <kondoumh@local>
```

`ja` の場合、

```
2026-10-23 (金) <kondoumh@local>
```

`dayOfWeekLang` のオプションに `none` を追加して曜日を出さないオプションを追加して欲しいという内容でした。シンプルな内容なので対応することにしました。

**add outline · Issue #29**

ChangeLog のアウトライン構造を、VS Code 標準のアウトラインウィジェットに表示して欲しいという内容です。アウトラインは DocumentSymbolProvider を使って実装する模様。拡張の機能としてはリッチ感も出るので、これも対応することにしました。

## 成果

### #27 ファイル名トークン補完とジャンプ
ChangeLog のアイテム `* hoge:` の入力中、ディレクトリ内の ChangeLog ファイルからの相対パスにあるファイルから入力中アイテムにマッチするファイルを列挙し、選択時に補完。さらに `* hoge()` の入力を検知したらファイル内をパースしてシンボルを列挙。アイテム右クリックでファイルジャンプできるようになりました。自分では使わないけど便利そうです☺️

![filename completion](/img/blogs/2026/1023_update-my-vscode-extension-after-3years/filename-completion.gif)

### #28 日付エントリに曜日を出さないオプションを追加
これはシンプルな機能なので割愛。

### #29 アウトライン表示

ChangeLog の内容がアウトライン表示されるようになりました。拡張っぽくてかっちょいい😄

![Outline view](/img/blogs/2026/1023_update-my-vscode-extension-after-3years/outline-view.png)

:::column:さらなるリクエスト
enhancement issue を登録してくれた人が「せっかくだから VSX Registry にも公開してよ。」っていうリクエストの issue を登録してました。Marketplace へのアクセスが阻まれている時や VS Code 互換の Web IDE に拡張を入れたい時などには VSX が簡単に入手できるようにしておくと便利なんでしょうね。

[FR: please co-publish on Open VSX Registry · Issue #34 · kondoumh/changelog-support](https://github.com/kondoumh/changelog-support/issues/34)

これは次のリリース時にでも対応したいと思います。
:::

## Marketplace への公開手順のアップデート

前回の記事のとほぼ同じ手順で Azure DevOps プロジェクトで公開用の Personal Access Token を発行。UI は多少変わってましたが、なんとか迷わずにたどり着けました。

前回は vsce コマンドは、npm でグローバルインストールしてましたが、npx でサクッと実行する方がスマートでした。

```shell
npx @vscode/vsce login <publisher-name>

npx @vscode/vsce publish
```

:::info
今回は、バージョンを 0.3.0, 0.3.1 と上げましたが、npm の version サブコマンドを使いました。

```
npm version 0.3.0
```

package.json（+ lockfile）更新、コミット、タグ作成まで一気にやってくれます。こんな便利なコマンドがあるの知りませんでした（Copilot さんに教えてもらいました）。
Node.js 何年使ってるねんって感じですが、まあこんなもんです。
:::

package.json の `engines.vscode` のバージョン(以下の例では 1.80.0)を devDependencies の `@types/vscode` のバージョンと整合させないといけないのを把握しておらず、公開時にエラーでハマりました。このバージョン指定は新しければよいというものでもなく、サポートする VS Code の最古バージョンを指定するので注意が必要です。

```json:package.json
{
  "name": "changelog-support",
  "description": "Extension to support writing ChangeLog.",
  "version": "0.3.1",
  "publisher": "kondoumh",
  "engines": {
    "vscode": "^1.80.0"
  },
  :
  "devDependencies": {
    "@types/vscode": "1.80.0",
  },
```

## さいごに

前回記事のおかげで、Marketplace への公開時に浦島太郎にならずに済みました。やはりブログは自分用の記録としても書いておいた方がいいですね。

熱心なユーザー？から機能拡張リクエストをもらうと、やはり作者としてはモチベが上がりますね。
今回は、ファイルのパース部分とか、アウトライン構造の構築などで、ゴリっとコードが増えてましたが、AI が既存コードも理解してやってくれるので、3つの issue の対応は要件把握からテストまで含めて2時間ぐらいで終わりました。
個人開発の OSS でも issue 到着からリリースまでのリードタイムが短縮できますね。
