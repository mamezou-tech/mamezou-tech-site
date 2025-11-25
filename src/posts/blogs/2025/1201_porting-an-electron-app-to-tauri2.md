---
title: Electron アプリを Tauri 2.0に移植する PoC をやってみた
author: masahiro-kondo
date: 2025-12-01
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2025/
tags: [Tauri, electron, advent2025]
image: true
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2025](/events/advent-calendar/2025/)第1日目の記事です。

## はじめに

昨年9月に Tauri 2.0 の RC を触って記事を書いていました。

@[og](/blogs/2024/09/22/try-tauri-v2-rc/)

当時も2年ぶりぐらいに Tauri を触ったのですが、この時からまた1年以上が経ってしまいました。月日が経つの早いですね。

Tauri 2.0 は昨年10月に正式リリースされ、現在のバージョンは 2.9.3 です。そろそろ熟成されてきた頃ではないかと考え、Electron から移植してみる PoC を思いついた次第です。

## 移植するアプリ
これまでは、ちょっとした SPA 的なアプリを動かす程度のことしかやってこなかったので、もう少し実用的なアプリで試そうと思いました。
例によって拙作の Electron 製の野良 Cosense(Scrapbox) アプリを題材にさせていただきます。

@[og](https://github.com/kondoumh/sbe)

sbe の操作イメージのスクリーンショットです。タブ UI が特徴で、Cosense のページをタブで開いて表示・編集できるのと、独自の管理画面やプロジェクトのページ一覧などの UI も利用可能です。

![sbe screenshot](https://camo.githubusercontent.com/ff1e18741e641c3c6b927064a42e4038b6464021ac2c9485d0108a1941170545/68747470733a2f2f692e6779617a6f2e636f6d2f35333134653234333534343531343438613063623261656531333135663938362e676966)

移植といっても長年メンテしているアプリなので意外とコードベースも大きく機能も多いのでピンポイントでフィーチャーを実装してみて Electron との違いを噛み締めてみるという試みです。

今回の PoC での移植結果の出来上がりのスクリーンショットです。

![Screenshot](https://i.gyazo.com/f169fa4f964275fcf24a49eed26c2d70.gif)

最初のタブで開いたページの履歴とお気に入りが表示され、次のタブでページ一覧が開きます。ここでは任意の Cosense プロジェクトのページ一覧を表示可能です。履歴やお気に入りのリンクをクリックすると別ウィンドウでページを開きます。
後述しますが、タブ内での Cosense ページ表示はできなかったので PoC では妥協して別ウィンドウ表示としました。お気に入りへの追加はコンテキストメニューから可能です。

作成したコード全体をご紹介すると膨大になってしまうため、リポジトリは記事の終わりに掲載します。記事中のコードスニペットで雰囲気を掴んでいただければと思います。

## マルチビュー、タブ UI

sbe では、複数の Cosense ページや独自の画面 をタブ UI で表示しています。以下のように、Electron の WebContentsView で Scrapbox のページを表示し、複数の WebContentsView を Vue(Vuetify) で実装したタブで切り替えるようにしています。

![Tab UI](https://i.gyazo.com/0c42ab446e4770bb49d34b1f25d0d97c.png)

WebContentsView は BaseWindow に埋め込まれます。複数の WebContentsView を重ねて表示やタイル表示もできますし、API により Z 軸上の順序を入れ替え可能です。レンダラープロセスの Vuetiry のタブクリックイベントをメインプロセスに通知して WebContentsView の Z order を入れ替えることでタブ切り替えを実現しています。

![Structure of Tab UI](https://i.gyazo.com/d89edcd58440fa17c3316e89010f41a2.png)

:::info
Electron の WebContentsView の簡単なサンプルを GitHub の mamezou-tech オーガニゼーションで公開しています。

@[og](https://github.com/mamezou-tech/electron-example-browserview)

WebContentsView を使用するアプリの構造については以下の記事を参照してください。

@[og](/blogs/2024/08/28/electron-webcontentsview-app-structure/)

実際には sbe は BaseWindow + WebContentsView ではなく、BrowserWindow + BrowserView で実装しています。BrowserView は現在 WebContentsView の SIM として提供されているため、実質 WebContentsView による実装となっています。
:::

一方、Tauri の WebView は埋め込みをサポートしておらず、独立ウィンドウとして表示する方法しかありません。sbe のような UI を実装するには、単独の WebView 内に iframe を使ってサイトを表示する方法が考えられます。

Cosense サイトを iframe で表示しようとすると以下のようなエラーになります。

![CSP Error](https://i.gyazo.com/497a211a2d7a318c7fdab575ba88311c.jpg)

> Refused to load https://scrapbox.io/ because it does not appear in the frame-ancestors directive of the Content Security Policy.

Cosense は Content Security Policy (CSP) によって iframe 内での表示を制限しているようです。
そこで、Cosense 自体のタブ内表示は諦め、ページ毎に独立したウィンドウを WebView で起動することにしました。ただし、sbe で実装している管理画面やプロジェクトのページ一覧のような UI はタブで本体の WebView で表示することとしました。

Rust 側で WebView をウィンドウ表示するコマンドを作成しました。

```rust:src-tauri/src/lib.rs(抜粋)
#[tauri::command]
async fn create_webview_window(app: tauri::AppHandle, url: String, label: String) -> Result<(), String> {
    let webview_url = WebviewUrl::External(url.parse().map_err(|e| format!("Invalid URL: {}", e))?);
    
    let window = WebviewWindowBuilder::new(&app, &label, webview_url)
        .title("Scrapbox")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .center()
        .resizable(true)
        .visible(false)
        .build()
        .map_err(|e| e.to_string())?;
    
    // Show window after it's fully initialized
    window.show().map_err(|e| e.to_string())?;
    
    Ok(())
}
```

これを Vue の UI から `invoke` で呼び出します。

```typescript:App.vue(抜粋)
const reopenWindow = async (window: RecentWindow) => {
  try {
    const windowId = `reopen-${Date.now()}`;
    await invoke('create_webview_window', { 
      url: window.url,
      label: windowId
    });   
    errorMessage.value = "";
  } catch (error) {
    console.error('Failed to reopen window:', error);
    errorMessage.value = `ウィンドウの再起動に失敗しました: ${error}`;
  }
};
```

デスクトップがウィンドウだらけになってしまいますが、ひとまずマルチビューアプリの土台はできました。

## WebView でのナビゲーションの検出と Rust → フロントエンド通知
sbe では閲覧した Cosense ページの履歴を記録していますが、これは Electron の webContents のイベントを捕捉して実装しています。Cosense サイト内での遷移は `did-navigate-in-page` イベントで捕捉できます。

```javascript:main.mjs(抜粋)
function handleLinkEvent(view) {
  view.webContents.on('will-navigate', (e, url) => {
    // リンクを開く処理
  });
  view.webContents.on('did-start-navigation', async (e, url, isInPlace) => {
    const currentUrl = view.webContents.getURL();
    // 遷移開始時の処理
  });
  view.webContents.on('did-navigate-in-page', async (e, url) => {
    // サイト内遷移の処理(ヒストリへの保存など)
  });
  view.webContents.on('update-target-url', (e, url) => {
    // リンクのマウスオーバー時の処理
  });
}
```

Tauri の Rust 用 API では `on_navigation` や `on_page_load`というメソッドがあり、Web ページの取得開始やロード完了を捕捉できます。しかしこのハンドラーでは同一サイト内のページ遷移は検出できないようです。Cosense サイト内でのページ遷移をリアルタイムに捕捉するには、JavaScript を WebView に埋め込んでイベントをトラッキングする必要があります。そのため WebView を起動する際に `initialization_script` でトラッキング用のスクリプトを埋め込みます。

```rust:src-tauri/src/lib.rs(抜粋)
#[tauri::command]
async fn create_webview_window(app: tauri::AppHandle, url: String, label: String) -> Result<(), String> {
    let webview_url = WebviewUrl::External(url.parse().map_err(|e| format!("Invalid URL: {}", e))?);
    let window = WebviewWindowBuilder::new(&app, &label, webview_url)
        .title("Scrapbox")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .center()
        .resizable(true)
        .visible(false)
        .initialization_script(include_str!("../scripts/navigation-tracker.js"))
        .build()
        .map_err(|e| e.to_string())?;
    
    window.show().map_err(|e| e.to_string())?;
    Ok(())
}
```

短いスクリプトは `initialization_script` の中にインラインで書けますが、可読性や IDE での作業効率化のために別ファイルで作成しロードする方がよいでしょう。このスクリプトでは、trackNavigation 関数で、変更を検出したら Tauri の invoke コマンドを通じて Rust 側に送信しています。`popstate`、`hashchange` を監視しています。

```javascript:navigation-tracker.js
let currentUrl = window.location.href;
let currentTitle = document.title || window.location.hostname || 'Untitled';

// Function to track navigation
function trackNavigation(source = 'unknown') {
    const url = window.location.href;
    const title = document.title || window.location.hostname || 'Untitled';
    
    // Skip if no change
    if (url === currentUrl && title === currentTitle) return;
    
    console.log('Navigation tracked (' + source + '):', title, '→', url);
    
    // Update state
    currentUrl = url;
    currentTitle = title;
    
    if (window.__TAURI__ && window.__TAURI__.core) {
        window.__TAURI__.core.invoke('track_navigation', {
            windowLabel: window.navigationTrackerLabel,
            url: url,
            title: title
        }).then(result => {
            console.log('Track navigation success:', result);
        }).catch(err => {
            console.error('Failed to track navigation:', err);
        });
    } else {
        console.error('Tauri API not available');
    }
}

// Track initial page load
trackNavigation('initialization');

// Listen for navigation events
window.addEventListener('popstate', () => trackNavigation('popstate'));
window.addEventListener('hashchange', () => trackNavigation('hashchange'));
```

WebView から invoke された Rust の track_navigation では、Vue 側に `add-to-recent` イベントを発行します。

```rust:lib.rs
#[tauri::command]
async fn track_navigation(app: tauri::AppHandle, window_label: String, url: String, title: String) -> Result<(), String> {
    println!("Navigation tracked: {} -> {} ({})", window_label, url, title);
    
    // Emit event to main window for history tracking
    app.emit("add-to-recent", NavigationEvent {
        window_label,
        url,
        title,
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}
```

Vue 側では `add-to-recent` イベントを受けてリストを更新し、重複を排除するなどの処理をしてローカルストレージに書き込みます。

```typescript:App.vue
  // Listen for navigation events from WebView windows
  navigationUnlisten = await listen('add-to-recent', (event: any) => {
    const { window_label, url, title } = event.payload;
    
    addToRecent({
      id: `${window_label}-${Date.now()}`,
      title: title || new URL(url).hostname,
      url,
      lastAccessed: new Date()
    });

    console.log(`Navigation tracked: ${title} (${url})`);
  });


// Recent windows functions
const addToRecent = (window: RecentWindow) => {
  recentWindows.value = recentWindows.value.filter(w => w.id !== window.id);
  recentWindows.value.unshift(window);
  saveToStorage();
};

// Data persistence
const saveToStorage = () => {
  localStorage.setItem('sbe-recent', JSON.stringify(recentWindows.value.map(w => ({
    ...w,
    lastAccessed: w.lastAccessed.toISOString()
  }))));
  localStorage.setItem('sbe-favorites', JSON.stringify(favorites.value));
};
```

:::info
今回はフロントエンド側で LocalStorage に保存しましたが、Rust 側で JSON ファイルとしてセーブ・ロードするように実装すれば、マシンが変わっても履歴を持っていけるので便利かもしれません。
:::

Electron がページ内遷移の細やかなイベントを提供してくれていたので、Tauri の方式はかなり面倒に感じる部分でした。Electron が Chrome を内包していることで開発者はきめ細かいイベントの捕捉を簡単にできていましたが、Tauri は OS にインストールされた WebView を使用しているのでそこまで WebView 実装に入り込んだイベントの提供はできないようです。そこで、initialization_script スクリプトを注入するというややハッキーなやり方が必要でした。
Tauri と WebView は疎結合であるためですが、このおかげで Tauri のアプリは軽量で省メモリになっているとも言えます。

## Cosense ページ一覧画面のための API 呼び出しと JSON Parse
Cosense プロジェクトのページ一覧を Vue ので作成しタブ内で表示します。このためには Cosense の API で該当するプロジェクトのページリストを取得する必要があります。sbe では、およそ以下のような感じでメインプロセス側で Cosense API を使用してページ一覧を取得しています。

```javascript:main.mjs
async function fetchPageInfo(url) {
  const sid = await getSid();
  const res = await fetch(url, { headers: { cookie: sid } });
  const data = await res.json();
  return data;
}

async function getSid() {
  const cookies = await session.defaultSession.cookies.get({ name: 'connect.sid' });
  return cookies[0].value;
}
```
プライベートな Cosense プロジェクトからも取得できるよう、Cookie をセッションから取得して、リクエストヘッダーに埋め込んでいます。

Tauri でもデータのフェッチは Rust 側でやるのが推奨です。特に API キーなどはフロントエンドに晒さない方がよいでしょう。

Rust 側で API 呼び出しを実装するので、Electron のメインプロセス(の JavaScript) ではするっと実装できていたレスポンスの処理がやや面倒になります。API のレスポンスを解析して以下のように型情報を定義しました。

```rust
// API レスポンス
#[derive(Serialize, Deserialize)]
struct ScrapboxPagesResponse {
    #[serde(rename = "projectName")]
    project_name: String,
    skip: i32,
    limit: i32,
    count: i32,
    pages: Vec<ScrapboxPage>,
}

// ページ情報
#[derive(Serialize, Deserialize, Clone)]
struct ScrapboxPage {
    id: String,
    title: String,
    image: Option<String>,
    descriptions: Vec<String>,
    // 中略
    #[serde(rename = "charsCount")]
    chars_count: Option<i32>,
    helpfeels: Option<Vec<String>>,
}

// Cosense のユーザー情報
#[derive(Serialize, Deserialize, Clone)]
struct ScrapboxUser {
    id: String,
}
```

Cosense API を呼び出す fetch_scrapbox_pages コマンドです。`cookies_for_url` メソッドでウィンドウから Cookie を取得し、ヘッダーに埋め込むところは Electron と同様の流れです。上記で定義した ScrapboxPagesResponse に API のレスポンスを格納しています。

```rust
// Command to fetch Scrapbox pages with authentication (supports both public and private projects)
#[tauri::command]
async fn fetch_scrapbox_pages(
    app: tauri::AppHandle,
    project: String, 
    skip: Option<i32>, 
    limit: Option<i32>, 
    sort: Option<String>
) -> Result<ScrapboxPagesResponse, String> {
    let skip = skip.unwrap_or(0);
    let limit = limit.unwrap_or(20);
    let sort = sort.unwrap_or_else(|| "updated".to_string());
    
    let api_url = format!(
        "https://scrapbox.io/api/pages/{}?skip={}&limit={}&sort={}",
        project, skip, limit, sort
    );

    let scrapbox_url = Url::parse("https://scrapbox.io").map_err(|e| format!("Invalid URL: {}", e))?;

    // Try to get cookies from main window's webview
    let cookies = if let Some(main_window) = app.get_webview_window("main") {
        main_window.cookies_for_url(scrapbox_url.clone())
            .map_err(|e| format!("Failed to get cookies: {}", e))?
    };

    let client = reqwest::Client::new();
    let mut request_builder = client.get(&api_url);

    // Add cookies if available
    if !cookies.is_empty() {
        let cookie_header = build_cookie_header(cookies);
        println!("Using cookies for authentication: {} cookies", cookie_header.matches(';').count() + 1);
        request_builder = request_builder.header("Cookie", cookie_header);
    }
    
    let response = request_builder
        .send()
        .await
        .map_err(|e| format!("Failed to fetch pages: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("API request failed with status: {} - This might be a private project requiring authentication", response.status()));
    }
    
    let pages_data: ScrapboxPagesResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    Ok(pages_data)
}
```

Vue 側では Rust の `fetch_scrapbox_pages` を invoke して取得したリストを表示します。

```typescript
// Scrapbox pages functions
const fetchScrapboxPages = async () => {
  scrapboxLoading.value = true;
  scrapboxError.value = '';
  
  try {
    const result = await invoke('fetch_scrapbox_pages', {
      project: scrapboxProject.value,
      skip: scrapboxSkip.value,
      limit: scrapboxLimit.value,
      sort: scrapboxSort.value
    }) as { pages: ScrapboxPage[], count: number, skip: number };
    
    scrapboxPages.value = result.pages;
    console.log(`Fetched ${result.pages.length} pages from ${scrapboxProject.value}`);
  } catch (error) {
    console.error('Failed to fetch Scrapbox pages:', error);
    scrapboxError.value = `ページの取得に失敗しました: ${error}`;
  } finally {
    scrapboxLoading.value = false;
  }
};
```

Electron はメインプロセスも JS/TS で書けるのでやはり楽ですね。特に JSON の型情報の定義は面倒です。ただ、この辺は Rust 向けのジェネレータを利用するのが吉なんだと思います。

## コンテキストメニューのハンドリング
WebView ウィンドウに表示している Cosense ページをお気に入りに追加するための実装を行います。WebView 上でコンテキストメニューを表示して追加してもらうのが自然でしょう。
[以前の記事](/blogs/2024/09/22/try-tauri-v2-rc/#tauri-20-のフィーチャー-ネイティブなコンテキストメニューを使ってみる)では、SPA をアプリ化していたので Tauri の JavaScript API で簡単にコンテキストメニューを実装していました。今回のように WebView に Web サイトを表示する場合、コンテキストメニューの処理はやはりスクリプトを注入する必要があります。Tauri API によるコンテキストメニューのコードを注入してもいいのですが、今回は DOM 操作でコンテキストメニューを追加しました。Tauri API で追加するコンテキストメニューは OS ネイティブなものなので、WebView で表示しているサイトのルックアンドフィールに合わせたい場合は、DOM 操作で近い雰囲気のメニューを作るのも選択肢です。

```typescript
function showContextMenu(x, y) {
    // Remove existing context menu if any
    const existingMenu = document.getElementById('tauri-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Create context menu
    const menu = document.createElement('div');
    menu.id = 'tauri-context-menu';
    menu.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 180px;
        font-size: 14px;
    `;
    
    // Add menu item
    const menuItem = document.createElement('div');
    menuItem.textContent = '⭐ お気に入りに追加';
    menuItem.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        border-radius: 4px;
        transition: background-color 0.2s;
    `;
    
    menuItem.addEventListener('click', () => {
        addToFavorites();
        menu.remove();
    });
    
    menu.appendChild(menuItem);
    document.body.appendChild(menu);
    
    document.addEventListener('click', function removeMenu() {
        menu.remove();
        document.removeEventListener('click', removeMenu);
    });
}
```
このスクリプトを先ほどの、navigation-tracker.js と同様 WebView に注入します。

コンテキストメニューのクリックで addToFavorites 関数を呼び出しており、この中で、`add_to_favorites_from_webview` を invoke しています。Rust 側で add_to_favorites_from_webview　コマンドが実行され、Vue 側に add-to-favorites イベントが発行されます。

```rust:lib.rs
// Command to add to favorites from WebView
#[tauri::command]
async fn add_to_favorites_from_webview(app: tauri::AppHandle, url: String, title: String) -> Result<(), String> {
    // Emit event to main window to add to favorites
    app.emit("add-to-favorites", FavoriteEvent {
        url,
        title,
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}
```

Vue側では、Rust から送信されたイベントを元にお気に入り追加の処理を行います。

```typescript:App.vue
const addFavoriteFromWebView = async (url: string, title: string) => {
  try {
    // Check if already exists
    const existingFavorite = favorites.value.find(f => f.url === url);
    if (existingFavorite) {
      errorMessage.value = "すでにお気に入りに登録されています";
      setTimeout(() => {
        errorMessage.value = "";
      }, 2000);
      return;
    }
    
    const favorite: Favorite = {
      id: `fav-${Date.now()}`,
      title,
      url
    };
    
    favorites.value.unshift(favorite);
    saveToStorage();
    errorMessage.value = `お気に入りに追加しました: ${title}`;
    
    setTimeout(() => {
      errorMessage.value = "";
    }, 3000);
  } catch (error) {
    console.error('Failed to add favorite from WebView:', error);
    errorMessage.value = `お気に入りの追加に失敗しました: ${error}`;
  }
};
```

## GitHub Actions ワークフローでプラットフォーム毎のインストーラーを生成
一通り動作する Tauri 版の Cosense アプリができたので、macOS や Windows 向けのインストーラを CI で作成するようにしてみます。

Tauri は OS の WebView を使用するため、クロスコンパイルはできません。OS ごとにビルド環境を用意する必要があります。Electron でも OS 毎の Chrome を同梱させるため、OS ごとのビルド環境が必要になるのでそこは変わりません。

GitHub Actions の Strategy Matrix を使って、macOS と Windows のインストーラを作成して成果物として保存するワークフローを定義しました。

```yaml:.github/workflows/build-installers.yml
name: Build Installers

on:
  workflow_dispatch:

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-latest
            name: macos-installer
            path: |
              src-tauri/target/release/bundle/dmg/*.dmg
              src-tauri/target/release/bundle/macos/*.app
          - os: windows-latest
            name: windows-installer
            path: |
              src-tauri/target/release/bundle/msi/*.msi
              src-tauri/target/release/bundle/nsis/*.exe
    
    runs-on: ${{ matrix.os }}
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Setup Rust
      uses: dtolnay/rust-toolchain@stable

    - name: Install dependencies
      run: npm install

    - name: Build Tauri app
      run: npm run tauri build

    - name: Upload artifacts
      uses: actions/upload-artifact@v4
      with:
        name: ${{ matrix.name }}
        path: ${{ matrix.path }}
        retention-days: 30
```

このワークフローを実行して、生成された Tauri のアプリのインストーラは 5-7MB 程度、インストールされるバイナリは 3-4MB 程度です。

![Build Artifacts(PoC)](https://i.gyazo.com/c587f71e43fc517829cb91705e596fbc.png)

sbe のインストーラは 100MB 前後、macOS のユニバーサルインストーラは200MB近くあります。

![Release assets(sbe)](https://i.gyazo.com/1af88816f507b180b01af99f891a4099.png)

Tauri アプリのフットプリントの軽さは魅力的ですね。

## ソースコードのリポジトリ
今回の PoC の結果は以下のリポジトリに置いています。

@[og](https://github.com/kondoumh/sbe-tauri-poc)

Copilot に README を書いてもらったので表現がやや大袈裟になってしまっている点はご了承ください😅。

## さいごに
以上、Electron のアプリを Tauri 2.0 に移植してみる PoC のご紹介でした。今回の題材だと Electron の機能性や利便性が逆に強調される感じでしたが、軽量なバイナリが生成される点や、Rust のエコシステムによる開発体験は魅力ですね。

Tauri 2.0 では OS の WebView を利用していますが、Servo ベースのクロスプラットフォームな WebView を開発するプロジェクト Verso があります。

[NLnet; Servo improvements for Tauri](https://nlnet.nl/project/Verso/)

Verso により 各 OS の WebView 間の差異が吸収され、主要なデスクトップおよびモバイルプラットフォームで一貫性のある体験がもたらされます。今回面倒に感じた Navigation 用の API なども利用しやすくなるかもしれません。

将来 Tauri に Verso プロジェクトの成果が取り込まれれば WebView を腹持ちする構造になるため、バイナリサイズは大きくなるでしょう。そのため、従来の OS の WebView と切り替えるようなオプションが提供されるかもしれませんね。
