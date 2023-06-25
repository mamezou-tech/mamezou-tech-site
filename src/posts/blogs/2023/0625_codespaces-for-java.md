---
title: GitHub CodespacesでJavaの開発環境を作ったらスゴすぎて未来を感じた
author: toshio-ogiwara
date: 2023-06-25
tags: [GitHub, Codespaces, java]
---
GitHub Codespacesで大勢に使ってもらうJavaの開発環境を整備してみたら、想像の斜め上を行く便利さでした。このデベロッパーサイトでもCodespacesを[何回か紹介](/tags/codespaces/)してきましたが、今回は複数人で使う開発環境としてCodespacesを使うとどのような点が便利か、そしてそれをどうセットアップするのかなど、個人でなく複数人で使う場合の側面からCodespacesを紹介したいと思います。


:::info:お試し環境の紹介
今回紹介するJavaの環境は[こちらのリポジトリ](https://github.com/extact-io/codespaces-sample)にコミットしてあるため実際にCodespacesで使うこともできます。動作確認用のアプリには[HelidonのHelidon MP Quickstart Example](https://helidon.io/docs/v3/#/mp/guides/quickstart)を使っています。Codespaces上でアプリのビルドや実行を行いたい場合はリポジトリのREADMEを参照ください。簡単に動作させることができCodespacesの特徴がよく分かります。始め方は[このリポジトリ](https://github.com/extact-io/codespaces-sample)に移動して右上の"<>Code"ボタンをクリックしてCodespacesタブにある次のボタンをポチっとするだけです！是非やってみてください(Codespacesの利用にはGitHubへのSign inは必要になります)。
![cap01](/img/blogs/2023/0625_images/cap_01.drawio.svg)
:::

# 背景
筆者が参画しているプロジェクトでは定期的に勉強会を行っていますが、その際の環境準備が悩みのタネでした。勉強会は業務外で利用するアプリやツールを使うため、業務で利用しているPCを使うことはできません。このため、各個人のPCを使って行うのですが、WindowsやMacは当たり前で、PCあるけど「ディスクの空きがない」という方から「私はiPadで参戦します！」という猛者まで様々で、例えばDockerを使う勉強会では各人にDockerの環境を用意してもらうのはハードルが高いものでした。

また、各人になんとか環境を用意してもらったとしても、WindowsとMacではショートカットが異なっていたり、使うシェルもWindowsのDOSプロンプトだったり、Macのターミナルだったりするため、操作方法を案内するのにも一苦労あったりします。

このようなことから、手軽にかつ無料（もしくは安価）でみんな揃って使える環境があったらなぁとそんな都合がいいようなことを思っていました。

そんなときに浮かんだのがGitHub Codespacesです。

次の勉強会のテーマはJavaとDockerを使うものだったので、さっそくCodespacesでJavaの開発環境を準備してみました。ということで次からはCodespacesの機能や中身について説明していきます。

# ココがいいぞCodespace
細かいことを説明する前にまとめてきな意味で、みんなで使う場合、つまりチーム開発の開発環境としてCodespacesを使う場合の利点を挙げます。

- ブラウザだけでストレスなく開発作業が行える
  - Javaに加えてコンテナも使う場合、開発PCにある程度のスペックが要求されるが、非力なマシンで開発行える
- 環境をボタン一発で作成することができる
  - 従来のようにあっちこっちから色々なものを取ってきてインストールして設定するといったことが不要
- みんな同じ環境・設定で作業することができる
  - ローカルPCを意識することがないためWindowsでもMacでも同じように作業が行える
  - 構成ファイルを起点に環境が作成されるため、構成ファイルを共有することで設定を統一できる
- 開発環境を共有して簡単に共同作業ができる
  - 開発環境の実体はパブリック食らうので

# Codespacesの基礎知識
ここからはそんな素敵な環境の作り方を説明してきますが、その前に前提知識としてCodespacesの動作環境を次の図をもとに簡単に説明します。

![fig01](/img/blogs/2023/0625_images/fig_01.drawio.svg)

codespacesは図からも分かるとおり、後述する構成ファイル(devcontainer.json)をもとに作成されたコンテナイメージから生成されたコンテナインスタンを個別の開発環境としてユーザに提供する機能です。

ユーザはブラウザもしくはローカルのVSCodeから生成されたコンテナインスタンスに接続して作業を行います。目の前にあるブラウザやVSCodeをユーザは操作していますが、リポジトリからチェックアウトしたファイルやJavaのビルドや実行などはすべてGitHub側で動作しているコンテナインスタンス内で存在し、また行われます。なお、今回はブラウザを使った方法を説明します。

:::info: 個人アカウントでも１か月最大60時間無料
Codespacesは個人アカウントでも2コアCPU/4GBメモリのリソースを60時間まで無料で使うことができます。利用できる時間は利用するコア数により変わり4コアCPU/8GBメモリの場合、半分の30時間になります。課金に対する詳しい情報は[こちら](https://docs.github.com/ja/billing/managing-billing-for-github-codespaces/about-billing-for-github-codespaces)を参照ください
:::

# Javaの開発環境の作り方
CodespacesにおけるJavaの開発環境の作り方について、先ほど利点に挙げた点を中心に説明していきます。

:::check: 途中で出てくる案内(Snackbar)は一旦すべて無視する
開発環境が立ち上がった後や何かアクションをした後に次のような案内(Snackbar)は一旦すべて無視し閉じてくだい。
![cap10](/img/blogs/2023/0625_images/cap_10.drawio.svg)
:::

## Codespacesの起動
まずは初期状態の開発環境を作成するところから始めます。開発環境の作成はGitHub リポジトリに移動し、右上の"<>Code"ボタンをクリックし、Codespacesタブにある"Create codespace on main"ボタンをクリックします。

![cap02](/img/blogs/2023/0625_images/cap_02.drawio.svg)

ボタンをクリックすると開発環境のプロビジョニングが開始され、準備ができるとブラウザ内にVSCodeと同じ開発環境がリポジトリをチェックアウト(clone)した状態で立ち上がります。

![cap03](/img/blogs/2023/0625_images/cap_03.drawio.svg)

## ベース環境の準備
リポジトリには開発環境をどのように作成するかの？構成ファイルが含まれていないため、単にスッピンのコンテナを起動しただけにすぎません。このため、Javaのコンパイルや実行を行うJDKやMavenなどの開発に必要なツールがまだ入っていません。

開発に必要なツールを入れるには環境作成のもととなる構成ファイルで必要なツール類を指定する必要があります。ということで、次からは構成ファイルを作成していきます。構成ファイルは手で作成することもできますが、最初はハードルが高いため、ここではウィザード形式で必要なものを指定していく方法を説明します。

ウィザードを開始するには左上のメニューから`表示 > コマンドパレット`を選択してコマンドパレットを出します。

![cap04](/img/blogs/2023/0625_images/cap_04.drawio.svg)

コマンドパレットが現れたら、"codespaces: Add Container Configuration Files.."を選択しします。（>の後にcodespacesと入力すると候補が絞り込まれます。また初回は次の選択に移るまでに少し時間が掛かります）

![cap05](/img/blogs/2023/0625_images/cap_05.drawio.svg)

次にCreateかModifyかの選択を求められるので、今回は新規ですので"Create new Configuration.."を選択します。

![cap06](/img/blogs/2023/0625_images/cap_06.drawio.svg)

次に予め定義されたコンテナ設定から構築する環境を選択する(From a predefined container…)か、それとも既に存在するDockerfileから環境を構築する(From 'Dockerfile')かなどの選択を求められるので予め定義されたコンテナ設定から選択する"From a predefined container configuration definition.."を選択します。

![cap07](/img/blogs/2023/0625_images/cap_07.drawio.svg)

ここからは作成する環境の構成を実際に指定していくのですが、今回は次に示す構成の環境を作ります。
- Java 17 / Maven / Docker

この構成に従い次のように選択していきます選択していきます(※候補をクリックしても反応がない場合は入力エリアでEnterを押すと選択が確定され次に進みます)。

![cap08](/img/blogs/2023/0625_images/cap_08.drawio.svg)(クリックすると拡大します)

すべての選択が完了するとCodespacesにより選択内容を反映した次の構成ファイルが`.devcontainer/devcontainer.json`に作られます。

![cap09](/img/blogs/2023/0625_images/cap_09.drawio.svg)

- devcontainer.json
```json
// For format details, see https://aka.ms/devcontainer.json. For config options, see the
// README at: https://github.com/devcontainers/templates/tree/main/src/java
{
	"name": "Java",
	// Or use a Dockerfile or Docker Compose file. More info: https://containers.dev/guide/dockerfile
	"image": "mcr.microsoft.com/devcontainers/java:1-17-bullseye",

	"features": {
		"ghcr.io/devcontainers/features/java:1": {
			"version": "none",
			"installMaven": "true",
			"installGradle": "false"
		},
		"ghcr.io/devcontainers/features/docker-in-docker:2": {}
	}
  ...
}
```

<br>

devcontainer.jsonを見るとウィザードで何を選択していたのかがより分かるかと思います。

ウィザードで最初に選択していたのはimageプロパティに指定されている開発環境を立ち上げる（復元する）際に使うベースイメージの選択となります[^1]。そして、途中で選択していた、MavenやDocker-in-Dockerはこのベースイメージに追加する機能として	"features"に定義されます。

[^1]: ウィザードでも選択した"17-bullseye"の"-bullseye"はDebianのv11のコードネームになります。したがって、"17-bullseye"はベースイメージがDebian v11のJava17の意味になります。

Codespacesは起動するリポジトリの`.devcontainer/devcontainer.json`をもとにコンテナイメージをbuildし、そのビルドしたイメージをインスタンス化したコンテナを各ユーザの開発開発環境として割り当てます。したがって、私たちが目の前で見ているブラウザの先で動いているものは個人ごとに割り当てられたコンテナとなります。

図

このようにCodespacesでは環境の構成をdevcontainer.jsonで定義し、その定義にしたがったで復元・インスタンス化されたものが各人に割り当てられます。このためリポジトリにコードと一緒に構成ファイルもコミットしておくことで、各開発者は開発に必要な環境一式をボタン一発で素早く手に入れることができます。

## 構成内容の反映(rebuild)
実行環境のもととなるコンテナイメージが再作成されていないため、今はまだdevcontainer.jsonが反映されていません。devcontainer.jsonを反映させるため、開発環境を再作成します。

再作成するには左下のCodespacesメニューをクリックするとコマンドパレットが上部にでてくるので、そこで"rebuild container"を選択します。

![cap11](/img/blogs/2023/0625_images/cap_11.drawio.svg)

すると次にような画面に切り替わりコンテナのビルドが行われます。数分してビルドが完了したら再度VSCodeと同じ画面がブラウザ内に表れます。

![cap12](/img/blogs/2023/0625_images/cap_12.drawio.svg)

### 拡張機能の確認
開発環境が起動したらJavaの環境がインストールされているかを確認しみてます。  

まず拡張機能を見てみると確かにExtension Pack for JavaなどJavaの開発に必要な拡張機能がインストールされているのが分かります。

![cap13](/img/blogs/2023/0625_images/cap_13.drawio.svg)

次にエクスプローラーをみてみると、先ほどまではなかった`JAVA PROJECTS`と`MAVEN`のタブが追加されています。開発環境に未だJavaのプロジェクトとして認識されていないので、"import Projects"ボタンをクリックしてJavaのプロジェクトとして認識させます。

![cap14](/img/blogs/2023/0625_images/cap_14.drawio.svg)

少しすると進行状況を表示するSnackbarが現れたのち、`JAVA PROJECT`タブにプロジェクト情報が反映されます。

![cap15](/img/blogs/2023/0625_images/cap_15.drawio.svg)


### JavaとMavenコマンドの確認
今度はJavaコマンドやMavenコマンドが使えるかをコンソールから確認してみます。

```shell
@extact-io ➜ /workspaces/codespaces-sample (main) $ echo $JAVA_HOME
/usr/lib/jvm/msopenjdk-current
@extact-io ➜ /workspaces/codespaces-sample (main) $ echo $MAVEN_HOME
/usr/local/sdkman/candidates/maven/current
@extact-io ➜ /workspaces/codespaces-sample (main) $ which java
/usr/lib/jvm/msopenjdk-current/bin/java
@extact-io ➜ /workspaces/codespaces-sample (main) $ which mvn
/usr/local/sdkman/candidates/maven/current/bin/mvn
```

JDKやMavenを自分でインストールした場合、環境変数やPATHの設定が地味に面倒だったりしますが、JavaとMavenを起動構成に含めておくだけで、それらをインストールしてくれるだけでなく、環境変数の設定も含めすべて準備万端な状態でセットアップしてくれます。

### Dockerコマンドの確認
最後にDockerコマンドを試してみましょう。Dockerコマンドを使ったビルドやコンテナの実行も次のように問題なく行えます。

```shell
@extact-io ➜ /workspaces/codespaces-sample (main) $ docker build -t helidon-sample .
 => [internal] load build definition from Dockerfile
 => => transferring dockerfile: 839B
 => [internal] load .dockerignore
...
[+] Building 58.6s (19/19) FINISHED

@extact-io ➜ /workspaces/codespaces-sample (main) $ docker run -p 8080:8080  --rm --detach helidon-sample
b0b17a86e03a11092471a93b62bcb13124409efb5d2753529425f0e70de44a56

@extact-io ➜ /workspaces/codespaces-sample (main) $ curl localhost:8080/simple-greet
{"message":"Hello World!"}
```

上でも説明したとおりCodespacesの開発環境はDocker上のコンテナインスタンス内で動作しています。したがって、開発環境内のコンソールから`docker`コマンドでコンテナを起動することはdocker内でdockerを起動する所謂"Docker in Docker"になります。Docker in Dockerの環境を一から作るのはハマりどころも多く、骨の折れる作業ですが、Codespacesの場合、構成の選択時に"Docker in Docker"を選択するだけで簡単に使うことができます。

:::alert: コンテナ内の操作はコンテナの削除ですべてなくなる
`docker`コマンドでビルドしたコンテナイメージはコンテナ内のローカルリポジトリに保存されますが、この保存先はあくまでもコンテナの中になります。このため、コンテナ、つまり今実行している開発環境を削除した場合、コンテナイメージも一緒になくなります(開発環境の削除方法は後述の[開発環境のライフサイクル](#開発環境コンテナのライフサイクル)を参照)。

また、開発環境内で行った設定変更や追加した拡張機能は、そのコンテナ限りとなります。これはコードの修正も同様になります。したがって、開発環境内で行った変更をコンテナをまたがって永続的に有効にしたい場合はdevcontainer.jsonにその設定を定義し、リポジトリにコミットしておく必要があります。またこれはコードについても同じとなります。

Codespacesは便利すぎてローカルとの区別が付かなくなりがちですが、開発環境ははGitHub上のコンテナ内で動作していることを理解しておく必要があります。そしてコンテナはリポジトリに登録されている内容からすべて復元され、リポジトリに存在しないもの、構成に定義されていないものは復元されません。コンテナをうっかり削除して必要な変更を喪失することがないように、この点はきちんと理解しておきましょう。
:::

# 設定の共有
ベースとなるビルドと実行環境が整ったので、次は設定を整えてきます。皆さんもチームで開発するときにこれはみんなで同じ設定にしておきたいなと思うモノがあると思います。例えばチームで標準で使う拡張機能やコードフォーマットなどです。

このような設定も構成ファイル(devcontainer.json)に定義しておくことで統一することができます。

## 拡張機能の追加
では、まず拡張機能を追加してみます。現在の構成ではGit Graphがインストールされないため、インストールするため拡張機能からGit Graphを検索します。

![cap16](/img/blogs/2023/0625_images/cap_16.drawio.svg)

拡張機能の"インストール"ボタンをクリックしたくとなると思いますが、ここで注意が必要です。

"インストール"ボタンで確かにGit Graphが使えるようになりますが、これが使えるのは今使っているコンテナ内だけです。上述したとおり、コンテナが削除された場合や他のユーザがリポジトリからCodespacesを開始した場合にGit Graphは含まれません。

では、どうするかですが、拡張機能もdevcontainer.jsonに定義することができます。devcontainer.jsonへは追加した拡張機能のIDを調べて手動で追加することもできますが、一番簡単なのは追加したい拡張機能のところで右クリックし、コンテキストメニューの"Add to devcontainer.json"を行うことです。

![cap17](/img/blogs/2023/0625_images/cap_17.drawio.svg)

これで右クリックした拡張機能がdevcontainer.jsonに追加されます。

- devcontainer.json
```json
{
	"name": "Java",
	...
	"customizations": {
		"vscode": {
			"extensions": [
				"mhutchie.git-graph",
				"MS-vsliveshare.vsliveshare"
			]
		}
	}
}
```

拡張機能は`customizations.vscode.extensions`に追加されていきます。また、今回の例ではチームで使う標準の拡張機能としてGit Graphの他に、後ほど説明するLiveShareも追加しています。

## 設定の変更
今度は設定を整えていきます。`Ctrl + ,`(Win)/`command + ,`(Mac)で設定画面を開くと分かるとおりCodespacesもVSCodeと同じように優先度に応じた設定箇所が3つ用意されています。

![cap18](/img/blogs/2023/0625_images/cap_18.drawio.svg)

- ユーザ
  - このコンテナインスタンス限りで有効な設定
- リモート[codespaces]
  - devcontainer.jsonから復元された設定
- ワークスペース
  - `.vscode/settings.json`から復元された設定[^2]

"リモート[codespaces]"に対して行った変更はdevcontainer.jsonには反映されません。このため、コンテナをまたがって設定を有効にしたい場合は行った変更を手動でdevcontainer.jsonに追加する必要があります。

[^2]: 設定や拡張機能の共有という目的であれば、settings.jsonやextensions.jsonをリポジトリにコミットして共有することでも実現できますが、今回は共有すべき設定はすべてdevcontainer.jsonに集約するようにしています。

設定の追加方法はいくつかありますが、一番簡単な方法は次のとおりです。行末スペースを保存時に削除する設定を例に見ていきます。

1. 設定画面で"リモート[codespaces]"タブで保存時に行末スペースを削除する設定を有効にする
![cap19](/img/blogs/2023/0625_images/cap_19.drawio.svg)<br>
2. 変更した設定の左側の歯車アイコンをクリックし、メニューから”JSONとして設定をコピー”を選択
![cap20](/img/blogs/2023/0625_images/cap_20.drawio.svg)<br>
3. devcontainer.jsonの`customizations.vscode. settings`にコピーした設定を追加
```json
{
	"name": "Java",
	...
	"customizations": {
		"vscode": {
			"extensions": [
				...
			],
			"settings": {
				// ファイル保存時に行末スペースを削除する
				"files.trimTrailingWhitespace": true,
				// ファイル保存時にimport文を編成(並び替えと不要な文の削除)する
				"java.saveActions.organizeImports": true,
				// pomを更新したらクラスパスも自動で更新する
				"java.configuration.updateBuildConfiguration": "automatic",
				// ./java-formatter.xmlにしたがってJavaコードをフォーマットする
				"java.format.settings.url": "java-formatter.xml"
			}
		}
	}
}
```


例では行末スペースの削除の他にも設定を追加しています(devcontainer.jsonのコメントを参照)

このようにチーム内で標準としたい拡張機能や設定はdevcontainer.jsonに定義することで簡単に共有することができるようになります。


# 開発環境を丸ごと他人と共有する
テレワークをしていると出社勤務のときのようにお隣さんと「コレが○○で」などと画面を見ながら作業するといったことが簡単にできず、もどかしかったりするときがあります。そんなときに威力を発揮するのがLiveShare拡張機能です。

LiveShareはリアルタイムで他人と開発環境を共有する機能でローカルで開発を行う所謂「普通のVSCodeの使い方」でも使える機能ですが、Codespacesではこれをより簡単に使うことができます。

CodespacesにおけるLiveShareの動作イメージは次のようになります。

図

LiveShareを使う場合の実際の操作手順は次のとおりになります。（途中案内や確認のSnackbar(ダイアログ)がいくつか出てきますが、すべて何も選択せず閉じてOKです）

＜開発環境を共有する側＞
1. 左のメニューバーからLive Shareを選択し"Share"ボタンをクリックします。
![cap21](/img/blogs/2023/0625_images/cap_21.drawio.svg)<br>
2. クリック後、しばらくして次のSnackbarが出たら準備完了です。(※他の案内も沢山でてきますが、下の案内も含めすべて無視して閉じてOKです)
![cap22](/img/blogs/2023/0625_images/cap_22.drawio.svg)<br>
3. この状態でクリップボードに自分の開発環境（コンテナ）への接続情報がコピーされているので、この情報を共有される側（自分の開発環境を見てほしい人）にメールなどで連絡します。

＜開発環境を共有される側＞

4. 共有される側は左のメニューバーからLive Shareを選択し、Joinボタンをクリックします。
![cap23](/img/blogs/2023/0625_images/cap_23.drawio.svg)<br>
5. "Joinボタンをクリックすると上部に入力エリアが現れるのでそこに共有する側から教えてもらった接続先情報を入力します。
![cap24](/img/blogs/2023/0625_images/cap_24.drawio.svg)<br>
1. ブラウザ内の開発環境が再起動し、再起動後は相手の開発環境（コンテナ）が現れ、下のキャプチャのように相手の作業状況が共有されます。
![cap25](/img/blogs/2023/0625_images/cap_25.drawio.svg)


:::check: 接続が上手くいかない場合はページ再読み込みをしてみる
Joinボタンをクリックして正しい接続先を入力しているにも関わらず、接続が上手くいかない場合があります。ブラウザのページ再読み込みをしてみると上手くいったりします(それもショートカットキーではなくブラウザの再読み込みボタンクリックがお勧めです)。
:::


リモートからでも相手の開発環境に対する操作や確認がサクサク行え、かなり便利です。また相手のファイルの編集やアプリの実行なども自分の環境と同じように行うことができます。

# 開発環境(コンテナ)のライフサイクル
"Create codespace on main"ボタンから開始したCodespacesの開発環境ですが、終了はしなくてよいのか？と思う方もいると思います。記事の最後として開発環境のライフサイクルを説明します。

ここまで何度か触れてきましたが、Codespacesの開発環境の実体はdevcontainer.jsonをもとに作られたDockerコンテナです[^3]。なので、Codespacesの開発環境もコンテナと同じように次のライフサイクルを持ちます。

[^3]:[開発コンテナーの概要 - GitHub Docs](https://docs.github.com/ja/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/introduction-to-dev-containers)から引用。
> 開発コンテナーは、完全な機能を備えた開発環境を提供するように特別に構成された Docker コンテナーです

図

図のコンテナインスタンスの再開や停止、削除は、左上の`メニュー ＞ My Codespaces`（もしくはhttps://github.com/codespaces/）から移動できる"GitHubのYour codespaces"画面から次のように行えます。

![cap26](/img/blogs/2023/0625_images/cap_26.drawio.svg)

Codespacesは時間で課金されますが、コンテナが停止状態のときは課金されません。ですので、作業が終わったらコンテナを停止しておくのが良いでしょう。ただし、停止し忘れた場合でも30分間無操作状態が続いた場合、Codespacesが自動でコンテナを停止してくれます。

また、コンテナを使い終わった場合は削除するようにしましょう。Codespacesでは時間だけでなく使用しているストレージの量でも課金されます[^4]。

[^4]: 詳細は[GitHub Codespaces の請求について - GitHub Docs](https://docs.github.com/ja/billing/managing-billing-for-github-codespaces/about-billing-for-github-codespaces#about-billing-for-storage-usage)を参照。

コンテナの削除は開発環境(コンテナ)を新規に作成した際に期待していたものがすべて復元されるかという確認にも有効です。筆者はdevcontainer.jsonの設定が完了したらコンテナを一旦削除し、再作成して先ほどと同じ環境が復元されるか確認するようにしています。

# まとめ
GitHub CodespacesでできることはVSCodeのdevcontainerでも同様なことを実現することができます。しかし、GitHub Codespacesはパブリッククラウドで、かつブラウザだけで、かつストレスなく開発作業ができるため、開発環境を使う際の「気軽さ」が段違いに違います。

Codespaceは以前より知っていましたが、使う前は「所詮ブラウザで使えるだけでしょ、ローカルでやった方が絶対いいでしょ」と斜に構えていましたが、実際に使った今ではローカルでの開発スタイルの方が優れている点があることは理解しつつも、GitHub Codespacesには新しい開発スタイルの未来を感じています。この記事を読んで興味を持っていただけた方は実際に試して未来を感じていただければと思います。

