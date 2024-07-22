---
title: Trying Out ESM Support with Electron v28
author: masahiro-kondo
date: 2023-12-06T00:00:00.000Z
tags:
  - electron
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2023/12/06/electron-esm-support-available/).
:::



## Introduction

Electron v28.0.0 has been released with support for ESM (ECMA Script Modules).

[Electron Releases - v28.0.0](https://releases.electronjs.org/release/v28.0.0)

Finally, ESM is now usable in Electron.

## Electron's ESM Support Status

The following page in the documentation describes how to handle this support.

[ES Modules (ESM) in Electron | Electron](https://www.electronjs.org/docs/latest/tutorial/esm)

The [ESM support matrix](https://www.electronjs.org/docs/latest/tutorial/esm#summary-esm-support-matrix) (screenshot) from the same page is shown here.

![ESM Support matrix](https://i.gyazo.com/3d11643d9b8bee56d8ff63db366d86c2.png)

In summary, the situation is as follows:

- The Main process uses Node.js's ESM Loader
- The Renderer process uses Chromium's ESM Loader
- For Preload scripts:
  - If the Renderer process is sandboxed, the ESM Loader is not supported
  - If the Renderer process is not sandboxed, Node.js's ESM Loader is used (thus the `.mjs` extension is necessary)

In Electron's Main process, unlike the synchronous module loading of traditional CommonJS, ES Module loading is asynchronous, so care must be taken as follows:

> Calls to Electron API such as ESM's dynamic import or `app.setPath` are not executed in the order they appear in the code. These need to be executed before the Electron app's `ready` event, but since they are asynchronous, they might run after the `ready` event. Therefore, to maintain traditional behavior, these should be called with await.

Using top-level await with ESM makes it easy to implement await calls.

For preload scripts, if possible, Node.js's ESM Loader is used. In this case, the file extension must be `.mjs`. If you want to use Node.js or Electron features in preload scripts, this approach should be adopted. There are restrictions, such as not being able to use Node.js's dynamic import if Context Isolation is not enabled. See the section below for details.

[Preload scripts](https://www.electronjs.org/docs/latest/tutorial/esm#preload-scripts)

:::info
For information about sandboxing the Renderer process, see the following article.

[Electron v20 で有効化された Renderer プロセスサンドボックス化に対応する](/blogs/2022/08/03/electron-renderer-process-sandboxed/)
:::

## Making Your Application ESM Compatible

Last year's article "[Electron - Moving from WebView to BrowserView](/blogs/2022/01/07/electron-browserview/)" covered updating a sample application to Electron v28.0.0 for ESM compatibility. This application was straightforward to update, involving only the package.json and Main process, as it was already sandboxed and had Context Isolation enabled.

### package.json
- Added the line `"type": "module"`

### Main Process

- Changed file extensions to `.mjs`
- Changed `require` to `import`
- Modified places using `__filename`, `__dirname` to get from the url package's `fileURLToPath`

No changes were needed for dynamic import or `app.setPath` as they were not used.

### Preload Script

- No changes

In a sandboxed environment, since the ESM Loader is not supported, traditional `require` is used when calling Electron features.

### Renderer Process

- No changes

The repository for this app is available here.

[GitHub - mamezou-tech/electron-example-browserview: Example of Electron app that registers and switches between multiple BrowserViews.](https://github.com/mamezou-tech/electron-example-browserview)

## Conclusion
With the introduction of ESM support, it is likely that more Electron apps and packages will become ESM compatible.

In an article written early last year, "[History of Electron Programming Models Seen through electron-quick-start's Commit History](/blogs/2022/02/14/history-of-electron-quick-start/)", I speculated that,

> In the future, support for ES Modules and similar features might be introduced.

Looking at the [electron-quick-start repository](https://github.com/electron/electron-quick-start), ESM support has not yet been implemented in the code itself.
