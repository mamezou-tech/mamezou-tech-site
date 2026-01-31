---
title: GitHub Copilot 代理与指令的设置方法
author: masato-ubata
date: 2026-01-30T00:00:00.000Z
tags:
  - GitHub Copilot
image: true
translate: true

---

## 前言

本文将说明如何设置 GitHub Copilot 的 Agents（代理）和 Instructions（指令）。

**Agents（代理）是什么**  
这是一项可将 Copilot 定制为针对特定任务或领域的专家的功能。  
例如，你可以定义多个具有不同专业性的代理，如后端开发、前端开发等，并根据情况进行切换。  
可将其分配给 Issue，或在 VS Code 中选择使用。

**Instructions（指令）是什么**  
这是一项可定义针对 Copilot 的通用规则和约束的功能。  
通过记录编码规范、命名约定、项目特定的最佳实践等，确保所有开发者都能获得一致的代码生成支持。  
与代理配合使用，并应用于 VS Code 中的编码、Pull Request 的审查等各种场景。

## 适用顺序

以下规则按顺序应用。如有冲突，数字越小的规则优先：

1. 选定的代理（例如：`agents/backend.agent.md`）  
2. 匹配的指令（例如：`instructions/typescript.instructions.md` ← 与 applyTo 模式匹配）  
3. 全局指令（`copilot-instructions.md`）

## 文件放置

为使 GitHub Copilot 能识别，请按以下方式放置文件：

* `.github/`  
  * `agents/`  
    * `xxx.agent.md`：根据特定领域（角色等）定义的代理文件（如 backend、frontend、test）  
  * `copilot-instructions.md`：定义全局适用的规则和约束的文件  
  * `instructions/`  
    * `xxx.instructions.md`：根据特定领域（技术等）定义的文件（如 typescript、python、react）  
      ※ 虽然可能想按子文件夹分类，但若分类到子文件夹则无法读取。  

:::alert
**关于 AGENTS.md**

`.github/AGENTS.md`（目录根下）是**用于 GitHub CLI**的文件。  
请注意，VS Code 无法读取它。  
在 VS Code 中，只有 `agents/` 目录内的 `*.agent.md` 文件有效。
:::

:::info
**在工作区中的配置**

当在 VS Code 中进行多仓库（同时打开多个仓库）操作时，设置文件需要放置在**工作区根目录**的 `.github/` 下。  
如果希望每个仓库使用独立设置，请分别在各仓库的不同 VS Code 窗口中打开。

* `.github/agents/sample.agent.md`：放在工作区根目录时可选用  
  * `repo-A/.github/agents/sample.agent.md`：各仓库目录下的代理无法读取  
  * `repo-B/.github/agents/sample.agent.md`
:::

## 头部用途

下面介绍定义文件头部可设置的一部分属性。

**代理**

```md
---
name: Backend Agents(TypeScript)
description: This custom agent implements backend features using TypeScript.
model: GPT-5.2
---
```
![代理选择界面（VS Code）](/img/blogs/2026/0130_copilot-agent-setting/select-copilot-agent_vscode.png)  
※ 代理选择界面（VS Code）

| 属性        | 设置时用处                       | 未设置时                           |
| ----------- | -------------------------------- | ---------------------------------- |
| name        | 作为代理名称                     | 使用不含扩展名的文件名作为代理名称 |
| description | 作为代理描述                     | 空白                               |
| model       | 指定所使用的 AI 模型             | 默认模型                           |

**指令**

```md
---
applyTo: "src/**/*.ts" # 例如：针对 src 下的 ts 文件
---
```

| 属性      | 设置时用处                              | 未设置时         |
| --------- | --------------------------------------- | ---------------- |
| applyTo   | 指定将指令应用到哪些文件的模式（glob） | 应用于所有文件   |

:::info
**applyTo 的示例**
* `**/*.ts` - 所有 TypeScript 文件  
* `src/**` - src 目录下的所有文件  
* `**/*.{js,ts}` - JavaScript 和 TypeScript 文件  
:::

## 定义示例

下面展示代理和指令的定义示例。  
通过组合使用，可以实现针对项目或任务优化的 Copilot 行为。

### 代理：后端开发者

````md: .github/agents/backend-specialist.agent.md
---
name: Backend Developer Agent
description: 使用 NestJS 进行后端开发的专家
---

# 角色

你是使用 NestJS 和 TypeScript 进行后端开发的专家。

# 技术栈

- **框架**：NestJS 11.x
- **语言**：TypeScript 5.x
- **数据库**：PostgreSQL
- **ORM**：TypeORM
- **测试**：Jest

# 编码规范

- 遵循六边形架构
- DTO 必须添加校验装饰器
- 异常处理请使用返回适当 HTTP 状态码的自定义异常

# 测试策略

- 单元测试需覆盖所有 Service 类
- 目标测试覆盖率为 80% 以上
````

### 全局指令：项目通用规范

```md: .github/copilot-instructions.md
# 编码规范

## 通用规则

- **语言**：请使用日语撰写注释和文档  
- **命名规范**：  
  - 类名：PascalCase  
  - 函数名和变量名：camelCase  
  - 常量：UPPER_SNAKE_CASE  
- **缩进**：两个空格  
- **字符串**：使用单引号  

## 禁止事项

- 原则上禁止使用 `any` 类型（请适当进行类型定义）  
- 禁止提交 `console.log`（请使用日志记录器）  
- 严禁硬编码机密信息  

## 安全

- 对外部输入必须进行校验  
- 实施 SQL 注入防护  
- 对需要认证/授权的端点设置守卫  
```

### 按领域指令：TypeScript 专用规则

````md: .github/instructions/typescript.instructions.md
---
applyTo: "**/*.ts"
---

# TypeScript 专用规则

## 命名规范

- 文件名：kebab-case

## 类型定义

- 请优先使用显式类型注释  
- 请使用 Utility Types（`Partial`、`Pick`、`Omit` 等）  
- 对于复杂类型，请使用 `type` 别名定义

```typescript
// Good
type UserProfile = {
  id: string;
  name: string;
  email: string;
};

type UserProfileUpdate = Partial<Pick<UserProfile, 'name' | 'email'>>;

// Bad
const updateUser = (data: any) => { ... };
```

## 异步处理

- 请使用 `async/await`（避免 Promise 链）  
- 错误处理请使用 `try-catch`

## 导入顺序

1. 外部库  
2. 内部模块（绝对路径）  
3. 相对路径

```typescript
// 外部库
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';

// 内部模块
import { UserEntity } from '@/entities/user.entity';
import { CreateUserDto } from '@/dto/create-user.dto';

// 相对路径
import { UserService } from './user.service';
```
````

## 运行注意事项

### VS Code 的缓存管理

当修改代理或指令文件时，首次加载的内容会被缓存。  
要使更改生效，需要执行以下操作之一：  
- 在聊天中明确说明修改了哪些文件并提示重新加载（例如：`已修改 sample.agent.md，请重新加载`）  
- 开始新的聊天  
- 重启 VS Code  

### GitHub 的文件大小限制

代理文件的字符数（不包含头部）超过 30,000 字符后将无法被选用。  
请根据实际情况将文件拆分为合理粒度。  

![超过 30000 字符的代理显示示例](/img/blogs/2026/0130_copilot-agent-setting/copilot-agent-file-size-limit_github.png)

*在 GitHub Issue 中将 Copilot 分配后显示的对话框*
