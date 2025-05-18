---
title: 「Rust × ESP32」で始める組み込み開発：Lチカまでの完全セットアップガイド
author: shuichi-takatsu
date: 2025-05-19
tags: [rust, esp32]
image: true
---

以前、[WindowsでRust開発環境を作ってみる(VSCode＋BuildTools＋rustup)](/blogs/2023/02/12/using-rust-01/)という記事を書きました。  
記事の最後に「ESP32まわりの問題が片付いたら、次回の記事で報告したいと思います」と言い残し、随分と時間が経ってしまいました。

今回は、RustとESP32による開発環境を構築できたため、その手順を詳しく紹介します。  
主に、[ここ](https://docs.esp-rs.org/book/introduction.html)とか、[ここ](https://github.com/esp-rs/espup)を参考にしました。

## はじめに

開発環境は以下を使用します。
- OS: Ubuntu 24.04 (on WSL2)
- Python3： V3.12.3
- IDE: Visual Studio Code: 1.100.2
- ESP-IDF: v5.3.3
- rustup: 1.28.2
- espup: 0.15.0
- ターゲット: ESP32 開発ボード（ESP-WROOM-32等）

:::alert
既存環境に「ESP-IDF」が入っていて、ESP-IDFバージョン「v5.4系」だった場合、Rustによるビルドが失敗することがあります。  
ESP-IDFのパスを通して使用する場合は ESP-IDF環境を v5.3系にするか、または ESP-IDFのツールチェーンのパスを通さずに使用しましょう。    
また、v5.3系でも、rustupでJoinされるesp32ツールチェーンのバージョンがv5.3.3と微妙に違ったので、問題を起こしました。  
素直にESP-IDFのパスを常駐から削除して使った方がいいと思います。    
:::

## 事前準備

Rust+ESP32の開発環境に必要なUbuntuのモジュールを事前にインストールしておきます。  
おそらく以下の分だけインストールすれば大丈夫だと思います。 

```shell
sudo apt update
sudo apt install -y libssl-dev pkg-config curl build-essential gcc libudev-dev
```

## Rustのインストール

[こちら](https://rustup.rs/)の情報を参考にして、Rustをインストールします。  
私はWSLを使っているので、以下のコマンドを実行しました。  
```shell
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Rustのダウンロードとインストールが実行されます。  
途中で以下の選択を要求されます。
- 1) Proceed with standard installation (default - just press enter)
- 2) Customize installation
- 3) Cancel installation

私は（1）を選択しました。  
実行結果は以下のようになりました。  
```log
info: downloading installer

Welcome to Rust!

This will download and install the official compiler for the Rust
programming language, and its package manager, Cargo.

Rustup metadata and toolchains will be installed into the Rustup
home directory, located at:

  /home/ubuntu/.rustup

This can be modified with the RUSTUP_HOME environment variable.

The Cargo home directory is located at:

  /home/ubuntu/.cargo

This can be modified with the CARGO_HOME environment variable.

The cargo, rustc, rustup and other commands will be added to
Cargo's bin directory, located at:

  /home/ubuntu/.cargo/bin

This path will then be added to your PATH environment variable by
modifying the profile files located at:

  /home/ubuntu/.profile
  /home/ubuntu/.bashrc

You can uninstall at any time with rustup self uninstall and
these changes will be reverted.

Current installation options:


   default host triple: x86_64-unknown-linux-gnu
     default toolchain: stable (default)
               profile: default
  modify PATH variable: yes

1) Proceed with standard installation (default - just press enter)
2) Customize installation
3) Cancel installation
>1

info: profile set to 'default'
info: default host triple is x86_64-unknown-linux-gnu
info: syncing channel updates for 'stable-x86_64-unknown-linux-gnu'
info: latest update on 2025-05-15, rust version 1.87.0 (17067e9ac 2025-05-09)
info: downloading component 'cargo'
info: downloading component 'clippy'
info: downloading component 'rust-docs'
info: downloading component 'rust-std'
info: downloading component 'rustc'
 76.3 MiB /  76.3 MiB (100 %)  38.3 MiB/s in  2s
info: downloading component 'rustfmt'
info: installing component 'cargo'
info: installing component 'clippy'
info: installing component 'rust-docs'
 19.9 MiB /  19.9 MiB (100 %)   8.2 MiB/s in  2s
