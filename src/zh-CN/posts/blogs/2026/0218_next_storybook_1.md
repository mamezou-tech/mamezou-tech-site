---
title: Vitest可集成！使用Storybook对Next.js v16的组件测试 前篇 - 导入·基础篇 -
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

## 引言

我是业务解决方案事业部的塚野。大家在前端开发时是如何进行组件测试的呢？我最近开始入门一个名为 Storybook 的开源工具。

@[og](https://storybook.js.org)

这个 Storybook 是一个创建 UI 目录的服务。它可以将组件从主应用中分离出来单独渲染，并将 Props 和状态的各种模式整理为“故事”（stories）。此外，不仅可以进行外观确认，还可以在 Storybook 上对伴随点击等用户事件的组件“行为”进行测试。这种行为测试可以使用测试运行器 Vitest，并且可以与其他使用 Vitest 创建的单元测试一起批量执行。

Storybook 支持各种前端框架。这次以流行的 Next.js 框架为例，介绍如何在 Next.js 中引入组件测试。截至 2026 年 2 月 18 日撰写时，Storybook 最新版本为 v10.2.7，但对于该版本的配置整理信息还不多，因此本文不仅整理了组件测试的创建方法，还包括详细的设置步骤及示例。

由于篇幅较长，分为两篇。本文作为“Vitest可集成！使用Storybook对Next.js v16的组件测试”前篇，介绍 Storybook 的引入与基本用法、交互测试的创建及在 Vitest 测试运行器中的执行。后篇将介绍 Next.js 特有的内置包模拟、App Router 配置、模块模拟等内容。

## Storybook的引入与基本用法

首先引入 Storybook。执行以下命令：

```bash
npm create storybook@latest
```

截至 2026 年 2 月 18 日撰写时，Storybook 最新版为 v10.2.7。Storybook 从 v10 起支持 Next v16。（不过仍有部分功能未支持，后篇会提到。）Next 的最低版本要求为 v14 以上。

执行上述命令后，会询问 "New to Storybook?"，选择 "Yes" 时，会创建一个简易教程和示例故事文件，可根据需要选择。

随后会询问 "What configuration should we install?"，此处请选择 "Recommended"，采用推荐设置运行。该设置会自动向配置文件中添加插件并创建 Vitest 的配置文件，建议选择该项。

在创建故事之前，先根据项目修改配置文件。Storybook 的配置文件位于项目根目录下的 `.storybook` 目录。（[Configure Storybook | Storybook docs](https://storybook.js.org/docs/configure)）在推荐设置下，`.storybook` 目录结构如下：

```plaintext
/
└── .storybook
    ├── main.ts          # Storybook 的主配置文件
    ├── preview.ts       # 全局样式等的配置文件
    └── vitest.setup.ts  # Storybook 的 Vitest 配置文件
```

将 `.storybook/main.ts` 修改如下。

在推荐设置中已自动包含以下内容，若使用最小可选设置，请确认 "addons" 中已包含 `@storybook/addon-vitest` 和 `@storybook/addon-docs`。

```typescript:main.ts
import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  "stories": [
    "../components/ui/**/*.stories.@(js|jsx|mjs|ts|tsx)"  // ← 根据项目自行修改
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",  // ← 运行 Vitest 所需
    "@storybook/addon-a11y",
    "@storybook/addon-docs",    // ← 使用文档功能所需
    "@storybook/addon-onboarding"   // ← 教程插件。不需要可删除
  ],
  "framework": "@storybook/nextjs-vite",
  "staticDirs": [
    "../public"
  ]
};
export default config;
```

在 Storybook 配置对象的 "stories" 字段中填写故事文件路径。故事文件应以 `.stories` 为文件名后缀，如 `Button.stories.tsx`。本文示例项目中将其放在 `components/ui` 目录下，与组件文件同级。请根据项目实际情况调整。

在 Next.js 项目中通常会使用 Tailwind CSS。如果要在 Storybook 中启用 Tailwind CSS，请在 `.storybook/preview.ts` 中 import `globals.css`。

```typescript:.storybook/preview.ts
import type { Preview } from '@storybook/nextjs-vite'
import '../app/globals.css';  // ← 导入 globals.css

const preview: Preview = {
    parameters: {
    ...
    },
    tags: ["autodocs"],  // ← 在所有故事中启用文档生成
};

export default preview;
```

Storybook 会将各组件渲染在称为 Canvas 的 UI 上，实际上在名为 "preview" 的 iframe 中运行。`preview.ts` 就是用于配置该 preview，可对故事显示的全局设置进行配置。

下文将介绍的文档（Document）功能非常实用，此处添加设置以在所有故事中生成文档。在 Preview 对象的 tags 字段中指定 `["autodocs"]` 即可。文档也可在各故事文件内单独启用。

至此，准备工作完成。

下面创建一个按钮组件示例，并在 `components/ui` 下创建其故事文件，然后运行 Storybook 查看效果。该组件接收 size 和 variant 两个 Props，根据 variant 在 primary 和 outline 两种预设中切换样式。此处使用 [tailwind-variants](https://www.tailwind-variants.org) 这个库，将 variant 和 size 的预设定义为 variants。组件代码可略读。

```tsx:components/ui/Button.tsx
import React from "react";
import { tv, type VariantProps } from "tailwind-variants";

const buttonStyles = tv({
  base: "inline-flex items-center justify-center rounded-md font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed",
  variants: {
    size: {
      small: "px-3 py-1.5 text-sm",
      medium: "px-4 py-2 text-base",
      large: "px-5 py-3 text-lg",
    },
    variant: {
      primary:
        "bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 focus-visible:outline-blue-500",
      outline:
        "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400",
    },
  },
  defaultVariants: {
    size: "medium",
    variant: "primary",
  },
});

type ButtonVariants = VariantProps<typeof buttonStyles>;

export type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> &
  ButtonVariants;

export const Button = ({
  size,
  variant,
  type = "button",
  children,
  ...props
}: ButtonProps) => {
  return (
    <button
      type={type}
      className={buttonStyles({ size, variant })}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
```

为该按钮组件创建以下 Story 文件：

```typescript:Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { Button } from "./Button";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: { layout: "centered" },
  argTypes: {
    size: {
      control: { type: "inline-radio" },
      options: ["small", "medium", "large"],
      description: "按钮的大小",
    },
    variant: {
      control: { type: "inline-radio" },
      options: ["primary", "outline"],
      description: "按钮的变体",
    },
  },
  args: {
    children: "发送",
    size: "medium",
    variant: "primary",
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Outline: Story = {
  args: { variant: "outline", size: "large", children: "取消" },
};

export const Disabled: Story = {
  args: { disabled: true, children: "禁用" },
};
```

在 `meta` 对象中指定组件及可传递的 Props 等元信息，并将其作为 default export。通过该 meta 对象生成 Story 的类型，再创建并 export Story 对象。

Story 对象将直接在 Storybook 中显示。对象名为故事显示名，`args` 定义该故事传递给组件的 Props。

执行 `npm run storybook` 启动 Storybook：

[![Image from Gyazo](https://i.gyazo.com/21e618657d5694034032ea61220c6eb7.png)](https://gyazo.com/21e618657d5694034032ea61220c6eb7)

Button 组件已在 Canvas 中显示。下方 “Controls” 标签页可以操作 children 和 Props，实时查看组件的外观和行为。

Controls 中显示的 Props 即 `args` 中传递的内容。这次在 meta 对象中也指定了 `args`，作为默认传递的 Props。

除了在 `args` 中指定 Props，还可通过 `argTypes` 描述 Props 详情。即使某个 Prop 未在 `args` 中列出，只要在 `argTypes` 中配置，也会在 Controls 标签页中显示。

此外，还可设置 Controls 中的显示方式。例如使用 `control: { type: "inline-radio" }` 可将联合类型以横向单选按钮呈现（默认是下拉选择框）。

启用自动文档生成后，侧边栏会出现 “Docs” 标签页。在此可查看元信息和故事列表，一目了然地展示组件概览。

[![Image from Gyazo](https://i.gyazo.com/fc60f4e3d58f40e3322844a943b20bce.png)](https://gyazo.com/fc60f4e3d58f40e3322844a943b20bce)
*在 Button 组件的 Story Docs 中可以查看包含 Props 等信息的文档*

[![Image from Gyazo](https://i.gyazo.com/fa59575579f0d66e1a18f5fc7fc91596.png)](https://gyazo.com/fa59575579f0d66e1a18f5fc7fc91596)
*文档中可列表显示所有已创建的故事*

该文档支持使用 Markdown 格式编写文字。若在特定位置以 JSDoc 格式添加注释，即可在文档中显示。JSDoc 中支持 Markdown 语法。

```typescript:Button.stories.tsx
...

/**
 * Button 组件的 Storybook 故事
 * 
 * | variant | 样式 |
 * |---------|------|
 * | primary | 主要操作的强化样式 |
 * | outline | 辅助操作的轮廓样式 |
 */
const meta = {
  title: "UI/Button",
  component: Button,
  ...
}
...
```

[![Image from Gyazo](https://i.gyazo.com/958b27935f8eebb914517c2aef14b3e5.png)](https://gyazo.com/958b27935f8eebb914517c2aef14b3e5)

至此，基本用法已能确认组件的“外观”。Storybook 还可以对含有点击等用户交互的“行为”进行测试。

## 组件测试的引入

在每个 Story 中，可以将行为相关的测试（交互测试）作为 "play function" 进行编写。（[Interaction tests | Storybook docs](https://storybook.js.org/docs/writing-tests/interaction-testing)）下面在之前创建的 Button 组件中添加 play function，验证“点击按钮时 onClick 只调用一次”。

```typescript:Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test"; // ← 从交互测试相关包中 import

import { Button } from "./Button";

const meta = {
  ... ,
  args: {
    children: "Click Me ！",
    size: "medium",
    variant: "primary",
    onClick: fn(),  // ← 为 onClick 传入 spy 函数 fn()
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

...

/** play function 示例：点击按钮后检查 onClick 被调用 1 次 */
export const ClickTest: Story = {
  args: { children: "Click Me ！" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button"));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
```

添加了交互测试故事 "ClickTest"。交互测试在 Story 对象的 "play" 字段中以异步函数形式编写。

在 play 中使用 `storybook/test` 包提供的对象和函数来模拟用户事件和断言。play 内部执行流程为：

- 获取 Canvas
- 在 Canvas 内获取 "button" 元素[^1]，并点击
- 断言 `args.onClick` 被调用一次

其中 userEvent 和 expect 必须在 `await` 语句中调用。

在 `args.onClick` 中如 meta 对象所示传入了 `fn()`。这是 Vitest 的 spy 函数，但可通过 `storybook/test` 包使用。执行时，Story 的 Actions 标签页会输出事件信息。（Via storybook/test fn spies）

在显示 ClickTest 故事时会自动运行测试，可在 Interactions 标签页查看结果。

[![Image from Gyazo](https://i.gyazo.com/da04df699e8323460c9a3b1a5bacc654.png)](https://gyazo.com/da04df699e8323460c9a3b1a5bacc654)

测试成功通过。所有交互测试均可在 Storybook UI 中批量运行。点击侧边栏底部的 "Run tests" 即可执行全部测试，请确认已勾选 "Interaction"。

[![Image from Gyazo](https://i.gyazo.com/04554cf9c710f6768cee9509d7186f81.png)](https://gyazo.com/04554cf9c710f6768cee9509d7186f81)
*在侧边栏中的 Run tests 即可批量运行 play functions*

Storybook 启动时可以选择流行的 Vite 作为构建工具[^2]。不过每次测试都启动 UI 来查看结果也较麻烦，而且组件测试也希望能在 CI 管道中与其他单元测试一起执行。

为此，Storybook 提供了一个将交互测试以 Vitest 测试执行的插件 "Vitest addon"。（[Vitest addon | Storybook docs](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index)）

该插件会将 `.stories` 文件转换为可在无头浏览器上执行的测试，并可与现有 Vitest 一起通过 `vitest` 命令运行。

在选择“Recommended”设置时，会自动创建 Vitest 相关配置文件（`vitest.config.ts`、`.storybook/vitest.setup.ts`）。

```typescript:vitest.config.ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // ↓ 获取 Storybook 的配置文件，并将 main.ts 中指定路径的 .stories 文件作为测试对象
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
```

```typescript:.storybook/vitest.setup.ts
import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview";
import { setProjectAnnotations } from '@storybook/nextjs-vite';
import * as projectAnnotations from './preview';

// This is an important step to apply the right configuration when testing your stories.
// More info at: https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
setProjectAnnotations([a11yAddonAnnotations, projectAnnotations]);
```

在 `vitest.config.ts` 中，添加了针对 `.stories` 的测试项目 "storybook"。

针对 `.test`、`.spec` 文件的 Vitest 配置应另行作为项目创建。这样可仅针对 Storybook 测试执行 Vitest，并可通过为不同项目打标签在 CLI 中区分 Storybook 测试和函数测试。

最后，在 `package.json` 中添加脚本：

```json:package.json
{
  "scripts": {
    "test": "vitest",
    "test-storybook": "vitest --project=storybook"
  }
}
```

执行 `"npm run test-storybook"` 即可仅运行 Storybook 测试。若想与现有测试一起执行，可直接运行 `npm run test`。

```bash
$ npm run test

> storybook-demo@0.1.0 test
> vitest


 DEV  v4.0.18 /home/tsukano/storybook-demo/

3:02:47 PM [vite] (client) Re-optimizing dependencies because lockfile has changed
 ✓  storybook (chromium)  components/ui/Button.stories.tsx (4 tests) 501ms
   ✓ Default  357ms
   ✓ Outline 57ms
   ✓ Disabled 28ms
   ✓ Click Test 58ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  15:02:46
   Duration  3.84s (transform 0ms, setup 1.14s, import 49ms, tests 501ms, environment 0ms)
```

已确认 Vitest 调用了 `.stories` 并且测试通过。此处使用 Playwright 执行测试，因此 Storybook 测试比函数 UT 会稍慢。

关于在实际 CI 管道中的集成，请参考官方文档。（[Testing in CI | Storybook docs](https://storybook.js.org/docs/writing-tests/in-ci)）

[^1]: 顺便提一下，获取按钮元素使用了 `getByRole()`。Storybook 官方文档建议，获取元素应尽量模拟用户可见的方式进行操作，使用内部 “id” 等仅应作为最后手段。（[Querying the canvas](https://storybook.js.org/docs/writing-tests/interaction-testing#querying-the-canvas)）

[^2]: 在 Next.js 中，可在 `main.ts` 的 “framework” 字段选择 Vite 或 webpack 作为构建工具。若传入 `"@storybook/nextjs-vite"` 则使用 Vite 构建，除非有特殊理由，否则可直接选择 Vite。而本文核心的 Vitest 也仅在选择 Vite 时可用。

## 结语

本文介绍了 Storybook 的引入与基本用法及 Vitest 的执行方法。同时本文主要面向本地执行，关于部署请参考官方文档。（[Publish Storybook | Storybook docs](https://storybook.js.org/docs/sharing/publish-storybook)）

下次将介绍 Next.js 特有的配置、路由对象模拟、模块模拟等内容。
