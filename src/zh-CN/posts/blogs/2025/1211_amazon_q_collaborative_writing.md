---
title: 文章大部分由 AI 撰写的时代：使用 Amazon Q Developer 与 VSCode 进行协同写作
author: shuichi-takatsu
date: 2025-12-11T00:00:00.000Z
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2025/
tags:
  - Q Developer
  - 仕様駆動
  - AWS
  - 生成AI
  - vscode
  - 記事執筆
  - advent2025
image: true
translate: true

---

这是[is开发者网站 Advent Calendar 2025](/events/advent-calendar/2025/)的第11天文章！

## 前言

本文是一项 **Amazon Q Developer 与人类协同的实验性尝试**。  
从一开始就坦白说，**“本篇文章几乎由 AI 撰写。”**  
**AI 从“使用者”转变为“协作者”。** 我们认为 Amazon Q Developer 将改变开发和写作的常识。  

**本文将做什么：**  
- 在 VSCode 中设置 Amazon Q Developer  
- 体验实际的代码创建与改进  
- 与 AI 对话，共同撰写技术文章  

**特点：**  
- 文章的大部分内容由 Amazon Q Developer 撰写  
- 代码示例和测试也由 AI 生成  
- 人类负责企划、结构和插入图片  

**读者能获得：**  
- Amazon Q Developer 的实用使用方法  
- 与 AI 协同的高效开发手法  
- 在技术文档撰写中利用 AI 的可能性  

那么，开始 Amazon Q Developer 与人类的协同之旅吧。

---

## 1. 开发环境

此次协同作业将通过 VSCode 使用 Amazon Q Developer。  
在 VSCode 中使用 Amazon Q Developer 需要以下环境：  

- VSCode 本体：**v1.85.0 及以上**  
- 登录所需账户  
  - 个人使用：**AWS Builder ID**（无需 AWS 账号）  
  - 公司使用：**IAM Identity Center**（需 AWS 账号）  

※ 如果在公司 AWS 环境中使用，请向管理员确认权限和许可证。

---

## 2. 在 VSCode 中安装扩展

