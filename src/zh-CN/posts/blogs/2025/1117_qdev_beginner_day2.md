---
title: 与 AI 一起开始 AWS 开发 ― 在 Q Developer 中体验规范驱动测试
author: shuichi-takatsu
date: 2025-11-17T00:00:00.000Z
tags:
  - Q Developer
  - 仕様駆動
  - AWS
  - 生成AI
image: true
translate: true

---

## 前言

[上一篇](/blogs/2025/11/12/qdev_beginner_day1/) 中，我们使用 Q Developer 在交互模式下创建了一个简单的应用程序。  
本篇文章中，我们将更进一步深入 Q Developer，通过 **规范 → 实现 → 测试生成 → 修正** 的一系列流程，来了解 AI 如何协助软件开发。  
特别关注 **可测试规范（验证）** 的概念。  
我们将通过实际流程，检验 AI 所生成的测试能够自动化到何种程度，以及人类开发者应在何阶段介入以保证质量。

阅读本文后，您将获得以下认识：
- Q Developer 在从规范到测试方面能够自动化的范围
- AI 自动生成测试的优势与局限
- 设计可测试规范时的实际要点
- 人为干预的判断要点与质量保证的要领

本文假设所使用的 Q Developer 版本为 `1.13.0`。  
接下来，让我们具体看看 AI 参与的测试自动化流程。

---

## 1. 构建简单的 ToDo 应用

### 1.1 在交互模式下启动 Q Developer

创建工作目录并运行 `q`。

```bash
mkdir todo-fastapi && cd todo-fastapi
q
```

在启动后的提示符中粘贴以下消息：

指示：
```
请生成使用 FastAPI 构建简单 ToDo 应用（注册、列表、删除 API）的 Python 脚本。
文件名为 main.py 和 test_api.py。
使用内存数据库，并使用 Pydantic 进行验证，
priority 值为 low/medium/high，
due_date 必须包含未来日期检查。
```

响应：
```
🛠️  Using tool: fs_write
 ⋮
 ● Path: /home/ubuntu/todo-fastapi/main.py

+     1: from fastapi import FastAPI, HTTPException
+     2: from pydantic import BaseModel, validator
+     3: from typing import List, Optional
+     4: from datetime import datetime
+     5: from enum import Enum
+     6:
+     7: app = FastAPI()
+     8:
+     9: # In-memory database
+    10: todos = []

～～～（中略）～～～

+    57: @app.delete("/todos/{todo_id}")
+    58: def delete_todo(todo_id: int):
+    59:     for i, todo in enumerate(todos):
+    60:         if todo.id == todo_id:
+    61:             del todos[i]
+    62:             return {"message": "Todo deleted successfully"}
+    63:     raise HTTPException(status_code=404, detail="Todo not found")
+    64:
+    65: if __name__ == "__main__":
+    66:     import uvicorn
+    67:     uvicorn.run(app, host="0.0.0.0", port=8000)

 ⋮
 ↳ Purpose: Create FastAPI ToDo application with registration, listing, and deletion APIs

Allow this action? Use 't' to trust (always allow) this tool for the session. [y/n/t]:

> t

Creating: /home/ubuntu/todo-fastapi/main.py

 ⋮
 ● Completed in 0.0s

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: /home/ubuntu/todo-fastapi/test_api.py

+     1: import requests
+     2: import json
+     3: from datetime import datetime, timedelta
+     4:
+     5: BASE_URL = "http://localhost:8000"
+     6:
+     7: def test_create_todo():
+     8:     todo_data = {
+     9:         "title": "Test Todo",
+    10:         "description": "Test description",

～～～（中略）～～～

+    50:
+    51:     # Test invalid due date
+    52:     test_invalid_due_date()
+    53:     print()
+    54:
+    55:     # Test deleting a todo
+    56:     test_delete_todo(todo_id)
+    57:     print()
+    58:
+    59:     # Verify deletion
+    60:     test_get_todos()

 ⋮
 ↳ Purpose: Create test file for the FastAPI ToDo application
Creating: /home/ubuntu/todo-fastapi/test_api.py

 ⋮
 ● Completed in 0.0s

> 已使用 FastAPI 创建了一个简单的 ToDo 应用。

main.py 的主要功能：
• POST /todos：注册 ToDo（标题、描述、优先级、截止日期）  
• GET /todos：获取 ToDo 列表  
• DELETE /todos/{todo_id}：删除 ToDo  
• 使用 Pydantic 验证（优先级：low/medium/high，截止日期：未来日期检查）  
• 内存数据库

可以通过 test_api.py 进行 API 测试。

要启动应用程序：
```bash
python main.py
```

要执行测试（在另一个终端）：
```bash
python test_api.py
```

已按指示创建了 Python 文件 `main.py` 和 `test_api.py`。

### 1.2 检查并应用生成的代码

确认结果。  
在运行 Q 的文件夹（工作目录）中已保存 `main.py` 和 `test_api.py`。  
![](https://gyazo.com/ae4685ad5dcb966fc4cdbeab9b425301.png)

※ 如果 Q Developer 建议“执行工具（创建文件）”，请选择 `yes` 以允许。

安装所需依赖库。  
这也交由 Q Developer 完成。

指示：
```
请安装运行应用程序所需的 Python 库
```

响应：
```
🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command: python main.py
 ⋮
 ↳ Purpose: Start the FastAPI ToDo application

