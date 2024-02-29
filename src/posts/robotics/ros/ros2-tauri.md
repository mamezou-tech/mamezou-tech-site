---
title: ROS2のUI開発にTauriを使用した話
author: masayuki-kono
date: 2024-01-10
tags: [ROS2, Tauri]
image: true
---

ROS（Robot Operating System）や ROS2 を用いてロボットシステムのアプリケーションを構築する際、皆さんはどのような UI フレームワークを活用していますか。

開発者向けのツールに関しては、独自のプラグインを作成し、これを[RQt](https://docs.ros.org/en/humble/Concepts/Intermediate/About-RQt.html)に組み込む方法があります。また、開発者以外のユーザーを対象とした画面では、Qt を使用して一から開発するケースも多いことでしょう。

[rosbridge_suite](https://github.com/RobotWebTools/rosbridge_suite) の rosbridge_server を通じて、JSON API を用いた Web アプリケーションとして ROS と通信する方法も存在します。弊社では、この方法を利用してリモートでロボットシステムを操作したり、センサーの状態を確認するようなユースケースに取り入れています。

タッチパネルに UI を表示する組み込みアプリケーションにおいては、Qt が強力な選択肢です。しかし、最近では Rust の UI フレームワークである Tauri を採用した開発事例もあり、この記事でその詳細を紹介します。また、記事の後半部分では、Tauri プロジェクトに ROS2 のノードを組み込むプロセスについても簡単なチュートリアルを提供したいと思います。

Tauri に関する詳細は、以前の記事[「Rust によるデスクトップアプリケーションフレームワーク Tauri」](/blogs/2022/03/06/tauri/)で紹介していますので、合わせて確認いただければと思います。

## 事例紹介

### システム構成

この事例では、次のような構成を持つロボットシステムの開発において Tauri を使用しました。PLC に接続された多数のセンサーや周辺機器はここでは省略しています。また、ロボットに標準装備されているペンダント（ロボットの動作を教示する端末）についても触れていません。運用時にはユーザーがペンダントではなく、タッチパネルを使用してすべての操作を行います。

![システム構成](/img/robotics/ros/ros2-tauri-system-structure.png)

上記の図で示されている「システム制御アプリ」が ROS2 と Tauri で構成される GUI アプリケーションで、産業用 PC 上で動作します。使用する環境は Ubuntu 22.04、ROS2 のディストリビューションは[Humble Hawksbill](https://docs.ros.org/en/rolling/Releases.html)です。

以下は ChatGPT で作成したシステムのイメージです。実物とは大分異なりますが、タッチパネルを通じてユーザーがロボットシステムを操作する様子が伝わればと思います。

![システムのイメージ](/img/robotics/ros/ros2-tauri-system-image.png)

### アプリケーション構成

システム制御アプリは複数の ROS2 ノードで構成され、これらのノードが[ROS2 の通信](https://docs.ros.org/en/humble/How-To-Guides/Topics-Services-Actions.html)（トピック、サービス、アクション）を介して連携し、各機能を実現します。

以下の図はノード構成のイメージです。各種ハードウェアとの通信ドライバのほか、system_controller というノードがシステム全体の制御を担います。実際には他にも多くのトピックやノードが存在し、またノード間の通信は多対多の形で行われます。この中で、web_ui というノードが Tauri 上で構築され、他のノードと WebView 間で通信を中継し、UI 機能を提供します。ユーザはタッチパネルに表示された WebView の画面から操作し、web_ui ノードが system_controller ノードに ROS2 の通信で指示を送ります。

![ノード構成](/img/robotics/ros/ros2-tauri-node-structure.png)

開発言語としては、UI フロントエンドが Typescript（Meta 社の React を使用）、web_ui ノードには Rust、その他のノードには C++が使用されています。すべてのノードを Rust で開発する案もありましたが、通信ドライバを Rust に移植する際の開発負担の大きさと、過去の開発資産の流用を考慮してこの方法を選びました。とは言え、Rust によるソフトウエアの再実装は活発に進んでいるため、適切な時期が来ればノード単位で Rust への移行を検討したいと考えています。このような段階的な移行を行えるのも ROS2 のような分散型のアーキテクチャを採用するメリットですね。

## Tauri プロジェクトへ ROS2 のノードを組み込む

ここからは Tauri プロジェクトへ ROS2 のノードを組み込むまでのチュートリアルを示します。

Tauri の Core プロセス[^1]が ROS2 で通信するために Rust の ROS2 クライアントを Tauri プロジェクトへ組み込んでゆきます。ROS2 クライアントは[r2r](https://github.com/sequenceplanner/r2r)を使用します。

:::info
Humble をサポートしている Rust 向けの ROS2 のクライアントライブラリとして r2r の他に [ros2-rust](https://github.com/ros2-rust/ros2_rust) が存在します。しかしながら、記事執筆時点の最新版である[0.4.1](https://github.com/ros2-rust/ros2_rust/releases) で ROS2 の通信方式の 1 つであるアクションが未サポートでしたので、r2r を使用しました。

:::

[^1]: Tauri によるアプリケーションはエントリポイントとなる Core プロセスと 1 つ以上の WebView プロセスで構成されます。詳細は [References/Tauri/Architecture/Process Model](https://tauri.app/v1/references/architecture/process-model/)のページを参照ください。

### 開発環境

- OS
  - Ubuntu 22.04.03
- ROS2 Humble
  - [インストレーションガイド](https://docs.ros.org/en/humble/Installation/Ubuntu-Install-Debians.html)に従って ROS2 をインストールして下さい。
- JavaScript のパッケージマネージャー

  - 今回は yarn を使用します。最新安定版[^2]の Node.js と併せてインストールして下さい。

    ```shell
    curl -fsSL https://deb.nodesource.com/setup_19.x | sudo -E bash -
    sudo apt update
    sudo apt install nodejs
    ```

    ```shell
    npm install --global yarn
    ```

- Tauri
  - [Tauri のガイド](https://tauri.app/v1/guides/getting-started/prerequisites#setting-up-linux)に従って依存パッケージと Rust をインストールして下さい。

[^2]: 記事執筆時点では最新安定版の Node.js は v20.10.0LTS でした。

### Tauri プロジェクトのボイラープレートを作成する

以下の選択肢で生成しました。

```shell
yarn create tauri-app
yarn create v1.22.19
[1/4] Resolving packages...
[2/4] Fetching packages...
[3/4] Linking dependencies...
[4/4] Building fresh packages...
success Installed "create-tauri-app@3.11.7" with binaries:
      - create-tauri-app
✔ Project name · ros2-tauri
✔ Choose which language to use for your frontend · TypeScript / JavaScript - (pnpm, yarn, npm, bun)
✔ Choose your package manager · yarn
✔ Choose your UI template · React - (https://reactjs.org/)
✔ Choose your UI flavor · TypeScript

Template created! To get started run:
  cd ros2-tauri
  yarn
  yarn tauri dev
```

コンソール出力の手順に従い「yarn tauri dev」コマンドでアプリが起動することを確認して下さい。

生成されたプロジェクトの構造は以下のようになっています。src-tauri 配下が Rust のプロジェクトディレクトリとなります。

```
├── README.md
├── index.html
├── node_modules
├── package.json
├── public
├── src
│   ├── App.css
│   ├── App.tsx
│   ├── assets
│   ├── main.tsx
│   ├── styles.css
│   └── vite-env.d.ts
├── src-tauri
│   ├── Cargo.lock
│   ├── Cargo.toml
│   ├── build.rs
│   ├── icons
│   ├── src
│   └── tauri.conf.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── yarn.lock
```

### clang をインストールする

r2r は clang に依存しているので以下のコマンドでインストールして下さい。

```shell
sudo apt install clang
```

### r2r_minimal_node のサンプルコードから必要なファイルをダウンロードする

r2r のサンプルコードが配置されている [r2r_minimal_node](https://github.com/m-dahl/r2r_minimal_node/tree/master/r2r_minimal_node) リポジトリから以下のファイルをダウンロードして ./src-tauri/ へ配置します。

- r2r_cargo.cmake
  - ROS2 で使用される Colcon ビルドツールを通じて Rust プロジェクトを ビルドする CMake スクリプトです。
  - cargo build コマンドを --profile colcon オプションを指定して実行しています。colcon プロファイルについては後述する Cargo.toml で定義します。
- dummy.c
  - 空のファイルです。r2r_cargo.cmake でダミーの C 実行可能ファイルを設定し、ライブラリパスや依存関係などの情報を取得するために使用されます。
- package.xml
  - ROS2 パッケージのメタデータの定義ファイルです。
  - r2r_minimal_node リポジトリのものを編集して使用します。
- CMakeLists.txt
  - ROS2 のプロジェクト用に作成された CMake の設定ファイルです。r2r_cargo.cmake をインクルードしています。
  - r2r_minimal_node リポジトリのものを編集して使用します。

以下のコマンドを順に実行してダウンロードして下さい。

```shell
curl -o ./src-tauri/r2r_cargo.cmake https://raw.githubusercontent.com/m-dahl/r2r_minimal_node/master/r2r_minimal_node/r2r_cargo.cmake
curl -o ./src-tauri/dummy.c https://raw.githubusercontent.com/m-dahl/r2r_minimal_node/master/r2r_minimal_node/dummy.c
curl -o ./src-tauri/package.xml https://raw.githubusercontent.com/m-dahl/r2r_minimal_node/master/r2r_minimal_node/package.xml
curl -o ./src-tauri/CMakeLists.txt https://raw.githubusercontent.com/m-dahl/r2r_minimal_node/master/r2r_minimal_node/CMakeLists.txt
```

### package.xml を編集する

package.xml の name から author までのタグをプロジェクトに合わせて編集します。カスタムメッセージ（r2r_minimal_node_msgs）に対する依存関係が設定されていますが、今回は使用しないので削除します。

編集後のファイル内容は以下です。

```shell
<?xml version="1.0"?>
<?xml-model href="http://download.ros.org/schema/package_format2.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<package format="2">
  <name>ros2-tauri</name>
  <version>0.0.1</version>
  <description>Example of ros2-tauri</description>
  <maintainer email="xxx@gmail.com">Masayuki Kono</maintainer>
  <license>MIT</license>
  <author>Masayuki Kono</author>

  <buildtool_depend>ament_cmake</buildtool_depend>

  <build_depend>rcl</build_depend>
  <build_depend>std_msgs</build_depend>

  <exec_depend>rcl</exec_depend>
  <exec_depend>std_msgs</exec_depend>

  <export>
    <build_type>ament_cmake</build_type>
  </export>
</package>
```

### CMakeLists.txt を編集する

CMakeLists.txt に設定されているプロジェクト名を編集します。r2r_minimal_node_msgs に対する依存関係の設定がありますのでこちらも削除します。

編集後のファイル内容は以下です。

```shell
cmake_minimum_required(VERSION 3.5)
project(ros2-tauri)

find_package(ament_cmake REQUIRED)

if(NOT DEFINED CMAKE_SUPPRESS_DEVELOPER_WARNINGS)
     set(CMAKE_SUPPRESS_DEVELOPER_WARNINGS 1 CACHE INTERNAL "No dev warnings")
endif()

include(r2r_cargo.cmake)

# put ros package dependencies here.
r2r_cargo(std_msgs               # just to test that it works
          rcl                    # we need the c ros2 api
          rcl_action             # as of r2r 0.1.0, we also need the action api
         )

# install binaries
if(WIN32)
  set(SUFFIX ".exe")
else()
  set(SUFFIX "")
endif()

install(PROGRAMS
  ${CMAKE_SOURCE_DIR}/target/colcon/${PROJECT_NAME}${SUFFIX}
  DESTINATION lib/${PROJECT_NAME}
)

# we need this for ros/colcon
ament_package()
```

### Cargo.toml を編集する

プロジェクトの ./src-tauri/Cargo.toml を編集します。

r2r_minimal_node の[サンプルコード](https://github.com/m-dahl/r2r_minimal_node/blob/0.8.2/r2r_minimal_node/Cargo.toml#L10)と同様に以下を追記して下さい。

```shell
# We use a custom profile to keep colcon
# separate from "normal" rust building.
[profile.colcon]
inherits = "release"
```

r2r_cargo.cmake から呼び出す cargo build コマンドのカスタムプロファイルを定義しています。リリースビルド用の設定を継承しているのみなので以下のコマンドは等価です。

- cargo build --profile=colcon
- cargo build --release

colcon プロファイルを明示的に定義することで、ROS2 ビルドシステム用のビルドと通常の Rust ビルドを明確に区別できるようにしているようです。

次に dependencies セクションを編集し、以下のように依存関係を追加して下さい。

```shell
[dependencies]
tauri = { version = "1.5", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
r2r = "0.8.2" # 追加
futures = "0.3.15" # 追加
tokio = { version = "1", features = ["full"] } # 追加
```

### main.rs へ ROS2 ノードの起動処理を追加する

「yarn create tauri-app」コマンドで生成された ./src-tauri/src/main.rs へ 以下のように ROS2 ノードの起動処理を追加します。ノード名は web_ui としています。

```rust
// main.rs

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    // 追加 ▽▽▽
    let ctx = r2r::Context::create().unwrap();
    let mut node = r2r::Node::create(ctx, "web_ui", "").unwrap();
    std::thread::spawn(move || loop {
        node.spin_once(std::time::Duration::from_millis(100));
    });
    // 追加 △△△

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

r2r_minimal_node の[サンプルコード](https://github.com/m-dahl/r2r_minimal_node/blob/0.8.2/r2r_minimal_node/src/main.rs#L47)ではメインスレッドで node.spin_once を呼び出し ROS2 のメッセージのメインループを実装しています。今回は Tauri が WebView とのプロセス間通信でメインスレッドを専有するため、別スレッド上で node.spin_once を呼び出しています。

### colcon build

ここまでで Tauri プロジェクトへの ROS2 クライアントの必要最低限の組み込みが完了しました。「colcon build」コマンドを実行してビルドしてみましょう。初回はビルド環境にも依りますが数分の時間を要します。

以下のように"Summary: 1 package finished"と出力されていれば成功です。

```shell
$ colcon build
Starting >>> ros2-tauri
[Processing: ros2-tauri]
[Processing: ros2-tauri]
[Processing: ros2-tauri]
[Processing: ros2-tauri]
--- stderr: ros2-tauri
   Compiling proc-macro2 v1.0.75
   Compiling unicode-ident v1.0.12
   ...(ommit)
   Compiling gdk v0.15.4
   Compiling webkit2gtk v0.18.2
    Finished colcon [optimized] target(s) in 2m 00s
---
Finished <<< ros2-tauri [2min 3s]

Summary: 1 package finished [2min 3s]
  1 package had stderr output: ros2-tauri
```

### ROS2 ノードが起動することを確認する

アプリを起動した後に別端末でノードの一覧を表示してみましょう。 /web_ui という名前のノードが起動していたら OK です。

- 端末 1

  ```shell
  $ yarn tauri dev
  ```

- 端末 2

  ```shell
  $ ros2 node list
  /web_ui
  ```

通常の Tauri プロジェクトと同様にホットリロードも有効です。アプリが起動している状態で main.rs へログ出力を追加してみましょう。

```rust
// main.rs

let ctx = r2r::Context::create().unwrap();
let mut node = r2r::Node::create(ctx, "web_ui", "").unwrap();
std::thread::spawn(move || loop {
    node.spin_once(std::time::Duration::from_millis(100));
});

// 追加 ▽▽▽
r2r::log_debug!("web_ui", "debug message");
r2r::log_info!("web_ui", "info message");
r2r::log_warn!("web_ui", "warn message");
r2r::log_error!("web_ui", "error message");
r2r::log_fatal!("web_ui", "fatal message");
// 追加 △△△

tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

main.rs を編集して保存すると自動で再コンパイルされてアプリが再起動し、端末 1 へ以下のログが出力されます（debug ログは既定ではコンソール出力されないので期待動作です）。

```shell
[INFO] [1704573791.462327908] [web_ui]: info message
[WARN] [1704573791.462473867] [web_ui]: warn message
[ERROR] [1704573791.462511982] [web_ui]: error message
[FATAL] [1704573791.462517330] [web_ui]: fatal message
```

### ボタン押下時にトピックをパブリッシュする

「yarn create tauri-app」で作成された画面にテキストボックスとボタンが配置されています。
ボタン押下時に、テキストボックスの入力値を付帯したトピックをパブリッシュするように修正してみましょう。

![UIイメージ](/img/robotics/ros/ros2-tauri-ui-001.png)

WebView から Core プロセスへの呼び出しは Tauri のコマンド[^3]という仕組みを使用します。ここでは Core プロセス側で定義された button_pushed という名前のコマンドハンドラをボタン押下時に呼び出しています。

[^3]: Tauri のコマンドについては [Guides / Features / Calling Rust from the frontend](https://tauri.app/v1/guides/features/command/)のページを参照ください。

```tsx
// App.tsx

import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");

  async function button_pushed() {
    await invoke("button_pushed", { message: message });
  }

  return (
    <div className="container">
      <form className="row">
        <input
          id="message-input"
          onChange={(e) => setMessage(e.currentTarget.value)}
          placeholder="Enter a message..."
        />
        <button onClick={() => button_pushed()}>Publish</button>
      </form>
    </div>
  );
}

export default App;
```

```rust
// main.rs

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};

// ボタン押下時のコマンドハンドラ
#[tauri::command]
fn button_pushed(
    message: &str,
    pub_operation: tauri::State<Arc<Mutex<r2r::Publisher<r2r::std_msgs::msg::String>>>>,
) {
    let msg = r2r::std_msgs::msg::String {
        data: message.to_string(),
    };
    pub_operation.lock().unwrap().publish(&msg).unwrap();
}

fn main() {
    let ctx = r2r::Context::create().unwrap();
    let mut node = r2r::Node::create(ctx, "web_ui", "").unwrap();

    // operation という名前のトピックをパブリッシュするパブリッシャーを生成
    // トピックのメッセージ型は文字列型
    let pub_operation = Arc::new(Mutex::new(
        node.create_publisher::<r2r::std_msgs::msg::String>(
            "/operation",
            r2r::QosProfile::default(),
        )
        .unwrap(),
    ));

    std::thread::spawn(move || loop {
        node.spin_once(std::time::Duration::from_millis(100));
    });

    tauri::Builder::default()
        // コマンドハンドラでパブリッシャーを参照するため共有リソースとして登録
        .manage(pub_operation)
        .invoke_handler(tauri::generate_handler![button_pushed])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

main 関数内で生成したパブリッシャーをコマンドハンドラで参照する必要があるため、共有リソースとして tauri::Builder::default().manage で登録しています。登録するリソースはスレッドセーフである必要があるため、 Arc<Mutex< T >> でインスタンスをラップしています。コマンドハンドラ関数では tauri::State でさらにラップされた状態で引数からアクセスできます。

端末 2 で以下のコマンドを実行し、ボタン押下時にトピックがパブリッシュされることを確認しましょう。以下はテキストボックスへ hello という文字を入力してボタンを押下したときの実行結果です。

- 端末 2

  ```shell
  $ ros2 topic echo /operation
  data: hello
  ---
  ```

### 同じメッセージ型のトピックのパブリッシャーを複数使用する

同じメッセージ型のトピックを複数使用する場合は工夫が必要です。

試しに以下のコードで「yarn tauri dev」を実行すると panic が発生します。

```tsx
// App.tsx

import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");

  async function button1_pushed() {
    await invoke("button1_pushed", { message: message });
  }

  // 追加したボタン押下時のコマンドハンドラの呼び出し
  async function button2_pushed() {
    await invoke("button2_pushed", { message: message });
  }

  return (
    <div className="container">
      <form className="row">
        <input
          id="message-input"
          onChange={(e) => setMessage(e.currentTarget.value)}
          placeholder="Enter a message..."
        />
        <button onClick={() => button1_pushed()}>Publish1</button>
        {/* ボタンを追加 */}
        <button onClick={() => button2_pushed()}>Publish2</button>
      </form>
    </div>
  );
}

export default App;
```

```rust
// main.rs

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};

#[tauri::command]
fn button1_pushed(
    message: &str,
    pub_operation1: tauri::State<Arc<Mutex<r2r::Publisher<r2r::std_msgs::msg::String>>>>,
) {
    let msg = r2r::std_msgs::msg::String {
        data: message.to_string(),
    };
    pub_operation1.lock().unwrap().publish(&msg).unwrap();
}

// 追加したボタン押下時のコマンドハンドラ
// button1_pushedと関数のシグネチャが同じ!!!
#[tauri::command]
fn button2_pushed(
    message: &str,
    pub_operation2: tauri::State<Arc<Mutex<r2r::Publisher<r2r::std_msgs::msg::String>>>>,
) {
    let msg = r2r::std_msgs::msg::String {
        data: message.to_string(),
    };
    pub_operation2.lock().unwrap().publish(&msg).unwrap();
}

fn main() {
    let ctx = r2r::Context::create().unwrap();
    let mut node = r2r::Node::create(ctx, "web_ui", "").unwrap();

    let pub_operation1 = Arc::new(Mutex::new(
        node.create_publisher::<r2r::std_msgs::msg::String>(
            "/operation1",
            r2r::QosProfile::default(),
        )
        .unwrap(),
    ));
    let pub_operation2 = Arc::new(Mutex::new(
        node.create_publisher::<r2r::std_msgs::msg::String>(
            "/operation2",
            r2r::QosProfile::default(),
        )
        .unwrap(),
    ));

    std::thread::spawn(move || loop {
        node.spin_once(std::time::Duration::from_millis(100));
    });

    tauri::Builder::default()
        .manage(pub_operation1)
        // pub_operation2はpub_operation1と型が同じ！！！
        .manage(pub_operation2)
        .invoke_handler(tauri::generate_handler![button1_pushed, button2_pushed])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```shell
thread 'main' panicked at 'state for type 'alloc::sync::Arc<std::sync::mutex::Mutex<r2r::publishers::Publisher<r2r::msg_types::generated_msgs::std_msgs::msg::String>>>' is already being managed', /home/dev/.cargo/registry/src/index.crates.io-6f17d22bba15001f/tauri-1.5.4/src/app.rs:1286:5
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
error Command failed with exit code 101.
```

pub_operation1 と pub_operation2 は型が同じとなりますので tauri::Builder::default().manage へそれぞれを登録できません。この場合は以下のように pub_operation1 と pub_operation2 を保持する型を定義してこれを登録すれば対処できます。

```rust
// main.rs

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};

// 各パブリッシャーを保持する型を定義
struct Publishers {
    operation1: r2r::Publisher<r2r::std_msgs::msg::String>,
    operation2: r2r::Publisher<r2r::std_msgs::msg::String>,
}

#[tauri::command]
fn button1_pushed(message: &str, publishers: tauri::State<Arc<Mutex<Publishers>>>) {
    let msg = r2r::std_msgs::msg::String {
        data: message.to_string(),
    };
    publishers.lock().unwrap().operation1.publish(&msg).unwrap();
}

#[tauri::command]
fn button2_pushed(message: &str, publishers: tauri::State<Arc<Mutex<Publishers>>>) {
    let msg = r2r::std_msgs::msg::String {
        data: message.to_string(),
    };
    publishers.lock().unwrap().operation2.publish(&msg).unwrap();
}

fn main() {
    let ctx = r2r::Context::create().unwrap();
    let mut node = r2r::Node::create(ctx, "web_ui", "").unwrap();

    let publishers = Arc::new(Mutex::new(Publishers {
        operation1: node
            .create_publisher::<r2r::std_msgs::msg::String>(
                "/operation1",
                r2r::QosProfile::default(),
            )
            .unwrap(),
        operation2: node
            .create_publisher::<r2r::std_msgs::msg::String>(
                "/operation2",
                r2r::QosProfile::default(),
            )
            .unwrap(),
    }));

    std::thread::spawn(move || loop {
        node.spin_once(std::time::Duration::from_millis(100));
    });

    tauri::Builder::default()
        .manage(publishers)
        .invoke_handler(tauri::generate_handler![button1_pushed, button2_pushed])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### トピックをサブスクライブしてボタンの disabled を切り替える

std_msgs::msg::Bool 型のトピックをサブスクライブして受け取った値に応じてボタンの disabled を切り替えてみましょう。

Core プロセスから WebView への呼び出しは Tauri のイベント[^4]という仕組みを使用します。ここでは Core プロセス側で定義された operation-enabled-updated という名前のイベントをトピックの受信時に WebView へ通知しています。

[^4]: Tauri のイベントについては [Guides / Features / Events](https://tauri.app/v1/guides/features/events)のページを参照ください。

```tsx
// App.tsx

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import { listen } from "@tauri-apps/api/event";

function App() {
  const [message, setMessage] = useState("");
  const [operationEnabled, setOperationEnabled] = useState(true);

  const disabledButtonStyle = {
    backgroundColor: "#A9A9A9",
    cursor: "not-allowed",
  };

  async function button1_pushed() {
    await invoke("button1_pushed", { message: message });
  }

  async function button2_pushed() {
    await invoke("button2_pushed", { message: message });
  }

  // operation-enabled-updated イベントのコールバックを追加
  useEffect(() => {
    const unlistenPromise = listen<boolean>("operation-enabled-updated", (event) => {
      setOperationEnabled(event.payload);
    });
    return () => {
      void unlistenPromise.then((unlistenFn) => {
        unlistenFn();
      });
    };
  }, []);

  return (
    <div className="container">
      <form className="row">
        <input
          id="message-input"
          onChange={(e) => setMessage(e.currentTarget.value)}
          placeholder="Enter a message..."
        />
        <button
          style={!operationEnabled ? disabledButtonStyle : {}}
          // operation-enabled-updated イベントで disabledを切り替え
          disabled={!operationEnabled}
          onClick={() => button1_pushed()}
        >
          Publish1
        </button>
        <button
          style={!operationEnabled ? disabledButtonStyle : {}}
          disabled={!operationEnabled}
          onClick={() => button2_pushed()}
        >
          Publish2
        </button>
      </form>
    </div>
  );
}

export default App;
```

メッセージの受信は非同期処理となるため [r2r_minimal_node](https://github.com/m-dahl/r2r_minimal_node/blob/0.8.2/r2r_minimal_node/src/main.rs) と同様に [Tokio](https://docs.rs/tokio/latest/tokio/)のクレート を使用しています。

```rust
// main.rs

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use futures::stream::StreamExt;
use std::sync::{Arc, Mutex};
use tauri::Manager;

struct Publishers {
    operation1: r2r::Publisher<r2r::std_msgs::msg::String>,
    operation2: r2r::Publisher<r2r::std_msgs::msg::String>,
}

#[tauri::command]
fn button1_pushed(message: &str, publishers: tauri::State<Arc<Mutex<Publishers>>>) {
    let msg = r2r::std_msgs::msg::String {
        data: message.to_string(),
    };
    publishers.lock().unwrap().operation1.publish(&msg).unwrap();
}

#[tauri::command]
fn button2_pushed(message: &str, publishers: tauri::State<Arc<Mutex<Publishers>>>) {
    let msg = r2r::std_msgs::msg::String {
        data: message.to_string(),
    };
    publishers.lock().unwrap().operation2.publish(&msg).unwrap();
}

#[tokio::main]
async fn main() {
    let ctx = r2r::Context::create().unwrap();
    let mut node = r2r::Node::create(ctx, "web_ui", "").unwrap();

    let publishers = Arc::new(Mutex::new(Publishers {
        operation1: node
            .create_publisher::<r2r::std_msgs::msg::String>(
                "/operation1",
                r2r::QosProfile::default(),
            )
            .unwrap(),
        operation2: node
            .create_publisher::<r2r::std_msgs::msg::String>(
                "/operation2",
                r2r::QosProfile::default(),
            )
            .unwrap(),
    }));

    // operation_enabled トピックのサブスクライブを追加
    let sub_operation_enabled = node
        .subscribe::<r2r::std_msgs::msg::Bool>("/operation_enabled", r2r::QosProfile::default())
        .unwrap();
    let operation_enabled = Arc::new(Mutex::new(false));

    std::thread::spawn(move || loop {
        node.spin_once(std::time::Duration::from_millis(100));
    });

    tauri::Builder::default()
        .manage(publishers)
        .invoke_handler(tauri::generate_handler![button1_pushed, button2_pushed])
        .setup(move |app| {
            // WebViewへイベントを通知するためのアプリハンドル
            // tokio::spawnブロックへmoveしメッセージの受信毎に使用する
            let app_handle = app.handle();

            tokio::spawn(async move {
                // operation_enabled トピックのメッセージを受信したら
                // WebViewへ operation-enabled-updated イベントとして通知する
                sub_operation_enabled
                    .for_each(|msg| {
                        let mut enabled = operation_enabled.lock().unwrap();
                        *enabled = msg.data;
                        let payload = msg.data;
                        let main_window = app_handle.get_window("main").unwrap();
                        main_window
                            .emit("operation-enabled-updated", &payload)
                            .unwrap();
                        futures::future::ready(())
                    })
                    .await
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

端末 2 で以下のコマンドを順に実行し、ボタンの disabled が切り替わることを確認しましょう。

- 端末 2

  ```shell
  $ ros2 topic pub /operation_enabled std_msgs/msg/Bool "data: false" --once
  publisher: beginning loop
  publishing #1: std_msgs.msg.Bool(data=False)

  $ ros2 topic pub /operation_enabled std_msgs/msg/Bool "data: true" --once
  publisher: beginning loop
  publishing #1: std_msgs.msg.Bool(data=True)
  ```

## まとめ

この記事では、ROS2 のサービスやアクションなど、他の通信方式については触れていませんが、今後の記事で取り上げる機会があれば、詳しく紹介したいと思います。

従来、弊社のロボットシステム開発では主に Qt を用いた UI 開発が行われてきました。Tauri の導入により、Web 技術の幅広いライブラリを活用することが可能となり、開発の効率化と柔軟性の向上が期待されます。今後も UI 開発の 1 つの有力な選択肢として、Tauri を活用していきたいと考えています。

:::info
Web ライブラリの利用のみであれば、Electron も選択肢に入りますが、Chromium エンジンや Node.js ランタイムの影響でバイナリサイズが大きくなる点が課題です。その点、Tauri はバイナリサイズが小さく、メモリ使用量も少ないため、より有利な選択肢と言えます（参照：[References / Benchmarks](https://tauri.app/v1/references/benchmarks/)）。
:::

:::info
Qt を使用する際は、製品開発で有償の商用ライセンスを選択するか、無償の LGPL 版を使用するかの選択が必要です。これに対して Tauri はライセンス面での導入敷居が低いというメリットがあります。

:::

また、現在開発中のロボットシステムでは、Rust の使用範囲は ROS2 の通信データを WebView へ橋渡しする部分に限られています。しかし、Rust のメモリ安全性と高いパフォーマンスは組み込みアプリに適しており、今後はロボットの制御や画像処理など他の分野への適用範囲を広げていくことを検討しています。
