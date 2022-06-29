---
title: Rを4.2系にバージョンアップしたらRstanの導入でつまずいた話
author: shuichi-takatsu
date: 2022-06-30
tags: [Analytics]
---

今回は[R](https://www.r-project.org/)にRstan(Rで利用可能なStan)を導入しようとしてつまずいた時の備忘録です。(OSはWindowsです)  
Rのバージョンを”うっかり”4.2系にバージョンアップしたために、Rstanの導入に苦労しました。  
R4.2系のままRstanを導入する際の助けになればと思います。
（Rの操作は[RStudio](https://www.rstudio.com/)から行います）

[[TOC]]

## StanとRstan

「[Stan](https://mc-stan.org/)」は統計的推論のためのプラットフォームです。  
ベイズ統計モデルの解析などに利用されます。

「Rstan」はRからStanを呼び出せるようにしたもので、R言語と統合されています。  
他に有名なものに「PyStan」があります。PyStanはPythonからStanを利用するためのモジュールです。

## Rの最新版(4.2.1)を取得する

リリースされているRのバージョンを確認します。  
Rの最新版を確認したところ、2022年06月23日にバージョン4.2.1がリリースされていました。  
今回の検証用PCにはバージョン4.2.1をインストールすることにしました。

## RStudio

RStudioのバージョンも確認します。  
今回は以下のバージョンを使用することにしました。  
こちらも2022年5月20日にリリースされた比較的新しいバージョンです。

`RStudio 2022.02.3+492 "Prairie Trillium" Release (1db809b8323ba0a87c148d16eb84efe39a8e7785, 2022-05-20) for Windows`

## 最初の注意点（Rtoolsのバージョン）

Rstanを使用するためには[Rtools](https://cran.ism.ac.jp/bin/windows/Rtools/)の導入が必要とのことなのでRtoolsをインストールします。  
しかし、RtoolsはRのバージョンに対して制約があります。  
制約は以下のようになっていました。

![](https://gyazo.com/393b88bccb07fb626f78242dbb6d033f.png)

現環境のRのバージョンが4.2.1なので、Rtoolsは4.2版を使用する必要があります。  
筆者は何も考えずに4.0版をダウンロードしてしまい、再度4.2版をダウンロードする羽目になりました。  
お気を付けください。

ダウンロードには多少時間を要します。  
ダウンロードが出来たらインストーラを起動し、デフォルト設定のままインストールします。

## Rstanのインストール

RStudioを起動し、パッケージインストーラから「Rstan」をインストールします。

![](https://gyazo.com/bb8413ff37a8f4237b2d148bfa1b06bf.png)

インストールを開始すると関連パッケージが大量にダウンロードされます。  
少し時間がかかりますが、インストールが終了するまで待ちます。

## Rstanライブラリの読み込み

Rstanのインストールが完了したら、RStudio上で以下のコマンドを実行しRstanライブラリを読み込みます。

```r
library(rstan)
```

以下のようなメッセージが表示されました。  
（Rのメッセージはエラーでなくても赤字だったりするので毎回ビクっとします）

![](https://gyazo.com/a86ef3030b6a6570ba632209d498af39.png)

Rstanのバージョンが「2.21.5」であることがわかります。
マルチコアCPUの場合が何だかんだと言われていますが、取りあえず導入できているようなので先に進みます。

## Rstanサンプル実行（エラー）

適当なRstanサンプルを実行しようとしたところ、以下のエラーが発生しました。

![](https://gyazo.com/f3685eb9957499b53530af81910f1d8f.png)

まったく思い当たる節がありません。  

Rのバージョンを4.2.0にダウングレードしたり、Rstanを再度インストールしたり、諸々実施しましたがエラーは解消されせんでした。  

Rのバージョンを4.1.3にダウングレードするしか方法が無いかと途方に暮れていた時に、[ネット上](https://blog.mc-stan.org/2022/04/26/stan-r-4-2-on-windows/)に次のような情報を見つけました。

![](https://gyazo.com/2a5dbe50933afa7b35c64cb007ad0b09.png)

<h2><font color="#ff4500">え？！</font></h2>

カレントバージョン2.21.5のRstanがR4.2では動作しない！  
それもWindows限定！  
どうやらRのバージョンを4.2系にバージョンアップしたことが仇となってしまったようです。

## 強制的にRstanのバージョンを変更する

幸いなことに先ほど閲覧したサイトに対応方法が載っていたました。  
要は
- 古いバージョンのRstanをアンインストールして
- Rstanリポジトリからパッケージを取得せよ

のようです。  

以下を実行します。  
RstanとStanHeadersパッケージの削除

```r
remove.packages(c("rstan", "StanHeaders"))
```
![](https://gyazo.com/b158a5d857bb608cd6495f39b9a0eab6.png)

Rstanリポジトリからパッケージを取得

```r
install.packages("rstan", repos = c("https://mc-stan.org/r-packages/", getOption("repos")))
```

![](https://gyazo.com/9ab06e8f2c6abe573258551eec0bb97e.png)

パッケージがインストールできたようです。  
Rstanのバージョンを確認します。

![](https://gyazo.com/aeeb063b588781b0a2b4507a92929a00.png)

Rstanのバージョンが「2.26.13」に更新されています。

:::check
別のPCでRを実行していて判明したのですが、Rstan 2.26.13 はRのバージョン4.2.1のもとで作成されたらしく、Rのバージョン4.2.0の環境で使用すると「バージョンが合っていない」旨のワーニングが表示されました。
Rのバージョンは4.2.1にした方が良いでしょう。
:::

## Rstanサンプル実行（成功）

Rstanの動作を確かめるために簡単なサンプルを実行させます。  
サンプルは「コインを10回投げて80%の確率で表が出る二項分布」の計算です。

Rstanファイル「coin.stan」を以下のように記述します。  
```r
data {
    int N;
    int n;
    int x[n];
}
parameters {
    real<lower=0, upper=1> p;
}
model {
    x ~ binomial(N, p);
}
```

実行用Rファイルを以下のように記述します。  
```r
# Rstanライブラリの読み込み
library(rstan)

# オプション設定（計算の並列化）
rstan_options(auto_write=TRUE)
options(mc.cores=parallel::detectCores())

# コインを10回投げて、80％の確率で表が出るデータを作成する
x <- rbinom(n = 10, size = 1, prob = 0.8)
data <- list(N = 1, n = length(x), x = x)

# Stan実行
fit <- stan(file = 'coin.stan', data = data)

# 結果出力
fit

# 結果表示
stan_hist(fit)
```
実行結果が以下のように出力されました。

![](https://gyazo.com/be00e7a44e5d79efe258ee5f35623894.png)

平均(期待値)は0.75となっており、サンプルデータに設定した0.8に近い値になっています。  
グラフも出力されました。

![](https://gyazo.com/03dbfa4625f4ffa9af002639c464e6d3.png)

イメージ通りのグラフの形になっています。  
正しくRstanを実行できたようです。

## まとめ

今回はRのバージョンを最新版4.2.1にバージョンアップしてしまったために、余計な手間がかかってしまいました。  
最新版を試すときは慎重に実施しないといけないと再確認しました。（リリースノートはちゃんと読もう）  
Node.jsやPythonのように開発環境のバージョンを簡単に切り替えられる仕組みがRにも有ったらなぁ、と思う今日この頃です。  
皆様もお気を付けください。

[統計解析ツール紹介やその活用方法をまとめています。](https://developer.mamezou-tech.com/analytics/)

データ分析に活用して頂ければ幸いです。
