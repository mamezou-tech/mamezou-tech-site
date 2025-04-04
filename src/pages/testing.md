---
title: テスト
description: ソフトウェアテストに関する技法やテクニック
icon: https://api.iconify.design/fluent-mdl2/test-plan.svg?color=%23730099&height=28
enTitle: Testing
---

どんな業界でもプロダクト品質を確認・証明する上で、テストはなくてはならない存在です。
テスト駆動開発の浸透で、テストコードの位置づけを実装作業の中心に据えている現場も増えてきていると感じます。

ここでは、テスト技法やテスティングフレームワークに関する記事を紹介していきます。

## Jest再入門シリーズ
JavaScriptのテスティングフレームワークとして、スタンダードとなったJestを改めて見直してみませんか？

- [導入編](/testing/jest/jest-intro/)
- [マッチャー編](/testing/jest/jest-matchers/)
- [スナップショットテスト編](/testing/jest/jest-snapshot-testing/)
- [関数・モジュールモック編](/testing/jest/jest-mock/)
- [カスタムマッチャー作成編](/testing/jest/jest-custom-matchers/)

## テスト技法 - ペアワイズ法
膨大になりがちなテストケースを効果的に作成するペアワイズ法をご紹介します。

- [複数因子の組み合わせテストケースを簡単に効率よく導出する](/blogs/2022/07/11/pairwise-test/)
- [ペアワイズ法による組み合わせテストケース生成ツール「PICT」の紹介](/blogs/2022/07/15/pairwise-test-case-creation-tool-pict/)
- [ペアワイズ法をGUIから使いこなすツール「PictMaster」の紹介](/blogs/2022/07/23/pictmaster/)
- [ペアワイズ法テストケース生成ツール「PictMaster」の制約表を使う](/blogs/2022/08/01/pictmaster-constraint-option/)
- [ペアワイズ法テストケース生成ツール「PictMaster」のエイリアスを使う](/blogs/2022/08/08/pictmaster-alias-option/)
- [ペアワイズ法テストケース生成ツール「PictMaster」の重みを使う](/blogs/2022/09/03/pictmaster-weight-option/)
- [ペアワイズ法テストケース生成ツール「PictMaster」のサブモデルを使う](/blogs/2022/09/11/pictmaster-submodel-option/)
- [ペアワイズ法テストケース生成ツール「PictMaster」の無効値を使う](/blogs/2022/10/01/pictmaster-Invalid-value-option/)
- [ペアワイズ法テストケース生成ツール「PictMaster」のカバレッジ指定を使う](/blogs/2022/11/27/pictmaster-coverage-option/)
- [ペアワイズ法テストケース生成ツール「PictMaster」の原型シートを使う(水準編)](/blogs/2023/01/06/pictmaster-prototype-sheet-option/)
- [ペアワイズ法テストケース生成ツール「PictMaster」の原型シートを使う(因子編)](/blogs/2023/01/08/pictmaster-prototype-sheet-2-option/)
- [ペアワイズ法テストケース生成ツール「PictMaster」の直交表を使う](/blogs/2023/02/05/pictmaster-orthogonal-table-option/)

## テスト技法 - Contract Test
マイクロサービスの文脈などで注目されている、アプリケーション間の結合可能性をテストするための技法であるContract Testをご紹介します。

- [Contract TestツールPactの紹介](/blogs/2022/12/03/contract-test-with-pact/)
- [Contract Testの使いどころを考える](/blogs/2022/12/09/contract-test-usecase/)
- [異言語間でContract Testを実施する](/blogs/2023/03/09/contract-test-multilang/)
- [Contract TestをGitlab CIのパイプラインに組み込む](/blogs/2023/04/03/contract-test-pipeline/)

## 自動テスト導入事例
豆蔵社員が実践した自動テストのノウハウをご紹介します。

- [自動打鍵テスト - 画面操作・検証だけでなくテストコード自体も自動生成してしまう真の自動化](/blogs/2022/08/27/automatic_operation_test/)

## フレームワーク・ライブラリ
自動化されたテストでは、フレームワークやライブラリの存在が欠かせません。
テストに関連する各種記事を集めてみました。

### JUnit

- [Helidon Tips - Helidon Tips - Helidon MP Testing with JUnit5を使ってみる](/msa/mp/ext02-helidon-testing/)
- [Helidon Tips - MicroProfile RestClientを使ったRESTリソースのJUnitテスト](/msa/mp/ext03-helidon-rest-testing/)
- [JUnit5のExtension実装 - テストライフサイクルコールバックと引数の解決](/blogs/2022/05/30/junit5-extension/)
- [今さら聞けないMaven - JUnit5のテストクラスがなぜか実行されない](/blogs/2022/08/24/maven-junit5-not-running/)
- [今さら聞けないMaven – コンテナも一緒にビルドしたい。テスト実行前にコンテナを起動したい](/blogs/2022/08/31/docker_with_maven/)

### ArchUnit

- [ArchUnitで考えるアーキテクチャ構造とその検証](/blogs/2022/05/19/archunit-and-architechure/)

### Playwright

- [Electron アプリの E2E テストを Playwright で書く](/blogs/2022/06/05/test-electron-app-with-playwright/)
- [LambdaでPlaywrightを動かす(Lambdaレイヤー / コンテナ)](/blogs/2024/07/19/lambda-playwright-container-tips/)
- [WSL上のPlaywrightの実行ブラウザを画面表示するときにハマったこと](/blogs/2024/09/10/playwright_headed_wsl/)

### Cypress

- [Cypress Component TestingでVueコンポーネントの単体テストをする](/blogs/2022/06/12/cypress-component-testing/#コンポーネントテストを記述する)

### Google Test

- [Google Test を使ってみる（その１：準備編）](/blogs/2022/11/04/google-test-01/)
- [Google Test を使ってみる（その２：サンプル実行編）](/blogs/2022/11/06/google-test-02/)
- [Google Test を使ってみる（その３：テストフィクスチャ編）](/blogs/2022/11/14/google-test-03/)
- [Google Test を使ってみる（その４：VSCode拡張機能編）](/blogs/2022/11/20/google-test-04/)
- [Google Test を使ってみる（その５：GoogleMock編）](/blogs/2023/10/08/google-test-05/)

### Vitest

- [Viteベースの高速テスティングフレームワークVitestを使ってみる](/blogs/2022/12/28/vitest-intro/)

### Pytest

- [Pytestを使ってみる（その１：準備編）](/blogs/2023/03/01/using-pytest-01/)
- [Pytestを使ってみる（その２：VSCode拡張機能編）](/blogs/2023/03/05/using-pytest-02/)

### Allure

- [テストのフレイキーさを簡単に確認するためにレポートツールAllureを利用する](/blogs/2023/05/11/flaky-test-allure/)

### Mockito

- [Java用モック・フレームワーク「Mockito」を使ってみる（その１：基本編）](/blogs/2023/08/13/using-mockito-basic/)
- [Java用モック・フレームワーク「Mockito」を使ってみる（その２：void型メソッドのモック編）](/blogs/2023/08/16/using-mockito-void-method/)
- [Java用モック・フレームワーク「Mockito」を使ってみる（その３：テストケースをまとめる編）](/blogs/2023/08/18/using-mockito-parameterizedtest/)

### PIT (PiTest)

- [ミューテーションテストの技法でテストの十分性を評価する](/blogs/2024/12/03/mutation-testing/)
- [ミューテーションテストの開発組み込みを考える](/blogs/2024/12/26/mutation-optimization/)
