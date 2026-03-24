---
title: AWS Development with AI – Introduction to Q Developer
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

## What is Q Developer?

Q Developer is an **AI-powered development support tool** offered by AWS.  
Unlike ChatGPT or Copilot, which are “code-completing AIs,” it is designed as **a development platform that supports everything from design and implementation to testing, review, and documentation**.

In a nutshell, it’s **an integrated environment for AWS development that you can collaborate on with AI**.

### Main Features and Characteristics

| Item | Overview |
|------|------|
| **Natural Language Development Support** | You can give instructions in natural language like “Create a Lambda function” or “Integrate with DynamoDB” |
| **Code Generation and Completion** | Supports major languages such as Python, TypeScript, Java |
| **Automatic Test Code Generation** | Infers and auto-generates tests from existing code |
| **Review and Improvement Suggestions** | AI automatically reviews code quality, exception handling, naming conventions, etc. |
| **AWS Integration** | Can directly handle AWS resources like Lambda / API Gateway / DynamoDB / CDK |
| **VS Code Integration** | You can instruct, generate, and modify inline via the extension |

### Two Ways to Use: CLI and VS Code

Q Developer offers two usage styles.

| Style | Overview | Example Command |
|-------|----------|-----------------|
| **CLI (Command Line)** | Issue instructions to the AI directly in the terminal | `$ q generate lambda --name hello-world` |
| **VS Code Extension** | Enter natural language prompts within the editor to generate and modify code | Use the command palette and select “Q Developer: Generate Code” |

If you use the Pro version, you will be able to directly operate AWS services from both the CLI and VS Code.

### Origin and Purpose of “Q”

“Q” stands for both **“Quality” and “Question”**.  
The philosophy of this tool is not that “AI writes the code,” but rather a collaborative development approach where **developers refine quality by conversing with AI**.

Therefore, Q Developer is not just a support tool but an **“AI development partner” that provides end-to-end support from design review to implementation and improvement**.

This time, we will mainly use the Q CLI to create a simple application.

## 1. Overview of the Q Developer CLI

**The CLI (Command Line Interface)** enables advanced operations.  
With the CLI, you can not only interact with the AI in the terminal (interactive mode) but also perform automated processes and integrations using commands like the following.

| Feature            | Description                                                       |
|--------------------|-------------------------------------------------------------------|
| **Code Generation**      | AI generates Lambda functions, API Gateway configurations, CDK setups, etc. |
| **Review**               | Analyzes the quality of existing code and suggests improvements   |
| **Fix and Regenerate**   | AI automatically fixes problematic areas                          |
| **Test Generation**      | Automatically generates and runs unit test code                  |
| **Documentation**        | Automatically outputs READMEs and design documents                |

### Verification Example

If you see the following, your environment is correctly set up.  
You could do everything in the command line, but since this is the first trial, **we will run everything in interactive mode from now on**.

```bash
$ q --version
q 1.13.0

$ q help
# Displays the list of available subcommands
# generate / review / test / fix / metrics / deploy, etc.
```

---

## 2. Launching the Q CLI and Interactive Mode

Run the following command:  
```bashqq
$ q
```

You will see a screen like the following:

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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 You are chatting with claude-4-sonnet
```

This state is **Interactive Mode**.  
You can speak to it directly in natural language and move forward with design and implementation together with the AI.

### Example Dialogue

Enter the following sentence:
```
> Create a Lambda function that saves data to DynamoDB
```
The response was as follows:
```
> I will create a Lambda function that saves data to DynamoDB.


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
+     9:         # Input data validation
+    10:         if not event or not isinstance(event, dict):
+    11:             return {
+    12:                 'statusCode': 400,
+    13:                 'body': json.dumps('Invalid input: Event must be a non-empty object', ensure_ascii=False)
+    14:             }
+    15:
+    16:         # Save data to DynamoDB
+    17:         table.put_item(Item=event)
+    18:
+    19:         return {
+    20:             'statusCode': 200,
+    21:             'body': json.dumps('Data saved successfully', ensure_ascii=False)
+    22:         }
+    23:     except Exception as e:
+    24:         return {
+    25:             'statusCode': 500,
+    26:             'body': json.dumps(f'Error: {str(e)}', ensure_ascii=False)
+    27:         }

 ⋮
 ↳ Purpose: Create a Lambda function that saves data to DynamoDB
Creating: /home/ubuntu/q/lambda_dynamodb_jp.py

 ⋮
 ● Completed in 0.1s


> Lambda function created. Main features:

• Integration with DynamoDB using boto3  
• Input validation of event data  
• Saving data to a DynamoDB table  
• Error messages in Japanese  
• Returns appropriate HTTP status codes  

