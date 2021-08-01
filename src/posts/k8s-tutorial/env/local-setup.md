---
title: ローカルクラスタ環境構築(kubeadm)
description: Kubernetesを自分のローカル環境にインストールしてみよう
---

EKS, AKS, GKE, Rancher, OpenShift, Tanzu等、Kubernetesが利用できるディストリビューションはたくさんありますね。  
ただ、クラウドサービスは費用が気になるし、Dockerやminikube、kind等は無料で使えるけど実際の環境とは異なる部分が多くて心配。。
という方はローカルにk8sをインストールしてしまいましょう。

* とはいえ、ローカルマシンに入れる場合は、その中でControl Plane/Workerが動作するのである程度のハイスペックなマシンを準備する必要があります。  
今回はMacBook Pro(32GBメモリ,2.6 GHz 6コアIntel Core i7)で実施します。

セットアップツールはkopsやkubespray等比較的容易にセットアップできるものもありますが、今回は公式ツールのkubeadmを使用します。  
また、1台のマシン上に仮想環境(Virtualbox + Vagrant)を用意して、その上にマルチノードのクラスタ構成でKubernetesを導入してみます。

* もっと理解を深めたいアナタは[こちら](https://github.com/kelseyhightower/kubernetes-the-hard-way)にチャレンジしてみましょう！

全体的な構成は以下のようになります。

![](https://i.gyazo.com/a6fc0564284c2a417db133a24a3a8432.png)

作成したVagrantファイルの完成形は[こちら](https://raw.githubusercontent.com/mamezou-tech/k8s-hands-on/master/local-cluster/ubuntu1804/Vagrantfile)になります。

## 1. ノードセットアップ
クラスタを構成するノード準備。
Control Plane : 1台、Worker：3台の合計4ノードでOSは全てCentOS/7として準備。
MasterノードはCPUコアを2つ以上割り当てる必要がある。
GuestOS間やKubectl認証データの連携用にホスト-ゲストOS間でファイル共有(VirtualBoxのGuest Additions利用)
実運用の場合はMasterノードを冗長構成にして、手前にロードバランサを配置しないとダメ。

```ruby
# Control Plane Node。LB配置が面倒だったのでとりあえず1台。。。
(1..1).each do |i|
  config.vm.define "k8s-master#{i}" do |master|
    master.vm.box = "centos/7"
    master.vm.hostname = "k8s-master#{i}"
    # 共有フォルダ
    master.vm.synced_folder "shared/", "/home/vagrant/shared", type: "virtualbox", create: true, group: "vagrant", owner: "vagrant"
    master.vm.network "private_network", ip: "172.16.10.#{i + 10}"
    master.vm.provider "virtualbox" do |vb|
      vb.memory = 2048
      vb.cpus = 2 # 1だとエラーになる
    end
  # 全部手動でやる場合は以下をコメントアウト
  master.vm.provision "shell", inline: $master_node_script
  end
end

# Worker Node
(1..3).each do |i|
  config.vm.define "k8s-worker#{i}" do |worker|
    worker.vm.box = "centos/7"
    worker.vm.hostname = "k8s-worker#{i}"
    # 共有フォルダ
    worker.vm.synced_folder "shared/", "/home/vagrant/shared", type: "virtualbox", create: true, group: "vagrant", owner: "vagrant"
    worker.vm.network "private_network", ip: "172.16.20.#{i + 10}"
    worker.vm.provider "virtualbox" do |vb|
      vb.memory = 4096
      vb.cpus = 1
  end
  # 全部手動でやる場合は以下をコメントアウト
  worker.vm.provision "shell", inline: $worker_node_script
  end
end
```

## 2. OS初期設定(Control Plane/Worker)
全てのノードに対してKubernetes導入のためのCentOS/7の初期設定を行う。
```shell
# SWAP無効化
swapoff -a
sed -i '/ swap / s/^\\(.*\\)$/#\\1/g' /etc/fstab

# SELinux無効化
setenforce 0
sed -i 's/^SELINUX=enforcing$/SELINUX=permissive/' /etc/selinux/config

# yumパッケージ最新化
yum update -y
```

## 3. Kubernetes管理モジュールのインストール(Control Plane/Worker)
全てのノードに対してKubernetesの管理ツールのkubeadmとコンテナの管理を行うkubelet、クライアントツールのkubectlをインストール。
```shell
# yumリポジトリにkubernetesリポジトリを追加
cat <<EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://packages.cloud.google.com/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=1
repo_gpgcheck=0
gpgkey=https://packages.cloud.google.com/yum/doc/yum-key.gpg https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg
exclude=kube*
EOF

# 指定したバージョン#{k8s_version}のツールをインストール
VERSION=$(yum list kubeadm --showduplicates --disableexcludes=kubernetes | sort -r | grep #{k8s_version} | head -1 | awk '{print $2}')
yum install -y kubeadm-$VERSION kubelet-$VERSION kubectl-$VERSION --disableexcludes=kubernetes
systemctl enable kubelet && systemctl start kubelet
```

## 4. CRIモジュールのインストール(Control Plane/Worker)

Kubernetes実行に必要なコンテナランタイムエンジンのインストール。
今回は[Containerd]を入れたが、[Docker]や[cri-o], [rkt]等の[Container Runtime Interface(CRI)]に準拠したモジュールが導入可能。

```shell
# https://kubernetes.io/docs/setup/cri/#containerd

modprobe overlay
modprobe br_netfilter

# Setup required sysctl params, these persist across reboots.
cat > /etc/sysctl.d/99-kubernetes-cri.conf <<EOF
net.bridge.bridge-nf-call-iptables  = 1
net.ipv4.ip_forward                 = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF

# Install containerd
### Install required packages
yum install yum-utils device-mapper-persistent-data lvm2 -y

### Add docker repository(ContainerdはDockerリポジトリから配布される)
yum-config-manager \
--add-repo \
https://download.docker.com/linux/centos/docker-ce.repo

## Install containerd
yum install containerd.io -y

# Configure containerd
# gVisorを使う場合はここで設定してあげる必要がある
mkdir -p /etc/containerd
containerd config default > /etc/containerd/config.toml

# Restart containerd
systemctl restart containerd
```

## 5. ネットワーク設定(Control Plane/Worker)
各ノード・Pod間で通信できるようにkubeletのネットワーク設定を行う（おまじない的な。。）。

```shell
# https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/#network-plugin-requirements
sysctl net.bridge.bridge-nf-call-iptables=1
sysctl net.bridge.bridge-nf-call-ip6tables=1
sysctl --system

IPADDR=$(ip a show eth1 | grep inet | grep -v inet6 | awk '{print $2}' | cut -f1 -d/)
# bind node private ip to kubelet
sed -i "/KUBELET_EXTRA_ARGS=/c\KUBELET_EXTRA_ARGS=--node-ip=$IPADDR" /etc/sysconfig/kubelet
# Restart kubelet
systemctl daemon-reload
systemctl restart kubelet
```

## 6. Kubernetes Control Planeセットアップ(Control Planeのみ)
`kubeadm init`コマンドでControl Planeのモジュール(API Server/[CoreDNS]/[etcd]/Controller Manager等)を初期化する。
```shell
# Controll Plane初期化(continerd, flannel)
# 使用するCRI/CNIによってパラメータ調整が必要
kubeadm init --apiserver-advertise-address=$IPADDR --apiserver-cert-extra-sans=$IPADDR \
--node-name $HOSTNAME --pod-network-cidr=10.244.0.0/16 --cri-socket=/run/containerd/containerd.sock
```

## 7. CNIのインストール(Control Planeのみ)
Pod-to-Pod通信を司る[CNI]プラグインのインストール。
https://kubernetes.io/docs/concepts/cluster-administration/addons/#networking-and-network-policy
今回はオーバーレイネットワークを提供する[Flannel]をインストール。他にも[Calico]や[Weave Net]のWeb上で情報が多い。
この辺りはハマりどころ。。デフォルトだとOS-Pod間の通信がうまくいかなかったのでVagrant用に専用のマニフェストを用意した。
- https://github.com/coreos/flannel/blob/master/Documentation/troubleshooting.md#vagrant
- https://medium.com/@anilkreddyr/kubernetes-with-flannel-understanding-the-networking-part-1-7e1fe51820e4

```shell
# https://github.com/coreos/flannel
export KUBECONFIG=/etc/kubernetes/admin.conf
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/local-cluster/kube-flannel.yml
```


## 8. Control Planeのネットワーク調整
kubeadmはControl Planeをホストネットワーク上のPodとして構築するため、そのままだとAPI Serverからクラスタ上のServiceリソースにアクセスできず、一部機能に制限があるのでこの辺りを打破できるように調節する。
これをやらないとIstioとかOpenEBS等のAdmission WebHookを使う製品は機能しない
どうインストールするかで挙動が変わってくるので、このあたりはきっとハマりどころなんだろうな

```shell
# Control PlaneをDaemonSetとして実行する(SelfHosting)
# これをやらないとAPI Server からCoreDNSにアクセスできずAdmission WebHookが機能しなかった
# kubeadmはデフォルトでStatic PodとしてControl Planeを起動していて、これだとPod内の/etc/resolv.confがOS側と同じになる
# OS側のネットワーク調整をしればこれをやらなくても解決できそうな気もするが...（超ハマった）
kubeadm alpha self-hosting pivot -f

# Control Plane -> Service Net(10.96.0.0/12)への経路を追加
ip route add 10.96.0.0/12 via 10.244.0.1 dev cni0
```

## 9. Worker 向けScript作成(Control Planeのみ)

Workerノードがクラスタに参加するための配布用スクリプトを作成する。
以下はホストOSの共有フォルダ(/home/vagrant/shared)経由で配布しているが何でもいい(scpでやる例もある)。

```shell
mkdir -p /home/vagrant/shared
kubeadm token create --print-join-command > /home/vagrant/shared/kubeadm_join_cmd.sh
chmod +x /home/vagrant/shared/kubeadm_join_cmd.sh
```

こんな感じの`kubeadm join`スクリプト(kubeadm_join_cmd.sh)が生成される。

```shell
kubeadm join 172.16.10.11:6443 --token 66447a.9eubxyj90d05dsy9     --discovery-token-ca-cert-hash sha256:eeebdf0009b07c88eca7e0a382062236d0163a4c41ae89dbb0fcaf4054289bef
```

## 10. ホストOS向けのKubernetesトークン払い出し(Control Planeのみ)

TODO: 書き直し。
ホストOSからKubectlでクラスタにアクセスできるようにServiceAccountを作成して、共有フォルダに証明書とトークンを出力する(以下は`tester`というServiceAccountにcluster-admin権限を付与)。

```shell
kubectl create serviceaccount tester
SECRET_NAME=$(kubectl get serviceaccount tester -o jsonpath='{.secrets[0].name}')
kubectl create clusterrolebinding --clusterrole=cluster-admin --serviceaccount=default:tester tester-admin
kubectl get secret $SECRET_NAME -o jsonpath='{.data.token}' | base64 --decode > /home/vagrant/shared/token
kubectl get secret $SECRET_NAME -o jsonpath='{.data.ca\\.crt}' | base64 --decode > /home/vagrant/shared/k8s-ca.crt
```

## 11. Workerノードのクラスタ登録(Workerのみ)
上記で作成したスクリプを全Workerで実行。
`kubeadm join`が実行されて、自分自身がクラスタ環境に参加する。
```shell
sh /home/vagrant/shared/kubeadm_join_cmd.sh
```

## 12. 動作確認(ホストOS)
### vagrant up
未実行の場合は上記1−11を一気に実行して環境構築（4ノードだと20-30分くらいかかる）。
```shell
vagrant up
```
```
 'virtualbox' provider...
 ==> k8s-master1: Importing base box 'centos/7'...
 ==> k8s-master1: Matching MAC address for NAT networking...
 ==> k8s-master1: Checking if box 'centos/7' version '1902.01' is up to date...
 ==> k8s-master1: Setting the name of the VM: local-cluster_k8s-master1_1558249860137_67321
 ==> k8s-master1: Clearing any previously set network interfaces...
 ==> k8s-master1: Preparing network interfaces based on configuration...
  (中略)
     k8s-worker3: This node has joined the cluster:
     k8s-worker3: * Certificate signing request was sent to apiserver and a response was received.
     k8s-worker3: * The Kubelet was informed of the new secure connection details.
     k8s-worker3:
     k8s-worker3: Run 'kubectl get nodes' on the control-plane to see this node join the cluster.>
```

### kubeconfig設定

上記が成功していれば共有フォルダ(./shared)にkubeconfig用のAPIサーバの証明書(k8s-ca.crt)とトークン(token)が出力されるので、ローカルマシン(ホストOS側)でkubectlのセットアップを行う。

```shell
# Masterノード(APIサーバ)のIP
MASTER_IP=172.16.10.11

# kubeconfigのセットアップ。APIサーバのdefaultは6443ポートが開いている。マルチMasterの場合はLBを指定
kubectl config set-cluster local-k8s --server=https://${MASTER_IP}:6443 --certificate-authority=./shared/k8s-ca.crt
kubectl config set-credentials tester --token=$(cat ./shared/token)
kubectl config set-context local-k8s-tester --cluster=local-k8s --user=tester --namespace default

kubectl config use-context local-k8s-tester
```

### クラスタ状態確認

以下でクラスタが正常に構築されているかを確認
```shell
# Control plane
kubectl cluster-info
```
```
Kubernetes master is running at https://172.16.10.11:6443
KubeDNS is running at https://172.16.10.11:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
```

```shell
# Control Plane/Worker Nodes
kubectl get nodes -o wide
```
```
NAME          STATUS   ROLES    AGE   VERSION   INTERNAL-IP    EXTERNAL-IP   OS-IMAGE                KERNEL-VERSION              CONTAINER-RUNTIME
k8s-master1   Ready    master   35m   v1.14.2   172.16.10.11   <none>        CentOS Linux 7 (Core)   3.10.0-957.5.1.el7.x86_64   containerd://1.2.5
k8s-worker1   Ready    <none>   29m   v1.14.2   172.16.20.11   <none>        CentOS Linux 7 (Core)   3.10.0-957.5.1.el7.x86_64   containerd://1.2.5
k8s-worker2   Ready    <none>   24m   v1.14.2   172.16.20.12   <none>        CentOS Linux 7 (Core)   3.10.0-957.5.1.el7.x86_64   containerd://1.2.5
k8s-worker3   Ready    <none>   17m   v1.14.2   172.16.20.13   <none>        CentOS Linux 7 (Core)   3.10.0-957.5.1.el7.x86_64   containerd://1.2.5
=> Master1台(k8s-master1)、Worker3台(k8s-worker1...3)がReady
```

### サンプルPodデプロイ
nginxをデプロイしてみる。
```shell
# デプロイ
kubectl create deployment nginx --image=nginx
> deployment.apps/nginx created
code:bash
# 状態チェック
kubectl get deployment,replicaset,pod
```
```
NAME                          READY   UP-TO-DATE   AVAILABLE   AGE
deployment.extensions/nginx   1/1     1            1           62s

NAME                                     DESIRED   CURRENT   READY   AGE
replicaset.extensions/nginx-65f88748fd   1         1         1       62s

NAME                         READY   STATUS    RESTARTS   AGE
pod/nginx-65f88748fd-g8q24   1/1     Running   0          62s
```

```shell
# サービス(NodePort)作成. type=LoadBalancerはできない
kubectl create service nodeport nginx --tcp=8080:80
```
```
service/nginx created
```

```shell
# サービス公開ポート確認
kubectl get service
```
```
> NAME         TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)          AGE
> kubernetes   ClusterIP   10.96.0.1     <none>        443/TCP          18m
> nginx        NodePort    10.98.73.93   <none>        8080:30452/TCP   57s
```
```shell
# woker node(172.16.20.11,12,13)全てでnginxのwelcomeページにアクセスできることを確認する。
PORT=$(kubectl get svc -l app=nginx -o jsonpath='{.items[0].spec.ports[0].nodePort}')
curl 172.16.20.11:${PORT}
curl 172.16.20.12:${PORT}
curl 172.16.20.13:${PORT}
```

```
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>
<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>
<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```

## Cleanup

使い終わってもう要らなくなったらきれいにしましょう。ホストOS側で以下のコマンドを打ってば全部消えます。

```shell
vagrant destroy -f --prallel
```
