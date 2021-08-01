---
title: Ingress Controller導入(Nginx編)
author: noboru-kudo
---
Kubernetesで使うL7ロードバランサの[Ingress]リソースの実装であるIngress Controllerの動作を確認する。

このハンズオンでは以下のIngress Controllerを定義してロードバランシングが機能することを検証する。
- [Nginx Ingress Controller](https://github.com/kubernetes/ingress-nginx)
公式のIngress Controllerでもっともよく知られている。
ローカルクラスタ環境(VirtualBox)＋Helm(Tiller)で実施する。
[Kubernetesハンズオン-ローカルクラスタ環境構築]
[Kubernetesハンズオン-パッケージマネージャ]
ここではやらないがもちろんクラウド環境でも可。

## What is Ingress / Ingress Controller?
Kubernetesクラス環境内にデプロイされたアプリに対してL7レベルのロードバランシングを行うKubernetesの機能。
ただ、KubernetesではIngressリソースのマニフェスト構造のみを規定しており、その実装であるIngress Controller(Kubernetesのカスタムコントローラ)は環境やユースケースに応じて自由に選択するものとしている。
- <https://kubernetes.io/docs/concepts/services-networking/ingress/>
- <https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/>
![](https://i.gyazo.com/f44e435134cbbfc90bdb87b4e947df72.png)

## 事前準備(ローカルクラスタ環境のみ) - ネットワークロードバランサのセットアップ
オンプレ想定のローカル環境だとネットワークロードバランサのアプライアンスがないので、[Google]製のオンプレ向け簡易LB(ソフトウェアレベルのLB) の[MetalLB]をインストール(L2モード)しておく。
[Bare-metal considerations](https://kubernetes.github.io/ingress-nginx/deploy/baremetal/)
	クラウド環境を利用する場合は、普通は用意されているのでこの手順は不要
```shell
# Install MetalLB
kubectl create namespace metallb-system
helm install --name metallb stable/metallb --namespace metallb-system
```

MetalLBのConfigMapリソースを生成し、WorkerNode(IPプール)をMetalLBに認識させる。
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  namespace: metallb-system
  name: config
data:
  config: |
    address-pools:
    - name: default
    protocol: layer2
    # WorkerノードをIPプールと指定
    addresses:
    - 172.16.20.11-172.16.20.13
```
```shell
# Create ConfigMap for MetalLB
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/ingress/metallb-configmap.yaml
```

何が起こっているのかとっても気になるので深掘りしてみる。
- Deployment  
Kubernetesのカスタムコントローラが動いている。先程配置したConfigMapのイベントハンドラと思われる。
```shell
kubectl get deploy -n metallb-system -o wide
```
```
> NAME                 READY   UP-TO-DATE   AVAILABLE   AGE   CONTAINERS   IMAGES                      SELECTOR
> metallb-controller   1/1     1            1           10h   controller   metallb/controller:v0.7.3   app=metallb,component=controller,release=metallb
```
- DaemonSet  
DaemonSetで各ノードに何か常駐させている。これがL2モードの負荷分散を司るものっぽい  
どれか1つのLeaderノードがトラフィックを受け取り負荷分散して、フェイルオーバー時にLeader ElectionによりLeaderノードを切り替えるようだ。
```shell
kubectl get daemonset -n metallb-system -o wide
```
```
> NAME              DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE   CONTAINERS   IMAGES                   SELECTOR
> metallb-speaker   3         3         3       3            3           <none>          10h   speaker      metallb/speaker:v0.7.3   app=metallb,component=speaker,release=metallb
```
- Pod
カスタムコントローラが1つとmetallb-speaker(Daemon)が各Workerノードで起動している。
カスタムコントローラが配置されたk8s-worker2ノードが単一障害点になりそうだけど、これはDeploymentリソースで管理されているから、もし死んでも別のWorkerノードにフェイルオーバーされるだけですね。
```shell
kubectl get pod -o wide -n metallb-system
```
```
> NAME                                 READY   STATUS    RESTARTS   AGE   IP             NODE          NOMINATED NODE   READINESS GATES
> metallb-controller-677c7b475-9fxtm   1/1     Running   0          10h   10.244.2.15    k8s-worker2   <none>           <none>
> metallb-speaker-ltvxd                1/1     Running   0          10h   172.16.20.13   k8s-worker3   <none>           <none>
> metallb-speaker-vq8f2                1/1     Running   0          10h   172.16.20.12   k8s-worker2   <none>           <none>
> metallb-speaker-zs4gq                1/1     Running   0          10h   172.16.20.11   k8s-worker1   <none>           <none>
```
- Log(抜粋)
先程投入したConfigMapが検知されて、ノードが認識されていることが確認できる。
```shell
kubectl logs -l component=speaker -n metallb-system
```
```
> {"caller":"main.go:271","configmap":"metallb-system/config","event":"startUpdate","msg":"start of config update","ts":"2019-05-25T01:32:27.222197444Z"}
> {"caller":"main.go:295","configmap":"metallb-system/config","event":"endUpdate","msg":"end of config update","ts":"2019-05-25T01:32:27.222240279Z"}
> {"caller":"k8s.go:346","configmap":"metallb-system/config","event":"configLoaded","msg":"config (re)loaded","ts":"2019-05-25T01:32:27.222252921Z"}
```

ようやくここからが本題。

## Nginx Ingress Controller
完成形はこんな形。
![](https://i.gyazo.com/4abbe4bd3777b15df56db27d49718bbb.png)

### 1. Ingress Controllerインストール
Helmで公開されているNginxのIngress Controllerをインストールする。
クラウド環境を使う場合はインストール方法が違うので注意。  
<https://kubernetes.github.io/ingress-nginx/deploy/>
```shell
# Ingress Controller自体もレプリカ数2の冗長構成
helm upgrade nginx-ingress --install stable/nginx-ingress --set controller.replicaCount=2
```

以下作成されたKubernetesリソースの中身を確認する。
- Serviceリソース
`nginx-ingress-controller`がIngress ControllerのService。MetalLBによって公開IPとして172.16.20.11のk8s-worker1がLeaderノードとして選出されていることが分かる。
`nginx-ingress-default-backend`はBackendのServiceが見つからない場合のルート（実運用ではカスタマイズする必要がある）。
```shell
kubectl get svc -o wide -l app=nginx-ingress
```
```
> NAME                            TYPE           CLUSTER-IP     EXTERNAL-IP    PORT(S)                      AGE   SELECTOR
> nginx-ingress-controller        LoadBalancer   10.101.28.55   [* 172.16.20.11]   80:32717/TCP,443:30016/TCP   33s   app=nginx-ingress,component=controller,release=nginx-ingress
> nginx-ingress-default-backend   ClusterIP      10.100.58.61   <none>         80/TCP                       33s   app=nginx-ingress,component=default-backend,release=nginx-ingress
```

- Pod
2つのレプリカの`nginx-ingress-controller`がWokerノード2台(k8s-worker1,3)に分散してスケジュールされた。
```shell
kubectl get pod -l app=nginx-ingress -o wide
```
```
> NAME                                             READY   STATUS    RESTARTS   AGE     IP            NODE          NOMINATED NODE   READINESS GATES
> [* nginx-ingress-controller-5bb5cd56fb-sz78x        1/1     Running   0          3m13s   10.244.1.17   k8s-worker1]   <none>           <none>
> [* nginx-ingress-controller-5bb5cd56fb-wk7mx        1/1     Running   0          3m13s   10.244.3.16   k8s-worker3]   <none>        <none>
> nginx-ingress-default-backend-7f5d59d759-tt6fn   1/1     Running   0          3m13s   10.244.2.21   k8s-worker2   <none>         <none>
```

- Ingress Controller のログ(抜粋)
冗長構成(replicas=2)としたNginx Controllerのうち`nginx-ingress-controller-5bb5cd56fb-sz78x`がLeaderとして選出されている。
```shell
kubectl logs $(kubectl get pod -l app=nginx-ingress -o jsonpath='{.items[0].metadata.name}')
```
```
> I0525 04:19:04.063065       6 nginx.go:311] Starting NGINX process
> I0525 04:19:04.067653       6 leaderelection.go:217] attempting to acquire leader lease  default/ingress-controller-leader-nginx...
> W0525 04:19:04.068694       6 controller.go:373] Service "default/nginx-ingress-default-backend" does not have any active Endpoint
> I0525 04:19:04.068733       6 controller.go:170] Configuration changes detected, backend reload required.
> I0525 04:19:04.080006       6 status.go:86] new leader elected: nginx-nginx-ingress-controller-55f5c8d54d-787rw
> I0525 04:19:04.158600       6 controller.go:188] Backend successfully reloaded.
> I0525 04:19:04.158666       6 controller.go:202] Initial sync, sleeping for 1 second.
> I0525 04:19:44.853488       6 leaderelection.go:227] successfully acquired lease default/ingress-controller-leader-nginx
> I0525 04:19:44.853665       6 status.go:86] [* new leader elected: nginx-ingress-controller-5bb5cd56fb-sz78x]
```

### 2. サンプルアプリのデプロイ
2つのアプリ(NodeJSで作ったAPI)をデプロイして、L7のLBっぽくパスベースでルーティングをする。
せっかくなのでアプリはそれぞれレプリカ数2の冗長構成とする(Deploymentのreplicas)。

まずはデプロイ(Deployment)して、対応するServiceを作成する。
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/ingress/nginx/app1.yaml
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/ingress/nginx/app2.yaml
```