Traceback (most recent call last):
  File "/home/ubuntu/todo-fastapi/main.py", line 1, in <module>
    from fastapi import FastAPI, HTTPException
ModuleNotFoundError: No module named 'fastapi'

 ⋮
 ● Completed in 0.11s

> 似乎未安装 FastAPI。正在安装：

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
pip install fastapi uvicorn requests
 ⋮
 ↳ Purpose: Install FastAPI and required dependencies

～～～（中略）～～～

Using cached uvicorn-0.38.0-py3-none-any.whl (68 kB)
Downloading typing_extensions-4.15.0-py3-none-any.whl (44 kB)
Downloading typing_inspection-0.4.2-py3-none-any.whl (14 kB)
Installing collected packages: uvicorn, typing-extensions, typing-inspection, pydantic-core, pydantic, fastapi
  Attempting uninstall: typing-extensions
    Found existing installation: typing_extensions 4.13.2
    Uninstalling typing_extensions-4.13.2:
      Successfully uninstalled typing_extensions-4.13.2
  Attempting uninstall: typing-inspection
    Found existing installation: typing-inspection 0.4.0
    Uninstalling typing-inspection-0.4.0:
      Successfully uninstalled typing-inspection-0.4.0
  Attempting uninstall: pydantic-core
    Found existing installation: pydantic_core 2.33.2
    Uninstalling pydantic_core-2.33.2:
      Successfully uninstalled pydantic_core-2.33.2

Successfully installed fastapi-0.121.1 pydantic-2.12.4 pydantic-core-2.41.5 typing-extensions-4.15.0 typing-inspection-0.4.2 uvicorn-0.38.0

[notice] A new release of pip is available: 25.1.1 -> 25.3
[notice] To update, run: pip install --upgrade pip

 ⋮
 ● Completed in 7.388s

> 库安装完成。可以启动应用程序：

```bash
python main.py
```

进行运行确认。  
在另一个控制台中运行应用程序。

```bash
python main.py
```

在浏览器或使用 `curl` 确认以下内容：

```bash
curl http://127.0.0.1:8000/todos
```

由于数据尚为空，结果应该输出 "`[]`"（空数据）。  
在第1章中，我们完成了“向 AI 以自然语言传达规范并自动生成代码”。  
接下来，将**以现有代码为基础，重新明确规范，并可通过测试进行验证**。

## 2. 强化验证 —— 构建可测试的规范

重新明确以下两个规范：

- `due_date` 必须为“未来日期”
- `priority` 必须是 `low`、`medium` 或 `high` 之一

对于 AI，我们以如下日语传达：

指示：
```
请在 Task 模型中添加验证。due_date 必须为未来日期，priority 仅允许 low、medium、high 三者之一。
```

响应：
```
🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/todo-fastapi/main.py, from line 10 to 30
 ✓ Successfully read 469 bytes from /home/ubuntu/todo-fastapi/main.py

 ⋮
 ● Completed in 0.0s

～～～（中略）～～～

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
pkill -f "python main.py"
 ⋮
 ↳ Purpose: Stop the background FastAPI process

 ⋮
 ● Completed in 0.48s

> 验证已正确实现并正常工作：

1. priority: 通过 Priority Enum 仅允许 low、medium、high  
2. due_date: 如果指定过去日期，将返回 422 错误，并提示 "due_date must be in the future"

为了在测试结果中确认：  
• 有效数据：成功创建 (200)  
• 无效的过去日期：验证错误 (422)

当前代码已完全实现所需的验证。
```

通过这种方式，以现有代码为基础，重新明确规范，并可通过测试进行验证。

---

到目前为止，第1章和第2章所执行的内容总结如下：

| 章    | 阶段     | 意图                                     | 角色               |
| --   | ---- | ---------------------------------------- | ------------------ |
| 第1章 | 实现生成 | 向 AI 以自然语言传达规范并自动生成代码   | 观察“生成的准确性” |
| 第2章 | 规范验证 | 以现有代码为基础，重新明确规范并通过测试验证 | 学习“规范的测试化” |

---

## 3. 服务运行与测试

那么，实际运行应用程序并执行测试吧。  
（测试内容将在后续章节中说明）

