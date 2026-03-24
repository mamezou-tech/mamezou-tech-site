---
title: >-
  Starting AWS Development with AI ― Experience Specification-Driven Testing
  with Q Developer
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

## Introduction

In the [previous article](/blogs/2025/11/12/qdev_beginner_day1/), we used Q Developer to create a simple application in interactive mode.  
In this article, we’ll dig deeper into Q Developer and see how AI supports software development through the complete cycle of **specification → implementation → test generation → refinement**.  
Our focus will be on the concept of **testable specifications (validation)**.  
We will verify, through an actual process, how far AI can automate test generation, and at which stages human developers should intervene to ensure quality.

By reading this article, you will gain the following insights:
- The scope of test automation from specification to testing that Q Developer can handle
- The advantages and limitations of AI-generated automated testing
- Practical points for designing testable specifications
- Decision points and quality assurance insights where human involvement is necessary

We assume you are using Q Developer version `1.13.0`.  
Now, let’s take a concrete look at AI-driven test automation.

---

## 1. Building a Simple ToDo App

### 1.1 Launching Q Developer in Interactive Mode

Create a working directory and start `q`.

```bash
mkdir todo-fastapi && cd todo-fastapi
q
```

At the prompt, paste the following message.

Instruction:
```
Generate a Python script to create a simple ToDo application using FastAPI (create, list, delete APIs).
The filenames should be main.py and test_api.py.
Use an in-memory database and perform validation with Pydantic,
priority should be low/medium/high,
and include a future date check for due_date.
```

Response:
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

～～～（omitted）～～～

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

～～～（omitted）～～～

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

> A simple ToDo application using FastAPI has been created.

Main features of main.py:
• POST /todos: ToDo registration (title, description, priority, due date)  
• GET /todos: Retrieve list of ToDos  
• DELETE /todos/{todo_id}: Delete ToDo  
• Validation with Pydantic (priority: low/medium/high, due date: future date check)  
• In-memory database

API testing is possible with test_api.py.

To start the application:
```bash
python main.py
```

To run the tests (in a separate terminal):
```bash
python test_api.py
```
```

As instructed, the Python files `main.py` and `test_api.py` have been created.

### 1.2 Review and Apply Generated Code

Let's review the results.  
The files `main.py` and `test_api.py` are saved in the folder (working directory) where Q is running.  
![](https://gyazo.com/ae4685ad5dcb966fc4cdbeab9b425301.png)

If Q Developer suggests “Execute tool (create file),” approve with `yes`.

Install the dependent libraries.  
Let Q Developer handle this as well.

Instruction:
```
Please install the Python libraries required to run the application
```

Response:
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

> It seems FastAPI is not installed. Installing it now:

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
pip install fastapi uvicorn requests
 ⋮
 ↳ Purpose: Install FastAPI and required dependencies

～～～（omitted）～～～

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

> Library installation is complete. You can start the application:

```bash
python main.py
```
```

Let's verify it works.  
Run the application from a separate console:

```bash
python main.py
```

Check the following in a browser or with `curl`:

```bash
curl http://127.0.0.1:8000/todos
```

Since there's no data yet, it should output `[]` (empty data).  
In Chapter 1, we covered “conveying the specification to AI in natural language and generating code automatically.”  
Next, we will **based on the code, rearticulate the specifications and make them verifiable by tests**.

## 2. Strengthening Validation – Making Specifications Testable

We will rearticulate the following two specifications:

- `due_date` must be a future date  
- `priority` must be one of `low`, `medium`, or `high`

We communicate this to the AI in Japanese as follows.

Instruction:
```
Please add validation to the Task model. due_date must be a future date, and only low, medium, or high are allowed for priority.
```