info: installing component 'rust-std'
 29.4 MiB /  29.4 MiB (100 %)   4.1 MiB/s in  6s
info: installing component 'rustc'
 76.3 MiB /  76.3 MiB (100 %)  12.4 MiB/s in  6s
info: installing component 'rustfmt'
info: default toolchain set to 'stable-x86_64-unknown-linux-gnu'

  stable-x86_64-unknown-linux-gnu installed - rustc 1.87.0 (17067e9ac 2025-05-09)


Rust is installed now. Great!

To get started you may need to restart your current shell.
This would reload your PATH environment variable to include
Cargo's bin directory ($HOME/.cargo/bin).

To configure your current shell, you need to source
the corresponding env file under $HOME/.cargo.

This is usually done by running one of the following (note the leading DOT):
. "$HOME/.cargo/env"            # For sh/bash/zsh/ash/dash/pdksh
source "$HOME/.cargo/env.fish"  # For fish
source $"($nu.home-path)/.cargo/env.nu"  # For nushell
```

インストールが終了すると、`.bashrc` に以下が追加されていました。  
```ini
. "$HOME/.cargo/env" 
```

## espupのインストール

次に[ここ](https://github.com/esp-rs/espup)を参考にして、以下のコマンドを実行します。  
```shell
cargo install espup --locked
```

コンパイル済みリリースバイナリをインストールする場合は、以下の方法でもインストールできます。  
（私は未実施です）  
```shell
curl -L https://github.com/esp-rs/espup/releases/latest/download/espup-x86_64-unknown-linux-gnu -o espup
chmod +x espup
```

`cargo` で espup がインストールできたら、以下のコマンドを実行します。  
```shell
espup install --targets esp32
```

実行結果は以下のようになりました。  
```log
[info]: Creating symlink between '/home/ubuntu/.rustup/toolchains/esp/xtensa-esp32-elf-clang/esp-19.1.2_20250225/esp-clang/lib' and '/home/ubuntu/.espup/esp-clang'
[info]: All downloads complete
[info]: Installing 'rust' component for Xtensa Rust toolchain
[info]: Installing 'rust-src' component for Xtensa Rust toolchain
[info]: Installation successfully completed!

        To get started, you need to set up some environment variables by running: '. /home/ubuntu/export-esp.sh'
        This step must be done every time you open a new terminal.
            See other methods for setting the environment in https://esp-rs.github.io/book/installation/riscv-and-xtensa.html#3-set-up-the-environment-variables
```

ログを見ると「'. /home/ubuntu/export-esp.sh'」するように書かれています。  
ファイルの内容は、ESP32のツールチェーンをパスに追加する設定でした。  
.bashrcに以下が追加します。  
```ini
. $HOME/export-esp.sh 
```

## Rustのツールチェーンの確認

次にRustの環境について確認します。
ここまで終わったところで、以下のコマンドを実行します。  
```shell
rustup show
```

実行結果は以下のようになりました。  
```log
Default host: x86_64-unknown-linux-gnu
rustup home:  /home/ubuntu/.rustup

installed toolchains
--------------------
stable-x86_64-unknown-linux-gnu (active, default)
esp

active toolchain
----------------
name: stable-x86_64-unknown-linux-gnu
active because: it's the default toolchain
installed targets:
  x86_64-unknown-linux-gnu
```

ツールチェーンに「esp」が追加されていることがわかります。  
デフォルトが「stable-x86_64-unknown-linux-gnu」になっているので、「esp」にデフォルトを切り替えます。  
以下のコマンドを実行します。  
```shell
rustup default esp
```

`rustup show` で結果を確認します。  
```log
Default host: x86_64-unknown-linux-gnu
rustup home:  /home/ubuntu/.rustup

installed toolchains
--------------------
stable-x86_64-unknown-linux-gnu
esp (active, default)