在本地运行应用程序：

```bash
python main.py
```

接下来执行测试：

```bash
python test_api.py
```

执行结果如下：

```bash
Testing FastAPI Todo App
==============================
Create Todo: 200
{
  "id": 1,
  "title": "Test Todo",
  "description": "Test description",
  "priority": "high",
  "due_date": "2025-11-10T22:59:37.092516",
  "created_at": "2025-11-09T22:59:37.099295"
}

Get Todos: 200
[
  {
    "id": 1,
    "title": "Test Todo",
    "description": "Test description",
    "priority": "high",
    "due_date": "2025-11-10T22:59:37.092516",
    "created_at": "2025-11-09T22:59:37.099295"
  }
]

Invalid Due Date: 422
{
  "detail": [
    {
      "type": "value_error",
      "loc": [
        "body",
        "due_date"
      ],
      "msg": "Value error, due_date must be in the future",
      "input": "2025-11-08T22:59:37.104030",
      "ctx": {
        "error": {}
      }
    }
  ]
}

Delete Todo: 200
{
  "message": "Todo deleted successfully"
}

Get Todos: 200
[]
```

可以看到测试返回值“200”和“422”已确认。

---

## 4. 解读 AI 生成的测试

AI 会根据规范文推断测试。  
本次创建的测试用例如下：

```python
def test_create_todo():
    todo_data = {
        "title": "Test Todo",
        "description": "Test description",
        "priority": "high",
        "due_date": (datetime.now() + timedelta(days=1)).isoformat()
    }
    response = requests.post(f"{BASE_URL}/todos", json=todo_data)
    print(f"Create Todo: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()["id"]

def test_get_todos():
    response = requests.get(f"{BASE_URL}/todos")
    print(f"Get Todos: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

def test_delete_todo(todo_id):
    response = requests.delete(f"{BASE_URL}/todos/{todo_id}")
    print(f"Delete Todo: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

def test_invalid_due_date():
    todo_data = {
        "title": "Invalid Todo",
        "priority": "low",
        "due_date": (datetime.now() - timedelta(days=1)).isoformat()
    }
    response = requests.post(f"{BASE_URL}/todos", json=todo_data)
    print(f"Invalid Due Date: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
```

这些测试基本上可以正常运行，但 **切勿盲目相信 AI 自动生成的测试，必须从人类视角进行审查**。  
AI 的推断会从规范文中导出合理逻辑，但常常不足以理解 **隐含前提和边界条件**。

从以下角度进行审查，可以进一步提升测试质量：

| 角度   | 检查内容                                         | 应对方针               |
| ------ | ---------------------------------------------- | ---------------------- |
| **规范一致性** | 未来日期的边界（当天日期是否有效？）、输入约束是否明确？ | 添加边界测试           |
| **可读性** | 测试名称是否能说明规范，预期结果是否明确？             | 改进名称和 print 内容  |
| **覆盖性** | 是否涵盖了 `low`、`medium`、`high` 的正常用例，以及是否涵盖了异常用例？ | 生成并添加缺失的用例    |
| **独立性** | 各测试是否不依赖其他测试的结果？                     | 将前置数据创建和删除逻辑分离 |
| **可重现性** | 结果是否不受执行顺序或时间依赖影响？                  | 引入固定日期或 ID 管理机制 |

AI 自动生成的测试倾向于基于规范描述来推断 **“最常见的用例”**。  
因此，  
- 边界条件（当天或阈值等）  
- 错误用例（非法值、缺失值、异常请求）  
- 并发操作或排他控制的验证  

等 **“规范的边缘部分”** 通常未得到充分覆盖。

如果明确告诉 AI “也添加边界测试”，它会生成，但关键在于人要定义“什么才算边界”。  
AI 会解析规范文档来生成逻辑，但如果规范本身不完整，测试也会一直不完整。

---

## 5. 测试补充（手动处理）

AI 生成的测试代码可以说是 **“骨架”**。  
在此基础上，添加 **规范解读、风险导向思维、质量视角** 的内容是人类的职责。  
特别是，关注以下三点可使质量更加稳固：

1. **重新确认规范理解**：验证 AI 实现的内容是否与预期规范一致。  
2. **加强异常用例**：明确处理意外输入或极端值的方式。  
3. **测试设计的可重用性**：整理为可在后续功能追加中重复使用的通用结构。  

在 FastAPI ToDo 应用运行并通过基本测试后，接下来要补充 **缺失的测试用例（边界用例和异常用例）**。  
此处将展示不依赖 AI 建议，由人为意图来添加测试的步骤。

测试目标：
- `due_date` 为“当天” → 无效（仅限未来日期）
- `priority` 为非法值 → 无效（仅允许 `low`/`medium`/`high`）
- 覆盖三种正常用例（low、medium、high）

