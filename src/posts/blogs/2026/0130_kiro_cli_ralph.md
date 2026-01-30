---
title: Kiro CLIでRalphループを試してみた
author: hironori-maruoka
date: 2026-01-30
tags: [Kiro, AIDD, AIエージェント]
image: true
---

## はじめに

AIエージェントによる自律開発は魅力的ですが、長時間の処理でコンテキストの劣化により精度が落ちる問題があります。この課題に対するアプローチとして注目されているのは**Ralphループ**です。本記事では、Kiro CLIを使ったRalphループの検証結果と、実践で得た教訓を共有します。

## 背景：コンテキスト管理の課題とRalphループ

従来のAIチャットにおける課題は、長時間の会話でコンテキストが圧縮されたり劣化したりして精度が落ちることです[^1]。

Ralphループの核となる原則は**コンテキスト腐敗の回避**です[^2]。1つのタスクが終わるごとにコンテキストを破棄し、新しいセッションで次のタスクを開始するというループ構造を回します。一見シンプルなテクニックですが、これにより精度を安定させながら長時間のタスク実行が可能になると考えられます。

今回の検証では、定番構成のClaude Code + PRD.mdではなく、**kiro IDEの仕様成果物3種（requirements.md、design.md、tasks.md）に置き換え**ました。構造化された指示により精度向上を狙っています。

## 検証題材：スプレッドシートアプリ

今回の検証では、Webブラウザ上で動作する軽量スプレッドシートアプリを開発しました。

### アプリケーション仕様

* 10列×20行のグリッド、セル参照、四則演算
* SUM/AVG関数、循環参照エラー検知
* 技術スタック：React + TypeScript + Vite + Vitest

選定のポイントは、**比較的複雑度が高く、コンテキストがひっ迫して処理が迷走しそうなアプリケーション**であることです。数式パーサー、依存関係グラフ、循環参照検知など、複数の概念が絡み合う題材で、Ralphループの実用性を試しました。

### 完成したアプリケーション

今回作成したスプレッドシートアプリを先に説明します。
初期画面では、以下のように10列×20行のグリッドと数式バーが表示されます。

![完成したスプレッドシートアプリケーション（初期画面）](/img/blogs/2026/0130_kiro_cli_ralph/spreadsheet_sample.png)

セル参照、四則演算、SUM/AVG関数などが実装されており、数式による自動演算が可能です。入力例として、簡単な数値演算をSUM関数を用いて行いました。

![数式による自動演算の例](/img/blogs/2026/0130_kiro_cli_ralph/spreadsheet_sample_sum_func.png)

### テスト品質

自律実行により、以下のテストが自動生成・実装されました。

- **テストケース総数**: 126テスト
- **ユニットテスト**: 101テスト
- **プロパティベーステスト**: 25テスト

Kiro CLIはテスト駆動開発のアプローチに従い、プロパティベーステストによるランダム入力検証を含むテストスイートを自律構築しました。人間では予測困難な入力パターンに対しても、循環参照検知や数式評価の正確性を効率的に検証するテストが生成され、品質確保に寄与しています。


## 実装ステップ

Ralphループの実装は、以下の2ステップで進めました。

## ステップ1：kiro IDEによる準備フェーズ

### プロジェクト構成

まず、プロジェクトのディレクトリ構造を以下のように準備します。

```text
project/
├── .kiro/specs/spreadsheet-sample/
│   ├── requirements.md      # EARS記法による要件定義
│   ├── design.md            # システム設計書
│   └── tasks.md             # 実装タスクリスト
├── progress.txt             # 実装進捗を記録（イテレーション間で引き継ぎ）
├── ralph-once.sh            # 単発実行用スクリプト
└── afk-ralph.sh             # Ralphループ制御スクリプト
```

### 1-1. 仕様成果物の作成

kiro IDEを使ってスプレッドシートアプリの仕様を定義します。

Specモードで、`.kiro/specs/spreadsheet-sample/`ディレクトリに以下3つの仕様成果物を生成します。

* **requirements.md**: EARS記法による要件定義。受入基準が明確に記述される
* **design.md**: システム設計書。アーキテクチャやコンポーネント設計が含まれる
* **tasks.md**: 実装タスクリスト。Kiro CLIがこれを読み取り、未完了タスクを実装する

kiro IDEとの対話を通じて、アプリケーションの要件を伝え、これらの仕様成果物を完成させます。この段階では、まだコードは生成されません。

### 1-2. シェルスクリプトの作成

次に、Ralphループを制御するシェルスクリプト`afk-ralph.sh`を作成します。シェルスクリプトの実装は、AIHero.devのガイド[^3]を参考にしました。

### メインループ

```bash:afk-ralph.sh（メインループ部分）
for ((i=1; i<=${1}; i++)); do
  echo "loop iteration $i"

  # 仕様3種とprogress.txtを読み込み
  req="$(cat "${SPEC_DIR}/requirements.md")"
  des="$(cat "${SPEC_DIR}/design.md")"
  tasks="$(cat "${SPEC_DIR}/tasks.md")"
  progress="$(cat progress.txt 2>/dev/null || echo 'まだ進捗なし')"

  # プレースホルダーを実際の内容に置換
  prompt="$(build_prompt)"
  prompt="${prompt/__REQ__/$req}"
  prompt="${prompt/__DES__/$des}"
  prompt="${prompt/__TASKS__/$tasks}"
  prompt="${prompt/__PROGRESS__/$progress}"

  logfile="/tmp/kiro-iteration-${i}.log"
  kiro-cli chat --no-interactive --trust-all-tools "$prompt" 2>&1 | tee "$logfile"

  # tasks.mdの未完了タスク数とCOMPLETE出力で終了判定
  uncompleted=$(grep -cE '^\- \[ \]' "${SPEC_DIR}/tasks.md" 2>/dev/null || echo "0")
  has_promise=$(grep -q "<promise>COMPLETE</promise>" "$logfile" && echo "yes" || echo "no")

  if [ "$uncompleted" -eq 0 ] && [ "$has_promise" = "yes" ]; then
    echo "All tasks verified complete after $i iterations."
    exit 0
  fi
done
```

