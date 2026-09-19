---
title: >-
  Automatically Launch vLLM with AWS×UserData! Local LLM Environment with Almost
  Zero Cost When Stopped
author: kazuyuki-shiratani
date: 2026-09-16T00:00:00.000Z
tags:
  - AWS
  - EC2
  - LLM
  - vLLM
  - s3
  - ECR
image: true
translate: true

---

## Introduction

As open-source LLMs evolve rapidly, I thought, “I want a dedicated local LLM environment where I can handle confidential information and internal code without worry.”

However, when you actually try to run it seriously on-premises, you need a GPU-equipped PC with large-capacity VRAM, which requires an initial cost of hundreds of thousands of yen. At the verification stage, when you just want to try out its effectiveness, getting approval for such an expensive hardware purchase is a high hurdle. That’s exactly why I wanted to leverage the cloud’s greatest advantage of a “small start”—zero initial investment, only pay for the time you use it (tens to hundreds of yen), get started immediately, and exit anytime when it’s no longer needed.

While thinking about “how can I easily run an LLM in the cloud…,” I also considered manually launching a GPU instance from the Management Console and setting it up each time. However, as an infrastructure engineer seeking a practical development environment, I had one key desire:

**“I want an environment where I can freely and rapidly test the various open-source models that will continue to appear!”**

With new models being released one after another, manually repeating setup every time you swap or test a model is a hassle, and you’d also want to avoid incurring the maintenance fee for large-capacity storage (EBS) of over ¥1,500/month during unused periods. Moreover, even if you think, “I’ll remember to stop and delete it when I’m done,” there’s always the risk of accidentally forgetting, leading to unexpected charges.

So this time, as a foundation for comfortably testing various models, I built an ephemeral inference infrastructure that combines **“fully automated startup (UserData)”** and **“near-zero fixed cost during idle time (S3 model storage & instant EBS disposal).”**

### Goals of the Architecture We Built

1. **Fully unattended setup** with Linux (Ubuntu 22.04 Deep Learning AMI) × UserData  
2. **Model data on S3**, container images on ECR, and **fast sync/Pull within the same region (free data transfer)**  
3. **Automatically launch the high-throughput inference engine “vLLM” in a Docker container**  
4. **Terminate instances and discard EBS immediately after testing** for near-zero idle cost operation  

With this configuration, swapping models is as simple as changing the S3 path, and at any time you can run a single command to safely and cheaply test the latest open-source LLMs. From the perspective of an engineer with full cloud certifications, I’ll share a detailed build procedure that pursues cost optimization and automation!

---

## Overall Architecture and Ephemeral Design

The overall structure is as follows:

```mermaid
flowchart TD
    subgraph ClientEnv ["Client Environment / Dev PC"]
        Client["Developer Terminal<br>(curl / API calls)"]
        LaunchScript["Launch Script<br>(03_ec2_launch.sh)"]
    end

    subgraph AWS ["AWS Tokyo Region (ap-northeast-1)"]
        subgraph EC2Env ["EC2: g6.xlarge (Ephemeral)"]
            UserData["UserData Script<br>(Fully Automated on Startup)"]
            vLLM["Docker: vLLM OpenAI Server<br>(Port 8000)"]
            UserData -->|Sync on Startup| LocalStorage[("/data/models<br>(Free NVMe SSD 250GB: Ultra-fast I/O)")]
            LocalStorage --> vLLM
        end

        S3[("Amazon S3<br>s3://my-llm-models-tokyo<br>(Model Persistent Storage)")]
        ECR[("Amazon ECR<br>vllm-openai:latest<br>(Container Storage)")]
        S3 -->|High-Speed Sync Within Same Region<br>[Data Transfer Fees: Free]| LocalStorage
        ECR -->|High-Speed Pull Within Same Region<br>[Data Transfer Fees: Free]| vLLM
    end

    LaunchScript -->|1. Launch EC2 & Retrieve IP| EC2Env
    Client -->|"2. OpenAI-Compatible API Call<br>(/v1/chat/completions)"| vLLM
```

### Key Points of This Configuration

* **Fully ephemeral (disposable) EC2 operation**:  
  Large model weights (around 15 GB) are persisted in Amazon S3 and the vLLM container image in Amazon ECR. On EC2 startup, we quickly pull them locally via UserData, and when testing is done we simply **terminate** the EC2 instance. The root volume is automatically deleted, completely eliminating expensive EBS idle charges.  
* **Full utilization of the free local NVMe SSD (instance store 250 GB)**:  
  The `g6.xlarge` includes a **250 GB local NVMe SSD (instance store) at no additional cost**. Instance stores are often avoided because data is lost on stop or termination, but in this design we persist weights in S3 and the container in ECR, then dispose of the EC2 node—so volatility is no disadvantage. Leveraging the PCIe-connected ultra-fast I/O (1,000–2,000 MB/s+), we cut GPU model load times down to seconds, and slim the root EBS from 100 GB to **40 GB** (minimum possible size due to DLAMI snapshot constraints).  
* **Near-zero maintenance cost during idle (approx. ¥145/month) & free download transfer**:  
  - **S3 Standard storage**: 15 GB × \$0.025/GB = \$0.38/month (≈¥62/month)  
  - **ECR storage**: Compressed container image ~5 GB × \$0.10/GB = \$0.50/month (≈¥83/month)  
  - **Total storage cost**: \$0.88/month (≈¥145/month)  
  - **Data transfer (S3/ECR → EC2)**: Free within the same region (Tokyo)  
  - **Comparison to EBS**: A 100 GB gp3 EBS volume costs \$9.60/month (≈¥1,584/month) when kept stopped. Offloading to S3/ECR saves about 91%, reducing idle costs to around ¥145/month.  
