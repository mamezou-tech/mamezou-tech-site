---
title: Tellerでシークレット情報を自動取得＆ソースコード埋め込みを検知する
author: noboru-kudo
date: 2022-12-07
templateEngineOverride: md
tags: [Security, aws, advent2022]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---

これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第7日目の記事です。

昨今セキュリティ意識の高まりとともに、シークレット情報の運用は以前よりも注目度が高くなっていると感じます。
また、DevSecOpsの浸透もあり、ソフトウェアライフサクル全体で継続的にセキュリティを確保することが推奨されています。
このような背景から、シークレット情報を[AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)/[AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)や[HashiCorp Vault](https://www.vaultproject.io/)等のキーストア製品を使って管理することが一般的かと思います。

このような製品は便利である一方で、ツール固有のAPIやコマンドライン等、格納されたシークレット情報にアクセスするにはそれぞれの手順に従う必要があります。
また、ある程度の規模のシステムでは、一度ソースコードにシークレット情報を直接埋め込んでしまうと、後から検知するのは難しいことも多いでしょう。

ここでは、このような課題を解決する[Teller](https://tlr.dev/)を試してみます。
Tellerは、CNCFの2022/04にサンドボックスプロジェクトとしてホスティングされ、今後の普及が見込まれる製品です。

Tellerは、各種キーストア製品/サービスに格納されたシークレット情報をソフトウェアライフサイクル全体で安全に管理することを目的としたOSSです。
また、アプリケーションにシークレット情報を提供するだけでなく、ソースコード中に埋め込んでしまったものを検知することも可能です。

対応する製品も、主要なものはほとんどサポートしています。

- [GitHub - Teller - Providers](https://github.com/tellerops/teller#providers)

もちろん複数の製品を組み合わせて使うことも可能です。
バックエンドとなる製品への切り替えが発生しても、アプリケーションを変更せずに段階的に移行するといった使い方もできます。

[[TOC]]

## Tellerをインストールする

まずは、TellerのCLIをインストールします。macOSではHomeBrewよりインストール可能です。

```shell
brew tap spectralops/tap && brew install teller
```

Windows/Linuxの場合は、GitHubのリリースページよりバイナリファイルがダウンロード可能です。
 
- [GitHub - Teller - Release](https://github.com/tellerops/teller/releases/latest)

```shell
teller version
> Teller 1.5.6
> Revision 7b714bc2f1d5e14920f2add828fdf7425148ff6b, date: 2022-10-13T08:02:44Z
```

ここでは現時点で最新の1.5.6をインストールしました。

## パラメータストアのシークレット情報を取得する

今回はAWS Systems Manager Parameter Store(以下パラメータストア)に格納したシークレット情報をTellerで管理するようにします。

事前準備として、パラメータストアに以下のようにシークレット情報(`/myapp/prod/token`)を登録しました。

![AWS Management Console - SSM Parameter Store](https://i.gyazo.com/eb6212d788b1c2dbbfc1ab1eb920b981.png)

次に、Tellerの設定ファイルを作成します。
もちろん手動でも作成できますが、`teller new`コマンドを使うと対話形式で作成できます。

```shell
teller new

> ? Project name? sample
> ? Select your secret providers  [Use arrows to move, space to select, <right> to all, <left> to none, type to filter]
>   [ ]  .env
>   [ ]  1Password
> > [x]  AWS SSM (aka paramstore)
>   [ ]  AWS Secrets Manager
>   [ ]  Azure Key Vault
>   [ ]  Cloudflare Workers K/V
>   [ ]  Cloudflare Workers Secrets
>   [ ]  Consul
>   [ ]  CyberArk Conjure
>   [ ]  Doppler
> ? Would you like extra confirmation before accessing secrets? No
```

ここでは、プロバイダーとして`AWS SSM (aka paramstore)`のみを選択しましたが、前述の通り複数製品の組み合わせも可能です。

カレントディレクトリに`.teller.yml`が作成されます。
作成されたファイルを以下のように修正します。

```yaml
project: sample

# Set this if you want to carry over parent process' environment variables
# carry_env: true 

#
# Variables
#
# Feel free to add options here to be used as a variable throughout
# paths.
#
opts:
  stage: development

#
# Providers
#
providers:
  # configure only from environment
  aws_ssm:
    env:
      # 以下を修正
      MYAPP_TOKEN:
        path: /prod/myapp/token
        decrypt: true
```

Tellerは、どんな言語でも使える環境変数が統一インターフェースです。
ここでは、環境変数`MYAPP_TOKEN`にパラメータストアのパス`/myapp/prod/token`の値を設定しました。
また、パラメータストアでセキュア文字列として設定しましたので`decrypt: true`として、環境変数設定時に復号化するようにします。

パラメータストアは個別に環境変数を指定する必要がありますが、使用するプロバイダー(キーストア製品)によっては特定のパス配下やファイル全体を一括で取り込むこともできます(この場合は`env_sync`を使います)。

設定後はパラメータストアからシークレット情報が取得できるかを確認します。
以下のコマンドを実行します。

```shell
teller show

> -*- teller: loaded variables for sample using .teller.yml -*-
>
> [aws_ssm /myapp/prod/token] MYAPP_TOKEN = my*****
```

Tellerがパラメータストアからシークレット情報を取得できていることが分かります[^1]。
[^1]: 取得できない場合は、実行しているIAMポリシーを確認してください。Tellerがローカル環境のAWSクライアント設定でパラメータストアを参照するので、IAMユーザー・ロールで該当のパラメータストア参照可能である必要があります。

ここで以下のサンプルアプリケーション(`app.js`)を用意しました。

```javascript
console.log(process.env.MYAPP_TOKEN);
```

環境変数よりシークレット情報を取得して、コンソールに出力するだけです。

Tellerとアプリケーションを連携するには、`teller run`に続けてプログラム実行コマンドを記述するだけです[^2]。

[^2]: アプリケーションの実行にスイッチが必要な場合は、`teller run -- myapp --switch foo`のようにrunの後ろに`--`を入れます。

```shell
teller run node app.js
> -*- teller: loaded variables for sample using .teller.yml -*-
> my-super-secret-token
```

期待通り標準出力にパラメータストアのシークレット情報が出力されました。
Tellerがアプリケーション実行前にパラメータストアよりシークレット情報を取得して、アプリケーションの実行プロセスの環境変数として設定してくれています。
事前にパラメータストアから取得／環境変数exportしたり、.bashrc/.zshrcを編集する必要はなくシンプルで安全です。

![Teller run image](https://i.gyazo.com/716963ed713012674b53b05bcbb5c165.png)

:::column:標準出力のシークレット情報出力を抑止する
もちろん実運用するうえで、標準出力にシークレット情報を出力するのはNGです。そうは言ってもデバッグ目的で標準出力に出してしまう人もいるかもしれません。
そんな事態が予想される場合は、実行時にtellerコマンドに`--redact`オプションをつけると、Tellerがアプリケーション内での標準出力への表示を抑止してくれます。

```shell
teller run --redact node app.js
> -*- teller: loaded variables for sample using .teller.yml -*-
> **REDACTED**
```
:::

:::column:サブプロセスにもTellerの環境変数を引き継ぐ
Tellerはデフォルトでは、`teller run`コマンドで指定したプロセスのみにシークレット情報の環境変数を適用します。
アプリケーション内でサブプロセスを起動する場合は、.teller.ymlで`carry_env: true`を指定します。こうするとTellerはOSレベルで環境変数に設定してくれます。
:::

## 環境別にシークレット情報の取得元を切り替える

先程は、パラメータストアのパスが`/myapp/prod/...`と商用環境向けを示すものでした。
一般的には、環境別にシークレット情報が異なることがほとんどでしょう。
環境別に.teller.ymlを用意するのは今ひとつですので、テンプレート化して動的に切り替えられるようにしてみます[^3]。

[^3]: Tellerコマンドで`-c`オプションをつけることでファイルの切り替えは可能です。

まず、.teller.ymlの`opts`のstageを環境変数から取り込むようにします。

```yaml
opts:
  stage: env:MYAPP_STAGE # <- 環境変数(MYAPP_STAGE)より取得
```

`opts`は変数置換が可能なセクションで、キーバリューの形式で記述できます。
キーは任意ですので、stageでなくても構いません。
また、値に`env:XXXXX`のフォーマットで記述し、tellerコマンド実行時に環境変数より取得するようにします。

パラメータストアのシークレット情報のパスは以下のようになります。

```yaml
providers:
  # configure only from environment
  aws_ssm:
    env:
      MYAPP_TOKEN:
        path: /myapp/{{stage}}/token # stageにより動的にパス切り替え
        decrypt: true
```

`path`部分を`/myapp/{{stage}}/token`として先程可変としたstageから取り込むようにしました。

実行コマンドは以下のようになります。

```shell
# パラメータストアパス：/myapp/prod/token
MYAPP_STAGE=prod teller run node app.js

# パラメータストアパス：/myapp/dev/token
MYAPP_STAGE=dev teller run node app.js
```

環境(MYAPP_STAGE)はシークレット情報ではありませんので、.bashrc/.zshrc等で環境別に設定しておいても良いかと思います。

## ソースコードへのシークレット情報埋め込みを検知する

ここまでパラメータストアからシークレット情報を取得して、アプリケーションから参照するところを見てきましたが、Tellerにはソースコード内にシークレット情報がハードコードされているかをチェックする機能もあります。

例えば、以下のソースコードを実装してしまったとします。

```javascript
const token = "my-super-secret-token"
console.log(token);
```

これをチェックするには`teller scan`コマンドを実行します。

```shell
MYAPP_STAGE=prod teller scan
> [high] app.js (2,15): found match for aws_ssm/MYAPP_TOKEN (my*****)
> 
> Scanning for 1 entries: found 1 matches in 6.301915ms
echo $?
> 1
```

Tellerはファイル全体に対してスキャンを行い、.teller.ymlで指定したシークレット情報を直接埋め込んでいる部分を検知します。
ここでは、重要度`high`としてapp.jsにシークレット情報埋め込みを検知していることが分かります。
重要度は.teller.ymlの`severity`でシークレット情報ごとに指定できます(デフォルトは`high`)。

```yaml
providers:
  # configure only from environment
  aws_ssm:
    env:
      MYAPP_TOKEN:
        path: /myapp/{{stage}}/token
        decrypt: true
        severity: low # high | medium | low | none
```

重要度が`high`または`middle`で検知された場合は、`teller scan`はExitコード1を返します。
CI/CDパイプラインにこの脆弱性スキャンを取り込むことで、シークレット情報の埋め込みを検知し、パイプラインを失敗させるといった使い方が想像できますね。

## 最後に

ここでは紹介できませんでしが、Tellerには他にもシークレット情報のプロバイダー間のドリフト検知、同期や更新・削除といった機能もあります。

Tellerという統一インターフェースでバックエンドのキーストアを意識せずに、安全に利用できるのは大きなメリットと言えそうです。
機会があれば取り入れてみたいなと思いました。