active toolchain
----------------
name: esp
active because: it's the default toolchain
installed targets:
```

ツールチェーンが「esp」に切り替わりました。  
上記は一見すると、インストールされたターゲットが無いように見えるが、実際のターゲットモジュールは`esp`フォルダのさらに下に格納されているので、この設定で問題無いようです。  

:::alert
デフォルトをesp側に切り替えないと、ビルドが誤って `stable-x86_64-unknown-linux-gnu` を使用してしまい、エラーになることがありました。  
:::

## 必要なモジュールのインストール

以下のコマンドを実行し、ESP32のプロジェクトの作成、ビルド、Flashメモリ書き込みに必要なモジュールをインストールします。
それぞれビルドに時間がかかります。じっと待ちます。
```shell
cargo install espflash
cargo install ldproxy
cargo install cargo-generate
cargo install cargo-espflash
```

## ESP32用プロジェクトのひな形作成とビルド

cargoの「generate」で、ESP32用プロジェクトのひな形を作成します。  
以下のコマンドを実行します。  
```shell
cargo generate --git https://github.com/esp-rs/esp-idf-template cargo
```
途中で以下の入力を求められます。
- Project Name: > 「任意のプロジェクト名称」を設定します。（例：esp_test）
- Which MCU to target? › 「esp32」を選択しました。
- Configure advanced template options? › 「false」を選択しました。

プロジェクトは以下のような構成になっています。
```cmake
esp_test/
├── .cargo/
│   └── config.toml           # Cargo用のターゲット/リンカ/フラッシュ設定
├── .gitignore                # Gitで無視するファイル一覧
├── Cargo.toml                # Rustパッケージ設定
├── rust-toolchain.toml       # Rustツールチェイン指定（esp用）
├── sdkconfig.defaults        # ESP-IDFのビルド設定（Kconfig）
├── build.rs                  # ビルドスクリプト（esp-idf-sys連携用）
└── src/
    └── main.rs               # Rustのエントリポイント（Lチカなどを書く）
```

各ファイルの役割は以下です。  
| ファイル/ディレクトリ           | 内容                                                  |
| --------------------- | --------------------------------------------------- |
| `.cargo/config.toml`  | ESP-IDF向けクロスコンパイル設定（`target`, `linker`, `runner`など） |
| `rust-toolchain.toml` | Rustのバージョンおよびターゲット (`esp`) を固定                      |
| `sdkconfig.defaults`  | ESP-IDFの設定（FreeRTOSの設定など）                           |
| `build.rs`            | `esp-idf-sys`との連携設定をする Rustのビルドスクリプト                |
| `src/main.rs`         | ユーザーが記述するRustアプリケーション本体                             |
| `Cargo.toml`          | Rustの依存関係やfeatureなどの定義                              |


プロジェクトフォルダの下でビルドを実行します。  
```shell
cd esp_test  # プロジェクト名
cargo build
```

:::alert
ESP-IDFを独自にインストールしていてパスを通していた場合、ビルド時に「ESP-IDF側ツールチェーン」と「Rust側ツールチェーン」が競合してしまいます。  
（私も最初、それでハマりました）
自前で用意したESP-IDFのツールチェーンを使う場合は、`. $HOME/export-esp.sh` を実行しなければ、ビルドは通ると思います。  
（私は `. $HOME/export-esp.sh` を実行せずに、自前で導入した ESP-IDFのツールチェーンでビルドしました）
:::

## Lチカサンプルプログラム

上記のひな形は単に「hello world」って出力するだけの味気ないものなので、これも定番ではありますが、ESP32のLチカ（LEDチカチカ）プログラムを作ってみようと思います。
先ほど作成した作成したひな形を少し改造します。

`.cargo/config.toml`
```ini
[build]
target = "xtensa-esp32-espidf"

[target.xtensa-esp32-espidf]
linker = "ldproxy"
runner = "espflash flash --monitor"
rustflags = [ "--cfg",  "espidf_time64"]

[unstable]
build-std = ["std", "panic_abort"]

[env]
MCU="esp32"
# Note: this variable is not used by the pio builder (`cargo build --features pio`)
ESP_IDF_VERSION = "v5.3.3"
LIBCLANG_PATH = "$HOME/.espup/esp-clang"
```

`rust-toolchain.toml`
```ini
[toolchain]
channel = "esp"
```

`sdkconfig.defaults`
```ini
# Rust often needs a bit of an extra main task stack size compared to C (the default is 3K)
CONFIG_ESP_MAIN_TASK_STACK_SIZE=8000

# Use this to set FreeRTOS kernel tick frequency to 1000 Hz (100 Hz by default).
# This allows to use 1 ms granularity for thread sleeps (10 ms by default).
#CONFIG_FREERTOS_HZ=1000

