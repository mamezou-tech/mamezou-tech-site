---
title: 全ユーザーに公開された GitHub Codespaces で Codespace Templates を使ってみる
author: masahiro-kondo
date: 2022-11-11
tags: [GitHub, Codespaces, vscode]
---

5月の「[GitHub Codespaces を使いはじめる](/blogs/2022/05/18/start-using-codespaces/)」の記事時点ではパプリックベータでしたが、11月9日に全ユーザーにロールアウトされフリープランは月60時間まで無料となりました。個人ユーザーはベータ期間中無料で使えていましたが、引き続き利用できることになります。

[Codespaces for Free and Pro Accounts | GitHub Changelog](https://github.blog/changelog/2022-11-09-codespaces-for-free-and-pro-accounts/)

使用制限を超えた場合の利用料金は以下を参照してください。

[About billing for GitHub Codespaces](https://docs.github.com/ja/billing/managing-billing-for-github-codespaces/about-billing-for-github-codespaces)

11月9日から Codespace Templates も利用可能になりました。React、Next、Ruby on Rails といった人気フレームワークに加え、Jupyter Notebook の Codespace も利用できるようになっています。これらの Template では必要な VS Code Extension などの設定があらかじめ組み込まれた環境を素早く構築でき、すぐに開発に取り掛かれるようになっています。

[Codespace Templates | GitHub Changelog](https://github.blog/changelog/2022-11-09-codespace-templates/)

GitHub の `Codespaces` タブで `Templates` をクリックすると選択可能な Templates が表示されます。

![テンプレート選択画面](https://i.gyazo.com/7031c30635ef6d95010598ae70359052.png)

Preact の Template を使って Codespace を起動してみました。Preact のプロジェクトが展開され、開発サーバーやプレビューが起動した状態で使い始めることができます。

![Preact Codespace](https://i.gyazo.com/16eb1b27d8be2d14aacdd1937b333cbe.png)

プレビューは Codespace 固有の URL で Serving されており、別タブで開けば Chrome などのデベロッパーツールでデバッグも可能です。

![プレビューを別タブで表示](https://i.gyazo.com/9a419142096b9cdf4b4500c0a479c978.png)

Preact のプロジェクトのテンプレートリポジトリの内容を Codespace のローカル環境に展開しているようです。

[GitHub - github/codespaces-preact](https://github.com/github/codespaces-preact)

Codespace 内のローカルリポジトリにコミットされており、リモートリポジトリとの紐づきはない状態です。GitHub にリポジトリを作って push すれば永続的に開発を進められます。

![bash画面](https://i.gyazo.com/3989453f8713eaa8d9b671805e379142.png)

Codespace の設定は、`.devcontainer/devcontainer.json` に定義されています。ポートフォワードの設定や、Codespace 起動時に開くファイルの設定があり、Codespace に接続した時に起動する package.json の npm script の指定などが書かれていますのでこれをベースにカスタマイズも可能です。

```json
{
  "hostRequirements": {
    "cpus": 4
  },
  "waitFor": "onCreateCommand",
  "updateContentCommand": "npm install",
  "postCreateCommand": "",
  "postAttachCommand": {
    "server": "npm run dev"
  },
  "customizations": {
    "codespaces": {
      "openFiles": [
        "src/routes/home/index.js",
        "src/components/app.js"
      ]
    }
  },
  "portsAttributes": {
    "8080": {
      "label": "Application",
      "onAutoForward": "openPreview"
    }
  },
  "forwardPorts": [8080]
}
```

VS Code のメニューとコードスペースのメニューは画面左上のハンバーガーメニューからアクセスできます。

![メニュー](https://i.gyazo.com/6e6c1b1740e5d90e48dfcaf861a35c73.png)

Codespaces のリストから作成した Codespaces に対して停止や削除などの操作を行えます。

![Codespacesの管理画面](https://i.gyazo.com/85dc41c1a0ebab039f83016ada1943d4.png)

Jupyter Notebook の Codespace も起動してみました。サンプルの Notebook やデータなどが格納されています。

![Jupyter Notebook](https://i.gyazo.com/20ca06cf21b658e6d92899dca6adbbda.png)

Nodebook を開いて実行。

![population.ipynb](https://i.gyazo.com/1b31fb904ead032a02f220201c3c75ee.png)

VS Code の Jupyter Extension などがプリインストールされています。

![Jupyter Extensions](https://i.gyazo.com/c4253cac722cb0f5d898618c0d412fb6.png)

`.devcontainer/devcontainer.json` には、Extension の指定や pip によるライブラリ更新のコマンド定義などがありました。

```json
{
  "hostRequirements": {
    "cpus": 4
  },
  "waitFor": "onCreateCommand",
  "updateContentCommand": "python3 -m pip install -r requirements.txt",
  "postCreateCommand": "",
  "customizations": {
    "codespaces": {
      "openFiles": []
    },
    "vscode": {
      "extensions": [
        "ms-toolsai.jupyter",
        "ms-python.python"
      ]
    }
  }
}
```
requirements.txt に必要なライブラリを書いて更新すれば、すぐに作業に取りかかれます。

```text
ipywidgets==7.7.1
matplotlib
numpy
pandas
torch
torchvision==0.13.1
tqdm==4.64.0
```

以上、正式公開された GitHub Codespaces の Templates を使ってみました。ローカルに開発環境を整えなくても「リモートにサクッと環境を作って作業を開始、ある程度進んできたら GitHub にリポジトリを作って作業を継続する」というワークフローが成立するので、作業を開始する障壁がぐっと下がった感じがしますね。
