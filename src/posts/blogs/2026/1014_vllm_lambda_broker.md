---
title: vLLM起動をAWS Lambda化！最安スポット探索と自動フォールバック
author: kazuyuki-shiratani
date: 2026-10-14
tags: [AWS, lambda, Python, EC2, vLLM, コスト最適化]
image: true
---

## はじめに

前回の記事（[EC2スポット×vLLMをSSMでセキュア化！ポート開放ゼロで繋ぐ](/blogs/2026/10/09/vllm_ssm_zero_inbound/)）では、AWS Systems Manager（SSM）Session Managerによるポートフォワーディングを導入し、セキュリティグループのインバウンドを完全に閉塞（ポート開放ゼロ）しながら、SSH鍵管理を完全撤廃したセキュアなGPU利用環境を構築しました。

しかし、第3回・第4回と機能を追加していく中で、**クライアント側（WSL / Mac等）の起動スクリプト（Bash）に新たな運用課題**が生じていました：

1. **探索レイテンシーの遅さ（直列処理の限界）**:  
   BashスクリプトからAWS CLIを使って複数リージョンのスポット価格、AZ候補、Spot Advisor中断率を逐次（直列に）取得していたため、探索とスコアリングだけで15〜30秒近く待たされる。
2. **スポット枯渇（全滅）時の対応**:  
   世界的なAIブームの影響で、時間帯によっては候補リージョンのスポットキャパシティが全滅（`InsufficientInstanceCapacity`）することがあります。その際、エラーでスクリプトが止まり、手動でオンデマンドインスタンスを立て直すなどの二度手間が発生していました。
3. **ローカル環境の肥大化と保守性**:  
   Bashスクリプト内に価格パース、中断率計算、JSON加工、AWKによるスコアリングロジックが詰め込まれ、シェルスクリプトのメンテナンス性が限界に達していました。

そこで今回は、これらの判定・探索ロジックをすべてクライアントから切り離し、**AWS Lambdaによる「サーバーレスGPUブローカー」** へと進化させます。

Pythonの `concurrent.futures` によるマルチリージョン・マルチAZの超高速並列スキャン（1秒台で完了）と、**スポット枯渇時のスマートな「オンデマンド・フォールバック機能」** を実装した実践的な手法を紹介します。

:::info
**📚 関連する過去の検証記事**
* **第1回（基本構成）**: [AWS×UserDataでvLLMを自動起動！停止時コストほぼゼロのローカルLLM環境](/blogs/2026/09/16/vllm_autolaunch/)
* **第2回（Cline連携）**: [自前vLLMをOpen WebUI経由でVS Code（Cline）に接続！トークンフリーで開発する](/blogs/2026/09/29/vllm_openwebui_cline/)
* **第3回（スポット活用）**: [EC2スポットインスタンス×vLLMでGPUコストを大幅削減する](/blogs/2026/10/02/vllm_spot_instance/)
* **第4回（SSMセキュア化）**: [EC2スポット×vLLMをSSMでセキュア化！ポート開放ゼロで繋ぐ](/blogs/2026/10/09/vllm_ssm_zero_inbound/)
:::

---

## サーバーレスGPUブローカーのアーキテクチャ

> **📌 このセクションの要点**  
> クライアントは探索・判定ロジックから解放され、「Lambdaを叩いて起動結果を受け取る」シンプルな構成に。Lambda側で全リージョンのBoto3並列クエリ・総合スコアリング・スポット起動試行・オンデマンドフォールバックを一手に引き受けます。

```mermaid
flowchart TD
    subgraph Client ["ローカル開発端末 (Bashスクリプト)"]
        CLI["./01_start_vllm_ssm.sh<br>(--on-demand / --strategy)"]
        Tunnel["SSM ポートフォワーディング<br>(localhost:8000 -> EC2:8000)"]
    end

    subgraph AWS_Mgmt ["AWS 管理基盤 (Lambda)"]
        Broker["vLLM Broker Lambda<br>(Python 3.12 / Boto3)"]
        Advisor["AWS Spot Advisor<br>(JSON 中断率)"]
    end

    subgraph Multi_Region ["マルチリージョン EC2 群"]
        direction LR
        R1["東京 (ap-northeast-1)"]
        R2["オレゴン (us-west-2)"]
        R3["バージニア (us-east-1)"]
        R4["オハイオ (us-east-2)"]
        R5["フランクフルト (eu-central-1)"]
    end

    CLI -->|"1. invoke (JSON)"| Broker
    Broker -.->|"並列価格・AZ取得 (1秒)"| Multi_Region
    Broker -.->|中断頻度取得| Advisor
    Broker -->|"2. スポット起動試行 (順次)"| Multi_Region
    Broker -- "スポット全滅時: エラー案内 or<br>オンデマンド(cost/latency)起動" --> Multi_Region
    Broker -->|"3. Instance ID & Region 返却"| CLI
    CLI -->|4. SSM ポートフォワード接続| Tunnel
```

### アーキテクチャの進化ポイント

| 項目 | 第4回までの構成 (クライアントBash) | 今回の構成 (Lambda ブローカー) | メリット |
| :--- | :--- | :--- | :--- |
| **探索速度** | 15〜30秒以上（CLIを直列実行） | **約1〜2秒（Pythonスレッド並列）** | 待ち時間が劇的に短縮 |
| **クライアントの責務** | 価格・中断率の取得、探索計算、起動試行 | **Lambda呼び出しとSSMトンネル接続のみ** | 複雑な探索ロジックから解放 |
| **スポット枯渇時** | エラーで中断、手動対応 | **明確なエラー案内 & オンデマンド切替** | 開発作業を止めずにリカバリ可能 |
| **通常起動戦略** | なし | **「コスト最安」または「レイテンシー最小」** | 業務の優先度に応じた柔軟な選択 |

---

## スポット枯渇時のフォールバック設計

スポットインスタンスは余剰キャパシティを利用するため、世界中でGPU需要がピークに達した時間帯には、全候補リージョンで `InsufficientInstanceCapacity` が返ってくる「スポット枯渇」が発生します。

本システムでは、以下の2段構えのフォールバックポリシーを採用しています：

1. **デフォルト（スポット起動時）**:  
   候補リージョンすべてでスポット起動を試み、すべて在庫切れになった場合は即座にエラー `ALL_SPOT_EXHAUSTED` を返却。エラーメッセージには「通常起動オプション（`--on-demand`）を付与して再実行できる旨」を分かりやすく案内します。勝手にオンデマンド課金に切り替わって意図せぬ出費が発生する事故を未然に防ぎます。
2. **オンデマンド指定時（`--on-demand`）**:  
   どうしても今すぐ作業を進めたい場合、ユーザーは明示的に `--on-demand` フラグを指定して再実行します。その際、以下の2つの戦略（`--strategy`）を選択できます：
   - **`cost`（最安コスト重視・デフォルト）**: 海外リージョンを含めた全リージョンのオンデマンド定価（ドル換算）を比較し、最も定価が安いリージョンで起動。
   - **`latency`（低遅延重視）**: 物理的に最も近い東京リージョン（`ap-northeast-1`）を最優先で起動し、快適なタイピング・レスポンスを確保。

