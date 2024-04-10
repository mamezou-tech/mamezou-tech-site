---
title: Introduction to Electron Forge
author: masahiro-kondo
date: 2024-01-29T00:00:00.000Z
tags:
  - electron
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/01/29/electron-forge-introduction/).
:::



## Introduction

In Electron app development, it has become customary to start with a startup project called [electron-quick-start](https://github.com/electron/electron-quick-start).

Electron provides the skeleton for desktop apps through a bridge between Web UI and Node.js. However, it did not support app packaging or publishing. Developers had to create their pipeline for build→packaging→publishing using third-party tools and libraries.

I also started my project with electron-quick-start, adding packagers and test tools later. As the app development phase progressed, I had to try various libraries and struggled with configurations, which required a lot of trial and error.

:::info
The following article introduces electron-quick-start.

[The Evolution of the Electron Programming Model Through the Commit History of electron-quick-start](/blogs/2022/02/14/history-of-electron-quick-start/)
:::

## What is Electron Forge

Electron Forge is an all-in-one tool for generating projects, building, and distributing Electron apps.

The official documentation and GitHub repository are as follows:

- [Getting Started - Electron Forge](https://www.electronforge.io/)
- [GitHub - electron/forge: :electron: A complete tool for building and publishing Electron applications](https://github.com/electron/forge)

It seems development started in 2016.

It is an official tool mentioned in the Electron official documentation for app distribution.

[Distributing Apps With Electron Forge | Electron](https://www.electronjs.org/docs/latest/tutorial/forge-overview)

The following figure is taken from the Forge official documentation [Build Lifecycle](https://www.electronforge.io/core-concepts/build-lifecycle) chapter. It shows the workflow for Electron app packaging (executable bundling), installer creation, and publishing supported by Forge.

> ![Build life cycle](https://i.gyazo.com/bbb1c7b3b48fd1a2739683e2145d7f5e.webp)

Introducing Electron Forge eliminates confusion points regarding packaging and distribution.

The motivation for developing Forge and the value it provides are written in the following chapter of the official documentation.

[Why Electron Forge - Electron Forge](https://www.electronforge.io/core-concepts/why-electron-forge)

In the Electron ecosystem, there were single-function tools like electron-packager and electron-builder. Electron Forge integrates these tools and immediately provides the following features:

- Application packaging
- Code signing
- Platform-specific installer creation
- Native rebuild of Node.js ([electron/rebuild](https://github.com/electron/rebuild))
- Universal macOS build ([electron/universal](https://github.com/electron/universal))

## Forge Plugins

Plugins support Webpack / Vite.

[Plugins - Electron Forge](https://www.electronforge.io/config/plugins)

Support for Parcel is also being considered for the future.

[Parcel - Electron Forge](https://www.electronforge.io/guides/framework-integration/parcel)

There are several other plugins available, for example:

- [Electronegativity Plugin - Electron Forge](https://www.electronforge.io/config/plugins/electronegativity): A plugin to use the tool [Electronegativity](https://github.com/doyensec/electronegativity) that checks for vulnerabilities in Electron apps
- [Fuses Plugin - Electron Forge](https://www.electronforge.io/config/plugins/fuses): A plugin for [Fuse](https://www.electronjs.org/docs/latest/tutorial/fuses) to control the enable/disable of Electron's features

I was not aware of Electronegativity. It seems it can be used in CI/CD, so I would like to research it and write an article about it.

## Creating a Project
A CLI for project creation is also provided, allowing you to choose Webpack, Vite, and use TypeScript.
You specify it with the `--template` argument like `webpack` or `webpack-typescript`.

Here is an example of generating a project named forge-example with the Vite template.

```shell
npm init electron-app@latest forge-example -- --template=vite
```

The package.json included the CLI and libraries of Forge. It also specified packages for using Squirrel.Windows (mentioned later) for Windows installers.

```json
  "devDependencies": {
    "@electron-forge/cli": "^7.2.0",
    "@electron-forge/maker-deb": "^7.2.0",
    "@electron-forge/maker-rpm": "^7.2.0",
    "@electron-forge/maker-squirrel": "^7.2.0",
    "@electron-forge/maker-zip": "^7.2.0",
    "@electron-forge/plugin-auto-unpack-natives": "^7.2.0",
    "@electron-forge/plugin-vite": "^7.2.0",
    "electron": "28.2.0"
  },
  "dependencies": {
    "electron-squirrel-startup": "^1.0.0"
  }
```

## Launching & Debugging the App in Development Environment

When debugging the app, a local server for WebUI is also launched.

```shell
$ npm start

> forge-example@0.1.0 start
> electron-forge start

✔ Checking your system
✔ Locating application
✔ Loading configuration
✔ Preparing native dependencies [0.1s]
✔ Running generateAssets hook
⠙ [plugin-vite] Launching dev servers for renderer process code
◼ [plugin-vite] Compiling main process code
✔ [plugin-vite] Launching dev servers for renderer process code [0.1s]
⠙ [plugin-vite] Compiling main process code
vite v4.5.2 building for development...

watching for file changes...
vite v4.5.2 building for development...

watching for file changes...

build started...

build started...
✓ 1 modules transformed.
✓ 1 modules transformed.
Generated an empty chunk: "preload".
.vite/build/main.js  0.44 kB │ gzip: 0.32 kB
built in 30ms.
✔ [plugin-vite] Launching dev servers for renderer process code [0.1s]
✔ [plugin-vite] Compiling main process code [0.0s]
```

The app is launched, and the familiar DevTools are available.

![Hello world](https://i.gyazo.com/729747651215ac43a192136092d59273.png)

## Framework Support

The default support is for Vanilla JS, but React and Vue can be used.

[Framework Integration - Electron Forge](https://www.electronforge.io/guides/framework-integration)

Following the guide, I added a Vue development environment.

[Vue 3 - Electron Forge](https://www.electronforge.io/guides/framework-integration/vue-3)

Install Vue and Vite's Vue plugin.

```shell
npm i vue
npm i -D @vitejs/plugin-vue
```

This installs the packages necessary for UI development with Vue. However, it does not handle Vue asset generation, so you need to add it manually.

I generated a Vue 3 project and copied the src/assets, src/components, App.vue, etc., from the Vue project to the src directory of the Forge project.

```shell
npm create vue@latest
```

Add a div element for the Vue app to the body of index.html.

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Hello World!</title>

  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/renderer.js"></script>
  </body>
</html>
```

Replace src/renderer.js with the following code to create a Vue app.

```javascript
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

Modify the content of vite.renderer.config.mjs to use plugin-vue as follows.

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()]
});
```
Now, you can run UIs using Vue components in Electron, developing as you would with a regular Vue SPA.

![](https://i.gyazo.com/c002701db2fbae9fc6a952530ccfe2e0.png)

## Building the App

Executing the npm script `package` in package.json generates platform-specific executables.

```shell
npm run package
```

On an Apple Silicon MacBook Pro, the macOS app was output under `out/<project-name>-darwin-arm64`.

## Using Makers

Makers can generate platform-specific installers for you.

[Makers - Electron Forge](https://www.electronforge.io/config/makers)

Execute the npm script `make`.

```shell
npm run make
```

When run on an Apple Silicon MacBook Pro, the default state of the Forge project generates a Zip archive under `out/make/zip/darwin/arm64`, named something like `forge-example-darwin-arm64-0.1.0.zip`.

To generate a macOS DMG installer, you need to install the @electron-forge/maker-dmg package.

```shell
npm i -D @electron-forge/maker-dmg
```

Add the configuration for maker-dmg to the `makers` array in forge.config.js as follows.

```json
  makers: [
    {
      name: `@electron-forge/maker-dmg`,
      config: {
        format: 'ULFO'
      }
    }
  ]
```

Now, executing `npm run make` generates a DMG file named something like `forge-example-0.1.0-arm64.dmg` under `out/make`.

For more details, refer to the following documentation:

[DMG - Electron Forge](https://www.electronforge.io/config/makers/dmg)

The package formats supported by Makers are as follows:

| Format | Description |
|:-------|:------------|
| AppX | For Windows Store |
| deb  | For Debian-based Linux distributions |
| DMG  | For macOS |
| Flatpak | For the Linux package manager Flatpak |
| Pkg | For the Mac App Store |
| RPM | For RedHat-based Linux distributions |
| Snapcraft | For the Linux package manager Snap |
| Squirrel.Windows | For the ClickOnce-like Windows app installer/updater [Squirrel.Windows](https://github.com/Squirrel/Squirrel.Windows) |
| WiX MSI | For the Windows app installer format MSI |
| Zip | For ZIP files |

However, looking at this, there are many installer formats for both Windows and Linux.

## Using Publishers

Publishers distribute the app to services for users to download, install, and update.

[Publishers - Electron Forge](https://www.electronforge.io/config/publishers)

The following services are available:

- Bitbucket
- [Electron Releaser Server](https://github.com/ArekSredzki/electron-release-server)
- GitHub
- Google Cloud Storage
- [Nucleus](https://github.com/atlassian/nucleus)
- S3
- Snapcraft

Write the configuration for each service in forge.config.js and execute the npm script `publish`.

```shell
npm run publish
```

## Conclusion
This article briefly summarized the process of app development, packaging, and publishing with Electron Forge. It's convenient to have an all-in-one solution that keeps up with Electron version upgrades.

Previously introduced, electron-vite is a tool that supports project creation, development, and debugging.

[Boosting Productivity in Electron App Development with electron-vite](/blogs/2023/05/22/electron-vite/)

Forge feels more supportive of packaging and publishing.

I thought about incorporating Forge into apps under development. The official documentation mentions how to incorporate it into existing projects.

[Importing an Existing Project - Electron Forge](https://www.electronforge.io/import-existing-project)
