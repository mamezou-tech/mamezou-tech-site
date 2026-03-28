---
title: 食品摆盘机器人「美膳®」开发幕后——连接 UI 与核心的 gRPC 与实时通信机制
author: yuki-terada
tags:
  - ロボット
  - 美膳
  - Bizen
  - gRPC
  - gui
  - Flutter
date: 2026-03-23T00:00:00.000Z
image: true
translate: true

---

# 引言

机器人和制造设备的软件中，用户界面与设备控制逻辑的设计至关重要。特别是设备的操作面板，既要清晰地显示设备状态，又要提供可以安全操作的界面。

食品摆盘机器人「美膳®」是一款针对制造现场终端用户使用而设计的机器人系统。美膳®本体配备了用于操作系统的专用操作面板。

![美膳®整体与操作面板](/img/robotics/bizen/bizen_overview.png)

本文以美膳®的 UI 设计为例，介绍以下内容：

* 设备 UI 的软件架构  
* 基于 Flutter 的 GUI 实现  
* 基于 gRPC 的组件间通信  
* 基于双向流的实时通信  

---

# 美膳®的软件架构

美膳®的软件由多个按职责分离的组件构成。各组件拥有明确的职能，从而提高了整个系统的可维护性和可扩展性。

主要组件有以下三部分：

* **GUI 应用程序**  
  这是作为用户操作入口的应用程序。它负责设备状态显示和操作输入，不直接访问核心逻辑，所有操作都必须通过 API 进行。

* **控制器 API**  
  这是将控制器应用程序的功能与状态对外公开的接口层。GUI 等外部应用程序通过此 API 访问设备功能。

* **控制器应用程序**  
  这是美膳®的核心组件，负责设备状态控制、注册数据管理、图像处理等。

系统结构如下图所示：

![美膳®系统结构](/img/robotics/bizen/bizen_system_diagram.png)

如此一来，GUI 应用程序并不是直接访问控制器应用程序，而是通过 API 进行通信。这样可以使 UI 与核心逻辑独立开展开发与维护。

---

# 组件间通信

在美膳®中，GUI 应用程序与控制器应用程序之间的通信采用了 **gRPC**。控制器 API 使用 gRPC 实现，控制器应用程序作为 gRPC 服务器运行。GUI 应用程序则作为 gRPC 客户端进行连接，并使用各种服务。

通过这种架构，可以在不依赖语言或实现的情况下连接 UI 和控制逻辑。

:::info
控制器 API 通过接口定义语言（Protocol Buffers）定义公开接口，并转换为服务器端/客户端各自的编程语言使用。
:::

通信主要用于以下三种场景：

## 系统状态通知

GUI 应用程序在与服务器连接期间会持续接收系统状态更新。这是通过 **服务器端流式 RPC** 实现的。随着控制器状态的变化，GUI 的显示会被更新，从而使设备状态与 UI 始终保持同步。

## 服务请求

由用户操作触发的单次处理请求通过 **Unary RPC** 来实现。GUI 应用程序发送请求后，服务器会返回处理结果。

## 同步会话

对于需要实时性的操作，使用 **双向流式 RPC**。由于客户端和服务器可以同时发送消息，因此能够实现实时通信会话。

例如可用于以下场景：

* 一边查看摄像头画面一边调整参数  
* 启动运行前的确认操作  
* 机器人状态监控  

通信流程如下图所示：

![美膳®组件间通信序列](/img/robotics/bizen/bizen_communication_sequence.png)

---

# 技术概述

## 关于 Flutter

美膳® 的 GUI 应用程序使用了 Google 提供的 UI 框架 **Flutter** 进行实现。Flutter 使用 Dart 语言来开发应用程序。

Flutter 是一个跨平台框架，可以从单一的代码库生成面向多个操作系统的应用程序。此外，Flutter 提供了丰富的 UI 组件，使得像操作面板这样的 GUI 开发能够高效进行。

