---
title: 継続的デリバリ - Flux
author: noboru-kudo
date: 2022-02-03
tags: [CI/CD, GitOps]
prevPage: ./src/posts/k8s-tutorial/app/eks-3.md
nextPage: ./src/posts/k8s-tutorial/delivery/argocd.md
---

アプリケーション開発編では、お手製のアプリをローカル環境やクラウド環境(AWS EKS)にデプロイしてきました。
しかし、ローカル環境はSkaffoldを使って自動化したものの、クラウド環境は`kubectl apply`を使って手動デプロイしました。

ここでは、GitOps[^1]を体現する継続的デリバリツールとして人気の[Flux](https://fluxcd.io/)を導入します。

[^1]: 2017年にWeaveworks社が提唱したプラクティスです。アプリケーションのソースだけでなく全ての構成をGitで期待する状態(source of truth)として管理し、それに合わせて実行環境を継続的に同期することで運用を容易にするスタイルです。GitOpsの詳細は[こちら](https://www.weave.works/technologies/gitops/)を参照しくてださい。

最終的には、以下のような構成となります。

![](https://i.gyazo.com/63abb38d54406943dac3399beb53c9c7.png)

Fluxは、以下を行うコンポーネント群(GitOps Toolkit)です。
① GitHubよりクラスタ構成(マニフェストファイル)リポジトリを取得。
② 構成変更を実行環境のKubernetesに反映。
③ コンテナレジストリのイメージプッシュを検知。
④ 新バージョンのイメージタグをGitHubに反映。

Fluxでは、これらを定期的にループ(Control Loop)することで、Git(期待する状態)とクラスタ(現実の状態)を同期して、GitOpsを実現します。

なお、Fluxは継続的デリバリに特化したツールです。したがって、アプリケーションの単体テストやビルド等は、別途CIツールで実行する必要があります。
このCIの部分は、従来と大きく変わることはありません。
違いは、最終的な成果物がアプリケーションを含むコンテナイメージとして、コンテナレジストリにプッシュされることくらいでしょう(追加でイメージ自体のテストもあるかもしれません)。
これらはGitHub ActionsやGitLab CI、Jenkins等、様々なCIツールで容易に実現できます。CIについては本題から逸れるため、ここでは省略します。


## 事前準備
### EKSクラスタ環境
以下を参考に、EKSクラスタ環境を用意してください。

- [クラスタ環境構築 - AWS EKS (eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl/)
- [クラスタ環境構築 - AWS EKS (Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform/)

なお、FluxはGitHubリポジトリをSSHでクローンします。
Terraformの場合は、デフォルトではこの接続を拒否しますので、追加セキュリティグループを作成し、これを許可するようにしてください。
```hcl
module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  version         = "18.0.5"
  # (省略)
  node_security_group_additional_rules = {
    # (省略)

    # flux require ssh access to clone git repository
    egress_ssh_internet = {
      description = "Egress SSH to internet"
      protocol    = "tcp"
      from_port   = 22
      to_port     = 22
      type        = "egress"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}
```

### アプリケーション
対象アプリケーションは、アプリケーション開発編で実施したタスク管理ツールを利用します。
アプリケーションのデプロイは不要ですが、前提となるDynamoDB等のAWS環境のセットアップや、Kustomizeのマニフェストファイルは事前に用意しておく必要があります。

- [クラスタ環境デプロイ - コンテナレジストリ(ECR)](/containers/k8s/tutorial/app/container-registry/)
- [クラスタ環境デプロイ - EKSクラスタ(AWS環境準備)](/containers/k8s/tutorial/app/eks-1/)
- [クラスタ環境デプロイ - EKSクラスタ(Kustomize導入)](/containers/k8s/tutorial/app/eks-2/)
- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/)

なお、各アプリケーションのコンテナイメージは、`1.0.0`タグでECRにプッシュしておいてください。
- [コンテナイメージのビルド](/containers/k8s/tutorial/app/eks-3/#コンテナイメージのビルド)

## Flux CLIインストール

以下公式ドキュメントを参照し、FluxのCLIをインストールしてください。今回は執筆時点で最新の`0.25.3`をセットアップしました。

- [Install the Flux CLI](https://fluxcd.io/docs/installation/#install-the-flux-cli)

## Fluxコンポーネントのセットアップ
デフォルトの構成でFluxをセットアップします。

まずは、構築済みのEKSでFluxが適用可能かをチェックします。

```shell
# kubectlコンテキスト切り替え
aws eks update-kubeconfig --name mz-k8s

flux check --pre
```
```
► checking prerequisites
✔ Kubernetes 1.21.5-eks-bc4871b >=1.19.0-0
✔ prerequisites checks passed
```

上記のような出力が確認できれば問題ありません。

アプリケーション開発編では、ソースコードもKubernetesの構成も同じリポジトリに配置していましたが、今回は分離する構成とします[^2]。
Fluxでは、構成リポジトリを新規作成できますので、これを利用したいと思います。

[^2]: これ以外にも様々な構成方法があります。公式ドキュメントにリポジトリ構成のバリエーションに言及がありますので、[こちら](https://fluxcd.io/docs/guides/repository-structure/)参考にするとよいでしょう。

まず、GitHubにログインして、アクセストークンを発行してください。許可するスコープは`repo`のみで構いません。
- [Creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

自分のGitHubユーザーと発行したトークンを、環境変数に保存しておきましょう。

```shell
export GITHUB_USER=<github-user-name>
export GITHUB_TOKEN=<github-token>
```
`GITHUB_TOKEN`は後続の`flux bootstrap`コマンド内で使用されます。

それでは、タスク管理ツールのKubernetes構成用のリポジトリを作成しましょう。
以下コマンドを実行します。

```shell
flux bootstrap github \
  --owner=${GITHUB_USER} \
  --repository=task-tool-cluster-config \
  --branch=main \
  --path=./clusters/prod \
  --personal
```

GitHub[^3]個人アカウント内にマニフェスト用のプライベートリポジトリ(`task-tool-cluster-config`)を作成しました。

[^3]: GitHub以外でもGitLabやBitBucket、任意のGitについても対応可能です。詳細は[こちら](https://fluxcd.io/docs/cmd/flux_bootstrap/)より参照してください。

Fluxのコンポーネントが、Kubernetesクラスタ内にインストールされたことを確認しましょう。

```shell
kubectl get pod -n flux-system
```
```
NAME                                      READY   STATUS    RESTARTS   AGE
helm-controller-7fcd47658b-kkqfl          1/1     Running   0          80s
kustomize-controller-6fdbd74654-blzm7     1/1     Running   0          80s
notification-controller-d45f49bb5-jvfb2   1/1     Running   0          80s
source-controller-5f88b8664d-hr9zk        1/1     Running   0          80s
```

`flux-system`Namespaceが作成され、4つのPodが起動していることが確認できます。これらが相互作用することで、GitとKubernetesクラスタを同期するようになります。

また、自分のGitHubアカウントに新規リポジトリが作成されていることも確認しましょう。

![](https://i.gyazo.com/e093c3942a968e3d3096f0bfbcb4f267.png)

このように新規リポジトリが作成され、Fluxコンポーネントのマニフェストファイルが配置されていることが分かります。
これから作成するアプリケーションだけでなく、このFluxコンポーネント自体もGitHubとKubernetesクラスタで同期するようになっています。
つまり、これらのファイルを変更するとことで、Fluxコンポーネントの設定も切り替えることができるようになっています。

## アプリケーションマニフェスト追加

それでは、先程生成したリポジトリにアプリケーションの構成を追加していきましょう。
まずは、リポジトリをクローンします。

```shell
git clone https://github.com/${GITHUB_USER}/task-tool-cluster-config.git
cd task-tool-cluster-config
export CONFIG_ROOT=$(pwd)
```

以降はこの`CONFIG_ROOT`配下にファイルを配置していきます。
ディレクトリ`app`を作成し、以前Kustomize形式で作成したファイル[^4]をコピーします。

[^4]: 未作成の場合は、[こちら](https://github.com/mamezou-tech/k8s-tutorial/tree/main/app/k8s/v3-ans)を利用可能です。`lets-encrypt-issuer.template.yaml`のemail設定とファイルリネーム(`template`削除)と、`kustomization.yaml`の`images`/カスタムドメインを自身の環境に合わせて変更してください。

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
│           ├── lets-encrypt-issuer.yaml
│           ├── patches -> パッチファイル
│           └── task-web -> UIマニフェスト
└── clusters
    └── prod
        └── flux-system
            ├── gotk-components.yaml
            ├── gotk-sync.yaml
            └── kustomization.yaml
```

また、`app/overlays/prod/kustomization.yaml`の`images`に指定したタグが、初期バージョンの`1.0.0`となっていることを確認してください。

## FluxからGitHubへの認証設定

FluxからGithubのプライベートリポジトリにアクセスできるように、SSH認証情報を設定します。
以下GitHubドキュメントを参考に、SSH公開鍵をGitHubアカウントに登録しましょう。

- [Generating a new SSH key and adding it to the ssh-agent](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)

次に、ssh-keygenコマンドで作成した公開鍵、秘密鍵をKubernetesのSecretとして登録します。
```shell
# ~/.ssh/identity, ~/.ssh/identity.pubはそれぞれ秘密鍵、公開鍵ファイルのパスに置換してください
kubectl create secret generic task-tool-ssh-key -n flux-system \
  --from-literal identity="$(cat ~/.ssh/identity)" \
  --from-literal identity.pub="$(cat ~/.ssh/identity.pub)" \
  --from-literal known_hosts="$(ssh-keyscan github.com)"
```

## アプリケーションのGit同期設定

これで準備が整いました。
アプリケーションの構成をFluxで管理するための、カスタムリソースのマニフェストファイルを作成します。

### Gitリポジトリ(source)

まずは、以下のコマンドを実行します。

```shell
flux create source git task-tool \
  --url=ssh://git@github.com/${GITHUB_USER}/task-tool-cluster-config \
  --branch=main \
  --interval=30s \
  --secret-ref=task-tool-ssh-key \
  --export > ${CONFIG_ROOT}/clusters/prod/task-tool-source.yaml
```

以下のカスタムリソースのマニフェストファイルが出力されます。

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta1
kind: GitRepository
metadata:
  name: task-tool
  namespace: flux-system
spec:
  interval: 30s
  ref:
    branch: main
  secretRef:
    name: task-tool-ssh-key
  url: ssh://git@github.com/<github-user>/task-tool-cluster-config
```

これは、GitHubからアプリケーションのマニフェストを取得するために必要なものです。

### Kustomizeマニフェスト

次に、アプリケーションのKustomize構成のマニフェストの同期設定です。
以下を実行します。

```shell
flux create kustomization task-tool \
  --target-namespace=prod \
  --source=task-tool \
  --path="./app/overlays/prod" \
  --prune=true \
  --interval=5m \
  --export > ${CONFIG_ROOT}/clusters/prod/task-tool-kustomization.yaml
```

以下のカスタムリソースのマニフェストファイルが出力されます。

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1beta2
kind: Kustomization
metadata:
  name: task-tool
  namespace: flux-system
spec:
  interval: 5m0s
  path: ./app/overlays/prod
  prune: true
  sourceRef:
    kind: GitRepository
    name: task-tool
  targetNamespace: prod
```

これで、5分間隔で先程のGitRepositoryの内容(`app/overlays/prod`パス)をチェックし、変更があればKustomizeでデプロイするようになります。

### 動作確認
では、これまで作成したものをコミットして、リポジトリにプッシュしましょう。

```shell
git add app clusters && git commit -m "Add task-tool config"
git push
```

しばらくすると、FluxがGitの状態をKubernetesクラスタに同期します。
実際に、アプリケーションがデプロイされているかを確認しましょう。

```shell
kubectl get pod -n prod
```
```
NAME                                 READY   STATUS    RESTARTS   AGE
prod-task-service-7c649f75d9-5jkbn   1/1     Running   0          36s
prod-task-service-7c649f75d9-bg6zb   1/1     Running   0          37s
prod-task-service-7c649f75d9-m65m4   1/1     Running   0          36s
prod-task-web-5db579755d-r5rw5       1/1     Running   0          36s
prod-task-web-5db579755d-wsj7f       1/1     Running   0          37s
```

前回手動でデプロイしたときと同じように、アプリケーションがデプロイされていることが分かります。
どのバージョンがデプロイされているかを確認してみましょう。

```shell
kubectl get deployment prod-task-service -n prod \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

バージョン1.0.0がデプロイされているはずです。

fluxコマンドでも確認できます。
```shell
flux get kustomization task-tool
```
```
NAME            READY   MESSAGE                                                         REVISION                                        SUSPENDED 
task-tool       True    Applied revision: main/3a5b5d51de3b2ff8a8afa67280bfb728826d9a80 main/3a5b5d51de3b2ff8a8afa67280bfb728826d9a80   False   
```

mainブランチのGitコミットハッシュ`3a5b5...`が、Kubernetesに適用中であることが分かります。
なお、Fluxで管理されているリソースは、以下コマンドで確認できます。

```shell
flux tree kustomization task-tool
```
```
Kustomization/flux-system/task-tool
├── ConfigMap/prod/prod-task-reporter-config-fgmgm275tm
├── ConfigMap/prod/prod-task-service-config-hb5m86c942
├── Service/prod/prod-task-service
├── Service/prod/prod-task-web
├── Deployment/prod/prod-task-service
├── Deployment/prod/prod-task-web
├── CronJob/prod/prod-task-reporter
├── Issuer/prod/prod-letsencrypt-issuer
└── Ingress/prod/prod-app-ingress
```

では、タスク管理API(`task-service`)のバージョンを1.0.0から1.1.0にあげてみましょう。
今回はFluxによる同期を確認するだけですので、アプリケーション自体は変更せず、1.0.0のイメージを1.1.0でも作成して、Pushしておきましょう。

```shell
# バージョン1.1.0作成
docker tag <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.0.0 \
  <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.1.0

# ECRプッシュ
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com
docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.1.0
```

次に、`app/overlays/prod/kustomization.yaml`のイメージタグを手動で更新します。

```yaml
images:
- name: task-service
  newName: <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service
  newTag: 1.1.0 # 1.0.0から変更
```

今回は手動で実施していますが、これらはCIツールの責務になります。
これをコミットして、プッシュしてみましょう。

```shell
git add app && git commit -m "Bumped to 1.1.0"
git push
```

少し待ってから再度確認すると、以下のように新しいバージョン(1.1.0)が、ローリングアップデートでデプロイされていることが分かります。

![](https://i.gyazo.com/5123bece02994da6a0e0b865eb842711.png)

もちろん、これはイメージバージョンだけでなく、レプリカ数やConfigMap等の全ての変更が監視されます。
ここでは実施しませんが、イメージ以外の要素の変更をGitに反映しても、Fluxによって同期されることが確認できます。

## イメージ更新自動化

ここまでは、Fluxのデフォルト機能について見てきました。
ここから一歩進んで、拡張機能であるイメージ更新自動化を有効にしましょう。
これを有効にすると、コンテナレジストリに新バージョンをプッシュするだけで、あとはFluxがGitバージョン更新からクラスタ同期までを全自動で実施します。

まずは、再度`flux bootstrap`コマンドを実行して、イメージ関連のコンポーネントをインストールしましょう。

```shell
flux bootstrap github \
  --owner=${GITHUB_USER} \
  --repository=task-tool-cluster-config \
  --branch=main \
  --path=./clusters/prod \
  --personal \
  --components-extra=image-reflector-controller,image-automation-controller
```

先程のコマンドに加えて、`--components-extra`に追加コンポーネントとして、reflector-controllerとimage-automation-controllerを指定しました。
これで`./clusters/prod/flux-system`配下に、追加のFluxコンポーネントが配置されます。
`kubectl get pod -n flux-system`を実行すると、追加したコンポーネントが起動しているはずです。

上記コマンドで、GitHubのリポジトリも更新されていますので、一度それをローカルに取り込みましょう。

```shell
git pull --rebase
```

ここで追加したimage-reflector-controllerの設定変更を行います。
`cluster/prod/flux-system/kustomization.yaml`に、以下の`patches`を追加してください。

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- gotk-components.yaml
- gotk-sync.yaml
# 以下を追加
patches:
  - target:
      kind: Deployment
      name: image-reflector-controller
    patch: |-
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --aws-autologin-for-ecr=true
```

これは、FluxがECRに自動ログインするための設定です。

### コンテナレジストリ登録

まず、Fluxのコンテナレジストリに対する接続設定が必要です。
以下のコマンドを実行します。

```shell
flux create image repository task-service \
  --image=<aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service \
  --interval=1m \
  --export > ${CONFIG_ROOT}/clusters/prod/task-service-registry.yaml
```

以下のカスタムリソースのマニフェストファイルが出力されます。

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageRepository
metadata:
  name: task-service
  namespace: flux-system
spec:
  image: <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service
  interval: 1m0s
```

ECRの`task-service`リポジトリのメタ情報を、1分間隔でフェッチする指定となっています。

### イメージポリシー登録

どのイメージタグがプッシュされれば、Kubernetesに同期すべきかというルールを指定します。
以下のコマンドを実行します。

```shell
flux create image policy task-service \
  --image-ref=task-service \
  --select-semver=1.1.x \
  --export > ${CONFIG_ROOT}/clusters/prod/task-service-policy.yaml
```

ここでは、1.1系のパッチリリースは自動でアップデートするようにしました。
以下のカスタムリソースのマニフェストファイルが出力されます。

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImagePolicy
metadata:
  name: task-service
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: task-service
  policy:
    semver:
      range: 1.1.x
```

セマンティックバージョニング以外にも、数値やアルファベット順の指定も可能です。
また、タグフィルターを利用すれば、プレフィックスやサフィックス付きのバージョンも対応できます。詳細は[こちら](https://fluxcd.io/docs/components/image/imagepolicies/)を参照してください。

### イメージ自動更新
同期のソースとしては常にGitです。イメージアップデートについても、デプロイ対象を検知した場合はまずはGitを更新する必要があります。
先程は手動でバージョンを更新しましたが、Fluxで自動化しましょう。
以下のコマンドを実行します。

{% raw %}
```shell
flux create image update task-tool \
  --git-repo-ref=task-tool \
  --git-repo-path="./app/overlays/prod" \
  --checkout-branch=main \
  --push-branch=main \
  --author-name=fluxcdbot \
  --author-email=fluxcdbot@users.noreply.github.com \
  --commit-template="{{range .Updated.Images}}{{println .}}{{end}}" \
  --export > ${CONFIG_ROOT}/clusters/prod/task-tool-automation.yaml
```
以下のカスタムリソースのマニフェストファイルが出力されます。

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageUpdateAutomation
metadata:
  name: task-tool
  namespace: flux-system
spec:
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxcdbot@users.noreply.github.com
        name: fluxcdbot
      messageTemplate: '{{range .Updated.Images}}{{println .}}{{end}}'
    push:
      branch: main
  interval: 1m0s
  sourceRef:
    kind: GitRepository
    name: task-tool
  update:
    path: ./app/overlays/prod
    strategy: Setters
```
{% endraw %}

ここで、イメージ更新のGitコミットとプッシュに関する設定をしています。
上記コミットメッセージは最低限のものですが、テンプレート言語を利用してより詳細なメッセージを作成可能です。詳細は[こちら](https://fluxcd.io/docs/components/image/imageupdateautomations/#commit-message-template-data)を参照しくてださい。

次に、どのファイルのどの部分に対して変更するかを指定します[^5]。
これには、マニフェスト内の変更したい部分に、Flux固有のYAMLコメントを埋め込みます。
`app/overlays/prod/kustomization.yaml`のイメージ部分に、以下を追記しましょう(内容ではなくコメントが重要です)。

[^5]: Flux v1では不要でしたが、v2では明示的に指定する必要があります(これによりカスタムリソースにも対応できるようになりました)。

```yaml
images:
- name: task-service
  newName: <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service # {"$imagepolicy": "flux-system:task-service:name"}
  newTag: 1.1.0 # {"$imagepolicy": "flux-system:task-service:tag"}
```

Flux固有のYAMLコメントのフォーマットは[こちら](https://fluxcd.io/docs/guides/image-update/#configure-image-update-for-custom-resources)を参照してください。

### 動作確認

これで準備完了です。全ての変更をコミット＆プッシュしましょう。

```shell
git add app clusters && git commit -m "Enable image update automation"
git push
```

少し待ってから、以下を確認してみましょう。

```shell
flux get image repository
flux get image policy
flux get image update
```
```
NAME            READY   MESSAGE                         LAST SCAN                       SUSPENDED 
task-service    True    successful scan, found 2 tags   2022-02-03T10:37:54+09:00       False

NAME            READY   MESSAGE                                                             LATEST IMAGE                                                                      
task-service    True    Latest image tag for 'xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-service' resolved to: 1.1.0   xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-service:1.1.0 

NAME            READY   MESSAGE         LAST RUN                        SUSPENDED 
task-tool       True    no updates made 2022-02-03T10:38:05+09:00       False              
```

作成したマニフェストが、正常に動作していることが分かります。
それでは、1.1.0にバグがあったと仮定して、パッチバージョン1.1.1を作成し、ECRにプッシュしましょう。

```shell
# バージョン1.1.1作成
docker tag <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.0.0 \
  <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.1.1

# ECRプッシュ
docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.1.1
```

しばらくすると、Fluxが取り込むべき新しいバージョンを検知し、Git更新 -> Kubernetesクラスタに適用します。
`kubectl get pod -n prod`を実行すると、ローリングアップデートが実行されていることが分かります。

![](https://i.gyazo.com/b4b5ee128dcd02e9362a28178a8a3f6b.png)

以下のコマンドを実行して、デプロイしたイメージのバージョンを確認してみましょう。
```shell
kubectl get deployment prod-task-service -n prod \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```
パッチバージョン1.1.1がリリースされていることが確認できるはずです。

再度Fluxのイメージ関連のコンポーネントを見てみましょう。

```shell
flux get image repository
flux get image policy
flux get image update
```

```
NAME            READY   MESSAGE                         LAST SCAN                       SUSPENDED 
task-service    True    successful scan, found 3 tags   2022-02-03T10:45:54+09:00       False      

NAME            READY   MESSAGE                                                                                                                 LATEST IMAGE                                                                      
task-service    True    Latest image tag for 'xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-service' resolved to: 1.1.1   xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-service:1.1.1 

NAME            READY   MESSAGE                                                         LAST RUN                        SUSPENDED 
task-tool       True    no updates made; last commit b5d4c12 at 2022-02-03T01:45:54Z    2022-02-03T10:46:01+09:00       False
```

新しいパッチバージョンのリリースが検知され、これをデプロイ対象バージョンとしてGitにコミットしている様子が分かります。
もちろん、これはGitHubのコミット履歴からも確認できます。

![](https://i.gyazo.com/132ec7491bf0781f1ace9681127df49c.png)

## クリーンアップ

Fluxで作成したリソースについては、以下で削除してください。

```shell
# Fluxのカスタムリソース
flux delete image update task-tool -s
flux delete image repository task-service -s
flux delete image policy task-service -s
flux delete kustomization task-tool -s
flux delete source git task-tool -s
# Fluxコンポーネント
flux uninstall -s
```

それ以外のリリース削除については、以下を参照してください。

- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/#クリーンアップ)

## まとめ

今回は[Flux](https://fluxcd.io/)を導入して、Gitを中心とした継続的デリバリを導入しました。
このような仕組みを構築することの最大のメリットは、システム運用においてもバージョン管理システムとしてGitの機能をフル活用できることです。

- コミットハッシュからのソースコード追跡
- プルリクエスト/マージリクエストによるレビュー/承認プロセス
- デグレード発生時のrevertコマンドによるロールバック

Fluxを導入することで、アプリケーション開発で当たり前のように使っていた機能を、運用フェーズでも活用できるようになったことが分かったと思います。

今回は実施しませんでしたが、状態変化時には、Slack等のチャットやインシデント管理システム等への通知機能も必要でしょう。こちらについても、もちろんFluxで実現可能です。
詳細は以下の公式ドキュメントを参照してください。

- [Setup Notifications](https://fluxcd.io/docs/guides/notifications/)
- [Notification Controller](https://fluxcd.io/docs/components/notification/)

また、Gitを中心とした仕組みでは、トークンやパスワード等の機密情報をGitに保管することが難しいという課題があります。
こちらの解決策も公式ドキュメントに言及されていますので参考にするとよいでしょう。

- [Sealed Secrets](https://fluxcd.io/docs/guides/sealed-secrets/)
- [Manage Kubernetes secrets with Mozilla SOPS](https://fluxcd.io/docs/guides/mozilla-sops/)

さらに、今回はKustomizeを使いましたが、FluxはHelmチャートにも対応しています。
これを使うと、Helmチャートを使った運用がかなり効率的になると感じます。興味のある方は以下も試してみるとよいでしょう。

- [Manage Helm Releases](https://fluxcd.io/docs/guides/helmreleases/)

---
参考資料

Fluxドキュメント: <https://fluxcd.io/docs/>