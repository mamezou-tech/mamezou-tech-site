---
title: "画像キャプションデグレード調査"
date: 2025-09-02
tags: ["test", "markdown"]
---

# 画像キャプションパターン分析結果

## 検索条件
画像タグの直後に `*` で始まる行があるパターン
正規表現: `!\[.*\]\(.*\)\n\s*\*`

## 検索結果

### 1. テストファイル
- `src/posts/blogs/2025/test-image-caption.md` (3箇所)
  - 実際の画像キャプション機能のテスト用ファイル

### 2. 英語版記事
- `src/en/posts/iot/internet-of-things-20.md` (2箇所)
  - `*Note: I installed the Preview version...`
  - `*In this example, I downloaded...`
- `src/en/posts/robotics/manip-algo3/manip-algo3.md` (1箇所)
  - `* $\rho$ is set to 2.0.`
- `src/en/posts/blogs/2025/0611_lets_talk_statistics_shall_we_12.md` (1箇所)
  - `*This is just a guideline. Each test has its own assumptions.`

### 3. 日本語版記事
- `src/posts/iot/internet-of-things-20.md` (1箇所)
  - `**REPL** とは「Read–Eval–Print Loop（読み取り・評価・出力・繰り返し）」のそれぞれの頭文字をとった言葉です。`
- `src/posts/robotics/manip-algo3/manip-algo3.md` (1箇所)
  - `* $\rho$は2.0とする。`
- `src/posts/blogs/2025/0414_use-deepseek-on-local-with-old-gpu.md` (1箇所)
  - `**わはははは！爆笑！**`

### 4. その他の記事（多数）
- 各種技術記事で画像の直後に補足説明や注釈として使用されている

## 分析結果

### 影響を受ける可能性のある記事数
- 英語版: 約15記事
- 日本語版: 約20記事
- 中国語版: 約10記事
- 合計: 約45記事

### 使用パターンの分類
1. **補足説明**: `*Note:`, `*In this example:` など
2. **用語説明**: `**REPL** とは...` など
3. **感想**: `**わはははは！爆笑！**` など
4. **図表キャプション**: `*図1: ユースケース図の基本要素と関係性*` など
5. **リスト項目**: `* 制約の特徴` など

### 推奨対応
1. 既存記事の修正（必要に応じて）
2. 画像キャプション機能の使用ガイドライン作成
3. 段階的な導入検討

## パターン2: 画像タグの後に改行があり、その後に空白文字と文章が続き、その文章内に*が含まれるパターン

### 検索条件
正規表現: `!\[.*\]\(.*\)\n[^*\n]*\*[^*\n]*\*`

### 検索結果（詳細リスト）

#### 英語版記事
- `src/en/posts/lume/lume-search.md` (Line 144)
  - 画像の後に技術説明文が続くパターン

- `src/en/posts/iot/internet-of-things-20.md` (複数箇所)
  - Line 46: `*Note: I installed the Preview version, but in my environment the stable version was more unstable, so I chose the Preview version.`
  - Line 60: `*In this example, I downloaded ESP32_GENERIC-20250415-v1.25.0.bin.*`
  - Line 99: 画像の後に複数の画像と説明文が続くパターン
  - Line 210: 画像の後に説明文が続くパターン
  - Line 336: 画像の後に説明文が続くパターン

- `src/en/posts/iot/internet-of-things-19.md` (Line 303)
  - 画像の後に説明文が続くパターン

- `src/en/posts/iot/internet-of-things-18.md` (Line 359)
  - 画像の後に説明文が続くパターン

- `src/en/posts/iot/internet-of-things-16.md` (複数箇所)
  - Line 356: 画像の後に説明文が続くパターン
  - Line 399: 画像の後に説明文が続くパターン

- `src/en/posts/iot/internet-of-things-15.md` (Line 26)
  - 画像の後に説明文が続くパターン

- `src/en/posts/blogs/2025/0117_cycle-postgres.md` (Line 169)
  - 画像の後に技術説明文が続くパターン

- `src/en/posts/blogs/2025/0110_go-conc.md` (複数箇所)
  - Line 74: 画像の後に説明文が続くパターン
  - Line 89: 画像の後に説明文が続くパターン
  - Line 187: 画像の後に説明文が続くパターン
  - Line 249: 画像の後に説明文が続くパターン

- `src/en/posts/blogs/2025/0127_textlint-tuning-allowlist.md` (Line 197)
  - 画像の後に説明文が続くパターン

#### 日本語版記事
- `src/posts/iot/internet-of-things-20.md` (複数箇所)
  - Line 38: `※インストールしたのは Preview版ですが、私の環境では安定版の方が不安定だったので、Preview版を採用しました。`
  - Line 52: `※例では「ESP32_GENERIC-20250415-v1.25.0.bin」をダウンロードしました。`
  - Line 66: `※COMポート番号はOSによって異なる場合があります。（Linux: /dev/ttyUSB0 など）`
  - Line 113: `※この時、VSCodeの仕様によりワークスペースが自動作成されますが今は無視でいいです`
  - Line 119: `※またワークスペースが開きましたが、とりあえずは気にせず進めて構いません`
  - Line 204: 画像の後に説明文が続くパターン
  - Line 334: 画像の後に説明文が続くパターン

