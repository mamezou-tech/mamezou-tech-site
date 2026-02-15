---
title: Vitestと統合可能！StorybookでNext.js v16のコンポーネントテストを行う 後編 - App Routerでの設定・モジュールモック -
author: kohei-tsukano
date: 2026-02-18
tags: [Next.js, Storybook, React, Vitest, テスト]
image: true
---

## はじめに

ビジネスソリューション事業部の塚野です。
本記事は「Vitestと統合可能！StorybookでNext.js v16のコンポーネントテストを行う」の後編です。
前編では Storybook の導入や基本的な使い方についてご紹介しました。本記事では Next.js 固有の設定やモジュールモックなどについてまとめていきます。

## next/router、next/navigationのモック

Next.js でページ遷移や URL の参照・更新に関わるパッケージとして `next/router` 、`next/navigation` パッケージがあります。

`next/router` は主に Page Router で、`next/navigation` は App Router で使用されます。Storybook（@storybook/nextjs-vite）では `next/router` パッケージはデフォルトでスタブされ、ルーターオブジェクトはActions タブにイベントを出力するモックに置き換えられます。

`next/navigation` も自動的にスタブされるため、 Story 上でも usePathname、 useSearchParams、 useRouter などを呼び出せます。
ただし、App Routerを使用する場合 Storybook 側に「App Router を使う」ことを明示する必要があります。Story 単位で設定できますが、プロジェクト全体が App Router 前提であれば `.storybook/preview.ts` に書いて全 Story に適用するのが手軽です。

```typescript:.storybook/preview.ts
import type { Preview } from '@storybook/nextjs-vite';
 
const preview: Preview = {
  ...
  parameters: {
    ...
    nextjs: {
      appDirectory: true, // ← App Router を利用する場合 true とする
    },
  },
};
 
export default preview;

```

ここで、`next/navigation` パッケージを使用したコンポーネントとその Story を作成してみます。

コンポーネントのコードは読み飛ばしてかまいません。このコンポーネントでは input に入力した値を searchParams として現在の URL を書き換えます。
コンポーネント内では `next/navigation` パッケージの useRouter、 useSearchParams を利用しています。

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

このコンポーネントの Story は以下のように作成しました。

```typescript:NavigationDemo.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { getRouter } from '@storybook/nextjs-vite/navigation.mock';   //useRouter()のMock
import { expect, userEvent, within } from 'storybook/test';

import { NavigationDemo } from './NavigationDemo';

const meta = {
  component: NavigationDemo,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/demo/navigation',   //Story上でURL Pathの初期値を設定可能
        query: { query: 'initial' },    //Story上でクエリパラメータの初期値を設定可能
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

    //useRouter().replace呼び出しのアサートに相当
    await expect(getRouter().replace).toHaveBeenCalledWith('?query=hello');
  },
};

```

