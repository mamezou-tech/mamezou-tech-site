---
title: "【アジャイルFAQ 今日は実験室】BMADを動かしてみる——環境づくりから「AIだけ」と「人が答える」の比べ方まで（後編・手順編）"
author: tomohiro-fujii
date: 2026-11-11
tags: [スクラム, アジャイル, アジャイル開発, 生成AI, AI, BMAD, Claude Code]
---

&emsp;この記事を読んでいただきありがとうございます。アジャイルグループに所属する、藤井智弘です。
&emsp;前編では、BMAD Method（以下、BMAD）を「AIいいなり」を心配する立場から試し、その評価を書きました。後編は、その実験を**手元で再現するための手順書**です。
&emsp;扱うのは前編と同じく、分析と計画の段階（「何を作るか」が決まる手前）までです。コードを書かせる手順は扱いません。

## この記事でやること

1. 開発コンテナを用意し、その中に Claude Code と BMAD を入れる
2. 会話と文書を日本語にし、呼び名を決める
3. 実験1：要望の一文だけを渡し、AIだけで製品概要と要求仕様（PRD）を作らせる
4. 実験2：AIの問いに人が答えながら、製品概要を作る
5. 2つの結果を並べて、「人が確かめるべきこと」を読み取る

&emsp;手順は、2026年11月時点の **BMAD v6.12.4（安定版）** と Claude Code で確かめました。BMADは版の変化が速く、プレビュー版のV7ではコマンドの体系そのものが違います。版は固定して試してください。

## 1. 準備するもの

| 項目 | 今回使ったもの |
|---|---|
| OS | macOS |
| コンテナの実行環境 | OrbStack（Docker Desktop でも可） |
| 開発コンテナを動かす道具 | VS Code の Dev Containers 拡張機能、または devcontainer CLI |
| Claude のアカウント | Claude のサブスクリプション（Claude Code が使えるもの） |

&emsp;Node.js、Python、uv、Claude Code は、すべてコンテナの中に入れます。

&emsp;ただし、手元の Mac にも `~/.claude` フォルダと `~/.claude.json` ファイルが必要です（次の手順で、この2つをコンテナと共有するためです）。どちらもない場合は、先に Mac で Claude Code を一度起動しておいてください。devcontainer CLI を使う場合は、`npm i -g @devcontainers/cli` で入れておきます。

## 2. 開発コンテナを用意する

&emsp;BMADは `npx` でインストールし、Python のスクリプトも使います。試すたびに手元の環境が汚れないよう、開発コンテナの中で動かします。作業用のフォルダに `.devcontainer/` を作り、次の2つのファイルを置きます。

**`.devcontainer/Dockerfile`**

```dockerfile
FROM mcr.microsoft.com/devcontainers/typescript-node:22
# Node.js 22（BMAD v6.12 は 20.12 以上が必要）、git、zsh が入っている

# Claude Code をコンテナ内に入れる
RUN npm install -g @anthropic-ai/claude-code

USER node
```

**`.devcontainer/devcontainer.json`**

```json
{
  "name": "bmad-lab",
  "build": { "dockerfile": "Dockerfile" },
  "features": {
    "ghcr.io/devcontainers/features/python:1": { "version": "3.12" },
    "ghcr.io/va-h/devcontainers-features/uv:1": {}
  },
  "remoteUser": "node",
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/node/.claude,type=bind",
    "source=${localEnv:HOME}/.claude.json,target=/home/node/.claude.json,type=bind"
  ],
  "customizations": {
    "vscode": {
      "extensions": ["anthropic.claude-code"],
      "settings": { "terminal.integrated.defaultProfile.linux": "zsh" }
    }
  }
}
```

&emsp;ポイントは `mounts` です。手元の `~/.claude` をコンテナと共有しておくと、Claude Code のログイン情報がコンテナの外に残ります。コンテナを作り直しても、ログインし直さずに済みます。
&emsp;VS Code でこのフォルダを開き、「Reopen in Container」を選ぶとコンテナが起動します。ターミナルから起動する場合は、次のとおりです。

```bash
devcontainer up --workspace-folder .
devcontainer exec --workspace-folder . zsh   # コンテナの中のシェルに入る
```

&emsp;最初の起動では Python を組み立てるため、数分かかります。以降の手順は、すべてコンテナの中のターミナルで行います。

## 3. Claude Code にログインする

&emsp;コンテナの中で `claude` を起動し、`/login` と入力して「Claude account with subscription」を選びます。つまずきやすい点が2つあります。

