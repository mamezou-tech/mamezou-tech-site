---
title: >-
  【Complete Guide to Devcontainer】Get the Ultimate Modern Development
  Environment with Docker and WSL!
author: toshiki-nakasu
date: 2024-10-11T00:00:00.000Z
tags:
  - 開発環境
  - devcontainer
  - docker
  - wsl
  - ubuntu
  - Git
  - vscode
  - Codespaces
  - ssh
image: true
translate: true

---

:::info:What this article introduces

- Build a *devcontainer* locally
  By incorporating a *devcontainer* into a repository, anyone can reproduce the environment in the same way.
- Integration of *devcontainer*, *WSL*, and *Git*
- It also serves as a study of *Docker*
- Other *devcontainer* know-how
:::

## Introduction

Is everyone utilizing **Docker**? While it's natural to use Docker Image in CI/CD, the true utility of containers is that **they operate the same way anywhere without being dependent on the environment**.

Wouldn't it be great if everyone could use the same development environment by leveraging that? The mechanism that can be used in such a situation is **devcontainer**.

:::column:GitHub Codespaces

There's also a feature called GitHub Codespaces that utilizes devcontainer. You can share the entire repository with other developers using devcontainer, so **you can achieve what you want**. However, the author didn't use it for the following reasons:

- When operating in a browser, it's cumbersome and difficult to use.
- I want to keep the environment locally (I feel uneasy as if I'm directly messing with the repository).

However, if you understand devcontainer, you'll understand what Codespaces is doing, so it's worth trying as a study.

Check out more about GitHub Codespaces here:
[How to Create a Java Team Development Environment with GitHub Codespaces](https://developer.mamezou-tech.com/blogs/2023/06/26/codespaces-for-java/)

:::

This article is useful for you if you fit the following:

- You don't want to install Node.js, npx, Java, etc., as their versions keep increasing.
- You dislike it when VSCode's extensions increase and become heavy.
- It's a waste and hassle to spend a day giving new project members the introduction procedure.
  (I think understanding the project deepens by doing it)

:::check:Prerequisites

*VSCode* (install directly on Windows is OK)
+
VSCode extensions

- *ms-ceintl.vscode-language-pack-ja*: For Japanese localization
- *ms-vscode-remote.remote-containers*: Necessary for devcontainer
- *ms-vscode-remote.remote-wsl*: Necessary for WSL environment

If not available, execute the following in the command prompt.

```batch
winget install Microsoft.VisualStudioCode
code --install-extension ms-ceintl.vscode-language-pack-ja
code --install-extension ms-vscode-remote.remote-containers
code --install-extension ms-vscode-remote.remote-wsl
```

:::

## Contents to be explained

1. [WSL Setup (Skip if already done)](#wsl-setup-skip-if-already-done)
1. [Prepare the Working Directory](#prepare-the-working-directory)
1. [Select and Define the Development Environment Image](#select-and-define-the-development-environment-image)
1. [Implement devcontainer.json](#implement-devcontainerjson)
1. [Launch the devcontainer](#launch-the-devcontainer)
1. [Push to the Repository!](#push-to-the-repository)

---

## WSL Setup (Skip if already done)

### Install WSL

1. Install WSL itself

    Execute the following in Powershell (administrator privileges)

    ```powershell
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
    # A restart is required after execution
    ```

1. Specify and install the Ubuntu distribution

    Execute the following in the command prompt (it takes time)

    ```batch
    SET DISTRIBUTION=Ubuntu-22.04
    WSL --install --distribution %DISTRIBUTION%
    REM Set default user and password
    ```

    :::column:Uninstall the distribution

    ```batch
    WSL --unregister Ubuntu-22.04
    winget uninstall Canonical.Ubuntu.2204
    ```

    :::

### Install Docker CE in WSL Environment

There are company restrictions on *Docker Desktop* for Windows. Even if you were crying "I can't use Docker," if you can use WSL, you can solve it by installing *Docker CE* on the Ubuntu side. Execute the following in the WSL environment's Bash terminal, and the installation will be completed in a few minutes.

:::column:How to open VSCode in WSL environment

1. Open the command palette with `Ctrl+Shift+P`
1. Enter `WSL: Connect to WSL` and press Enter
1. If the prerequisite extensions are installed, the window should switch
1. Use *Bash* for the terminal in the WSL environment
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
# Can be executed without sudo after restarting the terminal
```

If you want to know the details of the above commands, please refer here [Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

:::check:Docker Extensions

- It is recommended to install the Docker extension *ms-azuretools.vscode-docker* in the VSCode of the WSL environment.
  You can quickly see a list of containers and images.
- If installed in the Windows environment, it will complain without *Docker Desktop*.

:::

### Set up Git for now

```bash
git config --global user.name "[Name]"
git config --global user.email "[Email Address]"
ssh -T git@github.com
# Answer `yes` when asked
```

## Prepare the Working Directory

:::info:Reference Repository

The completed form of what will be created from here is the content of this repository [devcontainer_sample](https://github.com/toshiki-nakasu/devcontainer_sample)

:::

1. Prepare an appropriate folder in the WSL environment.
    (The example below is the *devcontainer_sample* folder directly under the user folder)

    ```bash
    mkdir ~/devcontainer_sample
    code ~/devcontainer_sample
    ```

    :::column:code command

    It's a VSCode command. If you set the PATH, you can open anything with VSCode from cmd.
    Specify the path as an argument.

    - If the target is a file, it will open in the current window for editing.
    - If the target is a folder, the window will switch, and the work folder will switch to the specified path.

    For more details, refer to the reference. [The Visual Studio Code command-line interface](https://code.visualstudio.com/docs/editor/command-line)

    :::

1. The created folder is opened in a new window, so create a *.devcontainer* folder here

    ```bash
    mkdir .devcontainer
    ```

1. Create files in the created *.devcontainer* folder

    ```bash
    touch .devcontainer/{Dockerfile,devcontainer.env,compose.yaml,devcontainer.json}
    ```

1. It should look like this

    ```textile
    ~/devcontainer_sample$ tree -a
    .
    └── .devcontainer
        ├── Dockerfile
        ├── compose.yaml
        ├── devcontainer.env
        └── devcontainer.json
    ```

    :::column:tree command is not installed by default

    ```bash
    sudo apt install tree
    ```

    :::

## Select and Define the Development Environment Image

Now, let's create the Docker Image configuration file for the devcontainer.

:::stop:About VSCode official reference

The [VSCode reference](https://code.visualstudio.com/docs/devcontainers/containers) describes a flow for selecting images and image tags according to the development language, but personally, I do not recommend this.

I think modern development often involves using multiple languages simultaneously. Even if you are using a devcontainer with an image for Java, if you are installing another language along the way, the meaning of using the image becomes less significant.

Therefore, choose a basic, plain base image. Also, while you can use images directly from devcontainer.json, it is recommended to use **docker compose**.

:::

1. Define the base image in the Dockerfile

    ```docker:Dockerfile
    ARG TAG
    FROM ubuntu:${TAG}
    ```

    - Even if you use lightweight images like alpine, there tend to be inconveniences, so I often use the regular Ubuntu image.
    - This file is set to receive the image tag as an argument.
    - You can install any libraries, etc., that are generally necessary for any development environment.
    - If you want to find it yourself, look for it on Docker Hub. [dockerhub](https://hub.docker.com/)

    :::info:Images for devcontainer

    Microsoft provides images for devcontainer. [microsoft/devcontainers](https://hub.docker.com/r/microsoft/devcontainers)
    As mentioned at the beginning of the section, I recommend not using language-specific images like Java here.

    Also, *mcr.microsoft.com/devcontainers/base:ubuntu-22.04* may be more suitable than the Ubuntu image mentioned in the example.
    I haven't used it because I don't want any inconveniences due to differences from plain Ubuntu, but I'm not aware of what differences there are (I don't want unnecessary extensions installed...).

    :::

1. Define the env file for Docker Image
    **Only define fundamental system elements** and use them in the next compose file

    ```ini:devcontainer.env
    TZ="Asia/Tokyo"
    LANG="C.UTF-8"
    ```

1. Define the service in docker compose
    A plain image is created from the Ubuntu image.
    This example is a minimal implementation, so the plain image has no advantages.
    **The service name *ubuntu* on the second line is used in the devcontainer.json described later**

    ```yaml:compose.yaml
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

    :::column:docker compose file name

    Apparently, "compose.yaml" has become the recommended name. [Compose file reference](https://docs.docker.com/reference/compose-file/#compose-file)

    :::

That's all for selecting and defining the image.
For Java environments, etc., see *features* below.

## Implement devcontainer.json

What we're going to create now is this.

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

Let's explain each section.
For details, refer to the reference [Dev Container metadata reference](https://containers.dev/implementors/json_reference/)

### To create image

Specify the name (*name*) of the container to be created and the *workspaceFolder* when opening the devcontainer. *shutdownAction* is the action when the devcontainer is closed, and the default is *stopCompose*, but I explicitly write it because it concerns me.

```json
{
    "name": "mySample",
    "workspaceFolder": "/workspace",
    "shutdownAction": "stopCompose",
}
```

### From base image

Describe the path of compose.yaml and the service name to use from it. You can also start multiple services with *runServices*. It seems convenient, but I haven't utilized it.

```json
{
    "dockerComposeFile": ["./compose.yaml"],
    "service": "ubuntu",
    "runServices": [],
}
```

:::alert:About specifying images

There are three ways to specify an image. The required parameters differ depending on the pattern, so please check the reference for details. [Scenario specific properties](https://containers.dev/implementors/json_reference/#scenario-specific)

1. Specify the image directly in *devcontainer.json*
1. Specify the service from *compose.yaml* (used this time)
1. Specify the *Dockerfile*

:::

### Resources

This is the most customizable part.

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

- Bind the files and folders you want to utilize within the devcontainer.
    Here, unfamiliar variables have appeared:
    - *\${localWorkspaceFolder}*: Replaced with the root path of the currently open window in VSCode.
    - *\${containerWorkspaceFolder}*: Replaced with the path specified in *workspaceFolder*.

    For more details, refer to the reference [Variables in devcontainer.json](https://containers.dev/implementors/json_reference/#variables-in-devcontainerjson)

    :::stop:Environment variables cannot be used during the construction stage of mount

    The variables that can be used are limited, so it's a bit inconvenient.

    :::

- What you write doesn't differ from the usual Docker bind or volume content.
    Even if you haven't defined a volume in *compose.yaml*, it will create it if you write it in *devcontainer.json*.

    :::info:Writing docker mount

    Those of you who regularly use Docker should write in *long syntax* rather than *short syntax*. [^1]
    [Docker-docs-ja](https://docs.docker.jp/storage/bind-mounts.html#v-mount)

    :::

:::column:.dockerignore

If you place .dockerignore at the level of *devcontainer.json*, you can exclude things like *node_modules* that you want to volume in mount. However, it works slightly differently from *.gitignore*, so keep the description minimal.

:::

#### *features*

This is arguably the most notable feature of devcontainer (as the name suggests).

- **By specifying this feature, it will complete the environment setup and configuration for specific languages.**
    It even comes with additional extensions.
    (Personally, I want to specify the extensions added myself...).
- You can find existing features here. [Features](https://containers.dev/features)
- Some features allow you to specify parameters such as versions.
- **For example, if you want to create an environment for Java+Node.js+AWS (Terraform)**.

    | feature | Comment |
    | --- | --- |
    | *ghcr.io/devcontainers/features/common-utils:2* | Creates a user within the image (UID can also be specified).<br>The default is to create a *vscode* user, but I use it because I don't like it. |
    | *ghcr.io/devcontainers/features/git:1* | Sets up the Git environment (it's generally standard in most images, but I include it just in case). |
    | *ghcr.io/devcontainers/features/java:1* | Sets up the Java environment (version can be specified, of course). |
    | *ghcr.io/devcontainers/features/node:1* | Sets up the Node.js environment (version can be specified, of course). |
    | *ghcr.io/devcontainers/features/aws-cli:1* | AWS-CLI can be installed (don't forget to bind `~/.aws`). |
    | *ghcr.io/devcontainers/features/terraform:1* | Terraform can be installed. |

    :::column
    There is also a *Docker-in-Docker* feature, perfect for modern development.
    Please look for what you want in development.
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

The username when working in the container.

#### *containerEnv*

**It is recommended not to use it much**.
Container-specific environment variables require container reconstruction if changed.

#### *remoteEnv*

- Environment variables that are only reflected when connected.
- Easier to use than *containerEnv*.
- I use it to set things like *AWS_DEFAULT_PROFILE*.
    (Of course, if you use this environment variable, make sure to mount `~/.aws`.)

#### *portsAttributes*

Refer to the reference for attributes. [Port attributes](https://containers.dev/implementors/json_reference/#port-attributes)

:::alert:About port opening

*forwardPorts* also has a similar function, and I still don't know which one is better to use.

:::

### Container command

```json
{
    "overrideCommand": true,
}
```

- You can specify commands to execute when creating or attaching the container.
    - There are six types of commands depending on the timing and lifecycle.
   ,- For example, when constructing a container, you might want to `chown` or `npm install` the *node_modules* volume, but you don't need to execute it when attaching to the container after it's already created.
- You can define commands for these situations (note that there are many precautions). [Lifecycle scripts](https://containers.dev/implementors/json_reference/#lifecycle-scripts)

:::alert:overrideCommand

When defining a devcontainer using *Dockerfile* or *docker compose* (as in this case), you need to set *overrideCommand* to *true* and define it.

:::

:::stop:Points I got stuck on

- If you want to execute a script file, you must write the absolute path when it's bound; the WSL environment path won't work.
- To execute a script file, use `sh $script_file_path`.
  `/bin/bash` or `bash` didn't work for me.

Learned know-how:

- If *.devcontainer* is included in the repository:
  - No need to worry about it.
- If *.devcontainer* is not included in the repository:
  1. Prepare a script folder inside *.devcontainer* and implement the scripts you want to execute there.
  1. Bind the repository to `/workspace/repos`.
  1. Bind `.devcontainer/script` to `/workspace/script`.
     - It might be good to set the script folder path as an environment variable.

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

This is specific to the IDE.
There is also a reference for this. It would be nice if you could use it with your favorite tool. [Supporting tools and services](https://containers.dev/supporting)

For this article, I'll focus on VSCode.

#### *extensions*

- These are extensions that are automatically installed within the devcontainer, and you specify the extension ID.
- Some extensions are automatically installed by features, but there's no problem with duplication.

:::check:VSCode extensions within devcontainer

Many of you might be using a lot of extensions when utilizing VSCode. You might think, "I can't list extensions for each devcontainer" (I thought so).

Here's good news for you.
In the *settings.json* of VSCode, if you define the `dev.containers.defaultExtensions` item as an array and write the extension IDs there, the extensions you always use will be installed from here without needing to write them in *devcontainer.json*.

By setting this, you only need to write the minimum necessary extensions for that project in *devcontainer.json*.

:::

#### *settings*

- You can include them in the repository's *.vscode* or set them here.
- The user's *settings.json* is also used, so rest assured.
- Therefore, I don't write much here.

:::column:Dev Container CLI

Sorry for the long text, but let's take a break here. There's just a little more to go.

By the way, I didn't know that the devcontainer feature also has a CLI. [devcontainer CLI](https://code.visualstudio.com/docs/devcontainers/devcontainer-cli)
It's a nice feature for those who love VSCode's task or launch.json (like me).

:::

## Launch the devcontainer

Congratulations.
Once the configuration files are completed up to this point, you can launch the devcontainer with the following steps.

1. In the VSCode of the WSL environment, open the command palette with `Ctrl+Shift+P`.
1. Enter `Dev Containers: Rebuild and Reopen in Container` and press Enter.
    - It will search for *.devcontainer/\*/devcontainer.json* from the work folder opened in VSCode, and once the syntax check is done, the creation will start (a selection popup will appear if there are multiple).
    - Even if there are errors during creation, you can return to the WSL environment, and the error stack will be displayed, so it's safe.
1. Once the VSCode extensions are installed in the window after launching the devcontainer, it's complete.
1. To return to the WSL environment, open the command palette again and execute `Dev Containers: Reopen Folder in WSL`.
1. **From next time onwards, execute `Dev Containers: Reopen in Container` from the command palette.**
    Reconstruction of the container is unnecessary, so it takes much less time than the first time.
1. If you install the *ms-azuretools.vscode-docker* extension in the VSCode of the WSL environment, you will be happy to see a list of containers and images.

## Push to the Repository!

:::info:From here on

From here, it's a slightly different story from constructing a devcontainer.
**The repository is a prerequisite.**
It doesn't matter whether the *.devcontainer* folder is included in the repository or not.

:::

When developing in a devcontainer environment and updating the repository content, an error occurs when you try to `git push`.

"I haven't bound *.gitconfig*, have I?"
→ That's not the case. The devcontainer automatically duplicates *~/.gitconfig*.

:::stop:Git SSH

Apparently, there's no problem when `git clone` is done via HTTPS, but when using SSH keys, it's necessary to start the local ssh-agent and ssh-add. [Sharing git credentials](https://code.visualstudio.com/remote/advancedcontainers/sharing-git-credentials)
The ssh-agent requires the registration of the private key every time it starts. However, when doing it straightforwardly in the WSL environment, there seems to be a problem where the ssh-agent keeps increasing.

:::

So, let's introduce that setup.

### Install SSH on Windows side

```batch
REM Upgrade SSH version
winget install Microsoft.OpenSSH.Beta
```

### Generate SSH key in WSL environment

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

# Generate key if not present
if [ ! -f $HOME/.ssh/id_${KEY_NAME} ]; then
   ssh-keygen -t ${KEY_NAME}
   echo "clipboard: id_${KEY_NAME}.pub content"
   cat $HOME/.ssh/id_${KEY_NAME}.pub | xsel -bi
fi

# Set up auto agent start
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

Brief explanation:

1. `apt install` the necessary items.
1. If `~/.ssh/id_ed25519` is not present, generate it.
    - The generated public key is sent to the clipboard.
1. Overwrite the ssh-agent startup and ssh-add in *.bash_profile*.
    - Modify to append if it causes issues.
1. Define the linkage with devcontainer using something called keychain and overwrite *.bashrc*.
    - Modify to append if it causes issues.
1. Manually register the clipboard content to the SSH key registration destination of GitHub.
    <https://github.com/settings/keys>
1. Execute `ssh -T git@github.com` within the devcontainer, and if it works, there's no problem.

## Conclusion

Thank you for your hard work. Now everyone can happily build development environments.
Personally, I think the point is **not to use language-specific Docker Images as the base**.
As mentioned in the article, if you end up including multiple languages in the development environment, it's better not to use language-specific ones.

Also, as you may have noticed, three Docker Images appear this time.

1. ubuntu:22.04
1. plain:22.04
1. devcontainer image

If you share *compose.yaml* in the development environment and manage it in one place, there were inconveniences due to referencing the same image, so it's better to duplicate it for each development environment.

Since there is still not much know-how, let's keep creating our own environments.

[^1]: "Compose a school song saying 'Don't write Docker Compose mounts in one line.'"

    ```textfile:Composed by Copilot
    Verse 1: Crossing the sea of containers
        Our code moves forward
        Avoid one-line mounts
        Choose a safe path
    Chorus: The power of Docker Compose
        Resides in our hands
        Building future systems
        With the power of unity

    Verse 2: Staring at configuration files
        To prevent errors
        Stop one-line mounts
        Show a clear path
    Chorus: The power of Docker Compose
        Resides in our hands
        Building future systems
        With the power of unity

    Verse 3: Believing in the power of the team
        Walking this path together
        Discard one-line mounts
        Draw a new future
    Chorus: The power of Docker Compose
        Resides in our hands
        Building future systems
        With the power of unity
    ```
