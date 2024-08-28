---
title: Using Virtual Machines on macOS/Linux with Tart
author: masahiro-kondo
date: 2024-02-12T00:00:00.000Z
tags:
  - tart
image: true
translate: true

---




## Introduction
When I was using an Intel-based MacBook, I regularly used virtualization software such as VirtualBox and VMware Fusion. Initially, when I switched to a MacBook with an M1 chip, these software options were not compatible, and I ended up not using them anymore[^1]. Recently, I discovered Tart, a virtualization tool that makes it easy to set up virtual machines on Apple Silicon Macs, so I'd like to introduce it.

[^1]: VMware Fusion is now compatible, and VirtualBox is also making progress towards compatibility. - [Does Virtualbox work on Apple Silicon Mac?](https://isapplesiliconready.com/jp/app/Virtualbox)

## What is Tart?
[Tart](https://tart.run/) is a virtualization toolset exclusively for Apple Silicon Macs. It is implemented on Apple Silicon's native Virtualization Framework, allowing macOS and Linux to run efficiently.

> Tart is using Apple’s native Virtualization.Framework that was developed along with architecting the first M1 chip. This seamless integration between hardware and software ensures smooth performance without any drawbacks.

You can find the Tart GitHub repository here:

[GitHub - cirruslabs/tart: macOS and Linux VMs on Apple Silicon to use in CI and other automations](https://github.com/cirruslabs/tart/)

Tart's VM images can be managed in an OCI-compatible registry, and the official images are published in GitHub's Package Registry.

[https://github.com/orgs/cirruslabs/packages](https://github.com/orgs/cirruslabs/packages)

Additionally, [Cirrus Runners](https://cirrus-runners.app/), a CI runner using Tart, is also available.

:::info
Tart is free for use on personal machines. Organizations exceeding a certain number of server installations need to obtain a paid license.

[Support & Licensing - Tart](https://tart.run/licensing/)

> Usage on personal computers including personal workstations is royalty-free, but organizations that exceed a certain number of server installations (100 CPU cores for Tart and/or 4 hosts for Orchard) will be required to obtain a paid license.
:::

## Installation
You can get a general idea of how to use it by looking at the Quick Start.

[Quick Start - Tart](https://tart.run/quick-start/)

Install it with Homebrew.

```shell
brew install cirruslabs/cli/tart
```

## Launching a macOS VM
You can fetch, launch, and configure machine images with the tart CLI.

Let's fetch an image of macOS Sonoma with Xcode installed. Specify the registry's image and a local name (in the following example, sonoma-xcode).

```shell
$ tart clone ghcr.io/cirruslabs/macos-sonoma-xcode:latest sonoma-xcode
pulling manifest...
pulling disk (54.0 GB compressed)...
0%
```

The download will start. It's 54GB, so it will take quite some time. It finishes like this:

```
98%
pulling NVRAM...
```

Launch the VM.

```shell
tart run sonoma-xcode
```

![macOS starting](https://i.gyazo.com/e65f55495990490dff1f35e4a0446b51.png)

It starts up quite fast.

![macOS Desktop](https://i.gyazo.com/bda53cefcf24791b1eb6944375bf8d44.png)

Xcode also launched properly. My host machine is running macOS Ventura, but I can use the latest Xcode in a macOS Sonoma VM (though I only use Xcode Command Line Tools).

![run xcode](https://i.gyazo.com/7ce5868b47c8a20bd0d6a38e64f4922e.png)

The default memory is 8GB, which is a bit small, so let's expand it.

![8GB](https://i.gyazo.com/834a164e5b9b1dd0952346f039563f92.png)

First, stop the VM from the Control menu.

![stop](https://i.gyazo.com/9697645b8313da89ab0393be3a4f0f75.png)

Use the Tart CLI to specify the VM and set the memory size in MB.

```shell
tart set sonoma-xcode --memory 16384
```

Relaunch the VM with `tart run`, and the memory has successfully increased.

![16GB](https://i.gyazo.com/505c04ffb1880db5eb15b7e9ce96b22d.png)

## Launching an Ubuntu VM

Fetch an Ubuntu VM image.

```shell
$ tart clone ghcr.io/cirruslabs/ubuntu:latest ubuntu
pulling disk (0.9 GB compressed)...
0%
```

It's just under 1GB, so it finishes quickly.

It's a good idea to expand the default disk size of 20GB before launching.

```shell
tart set ubuntu --disk-size 50
```

Launch it.

```shell
tart run ubuntu
```

It launches, but the GUI is not set up, leading to a console login screen.

![Ubuntu console](https://i.gyazo.com/97cd279577a88d1c14266618af690635.png)

The default user/password is admin/admin.

To use the desktop environment, I installed the module.

```
sudo apt update
sudo apt install ubuntu-desktop
```

After restarting the VM, the GUI login screen appeared.

![login gui](https://i.gyazo.com/93e4ef754b0b7de67ae3a401588e95d7.png)

Logging in, I could successfully use the desktop environment.

![Ubuntu desktop](https://i.gyazo.com/1ba697bcc29f22f4928ac88bfb1e82b6.png)

After spending a few hours setting up the environment and building applications, it was a smooth and comfortable VM environment.

## Creating Custom Images

With the Tart CLI, you can create VM images from macOS IPSW files (firmware format files like those for iOS) or Linux ISO images.

Example of creating a macOS image.

```shell
tart create --from-ipsw=latest sonoma-vanilla
```

:::info
When executing the above command, it seems to download the IPSW file from [ipsw.me](https://ipsw.me/) to create the image.
:::

Example of creating a Linux image.

```shell
tart create --linux ubuntu
tart run --disk focal-desktop-arm64.iso ubuntu
```

Since it's possible to push to an OCI registry, you can push images to ECR or similar and pull them when needed.

[Managing VMs - Tart](https://tart.run/integrations/vm-management/)

There's also a plugin for Packer, allowing you to create and manage Tart images with Packer.

[Building with Packer - Tart](https://tart.run/integrations/vm-management/#building-with-packer)

:::info
On EC2's Marketplace, AMIs of Tart optimized for use on AWS are available.

[AWS Marketplace: Tart Virtualization for macOS](https://aws.amazon.com/marketplace/pp/prodview-qczco34wlkdws)

It's easier than managing macOS images with Packer, and the performance is also good.

[Tart is now available on AWS Marketplace - Tart](https://tart.run/blog/2023/10/06/tart-is-now-available-on-aws-marketplace/)
:::

## CI Runner
For macOS, Cirrus Runners use Tart, and for Linux, they use [vetu](https://github.com/cirruslabs/vetu), a virtualization technology, to provide CI runners. They can be used from GitHub Actions or GitLab CI.

For GitHub Actions, simply set up the [Cirrus Runners](https://github.com/apps/cirrus-runners) app for your organization, and then specify Cirrus Runners in your workflow file.

```yaml
name: Tests
jobs:
  test:
    runs-on: ghcr.io/cirruslabs/macos-sonoma-xcode:latest
```

[GitHub Actions - Tart](https://tart.run/integrations/github-actions/)

For macOS, it seems to be much cheaper than the runners hosted by GitHub.

[Pricing - Cirrus Runners](https://cirrus-runners.app/pricing)

## Conclusion
The experience of using VMs with Tart was satisfactory.

Although I have no plans to use macOS VMs for now, being able to quickly set up a VM for testing or when you don't want to significantly alter the configuration of your host machine is reassuring.

The VMs introduced in the previous article "[OrbStack - A Fast and Lightweight Container & Linux VM Environment Exclusively for macOS](/blogs/2023/06/21/orbstack/)" only supported shell environments[^2]. With Tart, desktop environments are also available, which seems useful for testing Linux desktop applications.

[^2]: Of course, you could use X server or VNC, but OrbStack is mainly for container use, so I don't think it's worth the effort.

For Windows... let's use a physical machine[^3].

[^3]: During the Intel Mac era, I used to run Windows on VMware Fusion for Office, but with Office 365, it's no longer necessary.

For native app development on macOS and iOS, Cirrus Runners seems like a good solution for building CI/CD pipelines.

:::info
GitHub is also enhancing its macOS Actions Runner, so prices may come down eventually.

[Introducing the new, Apple silicon powered M1 macOS larger runner for GitHub Actions](https://github.blog/2023-10-02-introducing-the-new-apple-silicon-powered-m1-macos-larger-runner-for-github-actions/)
:::
