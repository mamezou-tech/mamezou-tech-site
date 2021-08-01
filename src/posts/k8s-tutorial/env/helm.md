---
title: パッケージマネージャ(helm)
author: noboru-kudo
---

*v2時代のもの。helm v3を使うように全面改訂必要です*

パッケージマネージャのHelm を利用してHelm Chartとして公開されているOSSをクラスタ環境に導入する。

クラスタ環境は[Kubernetesハンズオン-ローカルクラスタ環境構築]で構築したもものを使用
- Helmバージョン : 2.14.0
  - [v3 https://github.com/helm/community/blob/master/helm-v3/000-helm-v3.md]でHelmはアーキテクチャが大きく変わる予定
アプリケーションのマニフェスト自体をHelm Chart化するのはここではやりません。

サーバーサイドコンポーネントとしてTillerコンポーネントを使う方式(一般的)と、Helmをテンプレートエンジンとしてのみ使う方式(セキュリティが気になる組織向け)がある。

## クライアントツールインストール
どちらの方式でも共通。クライアント環境にHelmをインストールする。
https://helm.sh/docs/using_helm/
```shell
# for Mac
brew install kubernetes-helm
helm version
```
```
> Client: &version.Version{SemVer:"v2.14.0", GitCommit:"05811b84a3f93603dd6c2fcfe57944dfa7ab7fd0", GitTreeState:"clean"}
> Server: &version.Version{SemVer:"v2.14.0", GitCommit:"05811b84a3f93603dd6c2fcfe57944dfa7ab7fd0", GitTreeState:"clean"}
```

## サーバーサイドコンポーネントとしてTillerコンポーネントを使う方式
![](https://i.gyazo.com/24bed461dd2c002f838ff4bf7d7d6661.png)

### 1. Tiller権限設定
Tillerコンポーネントはクラスタ環境上でChart(Kubernetesマニフェスト群)のインストールのために様々なk8sリソースを参照・更新する必要がある。
RBACはデフォルトONのため、Tiller用のServiceAccount(`tiller`)に対してClusterRole(`cluster-admin`k8s組み込みロール)を紐づける。
Tillerはどのnamespaceに対してもChartインストールができるようRoleBindingではなくClusterRoleBindingを指定
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tiller
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: tiller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: tiller
  namespace: kube-system
```
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/helm/tiller-rbac.yaml
```
```
> serviceaccount/tiller created
> clusterrolebinding.rbac.authorization.k8s.io/tiller created
```

### 2. Tiller(サーバーサイドコンポーネント)インストール
上記ServiceAccountでTiller(サーバサイドコンポーネント)の初期化を行う。
```shell
helm init --service-account tiller
```
```
>  helm init --service-account tiller
> (中略)
> Adding stable repo with URL: https://kubernetes-charts.storage.googleapis.com
> Adding local repo with URL: http://127.0.0.1:8879/charts
> $HELM_HOME has been configured at /Users/noboru-kudo/.helm.
> Tiller (the Helm server-side component) has been installed into your Kubernetes Cluster.
```
TillerのPodを確認(デフォルトは`kube-system`にインストールされる)。
```shell
kubectl get pod -n kube-system -l app=helm -o wide
```
```
> NAME                             READY   STATUS    RESTARTS   AGE   IP           NODE          NOMINATED NODE   READINESS GATES
> tiller-deploy-598f58dd45-tjcbh   1/1     Running   0          10h   10.244.1.2   k8s-worker1   <none>           <none>
> => tillerはWorkerノード(この場合はk8s-worker1)にスケジューリングされた
```

### 3. Chartインストール
[Helm Hub] (Publicリポジトリ)よりKubernetes用の簡易可視化ツールのkube-dashboardをクラスタ環境に導入する。
- <https://hub.helm.sh/charts/stable/kubernetes-dashboard>
- <https://github.com/kubernetes/dashboard>

Publicリポジトリ以外を使用する場合は事前に`helm repo add`でChartが格納されているリポジトリを登録する
アプリケーション自体をChart化する場合もChartプライベートリポジトリを構築してURLを追加する(Option。ディレクトリ直接でもイケますが社内で共有する用途であればリポジトリを構築するのが無難です)

Helmクライアントツール(`helm upgrade`)でインストール。Helm Chartに登録されているKubernetesリソースが一気に生成されていく。
`helm install`コマンドでも可能だけど、インストール済みの場合はアップデートするこちらが使い勝手がいい。

```shell
helm upgrade --install kubernetes-dashboard stable/kubernetes-dashboard --namespace kube-system \
--set rbac.clusterAdminRole=true --wait
```
```
>  Release "kubernetes-dashboard" does not exist. Installing it now.                                                                                                                                                                     [7/1859]
> NAME:   kubernetes-dashboard                                                                                                                                                                                                                  
> LAST DEPLOYED: Tue May 21 23:37:53 2019                                                                                                                                                                                                       
> NAMESPACE: kube-system                                                                                                                                                                                                                        
> STATUS: DEPLOYED
>
> RESOURCES:                                                                                                                                                                                                                                    
> ==> v1/Pod(related)                                                                                                                                                                                                                           
> NAME                                   READY  STATUS   RESTARTS  AGE
> kubernetes-dashboard-58d96f69b8-bvmqp  1/1    Running  0         2s
>
> ==> v1/Secret
> NAME                  TYPE    DATA  AGE
> kubernetes-dashboard  Opaque  0     2s
>
> ==> v1/Service
> NAME                  TYPE       CLUSTER-IP    EXTERNAL-IP  PORT(S)  AGE
> kubernetes-dashboard  ClusterIP  10.96.129.96  <none>       443/TCP  2s
>
> ==> v1/ServiceAccount
> NAME                  SECRETS  AGE
> kubernetes-dashboard  1        2s
>
> ==> v1beta1/ClusterRoleBinding
> NAME                  AGE
> kubernetes-dashboard  2s
>
> ==> v1beta1/Deployment
> NAME                  READY  UP-TO-DATE  AVAILABLE  AGE
> kubernetes-dashboard  1/1    1           1          2s
```

Tiller(サーバーコンポーネント)はデプロイされた情報(Releaseという)を履歴管理しているので、それを確認する。
これをもとにデプロイ失敗時にロールバック(`helm rollback`コマンド)することができる。
```shell
helm list
```
```
> NAME                    REVISION        UPDATED                         STATUS          CHART                           APP VERSION     NAMESPACE  
> kubernetes-dashboard    1               Tue May 21 23:37:53 2019        DEPLOYED        kubernetes-dashboard-1.5.2      1.10.1          kube-system
```
```shell
helm history kubernetes-dashboard
```
```
> REVISION        UPDATED                         STATUS          CHART                           DESCRIPTION     
> 1               Tue May 21 23:37:53 2019        DEPLOYED        kubernetes-dashboard-1.5.2      Install complete
> => rev.1だけ。何度かupgradeするとここで履歴が蓄積されていく
```

実際にクラスタ環境にインストールされたkubernetes dashboardのリソースを確認する。
```shell
kubectl get deploy,rs,pod -l app=kubernetes-dashboard -n kube-system
```
```
> NAME                                         READY   UP-TO-DATE   AVAILABLE   AGE
> deployment.extensions/kubernetes-dashboard   1/1     1            1           20h
>
> NAME                                                    DESIRED   CURRENT   READY   AGE
> replicaset.extensions/kubernetes-dashboard-58d96f69b8   1         1         1       20h
>
> NAME                                        READY   STATUS    RESTARTS   AGE
> pod/kubernetes-dashboard-58d96f69b8-bvmqp   1/1     Running   0          20h
```

クライアント側でkube-proxyを起動し、ダッシュボード（UI）を確認する
単体で確認する場合はNodePort経由でもできるけどセキュリティ的にこれがオススメらしい。
実運用で使う場合はIngress経由にするといい
```shell
kubectl proxy
```

ブラウザから`http://localhost:8001/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:https/proxy/`にアクセス。

![](https://i.gyazo.com/ea3aef10257da228e055b8f674f2bcd6.png)
`$HOME/.kube/config`を選択してサインイン(Hiddenディレクトリ表示はCMD+Shift+`.`)してクラスタ状態確認

- Node
![](https://i.gyazo.com/3996b9f3ecb8e2e18cb1d452237ff17a.png)

- Pod
![](https://i.gyazo.com/cbb795efca06dca651a2b3a07562ec2f.png)

### 99. Clean up
`helm delete --purge`でReleaseを削除する。purgeオプションを指定しないと次にインストールするときにエラーになる(Revisionが残る)。
```shell
helm delete --purge kubernetes-dashboard
```
Tiller(サーバーサイドコンポーネント)自体をアンインストールするには`helm reset`コマンドを実行する。
```shell
helm reset
```
```
> Tiller (the Helm server-side component) has been uninstalled from your Kubernetes Cluster.
```

---

## クライアントモードでHelmを使う方式
HelmをChartｰ>k8s Manifestのテンプレートエンジンとして使う方式。セキュリティ上の理由でTillerサーバを導入できない場合に使用する。
![](https://i.gyazo.com/83287ed4c936fa9926eb44705407c56c.png)

Tillerを使わないため、セキュリティ的には高いが、Helmの持つロールバックとかのRelease管理を使うことはできない。
ローカルにTillerを起動するプラグインもあるが今回はプラグインを使わない方法でやる。
https://github.com/rimusz/helm-tiller

### 1. Client OnlyモードでHelm初期化
`--client-only`オプションで初期化する。この場合はTillerはクラスタ環境にインストールされない。
```shell
helm init --client-only
```
```
> $HELM_HOME has been configured at /Users/noboru-kudo/.helm.
> Not installing Tiller due to 'client-only' flag having been set
```
```shell
helm list
```
```
> Error: could not find tiller
```

### 2. Chartインストール
[Helm Hub] (Publicリポジトリ)よりCIツールの[Jenkins]をクラスタ環境に導入する。

Jenkins用のnamespace`ops`を作成する。
```shell
kubectl create namespace ops
```
```
> namespace/ops created
```

PublicリポジトリからJenkinsのHelm Chartを取得する。
```shell
helm fetch stable/jenkins --untar
ls -la jenkins/
```
```
>  (省略)
> -rw-r--r--   1 noboru-kudo  staff   1101  5 22 21:11 jenkins-agent-svc.yaml
> -rw-r--r--   1 noboru-kudo  staff   2354  5 22 21:11 jenkins-backup-cronjob.yaml
> -rw-r--r--   1 noboru-kudo  staff   1736  5 22 21:11 jenkins-backup-rbac.yaml
> -rw-r--r--   1 noboru-kudo  staff  14957  5 22 21:11 jenkins-master-deployment.yaml
> -rw-r--r--   1 noboru-kudo  staff   1215  5 22 21:11 jenkins-master-ingress.yaml
> -rw-r--r--   1 noboru-kudo  staff   1695  5 22 21:11 jenkins-master-networkpolicy.yaml
> -rw-r--r--   1 noboru-kudo  staff    887  5 22 21:11 jenkins-master-route.yaml
> -rw-r--r--   1 noboru-kudo  staff   1425  5 22 21:11 jenkins-master-svc.yaml
> -rw-r--r--   1 noboru-kudo  staff    506  5 22 21:11 jobs.yaml
> -rw-r--r--   1 noboru-kudo  staff   3154  5 22 21:11 rbac.yaml
> -rw-r--r--   1 noboru-kudo  staff   1055  5 22 21:11 secret.yaml
> -rw-r--r--   1 noboru-kudo  staff    740  5 22 21:11 service-account-agent.yaml
> -rw-r--r--   1 noboru-kudo  staff    601  5 22 21:11 service-account.yaml
> =>カレントディレクトリにChart(Jenkinsのテンプレート)が展開されている
```

`helm template`コマンドでChartをk8sマニフェストに変換して、kubectlでインストールする。
```shell
# PersistentVolume, Ingressは未セットアップなので無効にしている
# 確認用Port(30080)とadmin初期パスワード(admin-pass)を指定
helm template jenkins/ --name jenkins --namespace ops \
--set persistence.enabled=false --set master.ingress.enabled=false \
--set master.adminPassword=admin-pass --set master.nodePort=30080 \
--set master.serviceType=NodePort \
| kubectl apply -n ops -f -
```
```
> secret/jenkins created
> configmap/jenkins created
> configmap/jenkins-tests created
> serviceaccount/jenkins created
> role.rbac.authorization.k8s.io/jenkins-schedule-agents created
> rolebinding.rbac.authorization.k8s.io/jenkins-schedule-agents created
> service/jenkins-agent created
> service/jenkins created
> pod/jenkins-ui-test-j2ptb created
> deployment.apps/jenkins created
```

Jenkins Podが起動していることを確認する(多少時間はかかる)。
jenkins-ui-testというPodがErrorになっているがこれは問題ないっぽい(test用のPod)。
```shell
kubectl get pod -n ops -l app.kubernetes.io/name=jenkins
```
```
> NAME                       READY   STATUS    RESTARTS   AGE
> jenkins-7f7c654479-4cvgn   1/1     Running   0          116s
```

ブラウザからWorker Node(どれでもいい)のPort 30080にアクセスして、Jenkinsのトップページが表示されることを確認。
このままだとPersistent Volume, Ingressを指定してないので、実運用では使えない(Podが消えるとデータも全て消えます)。
![](https://i.gyazo.com/32ff89a198aa169ca4cf69d7402a0354.png)

### 99. Clean up
    Tillerを使用していないので、削除もhelmでテンプレートを変換してから削除する。
```shell
helm template jenkins/ --name jenkins --namespace ops \
    --set persistence.enabled=false --set master.ingress.enabled=false \
    --set master.adminPassword=admin-pass --set master.nodePort=30080 \
    --set master.serviceType=NodePort \
    | kubectl delete -n ops -f -
```