Usage:  
1. Change 'your-table-name' to your actual DynamoDB table name  
2. Grant the Lambda execution role the dynamodb:PutItem permission  
3. The function saves the JSON data passed in the event to DynamoDB  
```

---

## 3. Program Development Experience Through Dialogue

Using the Q Developer CLI (`q`), we will illustrate the flow of creating a simple application (in this case, a “Tetris” game) together by conversing with the AI in natural language.

```bash
$ q
🤖 You are chatting with claude-4-sonnet
```

### 3.1 Scenario Setup

The requirements for the Tetris game we will create this time are as follows:

- ①: Include all the standard Tetris controls (rotation, positioning, dropping, etc.)  
- ②: Use animal icons (e.g., cats) instead of regular blocks  
- ③: The cat icon’s expression should change (not just one expression) as blocks stack up  
- ④: Store it in AWS S3 and configure it for global access  

### 3.2 Starting the Conversation with Q Developer

Instruction: (Overview + Details (Requirements ① and ② above))
```
Please create a Tetris game.  
Include the usual features you'd expect in Tetris (block rotation, positioning, dropping, etc.).  
Instead of regular blocks, use cat icon images (you can choose the images).
```
Response:
```
> I will create a Tetris game using cat icons:

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: /home/ubuntu/q/cat-tetris.html

