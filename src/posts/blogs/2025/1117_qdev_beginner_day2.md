---
title: AIと始めるAWS開発 ― Q Developerで体験する仕様駆動テスト
author: shuichi-takatsu
date: 2025-11-17
tags: [Q Developer, 仕様駆動, AWS, 生成AI]
image: true
---

## はじめに

[前回](/blogs/2025/11/12/qdev_beginner_day1/)は、Q Developerを使って簡単なアプリケーションをインタラクティブモードで作成しました。  
今回の記事では、Q Developerをさらに一歩掘り下げ、**仕様 → 実装 → テスト生成 → 修正** の一連の工程を通じて、AIがどのようにソフトウェア開発を支援するのかを確認します。
とくに焦点を当てるのは、**テスト可能な仕様（バリデーション）** の考え方です。
AIが生成するテストがどこまで自動化できるのか、そして人間の開発者がどの段階で介入し、品質を保証すべきなのかを、実際のプロセスを通して検証していきます。

この記事を読むことで、次のような理解が得られるでしょう。
- Q Developerが仕様からテストまで自動化できる範囲
- AIによる自動テスト生成の利点と限界
- テスト可能な仕様を設計する際の実務的なポイント
- 人が介在すべき判断ポイントと品質保証の勘どころ

使用するQ Developerのバージョンは 「`1.13.0`」 を想定しています。
それでは、AIが関わるテスト自動化を具体的に見ていきましょう。

---

## 1. シンプルなToDoアプリを作る

### 1.1 Q Developer を対話モードで起動

作業ディレクトリを作成し、`q`を起動します。

```bash
mkdir todo-fastapi && cd todo-fastapi
q
```

起動後のプロンプトに、以下のメッセージを貼り付けます。

指示：
```
FastAPIを使ってシンプルなToDoアプリケーション (登録・一覧・削除 API) を作成するためのPythonスクリプトを生成してください。
ファイル名は main.py と test_api.py です。
DBはメモリ、Pydanticでバリデーションを行い、
priorityは low/medium/high、
due_date は未来日チェックを含めてください。
```

応答：
```
🛠️  Using tool: fs_write
 ⋮
 ● Path: /home/ubuntu/todo-fastapi/main.py

+     1: from fastapi import FastAPI, HTTPException
+     2: from pydantic import BaseModel, validator
+     3: from typing import List, Optional
+     4: from datetime import datetime
+     5: from enum import Enum
+     6:
+     7: app = FastAPI()
+     8:
+     9: # In-memory database
+    10: todos = []

～～～（中略）～～～

+    57: @app.delete("/todos/{todo_id}")
+    58: def delete_todo(todo_id: int):
+    59:     for i, todo in enumerate(todos):
+    60:         if todo.id == todo_id:
+    61:             del todos[i]
+    62:             return {"message": "Todo deleted successfully"}
+    63:     raise HTTPException(status_code=404, detail="Todo not found")
+    64:
+    65: if __name__ == "__main__":
+    66:     import uvicorn
+    67:     uvicorn.run(app, host="0.0.0.0", port=8000)

 ⋮
 ↳ Purpose: Create FastAPI ToDo application with registration, listing, and deletion APIs

Allow this action? Use 't' to trust (always allow) this tool for the session. [y/n/t]:

> t

Creating: /home/ubuntu/todo-fastapi/main.py

 ⋮
 ● Completed in 0.0s

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: /home/ubuntu/todo-fastapi/test_api.py

+     1: import requests
+     2: import json
+     3: from datetime import datetime, timedelta
+     4:
+     5: BASE_URL = "http://localhost:8000"
+     6:
+     7: def test_create_todo():
+     8:     todo_data = {
+     9:         "title": "Test Todo",
+    10:         "description": "Test description",

～～～（中略）～～～

+    50:
+    51:     # Test invalid due date
+    52:     test_invalid_due_date()
+    53:     print()
+    54:
+    55:     # Test deleting a todo
+    56:     test_delete_todo(todo_id)
+    57:     print()
+    58:
+    59:     # Verify deletion
+    60:     test_get_todos()

 ⋮
 ↳ Purpose: Create test file for the FastAPI ToDo application
Creating: /home/ubuntu/todo-fastapi/test_api.py

 ⋮
 ● Completed in 0.0s

> FastAPIを使ったシンプルなToDoアプリケーションを作成しました。

main.py の主な機能:
• POST /todos: ToDo登録 (タイトル、説明、優先度、期限日)
• GET /todos: ToDo一覧取得
• DELETE /todos/{todo_id}: ToDo削除
• Pydanticでバリデーション (優先度: low/medium/high、期限日: 未来日チェック)
• メモリ内データベース

test_api.py でAPIテストが可能です。

アプリケーションを起動するには:
bash
python main.py

テストを実行するには (別ターミナルで):
bash
python test_api.py
```