- **URLのコピーが途中で切れる**：コンテナからはブラウザを開けないので、ログイン用のURLが画面に表示されます。とても長く、画面の幅で折り返されるため、選択してコピーすると途中で切れがちです。切れたURLを開くと「無効な OAuth リクエストです」と表示されます。ターミナルを十分に広げてURLを1行に収めてからコピーしてください
- **コードを別の画面に貼ってしまう**：承認後にブラウザに表示されるコードは、URLを発行した Claude Code の画面でしか使えません。別のターミナルの Claude Code に貼ると「That code wasn't accepted」と表示されます

&emsp;「Login successful」と出たら完了です。続けて聞かれるフォルダの信頼では「Yes, I trust this folder」を選びます。既定の「No, exit」のまま Enter を押すと、Claude Code が終了してしまいます。

## 4. BMADをインストールする

&emsp;作業用のフォルダ（ここでは `trials/support-site`）を作り、BMADを入れます。対話式なら次のコマンドで、AIツールに Claude Code、モジュールに bmm（BMad Method）を選びます。

```bash
mkdir -p trials/support-site && cd trials/support-site
npx bmad-method@6.12 install
```

&emsp;毎回同じ設定で入れたい場合は、選択肢をオプションで渡せます。

```bash
npx -y bmad-method@6.12 install --yes --tools claude-code --modules bmm \
  --communication-language Japanese --document-output-language Japanese \
  --directory "$PWD"
```

&emsp;インストールが終わると、フォルダの中に次のものができます。

| 場所 | 中身 |
|---|---|
| `.claude/skills/bmad-*` | Claude Code から呼び出すスキル（BMADの各役割と手順の指示書） |
| `_bmad/` | 設定とスクリプト。`_bmad/custom/` は利用者が上書きするための場所 |
| `_bmad-output/` | 成果物の置き場所。計画の文書は `planning-artifacts/` に入る |

## 5. 会話と文書を日本語にし、呼び名を決める

&emsp;インストール時に `--communication-language Japanese` を指定していれば、BMADが実際に読む設定は日本語になります。ただし、紛らわしい点が2つあります。

- インストーラーが書き出す基本の設定ファイル（`_bmad/config.toml`）を開くと、会話の言語が `English` と書かれています。実際に使われる値は別のファイルから決まるので、これだけを見て慌てる必要はありません
- エージェントがあなたを呼ぶ名前は、既定ではOSのユーザー名になります。開発コンテナの中では「Node」と呼ばれます

&emsp;基本の設定ファイルは、再インストールのたびに上書きされるので、直接は書き換えません。代わりに、上書き用の `_bmad/custom/config.toml` の末尾に、次を足して固定しておくと安心です。

```toml
[core]
user_name = "Tom"
communication_language = "Japanese"
document_output_language = "Japanese"
project_name = "support-site"
```

&emsp;`project_name` は、成果物のフォルダ名に使われます。実際に使われる設定は、次のコマンドで確かめられます。

```bash
uv run _bmad/scripts/resolve_config.py --project-root .
```

&emsp;出力の先頭が、次のようになっていれば成功です。

```json
{
  "core": {
    "user_name": "Tom",
    "communication_language": "Japanese",
    "project_name": "support-site",
    "document_output_language": "Japanese",
    "output_folder": "_bmad-output"
  },
```

&emsp;最後に Claude Code を起動して `/bmad-help` を呼び、BMADのスキルの案内が返ってくれば、準備は完了です。

### 手順4と5を、1本のスクリプトで

&emsp;前提の確認、インストール、設定の固定、確認までを1本にまとめると、次のようになります。開発コンテナの中で `bash setup_bmad.sh trials/support-site Tom` のように実行します（2つ目の引数が呼び名です）。新しいフォルダで最後まで通ることを確かめてあります。

