---
title: Electron アプリの E2E テストを Playwright で書く
author: masahiro-kondo
date: 2022-06-05
---

Electron アプリの E2E テストフレームワークとして Spectron というプロジェクトがありましたが、今年の2月に非推奨になりました。

[Spectron 非推奨通知 | Electron](https://www.electronjs.org/ja/blog/spectron-deprecation-notice)

Spectron が Electron のリリーススピードに追従できなくなってるというのは知っていましたので、「やはり。」という感想でした。Spectron は Electron v14 で廃止された remote module に依存しており、メンテナが少ない状態でコードベースを書き換えることを断念したようです。

[筆者が開発している Electron アプリ](/blogs/2021/12/15/developing-unofficial-scrapbox-app/)でも Spectron の使用をやめました。しかし Electron アプリはクロスプラットフォームで動作するため、各プラットフォームでの簡単な動作は CI で確認できるようにしておきたいところです。

公式ドキュメントを見てたら Playwright が使えるようなので試してみました。

[自動テスト | Electron](https://www.electronjs.org/ja/docs/latest/tutorial/automated-testing)

Playwright は Microsoft が開発するクロスブラウザに対応した E2E テストライブラリです。

[Fast and reliable end-to-end testing for modern web apps | Playwright](https://playwright.dev/)

Playwright のドキュメントでは、Android や AndroidWebView などと共に Electron のサポートは Experimental と位置付けられています。

- [Electron | Playwright](https://playwright.dev/docs/api/class-electron/)
- [ElectronApplication | Playwright](https://playwright.dev/docs/api/class-electronapplication)

Electron のプロジェクトに、Playwright 関連の NPM パッケージを追加します。

```shell
npm i -D playwright @playwright/test
```

対象のプロジェクトは src 配下にコードを配置しており、test 配下に テストコードを追加しました。

```
.
├── node_modules
├── package.json
├── src
│   ├── index.html
│   ├── main.js
│   ├── renderer.js
│   └── styles.css
└── test
    └── test.js
```

ひとまず、アプリを起動してクローズするだけのテストコードを書いてみました。

```javascript
const { _electron: electron } = require('playwright');
const { test } = require('@playwright/test');

test('launch app', async () => {
  const electronApp = await electron.launch({ args: ['src/main.js'] });
  await electronApp.close();
});
```

package.json の `scripts` にテスト実行用のスクリプトを追加しました。

```json
  "scripts": {
    "start": "electron .",
    "test": "playwright test",
    "pack": "electron-builder --dir",
    "dist": "electron-builder"
  },
```

テストの実行。

```shell
npm test
```

これで ウィンドウが一瞬表示されました。

Playwright の API を使って、ウィンドウの起動を待ち、起動後にコンテンツの読み込みを2秒待ってスクリーンショットを取得してみます。

```javascript
test('launch app', async () => {
  const electronApp = await electron.launch({ args: ['src/main.js'] });
  const mainWindow = await electronApp.firstWindow();
  await mainWindow.waitForTimeout(2000);
  await mainWindow.screenshot({ path: './screenshot/main.png' });
  await electronApp.close();
});
```

取得したスクリーンショット。

![](https://i.gyazo.com/6e7f9ebf8e9c81aae597690e2d22ccbb.png)

このアプリは、Scrapbox のサイトを WebContents として読み込んでいるのですが、アプリのフレーム部分しか写っていません。

実はこのアプリは[以前のブログ](/blogs/2022/01/07/electron-browserview/)で書いた、BrowserView を使用しており、ウィンドウ内のコンテンツは埋め込みではなく、別の子ウィンドウのようなものなので、Playwright の `page.screenshot()` では採取できません。

そこで、`electronApplication.windows()` を使って、アプリの全てのウィンドウを取得し、BrowserView のスクリーンショットを採取してみました。

[https://playwright.dev/docs/api/class-electronapplication#electron-application-windows](https://playwright.dev/docs/api/class-electronapplication#electron-application-windows)

```javascript
test('launch app', async () => {
  const electronApp = await electron.launch({ args: ['src/main.js'] });
  const mainWindow = await electronApp.firstWindow();
  await mainWindow.waitForTimeout(2000);
  await mainWindow.screenshot({ path: './screenshot/main.png' });

  const windows = await electronApp.windows();
  await windows[1].screenshot({ path: './screenshot/child.png' });

  await electronApp.close();
});
```

無事取得できました。

![](https://i.gyazo.com/e41ac5fe6816f92d5fb44ac517551e72.png)

次に、ツールバーの Fav ボタン(☆アイコン)をクリックして Fav ページのスクリーンショットを取得するコードを追加。ボタンの Selector は Electron の DevTools で取得しました。これも無事動きました。

```javascript
test('launch app', async () => {
  const electronApp = await electron.launch({ args: ['src/main.js'] });
  const mainWindow = await electronApp.firstWindow();
  await mainWindow.waitForTimeout(2000);
  await mainWindow.screenshot({ path: './screenshot/main.png' });

  let windows = await electronApp.windows();
  await windows[1].screenshot({ path: './screenshot/child.png' });

  await mainWindow.click('#inspire > div.v-application--wrap > header > div.v-toolbar__content > header > div > button:nth-child(11)');
  await mainWindow.waitForTimeout(2000);
  windows = await electronApp.windows();
  await windows[2].screenshot({ path: './screenshot/favs1.png' });

  await electronApp.close();
});
```

この 'launch app' テストは色々やりすぎてごちゃついてきたし、Assertion も入れていないので、リファクタリングします。
テストメソッドを分割して、Playwright の `test.beforeEach()`、`test.afterEache()` を使ってテスト毎にアプリを起動、終了するようにしました。起動テストと、Fav ページのテストメソッドを分割し、expect API を使ってタイトル文字列や、取得したウィンドウの数などを検証するコードを追加しました。

```javascript
const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

let electronApp;
let mainWindow;

test.beforeEach(async ({ page }, testInfo) => {
  console.log(`Running ${testInfo.title}`);
  electronApp = await electron.launch({ args: ['src/main.js'] });
  mainWindow = await electronApp.firstWindow();
  await mainWindow.waitForTimeout(2000);
});

test.afterEach(async ({ page }, testInfo) => {
  await electronApp.close();
});

test('launch app', async () => {
  const title = await mainWindow.title();
  expect(title).toBe('sbe');
  await mainWindow.screenshot({ path: './screenshot/main.png' });

  const windows = await electronApp.windows();
  expect(windows.length).toBe(2);
  console.log(await windows[1].title());
  await windows[1].screenshot({ path: './screenshot/child.png' });
});

test('open fav page', async() => {
  await mainWindow.click('#inspire > div.v-application--wrap > header > div.v-toolbar__content > header > div > button:nth-child(11)');
  await mainWindow.waitForTimeout(2000);
  const windows = await electronApp.windows();
  expect(windows.length).toBe(3);
  await windows[2].screenshot({ path: './screenshot/favs.png' });
});
```

実行結果。

```
> sbe@3.0.0-beta.1 test
> playwright test


Running 2 tests using 1 worker

  ✓  test/test.js:18:1 › launch app (3s)
Running launch app
Scrapbox - チームのための新しい共有ノート
  ✓  test/test.js:32:1 › open fav page (5s)
Running open fav page
```

以上、Playwright を使って Electron アプリの簡単な動作確認テストを書いてみました。Spectron に比べてもテストは書きやすい印象でした。まだ実験的なサポートという位置付けですが、Spectron の開発が止まった現在、正式対応が待たれるところです。