# Workaround for https://github.com/espressif/esp-idf/issues/7631
#CONFIG_MBEDTLS_CERTIFICATE_BUNDLE=n
#CONFIG_MBEDTLS_CERTIFICATE_BUNDLE_DEFAULT_FULL=n
```

`build.rs`
```rust
fn main() {
    embuild::espidf::sysenv::output();
}
```

`src/main.rs`
```rust
use anyhow::Result;
use esp_idf_svc::{
  hal::{gpio::PinDriver, peripherals::Peripherals},
  sys::link_patches,
  log::EspLogger,
};
use std::{
  thread::sleep, 
  time::Duration
};

fn main() -> Result<()> {
    // ESP-IDF の初期化
    link_patches();
  
    // Bind the log crate to the ESP Logging facilities
    EspLogger::initialize_default();
  
    let peripherals = Peripherals::take().unwrap();

    let mut led = PinDriver::output(peripherals.pins.gpio23)?;

    loop {
        led.set_high()?; // 点灯
        sleep(Duration::from_millis(500));

        led.set_low()?; // 消灯
        sleep(Duration::from_millis(500));
    }

    // この行は実行されませんが、型合わせのために必要
    // Rustの静的検査の都合上、loopの後に書く必要があります
    #[allow(unreachable_code)]
    Ok(())
}
```

`Cargo.toml`
```ini
[package]
name = "esp_test"
version = "0.1.0"
authors = ["ubuntu"]
edition = "2021"
resolver = "2"
rust-version = "1.77"

[[bin]]
name = "esp_test"
harness = false # do not use the built in cargo test harness -> resolve rust-analyzer errors

[profile.release]
opt-level = "s"

[profile.dev]
debug = true    # Symbols are nice and they don't increase the size on Flash
opt-level = "z"

[features]
default = ["std", "embassy", "esp-idf-svc/native"]
std = ["alloc", "esp-idf-svc/binstart", "esp-idf-svc/std"]
alloc = ["esp-idf-svc/alloc"]
embassy = ["esp-idf-svc/embassy-sync", "esp-idf-svc/critical-section", "esp-idf-svc/embassy-time-driver"]

[dependencies]
log = { version = "0.4.27", default-features = false }
esp-idf-svc = { version = "0.51.0", default-features = false }
esp-idf-hal = "0.45.2"
anyhow = "1.0.98"

[build-dependencies]
embuild = "0.33.0"
```

## Lチカサンプルプログラムの解説と実行

### 解説

ESP32 と Rust の連携に直接関係するファイルは、以下の 5つ です。  
これらは、Rust から ESP-IDF（Cライブラリ）を呼び出すための環境構築やクロスコンパイル設定に関わる重要な構成要素です。  
```ini
esp_test/
├── .cargo/
│   └── config.toml           # Rust→ESP32向けクロスコンパイル設定
├── Cargo.toml                # esp-idf 関連クレートの依存管理
├── rust-toolchain.toml       # esp用ツールチェイン/ターゲットの固定
├── sdkconfig.defaults        # ESP-IDFビルド設定（Kconfigオプション）
├── build.rs                  # esp-idf-sysとの連携を行うビルドスクリプト
```

内容を簡単に説明します。  

#### `.cargo/config.toml`

`.cargo/config.toml` は、Rust + ESP32（ESP-IDF）環境での クロスコンパイルと実行を自動化・安定化するための重要な設定ファイルです。  
各セクションの詳細は以下です。  
```ini
[build]
target = "xtensa-esp32-espidf"
```
- デフォルトのビルドターゲットとして `xtensa-esp32-espidf` を使用。
- 毎回 `--target` を付けずに ESP32 用でビルドできます。

```ini
[target.xtensa-esp32-espidf]
linker = "ldproxy"
runner = "espflash flash --monitor"
rustflags = [ "--cfg", "espidf_time64" ]
```
- `linker`: ESP-IDF 用のカスタムリンカ `ldproxy` を使用。
- `runner`: `cargo run` 時に `espflash` を使って書き込み＋シリアルモニタ。
- `rustflags`: 64bit 時間構造を有効化する条件コンパイルオプション。

```ini
[unstable]
build-std = ["std", "panic_abort"]
```
- Rust標準ライブラリをクロスビルド。
- `no_std` ターゲットのために `std` や `panic_abort` を自前でビルド。

```ini
[env]
MCU = "esp32"
ESP_IDF_VERSION = "v5.3.3"
LIBCLANG_PATH = "$HOME/.espup/esp-clang"
```
- `MCU`: 対象マイコンを明示（`build.rs` などで使用）。
- `ESP_IDF_VERSION`: 使用する ESP-IDF のバージョンを指定。
- `LIBCLANG_PATH`: `bindgen` に使わせるカスタムClangのパス。

#### `Cargo.toml`

`Cargo.toml` は、ESP32 用 Rust アプリケーションにおける依存関係やビルド設定を定義します。  
`esp-idf-hal` や `esp-idf-svc` を使った開発に対応しており、LチカからWiFi制御まで拡張しやすい構成です。  
各セクションの詳細は以下です。  
```ini
[package]
name = "esp_test"
version = "0.1.0"
authors = ["ubuntu"]
edition = "2021"
resolver = "2"
rust-version = "1.77"
```
Rust のパッケージ情報とバージョン管理を担います。  
- `resolver = "2"` により依存関係の解決がより柔軟になる
- `rust-version` Rust バージョン 1.77 以上でのビルドを保証

```ini
[[bin]]
name = "esp_test"
harness = false
```
- テストハーネスを無効化（`#[test]` 属性などを無視）
- ESP-IDF 開発ではテストサポートが限定的なため、この設定が必要

