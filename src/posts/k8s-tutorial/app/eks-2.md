---
title: クラスタ環境デプロイ - EKSクラスタ(Kustomize導入)
author: noboru-kudo
date: 2022-01-27
tags: [AWS]
prevPage: ./src/posts/k8s-tutorial/app/eks-1.md
nextPage: ./src/posts/k8s-tutorial/app/eks-3.md
---

本記事は、[クラスタ環境デプロイ - EKSクラスタ(AWS環境準備)](/containers/k8s/tutorial/app/eks-1/)からの続きです。

ここでは、Kubernetesのマニフェストファイルを、Kustomizeに対応した構成へと見直していきます。

Kustomizeはbaseと呼ばれる環境共通部分にパッチを当てることで、各環境の完全なマニフェストを生成します。
以下のようなフローで最終的にデプロイする形になります。

![](https://i.gyazo.com/e5c0205b0647026a26df19803c25b6dd.png)

Kustomizeのパッチは、以下の方法をサポートしています。

1. [Strategic merge patch](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/)
2. [JSON Patch](https://datatracker.ietf.org/doc/html/rfc6902)

どちらを利用するかは好みの問題ですが、基本路線としては宣言的に記述するStrategic merge patch、複雑なパッチの場合は、JSON Patchを使用した方が簡潔になると思います。

以前([Kubernetesマニフェスト作成](/containers/k8s/tutorial/app/batch/#アプリケーションのデプロイ))は、`app/k8s/v2`ディレクトリ配下にKubernetesマニフェストを作成しました[^1]。
今回は、`app/k8s/v3`ディレクトリ配下に作成していきましょう。

[^1]: 未実施の場合は`app/k8s/v2-ans`ディレクトリを参照してください。

事前に以下の構成を作成しておいてください。

```
app/k8s/v3
├── base
└── overlays
    ├── local
    │   └── patches
    └── prod
        └── patches
```

[[TOC]]

## base

それでは、`base`配下にローカル環境、商用環境のbaseリソースを配置していきましょう。 基本的な作業は`app/k8s/v2`をコピーして、環境固有部分を消していけば作成できます。

### task-service

まずはタスク管理API(`task-service`)です。
`task-service`ディレクトリを作成し、DeploymentとServiceの定義を移植します。

まずはDeploymentです。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
spec:
  selector:
    matchLabels:
      app: task-service
  template:
    metadata:
      labels:
        app: task-service
    spec:
      containers:
        - name: task-service
          image: task-service
          ports:
            - name: http
              containerPort: 3000
          envFrom:
            - configMapRef:
                name: task-service-config
          readinessProbe:
            httpGet:
              port: 3000
              path: /health/readiness
          livenessProbe:
            httpGet:
              port: 3000
              path: /health/liveness
          startupProbe:
            httpGet:
              port: 3000
              path: /health/startup
```

`app/k8s/v2/task-service/deployment.yaml`とほぼ同じですが、コンテナの`imagePullPolicy`と`replicas`を削除しました。

以前`imagePullPolicy`は`Never`としていましが、これはローカル環境でのみ有効な設定です。
クラスタ環境ではコンテナレジストリより取得する必要があり、この指定では動作しません。
したがって、この項目は環境固有値として`overlays`で設定する必要があると判断できますので、ここでは削除しました。

同様に起動するレプリカ数も、ローカル環境とクラウド環境では要件が異なりますので削除しました。

続いてServiceですが、こちらは環境別の差分はありません。
`app/k8s/v2/task-service/service.yaml`をそのまま`app/k8s/v3/task-service`にコピーしてください。

最後にConfigMapです。以前はConfigMapのYAML形式で記述しましたが、KustomizeにはConfigMapを生成する機能(configMapGenerator)がありますので、こちらを利用します(後述)。
ここではシンプルにキーバリュー形式で設定ファイルを用意します。`app/k8s/v2/task-service/.env`を作成し、以下を記述します。

```text
TZ=Asia/Tokyo
```

今回はbaseの定義として、Node.jsのタイムゾーンを指定する`TZ`のみを定義しました。
基本的にConfigMapは環境固有のものが多いため、`base`で記述できるものは限られてくるはずです。

### task-reporter

続いてタスクレポート出力バッチです。
`app/k8s/v3/task-reporter`ディレクトリを作成し、`app/k8s/v2/task-reporter/cronjob.yaml`を移植します。

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: task-reporter
  labels:
    app: task-reporter
spec:
  schedule: "0 15 * * *"
  failedJobsHistoryLimit: 3
  successfulJobsHistoryLimit: 3
  concurrencyPolicy: Allow
  suspend: false
  jobTemplate:
    metadata:
      labels:
        app: task-reporter
    spec:
      completions: 1
      parallelism: 1
      activeDeadlineSeconds: 3600
      backoffLimit: 10
      template:
        metadata:
          labels:
            app: task-reporter
        spec:
          restartPolicy: Never
          containers:
            - name: task-reporter
              image: task-reporter
              envFrom:
                - configMapRef:
                    name: task-reporter-config
              env:
                - name: TEMP_DIR
                  value: /var/app/temp
              volumeMounts:
                - mountPath: /var/app/temp
                  name: app-temp-dir
          volumes:
            - name: app-temp-dir
              emptyDir:
                sizeLimit: 10Gi
```

こちらもタスク管理APIと同様の理由で`imagePullPolicy`は削除しました。

### Ingress

`app/k8s/v3/ingress/ingress.yaml`を作成し、以下を記述します。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
spec:
  ingressClassName: nginx
  rules:
    - http:
        paths:
          - backend:
              service:
                name: task-service
                port:
                  number: 3000
            path: /api
            pathType: Prefix
```

ホスト名(`host`)は、通常環境によって変える必要があるため削除しました。
今回はどの環境でも、Ingress ControllerにNGINXを使うため、`ingressClassName`はbase側に記述しました。環境(ローカル:Nginx, 商用:ALB等)によって変わるようであれば、こちらもoverlays側に記述するのが良いでしょう。

### Kustomizationファイル

これまで定義してきたマニフェストファイルを、ここでKustomizationファイルとして1つにまとめます。
Kustomizeを使う場合は、このファイルが必須になります。

詳細な内容は[公式ドキュメント](https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/)を参照してください。

`base`ディレクトリ直下に`kustomization.yaml`を作成して、以下を記述します。

```yaml
commonLabels:
  app.kubernetes.io/name: task-tool
  app.kubernetes.io/created-by: mamezou-tech

resources:
  - ingress/ingress.yaml
  - task-service/service.yaml
  - task-service/deployment.yaml
  - task-reporter/cronjob.yaml

configMapGenerator:
  - name: task-service-config
    envs:
      - task-service/.env
  - name: task-reporter-config
    envs:
      - task-reporter/.env
```

`commonLabels`フィールドに全てのリソース共通のラベル(`metadata.labels`)を定義しています。
ここに掲載しているもの以外でも、[本家Kubernetesの公式ドキュメント](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)に推奨ラベルが掲載されていますので、参考にするとよいでしょう。
他にも共通アノテーションを定義する`commonAnnotations`フィールドもあります。

`resources`フィールドでは、先程作成したリソースのマニフェストファイルを指定します。ここに指定しなかったものは、マニフェストファイルがあっても取り込まれないので注意してください。

`configMapGenerator`フィールドで、`.env`ファイルからConfigMapを生成する指定をしています。
これ以外にも、固定値(`literals`)やファイル自身(`files`)からConfigMapを作成可能です。
詳細は[公式ドキュメント](https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/configmapgenerator/)を参照してください。

ここまで終わると、`app/k8s/v3/base`配下は以下の構成になります。

```
base
├── kustomization.yaml
├── ingress
│   └── ingress.yaml
├── task-reporter
│   ├── .env
│   └── cronjob.yaml
└── task-service
    ├── .env
    ├── deployment.yaml
    └── service.yaml
```

## ローカル環境向けのパッチ作成(overlays/local)

base部分の作成が終わりましたので、ローカル環境(`overlays/local`)のパッチを作成しましょう。

### task-service
まずは、タスク管理サービス(`task-service`)のDeploymentに対するパッチを作成します。
`app/k8s/v3/overlays/local/patches`配下に`task-service`ディレクトリを作成します。
ここに、`deployment.patch.yaml`を配置し、以下を記述します。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: task-service
          imagePullPolicy: Never
```

ここはbaseからの差分を記述します。今回はローカル環境としてレプリカ数2、イメージはローカルビルドしたものを使用(`imagePullPolicy: Never`)するように設定しました。
これだけでは不完全なマニフェストですが、Kustomizeで`base`とマージされることによって完全なものになります。

続いて設定ファイルです。 ここでも`.env`ファイルを作成し、以下を記述します。

```text
STAGE=localstack
NODE_ENV=development
TASK_TABLE_NAME=tasks
AWS_ENDPOINT=http://localstack:4566
AWS_DEFAULT_REGION=local
AWS_ACCESS_KEY_ID=localstack
AWS_SECRET_ACCESS_KEY=localstack
```

先程は`TZ`のみを記述しましたが、それ以外の環境固有の設定はここに記述します。

### task-reporter
続いて、タスクレポート出力バッチ(task-reporter)のCronJobに対するパッチを作成します。
`app/k8s/v3/overlays/local/patches`配下に`task-reporter`ディレクトリを作成します。
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
          containers:
            - name: task-reporter
              imagePullPolicy: Never
```

ここでは、先程同様に`imagePullPolicy`を`Never`とし、ローカルビルドしたイメージを使うように指定します。

設定ファイルの方も同様です。`.env`ファイルを作成し、以下を記述します。

```text
STAGE=localstack
NODE_ENV=development
TASK_TABLE_NAME=tasks
REPORT_BUCKET=completed-task-report-bucket
TARGET_OFFSET_DAYS=0
AWS_ENDPOINT=http://localstack:4566
AWS_DEFAULT_REGION=local
AWS_ACCESS_KEY_ID=localstack
AWS_SECRET_ACCESS_KEY=localstack
```

`base`に定義した`TZ`以外のものをここに定義します。

### Ingress
`app/k8s/v3/overlays/local/patches`配下に`ingress`ディレクトリを作成します。
ここに、`ingress.patch.yaml`を配置し、以下を記述します。

```yaml
- op: replace
  path: /spec/rules/0/host
  value: task.minikube.local
```

今までは、KubernetesのStrategic merge patchでパッチファイルを作成しましたが、今回はJSON Patchを使用しました。
上記ではIngressのホスト(`host`)に、minikubeのドメイン`task.minikube.local`を設定(`replace`)するようにしています。

なお、ローカル環境のKubernetesにDocker Desktopを使用している場合は、このファイルの作成は不要です。

### Kustomizationファイル

最後に、`overlays/local`配下に`kustomizton.yaml`を作成します。
まずは、以下を記述します。

```yaml
commonLabels:
  env: local

namePrefix: local-

resources:
  - ../../base
```

`commonLabels`はローカル環境では`env`に`local`と入れるようにしました。複数環境を1つのクラスタに配置する際は、こうしておくとラベルで絞り込むときに便利です。この設定は`base`の同フィールドとマージされます。

`namePrefix`には`local-`としました。こうすると、Kustomizeで作成する全てのリソースの名前に対してこのプレフィックスが付与されます。
`kubectl get`コマンドでリソースを参照すると、名前ですぐにどの環境を見ているかが分かるようになります。誤操作による事故を防ぐために、この設定を入れることをお勧めします。

`resources`にローカル環境で対象とするリソースを指定します[^2]。 ここでは、先程作成した`base`ディレクトリのみを指定します。

[^2]: Kustomizeの2.1.0までは`bases`フィールドでbaseリソースを指定する必要がありましたが、現在は`resources`に統合されました。

続いて、パッチ部分を追記します。

```yaml
patches:
  - path: patches/task-service/deployment.patch.yaml
  - path: patches/task-reporter/cronjob.patch.yaml
  - path: patches/ingress/ingress.patch.yaml
    target:
      kind: Ingress
      name: app-ingress
```

ここでは、先程作成したパッチファイルをそれぞれ適用しています。
Ingressのパッチファイルでは、どのリソースに対して適用するのかを指定していません。したがって、上記のように`target`フィールドで対象を明示する必要があります。
`target`フィールドは単一リソースだけでなく、複数リソースも指定可能です。詳細は[公式ドキュメント](https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/)を参照してください。

次はConfigMap(`configMapGenerator`)です。

```yaml
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

`behavior: merge`としている点に注目してください。こうすることで`base`に定義したConfigMapとマージするようにしています。


最後は利用するコンテナイメージの定義を追記します。

```yaml
images:
  - name: task-service
    newName: task-service
    newTag: latest
  - name: task-reporter
    newName: task-reporter
    newTag: latest
```

ここでタスク管理サービス(`task-service`)、タスクレポート出力バッチ(`task-reporter`)のそれぞれで、上書き対象の名前(`newName`)とタグ(`newTag`)を指定します。
こうすることで、DeploymentやCronJobのイメージを変えなくても、Kustomizeがこの定義に従って上書きしてくれるようになります。
つまり、各環境別でどのバージョンのアプリケーションが動作しているかは、Gitで管理されているこのフィールドを見れば把握できるようになります。

`images`の詳細は[公式ドキュメント](https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/images/)を参照してください。

ここまで終わると、`app/k8s/v3/overlays/local`配下は以下の構成になります。

```
overlays/local
├── kustomization.yaml
└── patches
    ├── ingress
    │   └── ingress.patch.yaml
    ├── task-reporter
    │   ├── .env
    │   └── cronjob.patch.yaml
    └── task-service
        ├── .env
        └── deployment.patch.yaml
```

## ローカル動作確認

マニフェストの構成をKustomizeに移行しましたので、ローカル環境で引き続き動作するかを確認しましょう。
ローカル環境にデプロイするには、KustomizeでデプロイするようにSkaffoldの設定変更が必要です。
`skaffold.yaml`を以下のように修正しましょう。

### skaffold.yaml

```yaml
apiVersion: skaffold/v2beta26
kind: Config
metadata:
  name: app
build:
  artifacts:
  - image: task-service
    context: apis/task-service
    docker:
      dockerfile: Dockerfile.local
  - image: task-reporter
    context: jobs/task-reporter
    docker:
      dockerfile: Dockerfile.local
deploy:
  # kubectl -> kustomize
  kustomize:
    paths:
      - k8s/v3/overlays/local
```

変更点は`deploy`ステージ配下のみです。以前は`kubectl`としていた部分を`kustomize`とし、`paths`にローカル環境のKustomizationファイルを配置したディレクトリを指定します。

デプロイの手順は変わりませんが、kubectlのコンテキストがEKS側の場合は、ローカル環境に切り替えてから実行してください。

```shell
# kubectlがEKSの方に向いている場合は以下を実行して切り替え
# minikube
kubectl config use-context minikube
# docker desktop
kubectl config use-context docker-desktop

# ローカルデプロイ
skaffold dev
```

動作確認の方法は以下を参照してください。以前と同じように操作できれば問題ありません。

- [Kubernetesマニフェスト作成 - Webアプリケーション](/containers/k8s/tutorial/app/web-app/#動作確認)
- [Kubernetesマニフェスト作成 - バッチアプリケーション](/containers/k8s/tutorial/app/batch/#動作確認)

以降は[クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/)へと続きます。