---
title: rclone - 在 CLI 中同步云存储文件 (Google Drive 篇)
author: masahiro-kondo
date: 2025-07-23T00:00:00.000Z
tags:
  - rclone
  - tools
image: true
translate: true

---

## 介绍
最近有这样的需求：定期将 Google Drive 上的特定文件夹同步到其他位置。最初我想用 GAS（Google App Script）编写脚本，但一查发现有一个名为 rclone 的工具。用它就能像 rsync 那样轻松同步，于是试了一下。

- [Rclone](https://rclone.org/)

先说结论，只要配置好，执行以下命令并指定 Google Drive 的文件夹 ID，就可以同步到本地（反过来也可以同步到远程）。

```shell
rclone sync mydrive: ./foo \
   --drive-root-folder-id ************************* \
```

## 什么是 rclone
rclone 是一个用 Go 编写的通用 CLI 工具，用于同步云存储文件。它在 Linux、macOS、Windows 等各个平台上都提供了二进制文件，不仅支持 Google Drive，还支持 70 多种云存储服务。

除了可以在 shell 中使用，还可以作为 HTTP Server 启动，托管 REST API。

从 GitHub 仓库看，贡献者超过 800 人，开发相当活跃。

@[og](https://github.com/rclone/rclone)

## 安装
- [Install](https://rclone.org/install/)

在 macOS 上也可以通过 Homebrew 安装。

```shell
brew install rclone
```

## Google Drive 的设置
- [Google drive](https://rclone.org/drive/)

使用 `rclone config` 进行交互式设置。

```shell
rclone config
```

由于要新建 remote 设置，输入 `n` 并按 Enter。

```shell
2025/07/16 13:05:55 NOTICE: Config file "/Users/kondoh/.config/rclone/rclone.conf" not found - using defaults
No remotes found, make a new one?
n) New remote
s) Set configuration password
q) Quit config
n/s/q>  # 输入 n 并按 Enter
```

给 remote 设置一个名称，这里我们命名为 `mydrive`。

```shell
Enter name for new remote.
name>  # 输入 mydrive 等名称
```

从列表中选择要配置的存储类型。Google Drive 为 22，输入 `22` 或 `Google Drive` 并按 Enter。

```shell
Option Storage.
Type of storage to configure.
Choose a number from below, or type in your own value.
 1 / 1Fichier
   \ (fichier)
 2 / Akamai NetStorage
   \ (netstorage)
   :
Storage>  # 输入列表中的编号或 Google Drive
```

系统会询问 Google Application 的 Client ID。如果不使用，可留空按 Enter。

```shell
Option client_id.
Google Application Client Id
Setting your own is recommended.
See https://rclone.org/drive/#making-your-own-client-id for how to create your own.
If you leave this blank, it will use an internal key which is low performance.
Enter a value. Press Enter to leave empty.
client_id> # 留空并按 Enter
```

接着询问 Client Secret，同样留空按 Enter。

```shell
Option client_secret.
OAuth Client Secret.
Leave blank normally.
Enter a value. Press Enter to leave empty.
client_secret> # 留空并按 Enter
```

选择访问范围。这里只需要下载权限，选择 `Read-only access`，输入 `2` 并按 Enter。

```shell
Option scope.
Comma separated list of scopes that rclone should use when requesting access from drive.
Choose a number from below, or type in your own value.
Press Enter to leave empty.
 1 / Full access all files, excluding Application Data Folder.
   \ (drive)
 2 / Read-only access to file metadata and file contents.
   \ (drive.readonly)
   / Access to files created by rclone only.
 3 | These are visible in the drive website.
   | File authorization is revoked when the user deauthorizes the app.
   \ (drive.file)
   / Allows read and write access to the Application Data folder.
 4 | This is not visible in the drive website.
   \ (drive.appfolder)
   / Allows read-only access to file metadata but
 5 | does not allow any access to read or download file content.
   \ (drive.metadata.readonly)
scope>  # 输入所需的范围编号
```

询问是否使用 Google Cloud 的服务账号。如果不使用，留空按 Enter。

```shell
Option service_account_file.
Service Account Credentials JSON file path.
Leave blank normally.
Needed only if you want use SA instead of interactive login.
Leading `~` will be expanded in the file name as will environment variables such as `${RCLONE_CONFIG_DIR}`.
Enter a value. Press Enter to leave empty.
service_account_file> # 不使用 SA 时留空并按 Enter
```

是否编辑高级设置？不需要的话留空按 Enter。

```shell
Edit advanced config?
y) Yes
n) No (default)
y/n> # 不需要高级设置时留空并按 Enter
```

是否使用浏览器自动以 Google 账号认证 rclone？默认 Yes，留空按 Enter。

```shell
Use web browser to automatically authenticate rclone with remote?
 * Say Y if the machine running rclone has a web browser you can use
 * Say N if running rclone on a (remote) machine without web browser access
If not sure try Y. If Y failed, try N.

y) Yes (default)
n) No
y/n>  # 使用浏览器认证时留空并按 Enter
```

之后会出现以下消息，并自动打开浏览器。如果默认浏览器未登录 Google 账号，可手动访问消息中的 URL（例如以下示例中的 127.0.0.1:53682）。

```shell
2025/06/16 13:20:52 NOTICE: Make sure your Redirect URL is set to "http://127.0.0.1:53682/" in your custom config.
2025/06/16 13:20:52 NOTICE: If your browser doesn't open automatically go to the following link: http://127.0.0.1:53682/auth?state=Az0tpk3imw8yP-UJ34bpJA
2025/06/16 13:20:52 NOTICE: Log in and authorize rclone for access
2025/06/16 13:20:52 NOTICE: Waiting for code...
2025/06/16 13:21:30 NOTICE: Got code
```

![Authenticate rclone](https://i.gyazo.com/38608787df210e78d5d4151e3d7472b2.png)

点击“继续”，出现 Success 即表示认证完成。

![Success](https://i.gyazo.com/b89d27b8275d6969de7558134a12625b.png)

接下来询问是否配置为共享盘（Team Drive），不需配置则留空按 Enter。

```shell
Configure this as a Shared Drive (Team Drive)?

y) Yes
n) No (default)
y/n>  # 留空并按 Enter
```

设置完成后会显示 OAuth2 的 access token 和 refresh token。在 macOS 上，这些信息保存在 `~/.config/rclone/rclone.conf` 中。

```shell
Configuration complete.
Options:
- type: drive
- scope: drive.readonly
- token: {"access_token":"xxxxxxxxx","token_type":"Bearer","refresh_token":"************","expiry":"2025-07-16T14:21:29.59725+09:00"}
- team_drive:
```

系统会询问是否保留该 remote，留空按 Enter 即可。

```shell
Keep this "mydrive" remote?
y) Yes this is OK (default)
e) Edit this remote
d) Delete this remote
y/e/d>  # 留空并按 Enter
```

然后用 `q` 退出配置菜单。

```shell
Current remotes:

Name                 Type
====                 ====
mydrive              drive

e) Edit existing remote
n) New remote
d) Delete remote
r) Rename remote
c) Copy remote
s) Set configuration password
q) Quit config
e/n/d/r/c/s/q>  # 输入 q 退出
```

至此，Google Drive 的设置完成。

:::info
这里使用了 OAuth2 设置，但如果因防火墙等环境问题无法通过认证，也可以在 Google Cloud Console 中创建专用服务账号（SA）并使用（上述设置中留空跳过的选项）。不过需要将目标文件或文件夹共享给 SA，且在某些组织域策略下可能无法使用。
另外，如果域策略禁止使用 Drive API，则无法执行 rclone。
:::

## 测试连接 Google Drive
使用 remote 名称 `mydrive`，获取目录列表。对于 Google Drive，会获取到我的云盘下一层的目录。如需递归获取，添加 `-R` 参数。

```shell
rclone lsd mydrive:
```

在公司 Google Drive 上得到以下结果。

```
           0 2025-03-03 14:53:31        -1 Google AI Studio
           0 2025-06-23 17:47:11        -1 Meet Recordings
           0 2015-07-07 07:38:55        -1 PreSales
           0 2015-09-08 00:07:01        -1 Projects
           0 2016-01-24 07:47:45        -1 books
           0 2022-12-27 09:37:35        -1 开发者网站
           0 2014-05-29 08:40:18        -1 事务处理
           0 2018-11-26 04:21:22        -1 内部资料
```

通过 `--drive-root-folder-id` 指定文件夹 ID，即可获取任意文件夹下的列表。Google Drive 的 URL 格式为 `https://drive.google.com/drive/u/1/folders/<文件夹ID>`，按以下方式指定后，可以获取除目录外的文件列表。

```shell
rclone ls mydrive: --drive-root-folder-id <文件夹ID>
```

默认会递归列出所有文件，如需限制深度，可用 `--max-depth` 参数。

```shell
rclone ls mydrive: --max-depth 1 --drive-root-folder-id <文件夹ID>
```

指定“开发者网站”文件夹后，可看到里面存放了用于历史活动统计的 Excel 文件。

```
       -1 2024春季新人系列在X上的反应.xlsx
       -1 2022年降临节日历各文章印象.xlsx
       -1 is开发者网站汇总.xlsx
```

## 从 Google Drive 复制文件
- [rclone copy](https://rclone.org/commands/rclone_copy/)

指定文件夹并实时显示进度下载，可按如下操作：

```shell
rclone copy mydrive: dest \
  --drive-root-folder-id <文件夹ID> \
  --progress
```

指定“开发者网站”文件夹并执行：

```shell
rclone copy mydrive: ./analytics \
   --drive-root-folder-id ************************* \
   --progress
```

下载会实时显示进度并执行。

```
Transferred:   	  399.134 KiB / 399.134 KiB, 100%, 28.509 KiB/s, ETA 0s
Checks:                 0 / 0, -, Listed 43
Transferred:           52 / 61, 85%
Elapsed time:        14.5s
Transferring:
 * X-Analytics/tweet_acti…240401_20240501_ja.csv: transferring
 * X-Analytics/tweet_acti…240501_20240601_ja.csv: transferring
 * X-Analytics/tweet_acti…40501_20240601_ja.xlsx: transferring
 *           X-Analytics/X投稿アナリティクス2024年10月.xlsx: transferring
```

## 与 Google Drive 同步文件
要像 rsync 一样使用，请使用子命令 sync。

- [rclone sync](https://rclone.org/commands/rclone_sync/)

如果要同步到本地文件夹，只需将 copy 替换为 sync。首次同步与 copy 相同，获取所有文件。

```shell
rclone sync mydrive: ./analytics \
   --drive-root-folder-id ************************* \
   --progress
```

因为是全量同步，耗时 32.2 秒。

```
Transferred:   	  467.332 KiB / 467.332 KiB, 100%, 18.135 KiB/s, ETA 0s
Checks:                 0 / 0, -, Listed 43
Transferred:           68 / 68, 100%
Elapsed time:        32.2s
```

我更新了云端的一个文件，然后再次执行 rsync。只有更新的文件被下载，2.1 秒完成。

```
Transferred:   	   15.388 KiB / 15.388 KiB, 100%, 0 B/s, ETA -
Checks:                42 / 42, 100%, Listed 86
Transferred:            2 / 2, 100%
Elapsed time:         2.1s
```

## 获取元信息
如前所述，Google Drive 的文件或文件夹都有各自的 ID，可通过 URL 引用。但通过 copy 或 sync 下载的文件没有此类元信息，无法与 URL 关联。使用子命令 lsjson 可单独获取元信息，并通过 Path 进行关联。

- [rclone lsjson](https://rclone.org/commands/rclone_lsjson/)

```shell
rclone lsjson mydrive: \
   --drive-root-folder-id ******************* | jq -r
```

如下所示，可按文件的 Path 获取 MimeType、创建时间、是否目录、用于 URL 的 ID 等信息。

```json
[
  {
    "Path": "2024春季新人系列在X上的反应.xlsx",
    "Name": "2024春季新人系列在X上的反应.xlsx",
    "Size": -1,
    "MimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ModTime": "2024-07-01T03:07:31.075Z",
    "IsDir": false,
    "ID": "********************************************"
  },
  {
    "Path": "X-Analytics",
    "Name": "X-Analytics",
    "Size": 0,
    "MimeType": "inode/directory",
    "ModTime": "2023-10-01T01:40:16.756Z",
    "IsDir": true,
    "ID": "********************************************"
  },
  {
    "Path": "2022年降临节日历各文章印象.xlsx",
    "Name": "2022年降临节日历各文章印象.xlsx",
    "Size": -1,
    "MimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ModTime": "2022-12-27T05:06:50.943Z",
    "IsDir": false,
    "ID": "********************************************"
  },
  {
    "Path": "is开发者网站汇总.xlsx",
    "Name": "is开发者网站汇总.xlsx",
    "Size": -1,
    "MimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ModTime": "2025-07-22T13:37:01.116Z",
    "IsDir": false,
    "ID": "********************************************"
  }
]
```

## 最后
以上是使用 rclone 同步 Google Drive 的方法介绍。这次只演示了下载，当然也可以上传。定期将本地文件备份到云存储（并进行加密）等用法也很简单。使用 `--dry-run` 选项可以在实际操作文件前进行测试。

我认为在 CI 管道中与元数据一起同步 Google Drive 数据等用例也非常有效。
