---
title: 脱TeraTerm、便利で簡単な「RLogin」を使ってみよう。
author: takahiro-maeda
date: 2024-12-02
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
tags: [advent2024, ターミナルエミュレータ, ターミナル, RLogin]
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2024](/events/advent-calendar/2024/)第2日目の記事です。

## はじめに

WindowsでAWSのEC2やAzureのVMなどの仮想マシン等の操作をする際に、皆さんはどのターミナルソフトを利用されていますか？

多種多様なターミナルソフトがありますが、「TeraTerm」は利用した経験がある人は非常に多いかと思います。筆者もIT業界に入ってからTeraTermを利用していましたが、使いづらさを感じていました。

そこから何か良いターミナルソフトはないかと探していた時に出会ったのが「RLogin」です。
今回は、「RLogin」の機能の一部を紹介させていただきたいと思います。

::: info
本記事の対象は以下の人を想定しています。
- 簡単に設定できるターミナルを利用したい人
- TeraTerm以外のターミナルソフトを知りたい人
- TeraTermの機能を持て余していると感じる人
:::

## TeraTermの歴史と発展

TeraTermは主にサーバーインフラの運用管理の現場で多く利用されており、日本国内のターミナルソフト(エミュレータ)のシェアでは1位といっても過言ではありません。
このような高いシェアを獲得できた理由として、長年にわたる利用実績による安定性と信頼性が挙げられます。

TeraTermの歴史は古く、前身のTeraTerm Proの最終バージョン2.3が1998年3月10日にリリースされました[^1] [^2]。
その後、現在も広く利用されているTeraTermProjectによるTeraTermのバージョン4.10が2005年1月30日にリリースされ、 約20年にわたって開発が継続されています。
さらに、Unicode対応を実現したTeraTerm 5.0が2023年10月15日にリリースされ[^3]、現在に至ります。

