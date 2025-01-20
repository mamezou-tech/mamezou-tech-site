---
title: Ninjaでビルドを高速化！その使い方を徹底解説
author: kotaro-miura
date: 2025-01-22
tags:  [Ninja,Make,graphviz]
image: true
---


# はじめに

最近ビルドツールのMakeを触っていたのですが、「これって古くから使われているらしいけど他に何か新しいビルドツールで広まっているものあるのかな～？」と思ったので調べたところ、[Ninja](https://github.com/ninja-build/ninja)というツールが良いぞという情報を得たので触ってみたことをまとめたいと思います。

# Ninjaの特徴

NinjaはMakeに比べて高速に動作することがウリのビルドシステムです。

Google Chromeのように約40,000ファイルのC++コードから単一の実行ファイルをコンパイルする大規模プロジェクトにおいて、そのビルドの高速化のために開発されました。[^ninja-his]

[^ninja-his]:[Evan Martin. The Performance of Open Source Software Ninja](https://aosabook.org/en/posa/ninja.html)

以下のような設計目的を掲げています。[^design-goal]

> - 巨大なプロジェクトでもとても高速なインクリメンタルビルドができる
> - コードのビルド方法に関するポリシーをほとんど持たない
> - Makefileであれば正しく理解するのが難しい状況でも、正しく依存関係を把握できる
> - 利便性と速度が競合するときは、速度を優先する

逆に以下の事項は明確な設計目的とはしていないとしています。

> - 手書きでビルドファイルを書くための便利な構文
>     - Ninjaファイルは他のプログラムを使用して生成するべきです。（CMakeやMesonなどが対応しています(筆者追記)）
> - 組み込みルール
>     - MakeのようなCコードをコンパイルするための暗黙的ルールはNinjaにはありません。
> - ビルド時のカスタマイズ
>     - コマンドオプションはNinjaファイルを生成するプログラムに含めるべきです。
> - ビルド時の条件分岐や検索パス
>   - 意思決定を行う処理は遅いので避けます。

[^design-goal]:[Design goals](https://ninja-build.org/manual.html#_design_goals)

GitHub Starも伸びていて順調に広まっているように見受けられます。
[Star History Chart](https://star-history.com/#ninja-build/ninja&Date)

[マニュアル](https://ninja-build.org/manual.html)から詳細な仕様を確認できます。


# 使ってみる

Ubuntuの場合、以下のコマンドでインストールします。

```sh
$ sudo apt-get install ninja-build
```

# ninjaコマンド

`ninja`というコマンドを用いてビルド実行します。

以下の形式で実行します。

```sh
ninja [オプション] [ターゲット名...]
```


# 設定ファイル(`build.ninja`)

ninjaを実行すると、デフォルトではカレントディレクトリにある`build.ninja`というファイルから設定を読み取ります。

ファイル名を指定して実行するときは`ninja -f ファイルパス` というオプションを指定します。

では設定ファイルの書き方を見ていきましょう。

基本的な形式は以下のようになります。

```sh:build.ninja
rule ルール名
    command = コマンド

build ターゲット: ルール名 依存ファイル
```

大きく分けて、`rule`と`build`という2つの宣言文を用いて記述していくことになります。

- `build`文では、ターゲット(作成したいファイル名)に対して、そのルール(作成方法)と依存ファイル(作成に必要なファイル)を対応付けます。
    ターゲット、依存ファイルともに、複数のファイル名をスペース区切りで指定可能です。
- `rule`文では、ファイル作成のために実行するコマンドを`command =`に続けて記述します。

## サンプル

以下に簡単な例を挙げます。

```sh:build.ninja
rule r1
    command = echo "DEP sample" > $out

rule r2
    command = echo "TEST `cat $in`" > $out

build test.txt: r2 dep.txt
build dep.txt: r1
```

上記の設定では、`dep.txt`というファイルのテキスト内容に`TEST `という文字列を先頭に追加したテキストを、`test.txt`に保存するための処理が書かれています。

### サンプルの解説

1. ```sh
    build test.txt: r2 dep.txt
    ```
    `test.txt`というファイルを、`dep.txt`というファイルを用いてルール`r2`によって作成することを表します。
    `dep.txt`が存在しない場合は、`dep.txt`がターゲットになっている`build`文を実行します。
2. ```sh
    build dep.txt: r1
    ```
    `dep.txt`というファイルを、ルール`r1`によって作成することを表します。依存ファイルはありません。
3. ```sh
    rule r1
        command = echo "DEP sample" > $out
    ```
    ルール`r1`では、`DEP sample`というテキストが書かれたファイルを作成するコマンドを実行します。
    `$out`というのはNinjaの組み込みの変数として用意されていて、`build`文で指定した**ターゲット名が**展開されます。この例の場合は`dep.txt`となります。
4. ```sh
    rule r2
        command = echo "TEST `cat $in`" > $out
    ```
    ルール`r2`では、入力ファイルの内容に`TEST`という文字列を追加したテキストが書かれたファイルを作成するコマンドを実行します。
    `$in`というのもNinjaの組み込みの変数として用意されていて、`build`文で指定した**依存ファイル名**が展開されます。この例の場合は`dep.txt`です。

### サンプルの実行結果

それではこの設定ファイルを使ってビルド実行してみましょう。Makeと同様、依存ファイルの変更有無によってターゲット生成の実行スキップされることが確認できます。

```sh
$ ninja test.txt
[2/2] echo "TEST `cat dep.txt`" > test.txt

# ファイル内容確認
$ cat dep.txt test.txt
DEP sample
TEST DEP sample

# 何もせずに再実行しても更新は行われない。
$ ninja test.txt 
ninja: no work to do. 

# 依存ファイルの内容を変更する。
$ echo "DEP sample 1" > dep.txt

# 依存ファイルが更新されている場合はターゲットが再作成される。
$ ninja test.txt 
[1/1] echo "TEST `cat dep.txt`" > test.txt

# ファイル内容確認
$ cat dep.txt test.txt 
DEP sample 1
TEST DEP sample 1
```

基本的な使い方は以上になります。とてもシンプルですね。

## 依存関係グラフ

Ninjaにはファイルの依存関係をネットワークグラフとして可視化するためのツールが用意されているのが面白いなと思ったので紹介します。

`ninja -t graph`というオプションを使うことで、ファイルの依存関係グラフを[graphviz](https://graphviz.org/)形式で出力してくれます。

例えば最初に挙げたサンプルファイルのグラフを出力してみます。

事前にgraphvizをインストールして、以下のように`dot`コマンドに渡すことで依存関係グラフの画像`graph.png`を出力してくれます。

```sh
ninja -t graph | dot -Tpng -ograph.png
```

:::info
graphvizはUbuntuの場合は以下のコマンドでインストールできます。
```sh
sudo apt install graphviz
```
:::

以下のような画像が出力されます。
依存ファイルとターゲットが四角のノードに表されていて、ルールがそれらを結ぶエッジとして表されます。
依存ファイルがない場合はルールが丸いノードに表されて、ターゲットと結ばれています。

![graph1](/img/blogs/2025/0122_build_system_ninja/sample_graph.png)

# その他の仕様まとめ

他にも知っておくと便利な仕様がありますので確認していきましょう。

## 変数

設定ファイルのトップレベルで `変数名 = 文字列`という形式で変数を定義できます。
参照するときは`$変数名`と書きます。

```sh:サンプルファイル
var = 豆蔵

rule r
    command = echo $var

build tag: r
```

```sh:実行結果
$ ninja
[1/1] echo 豆蔵
豆蔵
```

## エスケープ

エスケープ文字は`$`です。ninja.buildファイルの中で意味を持つ文字（スペース,`:`,`$`自身,改行）を使いたいときは`$`に続けて書きます。

例えば複数のコマンドを改行して書きたい場合は以下のように書くことができます。

```sh
rule r4
    command = echo "r4 sample" $
    && echo "r4-12 sample"
```

## phony rule

`phony`という、組み込みで用意されているルールがあります。

このルールはなにも実行しないルールです。何も実行しないですがターゲットに対して任意に依存性を追加するために利用できます。

例えば以下のように`some/file.txt`というファイルにエイリアスとして`foo`を定義できます。


```sh:サンプルファイル
rule r1
    command = cat $in > $out

build some/file.txt: r1 dep.txt
build foo: phony some/file.txt
```

実行時のターゲット名として`some/file.txt`ではなく`foo`と指定できます。

```sh:実行結果
$ ninja foo
[1/1] cat dep.txt > some/file.txt
```

他にも複数のターゲットをまとめるグループ用ターゲットを作成することにも利用できます。

```sh:サンプルファイル
rule r1
    command = echo "r1 sample"
rule r2
    command = echo "r2 sample"
rule r3
    command = echo "r3 sample"

build all: phony tag1 tag2 tag3
build tag1: r1
build tag2: r2
build tag3: r3
```

依存関係グラフは以下になります。

![phony](/img/blogs/2025/0122_build_system_ninja/phony_graph.png)

```sh:実行結果
$ ninja all
[1/3] echo "r1 sample"
r1 sample
[2/3] echo "r2 sample"
r2 sample
[3/3] echo "r3 sample"
r3 sample
```

## 暗黙的な依存性

既に紹介しましたが、ルールに記述するコマンドの中で`$in`や`$out`という変数を利用できました。
それぞれ、`$in`は依存ファイルのリスト、`$out`はターゲットのリストに展開されます。
また、ファイル指定の中で、`|`に続けて書いたファイルはこれらの変数に展開されません。

以下に、`|` を用いた設定ファイルの例を示します。

```sh:サンプルファイル
rule r1
    command = echo "DEP1 sample" > $out

rule r2
    command = echo "DEP2 sample" > $out

rule r3
    command = echo "TEST `cat $in`" > $out

build test1.txt | test2.txt: r3 dep1.txt | dep2.txt
build dep1.txt: r1
build dep2.txt: r2
```

依存関係グラフは以下のようになります。

![implicit_dep_graph.png](/img/blogs/2025/0122_build_system_ninja/implicit_dep_graph.png)

```sh:実行結果
$ ninja test1.txt -v
[1/3] echo "DEP1 sample" > dep1.txt
[2/3] echo "DEP2 sample" > dep2.txt
[3/3] echo "TEST `cat dep1.txt`" > test1.txt

$ cat dep1.txt dep2.txt test1.txt
DEP1 sample
DEP2 sample
TEST DEP1 sample
```

`r3`実行時の `$in` には `dep1.txt`だけ、`$out` には `test1.txt` だけが展開されます。
一方で、`dep2.txt`は依存ファイルとしては認識されおり、`dep2.txt`の作成ルールの`r2`は実行されます。

また、暗黙的ターゲットの`test2.txt`は、直接ビルドしようとしても作成されませんが依存ファイルの作成処理は実行されます。

```sh:実行結果
$ ninja test2.txt -v
[1/3] echo "DEP1 sample" > dep1.txt
[2/3] echo "DEP2 sample" > dep2.txt
[3/3] echo "TEST `cat dep1.txt`" > test1.txt

$ cat dep1.txt dep2.txt test1.txt
DEP1 sample
DEP2 sample
TEST DEP1 sample

$ ls test2.txt
ls: cannot access 'test2.txt': No such file or directory
```

## Order-Only Dependency

依存ファイルの中で`||`に続けて指定したファイルは、その依存ファイルの最新化までは行うが、ターゲットを再ビルドをするかどうかの評価には考慮されないようになります。

この性質を利用して、依存ファイルが最新であることは保証しつつ、不要なターゲットの再ビルドを減らすことができます。

例えば次の例でOrder-Only Dependencyな依存ファイルとそうではない依存ファイルの場合の動作を比較してみましょう。

以下の例では`test2.txt`を再ビルドするかどうかの評価に、`dep2.txt`が更新されたかどうかが考慮されません。

```sh:サンプルファイル
rule dep
    command = echo "DEP sample" > $out

rule test
    command = cat $in > $out

build test1.txt: test dep1.txt
build test2.txt: test || dep2.txt
build dep1.txt: dep
build dep2.txt: dep
```

依存関係グラフは以下です。

![order_only_graph.png](/img/blogs/2025/0122_build_system_ninja/order_only_graph.png)

```sh:実行結果
# test1.txt, test2.txtは既に存在しているとします。
$ touch test1.txt
$ touch test2.txt

# test1.txtの再ビルド実行時、dep1.txtが最新化(ここでは新規作成)されたことに影響してtest1.txtの更新処理が実行されます。
$ ninja test1.txt -v
[1/2] echo "DEP sample" > dep1.txt
[2/2] cat dep1.txt > test1.txt

# text2.txtの再ビルドの実行時、dep2.txtは最新化(ここでは新規作成)しましたが、test2.txtの更新処理は行われません。
$ ninja test2.txt -v
[1/1] echo "DEP sample" > dep2.txt
```

## 動的依存性(Dynamic Dependency)

次は、依存ファイルを動的に指定する機能を紹介します。

ビルド処理の中で、 依存性を表すための`build`文の一覧のようなファイルを生成し、そのファイルを参照して依存関係を追加できます。

例を[ドキュメント](https://ninja-build.org/manual.html#_tarball_extraction)から拝借しますが、以下の設定ではtarボールの展開処理をしています。
この設定では、tarボールが前回展開したときから更新があった場合に再展開します。
また、tarボールに更新がなかったとしても以前展開したはずのファイルがなんらかの理由で存在していない場合にも再展開します。

```sh:build.ninja
rule untar
  command = tar xf $in && touch $out
rule scantar
  command = scantar --stamp=$stamp --dd=$out $in
build foo.tar.dd: scantar foo.tar
  stamp = foo.tar.stamp
build foo.tar.stamp: untar foo.tar || foo.tar.dd
  dyndep = foo.tar.dd
```

少し複雑ですので、処理を追って説明していきます。

まず最初に`ninja foo.tar.stamp`を実行することで次のbuild文が評価されます。

```sh
build foo.tar.stamp: untar foo.tar || foo.tar.dd
  dyndep = foo.tar.dd
```

`untar`が展開処理を実行するルールです。 展開実行と同時にタイムスタンプ記録用に`foo.tar.stamp`を作成します。
`dyndep =`というのが組み込みのキーワードなのですが、ここで指定されたファイル`foo.tar.dd`には指定の書式[^dyndep_ref]で追加のターゲットや依存ファイルが記述されている想定です。この`foo.tar.dd`をtarボールの内容によって動的に生成します。
生成するためにここでは`foo.tar.dd`をOrder-Only Dependencyとして指定します。

[^dyndep_ref]:[dydepファイル仕様](https://ninja-build.org/manual.html#_dyndep_file_reference)

次に`foo.tar.dd`のビルド処理として以下のbuild文が評価されます。
```sh
build foo.tar.dd: scantar foo.tar
  stamp = foo.tar.stamp
```

`scantar`というコマンドはここでは仮想的に用意されていると仮定したコマンドです。このコマンドはtarボールを読込みその内容に応じて以下のようなファイルを生成するものとしています。(例えば`tar tf`の結果を加工する)

```sh:foo.tar.dd
ninja_dyndep_version = 1
build foo.tar.stamp | file1.txt file2.txt : dyndep
  restat = 1
```

`file1.txt`,`file2.txt`がtarボールに含まれていたファイル名であり、それらを(暗黙的な)ターゲットファイルとして追加することを記述しています。

このようにしてtarボールの内容によって動的に依存関係を指定できます。

依存関係グラフは以下のようになります。（`file1.txt`,`file2.txt`を指すはずのターゲットノードがよくわからない数値になっていますね。バグでしょうか…）

![dyndep](/img/blogs/2025/0122_build_system_ninja/dyndep.png)


## 並列実行

Ninjaではビルド実行をデフォルトで並列実行してくれます。

ファイル生成も行わない簡単な例になりますが、以下のような設定ファイルで動作を確認してみます。

```sh:サンプルファイル
rule r1
    command = sleep 2 && echo "r1 `date +%H:%M:%S`"
rule r2
    command = sleep 2 && echo "r2 `date +%H:%M:%S`"
rule r3
    command = sleep 2 && echo "r3 `date +%H:%M:%S`"

build tag: phony tag1 tag2 tag3
build tag1: r1
build tag2: r2
build tag3: r3
```

ターゲット`tag`は3つの依存ファイル`tag1`、`tag2`、`tag3`に依存していて、
それぞれの依存ファイルのルール`r1`、`r2`、`r3`において、2秒待機して時刻を出力します。

```sh:実行結果
$ ninja tag
[1/3] sleep 2 && echo "r1 `date +%H:%M:%S`"
r1 19:49:04
[2/3] sleep 2 && echo "r2 `date +%H:%M:%S`"
r2 19:49:04
[3/3] sleep 2 && echo "r3 `date +%H:%M:%S`"
r3 19:49:04
```

出力の時刻の秒数まで見ていただくと分かると思いますが、並列で実行されているため全て同時刻で出力されました。

# ツールオプションについて

上記で依存性グラフを画像出力するときにも使いましたが、ninjaコマンドには`-t`オプションで使える便利ツールが用意されています。

- `browse`
  - 依存関係グラフをブラウザで表示できる
  - `ninja -t browse --port=8000 --no-browser mytarget`(手元ではなぜか実行エラーになる💦)
- `graph`
  - graphviz形式の依存グラフを出力する
  - `ninja -t graph mytarget | dot -Tpng -ograph.png`
  - `sudo apt install graphviz -y`でdotをインストール
- `targets`
  - ターゲット一覧出力
- `commands`
  - 与えたターゲットのコマンド一覧出力
- `inputs`
  - 与えたターゲットの入力ファイル一覧
- `clean`
  - 成果物を削除する

# おわりに

今回はビルドシステムツールのNinjaを触ってみた内容をまとめました。まだ他にも細かな仕様がありますので気になる方は[マニュアル](https://ninja-build.org/manual.html)をご覧ください。
設計目的にもあるように基本的にはNinjaの設定ファイルは手書きしないようなのですが、読み方や実行方法等が理解できて面白かったです。 特に依存関係グラフを出力できるのは便利でこれだけでも何かに使えそうだなと思いました。
Makefileと比べて依存関係の解決がとても高速であるということなので、何か機会があれば使ってみたいなと思いました。
