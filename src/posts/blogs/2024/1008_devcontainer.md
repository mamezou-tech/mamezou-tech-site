---
title: 【イマドキ開発環境】devcontainerでローカルすっきり開発環境構築！
author: toshiki-nakasu
# 公開日として設定されますので、それを考慮した日付にするようにしてください
date: 2024-10-20
tags: [開発環境, docker, wsl, ubuntu, Git, vscode]
image: true
---
- Docker使ってますか？
- CI/CDでDocker Image作るのはもちろんですが、やはりコンテナの有用性は、環境に依存せずどこでも同じように動作することですよね
- それって開発環境でみんな同じ環境が使えたら嬉しくないですか？
- そんなときに使えるのが`devcontainer`の仕組みです
    - Node.js？npx？どんどんバージョン増えるので要らないです。
    - wingetが使えるようになった？便利ですよね。でも環境構築には要りません。
    - プロジェクトの新規加入メンバーに導入手順を渡して1日浪費？もっっっったいないし面倒！！ (やることでプロジェクトの理解は深まると思いますが)
- [注釈] devcontainerはMicrosoftがリファレンスを出しているので、MicrosoftのVSCodeが率先して環境整備しているように見えます。
    - 現に、開発用イメージもmicrosoftのものやvscodeがデフォルトユーザーになっているものが基本になっています。
- このdevcontainerをリポジトリに組み込んだり、.devcontainerフォルダを共有すれば同じように環境再現できます。

## 説明する内容

- 開発環境イメージの選定

---

## 開発環境イメージの選定

