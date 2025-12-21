---
title: AI-Driven AWS Development — Continuous Quality Assurance with Q Developer
author: shuichi-takatsu
date: 2025-11-21T00:00:00.000Z
tags:
  - Q Developer
  - 仕様駆動
  - AWS
  - 生成AI
  - 品質保証
image: true
translate: true

---

## Introduction

In [the previous article](/blogs/2025/11/17/qdev_beginner_day2/), we experienced the flow from **specification to implementation and test generation**, and confirmed how AI can support software development. This time (Day 3), we extend that focus to **quality assurance**.

As AI-based code generation becomes more common, the key question is **how to continuously guarantee quality**. Let’s take a concrete look at the **hybrid quality assurance cycle combining AI and humans** using Q Developer’s **review assistance features and metric visualization**.

---

## 1. What to Look At — Inventory of Quality Perspectives

First, let’s organize “what to look at in a review.” This also relates to the items that Q Developer automatically checks.

| Perspective           | Check Item                                            | Purpose                               |
|-----------------------|-------------------------------------------------------|---------------------------------------|
| **Exception handling**| Consistency in exception swallowing and re-throwing   | Ensure diagnosability                 |
| **Naming conventions**| Consistency of class names, variable names, directory structure | Reduce reading cost          |
| **Dependencies**      | Presence of circular dependencies or layer violations | Ensure structural soundness           |
| **Logging design**    | Granularity, correlation IDs, auditability            | Improve traceability during operation |
| **Intent of tests**   | Boundary conditions, presence of oracle               | Guarantee validity and coverage       |

---

## 2. Running Reviews with Q Developer

When requesting an AI-driven code review, start with a command like the following. The sample uses the ToDo app created last time.

Launch Q Developer:

```bash
# Launch interactive mode
q
```

Group the review perspectives into review categories and instruct Q Developer per category.

| Review Perspective   | Review Category         | Description                                                      |
|----------------------|-------------------------|------------------------------------------------------------------|
| Exception handling   | Design/Readability      | Consistency of exception policy and propagation is a design concern |
| Naming conventions   | Readability             | Naming inconsistencies or mismatched responsibilities are flagged under readability |
| Dependencies         | Design                  | Architectural issues like layer violations or circular dependencies |
| Logging design       | Readability/Design      | Log granularity and correlation ID pertain to design and operational considerations |
| Test intent          | Design/Quality (Test Quality) | AI treats “test validity” as a design/quality issue             |

Although not in the table above, security is an important cross-cutting concern, so include it in the Q Developer instructions as well.

At the prompt after launching, enter:

```text
Please review the code in main.py and test_api.py.
Classify findings under security, readability, and design, and provide suggestions for fixes.
```

If a tool execution proposal appears, choose `y` to allow it only for this session or `t` to allow it permanently.

