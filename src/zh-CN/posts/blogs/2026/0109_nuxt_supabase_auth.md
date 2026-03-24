---
title: 使用 Nuxt.js×Supabase 实现 Auth 认证功能
author: takafumi-okubo
date: 2026-01-09T00:00:00.000Z
tags:
  - nuxt
  - vue
  - Supabase
  - auth
image: true
translate: true

---

# 引言
大家好。  
最近，我在个人开发中使用 Nuxt.js 进行 Web 应用开发。在思考后端方案时，了解到一个名为 Supabase 的全栈后端服务备受关注。  
- 官方网站：[https://supabase.com/](https://supabase.com/)

它似乎作为 Firebase 的替代方案受到关注，为现代应用开发提供了所需的多种功能。我在 Nuxt.js 中集成 Supabase 并实现认证的过程出乎意料地简单，想借此做个笔记并与大家分享。

本文将介绍在 Nuxt.js 中集成 Supabase 的方法，以及实现基于电子邮件地址的认证功能。

# Supabase 是什么
Supabase 是一个基于 PostgreSQL 的开源 BaaS（Backend as a Service）平台。该平台提供实时数据库、认证、存储等多种功能。  
使用 Supabase 可以无需自行开发后端，立即引入数据库和用户认证，只需专注于前端开发。

由于可以使用 SQL，数据管理更加便捷，且开源度高，自由度大。最吸引人的是（虽有一定限制）可以在免费计划中使用。

有关 Supabase 各项功能的详细信息，请参阅官方文档及众多解说文章。我个人认为，它功能如此丰富却易于上手，对开发者来说非常友好。

# Supabase 集成方法
那么，我们开始在 Nuxt.js 中集成 Supabase。首先，假设已完成以下前提条件：

- 已在 [官方网站](https://supabase.com/) 注册用户  
- 已创建项目，并在 Supabase 中拥有要使用的数据库

如果还没有，可以搜索 Supabase，会出现很多相关信息，请尝试一下，我认为注册比想象中要简单。

假设在集成 supabase 前的开发环境如下：
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
在该环境下，执行以下命令安装 supabase：  
（※这里使用 pnpm 作为包管理工具，但 npm 或 yarn 也没有问题）
```bash
pnpm install @nuxtjs/supabase @supabase/supabase-js
```
安装完成后，在 `nuxt.config.ts` 中添加 `@nuxtjs/supabase`：
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
	'@nuxtjs/supabase', // 新增这一项
	'@nuxt/ui',
	'nuxt-icon',
  ]
})
```
接下来，获取在 Supabase 中创建的项目的 Project URL 和 API Key，请查看 “Project Settings > Data API” 和 “Project Settings > API Keys”：
- Project Settings > Data API  
  ![Project Settings > Data API](/img/blogs/2026/0109_nuxt_supabase_auth/data_api_url.png)
- Project Settings > API Keys  
  ![Project Settings > API Keys](/img/blogs/2026/0109_nuxt_supabase_auth/api_key.png)

新建 `.env` 文件，并添加已获取的 Project URL 和 API KEY：
```env:.env
SUPABASE_URL=<Project URL>
SUPABASE_KEY=<Publishable key>
```
:::info
在 env 中设置的属性名称使用默认名称。  
[https://supabase.nuxtjs.org/getting-started/introduction#options](https://supabase.nuxtjs.org/getting-started/introduction#options)  
如果想使用其他属性名称，请在 `nuxt.config.ts` 中按如下方式配置 supabase 选项：
```ts:nuxt.config.ts
export default defineNuxtConfig({
  // ...
  supabase: {
    // Options
  }
})
```
:::

至此，Supabase 集成完成。接下来，我们在 Nuxt.js 中创建登录页面。

# 基于电子邮件地址的认证实现
下面进入认证方法的实现。Supabase 提供多种认证方式，如 Google 登录认证、GitHub 登录认证等，这次为了快速简单，我们使用电子邮件地址认证。页面结构参考了 [此源码](https://github.com/nuxt-modules/supabase/tree/main/demo)，下面基于该示例进行讲解。

在 Nuxt.js × Supabase 中，若未登录会默认重定向到 `/login`。因此需要在 `pages` 目录下创建以下文件：
| vue文件     | 说明                   |
| ----------- | ---------------------- |
| login.vue   | 用于登录或注册的页面   |
| index.vue   | 登录后跳转的页面       |

另外还需要登出功能，可以在 `components` 目录下准备 `AppHeader` 组件，在头部添加登出功能：
| vue文件       | 说明                     |
| ------------- | ------------------------ |
| AppHeader.vue | 头部组件，添加登出功能。 |

## app.vue
由于需要在 `pages` 目录下创建多个文件，首先将 `app.vue` 设置如下：
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
`<UApp>` 和 `<NuxtLayout>` 等是 NuxtUI 库的 UI 组件。以下内容中未特别说明时均使用了 NuxtUI 的组件集。
:::

## 登录页面
接下来创建登录页面，下面是 `login.vue` 的整体代码：
```ts:login.vue
<script setup lang="ts">
    import type { AuthError } from '@supabase/supabase-js';

    /** Supabase 客户端实例 */
    const supabase = useSupabaseClient();
    /** 登录用户信息 */
    const user = useSupabaseUser();
    /** 使用通知（Toast）功能 */
    const toast = useToast();
    /** 切换显示模式（in：登录，up：注册） */
    const sign = ref<'in' | 'up'>('in');

    watchEffect(() => {
        // 如果用户已认证（已登录），重定向到主页
        if (user.value) {
            return navigateTo('/');
        }
    });

    // 表单输入字段定义
    const fields = [
        {
            name: 'email',
            label: 'Email',
            type: 'text' as const,
            placeholder: '请输入电子邮件地址',
            required: true,
        },
        {
            name: 'password',
            label: 'Password',
            type: 'password' as const,
            placeholder: '请输入密码',
        },
    ];

    /**
     * 基于电子邮件和密码的登录处理
     *
     * @param email 电子邮件地址
     * @param password 密码
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
     * 新用户注册处理
     *
     * @param email 电子邮件地址
     * @param password 密码
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
     * 将认证错误以 Toast 通知显示
     *
     * @param error 来自 Supabase 的认证错误对象
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
     * 表单提交时的处理函数
     *
     * @param payload 表单提交的输入数据（email 和 password）
     */
    async function onSubmit(payload: any) {
        const email = payload.data.email;
        const password = payload.data.password;

        if (sign.value === 'in') {
            // 登录情况
            await signIn(email, password);
        } else {
            // 注册情况
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
                :title="sign === 'in' ? '登录' : '注册'"
                icon="i-lucide-user"
                :fields="fields"
                @submit="onSubmit"
            >
                <template #description>
                    {{ sign === 'up' ? '已有账号的用户请' : '如果要注册请' }}
                    <UButton variant="link" class="p-0" @click="sign = sign === 'up' ? 'in' : 'up'">
                        这里
                    </UButton>
                </template>
                <template #submit>
                    <div class="flex items-center justify-center">
                        <UButton type="submit" class="justify-center cursor-pointer w-80">
                            {{ sign === 'up' ? '注册' : '登录' }}
                        </UButton>
                    </div>
                </template>
            </UAuthForm>
        </UPageCard>
    </UContainer>
</template>
```
下面按顺序对代码进行讲解。

首先进行 Supabase 客户端的准备，并根据登录状态执行重定向处理：
```ts
    /** Supabase 客户端实例 */
    const supabase = useSupabaseClient();
    /** 登录用户信息 */
    const user = useSupabaseUser();
    /** 使用通知（Toast）功能 */
    const toast = useToast();
    /** 切换显示模式（in：登录，up：注册） */
    const sign = ref<'in' | 'up'>('in');

    watchEffect(() => {
        // 如果用户已认证（已登录），重定向到主页
        if (user.value) {
            return navigateTo('/');
        }
    });
```
然后定义传递给登录表单（UI 组件 `UAuthForm`）的输入字段：
```ts
    // 表单输入字段定义
    const fields = [
        {
            name: 'email',
            label: 'Email',
            type: 'text' as const,
            placeholder: '请输入电子邮件地址',
            required: true,
        },
        {
            name: 'password',
            label: 'Password',
            type: 'password' as const,
            placeholder: '请输入密码',
        },
    ];
```
接下来实现使用 Supabase auth 库的认证部分，登录处理使用 `signInWithPassword` 方法，注册使用 `signUp` 方法，将 email 和 password 作为参数：
```ts
    /**
     * 基于电子邮件和密码的登录处理
     *
     * @param email 电子邮件地址
     * @param password 密码
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
     * 新用户注册处理
     *
     * @param email 电子邮件地址
     * @param password 密码
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
当出现错误时，构建了一个方法以 Toast 通知形式显示错误：
```ts
    /**
     * 将认证错误以 Toast 通知显示
     *
     * @param error 来自 Supabase 的认证错误对象
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
当表单提交时，根据显示模式调用上述 `signIn` 或 `signUp` 方法：
```ts
    /**
     * 表单提交时的处理函数
     *
     * @param payload 表单提交的输入数据（email 和 password）
     */
    async function onSubmit(payload: any) {
        const email = payload.data.email;
        const password = payload.data.password;

        if (sign.value === 'in') {
            // 登录情况
            await signIn(email, password);
        } else {
            // 注册情况
            await signUp(email, password);
        }
    }
```
最后使用 NuxtUI 创建登录模板，根据显示模式切换登录或注册：
```html
<template>
    <UContainer
        class="h-[calc(100vh-var(--ui-header-height))] flex items-center justify-center px-4"
    >
        <UPageCard class="max-w-sm w-full">
            <UAuthForm
                :title="sign === 'in' ? '登录' : '注册'"
                icon="i-lucide-user"
                :fields="fields"
                @submit="onSubmit"
            >
                <template #description>
                    {{ sign === 'up' ? '已有账号的用户请' : '如果要注册请' }}
                    <UButton variant="link" class="p-0" @click="sign = sign === 'up' ? 'in' : 'up'">
                        这里
                    </UButton>
                </template>
                <template #submit>
                    <div class="flex items-center justify-center">
                        <UButton type="submit" class="justify-center cursor-pointer w-80">
                            {{ sign === 'up' ? '注册' : '登录' }}
                        </UButton>
                    </div>
                </template>
            </UAuthForm>
        </UPageCard>
    </UContainer>
</template>
```
最终生成的模板如下所示：  
![登录页面](/img/blogs/2026/0109_nuxt_supabase_auth/login_page.png)

## 主页面
接下来创建登录后跳转的主页面。这次示例为显示用户所写博客文章列表的页面：
```ts:index.vue
<script setup lang="ts">
    import type { Database } from '#build/types/supabase-database';
    import type { TableColumn } from '@nuxt/ui';

    /** Supabase 客户端实例 */
    const client = useSupabaseClient<Database>();
    /** 登录用户信息 */
    const user = useSupabaseUser();

    /**
     * 获取文章列表
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
     * 表格列定义
     */
    const columns: TableColumn<any, any>[] = [
        { accessorKey: 'id', header: 'ID' },
        { accessorKey: 'regist_date', header: '日期' },
        { accessorKey: 'title', header: '标题' },
        { accessorKey: 'abstract', header: '摘要' },
    ];
</script>
<template>
    <UContainer>
        <UPageSection title="文章列表" description="显示最新文章" headline="博客">
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
下面按顺序解释代码。

首先，与登录页面一样初始化 Supabase 客户端：
```ts
    /** Supabase 客户端实例 */
    const client = useSupabaseClient<Database>();
    /** 登录用户信息 */
    const user = useSupabaseUser();
```
这次实现显示在 Supabase 中创建的 `article` 表数据的功能。因此，在生成 Supabase 客户端时应用了自动生成的类型定义文件并指定为 `Database` 类型。这样一来，表名和列名可以获得代码补全，大幅提升开发效率。  
:::info
可以通过 Supabase CLI 生成类型定义文件。  
首先执行以下命令登录并初始化 Supabase：
```bash
npx supabase login
npx supabase init
```
然后执行以下命令生成类型定义文件：
```bash
npx supabase gen types typescript --project-id "<project_id>" --schema public > .\app\types\database.types.ts
```
:::
接下来实现获取文章列表功能。通过 `user.value!.sub` 获取登录用户信息中的 uuid，并按如下方式获取与用户关联的文章。同时，为了以表格形式显示文章列表，定义了表格列。`accessorKey` 设置为与 `article` 表的列一致，`header` 设置为表格头部显示的名称：
```ts
    /**
     * 获取文章列表
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
     * 表格列定义
     */
    const columns: TableColumn<any, any>[] = [
        { accessorKey: 'id', header: 'ID' },
        { accessorKey: 'regist_date', header: '日期' },
        { accessorKey: 'title', header: '标题' },
        { accessorKey: 'abstract', header: '摘要' },
    ];
```
最后创建模板部分：
```html
<template>
    <UContainer>
        <UPageSection title="文章列表" description="显示最新文章" headline="博客">
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

## 头部组件
最后实现登出功能，此功能在头部部分（`components > AppHeader.vue`）中实现：
```ts:AppHeader.vue
<script setup lang="ts">
    /** Supabase 客户端实例 */
    const client = useSupabaseClient();
    /** 登录用户信息 */
    const user = useSupabaseUser();

    /**
     * 登出处理
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
                登出
            </UButton>
            <UButton v-if="!user" variant="link" to="/login"> 登录 </UButton>
        </template>
    </UHeader>
</template>
```
登出处理非常简单，只需使用 Supabase 客户端的 `signOut` 方法实现即可。然后在模板部分添加登出按钮，就能完成登出操作。结合主页面，实际效果如下所示：  
![主页面](/img/blogs/2026/0109_nuxt_supabase_auth/index_page.png)

至此，基于电子邮件的认证实现完成。

## 基于电子邮件地址的认证验证
现在在界面上实际进行注册试用。在登录页面输入电子邮件地址和密码并点击注册按钮后，会收到认证邮件：  
![认证邮件](/img/blogs/2026/0109_nuxt_supabase_auth/auth_mail.png)  
点击邮件中的 “Confirm your mail” 链接后，用户注册完成，并重定向到应用的主页面。

此外，可以在 Supabase 项目的 “Authentication > Users” 中确认用户注册是否完成。如果表格中已有数据，则表示注册已完成。若尚未通过链接验证，则在 Last Sign In 列会显示 Waiting for verification。  
![supabase Authentication Users](/img/blogs/2026/0109_nuxt_supabase_auth/user_table.png)

# 总结
这次介绍了 Nuxt.js 与 Supabase 结合的 auth 认证实现。最令人惊讶的是，感觉几乎无需额外关注，便能快速轻松完成实现。  
在将后端开发工作量降至最低的同时，轻松实现安全认证，确实非常有吸引力。  
这次只讲解了基于电子邮件的认证，其他如 Google 或 GitHub 等认证也能轻松集成。如果有兴趣，也请试试。

# 补充：如果希望无需登录也能浏览的页面
基本上，按照上述方法可实现在 Nuxt.js 与 Supabase 中的认证。但在此方法中，若未登录，始终会被重定向到登录页面。然而，有时也希望某些页面无需登录即可访问。  
其实此时的配置方法也非常简单，只需在 `nuxt.config.ts` 中添加以下内容：
```ts
export default defineNuxtConfig({
  // ~~~省略~~~
  supabase: { 
	redirectOptions: {
		login: '/login',
		callback: '/confirm',
		include: [],
		exclude: ['/'], // 此处配置为无需登录即可访问的页面
		cookieRedirect: false,
	},
  },
  // ~~~省略~~~
})
```
这样配置后，对于 `exclude` 中指定的页面，无需登录即可访问。

欢迎尝试！

# 参考文献
- [Supabase 官方网站](https://supabase.com/)
- [Nuxt Supabase 集成官方文档](https://supabase.nuxtjs.org/getting-started/introduction)
  - 在创建登录表单时，此站点所示的 Demo 源码非常有参考价值。  
  - [Todo list example using Supabase and Nuxt 3](https://github.com/nuxt-modules/supabase/tree/main/demo)
- [想要推广 Supabase](https://zenn.dev/kibe/articles/7a1dfc9bbd681c)
- [什么是 Supabase？面向初学者的简明解说！](https://qiita.com/UKI_datascience/items/19d690753890b63a29c6)
- [使用 Supabase + Nuxt 3 构建聊天应用](https://zenn.dev/hamworks/articles/article1-supabase-nuxt)
- [Nuxt + Supabase で Googleログイン機能を作ってみる](https://zenn.dev/n4sh/articles/4c91b49e9b57af)
- [在热门 Supabase 上快速构建认证功能！](https://qiita.com/kaho_eng/items/cb8d735b5b6ca1b3a6c5)
  - 虽然这是基于 Next.js 的实现，但也很有参考价值。
