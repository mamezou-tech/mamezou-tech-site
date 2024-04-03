---
title: Introduction to Nuxt3 (Part 7) - Using Nuxt3 Plugins and Middleware
author: noboru-kudo
date: 2022-10-23T00:00:00.000Z
tags:
  - SSG
  - SSR
prevPage: ./src/posts/nuxt3/nuxt3-error-handling.md
nextPage: ./src/posts/nuxt3/nuxt3-state-management.md
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](/nuxt/nuxt3-plugin-middleware).
:::



In the last session, we looked at error handling in Nuxt3.

This time, we will explore plugins and middleware. Neither are strictly required, but if used effectively, they can make application development more efficient.

Plugins are executed at the initialization of the Nuxt application, and anything that will be used throughout the application should be defined here.

- [Nuxt3 Documentation - Plugin Directory](https://nuxt.com/docs/guide/directory-structure/plugins)

Middleware is executed during page routing, and is used to prevent invalid transitions or to switch the destination depending on certain conditions.

- [Nuxt3 Documentation - Middleware Directory](https://nuxt.com/docs/guide/directory-structure/middleware)

Both plugins and middleware have been around since Nuxt2, but their usage has slightly changed in Nuxt3.

## Plugins

As mentioned, plugins are executed at the initialization of the Nuxt application. By default, they are executed on both the server-side and the client-side. To create a plugin in Nuxt3, simply place it in the `plugins` directory. In Nuxt2, in addition to this, it was necessary to list the plugins to be used in `nuxt.config.ts`, but this is not required in Nuxt3.

:::column:Controlling the execution order of plugins
All plugins under the `plugins` directory are executed[^1].
In the case of multiple plugins, they are executed in alphabetical order. If there is a dependency between plugins or if the order needs to be guaranteed for any reason, it is necessary to devise a strategy such as prefixing the file name with a number.

[^1]: It does not recursively scan. If you have a nested structure, you need to place an `index.ts` directly under the subdirectory and re-export the plugin.
:::

Here, we will add a utility method to format Japanese yen to the Nuxt application.

- [Nuxt3 Documentation - useNuxtApp - provide](https://nuxt.com/docs/api/composables/use-nuxt-app#provide-name-value)

The plugin implementation looks like this:

```typescript
export default defineNuxtPlugin(() => {
  return {
    provide: {
      yen(value: string){
        if (!value) return '';
        const number = Number(value);
        if (isNaN(number)) return '';
        return number.toLocaleString() + '円';
      }
    }
  }
});
```

In Nuxt3, plugins are implemented within defineNuxtPlugin. The return value is not mandatory, but here we are adding a yen method to the Nuxt application.

By placing this file under `plugins` and running the Nuxt application, the utility method can be used within Vue components. Specifically, it looks like this:

```html
<script setup lang="ts">
const price = ref('1000');
// Use in script
const { $yen } = useNuxtApp();
console.log($yen(price.value));
</script>

<template>
  <div>
    <input type="text" v-model="price" />
    <!-- Use in template -->
    <p>{{ $yen(price) }}</p>
  </div>
</template>
```

All Vue components can use the utility added by the plugin (methods are prefixed with `$`). Now, let's define a similar utility with Vue's [custom directive](https://vuejs.org/guide/reusability/custom-directives.html).

The plugin source code looks like this:

```typescript
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive("yen", (el, { value }) => {
    if (!value) {
      el.textContent = "";
      return;
    }
    const number = Number(value);
    if (isNaN(number)) {
      el.textContent = "";
    } else {
      el.textContent = number.toLocaleString() + "円";
    }
  });
});
```

Here, we receive the Nuxt runtime context (nuxtApp) as an argument. We added a custom directive (`yen`) to the Vue application contained in this NuxtApp.

This works by specifying it from the Vue template as follows:

```html
<script setup lang="ts">
const price = ref(1000);
</script>

<template>
  <div>
    <input type="text" v-model="price" />
    <!-- Custom directive -->
    <p v-yen="price" />
  </div>
</template>
```

Vue's custom directives are specified with the `v-` prefix. In the example above, it becomes `v-yen`.

:::column:Limiting the execution environment of plugins
The plugins introduced here need to be executed on both the client and server sides, but depending on what you create, you may want it to run only in one environment. In such cases, as in Nuxt2, you can control this with the file name. Client-side plugins use `<plugin>.client.ts`, and server-side plugins use `<plugin>.server.ts` to limit the execution environment.
:::

## Middleware

Next, let's talk about middleware.
As mentioned earlier, middleware is executed when page routing occurs. This is the same for both server-side and client-side.

The following is quoted from Nuxt's [official documentation](https://nuxt.com/docs/guide/directory-structure/middleware#middleware-directory), but there are three ways to create middleware:

1. Anonymous (inline) route middleware: Embedded within the page component
2. Named route middleware: Created in the `middleware` directory and specified in the page component where you want to execute the middleware
3. Global route middleware: Executed during all routings. Create a file with a `.global.ts` suffix in the `middleware` directory.

Here, we will create a named route middleware. Assuming an admin page (`/admin`), this page is not accessible unless the query parameter (token) contains a specific string (test). Place the following file (`auth.ts`) under the `middleware` directory.

```typescript
export default defineNuxtRouteMiddleware((to, from) => {
  const { token } = to.query;
  if (!token) {
    return abortNavigation(
      createError({ statusCode: 403, message: 'Unauthorized' })
    );
  }
  if ((Array.isArray(token) ? token[0] : token) !== 'test') {
    return navigateTo("/");
  }
});
```

Middleware is described within defineNuxtRouteMiddleware. Here, we are doing the following:

- If there is no token parameter, return a 403 (Forbidden) error using [abortNavigation](https://nuxt.com/docs/api/utils/abort-navigation) (display error page)[^2]
- If the token parameter's string is invalid, redirect to the top page using [navigateTo](https://nuxt.com/docs/api/utils/navigate-to)

[^2]: If you omit the argument, it results in a 404 error.

The admin page (`pages/admin.vue`) that uses this looks like this:

```html
<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})
</script>

<template>
  <div>Admin Page</div>
</template>
```

Specify the target middleware using the [definePageMeta](https://nuxt.com/docs/api/utils/define-page-meta) Composable (extension omitted).
Running the Nuxt application now will display the error page when accessing `/admin` without a query parameter, and redirect to the top page if `/admin?test=foo`.

:::column:Middleware behavior in Static Hosting
In Nuxt2, when using Static Hosting (`npm run generate`), there was an issue where middleware was not executed on the client-side during the initial load. However, in Nuxt3, middleware is executed during generate as well as during the initial load and hydration.

However, the page generated before hydration is briefly displayed, and you can see the HTML content by looking at the Dev tools, etc. If this behavior is not acceptable, you may need to consider another method, such as excluding the relevant page from the generate target.
:::

## Summary

In this session, we introduced plugins and middleware that extend the Nuxt application and add individual processing during routing. Both are commonly used in practical applications, so they are worth mastering in Nuxt3.

Although it's more advanced, there is also a method to extend Nuxt at the build level using Nuxt Kit modules.

- [Nuxt3 Documentation - Module Author Guide](https://nuxt.com/docs/guide/going-further/modules)