+      1: <!DOCTYPE html>
+      2: <html>
+      3: <head>
+      4:     <meta charset="UTF-8">
+      5:     <title>Cat Tetris</title>
+      6:     <style>
+      7:         body { margin: 0; padding: 20px; background: #222; color: white; font-family: Arial; text-align: center; }
+      8:         canvas { border: 2px solid #fff; background: #000; }
+      9:         .score { font-size: 20px; margin: 10px; }
+     10:         .controls { margin: 10px; font-size: 14px; }
+     11:     </style>
+     12: </head>

~~~ (omitted) ~~~

+    239:         // Start game
+    240:         updateScore();
+    241:         requestAnimationFrame(gameLoop);
+    242:     </script>
+    243: </body>
+    244: </html>

 ⋮
 ↳ Purpose: Create cat Tetris game with standard Tetris features
Creating: /home/ubuntu/q/cat-tetris.html

 ⋮
 ● Completed in 0.1s

> Created a Tetris game using cat icons!

Main features:  
• **Block Rotation**: Rotate with the ↑ key  
• **Left/Right Movement**: Move with the ←/→ keys  
• **Fast Drop**: Press ↓ for fast drop  
• **Hard Drop**: Press spacebar for instant drop  
• **Line Clearing**: Clears a row when it’s filled  
• **Scoring System**: Earn points for clearing lines  
• **Level Up**: Increases fall speed based on score  
• **Cat Icons**: Randomly uses 7 types of cat emojis  

Controls:  
• ←/→: Move left/right  
• ↓: Fast drop  
• ↑: Rotate  
• Space: Hard drop  

You can open the file in a browser to play!
```

It seems that `/home/ubuntu/q/cat-tetris.html` is the output.  
(Since we didn't specify the output location and filename, Q apparently chose them arbitrarily.)

Let's open the HTML file.  
![](https://gyazo.com/0cdf5dcafccf915fa0f4b3b63b0a42ac.png)

Cat Tetris is running.  
The cat icons each have different expressions, which is fun.  
However, it seems there's no pattern, as some cats are already crying at the start.  
Let's check how the cat expressions are being changed.

Instruction:
```
> What logic is used to change the cat icon's expressions?
```
Response:
```
> The logic for changing cat icons' expressions is as follows:

1. Random selection when generating a piece:
javascript
this.catType = Math.floor(Math.random() * CAT_EMOJIS.length);

When a new Tetris piece is generated, it randomly selects one of the 7 cat emojis (🐱😺😸😹😻🙀😿).

2. Same cat for the entire piece:
Each Tetris piece (I, O, T, S, Z, J, L) uses the same cat icon determined at generation.

~~~ (omitted) ~~~

4. Transformation at render time:
javascript
drawBlock(x, y, board[y][x] - 1);

At render time, it subtracts 1 to get back to the original cat type index.

In other words: Each Tetris piece randomly determines a cat type, and all blocks within that piece use the same cat icon. Different pieces may have different cat types.
```

When you ask a question, it responds like this.  
However, randomness isn't very interesting, so we'll add more constraints (details).

Instruction: (Requirement ③)
```
At the start of the game, the cats should look relaxed, and as the blocks stack higher, the cats should have more stressed expressions.
```
Response:
```
> Adjusting so that the cat's expression changes according to the game state:

🛠️  Using tool: fs_write (trusted)
 ⋮
 ● Path: cat-tetris.html

- 29    :         // Use cat emojis
- 30    :         const CAT_EMOJIS = ['🐱', '😺', '😸', '😹', '😻', '🙀', '😿'];
+     29:         // Use cat emojis (from relaxed to stressed)
+     30:         const CAT_EMOJIS = ['😻', '😺', '😸', '🐱', '😹', '🙀', '😿'];

~~~ (omitted) ~~~

> The update is complete!

New cat expression system:

• **😻 (Relaxed)**: When blocks are at a low height  
• **😺 (Still Relaxed)**: When slightly stacked  
• **😸 (A Bit Worried)**: At moderate height  
• **🐱 (Neutral)**: At about half height  
• **😹 (Stressed)**: When stacked quite high  
• **🙀 (Anxious)**: At a dangerous height  
• **😿 (Despair)**: Right before game over

As the blocks stack higher, the cat's expression changes from relaxed to despair, expressing the game's tension through the cats' faces!
```

Let's run it to confirm the changes.  
Here are the results:

![](https://gyazo.com/3147fef55feda871b380d7afc7f4eb6d.png)

This time, you can see that as blocks stack up and the situation becomes less relaxed, the cat icons' expressions change from relaxed to despair.

However, after playing the game for a bit, the following bugs were found:

- The 4-block-long horizontal piece does not rotate with the ↑ key.  
- In the second and subsequent games, cat blocks with anxious or despair expressions appear right from the start.

We will instruct bug fixes in Japanese.

Instruction: (Bug Fix Request)
```
There are bugs. Please fix them. The bugs are as follows:
1. The 4-block-long horizontal piece does not rotate with the ↑ key.
2. In the second and subsequent games, cat block expressions of despair or anxiety appear right from the start.
```
Response:
```
> Fixing the bugs:

1. Fix I-piece (4-block) rotation bug:

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

> 2. Fixing the board initialization bug on game reset:

🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Searching: /home/ubuntu/q/cat-tetris.html for pattern: Game Over
 ✓ Found 1 matches for pattern 'Game Over' in /home/ubuntu/q/cat-tetris.html

 ⋮
 ● Completed in 0.0s

🛠️  Using tool: fs_read (trusted)
 ⋮
 ● Reading file: /home/ubuntu/q/cat-tetris.html, from line 224 to 234
 ✓ Successfully read 464 bytes from /home/ubuntu/q/cat-tetris.html
 ⋮

~~~ (omitted) ~~~

 ⋮
 ↳ Purpose: Fix board reset to ensure proper initialization
Updating: cat-tetris.html

 ⋮
 ● Completed in 0.0s

> Bug fixes complete!

Changes:  
1. I-piece rotation: Added both horizontal and vertical states so it can rotate with the ↑ key  
2. Game reset: Fully reinitialized the board to 0 and generate a new piece, so the game starts with a relaxed cat even on the second session

The bugs should now be resolved, and the game should work properly!
```

![](https://gyazo.com/1b73821bcd500359109851d05a662a91.png)

The horizontal line piece that couldn't rotate can now rotate.  
Also, the cat icons are displayed correctly when restarting the game.

### 3.3 Uploading to AWS S3

The completed Tetris application is a simple single HTML file.  
Let's upload this application to AWS S3.  
(You need to have access permissions for AWS S3.)

Instruction: (Requirement ④)
```
Upload the game to AWS S3.
Create a new bucket for the upload.
```
Response:
```
> I will create a new bucket and upload Cat Tetris.

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
aws s3 mb s3://cat-tetris-game-$(date +%s)
 ⋮
 ↳ Purpose: Create a new S3 bucket

make_bucket: cat-tetris-game-<bucketID>

 ⋮
 ● Completed in 1.573s

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
aws s3 cp /home/ubuntu/cat-tetris.html s3://cat-tetris-game-<bucketID>/cat-tetris.html --content-type text/html
 ⋮
 ↳ Purpose: Upload the Cat Tetris file to the new bucket

upload: ./cat-tetris.html to s3://cat-tetris-game-<bucketID>/cat-tetris.html

 ⋮
 ● Completed in 0.655s

> Done! Created the new bucket cat-tetris-game-<bucketID> and uploaded the Cat Tetris file.
```

The upload has been completed, but we don't know how to access it.  
We hadn't specified our desired final result.  
Let's communicate the final output format to Q Developer.

Instruction:
```
I want to access it via a URL, so please give me the URL
```
Response: (The bucket ID has been altered from the actual output)
```
> The S3 bucket is currently private, so it can't be accessed from the web. Public access needs to be enabled.

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
aws s3api put-public-access-block --bucket cat-tetris-game-<bucketID> --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
 ⋮
 ↳ Purpose: Disable the bucket's public access block

 ⋮
 ● Completed in 0.989s

🛠️  Using tool: execute_bash (trusted)
 ⋮
 ● I will run the following shell command:
aws s3api put-bucket-policy --bucket cat-tetris-game-<bucketID> --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::cat-tetris-game-<bucketID>/*"
    }
  ]
}'
 ⋮
 ↳ Purpose: Allow public read via bucket policy

 ⋮
 ● Completed in 1.112s

> You can now access it at the following URL:

https://cat-tetris-game-<bucketID>.s3.amazonaws.com/cat-tetris.html

Open this URL in your browser to play Cat Tetris!
```

You can open the specified URL.  
You were able to run the same Tetris you ran locally on AWS S3.

![](https://gyazo.com/1b278100082c898609ea10b49731fc78.png)

---

## 4. Basic Patterns for Issuing Instructions

To achieve results when interacting with AI, **how you communicate** is the most important factor.  
Q Developer understands natural language, but the clearer and more structured the instructions, the more accurate the generated code.

### 4.1 Basic Structure of Instructions

When conveying a task to the AI, keep the following three stages in mind.

| Stage               | Content                                             | Example                                                                                       |
|---------------------|-----------------------------------------------------|-----------------------------------------------------------------------------------------------|
| **① Goal**          | What you want to achieve                            | "I want to create an API that saves data to DynamoDB"                                        |
| **② Constraints**   | Technical conditions / technologies to use          | "Implement it as a Lambda function in Python 3.11"                                           |
| **③ Expected Outcome** | The form of the output you want                  | "Generate the handler function and test code"                                                |

Simply communicating these three elements in order greatly improves output reproducibility and quality.

### 4.2 Varying the Granularity of Instructions

Instructions to Q Developer can be broadly categorized into two types: **partial instructions** and **global instructions**.

| Type                 | Scope                                | Usage Example                                                                                  |
|----------------------|--------------------------------------|------------------------------------------------------------------------------------------------|
| **Partial Instructions** | Local modifications such as functions or modules | "Refactor this function and standardize exception handling"                                      |
| **Global Instructions**  | Project-wide or design policy      | "Unify the response format for all APIs and add a common error handler"                       |

Partial instructions aim for immediate improvements, while global instructions ensure consistency in design policy.  
By combining these two, you can help the AI understand the **hierarchical relationship of intentions**.

### 4.3 Creating a Feedback Loop

Instead of “using as-is” the results the AI produces, it is important to iterate through the cycle of **misunderstanding → correction → regeneration**.

#### Example:
```
AI: Created a Lambda function. It writes to DynamoDB.
↓
Developer: In this code, the table name is hardcoded, so fetch it from an environment variable.
↓
AI: Understood. Here's the revised code.
```

In this way, treating the interaction with the AI as a “review back-and-forth” allows you to collaboratively develop higher-quality code.

### 4.4 Comparing Good and Bad Instructions

| Example Instruction                                                                                           | AI Response                                                                                         | Evaluation     |
|----------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|----------------|
| "Make a Lambda for DynamoDB"                                                                                  | Works, but schema and exception handling are vague                                                   | ❌ Unclear     |
| "Create a Lambda function that registers a task in DynamoDB. Accept title and status, with an initial status of pending." | Automatically generates an appropriate handler and validation                                         | ✅ Clear       |
| "Improve the function"                                                                                         | Does not know what or how to fix                                                                     | ❌ Abstract    |
| "Add error handling to this function and log exception details"                                               | Accurately reflects the intended code changes                                                        | ✅ Concrete    |

"Clear instructions with context" yield better results than "short instructions."

### 4.5 Advanced: Using AI as a Reviewer

It is also possible to give the AI the perspective of a **“designer”** or **“quality manager”**.  
For example, the following instructions are effective:

```
List three improvement points for this code from the perspectives of maintainability and testability.
```
Or:
```
Review this API design against REST principles.
```

This allows Q Developer to function not just as a generation engine but as a “review AI,” becoming a partner that enhances the developer's quality awareness.

---

## Conclusion

- Communicate instructions in the order **Goal → Constraints → Expected Outcome**  
- Be aware of granularity (partial/global) and structure instructions  
- **Repeat feedback to improve accuracy**  
- Understand the development process through **dialogue with AI** while working with a minimal setup  

Q Developer is not a tool where “AI writes code,” but a **platform for refining design, implementation, and quality together with AI**.

I hope this serves as a reference for your generative AI usage.

<style>
img {
    border: 1px gray solid;
}
</style>
