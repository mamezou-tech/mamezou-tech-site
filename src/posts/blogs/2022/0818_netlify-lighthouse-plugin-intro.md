---
title: NetlifyのLighthouseプラグインでWebサイトのメトリクスをデプロイ時に評価する
author: noboru-kudo
date: 2022-08-17
templateEngineOverride: md
tags: [netlify]
---

Webサイトはそのローンチ後も続々と機能追加やデザイン適用が実施され、変化していくのが一般的です。
変更の中にはパフォーマンスやアクセシビリティの低下を招くものもあるかもしれません。
このような状況にならないよう、様々な側面からWebサイトを最適な状態に維持・改善していくことは重要なテーマです。

Webサイトを定量的に評価するサービスは多くありますが、無料で使える[Lighthouse](https://github.com/GoogleChrome/lighthouse)は多くのプロジェクトで採用されていると思います。
ChromeのDevToolsで使われていることが多い印象ですが、LighthouseはNode.jsのCLIでも提供されています。

今回は[Netlify](https://www.netlify.com/)でサイトデプロイ時にLighthouseを使って評価する仕組みを紹介します。
これを使用すると、Lighthouseスコアの計算に加えて、しきい値を下回った場合はデプロイを失敗させるといったこともできます。

[[TOC]]

## Lighthouseプラグイン導入

任意のWebサイトにNetlifyのLighthouseプラグインをインストールします。

- [Netlify Plugin Lighthouse](https://github.com/netlify/netlify-plugin-lighthouse#readme)

```shell
npm install --save-dev @netlify/plugin-lighthouse
```

ここでは、現時点で最新の`3.2.1`をセットアップしました。

なお、npmモジュールではなく、Netlifyコンソールでのインストールも可能です。詳細は以下公式ドキュメントを参照してください。

- [Netlify - Build Plugins](https://docs.netlify.com/integrations/build-plugins/#install-a-plugin)

## 評価対象ページの設定としきい値設定

次にLighthouseで評価する対象ページとスコアのしきい値を設定します。
これはプロジェクトルートに配置するNetlify設定ファイル(`netlify.toml`)の`plugins`セクションを指定します。
以下のようになります。

```toml
[[plugins]]
  package = "@netlify/plugin-lighthouse" # Lighthouseプラグイン 

  [[plugins.inputs.thresholds]]
    performance = 0.6
    accessibility = 0.6
    best-practices = 0.6
    seo = 0.9

  [[plugins.inputs.audits]]
    path = "/"
    output_path = "lighthouse/top.html"

  [[plugins.inputs.audits]]
    path = "/page/pageA"
    output_path = "lighthouse/pageA.html"

  [[plugins.inputs.audits]]
    path = "/page/pageB"
    output_path = "lighthouse/pageB.html"
```

`plugins.inputs.thresholds`にLighthouseスコアのしきい値を設定しています。
これは、全ページに適用されますが、`plugins.inputs.audits.thresholds`を設定するとページ単位で上書き指定もできます。
なお、しきい値を省略した場合は、チェックは実行されずメトリクス算出のみが実行されます。

その後の`plugins.inputs.audits`で評価対象ページ(`path`)を設定します。
ここではトップページ(`/`)に加えて2つのページ(`/page/pageA`と`/page/pageB`)を設定しました。
また、各ページに`output_path`を指定して、対象サイトの指定したパスにLighthouseのレポートも一緒にデプロイするようにしています。


## Lighthouseのスコアを参照する

これをNetlifyにデプロイすると、プラグインの存在を認識してビルド後にLighthouseを実行するようになります。
Lighthouseのスコアは、以下のようにデプロイ時のログから確認できます。

![netlify deploy log - success](https://i.gyazo.com/aa82215db8a3ddecaedeb1b777bf99ad.png)

スコアがしきい値を下回った場合は、デプロイが失敗します。この場合は以下のような出力になります。

![netlify deploy log - error](https://i.gyazo.com/1bfc600e142e67be10e12cb121c8f386.png)

もちろんログだけでは、確認しにくいですね。
先程`netlify.toml`でLighthouseレポートもデプロイするように指定しています。
ブラウザから対象パス（例えば`https://<your-site>/lighthouse/top.html`）にアクセスすると、Lighthouseのリッチなレポートを参照できます。

![lighthouse - report](https://i.gyazo.com/e17cf4db98bfe5b349d4759d4fd44d95.png)

改善が必要な部分は、詳細な内容やそのリンク先から解決方法も確認できますので、修正作業をする上で有用な情報になります。

## Netlifyコンソール上で参照する

先程のLighthouseレポートはサイトと一緒にデプロイされますので、URLを知っていれば誰でもこのスコアを参照できます。
Lighthouseのレポートを外部に見せたくないというケースも多いと思います(`output_path`を省略)。
とはいえ、ログだけでは確認が面倒で、結局誰も見なくなるのがオチです。

実験的機能ではありますが、Netlifyではコンソールからスコアを参照する機能を提供しています。

- [Netlify - Lighthouse Scores Visualization](https://docs.netlify.com/netlify-labs/experimental-features/lighthouse-visualization/)

現状は実験的機能のため、デフォルトでは参照できません。Netlifyのユーザー設定(User settings)よりこれを有効にします。

![enable lighthouse score visualization](https://i.gyazo.com/2586f931d9351688364359bbf21cde43.png)

これを有効にすると、Netlifyのデプロイ結果に以下のように全体の平均と、ページごとの内訳が参照できるようになります。

![Netlify console visualization](https://i.gyazo.com/2bb2d9c67e0d19ab9844cd47d483bc4e.png)

ただ、現状はスコアのみで、Lighthouseレポートのような詳細な情報は見れませんでした。安定バージョンでは改善されることを期待したいところです。

## まとめ

簡単ではありますが、NetlifyでLighthouseを実行する方法をご紹介しました。
デプロイ時に必ず実行されますので、しきい値を適切に設定すればパフォーマンス等の問題のあるサイトを誤って公開されないようにできます。
本サイトもそうですが、インターネット上に公開するようなサイトでは、一定の品質を保てるようにLighthouseを活用していくのは有効だと思います。