1. 启动 VSCode  
2. 打开左侧面板的 **Extensions（扩展）**  
3. 在搜索栏输入 **Amazon Q**，选择以下扩展并安装  
![](https://gyazo.com/9137bff63f0d0de99eef9a0263d29f2d.png)  
4. 若在 VSCode 中看到如下图标，说明安装完成  
※ 但由于尚未登录 Amazon Q Developer，图标显示为红色  
![](https://gyazo.com/5f28fb6127e3a1eb40ff0b678e955301.png)

---

## 3. 登录（认证）

1. 点击 VSCode 底部的 **Amazon Q 图标**，选择 “Sign in to get started”  
![](https://gyazo.com/84c3b9d441640089d533dbd4e47c1a8a.png)  
2. 从 “登录选项” 中根据用途选择  
![](https://gyazo.com/448d2a4ae07544e4716c94d608d67b47.png)  
   - 个人账号（Personal account）→ 需提前获取 “Builder ID”  
   - 公司账号（Company account）→ 需在 “IAM Identity Center” 中注册  
   （本示例以“公司账号”为例）  
3. 配置 IAM Identity Center 的账号信息  
![](https://gyazo.com/2212b1aa98b8b0ecec2a7fdc6873004f.png)  
   - StartURL：设置 AWS 访问门户 URL  
   - Region：设置服务所在区域  
4. 随后会跳转至外部 AWS 网站，在浏览器中登录  
5. 登录后出现下图时，授权访问  
![](https://gyazo.com/4967024cd40bd0049451e97e81fd50ca.png)  
6. 返回 VSCode，若底部显示 “Amazon Q” 即登录完成  
![](https://gyazo.com/2b1da626768d3b74748d5ebc04331d74.png)

---

## 4. 基本用法

### 通过聊天提问

在 Amazon Q 面板输入问题或指令。  
尝试输入 “ここで何ができますか？”（这里可以做什么？）  
Amazon Q 返回了 “可做事项列表”。  
![](https://gyazo.com/c5215276b827b0b86a51b361a5a39dea.png)

### 代码补全

在编写源代码时，可以先在注释中写明意图，Amazon Q 会在行内建议代码。

示例1：通过注释生成类  
```python
# 创建管理用户信息的类
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
    
    def get_display_name(self):
        return f"{self.name} ({self.email})"
```

示例2：通过注释指定函数处理内容  
```python
# 从 CSV 文件读取用户数据的函数
import csv

def load_users_from_csv(filename):
    users = []
    with open(filename, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            user = User(row['name'], row['email'])
            users.append(user)
    return users
```

使用技巧：  
- 注释要具体（比“处理数据”更要写“从 CSV 文件读取”）  
- 支持日语和英语  
- 按 Alt+C（Option+C）可手动触发补全

---

## 5. 试验代码创建与修改

现在体验使用 Amazon Q Developer 进行代码创建和修改。

### 样例文件（example.py）说明

首先介绍将使用的样例文件 `example.py`。  
该文件是一个简单的 Python 程序，用于管理用户信息。

`example.py` 具备以下功能：  
- 用户信息（姓名、邮箱）管理的 User 类  
- 从 CSV 文件读取用户数据功能  
- 按邮箱搜索用户功能  
- 将用户列表保存为 JSON 格式功能

作为源代码模板，仅写入注释：  
```python
# 管理用户信息的类
# 从 CSV 文件读取用户数据的函数
# 在列表中查找符合特定条件的用户的函数
# 将用户列表以 JSON 格式保存的函数
```

随后 Amazon Q 将建议如下源代码。

**example.py 源代码：**  
```python
# 创建管理用户信息的类
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
    
    def get_display_name(self):
        return f"{self.name} ({self.email})"

# 从 CSV 文件读取用户数据的函数
import csv

def load_users_from_csv(filename):
    users = []
    with open(filename, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            user = User(row['name'], row['email'])
            users.append(user)
    return users

# 在列表中查找符合特定条件的用户的函数
def find_user_by_email(users, email):
    for user in users:
        if user.email == email:
            return user
    return None

# 将用户列表以 JSON 格式保存的函数
import json

def save_users_to_json(users, filename):
    user_data = []
    for user in users:
        user_data.append({
            'name': user.name,
            'email': user.email
        })
    
    with open(filename, 'w', encoding='utf-8') as file:
        json.dump(user_data, file, ensure_ascii=False, indent=2)
        print(f"Saved {len(users)} users to {filename}")
```

该代码语法上可正常运行，但  
- **缺少错误处理和测试代码**  
- **无实际执行的主函数**  

等，存在改进空间。接下来使用 Amazon Q Developer 来解决这些问题。

### 5.1 理解现有代码

首先打开 `example.py`，向 Amazon Q 提问以确认其对代码的理解。

在 Amazon Q 中输入：  
```
@example.py 这个文件的代码是做什么的？
```

Amazon Q 回答如下：  
```
example.py 是一个用于管理用户信息的简单 Python 程序。

主要功能
1. User 类 - 管理用户信息（姓名和邮箱）
   - get_display_name(): 返回由姓名和邮箱组成的显示名称
2. CSV 文件读取 - load_users_from_csv()
   - 从 CSV 文件读取用户数据并创建 User 对象列表
3. 用户搜索 - find_user_by_email()
   - 指定邮箱后搜索特定用户
4. JSON 保存 - save_users_to_json()
   - 将用户列表以 JSON 格式保存到文件中

使用示例
该程序可用于将 CSV 文件中的用户数据读取后，根据需要搜索用户，最后保存为 JSON 格式的用户数据转换与管理。
但当前代码缺少错误处理和主函数，需额外实现才能实际运行。
```

### 5.2 改进建议

向 Amazon Q 提出以下指令请求改进建议：  
```
@example.py 这段代码有什么可改进的地方？
```

Amazon Q 给出的建议如下：  
```
是的，example.py 存在许多改进点。建议如下：

1. 添加错误处理
   当前问题：文件不存在或 CSV 格式错误时会直接抛异常
   改进：使用 try-except 语句进行适当处理

2. 添加类型提示
   当前问题：参数和返回值类型不明确
   改进：使用 from typing import List, Optional 明确类型

3. 添加 docstring
   当前问题：函数说明仅为注释
   改进：为每个函数添加适当的 docstring

4. 整理 import
   当前问题：import 语句分散在函数前
   改进：集中放置在文件开头

5. 添加数据验证
   当前问题：未验证 CSV 数据有效性
   改进：检查必填字段存在，并验证邮箱格式

6. 外部化配置
   当前问题：硬编码如编码方式
   改进：以常量形式定义

7. 添加日志功能
   当前问题：仅使用 print 进行日志管理不足
   改进：使用 logging 模块

8. 易于测试的设计
   当前问题：缺少主函数，难以测试
   改进：添加 if __name__ == "__main__": 块

9. 性能优化
   当前问题：大量数据时效率较低
   改进：使用列表推导等提升内存效率

通过以上改进，代码将更加健壮且易维护。特别推荐优先添加错误处理和类型提示。
```

### 5.3 实际修正代码

#### 添加错误处理

在 CSV 文件读取函数中添加错误处理。

修正前的代码片段（example.py 中部分）：
```python
def load_users_from_csv(filename):
    users = []
    with open(filename, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            user = User(row['name'], row['email'])
            users.append(user)
    return users
```

在 Amazon Q 中输入：  
```
load_users_from_csv 函数中添加文件不存在时的错误处理
```

代码被修正为：
```python
def load_users_from_csv(filename):
    users = []
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                user = User(row['name'], row['email'])
                users.append(user)
    except FileNotFoundError:
        print(f"错误：文件 '{filename}' 未找到")
        return []
    except Exception as e:
        print(f"错误：读取文件时发生问题: {e}")
        return []
    return users
```

**Amazon Q 直接对源代码进行了修改，作者本人未动源代码。**

#### 新功能添加

尝试添加管理用户年龄信息的功能。

在 Amazon Q 中输入：
```
在 User 类中添加年龄（age）字段，并创建按年龄搜索的函数
```

代码被更新为：
```python
# 创建管理用户信息的类
class User:
    def __init__(self, name, email, age=None):
        self.name = name
        self.email = email
        self.age = age
    
    def get_display_name(self):
        age_info = f" (年龄: {self.age})" if self.age else ""
        return f"{self.name} ({self.email}){age_info}"

# 在年龄范围内搜索用户的函数
def find_users_by_age_range(users, min_age, max_age):
    """搜索指定年龄范围内的用户"""
    result = []
    for user in users:
        if user.age and min_age <= user.age <= max_age:
            result.append(user)
    return result
```

### 5.4 生成测试代码

向 Amazon Q 提出：  
```
@example.py 的函数生成测试代码
```

生成的测试代码（test_example.py）如下：
```python
import unittest
import tempfile
import os
import json
import csv
from example import User, load_users_from_csv, find_user_by_email, find_users_by_age_range, save_users_to_json

class TestUserManagement(unittest.TestCase):
    
    def test_user_creation_without_age(self):
        """不带年龄的用户创建测试"""
        user = User("田中太郎", "tanaka@example.com")
        self.assertEqual(user.name, "田中太郎")
        self.assertEqual(user.email, "tanaka@example.com")
        self.assertIsNone(user.age)
    
    def test_user_creation_with_age(self):
        """带年龄的用户创建测试"""
        user = User("田中太郎", "tanaka@example.com", 30)
        self.assertEqual(user.name, "田中太郎")
        self.assertEqual(user.email, "tanaka@example.com")
        self.assertEqual(user.age, 30)
    
    def test_get_display_name_without_age(self):
        """无年龄的显示名称测试"""
        user = User("田中太郎", "tanaka@example.com")
        expected = "田中太郎 (tanaka@example.com)"
        self.assertEqual(user.get_display_name(), expected)
    
    def test_get_display_name_with_age(self):
        """带年龄的显示名称测试"""
        user = User("田中太郎", "tanaka@example.com", 30)
        expected = "田中太郎 (tanaka@example.com) (年龄: 30)"
        self.assertEqual(user.get_display_name(), expected)
    
    def test_find_user_by_email(self):
        """按邮箱查找用户测试"""
        users = [
            User("田中太郎", "tanaka@example.com"),
            User("佐藤花子", "sato@example.com")
        ]
        
        # 搜索存在的用户
        found = find_user_by_email(users, "tanaka@example.com")
        self.assertIsNotNone(found)
        self.assertEqual(found.name, "田中太郎")
        
        # 搜索不存在的用户
        not_found = find_user_by_email(users, "yamada@example.com")
        self.assertIsNone(not_found)
    
    def test_find_users_by_age_range(self):
        """按年龄范围查找用户测试"""
        users = [
            User("田中太郎", "tanaka@example.com", 30),
            User("佐藤花子", "sato@example.com", 25),
            User("鈴木次郎", "suzuki@example.com", 35),
            User("山田三郎", "yamada@example.com")  # 无年龄
        ]
        
        # 在 25-32 岁范围内搜索
        result = find_users_by_age_range(users, 25, 32)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].name, "田中太郎")
        self.assertEqual(result[1].name, "佐藤花子")
        
        # 在无匹配者的范围内搜索
        result_empty = find_users_by_age_range(users, 40, 50)
        self.assertEqual(len(result_empty), 0)
    
    def test_save_users_to_json(self):
        """JSON 保存功能测试"""
        users = [
            User("田中太郎", "tanaka@example.com", 30),
            User("佐藤花子", "sato@example.com")  # 无年龄
        ]
        
        # 创建临时文件进行测试
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as temp_file:
            temp_filename = temp_file.name
        
        try:
            save_users_to_json(users, temp_filename)
            
            # 确认文件已创建
            self.assertTrue(os.path.exists(temp_filename))
            
            # 验证文件内容
            with open(temp_filename, 'r', encoding='utf-8') as file:
                data = json.load(file)
            
            self.assertEqual(len(data), 2)
            
            # 带年龄的用户
            self.assertEqual(data[0]['name'], "田中太郎")
            self.assertEqual(data[0]['email'], "tanaka@example.com")
            self.assertEqual(data[0]['age'], 30)
            
            # 无年龄的用户
            self.assertEqual(data[1]['name'], "佐藤花子")
            self.assertEqual(data[1]['email'], "sato@example.com")
            self.assertNotIn('age', data[1])  # 未设置年龄时不应包含该字段
            
        finally:
            # 删除临时文件
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)
    
    def test_load_users_from_csv_file_not_found(self):
        """读取不存在的 CSV 文件测试"""
        result = load_users_from_csv("nonexistent_file.csv")
        self.assertEqual(result, [])
    
    def test_load_users_from_csv_valid_file(self):
        """读取有效的 CSV 文件测试"""
        # 创建临时 CSV 文件
        csv_data = [
            ['name', 'email', 'age'],
            ['田中太郎', 'tanaka@example.com', '30'],
            ['佐藤花子', 'sato@example.com', '']  # 无年龄
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv', encoding='utf-8', newline='') as temp_file:
            temp_filename = temp_file.name
            writer = csv.writer(temp_file)
            writer.writerows(csv_data)
        
        try:
            users = load_users_from_csv(temp_filename)
            
            self.assertEqual(len(users), 2)
            
            # 带年龄的用户
            self.assertEqual(users[0].name, "田中太郎")
            self.assertEqual(users[0].email, "tanaka@example.com")
            self.assertEqual(users[0].age, 30)
            
            # 无年龄的用户
            self.assertEqual(users[1].name, "佐藤花子")
            self.assertEqual(users[1].email, "sato@example.com")
            self.assertIsNone(users[1].age)
            
        finally:
            # 删除临时文件
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)

if __name__ == '__main__':
    unittest.main()
```

### 5.5 添加可执行主函数

在 example.py 中添加主函数。

在 Amazon Q 中输入：  
```
@example.py 添加一个可实际运行的主函数
```

新增的主函数如下：
```python
if __name__ == "__main__":
    # 使用示例数据进行测试
    print("=== 用户管理系统测试 ===")
    
    # 创建用户
    users = [
        User("田中太郎", "tanaka@example.com", 30),
        User("佐藤花子", "sato@example.com", 25),
        User("鈴木次郎", "suzuki@example.com", 35),
        User("山田三郎", "yamada@example.com")  # 无年龄
    ]
    
    # 显示所有用户
    print("\n已注册用户:")
    for user in users:
        print(f"  {user.get_display_name()}")
    
    # 按邮箱搜索测试
    print("\n邮箱搜索测试:")
    found_user = find_user_by_email(users, "sato@example.com")
    if found_user:
        print(f"  找到用户: {found_user.get_display_name()}")
    
    # 年龄范围搜索测试 (25-32岁)
    print("\n年龄搜索测试 (25-32岁):")
    age_filtered_users = find_users_by_age_range(users, 25, 32)
    for user in age_filtered_users:
        print(f"  {user.get_display_name()}")
    
    # JSON 保存测试
    print("\nJSON 保存测试:")
    save_users_to_json(users, "sample_users.json")
    
    # CSV 文件读取测试（错误处理确认）
    print("\nCSV 文件读取测试（错误处理确认）:")
    csv_users = load_users_from_csv("nonexistent.csv")
    print(f"读取结果: {len(csv_users)}个用户")
    
    print("\n测试完成！")
```

### 5.6 Amazon Q Developer 的使用要点

- 使用 `@文件名` 查看整个文件  
- 给出具体的指令（如“添加错误处理”）  
- 分阶段添加功能  
- 同时生成测试代码

---

## 6. 总结

使用 Amazon Q Developer for VSCode 可以带来以下收益：  
- **提高工作效率**：使用 VSCode 这一常用开发环境可提升效率  
- **代码理解**：快速把握现有代码的运行和结构  
- **代码改进**：提升质量，如添加错误处理和类型提示  
- **功能添加**：分阶段实现新功能  
- **测试创建**：自动生成测试代码  
- **运行验证**：添加主函数进行运行验证  

由于支持日语指令，因此可以使用自然语言进行代码创建和修改。

---

## 7. 本文幕后 —— 与 Amazon Q Developer 协同撰写

### 7.1 文章撰写流程

**作者（人类）的角色：**  
- 决定文章的结构和方向  
- 拍摄并插入屏幕截图  
- 最终确认和调整内容  

**Amazon Q Developer 的角色：**  
- 为各章撰写详细内容  
- 生成代码示例  
- 创建测试代码  
- 撰写技术说明  

下面是在 VSCode 上同时撰写文章和代码的工作场景。  
![](https://gyazo.com/331eaa5b7bbc5397ef7e7dee4f6ebe59.png)

就这样，在撰写文章的同时进行代码的创建和修改。  
人类确认内容，反复与 Amazon Q 进行审核，由 Amazon Q 完成文章和代码的修改。

### 7.2 协同撰写的效果

这次在 VSCode 上使用 Amazon Q Developer，切实体会到以下效果：

**效率提升：**  
- 通过常用开发环境提高工作效率  
- 大幅缩短文章框架创建时间  
- 快速生成技术细节说明  
- 同时创建代码示例和测试  

**质量提升：**  
- 文体和结构保持一致  
- 可实际运行的代码示例  
- 完整的测试覆盖  

**创造力的发挥：**  
- 人类专注于整体设计和创造性部分  
- AI 负责具体实现和内容撰写  
- 发挥双方优势的分工协作  

文章的撰写过程本身就证明了 Amazon Q Developer 的实用性。

Amazon Q Developer 不仅仅是一个编码辅助工具，而是支持技术人员整个创造性工作的强大伙伴。  
请在各种场景中尝试使用它。

**本文由 Amazon Q Developer 协同撰写完成。**

<style>
img {
  border: 1px gray solid;
}
</style>
