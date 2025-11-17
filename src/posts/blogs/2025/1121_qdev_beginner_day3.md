---
title: AIと始めるAWS開発 ― Q Developerで継続的品質保証
author: shuichi-takatsu
date: 2025-11-21
tags: [Q Developer, 仕様駆動, AWS, 生成AI, 品質保証]
image: true
---

## はじめに

[前回](/blogs/2025/11/17/qdev_beginner_day2/)では、**仕様から実装・テスト生成まで**の流れを体験し、AIがどのようにソフトウェア開発を支援できるかを確認しました。  
今回（Day 3）は、その延長として **品質保証** に焦点を当てます。  

AIによるコード生成が一般化する中で、重要なのは「**どう品質を保証し続けるか**」。  
Q Developerの**レビュー支援機能とメトリクス可視化**を使いながら、**AIと人間のハイブリッドによる品質保証サイクル**を具体的に見ていきましょう。

---

## 1. どこを見るか ― 品質観点の棚卸し

まずは「レビューで何を見るのか」を整理します。  
これはQ Developerが自動チェックする項目にも関わる部分です。

| 観点 | チェック項目 | 目的 |
|------|----------------|------|
| **例外処理** | 例外の握り潰し・再スロー方針の一貫性 | 障害解析性を確保 |
| **命名規約** | クラス名・変数名・ディレクトリ構造の整合性 | 読解コスト削減 |
| **依存関係** | 循環依存・層違反の有無 | 構造的健全性の担保 |
| **ログ設計** | 粒度・相関ID・監査性 | 運用時トレーサビリティの向上 |
| **テストの意図** | 境界条件・オラクルの有無 | 妥当性と網羅性の保証 |

---

## 2. Q Developerでレビューを回す

コードレビューをAIに依頼する場合、次のようなコマンドで開始します。  
サンプルは前回作成したToDoアプリを使用します。

Q Developerを起動します。

```bash
# 対話モードを起動
q
```

レビュー観点をレビューのカテゴリにまとめ、カテゴリ単位でQ Developerに指示を出します。

| レビュー観点 | レビュー・カテゴリ | 説明                            |
| ---------- | ----------------- | ----------------------------- |
| 例外処理       | 設計／可読性            | 例外方針の整合性・例外伝播の扱いは設計扱い         |
| 命名規約       | 可読性               | 命名揺れ・責務不一致は可読性として指摘される        |
| 依存関係       | 設計                | 層違反・循環依存などアーキテクチャ的問題          |
| ログ設計       | 可読性／設計            | ログ粒度・相関ID は設計・運用設計の観点         |
| テストの意図     | 設計／品質（テスト品質）      | AI では「テストの妥当性」＝設計・品質問題として扱われる |

また、上記表のカテゴリにはありませんが、全体横断的にセキュリティは重要な観点のため、Q Developerへの指示に追加します。

起動後のプロンプトで以下のように入力します。
※ツール実行提案が出た場合、セッション中のみ許可する場合は `y`、以後も許可する場合は `t` を選択します。

```text
main.py と test_api.py のコードをレビューしてください。
セキュリティ、可読性、設計の観点で指摘を分類し、修正提案も示してください。
```

