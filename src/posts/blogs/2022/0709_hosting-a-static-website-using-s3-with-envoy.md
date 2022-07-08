---
title: S3 の静的 Web サイトを Rancher Desktop でホスティング 
author: shigeki-shoji
date: 2022-07-09
tags: [AWS, envoy, traefik, "rancher-desktop", container, ingress, k8s]
---

[Rancher Desktop](https://rancherdesktop.io/) や [k3s](https://k3s.io/) をインストールすると、デフォルトの場合 [Traefik](https://traefik.io/) が一緒にインストールされます。

これを使うことで、[Nginx Ingress](/containers/k8s/tutorial/ingress/ingress-nginx/) 等を別途インストールしなくても、デプロイしたサービスに外部からアクセスできるように構成できます。

この記事では、S3 上の静的 Web サイトに Envoy Proxy を使ってアクセスするサービスを使って説明します。

## Envoy Proxy の設定

[Envoy Proxy](https://www.envoyproxy.io/) は、非常に軽量かつ多機能なプロキシで、さまざまなサービスメッシュのデータプレーンでも利用されています。

この記事では、静的コンテンツがデプロイされた S3 バケットへのプロキシとして使用します。また、コントロールプレーン等を用いた動的構成ではなく、静的な YAML 形式のファイルを使って設定します。

設定ファイルは、次のようになります。

```yaml
admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901

static_resources:
  listeners:
  - address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          '@type': type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          codec_type: AUTO 
          stat_prefix: ingress_http
          route_config:
            name: s3_route
            virtual_hosts:
            - name: static_web
              domains:
              - '*'
              routes:
              - match:
                  prefix: /
                route:
                  cluster: s3
          http_filters:
          - name: envoy.filters.http.lua
            typed_config:
              '@type': type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
              inline_code: |
                function envoy_on_request(request_handle)
                  path = request_handle:headers():get(":path"):gsub("/$", "/index.html")
                  request_handle:headers():replace(":path", path)
                end
          - name: envoy.filters.http.aws_request_signing
            typed_config:
              '@type': type.googleapis.com/envoy.extensions.filters.http.aws_request_signing.v3.AwsRequestSigning
              service_name: s3
              region: <AWS_REGION>
              use_unsigned_payload: true
              host_rewrite: <BUCKET_NAME>.s3.<AWS_REGION>.amazonaws.com
          - name: envoy.filters.http.router
  
  clusters:
  - name: s3
    type: LOGICAL_DNS
    dns_lookup_family: V4_ONLY
    load_assignment:
      cluster_name: s3
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: <BUCKET_NAME>.s3.<AWS_REGION>.amazonaws.com
                port_value: 443
    transport_socket:
      name: envoy.transport_sockets.tls
```

`<>` で囲んだ、`AWS_REGION`、`BUCKET_NAME` はそれぞれ使用している環境 (例えば、`ap-northeast-1` と `mybucket` 等) に合わせて修正してください。

ここで作成した構成ファイルから Kubernetes の ConfigMap を作成します。

```shell
kubectl create configmap proxy-config --from-file front-envoy.yaml
```

## AWS のクレデンシャル

サービスが AWS にアクセスするクレデンシャルのため Kubernetes に Secret を作成します。`<>` で囲んだ、`AWS_ACCESS_KEY_ID` と `AWS_SECRET_ACCESS_KEY` は、割り当てるクレデンシャルに置き換えてください。

```shell
kubectl create secret generic aws-credentials --from-literal=aws_access_key_id=<AWS_ACCESS_KEY_ID> --from-literal=aws_secret_access_key=<AWS_SECRET_ACCESS_KEY>
```

## デプロイメント (Deployment)

Kubernetes に Pod をデプロイするための `deployment.yaml` は次の通りです。

```yaml
kind: Deployment
apiVersion: apps/v1
metadata:
  name: example
  labels:
    app: example
spec:
  replicas: 1
  selector:
    matchLabels:
      app: example
  template:
    metadata:
      labels:
        app: example
    spec:
      containers:
        - name: envoy
          image: envoyproxy/envoy:v1.21-latest
          ports:
            - containerPort: 8080
          env:
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: aws_access_key_id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: aws_secret_access_key
          volumeMounts:
            - readOnly: true
              mountPath: /config
              name: proxy-config
          args:
            - "-c"
            - "/config/front-envoy.yaml"
            - "--service-cluster"
            - "example-proxy"
      volumes:
        - name: proxy-config
          configMap:
            name: proxy-config
```

上のファイルを使ってデプロイします。

```shell
kubectl create -f deployment.yaml
```

## サービス (Service)

デプロイした Pod のサービスを作成します。`service.yaml` は次の通りです。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: example-svc
spec:
  selector:
    app: example
  ports:
    - port: 8080
      protocol: TCP
```

サービスの作成は、次のコマンドを使います。

```shell
kubectl create -f service.yaml
```

ここまでで、サービスに CLUSTER-IP が割り当てられ、Kubernetes クラスター内でサービスの利用が可能になっています。次のコマンドで CLUSTER-IP の確認ができます。

```shell
kubectl get svc
```

クラスター内で確認してみましょう。まず、Kubernetes クラスター内に ubuntu を起動します。

```shell
kubectl run ubuntu -i -t --rm=true --image=ubuntu
```

次に、`curl` をインストールして、上記で取得した CLUSTER-IP を使ってアクセスしてみましょう。`<>` で囲んだ `CLUSTER-IP` の部分を上記で取得した IP アドレスに置き換えてください。

```shell
apt update; apt install curl -y; curl -v http://<CLUSTER-IP>/
```

## Ingress

最後に Ingress を作成します。`ingress.yaml` は次の通りです。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
spec:
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: example-svc
                port:
                  number: 8080
```

次のように Ingress を作成します。

```shell
kubectl create -f ingress.yaml
```

作成された Ingress を確認してみましょう。ADDRESS は使っている PC に割り当てられた IP アドレスとなります。

```shell
kubectl get ingress
NAME              CLASS    HOSTS   ADDRESS        PORTS   AGE
example-ingress   <none>   *       192.168.1.2    80      76m
```

それでは、ブラウザ等で、`http://localhost/` にアクセスしてみてください。Kubernetes クラスタの外部からサービスへのアクセスを確認できます。

## まとめ

この記事の説明に使用した、コード全体は [GitHub リポジトリ](https://github.com/takesection-sandbox/envoyproxy-examples/tree/main/front-proxy-s3/kubernetes) にあります。

## 参考

- [S3 の静的 Web サイトをセキュアに Envoy でホスティング](/blogs/2022/03/26/hosting-a-static-website-using-s3-with-envoy-2/)
- [EnvoyをFront Proxyとして利用する](https://tech.uzabase.com/entry/2020/09/28/140046)
- [S3 の静的 Web サイトを Envoy でホスティング](/blogs/2022/02/16/hosting-a-static-website-using-s3-with-envoy/)
- [Envoy を使用して ID Token (OIDC) を検証する](/blogs/2022/02/20/envoy-authn/)
- [Envoy と Open Policy Agent を使用した認可](/blogs/2022/02/20/envoy-authz/)
- [Envoy Docs](https://www.envoyproxy.io/docs/envoy/latest/about_docs)
    - [HTTP route components](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto#config-route-v3-routeaction)
    - [AWS Request Signing](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/aws_request_signing_filter) 
    - [Lua](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter)
