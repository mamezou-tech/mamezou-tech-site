---
title: GitHub Actions 工作流程的步骤现在可以并行执行了
author: masahiro-kondo
date: 2026-06-27T00:00:00.000Z
tags:
  - GitHub
  - CI/CD
image: true
translate: true

---

## 引言
前几天，GitHub Actions 的工作流程中实现了 background 功能，宣布可以在单个工作流程内并行执行步骤。

@[og](https://github.blog/changelog/2026-06-25-actions-steps-can-now-be-run-in-parallel/)

此前也可以使用 Strategy Matrix 利用多个运行器进行并行处理，但通过这次的功能，支持在单个运行器上进行并行处理。

[官方文档](https://docs.github.com/ja/actions/reference/workflows-and-actions/workflow-syntax)中提供了后端和前端并行构建的示例。

```yaml
steps:
  - name: Build frontend
    id: build-frontend
    run: npm run build:frontend
    background: true

  - name: Build backend
    id: build-backend
    run: npm run build:backend
    background: true

  - name: Run linter while builds run
    run: npm run lint

  - name: Wait for both builds to finish
    wait: [build-frontend, build-backend]

  - name: Run tests
    run: npm test
```

## 尝试并行执行（background 版本）
每个步骤指定 `background: true` 的方法。为该属性的步骤在开始执行后会立即将控制权返回到前台。

```yaml
name: Background Hello World

on:
  workflow_dispatch:

jobs:
  hello-background:
    runs-on: ubuntu-latest
    steps:
      - name: Background hello 1 #1
        id: hello1
        run: |
          echo "hello1 start: $(date -u +%H:%M:%S)"
          sleep 4
          echo "hello1 end:   $(date -u +%H:%M:%S)"
        background: true

      - name: Background hello 2 #2
        id: hello2
        run: |
          echo "hello2 start: $(date -u +%H:%M:%S)"
          sleep 3
          echo "hello2 end:   $(date -u +%H:%M:%S)"
        background: true

      - name: Foreground step (runs while background steps are active) #3
        run: |
          echo "foreground start: $(date -u +%H:%M:%S)"
          sleep 1
          echo "foreground end:   $(date -u +%H:%M:%S)"

      - name: Wait for background steps #4
        wait: [hello1, hello2]

      - name: Done
        run: echo "Both background steps have completed."
```
1. 在后台执行的步骤。通过 4 秒睡眠的开始和结束显示时间。指定 `background: true`。
2. 第二个在后台执行的步骤。与第一个步骤相同，但睡眠时间为 3 秒。
3. 在后台执行同时，在前台执行的步骤。睡眠 1 秒。
4. 等待后台两个步骤的步骤。只需通过 `wait` 将步骤 ID 以数组形式指定即可。

执行结果如下。

![実行結果](https://i.gyazo.com/e912fffafeecdbeef29120d645e8d45f.png)

- hello1 和 hello2 在同一时间开始，以 1 秒差异结束。
- 前台步骤也与两个后台步骤同时开始。
- 在 wait 步骤中等待两个后台步骤完成。

:::info
在上述示例中，只是在后台执行简单的 sleep 和 echo，并通过 wait 进行等待，但在实际的 CI/CD 管道中，经常有“想在后台启动服务器或进程后再使用其结果”的用例。对于这种情况，需要将输出写入临时文件，并在 wait 之后的步骤中读取该文件等处理。
:::

## 尝试并行执行（parallel 版本）
只需在 `parallel` 关键字下排列步骤即可实现并行化。并行块执行完毕后会自动结束，无需通过 wait 等待。

```yaml
name: Parallel Hello World

on:
  workflow_dispatch:

jobs:
  hello-parallel:
    runs-on: ubuntu-latest
    steps:
      - parallel: #1
          - name: Parallel hello 1
            run: |
              echo "parallel-1 start: $(date -u +%H:%M:%S)"
              sleep 4
              echo "parallel-1 end:   $(date -u +%H:%M:%S)"

          - name: Parallel hello 2
            run: |
              echo "parallel-2 start: $(date -u +%H:%M:%S)"
              sleep 3
              echo "parallel-2 end:   $(date -u +%H:%M:%S)"

          - name: Parallel hello 3
            run: |
              echo "parallel-3 start: $(date -u +%H:%M:%S)"
              sleep 2
              echo "parallel-3 end:   $(date -u +%H:%M:%S)"

      - name: Done after all parallel steps #2
        run: |
          echo "done step start: $(date -u +%H:%M:%S)"
          echo "All parallel steps have completed."
          echo "done step end:   $(date -u +%H:%M:%S)"
```
1. 在 parallel 下放置 3 个步骤。sleep 分别为 4 秒、3 秒和 2 秒，形成不同的时长。
2. 普通步骤，在 parallel 步骤完成后执行。

执行结果如下。

![実行結果](https://i.gyazo.com/93eb5621835575d7926031e9c1a4e78f.png)

- hello1、hello2、hello3 在同一时间开始。各自按指定耗时 4 秒、3 秒和 2 秒。
- 可以看到最后一个步骤是在 parallel 步骤完成后的时刻开始执行的。

## 在交叉编译中使用
作为应用，很容易想到在交叉编译时并行生成多个平台的二进制文件。例如，在 Go 语言中可以交叉编译生成针对 Linux / macOS / Windows 的二进制。

```yaml
    - name: Build
      run: |
        GOOS=linux GOARCH=amd64 go build -o build/linux-amd64/sb2md main.go
        GOOS=linux GOARCH=arm64 go build -o build/linux-arm64/sb2md main.go
        GOOS=windows GOARCH=amd64 go build -o build/windows/sb2md.exe main.go
        GOOS=darwin GOARCH=amd64 go build -o build/macos/sb2md main.go
        GOOS=darwin GOARCH=arm64 go build -o build/macos_arm/sb2md main.go
```

以下是未进行并行化的构建结果。生成 5 个二进制文件耗时 44 秒。

![並列化前のビルド結果](https://i.gyazo.com/644565af3f0f937740ddbc6e698585e1.png)

已应用并行化。之前在 run 中写了多行命令，现在将其拆分为单独的步骤，放在 parallel 下。

```yaml
    - parallel:
        - name: Build linux amd64
          run: GOOS=linux GOARCH=amd64 go build -o build/linux-amd64/sb2md main.go

        - name: Build linux arm64
          run: GOOS=linux GOARCH=arm64 go build -o build/linux-arm64/sb2md main.go

        - name: Build windows amd64
          run: GOOS=windows GOARCH=amd64 go build -o build/windows/sb2md.exe main.go

        - name: Build darwin amd64
          run: GOOS=darwin GOARCH=amd64 go build -o build/macos/sb2md main.go

        - name: Build darwin arm64
          run: GOOS=darwin GOARCH=arm64 go build -o build/macos_arm/sb2md main.go
```

![並列化後のビルド結果](https://i.gyazo.com/bcd9816c71a6b59db11aeb068778ff1e.png)

总计耗时为 40 秒，其中 Linux amd64 的构建在 3 秒内完成，但其他平台的构建均花费了约 40 秒，未达到预期的缩短效果。可能的原因还是跑者的 CPU 核心数。

- 由于运行器（ubuntu-latest）的 vCPU 只有 2 核，无法提高并发度
- 5 个进程争夺 2 个核心，导致大量上下文切换
- 运行器本身的架构为 Linux amd64，因此本地二进制生成瞬时完成

如果更换为拥有更多 CPU 核心的 Larger Runner，或许可以进一步缩短时间，但如果仅能将 40 秒缩减到约 3 秒，其性价比并不高，感觉不太适合当前的用例。

## 结语
以上，尝试了在 GitHub Actions 工作流程中并行执行步骤。像这次尝试的 Go 交叉编译那样，如果是 CPU 密集且相互独立的任务，可能像以前一样使用 Strategy Matrix 启动多个独立的运行器来处理会更快（虽然费用会更高）。另一方面，这次的并行步骤执行功能，在官方文档示例中的“后端与前端构建”或“测试执行与 Lint 并行执行”等场景中，可以高效利用单一运行器的空闲资源（如 I/O 等待时间），可以说是一项非常实用的功能。