* **Why Amazon ECR, not Docker Hub**:  
  The official vLLM image is available on Docker Hub (`vllm/vllm-openai:latest`), but downloading over the public internet risks congestion and anonymous rate limits. Hosting it in ECR within the same region lets you use AWS’s high-speed backbone for reliable, ultra-fast pulls.  
* **Adopting vLLM**:  
  We launch the high-throughput, memory-efficient inference engine “vLLM” via Docker, which by default exposes an OpenAI-compatible API on port 8000—allowing you to plug in existing AI tools and scripts without modification.

---

## Prerequisites

Before proceeding, ensure the following tools are set up on your local machine:

1. **AWS CLI**: Used to create S3 buckets and launch EC2 instances. Configure with `aws configure` using an IAM user/role with appropriate S3 and EC2 permissions.  
2. **Hugging Face CLI (`huggingface-cli`)**: Used to download models. Install in your Python environment:  
   ```bash
   pip install -U "huggingface_hub[cli]"
   ```
   If you need to agree to model licenses (for gated models like Llama or Gemma) or avoid rate limits, run `huggingface-cli login` in advance.  
3. **jq**: For JSON parsing in scripts. Install via `sudo apt install jq` or `brew install jq`.  
4. **[Most important] AWS Service Quotas (GPU Instance Quota Increase)**:  
   On new AWS accounts, the vCPU quota for on-demand G/P instances defaults to **0**, causing `VcpuLimitExceeded` errors.  
   - **Quota name**: `Running On-Demand G and VT instances`  
   - **Where to request**: AWS Management Console → Service Quotas → Amazon Elastic Compute Cloud (EC2)  
   - **Required vCPUs**: `g6.xlarge` uses **4 vCPUs** per instance.  
   - **Request per region**: Quotas are region-specific. Request an increase in Tokyo (`ap-northeast-1`) if you plan to launch there.  
   - **Typical approval**: Even if you request 8 or 16, AWS often grants only 4 vCPUs initially—enough to run one instance.  
   - **Approval time**: AWS says it can take days, but in my tests the quota increase completed in about 3–4 hours. Submit the request as soon as you decide to test!

---

## Environment Setup Steps

Let’s build the environment. All necessary steps are script-automated.

### Common Configuration Parameters (Environment Variables)

The scripts (`01_sync_assets.sh`, `02_ec2_userdata.sh`, `03_ec2_launch.sh`, `04_ec2_terminate.sh`) are designed to be flexible via environment variables. Export desired values in your shell or edit the default values at the top of each script as needed.

| Variable                 | Default                                    | Required/Optional | Description / Example                     |
| :----------------------- | :----------------------------------------- | :---------------: | :---------------------------------------- |
| `AWS_REGION`             | `ap-northeast-1`                           | Optional          | AWS region to deploy (e.g., Tokyo: `ap-northeast-1`, Oregon: `us-west-2`) |
| `S3_BUCKET_NAME`         | `my-llm-models-tokyo`                      | **Must change**   | S3 bucket name for model weights (must be globally unique) |
| `HF_MODEL_ID`            | `Qwen/Qwen2.5-Coder-7B-Instruct`           | Optional          | Hugging Face model ID to test             |
| `SERVED_MODEL_NAME`      | `Qwen/Qwen2.5-Coder-7B-Instruct`           | Optional          | Model name exposed via the OpenAI-compatible API |
| `DOCKER_IMAGE`           | `vllm/vllm-openai:latest`                  | Optional          | vLLM image to use (ECR URI or Docker Hub name) |
| `INSTANCE_TYPE`          | `g6.xlarge`                                | Optional          | GPU instance type (`g6.xlarge`: NVIDIA L4 24 GB VRAM + 250 GB NVMe) |
| `EBS_SIZE_GB`            | `40`                                       | Optional          | Root EBS size (GB). Models and Docker go on NVMe, so 40 GB is sufficient |
| `IAM_ROLE_NAME`          | `EC2-S3-ECR-ReadOnly-Profile`              | Optional          | IAM profile name to attach to EC2 (auto-created if absent) |
| `SECURITY_GROUP_IDS`     | *(auto-create if empty)*                   | Optional          | Security group ID(s) (auto-create SG opening ports 8000/22 if empty) |
| `KEY_NAME`               | *(none)*                                   | Optional          | SSH key pair name (if you need SSH or debugging) |
| `MAX_MODEL_LEN`          | `4096`                                     | Optional          | vLLM max context token length (adjust to `8192` for long texts) |
| `GPU_MEMORY_UTILIZATION` | `0.85`                                     | Optional          | Proportion of GPU memory (VRAM) to preallocate (0.85–0.90 recommended) |

:::check
**💡 Quick start example**  
Set only the S3 bucket name to a unique value; the other parameters can remain at their defaults:
```bash
export AWS_REGION="ap-northeast-1"
# Example: append your account ID for a unique bucket name
export S3_BUCKET_NAME="my-llm-models-$(aws sts get-caller-identity --query Account --output text)-tokyo"
```
:::

### Step 1: Upload Model to S3 & Register Container Image in ECR

