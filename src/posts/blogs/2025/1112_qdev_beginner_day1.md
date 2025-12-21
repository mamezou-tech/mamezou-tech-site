---
title: AIと始めるAWS開発 ― Q Developer入門
author: shuichi-takatsu
date: 2025-11-12
tags: [Q Developer, 仕様駆動, AWS, 生成AI]
image: true
---

## Q Developerとは

Q Developer は、AWSが提供する**生成AIによる開発支援ツール**です。  
ChatGPT や Copilot のように「コードを補完するAI」ではなく、**設計・実装・テスト・レビュー・ドキュメント化までを支援する開発プラットフォーム**として設計されています。

特徴を一言で言うと、**AWSの開発を、AIと一緒に進められる統合環境**です。

### 主な機能と特徴

| 項目 | 概要 |
|------|------|
| **自然言語での開発支援** | 「Lambda関数を作って」「DynamoDBと連携して」と自然言語で指示できる |
| **コード生成と補完** | Python, TypeScript, Javaなど主要言語をサポート |
| **テストコード自動生成** | 既存コードからテストを推論して自動生成 |
| **レビューと改善提案** | コード品質・例外処理・命名規約などをAIが自動レビュー |
| **AWS統合** | Lambda / API Gateway / DynamoDB / CDK などのAWSリソースを直接扱える |
| **VS Code統合** | 拡張機能からインラインでAIに指示・生成・修正が可能 |

### CLIとVS Codeの2つの使い方

Q Developerには2つの利用スタイルがあります。

| スタイル | 概要 | コマンド例 |
|-----------|------|------------|
| **CLI（コマンドライン）** | ターミナル上でAIに直接指示を出す | `$ q generate lambda --name hello-world` |
| **VS Code拡張** | エディタ内で自然言語プロンプトを入力し、コード生成・修正を行う | コマンドパレットで「Q Developer: Generate Code」 |

Pro版を利用していれば、CLIとVS Codeの両方からAWSサービスを直接操作できるようになります。

### “Q”の由来と目的

「Q」は **“Quality（品質）” と “Question（問い）”** の両方を意味します。  
このツールの思想は、「AIがコードを書く」のではなく、**開発者がAIと会話しながら品質を作り込む** という協働開発にあります。

したがって、Q Developerは単なる補助ツールではなく、**設計レビューから実装・改善までを一貫して支援する“AI開発パートナー”** です。

今回は主に Q CLI を使って簡単なアプリケーションを作っていきます。

## 1. Q Developer CLIの概要

**CLI（コマンドラインインターフェース）** では高度な操作が可能になります。  
CLIでは、ターミナル上でAIと対話（インタラクティブモード）できるだけでなく、以下のようなコマンドで自動処理や統合が行えます。

| 機能 | 説明 |
|------|------|
| **コード生成** | Lambda・API Gateway・CDK構成などをAIが生成 |
| **レビュー** | 既存コードの品質を分析し、改善案を提示 |
| **修正と再生成** | 問題箇所をAIが自動修正 |
| **テスト生成** | 単体テストコードを自動で生成・実行 |
| **ドキュメント化** | READMEや設計書を自動出力 |

### 動作確認例

以下が表示されれば、環境は正しく構成されています。  
コマンドラインですべて完結させることができますが、初回の試みということもあるので、**今後はすべて対話形式のインタラクティブモードで実行**します。

```bash
$ q --version
q 1.13.0

$ q help
# 利用可能なサブコマンド一覧を表示
# generate / review / test / fix / metrics / deploy など
```

---

## 2. Q CLIの起動とインタラクティブモード

以下のコマンド「`q`」を実行します。
```bashqq
$ q
```

以下のような画面が表示されます。

