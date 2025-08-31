---
title: 用 Kiro 掀起 AI 开发革命！？从零构建相册应用【第5回：前端实现 - 前篇】
author: noriyuki-yagi
date: 2025-08-28T00:00:00.000Z
tags:
  - Kiro
  - AIエージェント
image: true
translate: true

---

[上次](/blogs/2025/08/27/kiro-album-app-4/) 完成了后端的实现任务。

这次我们将从前端的实现任务开始进行。

[第1回请点击此处](/blogs/2025/08/19/kiro-album-app-1/)

## 15. 任务10. Angular 前端项目的设置

### 15.1. 修正前端构建及单元测试命令

首先，将前端的构建和单元测试从本地环境转移到 Docker 容器（Podman 容器）中执行。

```text:作者
请将 .kiro/steering/project-context.md 文件改写为在执行前端构建和单元测试时使用开发环境用的 Docker 镜像
```

Kiro 的回复：

```text:Kiro
Including Steering Documents project-context.md

I'll help you update the project context file to include frontend build and unit test execution using the development Docker image. Let me first read the current content and the frontend Dockerfile.dev to understand the setup.

Read file(s) README.md project-context.md Dockerfile.dev

Now I'll update the project context file to include frontend build and unit test execution using the development Docker image. I'll add a new section for frontend development commands similar to the backend section.

Accepted edits to project-context.md

将 .kiro/steering/project-context.md 文件更新为在执行前端构建和单元测试时使用开发环境用的 Docker 镜像。

新增内容：
1. 前端构建和测试执行部分
    ・开发环境 Docker 镜像的构建方法
    ・构建执行命令
    ・单元测试执行命令（使用无头 Chrome）
    ・Lint 执行命令
    ・避免在本地环境中执行的注意事项
2. NPM 缓存部分
    ・如何使用 NPM 包缓存卷
    ・如何清理缓存

这样，前端也可以与后端一样通过容器执行构建和测试，保持开发环境的一致性。
```

