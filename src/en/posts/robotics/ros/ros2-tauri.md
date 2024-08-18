---
title: Using Tauri for UI Development in ROS2
author: masayuki-kono
date: 2024-01-10T00:00:00.000Z
tags:
  - ROS2
  - Tauri
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/robotics/ros/ros2-tauri/).
:::



When building robot system applications using ROS (Robot Operating System) or ROS2, what kind of UI frameworks do you utilize?

For developer tools, there is a method of creating custom plugins and integrating them into [RQt](https://docs.ros.org/en/humble/Concepts/Intermediate/About-RQt.html). Additionally, for screens aimed at non-developers, it is common to develop from scratch using Qt.

Through the rosbridge_server of [rosbridge_suite](https://github.com/RobotWebTools/rosbridge_suite), there is also a method to communicate with ROS as a web application using a JSON API. Our company uses this method for use cases such as remotely operating robot systems and checking sensor statuses.

For embedded applications displaying UI on touch panels, Qt is a powerful choice. However, there have been recent development cases adopting Tauri, a UI framework in Rust, and this article will introduce the details. In the latter part of the article, I would also like to provide a simple tutorial on the process of incorporating ROS2 nodes into the Tauri project.

For more details on Tauri, please refer to the previous article ["Rust-based Desktop Application Framework Tauri"](https://tauri.app/v1/guides/getting-started/prerequisites#setting-up-linux).

## Case Study

### System Configuration

In this case, we used Tauri in the development of a robot system with the following configuration. Numerous sensors and peripherals connected to the PLC are omitted here. The pendant (a terminal for teaching robot operations) that comes standard with the robot is also not discussed. During operation, users perform all operations using a touch panel instead of the pendant.

![System Configuration](/img/robotics/ros/ros2-tauri-system-structure.png)

The "System Control App" shown in the diagram above is a GUI application composed of ROS2 and Tauri, running on an industrial PC. The operating environment is Ubuntu 22.04, and the ROS2 distribution is [Humble Hawksbill](https://docs.ros.org/en/rolling/Releases.html).

Below is an image of the system created by ChatGPT. Although it differs significantly from the actual system, I hope it conveys how users operate the robot system through the touch panel.

![System Image](/img/robotics/ros/ros2-tauri-system-image.png)

### Application Configuration

The system control app consists of multiple ROS2 nodes, which collaborate through [ROS2 communication](https://docs.ros.org/en/humble/How-To-Guides/Topics-Services-Actions.html) (topics, services, actions) to implement various functions.

The diagram below is an image of the node configuration. In addition to communication drivers with various hardware, a node called system_controller manages overall system control. In reality, there are many more topics and nodes, and communication between nodes occurs in a many-to-many manner. Within this, a node called web_ui is built on Tauri, relaying communication between other nodes and WebView, and providing UI functionality. Users operate from the WebView screen displayed on the touch panel, and the web_ui node sends instructions to the system_controller node via ROS2 communication.

![Node Configuration](/img/robotics/ros/ros2-tauri-node-structure.png)

As for development languages, the UI frontend uses Typescript (with Meta's React), the web_ui node uses Rust, and other nodes use C++. There was also a proposal to develop all nodes in Rust, but considering the significant development burden of porting communication drivers to Rust and reusing past development assets, we chose this method. However, the reimplementation of software in Rust is actively progressing, and we plan to consider transitioning to Rust at the node level when the appropriate time comes. This phased transition is also a benefit of adopting a distributed architecture like ROS2.

## Incorporating ROS2 Nodes into the Tauri Project

From here, I will show a tutorial on incorporating ROS2 nodes into the Tauri project.

The Tauri Core process[^1] will incorporate a Rust ROS2 client into the Tauri project for communication with ROS2. We will use [r2r](https://github.com/sequenceplanner/r2r) for the ROS2 client.

:::info
As a Rust client library supporting Humble for ROS2, there is also [ros2-rust](https://github.com/ros2-rust/ros2_rust) besides r2r. However, as of the latest version [0.4.1](https://github.com/ros2-rust/ros2_rust/releases) at the time of writing this article, one of the ROS2 communication methods, action, was not supported, so we used r2r.

:::

[^1]: Applications by Tauri consist of an entry point Core process and one or more WebView processes. For details, see the [References/Tauri/Architecture/Process Model](https://tauri.app/v1/references/architecture/process-model/) page.

### Development Environment

- OS
  - Ubuntu 22.04.03
- ROS2 Humble
  - Please install ROS2 according to the [installation guide](https://docs.ros.org/en/humble/Installation/Ubuntu-Install-Debians.html).
- JavaScript Package Manager

  - We will use yarn this time. Please install it along with the latest stable version[^2] of Node.js.

    ```shell
    curl -fsSL https://deb.nodesource.com/setup_19.x | sudo -E bash -
    sudo apt update
    sudo apt install nodejs
    ```

    ```shell
    npm install --global yarn
    ```

- Tauri
  - Please install the dependency packages and Rust according to [Tauri's guide](https://tauri.app/v1/guides/getting-started/prerequisites#setting-up-linux).

[^2]: As of the time of writing this article, the latest stable version of Node.js was v20.10.0LTS.

### Creating a Tauri Project Boilerplate

The following options were used for generation.

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

Please follow the console output steps and confirm that the app launches with the `yarn tauri dev` command.

The structure of the generated project is as follows. The src-tauri directory is the Rust project directory.

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

### Installing clang

Since r2r depends on clang, please install it with the following command.

```shell
sudo apt install clang
```

### Downloading Necessary Files from r2r_minimal_node Sample Code

Download the following files from the [r2r_minimal_node](https://github.com/m-dahl/r2r_minimal_node/tree/master/r2r_minimal_node) repository, where r2r sample code is placed, and place them in ./src-tauri/.

- r2r_cargo.cmake
  - A CMake script for building Rust projects through the Colcon build tool used in ROS2.
  - The cargo build command is executed with the --profile colcon option specified. The colcon profile is defined later in Cargo.toml.
- dummy.c
  - An empty file. It is used to set up a dummy C executable file in r2r_cargo.cmake to retrieve library paths and dependency information.
- package.xml
  - A definition file for ROS2 package metadata.
  - Edit and use the one from the r2r_minimal_node repository.
- CMakeLists.txt
  - A CMake configuration file created for ROS2 projects. It includes r2r_cargo.cmake.
  - Edit and use the one from the r2r_minimal_node repository.

Execute the following commands in sequence to download them.

```shell
curl -o ./src-tauri/r2r_cargo.cmake https://raw.githubusercontent.com/m-dahl/r2r_minimal_node/master/r2r_minimal_node/r2r_cargo.cmake
curl -o ./src-tauri/dummy.c https://raw.githubusercontent.com/m-dahl/r2r_minimal_node/master/r2r_minimal_node/dummy.c
curl -o ./src-tauri/package.xml https://raw.githubusercontent.com/m-dahl/r2r_minimal_node/master/r2r_minimal_node/package.xml
curl -o ./src-tauri/CMakeLists.txt https://raw.githubusercontent.com/m-dahl/r2r_minimal_node/master/r2r_minimal_node/CMakeLists.txt
```

### Editing package.xml

Edit the tags from name to author in package.xml to match your project. Dependencies for custom messages (r2r_minimal_node_msgs) are set, but we will not use them this time, so remove them.

The edited file content is as follows.

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

### Editing CMakeLists.txt

Edit the project name set in CMakeLists.txt. There are settings for dependencies on r2r_minimal_node_msgs, so remove them as well.

The edited file content is as follows.

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

### Editing Cargo.toml

Edit the ./src-tauri/Cargo.toml in your project.

Add the following similarly to r2r_minimal_node's [sample code](https://github.com/m-dahl/r2r_minimal_node/blob/0.8.2/r2r_minimal_node/Cargo.toml#L10).

```shell
# We use a custom profile to keep colcon
# separate from "normal" rust building.
[profile.colcon]
inherits = "release"
```

This defines a custom profile called by the cargo build command from r2r_cargo.cmake. It only inherits settings for release builds, so the following commands are equivalent:

- cargo build --profile=colcon
- cargo build --release

By explicitly defining the colcon profile, you can clearly distinguish between builds for the ROS2 build system and regular Rust builds.

Next, edit the dependencies section and add the following dependencies:

```shell
[dependencies]
tauri = { version = "1.5", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
r2r = "0.8.2" # added
futures = "0.3.15" # added
tokio = { version = "1", features = ["full"] } # added
```

### Adding ROS2 Node Startup Process to main.rs

Add the following ROS2 node startup process to ./src-tauri/src/main.rs, which was generated by the `yarn create tauri-app` command. The node name is set as web_ui.

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
    // Added ▽▽▽
    let ctx = r2r::Context::create().unwrap();
    let mut node = r2r::Node::create(ctx, "web_ui", "").unwrap();
    std::thread::spawn(move || loop {
        node.spin_once(std::time::Duration::from_millis(100));
    });
    // Added △△△

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

In the [sample code](https://github.com/m-dahl/r2r_minimal_node/blob/0.8.2/r2r_minimal_node/src/main.rs#L47) of r2r_minimal_node, node.spin_once is called in the main thread to implement the main loop for ROS2 messages. Since Tauri monopolizes the main thread for inter-process communication with WebView, we call node.spin_once on a separate thread this time.

### colcon build

At this point, the minimum necessary incorporation of the ROS2 client into the Tauri project is complete. Let's try building with the `colcon build` command. The first build may take several minutes depending on the build environment.

If the output shows "Summary: 1 package finished" as below, it is successful.

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
   ...(omit)
   Compiling gdk v0.15.4
   Compiling webkit2gtk v0.18.2
    Finished colcon [optimized] target(s) in 2m 00s
---
Finished <<< ros2-tauri [2min 3s]

Summary: 1 package finished [2min 3s]
  1 package had stderr output: ros2-tauri
```

### Confirming ROS2 Node Startup

After launching the app, display the list of nodes in a separate terminal. If the /web_ui node is running, it's OK.

- Terminal 1

  ```shell
  $ yarn tauri dev
  ```

- Terminal 2

  ```shell
  $ ros2 node list
  /web_ui
  ```

Hot reloading is also enabled just like in a regular Tauri project. While the app is running, try adding log output to main.rs.

```rust
// main.rs

let ctx = r2r::Context::create().unwrap();
let mut node = r2r::Node::create(ctx, "web_ui", "").unwrap();
std::thread::spawn(move || loop {
    node.spin_once(std::time::Duration::from_millis(100));
});

// Added ▽▽▽
r2r::log_debug!("web_ui", "debug message");
r2r::log_info!("web_ui", "info message");
r2r::log_warn!("web_ui", "warn message");
r2r::log_error!("web_ui", "error message");
r2r::log_fatal!("web_ui", "fatal message");
// Added △△△

tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

When you edit and save main.rs, the app automatically recompiles and restarts, and the following logs are output to Terminal 1 (debug logs are not output to the console by default, which is the expected behavior).

```shell
[INFO] [1704573791.462327908] [web_ui]: info message
[WARN] [1704573791.462473867] [web_ui]: warn message
[ERROR] [1704573791.462511982] [web_ui]: error message
[FATAL] [1704573791.462517330] [web_ui]: fatal message
```

### Publishing a Topic When a Button is Pressed

The screen created by `yarn create tauri-app` includes a textbox and a button. Let's modify it so that when the button is pressed, a topic with the input value from the textbox is published.

![UI Image](/img/robotics/ros/ros2-tauri-ui-001.png)

Calls from WebView to the Core process use Tauri's command,mechanism. Here, a command handler named `button_pushed` defined in the Core process is called when the button is pressed.

[^3]: For more information about Tauri's commands, see [Guides / Features / Calling Rust from the frontend](https://tauri.app/v1/guides/features/command/).

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

// Button press command handler
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

    // Create a publisher to publish the topic named "operation"
    // The message type of the topic is String
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
        // Register the publisher as a shared resource for reference in the command handler
        .manage(pub_operation)
        .invoke_handler(tauri::generate_handler![button_pushed])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

In the main function, the publisher created needs to be referenced in the command handler, so it is registered as a shared resource using `tauri::Builder::default().manage`. The resource to be registered needs to be thread-safe, so it is wrapped in `Arc<Mutex<T>>`. The command handler function can access it through `tauri::State` wrapped in the argument.

In Terminal 2, execute the following command and confirm that the topic is published when the button is pressed. The following is the execution result when the text "hello" is entered in the textbox and the button is pressed.

- Terminal 2

  ```shell
  $ ros2 topic echo /operation
  data: hello
  ---
  ```

### Using Multiple Publishers for the Same Message Type

If you need to use multiple topics of the same message type, some adjustments are necessary.

For example, trying to run the following code with `yarn tauri dev` will result in a panic.

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

  // Added call to the handler for the newly added button press
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
        {/* Added button */}
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

// Added command handler for button press
// button1_pushed and this function have the same signature!!!
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
        // pub_operation2 has the same type as pub_operation1!!!
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

Since pub_operation1 and pub_operation2 are of the same type, they cannot be registered separately with `tauri::Builder::default().manage`. In this case, you can handle it by defining a type that holds both pub_operation1 and pub_operation2 and registering it, as shown below.

```rust
// main.rs

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};

// Define a type to hold each publisher
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

### Subscribing to a Topic to Toggle Button Disabled State

Let's subscribe to a std_msgs::msg::Bool type topic and toggle the disabled state of a button based on the received value.

Core process to WebView calls use Tauri's event[^4] mechanism. Here, an event named `operation-enabled-updated` defined in the Core process is notified to WebView when a topic is received.

[^4]: For more information about Tauri's events, see [Guides / Features / Events](https://tauri.app/v1/guides/features/events).

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

  // Add a callback for the operation-enabled-updated event
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
          // Toggle disabled based on the operation-enabled-updated event
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

Since receiving messages is asynchronous, we use the [Tokio](https://docs.rs/tokio/latest/tokio/) crate, similar to [r2r_minimal_node](https://github.com/m-dahl/r2r_minimal_node/blob/0.8.2/r2r_minimal_node/src/main.rs).

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

    // Add subscription for the operation_enabled topic
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
            // App handle for notifying WebView via events
            // Moved to tokio::spawn block to use for notification on message reception
            let app_handle = app.handle();

            tokio::spawn(async move {
                // Notify WebView with operation-enabled-updated event when operation_enabled topic messages are received
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

In Terminal 2, execute the following commands in sequence and confirm that the button's disabled state toggles.

- Terminal 2

  ```shell
  $ ros2 topic pub /operation_enabled std_msgs/msg/Bool "data: false" --once
  publisher: beginning loop
  publishing #1: std_msgs.msg.Bool(data=False)

  $ ros2 topic pub /operation_enabled std_msgs/msg/Bool "data: true" --once
  publisher: beginning loop
  publishing #1: std_msgs.msg.Bool(data=True)
  ```

## Summary

This article did not touch on other communication methods in ROS2, such as services and actions, but I hope to introduce them in more detail in future articles.

Traditionally, UI development in our company's robot system development has been mainly conducted using Qt. The introduction of Tauri allows us to utilize a wide range of web libraries, which is expected to improve development efficiency and flexibility. We plan to continue using Tauri as a powerful option for UI development.

:::info
If only using web libraries, Electron is also an option, but the large binary size due to the Chromium engine and Node.js runtime is a challenge. In this regard, Tauri is a more advantageous choice due to its smaller binary size and lower memory usage (see [References / Benchmarks](https://tauri.app/v1/references/benchmarks/)).
:::

:::info
When using Qt, you need to choose between a paid commercial license for product development or a free LGPL version. In contrast, Tauri offers the advantage of a lower barrier to entry in terms of licensing.

:::

Moreover, in the current robot system development, the use of Rust is limited to bridging ROS2 communication data to WebView. However, Rust's memory safety and high performance are suitable for embedded apps, and we are considering expanding its application to other areas such as robot control and image processing in the future.
