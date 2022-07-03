---
title: テスト
description: ソフトウェアテストに関する技法やテクニック
---

どんな業界でも、プロダクト品質を確認・証明する上でテストはなくてはならない存在です。

ソフトウェア業界に限定すると、スコープによって様々な種類のテストがあります。名称は組織によって変わってきますが、代表的なものだと以下のようなものがあります。

- 単体テスト - ソースファイル
- 機能テスト - 複数コンポーネント
- (外部)結合テスト - 外部I/F
- システムテスト/E2Eテスト - システム全体
- 受け入れテスト(UAT) - ステークホルダーの視点
- 運用テスト - アラート、ログ、バックアップ等の運用視点

また、テスト駆動開発の浸透で、テストコードの位置づけを実装作業の中心に据えている現場も増えてきていると感じます。

ここでは、テスト技法やテスティングフレームワークに関する記事を紹介していきます。

## JUnit

- [Helidon Tips - MicroProfile RestClientを使ったRESTリソースのJUnitテスト](/msa/mp/ext03-helidon-rest-testing/)
- [JUnit5のExtension実装 - テストライフサイクルコールバックと引数の解決](/blogs/2022/05/30/junit5-extension/)

## Jest

### Jest再入門シリーズ
- [導入編](/testing/jest/jest-intro/)
- [マッチャー編](/testing/jest/jest-matchers/)
- [スナップショットテスト編](/testing/jest/jest-snapshot-testing/)
- [関数・モジュールモック編](/testing/jest/jest-mock/)
- タイマーモック編 <span style="color: red">Coming Soon!</span>
- カスタムマッチャー編 <span style="color: red">Coming Soon!</span>

## ArchUnit

- [ArchUnitで考えるアーキテクチャ構造とその検証](/blogs/2022/05/19/archunit-and-architechure/)

## Playwright

- [Electron アプリの E2E テストを Playwright で書く](/blogs/2022/06/05/test-electron-app-with-playwright/)

## Cypress

- [Cypress Component TestingでVueコンポーネントの単体テストをする](/blogs/2022/06/12/cypress-component-testing/#コンポーネントテストを記述する)


<div style="margin-top: 3rem"><span style="font-size: 1.2rem;color: red;">その他多数記事を追加予定です！！</span></div>
