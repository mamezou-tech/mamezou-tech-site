---
title: Electron - Visualizing App Structure in the WebContentsView Era
author: masahiro-kondo
date: 2024-08-28T00:00:00.000Z
tags:
  - electron
image: true
translate: true

---

## Introduction

In the spring of this year, WebContentsView was introduced to Electron and became official in v30.0.0. As a result, the traditional BrowserView has been deprecated.

[Checking out the implementation of WebContentsView replacing BrowserView in Electron](/blogs/2024/03/06/electron-webcontentsview/)

Originally, BrowserView and WebContentsView were components for multi-view apps. I felt that the app structure differs slightly when using BrowserView versus WebContentsView, so I decided to visualize it.

## Single View App Structure with BrowserWindow

Let's start with a single view app. In Electron, the structure of a single view app is roughly as follows. One window uses one Renderer process.

![](/img/blogs/2024/0828_electron-webcontentsview-app-structure/singleview-app-structure.drawio.png)

The Main process holds the webContents in BrowserWindow and loads the web page. The webContents is responsible for rendering and controlling the web page. Interaction between the Renderer process and the Main process is done via the Context Bridge through a preload script.

- [BrowserWindow | Electron](https://www.electronjs.org/ja/docs/latest/api/browser-window)
- [webContents | Electron](https://www.electronjs.org/ja/docs/latest/api/web-contents)

:::info

For more on the structure of Electron apps, please refer to the following article.

[The Evolution of the Electron Programming Model as Seen in the Commit History of electron-quick-start](/blogs/2022/02/14/history-of-electron-quick-start/)

:::

## App Structure in the BrowserWindow + BrowserView Era

Using BrowserView, you could maintain multiple views in the main BrowserWindow and manage individual Renderer processes for each.

![](/img/blogs/2024/0828_electron-webcontentsview-app-structure/browserview-app-structure.drawio.png)

Since both BrowserWindow and BrowserView can render web pages using webContents, if you wanted to render something in the main BrowserWindow, you needed to prepare separate renderer scripts and preload scripts for both BrowserWindow and BrowserView.

- [BrowserView | Electron](https://www.electronjs.org/ja/docs/latest/api/browser-view)

:::info

Being an experimental API, BrowserView was implemented in a tightly coupled manner with BrowserWindow.

BrowserWindow directly held BrowserView, providing methods like `addBrowserView` and `removeBrowserView`.

:::

## App Structure with BaseWindow + WebContentsView Specialized for Multi-View

WebContentsView assumes using BaseWindow as the main window instead of BrowserWindow. The documentation notes the following:

> BaseWindow provides a flexible way to create multiple web views in a single window.

WebContentsView holds each view in the contentView property of BaseWindow. BaseWindow itself no longer has a webContents property. It only manages WebContentsView in the contentView property, delegating rendering and control to each WebContentsView[^1].

[^1]: The contentView is a newly established View class with the introduction of WebContentsView, and WebContentsView inherits from this class.

![](/img/blogs/2024/0828_electron-webcontentsview-app-structure/webcontentsview-app-structure.drawio.png)

The contentView property of BaseWindow holds each WebContentsView as a ChildView. Since BaseWindow does not have a Renderer process, renderer scripts and preload scripts need to be prepared for each WebContentsView.

- [BaseWindow | Electron](https://www.electronjs.org/ja/docs/latest/api/base-window)
- [WebContentsView | Electron](https://www.electronjs.org/ja/docs/latest/api/web-contents-view)
- [View | Electron](https://www.electronjs.org/ja/docs/latest/api/%E8%A1%A8%E7%A4%BA)

:::info

You can configure a single view app by making contentView the only WebContentsView, but in that configuration, it's simpler to use the traditional BrowserWindow. The documentation for BaseWindow also states:

> For a window with only one full-sized web view, the BrowserWindow class might be a simpler option.

:::

## Transition from BrowserView to WebContentsView

Here is a brief introduction to the steps for transitioning a multi-view app from BrowserView to WebContentsView.

1. Replace BrowserWindow with BaseWindow
2. If using webContents of BrowserWindow, add a dedicated WebContentsView and move the preload script
3. Replace parts using BrowserView with WebContentsView
4. Implement your own method to control the display order of BrowserView

For step 4, since there is no equivalent method to `setTopBrowserView` in WebContentsView, you need to implement the process of reordering.

A sample app for BrowserView is published on GitHub under the mamezou-tech organization.

[GitHub - mamezou-tech/electron-example-browserview: Example of Electron app that registers and switches between multiple BrowserViews.](https://github.com/mamezou-tech/electron-example-browserview)

:::info

This repository was created when writing the following article.

[Electron - Transition from WebView to BrowserView](/blogs/2022/01/07/electron-browserview/)

:::

This time, I migrated the sample in this repository to WebContentsView. The PR created is below.

[feat: Replace BrowserView to WebContentsView by kondoumh · Pull Request #5 · mamezou-tech/electron-example-browserview](https://github.com/mamezou-tech/electron-example-browserview/pull/5)

The repository name still includes BrowserView.

## Conclusion

Above, I summarized the structure of multi-view apps using WebContentsView, compared to single view apps and multi-view apps in the BrowserView era, and also provided a simple migration sample.

In somewhat feature-rich apps, I think it's common to adopt a multi-view structure. In multi-view apps, you might want the main window to have UI for switching and resizing tabs, as well as layout features. For now, you have to implement these yourself, so it would be nice if Electron provided some support.

In any case, let's implement multi-view apps using WebContentsView in Electron going forward.

:::info

In Tauri, it seems they are developing a Servo-based WebView that supports multi-view, and have even launched a dedicated browser project called Verso for this purpose.

- [NLnet; Servo improvements for Tauri](https://nlnet.nl/project/Verso/)
- [GitHub - versotile-org/verso: A web browser that plays old world blues to build new world hope](https://github.com/versotile-org/verso)

Currently, Tauri uses the WebView implementation present in the environment (WebKit on macOS, Chromium on Windows, etc.), so there are cross-browser issues. If Tauri makes it easy to create truly cross-platform multi-view apps, I might want to switch.

I'm looking forward to its official release.

:::