Response:
```
🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/todo-fastapi/main.py, all lines
 ✓ Successfully read 1684 bytes from /home/ubuntu/todo-fastapi/main.py

 ⋮
 ● Completed in 0.0s

🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/todo-fastapi/test_api.py, all lines
 ✓ Successfully read 3155 bytes from /home/ubuntu/todo-fastapi/test_api.py

 ⋮
 ● Completed in 0.0s

> ## Code Review Results

### 🔒 Security Issues

main.py:
1. No input validation
  python
   # Issue: No length limit for title/description
   title: str  # Potential DoS

2. No rate limiting
  python
   # Issue: No API call rate limit
   @app.post("/todos")  # Allows unlimited requests

3. No CORS settings
  python
   # Issue: No cross-origin control
   app = FastAPI()  # CORS not configured

test_api.py:
4. Hardcoded URL
  python
   BASE_URL = "http://localhost:8000"  # Should be externalized

### 📖 Readability Issues

main.py:
1. Global variables
  python
   # Issue: Global state
   todos = []
   todo_id_counter = 1

2. Magic numbers
  python
   # Issue: Hardcoded port number
   uvicorn.run(app, host="0.0.0.0", port=8000)

test_api.py:
3. Duplicate code

python
   # Issue: Repeated patterns
   print(f"Create Todo: {response.status_code}")
   print(json.dumps(response.json(), indent=2))

### 🏗️ Design Issues

main.py:
1. Single Responsibility Principle violation

python
   # Issue: Business logic mixed with API layer
   def create_todo(todo: TodoCreate):
       global todo_id_counter  # Data manipulation in API layer

2. Thread safety
  python
   # Issue: Potential race condition
   todo_id_counter += 1  # Non-atomic operation

test_api.py:
3. No test isolation
  python
   # Issue: Tests depend on each other
   todo_id = test_create_todo()  # Depends on previous test result

## 🔧 Fix Suggestions

### Security Improvements

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: /home/ubuntu/todo-fastapi/main_improved.py

+     1: from fastapi import FastAPI, HTTPException
+     2: from fastapi.middleware.cors import CORSMiddleware
+     3: from pydantic import BaseModel, Field, validator
+     4: from typing import List, Optional
+     5: from datetime import datetime, timezone

～～～（omitted）～～～

+    84: @app.delete("/todos/{todo_id}", status_code=204)
+    85: def delete_todo(todo_id: int = Field(..., gt=0)):
+    86:     if not repo.delete(todo_id):
+    87:         raise HTTPException(status_code=404, detail="Todo not found")
+    88:
+    89: if __name__ == "__main__":
+    90:     import uvicorn
+    91:     uvicorn.run(app, host="127.0.0.1", port=8000)

 ⋮
 ↳ Purpose: Create improved main.py with security enhancements
Creating: /home/ubuntu/todo-fastapi/main_improved.py

 ⋮
 ● Completed in 0.1s

> ### Test Improvements

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: /home/ubuntu/todo-fastapi/test_improved.py

+      1: import requests
+      2: import json
+      3: from datetime import datetime, timedelta
+      4: from typing import Dict, Any
+      5:

～～～（omitted）～～～

+    121:         # Cleanup
+    122:         self.cleanup()
+    123:         self.test_get_todos()
+    124:
+    125: if __name__ == "__main__":
+    126:     tester = TodoAPITester()
+    127:     tester.run_all_tests()

 ⋮
 ↳ Purpose: Create improved test file with better structure
Creating: /home/ubuntu/todo-fastapi/test_improved.py

 ⋮
 ● Completed in 0.3s

> ## 📋 Summary of Improvements

### Security Improvements
• **Input validation**: Set min_length/max_length using Field()  
• **CORS configuration**: Allow specific origins only  
• **Thread safety**: Use threading.Lock for mutual exclusion  
• **Bind address**: Changed to 127.0.0.1 (restrict external access)

### Readability Improvements
• **Separation of concerns**: Moved data operations to TodoRepository class  
• **Externalized configuration**: Manage settings via environment variables or class initialization  
• **Removed duplication**: Factored common test routines into methods in the test class

### Design Improvements
• **Dependency injection**: Adopted repository pattern  
• **Test isolation**: Added cleanup functionality  
• **Error handling**: Use appropriate HTTP status codes  
• **Type safety**: Strengthened validation with Field()

The improved version is close to production quality.
```

As instructed, the AI review results were classified and displayed as follows:

| Category    | Example                                      | Handling Policy       |
|-------------|----------------------------------------------|-----------------------|
| Security    | Unhandled exceptions, hardcoded credentials  | Priority handling     |
| Readability | Naming inconsistencies, missing comments     | Consider handling     |
| Design      | Large classes, circular dependencies         | Require team consensus|

This shows how you can conduct reviews with AI. Note that AI’s automatic fix suggestions (tool executions) are at the **“proposal” level**. Always have humans approve them in your workflow.

---

## 3. Visualizing with Metrics

Reviews are qualitative activities, but Q Developer also supports quantitative management using numeric indicators. Here we explain, from a more practical perspective, **why metrics are necessary** and **how to leverage them**.

### 3.1 Role of Metrics

Metrics are tools for objectively evaluating code quality and the development process with “numbers.” They eliminate subjective “looks good” or “probably fine” and achieve the following three objectives:

1. **Visualize the current state**: Quantitatively identify areas for improvement  
2. **Measure improvement effects**: Compare with previous results to see if things got better  
3. **Share standards**: Allow the entire team to discuss using the same metrics  

Especially in AI-assisted development, generated code quality can vary, making metrics indispensable for **stabilizing quality**.

### 3.2 Key Metrics Details