指示通りにPythonファイル `main.py` と `test_api.py` が作成されました。

### 1.2 生成コードの確認と適用

結果を確認します。  
Q を起動しているフォルダ（作業ディレクトリ）上に `main.py` と `test_api.py` が保存されています。  
![](https://gyazo.com/ae4685ad5dcb966fc4cdbeab9b425301.png)

※もし Q Developer が「ツール実行（ファイル作成）」を提案した場合は、`yes` で許可します。

依存ライブラリをインストールします。  
これも Q Developer に実施してもらいます。  

指示：
```
アプリケーションを動かすのに必要なPythonライブラリをインストールしてください
```

応答：
```
🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command: python main.py
 ⋮
 ↳ Purpose: Start the FastAPI ToDo application

Traceback (most recent call last):
  File "/home/ubuntu/todo-fastapi/main.py", line 1, in <module>
    from fastapi import FastAPI, HTTPException
ModuleNotFoundError: No module named 'fastapi'

 ⋮
 ● Completed in 0.11s

> FastAPIがインストールされていないようです。インストールします:

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
pip install fastapi uvicorn requests
 ⋮
 ↳ Purpose: Install FastAPI and required dependencies

～～～（中略）～～～

Using cached uvicorn-0.38.0-py3-none-any.whl (68 kB)
Downloading typing_extensions-4.15.0-py3-none-any.whl (44 kB)
Downloading typing_inspection-0.4.2-py3-none-any.whl (14 kB)
Installing collected packages: uvicorn, typing-extensions, typing-inspection, pydantic-core, pydantic, fastapi
  Attempting uninstall: typing-extensions
    Found existing installation: typing_extensions 4.13.2
    Uninstalling typing_extensions-4.13.2:
      Successfully uninstalled typing_extensions-4.13.2
  Attempting uninstall: typing-inspection
    Found existing installation: typing-inspection 0.4.0
    Uninstalling typing-inspection-0.4.0:
      Successfully uninstalled typing-inspection-0.4.0
  Attempting uninstall: pydantic-core
    Found existing installation: pydantic_core 2.33.2
    Uninstalling pydantic_core-2.33.2:
      Successfully uninstalled pydantic_core-2.33.2

Successfully installed fastapi-0.121.1 pydantic-2.12.4 pydantic-core-2.41.5 typing-extensions-4.15.0 typing-inspection-0.4.2 uvicorn-0.38.0

[notice] A new release of pip is available: 25.1.1 -> 25.3
[notice] To update, run: pip install --upgrade pip

 ⋮
 ● Completed in 7.388s

> ライブラリのインストールが完了しました。アプリケーションを起動できます:

bash
python main.py
```

動作確認を行います。  
アプリケーションを別コンソールから実行します。

```bash
python main.py
```

ブラウザまたは `curl` で次を確認します。

```bash
curl http://127.0.0.1:8000/todos
```

まだデータは空なので結果として「`[]`」（空データ）が出力されるはずです。
1章では「AIに自然言語で仕様を伝え、コードを自動生成させる」までを実施しました。  
次に**コードを前提に、仕様を改めて明文化し、テストで検証できるように**します。  

## 2. バリデーション強化 ― テスト可能な仕様にする

次の2つの仕様を改めて明文化します。

- `due_date` は「未来日」でなければならない
- `priority` は `low`, `medium`, `high` のいずれかである

AIに対しては、以下のように日本語で伝えます。

指示：
```
Taskモデルにバリデーションを追加してください。due_dateは未来日でなければならず、priorityはlow・medium・highのいずれかのみ許可してください。
```

応答：
```
> 既存のコードにはバリデーションが実装されていますが、より明確にするために確認・改善します:

🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/todo-fastapi/main.py, from line 10 to 30
 ✓ Successfully read 469 bytes from /home/ubuntu/todo-fastapi/main.py

 ⋮
 ● Completed in 0.0s

～～～（中略）～～～

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
pkill -f "python main.py"
 ⋮
 ↳ Purpose: Stop the background FastAPI process

 ⋮
 ● Completed in 0.48s

> バリデーションは既に正しく実装されており、動作しています:

1. priority: Priority Enumにより low、medium、high のみ許可
2. due_date: 過去日を指定すると422エラーで「due_date must be in the future」メッセージが返される

テスト結果で確認できるように:
• 有効なデータ: 正常に作成 (200)
• 無効な過去日: バリデーションエラー (422)

現在のコードで要求されたバリデーションは完全に実装されています。
```

このように、コードを前提に、仕様を改めて明文化し、テストで検証できるようになりました。

---

これまで1章、2章で実施した内容をまとめると以下のようになります。
| 章  | フェーズ | 意図                        | 役割           |
| -- | ---- | ------------------------- | ------------ |
| 1章 | 実装生成 | AIに自然言語で仕様を伝え、コードを自動生成させる | 「生成の正確さ」を観察  |
| 2章 | 仕様検証 | コードを前提に、仕様を改めて明文化・テストで検証  | 「仕様のテスト化」を学ぶ |

---

## 3. サーバ実行とテスト

では、実際にアプリケーションを動かして、テストを実施してみましょう。  
（テストの内容については、この後の章で説明します）

アプリケーションをローカルで実行します

```bash
python main.py
```

次にテストを実行します。

```bash
python test_api.py
```

実行結果は以下のようになりました。

```bash
Testing FastAPI Todo App
==============================
Create Todo: 200
{
  "id": 1,
  "title": "Test Todo",
  "description": "Test description",
  "priority": "high",
  "due_date": "2025-11-10T22:59:37.092516",
  "created_at": "2025-11-09T22:59:37.099295"
}

Get Todos: 200
[
  {
    "id": 1,
    "title": "Test Todo",
    "description": "Test description",
    "priority": "high",
    "due_date": "2025-11-10T22:59:37.092516",
    "created_at": "2025-11-09T22:59:37.099295"
  }
]

Invalid Due Date: 422
{
  "detail": [
    {
      "type": "value_error",
      "loc": [
        "body",
        "due_date"
      ],
      "msg": "Value error, due_date must be in the future",
      "input": "2025-11-08T22:59:37.104030",
      "ctx": {
        "error": {}
      }
    }
  ]
}

Delete Todo: 200
{
  "message": "Todo deleted successfully"
}

Get Todos: 200
[]
```

テストの戻り値「`200`」「`422`」が確認できていることがわかります。

---

## 4. AI生成テストを読み解く

AIは仕様文からテストを推論します。
今回作成されたテストケースは以下の通りです。

```python
def test_create_todo():
    todo_data = {
        "title": "Test Todo",
        "description": "Test description",
        "priority": "high",
        "due_date": (datetime.now() + timedelta(days=1)).isoformat()
    }
    response = requests.post(f"{BASE_URL}/todos", json=todo_data)
    print(f"Create Todo: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()["id"]

def test_get_todos():
    response = requests.get(f"{BASE_URL}/todos")
    print(f"Get Todos: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

def test_delete_todo(todo_id):
    response = requests.delete(f"{BASE_URL}/todos/{todo_id}")
    print(f"Delete Todo: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

def test_invalid_due_date():
    todo_data = {
        "title": "Invalid Todo",
        "priority": "low",
        "due_date": (datetime.now() - timedelta(days=1)).isoformat()
    }
    response = requests.post(f"{BASE_URL}/todos", json=todo_data)
    print(f"Invalid Due Date: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
```

これらのテストは基本的には正しく動作しますが、**AIが自動生成したものを鵜呑みにせず、人間の観点でレビューすることが極めて重要**です。  
AIの推論は仕様文から妥当なロジックを導き出しますが、**暗黙的な前提や境界条件**までは十分に理解していないことが多いためです。

以下の観点でレビューを行うと、テストの品質を一段高めることができます。

| 観点 | チェック内容 | 対応方針 |
|------|----------------|-----------|
| **仕様整合性** | 未来日境界（今日の日付は有効か？）、入力制約は明確か？ | 境界テストを追加する |
| **可読性** | テスト名が仕様を説明しているか、期待結果が明示されているか | 名前やprint内容を改善する |
| **網羅性** | `low`, `medium`, `high` の正常系が揃っているか、異常系が網羅されているか | 不足分を追加生成させる |
| **独立性** | 各テストが他テストの結果に依存していないか | 前提データ作成・削除処理を分離する |
| **再現性** | 実行順序や時刻依存で結果が変わらないか | 固定日時やID管理の仕組みを導入 |

AIが生成するテストは、仕様記述をもとに **「最も一般的なケース」** を推論する傾向があります。  
そのため、
- 境界条件（当日や閾値など）
- エラー系（不正値、欠損値、異常なリクエスト）
- 並行動作や排他制御の確認

といった **“仕様の周縁部”** を十分に網羅できていないケースが多いです。

AIに「境界テストも追加して」と明示すれば生成されますが、重要なのは「何を境界とみなすか」を人が定義することです。  
AIは仕様書の文章を解析してロジックを作りますが、その仕様書自体が不完全であれば、テストも不完全なままになります。

---

## 5. テスト補完（人手で対応）

AIが生成したテストコードは、いわば **“骨格”** です。  
そこに**仕様の解釈・リスクベース思考・品質観点**を肉付けするのが人間の役割です。  
とくに、次の3点を意識すると品質が安定します。

1. **仕様理解の再確認**：AIが実装した内容と意図した仕様が一致しているか。  
2. **異常系の強化**：予期しない入力や外れ値をどう扱うかを明示する。  
3. **テスト設計の再利用性**：後続の機能追加でも使える汎用構造に整理する。  

FastAPIのToDoアプリが動作し、基本テストが通ったら、次は**不足しているテストケース（境界・異常系）** を補います。  
ここでは、AIの提案に頼るのではなく、人が意図をもってテストを追加する手順を示します。

テスト対象：
- `due_date` が「今日」→ 無効（未来日限定）
- `priority` に不正値 → 無効（`low` / `medium` / `high` のみ許可）
- 正常系3種（low, medium, high）を網羅

```python
def test_due_date_today_invalid():
    """今日の日付を指定した場合の検証（422想定）"""
    todo_data = {
        "title": "Today Todo",
        "priority": "low",
        "due_date": datetime.now().isoformat()
    }
    response = requests.post(f"{BASE_URL}/todos", json=todo_data)
    print(f"Due Date Today Invalid: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except Exception:
        print(response.text)

def test_priority_invalid_value():
    """priority に不正値を指定した場合の検証（422想定）"""
    todo_data = {
        "title": "Invalid Priority Todo",
        "priority": "urgent",  # 許可値: low/medium/high のみ
        "due_date": (datetime.now() + timedelta(days=1)).isoformat()
    }
    response = requests.post(f"{BASE_URL}/todos", json=todo_data)
    print(f"Invalid Priority: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except Exception:
        print(response.text)
```

## 6. テスト補完（AIに依頼）

5章では人手でテストケースを拡充しましたが、AIにテストケースの補完が可能かどうかを確認してみます。

指示：
```
テストケースが十分かどうかを確認してください
```

応答：
```
> 現在のテストケースを確認し、不足している部分を特定します:

🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/todo-fastapi/test_api.py, all lines
 ✓ Successfully read 1661 bytes from /home/ubuntu/todo-fastapi/test_api.py

 ⋮
 ● Completed in 0.0s

> 現在のテストケースは基本的な機能のみをカバーしています。不足しているテストケースを追加します:

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: test_api.py

  29, 29: def test_invalid_due_date():
  30, 30:     todo_data = {
  31, 31:         "title": "Invalid Todo",
  32, 32:         "priority": "low",
  33, 33:         "due_date": (datetime.now() - timedelta(days=1)).isoformat()

～～～（中略）～～～

+     107:     # Delete minimal todo if created
+     108:     if minimal_id:
+     109:         test_delete_todo(minimal_id)
+     110:         print()
+     111:
  91, 112:     # Verify deletion
  92, 113:     test_get_todos()

 ⋮
 ↳ Purpose: Update main test execution to include all test cases
Updating: test_api.py

 ⋮
 ● Completed in 0.0s

> 追加したテストケース:

バリデーションテスト:
• test_invalid_priority(): 無効な優先度 ("urgent") をテスト
• test_missing_title(): 必須フィールド (title) の欠如をテスト
• test_minimal_todo(): 最小限の必須フィールドのみでの作成をテスト

エラーハンドリングテスト:
• test_delete_nonexistent(): 存在しないToDo削除時の404エラーをテスト

テストカバレッジ:
• 正常系: 完全なToDo作成、最小限のToDo作成、一覧取得、削除
• 異常系: 過去日、無効な優先度、必須フィールド欠如、存在しないID削除

これで主要なバリデーションとエラーケースがカバーされます。
```

追加されたテストを実行してみましょう。

指示：
```
テストを実行してください
```

応答：
```
🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command: python main.py &
 ⋮
 ↳ Purpose: Start FastAPI application in background

 ⋮
 ● Completed in 0.3s

～～～（中略）～～～

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
pkill -f "python main.py"
 ⋮
 ↳ Purpose: Stop the background FastAPI process

 ⋮
 ● Completed in 0.15s

> テスト結果の分析:

✅ 正常系テスト:
• 完全なToDo作成: 200 OK
• 最小限のToDo作成: 200 OK (description, due_dateはnull)
• 一覧取得: 200 OK
• ToDo削除: 200 OK

✅ バリデーションテスト:
• 過去日指定: 422エラー "due_date must be in the future"
• 無効な優先度: 422エラー "Input should be 'low', 'medium' or 'high'"
• 必須フィールド欠如: 422エラー "Field required"

✅ エラーハンドリングテスト:
• 存在しないToDo削除: 404エラー "Todo not found"

すべてのテストケースが期待通りに動作しており、バリデーションとエラーハンドリングが正しく実装されています。テストカバレッ
ジは十分です。
```

このようにAIと対話を進めながら、テストケースを拡充していくこともできます。  
AIとペアでプログラミングできる日が来るとは、すごい時代になりました。

---

## まとめ

AIが提案するテストはあくまで「たたき台」です。  
人が仕様理解と品質観点でレビューし、採用・修正・削除の判断を行うことが重要です。

| 観点 | 採用すべき提案 | 却下すべき提案 |
|------|----------------|----------------|
| **仕様整合性** | 未来日・優先度の要件を正確に守る | 曖昧な条件を含む（例：今日を許可） |
| **可読性** | テスト名・変数名が直感的 | 意味不明な略語や複雑なロジック |
| **保守性** | 簡潔で再利用可能 | 重複コードや不要な依存関係を含む |
| **実行容易性** | `python test_api.py` で完結 | 外部サーバ起動が必要 |

これがQ Developerによる“品質管理の自動化”を成立させる鍵です。

皆さまの生成AI活用の参考になれば幸いです。

<style>
img {
    border: 1px gray solid;
}
</style>