デプロイしたアプリのKubernetesリソースの内容を確認する。
- Deployment  
それぞれ2つのアプリ(app1, app2)がAvailable状態になっている。
```shell
kubectl get deployment -l 'app in(app1,app2)'
```
```
> NAME   READY   UP-TO-DATE   AVAILABLE   AGE
> app1   2/2     2            2           3m28s
> app2   2/2     2            2           3m18s
```
- Pod  
冗長構成でPodがRunning状態になっている。
```shell
kubectl get pod -l 'app in(app1,app2)'
```
```
> NAME                    READY   STATUS    RESTARTS   AGE
> app1-5cb74fb87c-cw8rr   1/1     Running   0          6m28s
> app1-5cb74fb87c-n6f6r   1/1     Running   0          6m28s
> app2-f7f694b6b-s7zdq    1/1     Running   0          6m18s
> app2-f7f694b6b-svl55    1/1     Running   0          6m18s
```
- Service  
冗長構成のPodに対して、静的なアドレス(`ClusterIP`)を提供している(L4レベルのロードバランサ)。
Readiness Probeによりサービスダウンと判定されたPodは振り分け対象から外れることになる
ここがIngress Controllerの振り分け先のTarget（Backend）となる。
```shell
kubectl get svc -l 'app in(app1,app2)'
```
```
> NAME   TYPE       CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
> app1   NodePort   10.105.232.163   <none>        3000:31677/TCP   9m26s
> app2   NodePort   10.108.18.3      <none>        3000:32322/TCP   9m16s
```

