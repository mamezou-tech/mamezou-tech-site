---
title: Telepresence - EKSのワークロードをローカル環境でデバッグする
author: noboru-kudo
date: 2022-06-04
tags: ["k8s", "container", "AWS"]
---

クラウド環境で動作しているアプリケーションのデバッグはどうしていますか？
ローカル環境であれば、ローカルプロセスで起動したアプリに対してお気に入りのIDEで簡単にデバッグできますが、クラウド環境の場合はそうはいきません。
デバッグ用のコードを埋め込んでデプロイして、原因が分かったらコードを修正して、再びデプロイして。。。というトライ&エラーを繰り返していくことが多いのではないでしょうか？
パイプラインで自動化されていると言っても、この作業にはかなりの時間がかかりますし、無駄なコミットが発生したり良いことはありません。

ここでは[Telepresence](https://www.telepresence.io/)というツールを利用して、このストレスを解消するやり方を紹介したいと思います。
TelepresenceはAPI Gatewayの[Ambassador](https://www.getambassador.io/)でお馴染みのAmbassador Labs(旧Datawire)社が提供しているKubernetes向けのデバッグツールです[^1]。
有償版もありますが、ここではOSSバージョンを利用します。
以下は公式ドキュメントに記載されているTelepresenceのアーキテクチャです。

[^1]: 現在CNCFのサンドボックスプロジェクトとしてホスティングされています。

![telepresence architecture](https://i.gyazo.com/70c8b6146cbcc4080487fa152676361e.png)
引用元: <https://www.telepresence.io/docs/latest/reference/architecture/>

このようにTelepresenceは、Kubernetesクラスタ内を流れるトラフィックをインターセプトして、ローカル環境で動作するアプリに流してくれます。

開発者は任意のデバッガでアプリ動作を追跡できますし、アドホックな修正がうまく機能するかを確かめることもできます。
Telepresenceはまるでローカル環境とクラウド環境が一体化したような開発体験を提供します。

なお、ここではOSSバージョンを使用するため、上記のAmbassador Cloud Appへの接続は行いません。

今回は[AWS EKS](https://aws.amazon.com/eks/)で動作するアプリを対象にデバッグを試します。

:::stop
Telepresenceは実際のクラスタ内に流れるトラフィックを使用しますので、非商用環境での利用に限定してください。
:::

[[TOC]]

## デバッグ対象アプリケーションを準備する

Kubernetesチュートリアルで使用したサンプルアプリを事前にEKS環境へデプロイしておきました。

- [Kubernetesチュートリアル - アプリケーション開発編](/container/#アプリケーション開発編)

これはWeb UIからEKS環境のコンテナ経由でDynamoDBにアクセスするシンプルなタスク管理ツールです。

## Telepresence CLIをインストールする

TelepresenceのCLIをインストールします。
以下はMacOS(Intel)の場合です。それ以外の環境は[公式ドキュメント](https://www.telepresence.io/docs/latest/install/)を参照してください。

```shell
brew install datawire/blackbird/telepresence
```

MacOSの場合は別途sshfsのセットアップが必要でした。以下でインストールします[^2]。

[^2]: <https://www.telepresence.io/docs/latest/troubleshooting/#volume-mounts-are-not-working-on-macos>

```shell
brew install --cask macfuse
brew install gromgit/fuse/sshfs-mac
```

## Traffic Manager/Daemonをインストールする

Telepresenceの動作に必要なTraffic ManagerとDaemonをセットアップします。
これらはそれぞれクラスタ環境、ローカル環境に配置され、両環境の通信を担います。

まずはkubectlがEKSに対して接続するよう構成しておきます。

```shell
# nameはEKSクラスタ名を設定します
aws eks update-kubeconfig --name mz-k8s
```

次にTelepresence CLIで以下を実行します[^3]。

[^3]: `telepresence list`や`telepresence intercept`でもインストールされるようです。

```shell
telepresence connect
```
```
Launching Telepresence Root Daemon
Need root privileges to run: /usr/local/bin/telepresence daemon-foreground /Users/noboru-kudo/Library/Logs/telepresence '/Users/noboru-kudo/Library/Application Support/telepresence'
Launching Telepresence User Daemon
Connected to context arn:aws:eks:ap-northeast-1:xxxxxxxxxxxx:cluster/mz-k8s (https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.yl4.ap-northeast-1.eks.amazonaws.com)
```

これでローカル環境にDaemon、EKSクラスタ環境にTraffic Managerがインストールされます[^4]。

[^4]: ローカル環境のDaemonの実行には管理者権限が必要です。

- ローカル環境(Daemon)

```shell
ps aux | grep telepresence | grep -v grep
```
```
noboru-kudo      12057   0.0  0.3 35014148  92516 s001  S     2:32PM   0:01.82 /usr/local/bin/telepresence connector-foreground
root             12055   0.0  0.1 34939608  26512 s001  S     2:32PM   0:00.31 /usr/local/bin/telepresence daemon-foreground /Users/noboru-kudo/Library/Logs/telepresence /Users/noboru-kudo/Library/Application Support/telepresence
root             12054   0.0  0.0 34265208   4660 s001  S     2:32PM   0:00.01 sudo --non-interactive /usr/local/bin/telepresence daemon-foreground /Users/noboru-kudo/Library/Logs/telepresence /Users/noboru-kudo/Library/Application Support/telepresence
```

- EKSクラスタ環境(Traffic Manager)

```shell
kubectl get pod -n ambassador
```
```
NAME                               READY   STATUS    RESTARTS   AGE
traffic-manager-758658ccc5-lzftn   1/1     Running   0          99s
```

この状態になると、ローカル環境がEKSクラスタ内に同化されているように見えます。
例えば、アプリのヘルスチェックエンドポイントには、以下のようにクラスタ内ドメインでアクセスできます。

```shell
# ローカル環境(prod-task-service経由でアクセス)
curl prod-task-service.prod:3000/health/readiness
```

通常、ClusterIPタイプのServiceはクラスタ外からアクセスできませんが、TelepresenceのTraffic ManagerとDaemonの協調動作によりこれが実現できています。

## トラフィックをインターセプトする

次に、実際のクラスタに流れるトラフィックをインターセプトします。

まずは、インターセプト可能な対象を表示してみます。

```shell
telepresence list
```

```
prod-task-service: ready to intercept (traffic-agent not yet installed)
prod-task-web    : ready to intercept (traffic-agent not yet installed)
```

2つのサービスが表示されました。出力結果を見れば分かるように、まだTraffic Agentがインストールされていない状態です。

今回はNode.js(TypeScript)+Expressで動いている`prod-task-service`のトラフィックをインターセプトします。
以下のコマンドを実行します。

```shell
telepresence intercept prod-task-service --port 3000:3000 -- /bin/bash
```

```
Using Deployment prod-task-service
intercepted
    Intercept name    : prod-task-service
    State             : ACTIVE
    Workload kind     : Deployment
    Destination       : 127.0.0.1:3000
    Volume Mount Point: /var/folders/wy/jgyz8l1s3lzdx4y0vp2xh_800000gn/T/telfs-4155048336
    Intercepting      : all TCP connections
```
これで以下のような状態となり、トラフィックのインターセプトとローカル環境への転送が開始されます。

- 全てのトラフィックをローカルの3000番ポートに転送
- コンテナにマウントされているボリュームをローカルにマウント(`Volume Mount Point`)
- コンテナの環境変数をローカルに取り込んだ状態でBashを起動(サブシェル)

内部的には、対象のPodへサイドカーコンテナ(`telepresence-agents`)としてTraffic Agentが配置されます。クラスタトラフィックはこれを通してローカルへ転送されるようになっています。
まだローカルプロセスは実行していませんが、以下のようなイメージです。

![intercept summary](https://i.gyazo.com/5db91bc00755248442e3f057490a8829.png)

内部的にはServiceリソースのEndpointを実コンテナではなく、サイドカーコンテナのTraffic Agentの方に向けるように書き換えているようでした。

## IRSAセッショントークンのパス(環境変数)を修正する

`telepresence intercept`で作成されたサブシェルでは、コンテナの環境変数を取り込んだ状態になりますが、ローカルで実行にはこれだけでは不十分です。
サンプルアプリはAWSリソースのDynamoDBにアクセスできる必要があります。
ローカル環境にセットアップしたAWS認証設定で、DynamoDBへの接続が可能であれば良いですが、通常はそうでないことが多いかと思います。
このような状態ではローカル環境からDynamoDBへの接続でエラーが発生します。

今回、EKSのPodは、[IRSA(IAM Role for ServiceAccount)](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)を利用して、DynamoDBに接続しています。

IRSAを利用すると、EKSはPodにセッショントークンファイルをマウントし、そのパスを環境変数`AWS_WEB_IDENTITY_TOKEN_FILE`に設定しています。
AWS SDKでは、このセッショントークンを使用してDynamoDB等の各種AWSリソースへのアクセスを実現します。
ローカル環境では、ディレクトリ構成が異なりますので、このトークン参照先をマウント先に変更してあげる必要があります。

Telepresenceでは、Pod内のコンテナにマウントされたVolumeをローカル環境にもマウントしています。
先程`telepresence intercept`コマンドを実行したときに出力されていた`Volume Mount Point`がマウントポイントです。
このパスはインターセプト時に環境変数(`TELEPRESENCE_ROOT`)にも設定されます。

例えば、Podの`/var/run/secrets`にマウントされるトークンは以下のように確認できます。

```shell
# telepresence interceptしたターミナルで実行(サブシェル)
ls -l ${TELEPRESENCE_ROOT}/var/run/secrets
```
```
total 16
drwxr-xr-x  1 noboru-kudo  staff  28 Jun  4 17:31 eks.amazonaws.com
drwxr-xr-x  1 noboru-kudo  staff  28 Jun  4 17:31 kubernetes.io
```

`eks.amazonaws.com`にIRSAが格納されているトークンファイルが配置されます。
インターセプトによって取り込まれたAWS環境変数(`AWS_WEB_IDENTITY_TOKEN_FILE`)で、こちらを参照するように変更します。

```shell
export AWS_WEB_IDENTITY_TOKEN_FILE=${TELEPRESENCE_ROOT}${AWS_WEB_IDENTITY_TOKEN_FILE}
# 内容確認
cat ${AWS_WEB_IDENTITY_TOKEN_FILE}
```

:::info
これはマウントしたファイルを参照する例です。
これ以外にもコンテナでVolumeとしてマウントしている場所をローカルから参照している場合は、ローカルのマウントポイント(環境変数`TELEPRESENCE_ROOT`)配下に変更する必要があります。
:::

:::info
ローカル環境のAWS CLIで`default`プロファイルを使用している場合は、そちらが優先されてしまいますので、一旦外しておく必要がありました(`$HOME/.aws/credentials`)。
また、それ以外にローカル環境でAWSアクセスキー等を環境変数を設定している場合も、そちらが使用されないようにクリアしておいた方が良いかと思います。
未検証ですが、ローカル環境と分離可能なDockerコンテナでデバッグするという方式もありますので、このような設定が面倒な場合はコンテナを利用した方が良いかもしれません。

- [Telepresence for Docker](https://www.telepresence.io/docs/latest/extension/intro/)
:::

## 本物のトラフィックでローカルデバッグをする

これで準備が整いました。
後は`telepresence intercept`したターミナル(サブシェル)上でアプリをローカル起動するだけです。

```shell
# アプリコードが格納されているディレクトリに移動
cd app/apis/task-service
# デバッグポートを開いてアプリをローカル実行
node --inspect --require ts-node/register ./src/index.ts
```

今回はIDEのデバッガを利用するために、Node.jsのデバッグモード(`--inspect`)で起動しています。
この状態でEKS上にデプロイしたアプリケーションを操作すると、このローカルアプリにトラフィックが流れてきます。
このため、IDEのデバッガでローカルプロセスのデバッグポートにアタッチすれば、自由自在にクラスタ内のトラフィックをデバッグできます。

以下はIntellij IDEAのNode.jsデバッガーでデバッグする様子です。

![Intellij IDEA Node.js Debugger](https://i.gyazo.com/f416b4dafec5ef96d5a1f949b93420b1.png)

通常はローカル環境だと外部サービスはモックを使うことが多いかと思いますが、ここでは本物のリソースにアクセスしていますので、はるかに効率的にデバッグできます。 
また、ローカルプロセスですので、ローカルでソースコードを変更した場合は、コンテナビルドする必要はなく、すぐに実際のトラフィックを通して修正内容が正しいかを確認できます。

## クリーンアップ

以下のコマンドを実行するとTraffic Managerやローカル環境のDaemon、サイドカーコンテナ(Traffic Agent)をまとめて削除してくれます。

```shell
telepresence uninstall --everything
```

参考ですが、インターセプトのみを中断したい場合は、以下を実行します。

```shell
telepresence leave prod-task-service
```

Podを再起動した場合は、こちらを実行して再度インターセプトする必要がありました。

## まとめ

Telepresenceを導入すれば、実際のトラフィックでソースコードレベルのデバッグが簡単にできます。
デプロイ自動化が進んだとはいえ、特にクラウド環境では実際に動かしてみないと分からないことも多いです。
Telepresenceはまさにそのようなケースで絶大な力を発揮するツールだと思います。

---
参照資料

- [Telepresence公式ドキュメント](https://www.telepresence.io/docs/latest/quick-start/)