---
title: 与 AI 一起开始 AWS 开发 ― Q Developer 入门
author: shuichi-takatsu
date: 2025-11-12T00:00:00.000Z
tags:
  - Q Developer
  - 仕様駆動
  - AWS
  - 生成AI
image: true
translate: true

---

## 什么是 Q Developer

Q Developer 是 AWS 提供的**基于生成式 AI 的开发辅助工具**。  
它不同于 ChatGPT 或 Copilot 那样“补全代码的 AI”，而是作为一个**支持从设计、实现、测试、审查到文档化的一体化开发平台**而设计。

一句话概括其特点：**这是一个可以与 AI 一起推进 AWS 开发的集成环境**。

### 主要功能和特点

| 项目 | 概述 |
|------|------|
| **自然语言的开发支持** | 可以使用自然语言指令，例如“创建 Lambda 函数”“与 DynamoDB 集成” |
| **代码生成与补全** | 支持 Python、TypeScript、Java 等主要语言 |
| **测试代码自动生成** | 从现有代码推断并自动生成测试 |
| **审查与改进建议** | AI 自动审查代码质量、异常处理、命名规范等 |
| **AWS 集成** | 可直接处理 Lambda / API Gateway / DynamoDB / CDK 等 AWS 资源 |
| **与 VS Code 集成** | 可以通过扩展功能在内联中向 AI 发出指令、生成和修正 |

### CLI 与 VS Code 两种使用方式

Q Developer 提供了两种使用风格。

| 样式 | 概述 | 命令示例 |
|-----------|------|------------|
| **CLI（命令行）** | 在终端上直接向 AI 发出指令 | `$ q generate lambda --name hello-world` |
| **VS Code 扩展** | 在编辑器内输入自然语言提示，进行代码生成和修正 | 在命令面板中选择 “Q Developer: Generate Code” |

如果使用了 Pro 版，就可以从 CLI 和 VS Code 两者直接操作 AWS 服务。

### “Q”的由来与目的

“Q” 同时代表 **“Quality（质量）” 和 “Question（问题）”**。  
该工具的理念不是“由 AI 写代码”，而是**开发者与 AI 对话中共同打磨质量**的协同开发。  
因此，Q Developer 不仅仅是一个辅助工具，而是**从设计评审到实现和改进的一站式支持的“AI 开发伙伴”**。  

这次主要使用 Q CLI 来创建一个简单的应用程序。

## 1. Q Developer CLI 概述

**CLI（命令行界面）** 支持高级操作。  
在 CLI 中，不仅可以在终端与 AI 交互（交互模式），还可以通过以下命令进行自动化处理和集成。

| 功能 | 说明 |
|------|------|
| **代码生成** | AI 生成 Lambda、API Gateway、CDK 配置等 |
| **审查** | 分析现有代码质量并提出改进方案 |
| **修正与再生成** | AI 自动修复问题部分 |
| **测试生成** | 自动生成并运行单元测试代码 |
| **文档化** | 自动输出 README 和设计文档 |

### 操作确认示例

如果显示如下内容，则环境已正确配置。  
虽然可以在命令行中一切完成，但考虑到首次尝试，**今后将全部以对话形式的交互模式来执行**。

```bash
$ q --version
q 1.13.0

$ q help
# 显示可用的子命令列表
# generate / review / test / fix / metrics / deploy 等
```

---

## 2. 启动 Q CLI 及交互模式

执行以下命令 `q`：

```bashqq
$ q
```

将显示如下界面：

