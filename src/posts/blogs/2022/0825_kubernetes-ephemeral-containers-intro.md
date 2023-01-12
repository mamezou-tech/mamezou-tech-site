---
title: kubectl debugを使ってKubernetesのコンテナをデバッグする
author: noboru-kudo
date: 2022-08-25
templateEngineOverride: md
tags: [k8s, container]
---

2022-08-23にKubernetesのv1.25がリリースされました。

- [Kubernetes公式ブログ - Kubernetes v1.25: Combiner](https://kubernetes.io/blog/2022/08/23/kubernetes-v1-25-release/)

PSP(Pod Security Policy)の削除等、多くの変更がありますが、Ephemeral ContainersがBetaからStableバージョンとなりました。
この機能は`kubectl debug`コマンド[^1]で使用できますが、あまり使ったことがなく、これを機に改めて使い方を調べてみましたのでご紹介します。

[^1]: kubectl v1.18~では`kubectl alpha debug`でv1.20~からは`kubectl debug`として利用できました。

一般的にKubernetes上で動作するPodのコンテナをデバッグするには`kubectl exec`を使うことが多いかと思います。
しかし、昨今はセキュリティリスク低減や軽量化による起動速度向上の目的で、[Distroless](https://github.com/GoogleContainerTools/distroless)イメージを使うことが多くなってきています[^2]。

[^2]: Kubernetes本体もコンテナのベースイメージにはDistrolessを使っています。

この欠点はデバッグが難しいことです。Distrolessイメージにはシェルを含めて余計なものは一切含まれていませんので、`kubectl exec`でコンテナに入って状態を調べることはできません。

ここでは、これを解消するための`kubectl debug`の使い方を簡単に見てみます。


## DistrolessイメージでPodデプロイ

まず今回デバッグ対象のPodをデプロイします。
ここでは、以下のPodを用意しました。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: server
data:
  server.js: |
    const http = require('http');
    const server = http.createServer((req, res) => {
      res.statusCode = 200;
      res.end('hello sample app!\n');
    });
    server.listen(8080, '0.0.0.0', () => console.log('Server running'));
---
apiVersion: v1
kind: Pod
metadata:
  name: sample-app
spec:
  containers:
    - name: sample-app
      image: gcr.io/distroless/nodejs:16 # Distrolessイメージ
      ports: [ { name: http, containerPort: 8080 } ]
      args: [ "/app/server.js" ]
      volumeMounts: [ { mountPath: /app, name: server } ]
  volumes:
    - name: server
      configMap:
        name: server
```

Node.jsのDistrolessイメージを使用したものです。アプリ自体(ConfigMapからボリュームマウント)は固定文字列を返す単純なHTTPサーバー(`server.js`)です。
これに対して`kubectl exec`を使ってデバッグしようとすると、以下のようなエラーが発生します。

```shell
kubectl exec sample-app -it -- sh
> OCI runtime exec failed: exec failed: container_linux.go:380: starting container process caused: exec: "sh": executable file not found in $PATH: unknown
> command terminated with exit code 126
```

このようにDistrolessコンテナにはシェル(sh)がないため、`kubectl exec`では何もできません。

## Ephemeral Containersでコンテナをデバッグする

その名の通りEphemeral Containersは一時的なコンテナで、デバッグ対象のPodにアタッチすることで、Pod内の他のコンテナにアクセスできます。
`kubectl debug`にデバッグ対象のPod名を指定し、Ephemeral Containersでデバッグに使う任意のイメージ(`--image`)を指定します。
以下のように使います。

### curlでAPIにアクセスする

curlコマンドを持つイメージ(`curlimages/curl`)をEphemeral ContainersとしてPod内に配置し、Node.jsのHTTPサーバーにアクセスしてみます。

```shell
kubectl debug sample-app -it --image=curlimages/curl -- curl localhost:8080
> Defaulting debug container name to debugger-wj662.
> hello sample app!
```

期待通りのレスポンスが返ってきました。
サイドカーコンテナ同様に、Ephemeral Containersはアプリコンテナと同一ネックワークを共有していますので、ローカルアクセス(`localhost:8080`)できます。

### コンテナのファイルシステムを調べる

ConfigMapからボリュームマウントして配置した`server.js`を、Ephemeral Containers経由で確認してみます。
この場合は、コンテナをまたがってファイルシステムを参照する必要がありますので、`--target`オプションにプロセス名前空間を共有するコンテナ(`sample-app`)を指定します。

```shell
# Ephemeral Containersでシェル(sh)実行
kubectl debug sample-app -it --image=alpine --target sample-app -- sh
> Targeting container "sample-app". If you don't see processes from this container it may be because the container runtime doesn't support this feature.
> Defaulting debug container name to debugger-jgp9q.
> If you don't see a command prompt, try pressing enter.
/ # 
```

以降は、Ephemeral Containers内での操作です。

```shell
# Node.jsのプロセス確認
ps x
> PID   USER     TIME  COMMAND
>    1 root      0:00 /nodejs/bin/node /app/server.js
>   31 root      0:00 sh
>   38 root      0:00 ps x
# ファイルシステムアクセス
ls -l /proc/1/root/app
> total 0
> lrwxrwxrwx    1 root     root            16 Aug 24 07:59 server.js -> ..data/server.js
```

まず、psコマンドで対象コンテナのプロセスを特定します。`--target`でプロセス名前空間を共有していますので、対象コンテナのプロセスを参照できます[^3]。
共有したコンテナのファイルシステムは`/proc/{pid}/root`より確認できます。

[^3]: プロセス名前空間の共有についての詳細は[公式ドキュメント](https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/)を参照しくてださい。

### デバッグ対象Podのマニフェスト

Ephemeralコンテナの状態は、デバッグ対象のPodから確認できます(`kubectl get pod sample-app -o yaml`)。
Podの`spec`は以下のようになっていました。

```yaml
spec:
  containers:
    - name: sample-app
      # 省略
  ephemeralContainers:
    - command:
        - curl
        - localhost:8080
      image: curlimages/curl
      imagePullPolicy: Always
      name: debugger-wj662
      # 省略
    - command:
        - sh
      image: alpine
      imagePullPolicy: Always
      name: debugger-jgp9q
      # 省略
```

`spec.ephemeralContainers`が追加され、終了済みのものも含めて実行した`kubectl debug`の内容が定義されています。
`status`にも、コンテナの状態が追加されます。

```yaml
status:
  containerStatuses:
    - # 省略
  ephemeralContainerStatuses:
    - containerID: docker://.....
      image: alpine:latest
      name: debugger-jgp9q
      ready: false
      restartCount: 0
      state:
        running:
          startedAt: "2022-08-24T09:06:24Z"
    - containerID: docker://.....
      image: curlimages/curl:latest
      name: debugger-wj662
      ready: false
      restartCount: 0
      state:
        terminated:
          containerID: docker://.....
          exitCode: 0
          finishedAt: "2022-08-24T09:06:14Z"
          reason: Completed
          startedAt: "2022-08-24T09:06:14Z"
```

Ephemeral Containersのステータスが追加されています。
上記はcurlを実行したコンテナ(`debugger-wj662`)は完了済み(`Completed`)で、シェルを実行しているコンテナ(`debugger-jgp9q`)はまだ実行中であることが分かります。

## Podをコピーしてサイドカーコンテナからデバッグする

Ephemeral Containersは便利ですが、内部的にはPodの`spec`を書き換えていますので、商用環境ではあまりやりたくない(or できない)かもしれません。
`kubectl debug`では、Podをコピーして、その中にサイドカーとしてデバッグコンテナを実行することも可能です。
コピーするといってもPodのラベルはコピーされませんので、既存のServiceやReplicaSet等のラベルセレクターの対象とはなりません（実際のトラフィックは来ない）。

この場合は以下のように実行します。

```shell
kubectl debug sample-app -it --image=alpine \
  --share-processes --copy-to debug-sample-app -- sh
```

ここでは`--share-processes`でプロセス名前空間を共有するよう指定し、`--copy-to`でコピー先のPodを指定します。
その後のデバッグ操作は先程と同様です。

ただし、今回はEphemeral Containersではなく、サイドカーコンテナになっています。
以下は`kubectl get pod`した内容です。

```
NAME               READY   STATUS    RESTARTS   AGE
debug-sample-app   2/2     Running   0          27s
sample-app         1/1     Running   0          35m
```

`debug-sample-app`というPodが生成されていることが分かります。`READY`では`2/2`となっており、2つのコンテナが実行中となっています。
Podのマニフェストは以下のようになります(関連部分抜粋・編集)。

```yaml
spec:
  containers:
    - name: sample-app
      image: gcr.io/distroless/nodejs:16
      imagePullPolicy: IfNotPresent
      args:
        - /app/server.js
    - name: debugger-nglnx
      image: alpine
      imagePullPolicy: Always
      command:
        - sh
  shareProcessNamespace: true # プロセス名前空間共有(--share-processes)
```

今回はサイドカーコンテナとしてデバッグ用のコンテナがデプロイされています。
また、プロセス名前空間共有を表す`shareProcessNamespace`に`true`が指定されています。
これにより、先程のようにデバッグコンテナから対象コンテナのファイルシステムにアクセスできるようになっています。

コピーしたデバッグ用のPodは自動では削除されませんので、デバッグ作業が終わったら手動で削除する必要があります。

```shell
kubectl delete pod debug-sample-app
```

## まとめ
簡単ですが、`kubectl debug`の機能をご紹介しました。
始めにも触れましたが、セキュリティリスク削減や軽量化が推し進められ、それに伴ってコンテナのデバッグ方法も変遷していると感じます。
コンテナを使った開発では、この辺りのやり方もウォッチしておかないといけないなと感じました。

---
参照資料

- [Kubernetesドキュメント - Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)