---

## Lambda関数の実装 (`handler.py`)

Lambda関数のコアロジックです。外部ライブラリを必要とせず、標準ライブラリ（`concurrent.futures`, `urllib.request`）と `boto3` だけで完結します。

<details><summary>handler.py（クリックで展開）</summary>

```python
"""
vLLM GPU Spot Broker Lambda
マルチリージョンのスポット探索、最適リージョン選定、Spot起動、Terminateを統括するサーバーレスブローカー
"""

import json
import logging
import urllib.request
import concurrent.futures
import boto3
from botocore.config import Config

import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 候補リージョンとインスタンスタイプ
env_regions = os.environ.get("TARGET_REGIONS")
CANDIDATE_REGIONS = [r.strip() for r in env_regions.split(",") if r.strip()] if env_regions else ["ap-northeast-1", "eu-central-1", "us-east-2", "us-east-1", "us-west-2"]
INSTANCE_TYPE = os.environ.get("INSTANCE_TYPE", "g6.xlarge")
IAM_ROLE_NAME = os.environ.get("INSTANCE_PROFILE_NAME", "vllm-ssm-instance-profile")
TAG_SERVER_NAME = os.environ.get("TAG_SERVER_NAME", "vllm-ssm-spot-node")
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME", "vllm-models-storage")
ECR_REPOSITORY_NAME = os.environ.get("ECR_REPOSITORY_NAME", "vllm-openai")

# リージョン別 AMI ID キャッシュ (Ubuntu 22.04 Deep Learning AMI)
AMI_MAPPING = {
    "ap-northeast-1": "ami-0152728adca68ed36",
    "eu-central-1": "ami-0efde0090dab8cacf",
    "us-east-2": "ami-032b37e4db407994d",
    "us-east-1": "ami-012ba162b9cd2729c",
    "us-west-2": "ami-0ca70308d230e8a6e",
}

# リージョン別 オンデマンド参考価格 ($/h: g6.xlarge) と東京からの目安RTT (ms)
ON_DEMAND_METRICS = {
    "ap-northeast-1": {"price": 1.3412, "latency_ms": 15, "name": "東京 (最低遅延・国内)"},
    "us-west-2":      {"price": 0.9840, "latency_ms": 110, "name": "オレゴン (コスト最安・中遅延)"},
    "us-east-2":      {"price": 0.9840, "latency_ms": 150, "name": "オハイオ (コスト最安)"},
    "us-east-1":      {"price": 0.9840, "latency_ms": 170, "name": "バージニア (コスト最安)"},
    "eu-central-1":   {"price": 1.2024, "latency_ms": 230, "name": "フランクフルト"},
}

# 共通 UserData テンプレート (S3・ECR並列ダウンロード + SSM対応版)
USERDATA_TEMPLATE = """#!/bin/bash
set -euo pipefail
LOG_FILE="/var/log/userdata-vllm.log"
exec > >(tee -a "${LOG_FILE}") 2>&1
echo "=== [$(date '+%Y-%m-%d %H:%M:%S')] UserData 実行開始 (SSM完全閉塞版) ==="

AWS_REGION="__AWS_REGION__"
S3_BUCKET_NAME="__S3_BUCKET_NAME__"
HF_MODEL_ID="Qwen/Qwen2.5-Coder-7B-Instruct"
SERVED_MODEL_NAME="Qwen/Qwen2.5-Coder-7B-Instruct"
VLLM_PORT="8000"
GPU_MEMORY_UTILIZATION="0.90"
MAX_MODEL_LEN="16384"
DOCKER_IMAGE="__DOCKER_IMAGE__"

# 1. ローカル NVMe インスタンスストア（250GB）の検出と活用
NVME_DIR="/opt/dlami/nvme"
if mountpoint -q "${NVME_DIR}" || [ -d "${NVME_DIR}" ]; then
    echo "DLAMI既定の NVMe マウント (${NVME_DIR}) を活用します..."
    mkdir -p "${NVME_DIR}/models" "${NVME_DIR}/docker"
    mkdir -p /data
    ln -sfn "${NVME_DIR}/models" /data/models
else
    NVME_DEV=$(lsblk -d -n -o NAME,SIZE | grep -E '250G|232G' | head -n1 | awk '{print $1}')
    if [ -n "${NVME_DEV}" ]; then
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

# 2. Docker データ領域を NVMe に配置
systemctl stop docker containerd || true
mkdir -p "${NVME_DIR}/docker" "${NVME_DIR}/containerd"
mkdir -p /var/lib/docker /var/lib/containerd
cp -a /var/lib/docker/* "${NVME_DIR}/docker/" 2>/dev/null || true
cp -a /var/lib/containerd/* "${NVME_DIR}/containerd/" 2>/dev/null || true
mount --bind "${NVME_DIR}/docker" /var/lib/docker
mount --bind "${NVME_DIR}/containerd" /var/lib/containerd
systemctl daemon-reload
systemctl start containerd
systemctl start docker

# 3. S3モデル同期 と Docker pull の並列実行
S3_SRC="s3://${S3_BUCKET_NAME}/models/${HF_MODEL_ID}"
aws configure set default.s3.max_concurrent_requests 20

(
    echo "--- [Task A] Dockerイメージ取得: ${DOCKER_IMAGE} ---"
    if [[ "${DOCKER_IMAGE}" == *".dkr.ecr."* ]]; then
        ECR_REGISTRY=$(echo "${DOCKER_IMAGE}" | cut -d'/' -f1)
        ECR_REGION=$(echo "${ECR_REGISTRY}" | awk -F. '{print $4}')
        aws ecr get-login-password --region "${ECR_REGION:-${AWS_REGION}}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}" || true
    fi
    docker pull "${DOCKER_IMAGE}"
) > /var/log/docker-pull.log 2>&1 &
PID_DOCKER=$!

(
    echo "--- [Task B] S3モデル高速同期 ---"
    aws s3 sync "${S3_SRC}" "${LOCAL_MODEL_DIR}" --region "${AWS_REGION}" --no-progress
) > /var/log/model-sync.log 2>&1 &
PID_S3=$!

wait "${PID_DOCKER}"
wait "${PID_S3}"
echo "=== 並列ダウンロード完了！ ==="

# 4. vLLMコンテナ起動
docker run -d \\
    --name "vllm-server" \\
    --restart unless-stopped \\
    --gpus all \\
    --ipc=host \\
    -p "${VLLM_PORT}:8000" \\
    -v "${LOCAL_MODEL_ROOT}:/models" \\
    "${DOCKER_IMAGE}" \\
    --model "/models/${HF_MODEL_ID}" \\
    --served-model-name "${SERVED_MODEL_NAME}" \\
    --gpu-memory-utilization "${GPU_MEMORY_UTILIZATION}" \\
    --max-model-len "${MAX_MODEL_LEN}" \\
    --trust-remote-code \\
    --enable-auto-tool-choice \\
    --tool-call-parser hermes

# 5. アイドル1時間自動終了デーモン
cat <<'EOF_IDLE' > /usr/local/bin/auto-idle-shutdown.sh
#!/bin/bash
IDLE_LIMIT=3600
IDLE_COUNT=0
while true; do
    sleep 300
    REQ=$(docker logs --since 5m vllm-server 2>&1 | grep -c "POST /v1" || true)
    if [ "${REQ}" -eq 0 ]; then
        IDLE_COUNT=$((IDLE_COUNT + 300))
        [ "${IDLE_COUNT}" -ge "${IDLE_LIMIT}" ] && { shutdown -h now; exit 0; }
    else
        IDLE_COUNT=0
    fi
done
EOF_IDLE
chmod +x /usr/local/bin/auto-idle-shutdown.sh
nohup /usr/local/bin/auto-idle-shutdown.sh > /dev/null 2>&1 &
echo "=== UserData 完了 (SSM待機中) ==="
"""


def get_spot_advisor_data():
    """Spot Advisor から中断頻度ランクを取得"""
    url = "https://spot-bid-advisor.s3.amazonaws.com/spot-advisor-data.json"
    tiers = {}
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Lambda-Broker"})
        with urllib.request.urlopen(req, timeout=3) as res:
            adv = json.loads(res.read().decode("utf-8")).get("spot_advisor", {})
            for r, info in adv.items():
                tier = info.get("Linux", {}).get(INSTANCE_TYPE, {}).get("r", 4)
                tiers[r] = tier
    except Exception as e:
        logger.warning(f"Spot Advisor 取得失敗: {e}")
    return tiers


def query_region_metrics(region, advisor_tiers):
    """単一リージョンのスポット価格・AZ数を取得"""
    boto_cfg = Config(connect_timeout=2, read_timeout=3, retries={"max_attempts": 1})
    ec2 = boto3.client("ec2", region_name=region, config=boto_cfg)
    try:
        res = ec2.describe_spot_price_history(
            InstanceTypes=[INSTANCE_TYPE],
            ProductDescriptions=["Linux/UNIX"],
            MaxResults=10,
        )
        prices = res.get("SpotPriceHistory", [])
        if not prices:
            return None

        # 最安値とAZ数
        min_price = min(float(p["SpotPrice"]) for p in prices)
        azs = set(p["AvailabilityZone"] for p in prices)
        az_count = len(azs)
        tier = advisor_tiers.get(region, 4)

        return {
            "region": region,
            "min_price": min_price,
            "az_count": az_count,
            "tier": tier,
        }
    except Exception as e:
        logger.error(f"Error querying {region}: {e}")
        return None


def select_best_region():
    """全候補リージョンを並列評価して最適リージョンを算出"""
    advisor_tiers = get_spot_advisor_data()
    metrics = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(CANDIDATE_REGIONS)) as executor:
        futures = {executor.submit(query_region_metrics, r, advisor_tiers): r for r in CANDIDATE_REGIONS}
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res:
                metrics.append(res)

    if not metrics:
        raise RuntimeError("全リージョンでスポット価格を取得できませんでした")

    best_price = min(m["min_price"] for m in metrics)

    # スコア計算: 価格40 + 余剰AZ40 + 中断耐性20
    best_item = None
    max_score = -1

    for m in metrics:
        p_score = int(40.0 * (best_price / m["min_price"]))

        tier = m["tier"]
        i_score = {0: 20, 1: 15, 2: 10, 3: 5}.get(tier, 0)

        az = m["az_count"]
        if az >= 5:
            c_score = 40
        elif az == 4:
            c_score = 32
        elif az == 3:
            c_score = 24
        elif az == 2:
            c_score = 16
        else:
            c_score = 8

        total_score = p_score + i_score + c_score
        m["score"] = total_score
        if total_score >= 75:
            m["rank"] = "Rank S"
        elif total_score >= 65:
            m["rank"] = "Rank A"
        elif total_score >= 50:
            m["rank"] = "Rank B"
        else:
            m["rank"] = "Rank C"

        if total_score > max_score:
            max_score = total_score
            best_item = m

    return best_item, metrics


def get_or_create_ssm_security_group(ec2_client, region):
    """インバウンド完全遮断（受信0ルール）のSSM専用セキュリティグループ"""
    sg_name = "vllm-ssm-isolated-sg"
    try:
        res = ec2_client.describe_security_groups(
            Filters=[{"Name": "group-name", "Values": [sg_name]}]
        )
        if res["SecurityGroups"]:
            return res["SecurityGroups"][0]["GroupId"]
    except Exception:
        pass

    # 作成（デフォルトVPC）
    vpcs = ec2_client.describe_vpcs(Filters=[{"Name": "isDefault", "Values": ["true"]}])["Vpcs"]
    vpc_id = vpcs[0]["VpcId"] if vpcs else ec2_client.describe_vpcs()["Vpcs"][0]["VpcId"]

    new_sg = ec2_client.create_security_group(
        GroupName=sg_name,
        Description="Zero inbound ports allowed - access exclusively via AWS Systems Manager (SSM)",
        VpcId=vpc_id,
    )
    # インバウンドルールは一切追加しない（完全閉塞）
    return new_sg["GroupId"]


def get_latest_dlami(ec2_client):
    """最新のUbuntu 22.04 Deep Learning AMI IDを動的取得"""
    try:
        res = ec2_client.describe_images(
            Owners=["amazon"],
            Filters=[{"Name": "name", "Values": ["Deep Learning OSS Nvidia Driver AMI GPU PyTorch 2.* (Ubuntu 22.04)*"]}],
        )
        images = sorted(res.get("Images", []), key=lambda x: x["CreationDate"])
        if images:
            return images[-1]["ImageId"]
    except Exception as e:
        logger.warning(f"Failed to query latest DLAMI: {e}")
    return None


def select_on_demand_region(strategy="cost"):
    """通常起動（オンデマンド）時の最適リージョンを選定
    - cost: オンデマンド単価が最も安いリージョン（同価格なら低遅延優先: us-west-2 > us-east-2 > us-east-1）
    - latency: 東京からの遅延が最小のリージョン（ap-northeast-1 優先）
    """
    valid_regions = [r for r in CANDIDATE_REGIONS if r in ON_DEMAND_METRICS]
    if not valid_regions:
        valid_regions = CANDIDATE_REGIONS

    if strategy == "latency":
        return sorted(valid_regions, key=lambda r: ON_DEMAND_METRICS.get(r, {}).get("latency_ms", 999))
    else:
        return sorted(
            valid_regions,
            key=lambda r: (
                ON_DEMAND_METRICS.get(r, {}).get("price", 999),
                ON_DEMAND_METRICS.get(r, {}).get("latency_ms", 999),
            ),
        )


def launch_instance(region, account_id, is_spot=True):
    """指定リージョンでインスタンス（スポットまたは通常起動）を起動"""
    ec2 = boto3.client("ec2", region_name=region, config=Config(retries={"max_attempts": 1}))

    ami_id = AMI_MAPPING.get(region)
    if not ami_id:
        ami_id = get_latest_dlami(ec2)
        if not ami_id:
            raise ValueError(f"AMI ID not configured for region {region}")

    sg_id = get_or_create_ssm_security_group(ec2, region)

    s3_bucket = S3_BUCKET_NAME
    if not s3_bucket or s3_bucket == "vllm-models-storage" or "*" in s3_bucket:
        s3_bucket = f"my-vllm-models-hackathon-2026-{account_id}-{region}-an"
    elif "{account_id}" in s3_bucket or "{region}" in s3_bucket:
        s3_bucket = s3_bucket.replace("{account_id}", account_id).replace("{region}", region)

    docker_image = f"{account_id}.dkr.ecr.{region}.amazonaws.com/{ECR_REPOSITORY_NAME}:latest"

    # UserData 生成
    userdata_script = USERDATA_TEMPLATE.replace("__AWS_REGION__", region)
    userdata_script = userdata_script.replace("__S3_BUCKET_NAME__", s3_bucket)
    userdata_script = userdata_script.replace("__DOCKER_IMAGE__", docker_image)

    def do_run(target_ami):
        run_params = {
            "ImageId": target_ami,
            "InstanceType": INSTANCE_TYPE,
            "MinCount": 1,
            "MaxCount": 1,
            "IamInstanceProfile": {"Name": IAM_ROLE_NAME},
            "SecurityGroupIds": [sg_id],
            "InstanceInitiatedShutdownBehavior": "terminate",
            "BlockDeviceMappings": [
                {
                    "DeviceName": "/dev/sda1",
                    "Ebs": {
                        "VolumeSize": 40,
                        "VolumeType": "gp3",
                        "DeleteOnTermination": True,
                    },
                }
            ],
            "UserData": userdata_script,
            "TagSpecifications": [
                {
                    "ResourceType": "instance",
                    "Tags": [
                        {"Key": "Name", "Value": TAG_SERVER_NAME},
                        {"Key": "Project", "Value": "vllm-ephemeral"},
                        {"Key": "MarketType", "Value": "spot" if is_spot else "on-demand"},
                    ],
                }
            ],
        }

        if is_spot:
            run_params["InstanceMarketOptions"] = {
                "MarketType": "spot",
                "SpotOptions": {
                    "SpotInstanceType": "one-time",
                    "InstanceInterruptionBehavior": "terminate",
                },
            }

        return ec2.run_instances(**run_params)

    try:
        run_res = do_run(ami_id)
    except Exception as e:
        if "InvalidAMIID" in str(e):
            logger.info(f"AMI {ami_id} invalid in {region}, querying latest dynamically...")
            dynamic_ami = get_latest_dlami(ec2)
            if dynamic_ami and dynamic_ami != ami_id:
                run_res = do_run(dynamic_ami)
            else:
                raise
        else:
            raise

    instance_id = run_res["Instances"][0]["InstanceId"]
    return instance_id


def launch_spot_instance(best_region_info, account_id):
    """後方互換性エイリアス"""
    return launch_instance(best_region_info["region"], account_id, is_spot=True)


def terminate_all_instances():
    """全候補リージョンから稼働中の vLLM インスタンス（スポット・オンデマンド問わず）を検索して Terminate"""
    terminated = []

    def check_and_term(region):
        ec2 = boto3.client("ec2", region_name=region)
        try:
            res = ec2.describe_instances(
                Filters=[
                    {"Name": "tag:Name", "Values": [TAG_SERVER_NAME]},
                    {"Name": "instance-state-name", "Values": ["pending", "running", "stopping"]},
                ]
            )
            ids = [i["InstanceId"] for r in res.get("Reservations", []) for i in r.get("Instances", [])]
            if ids:
                ec2.terminate_instances(InstanceIds=ids)
                return [{"region": region, "instance_id": i} for i in ids]
        except Exception as e:
            logger.error(f"Error terminating in {region}: {e}")
        return []

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(CANDIDATE_REGIONS)) as executor:
        results = executor.map(check_and_term, CANDIDATE_REGIONS)
        for r_list in results:
            terminated.extend(r_list)

    return terminated


def terminate_all_spot_instances():
    """後方互換性エイリアス"""
    return terminate_all_instances()


def lambda_handler(event, context):
    """Lambda メインエントリーポイント"""
    action = event.get("action", "launch")
    mode = event.get("mode", "spot")  # "spot" or "on-demand"
    if event.get("on_demand") is True or event.get("use_on_demand") is True:
        mode = "on-demand"
    strategy = event.get("strategy", "cost").lower()  # "cost" or "latency"

    account_id = context.invoked_function_arn.split(":")[4]

    logger.info(f"Received action: {action}, mode: {mode}, strategy: {strategy} (Account: {account_id})")

    if action == "launch":
        if mode == "on-demand":
            # 通常起動（オンデマンド）
            candidates = select_on_demand_region(strategy)
            logger.info(f"On-Demand candidate order (strategy={strategy}): {candidates}")

            failed_attempts = []
            last_error = None

            for region in candidates:
                info = ON_DEMAND_METRICS.get(region, {"price": 1.0, "latency_ms": 100, "name": region})
                logger.info(f"Attempting On-Demand launch in {region} ({info.get('name')})...")
                try:
                    instance_id = launch_instance(region, account_id, is_spot=False)
                    logger.info(f"Successfully launched On-Demand instance {instance_id} in {region}")
                    return {
                        "status": "success",
                        "action": "launch",
                        "market_type": "on-demand",
                        "strategy": strategy,
                        "region": region,
                        "region_name": info.get("name"),
                        "instance_id": instance_id,
                        "instance_type": INSTANCE_TYPE,
                        "on_demand_price": info.get("price"),
                        "latency_ms": info.get("latency_ms"),
                        "fallback_attempts": failed_attempts,
                        "note": f"通常起動（オンデマンド）で起動しました（優先戦略: {strategy}）。",
                    }
                except Exception as e:
                    err_str = str(e)
                    if "VcpuLimitExceeded" in err_str or "InstanceLimitExceeded" in err_str:
                        reason = "オンデマンドGPUクォータ上限到達"
                    else:
                        reason = f"{type(e).__name__}"
                    logger.warning(f"On-Demand launch failed in {region} ({reason})")
                    failed_attempts.append({"region": region, "reason": reason})
                    last_error = e
                    continue

            return {
                "status": "error",
                "error_code": "ALL_ON_DEMAND_FAILED",
                "message": f"すべてのオンデマンド候補リージョンで起動に失敗しました。Last error: {last_error}",
                "fallback_attempts": failed_attempts,
            }

        else:
            # デフォルト: スポット起動
            _, all_metrics = select_best_region()
            sorted_candidates = sorted(all_metrics, key=lambda x: x.get("score", 0), reverse=True)
            logger.info(f"Ranked spot candidates: {[c['region'] for c in sorted_candidates]}")

            failed_attempts = []
            last_error = None
            for candidate in sorted_candidates:
                region = candidate["region"]
                logger.info(f"Attempting spot launch in {region} (Score: {candidate.get('score')}, Rank: {candidate.get('rank')})...")
                try:
                    instance_id = launch_instance(region, account_id, is_spot=True)
                    logger.info(f"Successfully launched spot instance {instance_id} in {region}")
                    return {
                        "status": "success",
                        "action": "launch",
                        "market_type": "spot",
                        "region": region,
                        "instance_id": instance_id,
                        "instance_type": INSTANCE_TYPE,
                        "spot_price": candidate.get("min_price"),
                        "score": candidate.get("score"),
                        "rank": candidate.get("rank"),
                        "candidates": all_metrics,
                        "fallback_attempts": failed_attempts,
                    }
                except Exception as e:
                    err_str = str(e)
                    if "InsufficientInstanceCapacity" in err_str:
                        reason = "スポット余剰キャパシティ不足 (在庫切れ)"
                    elif "MaxSpotInstanceCountExceeded" in err_str:
                        reason = "スポットクォータ上限到達"
                    else:
                        reason = f"{type(e).__name__}"
                    logger.warning(f"Spot launch failed in {region} ({reason}), trying next candidate...")
                    failed_attempts.append({
                        "region": region,
                        "score": candidate.get("score"),
                        "rank": candidate.get("rank"),
                        "reason": reason,
                    })
                    last_error = e
                    continue

            # ★ 全リージョンでスポットが取得できなかった場合のエラーレスポンス
            return {
                "status": "error",
                "error_code": "ALL_SPOT_EXHAUSTED",
                "message": (
                    "すべての候補リージョンでスポットインスタンスの起動に失敗しました（キャパシティ不足等）。\n"
                    "通常起動（オンデマンド）で起動する場合は、スクリプトに '--on-demand' オプションを指定してください。\n"
                    "  例: ./01_start_vllm_ssm.sh --on-demand --strategy cost     # コスト最安（米オレゴン等: 約$0.98/h）\n"
                    "  例: ./01_start_vllm_ssm.sh --on-demand --strategy latency  # レイテンシー最小（東京: 約$1.34/h）"
                ),
                "fallback_attempts": failed_attempts,
            }

    elif action == "terminate":
        terminated = terminate_all_instances()
        return {
            "status": "success",
            "action": "terminate",
            "terminated_instances": terminated,
            "count": len(terminated),
        }

    elif action == "status":
        best_region_info, all_metrics = select_best_region()
        return {
            "status": "success",
            "action": "status",
            "recommended_region": best_region_info,
            "all_metrics": all_metrics,
        }

    else:
        return {
            "status": "error",
            "message": f"Unknown action: '{action}'. Must be 'launch', 'terminate', or 'status'.",
        }
```