```bash
#!/usr/bin/env bash
# BMAD v6.12 の実験環境をつくる（開発コンテナの中で実行）
#   bash setup_bmad.sh [作業フォルダ] [呼び名]
#   例：bash setup_bmad.sh trials/support-site Tom
set -euo pipefail
DIR="${1:-trials/support-site}"
NAME="${2:-User}"
BMAD_VERSION="${BMAD_VERSION:-6.12}"

echo "== 前提の確認"
ok=1
check() {
  if command -v "$1" >/dev/null 2>&1; then
    echo "  ✓ $1 $("$1" --version 2>/dev/null | head -1)"
  else
    echo "  ✗ $1 が見つかりません"; ok=0
  fi
}
check node; check python3; check uv; check git; check claude
[ "$ok" = 1 ] || { echo "足りないものを入れてから、もう一度実行してください"; exit 1; }

echo "== BMAD v${BMAD_VERSION} をインストール：$DIR"
mkdir -p "$DIR"
npx -y "bmad-method@${BMAD_VERSION}" install --yes --tools claude-code --modules bmm \
  --communication-language Japanese --document-output-language Japanese \
  --directory "$(cd "$DIR" && pwd)"

echo "== 会話と文書を日本語に固定（_bmad/custom/config.toml）"
cd "$DIR"
if ! grep -q '^\[core\]' _bmad/custom/config.toml 2>/dev/null; then
  cat >> _bmad/custom/config.toml <<EOF

[core]
user_name = "${NAME}"
communication_language = "Japanese"
document_output_language = "Japanese"
project_name = "$(basename "$PWD")"
EOF
fi

echo "== 設定の確認"
uv run _bmad/scripts/resolve_config.py --project-root . \
  | grep -E '"(user_name|communication_language|document_output_language|project_name)"'
echo "完了。次は：cd $DIR && claude を起動し、/bmad-help を呼んでください"
```

## 6. 今回使うスキル

&emsp;v6.12.4 には30ほどのスキルがあります。分析と計画の段階で、今回使うのは次のものです。

| スキル | 役割 | 何をするか | 成果物 |
|---|---|---|---|
| `bmad-help` | 案内 | いまの状態を見て、次に使うスキルを勧める | なし |
| `bmad-product-brief` | アナリスト | 対話で要望を引き出し、製品概要を作る | `briefs/…/brief.md` |
| `bmad-prd` | PM | 製品概要などから要求仕様を作る | `prds/…/prd.md` |
| `bmad-prfaq` | アナリスト | 完成時のプレスリリースから逆算して構想を試す（製品概要の代わり） | PRFAQ |
| `bmad-advanced-elicitation` | 随時 | プレモーテムなどの手法で、下書きをさらに叩く | 改訂した下書き |

&emsp;どのスキルも、成果物と一緒に記録ファイル（`.memlog.md`）を作り、決めたこと・推測したこと・取り下げたことを一行ずつ残します。

## 7. 実験1：AIだけで通す（ヘッドレス）

&emsp;製品概要とPRDのスキルには、人に質問せず、手元の情報と推測で文書を仕上げる進め方（ヘッドレス）があります。これを使って、「人が何も答えなかったら、どんな文書ができるか」を見ます。
&emsp;Claude Code を `-p`（一回だけ実行して終わる形）で起動し、スキルを呼び出します。

```bash
claude -p --dangerously-skip-permissions \
'/bmad-product-brief ヘッドレスで実行してください（headless: true、intent: create）。
入力はこの一文だけです。ほかの情報はありません。
「当社製品の利用者向けのサポートサイトを作り、顧客の利便性を最大化したい。」
人に質問せず、スキルの Headless Mode の指示に従って製品概要を完成させ、最後に JSON の状態を返してください。' \
  < /dev/null > headless_brief.log 2>&1
```

&emsp;`--dangerously-skip-permissions` は、ファイルの書き込みやコマンドの実行を、確認なしに許す指定です。人に聞かずに最後まで走らせるために付けていますが、使ってよいのは、今回のように**使い捨てのコンテナの中だけ**にしてください。
&emsp;今回は約6分で終わり、次の3つのファイルができました。

```text
_bmad-output/planning-artifacts/briefs/brief-support-site-2026-11-09/
├── brief.md      製品概要
├── addendum.md   製品概要に入りきらない材料（調査の要点など）
└── .memlog.md    決定・推測・調査結果の記録
```

&emsp;フォルダ名の日付は、コンテナの時刻（協定世界時）で付きます。日本時間の朝に実行すると、前日の日付になります。
&emsp;**次の実験と混ざらないよう、ここでフォルダの名前を変えておきます。** 実験2の製品概要も同じ日付のフォルダ名を使おうとするからです。

```bash
mv _bmad-output/planning-artifacts/briefs/brief-support-site-2026-11-09 \
   _bmad-output/planning-artifacts/briefs/brief-support-site-headless
```

&emsp;続けて、この製品概要からPRDを作らせます。

