---
title: Vitest和Storybook集成！在Next.js v16进行组件测试（后篇） - App Router设置与模块模拟 -
author: kohei-tsukano
date: 2026-02-18T00:00:00.000Z
tags:
  - Next.js
  - Storybook
  - React
  - Vitest
  - テスト
image: true
translate: true

---

## 前言

我是业务解决方案事业部的塚野。  
本文是「Vitest和Storybook集成！在Next.js v16进行组件测试」的后篇。  
在前篇中，我们介绍了 Storybook 的引入和基本用法。本文将总结 Next.js 特有的设置和模块模拟等内容。

## next/router、next/navigation 的模拟

在 Next.js 中，与页面跳转或 URL 的引用和更新相关的包有 `next/router` 和 `next/navigation`。  
`next/router` 主要用于 Page Router，而 `next/navigation` 在 App Router 中使用。在 Storybook（@storybook/nextjs-vite）中，`next/router` 包默认会被存根（stub），路由器对象会被替换为一个在 Actions 选项卡中输出事件的模拟（mock）。  

`next/navigation` 也会自动存根，因此在 Story 上也可以调用 usePathname、useSearchParams、useRouter 等。不过，如果使用 App Router，需要在 Storybook 端明确指定“使用 App Router”。可以在单个 Story 中设置，但如果整个项目都基于 App Router，建议在 `.storybook/preview.ts` 中配置，以便应用于所有 Story，这样更简便。

```typescript:.storybook/preview.ts
import type { Preview } from '@storybook/nextjs-vite';
 
const preview: Preview = {
  ...
  parameters: {
    ...
    nextjs: {
      appDirectory: true, // ← 如果使用 App Router，请设置为 true
    },
  },
};
 
export default preview;
```

接下来，我们来创建一个使用 `next/navigation` 包的组件及其 Story。可以略过阅读组件的实现代码。该组件会将输入框中输入的值作为 searchParams 来重写当前 URL。在组件内使用了 `next/navigation` 包的 useRouter 和 useSearchParams。

```tsx:NavigationDemo.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function NavigationDemo() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('query') ?? '');
  const [currentQuery, setCurrentQuery] = useState(searchParams.get('query') ?? '');

  const apply = () => {
    const next = new URLSearchParams(searchParams.toString());
    query ? next.set('query', query) : next.delete('query');
    const queryString = next.toString();
    router.replace(queryString ? `?${queryString}` : '?');
    setCurrentQuery(query);
  };

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} className="p-2 border border-black" />
      <button onClick={apply} className="p-2 border border-black">Apply</button>
      <Link href={`${pathname}/link?query=${query}`} className="ml-2 underline">
        go to Link
      </Link>
      <div>current path: {pathname}</div>
      <div>current query: {currentQuery || '(empty)'}</div>
    </div>
  );
};
```

该组件的 Story 如下创建：

```typescript:NavigationDemo.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { getRouter } from '@storybook/nextjs-vite/navigation.mock';   // useRouter() 的 Mock
import { expect, userEvent, within } from 'storybook/test';

import { NavigationDemo } from './NavigationDemo';

const meta = {
  component: NavigationDemo,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/demo/navigation',   // 可以在 Story 上设置 URL Path 的初始值
        query: { query: 'initial' },    // 可以在 Story 上设置查询参数的初始值
      },
    },
  },
} satisfies Meta<typeof NavigationDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReplaceIsCalled: Story = {
  async play({ canvasElement }) {
    const c = within(canvasElement);
    getRouter().replace.mockClear();

    await userEvent.clear(await c.findByRole('textbox'));
    await userEvent.type(await c.findByRole('textbox'), 'hello');
    await expect(c.getByRole('link', { name: 'go to Link' })).toHaveAttribute(
      'href',
      '/demo/navigation/link?query=hello',
    );
    await userEvent.click(await c.findByRole('button', { name: 'Apply' }));

    // 相当于对 useRouter().replace 调用的断言
    await expect(getRouter().replace).toHaveBeenCalledWith('?query=hello');
  },
};
```