### 3. Ingressリソース作成
そして最後に2つのアプリを外部に公開するための以下のIngressリソースをクラスタ環境に作成する。
適当な仮想ドメイン`frieza.dev`宛のリクエストに対して、リクエストパスが`/app1`のリクエストを`app1`Serviceリソース、`/app2`のリクエストを`app2`のServiceリソースに転送する。
```yaml
kind: Ingress
apiVersion: networking.k8s.io/v1beta1
metadata:
  name: ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  rules:
  - host: frieza.dev
    http:
      paths:
      - path: /app1
        backend:
          serviceName: app1
          servicePort: 3000
      - path: /app2
        backend:
          serviceName: app2
          servicePort: 3000
```
```shell
# Ingressリソースの作成
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/ingress/nginx/ingress.yaml
```

Ingressリソースが正しく作成されたかを確認する。
```shell
kubectl describe ingress/ingress
```
```
> Name:             ingress
> Namespace:        default
> Address:          
> Default backend:  default-http-backend:80 (<none>)
> Rules:
>   Host        Path  Backends
>   ----        ----  --------
>   [* frieza.dev]  
>              [*  /app1   app1:3000 (10.244.1.18:3000,10.244.2.22:3000)]
>              [*  /app2   app2:3000 (10.244.1.19:3000,10.244.3.17:3000)]
>  (省略)
```