```

    ⢠⣶⣶⣦⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀        ⢀⣤⣶⣿⣿⣿⣶⣦⡀⠀
 ⠀⠀⠀⣾⡿⢻⣿⡆⠀⠀⠀⢀⣄⡄⢀⣠⣤⣤⡀⢀⣠⣤⣤⡀⠀⠀⣠⣤⣤⣤⣄⠀⠀⢀⣤⣤⣤⣤⣤⣤⡀⠀⠀⣀⣤⣤⣤⣀⠀⠀ ⠀⢠⣤⡀⣀⣤⣤⣄⡀⠀⠀⠀⠀⠀⠀⢠⣿⣿⠋⠀⠀⠀⠙⣿⣿⡆
 ⠀⠀⣼⣿⠇⠀⣿⣿⡄⠀⠀⢸⣿⣿⠛⠉⠻⣿⣿⠛⠉⠛⣿⣿⠀⠀⠛⠉⠉⠻⣿⣧⠀⠈⠛⠛⠛⣻⣿⡿⠀⢀⣾⣿⠛⠉⠻⣿⣷⡀⠀ ⢸⣿⡟⠛⠉⢻⣿⣷⠀⠀⠀⠀⠀⣼⣿⡏⠀⠀⠀⠀⠀ ⢸⣿⣿
 ⠀⢰⣿⣿⣤⣤⣼⣿⣷⠀⠀⢸⣿⣿⠀⠀⠀⣿⣿⠀⠀⠀⣿⣿⠀⠀⢀⣴⣶⣶⣶⣿⣿⠀⠀⠀⣠⣾⡿⠋⠀⠀⢸⣿⣿⠀⠀⠀ ⣿⣿⡇⠀⢸⣿⡇⠀⠀⢸⣿⣿⠀⠀⠀⠀⠀⠀⢹⣿⣇⠀⠀⠀⠀ ⠀⢸⣿⡿
 ⢀⣿⣿⠋⠉⠉⠉⢻⣿⣇⠀⢸⣿⣿⠀⠀⠀⣿⣿⠀⠀⠀⣿⣿⠀⠀⣿⣿⡀⠀⣠⣿⣿⠀⢀⣴⣿⣋⣀⣀⣀⡀⠘⣿⣿⣄⣀⣠⣿⣿⠃⠀⢸⣿⡇⠀⠀⢸⣿⣿⠀⠀⠀⠀⠀⠀⠈⢿⣿⣦⣀⣀⣀⣴⣿⡿⠃
 ⠚⠛⠋⠀⠀⠀⠀ ⠘⠛⠛⠀⠘⠛⠛⠀⠀⠀⠛⠛⠀⠀⠀⠛⠛⠀⠀⠙⠻⠿⠟⠋⠛⠛⠀⠘⠛⠛⠛⠛⠛⠛⠃⠀⠈⠛⠿⠿⠿⠛⠁⠀⠀⠘⠛⠃⠀ ⠘⠛⠛⠀⠀⠀⠀⠀⠀⠀⠀⠙⠛⠿⢿⣿⣿⣋⠀⠀
 ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀ ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀　　　　　⠈⠛⠿⢿⡧

╭─────────────────────────────── Did you know? ────────────────────────────────╮
│                                                                              │
│    If you want to file an issue to the Q CLI team, just tell me, or run q    │
│                                    issue                                     │
│                                                                              │
╰──────────────────────────────────────────────────────────────────────────────╯

/help all commands  •  ctrl + j new lines  •  ctrl + s fuzzy search
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 You are chatting with claude-4-sonnet
```

此状态即为“**交互模式**”。  
可以直接用自然语言对话，与 AI 一起推进设计与实现。

### 对话示例

