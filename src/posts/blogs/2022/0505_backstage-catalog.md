---
title: Backstageで開発者ポータルサイトを構築する - カタログ作成
author: noboru-kudo
date: 2022-05-05
---

以前以下のブログで[Backstage](https://backstage.io/)の紹介と導入に関する記事を書きました。

- [Backstageで開発者ポータルサイトを構築する - 導入編](/blogs/2022/04/29/backstage-intro/)

今回はこの続きで、Backstageを利用して実際にコンポーネントを登録してみたいと思います。
ここでは、Backstageの以下のコア機能を利用します。

- [Software Catalog](https://backstage.io/docs/features/software-catalog/software-catalog-overview) : 各種開発リソースのカタログ管理
- [Software Templates](https://backstage.io/docs/features/software-templates/software-templates-index) : テンプレートからのカタログ生成

まず、Software Templatesを使って、アプリケーションのベースとなるテンプレートを作成します。
その後、そこからいくつかのコンポーネントを作成し、カタログメニュー(Software Catalog)からその構成を見ていきます。これについては前回もサンプルベースで触れたものです。

[[TOC]]

## Backstageのモデルを理解する

始める前にBackstageの根底にあるモデルについて確認しておきます。
Backstageでは、以下のエンティティを中心に開発リソースをモデル化します。

![backstage model relationship](https://i.gyazo.com/d18ae8ee315a1bd4e384c9051105d613.png)
引用元: [Backstage - System Model](https://backstage.io/docs/features/software-catalog/system-model#ecosystem-modeling)

- Component: ソフトウェアモジュール本体。Webサイトやバックエンドサービスに加えて各種ライブラリも含まれる。
- API: コンポーネントが公開するAPI。OpenAPI/AsyncAPI/GraphQL/gRPC。コンポーネントの境界を表す。
- Resource: コンポーネントが利用するインフラサービス。DB/S3/キュー等。
- System: 複数のComponentをまとめたもので、全体で1つのシステムを構成する(任意)。
- Domain: システムが取り扱うビジネスドメイン(任意)。

Component/API/Resourceはコアエンティティと呼ばれるものです。これらをまとめる補助的なものとしてSystem/Domainを利用します。

また、このエンティティ群は前回も触れたGroup/Userエンティティと関連付けることで、各エンティティの所有者を明確にします。

エンティティの詳細はBackstageの[公式ドキュメント](https://backstage.io/docs/features/software-catalog/system-model)を参考にしてください。

## マスタ系のエンティティ定義を準備する

事前にGroup/Userや、System/Domainエンティティを作成しておきます。
前回Group/Userエンティティの保管用に作成したGitHubレポジトリ(`backstage-admin`)を以下の構成に変更します。

```
.
├── catalog-info.yaml
├── domains
│     └── sales.yaml
├── systems
│     └── sales-management.yaml
├── groups
│     ├── sales-po-team.yaml
│     ├── sales-unit.yaml
│     └── sample-dev-team.yaml
└── users
      └── kudoh.yaml
```

各ディレクトリ配下にDomain/System/Group/Userのエンティティ定義を作成します。
今回は販売管理ドメインを想定し、以下の内容としました。

| エンティティ | ファイル                          | 内容            |
|--------|-------------------------------|---------------|
| Domain | domains/sales.yaml            | 販売管理ドメイン      |
| System | systems/sales-management.yaml | 販売管理システム      |
| Group  | groups/sales-po-team.yaml     | 販売管理システムPOチーム |
| Group  | groups/sales-unit.yaml        | 営業部門(主管部署)    |
| Group  | groups/sample-dev-team.yaml   | 開発チーム         |
| User   | users/kudoh.yaml              | 開発者           |

各エンティティのフォーマットは[公式ドキュメント](https://backstage.io/docs/features/software-catalog/descriptor-format)を参照してください。

また、レポジトリルートに`catalog-info.yaml`を配置し、各エンティティの定義ファイルを集約しました。
以下の内容になります。

```yaml
apiVersion: backstage.io/v1alpha1
kind: Location
metadata:
  name: admin-entities
spec:
  type: url
  targets:
    # Domain/System
    - https://github.com/kudoh/backstage-admin/blob/main/domains/sales.yaml
    - https://github.com/kudoh/backstage-admin/blob/main/systems/sales-management.yaml
    # Group
    - https://github.com/kudoh/backstage-admin/blob/main/groups/sales-po-team.yaml
    - https://github.com/kudoh/backstage-admin/blob/main/groups/sales-unit.yaml
    - https://github.com/kudoh/backstage-admin/blob/main/groups/sample-dev-team.yaml
    # User
    - https://github.com/kudoh/backstage-admin/blob/main/users/kudoh.yaml
```

複数ファイルを集約する場合は、このLocationエンティティが利用できます。
このファイルの参照を前回作成済みのBackstageアプリの`app-config.local.yaml`に追加します。

```yaml
catalog:
  # (中略)
  locations:
    - type: url
      target: https://github.com/kudoh/backstage-admin/blob/main/catalog-info.yaml
      rules:
        - allow: [Location, Group, User, System, Template, Domain]
```

Locationエンティティの参照を追加し、Backstageアプリがここに定義したエンティティを読み込むようにします。
なお、今回初期セットアップで追加されているサンプルデモ用の参照は全て消しました。

Backstageは、このリソースを定期的にフェッチしていますので、このレポジトリを更新するとBackstageアプリ側のDBもしばらくすると同期されます。
Backstageアプリを再起動すると、追加したエンティティが取り込まれていることが分かります。
例えば、Systemエンティティの`sales-management`は以下のようになります。

![](https://i.gyazo.com/0859f7ea3f59dc6433d0c519dfd949ca.png)

## テンプレートを作成する

次にソフトウェアカタログのテンプレートを作成します。
ここではUIとしてVue.js、バックエンドサービスとしてExpressを利用したテンプレートを作成してみました[^1]。

[^1]: 今回は実際に動かすわけではないので中身は何でもいいのですが、Vue CLIやExpress Generatorで作成したものを用意しました。

先程のレポジトリルートに`templates/<name>/skeleton`ディレクトリを作成し、各々のテンプレートを配置します。
以下のような構成としました。

```
.
├── templates
│     ├── express-api
│     │     └── skeleton # Expressテンプレート
│     │          ├── README.md
│     │          ├── catalog-info.yaml
│     │          ├── package.json
│     │          └── (省略)
│     └── vue-spa
│         └── skeleton # Vue.jsテンプレート
│              ├── README.md
│              ├── catalog-info.yaml
│              ├── package.json
│              └── (省略)
└── (省略)
```

各テンプレートの中身は、ユーザーの入力内容を埋め込めるように、プレースホルダー化しておきます[^2]。
例えば、`package.json`は以下のようにしました。

[^2]: テンプレートエンジンには[Nunjucks](https://mozilla.github.io/nunjucks/)が使われています。NunjucksはJavaScriptで記述されたテンプレートエンジンです。当サイトでもこれを使用しています。

{% raw %}
```json
{
  "name": "${{ values.component_name }}",
  "description": "${{ values.description }}",
  (以下省略)
}
```
{% endraw %}

もう1つ重要なものは各テンプレート内に配置している`catalog-info.yaml`です。
ここにComponent/APIエンティティの内容を記述します。テンプレートから実際のカタログを作成する際、この情報をもとに各エンティティをBackstageアプリのDBに登録します。
Expressのテンプレートは、以下のようにしました。

{% raw %}
```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${{ values.component_name }}
  {%- if values.description %}
  description: ${{ values.description }}
  {%- endif %}
  annotations:
    github.com/project-slug: ${{ values.destination.owner + "/" + values.destination.repo }}
spec:
  type: service
  lifecycle: experimental
  owner: ${{ values.owner }}
  {%- if values.system %}
  system: ${{ values.system }}
  {%- endif %}
  {%- if values.provide_api %}
  providesApis: [${{ values.component_name }}-api]
  {%- endif %}
---
{%- if values.provide_api %}
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: ${{ values.component_name }}-api
  description: ${{ values.description }}
spec:
  type: openapi
  lifecycle: experimental
  owner: ${{ values.owner }}
  definition: |
    openapi: "3.1.0"
    info:
      version: 1.0.0
      title: ${{ values.component_name }} API
    paths: {}
{%- endif %}
```
{% endraw %}

ここで、カタログのComponent/APIエンティティを定義しています。

`metadata.name`や`spec.owner`等の一部の項目は、ユーザーからの入力値を設定を反映するようパラメータ化しています。
ここで設定している`values.xxxxx`の部分は、後述するTemplateエンティティで指定します。

また、APIエンティティについてはユーザーの選択(`values.provide_api`)によって追加可否を切り替えるようにしました。

Component/APIエンティティの詳細なフォーマットは、[公式ドキュメント](https://backstage.io/docs/features/software-catalog/descriptor-format#kind-component)を参照してください。

:::info
今回エンティティ内にOpenAPIの定義を埋め込んでいますが、一般的には別ファイルとして作成することが多いかと思います。 
この場合、エンティティ定義内に別ファイルの内容(OpenAPI以外も含めて)を取り込むことも可能です。
詳細は以下公式ドキュメントを参照してください。

- [Backstage - Substitutions In The Descriptor Format](https://backstage.io/docs/features/software-catalog/descriptor-format#substitutions-in-the-descriptor-format)
:::

## Templateエンティティを定義する

テンプレート本体の作成が終わりましたが、これだけではBackstageはこのテンプレートを認識しません。
これを行うにはSoftware Templates機能で提供するTemplateエンティティを作成する必要があります。
各テンプレートに`template.yaml`を作成します。

```
.
├── templates
│     ├── express-api
│     │     ├── template.yaml -> 追加
│     │     └── skeleton
│     │          └── (省略)
│     └── vue-spa
│           ├── template.yaml -> 追加
│           └── skeleton
│                └── (省略)
└── (省略)
```

このファイルにテンプレートのパラメータやカタログ作成時の振る舞いを指定していきます。
Expressの方のファイルの中身(`templates/express-api/template.yaml`)は、以下のようにしました。

{% raw %}
```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: express-api-template
  title: Express API Template
  description: ExpressフレームワークベースのREST APIを作成します。
  tags:
    - recommended
    - express
spec:
  owner: mamezou-tech # テンプレートの所有者
  type: service # 任意
  # 可変項目。ユーザー入力パラメータ
  parameters:
    - title: API基本情報
      required:
        - component_name
        - owner
      properties:
        component_name:
          title: コンポーネント名
          type: string
          description: ユニークなコンポーネント名を設定してください。
          ui:field: EntityNamePicker
        description:
          title: 説明
          type: string
          description: APIコンポーネントの説明を記述してください。
        owner:
          title: 所有者(Owner)
          type: string
          description: コンポーネントの所有者を入力してください。
          ui:field: OwnerPicker
          ui:options:
            allowedKinds:
              - Group
              - User
    - title: GitHubレポジトリ
      required:
        - repoUrl
      properties:
        repoUrl:
          title: レポジトリ名
          type: string
          ui:field: RepoUrlPicker
          ui:options:
            allowedHosts:
              - github.com
  # カタログ作成アクション
  steps:
    - id: template
      name: Fetch Skeleton + Template
      action: fetch:template
      input:
        url: ./skeleton
        values:
          component_name: ${{ parameters.component_name }}
          description: ${{ parameters.description }}
          destination: ${{ parameters.repoUrl | parseRepoUrl }}
          owner: ${{ parameters.owner }}

    - id: publish
      name: Publish
      action: publish:github
      input:
        allowedHosts: ["github.com"]
        description: This is ${{ parameters.component_name }}
        repoUrl: ${{ parameters.repoUrl }}
        defaultBranch: main

    - id: register
      name: Register
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps.publish.output.repoContentsUrl }}
        catalogInfoPath: "/catalog-info.yaml"
  # カタログ作成後の出力。作成後にUI表示される。
  output:
    links:
      - title: Repository
        url: ${{ steps.publish.output.remoteUrl }}
      - title: Open in catalog
        icon: catalog
        entityRef: ${{ steps.register.output.entityRef }}
```
{% endraw %}

詳細な説明は省きますが、重要なものは以下2つです。

### `spec.parameters`
コンポーネント作成時の可変項目を指定し、入力バリデーションを[JSON Schema](https://json-schema.org/)のフォーマットで記述します。
この内容はReactコンポーネントとしてユーザーへの入力フィールドに変換されます[^3]。

また、一部のフィールド(`EntityNamePicker`/`OwnerPicker`等)は、ユーザーの入力補助部品としてBackstageのカスタム部品が利用できます。
これらは`ui:field`と`ui:options`で指定すると有効になります。

各設定内容の詳細は[公式ドキュメント](https://backstage.io/docs/features/software-templates/writing-templates)を参照してください。

[^3]: 実際のフォーム部品への変換は[react-jsonschema-form](https://react-jsonschema-form.readthedocs.io/en/latest/)が使われています。

### `spec.steps`
テンプレートからの生成アクション[^4]を列挙します。ユーザーの入力が終わると、これらは指定した順序で実行されます。ここでは以下のことを行っています。

1. `template`: テンプレートを取得して、ユーザー入力内容を反映
2. `publish`: GitHubレポジトリを作成
3. `register`: Backstageアプリへのカタログ登録

[^4]: ここで使われているビルトインアクションは、Backstageアプリの`/create/actions`から詳細を参照できます(ローカルの場合は`http://localhost:3000/create/actions`)。

`1. template`では、`spec.parameters`で入力内容を取得し、テンプレートエンジンから実際のソースコードを作成します(`fetch:template`アクションの`values`で受け渡し)。

:::info
Templateエンティティの作成は、現状ドキュメントが充実していない印象です。Backstageのサンプルを参考に作成していくと効率的です。

- <https://github.com/backstage/software-templates>
:::

先程ルートに配置した`catalog-info.yaml`のLocationエンティティに、このTemplateエンティティの定義も追加しておきます。

```yaml
apiVersion: backstage.io/v1alpha1
kind: Location
metadata:
  name: admin-entities
spec:
  type: url
  targets:
    # (省略)
    # Template
    - https://github.com/kudoh/backstage-admin/blob/main/templates/express-api/template.yaml
    - https://github.com/kudoh/backstage-admin/blob/main/templates/vue-spa/template.yaml
```

ここまでの内容を、レポジトリにコミット＆プッシュしておきます。
しばらくするとTemplateエンティティの追加がBackstageに認識され、Templateエンティティとして追加されます。

![](https://i.gyazo.com/29bb78b225e926c5a3ee0b82a1670c90.png)

## テンプレートからコンポーネントを作成する

これで準備は完了しました。BackstageアプリのUIからコンポーネントを作成してみます。
BackstageのUIのメニューより`Create...`をクリックします。

![](https://i.gyazo.com/885801af8c07d4629d2c9306d8fd1dec.png)

先程選択したテンプレートが表示されますので、作成対象のテンプレートの`CHOOSE`を選択します。
その後は先程Templateエンティティの`spec.parameters`で指定した内容を順次入力していくだけです。
以下はExpressテンプレートでバックエンドサービスを作成したときのものです。

1. 基本情報入力
![](https://i.gyazo.com/e2270e1d6086b0f3b98ac580e021b662.png)

2. GitHubレポジトリ情報入力
![](https://i.gyazo.com/11a5cf7756c2dd7d602525c9cfb62196.png)

3. 内容確認
![](https://i.gyazo.com/630b07f17f75ff25c13b2a53bce16f12.png)

4. 作成完了
![](https://i.gyazo.com/5d62e752992fd98708c2f051bbb4051c.png)

作成が完了すると、GitHubレポジトリが作成され、Backstage上でもComponentやAPIとして確認できるようになります。

1. Component
![](https://i.gyazo.com/2fbf3a739280eb2c55d076048be05eb0.png)

2. API
![](https://i.gyazo.com/085244b0e17423fa98d265542d17ef94.png)

作成後は、各レポジトリでcatalog-info.yamlを修正します。
今回は追加で以下を修正しました。

- UIからバックエンドサービスのAPIに対して依存関係を追加(`consumesApis`)
- DBを表すResourceエンティティを作成し、バックエンドサービスの依存関係に追加(`dependsOn`)

最終的には以下の構成になりました。

![](https://i.gyazo.com/757f6e53dba769ffe9e31d3dc80314b2.png)

各エンティティの依存関係が俯瞰できますし、そのエンティティは誰が管理しているのかが確認できます。
これを見ればコンポーネントがどのAPIを提供していて、誰がこれを使っているのかすぐに分かります。

また、今回はOpenAPIの定義を記述しませんでしたが、これがあればAPIエンティティからその仕様が参照可能になります。さらに、ComponentエンティティはGitHubレポジトリに紐付いていますので、実装の詳細まで確認できます。

:::info
BackstageはGitHub以外にもVCSとしてGitLab、BitBucketにも対応しています。
:::

## まとめ

今回はBackstageを利用して、テンプレートからのカタログを作成と、ここで管理されるソフトウェアカタログのモデルを見てきました。
ソフトウェアエンジニアは開発対象のドメインのモデリングをしますが、このような部分は疎かになりがちです(最初に建て付けてもすぐに廃れがち)。
Backstageでの運用を組織内の標準化ルールとして徹底することで、システムの見通しが良くなり、副次的に最適化や改善プランの立案が容易になると思います。

また、今回紹介していませんが、ポータルサイトとして重要な串刺し検索機能や、開発ドキュメント管理機能もコア機能として利用できます。
これらをうまく活用すると、Backstageを中心とした全社レベルの開発者ポータルサイトが構築・運用できるのではないかと思います。

なお、Backstageはv1.0がリリースされたとは言え、まだまだアクティブに開発されており、ドキュメントも充実しているとは言えません。
場合によってはBackstageのソースコードを追う必要も出てきますので、利用前に一度検証しておくのが良さそうです。