実際にNginx Controllerのnginx.confがどうなっているのかを見てみる。
```shell
kubectl exec $(kubectl get pod -l app=nginx-ingress -o jsonpath='{.items[0].metadata.name}') -- cat /etc/nginx/nginx.conf
```
```
code:nginx.conf(抜粋)
## 長いのでほとんど省略
server {
server_name frieza.dev ;
listen 80;
listen [::]:80;
location /app2 {

 			set $namespace      "default";
 			set $ingress_name   "ingress";
 			set $service_name   "app2";
 			set $service_port   "3000";
 			set $location_path  "/app2";
 			
 			set $proxy_upstream_name    "default-app2-3000";
 			set $proxy_host             $proxy_upstream_name;
 			
 			proxy_pass http://upstream_balancer;
 		}
 		
 		location /app1 {
 			set $namespace      "default";
 			set $ingress_name   "ingress";
 			set $service_name   "app1";
 			set $service_port   "3000";
 			set $location_path  "/app1";
 			
 			set $proxy_upstream_name    "default-app1-3000";
 			set $proxy_host             $proxy_upstream_name;
 			
 			proxy_pass http://upstream_balancer;
 		}
 	}
```
Ingressリソースの内容が反映されているのが分かる。`upstream_balancer`はLuaスクリプトがゴニョゴニョ書いてあって動的に転送先を決めているようだった。

### 4. 動作確認
実際にアプリにアクセスするためには、DNSにDomain(Host)と公開IP(MetalLBだとLeader Node)を登録する必要があるが、ローカルでは難しいので`/etc/hosts`に名前解決のために静的エントリを登録する。
```shell
# Nginx ControllerのExternalIPを取得（今回の例だと172.16.20.11が取れます）
NGINX_IP=$(kubectl get svc -l 'app=nginx-ingress,component=controller' -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
# エントリ追加
echo "${NGINX_IP} frieza.dev" | sudo tee -a /etc/hosts
```

それぞれ登録したドメイン名でアクセスしてみる。
```shell
curl http://frieza.dev/app1; echo
```
```
> [app1:10.244.2.24]私の戦闘力は530000です…ですが、もちろんフルパワーであなたと戦う気はありませんからご心配なく…
curl http://frieza.dev/app2; echo
> [app2:10.244.1.23]ずいぶんムダな努力をするんですね・・・そんなことがわたしに通用するわけがないでしょう！
```
1つのドメインで2つのアプリに対してパスベースでルーティングができていることが分かる。

最後に冗長構成で作成したPodに対して負荷分散が正しく行われているかを見てみる。
10回リクエストを連続で送信する。
```shell
for i in {1..10}; do curl frieza.dev/app1;echo; done
```
```
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.2.24]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.2.24]私の戦闘力は530000です…(省略)
> [app1:10.244.2.24]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.2.24]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.2.24]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
```
IPアドレス(10.244.x.x)が処理したPod。リクエストがそれぞれのPodに振り分けられている様子が分かる。

ただ、NginxデフォルトのRound Robinが適用されているはずだけど微妙に違う。。。(なんでだろ？Nginxの仕様？)

### 5. 負荷分散アルゴリズムの変更
NginxではデフォルトのRound Robinではなく、Peak EWMAという負荷分散アルゴリズムを適用するようにIngressリソースを変更してみる。
レイテンシが低いPodに多くトラフィックを振り向けるアルゴリズムみたい(レイテンシの移動平均をもとにしている)
```yaml
kind: Ingress
apiVersion: networking.k8s.io/v1beta1
metadata:
  name: ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
    # アルゴリズムの変更
    nginx.ingress.kubernetes.io/load-balance: "ewma"
spec:
  rules:
  - host: frieza.dev
    http:
      paths:
      - path: /app1
        backend:
          serviceName: app1
          servicePort: 3000
      - path: /app2
        backend:
          serviceName: app2
          servicePort: 3000
```

```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/ingress/nginx/ingress-ewma.yaml
```
Ingress Controllerのログを見るとIngressリソースの変更イベントを検知しているのが分かる。
```shell
kubectl logs $(kubectl get pod -l app=nginx-ingress -o jsonpath='{.items[0].metadata.name}')
```
```
> (省略)
> I0526 00:53:42.126231       6 event.go:209] Event(v1.ObjectReference{Kind:"Ingress", Namespace:"default", Name:"ingress", UID:"3484fc34-7eaa-11e9-923c-525400261060", APIVersion:"extensions/v1beta1", ResourceVersion:"108073", FieldPath:""}): type: 'Normal' reason: 'UPDATE' Ingress default/ingress
```
すぐに変更が反映されるので、もう一度10連続でリクエストを送ってみる。
```shell
for i in {1..10}; do curl frieza.dev/app1;echo; done
```
```
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.2.24]私の戦闘力は530000です…(省略)
> [app1:10.244.2.24]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
```

