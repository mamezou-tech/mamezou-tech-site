---
title: 自作のWeb UIでClaude Codeと会話したくてmodを試してみた
author: kiyohito-ito
date: 2026-12-10
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2026/
tags: [Claude Code, mods, AIエージェント, 生成AI, advent2026]
image: true
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2026](/events/advent-calendar/2026/)第10日目の記事です。

こんにちは、デジタルアーキテクチャ事業部の伊藤です。

先日、[AI-DLC](https://github.com/awslabs/aidlc-workflows)というツールを使って、中身をまったく知らない既存のアプリに、Excelをアップロードして明細を登録する機能を足してもらいました。フロントエンドからバックエンドまで3時間ほどでできあがり、感動しました！

作るところはAIエージェントに任せられます。その分AIエージェントの作ったものを人が確かめる作業は増えています。たとえばAIエージェントが出したPRのレビューです。GitHubのPRで行にコメントを付ければどこの話かは伝わりますが、やりとりはレビューコメントの往復になります。ターミナルのClaude Codeなら会話で聞ける代わりにどのファイルのどの行の話かを毎回説明しなければなりません。どちらでもやりとりしにくいと感じていました。

ターミナルでのレビューに困ってAIエージェントの変更をレビューするための[hunk](https://github.com/modem-dev/hunk)も使ってみました。hunkはターミナルで差分を読み、行の横にAIエージェントの注釈を並べられる便利なツールです。ただ、扱えるのは変更した差分だけでAIと会話しながら進めたい私の使い方には合わず、すぐにやめてしまいました。

そんなとき思いつきました。ターミナルで使っている会話から作業に合わせたWeb UIを起動し、同じ会話でやりとりできたらどうだろう。Web UIで行を選んで聞き、納得したらそのまま「直して」と頼めます。

![Web UIで聞いたことがターミナルのClaude Codeの会話に入り、そのあとWeb UIから「直して」とだけ頼むとAIがその行を直す](/img/blogs/2026/1210_ui-agent/same-conversation.svg)

これができればレビューがずっと楽になるはずです。探してみると、AIエージェントの計画やコードをWeb UIでレビューできる[Plannotator](https://github.com/backnotprop/plannotator)がWeb UIと今の会話をつないでいました。つなぐところはPlannotatorを参考にさせてもらいました。

2026年11月19日時点の情報をもとにAIエージェントのClaude Codeが調べて試しました。別のAIエージェントが誤りを探し、私もざっと目を通しています。採用する際はご自身の環境で確かめてください。

## 何ができればよい？

作りたいのはWeb UIとターミナルのClaude Codeが同じ1つの会話を見る形です。そのためにWeb UIでできればよいことは次の6つだと考えました。

1. [Web UIからClaude Codeと会話する](#1-web-uiからclaude-codeと会話する)
2. [Claude CodeからWeb UIを操作する](#2-claude-codeからweb-uiを操作する)
3. [Claude CodeからWeb UIで質問する](#3-claude-codeからweb-uiで質問する)
4. [Claude Codeが作業中でも別の質問に返事をする](#4-claude-codeが作業中でも別の質問に返事をする)
5. [Web UIからコンパクトまたはクリアする](#5-web-uiからコンパクトまたはクリアする)
6. [Claude Codeと入力キー（送信と改行）を合わせる](#6-claude-codeと入力キー（送信と改行）を合わせる)

これを支える作りとして次の4つが要ります。

7. [依頼とプロンプトを対応付ける](#7-依頼とプロンプトを対応付ける)
8. [質問と回答を対応付ける](#8-質問と回答を対応付ける)
9. [不正利用を防ぐ](#9-不正利用を防ぐ)
10. [配布する](#10-配布する)

試しにPRをレビューするWeb UIを作りました。ターミナルで`/pr-review`と打つとWeb UIのサーバーが起動してURLが出ます。そのURLをブラウザで開いて使います。差分の行を選んで聞くとターミナルで開いている会話のAIが根拠の行を光らせて答えます。PRはClaude Codeが作った架空のリポジトリの例でHTTPクライアントに再試行を足す短い変更です。以下では行ごとの質問と答えのやりとりをスレッドと呼びます。

![作ったPRレビューのWeb UI。差分の行についてのスレッドに質問と答えと根拠の行が並び、右にPR全体について聞く欄がある](/img/blogs/2026/1210_ui-agent/web-ui.svg)

ここからはこのWeb UIで10項目をどう実現したかを順に見ていきます。

## Web UIでできること

### 1. Web UIからClaude Codeと会話する

Web UIで聞いたこと（以下、依頼）をターミナルの今の会話に入れる方法を調べました。入れられるのはmodとchannelsだけでした。

modはプラグインに入れたJavaScriptかTypeScriptのコードでClaude Codeの見た目や動きを変える仕組みです。Claude Codeのv2.1.287からは何も設定せずに使えます（[Mods overview](https://code.claude.com/docs/en/plugins/mods/overview)）。

![Web UIの依頼は、modなら人がターミナルで使っている今の会話に入り、Agent SDKやclaude -pではサーバーが起動した別の会話に入る](/img/blogs/2026/1210_ui-agent/choices.svg)

ほかのつなぎ方は次の理由で使いませんでした。

- **[channels](https://code.claude.com/docs/en/channels-reference)**（MCPサーバーから動いている会話にイベントを送る仕組み）: 今の会話に届く。ただ、research previewであり、自作のchannelは許可された一覧になく、起動のたびに`--dangerously-load-development-channels`を付けて警告を承認しなければならない。答えもAIが返信のツールを呼んだときにだけ戻る。modならAIが答え終わったときに答えを必ず受け取れる
- **[Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview)**（Claude Codeと同じエージェントを自分のプログラムから動かすライブラリー）: サーバーが別の会話を起動するので依頼がターミナルの会話に入らない。Anthropicの事前の許可なしに、自分の製品の利用者にclaude.aiのログインを使わせることも認められていない
- **[`claude -p`](https://code.claude.com/docs/en/headless)**（Claude Codeを対話なしで動かすコマンド）: Agent SDKと同じく、依頼がターミナルの会話に入らない
- **[MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview)**（MCPサーバーが返すWeb UIをAIのアプリが描くMCPの拡張）: Claude CodeはこのWeb UIを描かない。MCPの[対応表](https://modelcontextprotocol.io/extensions/client-matrix)でもClaude（web）とClaude Desktopには対応の印があり、Claude Codeにはない

Web UIとmodの間には手元で小さなサーバーを動かします。このサーバーはWeb UIを配り、依頼と答えを運びます。1回のやりとりは次のように流れます。

![1回のやりとりの流れ。Web UIの質問はサーバーとmodを通って今の会話に入り、AIの示した根拠の行と答えが同じ道を戻ってWeb UIに出る](/img/blogs/2026/1210_ui-agent/flow.svg)

modのコードは`register`という関数を持つTypeScriptかJavaScriptのファイルです。Claude Codeはmodを読み込むときにこの関数を1回呼びます。modはどのときにどの関数を呼んでほしいかをその中で登録します。たとえばスラッシュコマンドが打たれたとき（`command.run`）やAIがツールを呼ぶとき（`tool.call`）です。1つの依頼にAIが答え始めるとき（ターンの始まり、`turn.start`）と答え終わるとき（ターンの終わり、`turn.complete`）もあります。登録した関数をフックと呼びます。フックは引数の`$`を通してClaude Codeの機能を使います。`$`はmodからClaude Codeを使うための窓口です（[Use the mods API](https://code.claude.com/docs/en/plugins/mods/api)）。

試作のmodは`/pr-review`が打たれたときのフックでサーバーを起動し、依頼を取りに行き始めます。

```ts
// plugin/hooks/register.ts（抜粋）
export const register = (on) => {
  on('command.run', { command: 'pr-review' }, async ($, e) => {
    // （サーバーを起動する。中略）
    void poll($)   // 依頼を取りに行き始める
    return { text: `画面のURL（ブラウザで開いてください）：${url}` }
  })
}
```

modからサーバーへ依頼を取りに行く形はPlannotatorと同じです。サーバーは依頼が来るまで最大15秒レスポンスを止めておき（ロングポーリング）、modはレスポンスを受けるたびに次を取りに行きます。HTTPのリクエストはmodの機能の`$.http.fetch`で送ります。

```ts
// plugin/hooks/register.ts（抜粋）
async function poll($) {
  while (/* /clearなどで新しいループが始まるまで */) {
    const r = await $.http.fetch(`${base}/bridge/poll`, { method: 'POST', headers: await headers($), body: '{}' })
    const { messages } = JSON.parse(r.text || '{}')
    for (const m of messages ?? []) {
      if (m.command === 'answer') await answer($, m.params ?? {})
      else if (m.command === 'compact') void compact($)
      else if (m.command === 'clear') void clear($)
    }
  }
}
```

Web UIで聞いたことはターミナルの会話にもそのまま残ります。

次の画面はWeb UIで24〜28行目について聞いた依頼がターミナルの会話に入った直後です。

![Web UIのスレッドで聞いた質問がターミナルの会話に依頼として入っている](/img/blogs/2026/1210_ui-agent/web-1-conversation.png)

### 2. Claude CodeからWeb UIを操作する

AIは答えの根拠にした行をWeb UIで光らせ、スレッドに根拠として並べます。次の画面は10行目を根拠として光らせたWeb UIです。

![AIが示した根拠の10行目が光り、スレッドに根拠として並んでいる](/img/blogs/2026/1210_ui-agent/web-2-operate.png)

modはAIが呼べるツールを足せます（`$.tool.register`）。AIはReadやBashと同じようにそのツールを呼び、modはその中でWeb UIを動かします。試作では根拠の行をWeb UIで光らせるツール`pr_show`を足しました。AIは根拠にした行を`pr_show`で1か所ずつ光らせます。modはツールが呼ばれるたびにWeb UIへの知らせ（以下、イベント）を作り、HTTPのPOSTでサーバーへ送ります。サーバーはイベントを[SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)でWeb UIへ流します。SSEはサーバーが1本のHTTPの接続でブラウザへ続けてデータを送る仕組みです。そのため1つの質問でもイベントは何回も届きます。

![1つの質問に対し、AIが手順を進めるたびにイベントがWeb UIに届く。何回、何を返すかはスキルに沿ってAIが決める](/img/blogs/2026/1210_ui-agent/events.svg)

答え終わるとmodは`turn.complete`のフックで最後の返事を`answer`のイベントにして送ります。Web UIはイベントの`type`で画面のどこを変えるかを決めます。たとえば`show`なら根拠の行を光らせ、`answer`ならスレッドに答えを出します。

```json
{
  "type": "answer",
  "id": "t91a9b8b4",
  "text": "はい、Retry-Afterヘッダーを見ずに再試行します。…",
  "evidence": [
    { "label": "429を再試行の対象にしている", "file": "src/http/retry.ts", "side": "new", "from": 10, "to": 10 }
  ]
}
```

### 3. Claude CodeからWeb UIで質問する

Claude Codeは人に選んでほしいことがあると`AskUserQuestion`というツールでターミナルに選択肢を出します。Web UIとつながっている間はこの選択肢をターミナルの代わりにWeb UIのカードで出します。次の画面はどちらもRetry-Afterの扱いを聞いたものです。左はWeb UIとつながっていないときのターミナル、右は試作のWeb UIです。

![左はWeb UIとつながっていないClaude Codeのターミナルに出る選択肢、右は同じ質問を試作のWeb UIに出したカード](/img/blogs/2026/1210_ui-agent/web-5-ask.png)

modは`AskUserQuestion`を`tool.call`のフックで受け、質問をサーバーへ送ります。人がWeb UIで選んだ答えをフックがツールの結果として返すのでターミナルのダイアログは出ません。

```ts
// plugin/hooks/register.ts（抜粋）
on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
  for (let i = 0; i < 90; i += 1) {
    const r = await $.http.fetch(`${base}/bridge/ask`, { method: 'POST', headers: await headers($), body: JSON.stringify({ id, questions: e.questions }) })
    const got = JSON.parse(r.text || '{}')
    if (got.answers) return { result: { questions: e.questions, answers: got.answers } }
  }
  return next(e)   // 答えが来なければターミナルのダイアログに任せる
})
```

modのフックが動ける時間は1回に10秒までです。ただ、modの機能（HTTPのリクエストなど）の結果を待つ間はその時間に数えられません（[Mods reference](https://code.claude.com/docs/en/plugins/mods/reference#limits)）。そのため人がWeb UIで答えるまでフックの中で待てます。

### 4. Claude Codeが作業中でも別の質問に返事をする

Claude Codeは今の作業が終わるまで次の依頼を始めません。人がターミナルで頼んだ作業が長いとWeb UIの質問には何も返らないまま待たされます。そこで作業中に来た質問にはまず一次回答を返すようにしました。次の画面で質問の下に出ている「いまは60秒待つコマンドを実行中です。終わったら…確かめてから答えます。」が一次回答です。

![作業の途中に聞いた質問へ、終わったら答えるという一次回答が出ている](/img/blogs/2026/1210_ui-agent/web-7-interim.png)

一次回答を書くのは作業しているAIとは別のAIです。modは`$.model.fork`でこの別のAIに質問を渡します（[Use the mods API](https://code.claude.com/docs/en/plugins/mods/api#call-a-model)）。別のAIはここまでのコンテキストを引き継ぎます。そのため会話でもう読んだ差分のことならその場で答えられます。ただ、ファイルを読むなどのツールは使えません。まだ読んでいない差分のことは画面のように何の作業中かだけを返します。本回答は作業が終わってから作業していたAIが出します。

![長い作業の途中にWeb UIで質問すると、modは$.model.forkで別のAIに一次回答を書かせてWeb UIに出す。作業のターンが終わるとWeb UIの依頼のターンが本回答を出す](/img/blogs/2026/1210_ui-agent/busy.svg)

別のAIにツールも使わせたいときは`$.model.fork`の代わりに`$.agent.spawn`でサブエージェントを起動する手があります。サブエージェントはコンテキストを引き継いだうえでツールを使えます。作業中でも差分を読んで本回答まで出せるはずですが、試作では試していません。

### 5. Web UIからコンパクトまたはクリアする

Web UIで何度も聞くとコンテキストが膨らみます。そこでWeb UIのヘッダーにコンテキストの使用率と、コンパクトとクリアのボタンを置きました。

![ヘッダーにコンテキストの使用率と、コンパクトとクリアのボタンがある](/img/blogs/2026/1210_ui-agent/web-6-compact.png)

使用率はAIが答え終わるたびにmodがClaude Codeから読んでWeb UIへ送ります。85%を超えると使用率が橙になり「コンパクトをお勧めします」と出ます。

「コンパクトする」を押すとmodはAIが答え終わるのを待ってから`/compact`と同じ要約をさせます。「クリアする」を押すとmodは`/clear`を打ちます。

`/clear`をするとmodの登録したツールとサーバーとのやりとりが止まり、AIのコンテキストも消えます。クリアのあともWeb UIを使い続けるにはmodがつなぎ直すなどの手当が要ります。試作では次のようにつなぎ直しました。

```ts
// plugin/hooks/register.ts（抜粋）
async function clear($) {
  await waitIdle($, 'clear')
  await $.command.run({ command: 'clear' })
  if (tokens) await keep($, tokens)   // サーバーのトークンを置き直す
  await setup($)        // コマンドとツールを登録し直す
  await post($, { type: 'clear', state: 'done' })
  void poll($)          // 依頼を取りに行き直す
}
```

`claude --resume`で会話を再開したときも同じ手当が要ります。試作はサーバーとやりとりするトークン（9で説明）を`$.store`にも置き、再開したらそこから戻してつなぎ直します。`$.store`はmodが値を置ける場所の1つでClaude Codeを終了しても残ります（[Use the mods API](https://code.claude.com/docs/en/plugins/mods/api#reach-files-processes-and-the-network)）。

### 6. Claude Codeと入力キー（送信と改行）を合わせる

ターミナルとWeb UIの両方から同じ会話に書き込みます。送信と改行のキーが違うと改行のつもりで送ってしまいます。そこでWeb UIの入力欄のキーをClaude Codeに合わせました。次の画面は設定を変えていないときの入力欄です。Claude Codeの既定と同じくEnterで送り、Shift+Enterで改行します。

![入力欄の下に「Enterで送る、Shift+Enterで改行」と出ている](/img/blogs/2026/1210_ui-agent/web-8-keys.png)

Claude Codeのキーは`~/.claude/keybindings.json`で変えられます（[Customize keyboard shortcuts](https://code.claude.com/docs/en/keybindings)）。modはこのファイルから入力欄のキーの設定（`Chat`）を読み、Web UIへ送ります。Web UIはそれに合わせて送信と改行を決め、入力欄の下の案内も変えます。このファイルはClaude Codeを再起動しなくても反映されます。そのためmodはAIが答え終わるたびに読み直します。

```ts
// plugin/hooks/register.ts（抜粋）
async function postKeys($) {
  const dir = (await $.env.get('CLAUDE_CONFIG_DIR')) || `${await $.env.get('HOME')}/.claude`
  const chat = {}
  try {
    const file = JSON.parse(String(await $.fs.read(`${dir}/keybindings.json`)))
    for (const block of file.bindings ?? []) if (block.context === 'Chat') Object.assign(chat, block.bindings)
  } catch { /* ファイルがなければWeb UIは既定のキーにする */ }
  await post($, { type: 'keys', chat })
}
```

## 作り

### 7. 依頼とプロンプトを対応付ける

Web UIは依頼の名前と中身だけを送ります。AIへの指示（プロンプト）はプラグインのスキルにだけ書きます。[スキル](https://code.claude.com/docs/en/skills)はAIへの手順を書いたMarkdownのファイルです。指示がWeb UI、サーバー、スキルに散らばると答え方を変えるときにどこを直すかで迷うためです。

次の図の上半分は依頼がスキルに届くまでの流れです。下半分は2で見たイベントの流れです。

![行きはWeb UIの操作が依頼の名前になり、modがスキルに対応させる。帰りはAIの動きをmodがイベントにし、Web UIが描く](/img/blogs/2026/1210_ui-agent/roles.svg)

「AIに聞く」を押すとWeb UIは次のJSONを送ります。`command`が依頼の名前、`params`が中身です。

```json
{
  "command": "answer",
  "params": {
    "id": "t91a9b8b4",
    "pr": 7,
    "file": "src/http/retry.ts",
    "lines": "24〜28行目",
    "code": "+  while (true) {\n…",
    "question": "429のとき、Retry-Afterを見ずに再試行しますか？",
    "history": []
  }
}
```

サーバーは知っている名前の依頼だけを受け、中身はそのままmodへ渡します。スキルを呼び出すのはmodです。サーバーはClaude Codeの外で動くためスキルを呼び出せません。modは`answer`の依頼なら人が`/pr-review:answer`を打つのと同じことをし、`params`を引数に渡します。

```ts
// plugin/hooks/register.ts（抜粋）
void $.command.run({ command: 'pr-review:answer', args: JSON.stringify(params) })
```

スキルの`$ARGUMENTS`の所に引数が入ります。AIはそのあとの手順に沿って答えます。

```markdown
<!-- plugin/skills/answer/SKILL.md（抜粋） -->
---
name: answer
disable-model-invocation: true
---
あなたはPRのレビュアーを手伝う。（中略）あなたの最後の返事が、そのまま画面のスレッドに答えとして出る。

## 依頼

$ARGUMENTS

## 手順

1. 最初に、何をして答えるかをツール `pr_plan` で1文で画面に出す
2. このPRの差分をまだ読んでいなければ、ツール `pr_diff` で読む
3. 答えの根拠になる行をツール `pr_show` で1か所ずつ画面に光らせる
4. 最後に答えを書く
```

コンパクトで残すことも同じくスキル（`compact`）に書き、modがコンパクトの指示として渡します。

この分け方だと何かを変えるときにどこを直すかがはっきりします。

- 答え方や手順を変える（もっと短く答える、テストも読んでから答える）ときはスキルだけを直す
- 依頼に項目を足す（テストのコードも渡す）ときはWeb UIとスキルを直す
- Web UIに出すものの種類を足す（直し方の案をボタンで出す）ときはmodのツールとイベント、Web UIの描き方、スキルを直す

### 8. 質問と回答を対応付ける

Web UIから続けていくつか聞くと依頼はターミナルで頼んだ作業と一緒に順番を待ちます。そのためmodはAIの答えがどのスレッドの質問へのものかを知る必要があります。

そこでWeb UIは依頼にスレッドのidを入れます。AIが依頼に答え始めるとmodの`turn.start`のフックにその依頼の文が渡ります。modはその文からidを探し、見つかればそのターンの答えをそのスレッドに返します。

![Web UIの依頼にはスレッドのidを入れる。modはターンの始まりの文にidがあればそのターンをそのスレッドのものとし、ターンが終わると答えを同じスレッドに返す](/img/blogs/2026/1210_ui-agent/turns.svg)

```ts
// plugin/hooks/register.ts（抜粋）
on('turn.start', async ($, e, next) => {
  const p = pending.find((x) => e.text.includes(x.id))
  if (p) await take($, p.id, e.turnId)   // このターンの答えをこのスレッドへ返す
  return next(e)
})
on('turn.complete', async ($, e, next) => {
  if (turn && e.turnId === turn.turnId) await post($, { type: 'answer', id: turn.id, text: e.answer, evidence: turn.evidence })
  return next(e)
})
```

### 9. 不正利用を防ぐ

Web UIから届いた文はそのまま今の会話へのプロンプトになります。試作はClaude CodeをDocker Sandboxesの中で権限の確認を省くモード（bypassPermissions）で動かしました。このモードのAIはプロンプトに従ってツールを確認なしに使います。Docker Sandboxesの標準のモードは作業中のディレクトリをホストと共有します。つまりサーバーに文を送れる人は誰でもAIにそのディレクトリのファイルを書き換えさせられます。

そこでサーバーに送れる相手を正しいWeb UIとmodだけに絞りました。

![手元のサーバーに届きうる相手と、止める仕組み。正しいWeb UIとmodだけが通る](/img/blogs/2026/1210_ui-agent/guard.svg)

`Host`ヘッダーを確かめるのは別のドメイン名から同じサーバーに届かせる攻撃（DNSリバインディング）を防ぐためです。

サンドボックスの中のほかのプロセスからはサーバーに届きます。ただ、トークンがなければ断ります。トークンを起動のたびに作る形はPlannotatorと同じです。

### 10. 配布する

Web UIをビルドしたファイルとサーバーを含めてプラグインとして配布します。プラグインにはインストールするときにビルドする仕組みがないためです。サーバーは使うライブラリーごと1つのファイルにまとめました。使う人は`claude plugin install`でプラグインを入れ、Bunを入れておくだけです。

modのコードはNode.jsのAPIを使えず、自分でポートを開けません（[Use the mods API](https://code.claude.com/docs/en/plugins/mods/api#reach-files-processes-and-the-network)）。そのためサーバーは別のプロセスで動かします。試作ではmodがプラグインに入れたサーバーをBunで起動します。

Docker Sandboxesの中で動かすときはホストで次のコマンドを打つとホストのブラウザで開けます。

```bash
sbx port publish <サンドボックスの名前> 47802:47802
```

ホスト側のポートも47802に固定します。省くとホスト側のポートが毎回変わり、modが出すURLと合わなくなります。

## まとめ

modが出てきたとき、正直なところ何に使うのだろうと思っていました。

今回、modを使ったWeb UIをAIエージェントに作ってもらったら思いのほか簡単にできました。作っている間もWeb UIからAIと会話して直してもらえたので改善がどんどん進みました。自分で作るWeb UIなので差分に限らずどのファイルについても聞いたり、直してほしいことを伝えたりできる形にできます。試作でもPR全体について聞く欄からは差分にないファイルのことも聞けます。自分の作業に合わせたWeb UIをその作業の会話の中で育てていけるのがmodのよさだと感じています。

Web UIは[Solid](https://www.solidjs.com/)のv2で作りました。画面を作るのに必要な機能が一通りそろっていてSolidいいなと感じました。Solidとその公式のルーターだけでサーバーからのデータの読み込み、読み込みを待つ間と失敗したときの表示、画面の状態の持ち方を書けました。状態管理やデータ取得のライブラリーを別に足す必要がありませんでした。SolidはReactに似たJSXで書け、仮想DOMを使わずに変わったところだけを描き直すUIライブラリーです。2026年11月18日にv2.0.0が出たばかりです（[solid-js@2.0.0](https://github.com/solidjs/solid/releases/tag/solid-js%402.0.0)）。まだ情報が少ないので使い込んだらSolidの記事も書いてみたいです。

試したバージョンは次のとおりです。

- [Claude Code](https://github.com/anthropics/claude-code) v2.1.328
- [Bun](https://bun.sh/) v1.4.4
- [Solid](https://www.solidjs.com/) v2.0.0
- [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/release-notes/) v0.54.0
- [Plannotator](https://github.com/backnotprop/plannotator) v0.28.61
