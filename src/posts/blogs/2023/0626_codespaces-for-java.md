---
title: GitHub CodespacesによるJavaのチーム開発環境の作り方
author: toshio-ogiwara
date: 2023-06-26
tags: [GitHub, Codespaces, java, vscode]
---
GitHub CodespacesでJavaのチーム開発環境を整備してみたところ、想像の斜め上を行く便利さでした。このデベロッパーサイトでもCodespacesを[何回か紹介](/tags/codespaces/)してきましたが、今回は複数人で使う開発環境としてCodespacesを使うとどのような点がよいのか、そしてそれをどうセットアップするかなど、個人でなく複数人で使う場合の側面からCodespacesを紹介したいと思います。


:::info:お試し環境の紹介
今回紹介するJavaの開発環境は[こちらのリポジトリ](https://github.com/extact-io/codespaces-sample)にコミットしてあり実際に使うことができます。使い方は簡単で[リポジトリ](https://github.com/extact-io/codespaces-sample)に移動して右上の"<>Code"ボタンをクリックしてCodespacesタブにある下のボタンをポチっとするだけです！是非やってみてください(Codespacesの利用にはGitHubへのSign inは必要になります)。

![cap01](/img/blogs/2023/0626_images/cap_01.drawio.svg)

なお、動作確認用のアプリにはHelidonの[Helidon MP Quickstart Example](https://helidon.io/docs/v3/#/mp/guides/quickstart)を使っています。アプリのビルドや実行方法はリポジトリの[README](https://github.com/extact-io/codespaces-sample#readme)を参照ください。

:::


# ココがいいぞGitHub Codespaces
細かいことを説明する前にまとめ的な意味で、みんなで使う場合、つまりチーム開発の開発環境としてCodespacesを使う場合の利点を挙げてみます。

- ブラウザだけでストレスなく開発作業が行える
  - Javaに加えてコンテナも使う場合、開発PCにある程度のスペックが要求されるが非力なマシンでも開発が行える
  - ブラウザだけで作業が完結するためローカル環境を一切汚さずに済む
- 開発環境をボタン一発で作成することができる
  - 従来のようにあっちこっちから色々なものを取ってきてインストールして設定するといったことが不要
- みんな同じ環境・設定で作業することができる
  - ローカルPCを意識することがないためWindowsでもMacでも同じように作業が行える
  - 構成ファイルを起点に環境が作成されるため、構成ファイルを共有することで設定を統一できる
- リモートでも簡単に共同作業ができる
  - 開発環境の実体はパブリッククラウドにあるので、細かい設定不要で開発環境を共有できる

:::column: Codespacesで開発環境を作ろうと思った背景
筆者が参画しているプロジェクトでは定期的に勉強会を行っていますが、その際に利用する環境準備が悩みのタネでした。勉強会は業務外で利用するアプリやツールを使うため、業務で利用しているPCを使うことはできません。このため、各個人のPCを使って行うのですが、WindowsやMacは当たり前で、PCはあるけど「ディスクの空きがない」という方から「私はiPadで参戦します！」という猛者まで様々で、Dockerを使う勉強会などでは各人にDocker環境を用意してもらうことが一番のハードルだったりします。

また、各人になんとか環境を用意してもらったとしても、WindowsとMacではショートカットやパスが異なっていたりで操作方法を案内するのにも一苦労あったりします。

このようなことから、手軽にかつ無料（もしくは安価）でみんな揃って使える環境があったらなぁとそんな都合がいいことを思っていました。

そんなときに浮かんだのがGitHub Codespacesです。

ちょうど次の勉強会がJavaとDockerを使うものだったため、さっそくCodespacesでJavaの開発環境を準備してみましたが結果は大正解。すべての望みを叶えることができました。
:::

# GitHub Codespacesの基礎知識
今回の記事ではそんな素敵なJavaの開発環境の作り方を説明していきますが、その前に前提知識としてCodespacesの動作環境を次の図をもとに簡単に説明します。

![fig01](/img/blogs/2023/0626_images/fig_01.drawio.svg)

Codespacesは図からも分かるとおり、構成ファイル(後述)をもとにビルドされたコンテナイメージから生成されたコンテナインスタンスを個別の開発環境としてユーザに提供する機能です。またCodespacesはVSCodeのブラウザ版的な位置づけからその操作や機能はローカルで動作させるVSCodeとほぼ同じになります。

ユーザはブラウザもしくはローカルのVSCodeから生成されたコンテナインスタンスに接続して作業を行います。ユーザは目の前にあるブラウザやVSCodeを操作していますが、リポジトリからチェックアウトしたファイルやJavaのビルドや実行などはすべてGitHub側で動作するコンテナ内に存在し行われます。なお今回はブラウザを使った方法を説明します。

:::info: 個人アカウントでも１か月最大60時間無料
Codespacesは個人アカウントでも2コアCPU/4GBメモリのリソースを月60時間まで無料で使うことができます。利用できる時間は利用するコア数により変わり4コアCPU/8GBメモリの場合、半分の30時間になります。課金体系の詳しい情報は[こちら](https://docs.github.com/ja/billing/managing-billing-for-github-codespaces/about-billing-for-github-codespaces)を参照ください。
:::

# Javaの開発環境の作り方
ここからはCodespacesにおけるJavaの開発環境の作り方について、先ほど利点に挙げた点を中心に説明していきます。

:::check: 途中で出てくる案内(Snackbar)は一旦すべて無視する
開発環境が立ち上がった後や何かアクションをした後に次のような案内(Snackbar)がいくつか出てくる場合がありますが一旦すべて無視して閉じてくだい。なお、下の案内は例なだけでこれ以外にもいろいろな内容があります。
![cap10](/img/blogs/2023/0626_images/cap_10.drawio.svg)
:::

## Codespacesの起動
最初は初期状態の開発環境を作成するところから始めます。開発環境の作成はCodespacesで作業を行いたいGitHubのリポジトリに移動し、画面右上の"<>Code"ボタンをクリックし、Codespacesタブにある"Create codespace on main"ボタンをクリックします。

![cap02](/img/blogs/2023/0626_images/cap_02.drawio.svg)

ボタンをクリックすると開発環境のプロビジョニングが開始され、準備ができるとブラウザ内にVSCodeと同じ開発環境がリポジトリをチェックアウト(clone)した状態で立ち上がります。

![cap03](/img/blogs/2023/0626_images/cap_03.drawio.svg)

## ベース環境の準備
リポジトリにはまだ構成ファイルが含まれていないため、単にスッピンのコンテナを起動しただけにすぎません。このため、Javaのコンパイルや実行を行うJDKやMavenなど、開発に必要なツールはまだ入っていません。

開発に必要なツールを入れるには環境作成のもととなる構成ファイルに必要なツール類を指定する必要があります。ということで、次からは構成ファイルを作成していきます。構成ファイルは手で作成することもできますが、最初はハードルが高いため、ここではウィザード形式で必要なものを指定していく方法を説明します。

ウィザードを開始するには画面左上のメニューから`表示 > コマンドパレット`を選択してコマンドパレットを出します。

![cap04](/img/blogs/2023/0626_images/cap_04.drawio.svg)

コマンドパレットが現れたら、"codespaces: Add Container Configuration Files.."を選択しします。（>の後にcodespacesと入力すると候補が絞り込まれます。また初回は次の選択に移るまでに少し時間が掛かります）

![cap05](/img/blogs/2023/0626_images/cap_05.drawio.svg)

次にCreateかModifyかの選択を求められます。今回は新規なので"Create new Configuration.."を選択します。

![cap06](/img/blogs/2023/0626_images/cap_06.drawio.svg)

次に予め定義されたコンテナ設定から作成する環境を選択する(From a predefined container…)か、それとも既に存在するDockerfileから環境を作成する(From 'Dockerfile')かなどの選択を求められるので予め定義されたコンテナ設定から選択する"From a predefined container configuration definition.."を選択します。

![cap07](/img/blogs/2023/0626_images/cap_07.drawio.svg)

以降は作成する環境の構成を実際に指定していくのですが、今回は次に示す構成の環境を作ります。
- Java 17 / Maven / Docker

この構成に従い次のように選択していきます(※候補をクリックしても反応がない場合は入力エリアでEnterを押すと選択が確定され次に進みます)。

![cap08](/img/blogs/2023/0626_images/cap_08.drawio.svg)(クリックすると拡大します)

すべての選択が完了するとCodespacesにより選択内容を反映した構成ファイルが`.devcontainer/devcontainer.json`に作られます。

![cap09](/img/blogs/2023/0626_images/cap_09.drawio.svg)

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

devcontainer.jsonを見るとウィザードで何を選択していたのかが分かります。

ウィザードで最初に選択していたのは`image`プロパティに指定する開発環境を立ち上げる（復元する）際に使うベースイメージになります[^1]。そして途中で選択していた、MavenやDocker-in-Dockerはベースイメージに追加する`features`の指定になります。

[^1]: ウィザードでも選択した"17-bullseye"の"-bullseye"はDebianのv11のコードネームになります。したがって"17-bullseye"はベースイメージがDebian v11のJava17の意味になります。

Codespacesは起動するリポジトリの`.devcontainer/devcontainer.json`をもとにコンテナイメージをビルドし、そのビルドしたイメージをインスタンス化したコンテナを各ユーザの開発環境として割り当てます。したがって、私たちが目の前で見ているブラウザの先で動いているものは個人ごとに割り当てられたコンテナとなります。

![fig02](/img/blogs/2023/0626_images/fig_02.drawio.svg)

このようにCodespacesでは環境の構成をdevcontainer.jsonで定義し、その定義にしたがって復元・インスタンス化された環境が各人に割り当てられます。Codespacesではこれによりリポジトリにコードと一緒に構成ファイルをコミットしておくことで、各開発者は開発に必要な環境一式をボタン一発で素早く手に入れることができます。

## 構成ファイルの反映(rebuild)
開発環境のもととなるコンテナイメージは再作成されていないため、今はまだdevcontainer.jsonが反映されていません。ここではdevcontainer.jsonを反映させるため、開発環境を再作成します。

再作成するには左下のCodespacesメニューをクリックしてコマンドパレットを出し、そこで"rebuild container"を選択します。

![cap11](/img/blogs/2023/0626_images/cap_11.drawio.svg)

すると次にような画面に切り替わりコンテナイメージのビルドが開始されます。数分してビルドが完了したら再度VSCodeと同じ画面がブラウザ内に表れます。

![cap12](/img/blogs/2023/0626_images/cap_12.drawio.svg)

### 拡張機能の確認
開発環境が起動したらJavaの環境がインストールされているかを確認しみてます。  

まず最初に拡張機能を見てみると確かにExtension Pack for JavaなどJavaの開発に必要な拡張機能がインストールされているのが分かります。

![cap13](/img/blogs/2023/0626_images/cap_13.drawio.svg)

次にエクスプローラーを見ると、先ほどまではなかった`JAVA PROJECTS`と`MAVEN`のタブが追加されています。開発環境にまだJavaのプロジェクトとして認識されていないため、"import Projects"ボタンをクリックしてJavaプロジェクトとして認識させます。

![cap14](/img/blogs/2023/0626_images/cap_14.drawio.svg)

少しすると進行状況を表示する案内(Snackbar)が現れたのち、`JAVA PROJECT`タブにプロジェクト情報が反映されます。

![cap15](/img/blogs/2023/0626_images/cap_15.drawio.svg)


### JavaとMavenコマンドの確認
今度はJavaコマンドやMavenコマンドが使えるかを次のようにコンソールから確認してみます。

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

JDKやMavenを自分でインストールした場合、環境変数やPATHの設定が地味に面倒だったりしますが、JavaとMavenを構成に含めておくだけで、それらをインストールしてくれるだけでなく、環境変数の設定も含めすべて準備万端な状態でセットアップしてくれます。

### Dockerコマンドの確認
最後にDockerコマンドを試してみます。Dockerコマンドを使ったビルドやコンテナの実行も次のように問題なく行えます。

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

先ほども説明したとおりCodespacesの開発環境はDocker上のコンテナ内で動作しています。したがって、開発環境内のコンソールから`docker`コマンドでコンテナを起動することはDocker内でDockerを起動する所謂"Docker in Docker"になります。Docker in Dockerの環境を一から作るのはハマりどころも多く、骨の折れる作業ですが、Codespacesの場合、構成の選択時に"Docker in Docker"を選択するだけで簡単に使うことができます。

:::alert: コンテナ内の操作はコンテナの削除ですべてなくなる
`docker`コマンドでビルドしたコンテナイメージはコンテナ内のローカルリポジトリに保存されますが、この保存先はあくまでもコンテナの中になります。このため、コンテナ、つまり今実行している開発環境を削除した場合、ビルドしたコンテナイメージも一緒になくなります(開発環境の削除方法は後述の[開発環境のライフサイクル](#開発環境コンテナのライフサイクル)を参照)。

また、同様に開発環境内で行った設定変更や追加した拡張機能も、そのコンテナ限りとなります。これはコードの修正も同様です。このため、開発環境内で行った変更をコンテナをまたがって永続的に有効にしたい場合はdevcontainer.jsonにその設定を定義し、リポジトリにコミットしておく必要があります。

Codespacesは便利すぎてローカル環境との区別が付かなくなりがちですが、開発環境はGitHub上のコンテナ内で動作していることを意識しておくことが重要です。そして開発環境のコンテナはリポジトリに登録されている内容からすべて復元され、リポジトリに存在しないもの、構成に定義されていないものは復元されません。コンテナをうっかり削除して必要な変更を喪失することがないように、この点はきちんと理解しておきましょう。
:::

# 設定の共有
ここまででベースとなる環境が整ったので、次は設定を整えてきます。皆さんもチームで開発するときにこれはみんなで同じ設定にしておきたいなと思うモノがあると思います。例えばチームで標準で使う拡張機能やコードフォーマットなどです。

このような設定も構成ファイル(devcontainer.json)に定義しておくことで統一することができます。

## 拡張機能の追加
では、まず拡張機能を追加してみます。現在の構成ではGit Graphがインストールされていません。これをインストールするため拡張機能からGit Graphを検索します。

![cap16](/img/blogs/2023/0626_images/cap_16.drawio.svg)

拡張機能の"インストール"ボタンをクリックしたくとなると思いますが、ここで注意が必要です。

"インストール"ボタンで確かにGit Graphが使えるようになりますが、これが使えるのは今使っているコンテナ内だけです。上述したとおり、コンテナが削除された場合や他のユーザがリポジトリからCodespacesを開始した場合、Git Graphは含まれません。

では、どうするかですが、拡張機能もdevcontainer.jsonに定義することができます。devcontainer.jsonへは追加したい拡張機能のIDを調べて手動で追加することもできますが、一番簡単なのは追加したい拡張機能のところで右クリックし、コンテキストメニューの"Add to devcontainer.json"を行うことです。

![cap17](/img/blogs/2023/0626_images/cap_17.drawio.svg)

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

拡張機能は`customizations.vscode.extensions`に追加されていきます。また今回の例ではチームで使う標準の拡張機能としてGit Graphの他に、後ほど説明するLiveShareも追加しています。

## 設定の変更
今度は設定を整えていきます。`Ctrl + ,`(Win)/`command + ,`(Mac)で設定画面を開くと分かるとおりCodespacesもVSCodeと同じように優先度に応じた設定箇所が3つ用意されています。

![cap18](/img/blogs/2023/0626_images/cap_18.drawio.svg)

- ユーザ
  - このコンテナ限りで有効な設定
- リモート[codespaces]
  - devcontainer.jsonから復元された設定
- ワークスペース
  - `.vscode/settings.json`から復元された設定[^2]

"リモート[codespaces]"に対して行った変更はdevcontainer.jsonには反映されません。このため、コンテナをまたがって設定を有効にしたい場合は行った変更を手動でdevcontainer.jsonに追加する必要があります。

[^2]: 設定や拡張機能の共有という目的であれば、settings.jsonやextensions.jsonをリポジトリにコミットしておくことでも実現できますが、今回は共有すべき設定はすべてdevcontainer.jsonに集約するようにしています。

設定の追加方法はいくつかありますが、一番簡単な方法は次のとおりです。行末スペースを保存時に削除する設定を例に見ていきます。

1. 設定画面で"リモート[codespaces]"タブで保存時に行末スペースを削除する設定を有効にする
![cap19](/img/blogs/2023/0626_images/cap_19.drawio.svg)<br>
1. 変更した設定の左側の歯車アイコンをクリックし、メニューから”JSONとして設定をコピー”を選択
![cap20](/img/blogs/2023/0626_images/cap_20.drawio.svg)<br>
1. devcontainer.jsonの`customizations.vscode.settings`にコピーした設定を追加
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
テレワークをしていると出社勤務のときのようにお隣さんと「コレが○○で～」などと画面を見ながら作業するといったことが簡単にできず、もどかしかったりするときがあります。そんなときに威力を発揮するのがLiveShareの拡張機能です。

LiveShareはリアルタイムで他人と開発環境を共有する機能でローカル環境で開発を行う所謂「普通のVSCodeの使い方」でも使える機能ですが、Codespacesではこれをより簡単に使うことができます。

CodespacesにおけるLiveShareの動作イメージは次のようになります。

![fig03](/img/blogs/2023/0626_images/fig_03.drawio.svg)

LiveShareを使う場合の操作手順は次のとおりです。

＜開発環境を共有する側＞
1. 左のメニューバーからLive Shareを選択し"Share"ボタンをクリックします。
![cap21](/img/blogs/2023/0626_images/cap_21.drawio.svg)<br>
1. クリック後、しばらくして次の案内(Snackbar)が出たら準備完了です。(※他の案内も沢山でてきますが、下の案内も含めすべて無視して閉じてOKです)
![cap22](/img/blogs/2023/0626_images/cap_22.drawio.svg)<br>
1. この状態でクリップボードに自分の開発環境（コンテナ）への接続情報がコピーされているので、この情報を共有される側（自分の開発環境を見てほしい人）にメールなどで連絡します。

＜開発環境を共有される側＞

4. 共有される側も左のメニューバーからLive Shareを選択し、こちらは"Join"ボタンをクリックします。
![cap23](/img/blogs/2023/0626_images/cap_23.drawio.svg)<br>
5. "Join"ボタンをクリックすると上部に入力エリアが現れるのでそこに共有する側から教えてもらった接続先情報を入力します。
![cap24](/img/blogs/2023/0626_images/cap_24.drawio.svg)<br>
6. ブラウザ内の開発環境が再起動し、再起動後に相手の開発環境（コンテナ）が現れ、下のキャプチャのように相手の作業状況が共有されます。
![cap25](/img/blogs/2023/0626_images/cap_25.drawio.svg)


:::check: 接続が上手くいかない場合はページ再読み込みをしてみる
Joinボタンをクリックして正しい接続先を入力しているにも関わらず、接続が上手くいかない場合があります。このような時はブラウザのページ再読み込みをしてみると上手くいったりします(それもショートカットキーではなくブラウザの再読み込みボタンクリックがお勧めです)。
:::


リモートからでも相手の開発環境に対する操作や確認がサクサク行え、かなり便利です。また相手のファイルの編集やアプリの実行なども自分の環境と同じように行うことができます。

# 開発環境(コンテナ)のライフサイクル
"Create codespace on main"ボタンから開始したCodespacesの開発環境ですが、終了はしなくてよいのか？と思う方もいると思います。記事の最後として開発環境のライフサイクルを説明します。

ここまで何度か触れてきましたが、Codespacesの開発環境の実体はdevcontainer.jsonをもとに作られたDockerコンテナです[^3]。なので、Codespacesの開発環境もコンテナと同じように次のライフサイクルを持ちます。

[^3]:[開発コンテナーの概要 - GitHub Docs](https://docs.github.com/ja/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/introduction-to-dev-containers)から引用。

![fig04](/img/blogs/2023/0626_images/fig_04.drawio.svg)

図のコンテナの再開や停止、削除は、画面左上の`メニュー ＞ My Codespaces`（もしくは<https://github.com/codespaces/>）から移動できるGitHubの"Your codespaces"画面から次のように行えます。

![cap26](/img/blogs/2023/0626_images/cap_26.drawio.svg)

Codespacesは時間で課金されますが、コンテナが停止状態のときは課金されません。ですので、作業が終わったらコンテナを停止しておくのが良いでしょう。ただし、停止し忘れた場合でもデフォルトで30分間無操作状態が続いた場合、Codespacesが自動でコンテナを停止してくれます。

また、コンテナは今後使うことがなくなったら削除するようにしましょう。Codespacesは時間だけでなく使用しているストレージの量でも課金されます[^4]。

[^4]: 詳細は[GitHub Codespaces の請求について - GitHub Docs](https://docs.github.com/ja/billing/managing-billing-for-github-codespaces/about-billing-for-github-codespaces#about-billing-for-storage-usage)を参照。

コンテナの削除は開発環境(コンテナ)を新規に作成した際に期待していたものがすべて復元されるかという確認にも有効です。筆者はdevcontainer.jsonの設定が完了したらコンテナを一旦削除し、再作成して先ほどと同じ環境が復元されるか確認するようにしています。

# まとめ
GitHub CodespacesでできることはVSCodeのdevcontainerでも同様なことができます。しかし、GitHub Codespacesはパブリッククラウドで、かつブラウザだけで、かつストレスなく開発作業ができるため、開発環境を使う際の「気軽さ」が段違いに違います。

Codespaceは以前より知っていましたが、使う前は「所詮ブラウザで使えるだけでしょ、ローカルでやった方が絶対いいでしょ」と斜に構えていましたが、実際に使ってみた今はローカル環境での開発の方が優れている点があることは認識しつつも、GitHub Codespacesには新しい開発スタイルの未来を感じています。この記事を読んで興味を持っていただけた方は実際に試して未来を感じていただければと思います。

