---
title: >-
  Enable Verification of GitHub Actions Workflow Artifacts with Artifact
  Attestations
author: masahiro-kondo
date: 2024-06-03T00:00:00.000Z
tags:
  - GitHub
  - Security
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/06/03/github-artifact-attenstations/).
:::



## Introduction
Using GitHub's Artifact Attestations, you can sign build artifacts in GitHub Actions workflows and verify the provenance of these artifacts.

Artifact Attestations is currently in public beta.

[Introducing Artifact Attestations–now in public beta](https://github.blog/2024-05-02-introducing-artifact-attestations-now-in-public-beta/)

Artifact Attestations is made possible by Sigstore, an OSS for signing and verifying software artifacts. For this functionality, GitHub acts as a root Certificate Authority (CA).

:::info
For configuring GitHub Actions workflows that use Sigstore to sign artifacts like container images or Go Modules, see the following article:

[GitHub Actions Workflows for Software Supply Chain Security](/blogs/2022/08/17/github-actions-workflows-for-software-supply-chain-security/)
:::

## Generate Signed Build Provenance in a Workflow

To generate build provenance in a workflow, use the `attest-build-provenance` action.

[GitHub - actions/attest-build-provenance: Action for generating build provenance attestations for workflow artifacts](https://github.com/actions/attest-build-provenance)

First, I tried it with a simple workflow.

```yaml:./github/workflows/artifact-attestations-trial.yml
name: Artifact Attestations Trial
on: [workflow_dispatch]

jobs:
  Build:
    permissions:
      id-token: write
      contents: read
      attestations: write  # 1

    runs-on: ubuntu-latest

    steps:
    - name: Build artifact #2
      run: |
        mkdir -p _artifacts
        echo "Hello! now is $(date)" >> _artifacts/hello.txt
        tar -czf hello.tar.gz _artifacts
    - name: Generate artifact attestation #3
      uses: actions/attest-build-provenance@v1
      with:
        subject-path: 'hello.tar.gz'
    - name: Upload artifact #4
      uses: actions/upload-artifact@v4
      with:
        name: hello
        path: hello.tar.gz
```
The steps are configured as follows:

1. Enable write permissions for attestations (`id-token: write`, `contents: read` are also required)
2. Create a text file and archive it using the tar command
3. Generate the build provenance for the archive file using `attest-build-provenance`
4. Upload the archive file using the `upload-artifact` action

When you run this workflow, the artifact is uploaded to the workflow summary screen, and the created attestation is displayed.

![Attestation created](https://i.gyazo.com/3a89f9cf86c315ded1b8ca19e55641eb.png)

:::info
Attestations can only be saved in public repositories. To save them in private repositories, an Enterprise plan is required.
:::

## Verification with GitHub CLI
You can perform verification using the GitHub CLI. Support for GitHub Artifact Attestations is included in GitHub CLI v2.49.0. Update if you have an older version.

[Release GitHub CLI 2.49.0 · cli/cli](https://github.com/cli/cli/releases/tag/v2.49.0)

For the downloaded archive file, specify the GitHub account (or organization) for verification using `gh attestation verify`.

```shell
gh attestation verify hello.tar.gz -o kondoumh    
Loaded digest sha256:4e91db5c9c0333bdfd8e2c0a047b886509f52043ce0046e91e51e30d758bdb20 for file://hello.tar.gz
Loaded 1 attestation from GitHub API
✓ Verification succeeded!

sha256:4e91db5c9c0333bdfd8e2c0a047b886509f52043ce0046e91e51e30d758bdb20 was attested by:
REPO              PREDICATE_TYPE                  WORKFLOW                                                           
kondoumh/iac-dev  https://slsa.dev/provenance/v1  .github/workflows/artifact-attestations-trial.yml@refs/heads/master
```

Verification is performed by obtaining the attestation from the specified account using the digest obtained from the downloaded archive file. The repository name, SLSA predicateType[^1] indicating software provenance, and the workflow file where the artifact was built are output, and the verification succeeded.

[^1]: [https://slsa.dev/spec/v1.0/provenance](https://slsa.dev/spec/v1.0/provenance)

Specifying an organization different from the actual repository results in an error[^2].

[^2]: The HTTP status is 404, indicating that no attestation matching the digest exists.

```shell
gh attestation verify hello.tar.gz -o mamezou-tech
Loaded digest sha256:4e91db5c9c0333bdfd8e2c0a047b886509f52043ce0046e91e51e30d758bdb20 for file://hello.tar.gz
✗ Loading attestations from GitHub API failed

Error: failed to fetch attestations from mamezou-tech: HTTP 404: Not Found (https://api.github.com/orgs/mamezou-tech/attestations/sha256:4e91db5c9c0333bdfd8e2c0a047b886509f52043ce0046e91e51e30d758bdb20?per_page=30)
```

By verifying the attestation, you can confirm that the artifact was built by a specific organization.

## Using in Actual Projects

I applied this to the `sbgraph` repository published by mamezou-tech.

[GitHub - mamezou-tech/sbgraph: Fetch Scrapbox project data and visualize activities.](https://github.com/mamezou-tech/sbgraph)

In the workflow of this repository, binaries for each platform are compiled in Go and the archive files are published on the release page. The creation of archive files and publication on the release page are executed only when a tag is created.

Below is an excerpt from the [workflow file](https://github.com/mamezou-tech/sbgraph/blob/master/.github/workflows/go.yml).

```yaml
jobs:

  build:
    permissions: #1 Set permissions
      id-token: write
      contents: write
      attestations: write

    - name: Build #2 Build for each platform
      run: |
        GOOS=linux GOARCH=amd64 go build -o build/linux-amd64/sbgraph main.go
        GOOS=linux GOARCH=arm64 go build -o build/linux-arm64/sbgraph main.go
        GOOS=windows GOARCH=amd64 go build -o build/windows/sbgraph.exe main.go
        GOOS=darwin GOARCH=amd64 go build -o build/macos-amd64/sbgraph main.go
        GOOS=darwin GOARCH=arm64 go build -o build/macos-arm64/sbgraph main.go

    - name: Archive #3 Create archive files
      if: startsWith(github.ref, 'refs/tags/')
      run: |
        (cd build/linux-amd64 && tar cfvz ../sbgraph-linux-amd64.tar.gz sbgraph)
        (cd build/linux-arm64 && tar cfvz ../sbgraph-linux-arm64.tar.gz sbgraph)
        (cd build/windows && tar cfvz ../sbgraph-windows-amd64.tar.gz sbgraph.exe)
        (cd build/macos-amd64 && tar cfvz ../sbgraph-darwin-amd64.tar.gz sbgraph)
        (cd build/macos-arm64 && tar cfvz ../sbgraph-darwin-arm64.tar.gz sbgraph)

    - name: Generate artifact attestations #4 Generate build provenance
      if: startsWith(github.ref, 'refs/tags/')
      uses: actions/attest-build-provenance@v1
      with:
        subject-path: 'build/*.tar.gz'

    - name: Publish #5 Publish to release page
      if: startsWith(github.ref, 'refs/tags/')
      uses: softprops/action-gh-release@v2
      with:
        files: build/*.tar.gz
```
I added the permission settings in `#1` and the build provenance generation step in `#4` to the existing workflow.

- Added `contents: write` permission: Set to write for artifact release
- Generate build provenance: Specify multiple archive files for each platform using a wildcard

When a tag is created and the build is executed, attestations are generated for each archive file.

![Build summary](https://i.gyazo.com/dacd7eaf083a217d25ebe2de84d03895.png)

I downloaded the archive for macOS and verified it using GitHub CLI, specifying the organization as `mamezou-tech`.

```shell
$ gh attestation verify sbgraph-darwin-arm64.tar.gz -o mamezou-tech
Loaded digest sha256:01c2b8b780ff941034b498b2eb82c571a80147f4ffdd16cedc062f7fbb3e563c for file://sbgraph-darwin-arm64.tar.gz
Loaded 1 attestation from GitHub API
✓ Verification succeeded!

sha256:01c2b8b780ff941034b498b2eb82c571a80147f4ffdd16cedc062f7fbb3e563c was attested by:
REPO                  PREDICATE_TYPE                  WORKFLOW                                      
mamezou-tech/sbgraph  https://slsa.dev/provenance/v1  .github/workflows/go.yml@refs/tags/v0.11.0-rc0
```

The verification succeeded without any issues.

## Conclusion
Artifact Attestations, which allows signing artifacts by adding just a few steps to the workflow, is likely to become an essential technology for software supply chain security.

If an SBOM for the artifacts exists in the repository, the GitHub blog introduced at the beginning describes how to associate build artifacts with a signed SBOM using the `attest-sbom` action.