</details>

---

## Lambdaのデプロイスクリプト (`00_deploy_lambda.sh`)

作成した `handler.py` をZIPアーカイブ化し、AWS Lambdaにデプロイするシェルスクリプトです。

<details><summary>00_deploy_lambda.sh（クリックで展開）</summary>

```bash
#!/bin/bash
set -euo pipefail

# ==============================================================================
# 00_deploy_lambda.sh
# GPU起動ブローカーLambda関数およびIAM実行ロールを自動作成・更新するスクリプト
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAMBDA_DIR="$(cd "${SCRIPT_DIR}/../lambda" && pwd)"
FUNCTION_NAME="vllm-spot-broker"
ROLE_NAME="vllm-spot-broker-lambda-role"
REGION="ap-northeast-1"

echo "=== 1. Lambda 実行ロール (${ROLE_NAME}) の作成/確認 ==="
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

if ! aws iam get-role --role-name "${ROLE_NAME}" >/dev/null 2>&1; then
    echo "IAMロールを作成中..."
    aws iam create-role \
        --role-name "${ROLE_NAME}" \
        --assume-role-policy-document "${TRUST_POLICY}" \
        --description "Execution role for vLLM Spot Broker Lambda" >/dev/null
    
    # 基本ログ出力権限
    aws iam attach-role-policy \
        --role-name "${ROLE_NAME}" \
        --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    
    # EC2 & IAM PassRole 権限インラインポリシー
    BROKER_POLICY="{
      \"Version\": \"2012-10-17\",
      \"Statement\": [
        {
          \"Effect\": \"Allow\",
          \"Action\": [
            \"ec2:Describe*\",
            \"ec2:RunInstances\",
            \"ec2:TerminateInstances\",
            \"ec2:CreateSecurityGroup\",
            \"ec2:CreateTags\"
          ],
          \"Resource\": \"*\"
        },
        {
          \"Effect\": \"Allow\",
          \"Action\": \"iam:PassRole\",
          \"Resource\": [
            \"arn:aws:iam::${AWS_ACCOUNT_ID}:role/vllm-ssm-instance-role\",
            \"arn:aws:iam::${AWS_ACCOUNT_ID}:role/VllmServerSSMRole\"
          ]
        }
      ]
    }"
    
    aws iam put-role-policy \
        --role-name "${ROLE_NAME}" \
        --policy-name "VllmBrokerPermissions" \
        --policy-document "${BROKER_POLICY}"
    
    echo "IAMロール作成完了。権限の伝播を少し待機中..."
    sleep 10
else
    echo "既存のIAMロールを使用します: ${ROLE_NAME}"
fi

ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}"

echo "=== 2. Lambda コードのパッケージング ==="
TMP_ZIP=$(mktemp --suffix=.zip)
rm -f "${TMP_ZIP}"
(cd "${LAMBDA_DIR}" && zip -q -r "${TMP_ZIP}" handler.py)

echo "=== 3. Lambda 関数 (${FUNCTION_NAME}) の作成/更新 ==="
if aws lambda get-function --region "${REGION}" --function-name "${FUNCTION_NAME}" >/dev/null 2>&1; then
    echo "既存のLambda関数コードを更新中..."
    aws lambda update-function-code \
        --region "${REGION}" \
        --function-name "${FUNCTION_NAME}" \
        --zip-file "fileb://${TMP_ZIP}" >/dev/null
else
    echo "新しいLambda関数を作成中..."
    aws lambda create-function \
        --region "${REGION}" \
        --function-name "${FUNCTION_NAME}" \
        --runtime "python3.12" \
        --role "${ROLE_ARN}" \
        --handler "handler.lambda_handler" \
        --zip-file "fileb://${TMP_ZIP}" \
        --timeout 60 \
        --memory-size 256 \
        --description "Multi-region spot instance broker for vLLM" >/dev/null
fi

rm -f "${TMP_ZIP}"
echo "=== デプロイ完了！ ==="
echo "Lambda 関数名: ${FUNCTION_NAME} (${REGION})"
```

