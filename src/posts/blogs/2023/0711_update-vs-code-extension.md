---
title: 自作 VS Code 拡張を3年ぶりにアップデートして浦島太郎になった話
author: masahiro-kondo
date: 2023-07-11
tags: [vscode, Codespaces]
---

## はじめに

先日の「[VS Code でユーザー定義スニペットを作って使う](/blogs/2023/06/23/create-snippets-in-vscode/)」の記事の最後に、筆者が VS Code 拡張を Marketplace に公開していると書きました。この拡張は個人的には毎日のように使っているのですが、最後の更新が3年前なので、Dependabot のセキュリティアラートがかなり溜まっていたのと、Codespaces ではなぜか動かないという現象が会って、アップデートしなきゃなあと思っていました。

というわけで、3年ぶりに自作の VS Code 拡張をアップデートした話です。

ちなみにその拡張はこれです。

[changelog-support&#32;-&#32;Visual&#32;Studio&#32;Marketplace](https://marketplace.visualstudio.com/items?itemName=kondoumh.changelog-support)

ChangeLog 形式のファイルを扱う拡張で、ハイライティング、スニペットなどをセットにしたものです。ChangeLog はソフトウェアの更新情報をリリース時に記載するファイルで、古くから Emacs などでサポートされている書式です。

:::info
ChangeLog の書式を日々の作業のログというかメモとして活用するという「ChangeLog メモ」というのが20年ぐらい前に流行って、筆者も2007年からこの形式で作業ログを書き続けています。途中で Markdown 形式や様々なタスク管理アプリなどに移行しようとしたのですが、書き始めるまでのアクションが少ない Emacs とシンプルな書式から離れることができず長年使っていました。Emacs から VS Code に移行する際に ChangeLog メモを書く環境も移行しようということで作成したのがこの拡張です。

このような理由で Emacs の ChangeLog 拡張の仕様は完全に無視で筆者のユースケースだけに対応したものになっています。公開からかなり経つのですが、まだインストール数が489件(おそらく1割ぐらいは筆者で残りは検索してインストールしたけどユースケースと違うのですぐ捨てたと思われる)で、レイティングも付いていないレベルの超マイナーな拡張です。
:::

この時代に3年というのは、ある生物の種が誕生して絶滅し化石として発見されるぐらいの時間が経過していると言ってもよいでしょう。滅多にやらない作業というのは記憶に残らないのでしっかり記録を取っておきたいところです。というわけで、この場をお借りして、VS Code 拡張の開発やデバッグ、リリースに付いてメモを残していきたいと思います。

## 開発環境セットアップ

VS Code の拡張を開発する方法は以下の公式ドキュメントに全て記載されています。

[Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension)

初期構築では、プロジェクトを作成するために yo(yomen の CLI) と VS Code 拡張専用の generator をインストールする必要があります[^1]。

- [yo](https://www.npmjs.com/package/yo)
- [generator-code](https://www.npmjs.com/package/generator-code)

[^1]: yomen はかつてボイラープレート作成のためにかなり使われていた印象がありますが、今も現役なのですね。

```shell
npm install -g yo generator-code
```

プロジェクトを作成する際には以下のように `yo code` と実行すると生成スクリプトが対話モードで動きます。

```shell
$ yo code

     _-----_     ╭──────────────────────────╮
    |       |    │   Welcome to the Visual  │
    |--(o)--|    │   Studio Code Extension  │
   `---------´   │        generator!        │
    ( _´U`_ )    ╰──────────────────────────╯
    /___A___\   /
     |  ~  |     
   __'.___.'__   
 ´   `  |° ´ Y ` 

? What type of extension do you want to create? (Use arrow keys)
❯ New Extension (TypeScript) 
  New Extension (JavaScript) 
  New Color Theme 
  New Language Support 
  New Code Snippets 
  New Keymap 
  New Extension Pack 
  New Language Pack (Localization) 
  New Web Extension (TypeScript) 
  New Notebook Renderer (TypeScript)
```

JavaScript を選択して生成したプロジェクトの構造は以下のようになっています。

```
$ tree -L 2 --gitignore
.
├── CHANGELOG.md
├── README.md
├── extension.js
├── jsconfig.json
├── package-lock.json
├── package.json
├── test
│   ├── runTest.js
│   └── suite
└── vsc-extension-quickstart.md
```

拡張の基本の動きは extension.js で activate / deactivate というフックメソッドを実装します。コードハイライトやスニペットは syntaxes や snippets などの所定のディレクトリに定義ファイルを配置するだけです。

筆者が作成した拡張のソースコードは以下のリポジトリにあります。

[GitHub - kondoumh/changelog-support: VS Code extension to support writing ChangeLog.](https://github.com/kondoumh/changelog-support)

:::info
syntaxes に配置するコードハイライトの設定はモダンエディタの元祖 TextMate のフォーマットで記述します。Atom、SublimeText、そして VS Code などの後発のエディタの台頭によりマイナーになってしまった TextMate ですが、このような資産を残しています。
:::

## ライブラリのアップデートなど

3年前にアップデートしてましたが、そもそもの初期構築は6年前だったらしくライブラリは完全に別物になっていました。`vscode` パッケージは deprecated になり `@types/vscode` に、`vscode-test` は、`@vscode/test-electron` パッケージに移行が必要でした。日時処理は `moment` を使っていましたが、これも開発がストップしたので API が全く同じ `dayjs` に移行しました。あとはスニペット定義を少し変えました。

[Update dependencies by kondoumh · Pull Request #18 · kondoumh/changelog-support](https://github.com/kondoumh/changelog-support/pull/18)

## Codespaces サポート

今や VS Code 拡張はローカルの VS Code だけでなく、Codespaces や VS Code Remote の環境でも動作する必要があります。これらの環境での開発やデバッグについては以下のドキュメントに纏められています。

[Supporting Remote Development and GitHub Codespaces](https://code.visualstudio.com/api/advanced-topics/remote-extensions)

なんと拡張のリポジトリを Codespaces で開いてデバッグが可能になっていました。

拡張のリポジトリでプルリク用のブランチを作ると Codespaces をそのブランチから起動できます。

![start codespaces](https://i.gyazo.com/340c04ddfb8338bd962e04e9c9b631c7.png)

Codespaces でプロジェクトを開き、ブレークポイントの設定などをしてデバッグが可能です。

![Add brekpoint](https://i.gyazo.com/dd4d73532ebef261da300c7fc80a5ed4.png)

この状態で、F5 キーを押すか、左側のアイコンでデバッグ実行を選択するとデバッグモードになり、拡張を有効にした状態の Codespace が別タブで起動されデバッグ可能状態になります[^2]。下のスクリーンショットで「拡張機能開発ホスト」と書かれているタブです。

![debug on another tab](https://i.gyazo.com/ee21acd148e36b4c0ce71777c159a7e5.png)

[^2]: ローカルでデバッグする時は、VS Code のインスタンスが別ウィンドウで起動します。

拡張機能開発ホストのタブを開きます。

![extension development host](https://i.gyazo.com/71a8b930d1981f57ea402a5c114bc10c.png)

このタブで拡張を実行するためのファイルを作成します。

![create target file](https://i.gyazo.com/481cbeedb1045a265a1a94754c4052ba.png)

コマンドパレットから拡張のコマンドを呼び出します。

![trigger command of extension](https://i.gyazo.com/cb3651f52fde79af64026b7ebe3c0d89.png)

元のタブの Codespaces で拡張のコードがステップ実行され、デバッガで動きを確認できます。

![Debug extension](https://i.gyazo.com/8dc387349bfa31ef6947806b627dafcf.png)

動画にした方がわかりやすいと思いますがこれはかなり感動しました。[ドキュメント](https://code.visualstudio.com/api/advanced-topics/remote-extensions)によると、VS Code 拡張はローカルでは、VS Code の Extension Host、Codespaces などのリモート環境では VS Code Server の Remote Extension Host という仮想環境にロードされて実行されます。Codespaces では この Remote Extension Host との通信をタブ間で共有してデバッグ機能を実現しているようです。

## リリース
さて、コード修正が終わってテストも終わればあとはリリースです。リリース手順は以下のドキュメントに纏められています。

[Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

ここで一つ難題が。VS Code の Markeplace に自作の拡張をリリースするためには、Azure DevOps のアカウントでの Personal Access Token が必要になります。3年も経っているとトークンをどうやって発行したのか全く覚えていません。

トークン発行の手順自体は以下のドキュメントにあります。

[個人用アクセス トークンを使用する - Azure DevOps](https://learn.microsoft.com/ja-jp/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=Windows)

Azure DevOps[^3] は Azure 統合されたので、Azure にログインした上で、DevOps サービスのコンソールを使う必要がありました。

[^3]: 昔は VSTS(Visual Studio Team Services) と呼ばれていました。

ということで、久々に個人の Azure アカウントにログインして、Azure DevOps サービスのランディングページを開きました。(ここまでくるのに30分はかかりました。)

![Azure DevOps LP](https://i.gyazo.com/624c683a5cab8a36ceb310d716e83138.png)

昔作ったと思しきプロジェクトを開くページに辿り着きました。

![Azure DevOps Profile](https://i.gyazo.com/2ee767ceb8459e9d8b97247068e54155.png)

ユーザー設定のアイコンから `Personal access token` が選択できます。

![PAT menu](https://i.gyazo.com/b454fa1569bbb28fbfba9a17d92ff04f.png)

あとは、トークンの発行です。Marketplace に公開するパーミッションのスコープはデフォルトの画面では出てこないので、`Custom defined` を選択した上で全てのスコープを表示し、`Marketplace` の `Acquire` と `Manage` にチェックを入れます。

![new token](https://i.gyazo.com/88f994d4c482caea9bf972209dc08721.png)

`Create` をクリックするとようやくトークンを取得できます。これで拡張をパッケージングして公開できます。

まず、パッケージング、公開用の CLI である vsce をインストールします。

```shell
npm install -g @vscode/vsce
```

次に拡張のプロジェクトディレクトリで `vsce package` を実行してパッケージングを実行します。

```shell
$ vsce package
This extension consists of 460 files, out of which 364 are JavaScript files. For performance reasons, you should bundle your extension: https://aka.ms/vscode-bundle-extension . You should also exclude unnecessary files by adding them to your .vscodeignore: https://aka.ms/vscode-vscodeignore
 DONE  Packaged: /Users/kondoh/dev/changelog-support/changelog-support-0.2.0.vsix (460 files, 431.29KB)
```

`changelog-support-0.2.0.vsix` のような名前で Visual Studio パッケージファイルが生成されます。

最後は公開です。先ほど作成したトークンをクリップボードにコピーしておき、`vsce publish` を実行してトークンを貼り付けます。

```shell
$ vsce publish
This extension consists of 460 files, out of which 364 are JavaScript files. For performance reasons, you should bundle your extension: https://aka.ms/vscode-bundle-extension . You should also exclude unnecessary files by adding them to your .vscodeignore: https://aka.ms/vscode-vscodeignore
https://marketplace.visualstudio.com/manage/publishers/
Personal Access Token for publisher 'kondoumh': ****************************************************

The Personal Access Token verification succeeded for the publisher 'kondoumh'.
 INFO  Publishing 'kondoumh.changelog-support v0.2.0'...
 INFO  Extension URL (might take a few minutes): https://marketplace.visualstudio.com/items?itemName=kondoumh.changelog-support
 INFO  Hub URL: https://marketplace.visualstudio.com/manage/publishers/kondoumh/extensions/changelog-support/hub
 DONE  Published kondoumh.changelog-support v0.2.0.
```

無事公開されたようです(反映まで数分かかります)。

## 拡張をインストールする

リリースした拡張をインストールしてみます。

Codespaces では VS Code と同様に検索してインストール可能です。

![Install on Codespaces](https://i.gyazo.com/9b759be3ce52ab060066947d970db930.png)

普通に動作しました。

VS Code でインストール済みの場合は、ウィンドウ再起動のタイミングで最新版がダウンロードされ、リロードを促されました。

![Update on VS Code](https://i.gyazo.com/34eb30baa3a98ba3eea4db4a169d8449.png)

## 最後に
VS Code 拡張も一度作ってみるとさほど難しくないと思います。Codespaces の普及により、自作の拡張を対応する必要に迫られることもあるでしょう。ホスト OS の API などを使っていなければそれも難しくはありません。

ただ、Marketplace への公開は、Azure のアカウントで PAT を発行しないといけないため、常日頃使っていない筆者はけっこう手間取りました[^4]。

[^4]: Azure のサービス体系もかなり変化しますし、作成したアカウントを消していたりすると詰んでしまいますね。

公式ではないですが、GitHub Actions でリリースするための Action を作っている人もいました。

[Publish VS Code Extension - GitHub Marketplace](https://github.com/marketplace/actions/publish-vs-code-extension)
