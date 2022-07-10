---
title: WebAuthn でパスワードの無い世界へ
author: shigeki-shoji
date: 2022-06-15
tags: [AWS, "認証/認可", keycloak, ZTA]
---

複数のサービスにアクセスするための異なるパスワードを記憶しておくことは困難で、結果としてパスワードを使いまわすといったセキュリティリスクの高い行動パターンをとりがちです。

最近のスマートフォンやPCでは指紋認証や顔認証のような生体情報を用いた認証が可能になっています。このようなデバイスを活用してより安全性の高い認証の仕様として、[FIDO2](https://fidoalliance.org/fido2-2/fido2-web-authentication-webauthn/) (WebAuthn) があります。

この記事では、WebAuthn に対応した [Keycloak](https://www.keycloak.org/) と iPhone または iPad を使ってパスワードレスにサインインする環境を AWS 上に構築します。

:::info
Keycloak は Red Hat 社が開発しているオープンソースの認証管理です。
:::

## パスワードレスサインインのイメージ

最初にパスワードレスサインインのイメージをデモンストレーションします。

iPad から Keycloak に Safari でアクセスします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/feature/v0.0.2/image/keycloak-001.PNG)

Username または Email を入力します。

![](https://github.com/edward-mamezou/hibernation-pod/raw/feature/v0.0.2/image/keycloak-002.PNG)

Password 入力画面で、`Try Another Way` をクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/feature/v0.0.2/image/keycloak-003.PNG)

Security Key をクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/feature/v0.0.2/image/keycloak-004.PNG)

「Sign in with Security Key」ボタンをクリックして、指紋認証の Touch ID などを使ってサインインできます。

