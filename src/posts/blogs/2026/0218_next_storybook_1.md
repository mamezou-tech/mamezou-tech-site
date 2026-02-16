---
title: Vitestと統合可能！StorybookでNext.js v16のコンポーネントテストを行う 前編 - 導入・基本編 -
author: kohei-tsukano
date: 2026-02-18
tags: [Next.js, Storybook, React, Vitest, テスト]
image: true
---

## はじめに

ビジネスソリューション事業部の塚野です。
皆さんはフロントエンド開発の際にコンポーネントのテストをどのように行っているでしょうか？
自分は最近になり、Storybook というオープンソースツールに入門しました。

@[og](https://storybook.js.org)

この Storybook は UI カタログを作成するサービスです。
コンポーネントをアプリ本体から切り離して単体で描画でき、Props や状態のパターンを「ストーリー」として整理ができます。
また、見た目の確認だけではなく、クリックなどのユーザーイベントを伴うコンポーネントの「ふるまい」のテストも Storybook 上で行えます。
このふるまいのテストはテストランナーに Vitest を使うことができ、**他の Vitest で作成した単体テストと一緒に一括実行が可能**です。

Storybook は様々なフロントエンドフレームワークに対応しています。その中で今回は人気のあるフレームワークとして Next.js でのコンポーネントテストの導入についてご紹介します。Storybook の2026年2月18日執筆時点での最新バージョンは v10.2.7 ですが、この構成を整理した情報はまだ多くないため、コンポーネントテストの作成だけでなくセットアップ手順も含めて具体例とともにまとめます。

書いているうちに長くなってしまったため、2回に分けました。
本記事では「Vitestと統合可能！StorybookでNext.js v16のコンポーネントテストを行う」の前編として、Storybook の導入と基本的な使い方、インタラクションテストの作成と Vitest テストランナーでの実行について記述します。
後編では Next.js 特有のビルトインパッケージのモックや、App Router での設定、モジュールモックなどについてご紹介します。

## Storybookの導入と基本的な使い方

まずは Storybook の導入です。以下のコマンドを実行します。

```bash
npm create storybook@latest
```

2026年2月18日執筆時点での Storybook の最新版は v10.2.7 です。Storybook では v10 以降から Next v16 に対応しています。（が、一部未対応の機能もあります。これについては後編で触れます。）Next の必須バージョンは v14 以上です。

上記のコマンド実行後、"New to Storybook?" と聞かれます。"Yes" を選んだ場合、簡単なチュートリアルとサンプルのストーリーファイルが作成されます。必要に応じて選択してください。

その後、"What configuration should we install?" と聞かれますがここは "Recommended" を選択し、オススメ設定で実行してもらいます。設定ファイルにアドオンの追加や Vitest の設定ファイルの作成などしてくれるのでこちらを選択しましょう。

ストーリー作成の前に設定ファイルをプロジェクトに合わせて変更します。
Storybook の設定ファイルはプロジェクトルートの `.storybook` 配下に作成されます。（[Configure Storybook | Storybook docs](https://storybook.js.org/docs/configure)）
Recommended 設定の場合 `.storybook` 配下は以下のようになっています。

```plaintext
/
└── .storybook
    ├── main.ts          #Storybookのメイン設定ファイル
    ├── preview.ts       #グローバルなスタイル等の設定ファイル
    └── vitest.setup.ts  #Storybookでのvitest設定ファイル
```

`.storybook/main.ts` を以下のように変更します。

Recommended 設定の場合自動的に入っていますが、Minimum 設定の場合 "addons" に `@storybook/addon-vitest` と `@storybook/addon-docs` が追加されていることを確認してください。

```typescript:main.ts
import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  "stories": [
    "../components/ui/**/*.stories.@(js|jsx|mjs|ts|tsx)"  // ← プロジェクトに合わせて編集する
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",  // ← vitestとしての実行に必要
    "@storybook/addon-a11y",
    "@storybook/addon-docs",    // ← Document機能の利用に必要
    "@storybook/addon-onboarding"   // ← チュートリアル用のアドオン。必要ないなら削除してもOK
  ],
  "framework": "@storybook/nextjs-vite",
  "staticDirs": [
    "../public"
  ]
};
export default config;
```

Storybook Config オブジェクトの "stories" 要素にストーリーファイルのパスを記述します。
ストーリーファイルは `Button.stories.tsx` のように `.stories` を付けて作成します。本記事でのデモプロジェクトでは `components/ui` 配下にコンポーネントファイルと共に作成します。プロジェクトに合わせて記述を変更してください。

Next.js プロジェクトでは tailwind CSS を利用している場合が多いかと思います。Storybookで tailwind CSS を有効化する場合は、`.storybook/preview.ts` で `globals.css` を import します。

```typescript:.storybook/preview.ts
import type { Preview } from '@storybook/nextjs-vite'
import '../app/globals.css';  // ← globals.cssをimport

const preview: Preview = {
    parameters: {
    ...
    },
    tags: ["autodocs"],  // ← Document生成をすべてのStoryで有効化する
};

export default preview;
```

Storybook は各コンポーネントを Canvas と呼ばれる UI 上に表示させますが、内部では "preview" と呼ばれる iframe 内で動作させています。この preview に関する設定が `preview.ts` であり、ストーリーの表示に関するグローバルな設定が可能です。

後述する Document という機能が大変便利なので、ここですべてのストーリーで Document を生成する設定を追加します。Preview オブジェクトの tags 要素に `["autodocs"]` を指定します。Document は各ストーリーファイル内で個別に有効化もできます。

これで準備ができました。

試しに以下のようなボタンコンポーネントを `components/ui` 配下に作成し、そのストーリーファイルを作って Storybook を実行してみます。
Props は size と variant を受け取り、variant でプリセットとして設定した primary と outline に見た目を切り替えられます。
ここでは [tailwind-variants](https://www.tailwind-variants.org) というライブラリを使い variant と size のプリセットを variants として定義しています。
コンポーネントのコードは軽く読み飛ばしていただいて大丈夫です。

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

このボタンコンポーネントの Story ファイルはこのように作成しました。

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
      description: "ボタンのサイズ",
    },
    variant: {
      control: { type: "inline-radio" },
      options: ["primary", "outline"],
      description: "ボタンのバリアント",
    },
  },
  args: {
    children: "送信",
    size: "medium",
    variant: "primary",
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Outline: Story = {
  args: { variant: "outline", size: "large", children: "キャンセル" },
};

export const Disabled: Story = {
  args: { disabled: true, children: "無効" },
};

```

コンポーネントの指定やどのような種類の Props を渡せるのかといったストーリーのメタ情報を `meta` オブジェクトに記載し、これを default export します。
この meta オブジェクトから Story の型を生成し、Story オブジェクトを作成、export します。

Story オブジェクトがそのままストーリーとして Storybook 上で表示されます。オブジェクト名がストーリの表示名、`args` でそのストーリーでコンポーネントに渡す Props を定義できます。

`npm run storybook` で Storybook を実行してみましょう。

[![Image from Gyazo](https://i.gyazo.com/21e618657d5694034032ea61220c6eb7.png)](https://gyazo.com/21e618657d5694034032ea61220c6eb7)

Button コンポーネントが Canvas 内に表示されました。下の「Controls」タブでは children や Props の操作ができ、その場でコンポーネントの見た目やふるまいの確認ができます。

Controls に表示される Props は `args` で渡したものになります。
今回 meta オブジェクトでも `args` を記述しており、これがデフォルトで渡される `args` になります。

Props を `args` で記述するほかに、`argTypes` で Props の詳細も記述できます。
`args` に記載されていない Props でも `argTypes` へ記載した場合、 Controls タブに表示されるようになります。

また、Controls タブでの表示方法も設定でき、例えば `control: { type: "inline-radio" }` と記述すればユニオン型などの場合横並びのラジオボタンで値の切り替えが可能となります。（デフォルトはセレクトボックス）

Document の自動生成を有効化した場合、"Docs" というタブがサイドバーに表示されます。
ここでは作成したストーリーのメタ情報やストーリーの一覧表示などが可能で、コンポーネントの概要が一目でわかるようになっています。

[![Image from Gyazo](https://i.gyazo.com/fc60f4e3d58f40e3322844a943b20bce.png)](https://gyazo.com/fc60f4e3d58f40e3322844a943b20bce)
*ButtonコンポーネントのStory DocsでPropsなどの情報も含めたDocumentが参照できる*

[![Image from Gyazo](https://i.gyazo.com/fa59575579f0d66e1a18f5fc7fc91596.png)](https://gyazo.com/fa59575579f0d66e1a18f5fc7fc91596)
*Documentでは作成した全ストーリーを一覧で表示可能*

この Document にはマークダウン形式で文章も記述可能です。
以下のように特定の場所に JSDoc 形式でコメントを記述した場合 Document 内に表示されます。JSDoc 内ではマークダウン記法がサポートされています。

```typescript:Button.stories.tsx
...

/**
 * Button コンポーネントの Storybook ストーリー
 * 
 * | variant | スタイル |
 * |---------|----------|
 * | primary | メインアクション用の強調されたスタイル |
 * | outline | 補助的なアクション用のアウトラインスタイル |
 */
const meta = {
  title: "UI/Button",
  component: Button,
  ...
}
...
```

[![Image from Gyazo](https://i.gyazo.com/958b27935f8eebb914517c2aef14b3e5.png)](https://gyazo.com/958b27935f8eebb914517c2aef14b3e5)

ここまでの基本的な使い方でコンポーネントの「見た目」についての確認はできました。
Storybook ではさらに、クリック時の挙動などユーザーインタラクションを含む「ふるまい」のテストが行えます。

## コンポーネントテストの導入

各 Story ではふるまいに関するテスト（インタラクションテスト）を "play function" として記述ができます。（[Interaction tests | Storybook docs](https://storybook.js.org/docs/writing-tests/interaction-testing)）
先ほど作った Button コンポーネントに play function を追加して「クリックすると onClick が1度だけ呼ばれること」を確認します。

```typescript:Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test"; // ← インタラクションテストに関するパッケージから import

import { Button } from "./Button";

const meta = {
  ... ,
  args: {
    children: "送信",
    size: "medium",
    variant: "primary",
    onClick: fn(),  // ← onClick にはスパイ関数 fn() を渡す
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

...

/** play functions の例: ボタンをクリックすると onClick が1回呼ばれることを確認 */
export const ClickTest: Story = {
  args: { children: "Click Me ！" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button"));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

```

インタラクションテスト用の Story "ClickTest" を追加しました。
インタラクションテストは Story の "play" 要素に非同期関数として記述します。

ユーザーイベントの模倣やアサーションには `storybook/test` パッケージのオブジェクト、関数を利用します。
play 内では順に、

- Canvasを取得
- Canvas内 "button" 要素を取得[^1]、クリック
- `args` の `onClick` が1回呼ばれるかをアサート

をしています。userEvent と expect は必ず `await` の内側で呼ぶ必要があります。

`args` の `onClick` では `meta` オブジェクトで定義されるように `fn()` を渡しています。
これは Vitest のスパイ関数ですが、`storyboo/test` パッケージから利用可能です。実行されると Story の Actions タブにイベントが出力されます。（[Via storybook/test fn spies](https://storybook.js.org/docs/essentials/actions#via-storybooktest-fn-spies)）

それでは、ClickTest ストーリーを表示してテスト結果を確認してみましょう。
ストーリーを表示すると自動でテストが実行されます。結果は Interactions タブから確認ができます。

[![Image from Gyazo](https://i.gyazo.com/da04df699e8323460c9a3b1a5bacc654.png)](https://gyazo.com/da04df699e8323460c9a3b1a5bacc654)

無事、テストを Pass していることが確認できました。
すべてのインタラクションテストは Storybook の UI 上から一括実行が可能です。
サイドバー下部の "Run tests" をクリックで一括実行が行われます。"Interaction" にチェックがついていることを確認してください。

[![Image from Gyazo](https://i.gyazo.com/04554cf9c710f6768cee9509d7186f81.png)](https://gyazo.com/04554cf9c710f6768cee9509d7186f81)
*サイドバー内 Run tests からplay functions の一括実行が可能*

Storybook の起動には高速起動が人気の Vite が利用可能です[^2]。
とはいえテストのたびに起動して UI 上で結果を確認するのも手間です。また、コンポーネントのテストも CI パイプライン上で他の単体テストと一括で実行したくなります。

そこで、Storybook ではインタラクションテストを Vitest のテストとして CLI 上で実行可能とするアドオン "Vitest addon" が提供されています。（[Vitest addon | Storybook docs](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index)）

このアドオンにより`.stories`ファイルをヘッドレスブラウザ上で実行可能なテストに変換し、既存の Vitest と一緒に `vitest` コマンドで実行可能とします。

Storybook セットアップ時に "Recommended" 設定を選択した場合、Vitest に関する設定ファイル（`vitest.config.ts`、`.storybook/vitest.setup.ts`）が自動的に作成されます。

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
          // ↓ Storybookの設定ファイルを取得、main.tsに記載したパスの.storiesファイルをテスト実行対象とする
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

`vitest.config.ts` では `.stories` を対象とするテストプロジェクト「storybook」が追加されています。

`.test`、`.spec` を対象とする Vitest は別のプロジェクトとして作成します。こうすることで Storybook のテストのみを対象に Vitest を実行でき、一括実行の際にはタグを分けることで Storybook のテストと関数のテストをCLI 上で区別して表示ができます。

最後に `package.json` へスクリプトを追加しましょう。

```json:package.json
{
  "scripts": {
    "test": "vitest",
    "test-storybook": "vitest --project=storybook"
  }
}
```

`"npm run test-storybook"` で Stroybook のテストのみ実行可能です。
ここは既存のテストと一括実行を考えて `npm run test` を実行します。

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

無事 Vitest から `.stories` が呼ばれテストに Pass することが確認できました。
テストの実行には Playwright を使用しています。そのため Storybook のテストは関数の UT と比べ若干実行に時間がかかります。

実際の CI パイプラインへの統合についてはこちらの公式ドキュメントを参考にしてください。（[Testing in CI | Storybook docs](https://storybook.js.org/docs/writing-tests/in-ci)）

[^1]:ちなみに、ボタン要素の取得は `getByRole()` で行っています。Storybook 公式ドキュメントでは要素の取得はなるべく実際の人が目で見て行う操作に近い方法で行うべきだとしています。内部の "id" などで要素を取得するのは最終手段です。（[Querying the canvas](https://storybook.js.org/docs/writing-tests/interaction-testing#querying-the-canvas)）

[^2]:Next.js の場合、`main.ts` の `"framework"` 要素で Vite と webpack で利用するビルドツールを選択できます。`"@storybook/nextjs-vite"` を渡した場合 Vite でビルドしますが、特段の理由がない限り Vite を選択していいと思います。また、本記事の肝である Vitest も Vite を選択した場合でしか利用できません。

## おわりに

本記事では Storybook の導入と基本的な使い方、Vitest の実行についてご紹介しました。
また、基本的にローカル実行のみについて取り上げています。デプロイについては公式ドキュメントを参照してください。（[Publish Storybook | Storybook docs](https://storybook.js.org/docs/sharing/publish-storybook)）

次回は Next.js 固有の設定や、ルーターオブジェクトのモック、モジュールのモックなどについてご紹介します。