Here we organize the metrics most important for evaluating code quality. These are not mere “numbers” but essential for **prioritizing quality improvements** and **building team consensus**. Understanding the purpose and meaning of each metric makes review results more actionable.

| Metric                   | Purpose                        | Threshold   | Details                                                                                                                     |
|--------------------------|--------------------------------|-------------|-----------------------------------------------------------------------------------------------------------------------------|
| **Static analysis score**| Syntax and structural soundness| 90+ points  | Composite evaluation of circular dependencies, unused code, exception handling, security issues, etc. Scoring helps prioritize improvements. |
| **Test coverage**        | Functional coverage ratio      | 80%+        | Important not just to see the number but **which functions are uncovered**. Aim for 100% on critical logic.                |
| **Comment ratio**        | Readability and documentation  | 10–20%      | More comments are not always better. The **quality** of comments explaining intent and design decisions matters.            |
| **Naming consistency**   | Adherence to naming standards  | 95%+        | Consistency in naming patterns for functions and variables reduces review time.                                             |
| **Change impact depth**  | Ease of refactoring            | Lower is better | Measures how widely a change affects other modules. Higher depth = higher maintenance cost.                                 |

### 3.3 Measuring Metrics

Since the `todo-fastapi/` module structure created previously is small, let’s use **test coverage** as an example. We measure coverage using pytest.

Command:
```
python main.py
pytest --cov=. --cov-report=xml
```

Response:
```
🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command: python main.py &
 ⋮
 ↳ Purpose: Start FastAPI server in background

 ⋮
 ● Completed in 0.1s

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
sleep 3 && pytest --cov=. --cov-report=xml
 ⋮
 ↳ Purpose: Wait for server to start and run pytest with coverage

============================= test session starts ==============================
platform linux -- Python 3.12.3, pytest-9.0.1, pluggy-1.6.0
rootdir: /home/ubuntu/todo-fastapi
plugins: anyio-4.11.0, cov-7.0.0
collected 8 items

test_api.py ..E.....                                                     [100%]

==================================== ERRORS ====================================
______________________ ERROR at setup of test_delete_todo ______________________
file /home/ubuntu/todo-fastapi/test_api.py, line 24
  def test_delete_todo(todo_id):

～～～（omitted）～～～

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
ps aux | grep "python main.py"
 ⋮
 ↳ Purpose: Check if server is running

ubuntu    222074  0.2  0.6 231596 49596 pts/7    Sl+  21:55   0:00 python main.py
ubuntu    224348  0.0  0.0   4756  3248 pts/5    S+   22:02   0:00 bash -c ps aux | grep "python main.py"
ubuntu    224350  0.0  0.0   4100  1992 pts/5    S+   22:02   0:00 grep python main.py
 ⋮
 ● Completed in 0.28s

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
curl -s http://localhost:8000/todos || echo "Server not responding"
 ⋮
 ↳ Purpose: Test server connectivity

[{"id":1,"title":"Test Todo","description":"Test description","priority":"high","due_date":"2025-11-17T21:55:47.625131","created_at":"2025-11-16T21:55:47.632922"},{"id":2,"title":"Minimal Todo","description":null,"priority":"low","due_date":null,"created_at":"2025-11-16T21:55:47.654090"},{"id":5,"title":"Test Todo","description":"Test description","priority":"high","due_date":"2025-11-17T22:02:54.546964","created_at":"2025-11-16T22:02:54.550647"},{"id":6,"title":"Minimal Todo","description":null,"priority":"low","due_date":null,"created_at":"2025-11-16T22:02:54.575022"}]
 ⋮
 ● Completed in 0.16s

> ✅ Server started and tests ran

Results:
• **Server**: Running normally (PID 222074)  
• **XML report**: Coverage XML written to file coverage.xml – success  
• **Tests**: 7 passed, 1 error (fixture issue)  
• **API**: Works correctly (Todo data present)

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
pkill -f "python main.py"
 ⋮
 ↳ Purpose: Stop the server

 ⋮
 ● Completed in 0.15s

> Server stopped. XML coverage report generated successfully.
```

This produces `coverage.xml`.

---

### 3.4 Having Q Developer Analyze coverage.xml (Interactive)

In interactive mode, request:

```
Load coverage.xml and provide:
- Coverage per function
- List of untested areas
- Recommendations for priority test cases to add
- Ranking of high-complexity functions
```