```ini
[profile.release]
opt-level = "s"

[profile.dev]
debug = true
opt-level = "z"
```
- `release`: サイズ最小化優先（`opt-level = "s"`）
- `dev`: デバッグ情報あり・サイズ最適化（`opt-level = "z"`）

```ini
[features]
default = ["std", "embassy", "esp-idf-svc/native"]
std = ["alloc", "esp-idf-svc/binstart", "esp-idf-svc/std"]
alloc = ["esp-idf-svc/alloc"]
embassy = ["esp-idf-svc/embassy-sync", "esp-idf-svc/critical-section", "esp-idf-svc/embassy-time-driver"]
```
Rust の機能を柔軟に切り替える仕組みです。  
- `default`: 標準で有効な feature セット（`std`, `embassy` など）
- `embassy`: 非同期タスクランタイムを使うための機能群  
- `alloc`: ヒープ確保を許可  
- `std`: 標準ライブラリの有効化
- `esp-idf-svc/native`: ESP-IDF ランタイムのネイティブ統合を有効にする

```ini
[dependencies]
log = { version = "0.4.27", default-features = false }
esp-idf-svc = { version = "0.51.0", default-features = false }
esp-idf-hal = "0.45.2"
anyhow = "1.0.98"
```
- `log`: ログマクロ（info、error など）を使用可能に
- `esp-idf-svc`: ESP-IDF のサービス層（WiFi、NVS、MQTTなど）を提供
- `esp-idf-hal`: ハードウェア抽象層（GPIO、SPI、I2Cなど）
- `anyhow`: 柔軟なエラー処理を行うためのクレート

```ini
[build-dependencies]
embuild = "0.33.0"
```
- `build.rs` で使われるクレート
  ESP-IDF のパス探索や CMake 設定の管理を担当

#### `rust-toolchain.toml`