First, create the S3 bucket and ECR repository in the Tokyo region, then upload the model weights and container image. In this example, we use the popular coding-focused open-source model [Qwen/Qwen2.5-Coder-7B-Instruct](https://huggingface.co/Qwen). Feel free to choose any model from the [Hugging Face Models list](https://huggingface.co/models).

:::check
**💡 How to choose a model that fits 24 GB VRAM**  

1. **Parameter size vs. 24 GB VRAM**  
   - **7B–9B (bfloat16/fp16)**: Highly recommended sweet spot (weights ~14–18 GB, leaving 4–8 GB for KV cache, easily handling 4K–8K tokens), e.g.,  
     `Qwen/Qwen2.5-Coder-7B-Instruct`, `meta-llama/Llama-3.1-8B-Instruct`, `google/gemma-2-9b-it`, `google/gemma-4-E4B-it`.  
   - **14B**: Native bfloat16 (~28 GB) exceeds VRAM, but quantized (AWQ/GPTQ/FP8) versions (~8–10 GB) run comfortably. Example: `Qwen/Qwen2.5-14B-Instruct-AWQ`.  
   - **32B**: AWQ 4-bit (~17 GB) can run, but leaves little KV cache space, limiting long-context usage.

2. **Architecture (GQA models recommended)**  
   Models using Grouped Query Attention (Qwen 2.5, Llama 3.1, Gemma 2, etc.) have minimal KV cache overhead, ideal for long-context and high-throughput. Older MHA models (e.g., first-gen Gemma 7B) consume more KV cache.

3. **Model type (choose “Instruct/Chat”)**  
   For chat APIs or agents like Claude Code, pick models with `-Instruct`, `-it`, or `-Chat` tuning for instruction following. Base models (no suffix) only complete text, not dialogue.

4. **Gated models on Hugging Face**  
   Models requiring license acknowledgement (Llama, Gemma) need you to pre-acknowledge on Hugging Face and provide `HF_TOKEN` on first S3 sync. After the model is in S3, EC2-side token management is unnecessary.
:::

Run `01_sync_assets.sh`:

```bash
#!/bin/bash
set -euo pipefail

AWS_REGION="ap-northeast-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
S3_BUCKET_NAME="my-llm-models-tokyo"
MODEL_ID="Qwen/Qwen2.5-Coder-7B-Instruct"
LOCAL_MODEL_DIR="/tmp/models/${MODEL_ID}"
ECR_REPO_NAME="vllm-openai"
ECR_IMAGE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:latest"

# 1. Create the S3 bucket in the Tokyo region
if ! aws s3api head-bucket --bucket "${S3_BUCKET_NAME}" 2>/dev/null; then
    aws s3api create-bucket \
        --bucket "${S3_BUCKET_NAME}" \
        --region "${AWS_REGION}" \
        --create-bucket-configuration LocationConstraint="${AWS_REGION}"
fi

# 2. Download the model from Hugging Face and sync to S3
mkdir -p "${LOCAL_MODEL_DIR}"
huggingface-cli download "${MODEL_ID}" --local-dir "${LOCAL_MODEL_DIR}" --local-dir-use-symlinks False

aws s3 sync "${LOCAL_MODEL_DIR}" "s3://${S3_BUCKET_NAME}/models/${MODEL_ID}" \
    --region "${AWS_REGION}" \
    --no-progress

# 3. Create the Amazon ECR repository and push the container image
if ! aws ecr describe-repositories --repository-names "${ECR_REPO_NAME}" --region "${AWS_REGION}" 2>/dev/null; then
    aws ecr create-repository \
        --repository-name "${ECR_REPO_NAME}" \
        --region "${AWS_REGION}" \
        --image-scanning-configuration scanOnPush=true
fi

# Docker login to ECR
aws ecr get-login-password --region "${AWS_REGION}" | \
    docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Pull the official vLLM image and push to our ECR
docker pull vllm/vllm-openai:latest
docker tag vllm/vllm-openai:latest "${ECR_IMAGE}"
docker push "${ECR_IMAGE}"
```

You only need to perform this preparation once. Once model weights and the container image are ready in AWS, you can rebuild EC2 instances any number of times and pull them instantly from S3 and ECR within the same region.

---

### Step 2: UserData Auto-Setup Script

This shell script (`02_ec2_userdata.sh`) runs automatically on EC2 startup.

#### Instance Launch Specifications
* **AMI**: Deep Learning OSS Nvidia Driver AMI GPU PyTorch 2.x (Ubuntu 22.04)  
  AWS’s official Deep Learning AMI comes preinstalled with NVIDIA drivers, Docker, and the NVIDIA Container Toolkit.
* **Instance type**: `g6.xlarge` (NVIDIA L4 GPU / 24 GB VRAM)  
  While `g4dn.xlarge` (T4 / 16 GB) is also a great choice, we opt for the newer `g6.xlarge` with 24 GB for better long-context performance.
* **IAM role**: Instance profile with S3 read permissions (`s3:GetObject`, `s3:ListBucket`) and Amazon ECR read permissions (`AmazonEC2ContainerRegistryReadOnly`).
* **Storage (EBS & NVMe SSD)**:  
  - **Root volume (EBS)**: 40 GB (gp3), Delete on Termination = true. The DLAMI snapshot is 40 GB, the minimum allowed. We only install OS and basic tools here.  
  - **Model & Docker storage (local NVMe SSD)**: Leverage the free (zero-cost) 250 GB local NVMe SSD included with `g6.xlarge`. Bind-mount both the model directory and Docker/containerd data (`/var/lib/docker`, `/var/lib/containerd`) onto NVMe, avoiding 40 GB EBS exhaustion and accelerating image pulls and layer extraction.

* **Shutdown behavior**: `--instance-initiated-shutdown-behavior terminate` so that when the OS shuts down, the instance terminates (not stops) and the EBS is fully discarded.

#### UserData Script (`02_ec2_userdata.sh`)
```bash
#!/bin/bash
set -euo pipefail

# ==============================================================================
# 02_ec2_userdata.sh
# UserData script executed on EC2 startup
#
# Prerequisites:
#   - AMI: Ubuntu 22.04 Deep Learning AMI (NVIDIA Driver & Docker pre-installed)
#   - Instance type: g6.xlarge (NVIDIA L4 GPU: 24GB VRAM, 250GB NVMe SSD)
#   - IAM role: S3 (ReadOnly/FullAccess) and ECR (ReadOnly) permissions attached
# ==============================================================================

LOG_FILE="/var/log/userdata-vllm.log"
exec > >(tee -a "${LOG_FILE}") 2>&1
echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] UserData execution started ==="

# Configuration parameters
AWS_REGION="${AWS_REGION:-ap-northeast-1}"
S3_BUCKET_NAME="${S3_BUCKET_NAME:-my-llm-models-tokyo}"
HF_MODEL_ID="${HF_MODEL_ID:-Qwen/Qwen2.5-Coder-7B-Instruct}"
SERVED_MODEL_NAME="${SERVED_MODEL_NAME:-Qwen/Qwen2.5-Coder-7B-Instruct}"
VLLM_PORT="8000"
GPU_MEMORY_UTILIZATION="0.85"
MAX_MODEL_LEN="4096"
DOCKER_IMAGE="${DOCKER_IMAGE:-vllm/vllm-openai:latest}"

echo "Model to fetch (HF)   : ${HF_MODEL_ID}"
echo "Served model name     : ${SERVED_MODEL_NAME}"
echo "S3 bucket             : s3://${S3_BUCKET_NAME}"

# 1. Detect and utilize the local NVMe instance store (250GB)
# Note: DLAMI auto-mounts local NVMe at /opt/dlami/nvme on startup
NVME_DIR="/opt/dlami/nvme"
if mountpoint -q "${NVME_DIR}" || [ -d "${NVME_DIR}" ]; then
    echo "Detected DLAMI default NVMe mount (${NVME_DIR}). Using it for model & Docker storage..."
    mkdir -p "${NVME_DIR}/models" "${NVME_DIR}/docker"
    mkdir -p /data
    ln -sfn "${NVME_DIR}/models" /data/models
else
    # Fallback for non-DLAMI AMIs or if not auto-mounted
    NVME_DEV=$(lsblk -d -n -o NAME,SIZE | grep -E '250G|232G' | head -n1 | awk '{print $1}')
    if [ -n "${NVME_DEV}" ]; then
        echo "Detected local NVMe SSD (/dev/${NVME_DEV}). Mounting to /data..."
        mkfs.ext4 -F "/dev/${NVME_DEV}" || true
        mkdir -p /data
        mount -o noatime "/dev/${NVME_DEV}" /data || true
    else
        mkdir -p /data
    fi
    mkdir -p /data/models /data/docker
    NVME_DIR="/data"
fi

LOCAL_MODEL_ROOT="/data/models"
LOCAL_MODEL_DIR="${LOCAL_MODEL_ROOT}/${HF_MODEL_ID}"
mkdir -p "${LOCAL_MODEL_DIR}"
chmod 777 "${LOCAL_MODEL_ROOT}"

# 2. Place Docker & containerd data on NVMe to prevent EBS exhaustion & accelerate layer extraction
echo "Stopping Docker/containerd and setting up bind mounts to NVMe..."
systemctl stop docker containerd || true

mkdir -p "${NVME_DIR}/docker" "${NVME_DIR}/containerd"
mkdir -p /var/lib/docker /var/lib/containerd

# Migrate existing data if any
cp -a /var/lib/docker/* "${NVME_DIR}/docker/" 2>/dev/null || true
cp -a /var/lib/containerd/* "${NVME_DIR}/containerd/" 2>/dev/null || true

mount --bind "${NVME_DIR}/docker" /var/lib/docker
mount --bind "${NVME_DIR}/containerd" /var/lib/containerd

if ! grep -q "/var/lib/docker" /etc/fstab; then
    echo "${NVME_DIR}/docker /var/lib/docker none defaults,bind 0 0" >> /etc/fstab
fi
if ! grep -q "/var/lib/containerd" /etc/fstab; then
    echo "${NVME_DIR}/containerd /var/lib/containerd none defaults,bind 0 0" >> /etc/fstab
fi

mkdir -p /etc/docker
cat <<EOF > /etc/docker/daemon.json
{
  "data-root": "/var/lib/docker"
}
EOF

systemctl daemon-reload
systemctl start containerd
systemctl start docker

# 3. Prepare model data (fast sync from S3 if available; otherwise download from Hugging Face and back up to S3)
echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] Checking model data preparation... ==="
S3_SRC="s3://${S3_BUCKET_NAME}/models/${HF_MODEL_ID}"
echo "S3 target: ${S3_SRC}/ (Region: ${AWS_REGION})"
aws configure set default.s3.max_concurrent_requests 20

# Wait for IAM credentials and S3 connectivity (may take a few seconds for STS token propagation)
echo "Waiting for IAM auth and S3 bucket connectivity..."
for i in {1..15}; do
    if aws s3 ls "s3://${S3_BUCKET_NAME}" --region "${AWS_REGION}" >/dev/null 2>&1; then
        echo "Confirmed S3 bucket access."
        break
    fi
    echo "Waiting for S3 connection/IAM auth ($i/15)..."
    sleep 2
done

HAS_S3_MODEL=false
echo "Checking for model on S3: aws s3 ls ${S3_SRC}/ --region ${AWS_REGION}"
S3_CHECK=$(aws s3 ls "${S3_SRC}/" --region "${AWS_REGION}" 2>&1 || true)
echo "S3 check result:"
echo "${S3_CHECK}"

if echo "${S3_CHECK}" | grep -E '(\.safetensors|\.bin|\.json)' >/dev/null; then
    HAS_S3_MODEL=true
fi

if [ "${HAS_S3_MODEL}" = "true" ]; then
    echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] Model found on S3. Syncing from S3... ==="
    aws s3 sync "${S3_SRC}" "${LOCAL_MODEL_DIR}" \
        --region "${AWS_REGION}" \
        --no-progress
else
    echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] No model on S3. Downloading directly from Hugging Face on EC2... ==="
    python3 -m pip install -U "huggingface_hub[cli]" || pip3 install -U "huggingface_hub[cli]" || true
    
    echo "Downloading model ('${HF_MODEL_ID}') from Hugging Face..."
    python3 -c "
import sys
from huggingface_hub import snapshot_download
try:
    snapshot_download(repo_id='${HF_MODEL_ID}', local_dir='${LOCAL_MODEL_DIR}', local_dir_use_symlinks=False)
    print('Successfully downloaded from Hugging Face.')
except Exception as e:
    print(f'Download error: {e}', file=sys.stderr)
    sys.exit(1)
"
    echo "Download complete. Size:"
    du -sh "${LOCAL_MODEL_DIR}"
fi

echo "Model preparation complete. Local size check:"
du -sh "${LOCAL_MODEL_DIR}"

# 4. Start the vLLM container
echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] Starting vLLM container ==="
CONTAINER_NAME="vllm-server"

# If using an ECR image, perform login
if [[ "${DOCKER_IMAGE}" == *".dkr.ecr."* ]]; then
    echo "Detected ECR image. Logging in..."
    ECR_REGISTRY=$(echo "${DOCKER_IMAGE}" | cut -d'/' -f1)
    aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}" || true
fi

# Stop and remove existing container if present
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Stopping and removing existing ${CONTAINER_NAME}..."
    docker rm -f "${CONTAINER_NAME}"
fi

docker run -d \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    --gpus all \
    --ipc=host \
    -p "${VLLM_PORT}:8000" \
    -v "${LOCAL_MODEL_ROOT}:/models" \
    "${DOCKER_IMAGE}" \
    --model "/models/${HF_MODEL_ID}" \
    --served-model-name "${SERVED_MODEL_NAME}" \
    --gpu-memory-utilization "${GPU_MEMORY_UTILIZATION}" \
    --max-model-len "${MAX_MODEL_LEN}" \
    --trust-remote-code

# 5. Health check (wait for startup)
echo "Starting health check for vLLM server (port ${VLLM_PORT})..."
MAX_RETRIES=120 # Allow up to 10 minutes for initial startup & CUDA graph building
RETRY_COUNT=0

while [ ${RETRY_COUNT} -lt ${MAX_RETRIES} ]; do
    if curl -s "http://127.0.0.1:${VLLM_PORT}/health" > /dev/null 2>&1; then
        echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] vLLM server started successfully! ==="
        break
    fi
    echo "Waiting for startup... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 5
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ ${RETRY_COUNT} -eq ${MAX_RETRIES} ]; then
    echo "Warning: vLLM health check timed out. Please check 'docker logs ${CONTAINER_NAME}'."
else
    # On successful startup: if downloaded directly from HF, back up to S3 in the background (lower I/O priority to avoid impacting inference)
    if [ "${HAS_S3_MODEL}" = "false" ]; then
        echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] Startup confirmed. Starting background backup to S3 for faster sync next time ==="
        (
            if ! aws s3 ls "s3://${S3_BUCKET_NAME}" --region "${AWS_REGION}" 2>/dev/null; then
                if [ "${AWS_REGION}" = "us-east-1" ]; then
                    aws s3api create-bucket --bucket "${S3_BUCKET_NAME}" 2>/dev/null || true
                else
                    aws s3api create-bucket --bucket "${S3_BUCKET_NAME}" --region "${AWS_REGION}" --create-bucket-configuration LocationConstraint="${AWS_REGION}" 2>/dev/null || true
                fi
            fi
            ionice -c 3 aws s3 sync "${LOCAL_MODEL_DIR}" "${S3_SRC}" --region "${AWS_REGION}" --no-progress 2>/dev/null || \
            aws s3 sync "${LOCAL_MODEL_DIR}" "${S3_SRC}" --region "${AWS_REGION}" --no-progress 2>/dev/null || true
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] S3 model backup complete! Next time will sync super fast from S3."
        ) > /var/log/s3-backup.log 2>&1 &
    fi
fi

# 6. Start the auto-idle shutdown (self-destruct terminate) daemon for 1-hour idle
echo "=== Setting up and starting idle auto-shutdown daemon ==="
cat <<'EOF' > /usr/local/bin/auto-idle-shutdown.sh
#!/bin/bash
IDLE_LIMIT_SEC=3600  # 1 hour (3600 seconds)
IDLE_COUNT=0
CHECK_INTERVAL=300   # Check every 5 minutes

while true; do
    sleep "${CHECK_INTERVAL}"
    
    # Count inference requests to vLLM in the last 5 minutes from the logs
    REQ_COUNT=$(docker logs --since 5m vllm-server 2>&1 | grep -c "POST /v1" || true)
    
    if [ "${REQ_COUNT}" -eq 0 ]; then
        IDLE_COUNT=$((IDLE_COUNT + CHECK_INTERVAL))
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Idle continues: ${IDLE_COUNT}s / ${IDLE_LIMIT_SEC}s"
        
        if [ "${IDLE_COUNT}" -ge "${IDLE_LIMIT_SEC}" ]; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] No activity for 1 hour, initiating auto shutdown (terminate)."
            shutdown -h now
            exit 0
        fi
    else
        IDLE_COUNT=0  # Reset timer on request
    fi
done
EOF

chmod +x /usr/local/bin/auto-idle-shutdown.sh
nohup /usr/local/bin/auto-idle-shutdown.sh > /var/log/auto-idle-shutdown.log 2>&1 &
echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] UserData tasks complete (auto-idle monitoring active) ==="
```

:::check
**💡 Extreme infra tuning: Why use the free NVMe instead of attaching a 100 GB EBS?**  

On AWS GPU instances (`g6.xlarge`, `g4dn.xlarge`), the storage spec shows **“1 × 250 NVMe SSD”**—a local SSD physically attached to the instance and **included in the instance price at no extra charge**.

| Comparison                          | EBS (gp3 40–100 GB)              | Local NVMe SSD (250 GB)          |
| :---------------------------------- | :------------------------------- | :-------------------------------- |
| **Additional Cost**                 | Pay-as-you-go                    | **Completely free (included)**    |
| **Read/Write Bandwidth**            | Over network (125 MB/s)          | **1,000–2,000 MB/s+ (PCIe SSD)**  |
| **GPU load time for 15 GB model**   | ~15 min (I/O contention)         | **< 1 min (ultra-fast!)**         |
| **Data Persistence**                | Persisted                        | Volatile (lost on stop/terminate) |

In real testing, placing the model on EBS made initial GPU weight loading take about 15 minutes, but moving it to local NVMe SSD **dramatically cut it to under 1 minute**!

Although volatility is usually a drawback, by persisting assets in S3/ECR and treating EC2 as disposable, you **eliminate the downside of volatility and fully leverage the NVMe speed and EBS reduction benefits**.

AWS’s DLAMI (Ubuntu 22.04) even **auto-detects and mounts the local NVMe at `/opt/dlami/nvme`**, so no manual partitioning is needed. You can also move Docker/containerd storage to it, avoiding EBS pressure and accelerating container layer extraction.
:::

:::check
**💡 Prevent falling asleep or forgetting to stop! Safety device that auto self-destructs (terminate) after 1 hour idle**  

“Sometimes you get so absorbed testing that you fall asleep at your desk…”  
“Or you forget to tear down the instance and leave it running all night…”

Any engineer who’s used on-demand GPU instances has felt the fear: ~¥200/hour, so 8 hours burns ¥1,600.  
Here, we start an **idle auto-shutdown daemon** in UserData that runs when there have been no inference requests for 1 hour (`shutdown -h now`). Because we used `--instance-initiated-shutdown-behavior terminate`, the OS shutdown triggers an automatic **instance termination & EBS deletion**.  

No need for expensive CloudWatch alarms or Lambdas—this in-instance “self-destruct device” gives you a complete safety net at zero additional monthly cost.
:::

---

### Step 3: One-Command Launch Script (`03_ec2_launch.sh`)

Launching a GPU instance from the console each time is tedious, so here’s a CLI script:

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_DATA_FILE="${SCRIPT_DIR}/02_ec2_userdata.sh"
INSTANCE_STATE_FILE="${SCRIPT_DIR}/../.current_instance_id"

AWS_REGION="${AWS_REGION:-ap-northeast-1}"
INSTANCE_TYPE="${INSTANCE_TYPE:-g6.xlarge}" # NVIDIA L4 GPU (24GB VRAM)
IAM_ROLE_NAME="${IAM_ROLE_NAME:-EC2-S3-ECR-ReadOnly-Profile}"
EBS_SIZE_GB="${EBS_SIZE_GB:-40}" # DLAMI snapshot constraint (min 40GB). Models and Docker on NVMe, so 40GB is enough

# 1. Automatically search for the latest Deep Learning OSS Nvidia Driver AMI
echo "Searching for Ubuntu 22.04 Deep Learning AMI..."
AMI_ID=$(aws ec2 describe-images \
    --region "${AWS_REGION}" \
    --owners amazon \
    --filters "Name=name,Values=Deep Learning OSS Nvidia Driver AMI GPU PyTorch * (Ubuntu 22.04)*" "Name=state,Values=available" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --output text)

# 2. Auto-check/create security group (ports 8000, 22)
DEFAULT_VPC=$(aws ec2 describe-vpcs --region "${AWS_REGION}" --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)
EXISTING_SG=$(aws ec2 describe-security-groups --region "${AWS_REGION}" --filters "Name=vpc-id,Values=${DEFAULT_VPC}" "Name=group-name,Values=vllm-sg" --query "SecurityGroups[0].GroupId" --output text 2>/dev/null || echo "")

if [ -n "${EXISTING_SG}" ] && [ "${EXISTING_SG}" != "None" ]; then
    SG_ID="${EXISTING_SG}"
else
    SG_ID=$(aws ec2 create-security-group --region "${AWS_REGION}" --group-name "vllm-sg" --description "SG for vLLM API" --vpc-id "${DEFAULT_VPC}" --query "GroupId" --output text)
    aws ec2 authorize-security-group-ingress --region "${AWS_REGION}" --group-id "${SG_ID}" --protocol tcp --port 8000 --cidr "0.0.0.0/0"
    aws ec2 authorize-security-group-ingress --region "${AWS_REGION}" --group-id "${SG_ID}" --protocol tcp --port 22 --cidr "0.0.0.0/0"
fi

# 3. Create IAM instance profile (S3 & ECR read permissions)
if ! aws iam get-instance-profile --instance-profile-name "${IAM_ROLE_NAME}" >/dev/null 2>&1; then
    aws iam create-role --role-name "${IAM_ROLE_NAME}-Role" \
        --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
    aws iam attach-role-policy --role-name "${IAM_ROLE_NAME}-Role" --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
    aws iam attach-role-policy --role-name "${IAM_ROLE_NAME}-Role" --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
    aws iam create-instance-profile --instance-profile-name "${IAM_ROLE_NAME}"
    aws iam add-role-to-instance-profile --instance-profile-name "${IAM_ROLE_NAME}" --role-name "${IAM_ROLE_NAME}-Role"
    sleep 5 # Wait for IAM propagation
fi

# 4. Base64-encode UserData and launch the instance
USERDATA_BASE64=$(base64 -w 0 "${USER_DATA_FILE}" 2>/dev/null || base64 "${USER_DATA_FILE}" | tr -d '\r\n')

INSTANCE_ID=$(aws ec2 run-instances \
    --region "${AWS_REGION}" \
    --image-id "${AMI_ID}" \
    --instance-type "${INSTANCE_TYPE}" \
    --iam-instance-profile "Name=${IAM_ROLE_NAME}" \
    --security-group-ids "${SG_ID}" \
    --user-data "${USERDATA_BASE64}" \
    --block-device-mappings "[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":${EBS_SIZE_GB},\"VolumeType\":\"gp3\",\"DeleteOnTermination\":true}}]" \
    --instance-initiated-shutdown-behavior terminate \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=vllm-server-temp}]" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Instance launch started: ${INSTANCE_ID}"