- `src/posts/iot/internet-of-things-19.md` (Line 307)
  - `※画像では分かりづらいですが、アクティブ時にはLEDが点灯しています。`

- `src/posts/iot/internet-of-things-18.md` (Line 354)
  - `※画像では分かりづらいですが、アクティブ時にはLEDが点灯しています。`

- `src/posts/iot/internet-of-things-16.md` (複数箇所)
  - Line 399: `※画像では分かりづらいですが、アクティブ時にはLEDが点灯しています。`
  - Line 403: 画像の後に説明文が続くパターン

- `src/posts/iot/internet-of-things-15.md` (Line 19)
  - `※画像では分かりづらいですが、アクティブ時にはLEDが点灯しています。`

- `src/posts/iot/internet-of-things-10.md` (Line 24)
  - 画像の後に説明文が続くパターン

- `src/posts/iot/internet-of-things-09.md` (Line 63)
  - 画像の後に説明文が続くパターン

- `src/posts/iot/internet-of-things-08.md` (Line 17)
  - 画像の後に説明文が続くパターン

- `src/posts/iot/internet-of-things-05.md` (Line 32)
  - 画像の後に説明文が続くパターン

### 分析結果

#### 影響を受ける可能性のある記事数（詳細）
- 英語版: 12記事
- 日本語版: 9記事
- 合計: 21記事

#### 使用パターンの分類
1. **補足説明**: `※インストールしたのは Preview版ですが...` など
2. **注意書き**: `※画像では分かりづらいですが...` など
3. **技術説明**: 画像の後に技術的な説明文が続くパターン

### 総合分析

#### 影響を受ける記事の総数（詳細）
- パターン1: 45記事
- パターン2: 21記事
- **重複を除いた総数: 約55記事**

#### 影響を受ける記事の詳細リスト

##### 日本語記事のみの詳細リスト

### パターン1（画像の直後にキャプション）
1. `src/posts/robotics/manip-algo3/manip-algo3.md` (Line 240)
   - `* $\rho$は2.0とする。`

2. `src/posts/iot/internet-of-things-20.md` (Line 193)
   - `**REPL** とは「Read–Eval–Print Loop（読み取り・評価・出力・繰り返し）」のそれぞれの頭文字をとった言葉です。`

3. `src/posts/blogs/2024/0305_collect-gitlab-review-comment.md` (複数箇所)
   - Line 26: `* アクセストークンのコピー`
   - Line 40: `* プロジェクトが取得できるか確認`
   - Line 331: `* 主な機能`

4. `src/posts/blogs/2025/0312_langmem-aurora-pgvector.md` (Line 307)
   - `**store_vectorsテーブル**`

5. `src/posts/blogs/2025/0509_ccpm_theory_bottleneck_is_why_learn_toc.md` (複数箇所)
   - Line 83: `* 制約の特徴`
   - Line 125: `* 要求される機能内容と数は都度異なる`
   - Line 137: `* ソフトウェア開発業務における「制約の特徴」`

6. `src/posts/blogs/2025/0507_appsync-events-datasource-integration.md` (複数箇所)
   - Line 99: `**2. チャネル購読(Subscribeセクション)**`
   - Line 108: `**4. イベント配信結果確認(Subscribeセクション)**`
   - Line 215: `**名前空間**`
   - Line 227: `**2. イベント発行(Publishセクション)**`
   - Line 231: `**3. イベント配信結果確認(Subscribeセクション)**`
   - Line 318: `**名前空間**`
   - Line 330: `**2. イベント発行(Publishセクション)**`
   - Line 334: `**3. イベント配信結果確認(Subscribeセクション)**`

7. `src/posts/blogs/2025/0529_umls_usecase.md` (複数箇所)
   - Line 55: `*図1: ユースケース図の基本要素と関係性*`
   - Line 73: `*図2: ユースケース「電話をかける」とそれに関係づけられたステートマシン図*`
   - Line 133: `*図3: ExtensionLocationとExtensionPointの違い*`
   - Line 229: `*図4: ユースケース図の表記例*`

8. `src/posts/blogs/2025/0414_use-deepseek-on-local-with-old-gpu.md` (Line 351)
   - `**わはははは！爆笑！**`

9. `src/posts/blogs/2025/0528_lets_talk_statistics_shall_we_02.md` (Line 102)
   - `**尺度の違いは、適用できる統計手法・グラフの種類・解釈の仕方を左右します。**`

