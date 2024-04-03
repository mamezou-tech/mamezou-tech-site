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

:::alert
This article has been automatically translated.
The original article is [here](/nuxt/nuxt3-app-configuration/).
:::



In the last session, we looked at the routing functionality of Nuxt3.

This time, we will look at the configuration information management functionality provided by Nuxt3. In Nuxt3, application settings are managed through Runtime Config (or App Config) and can be referenced globally. However, settings with high confidentiality, such as passwords, should not be accessible on the browser. For this reason, Nuxt distinguishes between public and private settings, with private settings only being accessible on the server side, taking security into account.

It should be noted that the configuration information here is not for Nuxt itself but for settings used within the application.

## Runtime Config

Although App Config, which was introduced in Nuxt3, will be discussed later, application settings are primarily managed using Runtime Config. Runtime Config is described in the application's `nuxt.config.ts`.

Below is an example of a sample description.

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
You describe any configuration value under `runtimeConfig` as a key-value. It is also possible to nest descriptions at any level.

Descriptions under `runtimeConfig.public` become public settings, accessible on both the server and client sides. On the other hand, descriptions directly under `runtimeConfig` become private settings, accessible only on the server side.

To actually check the difference between public and private, create the following Vue component.

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

By using the [useRuntimeConfig](https://nuxt.com/docs/api/composables/use-runtime-config) Composable provided by Nuxt, you can obtain the Runtime Config. Of course, this is also subject to Nuxt3's Auto Import, so there's no need to write an import statement, and IDE code completion is also effective.

Here, we only output the settings we set earlier to the console log. With this, when you start Nuxt, the output results will be as follows:

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

On the server side, all values including private settings can be referenced, but on the client side, only public settings are accessible, and private settings are not accessible as undefined. In this way, using public/private allows for adjusting the visibility of configuration information according to the confidentiality level of the settings.

Note that here we checked using a Vue component, but Runtime Config can also be referenced from server-side APIs placed in `server`.

:::info
Although not explained here, Runtime Config also includes settings such as baseURL in the app namespace by default as public settings, which are also published to the client side.

For more details on the app namespace, please refer to the [official documentation](https://nuxt.com/docs/api/configuration/nuxt-config#runtimeconfig).
:::

## Switching with Environment Variables
Earlier, we confirmed that by describing configuration information as Runtime Config in `nuxt.config.ts`, you can refer to configuration values anywhere in the application.

Generally, applications have different settings depending on the stage, such as development, testing, and production environments. Although `nuxt.config.ts` is normal TypeScript source code, and you can insert switch logic, it's not a smart method. Moreover, `nuxt.config.ts` is included in source code management, so it's not ideal to directly describe highly confidential settings.

A commonly used method in such situations is OS environment variables. Nuxt also supports environment variables.

- [Nuxt3 Documentation - Runtime Config - Environment Variables](https://nuxt.com/docs/guide/going-further/runtime-config#environment-variables)

To override Runtime Config with environment variables, prefix the environment variable with `NUXT_` (default) and convert the key of the configuration value to uppercase snake case[^1].

[^1]: For nested structures, convert `.` to `_`.

For example, to override the `secret` described earlier as a private setting with an environment variable, it would be as follows.

```shell
# During development
NUXT_SECRET=local-secret npm run dev

# Server-side rendering
npm run build
NUXT_SECRET=prod-secret node .output/server/index.mjs

# Pre-rendering
NUXT_SECRET=prod-prerendering-secret npm run generate
# Hosting under dist
```

By doing this, `runtimeConfig.secret` will be overwritten with the respective environment variable values. Note that just environment variables will not reflect in Runtime Config. Even if the value is an empty string, a fallback specification to Runtime Config is necessary.

:::column:dotenv support
If there are many environment variables, you can prepare a .env file as follows and import it (dotenv support).

```text
NUXT_SECRET=prod-secret
```

However, dotenv support is only active during build time. If you execute on the server side after building, you need to set the contents of the .env file as environment variables, such as `source .env && node .output/server/index.mjs`.
:::

## App Config

The Runtime Config mentioned earlier causes the Nuxt application to restart when changes to `nuxt.config.ts` are detected if started in development mode (`npm run dev`). Depending on the scale of the application, this can take time for changes to reflect.

To address this issue, Nuxt3 has introduced a new App Config.

- [Nuxt3 Documentation - App Config File](https://nuxt.com/docs/guide/directory-structure/app.config)

App Config is created not in `nuxt.config.ts` but in a dedicated file `app.config.ts`.

```typescript
export default defineAppConfig({
  bar: 'app-config-value',
})
```

You use defineAppConfig and describe the configuration information within it. Like Runtime Config, it is also possible to have a nested structure. Note that, unlike Runtime Config, App Config does not distinguish between private/public, and is published to the client side. Confidential information should not be here but in the private settings of Runtime Config.

The code to use this looks like the following.

```typescript
const appConfig = useAppConfig();
console.log(`[${env}] bar: ${appConfig.bar}`);
```

By using the [useAppConfig](https://nuxt.com/docs/api/composables/use-app-config) Composable provided by Nuxt, you can obtain the App Config. Reference to configuration values is the same as for Runtime Config, and IDE code completion is also effective.

In development mode (`npm run dev`), HMR (Hot Module Replacement) is enabled for App Config, and changes are reflected immediately, just like source code. Therefore, it provides a better development experience in the local environment.

However, as of the current point (RC.11), it was not possible to replace App Config settings with environment variables. App Config is targeted for settings that are not environment-dependent, and it seems to be treated more like source code (focusing on HMR).

App Config has been introduced recently, and there may be changes in the GA version (to be reviewed upon the release of the GA version). Please check the latest situation when using it.

## Summary

This time, we looked at the configuration information provided by Nuxt3. Points to keep in mind are the control of visibility of configuration information through public/private and switching with environment variables.

Next time, we will look at error handling.
