---
title: Introduction to Nuxt3 (Part 7) - Using Nuxt3 Plugins & Middleware
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




In the previous session, we looked at error handling in Nuxt3.

This time, we will look at plugins and middleware.
Neither is mandatory, but if used effectively, they can make application development more efficient.

Plugins are executed at the initialization of a Nuxt application, and anything that will be used throughout the application should be defined here.

- [Nuxt3 Documentation - Plugin Directory](https://nuxt.com/docs/guide/directory-structure/plugins)

Middleware is executed during page routing and is used for preventing invalid transitions or changing the destination based on conditions.

- [Nuxt3 Documentation - Middleware Directory](https://nuxt.com/docs/guide/directory-structure/middleware)

Both plugins and middleware have been present since Nuxt2, but their usage has slightly changed in Nuxt3.

## Plugins

As mentioned, plugins are executed at the initialization of a Nuxt application. By default, they are executed on both the server-side and client-side.
To create a plugin in Nuxt3, you only need to place it in the `plugins` directory. In Nuxt2, in addition to this, you had to list the plugins you were using in `nuxt.config.ts`, but this is not necessary in Nuxt3.

:::column:Controlling the Execution Order of Plugins
All plugins under the `plugins` directory are targeted for execution[^1].
In the case of multiple plugins, they are executed in alphabetical order. If there is a dependency between plugins or a need to ensure a specific order, you may need to prefix the file names with numbers or find another solution.

[^1]: They are not scanned recursively. If you have a nested structure, you need to place an `index.ts` in the subdirectory and re-export the plugins.
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

In Nuxt3, you implement the plugin inside defineNuxtPlugin.
Although a return value is not mandatory, here we are adding a yen method to the Nuxt application.

By placing this file under `plugins` and running the Nuxt application, the utility method can be used inside Vue components.
Specifically, it looks like this:

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

As shown above, the utility added by the plugin can be used from all Vue components (the method is prefixed with `$`).
Now, let's define a similar utility as a Vue [custom directive](https://vuejs.org/guide/reusability/custom-directives.html).

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

Here, we receive the Nuxt runtime context (nuxtApp) as an argument.
We added a custom directive (`yen`) to the Vue application contained in this NuxtApp.

This works by specifying it from a Vue template as follows:

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

Vue custom directives are specified with a `v-` prefix. In the example above, it is `v-yen`.

:::column:Limiting the Execution Environment of Plugins
The plugins introduced here need to be executed on both the client and server sides, but depending on what you create, you might want it to run in only one environment.
In such cases, you can control this as in Nuxt2 by the file name. Client-side plugins use `<plugin>.client.ts`, and server-side plugins use `<plugin>.server.ts` to limit the execution environment.
:::

## Middleware

Next, let's talk about middleware.
As mentioned, middleware is executed when page routing occurs. This is the same for both server-side and client-side.

Below is a quote from Nuxt's [official documentation](https://nuxt.com/docs/guide/directory-structure/middleware#middleware-directory), but middleware can be created in three ways:

1. Anonymous (inline) route middleware: Embedded within the page component
2. Named route middleware: Created in the `middleware` directory and specified in the page component where you want to execute the middleware
3. Global route middleware: Executed at all routing times. Create a file with a `.global.ts` suffix in the `middleware` directory.

Here, we will create a named route middleware.
Assuming an admin page (`/admin`), this page cannot be displayed unless the query parameter (token) contains a specific string (test).
Place the following file (`auth.ts`) under the `middleware` directory.

```typescript
export default defineNuxtRouteMiddleware((to, from) => {
  const { token } = to.query;
  if (!token) {
    return abortNavigation(
      createError({ statusCode: 403, message: 'Not authenticated' })
    );
  }
  if ((Array.isArray(token) ? token[0] : token) !== 'test') {
    return navigateTo("/");
  }
});
```

The middleware is described inside defineNuxtRouteMiddleware. Here, we are doing the following:

- If the token parameter is missing, return a 403 (Forbidden) error using [abortNavigation](https://nuxt.com/docs/api/utils/abort-navigation) (display error page)[^2]
- If the token parameter string is incorrect, redirect to the top page using [navigateTo](https://nuxt.com/docs/api/utils/navigate-to)

[^2]: If the argument is omitted, it results in a 404 error.

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

Specify the target middleware using [definePageMeta](https://nuxt.com/docs/api/utils/define-page-meta) Composable (extension is omitted).
Now, when you run the Nuxt application, accessing `/admin` without a query parameter will show the error page, and `/admin?test=foo` will redirect you to the top page.

:::column:Middleware Behavior with Static Hosting
In Nuxt2, for static hosting (`npm run generate`), there was an issue where middleware did not execute on the client-side during the initial load. However, in Nuxt3, middleware is executed during generate as well as during initial load hydration.

However, the page generated before hydration is briefly displayed, and its HTML content can be viewed using Dev tools.
If such behavior is not acceptable, it may be necessary to consider other methods, such as excluding the relevant page from the generate target.
:::

## Summary

In this session, we introduced plugins and middleware that extend the Nuxt application and add individual processing during routing.
Both are commonly used in practical applications, so it's something you'll want to grasp in Nuxt3.

Although it's more advanced, there's also a method to extend Nuxt at the build level using Nuxt Kit modules.

- [Nuxt3 Documentation - Module Author Guide](https://nuxt.com/docs/guide/going-further/modules)