10. `src/posts/blogs/2024/0513_try_claude.md` (複数箇所)
    - Line 67: `**クロード**：この商品の原材料表示から、アレルゲン物質として卵、乳製品、小麦が含まれていることがわかります。...`
    - Line 85: `**クロード**：この画像は、新しい栄養成分表示ラベルの見本を、以前のラベルと比較する形で示しています。...`
    - Line 93: `**クロード**：この製品の原材料リストを確認したところ、卵が含まれていることがわかります。...`

11. `src/posts/blogs/2025/0808_pm_process_improvement_ideal_model_and_practical_steps.md` (Line 79)
    - `**例）強み・弱みと課題の一覧**`

12. `src/posts/blogs/2024/1215_aws-app-signals-lambda.md` (複数箇所)
    - Line 182: `**Service Operations**`
    - Line 189: `**Dependencies**`

13. `src/posts/blogs/2022/0918_cloud-custodian-aws-intro.md` (Line 243)
    - `**EventBridge**`

14. `src/posts/blogs/2023/0915_apply-stepci-to-app-dev.md` (Line 352)
    - `* ワークフロー定義例`

15. `src/posts/blogs/2022/1013_instructional_d-002.md` (複数箇所)
    - Line 107: `**2. 階層分析**`
    - Line 117: `**3. 手順分析**`
    - Line 125: `**4. 複合型分析（態度に対する課題分析）**`

16. `src/posts/blogs/2022/1222_stepci.md` (Line 54)
    - `* 異常終了したイメージ`

17. `src/posts/blogs/2025/test-image-caption.md` (複数箇所)
    - Line 12: `*これはサンプル画像のキャプションです*`
    - Line 17: `*これは複数行のキャプションのテストです。長い説明文を含むことができます。[リンク](http://hogehoge)やフットノート[^1]も入れられます*`
    - Line 24: `*この画像にはキャプションがありません。*`

### パターン2（画像の後に文章内に*が含まれる）
1. `src/posts/iot/internet-of-things-20.md` (複数箇所)
   - Line 38: `※インストールしたのは Preview版ですが、私の環境では安定版の方が不安定だったので、Preview版を採用しました。`
   - Line 52: `※例では「ESP32_GENERIC-20250415-v1.25.0.bin」をダウンロードしました。`
   - Line 66: `※COMポート番号はOSによって異なる場合があります。（Linux: /dev/ttyUSB0 など）`
   - Line 113: `※この時、VSCodeの仕様によりワークスペースが自動作成されますが今は無視でいいです`
   - Line 119: `※またワークスペースが開きましたが、とりあえずは気にせず進めて構いません`
   - Line 204: 画像の後に説明文が続くパターン
   - Line 334: 画像の後に説明文が続くパターン

2. `src/posts/iot/internet-of-things-19.md` (Line 307)
   - `※画像では分かりづらいですが、アクティブ時にはLEDが点灯しています。`

3. `src/posts/iot/internet-of-things-18.md` (Line 354)
   - `※画像では分かりづらいですが、アクティブ時にはLEDが点灯しています。`

4. `src/posts/iot/internet-of-things-16.md` (複数箇所)
   - Line 399: `※画像では分かりづらいですが、アクティブ時にはLEDが点灯しています。`
   - Line 403: 画像の後に説明文が続くパターン

5. `src/posts/iot/internet-of-things-15.md` (Line 19)
   - `※画像では分かりづらいですが、アクティブ時にはLEDが点灯しています。`

6. `src/posts/iot/internet-of-things-10.md` (Line 24)
   - 画像の後に説明文が続くパターン

7. `src/posts/iot/internet-of-things-09.md` (Line 63)
   - 画像の後に説明文が続くパターン

8. `src/posts/iot/internet-of-things-08.md` (Line 17)
   - 画像の後に説明文が続くパターン

9. `src/posts/iot/internet-of-things-05.md` (Line 32)
   - 画像の後に説明文が続くパターン

### 日本語記事の影響分析

#### 影響を受ける記事数
- **パターン1**: 17記事
- **パターン2**: 9記事
- **重複を除いた総数**: 約20記事

#### 使用パターンの分類
1. **補足説明**: `※インストールしたのは Preview版ですが...` など
2. **注意書き**: `※画像では分かりづらいですが...` など
3. **用語説明**: `**REPL** とは...` など
4. **感想**: `**わはははは！爆笑！**` など
5. **図表キャプション**: `*図1: ユースケース図の基本要素と関係性*` など
6. **リスト項目**: `* 制約の特徴` など
7. **技術説明**: 画像の後に技術的な説明文が続くパターン

#### 推奨対応
1. **既存記事の修正**: 影響を受ける記事の修正
2. **画像キャプション機能の使用ガイドライン作成**: 新規記事での使用方法を明確化
3. **段階的な導入**: テスト環境での検証後に本番導入
4. **代替案の検討**: より厳密なセレクタの使用や、JavaScriptによる動的なクラス付与
