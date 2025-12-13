---
title: >-
  The Era When AI Writes Most of an Article: Collaborative Writing with Amazon Q
  Developer and VSCode
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

This is the Day 11 article of the [Mamezou Developer Site Advent Calendar 2025](/events/advent-calendar/2025/)!

## Introduction

This article is an experimental initiative of **collaboration between Amazon Q Developer and humans**.  
Spoiler alert from the start: **"This article is mostly written by AI."**  
**From being an ‘AI user’ to an ‘AI collaborator’.** I believe that Amazon Q Developer will change the conventional norms of development and writing.

**What we'll do:**
- Set up Amazon Q Developer in VSCode
- Experience actual code creation and improvement
- Co-write a technical article through interaction with AI

**Key Features:**
- Amazon Q Developer writes most of the article
- AI generates code samples and tests
- Humans take charge of planning, structuring, and inserting images

**What readers will gain:**
- Practical ways to use Amazon Q Developer
- Efficient development methods through AI collaboration
- Potential uses of AI in technical documentation

Now, let's begin the collaborative journey with Amazon Q Developer and humans.

---

## 1. Development Environment

In this collaborative work, we'll use Amazon Q Developer from VSCode.  
The following environment is required to use Amazon Q Developer in VSCode:

- VSCode itself: **v1.85.0 or above**
- Account for sign-in  
  - Personal use: **AWS Builder ID** (no AWS account required)  
  - Company use: **IAM Identity Center** (AWS account required)

Note: If you're using it in a company's AWS environment, it's a good idea to check permissions and licenses with your administrator.

---

## 2. Installing the Extension in VSCode

