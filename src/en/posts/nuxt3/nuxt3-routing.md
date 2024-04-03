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

:::alert
This article has been automatically translated.
The original article is [here](/nuxt/nuxt3-routing).
:::



In the previous article, we made it possible for the sample blog site application to retrieve blog information via an API.

This time, we will look at routing, which is used for page transitions in Nuxt applications. As with Nuxt2, in Nuxt development, it is not necessary to create routing definitions individually. Nuxt adopts file system-based routing, where the route mapping is determined by the structure under the `pages` directory.

## Basics of Routing

As mentioned before, Nuxt automatically generates route mappings based on the file structure by default. The `pages` directory of the demo blog site we created had the following structure:

```
pages
├── index.vue
└── details.vue
```

With this arrangement, Nuxt creates the following mappings (path -> page component) as the underlying Vue Router definitions:

- / -> pages/index.vue
- /details -> pages/details.vue

Of course, you can also have a nested directory structure.

```
pages
└── foo
    └── bar.vue
```

In this structure, /foo/bar is mapped to pages/foo/bar.vue. This is something familiar to those who have worked with Nuxt2.

## Page Switching Programmatically

Up to this point, we have been using [NuxtLink](https://nuxt.com/docs/api/components/nuxt-link) for page transitions. This is a Vue component built into Nuxt. Of course, you can also switch pages programmatically without using NuxtLink. In this case, you use the navigateTo function built into Nuxt.

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
    <button @click="navigate">Switch pages programmatically</button>
  </div>
</template>
```

Like other Nuxt core APIs, navigateTo is also subject to Auto Import, so you can write it without needing to import. Note that when using navigateTo, you must either await it or return its result from functions. Here is a quote from the [official documentation](https://nuxt.com/docs/guide/directory-structure/pages#programmatic-navigation):

> Ensure to always await on navigateTo or chain its result by returning from functions

## Catch-All Route

This is a route for when there is no matching mapping (Catch-all Route). In Nuxt3, you create a page component with the file name `[...slug].vue`. The part of slug can be any string.

The page component you create is a normal Vue component like this:

```html
<template>
  <p>{{ $route.params.slug }} Catch-all Route</p>
</template>
```

It's a simple component with only a template. The part `route.params.slug` contains an array of paths (separated by `/`) as you can infer from the spread operator in the file name. This catch-all page component can be placed in any directory to limit its scope to that path.

Note that you cannot specify the scope of application, but if you create a `pages/404.vue` page component, it can be specified as a catch-all route for the entire site.

## Dynamic Routing

For simple apps, this might be sufficient, but for practical applications, there are quite a few cases where you want to dynamically map routes using path parameters. The demo app's blog detail page (details.vue) was switching the content of the blog to be displayed using query parameters, but here we will change it to use path parameters.

- Before change: /details?id=1
- After change: /details/1

To create dynamic routing in Nuxt3, you would structure it like this:

```
pages
├── index.vue
└── details
    └── [id].vue
```

In Nuxt2, you used to prefix with an underscore as in `pages/details/_id.vue`, but in Nuxt3, you enclose the path parameter with `[]` as in `pages/details/[id].vue`. This style applies not only to file names but also to directory names.

With this structure, Nuxt creates the following mappings:

- / -> pages/index.vue (no change)
- /details/:id -> pages/details/[id].vue

The second definition becomes a dynamic route in Vue Router with the `id` parameter.

We will modify index.vue to use this path parameter.

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
    <button @click="refresh()">Fetch Latest Info</button>
    <Advertisement />
  </div>
</template>
```

The `to` property of `NuxtLink` has been changed to a path parameter. The `details/[id].vue` side will look like this:

```html
<script setup lang="ts">
const route = useRoute();
// Get id from path parameter
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

It's basically the same as details.vue, but the part that was being obtained as a query parameter (route.query) has been changed to a path parameter (`route.params`). With this, when you build the Nuxt application, you will be able to navigate pages using path parameters.

## Custom Mapping Rules

So far, we have looked at Nuxt's file system-based routing, but it is also possible to create custom mapping rules.

- [Nuxt Documentation - Router Options](https://nuxt.com/docs/guide/directory-structure/pages#router-options)

Here, we will make the file system-based /foo/bar (`pages/foo/bar.vue`) created by Nuxt also accessible via /foo/baz.

To do this, place a `router.options.ts` file in the `app` directory at the project root.

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

The argument to the routes function is the file system-based route mapping created by Nuxt. Here, in addition to this, we added the route for /foo/baz. The way to describe custom routes is the same as in Vue Router. For details, see the [Vue Router official documentation](https://router.vuejs.org/api/interfaces/routeroptions.html).

By doing this, /foo/baz is mapped to pages/foo/bar.vue, and you can navigate to custom paths using NuxtLink or navigateTo.

- /foo/bar -> pages/foo/bar.vue (Nuxt default)
- /foo/baz -> pages/foo/bar.vue (Added custom route)

Of course, you can also modify the above logic to exclude the route created by Nuxt by default.

:::info
In addition to directly extending Vue Router, there is also a method using the Nuxt Hook (`pages:extend`). For more details, please refer to the official documentation.

- [Nuxt Doc - Custom Routing - Pages Hook](https://nuxt.com/docs/guide/going-further/custom-routing#pages-hook)
:::

## Summary

In this article, we looked at an overview of routing provided by Nuxt. With Nuxt's default file system-based routing, it is possible to support various use cases without the need for mapping descriptions.

Next time, we plan to focus on the configuration information used in Nuxt applications.