echo "${INSTANCE_ID}" > "${INSTANCE_STATE_FILE}"

# 5. Wait for launch completion and retrieve public IP
aws ec2 wait instance-running --region "${AWS_REGION}" --instance-ids "${INSTANCE_ID}"
PUBLIC_IP=$(aws ec2 describe-instances --region "${AWS_REGION}" --instance-ids "${INSTANCE_ID}" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo "Instance launch complete: IP = ${PUBLIC_IP}"
echo "Waiting for vLLM startup health check (usually ~7–10 minutes)..."

# 6. Poll until /health returns 200 OK
while ! curl -s "http://${PUBLIC_IP}:8000/health" > /dev/null 2>&1; do
    echo -n "."
    sleep 5
done
echo ""
echo "🎉 vLLM server is ready! (http://${PUBLIC_IP}:8000)"
```

Running this script will:  
1. Auto-search for the latest Deep Learning AMI  
2. Auto-configure an SG opening ports 8000 and 22  
3. Auto-attach an IAM profile with S3 & ECR read permissions  
4. Launch a disposable EC2 (DeleteOnTermination = true, terminate on shutdown)  
5. Poll for `http://<IP>:8000/health` to return 200 OK (typical startup time 7–10 minutes)  
6. Save the instance ID to `.current_instance_id` for later teardown  

:::check
**⏱️ Real breakdown of startup time (~7–10 minutes)**  
1. EC2 initialization & NVMe bind-mount: ~30 s–1 min  
2. Pull vLLM image from ECR & layer extraction: **4–6 min**  
   (vLLM container with CUDA & PyTorch is >16 GB when extracted)  
3. High-speed sync of model weights (~15 GB) from S3: 1–2 min (same region)  
4. vLLM container startup & GPU weight load & CUDA graph build: 1–2 min  
   (On EBS, GPU load alone took ~15 min; NVMe reduces this to < 1 min)  

Compared to manually executing dozens of commands via GUI or SSH, **one command, walk away to make coffee, and return ~7–10 minutes later to find your personal GPU inference environment ready** is extremely convenient!  
:::

Once the console shows “🎉 vLLM server is ready!”, you can immediately start using it!

---

## Testing: Calling the OpenAI-Compatible API

Let’s send a request via curl from your terminal. To avoid quoting issues on Windows (PowerShell, Git Bash), it’s most reliable to create a JSON file and use `-d @req.json`.

```bash
PUBLIC_IP="<Public IP of the launched EC2>"

# 1. Create the JSON request body
cat <<'EOF' > req.json
{
  "model": "Qwen/Qwen2.5-Coder-7B-Instruct",
  "messages": [
    {"role": "user", "content": "Please tell me in 3 lines the benefits of running GPU instances ephemerally in AWS Tokyo region."}
  ]
}
EOF

# 2. Send request to the vLLM OpenAI-compatible endpoint
curl http://${PUBLIC_IP}:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d @req.json
```

:::info
**Windows Environment Tips**  
Inlining JSON in a command-line argument like `-d '{ ... }'` often strips double quotes on Windows (PowerShell, CMD, Git Bash), causing `{"detail":"There was an error parsing the body"}`. Passing via a file (`-d @req.json`) works reliably across OSes.  
:::

**Sample response:**
```json
{
  "id": "chatcmpl-a662010ed226ea08",
  "object": "chat.completion",
  "created": 1789410574,
  "model": "Qwen/Qwen2.5-Coder-7B-Instruct",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "1. Cost efficiency: Ephemeral GPU instances allow you to pay only for the time you use them, saving money on idle periods.\n2. Scalability: You can easily scale instances up or down as needed.\n3. Security: Instances are terminated immediately after use, reducing the risk of data leaks."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 58,
    "total_tokens": 163,
    "completion_tokens": 105
  }
}
```

It returned a fast response from your own GPU server! Since it’s a standard OpenAI-compatible endpoint, you can also connect with Python’s `openai` library or various GUI clients (Open WebUI, etc.).

:::alert
**⚠️ Important Security Note: Plaintext (HTTP) Communication and Securing**  
In this test configuration, we send requests directly over **HTTP (plaintext) on port 8000** for ease of testing. However, plaintext communications over the internet risk interception or tampering of prompts and responses.

In production or when handling sensitive code/data, always **secure your communications** by one of the following:

1. **SSH Port Forwarding (easiest & recommended)**:  
   Do not open port 8000 to the internet in your EC2 security group; only allow SSH (port 22). From your local machine, run:
   ```bash
   ssh -i <your-key.pem> -N -L 8000:localhost:8000 ubuntu@<EC2 Public IP>
   ```
   Then access `http://localhost:8000` over the encrypted SSH tunnel.

2. **SSL/TLS via Reverse Proxy (HTTPS)**:  
   Deploy Nginx or Caddy in EC2 as a reverse proxy, apply a Let’s Encrypt certificate, and terminate HTTPS on port 443. Alternatively, place an AWS Application Load Balancer (ALB) with AWS Certificate Manager (ACM) in front.

3. **Use a Private Network (VPN / Tailscale)**:  
   Use AWS Client VPN, Tailscale, WireGuard, etc., so that traffic stays within a private IP space without traversing the public internet.  
:::

---

## Instantly Tear Down After Testing! (Double Safety Net for Falling Asleep)

When you’re done, **terminate**, not stop, the instance. Just run the provided teardown script (`04_ec2_terminate.sh`):

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTANCE_STATE_FILE="${SCRIPT_DIR}/../.current_instance_id"
AWS_REGION="${AWS_REGION:-ap-northeast-1}"

INSTANCE_ID="${1:-}"
if [ -z "${INSTANCE_ID}" ] && [ -f "${INSTANCE_STATE_FILE}" ]; then
    INSTANCE_ID=$(cat "${INSTANCE_STATE_FILE}" | tr -d '[:space:]')
fi

if [ -z "${INSTANCE_ID}" ]; then
    echo "Error: No instance ID specified to terminate."
    exit 1
fi

echo "=== EC2 Instance Full Termination (Terminate) ==="
echo "Target Instance ID: ${INSTANCE_ID}"
echo "* The EBS volume (DeleteOnTermination=true) will also be fully deleted."

aws ec2 terminate-instances \
    --region "${AWS_REGION}" \
    --instance-ids "${INSTANCE_ID}" \
    --output table

echo "Waiting for instance termination completion..."
aws ec2 wait instance-terminated \
    --region "${AWS_REGION}" \
    --instance-ids "${INSTANCE_ID}"

rm -f "${INSTANCE_STATE_FILE}"

echo "=========================================================="
echo " Instance and EBS volume full deletion complete!"
echo " No more compute/EBS charges will occur for this instance."
echo "=========================================================="
```

Run:
```bash
./scripts/04_ec2_terminate.sh
```

Since “Delete on Termination” is enabled for the EBS volume, the 100 GB EBS storage is cleanly wiped out upon instance termination. You get the peace of mind of **“No more expensive EBS idle charges! Idle maintenance costs are only about ¥145/month for storage!”**.

### What if You Forget to Run the Teardown Script and Fall Asleep?
Rest assured—the **auto-idle shutdown daemon** defined in UserData will handle it. If no inference requests come in for 1 hour after the last API call, the instance will automatically execute `shutdown -h now`. Because `--instance-initiated-shutdown-behavior terminate` is set, it will auto-terminate the instance and delete the EBS volume!

With **two safety nets**—manual immediate teardown and 1-hour idle self-destruct—you can sleep peacefully even during late-night tests.

Want to get back in? The model is in S3, so just run `./scripts/03_ec2_launch.sh` and the identical environment will be up again in minutes—the essence of cloud convenience.

---

## Common Pitfalls and Solutions

### 1. Forgetting to attach IAM role or missing policies
The UserData script runs `aws s3 sync` and `aws ecr get-login-password`, so the IAM role attached to the EC2 instance must include:
* S3 read permissions (`s3:GetObject` and `s3:ListBucket`, or `AmazonS3ReadOnlyAccess`)  
* ECR pull permissions (`AmazonEC2ContainerRegistryReadOnly`)

Without these policies, you’ll see `AccessDenied` in `/var/log/userdata-vllm.log` and the startup will stall.

### 2. Data Transfer Charges Due to Region Mismatch
If your S3 bucket and EC2 are in different regions (e.g., S3 in `us-east-1` and EC2 in `ap-northeast-1`), you’ll incur **inter-region internet data transfer fees (several GB to tens of GB)** when downloading the model. Always use the same region (here, Tokyo `ap-northeast-1`), where transfer is **free**.

### 3. VRAM Memory Allocation Setting for vLLM Startup (`--gpu-memory-utilization`)
By default, vLLM tries to preallocate 90%–95% of GPU memory. If you set a large context length (`--max-model-len`) relative to the model size, you may run out of KV cache space and crash with OOM. On a 24 GB VRAM instance, start with `--gpu-memory-utilization 0.90` and `--max-model-len 8192`, then adjust as needed.

### 4. GPU Instance Launch Error (`VcpuLimitExceeded`)
If you encounter:
```text
An error occurred (VcpuLimitExceeded) when calling the RunInstances operation:
You have requested more vCPU capacity than your current vCPU limit of 0 allows...
```
you’ve hit your vCPU quota (0 for GPU instances). As noted earlier, request a quota increase (to 4 vCPUs or more) for `Running On-Demand G and VT instances` via **Service Quotas**.

---

## Conclusion

In this article, we built a fully automated, ephemeral LLM testing environment using **Linux × UserData × vLLM × S3 & ECR** as a foundation for efficiently leveraging open-source LLMs in daily development and experimentation.

* **Fully automated environment setup**: From launch to vLLM container runtime, everything automated via UserData.  
* **Nearly zero idle cost**: Offload model weights to S3 and container images to ECR, enabling fully disposable EC2 instances and eliminating costly EBS idle charges (idle maintenance cost ~¥145/month).  
* **Auto self-destruct feature for falling asleep/forgetting to stop**: If no inference requests for 1 hour, the OS self-shuts down, and the instance + EBS auto-terminates—thwarting runaway GPU charges.  
* **OpenAI-compatible endpoint**: Exposes the standard API on port 8000, so any client can connect.

If you’ve hesitated to try cloud GPUs due to cost or maintenance concerns, give this “luxury of having nothing” ephemeral setup a try!