- [vscodeのリファレンス](https://code.visualstudio.com/docs/devcontainers/containers)には、開発言語に合わせてイメージとイメージタグを選択するフローが記載されていますが、正直これはオススメできません。
- イマドキの開発は、複数の言語を同時に使った開発が多いと思っています。Java用のイメージを使ってdevcontainerを使っていても、途中で別の言語のインストールをしていたら、イメージの意味が薄くなってしまいます。
- なので、イメージはベーシックな、プレーンなものを選びましょう。
- また、devcontainer.jsonから直接、使用するイメージを使うことができますが、docker-composeを使用することをオススメします。

## featuresについて

- devcontainerにはfeaturesの指定があります。
- [features](https://containers.dev/features)
- なんと、このfeaturesを指定することで特定の言語の環境構築をイメージの中で一緒にやってくれるんです。拡張機能も一緒につけてくれるおまけ付きです
    - (個人的には)追加で入れてくる拡張機能は自分で指定したいところですが...
- 個人的によく使うfeatures
    - ghcr.io/devcontainers/features/common-utils:2
        - イメージ内のユーザー作成 (UIDも指定可能)
    - ghcr.io/devcontainers/features/git:1
        - Gitの環境構築 (大体のイメージには標準でありますが、一応)
    - ghcr.io/devcontainers/features/java:1
        - Javaの環境構築 (もちろんバージョン指定可能)
    - ghcr.io/devcontainers/features/node:1
        - Node.jsの環境構築 (もちろんバージョン指定可能)
    - ghcr.io/devcontainers/features/aws-cli:1
        - AWS-CLIも入れられます
    - ghcr.io/devcontainers/features/terraform:1
        - Terraformも入れられます

## bindについて

- さて、gitやaws-cliの話が出て気になった方もいるかもしれませんが、ローカルで使っている.gitconfigや.awsを開発環境でも使いたいですよね？
- もちろん、devcontainerでもフォルダバインドが可能です。
- バインドの設定は1行で書かないようにしましょうね！！！
- 実は.gitconfigの設定は自動でマウントされるようになっています
- [Docker豆知識] .dockerignoreを`devcontainer.json`の階層に置いておいたりすると、ボリュームにしておきたいnode_modulesなどの除外ができます。
    - ただし、`.gitignore`とは若干勝手が違うので、記述は最低限にしましょう

### devcontainerでGitが使えないんだが？

- ssh-agentが必要なんですね
- wslの.bashrcとかに書いちゃいましょうね～

## 環境変数

- AWS_DEFAULT_PROFILEなんかも開発環境で決まってますよね。こういうのはイメージの環境変数にしてしまいましょうね～

## イメージたくさん出てきてない？？

- 実は、devcontainerではdevcontainer用のイメージを作った上で、コンテナを起動しているんです。
- 名前に関しては諦めてください

## Dockerなんだから初期するときのコマンドも実行しろ

- たくさんあります
- ただし！！スクリプトをファイルで実行したい場合は注意が必要！コンテナにバインドして、そのパスを指定して実行するように！

## devcontainer専用の変数

## vscodeの設定

### settings

- リポジトリに含むもよし、ここで設定するのもよし。
- vscodeで開いているうちは、ユーザーのsettings.jsonも使われますのでご安心を。

### extensions

- devcontainer.jsonでも指定できますが、よく使うセットリストってありますよね？
- どのdevcontainerでも使うような拡張機能は外出しできます
    - settings.jsonの`dev.containers.defaultExtensions`で一覧指定できます。これだけでdevcontainer.jsonはだいぶスリムになると思います

## (入れるかどうかは悩む) Docker cli

## オレオレdevcontainerセット

```Dockerfile:Dockerfile
ARG TAG
FROM ubuntu:${TAG}
```

```yaml:compose.yaml
version: '3.8'

services:
    ubuntu:
        build:
            context: .
            dockerfile: Dockerfile
            args:
                TAG: 22.04
        image: plane:22.04
        hostname: ubuntu
        env_file:
            - devcontainer.env
```

```env:devcontainer.env
TZ="Asia/Tokyo"
LANG="C.UTF-8"
```

```json:devcontainer.json
{
    // # devcontainer.json sample
    // recommend: Do not sort json
    // ## To create image
    "name": "mySample",
    "workspaceFolder": "/workspace",
    "shutdownAction": "stopCompose",

    // ## From base image
    "dockerComposeFile": ["./compose.yaml"],
    "service": "ubuntu",
    "runServices": [],

    // ## Resources
    // warning: Can not use Env
    "mounts": [
        {
            "type": "bind",
            "source": "${localWorkspaceFolder}",
            "target": "${containerWorkspaceFolder}",
            "consistency": "delegated"
        }
    ],
    "features": {
        "ghcr.io/devcontainers/features/common-utils:2": {
            "username": "developer"
        },
        "ghcr.io/devcontainers/features/git:1": {}
    },

    // ## Environment
    "remoteUser": "developer",
    "containerEnv": {
        "scriptFolder": "${containerWorkspaceFolder}/.devcontainer/script"
    },
    "remoteEnv": {},
    "portsAttributes": { "80": { "label": "http", "onAutoForward": "silent" } },

    // ## Container command
    // warning: To use .sh you need mount
    // info: key is output stage
    "overrideCommand": true,
    "initializeCommand": {
        "Step": "echo [INFO] initializeCommand"
    },
    "onCreateCommand": {
        "Step": "sh ${containerEnv:scriptFolder}/sample.sh onCreateCommand"
    },
    "updateContentCommand": {
        "Step": "sh ${containerEnv:scriptFolder}/sample.sh updateContentCommand"
    },
    "postCreateCommand": {
        "Step": "sh ${containerEnv:scriptFolder}/sample.sh postCreateCommand"
    },
    "postStartCommand": {
        "Step": "sh ${containerEnv:scriptFolder}/sample.sh postStartCommand"
    },
    "postAttachCommand": {
        "Step": "sh ${containerEnv:scriptFolder}/sample.sh postAttachCommand"
    },

    // IDE
    "customizations": {
        "vscode": {
            "extensions": [],
            "settings": {}
        }
    }
}
```

## その他

[dockerhub](https://hub.docker.com/)
[devcontainer_metadata_reference](https://containers.dev/implementors/json_reference/)
[features](https://containers.dev/features)