另外，Flutter 与 Google 提供的其他技术具有很高的兼容性，这也是其特点之一。

## 关于 gRPC

gRPC 是 Google 开发的开源 RPC（Remote Procedure Call）框架。在 gRPC 中，使用 **Protocol Buffers（Protobuf）** 来定义 API，并能高速地进行数据序列化。

通过在 Protobuf 中定义 API，可以使多个编程语言使用相同的接口。因此，可以轻松地将使用 Flutter（Dart）实现的 GUI 与使用 C++ 实现的控制器应用程序等不同语言的系统连接起来。

is 在过去的机器人开发项目中也有使用 gRPC 的经验。

---

# 示例应用程序

## 基于双向流的实时通信

gRPC 的双向流式通信是一种允许客户端和服务器同时发送消息的通信方式。利用此机制，可以实现高实时性的 UI 操作。

在此，我们通过一个基于 Flutter 和 gRPC 的简单示例应用程序，介绍双向流式实时通信的机制。

在实际的美膳® 中，Flutter 实现的 UI 与 C++ 实现的核心应用进行通信，但这里为了便于理解，将创建一个使用 Dart 实现服务器和客户端的示例。

在此示例中，服务器将管理一个共享计数器，并创建一个应用程序，让多个客户端可以发送对计数器的更新操作。客户端发送的操作会在服务器端处理，并将结果实时推送给所有已连接的客户端。

接下来介绍该示例应用程序的实现步骤。

## 目录结构

在本示例中，将多个项目汇总到工作目录 `Examples` 中。（请在任意位置创建 `Examples` 目录）

即将创建的目录结构如下所示。

``` plain
Examples/
|
+-- counter_server/
|     服务器程序的项目目录
|
+-- counter_client/
|     客户端程序的项目目录
|
+-- counter_api/
      存放 gRPC 使用的 API 定义
```

:::info
本示例在以下环境中进行创建及运行验证：
* OS: Ubuntu 22.04 LTS
* Flutter: 3.24.2 / Dart: 3.5.2
:::

## 使用 gRPC 定义 API

首先使用 Protocol Buffer 定义客户端与服务器之间使用的 API。

在终端进入 `Examples` 目录后，执行以下命令：

``` bash
mkdir counter_api
cd counter_api
touch counter_api.proto
```

用编辑器打开 `counter.proto`，定义 gRPC 的消息和服务并保存。

``` protobuf
syntax = "proto3";

package counter_api;

/// 计数器服务定义
service CounterService {
  /// 双向流式通信
  /// 客户端发送操作
  /// 服务器将最新计数值以流的方式返回
  rpc SyncCounter(stream CounterRequest) returns (stream CounterResponse);
}

/// 客户端发送的操作请求
message CounterRequest {
  string client_id = 1;   // 客户端标识符

  oneof action {
    Increment increment = 2;
    Decrement decrement = 3;
    Reset reset = 4;
  }
}

/// +1 操作
message Increment {
  int32 amount = 1; // 通常为 1
}

/// -1 操作
message Decrement {
  int32 amount = 1; // 通常为 1
}

/// 重置操作
message Reset {}

/// 服务器推送的当前状态
message CounterResponse {
  int32 current_value = 1;   // 当前计数值
  string updated_by = 2;     // 更新的客户端 ID
  int64 timestamp = 3;       // 更新时间（Unix ms）
}
```

## 创建服务器端 Dart 项目

在 `Examples` 目录下通过终端执行以下命令：

``` bash
dart create counter_server
cd counter_server
```

接着，将先前定义的 `counter_api.proto` 编译，并将自动生成的代码添加到 counter_server 的源代码中。

``` bash
dart pub global activate protoc_plugin 21.1.2  # <-- 安装 protoc_plugin
export PATH="$PATH":"$HOME/.pub-cache/bin"  # <-- 临时添加 Protocol Buffers 编译器 (protoc) 的 PATH
mkdir -p lib/src/generated
protoc --dart_out=grpc:lib/src/generated -I../counter_api counter_api.proto # <-- 编译 counter_api.proto
```

