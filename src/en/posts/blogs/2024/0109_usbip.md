---
title: Using USB Devices on Linux via USB/IP Shared from Windows
author: shigeki-shoji
date: 2024-01-09T00:00:00.000Z
tags:
  - USBIP
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/01/09/usbip/).
:::



Hello, I'm [Shoji](https://github.com/edward-mamezou).

The advent of Windows Subsystem for Linux (WSL) has made it very convenient for those who want to run a Linux environment with Windows as the host. Another method is using Hyper-V, a standard feature. I wanted a Linux environment (Ubuntu 22.04.3 LTS) that could start without logging into Windows, so I built one using Hyper-V. I've also installed "amazon-ssm-agent" on this Ubuntu to enable monitoring and updating via [AWS System Manager](https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/what-is-systems-manager.html).

To use USB devices connected to the PC, both WSL and Hyper-V can connect using the method introduced in Microsoft's document "[Connect USB devices](https://learn.microsoft.com/ja-jp/windows/wsl/connect-usb)". Although this article describes the case for using it in a WSL environment, here, I will introduce how to use it in Ubuntu 22.04.3 LTS on Hyper-V.

## Preparation on the Windows Side

Follow the steps written in "[Connect USB devices](https://learn.microsoft.com/ja-jp/windows/wsl/connect-usb)" and install the [USBIPD-WIN project](https://github.com/dorssel/usbipd-win) on Windows.

Let's check the USB devices to share. Run PowerShell as an administrator.

```powershell
usbipd list
```

This will display the BUSID, device name, and status of the connected USB devices.
Next, to share the device, execute the following command.

```powershell
usbipd bind -b BUSID of the device to share
```

If you run `usbipd list` again, you can confirm that the status of the specified device has changed to "Shared".

To stop sharing, execute `usbipd unbind -b BUSID of the device`.

:::info:Example

Here is an example from my environment.

```text
> usbipd list
Connected:
BUSID  VID:PID    DEVICE                                                        STATE
1-17   0411:01f0  USB Mass Storage Device                                       Not shared

> usbipd bind -b 1-17

> usbipd list
Connected:
BUSID  VID:PID    DEVICE                                                        STATE
1-17   0411:01f0  USB Mass Storage Device                                       Shared
```
:::

## On the Ubuntu Side

Attach the device shared from Windows.

```shell
sudo modprobe vhci-hcd
sudo usbip attach -r Windows IP address -b device BUSID
```

:::info:In my case
In my environment, some preparations were necessary to execute usbip. And since it didn't work as described in the aforementioned document, I'll introduce the steps I took.

```shell
sudo apt install linux-tools-6.2.0-39-generic hwdata
sudo update-alternatives --install /usr/local/bin/usbip usbip /usr/lib/linux-tools/6.2.0-39-generic 20
```
:::

To detach the device, either execute `usbipd detach -b device BUSID` on the Windows side or follow the steps below.

### Checking the Port

```shell
usbip port
```

### Detaching

```shell
usbip detach -p port confirmed
```

:::info:Example

Here is an example from my environment.

When attached, /dev/sdb is recognized, and when detached, /dev/sdb disappears, confirming that the USB-HDD is recognized.

```text
$ sudo ls /dev/sd*
/dev/sda  /dev/sda1  /dev/sda2  /dev/sda3

$ sudo usbip attach -r lachesis.local -b 1-17

$ sudo ls /dev/sd*
/dev/sda  /dev/sda1  /dev/sda2  /dev/sda3  /dev/sdb  /dev/sdb1

$ sudo usbip port
Imported USB devices
====================
Port 08: <Port in Use> at Super Speed(5000Mbps)
       BUFFALO INC. (formerly MelCo., Inc.) : unknown product (0411:01f0)
       2-1 -> usbip://lachesis.local:3240/1-17
           -> remote bus/dev 001/017

$ sudo usbip detach -p 8
usbip: info: Port 8 is now detached!

$ sudo ls /dev/sd*
/dev/sda  /dev/sda1  /dev/sda2  /dev/sda3
```

Since I have iTunes installed on Windows, I use Bonjour, or dns-sd, to specify the Windows host (lachesis.local) instead of the IP address.

When attached, it can also be confirmed with the `lsusb` command.

```text
$ sudo lsusb
Bus 002 Device 004: ID 0411:01f0 BUFFALO INC. (formerly MelCo., Inc.) HD-LBU3
Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
```
:::

## About USB/IP

USB/IP was developed by the Nara Institute of Science and Technology ([NAIST](https://www.naist.jp/)), and its achievements were merged into the Linux 2.6.38 kernel. Since then, it has been included in the Linux kernel, so it is considered to be reliable.

## Performance

I connected an external HDD via USB to a Windows PC and mounted it on the same PC's Ubuntu for use. It worked without any issues.

However, when connecting a USB-HDD device on Windows to a Raspberry Pi via Wifi, it became unstable. It seems there might be problems when using unstable or low-quality network connections.

## Conclusion

This article explained how to share USB devices connected to a Windows PC. Not only Windows - Linux but also devices like Raspberry Pi can be used for Linux - Linux, or even the opposite, using USB devices connected to Linux on Windows.

## References

- [USB Device Sharing over IP Network](https://usbip.sourceforge.net/old/index.html)
