---
title: Jest再入門 - モック編
author: noboru-kudo
date: 2022-07-03
templateEngineOverride: md
prevPage: ./src/posts/jest/jest-snapshot-testing.md
# nextPage:
---

単体テストでは、テストを不安定化させる要因となる外部サービス、プロダクトへの依存は避けるべきです。
これを実現するには、モックやスタブが必要になってきます。
Jestはモック機能が標準で備わっています。今回はJestのモック機能を見ていきましょう。

[[TOC]]