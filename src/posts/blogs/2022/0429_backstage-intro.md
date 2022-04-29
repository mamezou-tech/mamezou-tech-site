---
title: Backstageで開発者ポータルサイトを構築する - 導入編
author: noboru-kudo
date: 2022-04-29
---

依存関係にある他チームで開発しているAPIの情報を探すのに社内リソースを探し回った経験はないでしょうか？
小さな組織ではあまりないかもしれませんが、ある程度の組織になると、管理対象のシステムが数百から数千といったオーダーで構成されることが多いかと思います。
その結果、目的のものを探すためにあちこち探し回り、見つかったと思ったらほしい情報がそこにはなく途方に暮れる。。なんて経験が私はよくあります。

今回こんな悩みを解決するものとして、[Backstage](https://backstage.io/)というOSSプロダクトを試してみたいと思います。
BackstageはSpotify社によって2016年に公開され、大規模組織における開発者ポータルサイト構築にフォーカスしています。
その後、2022/03/15にCNCFのIncubatingに昇格、そして2022/03/17にv1.0がリリースされ、今後の普及が見込まれるものでもあります。

- [Backstage blog: New release: Backstage 1.0](https://backstage.io/blog/2022/03/17/backstage-1.0)

Backstageを1回の記事で紹介するにはボリュームがありすぎるため、複数回に分けて掲載していく予定です。
今回は導入編ということで、ローカル環境でBackstageを起動して、あらかじめ用意されているサンプルでBackstageのコア機能の一部を見ていきます。

[[TOC]]

## 事前準備

今回はVCSとしてGitHubを利用し、ここに登録されるプロジェクトをBackstageで管理していきます。
このため、GitHubのOAuthアプリ(ユーザー情報取得)やGitHubのトークンを作成します。

### GitHub OAuthアプリの作成

まずはGitHubのOAuthアプリを作成し、クライアントIDとシークレットを作成します。

- <https://github.com/settings/developers>

Backstageの[公式ドキュメント](https://backstage.io/docs/auth/github/provider#create-an-oauth-app-on-github)に記載の通り、ホームページURLにとコールバックURLは以下を指定します。

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:7007/api/auth/github`

アプリケーション名は任意で構いません。
アプリの作成が終わったら、クライアントシークレットを発行し、クライアントIDと共に環境変数に設定しておきます。

```shell
export AUTH_GITHUB_CLIENT_ID=<github-oauth-app-client-id>
export AUTH_GITHUB_CLIENT_SECRET=<github-oauth-app-client-secret>
```

### GitHubトークンの発行

続いて、BackstageがGitHubの操作で利用するトークンも発行しておきます。

- <https://github.com/settings/tokens>

今回実施する範囲としては、選択するスコープは`repo`のみで問題ありません。
発行されたトークンは環境変数に設定しておきます。

```shell
export GITHUB_TOKEN=<your-github-token>
```

## Backstageで管理するユーザー/グループレポジトリの作成

Backstage側でのユーザー管理に必要なものです。
こちらはBackstageのGroup/Userエンティティとして作成します。

GitHub上に任意のレポジトリを作成し、以下のYAMLファイルを作成します。
ここではプライベートレポジトリとして`backstage-admin`を作成し、以下のファイル(`users.yaml`)を配置しました。

```yaml
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: mamezou-tech
  description: The mamezou technical unit
spec:
  type: business-unit
  profile:
    displayName: mamezou-tech
    email: mamezou-tech@example.com
  children: []
---
apiVersion: backstage.io/v1alpha1
kind: User
metadata:
  name: kudoh
spec:
  profile:
    displayName: noboru-kudo
    email: noboru-kudo@mamezou.com
  memberOf: [kudoh]
```

このファイルはKubernetesにデプロイする訳ではありませんが、Kubernetesのマニフェストファイルにそっくりですね。
自明ですが、ここでは1グループ(`mamezou-tech`)、1ユーザーを作成しています。
なお、ユーザー名(`metadata.name`)はGitHubのログインユーザー名と合わせておきます。

このYAMLファイル(Group/User)の詳細は[公式ドキュメント](https://backstage.io/docs/features/software-catalog/descriptor-format#kind-group)を参照してください。

## PostgreSQLのインストール
Backstageの永続化ストレージとして利用するPostgreSQLをセットアップします。
今回は直接ローカルではなく、Minikube上にHelmでインストールしました[^1]。

[^1]: もちろんローカル環境に直接PostgreSQLをインストールしても構いません。

```shell
# PostgreSQLの接続情報
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=backstage-pass
export POSTGRES_HOST=$(minikube ip)
export POSTGRES_PORT=30100

# Helmチャートよりインストール
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm upgrade postgres --install bitnami/postgresql \
  --version 11.1.24 \
  --namespace backstage --create-namespace \
  --set auth.postgresPassword=${POSTGRES_PASSWORD} \
  --set primary.service.type=NodePort \
  --set primary.service.nodePorts.postgresql=${POSTGRES_PORT}
```

ここでもPostgreSQLの接続情報を環境変数に設定します。これは後続のBackstageの起動時に使用します。

インストールが終わったら、PostgreSQLの状況を確認します。

```shell
kubectl get pod -n backstage
```
```
NAME                             TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)          AGE
service/postgres-postgresql      NodePort    10.96.105.51   <none>        5432:30100/TCP   10m
service/postgres-postgresql-hl   ClusterIP   None           <none>        5432/TCP         10m

NAME                        READY   STATUS    RESTARTS      AGE
pod/postgres-postgresql-0   1/1     Running   0             10m
```

NodePortを通して、30100番ポートでMinikube上のPostgreSQLにアクセスできるようになりました。

## Backstageアプリの作成

次に、Backstageアプリを作成します。 これにはnpmに付属するnpxコマンドを使います。

```shell
# v0.4.26
npx @backstage/create-app
> ? Enter a name for the app [required] 
mamezou-backstage
> ? Select database for the backend [required] 
PostgreSQL
```

対話形式で質問されますので、ここでは上記のように`mamezou-backstage`/`PostgreSQL`を入力/選択しました。
`mamezou-backstage`ディレクトリが作成され、Backstageアプリのテンプレートが展開されます。依存ライブラリのインストールも実行されるため、ここはそれなりに時間がかかります。
`mamezou-backstage`ディレクトリ配下は、以下の構成となりました。

```
.
├── README.md
├── app-config.production.yaml
├── app-config.yaml
├── backstage.json
├── catalog-info.yaml
├── dist-types
├── node_modules
├── packages
│   ├── app
│   └── backend
├── plugins
├── lerna.json
├── tsconfig.json
├── package.json
└── yarn.lock
```

BackstageはフロントエンドにReact、バックエンドにExpressを利用した構成になっています(`packages`配下)。

## BackstageアプリのOAuth設定

Backstageは、デフォルトではゲストユーザーとして扱われますが、今回はGitHubのOAuthを使ってユーザー情報を取得します。
これを行うためにはいくつかの変更が必要です。
まずはフロントエンド側です。`packages/app/src/App.tsx`に以下を追加します。

{% raw %}
```tsx
import { AlertDisplay, OAuthRequestDialog, SignInPage } from '@backstage/core-components';
import { githubAuthApiRef } from "@backstage/core-plugin-api";
// 他省略

const app = createApp({
  apis,
  // 以下を追加
  components: {
    SignInPage: props => (
      <SignInPage
        {...props}
        auto
        provider={{
          id: 'backstage',
          title: 'GitHub',
          message: 'Sign in using GitHub',
          apiRef: githubAuthApiRef,
        }}/>
    ),
  },
  // ここまで(以下省略)
});
```
{% endraw %}

BackstageのSignInPageコンポーネントを追加しました。こうすることでBackstageは、サイト訪問時にGitHubのOAuth認証をするようになります。
バックエンド側でも変更が必要です。`packages/backend/src/plugins/auth.ts`に以下を追加します。

```typescript
import { createRouter, defaultAuthProviderFactories, providers } from '@backstage/plugin-auth-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    config: env.config,
    database: env.database,
    discovery: env.discovery,
    tokenManager: env.tokenManager,
    // ここから
    providerFactories: {
      ...defaultAuthProviderFactories,
      github: providers.github.create({
        signIn: {
          resolver: providers.github.resolvers.usernameMatchingUserEntityName(),
        }
      })
    }
    // ここまで
  });
}
```

こうすることで、BackstageはGitHubのユーザー情報(`username`)と、先程作成したUserエンティティの一致判定をして、ログインしたユーザーを特定します[^2]。

[^2]: これを追加しないと`User Not Found`となり、Backstageアプリにログインできません。

## Backstageの設定ファイル修正

最後に、Backstageアプリの設定ファイルを修正します。
まず、`app-config.yaml`を`app-config.local.yaml`にリネームしてコピーします。これはローカル実行専用の設定ファイルになります[^3]。

[^3]: こちらは誤ってコミットしないよう`.gitignore`に指定することが推奨されています。

今回は`app-config.local.yaml`を以下のように修正します。差分のみ表示します。

```yaml
app:
  title: Mamezou Backstage
  baseUrl: http://localhost:3000

