---
title: 継続的デリバリ - ArgoCD
author: noboru-kudo
date: 2022-02-06
tags: [CI/CD, GitOps, argocd]
prevPage: ./src/posts/k8s-tutorial/delivery/flux.md
---

[前回](/containers/k8s/tutorial/delivery/flux/)は、GitOpsの産みの親であるWeaveworks社が開発した[Flux](https://fluxcd.io/)を導入して、継続的デリバリを実現しました。

今回はもう1つのGitOpsツールとして人気を集める[ArgoCD](https://argoproj.github.io/cd/)を導入します。
Flux同様に、ArgoCDもGitOpsを体現したツールですが、最も大きな違いとして、ArgoCDはリッチなWeb UIを組み込みで持っています[^1]。
このUIにより、Gitとクラスタ環境の同期状況が視覚的に把握可能です。また、このUIにはリリース履歴、ログ参照や差分チェック等、多彩な機能が搭載されており、kubectlを理解していなくてもクラスタ運用できる点が、ArgoCDの大きなメリットでしょう。
弊社の社内システムでも、ArgoCDを利用して継続的デリバリ環境を構築しています。

[^1]: Fluxでも開発中のものはありますが、正式版ではありません。<https://github.com/fluxcd/webui>

最終的には、以下のような構成となります。
![](https://i.gyazo.com/d01fe3395b35148bc88d46a0b4329f7c.png)

主要部分のみですが、ArgoCDの各コンポーネントは、継続的に以下を実施します。
① GitHubリソースよりマニフェスト生成(キャッシュ)。
② 差分検知とKubernetes環境への反映。
③ UI/CLI等へのAPI提供。

このようにして、ArgoCDでも定期的にGit(期待する状態)とクラスタ(現実の状態)を同期して、GitOpsを実現します。

[[TOC]]

## 事前準備

[前回](/containers/k8s/tutorial/delivery/flux/)Fluxで環境構築済みの場合は、そのまま利用できますので、新たに構築不要です。
未実施の場合は事前に、EKS/アプリケーションの実行環境を作成してください。

### EKSクラスタ環境
以下を参考に、EKSクラスタ環境を用意してください。

- [クラスタ環境構築 - AWS EKS (eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl/)
- [クラスタ環境構築 - AWS EKS (Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform/)

### アプリケーション
対象アプリケーションは、アプリケーション開発編で実施したタスク管理ツールを利用します。
アプリケーションのデプロイは不要ですが、前提となるDynamoDB等のAWS環境のセットアップや、Kustomizeのマニフェストファイルは事前に用意しておく必要があります。

- [クラスタ環境デプロイ - コンテナレジストリ(ECR)](/containers/k8s/tutorial/app/container-registry/)
- [クラスタ環境デプロイ - EKSクラスタ(AWS環境準備)](/containers/k8s/tutorial/app/eks-1/)
- [クラスタ環境デプロイ - EKSクラスタ(Kustomize導入)](/containers/k8s/tutorial/app/eks-2/)
- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/)

なお、各アプリケーションのコンテナイメージは、`1.0.0`タグでECRにプッシュしておいてください。
- [コンテナイメージのビルド](/containers/k8s/tutorial/app/eks-3/#コンテナイメージのビルド)

## ArgoCDのセットアップ

### ArgoCDインストール

ArgoCDには、以下のように様々なインストール方法が用意されています。

- [Installation](https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/)

今回は、Helmを使ってArgoCDをインストールします。
`<your-custom-domain>`の部分は、自分で取得したドメインに置き換えてください。

```shell
helm upgrade argocd argo/argo-cd \
  --install --version 3.33.3 \
  --namespace argocd --create-namespace \
  --set server.extraArgs[0]="--insecure" \
  --set config.url=argocd.<your-custom-domain> \
  --wait
```

`argocd`Namespace内に、現時点で最新の`3.33.3`のHelmチャートをインストールしました。
インストールが正常に終了したら、ArgoCDのコンポーネントを確認しましょう。

```shell
kubectl get pod -n argocd
```
```
NAME                                            READY   STATUS    RESTARTS   AGE
argocd-application-controller-774475c7c-vjgnm   1/1     Running   0          3m57s
argocd-dex-server-6497f5d97-468ff               1/1     Running   0          3m57s
argocd-redis-694d566c49-jjw4h                   1/1     Running   0          3m57s
argocd-repo-server-848ffdcb7f-qt7z9             1/1     Running   0          3m57s
argocd-server-84d6b447b4-j8kfr                  1/1     Running   0          3m57s
```

ArgoCDの各種コンポーネントが実行中になっていればインストール完了です。

### マニフェスト用のGitリポジトリ作成

自分のGitHubアカウントまたは組織(Organization)に、事前にマニフェスト用のGitリポジトリを作成してください。
ここには、各種Kubernetesのマニフェストを配置します。
なお、[Flux](/containers/k8s/tutorial/delivery/flux/)チュートリアルで既に作成済みであれば、新たに作成は不要です。

ここでは`task-tool-cluster-config`というプライベートリポジトリを作成していることを前提とします。
別のリポジトリ名で作成した場合は、以降は該当箇所を置き換えてください。

作成したリポジトリは、ローカル環境にクローンしておきましょう。

```shell
git clone https://github.com/<github-user>/task-tool-cluster-config.git
cd task-tool-cluster-config
export CONFIG_ROOT=$(pwd)
```

以降は、この`CONFIG_ROOT`配下で作業することを前提としています。

### Web UI向けのIngress作成

前述の通り、ArgoCDにはリッチなUIが備わっています。
ですが、デフォルトでは、このUIにアクセスする手段は用意されていません。Ingressを配置し、ブラウザからアクセスできるようにしましょう。
既に事前準備でNGINX Ingress Controllerをセットアップ済みですので、これを使用してArgoCDにルーティングを追加します。
また、HTTPS経由でアクセスするため、こちらも事前準備でセットアップ済みのCert Managerを使用して、Let's Encryptの証明書も作成しましょう。

以下のマニフェストファイル(ここでは`argocd/argocd-ingress.yaml`としました)を用意してください。
なお、`<your-email-address>`/`<your-custom-domain>`は、自分のものに置き換えてください。

```yaml
---
# TLS証明書のLet's Encrypt Issuer
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: letsencrypt-issuer
  namespace: argocd
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: <your-email-address>
    privateKeySecretRef:
      name: acme-client-letsencrypt
    solvers:
      - http01:
          ingress:
            class: nginx
---
# UI向けのHTTPSルール
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-http-ingress
  namespace: argocd
  annotations:
    external-dns.alpha.kubernetes.io/hostname: argocd.<your-custom-domain>
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    cert-manager.io/issuer: letsencrypt-issuer
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - argocd.<your-custom-domain>
      secretName: http-argocd-ingress-cert
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  name: http
      host: argocd.<your-custom-domain>
---
# CLI向けのgRPCルール(任意)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-grpc-ingress
  namespace: argocd
  annotations:
    external-dns.alpha.kubernetes.io/hostname: grpc-argocd.<your-custom-domain>
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "GRPC"
    cert-manager.io/issuer: letsencrypt-issuer
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - grpc-argocd.<your-custom-domain>
      secretName: grpc-argocd-ingress-cert
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  name: https
      host: grpc-argocd.<your-custom-domain>
```

若干長いですが、内容は単純です。
まず1つ目で、TLS証明書の自動セットアップのために、Let's EncryptのIssuerリソースを用意しています。

その後の2つのIngressリソースが、UIからArgoCDへのルーティングを担います。
`argocd-server-http-ingress`では、HTTPS経由でのリクエストをルーティングしています。これは主にUIからのリクエストハンドラーです。
もう1つの`argocd-server-grpc-ingress`は、ArgoCDのCLI向けです。ArgoCDのCLIではgRPCプロトコルでArgoCDとやりとりします。
ArgoCDのCLIについては今回は利用しませんので、こちはセットアップしなくても構いません(任意)。
CLIに興味のある方は、以下を参照してください。こちらを利用すると、FluxのようにCLIのみでArgoCDの操作が可能になります。

- <https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd/>

なお、NGINX以外のIngress Controllerを使用する場合は、[公式ドキュメント](https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/)を参照してセットでしてください。

これを反映しましょう。

```shell
kubectl apply -f argocd/argocd-ingress.yaml
```

しばらくすると、External DNSによるDNSレコードの追加や、TLS証明書の取得が終わり、ArgoCDのUIへのアクセスができるようになります。
ブラウザより`https://argocd.<your-custom-domain>/`にアクセスしてみましょう。

![](https://i.gyazo.com/3b9024369ae836e735f6a3ed843a1673.png)

このようにログインページが表示されていれば問題ありません。
TLS証明書の発行には時間がかかりますので、表示されない場合はもう少し待ってみましょう。待っても表示されない場合は、[こちら](/containers/k8s/tutorial/ingress/https/#正規の証明書でhttps通信)を参考にCert Manager側の状態を確認してください。

それでは、ArgoCD組み込みの管理者ユーザー`admin`でログインしましょう。
パスワードは、以下で取得できます。

```shell
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath="{.data.password}" | base64 -d; echo
```

ログインできれば確認完了です。現時点では何も登録されていない状態です。

なお、ユーザー管理については、ArgoCD単体でも可能ですが、ほとんどの組織では別途SSO基盤が用意されていることでしょう。
ArgoCDでは、Google、Keycloak等、[OpenID Connect(OIDC)](https://openid.net/connect/)プロトコルに対応しているプロバイダであれば、ユーザー認証を移譲できます。
また、ArgoCDに組み込まれている[Dex](https://github.com/dexidp/dex)を使うことで、OIDC非対応(SAML、LDAP等)のプロバイダーとの連携も可能です。
詳細は[こちら](https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/#sso)を参照してください。

また、ArgoCDでは認可機能が備わっています。実運用ではadminは無効にしておき、別途ユーザーグループでポリシー管理をすることが望ましいでしょう。
ArgoCDの認可機能については、[こちら](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)を参照してください。

## アプリケーションマニフェスト追加

それでは、先程生成したリポジトリにアプリケーションの構成を追加していきましょう。

なお、ここはFluxのチュートリアル実施済みの場合はスキップしても構いませんが、**イメージは初期バージョンの1.0.0に戻してください。**

リポジトリルート(`CONFIG_ROOT`)直下にディレクトリ`app`を作成し、以前Kustomize形式で作成したファイル[^2]をコピーします。

[^2]: 未作成の場合は、[こちら](https://github.com/mamezou-tech/k8s-tutorial/tree/main/app/k8s/v3-ans)を利用可能です。`lets-encrypt-issuer.template.yaml`のemail設定とファイルリネーム(`template`削除)と、`kustomization.yaml`の`images`/カスタムドメインを自身の環境に合わせて変更してください。

```shell
mkdir ${CONFIG_ROOT}/app
# PROJECT_ROOTはアプリケーションソースコードを配置したリポジトリルート
cp -r ${PROJECT_ROOT}/app/k8s/v3/base ${CONFIG_ROOT}/app
cp -r ${PROJECT_ROOT}/app/k8s/v3/overlays ${CONFIG_ROOT}/app
```

以下の構成となります。

```
.
├── app
│   ├── base
│   │   ├── ingress
│   │   │   └── ingress.yaml
│   │   ├── kustomization.yaml
│   │   ├── task-reporter
│   │   │   └── cronjob.yaml
│   │   └── task-service
│   │       ├── deployment.yaml
│   │       └── service.yaml
│   └── overlays
│       ├── local -> 今回は未使用
│       └── prod
│           ├── kustomization.yaml
│           ├── lets-encrypt-issuer.template.yaml
│           ├── lets-encrypt-issuer.yaml
│           ├── patches -> パッチファイル
│           └── task-web -> UIマニフェスト
└── argocd
    └── argocd-ingress.yaml -> 適用済み
```

`app/overlays/prod/kustomization.yaml`の`images`に指定したタグが、初期バージョンの`1.0.0`となっていることを確認してください。

:::info
現時点でArgoCD(2.2.4)に含まれるKustomizeのバージョンが4.2.0と、Kubernetes1.21のCronJob(`batch/v1`)に未対応でした。
このため、CronJobマニフェストのapiVersionを`batch/v1beta1`にする必要がありました。
なお、ここでは実施しませんが、カスタムバージョンのKustomizeセットアップも可能です。
Kustomizeのバージョンアップ(v4.3.0~)で対応する場合は、[こちら](https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/#custom-kustomize-versions)を参照してください。
:::

## ArgoCDからGitHubへの認証設定

GitリポジトリにArgoCDがアクセスできるよう、認証情報をクラスタに設定しましょう。

まず、GitHubにログインして、アクセストークンを発行してください。許可するスコープは`repo`のみで構いません。
なお、Fluxのチュートリアルで発行作成済みでしたら、同じものを利用して構いません。

- [Creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

ArgoCDの認証設定は、Web UIからも作成可能ですが、ここではSecretリソース経由で実施します。

以下のコマンドでSecretリソースを作成し、専用のラベルをつけます。

```shell
# 以下は発行したアクセストークンに置き換えてください
export GITHUB_TOKEN=<github-token>
kubectl create secret generic task-tool-cluster-config-cred -n argocd \
  --from-literal url=https://github.com/${GITHUB_USER}/task-tool-cluster-config \
  --from-literal username=<github-user> \
  --from-literal password=${GITHUB_TOKEN} \
  --from-literal name=task-tool-cluster-config
kubectl label secret task-tool-cluster-config-cred argocd.argoproj.io/secret-type=repository -n argocd
```

作成したら、ArgoCDのUI左側のメニューよりSettings -> Repositoriesを選択してみましょう。

![](https://i.gyazo.com/885372a24130654d53898a8307a9c280.png)

Repositoryとして、認証情報が設定されています。
`CONNECTION STATUS`を見ると、GitHubへの接続に成功していることも確認できます。

## アプリケーションのGit同期設定

ここまでで、ArgoCDを利用する準備が整いました。
Flux同様にArgoCDでも、アプリケーションの同期設定は、カスタムリソースを作成する必要があります。
これには以下の方法がサポートされています。

- ビルトインのWeb UI
- [ArgoCD CLI](https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd/)
- [Declarative Setup](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/)

今回は、リソース作成/更新は「Declarative Setup」、その確認に「Web UI」を使用します。

### プロジェクト(AppProject)

アプリケーションの論理的なグループです。
デフォルトで用意されているもの(`default`)の使用も可能ですが、専用のプロジェクトで作成しておくと、ソースとなるGitリポジトリやターゲットクラスタを制約したり、ロールで権限を絞ることができます。通常はチーム単位で作成しておくと良いでしょう。

`argocd/task-tool-app-project.yaml`を作成し、以下を記述してください。
`<github-user>`は自分のものに置き換えてください。

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: task-tool
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  description: task-tool application for k8s tutorial
  sourceRepos:
    - "https://github.com/<github-user>/*"
  destinations:
    - namespace: prod
      server: https://kubernetes.default.svc
```

ソースは自分のGitHubアカウント配下のリポジトリに限定し、`prod`Namespaceのみにデプロイすることを許可しています。

他にも多数の設定が可能です。詳細は[こちら](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#projects)を参照しくてださい。

これを適用します。

```shell
kubectl apply -f argocd/task-tool-app-project.yaml
```

ArgoCDのUIで、Settings -> Projectsを選択し、以下のように表示されれば、作成完了です。

![](https://i.gyazo.com/633d9cb4b6aa51f5ff2e42534b825bcd.png)

### アプリケーション

ここで、デプロイ対象のアプリケーションの同期設定をします。
`argocd/task-tool-app-project.yaml`を作成し、以下を記述してください。
ここでも、`<github-user>`は自分のものに置き換えてください。

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-task-tool
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: task-tool # 先程作成したプロジェクトを指定
  source:
    repoURL: https://github.com/<github-user>/task-tool-cluster-config
    targetRevision: main
    path: app/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
```

`source`や`destination`にプロジェクト設定で許可したもの以外を設定すると、エラーとなります。
また、`source`の`path`にはKustomizeのoverlaysを指定しています。ArgoCDではこの配下のファイルからマニフェスト生成のツールを推論します。

`syncPolicy`として`automated`を指定しています。これを設定することで、Gitからクラスタ環境への同期が自動になります。

Applicationリソースの詳細は[こちら](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#applications)を参照しくてださい。

こちらもクラスタ環境に適用しましょう。

```shell
kubectl apply -f argocd/task-tool-application.yaml
```

少し待ってから、ArgoCDのUIのトップページを見ると、アプリケーションが作成され、GitHubとの同期が始まっている様子が分かります。

![](https://i.gyazo.com/97af932280cf82b7ddc87b9950bdc76b.png)

対象アプリケーションをクリックして、実際のアプリケーションの内容を見てみましょう（右上のアイコンより表示切替できます）。

#### リソースツリー
![](https://i.gyazo.com/be0f5392bc041576099c9042f7e4fe2c.png)
#### ノード状態
![](https://i.gyazo.com/adefd6e2d3fe5e70a8a76125a1aff277.png)
#### ネットワーク構成
![](https://i.gyazo.com/4b283ae7fd34477586670d8f0f13a146.png)

以下の状態が分かります。

- デプロイリソース間の関係性
- 各リソースの同期状態や健康状態
- 現在のクラスタ状態に対応するGitコミット
- 現在のクラスタとGitの差分有無
- ノードの状態(メモリ・CPU使用量やデプロイされているPod)
- ネットワーク通信経路

また、各リソースをクリックするとマニフェストリソースの詳細やログ・イベントを参照できます。
さらに、Gitの状態(Desired Manifest)と実際の状態(Live Manifest)のコードレベルでの差分表示もできます(後述)。

これだけ見ても、ArgoCDのUIがどれほどリッチなのかは一目瞭然でしょう。kubectlを使う必要性はほとんどありません。

なお、ここでは直接`kubectl apply`を使ってArgoCDのリソース(AppProject/Application)を反映しました。
さらに一步進めて、Fluxのカスタムリソースのように、これもGitと同期するようにすること(app of apps pattern)も可能です。
ここでは実施しませんが、こちらに挑戦する場合は、公式ドキュメントの[Cluster Bootstrapping](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/)を参照してください。

## 動作確認

ここからはGit上のマニフェストを修正して、ArgoCDの挙動を確認してみましょう。

ArgoCDの動作を確認するために、一旦自動反映を無効にしておきます。
`argocd/task-tool-application.yaml`を以下のように変更してください。

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-task-tool
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: task-tool
  source:
    repoURL: https://github.com/kudoh/task-tool-cluster-config
    targetRevision: main
    path: app/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: prod
#  syncPolicy:
#    automated:
#      prune: true
#      selfHeal: true
#      allowEmpty: false
```

`syncPolicy`をコメントアウトするだけです。これでGitとの自動同期が停止されます。
こちらで更新しておきます。

```shell
kubectl apply -f argocd/task-tool-application.yaml
```

### レプリカ数変更

タスク管理API(`task-service`)のトラフィックが急増したと想定し、レプリカ数を上げてみましょう。
`app/overlays/prod/deployment.patch.yaml`を変更します。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
spec:
  replicas: 5
# (以下省略)
```

`replicas`でレプリカ数を3から5に変更しています。後はコミットしてプッシュするだけです。

```shell
git add app && git commit -m "Increase task-service replica size"
git push
```

ArgoCDのUIを確認してみましょう。

![](https://i.gyazo.com/10ecc3d4a6e9c1800b2edc912514f99b.png)

ArgoCDが、クラスタ環境とGitが異なることを検知し、Sync Statusを`OutOfSync`に変更していることが分かります。
App Diffボタンをクリックすると以下のようになります。

![](https://i.gyazo.com/3e0ea5f9794cf0fd9a5770d70cb99f13.png)

Git(期待する状態)と現在のクラスタ状態の差分が表示されます。ここではレプリカ数(`replicas`)が異なっているということが分かります。

ではこれを同期しましょう。Syncボタンをクリックし、表示されるスライドバーよりSynchronizeボタンを押します。

![](https://i.gyazo.com/cefb4e2ce25629cffa9731f099515ae0.gif)

Sync Statusが`Synced`となり、追加となった2つのPodが起動されていく様子が分かります。
また、その後にPodの起動が完了し、App Healthが`Healthy`となっていくことも確認できます。
このように、ArgoCDではGitとの同期状態だけでなく、デプロイリソース自体の状態も監視し、クラスタが正常に動作しているかをチェックしています。

### アプリケーションのバージョンアップ

ここではアプリケーションを新しいタグに更新し、これを自動反映できるかを確認しましょう。

現状ArgoCDでは、Fluxのようにビルトインでイメージ更新を検知して、クラスタ環境に反映する機能はありません。
これには別途プロダクト(Argo CD Image Updater)の導入が必要です。
- <https://github.com/argoproj-labs/argocd-image-updater>

今回は、手動でイメージタグを更新し、先程と同様にArgoCDで同期しましょう。自動アップデートを試したい場合は上記を試してみてください。

### 新しいイメージタグ作成

[Fluxのチュートリアル](/containers/k8s/tutorial/delivery/flux/#動作確認)で実施済みの場合は、スキップして構いません。

ArgoCD上の動作確認が目的のため、アプリケーション自体は変更せずに、1.0.0タグのイメージを1.1.0でも作成します。
以下を実行し、ECRに1.1.0のイメージをプッシュします。

```shell
# バージョン1.1.0作成
docker tag <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.0.0 \
  <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.1.0

# ECRプッシュ
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com
docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.1.0
```

### 動作確認

それでは、新しいイメージタグを反映するようにしましょう。
`app/overlays/prod/kustomization.yaml`の`task-service`のイメージを、1.0.0から1.1.0に変更しましょう。

```yaml
images:
  - name: task-service
    newName: <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service
    newTag: 1.1.0
```

変更後はGitにコミット＆プッシュしておきましょう。

```shell
git add app && git commit -m "Bumped to 1.1.0"
git push
```

先程同様にArgoCDのUIは`OutOfSync`になります。差分を確認してみましょう。

![](https://i.gyazo.com/3b82aae81da4d98296e4e8a063e56602.png)

アプリケーションのバージョンアップが差分として出ていることが分かります。
後は新しいバージョンでクラスタを同期しましょう。手順は先程と同じです。

![](https://i.gyazo.com/3c226f36ab20feeece6c68302f0f40ac.gif)

アプリケーションが、ローリングアップデートで更新されていく様子が見て取れます。

また、HISTORY AND ROLLBACKをクリックすると、リリース内容を履歴確認できます。

![](https://i.gyazo.com/4f14a367f04d638bdc96388524559b84.png)

このようにインフラの変更(今回はレプリカ数)も、アプリケーションの変更も手順は変わりません。
今回は手動同期としましたが、自動同期を再度有効化すれば、全自動でGit上の状態と同期され、そのフィードバックをUIで確認できます。


## クリーンアップ

ArgoCDで作成したリソースについては、以下で削除してください。

```shell
# Applicationとともに、デプロイしたアプリも削除される
kubectl delete -f argocd/task-tool-application.yaml
kubectl delete -f argocd/task-tool-app-project.yaml
# Ingress
kubectl delete -f argocd/argocd-ingress.yaml
```

ArgoCD自体はHelmコマンドで削除します。

```shell
helm uninstall argocd -n argocd
```

それ以外のリリース削除については、以下を参照してください。

- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/#クリーンアップ)

## まとめ

ここでは、もう1つのGitOpsツールとして人気のArgoCDを導入して、継続的デリバリ環境を構築しました。
CLIベースで地味なFluxと違い、ArgoCDのリッチなUIに惹かれた方も多いのではないでしょうか？

とはいえ、FluxがArgoCDより劣っていることはありません。
Fluxは、v2リリースで洗練されたカスタムリソースとそのコントローラが導入され、ArgoCDよりも構造が理解しやすくなったと感じています。

どちらを選択するにせよ、Gitを中心としたサービスのデリバリ環境を整えることは、安定した運用の実現に欠かせません。
開発だけにとどまらず、その後の継続的な改善フィードバックを回すことは健全なプロジェクトにとって必須要素です。
これらのツールの導入自体の敷居は低いと感じますので、CI環境とセットで考えていくと良いでしょう。

なお、Flux同様に、ここでもArgoCDの通知機能については触れませんでした。
現状はArgoCDでチャット等への通知機能を使う場合は、 [ArgoCD Notifications](https://github.com/argoproj-labs/argocd-notifications)を別途導入する必要があります[^3]。
興味のある方はこちらも試してみてください。

[^3]: ロードマップ上、ArgoCDのv2.4では、ArgoCD Notificationsについても本体に組み込まれる予定です。

---
参考資料

ArgoCDドキュメント: <https://argo-cd.readthedocs.io/en/stable/>