[![Image from Gyazo](https://i.gyazo.com/c71577d6b847fd171528c2eb8d1bdd62.png)](https://gyazo.com/c71577d6b847fd171528c2eb8d1bdd62)

ここで、Story ごとに pathname や query などを変えたい場合は、meta オブジェクトの`parameters.nextjs.navigation` を上書きします。これにより、URL に依存するコンポーネント（アクティブ状態、検索条件の表示など）を Story 単位で再現できます。

`parameters.nextjs.navigation` は初期状態の再現に便利ですが、「クリックで `router.push()` が呼ばれた」など、呼び出しの検証をしたいケースでは不足します。

そこで使うのが `@storybook/nextjs-vite/navigation.mock` です。これは `next/navigation` のモック実装に加えて、`useRouter()` 相当のルーターオブジェクトを `getRouter()` で取り出せるため、push、 replace、 back などの呼び出しを テストとして assert できます。

このコンポーネントの Story 上で Apply ボタンを押下すると、Actions タブに入力したクエリパラメータが出力され、ルーターオブジェクトがモックできていることが分かります。

`@storybook/nextjs-vite/navigation.mock` 以外のビルトインモックに関してはこちらを参照してください。（[Built-in mocked modules | Storybook docs](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite/?renderer=react#built-in-mocked-modules)）

### next/link パッケージのモック

ページ遷移に関わるパッケージとして他に `next/link` パッケージがあります。このパッケージに含まれる Link コンポーネントは pre-fetch 機能を備えた `<a>` タグを拡張したコンポーネントとしてよく使われます。この Link は内部で `next/navigation`、`next/router` のルーターオブジェクトを使用しているため、これらパッケージのモックと同時に Link コンポーネントもモックされるはずです。

しかし、Next.js（15以降〜）＋ App Router 設定の Storybook では、Link コンポーネントをクリックしたときに Storybook の iframe が存在しないページへ遷移しようとするケースが報告されています。（[storybookjs/storybook | GitHub](https://github.com/storybookjs/storybook/issues/30390)）
実際、NavigationDemo 内の「go to Link」ボタンクリックでページ遷移が発生してしまいます（Storybook v10.2.7 執筆時点）。
修正されるまで、Link コンポーネントは後述するモジュールモックを用いて Storybook 上では `<a>` タグにモックするなどの対策が必要でしょう。

## React Server Componentの利用とServer functionsのモック

App Router では、`use client` ディレクティブを付与して明示的に Client Component としない限り、デフォルトとして React Server Components（RSC）としてコンポーネントは扱われます。
特に、async function としている RSC については**そのままでは Storybook で使用できません**。

Storybook v10.2.7（@storybook/nextjs-vite）現在、RSC 対応は Experimental 扱いのため、RSC を Storybook 上でレンダリングする場合は明示的に機能を有効化する設定が必要です。
具体的には `.storybook/main.ts` で `features.experimentalRSC: true` を指定します。

```typescript:main.ts
import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  framework: '@storybook/nextjs-vite',
  features: {
    experimentalRSC: true,    //RSCを利用するにはexperimentalRSC: trueとする
  },
};

export default config;

```

この設定で RSC を Storybook で動作させることはできます。ただしコンポーネント内で `"server actions"` ディレクティブを付けた、 DB 接続やファイルアクセスなどのサーバー関数を呼び出す場合これも Storybook 上では実行ができません。

Next.js でのベストプラクティスとして、 RSC 側ではデータフェッチ関数を直接記述するのではなく、呼び出すサーバー関数を別モジュールに切り出すことが知られています。

Storybook ではコンポーネント内でimportするモジュールをモックできます（[Mocking modules | Storybook docs](https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-modules)）。そこでサーバー関数を利用する場合、Storybook ではモジュールごとモックをしてしまい UI 確認用の戻り値に差し替える、という形で運用します。

また、Storybook では、コンポーネント単体の表示確認や振る舞いの検証が目的であるため、実際のサーバー依存処理は実行しないようにモック化した方がよいです。

Storybook v10.2 では、Vite/webpack 環境での推奨手段として `sb.mock()` による モジュールモックが用意されています。

モジュールモックの例として、以下のようなサーバー関数`getGreeting.ts`を用意しました。

```typescript:actions/getGreeting.ts
"server actions"

export async function getGreeting(name: string) {
  // 実環境ではDBやAPIなどにアクセスする想定
  return `Hello, ${name}!`;
}

```

この関数をモックする場合、`.storybook/preview.ts` にモックを登録します。各 Story 内ではモックの登録はできません。
これにより、Story 実行前に対象モジュールが置き換えられ、Story 単位で戻り値だけを制御できます。

```typescript:.storybook/preview.ts
import type { Preview } from '@storybook/nextjs-vite';
import { sb } from 'storybook/test';

// モック登録は preview.ts で行う
sb.mock(import('../src/server/getGreeting.ts'));

const preview: Preview = {
  parameters: {
    nextjs: { appDirectory: true },
  },
};

export default preview;

```

モック登録の注意点として以下があります。

- Typescript を使用する場合（モックする関数が `.ts` の場合）、`sb.mock()` 内で `import()` を用いて記述すること
- `＠` のような alias の使用は不可。必ず `preview.ts` からの相対パスで記述すること
- 拡張子まで含めてパスは記述すること

この設定で `getGreeting.ts` は Storybook 上でモック化ができます。
ただしこの場合、Storybook 上では `getGreeting.ts` の機能は完全に失われます。もし、機能はそのままにスパイ関数化をしたい場合は `sb.mock()` の第2引数に `{ spy: true }` を含めます。

```typescript
sb.mock(import('../src/server/getGreeting.ts'), { spy: true });
```

それではこの関数を利用するコンポーネントと、その Story ファイルを作成し、Storybook 上でこのモック化した関数をどのように使用するのか見ていきます。

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

簡単な、`getGreeting` でメッセージを取得しそれを表示するだけのコンポーネントです。

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
  // beforeEach()でモック化した関数の戻り値などの設定を行う
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

GreetingPanel の Story を作成しました。
Story 内でモック化した関数を利用する場合、`beforeEach()` 内でモック化関数の戻り値などの設定を行います。
`beforeEach()` は各 Story で実行してもよいですし、`meta` 内 `beforeEach` 要素に記述することですべての Story に適用が可能です。

`mocked()` の引数に `preview.ts` で登録したモックしたい関数を渡し、その戻り値に対して、モックした関数が非同期関数である場合は `mockResolvedValue()` で戻り値を設定します。
モックした関数が同期関数である場合は `mockReturnValue(value)`、モック関数に対して任意の実装を行いたい場合は `mockImplementation(fn)` を利用してください。

## まとめ

ここまで Vitest アドオンを利用したコンポーネントテストやモジュールモックなどを利用した Next.js コンポーネントのテストをご紹介しました。
Storybook ではさらにアドオンを使うことで Visual Regression Test（VRT）やアクセシビリティのテストなども実行可能です。

学習コストは若干感じるものの、CI パイプラインへの統合が可能なことや、デプロイすることでデザイナーとイメージアップに利用できるため、使いこなせればフロントエンド開発において欠かせないツールになると感じました。
Storybook は Next.js だけでなく Vue.js や Angular など幅広いフレームワークに対応しています。ご興味持たれた方は是非導入検討してみてはいかがでしょうか。