```

    ⢠⣶⣶⣦⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀        ⢀⣤⣶⣿⣿⣿⣶⣦⡀⠀
 ⠀⠀⠀⣾⡿⢻⣿⡆⠀⠀⠀⢀⣄⡄⢀⣠⣤⣤⡀⢀⣠⣤⣤⡀⠀⠀⣠⣤⣤⣤⣄⠀⠀⢀⣤⣤⣤⣤⣤⣤⡀⠀⠀⣀⣤⣤⣤⣀⠀⠀ ⠀⢠⣤⡀⣀⣤⣤⣄⡀⠀⠀⠀⠀⠀⠀⢠⣿⣿⠋⠀⠀⠀⠙⣿⣿⡆
 ⠀⠀⣼⣿⠇⠀⣿⣿⡄⠀⠀⢸⣿⣿⠛⠉⠻⣿⣿⠛⠉⠛⣿⣿⠀⠀⠛⠉⠉⠻⣿⣧⠀⠈⠛⠛⠛⣻⣿⡿⠀⢀⣾⣿⠛⠉⠻⣿⣷⡀⠀ ⢸⣿⡟⠛⠉⢻⣿⣷⠀⠀⠀⠀⠀⣼⣿⡏⠀⠀⠀⠀⠀ ⢸⣿⣿
 ⠀⢰⣿⣿⣤⣤⣼⣿⣷⠀⠀⢸⣿⣿⠀⠀⠀⣿⣿⠀⠀⠀⣿⣿⠀⠀⢀⣴⣶⣶⣶⣿⣿⠀⠀⠀⣠⣾⡿⠋⠀⠀⢸⣿⣿⠀⠀⠀ ⣿⣿⡇⠀⢸⣿⡇⠀⠀⢸⣿⣿⠀⠀⠀⠀⠀⠀⢹⣿⣇⠀⠀⠀⠀ ⠀⢸⣿⡿
 ⢀⣿⣿⠋⠉⠉⠉⢻⣿⣇⠀⢸⣿⣿⠀⠀⠀⣿⣿⠀⠀⠀⣿⣿⠀⠀⣿⣿⡀⠀⣠⣿⣿⠀⢀⣴⣿⣋⣀⣀⣀⡀⠘⣿⣿⣄⣀⣠⣿⣿⠃⠀⢸⣿⡇⠀⠀⢸⣿⣿⠀⠀⠀⠀⠀⠀⠈⢿⣿⣦⣀⣀⣀⣴⣿⡿⠃
 ⠚⠛⠋⠀⠀⠀⠀ ⠘⠛⠛⠀⠘⠛⠛⠀⠀⠀⠛⠛⠀⠀⠀⠛⠛⠀⠀⠙⠻⠿⠟⠋⠛⠛⠀⠘⠛⠛⠛⠛⠛⠛⠃⠀⠈⠛⠿⠿⠿⠛⠁⠀⠀⠘⠛⠃⠀ ⠘⠛⠛⠀⠀⠀⠀⠀⠀⠀⠀⠙⠛⠿⢿⣿⣿⣋⠀⠀
 ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀　　　　　⠈⠛⠿⢿⡧

╭─────────────────────────────── Did you know? ────────────────────────────────╮
│                                                                              │
│    If you want to file an issue to the Q CLI team, just tell me, or run q    │
│                                    issue                                     │
│                                                                              │
╰──────────────────────────────────────────────────────────────────────────────╯

/help all commands  •  ctrl + j new lines  •  ctrl + s fuzzy search
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 You are chatting with claude-4-sonnet
```

この状態が「**インタラクティブモード**」です。  
自然言語で直接話しかけて、AIと一緒に設計・実装を進めることができます。

### 対話例

