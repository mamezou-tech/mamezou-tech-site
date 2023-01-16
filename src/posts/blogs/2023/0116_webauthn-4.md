---
title: Apple Touch ID Keyboard を使ったパスワードレス認証
author: shigeki-shoji
date: 2023-01-16
tags: [AWS, "認証/認可", keycloak, ZTA, webauthn]
---

弊社では隔月で有志によるハッカソンを開催しています。

1 月のハッカソンで、私は年が明けてすぐに購入した「[Appleシリコン搭載Macモデル用Touch ID搭載Magic Keyboard - 英語(US)](https://amzn.asia/d/jc5XwLf)」を、昨年公開した記事「[WebAuthn でパスワードの無い世界へ](/blogs/2022/06/15/webauthn-1/)」の通りに利用することをテーマに参加しました。

試してみたところ、いくつか課題が見つかりました。

記事の通りに進めようとした場合の課題は次の通りです。

- Apple シリコンに対応した最新の Keycloak をインストールできない。
- 最新と古いバージョン間でパスワードレス認証を有効にする画面が (微妙に) 異なる。

さらに今回は Kubernetes で動作するようにしたいとも考えました。

## 前提

動作確認に使用した環境は次の通りです。

- Apple Silicon (M1) mac mini
- [Rancher Desktop 1.7.0](https://rancherdesktop.io/)
    - Kubernetes 1.23.13

## インストール

### Keycloak のインストール

Helm チャートを使ってインストールします ([ArtifactHUB](https://artifacthub.io/packages/helm/codecentric/keycloak))。

デフォルトの [values.yaml](https://github.com/codecentric/helm-charts/blob/master/charts/keycloak/values.yaml) に若干変更が必要なため、[takesection/keycloak-install](https://github.com/takesection/keycloak-install) を clone してください。

```shell
git clone https://github.com/takesection/keycloak-install.git
```

この記事では Rancher Desktop に同梱されている Ingress である traefik を使用します。

そのため SSL/TLS 証明書が必要になります。

この記事では証明書を [Let's Encrypt](https://letsencrypt.org/ja/) で取得します。

### certbot

[Homebrew](https://brew.sh/index_ja) を使って certbot をインストールします。

```shell
brew install certbot
```

### 証明書生成

次のコマンドを実行します。

```shell
sudo certbot certonly --manual --preferred-challenges dns
```

ドメイン名を入力します。所有するドメイン名が `example.com` であれば、`*.example.com` のように入力すると便利です。

```shell
Please enter in your domain name(s) (comma and/or space separated)  (Enter 'c'
 to cancel):
```

ドメイン名の所有を確認するために、DNS に TXT レコードの追加が要求されます。

表示された指示に従って DNS (Route 53 等) に TXT レコードを追加します。

```text
_acme-challenge.example.com TXT "<表示された値>"
```

DNS にレコードを追加してから、それがローカル環境で認識されるまで少し時間がかかるので、追加後しばらく待ってから Enter キーを押してください。

成功すると、この例であれば `/etc/letsencrypt/live/example.com` ディレクトリに証明書ファイルが生成されます。

生成されたファイルを `keycloak-install` にコピーします。

```shell
sudo cp /etc/letsencrypt/live/example.com/fullchain.pem /etc/letsencrypt/live/example.com/privkey.pem ./
```

`tls-secret` を作成します。

```shell
kubectl create secret tls tls-secret --cert=fullchain.pem --key=privkey.pem
```

### values.ymlの編集

`values.yml` から `local-values.yml` をコピーしてください。

```shell
cp values.yml local-values.yml
```

`local-values.yml` の298行目、306行目にある ingress の設定を、証明書のドメイン名に合わせて編集します。例えば、使用するドメイン名が `keycloak.example.com` であれば、以下のようになります。

{% raw %}
```yaml
  # List of rules for the Ingress
  rules:
    -
      # Ingress host
      host: '{{ .Release.Name }}.example.com'
      # Paths for the host
      paths:
        - path: /
          pathType: Prefix
  # TLS configuration
  tls:
    - hosts:
        - keycloak.example.com
      secretName: "tls-secret"
```
{% endraw %}

Helm チャートのリポジトリを追加します。

```shell
helm repo add codecentric https://codecentric.github.io/helm-charts
```

helm コマンドを使ってインストールします。

```shell
helm install keycloak --values=local-values.yml codecentric/keycloak  
```

## Keycloak の初期設定

port-forward で localhost でアクセスできるようにします。

```shell
kubectl port-forward svc/keycloak-http 8080:80
```

ブラウザを使って `http://localhost:8080/auth/` にアクセスして、管理者のユーザ名とパスワードを設定します。

![](https://github.com/takesection/keycloak-install/raw/main/image/keycloak-1.png)

`Create` ボタンをクリックします。

![](https://github.com/takesection/keycloak-install/raw/main/image/keycloak-2.png)

## パスワードレス認証フローの設定

`Administration Console` のリンクをクリックして、`Username or email` と `Password` には、それぞれ先に設定した管理者のユーザ名、パスワード を入力して Sign In します。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/flow-1.png)

新しい Realm を作成するため、左上の Master のあたりにマウスを置いて「Add realm」ボタンをクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/flow-2.png)

Add realm の Name に `passengers` と入力し、「Create」ボタンをクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/flow-3.png)

左側にある `Authentication` をクリックします。

### Flows の設定

1. Flows で `Browser` を選択し、右にある「Copy」ボタンをクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/flow-4.png)

2. 新しい名前として `WebAuthn Browser` と入力し、「Ok」ボタンをクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/flow-5.png)

3. WebAuthn Browser Forms の下にある「Username Password Form」、「WebAuthn Browser Browser - Conditional OTP」、「Condition - User Configured」と「OTP Form」の右にある `Actions` から `Delete` を選んで削除します。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/flow-6.png)

4. WebAuthn Browser Forms の右にある `Actions` の `Add execution` をクリックして、`Provider` から `Username Form` を選択して「Save」ボタンをクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/flow-7.png)

5. WebAuthn Browser Forms の右にある `Actions` の `Add flow` をクリックして `Alias` に `Password Or Two-factor` を入力して「Save」ボタンをクリックします。このフローは `REQUIRED` に設定します。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/flow-8.png)

6. Password Or Two-factor の右にある `Actions` の `Add execution` をクリックして、`Provider` から `WebAuthn Passwordless Authenticator` を選択して「Save」ボタンをクリックします。このフローは `ALTERNATIVE` に設定します。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/flow-9.png)

