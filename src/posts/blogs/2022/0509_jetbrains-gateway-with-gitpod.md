---
title: JetBrains Gateway の Gitpod 統合を使って IntelliJ IDEA でリモート開発する
author: masahiro-kondo
date: 2022-05-09
---

JetBrains の IntelliJ IDEA は根強い人気を誇る IDE です。先月末に JetBrains Gateway と Gitpod を使ってリモート開発が可能になったというアナウンスがありました。

[JetBrains Gateway と Gitpod を使ったリモート開発 | JetBrains News](https://blog.jetbrains.com/ja/blog/2022/04/28/jetbrains_partners_with_gitpod/)

Gitpod は IDE をホスティングする SaaS で 従来は VS Code as Service のような存在でした。

[Gitpod: Always ready to code.](https://www.gitpod.io/)

Gitpod の VS Code ライクな UI は Eclipse Theia によるものです。

[Theia - Cloud and Desktop IDE Platform](https://theia-ide.org/)

Theia は VS Code の完全互換を目指す OSS であり、VS Code の Extension も使えます[^1]。

[^1]: Microsoft の規約により Marketplace は使えないので vsix ファイルをダウンロードして手動でインストールすることになりますが。 

VS Code ユーザーにもそれなりに認知されていた Gitpod でしたが、[GitHub Codespaces](https://github.co.jp/features/codespaces)(VS Code をブラウザ動作させ、GitHub の提供するマシンリソースでリモート開発できるサービス) の登場[^2]でサービスとしてのプレゼンスは下がっていると思われます。そこにきて JetBrains との協業。巻き返しを図る施策かもしれません。

[^2]: ただいまベータ公開ですが、コードをブラウザで編集するだけなら [github.dev](https://github.dev/) でその機能を使えます。

JetBrains Gateway は VS Code の Remote Development のようなリモート開発を実現するテクノロジーです。

[JetBrains Gateway - JetBrains IDE 向けリモート開発](https://www.jetbrains.com/ja-jp/remote-development/gateway/)

JetBrains Gateway にはこれまで、

- リモートマシンに SSH 接続して開発する
- JetBrains Spaces[^3] に接続して開発する

というオプションがありました。そこに Gitpod に接続して開発するというオプションが新たに加わったわけです。

[^3]: JetBrains がホストするリモート開発用のサービス

JetBrains Gateway では JetBrains Client というシンクライアントのアプリが起動されます。Gitpod の Theia ベースの IDE は VS Code と同様 Web 技術で動作していますが、JetBrains Client の方は Remote Desktop (RDP) に近いもののようです。

JetBrains Gateway では IntelliJ IDEA の他に GoLand、PyCharm、PhpStorm が利用できます。

と、予備知識はこれぐらいにして早速導入してみます。

JetBrains Gateway のページから使用する環境向けのインストーラを選択してダウンロード・インストールします。

![](https://i.gyazo.com/4acc801451b3cbf6b3c70a6aa77bfe4b.png)

インストールした JetBrains Gateway を起動するとリモート開発用のダイアログが表示されますので、Gitpod のプラグインをインストールします。

![](https://i.gyazo.com/00cdf22318f35f4ea776f44b1d640043.png)

ここで、Gitpod のアカウントがない場合は、サインアップします。GitHub / GitLab / Bitbucket のアカウントでログイン可能です。

![](https://i.gyazo.com/d07b69fd4a9c9d649043bb66b99aa181.png)

JetBrains Gateway から接続するときは Gitpod 側でアプリ認証が必要です。

![](https://i.gyazo.com/09d9a8d4c8bf9ae3e7fbabaa9af9f23f.png)

すでに GitHub などで開発対象のレポジトリがある場合、そのレポジトリを選択して Gitpod のワークスペースを作成することができます。

![](https://gyazo.com/ee9970a5388c5e03f4beca182522d15a.png)

作業対象の Spring Boot アプリのレポジトリを選択しました。

![](https://i.gyazo.com/29ae23800a08aa6ff494f46a5cdb6311.png)

選択したレポジトリから Gitpod のワークスペースを作ります。

![](https://gyazo.com/236630e61704cfa9f2bcff6d735f6385.png)

Gitpod 側で開発環境がプロビジョンされます。

![](https://i.gyazo.com/e8081301ad1a635729196a80365af139.png)

完了すると次のような状態になります。

![](https://gyazo.com/8cf314358f940282f887fdbee4762961.png)

ポップアップが開きますので、「JetBrains Gateway を開く」をクリックします。

![](https://i.gyazo.com/1da3cc1212c535982032d4a21f82c8a2.png)

ライセンスの登録などを求められるのでとりあえずトライアルで進めるとリモートで実行される IDEA の画面が起動します。ローカルで動かしているのと変わりません。

![](https://i.gyazo.com/98e9eae287131fb054ca1ae6da027a73.png)

アプリの起動やデバッグもローカルと同じ感覚でできます。

![](https://i.gyazo.com/543d5622e6957d7d691359d995f46c1f.png)

コードを修正して git commit / push もできました。

![](https://i.gyazo.com/1c77e173f4ef14b876156b4ee320eb68.png)

以上のように JetBrains Gateway + Gitpod を使うと、IDE をリモート実行して、作業中のレポジトリで開発作業ができます。ローカルには JetBrains Gateway があればよく Git も IDE も不要というまさにシンクライアントです。非力なラップトップでも馴染みの IDE で作業できるのは素晴らしいですね。今のところ GitHub の Codespaces と違ってブラウザでの動作はできませんが、ローカルと変わらない操作性は一度試す価値はあると思います。