以下の文章を入力します。
```
> DynamoDB にデータを保存する Lambda 関数を作成して
```
応答は次のようになりました。
```
> DynamoDBにデータを保存するLambda関数を作成します。


🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: /home/ubuntu/q/lambda_dynamodb_jp.py

+     1: import json
+     2: import boto3
+     3:
+     4: dynamodb = boto3.resource('dynamodb')
+     5: table = dynamodb.Table('your-table-name')
+     6:
+     7: def lambda_handler(event, context):
+     8:     try:
+     9:         # 入力データの検証
+    10:         if not event or not isinstance(event, dict):
+    11:             return {
+    12:                 'statusCode': 400,
+    13:                 'body': json.dumps('無効な入力: イベントは空でないオブジェクトである必要があります', ensure_ascii=False)
+    14:             }
+    15:
+    16:         # DynamoDBにデータを保存
+    17:         table.put_item(Item=event)
+    18:
+    19:         return {
+    20:             'statusCode': 200,
+    21:             'body': json.dumps('データが正常に保存されました', ensure_ascii=False)
+    22:         }
+    23:     except Exception as e:
+    24:         return {
+    25:             'statusCode': 500,
+    26:             'body': json.dumps(f'エラー: {str(e)}', ensure_ascii=False)
+    27:         }

 ⋮
 ↳ Purpose: DynamoDBにデータを保存するLambda関数を作成
Creating: /home/ubuntu/q/lambda_dynamodb_jp.py

 ⋮
 ● Completed in 0.1s


> Lambda関数を作成しました。主な機能：

• boto3を使用してDynamoDBと連携
• イベントデータの入力検証
• DynamoDBテーブルへのデータ保存
• 日本語でのエラーメッセージ
• 適切なHTTPステータスコードを返却

使用方法：
1. 'your-table-name'を実際のDynamoDBテーブル名に変更
2. Lambda実行ロールにdynamodb:PutItem権限を付与
3. 関数はイベントで渡されたJSONデータをDynamoDBに保存します
```

---

## 3. 対話で進めるプログラム開発体験

Q Developer CLI（`q`）を使って、AIと自然言語で会話しながら、シンプルなアプリケーション（ここでは「テトリス」ゲーム）を一緒に作り上げる流れを紹介します。

```bash
$ q
🤖 You are chatting with claude-4-sonnet
```

### 3.1 シナリオ設定

今回作成するテトリスの要件は以下のとおりです。

- ①：通常のテトリスが備えている操作は一通り持っている
- ②：単なるブロックではなく、動物のアイコン（例えば猫）を使う
- ③：猫アイコンの表情も一通りではなく、ブロックが積まれてくると、猫アイコンの表情を変える
- ④：格納場所はAWSのS3として、グローバルでアクセスできるように設定する

### 3.2 Q Developerとの対話開始


指示：（概要＋詳細（上記の要件の①と②））
```
テトリスを作ってください。
テトリスが備えているであろう普通の機能（ブロックの回転、位置決め、落下など）を備えてください。
ブロックは通常のブロックではなく、猫のアイコン画像（画像の選定は任せます）を使ってください。
```

応答：
```
> 猫のアイコンを使ったテトリスゲームを作成します：

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: /home/ubuntu/q/cat-tetris.html

+      1: <!DOCTYPE html>
+      2: <html>
+      3: <head>
+      4:     <meta charset="UTF-8">
+      5:     <title>猫テトリス</title>
+      6:     <style>
+      7:         body { margin: 0; padding: 20px; background: #222; color: white; font-family: Arial; text-align: center; }
+      8:         canvas { border: 2px solid #fff; background: #000; }
+      9:         .score { font-size: 20px; margin: 10px; }
+     10:         .controls { margin: 10px; font-size: 14px; }
+     11:     </style>
+     12: </head>

～～～（中略）～～～

+    239:         // Start game
+    240:         updateScore();
+    241:         requestAnimationFrame(gameLoop);
+    242:     </script>
+    243: </body>
+    244: </html>

 ⋮
 ↳ Purpose: Create cat tetris game with standard tetris features
Creating: /home/ubuntu/q/cat-tetris.html

 ⋮
 ● Completed in 0.1s

> 猫のアイコンを使ったテトリスゲームを作成しました！

主な機能:
• **ブロック回転**: ↑キーで回転
• **左右移動**: ←→キーで移動
• **高速落下**: ↓キーで高速落下
• **ハードドロップ**: スペースキーで瞬間落下
• **ライン消去**: 横一列が揃うと消去
• **スコアシステム**: ライン消去でスコア獲得
• **レベルアップ**: スコアに応じて落下速度が上がる
• **猫のアイコン**: 7種類の猫の絵文字をランダム使用

操作方法:
• ←→: 左右移動
• ↓: 高速落下
• ↑: 回転
• スペース: ハードドロップ

ファイルを開いてブラウザでプレイできます！
```

