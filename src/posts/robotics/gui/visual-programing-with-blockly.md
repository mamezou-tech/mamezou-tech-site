---
title: Blocklyによるビジュアルプログラミングの紹介
author: shuji-morimoto
date: 2023-08-26
tags: [gui, blockly]
---

ビジュアルプログラミング環境として[Blockly](https://developers.google.com/blockly)が注目されています。
教育の現場ではプログラミング教育が必修となりましたが、プログラミング言語も日本語や英語と同じ言語ですので文法や単語を覚える必要があります。また、プログラミングが難しいと思われる原因の１つにキーボードでのキー入力があるかと思います。

Blocklyはプログラムがテキストではなくブロックとして表現されています。Blocklyでのビジュアルプログラミングでは極力キー入力せずにマウス操作でブロックを組み合わせることで直感的にプログラムロジックを構築することができます。

Blocklyは教育用プログラミング言語と言われていますが実際はプログラミング言語ではなくビジュアルプログラミング環境を構築するためのフレームワークとなっています。ここではBlocklyを使ったビジュアルプログラミング環境の構築方法をご紹介します。

:::info
Blocklyはビジュアルプログラミング環境を構築するためのフレームワークでGoogle主導で[オープンソースで開発](https://github.com/google/blockly)されています。Blocklyの利用者はソフトウェアエンジニアでありBlocklyのAPI(JavaScript)を使ってビジュアルプログラミング環境を構築することができます。
:::


## Blocklyの適用事例

- [Scratch](https://scratch.mit.edu/)
教育用プログラミング言語ではScratchが有名です。初期バージョンは独自開発でしたがバージョン3.0からはBlocklyを用いて開発されています。

- [MakeCode](https://www.microsoft.com/ja-jp/makecode)
Microsoftが運営するコーディングが学べるオンラインプラットフォームです。Blocklyを使ったゲーム開発やIoTデバイスの操作を学ぶことができます。

- [UIFlow](https://flow.m5stack.com/)
電子工作・ロボット制御・IoTデバイス開発などで利用されるマイコンモジュールM5Stackのプログラミングがオンライン環境で利用できます。IoTデバイスやアカウントがなくてもある程度遊べます。

- 外国為替証拠金取引(FX)用ソフトウェアのスクリプト開発
とある外国為替証拠金取引の自動売買ソフトウェアではスクリプトを利用して自動売買ができるものがあります。個人でBlocklyを使った自動売買用スクリプトを生成する環境の構築をしている方もいらっしゃるようです。


## ロボットプログラムでの適用

産業用ロボットや協働ロボットはロボットメーカー独自のロボット言語を利用してプログラムを作成することが多いです。

プログラム作成者はロボット技術者でもソフトウェア技術者でもない場合が多く、ロボットの専門知識がなくてもプログラミングができるようにロボット言語はシンプルな設計になっています。

それでもプログラム作成は敷居が高い作業となっていますので、近年はロボットメーカーもビジュアルプログラミング環境を提供するようになってきました。

:::column:豆知識！
ロボット言語はC,C++,Javaのような一般的なシステム開発用言語ではなくスクリプト言語のようにポインタがなくフロー制御と組み込み関数呼び出しを基本とした手続き型プログラミングがベースとなっています。

以下にロボット言語(疑似コード)の例を記述します。
TP00xはロボットハンドの位置と姿勢情報を含む変数(教示点といいます)で事前に値を設定しておきます。

```js
LINE(TP001)      // ロボットハンドを現在の位置から教示点TP001に直線補間移動
LINE(TP002)      // ロボットハンドを現在の位置(TP001)から教示点TP002に直線補間移動
IF COUNT < 3     // COUNTが3より小さいとき
    LINE(TP003)  // ロボットハンドを現在の位置(TP002)から教示点TP003に直線補間移動
ENDIF
OUT(10, TRUE)    // 出力ポート10番をONにする(ハンドを開く処理などを実施)
```

ロボット言語により様々な命令があります。
- ロボットハンド(TCPといいます)の位置・姿勢を変化させる
- ロボットの腕(JOINTといいます)の角度を変化させる
- 座標系を切り替える
- ツールを切り替える
- 別のプログラムを呼び出す
- 入出力ポート処理
- 速度変更や移動軌跡の合成処理
- その他：ビジョン処理、パレタイズ処理、数学関数、文字列操作など

ロボットハンドや腕を動かすと指定位置に到達するまで時間が掛かりますが、その間に別の処理を実施したいことがあります。これを実現させるには非同期処理や割込み処理が必要になるため、ロボット言語毎に独自の仕様で命令を記述します。そのためかならずしも命令が上から順に実行されるわけではないことに注意が必要です。
:::


## Blocklyを利用したお絵描きアプリ

動くコードで説明するのがわかりやすいのでBlocklyを利用したお絵描きアプリを作成しました。これを元にビジュアルプログラミング環境の構築方法をご紹介します。以下のリンクからサンプルアプリのZipファイルをダウンロードして適当なディレクトリに解凍してください。

[サンプルアプリのダウンロード](https://github.com/shuji-morimoto/vp_with_blockly/archive/refs/heads/main.zip)

index.htmlをWebブラウザで開くと下図のようなお絵描きアプリが起動します。
![Blocklyを利用したお絵描きアプリ](/img/robotics/gui/blockly_example_snapshot.png)

初期配置されたブロックは「くま」を描くプログラムとなっています。マウスでブロックを切り離したり、新しいブロックを挿入するとリアルタイムで右下のJavaScriptプログラムを生成し、そのプログラムを実行して右上の絵の描画処理が行われます。


### 画面説明

- 左：ツールボックス
    - 利用できるブロックが表示されます
    - 初期化、色設定、直線描画、多角形描画、四角形描画、楕円描画、フォント設定、テキスト描画
- 中央：ブロックを組み合わせて作成したプログラム
    - 「描画」ブロックに接続されたブロックが描画対象となります
- 右下：ブロックの組み合わせから生成されたテキスト(JavaScriptプログラム)
    - ReadOnly
    - ここに出力されたJavaScriptプログラムが評価され描画処理が実行されます
- 右上：プログラムを実行して描画した画像

### 操作方法

描画範囲のサイズは幅:200px, 高さ:200pxで原点は左上となっています。

1. ツールボックスからブロックを中央の領域にドラッグ＆ドロップしてブロックを作成します
1. ブロックのプロパティを入力します
    - 描画位置や大きさなど入力
    - 直線描画、多角形描画は点1,点2,点3,...を 点1x,点1y,点2x,点2y,点3x,点3y,...のように記述します
1. ブロックを接続します
1. 1に戻る

「描画」ブロックに接続されている「初期化」ブロックをドラッグしてゴミ箱アイコンにドロップして削除し、下の方に見える「初期化」ブロックを「描画」ブロックに接続してみてください。何が表示されるでしょうか？


## カスタムブロックの作成

独自のブロックを作成してみましょう。

### カスタムブロックの定義

カスタムブロックの定義はJavaScriptかXMLで定義しますが [Blockly Developer Tools](https://blockly-demo.appspot.com/static/demos/blockfactory/index.html)を利用することでカスタムブロックの定義自体もBlocklyで定義できます。また、定義したカスタムブロックはXMLファイルで保存しておき、後で復元することもできます。

![Blockly Developer Tools](/img/robotics/gui/blockly_developer_tools.png)


### 定義方法

ブロックの定義は入力、フィールド、タイプ、色、ブロックの接続タイプを組み合わせて定義します。

- 入力
    - value input：ブロックの接続タイプがleft outputのものを入力ブロックとする
    - statement input：ブロックの接続タイプがtop+bttom connectionsのものを入力ブロックとする
    - dummy input：入力ブロックがない
- フィールド (以下、代表的な物のみ)
    - text：文字列フィールド
    - numeric：数値フィールド
    - dropdown：ドロップダウン(リスト選択)
    - checkbox：チェックボックス
    - variable：変数フィールド(変数選択)
- タイプ
    - 接続可能なデータ型を指定
    - ブロックの接続タイプがleft outputの場合、どのようなデータ型として出力するかを指定
    - ブロックの接続タイプが上下接続型の場合、どのようなデータ型と接続できるかを指定
- 色
    - ブロックの色を指定
- ブロックの接続タイプ
    - 下図参照

![ブロックタイプ](/img/robotics/gui/blockly_block_define.png)



### 定義の確認
右のBlock Definitionが定義されたカスタムブロックとなります。また、右下のGenerator stubはコード生成処理のスタブとなりこれを元にコード生成処理を記述します。

:::alert
右上のPreviewには定義したブロックのプレビューが表示されますがXMLファイルをインポートしたとき表示されないときがあります。原因は不明ですがキャッシュをクリアしたりClear Libraryボタンでクリアなどしてから読み込むと表示されることがあります。
:::


### カスタムブロックの適用
Blockly Developer Toolsで定義したブロック定義をcustom_blocks.jsにコピペします。custom_blocks変数に配列として記述しておき、後で利用します。
カスタムブロックの定義を一括で出力したい場合はBlock Exporterタブから全カスタムブロックの定義を選択してコピペすることもできます。

```js
const custom_blocks =
[
    :
    :
{
  "type": "drawer_line",
  "message0": "%1 %2",
  "args0": [
    {
      "type": "field_image",
      "src": "./icons/line.png",
      "width": 20,
      "height": 20,
      "alt": "*",
      "flipRtl": false
    },
    {
      "type": "field_multilinetext",
      "name": "POINTS",
      "text": "0,0\n30,40"
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 210,
  "tooltip": "",
  "helpUrl": ""
},
    :
    :
```

:::alert
Blockly Developer Toolsでは入力タイプとして複数行テキストの指定ができませんのでここで線描画ブロック(drawer_line)と多角形描画ブロック(drawer_area)の入力タイプを"field_input"から"field_multilinetext"に変換しています。また初期値"text"も複数行になるように改行しています。
:::


## カスタムブロックのコード生成処理

コード生成部分もBlockly Developer Toolsからgenerator.jsにコピペし、カスタムブロック毎に出力ターゲットのプログラム言語仕様に合わせてテキストで出力します。ブロックからフィールド値を取得して目的のコードを生成します。

```js
javascript.javascriptGenerator.forBlock['drawer_init'] = function(block, generator) {
  let code = 'drawer.init();\n';
  return code;
};

javascript.javascriptGenerator.forBlock['drawer_start'] = function(block, generator) {
  let code = '// このコードは自動生成されたものです。\n';
  return code;
};

javascript.javascriptGenerator.forBlock['drawer_color'] = function(block, generator) {
  let colour_color = block.getFieldValue('COLOR');
  let code = 'drawer.color("' + colour_color + '");\n';
  return code;
};

javascript.javascriptGenerator.forBlock['drawer_font'] = function(block, generator) {
  let number_size = block.getFieldValue('SIZE');
  let dropdown_font = block.getFieldValue('FONT');
  let code = 'drawer.font(' + number_size + ', "' + dropdown_font + '");\n';
  return code;
};

javascript.javascriptGenerator.forBlock['drawer_line'] = function(block, generator) {
  let text_points = block.getFieldValue('POINTS');
  let list = text_points.replaceAll(/\s+|,|\n+|\t+/g," ").trim().replaceAll(/\s+/g,",");
  let code = 'drawer.line(false,[' + list + ']);\n';
  return code;
};
    :
    :
```

:::alert
プログラム言語にはドットやカッコや四則演算などのオペレータの評価には優先順位があります。そのようなオペレータを利用するブロックがある場合は優先順位の指定も必要なのですが、ここでは簡単なカスタムブロックのみを定義したため優先順位の指定は定義していません。
:::


## ツールボックスの設定

ツールボックスに配置するブロックをtool_box.jsに記述します。

- "kind": "flyoutToolbox"を"categoryToolbox"にするとブロックをカテゴリ分けすることもできます
- "contents"内の"kind"は"block"以外にも"category", "sep", "label", "button"なども指定できます
- "type"には定義したカスタムブロックの名前を指定します

```js
const toolbox = {
    "kind": "flyoutToolbox",
    "contents": [
      {
        "kind": "block",
        "type": "drawer_init",
      },
      {
        "kind": "block",
        "type": "drawer_color",
      },
      {
        "kind": "block",
        "type": "drawer_line",
      },
        :
        :
    ]
};
```


## HTMLへの組み込み

準備は整いました。HTMLで表示できるようにしましょう。

### ライブラリのロード

index.htmlではBlocklyのライブラリはCDNに登録されているものを利用しています。そのためネットワークアクセスが可能な環境で実行する必要があります。Blocklyライブラリを読み込んだ後にお絵描きアプリ用のJavaScriptを読み込みます。

```html
<head>
    <meta charset="utf-8">
    <title>Blocklyを使ったお絵描きアプリ</title>
    <!-- BlocklyのライブラリはCDNに登録されているものを利用 -->
    <script src="https://cdn.jsdelivr.net/npm/blockly@10.1.2/blockly_compressed.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/blockly@10.1.2/blocks_compressed.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/blockly@10.1.2/javascript_compressed.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/blockly@10.1.2/msg/en.js"></script>
    <!-- 以下のスクリプトでお絵描きアプリ環境を構築 -->
    <script src="./custom_blocks.js"></script>
    <script src="./startup_blocks.js"></script>
    <script src="./tool_box.js"></script>
    <script src="./generator.js"></script>
    <script src="./canvas_drawer.js"></script>
    <script src="./app_core.js"></script>
</head>
```

これでグローバル変数にBlocklyオブジェクトが作成され、お絵描きアプリ用の変数やクラスも読み込まれた状態になります。
最後にapp_core.jsを読み込んでお絵描きアプリの初期化を行っています。


### コンテンツ表示

index.htmlのbody部はレイアウト記述でごちゃごちゃしていますが、以下のようにタグとidが指定されていればとりあえず表示ができます。

```html
<body>
    <div id="blocklyDiv" style="width:950px; height:750px;"></div>
    <canvas id="drawer-canvas" width="200" height="200"></canvas>
    <button id="button0">スタートアップブロック生成</button>
    <textarea id="output" placeholder="生成コード" rows="40" cols="55" readonly></textarea>
</body>
```

- \<div id="blocklyDiv" ... \>：Blocklyが表示される領域
- \<canvas id="drawer-canvas" ... \>：画像の描画を行う領域
- \<button id="button0" ... \>：スタートアップブロック生成用ボタン(後述)
- \<textarea id="output" ... \>：生成されたコードを表示する領域


### お絵描きアプリの初期化
ページ全体の読み込みが終了した後にお絵描きアプリの初期化を行いたいのでapp_core.jsでイベントハンドラ window.onload で初期化処理を記述しています。

```js
window.onload = function() {
    // カスタムブロックの登録
    // 事前にcustom_blocks.jsがロードされていること
    Blockly.defineBlocksWithJsonArray(custom_blocks);

    // ワークスペースの作成、引数で様々なオプション指定ができます
    // 事前にtool_box.jsがロードされていること
    workspace = Blockly.inject('blocklyDiv',
        {
            toolbox: toolbox,
            scrollbars : true, 
            sounds : false, 
            trashcan : true, 
            zoom : {
                controls : true, 
                wheel : false, 
                startScale : 1.0, 
                maxScale : 2.0, 
                minScale : 0.5, 
                scaleSpeed : 1.1,
            },
        }
    );

    // JavaScript用のコードジェネレータを初期化
    // 事前にgenerator.jsがロードされていること
    javascript.javascriptGenerator.init(workspace);

    // スタートアップ時にワークスペースに初期ブロックを配置
    // 事前にstartup_blocks.jsがロードされていること
    Blockly.serialization.workspaces.load(startupBlocks, workspace);
        :
```

:::info
画面が表示されない場合、記述ミスによる不具合が発生している可能性があります。ブラウザがChromeの場合はF12を押してデベロッパーツールを表示し、コンソールを見ると不具合の内容が表示されています。
:::

## コード生成処理

Blocklyのワークスペースを作成したのでブロックを組み合わせてプログラムを作成することができるようになりましたが、コードの生成ができていません。コードを生成してそのコードから絵を描画してみましょう。

```js
    // スタートアップブロック生成ボタン("button0")をクリックしたときの
    // コールバック関数を登録します。
    document.getElementById("button0").addEventListener("click", _showWorkspaceBlocks);

    // ワークスペースの状態が変更したときのコールバック関数を登録します。
    // ブロックの追加やプロパティが変更されるとリアルタイムでコード生成を実施します。
    workspace.addChangeListener(_generateCode);

    // キャンパス領域に絵を描くクラスの生成
    drawer = new CanvasDrawer(document.getElementById("drawer-canvas"));

    // ワークスペース上のブロックをJSON出力する関数
    // 生成されたコードを表示する領域に出力しています
    function _showWorkspaceBlocks() {
        let output = document.getElementById("output");
        output.value = JSON.stringify(Blockly.serialization.workspaces.save(workspace));
    }

    // コード生成する関数
    // 描画ブロックに接続されたブロックを辿り、コードを生成します。
    // 生成されたコードを表示して、そのコード(文字列)をFunctionオブジェクトで
    // 評価し実行しています。
    function _generateCode() {
        let output = document.getElementById("output");
        let start = workspace.getBlocksByType("drawer_start")[0];
        let code = javascript.javascriptGenerator.blockToCode(start);
        output.value = code;
        try {
            Function("{drawer.init();" + code + "}")();
        } catch (error) {
            alert(error);
        }
    }
```


## スタートアップ時の初期ブロック配置

スタートアップブロック生成 ボタンを押すとコード表示領域にワークスペース上に配置されたブロックの情報がJSONテキストで表示されます。コピーして startup_blocks.js に以下のように startupBlocks変数の次の行に張り付けてください。ブラウザをリロードするとJSONの内容でブロックが初期配置されます。

```js
const startupBlocks =
{"blocks":{"languageVersion":0,"blocks":[{"type":"drawer_start","id":"start","x":50,"y":30,"deletable":false,"next":{"block":{"type":"drawer_init","id":"^gTx.5`1q4XE[9gMd@;3","next":{"block":{"type":"drawer_color",
    :
```


## 描画処理

CanvasDrawerというクラスを作成し、[キャンパスAPI](https://developer.mozilla.org/ja/docs/Web/API/CanvasRenderingContext2D)を利用して各カスタムブロックに対応する関数を作成しています。


```js
// コンストラクタ
function CanvasDrawer(canvas_element) {
    this.ctx = canvas_element.getContext('2d');
    this.init();
}

// 初期化関数
CanvasDrawer.prototype.init = function() {
    let ctx = this.ctx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.0;
    ctx.font = "11pt Arial";
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

// 色設定関数
CanvasDrawer.prototype.color = function(html_color) {
    let ctx = this.ctx;
    ctx.fillStyle = html_color;
    ctx.strokeStyle = html_color;
}

// 四角形描画関数
CanvasDrawer.prototype.rect = function(x,y,width,height) {
    let ctx = this.ctx;
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.fill();
}
        :
        :
```


## 独自言語用コードジェネレータについて

今回はJavaScriptのコードを生成しました。BlocklyはJavaScriptジェネレータをデフォルトで用意してあるため簡単にカスタムブロックを作成することができました。(Python, Dart, Lua, PHPもります)

PythonやJavaScriptはライブラリ・モジュールなどを使うことが多いかと思いますがそれらをカスタムブロックで定義するには適していると思います。今回はCanvasDrawerというモジュールを自作して利用してみました。

しかし独自言語のコード生成をするにはジェネレータを作る必要があります。オペレータの優先順位や予約語(Blockly上で変数名として指定できないようにするため)などの設定もあり難易度と手間が上がります。
参考：[blocklyのジェネレータのソースコード](https://github.com/google/blockly/tree/develop/generators)


Blocklyはオブジェクトやポリモーフィズムといったオブジェクト指向言語、状態を持たない関数型言語といったプログラミングパラダイムのコード生成にはやや不向きです。PythonやJavaScriptには複合データ型やオブジェクト指向的な要素がありますがBlocklyではそれらの要素を切り離しています。教育用ビジュアルプログラミングに利用されることを想定し、基本データ型を利用した構造化プログラミングをターゲットにしているためだと思われます。

:::info
- 構造体のような複合データ型もカスタムブロックを定義すれば利用できます
- 継承はサポートされていませんがブロックの接続タイプを複数指定できるため汎化-特化の関係を模擬することはできます
:::
