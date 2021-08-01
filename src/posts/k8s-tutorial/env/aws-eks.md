---
title: AWS EKSクラスタ環境構築
author: noboru-kudo
---
今回はAWSのKubernetesフルマネージドサービスのEKS(Elastic Kubernetes Service)でクラスタ環境を構築してみましょう。

最初はCloud Formationから作る手順だけが公式でしたが、現在はeksctlも公式ドキュメントで紹介されています。

- CloudFormationから作る方法。こっちは少し手順が複雑。
  <https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/getting-started-console.html>

## 1. 事前準備
ここに書いてある通り、AWS CLI、eksctlをインストールして初期設定する。
https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/getting-started-eksctl.html

## 2. Kubernetesクラスタ環境構築
Node数2、Worker Node のインスタンスタイプm5.largeで作成する。
こういう時はエラーになる（結構待たされてからエラーになっているとショック）。
EC2のインスタンスリミットに引っ掛かている。ｰ>選択できるインスタンスタイプを指定するか上限アップをリクエストする
同名のCloudFormationが生成されている。ｰ>前に作成したCloudFormationを削除する。
```shell
CLUSTER_NAME=frieza
eksctl create cluster \
--name $CLUSTER_NAME \
--nodegroup-name standard-workers \
--node-type m5.large \
--nodes 2 \
--auto-kubeconfig \
--region ap-northeast-1 \
--zones ap-northeast-1a,ap-northeast-1c,ap-northeast-1d
```
```
[ℹ]  using region ap-northeast-1
[ℹ]  subnets for ap-northeast-1a - public:192.168.0.0/19 private:192.168.96.0/19
[ℹ]  subnets for ap-northeast-1c - public:192.168.32.0/19 private:192.168.128.0/19
[ℹ]  subnets for ap-northeast-1d - public:192.168.64.0/19 private:192.168.160.0/19
[ℹ]  nodegroup "standard-workers" will use "ami-0dfbca8d183884f02" AmazonLinux2/1.12
[ℹ]  creating EKS cluster "frieza" in "ap-northeast-1" region
[ℹ]  will create 2 separate CloudFormation stacks for cluster itself and the initial nodegroup
[ℹ]  if you encounter any issues, check CloudFormation console or try 'eksctl utils describe-stacks --region=ap-northeast-1 --name=frieza'
[ℹ]  2 sequential tasks: { create cluster control plane "frieza", create nodegroup "standard-workers" }
[ℹ]  building cluster stack "eksctl-frieza-cluster"
[ℹ]  deploying stack "eksctl-frieza-cluster"
[ℹ]  building nodegroup stack "eksctl-frieza-nodegroup-standard-workers"
[ℹ]  --nodes-min=2 was set automatically for nodegroup standard-workers
[ℹ]  --nodes-max=2 was set automatically for nodegroup standard-workers
[ℹ]  deploying stack "eksctl-frieza-nodegroup-standard-workers"
[✔]  all EKS cluster resource for "frieza" had been created
[✔]  saved kubeconfig as "/Users/noboru-kudo/.kube/eksctl/clusters/frieza"
[ℹ]  adding role "arn:aws:iam::xxxxxx:role/eksctl-frieza-nodegroup-standard-NodeInstanceRole-DP36NO03STSO" to auth ConfigMap
[ℹ]  nodegroup "standard-workers" has 0 node(s)
[ℹ]  waiting for at least 2 node(s) to become ready in "standard-workers"
[ℹ]  nodegroup "standard-workers" has 2 node(s)
[ℹ]  node "ip-192-168-2-62.ap-northeast-1.compute.internal" is ready
[ℹ]  node "ip-192-168-84-13.ap-northeast-1.compute.internal" is ready
[ℹ]  kubectl command should work with "/Users/noboru-kudo/.kube/eksctl/clusters/frieza", try 'kubectl --kubeconfig=/Users/noboru-kudo/.kube/eksctl/clusters/frieza get nodes'
[✔]  EKS cluster "frieza" in "ap-northeast-1" region is ready
```
実行するためそれなりの時間がかかります。

