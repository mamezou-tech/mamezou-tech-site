---
title: VS Code のキーマップを拡張を使わずカスタマイズしてみよう
author: masahiro-kondo
date: 2024-04-26
tags: [vscode, tips, 新人向け]
image: true
---

## はじめに
新年度になったと思ったらもうゴールデンウィークですね。

突然ですが皆さんはどんなコードエディタを使っているでしょうか。今時は大体 Visual Studio Code (VS Code)ですよね。VS Code には色々な拡張が提供されており、自分好みの環境を構築できます。Vim や Emacs 風のキーマップを実現する拡張もあり、これらのエディタを使っていた人もスイッチしやすくなっています。

:::column:昔のエディタ
筆者が新人だった遠い昔、PC は MS-DOS や Windows 3.1 が全盛期で、VZ Editor や秀丸エディタを使っていました。秀丸はまだ現役の多機能エディタですが、VZ はさすがに[「死語の世界」](/blogs/2024/04/12/death-lang-java/)ですね・・
:::

筆者は VS Code 登場以前は Emacs を常用していました。macOS はマイルドな Emacs キーバインド環境なので、VS Code も Emacs 風に使えます。Windows で VS Code を使う時は Emacs 風のキーリマッパー拡張をインストールしていました。

[Emacs Friendly Keymap - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=lfs.vscode-emacs-friendly)

しかし、拡張を使うと逆に Windows 標準のショートカットキーが使えなくてストレスを感じることがあります[^1]。そういう時は、必要なキーマップだけを自分で登録するという解決方法があります。

[^1]: 例えば、Emacs では Ctrl+V はページスクロールですが、Windows だとクリップボードから貼り付けのショートカットであるため、こちらを優先したくなります。

## VS Code でキーボードショートカットを登録する
以下は、Windows 版 VS Code でのキーマップ登録方法です。メニューは日本語化していないので、日本語化の拡張をインストールしている場合は読み替えてください。

[Preferences]→[Keyboard Shortcuts] と選択します。

![keyboard shortcuts](https://i.gyazo.com/ccd3bb53d11c2223169a6fcf4a42c185.png)

Keyboard Shortcuts の画面が開きますので、右上の `Open Keyboard Shortcuts(JSON)` というツールチップが出るボタンをクリックします。

![Open shortcuts in JSON](https://i.gyazo.com/9f7e7177b86bb2876c8fd0710ae3be4b.png)

VS Code で keybindings.json というファイルが開き、直接キーマップを編集できるようになります。

![Keybindings in JSON](https://i.gyazo.com/eb77ca4e56f4e12e8727d403ad47c834.png)

キーマップは、JSON の配列になっており、`key` や `command` などのキーを要素にもつプロパティを登録していくことになります。`key` は割り当てるショートカットキー、`command` は VS Code のコマンドです。VS Code のコマンドがよくわからなくても、既存のショートカットを調べるとなんとなく推測できると思います。また、入力中に VS Code が補完してくれるので意外と簡単です。


## 筆者の Windows 版 VS Code のキーマップ
筆者が登録したミニマムな Emacs 風キーマップの JSON は以下のようになりました。わかりやすさのため JSON にコメントを入れています[^2]。

[^2]: ちなみに JavaScript スタイルのコメントを JSON に記述可能な形式に JSONC があります。

```json
[
    {
        // カーソルを1行上に移動
        "key": "ctrl+p",
        "command": "cursorUp"
    },
    {
        // カーソルを1行下に移動
        "key": "ctrl+n",
        "command": "cursorDown"
    },
    {
        // カーソルを行先頭に移動
        "key": "ctrl+a",
        "command": "cursorHome"
    },
    {
        // カーソルを行末に移動
        "key": "ctrl+e",
        "command": "cursorEnd"
    },
    {
        // カーソルを1文字右に移動
        "key": "ctrl+f",
        "command": "cursorRight"
    },
    {
        // カーソルを1文字左に移動
        "key": "ctrl+b",
        "command": "cursorLeft"
    },
    {
        // 改行を挿入
        "key": "ctrl+j",
        "command": "type",
        "args": { "text": "\n" },
        "when": "editorTextFocus & !editorReadonly"
    },
    {
        // カーソルの左側の1文字を削除
        "key": "ctrl+h",
        "command": "deleteLeft"
    },
    {
        // カーソルより右の文字を削除
        "key": "ctrl+k",
        "command": "deleteAllRight"
    },
    {
        // 検索ボックスを開く
        "key": "ctrl+s",
        "command": "editor.actions.findWithArgs"
    },
    {
        // コマンドパレットを表示
        "key": "alt+x",
        "command": "workbench.action.showCommands"
    }
]
```
カーソル移動系は `cursorXxx` というコマンドで割り当てられます。文字挿入系は `type` コマンド、挿入する文字を `args` で指定します。

`when` というキーでエディタの状態を指定しショートカットが発動する条件を記述できます。上記の改行挿入の例では、`editorTextFocus & !editorReadonly` を指定しています。これは「エディタがフォーカス状態にあり、編集対象が読み取り専用でない(書き込み可能である)」という条件を指定しています。このように条件を指定することで、意図しない文字挿入が起きないようにしてます。

エディタの機能は、`editor.actions`、VS Code 自体の機能は、`workbench.action` などのプレフィックスがついたコマンドが用意されていますので試しながら設定するとよいでしょう。

:::column:筆者のキーマップの妥協点
Ctrl+H は Windows 版 VS Code では置換用のボックスを開くショートカットですが、あまり使わないのでカーソルより左の1文字消去に割り当てました。

Ctrl+V はスクロールではなく、Windows のショートカットキーを生かしています。Shift+Insert というショートカットでも可能なのですが、Insert キーが独立じゃないラップトップも増えてきています。Fn+Shift+Insert になってしまいますが、これだと Ctrl+V の方が楽ですね。

Mac の Command(⌘) キーはアプリケーションレベルの修飾キーなので、Ctrl を使わず ⌘+V でペーストが可能です。Windows の Win キーは OS レベルのショートカット用なので、Ctrl にアプリケーションレベルの修飾キーが寄っているのが両者の操作感の違いとして気になってしまいます。
:::

## さいごに
以上、VS Code のキーマップ変更方法の紹介でした。自分の手に馴染むようにツールを設定するのは生産性向上のためにとても大切です。ただ、あまりこだわりすぎると最適化に時間がかかりすぎるという罠にハマりがちなので、ほどほどに留めて作業に専念するようにしましょう。

