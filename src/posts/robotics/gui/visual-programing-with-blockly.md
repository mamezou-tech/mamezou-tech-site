---
title: Blocklyによるビジュアルプログラミングの紹介
author: shuji-morimoto
date: 2023-08-26
tags: [gui, blockly]
---

ビジュアルプログラミング環境として[Blockly](https://developers.google.com/blockly)が注目されています。
教育の現場ではプログラミング教育が必修となりましたが、プログラミング言語も日本語や英語と同じ言語ですので文法や単語を覚える必要があり、初学者にとって敷居が高いためビジュアルプログラミングによる学習が行われています。

コンピュータへの命令がブロックとして表現されているため直感的な操作ができます。また、プログラミングが難しいと思われる原因の１つにキーボードでのキー入力があるかと思います。Blocklyでのビジュアルプログラミングでは極力キー入力せずにマウス操作でブロックを組み合わせることでプログラムロジックを構築することができます。

Blocklyは教育用プログラミング言語と言われていますが実際はプログラミング言語ではなくビジュアルプログラミング環境を構築するためのフレームワークとなっています。ここではBlocklyを使ったビジュアルプログラミング環境の構築方法をご紹介します。

:::info
BlocklyはGoogleが開発したビジュアルプログラミング環境を構築するためのフレームワークで[オープンソースで開発](https://github.com/google/blockly)されています。Blocklyの利用者はソフトウェアエンジニアでありBlocklyのAPI(JavaScript)を使ってビジュアルプログラミング環境を構築することができます。プログラム作成者がビジュアルプログラミング環境を利用してブロックを組み合わせることでプログラムを作成します。
:::


## Blocklyの適用例

- [Scratch](https://scratch.mit.edu/)
教育用プログラミング言語ではScratchが有名です。初期バージョンは独自開発でしたがバージョン3.0からはBlocklyを用いて開発されているようです。

- [MakeCode](https://www.microsoft.com/ja-jp/makecode)
Microsoftが運営するコーディングが学べるオンラインプラットフォームです。Blocklyを使ったゲーム開発やIoTデバイスの操作を学ぶことができます。

- [UIFlow](https://flow.m5stack.com/)
電子工作・ロボット制御・IoTデバイス開発などで利用されるマイコンモジュールM5Stackのプログラミングがオンライン環境で利用できます。実機やアカウントがなくてもある程度遊べます。


## ロボットプログラムでの適用

産業用ロボットや協働ロボットはロボットメーカー独自のロボット言語を利用してプログラムを作成することが多いです。プログラム作成者はロボット技術者でもソフトウェア技術者でもない場合が多く、ロボットの専門知識がなくてもプログラミングができるようにロボット言語はシンプルな設計になっています。
それでもプログラム作成は敷居が高い作業となっていますので、近年はロボットメーカーもビジュアルプログラミング環境を提供するようになってきました。

:::column:豆知識！
各社ロボットメーカーは独自のロボット言語を利用していることが多いです。ロボット言語といってもC,C++,Javaのような一般的なシステム開発用言語ではなくスクリプト言語のようにポインタがなくフロー制御と組み込み関数呼び出しを基本とした手続き型プログラミングがベースとなっています。

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

ロボットハンドや腕を動かすと指定位置に到達するまで時間が掛かりますが、その間に別の処理を実施したいことがあります。これを実現させるには非同期処理や割込み処理が必要になるため、かならずしも命令が上から順に実行されるわけではなくロボット言語毎に仕様が異なっていることに注意が必要です。
:::


## Blocklyを利用したお絵描きアプリ

動くコードで説明するのがわかりやすいのでBlocklyを利用したお絵描きアプリを作成しました。これを元にビジュアルプログラミング環境の構築方法をご紹介します。以下のリンクからサンプルアプリのZipファイルをダウンロードして適当なディレクトリに解凍してください。

[サンプルアプリのダウンロード](https://github.com/shuji-morimoto/vp_with_blockly/archive/refs/heads/main.zip)

index.htmlをWebブラウザで開くと下図のようなお絵描きアプリが起動します。
![Blocklyを利用したお絵描きアプリ](/img/robotics/gui/blockly_example_snapshot.png)

初期配置されたブロックは「くま」を描くプログラムとなっています。マウスでブロックを切り離したり、新しいブロックを挿入するとリアルタイムで右下のJavaScriptプログラムを生成し、そのプログラムを実行して右上の絵の描画処理が行われます。


### 画面説明

- 左：利用できる命令ブロック
    - 初期化、色設定、直線描画、多角形描画、四角形描画、楕円描画、フォント設定、テキスト描画
- 中央：ブロックを組み合わせて作成したプログラム
    - 「描画」ブロックに接続されたブロックが描画対象となります
- 右下：ブロックの組み合わせから生成されたテキスト(JavaScriptプログラム)
    - ReadOnly
    - ここに出力されたJavaScriptプログラムが評価され描画処理が実行されます
- 右上：プログラムを実行して描画した画像

### 操作方法

描画範囲のサイズは幅:200px, 高さ:200pxで原点は左上となっています。説明しなくても直感的な操作ができるかと思いますが簡単に。

1. 左からブロックを中央の領域にドラッグ＆ドロップしてブロックを作成します
1. ブロックのプロパティを入力します
    - 描画位置や大きさなど入力
    - 直線描画、多角形描画は点1,点2,...を 点1のx,点1のy,点2のx,点2のy,点3のx,点3のy,...のように記述します
1. ブロックを接続します
1. 1に戻る

「描画」ブロックに接続されている「初期化」ブロックをドラッグしてゴミ箱アイコンにドロップして削除し、下の方に見える「初期化」ブロックを「描画」ブロックに接続してみてください。何が表示されるでしょうか？


## カスタムブロックの作成

### カスタムブロックの定義

カスタムブロックの定義はJavaScriptかXMLで定義しますが Blockly Developer Toolsを利用することでカスタムブロックの定義自体もBlocklyで定義できます。また、定義したカスタムブロックはXMLファイルで保存しておき、後で復元することもできます。

![Blockly Developer Tools](/img/robotics/gui/blockly_developer_tools.png)


### 定義方法

### 定義の確認
右のBlock Definitionが定義されたカスタムブロックとなります。また、右下のGenerator stubはコード生成処理のスタブとなりこれを元に生成処理を記述します。

:::alert
右上には定義したブロックのプレビューが表示されますがXMLファイルをインポートしたとき表示されないときがあります。原因は不明ですがキャッシュをクリアしたりClear Libraryボタンでクリアなどしてから読み込むと表示されることがあります。
:::


### カスタムブロックの適用
Blockly Developer Toolsで定義したブロック定義をコピペしてcustom_blocks変数に配列として記述しておき、後で初期化時に利用します。
カスタムブロックの定義を一括で出力したい場合はBlock Exporterタブから全カスタムブロックの定義を選択してコピペすることもできます。

:::alert
Blockly Developer Toolsでは入力タイプとして複数行テキストの指定ができませんのでここで線(drawer_line)と多角形(drawer_area)の入力タイプを"field_input"から"field_multilinetext"に変換しています。また初期値"text"も複数行になるように改行しています。
:::

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

## カスタムブロックのコード生成処理

カスタムブロック毎に出力ターゲットのプログラム言語仕様に合わせてテキストデータで出力します。ブロックからフィールド値を取得して目的の関数を生成します。

:::alert
プログラム言語にはドットやカッコや四則演算などのオペレータの評価には優先順位があります。そのようなオペレータを利用するブロックがある場合は優先順位の指定も必要なのですが、ここでは簡単なカスタムブロックのみを定義したため優先順位の指定は定義していません。
:::


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

## ツールボックスの設定

ツールボックスに配置するブロックはカテゴリ分けすることもできます。

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

### ライブラリのロード

本アプリはZipダウンロードのサイズを減らすためにBlocklyのライブラリはCDNに登録されているものを利用しています。そのためネットワークアクセスが可能な環境で実行する必要があります。Blocklyライブラリを読み込んだ後にお絵描きアプリ用のJavaScriptを読み込みます。

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

index.htmlのbody部はレイアウト記述でごちゃごちゃしていますが、以下のタグとidが指定されていれば表示できます。

```html
<body>
    <div id="blocklyDiv" style="width:950px; height:750px;"></div>
    <canvas id="drawer-canvas" width="200" height="200"></canvas>
    <button id="button0">スタートアップブロック生成</button>
    <textarea id="output" placeholder="生成コード" rows="40" cols="55" readonly></textarea>
</body>
```

### お絵描きアプリの初期化
ページ全体の読み込みが終了したらお絵描きアプリの初期化を行いたいのでapp_core.jsでイベントハンドラ window.onload で初期化処理を記述しています。

```js
window.onload = () => {
    Blockly.defineBlocksWithJsonArray(custom_blocks);
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

    Blockly.JavaScript.init(workspace);
    Blockly.serialization.workspaces.load(startupBlocks, workspace);
        :
```

## コード生成処理

```js
        :
    document.getElementById("button0").addEventListener("click", _showWorkspaceBlocks);
    workspace.addChangeListener(_generateCode);

    drawer = new CanvasDrawer(document.getElementById("drawer-canvas"));

    function _showWorkspaceBlocks() {
        let output = document.getElementById("output");
        output.value = JSON.stringify(Blockly.serialization.workspaces.save(workspace));
    }

    function _generateCode() {
        let output = document.getElementById("output");
        let start = workspace.getBlocksByType("drawer_start")[0];
        let code = Blockly.JavaScript.blockToCode(start);
        output.value = code;
        try {
            document.getElementById("output").value = code;
            Function("{drawer.init();" + code + "}")();
        } catch (error) {
            alert(error);
        }
    }
```

## 描画処理

```js
function CanvasDrawer(canvas_element) {
    this.ctx = canvas_element.getContext('2d');
    this.init();
}

CanvasDrawer.prototype.init = function() {
    let ctx = this.ctx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.0;
    ctx.font = "11pt Arial";
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

CanvasDrawer.prototype.color = function(html_color) {
    let ctx = this.ctx;
    ctx.fillStyle = html_color;
    ctx.strokeStyle = html_color;
}

CanvasDrawer.prototype.rect = function(x,y,width,height) {
    let ctx = this.ctx;
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.fill();
}
        :
        :
```


