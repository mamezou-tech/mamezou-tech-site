---
title: 【イマドキ開発環境】devcontainerでローカルすっきり開発環境構築！
author: toshiki-nakasu
# 公開日として設定されますので、それを考慮した日付にするようにしてください
date: 2024-10-20
tags: [開発環境, docker, wsl, ubuntu, Git, vscode, Codespaces]
image: true
---

::::info:この記事で紹介すること

- `devcontainer`をローカルで構築します
    - `devcontainer`をリポジトリに組み込めば、誰でも同じように環境再現できるようになります
- `devcontainer`と`WSL`と`Git`の連携
- `Docker`の勉強の一環にもなります
- その他`devcontainer`のノウハウ
::::

## はじめに

みなさん`Docker`活用してますか？
CI/CDで`Docker Image`を使うのはもちろんですが、やはりコンテナの有用性は、
**環境に依存せずどこでも同じように動作すること**ですよね

それを活用して**みんな同じ開発環境が使えたら嬉しくないですか？**
そんなときに使えるのが`devcontainer`の仕組みです

:::column:devcontainerを活用した機能で、GitHub Codespacesというのもあるよ
リポジトリをまるごとdevcontainerで他の開発者と共有できるので**やりたいことは叶います！**
ただし、筆者は以下の理由でちゃんと使えていませんでした。

- ブラウザで動かすので操作に癖がある
- 環境はローカルに置いておきたい (リポジトリを直接弄っている気がしてソワソワする)

ですが、devcontainerを理解すればCodespacesが何をやっているかが分かるようになるので、
その勉強としても試してみる価値はあると思います。