[![Image from Gyazo](https://i.gyazo.com/c71577d6b847fd171528c2eb8d1bdd62.png)](https://gyazo.com/c71577d6b847fd171528c2eb8d1bdd62)

如果想在每个 Story 中更改 pathname 或 query 等，只需重写 meta 对象中的 `parameters.nextjs.navigation`。这样就可以针对依赖 URL 的组件（如活动状态、搜索条件显示等）在每个 Story 中进行复现。

`parameters.nextjs.navigation` 方便于复现初始状态，但在需要验证调用情况（例如“点击后调用了 `router.push()`”）时，它并不够用。

此时可以使用 `@storybook/nextjs-vite/navigation.mock`。除了 `next/navigation` 的模拟实现之外，还可以通过 `getRouter()` 获取等同于 `useRouter()` 的路由器对象，从而可以对 push、replace、back 等调用进行测试断言。

在该组件的 Story 中点击 Apply 按钮后，在 Actions 选项卡中会输出输入的查询参数，从而确认路由器对象已被模拟。

有关除 `@storybook/nextjs-vite/navigation.mock` 之外的内置模拟，请参见此处。（[Built-in mocked modules | Storybook docs](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite/?renderer=react#built-in-mocked-modules)）

:::info
页面跳转相关的包还有 `next/link`。其中的 Link 组件作为具有预取（pre-fetch）功能的 `<a>` 标签的扩展组件经常使用。由于该 Link 在内部使用了 `next/navigation`、`next/router` 的路由器对象，因此在模拟这些包的同时，Link 组件也会被模拟。

然而，在 Next.js（15 及以上）+ App Router 设置的 Storybook 中，有报告称点击 Link 组件时，会尝试跳转到 Storybook 的 iframe 不存在的页面。（[storybookjs/storybook | GitHub](https://github.com/storybookjs/storybook/issues/30390)）  
实际上，在 NavigationDemo 中点击“go to Link”按钮时会发生页面跳转（撰写时 Storybook v10.2.7）。  
在问题修复之前，需要对 Link 组件采取如后述模块模拟等对策，在 Storybook 上将其模拟为 `<a>` 标签。  
:::

## 使用 React Server Component 与 Server functions 的模拟

在 App Router 中，除非通过添加 `use client` 指令显式将组件标记为 Client Component，否则默认将组件作为 React Server Components（RSC）处理。特别是，对于以 async function 定义的 RSC，**无法直接在 Storybook 中使用**。

在 Storybook v10.2.7（@storybook/nextjs-vite）中，由于对 RSC 的支持仍为 Experimental，需要在 Storybook 上渲染 RSC 时显式启用该功能。具体来说，需要在 `.storybook/main.ts` 中指定 `features.experimentalRSC: true`。

```typescript:main.ts
import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  framework: '@storybook/nextjs-vite',
  features: {
    experimentalRSC: true,    // 如果要使用 RSC，请将 experimentalRSC 设置为 true
  },
};

export default config;
```

通过此设置可以让 RSC 在 Storybook 中正常运行。但如果组件内调用了带有 `"server actions"` 指令的服务器函数（如数据库连接或文件访问等），这些在 Storybook 上也无法执行。

在 Next.js 的最佳实践中，建议在 RSC 端不要直接编写数据获取函数，而是将需要调用的服务器函数提取到独立模块中。

Storybook 可以模拟组件中通过 import 引入的模块（[Mocking modules | Storybook docs](https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-modules)）。因此在使用服务器函数时，可以在 Storybook 中对整个模块进行模拟，并将其替换为用于 UI 确认的返回值。

此外，由于 Storybook 主要用于单个组件的展示确认及行为验证，建议将实际的服务器依赖处理进行模拟，不要在 Storybook 中执行。

在 Storybook v10.2 中，针对 Vite/webpack 环境，推荐使用 `sb.mock()` 来进行模块模拟。

下面以服务器函数 `getGreeting.ts` 为例，说明模块模拟。

```typescript:actions/getGreeting.ts
"server actions"

export async function getGreeting(name: string) {
  // 在实际环境中会访问数据库或 API 等
  return `Hello, ${name}!`;
}
```

要模拟该函数，需要在 `.storybook/preview.ts` 中注册模拟。无法在各个 Story 内注册模拟。通过这种方式，可以在 Story 执行前替换目标模块，并在单个 Story 层面控制其返回值。

```typescript:.storybook/preview.ts
import type { Preview } from '@storybook/nextjs-vite';
import { sb } from 'storybook/test';

// 模拟注册在 preview.ts 中进行
sb.mock(import('../src/server/getGreeting.ts'));

const preview: Preview = {
  parameters: {
    nextjs: { appDirectory: true },
  },
};

export default preview;
```

模拟注册需要注意以下几点：
- 如果使用 TypeScript（要模拟的函数为 `.ts` 文件），请在 `sb.mock()` 中使用 `import()` 方式来编写。  
- 不可使用类似 `＠` 的别名，必须使用相对于 `preview.ts` 的相对路径来编写。  
- 路径必须包含文件扩展名。  

通过该设置，可以在 Storybook 上对 `getGreeting.ts` 进行模拟。但在此情况下，`getGreeting.ts` 的功能会被完全替换。如果希望在保留功能的同时将其转为 spy 函数，可在 `sb.mock()` 的第二个参数中加入 `{ spy: true }`。

```typescript
sb.mock(import('../src/server/getGreeting.ts'), { spy: true });
```

接下来，创建使用该函数的组件及其 Story 文件，并查看在 Storybook 上如何使用该模拟函数。

```tsx:components/GreetingPanel.tsx
import { getGreeting } from '@/actions/getGreeting';

type Props = { name: string };

export async function GreetingPanel({ name }: Props) {
  const message = await getGreeting(name);

  return (
    <div>
      <h3>Greeting</h3>
      <p>{message}</p>
    </div>
  );
}
```

这是一个简单的组件，调用 `getGreeting` 获取消息并进行展示。

```typescript:components/GreetingPanel.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, mocked } from 'storybook/test';
import { within } from 'storybook/test';

import { GreetingPanel } from './GreetingPanel';
import { getGreeting } from '../server/getGreeting';

const meta = {
  component: GreetingPanel,
  args: { name: 'Taro' },
} satisfies Meta<typeof GreetingPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  // 在 beforeEach() 中设置模拟函数的返回值等
  async beforeEach() {
    mocked(getGreeting).mockResolvedValue('Hello from mocked function!');
  },
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    await expect(getGreeting).toHaveBeenCalledWith('Taro');
    await expect(canvas.getByText('Hello from mocked function!')).toBeTruthy();
  },
};
```

已创建 GreetingPanel 的 Story。在 Story 中使用模拟函数时，需要在 `beforeEach()` 中设置模拟函数的返回值等。`beforeEach()` 可以在每个 Story 中单独执行，也可以写在 `meta` 内的 `beforeEach` 字段，以应用于所有 Story。

将在 `preview.ts` 中注册的要模拟的函数作为 `mocked()` 的参数，然后针对其返回值进行设置：如果模拟函数是异步函数，则使用 `mockResolvedValue()`；如果是同步函数，则使用 `mockReturnValue(value)`；如果想对模拟函数进行自定义实现，则使用 `mockImplementation(fn)`。

## 总结

至此，我们介绍了使用 Vitest 插件进行组件测试以及利用模块模拟对 Next.js 组件进行测试的方法。在 Storybook 中，还可以通过使用更多插件来执行视觉回归测试（VRT）和可访问性测试等。  

虽说学习成本略高，但其可以集成到 CI 管道中，并且可以通过部署提供给设计人员用于提升形象，如果能熟练使用，将成为前端开发中不可或缺的工具。Storybook 不仅支持 Next.js，还支持 Vue.js、Angular 等多种框架。感兴趣的朋友不妨考虑引入使用。