```shell
aws eks describe-cluster --name $CLUSTER_NAME
```
クラスタ作成に成功するとCLIからは以下のようにクラスタが作成されていることが分かります。
```
{
    "cluster": {
        "status": "ACTIVE",
        "endpoint": "https://76B46A0E9BDAE919EE81808AB86DC247.yl4.ap-northeast-1.eks.amazonaws.com",
        "logging": {(省略)},
        "name": "frieza",
        "certificateAuthority": {
            "data": "xxxxxx"
        },
 (省略)
        "version": "1.12",
        "platformVersion": "eks.2",
        "createdAt": 1560948351.755
    }
}
```
`eksctl utils describe-stacks --region=ap-northeast-1 --name=$CLUSTER_NAME`だともっと詳細な情報が照会できる。

eksctlは内部的には`eksctl-${CLUSTER_NAME}-cluster`というVPCを作成するCloudFormationスタックと`eksctl-${CLUSTER_NAME}-nodegroup-standard-workers`というWorker(NodeGroup)を構築するCloudFormationスタックが作成されている。
VPC、EKS(k8sのMaster)、Woker(普通のEC2)を順次作成している。CloudFormationのイベントを見てるとかなり多くのことをやっている（時間が長いのはそれが理由っぽいですね）。
![](https://i.gyazo.com/2052e3f22cf37a05f36d36b43be41c93.png)

## 3. クラスタ環境への接続

ローカル環境からkubectl経由でEKSに接続する設定をする。
前は[aws-iam-authenticator https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/install-aws-iam-authenticator.html]をインストールする必要があったがやらなくても大丈夫だった
勢いでやってしまったがこれも公式手順には記載されてないので要らないかも？
```shell
eksctl utils write-kubeconfig --name=$CLUSTER_NAME
```
kubeconfigの中身を見てみる。
```shell
kubectl config view
```
```
apiVersion: v1
clusters:
- cluster:
        certificate-authority-data: DATA+OMITTED
        server: https://76B46A0E9BDAE919EE81808AB86DC247.yl4.ap-northeast-1.eks.amazonaws.com
      name: frieza.ap-northeast-1.eksctl.io
    contexts:
- context:
        cluster: frieza.ap-northeast-1.eksctl.io
        user: iam-root-account@frieza.ap-northeast-1.eksctl.io
      name: iam-root-account@frieza.ap-northeast-1.eksctl.io
    current-context: iam-root-account@frieza.ap-northeast-1.eksctl.io
    kind: Config
    preferences: {}
    users:
- name: iam-root-account@frieza.ap-northeast-1.eksctl.io
      user:
        exec:
          apiVersion: client.authentication.k8s.io/v1alpha1
          args:
          - token
          - -i
          - frieza
          command: aws-iam-authenticator
          env: null
```
AWS IAM経由でEKSにアクセスしていることが分かる。

クラスタ情報は。。。
```shell
kubectl cluster-info
```
```
Kubernetes master is running at https://76B46A0E9BDAE919EE81808AB86DC247.yl4.ap-northeast-1.eks.amazonaws.com
CoreDNS is running at https://76B46A0E9BDAE919EE81808AB86DC247.yl4.ap-northeast-1.eks.amazonaws.com/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
```
スーパーシンプル。ローカルで構築したときと同じで余計なものは何もなし。

最後にWorker Nodeを見てみる。
```shell
kubectl get node -o wide
```
```
NAME                                               STATUS   ROLES    AGE   VERSION   INTERNAL-IP     EXTERNAL-IP     OS-IMAGE         KERNEL-VERSION                  CONTAINER-RUNTIME
ip-192-168-2-62.ap-northeast-1.compute.internal    Ready    <none>   22m   v1.12.7   192.168.2.62    54.249.13.150   Amazon Linux 2   4.14.123-111.109.amzn2.x86_64   docker://18.6.1
ip-192-168-84-13.ap-northeast-1.compute.internal   Ready    <none>   22m   v1.12.7   192.168.84.13   52.195.14.186   Amazon Linux 2   4.14.123-111.109.amzn2.x86_64   docker://18.6.1
```
OSはAmazon Linux2、CRIはdockerが使われているようだ。Masterはフルマネージドサービスのため見ることはできない。

## 4. 動作確認

ローカル(Vagrant+VirtualBox)で構築したときと同じようにNginxをデプロイしてみる。
```shell
kubectl create deployment nginx --image=nginx
# 数秒待ってから
kubectl get deployment,replicaset,pod
```
```
> NAME                          DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
> deployment.extensions/nginx   1         1         1            1           6m3s
>
> NAME                                    DESIRED   CURRENT   READY   AGE
> replicaset.extensions/nginx-55bd7c9fd   1         1         1       6m3s
>
> NAME                        READY   STATUS    RESTARTS   AGE
> pod/nginx-55bd7c9fd-hvmk6   1/1     Running   0          6m3s
```

デプロイしたPodをLoadBalancerタイプのServiceとして公開する。
```shell
kubectl create service loadbalancer nginx --tcp 80:80
```
```
service/nginx created
```
```shell
kubectl get svc
```
```
> NAME         TYPE           CLUSTER-IP      EXTERNAL-IP                                                                    PORT(S)        AGE
> kubernetes   ClusterIP      10.100.0.1      <none>                                                                         443/TCP        35m
> nginx        LoadBalancer   10.100.155.12   [* a2e819798929611e99a2a060bf670347-1593125274.ap-northeast-1.elb.amazonaws.com]   80:31140/TCP   44s
```
AWSはFQDNのみが使えるので`a2e819798929611e99a2a060bf670347-1593125274.ap-northeast-1.elb.amazonaws.com`が公開IP(EXTERNAL_IP)として割り当てられた。内部的にはEKSによってELBリソース(この時はClassic Load Balancerだった)が作成されている。
NginxのWelcomeページにアクセスできるかを試す。
```shell
curl a2e819798929611e99a2a060bf670347-1593125274.ap-northeast-1.elb.amazonaws.com
```
```
> <!DOCTYPE html>
> <html>
> <head>
> <title>Welcome to nginx!</title>
> <style>
>     body {
>         width: 35em;
>         margin: 0 auto;
>         font-family: Tahoma, Verdana, Arial, sans-serif;
>     }
> </style>
> </head>
> <body>
> <h1>Welcome to nginx!</h1>
> <p>If you see this page, the nginx web server is successfully installed and
> working. Further configuration is required.</p>
>
> <p>For online documentation and support please refer to
> <a href="http://nginx.org/">nginx.org</a>.<br/>
> Commercial support is available at
> <a href="http://nginx.com/">nginx.com</a>.</p>
>
> <p><em>Thank you for using nginx.</em></p>
> </body>
> </html>
```

## 5. AWS管理コンソール
動作検証内容がAWSコンソールでどうなっているのかを見てみる。

- EKSクラスタ  
  基本的にEKS独自で見れる情報はこれだけ。
![](https://i.gyazo.com/d524daa0001474ebd28fed4650fa3734.png)

- VPC  
  EKSが載っているVPC。
![](https://i.gyazo.com/1a2813977a38dccc37d8b94007a1a26a.png)

	EC2
		Workerノード。
![](https://i.gyazo.com/064dc74872325779e86d1a128aecf15f.png)

	CloudWatch
		他のサービス同様にEC2レベルのメトリクスは参照できる。
		今のところk8s内部のメトリクスはAWSは踏み込まず、GKE,AKSと比べると弱い
![](https://i.gyazo.com/82b70b23aa8698f4377419832cdb099e.png)


## 6. クリーンアップ
個別にEC2の情報とかを変更した場合はドリフトして失敗していることがあるので、その時は頑張って個別に消しましょう！
```shell
# ELB削除
kubectl delete svc nginx
# VPC,EKS削除
eksctl delete cluster --name $CLUSTER_NAME
```

うっかりService(ELB)を消さずにEKSを削除しようとするとエラーになりますので注意しましょう。
![](https://i.gyazo.com/c8f27a64ab1fa63973bdfb1b6e7e16c3.png)
