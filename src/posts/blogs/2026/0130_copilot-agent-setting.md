---
title: GitHub Copilotのエージェントとインストラクションの設定方法
author: masato-ubata
date: 2026-01-30
tags: [GitHub Copilot]
image: true
---

## はじめに

本記事では、GitHub Copilotのエージェント（Agents）およびインストラクション（Instructions）の設定方法について説明します。

**Agents（エージェント）とは**
特定のタスクや分野に特化した専門家としてCopilotをカスタマイズする機能です。
たとえば、バックエンド開発用、フロントエンド開発用など、異なる専門性を持つ複数のエージェントを定義し、状況に応じて使い分けることができます。
Issueにアサインしたり、VS Code上で選択して利用します。

**Instructions（インストラクション）とは**
Copilotに対する共通のルールや制約を定義する機能です。
コーディング規約、命名規則、プロジェクト固有のベストプラクティスなどを記載し、すべての開発者が一貫したコード生成の支援を受けられるようにします。
エージェントと併用され、VS CodeでのコーディングやPull Requestのレビューなど、あらゆる場面で適用されます。

## 適用順序

以下の順序でルールが適用されます。競合するルールがある場合、数字の小さいルールが優先されます。

1. 選択したエージェント（例: `agents/backend.agent.md`）
2. マッチするインストラクション（例: `instructions/typescript.instructions.md` ← applyToパターンに一致）
3. 全体のインストラクション（`copilot-instructions.md`）


## ファイルの配置

GitHub Copilotが認識できるよう、下記のように配置します。

* `.github/`
  * `agents/`
    * `xxx.agent.md`: 特定の分野（ロールなど）に合わせて定義するエージェントファイル（e.g. backend, frontend, test）
  * `copilot-instructions.md`: 全体に適用されるルールや制約を定義するファイル
  * `instructions/`
    * `xxx.instructions.md`: 特定の分野（テクノロジーなど）に合わせて定義するファイル。（e.g. typescript, python, react）※フォルダーで分類したくなりますが、フォルダーわけすると読み込まれません。

:::warning
**AGENTS.mdについて**

`.github/AGENTS.md`（ディレクトリ直下）は**GitHub CLI用**のファイルです。
VS Codeでは読み込まれませんので注意してください。
VS Codeでは`agents/`ディレクトリ内の`*.agent.md`ファイルのみが有効です。
:::

:::info
**ワークスペースでの配置**

VS Codeでマルチリポジトリ（複数のリポジトリを同時に開いて作業）する場合、
設定ファイルは**ワークスペースのルートディレクトリ**の`.github/`に配置する必要があります。
各リポジトリに個別の設定を使いたい場合は、リポジトリごとに別のVS Codeウィンドウで開いてください。

* `.github/agents/sample.agent.md`: ワークスペースルートに配置すると選択できます
  * `repo-A/.github/agents/sample.agent.md`: 各リポジトリ配下のエージェントは読み込まれません
  * `repo-B/.github/agents/sample.agent.md`
:::

## ヘッダー部の用途

定義ファイルのヘッダー部に設定できるプロパティの一部を紹介します。

**エージェント**

```md
---
name: Backend Agents(TypeScript)
description: This custom agent implements backend features using TypeScript.
model: GPT-5.2
---
```
![エージェント選択画面（VS Code）](/img/blogs/2026/0130_copilot-agent-setting/select-copilot-agent_vscode.png)
※エージェント選択画面（VS Code）

|プロパティ|設定時|未設定時|
|---|---|---|
|name|エージェント名として使用|拡張子を除いたファイル名をエージェント名として使用|
|description|エージェントの説明として使用|空欄|
|model|使用するAIモデルを指定|デフォルトモデル|

**インストラクション**

```md
---
applyTo: "src/**/*.ts" # e.g. src配下のtsファイルを対象
---
```

|プロパティ|設定時|未設定時|
|---|---|---|
|applyTo|指示を適用するファイルのパターンを指定（globパターン）|すべてのファイルに適用|