```bash
B=_bmad-output/planning-artifacts/briefs/brief-support-site-headless
claude -p --dangerously-skip-permissions \
"/bmad-prd ヘッドレスで実行してください（headless: true、intent: create）。
入力は製品概要 $B/brief.md と $B/addendum.md だけです。人に質問せず、スキルの references/headless.md の指示に従って PRD を完成させ、最後に JSON の状態を返してください。" \
  < /dev/null > headless_prd.log 2>&1
```

&emsp;今回は約13分かかり、586行のPRDができました。`prds/prd-support-site-…/` には、PRDと記録ファイルのほかに、スキル自身が書いたレビュー（`review-rubric.md`、`review-polish-*.md`）と、入力の製品概要との突き合わせの結果（`reconcile-brief.md` など）も残ります。
&emsp;ログの最後には、JSONで状態が返ってきます。ここがいちばん大事な出力です（以下は抜粋）。

```json
{
  "status": "partial",
  "intent": "create",
  "open_questions": [
    "★Q1 製品は何か（業務ソフトウェア／消費者向け／機器）。利用者の人数と職種",
    "Q2 現状の問い合わせ件数・内訳・解決までの時間（目標値と最初の記事の選び方が決まる）",
    "★Q3 既存の FAQ・マニュアル・問い合わせ窓口は何で、誰が管理しているか。問い合わせ窓口から何を取り込めるか",
    "…（全10件）"
  ],
  "assumptions": [
    "製品は業務ソフトウェアで、利用者は製品の専門家ではない業務担当者",
    "…（全12件）"
  ]
}
```

&emsp;`status` が `complete`（完了）ではなく `partial`（人の確認が要る）になっていること、そして `open_questions`（人が答えるべき問い）と `assumptions`（推測で置いた前提）が並んでいることを確かめてください。**AIだけで作った文書の価値は、本文よりも、この2つの一覧にあります。**

### 実験1を、1本のスクリプトで

&emsp;製品概要、フォルダ名の変更、PRDまでを1本にまとめたものです。お題を変えたいときは、`REQUEST="（あなたの要望）" bash run_experiment1.sh` のように、要望の一文を差し替えて実行します。ログは `trials/support-site/logs/` に残ります。実行するのは、`trials/` がある作業フォルダの最上位からです。

&emsp;やり直すときは、先に古い `brief-support-site-headless` フォルダを消すか名前を変えてください。残したままだと、新しい製品概要がその中に入れ子で移されてしまいます。

```bash
#!/usr/bin/env bash
# 実験1：要望の一文だけを渡し、AIだけ（ヘッドレス）で製品概要とPRDを作らせる
# 開発コンテナの中で実行：bash run_experiment1.sh [作業フォルダ]
# お題を変えるとき：REQUEST="（あなたの要望）" bash run_experiment1.sh
set -euo pipefail
cd "${1:-trials/support-site}"
REQUEST="${REQUEST:-当社製品の利用者向けのサポートサイトを作り、顧客の利便性を最大化したい。}"
BRIEFS=_bmad-output/planning-artifacts/briefs
HEADLESS="$BRIEFS/brief-$(basename "$PWD")-headless"
mkdir -p logs

echo "== 1/3 製品概要をAIだけで作る（数分かかります）"
claude -p --dangerously-skip-permissions \
"/bmad-product-brief ヘッドレスで実行してください（headless: true、intent: create）。
入力はこの一文だけです。ほかの情報はありません。
「${REQUEST}」
人に質問せず、スキルの Headless Mode の指示に従って製品概要を完成させ、最後に JSON の状態を返してください。" \
  < /dev/null > logs/headless_brief.log 2>&1

echo "== 2/3 実験2と混ざらないよう、フォルダ名を変える"
SRC=$(ls -dt "$BRIEFS"/brief-* | grep -v -- '-headless$' | head -1)
mv "$SRC" "$HEADLESS"
echo "   $SRC → $HEADLESS"

echo "== 3/3 その製品概要から、PRDをAIだけで作る（十数分かかります）"
claude -p --dangerously-skip-permissions \
"/bmad-prd ヘッドレスで実行してください（headless: true、intent: create）。
入力は製品概要 $HEADLESS/brief.md と $HEADLESS/addendum.md だけです。人に質問せず、スキルの references/headless.md の指示に従って PRD を完成させ、最後に JSON の状態を返してください。" \
  < /dev/null > logs/headless_prd.log 2>&1

echo "完了。最後の JSON（status、open_questions、assumptions）を確認してください："
echo "  tail -60 $PWD/logs/headless_prd.log"
```

