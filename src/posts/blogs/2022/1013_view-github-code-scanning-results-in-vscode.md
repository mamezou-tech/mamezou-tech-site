---
title: GitHub code scanning 結果を VS Code で確認できる SARIF Viewer 拡張
author: masahiro-kondo
date: 2022-10-13
tags: [codeql, GitHub, vscode, Security]
---

以前「[GitHub の脆弱性検出機能 Code scanning alerts と CodeQL について](/blogs/2022/06/20/github-code-scanning-and-codeql/)」という記事で Code scanning alerts を設定して確認する方法を紹介しました。

先日 VS Code (と Codespaces) で動作する VS Code 拡張 SARIF Viewer for Visual Studio Code についてのブログが公開されました。

[View GitHub code scanning findings directly in VS Code and GitHub Codespaces | The GitHub Blog](https://github.blog/2022-10-11-view-github-code-scanning-findings-directly-in-vs-code-and-github-codespaces/)

SARIF Viewer 拡張を使用すると、Scanning 結果を VS Code 上で確認することができます。

:::info
SARIF(Static Analysis Results Interchange Format)は、静的解析結果を交換するための標準フォーマットです。

[Static Analysis Results Interchange Format (SARIF) Version 2.0](https://docs.oasis-open.org/sarif/sarif/v2.0/sarif-v2.0.html)
:::

[Sarif&#32;Viewer&#32;-&#32;Visual&#32;Studio&#32;Marketplace](https://marketplace.visualstudio.com/items?itemName=MS-SarifVSCode.sarif-viewer)

VS Code に SARIF Viewer 拡張をインストールし、Code scanning を有効にしているリポジトリを開くと、自動検出して以下のような通知が表示されます。

![](https://i.gyazo.com/2e38542b7658a1462e9689b4c7e5d41e.png)

`Connect` をクリックして、GitHub と接続すると、SARIF Results パネルが開き、VS Code 内で結果をブラウズすることができます。

![SARIF Results パネル](https://i.gyazo.com/8cc834139c85fd17d1b8cade8010fc4a.png)

.vscode/settings.json に以下の設定が保存されました。この設定を書いておけば、起動時にコネクトしてくれます。

```json
{
  "sarif-viewer.connectToGithubCodeScanning": "on"
}
```
VS Code ではスキャン結果とコード箇所を連動させて閲覧できます。この例では、URL の正規表現で `.` がエスケープされていないためにより多くのホスト名とマッチしてしまうという脆弱性の指摘でした。

![VSCode上でのアラート表示](https://i.gyazo.com/e30ab9b55f6afd3bf7ba85b3f1953d97.png)

GitHub 上でもアラートが表示されていました。

![GitHubでのアラート表示](https://i.gyazo.com/60521553644d43129e8e89019cd39ed5.png)

ということでコードを修正して commit / push します。CodeQL のワークフローが実行され、GitHub 側のスキャン結果が更新されました。

![再スキャン結果](https://i.gyazo.com/d96c54981d1a4043bef214c7016c7ba3.png)

VS Code の SARIF Results の `Refresh results` をクリックすると、こちらでも Alert が表示されなくなりました。

![VSCode上の再スキャン結果](https://i.gyazo.com/377db0faed5aa7b32785707555605ddc.png)

冒頭のブログの説明にはこうあります。

> (コードスキャンの)結果を IDE に取り込むことで、開発者はコンテキストを切り替えずに作業できます。そして修正がいったん GitHub にプッシュされると GitHub Code scanning が確認してマージに青信号を出すことができます。Pull Request scanning と IDE での結果のコンビネーションにより、脆弱性の防止はさらにシームレスになります。

確かに静的コード分析の結果はレポートをわざわざ開いて確認しない開発者も多いので、手元の IDE で確認できるようにすると対応も捗りそうですね。
