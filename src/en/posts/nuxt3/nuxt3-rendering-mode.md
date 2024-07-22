---
title: >-
  Introduction to Nuxt3 (Part 1) - Understanding the Rendering Modes Supported
  by Nuxt
author: noboru-kudo
date: 2022-09-25T00:00:00.000Z
tags:
  - SSG
  - SSR
nextPage: ./src/posts/nuxt3/nuxt3-develop-sample-app.md
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](/nuxt/nuxt3-rendering-mode/).
:::



Nuxt, popular as a hybrid framework for Vue.js, is about to reach its General Availability (GA) with a major update to Nuxt3. With many changes such as Vue3, Nitro, Vite, etc., Nuxt3 has become quite stable after the Release Candidate (RC) version was published in the spring of 2022, with updates continuing at a high pace.

Here, under the title "Introduction to Nuxt3," I would like to write a series about the basic features provided by Nuxt3. First, let's organize the rendering modes provided by Nuxt.

Please note that the basic project creation method is as described in the [official documentation](https://nuxt.com/docs/getting-started/installation), so I will not touch on it.

This time, let's look at the initial state of Nuxt's Welcome page without creating new Vue components.

## Rendering Modes Provided by Nuxt3

Similar to Nuxt2, Nuxt3 supports client-side rendering and universal rendering. However, there are plans to support hybrid rendering that combines both, as well as rendering in edge environments in the future.

:::info
In Nuxt3's rc.12, the initial version of hybrid rendering was released. In `nuxt.config.ts`, you can specify the rendering method (such as client-side rendering or whether pre-rendering is enabled) for each route.

- [Nuxt3 Documentation - Hybrid Rendering](https://nuxt.com/docs/guide/concepts/rendering#hybrid-rendering)
:::

The overview of rendering modes is explained in the official documentation below.

- [Nuxt3 Documentation - Rendering Modes](https://v3.nuxtjs.org/guide/concepts/rendering)

## Client-side Only Rendering

It might be easier to understand if I say it's an SPA (Single Page Application). This is the mode where rendering is done on the client, i.e., in the browser. The main output that Nuxt builds here is the JavaScript source code.

When using client-side rendering, set `nuxt.config.ts` as follows:

```typescript
export default defineNuxtConfig({
  ssr: false
})
```

In Nuxt3, static resources are generated as follows:

```shell
npx nuxi generate
```

Note that the `nuxi` command is used in Nuxt3 instead of `nuxt`. The built resources are output to the `dist` directory. By hosting this on a web server like Nginx, S3, Netlify/Vercel, etc., you can provide services.

Looking at the generated `dist/index.html`, it looks like this:

```html
<!DOCTYPE html>
<html >
<head><!-- Omitted for brevity --></head>
<body ><div id="__nuxt"></div><script>window.__NUXT__={/* Omitted for brevity */}</script><script type="module" src="/_nuxt/entry.efa19551.js" crossorigin></script></body>
</html>
```

There's no content as HTML (only Nuxt's placeholder), and only the specified script tags for the generated Nuxt application are embedded. When the browser retrieves this, the Nuxt application is launched, and page rendering is executed. This behavior is the same as what is often used in Vue's SPA built with [Vue CLI](https://cli.vuejs.org/).

The execution environment is only on the client-side, so compared to the universal rendering mentioned later, development is easier (no need to consider server-side rendering), and no server execution environment is required, among other advantages.

However, it has disadvantages such as taking time for the initial load (completion of client rendering) and being disadvantageous for SEO because JavaScript is the main component. Universal rendering resolves these issues.

## Universal Rendering

This is the default in Nuxt.

Universal rendering is generally easier to understand as SSR (Server-Side Rendering). Unlike client-side rendering, here, rendering is also done on the server-side to generate HTML. Therefore, the browser can immediately render upon fetching the resources, overcoming the initial load delay and SEO issues of client-side rendering.

However, the HTML rendered on the server-side (Node.js) environment lacks reactivity to user interactions by itself. This is where the hydration step comes in. Hydration performs similar rendering on the client-side (i.e., in the browser environment) and integrates the result with the existing HTML. This adds the same reactivity as client-side rendering to the HTML afterward.

For more details on hydration, please refer to the official Vue documentation.

- [Vue - Client Hydration](https://vuejs.org/guide/scaling-up/ssr.html#rendering-an-app)

:::column:Island Architecture and Hydration
Hydration also holds an important place in the popular (?) island architecture. In islands (components) where reactivity is needed, HTML is displayed while hydration is executed with a delay. This ensures interactivity for users without compromising the benefits of SSG.

- [Islands Architecture](https://jasonformat.com/islands-architecture/)

Astro, which promotes this island architecture, is introduced in an article on this site for those interested.

- [Building a Documentation Site with the Content-focused Static Site Generator Astro](/blogs/2022/09/07/build-doc-site-with-astro/)
:::

Thus, because rendering is performed on both server and client sides, it is called universal rendering. Therefore, when implementing, it is necessary to ensure that it works in both server (Node.js, etc.) and various browser environments, making it more difficult to implement than client-side rendering. Carelessly using browser-specific APIs like window.location can cause errors during server-side rendering.

As mentioned earlier, universal rendering is the default in Nuxt, so no special specification is needed. If you want to specify explicitly, set `nuxt.config.ts` as follows:

```typescript
export default defineNuxtConfig({
  ssr: true,
})
```

Build by executing the following `nuxi build` command:

```shell
npx nuxi build
```

After execution, server execution modules are output to the `.output` directory.

```
.output
├── nitro.json
├── public
│ └── _nuxt
│     ├── entry.eba111bf.css
│     ├── entry.efa19551.js
│     ├── error-404.18ced855.css
│     ├── error-404.e1668e0f.js
│     ├── error-500.6838e31d.js
│     ├── error-500.e60962de.css
│     └── error-component.81f0ed77.js
└── server
    ├── chunks
    │ ├── app
    │ ├── error-500.mjs
    │ ├── error-500.mjs.map
    │ ├── handlers
    │ └── nitro
    ├── index.mjs
    ├── index.mjs.map
    ├── node_modules
    └── package.json
```

This is the module of Nitro, the server engine adopted by Nuxt3. By default, the target environment is the Node.js Server, but Nitro is a universal JavaScript engine, so it can be executed in other environments such as Lambda or Deno. Also, Nitro bundles only what is necessary, so the module size is significantly reduced compared to Nuxt2, and the build speed is much faster.

:::info
For those interested, an article introduces how to deploy server-side rendering to the AWS serverless environment, Lambda.

- [Introduction to Nuxt3 (Part 9) - Deploying a Nuxt3 Application to a Serverless Environment](/nuxt/nuxt3-serverless-deploy/)
:::

Nitro is also mentioned in [this article](/blogs/2022/07/20/nitro_with_lambda/), so please refer to it if you are interested.

To actually run it on a standalone Node.js Server, do the following:

```shell
node .output/server/index.mjs
```

The Nitro server starts on the default port 3000.

When you access `http://localhost:3000` with curl, you can get the following HTML from the initial project creation's Welcome page (most parts are omitted for brevity).

```html
<!-- Excerpt and formatted -->
<!DOCTYPE html>
<html data-head-attrs="">
<head>
  <!-- (Omitted) -->
</head>
<body data-head-attrs="">
<div id="__nuxt">
  <div>
    <!-- (Omitted) -->
  </div>
</div>
<script>window.__NUXT__ = {/* Omitted for brevity */}</script>
<script type="module" src="/_nuxt/entry.efa19551.js" crossorigin></script>
</body>
</html>
```

Unlike the client-side rendering case, which had only script tags, this time the content is included in HTML. This is the result of server-side rendering. The browser can immediately display this, significantly reducing the initial load time, and search engine bots should recognize this page immediately. Hydration is then applied to this HTML, adding reactivity. The subsequent behavior is the same as in client-side rendering. The image is as follows:

![Nuxt universal rendering](https://i.gyazo.com/9453dd706daa12054f96d73fad08af89.png)

The disadvantage of this mechanism is the need to prepare a server execution environment in advance and continuously operate with scalability in mind[^1]. Although Nitro allows deployment to any serverless environment, not just Node.js Server, you often want to distribute it as static content.

[^1]: There is also a response delay due to rendering in the server environment at the initial load, but after the initial load, it is client-side rendering as in a regular SPA. Also, it is common to use CDN caching for static content under public to implement performance measures.

This is where pre-rendering comes in. Generally, this form is also referred to as SSG against SSR, but in the context of Nuxt, it is treated as a form of SSR since only the timing of rendering differs (`nuxt.config.ts` needs to be set to `ssr: true`). In pre-rendering, what was rendered in the Nitro server environment earlier is all done at build time.

To use pre-rendering, execute the `nuxi generate` command as you would with client-side rendering.

```shell
npx nuxi generate
```

Executing this outputs HTML under `dist`. I will omit the publication, but if you look at `index.html`, it outputs the same HTML as what was obtained from the Nitro server with curl earlier. By deploying this directory to any hosting environment, you can immediately operate a website.

Pre-rendering operates with the following image[^2]:

![Nuxt universal rendering - prerendering](https://i.gyazo.com/8b49dae0d1dfe517c5c667adbd902a37.png)

[^2]: In pre-rendering, Nitro's [prerender](https://nitro.unjs.io/config/#prerender) option seems to be used.

With pre-rendering, major tasks are executed at build time, simplifying the execution environment. Just like client rendering, simply deploy it as a usual static site, making operation easy. Also, since it displays pre-rendered content, server-side rendering execution is unnecessary, making it faster in terms of performance.

The downside is that the build time becomes longer due to pre-rendering. Moreover, since the HTML is static, it needs to be executed every time the page is updated. In this case, there is almost no difference because it's only one page (Welcome page), but as the number of pages increases, the cost of this part will become more apparent. Therefore, for large sites, it is necessary to prepare a CI environment with sufficient specs.

Thus, pre-rendering also has trade-offs, and it cannot be said which is superior. The choice depends on the characteristics of the site.

:::info
It's a common misconception, but even in universal rendering mode, not all pages are obtained as HTML. After the initial load, page transitions are rendered on the client-side as in a regular SPA. This ensures the benefits of SPA, such as fast page switching and interactivity.
:::

## Summary
This time, we looked at the rendering modes equipped with Nuxt3 (basically the same in Nuxt2). Especially, universal rendering might seem a bit peculiar to those experienced mainly with SPA, but upon closer inspection, it offers solutions to performance and SEO issues while leveraging the benefits of SPA. Also, as mentioned earlier, Nuxt3 plans to support more advanced rendering in the future. It's necessary to keep an eye on future developments.

From the next time, I would like to focus on the features provided by Nuxt3.
