---
title: クラスタ環境デプロイ - EKSクラスタ(デプロイ)
author: noboru-kudo
date: 2022-01-23
prevPage: ./src/posts/k8s-tutorial/app/eks-2.md
---

本記事は、[クラスタ環境デプロイ - EKSクラスタ(Kustomize導入)](/containers/k8s/tutorial/app/eks-2/)からの続きです。

これまで、DynamoDBやS3等のAWSリソース準備し、ローカル、商用の環境差分を吸収するために、Kustomizeを導入しました。
ここからは、仮想商用環境のEKS向けにアプリケーションをデプロイします。

これにはEKSバージョンのマニフェストを用意する必要があります。既に`base`として共通部分は作成済みですので、商用環境向けのパッチファイルを`overlays/prod`に作成するだけです。


[[TOC]]

## EKS環境設定(overlays/prod)

### task-service

タスク管理サービス(task-service)のDeploymentに対するパッチを作成します。
ローカル環境のパッチ作成と同様に、`app/k8s/v3/overlays/prod/patches`配下に`task-service`ディレクトリを作成します。
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
```

```text
STAGE=prod
NODE_ENV=production
TASK_TABLE_NAME=task-tool-prod-tasks
AWS_DEFAULT_REGION=ap-northeast-1
```

### task-reporter

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

```text
STAGE=prod
NODE_ENV=production
TASK_TABLE_NAME=task-tool-prod-tasks
REPORT_BUCKET=task-tool-prod-completed-task-report-bucket
TARGET_OFFSET_DAYS=1
AWS_DEFAULT_REGION=ap-northeast-1
```

### Ingress

```yaml
- op: add
  path: /metadata/annotations
  value:
    external-dns.alpha.kubernetes.io/hostname: task.mamezou-tech.com
    cert-manager.io/issuer: "prod-letsencrypt-issuer"
    cert-manager.io/renew-before: 2158h
- op: add
  path: /spec/tls
  value:
    - hosts:
        - task.mamezou-tech.com
      secretName: letsencrypt-cert
- op: replace
  path: /spec/rules/0/host
  value: task.mamezou-tech.com
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

### Kustomizationファイル

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

```yaml
patches:
  - path: patches/task-service/deployment.patch.yaml
  - path: patches/task-reporter/cronjob.patch.yaml
  - target:
      kind: Ingress
      name: app-ingress
    path: patches/ingress/ingress.patch.yaml
```

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

## EKS環境デプロイ

```shell
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin xxxxxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com

TAG=1.0.0

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

```shell
kubectl create job test1 --from cj/prod-task-reporter
```

## クリーンアップ
```shell
kubectl delete -k ${PROJECT_ROOT}/app/k8s/v3-ans/overlays/prod
helm uninstall cert-manager -n cert-manager
helm uninstall external-dns -n external-dns
helm uninstall ingress-nginx -n ingress-nginx

aws s3 rm s3://task-tool-prod-completed-task-report-bucket --recursive

cd ${PROJECT_ROOT}/app/terraform-ans
terraform destroy -var env=prod -var oidc_provider_url=${OIDC_PROVIDER_URL}
```

## まとめ