Response:
```
> Validation is already implemented in the existing code, but I will review and improve it to make it clearer:

🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/todo-fastapi/main.py, from line 10 to 30
 ✓ Successfully read 469 bytes from /home/ubuntu/todo-fastapi/main.py

 ⋮
 ● Completed in 0.0s

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
pkill -f "python main.py"
 ⋮
 ↳ Purpose: Stop the background FastAPI process

 ⋮
 ● Completed in 0.48s

> The validation is already correctly implemented and functioning:

1. priority: Only low, medium, and high are allowed by the Priority enum  
2. due_date: Specifying a past date returns a 422 error with the message "due_date must be in the future"

To show in test results:  
• Valid data: Successful creation (200)  
• Invalid past date: Validation error (422)

The requested validation is fully implemented in the current code.
```

In this way, based on the code, we have rearticulated the specifications and made them verifiable by tests.

---

Summarizing what we did in Chapters 1 and 2:

| Chapter   | Phase                     | Intent                                                              | Role                               |
|-----------|---------------------------|---------------------------------------------------------------------|------------------------------------|
| Chapter 1 | Implementation Generation | Conveying specifications to AI in natural language and generating code automatically | Observing "generation accuracy"    |
| Chapter 2 | Specification Verification | Rearticulating specifications based on the code and verifying them with tests       | Learning "testable specifications" |

---

## 3. Running the Server and Tests

Now, let's actually run the application and execute the tests.  
(The details of the tests will be explained in the following sections.)

Run the application locally:

```bash
python main.py
```

Then run the tests:

```bash
python test_api.py
```

The execution results were as follows:

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

You can see the test return codes `200` and `422` as expected.

---

## 4. Interpreting AI-Generated Tests

The AI infers tests from the specification text.  
The test cases created this time are as follows:

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

These tests will basically work correctly, but **it is crucial not to take AI-generated code at face value and to review it from a human perspective**.  
AI inference derives reasonable logic from specification texts, but it often does not fully understand **implicit assumptions and boundary conditions**.

Reviewing from the following perspectives can further improve test quality:

| Perspective         | Checkpoint                                                         | Action Plan                            |
|---------------------|---------------------------------------------------------------------|----------------------------------------|
| **Specification Fit** | Are boundary conditions around future dates (is today valid?) and input constraints clear? | Add boundary tests                     |
| **Readability**       | Are test names explanatory of the specification, and are expected results explicit?    | Improve names and print statements     |
| **Coverage**          | Are the normal cases for low, medium, and high included, and are error cases covered? | Add missing cases via generation       |
| **Independence**      | Do tests depend on results from other tests?                      | Separate setup and teardown processes  |
| **Reproducibility**   | Will execution order or time dependencies affect results?         | Introduce fixed date or ID management  |

AI-generated tests tend to infer the **most common cases** from the specification.  
Therefore, they often lack coverage of **“peripheral areas of the specification,”** such as:
- Boundary conditions (today or threshold values)
- Error cases (invalid values, missing fields, abnormal requests)
- Concurrency behavior or locking checks

You can ask AI to “add boundary tests,” but the important part is **defining what counts as a boundary**.  
AI analyzes the specification text to generate logic, but if the specification itself is incomplete, the tests will remain incomplete.

---

## 5. Test Augmentation (Manual)

AI-generated test code serves as a **skeleton**.  
It is a human’s role to flesh it out with **interpretation of the specification, risk-based thinking, and quality considerations**.  
Focusing on the following three points helps stabilize quality:

1. **Reconfirm specification understanding**: Ensure the AI-implemented behavior matches the intended specification.  
2. **Enhance error cases**: Explicitly handle unexpected inputs and outliers.  
3. **Design for reusability**: Organize tests so they can be used for later feature additions.

Once the FastAPI ToDo app is running and the basic tests pass, add the **missing test cases (boundary and error conditions)**.  
Here is an example of manually adding tests with clear intent, rather than relying on AI suggestions:

```python
def test_due_date_today_invalid():
    """Validation when specifying today's date (expecting 422)"""
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
    """Validation when specifying an invalid priority (expecting 422)"""
    todo_data = {
        "title": "Invalid Priority Todo",
        "priority": "urgent",  # Allowed values: low/medium/high only
        "due_date": (datetime.now() + timedelta(days=1)).isoformat()
    }
    response = requests.post(f"{BASE_URL}/todos", json=todo_data)
    print(f"Invalid Priority: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except Exception:
        print(response.text)
```

## 6. Test Augmentation (Using AI)

In Chapter 5, we manually expanded test cases. Now let’s see if AI can help fill in test coverage.

Instruction:
```
Please review the test cases for completeness.
```

Response:
```
> Reviewing the current test cases to identify missing parts:

🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/todo-fastapi/test_api.py, all lines
 ✓ Successfully read 1661 bytes from /home/ubuntu/todo-fastapi/test_api.py

 ⋮
 ● Completed in 0.0s

> The current test cases cover only basic functionality. Adding missing test cases:

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: test_api.py

  29, 29: def test_invalid_due_date():
  30, 30:     todo_data = {
  31, 31:         "title": "Invalid Todo",
  32, 32:         "priority": "low",
  33, 33:         "due_date": (datetime.now() - timedelta(days=1)).isoformat()

～～～（omitted）～～～

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

> Added test cases:

Validation tests:
• test_invalid_priority(): Tests invalid priority ("urgent")  
• test_missing_title(): Tests missing required field (title)  
• test_minimal_todo(): Tests creation with only the minimal required fields

Error handling tests:
• test_delete_nonexistent(): Tests 404 error when deleting a nonexistent ToDo

Test coverage:
• Normal cases: Full ToDo creation, minimal ToDo creation, list retrieval, deletion  
• Error cases: Past date, invalid priority, missing required field, deletion of nonexistent ID

This covers the main validation and error cases.
```

Let’s run the newly added tests.

Instruction:
```
Please execute the tests.
```

Response:
```
🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command: python main.py &
 ⋮
 ↳ Purpose: Start FastAPI application in background

 ⋮
 ● Completed in 0.3s

～～～（omitted）～～～

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
pkill -f "python main.py"
 ⋮
 ↳ Purpose: Stop the background FastAPI process

 ⋮
 ● Completed in 0.15s

> Test results analysis:

✅ Normal case tests:
• Full ToDo creation: 200 OK  
• Minimal ToDo creation: 200 OK (description, due_date are null)  
• List retrieval: 200 OK  
• ToDo deletion: 200 OK

✅ Validation tests:
• Past date: 422 error "due_date must be in the future"  
• Invalid priority: 422 error "Input should be 'low', 'medium' or 'high'"  
• Missing required field: 422 error "Field required"

✅ Error handling tests:
• Deletion of nonexistent ToDo: 404 error "Todo not found"

All test cases ran as expected, and validation and error handling are correctly implemented. Test coverage is sufficient.
```

Through interactive dialogue with AI, you can enrich test cases. It’s amazing that we’ve reached the era of pair programming with AI.

---

## Conclusion

AI-suggested tests are only a **starting point**.  
Humans must review specifications and quality perspectives, and decide what to adopt, modify, or discard.

| Perspective        | Suggestions to Adopt                       | Suggestions to Reject                        |
|--------------------|---------------------------------------------|-----------------------------------------------|
| **Specification Fit** | Accurately enforce future date and priority requirements | Include ambiguous conditions (e.g., allowing today) |
| **Readability**      | Intuitive test names and variable names      | Unintelligible abbreviations or complex logic  |
| **Maintainability**  | Concise and reusable code                    | Duplicate code or unnecessary dependencies     |
| **Ease of Execution**| Self-contained with `python test_api.py`     | Requires external server startup               |

This is the key to achieving “automated quality management” with Q Developer.

We hope this is helpful for your generative AI usage.

<style>
img {
    border: 1px gray solid;
}
</style>