メインループでは、毎イテレーションで仕様ファイルを読み込み、プロンプトに埋め込んでKiro CLIを実行します。終了条件は、**tasks.mdの未完了タスクがゼロ**かつ**AIによる`<promise>COMPLETE</promise>`の出力**の両方を満たす場合です。

### 実行オプションとリスク

Kiro CLIの実行には、以下の2つの重要なオプションを指定しています。

- `--no-interactive`: 対話モードを無効化し、ユーザー入力を待たずに自動実行する
- `--trust-all-tools`: すべてのツール実行を自動承認し、コマンド実行の確認を求めない

これらのオプションにより完全自律実行が可能になりますが、意図しないコマンドの実行リスクがあります。そのため、devcontainerなどの隔離環境での実行が必須です。後述の「気づきと教訓」でも述べるように、環境分離なしでの実行は推奨しません。

### AIエージェントへのプロンプト

```bash:afk-ralph.sh（プロンプトテンプレート部分）
build_prompt() {
  cat <<'PROMPT'
【要件】__REQ__
【設計】__DES__
【タスク一覧】__TASKS__
【進捗】__PROGRESS__

1. 要件と設計を理解する
2. タスク一覧と進捗を確認し、次の未完了タスクを見つける
3. そのタスクを実行する
4. 変更をコミットする
5. 完了後、tasks.md のチェックボックスを [ ] から [x] に更新する（必須）
6. progress.txt に完了した内容を追記する（必須）

1回の実行で1タスクのみ実装すること
npm run test は禁止。必ず npm run test:unit または npm run test -- --run を使う
常駐プロセスは禁止、必ず一回で終了するコマンドのみ実行すること
（中略）
全タスク完了時のみ <promise>COMPLETE</promise> を出力すること
tasks.mdに未完了タスク [ ] が残っている場合は絶対に <promise>COMPLETE</promise> を出力しないこと
PROMPT
}
```

プロンプトには、仕様3種と進捗を埋め込むプレースホルダーと、AIエージェントへの詳細な実行制約を含めています。特に、常駐プロセスの禁止と終了条件の明確化が重要でした。

## ステップ2：Kiro CLIでRalphループの実行

devcontainer環境でシェルスクリプトを実行し、Ralphループを開始します。

```bash
$ ./afk-ralph.sh 10
START afk-ralph.sh
loop iteration 1
# ... kiro-cliがタスク1を実装、コミット ...
loop iteration 2
# ... kiro-cliがタスク2を実装、コミット ...
...
All tasks verified complete after 7 iterations.
```

引数の`10`は最大イテレーション数です。各イテレーションでは、新しいコンテキストでKiro CLIが起動し、タスクを実行します。

上図は、タスク2.2と2.3を完了した後、イテレーション2に移行する様子です。

![Ralphループのイテレーション切り替わり](/img/blogs/2026/0130_kiro_cli_ralph/kiro_ralph_loop_iteration_1_to_2.png)

各イテレーションで以下を実行します。

1. 仕様成果物3種と進捗を読み込み
2. 次の未完了タスクを特定
3. タスクを実装し、テストを実行
4. 変更をコミット
5. tasks.mdのチェックボックスを更新
6. progress.txtに進捗を記録

---

## 気づきと教訓

### 環境分離は必須

自律実行は実行コマンドの全自動承認を前提とするので、何が起こるかわかりません。今回はdevcontainer環境で実行しました。進捗ファイルが複数箇所にできるなど、AIの行動を予測することの難しさを感じました。

### 待機モード・対話確認を消す

自律実行のためには中断を挟まないようにする必要があります。今回はプロンプトの中で対話確認や待機を伴うコマンドの実行禁止を指示しました。

### トークンを大量に消費する

処理の都度、新しくセッションを立ち上げてゼロからインプットする行為を繰り返すので、消費トークンが従来よりも増えます。余裕のある環境で実行する必要があります。

---

## まとめ

完成したアプリケーションの基本機能は問題なく動作しましたが、商用製品と比較すると機能面での差は歴然です。それでも、夜中にスクリプトを起動して朝起きたら動くアプリケーションが完成していた体験は、AIエージェントの可能性を実感させるものでした。

今回は数10回のイテレーションで完了するシンプルな題材でしたが、数100回のイテレーションを要する複雑なアプリケーション開発にも挑戦してみたいと考えています。

今回開発したリポジトリは以下で公開しています。（予告なく公開停止する場合があります）

@[og](https://github.com/hironori-maruoka/kiro-ralph)

[^1]: 16x Engineer. [LLM Context Management Guide: Performance degrades with more context](https://eval.16x.engineer/blog/llm-context-management-guide#performance-degrades-with-more-content).
[^2]: The Ralph Wiggum Loop from 1st principles (by the creator of Ralph). [YouTube](https://www.youtube.com/watch?v=4Nna09dG_c0).
[^3]: AIHero.dev. [Getting Started with Ralph: Create your script](https://www.aihero.dev/getting-started-with-ralph).
