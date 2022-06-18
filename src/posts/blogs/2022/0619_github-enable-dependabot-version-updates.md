---
title: GitHub の Dependabot version updates で依存ライブラリを継続的に更新する
author: masahiro-kondo
date: 2022-06-19
tags: ["GitHub"]
---

開発しているソフトウェアのコードベースを久々に変更しようとすると、使用しているライブラリのバージョンが古くなっていて、そのままだと作業継続できないという状況に陥ります。最新、またはメンテナンスされているバージョンを取り込んで動作確認するのに時間が取られてしまい、肝心のコードにたどりつかず、「明日から本気出す」ということよくありますよね。GitHub の Dependabot version updates を利用することで、継続的に依存関係のライブラリのアップデートに追従することができます。

Dependabot は依存ライブラリに脆弱性が発見された場合アラートを発砲したり、修正バージョンにアップデートする PR を発行したりする Bot です。この機能は、Profile の `Code security and analysis` で有効・無効化できます。

![](https://i.gyazo.com/d7e39ac6180a96c8601e841dac927485.png)

Dependabot は脆弱性に対応するアップデートだけでなく、使用しているライブラリを常に最新にしておくためにも利用できます。

[GitHub Dependabot のバージョンアップデートについて | GitHub Docs](https://docs.github.com/ja/code-security/dependabot/dependabot-version-updates/about-dependabot-version-updates)

Insights > Dependency graph > Dependabot のタブで設定できます。ちょっと気付きにくい画面遷移だったのですが、先日 UI が改善され、リポジトリの Settings > Code Security and analysis のタブから設定できるようになりました。

[Enable Dependabot version updates from the repository settings page | GitHub Changelog](https://github.blog/changelog/2022-06-02-enable-dependabot-version-updates-from-the-repository-settings-page/)

![](https://i.gyazo.com/287d1c386b79be2fe9e9b8a84444c2a8.png)

`Enable` をクリックすると、マニフェストファイル dependabot.yml の編集画面になります

![](https://i.gyazo.com/794091da77efc2694528b74d499034bb.png)

このリポジトリは Go Modules を使っているので、`package-ecosystem` に `gomod` を `directory` は go.mod があるプロジェクトルートを指定しました。`schedule` は `daily`、`weekly` などが選べますが、テンプレート通り `daily` を指定。更新時刻やタイムゾーンも指定できます。


```yaml
version: 2
updates:
  - package-ecosystem: "gomod"
    directory: "/"
    schedule:
      interval: "daily"
      time: "07:00"
      timezone: "Asia/Tokyo"
```

この他、`target-branch` で `develop` など特定のブランチを指定することも可能です。`main` ブランチに PR を取り込んでビルドが壊れてしまうなどの影響が懸念される場合に設定できます。

設定値方法やオプションの詳細については、以下のドキュメントを参照してください。

- [Configuring Dependabot version updates | GitHub Docs](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuring-dependabot-version-updates)
- [Configuration options for the dependabot.yml file | GitHub Docs](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)

dependabot.yml をコミットした後は、Configure ボタンから設定を変更できます。

![](https://i.gyazo.com/eafaafcc96edc0062ace329e2b26488b.png)

もちろん、ローカルで dependabot.yml を修正して commit/push しても同じです。

Insights の画面でも Go Modules が有効になっていることがわかります。

![](https://i.gyazo.com/dfa2e800796041b174a0cc549cf5eb56.png)

設定したら早速 PR が来ました。

![](https://i.gyazo.com/40d13f849908087fd535b68342b6aa4f.png)

Go の CLI の引数を処理するフレームワーク cobra のバージョンを上げる PR です。

![](https://i.gyazo.com/142f561da68352703cdbadb527691faa.png)

ライブラリバージョンの更新を Dependabot で定期的に行うことで、メンテナンス作業が楽になります。PR が作成された時にビルド・テストする CI を整備しておくことで、安心してマージできるようになります。継続的にメンテナンスしているソフトウェアのリポジトリには設定しておくとよいでしょう。