どうやら「`/home/ubuntu/q/cat-tetris.html`」が成果物のようです。  
（出力を明確に指定していなかったので、Qが任意の保存場所とファイル名を用意したようです）

HTMLファイルを開いてみます。
![](https://gyazo.com/0cdf5dcafccf915fa0f4b3b63b0a42ac.png)

猫テトリスが動いています。  
猫アイコンもそれぞれ表情が違っていて面白いです。  
しかし、最初から猫が泣いていたりして、法則性が無いように思います。  
どのように猫の表情を変化させているのかを確認してみます。  

指示：
```
> 猫アイコンはどういうロジックで変化しているのですか？
```

応答：
```
> 猫アイコンの変化ロジックは以下の通りです：

1. ピース生成時にランダム決定:
javascript
this.catType = Math.floor(Math.random() * CAT_EMOJIS.length);

新しいテトリスピースが生成される際に、7種類の猫絵文字（🐱😺😸😹😻🙀😿）からランダムに1つ選択されます。

2. ピース全体で同じ猫:
各テトリスピース（I、O、T、S、Z、J、L）は生成時に決まった1種類の猫アイコンで統一されます。

～～～（中略）～～～

4. 表示時の変換:
javascript
drawBlock(x, y, board[y][x] - 1);

描画時に-1して元の猫タイプインデックスに戻します。

つまり: 各テトリスピースごとに猫の種類がランダムに決まり、そのピース内のすべてのブロックは同じ猫アイコンになります。ピー
スが異なれば猫の種類も変わる可能性があります。
```

質問を投げかけると、このように応答します。  
ただ、ランダムだと面白くないので、さらに制約（詳細）を追加していきます。

指示：（要件：③）
```
ゲームの序盤では余裕の猫で、ブロックが高く積みあがってくるにしたがって、余裕のない表情の猫にしてください。
```

応答：
```
> ゲームの状況に応じて猫の表情が変わるように修正します：

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: cat-tetris.html

- 29    :         // 猫の絵文字を使用
- 30    :         const CAT_EMOJIS = ['🐱', '😺', '😸', '😹', '😻', '🙀', '😿'];
+     29:         // 猫の絵文字を使用（余裕→緊張の順）
+     30:         const CAT_EMOJIS = ['😻', '😺', '😸', '🐱', '😹', '🙀', '😿'];

～～～（中略）～～～

> 修正完了しました！

新しい猫の表情システム:

• **😻 (余裕)**: ブロックが低い位置にある時
• **😺 (まだ余裕)**: 少し積み上がってきた時
• **😸 (少し心配)**: 中程度の高さ
• **🐱 (普通)**: 半分くらいの高さ
• **😹 (緊張)**: かなり高く積み上がった時
• **🙀 (焦り)**: 危険な高さ
• **😿 (絶望)**: ゲームオーバー寸前

ブロックが高く積み上がるほど、猫の表情が余裕から絶望へと変化します。ゲームの緊張感が猫の表情で表現されるようになりました！
```

実行して制約を確認します。
以下が実行結果です。

![](https://gyazo.com/3147fef55feda871b380d7afc7f4eb6d.png)

今度は余裕が無くなってくる（ブロックが積み上がる）と、猫アイコンの表情が（余裕→絶望）に変わっていくのがわかります。

ただ、ゲームを少しプレイしていると以下のバグが見つかりました。

- 横4つつながったブロックが上↑キーで回転しない。
- 2回目以降のゲーム再開で、最初から絶望や焦りの表情をした猫ブロックが登場する。

バグの修正を「日本語」で指示します。

指示：（バグ修正依頼）

```
バグがあります。修正してください。バグは以下です。
１．横4つつながったブロックが上↑キーで回転しない。
２．2回目のゲームで、最初から絶望や焦りの猫の表情のブロックが登場する。
```

応答：
```
> バグを修正します：

1. I字ピース（横4つ）の回転バグ修正：

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: cat-tetris.html

  39, 39:         const PIECES = [
  40, 40:             // I piece
- 41    :             [[[1,1,1,1]]],
+     41:             [[[1,1,1,1]], [[1],[1],[1],[1]]],

 ⋮
 ↳ Purpose: Fix I-piece rotation by adding vertical rotation state
Updating: cat-tetris.html

 ⋮
 ● Completed in 0.0s

> 2. ゲームリセット時のボード初期化バグ修正：

🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Searching: /home/ubuntu/q/cat-tetris.html for pattern: ゲームオーバー
 ✓ Found 1 matches for pattern 'ゲームオーバー' in /home/ubuntu/q/cat-tetris.html

 ⋮
 ● Completed in 0.0s

🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/q/cat-tetris.html, from line 224 to 234
 ✓ Successfully read 464 bytes from /home/ubuntu/q/cat-tetris.html
 ⋮

～～～（中略）～～～

 ⋮
 ↳ Purpose: Fix board reset to ensure proper initialization
Updating: cat-tetris.html

 ⋮
 ● Completed in 0.0s

> 修正完了しました！

修正内容:
1. I字ピースの回転: 横4つの状態と縦4つの状態を追加し、↑キーで回転できるようになりました
2. ゲームリセット: ボードを完全に0で初期化し、新しいピースを生成するようにしたので、2回目のゲームでも正しく余裕のある猫から始まります

これでバグが解消され、正常にゲームが動作するはずです！
```

修正版のゲームを再度実行します。

![](https://gyazo.com/1b73821bcd500359109851d05a662a91.png)

回転できなかった横一列のブロックも回転できるようになっています。  
また、ゲーム再開時の猫アイコンも正しく表示されるようになっていました。  

### 3.3 AWS S3にアップロード

出来上がったテトリスアプリケーションはHTMLファイルが一つだけの単純なものです。  
このアプリケーションをAWS S3にアップロードしてみます。  
（AWS S3へのアクセス権を持っていることが条件です）

指示：（要件：④）
```
ゲームをAWS S3にアップロードして。
アップロード先は新しいバケットを作成して。
```

応答：
```
> 新しいバケットを作成して猫テトリスをアップロードしますね。

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
aws s3 mb s3://cat-tetris-game-$(date +%s)
 ⋮
 ↳ Purpose: 新しいS3バケットを作成

make_bucket: cat-tetris-game-<バケットID>

 ⋮
 ● Completed in 1.573s

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
aws s3 cp /home/ubuntu/cat-tetris.html s3://cat-tetris-game-<バケットID>/cat-tetris.html --content-type text/html
 ⋮
 ↳ Purpose: 猫テトリスファイルを新しいバケットにアップロード

upload: ./cat-tetris.html to s3://cat-tetris-game-<バケットID>/cat-tetris.html

 ⋮
 ● Completed in 0.655s

> 完了しました！新しいバケット cat-tetris-game-<バケットID> を作成して、猫テトリスファイルをアップロードしました。
```

アップロードが完了したようですが、アクセス方法がわかりません。  
最終的にどのようにアクセスしたいかを伝えていませんでした。  
Q Developerに＜最終成果物のイメージ＞を伝えます。  

指示：  
```
URLでアクセスしたいので、URLを教えて
```

応答：（バケットIDは実際に出力されたものから変更しています）  
```
> 現在はS3バケットがプライベートなので、Webからアクセスできません。パブリックアクセスを有効にする必要があります。

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
aws s3api put-public-access-block --bucket cat-tetris-game-<バケットID> --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
 ⋮
 ↳ Purpose: バケットのパブリックアクセスブロックを無効化

 ⋮
 ● Completed in 0.989s

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
aws s3api put-bucket-policy --bucket cat-tetris-game-<バケットID> --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::cat-tetris-game-<バケットID>/*"
    }
  ]
}'
 ⋮
 ↳ Purpose: バケットポリシーでパブリック読み取りを許可

 ⋮
 ● Completed in 1.112s

> これで以下のURLでアクセスできます：

https://cat-tetris-game-<バケットID>.s3.amazonaws.com/cat-tetris.html

ブラウザでこのURLを開けば猫テトリスがプレイできます！
```

指定されたURLを開きます。  
ローカルで実行したものと同じテトリスを、AWS S3上で実行することが出来ました。

![](https://gyazo.com/1b278100082c898609ea10b49731fc78.png)

---

## 4. 指示の出し方の基本パターン

AIとの対話で成果を出すには、**「どのように伝えるか」** が最も重要です。  
Q Developerは自然言語を理解しますが、**明確で構造的な指示**ほど精度の高いコードを生成します。

### 4.1 指示の基本構造

AIにタスクを伝えるときは、次の3段階を意識します。

| 段階 | 内容 | 例 |
|------|------|----|
| **① ゴール** | 何を達成したいか | 「DynamoDBにデータを保存するAPIを作りたい」 |
| **② 制約** | 技術的な条件・使用技術 | 「Python 3.11で、Lambda関数として実装して」 |
| **③ 期待結果** | 出力してほしい成果物の形 | 「ハンドラー関数とテストコードを生成して」 |

この3要素を順番に伝えるだけで、出力の再現性と品質が大きく向上します。

### 4.2 指示の粒度を使い分ける

Q Developerへの指示は、大きく「**部分指示**」と「**全体指示**」の2種類があります。

| 種類 | 対象範囲 | 使い方の例 |
|------|------------|-------------|
| **部分指示** | 関数・モジュールなど局所的な修正 | 「この関数をリファクタして、例外処理を標準化して」 |
| **全体指示** | プロジェクト全体や設計方針 | 「全APIのレスポンス形式を統一して、共通エラーハンドラを追加して」 |

部分指示では即時的な改善を狙い、全体指示では設計方針の整合性を図ります。  
この2つを組み合わせることで、AIに**意図の上下関係**を理解してもらうことができます。

### 4.3 フィードバックを循環させる

AIが出した結果に対して「そのまま使う」のではなく、**誤解 → 修正 → 再生成** のサイクルを回すことが重要です。

#### 例：
```
AI：Lambda関数を作成しました。DynamoDBに書き込みます。
↓
開発者：このコードではテーブル名が固定なので、環境変数から取得するようにして。
↓
AI：了解しました。修正したコードを以下に示します。
```

このように、AIとの対話を「レビューの往復」として扱うと、より高品質なコードを一緒に育てることができます。

### 4.4 良い指示と悪い指示の比較

| 指示の例 | AIの反応 | 評価 |
|-----------|-----------|------|
| 「DynamoDB対応のLambda作って」 | 動くが、スキーマや例外処理が曖昧 | ❌ 不明確 |
| 「DynamoDBにタスクを登録するLambda関数を作成。titleとstatusを受け取り、statusの初期値はpendingにして」 | 適切なハンドラーとバリデーションを自動生成 | ✅ 明確 |
| 「関数を改善して」 | どこをどう直すか分からない | ❌ 抽象的 |
| 「この関数のエラーハンドリングを追加し、ログに例外内容を出力して」 | コードの修正意図を正確に反映 | ✅ 具体的 |

「短い指示」よりも「明確な文脈を含む指示」が結果を良くします。

### 4.5 応用：AIをレビューアとして使う

AIに **“設計者”** や **“品質管理者”** の視点を持たせることも可能です。  
たとえば次のような指示が有効です。

```
このコードの保守性とテスト容易性の観点から、改善点を3つ挙げて。
```
または、
```
このAPI設計をREST原則に照らしてレビューして。
```

これにより、Q Developerは単なる生成エンジンから「レビューAI」として機能し、開発者の品質意識を高めるパートナーになります。

---

## まとめ

- 指示は「**ゴール → 制約 → 期待結果**」の順に伝える  
- **粒度（部分／全体）を意識して構造的に指示する**  
- **フィードバックを繰り返して精度を上げる**  
- 最小構成で動かしながら、**AIとの会話**を通じて開発プロセスを理解する  

Q Developerは「AIがコードを書くツール」ではなく、「**AIと共に設計・実装・品質を磨くためのプラットフォーム**」です。

皆さまの生成AI活用の参考になれば幸いです。

<style>
img {
    border: 1px gray solid;
}
</style>
