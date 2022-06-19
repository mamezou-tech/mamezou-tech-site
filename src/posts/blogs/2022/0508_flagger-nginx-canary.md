---
title: Flagger と Ingress Nginx でカナリアリリースをする
author: noboru-kudo
date: 2022-05-08
tags: ["k8s", "container", "CI/CD", "Flagger"]
---

Kubernetesはデフォルトではローリングアップデート(RollingUpdate)とPod再生成(Recreate)をデプロイ時の戦略として利用できます。
特にデフォルトのデプロイ戦略であるRollingUpdateは、ゼロダウンタイムで順次新バージョンをリリースさせていく方式ですが欠点もあります。

たとえば、Pod(アプリケーション)の起動には成功するものの、バグ等が原因で正常なサービスとして提供できていない場合です。
リリース後にアプリケーションの問題が発覚して、多くのユーザーに迷惑をかけて、挙句の果てに全てロールバックする羽目になったというのはよく聞く話です。
Kubernetesにはオートヒーリング機能がありますが、これはあくまでインフラレベルのもので、アプリケーション自体の動作には関知しません。
また、パフォーマンスチューニング不足によるレスポンスタイム劣化等、通常のヘルスチェックでは検知できないものも多いかと思います。

このような背景から、最近は様々なデプロイ戦略を用いて、この欠点を軽減または回避しようという試みが行われています。
代表的なものだと、以下のようなものがあります。

**カナリア(Canary)リリース**
一定割合のみを新バージョンにルーティングし、徐々にこの割合を増やしていく(最終的には100%)。

**A/Bテスト**
一部のユーザーのみを新バージョンにルーティングし、それ以外は現行バージョンにルーティングする。UI変更の影響確認等、フロントエンドでの利用が多い。

**Blue/Greenデプロイ**
アクティブ/非アクティブの2面で環境を保持しておき、非アクティブ面に新バージョンをリリースし、確認OKとなれば商用トラフィックのルーティング先を非アクティブ面に切り替える。

これらは、理論的にはごもっともですが、ネットワーク構成変更や環境用意など、実際に手動で実施するのはかなりハードルが高いと思います。
設定を誤れば、サービスの全面停止を招く可能性もあり、安定したリリースの実現という目的とは真逆の結果を招きます。