1. Launch VSCode  
2. Open the **Extensions** panel in the left sidebar  
3. Type **Amazon Q** in the search box, select the following extension, and install it  
![](https://gyazo.com/9137bff63f0d0de99eef9a0263d29f2d.png)  
4. If an icon like the following appears in VSCode, the installation is complete  
Note: The icon is still red because you haven't logged in to Amazon Q Developer yet  
![](https://gyazo.com/5f28fb6127e3a1eb40ff0b678e955301.png)

---

## 3. Signing In (Authentication)

1. Click the **Amazon Q icon** at the bottom of VSCode and select "Sign in to get started"  
![](https://gyazo.com/84c3b9d441640089d533dbd4e47c1a8a.png)  
2. Choose the appropriate option under "Sign-in Options"  
![](https://gyazo.com/448d2a4ae07544e4716c94d608d67b47.png)  
   - For personal use → Obtain a "Builder ID" in advance  
   - For company use → Register in "IAM Identity Center" in advance  
   (We'll proceed with the company option here)  
3. Enter your IAM Identity Center account information  
![](https://gyazo.com/2212b1aa98b8b0ecec2a7fdc6873004f.png)  
   - StartURL: Set the AWS access portal URL  
   - Region: Set the service region  
4. You will be redirected to an external AWS site; log in via your browser  
5. When the following screen appears, allow access  
![](https://gyazo.com/4967024cd40bd0049451e97e81fd50ca.png)  
6. Return to VSCode. If "Amazon Q" is displayed as shown below, the sign-in is complete  
![](https://gyazo.com/2b1da626768d3b74748d5ebc04331d74.png)

---

## 4. Basic Usage

### Asking Questions in Chat

Enter questions or instructions in the Amazon Q panel.  
Try asking, "What can I do here?"  
Amazon Q responded with a list of available features:  
![](https://gyazo.com/c5215276b827b0b86a51b361a5a39dea.png)

### Code Completion

When writing source code, if you leave comments describing your intent instead of writing the code, Amazon Q will suggest inline code completions.

Example 1: Generating a class from a comment
```python
# Create a class to manage user information
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
    
    def get_display_name(self):
        return f"{self.name} ({self.email})"
```

Example 2: Specifying function behavior in comments
```python
# Function to load user data from a CSV file
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

Tips for effective use:
- Write comments specifically (e.g., "load from CSV file" rather than "process data")
- Works with both Japanese and English
- Manual completion is also available with Alt+C (Option+C)

---

## 5. Experimenting with Code Creation and Modification

Let's experience actual code creation and modification with Amazon Q Developer.

### About the Sample File (example.py)

First, let's explain the sample file `example.py` we'll be using. This file is a simple Python program for managing user information.

The functionality of example.py includes:
- A User class that manages user information (name, email)
- Functionality to load user data from a CSV file
- Functionality to search for a user by email address
- Functionality to save the user list in JSON format

As a code skeleton, only the comments are written:
```python
# Create a class to manage user information
# Function to load user data from a CSV file
# Function to search for users matching specific criteria in a list
# Function to save a user list in JSON format
```

Amazon Q then suggests the following source code:

**example.py source code:**
```python
# Create a class to manage user information
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
    
    def get_display_name(self):
        return f"{self.name} ({self.email})"

# Function to load user data from a CSV file
import csv

def load_users_from_csv(filename):
    users = []
    with open(filename, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            user = User(row['name'], row['email'])
            users.append(user)
    return users

# Function to search for users matching specific criteria in a list
def find_user_by_email(users, email):
    for user in users:
        if user.email == email:
            return user
    return None

# Function to save a user list in JSON format
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

This code works syntactically, but:
- **It lacks error handling and test code.**
- **It has no executable main process.**

There is room for improvement in these areas. We will use Amazon Q Developer to address these issues.

### 5.1 Understanding the Existing Code

First, open the example.py file and ask Amazon Q about its contents to confirm that it understands the code correctly.

Give the following instruction to Amazon Q:
```
@example.py What does this file do?
```

Amazon Q provides the following answer:
```
example.py is a simple Python program to manage user information.

Main features
1. User class - Manages user information (name and email address)
- get_display_name(): Returns a display name combining the user's name and email address
2. CSV file loading - load_users_from_csv()
- Reads user data from a CSV file and creates a list of User objects
3. User search - find_user_by_email()
- Searches for a specific user by email address
4. Save in JSON format - save_users_to_json()
- Saves the user list to a file in JSON format

Usage example
This program can be used for user data management and transformation tasks, such as reading user data from a CSV file, searching for users as needed, and finally saving in JSON format.
However, since the current code lacks error handling and a main routine, additional implementation is required to make it runnable.
```

### 5.2 Suggestions for Code Improvement

Let's ask for improvement suggestions for the existing code.

Give the following instruction to Amazon Q:
```
@example.py Do you have any suggestions for improving this code?
```

Amazon Q responds with:
```
Yes, example.py has many areas for improvement. Here are some recommended enhancements:

1. Add error handling  
Current issue: The program stops with an error if the file doesn't exist or the CSV format is incorrect  
Suggestion: Use try-except statements to handle errors appropriately

2. Add type hints  
Current issue: Argument and return types are unclear  
Suggestion: Use from typing import List, Optional to explicitly specify types

3. Add docstrings  
Current issue: Function explanations are only in comments  
Suggestion: Add appropriate docstrings to each function

4. Organize imports  
Current issue: import statements are scattered right before functions  
Suggestion: Group imports at the top of the file

5. Add data validation  
Current issue: No validation for CSV data  
Suggestion: Check for required fields and validate email address formats

6. Externalize configuration  
Current issue: Hardcoded settings like encoding  
Suggestion: Define them as constants

7. Add logging  
Current issue: print statements alone are insufficient for log management  
Suggestion: Use the logging module

8. Design for testability  
Current issue: No main routine, making testing difficult  
Suggestion: Add an if __name__ == "__main__": block

9. Performance improvements  
Current issue: Inefficient for processing large datasets  
Suggestion: Use list comprehensions and improve memory efficiency

Implementing these improvements will make the code more robust and maintainable. In particular, adding error handling and type hints should be prioritized.
```

### 5.3 Actual Code Refactoring

#### Adding Error Handling

The original code (a portion of example.py) before modification is:
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

Give the following instruction to Amazon Q:
```
Please add error handling to the load_users_from_csv function for when the file does not exist
```

The code was modified as follows:
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
        print(f"Error: File '{filename}' not found")
        return []
    except Exception as e:
        print(f"Error: An issue occurred while reading the file: {e}")
        return []
    return users
```

Amazon Q directly modified the source code, and I (the human) did not touch the source code at all.

#### Adding a New Feature

Let's add functionality to manage the user's age information.

Give the following instruction to Amazon Q:
```
Please add an age field to the User class and create a function to search by age
```

The code additions are as follows:
```python
# Create a class to manage user information
class User:
    def __init__(self, name, email, age=None):
        self.name = name
        self.email = email
        self.age = age
    
    def get_display_name(self):
        age_info = f" (age: {self.age})" if self.age else ""
        return f"{self.name} ({self.email}){age_info}"

# Function to search users by an age range
def find_users_by_age_range(users, min_age, max_age):
    """Search users within the specified age range"""
    result = []
    for user in users:
        if user.age and min_age <= user.age <= max_age:
            result.append(user)
    return result
```

### 5.4 Generating Test Code

Let's add test code for the functions.

Give the following instruction to Amazon Q:
```
Please create test code to test the functions in @example.py
```

The generated test code (test_example.py) is:
```python
import unittest
import tempfile
import os
import json
import csv
from example import User, load_users_from_csv, find_user_by_email, find_users_by_age_range, save_users_to_json

class TestUserManagement(unittest.TestCase):
    
    def test_user_creation_without_age(self):
        """Test user creation without age"""
        user = User("田中太郎", "tanaka@example.com")
        self.assertEqual(user.name, "田中太郎")
        self.assertEqual(user.email, "tanaka@example.com")
        self.assertIsNone(user.age)
    
    def test_user_creation_with_age(self):
        """Test user creation with age"""
        user = User("田中太郎", "tanaka@example.com", 30)
        self.assertEqual(user.name, "田中太郎")
        self.assertEqual(user.email, "tanaka@example.com")
        self.assertEqual(user.age, 30)
    
    def test_get_display_name_without_age(self):
        """Test display name without age"""
        user = User("田中太郎", "tanaka@example.com")
        expected = "田中太郎 (tanaka@example.com)"
        self.assertEqual(user.get_display_name(), expected)
    
    def test_get_display_name_with_age(self):
        """Test display name with age"""
        user = User("田中太郎", "tanaka@example.com", 30)
        expected = "田中太郎 (tanaka@example.com) (age: 30)"
        self.assertEqual(user.get_display_name(), expected)
    
    def test_find_user_by_email(self):
        """Test user search by email"""
        users = [
            User("田中太郎", "tanaka@example.com"),
            User("佐藤花子", "sato@example.com")
        ]
        
        # Search for an existing user
        found = find_user_by_email(users, "tanaka@example.com")
        self.assertIsNotNone(found)
        self.assertEqual(found.name, "田中太郎")
        
        # Search for a non-existing user
        not_found = find_user_by_email(users, "yamada@example.com")
        self.assertIsNone(not_found)
    
    def test_find_users_by_age_range(self):
        """Test user search by age range"""
        users = [
            User("田中太郎", "tanaka@example.com", 30),
            User("佐藤花子", "sato@example.com", 25),
            User("鈴木次郎", "suzuki@example.com", 35),
            User("山田三郎", "yamada@example.com")  # No age
        ]
        
        # Search within the 25-32 age range
        result = find_users_by_age_range(users, 25, 32)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].name, "田中太郎")
        self.assertEqual(result[1].name, "佐藤花子")
        
        # Search within a range with no matches
        result_empty = find_users_by_age_range(users, 40, 50)
        self.assertEqual(len(result_empty), 0)
    
    def test_save_users_to_json(self):
        """Test JSON save functionality"""
        users = [
            User("田中太郎", "tanaka@example.com", 30),
            User("佐藤花子", "sato@example.com")  # No age
        ]
        
        # Create a temporary file for testing
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as temp_file:
            temp_filename = temp_file.name
        
        try:
            save_users_to_json(users, temp_filename)
            
            # Confirm that the file was created
            self.assertTrue(os.path.exists(temp_filename))
            
            # Check the file contents
            with open(temp_filename, 'r', encoding='utf-8') as file:
                data = json.load(file)
            
            self.assertEqual(len(data), 2)
            
            # User with age
            self.assertEqual(data[0]['name'], "田中太郎")
            self.assertEqual(data[0]['email'], "tanaka@example.com")
            self.assertEqual(data[0]['age'], 30)
            
            # User without age
            self.assertEqual(data[1]['name'], "佐藤花子")
            self.assertEqual(data[1]['email'], "sato@example.com")
            self.assertNotIn('age', data[1])  # 'age' should not be included if not set
            
        finally:
            # Delete the temporary file
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)
    
    def test_load_users_from_csv_file_not_found(self):
        """Test loading a nonexistent CSV file"""
        result = load_users_from_csv("nonexistent_file.csv")
        self.assertEqual(result, [])
    
    def test_load_users_from_csv_valid_file(self):
        """Test loading a valid CSV file"""
        # Create a temporary CSV file
        csv_data = [
            ['name', 'email', 'age'],
            ['田中太郎', 'tanaka@example.com', '30'],
            ['佐藤花子', 'sato@example.com', '']  # No age
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv', encoding='utf-8', newline='') as temp_file:
            temp_filename = temp_file.name
            writer = csv.writer(temp_file)
            writer.writerows(csv_data)
        
        try:
            users = load_users_from_csv(temp_filename)
            
            self.assertEqual(len(users), 2)
            
            # User with age
            self.assertEqual(users[0].name, "田中太郎")
            self.assertEqual(users[0].email, "tanaka@example.com")
            self.assertEqual(users[0].age, 30)
            
            # User without age
            self.assertEqual(users[1].name, "佐藤花子")
            self.assertEqual(users[1].email, "sato@example.com")
            self.assertIsNone(users[1].age)
            
        finally:
            # Delete the temporary file
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)

if __name__ == '__main__':
    unittest.main()
```

### 5.5 Adding an Executable Main Process

Since example.py has no main process, let's add one.

Give the following instruction to Amazon Q:
```
Please add a runnable main process to @example.py for verification
```

The added main process is:
```python
if __name__ == "__main__":
    # Test with sample data
    print("=== Test of the User Management System ===")
    
    # Create users
    users = [
        User("田中太郎", "tanaka@example.com", 30),
        User("佐藤花子", "sato@example.com", 25),
        User("鈴木次郎", "suzuki@example.com", 35),
        User("山田三郎", "yamada@example.com")  # No age
    ]
    
    # Display all users
    print("\nRegistered users:")
    for user in users:
        print(f"  {user.get_display_name()}")
    
    # Search by email
    print("\nEmail search test:")
    found_user = find_user_by_email(users, "sato@example.com")
    if found_user:
        print(f"  Found: {found_user.get_display_name()}")
    
    # Search by age range
    print("\nAge search test (25-32):")
    age_filtered_users = find_users_by_age_range(users, 25, 32)
    for user in age_filtered_users:
        print(f"  {user.get_display_name()}")
    
    # JSON save test
    print("\nJSON save test:")
    save_users_to_json(users, "sample_users.json")
    
    # Test loading a nonexistent CSV file (error handling check)
    print("\nCSV file loading test (error handling check):")
    csv_users = load_users_from_csv("nonexistent.csv")
    print(f"Load result: {len(csv_users)} users")
    
    print("\nTests complete!")
```

### 5.6 Key Points for Using Amazon Q Developer

Here are some **efficient usage tips** for Amazon Q:
- Use `@filename` to reference the entire file
- Give specific instructions (e.g., "Add error handling")
- Add features step by step
- Have it generate test code as well

In this way, by using Amazon Q Developer, you can efficiently go from understanding existing code to making improvements, adding new features, and creating tests.

---

## 6. Conclusion

By using Amazon Q Developer for VSCode, you can expect the following:
- **Increased productivity**: Using the standard development environment VSCode improves workflow efficiency
- **Code comprehension**: Quickly grasp the behavior and structure of existing code
- **Code improvement**: Enhance quality with error handling and type hints
- **Feature addition**: Implement new features incrementally
- **Test creation**: Automatically generate test code
- **Execution verification**: Add a main process for runtime verification

It also supports instructions in Japanese, allowing you to create and modify code in natural language.

---

## 7. Behind the Scenes of This Article — Collaborative Writing with Amazon Q Developer

This article was created through dialogue with Amazon Q Developer.  
Let's introduce the article writing process.

### 7.1 Article Creation Process

**Roles of the human (author):**
- Deciding on the structure and direction of the article
- Capturing and inserting screenshots
- Final review and adjustments of the content

**Roles of Amazon Q Developer:**
- Generating detailed text for each chapter
- Generating code samples
- Creating test code
- Writing technical explanatory text

Below is a scene of writing the article and code simultaneously in VSCode.  
![](https://gyazo.com/331eaa5b7bbc5397ef7e7dee4f6ebe59.png)

In this way, while writing the article, code creation and modification are done at the same time.  
The human reviews the content, we iterate with Amazon Q, and Amazon Q performs corrections to the article and code.

### 7.2 Effects of Collaborative Writing

This time, by running Amazon Q Developer in VSCode, we experienced the following effects:

**Increased efficiency:**
- Improved workflow efficiency with the standard development environment  
- Significantly reduced time to create the article framework  
- Quickly generated detailed technical explanations  
- Simultaneously created code samples and tests

**Improved quality:**
- Consistent writing style and structure  
- Working code samples  
- Comprehensive test coverage

**Enhanced creativity:**
- Humans focus on overall design and creative aspects  
- AI handles detailed implementation and text generation  
- Division of labor that leverages the strengths of both

---

The creation process of this article itself proves the practicality of Amazon Q Developer.

Amazon Q Developer is not just a coding assistance tool; it is a powerful partner that supports the entire creative work of engineers.  
Please try using it in various situations.

**This article was created through collaboration with Amazon Q Developer.**

<style>
img {
  border: 1px gray solid;
}
</style>
