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

The highlight feature is that you can now use macOS Apple Intelligence’s Writing Tools via the context menu.

:::info
As mentioned later, you can also use Writing Tools from the application menu in the menu bar in previous versions of Electron rather than via the context menu. You only need to enable Apple Intelligence; there is no need to modify your app.
:::

## What is Apple Intelligence

Apple Intelligence is an AI platform provided on Apple’s devices, available from iOS 18.1, iPadOS 18.1, and macOS Sequoia 15.1 onward. It also supports Japanese. When you enable Apple Intelligence, you can use image generation apps, Siri can integrate with ChatGPT to become smarter, and as a general-purpose feature, you can use Writing Tools in regular applications[^1].

[^1]: In Japanese, it is called “作文ツール”.

@[og](https://www.apple.com/jp/apple-intelligence/)

You enable it from Settings under “Apple Intelligence & Siri”[^2].

![Apple Intelligence](https://i.gyazo.com/6a17bb91198a07967a6acd061528963b.png)

[^2]: The author interacts with his Mac via keyboard, so Siri is not enabled.

Once Apple Intelligence is enabled, you can select text in any native application that displays or edits text and invoke Writing Tools features from the app’s “Edit” menu or the context menu to summarize or proofread the text.

- [MacのApple Intelligenceで作文ツールを使用する](https://support.apple.com/ja-jp/guide/mac-help/mchldcd6c260/mac)

Here is how you invoke Writing Tools in the TextEdit application. You can call the desired feature from the “Writing Tools” submenu in the context menu.

![context menu](https://i.gyazo.com/b4a3272aaadc3732283c80dbedf737e6.png)

## Writing Tools Support in Electron’s Context Menu

The feature request to enable Writing Tools in the context menu was discussed in the following issue.

@[og](https://github.com/electron/electron/issues/44445)

The feature released in Electron v36 appears to have been implemented by the following PR, which adds OS-level menu item support.

@[og](https://github.com/electron/electron/pull/45138)

This is enabled by an option that accepts a WebFrameMain class instance when building menus.

- [webFrameMain | Electron](https://www.electronjs.org/docs/latest/api/web-frame-main)

:::info
As mentioned at the beginning of this article, if Apple Intelligence is enabled, you can use Writing Tools from the menu bar in existing Electron apps without making any changes. What was supported this time is the use case where you want to use Writing Tools from the context menu on text selected in a TextArea or similar.

![Writing tools added in app menu](https://i.gyazo.com/b2abbbe106c4ac1aa7da37b7189ea104.png)
:::

## Enabling Writing Tools in an Electron App’s Context Menu

Here’s a sample showing how to enable Writing Tools in the context menu of a basic Electron app that simply loads web content in the main window.

:::info
For information on how to display a context menu in an Electron app, see the following article:

@[og](/blogs/2025/01/07/build-context-menu-in-electron-app/)
:::

What you do is, in the normal context menu display, get the focusedFrame property (an instance of WebFrameMain) from WebContents, and specify it in the frame option of contextMenu.popup. See the comments in the code for details.

```javascript
import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;

app.whenReady().then(() => {
  createWindow(); // Create the main window

  // Context menu handling
  mainWindow.webContents.on('context-menu', (e, params) => {
    // Get the WebFrameMain class of the main window
    const focusedFrame = mainWindow.webContents.focusedFrame;

    // Build the menu template
    const menuTemplate = buildMenuTemplate(params);
    // The visible attribute should normally be handled by Electron, but it hasn’t been recently, so we filter it ourselves
    const visibleItems = menuTemplate.filter(item => item.visible);

    // Build the context menu
    const contextMenu = Menu.buildFromTemplate(visibleItems);
    contextMenu.popup({
      window: mainWindow.webContents,
      frame: focusedFrame, // Set the instance of WebFrameMain
    });
  });
});

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800, height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });
  mainWindow.loadFile('index.html');
}

// Build the menu template
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

Result of running this. From the “Writing Tools” menu you can pass the app’s text data to Writing Tools and get results. It works particularly well in text areas.

![Sample app](https://i.gyazo.com/19b3417c15807274917ac8dd1da8c65e.png)

:::info
If you run the above code on Windows, nothing special happens except that the specified menu is displayed, so it seems you don’t need to detect the platform and write separate code.
:::

I also integrated this into my Scrapbox app.

![sbe with writing tools 1](https://i.gyazo.com/9ec1872f3865bfc14392ea6038713904.png)![sbe with writing tools 2](https://i.gyazo.com/ebc3c8ff08ffe6e75a9c483bbde53dad.png)

Since Scrapbox’s edit screen is different from a regular text area, the “Replace” function did not work properly[^3].

[^3]: It worked fine if I copied once and then pasted directly.

## Conclusion

Electron allows you to build cross-platform apps, and it’s great to be able to incorporate convenient OS-native features into your app. The integration of each OS with generative AI will continue to progress, and Electron apps will also become more convenient in line with platform evolution.
