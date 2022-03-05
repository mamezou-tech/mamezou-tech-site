---
title: KubernetesのPod Security(PSS/PSA)
author: noboru-kudo
date: 2022-03-03
tags: [container, k8s]
---

Kubernetesのv1.21で、今までPodセキュリティを担っていた[PodSecurityPolicy(PSP)](https://kubernetes.io/docs/concepts/policy/pod-security-policy/)が非推奨となりました[^1]。このままいくとPSPはv1.25で削除される予定です。

[^1]: <https://kubernetes.io/blog/2021/04/06/podsecuritypolicy-deprecation-past-present-and-future/>

Kubernetesコミュニティ(Auth Special Interest Group)では、現在これに代わるものとして新たに[Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)を規定し、これをもとにPodのスペックを検証する[Pod Security Admission](https://kubernetes.io/docs/concepts/security/pod-security-admission/)を開発しています。
このPod Security Admissionは、現時点で最新のKubernetes v1.23で、Betaバージョンとなりデフォルトで有効となりました(v1.25でStableバージョンになる予定)。

今回は、このPod Security Standards(以下PSS)とPod Security Admission(以下PSA)の使い方を紹介します。

:::info
PSS/PSAはビルドイン機能として、設定のシンプルさを追求しています。
このため、きめ細かいセキュリティポリシーを適用をする必要がある場合は、専用プロダクトの導入が推奨されています。
これを実現するプロダクトには、以下のようなものがあります。
- [OPA/GateKeeper](https://open-policy-agent.github.io/gatekeeper/website/docs/)
- [Kyverno](https://kyverno.io/)
- [jsPolicy](https://www.jspolicy.com/)
:::

[[TOC]]

## 環境準備
今回はminikubeでKubernetes環境を準備します。minikubeをローカル環境にインストールします。

- [minikube start](https://minikube.sigs.k8s.io/docs/start/)

PSAでは、ポリシー違反内容を監査ログに追記する機能があります。これを確認するために、事前に以下の監査ログ設定ファイルを用意します(`audit-policy`)。

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: Request
    resources:
      - group: ""
        resources: ["pods"]
    namespaces: ["sample"]
    verbs: ["create", "edit"]
```

上記は、`sample`Namespace上のPod生成・更新イベントの監査ログを取得するようにしています。
これをminikubeのディレクトリにコピーしておきます。

```shell
mkdir -p ~/.minikube/files/etc/ssl/certs
cp audit-policy.yaml ~/.minikube/files/etc/ssl/certs
```

これでminikubeを起動します。

```shell
minikube start --kubernetes-version 1.23.4 \
  --extra-config=apiserver.audit-policy-file=/etc/ssl/certs/audit-policy.yaml \
  --extra-config=apiserver.audit-log-path=-
```

`--kubernetes-version`として現時点で最新の`1.23.4`を指定しました。
また、`--extra-config`で先程作成した監査ログのポリシーファイルを指定し、監査ログをAPI Serverの標準出力(`-`)に流すよう指定しています。

起動が完了したら、Kubernetesバージョンが1.23系になっていることを確認します。

```shell
kubectl version --short
```
```
Client Version: v1.23.0
Server Version: v1.23.4
```

## Dockerfile作成

検証用に使用するコンテナイメージを作成します。
以下のDockerfileを用意しました。

```dockerfile
FROM alpine:latest
RUN apk --no-cache update \
    && apk --no-cache add sudo
RUN adduser -D sample --uid 1001 \
    && echo "app ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/sample \
    && chmod 0440 /etc/sudoers.d/sample
ENTRYPOINT ["sh", "-c", "whoami && sleep infinity"]
```

検証用にroot以外のユーザー(`sample:1001`)を用意しています(デフォルトはrootのまま)。

これをビルドします。

```shell
# minikube のDockerデーモンに接続
eval $(minikube docker-env)
docker build -t sample-app:latest .
```

これで準備は完了です。

## PSA設定

PSAはNamespaceの単位で設定します。
以下のNamespaceのマニフェストファイル(`sample-namespace.yaml`)を準備します。

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: sample
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

`labels`部分がPSAの設定です[^2]。
`pod-security.kubernetes.io/<MODE>: <LEVEL>`のポリシーレベルとポリシー違反時のアクション(モード)を指定します。

ポリシーレベルはPSSでプロファイルとして規定されているものです。以下の3つのものが指定可能です。

- `privileged`: 最も緩いポリシー(制限なし)。システム系のPod以外では使用しないのが望ましい。
- `baseline`: 中間のポリシー。rootコンテナ、一部のシステムコマンド実行やホストリソースの利用が可能。
- `restricted`: 最も厳しいポリシー。個人情報等を扱うアプリケーションは基本こちら。

各レベルの詳細は、[公式ドキュメント](https://kubernetes.io/docs/concepts/security/pod-security-standards/#profile-details)を参照してください。

ポリシー違反時のモードは以下の3つが指定可能です。

- `enforce`: ポリシー違反時はPodを生成しない。
- `audit`: Kubernetesの[監査ログ](https://kubernetes.io/docs/tasks/debug-application-cluster/audit/)のアノテーションに違反内容を記録する。生成自体は可能。
- `warn`: リソース生成時(kubectl等)に警告を出力する。生成自体は可能

このように、`enforce`以外はポリシー違反でもPod自体の生成は可能なものとなっています。

ここでは`baseline`をMUST(`enforce`)とし、`restricted`に満たないものは警告、監査ログに記録のみ実施する設定としました。

[^2]: Kubernetes 1.23はBetaバージョンですが、今後Stableバージョン(1.25予定)になるとラベルではなく、`spec`の方が使われると思われます。

## 動作確認

では、Podを実際にデプロイしてPSAの動作を確認します。

### 違反なし

まずは、Namespaceに指定したPSS/PSAの要件を満たすPodをデプロイします。
以下のマニフェストを準備します(`non-root-deployment.yaml`)。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: sample-non-root
  name: sample-non-root
  namespace: sample
spec:
  selector:
    matchLabels:
      app: sample-non-root
  template:
    metadata:
      labels:
        app: sample-non-root
    spec:
      containers:
        - name: sample-non-root
          image: sample-app:latest
          imagePullPolicy: Never
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: [ALL]
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        seccompProfile:
          type: RuntimeDefault
```

コンテナ、Podレベルの`securityContext`でPSSの`restricted`基準を満たすように設定しました。

```shell
kubectl apply -f non-root-deployment.yaml
```
```
deployment.apps/sample-non-root created
```
ポリシー違反はありませんので、正常に生成できました。

### rootコンテナ

次に、コンテナの実行ユーザーをrootに変更します。これはPSSの`restricted`レベルのポリシーに違反しています。
以下のマニフェストを準備します(`root-deployment.yaml`)。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: sample-root
  name: sample-root
  namespace: sample
spec:
  selector:
    matchLabels:
      app: sample-root
  template:
    metadata:
      labels:
        app: sample-root
    spec:
      containers:
        - name: sample-root
          image: sample-app:latest
          imagePullPolicy: Never
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: [ALL]
      securityContext:
        runAsNonRoot: false # root
        seccompProfile:
          type: RuntimeDefault
```

`runAsNonRoot`を`false`(デフォルト)にして、`runAsUser`を削除しました。これでコンテナはrootユーザーで実行されます。

```shell
kubectl apply -f root-deployment.yaml
```
```
Warning: would violate PodSecurity "restricted:v1.23": runAsNonRoot != true (pod must not set securityContext.runAsNonRoot=false)
deployment.apps/sample-root created
```
警告ログ(`Warning...`)が出力されています。これは先程の`pod-security.kubernetes.io/warn: restricted`の指定が効いているからです。

監査ログの方も確認します。以下で表示できます[^3]。

[^3]: 今回はAPI サーバーのコンテナログ(標準出力)ですが、通常は監視ツールの対象となるログファイルやCloudWatch等のメトリクスサービスで確認します。

```shell
kubectl logs kube-apiserver-minikube -n kube-system --tail 10 | grep audit.k8s.io/v1
```

Pod生成イベントのアノテーション部分のみ抜粋します。

```json
{
  "annotations": {
    "authorization.k8s.io/decision": "allow",
    "authorization.k8s.io/reason": "RBAC: allowed by ClusterRoleBinding \"system:controller:replicaset-controller\" of ClusterRole \"system:controller:replicaset-controller\" to ServiceAccount \"replicaset-controller/kube-system\"",
    "pod-security.kubernetes.io/audit-violations": "would violate PodSecurity \"restricted:v1.23\": runAsNonRoot != true (pod must not set securityContext.runAsNonRoot=false)",
    "pod-security.kubernetes.io/enforce-policy": "baseline:v1.23"
  }
}
```

`pod-security.kubernetes.io/audit-violations`の部分に、ポリシー違反の内容が記録されていることが分かります。

### 特権コンテナ

最後に特権モードでコンテナを起動するように指定してみます。これはPSSの`baseline`レベルのポリシーに違反しています。
以下のマニフェストを準備します(`privileged-deployment.yaml`)。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: sample-privileged
  name: sample-privileged
  namespace: sample
spec:
  selector:
    matchLabels:
      app: sample-privileged
  template:
    metadata:
      labels:
        app: sample-privileged
    spec:
      containers:
        - name: sample-privileged
          image: sample-app:latest
          imagePullPolicy: Never
          securityContext:
            privileged: true
```

```shell
kubectl apply -f privileged-deployment.yaml
```
```
Warning: would violate PodSecurity "restricted:v1.23": privileged (container "sample-privileged" must not set securityContext.privileged=true), allowPrivilegeEscalation != false (container "sample-privileged" must set securityContext.allowPrivilegeEscalation=false), unrestricted capabilities (container "sample-privileged" must set securityContext.capabilities.drop=["ALL"]), runAsNonRoot != true (pod or container "sample-privileged" must set securityContext.runAsNonRoot=true), seccompProfile (pod or container "sample-privileged" must set securityContext.seccompProfile.type to "RuntimeDefault" or "Localhost")
deployment.apps/sample-privileged created
```

警告ログは想定通りですが、その後で`deployment.apps/sample-privileged created`となりDeploymentリソースが作成されてしまいました。
実際にPodが作成されているのかを確認してみます。

```shell
kubectl get deploy,rs,pod -n sample -l app=sample-privileged
```

```
NAME                                READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/sample-privileged   0/1     0            0           113s

NAME                                           DESIRED   CURRENT   READY   AGE
replicaset.apps/sample-privileged-8669bdbd45   1         0         0       113s
```

Deployment/ReplicaSetは生成されましたが、後続のPodは生成されていません(表示されていない)。
つまり、`pod-security.kubernetes.io/enforce`は、ポリシー違反時に**Pod**の生成を拒否するもので、サポートオブジェクトであるDeployment、ReplicaSetは通常通り作成可能となっています。
これだと表向きは成功したように見えて、実は失敗しているという分かりにくい状態になりますが、現状はこのような仕様のようです(Stableバージョンでは変わるかもしれません)。

ReplicaSetのイベントを確認してみます。

```shell
kubectl describe rs sample-privileged
```

以下Eventを抜粋します。

```
Events:
  Type     Reason        Age                  From                   Message
  ----     ------        ----                 ----                   -------
  Warning  FailedCreate  4m15s                replicaset-controller  Error creating: pods "sample-privileged-8669bdbd45-pkm8f" is forbidden: violates PodSecurity "baseline:v1.23": privileged (container "sample-privileged" must not set securityContext.privileged=true)
```

ここで、ReplicaSetでPodを作成時に、PSAで拒否されたことが分かります。

監査ログの方は、以下のようになりました。

```json
{
  "annotations": {
    "authorization.k8s.io/decision": "allow",
    "authorization.k8s.io/reason": "RBAC: allowed by ClusterRoleBinding \"system:controller:replicaset-controller\" of ClusterRole \"system:controller:replicaset-controller\" to ServiceAccount \"replicaset-controller/kube-system\"",
    "pod-security.kubernetes.io/audit-violations": "would violate PodSecurity \"restricted:v1.23\": privileged (container \"sample-privileged\" must not set securityContext.privileged=true), allowPrivilegeEscalation != false (container \"sample-privileged\" must set securityContext.allowPrivilegeEscalation=false), unrestricted capabilities (container \"sample-privileged\" must set securityContext.capabilities.drop=[\"ALL\"]), runAsNonRoot != true (pod or container \"sample-privileged\" must set securityContext.runAsNonRoot=true), seccompProfile (pod or container \"sample-privileged\" must set securityContext.seccompProfile.type to \"RuntimeDefault\" or \"Localhost\")",
    "pod-security.kubernetes.io/enforce-policy": "baseline:v1.23"
  }
}
```

先程同様に、全ての違反が記録されています。

## まとめ

Namespaceにラベル付けするだけで、PSS/PSAが簡単に使えることが分かりました。
PSS/PSAは簡単に使えるビルドイン機能の位置づけですので、PSS自体のカスタマイズはできません。

とはいえ、PSSはKubernetesが考えるセキュリティスタンダードです。
もっと柔軟な指定が必要な場合は、これを適用しつつも、追加の基準を外部プロダクトで補完するようなやり方も考えられます。
組織のセキュリティ要件に合わせて構成を決めていく必要がありそうです。
