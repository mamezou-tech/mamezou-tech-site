---
title: 在 Deno 2.9 中登场的桌面功能 (Deno Desktop) - 体验与 Electron / Tauri 的区别
author: masahiro-kondo
date: 2026-07-07T00:00:00.000Z
tags:
  - Deno Desktop
  - Tauri
  - electron
  - Deno
translate: true

---

## 引言

祝贺 Deno 2.9 发布。

- [Deno 2.9 | Deno](https://deno.com/blog/v2.9)

作为一个超爱 Electron 的人，我最感兴趣的当然还是 Deno Desktop。它既可以像 Tauri 那样以 WebView 作为后台，也可以像 Electron 那样基于 Chromium，两种架构可选，简直必须试试。

官方文档在这里：

@[og](https://docs.deno.com/runtime/desktop/)

:::alert
Deno 博客中写道，在 2.9 时点桌面功能还处于实验阶段。

> deno desktop is experimental in 2.9. The surface described here is stabilizing and some platform features are still landing.
:::

## 试用

首先升级到 2.9[^1]。

[^1]: 截至 2026 年 7 月 6 日最新版本为 2.9.1。

```shell
deno upgrade
```

在 main.ts 中使用 `Deno.serve` 来编写一个普通的服务器程序。

```typescript:main.ts
Deno.serve(() =>
  new Response(
    "<!DOCTYPE html><h1>Hello from Deno desktop </h1>",
    { headers: { "content-type": "text/html" } },
  )
);
```

在同一目录下运行 `deno desktop main.ts`。

```shell
$ deno desktop main.ts

⚠ deno desktop is experimental and subject to change
Check main.ts
Compile main.ts to hello.dylib

Embedded Files

hello.dylib
└── main.ts (430B)

Files: 1.91KB
Metadata: 1.38KB
Remote modules: 12B

Downloading laufey webview backend for aarch64-apple-darwin (v0.4.0)
Download laufey-webview-aarch64-apple-darwin.tar.gz 97.44KiB/97.44KiB
Codesigning bundle with identity "-"
hello.app/Contents/MacOS/laufey_webview: replacing existing signature
hello.app/Contents/MacOS/hello.dylib: replacing existing signature
Bundle hello.app
```

在最后的输出中，会在根目录生成一个 hello.app（macOS 的应用可执行文件），可以直接启动（在 Windows 上则会生成 hello.exe）。

![Hello from Deno Desktop](https://i.gyazo.com/d1c1b83fcfe43fc06dbd6f5168392865.png)

正如 Deno 的概念所说，无需额外的模块或配置（Out of the box）就生成了桌面应用。

## Deno Desktop 的开发体验

通过带有 HMR (Hot Module Replacement) 选项启动，会启动本地开发服务器，并在检测到代码更改时即时更新应用内容。

```shell
deno desktop --hmr main.ts
⚠ deno desktop is experimental and subject to change
Compile main.ts to file:///Users/kondoumh/Library/Caches/deno/desktop/5f4a00908e99d886/hello.dylib

Embedded Files

hello.dylib
└── main.ts (422B)

Files: 1.9KB
Metadata: 1.38KB
Remote modules: 12B

Running desktop app with HMR (watching /Users/kondoumh/dev/deno-study/desktop/hello)
Runtime loaded successfully from: /Users/kondoumh/Library/Caches/deno/desktop/5f4a00908e99d886/hello.dylib
Runtime started
[desktop] dylib path: "/Users/kondoumh/Library/Caches/deno/desktop/5f4a00908e99d886/hello.dylib"
Listening on http://127.0.0.1:52958/
```

修改 main.ts 的代码后，保存即可立即反映到界面。

:::info
Electron 默认无法使用 HMR，需要额外通过 Forge 等启动开发服务器。

@[og](https://developer.mamezou-tech.com/blogs/2024/01/29/electron-forge-introduction/)
:::

## 通过本地 HTTP 服务实现 UI

在 Electron (Forge 等) 中，本地服务器的使用主要集中在开发时，发布后一般通过 file:// 来读取资源。

而 Deno Desktop 在发布后的二进制文件中也会内部启动本地 HTTP 服务器，自动分配空闲端口来渲染 UI。该服务器在进程内封闭，不会对外开放。无需考虑端口冲突也是一个优点。

这种“开发时和构建后的二进制文件都以相同的 HTTP 执行模型提供 UI”的设计使得，

- 开发时与部署时的行为没有差异
- 内容在浏览器和桌面端的行为一致
- Next.js 等框架可以原封不动地在桌面应用中运行

@[og](https://docs.deno.com/runtime/desktop/serving/)

## 启动 DevTools

和 Electron 及 Tauri 一样，可以通过 DevTools 进行调试。只需启动 BrowserWindow 并调用 `openDevtools` 方法。

```typescript
const win = new Deno.BrowserWindow({ 
  title: "My Deno Desktop App", 
  width: 800, 
  height: 600,
});

win.openDevtools();

```

@[og](https://docs.deno.com/runtime/desktop/devtools/)

:::info
目前，只有在将后端设为 `cef` 时才完全支持 DevTools。

需要像下面这样指定启动：

```shell
deno desktop --hmr --backend=cef main.ts
```
:::

![open devtools](https://i.gyazo.com/a6cba882a3c2b115a1c98acd1a5ff2c5.png)

## 后端与前端的通信（Bindings）

Electron 的 IPC 通信需要通过 preload.js 将 render.js 和 main.js 桥接起来，非常麻烦。而在 Deno Desktop 中，可以通过全局对象 `bindings` 轻松调用绑定到 BrowserWindow 的函数。  
Deno 运行时和渲染后端作为线程或进程运行，调用通过进程内通道进行。在此示例架构中无需直接处理基于 socket 的 IPC，相较于 Electron 的 ipcMain / ipcRenderer 或 Tauri 的 invoke，代码更加清晰易读，这是一个优势。

我们来看看实际的代码。

```typescript
const win = new Deno.BrowserWindow({ 
  title: "Bindings 测试", 
  width: 800, 
  height: 600,
});

// ==========================================
// 1. 后端：注册可由前端调用的函数
// ==========================================
win.bind("getSystemInfo", async (userName) => {
  console.log(`[Deno 端] 从前端被调用！ 参数: ${userName}`);
  
  // 使用 Deno 的功能获取 OS 信息
  const denoVersion = Deno.version.deno;
  const os = Deno.build.os;

  // 模拟较重的处理（等待 0.5 秒）
  await new Promise(resolve => setTimeout(resolve, 500));

  // 返回给前端的数据（只要能 JSON 化即可）
  return {
    message: `你好，${userName}！`,
    os: os,
    denoVersion: denoVersion
  };
});

// ==========================================
// 2. 前端：返回页面的 HTML
// ==========================================
Deno.serve(() => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bindings Test</title>
    </head>
    <body>
      <h1>Deno Desktop Bindings</h1>
      <button id="btn">获取系统信息</button>
      <pre id="result">这里显示结果</pre>

      <script>
        // 按钮被点击时的处理
        document.querySelector('#btn').addEventListener('click', async () => {
          const resultArea = document.getElementById('result');
          resultArea.textContent = "获取中...";

          try {
            // 💡 使用 bindings 调用后端函数
            const data = await bindings.getSystemInfo("kondoumh");
            
            // 将结果显示到页面
            resultArea.textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            resultArea.textContent = "error: " + error.message;
          }
        });
      </script>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: { "content-type": "text/html" },
  });
});
```

应用界面如下。点击 `获取系统信息` 按钮后，会短暂显示“获取中...”，随后显示结果。

![Bindings before](https://i.gyazo.com/b006bc1a96a97d4b9133778612fb043b.png)

结果显示后的状态。

![Bindings after](https://i.gyazo.com/54446ed00a52943ed63a92a18f7f9a8d.png)

在启动应用的后端中，会输出如下日志。

```shell
[Deno 端] 从前端被调用！ 参数: kondoumh
```

非常简单。能够轻松将操作系统的原生功能与 Web UI 结合，十分出色。

@[og](https://docs.deno.com/runtime/desktop/bindings/)

## 菜单的使用

应用程序菜单的实现。

- 在 BrowserWindow 的 `setApplicationMenu` 方法内定义并传入菜单对象。
- 为 BrowserWindow 注册事件监听器，实现菜单点击时的行为。

`role` 等与 Electron 相同。

```typescript
win.setApplicationMenu([
  {
    submenu: {
      label: "File",
      items: [
        {
          item: {
            label: "New",
            id: "new",
            accelerator: "CmdOrCtrl+N",
            enabled: true,
          },
        },
        {
          item: {
            label: "Open…",
            id: "open",
            accelerator: "CmdOrCtrl+O",
            enabled: true,
          },
        },
        "separator",
        {
          item: {
            label: "Save",
            id: "save",
            accelerator: "CmdOrCtrl+S",
            enabled: true,
          },
        },
        { role: { role: "quit" } },
      ],
    },
  },
  {
    submenu: {
      label: "Edit",
      items: [
        { role: { role: "undo" } },
        { role: { role: "redo" } },
        "separator",
        { role: { role: "cut" } },
        { role: { role: "copy" } },
        { role: { role: "paste" } },
      ],
    },
  },
]);

win.addEventListener("menuclick", (e) => {
  const detail = (e as CustomEvent).detail;
  switch (detail.id) {
    case "new":
      console.log("New clicked");
      break;
    case "open":
      console.log("Open clicked");
      break;
    case "save":
      console.log("Save clicked");
      break;
  }
});
```

上下文菜单的实现。创建 Deno.MenuItem 数组，并连同坐标一同传入 BrowserWindow 的 `showContextMenu`。

```typescript
const contextMenu: Deno.MenuItem[] = [
  { item: { label: "Copy", id: "copy", enabled: true } },
  { item: { label: "Paste", id: "paste", enabled: true } },
  "separator",
  { item: { label: "Properties…", id: "props", enabled: true } },
];

// Trigger from a right-click. The webview may not forward the browser
// `contextmenu` event, so handle the secondary mouse button on the window.
win.addEventListener("mousedown", (e) => {
  if (e.button === 2) {
    win.showContextMenu(e.clientX, e.clientY, contextMenu);
  }
});

win.addEventListener("contextmenuclick", (e) => {
  if (e.detail.id === "copy") { console.log("Copy clicked"); }
  if (e.detail.id === "paste") { console.log("Paste clicked"); }
  if (e.detail.id === "props") { console.log("Properties clicked"); }
});
```

:::info
这里在菜单点击事件中输出日志，但日志本身会打印到启动应用的终端，请注意。
:::

@[og](https://docs.deno.com/runtime/desktop/menus/)

## 使用框架进行开发

虽然我们看到了使用 Deno.serve() 的示例，但在 Deno Desktop 中，可以与以下框架一起使用。在这些框架项目的目录下启动 deno desktop，会自动检测框架并构建应用。支持众多现代框架。

- Next.js
- Astro
- Fresh
- Remix
- Nuxt
- SvelteKit
- SolidStart
- TanStack Start
- Vite

在本地运行却使用 SSR，让人感觉有些奇妙，但只要能正常运行且安全，那就好！

@[og](https://docs.deno.com/examples/next_tutorial/)

创建 Next.js 应用。

```shell
deno run -A npm:create-next-app@latest
```

进入创建的项目目录后运行。

```shell
cd <project-dir>
deno desktop -A
```

![Next desktop app](https://i.gyazo.com/0c2090df3d84d37ecffa6c76fc96eb1d.png)

Next.js 应用无需外部服务器就完全运行在桌面内，感觉很奇妙。

@[og](https://docs.deno.com/runtime/desktop/frameworks/)

## 关于后端的选择

桌面应用分发时的二进制大小也很重要，越小越好。

由于 Electron 内置 Chromium，安装后的二进制大小大约会有 300MB 左右。

对于 Deno Desktop，使用操作系统预装的 WebView 大约是 70MB。若使用 CEF(Chromium) 则同样大约是 300MB。

依赖于操作系统的 WebView 会产生 Windows 和 Mac 上 CSS 或 JS 行为略有差异的跨浏览器问题，因此需要为此进行适配和测试。功能少的时候使用 WebView 也许没问题，但当功能增多时，测试工作量将成倍增加。

在 Deno Desktop 中，可以在一开始使用轻量的 WebView，等跨浏览器问题成为负担时，再切换到 CEF，虽然分发体积会稍大一些，但这样做也不错。

@[og](https://docs.deno.com/runtime/desktop/backends/)

:::info
在 Tauri 那边，需要等待基于 Servo 的自有 WebView 项目 Verso，而 Deno 能够选择现有的 Chromium，这体现了目前的取舍呢。
:::

## 与 Electron 的对比

对于想将现有 Web 应用桌面化的用例，Deno Desktop 非常有力。

另一方面，如果以 Electron 的 `WebContentsView` 这类高级多视图架构为前提，目前还是 Electron 更适合。例如像 VS Code 或 Figma 那样精细控制多个视图的应用。

粗略整理如下：

- 单窗口为主 + 利用现有 Web 资产：Deno Desktop 非常不错
- 复杂窗口/视图管理：Electron 依然强大

:::info
Tauri 在多视图架构支持薄弱方面也同样如此。

@[og](https://developer.mamezou-tech.com/blogs/2025/12/01/porting-an-electron-app-to-tauri2/)

关于 Electron 的 WebContentsView 架构，请参阅以下文章。

@[og](/blogs/2024/08/28/electron-webcontentsview-app-structure/)
:::

@[og](https://docs.deno.com/runtime/desktop/comparison/)

## 结语

以上，Deno Desktop 功能已经全面试用了一遍。

开箱即用就能拥有如此完善的桌面开发体验，让人由衷感到惊讶。任务栏、菜单、Bindings 等，为给应用增添特色的 API 一应俱全，也给人留下了良好印象。

与 Tauri 不同，应用端可以全部用 TypeScript 编写，对于基于现有 Web 应用“添加菜单或任务栏并与 OS 功能联动”的场景非常契合。最小配置下，桌面化自身不应耗费超过 1 小时。

:::info
Tauri 也在扩展 JS API，试图吸引不熟悉 Rust 的人群。
:::

这也可能成为 Deno 的杀手级功能。从 experimental 走向稳定版，期待未来的不断成熟。
