---
title: How to Display Context Menus in Electron Applications
author: masahiro-kondo
date: 2025-01-07T00:00:00.000Z
tags:
  - electron
image: true
translate: true

---

## Introduction
Last year, after updating to Electron v33.2.1, the context menu in my app suddenly stopped appearing.

At first, I thought that the library I was using (mentioned later) might not have kept up, so I looked into it. However, there were no such issues reported in the library's repository, so I rolled back the Electron version and left it for a while. Later, when Electron v33.3.0 was released, I checked the release notes and found that there was a bug with the context menu events in Electron itself.

@[og](https://github.com/electron/electron/pull/44953)

By updating Electron to v33.3.0, the context menu started appearing again.

For handling context menus, I am using the standard electron-context-menu.

@[og](https://www.npmjs.com/package/electron-context-menu)

I introduced it because it was convenient when I wasn't very familiar with Electron. In the past, it stopped working several times with Electron version upgrades, so I debugged it and submitted PRs to have it fixed. However, it became tedious to debug every time it stopped working.

Of course, Electron provides a menu API, and you can display context menus using the `popup` method. Since the parameters of the `context-menu` event contain all sorts of context information, I realized that most functionalities can be implemented[^1]. Therefore, I decided to build the context menu myself to reduce dependency on external libraries.

[^1]: I recall that in early versions of Electron, it was very troublesome to display context menus. Probably, the motivation behind developing electron-context-menu was to provide a simpler API.

:::info
We have extensively covered the architectural changes accompanying Electron's version upgrades. There are many breaking changes, and the number of Window classes and View classes that need to be handled continues to increase, so I think maintaining libraries requires considerable effort on the part of the authors.

- [Changes in the Electron Programming Model Seen from the Commit History of electron-quick-start](/blogs/2022/02/14/history-of-electron-quick-start/)
- [Electron - Migrating from WebView to BrowserView](/blogs/2022/01/07/electron-browserview/)
- [Since WebContentsView that Replaces BrowserView Has Been Implemented in Electron, Let's Take a Look](/blogs/2024/03/06/electron-webcontentsview/)

There is the evolution of Electron itself, but considering that the dependent Chrome is an active project used by everyone, I think it's inevitable.

:::

## Electron's Menu API
The menu API and events in Electron are documented in the following official documentation:

- [https://www.electronjs.org/docs/latest/api/menu#menupopupoptions](https://www.electronjs.org/docs/latest/api/menu#menupopupoptions)
- [https://www.electronjs.org/docs/latest/api/web-contents#event-context-menu](https://www.electronjs.org/docs/latest/api/web-contents#event-context-menu)

Implementing context menus using the menu API and events involves code roughly like the following[^2].

[^2]: This code supports ESM. The ESM support in Electron apps is introduced in "[Trying Out the ESM Support Added in Electron v28](/blogs/2023/12/06/electron-esm-support-available/)".

```javascript
import { app, BrowserWindow, Menu } from 'electron';

let mainWindow;

app.whenReady().then(() => {
  createWindow();

  mainWindow.webContents.on('context-menu', (e, params) => {  // 1
    const menuTemplate = buildMenuTemplate(params);           // 2
    const contextMenu = Menu.buildFromTemplate(menuTemplate); // 3
    contextMenu.popup({ window: mainWindow.webContents });    // 4
  });
});

function buildMenuTemplate(params) {
  const menuTemplate = [
    {
      label: 'menu1',
      click: () => { console.log('menu1 clicked'); }
    },
    {
      label: 'menu2',
      click: () => { console.log('menu2 clicked'); }
    },
  ];
  return menuTemplate;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    // Property settings
  });
  // Loading websites, etc.
}
```

1. Handle the `context-menu` event on the `webContents` property of the window that displays the context menu (in this example, `BrowserWindow`). The `params` object passed as an argument contains all the information about the displayed content.
2. Use the custom `buildMenuTemplate` function to construct an array of `MenuItem` objects. You can control the visibility of each menu item based on the values in `params`. In actual apps, implementing functions like `buildMenuTemplate` constitutes the largest amount of code.
3. Use the `Menu.buildFromTemplate` method to generate the context menu.
4. Use the `popup` method of the context menu to display the context menu.

:::info
The `webContents` object exists in the following classes:

- BrowserWindow
- BrowserView
- WebContentsView

Since `BrowserView` is deprecated, the `BrowserView.webContents` object is also deprecated.
Also, `BaseWindow`, which is used as a container for `WebContentsView`, does not have a `webContents` object. The structure is explained in the following article.

[Electron - Visualizing App Structures in the WebContentsView Era](/blogs/2024/08/28/electron-webcontentsview-app-structure/)
:::

## Identifying Links and Retrieving Selected Text
In Electron apps, it is important to vary the context menu according to the content at the click position (which is obvious, since it's context-sensitive). In my app, I frequently use handling for link clicks and selected text.

Here is an example of a menu that becomes active when a link is right-clicked. Whether the clicked item is a link can be determined by checking if the `linkURL` property of the `params` object has a value.

```javascript
// Excerpt from the array definition of the menu template
    {
      label: 'Open',
      click: () => { openLink(params.linkURL); },  // 1
      visible: params.linkURL                      // 2
    },
```
1. Calls a custom `openLink` function that opens the `linkURL` from `params`. In the `openLink` function, you implement the process of opening another Electron window or opening the link in a browser using methods like `shell.openExternal`.
2. Uses the `visible` property to display the menu only when `params.linkURL` contains a URL string.

Here is the result of execution.
![open link](https://i.gyazo.com/aed4101103ed4909c8c14f338a07150b.png)

Here is an example of a menu that becomes active when text in the content is selected. It implements a function to search the selected text on Google. Whether the clicked item is selected text can be determined by checking if `params.selectionText` has a valid value.

```javascript
// Excerpt from the array definition of the menu template
    {
      label: `Search "${params.selectionText}" on Google`, // 1
      click: () => {                                        // 2
        const url = new URL('https://www.google.com/search');
        url.searchParams.set('q', params.selectionText);
        shell.openExternal(url.toString());
      },
      visible: params.selectionText.trim().length > 0      // 3
    },
```
1. Displays the selected text in the menu.
2. Implements the process to perform a Google search.
3. Uses the `visible` property to display the menu only when text is selected.

Here is the result of execution.
![Google search](https://i.gyazo.com/1c01a4f433c30991b2183ed4f20c5d86.png)

## Copying Images, etc.
Besides links and selected text, you may also want to implement features to copy displayed images or image URLs to the clipboard.

Image copying can be easily implemented using a convenient method called `webContents.copyImageAt`. The URL of the image can also be obtained from the `srcURL` of the `params` object.

The key point is to determine the `visible` attribute using the `mediaType` property of the `params` object.

```javascript
// Excerpt from the array definition of the menu template
    {
      label: 'Copy Image',
      click: () => { content.copyImageAt(params.x, params.y); },
      visible: params.mediaType === 'image'
    },
    {
      label: 'Copy Image URL',
      click: () => { clipboard.writeText(params.srcURL); },
      visible: params.mediaType === 'image'
    },
```

Here is the result of execution.
![copy image](https://i.gyazo.com/4f4f2dbb42c8a4349c69a7dca22d4e66.png)

## Conclusion
I was able to part ways with electron-context-menu, which I had been using for many years. When I tried it, it was easy. In the case of menus, the amount of code for defining the menu itself is greater than the amount of code reduced by using a library, so it doesn't feel excessively verbose. If you're concerned, it might be good to extract it into a separate module to accommodate fine specification additions.

electron-context-menu independently implements editing functions for `webContents` and properly releases resources such as event handlers, so it is high quality and there is no problem using it currently. However, there is a risk that it might no longer be maintained, so if possible, it is recommended to implement using only Electron's APIs.
