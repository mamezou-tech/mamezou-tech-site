---
title: 在 Electron 应用中显示上下文菜单的方法
author: masahiro-kondo
date: 2025-01-07T00:00:00.000Z
tags:
  - electron
image: true
translate: true

---

## 引言
去年将 Electron 更新到 v33.2.1 后，应用的上下文菜单突然无法显示了。

起初我以为是使用的库（后文会提到）没有跟上版本更新，于是进行了调查，但相关库的仓库里并没有类似的问题被提出。于是，我将 Electron 的版本降级后暂时搁置了这个问题。后来，Electron 发布了 v33.3.0，从发布说明里了解到，似乎是 Electron 本体的上下文菜单事件存在一个 bug。

@[og](https://github.com/electron/electron/pull/44953)

升级到 Electron v33.3.0 后，上下文菜单能正常显示了。

在处理上下文菜单时，我使用了经典的 `electron-context-menu`。

@[og](https://www.npmjs.com/package/electron-context-menu)

刚开始使用 Electron 时，这个库非常方便，所以就引入了。但因为 Electron 的升级问题，这个库曾多次出现无法运行的状况，我调试后也发布过 PR 来修复这些问题。渐渐地，每次出现问题都要调试让我感到很麻烦。

当然，Electron 本身提供了菜单的 API，如果使用 `popup` 方法的话，可以显示上下文菜单。而且，在 `context-menu` 事件的参数中，包含了各种上下文信息，大多数的逻辑处理都可以通过这些数据实现[^1]。因此，我决定自己构建上下文菜单，以减少对第三方库的依赖。

[^1]: 我记得在早期的 Electron 中，显示上下文菜单非常麻烦。`electron-context-menu` 的开发初衷可能就是为了提供一个简便的 API。

:::info
关于 Electron 随着版本升级的架构演变，我之前已经详细探讨过。Electron 的破坏性更新较多，而且需要处理的 Window 类和 View 类也在不断增加，对于库的维护者来说，确实是个不小的负担。

- [通过 `electron-quick-start` 的提交历史看 Electron 编程模型的演变](/blogs/2022/02/14/history-of-electron-quick-start/)
- [从 WebView 迁移到 BrowserView 的 Electron 实践](/blogs/2022/01/07/electron-browserview/)
- [Electron 中替代 BrowserView 的 WebContentsView 实现](/blogs/2024/03/06/electron-webcontentsview/)

虽然 Electron 本身的进化存在一定原因，但作为依赖了全世界都在使用的活跃项目 Chrome，这是不可避免的。
:::

## Electron 的 Menu API
关于 Electron 的菜单 API 和相关事件，官方文档里有详细的说明：

- [https://www.electronjs.org/docs/latest/api/menu#menupopupoptions](https://www.electronjs.org/docs/latest/api/menu#menupopupoptions)
- [https://www.electronjs.org/docs/latest/api/web-contents#event-context-menu](https://www.electronjs.org/docs/latest/api/web-contents#event-context-menu)

通过菜单 API 和事件实现上下文菜单的代码大致如下[^2]。

[^2]: 为了支持 ESM 的代码实现。关于 Electron 应用中 ESM 的支持，请参阅《[Electron v28 开始支持 ESM 的实践](/blogs/2023/12/06/electron-esm-support-available/)》。

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
    // 属性设置
  });
  // 加载网站等
}
```

1. 使用 `webContents` 属性处理上下文菜单的 `context-menu` 事件（此例中为 `BrowserWindow`）。`params` 参数对象中包含了与正在显示的内容相关的各种信息。
2. 自定义的 `buildMenuTemplate` 函数，用来构建 `MenuItem` 对象的数组。可以根据 `params` 的值控制各菜单项的显示与隐藏。在实际应用中，这个函数的实现量通常是最多的。
3. 使用 `Menu.buildFromTemplate` 方法生成上下文菜单。
4. 使用上下文菜单的 `popup` 方法显示菜单。

:::info
`webContents` 对象存在于以下类中：

- BrowserWindow
- BrowserView
- WebContentsView

由于 BrowserView 已被弃用，因此其 `webContents` 对象也被标记为不推荐使用。此外，作为 WebContentsView 容器的 BaseWindow 并不包含 `webContents` 对象。可以参考以下文章了解其结构：

[可视化 Electron WebContentsView 时代的应用结构](/blogs/2024/08/28/electron-webcontentsview-app-structure/)
:::

## 链接识别、选中文本获取
在 Electron 应用中，根据点击位置的内容动态显示上下文菜单非常重要（这是上下文的核心概念）。在我编写的应用中，链接点击和选中文本处理是一种非常常见的场景。

以下是右键点击链接时有效的菜单示例。是否为链接可以通过 `params` 对象中的 `linkURL` 属性是否有值来判断。

```javascript
// 菜单模板数组的定义片段
    {
      label: '打开',
      click: () => { openLink(params.linkURL); },  // 1
      visible: params.linkURL                      // 2
    },
```
1. 通过调用自定义的 `openLink` 函数来打开 `params.linkURL`。`openLink` 函数里可以使用 `shell.openExternal` 方法等来实现打开新窗口或在浏览器中打开链接的功能。
2. 使用 `visible` 属性，当 `params.linkURL` 有值时显示菜单。

实际效果如下：
![open link](https://i.gyazo.com/aed4101103ed4909c8c14f338a07150b.png)

以下是当选中文本时有效的菜单示例。这实现了一个基于选中文本的 Google 搜索功能。是否选中了文本，可以通过 `params.selectionText` 中是否包含有效值来判断。

```javascript
// 菜单模板数组的定义片段
    {
      label: `使用 Google 搜索 '${params.selectionText}'`, // 1
      click: () => {                                        // 2
        const url = new URL('https://www.google.com/search');
        url.searchParams.set('q', params.selectionText);
        shell.openExternal(url.toString());
      },
      visible: params.selectionText.trim().length > 0      // 3
    },
```
1. 在菜单中显示选中的文字。
2. 实现 Google 搜索的功能。
3. 只有在有选中文本时才显示菜单。

实际效果如下：
![Google search](https://i.gyazo.com/1c01a4f433c30991b2183ed4f20c5d86.png)

## 图片复制及其他
除了链接和选中文本之外，可能还需要实现将显示的图片或图片链接复制到剪贴板的功能。

图片复制功能可以用非常方便的 `webContents.copyImageAt` 方法实现。图片的 URL 信息则可以从 `params.srcURL` 中获取。

关键点在于通过 `params.mediaType` 属性来判断 `visible` 的值。

```javascript
// 菜单模板数组的定义片段
    {
      label: '复制图片',
      click: () => { content.copyImageAt(params.x, params.y); },
      visible: params.mediaType === 'image'
    },
    {
      label: '复制图片 URL',
      click: () => { clipboard.writeText(params.srcURL); },
      visible: params.mediaType === 'image'
    },
```

实际效果如下：
![copy image](https://i.gyazo.com/4f4f2dbb42c8a4349c69a7dca22d4e66.png)

## 最后
用了多年的 `electron-context-menu` 终于可以告别了。实现起来其实很简单。对于菜单内容而言，库所减少的代码量其实并没有菜单定义本身的代码量多，也就没有显得特别冗长。如果担心具体细节，可以提前将它拆分至单独的模块中。

需要注意的是，`electron-context-menu` 拥有自定义的 `webContents` 编辑功能，同时对于事件处理器等资源的释放也做得非常到位。目前继续使用它并没有问题。然而，考虑到可能会失去维护的风险，建议尽可能仅通过 Electron 的 API 来实现这样的功能。