GitHub Codespacesについては、こちらをチェック！
　→ [GitHub CodespacesによるJavaのチーム開発環境の作り方](https://developer.mamezou-tech.com/blogs/2023/06/26/codespaces-for-java/)
:::

- Node.js？npx？どんどんバージョン増えるので要らないです。
- wingetが使えるようになった？便利ですよね。でも環境構築するときに結局細々した設定が必要！
- プロジェクトの新規加入メンバーに導入手順を渡して1日浪費？もっっっったいないし面倒！！
  (やることでプロジェクトの理解は深まると思いますが)

:::check:前提条件
VSCode (WindowsにそのままインストールでOK)
　+
【拡張機能】 `code --install-extension [拡張機能ID]`
`ms-ceintl.vscode-language-pack-ja` 一応日本語化用
`ms-vscode-remote.remote-containers` devcontainerに必要
`ms-vscode-remote.remote-wsl` WSL環境に必要
::::

## 説明する内容

1. WSLのセットアップ (できていれば飛ばしてOK)
1. 作業ディレクトリの用意
1. 開発環境イメージの選定と定義
1. devcontainer.jsonの実装

---

## WSLのセットアップ (できていれば飛ばしてOK)

### WSLのインストール

1. WSL本体の導入

    Powershell (管理者権限) で以下を実行

    ```powershell
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
    # 実行後に再起動が必要
    ```

1. Ubuntuのディストリビューションを指定してインストール

    コマンドプロンプトで以下を実行 (時間かかります)

    ```bash
    SET DISTRIBUTION=Ubuntu-22.04
    wsl --install --distribution %DISTRIBUTION%
    # たぶんここでデフォルトユーザーとパスワードの入力がある
    ```

    :::column:ディストリビューションのアンインストール

    ```bash
    wsl --unregister Ubuntu-22.04
    winget uninstall Canonical.Ubuntu.2204
    ```

    :::

### WSLにDocker CLIをインストール

Windowsの`Docker Desktop`には会社の制限がありますよね。
Dockerが使えないと泣いていたあなたでもWSLが使えるなら、`Docker CLI`で解決です！
以下をWSLのターミナルで実行して数分待てばインストール完了です。

:::column:VSCodeをWSL環境で開く方法

1. Ctrl+Shift+Pでコマンドパレットを開く
1. `WSL: Connect to WSL`を入力しEnter
1. 前提の拡張機能が入っていればウィンドウが切り替わるはずです
1. WSLでのターミナルは`Bash`を使いましょう
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

上記コマンドの詳細が知りたければこちらをご参照ください
　→ [Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

### とりあえずGitもセットアップ

```bash
git config --global user.name "[名前]"
git config --global user.email [メールアドレス]
ssh -T git@github.com
# yes
```

## 作業ディレクトリの用意

1. 適当なフォルダをWSL上で用意してください。(下記の例はユーザーフォルダ直下の`devEnvSample`フォルダ)

    ```bash
    mkdir ~/devEnvSample
    code ~/devEnvSample
    ```

    :::column:codeコマンド

    VSCodeのコマンドです。PATHを通せばcmdからでも任意のものがVSCodeで開けるゾ
    引数でパスを指定し、

    - 対象がファイルであれば、カレントウィンドウで開いて編集できるようになります
    - 対象がフォルダであれば、ウィンドウを切り替えてワークフォルダが指定のパスに切り替わります

    詳細はリファレンスで
    　→ [The Visual Studio Code command-line interface](https://code.visualstudio.com/docs/editor/command-line)
    :::

1. 作成したフォルダが新規ウィンドウで開かれているので、ここで.devcontainerフォルダを作成

    ```bash
    mkdir .devcontainer
    ```

1. 作成した.devcontainerフォルダ内にファイルを作成

    ```bash
    touch .devcontainer/{Dockerfile,devcontainer.env,compose.yaml,devcontainer.json}
    ```

1. こうなっていればOKです

    ```txt
    ~/devEnvSample$ tree -a
    .
    └── .devcontainer
        ├── Dockerfile
        ├── compose.yaml
        ├── devcontainer.env
        └── devcontainer.json
    ```

    :::column:treeコマンドはデフォルトでは入っていません

    ```bash
    sudo apt install tree
    ```

    :::

## 開発環境イメージの選定と定義

いよいよdevcontainerのDocker Image設定ファイルを作っていきます。

:::stop:VSCode公式リファレンスについて
[VSCodeのリファレンス](https://code.visualstudio.com/docs/devcontainers/containers)には、開発言語に合わせてイメージとイメージタグを選択するフローが記載されていますが、
正直これはオススメできません。

イマドキの開発は、複数の言語を同時に使った開発が多いと思っています。
Java用のイメージを使ってdevcontainerを使っていても、
途中で別の言語のインストールをしていたら、イメージを使っている意味が薄くなってしまいます。

そのためベースイメージはベーシック, プレーンなものを選びましょう。
また、devcontainer.jsonから直接、使用するイメージを使うことができますが、docker-composeを使用することをオススメします。
:::

1. Dockerfileにベースイメージを定義

    ```Dockerfile:Dockerfile
    ARG TAG
    FROM ubuntu:${TAG}
    ```

    - alpineなどの軽量イメージを使っても、なんだかんだ不都合があったりするので、
        私はよく普通のubuntuイメージを使っています。
    - とりあえず引数でイメージタグを受けるようにだけしてあります。
    - その他、基本的にどの開発環境でも必要なライブラリ等があればインストールしておいてOKです。

1. Docker Image用のenvファイルを定義
    システムの根本的なものだけ定義し、次のcomposeファイルで使います。

    ```env:devcontainer.env
    TZ="Asia/Tokyo"
    LANG="C.UTF-8"
    ```

1. docker-composeにサービスを定義
    4行目の`ubuntu`というサービス名を、後述のdevcontainer.jsonで使います。

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

    :::column:docker-composeのファイル名

    いつの間にか`compose.yaml`が推奨になっていたらしい
    [Compose file reference](https://docs.docker.com/reference/compose-file/#compose-file)
    :::

なんと、イメージ選定と定義は以上です。
Javaの環境は？とかはまた後で。

## devcontainer.jsonの実装

これから作るのはこちら

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
    "containerEnv": {},
    "remoteEnv": {},
    "portsAttributes": { "80": { "label": "http", "onAutoForward": "silent" } },

    // ## Container command
    // warning: To use .sh you need mount
    // info: key is output stage
    "overrideCommand": true,

    // IDE
    "customizations": {
        "vscode": {
            "extensions": [],
            "settings": {}
        }
    }
}
```

===================================== ここまで一旦完了

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

## その他

```bash
# keychainに必要なsshのバージョンアップ
winget install Microsoft.OpenSSH.Beta
```

[dockerhub](https://hub.docker.com/)
[devcontainer_metadata_reference](https://containers.dev/implementors/json_reference/)
[features](https://containers.dev/features)

VSCodeのタスク機能を使って、devcontainerの立ち上げやリビルドを設定しておくと嬉しいかもですね
[devcontainer CLI](https://code.visualstudio.com/docs/devcontainers/devcontainer-cli)
WindowsにインストールしたVSCodeの拡張機能は最小限にして、WSLのVSCodeに基本的に使いたい機能を入れています。

- [注釈] devcontainerはMicrosoftがリファレンスを出しているので、MicrosoftのVSCodeが率先して環境整備しているように見えます。
    - 現に、開発用イメージもmicrosoftのものやvscodeがデフォルトユーザーになっているものが基本になっています。
