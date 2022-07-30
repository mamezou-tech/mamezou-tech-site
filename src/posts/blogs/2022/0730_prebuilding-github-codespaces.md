---
title: GitHub Codespaces の Prebuilding で開発環境をカスタマイズして共有する
author: masahiro-kondo
tags: [GitHub, Codespaces, vscode]
date: 2022-07-30
---

先月 GitHub Codespaces の Prebuilding が GA になりました。

[Prebuilding codespaces is generally available | The GitHub Blog](https://github.blog/2022-06-15-prebuilding-codespaces-is-generally-available/)

先日の「[GitHub Codespaces を使いはじめる](/blogs/2022/05/18/start-using-codespaces/)」の記事では、Microsoft の Linux Universal のコンテナイメージをそのまま使用しました(というかそれ以外の選択肢がなかった)。起動後に VS Code の設定を変えたり、拡張をインストールしたりしても、環境を破棄すると再度同じ設定操作が必要になります。チーム開発で共通の設定を施した環境を提供するということもできません。

Prebuilding を使うと、必要な設定が完了した Codespaces のイメージを保存しておき、新規の Codespaces 起動時に利用することが可能です。

:::alert
残念ながら、Prebuilding は個人アカウントでは使用できません。GitHub Enterprise Cloud と GitHub Team プランで利用可能です。
:::

:::info
ローカルの Docker 環境で動作する VS Code の Remote Containers の場合、独自のベースイメージの使用や設定の保存が可能です。Codespaces の prebuilding でも同じ方式が採用されています。
:::

ドキュメントに従って設定していきます。

[Configuring prebuilds | GitHub Docs](https://docs.github.com/en/codespaces/prebuilding-your-codespaces/configuring-prebuilds)

まず、オーガニゼーションの Settings で Codespaces を利用できるようにします。デフォルトでは無効化されているため、指定のユーザーに許可するか、全ユーザーに許可するかを選択します。指定のユーザーに許可する場合は、許可するユーザーを追加する操作が必要です[^1]。

[^1]: 読者がオーガニゼーションの管理者でない場合は、管理者に作業を依頼する必要があります。

![Organization の Codespaces User permissions 設定](https://i.gyazo.com/934aaaa39ba7993170a8d1fc2d95bc1a.png)

次に、対象のリポジトリで Codespaces の `Set up prebuild` をクリックして設定を行います。

![リポジトリの Codespaces 設定1](https://i.gyazo.com/e1c3a9f6819eabe1cb71e3140bff0a35.png)

対象のブランチを指定します。ブランチ別に Prebuilding の設定を登録可能です。

Access and cost control セクションで Prebuild triggers を指定します。Prebuild では独自のコンテナをビルドするため、トリガーの設定は GitHub の課金を節約するために重要です。デフォルトでは、`Every push` になっていますが、`On configuration change` がよいでしょう。push のたびにビルドが走るとコストが高くなってしまいます。

`Region availability` も、開発拠点がグローバルに分散されていない限りは特定の Region でよいでしょう。

![リポジトリの Codespaces 設定2](https://i.gyazo.com/2d851b1c45407e74577caac28db457e3.png)

設定すると、初回のビルドが開始されます。

![Prebuild 実行中](https://i.gyazo.com/8d1db5d3018679a16c0704132fcf10fd.png)

ビルドは GitHub Actions が利用されます。ワークフローファイルの作成は不要で、GitHub 側で管理するワークフローです。

![Prebuild GitHub Actions1](https://i.gyazo.com/a42a0017701f5878c34bacddb04b41a1.png)

ワークフローのステップが全て成功すれば prebuild は完了です。

![Prebuild GitHub Actions2](https://i.gyazo.com/9202189c757594f25adfefd42687c016.png)

:::info
Create Template と Upload Template のステップで Codespace のコンテナイメージがビルド、push されます。オーガニゼーションの Container Registry に登録されるわけではなく、GitHub で管理されるようです。
:::

対象リポジトリで、Codespace を作成します。

![Codespaces を起動](https://i.gyazo.com/643961f93168b9fbe0834390dd83971f.png)

Prebuild された Codespace が検出され、セットアップが実行されます。

![Prebuild で起動](https://i.gyazo.com/b262cfb65e3e29d3f06af23839287429.png)

これで Prebuild された環境が利用可能になります。この時点では特にカスタマイズを施していないため、起動した Codespace の環境で設定していきます。具体的には、devcontainer.json と Dockerfile を作成するのですが、コマンドパレットから、UI で選択していくと自動生成してくれるので、残りの設定をエディタ上で追加すれば OK です。

まず、コマンドパレットから、`Codespaces: Add Development Container Configuration Files...` を選択し実行。

![コマンドパレットから devcontainer.json を作成](https://i.gyazo.com/144e41be711e61ad7f069fd4c49a0123.png)

対象のリポジトリに必要な環境を選択します。今回は Go の CLI のリポジトリなので、 `Go` を選択しました。

![Go 環境を選択](https://i.gyazo.com/6998c2b377e7091fbb75ac36ce21bb97.png)

次に使用するベースイメージを選択します。デフォルトでは Debian の Bullseye ベースの 1-bullseye です。Go の v1 の最新版が使えれば良いのでデフォルトのままとしました。プロジェクトで使用するバージョンが決まっていれば、より細かいバージョンを指定するとよいでしょう。

![ベースイメージの選択](https://i.gyazo.com/56fd852ca6fc900c6a93f4ac8d9df840.png)

次に、インストールする各種 CLI の選択です。使用したいものを適宜選択します。

![インストールする CLI を選択](https://i.gyazo.com/2a427463fdcabaeab15ec19f022670ab.png)

`OK` をクリックすると `.devcontainer` ディレクトリに `devcontainer.json` と `Dockerfile` が生成されます。

![生成された devcontainer.json](https://i.gyazo.com/e5b81c80add6308239266f8e0b0d6359.png)

生成したファイルを commit / push すると、再び GitHub Actions の prebuild ワークフローが実行され、Codespace のイメージが更新されます。

![devcontainer.json をコミット](https://i.gyazo.com/a95650d420bc327784551b0d3fa646ef.png)

初期状態では Codespace の VS Code の画面は Light テーマだったり、ミニマップが出ていたりしますし、Go の拡張もインストールされていません。

devcontainer.json を生成すると、`vscode/extensions` に拡張の設定は入りますので、必要に応じて追加します。`vscode/settings` にも使用したい設定を追加します。以下では、ミニアップを非表示にし、テーマを Dark+ にしたりしています。

```json
	"customizations": {
		// Configure properties specific to VS Code.
		"vscode": {
			// Set *default* container specific settings.json values on container create.
			"settings": { 
				"go.toolsManagement.checkForUpdates": "local",
				"go.useLanguageServer": true,
				"go.gopath": "/go",
				"editor.minimap.enabled": false,
				"workbench.colorTheme": "Default Dark+"
			},
			
			// Add the IDs of extensions you want installed when the container is created.
			"extensions": [
				"golang.Go"
			]
		}
	},
```

変更を commit / push すると、prebuild のワークフローが実行され、Codespace のイメージが更新されます。以上で、当該リポジトリを使う開発者が自分の Codespace を作成し起動した時点から、ダークテーマでミニマップ非表示、Go 拡張インストール済みの Codespace が利用可能になります。

![設定ずみの Codespace](https://i.gyazo.com/c79947a24d503934a30fcb78c3ae613c.png)

コンテナが作成された後に実行するコマンドなども指定できます。詳しくは VS Code のドキュメントを参照してください。

[devcontainer.json reference](https://code.visualstudio.com/docs/remote/devcontainerjson-reference)

以上のように、Prebuilding を利用すると、初期起動時の設定をカスタマイズして保存でき、開発チームのメンバーの環境構築を高速化できます。イメージやワークフローの管理も全て GitHub にお任せのフルマネージド環境です。

プロジェクトへの新規参画者のブートストラップにも役立ちそうです。

:::info
この記事を書いている時に、Prebuilding がマルチリポジトリやモノレポをサポートしたというアナウンスがありました。

[Prebuilding codespaces is now supported for multi-repository and monorepo projects | GitHub Changelog](https://github.blog/changelog/2022-07-28-prebuilding-codespaces-is-now-supported-for-multi-repository-and-monorepo-projects/)

モノレポで異なるチームが異なる設定で作業したいケースもサポートされるようです。
:::
