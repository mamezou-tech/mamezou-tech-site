# CLAUDE.md

豆蔵デベロッパーサイト（developer.mamezou-tech.com）のリポジトリ。

## 技術スタック

- **Lume**（Deno製の静的サイトジェネレーター）
- テンプレート: Nunjucks (`.njk`)、MDX
- スタイル: Tailwind CSS + PostCSS (`.pcss`)
- UIコンポーネント: React (`.tsx`、jsxプラグイン経由でLumeがビルド)
- 設定の起点: `_config.ts`（Lumeプラグインの登録一覧）

## 開発コマンド

```
deno task serve          # ローカル開発サーバー起動 (http://localhost:8080)
deno task serve:debug    # MZ_DEBUG=1 でデバッグ出力付き起動
deno task build          # 本番ビルド (public/ に出力)
deno task lint           # deno-lint.lock を使ったLint
```

Netlifyの本番ビルドは `build-netlify.sh` 経由で `deno task build` を呼ぶ（デプロイ設定は `netlify.toml`）。

## ディレクトリの役割

- `src/_includes/layouts/` — ページ全体のHTML骨格（`base.njk`, `post.njk`, `page.njk`, `home.njk` など）
- `src/_includes/styles/` — パーツ別のPostCSS（`_layout.pcss`, `_sitenav.pcss`, `_post.pcss`, `_card.pcss` など）
- `src/css/style.css` — 上記pcssを読み込むエントリーポイント
- `src/_components/` — Reactコンポーネント（ナビ、記事一覧、バナー等）
- `tailwind.config.js` — カラー・フォントなどデザインの基本設定
- `src/posts/blogs/<年>/` — 記事本体（日本語）。多言語版は `src/en/`, `src/zh-CN/` に同構成で配置
- `lume/` — Lume用のカスタムフィルタ・プラグイン（`_config.ts`から読み込まれる）

## 注意点

- `deno.json` の `fmt.exclude` に `src/pages`, `src/posts`, `src/css`, `src/events`, `src/img` が含まれる。これらは `deno fmt` の対象外（記事・CSSは自動整形しない）。
- 記事投稿のルール・手順は社内ScrapBoxの「豆蔵デベロッパーサイト」ページを参照（README.md記載）。本ファイルには重複して書かない。

## 進行中プロジェクト

デザイン刷新プロジェクト（2026年、ブランチ `feature/renew-desgin-2026`）の詳細は @docs/design-renewal-2026.md を参照。