:::info
**applyToの指定例**
* `**/*.ts` - すべてのTypeScriptファイル
* `src/**` - srcディレクトリ配下のすべてのファイル
* `**/*.{js,ts}` - JavaScriptとTypeScriptファイル
:::


## 定義例

エージェントおよびインストラクションの定義例を以下に示します。  
これらを組み合わせることで、プロジェクトやタスクに最適化されたCopilotの動作を実現できます。

### エージェント：バックエンド開発者

````md: .github/agents/backend-specialist.agent.md
---
name: Backend Developer Agent
description: NestJSを使用したバックエンド開発の専門家
---

# 役割

あなたはNestJSとTypeScriptを使用したバックエンド開発の専門家です。

# 技術スタック

- **フレームワーク**: NestJS 11.x
- **言語**: TypeScript 5.x
- **データベース**: PostgreSQL
- **ORM**: TypeORM
- **テスト**: Jest

# コーディング規約

- ヘキサゴナルアーキテクチャを遵守してください
- DTOには必ずバリデーションデコレータを付与してください
- 例外処理は適切なHTTPステータスコードを返すカスタム例外を使用してください

# テスト方針

- 単体テストはすべてのServiceクラスに対して作成してください
- テストカバレッジは80%以上を目標としてください
````

### 全体インストラクション：プロジェクト共通規約

```md: .github/copilot-instructions.md
# コーディング規約

## 共通ルール

- **言語**: 日本語でコメントとドキュメントを記載してください
- **命名規則**: 
  - クラス名: PascalCase
  - 関数名・変数名: camelCase
  - 定数: UPPER_SNAKE_CASE
- **インデント**: スペース2文字
- **文字列**: シングルクォートを使用

## 禁止事項

- `any`型の使用は原則禁止（型定義を適切に行うこと）
- `console.log`のコミットは禁止（ロガーを使用すること）
- 機密情報のハードコードは厳禁

## セキュリティ

- 外部入力は必ずバリデーションを行うこと
- SQLインジェクション対策を実施すること
- 認証・認可が必要なエンドポイントにはガードを設定すること
```

### 分野別インストラクション：TypeScript専用ルール

````md: .github/instructions/typescript.instructions.md
---
applyTo: "**/*.ts"
---

# TypeScript固有のルール

## 命名規則

- ファイル名: kebab-case

## 型定義

- 明示的な型注釈を優先してください
- Utility Typesを活用してください（`Partial`, `Pick`, `Omit`など）
- 複雑な型は`type`エイリアスで定義してください

```typescript
// Good
type UserProfile = {
  id: string;
  name: string;
  email: string;
};

type UserProfileUpdate = Partial<Pick<UserProfile, 'name' | 'email'>>;

// Bad
const updateUser = (data: any) => { ... };
```

## 非同期処理

- `async/await`を使用してください（Promiseチェーンは避ける）
- エラーハンドリングは`try-catch`で行ってください

## インポート順序

1. 外部ライブラリ
2. 内部モジュール（絶対パス）
3. 相対パス

```typescript
// 外部ライブラリ
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';

// 内部モジュール
import { UserEntity } from '@/entities/user.entity';
import { CreateUserDto } from '@/dto/create-user.dto';

// 相対パス
import { UserService } from './user.service';
```
````

## 運用上の注意事項

### VS Codeでのキャッシュ管理

エージェントやインストラクションのファイルを変更した場合、初回ロードした内容がキャッシュされます。
変更を反映するには、以下のいずれかの操作が必要です。
- チャットで変更したファイルを明記して再読み込みを促す（例: `sample.agent.mdを変更したので再読み込みしてください`）
- 新しいチャットを開始する
- VS Codeを再起動する

### GitHubでのファイルサイズ制限

エージェントファイルの文字数が30,000文字（バイト数ではなく、ヘッダー部は含まない）を超えると選択できなくなります。
適切な粒度でファイルを分割してください。

![30000文字を超えたエージェントの表示例](/img/blogs/2026/0130_copilot-agent-setting/copilot-agent-file-size-limit_github.png)

*GitHub IssueでCopilotをアサイン後に表示されるダイアログ*