```python
def test_due_date_today_invalid():
    """当指定当天日期时的验证（预期返回422）"""
    todo_data = {
        "title": "Today Todo",
        "priority": "low",
        "due_date": datetime.now().isoformat()
    }
    response = requests.post(f"{BASE_URL}/todos", json=todo_data)
    print(f"Due Date Today Invalid: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except Exception:
        print(response.text)

def test_priority_invalid_value():
    """当 priority 指定非法值时的验证（预期返回422）"""
    todo_data = {
        "title": "Invalid Priority Todo",
        "priority": "urgent",  # 允许值：仅限 low/medium/high
        "due_date": (datetime.now() + timedelta(days=1)).isoformat()
    }
    response = requests.post(f"{BASE_URL}/todos", json=todo_data)
    print(f"Invalid Priority: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except Exception:
        print(response.text)
```

## 6. 测试补充（交给 AI）

在第5章中我们手动扩充了测试用例，这里来验证是否可以让 AI 补充测试用例。

指示：
```
请确认测试用例是否充足
```

响应：
```
🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/todo-fastapi/test_api.py, all lines
 ✓ Successfully read 1661 bytes from /home/ubuntu/todo-fastapi/test_api.py

 ⋮
 ● Completed in 0.0s

> 当前测试用例仅覆盖基本功能。将添加缺失的测试用例：

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: test_api.py

  29, 29: def test_invalid_due_date():
  30, 30:     todo_data = {
  31, 31:         "title": "Invalid Todo",
  32, 32:         "priority": "low",
  33, 33:         "due_date": (datetime.now() - timedelta(days=1)).isoformat()

～～～（中略）～～～

+     107:     # Delete minimal todo if created
+     108:     if minimal_id:
+     109:         test_delete_todo(minimal_id)
+     110:         print()
+     111:
  91, 112:     # Verify deletion
  92, 113:     test_get_todos()

 ⋮
 ↳ Purpose: Update main test execution to include all test cases
Updating: test_api.py

 ⋮
 ● Completed in 0.0s

> 已添加的测试用例：

验证测试：
• test_invalid_priority(): 测试无效优先级 ("urgent")  
• test_missing_title(): 测试必需字段 (title) 缺失  
• test_minimal_todo(): 测试仅使用最小必需字段创建  

错误处理测试：
• test_delete_nonexistent(): 测试删除不存在的 ToDo 时的 404 错误  

测试覆盖：
• 正常用例：完整 ToDo 创建、最小 ToDo 创建、列表获取、删除  
• 异常用例：过去日期、无效优先级、必需字段缺失、删除不存在的 ID  

至此已覆盖主要的验证和错误用例。
```

让我们执行已添加的测试。

指示：
```
请执行测试
```

响应：
```
🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command: python main.py &
 ⋮
 ↳ Purpose: Start FastAPI application in background

 ⋮
 ● Completed in 0.3s

～～～（中略）～～～

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
pkill -f "python main.py"
 ⋮
 ↳ Purpose: Stop the background FastAPI process

 ⋮
 ● Completed in 0.15s

> 测试结果分析：

✅ 正常用例测试：
• 完整 ToDo 创建：200 OK  
• 最小 ToDo 创建：200 OK （description、due_date 为 null）  
• 列表获取：200 OK  
• ToDo 删除：200 OK  

✅ 验证测试：
• 指定过去日期：422 错误 "due_date must be in the future"  
• 无效优先级：422 错误 "Input should be 'low', 'medium' or 'high'"  
• 必需字段缺失：422 错误 "Field required"  

✅ 错误处理测试：
• 删除不存在的 ToDo：404 错误 "Todo not found"  

所有测试用例均按预期运行，验证与错误处理已正确实现。测试覆盖足够。
```

通过与 AI 对话，也可以这样扩充测试用例。  
能够与 AI 配合编程的日子来临，真是了不起的时代。

---

## 总结

AI 提出的测试仅仅是“初稿”。  
人需要从规范理解和质量角度进行审查，并判断是否采用、修改或删除。

| 角度   | 应采纳的建议                     | 应拒绝的建议                          |
| ------ | ------------------------------ | ----------------------------------- |
| **规范一致性** | 准确遵守未来日期与优先级要求       | 包含模糊条件（例如：允许当天）          |
| **可读性**   | 测试名与变量名直观易懂             | 含义不明的缩写或复杂逻辑                |
| **可维护性** | 简洁且可重用                     | 包含重复代码或不必要依赖                |
| **易执行性** | 可通过 `python test_api.py` 完成  | 需要启动外部服务器                     |

这就是使 Q Developer 实现“质量管理自动化”的关键。  
希望对大家利用生成式 AI 有所帮助。

<style>
img {
    border: 1px gray solid;
}
</style>