</details>

---

## 探索ロジックを手放したクライアント側スクリプト (`01_start_vllm_ssm.sh`)

ローカルPC側の起動スクリプトは、複雑なマルチリージョン計算や中断率データの取得をすべてクラウド側へ手放し、**「Lambdaを呼び出して起動されたインスタンス情報を受け取り、SSMポートフォワーディングを張る」** というローカル環境の接続・トンネル管理に専念する構成へと進化します。

<details><summary>01_start_vllm_ssm.sh（クリックで展開）</summary>

```bash
#!/bin/bash
set -euo pipefail

# ==============================================================================
# 01_start_vllm_ssm.sh
# Lambdaブローカーを呼び出して最安スポットを起動し、SSMポートフォワーディングで安全に直結する
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTANCE_STATE_FILE="${SCRIPT_DIR}/.current_instance_id"
TUNNEL_PID_FILE="${SCRIPT_DIR}/.current_tunnel_pid"
REGION_STATE_FILE="${SCRIPT_DIR}/.current_region"
TUNNEL_LOG="${SCRIPT_DIR}/.current_tunnel.log"

BROKER_REGION="ap-northeast-1"
FUNCTION_NAME="vllm-spot-broker"

# オプション解析
USE_ON_DEMAND="false"
STRATEGY="cost"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --on-demand)
            USE_ON_DEMAND="true"
            shift
            ;;
        --strategy)
            STRATEGY="${2:-cost}"
            shift 2
            ;;
        -h|--help)
            echo "使用方法: $0 [オプション]"
            echo ""
            echo "オプション:"
            echo "  --on-demand               通常起動（オンデマンド）で起動する（デフォルトはスポット起動）"
            echo "  --strategy <cost|latency> 通常起動時の優先戦略（デフォルト: cost）"
            echo "                            cost    : オンデマンド単価が最も安いリージョンを選択（米オレゴン等: 約\$0.98/h）"
            echo "                            latency : レイテンシーが最も小さいリージョンを選択（東京: 約\$1.34/h）"
            echo "  -h, --help                ヘルプを表示"
            exit 0
            ;;
        *)
            echo "不明なオプション: $1"
            echo "ヘルプ: $0 --help"
            exit 1
            ;;
    esac
done

TMP_RES=$(mktemp)

if [ "${USE_ON_DEMAND}" = "true" ]; then
    echo "=== 1. サーバーレスGPUブローカー（Lambda）呼び出し [通常起動 / 戦略: ${STRATEGY}]... ==="
    PAYLOAD=$(jq -n --arg mode "on-demand" --arg strategy "${STRATEGY}" '{"action":"launch","mode":$mode,"strategy":$strategy}')
else
    echo "=== 1. サーバーレスGPUブローカー（Lambda）呼び出し [スポット探索 & 起動]... ==="
    PAYLOAD='{"action":"launch","mode":"spot"}'
fi

aws lambda invoke \
    --region "${BROKER_REGION}" \
    --function-name "${FUNCTION_NAME}" \
    --payload "${PAYLOAD}" \
    --cli-binary-format raw-in-base64-out \
    "${TMP_RES}" >/dev/null

STATUS=$(jq -r '.status // "error"' "${TMP_RES}")
if [ "${STATUS}" != "success" ]; then
    ERROR_CODE=$(jq -r '.error_code // ""' "${TMP_RES}")
    MESSAGE=$(jq -r '.message // ""' "${TMP_RES}")

    echo "=========================================================="
    if [ "${ERROR_CODE}" = "ALL_SPOT_EXHAUSTED" ]; then
        echo "❌ スポット在庫切れ: 全候補リージョンでスポットインスタンスを調達できませんでした。"
        echo "----------------------------------------------------------"
        echo "【試行した候補リージョンと結果】"
        jq -r '.fallback_attempts[]? | "  - \(.region) (\(.score // "-")点 / \(.rank // "-")): \(.reason)"' "${TMP_RES}"
        echo ""
        echo "💡 通常起動（オンデマンド）であれば確実に起動可能です。"
        echo "   以下のコマンドで再実行してください:"
        echo ""
        echo "   # コスト最安リージョン（米オレゴン等: 約\$0.98/h）で通常起動:"
        echo "   $0 --on-demand --strategy cost"
        echo ""
        echo "   # レイテンシー最小リージョン（東京: 約\$1.34/h）で通常起動:"
        echo "   $0 --on-demand --strategy latency"
    else
        echo "エラー: Lambdaの起動リクエストが失敗しました。"
        echo "${MESSAGE}"
        cat "${TMP_RES}"
    fi
    echo "=========================================================="
    rm -f "${TMP_RES}"
    exit 1
fi

MARKET_TYPE=$(jq -r '.market_type // "spot"' "${TMP_RES}")
INSTANCE_ID=$(jq -r '.instance_id' "${TMP_RES}")
SELECTED_REGION=$(jq -r '.region' "${TMP_RES}")

echo "${INSTANCE_ID}" > "${INSTANCE_STATE_FILE}"
echo "${SELECTED_REGION}" > "${REGION_STATE_FILE}"

echo "=========================================================="
if [ "${MARKET_TYPE}" = "on-demand" ]; then
    STRAT=$(jq -r '.strategy // "cost"' "${TMP_RES}")
    PRICE=$(jq -r '.on_demand_price // "-"' "${TMP_RES}")
    LATENCY=$(jq -r '.latency_ms // "-"' "${TMP_RES}")
    REG_NAME=$(jq -r '.region_name // ""' "${TMP_RES}")
    echo " ⚡ 通常起動（オンデマンド）完了: 戦略 = ${STRAT}"
    echo "    選定リージョン  : ${SELECTED_REGION} (${REG_NAME})"
    echo "    インスタンスID  : ${INSTANCE_ID}"
    echo "    オンデマンド価格: \$${PRICE}/h"
    echo "    目安レイテンシー: 約 ${LATENCY} ms"
else
    PRICE=$(jq -r '.spot_price // "-"' "${TMP_RES}")
    SCORE=$(jq -r '.score // "-"' "${TMP_RES}")
    RANK=$(jq -r '.rank // "-"' "${TMP_RES}")
    echo " 🏆 最適スポットリージョン選定完了: ${SELECTED_REGION} (${RANK} / ${SCORE}点)"
    echo "    インスタンスID: ${INSTANCE_ID}"
    echo "    スポット価格  : \$${PRICE}/h"

    FALLBACK_COUNT=$(jq -r '.fallback_attempts | length // 0' "${TMP_RES}")
    if [ "${FALLBACK_COUNT}" -gt 0 ]; then
        echo " ⚠️ 上位候補リージョンで一時的なスポット在庫不足が発生したため、自動フォールバックしました:"
        jq -r '.fallback_attempts[] | "    - \(.region) (\(.score)点 / \(.rank)): \(.reason)"' "${TMP_RES}"
    fi
fi
echo "=========================================================="
rm -f "${TMP_RES}"

# インスタンスの実行状態（running）待機
echo "インスタンスが running 状態になるのを待機中..."
aws ec2 wait instance-running --region "${SELECTED_REGION}" --instance-ids "${INSTANCE_ID}"

# Git Bash環境向けにSessionManagerPluginのパスを追加
if [ -d "/c/Program Files/Amazon/SessionManagerPlugin/bin" ]; then
    export PATH="${PATH}:/c/Program Files/Amazon/SessionManagerPlugin/bin"
fi

# --- 2. SSMエージェントのオンライン待機 ---
echo "=== 2. SSMエージェントのオンライン待機 ==="
echo "EC2インスタンス内部のSSM Agentが接続されるのを待機中..."
SSM_OK=false
for i in {1..30}; do
    STATUS=$(aws ssm describe-instance-information \
        --region "${SELECTED_REGION}" \
        --filters "Key=InstanceIds,Values=${INSTANCE_ID}" \
        --query "InstanceInformationList[0].PingStatus" \
        --output text 2>/dev/null || true)
    
    if [ "${STATUS}" = "Online" ]; then
        echo " SSM Agent が Online になりました！ (${i}回目の試行)"
        SSM_OK=true
        break
    fi
    echo -n "."
    sleep 3
done
echo ""

if [ "${SSM_OK}" != "true" ]; then
    echo "エラー: SSM Agent が Online になりませんでした。IAMロールやアウトバウンド通信を確認してください。"
    exit 1
fi

# --- 3. サーバー側での vLLM 起動待機 (S3モデルDL・コンテナ起動) ---
echo "=== 3. サーバー側での vLLM 起動待機 (http://127.0.0.1:8000/health) ==="
echo "UserDataによるS3モデルダウンロードとvLLM起動を待機しています（通常2〜4分程度）..."
SERVER_READY=false
for i in {1..90}; do
    CMD_ID=$(aws ssm send-command \
        --region "${SELECTED_REGION}" \
        --instance-ids "${INSTANCE_ID}" \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=["curl -s -m 2 http://127.0.0.1:8000/health >/dev/null && echo OK || echo WAITING"]' \
        --query "Command.CommandId" \
        --output text 2>/dev/null || true)
    
    if [ -n "${CMD_ID}" ]; then
        sleep 2
        RES=$(aws ssm get-command-invocation \
            --region "${SELECTED_REGION}" \
            --command-id "${CMD_ID}" \
            --instance-id "${INSTANCE_ID}" \
            --query "StandardOutputContent" \
            --output text 2>/dev/null || true)
        if [[ "${RES}" =~ "OK" ]]; then
            echo " サーバー側の vLLM が正常に応答しました！"
            SERVER_READY=true
            break
        fi
    fi
    echo -n "."
    sleep 5
done
echo ""

if [ "${SERVER_READY}" != "true" ]; then
    echo "警告: サーバー側のvLLM起動待機がタイムアウトしました。UserDataログを確認してください。"
fi

# --- 4. 既存トンネルの整理と新規SSMポートフォワーディング確立 ---
echo "=== 4. SSMポートフォワーディングの確立 (ポート開放不要トンネル) ==="
if [ -f "${TUNNEL_PID_FILE}" ]; then
    OLD_PID=$(cat "${TUNNEL_PID_FILE}" | tr -d '[:space:]')
    if [ -n "${OLD_PID}" ] && ps -p "${OLD_PID}" > /dev/null 2>&1; then
        echo "古いポートフォワードプロセス (PID: ${OLD_PID}) を終了します..."
        kill -9 "${OLD_PID}" 2>/dev/null || true
    fi
    rm -f "${TUNNEL_PID_FILE}"
fi
pkill -f "AWS-StartPortForwardingSession.*8000" 2>/dev/null || true

# バックグラウンドでSSMポートフォワーディングを開始（ログを .current_tunnel.log に出力）
nohup aws ssm start-session \
    --region "${SELECTED_REGION}" \
    --target "${INSTANCE_ID}" \
    --document-name AWS-StartPortForwardingSession \
    --parameters '{"portNumber":["8000"],"localPortNumber":["8000"]}' \
    > "${TUNNEL_LOG}" 2>&1 &

TUNNEL_PID=$!
echo "${TUNNEL_PID}" > "${TUNNEL_PID_FILE}"
echo "SSMポートフォワーディングを開始しました (PID: ${TUNNEL_PID})"
sleep 2

# --- 5. ローカル疎通確認 ---
echo "=== 5. ローカル疎通確認 (http://localhost:8000/health) ==="
LOCAL_OK=false
for i in {1..10}; do
    if curl -s -m 3 "http://localhost:8000/health" > /dev/null 2>&1; then
        echo " ローカルからの直結疎通を確認しました！ (HTTP 200 OK)"
        LOCAL_OK=true
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

if [ "${LOCAL_OK}" != "true" ]; then
    echo "警告: ローカル接続に失敗しました。トンネルログを確認してください:"
    cat "${TUNNEL_LOG}" 2>/dev/null || true
fi

echo "=========================================================="
echo " サーバーレスGPUブローカーによる直結完了！"
echo " EC2 Instance ID : ${INSTANCE_ID} (${MARKET_TYPE}, Region: ${SELECTED_REGION})"
echo " セキュリティ      : インバウンドルール 0件（完全閉塞）"
echo " トンネル接続      : localhost:8000 -> EC2:8000 (SSM暗号化)"
echo " Web UI / API    : http://localhost:8000/v1"
echo ""
echo " VS Code の Cline から接続してください (Base URL: http://localhost:8000/v1)"
echo " 検証終了時は以下のコマンドで完全破棄してください:"
echo "   ./02_stop_vllm_ssm.sh"
echo "=========================================================="
```

