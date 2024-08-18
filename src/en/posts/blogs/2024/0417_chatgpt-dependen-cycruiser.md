---
title: >-
  How to Efficiently Create Custom Rules for dependency-cruiser Using Generative
  AI
author: takayuki-oguro
date: 2024-04-17T00:00:00.000Z
tags:
  - chatgpt
  - dependency-cruiser
  - javascript
  - typescript
  - OpenAI
  - 大規模言語モデル
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/04/17/chatgpt-dependen-cycruiser/).
:::



# Introduction

In JavaScript projects, managing increasingly complex dependencies is crucial. dependency-cruiser is a powerful tool for visualizing and analyzing these, but its configuration complexity can be a bottleneck. Particularly, creating project-specific rules consumes a lot of time and effort.

[dependency-cruiser (GitHub repository)](https://github.com/sverweij/dependency-cruiser)

By utilizing generative AI, you can streamline the creation of custom rules for dependency-cruiser. This article explains how to semi-automate the configuration of dependency-cruiser using **ChatGPT4**, allowing developers to focus on creative tasks and simplify code organization and maintenance.

# Installing and Using dependency-cruiser

In JavaScript and TypeScript projects, you can introduce dependency-cruiser to analyze dependencies. Articles on Qiita are very helpful regarding the installation and basic usage of this tool, detailing everything from the installation process to initial settings and basic execution methods.

If interested, you can refer to articles about dependency-cruiser from the following link:

[Installing and using dependency-cruiser (Qiita)](https://qiita.com/search?q=dependency-cruiser)

Assuming basic knowledge of installation and execution, let's proceed with the explanation.

# Basic Knowledge Needed to Understand This Article

Before using dependency-cruiser, let's confirm the basic structure of the configuration file and the output method. This will be the prerequisite knowledge when utilizing ChatGPT.

1. **Configuration File**:
   The configuration for dependency-cruiser is done in a JavaScript file named **.dependency-cruiser.js**. This file contains project-specific dependency rules and configuration options, customizing the behavior of dependency-cruiser.

2. **Execution at Command Prompt**:
   dependency-cruiser operates as a command-line tool, analyzing dependencies with the following command and outputting the results to a file.

```bash
npx dependency-cruiser -T dot . > dependency-graph.dot
```

   This command analyzes files in the specified **src** directory and outputs the results in a dot file format named **dependency-graph.dot**. This file describes the structure of dependencies, preparing for visualization.

3. **Execution at Command Prompt**:
   The output dot file is converted into a visual graph using Graphviz, a tool that reads dot files and draws them as graphs. Use the following command for conversion.

```bash
dot -T png dependency-graph.dot -o dependency-graph.png
```

   This command takes the **dependency-graph.dot** file as input and outputs it as a PNG image **dependency-graph.png**. This visually displays the dependency diagram, facilitating analysis and presentations.

Understanding these basic settings and output methods, and managing the configuration file appropriately, enables effective use of dependency-cruiser. The next section will detail the automatic generation of configuration files using ChatGPT, based on these basic knowledge.

# Utilizing ChatGPT

1. **Generating a Dependency Diagram with the Default Configuration File .dependency-cruiser.js**:
   First, generate a dependency diagram to consider which parts of the relationship you want to display errors or warnings.
   Execute the following command:

```bash
npx dependency-cruiser -T dot . > dependency-graph.dot
```

   Executing this command generates a file named **dependency-graph.dot** containing dependency information. Next, convert this DOT file into a visual diagram using tools like Graphviz for analysis.

- Default generated dependency diagram

![Generated Dependency Diagram](/img/blogs/2024/0416_chatgpt-dependen-cycruiser/dependency-graph_01.png)  

2. **Considering Rules for Errors**:
   While viewing the output dependency diagram, identify the parts you want to mark as errors.

- Identifying Dependency for Error

![Rule to Add](/img/blogs/2024/0416_chatgpt-dependen-cycruiser/dependency-graph_02.png)
※Here, as an example of a rule to mark as an error,
"Modules within controllers must not directly reference apiWrapper.ts."

In actual projects, diagrams can become large and difficult to read, making it hard to discern module names or arrows. In such cases, open the **dependency-graph.dot** file directly to find the relevant sections.

Arrows in the image are denoted as **->** in the .dot file. For instance, if it's unclear which module is entering userModel.ts, look for parts marked **-> userModel.ts** (see sample code below). Even if module names are obscured and unreadable, searching for recognizable strings can help you find them.

- dependency-graph.dot
```
strict digraph "dependency-cruiser output"{
    rankdir="LR" splines="true" overlap="false" nodesep="0.16" ranksep="0.18" fontname="Helvetica-bold" fontsize="9" style="rounded,bold,filled" fillcolor="#ffffff" compound="true"
    node [shape="box" style="rounded, filled" height="0.2" color="black" fillcolor="#ffffcc" fontcolor="black" fontname="Helvetica" fontsize="9"]
    edge [arrowhead="normal" arrowsize="0.6" penwidth="2.0" color="#00000033" fontname="Helvetica" fontsize="9"]

    // Omitted for brevity

    // Focus on -> and userModel.ts below
    "src/services/userService.ts" -> "src/models/userModel.ts"
    // The above node is the relevant point
    
    "src/services/userService.ts" -> "src/services/apiWrapper.ts"
}
```
　

3. **Custom Rule Generation by ChatGPT**:
   Once you have identified the rules you want to mark as errors, provide that information to ChatGPT and generate the configuration code to be appended to **.dependency-cruiser.js**. Request as follows:

- Actual prompt passed to ChatGPT4 (code part is the entire code inside dependency-graph.dot)

```plaintext
Please create a custom rule to add to dependency-cruiser's .dependency-cruiser.js.
As information that shows the structure between modules, the output data of dependency-cruiser is shown below.
The rule I want you to create is, "Generate an error when modules within controllers directly reference apiWrapper.ts."
-------------------------------------
strict digraph "dependency-cruiser output"{
    rankdir="LR" splines="true" overlap="false" nodesep="0.16" ranksep="0.18" fontname="Helvetica-bold" fontsize="9" style="rounded,bold,filled" fillcolor="#ffffff" compound="true"
    node [shape="box" style="rounded, filled" height="0.2" color="black" fillcolor="#ffffcc" fontcolor="black" fontname="Helvetica" fontsize="9"]
    edge [arrowhead="normal" arrowsize="0.6" penwidth="2.0" color="#00000033" fontname="Helvetica" fontsize="9"]

    ".dependency-cruiser.js" [label=<.dependency-cruiser.js> tooltip=".dependency-cruiser.js" URL=".dependency-cruiser.js" fillcolor="#ccffcc"]
    subgraph "cluster_node_modules" {label="node_modules" "node_modules/axios" [label=<axios> tooltip="axios" URL="https://www.npmjs.com/package/axios" shape="box3d" fillcolor="#c40b0a1a" fontcolor="#c40b0a"] }
    subgraph "cluster_node_modules" {label="node_modules" "node_modules/express" [label=<express> tooltip="express" URL="https://www.npmjs.com/package/express" shape="box3d" fillcolor="#c40b0a1a" fontcolor="#c40b0a"] }
    subgraph "cluster_src" {label="src" "src/app.ts" [label=<app.ts> tooltip="app.ts" URL="src/app.ts" fillcolor="#ddfeff"] }
    "src/app.ts" -> "src/controllers/taskController.ts"
    "src/app.ts" -> "src/controllers/userController.ts"
    "src/app.ts" -> "node_modules/express" [penwidth="1.0"]
    subgraph "cluster_src" {label="src" subgraph "cluster_src/controllers" {label="controllers" "src/controllers/taskController.ts" [label=<taskController.ts> tooltip="taskController.ts" URL="src/controllers/taskController.ts" fillcolor="#ddfeff"] } }
    "src/controllers/taskController.ts" -> "src/services/taskService.ts"
    subgraph "cluster_src" {label="src" subgraph "cluster_src/controllers" {label="controllers" "src/controllers/userController.ts" [label=<userController.ts> tooltip="userController.ts" URL="src/controllers/userController.ts" fillcolor="#ddfeff"] } }
    "src/controllers/userController.ts" -> "src/services/userService.ts"
    subgraph "cluster_src" {label="src" subgraph "cluster_src/models" {label="models" "src/models/taskModel.ts" [label=<taskModel.ts> tooltip="taskModel.ts" URL="src/models/taskModel.ts" fillcolor="#ddfeff"] } }
    subgraph "cluster_src" {label="src" subgraph "cluster_src/models" {label="models" "src/models/userModel.ts" [label=<userModel.ts> tooltip="userModel.ts" URL="src/models/userModel.ts" fillcolor="#ddfeff"] } }
    subgraph "cluster_src" {label="src" subgraph "cluster_src/services" {label="services" "src/services/apiWrapper.ts" [label=<apiWrapper.ts> tooltip="apiWrapper.ts" URL="src/services/apiWrapper.ts" fillcolor="#ddfeff"] } }
    "src/services/apiWrapper.ts" -> "node_modules/axios" [penwidth="1.0"]
    subgraph "cluster_src" {label="src" subgraph "cluster_src/services" {label="services" "src/services/taskService.ts" [label=<taskService.ts> tooltip="taskService.ts" URL="src/services/taskService.ts" fillcolor="#ddfeff"] } }
    "src/services/taskService.ts" -> "src/models/taskModel.ts"
    subgraph "cluster_src" {label="src" subgraph "cluster_src/services" {label="services" "src/services/userService.ts" [label=<userService.ts> tooltip="userService.ts" URL="src/services/userService.ts" fillcolor="#ddfeff"] } }
    "src/services/userService.ts" -> "src/models/userModel.ts"
    "src/services/userService.ts" -> "src/services/apiWrapper.ts"
}
------------------------------
```

ChatGPT will generate the configuration code as shown below, from which you can copy the relevant part and append it to the appropriate position in **.dependency-cruiser.js**.

- ChatGPT4 Generated Result

```plaintext
Using Dependency Cruiser, you can set custom rules to impose constraints on specific inter-module dependencies. To set the rule you're seeking, "Generate an error when modules within controllers directly reference `apiWrapper.ts`," you need to add the appropriate rule to the `.dependency-cruiser.js` configuration file.

Here is a sample code for that. Please add this code to your `.dependency-cruiser.js` file.

javascript
module.exports = {
  forbidden: [
    {                          // ★Target range starts here★
      name: 'no-apiWrapper-direct-from-controllers',
      comment: 'Generate an error if a module within controllers directly references apiWrapper.ts',
      severity: 'error',
      from: {
        path: "^src/controllers",
      },
      to: {
        path: "^src/services/apiWrapper\\.ts$"
      }
    }                          // ★Target range ends here★
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsConfig: {
      fileName: 'tsconfig.json'
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node']
    }
  }
};


### Explanation
- **forbidden**: Define rules for forbidden dependencies in this section.
- **name**: Give a name to the rule for easy identification.
- **comment**: Write a description of the rule. Make it clear what the purpose is.
- **severity**: Set the severity level for rule violations. Setting it to `error` generates an error if this rule is violated.
- **from**: Specify the starting point of the dependency with a regular expression. Here, all files within the `src/controllers` directory are targeted.
- **to**: Specify the destination path with a regular expression. Direct dependencies on `apiWrapper.ts` are prohibited.

After adding this rule to `.dependency-cruiser.js`, running dependency-cruiser will output errors if there are dependencies that violate the specified conditions. This allows you to apply specific structural constraints to your project.
```

From the output code,
**module.exports = {** 
  **forbidden: [**
is a section already noted in .dependency-cruiser.js, and **[** below is an array. Thus, add the rule within that section.
Often, you need to add a **,(comma)** after the last **}** generated by ChatGPT, so be careful.
Also, adding settings at the top of the file will override existing rules, so adding them at the bottom might not function as intended. Be cautious.

- Example of appending to .dependency-cruiser.js

```javascript
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // Start of added range
   {
      name: 'no-apiWrapper-direct-from-controllers',
      comment: 'Generate an error if a module within controllers directly references apiWrapper.ts',
      severity: 'error',
      from: {
        path: "^src/controllers",
      },
      to: {
        path: "^src/services/apiWrapper\\.ts$"
      }
    },  // Do not forget to add a comma here!
     // End of added range
    {
      name: 'no-circular',
      severity: 'warn',
      comment:
        'This dependency is part of a circular relationship. You might want to revise ' +
        'your solution (i.e. use dependency inversion, make sure the modules have a single responsibility) ',
      from: {},
      to: {
        circular: true
      }
    },
    {
      // Omitted for brevity
};
```

4. **Reanalysis and Adjustment**:
Here, to ensure the rule is working properly, add code that accesses apiWrapper.ts from controllers and then check.

Below is a bad example of direct reference, where taskController not only requests the service layer (TaskService) but also directly requests the API wrapper (APIWrapper). This makes the controller too aware of the details of the external API, violating the principle of single responsibility. Additionally, business logic is mixed into the controller, making later testing and maintenance difficult.

- Bad Direct Reference Example
```typescript
import { Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { APIWrapper } from '../services/apiWrapper'; // Example of bad design

export const taskController = {
  async listTasks(req: Request, res: Response) {
    try {
      const externalData = await APIWrapper.fetchData('https://api.example.com/external-data'); // Example of bad design
      const tasks = await TaskService.listTasks();
      const response = tasks.map(task => ({
        ...task,
        externalData: externalData.someProperty
      }));
      res.json(response);
    } catch (error) {
      res.status(500).send("Error fetching tasks");
    }
  },

  async createTask(req: Request, res: Response) {
    try {
      const { title, completed } = req.body;
      const newTask = await TaskService.createTask(title, completed);
      await APIWrapper.postData('https://api.example.com/notify', { task: newTask }); // Example of bad design
      res.status(201).json(newTask);
    } catch (error) {
      res.status(400).send("Error creating task");
    }
  }
};
```

- Bad Code Example and Dependency Diagram After Adding Rules
![After Adding Rules](/img/blogs/2024/0416_chatgpt-dependen-cycruiser/dependency-graph_03.png)

After applying the new rule, regenerate the dependency diagram to see if the expected error is displayed.
Here, the added bad references are shown in red.

If the expected error does not appear, the rule creation instructions may be vague.
In that case, review the rule instructions again and, if necessary, request ChatGPT to generate the rule again.

Utilizing AI allows for the efficient creation of custom rules for dependency-cruiser, enabling more effective strict management of dependencies.
