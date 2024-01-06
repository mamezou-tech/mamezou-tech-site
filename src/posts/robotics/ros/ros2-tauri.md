---
title: ROS2のGUI開発にTauriを使用した話
author: masayuki-kono
date: 2024-01-06
tags: [ROS2, Tauri]
---

ROS（Robot Operating System）やROS2でロボットシステムのアプリケーションを構築する際、皆さんはどのようにGUIを開発していますか？

開発者向けのツールであれば独自のプラグインを作成して[RQt](https://docs.ros.org/en/humble/Concepts/Intermediate/About-RQt.html)へ組み込んだり、非開発者を含むユーザ向けの画面であればQtで一から開発することもあるのではないかと思います。

或いは [rosbridge_suite](https://github.com/RobotWebTools/rosbridge_suite)の rosbridge_server を介してJSON APIでROSとの通信を行うWebアプリとして開発するパターンもあります。弊社でもリモートでロボットシステムを操作したりセンサ状態を確認するようなユースケースで使用しています。

タッチパネルにユーザ向けの画面を表示するような組み込みアプリにおいてはQtで一から・・・というのも有力な選択肢になりますが、最近、RustによるUIフレームワークである Tauri を使用してGUI開発を行いましたので本記事でご紹介致します。また、記事の後半ではROS2でTauriを使用するまでの手順についても示したいと思います。

Tauri については別記事の[「Rust によるデスクトップアプリケーションフレームワーク Tauri」](/blogs/2022/03/06/tauri/)で紹介していますので、合わせて確認いただければと思います。

## 事例紹介

### システム構成

以下のような構成のロボットシステムの開発で使用しました。PLCの先には多数のセンサや周辺機器が存在しますがここでは割愛しています。また、ロボットに標準で具備されているペンダント（ロボットの動作を教示する端末）についても割愛しています。運用時にはユーザはペンダントを使用せず、タッチパネル上で全ての操作を行います。

![システム構成](/img/robotics/ros/ros2-tauri-system-structure.png)

図中の「システム制御アプリ」が ROS2+Tauri で構成されるGUIアプリケーションで、産業用PC上で動作します。実行環境はUbuntu 22.04でROS2のディストリビューションは[Humble Hawksbill](https://docs.ros.org/en/rolling/Releases.html)です。

ChatGPTで作成したシステムのイメージです。実物と大分かけ離れていますが、タッチパネルからユーザがロボットシステムの操作を行う雰囲気が伝わればと思います。

![システムのイメージ](/img/robotics/ros/ros2-tauri-system-image.png)

### アプリケーション構成

システム制御アプリは複数のROS2ノードで構成され、各ノードが[ROS2の通信](https://docs.ros.org/en/humble/How-To-Guides/Topics-Services-Actions.html)（トピック、サービス、アクション）を行い連携することで各機能を実現します。

以下はノード構成のイメージです。各種ハードウェアとの通信ドライバの他に system_controller というノードがシステム全体の制御を管轄します。実際には他にも多数のトピックやノードが存在し、またノード間は多対多で通信を行っています。この内、web_ui というノードが Tauri上で構築され、他のノードとの通信をWebViewとの間で中継しGUI機能を担っています。ユーザはタッチパネルに表示されたWebViewの画面から操作を行い、web_ui ノードが system_controller ノードへROS2の通信で通知を行います。

![ノード構成](/img/robotics/ros/ros2-tauri-node-structure.png)

開発言語としては、GUIフロントエンドがTypescript（Meta社のReactを使用）、web_uiノードはRust、それ以外のノードはC++で開発しています。全ノードをRustで開発する案もありましたが、通信ドライバをRustへ移植するとなると開発負担が大きくなることと、過去の開発資産を流用するため却下しました。とは言え、Rustによる既存のソフトウエアの再実装は活発なので、機が熟したらノード単位でRustへの移行を検討したいと考えています。このような段階的な移行を行えるのもROS2のような分散型のアーキテクチャを採用するメリットですね。

## ROS2のノードをTauri上で構築する

ここからはROS2のノードをTauri上で構築するまでの手順について記述してゆきたいと思います。

### 開発環境

- OS
  - Ubuntu 22.04.03
- ROS2 Humble
  - [インストレーションガイド](https://docs.ros.org/en/humble/Installation/Ubuntu-Install-Debians.html)に従ってROS2をインストールして下さい。
- JavaScriptのパッケージマネージャー
  - 今回はyarnを使用します。最新安定版[^1]のNode.jsと併せてインストールして下さい。

      ```shell
      curl -fsSL https://deb.nodesource.com/setup_19.x | sudo -E bash -
      sudo apt update
      sudo apt install nodejs
      ```

      ```shell
      npm install --global yarn
      ```

- Tauri
  - [Tauriのガイド](https://tauri.app/v1/guides/getting-started/prerequisites#setting-up-linux)に従って依存パッケージとRustをインストールして下さい。
- RustのROS2クライアント
  - [r2r](https://github.com/sequenceplanner/r2r)を使用します。[^2]
  - 以下のコマンドで依存パッケージをインストールして下さい。

      ```shell
      sudo apt install clang
      ```

[^1]: 記事執筆時点では最新安定版のNode.jsは v20.10.0LTS でした。
[^2]: HumbleをサポートしているRust向けのクライアントライブラリとして他に [ros2-rust](https://github.com/ros2-rust/ros2_rust)が存在しますが、ROS2の通信方式の1つであるアクションは記事執筆時点の最新版である[0.4.1](https://github.com/ros2-rust/ros2_rust/releases) で未サポートでしたので、r2rを採用しました。

### ボイラープレートの作成

以下の選択肢で生成しました。
