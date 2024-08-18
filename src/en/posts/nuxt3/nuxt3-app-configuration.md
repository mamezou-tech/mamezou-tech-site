---
title: >-
  Introduction to Nuxt3 (Part 5) - Managing Application Configuration
  Information
author: noboru-kudo
date: 2022-10-16T00:00:00.000Z
tags:
  - SSG
  - SSR
prevPage: ./src/posts/nuxt3/nuxt3-routing.md
nextPage: ./src/posts/nuxt3/nuxt3-error-handling.md
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](/nuxt/nuxt3-app-configuration/).
:::



In the previous article, we looked at the routing functionality of Nuxt3.

This time, we will explore the configuration management feature provided by Nuxt3. In Nuxt3, application settings are managed through Runtime Config (or App Config) and can be globally referenced. However, sensitive settings such as passwords should not be accessible in the browser. Therefore, Nuxt distinguishes between public and private settings, with private settings only being accessible on the server side, considering security aspects.

Note that the settings mentioned here are not for Nuxt itself but for the application using Nuxt.

## Runtime Config

Although we will discuss App Config introduced in Nuxt3 later, the application settings are primarily managed through Runtime Config. Runtime Config is written in the application's `nuxt.config.ts`.

Below is an example of the configuration.

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    // public settings
    public: {
      foo: 'foo-setting',
    },
    // private settings
    secret: 'my-secret-value',
    db: {
      user: 'mamezou',
      password: 'super-secret'
    },
  }
})
```
You can write any configuration values under `runtimeConfig` as key-value pairs. It is also possible to nest the configuration at any level.

Configuration under `runtimeConfig.public` becomes public, accessible on both server and client sides. On the other hand, configuration directly under `runtimeConfig` becomes private, accessible only on the server side.

To verify the difference between public and private, create the following Vue component.

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

Using the [useRuntimeConfig](https://nuxt.com/docs/api/composables/use-runtime-config) Composable provided by Nuxt, you can retrieve the Runtime Config. This is also subject to Nuxt3's Auto Import, so there's no need to write import statements, and IDE code completion is also effective.

Here, we only output the configured settings to the console log. When Nuxt is started, the output results are as follows:

- Server-side
```
[Server] public.foo: foo-setting
[Server] secret: my-secret-value
[Server] db.user: mamezou
[Server] db.password: super-secret
```

- Client-side (Dev Tool)
```
[Client] public.foo: foo-setting
[Client] secret: undefined
[Client] db.user: undefined
[Client] db.password: undefined
```

On the server side, all values including private settings can be referenced, but on the client side, only public settings are accessible, and private settings are undefined and inaccessible. Thus, using public/private allows for adjusting the visibility of configuration information according to its confidentiality level.

Note that although we verified using a Vue component here, Runtime Config is also accessible from server-side APIs placed in `server`.

:::info
We did not explain here, but Runtime Config also includes default settings such as baseURL in the app namespace, which are also published to the client side like public settings.

For details on the app namespace, please refer to the [official documentation](https://nuxt.com/docs/api/configuration/nuxt-config#runtimeconfig).
:::

## Switching with Environment Variables
Earlier, we confirmed that setting information as Runtime Config in `nuxt.config.ts` allows referencing configuration values anywhere in the application.

Typically, applications have different settings for development, testing, production environments, etc. Although it is possible to include switching logic in `nuxt.config.ts` since it is regular TypeScript code, it is not the most elegant method. Also, `nuxt.config.ts` is included in source code management, so directly writing sensitive configuration values is not ideal.

A commonly used method in such situations is OS environment variables. Nuxt also supports environment variables.

- [Nuxt3 Documentation - Runtime Config - Environment Variables](https://nuxt.com/docs/guide/going-further/runtime-config#environment-variables)

To overwrite Runtime Config with environment variables, prefix the environment variable with `NUXT_` (default) and convert the configuration key to uppercase snake case[^1].

[^1]: For nested structures, replace `.` with `_`.

To overwrite the previously mentioned private setting `secret` with an environment variable, it would be as follows.

```shell
# During development
NUXT_SECRET=local-secret npm run dev

# For server-side rendering
npm run build
NUXT_SECRET=prod-secret node .output/server/index.mjs

# For pre-rendering
NUXT_SECRET=prod-prerendering-secret npm run generate
# Host under dist
```

By doing so, `runtimeConfig.secret` will be overwritten with the respective environment variable value. Note that the environment variable alone does not reflect in Runtime Config. Even if the value is an empty string, specifying a fallback in Runtime Config is necessary.

:::column:dotenv support
If there are many environment variables, you can prepare a .env file like below and import it (dotenv support).

```text
NUXT_SECRET=prod-secret
```

However, dotenv support is only active during build time. If executing on the server side after building, you need to set the contents of the .env file as environment variables, such as using `source .env && node .output/server/index.mjs`.
:::

## App Config

The Runtime Config discussed earlier restarts the Nuxt application upon detecting changes in `nuxt.config.ts` when launched in development mode (`npm run dev`). Depending on the scale of the application, this can take time to reflect changes.

To address this, Nuxt3 introduced a new App Config.

- [Nuxt3 Documentation - App Config File](https://nuxt.com/docs/guide/directory-structure/app.config)

App Config is created in a dedicated file `app.config.ts`, not in `nuxt.config.ts`.

```typescript
export default defineAppConfig({
  bar: 'app-config-value',
})
```

Use defineAppConfig and write the configuration information inside. Like Runtime Config, nested structures are also possible. Note that App Config does not distinguish between private/public like Runtime Config, and is published to the client side. Sensitive information should be placed in the private settings of Runtime Config.

The code to use this configuration is as follows.

```typescript
const appConfig = useAppConfig();
console.log(`[${env}] bar: ${appConfig.bar}`);
```

Using the [useAppConfig](https://nuxt.com/docs/api/composables/use-app-config) Composable provided by Nuxt, you can retrieve the App Config. Configuration value references are the same as Runtime Config, and IDE code completion is also effective.

In development mode (`npm run dev`), HMR (Hot Module Replacement) is enabled for App Config, and changes are reflected immediately, just like source code changes. Therefore, the local development experience is improved.

However, as of the current point (RC.11), it was not possible to replace App Config settings with environment variables. App Config targets settings that are not environment-dependent, treating them more like source code (focusing on HMR).

App Config was introduced recently, and there may be changes in the GA version (to be reviewed upon the release of the GA version). Please check the latest situation when using it.

## Summary

This article explored the configuration information provided by Nuxt3. Controlling the visibility of configuration information through public/private and switching with environment variables are key points to remember.

Next time, we will look into error handling.
