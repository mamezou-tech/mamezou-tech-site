---
title: 【devcontainer完全ガイド】DockerとWSLでイマドキの最強の開発環境を手に入れよう！
author: toshiki-nakasu
date: 2024-10-11
tags: [開発環境, devcontainer, docker, wsl, ubuntu, Git, vscode, Codespaces, ssh]
image: true
---

:::info:この記事で紹介すること

- *devcontainer*をローカルで構築します
    *devcontainer*をリポジトリに組み込めば、誰でも同じように環境再現できるようになります
- *devcontainer*と*WSL*と*Git*の連携
- *Docker*の勉強の一環にもなります
- その他*devcontainer*のノウハウ
:::

## はじめに

みなさん**Docker**活用してますか
CI/CDでDocker Imageを使うのはもちろんですが、やはりコンテナの有用性は、
**環境に依存せずどこでも同じように動作すること**ですよね。

それを活用して**みんな同じ開発環境が使えたら嬉しくないですか**
そんなときに使えるのが**devcontainer**の仕組みです。

:::column:GitHub Codespaces

devcontainerを活用した機能で、GitHub Codespacesというのもあります。
リポジトリをまるごとdevcontainerで他の開発者と共有できるので**やりたいことは叶います**。
ただし、筆者は以下の理由で使っていませんでした。

- ブラウザで動かすので操作に癖がある。
- 環境はローカルに置いておきたい (リポジトリを直接弄っている気がしてソワソワする)。

ですが、devcontainerを理解すればCodespacesが何をやっているかが分かるようになるので、
その勉強としても試してみる価値はあると思います。