応答：
```
🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/todo-fastapi/main.py, all lines
 ✓ Successfully read 1684 bytes from /home/ubuntu/todo-fastapi/main.py

 ⋮
 ● Completed in 0.0s

🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/todo-fastapi/test_api.py, all lines
 ✓ Successfully read 3155 bytes from /home/ubuntu/todo-fastapi/test_api.py

 ⋮
 ● Completed in 0.0s

> ## コードレビュー結果

### 🔒 セキュリティの問題

main.py:
1. 入力値制限なし
  python
   # 問題: title/descriptionの長さ制限なし
   title: str  # DoS攻撃の可能性

2. レート制限なし
  python
   # 問題: API呼び出し制限なし
   @app.post("/todos")  # 大量リクエスト可能

3. CORS設定なし
  python
   # 問題: クロスオリジン制御なし
   app = FastAPI()  # CORS未設定

test_api.py:
4. ハードコードされたURL
  python
   BASE_URL = "http://localhost:8000"  # 設定ファイル化推奨

### 📖 可読性の問題

main.py:
1. グローバル変数
  python
   # 問題: グローバル状態
   todos = []
   todo_id_counter = 1

2. マジックナンバー
  python
   # 問題: ポート番号ハードコード
   uvicorn.run(app, host="0.0.0.0", port=8000)

test_api.py:
3. 重複コード

python
   # 問題: 同じパターンの繰り返し
   print(f"Create Todo: {response.status_code}")
   print(json.dumps(response.json(), indent=2))

### 🏗️ 設計の問題

main.py:
1. 単一責任原則違反

python
   # 問題: ビジネスロジックとAPI層が混在
   def create_todo(todo: TodoCreate):
       global todo_id_counter  # データ操作がAPI層に

2. スレッドセーフティ
  python
   # 問題: 競合状態の可能性
   todo_id_counter += 1  # 非原子的操作

test_api.py:
3. テスト独立性なし
  python
   # 問題: テスト間の依存関係
   todo_id = test_create_todo()  # 前のテスト結果に依存

## 🔧 修正提案

### セキュリティ改善

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: /home/ubuntu/todo-fastapi/main_improved.py

+     1: from fastapi import FastAPI, HTTPException
+     2: from fastapi.middleware.cors import CORSMiddleware
+     3: from pydantic import BaseModel, Field, validator
+     4: from typing import List, Optional
+     5: from datetime import datetime, timezone

～～～（中略）～～～

+    84: @app.delete("/todos/{todo_id}", status_code=204)
+    85: def delete_todo(todo_id: int = Field(..., gt=0)):
+    86:     if not repo.delete(todo_id):
+    87:         raise HTTPException(status_code=404, detail="Todo not found")
+    88:
+    89: if __name__ == "__main__":
+    90:     import uvicorn
+    91:     uvicorn.run(app, host="127.0.0.1", port=8000)

 ⋮
 ↳ Purpose: Create improved main.py with security enhancements
Creating: /home/ubuntu/todo-fastapi/main_improved.py

 ⋮
 ● Completed in 0.1s

> ### テスト改善

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: /home/ubuntu/todo-fastapi/test_improved.py

+      1: import requests
+      2: import json
+      3: from datetime import datetime, timedelta
+      4: from typing import Dict, Any
+      5:

～～～（中略）～～～

+    121:         # クリーンアップ
+    122:         self.cleanup()
+    123:         self.test_get_todos()
+    124:
+    125: if __name__ == "__main__":
+    126:     tester = TodoAPITester()
+    127:     tester.run_all_tests()

 ⋮
 ↳ Purpose: Create improved test file with better structure
Creating: /home/ubuntu/todo-fastapi/test_improved.py

 ⋮
 ● Completed in 0.3s

> ## 📋 改善点まとめ

### セキュリティ改善
• **入力値制限**: Field()でmin_length/max_length設定
• **CORS設定**: 特定オリジンのみ許可
• **スレッドセーフ**: threading.Lockで排他制御
• **バインドアドレス**: 127.0.0.1に変更（外部アクセス制限）

### 可読性改善
• **責任分離**: TodoRepositoryクラスでデータ操作を分離
• **設定外部化**: 環境変数やクラス初期化で設定管理
• **重複排除**: テストクラスで共通処理をメソッド化

### 設計改善
• **依存性注入**: リポジトリパターン採用
• **テスト独立性**: クリーンアップ機能追加
• **エラーハンドリング**: 適切なHTTPステータスコード使用
• **型安全性**: Field()バリデーション強化

改善版では本格運用に近い品質になっています。
```

指示したように、AIレビュー結果では以下のように分類されて表示されました。

