---
title: 从 Electron 应用中使用 macOS Apple Intelligence 写作工具
author: masahiro-kondo
date: 2025-05-14T00:00:00.000Z
tags:
  - electron
  - 生成AI
image: true
translate: true

---

## 简介

在上月底发布了 Electron 36.0.0。

- [Electron 36.0.0 | Electron](https://www.electronjs.org/blog/electron-36-0)

作为主要功能，可以通过上下文菜单使用 macOS 的 Apple Intelligence 写作工具。

:::info
后面会提到，通过菜单栏的应用程序菜单而不是上下文菜单来使用写作工具，在之前版本的 Electron 也可以实现。只要启用 Apple Intelligence，就无需对应用进行任何修改。
:::

## 什么是 Apple Intelligence

Apple Intelligence 是 Apple 设备上提供的 AI 平台，在 iOS 18.1、iPadOS 18.1、macOS Sequoia 15.1 及更高版本中可用，并支持日语。启用 Apple Intelligence 后，可以使用图像生成应用，Siri 也能与 ChatGPT 联动变得更智能，作为通用功能，还可在普通应用内使用写作工具[^1]。

[^1]: 在日语中，该名称为「作文ツール」。

@[og](https://www.apple.com/jp/apple-intelligence/)

启用可在设置的「Apple Intelligence 与 Siri」中进行[^2]。

![Apple Intelligence](https://i.gyazo.com/6a17bb91198a07967a6acd061528963b.png)

[^2]: 作者通过键盘与 Mac 交互，因此没有启用 Siri。

启用 Apple Intelligence 后，在所有可显示和编辑文本的原生应用中，只要选中文本，就可以通过应用的“编辑”菜单以及上下文菜单调用写作工具功能，对文本内容进行摘要或校对。

- [在 Mac 的 Apple Intelligence 中使用作文工具](https://support.apple.com/ja-jp/guide/mac-help/mchldcd6c260/mac)

在文本编辑应用中调用写作工具。可从上下文菜单的「作文ツール」子菜单中选择所需功能。

![context menu](https://i.gyazo.com/b4a3272aaadc3732283c80dbedf737e6.png)

## 在 Electron 的上下文菜单中支持写作工具

关于在上下文菜单中使用写作工具的功能请求，在以下 issue 中进行了讨论。

@[og](https://github.com/electron/electron/issues/44445)

在 Electron v36 中发布的功能，似乎是通过以下向 OS 级别添加菜单项支持的 PR 实现的。

@[og](https://github.com/electron/electron/pull/45138)

这通过在构建菜单时接收 WebFrameMain 类实例的选项来启用。

- [webFrameMain | Electron](https://www.electronjs.org/docs/latest/api/web-frame-main)

:::info
如文章开头所述，只要启用 Apple Intelligence，即使是现有的 Electron 应用，也无需进行特别的修改，就可以通过菜单栏使用写作工具。此次支持的用例，是希望对 TextArea 等中选中的文本通过上下文菜单使用写作工具。

![Writing tools added in app menu](https://i.gyazo.com/b2abbbe106c4ac1aa7da37b7189ea104.png)
:::

## 在 Electron 应用的上下文菜单中启用写作工具

下面示例演示如何在一个只加载 Web 内容的基础 Electron 应用的上下文菜单中启用写作工具。

:::info
关于在 Electron 应用中显示上下文菜单的方法，请参阅以下文章。

@[og](/blogs/2025/01/07/build-context-menu-in-electron-app/)
:::

所做的工作，就是在正常显示上下文菜单时，获取 WebContents 的 focusedFrame 属性（WebFrameMain 的实例），并将其作为 frame 选项传递给 contextMenu.popup。详情请参阅代码中的注释。

```javascript
import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;

app.whenReady().then(() => {
  createWindow(); // 创建主窗口

  // 处理上下文菜单
  mainWindow.webContents.on('context-menu', (e, params) => {
    // 获取主窗口的 WebFrameMain 实例
    const focusedFrame = mainWindow.webContents.focusedFrame;

    // 创建菜单模板
    const menuTemplate = buildMenuTemplate(params);
    // 本应由 Electron 处理 visible 属性，但最近未处理，所以在此自行过滤
    const visibleItems = menuTemplate.filter(item => item.visible);

    // 创建上下文菜单
    const contextMenu = Menu.buildFromTemplate(visibleItems);
    contextMenu.popup({
      window: mainWindow.webContents,
      frame: focusedFrame, // 设置 WebFrameMain 实例
    });
  });
});

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800, height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });
  mainWindow.loadFile('index.html');
}

// 构建菜单模板
function buildMenuTemplate(params) {
  const menuTemplete = [
     {
      label: 'Copy', // 文本复制（使用 role）
      role: 'copy',
      visible: params.selectionText.trim().length > 0
    }
  ];
  return menuTemplete;
}
```

运行结果。可以从“作文ツール”菜单将应用程序的文本数据传递给写作工具并获取结果。在文本区域中使用效果很好。

![Sample app](https://i.gyazo.com/19b3417c15807274917ac8dd1da8c65e.png)

:::info
如果在 Windows 上运行上述代码，除了显示代码中指定的菜单外不会有其他操作，所以似乎无需判断平台来分支编写代码。
:::

我还将其集成到了[我自己写的 Scrapbox 应用程序](https://github.com/kondoumh/sbe)中。

![sbe with writing tools 1](https://i.gyazo.com/9ec1872f3865bfc14392ea6038713904.png)![sbe with writing tools 2](https://i.gyazo.com/ebc3c8ff08ffe6e75a9c483bbde53dad.png)

由于 Scrapbox 的编辑界面与普通文本区域不同，“替换”功能未能正常工作[^3]。

[^3]: 临时将其复制后再直接粘贴即可。

## 结语

Electron 可以创建跨平台的应用，但能够将操作系统原生的便捷功能集成到应用中真是一件好事。各操作系统与生成式 AI 的融合今后还会继续推进，Electron 应用的便捷性也将随着平台的演进而提升。
