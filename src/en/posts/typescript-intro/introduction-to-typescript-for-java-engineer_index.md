---
title: 'Introduction to TypeScript for Java Engineers (Part 1: Introduction)'
author: masato-ubata
date: 2024-09-06T00:00:00.000Z
tags:
  - typescript
  - java
nextPage: >-
  ./src/en/posts/typescript-intro/introduction-to-typescript-for-java-engineer_variable.md
translate: true

---

## Introduction

This article aims to help Java engineers master the basics of TypeScript, which is widely adopted from front-end to back-end.  
We explain it by comparing it with Java so that you can leverage your Java knowledge to learn TypeScript.  
We hope this will help you broaden your skill set.  

:::info
In the article, we provide examples of Java code to compare with TypeScript.  
The variable names and other identifiers in the code are aligned, so please refer to them for correspondence.

  ```TypeScript: TypeScript
  let sample1 = 10;
  let sample2: number;
  ```
  ```java: How it looks in Java
  var sample1 = 10;
  int sample2;
  ```
:::

:::column:What's TypeScript

TypeScript is a superset of JavaScript released by Microsoft on October 1, 2012, encompassing all JavaScript features.
Its main feature is the addition of static typing to JavaScript.
Code written in TypeScript is transpiled to JavaScript and runs in various environments.
It is open-source and provided under the Apache License 2.0. ([TypeScript Repository](https://github.com/microsoft/TypeScript))
:::

## Contents

The planned contents are as follows:

* [Variables](/en/typescript-intro/introduction-to-typescript-for-java-engineer_variable) [let, const, var, type annotations, type inference]
* Types
  * [Primitive Types](/en/typescript-intro/introduction-to-typescript-for-java-engineer_primitive-type) [number, bigint, string, boolean, symbol, null, undefined]
  * Other Basic Types [any, unknown, void, never, enum] ※In preparation
  * Collection Types [array, tuple, Set, Map] ※In preparation
  * Special Types [union, intersection, literal, index signature] ※In preparation
* Functions ※In preparation
* Objects [interfaces, type aliases, classes] ※In preparation
* Generics ※In preparation

## Environment at the Time of Writing

This article has been verified to work with the following software versions:

|Name|Version|
|---|---|
|npm|10.5.0|
|node|20.12.2|
|TypeScript|5.5.4|
|Java|21.0.2|

## Environment Setup

The steps for setting up an environment to test TypeScript are as follows.  
npm and node are assumed to be already installed.

1. Install various packages
  ```sh
  # Install TypeScript
  npm install typescript
  # Create tsconfig.json
  npx tsc --init
  # Install ts-node: a package that allows executing node commands from tsc
  npm install -D ts-node
  # Install ts-node-dev: a package that re-executes when it detects source code changes
  npm install -D ts-node-dev
  # Install rimraf: housekeeping for built files
  npm install -D rimraf
  ```
2. Configure settings

```json: tsconfig.json
{
  "compilerOptions": {
    "target": "ES2023", // Set to 2020 or higher if using bigint
    "outDir": "./dist", // Set the output destination for files
  }
}
```

```json: package.json
{
  "main": "dist/index.js", // Set the target js file to execute
  "scripts": {
    "dev": "ts-node src/index.ts",
    "dev:watch": "ts-node-dev --respawn src/index.ts",
    "clean": "rimraf dist",
    "tsc": "tsc",
    "build": "npm run clean && tsc", 
    "start": "node .",
  },
}
```

## Verifying Environment Operation

The steps to verify the operation of the constructed environment are as follows:

1. Create index.ts and write one line
  ```ts: index.ts
  console.log("Hello, World.");
  ```
2. Start
  Confirm that `Hello, World` is displayed on the console.
  ```sh
  npm run dev:watch
  ```
3. Modify index.ts
  Confirm that `Hello, TypeScript` is displayed on the console.
  ```ts: index.ts
  console.log("Hello, TypeScript.");
  ```

## Other Commands

The commands set up during the environment setup other than `dev:watch` are as follows:

```sh
# Compile & Execute (if you want to execute only once)
npm run dev
# Clean & Compile (if you want to check the result transpiled to JavaScript)
npm run build
# Execute the built resources (if you want to execute the built result)
npm run start
```