## 8. 実験2：人が答えて通す

&emsp;同じ要望で、今度はAIの問いに人が答えながら製品概要を作ります。Claude Code を普通に起動して、対話で進めます。

```bash
claude
```

&emsp;スキルを呼び出して要望を書きます。実験1のフォルダを再開しないよう、一言添えます。

```text
/bmad-product-brief 製品概要を新しく作成したいです（既存の briefs/brief-support-site-headless は別の実験なので再開しないでください）。

当社製品の利用者向けのサポートサイトを作り、顧客の利便性を最大化したい。
```

&emsp;アナリストは、次の順で進めてきます。

1. **頭の中を全部出す**：製品、利用者、困りごと、きっかけを、順番を気にせず書くよう求められます。手元の資料の有無も聞かれます
2. **ほかにないか**：関わる人、過去の失敗、避けたいこと
3. **進め方を選ぶ**：「速い道（Fast path）」（残りを数問にまとめて聞き、推測の印付きで一気に下書き）か、「じっくりの道（Coaching path）」（一節ずつ、押し返されながら書く）か。日本語で動かすと、エージェントはこの2つを「速い道」「じっくりの道」のように訳して示してきます
4. **下書きと押し返し**：いちばん弱い点を問い返され、推測した箇所の正誤も聞かれます
5. **仕上げ**：記録ファイルの各項目の反映先を確かめ、文書の見直しをかけて完成です

&emsp;答えられない問いには「不明」「いまは決められない」と答えて構いません。アナリストは、推測の印付きで埋めるか、「分かっていないこと」として残します。**分からないことを分からないと言える**のが、この進め方のいちばんの使いどころです。途中で調査の結果が届くこともあります。アナリストが裏で Web 調査を走らせているからです。
&emsp;今回は「速い道」で7往復でした（記録のため `claude -p --resume` で1往復ずつ進めましたが、普段は対話で十分です）。この製品概要からPRDに進むときは、勧められるとおり新しい会話で `bmad-prd` を始め、実験1のPRDのフォルダと名前がぶつからないよう注意してください。

## 9. 結果の読み方

&emsp;前編では、次の3つの観点で評価しました。

| 観点 | 主に見る実験 | 見るもの |
|---|---|---|
| 1. いいなりになると、どうなるか | 実験1 | 推測の印、未確認の問い、それらの上に積み上がった文書の量 |
| 2. AIとの対話は、成立するか | 実験2 | 聞いたことの言い直し、答えに応じて次の問いが変わるか、「不明」をどう扱うか |
| 3. 対話は、人のアイディアを洗練させたか | 実験1と2の比較 | お題の書き換え、見立ての扱い、AIの提案を人が直した記録 |

&emsp;2つの実験ができたら、次の順で読み比べます。①が観点1、②と④が観点2と3、③が3つすべてに効きます。

**① 推測の印を数えて、一覧にする**

```bash
cd trials/support-site/_bmad-output/planning-artifacts   # 作業フォルダの最上位から
grep -n "\[ASSUMPTION" briefs/brief-support-site-headless/brief.md
grep -c "\[ASSUMPTION" prds/*/prd.md
```

&emsp;今回、実験1の製品概要には5か所、PRDには31か所ありました。**この数が、人が確かめるべきことの数**です。なお、製品概要の grep には「推定で補った箇所には `[ASSUMPTION]` を付け…」という説明の文も1行ヒットするので、その分は差し引いて数えます。

&emsp;数や行数、所要時間は、実行するたびに変わります。検証のためにもう一度通したときは、PRDが482行、推測の印が27か所でした。記事の数字は目安と考えてください。

**② 記録ファイルで、取り下げられた推測を見る**

&emsp;`.memlog.md` の各行には、`decision`（決定）、`assumption`（推測）、`override`（取り下げ・上書き）、`insight`（調査の発見）、`gap`（分かっていないこと）などの種類が付いています。

```bash
grep "^- (assumption)" briefs/*/.memlog.md
grep "^- (override)"   briefs/*/.memlog.md
```

&emsp;記録ファイルの中身は、たとえば次のようになっています（今回の実物から抜粋）。実験1では推測と調査の発見が、実験2では人の答えによる決定と取り下げが並びます。

