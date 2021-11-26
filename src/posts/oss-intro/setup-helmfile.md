---
title: "setup-helmfile"
description: '豆蔵社員が開発するOSS紹介 setup-helmfile 編'
---
[setup-helmfile](https://github.com/mamezou-tech/setup-helmfile) は Github Actionsで [Helmfile](https://github.com/roboll/helmfile) を利用するための Action です。

Helmfile は、複数の Helm Chart を纏めて Kubernetes クラスタにインストールするツールです。インストールの順序制御や、インストールの前後にフックを挟んでちょっとしたスクリプトを実行させることもできます。複雑な構成のソフトウェア群のインストールを効率的に行える優れたツールです。

setup-helmfile は、この Helmfile を GitHub Actions のワークフローで利用できるようにインストールするアクションです。

CI でソフトウェアをテストするためだけでなく、ソフトウェアの(Chart のパラメータやスクリプトを含めた)インストール自体のテストにも使用できます。これによりインストール手順が正しく定義されているかを常にテストできます。

ワークフローでの利用例は以下のようになります。

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup helmfile
      uses: mamezou-tech/setup-helmfile@master
    - name: Deploy apps
      run: helmfile sync
```

Helmfile だけでなく、Helm や kubectl などのインストールもバージョンを指定して行えます。GitHub Actions の Ubuntu Runnner ではこれらのソフトウェアが予めインストールされているため必須ではありませんが、対象の Kubernetes のバージョンなどの制約で特定のバージョンに固定したいなどの要件がある場合便利です。AWS EKS を利用したテストを想定して kubectl については AWS 版のバイナリインストールするようにしています。

デフォルトでは Helm plugin として helm-diff, helm-git をインストールします。追加で任意の Helm plugin もインストール可能です。

詳しくは [README](https://github.com/mamezou-tech/setup-helmfile/blob/master/README.md) をご覧ください。

setup-helmfile は JavaScript Action として実装しています。

[JavaScript アクションを作成する - GitHub Docs](https://docs.github.com/ja/actions/creating-actions/creating-a-javascript-action)