| カテゴリ | 例 | 対応方針 |
|-----------|----|-----------|
| セキュリティ | 未処理の例外、ハードコードされた認証情報 | 優先対応 |
| 可読性 | 命名のばらつき、コメント欠如 | 対応を検討 |
| 設計 | クラス肥大化、循環依存 | チーム内で合意形成が必要 |

このようにAIを相手にレビューを実施することが可能です。  
ただし、AIの自動修正提案（ツール実行）は **“提案”レベル**です。  
必ず人間が承認する運用にしましょう。

---

## 3. メトリクスで「見える化」する

レビューは定性的な活動ですが、Q Developerでは数値指標による定量的管理も可能です。  
ここでは、**なぜメトリクスが必要なのか**、そして**どのように活用すべきか**を、より実務的な観点で詳しく説明します。

### 3.1 メトリクスの役割とは？

メトリクスとは、コード品質や開発プロセスを「数値」で客観的に評価する道具です。  
属人的な「なんとなく良さそう」「たぶん問題ない」を排除し、以下の3つを実現します：

1. **現状の可視化（見える化）**：改善すべき箇所を定量的に把握できる
2. **改善効果の測定**：前回との比較で良くなったかどうかがわかる
3. **基準の共有**：チーム全員が同じ尺度で議論できる

特にAIと共存する開発では、生成コードの質にばらつきがあるため、メトリクスは「品質の安定化」に欠かせません。

### 3.2 主要メトリクスの詳細

ここでは、コード品質を評価する際に特に重要となるメトリクスを整理します。  
これらは単なる“数字”ではなく、**品質改善の優先順位付け**や**チーム内での合意形成**に欠かせない指標です。  
メトリクスの目的や意味を理解しておくことで、レビュー結果をより実務的に活用できます。

| 指標 | 目的 | 目安 | 詳細説明 |
|------|------|------|-----------|
| **静的解析スコア** | 構文・構造の健全性 | 90点以上 | 循環依存、未使用コード、例外処理、セキュリティ問題などを総合評価。点数化することで改善の優先度を決めやすい。 |
| **テストカバレッジ** | 機能網羅率 | 80%以上 | 単に数値を見るのではなく、**どの関数が未カバーか**まで確認するのが重要。重要ロジックは100%を目指す。 |
| **コメント率** | 可読性・ドキュメント性 | 10〜20% | コメントが「多ければ良い」ではない。コードの意図や設計判断を書き残す“質”が重要。 |
| **命名一貫率** | 品質基準遵守度 | 95%以上 | 関数・変数の命名パターンが揃っているか。レビュー時間削減につながる。 |
| **変更影響深度** | リファクタ容易性 | 低いほど良い | 変更がどれだけ他モジュールへ影響するかを測る。深度が高い＝保守コストが高いコード。 |

### 3.3 メトリクスを実際に計測する

前回作成した `todo-fastapi/` はモジュール構成が小さいため、まずは**テストカバレッジ**を例にします。  
pytestを使用したカバレッジ計測を実施します。

指示：
```
python main.py
pytest --cov=. --cov-report=xml
```

