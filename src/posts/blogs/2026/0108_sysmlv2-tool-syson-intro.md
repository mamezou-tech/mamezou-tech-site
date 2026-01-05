---
title: 無料のOSSツールSysONで始めるSysML v2モデリング（１） 〜 はじめてのSysON
author: yasumasa-takahashi
date: 2026-01-08
tags: [SysON,SysMLv2,MBSE,モデリング]
image: true
---

2025年9月、SysML Version 2.0(SysML v2)が正式リリースされました。

「SysML v2を試してみたい」と思っても対応しているツールは高価だったり、汎用の描画ツールで SysML v2のモデルを作成してみてもいまいちピンとこなかったりといった経験はないでしょうか。

本記事では「SysML v2のグラフィカル記法がどんなものか試してみたい」という時におすすめのツール SysONをご紹介します。

## SysONとは
SysON（読みは**シスオン**または**スィスオン**）は、SysML v2の主にグラフィカル記法を作成、編集するためのツールです。
この名前は、「システムにオンする」と「システムモデリングの新しいシーズン（seasonとsysonはやや音が似ている）」というのが由来だそうです。

SysONのソースコードは [GitHub](https://github.com/eclipse-syson/syson)で公開されています。
ライセンスは EPL-2.0です。
GitHubのリポジトリ名（eclipse-syson / syson）からわかるとおり、このツールは Eclipse財団の SysONプロジェクトで開発・保守されています。
この SysONプロジェクトはフランスの OBEO社と CEA（フランス原子力・代替エネルギー庁）が主導し、実開発は OBEO社が担っています。

ちなみに、「OSSツール、フランス、Eclipse財団」といえば、UML2モデリングツールである [Papyrus](https://projects.eclipse.org/projects/modeling.papyrus)を思い浮かべる方もいるかもしれません。
日本では認知度の低いツールですので知らない方も結構いらっしゃるのではないかと思います。
実はこの Papyrusの開発も SysONと同じ OBEO社が担っています。
Papyrusは SysML v1をサポートしているので、SysML v1を使いたいなら Papyrus、SysML v2を使いたいなら SysONという棲み分けになっているのかなと思います。

## SysONの構成
SysONは Webアプリケーションです。
ユーザーはクライアントPCの Webブラウザで SysONサーバーにアクセスします。
ユーザーが Webブラウザで行ったモデルに対する操作は SysONサーバーで実行されます。

![SysONの構成](/img/blogs/2026/sysmlv2-tool-syson-intro/system.png)

複数のユーザーによるモデリングが可能ですし SysML v2仕様には REST APIの要件もありますので、Webアプリケーションは妥当だと思います。
しかしその一方、ネットワーク環境によっては動作が遅くすぐに表示が更新されないといったデメリットもあるため、モデリングの操作に慣れてくるとストレスを感じることもあるかもしれません。

マニュアルに記載されているサポートする Webブラウザは Google Chromeと Firefoxの最新安定版です。
Safari、Microsoft Edge、Operaなど他のブラウザを用いる場合は使えるかどうか検証してからがよいでしょう。

英語ですが、SysONの[ユーザーマニュアルに該当するドキュメント](https://doc.mbse-syson.org/syson/main/)もあります。

## インストール
### 事前準備
まずはどのリリースをインストールするかを決めましょう。

リリースは [Eclipse SysONの Webサイト](https://projects.eclipse.org/projects/modeling.syson/governance)に記載されています。
[GitHubの Tags](https://github.com/eclipse-syson/syson/tags)を確認するといくつもの Tagがありますが、末尾に ".0" が付いているものが安定版の位置づけになります。

本記事では、安定版である v2025.8.0をインストールします。

インストール方法は [マニュアル（v2025.8.0）](https://doc.mbse-syson.org/syson/v2025.8.0/installation-guide/how-tos/install.html)に記載されています。
マニュアルにはインストール方法が４つ記載されていますが、大きく分けるとローカルテスト用と本番用の２タイプです。
セキュリティを気にしないならばローカルテスト用、セキュリティを考慮すべき環境ならば本番用の方法でインストールしましょう。

本記事は SysML v2を試しに使ってみることを想定していますので、[Basic Local Test Setup](https://doc.mbse-syson.org/syson/v2025.8.0/installation-guide/how-tos/install/local_test.html)のインストールを行います。

SysONのローカルテスト用インストールには Docker Engineを使用します。
Docker Desktopは有償ですが、Docker Engineは Apache License 2.0ですので無料で利用できます。
ここでは Docker Engineのインストール方法は割愛します。
筆者は Windows11とその WSL2(Debian/Linux)に Docker Engineをインストールしました。

Docker Engineのインストールが完了したら SysONのインストールを開始します。

### docker-compose.ymlを取得する
Webブラウザで [GitHubにある SysONの Webページ](https://github.com/eclipse-syson/syson/tree/v2025.8.0)にアクセスして、docker-compose.ymlをダウンロードします。

curlコマンドを用いて docker-compose.ymlをダウンロードする場合は以下の通りです。

```bash
curl -OL https://raw.githubusercontent.com/eclipse-syson/syson/refs/tags/v2025.8.0/docker-compose.yml
```

### dockerを起動する
Docker Engineのサービスを起動するにあたって、現状の確認をしましょう。

serviceコマンドで dockerサービスの状態を確認します。

```bash
sudo service docker status
```

dockerサービスが起動していない場合は以下のメッセージが表示されます。

```
Docker is not running ... failed!
```

Docker Engineのサービスを起動します。

```bash
sudo service docker start
```

再び、サービスの状態を確認してみましょう。

```bash
Docker is running.
 ```

dockerサービスが起動しました。

先程ダウンロードした docker-compose.ymlファイルのあるフォルダで以下のコマンドを実行します。

```bash
docker compose up
```

SysONサーバーが bootすると、コンソールログの一部に以下のロゴが出力されます。

```bash
app-1       |     _____               ____   _   __
app-1       |    / ___/ __  __ _____ / __ \ / | / /
app-1       |    \__ \ / / / // ___// / / //  |/ /
app-1       |   ___/ // /_/ /(__  )/ /_/ // /|  /
app-1       |  /____/ \__, //____/ \____//_/ |_/
app-1       |        /____/
app-1       |
app-1       |  :: Spring Boot ::         (v3.5.0)
app-1       |
```

起動が正常に完了すると、以下のメッセージが表示されます。

```bash
app-1       | 2025-12-01T06:45:59.914Z  INFO 1 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port 8080 (http) with context path '/'
app-1       | 2025-12-01T06:45:59.937Z  INFO 1 --- [           main] org.eclipse.syson.SysONApplication       : Started SysONApplication in 18.896 seconds (process running for 19.808)
```

`Tomcat started on port 8080 (http)` は Webサーバーである Apache Tomcatが起動したことをあらわします。

SysONサーバーが起動したら、いよいよ Webブラウザから SysONサーバーアクセスしてみましょう。

### 最初の画面
Webブラウザを起動し、`http://localhost:8080` にアクセスします。

以下のホーム画面が表示されれば準備完了です。

![SysONの初期画面](/img/blogs/2026/sysmlv2-tool-syson-intro/homepage.png)

ちなみにこの画面の Existing Projectsのリストにある "Batmobile"は、あのアメコミヒーローが使っている車を題材にしたサンプルです。

## 終了する
SysONサーバーを起動したシェルで Ctrl + Cすると SysONサーバーが終了します。

dockerサービスを停止する場合は、以下のコマンドで停止します。

```bash
sudo service docker stop
```

## 次回予告

ここまでで SysONを使ってモデリングする準備が整いました。

次回からはいよいよ、SysONを使った SysML v2のモデリング操作をみていきましょう。
