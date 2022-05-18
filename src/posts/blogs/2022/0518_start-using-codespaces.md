---
title: GitHub Codespaces を使いはじめる
author: masahiro-kondo
date: 2022-05-18
---

GitHub Codespaces は GitHub が提供するクラウド開発環境です。GitHub 社内で運用されていた Codespaces が間もなく一般にもリリースされそうです。

[Codespaces](https://github.co.jp/features/codespaces)

:::info
GitHub 社内の開発環境は昨年 Codespaces に移行し、社員の環境構築作業が劇的に改善されました。マシンスペックの変更も設定ファイルを1行書き換えるだけで完了するとのことです。社員からの評価も非常に高いようです。
[GitHub開発チームでのCodespacesの利用](https://github.blog/jp/2021-08-30-githubs-engineering-team-moved-codespaces/)
:::

現在パブリックベータで、申し込んだ人から順次使えるようになっている段階です。私のアカウントでもかなり前に申し込んでいてすっかり忘れていましたが、いつの間にか有効になっていました。

![](https://i.gyazo.com/b38112af4ae1fad0035a45a5e714b226.png)

Codespaces のページからリポジトリを選択して Codespace を作成することできますが、各リポジトリページの `Code` ボタンから直接作成することが可能です。

![](https://i.gyazo.com/b5e1478fa3dbd2781fbfecf08067b871.png)

Codespace を作成するときに構成をカスタマイズできる UI になっています。

![](https://i.gyazo.com/fcfee8f17ef440fa5dbc53f4de79bf2a.png)

今のところマシンのスペックは変更できませんでした。GitHub にコンタクトすれば、32-core のマシンが解放される模様です。

![](https://i.gyazo.com/c51dd700d0ad4966b38631e6c70c0b8b.png)

`Create codespace` をクリックするとプロビジョニングが始まりあっという間に VS Code のUI が起動してきました。プロビジョニング中のスクリーンショットを採取する暇もないほどでした。

![](https://i.gyazo.com/8da5ae5b8846391490b70227a4bba0b9.png)

Codespaces の画面で Codespace の一覧と状態を確認、起動や終了、削除などの操作を行えます。

![](https://i.gyazo.com/f8802cde4d6f24ec23466f8d722c046d.png)

Codespace の実体は、Microsoft の Linux Universal のコンテナイメージです。

[vscode-dev-containers/containers/codespaces-linux at main · microsoft/vscode-dev-containers](https://github.com/microsoft/vscode-dev-containers/tree/main/containers/codespaces-linux)

プリインストールされているプログラミング言語やプラットフォームは以下のようになっています。

- Python / Conda
- Node.js / JavaScript / TypeScript
- C++
- Java
- C#, F#, .NET Core
- PHP
- Go
- Ruby

インストールされている Go バージョンを確認すると最新の 1.18 です。イメージの更新も数日おきに行われている模様で、Codespace 作成時点のほぼ最新の環境が入手できることになります。

```shell
$ go version
go version go1.18.1 linux/amd64
```
Go のコードを開くとローカルの VS Code と同様、拡張のインストールを促されインストールできました。

![](https://i.gyazo.com/425388614ebaf3c74642213c80b2df08.png)

Codespaces の UI はデスクトップ PWA としてもインストール可能です。

![](https://i.gyazo.com/7dd459f4222cf2a9cd168d99be5d1fdc.png)

PWA だとほぼ VS Code です。

![](https://i.gyazo.com/cfbefa67c264a4a8944d5d8d69a2fd46.png)

PWA として起動しても、VS Code 専用のメニューは出ません。VS Code のショートカットキーが効くので、 `⌘ + ,` で Settings を開いて Minimap を消し Dark テーマに切り替えました。この設定は Codespace を停止しても残ります。

git config にはちゃんとアカウントの情報が反映されており、ターミナルでの Git 操作、commit / push も普通にできました。

Codespaces の一覧画面の操作メニューには `Open in Visual Studio Code` があり、VS Code でも利用できることがわかります。

![](https://i.gyazo.com/06b392637c7ed8e59fbf4d83612120a2.png)

VS Code で利用するには GitHub Codespaces 拡張が必要です。

![](https://i.gyazo.com/d95928ed94b375e0fc6e0c74034a52f5.png)

拡張をインストールして、GitHub で VS Code アプリを許可すると起動しました。Remote Development 拡張と同様な方式で Codespace に接続しているのでしょう。VS Code のフルメニューが利用できるため、この利用形態の方が便利そうです。

![](https://i.gyazo.com/0413ff3ce3413fe08f78999bf7ad345b.png)

以上、Go などで CLI アプリを書くのは簡単にできることがわかりました。では、Web アプリのデバッグはどうでしょう。これもポートフォワードにより簡単にできます。

Vue のプロジェクトを Codespaces で開き vue-cli-service で開発用サーバーを実行してみました。Codespace 内でサーバーが8080ポートで起動してきます。

![](https://i.gyazo.com/37b22440ac573430aba70ecd2734973a.png)

PORTの一覧を開くと Codespaces で起動している Vue のサーバーの PORT がフォワードされ、Local Address(Codespaces で発行されたURL) が利用可能になっています。

![](https://i.gyazo.com/d2fdf2972373efd07a9bf195969d51b4.png)

Local Address を開くと Codespace で実行されている Vue のアプリをローカルのブラウザでデバッグできます。

![](https://i.gyazo.com/7eb0cadffeb91ba1ce77e202e8735713.png)

VS Code で接続している場合は、`Foward Port` でポート番号を指定すればポートフォワードされます。

![](https://i.gyazo.com/e39749660db86e338fe77fa024a31811.png)

VS Code の場合、フォワード先アドレスは、127.0.0.1 になります。

![](https://i.gyazo.com/d612fc0d2d376259b0315a0fd65bed97.png)

詳細はドキュメントを参照してください。

[https://docs.github.com/ja/codespaces/developing-in-codespaces/forwarding-ports-in-your-codespace](https://docs.github.com/ja/codespaces/developing-in-codespaces/forwarding-ports-in-your-codespace)

これまで私は AWS Cloud9、Gitpod、CodeSandbox、Eclipse Che など様々な Web IDE を試してきましたが、Codespaces は流石に完成度が高いと感じました。突っかかるところが全くなく、使える環境がすぐに起動してきます。Microsoft の VS Code とクラウド技術が GitHub のサービスと高度に統合されていること、そして GitHub そのものが Codespaces を使って開発されている(ドッグフーディングされている)ことが、この完成度につながっているのではないでしょうか。

従量課金で[^1]素早く開発環境を起動して利用でき、VS Code からも使える Codespaces。導入を検討する価値は十分にあります。

[^1]: 現在のところ、個人のアカウントでの利用は課金されないようです。[https://docs.github.com/ja/billing/managing-billing-for-github-codespaces/about-billing-for-codespaces](https://docs.github.com/ja/billing/managing-billing-for-github-codespaces/about-billing-for-codespaces)