テストの仕方がイケてないのでEWMAの検証としてダメだけど、さっきとリクエストの振り分け方が大きく変わったことは分かる。

### 6. セッション維持(Session Affinity)
クラウドネイティブアプリはステートレスが原則。
そうは言ってもインメモリのHttpSessionを使うようなレガシーなJavaアプリの場合は、同一クライアントからのリクエストは全て同じPodに振り向けるようにする必要がある（クラウド＋コンテナへのマイグレでは必ずありそうな要件）。
今回はこの要件に対応するためにNginxのセッション維持機能を導入する。
とは言っても[* オンプレと違い、コンテナは短命なものと認識する必要があるので、必ずしもこれが代替とはならない。アプリをステートレスにできるんだったらその方がいい。]

NginxではCookieによるセッション維持をサポートしている。
```yaml
kind: Ingress
apiVersion: networking.k8s.io/v1beta1
metadata:
  name: ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
    # Session Affinityの設定(負荷分散はデフォルトのRound Robinに戻す)
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "NGINX_SESSION"
spec:
  rules:
  - host: frieza.dev
    http:
      paths:
      - path: /app1
        backend:
          serviceName: app1
          servicePort: 3000
      - path: /app2
        backend:
          serviceName: app2
          servicePort: 3000
```
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/ingress/nginx/ingress-session.yaml
```

こちらもすぐに反映されるので、リクエストを送ってみる。
```shell
# HTTPヘッダ表示
curl -i frieza.dev/app1;echo
```
```
> HTTP/1.1 200 OK
> Server: nginx/1.15.10
> Date: Sun, 26 May 2019 02:51:54 GMT
> Content-Type: text/html; charset=utf-8
> Content-Length: 156
> Connection: keep-alive
> [* Set-Cookie: NGINX_SESSION=1558839114.369.119.405986; Path=/app1; HttpOnly]
> X-Powered-By: Express
> ETag: W/"9c-dDn4euPGsGKuZz5WqBeLYaENwbc"
>
> [app1:10.244.1.21]私の戦闘力は530000です…ですが、もちろんフルパワーであなたと戦う気はありませんからご心配なく…
```
`Set-Cookie`ヘッダにIngressリソースで指定した`NGINX_SESSION`が設定されていることが分かる。

ブラウザの動作をシミュレートして、先程のCookieの値をリクエストに指定して10回連続で送信する。
```shell
for i in {1..10}; do curl -b 'NGINX_SESSION=1558839114.369.119.405986' frieza.dev/app1; echo; done
```
```
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
```

全て最初のリクエストと同じPodにリクエストが送信されていることが分かる。

### 7. 流量制御(Rate Limiting)
最後にDDoSアタック対策としてRate Limitingによる流量制御を行う。
同一クライアントに対して1秒あたりのコネクション数を3つに制限する。
```yaml
kind: Ingress
apiVersion: networking.k8s.io/v1beta1
metadata:
  name: ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
    # Rate-Limit設定
    nginx.ingress.kubernetes.io/limit-rps: "3"
spec:
  rules:
  - host: frieza.dev
    http:
      paths:
        - path: /app1
          backend:
            serviceName: app1
            servicePort: 3000
        - path: /app2
          backend:
            serviceName: app2
            servicePort: 3000
```
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/ingress/nginx/ingress-ratelimit.yaml
```

例のごとく変更内容はすぐに反映される。
DDoSをシミュレートして50回連続でリクエストを送信してみる。
```shell
for i in {1..50}; do curl frieza.dev/app1;echo; done
```
```
> [app1:10.244.2.24]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> (たくさん中略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> [app1:10.244.1.21]私の戦闘力は530000です…(省略)
> <html>
> <head><title>503 Service Temporarily Unavailable</title></head>
> <body>
> <center><h1>503 Service Temporarily Unavailable</h1></center>
> <hr><center>nginx/1.15.10</center>
> </body>
> </html>
>
> [app1:10.244.2.24]私の戦闘力は530000です…(省略)
> <html>
> <head><title>503 Service Temporarily Unavailable</title></head>
> <body>
> <center><h1>503 Service Temporarily Unavailable</h1></center>
> <hr><center>nginx/1.15.10</center>
> </body>
> </html>
> (省略)
```

Nginxが過負荷を検知して503(ServiceUnavailable)を返していることが分かる。