Q Developer uses internal tools (fs_read / analyze_code) and returns:
- Which functions are uncovered
- Missing branch coverage
- Lack of abnormal-case and boundary tests
- Specific test addition examples (often including parameter suggestions)

Response:
```
🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/todo-fastapi/coverage.xml, all lines
 ✓ Successfully read 4891 bytes from /home/ubuntu/todo-fastapi/coverage.xml
 ⋮
 ● Completed in 0.0s

～～～（omitted）～～～

Issue: Despite the server running, coverage for main.py remains at 0%. This is because tests only send HTTP requests, and pytest does not directly execute main.py code. This can be resolved by using TestClient.
```

Coverage isn’t collected correctly. Q Developer doesn’t just say “cannot do it”; it also provides a solution.

Following Q Developer’s suggestion, instruct it to use TestClient.

Instruction:
```
Please modify to use TestClient.
```

Response:
```
🛠️  Using tool: fs_write
 ⋮
 ● Path: test_api.py

-  0    : import requests
+      0: from fastapi.testclient import TestClient
   1,  1: import pytest
   2,  2: from datetime import datetime
+      3: from main import app
   3,  4:
-  4    : BASE_URL = "http://localhost:8000"
+      5: client = TestClient(app)
   5,  6:
   6,  7: def test_create_todo():
   7,  8:     todo_data = {
   8,  9:         "title": "Test Todo",
   9, 10:         "description": "Test description",
  10, 11:         "priority": "high",
  11, 12:         "due_date": "2025-11-17T12:00:00"
  12, 13:     }

～～～（omitted）～～～

Coverage XML written to file coverage.xml
========================= 8 passed, 1 warning in 1.17s =========================
 ⋮
 ● Completed in 1.557s

> ✅ Tests using TestClient succeeded!

Results:
• **httpx**: Installed  
• **Tests**: 8 all passed  
• **XML report**: Coverage XML written to file coverage.xml – success  
• **Execution time**: 1.17s  
• **Warnings**: Only Pydantic V1 validator warning  

Using TestClient allows API tests without starting the server, and main.py coverage can be measured.
```

With coverage now collected, request again:

```
Load coverage.xml and provide:
- Coverage per function
- List of untested areas
- Recommendations for priority test cases to add
- Ranking of high-complexity functions
```

Response:
```
🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/todo-fastapi/coverage.xml, all lines
 ✓ Successfully read 4181 bytes from /home/ubuntu/todo-fastapi/coverage.xml
 ⋮
 ● Completed in 0.0s

> ## Coverage Analysis Results

### 📊 Overall Coverage
• **Total coverage**: 97.87% (92/94 lines) - Major improvement!  
• **main.py**: 95.83% (46/48 lines)  
• **test_api.py**: 100% (46/46 lines)

### 🔍 Coverage per Function

#### main.py (95.83% coverage)
• create_todo() (lines 38–48): ✅ Fully tested  
• get_todos() (lines 49–51): ✅ Fully tested  
• delete_todo() (lines 57–63): ✅ Fully tested  
• validate_due_date() (lines 24–28): ✅ Fully tested

#### test_api.py (100% coverage)
• All test functions executed

### ❌ Untested Areas

#### main.py (only 2 untested lines)
1. Line 66: import uvicorn  
2. Line 67: uvicorn.run(app, host="0.0.0.0", port=8000)

These are in the if __name__ == "__main__" block for starting the server, not executed during tests.

### 🎯 Priority Test Case Recommendations

#### Low priority (already high coverage)
1. Add edge cases  
   • Empty string titles  
   • Extremely long title/description  
   • Boundary value tests

2. Detailed error handling tests  
   • Invalid JSON format  
   • Type conversion errors

3. Performance tests  
   • Operation with large data volumes

### 📈 High-Complexity Function Ranking

#### 1st: create_todo() (main.py lines 38–48)
• **Complexity**: High  
• **Coverage**: ✅ 100%  
• **Reason**: Global variable handling, object creation, list operations, counter management  
• **Lines**: 11

#### 2nd: delete_todo() (main.py lines 57–63)
• **Complexity**: Medium-high  
• **Coverage**: ✅ 100%  
• **Reason**: Loop processing, conditionals, exception handling, list manipulation  
• **Lines**: 7

#### 3rd: validate_due_date() (main.py lines 24–28)
• **Complexity**: Medium  
• **Coverage**: ✅ 100%  
• **Reason**: Conditional logic, datetime comparison, exception raising  
• **Lines**: 5

#### 4th: get_todos() (main.py lines 49–51)
• **Complexity**: Low  
• **Coverage**: ✅ 100%  
• **Reason**: Simple list return  
• **Lines**: 3

### 🎉 Achievements

Introducing TestClient led to dramatic improvements:  
• **Coverage**: 35.96% → 97.87% (+61.91%)  
• **main.py**: 0% → 95.83% (+95.83%)  
• **All tests**: Passed (8/8)  
• **Execution time**: Faster (no server startup required)

### 💡 Recommended Actions

1. Maintain the current state — already excellent coverage  
2. Improve code quality  
   • Migrate to Pydantic V2 (resolve warnings)  
   • Add type hints  
3. Add integration tests  
   • Combination tests for multiple operations  
4. Organize documentation  
   • Create an API specification document

Conclusion: Introducing TestClient achieved near-perfect test coverage. The remaining two lines are runtime code, so effective coverage is 100%.
```

