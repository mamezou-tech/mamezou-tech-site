---
title: WebContentsView Implemented to Replace BrowserView in Electron
author: masahiro-kondo
date: 2024-03-06T00:00:00.000Z
tags:
  - electron
image: true
translate: true

---




## Introduction

With the release of Electron v29, WebContentsView has been implemented as a future replacement for BrowserView.

> Added WebContentsView and BaseWindow, replacing the now-deprecated BrowserView APIs.

[Release electron v29.0.0 · electron/electron](https://github.com/electron/electron/releases/tag/v29.0.0)

The PR that was merged is as follows.

[feat: replace BrowserView with WebContentsView by trop[bot] · Pull Request #40759 · electron/electron](https://github.com/electron/electron/pull/40759)

BrowserView has been deprecated in this release.

> The BrowserView class is deprecated, and replaced by the new WebContentsView class.

[electron/docs/api/browser-view.md at main · electron/electron](https://github.com/electron/electron/blob/main/docs/api/browser-view.md)

:::info
BrowserView has been recommended as a method for embedding web content. Before that, WebView was widely used. BrowserView is introduced in the following article.

[Electron - Migrating from WebView to BrowserView](/blogs/2022/01/07/electron-browserview/)
:::

In addition to the traditional BrowserWindow, BaseWindow has been added. As of the time of writing this article, the API for BaseWindow and WebContentsView is not yet documented, but the following files in the repository correspond to them.

- [electron/docs/api/base-window.md at main · electron/electron](https://github.com/electron/electron/blob/main/docs/api/base-window.md)
- [electron/docs/api/web-contents-view.md at main · electron/electron](https://github.com/electron/electron/blob/main/docs/api/web-contents-view.md)

base-window.md states that it "provides a flexible way to compose multiple web views in a single window." It seems that combining BaseWindow and WebContentsView is intended for building multi-web-view apps.

## Let's Try It Out

To try WebContentsView, you need to use the alpha release of Electron v30.

Download [electron-quick-start](https://github.com/electron/electron-quick-start), run `npm install`, and then install the alpha version as follows.

```shell
npm install electron@alpha
```

At the time of writing this article, it was v30.0.0-alpha.4.

:::info
It's easier to create a project with Electron Forge. Please refer to the following article for Electron Forge.

[Introduction to Electron Forge](/blogs/2024/01/29/electron-forge-introduction/)
:::

We will use BaseWindow and WebContentsView. Since these APIs can only be used after the app's `ready` event is emitted, we implement them inside `app.whenReady().then()`.

```javascript:index.js
const { app, BaseWindow, WebContentsView } = require('electron');

app.whenReady().then(() => {
  const win = new BaseWindow({ width: 800, height: 600 }); // 1

  const leftView = new WebContentsView();  // 2
  leftView.webContents.loadURL('https://electronjs.org');
  win.contentView.addChildView(leftView);  // 3

  const rightView = new WebContentsView(); // 4
  rightView.webContents.loadURL('https://github.com/electron/electron');
  win.contentView.addChildView(rightView); // 5

  leftView.setBounds({ x: 0, y: 0, width: 400, height: 600 }); // 6
  rightView.setBounds({ x: 400, y: 0, width: 400, height: 600 });
});
```
The following steps are used to build a multi-web-view app.

1. Create a BaseWindow with a size of 800x600
2. Create a WebContentsView and load the Electron official site as web content
3. Add the above WebContentsView to the BaseWindow
4. Create another WebContentsView and load Electron's GitHub repository
5. Add the above WebContentsView to the BaseWindow
6. Place the two WebContentsViews on the left and right sides of the BaseWindow

Let's execute it.

```shell
npm start
```

A single window was split into two and displayed each content.

![sample app](https://i.gyazo.com/73b2a9b15ad4c33b911254d2dc9e42a9.png)

## Background of WebContentsView's Introduction
Preparation for WebContentsView began about two years ago. It is introduced in the "Refactor of window model with WebContentsView" section of the Electron 2022 refactor summary blog.

> The first planned change is to publicly expose Chrome's WebContentsView through Electron's API. This will be the successor to the existing BrowserView API (which, despite its name, is unrelated to Chromium Views and is specific to Electron code). With the public release of WebContentsView, we will have a reusable View object that can display web content, paving the way for the BrowserWindow class to be pure JavaScript and further simplifying code complexity.

[Maintainer Summit 2022 Recap | Electron](https://www.electronjs.org/ja/blog/maintainer-summit-2022-recap)

It was a refactoring to make Chrome's native WebContentsView usable from Electron. Originally, BrowserView was independently implemented by the developers of Figma as an alternative to WebView[^1], but this custom implementation had complicated the code.

[^1]: WebView is also an exposure of Chrome's internal modules, used for extensions in Chrome.

## The Gap Between BrowserView and WebContentsView
WebContentsView itself is expected to be as manageable as BrowserView, so the migration should not be too difficult.

BrowserWindow exposes the following APIs for BrowserView, providing its container functionality.

- setBrowserView
- getBrowserView
- addBrowserView
- removeBrowserView
- setTopBrowserView
- getBrowserViews

[BrowserWindow | Electron](https://www.electronjs.org/ja/docs/latest/api/browser-window)

WebContentsView inherits from the newly established View class.

[electron/docs/api/view.md at main · electron/electron](https://github.com/electron/electron/blob/main/docs/api/view.md)

BaseWindow does not provide direct APIs like BrowserWindow, but manages WebContentsView via the contentView property (which is actually a View class). The View provides the following management APIs.

- addChildView
- removeChildView

If the premise is multiple views, the equivalent of BrowserWindow's setBrowserView/getBrowserView may not be necessary, but a method to get all ChildViews would be desirable.

:::column: Z-axis swapping of Views
It would be nice to have a convenient API for swapping the Z-axis order, similar to BrowserWindow's setTopBrowserView. The signature of addChildView allows specifying an index, so it seems possible to implement it on the app side as well.

`view.addChildView(view[, index])`
 - `view` View - Child view to add.
 - `index` Integer (optional) - Index at which to insert the child view. Defaults to adding the child at the end of the child list.
:::

## Conclusion
This was a brief look at WebContentsView, which is expected to become mainstream. It is expected to be officially usable in Electron v30.
BrowserView has always been considered an experimental API. Although it will be maintained as a deprecated API for a while, a transition will eventually be necessary.
