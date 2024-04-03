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



Nuxt, popular as a hybrid framework for Vue.js, is about to have its major update, Nuxt3, go GA soon. Nuxt3, which has seen many changes such as Vue3, Nitro, Vite, etc., has been quite stable since the RC version was released in the spring of 2022, with updates continuing at a high pace.

Here, titled Introduction to Nuxt3, I would like to write a series about the basic features provided by Nuxt3. First, let's organize the rendering modes provided by Nuxt.

Note that the basic project creation method is described in the [official documentation](https://nuxt.com/docs/getting-started/installation), so I will not touch on it.

This time, we will look at it with the initial state of Nuxt's Welcome page without creating a new Vue component.

## Rendering Modes Provided by Nuxt3

Similar to Nuxt2, Nuxt3 supports client-side rendering and universal rendering. However, there are plans to support hybrid rendering combining both and rendering in edge environments in the future.

:::info
In rc.12 of Nuxt3, the initial version of hybrid rendering was released. In `nuxt.config.ts`, you can specify the rendering method (such as client-side rendering and whether pre-rendering is available) for each route.

- [Nuxt3 Documentation - Hybrid Rendering](https://nuxt.com/docs/guide/concepts/rendering#hybrid-rendering)
:::

The overview of rendering modes is explained in the official documentation below:

- [Nuxt3 Documentation - Rendering Modes](https://v3.nuxtjs.org/guide/concepts/rendering)

## Client-side Only Rendering

It might be easier to understand if we call it SPA (Single Page Application). This is the mode where rendering is done on the client, meaning the browser. The main output that Nuxt builds here is the JavaScript source code.

When using client-side rendering, set `nuxt.config.ts` as follows:

```typescript
export default defineNuxtConfig({
  ssr: false
})
```

Nuxt3 generates static resources as follows:

```shell
npx nuxi generate
```

Note that the `nuxi` command is used in Nuxt3 instead of `nuxt`. The built resources are output to the `dist` directory. By hosting this on a web server such as Nginx, S3, Netlify/Vercel, etc., you can provide a service.

Looking at the generated `dist/index.html`, it looks like this:

```html
<!DOCTYPE html>
<html >
<head><link rel="modulepreload" as="script" crossorigin href="/_nuxt/entry.efa19551.js"><link rel="preload" as="style" href="/_nuxt/entry.eba111bf.css"><link rel="prefetch" as="script" crossorigin href="/_nuxt/error-component.81f0ed77.js"><link rel="stylesheet" href="/_nuxt/entry.eba111bf.css"></head>
<body ><div id="__nuxt"></div><script>window.__NUXT__={serverRendered:false,config:{public:{},app:{baseURL:"\u002F",buildAssetsDir:"\u002F_nuxt\u002F",cdnURL:""}},data:{},state:{}}</script><script type="module" src="/_nuxt/entry.efa19551.js" crossorigin></script></body>
</html>
```

There is no content as HTML (only Nuxt's placeholder), and only the specified script tags embedding the generated Nuxt application are included. When this is fetched by a browser, the Nuxt application is launched, and page rendering is executed. It behaves the same as what is built using [Vue CLI](https://cli.vuejs.org/), commonly used for Vue's SPA.

The execution environment is only on the client-side, so compared to universal rendering mentioned later, development is easier (no need to consider server-side rendering), and no server execution environment is required, among other benefits.

However, it has disadvantages such as the initial load (completion of client rendering) taking time and being disadvantageous for SEO because JavaScript is the main component. These are resolved by universal rendering.

## Universal Rendering

This is the default in Nuxt.

Universal rendering is generally easier to understand as SSR (Server-Side Rendering). Unlike client-side rendering, here we also render on the server-side to generate HTML. Therefore, the browser can immediately render upon fetching the resources, overcoming the drawbacks of initial load slowness and SEO issues of client-side rendering.

However, the HTML rendered on the server-side in a non-browser environment (Node.js) does not have reactivity to user actions by itself. This is where the hydration step comes in. Hydration performs similar rendering on the client-side (meaning in the browser environment) and integrates the results with the existing HTML. This process adds the same reactivity as client-side rendering as an afterthought.

For more details about this hydration process, please refer to the official Vue documentation.

- [Vue - Client Hydration](https://vuejs.org/guide/scaling-up/ssr.html#rendering-an-app)

:::column:Island Architecture and Hydration
Hydration also plays an important role in the popular(?) island architecture. In islands (components) where reactivity is needed, HTML is displayed while hydration is executed with a delay. This ensures interactivity for users without compromising the benefits of SSG.

- [Islands Architecture](https://jasonformat.com/islands-architecture/)

Astro, which promotes this island architecture, is introduced in an article on this site for those interested.

- [Building a Documentation Site with the Content-Focused Static Site Generator Astro](/blogs/2022/09/07/build-doc-site-with-astro/)
:::

Thus, because rendering occurs on both server and client sides, it is called universal rendering. Therefore, during implementation, it is necessary to ensure that it works on both servers (Node.js, etc.) and various browsers, making the implementation more difficult than client-side rendering. Carelessly using browser-specific APIs like window.location would result in errors during server-side rendering.

As mentioned earlier, universal rendering is the default in Nuxt, so no special specification is needed. If you want to explicitly specify it, set `nuxt.config.ts` as follows:

```typescript
export default defineNuxtConfig({
  ssr: true,
})
```

Build by executing the `nuxi build` command as follows:

```shell
npx nuxi build
```

Once the execution is complete, the server execution module is output to the `.output` directory.

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

This is the module of Nitro, which is adopted as the server engine in Nuxt3. By default, it targets the Node.js Server environment, but since Nitro is a universal JavaScript engine, it can also be executed in other environments such as Lambda or Deno. In addition, Nitro bundles only what is necessary, so the module size is significantly reduced compared to Nuxt2, and the build speed is also much faster.

:::info
For those interested, an article introduces how to deploy server-side rendering to the AWS serverless environment, Lambda.

- [Introduction to Nuxt3 (Part 9) - Deploying Nuxt3 Applications to a Serverless Environment](/nuxt/nuxt3-serverless-deploy/)
:::

Nitro is also mentioned in [this article](/blogs/2022/07/20/nitro_with_lambda/), so please refer to it if you are interested.

To actually run it on a standalone Node.js Server, do the following:

```shell
node .output/server/index.mjs
```

The Nitro server starts on the default port 3000.

Actually, when accessing `http://localhost:3000` with curl, the initial project creation's Welcome page HTML was obtained (most of it is omitted for brevity).

```html
<!-- Excerpt and formatting -->
<!DOCTYPE html>
<html data-head-attrs="">
<head>
  <!-- (Omitted) -->
</head>
<body data-head-attrs="">
<div id="__nuxt">
  <div>
    <div class="font-sans antialiased bg-white dark:bg-black text-black dark:text-white min-h-screen place-content-center flex flex-col items-center justify-center p-8 text-sm sm:text-base"
         data-v-25102a06>
      <div class="grid grid-cols-3 gap-4 md:gap-8 max-w-5xl w-full z-20" data-v-25102a06>
        <div class="col-span-3 rounded p-4 flex flex-col gradient-border" data-v-25102a06>
          <div class="flex justify-between items-center mb-4" data-v-25102a06><h1 class="font-medium text-2xl" data-v-25102a06>Get Started</h1>
          </div>
          <p class="mb-2" data-v-25102a06>Remove this welcome page by replacing <a class="bg-gray-100 dark:bg-white/10 rounded font-mono p-1 font-bold" data-v-25102a06>&lt;NuxtWelcome /&gt;</a>
            in <a href="https://v3.nuxtjs.org/docs/directory-structure/app" target="_blank" rel="noopener" class="bg-gray-100 dark:bg-white/10 rounded font-mono p-1 font-bold" data-v-25102a06>app.vue</a> with
            your own code.</p></div>
        <a href="https://v3.nuxtjs.org" target="_blank" rel="noopener"
           class="gradient-border cursor-pointer col-span-3 sm:col-span-1 p-4 flex flex-col" data-v-25102a06>
          <h2 class="font-semibold text-xl mt-4" data-v-25102a06>Documentation</h2>
          <p class="mt-2" data-v-25102a06>We highly recommend you take a look at the Nuxt documentation, whether you are
            new or have previous experience with the framework.</p></a><a href="https://github.com/nuxt/framework" target="_blank" rel="noopener" class="cursor-pointer gradient-border col-span-3 sm:col-span-1 p-4 flex flex-col" data-v-25102a06>
        <h2 class="font-semibold text-xl mt-4" data-v-25102a06>GitHub</h2>
        <p class="mt-2" data-v-25102a06>Nuxt is open source and the code is available on GitHub, feel free to star it,
          participate in discussions or dive into the source.</p></a><a href="https://twitter.com/nuxt_js" target="_blank" rel="noopener" class="cursor-pointer gradient-border col-span-3 sm:col-span-1 p-4 flex flex-col" data-v-25102a06>
        <h2 class="font-semibold text-xl mt-4" data-v-25102a06>Twitter</h2>
        <p class="mt-2" data-v-25102a06>Follow the Nuxt Twitter account to get latest news about releases, new modules,
          tutorials and tips.</p></a></div>
    </div>
  </div>
</div>
<script>window.__NUXT__ = {
  data: {},
  state: {},
  _errors: {},
  serverRendered: true,
  config: {public: {}, app: {baseURL: "\u002F", buildAssetsDir: "\u002F_nuxt\u002F", cdnURL: ""}}
}</script>
<script type="module" src="/_nuxt/entry.efa19551.js" crossorigin></script>
</body>
</html>
```

In the case of client-side rendering earlier, it was only script tags, but this time, HTML content is included. This is the result of server-side rendering. The browser can display this immediately, significantly reducing the initial load time, and search engine bots should recognize this page immediately. The aforementioned hydration is then added, adding reactivity to the HTML. The subsequent behavior is the same as during client-side rendering. The image is as follows:

![Nuxt universal rendering](https://i.gyazo.com/9453dd706daa12054f96d73fad08af89.png)

The drawback of this mechanism is the need to prepare a server execution environment in advance and to continuously operate with scalability in mind[^1]. Although Nitro allows deployment to any serverless environment, not just Node.js Server, you may often want to distribute it as static content.

[^1]: There is also a response delay due to rendering occurring in the server environment during the initial load, but after the initial load, it is the same client-side rendering as a regular SPA. Also, it is common for performance measures to be taken using caches by inserting a CDN for static content under public.

This is where pre-rendering comes in. Generally, this form is referred to as SSG against SSR, but in the context of Nuxt, it is treated as a form of SSR since only the timing of rendering differs (`nuxt.config.ts` needs to be set to `ssr: true`). In pre-rendering, what was rendered in the Nitro server environment earlier is all done at build time.

To use pre-rendering, execute the `nuxi generate` command as before:

```shell
npx nuxi generate
```

Executing this outputs HTML under `dist`. The publication is omitted, but if you look at `index.html`, it outputs the same HTML as what was obtained from the Nitro server with curl earlier. By deploying this directory to any hosting environment, you can immediately operate a website.

In pre-rendering, it seems to work as follows[^2]:

![Nuxt universal rendering - prerendering](https://i.gyazo.com/8b49dae0d1dfe517c5c667adbd902a37.png)

[^2]: In pre-rendering, Nitro's [prerender](https://nitro.unjs.io/config/#prerender) option seems to be used.

In pre-rendering, since major tasks are executed at build time, the execution environment becomes simpler. Just like client rendering, it is simply deployed as a usual static site, making operation easy. Also, since it displays what was rendered in advance, server-side rendering is unnecessary, making it faster in terms of performance.

The downside is that the build time becomes longer due to pre-rendering. Furthermore, since the HTML is static, it needs to be executed every time the page is updated. In this case, there is only one page (Welcome page), so there is hardly any difference, but as the number of pages increases, the cost of this part will become more apparent. Therefore, for large sites, it is necessary to prepare a CI environment with a considerable specification.

Thus, pre-rendering also has trade-offs, and it cannot be said that one is superior to the other. It will be selected according to the characteristics of the site.

:::info
It is often misunderstood, but even in universal rendering mode, not all pages are obtained as HTML, and page transitions after the initial load are rendered on the client-side as usual SPAs. This ensures the benefits of SPA, such as fast page switching and interactivity.
:::

## Summary
This time, we looked at the rendering modes equipped with Nuxt3 (basically the same in Nuxt2, but). Especially, universal rendering might seem a bit peculiar to those experienced mainly with SPA, but upon closer inspection, it offers solutions to issues such as performance and SEO while leveraging the benefits of SPA. Also, as mentioned earlier, Nuxt3 plans to support even more advanced rendering in the future. It is necessary to keep an eye on future developments.

From the next time, I would like to focus on the features provided by Nuxt3.