```text
# 実験1（AIだけ）の記録から
- (assumption) 製品は B2B の業務ソフトウェア（パッケージ/SaaS）と仮定。根拠なし：『当社製品の利用者』『顧客』の語のみ。B2C や物理製品なら構成が変わる
- (assumption) 現状の問い合わせ窓口は電話・メール中心で、FAQ/マニュアルは分散または PDF と仮定
- (insight) 調査：自己サービスで完全解決は14%、最大の失敗理由は『関連情報が見つからない』43%（Gartner 2024）。サイトの核は記事の量より『見つかること』

# 実験2（人が答える）の記録から
- (decision) 現状の窓口：簡単なサポートサイトが既にある。問い合わせはメール・電話・担当営業経由
- (decision) 今のサイトが役立たない理由：記事が足りない（c）・探しにくい（b）とユーザーは見ている（確かめた結果ではなく見立て）
- (decision) 言い換え（AIの提案、ユーザー未確認）：『サイトを作る』ではなく『操作の質問を、利用者が人に聞かずに短時間で解決でき、それでも残る質問は開発者でない窓口で受ける』状態をつくる
- (override) 『AI自動応答を最初の版に含めない』の仮定を取り下げ、AIの活用を最初の版の範囲に入れた（ユーザー回答：AIも活用したい）。使い方は PRD で決める（候補：記事をもとにした回答／記事の下書き作成／一次窓口の補助）
```

&emsp;実験1の1行目と2行目が、実験2の1行目で覆されていることが分かります。こうして記録を突き合わせると、前編の表がそのまま作れます。

&emsp;実験2で `override` になっている行は、AIの推測を人の答えが覆した記録です。今回は、「最初の版にAIによる自動応答は含めない」という推測が、私の「AIも活用したい」の一言で取り下げられていました。

**③ 実験1の推測と、実験2の答えを突き合わせる**

&emsp;実験1の `assumptions` と `open_questions` を左に、実験2で人が答えた内容を右に並べます。前編の表は、この突き合わせから作りました。当たった推測、外れた推測、問いとして残したのが正解だったもの、の3つに分けると、道具の振る舞いが見えてきます。

**④ AIの提案と、人の決定を分ける**

&emsp;実験2の製品概要を読み、「人が答えたこと」と「AIが提案して、人がまだ了承していないこと」を分けます。今回は、アナリスト自身が、冒頭の言い換えを「私の提案で、まだ了承をもらっていない」と申告してきました。了承していない提案は、決定として次の工程に渡さないでください。

## 10. つまずいたところ

| 症状 | 原因と対処 |
|---|---|
| ブラウザで「無効な OAuth リクエストです」 | ログインURLのコピーが途中で切れている。ターミナルを広げて1行に収めてからコピーする |
| 「That code wasn't accepted」 | URLを発行したのと別の Claude Code にコードを貼った。発行した画面に貼る |
| 初回起動で Claude Code が終わってしまう | フォルダの信頼の確認で、既定の「No, exit」を選んだ。起動し直して「Yes」を選ぶ |
| エージェントに「Node」と呼ばれる | 呼び名の既定はOSのユーザー名。`_bmad/custom/config.toml` で `user_name` を設定する |
| `_bmad/config.toml` に `English` と書かれている | 実際に使われる値は別に決まる。`resolve_config.py` の出力で確かめる |
| 成果物のフォルダの日付が前日になる | コンテナの時刻が協定世界時。実害はないが、記録するときは注意 |
| 実験2が実験1の続きを始めようとする | 同じ日付のフォルダ名を使うため。実験1のフォルダ名を変えておき、呼び出し時にも一言添える |

## おわりに

&emsp;手順そのものは思ったより簡単で、インストールに数分、AIだけの実験に20分ほどです。いちばん時間がかかったのは、実験2でAIの問いに私が答える時間でした。それこそが、この道具の正しい使い方なのだと思います。
&emsp;お勧めは、AIだけの実験で出てきた `open_questions` と `assumptions` の一覧を手に、人が答える実験に臨むことです。自分が何を分かっていないのかが、驚くほどはっきりします。ぜひ、手元のお題で試してみてください。
&emsp;なお、今回扱ったのは分析と計画の段階までです。連載の本線から番外編、実験室と寄り道が多くなってきたので、BMADでのそれ以降の行程は後日折を見て書こうかと思います。

---

*前編：「『AIいいなり開発』への不安を、BMADは解消してくれるのか？」／次回: 「POが多忙でチームに来ません」（12/1）／本編の連載一覧は第1回をご覧ください。*