応答：
```
🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command: python main.py &
 ⋮
 ↳ Purpose: Start FastAPI server in background

 ⋮
 ● Completed in 0.1s

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
sleep 3 && pytest --cov=. --cov-report=xml
 ⋮
 ↳ Purpose: Wait for server to start and run pytest with coverage

============================= test session starts ==============================
platform linux -- Python 3.12.3, pytest-9.0.1, pluggy-1.6.0
rootdir: /home/ubuntu/todo-fastapi
plugins: anyio-4.11.0, cov-7.0.0
collected 8 items

test_api.py ..E.....                                                     [100%]

==================================== ERRORS ====================================
______________________ ERROR at setup of test_delete_todo ______________________
file /home/ubuntu/todo-fastapi/test_api.py, line 24
  def test_delete_todo(todo_id):

～～～（中略）～～～

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
ps aux | grep "python main.py"
 ⋮
 ↳ Purpose: Check if server is running

ubuntu    222074  0.2  0.6 231596 49596 pts/7    Sl+  21:55   0:00 python main.py
ubuntu    224348  0.0  0.0   4756  3248 pts/5    S+   22:02   0:00 bash -c ps aux | grep "python main.py"
ubuntu    224350  0.0  0.0   4100  1992 pts/5    S+   22:02   0:00 grep python main.py
 ⋮
 ● Completed in 0.28s

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
curl -s http://localhost:8000/todos || echo "Server not responding"
 ⋮
 ↳ Purpose: Test server connectivity

[{"id":1,"title":"Test Todo","description":"Test description","priority":"high","due_date":"2025-11-17T21:55:47.625131","created_at":"2025-11-16T21:55:47.632922"},{"id":2,"title":"Minimal Todo","description":null,"priority":"low","due_date":null,"created_at":"2025-11-16T21:55:47.654090"},{"id":5,"title":"Test Todo","description":"Test description","priority":"high","due_date":"2025-11-17T22:02:54.546964","created_at":"2025-11-16T22:02:54.550647"},{"id":6,"title":"Minimal Todo","description":null,"priority":"low","due_date":null,"created_at":"2025-11-16T22:02:54.575022"}]
 ⋮
 ● Completed in 0.16s

> ✅ サーバーが起動し、テストが実行されました

結果:
• **サーバー**: 正常起動中（PID 222074）
• **XMLレポート**: Coverage XML written to file coverage.xml - 成功
• **テスト**: 7つ成功、1つエラー（fixture問題）
• **API**: 正常動作（Todoデータが存在）

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
pkill -f "python main.py"
 ⋮
 ↳ Purpose: Stop the server

 ⋮
 ● Completed in 0.15s

> サーバーを停止しました。XMLカバレッジレポートが正常に生成されています。
```

これにより `coverage.xml` が生成されます。

---

### 3.4 coverage.xml を Q Developer に解析させる（対話）

対話モードで、次のように依頼します：
```
coverage.xml を読み込み、
・関数ごとのカバレッジ
・未テスト箇所の一覧
・優先的に追加すべきテストケースの提案
・複雑度の高い関数ランキング
を出してください。
```

Q Developer は内部ツール（fs_read / analyze_code）を使い、以下を返します：
- どの関数が未カバーか
- 条件分岐のテスト不足
- 異常系・境界テストの欠落
- テスト追加の具体例（パラメータ例まで出ることが多い）

応答：
```
🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/todo-fastapi/coverage.xml, all lines
 ✓ Successfully read 4891 bytes from /home/ubuntu/todo-fastapi/coverage.xml
 ⋮
 ● Completed in 0.0s

～～～（中略）～～～

問題: サーバーが起動していたにも関わらず、main.pyのカバレッジが0%のままです。これは、テストがHTTPリクエストを送信しているだけで、pytestがmain.pyのコードを直接実行していないためです。TestClientを使用することで解決できます。
```

どうやら、カバレッジが正しく収集できないようです。  
Q Developerは単に「できません」と言うだけでなく、解決案の提示もしてくれます。  

Q Developerの進言に従って、TestClientを使用するように依頼します。

指示：
```
TestClientを使用するように変更してください
```

応答：
```
🛠️  Using tool: fs_write
 ⋮
 ● Path: test_api.py

-  0    : import requests
+      0: from fastapi.testclient import TestClient
   1,  1: import pytest
   2,  2: from datetime import datetime
+      3: from main import app
   3,  4:
-  4    : BASE_URL = "http://localhost:8000"
+      5: client = TestClient(app)
   5,  6:
   6,  7: def test_create_todo():
   7,  8:     todo_data = {
   8,  9:         "title": "Test Todo",
   9, 10:         "description": "Test description",
  10, 11:         "priority": "high",
  11, 12:         "due_date": "2025-11-17T12:00:00"
  12, 13:     }

～～～（中略）～～～

Coverage XML written to file coverage.xml
========================= 8 passed, 1 warning in 1.17s =========================
 ⋮
 ● Completed in 1.557s

> ✅ TestClientを使用したテストが成功しました！

結果:
• **httpx**: インストール完了
• **テスト**: 8つ全て成功
• **XMLレポート**: Coverage XML written to file coverage.xml - 成功
• **実行時間**: 1.17秒
• **警告**: Pydantic V1 validator使用の警告のみ

TestClientを使用することで、サーバー起動なしでAPIテストが実行でき、main.pyのコードカバレッジも測定されるようになりました
```

