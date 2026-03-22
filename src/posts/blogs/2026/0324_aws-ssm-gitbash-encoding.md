---
title: AWS Session ManagerをGit Bashで利用した際の文字化け対処法
author: takahiro-maeda
date: 2026-03-24
tags: [AWS, SSM, terminal]
image: true
---

## はじめに

普段、個人では Macを使っていますが、業務では Windowsを利用しています。

Windows環境では、軽量で扱いやすく、POSIXライクな操作ができる Git Bashを使っています。
Windows Terminal からも利用できるため、普段使い慣れたコマンドをそのまま使え、AWS CLIとの相性が良い点も便利です。

@[Windows Terminal で Git Bash を快適に使う](https://developer.mamezou-tech.com/blogs/2023/09/08/windows-terminal-with-git-bash/)

Windows環境からGit Bashを使って AWS Systems Manager Session Manager（以下、SSM）経由で EC2 に接続すると、一部の罫線・記号が文字化けすることがあります。

本記事では、この事象の再現内容、原因、対処方法を紹介します。

結論としては、**session-manager-plugin を最新版へ更新するのが第一選択**です。  
更新が難しい場合は、**`chcp.com 65001` でコードページを UTF-8 に変更する方法**が有効でした。

なお、Mac から接続した場合は同様の問題は発生しませんでした。

## 前提

以下の環境で検証しています。

- OS: Windows: 11(Pro)
- Terminal: Git Bash
- AWS CLI:  `aws-cli/2.32.16 Python/3.13.11 Windows/11 exe/AMD64`
- session-manager-plugin: `1.2.707.0(検証開始時)→1.2.792.0(解決)`

次のような方を対象としています。

- Windows + Git Bash で AWS CLI / SSM を利用してEC2への接続している方。
- `lsblk` や `systemctl status` の罫線・記号などの文字化けする方。

## 先に結論

対処方法は次の通りです。

| 優先度 | 対処方法 | 補足 |
| ---- | ---- | ---- |
| 1 | `session-manager-plugin` を最新版（`1.2.792.0` 以降）へ更新する | 根本対応。まずはこちらを推奨 |
| 2 | `chcp.com 65001` を実行する | プラグインを更新できない場合の暫定対処 |
| 3 | `.bashrc` に設定する | 暫定対処を継続利用する場合の恒久化 |

## 推奨対処: session-manager-plugin を最新版へ更新する

検証を進める中で、**最新版の `session-manager-plugin` に更新すると事象が解消する**ことを確認できました。

※このバージョンは、記事の執筆・検証時点の3日前に最新版がリリースされていました。

執筆時点では、最新版の`1.2.792.0` にプラグインを更新することで文字化けが再現しなくなりました。

インストール方法は、以下の AWS 公式ドキュメントを参照してください。

@[session-manager-pluginのインストール（Windows）](https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/install-plugin-windows.html)

また、`1.2.792.0` のリリースノートには、Windows キーボード対応に関する記載があります。

- [session-manager-plugin 1.2.792.0 リリースページ](https://github.com/aws/session-manager-plugin/releases/tag/1.2.792.0)

本記事の後半は、**古いバージョン (`1.2.707.0`) を利用していたときの再現内容と暫定対処**をまとめたものです。

まずはプラグインを最新版へ更新し、改善するかを確認してください。

## 文字化けの事象（古いプラグインの場合）

古いバージョンのプラグイン（例：`1.2.707.0`）を使用している場合、以下のようなコマンドを実行した際に文字化けが発生しました。

今回は Amazon Linux 2023 と Ubuntu 24.04 の公式AMIで検証しましたが、AMIに依存せず、同様の箇所で文字化けが発生しました。

```bash
lsblk
NAME         MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
loop0          7:0    0 27.8M  1 loop /snap/amazon-ssm-agent/12322
loop1          7:1    0   74M  1 loop /snap/core22/2339
loop2          7:2    0 48.1M  1 loop /snap/snapd/25935
nvme0n1      259:0    0    8G  0 disk
笏懌楳nvme0n1p1  259:1    0    7G  0 part /
笏懌楳nvme0n1p14 259:2    0    4M  0 part
笏懌楳nvme0n1p15 259:3    0  106M  0 part /boot/efi
笏披楳nvme0n1p16 259:4    0  913M  0 part /boot
```

```bash
systemctl status sshd
笳・sshd.service - OpenSSH server daemon
     Loaded: loaded (/usr/lib/systemd/system/sshd.service; enabled; preset: enabled)
     Active: active (running) since Sun 2026-03-20 14:18:54 UTC; 1min 12s ago
       Docs: man:sshd(8)
             man:sshd_config(5)
   Main PID: 1553 (sshd)
      Tasks: 1 (limit: 1067)
     Memory: 2.3M
        CPU: 15ms
     CGroup: /system.slice/sshd.service
             笏披楳1553 "sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups"
```

ご覧の通り、罫線やステータスアイコンが文字化けしています。

## 原因

この文字を調べてみたところ、以下の通りでした。

| 本来 | Unicode                                                                         | 文字化け         |
| ---- | ------------------------------------------------------------------------------- | ---------------- |
| `├─` | [U+251C](https://0g0.org/unicode/251C/),[U+2500](https://0g0.org/unicode/2500/) | `笏懌楳`         |
| `└─` | [U+2514](https://0g0.org/unicode/2514/),[U+2500](https://0g0.org/unicode/2500/) | `笏披楳`         |
| `●`  | [U+25CF](https://0g0.org/unicode/25CF/)                                         | `笳`(末尾不正) |

以上から、今回の文字化けはUTF-8 の文字列が CP932（Shift_JIS 系）として誤って解釈されたことで発生していると考えられます。

つまり、SSM 経由で受け取った文字列と Git Bash 側のコンソールのページ文字コード設定が一致しておらず、その結果として罫線や記号が正しく表示されなかった、という状況です。

## Git Bash側の設定確認と暫定対処

### Git Bashの現在の設定を確認する

今回の環境では、`chcp.com` の結果は CP932 でした。

自身のGit Bashの現在の設定を確認したい場合は以下のコマンドで確認できます。

```bash
chcp.com
現在のコード ページ: 932
```

### 暫定対処: コンソールの文字コードをUTF-8に変更する

:::info
まずは `session-manager-plugin` を最新版へ更新し、改善することを確認してください。  
ここで紹介する方法は、プラグインを更新できない場合の暫定対処です。
:::

最新版のダウンロードができない・インストールに制約がある環境の方は以下の通り、現在のページのコードをUTF-8へ変更するコマンドを試してみてください。

```bash
chcp.com 65001
Active code page: 65001
```

:::column なぜchcp.comなのか
Git Bash上では単なる`chcp`を認識せず、期待通り動作しません。
これはWindows標準の `C:\Windows\System32\chcp.com`を明示的に呼び出す必要があるためです。
:::

#### 参考情報

- [Git Bash の日本語の文字化けを解消する方法](https://github.com/fs5013-furi-sutao/explain.how_to_fix_garbled_japanese_text.on_gitbash)
- [Qiita: Git Bash で 文字コードを変換する方法（Windows）](https://qiita.com/BlackMagician/items/1de399c5b577f7514de8)
- [Microsoft chcp](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/chcp)
- [Microsoft Code Page Identifiers](https://learn.microsoft.com/en-us/windows/win32/intl/code-page-identifiers)

## 結果

コンソールの文字コードをUTF-8へ変更後に再度確認したところ、文字化けが発生していた箇所が正常に出力されることを確認できました。

```bash
lsblk
NAME         MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
loop0          7:0    0 27.8M  1 loop /snap/amazon-ssm-agent/12322
loop1          7:1    0   74M  1 loop /snap/core22/2339
loop2          7:2    0 48.1M  1 loop /snap/snapd/25935
nvme0n1      259:0    0    8G  0 disk
├─nvme0n1p1  259:1    0    7G  0 part /
├─nvme0n1p14 259:2    0    4M  0 part
├─nvme0n1p15 259:3    0  106M  0 part /boot/efi
└─nvme0n1p16 259:4    0  913M  0 part /boot
```

```bash
systemctl status sshd
● sshd.service - OpenSSH server daemon
     Loaded: loaded (/usr/lib/systemd/system/sshd.service; enabled; preset: enabled)
     Active: active (running) since Sun 2026-03-20 15:22:04 UTC; 33s ago
       Docs: man:sshd(8)
             man:sshd_config(5)
   Main PID: 1549 (sshd)
      Tasks: 1 (limit: 1067)
     Memory: 2.3M
        CPU: 15ms
     CGroup: /system.slice/sshd.service
             └─1549 "sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups"
```

## 設定の恒久化

毎回コードページを変更するのが面倒な場合は、`.bashrc` に設定しておくことで Git Bash 起動時に自動で UTF-8 に切り替えられます。

```bash
echo 'chcp.com 65001 > /dev/null' >> ~/.bashrc
```

## まとめ

今回は、Git Bash で SSM を利用した際に発生する文字化けの原因と対処方法を紹介しました。

ポイントをまとめると、次の通りです。

- まずは`session-manager-plugin`を最新版へ更新する
- 古いプラグインを使っている場合、Git Bash側のページ文字コードが原因で文字化けすることがある
- 更新できない環境では、`chcp.com 65001`によるUTF-8化が有効
- 継続利用する場合は `.bashrc`への設定で恒久化できる

これまでは文字化けが起きても、表示が崩れた部分を手で読み替えながら対応していました。

最近は EC2 周りの作業が増え、文字化けに遭遇する頻度も高くなったため、あらためて対処方法を調べることにしました。

皆様のお役に立てれば幸いです。

最後までご覧いただきありがとうございました。
