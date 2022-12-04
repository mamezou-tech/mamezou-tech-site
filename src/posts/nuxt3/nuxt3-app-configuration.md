---
title: Nuxt3入門(第5回) - アプリケーションの設定情報を管理する
author: noboru-kudo
date: 2022-10-16
templateEngineOverride: md
tags: [SSG, SSR]
prevPage: ./src/posts/nuxt3/nuxt3-routing.md
nextPage: ./src/posts/nuxt3/nuxt3-error-handling.md
---

[前回](/nuxt/nuxt3-routing/)はNuxt3のルーティング機能について見てきました。

今回はNuxt3が提供する設定情報の管理機能を見ていきます。
Nuxt3では、アプリケーションの設定はRuntime Config(またはApp Config)を通して管理され、グローバルに参照できます。
とはいえ、パスワード等の機密性の高い設定は、ブラウザ上では参照不可とするべきです。
このため、Nuxtでは設定情報をpublic/privateで区別し、privateな設定はサーバーサイドでのみ参照可能となるセキュリティ面も配慮されています。

なお、ここでいう設定情報はNuxt自体のものではなく、アプリケーション内で利用する設定情報です。

[[TOC]]

## Runtime Config

Nuxt3で導入されたApp Configは後述しますが、アプリケーションの設定は基本的にはRuntime Configを使います。
Runtime Configは、アプリケーションの`nuxt.config.ts`に記述します。

以下はサンプルの記述例です。

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    // public設定
    public: {
      foo: 'foo-setting',
    },
    // private設定
    secret: 'my-secret-value',
    db: {
      user: 'mamezou',
      password: 'super-secret'
    },
  }
})
```
`runtimeConfig`配下に任意の設定値をキーバリューで記述します。任意の階層でネストして記述も可能です。

`runtimeConfig.public`配下に記述するとpublicな設定となり、サーバーサイド、クライアントサイド双方で参照可能です。
一方で`runtimeConfig`直下に記述した場合はprivateな設定となり、サーバーサイドでのみ参照可能となります。

実際にpublic/privateの違いを確認するために、以下のVueコンポーネントを作成します。

```html
<script setup lang="ts">
const runtimeConfig = useRuntimeConfig();
const env = process.server ? 'Server' : 'Client';
console.log(`[${env}] public.foo: ${runtimeConfig.public.foo}`);
console.log(`[${env}] secret: ${runtimeConfig.secret}`);
console.log(`[${env}] db.user: ${runtimeConfig.db?.user}`);
console.log(`[${env}] db.password: ${runtimeConfig.db?.password}`);
</script>

<template>
  <div>No Contents</div>
</template>
```

Nuxtが提供する[useRuntimeConfig](https://nuxt.com/docs/api/composables/use-runtime-config) Composableを利用して、Runtime Configを取得します。
もちろん、これもNuxt3のAuto Importの対象なのでimport文の記述は不要ですし、IDEのコード補完も有効です。

ここでは、先程設定した設定をコンソールログに出力するだけのものです。これでNuxtを起動すると出力結果は以下のようになります。

- サーバーサイド
```
[Server] public.foo: foo-setting
[Server] secret: my-secret-value
[Server] db.user: mamezou
[Server] db.password: super-secret
```

- クライアントサイド(Dev Tool)
```
[Client] public.foo: foo-setting
[Client] secret: undefined
[Client] db.user: undefined
[Client] db.password: undefined
```

サーバーサイドではprivateな設定を含め全て値が参照できていますが、クライアントサイドではpublicな設定のみ参照可能で、privateな設定はundefinedと参照不可となっています。
このようにpublic/privateを使い分けることで、設定情報の機密レベルに応じた可視性の調整が可能になります。

なお、ここではVueコンポーネントで確認しましたが、Runtime Configは`server`に配置したサーバーサイドのAPIからも参照可能です。

:::info
ここでは説明しませんでしたが、Runtime Configにはpublic/private以外にもデフォルトでappネームスペースとしてbaseURL等の設定が含まれています。
これらもpublic同様にクライアントサイドへ公開されます。

appネームスペースの詳細は[公式ドキュメント](https://nuxt.com/docs/api/configuration/nuxt-config#runtimeconfig)を参照してください。
:::

## 環境変数による切り替え
先程は`nuxt.config.ts`のRuntime Configとして設定情報を記述することで、アプリケーションの任意の場所で設定値を参照できることを確認しました。

一般的にアプリケーションは開発、テスト、商用環境等のステージに応じて各種設定が異なることが多いかと思います。
`nuxt.config.ts`は通常のTypeScriptソースコードでもありますので、切替ロジックを入れることはできますがスマートな方法とは言えません。
また、`nuxt.config.ts`はソースコード管理の対象に含まれますので、機密性の高い設定値を直接記述するのは理想的なやり方とは言えません。

このような状況でよく使わる手段はOSの環境変数です。Nuxtでも環境変数のサポートがあります。

- [Nuxt3ドキュメント - Runtime Config - Environment Variables](https://nuxt.com/docs/guide/going-further/runtime-config#environment-variables)

環境変数でRuntime Configを上書きする場合は、環境変数に`NUXT_`をプリフィックス(デフォルト)として、設定値のキーを大文字のスネークケースに変換して指定します[^1]。

[^1]: ネストした構造の場合は`.`を`_`に変換します。

先程privateな設定として記述した`secret`を環境変数で上書きする場合は、以下のようになります。

```shell
# 開発時
NUXT_SECRET=local-secret npm run dev