カバレッジが収集されたので、再度以下のように依頼します。
```
coverage.xml を読み込み、
・関数ごとのカバレッジ
・未テスト箇所の一覧
・優先的に追加すべきテストケースの提案
・複雑度の高い関数ランキング
を出してください。
```

応答：
```
🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/todo-fastapi/coverage.xml, all lines
 ✓ Successfully read 4181 bytes from /home/ubuntu/todo-fastapi/coverage.xml
 ⋮
 ● Completed in 0.0s

> ## カバレッジ分析結果

### 📊 全体カバレッジ
• **総合カバレッジ**: 97.87% (92/94行) - 大幅改善！
• **main.py**: 95.83% (46/48行)
• **test_api.py**: 100% (46/46行)

### 🔍 関数ごとのカバレッジ

#### main.py (95.83%カバレッジ)
• create_todo() (38-48行): ✅ 完全テスト済み
• get_todos() (49-51行): ✅ 完全テスト済み
• delete_todo() (57-63行): ✅ 完全テスト済み
• validate_due_date() (24-28行): ✅ 完全テスト済み

#### test_api.py (100%カバレッジ)
• 全テスト関数が実行済み

### ❌ 未テスト箇所の一覧

#### main.py (わずか2行未テスト)
1. 66行: import uvicorn
2. 67行: uvicorn.run(app, host="0.0.0.0", port=8000)

これらはif __name__ == "__main__"ブロック内のサーバー起動コードで、テスト時には実行されません。

### 🎯 優先的に追加すべきテストケース

#### 低優先度（既に高カバレッジのため）
1. エッジケースの追加
   • 空文字列タイトル
   • 極端に長いタイトル/説明
   • 境界値テスト

2. エラーハンドリングの詳細テスト
   • 不正なJSON形式
   • 型変換エラー

3. パフォーマンステスト
   • 大量データでの動作確認

### 📈 複雑度の高い関数ランキング

#### 1位: create_todo() (main.py 38-48行)
• **複雑度**: 高
• **カバレッジ**: ✅ 100%
• **理由**: グローバル変数操作、オブジェクト生成、リスト操作、カウンター管理
• **行数**: 11行

#### 2位: delete_todo() (main.py 57-63行)
• **複雑度**: 中高
• **カバレッジ**: ✅ 100%
• **理由**: ループ処理、条件分岐、例外処理、リスト操作
• **行数**: 7行

#### 3位: validate_due_date() (main.py 24-28行)
• **複雑度**: 中
• **カバレッジ**: ✅ 100%
• **理由**: 条件分岐、日時比較、例外発生
• **行数**: 5行

#### 4位: get_todos() (main.py 49-51行)
• **複雑度**: 低
• **カバレッジ**: ✅ 100%
• **理由**: 単純なリスト返却
• **行数**: 3行

### 🎉 成果

TestClient導入により劇的改善:
• **カバレッジ**: 35.96% → 97.87% (+61.91%)
• **main.py**: 0% → 95.83% (+95.83%)
• **全テスト**: 成功（8/8）
• **実行時間**: 高速化（サーバー起動不要）

### 💡 推奨アクション

1. 現状維持 - 既に優秀なカバレッジ
2. コード品質向上
   • Pydantic V2への移行（警告解消）
   • 型ヒントの追加
3. 統合テストの追加
   • 複数操作の組み合わせテスト
4. ドキュメント整備
   • API仕様書の作成

結論: TestClientの導入により、ほぼ完璧なテストカバレッジを達成しました。残りの2行は実行時コードのため、実質的に100%のカバレッジです。
```