若成功编译 counter.proto，将会在 `Examples/counter_server/lib/src/` 生成以下文件：

``` plain
Examples/counter_server/lib/src/generated
|
+-- counter_api.pb.dart
|     消息类型的主体定义
|
+-- counter_api.pbenum.dart
|     枚举定义（此次不使用）
|
+-- counter_api.pbgrpc.dart
|     用于 gRPC 服务的代码
|
+-- counter_api.pbjson.dart
      JSON 用元数据（此次不使用）
```

编辑 `counter_server/pubspec.yaml` 进行项目设置。

``` yaml
name: counter_server
description: "gRPC bidirectional streaming counter server"
version: 1.0.0

environment:
  sdk: ^3.5.2

dependencies:
  grpc: ^3.2.4
  protobuf: ^3.1.0
  protoc_plugin: ^21.1.2
  fixnum: ^1.1.1

dev_dependencies:
  lints: ^4.0.0
  test: ^1.24.0
```

编辑 `counter_server/lib/counter_server.dart`，实现服务器。

``` dart
import 'dart:async';
import 'package:grpc/grpc.dart';
import 'package:fixnum/fixnum.dart';

import 'src/generated/counter_api.pb.dart';
import 'src/generated/counter_api.pbgrpc.dart';

class CounterServiceImpl extends CounterServiceBase {
  int _currentValue = 0;

  // 用于向已连接的客户端分发信息的控制器列表
  final List<StreamController<CounterResponse>> _clients = [];

  @override
  Stream<CounterResponse> syncCounter(
      ServiceCall call, Stream<CounterRequest> requestStream) {
    final controller = StreamController<CounterResponse>();

    _clients.add(controller);

    print("Client connected");

    // 连接后立即发送当前值
    controller.add(_createResponse("server"));

    requestStream.listen(
      (request) {
        _handleRequest(request);
      },
      onDone: () {
        print("Client disconnected");
        _clients.remove(controller);
        controller.close();
      },
      onError: (e) {
        print("Stream error: $e");
        _clients.remove(controller);
        controller.close();
      },
    );

    return controller.stream;
  }

  void _handleRequest(CounterRequest request) {
    if (request.hasIncrement()) {
      _currentValue += request.increment.amount;
      _broadcast(request.clientId);
    } else if (request.hasDecrement()) {
      _currentValue -= request.decrement.amount;
      _broadcast(request.clientId);
    } else if (request.hasReset()) {
      _currentValue = 0;
      _broadcast(request.clientId);
    }
  }

  void _broadcast(String updatedBy) {
    final response = _createResponse(updatedBy);

    print("Broadcast: $_currentValue (by $updatedBy)");

    for (final client in _clients) {
      client.add(response);
    }
  }

  CounterResponse _createResponse(String updatedBy) {
    return CounterResponse()
      ..currentValue = _currentValue
      ..updatedBy = updatedBy
      ..timestamp = Int64(DateTime.now().millisecondsSinceEpoch);
  }
}

Future<void> main() async {
  final server = Server.create(
    services: [CounterServiceImpl()],
    interceptors: const <Interceptor>[],
  );

  await server.serve(port: 50051);
  print('Counter Server listening on port ${server.port}');
}
```

## 创建客户端 Flutter 项目

在 `Examples` 目录通过终端执行以下命令：

``` bash
flutter create counter_client
cd counter_client
```

然后与服务器端相同，将 `counter_api.proto` 编译并将自动生成的代码添加到 counter_server 的源代码中。

``` bash
dart pub global activate protoc_plugin 21.1.2  # <-- 安装 protoc_plugin
export PATH="$PATH":"$HOME/.pub-cache/bin"  # <-- 临时添加 Protocol Buffers 编译器 (protoc) 的 PATH
mkdir -p lib/src/generated
protoc --dart_out=grpc:lib/src/generated -I../counter_api counter_api.proto # <-- 编译 counter_api.proto
```

