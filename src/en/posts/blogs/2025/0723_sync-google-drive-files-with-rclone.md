---
title: rclone - Sync Cloud Storage Files via CLI (Google Drive Edition)
author: masahiro-kondo
date: 2025-07-23T00:00:00.000Z
tags:
  - rclone
  - tools
image: true
translate: true

---

## Introduction
Recently, I needed to periodically sync a specific folder in Google Drive to another location. At first, I thought about writing a script with GAS (Google Apps Script), but after some research I discovered a tool called rclone. It seemed like I could easily sync in an rsync-like manner using this tool, so I decided to give it a try.

- [Rclone](https://rclone.org/)

To cut to the chase, once configured, you can sync to your local machine by specifying the Google Drive folder ID with the following command (and conversely sync to the remote as well).

```shell
rclone sync mydrive: ./foo \
   --drive-root-folder-id ************************* \
```

## What is rclone
rclone is a general-purpose CLI tool written in Go for syncing files with cloud storage. Binaries are provided for various platforms including Linux, macOS, and Windows, and it supports over 70 cloud storage services, not just Google Drive.

Not only can you use it in the shell, but you can also run it as an HTTP server to host a REST API.

Looking at the GitHub repository, there are over 800 contributors, so it seems to be actively developed.

@[og](https://github.com/rclone/rclone)

## Installation
- [Install](https://rclone.org/install/)

On macOS, you can also install via Homebrew.

```shell
brew install rclone
```

## Setup for Google Drive
- [Google drive](https://rclone.org/drive/)

We'll configure it interactively using rclone config.

```shell
rclone config
```

Since we're creating a new remote, type `n` and press Enter.

```shell
2025/07/16 13:05:55 NOTICE: Config file "/Users/kondoh/.config/rclone/rclone.conf" not found - using defaults
No remotes found, make a new one?
n) New remote
s) Set configuration password
q) Quit config
n/s/q>  # type n and press Enter
```

Give the remote configuration a name. Here, I used `mydrive`.

```shell
Enter name for new remote.
name>  # enter a name, e.g. mydrive
```

Select the storage type from the list. Google Drive was number 22. Enter `22` or `Google Drive` and press Enter.

```shell
Option Storage.
Type of storage to configure.
Choose a number from below, or type in your own value.
 1 / 1Fichier
   \ (fichier)
 2 / Akamai NetStorage
   \ (netstorage)
   :
Storage>  # enter the listed number or Google Drive
```

It will ask for a Google Application Client ID. We won't use one this time, so leave it blank and press Enter.

```shell
Option client_id.
Google Application Client Id
Setting your own is recommended.
See https://rclone.org/drive/#making-your-own-client-id for how to create your own.
If you leave this blank, it will use an internal key which is low performance.
Enter a value. Press Enter to leave empty.
client_id>  # leave blank and press Enter
```

It will ask for an OAuth Client Secret. We won't use one this time, so leave it blank and press Enter.

```shell
Option client_secret.
OAuth Client Secret.
Leave blank normally.
Enter a value. Press Enter to leave empty.
client_secret>  # leave blank and press Enter
```

It will ask for a scope. Since we only need download access this time, `Read-only access` is sufficient, so enter `2` and press Enter.

```shell
Option scope.
Comma separated list of scopes that rclone should use when requesting access from drive.
Choose a number from below, or type in your own value.
Press Enter to leave empty.
 1 / Full access all files, excluding Application Data Folder.
   \ (drive)
 2 / Read-only access to file metadata and file contents.
   \ (drive.readonly)
 3 | Access to files created by rclone only.
   | These are visible in the drive website.
   | File authorization is revoked when the user deauthorizes the app.
   \ (drive.file)
 4 / Allows read and write access to the Application Data folder.
   \ (drive.appfolder)
 5 / Allows read-only access to file metadata but
   \ (drive.metadata.readonly)
scope>  # enter the required scope number
```

It will ask for a Google Cloud Service Account Credentials JSON file path. We won't use it this time, so leave it blank and press Enter.

```shell
Option service_account_file.
Service Account Credentials JSON file path.
Leave blank normally.
Needed only if you want use SA instead of interactive login.
Leading `~` will be expanded in the file name as will environment variables such as `${RCLONE_CONFIG_DIR}`.
Enter a value. Press Enter to leave empty.
service_account_file>  # leave blank and press Enter if not using SA
```

It will ask if you want to edit advanced config. We won't, so press Enter to skip.

```shell
Edit advanced config?
y) Yes
n) No (default)
y/n>  # press Enter to skip advanced config
```

It will ask if you want to use a web browser to automatically authenticate rclone with your Google account. The default is Yes, so press Enter to authenticate via browser.

```shell
Use web browser to automatically authenticate rclone with remote?
 * Say Y if the machine running rclone has a web browser you can use
 * Say N if running rclone on a (remote) machine without web browser access
If not sure try Y. If Y failed, try N.

y) Yes (default)
n) No
y/n>  # press Enter to authenticate via browser
```

After the following messages, the browser will open automatically. If your default browser isn't logged into your Google account, you can manually open the URL shown in the message (in the example below, 127.0.0.1:53682).

```shell
2025/06/16 13:20:52 NOTICE: Make sure your Redirect URL is set to "http://127.0.0.1:53682/" in your custom config.
2025/06/16 13:20:52 NOTICE: If your browser doesn't open automatically go to the following link: http://127.0.0.1:53682/auth?state=Az0tpk3imw8yP-UJ34bpJA
2025/06/16 13:20:52 NOTICE: Log in and authorize rclone for access
2025/06/16 13:20:52 NOTICE: Waiting for code...
2025/06/16 13:21:30 NOTICE: Got code
```

![Authenticate rclone](https://i.gyazo.com/38608787df210e78d5d4151e3d7472b2.png)

Click "Continue", and once you see the Success message, authentication is complete.

![Success](https://i.gyazo.com/b89d27b8275d6969de7558134a12625b.png)

Next, it will ask about configuring a Shared Drive (Team Drive). Press Enter to skip.

```shell
Configure this as a Shared Drive (Team Drive)?

y) Yes
n) No (default)
y/n>  # press Enter to skip
```

Once configuration is complete, the OAuth2 access token and refresh token are displayed. On macOS, these are saved to `~/.config/rclone/rclone.conf`.

```shell
Configuration complete.
Options:
- type: drive
- scope: drive.readonly
- token: {"access_token":"xxxxxxxxx","token_type":"Bearer","refresh_token":"************","expiry":"2025-07-16T14:21:29.59725+09:00"}
- team_drive:
```

It will ask if you want to keep, edit, or delete this "mydrive" remote. We'll keep it, so press Enter.

```shell
Keep this "mydrive" remote?
y) Yes this is OK (default)
e) Edit this remote
d) Delete this remote
y/e/d>  # press Enter to keep
```

The configuration named mydrive has been created, so press q to quit.

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
e/n/d/r/c/s/q>  # press q to quit
```

That's it for the Google Drive setup.

:::info
Here, we configured OAuth2, but if authentication fails due to environmental issues like firewalls, you can also create and use a dedicated Service Account (SA) in the Google Cloud Console (this is what we skipped above). However, you need to share the target files or folders with the SA, and it may not be available depending on your organization's domain policies.
Also, if your domain policy prohibits the use of the Drive API, you won't be able to run rclone at all.
:::

## Testing Connection to Google Drive
This command lists directories by specifying the remote configuration name mydrive. For Google Drive, it retrieves one level of directories under My Drive. To retrieve recursively, specify `-R`.

```shell
rclone lsd mydrive:
```

On my company's Google Drive, I got something like this:

```text
           0 2025-03-03 14:53:31        -1 Google AI Studio
           0 2025-06-23 17:47:11        -1 Meet Recordings
           0 2015-07-07 07:38:55        -1 PreSales
           0 2015-09-08 00:07:01        -1 Projects
           0 2016-01-24 07:47:45        -1 books
           0 2022-12-27 09:37:35        -1 Developer Site
           0 2014-05-29 08:40:18        -1 Administrative Tasks
           0 2018-11-26 04:21:22        -1 Internal Documents
```

By specifying the folder ID with `--drive-root-folder-id`, you can list the contents of any folder. For Google Drive, the URL follows the format `https://drive.google.com/drive/u/1/folders/<folderID>`, so by specifying as follows, you can retrieve a list of files excluding directories.

```shell
rclone ls mydrive: --drive-root-folder-id <folderID>
```

By default, it will list all files recursively, so you can specify depth with `--max-depth` as needed.

```shell
rclone ls mydrive:  --max-depth 1 --drive-root-folder-id <folderID>
```

If you specify the "Developer Site" folder, you will see that it contains Excel files for aggregating past event data.

```text
       -1 Reactions on X for the 2024 Spring New Employee Series.xlsx
       -1 Advent Calendar 2022 Article Impressions.xlsx
       -1 Mamezou Developer Site Aggregation.xlsx
```

## Copying Files from Google Drive
- [rclone copy](https://rclone.org/commands/rclone_copy/)

To specify a folder and download while displaying progress in real time, use the following command.

```shell
rclone copy mydrive: dest \
  --drive-root-folder-id <folderID> \
  --progress
```

Running by specifying the Developer Site folder.

```shell
rclone copy mydrive: ./analytics \
   --drive-root-folder-id ************************* \
   --progress
```

The download will proceed with real-time progress display.

```text
Transferred:   	  399.134 KiB / 399.134 KiB, 100%, 28.509 KiB/s, ETA 0s
Checks:                 0 / 0, -, Listed 43
Transferred:           52 / 61, 85%
Elapsed time:        14.5s
Transferring:
 * X-Analytics/tweet_acti…240401_20240501_ja.csv: transferring
 * X-Analytics/tweet_acti…240501_20240601_ja.csv: transferring
 * X-Analytics/tweet_acti…40501_20240601_ja.xlsx: transferring
 * X-Analytics/X Posting Analytics October 2024.xlsx: transferring
```

## Syncing Files with Google Drive
To use it like rsync, use the sync subcommand.

- [rclone sync](https://rclone.org/commands/rclone_sync/)

If you want to sync to a local folder, just replace copy with sync. On the first run, it will fetch everything, just like copy.

```shell
rclone sync mydrive: ./analytics \
   --drive-root-folder-id ************************* \
   --progress
```

Since it's everything, it took 32.2s.

```text
Transferred:   	  467.332 KiB / 467.332 KiB, 100%, 18.135 KiB/s, ETA 0s
Checks:                 0 / 0, -, Listed 43
Transferred:           68 / 68, 100%
Elapsed time:        32.2s
```

I updated one file on the drive side and reran the rsync. Only the updated file was downloaded, and it completed in 2.1s.

```text
Transferred:   	   15.388 KiB / 15.388 KiB, 100%, 0 B/s, ETA -
Checks:                42 / 42, 100%, Listed 86
Transferred:            2 / 2, 100%
Elapsed time:         2.1s
```

## Retrieving Metadata
As mentioned above, each Google Drive file and folder has its own ID, which can be referenced via URL. However, files downloaded with copy or sync don't include this metadata, so you can't link them to their URLs. It seems best to separately obtain this with the lsjson subcommand and associate them by Path.

- [rclone lsjson](https://rclone.org/commands/rclone_lsjson/)

```shell
rclone lsjson mydrive: \
   --drive-root-folder-id ******************* | jq -r
```

You can then get, for each file Path, fields like MimeType, creation time, whether it's a directory, and the ID used in the URL, like this:

```json
[
  {
    "Path": "Reactions on X for the 2024 Spring New Employee Series.xlsx",
    "Name": "Reactions on X for the 2024 Spring New Employee Series.xlsx",
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
    "Path": "Advent Calendar 2022 Article Impressions.xlsx",
    "Name": "Advent Calendar 2022 Article Impressions.xlsx",
    "Size": -1,
    "MimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ModTime": "2022-12-27T05:06:50.943Z",
    "IsDir": false,
    "ID": "********************************************"
  },
  {
    "Path": "Mamezou Developer Site Aggregation.xlsx",
    "Name": "Mamezou Developer Site Aggregation.xlsx",
    "Size": -1,
    "MimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ModTime": "2025-07-22T13:37:01.116Z",
    "IsDir": false,
    "ID": "********************************************"
  }
]
```

## Conclusion
That was an introduction to syncing Google Drive with rclone. This time we only covered downloading, but you can of course upload as well. You can easily use it to back up local files to cloud storage (and encrypt them) on a schedule. You can also run it with the `--dry-run` option to test before actually modifying files.

I think it's also useful for use cases like syncing Google Drive data with metadata in a CI pipeline.
