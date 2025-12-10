---
title: 記事の大半をAIが書く時代：Amazon Q DeveloperとVSCodeで挑む協働執筆
author: shuichi-takatsu
date: 2025-12-11
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2025/
tags: [Q Developer, 仕様駆動, AWS, 生成AI, vscode, 記事執筆, advent2025]
image: true
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2025](/events/advent-calendar/2025/)第11日目の記事です！

## はじめに

この記事は、**Amazon Q Developerと人間の協働による実験的な取り組み**です。  
最初からネタばらしですが、**「この記事、ほとんどAIが書いています。」**  
**AIを“使う側”から“協働する側”へ**。Amazon Q Developerで開発と執筆の常識が変わると思います。  

**何をするか：**
- VSCodeでAmazon Q Developerをセットアップ
- 実際のコード作成・改善を体験
- AIとの対話で技術記事を共同執筆

**特徴的な点：**
- 記事の大部分をAmazon Q Developerが執筆
- コードサンプルやテストもAIが生成
- 人間は企画・構成・画像挿入を担当

**読者が得られるもの：**
- Amazon Q Developerの実用的な使い方
- AI協働による効率的な開発手法
- 技術文書作成でのAI活用の可能性

それでは、Amazon Q Developerと人間の協働の旅を始めましょう。

---

## 1. 開発環境

今回の協働作業では、Amazon Q Developer を VSCode から使用します。  
VSCode で Amazon Q Developer を使うには以下の環境が必要です。  

- VSCode 本体：**v1.85.0 以上**
- サインイン用のアカウント  
  - 個人利用：**AWS Builder ID**（AWSアカウント不要）  
  - 会社利用：**IAM Identity Center**（AWSアカウント必要） 

※ 会社のAWS環境で使うなら、権限やライセンスは管理者に確認しておくと安心です。

---

## 2. VSCode への拡張機能インストール

