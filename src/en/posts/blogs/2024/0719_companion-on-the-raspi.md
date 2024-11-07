---
title: How to Install Companion on Raspberry Pi
author: shigeki-shoji
date: 2024-07-19T00:00:00.000Z
tags:
  - リモートワーク環境
image: false
translate: true
---


Hello, this is [Shoji](https://github.com/edward-mamezou).

To improve my remote work environment, I purchased Elgato's [Stream Deck](https://www.elgato.com/jp/ja/p/stream-deck-mk2-black). After researching how to control Blackmagic Design's [ATEM Mini](https://www.blackmagicdesign.com/jp/products/atemmini) with this Stream Deck, I found that using Bitfocus's [Companion](https://bitfocus.io/companion) seems to be a good option.

Further investigation revealed that [Companion Pi](https://bitfocus.io/companion-pi) is available, and I thought it might be possible to use the Stream Deck with a [Raspberry Pi](https://www.raspberrypi.com/).

This article explains the steps I took to install it on my Raspberry Pi 4 (8GB).

## Installation Steps

When operating the ATEM Mini with Companion, a wired LAN is used. Additionally, Node.js is required to run Companion Pi. There are versions of the Node.js package manager npm that fail to download using IPv6, so before installation, we will disable IPv6 using the nmcli command.

Use the following command to check the NAME.

```text
sudo nmcli c
```

In my environment, I received a response like the following. The UUID column has been masked.

```text
NAME                UUID                                  TYPE      DEVICE 
preconfigured       xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  wifi      wlan0  
lo                  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  loopback  lo     
Wired connection 1  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  ethernet  eth0 
```

Use the NAME of the device that is connected to the internet to disable IPv6 with the following command, and then reboot. Here is an example of disabling preconfigured.

```text
sudo nmcli c mod "preconfigured" ipv6.method "disabled"
sudo reboot
```

Install the latest LTS version of Node.js and yarn with the following commands.

```text
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install npm nodejs -y
sudo npm i n -g
sudo n lts
sudo npm i yarn -g
```

After this, follow the installation steps written in the Companion Pi's [Manual Install](https://user.bitfocus.io/docs/companion-pi).

First, enable running commands as the root user.

```text
sudo -s
```

Execute the following command from the official documentation.

```text
curl https://raw.githubusercontent.com/bitfocus/companion-pi/main/install.sh | bash
```

If the installation is successful, you will see the following message.

```text
Companion is installed!
You can start it with "sudo systemctl start companion" or "sudo companion-update"
```

As indicated in the response message, you can start it with `systemctl start companion`. Connect the Stream Deck to the USB port of the Raspberry Pi and access `http://raspberrypi.local:8000` (replace raspberrypi with your hostname if it is different) from your browser to open the Companion access screen. Once configured, you will be able to control the ATEM Mini with the Stream Deck.

![companion](/img/blogs/2024/0719_companion.jpg)

## Conclusion

With the increase in gadgets that use USB, I was struggling with how to connect the Stream Deck, so I really like using Companion to control the ATEM Mini and others over LAN with the Raspberry Pi. I have just started using it, and I look forward to exploring ways to make it even more convenient.
