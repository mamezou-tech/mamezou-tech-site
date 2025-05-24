---
title: >-
  Getting Started with Embedded Development Using Rust × ESP32: A Complete Setup
  Guide Through LED Blinking
author: shuichi-takatsu
date: 2025-05-19T00:00:00.000Z
tags:
  - rust
  - esp32
image: true
translate: true

---

Previously, I wrote an article titled [Creating a Rust Development Environment on Windows (VSCode + BuildTools + rustup)](/blogs/2023/02/12/using-rust-01/).  
At the end of that article, I left a note saying, “Once the ESP32-related issues are resolved, I will report back in the next article,” but quite a lot of time has passed since then.

This time, I have managed to set up a development environment using Rust and ESP32, so I’ll provide a detailed walkthrough of the steps.  
I mainly referred to [this](https://docs.esp-rs.org/book/introduction.html) and [this](https://github.com/esp-rs/espup).

## Introduction

The development environment uses the following:
- OS: Ubuntu 24.04 (on WSL2)
- Python3: v3.12.3
- IDE: Visual Studio Code: 1.100.2
- ESP-IDF: v5.3.3
- rustup: 1.28.2
- espup: 0.15.0
- Target: ESP32 development board (e.g., ESP-WROOM-32)

:::alert
If you already have ESP-IDF installed in your environment and it is version v5.4.x, building with Rust may fail.  
If you want to use ESP-IDF via your system PATH, either downgrade your ESP-IDF environment to v5.3.x or do not include the ESP-IDF toolchain in your PATH.  
Also, even with v5.3.x there were subtle version differences between the esp32 toolchain joined by rustup and v5.3.3, which caused issues.  
I recommend simply removing ESP-IDF from your persistent PATH when using this setup.  
:::

## Prerequisites

Install the Ubuntu packages required for the Rust + ESP32 development environment in advance.  
I believe the following will be sufficient:

```shell
sudo apt update
sudo apt install -y libssl-dev pkg-config curl build-essential gcc libudev-dev
```

## Installing Rust

Refer to [this](https://rustup.rs/) for instructions and install Rust.  
Since I’m using WSL, I ran the following command:  
```shell
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

This will download and install Rust.  
During the installation, you will be prompted to choose:
- 1) Proceed with standard installation (default – just press enter)
- 2) Customize installation
- 3) Cancel installation

I chose (1).  
The output looked like this:  
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

After installation completes, the following line is added to `.bashrc`:  
```ini
. "$HOME/.cargo/env"
```

## Installing espup

Next, refer to [here](https://github.com/esp-rs/espup) and run the following command:  
```shell
cargo install espup --locked
```

If you prefer to install the precompiled release binary instead, you can also do so with:  
(I didn’t try this)  
```shell
curl -L https://github.com/esp-rs/espup/releases/latest/download/espup-x86_64-unknown-linux-gnu -o espup
chmod +x espup
```

Once espup is installed via `cargo`, run:  
```shell
espup install --targets esp32
```

The output looked like this:  
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

The log suggests running `'. /home/ubuntu/export-esp.sh'`.  
This file configures the PATH to include the ESP32 toolchain.  
Add the following to your `.bashrc`:  
```ini
. $HOME/export-esp.sh
```

## Verifying the Rust Toolchain

Next, let's verify the Rust environment.  
With the previous steps completed, run:  
```shell
rustup show
```

You should see output like this:  
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

You can see that the `esp` toolchain has been added.  
Since the default is still `stable-x86_64-unknown-linux-gnu`, switch the default to `esp` by running:  
```shell
rustup default esp
```

Check the result again with `rustup show`:  
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

The toolchain is now set to `esp`.  
Although it appears that no targets are installed, the actual target modules are stored within the `esp` directory, so this setting is fine.  

:::alert
If you do not switch the default to `esp`, the build may mistakenly use `stable-x86_64-unknown-linux-gnu` and result in errors.  
:::

## Installing Required Modules

Run the following commands to install the modules needed for creating, building, and flashing ESP32 projects.  
Each install may take some time—just be patient.  
```shell
cargo install espflash
cargo install ldproxy
cargo install cargo-generate
cargo install cargo-espflash
```

## Creating and Building an ESP32 Project Template

Use Cargo’s `generate` to create a template ESP32 project.  
Run the following command:  
```shell
cargo generate --git https://github.com/esp-rs/esp-idf-template cargo
```
You will be prompted for the following:
- Project Name: > Enter any project name (e.g., esp_test)
- Which MCU to target? › Select `esp32`.
- Configure advanced template options? › Choose `false`.

The project structure will look like this:
```cmake
esp_test/
├── .cargo/
│   └── config.toml           # Cargo target/linker/flash settings
├── .gitignore                # Files to ignore in Git
├── Cargo.toml                # Rust package configuration
├── rust-toolchain.toml       # Rust toolchain specification (for esp)
├── sdkconfig.defaults        # ESP-IDF build configuration (Kconfig)
├── build.rs                  # Build script (for esp-idf-sys integration)
└── src/
    └── main.rs               # Rust entry point (for LED blinking, etc.)
```

Each file’s role is as follows:

| File/Directory         | Description                                                   |
|------------------------|---------------------------------------------------------------|
| `.cargo/config.toml`   | Cross-compilation settings for ESP-IDF (`target`, `linker`, `runner`, etc.) |
| `rust-toolchain.toml`  | Locks the Rust version and target (`esp`)                     |
| `sdkconfig.defaults`   | ESP-IDF settings (e.g., FreeRTOS options)                     |
| `build.rs`             | Rust build script for `esp-idf-sys` integration               |
| `src/main.rs`          | The Rust application code written by the user                 |
| `Cargo.toml`           | Definitions of Rust dependencies and features                 |

In the project folder, run the build:  
```shell
cd esp_test  # your project name
cargo build
```

:::alert
If you have a custom ESP-IDF installation in your PATH, the ESP-IDF toolchain can conflict with the Rust toolchain during build.  
(I ran into this myself at first.)  
If you want to use your own ESP-IDF toolchain, avoid running `. $HOME/export-esp.sh`, and the build should succeed.  
(I built using my own ESP-IDF toolchain without running `. $HOME/export-esp.sh`.)  
:::

## LED Blinking Sample Program

The template above only prints a simple “hello world,” which is a bit bland, so as a classic example, let’s create an ESP32 LED blinking program (Lチカ).  
We’ll make a few modifications to the template we just created.

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
    // Initialize ESP-IDF
    link_patches();
  
    // Bind the log crate to the ESP Logging facilities
    EspLogger::initialize_default();
  
    let peripherals = Peripherals::take().unwrap();

    let mut led = PinDriver::output(peripherals.pins.gpio23)?;

    loop {
        led.set_high()?; // Turn LED on
        sleep(Duration::from_millis(500));

        led.set_low()?; // Turn LED off
        sleep(Duration::from_millis(500));
    }

    // This line will not be executed, but is required for type compatibility
    // Due to Rust's static checks, it must be written after the loop
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

## Explanation and Execution of the LED Blinking Sample Program

### Explanation

There are five files directly related to the integration between ESP32 and Rust.  
These are key components for setting up the environment and cross-compilation so that Rust can call ESP-IDF (the C library).  
```ini
esp_test/
├── .cargo/
│   └── config.toml           # Cross-compilation settings for Rust→ESP32
├── Cargo.toml                # Dependency management for esp-idf related crates
├── rust-toolchain.toml       # Locks the toolchain/target for esp
├── sdkconfig.defaults        # ESP-IDF build settings (Kconfig options)
├── build.rs                  # Build script that integrates with esp-idf-sys
```

Here is a brief explanation of each:

#### `.cargo/config.toml`

`.cargo/config.toml` is an important configuration file for automating and stabilizing cross-compilation and execution in a Rust + ESP32 (ESP-IDF) environment.  
Details of each section:

```ini
[build]
target = "xtensa-esp32-espidf"
```
- Uses `xtensa-esp32-espidf` as the default build target.
- You can build for ESP32 without adding `--target` every time.

```ini
[target.xtensa-esp32-espidf]
linker = "ldproxy"
runner = "espflash flash --monitor"
rustflags = [ "--cfg", "espidf_time64" ]
```
- `linker`: Uses the custom ESP-IDF linker `ldproxy`.
- `runner`: When running `cargo run`, uses `espflash` to flash and open the serial monitor.
- `rustflags`: Conditional compilation option to enable 64-bit time structures.

```ini
[unstable]
build-std = ["std", "panic_abort"]
```
- Cross-builds the Rust standard library.
- Builds `std` and `panic_abort` for a `no_std` target.

```ini
[env]
MCU = "esp32"
ESP_IDF_VERSION = "v5.3.3"
LIBCLANG_PATH = "$HOME/.espup/esp-clang"
```
- `MCU`: Specifies the target microcontroller (used in `build.rs`, etc.).
- `ESP_IDF_VERSION`: Specifies the version of ESP-IDF to use.
- `LIBCLANG_PATH`: Path to the custom Clang for `bindgen`.

#### `Cargo.toml`

`Cargo.toml` defines the dependencies and build settings for the Rust application targeting ESP32.  
It supports development with `esp-idf-hal` and `esp-idf-svc`, making it easy to extend from LED blinking to WiFi control.  
Details of each section:

```ini
[package]
name = "esp_test"
version = "0.1.0"
authors = ["ubuntu"]
edition = "2021"
resolver = "2"
rust-version = "1.77"
```
Handles Rust package metadata and version management.  
- `resolver = "2"` allows more flexible dependency resolution.  
- `rust-version` ensures the build requires Rust version 1.77 or above.

```ini
[[bin]]
name = "esp_test"
harness = false
```
- Disables the test harness (ignoring `#[test]` attributes).  
- Required because test support is limited in ESP-IDF development.

```ini
[profile.release]
opt-level = "s"

[profile.dev]
debug = true
opt-level = "z"
```
- `release`: Prioritizes size minimization (`opt-level = "s"`).  
- `dev`: Includes debug symbols and optimizes size (`opt-level = "z"`).

```ini
[features]
default = ["std", "embassy", "esp-idf-svc/native"]
std = ["alloc", "esp-idf-svc/binstart", "esp-idf-svc/std"]
alloc = ["esp-idf-svc/alloc"]
embassy = ["esp-idf-svc/embassy-sync", "esp-idf-svc/critical-section", "esp-idf-svc/embassy-time-driver"]
```
Provides a flexible mechanism to switch Rust features.  
- `default`: The default feature set (`std`, `embassy`, etc.).  
- `embassy`: A set of features for using an async task runtime.  
- `alloc`: Enables heap allocation.  
- `std`: Enables the standard library.  
- `esp-idf-svc/native`: Enables native integration with the ESP-IDF runtime.

```ini
[dependencies]
log = { version = "0.4.27", default-features = false }
esp-idf-svc = { version = "0.51.0", default-features = false }
esp-idf-hal = "0.45.2"
anyhow = "1.0.98"
```
- `log`: Enables logging macros (`info`, `error`, etc.).  
- `esp-idf-svc`: Provides the ESP-IDF service layer (e.g., WiFi, NVS, MQTT).  
- `esp-idf-hal`: Hardware abstraction layer (GPIO, SPI, I2C, etc.).  
- `anyhow`: A crate for flexible error handling.

```ini
[build-dependencies]
embuild = "0.33.0"
```
- The crate used in `build.rs` to handle ESP-IDF path discovery and CMake settings.

#### `rust-toolchain.toml`

`rust-toolchain.toml` instructs Cargo to use the **special Rust toolchain "esp"** for ESP32 development.  
This is the Xtensa-architecture-compatible Rust compiler provided by espup.  
Details:

```ini
[toolchain]
channel = "esp"
```
- Specifies using the **ESP32-specific Rust toolchain** installed by [`espup`](https://github.com/esp-rs/espup).  
  This is a custom build that includes Xtensa support, unlike the usual `stable` or `nightly` toolchains installed via `rustup`.

#### `sdkconfig.defaults`

`sdkconfig.defaults` is a file where you specify various settings for ESP-IDF (the C framework), such as FreeRTOS settings, stack sizes, enabling/disabling Wi-Fi, etc.  
For detailed information on its content, see [this article](https://developer.mamezou-tech.com/blogs/2025/05/03/esp-idf-vsc-extension-2/#sdkconfigdefaults-%E3%81%AE%E6%A6%82%E8%A6%81); we’ll skip a detailed explanation here.

#### `build.rs`

The code in `build.rs` is a utility function that **outputs build-time environment variables (sysenv)** for the ESP-IDF development environment.  
It is used in `build.rs` itself and for debugging during troubleshooting.  
This function prints the following information to **standard output**:  
- The location of `IDF_PATH` (where ESP-IDF is installed)  
- `ESP_IDF_VERSION`  
- Configuration values such as `MCU` and `TOOLCHAIN_PATH`  
- Detected information related to CMake and Python  
- Compilation flags, linker paths, and other details

#### LED Blinking Sample Program `src/main.rs`

Details of each function/section are as follows:

| Function/Section                  | Description                                                                           |
|-----------------------------------|---------------------------------------------------------------------------------------|
| `link_patches()`                  | Internal initialization of ESP-IDF. Calling this sets up low-level preparations.     |
| `EspLogger::initialize_default()` | Configures the `log` crate (e.g., `log::info!`) to use the ESP-IDF logging facilities. |
| `Peripherals::take()`             | A mechanism to safely acquire peripheral resources (e.g., GPIO) on the Rust side.     |
| `PinDriver::output(...)`          | Initializes a GPIO pin for output. You can change the pin number to match your board. |
| `led.set_high()? / set_low()?`    | Outputs HIGH/LOW signals to the pin to turn the LED on/off.                           |
| `sleep(Duration::from_millis(500))` | Pauses the program for 0.5 seconds (simple timing control).                         |
| `anyhow::Result<()>`              | A flexible error type that allows concise error handling with `?`.                    |

A few additional notes:
- The GPIO number can be **changed according to the schematic of your ESP32 development board** (e.g., GPIO2).  
- Since `?` is used within the `loop`, `main()` must return `anyhow::Result<()>`.  
- `Ok(())` is placed after the `loop`, so it never executes, but it is **required for type consistency**.

### Execution

In the project root folder, run:
```shell
cargo run
```

Since `runner = "espflash flash --monitor"` is specified in `.cargo/config.toml`, `cargo run` will build, flash to the device, and start monitoring the serial output in one step.  
The output looked like this:

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

After flashing completes, serial monitoring starts automatically:

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

When the program runs, the LED connected to GPIO23 on the ESP32 will blink at 0.5-second intervals.

## Points to Note

I finally managed to set up the "Rust + ESP32" development environment that I mentioned earlier.  
This time, because I had a separate ESP-IDF installation in my environment, I ran into a few issues along the way.  
Here are some points to be aware of:
- If you have a separate ESP-IDF installation in your PATH, be careful with toolchain conflicts.  
- It’s better to source `export-esp.sh` only when you need it. Keeping it loaded permanently may cause unexpected side effects.  
- It’s safer to switch the default Rust toolchain to `esp`.

## Conclusion

In this article, we set up the Rust + ESP32 development environment and, as a classic example, ran an LED blinking program.  
I also covered some caveats if you already have a separate ESP-IDF environment installed.  
I hope this article helps you in your Rust + ESP32 development.
