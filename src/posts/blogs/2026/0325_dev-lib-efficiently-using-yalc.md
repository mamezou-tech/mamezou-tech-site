---
title: ライブラリ開発にyalcを活用する
author: masato-ubata
date: 2026-03-25
tags: [typescript, yalc]
image: true
---

## はじめに

共通機能やAPIスキーマなどをライブラリ化して利用する場合、モジュール化したものを公開して各アプリケーションに組み込むと思います。  
テストコードで動作確認すべきですが、実際に組み込むと軽微な修正が発生してしまうことがあります。
ファイルを相対参照させるとdist配下の構造が変わってエントリーポイントになるファイルの位置が変わってしまうなどの問題にも困っていました。  
そんな悩みを解決してくれた[yalc](https://github.com/wclr/yalc)の活用方法を説明します。

## yalcとは

yalcは、ローカルで開発中のnpmパッケージをローカルに公開し、GitHub Packagesなどに公開されているパッケージと同じようにアプリケーションに組み込んで開発できるようにするツールです。

### 同じような役割を持つ仕組みを持つ`npm link` / `npm pack` との違い

| 観点 | yalc | npm link | npm pack |
|------|------|----------|----------|
| 依存参照の実態 | `.yalc` と `node_modules` に展開（通常の利用形態に近い） | シンボリックリンク | tarballを手動で作成/配置 |
| 変更反映のしやすさ | `yalc push`で利用先に伝搬 | リンク先依存で環境差が出やすい | 毎回 pack/install が必要 |
| 運用向き | 複数アプリで同時検証しやすい | 小規模・一時検証向き | 配布物の確認向き |
| 事故防止 | `yalc check` で混入検知可能 | 標準で混入検知なし | 手順の属人化に注意 |

## 利用手順

yalcを活用した開発の流れを説明します。  

下記の構成で説明します。  
* ライブラリ
  * ディレクトリ: packages/math-utils
  * パッケージ名: @sample-yalc/math-utils
  * バージョン: 1.0.0
* ライブラリを利用するプロジェクト
  * ディレクトリ: demo-app

**よく使うコマンド一覧**
| コマンド | 説明 |
|---------|------|
| `yalc publish` | パッケージをyalcストアに公開 |
| `yalc push` | パッケージを再公開し、利用先に変更を伝搬 |
| `yalc add <package>` | パッケージを追加 |
| `yalc update` | 追加済みパッケージを更新 |
| `yalc remove <package>` | パッケージを削除 |
| `yalc remove --all` | すべてのyalcパッケージを削除 |
| `yalc installations show <package>` | パッケージの使用箇所を表示 |
| `yalc installations clean <package>` | パッケージの使用箇所をクリーン |

### 最短で試す（3分）

1. ライブラリ側で公開
  ```sh
  cd packages/math-utils
  yalc publish
  ```
2. 利用側で追加
  ```sh
  cd demo-app
  yalc add @sample-yalc/math-utils
  ```
3. ライブラリ変更後に反映
  ```sh
  cd packages/math-utils
  yalc push
  ```

基本はこれだけです。
以降に図解しながら詳細な流れを説明しているので、併せてご確認ください。

### 事前作業

まずはyalcをインストールします。

1. インストール
    ```sh
    npm install -g yalc
    ```

### ライブラリのローカルへの公開から利用するまでの流れ

ローカルで開発中のライブラリをローカルに公開し、それを利用するまでの流れは以下の通りです。

![パッケージの利用](/img/blogs/2026/0325_dev-lib-efficiently-using-yalc/use-package-example.drawio.png)

1. パッケージをローカルに公開する（ライブラリ側）

    publishすると、パッケージがローカルのyalcストアに保存されます。
    * yalcストアにパッケージをコピー
    * yalc.sig: パッケージの内容から算出した識別情報。ライブラリの変更有無を判定する際に使用します。
    * yalcストア上のpackage.json: yalcSigの加筆

    ```sh
    $ cd packages/math-utils
    $ yalc publish
    @sample-yalc/math-utils@1.0.0 published in store.
    ```
    :::info
    **yalcストア**  
    yalcを使ってpublishしたパッケージが公開される場所のこと。
    * Windows: `%LOCALAPPDATA%\Yalc`(e.g. `C:\Users\sample-user\AppData\Local\Yalc`)
    * mac/Linux: `~/.yalc`

    dirで実際のディレクトリが確認できます。
    ```sh
    $ yalc dir
    C:\Users\sample-user\AppData\Local\Yalc
    ```
    :::

2. プロジェクトにパッケージを追加する（利用側）

    addすると、パッケージを取り込んで、依存関係が更新されます。
    * installations.json: インストール先として加筆
    * package.json: 依存関係の追加/変更
      ```json
      "dependencies": {
        // パッケージの参照先が.yalc配下に変更されます
        "@sample-yalc/math-utils": "file:.yalc/@sample-yalc/math-utils"
      },
      ``` 
    * `.yalc`: yalcストアからパッケージがコピーされます
    * node_modules/{パッケージスコープ/パッケージ名}: .yalcからパッケージがコピーされます
    * yalc.lock: 新規作成されます

    ```sh
    $ cd demo-app
    $ yalc add @sample-yalc/math-utils
    Package @sample-yalc/math-utils@1.0.0 added ==> C:\Users\sample-user\demo-app\node_modules\@sample-yalc\math-utils
    ```

ここまでで、リモートに公開されているパッケージと同じように利用できます。

### ライブラリの変更を伝搬する

ライブラリの変更を、利用先に伝搬する手順は以下の通りです。

![変更の伝搬](/img/blogs/2026/0325_dev-lib-efficiently-using-yalc/update-package-example.drawio.png)

1. ライブラリのコードを変更する（ライブラリ側）
2. 変更を伝搬する（ライブラリ側）

    pushすると、利用先に変更内容を伝搬します。
    * yalcストアにパッケージを再公開
    * 更新されたパッケージの利用先に変更を反映（設定不備で失敗することがあります）

    ```sh
    $ cd packages/math-utils
    $ yalc push
    ```

### ライブラリの利用を終了する

yalcパッケージとの依存を除去する手順は以下の通りです。

![yalcパッケージとの依存を除去](/img/blogs/2026/0325_dev-lib-efficiently-using-yalc/remove-package-example.drawio.png)

1. yalcパッケージを削除する（利用側）

    removeすると、利用側にコピーされたライブラリが削除されます。
    * `package.json`: 依存関係を削除
    * `.yalc`: ディレクトリを削除
    * `node_modules/{パッケージスコープ/パッケージ名}`: ディレクトリを削除
    * `yalc.lock`: 依存関係を削除
      * ロック対象のyalcパッケージがすべてなくなったらファイルごと削除します。
    * yalcストアのパッケージ: **削除されません**

    ```sh
    $ cd demo-app
    $ yalc remove @sample-yalc/math-utils # 特定のパッケージを指定してyalcパッケージを削除する場合    
    $ yalc remove --all # すべてのyalcパッケージを削除する場合
    ```

## Appendix. 利用上の注意点など

### yalc関連のファイルはgit管理から除外

* あくまでも開発時に利用するツールなので、yalcを使う時は`.gitignore`に該当ファイルを登録しておきます。
```gitignore
# yalc
.yalc/
yalc.lock
```

### コミット前に`yalc check`で混入防止

`.yalc` 参照（`file:.yalc/...` や `link:.yalc/...`）が`package.json`に残ったままコミットすると、CIや他環境で問題になりやすいです。

```sh
# package.jsonにyalc依存が残っていないかチェック
yalc check
```

pre-commitで実行するようにしておくと、誤コミットを防ぎやすくなります。

### パッケージが更新されない

* yalcパッケージをいったん削除して、再登録してください。
  ```sh
  # キャッシュをクリアして再追加
  yalc remove @sample-yalc/math-utils
  yalc add @sample-yalc/math-utils
  ```
* （yalcパッケージを削除してもうまくいかない場合）node_modulesを削除して、再登録してください。
  ```sh
  # node_modulesを削除して再インストール
  rm -rf node_modules
  # Remove-Item -Recurse -Force node_modules # PowerShellの場合
  npm install
  yalc add @sample-yalc/math-utils
  ```
* （それでもうまくいかない場合）インストール先のパスが誤っている可能性があります。確認して誤っていた場合はパスを修正してください。
  ```sh
  # 特定のパッケージの情報
  yalc installations show @sample-yalc/math-utils
  ```

## まとめ

ライブラリを開発しながら動作検証できるのは非常に助かります。  
同じような苦労をされている方がいらっしゃれば、開発に組み込んでみてはいかがでしょうか。
