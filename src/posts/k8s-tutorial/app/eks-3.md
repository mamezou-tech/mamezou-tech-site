---
title: クラスタ環境デプロイ - EKSクラスタ(デプロイ)
author: noboru-kudo
date: 2022-01-27
prevPage: ./src/posts/k8s-tutorial/app/eks-2.md
---

本記事は、[クラスタ環境デプロイ - EKSクラスタ(Kustomize導入)](/containers/k8s/tutorial/app/eks-2/)からの続きです。

これまで、DynamoDBやS3等のAWSリソースを準備し、環境差分を吸収するために、Kustomizeを導入しました。
ここからは、仮想の商用環境としてAWS EKSにアプリケーションをデプロイします。

まずは、前回ローカル環境向けにパッチファイルを準備したように、EKS環境向けの`overlays`を用意します。

最終的には、以下の構成となります。

![](https://i.gyazo.com/bfb19af214cdbf34f1342a84a869f943.png)

[[TOC]]

## EKS環境向けのパッチ・マニフェスト作成(overlays/prod)

`app/k8s/v3/overlays/prod`配下に、各種パッチ及びマニフェストファイルを準備します。

### task-service

`app/k8s/v3/overlays/prod/patches`配下に`task-service`ディレクトリを作成します。
ここに、`deployment.patch.yaml`を配置し、以下を記述します。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
spec:
  replicas: 3
  template:
    spec:
      serviceAccountName: task-service
      containers:
        - name: task-service
          imagePullPolicy: IfNotPresent
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 300m
              memory: 512Mi
```

ローカル環境のパッチより少し複雑になりました。

#### replicas
今回は、クラウド環境での実行です。レプリカ数を2から3に増やします。

#### serviceAccountName
`serviceAccountName: task-service`を追加しています。これはIRSA(IAM Role for Service Account)を有効化するのに必要なものです。
以前TerraformでPod用のIAM RoleとServiceAccountを作成しました([こちら](/containers/k8s/tutorial/app/eks-1/#podアクセス許可irsa)参照)。PodがこのServiceAccountを使用することで、Pod生成時にAWSのセッショントークンがコンテナに割り当てられ、AWSサービスへアクセスできるようになります。

#### imagePullPolicy
ローカル環境では、コンテナレジストリを使用しないため`Never`としましたが、今回はコンテナレジストリからPullする`IfNotPresent`を指定します。

#### resource.requests/limits
`resources`フィールド配下に、このコンテナが利用可能なCPU・メモリの要求スペック(`requests`)とリミット(`limits`)を指定します。

`requests`は、Podのスケジューリングに影響します。Kubernetesのスケジューラは、`requests`に指定されたスペックを満たすNodeにPodを配置するように動きます。これを適切に指定することで、余力のないNodeにPodが配置されることを防止できます[^1]。
とはいえ、`requests`を必要以上に大きくすると、Nodeで未使用のリソースが増えて、利用効率が悪化する原因となりますので注意してください。

`limits`は、コンテナが利用可能なCPU・メモリを制限するために使用します。
コンテナは隔離された環境で実行されているとはいえ、物理的にはCPUやメモリ等のリソースを共有しています。
1つのコンテナでNodeのCPUやメモリを使い切って、他のアプリケーションに迷惑を掛けないためにも`limits`を指定することが望ましいです[^2]。
ただし、メモリを指定する際には注意が必要です。コンテナがリミットを超えてメモリを使用しようとすると、KubernetesはOOMKillerを送信して強制終了させるため、低すぎる値は頻繁な再起動[^3]を招きます。

アプリケーションの特性を踏まえた適切な値の設定と、定期的なモニタリングによる見直しを心掛けるようにしましょう。
`requests`/`limits`の詳細は[公式ドキュメント](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#requests-and-limits)を参照しくてださい。

[^1]: スケジューラは実際の空き容量を見ている訳ではなく、Nodeのキャパシティと配置されたPodの`requests`の総量で判断しています。

[^2]: ただし、起動時に多くのCPUを消費するようなアプリケーション(Java等)の場合は、通常時に合わせてCPUを制限すると起動が遅くなり、LivenssProbeの再起動ループに陥ったことがあります。この時は、起動後はほとんど消費しないため、あえて`limits.cpu`を指定しないという選択をしました。

[^3]: 再起動するかは`restartPlicy`の設定次第ですが、デフォルトは`Always`で終了時は再起動します。

最後は設定ファイルです。同ディレクトリに`.env`を配置して、以下を記述します。

```text
STAGE=prod
NODE_ENV=production
TASK_TABLE_NAME=task-tool-prod-tasks
AWS_DEFAULT_REGION=ap-northeast-1
```

各設定を商用環境向けに設定しました。
EKSでAWS認証情報が設定されるため、ローカル環境で設定していたアクセスキーやシークレットは不要になります。

### task-reporter

`app/k8s/v3/overlays/prod/patches`配下に`task-reporter`ディレクトリを作成します。
ここに、`cronjob.patch.yaml`を配置し、以下を記述します。

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: task-reporter
spec:
  jobTemplate:
    spec:
      template:
        spec:
          # IRSA
          serviceAccountName: task-reporter
          containers:
            - name: task-reporter
              imagePullPolicy: IfNotPresent
              resources:
                requests:
                  cpu: 100m
                  memory: 128Mi
                limits:
                  cpu: 500m
                  memory: 512Mi
```

変更内容についてはタスク管理API(`task-service`)と同じです。
バッチ処理のため、`resources/limits`は少し大きめに取りました。

最後は、設定ファイルです。同ディレクトリに`.env`を配置して、以下を記述します。

```text
STAGE=prod
NODE_ENV=production
TASK_TABLE_NAME=task-tool-prod-tasks
REPORT_BUCKET=task-tool-prod-completed-task-report-bucket
TARGET_OFFSET_DAYS=1
AWS_DEFAULT_REGION=ap-northeast-1
```

こちらについても、変更内容はタスク管理API(`task-service`)と同じですので、説明は省略します。

### task-web(UI)

ローカル環境では、UIは別途プロセスを起動しましたので、マニフェストは不要でした。EKS環境ではUIもコンテナ化して、Podとしてデプロイします。
こちらは新規リソースのため、パッチファイルではなく完全な形で用意する必要があります。
マニフェストファイル自体はシンプルな内容で、特に説明が必要な部分はありません。
`app/k8s/v3/overlays/prod/task-web`ディレクトリを作成して、以下のファイルを追加してください。

- [deployment.yaml](https://raw.githubusercontent.com/mamezou-tech/k8s-tutorial/main/app/k8s/v3-ans/overlays/prod/task-web/deployment.yaml)
- [service.yaml](https://raw.githubusercontent.com/mamezou-tech/k8s-tutorial/main/app/k8s/v3-ans/overlays/prod/task-web/service.yaml)

### Cert Manager - Let's Encrypt Issuer

今回は商用環境想定ですので、HTTPS通信が必須です。
こちらも`base`にはありませんので、パッチではなく、完全なマニフェストファイルとして用意する必要があります。
以下を参考に、Cert ManagerのLet's Encrypt向けIssuerを作成し、`app/k8s/v3/prod/lets-encrypt-issuer.yaml`として配置してください(ほぼそのまま使用できます)。

- [Ingress - HTTPS通信(Cert Manager)](/containers/k8s/tutorial/ingress/https/#正規の証明書でhttps通信)

### Ingress

`app/k8s/v3/overlays/prod/patches`配下に`ingress`ディレクトリを作成します。
ここに、`ingress.patch.yaml`を配置し、以下を記述します。

なお、ドメイン部分は自身で取得したドメインに置き換えてください。

```yaml
- op: add
  path: /metadata/annotations
  value:
    external-dns.alpha.kubernetes.io/hostname: <your.custom-domain.com>
    cert-manager.io/issuer: "prod-letsencrypt-issuer"
- op: add
  path: /spec/tls
  value:
    - hosts:
        - <your.custom-domain.com>
      secretName: letsencrypt-cert
- op: replace
  path: /spec/rules/0/host
  value: <your.custom-domain.com>
- op: add
  path: /spec/rules/0/http/paths/-
  value:
    backend:
      service:
        name: task-web
        port:
          number: 8080
    path: /
    pathType: Prefix
```

1つ目のセクションでは`annotations`でExternal DNSのドメイン設定と、Cert Managerのhttps通信の設定をしています。詳細な説明は以下を参照してください。

- [Ingress - カスタムドメイン管理(external-dns)](/containers/k8s/tutorial/ingress/external-dns/#ingressリソース作成)
- [Ingress - HTTPS通信(Cert Manager)](/containers/k8s/tutorial/ingress/https/#正規の証明書でhttps通信)

2つ目でTLSの設定をしています。ここでCert ManagerがLet's Encryptで発行した証明書のSecret(`letsencrypt-cert`)を参照するようにしています。

最後は、IngressのパスマッピングにUIリソースを追加しています。
UI用のエントリを追加して、APIに加えて、ブラウザから静的Webリソースを取得できるようにします。

### Kustomizationファイル

ここまで作成したパッチ及びマニフェストファイルをKustomizationファイルとしてまとめましょう。

まずは、以下を記述します。

```yaml
commonLabels:
  env: prod

namespace: prod
namePrefix: prod-

resources:
  - ../../base
  - task-web/deployment.yaml
  - task-web/service.yaml
  - lets-encrypt-issuer.template.yaml
```

設定項目は[ローカル環境](/containers/k8s/tutorial/app/eks-2/#kustomizationファイル-2)のときに説明したものと同じです。
`resources`には、`base`に加えて、今回新規に作成したUI(`task-web`)とCert ManagerのIssuerを忘れずに追加します。

続いてパッチファイルとConfigMapです。

```yaml
patches:
  - path: patches/task-service/deployment.patch.yaml
  - path: patches/task-reporter/cronjob.patch.yaml
  - path: patches/ingress/ingress.patch.yaml
    target:
      kind: Ingress
      name: app-ingress

configMapGenerator:
  - name: task-service-config
    behavior: merge
    envs:
      - patches/task-service/.env
  - name: task-reporter-config
    behavior: merge
    envs:
      - patches/task-reporter/.env
```

それぞれのパッチファイルや設定ファイルの内容自体は異なりますが、Kustomizationファイルの定義はローカル環境のときと全く同じです。

最後はコンテナイメージの定義です。

```yaml
images:
  - name: task-service
    newName: <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-service
    newTag: 1.0.0
  - name: task-reporter
    newName: <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-reporter
    newTag: 1.0.0
  - name: task-web
    newName: <aws-account-id>.dkr.ecr.<aws-region>.amazonaws.com/mamezou-tech/task-web
    newTag: 1.0.0
```

ローカル環境のときとは`newName`/`newTag`が異なります。

`newName`にはコンテナレジストリ(ECR)のURLとリポジトリ名を記述します。
URLについてはAWSマネジメントコンソールのECRメニューより確認できます。
[こちら](/containers/k8s/tutorial/app/container-registry/#プッシュしたイメージ確認)を参考に、正しいURLを設定してください。

`newTag`にはコンテナのタグを設定します。今回は初めてのリリースのため`1.0.0`を設定します[^4]。

また、UIリリース(`task-web`)についても今回はコンテナ化しますので、エントリーとして新規追加します。

[^4]: ローカル環境では`latest`と入れていましたが、実際にはSkaffoldによって上書きされていましたので、このタグは使われていません。

ここまで終わると、`app/k8s/v3/overlays/prod`配下は以下の構成になります。

```
k8s/v3-ans/overlays/prod/
├── kustomization.yaml
├── lets-encrypt-issuer.yaml
├── patches
│   ├── ingress
│   │   └── ingress.patch.yaml
│   ├── task-reporter
│   │   ├── .env
│   │   └── cronjob.patch.yaml
│   └── task-service
│       ├── .env
│       └── deployment.patch.yaml
└── task-web
    ├── deployment.yaml
    └── service.yaml
```

## コンテナイメージのビルド

続いて、コンテナイメージをEKSから取得(Pull)できるように、ビルドしてECRにプッシュしましょう。

ビルドとプッシュについては[こちら](/containers/k8s/tutorial/app/container-registry/#イメージビルド-プッシュ)で説明している通りです。
ビルド前に、UI(`task-web`)リソースについて変更が必要です。
変更ファイルは`app/web/.env.production`で、`VUE_APP_API_ENDPOINT`[^5]を、EKSで公開するカスタムドメインに変更してください。

```
NODE_ENV=production
VUE_APP_API_ENDPOINT=https://<your.custom-domain.com>/api <- 変更!!
```

[^5]: Ingressで公開するタスク管理APIのエンドポイントとして使用しています。

ファイル修正後はタグを`1.0.0`として、ビルドとECRへのプッシュをしてください。

プッシュ後はマネジメントコンソールから、3つのコンテナイメージそれぞれが、ECRに保管されていることを確認してください。

![](https://i.gyazo.com/ca63d89fc55f42e00dce6302e10f88ab.png)

## EKS環境にデプロイ

これで全ての準備が整いました。あとはデプロイするだけです。

まずは、kubectlのコンテキストをEKSに切り替えておきましょう。

```shell
aws eks update-kubeconfig --name mz-k8s
```

デプロイは、kubectlに組み込まれているKustomizeを使用するか、別途インストールしたkustomize使用するかでコマンドは変わってきますが、実施内容は同じです。

```shell
# PROJECT_ROOTはクローンしたディレクトリを指定してください(以下同様)。相対パスでも構いません。

# kubectlビルトインのkustomizeでデプロイ
kubectl apply -k ${PROJECT_ROOT}/app/k8s/v3/overlays/prod
# kustomizeビルドしたマニフェストをkubectlでデプロイ
kustomize build ${PROJECT_ROOT}/app/k8s/v3/overlays/prod | kubectl apply -f-
```

デプロイ後は。いつものようにPodの状態を確認しましょう。

```shell
kubectl get pod -n prod
```

```
NAME                                 READY   STATUS    RESTARTS   AGE
prod-task-service-7c649f75d9-lq8jt   1/1     Running   0          55m
prod-task-service-7c649f75d9-snxjb   1/1     Running   0          54m
prod-task-service-7c649f75d9-vcq6p   1/1     Running   0          55m
prod-task-web-5db579755d-mzhx5       1/1     Running   0          55m
prod-task-web-5db579755d-ttbnd       1/1     Running   0          55m
```

ローカル環境ではタスク管理APIのみでしたが、今回はUI(`prod-task-web`)についても実行されていることが分かります。
このように、全てのPodが正常に実行されていることが確認できたら、ブラウザから`https://<your.custom-domain.com>/` にアクセスし、ローカル環境同様にタスクの登録や更新等ができることを確認してください。

HTTPS関連のエラーが表示される場合は、HTTPSの証明書が発行されていない可能性があります。
初めての環境構築する場合はDNSの伝搬に時間がかかりますので、しばらく待ってから再度アクセスしてみてください。
それでもアクセスできない場合は、`kubectl describe challenge -n prod` を実行して証明書が発行できない理由を確認し、Cert Managerの設定やネットワーク構成等を見直してください。

## クリーンアップ

EKS環境の削除は、以下の手順で実施します。

まずはアプリケーションをアンデプロイします。

```shell
kubectl delete -k ${PROJECT_ROOT}/app/k8s/v3/overlays/prod
```

次にCert ManagerやExternal DNS等のプロダクトをアンインストールします。

```shell
helm uninstall cert-manager -n cert-manager
helm uninstall external-dns -n external-dns
helm uninstall ingress-nginx -n ingress-nginx
```

S3バケットは中にファイルが存在すると、削除に失敗しますので空にしておきます(マネジメントコンソールから手動削除でも構いません)。

```shell
aws s3 rm s3://<task-report-bucket-name> --recursive
```

TerraformでDynamoDBやS3リソースを削除します。

```shell
cd ${PROJECT_ROOT}/app/terraform
terraform destroy -var env=prod -var oidc_provider_url=${OIDC_PROVIDER_URL}
```

最後にクラスタ環境を削除します。以下のクリーンアップ手順を参照してください。
- [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl#クリーンアップ)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform#クリーンアップ)


## まとめ

今回は今までローカル環境のKubernetesで確認してきたものを、仮想商用環境としてEKSにリリースしてきました。
また、ローカル環境とEKSクラスタの環境差分を吸収するために、Kustomizeで1つのマニフェスト(`base`)とそのパッチ(`overlays`)で両環境に対応可能な仕組みとしました。

ここまでできると、独力でKubernetesの環境構築から、その上に載るコンテナアプリ開発、デプロイまでをできるようになっているはずです。

次回は継続的デリバリのツールを導入し、デプロイの自動化に取り組んでいきます。