![](https://github.com/edward-mamezou/hibernation-pod/raw/feature/v0.0.2/image/keycloak-005.PNG)

## 構成

では、上記でデモンストレーションした WebAuthn の構成を Keycloak で構築してみます。

WebAuthn では HTTPS が必須です。唯一の例外は localhost を使う場合だけです。ここでは、AWS を使って環境構築するため、ホストゾーン作成済みの [Amazon Route 53](https://aws.amazon.com/jp/route53/) と [AWS Certificate Manager](https://aws.amazon.com/jp/certificate-manager/) を使います。

:::info
Route 53 のホストゾーンを作成するドメイン名は必ずしも AWS で取得する必要ありません。私が主に使用しているドメイン名は、「[お名前.com](https://www.onamae.com/)」や「[名づけてねっと](https://www.nadukete.net/)」で取得して、ネームサーバーだけ Route 53 を使用しています。
:::

Keycloak の公式のコンテナイメージを [AWS Fargate](https://aws.amazon.com/jp/fargate/) で実行します。

![](https://github.com/edward-mamezou/hibernation-pod/raw/feature/v0.0.2/image/keycloak-1.png)

上図の構成を構築する CloudFormation テンプレートは [GitHub リポジトリ](https://github.com/edward-mamezou/hibernation-pod/blob/feature/v0.0.2/infrastructure/infra.yaml) にあります。

:::stop
この記事で構築する Keycloak はデモンストレーション用に簡素化しています。そして永続化しません。つまり、こらから述べる手順で構築した後、コンテナを停止 (サービスを停止) すると初期状態に戻ります。永続化のためには、データベース等も必要になります。冗長化や永続化については、最後に紹介しているリンクも参考にしてください。
:::

## Keycloak の起動

1. AWS コンソールの Elastic Container Service から、クラスターを選択し、作成したサービスを選択し、「更新」ボタンをクリックします。
2. サービスの設定にある、タスクの数を 1 に設定して、「次のステップ」ボタンをクリックします。
3. ネットワーク構成は変更せずに「次のステップ」ボタンをクリックします。
4. Auto Scaling もそのまま「次のステップ」ボタンをクリックします。
5. 確認で、「サービスの更新」ボタンをクリックします。

しばらく経つと CloudFormation テンプレートに適用した DNSName の URL にアクセスできます。

`https://{設定したDNSName}/auth` にブラウザでアクセスしてください。

## パスワードレス認証の設定

Administration Console のリンクをクリックして、`Username or email` に `admin`、`Password` に `password` を入力して Sign In します。

![](https://github.com/edward-mamezou/hibernation-pod/raw/feature/v0.0.2/image/keycloak-2.png)

新しい Realm を作成するため、左上の Master のあたりにマウスを置いて「Add realm」ボタンをクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/feature/v0.0.2/image/keycloak-4.png)

Add realm の Name に `passengers` と入力します。

![](https://github.com/edward-mamezou/hibernation-pod/raw/feature/v0.0.2/image/keycloak-6.png)

左側にある `Authentication` をクリックします。

### Flow の設定

1. Flow で Browser が選択されたボックスの右にある「Copy」ボタンをクリックします。
2. 新しい名前として `WebAuthn Browser` と入力します。
3. WebAuthn Browser Forms の下にある「Username Password Form」、「WebAuthn Browser Browser - Conditional OTP」、「Condition - User Configured」と「OTP Form」の右にある `Actions` から `Delete` を選んで削除します。

![](https://github.com/edward-mamezou/hibernation-pod/raw/feature/v0.0.2/image/keycloak-9.png)

4. WebAuthn Browser Forms の右にある `Actions` の `Add execution` をクリックして、`Provider` から `Username Form` を選択して「Save」ボタンをクリックします。
5. WebAuthn Browser Forms の右にある `Actions` の `Add flow` をクリックして `Alias` に `Password Or Two-factor` を入力して「Save」ボタンをクリックします。このフローは `REQUIRED` に設定します。
6. Password Or Two-factor の右にある `Actions` の `Add execution` をクリックして、`Provider` から `WebAuthn Passwordless Authenticator` を選択して「Save」ボタンをクリックします。このフローは `ALTERNATIVE` に設定します。
7. Password Or Two-factor の右にある `Actions` の `Add flow` をクリックして `Alias` に `Password And Two-factor WebAuthn` を入力して「Save」ボタンをクリックします。このフローは `ALTERNATIVE` に設定します。
8. Password And Two-factor WebAuthn の右にある `Actions` の `Add execution` をクリックして `Provider` から `Password Form` を選択して「Save」ボタンをクリックします。このフローは `REQUIRED` に設定します。
9. 最後に Password And Two-factor WebAuthn の右にある `Actions` の `Add execution` をクリックして `Provider` から `WebAuthn Authenticator` を選択して「Save」ボタンをクリックします。このフローは `REQUIRED` に設定します。
    
![](https://github.com/edward-mamezou/hibernation-pod/raw/feature/v0.0.2/image/keycloak-10.png)

### Bindings

Bindings タブをクリックして `Browser Flow` に `WebAuthn Browser` を選択して「Save」ボタンをクリックします。

### Required Actions

Required Actions タブをクリックして「Register」ボタンをクリックし、Required Action に `Webauthn Register Passwordless` と `Webauthn Register` を選択して「Ok」ボタンをクリックします。

### WebAuthn Passwordless Policy

WebAuthn Passwordless Policy タブをクリックします。

この画面では、次のように入力して「Save」ボタンをクリックします。

| 項目名 | 値 |
|---|---|
| Relying Party Entity Name | keycloak |
| Signature Algorithms | ES256 |
| Relying Party ID | 構築した keycloak の DNSName |
| Attestation Conveyance Preference | none |
| Authenticator Attachment | platform |
| Require Resident Key | No |
| User Verification Requirement | discouraged |
| Timeout | 0 |
| Avoid Same Authenticator Registration | OFF |
| Acceptable AAGUIDs | |

## 試してみましょう

左側の Manage にある `Users` をクリックします。

「Add user」ボタンをクリックします。

「Username」、「Email」、「First Name」、「Last Name」を入力し「Save」ボタンをクリックします。

Credentials タブをクリックします。

Set Password にパスワードを入力し「Set Password」ボタンをクリックします。

### 認証情報の登録

iPhone や iPad 等の WebAuthn 対応端末の Safari で `https://{DNSName}/auth/realms/passengers/account` にアクセスします。

「Sign In」ボタンをクリックします。

Username or email に作成したユーザの Username か Email を入力して「Sign In」ボタンをクリックします。

Password を入力して「Sign In」ボタンをクリックします。

Password の変更が求められたら、変更します。

Security Key Registration の「Register」ボタンをクリックします。

サインインに成功すると「OK」ボタンをクリックして登録を完了します。

ここでは、まず、Two-factor 用のつまりパスワード以外の要素を加えるための MFA 用の認証情報が登録された状態です。

次に、Account Security の Signing In をクリックして、一番下にある Passwordless の `Set up Security Key` リンクをクリックしてください。

Serurity Key Registration で「Register」ボタンをクリックして、認証情報の登録をします。

Please input your registerd authentication's label は、先の WebAuthn の登録に使ったものと違うラベルに変更しておいた方がよいでしょう。

Sign Out して、もう一度 Sign In すると、Password を入力する画面の下に `Try Another Way` が表示されパスワードレスでサインインできることが確認できます。

## まとめ

最後の認証情報の登録というところで、Keycloak に指紋等の生体情報を登録しているのではないかと疑念を感じたかもしれません。しかし、そのようなことはなく、Keycloak のようなサーバーには公開鍵を登録しているだけで、生体情報とはなんら関係のない情報を登録しているにすぎません。そして、もしサーバーからこの公開鍵が漏洩したとしても、iPhone や iPad 内に厳重に保存された秘密鍵がなければ意味を持つことはありません。

今回は、パスワードレス認証をデモンストレーションしました。次回以降でより深堀りした記事を投稿する予定です。

## 参考

- [インフラ管理不要なコンテナ環境のAWS FargateでKeycloakを動かしてみる](https://qiita.com/wadahiro/items/0837729e7c57becbfd06)
- [Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/index.html#managing-webauthn-credentials-as-a-user)
