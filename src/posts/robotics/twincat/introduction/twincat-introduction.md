---
title: TwinCATで始めるソフトウェアPLC開発（その1：開発環境構築編）
author: hayato-ota
tags: [PLC, TwinCAT]
date: 2025-04-10
---

本記事は、「TwinCATで始めるソフトウェアPLC開発」シリーズの第1回目です。
他の章も併せてご覧ください。

第1回：環境構築編 （今回）
[第2回：ST言語でのプログラミング（1/2）](https://developer.mamezou-tech.com/robotics/twincat/introduction-chapter2/twincat-introduction-chapter2/)
第3回：ST言語でのプログラミング（2/2）← 絶賛作成中！

# 0. はじめに
TwinCATはEtherCATの開発元で有名なドイツの企業Beckhoff Automation GmbH[^1]（以下，Beckhoffと記載）が提供する産業用オートメーションシステム向けのプラットフォームです。
いわゆるソフトウェアPLCであり，同じソフトウェアPLCアプリケーションとして知名度の高いCODESYSをOEM採用しています。

本記事並びに関連記事では，TwinCATによるソフトウェアPLCの開発手順について共有したいと思います。

なお，記事で使用するTwinCATバージョンは「TwinCAT 3.1 Build 4026」[^3]とします。

# 1. TwinCATとは
## TwinCATの概要
TwinCATを一言で表すと，「PCをPLC化するアプリケーション」です。

一般的なWindowsOSはリアルタイム性に欠けるため、タイムクリティカルな処理が求められる産業用途には適さないことがあります。TwinCATを導入することで、PCベースのWindowsシステムにリアルタイム制御機能を追加できます。

:::info
現時点で主にサポートしているOSはWindowsのみですが，実はFreeBSDに対応したTwinCAT/BSD[^4]も存在します。
また，今後Linux版にも対応予定[^5]とのことです。（2025Q3予定？）
:::

PLCプログラムの開発では，IEC61131-3で規定された5つの言語に加えC++も利用可能です。

- LD（Ladder Diagram）言語
- FBD（Function Block Diagram）言語
- ST（Structured Text）言語
- IL（Instruction List）言語
- SFC（Sequential Function Chart）言語
- C++言語
    - ただし一部制約あり

## TwinCATとOSの関係
一般的なアプリケーションとは違い，TwinCAT（正確にはTwinCATの実行環境）はより深い階層で動作するアプリケーションです。
TwinCAT独自のリアルタイムカーネルがOSから独立した形で動作します。作成したプログラムはカーネルモードで動作されます。

![twincat-and-windows](/img/robotics/twincat/introduction/twincat-and-windows.png)
（上図は[こちら](https://sites.google.com/site/twincathowto/cc/%E8%83%8C%E6%99%AF%E7%9F%A5%E8%AD%98%E3%81%AE%E7%BF%92%E5%BE%97%E6%BA%96%E5%82%99/twincat-3-cc-%E3%81%AE%E5%9F%BA%E7%A4%8E)より抜粋）

:::info: TwinCAT設計に関するドキュメント
TwinCATの設計思想は下記リンク先から確認できます。
[TwinCAT3 Product Overview - Philosophy](https://infosys.beckhoff.com/english.php?content=../content/1033/tc3_overview/4275768971.html&id=)
:::

## 開発環境（XAE）と実行環境（XAR）
TwinCATは主に2つのソフトウェアに大別できます。

- XAE（e<b>X</b>tended <b>A</b>utomation <b>E</b>ngineering）
  - TwinCATの開発環境
  - 開発・デバッグを行う際に使用する
- XAR（e<b>X</b>tended <b>A</b>utomation <b>R</b>untime）
  - TwinCATの実行環境
  - PLCプログラムをリアルタイム実行する際に使用する

この2つのソフトウェアは同一PCにインストールする必要はなく，別々のPCにインストールしても構いません。
つまり，下記2パターンのシステム構成が実現可能です。

- パターンA：XAE/XARが同一PC上に存在する
  - 最もミニマムな構成
  - 例：単一PCで実現したい場合など

<img src="/img/robotics/twincat/introduction/twincat-xae-xar-same-pc.png" width="600">

- パターンB：XAEは開発PCに，XARは実行PCに存在する
  - システムの規模は広がるが，複数人での開発や開発PCに実行環境をインストールしたくない場合に有用
  - XAEとXAR間では，ADS（Automation Device Specification）という独自のプロトコルで通信が行われます
  - 例：実行PCは現場に存在，事務所のPCで開発したい場合など

<img src="/img/robotics/twincat/introduction/twincat-xae-xar-diff-pc.png" width="700">

本記事ではパターンB（XAEとXARは別PC）の構成を前提に話を進めます。

:::stop: 
前節で述べた「カーネルモードで動作」するのはXARのみです。XAEは通常のアプリケーションです。
本記事では万が一のリスクを考え，**XAEとXARを別々のPCにインストールすることを強く推奨します。**
:::

:::info: パターンAとパターンBのハイブリッド
もう1つのパターンとして，開発PCにはXAEのみを，実行PCにはXAEとXARの両方をインストール可能です。
しかし，環境が冗長なため本記事では詳しく紹介しません。
:::

# 2. 開発環境構築
今回はPCを2台用意し，1台に開発環境（XAE）を，もう1台には実行環境（XAR）をインストールしていきます。
大まかな流れを下記に記します。

1. Beckhoffアカウントを作成する
2. 開発PCにTwinCAT Package Managerをインストールする
3. 開発PCにXAE（開発環境）をインストールする
4. 開発PCでXAR（実行環境）のパッケージをダウンロードする
5. 開発PCから実行PCにパッケージを転送する
6. 実行PCにTwinCAT Package Managerをインストールする
7. 実行PCにXARをインストールする

少し長いですが，お付き合いください。


## システム構成
本記事で構築するシステム構成を下図に示します。

- 開発PC = 開発環境のみが動くPC。インターネットに接続しているとする。
- 実行PC = 実行環境のみが動くPC。インターネットに接続されていないとする。

:::alert
本記事ならびに関連記事ではBeckhoff製の産業用PCは使用せず，一般的なノートPCを使用しています。
リアルタイム処理のパフォーマンスを重視する場合は，産業用PCを使用することを検討してください。
:::

<img src="/img/robotics/twincat/introduction/tobe-system-configuration.png" width="600">

## Beckhoffアカウントの作成
[Beckhoff公式サイト](https://www.beckhoff.com/ja-jp/)に移動し，画面上部の「サインイン」をクリックします。
表示される部分の「登録」ボタンを押下して表示される画面からアカウント登録してください。

![register-beckoff-account](/img/robotics/twincat/introduction/register-beckoff-account.png)

## TwinCAT Package Managerのインストール
TwinCATに関連するソフトウェアは TwinCAT Package Manager（コマンドなどでは`tcpkg`と略される）を使用してインストールします。

[TwinCAT Package Manager ダウンロードページ](https://www.beckhoff.com/ja-jp/products/automation/twincat/twincat-3-build-4026/)に移動して，`Download TwinCAT Package Manager`をクリックします。

![beckhoff-download-tpkg-button](/img/robotics/twincat/introduction/beckhoff-download-tpkg-button.png)

ダウンロード画面が開きますが，その前にログインする必要があります。
下部の`Log in`ボタンからログインしてください。

ログイン後，`EXE`ボタンを押下することでインストーラがダウンロードされます。

![tcpkg-download](/img/robotics/twincat/introduction/tcpkg-download.png)

ダウンロードしたexeファイルを実行してTwinCAT Package Managerをインストールします。

![tcpkg-installer](/img/robotics/twincat/introduction/tcpkg-installer.png)

インストールが完了したら，再起動を求められるのでPCを再起動してください。

## TwinCAT Package Managerのセットアップ
デスクトップ上のショートカットからTwinCAT Package Managerを起動します。

![twincat-package-manager-icon](/img/robotics/twincat/introduction/twincat-package-manager-icon.png)

:::info
ショートカットファイルのリンク先は`C:\Program Files(x86)\Beckhoff\TcPkgUi\bin`です。
:::

最初に表示される「Feed Configuration」画面にて、パッケージの供給元を指定します。 
インターネットからパッケージを取得するためにアカウントが必要になるため，アカウント情報を入力します。

Usernameにはアカウントのメールアドレスを、Passwordにはパスワードを入力します。 
入力したらSaveボタンをクリックします。 

![tcpkg-feed-configuration](/img/robotics/twincat/introduction/tcpkg-feed-configuration.png)

Saveボタン押下後にPowerShellの実行権限を求められるため「OK」を選択します。 

:::info
TwinCAT Package Managerの画面で操作した内容はバックグラウンドで動作しているPowerShellによって実施されます。
そのため，権限リクエストは今後の手順で何度も表示されます。
リクエストされた場合は，適宜OKを選択してください。 
:::

次に，「Startup configuration」画面にて、TwinCAT Package Managerの初期設定を行います。 
下記のように設定します。

![tcpkg-startup-configuration](/img/robotics/twincat/introduction/tcpkg-startup-configuration.png)

各設定項目の詳細を以下に記します。

- UseVS2022
  - 選択した既存のVisualStudioに開発環境を統合するか
- UseTcXaeShell
  - TwinCAT IDE（TwinCAT統合開発環境）（32bit版）をインストールするか
- UseTcXaeShell64
  - TwinCAT IDE（TwinCAT統合開発環境）（64bit版）をインストールするか

:::info: UseVS2022の選択肢について
本選択肢はPCにVisualStudioがインストールされている場合にのみ表示されます。
選択した既存のVisualStudioにTwinCATの開発環境が統合するかどうかを指定します。
TwinCAT内でC++プログラムを構築する場合は統合が必須となりますが，VisualStudioの表示が一部変更となるため
不要な場合は「No Integration」を選択しておきましょう。
:::

設定に問題が無ければ，画面下部のNextを選択します。
その後，下図のようにインストール可能なパッケージ一覧が表示されることを確認してください。

![tcpkg-top-screen](/img/robotics/twincat/introduction/tcpkg-top-screen.png)

TwinCAT Package Managerのセットアップは以上で完了です。

## 開発PCにXAEをインストールする
次に，開発環境をインストールします。

TwinCAT Package Managerの画面から，「TwinCAT Standard」の部分のチェックボックスをチェックします。
![tcpkg-select-twincat-standard-package](/img/robotics/twincat/introduction/tcpkg-select-twincat-standard-package.png)

画面右側に`TwinCAT Standard-Engineering`と`TwinCAT Standard-Runtime`の2つが表示されます。
開発PCに実行環境（Runtime）はインストールしないため，×ボタンを押して削除してください。

![tcpkg-delete-runtime-selection](/img/robotics/twincat/introduction/tcpkg-delete-runtime-selection.png)

Engineeringのみを選択状態として，Installボタンを押下してインストールします。

![tcpkg-press-install-button](/img/robotics/twincat/introduction/tcpkg-press-install-button.png)

これでXAEのインストールは完了です。
念のために開発PCを再起動しておきましょう。

## 実行PCへのXARインストールに必要なファイル群を開発PCでダウンロードする
実行PCはインターネットに接続していないため，開発PCと同じ方法でのインストールは出来ません。
そのため，開発PCで必要なファイルをダウンロードし，USBメモリなどを使って実行PCに転送します。

:::info: 実行PCがインターネットに接続されている場合
実行PCがインターネットに接続できる状態であれば，開発PCと同じ方法でXARをインストール可能ですので以降の手順は不要です。
:::

まず，コマンドプロンプトもしくはPowerShellを開き，下記のコマンドを入力します。

```
tcpkg list -t workload
```

これを実行すると，インストール可能なパッケージの一覧が表示されます。
「TwinCAT.Standard.XAE」と「TwinCAT.Standard.XAR」が最下部にあることを確認してください。

![tcpkg-list](/img/robotics/twincat/introduction/tcpkg-list.png)

:::column: tcpkgコマンド
tcpkgはTwinCAT Packageの略です。
詳細なコマンドは下記リンク先をご覧ください。
[TwinCAT3 - Working with the command line](https://infosys.beckhoff.com/english.php?content=../content/1033/tc3_installation/15698626059.html&id=)
:::

確認したら，下記のコマンドを1行ずつ入力して必要なパッケージ群（実態はNuPkgファイル）をダウンロードします。
（出力先は適当に読み替えてください。）

```
tcpkg download TwinCAT.Standard.XAR -o "C:\TwincatOfflineInstaller\XAR"
```

ここで，下記の点に注意してください。
- 出力先であるディレクトリは予め作成しておく必要があります
- インストール途中に確認が何回か求められます




## 開発PCから実行PCに必要なファイル群を転送する
USBメモリなどを使用して，下記の2つを実行PCに転送します。

- TwinCAT-Package-Managerのインストールファイル
- XARフォルダ

今回は`C:\TwincatOfflineInstaller\`内に配置しました。

![twincat-installers](/img/robotics/twincat/introduction/twincat-installers.png)

## 実行PCにインストールする
対象のファイルを実行PCに移動させたら，まずは先程と同様にTwinCAT Package Managerをインストールしましょう。
インストールが完了したら，TwinCAT Package Managerを起動します。

起動したら，Feed Configuration画面にてパッケージの供給元を指定します。
開発PCではパッケージをインターネットから取得していましたが，実行PCではインターネットに接続できないため先程のパッケージファイルを使用します。
Feed URLの部分にXARインストールパッケージを配置したディレクトリ指定しましょう。

ユーザ名やパスワードは空欄のままとし，OKボタンを押下します。

![tcpkg-feed-configuration-offline](/img/robotics/twincat/introduction/tcpkg-feed-configuration-offline.png)

その後，トップ画面で「TwinCAT Standard」が表示されることを確認してください。
この画面にて「TwinCAT Standard」を選択し，実行PCにXARの両方をインストールしてください。

実行PCへのインストールはこれで完了です。


# 3. ファイアウォール設定
本章では，開発PCと実行PC間での通信設定を行います。
両デバイス間ではADS通信(Automation Device Specification)というプロトコルが使用されます。
デフォルトの状態ではファイアウォールによりADS通信が行えません。設定で下表のポートでの通信を許可する必要があります。
開発PCと実行PCの両方で、ポートでの通信を許可してあげましょう。

| プロトコル | ポート番号 | 方向 | 用途 |
| --------- | --------- | ---- | --- |
| TCP | 48898 | 受信&送信 | ADS Communication |
| UDP | 48899 | 受信&送信 | ADS Broadcast Search |
| TCP | 8016  | 受信&送信 | Secure ADS |

:::info
開発PCと実行PCが同一デバイスの場合，本章の設定は実施する必要はありません。
:::

## ファイアウォール設定画面を開く
画面左下のWindowsマークを右クリックし、「検索」を選択します。 

![click-start-search](/img/robotics/twincat/introduction/click-start-search.PNG)

検索欄を使って「セキュリティが強化された Windows Defender ファイアウォール」をクリックします。 

![open-firewall-settings-dialog](/img/robotics/twincat/introduction/open-firewall-settings-dialog.png)

このダイアログからADS通信に必要な設定を追加します。

![firewall-settings-dialog](/img/robotics/twincat/introduction/firewall-settings-dialog.png)


## 受信の規則を追加する
画面左側にある「受信の規則」を右クリックし、「新しい規則」をクリックします。 

![click-new-reception-rule](/img/robotics/twincat/introduction/click-new-reception-rule.png)

上記の表に記した3つのポートの全てに対して規則を追加しましょう。
例えば「TCPの48898番ポート」の場合は下記のようになります。

- 規則の種類
  - 「ポート」を選択
- プロトコルおよびポート
  - TCPと48898番を指定する
- 操作
  - 「接続を許可する」を選択
- プロファイル
  - 必要なプロファイルを指定する
- 名前
  - 設定の名前と説明を記入する

![select-reception-rule-type](/img/robotics/twincat/introduction/select-reception-rule-type.png)
![select-reception-rule-port](/img/robotics/twincat/introduction/select-reception-rule-port.png)
![select-reception-rule-manipulation](/img/robotics/twincat/introduction/select-reception-rule-manipulation.png)
![select-reception-rule-profile](/img/robotics/twincat/introduction/select-reception-rule-profile.png)
![select-reception-rule-name](/img/robotics/twincat/introduction/select-reception-rule-name.png)

:::stop
下記の全てに対して設定してください。
- TCP, 48898番ポート
- UDP, 48899番ポート
- TCP, 8016番ポート
:::

設定が完了したら，受信規則一覧は下図のようになるはずです。
（名前は適宜読み替えてください）

![reception-rule-added](/img/robotics/twincat/introduction/reception-rules-added.png)

受信規則の設定は以上です。

## 送信の規則を追加する
続いて，送信規則を追加していきます。（方法は受信規則とほぼ同じです）
画面左側にある「送信の規則」→ 「新しい規則」から，先程と同様に3つの設定を追加します。
（詳細は割愛します）

:::alert:送信規則ウィザード内の「操作」画面
デフォルト値は「接続をブロックする」が選択されている点に注意してください。

![send-rule-manipulation](/img/robotics/twincat/introduction/send-rule-manipulation.png)
:::

設定が完了したら，送信規則一覧は下図のようになるはずです。（名前は適宜読み替えてください）

![send-rule-added](/img/robotics/twincat/introduction/send-rule-added.png)

送信規則の設定は以上です。


# 4. ADS通信ルート設定
さぁ，長かった開発環境構築ももう少しで完了です。
最後に開発PCと実行PC間でADS通信を行うためにルート設定[^6]を行います。

:::info: 開発PCと実行PCが同一の場合
開発PCと実行PCが同じPCである場合，本章の設定を行う必要はありません。
:::

:::info: 本章の内容を行う前に
本章の内容を行う前に，開発PCと実行PCをLANケーブルで接続し，お互いが同一ネットワーク上にあるように設定してください。
<img src="/img/robotics/twincat/introduction/tobe-system-configuration.png" width="600">
:::

開発PCの画面右下のシステムトレイを開き、紫色の歯車のアイコンを右クリックして「Router」 → 「Edit Routes」を選択します。

![open-ads-edit-routes](/img/robotics/twincat/introduction/open-ads-edit-routes.png)

「TwinCAT Static Routes」画面が表示されるので、左下の「Add」ボタンを選択します。 

![click-add-route-button](/img/robotics/twincat/introduction/click-add-route-button.png)

「Add Route Dialog」画面が表示されるので、画面左下の「Advanced Settings」にチェックを入れます。 

![ads-enable-advanced-settings](/img/robotics/twincat/introduction/ads-enable-advanced-settings.png)

チェックを入れると、画面下部に詳細な設定項目が表示されます。 
「Address Info」の選択欄で「IP Address」を選択します。

![ads-change-address-info](/img/robotics/twincat/introduction/ads-change-address-info.png)

画面右上の「Broadcast Search」ボタンをクリックし、同一ネットワーク内に存在するXARがインストールされたPCを探索します。 

![ads-click-broadcast-search](/img/robotics/twincat/introduction/ads-click-broadcast-search.png)

開発PCに複数のイーサネットアダプタ（USBアダプタも含む）が登録されている場合、どのアダプタに対して検索するかを選択する「Select Adapters」画面が表示されます。
意図しない機器との接続を防ぐため、XARがインストールされたPCと接続しているアダプタのみにチェックを入れてください。 

![ads-select-adapter](/img/robotics/twincat/introduction/ads-select-adapter.png)

XARがインストールされたPCが検出されます。IPアドレス等を確認し、問題がなければ「Add Route」をクリックします。 

![ads-select-and-add-route](/img/robotics/twincat/introduction/ads-select-and-add-route.png)

「SecureADS」画面が表示されるため、リモート接続するための設定をします。 
「Remote User Credentials」欄に接続対象である実行PCのユーザ名とパスワードを入力します。 

![ads-enter-remote-user-credentials](/img/robotics/twincat/introduction/ads-enter-remote-user-credentials.png)

:::info: Beckhoff社製のPCが実行PCの場合
接続対象がBeckhoff社製のPCの場合は、ユーザ名とパスワードは下記になります。 
User = Administrator 
Password = 1 
[Windows Operating Systems - General Information](https://infosys.beckhoff.com/english.php?content=../content/1033/sw_os/2019206411.html&id=)
:::

接続に成功すると、「Connected」の部分に鍵のアイコンが表示されます。 
確認したら、右下の「Close」ボタンを押して「Add Route Dialog」を閉じます。

![ads-check-connected](/img/robotics/twincat/introduction/ads-check-connected.png)

「TwinCAT Static Route」画面にて、先ほど追加したルート設定が表示され、緑色に塗りつぶされていることを確認します。 
緑色が表示されない場合，開発PCと実行PCが接続されているかを再度確認してください。

![after-route-added](/img/robotics/twincat/introduction/ads-after-route-added.png)

これでADS通信の設定は完了です。


# 5. 終わりに
長くなりましたがTwinCATの開発環境構築は以上となります。お疲れ様でした。
次回の記事では実際にPLCプログラムを作成し，TwinCAT上で動かしてみます。

次の記事：[第2回：ST言語でのプログラミング（1/2）](https://developer.mamezou-tech.com/robotics/twincat/introduction-chapter2/twincat-introduction-chapter2/)

【追記】
本記事作成中にBeckhoff公式から開発環境構築の手順が説明されている動画が公開されていました。
こちらも合わせてご覧ください。

[TwinCAT Howto - V.3.1.4026以降のインストール方法](https://sites.google.com/site/twincathowto/insutoruto-ji-ben-she-ding/v-3-1-4026%E4%BB%A5%E9%99%8D%E3%81%AE%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB%E6%96%B9%E6%B3%95?authuser=0)


[^1]: [Beckhoff Automation](https://www.beckhoff.com/ja-jp/)
[^2]: [CODESYS](https://www.codesys.com/)
[^3]: [The latest version of TwinCAT 3.1: Build 4026](https://www.beckhoff.com/ja-jp/products/automation/twincat/twincat-3-build-4026/)
[^4]: [TwinCAT/BSD](https://www.beckhoff.com/ja-jp/products/ipc/software-and-tools/twincat-bsd/)
[^5]: [TwinCAT runtime for real-time Linux](https://www.beckhoff.com/ja-jp/products/product-news/linux-r/)
[^6]: [TwinCAT Howto - リモートシステムへの接続](https://sites.google.com/site/twincathowto/insutoruto-ji-ben-she-ding/rimotoshisutemuheno-jie-xu?authuser=0)
