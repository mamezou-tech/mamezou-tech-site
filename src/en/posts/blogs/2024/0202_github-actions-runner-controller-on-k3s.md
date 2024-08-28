---
title: Installing GitHub Actions Runner Controller (ARC) on k3s
author: shigeki-shoji
date: 2024-02-02T00:00:00.000Z
tags: [k3s, iot, scala]
image: true
translate: true
---




Hello, I'm [Shoji](https://github.com/edward-mamezou).

[k3s](https://docs.k3s.io/installation/requirements) currently supports x86_64, armhf, arm64/aarch64, and s390x architectures. Additionally, the runner image of [GitHub Actions Runner Controller](https://github.com/actions/runner/pkgs/container/actions-runner) (ARC) supports linux/amd64 (i.e., x86_64) and linux/arm64 (i.e., arm64/aarch64).

Therefore, ARC can be executed in a k3s environment that is either x86_64 or arm64/aarch64.

For more information about GitHub Actions Runner Controller, please refer to the article "[GitHub Actions Runner Controller (ARC) - On-demand execution of self-hosted runners in Kubernetes](/blogs/2023/05/14/github-actions-runner-controller/)".

:::info
You might wonder why ARC instead of a Self-Hosted Runner. There is definitely a need in the IoT world to containerize. In the IoT world, not only computing resources but also various external devices are often handled, such as cameras and GPUs. It is necessary to verify whether applications using these external devices can operate in a Kubernetes environment. Therefore, we focused on using the actual k3s environment rather than a simple Self-Hosted Runner.
:::

## Deploying ARC

Deploying ARC uses helm. This is almost no different from the procedure described in the introduced article.

The only difference is to set the environment variable `KUBECONFIG` before executing the helm command.

```text
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

Install ARC.

```shell
helm install arc \
  --namespace arc-systems \
  --create-namespace \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller
```

Next, install `actions-runner`. As mentioned in the article by Mr. Kondo, a GitHub Personal Access Token (PAT) is required for installation.

```shell
GITHUB_CONFIG_URL="https://github.com/<your_account/repo>"
GITHUB_PAT="<PAT>"
helm install arc-runner-set \
    --namespace arc-runners \
    --create-namespace \
    --set githubConfigUrl="${GITHUB_CONFIG_URL}" \
    --set githubConfigSecret.github_token="${GITHUB_PAT}" \
    oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set
```

## Using a custom `actions-runner` image

The `actions-runner` image provided by GitHub contains only basic binaries. It is generally assumed to work with the definition of a normal GitHub Actions workflow. However, I encountered an error when trying to execute a workflow that includes the execution of the `sbt` command. Upon investigation, I noticed a significant difference in the number of files in the `/usr/bin` directory between the Ubuntu managed by GitHub and the `actions-runner` image. Therefore, I decided to create a custom `actions-runner` image following the Ubuntu image managed by GitHub.

The Dockerfile is as follows.

```dokerfile
FROM ghcr.io/actions/actions-runner:2.312.0

USER root

RUN apt update && apt install -y curl && \
    curl -fLo /tmp/sbt.tgz https://github.com/sbt/sbt/releases/download/v1.9.8/sbt-1.9.8.tgz && \
    tar zxf /tmp/sbt.tgz -C /usr/share && ln -s /usr/share/sbt/bin/sbt /usr/bin/sbt && rm -f /tmp/sbt.tgz

WORKDIR /home/runner
USER runner
```

This Dockerfile was built using GitHub Actions and pushed to [GitHub Packages](https://github.com/orgs/takesection-sandbox/packages?repo_name=self-hosted-action).

You can install the `actions-runner` using a custom container image with the following command.

```shell
export GITHUB_CONFIG_URL="https://github.com/<your_account/repo>"
export GITHUB_PAT="<PAT>"
helm install self-hosted \
    --namespace arc-runners \
    --create-namespace \
    --set githubConfigUrl="${GITHUB_CONFIG_URL}" \
    --set githubConfigSecret.github_token="${GITHUB_PAT}" \
    --set template.spec.containers[0].name="runner" \
    --set template.spec.containers[0].image="ghcr.io/takesection-sandbox/actions-runner:latest" \
    --set template.spec.containers[0].command[0]="/home/runner/run.sh" \
    oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set
```

## Conclusion

In IoT development, there are cases where special peripherals are used. In such cases, you may want to perform continuous integration (CI) in an environment closer to production rather than the standard cloud environment provided by GitHub Actions. Kubernetes has [Device Plugins](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/) for handling external devices. USB devices can also be handled. In such an environment, ARC using a custom `actions-runner` is considered useful.

## Reference articles

- [GitHub Actions Runner Controller (ARC) - On-demand execution of self-hosted runners in Kubernetes](/blogs/2023/05/14/github-actions-runner-controller/)
