---
title: >-
  Introduction to Nuxt3 (Part 8) - Sharing State Across Components with Nuxt3's
  useState
author: noboru-kudo
date: 2022-10-28T00:00:00.000Z
tags:
  - SSG
  - SSR
prevPage: ./src/en/posts/nuxt3/nuxt3-plugin-middleware.md
nextPage: ./src/en/posts/nuxt3/nuxt3-serverless-deploy.md
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](/nuxt/nuxt3-state-management).
:::



In the [previous session](/nuxt/nuxt3-plugin-middleware/), we looked at the introduction of plugins and middleware in Nuxt3.

This time, we will look at state management provided by Nuxt3.

In Nuxt2, it was common to use [Vuex](https://vuex.vuejs.org/), which is bundled with Nuxt2, to share state between components.

In Nuxt3, Vuex is not included in the Nuxt core.
Instead, Nuxt3 now offers a new [useState](https://nuxt.com/docs/api/composables/use-state) Composable[^1].
useState does not have as many features as Vuex, but it is designed to be simple and easy to use for minimal needs.
It is practical enough for relatively simple data structures or small to medium-sized applications.

[^1]: There is a hook of the same name in React, but it is completely different.

:::info
For applications of a significant scale, it is advisable to consider using [Pinia](https://pinia.vuejs.org/).
It is provided as a Nuxt module.
For a comparison between useState and Pinia, please refer to the following article:

- [Nuxt 3 State Management: Pinia vs useState](https://www.vuemastery.com/blog/nuxt-3-state-mangement-pinia-vs-usestate/)

Refer to Pinia's documentation when introducing it.

- [Pinia Doc - Nuxt.js](https://pinia.vuejs.org/ssr/nuxt.html)
:::

## Disadvantages of ref/reactive

Vue3 is equipped with state management APIs such as [ref](https://vuejs.org/api/reactivity-core.html#ref) and [reactive](https://vuejs.org/api/reactivity-core.html#reactive), which are generally used within components.
When switching to other pages using [NuxtLink](https://nuxt.com/docs/api/components/nuxt-link), the components are unmounted, so the state is not retained.
Also, when using the state in a subcomponent, it is usually passed through props. If the state is updated in a subcomponent, an event is fired, and the data is updated by the parent component managing the data.
This is fine if the component structure is simple, but it becomes a cumbersome and redundant task when the component tree becomes three or four layers deep (often referred to as "prop drilling").

To avoid this, if you try to keep ref or reactive in a global area outside of components, problems arise in SSR frameworks like Nuxt.
The server-side application handles multiple users' requests with a single instance.
Therefore, if state management is attempted in a global area, that information is shared among all users (Cross-Request State Pollution).
Depending on the content of the data, this could lead to information leakage if it involves user-specific information.

Furthermore, in Nuxt's SSR, the initial load is rendered server-side, and then the same Vue components are initialized client-side (hydration).
For example, consider the following component:

```html
<script lang="ts" setup>
const result = ref<number>(heavyCompute());
function heavyCompute() {
  console.log('execute heavy calculation');
  // (heavy initialization process)
  return 1;
}
</script>
```

When this page is displayed, the heavyCompute method is executed on both the server-side and the client-side.

![ref/reactive init](https://i.gyazo.com/485f02505b5f9e6dc9e9aa603c6221ee.png)

Lightweight initializations like constants are not a problem, but this is not efficient otherwise. It is ideal to use the results executed on the server-side directly for client-side hydration.

## Overview of useState

Let's try using useState. First, let's check the interface of useState.
It looks like this:

```typescript
export declare function useState<T>(key?: string, init?: (() => T | Ref<T>)): Ref<T>;
export declare function useState<T>(init?: (() => T | Ref<T>)): Ref<T>;
```

useState serves both to create and retrieve state. It returns the current state based on the key (key) and initialization process (init).

If the key is omitted, a random value is assigned. It can be used for state that is only used within the component.
init is executed only if the state has not been initialized. This includes cases where it has been executed on the server-side.
That is, if init has been executed on the server-side, it will not be executed on the client-side.

![useState init](https://i.gyazo.com/2a5ac32818c2757f65924017802d3500.png)

As you can see, compared to the previous ref/reactive, useState is a more SSR-friendly API.

## Trying out useState

Now, let's try using useState.
Here, we define a global state variable for login user information using useState so that it can be used across multiple components.

The first page (`pages/user.vue`) is as follows:

```html
<script lang="ts" setup>
const user = useState<{ id: string, name: string, mail: string }>('login-user', () => {
  console.log('retrieving user info...')
  return {
    id: '012345',
    name: 'Mamezou',
    mail: 'nuxt-developer@mamezou.com'
  };
})
</script>

<template>
  <div>
    <h1>Implementation Example of useState</h1>
    <NuxtLink to="/user-detail">{{ user.name }}'s Detail Page</NuxtLink>
  </div>
</template>
```

At the beginning of the setup, useState is used to initialize the user information. Here it is a fixed value, but in actual operation, it is assumed to be obtained from an external authentication system.
In the template, NuxtLink is used to navigate to the user detail page (`pages/user-detail.vue`).
The user detail page is as follows:

```html
<script lang="ts" setup>
const user = useState('login-user')
</script>

<template>
  <div>
    <p>User ID: {{ user.id }}</p>
    <p>User Name: {{ user.name }}</p>
    <p>Email Address: {{ user.mail }}</p>
  </div>
</template>
```

The same key specified earlier in useState is used to retrieve and display the user information.

When you build and run the Nuxt application and display `/user` from the browser, then display the detail page from the page link:

- /user
![user page](https://i.gyazo.com/abf0fe6da3b8e47bb71eaa1adf10dc3a.png)
- /user-detail
![user detail](https://i.gyazo.com/c8c71a8f822c74719de7eee5ca803c6b.png)

The user information initialized on the user page is displayed on the detail page across pages.
The log (`retrieving...`) for retrieving user information is output on the server-side console, but not on the client-side.
This means that the init process is executed only once on the server-side.

When checking the HTML rendered server-side, it looked like this (formatted and excerpted only the necessary parts):
```html
<!DOCTYPE html>
<html data-head-attrs="">
<head>
  <!-- omitted -->
</head>
<body data-head-attrs="">
<div id="__nuxt">
  <div data-v-433a9abd>
    <!-- omitted -->
  </div>
</div>
<script>window.__NUXT__ = {
  data: {},
  // State initialized server-side
  state: {"$slogin-user": {id: "012345", name: "Mamezou", mail: "nuxt-developer@mamezou.com"}},
  _errors: {},
  serverRendered: true,
  config: {
    app: {baseURL: "\u002F", buildAssetsDir: "\u002F_nuxt\u002F", cdnURL: ""}
  }
}</script>
<script type="module" src="/_nuxt/@vite/client" crossorigin></script>
<script type="module"
        src="/_nuxt/sample-app/node_modules/nuxt/dist/app/entry.mjs"
        crossorigin></script>
</body>
</html>
```

Inside the script tag, you can see that the information initialized server-side is stored as state.
It seems that client-side hydration uses this as the initial value and skips the initialization process (init)[^2].
Thus, the content of the state is included in the rendering results, so it needs to be a serializable type (class or function is not possible).

[^2]: As for the internal implementation of useState in Nuxt, it seems to manage this state within the runtime context (NuxtApp) payload.

## Managing Global State with Composable in a Centralized Manner

There are the following problems with the previous useState:

- If the user detail page (`/user-details`), which omits the initialization process (init), is displayed directly, an error occurs during server-side rendering.
- The key (key) specified on each page is a simple string, so it is easy to typo.
- If multiple states are used, useState is scattered everywhere, making it difficult to overview the shared state management variables.

As mentioned in the [official documentation](https://nuxt.com/docs/getting-started/state-management#shared-state), it seems good to manage the state centrally like a Vuex store using Vue's Composition API.

Just create `composables/states.ts` and move the previous useState there.

```typescript
export const useLoginUser = () =>
  useState<{ id: string; name: string; mail: string }>("login-user", () => {
    console.log("retrieving user info...");
    return {
      id: "012345",
      name: "Mamezou",
      mail: "nuxt-developer@mamezou.com",
    };
  });
```

If you create multiple states, just add `use...`. This way, you can centrally manage global states here like Vuex.

Then, just replace useState in both `pages/user.vue`/`pages/user-detail.vue` with the above.
`pages/user-detail.vue` would look like this:

```html
<script lang="ts" setup>
// const user = useState('login-user')
// Replace with the following
const user = useLoginUser();
</script>
<template>
  <!-- (No change. Omitted) -->
</template>
```

This way, the user side does not need to worry about the value of the key, and even if the detail page is displayed directly, the initialization process is executed, and HTML is generated normally[^3].

[^3]: In the case of static hosting (`npm run generate`), the initialization process is executed at build time, so be aware of the freshness of the data.

## Summary

This time, we introduced how to share state using Nuxt3's useState.
I hope you realized that it is much easier to use than using Vuex or similar.
