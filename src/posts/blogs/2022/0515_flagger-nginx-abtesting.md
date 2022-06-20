---
title: Flagger と Ingress Nginx でA/Bテストをする
author: noboru-kudo
date: 2022-05-15
tags: [k8s, container, "CI/CD", Flagger, nginx]
---

前回は、[Flagger](https://flagger.app/)とNginxのIngress Controllerを使ってカナリアリリースを試しました。

- [Flagger と Ingress Nginx でカナリアリリースをする](/blogs/2022/05/08/flagger-nginx-canary/)

今回はA/Bテストの方を試したいと思います。
前回のカナリアリリースは、徐々にカナリアバージョンのトラフィック量を増やしながら切り替えていく形でした。
FlaggerのA/Bテストは、一部のユーザーのみにカナリアバージョンを公開し、その後問題がない場合に全てのリクエストを一気にStableバージョンの方に振り向けます。


また、前回は完全自動化でStableバージョンへリリースしましたが、今回は最終的なStable環境へのリリースは手動承認(Manual Gating)が必要なユースケースを想定します。

[[TOC]]

## 事前準備

Nginx Ingress ControllerとFlaggerをインストールし、サンプルアプリ/Ingressをセットアップしておきます。
これは前回の記事と全く同じ手順です。

- [Nginx Ingress Controllerのインストール](/blogs/2022/05/08/flagger-nginx-canary/#nginx-ingress-controllerのインストール)
- [Flaggerのインストール](/blogs/2022/05/08/flagger-nginx-canary/#flaggerのインストール)
- [サンプルアプリのインストール](/blogs/2022/05/08/flagger-nginx-canary/#サンプルアプリのインストール)
- [Ingressの作成](/blogs/2022/05/08/flagger-nginx-canary/#ingressの作成)

既にカナリアリリース用のCanaryリソースを作成している場合は削除し、サンプルアプリのバージョンを`6.0.0`に戻しておきます。

```shell
kubectl delete -f canary.yaml
kubectl -n test set image deployment/sample-app \
  podinfo=ghcr.io/stefanprodan/podinfo:6.0.0
```

## A/Bテスト構成の初期化

サンプルアプリをFlaggerの構成に初期化します。
カナリアリリース同様に、こちらもFlaggerのCanaryリソースを作成します。
以下ファイルを`canary-abtesting.yaml`として用意しました。
 
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
    interval: 60s
    # A/Bテスト失敗とみなすチェック失敗回数
    threshold: 10
    # メトリクスチェック回数
    iterations: 3
    match:
      # HTTPヘッダベース
      - headers:
          x-canary:
            exact: "insider"
      # Cookieベース
      - headers:
          cookie:
            exact: "canary"
    metrics:
      - name: request-success-rate
        interval: 1m
        # 99%のリクエストが200系
        thresholdRange:
          min: 99
      - name: request-duration
        interval: 1m
        # 99%値のレスポンスが1秒以下
        thresholdRange:
          max: 1000
    webhooks:
      - name: acceptance-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sd 'test' http://sample-app-canary/token | grep token"
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          # 接続先のLB IPは以下で取得
          # kubectl get ing sample-app -n test -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
          cmd: "hey -z 1m -q 5 -c 2 -host 'sample.minikube.local' -H 'Cookie: canary=always' http://10.106.126.38/"

      # Stableバージョン昇格Gate
      - name: promotion-gate
        type: confirm-promotion
        url: http://flagger-loadtester.test/gate/check
      # ロールバックGate
      - name: rollback-gate
        type: rollback
        url: http://flagger-loadtester.test/rollback/check

      # Gateリセット
      - name: reset-promotion-gate
        type: post-rollout
        url: http://flagger-loadtester.test/gate/close
      - name: reset-rollback-gate
        type: post-rollout
        url: http://flagger-loadtester.test/rollback/close
```

少し長いですが、カナリアリリースのときに作成したものと、大きくは変わりません。 違いのある`spec.analysis`部分のみを説明します。

### 反復回数(`iterations`)

A/Bテストの場合は反復回数(`iterations`)を指定し、その代わりに`maxWeight`/`stepWeight`を削除します。
`iterations`はメトリクスチェックの回数です。ここで指定した回数分メトリクスチェックが繰り返され、全てのチェックをパスするとカナリアバージョンはStableバージョンへ昇格します。
ここでは、60秒間隔(`interval`)で3回チェックを実施するようにしました。使用するメトリクスは前回同様にステータスコードとレスポンスタイムです。

### ルーティング条件(`match`)
カナリアバージョンにトラフィックを流す条件を指定します。FlaggerではHTTPヘッダとCookieによるルーティングをサポートしています。
ここでは、HTTPヘッダとして`X-Canary: insider`またはCookieに`canary=always`のエントリーがある場合、カナリアバージョンへルーティングするようにしています。

:::info
Cookieの値(`always`)はFlaggerの制約ではなく、Nginx Ingress Controllerの仕様です。
指定できる設定は利用するIngress Controllerまたはサービスメッシュ製品に依存するため注意が必要です。
Nginx Ingress Controllerの仕様は、[公式ドキュメント](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#canary)を参照しくてださい。
:::

### イベント処理(`webhooks`)
Flaggerのライフサイクルイベントに対応した処理を定義します。
前回同様に事前の疎通確認と、Flagger Testerでメトリクスを収集するようにしています。
今回は手動承認(Manual Gating)を有効にするため、これに加えて以下を追加しました。

- `promotion-gate`: Stableバージョン昇格の承認チェック
- `rollback-gate`: カナリアバージョンロールバックの承認チェック

ここで指定したURLが200ステータスを返すと、Stableバージョンへの昇格またはロールバックが実行されます。
ここではFlagger Testerが備えるREST APIを使用しています。 このAPIはその時点のOpen/Closeの状態を返すものです(デフォルトはClose)。

最後の2つのWebHook(`reset-promotion-gate`/`reset-rollback-gate`)では、リリース終了後(`post-rollout`)に各GateをClose状態に戻しています。これは次回のリリースに備えるためです。


これを反映します。

```shell
kubectl apply -f canary-abtesting.yaml
```

FlaggerがCanaryリソースの作成を検知し、サンプルアプリを初期化します。
初期化後の形はカナリアリリースのときと同じです。

以下再掲します。

![](https://i.gyazo.com/b3075c8abba66e77c22e90dac296a8d8.png)

## A/Bテストを試してみる

それでは新しいバージョンのリリースを、FlaggerのA/Bテストで実施してみます。
前回同様に、サンプルアプリのバージョンを上げてみます。

```shell
# image.tagを6.0.0 -> 6.0.1に変更
kubectl -n test set image deployment/sample-app \
  podinfo=ghcr.io/stefanprodan/podinfo:6.0.1
```

Flaggerが新バージョンを検知し、A/Bテストを実施します。
カナリアリリースのときと同じく、新しいバージョンをカナリアバージョンとしてデプロイします。
ただし、今回は何もしなければ商用トラフィックがカナリアバージョンに流れることはありません。
カナリアバージョンのIngress(`sample-app-canary`)は以下の状態となりました。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    kustomize.toolkit.fluxcd.io/reconcile: disabled
    # Flaggerが設定。指定したCookieまたはHTTPヘッダのリクエストのみをカナリアバージョンにルーティング
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-cookie: canary
    nginx.ingress.kubernetes.io/canary-by-header: x-canary
    nginx.ingress.kubernetes.io/canary-by-header-value: insider
    nginx.ingress.kubernetes.io/canary-weight: "0"
```

上記のようにカナリアバージョンへのルーティング条件を指定するアノテーションが追加されています。

実際にcurlコマンドでアクセスし、レスポンスに含まれるバージョンを確認します。

```shell
LB_IP=$(kubectl get ing sample-app -n test -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
# Cookie指定
curl -s -H 'Host: sample.minikube.local' -b 'canary=always' http://${LB_IP}/ | jq .version
# HTTPヘッダ指定
curl -s -H 'Host: sample.minikube.local' -H 'X-Canary: insider' http://${LB_IP}/ | jq .version
```

どちらも`6.0.1`が返ってきます。カナリアバージョンの方にルーティングされています。
もちろんHTTPヘッダやCookieを指定しない場合は、Stableバージョンの`6.0.0`が返ってくることも確認できました。
ここでは、以下のように条件を満たしたリクエストのみがカナリアバージョンに流れている状態です。

![](https://i.gyazo.com/e620b111cae461b1bb3554e3f18bd20c.png)

全ての反復(`iterations`)が終わり、Canaryリソースの状態を確認すると以下のようになりました。
```shell
NAME         STATUS             WEIGHT   LASTTRANSITIONTIME
sample-app   WaitingPromotion   0        2022-05-14T07:47:34Z
```

`STATUS`が`WaitingPromotion`となりました。
前回のカナリアリリースの際は、最大ウェイトに到達すると自動的にStableバージョンに昇格しましたが、今回は違います。
これは、先程`webhooks`で指定した`promotion-gate`がClose状態となっているためです。

カナリアバージョンに問題がなかったと想定して、Stableバージョンへのリリースを承認します。
これにはFlagger TesterのREST APIを呼び出します。

```shell
FLAGGER_TESTER=$(kubectl get pod -n test -l app=loadtester -o jsonpath='{.items[0].metadata.name}')
kubectl -n test exec -it ${FLAGGER_TESTER} \
  -- curl -d '{"name": "sample-app","namespace":"test"}' http://localhost:8080/gate/open
```

すると、Canaryリソースの状態が以下のように変わりました。

```shell
NAME         STATUS      WEIGHT   LASTTRANSITIONTIME
sample-app   Promoting   0        2022-05-14T07:54:04Z
```

`STATUS`が`Promoting`に変わり、カナリアバージョンがStableバージョンへと反映されます。
この辺りの動きはカナリアリリースと同じです。Stableバージョン昇格後は、カナリアバージョンはゼロスケールされ、初期状態に戻りました。
Canaryリソースの`STATUS`も`Succeeded`へと変わります。

```shell
NAME         STATUS      WEIGHT   LASTTRANSITIONTIME
sample-app   Succeeded   0        2022-05-14T08:04:01Z
```

## 手動ロールバック(リリース取消)

今度は、カナリアバージョンのアプリに問題があったと仮定し、手動ロールバックさせてみます。
まずは、イメージタグを再度更新します。

```shell
# image.tagを6.0.1 -> 6.0.2に変更
kubectl -n test set image deployment/sample-app \
  podinfo=ghcr.io/stefanprodan/podinfo:6.0.2
```

再びカナリアバージョンが作成され、メトリクスチェックが開始され、承認待ち状態(`WaitingPromotion`)になります[^1]。
今度は承認せずに、Flagger TesterのロールバックGateをOpen状態にするREST APIを呼び出します。

[^1]: ここでは`WaitingPromotion`状態で実施しましたが、ここまで待たずに`Progressing`中にロールバックGateをOpenにするとすぐにロールバックします。

```shell
kubectl -n test exec -it ${FLAGGER_TESTER} -- \
  curl -d '{"name": "sample-app","namespace":"test"}' http://localhost:8080/rollback/open
```

すると、FlaggerはロールバックGateがOpenになったことを検知し、カナリアバージョンのロールバックを実行します。
具体的にはカナリアバージョンをゼロスケールし、Ingress ControllerのHTTPヘッダやCookieのルーティング条件のアノテーションを削除します。

Canaryリソースを確認すると、以下のように`Failed`のステータスになりました。

```shell
NAME         STATUS   WEIGHT   LASTTRANSITIONTIME
sample-app   Failed   0        2022-05-14T13:40:13Z
```

## まとめ
FlaggerでA/Bテストを利用してアプリのリリースをしてみました。
また、今回はよくあるパターンとして、自動リリースではなく、手動承認のプロセスを組み込みました。

商用リリース前に社内ユーザーによる商用動作確認が必要というのはよくあるケースです。
今回実施した内容だと、メトリクスベースのチェックに加えて、手動テストも実施できますので、より確実なリリースプロセスになったと言えます。
特定のユーザーの場合にHTTPヘッダやCookieに別途専用ヘッダを組み込む工夫は必要になりますが、これの利用価値というか需要は結構あるような気がします。

FlaggerのA/Bテストはまるごとルーティング対象を切り替える方式で、カナリアリリースの延長線にある機能です。
UIコンポーネント切り替えや細かい表示をテストする場合は、やはりGoogle Optimizeのような専用サービスの方が使い勝手がよいかなと思いました。

---
参照資料

- [Flaggerドキュメント](https://docs.flagger.app/)