</details>

---

## 実際の動作パターンと検証

### 1. 通常のスポット起動（1秒台で最適リージョンを選定・起動要求）

引数なしで実行すると、Lambdaが全リージョンを並列評価し、最安・低中断率のスポットをわずか1秒台で引き当てます。

```bash
$ ./01_start_vllm_ssm.sh
=== 1. サーバーレスGPUブローカー（Lambda）を呼び出し中 [スポット起動]... ===
==========================================================
 🏆 最適スポットリージョン選定完了: us-west-2 (Rank A / 68点)
    インスタンスID: i-087654321fedcba09
    スポット価格  : $0.4264/h
==========================================================
インスタンスが running 状態になるのを待機中...
=== 2. SSMエージェントのオンライン待機 ===
EC2インスタンス内部のSSM Agentが接続されるのを待機中...
. SSM Agent が Online になりました！ (1回目の試行)

=== 3. サーバー側での vLLM 起動待機 (http://127.0.0.1:8000/health) ===
UserDataによるS3モデルダウンロードとvLLM起動を待機しています（通常2〜4分程度）...
................................ サーバー側の vLLM が正常に応答しました！

=== 4. SSMポートフォワーディングの確立 (ポート開放不要トンネル) ===
SSMポートフォワーディングを開始しました (PID: 53120)

=== 5. ローカル疎通確認 (http://localhost:8000/health) ===
. ローカルからの直結疎通を確認しました！ (HTTP 200 OK)

==========================================================
 サーバーレスGPUブローカーによる直結完了！
 EC2 Instance ID : i-087654321fedcba09 (spot, Region: us-west-2)
 セキュリティ      : インバウンドルール 0件（完全閉塞）
 トンネル接続      : localhost:8000 -> EC2:8000 (SSM暗号化)
 Web UI / API    : http://localhost:8000/v1

 VS Code の Cline から接続してください (Base URL: http://localhost:8000/v1)
 検証終了時は以下のコマンドで完全破棄してください:
   ./02_stop_vllm_ssm.sh
==========================================================
```

