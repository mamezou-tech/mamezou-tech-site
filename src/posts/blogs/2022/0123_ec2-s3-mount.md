---
title: EC2にS3をマウントする方法
author: nozomu-tanaka
date: 2022-01-23
---

FTPサーバーとして使用しているEC2がファイルを受け取った際に、S3トリガーでLambdaを動かすようにしたときのメモです。

AWS Transfer for SFTPも検討しましたが、コストの問題からEC2にS3をマウントする方式を採用しました。

以下、その手順です。

### 参考

[Amazon Linux2でIAMロールを使ったs3fsの設定をやってみた](https://dev.classmethod.jp/articles/setting-s3fs-with-al2/)

[AWS Transfer Family の料金](https://aws.amazon.com/jp/aws-transfer-family/pricing/)


# １．IAMロールに権限を追加
FTPサーバーとして使用するEC2がマウントするS3のファイルを読み書きできるよう、
EC2のIAMロールにS3への読み書き権を追加しておきます。

【追加したIAMポリシー】
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::{マウントするバケット名}"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObjectVersion",
                "s3:DeleteObject",
                "s3:GetObjectVersion"
            ],
            "Resource": [
                "arn:aws:s3:::{マウントするバケット名}/*"
            ]
        }
    ]
}
 ```

# ２．s3fsのインストール
EC2にS3をマウントできるようにするため、EC2にs3fsをインストールします。

以下をEC2のコマンドラインからroot権限で実行します。(sudo - root)

```shell
# yumアップデート(不要かも)
yum -y update
# s3fsのパッケージを入れるためにライブラリを追加
amazon-linux-extras install -y epel
# s3fsインストール
yum -y install s3fs-fuse
# バージョン確認
s3fs --version
```

# ３．S3のマウント
以下の手順でS3をマウントします。

* バケットのルートからのみマウント可能です
* なぜかS3バケット作成後１日待たないとマウントできないことがありました

```shell
# S3のマウントポイントを作成
mkdir /mnt/sftp
# EC2再起動時もS3がマウントされるよう/etc/fstabに以下を追加
# umaskを指定しないとftpユーザーが読み書きできない
echo "backet1 /mnt/sftp fuse.s3fs _netdev,allow_other,iam_role=auto,umask=022 0 0" | sudo tee -a /etc/fstab
# マウント実行
mount -a
# マウント確認
df -h
```

**以降の手順はSFTPを使用しない場合は不要です。**

# ４．SSHの設定
FTPユーザーのホームディレクトリがS3のマウントポイント以下になるようにします。

参考：[セキュアなSSHサーバの設定](https://qiita.com/comefigo/items/092137ac40f319cb14fa)

```shell
# FTPユーザーのホームディレクトリ作成
mkdir /mnt/sftp/home
# グループ追加
groupadd -g 510 sftps3users
```

sftps3usersに属するユーザーのホームディレクトリがS3のマウントポイント以下になるよう`/etc/ssh/sshd_config`に以下を追加します。
```shell
Match Group sftps3users
    ChrootDirectory %h
    ForceCommand internal-sftp
    AllowTcpForwarding no
    PermitRootLogin no
    PasswordAuthentication yes
    PubkeyAuthentication yes
```

SSHを再起動して設定を有効化します。
```shell
systemctl restart sshd.service
```

# ５．FTPユーザー追加
以下の手順でFTPユーザーを追加します。
```shell
# FTPユーザー(ftpuser1)追加
useradd -g sftps3users -d /mnt/sftp/home/ftpuser1 -s /sbin/nologin ftpuser1
# homeをrootでマウントできるようにする
chown root:root /mnt/sftp/home/ftpuser1
# 受信フォルダ(recv)作成
mkdir /mnt/sftp/home/ftpuser1/recv
chown ftpuser1 /mnt/sftp/home/ftpuser1/recv
chmod 770 /mnt/sftp/home/ftpuser1/recv
# パスワード(pass1)設定
echo ftpuser1:pass1 | chpasswd
```

# ６．FTP接続確認
FTP接続し、recvフォルダ以下のみ書き込みできることを確認します。
```shell
sftp ftpuser1@ftp-server1
パスワード：***
```
