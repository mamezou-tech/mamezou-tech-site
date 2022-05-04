---
title: Mizu(水)でマイクロ−サービスのトラフィックを分析する
author: noboru-kudo
tags: [k8s, container]
date: 2022-05-04
---

Kubernetesでおもしろいツールを見つけたので、ご紹介したいと思います。
その名も**Mizu**です。ロゴを見れば分かるように日本語の「水」から名付けられたものです。

- <https://getmizu.io/>

その中身はPod間を流れるトラフィックをキャプチャし、可視化してくれるもので、多数のサービスで構成されるシステムの調査で強さを発揮しそうです。
対象のプロトコルもHTTPだけでなく、gRPCやKafka、AMQP、Redisをサポートします。

[[TOC]]

## Mizuのインストール
公式サイトにあるように、バイナリファイルをダウンロードするだけです。

- <https://getmizu.io/docs/installing-mizu/downloading-mizu-cli>

```shell
# Mac(Intel)の場合
curl -Lo mizu github.com/up9inc/mizu/releases/latest/download/mizu_darwin_amd64 && chmod 755 mizu
mizu version
> Version: 31.1 (main)
```

現時点で最新の`v31.1`をインストールしました。

## デモアプリのセットアップ

Mizuで解析するアプリケーションは公式ドキュメントでも使っているWeaveworks社が公開しているデモ用マイクロサービスを利用します。

- <https://microservices-demo.github.io/>

今回はこれをローカルのMinikubeにデプロイしました。

```shell
git clone https://github.com/microservices-demo/microservices-demo
cd microservices-demo
kubectl apply -f deploy/kubernetes/manifests
```

`sock-shop`というNamespaceにデモアプリがインストールされます。Podの状態を確認します。

```shell
kubectl get pod -n sock-shop
```
```
NAME                            READY   STATUS    RESTARTS   AGE
carts-7bbf9dc945-zkgtz          1/1     Running   0          39m
carts-db-67f744dd5f-7vl8d       1/1     Running   0          39m
catalogue-6479dbb5bd-kl9z7      1/1     Running   0          39m
catalogue-db-6b55d8cdb7-xt5pb   1/1     Running   0          39m
front-end-7f5c844b4c-78lpl      1/1     Running   0          39m
orders-74f65597c5-74s5j         1/1     Running   0          39m
orders-db-b76d8c54c-4v574       1/1     Running   0          39m
payment-c7df5b49-2jc8b          1/1     Running   0          39m
queue-master-9fc44d68d-jh8r5    1/1     Running   0          39m
rabbitmq-6576689cc9-9b5gh       2/2     Running   0          39m
session-db-695f7fd48f-dvd6p     1/1     Running   0          39m
shipping-79c568cddc-jq4dd       1/1     Running   0          39m
user-79dddf5cc9-pvtdj           1/1     Running   0          39m
user-db-b8dfb847c-tgmrl         1/1     Running   0          39m
```
全てのPodの実行を確認したら、ブラウザから`http://<minikube-ip>:30001/`にアクセスするとデモショッピングサイトが表示されます。
![](https://i.gyazo.com/11545a0163d545e8639fc307b1c637ee.png)

これで準備OKです。

## Mizuを起動する

Mizuの起動は非常に簡単です。`mizu tap`だけです。

```shell
# デモアプリがインストールされているNamespaceに限定
mizu tap -n sock-shop
```

すると、ブラウザが起動してMizuのUI(`localhost:8899`)が表示されます。

![](https://i.gyazo.com/2cd899ba517b53ab9a98476858bb406d.png)

左側にトラフィック通信の履歴が表示され、クリックすると右側でリクエスト、レスポンスの電文内容が確認できます。
上部のフィルタ機能はかなり細かく設定が可能で、必要なトラフィックに絞り込むことができます。

また、今回何も指定しませんでしたが、`mizu tap`コマンドで対象のPodを正規表現で絞ることもできます。
さらに、事前にTraffic Validationファイルを用意しておけば、一定のレスポンスタイム以上のものやレスポンス電文の中身をチェックし、制約違反となったものをUI上でピックアップできるようです。

- [Mizu Traffic Validation](https://getmizu.io/docs/mizu/mizu-traffic-validation)

背後ではMizu CLIがKubernetes内に`mizu`というNamespace内にトラフィック収集用のDaemonSetとAPIサーバーを生成し、このUIとやりとりしているようです。

## トラフィック分析してみる

デモアプリが提供する負荷テストツールでショッピングサイトにアクセスして、Mizu UIでトラフィックを見てみます。
まず、Liveness/ReadinessProbeを除外するため、上部のフィルタ条件に`request.path!="/health" and request.path!="/"`を入力して`Apply`しました。

それでは、負荷テストツールでデモアプリに負荷をかけます。

```shell
MINIKUBE_IP=$(minikube ip)
docker run --rm weaveworksdemos/load-test -d 5 -h ${MINIKUBE_IP}:30001 -c 2 -r 100
```

MizuのUIの方を見ると、以下のようになります。

<video width="100%" controls autoplay>
  <source src="https://i.gyazo.com/b9ea6cc00cb7c738d98e25c2f57898aa.mp4" type="video/mp4">
Your browser does not support the video tag.
</video>

左側に通信内容が(水のように？)流れ、各リクエストやレスポンスの詳細が確認できます。
`Service Map`を見ると、各サービスの依存関係やトラフィック量の確認もできます。

## クリーンアップ

クラスタ側はCtrl+Cで`mizu tap`のMizu CLIのプロセスを終了すれば、MizuのDaemonSetやAPIサーバーはきれいに削除されます。
デモアプリは以下で削除できます。

```shell
kubectl delete -f deploy/kubernetes/manifests
```

## まとめ
サービスメッシュを導入すれば、このような分析はできます。ただ、実際にサービスメッシュをセットアップするのはかなり手間です。

Mizuは個別にクラスタに何も入れる必要はなく(裏側ではやっていますが)、このようなリッチなトラフィック分析ができるのは簡単でいいなと思いました（削除もCLIプロセスを終了するだけ）。
まだ公開されて1年も経っていない製品ですが、可能性を感じさせられるツールですね（GitHubスター数も3000を超えています）。

---
参照記事

- [Mizu — Kubernetes Traffic Viewer](https://bmiguel-teixeira.medium.com/mizu-kubernetes-traffic-viewer-b9c39a6a3aeb)