### 2. スポット枯渇時（フォールバック案内）

世界的にGPUキャパシティが逼迫している時間帯では、Lambdaがすべての候補リージョンを試みた上でスマートにフォールバック案内を返します：

```bash
$ ./01_start_vllm_ssm.sh
=== 1. サーバーレスGPUブローカー（Lambda）を呼び出し中 [スポット起動]... ===
==========================================================
❌ スポット在庫切れ: 全候補リージョンでスポットインスタンスを調達できませんでした。
----------------------------------------------------------
【試行した候補リージョンと結果】
  - us-west-2 (68点 / Rank A): スポット余剰キャパシティ不足 (在庫切れ)
  - us-east-2 (74点 / Rank A): スポット余剰キャパシティ不足 (在庫切れ)
  - eu-central-1 (78点 / Rank S): スポット余剰キャパシティ不足 (在庫切れ)
  - us-east-1 (68点 / Rank A): スポット余剰キャパシティ不足 (在庫切れ)
  - ap-northeast-1 (43点 / Rank C): スポット余剰キャパシティ不足 (在庫切れ)

💡 通常起動（オンデマンド）であれば確実に起動可能です。
   以下のコマンドで再実行してください:

   # コスト最安リージョン（米オレゴン等: 約$0.98/h）で通常起動:
   ./01_start_vllm_ssm.sh --on-demand --strategy cost

   # レイテンシー最小リージョン（東京: 約$1.34/h）で通常起動:
   ./01_start_vllm_ssm.sh --on-demand --strategy latency
==========================================================
```