GitHub Codespacesについては、こちらをチェック
[GitHub CodespacesによるJavaのチーム開発環境の作り方](https://developer.mamezou-tech.com/blogs/2023/06/26/codespaces-for-java/)

:::

以下に当てはまるアナタへ役立つ記事です。

- Node.js, npx, Javaなどはどんどんバージョン増えるので入れたくないですよね。
- VSCodeの拡張機能がたくさん増えてしまって重くなってしまうのも嫌ですよね。
- プロジェクトの新規加入メンバーに導入手順を渡して1日浪費するのは、もったいないし面倒ですよね。
  (やることでプロジェクトの理解は深まると思いますが)

:::check:前提条件

*VSCode* (WindowsにそのままインストールでOK)
　+
VSCode拡張機能

- *ms-ceintl.vscode-language-pack-ja*: 一応、日本語化用
- *ms-vscode-remote.remote-containers*: devcontainerに必要
- *ms-vscode-remote.remote-wsl*: WSL環境に必要

なければコマンドプロンプトで以下を実行してください。

```batch
winget install Microsoft.VisualStudioCode
code --install-extension ms-ceintl.vscode-language-pack-ja
code --install-extension ms-vscode-remote.remote-containers
code --install-extension ms-vscode-remote.remote-wsl
```

:::

## 説明する内容

1. [WSLのセットアップ (できていれば飛ばしてOK)](#wslのセットアップ-できていれば飛ばしてok)
1. [作業ディレクトリの用意](#作業ディレクトリの用意)
1. [開発環境イメージの選定と定義](#開発環境イメージの選定と定義)
1. [devcontainer.jsonの実装](#devcontainerjsonの実装)
1. [devcontainerの立ち上げ](#devcontainerの立ち上げ)
1. [リポジトリにpushじゃあああ](#リポジトリにpushじゃあああ)

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

    ```batch
    SET DISTRIBUTION=Ubuntu-22.04
    WSL --install --distribution %DISTRIBUTION%
    REM デフォルトユーザーとパスワードの設定
    ```

    :::column:ディストリビューションのアンインストール

    ```batch
    WSL --unregister Ubuntu-22.04
    winget uninstall Canonical.Ubuntu.2204
    ```

    :::

### WSL環境にDocker CLIをインストール

Windowsの*Docker Desktop*には会社の制限がありますよね。
「Dockerが使えない」と泣いていたあなたでも、WSLが使えるのであれば*Docker CLI*で解決です。
以下をWSL環境のBashターミナルで実行して数分待てばインストール完了です。

:::column:VSCodeをWSL環境で開く方法

1. `Ctrl+Shift+P`でコマンドパレットを開く
1. `WSL: Connect to WSL`を入力しEnter
1. 前提の拡張機能が入っていればウィンドウが切り替わるはずです
1. WSL環境でのターミナルは*Bash*を使いましょう
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

上記コマンドの詳細が知りたければこちらをご参照ください [Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

:::check:Docker拡張機能

- WSL環境のVSCodeにDockerの拡張機能*ms-azuretools.vscode-docker*を入れておくことをオススメします。
    コンテナやイメージの一覧がすぐ見られます。
- Windows環境に入れる場合、*Docker Desktop*がないと怒られます。

:::

### とりあえずGitもセットアップ

```bash
git config --global user.name "[名前]"
git config --global user.email "[メールアドレス]"
ssh -T git@github.com
# yes
```

## 作業ディレクトリの用意

:::info:参照リポジトリ

以降で作るものの完成形は、こちらのリポジトリの内容です [devcontainer_sample](https://github.com/toshiki-nakasu/devcontainer_sample)

:::

1. 適当なフォルダをWSL環境で用意してください。
    (下記の例はユーザーフォルダ直下の*devcontainer_sample*フォルダ)

    ```bash
    mkdir ~/devcontainer_sample
    code ~/devcontainer_sample
    ```

    :::column:codeコマンド

    VSCodeのコマンドです。PATHを通せばcmdからでも任意のものがVSCodeで開けます。
    引数でパスを指定します。

    - 対象がファイルであれば、カレントウィンドウで開いて編集できるようになります。
    - 対象がフォルダであれば、ウィンドウを切り替えてワークフォルダが指定のパスに切り替わります。

    詳細はリファレンスで。 [The Visual Studio Code command-line interface](https://code.visualstudio.com/docs/editor/command-line)

    :::

1. 作成したフォルダが新規ウィンドウで開かれているので、ここで *.devcontainer*フォルダを作成

    ```bash
    mkdir .devcontainer
    ```

1. 作成した *.devcontainer*フォルダ内にファイルを作成

    ```bash
    touch .devcontainer/{Dockerfile,devcontainer.env,compose.yaml,devcontainer.json}
    ```

1. こうなっていればOKです

    ```textile
    ~/devcontainer_sample$ tree -a
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
個人的にこれはオススメできません。

イマドキの開発は、複数の言語を同時に使った開発が多いと思っています。
Java用のイメージを使ってdevcontainerを使っていても、
途中で別の言語のインストールをしていたら、イメージを使っている意味が薄くなってしまいます。

そのためベースイメージはベーシック, プレーンなものを選びましょう。
また、devcontainer.jsonから直接、使用するイメージを使うことができますが、**docker-compose**を使用することをオススメします。

:::

1. Dockerfileにベースイメージを定義

    ```docker:Dockerfile
    ARG TAG
    FROM ubuntu:${TAG}
    ```

    - alpineなどの軽量イメージを使ってもなんだかんだ不都合があったりするので、
        私はよく普通のubuntuイメージを使っています。
    - このファイルでは、引数でイメージタグを受けるようにしてあります。
    - その他、基本的にどの開発環境でも必要なライブラリ等があればインストールしておいてOKです。
    - 自分で探したい人はDocker Hubから見つけましょう。 [dockerhub](https://hub.docker.com/)

    :::info:devcontainer用のイメージ

    Microsoftがdevcontainer用のイメージとして提供しているものがあります。 [microsoft/devcontainers](https://hub.docker.com/r/microsoft/devcontainers)
    セクションのはじめにも記載したとおり、ここでJavaなど言語固有のイメージを使わないことをオススメします。

    また、例で記載しているubuntuのイメージよりも、*mcr.microsoft.com/devcontainers/base:ubuntu-22.04*が適している可能性が高いです。
    私はプレーンなubuntuと違うことで不都合があったら嫌だなと思って使っていませんが、
    どういう違いがあるかは把握していません (無駄な拡張機能とか入れられたら嫌だし...)。

    :::

1. Docker Image用のenvファイルを定義
    **システムの根本的なものだけ定義**し、次のcomposeファイルで使います

    ```ini:devcontainer.env
    TZ="Asia/Tokyo"
    LANG="C.UTF-8"
    ```

1. docker-composeにサービスを定義
    ubuntuのイメージからplainというイメージを作っています。
    この例は最低限の実装なのでplainイメージには何も有り難みがないです。
    **4行目の*ubuntu*というサービス名を、後述のdevcontainer.jsonで使います**

    ```yaml:compose.yaml
    version: '3.8'

    services:
        ubuntu:
            build:
                context: .
                dockerfile: Dockerfile
                args:
                    TAG: 22.04
            image: plain:22.04
            hostname: ubuntu
            env_file:
                - devcontainer.env
    ```

    :::column:docker-composeのファイル名

    いつの間にか「*compose.yaml*」が推奨になっていたらしい [Compose file reference](https://docs.docker.com/reference/compose-file/#compose-file)

    :::

なんと、イメージ選定と定義は以上です。
Javaの環境などについては↓の*features*で。

## devcontainer.jsonの実装

これから作るのはこちら。

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

    // ## IDE
    "customizations": {
        "vscode": {
            "extensions": [],
            "settings": {}
        }
    }
}
```

それぞれ区切って解説します
詳細はリファレンスへ [Dev Container metadata reference](https://containers.dev/implementors/json_reference/)

### To create image

作成するコンテナの名前 (*name*) とdevcontainerを開いたときの*workspaceFolder*を指定します。
*shutdownAction*はdevcontainerを終了したときの動作で、デフォルトは*stopCompose*ですが、
気になるので明示的に書いています。

```json
{
    "name": "mySample",
    "workspaceFolder": "/workspace",
    "shutdownAction": "stopCompose",
}
```

### From base image

compose.yamlのパスとその中から使うサービス名を記述します。
*runServices*で複数起動もできます。便利そうだけど、活用できてない。

```json
{
    "dockerComposeFile": ["./compose.yaml"],
    "service": "ubuntu",
    "runServices": [],
}
```

:::alert:イメージの指定について

イメージを指定する方法は3種類あります。
それぞれのパターンによって必須パラメータが異なるので、詳細はリファレンスをご確認ください。[Scenario specific properties](https://containers.dev/implementors/json_reference/#scenario-specific)

1. *devcontainer.json*に直接イメージを指定
1. *compose.yaml*からサービスを指定 (今回はコレ)
1. *Dockerfile*を指定

:::

### Resources

一番カスタマイズするところです。

```json
{
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
}
```

#### *mounts*

- devcontainer内で活用するファイルやフォルダを紐付けましょう
    ここで見慣れない変数が出てきました
    - *\${localWorkspaceFolder}*: VSCodeで現在開いているウィンドウのルートパスに置き換わります
    - *\${containerWorkspaceFolder}*: *workspaceFolder*で指定したパスに置き換わります

    その他、詳細はリファレンスへ [Variables in devcontainer.json](https://containers.dev/implementors/json_reference/#variables-in-devcontainerjson)

    :::stop:mountの構築段階では環境変数が使えません

    使える変数も限られているのでちょっと不便です。

    :::

- 書くことは普段のDockerのbindやvolumeの内容と変わりません
    volumeは*compose.yaml*で定義していなくても*devcontainer.json*で記述すれば作ってくれます

    :::info:dockerのmountの記述

    Dockerを普段から活用している皆さんは、*short syntax*ではなく*long syntax*で書きましょう。 [^1]
    [Docker-docs-ja](https://docs.docker.jp/storage/bind-mounts.html#v-mount)

    :::

:::column:.dockerignore

.dockerignoreを*devcontainer.json*の階層に置いておいたりすると、mountでvolumeにしておきたい*node_modules*などの除外ができます。
ただし、*.gitignore*とは若干勝手が違うので、記述は最低限にしましょう。

:::

#### *features*

これがdevcontainerの一番の特徴といっても過言ではありません (名前の通り)。

- **このfeaturesを指定することで特定の言語の環境構築や設定を諸々済ませてくれます**。
    拡張機能も一緒につけてくれるおまけ付きです
    (個人的には追加で入れてくる拡張機能は自分で指定したいところですが...)。
- 存在するfeatureはここから探してください。 [Features](https://containers.dev/features)
- featureによってはパラメータでバージョンなどを指定できます。
- **例えばJava+Node.js+AWS (Terraform) の環境を作る場合**。

    | feature | コメント |
    | --- | --- |
    | *ghcr.io/devcontainers/features/common-utils:2* | イメージ内のユーザー作成 (UIDも指定可能)<br>デフォルトは*vscode*ユーザーが作られるのですが、なんか嫌なので使っています。|
    | *ghcr.io/devcontainers/features/git:1* | Gitの環境構築 (大体のイメージには標準でありますが、一応入れています) |
    | *ghcr.io/devcontainers/features/java:1* | Javaの環境構築 (もちろんバージョン指定可能) |
    | *ghcr.io/devcontainers/features/node:1* | Node.jsの環境構築 (もちろんバージョン指定可能) |
    | *ghcr.io/devcontainers/features/aws-cli:1* | AWS-CLIが入れられます (`~/.aws`のbindを忘れずに) |
    | *ghcr.io/devcontainers/features/terraform:1* | Terraformが入れられます |

    :::column:イマドキ開発にうってつけの、*Docker-in-Docker*のfeatureもあります
    :::

### Environment

```json
{
    "remoteUser": "developer",
    "containerEnv": {},
    "remoteEnv": {},
    "portsAttributes": { "80": { "label": "http", "onAutoForward": "silent" } },
}
```

#### *remoteUser*

コンテナで作業する際のユーザー名。

#### *containerEnv*

**あまり使わないことを推奨**。
コンテナ固有の環境変数で、変化するとコンテナの再構築が必要。

#### *remoteEnv*

- 接続時のみに反映される環境変数。
- *containerEnv*よりも使いやすい。
- *AWS_DEFAULT_PROFILE*などをセットして使っています。
    (もちろんこの環境変数を使う場合は`~/.aws`をマウントしましょうね。)

#### *portsAttributes*

属性についてはリファレンスを参照してください。 [Port attributes](https://containers.dev/implementors/json_reference/#port-attributes)

:::alert:portの穴開けについて

*forwardPorts*も同じような機能があり、どちらを使った方が良いかはまだ分かっていません。

:::

### Container command

```json
{
    "overrideCommand": true,
}
```

- コンテナのcreate時やattach時に実行するコマンドを指定できます。
    - タイミングやライフサイクルによってコマンドが6種類もあります。
    - 例えばコンテナを構築した時に、*node_modules*のvolumeの`chown`や`npm install`をするが、
        一度コンテナを作ったら、以降でコンテナにattachする際は実行する必要が無いものなど。
- 定義できるコマンドはこちら (注意点もたくさんあります)。 [Lifecycle scripts](https://containers.dev/implementors/json_reference/#lifecycle-scripts)

:::alert:overrideCommand

*Dockerfile*や*docker-compose*を使ってdevcontainerを定義している場合、(今回も該当)
記載しているように*overrideCommand*を*true*にした上で定義する必要があります。

:::

:::stop:私がハマったポイント

- スクリプトファイルを実行したい場合、それをバインドした時の絶対パスを書かないと実行できない。
    WSL環境のパスではダメ。
- スクリプトファイルの実行は`sh $スクリプトファイルパス`。
    `/bin/bash`や`bash`は使えませんでした。

得たノウハウ↓

- *.devcontainer*をリポジトリに含む場合
    - 気にしなくて良い
- *.devcontainer*をリポジトリに含めない場合
    1. *.devcontainer*内にscriptフォルダを用意し、その中に実行したいスクリプトを実装
    1. `/workspace/repos`にリポジトリをbind
    1. `/workspace/script`に`.devcontainer/script`をbind
        - スクリプトフォルダのパスを環境変数にするのも良い

:::

### IDE

```json
{
    "customizations": {
        "vscode": {
            "extensions": [],
            "settings": {}
        }
    }
}
```

IDE固有の記述です。
これもリファレンスがあります。みなさんの好きなもので使えると良いですね。 [Supporting tools and services](https://containers.dev/supporting)

今回はVSCodeに限った紹介をします。

#### *extensions*

- devcontainer内で自動的にインストールされる拡張機能で、拡張機能のIDを指定します。
- featuresによって勝手にインストールされる拡張機能もありますが、重複は問題ありません。

:::check:devcontainer内のVSCode拡張機能

VSCodeを活用する際に、拡張機能をたくさん使っている方も少なくないと思います。
そんなみなさんが、「devcontainerごとにいちいち拡張機能をリストアップできるかーい」って思うと思います (私は思いました)。

そんなあなたに朗報です。
VSCodeの*settings.json*に`dev.containers.defaultExtensions`の項目を配列型で定義しそこに拡張機能IDを書いておけば、
*devcontainer.json*に書かなくても毎回使うような拡張機能はここから勝手にインストールしてくれます。

これを設定すれば、*devcontainer.json*にはそのプロジェクトで必要な最低限の拡張機能を書くだけで良くなります。

:::

#### *settings*

- リポジトリの *.vscode*に含むもよし、ここで設定するのもよし。
- ユーザーの*settings.json*も使われますのでご安心を。
- なので私はあんまりここに書かないです

:::column:Dev Container CLI

思っていたより長文になってしまってスミマセン。
ここで一息入れましょう。もうあと少しです。

ところで、devcontainerの機能にもCLIがあるんですね。知らなかったです。[devcontainer CLI](https://code.visualstudio.com/docs/devcontainers/devcontainer-cli)
vscodeのtaskやlaunch.jsonが大好きな人には嬉しい機能ですね (私とか)。

:::

## devcontainerの立ち上げ

おめでとうございます。
ここまでで設定ファイルができあがれば、あとは以下の手順でdevcontainerを立ち上げることができます。

1. WSL環境のVSCodeで、`Ctrl+Shift+P`でコマンドパレットを開く
1. `Dev Containers: Rebuild and Reopen in Container`を入力しEnter
    - VSCodeで開いているワークフォルダから *.devcontainer/\*/devcontainer.json*を探して、
        構文チェックが済むとcreateが始まります (複数あると選択ポップアップが出ます)。
    - create中にエラーがあってもWSL環境に戻って、エラースタックが表示されるので安心です
1. devcontainer起動後のウィンドウで、VSCodeの拡張機能のインストールが終了すれば完了です
1. WSL環境に戻る場合は、再度コマンドパレットを開いて、`Dev Containers: Reopen Folder in WSL`を実行します
1. **次回以降はコマンドパレットから、`Dev Containers: Reopen in Container`を実行します**
    コンテナの再構築は不要なので初回より断然、時間がかからなくなります
1. WSL環境のVSCodeに*ms-azuretools.vscode-docker*拡張機能を入れておけば、
    コンテナやイメージの一覧が出るので嬉しいです

## リポジトリにpushじゃあああ

:::info:ここからの話

ここからはdevcontainerの構築とは少し違う話になります。
**リポジトリが前提になります。**
少し前に出た、*.devcontainer*フォルダをリポジトリに含む, 含まないも関係ない話です。

:::

devcontainer環境下で開発をしていて、リポジトリの内容を更新したので、
いざ`git push`...というときにエラーが出ます。

「そうか、*.gitconfig*のbindをしていないじゃないか」
→ 違います。devcontainerは *~/.gitconfig*を自動で複製してくれます。

:::stop:GitのSSH

どうやらHTTPSで`git clone`している場合は問題ないようですが、
SSHキーを使用している場合はローカルのssh-agentの起動と、ssh-addが必要なようです。 [Sharing git credentials](https://code.visualstudio.com/remote/advancedcontainers/sharing-git-credentials)
ssh-agentは起動のたびに秘密鍵の登録が必要でした。
しかしWSL環境で素直にそれをやっていると、ssh-agentがどんどん増えてしまう問題があるようです。

:::

というわけで、そのあたりの導入をします。

### Windows側のSSHインストール

```batch
REM sshのバージョンアップ
winget install Microsoft.OpenSSH.Beta
```

### WSL環境でsshキー生成

```bash
KEY_NAME=ed25519

sudo apt update
sudo apt install -y \
   openssh-client \
   keychain \
   socat \
   xsel &&
  sudo apt clean &&
  sudo rm -rf /var/lib/apt/lists/*

# keyがなければ生成
if [ ! -f $HOME/.ssh/id_${KEY_NAME} ]; then
   ssh-keygen -t ${KEY_NAME}
   echo "clipboard: id_${KEY_NAME}.pub content"
   cat $HOME/.ssh/id_${KEY_NAME}.pub | xsel -bi
fi

# 自動エージェント起動の設定
echo \
   "if [ -z \"\$SSH_AUTH_SOCK\" ]; then
   RUNNING_AGENT=\"\`ps -ax | grep 'ssh-agent -s' | grep -v grep | wc -l | tr -d '[:space:]'\`\"
   if [ \"\$RUNNING_AGENT\" = \"0\" ]; then
        ssh-agent -s &> $HOME/.ssh/ssh-agent
   fi
   eval \`cat $HOME/.ssh/ssh-agent\` > /dev/null
   ssh-add $HOME/.ssh/id_${KEY_NAME} 2> /dev/null
fi" \
   >$HOME/.bash_profile

echo \
   "/usr/bin/keychain -q --nogui $HOME/.ssh/id_${KEY_NAME}
source $HOME/.keychain/$(hostname)-sh" \
   >$HOME/.bashrc
```

軽く説明します。

1. 必要なものを`apt install`しています。
1. `~/.ssh/id_ed25519`がなければ生成します。
    - 公開鍵はクリップボードに送られています。
1. ssh-agentの起動とssh-addを *.bash_profile*に**上書き**します。
    - 困るようであれば追記に修正してください。
1. keychainというもので、devcontainerとの連携を定義し *.bashrc*に**上書き**します
    - 困るようであれば追記に修正してください。
1. 手動で、GitHubのSSHキー登録先にクリップボードの内容を登録してください。
    <https://github.com/settings/keys>
1. あとはdevcontainer内部で、`ssh -T git@github.com`が実行できれば問題ありません。

## おわりに

お疲れ様でした。これでみんな幸せに開発環境構築できますね。
個人的にポイントだと思うのは、**ベースとするDocker Imageを言語固有のものにしないこと**です。
記事中に書いたとおり、開発環境に複数の言語を入れることになるのであれば、
言語固有のものは使わない方が良いと思います。

またお気づきかもしれませんが、今回Docker Imageが3つ登場します。

1. ubuntu:22.04
1. plain:22.04
1. devcontainerのイメージ

*compose.yaml*を開発環境で共有して一カ所で管理してしまうと、同じイメージを参照して不都合があったので、
開発環境ごとに複製したほうがよいです。

まだノウハウなども多くない内容だと思いますので、どんどんオレオレ環境を作っていきましょう。

[^1]: 「『Docker Composeのmountを1行で書くな』校歌を作詞してください」

    ```textfile:Copilotくんの作詞
    Verse 1: コンテナの海を渡り
        我らのコードは進む
        1行のmountは避けて
        安全な道を選ぶ
    Chorus: Docker Composeの力
        我らの手に宿り
        未来のシステム築く
        団結の力で

    Verse 2: 設定ファイルを見つめ
        誤りを防ぐために
        1行のmountはやめて
        明確な道を示す
    Chorus: Docker Composeの力
        我らの手に宿り
        未来のシステム築く
        団結の力で

    Verse 3: チームの力を信じ
        共に進むこの道
        1行のmountは捨てて
        新たな未来を描く
    Chorus: Docker Composeの力
        我らの手に宿り
        未来のシステム築く
        団結の力で
    ```