[^1]:[TeraTermについて>まえがき](https://teratermproject.github.io/manual/5/ja/about/foreword.html) より参照
[^2]:[Tera Term Home Page](https://hp.vector.co.jp/authors/VA002416/)　より参照
[^3]:[TeraTermについて>改版履歴](https://teratermproject.github.io/manual/5/ja/about/history.html#teraterm) より参照

## RLoginとは
::: info
プロトコルの「rlogin」と、ターミナルソフトの「RLogin」は別物です。
混同にご注意ください。
:::

RLoginは、Windows上で動作するターミナルソフトです。
1998年はrlogin、telnetのみの対応でしたが、2005年にSSH1/SSH2へ対応した本格的なターミナルソフトとなりました。
以降は1-2か月のサイクルでリリースが継続されている、TeraTermProjectと同時期から存在する歴史あるターミナルソフトです。[^4]
執筆時点(2024年11月)での最新版は2.29.9です。

[^4]:[RLogin>プログラム・ヒストリー](https://kmiya-culti.github.io/RLogin/history.html) より参照

## Rloginを勧めるポイント

筆者が「RLogin」を勧めるポイントは以下の通りです。
- 必須機能は揃っていること。
- UIで直感的に操作でき、各種設定のカスタマイズ性が高く、設定も容易であること。
- 「あったらいいな」と思う機能が厳選されていること。
  - RLoginの公式ページが読みやすいこと。
  - 公式ページに、各機能のユースケースがまとめられている。
  - 一覧から各機能を閲覧でき、画像付きで分かりやすい。
- ソースコードが公開されたフリーソフトであること（商用・個人利用に制限なし）。
  - ライセンスによってはソフトを使用する際に注意しなければなりませんが、RLoginの利用に関しての制限は特に設けられていません。

## インストール方法
[RLoginの公式Github](https://github.com/kmiya-culti/RLogin/releases/)から最新版のzipをダウンロードし、解凍後に`RLogin.exe`を実行することで利用可能です。
exeをショートカットやタスクバーに保存しておくと、すぐに立ち上げることができます。

## 基本の使い方
### おすすめの初期設定
筆者のおすすめする初期設定を以下に挙げます。

#### クリップボード設定
- 左クリックの範囲指定だけクリップボードにコピーする
- 右クリックで貼り付け
![クリップボード設定画面](/img/blogs/2024/1202_RLogin_introduction/rlogin_initial_clipbord.png)

追加で筆者のオススメの設定を以下にあげます。
#### カラー設定
  - 背景を変えたい場合、デフォルトで用意されいているプリセットが14セットあります。
  - サーバーの環境（本番・開発）や、役割（バックエンド・DBサーバー）などで色分けするとよいと思います。
  ![ターミナル背景カラー設定画面](/img/blogs/2024/1202_RLogin_introduction/rlogin_backscreen_color_setting.png)

#### テンプレート・標準設定
- 前述の初期設定が終われば、テンプレートとして保存しておきます。
  - テンプレートを標準設定としておくと、接続先を新規で作成する際に標準設定した項目は再設定が不要になります。  
    - 例えば、クリップボードの赤枠部分の設定のONにしておきます。
    ![テンプレート用の設定](/img/blogs/2024/1202_RLogin_introduction/rlogin_template_setting.png)
    - テンプレートとして保存し、標準設定としておきます。
    ![標準設定](/img/blogs/2024/1202_RLogin_introduction/rlogin_default_setting.png)
    - 接続先の新規作成すると、標準設定した項目（黄枠）が全てONになっていることが分かります。
    ![標準設定を引き継いだ状態](/img/blogs/2024/1202_RLogin_introduction/rlogin_new_server_connect.png)
- 標準設定を除外、別の接続設定を引き継ぎたい場合
  - サーバー選択画面から該当サーバーを右クリックし、「標準設定に戻す」で以下変更が可能です。
    - 「プログラムの初期値まで戻す」を選択することで、該当サーバー設定を初期化できます。
    - 「右記の設定に合わせる」を選択することで、別サーバーの設定をインポートできます。 
    ![標準設定に戻す](/img/blogs/2024/1202_RLogin_introduction/rlogin_return_default_setting_dialog.png)

#### タブ機能
- サーバー選択画面をグループで表示できます。
- 以下の2種類方法があります。
  - タブ表示方式
    - サーバー設定画面のタブ(上)に、タブ（グループ）の名を設定で表示可能。
  ![タブ(横表示)](/img/blogs/2024/1202_RLogin_introduction/rlogin_tab_setting_x_view.png)
  ![タブ設定(横表示)](/img/blogs/2024/1202_RLogin_introduction/rlogin_tab_xview.png)
  - 階層表示方式
    - サーバー設定画面のタブ(上)に、タブ（グループ）の名の頭に「￥」を付けることで表示可能。
  ![タブ設定(階層表示)](/img/blogs/2024/1202_RLogin_introduction/rlogin_tab_setting_tree_view.png)
  ![タブ(階層表示)](/img/blogs/2024/1202_RLogin_introduction/rlogin_tab_tree_view.png)

### 接続情報の保存

前述の初期設定が終われば、サーバー接続情報・設定を保存しておきましょう。
サーバー選択画面では他にも、以下のように接続情報を利用できます。
- ショートカットの作成（★）
  - デスクトップ等の任意の場所に配置することで、ワンクリックでサーバーに接続ができます。
- 設定情報を独自のRLoginFile(拡張子 `.rlg`)からインポートやエクスポート
- 設定情報のクリップボードへのコピー・クリップボードからのペースト

::: alert
パスワード認証方式を利用している場合はPWの保存も可能ですが、セキュリティの観点からPW保存は極力避けましょう。
利用パターン・利用環境、企業での利用の場合には運用ルールに注意しましょう。
:::


### サーバーへ接続する

サーバーを選択して、「OK」ボタンでサーバーに接続できます。
![サーバー接続画面](/img/blogs/2024/1202_RLogin_introduction/rlogin_server_select.png)

## おすすめ機能3選

### 画面分割機能
Rloginの目玉機能であるのが、「画面分割機能」です。
近年は1920×1080のフルHDがデフォルトになりつつあり、4K・8K・ウルトラワイドなど画面解像度が高くなったことで表示できる情報量が増えています。[^5]
![画面分割デモ](/img/blogs/2024/1202_RLogin_introduction/rlogin_full_screen.png)

1つの画面で複数のサーバー情報を同時に見たいという方にはこの機能はとても便利で充実しています。
（もちろん、Rloginを複数ウィンドウでの利用も可能です。）
ショートカットで以下の機能を利用可能です。
- 分割ショートカット
  - 縦方向に分割して接続(Ctrl+DOWN(↓))	
  - 横方向に分割して接続(Ctrl+RIGHT(→))	
  - 縦方向に分割して新規接続(Ctrl+Shift+DOWN(↓))	
  - 横方向に分割して新規接続(Ctrl+Shift+RIGHT(→))	
- ウィンドウ移動ショートカット
  - 次のウィンドウに移動(Ctrl+TAB)
  - 前のウィンドウに移動(Ctrl+Shift+TAB)
  - 上のウィンドウに移動(Alt+UP(↑))
  - 下のウィンドウに移動(Alt+DOWN(↓))
  - 右のウィンドウに移動(Alt+RIGHT(→))
  - 左のウィンドウに移動(Alt+LEFT(←))

[^5]:筆者も、4Kモニターと1920×1080モニターのマルチディスプレイで利用しています。
### ペースト確認機能
デフォルトでONのペースト確認機能も個人的に便利な機能です。
これは複数行の文字列をペーストする際に表示され、
タブ・改行コードの個数表示する機能は独自であり、実務でも使えると思います。

例えば、ペーストした際に意図しない末尾の改行やタブが混ざっていることがあります。
(エクセルやスプレッドシート、Webからコピーした際に末尾改行やタブが紛れ込んだ経験、ありませんか？)

テキストエディタ上での見た目では見逃してしまいがちですが、このペースト確認機能のタブ・改行コードの個数を確認することで、意図しない文字列のペーストを未然に防ぎ、エラーとなる原因を排除できます。
本番環境等での実行などミスが許されない場合などや、コマンドやシェルを正確に動作させる事前確認において役立つと思います。

::: info
以下画像は、末尾にタブ・改行が入っていることが分かるように、
該当箇所を範囲選択しています。
:::

- 末尾にタブが混入しているケース
![末尾にタブが混入しているケース](/img/blogs/2024/1202_RLogin_introduction/rlogin_paste_tab_pattern.png)
- 末尾に改行が混入しているケース
![末尾に改行が混入しているケース](/img/blogs/2024/1202_RLogin_introduction/rlogin_paste_rn_pattern.png)

どちらも、ペースト確認機能のエディター上で不要なタブや改行を削除の上、送信可能です。

### 検索機能
本格的な検索・抽出には向きませんが、ターミナル表示画面上の文字列検索機能があります。
右クリックメニューもしくは画面上部バーの編集から、「文字列検索」を押下します。任意の方法で検索すると、該当箇所が色付きで表示されます。

文字列を検索したい場合に利用でき、英大文字・小文字区別なし検索・ワイルドカード/正規表現検索にも対応しています。これもちょっと調べたいなと思った時に使える、便利な機能です。

![検索機能を使う](/img/blogs/2024/1202_RLogin_introduction/rlogin_string_search.png)
検索した文字列が色付いて表示されます。
![検索機能の結果](/img/blogs/2024/1202_RLogin_introduction/rlogin_string_search_result.png)

## まとめ
今回の記事では紹介しきれないほど、様々な機能がRLoginにはあります。
TeraTermにも良い点はたくさんあります。しかし、独特なマクロなど、学習コストが高い側面があります。

学習コスト/ハードルが高いと、ちょっとしたアイディアが浮かんでも実行に移しずらくなります。
反面、RLoginはUIで多くの設定をカスタマイズでき、公式HPも読みやすく、学習ハードルは低めといった観点から非常におすすめです。
私も半年ほど利用していますが、本記事を読んでいただいた人には是非試していただければと思います。

## 最後に
本記事は[豆蔵デベロッパーサイトアドベントカレンダー2024](/events/advent-calendar/2024/)の1本目です。
本日12月2日から12月25日までの平日の18日間、様々な記事の公開を予定しております。
是非、最後までご覧いただけますと幸いです。