無事にカバレッジを収集することができました。  

### 3.5 メトリクスをどう改善に活かすか

メトリクスは“数値を見ること”が目的ではありません。  
むしろ、メトリクスは **「どこから改善すれば最も効果が高いのか」** を示す“改善ナビゲーション”です。  
数値が示す意味を正しく理解し、次のアクションへつなげることで、品質改善サイクルが加速します。

以下では、代表的なメトリクスからどのように改善につなげるかを、より具体的に説明します。

改善のために以下のように使います：

- **低カバレッジ関数 → 追加テストを作成**  
  カバレッジが低いということは、挙動を保証するテストが不足している状態です。特にビジネスロジックやバリデーション処理など、バグが入りやすい部分は優先的にテストを追加します。  
  *例：create_todo() が0% → POST /todos の正常系・異常系テストを追加*
- **複雑度の高い関数 → まずは分割（リファクタ）**  
  複雑度が高い関数は読みづらく、バグが入りやすい上にテストもしづらい傾向があります。  
  責務を分割したり、共通処理をメソッド化することで可読性が向上し、結果的にテストもしやすくなります。  
  *例：create_todo() に状態管理・バリデーション・登録処理が混在 → 役割ごとに関数分離*
- **命名揺れ → コード規約をAIに学習させて揃える**  
  命名規約のばらつきは理解コストを上げ、レビュー時間を増大させます。  
  Q Developer に命名規約（例：snake_case / camelCase、略語ルール）を伝えておけば、一貫性のない命名を自動で指摘させることも可能です。  
  また、プロジェクトに合わせて命名変更案をAIが自動生成してくれます。
- **変更影響深度が高い箇所 → 設計見直しを検討**  
  「この関数を変えると他の10ファイルが壊れる」という状態は、保守性の低さを表します。  
  依存関係の整理、責務分離、アーキテクチャ層の明確化などを検討し、影響範囲を意図的に小さくしていきます。  

また、メトリクスは改善結果を“数字で説明できる”ため、「なぜその改善が必要なのか？」をチームに説明しやすくなります。  
定量化により、改善ポイントが明確になり、チーム内での合意形成が容易になります。

このように、どれだけのコードがカバーできているのかを「定量的」に見極めながら、品質を維持しつつ機能を拡張・検証していくことが可能になります。

---

## 4. メトリクス駆動のハイブリッドレビュー運用モデル

AI と人間、それぞれの強みを活かしつつ、**定量的メトリクスを軸に品質保証サイクルを回すための運用モデル**です。  
従来のレビューでは人の経験や勘に依存していましたが、メトリクスを導入することで「観点の統一」「効果測定」「改善の優先順位付け」が可能になり、AI との組み合わせによって品質保証を持続的に行えるようになります。

AI レビューは網羅性と速度に優れ、一方でメトリクスは改善の指針として機能します。  
最終判断は人間が行い、**AI × メトリクス × 人間の判断**によって再現性と持続性のある品質保証が成立します。

---

## まとめ

今回の最大の成果は、**メトリクスによって品質を“定量的に”評価できるようになったこと**です。  
これにより、これまで感覚的・属人的だったレビュー活動が、数字を用いた客観的な改善サイクルへと進化しました。

特に以下の点が大きな前進です：
- 静的解析スコア、カバレッジ、複雑度、命名一貫率といった指標により、レビューの“抜け漏れ”が可視化された
- 数値をもとに「どこを優先して直すべきか」が判断できるようになり、改善活動の効率が向上した
- AIによるレビュー提案と人間の判断を組み合わせることで、品質改善プロセスを継続的に回せる基盤ができた

これらにより、レビュー精度のばらつきが減り、**品質改善のPDCAがデータに基づいて回る状態**へと近づきました。

皆さまの生成AI活用の参考になれば幸いです。

---

<style>
img {
  border: 1px gray solid;
}
</style>
