---
title: Nuxt.js×SupabaseでAuth認証機能を実装しよう
author: takafumi-okubo
date: 2026-01-09
tags: [nuxt, vue, Supabase, auth]
image: true
---

# はじめに
こんにちは。
最近、個人開発でNuxt.jsを使ったWebアプリ開発をしています。サーバーサイドをどうしようかと検討したところ、Supabaseというフルスタックバックエンドサービスが話題になっていることを知りました。
- 公式サイト：[https://supabase.com/](https://supabase.com/)

どうやらFirebaseの代替として注目を集めているバックエンドサービスで、モダンなアプリケーション開発に必要な機能を包括的に提供しているようです。
Nuxt.jsにSupabaseを導入して認証まで意外と簡単にできたので、自分のメモがてら紹介しようと思います。

本記事ではNuxt.jsにSupabaseを導入する方法、そしてメールアドレスによる認証機能の実装方法を紹介します。

# Supabaseとは
Supabaseは、PostgreSQLをベースにしたオープンソースのBaaS（Backend as a Service）プラットフォームです。このプラットフォームはリアルタイムデータベース、認証、ストレージなど多様な機能を提供しています。
Supabaseを使えば、バックエンドを自分で開発することなく、すぐにデータベースやユーザー認証を導入でき、フロントエンドの開発だけに集中できます。

SQLが使えるのでデータ管理がしやすく、オープンソースで自由度が高いです。
何より（制限はありますが）無料プランで利用可能なところが魅力的です。

Supabaseの各機能の詳細については、公式ドキュメントや多くの解説記事がありますのでぜひ併せて参照してみてください。個人的には、これほど多機能でありながら導入が驚くほどスムーズで、開発者にとって非常に使い勝手の良いサービスだと感じました。

# Supabase導入方法
それではNuxt.jsにSupabaseを導入してみましょう。まず前提として、下記は既に行っているとします。
- [公式サイト](https://supabase.com/)でユーザー登録をしていること
- プロジェクトを立ち上げて使用するデータベースがSupabase内にあること

まだの方はSupabaseと調べれば色々と出てきますので試してみてください。思ったよりも簡単に登録できると思います。

supabaseを導入前の開発環境が下記になっているとします。
```json:package.json
"dependencies": {
	"@nuxt/scripts": "0.12.1",
	"@nuxt/ui": "4.0.1",
	"@tailwindcss/vite": "^4.1.18",
	"nuxt": "^4.2.2",
	"tailwindcss": "^4.1.18",
	"vue": "^3.5.26",
	"vue-router": "^4.6.4"
},
"devDependencies": {
	"nuxt-icon": "1.0.0-beta.7",
	"typescript": "^5.9.3"
}
```
この状況で、下記コマンドを実行してsupabaseをインストールします。
（※パッケージ管理ツールとしてはpnpmを使用していますが、npmやyarnでも問題ありません）
```bash
pnpm install @nuxtjs/supabase @supabase/supabase-js
```
インストールしたら、nuxt.config.tsに`@nuxtjs/supabase`を追加します。
```ts:nuxt.config.ts
import tailwindcss from "@tailwindcss/vite"

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['./app/assets/css/main.css'],
  vite: {
        plugins: [tailwindcss()],
  },
  modules: [
	'@nuxtjs/supabase', // これを新しく入れる
	'@nuxt/ui',
	'nuxt-icon',
  ]
})
```
次に、Supabaseで作成したプロジェクトのProject URLやAPI Keyを取得します。「Project Settings > Data API」や「Project Settings > API Keys」を確認してみましょう。
- Project Settings > Data API
![Project Settings > Data API](/img/blogs/2026/0109_nuxt_supabase_auth/data_api_url.png)
- Project Settings > API Keys
![Project Settings > API Keys](/img/blogs/2026/0109_nuxt_supabase_auth/api_key.png)

.envファイルを新規作成して、確認したProject URLやAPI KEYを追加します。
```env:.env
SUPABASE_URL=<Project URL>
SUPABASE_KEY=<Publishable key>
SUPABASE_SECRET_KEY=<Secret keys>
```
:::info
envで設定しているプロパティ名はデフォルトの名称を使用しています。
[https://supabase.nuxtjs.org/getting-started/introduction#options](https://supabase.nuxtjs.org/getting-started/introduction#options)
もしプロパティ名を別の名前にしたい場合は、nuxt.config.tsにて下記のようにsupabaseのオプションを設定してください。
```ts:nuxt.config.ts
export default defineNuxtConfig({
  // ...
  supabase: {
    // Options
  }
}

```
:::
ここまで準備できたら、コマンドプロンプトで下記コマンドを実行してSupabaseの初期化とデータベース接続するために認証します。
```bash
npx supabase init
npx supabase login
```
これでSupabaseの導入は完了です。それではNuxt.jsでログインページを作成していきましょう。

# メールアドレスによる認証の実装
これから認証方法の実装に入りたいと思います。
Supabaseの認証方法はGoogleログイン認証やGitHubログイン認証など数多くありますが、今回はサクッと簡単に作りたいのでメールアドレス認証で作ろうと思います。
ページの作りとしては、[こちらのソースコード](https://github.com/nuxt-modules/supabase/tree/main/demo)が非常に参考になりましたので、こちらをベースに解説したいと思います。

Nuxt.js × Supabaseでは、（ログインしていない場合）デフォルトで`/login`にリダイレクトします。そのためpagesディレクトリには下記を作成する必要があります。
| vueファイル | 説明                           |
| ----------- | ------------------------------ |
| login.vue   | ログインや新規登録をするページ |
| index.vue   | ログインした後に遷移するページ |

またログアウトする機能も必要ですが、そちらはcomponentsディレクトリにAppHeaderコンポーネントを用意してヘッダーにログアウト機能を追加します。
| vueファイル   | 説明                                                 |
| ------------- | ---------------------------------------------------- |
| AppHeader.vue | ヘッダーコンポーネント。ログアウト機能を追加します。 |

## app.vue
pagesディレクトリに色々作成しないといけないので、まずapp.vueを下記のようにします。
```html:app.vue
<template>
    <UApp>
        <NuxtLayout>
            <NuxtPage></NuxtPage>
        </NuxtLayout>
    </UApp>
</template>
```

```html:layouts/default.vue
<template>
    <div>
        <AppHeader />

        <UMain>
            <slot />
        </UMain>
    </div>
</template>

```
:::info
`<UApp>`や`<NuxtLayout>`などはNuxtUIというライブラリのUIコンポーネントです。
下記では特に断りなくNuxtUIのコンポーネント群を使用しています。
:::

## ログインページ
次にログインページを作成します。下記がlogin.vueの全体像です。
```ts:login.vue
<script setup lang="ts">
    import type { AuthError } from '@supabase/supabase-js';

    /** Supabaseクライアントのインスタンス */
    const supabase = useSupabaseClient();
    /** ログインユーザー情報 */
    const user = useSupabaseUser();
    /** 通知（トースト）機能の利用 */
    const toast = useToast();
    /** 表示モードの切り替え（in: ログイン、up: 新規登録）*/
    const sign = ref<'in' | 'up'>('in');

    watchEffect(() => {
        // ユーザーが認証済み（ログイン中）の場合、トップページへリダイレクト
        if (user.value) {
            return navigateTo('/');
        }
    });

    // フォームの入力項目定義
    const fields = [
        {
            name: 'email',
            label: 'Email',
            type: 'text' as const,
            placeholder: 'メールアドレスを入力してください',
            required: true,
        },
        {
            name: 'password',
            label: 'Password',
            type: 'password' as const,
            placeholder: 'パスワードを入力してください',
        },
    ];

    /**
     * メールアドレスとパスワードによるログイン処理
     *
     * @param email メールアドレス
     * @param password パスワード
     */
    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            displayError(error);
        }
    };

    /**
     * 新規ユーザー登録処理
     *
     * @param email メールアドレス
     * @param password パスワード
     */
    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) {
            displayError(error);
        } else {
            toast.add({
                title: 'Sign up successful',
                icon: 'i-lucide-check-circle',
                color: 'success',
            });
            await signIn(email, password);
        }
    };

    /**
     * 認証エラーをトースト通知として表示
     *
     * @param error Supabaseから返却される認証エラーオブジェクト
     */
    const displayError = (error: AuthError) => {
        toast.add({
            title: 'Error',
            description: error.message,
            icon: 'i-lucide-alert-circle',
            color: 'error',
        });
    };

    /**
     * フォーム送信時のハンドラー
     *
     * @param payload フォームから渡される入力データ（emailやpassword）
     */
    async function onSubmit(payload: any) {
        const email = payload.data.email;
        const password = payload.data.password;

        if (sign.value === 'in') {
            // ログインの場合
            await signIn(email, password);
        } else {
            // 新規登録の場合
            await signUp(email, password);
        }
    }
</script>
<template>
    <UContainer
        class="h-[calc(100vh-var(--ui-header-height))] flex items-center justify-center px-4"
    >
        <UPageCard class="max-w-sm w-full">
            <UAuthForm
                :title="sign === 'in' ? 'ログイン' : '新規登録'"
                icon="i-lucide-user"
                :fields="fields"
                @submit="onSubmit"
            >
                <template #description>
                    {{ sign === 'up' ? '既にアカウントをお持ちの方は' : '新規登録の場合は' }}
                    <UButton variant="link" class="p-0" @click="sign = sign === 'up' ? 'in' : 'up'">
                        こちら
                    </UButton>
                </template>
                <template #submit>
                    <div class="flex items-center justify-center">
                        <UButton type="submit" class="justify-center cursor-pointer w-80">
                            {{ sign === 'up' ? '新規登録' : 'ログイン' }}
                        </UButton>
                    </div>
                </template>
            </UAuthForm>
        </UPageCard>
    </UContainer>
</template>
```
コードを上から順を追って解説していきます。
最初にsupabaseクライアントの準備とログイン状態に応じたリダイレクト処理を行います。
```ts
    /** Supabaseクライアントのインスタンス */
    const supabase = useSupabaseClient();
    /** ログインユーザー情報 */
    const user = useSupabaseUser();
    /** 通知（トースト）機能の利用 */
    const toast = useToast();
    /** 表示モードの切り替え（in: ログイン、up: 新規登録）*/
    const sign = ref<'in' | 'up'>('in');

    watchEffect(() => {
        // ユーザーが認証済み（ログイン中）の場合、トップページへリダイレクト
        if (user.value) {
            return navigateTo('/');
        }
    });
```
またログインフォーム（UIコンポーネント`UAuthForm`）に渡すための入力項目を定義します。
```ts
    // フォームの入力項目定義
    const fields = [
        {
            name: 'email',
            label: 'Email',
            type: 'text' as const,
            placeholder: 'メールアドレスを入力してください',
            required: true,
        },
        {
            name: 'password',
            label: 'Password',
            type: 'password' as const,
            placeholder: 'パスワードを入力してください',
        },
    ];
```
次にSupabaseのauthライブラリを用いた認証部分の実装をします。
ログイン処理では`signInWithPassword`メソッド、新規登録には`signUp`メソッドを使用して、引数にはemailとpasswordを指定します。
```ts
    /**
     * メールアドレスとパスワードによるログイン処理
     *
     * @param email メールアドレス
     * @param password パスワード
     */
    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            displayError(error);
        }
    };

    /**
     * 新規ユーザー登録処理
     *
     * @param email メールアドレス
     * @param password パスワード
     */
    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) {
            displayError(error);
        } else {
            toast.add({
                title: 'Sign up successful',
                icon: 'i-lucide-check-circle',
                color: 'success',
            });
            await signIn(email, password);
        }
    };
```
エラー時にはトースト通知として表示するようにメソッドを作っています。
```ts
    /**
     * 認証エラーをトースト通知として表示
     *
     * @param error Supabaseから返却される認証エラーオブジェクト
     */
    const displayError = (error: AuthError) => {
        toast.add({
            title: 'Error',
            description: error.message,
            icon: 'i-lucide-alert-circle',
            color: 'error',
        });
    };
```
フォームの送信ボタンが呼ばれたら、表示モードの状態に合わせて上記の`signIn`メソッドと`signUp`メソッドが呼ばれるようにします。
```ts
    /**
     * フォーム送信時のハンドラー
     *
     * @param payload フォームから渡される入力データ（emailやpassword）
     */
    async function onSubmit(payload: any) {
        const email = payload.data.email;
        const password = payload.data.password;

        if (sign.value === 'in') {
            // ログインの場合
            await signIn(email, password);
        } else {
            // 新規登録の場合
            await signUp(email, password);
        }
    }
```
最後にNuxtUIを利用してログイン用のテンプレートを作成します。表示モードに合わせてログインか新規登録を切り替えるようにしました。
```ts
<template>
    <UContainer
        class="h-[calc(100vh-var(--ui-header-height))] flex items-center justify-center px-4"
    >
        <UPageCard class="max-w-sm w-full">
            <UAuthForm
                :title="sign === 'in' ? 'ログイン' : '新規登録'"
                icon="i-lucide-user"
                :fields="fields"
                @submit="onSubmit"
            >
                <template #description>
                    {{ sign === 'up' ? '既にアカウントをお持ちの方は' : '新規登録の場合は' }}
                    <UButton variant="link" class="p-0" @click="sign = sign === 'up' ? 'in' : 'up'">
                        こちら
                    </UButton>
                </template>
                <template #submit>
                    <div class="flex items-center justify-center">
                        <UButton type="submit" class="justify-center cursor-pointer w-80">
                            {{ sign === 'up' ? '新規登録' : 'ログイン' }}
                        </UButton>
                    </div>
                </template>
            </UAuthForm>
        </UPageCard>
    </UContainer>
</template>
```
最終的に出来上がったテンプレート部分が下記になります。
![ログインページ](/img/blogs/2026/0109_nuxt_supabase_auth\login_page.png)

## メインページ
次にログイン後に遷移するメインページを作成します。今回は例としてユーザーが書いたブログ記事の一覧を表示するページを作成しています。
```ts:index.vue
<script setup lang="ts">
    import type { Database } from '#build/types/supabase-database';
    import type { TableColumn } from '@nuxt/ui';

    /** Supabaseクライアントのインスタンス */
    const client = useSupabaseClient<Database>();
    /** ログインユーザー情報 */
    const user = useSupabaseUser();

    /**
     * 記事一覧の取得
     */
    const { data: articles } = await useAsyncData(
        'articles',
        async () => {
            const { data } = await client
                .from('article')
                .select('*')
                .eq('uuid', user.value!.sub)
                .order('regist_date');
            return data ?? [];
        },
        { default: () => [] }
    );

    /**
     * テーブルのカラム定義
     */
    const columns: TableColumn<any, any>[] = [
        { accessorKey: 'id', header: 'ID' },
        { accessorKey: 'regist_date', header: '日付' },
        { accessorKey: 'title', header: 'タイトル' },
        { accessorKey: 'abstract', header: '概要' },
    ];
</script>
<template>
    <UContainer>
        <UPageSection title="記事一覧" description="最新記事を表示します" headline="ブログ">
            <div class="flex justify-center items-center">
                <div v-if="articles.length > 0">
                    <UCard variant="subtle">
                        <UTable :data="articles" :columns="columns"> </UTable>
                    </UCard>
                </div>
            </div>
        </UPageSection>
    </UContainer>
</template>
```
コードを上から順を追って解説していきます。
最初にログインページと同じようにsupabaseクライアントを行います。
```ts
    /** Supabaseクライアントのインスタンス */
    const client = useSupabaseClient<Database>();
    /** ログインユーザー情報 */
    const user = useSupabaseUser();
```
今回はSupabaseで作成したarticleテーブルのデータを表示する機能を実装します。そのため、Supabaseクライアントを生成する際に自動生成した型定義ファイルを適用して「Database型」を指定しています。こうすることでテーブル名やカラム名に入力補完が効くようになり、開発効率が格段にアップします。
:::info
型定義ファイルは下記コマンドを実行することによって自動生成できます。
```bash
npx supabase gen types typescript --project-id "<project_id>" --schema public > .\app\types\database.types.ts
```
:::
次に記事一覧を取得する機能を実装します。ログインユーザー情報`user`にあるuuidを`user.value!.sub`で取得して、下記のようにユーザーに紐づいている記事を取得するようにしました。
また記事一覧をテーブル形式で表示するために、テーブルのカラムを定義しています。`accessorKey`はarticleテーブルのカラムと一致するように設定して、`header`はテーブルのヘッダーに表示する名称を設定します。
```ts
    /**
     * 記事一覧の取得
     */
    const { data: articles } = await useAsyncData(
        'articles',
        async () => {
            const { data } = await client
                .from('article')
                .select('*')
                .eq('uuid', user.value!.sub)
                .order('regist_date');
            return data ?? [];
        },
        { default: () => [] }
    );

    /**
     * テーブルのカラム定義
     */
    const columns: TableColumn<any, any>[] = [
        { accessorKey: 'id', header: 'ID' },
        { accessorKey: 'regist_date', header: '日付' },
        { accessorKey: 'title', header: 'タイトル' },
        { accessorKey: 'abstract', header: '概要' },
    ];
```
最後にテンプレート部分を作成します。
```ts
<template>
    <UContainer>
        <UPageSection title="記事一覧" description="最新記事を表示します" headline="ブログ">
            <div class="flex justify-center items-center">
                <div v-if="articles.length > 0">
                    <UCard variant="subtle">
                        <UTable :data="articles" :columns="columns"> </UTable>
                    </UCard>
                </div>
            </div>
        </UPageSection>
    </UContainer>
</template>
```

## ヘッダーコンポーネント
最後にログアウト機能を実装します。こちらの機能はヘッダー部分（components > AppHeader.vue）に実装しました。
```ts:AppHeader.vue
<script setup lang="ts">
    /** Supabaseクライアントのインスタンス */
    const client = useSupabaseClient();
    /** ログインユーザー情報 */
    const user = useSupabaseUser();

    /**
     * ログアウト処理
     */
    const logout = async () => {
        await client.auth.signOut();
        navigateTo('/login');
    };
</script>
<template>
    <UHeader :toggle="false">
        <template #left>
            <span class="font-bold text-lg">Demo</span>
        </template>
        <template #right>
            <UButton v-if="user" variant="link" class="cursor-pointer" @click="logout">
                ログアウト
            </UButton>
            <UButton v-if="!user" variant="link" to="/login"> ログイン </UButton>
        </template>
    </UHeader>
</template>
```
ログアウト処理はかなり単純で、ただsupabaseクライアントで`signOut`メソッドを使って実装するだけです。あとはテンプレート部分にログアウトボタンを追加することで、ログアウトできてしまいます。
メインページと合わせて実際に出来たページがこちらになります。
![メインページ](/img/blogs/2026/0109_nuxt_supabase_auth/index_page.png)

以上でメールアドレスによる認証が実装できました。

## メールアドレスによる認証の検証
それでは実際に画面上で新規登録してみましょう。
ログインページでメールアドレスとパスワードを入力して新規登録ボタンを押すと、認証メールが届きます。
![認証メール](/img/blogs/2026/0109_nuxt_supabase_auth/auth_mail.png)
こちらの「Confirm your mail」のリンクを押すと、ユーザー登録が完了し、アプリのメインページにリダイレクトします。
またユーザ登録が完了しているかは、Supabaseで作成したプロジェクトの「Authentication > Users」で確認できます。データが列として入っている場合は登録が完了しています。まだリンクでの認証が済んでいない場合は、Last Sign Inの列でWaiting for verificationと表示されます。
![supabase Authentication Users](/img/blogs/2026/0109_nuxt_supabase_auth/user_table.png)

# まとめ
今回はNuxt.jsとSupabaseを組み合わせたauth認証の実装を解説しました。特に意識したところもなく、簡単にサクッと実装できたのが今回の驚きでした。
バックエンドの開発工数を最小限に抑えつつ、安全な認証を簡単に実装できるのはかなり魅力的ですね。
今回はメールアドレスによる認証のみ解説しましたが、他にもGoogleやGitHubなどの認証も簡単に導入できます。
よかったらそちらも試してみてください。

# 補足：ログインしないで閲覧できるページがほしい場合
基本的に、紹介した方法でNuxt.jsとSupabaseを利用した認証できます。しかし、こちらの方法だとログインをしていない場合、必ずログインページにリダイレクトされてしまいます。ですが、たまにログインしないでも閲覧できるページもほしい場合があると思います。
その時の設定方法も、実は非常に簡単でnuxt.config.tsに下記を付け足せばよいです。
```ts
export default defineNuxtConfig({
  // ~~~省略~~~
  supabase: { 
	redirectOptions: {
		login: '/login',
		callback: '/confirm',
		include: [],
		exclude: ['/'], // ここの部分がログインしなくても閲覧できるページ
		cookieRedirect: false,
	},
  },
  // ~~~省略~~~
})
```
こちらを設定すると、`exclude`の部分で設定したページについてはログインする必要はありません。

ぜひお試しください！

# 参考文献
- [Supabase公式サイト](https://supabase.com/)
- [Nuxt Supabase導入公式サイト](https://supabase.nuxtjs.org/getting-started/introduction)
  - ログインフォームを作る際にこのサイトで紹介しているDemoのソースコードが非常に参考になりました。
  - [Todo list example using Supabase and Nuxt 3](https://github.com/nuxt-modules/supabase/tree/main/demo)
- [Supabaseを布教したい](https://zenn.dev/kibe/articles/7a1dfc9bbd681c)
- [Supabaseとは？初心者向けに分かりやすく解説！](https://qiita.com/UKI_datascience/items/19d690753890b63a29c6)
- [Supabase + Nuxt 3でチャットアプリを作ってみた](https://zenn.dev/hamworks/articles/article1-supabase-nuxt)
- [Nuxt + Supabase で Googleログイン機能を作ってみる](https://zenn.dev/n4sh/articles/4c91b49e9b57af)
- [話題のSupabaseでサクッと認証機能をつくってみた！](https://qiita.com/kaho_eng/items/cb8d735b5b6ca1b3a6c5)
  - こちらはNext.jsによる実装ですが、参考になりました。
