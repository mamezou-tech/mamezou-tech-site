---
title: AIエージェントとシステムをつなぐMCP入門（リソース編）
author: masato-ubata
date: 2026-07-03
tags: [MCP, typescript]
image: true
---

## はじめに

本ページは「AIエージェントとシステムをつなぐMCP入門」の続編です。  
今回は、リソースについて説明します。  

MCPのリソースは、AIモデルが回答を生成する際に参照するコンテキスト情報（ファイル、ガイド、仕様など）を提供する機能です。  
ツールが「AIモデルの判断」で実行され、プロンプトが「ユーザーの意思」で選択されるのに対し、リソースは「アプリケーション主導（Application-driven）」でその組み込みを決定します。

本記事で掲載しているコードは[こちら](https://github.com/ubata-mamezou/developer-site-article-examples/tree/main/mcp-server_http)で公開しています。

:::info: シリーズ目次
**連載：AIエージェントとシステムをつなぐMCP入門**
* [イントロダクション](/blogs/2026/04/24/mcp-impl_introduction/)
* [stdio実装編](/blogs/2026/05/08/mcp-impl_stdio/)
* [StreamableHTTPステートレス実装編](/blogs/2026/05/22/mcp-impl_http_stateless/)
* [StreamableHTTPステートフル実装編](/blogs/2026/06/05/mcp-impl_http_stateful/)
* [プロンプト編](/blogs/2026/06/19/mcp-impl_prompt/)
* **リソース編（本ページ）**
:::

## 今回使用するライブラリなど

* npm@11.11.1
* node@22.22.0
* typescript@6.0.3
* @modelcontextprotocol/sdk@1.29.0
* zod@4.3.6

## 使用例

* 開発ガイドの共有: コーディング規約や設計方針をリソース化して、AI生成時の前提情報として渡します
* 仕様断片の参照: API仕様、エラーコード定義、入力制約などの抜粋をリソースとして公開し、コード生成の精度を高めます
* 動的パラメーターによって切り替える情報の提供: URIテンプレートを使い、可変パラメーターで内容が変わるリソースを提供します

## ツール、プロンプト、リソースの違い

これまでの特集でツール、プロンプト、リソースの主要要素に触れてきたので、ここで役割を振り返ります。

|要素名|主な役割|制御主体|識別方法|
|---|---|---|---|
|リソース|データ・コンテキスト（静的な知識）の提供|アプリケーション主導|リソースのURI|
|プロンプト|メッセージ・ワークフローのテンプレート|ユーザー主導|プロンプト名|
|ツール|具体的な関数の実行（能動的なアクション）|AIモデルによる実行|ツール名|

## リソースの種類

MCPのリソースは、URIの与え方によって2種類に分かれます。

| 種類 | 説明 | 用途例 |
|---|---|---|
| 静的リソース | 固定URIで一意に特定されるリソース | ガイド、固定仕様、設定情報など |
| リソーステンプレート | URIテンプレート（RFC 6570）でパラメーター化されたリソース | IDや名前などの可変要素で内容が変わる情報 |

## プロトコルメッセージ

MCPのリソースに関するメッセージは6種類あります。  

| メッセージ | 方向 | 説明 |
|---|---|---|
| `resources/list` | クライアント → サーバー | 利用可能なリソース一覧を取得する（ページネーション対応） |
| `resources/templates/list` | クライアント → サーバー | リソーステンプレート一覧を取得する |
| `resources/read` | クライアント → サーバー | URIを指定してリソースのコンテンツを取得する |
| `resources/subscribe` | クライアント → サーバー | 指定URIのリソース変更通知を購読する（ケーパビリティ`subscribe: true`が必要） |
| `notifications/resources/updated` | クライアント ← サーバー | 購読中のリソースが変更されたことを通知する |
| `notifications/resources/list_changed` | クライアント ← サーバー | リソース一覧が変化したことを通知する（ケーパビリティ`listChanged: true`が必要） |

※通知を検証するためには、リソースの源泉を別に設け　かつ　源泉側の変更検知も必要なため、サンプルには含めていません。

## データ構造（Data Types）

* コンテンツ
  * `uri`: リソースを一意に識別可能なURI
  * `name`: リソース名
  * `title`: 表示用のタイトル
  * `description`（任意）: リソースの説明
  * `icons`（任意）: アイコンリスト
  * `mimeType`（任意）: コンテンツのMIMEタイプ。テキストまたはバイナリ（Base64エンコードが必要）を指定可。
  * `size`（任意）: バイト数
* アノテーション（Annotations）: クライアントへのヒント
  * `audience`: 誰向けのリソースか示す情報。`user`, `assistant`または両方を指定可。
  * `priority`: 0.0～1.0の数値で示される重要度（1.0が最重要）
  * `lastModified`: 最終更新日時（ISO8601形式のタイムスタンプ）


## URIスキーム

リソースのURIには目的に応じたスキームを選びます。

| スキーム | 用途 | 備考 |
|---|---|---|
| `https://` | Web上のリソースを参照 | クライアント自身がアクセスできる場合に使用する。サーバー経由で取得する場合は独自スキームの検討が推奨されます |
| `file://` | ファイルシステムのような構造を表現したいリソース | ファイルシステムとのマッピングは必須ではなく、値の取得先は自由（DBや外部APIなど） |
| `git://` | Gitリソース | コミット、ブランチ、パスなどのGit固有の構造を表現 |
| カスタム | 独自スキームによる任意のリソース | RFC3986準拠。本サンプルの`memory://`、`orders://`もこれに該当 |

:::info
**サーバーはすべてのリソースURIを検証する**  
サンプルでは省略していますが、パストラバーサルなど意図しないアクセスを防止しなければいけません。

**fileでディレクトリを表現する場合**
mimeTypeに`inode/directory`（XDG規格）を指定することが推奨されます。
:::

## 実装サンプル

コードの全体は[こちら](https://github.com/ubata-mamezou/developer-site-article-examples/blob/main/mcp-server_http/src/index.prompt-and-resource.ts)をご覧ください。

### 静的リソースの登録

固定URIでリソースを公開する例です。  
`registerResource`の第2引数にURI文字列を渡すと静的リソースになります。

```ts
  // リソース: アノテーション付きの静的リソース（テキストコンテンツ）
  const testGuideUri = "memory://guides/testcase-prompt-playbook";
  server.registerResource(
    "testcase-prompt-playbook",
    testGuideUri,
    {
      mimeType: "text/markdown",
      description: "テスト観点生成のガイド",
      annotations: {
        audience: ["assistant"],           // AIへの参照情報として位置づける
        priority: 0.8,                     // 重要度（高め）
        lastModified: "2026-06-28T00:00:00Z",
      },
    },
    async () => ({
      contents: [{
        uri: testGuideUri, mimeType: "text/markdown",
        text: [
          // 実務ではもっと細かい指示が必要になりますが、行数を抑えるため最小限に留めています
          "# APIテストケース作成ガイド",
          "- 仕様の観点: 正常系、代替系、異常系、境界値、認可、冪等性",
          "- 基本フローの正常系を中心に、代替系、異常系、その他の観点を付加する形にまとめる。",
          "- ユースケースの検証を主眼とし、入力値検証などは含めない（単体テストで担保する）",
          "- 必要に応じて分類しながら、箇条書きで簡潔にまとめる",
        ].join("\n")
      }]
    }),
  );
```

* 動作確認: `resources/read`が確認できるPostmanで確認
	![Postmanからの実行確認](/img/blogs/2026/0703_mcp-impl_resource/example1_postman.png)

#### バリナリコンテンツの指定例

バイナリコンテンツ（画像など）は`blob`にBase64エンコード文字列を設定します。
```ts
// リソース: バイナリコンテンツの例（画像）
server.registerResource(
  "company-logo",
  "file://assets/logo.png",
  { mimeType: "image/png", description: "企業ロゴ画像" },
  async () => ({
    contents: [{ uri: "file://assets/logo.png", mimeType: "image/png", blob: "<Base64エンコードされたデータ>" }],
  }),
);
```

### リソーステンプレートの登録

`ResourceTemplate`クラスを使うと、URIテンプレート（RFC 6570）でパラメーター化されたリソースを公開できます。  
`{orderId}`のようなプレースホルダーがリクエスト時に展開されます。  
`list`コールバックは`resources/list`で返す候補一覧を定義します（省略不可、不要なら`undefined`を渡します）。  

`resources/read`リクエスト時、クライアントは`orders://O00001/detail`のようにテンプレートを展開したURIを指定します。  
サーバー側では`{orderId}`部分が変数として分解され、ハンドラーに渡されます。

```ts
  // リソーステンプレート: URIのパラメータで内容が変わる動的リソース
  server.registerResource(
    "order-detail",
    new ResourceTemplate("orders://{orderId}/detail", {
      list: async () => ({
        resources: [
          { uri: "orders://O00001/detail", name: "O00001", mimeType: "application/json" },
          { uri: "orders://O00002/detail", name: "O00002", mimeType: "application/json" },
        ],
      }),
    }),
    { mimeType: "application/json", description: "受注詳細" },
    async (uri, { orderId }) => ({
      contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ orderId, status: "pending" }) }],
    }),
  );
```

* 動作確認
  * リソーステンプレートの確認: `resources/templates/list`が確認できるMCP Inspectorで確認
	![リソーステンプレートの確認](/img/blogs/2026/0703_mcp-impl_resource/example2-1_mcp-inspector.png)
  * リソーステンプレートの実行確認: `resources/read`が確認できるPostmanで確認
	![リソーステンプレートの実行確認](/img/blogs/2026/0703_mcp-impl_resource/example2-2_postman.png)

## まとめ

* リソースは、AIへの参照情報を明示的に管理したい場合に有効です。
* 静的リソースは固定情報（ガイド、仕様など）、リソーステンプレートは可変情報（IDベースの詳細など）に向いています。
* アノテーションを設定することで、クライアントがリソースを適切に選択し、優先順位付けできます
* プロンプトと組み合わせると、生成指示と参照情報の両方を標準化できます