7. Password Or Two-factor の右にある `Actions` の `Add execution` をクリックして `Provider` から `Password Form` を選択して「Save」ボタンをクリックします。このフローは `ALTERNATIVE` に設定します。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/flow-10.png)

ここまでの設定で `WebAuthn Browser` は次のようになります。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/flow-11.png)

### Bindings

Bindings タブをクリックして `Browser Flow` に `WebAuthn Browser` を選択して「Save」ボタンをクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/flow-12.png)

### Required Actions

Required Actions タブをクリックして「Register」ボタンをクリックし、Required Action に `Webauthn Register Passwordless` を選択して「Ok」ボタンをクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/flow-13.png)

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

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/flow-14.png)

## 試してみましょう

左側の Manage にある `Users` をクリックします。

「Add user」ボタンをクリックします。

「Username」、「Email」、「First Name」、「Last Name」を入力し「Save」ボタンをクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/user-1.png)

Credentials タブをクリックします。

Set Password にパスワードを入力し「Set Password」ボタンをクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/user-2.png)

### 認証情報の登録

`kubectl get ingress` で表示されたホスト名とIPアドレスを `/etc/hosts` ファイルに設定します。

`https://{ホスト名}/auth/realms/passengers/account` に Chrome ブラウザでアクセスします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/setup-1.png)

1. 「Sign In」ボタンをクリックします。

2. Username or email に作成したユーザの Username か Email を入力して「Sign In」ボタンをクリックします。

3. Password を入力して「Sign In」ボタンをクリックします。

    - Password の変更が求められたら、変更します。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/setup-2.png)

4. リンク `Signing In` をクリックします。

5. `Passwordless`、`Security Key` のリンク `Set up Security Key` をクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/setup-3.png)

6. 「Register」ボタンをクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/setup-4.png)

1. デバイスに Touch ID が登録されます。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/setup-5.png)

## パスワードレスでログイン

Sign Out して、もう一度 Sign In をクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/login-1.png)

Password を入力する画面の下のリンク `Try Another Way` をクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/login-2.png)

リンク `Security Key` をクリックします。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/login-3.png)

「Sign in Security Key」ボタンをクリックして、Touch ID で認証します。

![](https://github.com/edward-mamezou/hibernation-pod/raw/2023-01-16/image/20230116/login-4.png)

## おわりに

昨年記事を書いた時点では Apple 社のブラウザ Safari 以外ではパスワードレス認証ができなかったと記憶しています。この記事にある通り、今では Google Chrome ブラウザでも Touch ID に対応したパスワードレス認証ができています。
