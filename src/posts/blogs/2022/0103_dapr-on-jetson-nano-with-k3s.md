---
title: Dapr on Jetson Nano with k3s 
author: shigeki-shoji
date: 2022-01-03
tags: [container, k8s, ZTA, iot, "認証/認可", AWS]
---

[庄司](https://github.com/edward-mamezou)です。

マイクロサービスのように、多言語プログラミング (polyglot programming) が前提の環境では、認証認可やログのような横断的関心事 (cross-cutting concern) をアプリケーションのコードとして実装すると、各言語やフレームワークごとに移植が必要となり最新化への足かせとなります。

この記事では、分散アプリケーションランタイムの [Dapr](https://dapr.io/) によって [OpenID Connect](https://openid.net/connect/) の ID トークンの有効性の確認という横断的関心事の処理をアプリケーションコードの外側で実行するサンプルについて説明します。Jetson Nano のような IoT デバイス向けの Kubernetes としてフットプリントの軽い Rancher の [K3S](https://k3s.io/) を利用します。

# 準備

NVIDIA の [Jetson Nano Developer Kit](https://developer.nvidia.com/embedded/jetson-nano-developer-kit) に [K3S](https://k3s.io/) をインストールします。

その前に、まず `sudo` 時にパスワードの入力が不要になるように、`/etc/sudoers` を編集しておくと良さそうです。 ユーザ名が `user` の場合は次の行を追加します:

```shell
user ALL=(ALL) NOPASSWD: ALL
```

K3S のインストール。

```shell
curl -sfL https://get.k3s.io | sh -
```

Dapr の[インストール](https://docs.dapr.io/getting-started/install-dapr-cli/):

```shell
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
```

Helm の[インストール](https://helm.sh/ja/docs/intro/install/)。

```shell
curl https://helm.baltorepo.com/organization/signing.asc | sudo apt-key add -
sudo apt-get install apt-transport-https --yes
echo "deb https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt-get update
sudo apt-get install helm --yes
```

Dapr の初期化を実行します。

```shell
dapr init -k
```

Nginx の Ingress コントローラを Helm チャートを使ってインストールします。

```shell
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx
```

# サンプルプロジェクトの取得

[Amazon Cognito user pool](https://aws.amazon.com/jp/cognito/) を使用して取得した ID トークンを検証するサンプルプロジェクトを [GitHub](https://github.com/edward-mamezou/oidc-filter) からクローンします。

```shell
git clone https://github.com/edward-mamezou/oidc-filter.git
```

## Amazon Cognito user pool の Issuer URL と クライアント ID

Amazon Cognito user pool の Issuer URL はリージョン (REGION) と プール ID (POOL ID) から設定できます。

```shell
https://cognito-idp.<REGION>.amazonaws.com/<POOL ID>
```

クライアント ID は、アプリクライアント ID で表示されている値です。

この 2 つの値で、`dapr/deploy/oidc.yaml` と `dapr/deploy/exampleapp.yaml` を編集します。

## パイプラインの定義

まず、`dapr` ディレクトリに移動します。

```shell
cd dapr
```

次に、`oidc.yaml` と `pipeline.yaml` を適用します。

```shell
kubectl apply -f deploy/oidc.yaml
kubectl apply -f deploy/pipeline.yaml
```

## アプリケーションのデプロイ

アプリケーションと Ingress ルールをデプロイします。

```shell
kubectl apply -f deploy/exampleapp.yaml
kubectl apply -f deploy/ingress.yaml
```

# テスト

`kubectl get service` で、`NAME` が `ingress-nginx-controller`、`TYPE` が `LoadBalancer` の行を探します。`PORT(S)` の列で `80:<ポート番号>/TCP` となっている、ポート番号 (PORT NUMBER) を記録しておきます。

Amazon Cognito user pool の「ホストされた UI を起動」等でログイン画面を表示します。パラメータの `response_type` を `code` から `token` に変更してログインすると、ブラウザの URL の `id_token=` に ID トークンの値が表示されますのでこれを記録しておきます (ID TOKEN)。

最後に以下の `curl` コマンドを実行して確認します。

```shell
curl -v -H 'Authorization: Bearer <ID TOKEN>' http://localhost:<PORT NUMBER>/v1.0/invoke/exampleapp/method/hello
```

# まとめ

これまで、横断的関心事は、例えば、[Spring](https://spring.io/) であれば [Spring Security](https://spring.io/projects/spring-security/) 等の依存ライブラリに組み込まれた AOP 実装を使用してきました。これを、他のフレームワークに切り替えたり、Java 以外の言語による実装に切り替える場合には、検証や移植にコストがかかることを意味していました。

クラウドネイティブなアーキテクチャでは、この例のように実装言語に依存せず、ビジネス要件に集中することができるソリューションを活用していくことが可能となります。

# 参考

- [DaprのCNCFインキュベーターへの参加とYaron Schneider氏とのQ&A](https://www.infoq.com/jp/news/2021/11/dapr-joins-cncf/)
- [NIST SP 800-63-3 Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
- [NIST SP 800-207 Zero Trust Architecture](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-207.pdf)
- [OpenID Connect のメモ](https://s-edword.hatenablog.com/entry/2019/11/20/011812)
- [基本から理解するJWTとJWT認証の仕組み](/blogs/2022/12/08/jwt-auth/)