编辑 `counter_client/pubspec.yaml` 配置项目。

``` yaml
name: counter_client
description: "gRPC bidirectional streaming counter client"
publish_to: 'none'

version: 1.0.0+1

environment:
  sdk: ^3.5.2

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.8
  grpc: ^3.2.4
  protobuf: ^3.1.0
  uuid: ^4.4.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
```

编辑 `counter_client/lib/main.dart`，实现客户端。

``` dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:grpc/grpc.dart';
import 'package:uuid/uuid.dart';

import 'src/generated/counter_api.pb.dart';
import 'src/generated/counter_api.pbgrpc.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: CounterPage(),
    );
  }
}

class CounterPage extends StatefulWidget {
  const CounterPage({super.key});

  @override
  State<CounterPage> createState() => _CounterPageState();
}

class _CounterPageState extends State<CounterPage> {
  late ClientChannel _channel;
  late CounterServiceClient _stub;
  late StreamController<CounterRequest> _requestController;
  Stream<CounterResponse>? _responseStream;

  final String _clientId = const Uuid().v4();
  int _currentValue = 0;
  String _lastUpdatedBy = "-";

  @override
  void initState() {
    super.initState();
    _initGrpc();
  }

  void _initGrpc() {
    _channel = ClientChannel(
      'localhost', // 服务器地址
      port: 50051,
      options: const ChannelOptions(
        credentials: ChannelCredentials.insecure(),
      ),
    );

    _stub = CounterServiceClient(_channel);

    _requestController = StreamController<CounterRequest>();

    _responseStream = _stub.syncCounter(_requestController.stream);

    _responseStream!.listen((response) {
      setState(() {
        _currentValue = response.currentValue;
        _lastUpdatedBy = response.updatedBy;
      });
    });
  }

  void _sendIncrement() {
    final request = CounterRequest(
      clientId: _clientId,
      increment: Increment()..amount = 1,
    );
    _requestController.add(request);
  }

  void _sendDecrement() {
    final request = CounterRequest(
      clientId: _clientId,
      decrement: Decrement()..amount = 1,
    );
    _requestController.add(request);
  }

  void _sendReset() {
    final request = CounterRequest(
      clientId: _clientId,
      reset: Reset(),
    );
    _requestController.add(request);
  }

  @override
  void dispose() {
    _requestController.close();
    _channel.shutdown();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isMe = _lastUpdatedBy == _clientId;

    return Scaffold(
      appBar: AppBar(
        title: const Text("gRPC 双向流式计数器"),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              '当前值',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Text(
              '$_currentValue',
              style: const TextStyle(
                fontSize: 60,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              '最后更新: ${isMe ? "自己" : _lastUpdatedBy}',
            ),
            const SizedBox(height: 40),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton(
                  onPressed: _sendIncrement,
                  child: const Text("+1"),
                ),
                const SizedBox(width: 20),
                ElevatedButton(
                  onPressed: _sendDecrement,
                  child: const Text("-1"),
                ),
                const SizedBox(width: 20),
                ElevatedButton(
                  onPressed: _sendReset,
                  child: const Text("Reset"),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
```

## 运行示例程序

在此运行所创建的示例程序，并验证基于 gRPC 双向流式通信的客户端间状态同步。

在此示例中，多个客户端将连接到同一个服务器，并实时共享计数器状态。

服务器实现为在 `localhost:50051` 端口监听。  
因此，假设服务器和客户端在同一台机器上运行。

按以下顺序启动服务器和客户端：

### 1. 服务器端

在终端进入 `counter_server` 项目目录，运行 Dart 程序。

```bash
cd counter_server
dart run
```

服务器启动后，将显示如下日志：

```bash
Counter Server listening on port 50051
```

此时，服务器开始接受客户端连接。

### 2. 客户端

