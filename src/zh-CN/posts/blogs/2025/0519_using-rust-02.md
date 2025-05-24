---
title: 使用 Rust × ESP32 开始嵌入式开发：直到 LED 闪烁的完全设置指南
author: shuichi-takatsu
date: 2025-05-19T00:00:00.000Z
tags:
  - rust
  - esp32
image: true
translate: true

---

之前，我写过一篇文章[尝试在 Windows 上搭建 Rust 开发环境（VSCode＋BuildTools＋rustup）](/blogs/2023/02/12/using-rust-01/)。  
在文章的最后我说了“等处理好 ESP32 相关问题后，会在下一篇文章中报告”，结果已经过去了相当长的时间。

这次，因为已经成功搭建了 Rust + ESP32 的开发环境，所以在此详细介绍其步骤。  
主要参考了[这里](https://docs.esp-rs.org/book/introduction.html)和[这里](https://github.com/esp-rs/espup)。

## 引言

本次开发环境使用如下配置：
- OS: Ubuntu 24.04 (on WSL2)
- Python3： V3.12.3
- IDE: Visual Studio Code: 1.100.2
- ESP-IDF: v5.3.3
- rustup: 1.28.2
- espup: 0.15.0
- 目标：ESP32 开发板（ESP-WROOM-32 等）

:::alert
如果在已有环境中安装了 ESP-IDF，且 ESP-IDF 版本为 v5.4 系列，可能会导致 Rust 构建失败。  
如果通过环境变量添加 ESP-IDF 路径使用，请将 ESP-IDF 环境降级到 v5.3 系列，或不添加 ESP-IDF 工具链路径再使用。  
另外，即便是 v5.3 系列，rustup 所关联的 esp32 工具链版本和官方的 v5.3.3 也略有差异，也会导致问题。  
建议干脆从常驻环境变量中删除 ESP-IDF 路径后再使用。  
:::

## 事前准备

请预先安装 Rust+ESP32 开发环境所需的 Ubuntu 模块。  
大概只需安装如下软件包即可。

```shell
sudo apt update
sudo apt install -y libssl-dev pkg-config curl build-essential gcc libudev-dev
```

## 安装 Rust

参考[这里](https://rustup.rs/)的信息安装 Rust。  
我使用 WSL，因此执行了以下命令。

```shell
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

将开始下载并安装 Rust。  
过程中会要求进行如下选择。
- 1) Proceed with standard installation (default - just press enter)
- 2) Customize installation
- 3) Cancel installation

我选择了（1）。  
执行结果如下。

```log
info: downloading installer

Welcome to Rust!

This will download and install the official compiler for the Rust
programming language, and its package manager, Cargo.

…（省略）…
```

安装完成后，`.bashrc` 中已追加如下内容：

```ini
. "$HOME/.cargo/env" 
```

## 安装 espup

接下来参考[这里](https://github.com/esp-rs/espup)，执行以下命令：

```shell
cargo install espup --locked
```

如果想安装已编译的发行版二进制，也可以使用如下方法。  
（我未尝试）

```shell
curl -L https://github.com/esp-rs/espup/releases/latest/download/espup-x86_64-unknown-linux-gnu -o espup
chmod +x espup
```

用 `cargo` 安装 espup 后，执行以下命令：

```shell
espup install --targets esp32
```

执行结果如下：

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

从日志可以看到需要执行 `'. /home/ubuntu/export-esp.sh'`。  
该脚本用于将 ESP32 的工具链加入到 PATH。  
在 .bashrc 中追加如下内容：

```ini
. $HOME/export-esp.sh 
```

## 验证 Rust 工具链

接下来来确认 Rust 环境。  
到目前为止，执行以下命令：

```shell
rustup show
```

执行结果如下：

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

可以看到工具链中已添加 “esp”。  
由于默认仍是 “stable-x86_64-unknown-linux-gnu”，需要将默认切换到 “esp”。  
执行以下命令：

```shell
rustup default esp
```

使用 `rustup show` 查看切换结果。

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

工具链已切换到 “esp”。  
虽然看上去似乎没有安装任何目标，但实际的目标模块存放在 `esp` 文件夹下更深层的位置，所以无需担心，这样的配置是没有问题的。  

:::alert
如果不将默认切换到 esp，会在构建时错误地使用 `stable-x86_64-unknown-linux-gnu`，从而导致构建失败。  
:::

## 安装所需模块

执行以下命令，安装创建 ESP32 项目、构建和写入 Flash 所需的模块。  
每个命令都需要编译，相对耗时，请耐心等待。

```shell
cargo install espflash
cargo install ldproxy
cargo install cargo-generate
cargo install cargo-espflash
```

## 创建并构建 ESP32 项目模板

使用 cargo 的 `generate` 创建 ESP32 项目模板。  
执行以下命令：

```shell
cargo generate --git https://github.com/esp-rs/esp-idf-template cargo
```

过程中会提示进行以下输入：  
- Project Name: > 设置“任意的项目名称”（示例：esp_test）  
- Which MCU to target? › 选择 “esp32”。  
- Configure advanced template options? › 选择 “false”。  

项目目录结构如下：

```cmake
esp_test/
├── .cargo/
│   └── config.toml           # Cargo 用于目标/链接器/闪存配置
├── .gitignore                # Git 忽略的文件列表
├── Cargo.toml                # Rust 包配置
├── rust-toolchain.toml       # Rust 工具链指定（esp 用）
├── sdkconfig.defaults        # ESP-IDF 构建配置（Kconfig）
├── build.rs                  # 构建脚本（用于 esp-idf-sys 集成）
└── src/
    └── main.rs               # Rust 入口点（用于编写 LED 闪烁等）
```

各文件/目录的作用如下：

| 文件/目录                | 内容                                                         |
| --------------------- | ------------------------------------------------------------ |
| `.cargo/config.toml`  | 面向 ESP-IDF 的交叉编译配置（`target`, `linker`, `runner` 等） |
| `rust-toolchain.toml` | 固定 Rust 版本及目标（`esp`）                                |
| `sdkconfig.defaults`  | ESP-IDF 的配置（如 FreeRTOS 设置等）                         |
| `build.rs`            | 用于与 `esp-idf-sys` 集成的 Rust 构建脚本                    |
| `src/main.rs`         | 用户编写的 Rust 应用程序主体                                 |
| `Cargo.toml`          | 定义 Rust 的依赖关系及 feature 等                            |

在项目根目录下执行构建：

```shell
cd esp_test  # 项目名称
cargo build
```

:::alert
如果单独安装了 ESP-IDF 并添加了其路径，则构建时 ESP-IDF 工具链和 Rust 工具链会发生冲突。  
（我一开始也被这个问题折腾过）  
如果想使用自己准备的 ESP-IDF 工具链，只要不执行 `. $HOME/export-esp.sh`，构建应该就能通过。  
（我就是在没有执行 `. $HOME/export-esp.sh` 的情况下，使用自己安装的 ESP-IDF 工具链完成的构建）  
:::

## LED 闪烁 示例程序

上面的模板只是单纯输出 “hello world”，略显乏味，所以我们仍然沿用经典示例，编写 ESP32 的 LED 闪烁 程序。  
在刚才创建的模板基础上做一些修改。

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
# 注意：该变量不会被 pio 构建器（`cargo build --features pio`）使用
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
# Rust 相较于 C 通常需要稍大一些的主任务栈大小（默认 3K）
CONFIG_ESP_MAIN_TASK_STACK_SIZE=8000

# 使用此设置 FreeRTOS 内核时钟频率为 1000 Hz（默认 100 Hz）。
# 这样可在线程睡眠时使用 1 ms 的粒度（默认 10 ms）。
#CONFIG_FREERTOS_HZ=1000

# 针对 https://github.com/espressif/esp-idf/issues/7631 的解决方案
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
    // 初始化 ESP-IDF
    link_patches();
  
    // 将 log crate 绑定到 ESP 的日志功能
    EspLogger::initialize_default();
  
    let peripherals = Peripherals::take().unwrap();

    let mut led = PinDriver::output(peripherals.pins.gpio23)?;

    loop {
        led.set_high()?; // 点亮
        sleep(Duration::from_millis(500));

        led.set_low()?; // 熄灭
        sleep(Duration::from_millis(500));
    }

    // 此行不会被执行，但为了类型一致性而保留
    // 由于 Rust 的静态检查，需要将其写在 loop 之后
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
harness = false # 不使用内置的 cargo 测试框架 -> 以解决 rust-analyzer 错误

[profile.release]
opt-level = "s"

[profile.dev]
debug = true    # 符号信息有助于调试，并且不会增加 Flash 大小
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

## LED 闪烁 示例程序的解析与运行

### 解析

与 ESP32 和 Rust 直接关联的文件有以下 5 个。  
它们是用于从 Rust 调用 ESP-IDF（C 库）的环境构建和交叉编译设置的重要组成部分。

```ini
esp_test/
├── .cargo/
│   └── config.toml           # Rust→ESP32 交叉编译配置
├── Cargo.toml                # esp-idf 相关 crate 的依赖管理
├── rust-toolchain.toml       # 固定 esp 专用工具链/目标
├── sdkconfig.defaults        # ESP-IDF 构建配置（Kconfig 选项）
├── build.rs                  # 与 esp-idf-sys 集成的构建脚本
```

下面做简要说明。

#### `.cargo/config.toml`

`.cargo/config.toml` 是在 Rust + ESP32（ESP-IDF）环境中实现交叉编译和自动化执行的重要配置文件。  
各部分的详细说明如下：

```ini
[build]
target = "xtensa-esp32-espidf"
```
- 使用 `xtensa-esp32-espidf` 作为默认构建目标。  
- 每次无需指定 `--target` 即可针对 ESP32 构建。

```ini
[target.xtensa-esp32-espidf]
linker = "ldproxy"
runner = "espflash flash --monitor"
rustflags = [ "--cfg", "espidf_time64" ]
```
- `linker`: 使用用于 ESP-IDF 的自定义链接器 `ldproxy`。  
- `runner`: 在 `cargo run` 时使用 `espflash` 进行烧录和串口监视。  
- `rustflags`: 启用 64 位时间结构的条件编译选项。

```ini
[unstable]
build-std = ["std", "panic_abort"]
```
- 对 Rust 标准库进行交叉编译。  
- 为 `no_std` 目标自行编译 `std` 和 `panic_abort`。

```ini
[env]
MCU = "esp32"
ESP_IDF_VERSION = "v5.3.3"
LIBCLANG_PATH = "$HOME/.espup/esp-clang"
```
- `MCU`: 明确目标 MCU（在 `build.rs` 等中使用）。  
- `ESP_IDF_VERSION`: 指定要使用的 ESP-IDF 版本。  
- `LIBCLANG_PATH`: 为 `bindgen` 指定自定义 Clang 路径。

#### `Cargo.toml`

`Cargo.toml` 定义了针对 ESP32 的 Rust 应用的依赖关系和构建设置。  
支持使用 `esp-idf-hal` 和 `esp-idf-svc` 进行开发，能方便地从 LED 闪烁扩展到 WiFi 控制等。  
各部分的详细说明如下：

```ini
[package]
name = "esp_test"
version = "0.1.0"
authors = ["ubuntu"]
edition = "2021"
resolver = "2"
rust-version = "1.77"
```
- 负责 Rust 包的信息和版本管理。  
- `resolver = "2"` 可使依赖关系解析更灵活。  
- `rust-version` 确保在 Rust 1.77 及以上版本进行构建。

```ini
[[bin]]
name = "esp_test"
harness = false
```
- 禁用测试框架（忽略 `#[test]` 属性等）。  
- 由于 ESP-IDF 开发中的测试支持有限，因此需要此设置。

```ini
[profile.release]
opt-level = "s"

[profile.dev]
debug = true    # 符号信息有助于调试，并且不会增加 Flash 大小
opt-level = "z"
```
- `release`: 优先最小化大小（`opt-level = "s"`）。  
- `dev`: 带调试信息且大小优化（`opt-level = "z"`）。

```ini
[features]
default = ["std", "embassy", "esp-idf-svc/native"]
std = ["alloc", "esp-idf-svc/binstart", "esp-idf-svc/std"]
alloc = ["esp-idf-svc/alloc"]
embassy = ["esp-idf-svc/embassy-sync", "esp-idf-svc/critical-section", "esp-idf-svc/embassy-time-driver"]
```
- Rust 功能灵活切换的机制。  
- `default`: 默认启用的 feature 集合（如 `std`, `embassy` 等）。  
- `embassy`: 用于异步任务运行时的功能集。  
- `alloc`: 允许堆分配。  
- `std`: 启用标准库。  
- `esp-idf-svc/native`: 启用 ESP-IDF 运行时的原生集成。

```ini
[dependencies]
log = { version = "0.4.27", default-features = false }
esp-idf-svc = { version = "0.51.0", default-features = false }
esp-idf-hal = "0.45.2"
anyhow = "1.0.98"
```
- `log`: 启用日志宏（如 info、error 等）。  
- `esp-idf-svc`: 提供 ESP-IDF 的服务层（WiFi、NVS、MQTT 等）。  
- `esp-idf-hal`: 硬件抽象层（GPIO、SPI、I2C 等）。  
- `anyhow`: 用于灵活错误处理的 crate。

```ini
[build-dependencies]
embuild = "0.33.0"
```
- `build.rs` 中使用的 crate  
  负责 ESP-IDF 路径探测和 CMake 设置管理。

#### `rust-toolchain.toml`

`rust-toolchain.toml` 用于在 Rust 开发 ESP32 时指定使用 **特殊的 Rust 工具链 “esp”**。  
该工具链由 espup 提供，是针对 Xtensa 架构的 Rust 编译器。  
各部分的详细说明如下：

```ini
[toolchain]
channel = "esp"
```
- 明确使用由 espup 安装的 **ESP32 专用 Rust 工具链**。  
- 它不是通过 `rustup` 普通安装的 `stable` 或 `nightly`，而是包含 Xtensa 支持的定制构建版本。

#### `sdkconfig.defaults`

`sdkconfig.defaults` 是用于描述 ESP-IDF（C 端框架）各种配置的文件（如 FreeRTOS 设置、栈大小、Wi-Fi 启用/禁用等）。  
其内容可参考[这篇文章](https://developer.mamezou-tech.com/blogs/2025/05/03/esp-idf-vsc-extension-2/#sdkconfigdefaults-%E3%81%AE%E6%A6%82%E8%A6%81)，在此不赘述。

#### `build.rs`

`build.rs` 代码是一个工具函数，用于在 ESP-IDF 开发环境中 **输出构建时的环境变量（sysenv）**。  
可在 `build.rs` 执行或排除故障时进行调试。  
该函数会将以下信息 **输出到标准输出**：
- `IDF_PATH` 的位置（ESP-IDF 安装路径）  
- `ESP_IDF_VERSION`  
- `MCU` 以及 `TOOLCHAIN_PATH` 等配置值  
- `CMake` 和 `Python` 相关的检测结果  
- 编译标志、链接器路径等信息

#### LED 闪烁 示例程序 `src/main.rs`

各函数/部分的详细说明如下：

| 函数/部分                        | 说明                                                          |
|--------------------------------|-------------------------------------------------------------|
| `link_patches()`               | ESP-IDF 的内部初始化。调用此函数即可完成底层准备。            |
| `EspLogger::initialize_default()` | 将 `log::info!` 等日志宏绑定到 ESP-IDF 的日志输出机制。      |
| `Peripherals::take()`          | 使 GPIO 等外设资源能在 Rust 侧安全使用的机制。                |
| `PinDriver::output(...)`       | 将 GPIO 引脚初始化为输出模式。可根据 ESP32 开发板的引脚编号修改。 |
| `led.set_high()? / set_low()?` | 输出 HIGH/LOW 信号到引脚，以控制 LED 的开/关。              |
| `sleep(Duration::from_millis(500))` | 使程序暂停 0.5 秒（简单的时间控制）。                        |
| `anyhow::Result<()>`           | 支持使用 `?` 简洁地处理错误的灵活错误类型。                  |

补充说明如下。  
- GPIO 编号可根据所使用的 ESP32 开发板电路图进行修改（如：GPIO2 等）。  
- 由于在 `loop` 中使用了 `?`，因此 `main()` 的返回值必须为 `anyhow::Result<()>`。  
- `Ok(())` 写在 `loop` 之后虽然不会被执行，但**为了类型一致性是必须的**。

### 运行

在项目根目录下执行以下命令：

```shell
cargo run
```

在 `.cargo/config.toml` 中已设置 `runner = "espflash flash --monitor"`。执行 `run` 时会依次完成构建、Flash 写入和监视。  
执行结果如下：

```log
    Finished `dev` profile [optimized + debuginfo] target(s) in 0.18s
     Running `espflash flash --monitor target/xtensa-esp32-espidf/debug/esp_test`
[2025-05-18T10:05:16Z INFO ] Serial port: '/dev/ttyUSB0'
…（省略）…
```

Flash 写入完成后会自动开始串口通信监视。

```log
…（省略）…
I (464) main_task: Calling app_main()
I (464) gpio: GPIO[23]| InputEn: 0| OutputEn: 0| OpenDrain: 0| Pullup: 0| Pulldown: 0| Intr:0 
```

程序运行后，连接到 ESP32 GPIO23 引脚的 LED 将以 0.5 秒的间隔闪烁。

## 注意事项

终于完成了之前预告的 “Rust＋ESP32” 开发环境搭建。  
本次过程中，由于作者的开发环境中另行安装了 ESP-IDF，导致中途遇到了各种坑。  
注意事项如下：  
- 如果单独安装并添加了 ESP-IDF 环境到 PATH，需要注意工具链的使用。  
- `export-esp.sh` 应在需要时手动设置，常驻可能会有意想不到的副作用。  
- 建议切换 Rust 工具链的默认值，提高安全性。

## 总结

本次介绍了 Rust＋ESP32 开发环境的搭建，并运行了经典的 LED 闪烁 程序。  
也分享了在已单独准备 ESP-IDF 环境时需要注意的要点。  
希望本文能为 Rust ＋ ESP32 开发提供帮助。