`rust-toolchain.toml` は Rust で ESP32 開発する際、**特別なRustツールチェイン「esp」**を使うよう指示するものです。  
これは espup によって提供される、Xtensa アーキテクチャ対応の Rust コンパイラです。  
各セクションの詳細は以下です。  
```ini
[toolchain]
channel = "esp"
```
- [`espup`](https://github.com/esp-rs/espup) がインストールする **ESP32専用Rustツールチェイン**を使うと明示します。  
  これは `rustup` で通常インストールされる `stable` や `nightly` ではなく、Xtensa 対応を含んだカスタムビルド版です。  

#### `sdkconfig.defaults`

`sdkconfig.defaults` は ESP-IDF（C側のフレームワーク）の各種設定（FreeRTOS設定、スタックサイズ、Wi-Fi有効/無効など）を記述するファイルです。  
内容については、[こちらの記事](https://developer.mamezou-tech.com/blogs/2025/05/03/esp-idf-vsc-extension-2/#sdkconfigdefaults-%E3%81%AE%E6%A6%82%E8%A6%81)で詳しく説明していますので、ここでの解説は割愛いたします。  

#### `build.rs`

`build.rs` のコードは、ESP-IDF 開発環境における **ビルド時の環境変数（sysenv）を出力**するためのツール的な関数です。   
`build.rs` やトラブルシューティング時のデバッグに使います。  
この関数は、以下のような情報を **標準出力に表示**します。  
- `IDF_PATH` の場所（ESP-IDF がインストールされたパス）
- `ESP_IDF_VERSION`
- `MCU` や `TOOLCHAIN_PATH` などの設定値
- `CMake` や `Python` 関連の検出結果
- コンパイルフラグ、リンカパスなどの情報

#### Lチカ・サンプルプログラム `src/main.rs`

各関数／パートの詳細は以下です。  

| 関数／パート | 説明 |
|--------|------|
| `link_patches()` | ESP-IDF の内部初期化。これを呼び出すことで低レベルの準備が整います。 |
| `EspLogger::initialize_default()` | `log::info!` などを ESP-IDF のログ出力機構と連携させるための設定。 |
| `Peripherals::take()` | GPIOなどのペリフェラル資源を安全に Rust 側で使えるようにする仕組み。 |
| `PinDriver::output(...)` | GPIOピンを出力用に初期化。ESP32のピン番号に応じて任意に変更可能。 |
| `led.set_high()? / set_low()?` | HIGH/LOWの信号をピンに出力してLEDのON/OFFを制御。 |
| `sleep(Duration::from_millis(500))` | 0.5秒間プログラムを停止（単純なタイミング制御）。 |
| `anyhow::Result<()>` | エラー処理を `?` で簡潔に行える柔軟なエラー型。 |

補足がいくつかあります。  
- GPIO番号は **使用するESP32開発ボードの回路図に応じて変更可能**です（例: GPIO2 など）。
- `loop` 内で `?` を使っているため、`main()` の戻り値は `anyhow::Result<()>` である必要があります。
- `Ok(())` は `loop` の後であるため実行されませんが、**型整合性のために必要**です。

### 実行

プロジェクトルートフォルダで以下のコマンドを実行します。
```shell
cargo run
```

`.cargo/config.toml` に「runner = "espflash flash --monitor"」と記述されています。`run`するとビルド・Flashメモリ書き込み・モニタリングまで続けて実行します。  
実行結果は以下のようになりました。  
```log
    Finished `dev` profile [optimized + debuginfo] target(s) in 0.18s
     Running `espflash flash --monitor target/xtensa-esp32-espidf/debug/esp_test`
[2025-05-18T10:05:16Z INFO ] Serial port: '/dev/ttyUSB0'
[2025-05-18T10:05:16Z INFO ] Connecting...
[2025-05-18T10:05:16Z INFO ] Using flash stub
Chip type:         esp32 (revision v3.1)
Crystal frequency: 40 MHz
Flash size:        4MB
Features:          WiFi, BT, Dual Core, 240MHz, Coding Scheme None
MAC address:       e4:65:b8:1f:e3:e0
App/part. size:    539,760/4,128,768 bytes, 13.07%
[2025-05-18T10:05:18Z INFO ] Segment at address '0x1000' has not changed, skipping write
[2025-05-18T10:05:18Z INFO ] Segment at address '0x8000' has not changed, skipping write
[00:00:09] [============>                           ]      83/268     0x10000                                                                               
```

Flashメモリ書き込みが終わると自動的にシリアル通信のモニタリングが開始されます。  
```log
[00:00:29] [========================================]     268/268     0x10000                                                                               [2025-05-18T10:05:48Z INFO ] Flashing has completed!
Commands:
    CTRL+R    Reset chip
    CTRL+C    Exit

ets Jul 29 2019 12:21:46

rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
configsip: 0, SPIWP:0xee
clk_drv:0x00,q_drv:0x00,d_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00
mode:DIO, clock div:2
load:0x3fff0030,len:7104
load:0x40078000,len:15576
load:0x40080400,len:4
0x40080400 - _invalid_pc_placeholder
    at ??:??
ho 8 tail 4 room 4
load:0x40080404,len:3876
entry 0x4008064c
I (31) boot: ESP-IDF v5.1-beta1-378-gea5e0ff298-dirt 2nd stage bootloader
I (31) boot: compile time Jun  7 2023 07:48:23
I (33) boot: Multicore bootloader
I (37) boot: chip revision: v3.1
I (41) boot.esp32: SPI Speed      : 40MHz
I (46) boot.esp32: SPI Mode       : DIO
I (50) boot.esp32: SPI Flash Size : 4MB
I (55) boot: Enabling RNG early entropy source...
I (60) boot: Partition Table:
I (64) boot: ## Label            Usage          Type ST Offset   Length
I (71) boot:  0 nvs              WiFi data        01 02 00009000 00006000
I (79) boot:  1 phy_init         RF data          01 01 0000f000 00001000
I (86) boot:  2 factory          factory app      00 00 00010000 003f0000
I (94) boot: End of partition table
I (98) esp_image: segment 0: paddr=00010020 vaddr=3f400020 size=2378ch (145292) map
I (159) esp_image: segment 1: paddr=000337b4 vaddr=3ffb0000 size=02178h (  8568) load
I (162) esp_image: segment 2: paddr=00035934 vaddr=40080000 size=0a6e4h ( 42724) load
I (182) esp_image: segment 3: paddr=00040020 vaddr=400d0020 size=52d30h (339248) map
I (305) esp_image: segment 4: paddr=00092d58 vaddr=4008a6e4 size=00eech (  3820) load
I (313) boot: Loaded app from partition at offset 0x10000
I (313) boot: Disabling RNG early entropy source...
I (325) cpu_start: Multicore app
I (334) cpu_start: Pro cpu start user code
I (334) cpu_start: cpu freq: 160000000 Hz
I (335) cpu_start: Application information:
I (338) cpu_start: Project name:     libespidf
I (343) cpu_start: App version:      1
I (347) cpu_start: Compile time:     May 18 2025 18:05:23
I (353) cpu_start: ELF file SHA256:  000000000...
I (359) cpu_start: ESP-IDF:          v5.3.3
I (363) cpu_start: Min chip rev:     v0.0
I (368) cpu_start: Max chip rev:     v3.99 
I (373) cpu_start: Chip rev:         v3.1
I (378) heap_init: Initializing. RAM available for dynamic allocation:
I (385) heap_init: At 3FFAE6E0 len 00001920 (6 KiB): DRAM
I (391) heap_init: At 3FFB2EF0 len 0002D110 (180 KiB): DRAM
I (397) heap_init: At 3FFE0440 len 00003AE0 (14 KiB): D/IRAM
I (403) heap_init: At 3FFE4350 len 0001BCB0 (111 KiB): D/IRAM
I (410) heap_init: At 4008B5D0 len 00014A30 (82 KiB): IRAM
I (418) spi_flash: detected chip: generic
I (421) spi_flash: flash io: dio
W (425) pcnt(legacy): legacy driver is deprecated, please migrate to `driver/pulse_cnt.h`
W (434) i2c: This driver is an old driver, please migrate your application code to adapt `driver/i2c_master.h`
W (444) timer_group: legacy driver is deprecated, please migrate to `driver/gptimer.h`
I (454) main_task: Started on CPU0
I (464) main_task: Calling app_main()
I (464) gpio: GPIO[23]| InputEn: 0| OutputEn: 0| OpenDrain: 0| Pullup: 0| Pulldown: 0| Intr:0 
```

プログラムが実行されると、ESP32のGPIO23番ピンに接続されたLEDが0.5秒間隔で点滅します。

## 注意点

以前予告していた「Rust＋ESP32」の開発環境をようやく構築することが出来ました。  
今回は、筆者の開発環境に ESP-IDF環境が別途インストールされていた影響で、途中で色々とハマりました。  
注意点は以下です。  
- 別途にESP-IDF環境を入れていて、パスを通している人はツールチェーンに注意が必要です。  
- `export-esp.sh` は使用するときに設定した方がよい。常駐させると思わぬ副作用があるかもです。
- RustのツールチェーンのDefaultは切り替えておいた方が無難です。

## まとめ

今回は、Rust＋ESP32の開発環境を構築し、定番ではありますが「Lチカプログラム」を動かすところまで紹介しました。  
別途ESP-IDF環境を用意していた場合の注意点なども紹介できたかと思います。  
本記事が Rust ＋ ESP32 開発の助けになれば幸いです。