打开另一个终端，在 `counter_client` 项目目录运行 Flutter 应用。

```bash
cd counter_client
flutter run
```

客户端应用启动后，会自动通过 gRPC 连接到服务器。

## 运行结果

点击客户端的 **[+1]** / **[-1]** 按钮时，操作内容将通过双向流式 RPC 发送到服务器。  
服务器更新计数器状态后，通过流式将结果推送给所有已连接的客户端。  
客户端根据接收到的状态更新界面显示。

![计数器客户端](/img/robotics/bizen/example_program/counter_client_a.png)

上图显示了将计数增至「2」的客户端状态（以下称其为“**客户端A**”）。  
在界面底部的 **[最后更新]** 中，会显示最后更新计数器的客户端。  
由于此时是客户端A 自行更新，因此显示为“自己”。

接着，打开另一个终端，启动第二个客户端。  
将其称为“**客户端B**”。

![计数器客户端](/img/robotics/bizen/example_program/counter_client_b.png)

客户端B 也订阅了来自服务器的状态流，因此显示了当前计数值「2」。  
但 **[最后更新]** 中显示的是进行更新的客户端A 的标识。

在此状态下，当客户端B 更新计数器时，将出现以下行为：

1. 客户端B 发送更新操作  
2. 服务器更新计数器值  
3. 服务器将状态更新推送给所有客户端  
4. 客户端A 和客户端B 的界面同时更新  

结果为：  
* 在客户端B 中 **[最后更新] = 自己**  
* 在客户端A 中 **[最后更新] = 客户端B 的 ID**  

如此即可确认多个客户端实时共享相同状态。

## 思考

在本示例中，通过使用双向流式 RPC 实现了客户端与服务器之间的通信。  
然而，仅就此计数器示例而言，并不一定需要使用双向流式通信。例如，通过以下结构同样可以实现相同的功能：

* 计数器更新  
  → Unary RPC  
* 状态更新通知  
  → Server Streaming RPC  

但是，在实际的设备软件中，经常会出现以下需求：  
* 实时发送操作输入  
* 持续接收摄像头画面等数据  
* 在同一个会话中同步操作与状态更新  

在这种情况下，客户端与服务器能够同时进行数据收发的 **双向流式 RPC** 非常有效。

在美膳系统中，利用此机制实现了以下操作：  
* 一边查看摄像头画面一边调整参数  
* 机器人操作确认会话  
* UI 与设备状态的实时同步  

通过使用双向流式通信，可以在保持实时性的同时实现复杂的操作会话。

---

# 总结

本文介绍了食品摆盘机器人「美膳®」的 UI 架构及其实现技术概述。

美膳® 采用了将用户界面与机器人控制逻辑明确分离的架构。GUI 应用程序由 Flutter 实现，并与控制器应用程序通过 gRPC 进行通信。

通过这种构架，可以将 UI 与控制逻辑独立进行开发与维护，从而提高设备软件的可维护性与可扩展性。

此外，利用 gRPC 的流式功能，可以灵活地实现设备状态通知、实时操作会话等不同用途的通信模型。

美膳® 软件设计的要点如下：

1. **分离 UI 与控制逻辑**  
   将 GUI 应用程序与控制器应用程序作为独立组件进行构建，明确各自职责，从而简化开发与维护。  
2. **通过 API 进行组件连接**  
   将控制器应用程序的功能以 API 形式对外公开，安全地控制 UI 的访问，并明晰系统边界。  
3. **面向多语言环境的通信基础**  
   采用 gRPC 与 Protocol Buffers 作为通信基础，以连接由 Flutter（Dart）和 C++ 两种不同语言实现的应用程序。  
4. **基于流式通信的实时同步**  
   高效实现系统状态分发和操作会话等设备 UI 所需的实时通信。  

在机器人和设备的软件中，UI、通信、控制逻辑等多个要素紧密相关。本文介绍的架构只是其中的一个示例，但希望能为设备软件的设计提供参考。