输入以下内容：
```
> 创建一个将数据保存到 DynamoDB 的 Lambda 函数
```
响应如下：
```
> 创建一个将数据保存到 DynamoDB 的 Lambda 函数。

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: /home/ubuntu/q/lambda_dynamodb_jp.py

+     1: import json
+     2: import boto3
+     3:
+     4: dynamodb = boto3.resource('dynamodb')
+     5: table = dynamodb.Table('your-table-name')
+     6:
+     7: def lambda_handler(event, context):
+     8:     try:
+     9:         # 输入数据验证
+    10:         if not event or not isinstance(event, dict):
+    11:             return {
+    12:                 'statusCode': 400,
+    13:                 'body': json.dumps('无效的输入：事件必须是非空对象', ensure_ascii=False)
+    14:             }
+    15:
+    16:         # 将数据保存到 DynamoDB
+    17:         table.put_item(Item=event)
+    18:
+    19:         return {
+    20:             'statusCode': 200,
+    21:             'body': json.dumps('数据已成功保存', ensure_ascii=False)
+    22:         }
+    23:     except Exception as e:
+    24:         return {
+    25:             'statusCode': 500,
+    26:             'body': json.dumps(f'错误：{str(e)}', ensure_ascii=False)
+    27:         }

 ⋮
 ↳ Purpose: 创建一个将数据保存到 DynamoDB 的 Lambda 函数
Creating: /home/ubuntu/q/lambda_dynamodb_jp.py

 ⋮
 ● Completed in 0.1s


> 已创建 Lambda 函数。主要功能：

• 使用 boto3 与 DynamoDB 集成  
• 验证事件数据输入  
• 将数据保存到 DynamoDB 表  
• 日语错误消息  
• 返回适当的 HTTP 状态码  

使用方法：  
1. 将 'your-table-name' 更改为实际的 DynamoDB 表名  
2. 授予 Lambda 执行角色 dynamodb:PutItem 权限  
3. 该函数会将事件中传递的 JSON 数据保存到 DynamoDB  
```

---

## 3. 通过对话推进的程序开发体验

介绍使用 Q Developer CLI（`q`）与 AI 以自然语言对话，共同创建一个简单的应用程序（这里为“俄罗斯方块”游戏）的流程。

```bash
$ q
🤖 You are chatting with claude-4-sonnet
```

### 3.1 场景设定

此次创建的 俄罗斯方块 的要求如下：  
- ①：具备常规俄罗斯方块拥有的所有操作  
- ②：使用动物图标（例如猫），而非普通方块  
- ③：猫图标的表情不固定，当方块堆叠高度不同时，变换表情  
- ④：将存储位置设置为 AWS S3，并配置为可全球访问  

### 3.2 开始与 Q Developer 对话

指令：（概要 + 详细说明（以上需求的①和②））
```
请创建一个俄罗斯方块游戏。
请实现普通的俄罗斯方块功能（方块旋转、定位、下落等）。
请使用猫的图标图片而非普通方块（图像选择交由您决定）。
```
响应：
```
> 创建一个使用猫图标的俄罗斯方块游戏：

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: /home/ubuntu/q/cat-tetris.html

+      1: <!DOCTYPE html>
+      2: <html>
+      3: <head>
+      4:     <meta charset="UTF-8">
+      5:     <title>猫テトリス</title>
+      6:     <style>
+      7:         body { margin: 0; padding: 20px; background: #222; color: white; font-family: Arial; text-align: center; }
+      8:         canvas { border: 2px solid #fff; background: #000; }
+      9:         .score { font-size: 20px; margin: 10px; }
+     10:         .controls { margin: 10px; font-size: 14px; }
+     11:     </style>
+     12: </head>

～～～（省略）～～～

+    239:         // Start game
+    240:         updateScore();
+    241:         requestAnimationFrame(gameLoop);
+    242:     </script>
+    243: </body>
+    244: </html>

 ⋮
 ↳ Purpose: Create cat tetris game with standard tetris features
Creating: /home/ubuntu/q/cat-tetris.html

 ⋮
 ● Completed in 0.1s

> 已创建使用猫图标的俄罗斯方块游戏！

主要功能：  
• **方块旋转**：↑ 键旋转  
• **左右移动**：←→ 键移动  
• **快速下落**：↓ 键快速下落  
• **硬降**：空格键瞬间下落  
• **行消除**：当一行填满时消除  
• **得分系统**：通过消行获得得分  
• **升级**：根据得分提高下落速度  
• **猫图标**：随机使用 7 种猫表情符号  

操作方式：  
• ←→ 键：左右移动  
• ↓ 键：快速下落  
• ↑ 键：旋转  
• 空格键：硬降  

打开该文件即可在浏览器中游玩！
```

