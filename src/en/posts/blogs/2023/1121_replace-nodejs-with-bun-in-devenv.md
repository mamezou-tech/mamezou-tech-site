---
title: Replacing the Development Environment's Node.js with Bun
author: masahiro-kondo
date: 2023-11-21T00:00:00.000Z
tags:
  - Bun
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2023/11/21/replace-nodejs-with-bun-in-devenv/).
:::



## Introduction
Bun is a JavaScript runtime that competes with Node.js and Deno.

[Bun — A fast all-in-one JavaScript runtime](https://bun.sh/)

It particularly emphasizes speed, and the official website features graphs showing throughput significantly surpassing Node.js and Deno in React SSR/WebSocket communication/SQLite query execution. It aims to execute most server-side JavaScript, improve performance, reduce complexity, and enhance developer productivity, with features such as:

- Fast startup and execution speed, extending Safari's JavaScript engine, JavaScriptCore
- Provides a highly optimized minimal API set for tasks like starting HTTP servers and creating files
- A complete toolkit for building JavaScript apps, including a package manager, test runner, and bundler

Unlike Deno, Bun was developed from the start as a replacement for Node.js and natively implements many Node.js APIs and Web APIs. It is implemented in Zig and C++.

Bun reached version 1.0 in September this year. The version at the time of writing is 1.0.13.

[Bun 1.0 | Bun Blog](https://bun.sh/blog/bun-v1.0)

There are many guides for using various tools and frameworks with Bun, indicating that the ecosystem is maturing.

[Ecosystem | Guides](https://bun.sh/guides/ecosystem)

:::info
Bun is pronounced `bʌn`, which is closer to "ban" than "bun".
:::

## Installation

First, let's install Bun.

[Installation | Bun Docs](https://bun.sh/docs/installation)

```shell
curl -fsSL https://bun.sh/install | bash
```

It will be installed under `$HOME/.bun`, and path settings will be added.

To update, use the following command. Like Deno, it can be easily updated.

```shell
bun upgrade
```

## Applying Bun to Nuxt App Development
Bun can also be applied to Nuxt app development, which has [many detailed articles](https://developer.mamezou-tech.com/tags/nuxt/) on this site. The ecosystem page mentioned earlier includes a guide for Nuxt.

[Build an app with Nuxt and Bun | Bun Examples](https://bun.sh/guides/ecosystem/nuxt)

To create a project, execute `bunx` instead of `npx`.

```shell
bunx nuxi init my-nuxt-app
```

To start the development server, use the following command. This will execute the `dev` npm script in the generated package.json.

```shell
bun --bun run dev
```

I tried running it a bit with the expectation that the fast Bun would make development more comfortable. Below, I will compare the speed with Node.js.

## Speed Comparison: Project Creation
Let's compare the speed of project creation between Node and Bun. The package manager used is npm.

First, with Node.js. Node.js version 18.16.0 is used.

```shell
$ npx nuxi init nuxt-dev-node

✔ Which package manager would you like to use?
npm
◐ Installing dependencies...                                  10:59:50

> postinstall
> nuxt prepare

✔ Types generated in .nuxt                                                                                                                                 11:00:36

added 729 packages, and audited 731 packages in 46s

117 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
✔ Installation completed.                                    11:00:36
```

Project generation with Bun.

```shell
$ bunx nuxi init nuxt-dev-bun

✔ Which package manager would you like to use?
npm
◐ Installing dependencies...                                 11:05:49

> postinstall
> nuxt prepare

✔ Types generated in .nuxt                                   11:06:26

added 729 packages, and audited 731 packages in 37s

117 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
✔ Installation completed. 
```

Node.js took 46 seconds, while Bun took 37 seconds. Although the time spent on package installation by npm is significant, Bun was about 130% faster.

## Speed Comparison: Development Server Startup

Starting the Nuxt development server with Node.js.

```shell
$ npm run dev

> dev
> nuxt dev

Nuxt 3.8.1 with Nitro 2.7.2                                         11:14:40

  ➜ Local:    http://localhost:3000/
  ➜ Network:  use --host to expose

  ➜ DevTools: press Shift + Option + D in the browser (v1.0.2)      11:14:41

ℹ Vite server warmed up in 562ms                                    11:14:42
ℹ Vite client warmed up in 690ms                                    11:14:42
✔ Nitro built in 250 ms                                       nitro 11:14:42
```

Starting the Nuxt development server with Bun.

```shell
$ bun --bun run dev

Nuxt                                                              11:20:07 AM

  ➜ Local:    http://localhost:3000/
  ➜ Network:  use --host to expose

  ➜ DevTools: press Shift + Option + D in the browser (v1.0.2)    11:20:07 AM

ℹ Vite server warmed up in 532ms                                  11:20:08 AM
✔ Nitro built in 198 ms                                     nitro 11:20:08 AM
ℹ Vite client warmed up in 876ms                                  11:20:08 AM
```

The startup time with Node.js was 1502ms, while with Bun it was 1606ms, showing that Node.js was slightly faster. However, since the build time for Nuxt's SSR engine Nitro was slightly faster with Bun, Bun might have an advantage as the content increases.

## Speed Comparison: Adding Packages
I tried adding the d3 package to a Nuxt app created in a previous article, "[Porting a Vue3+D3.js App to Nuxt3 and Deploying to Netlify](https://developer.mamezou-tech.com/blogs/2023/03/02/port-vue3-d3-app-to-nuxt3-on-netlify/)" (a small-scale app).

Adding the d3 package with Node.js. 2 seconds.

```shell
$ npm install d3

added 35 packages, and audited 766 packages in 2s

117 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

Adding the d3 package with Bun. 1.97 seconds

```shell
$ bun --bun install d3
bun add v1.0.13 (f5bf67bd)
[6.17ms] migrated lockfile from package-lock.json

 installed d3@7.8.5

✔ Types generated in .nuxt                                                                                                                                 11:33:59

 109 packages installed [1.97s]
```

There wasn't much difference.

## Speed Comparison: App Build
I added a Vue component created in the above app and compared the build time.

Build with Node.js.

```shell
$ npm run build

> build
> nuxt build

Nuxt 3.8.1 with Nitro 2.7.2                                                    11:46:23
ℹ Building client...                                                          11:46:24
ℹ vite v4.5.0 building for production...                                      11:46:24
ℹ ✓ 678 modules transformed.                                                  11:46:25
Inspect report generated at /Users/kondoh/dev/js-study/nuxt-dev-node/.nuxt/analyze/.vite-inspect
[11:46:26] ℹ .nuxt/dist/client/manifest.json                     1.81 kB │ gzip:  0.36 kB
 :
[11:46:26] ℹ .nuxt/dist/client/_nuxt/entry.fecb2ad8.js         187.32 kB │ gzip: 68.62 kB
ℹ ✓ built in 1.56s                                                            11:46:26
✔ Client built in 1568ms                                                      11:46:26
ℹ Building server...                                                          11:46:26
ℹ vite v4.5.0 building SSR bundle for production...                           11:46:26
ℹ ✓ 59 modules transformed.                                                   11:46:26
Inspect report generated at /Users/kondoh/dev/js-study/nuxt-dev-node/.nuxt/analyze/.vite-inspect
ℹ .nuxt/dist/server/_nuxt/entry-styles.850bf845.mjs            0.15 kB        11:46:26
ℹ .nuxt/dist/server/_nuxt/error-500-styles.cf4b3e80.mjs        0.15 kB        11:46:26
ℹ .nuxt/dist/server/_nuxt/error-404-styles.1e0dde27.mjs        0.15 kB        11:46:26
ℹ .nuxt/dist/server/styles.mjs                                 0.46 kB        11:46:26
[11:46:26] ℹ .nuxt/dist/server/_nuxt/entry-styles-2.mjs-d4587fba.js       0.28 kB │ map:  0.11 kB
 :
[11:46:26] ℹ .nuxt/dist/server/server.mjs                                41.36 kB │ map: 89.86 kB
ℹ ✓ built in 396ms                                                            11:46:26
✔ Server built in 401ms                                                       11:46:26
✔ Generated public .output/public                                       nitro 11:46:26
ℹ Building Nitro Server (preset: node-server)                           nitro 11:46:26
✔ Nitro server built                                                    nitro 11:46:27
  ├─ .output/server/chunks/app/_nuxt/entry-styles.850bf845.mjs (637 B) (304 B gzip)
    :
  └─ .output/server/package.json (1.6 kB) (529 B gzip)
Σ Total size: 2.9 MB (777 kB gzip)
✔ You can preview this build using node .output/server/index.mjs        nitro 11:46:27
```

Build with Bun.

```shell
$ bun --bun run build

[11:51:40 AM]  WARN  Changing NODE_ENV from development to production, to avoid unintended behavior.

Nuxt                                                                        11:51:40 AM
ℹ Building client...                                                       11:51:41 AM
ℹ vite v4.5.0 building for development...                                  11:51:41 AM
ℹ ✓ 678 modules transformed.                                               11:51:42 AM
Inspect report generated at /Users/kondoh/dev/js-study/nuxt-dev-bun/.nuxt/analyze/.vite-inspect
[11:51:42 AM] ℹ .nuxt/dist/client/manifest.json                     1.81 kB │ gzip:  0.35 kB
 :
[11:51:42 AM] ℹ .nuxt/dist/client/_nuxt/entry.96464600.js         216.52 kB │ gzip: 80.48 kB │ map: 1,117.25 kB
ℹ ✓ built in 1.80s                                                         11:51:42 AM
✔ Client built in 1805ms                                                   11:51:42 AM
ℹ Building server...                                                       11:51:42 AM
ℹ vite v4.5.0 building SSR bundle for development...                       11:51:42 AM
ℹ ✓ 55 modules transformed.                                                11:51:43 AM
Inspect report generated at /Users/kondoh/dev/js-study/nuxt-dev-bun/.nuxt/analyze/.vite-inspect
ℹ .nuxt/dist/server/styles.mjs                          0.07 kB            11:51:43 AM
[11:51:43 AM] ℹ .nuxt/dist/server/_nuxt/island-renderer-87f8f18f.js   1.07 kB │ map:  1.41 kB
 :
[11:51:43 AM] ℹ .nuxt/dist/server/server.mjs                         44.26 kB │ map: 93.34 kB
ℹ ✓ built in 290ms                                                         11:51:43 AM
✔ Server built in 294ms                                                    11:51:43 AM
✔ Generated public .output/public                                    nitro 11:51:43 AM
ℹ Building Nitro Server (preset: node-server)                        nitro 11:51:43 AM
✔ Nitro server built                                                 nitro 11:51:44 AM
  ├─ .output/server/chunks/app/_nuxt/error-404-7ddc3ac1.mjs (11.1 kB) (3.6 kB gzip)
   :
  └─ .output/server/package.json (1.6 kB) (529 B gzip)
Σ Total size: 2.9 MB (776 kB gzip)
✔ You can preview this build using node .output/server/index.mjs     nitro 11:51:44 AM
```

For Vite's client build, Node.js took 1568ms, while Bun took 1805ms. For Vite's SSR build, Node.js took 401ms, while Bun took 294ms. Node.js was faster for client bundle builds, while Bun was faster for SSR-related builds. Again, Bun might have an advantage if the SSR weight is high.

## Conclusion
I compared the startup speed and other aspects by replacing the local development environment with Bun. There was no noticeable difference in daily tasks such as starting the local development server. The app I tried this time might have been too small to show significant differences. Although there was a difference in project creation, it is a one-time task, so it might not be a strong motivation to replace Node.js.

However, the easy setup and all-in-one nature of Bun compared to Node.js might be advantageous when starting development. We might be entering an era where runtimes are used differently depending on the production environment and development environment. The emergence of competitors can also be expected to drive improvements in Node.js.