今回は、これを自動化する[Flagger](https://flagger.app/)を試します。
Flaggerは、[Flux](https://fluxcd.io/)でお馴染みの[Weaveworks](https://www.weave.works/)社が開発したデリバリに特化したツールです[^1]。
以下は公式ドキュメントから、Flaggerの概要イメージを引用しました。

[^1]: CNCFのIncubatingプロジェクトとしてホスティングされています。

![](https://i.gyazo.com/e7a4cff990848e7908fada634e9139b9.png)
引用元: <https://docs.flagger.app/>

上記のように、FlaggerはサービスメッシュやIngress Controllerに備わっているルーティング機能を利用して流量制御します(上図でIngressとなっている部分)。
サポートされている製品は以下の公式ドキュメントに記載されています。

- <https://docs.flagger.app/#getting-started>

IstioやLinkerd、AWS App Mesh等のサービスメッシュやNginx/Traefik等のIngress Controllerといったメジャーな製品はカバーされています。

カナリアリリース等を用いたデプロイには、メトリクス監視が必須です。カナリアバージョンにエラーやレスポンスタイムの悪化が見られる場合は、リリースを停止する必要があるでしょう。
このためFlaggerはメトリクスツールとの連携が必要です。連携可能なツール/サービスは以下に記載があります。

- <https://docs.flagger.app/usage/metrics>

デフォルトはPrometheusですが、それ以外にもDatadogやCloudWatch、New Relic等、こちらも主要なものには対応しています。

ここではNginxのIngress ControllerとPrometheus(デフォルト)を使って、Flaggerのカナリアリリースを試してみたいと思います。

Kubernetes環境はローカルのMinikubeを使いますが、基本的にどのKubernetesディストリビューションでもFlaggerの使い方は同じはずです。

[[TOC]]

## Nginx Ingress Controllerのインストール

まずは、MinikubeにNginxのIngress Controllerを入れます。
今回FlaggerでIngressのPrometheusメトリクスを収集する必要がありますので、Minikubeのアドオンは利用しません。

既に有効にしている場合は無効にしておきます。

```shell
minikube addons disable ingress-dns
minikube addons disable ingress
```

続いてNginxのIngress Controllerを[Helmチャート](https://github.com/kubernetes/ingress-nginx/tree/main/charts/ingress-nginx)からインストールします。

```shell
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Ingress Nginxをメトリクス有効化してインストール
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --version 4.1.0 \
  --namespace ingress-nginx --create-namespace \
  --set controller.metrics.enabled=true \
  --set controller.podAnnotations."prometheus\.io/scrape"=true \
  --set controller.podAnnotations."prometheus\.io/port"=10254
```

`controller.metrics.enabled`でメトリクスを有効化し、Flaggerがメトリクスを収集できるようにPodにPrometheusのアノテーションを指定します。

インストールが終わったら、別ターミナルを開きMinikubeのVMからローカル環境にトンネルを通しておきます。

```shell
# see https://minikube.sigs.k8s.io/docs/handbook/accessing/#loadbalancer-access  
minikube tunnel
```

このプロセスは起動したままにしておきます。これで`LoadBalancer`タイプのIngress Controllerにローカル環境からアクセスできます。

## Flaggerのインストール

Flagger本体をインストールします。Flaggerも[Helmチャート](https://github.com/fluxcd/flagger/tree/main/charts/flagger)が公開されていますので、こちらを利用します。

```shell
helm repo add flagger https://flagger.app
helm repo update

helm upgrade --install flagger flagger/flagger \
  --version 1.21.0 \
  --namespace flagger --create-namespace \
  --set prometheus.install=true \
  --set meshProvider=nginx
```

`prometheus.install`を指定して、メトリクス収集用のPrometheusを一緒にインストールしました。
また、`meshProvider`には今回ルーティング制御で使用する`nginx`を指定しました。

なお、他の用途で既にPrometheus Operatorを実行中の場合、そちらからの収集も可能です。詳細は[公式ドキュメント](https://docs.flagger.app/tutorials/prometheus-operator)を参照してください。

インストールしたものを確認します。

```shell
kubectl get pod -n flagger
```
```
NAME                                  READY   STATUS    RESTARTS   AGE
flagger-6c4d6d9cd7-dmls4              1/1     Running   0          23s
flagger-prometheus-5fd48f898b-474bk   1/1     Running   0          23s
```

Flagger本体とメトリクス収集用のPrometheusが実行されています。

:::info
Flaggerで収集したメトリクスは、Grafanaで可視化できます。実際には自動化だけに頼らず、目で確認することも大切でしょう。
Grafana利用の詳細は以下の公式ドキュメントを参照してください。

- <https://docs.flagger.app/usage/monitoring>
:::

```shell
kubectl get crd | grep flagger.app
```
```
alertproviders.flagger.app    2022-05-07T00:09:05Z
canaries.flagger.app          2022-05-07T00:09:05Z
metrictemplates.flagger.app   2022-05-07T00:09:05Z
```

後述しますが、今回は2つ目のCanaryリソースを使って、Flaggerのデプロイ戦略を試します。

## サンプルアプリのインストール

Flaggerの公式ドキュメントで使われているサンプルアプリをインストールします。
こちらも[Helmチャート](https://github.com/fluxcd/flagger/tree/main/charts/podinfo)が公開されていましたので、これを使います。

```shell
# image: https://github.com/stefanprodan/podinfo/pkgs/container/podinfo/versions
helm upgrade --install sample-app flagger/podinfo \
  --namespace=test --create-namespace \
  --set nameOverride=sample-app \
  --set hpa.enabled=false \
  --set canary.enabled=false \
  --set image.tag=6.0.0
```

今回は簡潔にしたかったので、HPAは無効にしました[^2]。
`test`Namespace内にアプリ(バージョン`6.0.0`)をセットアップしました。中身はDeploymentとConfigMapのみです。この時点ではServiceすらありません。

[^2]: [公式ドキュメント](https://docs.flagger.app/usage/how-it-works#canary-target)によるとHPAはカナリアリリース時のリソース効率を高める上で有用なようです。

次に、FlaggerでIngressからメトリクスを収集できるように、負荷テストツールをデプロイしておきます。

```shell
# https://github.com/fluxcd/flagger/tree/main/charts/loadtester
helm upgrade --install flagger-loadtester flagger/loadtester \
  --version 0.22.0 \
  --namespace=test  \
  --set cmd.timeout=1h
```

こちらは必須ではありませんが、メトリクスが収集できないと、Flaggerはリクエスト成功率を計算できずリリースが失敗したものとみなします。
そのため、ここでは本気の負荷テストというよりも、メトリクス収集の目的で使用します。
Flaggerで提供される負荷テストツールは、[公式ドキュメント](https://docs.flagger.app/usage/webhooks#load-testing)を参照しくてださい。httpだけでなく、gRPCにも対応しています。

ここまで実施すると、`test`Namespaceは以下のような状態となります。

```shell
kubectl get pod -n test
```
```
NAME                                 READY   STATUS    RESTARTS   AGE
flagger-loadtester-7c47f949d-tg8dw   1/1     Running   0          13s
sample-app-6cddcb999c-rk78t          1/1     Running   0          32s
```

## Ingressの作成

次にIngressリソースを作成します。 以下`ingress.yaml`を用意しました。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sample-app
  namespace: test
  labels:
    app: sample-app
spec:
  ingressClassName: nginx
  rules:
    - host: sample.minikube.local
      http:
        paths:
          - pathType: Prefix
            path: "/"
            backend:
              service:
                name: sample-app
                port:
                  number: 80
```
`sample.minikube.local`に入ってきたリクエストをサンプルアプリに振り向けるだけです（まだServiceはありませんが）。
ここでデプロイ戦略に関するルーティング(Ingressのアノテーション)を指定する必要はありません。これはFlaggerがやってくれます。

```shell
kubectl apply -f ingress.yaml
```

この時点ではまだServiceはありませんので、サンプルアプリにはアクセスできません。

## カナリアリリース構成の初期化

サンプルアプリをFlaggerの構成に初期化します。
これには、Flaggerのカスタムリソース(CRD)であるCanaryリソースを作成します。

以下の内容を`canary.yaml`として作成しました。

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: sample-app
  namespace: test
spec:
  provider: nginx
  # deployment reference
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sample-app
  # ingress reference
  ingressRef:
    apiVersion: networking.k8s.io/v1
    kind: Ingress
    name: sample-app
  service:
    port: 80
    targetPort: 9898
  analysis:
    # チェック間隔
    interval: 30s
    # カナリアリリース失敗とみなすチェック失敗回数
    threshold: 10
    # カナリアバージョンへの最大ウェイト
    maxWeight: 50
    # カナリアバージョンへのウェイトのピッチ
    stepWeight: 10
    metrics:
      - name: request-success-rate
        interval: 5m
        # 99%のリクエストが200系
        thresholdRange:
          min: 99
      - name: request-duration
        interval: 5m
        # 99%値のレスポンスが1秒以下
        thresholdRange:
          max: 1000
    webhooks:
      # curlでアプリが動いていることを確認
      - name: acceptance-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sd 'test' http://sample-app-canary/token | grep token"
      # 5分間負荷をかける -> メトリクス収集
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          # 接続先のLB IPは以下で取得
          # kubectl get ing sample-app -n test -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
          cmd: "hey -z 5m -q 5 -c 2 -host 'sample.minikube.local' http://10.106.126.38/"
```

ここで、カナリアリリースの対象や各種しきい値、イベントに対応するWebHooks等を設定します。
ここでは30秒間隔(`interval`)でメトリクスチェックを行い、50%(`maxWeight`)まで10%ずつ(`stepWeight`)カナリアバージョンへのトラフィック量を増やしていくようにしています。
メトリクスチェックには、Flaggerに組み込まれているリクエスト成功率とレスポンスタイムを使用しています[^3]。
また、このメトリクスチェックは10回失敗すると、カナリアリリースを停止するようにしました(`threshold`)。

[^3]: もちろんカスタムメトリクスでのチェックも可能です。カスタムメトリクスの設定方法は[公式ドキュメント](https://docs.flagger.app/usage/metrics#custom-metrics)を参照しくてださい。

1回も失敗しない場合の最速のデプロイ時間は、以下の計算式で見積もりできます。

> interval * (maxWeight / stepWeight)

この例だと30秒 * (50% / 10%) = 150秒が最速のリリース時間になります。

`webhooks`はカナリアリリース中の各イベント(`type`)に応じて、アプリケーションをテストします(Flaggerが呼び出します)。
ここではサンプルアプリの疎通と一定量のアクセスを負荷テストツール(`hey`コマンド)でかけるようにしています。
ここではテストだけでなく、アラートやロールバック時のフックとしても利用できます。適切に利用すれば、より確実なリリースパイプラインを構築できそうです。
利用可能な全てのイベントは[公式ドキュメント](https://docs.flagger.app/usage/webhooks)で確認できます。
なお、WebHooksの指定は任意ですので、メトリクスチェックだけで十分であれば指定は不要です。

:::column: Manual Gating
カナリアリリースではあまり使えないと思いますが、WebHooksを活用すると人による最終承認もできます。
これを使うと、手動テスト結果のステークホルダー承認後に商用リリースするといったよくあるプロセスが実現できます（承認前まではStableバージョンへのリリースを止める）。
この機能は、特にBlue/GreenデプロイやA/Bテストでの需要が大きいのではと思います。
こちらの使い方の詳細は、以下を参照してください。

- <https://docs.flagger.app/usage/webhooks#manual-gating>
:::

これを反映します。

```shell
kubectl apply -f canary.yaml
```

投入後にCanaryリソースの状態を確認してみます。

```shell
kubectl get canary sample-app -n test
```
```
NAME                            STATUS         WEIGHT   LASTTRANSITIONTIME
canary.flagger.app/sample-app   Initializing   0        2022-05-07T12:03:54Z
```

`STATUS`が`Initializing`になっています。
しばらくすると、`Initialized`に変わります。何が起きたのかもう少し詳細を確認します。

```shell
kubectl get deploy,cm,pod,svc,ingress -n test
```
変更点をインラインで追記しました。
```
NAME                                 READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/flagger-loadtester   1/1     1            1           98s
deployment.apps/sample-app           0/0     0            0           117s -> ゼロスケール
deployment.apps/sample-app-primary   1/1     1            1           44s  -> 新規作成(Stable)

NAME                           DATA   AGE
configmap/kube-root-ca.crt     1      117s
configmap/sample-app           1      117s
configmap/sample-app-primary   1      44s  -> 新規作成(Stable)

NAME                                      READY   STATUS    RESTARTS   AGE
pod/flagger-loadtester-7c47f949d-tg8dw    1/1     Running   0          98s
pod/sample-app-primary-8f5955b8c-wjjv9    1/1     Running   0          44s -> 新規作成(deploy/sample-app-primary)

NAME                         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
service/flagger-loadtester   ClusterIP   10.109.91.243    <none>        80/TCP    98s
service/sample-app           ClusterIP   10.105.188.106   <none>        80/TCP    24s  -> 新規作成(Stable)
service/sample-app-canary    ClusterIP   10.100.5.24      <none>        80/TCP    44s  -> 新規作成(カナリア)
service/sample-app-primary   ClusterIP   10.100.133.226   <none>        80/TCP    44s  -> 新規作成(Stable)

NAME                                          CLASS   HOSTS                   ADDRESS         PORTS   AGE
ingress.networking.k8s.io/sample-app          nginx   sample.minikube.local   10.106.126.38   80      74s
ingress.networking.k8s.io/sample-app-canary   nginx   sample.minikube.local   10.106.126.38   80      24s -> 新規作成(service/sample-app-canaryへのルーティング)
```

いくつかのKubernetesオブジェクトがFlaggerによって作成されているようです。
以下の構成になりました。

![](https://i.gyazo.com/b3075c8abba66e77c22e90dac296a8d8.png)

これが平常時の状態になります。

### Deployment/ConfigMap
上部はStableバージョンの構成です。先程作成したDeploymentやConfigMapから複製されました(名前に`-primary`付加)。
こちらが、アクティブにサービスを提供するものになります。
下部のカナリアバージョンは、ゼロスケールされた状態になりました（Pod削除）。これは今後のカナリアリリースのために、Flaggerが監視している状態です。

### Service
3つのServiceが作成さました。
名前から分かるように`-primary`サフィックスの方は現在実行中のStableバージョン、`-canary`サフィックスの方はカナリアバージョンを指します。
カナリアバージョンの方は現在Podが存在しないため、ルーティング先がない状態です。
サフィックスないServiceはApexドメインと呼ばれるもので、常にStableバージョンを指します[^4]。

[^4]: Apexドメイン(sample-app)とプライマリサービス(sample-app-primary)は、どちらを使っても違いはないようでした。この辺りは実装に何を使うかによって、変わってくるようです。

### Ingress
先程作成したIngressが複製され、`-canary`バージョンのIngressとして作成されました。
こちらはカナリアバージョンのService(`sample-app-canary`)の方にトラフィックを流すように設定されています。
こちらのIngressは、アノテーションでトラフィックのウェイトがゼロに設定されていて、現在はリクエストが流れてこない状態です。

## カナリアリリースを試してみる

これで準備はできました。早速Flaggerのカナリアリリースを試してみます。

Flaggerはカナリアバージョン(DeploymentのPodテンプレート/ConfigMap等)の変更を監視し、変更発生を検知するとカナリアリリースのプロセスを実行します。
ここでは、サンプルアプリのコンテナバージョンを上げてみます。
注意点として、Stableバージョン側を直接変更してはいけません。こちらはカナリアリリースの最終段階でFlaggerによって更新されます。

```shell
# image.tagを6.0.0 -> 6.0.1に変更
kubectl -n test set image deployment/sample-app \
  podinfo=ghcr.io/stefanprodan/podinfo:6.0.1
```

変更後にカナリアリリース用のIngress(`sample-app-canary`)を見てみると、以下のようにNginx Ingressのカナリアリリース機能を担うアノテーションを調整しています。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sample-app-canary
  annotations:
    kustomize.toolkit.fluxcd.io/reconcile: disabled
    # Flaggerによりトラフィック流量調整
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "5"
```

この値は全てのメトリクス条件(ここではリクエスト成功率とレスポンスタイム)をクリアすれば、時間とともに50%(`maxWeight`)まで徐々に引き上げられていきます。
カナリアリリース中の構成は、以下のような状態となります。

![](https://i.gyazo.com/d2bd1b2c3fe0ee9ab700da3cac46e1b9.png)

その後ウェイトが50%まで到達すると、カナリアバージョンの構成がStableバージョンの方に置き換えられ、カナリアバージョンの方は先程と同じ初期状態へと戻りました(ゼロスケール)。
これらのイベントはCanaryリソースのイベントでも確認できます。

```shell
kubectl describe canary sample-app -n test 
```
以下抜粋です。
```
Events:
  Type     Reason  Age                   From     Message
  ----     ------  ----                  ----     -------
  Normal   Synced  7m3s                  flagger  New revision detected! Scaling up sample-app.test
  Normal   Synced  6m33s                 flagger  Starting canary analysis for sample-app.test
  Normal   Synced  6m33s                 flagger  Pre-rollout check acceptance-test passed
  Normal   Synced  6m33s                 flagger  Advance sample-app.test canary weight 10
  Warning  Synced  6m3s                  flagger  Halt advancement no values found for nginx metric request-success-rate probably sample-app.test is not receiving traffic: running query failed: no values found
  Normal   Synced  5m33s                 flagger  Advance sample-app.test canary weight 20
  Normal   Synced  5m3s                  flagger  Advance sample-app.test canary weight 30
  Normal   Synced  4m33s                 flagger  Advance sample-app.test canary weight 40
  Normal   Synced  4m3s                  flagger  Advance sample-app.test canary weight 50
  Normal   Synced  3m33s                 flagger  Copying sample-app.test template spec to sample-app-primary.test
  Normal   Synced  2m33s (x2 over 3m3s)  flagger  (combined from similar events): Promotion completed! Scaling down sample-app.test
```

このように徐々に`weight`が10%から50%まであがり、最終的にカナリアバージョンがStableバージョン(`primary`)にコピーされていることが確認できます。

:::info
実際にFlaggerを導入する上では、カナリアリリースの成功や失敗時には関係者へイベント通知をする必要があると思います。
もちろんFlaggerでもSlackやMS Teams等を使った通知機能はサポートされています。
具体的な設定方法は[公式ドキュメント](https://docs.flagger.app/usage/alerting)で確認できます。
:::

最後に、カナリアリリース中に意図的に500エラーを発生させてみます。
サンプルアプリは意図的に500エラーを返すことができますので、カナリアリリース中に以下のコマンドで大量のエラーを発生させます。

```shell
LB_IP=$(kubectl get ing sample-app -n test -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
while true; do curl -H 'Host:sample.minikube.local' http://${LB_IP}/status/500; done
```

以下Canaryリソースのイベント抜粋です。

```
Events:
  Type     Reason  Age                  From     Message
  ----     ------  ----                 ----     -------
  Normal   Synced  8m14s (x2 over 19m)  flagger  New revision detected! Scaling up sample-app.test
  Normal   Synced  7m44s (x2 over 19m)  flagger  Pre-rollout check acceptance-test passed
  Normal   Synced  7m44s (x2 over 19m)  flagger  Starting canary analysis for sample-app.test
  Normal   Synced  7m44s (x2 over 19m)  flagger  Advance sample-app.test canary weight 10
  Warning  Synced  7m14s (x2 over 18m)  flagger  Halt advancement no values found for nginx metric request-success-rate probably sample-app.test is not receiving traffic: running query failed: no values found
  Normal   Synced  6m44s (x2 over 18m)  flagger  Advance sample-app.test canary weight 20
  Warning  Synced  6m14s                flagger  Halt sample-app.test advancement success rate 20.48% < 99%
  Warning  Synced  5m44s                flagger  Halt sample-app.test advancement success rate 18.96% < 99%
  Warning  Synced  5m14s                flagger  Halt sample-app.test advancement success rate 17.28% < 99%
  Warning  Synced  4m44s                flagger  Halt sample-app.test advancement success rate 13.78% < 99%
  Warning  Synced  4m14s                flagger  Halt sample-app.test advancement success rate 13.37% < 99%
  Warning  Synced  3m44s                flagger  Halt sample-app.test advancement success rate 12.51% < 99%
  Warning  Synced  3m14s                flagger  Halt sample-app.test advancement success rate 11.98% < 99%
  Warning  Synced  2m44s                flagger  Halt sample-app.test advancement success rate 10.68% < 99%
  Warning  Synced  2m14s                flagger  (combined from similar events): Halt sample-app.test advancement success rate 9.24% < 99%
```

ウェイト20%の時点でサンプルアプリのリクエスト成功率がチェック(99%)をクリアできなくなったため、カナリアバージョンへのウェイト増加プロセスを停止しています。
その後、失敗回数がしきい値で設定した10回に到達すると、Flaggerはカナリアリリース失敗と判断し、ロールバックします。
具体的には、Ingressのカナリアバージョンへのウェイトを0%に戻し、カナリアバージョンのPodを削除(ゼロスケール)しました。

:::info
失敗したカナリアバージョンを再開する場合は、Flaggerが監視しているサンプルアプリのDeploymentのPodテンプレートやConfigMapを変更します。
このようにすることで、Flaggerが変更を検知してカナリアリリースを再開します。
:::

## まとめ
カナリアリリースのような複雑なデプロイ戦略を手動でやるのは大変ですが、FlaggerのCanaryリソースを作成するだけで、リリース作業を自動化してくれるのは楽だと感じました。
Flaggerはメトリクスベースで確実に進めてくれますので、より信頼できる定量的なリリースパイプラインを構築できます。

とはいえ、Kubernetesにデフォルトで備わっているRollingUpdateもほとんどのユースケースを満たせるはずです。
全てのアプリケーションで無理に使って構成を複雑化させるよりも、まずはトラフィック量が多いクリティカルなアプリケーションに限定するなど、システム特性に応じて使い分けるのがいいのではと思います。

Flaggerはカナリアリリース以外にもA/BテストやBlue/Greenデプロイ等にも対応していますので、時間があればこちらについても投稿したいと思います。

---
参照資料

- [Flaggerドキュメント](https://docs.flagger.app/)