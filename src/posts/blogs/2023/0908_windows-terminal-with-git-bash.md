---
title: Windows Terminal で Git Bash を快適に使う
author: masahiro-kondo
date: 2023-09-08
tags: [terminal, tips]
---

## はじめに
皆さんは Windows で Linux 系の CLI を使いたい場合、どういうツールを使っていますか？ もちろん本物の Linux や macOS などを使えればいいのですが、作業用マシンが Windows 固定というケースもあり、何らかの環境が必要です。

Windows には WSL2 という Linux のための仮想環境があり、ネィティブに近い Linux の開発環境を構築できます。ただ、WSL2 は Hyper-V の有効化が必要だったり Windows ファイルシステムとのマッピングがやや面倒だったりと、本格的な開発環境ではなく「ちょっと Linux 系のコマンドを叩きたい、Bash が動けばいい」という場合は too much だったりします。

[Cygwin](https://www.cygwin.com/) もありますが、これまた若干ヘビーウェイトな環境です。

筆者は長年 [Git for Windows](https://gitforwindows.org/) に付属する Git Bash を愛用しています[^1]。これは Bash のエミュレーション環境であり、Git の操作はもちろん Windows 用プログラムも起動できます。docker CLI やkubectl / helm などの Kubernetes 関連コマンド、AWS CLI などを使い慣れた Bash のシェル環境で操作できます。

[^1]: Git for Windows は内部的に MSYS2 という Cygwin の親戚みたいなソフトウェアを使っているようですが筆者は詳しくは知りません。

HOME が Windows の `%USERPROFILE%` のディレクトリにマッピングされるのもいいところです。`¥C:` のようなドライブレターは、`/c` のようにマッピングされています。

```shell
$ echo $HOME
/c/Users/kondoh
```

Git for Windows のインストーラーを実行するだけで、Git Bash の環境が手に入ります。

Git Bash はよく出来たシェル環境なのですが不満もあります。一つはシェルごとに単独のウィンドウが開いてしまうことです。SSH などで複数の環境に接続して作業する時など、ウィンドウがいっぱい開いてしまって切り替えが煩わしいことがあります。もう一つはウィンドウリサイズ時の再描画の問題です。docker CLI や kubectl の表示は横に長く広がるものが多く、コマンド実行後にウィンドウを広げて見やすくしたりするのですが、Git Bash ではウィンドウをリサイズしても再描画されないので、もう一度コマンドを打ち直すことが多くなってしまいます。

Git for Windows に同梱される git-bash.exe というプログラムが bash.exe のラッパーになって、Git Bash のターミナル環境を構成しているようです。

一方 Windows Terminal は Microsoft でスクラッチから開発されたモダンなターミナル環境です。WSL2 はもちろん、PowerShell、コマンドプロンプト、Azure Cloud Shell など様々なシェルを組み込んで使えます。タブで複数のシェルを1つのウィンドウで起動できますし、専用のテキストレンダリングエンジンを搭載しており、高速で美しい描画が可能です。もちろんリサイズ時には再描画もされます。

git-bash.exe ではなく Windows Terminal に bash.exe を組み込んで利用することで、快適な Bash 環境ができます。

## Windows Terminal のインストール
前置きが長くなりましたが、Window Terminal のインストールです。Microsoft Store からインストールできます。

![Microsoft Store](https://i.gyazo.com/80a36dbb2c974a3f7b0921686bec49a9.png)

簡単なのですが、企業ユースで Windows Store が封じられている環境もあるでしょう。Windows Terminal は OSS として GitHub に公開されており、リリースページから最新のバイナリをダウンロードできます。

[https://github.com/microsoft/terminal/releases/latest](https://github.com/microsoft/terminal/releases/latest)

このページには msixbundle 形式のインストーラーと、arm64 / x64 / x86 の zip 形式のバイナリがアップロードされています。

![Assets](https://i.gyazo.com/688f17dcfaa162217d88a0beba33194c.png)

msixbundle は Windows 10 の比較的新しめのリリースから利用可能になったインストーラー形式です。古い Windows 10 を使っていて msixbundle 形式が認識されない場合は、環境に合わせて zip ファイルをダウンロードして展開すれば OK です。インストーラーを使用した場合スタートに起動用アイコンが登録されます。zip の場合は展開されたディレクトリの terminal.exe を タスクバーやスタートに手動で登録しましょう。

:::info
ちなみに Git for Windows についても PortableGit というインストーラーなしの zip 形式バイナリが提供されています。以下のダウンロードページの Portable ("thumbdrive edition") というセクションからダウンロードできます。

[Git - Downloading Package](https://git-scm.com/download/win)
:::

## Git Bash の設定

それでは Git Bash を Windows Terminal で使えるよう設定していきましょう。

タブの右側のプルダウンメニューから `設定` を開きます。

![start setting](https://i.gyazo.com/5fdcaf48035ea94aea32e3ac104d83bd.png)

設定画面の左ペインの一番下の `新しいプロファイルを追加します` をクリックし `新しい空のプロファイル` をクリックして作成していきます。

![Add new profile](https://i.gyazo.com/eb511d3d324a411631bc4502093fc817.png)

`名前` に `Git Bash` を指定、`コマンドライン`には以下のように Git for Windows の bash.exe を指定して login オプションとインタラクティブオプションを指定します。

`C:\Program Files\Git\bin\bash.exe --login -i`

`開始ディレクトリ` については、`親プロセスディレクトリの使用` のチェックを外すと `%USERPROFILE%` が自動で入ります。

![command line](https://i.gyazo.com/e69fc892239808c56103f6321437c691.png)

次にアイコンの指定です。デフォルトはコマンドプロンプトのアイコンになっていますが、PowerShell や Azure Cloud CLI のように専用のアイコンを設定したいですね。Git for Windows に ico ファイルが含まれているので指定しましょう。

`C:\Program Files\Git\mingw64\share\git\git-for-windows.ico`

![Set icon](https://i.gyazo.com/98883c8cce37e04b32256890d147cff8.png)

以上で、`保存` をクリックしてプロファイルを保存します。保存すると、左のペインに Git Bash プロファイルが並びます。

![profiles](https://i.gyazo.com/dfa28edb54f75745fba4388fd7536545.png)

Windows Terminal の起動時は PowerShell がデフォルトで起動するようになっていますが、これを Git Bash に変更したい場合、スタートアップの設定で `規定のプロファイル` に GitBash を選択し `保存` をクリックします。

![startup](https://i.gyazo.com/267c1a2d6d4bc39602b1b76040b0b4ac.png)

Windows Terminal 起動時に Git Bash が起動するようになりました。

![Git Bash or Windows Terminal](https://i.gyazo.com/4c9f82d7f6b7b91b5f18ef3e28a2f65b.png)

## 最後に
Windows Terminal で Git Bash を利用する方法を紹介しました。タブも使えるモダンなターミナルは素晴らしいですね。
