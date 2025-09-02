---
title: CCPMツール編：現場で動く！スプレッドシート×Apps Scriptで“本物のCCPM”を回す方法
author: makoto-takahashi
date: 2025-05-30
tags: [ProjectManagement, プロジェクト管理, CCPM, TOC]
image: true
---

# はじめに
前回の記事「[CCPM実践編](https://developer.mamezou-tech.com/blogs/2025/05/20/ccpm_practice_buffer_half_deadline_critical_chain_transformation/)」では、CCPMによる現場変革の効果を紹介しました。
今回はその裏側、どうやって現実的なCCPMスケジュールを作のかについてツールを交えて紹介します。

:::info
**この記事はクリティカルチェーンプロジェクトマネジメントシリーズ記事の一部です**

1. [CCPM理論編：CCPM基礎のTOCを学ぶ](https://developer.mamezou-tech.com/blogs/2025/05/09/ccpm_theory_bottleneck_is_why_learn_toc/)
2. [CCPM実践編：クリティカルチェーンで現場が変える](https://developer.mamezou-tech.com/blogs/2025/05/20/ccpm_practice_buffer_half_deadline_critical_chain_transformation/)
3. CCPMツール編：ツールでCCPMを回す方法

👉 初めて読む方は [CCPM理論編から読む](https://developer.mamezou-tech.com/blogs/2025/05/09/ccpm_theory_bottleneck_is_why_learn_toc/) のがおすすめです。
:::

# 1. 背景：なぜ専用ツールではなく、スプレッドシート＋GASなのか？
CCPM対応の商用ツールは、たしかに強力ですが、現場に導入しようとすると以下のような壁にぶつかります。
- ライセンス費用が高い
- 機能が多すぎて現場に浸透しにくい
- 社内情シス部門との調整コストがかかる

そのため、私は次のような方針でツールを自作することにしました。
| 要件            | 実現手段             |
| ------------- | ---------------- |
| 誰でもすぐに使える     | Googleスプレッドシート   |
| 自動スケジューリングしたい | Apps Script（GAS） |
| 現場で試行錯誤できる    | コードはすべて公開・改変可能に  |

これにより、最初は手軽に試せて、慣れてきたら現場にあわせてカスタマイズもできるというCCPMツールを作成してみました。

# 2. 実装したCCPM機能の概要
以下のような機能を、Googleスプレッドシート＋Apps Scriptで実装しました。
- タスクの依存関係に基づくスケジューリング
- 各リソースが「1日に1タスクのみ担当可能」という前提のリソース制約
- クリティカルチェーンの特定（リソース制約を含む）
- 合流バッファ（Feeding Buffer）の算出

 :::info:ポイント
 クリティカルチェーンの特定には、 **リソース競合を加味する必要がある** 点に注意が必要です。
 依存関係だけでクリティカルパスを出しても、現実には「リソースが足りずに遅れる」ことがあります。
 :::

# 3. スプレッドシート構成

## 入力シート
シート名：Tasks
上記名称でシートを作成してください。
このシートは、プロジェクト全体のタスク情報を記述するもので、CCPMスケジューラの基本データとなります。
| TaskID | TaskName         | Duration | Dependencies | Resource |
|--------|------------------|----------|--------------|----------|
| T1     | 〇〇機能を実装する     | 6        |              | Blue     |
| T2     | 〇〇機能テスト仕様書を作成する   | 6        |              | Yellow   |
| T3     | 〇〇機能テスト報告書を作成する   | 3        | T1,T2        | Red      |
| T4     | ✕✕機能を実装する      | 5        |              | Green    |
| T5     | ✕✕機能テスト仕様書を作成する    | 8        |              | Yellow   |
| T6     | ✕✕機能テスト報告書を作成する    | 3        | T4,T5        | Red      |
| T7     | 〇✕統合テスト報告書を作成する    | 6        | T3,T6        | Yellow   |

- **TaskID**：タスクの識別子。依存関係の参照に使用。
- **TaskName**：タスクの名称。関係者が理解しやすい表現を。
- **Duration**：所要作業日数（平日ベース）。
- **Dependencies**：先行タスクのID（カンマ区切り）。
- **Resource**：担当リソース。1日1タスクの制約あり。

以下のPERT図をもとに、入力シートのサンプルを示しています。

![PERT図](/img/ccpm/tool_pert_sample.png)

## スクリプト
スクリプトはGoogleスプレッドシートのメニュー「拡張機能」から「Apps Script」を選択することで編集できます。
選択すると別タブでApps Script編集画面が開きますので[６. スクリプトサンプル](#６-スクリプトサンプル)のスクリプトをコピーして貼り付けてください。
Apps Script編集画面で「保存」ボタンを押した後に、「実行」ボタンを押すと出力シートが生成されます。

## 出力シート
シート名：CCPM_Schedule
| TaskID | StartDay | EndDay | IsCritical | BufferDays | BufferType     | BufferFromTask |
| ------ | -------- | ------ | ---------- | ---------- | -------------- | -------------- |
| T1     | 1        | 6      | FALSE      |            |                |                |
| T2     | 1        | 6      | TRUE       |            |                |                |
| T3     | 7        | 9      | FALSE      |            |                |                |
| T4     | 1        | 5      | FALSE      |            |                |                |
| T5     | 7        | 14     | TRUE       |            |                |                |
| T6     | 15       | 17     | TRUE       | 2.5        | Feeding Buffer | T4             |
| T7     | 18       | 23     | TRUE       | 1.5        | Feeding Buffer | T3             |

- **TaskID**：元の Tasks シートで定義したタスクの識別子。
- **StartDay**：スケジュール上の開始日（プロジェクト開始日を1日目とする連番）。
- **EndDay**：スケジュール上の終了日（StartDay + Duration - 1）。
- **IsCritical**：このタスクがクリティカルチェーン上にある場合は TRUE。そうでない場合は FALSE。
- **BufferDays**：このタスクに関連して挿入されたバッファ日数（半分バッファルールに基づく）。
- **BufferType**：Feeding Buffer（合流バッファ）かどうかを示す。プロジェクトバッファは現時点では未実装。
- **BufferFromTask**：このバッファがどのタスクからの遅延吸収のために設定されたかを示す。

出力シートのサンプルを元にPERT図で表すと下図になります。
![合流バッファを挿入する](/img/ccpm/tool_add_feeding_buffer.png)
マルチタスクが排除され、クリティカルチェーンへ合流する直前に合流バッファ（灰色タスク）が追加されています。
これにより、サブチェーン側の遅れがクリティカルチェーンに影響しないよう吸収されます。

# 4. スクリプトのポイント解説
このApps Scriptは、以下の処理ステップで CCPMスケジュールの自動生成 を実現しています。

### ステップ1：タスク情報の読み込みと構造化
```javascript
const data = sheet.getDataRange().getValues();
```
- 入力シート Tasks からデータを取得し、TaskID、Duration、Dependencies、Resource をもとに、各タスクをオブジェクトとして格納。
- 自己依存や未定義の依存タスクがあるとエラーを出すよう安全対策も。
- dependents という逆参照リストも構築しておくことで、後のクリティカルチェーン探索が効率的になります。

### ステップ2：循環参照のチェック
```javascript
function detectCycle() { ... }
```
- 依存関係に循環（ループ）があるとCCPMの前提が崩れるため、スタックを使って巡回チェックを行います。
- 問題がある場合は明示的なエラーメッセージで停止。
- DAG（有向非巡回グラフ）でなければ、プロジェクトスケジュールは破綻します。これは必須バリデーション。

### ステップ3：リソース競合を考慮したスケジューリング
```javascript
function getNextAvailableDay(resource, after) { ... }
```
- 各リソースに対して「既に使われている日」を記録し、次に空いている日を検索。
- 依存関係が解決されたタスクから順に、可能な限り早くリソースを割り当ててスケジューリング。
- 「1リソース1日1タスク」の制約を守るためのロジックがここに詰まっています。
- 手作業では破綻しやすいリソース競合も、自動で吸収します。

### ステップ4：クリティカルチェーンの特定（依存＋リソース）
```javascript
function markCriticalChain() { ... }
```
- スケジュール上の最終日（最大EndDay）を持つタスクから、逆にたどって「遅延要因となっている道筋」を特定。
- 依存関係に加えて、リソース競合でスタートが遅れた場合も考慮して 実際の遅延チェーン（クリティカルチェーン） を構築します。
- 通常のクリティカルパスでは無視されがちな「リソース不足による待ち時間」も、ここではちゃんと加味されています。
- これが CCPMにおける真の“クリティカルチェーン”

### ステップ5：Feeding Buffer（合流バッファ）の自動挿入
```javascript
const bufferDays = Math.round(dep.duration * 0.5 * 10) / 10;
```
- クリティカルチェーンに合流する 非クリティカルタスク に対して、その遅延が主経路に影響しないよう 合流バッファ を設定。
- バッファの長さは「遅延側タスクの50%」とする、半分バッファルール を適用。
- 「最悪に備えつつ、やりすぎない」バッファ設計で、実践的なスケジュールを維持できます。

### ステップ6：出力シートへの書き込み
```javascript
resultSheet.getRange(1, 1, output.length, output[0].length).setValues(output);
```
- スケジューリング結果を CCPM_Schedule シートに出力。
- クリティカルチェーン情報、バッファ情報などがすべて含まれるため、このままPERT図に展開可能。

## まとめ：このスクリプトで何ができるのか？
このスクリプトは、以下を 完全自動 で実行します：
- 依存関係とリソース制約を満たすスケジュールの計算
- 現実的なクリティカルチェーンの特定
- 合流バッファの挿入による納期保証

つまり、“形だけのCCPM”ではなく、 **現場に効くCCPM** を、手軽に試せるツールとして提供しています。

# ５. おわりに
このツールはまだ発展途上ですが、「とにかく現場で使ってみる」ことが重要です。
- 小さな案件で試す
- ルールや構成を現場に合わせて調整する
- 成功体験を積む

こうして徐々に導入範囲を広げることで、 **形だけではない“活きたCCPM”** が根付いていきます。

# ６. スクリプトサンプル
作成したスクリプトの全量を掲載します。

```javascript
function scheduleCCPM() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Tasks");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const taskIndex = Object.fromEntries(headers.map((h, i) => [h, i]));
  const tasks = {};

  // タスク定義読み込み + 自己依存チェック
  rows.forEach(row => {
    const id = row[taskIndex['TaskID']];
    const duration = Number(row[taskIndex['Duration']]);
    const deps = row[taskIndex['Dependencies']] ? row[taskIndex['Dependencies']].toString().split(',').map(s => s.trim()) : [];
    const resources = row[taskIndex['Resource']] ? row[taskIndex['Resource']].toString().split(',').map(s => s.trim()) : [];

    if (deps.includes(id)) {
      throw new Error(`❌ タスク "${id}" は自身に依存しています。`);
    }

    tasks[id] = {
      id,
      duration,
      deps,
      dependents: [], 
      resources,
      start: 0,
      end: 0,
      isCritical: false,
    };
  });

  // dependents 構築
  for (const id in tasks) {
    for (const depId of tasks[id].deps) {
      if (tasks[depId]) {
        tasks[depId].dependents.push(id);
      }
    }
  }

  // 循環参照チェック
  function detectCycle() {
    const visited = new Set();
    const stack = new Set();

    function visit(id) {
      if (stack.has(id)) {
        throw new Error(`❌ 循環参照が検出されました: ${id}`);
      }
      if (visited.has(id)) return;
      stack.add(id);
      visited.add(id);
      tasks[id].deps.forEach(visit);
      stack.delete(id);
    }

    for (let id in tasks) {
      visit(id);
    }
  }

  detectCycle();

  // リソーススケジュール
  const resourceSchedule = {};

  function getNextAvailableDay(resource, after) {
    const schedule = resourceSchedule[resource] || [];
    let day = after;
    while (schedule.some(([s, e]) => day >= s && day <= e)) day++;
    return day;
  }

  function reserveResource(resource, start, end) {
    if (!resourceSchedule[resource]) resourceSchedule[resource] = [];
    resourceSchedule[resource].push([start, end]);
  }

  // スケジューリング処理（依存関係 + リソース競合を考慮）
  const resolved = new Set();
  while (resolved.size < Object.keys(tasks).length) {
    for (let id in tasks) {
      const task = tasks[id];
      if (resolved.has(id)) continue;
      if (task.deps.every(d => resolved.has(d))) {
        const depEnd = Math.max(0, ...task.deps.map(d => tasks[d].end));
        let start = depEnd + 1;
        for (const r of task.resources) {
          const available = getNextAvailableDay(r, start);
          start = Math.max(start, available);
        }
        task.start = start;
        task.end = start + task.duration - 1;
        for (const r of task.resources) {
          reserveResource(r, task.start, task.end);
        }
        resolved.add(id);
      }
    }
  }

  // クリティカルチェーン特定（依存＋リソース競合を考慮）
    function markCriticalChain() {
    const maxEnd = Math.max(...Object.values(tasks).map(t => t.end));
    const endTasks = Object.values(tasks).filter(t => t.end === maxEnd);
    const visited = new Set();

    function visit(task) {
      if (visited.has(task.id)) return;
      task.isCritical = true;
      visited.add(task.id);

      // 依存による遅延
      for (const depId of task.deps) {
        const dep = tasks[depId];
        if (!dep) continue;
        if (dep.end + 1 === task.start) {
          visit(dep);
        }
      }

      // リソース競合による遅延の特定（リソースごとに前のタスクを調べる）
      for (const r of task.resources) {
        const intervals = (resourceSchedule[r] || []).filter(([s, e]) => e < task.start);
        for (const [s, e] of intervals) {
          for (const t of Object.values(tasks)) {
            if (t.resources.includes(r) && t.start === s && t.end === e && !visited.has(t.id)) {
              if (t.end >= Math.max(...task.deps.map(d => tasks[d]?.end || 0))) {
                visit(t);
              }
            }
          }
        }
      }
    }

    endTasks.forEach(visit);
  }

  markCriticalChain();

  // Feeding Buffer（タスク期間の半分で設定）
  const feedingBuffers = [];
  for (const t of Object.values(tasks)) {
    if (!t.isCritical) continue;
    for (const depId of t.deps) {
      const dep = tasks[depId];
      if (!dep || dep.isCritical) continue;
      const bufferDays = Math.round(dep.duration * 0.5 * 10) / 10;
      feedingBuffers.push({
        mergeTaskId: t.id,
        bufferDays: bufferDays,
        fromTask: dep.id
      });
    }
  }

  // 出力生成
  const output = [
    ["TaskID", "StartDay", "EndDay", "IsCritical", "BufferDays", "BufferType", "BufferFromTask"]
  ];
  for (const t of Object.values(tasks)) {
    const buffer = feedingBuffers.find(fb => fb.mergeTaskId === t.id && fb.fromTask === t.id) ||
                   feedingBuffers.find(fb => fb.mergeTaskId === t.id);
    output.push([
      t.id,
      t.start,
      t.end,
      t.isCritical ? "TRUE" : "FALSE",
      buffer ? buffer.bufferDays : "",
      buffer ? "Feeding Buffer" : "",
      buffer ? buffer.fromTask : ""
    ]);
  }

  // 出力シートに書き込み
  const resultSheetName = "CCPM_Schedule";
  let resultSheet = ss.getSheetByName(resultSheetName);
  if (resultSheet) ss.deleteSheet(resultSheet);
  resultSheet = ss.insertSheet(resultSheetName);
  resultSheet.getRange(1, 1, output.length, output[0].length).setValues(output);
}
```