[本次作业产生的差异](https://github.com/NoriyukiYagi/kiro-album-app/compare/v0.11.0...v0.11.1)

前端的构建及单元测试命令已记录在 project-context.md 中。

```md:project-context.md(78-80)
- 使用开发环境用 Docker 镜像: `podman build -t album-app-frontend-dev -f frontend/Dockerfile.dev frontend/`
- 执行构建: `podman run --rm -v ${PWD}/frontend:/app -w /app album-app-frontend-dev npm run build`
- 执行单元测试: `podman run --rm -v ${PWD}/frontend:/app -w /app album-app-frontend-dev npm test -- --watch=false --browsers=ChromeHeadless`
```

可能会和后端一样出现网络问题，所以我要求加上 `--network=host` 选项。

```text:作者
在使用前端开发环境 Docker 镜像时，请加上 `--network=host` 选项
```

Kiro 的回复：

```text:Kiro
I'll update the project context file to add the --network=host option to the frontend Docker commands. Let me first read the current content to see what was updated by the autofix.

Read file(s) README.md project-context.md

Now I'll update the frontend Docker commands to include the --network=host option, similar to how it's used in the backend commands.

Accepted edits to project-context.md

在使用前端开发环境 Docker 镜像时，已添加 `--network=host` 选项。

更新内容：
・构建开发环境用 Docker 镜像时添加 `--network=host`  
・执行构建时添加 `--network=host`  
・执行单元测试时添加 `--network=host`  
・执行 lint 时添加 `--network=host`  

这样，前端也可以与后端一样使用 `--network=host` 选项通过容器执行构建和测试。该选项使容器直接使用主机网络，从而避免网络相关问题。
```

[本次作业产生的差异](https://github.com/NoriyukiYagi/kiro-album-app/compare/v0.11.1...v0.11.2)

```md:project-context.md(78-80)
- 使用开发环境用 Docker 镜像: `podman build --network=host -t album-app-frontend-dev -f frontend/Dockerfile.dev frontend/`
- 执行构建: `podman run --rm --network=host -v ${PWD}/frontend:/app -w /app album-app-frontend-dev npm run build`
- 执行单元测试: `podman run --rm --network=host -v ${PWD}/frontend:/app -w /app album-app-frontend-dev npm test -- --watch=false --browsers=ChromeHeadless`
```

看起来不错。

至此，前端开发环境的准备已完成。

### 15.2. 执行任务

打开 tasks.md，点击“10. Angular フロントエンドプロジェクトの設定”上方的“Start task”按钮。

Kiro 的回复：

```text:Kiro
Including Steering Documents project-context.md

I'll implement task 10 which focuses on setting up the Angular frontend project with Angular Material, Google OAuth library, and HTTP interceptors. Let me start by updating the task status and then examining the current frontend structure.

Task: 10. Angular フロントエンドプロジェクトの設定 from tasks.md  
Status: In Progress

Let me first examine the current frontend structure to understand what's already in place:  
Searched workspace  
Examining the current frontend directory structure to understand what's already implemented  
Read file(s) package.json angular.json main.ts

Now let me check the current app structure:  
Searched workspace  
Examining the current app directory structure  
Read file(s) app.component.ts app.routes.ts

Good! I can see that Angular Material is already set up and there's a basic structure. Now I need to implement the three main sub-tasks:  
1. Set up Angular Material and necessary dependencies (already partially done)  
2. Set up Google OAuth library and create authentication service foundation  
3. Implement HTTP interceptor for JWT token handling and error handling

Let me start by adding the necessary Google OAuth dependencies and creating the authentication service:  
Accepted edits to package.json

Now let me create the authentication service and related interfaces:  
Created user.model.ts  
Created auth.service.ts

Now let me create the HTTP interceptor for JWT token handling and error handling:  
Created auth.interceptor.ts

Now let me create an error handling service to provide centralized error handling:  
Created error-handler.service.ts

Now let me create an environment configuration file for the Google OAuth client ID:  
Created environment.ts  
Created environment.prod.ts

Now let me update the auth service to use the environment configuration:  
3 edits to file auth.service.ts  
Accepted edits to auth.service.ts  
Accepted edits to auth.service.ts  
Error(s) while editing auth.service.ts  
Unable to replace text, trying a different approach...

Let me replace both instances:  
2 edits to file auth.service.ts

Now let me create an auth guard to protect routes:  
Created auth.guard.ts

Now let me create an admin guard for admin-only routes:  
Created admin.guard.ts

Now let me update the main.ts file to include the HTTP interceptor and other necessary providers:  
Accepted edits to main.ts

Now let me add the necessary Angular Material modules for snackbar and other UI components. First, let me update the package.json to ensure we have all necessary dependencies:  
Accepted edits to package.json

Wait, I see @angular/cdk is already there. Let me add the missing lint script:  
Accepted edits to package.json

Now let me add the necessary dev dependencies for linting:  
Accepted edits to package.json

Now let me create a shared module for common Angular Material components:  
Created material.module.ts

Now let me add some global styles for the snackbar error handling:  
Accepted edits to styles.scss

Now let me create a loading service to handle loading states:  
Created loading.service.ts

Now let me create a loading interceptor to automatically show/hide loading for HTTP requests:  
Created loading.interceptor.ts

Now let me update the main.ts to include the loading interceptor:  
Accepted edits to main.ts

Now let me create a loading component that can be used throughout the app:  
Created loading.component.ts

Now let me update the app component to include the loading component and improve the authentication handling:  
Accepted edits to app.component.ts

I need to add the missing import for MatDividerModule:  
2 edits to file app.component.ts

Now let me create a TypeScript configuration file for the spec tests:  
Created tsconfig.spec.json

Now let me create a Karma configuration file for testing:  
Created karma.conf.js

Now let me update the routes to include the admin route and apply guards:  
Accepted edits to app.routes.ts

Now let me test the build to make sure everything is working correctly:  
Command podman run --rm --network=host -v ${PWD}/frontend:/app -w /app album-app-frontend-dev npm run build

I need to install the dependencies first. Let me build the development image and install dependencies:  
Command podman build --network=host -t album-app-frontend-dev -f frontend/Dockerfile.dev frontend/

Now let me try building again:  
Command podman run --rm --network=host -v ${PWD}/frontend:/app -w /app album-app-frontend-dev npm run build

The issue is that the volume mount is overriding the node_modules. Let me install the dependencies in the mounted volume:

Command podman run --rm --network=host -v ${PWD}/frontend:/app -w /app album-app-frontend-dev npm install

Now let me try building again:

Command podman run --rm --network=host -v ${PWD}/frontend:/app -w /app album-app-frontend-dev npm run build

I need to create the admin-user-management component that's referenced in the routes. Let me create a placeholder for now:  
Created admin-user-management.component.ts

Now let me try building again:  
Command podman run --rm --network=host -v ${PWD}/frontend:/app -w /app album-app-frontend-dev npm run build

Great! The build is successful. Now let me run the tests to make sure everything is working:  
Command podman run --rm --network=host -v ${PWD}/frontend:/app -w /app album-app-frontend-dev npm test -- --watch=false --browsers=ChromeHeadless

I can continue translating…
