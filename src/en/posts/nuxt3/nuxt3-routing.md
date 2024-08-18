---
title: Introduction to Nuxt3 (Part 4) - Understanding Nuxt's Routing
author: noboru-kudo
date: 2022-10-09T00:00:00.000Z
tags:
  - SSG
  - SSR
prevPage: ./src/posts/nuxt3/nuxt3-universal-fetch.md
nextPage: ./src/posts/nuxt3/nuxt3-app-configuration.md
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](/nuxt/nuxt3-routing).
:::



In the previous session, we made it possible for the sample blog site application to fetch blog information via an API.

This time, we will look into routing used for page transitions in Nuxt applications. Similar to Nuxt2, in Nuxt development, there is no need to create routing definitions individually. Nuxt adopts file system-based routing, where the route mapping is determined by the structure under the `pages` directory.

## Basics of Routing

As mentioned earlier, by default, Nuxt automatically generates route mappings based on the file structure. The `pages` directory of the demo blog site we created had the following structure:

```
pages
├── index.vue
└── details.vue
```

With this arrangement, Nuxt creates the following mappings (path -> page component) as Vue Router definitions in the background:

- / -> pages/index.vue
- /details -> pages/details.vue

Of course, nested directory structures are also possible.

```
pages
└── foo
    └── bar.vue
```

With this structure, /foo/bar maps to pages/foo/bar.vue. This is something familiar to those who have worked with Nuxt2.

## Page Switching Programmatically

So far, we have been using [NuxtLink] for page transitions. This is a Vue component built into Nuxt. Of course, it is also possible to switch pages programmatically without using NuxtLink. In this case, use the navigateTo function built into Nuxt.

```html
<script setup lang="ts">
const navigate = () => {
  return navigateTo({
    path: '/foo/bar',
    query: {
      baz: 'programmatic-navigation'
    }
  });
}
</script>

<template>
  <div>
    <button @click="navigate">Page Transition Programmatically</button>
  </div>
</template>
```

Like other Nuxt core APIs, navigateTo is subject to Auto Import, so it can be described without import. Note that when using navigateTo, you must use await or return the result of navigateTo as the return value of the function.

## Catch-All Route

This is a route for when there is no matching mapping (Catch-all Route). In Nuxt3, you create a page component with the file name `[...slug].vue`. The part of slug can be any string.

The page component to be created is a normal Vue component like below.

```html
<template>
  <p>{{ $route.params.slug }} Catch-all Route</p>
</template>
```

It's a simple component with only a template. The part of `route.params.slug` contains an array of paths (separated by `/`) as can be inferred from the file name's spread operator. This catch-all page component can be placed in any directory to limit its scope to that path.

Moreover, although you cannot specify the scope, creating a `pages/404.vue` page component allows you to specify it as a catch-all route for the entire site.

## Dynamic Routing

For simple apps, this may be sufficient, but for practical applications, there are quite a few cases where you want to dynamically map routes using path parameters. The demo app's blog detail page (details.vue) was switching the content of the blog to be displayed using query parameters, but here we change it to path parameters.

- Before change: /details?id=1
- After change: /details/1

To create dynamic routing in Nuxt3, configure it like this:

```
pages
├── index.vue
└── details
    └── [id].vue
```

While Nuxt2 used an underscore as in `pages/details/_id.vue`, Nuxt3 has changed to enclose path parameters with `[]` as in `pages/details/[id].vue`. This style applies not only to file names but also to directory names.

With this configuration, Nuxt creates the following mappings:

- / -> pages/index.vue (unchanged)
- /details/:id -> pages/details/[id].vue

The second definition becomes Vue Router's dynamic routing (`id` parameter).

We modify index.vue to use this path parameter.

```html
<script setup lang="ts">
const { data: articles, refresh } = await useFetch('/api/blogs');
</script>

<template>
  <div>
    <p>New Articles!!</p>
    <ul>
      <li v-for="article in articles" :key="article.id">
        <!-- Changed below -->
        <NuxtLink :to="`/details/${article.id}`">{{ article.title }}</NuxtLink>
        <!-- Also possible
        <NuxtLink :to="{ name: 'details-id', params: { 'id': article.id }}">{{ article.title }}</NuxtLink>
        -->
      </li>
    </ul>
    <button @click="refresh()">Fetch Latest Information</button>
    <Advertisement />
  </div>
</template>
```

The `to` property of `NuxtLink` has been changed to a path parameter. The `details/[id].vue` side will look like this:

```html
<script setup lang="ts">
const route = useRoute();
// Retrieve id from path parameter
const { id } = route.params;
const { data: article } = await useFetch(`/api/blogs/${id}`);
</script>

<template>
  <div>
    <article v-if="article">
      <p>Title: {{ article.title }}</p>
      <hr />
      <div style="width: 500px">{{ article.content }}</div>
    </article>
    <NuxtLink to="/">Back</NuxtLink>
    <Advertisement />
  </div>
</template>
```

It's basically the same as details.vue, but the part that was obtained as query parameters (route.query) has been changed to path parameters (`route.params`). With this, building the Nuxt application will enable page transitions using path parameters.

## Custom Mapping Rules

So far, we have looked at Nuxt's file system-based routing, but it is also possible to create custom mapping rules.

- [Nuxt Documentation - Router Options]

Here, we make it possible to access /foo/bar (`pages/foo/bar.vue`) based on Nuxt's file system-based routing also with /foo/baz.

To do this, place a `router.options.ts` in the `app` directory at the project root.

```typescript
import type { RouterOptions } from '@nuxt/schema'
import { RouterOptions as VueRouterOptions } from "vue-router";

export default <RouterOptions> {
  routes(_routes: VueRouterOptions['routes']) {
    return [..._routes, {
      path: '/foo/baz',
      component: () => import('~/pages/foo/bar.vue')
    }];
  }
}
```

The argument to the routes function is the file system-based route mapping created by Nuxt. Here, in addition, we added the route for /foo/baz. The way to describe custom routes is based on Vue Router. For details, see [Vue Router's official documentation].

This allows /foo/baz to map to pages/foo/bar.vue, and page transitions with custom paths are possible via NuxtLink or navigateTo.

- /foo/bar -> pages/foo/bar.vue (Nuxt default)
- /foo/baz -> pages/foo/bar.vue (Added custom route)

Of course, you can also modify the above logic to exclude the default route provided by Nuxt.

:::info
In addition to directly extending Vue Router, there is also a method using Nuxt Hook (`pages:extend`). For details, see the official documentation below.

- [Nuxt Doc - Custom Routing - Pages Hook]

## Summary

This time, we looked at an overview of routing provided by Nuxt. With Nuxt's default file system-based routing, mapping descriptions are unnecessary, and it can accommodate various use cases.

Next time, we plan to focus on configuration information used in Nuxt applications.