# サーバーサイドレンダリング
npm run build
NUXT_SECRET=prod-secret node .output/server/index.mjs

# プリレンダリング
NUXT_SECRET=prod-prerendering-secret npm run generate
# dist配下をホスティング
```

このようにすると、`runtimeConfig.secret`はそれぞれの環境変数値で上書きされます。
注意点としては、環境変数のみではRuntime Configに反映されません。値は空文字でもいいので、Runtime Configへのフォールバック指定は必要です。

:::column:dotenvサポート
環境変数が多い場合は、以下のように.envファイルを用意して、取り込むことが可能です(dotenvサポート)。

```text
NUXT_SECRET=prod-secret
```

ただし、dotenvサポートが有効なのはビルド時のみです。
ビルド後にサーバーサイドで実行する場合は、`source .env && node .output/server/index.mjs`等、.envファイルの内容を環境変数として設定する必要があります。
:::

## App Config

先程のRuntime Configは開発モード(`npm run dev`)で起動した場合、`nuxt.config.ts`の変更を検知するとNuxtアプリケーションは再起動します。
このため、アプリケーションの規模によっては、変更反映まで時間がかかります。

この点を解消するために、Nuxt3では新しくApp Configが導入されました。

- [Nuxt3ドキュメント - App Config File](https://nuxt.com/docs/guide/directory-structure/app.config)

App Configは、`nuxt.config.ts`ではなく、専用のファイル`app.config.ts`を作成します。

```typescript
export default defineAppConfig({
  bar: 'app-config-value',
})
```

defineAppConfigを使い、その中に設定情報を記述します。こちらもRuntime Config同様にネストした構造も可能です。
注意点として、App ConfigはRuntime Configのようにprivate/publicの区別がなく、クライアントサイドにも公開されます。機密性の高い情報はここではなく、Runtime Configのprivateな設定とする必要があります。

これを利用するコードは以下のようになります。

```typescript
const appConfig = useAppConfig();
console.log(`[${env}] bar: ${appConfig.bar}`);
```

Nuxtが提供する[useAppConfig](https://nuxt.com/docs/api/composables/use-app-config) Composableを使ってApp Configを取得します。
設定値の参照はRuntime Configと同じで、IDEのコード補完も有効です。 

App Configは開発モードで実行(`npm run dev`)した場合に、HMR(Hot Module Replacement)が有効となり、ソースコード同様に変更はすぐに反映されます。
このため、ローカル環境での開発体験としてはより良いものとなっています。

ただし、現時点(RC.11)ではApp Configの設定を環境変数で置換できませんでした。
App Configは、環境依存でない設定が対象で、どちらかというとソースコードに近い扱いとなっているようです(HMR重視)。

App Configは最近導入されており、GAバージョンでは変更があるかもしれません(GAバージョンリリース次第見直し予定です)。
利用時には最新の状況をご確認ください。

## まとめ

今回はNuxt3が提供する設定情報について見てきました。
public/privateによる設定情報の可視性制御や、環境変数による切り替えは抑えておきたいポイントです。

次回はエラーハンドリングについて見ていきます。