organization:
  name: Mamezou Tech

# 省略
auth:
  environment: development
  # GitHubのOAuth設定を環境変数より取得
  providers:
    github:
      development:
        clientId: ${AUTH_GITHUB_CLIENT_ID}
        clientSecret: ${AUTH_GITHUB_CLIENT_SECRET}

# 省略        
catalog:
  # 省略
  locations:
    # 省略
    - type: url
      target: https://github.com/kudoh/backstage-admin/blob/main/users.yaml
      rules:
        - allow: [Group, User]
```

`app.title`や`organization.name`は任意の名前で構いません。
`auth`の部分がGitHubのOAuthの設定です。GitHubのOAuthアプリのクライアントID/シークレットは先程環境変数(`AUTH_GITHUB_CLIENT_ID` / `AUTH_GITHUB_CLIENT_SECRET`)に設定していますので、このような記述をしておくとBackstageはそこから取得してくれます。
これ以外にも、先程設定済みの以下の環境変数も同様に実行時に環境変数より取得するようになっています。未設定の場合は同ファイルの利用箇所を修正してください。

- `GITHUB_TOKEN`: Backstageが使うGitHubトークン
- `POSTGRES_HOST`: PostgreSQLのホスト名(Minikube VMのIP)
- `POSTGRES_PORT`: PostgreSQLのポート番号(`30100`)
- `POSTGRES_USER`: PostgreSQLユーザー(`postgres`)
- `POSTGRES_PASSWORD`: PostgreSQLパスワード

`catalog.locations`の部分はBackstageのUser/Group用に作成したユーザー管理用レポジトリの内容を静的に取り込むようにしています。
`target`には`users.yaml`のGitHub URLを指定しています。

## Backstageアプリの起動

ここまでくると後は動かすだけです。Backstageアプリの起動はyarnで行います。

```shell
yarn dev
```

フロントエンド、バックエンド双方のBackstageアプリがビルドされ、ブラウザが自動で開きます(`http://localhost:3000/`)。
Backstageの初期ページが表示されると、すぐにGitHubのOAuthログインページがサブウィンドウで表示されます(既にGitHubにログインセッションが有効な場合はスキップされます)。