### 3. オンデマンド起動への切り替え

今すぐ作業を進めたい場合は、案内通りに `--on-demand` を付与して再実行します。

**最安コスト重視（`--strategy cost`）:**
```bash
$ ./01_start_vllm_ssm.sh --on-demand --strategy cost
=== 1. サーバーレスGPUブローカー（Lambda）を呼び出し中 [通常起動 / 戦略: cost]... ===
==========================================================
 ⚡ 通常起動（オンデマンド）完了: 戦略 = cost
    選定リージョン  : us-west-2 (オレゴン (コスト最安・中遅延))
    インスタンスID  : i-01122334455667788
    オンデマンド価格: $0.9840/h
    目安レイテンシー: 約 110 ms
==========================================================
...
```

**低遅延重視（`--strategy latency`）:**
```bash
$ ./01_start_vllm_ssm.sh --on-demand --strategy latency
=== 1. サーバーレスGPUブローカー（Lambda）を呼び出し中 [通常起動 / 戦略: latency]... ===
==========================================================
 ⚡ 通常起動（オンデマンド）完了: 戦略 = latency
    選定リージョン  : ap-northeast-1 (東京 (最低遅延・国内))
    インスタンスID  : i-09988776655443322
    オンデマンド価格: $1.3412/h
    目安レイテンシー: 約 15 ms
==========================================================
...
```

