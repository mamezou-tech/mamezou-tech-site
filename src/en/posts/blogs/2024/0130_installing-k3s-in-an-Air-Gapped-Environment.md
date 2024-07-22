---
title: Installing k3s on Edge Devices in Air-Gapped Environments
author: shigeki-shoji
date: 2024-01-30T00:00:00.000Z
tags:
  - k3s
  - iot
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/01/30/installing-k3s-in-an-Air-Gapped-Environment/).
:::



Hello, I'm [Shoji](https://github.com/edward-mamezou).

I once had a job installing software on PCs in remote offices. At that time, there was no internet, and I had to visit the offices with stacks of floppy disks, spending hours installing the software based on a manual. The air-gapped environment mentioned in the title of this article refers to such environments. As being constantly connected to the internet has become the norm, environments that are not connected to the network have become special and are now called air-gapped environments.

Even today, there are many air-gapped environments that are completely isolated from the internet for security reasons, among others. Kubernetes can be used in such environments. While Kubernetes is usually operated on multiple servers (nodes), k3s for IoT devices can be operated from a single server. Here, we will introduce the procedure for installing k3s in an air-gapped environment, assuming a Raspberry Pi (arm64).

## Preparing the Files for Installation

You must save the files used for installation on some storage to bring them on-site. We decided to use a USB memory stick for this purpose.

### Download

From the [GitHub repository's releases](https://github.com/k3s-io/k3s/releases), open the Assets for the version you want to install and download `k3s-arm64` and `k3s-airgap-images-arm64.tar.zst` to your USB memory.

The `install.sh` file can be downloaded to your USB memory with the following command (example for Mac):

```text
curl -sfL https://get.k3s.io > install.sh
```

## Installation

If you are using a Raspberry Pi with Raspbian (64-bit version), you need to add `cgroup_memory=1 cgroup_enable=memory` to `/boot/cmdline.txt` and reboot. Make sure to append without a newline. My `/boot/cmdline.txt` looks like this. To boot from an external USB disk, I set `PARTUUID=870ea24b-02` in `root=` to set the partition UUID of the USB disk.

```text
console=serial0,115200 console=tty1 root=PARTUUID=870ea24b-02 rootfstype=ext4 fsck.repair=yes rootwait init=/usr/lib/raspberrypi-sys-mods/firstboot cfg80211.ieee80211_regdom=JP cgroup_memory=1 cgroup_enable=memory
```

:::info
If you want to know the partition UUID of your USB disk, please run `lsblk --output +PARTUUID`.
:::

### Preparing for Installation

We will proceed slightly differently from the [official documentation](https://docs.k3s.io/installation/airgap).

First, let's mount the USB memory. We will proceed with the USB memory as `/dev/sda1`.

```text
sudo mount /dev/sda1 /mnt
```

- Copy `k3s` to `/usr/local/bin`.

```text
sudo cp /mnt/k3s-arm64 /usr/local/bin/k3s
```

- Copy the Airgap images to `/var/lib/rancher/k3s/agent/images/`.

```text
sudo mkdir -p /var/lib/rancher/k3s/agent/images/
sudo cp k3s-airgap-images-arm64.tar.zst /var/lib/rancher/k3s/agent/images/
```

- Install

```text
INSTALL_K3S_SKIP_DOWNLOAD=true ./install.sh
```

If the installation fails, run the `sudo k3s-uninstall` command to uninstall, then review the steps and try installing again.

### Verification

If running `sudo k3s kubectl get nodes` displays the information of the installed server, it was successful.

```text
sudo k3s kubectl get nodes
NAME        STATUS   ROLES                  AGE   VERSION
raspberrypi Ready    control-plane,master   62s   v1.29.1-rc2+k3s1
```

## Conclusion

This article explained using Raspberry Pi. The same procedure can be applied to install on arm64 architecture servers such as Jetson. Furthermore, k3s can also be configured as a cluster of multiple servers for high availability.

## References

- [k3s](https://k3s.io/)
- [Raspberry Pi](https://www.raspberrypi.com/)
- [NVIDIA](https://www.nvidia.com/ja-jp/autonomous-machines/)


