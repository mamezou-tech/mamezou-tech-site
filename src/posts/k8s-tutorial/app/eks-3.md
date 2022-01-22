---
title: クラスタ環境デプロイ - EKSクラスタ(デプロイ)
author: noboru-kudo
date: 2022-01-23
prevPage: ./src/posts/k8s-tutorial/app/eks-2.md
---

本記事は、[クラスタ環境デプロイ - EKSクラスタ(Kustomize導入)](/containers/k8s/tutorial/app/eks-2/)からの続きです。

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