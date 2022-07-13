---
title: Secrets Store CSI DriverでKubernetesのシークレット情報を管理する
author: noboru-kudo
date: 2022-07-13
tags: ["AWS", "Security", "k8s", "container"]
templateEngineOverride: md
---

以前に以下の記事で、Kubernetes上のアプリケーションのシークレット情報を暗号化してGit管理する方法をご紹介しました。

- [SealedSecretsでKubernetesコンテナのシークレット情報をGit管理する](/blogs/2022/06/05/introduce-sealedsecrets/)

ここでは、KubernetesのSecretオブジェクトを暗号化されたSealedSecretオブジェクトに変換することで、シークレット情報を安全にGit管理しました。
ただし、より厳格な組織だと、専用の暗号化ストレージにシークレット情報を完全に分離する必要があったりします。

今回はそのようなケースに対応する[Secrets Store CSI Driver](https://secrets-store-csi-driver.sigs.k8s.io/)を使ったやり方を試してみます。
Secrets Store CSI Driverはその名の通りCSI(Container Storage Interface)というコンテナストレージの標準インターフェースに沿ったストレージソリューションを提供するものですが、Secretオブジェクトとの同期についても対応しています[^1]。
対象とするストレージサービスもAWS/Azure/GCP/Vaultと主要なサービス・製品をサポートしています。

[^1]: Secretオブジェクト同期はオプション扱いで、[公式ドキュメント](https://secrets-store-csi-driver.sigs.k8s.io/topics/best-practices.html)によると必要でない場合は、無効にすることを推奨しています。

ここではKubernetes環境として、AWS上に構築したEKS環境を対象とします。
また、シークレット情報の格納にはAWSが提供するマネージドサービスの[AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)と[AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)を利用します。

[[TOC]]

## Secrets Store CSI DriverとAWS Providerをインストールする

公開されている[Helmチャート](https://github.com/kubernetes-sigs/secrets-store-csi-driver/tree/main/charts/secrets-store-csi-driver)よりSecrets Store CSI Driverをインストールします。

Helmチャートのレポジトリを追加します。

```shell
helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
helm repo update
```

helmコマンドでインストールします。現時点で最新の1.2.1のHelmチャートを指定しました。

```shell
helm upgrade --install secrets-store-csi-driver secrets-store-csi-driver/secrets-store-csi-driver \
  --namespace kube-system \
  --version 1.2.1 \
  --set syncSecret.enabled=true \
  --set enableSecretRotation=true \
  --wait
```

KubernetesのSecretオブジェクトへの同期(`syncSecret.enabled=true`)とシークレット情報変更時のローテーション(`enableSecretRotation=true`)[^2]を有効化しています。

[^2]: ローテーション機能は現状アルファバージョンです。詳細は[公式ドキュメント](https://secrets-store-csi-driver.sigs.k8s.io/topics/secret-auto-rotation.html)を参照しくてださい。

インストールしたもの確認しておきます。
Secrets Store CSI DriverはDaemonSetとしてデプロイされます。

```shell
kubectl get ds,pod -n kube-system -l app.kubernetes.io/name=secrets-store-csi-driver
```
```
NAME                                      DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR            AGE
daemonset.apps/secrets-store-csi-driver   2         2         2       2            2           kubernetes.io/os=linux   2m3s

NAME                                 READY   STATUS    RESTARTS   AGE
pod/secrets-store-csi-driver-5vkqg   3/3     Running   0          2m3s
pod/secrets-store-csi-driver-zfd4h   3/3     Running   0          2m3s
```

今回は2Nodeを用意しているため、2つのPodが起動しています。

これに加えて、Secrets ManagerとParameter Storeに対応する[AWS Provider](https://github.com/aws/secrets-store-csi-driver-provider-aws)を合わせてセットアップします。

```shell
kubectl apply -f https://raw.githubusercontent.com/aws/secrets-store-csi-driver-provider-aws/main/deployment/aws-provider-installer.yaml
```

こちらも内容確認します。

```shell
kubectl get ds,pod -n kube-system -l app=csi-secrets-store-provider-aws
```

```
NAME                                            DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR            AGE
daemonset.apps/csi-secrets-store-provider-aws   2         2         2       2            2           kubernetes.io/os=linux   2m38s

NAME                                       READY   STATUS    RESTARTS   AGE
pod/csi-secrets-store-provider-aws-ckbl9   1/1     Running   0          2m39s
pod/csi-secrets-store-provider-aws-wpdxm   1/1     Running   0          2m39s
```

AWS Providerの方もDaemonSetとして実行されます。

## AWS Secrets Managerのシークレット情報をマウントする

ここでは、以下のコマンドでSecrets Managerにシークレット情報を作成しました。

```shell
aws secretsmanager create-secret \
  --name MyDBSecret --secret-string '{"username":"mamezou-tech", "password":"my-super-secret-password"}'
```

マネジメントメントコンソールからも確認できます。

![secrets manager](https://i.gyazo.com/0b835f44c3ddadff17ddc55a8ba901b8.png)

このシークレット情報をPodにマウントして、参照できるようにします。
まずは、PodがこのSecrets Managerのシークレット情報にアクセスできるように、IRSA(IAM Role for ServiceAccount)を設定します。
以下のIAMポリシーファイルを準備します。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:ap-northeast-1:xxxxxxxxxxxx:secret:MyDBSecret-*"
      ]
    }
  ]
}
```

Resourceの部分は、実際のシークレットのARNに置き換えてください。
このポリシーを適用したIAMロールを事前に作成します。
今回はTerraformを使いますが、マネジメントコンソール/AWS CLI、eksctl/CloudFormation何でも構いません。

```hcl
# IAMポリシー
resource "aws_iam_policy" "secrets_manager_mydbsecret_readonly" {
  name   = "SecretsManagerMyDBSecretReadOnly"
  policy = file("${path.module}/secrets-manager-policy.json")
}
# IAMロール
module "sample_app_secrets_manager" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                       = "~> 4.0"
  create_role                   = true
  role_name                     = "MySampleAppSecretsManager"
  provider_url                  = replace(module.eks.cluster_oidc_issuer_url, "https://", "")
  role_policy_arns              = [aws_iam_policy.secrets_manager_mydbsecret_readonly.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:default:sample-app-secrets-manager"]
}
# Kubernetes ServiceAccountオブジェクト
resource "kubernetes_service_account" "sample_app_secrets_manager_access" {
  metadata {
    name        = "sample-app-secrets-manager"
    namespace   = "default"
    annotations = {
      "eks.amazonaws.com/role-arn" = module.sample_app_secrets_manager.iam_role_arn
    }
  }
}
```

`terraform apply`を実行して、AWS環境にIAMポリシー・IAMロール、Kubernetes ServiceAccountを作成しておきます。

:::info
eksctlやTerraformでのIRSAセットアップの詳細はKubernetesチュートリアル連載で説明しています。
必要に応じて以下の記事を参照してください。

- [IAMアクセス許可の設定](/containers/k8s/tutorial/ingress/ingress-aws/#iamアクセス許可の設定)
:::

Secrets Store CSI Driver側でSecrets Managerのリソースを取得するようにカスタムリソースSecretProviderClassを作成します。
以下のマニフェストファイル(ここでは`my-db-secret.yaml`)を用意しました。

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: my-db-secret
  namespace: default
spec:
  provider: aws
  parameters:
    objects: |
      - objectName: "MyDBSecret"
        objectType: "secretsmanager"
```

今回はAWS環境が対象なので、providerには`aws`を指定します。

また、objects配下にSecrets ManagerのMyDBSecretを参照するように設定します。この辺りはどのproviderを使うかによって内容は変わってきます。
サポートしているプロバイダーの詳細は以下公式ドキュメントより確認してください。

- [Secrets Store CSI Driver - Supported Provider](https://secrets-store-csi-driver.sigs.k8s.io/introduction.html#supported-providers)

なお、このカスタムリソースはNamespaceスコープです。トラブルにならないようnamespaceは指定しておいた方が良さそうです。

これを予め反映しておきます。

```shell
kubectl apply -f my-db-secret.yaml
```

確認用に以下のPodを用意して確認します(ここでは`sample-app.yaml`としました)。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-app
  namespace: default
spec:
  # 先程作成したSecretsManagerのシークレットアクセス可能なIAMロールが指定されたServiceAccount
  serviceAccountName: sample-app-secrets-manager
  containers:
    - name: sample-app
      image: alpine:latest
      command: ["sh", "-c", "sleep 3600"]
      # コンテナにマウント
      volumeMounts:
        - name: my-db-secret
          mountPath: /mnt/secrets-store
          readOnly: true
  volumes:
    # CSIストレージ指定
    - name: my-db-secret
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes:
          secretProviderClass: my-db-secret
```

`spec.volumes`配下に、CSIボリュームとして先程作成したSecretProviderClassを指定します。
コンテナへのマウントは通常のボリュームマウントと同じです。
また、ServiceAccountには、Terraformで作成したSecrets Managerへのアクセス許可が指定されているServiceAccountを利用します。

これをデプロイします。

```shell
kubectl apply -f sample-app.yaml
```

ボリュームマウント状態は、SecretProviderClassPodStatusリソースより確認できます。

```shell
# オブジェクト名: <pod name>-<namespace>-<secretproviderclass name>
kubectl describe secretproviderclasspodstatus sample-app-default-my-db-secret
```

以下抜粋です。

```
Name:         sample-app-default-my-db-secret
Namespace:    default
API Version:  secrets-store.csi.x-k8s.io/v1
Kind:         SecretProviderClassPodStatus
Metadata:
  # (省略)
Status:
  Mounted:  true
  Objects:
    Id:                        MyDBSecret
    Version:                   ab91bc81-5ff3-4f64-b191-61df8e26f644
  Pod Name:                    sample-app
  Secret Provider Class Name:  my-db-secret
  Target Path:                 /var/lib/kubelet/pods/1e594aa7-51a1-4db2-95a7-7fc5b98f4dcf/volumes/kubernetes.io~csi/my-db-secret/mount
```

Statusを見ると`Mounted: true`となっており、Podへのマウントに成功していることが分かります。

実際にSecrets Managerのシークレット情報がマウントされているかを確認します。

```shell
kubectl exec sample-app -- cat  mnt/secrets-store/MyDBSecret; echo

> {"username":"mamezou-tech", "password":"my-super-secret-password"}
```

Pod内のコンテナから、Secrets Managerのシークレット情報が確認できます。

なお、このシークレット情報はインメモリの一時ファイルシステム(tmpfs)としてNodeに書き込まれ、物理ディスクへの書き込みが行われないよう配慮されています。

## AWS Systems Manager Parameter Storeのシークレット情報をマウントする

次に、AWS Systems Manager Parameter Store(以下パラメータストア)の方も確認してみます。

今回もAWS CLIを使って作成しますが、マネジメントコンソールでも構いません。

```shell
aws ssm put-parameter --name "/sample-app/db/username" \
  --value "mamezou-tech" --type String
aws ssm put-parameter --name "/sample-app/db/password" \
  --value "my-super-secret-password" --type SecureString
```

ユーザー名は通常の文字列ですが、パスワードは`SecureString`として暗号化しました。
マネジメントコンソール上は以下のようになります。

![ssm](https://i.gyazo.com/86a096e7cf443a0481acf61735e332aa.png)

今回はこのシークレット情報をPodにマウントして、参照できるようにします。
Secrets Manager同様に、Podがパラメータストアにアクセスできるように、IAMポリシーファイルを準備します。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameters"
      ],
      "Resource": [
        "arn:aws:ssm:ap-northeast-1:xxxxxxxxxxxx:parameter/sample-app/db/*"
      ]
    }
  ]
}
```

Resourceの部分は、実際のパラメータストアのARNに置き換えてください。
このポリシーを適用したIAMロールを事前に作成します。
Terraformだと以下のようになります。

```hcl
# IAMポリシー
resource "aws_iam_policy" "parameter_store_mydbsecret_readonly" {
  name   = "ParameterStoreMyDBSecretReadOnly"
  policy = file("${path.module}/parameter-store-policy.json")
}
# IAMロール
module "sample_app_parameter_store" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                       = "~> 4.0"
  create_role                   = true
  role_name                     = "MySampleAppParameterStore"
  provider_url                  = replace(module.eks.cluster_oidc_issuer_url, "https://", "")
  role_policy_arns              = [aws_iam_policy.parameter_store_mydbsecret_readonly.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:default:sample-app-parameter-store"]
}
# Kubernetes ServiceAccountオブジェクト
resource "kubernetes_service_account" "sample_app_parameter_store_access" {
  metadata {
    name        = "sample-app-parameter-store"
    namespace   = "default"
    annotations = {
      "eks.amazonaws.com/role-arn" = module.sample_app_parameter_store.iam_role_arn
    }
  }
}
```

ここでも`terraform apply`を実行して、IAMポリシー・IAMロール、Kubernetes ServiceAccountを作成しました。

次に、Secrets Store CSI DriverのSecretProviderClass(`my-db-secret.yaml`)を修正します。

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: my-db-secret
  namespace: default
spec:
  provider: aws
  parameters:
    objects: |
      - objectName: "/sample-app/db/username"
        objectType: "ssmparameter"
      - objectName: "/sample-app/db/password"
        objectType: "ssmparameter"
```

objects配下を、先程追加したパラメータストアの内容に変更しました。
これを反映しておきます。

```shell
kubectl apply -f my-db-secret.yaml
```

確認用のPodは`spec.serviceAccountName`をTerraformで作成したServiceAccountの`sample-app-parameter-store`に変更するだけですので省略します。
変更後はPodに更新を反映しておきます。

```shell
# serviceAccountNameは変更不可のため一旦削除
kubectl delete pod sample-app
# 新規作成
kubectl apply -f sample-app.yaml
```

実際にパラメータストアのシークレット情報がマウントされているかを確認します。

```shell
kubectl exec sample-app -it -- sh
# 以下コンテナ上
ls -l /mnt/secrets-store/
> -rw-r--r--    1 root     root            24 Jul 13 05:07 _sample-app_db_password
> -rw-r--r--    1 root     root            12 Jul 13 05:07 _sample-app_db_username
cat /mnt/secrets-store/_sample-app_db_username; echo
> mamezou-tech
cat /mnt/secrets-store/_sample-app_db_password; echo
> my-super-secret-password
```

パスセパレータとして指定した`/`が`_`に変換されていて分かりにくいですが、シークレット情報を格納したファイルがそれぞれ作成されているのが確認できます。

## シークレット情報をSecretオブジェクトに同期する

これまで、ボリュームとしてシークレット情報をマウントしましたが、KubernetesのSecretオブジェクトとして参照しなければならないケースも多いかと思います。
最後に、パラメータストアに格納された情報でSecrets Store CSI DriverのSecret同期を確認してみます。

- [Sync as Kubernetes Secret](https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret.html)

SecretProviderClassを以下のように修正します。

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: my-db-secret
  namespace: default
spec:
  provider: aws
  # 以下を追加
  secretObjects:
    - secretName: my-db-secret
      type: Opaque
      data:
        - key: username
          objectName: _sample-app_db_username
        - key: password
          objectName: _sample-app_db_password
  parameters:
    objects: |
      - objectName: "/sample-app/db/username"
        objectType: "ssmparameter"
      - objectName: "/sample-app/db/password"
        objectType: "ssmparameter"
```

`spec.secretObjects`を追加しています。
ここでSecretオブジェクトの名前(`my-db-secret`)やSecretオブジェクトに含めるデータを指定します。
注意点として、`objectName`にはボリュームとしてマウントされたファイル名と一致している必要があります。
先程見たようにパスセパレータの`/`は`_`に変換されますので、それに合わせて名前を指定します。

既にCSIボリュームでマウントしていますので、実用的な例ではありませんが、ここではSecretオブジェクト自体をボリュームとしてPodにマウントしてみます。
Podのマニフェストは以下のようになります。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sample-app
  namespace: default
spec:
  # sample-app-secrets-managerから変更
  serviceAccountName: sample-app-parameter-store
  containers:
    - name: sample-app
      image: alpine:latest
      command: ["sh", "-c", "sleep 3600"]
      # コンテナにマウント
      volumeMounts:
        - name: my-db-secret
          mountPath: /mnt/secrets-store
          readOnly: true
        # k8s Secretオブジェクトからマウント
        - name: my-db-secret-2
          mountPath: /k8s-secret
          readOnly: true
  volumes:
    # CSIストレージ指定
    - name: my-db-secret
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes:
          secretProviderClass: my-db-secret
    # SecretオブジェクトのVolume定義
    - name: my-db-secret-2
      secret:
        secretName: my-db-secret
```

ボリューム(`my-db-secret-2`)で、Secretオブジェクト(`my-db-secret`)を参照しています。
そして、コンテナの`/k8s-secret`にそのボリュームをマウントします。
Secretオブジェクト自体(`my-db-secret`)はSecrets Store CSI Driverで作成するため、ここでは不要です。

注意点として、元からあったCSIボリュームのマウントはここでも必要です。
Secrets Store CSI DriverはマウントされたCSIボリュームからSecretオブジェクトを作成するようです。
誤って削除しないように注意が必要そうです。

これを適用します。

```shell
# ボリューム再定義のため一旦削除
kubectl delete pod sample-app
# 新規作成
kubectl apply -f sample-app.yaml
```

Podが実行されたら、Secretを確認してみます。

```shell
kubectl describe secret my-db-secret
```
```
Name:         my-db-secret
Namespace:    default
Labels:       secrets-store.csi.k8s.io/managed=true
Annotations:  <none>

Type:  Opaque

Data
====
password:  24 bytes
username:  12 bytes
```

Secretオブジェクトが作成され、そのデータとして、username/passwordが定義されました。
Podの方にマウントされたSecretボリュームの中身も確認します。

```shell
kubectl exec sample-app -it -- sh
# 以下コンテナ上
ls -l /k8s-secret
> lrwxrwxrwx    1 root     root            15 Jul 13 06:10 password -> ..data/password
> lrwxrwxrwx    1 root     root            15 Jul 13 06:10 username -> ..data/username
cat /k8s-secret/username; echo
> mamezou-tech
cat /k8s-secret/password; echo
> my-super-secret-password
```

この辺りの使い方はSecrets Store CSI Driver固有のものではなく、通常のSecretオブジェクトをマウントした場合と同様です。

この例は実用的でありませんが、以下のようなケースで効果を発揮すると思います。

- アプリが環境変数としてシークレット情報を参照する必要がある
- 利用するツールでSecretオブジェクト作成を要求している

なお、ここで作成されたSecretオブジェクトは、参照しているPodの削除とともに削除されます。

## クリーンアップ

ここで利用したリソースは以下で削除します(EKS自体やVPC等は含みません)。

```shell
# サンプルアプリ
kubectl delete pod sample-app

# Secrets Store CSI Driver
kubectl delete -f my-db-secret.yaml
kubectl delete -f https://raw.githubusercontent.com/aws/secrets-store-csi-driver-provider-aws/main/deployment/aws-provider-installer.yaml
helm uninstall secrets-store-csi-driver -n kube-system

# Secrets Manager/SSM Parameter Store
aws secretsmanager delete-secret --secret-id MyDBSecret
aws ssm delete-parameter --name "/sample-app/db/username"
aws ssm delete-parameter --name "/sample-app/db/password"
```

## まとめ

Secretの扱い方には若干トリッキーな感がありますが、AWSのマネージドサービスで厳格に管理されているシークレット情報をPodから容易にアクセスできました。
Secret Store CSI DriverはKubernetesコミュニティで開発されているものです。
シークレット情報の専用ストレージへの保管が義務付けられる環境で、利用を検討する価値はありそうです。

---
関連記事

- [SealedSecretsでKubernetesコンテナのシークレット情報をGit管理する](/blogs/2022/06/05/introduce-sealedsecrets/)

---
参考資料

- [Secrets Store CSI Driver ドキュメント](https://secrets-store-csi-driver.sigs.k8s.io/introduction.html)
- [AWS Secrets Manager ドキュメント](https://aws.amazon.com/secrets-manager/)
- [AWS Systems Manager Parameter Store ドキュメント](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [Secrets Store CSI Driver - AWS Provider レポジトリ](https://github.com/aws/secrets-store-csi-driver-provider-aws)
