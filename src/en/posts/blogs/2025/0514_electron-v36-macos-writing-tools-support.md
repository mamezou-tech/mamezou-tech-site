---
title: Using macOS Apple Intelligence Writing Tools from an Electron App
author: masahiro-kondo
date: 2025-05-14T00:00:00.000Z
tags:
  - electron
  - 生成AI
image: true
translate: true

---

## Introduction

Electron 36.0.0 was released at the end of last month.

- [Electron 36.0.0 | Electron](https://www.electronjs.org/blog/electron-36-0)

A highlight feature is the ability to use macOS Apple Intelligence Writing Tools via the context menu.

:::info
As mentioned later, it’s possible to use Writing Tools from the Application menu in the menu bar in earlier versions of Electron instead of the context menu. All you need to do is enable Apple Intelligence; there’s no need to modify your app.
:::

## What is Apple Intelligence

Apple Intelligence is Apple’s AI platform available on Apple devices, and it can be used with iOS 18.1, iPadOS 18.1, and macOS Sequoia 15.1 or later. It also supports Japanese. When you enable Apple Intelligence, you gain access to image generation apps, Siri can integrate with ChatGPT to become smarter, and as a general feature, you can use Writing Tools in regular applications[^1].

[^1]: In Japanese, it's called “Sakubun Tools.”

@[og](https://www.apple.com/jp/apple-intelligence/)

You can enable it in Settings under “Apple Intelligence & Siri”[^2].

![Apple Intelligence](https://i.gyazo.com/6a17bb91198a07967a6acd061528963b.png)

[^2]: I interact with my Mac via keyboard, so I haven’t enabled Siri.

When Apple Intelligence is enabled, in any native application that displays or edits text, you can select text and call Writing Tools features from the app’s “Edit” menu or context menu to summarize or proofread the text.

- [Use Writing Tools with Apple Intelligence on Mac](https://support.apple.com/ja-jp/guide/mac-help/mchldcd6c260/mac)

Here’s how to call Writing Tools in the TextEdit application. You can select the desired feature from the “Writing Tools” submenu in the context menu.

![context menu](https://i.gyazo.com/b4a3272aaadc3732283c80dbedf737e6.png)

## Writing Tools Support in Electron’s Context Menu

The feature request to enable Writing Tools in the context menu was discussed in the following issue:

@[og](https://github.com/electron/electron/issues/44445)

The feature released in Electron v36 appears to have been implemented by the following PR, which adds OS-level menu item support:

@[og](https://github.com/electron/electron/pull/45138)

This is enabled by passing an option that receives an instance of the WebFrameMain class when constructing the menu.

- [webFrameMain | Electron](https://www.electronjs.org/docs/latest/api/web-frame-main)

:::info
As mentioned at the beginning of this article, if Apple Intelligence is enabled, you can use Writing Tools from the menu bar in existing Electron apps without any modifications. The newly supported use case is using Writing Tools from the context menu on text selected in elements like TextArea.

![Writing tools added in app menu](https://i.gyazo.com/b2abbbe106c4ac1aa7da37b7189ea104.png)
:::

## Enabling Writing Tools in an Electron App’s Context Menu

Below is a sample showing how to enable Writing Tools in the context menu of a basic Electron app that simply loads web content into the main window.

:::info
For how to display a context menu in an Electron app, see the following article:

@[og](/blogs/2025/01/07/build-context-menu-in-electron-app/)
:::

What we do here is just the usual context menu display: get the WebContents focusedFrame property (an instance of WebFrameMain) and pass it to the frame option of contextMenu.popup. Refer to the comments in the code for details.

```javascript
import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;

app.whenReady().then(() => {
  createWindow(); // Create main window

  // Context menu handling
  mainWindow.webContents.on('context-menu', (e, params) => {
    // Get the WebFrameMain instance of the main window
    const focusedFrame = mainWindow.webContents.focusedFrame;

    // Build menu template
    const menuTemplate = buildMenuTemplate(params);
    // Ideally, the visible attribute should be handled by Electron,
    // but since it hasn’t been processed recently, we filter it ourselves
    const visibleItems = menuTemplate.filter(item => item.visible);

    // Build context menu
    const contextMenu = Menu.buildFromTemplate(visibleItems);
    contextMenu.popup({
      window: mainWindow.webContents,
      frame: focusedFrame, // Specify the WebFrameMain instance
    });
  });
});

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800, height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });
  mainWindow.loadFile('index.html');
}

// Build menu template
function buildMenuTemplate(params) {
  const menuTemplete = [
     {
      label: 'Copy', // Copy text (using role)
      role: 'copy',
      visible: params.selectionText.trim().length > 0
    }
  ];
  return menuTemplete;
}
```

Here is the result. You can pass your app’s text data to Writing Tools via the “Writing Tools” menu and get the results. It works especially well with text areas.

![Sample app](https://i.gyazo.com/19b3417c15807274917ac8dd1da8c65e.png)

:::info
If you run the above code on Windows, it won’t do anything other than display the menu specified in the code, so it seems unnecessary to detect the platform and write separate code.
:::

I also tried integrating it into my own Scrapbox app: [My own Scrapbox app](https://github.com/kondoumh/sbe).

![sbe with writing tools 1](https://i.gyazo.com/9ec1872f3865bfc14392ea6038713904.png)![sbe with writing tools 2](https://i.gyazo.com/ebc3c8ff08ffe6e75a9c483bbde53dad.png)

Since the editing screen of Scrapbox differs from a regular text area, the “Replace” function did not work properly[^3].

[^3]: It worked if I copied first and then pasted directly.

## Conclusion

Electron enables you to create cross-platform apps, and it’s great to be able to incorporate OS-native convenient features into your app. The integration of each OS with generative AI will continue to advance, and Electron apps will also see improved usability in line with platform evolution.
