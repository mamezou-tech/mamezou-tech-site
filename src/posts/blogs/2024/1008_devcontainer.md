---
title: 【イマドキ開発環境】devcontainerでローカルすっきり開発環境構築！
author: toshiki-nakasu
# 公開日として設定されますので、それを考慮した日付にするようにしてください
date: 2024-10-20
tags: [開発環境, docker, wsl, ubuntu, Git, vscode]
image: true
---

みなさん`Docker`活用してますか？
CI/CDで`Docker Image`を作るのはもちろんですが、やはりコンテナの有用性は、
**環境に依存せずどこでも同じように動作すること**ですよね

それで*開発環境でみんな同じ環境が使えたら嬉しくないですか？*
そんなときに使えるのが`devcontainer`の仕組みです

- Node.js？npx？どんどんバージョン増えるので要らないです。
- wingetが使えるようになった？便利ですよね。でも環境構築には要りません。
- プロジェクトの新規加入メンバーに導入手順を渡して1日浪費？もっっっったいないし面倒！！
  (やることでプロジェクトの理解は深まると思いますが)

::::info:分かる/できるようになること
今回紹介する`devcontainer`をリポジトリに組み込んだり、
`.devcontainer`フォルダを共有すれば同じように環境再現できます。
::::

:::check:前提条件
VSCode (WindowsにそのままインストールでOK)
　+
【拡張機能】

- `ms-ceintl.vscode-language-pack-ja` 一応日本語化用
- `ms-vscode-remote.remote-containers` devcontainerに必要
- `ms-vscode-remote.remote-wsl` WSL環境に必要
::::

## 説明する内容

1. [WSLのインストール](#)
1. [WSLにDocker CLIをインストール](#)
1. [開発環境イメージの選定](#)

---

## WSLのインストール

1. WSL本体の導入

    Powershell (管理者権限) で以下を実行

    ```powershell
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
    # 実行後に再起動が必要
    ```

1. Ubuntuのディストリビューションを指定してインストール

    コマンドプロンプトで以下を実行

    ```bash
    SET DISTRIBUTION=Ubuntu-22.04
    wsl --install --distribution %DISTRIBUTION%

    # keychainに必要なsshのバージョンアップ
    winget install Microsoft.OpenSSH.Beta
    ```

:::column:ディストリビューションのアンインストール
wsl --unregister Ubuntu-22.04
winget uninstall Canonical.Ubuntu.2204
:::

## WSLにDocker CLIをインストール

Windowsの`Docker Desktop`には会社の制限がありますよね。
Dockerが使えないと泣いていたあなたでもWSLが使えるなら、`Docker CLI`で解決です！
以下をWSLのターミナルで実行して数分待てばインストール完了です。

:::column:VSCodeからWSL環境を開く

1. Ctrl+Shift+Pでコマンドパレットを開く
1. `WSL: Connect to WSL`を入力しEnter
1. 前提の拡張機能が入っていればウィンドウが切り替わるはずです
1. ターミナルをBashで開けるようになっていれば問題ありません
:::

```bash
sudo apt update
sudo apt install -y \
 ca-certificates \
 curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y \
 docker-ce \
 docker-ce-cli \
 containerd.io \
 docker-buildx-plugin \
 docker-compose-plugin &&
  sudo apt clean &&
  sudo rm -rf /var/lib/apt/lists/*

sudo service docker start
sudo usermod -aG docker $USER
# ターミナル再起動後にsudo無しで実行可能
```

上記コマンドの詳細が知りたければこちらをご参照ください[^1]
[^1]: [Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

## 作業ディレクトリの用意

適当なフォルダをWSL上で用意してください。

```bash:sample.sh
mkdir ~/devEnvSample
code ~/devEnvSample
```

:::column:codeコマンド

引数でパスを指定し、

- 対象がファイルであれば、カレントウィンドウで開いて編集できるようになります
- 対象がフォルダであれば、ウィンドウを切り替えてワークフォルダが指定のパスに切り替わります
:::

===================================== ここまで一旦完了

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
WindowsにインストールしたVSCodeの拡張機能は最小限にして、WSLのVSCodeに基本的に使いたい機能を入れています。

- [注釈] devcontainerはMicrosoftがリファレンスを出しているので、MicrosoftのVSCodeが率先して環境整備しているように見えます。
    - 現に、開発用イメージもmicrosoftのものやvscodeがデフォルトユーザーになっているものが基本になっています。