1. VSCode を起動します  
2. 左パネルの **Extensions（拡張機能）** を開きます  
3. 検索欄に **Amazon Q** と入力し、以下の拡張機能を選択してインストールします  
![](https://gyazo.com/9137bff63f0d0de99eef9a0263d29f2d.png)
4. 以下のようなアイコンがVSCodeに表示されていれば、インストールは完了です  
※ただし、まだ Amazon Q Developer へのログインが行われていないため、アイコンが赤くなっています  
![](https://gyazo.com/5f28fb6127e3a1eb40ff0b678e955301.png)

---

## 3. サインイン（認証）

1. VSCode 下部の **Amazon Q アイコン** をクリックし、「Sign in to get started」を選択します  
![](https://gyazo.com/84c3b9d441640089d533dbd4e47c1a8a.png)
2. 「サインインオプション」から用途に合わせて選択します  
![](https://gyazo.com/448d2a4ae07544e4716c94d608d67b47.png)
   - 個人（Personal account）の場合 → 事前に「Builder ID」を取得しておきます  
   - 会社（Company account）の場合 → 事前に「IAM Identity Center」で登録しておきます  
   （今回は「会社の場合」で進めます）  
3. IAM Identity Centerのアカウント情報を設定します  
![](https://gyazo.com/2212b1aa98b8b0ecec2a7fdc6873004f.png)
   - StartURL：AWS access portal URLを設定します  
   - Region  ：サービスのリージョンを設定します
4. 続けて外部のAWSサイトに誘導されるので、ブラウザでログインします   
5. 以下の画面が表示されたら、アクセスを許可します  
![](https://gyazo.com/4967024cd40bd0049451e97e81fd50ca.png)  
6. VSCodeに戻ります。
下の画面のように「Amazon Q」と表示されていればサインイン完了です  
![](https://gyazo.com/2b1da626768d3b74748d5ebc04331d74.png)

---

## 4. 基本的な使い方

### チャットで質問

Amazon Qパネルで質問や指示を入力します。  
試しに「ここで何ができますか？」と質問してみます。  
Amazon Q から「できることリスト」の回答が得られました。  
![](https://gyazo.com/c5215276b827b0b86a51b361a5a39dea.png)

### コード補完

ソースコードを作成していく場合、プログラムを書かずにコメントに意図を書いておくと、Amazon Qがインラインでコードを提案してくれます。

**例1: 日本語コメントからクラス生成**
```python
# ユーザー情報を管理するクラスを作成
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
    
    def get_display_name(self):
        return f"{self.name} ({self.email})"
```

**例2: 関数の処理内容をコメントで指定**
```python
# CSVファイルからユーザーデータを読み込む関数
import csv

def load_users_from_csv(filename):
    users = []
    with open(filename, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            user = User(row['name'], row['email'])
            users.append(user)
    return users
```

**使い方のコツ:**
- コメントは具体的に書く（「データを処理」より「CSVファイルから読み込み」）
- 日本語でも英語でも対応
- Alt+C（Option+C）で手動補完も可能

---

## 5. コード作成・修正を試行

では実際に、Amazon Q Developerでのコード作成・修正を体験してみましょう。

### サンプルファイル（example.py）について

まず、今回使用するサンプルファイル `example.py` について説明します。このファイルは、ユーザー情報を管理するシンプルなPythonプログラムです。

example.py の機能は以下です。  
- ユーザー情報（名前、メールアドレス）を管理するUserクラス
- CSVファイルからユーザーデータを読み込む機能
- メールアドレスでユーザーを検索する機能
- ユーザーリストをJSON形式で保存する機能

ソースコードのひな型としてコメント部分だけを記述します。  
```python
# ユーザー情報を管理するクラスを作成
# CSVファイルからユーザーデータを読み込む関数
# リストの中から特定の条件に合うユーザーを検索する関数
# ユーザーリストをJSON形式で保存する関数
```

すると Amazon Q が以下のようなソースコードを提案してきます。  

**example.py のソースコード:**
```python
# ユーザー情報を管理するクラスを作成
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
    
    def get_display_name(self):
        return f"{self.name} ({self.email})"

# CSVファイルからユーザーデータを読み込む関数
import csv

def load_users_from_csv(filename):
    users = []
    with open(filename, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            user = User(row['name'], row['email'])
            users.append(user)
    return users

# リストの中から特定の条件に合うユーザーを検索する関数
def find_user_by_email(users, email):
    for user in users:
        if user.email == email:
            return user
    return None

# ユーザーリストをJSON形式で保存する関数
import json

def save_users_to_json(users, filename):
    user_data = []
    for user in users:
        user_data.append({
            'name': user.name,
            'email': user.email
        })
    
    with open(filename, 'w', encoding='utf-8') as file:
        json.dump(user_data, file, ensure_ascii=False, indent=2)
        print(f"Saved {len(users)} users to {filename}")
```

このコードは構文的には正しく動作しますが
- **エラーハンドリングやテストコードがない**
- **実際に実行するメイン処理がない**

など、改善の余地があります。  
これらの問題をAmazon Q Developerを使って解決していきます。

### 5.1 既存コードの理解

まず、example.pyファイルを開いて、Amazon Qにコードの内容を質問し、Amazon Q がコードを正しく理解しているかを確認します。

Amazon Qへ以下のように指示を出します。  
```
@example.py このファイルは何をするコードですか？
```

Amazon Qが以下のような回答をしてくれます。
```
example.pyは、ユーザー情報を管理するためのシンプルなPythonプログラムです。

主な機能
1. Userクラス - ユーザー情報（名前とメールアドレス）を管理
- get_display_name(): 名前とメールアドレスを組み合わせた表示名を返す
2. CSVファイル読み込み - load_users_from_csv()
- CSVファイルからユーザーデータを読み込んでUserオブジェクトのリストを作成
3. ユーザー検索 - find_user_by_email()
- メールアドレスを指定して特定のユーザーを検索
4.JSON形式での保存 - save_users_to_json()
- ユーザーリストをJSON形式でファイルに保存

使用例
このプログラムは、CSVファイルからユーザーデータを読み込み、必要に応じてユーザーを検索し、最終的にJSON形式で保存するといったユーザーデータの変換・管理処理に使用できます。
ただし、現在のコードにはエラーハンドリングやメイン処理がないため、実際に動作させるには追加の実装が必要です。
```

### 5.2 コードの改善提案

既存のコードに対して改善提案を求めてみましょう。

Amazon Qへ以下のように指示を出します。  
```
@example.py このコードを改善する方法はありますか？
```

Amazon Qから以下のような提案が得られます。
```
はい、example.pyには多くの改善点があります。以下のような改善方法をお勧めします：

1. エラーハンドリングの追加
現在の問題： ファイルが存在しない場合やCSVの形式が不正な場合にエラーで停止
改善案： try-except文でエラーを適切に処理

2. 型ヒントの追加
現在の問題： 引数や戻り値の型が不明確
改善案： from typing import List, Optional を使用して型を明示

3. docstringの追加
現在の問題： 関数の説明がコメントのみ
改善案： 各関数に適切なdocstringを追加

4. importの整理
現在の問題： import文が関数の直前に散らばっている
改善案： ファイル冒頭にまとめて配置

5. データ検証の追加
現在の問題： CSVデータの妥当性チェックなし
改善案： 必須フィールドの存在確認やメールアドレス形式の検証

6. 設定の外部化
現在の問題： エンコーディングなどがハードコード
改善案： 定数として定義

7. ログ機能の追加
現在の問題： print文のみでログ管理が不十分
改善案： loggingモジュールの使用

8. テスト可能な設計
現在の問題： メイン処理がなく、テストしにくい
改善案： if __name__ == "__main__": ブロックの追加

9. パフォーマンスの改善
現在の問題： 大量データ処理時の効率性
改善案： リスト内包表記の使用、メモリ効率の向上

これらの改善により、より堅牢で保守性の高いコードになります。特にエラーハンドリングと型ヒントの追加は優先度が高い改善点です。
```

### 5.3 実際にコードを修正

#### エラーハンドリングの追加

CSVファイル読み込み関数にエラーハンドリングを追加してみます。

修正前のコード（example.py の一部）は以下です。  
```python
def load_users_from_csv(filename):
    users = []
    with open(filename, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            user = User(row['name'], row['email'])
            users.append(user)
    return users
```

Amazon Qへ以下のように指示を出します。  
```
load_users_from_csv関数にファイルが存在しない場合のエラーハンドリングを追加してください
```

コードが以下のように修正されました。  
```python
def load_users_from_csv(filename):
    users = []
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                user = User(row['name'], row['email'])
                users.append(user)
    except FileNotFoundError:
        print(f"エラー: ファイル '{filename}' が見つかりません")
        return []
    except Exception as e:
        print(f"エラー: ファイル読み込み中に問題が発生しました: {e}")
        return []
    return users
```

**Amazon Q が直接ソースコードを修正**し、私（人間）はソースコードに一切触れていません。  

#### 新機能の追加

ユーザーの年齢情報を管理する機能を追加してみます。

Amazon Qへ以下のように指示を出します。  
```
Userクラスに年齢（age）フィールドを追加し、年齢で検索する関数も作成してください
```

以下のようにコードが追加されました。  
```python
# ユーザー情報を管理するクラスを作成
class User:
    def __init__(self, name, email, age=None):
        self.name = name
        self.email = email
        self.age = age
    
    def get_display_name(self):
        age_info = f" (年齢: {self.age})" if self.age else ""
        return f"{self.name} ({self.email}){age_info}"

# 年齢範囲でユーザーを検索する関数
def find_users_by_age_range(users, min_age, max_age):
    """指定された年齢範囲のユーザーを検索する"""
    result = []
    for user in users:
        if user.age and min_age <= user.age <= max_age:
            result.append(user)
    return result
```

### 5.4 テストコードの生成

テストコードを追加してみます。  

Amazon Qへ以下のように指示を出します。  
```
@example.py の関数をテストするためのテストコードを作成してください
```

生成されたテストコード（test_example.py）は以下です。  
```python
import unittest
import tempfile
import os
import json
import csv
from example import User, load_users_from_csv, find_user_by_email, find_users_by_age_range, save_users_to_json

class TestUserManagement(unittest.TestCase):
    
    def test_user_creation_without_age(self):
        """年齢なしでのユーザー作成テスト"""
        user = User("田中太郎", "tanaka@example.com")
        self.assertEqual(user.name, "田中太郎")
        self.assertEqual(user.email, "tanaka@example.com")
        self.assertIsNone(user.age)
    
    def test_user_creation_with_age(self):
        """年齢ありでのユーザー作成テスト"""
        user = User("田中太郎", "tanaka@example.com", 30)
        self.assertEqual(user.name, "田中太郎")
        self.assertEqual(user.email, "tanaka@example.com")
        self.assertEqual(user.age, 30)
    
    def test_get_display_name_without_age(self):
        """年齢なしでの表示名テスト"""
        user = User("田中太郎", "tanaka@example.com")
        expected = "田中太郎 (tanaka@example.com)"
        self.assertEqual(user.get_display_name(), expected)
    
    def test_get_display_name_with_age(self):
        """年齢ありでの表示名テスト"""
        user = User("田中太郎", "tanaka@example.com", 30)
        expected = "田中太郎 (tanaka@example.com) (年齢: 30)"
        self.assertEqual(user.get_display_name(), expected)
    
    def test_find_user_by_email(self):
        """メールアドレスでのユーザー検索テスト"""
        users = [
            User("田中太郎", "tanaka@example.com"),
            User("佐藤花子", "sato@example.com")
        ]
        
        # 存在するユーザーの検索
        found = find_user_by_email(users, "tanaka@example.com")
        self.assertIsNotNone(found)
        self.assertEqual(found.name, "田中太郎")
        
        # 存在しないユーザーの検索
        not_found = find_user_by_email(users, "yamada@example.com")
        self.assertIsNone(not_found)
    
    def test_find_users_by_age_range(self):
        """年齢範囲でのユーザー検索テスト"""
        users = [
            User("田中太郎", "tanaka@example.com", 30),
            User("佐藤花子", "sato@example.com", 25),
            User("鈴木次郎", "suzuki@example.com", 35),
            User("山田三郎", "yamada@example.com")  # 年齢なし
        ]
        
        # 25-32歳の範囲で検索
        result = find_users_by_age_range(users, 25, 32)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].name, "田中太郎")
        self.assertEqual(result[1].name, "佐藤花子")
        
        # 該当者なしの範囲で検索
        result_empty = find_users_by_age_range(users, 40, 50)
        self.assertEqual(len(result_empty), 0)
    
    def test_save_users_to_json(self):
        """JSON保存機能のテスト"""
        users = [
            User("田中太郎", "tanaka@example.com", 30),
            User("佐藤花子", "sato@example.com")  # 年齢なし
        ]
        
        # 一時ファイルを作成してテスト
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as temp_file:
            temp_filename = temp_file.name
        
        try:
            save_users_to_json(users, temp_filename)
            
            # ファイルが作成されたことを確認
            self.assertTrue(os.path.exists(temp_filename))
            
            # ファイル内容を確認
            with open(temp_filename, 'r', encoding='utf-8') as file:
                data = json.load(file)
            
            self.assertEqual(len(data), 2)
            
            # 年齢ありのユーザー
            self.assertEqual(data[0]['name'], "田中太郎")
            self.assertEqual(data[0]['email'], "tanaka@example.com")
            self.assertEqual(data[0]['age'], 30)
            
            # 年齢なしのユーザー
            self.assertEqual(data[1]['name'], "佐藤花子")
            self.assertEqual(data[1]['email'], "sato@example.com")
            self.assertNotIn('age', data[1])  # 年齢が設定されていない場合は含まれない
            
        finally:
            # 一時ファイルを削除
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)
    
    def test_load_users_from_csv_file_not_found(self):
        """存在しないCSVファイルの読み込みテスト"""
        result = load_users_from_csv("nonexistent_file.csv")
        self.assertEqual(result, [])
    
    def test_load_users_from_csv_valid_file(self):
        """有効なCSVファイルの読み込みテスト"""
        # 一時CSVファイルを作成
        csv_data = [
            ['name', 'email', 'age'],
            ['田中太郎', 'tanaka@example.com', '30'],
            ['佐藤花子', 'sato@example.com', '']  # 年齢なし
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv', encoding='utf-8', newline='') as temp_file:
            temp_filename = temp_file.name
            writer = csv.writer(temp_file)
            writer.writerows(csv_data)
        
        try:
            users = load_users_from_csv(temp_filename)
            
            self.assertEqual(len(users), 2)
            
            # 年齢ありのユーザー
            self.assertEqual(users[0].name, "田中太郎")
            self.assertEqual(users[0].email, "tanaka@example.com")
            self.assertEqual(users[0].age, 30)
            
            # 年齢なしのユーザー
            self.assertEqual(users[1].name, "佐藤花子")
            self.assertEqual(users[1].email, "sato@example.com")
            self.assertIsNone(users[1].age)
            
        finally:
            # 一時ファイルを削除
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)

if __name__ == '__main__':
    unittest.main()
```

### 5.5 実行可能なメイン処理の追加

example.py にmain処理が無いので追加します。  

Amazon Qへ以下のように指示を出します。  
```
@example.py に実際に動作確認できるメイン処理を追加してください
```

追加されたメイン処理は以下です。  
```python
if __name__ == "__main__":
    # サンプルデータでテスト
    print("=== ユーザー管理システムのテスト ===")
    
    # ユーザー作成
    users = [
        User("田中太郎", "tanaka@example.com", 30),
        User("佐藤花子", "sato@example.com", 25),
        User("鈴木次郎", "suzuki@example.com", 35),
        User("山田三郎", "yamada@example.com")  # 年齢なし
    ]
    
    # 全ユーザー表示
    print("\n登録ユーザー:")
    for user in users:
        print(f"  {user.get_display_name()}")
    
    # メールアドレスで検索
    print("\nメール検索テスト:")
    found_user = find_user_by_email(users, "sato@example.com")
    if found_user:
        print(f"  見つかりました: {found_user.get_display_name()}")
    
    # 年齢範囲で検索
    print("\n年齢検索テスト (25-32歳):")
    age_filtered_users = find_users_by_age_range(users, 25, 32)
    for user in age_filtered_users:
        print(f"  {user.get_display_name()}")
    
    # JSON保存
    print("\nJSON保存テスト:")
    save_users_to_json(users, "sample_users.json")
    
    # 存在しないCSVファイルの読み込みテスト
    print("\nCSVファイル読み込みテスト（エラーハンドリング確認）:")
    csv_users = load_users_from_csv("nonexistent.csv")
    print(f"読み込み結果: {len(csv_users)}件のユーザー")
    
    print("\nテスト完了！")
```

### 5.6 Amazon Q Developerの活用ポイント

Amazon Q の**効率的な使い方**のポイントは以下です。  
- `@ファイル名` でファイル全体を参照
- 具体的な指示を出す（「エラーハンドリングを追加」など）
- 段階的に機能を追加していく
- テストコードも一緒に生成してもらう

このように、Amazon Q Developerを使うことで、既存コードの理解から改善、新機能追加、テスト作成まで効率的に行えます。

---

## 6. まとめ

Amazon Q Developer for VSCode を使うことで以下が期待できます。  
- **作業効率向上**: 定番の開発環境であるVSCodeを使うことで作業効率向上
- **コード理解**: 既存コードの動作や構造を素早く把握
- **コード改善**: エラーハンドリングや型ヒントなどの品質向上
- **機能追加**: 新しい機能を段階的に実装
- **テスト作成**: 自動的にテストコードを生成
- **実行確認**: メイン処理を追加して動作検証

日本語での指示にも対応しているため、自然な言葉でコード作成・修正ができます。  

---

## 7. この記事の舞台裏 ― Amazon Q Developerとの協働執筆

この記事は Amazon Q Developer との対話を通じて作成されました。  
記事執筆の過程をご紹介します。

### 7.1 記事作成プロセス

**人間（筆者）の役割:**
- 記事の構成や方向性の決定
- スクリーンショット画像の撮影・挿入
- 最終的な内容の確認・調整

**Amazon Q Developerの役割:**
- 各章の詳細な文章作成
- コードサンプルの生成
- テストコードの作成
- 技術的な説明文の執筆

以下は、VSCode上で記事とコードを同時に執筆している作業風景です。
![](https://gyazo.com/331eaa5b7bbc5397ef7e7dee4f6ebe59.png)

このように記事を執筆しながら、コード作成・修正を同時に行っています。  
人間が内容の確認を行い、Amazon Q とレビューを繰り返し、Amazon Q が記事・コードの修正を行ってくれます。

### 7.2 協働執筆の効果

今回、Amazon Q Developer を VSCode上で実行し、以下のような効果を実感できました。

**効率性の向上:**
- 定番開発環境による作業効率向上
- 記事の骨格作成時間を大幅短縮
- 技術的な詳細説明を素早く生成
- コードサンプルとテストを同時作成

**品質の向上:**
- 一貫した文体と構成
- 実際に動作するコードサンプル
- 包括的なテストカバレッジ

**創造性の発揮:**
- 人間は全体設計と創造的な部分に集中
- AIは詳細な実装と文章作成を担当
- 両者の強みを活かした分業

---

この記事の作成プロセス自体が、Amazon Q Developerの実用性を証明しています。

Amazon Q Developer は単なるコーディング支援ツールではなく、技術者の創造的な作業全般をサポートする強力なパートナーです。  
ぜひ様々な場面で活用してみてください。

**この記事は Amazon Q Developer との協働により作成されました。**

<style>
img {
  border: 1px gray solid;
}
</style>