We successfully collected coverage.

---

## 3.5 How to Leverage Metrics for Improvement

Metrics aren’t just for “looking at numbers.” Rather, metrics are **improvement navigation** that show **where improvements yield the highest impact**. Correctly understanding what the numbers indicate and linking them to next actions accelerates the quality improvement cycle.

Below is a more concrete explanation of how to connect representative metrics to improvements.

For improvement, use them as follows:

- **Low-coverage functions → Add tests**  
  Low coverage indicates insufficient tests to guarantee behavior. Prioritize adding tests for business logic and validation where bugs tend to occur.  
  *Example: create_todo() at 0% → Add normal and abnormal POST /todos tests*

- **High-complexity functions → Refactor into smaller units**  
  High-complexity functions are harder to read, more error-prone, and difficult to test. Splitting responsibilities or factoring common logic into methods improves readability and testability.  
  *Example: create_todo() mixes state management, validation, and registration → Separate by role*

- **Naming inconsistencies → Provide coding standards to AI for consistency**  
  Naming variations increase cognitive load and review time. Supplying naming conventions (e.g., snake_case / camelCase, abbreviation rules) to Q Developer allows it to automatically flag inconsistencies and even generate renaming suggestions tailored to the project.

- **High change impact depth → Consider redesign**  
  A state where “changing this function breaks 10 other files” indicates low maintainability. Reorganize dependencies, separate responsibilities, and clarify architectural layers to intentionally limit the impact scope.

Moreover, because metrics allow you to **explain why an improvement is necessary using numbers**, it becomes easier to propose changes to the team. Quantification clarifies improvement points and facilitates consensus.

In this way, by quantitatively gauging how much code is covered, you can maintain quality while extending and verifying functionality.

---

## 4. Metric-Driven Hybrid Review Operation Model

This is an operational model for **running a quality assurance cycle around quantitative metrics**, leveraging both AI and human strengths. Traditional reviews relied on human experience and intuition, but introducing metrics enables “unified perspectives,” “effect measurement,” and “improvement prioritization.” Combined with AI, this supports sustainable quality assurance.

AI reviews excel in coverage and speed, while metrics provide improvement guidance. Final judgment is made by humans, establishing reproducible and sustainable quality assurance through **AI × metrics × human judgment**.

---

## Conclusion

The greatest achievement this time is that **we can now evaluate quality “quantitatively” using metrics**. This transforms previously intuitive and subjective review activities into an objective improvement cycle driven by numbers.

In particular, the following points represent significant progress:
- Indicators such as static analysis score, coverage, complexity, and naming consistency visualize review “gaps.”  
- Based on numbers, you can decide “what to fix first,” improving the efficiency of improvement activities.  
- Combining AI review suggestions with human judgment provides a foundation for continuously running the quality improvement process.

As a result, variability in review accuracy is reduced, bringing us closer to a state where **quality improvement PDCA cycles run based on data**.

We hope this serves as a useful reference for your generative AI initiatives.

---

<style>
img {
  border: 1px gray solid;
}
</style>