看来「`/home/ubuntu/q/cat-tetris.html`」是成果物。  
（由于未明确定义输出，因此 Q 随机选择了保存路径和文件名）  

我们来打开 HTML 文件看看。  
![](https://gyazo.com/0cdf5dcafccf915fa0f4b3b63b0a42ac.png)  

俄罗斯方块游戏正在运行。  
猫图标的表情各不相同，很有趣。  
但是，一开始猫就会哭，看起来没有规律。  
接下来查看猫的表情是如何变化的。  

指令：
```
> 猫图标是依据什么逻辑变化的？
```
响应：
```
> 猫图标的变化逻辑如下：

1. 在生成方块时随机决定:
javascript
this.catType = Math.floor(Math.random() * CAT_EMOJIS.length);

当新的俄罗斯方块生成时，会从 7 种猫表情符号（🐱😺😸😹😻🙀😿）中随机选择一种。

2. 整个方块使用相同的猫图标:
每个俄罗斯方块（I、O、T、S、Z、J、L）在生成时会统一使用同一种猫图标。

～～～（省略）～～～

4. 显示时的转换:
javascript
drawBlock(x, y, board[y][x] - 1);

在绘制时通过 -1 恢复到原始的猫类型索引。

也就是说：每个俄罗斯方块会随机决定一种猫图标，该方块内的所有小方块都使用相同的猫图标。不同的方块可能会使用不同的猫图标。
```

当提出问题时，会得到如下响应。  
不过随机太无聊，所以接下来会添加更多约束（详细要求）。

指令：（需求：③）
```
在游戏初期使用从容的猫表情，随着方块堆叠高度增加，请让猫呈现紧张的表情。
```
响应：
```
> 我将修改游戏逻辑，使猫的表情根据游戏状态变化：

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: cat-tetris.html

- 29    :         // 使用猫的表情符号
- 30    :         const CAT_EMOJIS = ['🐱', '😺', '😸', '😹', '😻', '🙀', '😿'];
+     29:         // 使用猫的表情符号（从容→紧张顺序）
+     30:         const CAT_EMOJIS = ['😻', '😺', '😸', '🐱', '😹', '🙀', '😿'];

～～～（省略）～～～

> 修改完成！

新的猫表情系统：

• **😻（从容）**：当方块在低位置时  
• **😺（仍然从容）**：当方块稍微堆积时  
• **😸（有些担心）**：中等高度  
• **🐱（一般）**：大约一半的高度  
• **😹（紧张）**：当方块堆积相当高时  
• **🙀（焦虑）**：处于危险高度  
• **😿（绝望）**：几乎游戏结束时  

随着方块堆积越高，猫的表情将从从容变为绝望。游戏的紧张感现在能通过猫的表情来表现了！
```
执行并确认修改效果。  
以下为运行结果：  
![](https://gyazo.com/3147fef55feda871b380d7afc7f4eb6d.png)  

可以看到，当方块堆积高度增加时，猫图标的表情会从从容变为绝望。  

不过，在稍微玩一会游戏后，发现以下 Bug：  
- 横向 4 个方块（I 型方块）按 ↑ 键无法旋转。  
- 第 2 局及以后的游戏重新开始时，开局就出现绝望或焦虑表情的猫方块。  

以下使用“日语”指令来修复 Bug。

指令：（Bug 修复请求）
```
出现了 Bug，请修复。Bug 如下：
1. 横向 4 个连接的方块按 ↑ 键无法旋转。
2. 第 2 局游戏时，开局就出现绝望或焦虑表情的猫方块。
```
响应：
```
> 我将修复 Bug：

1. 修复 I 型方块（横向 4 格）旋转 Bug：

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: cat-tetris.html

  39, 39:         const PIECES = [
  40, 40:             // I piece
- 41    :             [[[1,1,1,1]]],
+     41:             [[[1,1,1,1]], [[1],[1],[1],[1]]],

 ⋮
 ↳ Purpose: Fix I-piece rotation by adding vertical rotation state
Updating: cat-tetris.html

 ⋮
 ● Completed in 0.0s

> 2. 修复游戏重置时的棋盘初始化 Bug：

🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Searching: /home/ubuntu/q/cat-tetris.html for pattern: 游戏结束
 ✓ Found 1 matches for pattern '游戏结束' in /home/ubuntu/q/cat-tetris.html

 ⋮
 ● Completed in 0.0s

🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/q/cat-tetris.html, from line 224 to 234
 ✓ Successfully read 464 bytes from /home/ubuntu/q/cat-tetris.html
 ⋮

～～～（省略）～～～

 ⋮
 ↳ Purpose: Fix board reset to ensure proper initialization
Updating: cat-tetris.html

 ⋮
 ● Completed in 0.0s

> 修改完成！

修复内容：  
1. I 型方块旋转：添加了横向 4 格和纵向 4 格两种状态，按 ↑ 键即可旋转  
2. 游戏重置：在重置时将棋盘完全初始化为 0，并生成新的方块，因此第 2 局及以后的游戏也会从正确的从容猫表情开始  

现在 Bug 已修复，游戏应该可以正常运行了！
```

修正版的游戏再次运行：

![](https://gyazo.com/1b73821bcd500359109851d05a662a91.png)  

横向 4 格的方块也可以旋转了。  
另外，游戏重开时的猫图标也能正确显示。  

### 3.3 上传到 AWS S3

完成的俄罗斯方块应用只是一个单 HTML 文件的简单程序。  
接下来将该应用上传到 AWS S3。  
（前提是您拥有访问 AWS S3 的权限）

指令：（需求：④）
```
请将游戏上传到 AWS S3。
请创建一个新的存储桶作为上传目标。
```
响应：
```
> 我将创建新的存储桶并上传猫俄罗斯方块游戏。

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
aws s3 mb s3://cat-tetris-game-$(date +%s)
 ⋮
 ↳ Purpose: 创建新的 S3 存储桶

make_bucket: cat-tetris-game-<存储桶ID>

 ⋮
 ● Completed in 1.573s

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
aws s3 cp /home/ubuntu/cat-tetris.html s3://cat-tetris-game-<存储桶ID>/cat-tetris.html --content-type text/html
 ⋮
 ↳ Purpose: 将猫俄罗斯方块文件上传到新的存储桶

upload: ./cat-tetris.html to s3://cat-tetris-game-<存储桶ID>/cat-tetris.html

 ⋮
 ● Completed in 0.655s

> 完成！已创建新的存储桶 cat-tetris-game-<存储桶ID> 并上传了猫俄罗斯方块文件。
```

上传已完成，但不知道如何访问。  
之前并未说明最终想如何访问。  
向 Q Developer 传达 <最终成果物的预期效果>。

指令：
```
我想通过 URL 访问，请告诉我 URL。
```
响应：（存储桶ID 已根据实际输出内容进行替换）
```
> 由于当前 S3 存储桶是私有的，因此无法从网页访问。需要启用公共访问。

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
aws s3api put-public-access-block --bucket cat-tetris-game-<存储桶ID> --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
 ⋮
 ↳ Purpose: 禁用存储桶的公共访问阻止配置

 ⋮
 ● Completed in 0.989s

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
aws s3api put-bucket-policy --bucket cat-tetris-game-<存储桶ID> --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::cat-tetris-game-<存储桶ID>/*"
    }
  ]
}'
 ⋮
 ↳ Purpose: 通过存储桶策略允许公共读取

 ⋮
 ● Completed in 1.112s

> 现在可以通过以下 URL 进行访问：

https://cat-tetris-game-<存储桶ID>.s3.amazonaws.com/cat-tetris.html

在浏览器中打开此 URL 即可游玩猫俄罗斯方块！
```

打开指定的 URL。  
可以在 AWS S3 上运行与本地相同的俄罗斯方块游戏了。  
![](https://gyazo.com/1b278100082c898609ea10b49731fc78.png)  

---

## 4. 发出指令的基本模式

要通过与 AI 对话取得成果，**“如何传达”** 是最重要的。  
Q Developer 能理解自然语言，但越是**清晰且结构化的指令**，生成的代码精度越高。

### 4.1 指令的基本结构

向 AI 传达任务时，请注意以下 3 个阶段。

| 阶段 | 内容 | 示例 |
|------|------|----|
| **① 目标** | 想要实现什么 | “想要创建一个将数据保存到 DynamoDB 的 API” |
| **② 约束** | 技术条件 / 使用技术 | “使用 Python 3.11，以 Lambda 函数的形式实现” |
| **③ 期望结果** | 希望输出的成果物形式 | “生成处理函数和测试代码” |

只要按顺序传达这 3 个要素，就能大幅提高输出的可复现性和质量。

### 4.2 根据粒度区分指令

向 Q Developer 下达的指令大致分为“**部分指令**”和“**整体指令**”两类。

| 类型 | 针对范围 | 使用示例 |
|------|------------|-------------|
| **部分指令** | 函数、模块等局部修复 | “重构此函数，并统一异常处理” |
| **整体指令** | 针对整个项目或设计方针 | “统一所有 API 的响应格式，并添加公共错误处理器” |

部分指令着眼于即时改进，整体指令则着眼于设计方针的一致性。  
将这两者结合，可让 AI 理解**意图的上下层级关系**。

### 4.3 循环反馈

对 AI 提供的结果，不要“直接使用”，而应进行**误解 → 修正 → 再生成**的循环。

#### 例子：
```
AI：已创建 Lambda 函数，将向 DynamoDB 写入数据。
↓
开发者：此代码中表名是固定的，请改为从环境变量获取。
↓
AI：明白。以下是已修改的代码。
```
如上，将与 AI 的对话视为“审查往返”，就能共同培养出更高质量的代码。

### 4.4 好的指令与不好的指令的比较

| 指令示例 | AI 反应 | 评价 |
|-----------|-----------|------|
| “写一个支持 DynamoDB 的 Lambda” | 尽管可运行，但其架构和异常处理不明确 | ❌ 不明确 |
| “创建一个将任务注册到 DynamoDB 的 Lambda 函数。接受 title 和 status，其中 status 的初始值为 pending” | 自动生成了合适的处理函数和校验逻辑 | ✅ 明确 |
| “改进函数” | 不知道要如何修改 | ❌ 抽象 |
| “为此函数添加错误处理，并将异常内容输出到日志” | 可以准确反映代码的修复意图 | ✅ 具体 |

与“简短指令”相比，“包含明确上下文的指令”能获得更好的结果。

### 4.5 应用：将 AI 用作审查者

也可以让 AI 具有作为 **“设计者”** 或 **“质量管理者”** 的视角。  
例如，以下指令非常有效：
```
请从此代码的可维护性和可测试性角度，提出 3 点改进建议。
```
或者，
```
请根据 REST 原则审查此 API 设计。
```
这样，Q Developer 就不仅仅是生成引擎，还是作为“审查 AI”来发挥作用，成为能够提升开发者质量意识的伙伴。

---

## 总结

- 指令请按**目标 → 约束 → 期望结果**的顺序传达  
- **根据粒度（部分/整体）进行结构化指令**  
- **反复进行反馈以提高精度**  
- 在最小构成中运行的同时，通过**与 AI 的对话**理解开发流程  

Q Developer 不仅是“AI 写代码的工具”，而是“**与 AI 共同打磨设计、实现与质量的开发平台**”。  
希望能为大家在生成式 AI 的应用上提供参考。  

<style>
img {
    border: 1px gray solid;
}
</style>
