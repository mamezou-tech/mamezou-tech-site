---
title: 継続的デリバリ - Flux
author: noboru-kudo
date: 2022-02-10
prevPage: ./src/posts/k8s-tutorial/app/eks-3.md
---

アプリケーション開発編では、お手製のアプリをローカル環境やクラウド環境(AWS EKS)にデプロイしてきました。
しかし、ローカル環境はSkaffoldを使って自動化したものの、クラウド環境は`kubectl apply`を使って手動デプロイしました。

ここでは、GitOps[^1]を体現する継続的デリバリツールとして人気の[Flux](https://fluxcd.io/)を導入します。

[^1]: 2017年にWeaveworks社が提唱したベストプラクティスです。GitOpsでは、アプリケーションのソースだけでなく全ての構成をGitで期待する状態(source of truth)として管理し、そこに実行環境を同期することで運用を容易にするスタイルです。GitOpsの詳細は[こちら](https://www.weave.works/technologies/gitops/)を参照しくてださい。

Fluxは継続的デリバリに特化したツールのため、単体テストやソースコードのビルドは別途CIツールで実行する必要があります。
このCIの部分は、コンテナになっても従来のスタイルと大きく変わることはありません。
違いは、最終的な成果物がアプリケーションを含むコンテナイメージとして、コンテナレジストリにプッシュされることくらいでしょう。
これらはGitHub ActionsやGitLab等、様々なツールにより容易に実現できますし、本題から逸れるため、CIについては省略します。

[[TOC]]

## 事前準備
### EKSクラスタ環境
EKSクラスタ環境を利用します。以下を参考に、EKSクラスタ環境を用意してください。

- [クラスタ環境構築 - AWS EKS (eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl/)
- [クラスタ環境構築 - AWS EKS (Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform/)

FluxはGitHubリポジトリをSSHでクローンしますので、Terraformの場合は、EKSモジュールの追加セキュリティグループで以下を許可してください。
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
対象アプリケーションは、本チュートリアルのアプリケーション開発編で実施したタスク管理ツールを利用します。

- [クラスタ環境デプロイ - コンテナレジストリ(ECR)](/containers/k8s/tutorial/app/container-registry/)
- [クラスタ環境デプロイ - EKSクラスタ(AWS環境準備)](/containers/k8s/tutorial/app/eks-1/)
- [クラスタ環境デプロイ - EKSクラスタ(Kustomize導入)](/containers/k8s/tutorial/app/eks-2/)
- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/)

## Flux CLIインストール

以下公式ドキュメントを参照し、FluxのCLIをインストールしてください。今回は執筆時点で最新の`0.25.3`をセットアップしました。

- [Install the Flux CLI](https://fluxcd.io/docs/installation/#install-the-flux-cli)

## Fluxコンポーネントのセットアップ
デフォルトの構成でFluxをセットアップします。

まずは、構築済みのEKSでfluxが適用可能かをチェックします。

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

アプリケーション開発編ではソースコードもKubernetesの構成も同じリポジトリに配置していましたが、今回は分離する構成とします[^2]。

[^2]: これ以外にも様々な構成方法があります。公式ドキュメントにリポジトリ構成のバリエーションに言及がありますので、[こちら](https://fluxcd.io/docs/guides/repository-structure/)参考にするとよいでしょう。

Fluxでは、構成リポジトリを新規作成できますので、これを利用したいと思います。

まず、GitHubにログインして、アクセストークンを発行してください。許可するスコープは`repo`のみで構いません。
- <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token>

GitHubユーザーと発行したトークンを環境変数に保存しておきましょう。

```shell
export GITHUB_USER=<github-user-name>
export GITHUB_TOKEN=<github-token>
```
`GITHUB_TOKEN`は後続のfluxコマンドで使用されます。

それでは、タスク管理ツールのKubernetes構成用のリポジトリ`task-tool-cluster-config`を作成しましょう。
以下コマンドを実行して、 GitHub[^3]個人アカウント内にマニフェスト用のプライベートリポジトリを作成します。リポジトリが存在する場合は、既存リポジトリに対して初期化を行います。

[^3]: GitHub以外でもGitLabやBitBucket、任意のGitについても対応可能です。詳細は[こちら](https://fluxcd.io/docs/cmd/flux_bootstrap/)より参照してください。

```shell
flux bootstrap github \
  --owner=${GITHUB_USER} \
  --repository=task-tool-cluster-config \
  --branch=main \
  --path=./clusters/prod \
  --personal
```


正常に終了したら、FluxのコンポーネントがKubernetesにインストールされたことを確認しましょう。

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

`flux-system`というNamespaceに4つのPodが起動したことが確認できます。これらが相互作用することで、GitとKubernetesクラスタを同期するようになります。

また、自分のアカウントにGitHubにリポジトリが作成されていることも確認しましょう。

![](https://i.gyazo.com/e093c3942a968e3d3096f0bfbcb4f267.png)

このように新規リポジトリが作成され、指定したパス(`--path`)にFluxコンポーネントのマニフェスト(Kustomize構成)が配置されていることが分かります。
アプリケーションだけでなく、このFluxコンポーネント自体もGitHubとKubernetesクラスタが同期するようになっています。
つまり、これらのファイル変更するとことで、Fluxコンポーネントの設定を切り替えることができるようになっています。

## アプリケーションマニフェスト追加

それでは、先程生成したリポジトリに、アプリケーションの構成を追加していきましょう。
まずは先程Fluxによって、作成されたリポジトリをクローンします。

```shell
git clone https://github.com/${GITHUB_USER}/task-tool-cluster-config.git
cd task-tool-cluster-config
export CONFIG_ROOT=$(pwd)
```

以降はこの`CONFIG_ROOT`配下にファイルを配置していきます。
まずは、アプリケーションのマニフェストを以降しましょう。以前Kustomize形式で作成したファイル[^4]をこちらに移動しましょう。
ディレクトリ`app`を作成し、マニフェストをコピーします。

[^4]: 未作成の場合は、[こちら](https://github.com/mamezou-tech/k8s-tutorial/tree/main/app/k8s/v3-ans)を利用可能です。`lets-encrypt-issuer.template.yaml`のemail設定とファイルリネーム(`template`削除)と、`kustomization.yaml`の`images`/カスタムドメインを自身の環境に合わせて変更してください。

```shell
mkdir ${CONFIG_ROOT}/app
# PROJECT_ROOTはアプリケーションソースコードを配置したリポジトリルート
cp -r ${PROJECT_ROOT}/app/k8s/v3/base ${CONFIG_ROOT}/app
cp -r ${PROJECT_ROOT}/app/k8s/v3/overlays ${CONFIG_ROOT}/app
```

`task-tool-cluster-config`リポジトリは以下の構成となります。

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

## アプリケーションイメージプッシュ

事前にECRに様々なバージョンのイメージをプッシュしておきましょう。
今回はFluxによる同期を確認するだけですので、アプリケーション自体は変更せず、同一イメージを複数のタグで作成して、Pushしておきましょう。
また、複数タグを使用するイメージもタスク管理API(`task-service`)のみとします。
以下のバージョンを事前にECRにプッシュしておいてください。
- 1.0.0 : 初期バージョン
- 1.1.0 : (仮想)マイナーバージョンアップ

```shell
# 1.0.0未ビルドの場合
docker build -t <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.0.0 \
  ${PROJECT_ROOT}/app/apis/task-service
  
# バージョン1.1.0作成
docker tag <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.0.0 \
  <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.0.1

# ECRプッシュ
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com
docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.0.0
docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.1.0
```

上記を参考に、タスクレポート出力(`task-reporter`)、UIリソース(`task-web`)についても、`1.0.0`のみECRにプッシュしてください。

また、task-tool-cluster-configリポジトリの`app/overlays/prod/kustomization.yaml`のバージョンが、初期バージョンの`1.0.0`となっていることを確認してください。

## FluxからGitHubへの認証設定

今回はプライベートリポジトリとして作成しましたので、FluxがGithubにアクセスできるようにSSH認証情報を設定します。
以下GitHubドキュメントを参考にSSH公開鍵をGitHubアカウントに登録しましょう。

- [Generating a new SSH key and adding it to the ssh-agent](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)

次に、ssh-keygenコマンドで作成した公開鍵、秘密鍵をKubernetesのSecretとして登録します。
```shell
# ~/.ssh/identity, ~/.ssh/identity.pubはそれぞれ秘密鍵、公開鍵ファイルのパスに置換してください
kubectl create secret generic task-tool-ssh-key -n flux-system \
  --from-literal identity="$(cat ~/.ssh/identity)" \
  --from-literal identity.pub="$(cat ~/.ssh/identity.pub)" \
  --from-literal known_hosts="$(ssh-keyscan github.com)"
```

## アプリケーションの同期設定反映

これで準備が整いました。
アプリケーションのマニフェストのGitリポジトリをFluxに登録するためのマニフェストを作成します。
以下のコマンドを実行して、テンプレートを作成しましょう。

```shell
flux create source git task-tool \
  --url=ssh://git@github.com/${GITHUB_USER}/task-tool-cluster-config \
  --branch=main \
  --interval=30s \
  --secret-ref=task-tool-ssh-key \
  --export > ./clusters/prod/task-tool-source.yaml
```

リダイレクトで指定したパスに、以下のファイル(`task-tool-source.yaml`)が出力されます。

```yaml
---
---
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

これはFluxがGitHubと同期するために、必要な設定です。Fluxのカスタムリソース(GitRepository)で管理されます。

次にアプリケーションのKustomize構成のマニフェストの同期設定です。
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

これはFluxがKustomizeで同期するためのカスタムリソース(Kustomization)です。
5分間隔で先程のGitRepositoryをチェックし、変更があれば反映するようになります。

では、これまで作成したものをコミットし、task-tool-cluster-configリポジトリにプッシュしましょう。

```shell
git add app clusters && git commit -m "Add task-tool config"
git push
```

しばらくすると、FluxがGitの状態をKubernetesに同期します。
実際にアプリケーションがデプロイされているかを確認しましょう。

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
実際にどのバージョンがデプロイされているかは以下で確認できます。

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
なお、Fluxで管理されているリソースは以下コマンドで確認できます。

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
今回は`app/overlays/prod/kustomization.yaml`のイメージを手動で更新します[^5]。

[^5]: 今回は手動で実施していますが、一般的にはこれはCIツールの責務になります。

```yaml
images:
- name: task-service
  newName: <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service
  newTag: 1.1.0 # 1.0.0から変更!!
```

これをコミットして、プッシュしてみましょう。

```shell
git add app && git commit -m "Bumped 1.1.0"
git push
```

少し待ってから再度確認すると、以下のように新しいバージョン(1.1.0)が、ローリングアップデートでデプロイされていることが分かります。

![](https://i.gyazo.com/5123bece02994da6a0e0b865eb842711.png)


## コンテナイメージ自動更新のセットアップ

ここまで、FluxによるGitリポジトリとの同期について見てきましたが、Fluxはさらに一歩進んで、コンテナイメージのアップデートからの同期も可能です。
これを利用するとコンテナレジストリに新バージョンをプッシュするだけで、あとはFluxがGitを更新して、Kubernetesクラスタに同期することができます。

デフォルトではこの機能は有効になっていません。まずは、再度`flux bootstrap`コマンドを実行して、有効化しましょう。

```shell
flux bootstrap github \
  --owner=${GITHUB_USER} \
  --repository=task-tool-cluster-config \
  --branch=main \
  --path=./clusters/prod \
  --personal \
  --components-extra=image-reflector-controller,image-automation-controller
```

先程のコマンドに加えて、`--components-extra=image-reflector-controller,image-automation-controller`を指定しただけです。
これで`./clusters/prod`配下に追加のFluxコンポーネントが配置されます。
`kubectl get pod -n flux-system`を実行すると、`image-automation-controller`と`image-reflector-controller`が起動しているはずです。

Git上も更新されていますので、一度それをローカルに取り込みましょう。

```shell
git pull --rebase
```

FluxがECRを監視するためには、Fluxコンポーネントの設定が必要です。
`cluster/prod/flux-system/kustomization.yaml`を変更します。

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

次にコンテナレジストリと更新ポリシーの設定を追加します。

```shell
flux create image repository task-service \
  --image=<aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service \
  --interval=1m \
  --export > ./clusters/prod/task-service-registry.yaml

flux create image policy task-service \
  --image-ref=task-service \
  --select-semver=1.1.x \
  --export > ./clusters/prod/task-service-policy.yaml
```

ここでは1.1.xとして1.1系のパッチリリースは自動でアップデートするようにしました。
Fluxは同期のソースとしては常にGitです。イメージアップデートについてもデプロイ対象を検知した場合はまずはGitを更新する必要があります。
以前は手動でバージョンを更新しましたが、ここではFluxに実施してもらいます。

```shell
flux create image update task-tool \
  --git-repo-ref=task-tool \
  --git-repo-path="./app/overlays/prod" \
  --checkout-branch=main \
  --push-branch=main \
  --author-name=fluxcdbot \
  --author-email=fluxcdbot@users.noreply.github.com \
  --commit-template="{{range .Updated.Images}}{{println .}}{{end}}" \
  --export > ./clusters/prod/task-tool-automation.yaml
```

ここで、Gitにイメージ更新をコミットするためのパスやコミットメッセージの設定をしています。
また、Gitのどのファイルをコミットするかを指定します。
これにはマニフェスト内にFlux固有のコメントを埋め込みます。
`app/overlays/prod/kustomization`を以下に変更します。

```yaml
images:
- name: task-service
  newName: 446197467950.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-service # {"$imagepolicy": "flux-system:task-service:name"}
  newTag: 1.1.0 # {"$imagepolicy": "flux-system:task-service:tag"}
```

YAMLコメントの内容は[こちら](https://fluxcd.io/docs/guides/image-update/#configure-image-update-for-custom-resources)を参照してください。

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

それでは1.1の新たなパッチバージョン1.1.1を作成して、ECRにプッシュしましょう。

```shell
# バージョン1.1.1作成
docker tag <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.0.0 \
  <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.1.1

# ECRプッシュ
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com
docker push <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service:1.1.1
```

しばらくすると、Fluxが取り込むべき新しいバージョンを検知し、Git更新 -> Kubernetesクラスタに適用します。
```shell
flux get image repository
flux get image policy
flux get image update
```

```shell
kubectl get deployment prod-task-service -n prod \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

パッチバージョン1.1.1がリリースされていることが確認できるはずです。

## クリーンアップ

Fluxで作成したリソースについては、以下で削除してください。

```shell
# Fluxのカスタムリソース
flux delete image update task-tool -s
flux delete image repository task-service -s
flux delete image policy task-service -s
flux delete kustomization task-tool -s
flux delete source git task-tool -s
# Fluxがデプロイしたアプリケーション
kubectl delete -k ${CONFIG_ROOT}/app/overlays/prod
# Fluxコンポーネント
flux uninstall -s
```

それ以外のリリース削除については、以下を参照してください。

- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/#クリーンアップ)

## まとめ