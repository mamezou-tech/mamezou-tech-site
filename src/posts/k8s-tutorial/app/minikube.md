---
title: ローカル開発環境準備 - Kubernetes(minikube)
author: noboru-kudo
date: 2021-12-19
---

開発チームでKubernetesで動作するアプリケーションを開発する場合に、どうやって各開発者がコンテナ環境で動作するアプリケーションを実装・テストすればよいでしょうか？
各個人ごとにクラウド上にクラスタ環境を準備するのは、コスト的に難しいというのが一般的かと思います。
そのような場合は、コンテナ以前の開発ように各ローカルマシンでアプリケーションプロセスを起動して実装や動作確認を行い、実際のクラスタ環境での動作確認は結合試験等で実施することになります。
これでもいいのですが[^1]、やはり実際動作するコンテナ環境での動作確認やKubernetesのリソース(DeploymentやService等)自体の確認をローカル環境での実装の段階で実施できる方が圧倒的に効率的です。

[^1]: ローカルマシンのスペックや企業別のセキュリティポリシー等、様々な制約により実際このような開発スタイルとなることも多いことと思います。

ここではローカル環境でスモールバージョンのKubernetesを導入して、ここでアプリケーションを実際に動かして実装の段階で、より品質の高いコンテナ型アプリケーションを目指していきましょう。
ローカル環境でKubernetesを動かす方法はいくつかあります。
- [Docker DesktopのKubernetes](https://docs.docker.com/desktop/kubernetes/)
- [kind](https://kind.sigs.k8s.io/)
- [minikube](https://minikube.sigs.k8s.io/)
- [MicroK8s](https://microk8s.io/)
- [k3d](https://github.com/rancher/k3d)

上記だとDocker Desktopが最も使いやすく人気があると思いますが、残念ながら個人やスモールビジネス向けを除き有料化されてしまいました[^2]。

[^2]: <https://www.docker.com/blog/updating-product-subscriptions/>

これがネックとなり導入が難しい開発現場もあると思いますので、今回は上記の中でDocker Desktopを使用していないminikubeを導入しましょう。
minikubeはKubernetesコミュニティ(SIGs)で開発・運用されているソフトウェアで、ローカル環境向けのKubernetesとして歴史も古く最も成熟度の高いツールと言えます。

## minikubeセットアップ

こちらは以下の公式ドキュメントに従って準備します。
- <https://minikube.sigs.k8s.io/docs/start/>

ここではMacBook Proを使って説明しますが、minikubeはWindowsにも対応していますので、上記ドキュメントに従ってセットアップしてください(動作は未検証です)。

まずはminikubeが動作する仮想環境ソフトウェアを導入する必要があります。ここではHyperKitを選択します。
HyperKitはHomeBrewからインストールできます。

```shell
brew install hyperkit
```

次にminikube本体を導入します。こちらもHomeBrewからインストール可能です。

```shell
brew install minikube
```

ターミナルから`minikube`コマンドが使えない場合は、以下を実行します。

```shell
brew unlink minikube
brew link minikube
```

`minikube`コマンドが使えるかを確認しましょう。

```shell
minikube version
```

minikubeのバージョンが出力されていればインストール完了です。ここでは現時点で最新の`1.24.0`をセットアップしました。

---
参照資料

- minikube: <https://minikube.sigs.k8s.io/docs/>