<img width="40%" style="margin-bottom: 10px" src="https://i.gyazo.com/285432f818df47424ad51c151b9ab18f.png" alt="github login" class="">

ログイン後はGitHubにBackstageアプリに自身の情報を渡すことを許可します。

<img width="40%" style="margin-bottom: 10px" src="https://i.gyazo.com/144bb2a8def4836adabdb383c4f2110c.png" alt="github authz" class="">

すると、以下のようにBackstageのトップページにリダイレクトされます。

![backstage home](https://i.gyazo.com/337b62e967a599cd268a8bfc78275afb.png)

既にいくつかのコンポーネントが表示されています。これはBackstageアプリのテンプレートにサンプルとして含まれているものです。
試しに、`artist-lookup`を選択すると以下のようなページが表示されます。

![artist-lookup overview](https://i.gyazo.com/4559b9cfaf9343e203dfea26413d0da2.png)

コンポーネントの概要や依存関係が可視化されます。

`About`ウィジェットではこのコンポーネントの位置づけが分かります。ここではこのコンポーネントが誰(`OWNER`)に所有されていて、どのシステム(`SYSTEM`)の一部であるのかが分かります。
また、`LIFECYCLE`を見ると、現在このコンポーネントが実験的段階(`experimental`)であることも確認できます。

`Relations`のウィジェットの方に目を向けると、このコンポーネントの関連について以下のことが分かります[^4]。

- www-artistから使用されている
- artist-engagement-portalシステムの一部
- artist-dbを利用している

[^4]: 表示されているエンティティの詳細については次回詳細に踏み込む予定です。

![artist-lookup relationship](https://i.gyazo.com/844693e14aa02e7ef6ece15191835368.png)


このように、このコンポーネントが何に利用されているか／使用しているかといった依存関係がすぐに分かりますので、いろいろと調べ回る必要はなくなりそうです。
この他にも以下のような機能があり、細かい気配りもよくできています。

- タグによる検索
- ブックマーク(スター)
- プロジェクト情報編集(鉛筆マークをクリック)

APIの方も確認してみます。サイドバーよりAPIsをクリックします。

![API list](https://i.gyazo.com/5a169bf3ff69b77c0ad57d40e2381750.png)

APIの一覧が表示され、種類(gRPC/GraphQL/OpenAPI等)や現在の状態がすぐに分かります。
今回はpetstoreを選択してみます。

![petstore detail](https://i.gyazo.com/f5fd52e9e6877f792f95decd99cc1e3e.png)

先程と同様にこのAPIの概要、API視点での依存関係が分かります。
`DEFINITION`タブの方を開いてみます。

![petstore openapi](https://i.gyazo.com/81763d0311c84352606de60b5b06269d.png)

OpenAPIで記述されたAPI仕様が見やすく表示されています。ここでAPIを実際に試すこともできます。
もうOpenAPIからHTMLを生成する必要はありませんね。


## まとめ
今回はGitHubとのOAuth認証と、サンプルテンプレートからBackstage機能の概要を簡単に見てきました。

どのように感じたでしょうか？
私は短期間で急成長したSpotifyで培った開発ノウハウが詰まった製品だと感じました。成長の過程で様々な困難に突き当たり、必要に迫られてこのようなプロダクトができあがったのだろうなと思いを巡らせました。
これを組織全体で正しく運用することで、プロジェクトが成長して関連サービスが増えてきても、マネジメント可能な状況を維持・発展させていけるのではないかと思います。
ただし、Backstageを拡張するには、フロントエンドのReactの実装を修正していく必要があるため、Reactの経験がないチームには少し辛いかもしれませんね。

今回紹介したものはコア機能の1つです。多くのプラグインが開発されており、活用方法は無限大です。
次回は、Backstageのもう1つのコア機能であるテンプレート機能を利用して、実際にコンポーネントを作成し、Backstageのエンティティモデルの詳細を確認していきたいと思います。

---
参照資料

- [Backstageドキュメント](https://backstage.io/docs/overview/what-is-backstage)