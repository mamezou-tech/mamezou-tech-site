---
title: SealedSecretsでKubernetesコンテナのシークレット情報をGit管理する
author: noboru-kudo
date: 2022-06-05
tags: ["k8s", "container"]
---

GitOpsが普及し、アプリケーションのソースコードだけでなく、インフラを含めた全ての構成情報をGitで管理して、ランタイム環境と同期を取ることが一般的になってきました。
そんなときに常に悩みの種となるのはシークレット情報です。
一般的にプロジェクトの資材にはデータベースのパスワードやAPIトークン、各種証明書等、Git管理に適さないものを含みます。
このようなシークレット情報はGitではなく、[Vault](https://www.vaultproject.io/)や[AWS Secrets Manager](https://aws.amazon.com/jp/secrets-manager/)等、これに特化したプロダクトやサービスを別途利用することが多いかと思います。

Kubernetesにフォーカスすると、このような情報はSecretリソースで管理するのが一般的です。通常Secretリソース自体はRBACでアクセス制限されますが、そのマニフェストの管理方法には同じ課題があります。
SecretリソースはGitで管理できない(してはいけない)ので、このリソースだけは事前に別途手動で作成する等の工夫が必要です。

今回これを解消するツールとして[SealedSecrets](https://github.com/bitnami-labs/sealed-secrets/tree/main/helm/sealed-secrets)を紹介します。
SealedSecretsは外部プロダクト・サービスに依存することなく、KubernetesのSecretリソースを暗号化します。
SealedSecretsを導入した運用イメージは以下のようになります。

![](https://i.gyazo.com/57a806bf612d7798bc4fc0977e7ba4d3.png)

このようにSealedSecretsは、CLIツールを利用してSecretリソースを暗号化したSealedSecretというカスタムリソースに変換します。
このSealedSecretリソースはクラスタにデプロイすると、SealedSecretsコントローラーによって復号化され、通常のSecretリソースとして利用可能になります。
SealedSecretリソースのマニフェストファイルは安全にGitで管理可能で、他の資材同様にバージョン管理システムの恩恵を受けることができます。

:::column:外部プロダクト・サービスと連携するツール
SealedSecrets以外にも、Vault等の専用プロダクトやクラウドプロバイダのマネージドサービスと連携するツールがあります。

- [External Secrets Operator](https://external-secrets.io/)
- [Kubernetes Secrets Store CSI Driver](https://secrets-store-csi-driver.sigs.k8s.io/introduction.html)

特にKubernetes Secrets Store CSI Driverは、Kubernetesコミュニティで開発されているもので、今後はこちらの人気が高まりそうです。
より厳格にシークレット管理をしたい場合は、このようなツール導入を検討するのが良いと思います。
:::

[[TOC]]

## SealedSecrets CLI(kubeseal)をインストールする

まずは、SealedSecretsのCLIツールkubesealをインストールします。

```shell
# MacOS
brew install kubeseal
kubeseal --version
# kubeseal version: v0.18.0
```

Windows/Linuxの場合は、[こちら](https://github.com/bitnami-labs/sealed-secrets/releases)からバイナリファイルを取得できます。

## SealedSecretsコントローラーをインストールする

次にKubernetesクラスター側にSealedSecretsコントローラーをインストールします。
今回はMinikubeで試していますが、他のKubernetes環境も同様のはずです。

インストールには[Helmチャート](https://github.com/bitnami-labs/sealed-secrets/tree/main/helm/sealed-secrets)を利用します。
Helmチャートのレポジトリを追加します。

```shell
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm repo update
```

以下でインストールします。現時点で最新の`2.2.0`のHelmチャートを使用しました。

```shell
helm upgrade --install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace sealed-secrets --create-namespace \
  --version 2.2.0 \
  --wait
```

特にパラメータを指定せずに、デフォルトの状態でセットアップしました。
インストールされたものを確認します。

```shell
kubectl get pod -n sealed-secrets
```
```
NAME                              READY   STATUS    RESTARTS   AGE
sealed-secrets-7765f5c487-q58xt   1/1     Running   0          25s
```

これがSealedSecretsのコントローラーになります。
このコントローラーは、暗号化・復号化鍵の更新やカスタムリソース（SealedSecret）の復号化処理を行います。
そのカスタムリソースの方も確認します。

```shell
kubectl get crd
```
```
NAME                        CREATED AT
sealedsecrets.bitnami.com   2022-06-05T05:20:29Z
```

これがコントローラーで監視するカスタムリソースです。

暗号化・復号化を行う鍵(sealing key)はSecretリソースに格納されています。
こちらも確認してみます。

```shell
kubectl get secret -n sealed-secrets -l sealedsecrets.bitnami.com/sealed-secrets-key
```
```
NAME                      TYPE                DATA   AGE
sealed-secrets-keynvvvv   kubernetes.io/tls   2      4m54s
```

この中には公開鍵(tls.crt)、秘密鍵(tls.key)が格納されていています。
また、このSecretはユニークなサフィックスが付けられていて複数世代管理できるようになっています。
これにより、この鍵が更新されても古いバージョンのSealedSecretが引き続き復号化できるようになっています。

## Secretを暗号化する(SealedSecret作成)

これで準備ができましたので、実際にSecretリソースを暗号化してみます。
まず、Secretリソースを用意します。

```shell
kubectl create secret generic test-secret -n default --dry-run=client \
  --from-literal password=special-secret -o yaml > test-secret.yaml
```

kubectlのクライアントサイドのDryRunを利用して、実際のクラスタではなくマニフェストファイルのみを作成しています。
作成したファイル(`test-secret`)は以下のようになります。

```yaml
apiVersion: v1
data:
  password: c3BlY2lhbC1zZWNyZXQ=
kind: Secret
metadata:
  name: test-secret
  namespace: default
```

`data.password`はBase64エンコードされているだけで、誰でもデコードできる状態です。これをGitにコミットしてしまうと誰でもこの情報を取得できてしまいます。
次に、これをCLIツールのkubesealで暗号化します。

```shell
cat test-secret.yaml | kubeseal --controller-name=sealed-secrets \
  --controller-namespace=sealed-secrets \
  --format yaml > test-sealed-secret.yaml
```

このとき、kubesealはクラスタより公開鍵を取得して暗号化を行います。
作成されたファイル(`test-sealed-secret.yaml`)は以下のようになります。

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: test-secret
  namespace: default
spec:
  encryptedData:
    password: AgBMxVg02CH+o1Lk2rsZ5WLSZUys6bljlnxElHv0Np(以降省略)
  template:
    data: null
    metadata:
      name: test-secret
      namespace: default
```

`spec.encryptedData`に暗号化された文字列が出力されていることが確認できます。
この状態だと秘密鍵が漏洩しない限り、この情報は復号化できません。
したがって、このSealedSecretリソースはGitにコミットできます。
最初に作成したSecretリソースは、もう不要になりますので削除して構いません（通常は残してもいけません）。

## クラスタでSealedSecretを復号化する

作成したSealedSecretリソースをKubernetesにデプロイし、復号化されることを確認します。

```shell
kubectl apply -f test-sealed-secret.yaml
```

SealedSecretsのコントローラーがすぐにこれを検知して、データを復号化して通常のSecretリソースを作成します。

```shell
kubectl get secret test-secret -n default -o yaml
```
以下は必要部分を抜粋・整形した形です。
```yaml
apiVersion: v1
kind: Secret
type: Opaque
metadata:
  name: test-secret
  namespace: default
data:
  password: c3BlY2lhbC1zZWNyZXQ=
```

元通りの通常のSecretリソースになっています。
これでPodは通常のSecretリソースと同じようにボリュームとしてマウントしたり、環境変数に入れることが可能です。

SealedSecretsコントローラー側のログを見ても、復号化(Unsealed)が実行されていることが分かります。
```
2022/06/05 06:04:24 Updating default/test-secret
2022/06/05 06:04:24 Event(v1.ObjectReference{Kind:"SealedSecret", Namespace:"default", Name:"test-secret", \
 UID:"80ed82f4-28da-4e64-89ce-3f01024b8852", APIVersion:"bitnami.com/v1alpha1", ResourceVersion:"142294", FieldPath:""}): type: 'Normal' \
 reason: 'Unsealed' SealedSecret unsealed successfully
```

## クリーンアップ

SealedSecretsのコントローラーは以下で削除します。

```shell
helm uninstall sealed-secrets -n sealed-secrets
```

## まとめ
SealedSecretはそれ単体で安全にシークレット情報をGit管理できるため、導入が簡単です。
とはいえ、実運用するにはSealedSecretsの秘密鍵が漏洩した場合の考慮が必要です。
デフォルトでは30日で暗号化/復号化鍵(sealing key)は更新されますが、古いものは削除されず、引き続き復号化可能な仕組みです(削除すると古いSealedSecretsが復号化できなくなる)。
このためSealedSecretsでは、暗号化鍵の定期更新に加えて、パスワード等のシークレット情報そのものの定期的な更新を推奨しています(更新後に再度その時点の新しい鍵でSealedSecretを作成)。
以下[SealedSecretsのドキュメント](https://github.com/bitnami-labs/sealed-secrets#user-secret-rotation)からの抜粋です。
> The best practice is to periodically rotate all your actual secrets (e.g. change the password) and craft new SealedSecret resource with those new secrets.
> But if the sealed secrets controller were not renewing the sealing key that rotation would be moot, since the attacker could just decrypt the new secrets as well. Thus, you need to do both: periodically renew the sealing key and rotate your actual secrets!

そもそもですが、SealedSecretsが管理するSecretリソースへのアクセスはRBACで厳格に制限する必要があるのは間違いないです。

---
参照資料

- [SealedSecrets](https://github.com/bitnami-labs/sealed-secrets/tree/main/helm/sealed-secrets)
