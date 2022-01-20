---
title: クラスタ環境デプロイ - EKSクラスタ(後編)
author: noboru-kudo
date: 2022-01-23
prevPage: ./src/posts/k8s-tutorial/app/eks-1.md
---

[クラスタ環境デプロイ - EKSクラスタ(前編)](/containers/k8s/tutorial/app/eks-1/)からの続きです。

## Kustomizeの導入

ここでは、Kubernetesのマニフェストファイルを、Kustomizeに対応した構成に見直していきます。

今回もソースコードについては、前回と同じリポジトリを使用します。

- <https://github.com/mamezou-tech/k8s-tutorial>

以前は`app/k8s/v2`ディレクトリ配下にKubernetesマニフェストを作成しました(実施していない方は`app/k8s/v2-ans`を参照してください)。

- [Kubernetesマニフェスト作成](/containers/k8s/tutorial/app/batch/#アプリケーションのデプロイ)

今回は`app/k8s/v3`ディレクトリ配下に作成していきましょう。

Kustomizeでは環境共通のリソースを配置する`base`ディレクトリ、各環境固有のリソースやパッチファイル(`variants`)を配置する`overlays`ディレクトリという構成が一般的です。以下のディレクトリ構成を作成してください。

```
v3/
├── base
└── overlays
    ├── local
    └── prod
```

### base

それでは、`base`配下にローカル環境、商用環境共通のリソースを配置していきましょう。
基本的には以前作成した`app/k8s/v2`をコピーして、環境固有部分を消していけば作成できます。

#### task-service

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
これについては環境固有値として扱う必要があると判断できますので、ここでは削除しました。

同様に起動するレプリカ数も、ローカル環境とクラウド環境では異なることが一般的と考えられますので、削除しました。

続いてServiceですが、こちらは環境別の差分はありません。
`app/k8s/v2/task-service/service.yaml`をそのまま`app/k8s/v3/task-service`にコピーしてください。

最後にConfigMapです。KustomizeにはenvファイルからConfigMapを生成する機能がありますので、こちらを利用しましょう。
`app/k8s/v2/task-service/.env`を作成し、以下を記述します。

```text
TZ=Asia/Tokyo
```

今回は共通の定義として、Node.jsのタイムゾーンを指定する`TZ`のみを定義しました。
基本的にConfigMapは環境固有のものが多いため、`base`で記述できるものは限られてきます。

#### task-reporter

続いてタスクレポート出力バッチです。以下のようになります。
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

こちらもタスク管理API(`task-service`)と同じで、`imagePullPolicy`のみ削除しました(今回はJobのため`replicas`は不要)。

#### Ingress

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

#### kustomization.yaml

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

### overlays/local

```yaml
commonLabels:
  env: local

namePrefix: local-

resources:
  - ../../base
  - localstack-init-scripts-config.yaml

patches:
  - target:
      kind: Ingress
      group: networking.k8s.io
      name: app-ingress
      version: v1
    patch: |-
      - op: replace
        path: /spec/rules/0/host
        value: task.minikube.local

  - target:
      kind: Deployment
      group: apps
      name: task-service
    patch: |-
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

  - target:
      kind: CronJob
      group: batch
      name: task-reporter
    patch: |-
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

configMapGenerator:
  - name: task-service-config
    behavior: merge
    envs:
      - task-service.env
  - name: task-reporter-config
    behavior: merge
    envs:
      - task-reporter.env

images:
  - name: task-service
    newName: task-service
    newTag: latest
  - name: task-reporter
    newName: task-reporter
    newTag: latest
```

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
  kustomize:
    paths:
      - k8s/v3-ans/overlays/local
```

```shell
skaffold dev
```

```shell
cd ${PROJECT_ROOT}/app/web
# 未実施の場合
npm install
# Vue.js起動
npm run servce
```

```shell
kubectl create job test1 --from cj/local-task-reporter
```

## EKSクラスタにデプロイ

```yaml
commonLabels:
  env: prod

namespace: prod
namePrefix: prod-

resources:
  - ../../base
  - task-web/deployment.yaml
  - task-web/service.yaml
  - lets-encrypt-issuer.yaml

patches:
  - target:
      kind: Ingress
      group: networking.k8s.io
      name: app-ingress
      version: v1
    patch: |-
      - op: add
        path: /metadata/annotations
        value:
          external-dns.alpha.kubernetes.io/hostname: k8s-tutorial.mamezou-tech.com
          cert-manager.io/issuer: "letsencrypt-issuer"
          cert-manager.io/renew-before: 2158h
      - op: add
        path: /spec/tls
        value:
          - hosts:
              - k8s-tutorial.mamezou-tech.com
            secretName: letsencrypt-cert
      - op: replace
        path: /spec/rules/0/host
        value: k8s-tutorial.mamezou-tech.com
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

  - target:
      kind: Deployment
      group: apps
      name: task-service
    patch: |-
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: task-service
      spec:
        replicas: 3
        template:
          spec:
            # IRSA
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
  - target:
      kind: CronJob
      group: batch
      name: task-reporter
    patch: |-
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

configMapGenerator:
  - name: task-service-config
    behavior: merge
    envs:
      - task-service.env
  - name: task-reporter-config
    behavior: merge
    envs:
      - task-reporter.env

images:
  - name: task-service
    newName: xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-service
    newTag: test-v1
  - name: task-reporter
    newName: xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-reporter
    newTag: test-v1
  - name: task-web
    newName: xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-web
    newTag: test-v1
```

```shell
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com

TAG=v1

cd ${PROJECT_ROOT}/app/apis/task-service
docker build -t xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-service:${TAG} .
docker push xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-service:${TAG}

cd ${PROJECT_ROOT}/app/web
docker build -t xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-web:${TAG} .
docker push xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-web:${TAG}

cd ${PROJECT_ROOT}/app/jobs/task-reporter
docker build -t xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-reporter:${TAG} .
docker push xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/mamezou-tech/task-reporter:${TAG}
```

```shell
aws eks update-kubeconfig --name mz-k8s
kubectl apply -k ${PROJECT_ROOT}/app/k8s/v3-ans/overlays/prod
# または
kustomize build ${PROJECT_ROOT}/app/k8s/v3-ans/overlays/prod | kubectl apply -f-
```

## 動作確認

## まとめ