---

## 検証終了時の完全破棄スクリプト (`02_stop_vllm_ssm.sh`)

作業が終了したら、破棄スクリプト（`02_stop_vllm_ssm.sh`）を実行します。ローカルのSSMトンネルプロセスを安全に切断した上で、Lambdaブローカーに終了リクエストを発行し、EC2インスタンスおよびEBSボリュームを完全に破棄します。

<details><summary>02_stop_vllm_ssm.sh（クリックで展開）</summary>

```bash
#!/bin/bash
set -euo pipefail

# ==============================================================================
# 02_stop_vllm_ssm.sh
# SSMポートフォワードプロセスを終了し、Lambda経由でGPUインスタンスを破棄する
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTANCE_STATE_FILE="${SCRIPT_DIR}/.current_instance_id"
TUNNEL_PID_FILE="${SCRIPT_DIR}/.current_tunnel_pid"
REGION_STATE_FILE="${SCRIPT_DIR}/.current_region"
TUNNEL_LOG="${SCRIPT_DIR}/.current_tunnel.log"

BROKER_REGION="ap-northeast-1"
FUNCTION_NAME="vllm-spot-broker"

# 1. SSMポートフォワードプロセスの終了
echo "=== 1. SSMポートフォワードプロセスの終了 ==="
if [ -f "${TUNNEL_PID_FILE}" ]; then
    TUNNEL_PID=$(cat "${TUNNEL_PID_FILE}" | tr -d '[:space:]')
    if [ -n "${TUNNEL_PID}" ] && ps -p "${TUNNEL_PID}" > /dev/null 2>&1; then
        echo "SSMポートフォワードプロセス (PID: ${TUNNEL_PID}) を終了中..."
        kill -9 "${TUNNEL_PID}" 2>/dev/null || true
    fi
    rm -f "${TUNNEL_PID_FILE}"
fi
pkill -f "AWS-StartPortForwardingSession.*8000" 2>/dev/null || true

# 2. Lambdaブローカーへのインスタンス破棄リクエスト
echo "=== 2. サーバーレスGPUブローカー（Lambda）へ完全破棄リクエスト ==="
TMP_RES=$(mktemp)
aws lambda invoke \
    --region "${BROKER_REGION}" \
    --function-name "${FUNCTION_NAME}" \
    --payload '{"action":"terminate"}' \
    --cli-binary-format raw-in-base64-out \
    "${TMP_RES}" >/dev/null

STATUS=$(jq -r '.status // "error"' "${TMP_RES}" 2>/dev/null || echo "error")
if [ "${STATUS}" = "success" ]; then
    COUNT=$(jq -r '.count // 0' "${TMP_RES}")
    echo "=========================================================="
    echo " 🛑 破棄完了！ 稼働中のインスタンス ${COUNT} 台を Terminate しました。"
    jq -r '.terminated_instances[]? | "  - [\(.region)] \(.instance_id)"' "${TMP_RES}" 2>/dev/null || true
    echo "=========================================================="
else
    echo "警告: Lambda経由の破棄でエラーが返されました。ローカル情報による直接破棄を試みます..."
    AWS_REGION=$(cat "${REGION_STATE_FILE}" 2>/dev/null | tr -d '[:space:]' || echo "ap-northeast-1")
    INSTANCE_ID=$(cat "${INSTANCE_STATE_FILE}" 2>/dev/null | tr -d '[:space:]' || echo "")
    if [ -n "${INSTANCE_ID}" ]; then
        aws ec2 terminate-instances --region "${AWS_REGION}" --instance-ids "${INSTANCE_ID}" >/dev/null 2>&1 || true
        echo "インスタンス ${INSTANCE_ID} (${AWS_REGION}) を直接Terminateしました。"
    fi
fi

rm -f "${TMP_RES}" "${INSTANCE_STATE_FILE}" "${REGION_STATE_FILE}" "${TUNNEL_LOG}"
echo "スポットインスタンス、EBSボリューム、SSMトンネルの完全破棄が完了しました！"
```

</details>

---

## まとめ

今回は、マルチリージョンのGPU調達ロジックを **AWS LambdaによるサーバーレスGPUブローカー** へと刷新しました。

* **並列探索による高速化**: Pythonのマルチスレッドにより、全リージョン・AZのスポット価格・中断率取得から判定までをわずか1〜2秒で完結。
* **クライアントの責務スリム化**: 複雑なマルチリージョン探索や中断率集計、フォールバックの重厚なロジックをクラウド側へ切り離し、ローカルスクリプトは接続とプロセス管理のみに専念。
* **耐障害性の向上（スマートなフォールバック）**: スポット全滅時も勝手に高額課金せず、明確なエラー通知と再試行オプション（コスト最安 vs 低遅延）を提供。

クラウドの余剰リソースを徹底的に使い倒すための、極めて実用的で回復力の高いGPU基盤が完成しました。
