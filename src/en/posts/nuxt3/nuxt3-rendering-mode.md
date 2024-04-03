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

:::alert
This article has been automatically translated.
The original article is [here](/nuxt/nuxt3-rendering-mode/).
:::
---

Nuxt, popular as a hybrid framework for Vue.js, is about to get a major update with Nuxt3 soon reaching General Availability (GA). After the Release Candidate (RC) version was published in spring 2022, Nuxt3, which includes many changes such as Vue3, Nitro, Vite, etc., has been updated at a high pace and has become quite stable.

Here, titled "Introduction to Nuxt3", I would like to write a series about the basic features provided by Nuxt3. First, we will organize the rendering modes provided by Nuxt.

Note that the basic project creation method is described in the [official documentation](https://nuxt.com/docs/getting-started/installation), so I will not touch on it.

This time, we will look at it using the initial state of Nuxt's Welcome page without creating new Vue components.

## Rendering Modes Provided by Nuxt3

Similar to Nuxt2, Nuxt3 supports client-side rendering and universal rendering. However, there are plans to support hybrid rendering that combines both in the future, as well as rendering in edge environments.

:::info
In Nuxt3's rc.12, the initial version of hybrid rendering was released. In `nuxt.config.ts`, you can specify the rendering method (such as client-side rendering or whether pre-rendering is enabled) for each route.

- [Nuxt3 Documentation - Hybrid Rendering](https://nuxt.com/docs/guide/concepts/rendering#hybrid-rendering)
:::

The overview of rendering modes is explained below in the official documentation:

- [Nuxt3 Documentation - Rendering Modes](https://v3.nuxtjs.org/guide/concepts/rendering)

## Client-side Only Rendering

It might be easier to understand if I say it's like SPA (Single Page Application). It's a mode where rendering is done on the client, meaning in the browser. The main output that Nuxt builds here is the JavaScript source code.

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

Note that Nuxt3 uses the `nuxi` command instead of `nuxt` in Nuxt2. The built resources are output to the `dist` directory. By hosting these on a web server like Nginx, S3, Netlify/Vercel, etc., you can provide the service.

Looking at the generated `dist/index.html`, it looks like this:

```html
<!DOCTYPE html>
<html >
<head><!-- Omitted for brevity --></head>
<body ><div id="__nuxt"></div><script>window.__NUXT__={/* Omitted for brevity */}</script><script type="module" src="/_nuxt/entry.efa19551.js" crossorigin></script></body>
</html>
```

There is no content as HTML (only Nuxt's placeholder), and only the script tags specifying the generated Nuxt application are embedded. When the browser retrieves this, the Nuxt application is launched, and page rendering is executed. It behaves the same as building with [Vue CLI](https://cli.vuejs.org/), which is commonly used for Vue's SPA.

The execution environment is only on the client-side, so compared to universal rendering described later, development is easier (no need to consider server-side rendering), and no server execution environment is required, among other advantages.

On the other hand, it takes time for the initial load (completion of client rendering) until the page is displayed, and since JavaScript is the main component, it is disadvantageous for SEO. This is resolved by universal rendering.

## Universal Rendering

This is the default in Nuxt.

Universal rendering, commonly known as SSR (Server-Side Rendering), differs from client-side rendering in that it also renders on the server-side to generate HTML. Therefore, the browser can immediately render upon fetching the resources, overcoming the drawbacks of initial load delay and SEO issues associated with client-side rendering.

However, the HTML rendered on the server-side in a non-browser environment (Node.js) does not have reactivity to user interactions by itself. This is where the hydration step comes in. Hydration also renders on the client-side (meaning in the browser environment) and integrates the result with the existing HTML. This process adds the same reactivity as client-side rendering to the HTML afterwards.

For more details on this hydration process, please refer to the official Vue documentation:

- [Vue - Client Hydration](https://vuejs.org/guide/scaling-up/ssr.html#rendering-an-app)

:::column:Island Architecture and Hydration
Hydration also plays an important role in the trendy (?) island architecture. In islands (components) where reactivity is needed, HTML is displayed while hydration is executed with a delay. This ensures interactivity for users without compromising the benefits of SSG.

- [Islands Architecture](https://jasonformat.com/islands-architecture/)

Astro, which promotes this island architecture, is introduced in an article on this site for those interested.

- [Building a Documentation Site with the Content-focused Static Site Generator Astro](/blogs/2022/09/07/build-doc-site-with-astro/)
:::

Thus, because rendering occurs on both the server and client sides, it is named universal rendering. Therefore, during implementation, it is necessary to ensure that it works on both server (Node.js, etc.) and various browsers, making the implementation more difficult than client-side rendering. Carelessly using browser-specific APIs like `window.location` will result in errors during server-side rendering.

As mentioned earlier, universal rendering is the default in Nuxt, so no special configuration is needed. If you want to specify explicitly, set `nuxt.config.ts` as follows:

```typescript
export default defineNuxtConfig({
  ssr: true,
})
```

Build by executing the following command:

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

This is the module of Nitro, which is adopted as the server engine in Nuxt3. By default, it targets a Node.js Server environment, but since Nitro is a universal JavaScript engine, it can also be executed in other environments such as Lambda or Deno. Also, Nitro bundles only what is necessary, so the module size is significantly reduced compared to Nuxt2, and the build speed is also much faster.

:::info
For methods to deploy server-side rendering to the AWS serverless environment Lambda, please refer to the following article for those interested.

- [Introduction to Nuxt3 (Part 9) - Deploying Nuxt3 Applications to a Serverless Environment](/nuxt/nuxt3-serverless-deploy/)
:::

Nitro is also discussed in [this article](/blogs/2022/07/20/nitro_with_lambda/) for those interested.

To actually run it on a standalone Node.js Server, do the following:

```shell
node .output/server/index.mjs
```

The Nitro server starts on the default port 3000.

When accessing `http://localhost:3000` with curl, the following HTML is obtained from the initial project's Welcome page (most parts are omitted for brevity):

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
    <!-- (Omitted for brevity) -->
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

In the case of client-side rendering earlier, there were only script tags, but this time the content includes HTML. This is the result of server-side rendering. The browser can display this immediately, significantly reducing the initial load time, and search engine bots should recognize this page immediately. After this, the aforementioned hydration is applied, adding reactivity to the HTML. The subsequent behavior is the same as during client-side rendering. The image is as follows:

![Nuxt universal rendering](https://i.gyazo.com/9453dd706daa12054f96d73fad08af89.png)

The downside of this mechanism is the need to prepare a server execution environment in advance and continue operations considering scalability[^1]. Although Nitro allows deployment to any serverless environment, not just Node.js Server, you would often prefer to distribute it as static content.

[^1]: There is also a response delay due to rendering occurring in the server environment at initial load, but after the initial load, it is client-side rendering as usual. Also, static content under `public` is commonly performance-optimized using CDN caching.

This is where pre-rendering comes in. Generally, this form is often referred to as SSG against SSR, but in the context of Nuxt, it is treated as a form of SSR since only the timing of rendering differs (`nuxt.config.ts` needs to be set to `ssr: true`). In pre-rendering, what was rendered in the Nitro server environment earlier is all done at build time.

To use pre-rendering, execute the `nuxi generate` command in the same way as client-side rendering.

```shell
npx nuxi generate
```

Executing this outputs HTML under `dist`. The publication is omitted, but if you look at `index.html`, it outputs HTML similar to what was obtained earlier from the Nitro server via curl. By placing this directory under any hosting environment, you can immediately operate a website.

In pre-rendering, it seems to work as follows[^2]:

![Nuxt universal rendering - prerendering](https://i.gyazo.com/8b49dae0d1dfe517c5c667adbd902a37.png)

[^2]: In pre-rendering, it seems that Nitro's [prerender](https://nitro.unjs.io/config/#prerender) option is used.

With pre-rendering, the main tasks are performed at build time, simplifying the execution environment. Like client rendering, it's simply deployed as a usual static site, making operations easy. Also, since it displays pre-rendered content, server-side rendering is unnecessary, making it fast from a performance perspective.

The downside is that the build time becomes longer due to pre-rendering. Furthermore, since the HTML is static, it needs to be executed every time the page is updated. This time, there is only one page (Welcome page), so there's hardly any difference, but as the number of pages increases, the cost of this part will become more apparent. Therefore, a CI environment with sufficient specs is necessary for large sites.

Thus, pre-rendering also has its trade-offs, and it cannot be said which is superior in a blanket statement. The choice will depend on the characteristics of the site.

:::info
It's a common misconception, but even in universal rendering mode, not all pages are obtained as HTML, and page transitions after the initial load are rendered on the client-side as usual SPA. This ensures the benefits of SPA, such as fast page switching and interactivity.
:::

## Summary
This time, we looked at the rendering modes equipped by Nuxt3 (the basics are the same for Nuxt2). Especially, universal rendering might seem a bit peculiar to those who have primarily experienced SPA, but upon closer inspection, it offers solutions to challenges such as performance and SEO while leveraging the benefits of SPA. Also, as mentioned earlier, Nuxt3 plans to support more advanced rendering in the future. It's necessary to keep an eye on future developments.

From the next time, I would like to focus on the features provided by Nuxt3.